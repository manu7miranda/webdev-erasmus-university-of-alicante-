const { listUpcomingEvents, getEventById } = require('../db/events');

async function getUpcomingEvents(userId) {
  const events = await listUpcomingEvents(userId);
  return events;
}

async function getEvent(eventId) {
  const event = await getEventById(eventId);
  return event;
}

module.exports = {
  getUpcomingEvents,
  getEvent,
};
