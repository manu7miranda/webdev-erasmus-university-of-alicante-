const { createUsersTable } = require('./users');
const { createEventsTable } = require('./events');
const pool = require('./pool');

async function migrate() {
  try {
    console.log('Running migrations...');
    await createUsersTable();
    await createEventsTable();
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
