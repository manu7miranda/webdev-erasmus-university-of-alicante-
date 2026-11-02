# Club Events · Tennis Club

<!-- Exercise 2. Write the non-goals first. Every acceptance criterion must be checkable in under a minute.
     Keep these headings exactly as they are: the self-checks look for them by name.
     The full target is on the course site under Resources → The course project. -->

## Project option
Club events

## Goals
A member signs is: can see the upcoming events and can signs for an event that has places.
An organizer creates an event with limited places and can see who signed up.
A member who signed up for a event, can rate the event from 1 to 5 stars and give a short comment after the events.
When an event is full, the member can joins to the waiting list. If some member cancels, the first member of the waiting list will receive an email with the place and two options: Accept/Decline. He has 3 hours to accept or refuse the place. If they decline or do not answer, the place is offered to the next member.

## Non-goals
No payments in the website: Members pays the members monthly payment outside the web.
No mobile app: pleople use the website in a browser.
Only one club: the website manages only one club.

## Constraints
Nose.js with Express in the backend, PostgreSQL as the database, and plain HTML, CSS and JavaScript in the frontend.
Passwords are stored only as a Has, never as readable text.

## The model feature
<!-- Which model, which modality, and what it does for a user.
     Name three things or the check fails: the input it receives, the output it produces,
     and what happens when the model is slow, rate-limited or wrong. -->
- Model: Gemini (gemini-3.8-flash) through the Gemini API, with the key in GEMINI_API_KEY.
- Input: the short notes an organizer writes when creating an event (for example "5-a-side football, Saturday 10:00, bring water"), plus the title and date.
- Output: a suggested event description of at most 80 words, shown in the description field. The organizer can edit it or discard it before saving; nothing is saved without their click.
- Failure plan: if the model does not answer in 10 seconds, returns an error or hits a rate limit, the organizer sees "Suggestion not available, write the description yourself", and the form keeps working with an empty description field. If the suggestion is wrong, the organizer edits it by hand. Creating an event never depends on the model.
- Privacy: only the organizer's notes, the title and the date are sent to the model; no member names or emails.

## Auth
<!-- Local sign-in plus at least one provider. Say how an account signing in both ways stays one account. -->
- Local sign-in: email and password. Passwords are stored only as a bcrypt hash; to sign in, the app hashes what the user types and compares it with the stored hash.
- Provider: Google sign-in (OAuth), with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET kept in Codespaces secrets.
- Account linking: one person is one row in `users`. When someone signs in with Google and Google confirms the email is verified, the app looks for a user with that email: if one exists, it saves the Google id on that row and signs them in to the same account; if not, it creates a new member.
- Roles: `member` and `organizer`, stored in `users.role`. Only organizers can create events and see who signed up.

## MCP tools
<!-- At least three tools your own MCP server exposes over this project's data.
     Each tool calls the same service functions the HTTP API calls, so the same rules apply.
     A description shorter than 20 characters is not a description. -->
| Tool | Description |
| --- | --- |
| list_upcoming_events | Lists the upcoming events with their id, title, date, total places and free places. |
| get_event | Given an event id, returns its title, date, description, free places and how many members are on the waiting list. |
| get_event_ratings | Given an event id, returns its average rating and the number of ratings, without member names. |

## UI
<!-- Stack, and the three or more screens. The graded checklist lives in docs/UI.md. -->
- Stack: plain HTML, CSS and JavaScript served by Express; no framework.
- Screens: sign-in, events list, event detail (sign up, join the waiting list, rate), create event (organizers only), offer confirmation (the page the email link opens).
- Each screen has its four states: loading, empty, error and with data. The checklist lives in docs/UI.md.

## Architecture
<!-- Exercise 3. One request traced through every layer, naming the file for each one,
     plus one place where your own code does not match this layering. -->

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->

### Sign-up and roles
- [AC-1] A member who signs up for an event with free places sees "You are signed up", one new row appears in `registrations`, and the free places go down by one.
- [AC-2] A member who signs up for an event with no free places sees "This event is full", and no new row appears in `registrations`.
- [AC-3] A member who is already signed up and tries again sees "You are already signed up", and no duplicate row appears in `registrations`.
- [AC-4] An organizer creates an event with 20 places, and it appears in the list with 20 free places.
- [AC-5] A member who is not an organizer and sends a request to create an event gets a 403 error, and no new row appears in `events`.
- [AC-6] An organizer opens one of their events and sees the names of the members signed up.

### Waiting list
- [AC-7] A member who joins the waiting list of a full event sees their position, for example "You are number 2 on the waiting list".
- [AC-8] When a signed-up member cancels, the first member on the waiting list receives an email with an Accept and a Decline link.
- [AC-9] A member who opens the Accept link sees a page with a Confirm button, and the row in `registrations` is only created after they click Confirm.
- [AC-10] A member who opens an offer link a second time, or after it has expired, sees "This link is no longer valid", and nothing changes in the database.
- [AC-11] When the offered member declines or the offer expires, the next member on the waiting list receives the offer.
- [AC-12] When the email service fails, the registration or offer is still saved, and the error is written to the server log.
- [AC-13] When a place is offered less than 2 hours before the event starts, the offer expires when the event starts.

### Ratings
- [AC-14] A member who signed up for a past event gives it 4 stars and a comment, and the rating appears on the event page.
- [AC-15] A member who tries to rate an event that has not happened yet, or that they did not sign up for, sees "You can only rate events you attended", and no new row appears in `ratings`.

### Slice 1: sign-in and the upcoming events list
- [AC-16] A member who signs in with the correct email and password lands on the events list and sees their name at the top.
- [AC-17] A member who signs in with a wrong password sees "Wrong email or password", stays on the sign-in page and gets no session.
- [AC-18] A visitor without a session who opens /events is redirected to /login, and a request to /api/events without a session gets 401.
- [AC-19] A signed-in member sees only upcoming events from the `events` table, ordered by date, each with its title, its date and start time in hours and minutes (no seconds), and its free places.
- [AC-20] When one event row is deleted from the `events` table, a signed-in member who reloads /events no longer sees that event.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-1 |  |

## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->
- Passed: AC-16 sign-in with the seeded member shows "Welcome, Member Bob"; AC-17 a wrong password shows "Wrong email or password" and gives no session; AC-18 /events without a session redirects to /login (302) and /api/events returns 401, and /events.html cannot be opened directly; AC-19 the list shows only the three upcoming events from the `events` table, ordered by date; AC-20 deleting an event row and reloading /events removes it.
- Missed or reinterpreted: the first plan stored free places as a column, made password_hash NOT NULL (which breaks Google-only accounts) and redirected the API instead of returning 401; it added a registrations table, a deleteEvent function and ON DELETE CASCADE nobody asked for; app.js fell back to a hard-coded session secret and served the whole public/ folder, so /events.html skipped the sign-in check; the seed duplicated events when run twice; and the list showed times with seconds, because AC-19 only said "date".
- Changed: AC-19 now says the date and start time are shown in hours and minutes, with no seconds, and the events page was changed to match.
