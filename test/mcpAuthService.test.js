const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { setupTestDb, clearDatabase } = require('./helpers');
const { createUser } = require('../src/db/users');
const { createMcpToken, authenticateMcpToken } = require('../src/services/mcpAuthService');
const pool = require('../src/db/pool');

test.before(async () => {
  await setupTestDb();
});

test.after(async () => {
  await pool.end();
});

test.beforeEach(async () => {
  await clearDatabase();
});

test('a created token authenticates as its user', async () => {
  const user = await createUser({ email: 'user@club.com', password_hash: 'hash', name: 'User' });
  const token = await createMcpToken(user.id);
  assert.ok(token);
  const authenticatedUser = await authenticateMcpToken(token);
  assert.ok(authenticatedUser);
  assert.strictEqual(authenticatedUser.id, user.id);
  assert.strictEqual(authenticatedUser.name, 'User');
  assert.strictEqual(authenticatedUser.role, 'member');
});

test('a wrong or empty token returns null', async () => {
  const user = await createUser({ email: 'user@club.com', password_hash: 'hash', name: 'User' });
  await createMcpToken(user.id);

  assert.strictEqual(await authenticateMcpToken('wrongtoken'), null);
  assert.strictEqual(await authenticateMcpToken(''), null);
  assert.strictEqual(await authenticateMcpToken(null), null);
  assert.strictEqual(await authenticateMcpToken(undefined), null);
});

test('the hash, not the token, is stored', async () => {
  const user = await createUser({ email: 'user@club.com', password_hash: 'hash', name: 'User' });
  const token = await createMcpToken(user.id);

  const res = await pool.query('SELECT mcp_token_hash FROM users WHERE id = $1', [user.id]);
  const dbUser = res.rows[0];
  assert.ok(dbUser.mcp_token_hash);
  assert.notStrictEqual(dbUser.mcp_token_hash, token);

  const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
  assert.strictEqual(dbUser.mcp_token_hash, expectedHash);
});
