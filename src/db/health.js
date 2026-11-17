const pool = require('./pool');

async function pingDatabase() {
  await pool.query('SELECT 1');
}

module.exports = { pingDatabase };
