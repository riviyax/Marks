import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadReceipt } from '../utils/uploadConfig.js';
import Order from '../models/Order.js';

const router = Router();

const LICENSE_PRICE_USD = 5;

// Creates a new pending order, or returns the user's existing pending order
// so refreshing the checkout page doesn't spawn duplicate orders.
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.unlocked) {
      return res.status(400).json({ error: 'Account is already unlocked' });
    }

    let order = await Order.findOne({ user: req.user._id, status: 'pending' });
    if (!order) {
      order = await Order.create({
        user: req.user._id,
        product: 'ayanakoji_x_license',
        amount: LICENSE_PRICE_USD, // price is set server-side, never trusted from the client
      });
    }

    res.json({ order });
  } catch (err) {
    console.error('[orders] create failed:', err);
    res.status(500).json({ error: 'Could not create order' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// Manual receipt upload — moves the order into 'receipt_submitted' for admin review.
router.post('/receipt', requireAuth, uploadReceipt.single('receipt'), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !req.file) {
      return res.status(400).json({ error: 'orderId and receipt file are required' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'This order is not awaiting payment' });
    }

    order.method = 'receipt';
    order.receiptFilePath = req.file.path;
    order.receiptOriginalName = req.file.originalname;
    order.status = 'receipt_submitted';
    await order.save();

    res.json({ message: 'Receipt submitted for review', order });
  } catch (err) {
    console.error('[orders] receipt upload failed:', err);
    res.status(500).json({ error: err.message || 'Could not upload receipt' });
  }
});

export default router;
