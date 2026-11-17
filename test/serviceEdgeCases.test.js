const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const { createEvent } = require('../src/db/events');
const pool = require('../src/db/pool');
const { authenticateUser } = require('../src/services/authService');
const { getEvent } = require('../src/services/eventService');
const { suggestDescription } = require('../src/services/descriptionService');
const {
  signUpForEvent,
  cancelRegistration,
  EventNotFound,
  NotOwner,
} = require('../src/services/registrationService');

test.before(async () => {
  await setupTestDb();
});

test.after(async () => {
  await pool.end();
});

test.beforeEach(async () => {
  await clearDatabase();
});

async function makeEvent(totalPlaces = 5) {
  const organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', name: 'Org', role: 'organizer' });
  return createEvent({
    title: 'Edge Event',
    description: 'Edge',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: totalPlaces,
  });
}

test('sign-in without an email or a password returns null', async () => {
  assert.strictEqual(await authenticateUser('', 'secret123'), null);
  assert.strictEqual(await authenticateUser('a@club.com', ''), null);
});

test('sign-in with an email nobody has returns null', async () => {
  assert.strictEqual(await authenticateUser('nobody@club.com', 'secret123'), null);
});

test('a Google-only account (no password) cannot sign in with a password', async () => {
  await createUser({ email: 'google@club.com', password_hash: null, name: 'Google User' });
  assert.strictEqual(await authenticateUser('google@club.com', 'anything'), null);
});

test('a correct sign-in never returns the password hash', async () => {
  const hash = await bcrypt.hash('secret123', 10);
  await createUser({ email: 'bob@club.com', password_hash: hash, name: 'Bob' });
  const user = await authenticateUser('bob@club.com', 'secret123');
  assert.strictEqual(user.name, 'Bob');
  assert.strictEqual(user.password_hash, undefined);
});

test('getEvent returns an event with its free places, and nothing for an unknown id', async () => {
  const event = await makeEvent(5);
  const found = await getEvent(event.id);
  assert.strictEqual(found.title, 'Edge Event');
  assert.strictEqual(found.free_places, 5);
  assert.strictEqual(await getEvent(999999), undefined);
});

test('a model answer that is not text gives the fallback', async () => {
  const result = await suggestDescription('notes', { client: { generate: async () => 42 } });
  assert.strictEqual(result.suggestion, null);
});

test('signing up for an event that does not exist throws EventNotFound', async () => {
  const member = await createUser({ email: 'mem@club.com', password_hash: 'hash', name: 'Member' });
  await assert.rejects(() => signUpForEvent(999999, member.id), (err) => err instanceof EventNotFound);
});

test.skip('cancelling a registration that does not exist throws NotOwner', async () => {
  const member = await createUser({ email: 'mem@club.com', password_hash: 'hash', name: 'Member' });
  await assert.rejects(() => cancelRegistration(999999, member.id), (err) => err instanceof NotOwner);
});