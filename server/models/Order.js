import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  shipping: {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  subtotal: Number,
  shippingFee: { type: Number, default: 150 },
  total: Number,
  paymentMethod: { type: String, enum: ['cod', 'esewa', 'qr'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'verification_pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  transactionUuid: { type: String, unique: true, sparse: true },
  esewaTransactionCode: String,
  esewaRefId: String,
  paymentReference: String
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
