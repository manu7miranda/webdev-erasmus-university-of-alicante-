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
- Model: Gemini (gemini-3.5-flash-lite) through the Gemini API, with the key in GEMINI_API_KEY.
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
| get_event | Given an event id, returns its title, date, description and free places. |
| sign_up_for_event | Signs the calling member up for an event by id, through the same service as the API; refuses a full event or a second sign-up. |

## UI
<!-- Stack, and the three or more screens. The graded checklist lives in docs/UI.md. -->
- Stack: plain HTML, CSS and JavaScript served by Express; no framework.
- Screens: sign-in, events list, event detail (sign up, join the waiting list, rate), create event (organizers only), offer confirmation (the page the email link opens).
- Each screen has its four states: loading, empty, error and with data. The checklist lives in docs/UI.md.

## Architecture
### One request: a member signs up for an event

**In the browser**
1. View: `public/events.html` with `public/assets/events.js` draws each event with a Sign up or a Cancel button. The page is rendered in the browser so the member never sees a blank page: it arrives at once with "Loading events...", and if the API fails it shows a clear message instead of an empty screen.
2. State: the list of events from `GET /api/events`, held in `events.js`; each event carries `my_registration_id`. After every click, `loadEvents()` asks for the list again. The real number of free places lives in the database, not in the browser. Asking for the list again after each click is the simplest way to always show the true state, including sign-ups made by other members at the same time. It costs one extra request per click, which is fine for a short list.
3. REST call: the click handler in `events.js` sends `fetch('POST /api/events/:id/registrations')` and shows the `message` from the answer.

**On the server**
4. Route: `src/routes/api.js` receives the request. It answers 401 if there is no session, calls the service, and turns `EventFull` and `AlreadySignedUp` into 409 and `EventNotFound` into 404. It holds no rule.
5. Service: `signUpForEvent(eventId, userId)` in `src/services/registrationService.js` holds the rule. In one transaction it locks the event row with SELECT ... FOR UPDATE, then checks in this order: the event exists (EventNotFound), the member is not already signed up (AlreadySignedUp), and there is a free place (EventFull); if all pass, it inserts the registration and commits, and on any error it rolls back. The lock matters when two members try to take the last place at the same moment: the second one waits until the first has finished, counts again, and gets EventFull, so an event never has more sign-ups than places.
6. Database: `lockEventById` in `src/db/events.js`, and `countRegistrationsForEvent` and `createRegistration` in `src/db/registrations.js`. Only this layer writes SQL, always with parameters.
7. What crosses back to the client: 201 with `{ id, event_id, user_id, message }`, or 409 with `{ error, message }`. Never a database row with a password hash or a token.

**MCP**
The tool `sign_up_for_event` in `mcp-server/server.js` enters at step 5: it calls the same `signUpForEvent` as the route, as the member who owns `MCP_TOKEN`. Entering at the service means the rules are written once and protect every way in. If the tool had its own query, it would be a second path to the registrations table with none of the rules on it, and a future rule added to the service would silently not apply over MCP. When I signed up twice through MCP, the second call returned AlreadySignedUp without any rule in the MCP server.

### Where my code does not match the layering
The organizer-only check of `POST /api/events/description-suggestion` is in the route (`src/routes/api.js`), not in a service. I leave it there for now: it is a one-line access check, like the 401 next to it, and today the route is the only way to reach the description suggestion. The risk is that a future MCP tool for suggestions would not have this check, so if I add one, I will move the organizer check into the service first.

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->

### Slice 1: sign-in and the upcoming events list
- [AC-16] A member who signs in with the correct email and password lands on the events list and sees their name at the top.
- [AC-17] A member who signs in with a wrong password sees "Wrong email or password", stays on the sign-in page and gets no session.
- [AC-18] A visitor without a session who opens /events is redirected to /login, and a request to /api/events without a session gets 401.
- [AC-19] A signed-in member sees only upcoming events from the `events` table, ordered by date, each with its title, its date and start time in hours and minutes (no seconds), and its free places.
- [AC-20] When one event row is deleted from the `events` table, a signed-in member who reloads /events no longer sees that event.

