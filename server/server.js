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

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors());

app.use(express.json({
  limit: '1mb'
}));

app.use(express.urlencoded({
  extended: true
}));

// --------------------------------------------------
// Database Connection
// --------------------------------------------------

let mongoConnected = false;

async function connectDatabase() {
  if (mongoConnected && mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is missing');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    mongoConnected = true;

    console.log('MongoDB connected successfully');
  } catch (error) {
    mongoConnected = false;

    console.error(
      'MongoDB connection failed:',
      error.message
    );

    throw error;
  }
}

// --------------------------------------------------
// Database middleware
// --------------------------------------------------

app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use('/api/auth', authRoutes);

app.use('/api/products', productRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/payments', paymentRoutes);

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Lenja API',
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected'
  });
});

// --------------------------------------------------
// Serve Frontend
// --------------------------------------------------

app.use(
  express.static(
    path.join(__dirname, '..', 'public')
  )
);

// --------------------------------------------------
// Frontend fallback
// --------------------------------------------------

app.get('*splat', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '..',
      'public',
      'index.html'
    )
  );
});

// --------------------------------------------------
// Export app for Vercel
// --------------------------------------------------

export default app;

// --------------------------------------------------
// Local development server
// --------------------------------------------------

if (!process.env.VERCEL) {
  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `Lenja running at http://localhost:${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        'Unable to start server:',
        error.message
      );
      process.exit(1);
    });
}