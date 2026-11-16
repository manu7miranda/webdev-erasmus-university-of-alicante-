const pool = require('./pool');

async function createRegistrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      UNIQUE (event_id, user_id)
    );
  `);
}

async function createRegistration(event_id, user_id, db = pool) {
  const result = await db.query(
    `INSERT INTO registrations (event_id, user_id)
     VALUES ($1, $2)
     RETURNING id, event_id, user_id`,
    [event_id, user_id]
  );
  return result.rows[0];
}

async function getRegistrationById(id, db = pool) {
  const result = await db.query(
    `SELECT id, event_id, user_id FROM registrations WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function getRegistrationByEventAndUser(event_id, user_id, db = pool) {
  const result = await db.query(
    `SELECT id, event_id, user_id FROM registrations WHERE event_id = $1 AND user_id = $2`,
    [event_id, user_id]
  );
  return result.rows[0];
}

async function deleteRegistration(id, db = pool) {
  const result = await db.query(
    `DELETE FROM registrations WHERE id = $1 RETURNING id, event_id, user_id`,
    [id]
  );
  return result.rows[0];
}

async function countRegistrationsForEvent(event_id, db = pool) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = $1`,
    [event_id]
  );
  return result.rows[0].count;
}

module.exports = {
  createRegistrationsTable,
  createRegistration,
  getRegistrationById,
  getRegistrationByEventAndUser,
  deleteRegistration,
  countRegistrationsForEvent,
};
