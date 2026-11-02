const pool = require('./pool');

async function createEventsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TIMESTAMPTZ NOT NULL,
      organizer_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
      total_places INTEGER NOT NULL CHECK (total_places > 0)
    );
  `);
}

async function createEvent({ title, description, date, organizer_id, total_places }) {
  const result = await pool.query(
    `INSERT INTO events (title, description, date, organizer_id, total_places)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, date, organizer_id, total_places`,
    [title, description, date, organizer_id, total_places]
  );
  return result.rows[0];
}

async function listUpcomingEvents() {
  const result = await pool.query(
    `SELECT id, title, description, date, organizer_id, total_places, total_places AS free_places
     FROM events
     WHERE date >= NOW()
     ORDER BY date ASC`
  );
  return result.rows;
}

async function getEventById(id) {
  const result = await pool.query(
    `SELECT id, title, description, date, organizer_id, total_places, total_places AS free_places
     FROM events
     WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

module.exports = {
  createEventsTable,
  createEvent,
  listUpcomingEvents,
  getEventById,
};
