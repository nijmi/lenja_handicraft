import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const SHIPPING = 150;

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Administrators cannot purchase products.' });
    const { items, shipping, paymentMethod = 'cod' } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Cart is empty.' });
    if (!shipping?.name || !shipping?.email || !shipping?.phone || !shipping?.address) return res.status(400).json({ message: 'Complete delivery information is required.' });
    if (!['cod', 'esewa', 'qr'].includes(paymentMethod)) return res.status(400).json({ message: 'Unsupported payment method.' });

    const ids = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: ids }, active: true });
    const byId = new Map(products.map(p => [p._id.toString(), p]));
    const normalized = [];
    let subtotal = 0;
    for (const line of items) {
      const p = byId.get(String(line.productId));
      const quantity = Math.floor(Number(line.quantity));
      if (!p || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'One or more cart items are invalid.' });
      if (p.stock < quantity) return res.status(400).json({ message: `${p.name} does not have enough stock.` });
      subtotal += p.price * quantity;
      normalized.push({ product: p._id, name: p.name, price: p.price, quantity, image: p.image });
    }
    const order = await Order.create({ user: req.user._id, items: normalized, shipping, subtotal, shippingFee: SHIPPING, total: subtotal + SHIPPING, paymentMethod, paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending' });
    if (paymentMethod === 'cod') {
      for (const line of normalized) await Product.findByIdAndUpdate(line.product, { $inc: { stock: -line.quantity } });
    }
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Could not create order.', error: err.message });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).populate('items.product').sort({ createdAt: -1 }));
});

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  res.json(await Order.find().populate('user', 'name email phone').sort({ createdAt: -1 }));
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: req.body.status }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  res.json(order);
});



router.patch('/:id/payment-status', requireAuth, requireAdmin, async (req, res) => {
  const allowed = ['pending', 'paid', 'failed'];
  if (!allowed.includes(req.body.paymentStatus)) return res.status(400).json({ message: 'Invalid payment status.' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  order.paymentStatus = req.body.paymentStatus;
  if (req.body.paymentReference !== undefined) order.paymentReference = String(req.body.paymentReference || '').trim();
  if (req.body.paymentStatus === 'paid') order.orderStatus = 'processing';
  await order.save();
  res.json(order);
});

export default router;
