// Receives credentials on stdin, so they do not appear in command arguments or files.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const sourceAt = args.indexOf('--source');
if (sourceAt < 0 || !args[sourceAt + 1]) throw new Error('Pass --source with the existing shop-backend directory.');
const backend = path.resolve(args[sourceAt + 1]);
const requireBackend = createRequire(path.join(backend, 'package.json'));
const Database = requireBackend('better-sqlite3');
const bcrypt = requireBackend('bcryptjs');
const input = await new Promise((resolve, reject) => {
  let raw = '';
  process.stdin.setEncoding('utf8');
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  const finish = () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    try { resolve(JSON.parse(raw.trim())); } catch { reject(new Error('Invalid input.')); }
  };
  process.stdin.on('data', chunk => {
    raw += chunk;
    if (raw.length > 1000) reject(new Error('Input too long.'));
    if (process.stdin.isTTY && /[\r\n]/.test(raw)) finish();
  });
  process.stdin.on('end', finish);
});
if (typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || typeof input.password !== 'string' || input.password.length < 8) throw new Error('Invalid owner credentials.');
const db = new Database(path.join(backend, 'data', 'shop.db'));
const owner = db.prepare("SELECT id FROM staff WHERE role='owner' AND is_active=1 ORDER BY id LIMIT 1").get();
if (!owner) throw new Error('Active owner account not found.');
const email = input.email.trim().toLowerCase();
if (db.prepare('SELECT id FROM staff WHERE email=? AND id<>?').get(email, owner.id)) throw new Error('Email is already used.');
const backupDir = path.resolve('.migration-private');
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `before-owner-test-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
await db.backup(backup);
const hash = bcrypt.hashSync(input.password, 12);
db.transaction(() => {
  db.prepare('UPDATE staff SET email=?,password_hash=? WHERE id=?').run(email, hash, owner.id);
  db.prepare("INSERT INTO store_settings(key,value) VALUES('test_owner_credentials','1') ON CONFLICT(key) DO UPDATE SET value='1'").run();
})();
db.close();
console.log(JSON.stringify({ updated: true, backup, testOnly: true }));
