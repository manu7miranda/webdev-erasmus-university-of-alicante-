const test = require('node:test');
const assert = require('node:assert');
const { setupTestDb } = require('./helpers');
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

test('GET /health answers 200 with the database ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok', db: 'ok' });
});

test('a page that does not exist answers 404 with one short line', async () => {
  const res = await fetch(`${baseUrl}/no-such-page`);
  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(await res.json(), { error: 'Not found' });
});

test('broken JSON answers 400 with one sentence and no stack trace', async () => {
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": "a@b.c",',
  });
  assert.strictEqual(res.status, 400);
  const text = await res.text();
  assert.ok(text.includes('not valid JSON'));
  assert.ok(!text.includes('at '), 'no stack trace in the body');
});
