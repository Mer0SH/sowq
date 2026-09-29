import express from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { categoryDescendants, currentPromotions, fail, publicProduct, quote } from './core.js';

initializeApp();
const db = getFirestore();
const app = express();
const apiRouter = express.Router();
const ok = data => ({ ok: true, data });
const send = (res, status, message) => res.status(status).json({ ok: false, error: message });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const now = () => new Date().toISOString();
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const ref = (collection, id) => db.collection(collection).doc(String(id));
const read = async (collection, id) => (await ref(collection, id).get()).data() || null;
const all = async collection => (await db.collection(collection).get()).docs.map(doc => doc.data());
const nextId = async collection => db.runTransaction(async tx => {
  const counter = ref('_counters', collection);
  const current = (await tx.get(counter)).data()?.value || 0;
  tx.set(counter, { value: current + 1 });
  return current + 1;
});
const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) throw fail(400, 'راجع الحقول المطلوبة والقيم المدخلة');
  return result.data;
};
const id = z.number().int().positive();
const text = z.string().trim().min(1).max(200);
const roles = ['owner', 'catalog', 'support', 'fulfillment', 'accountant'];
const orderRoles = ['owner', 'support', 'fulfillment', 'accountant'];
const statusTransitions = { new: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const stamp = data => ({ ...data, updated_at: now() });
const categorySchema = z.object({ name: text, parent_id: id.nullable(), is_active: z.boolean(), sort_order: z.number().int().nonnegative().default(0) }).strict();
const productSchema = z.object({
  category_id: id, name: text, description: z.string().max(5000).default(''), sale_price: z.number().finite().nonnegative(),
  compare_at_price: z.number().finite().nonnegative().nullable().optional(), cost_price: z.number().finite().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(), sku: z.string().trim().max(100).default(''), is_active: z.boolean(),
  brand: z.string().trim().max(120).optional(), images: z.array(z.string().max(1000).url().startsWith('https://')).max(12).optional(),
  is_featured: z.boolean().optional(), is_new: z.boolean().optional(),
}).strict();
const cartSchema = z.object({ items: z.array(z.object({ product_id: id, quantity: z.number().int().min(1).max(99) })).min(1).max(50), coupon: z.string().trim().toUpperCase().max(32).default('') });
const orderSchema = cartSchema.extend({
  name: z.string().trim().min(2).max(200), phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/),
  city: z.string().trim().min(2).max(100), district: z.string().trim().max(100).default(''),
  street: z.string().trim().min(3).max(200), note: z.string().trim().max(500).default(''),
  payment_method: z.literal('cod'), idempotency_key: z.string().uuid(),
});
const staffSchema = z.object({
  name: text, email: z.string().trim().email(), password: z.string().min(8).max(200).optional(),
  role: z.enum(roles), is_active: z.boolean(), categories: z.array(id).max(200),
}).strict();
const promotionSchema = z.object({
  title: z.string().trim().min(2).max(150), discount_type: z.enum(['percent', 'fixed']), value: z.number().finite().positive(),
  scope_type: z.enum(['all', 'products', 'categories']), target_ids: z.array(id).max(200),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/).nullable(),
  starts_at: z.string().nullable(), ends_at: z.string().nullable(), is_active: z.boolean(),
});
const image = z.union([z.literal(''), z.string().url().startsWith('https://')]);
const link = { linkType: z.enum(['products', 'product', 'category', 'none']), linkId: z.string().max(120).default('') };
const homeSchema = z.object({
  hero: z.object({ eyebrow: z.string().max(100), title: z.string().max(150), description: z.string().max(400), theme: z.enum(['light', 'dark']).default('light'), desktopImage: image, mobileImage: image, productId: id.nullable().optional(), buttonLabel: z.string().max(80), ...link }),
  announcements: z.array(z.object({ id: z.string().max(80), text: z.string().max(200), enabled: z.boolean(), ...link })).max(12),
  banners: z.array(z.object({ id: z.string().max(80), title: z.string().max(150), subtitle: z.string().max(200).default(''), image, enabled: z.boolean(), startsAt: z.string().nullable().optional(), endsAt: z.string().nullable().optional(), ...link })).max(12),
  sections: z.array(z.object({ id: z.enum(['categories', 'new', 'featured']), title: z.string().max(100), enabled: z.boolean(), limit: z.number().int().min(1).max(24) })).length(3),
});

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api/admin/media', express.raw({ type: 'image/*', limit: '6mb' }));
app.use('/api', express.json({ limit: '100kb' }), apiRouter);

async function audit(staffId, action, entity, entityId, changes) {
  const auditId = await nextId('audit_log');
  await ref('audit_log', auditId).set({ id: auditId, staff_id: staffId, action, entity, entity_id: entityId, changes: JSON.stringify(changes || {}), created_at: now() });
}
function requireStaff(allowed = roles) {
  return wrap(async (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) throw fail(401, 'سجّل الدخول أولًا');
    const session = await read('sessions', tokenHash(token));
    if (!session || session.expires < Date.now()) throw fail(401, 'انتهت الجلسة، سجّل الدخول من جديد');
    const staff = await read('staff', session.staff_id);
    if (!staff?.is_active || staff.session_version !== session.version) throw fail(401, 'الحساب معطل أو تغيّرت صلاحياته');
    if (!allowed.includes(staff.role)) throw fail(403, 'ليس لديك صلاحية لهذه العملية');
    req.staff = staff; req.token = token;
    next();
  });
}
async function allowedCategories(staff) {
  if (staff.role === 'owner') return null;
  return categoryDescendants(await all('categories'), staff.categories || []);
}
const orderView = (order, role) => {
  const { access_token, access_token_hash, idempotency_key, items, history, ...safe } = order;
  if (role === 'fulfillment') {
    const { total, discount_total, shipping_fee, ...limited } = safe;
    return limited;
  }
  return safe;
};
const orderList = async () => (await all('orders')).sort((a, b) => b.id - a.id).map(o => ({ ...o, is_delayed: ['new', 'processing'].includes(o.status) && Date.parse(o.created_at) < Date.now() - 48 * 3600000 ? 1 : 0 }));

apiRouter.get('/health', (req, res) => res.json(ok({ status: 'running', version: 'firebase-v1' })));
apiRouter.post('/auth/login', wrap(async (req, res) => {
  const d = parse(z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) }).strict(), req.body);
  const email = d.email.toLowerCase();
  const attemptsRef = ref('login_attempts', tokenHash(email));
  const attempts = (await attemptsRef.get()).data();
  if (attempts?.blocked_until > Date.now()) throw fail(429, 'محاولات كثيرة، جرّب بعد 15 دقيقة');
  const staff = (await all('staff')).find(s => s.email === email && s.is_active);
  if (!staff || !bcrypt.compareSync(d.password, staff.password_hash)) {
    await db.runTransaction(async tx => {
      const previous = (await tx.get(attemptsRef)).data();
      const count = previous?.window_start > Date.now() - 15 * 60000 ? (previous.count || 0) + 1 : 1;
      tx.set(attemptsRef, { count, window_start: count === 1 ? Date.now() : previous.window_start, blocked_until: count >= 5 ? Date.now() + 15 * 60000 : 0 });
    });
    throw fail(401, 'البريد أو كلمة المرور غير صحيحة');
  }
  await attemptsRef.delete();
  const token = randomUUID();
  await ref('sessions', tokenHash(token)).set({ staff_id: staff.id, version: staff.session_version || 0, expires: Date.now() + 8 * 3600000 });
  res.json(ok({ token, staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role } }));
}));
apiRouter.post('/auth/logout', requireStaff(), wrap(async (req, res) => { await ref('sessions', tokenHash(req.token)).delete(); res.json(ok({ loggedOut: true })); }));
apiRouter.get('/me', requireStaff(), wrap(async (req, res) => res.json(ok({ staff: { id: req.staff.id, name: req.staff.name, email: req.staff.email, role: req.staff.role, is_active: req.staff.is_active }, categories: [...(await allowedCategories(req.staff) || new Set())] }))));

apiRouter.get('/categories', wrap(async (req, res) => res.json(ok((await categoryRows()).filter(c => c.is_active)))));
apiRouter.get('/admin/categories', requireStaff(['owner', 'catalog', 'support']), wrap(async (req, res) => {
  const permitted = await allowedCategories(req.staff);
  res.json(ok((await categoryRows()).filter(c => req.staff.role !== 'catalog' || permitted.has(c.id))));
}));
async function categoryRows() {
  const categories = (await all('categories')).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const counts = new Map();
  for (const p of await all('products')) if (p.is_active) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
  return categories.map(c => ({ ...c, product_count: counts.get(c.id) || 0 }));
}
function checkTree(categories, categoryId, parentId) {
  if (categoryId === parentId) throw fail(400, 'القسم لا يمكن أن يكون أبًا لنفسه');
  const byId = new Map(categories.map(c => [c.id, c]));
  const visited = new Set([categoryId]);
  let current = parentId; let depth = 1;
  while (current !== null) {
    if (visited.has(current)) throw fail(400, 'هذا النقل يسبب حلقة في الأقسام');
    const category = byId.get(current);
    if (!category) throw fail(400, 'القسم الأب غير موجود');
    visited.add(current); current = category.parent_id; depth++;
  }
  const height = (id, seen = new Set()) => Math.max(1, ...categories.filter(c => c.parent_id === id).map(c => seen.has(c.id) ? 4 : 1 + height(c.id, new Set([...seen, c.id]))));
  if (depth + (categoryId ? height(categoryId) - 1 : 0) > 3) throw fail(400, 'الحد الأقصى للأقسام ثلاثة مستويات');
}
async function saveCategory(req, res, updating) {
  const d = parse(categorySchema, req.body);
  const categoryId = Number(req.params.id);
  const categories = await all('categories');
  const existing = updating ? categories.find(c => c.id === categoryId) : null;
  if (updating && !existing) throw fail(404, 'القسم غير موجود');
  checkTree(categories, updating ? categoryId : null, d.parent_id);
  const savedId = updating ? categoryId : await nextId('categories');
  await ref('categories', savedId).set(updating ? stamp({ ...existing, ...d }) : { ...d, id: savedId, slug: `${d.name.trim().toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`, image_url: null, created_at: now(), updated_at: now() });
  await audit(req.staff.id, updating ? 'update' : 'create', 'category', savedId, d);
  res.status(updating ? 200 : 201).json(ok({ id: savedId }));
}
apiRouter.post('/categories', requireStaff(['owner']), wrap((req, res) => saveCategory(req, res, false)));
apiRouter.patch('/categories/:id', requireStaff(['owner']), wrap((req, res) => saveCategory(req, res, true)));

async function productsFor(staff) {
  const categories = new Map((await all('categories')).map(c => [c.id, c]));
  const permitted = await allowedCategories(staff);
  return (await all('products')).filter(p => staff.role !== 'catalog' || permitted.has(p.category_id)).sort((a, b) => b.id - a.id).map(p => {
    const { cost_price, ...safe } = p;
    return { ...safe, category_name: categories.get(p.category_id)?.name || '', ...(staff.role === 'owner' ? { cost_price } : {}) };
  });
}
apiRouter.get('/products', requireStaff(['owner', 'catalog', 'support']), wrap(async (req, res) => res.json(ok(await productsFor(req.staff)))));
async function saveProduct(req, res, updating) {
  const d = parse(productSchema, req.body);
  const productId = Number(req.params.id);
  const existing = updating ? await read('products', productId) : null;
  if (updating && !existing) throw fail(404, 'المنتج غير موجود');
  const allowed = await allowedCategories(req.staff);
  if (allowed && (!allowed.has(d.category_id) || existing && !allowed.has(existing.category_id))) throw fail(403, 'يمكنك إدارة منتجات أقسامك فقط');
  if (req.staff.role !== 'owner' && d.cost_price !== undefined) throw fail(403, 'لا يمكنك تعديل تكلفة الشراء');
  if (d.compare_at_price != null && d.compare_at_price <= d.sale_price) throw fail(400, 'السعر قبل الخصم يجب أن يكون أكبر من سعر البيع');
  const categories = await all('categories');
  const category = categories.find(c => c.id === d.category_id);
  if (!category || !category.is_active) throw fail(400, 'اختر قسمًا نشطًا');
  if (categories.some(c => c.parent_id === d.category_id && c.is_active)) throw fail(400, 'اختر فرعًا نهائيًا للمنتج');
  const products = await all('products');
  if (d.sku && products.some(p => p.sku === d.sku && p.id !== productId)) throw fail(409, 'رمز المنتج مستخدم');
  const savedId = updating ? productId : await nextId('products');
  const row = {
    ...existing, ...d, id: savedId, sku: d.sku || null,
    cost_price: d.cost_price === undefined ? existing?.cost_price ?? null : d.cost_price,
    compare_at_price: d.compare_at_price === undefined ? existing?.compare_at_price ?? null : d.compare_at_price,
    brand: d.brand === undefined ? existing?.brand || '' : d.brand,
    images: d.images === undefined ? existing?.images || [] : d.images,
    is_featured: d.is_featured === undefined ? existing?.is_featured || 0 : Number(d.is_featured),
    is_new: d.is_new === undefined ? existing?.is_new || 0 : Number(d.is_new),
    is_active: Number(d.is_active), created_at: existing?.created_at || now(), updated_at: now(),
    slug: existing?.slug || `${d.name.trim().toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`,
  };
  await ref('products', savedId).set(row);
  await audit(req.staff.id, updating ? 'update' : 'create', 'product', savedId, { ...d, cost_price: undefined });
  res.status(updating ? 200 : 201).json(ok({ id: savedId }));
}
apiRouter.post('/products', requireStaff(['owner', 'catalog']), wrap((req, res) => saveProduct(req, res, false)));
apiRouter.patch('/products/:id', requireStaff(['owner', 'catalog']), wrap((req, res) => saveProduct(req, res, true)));

apiRouter.get('/storefront/settings', wrap(async (req, res) => {
  const settings = await read('store_settings', 'main');
  res.json(ok({ currency: 'YER', shipping_fee: Number(settings?.shipping_fee || 0), payment_methods: ['cod'] }));
}));
apiRouter.get('/storefront/categories', wrap(async (req, res) => {
  const categories = (await all('categories')).filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const byId = new Map(categories.map(c => [c.id, c]));
  res.json(ok(categories.map(c => ({ id: c.slug, name: c.name, slug: c.slug, parentId: byId.get(c.parent_id)?.slug || null, level: c.parent_id ? byId.get(c.parent_id)?.parent_id ? 3 : 2 : 1, sortOrder: c.sort_order, imageUrl: c.image_url || '', isActive: true }))));
}));
apiRouter.get('/storefront/products', wrap(async (req, res) => {
  const categories = new Map((await all('categories')).map(c => [c.id, c]));
  const promotions = await all('promotions');
  const products = (await all('products')).filter(p => p.is_active && categories.get(p.category_id)?.is_active).sort((a, b) => b.id - a.id);
  res.json(ok(products.map(p => publicProduct(p, categories.get(p.category_id), promotions))));
}));
apiRouter.get('/storefront/products/:id', wrap(async (req, res) => {
  const product = await read('products', req.params.id);
  const category = product && await read('categories', product.category_id);
  if (!product?.is_active || !category?.is_active) throw fail(404, 'المنتج غير موجود');
  res.json(ok(publicProduct(product, category, await all('promotions'))));
}));

async function getQuote(cart) {
  const productIds = [...new Set(cart.items.map(item => item.product_id))];
  const [products, categories, promotions, settings] = await Promise.all([
    Promise.all(productIds.map(productId => read('products', productId))), all('categories'), all('promotions'), read('store_settings', 'main'),
  ]);
  const activeCategories = new Set(categories.filter(c => c.is_active).map(c => c.id));
  return quote(cart, products.filter(Boolean).map(p => ({ ...p, category_active: activeCategories.has(p.category_id) })), promotions, Number(settings?.shipping_fee || 0));
}
apiRouter.post('/storefront/quote', wrap(async (req, res) => res.json(ok(await getQuote(parse(cartSchema, req.body))))));
apiRouter.post('/storefront/orders', wrap(async (req, res) => {
  const d = parse(orderSchema, req.body);
  const result = await db.runTransaction(async tx => {
    const idempotencyRef = ref('order_idempotency', d.idempotency_key);
    const prior = (await tx.get(idempotencyRef)).data();
    if (prior) return prior;
    const countersRef = ref('_counters', 'orders');
    const settingsRef = ref('store_settings', 'main');
    const [counterSnap, settingsSnap, promotionsSnap, productSnaps] = await Promise.all([
      tx.get(countersRef), tx.get(settingsRef), tx.get(db.collection('promotions')),
      Promise.all([...new Set(d.items.map(item => item.product_id))].map(productId => tx.get(ref('products', productId)))),
    ]);
    const products = productSnaps.map(snapshot => snapshot.data()).filter(Boolean);
    const categorySnaps = await Promise.all([...new Set(products.map(p => p.category_id))].map(categoryId => tx.get(ref('categories', categoryId))));
    const activeCategories = new Set(categorySnaps.map(s => s.data()).filter(c => c?.is_active).map(c => c.id));
    const q = quote(d, products.map(p => ({ ...p, category_active: activeCategories.has(p.category_id) })), promotionsSnap.docs.map(doc => doc.data()), Number(settingsSnap.data()?.shipping_fee || 0));
    const orderId = (counterSnap.data()?.value || 0) + 1;
    const accessToken = randomUUID();
    const createdAt = now();
    const order = {
      id: orderId, customer_name: d.name, customer_phone: d.phone, status: 'new', total: q.total,
      city: d.city, district: d.district, street: d.street, address_note: d.note,
      shipping_fee: q.shipping, discount_total: q.discount, payment_method: 'cod', payment_status: 'pending',
      shipping_company: null, tracking_number: null, items: q.items.map((item, index) => ({ id: index + 1, ...item })),
      history: [{ id: 1, staff_name: null, from_status: null, to_status: 'new', note: 'تم إنشاء الطلب بالدفع عند الاستلام', created_at: createdAt }],
      access_token_hash: tokenHash(accessToken), idempotency_key: d.idempotency_key, created_at: createdAt, updated_at: createdAt,
    };
    tx.set(countersRef, { value: orderId });
    tx.set(ref('orders', orderId), order);
    tx.set(idempotencyRef, { id: orderId, total: q.total, access_token: accessToken });
    for (const item of q.items) {
      const product = products.find(p => p.id === item.product_id);
      tx.update(ref('products', item.product_id), { stock: product.stock - item.quantity, updated_at: createdAt });
    }
    return { id: orderId, total: q.total, access_token: accessToken };
  });
  res.status(201).json(ok({ ...result, currency: 'YER', payment_method: 'cod' }));
}));
apiRouter.get('/storefront/orders/:id', wrap(async (req, res) => {
  const order = await read('orders', req.params.id);
  const token = String(req.headers['x-order-token'] || '');
  if (!order || !token || order.access_token_hash !== tokenHash(token)) throw fail(404, 'الطلب غير موجود');
  const { access_token_hash, idempotency_key, history, ...safe } = order;
  res.json(ok(safe));
}));

apiRouter.get('/orders', requireStaff(orderRoles), wrap(async (req, res) => res.json(ok((await orderList()).map(o => orderView(o, req.staff.role))))));
apiRouter.get('/orders/:id', requireStaff(orderRoles), wrap(async (req, res) => {
  const order = (await orderList()).find(o => o.id === Number(req.params.id));
  if (!order) throw fail(404, 'الطلب غير موجود');
  const items = req.staff.role === 'fulfillment' ? order.items.map(({ unit_price, regular_price, ...item }) => item) : order.items;
  res.json(ok({ ...orderView(order, req.staff.role), items, history: order.history, allowed_statuses: [order.status, ...statusTransitions[order.status]] }));
}));
apiRouter.patch('/orders/:id/status', requireStaff(['owner', 'fulfillment']), wrap(async (req, res) => {
  const d = parse(z.object({ status: z.enum(['new', 'processing', 'shipped', 'delivered', 'cancelled']), shipping_company: z.string().trim().max(200), tracking_number: z.string().trim().max(200), expected_updated_at: z.string() }).strict(), req.body);
  const orderId = Number(req.params.id);
  await db.runTransaction(async tx => {
    const orderRef = ref('orders', orderId);
    const snapshot = await tx.get(orderRef);
    const order = snapshot.data();
    if (!order) throw fail(404, 'الطلب غير موجود');
    if (order.updated_at !== d.expected_updated_at) throw fail(409, 'تم تعديل الطلب من موظف آخر. أعد فتح التفاصيل');
    if (['delivered', 'cancelled'].includes(order.status)) throw fail(400, 'الطلب مغلق ولا يمكن تعديله');
    if (d.status !== order.status && !statusTransitions[order.status].includes(d.status)) throw fail(400, 'لا يمكن الانتقال إلى هذه الحالة');
    if (d.status === 'shipped' && (!d.shipping_company || !d.tracking_number)) throw fail(400, 'شركة الشحن ورقم التتبع مطلوبان');
    const productSnaps = d.status === 'cancelled' ? await Promise.all(order.items.map(item => tx.get(ref('products', item.product_id)))) : [];
    const updatedAt = now();
    const history = [...(order.history || []), { id: (order.history?.length || 0) + 1, staff_id: req.staff.id, staff_name: req.staff.name, from_status: order.status, to_status: d.status, note: `الشحن: ${d.shipping_company || '—'} · التتبع: ${d.tracking_number || '—'}`, created_at: updatedAt }];
    tx.update(orderRef, { status: d.status, shipping_company: d.shipping_company || null, tracking_number: d.tracking_number || null, updated_at: updatedAt, history });
    if (d.status === 'cancelled' && order.idempotency_key) for (let i = 0; i < order.items.length; i++) {
      if (productSnaps[i].exists) tx.update(productSnaps[i].ref, { stock: productSnaps[i].data().stock + order.items[i].quantity, updated_at: updatedAt });
    }
  });
  await audit(req.staff.id, 'update_status', 'order', orderId, d);
  res.json(ok({ id: orderId }));
}));

apiRouter.post('/admin/media', requireStaff(['owner', 'catalog']), wrap(async (req, res) => {
  const bytes = Buffer.isBuffer(req.body) ? req.body : req.rawBody;
  if (!Buffer.isBuffer(bytes) || bytes.length < 16) throw fail(400, 'ملف الصورة غير صالح');
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  const type = req.headers['content-type']?.split(';')[0];
  const ext = png && type === 'image/png' ? 'png' : jpg && type === 'image/jpeg' ? 'jpg' : webp && type === 'image/webp' ? 'webp' : null;
  if (!ext) throw fail(400, 'ارفع صورة PNG أو JPEG أو WebP صالحة');
  const bucket = getStorage().bucket(process.env.SOUQ_STORAGE_BUCKET || `${process.env.GCLOUD_PROJECT || 'soow-2dc12'}.firebasestorage.app`);
  const key = `media/${randomUUID()}.${ext}`;
  const downloadToken = randomUUID();
  await bucket.file(key).save(bytes, { resumable: false, metadata: { contentType: type, metadata: { firebaseStorageDownloadTokens: downloadToken } } });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(key)}?alt=media&token=${downloadToken}`;
  res.status(201).json(ok({ url }));
}));

apiRouter.get('/admin/promotions', requireStaff(['owner']), wrap(async (req, res) => res.json(ok((await all('promotions')).sort((a, b) => b.id - a.id)))));
async function savePromotion(req, res, updating) {
  const d = parse(promotionSchema, req.body);
  if (d.discount_type === 'percent' && d.value > 100) throw fail(400, 'النسبة لا تتجاوز 100%');
  if (d.starts_at && !Number.isFinite(Date.parse(d.starts_at)) || d.ends_at && !Number.isFinite(Date.parse(d.ends_at)) || d.starts_at && d.ends_at && Date.parse(d.starts_at) >= Date.parse(d.ends_at)) throw fail(400, 'تاريخ العرض غير صحيح');
  if (d.scope_type !== 'all' && !d.target_ids.length) throw fail(400, 'اختر المنتجات أو الأقسام المشمولة');
  if (d.scope_type !== 'all') {
    const records = await all(d.scope_type === 'products' ? 'products' : 'categories');
    if (d.target_ids.some(targetId => !records.some(row => row.id === targetId))) throw fail(400, 'أحد العناصر المحددة غير موجود');
  }
  const promotionId = Number(req.params.id);
  const existing = updating ? await read('promotions', promotionId) : null;
  if (updating && !existing) throw fail(404, 'العرض غير موجود');
  if (d.code && (await all('promotions')).some(p => p.code === d.code && p.id !== promotionId)) throw fail(409, 'كود العرض مستخدم');
  const savedId = updating ? promotionId : await nextId('promotions');
  await ref('promotions', savedId).set({ ...d, id: savedId, is_active: Number(d.is_active), created_at: existing?.created_at || now(), updated_at: now() });
  await audit(req.staff.id, updating ? 'update' : 'create', 'promotion', savedId, d);
  res.status(updating ? 200 : 201).json(ok({ id: savedId }));
}
apiRouter.post('/admin/promotions', requireStaff(['owner']), wrap((req, res) => savePromotion(req, res, false)));
apiRouter.patch('/admin/promotions/:id', requireStaff(['owner']), wrap((req, res) => savePromotion(req, res, true)));

apiRouter.get('/storefront/home', wrap(async (req, res) => {
  const home = (await read('store_content', 'home'))?.published;
  if (!home) throw fail(503, 'الصفحة الرئيسية غير جاهزة');
  const categories = await all('categories');
  const publicLink = item => {
    if (item.linkType !== 'category' || !item.linkId) return item;
    const category = categories.find(c => c.id === Number(item.linkId) || c.slug === item.linkId);
    return category ? { ...item, linkId: category.slug } : item;
  };
  res.json(ok({ ...home, hero: publicLink(home.hero), announcements: home.announcements.map(publicLink), banners: home.banners.map(publicLink) }));
}));
apiRouter.get('/admin/home', requireStaff(['owner']), wrap(async (req, res) => {
  const home = await read('store_content', 'home');
  if (!home) throw fail(503, 'الصفحة الرئيسية غير جاهزة');
  res.json(ok({ draft: home.draft, published: home.published, updated_at: home.updated_at }));
}));
apiRouter.put('/admin/home', requireStaff(['owner']), wrap(async (req, res) => {
  const draft = parse(homeSchema, req.body);
  if (new Set(draft.sections.map(s => s.id)).size !== 3) throw fail(400, 'راجع أقسام الصفحة الرئيسية');
  await ref('store_content', 'home').update({ draft, updated_at: now() });
  await audit(req.staff.id, 'update', 'home', 1, { draft: true });
  res.json(ok({ saved: true }));
}));
apiRouter.post('/admin/home/publish', requireStaff(['owner']), wrap(async (req, res) => {
  const home = await read('store_content', 'home');
  if (!home?.draft) throw fail(503, 'الصفحة الرئيسية غير جاهزة');
  if (home.draft.banners.some(banner => banner.enabled && !banner.image)) throw fail(400, 'أضف صورة لكل بنر منشور');
  await ref('store_content', 'home').update({ published: home.draft, updated_at: now() });
  await audit(req.staff.id, 'publish', 'home', 1, {});
  res.json(ok({ published: true }));
}));

apiRouter.get('/staff', requireStaff(['owner']), wrap(async (req, res) => res.json(ok((await all('staff')).sort((a, b) => a.id - b.id).map(({ password_hash, session_version, ...staff }) => staff)))));
async function saveStaff(req, res, updating) {
  const d = parse(staffSchema, req.body);
  const staffId = Number(req.params.id);
  const existing = updating ? await read('staff', staffId) : null;
  if (updating && !existing) throw fail(404, 'الموظف غير موجود');
  if (!updating && !d.password) throw fail(400, 'كلمة المرور مطلوبة');
  if (updating && staffId === req.staff.id && (!d.is_active || d.role !== 'owner')) throw fail(400, 'لا يمكنك تعطيل حسابك أو إزالة صلاحية المدير');
  const categoryIds = [...new Set(d.categories)];
  if (d.role === 'catalog' && !categoryIds.length) throw fail(400, 'حدد قسمًا واحدًا على الأقل لمسؤول المنتجات');
  if (categoryIds.some(categoryId => !Number.isInteger(categoryId))) throw fail(400, 'أحد الأقسام غير موجود');
  const categories = await all('categories');
  if (categoryIds.some(categoryId => !categories.some(c => c.id === categoryId))) throw fail(400, 'أحد الأقسام غير موجود');
  const staff = await all('staff');
  if (staff.some(s => s.email === d.email.toLowerCase() && s.id !== staffId)) throw fail(409, 'البريد مستخدم');
  const savedId = updating ? staffId : await nextId('staff');
  const passwordHash = d.password ? bcrypt.hashSync(d.password, 10) : existing.password_hash;
  await ref('staff', savedId).set({
    id: savedId, name: d.name, email: d.email.toLowerCase(), password_hash: passwordHash, role: d.role,
    is_active: Number(d.is_active), categories: d.role === 'catalog' ? categoryIds : [],
    session_version: (existing?.session_version || 0) + (updating ? 1 : 0), created_at: existing?.created_at || now(),
  });
  await audit(req.staff.id, updating ? 'update' : 'create', 'staff', savedId, { name: d.name, role: d.role, is_active: d.is_active, categories: categoryIds, password_changed: !!d.password });
  res.status(updating ? 200 : 201).json(ok({ id: savedId }));
}
apiRouter.post('/staff', requireStaff(['owner']), wrap((req, res) => saveStaff(req, res, false)));
apiRouter.patch('/staff/:id', requireStaff(['owner']), wrap((req, res) => saveStaff(req, res, true)));
apiRouter.get('/audit-log', requireStaff(['owner']), wrap(async (req, res) => {
  const staff = new Map((await all('staff')).map(s => [s.id, s.name]));
  const rows = (await all('audit_log')).sort((a, b) => b.id - a.id).slice(0, 200);
  res.json(ok(rows.map(row => ({ ...row, staff_name: staff.get(row.staff_id) || '' }))));
}));
apiRouter.get('/dashboard', requireStaff(), wrap(async (req, res) => {
  const canOrders = orderRoles.includes(req.staff.role);
  const canProducts = ['owner', 'catalog'].includes(req.staff.role);
  const orders = canOrders ? await orderList() : [];
  const products = canProducts ? await productsFor(req.staff) : [];
  const low = products.filter(p => p.is_active && p.stock <= 5);
  res.json(ok({
    new_orders: canOrders ? orders.filter(o => o.status === 'new').length : null,
    delayed_orders: canOrders ? orders.filter(o => o.is_delayed).length : null,
    low_stock: canProducts ? low.length : null, product_count: canProducts ? products.length : null,
    recent_orders: orders.slice(0, 5).map(o => orderView(o, req.staff.role)), low_stock_products: low.slice(0, 5),
  }));
}));

apiRouter.use((req, res) => send(res, 404, 'المسار غير موجود'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return send(res, 413, 'حجم الملف كبير جدًا');
  if (error instanceof SyntaxError) return send(res, 400, 'الطلب غير صحيح');
  if (error.status) return send(res, error.status, error.message);
  console.error(error);
  return send(res, 500, 'تعذر حفظ العملية. حاول مرة أخرى');
});

export { app };
export const api = onRequest({ region: 'me-central1', invoker: 'public', memory: '512MiB', timeoutSeconds: 60, cors: ['https://localhost'] }, app);
