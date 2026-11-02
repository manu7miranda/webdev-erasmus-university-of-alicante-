const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail, createUsersTable } = require('./users');
const { createEvent, listUpcomingEvents, createEventsTable } = require('./events');
const pool = require('./pool');

async function seed() {
  try {
    console.log('Seeding database...');
    
    // Ensure tables exist just in case
    await createUsersTable();
    await createEventsTable();

    // 1. Seed users (one organizer, one member)
    const organizerEmail = 'organizer@club.com';
    let organizer = await findUserByEmail(organizerEmail);
    if (!organizer) {
      const passwordHash = await bcrypt.hash('secret123', 10);
      organizer = await createUser({
        email: organizerEmail,
        password_hash: passwordHash,
        role: 'organizer',
        name: 'Organizer Alice',
      });
      console.log('Created organizer:', organizer.email);
    } else {
      console.log('Organizer already exists:', organizer.email);
    }

    const memberEmail = 'member@club.com';
    let member = await findUserByEmail(memberEmail);
    if (!member) {
      const passwordHash = await bcrypt.hash('secret123', 10);
      member = await createUser({
        email: memberEmail,
        password_hash: passwordHash,
        role: 'member',
        name: 'Member Bob',
      });
      console.log('Created member:', member.email);
    } else {
      console.log('Member already exists:', member.email);
    }

    // 2. Seed events (3 upcoming, 1 past) if events table is empty
    const existingEventsResult = await pool.query('SELECT COUNT(*) FROM events');
    const eventCount = parseInt(existingEventsResult.rows[0].count, 10);

    if (eventCount === 0) {
      const now = new Date();
      
      // Past event (10 days ago)
      const pastDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      await createEvent({
        title: 'Past Tennis Tournament',
        description: 'An exciting tournament that took place last week.',
        date: pastDate,
        organizer_id: organizer.id,
        total_places: 16,
      });

      // Upcoming event 1 (in 3 days)
      const upcomingDate1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      await createEvent({
        title: 'Weekend Doubles Championship',
        description: 'Bring your partner for a fast-paced doubles tournament.',
        date: upcomingDate1,
        organizer_id: organizer.id,
        total_places: 12,
      });

      // Upcoming event 2 (in 7 days)
      const upcomingDate2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await createEvent({
        title: 'Midweek Singles Ladder',
        description: 'Test your singles skills against club members.',
        date: upcomingDate2,
        organizer_id: organizer.id,
        total_places: 8,
      });

      // Upcoming event 3 (in 14 days)
      const upcomingDate3 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      await createEvent({
        title: 'Beginner Coaching Clinic',
        description: 'Learn the basics of serves and volleys with coach Alice.',
        date: upcomingDate3,
        organizer_id: organizer.id,
        total_places: 20,
      });

      console.log('Seeded 4 events (3 upcoming, 1 past).');
    } else {
      console.log('Events already exist');
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
