const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');
const { pingDatabase } = require('./db/health');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const app = express();

// Render and the codespace put an https proxy in front of the app; trust it, so secure cookies work.
app.set('trust proxy', 1);

app.use(express.json());

// The API only reads JSON. A body in another format (text/plain, a form...) is the
// client's mistake: answer 415 before any route, instead of a 500 later (AC-34).
app.use('/api', (req, res, next) => {
  const hasBody = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (hasBody && !req.is('application/json')) {
    return res.status(415).json({ error: 'Send the body as JSON.' });
  }
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Health check for Render and for people: 200 when the app and the database work, 503 when the database does not answer.
app.get('/health', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    console.error('health check: database unreachable:', err.code || err.message, (err.errors || []).map((e) => `${e.code} ${e.address}`).join(', '));    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use('/api', apiRoutes);
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.use('/', pageRoutes);

app.get('/', (req, res) => {
  res.redirect(302, '/events');
});


// A page or route that does not exist: one short line, never a stack trace.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Any other error: the details go to the server log, the user gets one sentence.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
