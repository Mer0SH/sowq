// Read-only SQLite snapshot and guarded, one-time Firestore/Storage import.
// Usage: node scripts/migrate-to-firebase.mjs --source <shop-backend-path> [--apply]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const sourceAt = args.indexOf('--source');
if (sourceAt < 0 || !args[sourceAt + 1]) throw new Error('Pass --source with the existing shop-backend directory.');
const backend = path.resolve(args[sourceAt + 1]);
const sourceDb = path.join(backend, 'data', 'shop.db');
if (!fs.existsSync(sourceDb)) throw new Error(`Source database not found: ${sourceDb}`);
const apply = args.includes('--apply');
const allowTestOwner = args.includes('--allow-test-owner');
const cliAuth = args.includes('--firebase-cli-auth');
const requireBackend = createRequire(path.join(backend, 'package.json'));
const Database = requireBackend('better-sqlite3');
const bcrypt = requireBackend('bcryptjs');
const original = new Database(sourceDb, { readonly: true, fileMustExist: true });
const backupDir = path.resolve('.migration-private');
fs.mkdirSync(backupDir, { recursive: true });
const snapshotPath = path.join(backupDir, `shop-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
await original.backup(snapshotPath);
original.close();
const sqlite = new Database(snapshotPath, { readonly: true, fileMustExist: true });
if (sqlite.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('SQLite integrity check failed.');
const rows = table => sqlite.prepare(`SELECT * FROM ${table}`).all();
const json = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const categories = rows('categories');
const products = rows('products').map(p => ({ ...p, images: json(p.images, []), colors: json(p.colors, []), sizes: json(p.sizes, []), specs: json(p.specs, {}) }));
const staffCategories = rows('staff_categories');
const staff = rows('staff').map(s => ({ ...s, categories: staffCategories.filter(link => link.staff_id === s.id).map(link => link.category_id), session_version: 0 }));
const customers = rows('customers');
const orderItems = rows('order_items');
const orderHistory = rows('order_history');
const orders = rows('orders').map(o => {
  const customer = customers.find(c => c.id === o.customer_id);
  if (!customer) throw new Error(`Order ${o.id} has no customer.`);
  return {
    ...o, customer_name: customer.name, customer_phone: customer.phone,
    access_token_hash: o.access_token ? createHash('sha256').update(o.access_token).digest('hex') : null,
    items: orderItems.filter(item => item.order_id === o.id).map(item => {
      const product = products.find(p => p.id === item.product_id);
      return { ...item, name: product?.name || '', sku: product?.sku || null, image: product?.images?.[0] || '', regular_price: item.unit_price };
    }),
    history: orderHistory.filter(h => h.order_id === o.id).map(h => ({ ...h, staff_name: staff.find(s => s.id === h.staff_id)?.name || null })),
  };
});
const promotions = rows('promotions').map(p => ({ ...p, target_ids: json(p.target_ids, []) }));
const audit = rows('audit_log');
const homeRow = sqlite.prepare("SELECT * FROM store_content WHERE key='home'").get();
if (!homeRow) throw new Error('Home content is missing.');
const home = { draft: json(homeRow.draft_json, {}), published: json(homeRow.published_json, {}), updated_at: homeRow.updated_at };
const settings = Object.fromEntries(rows('store_settings').map(s => [s.key, s.value]));
const mediaDir = path.join(backend, 'data', 'media');
const mediaFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir).filter(name => fs.statSync(path.join(mediaDir, name)).isFile()) : [];
const migration = { categories, products, staff, customers, orders, promotions, audit_log: audit };
const localMediaRefs = new Set(JSON.stringify({ migration, home }).match(/\/media\/[a-zA-Z0-9._-]+/g) || []);
const missingMedia = [...localMediaRefs].filter(value => !fs.existsSync(path.join(mediaDir, path.basename(value))));
const orphanProducts = products.filter(p => !categories.some(c => c.id === p.category_id)).length;
const unsafeOwner = staff.some(s => s.role === 'owner' && (bcrypt.compareSync('Admin123!', s.password_hash) || s.email.endsWith('@shop.local')));
const summary = {
  snapshot: snapshotPath, project: 'soow-2dc12', counts: Object.fromEntries(Object.entries(migration).map(([key, values]) => [key, values.length])),
  mediaFiles: mediaFiles.length, mediaReferences: localMediaRefs.size, missingMedia, orphanProducts, unsafeOwner,
  testOwnerCredentials: settings.test_owner_credentials === '1',
};
console.log(JSON.stringify(summary, null, 2));
if (!apply) { sqlite.close(); process.exit(0); }
if (unsafeOwner) throw new Error('Production import blocked: replace the local default owner email and password, then run the dry run again.');
if (settings.test_owner_credentials === '1' && !allowTestOwner) throw new Error('Owner uses trial credentials. Pass --allow-test-owner only for an explicitly authorized trial, then rotate the password.');
if (missingMedia.length || orphanProducts) throw new Error('Production import blocked: fix missing media or orphan products.');

const projectId = 'soow-2dc12';
const bucketName = process.env.SOUQ_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
const protectedCollections = new Set(['categories', 'products', 'staff', 'orders', 'promotions', 'audit_log', 'store_content', 'store_settings']);
let firestore;
let bucket;
let cloudRequest;
if (cliAuth) {
  const cliConfigPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const cliConfig = JSON.parse(fs.readFileSync(cliConfigPath, 'utf8'));
  const accessToken = cliConfig.tokens?.access_token;
  if (!accessToken || cliConfig.tokens?.expires_at < Date.now() + 10 * 60000) throw new Error('Firebase CLI token is missing or nearly expired. Refresh Firebase CLI login before importing.');
  cloudRequest = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${accessToken}`, ...options.headers } });
    if (!response.ok) throw new Error(`Cloud API ${response.status}: ${(await response.text()).slice(0, 1000)}`);
    return response.status === 204 ? null : response.json();
  };
  const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const existing = await cloudRequest(`${firestoreBase}:listCollectionIds`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if ((existing.collectionIds || []).some(name => protectedCollections.has(name) || name === '_counters')) throw new Error('Target Firestore already contains Souq data; import will not overwrite it.');
  const bucketInfo = await cloudRequest(`https://storage.googleapis.com/storage/v1/b/${bucketName}`);
  if (bucketInfo.location?.toUpperCase() !== 'ME-CENTRAL1') throw new Error(`Storage bucket has unexpected location: ${bucketInfo.location}`);
  for (const name of mediaFiles) {
    const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(`media/${name}`)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.status !== 404) {
      if (!response.ok) throw new Error(`Storage preflight failed: ${response.status}`);
      throw new Error(`Target Storage already has media/${name}; import will not overwrite it.`);
    }
  }
} else {
  const requireFunctions = createRequire(path.resolve('functions', 'package.json'));
  const { initializeApp } = requireFunctions('firebase-admin/app');
  const { getFirestore } = requireFunctions('firebase-admin/firestore');
  const { getStorage } = requireFunctions('firebase-admin/storage');
  initializeApp({ projectId, storageBucket: bucketName });
  firestore = getFirestore();
  const existing = await firestore.listCollections();
  if (existing.some(collection => protectedCollections.has(collection.id) || collection.id === '_counters')) throw new Error('Target Firestore already contains Souq data; import will not overwrite it.');
  bucket = getStorage().bucket(bucketName);
  await bucket.getMetadata();
  const occupiedMedia = (await Promise.all(mediaFiles.map(async name => ({ name, exists: (await bucket.file(`media/${name}`).exists())[0] })))).filter(item => item.exists);
  if (occupiedMedia.length) throw new Error(`Target Storage already has ${occupiedMedia.length} matching media objects; import will not overwrite them.`);
}
const mediaUrls = new Map();
for (const name of mediaFiles) {
  const filePath = path.join(mediaDir, name);
  const key = `media/${name}`;
  const token = randomUUID();
  const contentType = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  if (cliAuth) {
    const boundary = `souq-${randomUUID()}`;
    const metadata = JSON.stringify({ name: key, contentType, metadata: { firebaseStorageDownloadTokens: token } });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
      fs.readFileSync(filePath), Buffer.from(`\r\n--${boundary}--`),
    ]);
    await cloudRequest(`https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=multipart`, { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body });
  } else {
    await bucket.upload(filePath, { destination: key, resumable: false, metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } } });
  }
  mediaUrls.set(`/media/${name}`, `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(key)}?alt=media&token=${token}`);
}
const replaceMedia = value => {
  if (typeof value === 'string') return mediaUrls.get(value) || value;
  if (Array.isArray(value)) return value.map(replaceMedia);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, val]) => val !== undefined).map(([key, val]) => [key, replaceMedia(val)]));
  return value;
};
const entries = [];
for (const [collection, values] of Object.entries(migration)) for (const row of values) {
  const value = collection === 'orders' ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'access_token')) : row;
  entries.push([collection, String(row.id), replaceMedia(value)]);
}
entries.push(['store_content', 'home', replaceMedia(home)]);
entries.push(['store_settings', 'main', { currency: settings.currency || 'YER', shipping_fee: Number(settings.shipping_fee || 0) }]);
for (const [collection, values] of Object.entries(migration)) entries.push(['_counters', collection, { value: Math.max(0, ...values.map(v => v.id)) }]);
for (const order of orders) if (order.idempotency_key && order.access_token) entries.push(['order_idempotency', order.idempotency_key, { id: order.id, total: order.total, access_token: order.access_token }]);
if (cliAuth) {
  const encodeValue = value => {
    if (value === null) return { nullValue: null };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) } };
  };
  for (let i = 0; i < entries.length; i += 400) {
    const writes = entries.slice(i, i + 400).map(([collection, id, value]) => ({
      update: { name: `projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`, fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) },
      currentDocument: { exists: false },
    }));
    await cloudRequest(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ writes }) });
  }
} else {
  for (let i = 0; i < entries.length; i += 400) {
    const batch = firestore.batch();
    for (const [collection, id, value] of entries.slice(i, i + 400)) batch.create(firestore.collection(collection).doc(id), value);
    await batch.commit();
  }
}
sqlite.close();
console.log(`Imported ${entries.length} documents and ${mediaFiles.length} media files into ${projectId}.`);
