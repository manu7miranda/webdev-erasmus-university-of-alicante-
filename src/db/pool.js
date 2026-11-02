const { Pool } = require('pg');

// One shared connection pool; the URL comes from the environment, never from the code.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
