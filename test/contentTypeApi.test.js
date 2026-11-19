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
  await createUser({ email: 'mem@club.com', password_hash: await bcrypt.hash('secret123', 4), name: 'Mem' });
});

async function expect415(contentType, body) {
  const res = await fetch(`${baseUrl}/api/login`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  assert.equal(res.status, 415);
  assert.deepEqual(await res.json(), { error: 'Send the body as JSON.' });
  assert.equal(res.headers.get('set-cookie'), null);
}

test('AC-34: a JSON body sent as text/plain gets 415 with one sentence, not 500, and nobody is signed in', async () => {
  await expect415('text/plain', JSON.stringify({ email: 'mem@club.com', password: 'secret123' }));
});

test('AC-34: a form body gets 415 with one sentence and nobody is signed in', async () => {
  await expect415('application/x-www-form-urlencoded', 'email=mem%40club.com&password=secret123');
});
