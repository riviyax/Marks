import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkoutSdk, paypalClient } from '../utils/paypalClient.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = Router();

// Creates the PayPal order. Amount is read from our own Order record,
// never from the client, so nobody can pay $0.01 by editing a request.
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'This order is not awaiting payment' });
    }

    const request = new checkoutSdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: String(order._id),
          amount: {
            currency_code: order.currency,
            value: order.amount.toFixed(2),
          },
          description: 'Ayanakoji_X — one-time license',
        },
      ],
    });

    const response = await paypalClient().execute(request);
    order.paypalOrderId = response.result.id;
    order.method = 'paypal';
    await order.save();

    res.json({ paypalOrderId: response.result.id });
  } catch (err) {
    console.error('[paypal] create-order failed:', err);
    res.status(500).json({ error: 'Could not start PayPal checkout' });
  }
});

// Captures the payment server-side and verifies the amount/status before
// unlocking. This endpoint is the only thing that can flip `unlocked: true`
// for a PayPal payment — the frontend approving a popup is not enough.
router.post('/capture-order', requireAuth, async (req, res) => {
  try {
    const { orderId, paypalOrderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paypalOrderId !== paypalOrderId) {
      return res.status(400).json({ error: 'Order mismatch' });
    }
    if (order.status === 'paid') {
      return res.json({ message: 'Already captured', order });
    }

    const request = new checkoutSdk.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});
    const response = await paypalClient().execute(request);

    const capture = response.result.purchase_units?.[0]?.payments?.captures?.[0];
    const status = response.result.status;
    const capturedAmount = Number(capture?.amount?.value || 0);

    if (status !== 'COMPLETED' || capturedAmount < order.amount) {
      order.status = 'rejected';
      order.rejectionReason = `PayPal status: ${status}, amount: ${capturedAmount}`;
      await order.save();
      return res.status(400).json({ error: 'Payment was not completed successfully' });
    }

    order.status = 'paid';
    order.paypalCaptureId = capture.id;
    await order.save();

    await User.findByIdAndUpdate(req.user._id, {
      unlocked: true,
      unlockedAt: new Date(),
      unlockedVia: 'paypal',
    });

    res.json({ message: 'Payment captured, account unlocked', order });
  } catch (err) {
    console.error('[paypal] capture-order failed:', err);
    res.status(500).json({ error: 'Could not capture PayPal payment' });
  }
});

export default router;
