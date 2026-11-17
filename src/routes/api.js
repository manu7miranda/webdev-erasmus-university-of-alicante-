const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../services/authService');
const { getUpcomingEvents } = require('../services/eventService');
const { signUpForEvent, cancelRegistration, EventFull, AlreadySignedUp, EventNotFound, NotOwner } = require('../services/registrationService');

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

router.post('/events/:id/registrations', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const eventId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    const registration = await signUpForEvent(eventId, userId);
    res.status(201).json({
      id: registration.id,
      event_id: registration.event_id,
      user_id: registration.user_id,
      message: 'You are signed up',
    });
  } catch (error) {
    if (error instanceof EventFull) {
      return res.status(409).json({ error: 'EventFull', message: 'This event is full' });
    }
    if (error instanceof AlreadySignedUp) {
      return res.status(409).json({ error: 'AlreadySignedUp', message: 'You are already signed up' });
    }
    if (error instanceof EventNotFound) {
      return res.status(404).json({ error: 'EventNotFound', message: 'Event not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/registrations/:id', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const registrationId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    await cancelRegistration(registrationId, userId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotOwner) {
      return res.status(403).json({ error: 'NotOwner', message: 'You can only cancel your own sign-up' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
