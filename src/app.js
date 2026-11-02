const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use('/api', apiRoutes);
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.use('/', pageRoutes);

app.get('/', (req, res) => {
  res.redirect(302, '/events');
});

module.exports = app;
