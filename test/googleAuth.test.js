const test = require('node:test');
const assert = require('node:assert');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const pool = require('../src/db/pool');
const { signInWithGoogle, EmailNotVerified } = require('../src/services/googleAuthService');

async function countUsers(email) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE email = $1', [email]);
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
});

test('AC-28: a verified Google email that is not in users creates one new member', async () => {
  const user = await signInWithGoogle({ googleId: 'g-1', email: 'new@club.com', emailVerified: true, name: 'New Person' });
  assert.equal(user.role, 'member');
  assert.equal(user.google_id, 'g-1');
  assert.equal(user.name, 'New Person');
  assert.equal(await countUsers('new@club.com'), 1);
});

test('AC-28: a new Google member without a name gets the email as name', async () => {
  const user = await signInWithGoogle({ googleId: 'g-3', email: 'noname@club.com', emailVerified: true });
  assert.equal(user.name, 'noname@club.com');
});

test('AC-29: a verified Google email that already exists signs in to the same row and saves the Google id', async () => {
  const existing = await createUser({ email: 'member@club.com', password_hash: 'hash', name: 'Member' });
  const user = await signInWithGoogle({ googleId: 'g-2', email: 'member@club.com', emailVerified: true, name: 'Other' });
  assert.equal(user.id, existing.id);
  assert.equal(user.google_id, 'g-2');
  assert.equal(await countUsers('member@club.com'), 1);
});

test('AC-29: signing in again with the same Google account returns the same row', async () => {
  const first = await signInWithGoogle({ googleId: 'g-4', email: 'again@club.com', emailVerified: true, name: 'Again' });
  const second = await signInWithGoogle({ googleId: 'g-4', email: 'again@club.com', emailVerified: true, name: 'Again' });
  assert.equal(second.id, first.id);
  assert.equal(await countUsers('again@club.com'), 1);
});

test('AC-30: a Google account whose email is not verified is refused and no row is created', async () => {
  await assert.rejects(
    () => signInWithGoogle({ googleId: 'g-5', email: 'fake@club.com', emailVerified: false, name: 'Fake' }),
    (err) => err instanceof EmailNotVerified
  );
  assert.equal(await countUsers('fake@club.com'), 0);
});