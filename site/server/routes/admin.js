import { Router } from 'express';
import fs from 'fs';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = Router();

router.use(requireAuth, requireAdmin);

// List orders awaiting manual receipt review.
router.get('/orders', async (req, res) => {
  const status = req.query.status || 'receipt_submitted';
  const orders = await Order.find({ status }).populate('user', 'email displayName').sort({ createdAt: 1 });
  res.json({ orders });
});

// Stream a receipt file for admin viewing only — never publicly exposed.
router.get('/orders/:id/receipt', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || !order.receiptFilePath || !fs.existsSync(order.receiptFilePath)) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  res.sendFile(order.receiptFilePath);
});

router.post('/orders/:id/approve', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'receipt_submitted') {
    return res.status(400).json({ error: 'Order is not pending review' });
  }

  order.status = 'approved';
  order.reviewedBy = req.user.email;
  order.reviewedAt = new Date();
  await order.save();

  await User.findByIdAndUpdate(order.user, {
    unlocked: true,
    unlockedAt: new Date(),
    unlockedVia: 'receipt',
  });

  res.json({ message: 'Order approved, user unlocked', order });
});

router.post('/orders/:id/reject', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = 'rejected';
  order.reviewedBy = req.user.email;
  order.reviewedAt = new Date();
  order.rejectionReason = req.body.reason || 'Receipt could not be verified';
  await order.save();

  res.json({ message: 'Order rejected', order });
});

export default router;
