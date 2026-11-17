const { listUpcomingEvents } = require('../db/events');

async function getUpcomingEvents(userId) {
  const events = await listUpcomingEvents(userId);
  return events;
}

module.exports = {
  getUpcomingEvents,
};
