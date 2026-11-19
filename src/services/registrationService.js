const pool = require('../db/pool');
const { lockEventById } = require('../db/events');
const {
  createRegistration,
  getRegistrationById,
  getRegistrationByEventAndUser,
  deleteRegistration,
  countRegistrationsForEvent,
} = require('../db/registrations');

class EventFull extends Error {
  constructor(message) {
    super(message);
    this.name = 'EventFull';
  }
}

class AlreadySignedUp extends Error {
  constructor(message) {
    super(message);
    this.name = 'AlreadySignedUp';
  }
}

class NotOwner extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotOwner';
  }
}

class EventNotFound extends Error {
  constructor(message) {
    super(message);
    this.name = 'EventNotFound';
  }
}

// Ids are INTEGER columns: anything else would reach the database and give a 500 (AC-38).
function isValidId(id) {
  return Number.isInteger(id) && id >= 1 && id <= 2147483647;
}

async function signUpForEvent(eventId, userId) {
  if (!isValidId(eventId)) {
    throw new EventNotFound('Event not found');
  }
  const client = await pool.connect();
  let registration;
  try {
    await client.query('BEGIN');
    const event = await lockEventById(eventId, client);
    if (!event) {
      throw new EventNotFound('Event not found');
    }
    const existingRegistration = await getRegistrationByEventAndUser(eventId, userId, client);
    if (existingRegistration) {
      throw new AlreadySignedUp('Already signed up for this event');
    }
    const count = await countRegistrationsForEvent(eventId, client);
    if (count >= event.total_places) {
      throw new EventFull('Event is full');
    }
    registration = await createRegistration(eventId, userId, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return registration;
}

async function cancelRegistration(registrationId, userId) {
  if (!isValidId(registrationId)) {
    throw new NotOwner('Not the owner of this registration');
  }
  const registration = await getRegistrationById(registrationId);
  if (!registration || registration.user_id !== userId) {
    throw new NotOwner('Not the owner of this registration');
  }
  return await deleteRegistration(registrationId);
}

module.exports = {
  signUpForEvent,
  cancelRegistration,
  EventFull,
  AlreadySignedUp,
  NotOwner,
  EventNotFound,
};
