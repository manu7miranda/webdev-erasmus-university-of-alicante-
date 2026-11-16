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
    `SELECT e.id, e.title, e.description, e.date, e.organizer_id, e.total_places,
            (e.total_places - COUNT(r.id))::int AS free_places
     FROM events e
     LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.date >= NOW()
     GROUP BY e.id
     ORDER BY e.date ASC`
  );
  return result.rows;
}

async function getEventById(id) {
  const result = await pool.query(
    `SELECT e.id, e.title, e.description, e.date, e.organizer_id, e.total_places,
            (e.total_places - COUNT(r.id))::int AS free_places
     FROM events e
     LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.id = $1
     GROUP BY e.id`,
    [id]
  );
  return result.rows[0];
}

async function lockEventById(eventId, db = pool) {
  const result = await db.query(
    `SELECT id, title, date, organizer_id, total_places
     FROM events
     WHERE id = $1
     FOR UPDATE`,
    [eventId]
  );
  return result.rows[0];
}

module.exports = {
  createEventsTable,
  createEvent,
  listUpcomingEvents,
  getEventById,
  lockEventById,
};
