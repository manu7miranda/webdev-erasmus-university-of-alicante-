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
  const hash = await bcrypt.hash('secret123', 4);
  await createUser({ email: 'org@club.com', password_hash: hash, role: 'organizer', name: 'Org' });
  await createUser({ email: 'mem@club.com', password_hash: hash, name: 'Mem' });
});

async function signIn(email) {
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123' }),
  });
  assert.equal(res.status, 200);
  return res.headers.get('set-cookie').split(';')[0];
}

function post(body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  return fetch(`${baseUrl}/api/events`, { method: 'POST', headers, body: JSON.stringify(body) });
}

const newEvent = {
  title: 'Summer barbecue',
  date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  total_places: 50,
  category: 'social',
  description: 'Food and music after the games.',
};

async function countEvents() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM events');
  return rows[0].n;
}

test('AC-35: an organizer who sends a valid event gets 201, and the event appears in GET /api/events', async () => {
  const cookie = await signIn('org@club.com');
  const res = await post(newEvent, cookie);
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.title, 'Summer barbecue');
  assert.equal(created.category, 'social');

  const list = await (await fetch(`${baseUrl}/api/events`, { headers: { cookie } })).json();
  const found = list.find((e) => e.id === created.id);
  assert.ok(found);
  assert.equal(found.free_places, 50);
});

test('AC-36: a member gets 403 and a visitor without a session gets 401; no row is created', async () => {
  const cookie = await signIn('mem@club.com');
  const asMember = await post(newEvent, cookie);
  assert.equal(asMember.status, 403);
  assert.equal((await asMember.json()).error, 'NotOrganizer');

  const asVisitor = await post(newEvent);
  assert.equal(asVisitor.status, 401);
  assert.equal(await countEvents(), 0);
});

test('AC-37: an event with a date in the past gets 400 with a message, and no row is created', async () => {
  const cookie = await signIn('org@club.com');
  const res = await post({ ...newEvent, date: new Date(Date.now() - 60 * 60 * 1000).toISOString() }, cookie);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'InvalidEvent');
  assert.equal(body.message, 'The date must be a valid date in the future.');
  assert.equal(await countEvents(), 0);
});
