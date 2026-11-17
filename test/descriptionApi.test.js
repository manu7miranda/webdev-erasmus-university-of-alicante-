const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const pool = require('../src/db/pool');
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  await setupTestDb();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://localhost:${address.port}`;
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

test('AC-25 an organizer (create the user with role \'organizer\') gets 200 with suggestion null and message "Suggestion not available, write the description yourself".', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org', role: 'organizer' });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'org@club.com', password: 'password123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  const cookie = loginRes.headers.get('set-cookie');

  const res = await fetch(`${baseUrl}/api/events/description-suggestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({ notes: 'Tennis tournament this Saturday' }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.suggestion, null);
  assert.strictEqual(data.message, 'Suggestion not available, write the description yourself');
});

test('AC-27 a signed-in member gets 403', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  await createUser({ email: 'mem@club.com', password_hash: passwordHash, name: 'Member', role: 'member' });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'password123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  const cookie = loginRes.headers.get('set-cookie');

  const res = await fetch(`${baseUrl}/api/events/description-suggestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({ notes: 'Tennis tournament this Saturday' }),
  });

  assert.strictEqual(res.status, 403);
});

test('AC-27 without a session it gets 401', async () => {
  const res = await fetch(`${baseUrl}/api/events/description-suggestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes: 'Tennis tournament this Saturday' }),
  });

  assert.strictEqual(res.status, 401);
});
