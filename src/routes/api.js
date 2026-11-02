const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../services/authService');
const { getUpcomingEvents } = require('../services/eventService');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session error' });
      }
      req.session.user = user;
      req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).json({ error: 'Session error' });
        }
        res.json({ name: user.name, role: user.role });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout error' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ name: req.session.user.name, role: req.session.user.role });
});

router.get('/events', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const events = await getUpcomingEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
