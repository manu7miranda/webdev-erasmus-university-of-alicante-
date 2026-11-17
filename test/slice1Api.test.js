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

test('AC-16 sign-in with the right password returns 200, and GET /api/me with that cookie returns the member\'s name', async () => {
  const passwordHash = await bcrypt.hash('secret123', 10);
  await createUser({ email: 'alice@club.com', password_hash: passwordHash, name: 'Alice' });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@club.com', password: 'secret123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  const cookie = loginRes.headers.get('set-cookie');

  const meRes = await fetch(`${baseUrl}/api/me`, {
    headers: { 'Cookie': cookie },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.name, 'Alice');
});

test('AC-17 a wrong password returns 401 with error "Wrong email or password", and GET /api/me with any cookie it set returns 401', async () => {
  const passwordHash = await bcrypt.hash('secret123', 10);
  await createUser({ email: 'alice@club.com', password_hash: passwordHash, name: 'Alice' });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@club.com', password: 'wrong' }),
  });
  assert.strictEqual(loginRes.status, 401);
  const data = await loginRes.json();
  assert.strictEqual(data.error, 'Wrong email or password');
  const cookie = loginRes.headers.get('set-cookie');

  const meRes = await fetch(`${baseUrl}/api/me`, {
    headers: cookie ? { 'Cookie': cookie } : {},
  });
  assert.strictEqual(meRes.status, 401);
});

test('AC-18 GET /events without a session answers 302 with Location /login (use redirect: \'manual\' in fetch), and GET /api/events returns 401', async () => {
  const pageRes = await fetch(`${baseUrl}/events`, {
    redirect: 'manual',
  });
  assert.strictEqual(pageRes.status, 302);
  const location = pageRes.headers.get('location');
  assert.ok(location.endsWith('/login'));

  const apiRes = await fetch(`${baseUrl}/api/events`);
  assert.strictEqual(apiRes.status, 401);
});

test('AC-19 GET /api/events returns only upcoming events, ordered by date, each with title, date and free_places; a past event is not in the list', async () => {
  const passwordHash = await bcrypt.hash('secret123', 10);
  const org = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: passwordHash, name: 'Member' });

  const pastDate = new Date(Date.now() - 86400000);
  const futureDate1 = new Date(Date.now() + 86400000);
  const futureDate2 = new Date(Date.now() + 172800000);

  await createEvent({ title: 'Past Event', description: 'Past', date: pastDate, organizer_id: org.id, total_places: 10 });
  const event2 = await createEvent({ title: 'Future Event 2', description: 'Fut 2', date: futureDate2, organizer_id: org.id, total_places: 5 });
  const event1 = await createEvent({ title: 'Future Event 1', description: 'Fut 1', date: futureDate1, organizer_id: org.id, total_places: 8 });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'secret123' }),
  });
  const cookie = loginRes.headers.get('set-cookie');

  const res = await fetch(`${baseUrl}/api/events`, {
    headers: { 'Cookie': cookie },
  });
  assert.strictEqual(res.status, 200);
  const events = await res.json();

  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[0].title, 'Future Event 1');
  assert.strictEqual(events[1].title, 'Future Event 2');

  for (const ev of events) {
    assert.ok(ev.title);
    assert.ok(ev.date);
    assert.strictEqual(typeof ev.free_places, 'number');
  }
});

test('AC-20 after deleting an event row from the events table, GET /api/events no longer returns it', async () => {
  const passwordHash = await bcrypt.hash('secret123', 10);
  const org = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: passwordHash, name: 'Member' });

  const futureDate = new Date(Date.now() + 86400000);
  const event = await createEvent({ title: 'Transient Event', description: 'Trans', date: futureDate, organizer_id: org.id, total_places: 5 });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'secret123' }),
  });
  const cookie = loginRes.headers.get('set-cookie');

  const res1 = await fetch(`${baseUrl}/api/events`, {
    headers: { 'Cookie': cookie },
  });
  const events1 = await res1.json();
  assert.strictEqual(events1.length, 1);

  await pool.query('DELETE FROM events WHERE id = $1', [event.id]);

  const res2 = await fetch(`${baseUrl}/api/events`, {
    headers: { 'Cookie': cookie },
  });
  const events2 = await res2.json();
  assert.strictEqual(events2.length, 0);
});
