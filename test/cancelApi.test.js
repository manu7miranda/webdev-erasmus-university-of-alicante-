const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const { createEvent, getEventById } = require('../src/db/events');
const { signUpForEvent } = require('../src/services/registrationService');
const { getRegistrationById } = require('../src/db/registrations');
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

test('AC-21 a member cancels their own sign-up: 204, the row is gone and free places go back up', async () => {
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

  const registration = await signUpForEvent(event.id, member.id);

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem@club.com', password: 'password123' }),
  });
  const cookie = loginRes.headers.get('set-cookie');

  const res = await fetch(`${baseUrl}/api/registrations/${registration.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookie },
  });

  assert.strictEqual(res.status, 204);
  assert.strictEqual(await getRegistrationById(registration.id), undefined);
  const updatedEvent = await getEventById(event.id);
  assert.strictEqual(updatedEvent.free_places, 2);
});

test('AC-22 another signed-in member gets 403, error \'NotOwner\', and the row is still there', async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const organizer = await createUser({ email: 'org@club.com', password_hash: passwordHash, name: 'Org' });
  const member1 = await createUser({ email: 'mem1@club.com', password_hash: passwordHash, name: 'Member 1' });
  const member2 = await createUser({ email: 'mem2@club.com', password_hash: passwordHash, name: 'Member 2' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 2,
  });

  const registration = await signUpForEvent(event.id, member1.id);

  const loginRes2 = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mem2@club.com', password: 'password123' }),
  });
  const cookie2 = loginRes2.headers.get('set-cookie');

  const res = await fetch(`${baseUrl}/api/registrations/${registration.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookie2 },
  });

  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.error, 'NotOwner');
  assert.ok(await getRegistrationById(registration.id));
});

test('AC-23 without a session it gets 401 and the row is still there', async () => {
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

  const registration = await signUpForEvent(event.id, member.id);

  const res = await fetch(`${baseUrl}/api/registrations/${registration.id}`, {
    method: 'DELETE',
  });

  assert.strictEqual(res.status, 401);
  assert.ok(await getRegistrationById(registration.id));
});
