import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

test('Firestore order, retry, role filtering, and cancellation', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const { app } = await import('./index.js');
  const { getFirestore } = await import('firebase-admin/firestore');
  const bcrypt = (await import('bcryptjs')).default;
  const db = getFirestore();
  const id = Math.floor(100000 + Math.random() * 800000);
  const categoryRef = db.collection('categories').doc(String(id));
  const productRef = db.collection('products').doc(String(id));
  const staffRef = db.collection('staff').doc(String(id));
  const fulfillmentRef = db.collection('staff').doc(String(id + 1));
  const idempotencyKey = randomUUID();
  const email = `owner-${id}@example.invalid`;
  const fulfillmentEmail = `fulfillment-${id}@example.invalid`;
  let orderId;
  let ownerToken;
  let fulfillmentToken;
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body, token, headers = {}) {
    const response = await fetch(base + path, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, json: await response.json() };
  }
  try {
    await categoryRef.set({ id, name: 'قسم اختبار', slug: `test-${id}`, parent_id: null, sort_order: 1, is_active: 1 });
    await productRef.set({ id, name: 'منتج اختبار', category_id: id, sale_price: 100, stock: 2, is_active: 1, images: [], brand: '', sku: `TEST-${id}` });
    const password = `Test-${randomUUID()}`;
    await Promise.all([
      staffRef.set({ id, name: 'مالك اختبار', email, password_hash: bcrypt.hashSync(password, 10), role: 'owner', is_active: 1, categories: [], session_version: 0 }),
      fulfillmentRef.set({ id: id + 1, name: 'موظف اختبار', email: fulfillmentEmail, password_hash: bcrypt.hashSync(password, 10), role: 'fulfillment', is_active: 1, categories: [], session_version: 0 }),
      db.collection('store_settings').doc('main').set({ shipping_fee: 5 }),
    ]);
    const ownerLogin = await request('/auth/login', 'POST', { email, password });
    assert.equal(ownerLogin.status, 200, JSON.stringify(ownerLogin.json));
    ownerToken = ownerLogin.json.data.token;
    const fulfillmentLogin = await request('/auth/login', 'POST', { email: fulfillmentEmail, password });
    assert.equal(fulfillmentLogin.status, 200);
    fulfillmentToken = fulfillmentLogin.json.data.token;
    const cart = { items: [{ product_id: id, quantity: 2 }], coupon: '' };
    const priced = await request('/storefront/quote', 'POST', cart);
    assert.equal(priced.status, 200, JSON.stringify(priced.json));
    assert.equal(priced.json.data.total, 205);
    const orderBody = { ...cart, name: 'عميل اختبار', phone: '777123456', city: 'صنعاء', district: '', street: 'شارع الاختبار', note: '', payment_method: 'cod', idempotency_key: idempotencyKey };
    const created = await request('/storefront/orders', 'POST', orderBody);
    assert.equal(created.status, 201, JSON.stringify(created.json));
    orderId = created.json.data.id;
    const retried = await request('/storefront/orders', 'POST', orderBody);
    assert.equal(retried.json.data.id, orderId);
    assert.equal((await productRef.get()).data().stock, 0);
    const customerOrder = await request(`/storefront/orders/${orderId}`, 'GET', undefined, undefined, { 'x-order-token': created.json.data.access_token });
    assert.equal(customerOrder.status, 200);
    const fulfillOrder = await request(`/orders/${orderId}`, 'GET', undefined, fulfillmentToken);
    assert.equal(fulfillOrder.status, 200);
    assert.equal('total' in fulfillOrder.json.data, false);
    assert.equal('unit_price' in fulfillOrder.json.data.items[0], false);
    const ownerOrder = await request(`/orders/${orderId}`, 'GET', undefined, ownerToken);
    const cancelled = await request(`/orders/${orderId}/status`, 'PATCH', { status: 'cancelled', shipping_company: '', tracking_number: '', expected_updated_at: ownerOrder.json.data.updated_at }, ownerToken);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
    assert.equal((await productRef.get()).data().stock, 2);
  } finally {
    server.close();
    const deletions = [categoryRef, productRef, staffRef, fulfillmentRef, db.collection('order_idempotency').doc(idempotencyKey)];
    if (orderId) deletions.push(db.collection('orders').doc(String(orderId)));
    if (ownerToken) deletions.push(db.collection('sessions').doc(createHash('sha256').update(ownerToken).digest('hex')));
    if (fulfillmentToken) deletions.push(db.collection('sessions').doc(createHash('sha256').update(fulfillmentToken).digest('hex')));
    await Promise.all(deletions.map(ref => ref.delete()));
  }
});
