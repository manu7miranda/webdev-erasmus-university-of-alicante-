const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/login.html'), (err) => {
    if (err) {
      res.status(404).send('Login page not found');
    }
  });
});

router.get('/events', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect(302, '/login');
  }
  res.sendFile(path.join(__dirname, '../../public/events.html'), (err) => {
    if (err) {
      res.status(404).send('Events page not found');
    }
  });
});

module.exports = router;
