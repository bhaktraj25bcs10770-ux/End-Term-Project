import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { User, Product, Order } from './models.js';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('Set JWT_SECRET to a private value of at least 32 characters in production.');
const app = express();
const port = process.env.PORT || 5001;
const secret = process.env.JWT_SECRET || 'local-only-secret-change-before-deploy-12345';
const mongo = Boolean(process.env.MONGODB_URI?.trim());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174' }));
app.use(express.json({ limit: '1mb' }));

const seed = [
  { _id: 'mm-01', name: 'Gulabi Blue Pottery Planter', craft: 'Blue pottery', region: 'Jaipur, Rajasthan', artisan: 'Meera Kumawat', story: 'Meera learned the Jaipur blue pottery technique from her mother. Each planter is hand-shaped, glazed in her signature cobalt, and fired in a family kiln just outside the Pink City.', price: 1850, stock: 12, rating: 4.9, reviews: 42, badge: 'STUDIO FAVOURITE', image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-02', name: 'Ajrakh Dusk Stole', craft: 'Ajrakh block print', region: 'Ajrakhpur, Kutch', artisan: 'Abdul Rahim Khatri', story: 'Printed by hand with carved teak blocks and layered natural indigo. This stole takes Abdul and his family three days to print, wash, and finish.', price: 3200, stock: 7, rating: 4.8, reviews: 28, badge: 'NATURAL DYES', image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-03', name: 'Channapatna Little Friends', craft: 'Lacquered wood', region: 'Channapatna, Karnataka', artisan: 'Ravi Kumar', story: 'Turned from sustainably sourced hale wood and coloured with child-safe vegetable dyes. Ravi has been making toys on his lathe for more than twenty years.', price: 1450, stock: 18, rating: 5, reviews: 63, badge: 'MADE FOR PLAY', image: 'https://images.unsplash.com/photo-1599623560574-39d485900c95?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-04', name: 'Kutch Moon Tapestry', craft: 'Mirror embroidery', region: 'Bhujodi, Kutch', artisan: 'Asha Vankar', story: 'Asha and a small women-led collective stitch each mirror and geometric pattern onto handloom cotton. No two pieces are quite alike.', price: 4800, stock: 5, rating: 4.9, reviews: 19, badge: 'ONE OF A KIND', image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-05', name: 'Dhokra Little Bird', craft: 'Dhokra metalwork', region: 'Bastar, Chhattisgarh', artisan: 'Lalita Netam', story: 'Lalita uses the 4,000-year-old lost-wax method: a clay core, a wax design, and a single casting that gives each bird its own character.', price: 2650, stock: 9, rating: 4.7, reviews: 31, badge: 'LOST-WAX CAST', image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-06', name: 'Kota Doria Table Runner', craft: 'Kota Doria weaving', region: 'Kaithoon, Rajasthan', artisan: 'Saira Mansuri', story: 'Woven on a traditional pit loom, the airy square-check weave is a hallmark of Kota Doria. Saira works with locally spun cotton and silk.', price: 2100, stock: 14, rating: 4.8, reviews: 24, badge: '', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-07', name: 'Saharanpur Carved Tray', craft: 'Wood carving', region: 'Saharanpur, Uttar Pradesh', artisan: 'Imran Siddiqui', story: 'Carved by hand from responsibly sourced mango wood. Imran’s fine jaali pattern is inspired by the old havelis of his neighbourhood.', price: 1750, stock: 11, rating: 4.6, reviews: 17, badge: '', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85' },
  { _id: 'mm-08', name: 'Pattachitra Story Panel', craft: 'Pattachitra painting', region: 'Raghurajpur, Odisha', artisan: 'Bishnu Mohapatra', story: 'Bishnu paints on treated cotton cloth with mineral and plant pigments, using a fine brush made from a mouse’s hair. A story scroll, made to be kept.', price: 3900, stock: 4, rating: 5, reviews: 12, badge: 'SMALL BATCH', image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=900&q=85' }
];
let products = structuredClone(seed);
let users = [];
let orders = [];

const asProduct = p => ({ ...p, _id: String(p._id) });
const getProducts = async () => mongo ? (await Product.find({ active: true }).lean()).map(asProduct) : products;
const sign = user => jwt.sign({ sub: String(user._id), name: user.name, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try { req.user = jwt.verify(token, secret); next(); } catch { res.status(401).json({ error: 'Session expired. Please sign in again.' }); }
}
function requireAdmin(req, res, next) { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' }); next(); }

async function connectMongo() {
  await mongoose.connect(process.env.MONGODB_URI);
  if (!await Product.countDocuments()) await Product.insertMany(seed.map(({ _id, ...p }) => p));
  await ensureAdmin(User);
  console.log('MongoDB connected');
}
async function ensureAdmin(Model) {
  const email = (mongo ? process.env.ADMIN_EMAIL : process.env.DEMO_ADMIN_EMAIL)?.trim().toLowerCase();
  const password = mongo ? process.env.ADMIN_PASSWORD : process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) return;
  const exists = mongo ? await Model.findOne({ email }) : users.find(u => u.email === email);
  if (!exists) {
    const admin = { _id: new mongoose.Types.ObjectId(), name: 'MittiMarket Curator', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' };
    if (mongo) await Model.create(admin); else users.push(admin);
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, storage: mongo ? 'mongodb' : 'demo-memory' }));
app.get('/api/products', async (req, res, next) => {
  try {
    const { q = '', craft = '', region = '', sort = 'featured' } = req.query;
    let list = await getProducts();
    list = list.filter(p => (!craft || p.craft === craft) && (!region || p.region === region) && `${p.name} ${p.craft} ${p.region} ${p.artisan}`.toLowerCase().includes(String(q).toLowerCase()));
    if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
    if (sort === 'popular') list.sort((a, b) => b.reviews - a.reviews);
    res.json(list);
  } catch (err) { next(err); }
});
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ error: 'Enter your name, a valid email, and a password of at least 8 characters.' });
    const found = mongo ? await User.findOne({ email }) : users.find(u => u.email === email);
    if (found) return res.status(409).json({ error: 'That email already has an account.' });
    const user = { _id: new mongoose.Types.ObjectId(), name, email, passwordHash: await bcrypt.hash(password, 12), role: 'customer' };
    if (mongo) await User.create(user); else users.push(user);
    res.status(201).json({ token: sign(user), user: { name, email, role: user.role } });
  } catch (err) { next(err); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = mongo ? await User.findOne({ email }) : users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    res.json({ token: sign(user), user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});
app.get('/api/orders', requireAuth, async (req, res, next) => {
  try { res.json(mongo ? await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 }).lean() : orders.filter(o => o.userId === req.user.sub)); }
  catch (err) { next(err); }
});
app.post('/api/orders', requireAuth, async (req, res, next) => {
  try {
    const lines = Array.isArray(req.body.items) ? req.body.items : [];
    const shipping = req.body.shipping || {};
    if (!lines.length || !shipping.line?.trim() || !shipping.city?.trim() || !/^\d{6}$/.test(String(shipping.postalCode || ''))) return res.status(400).json({ error: 'Add at least one item and a complete Indian delivery address with a 6-digit PIN code.' });
    const catalog = await getProducts();
    const items = []; let total = 0;
    for (const line of lines) {
      const product = catalog.find(p => String(p._id) === String(line.productId));
      const qty = Number(line.qty);
      if (!product || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'An item in your bag is invalid.' });
      if (product.stock < qty) return res.status(409).json({ error: `${product.name} has only ${product.stock} left.` });
      items.push({ productId: String(product._id), name: product.name, artisan: product.artisan, price: product.price, image: product.image, qty });
      total += product.price * qty;
    }
    const orderCode = `MM-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    let order;
    if (mongo) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const item of items) {
            const result = await Product.updateOne({ _id: item.productId, stock: { $gte: item.qty }, active: true }, { $inc: { stock: -item.qty } }, { session });
            if (!result.modifiedCount) throw Object.assign(new Error(`${item.name} just sold out. Refresh your bag.`), { status: 409 });
          }
          [order] = await Order.create([{ orderCode, userId: req.user.sub, name: req.user.name, email: req.user.email, items, total, shipping, paymentMethod: req.body.paymentMethod === 'PREPAID_TEST' ? 'PREPAID_TEST' : 'COD', status: 'Confirmed' }], { session });
        });
      } finally { await session.endSession(); }
      order = order.toObject();
    } else {
      for (const item of items) products = products.map(p => String(p._id) === item.productId ? { ...p, stock: p.stock - item.qty } : p);
      order = { orderCode, userId: req.user.sub, name: req.user.name, email: req.user.email, items, total, shipping, paymentMethod: req.body.paymentMethod === 'PREPAID_TEST' ? 'PREPAID_TEST' : 'COD', status: 'Confirmed', createdAt: new Date() };
      orders.unshift(order);
    }
    res.status(201).json(order);
  } catch (err) { next(err); }
});
app.get('/api/admin/orders', requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(mongo ? await Order.find().sort({ createdAt: -1 }).lean() : orders); }
  catch (err) { next(err); }
});
app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, craft, region, artisan, story, image, price, stock = 0 } = req.body;
    if (![name, craft, region, artisan, story, image].every(v => typeof v === 'string' && v.trim()) || !Number.isFinite(Number(price)) || Number(price) < 1 || !Number.isInteger(Number(stock)) || Number(stock) < 0) return res.status(400).json({ error: 'Complete every product field with a valid price and whole stock quantity.' });
    const product = { name: name.trim(), craft: craft.trim(), region: region.trim(), artisan: artisan.trim(), story: story.trim(), image: image.trim(), price: Number(price), stock: Number(stock), rating: 5, reviews: 0, badge: 'NEW MAKER' };
    if (mongo) return res.status(201).json(asProduct(await Product.create(product)));
    product._id = `mm-${Date.now()}`; products.unshift(product); res.status(201).json(product);
  } catch (err) { next(err); }
});
app.patch('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stock = Number(req.body.stock);
    if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: 'Stock must be a whole number of zero or more.' });
    if (mongo) {
      const p = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true, runValidators: true });
      if (!p) return res.status(404).json({ error: 'Product not found.' });
      return res.json(asProduct(p));
    }
    const product = products.find(p => String(p._id) === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    product.stock = stock; res.json(product);
  } catch (err) { next(err); }
});
const nextStates = { Confirmed: ['Making', 'Cancelled'], Making: ['Packed', 'Cancelled'], Packed: ['On the way'], 'On the way': ['Delivered'], Delivered: [], Cancelled: [] };
app.patch('/api/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const order = mongo ? await Order.findOne({ orderCode: req.params.id }) : orders.find(o => o.orderCode === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const target = String(req.body.status || '');
    if (!nextStates[order.status]?.includes(target)) return res.status(409).json({ error: `That order cannot move from ${order.status} to ${target}.` });
    if (target === 'Cancelled') {
      if (mongo) {
        const session = await mongoose.startSession();
        try { await session.withTransaction(async () => { for (const item of order.items) await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } }, { session }); order.status = target; await order.save({ session }); }); }
        finally { await session.endSession(); }
        return res.json(order);
      }
      for (const item of order.items) products = products.map(p => String(p._id) === item.productId ? { ...p, stock: p.stock + item.qty } : p);
    }
    order.status = target;
    if (mongo) await order.save();
    res.json(order);
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err.code === 11000) return res.status(409).json({ error: 'That record already exists.' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please try again.' });
});

if (mongo) await connectMongo(); else await ensureAdmin(null);
app.listen(port, () => console.log(`MittiMarket API at http://localhost:${port} (${mongo ? 'MongoDB' : 'demo memory'} storage)`));
