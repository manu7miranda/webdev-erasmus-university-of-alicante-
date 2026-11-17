// Required variables are checked before anything else loads, so a missing one
// stops the app at once with a message naming it, instead of a stack trace later.
const REQUIRED = ['DATABASE_URL', 'SESSION_SECRET'];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`missing ${missing.join(', ')}: see .env.example`);
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
