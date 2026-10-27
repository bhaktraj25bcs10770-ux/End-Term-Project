import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  craft: { type: String, required: true },
  region: { type: String, required: true },
  artisan: { type: String, required: true },
  story: { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  stock: { type: Number, default: 0, min: 0 },
  image: { type: String, required: true },
  badge: { type: String, default: '' },
  rating: { type: Number, default: 4.8 },
  reviews: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
productSchema.index({ name: 'text', artisan: 'text', craft: 'text', region: 'text' });

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  email: String,
  items: [{ productId: String, name: String, artisan: String, price: Number, image: String, qty: Number }],
  total: { type: Number, required: true },
  shipping: { line: String, city: String, postalCode: String },
  paymentMethod: { type: String, enum: ['COD', 'PREPAID_TEST'], default: 'COD' },
  status: { type: String, enum: ['Confirmed', 'Making', 'Packed', 'On the way', 'Delivered', 'Cancelled'], default: 'Confirmed' }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