### Slice 2: sign up for an event and cancel the sign-up
- [AC-1] A member who signs up for an upcoming event with free places gets 201 and sees "You are signed up"; one new row appears in `registrations`, and the event's free places go down by one.
- [AC-2] A member who signs up for an event with no free places gets 409 and sees "This event is full"; no new row appears in `registrations`.
- [AC-3] A member who is already signed up and tries again gets 409 and sees "You are already signed up"; no duplicate row appears in `registrations`.
- [AC-21] A member who cancels their own sign-up gets 204; the row disappears from `registrations` and the free places go up by one.
- [AC-22] A member who tries to cancel another member's sign-up gets 403, and the row stays in `registrations`.
- [AC-23] A visitor without a session who tries to sign up or cancel gets 401, and nothing changes in `registrations`.

### Slice 3: the model suggests an event description
- [AC-24] An organizer who sends notes to POST /api/events/description-suggestion gets 200 with a suggested description of at most 80 words.
- [AC-25] When the model takes more than 10 seconds, fails, or there is no GEMINI_API_KEY, the organizer gets 200 with no suggestion and the message "Suggestion not available, write the description yourself".
- [AC-26] When the model answers with an empty text or more than 80 words, the suggestion is discarded and the organizer gets the same message.
- [AC-27] A member who is not an organizer gets 403, and a visitor without a session gets 401.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-1 | test/registrationService.test.js, test/registrationsApi.test.js |
| AC-2 | test/registrationService.test.js, test/registrationsApi.test.js |
| AC-3 | test/registrationService.test.js, test/registrationsApi.test.js |
| AC-16 | test/slice1Api.test.js |
| AC-17 | test/slice1Api.test.js |
| AC-18 | test/slice1Api.test.js |
| AC-19 | test/slice1Api.test.js |
| AC-20 | test/slice1Api.test.js |
| AC-21 | test/registrationService.test.js, test/cancelApi.test.js |
| AC-22 | test/registrationService.test.js, test/cancelApi.test.js |
| AC-24 | test/descriptionService.test.js |
| AC-25 | test/descriptionService.test.js, test/descriptionApi.test.js |
| AC-26 | test/descriptionService.test.js |
| AC-27 | test/descriptionApi.test.js |
| AC-23 | test/registrationsApi.test.js, test/cancelApi.test.js |

## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->
- Passed: AC-16 sign-in with the seeded member shows "Welcome, Member Bob"; AC-17 a wrong password shows "Wrong email or password" and gives no session; AC-18 /events without a session redirects to /login (302) and /api/events returns 401, and /events.html cannot be opened directly; AC-19 the list shows only the three upcoming events from the `events` table, ordered by date; AC-20 deleting an event row and reloading /events removes it.
- Missed or reinterpreted: the first plan stored free places as a column, made password_hash NOT NULL (which breaks Google-only accounts) and redirected the API instead of returning 401; it added a registrations table, a deleteEvent function and ON DELETE CASCADE nobody asked for; app.js fell back to a hard-coded session secret and served the whole public/ folder, so /events.html skipped the sign-in check; the seed duplicated events when run twice; and the list showed times with seconds, because AC-19 only said "date".
- Changed: AC-19 now says the date and start time are shown in hours and minutes, with no seconds, and the events page was changed to match.
- Changed (Exercise 3): removed the waiting list and ratings criteria (old AC-4 to AC-15, ids retired) to build the sign-up feature, the model feature and the MCP tools well; replaced get_event_ratings with sign_up_for_event.
- Changed (Exercise 3): the model feature uses gemini-3.5-flash-lite instead of gemini-3.8-flash, which hung in every agent session; added slice 3 (AC-24 to AC-27) so the model feature and its fallback are tested. The create-event screen is left for later.
