import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const isTest = process.env.ESEWA_ENV !== 'live';
const epayUrl = isTest ? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form' : 'https://epay.esewa.com.np/api/epay/main/v2/form';
const statusUrl = isTest ? 'https://rc.esewa.com.np/api/epay/transaction/status/' : 'https://esewa.com.np/api/epay/transaction/status/';

function signature(total, uuid, code) {
  const message = `total_amount=${total},transaction_uuid=${uuid},product_code=${code}`;
  return crypto.createHmac('sha256', process.env.ESEWA_SECRET_KEY).update(message).digest('base64');
}

function makeUuid() {
  return `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}



// Static bank/digital QR payment. The supplied QR is a merchant bank QR, so it cannot
// report payment completion to this server by itself. Customers submit a completion
// confirmation/reference, and an administrator can verify it before marking it paid.
router.post('/qr/init', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Administrators cannot make purchases.' });
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id, paymentMethod: 'qr' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order is already paid.' });
    res.json({ orderId: order._id, amount: order.total, qrImage: '/images/payment-qr.png' });
  } catch (err) {
    res.status(500).json({ message: 'Could not initialize QR payment.', error: err.message });
  }
});

router.post('/qr/confirm', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Administrators cannot make purchases.' });
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id, paymentMethod: 'qr' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    const completed = req.body.completed === true;
    if (!completed) {
      order.paymentStatus = 'failed';
      order.paymentReference = String(req.body.reference || '').trim();
      await order.save();
      return res.json({ ok: false, status: 'failed', orderId: order._id });
    }
    order.paymentStatus = 'pending';
    order.paymentReference = String(req.body.reference || '').trim();
    await order.save();
    res.json({ ok: true, status: 'submitted', orderId: order._id, message: 'Payment submitted successfully and is awaiting verification.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not submit payment confirmation.', error: err.message });
  }
});

router.post('/esewa/init', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Administrators cannot make purchases.' });
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id, paymentMethod: 'esewa' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order is already paid.' });
    const uuid = makeUuid();
    order.transactionUuid = uuid;
    await order.save();
    const total = Number(order.total).toFixed(2);
    const fields = {
      amount: Number(order.subtotal).toFixed(2),
      tax_amount: '0',
      total_amount: total,
      transaction_uuid: uuid,
      product_code: process.env.ESEWA_PRODUCT_CODE,
      product_service_charge: '0',
      product_delivery_charge: String(order.shippingFee || 0),
      success_url: process.env.ESEWA_SUCCESS_URL,
      failure_url: process.env.ESEWA_FAILURE_URL,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature: signature(total, uuid, process.env.ESEWA_PRODUCT_CODE)
    };
    const paymentPageUrl = `${process.env.PUBLIC_BASE_URL}/api/payments/esewa/page/${order._id}`;
    const qrDataUrl = await QRCode.toDataURL(paymentPageUrl, { width: 260, margin: 2 });
    res.json({ orderId: order._id, action: epayUrl, fields, qrDataUrl, paymentPageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Could not initialize eSewa payment.', error: err.message });
  }
});

// QR/mobile-friendly page. It contains the signed eSewa form and submits it automatically.
router.get('/esewa/page/:orderId', async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order || order.paymentMethod !== 'esewa' || !order.transactionUuid) return res.status(404).send('Payment session not found or expired.');
  const total = Number(order.total).toFixed(2);
  const fields = {
    amount: Number(order.subtotal).toFixed(2), tax_amount: '0', total_amount: total, transaction_uuid: order.transactionUuid,
    product_code: process.env.ESEWA_PRODUCT_CODE, product_service_charge: '0', product_delivery_charge: String(order.shippingFee || 0),
    success_url: process.env.ESEWA_SUCCESS_URL, failure_url: process.env.ESEWA_FAILURE_URL,
    signed_field_names: 'total_amount,transaction_uuid,product_code', signature: signature(total, order.transactionUuid, process.env.ESEWA_PRODUCT_CODE)
  };
  const inputs = Object.entries(fields).map(([k,v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">`).join('');
  res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Pay with eSewa - Lenja</title></head><body style="font-family:Arial;text-align:center;padding:40px"><h2>Lenja eSewa Payment</h2><p>Total: <b>Rs. ${Number(order.total).toLocaleString('en-IN')}</b></p><p>Continue to eSewa to complete payment.</p><form id="f" action="${epayUrl}" method="POST">${inputs}</form><script>document.getElementById('f').submit()</script></body></html>`);
});

router.post('/esewa/verify', async (req, res) => {
  try {
    const encoded = req.body.data;
    if (!encoded) return res.status(400).json({ message: 'Missing eSewa response.' });
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const { transaction_uuid, total_amount, product_code, signature: returnedSignature } = decoded;
    const signedNames = decoded.signed_field_names || 'transaction_code,status,total_amount,transaction_uuid,product_code';
    const signedMessage = signedNames.split(',').map(name => `${name}=${decoded[name]}`).join(',');
    const expected = crypto.createHmac('sha256', process.env.ESEWA_SECRET_KEY).update(signedMessage).digest('base64');
    if (returnedSignature !== expected) return res.status(400).json({ message: 'Invalid eSewa response signature.' });
    const order = await Order.findOne({ transactionUuid: transaction_uuid, paymentMethod: 'esewa' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (decoded.status === 'COMPLETE' && Number(total_amount) === Number(order.total)) {
      if (order.paymentStatus === 'paid') return res.json({ ok: true, orderId: order._id, status: 'paid' });
      order.paymentStatus = 'paid';
      order.esewaTransactionCode = decoded.transaction_code;
      order.esewaRefId = decoded.ref_id || '';
      order.orderStatus = 'processing';
      for (const line of order.items) await Product.findByIdAndUpdate(line.product, { $inc: { stock: -line.quantity } });
      await order.save();
      return res.json({ ok: true, orderId: order._id, status: 'paid' });
    }
    order.paymentStatus = 'failed';
    await order.save();
    res.json({ ok: false, orderId: order._id, status: decoded.status });
  } catch (err) {
    res.status(500).json({ message: 'Could not verify eSewa response.', error: err.message });
  }
});

router.get('/esewa/status/:orderId', requireAuth, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id, paymentMethod: 'esewa' });
  if (!order?.transactionUuid) return res.status(404).json({ message: 'Payment transaction not found.' });
  const url = `${statusUrl}?product_code=${encodeURIComponent(process.env.ESEWA_PRODUCT_CODE)}&total_amount=${encodeURIComponent(Number(order.total).toFixed(2))}&transaction_uuid=${encodeURIComponent(order.transactionUuid)}`;
  const response = await fetch(url);
  const result = await response.json();
  if (result.status === 'COMPLETE' && Number(result.total_amount) === Number(order.total)) {
    if (order.paymentStatus === 'paid') return res.json(result);
    order.paymentStatus = 'paid'; order.orderStatus = 'processing'; order.esewaRefId = result.ref_id || '';
    for (const line of order.items) await Product.findByIdAndUpdate(line.product, { $inc: { stock: -line.quantity } });
    await order.save();
  }
  res.json(result);
});


// Static bank/digital-payment QR flow.
// The QR itself cannot be verified automatically without a bank/payment-provider API,
// so the customer submits the payment for admin verification.
router.post('/qr/submit', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Administrators cannot make purchases.' });
    const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id, paymentMethod: 'qr' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentStatus === 'paid') return res.json({ ok: true, status: 'paid', orderId: order._id });
    order.paymentStatus = 'verification_pending';
    await order.save();
    res.json({ ok: true, status: 'verification_pending', orderId: order._id });
  } catch (err) {
    res.status(500).json({ message: 'Could not submit payment for verification.', error: err.message });
  }
});

router.get('/qr/status/:orderId', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id, paymentMethod: 'qr' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ orderId: order._id, status: order.paymentStatus, orderStatus: order.orderStatus });
  } catch (err) {
    res.status(500).json({ message: 'Could not check payment status.', error: err.message });
  }
});

router.patch('/qr/:orderId/verify', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access only.' });
    const { status } = req.body;
    if (!['paid', 'failed'].includes(status)) return res.status(400).json({ message: 'Status must be paid or failed.' });
    const order = await Order.findOne({ _id: req.params.orderId, paymentMethod: 'qr' });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentStatus === 'paid' && status === 'failed') return res.status(400).json({ message: 'A completed payment cannot be reversed here.' });
    if (status === 'paid' && order.paymentStatus !== 'paid') {
      for (const line of order.items) await Product.findByIdAndUpdate(line.product, { $inc: { stock: -line.quantity } });
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
    } else if (status === 'failed') {
      order.paymentStatus = 'failed';
    }
    await order.save();
    res.json({ ok: true, status: order.paymentStatus, orderStatus: order.orderStatus });
  } catch (err) {
    res.status(500).json({ message: 'Could not verify payment.', error: err.message });
  }
});

export default router;
