// Usage: npm run mcp-token -- member@club.com
// Prints a new MCP token once; only its hash is stored. Put it in .env as MCP_TOKEN.
const { findUserByEmail } = require('../src/db/users');
const { createMcpToken } = require('../src/services/mcpAuthService');
const pool = require('../src/db/pool');

(async () => {
  const user = await findUserByEmail(process.argv[2]);
  if (!user) throw new Error('No user with that email');
  console.log(await createMcpToken(user.id));
  await pool.end();
})();
