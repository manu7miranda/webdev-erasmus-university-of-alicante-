# Exercise 4 — evidence notes (times in UTC)

## Step 7 — deploy on Render
- 2026-11-17 17:20 First deploy (11a01db) failed: health check timed out after 15m 43s. Logs: `health check: database unreachable:` with an empty message. (01)
- Cause found by logging the database host at startup and the error code (commit 66b3ab4): `database host: localhost`, `ECONNREFUSED ::1, 127.0.0.1`. The DATABASE_URL in Render was the local Docker URL, not Neon. Fixed the value; next deploy: `database host: ep-floral-thunder-...neon.tech`, "Your service is live".
- `/health` on production → `{"status":"ok","db":"ok"}`. (02)
- Auto-Deploy set to "After CI Checks Pass". Pushed a failing test (4273ddd): CI red (test and coverage jobs), Render did not deploy it; the site kept serving 66b3ab4. Revert (87ac016): CI green, Render auto-deployed it in 21.7 s. (03, 04)

## Step 8 — sign in with Google
- 6bf1a9f deployed by Auto-Deploy after CI. Signed in with a real Gmail on production: a new member row was created (google_id set, password_hash NULL). (05)

## Step 9 — data survives a redeploy
- Before: Member Bob signed up for Midweek Singles Ladder → 7 / 8, Cancel button. (06)
- Redeploy triggered by adding GEMINI_API_KEY and MODEL_NAME in Render.
- After: the session was lost (sent back to sign-in: MemoryStore lives in the old container). After signing in again, Midweek Singles Ladder still 7 / 8 with Cancel; Weekend Doubles 11 / 12 (data lives in Neon). (07)
- Model feature on production, signed in as organizer: real Gemini suggestion (~60 words, `message: null`). The answer contains Markdown (`**`, `*`, `\n`).

## Step 10 — break it
1. Database down (container in the codespace, wrong DATABASE_URL), 15:42:51: `/health` → `HTTP/1.1 503 Service Unavailable`, `{"status":"error","db":"down"}`, no stack trace. Sign-in page shows "An error occurred. Please try again." (09, ui/login-db-down.png)
2. Bad deploy and rollback: pushed heading "Upcoming Tennis Events" (c93ae33, live via Auto-Deploy in 45.3 s). (08) Rollback to b3bcbdd: Render deploy 10.6 s; about 16 s from confirming to seeing the old heading. Had to sign in again. The rollback turned Auto-Deploy off; turned it back on ("After CI Checks Pass").
3. Garbage, 15:55:21, production, `POST /api/events/1/registrations`: broken JSON → 400 `{"error":"The request body is not valid JSON."}`; `{}` without a session → 401. No 500, no stack trace.
4. Four states of the events screen:
   - Loading (production, Slow 4G): "Welcome, Loading..." and "Loading events...". (ui/events-loading.png)
   - Content: list with free places and Sign up / Cancel. (ui/events-content.png)
   - Empty (local DB, events deleted): "No upcoming events yet. New events will appear here as soon as an organizer creates them." (ui/events-empty.png). Note: the events list is the same for every account, so a new account does not show the empty state; it appears only when there are no upcoming events.
   - Error (local, database stopped after sign-in): "Could not load the events. Check your connection and reload the page." (ui/events-error.png). Full Offline only shows the browser's own page, because the HTML itself cannot load. (12)
5. Waterfall (production, Slow 4G, cache disabled): 5 requests, 4.3 kB transferred, Finish 2.54 s, DOMContentLoaded 1.34 s. Four steps of about 600 ms: HTML → style.css + events.js (parallel) → /api/me → /api/events. /api/events waits for /api/me without needing it. With cache: all 304, Finish 2.50 s. (10, 11)
6. Security, 16:10:27, production: signed in as Organizer Alice, `DELETE /api/registrations/2` (Member Bob's) → 403 `{"error":"NotOwner","message":"You can only cancel your own sign-up"}`; Bob is still signed up (my_registration_id 2).

## Gaps found
1. Sessions are lost on every deploy or rollback (express-session MemoryStore).
2. /api/me and /api/events run one after the other; Promise.all would save one round trip (~600 ms on Slow 4G).
3. Error messages blame the user's connection when the server failed.
4. `X-Powered-By: Express` header on every response.
5. Gemini answers in Markdown; the UI would show the asterisks.
6. Free instance spins down: first request after idle takes ~50 s.
7. Until 2026-11-18 there was no GEMINI_API_KEY anywhere, so the model feature only ever returned the fallback in production.

## Step 12 — extra checks for READINESS.md
- Secrets search, 2026-11-18: `git log --all --full-history -- .env` → empty (.env never committed). `git log -p --all` searched for the shapes of the real secrets (Neon `npg_`, Google `GOCSPX-`, Gemini `AQ.`/`AIza`, 64-character hex) → 1 match: the detection regex in `checks/lib.mjs` (course template, Initial commit), not a real key.
- Session cookie on production login: `connect.sid=…; Path=/; HttpOnly; Secure; SameSite=Lax` (no Expires: browser-session cookie).
- HTTPS: `http://…/health` → `301` to `https://…/health`.
- Model cost, measured with the same prompt as the app: 31 input tokens + 79 output tokens = 110; at the list price $0.30 / 1M input and $2.50 / 1M output (standard paid tier, eesel.ai pricing guide, 22 Jul 2026, edited 6 Aug 2026) ≈ $0.00021 per call (about 5,000 calls per dollar). Only the organizer's notes leave the app.
- Key turned off in Render (GEMINI_API_KEY deleted, redeployed), 16:33:42 UTC: as organizer, POST /api/events/description-suggestion → HTTP 200 in 0.10 s, `{"suggestion":null,"message":"Suggestion not available, write the description yourself"}`.
