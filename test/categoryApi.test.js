const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const { createEvent } = require('../src/db/events');
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

function inDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

test('AC-32: GET /api/events returns each event with its category, and an event created without one is a sport event', async () => {
  const hash = await bcrypt.hash('secret123', 4);
  const org = await createUser({ email: 'org@club.com', password_hash: hash, role: 'organizer', name: 'Org' });
  await createUser({ email: 'mem@club.com', password_hash: hash, name: 'Mem' });
  await createEvent({ title: 'Doubles', description: 'Sport', date: inDays(2), organizer_id: org.id, total_places: 8 });
  await createEvent({ title: 'Club dinner', description: 'Food', date: inDays(3), organizer_id: org.id, total_places: 40, category: 'social' });

  const cookie = await signIn('mem@club.com');
  const res = await fetch(`${baseUrl}/api/events`, { headers: { cookie } });
  assert.equal(res.status, 200);
  const events = await res.json();
  const byTitle = Object.fromEntries(events.map((e) => [e.title, e.category]));
  assert.deepEqual(byTitle, { Doubles: 'sport', 'Club dinner': 'social' });
});

test('AC-33: the database refuses a category other than sport or social', async () => {
  const org = await createUser({ email: 'org2@club.com', password_hash: 'hash', role: 'organizer', name: 'Org' });
  await assert.rejects(
    () => createEvent({ title: 'Party', description: 'x', date: inDays(2), organizer_id: org.id, total_places: 10, category: 'party' }),
    (err) => err.code === '23514'
  );
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM events WHERE title = 'Party'");
  assert.equal(rows[0].n, 0);
});
