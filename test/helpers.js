const { Pool } = require('pg');
const { createUsersTable } = require('../src/db/users');
const { createEventsTable } = require('../src/db/events');
const { createRegistrationsTable } = require('../src/db/registrations');

function validateTestDbUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required for tests');
  }
  const urlObj = new URL(dbUrl);
  const dbName = urlObj.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Safety guard error: Database name "${dbName}" does not end with "_test". Tests can only run on test databases.`);
  }
  return dbName;
}

async function setupTestDb() {
  const dbName = validateTestDbUrl();
  const dbUrl = process.env.DATABASE_URL;

  // Connect to postgres default db to create club_test if missing
  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = '/postgres';
  const adminPool = new Pool({ connectionString: adminUrl.toString() });

  try {
    const res = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await adminPool.end();
  }

  // Now run migrations on club_test
  await createUsersTable();
  await createEventsTable();
  await createRegistrationsTable();
}

async function clearDatabase() {
  validateTestDbUrl();
  const pool = require('../src/db/pool');
  await pool.query('TRUNCATE registrations, events, users RESTART IDENTITY CASCADE;');
}

module.exports = {
  setupTestDb,
  clearDatabase,
};
