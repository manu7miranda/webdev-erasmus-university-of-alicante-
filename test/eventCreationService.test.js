const test = require('node:test');
const assert = require('node:assert');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const pool = require('../src/db/pool');
const { createNewEvent, NotOrganizer, InvalidEvent } = require('../src/services/eventCreationService');

let organizer;
let member;

function inDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function valid(overrides = {}) {
  return { title: 'Club ladder', date: inDays(5), total_places: 16, category: 'sport', description: 'Bring water.', ...overrides };
}

async function countEvents() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM events');
  return rows[0].n;
}

test.before(async () => {
  await setupTestDb();
});

test.after(async () => {
  await pool.end();
});

test.beforeEach(async () => {
  await clearDatabase();
  organizer = await createUser({ email: 'org@club.com', password_hash: 'hash', role: 'organizer', name: 'Org' });
  member = await createUser({ email: 'mem@club.com', password_hash: 'hash', name: 'Mem' });
});

test('AC-35: an organizer creates an event with the values given, trimmed', async () => {
  const event = await createNewEvent(organizer, valid({ title: '  Club ladder  ', description: '  Bring water.  ', category: 'social' }));
  assert.equal(event.title, 'Club ladder');
  assert.equal(event.description, 'Bring water.');
  assert.equal(event.category, 'social');
  assert.equal(event.total_places, 16);
  assert.equal(event.organizer_id, organizer.id);
  assert.equal(await countEvents(), 1);
});

test('AC-35: the description is optional; empty or only spaces is stored as no description', async () => {
  assert.equal((await createNewEvent(organizer, valid({ description: undefined }))).description, null);
  assert.equal((await createNewEvent(organizer, valid({ description: null }))).description, null);
  assert.equal((await createNewEvent(organizer, valid({ description: '   ' }))).description, null);
});

test('AC-36: a member cannot create an event, and no row is created', async () => {
  await assert.rejects(() => createNewEvent(member, valid()), (err) => err instanceof NotOrganizer);
  assert.equal(await countEvents(), 0);
});

const badInputs = [
  ['no body at all', undefined],
  ['a title that is not text', valid({ title: 42 })],
  ['an empty title', valid({ title: '   ' })],
  ['a title longer than 100 characters', valid({ title: 'x'.repeat(101) })],
  ['a date that is not text', valid({ date: 123 })],
  ['a date that is not a date', valid({ date: 'next friday' })],
  ['a date in the past', valid({ date: inDays(-1) })],
  ['places that are not a whole number', valid({ total_places: 2.5 })],
  ['zero places', valid({ total_places: 0 })],
  ['more than 500 places', valid({ total_places: 501 })],
  ['an unknown type', valid({ category: 'party' })],
  ['a description that is not text', valid({ description: 7 })],
  ['a description longer than 500 characters', valid({ description: 'x'.repeat(501) })],
];

for (const [name, input] of badInputs) {
  test(`AC-37: ${name} is refused with InvalidEvent, and no row is created`, async () => {
    await assert.rejects(() => createNewEvent(organizer, input), (err) => err instanceof InvalidEvent && err.message.length > 0);
    assert.equal(await countEvents(), 0);
  });
}
