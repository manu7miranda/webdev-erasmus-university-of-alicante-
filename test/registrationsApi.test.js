const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const { createEvent, getEventById } = require('../src/db/events');
const { countRegistrationsForEvent } = require('../src/db/registrations');
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

test('AC-1 a signed-in member gets 201', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const organizer = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: passwordHash, name: 'Member' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 2,
  });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'password123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  const cookie = loginRes.headers.get('set-cookie');

  const res = await fetch(`${baseUrl}/api/events/${event.id}/registrations`, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
    },
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data);
  assert.strictEqual(data.event_id, event.id);
  assert.strictEqual(data.user_id, member.id);

  assert.strictEqual(await countRegistrationsForEvent(event.id), 1);
  const updatedEvent = await getEventById(event.id);
  assert.strictEqual(updatedEvent.free_places, 1);
});

test('AC-2 a full event gets 409', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const organizer = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const member1 = await createUser({ email: 'mem1@club.com', password_hash: passwordHash, name: 'Member 1' });
  const member2 = await createUser({ email: 'mem2@club.com', password_hash: passwordHash, name: 'Member 2' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 1,
  });

  const loginRes1 = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem1@club.com', password: 'password123' }),
  });
  const cookie1 = loginRes1.headers.get('set-cookie');
  await fetch(`${baseUrl}/api/events/${event.id}/registrations`, {
    method: 'POST',
    headers: { 'Cookie': cookie1 },
  });

  const loginRes2 = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem2@club.com', password: 'password123' }),
  });
  const cookie2 = loginRes2.headers.get('set-cookie');
  const res = await fetch(`${baseUrl}/api/events/${event.id}/registrations`, {
    method: 'POST',
    headers: { 'Cookie': cookie2 },
  });

  assert.strictEqual(res.status, 409);
  const data = await res.json();
  assert.strictEqual(data.error, 'EventFull');
  assert.strictEqual(await countRegistrationsForEvent(event.id), 1);
});

test('AC-3 a second sign-up gets 409', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const organizer = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: passwordHash, name: 'Member' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 5,
  });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'password123' }),
  });
  const cookie = loginRes.headers.get('set-cookie');

  await fetch(`${baseUrl}/api/events/${event.id}/registrations`, {
    method: 'POST',
    headers: { 'Cookie': cookie },
  });

  const res = await fetch(`${baseUrl}/api/events/${event.id}/registrations`, {
    method: 'POST',
    headers: { 'Cookie': cookie },
  });

  assert.strictEqual(res.status, 409);
  const data = await res.json();
  assert.strictEqual(data.error, 'AlreadySignedUp');
  assert.strictEqual(await countRegistrationsForEvent(event.id), 1);
});

test('AC-23 without a session it gets 401 and no row is added to registrations', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const organizer = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 5,
  });

  const res = await fetch(`${baseUrl}/api/events/${event.id}/registrations`, {
    method: 'POST',
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(await countRegistrationsForEvent(event.id), 0);
});
