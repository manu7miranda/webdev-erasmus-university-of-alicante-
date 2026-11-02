const { listUpcomingEvents } = require('../db/events');

async function getUpcomingEvents() {
  const events = await listUpcomingEvents();
  return events;
}

module.exports = {
  getUpcomingEvents,
};
