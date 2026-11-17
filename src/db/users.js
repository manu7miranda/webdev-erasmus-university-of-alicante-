const pool = require('./pool');

async function createUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'organizer')),
      google_id TEXT UNIQUE,
      name TEXT NOT NULL
    );
  `);
}

async function addMcpTokenHashColumn() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mcp_token_hash TEXT UNIQUE;
  `);
}

async function createUser({ email, password_hash, role = 'member', google_id = null, name }) {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, google_id, name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, role, google_id, name`,
    [email, password_hash, role, google_id, name]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, role, google_id, name FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

async function setMcpTokenHash(userId, hash) {
  await pool.query(
    `UPDATE users SET mcp_token_hash = $1 WHERE id = $2`,
    [hash, userId]
  );
}

async function findUserByMcpTokenHash(hash) {
  const result = await pool.query(
    `SELECT id, name, role FROM users WHERE mcp_token_hash = $1`,
    [hash]
  );
  return result.rows[0];
}

module.exports = {
  createUsersTable,
  addMcpTokenHashColumn,
  createUser,
  findUserByEmail,
  setMcpTokenHash,
  findUserByMcpTokenHash,
};
