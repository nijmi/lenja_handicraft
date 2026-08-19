import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Lenja API' }));
app.get('*splat', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`Lenja running at http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
