// Required variables are checked before anything else loads, so a missing one
// stops the app at once with a message naming it, instead of a stack trace later.
const REQUIRED = ['DATABASE_URL', 'SESSION_SECRET'];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`missing ${missing.join(', ')}: see .env.example`);
  process.exit(1);
}
console.log(`database host: ${new URL(process.env.DATABASE_URL).hostname}`);
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// In a container the app is process 1 and Node ignores Ctrl+C and Render's stop signal
// unless it handles them: exit cleanly instead of being killed after a timeout.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => process.exit(0));
}
