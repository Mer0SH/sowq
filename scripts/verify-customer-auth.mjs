import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const origin = 'https://soow-2dc12.web.app';
const key = 'AIzaSyCCjveYsN7akd6NkK5upM8G98gcoK1Wogo';
const email = `souq-qa-${randomUUID()}@example.com`;
const password = `Qa!${randomUUID()}`;
let token = '';
let deleted = false;

async function request(path, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const body = await response.json();
  return { status: response.status, body };
}

try {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data.error || data));
  token = data.idToken;
  const me = await request('/api/storefront/me');
  assert.equal(me.status, 200, JSON.stringify(me.body));
  assert.equal(me.body.data.onboarded, false);
  const save = await request('/api/storefront/me/interests', { method: 'PUT', body: JSON.stringify({ interests: ['electronics', 'sports'] }) });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  const updated = await request('/api/storefront/me');
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.data.onboarded, true);
  assert.deepEqual(updated.body.data.interests, ['electronics', 'sports']);
  console.log('Email registration, authenticated profile, and interest saving passed.');
} finally {
  if (token) {
    const cleanup = await request('/api/storefront/me', { method: 'DELETE' });
    deleted = cleanup.status === 200;
    if (!deleted) {
      const fallback = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
      deleted = fallback.status === 200;
    }
    console.log(deleted ? 'Temporary QA account and profile deleted.' : `Temporary QA cleanup failed: HTTP ${cleanup.status}`);
  }
}
if (!deleted) process.exitCode = 1;
