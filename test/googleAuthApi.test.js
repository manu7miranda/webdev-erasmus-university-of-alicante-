const test = require('node:test');
const assert = require('node:assert');
const { setupTestDb, clearDatabase } = require('./helpers');
const pool = require('../src/db/pool');
const { createUser } = require('../src/db/users');
const googleClient = require('../src/lib/googleOAuthClient');
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  await setupTestDb();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test.beforeEach(async () => {
  await clearDatabase();
});

async function startLogin() {
  const res = await fetch(`${baseUrl}/api/auth/google`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  const location = new URL(res.headers.get('location'));
  assert.equal(location.host, 'accounts.google.com');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  return { state: location.searchParams.get('state'), cookie: res.headers.get('set-cookie').split(';')[0] };
}

test('AC-31: a callback with a wrong state gets 400 and nobody is signed in', async () => {
  const { cookie } = await startLogin();
  const res = await fetch(`${baseUrl}/api/auth/google/callback?state=wrong&code=abc`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(res.status, 400);
  const me = await fetch(`${baseUrl}/api/me`, { headers: { cookie } });
  assert.equal(me.status, 401);
});

test('AC-31: a callback without a started login gets 400', async () => {
  const res = await fetch(`${baseUrl}/api/auth/google/callback?state=x&code=abc`, { redirect: 'manual' });
  assert.equal(res.status, 400);
});

test('AC-28: the callback for a Google email that is not a member goes back to /login and signs nobody in', async () => {
  const original = googleClient.fetchGoogleProfile;
  googleClient.fetchGoogleProfile = async () => ({ googleId: 'g-7', email: 'stranger@club.com', emailVerified: true, name: 'Stranger' });
  try {
    const { state, cookie } = await startLogin();
    const res = await fetch(`${baseUrl}/api/auth/google/callback?state=${state}&code=abc`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/login?error=not-member');
    const me = await fetch(`${baseUrl}/api/me`, { headers: { cookie } });
    assert.equal(me.status, 401);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE email = $1', ['stranger@club.com']);
    assert.equal(rows[0].n, 0);
  } finally {
    googleClient.fetchGoogleProfile = original;
  }
});

test('AC-29: the callback with the right state signs an existing member in', async () => {
  await createUser({ email: 'route@club.com', password_hash: null, name: 'Route Person' });
  const original = googleClient.fetchGoogleProfile;
  googleClient.fetchGoogleProfile = async () => ({ googleId: 'g-9', email: 'route@club.com', emailVerified: true, name: 'Route Person' });
  try {
    const { state, cookie } = await startLogin();
    const res = await fetch(`${baseUrl}/api/auth/google/callback?state=${state}&code=abc`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/events');
    const newCookie = res.headers.get('set-cookie').split(';')[0];
    const me = await fetch(`${baseUrl}/api/me`, { headers: { cookie: newCookie } });
    assert.equal(me.status, 200);
    assert.ok(JSON.stringify(await me.json()).includes('Route Person'));
  } finally {
    googleClient.fetchGoogleProfile = original;
  }
});

test('AC-30: the callback for an unverified Google email gets 403', async () => {
  const original = googleClient.fetchGoogleProfile;
  googleClient.fetchGoogleProfile = async () => ({ googleId: 'g-8', email: 'fake@club.com', emailVerified: false, name: 'Fake' });
  try {
    const { state, cookie } = await startLogin();
    const res = await fetch(`${baseUrl}/api/auth/google/callback?state=${state}&code=abc`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(res.status, 403);
  } finally {
    googleClient.fetchGoogleProfile = original;
  }
});