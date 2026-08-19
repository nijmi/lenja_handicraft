import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 90 },
  image: { type: String, required: true },
  description: { type: String, default: '' },
  stock: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
