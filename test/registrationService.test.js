const test = require('node:test');
const assert = require('node:assert');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const { createEvent, getEventById } = require('../src/db/events');
const { countRegistrationsForEvent, getRegistrationById } = require('../src/db/registrations');
const pool = require('../src/db/pool');
const {
  signUpForEvent,
  cancelRegistration,
  EventFull,
  AlreadySignedUp,
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

test('AC-1 sign-up works and free places go down by one', async () => {
  const organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: 'hash', name: 'Member' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 2,
  });

  const registration = await signUpForEvent(event.id, member.id);
  assert.ok(registration);
  assert.strictEqual(registration.event_id, event.id);
  assert.strictEqual(registration.user_id, member.id);

  const updatedEvent = await getEventById(event.id);
  assert.strictEqual(updatedEvent.free_places, 1);
});

test('AC-2 a full event throws EventFull', async () => {
  const organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', name: 'Org' });
  const member1 = await createUser({ email: 'mem1@club.com', password_hash: 'hash', name: 'Member 1' });
  const member2 = await createUser({ email: 'mem2@club.com', password_hash: 'hash', name: 'Member 2' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 1,
  });

  await signUpForEvent(event.id, member1.id);

  await assert.rejects(
    async () => {
      await signUpForEvent(event.id, member2.id);
    },
    (err) => {
      assert.ok(err instanceof EventFull);
      return true;
    }
  );
  assert.strictEqual((await getEventById(event.id)).free_places, 0);
});

test('AC-3 a second sign-up throws AlreadySignedUp', async () => {
  const organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: 'hash', name: 'Member' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 5,
  });

  await signUpForEvent(event.id, member.id);

  await assert.rejects(
    async () => {
      await signUpForEvent(event.id, member.id);
    },
    (err) => {
      assert.ok(err instanceof AlreadySignedUp);
      return true;
    }
  );
  assert.strictEqual(await countRegistrationsForEvent(event.id), 1);
});

test('AC-21 cancelling your own sign-up removes the row', async () => {
  const organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', name: 'Org' });
  const member = await createUser({ email: 'mem@club.com', password_hash: 'hash', name: 'Member' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 2,
  });

  const registration = await signUpForEvent(event.id, member.id);
  await cancelRegistration(registration.id, member.id);

  const updatedEvent = await getEventById(event.id);
  assert.strictEqual(updatedEvent.free_places, 2);
});

test('AC-22 cancelling someone else is throws NotOwner', async () => {
  const organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', name: 'Org' });
  const member1 = await createUser({ email: 'mem1@club.com', password_hash: 'hash', name: 'Member 1' });
  const member2 = await createUser({ email: 'mem2@club.com', password_hash: 'hash', name: 'Member 2' });
  const event = await createEvent({
    title: 'Tennis Match',
    description: 'Fun match',
    date: new Date(Date.now() + 86400000),
    organizer_id: organizer.id,
    total_places: 2,
  });

  const registration = await signUpForEvent(event.id, member1.id);

  await assert.rejects(
    async () => {
      await cancelRegistration(registration.id, member2.id);
    },
    (err) => {
      assert.ok(err instanceof NotOwner);
      return true;
    }
  );
  assert.ok(await getRegistrationById(registration.id));
});
