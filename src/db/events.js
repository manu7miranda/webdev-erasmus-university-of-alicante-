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

// Added after the events table existed, so it is a new step, not an edit of the old one.
async function addEventCategoryColumn() {
  await pool.query(`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'sport'
    CHECK (category IN ('sport', 'social'));
  `);
}

async function createEvent({ title, description, date, organizer_id, total_places, category = 'sport' }) {
  const result = await pool.query(
    `INSERT INTO events (title, description, date, organizer_id, total_places, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, description, date, organizer_id, total_places, category`,
    [title, description, date, organizer_id, total_places, category]
  );
  return result.rows[0];
}

async function listUpcomingEvents(userId) {
  const result = await pool.query(
    `SELECT e.id, e.title, e.description, e.date, e.organizer_id, e.total_places, e.category,
            (e.total_places - COUNT(r.id))::int AS free_places,
            MAX(CASE WHEN r.user_id = $1 THEN r.id END) AS my_registration_id
     FROM events e
     LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.date >= NOW()
     GROUP BY e.id
     ORDER BY e.date ASC`,
    [userId]
  );
  return result.rows;
}

async function getEventById(id) {
  const result = await pool.query(
    `SELECT e.id, e.title, e.description, e.date, e.organizer_id, e.total_places, e.category,
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
  addEventCategoryColumn,
  createEvent,
  listUpcomingEvents,
  getEventById,
  lockEventById,
};
