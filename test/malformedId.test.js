const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const pool = require('../src/db/pool');
const app = require('../src/app');
const { signUpForEvent, cancelRegistration, EventNotFound, NotOwner } = require('../src/services/registrationService');

let server;
let baseUrl;
let member;

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
  member = await createUser({ email: 'mem@club.com', password_hash: await bcrypt.hash('secret123', 4), name: 'Mem' });
});

async function signIn() {
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'secret123' }),
  });
  return res.headers.get('set-cookie').split(';')[0];
}

for (const id of [NaN, 0, 2147483648]) {
  test(`AC-38: signing up with the id ${id} throws EventNotFound, not a database error`, async () => {
    await assert.rejects(() => signUpForEvent(id, member.id), (err) => err instanceof EventNotFound);
  });
  test(`AC-38: cancelling with the id ${id} throws NotOwner, not a database error`, async () => {
    await assert.rejects(() => cancelRegistration(id, member.id), (err) => err instanceof NotOwner);
  });
}

test('AC-38: POST /api/events/abc/registrations gets 404, not 500', async () => {
  const res = await fetch(`${baseUrl}/api/events/abc/registrations`, { method: 'POST', headers: { cookie: await signIn() } });
  assert.equal(res.status, 404);
});

test('AC-38: DELETE /api/registrations/abc gets 403, not 500', async () => {
  const res = await fetch(`${baseUrl}/api/registrations/abc`, { method: 'DELETE', headers: { cookie: await signIn() } });
  assert.equal(res.status, 403);
});
