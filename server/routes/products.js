import express from 'express';
import Product from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = { active: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.$or = [
    { name: { $regex: req.query.search, $options: 'i' } },
    { category: { $regex: req.query.search, $options: 'i' } }
  ];
  res.json(await Product.find(filter).sort({ createdAt: -1 }));
});

router.get('/:id', async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, active: true });
  if (!p) return res.status(404).json({ message: 'Product not found.' });
  res.json(p);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const p = await Product.create(req.body);
  res.status(201).json(p);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!p) return res.status(404).json({ message: 'Product not found.' });
  res.json(p);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!p) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product removed.' });
});

export default router;
