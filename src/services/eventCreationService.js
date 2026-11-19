const { createEvent } = require('../db/events');

class NotOrganizer extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotOrganizer';
  }
}

class InvalidEvent extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidEvent';
  }
}

const CATEGORIES = ['sport', 'social'];

// SPEC.md slice 7: the rules for a new event live here, not in the route,
// so every way in (API today, MCP tomorrow) gets the same checks.
async function createNewEvent(user, input) {
  if (user.role !== 'organizer') {
    throw new NotOrganizer('Only organizers can create events.');
  }
  const data = input || {};

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (title === '' || title.length > 100) {
    throw new InvalidEvent('The title is required and can have at most 100 characters.');
  }

  const date = new Date(data.date);
  if (typeof data.date !== 'string' || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    throw new InvalidEvent('The date must be a valid date in the future.');
  }

  const places = data.total_places;
  if (!Number.isInteger(places) || places < 1 || places > 500) {
    throw new InvalidEvent('Places must be a whole number from 1 to 500.');
  }

  if (!CATEGORIES.includes(data.category)) {
    throw new InvalidEvent('The type must be sport or social.');
  }

  let description = null;
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string' || data.description.length > 500) {
      throw new InvalidEvent('The description can have at most 500 characters.');
    }
    description = data.description.trim() || null;
  }

  return createEvent({
    title,
    description,
    date,
    organizer_id: user.id,
    total_places: places,
    category: data.category,
  });
}

module.exports = { createNewEvent, NotOrganizer, InvalidEvent };
