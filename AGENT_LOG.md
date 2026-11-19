# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## 2026-10-15 · Gemini CLI integration test of the MCP server

- Goal: Check that Gemini CLI can discover and call my MCP server (`find_lecture`) and answer "What does lecture 7 cover?" from `lectures.json`.
- Delegated: Answering the question; Gemini chose to call `find_lecture(number: 7)` on its own. I approved the call once ("Allow once").
- Checkpoints: `/mcp` showed `my-project - Ready (2 tools)`. Answer was "Lecture 7: Evaluating output" with topics non-determinism, false positives, when to trust it; I checked it against `mcp-server/lectures.json` with `grep`, and it matched. `/stats`: 1 tool call, 100% success, tool time 3.3 s.
- Went wrong: In the first session I quit without running `/stats`, so its tokens were lost. In the second session the default model (gemini-3.8-flash) hung for several minutes: 13 requests, 0 tokens, 0 tool calls (API overloaded or quota). Gemini also reformatted the topics: `lectures.json` stores them as one comma-separated string, but the answer showed them as a bullet list with capital letters. The content was faithful, but the format was not.
- Changed by hand: Switched the model manually with `/model` → Manual → gemini-3.5-flash-lite, then asked the question again; that worked.

## 2026-10-15 · Description experiment with Gemini CLI

- Goal: See whether a vaguer tool description changes Gemini's choice for "What does lecture 7 cover?".
- Delegated: Answering the same question, with the `find_lecture` description changed to "Returns data.". Approved the call once.
- Checkpoints: Gemini still called `find_lecture(number: 7)` and answered "Evaluating output" with the same three topics, matching `lectures.json`. `/stats`: 1 tool call, 100% success.
- Went wrong: Nothing failed this time. The experiment showed the description alone was not decisive: the tool name and the parameter description were enough. I also noticed the original description promised a "description" field that `lectures.json` does not have.
- Changed by hand: Edited only line 13 of `server.js` for the experiment, started Gemini with `--model gemini-3.5-flash-lite` to avoid the earlier hang, and afterwards restored a precise description, corrected to "Returns the title and topics.".

## 2026-10-28 · Slice 1 plan, first attempt

- Goal: get a plan for slice 1 with no code.
- Delegated: the plan.
- Checkpoints: ran /stats after 3 minutes with no answer.
- Went wrong: gemini-3.8-flash hung (5 requests, 0 output tokens); I cancelled the request.
- Changed by hand: nothing.

## 2026-10-28 · Slice 1 plan, second attempt

- Goal: the same plan, in a new session.
- Delegated: the plan.
- Checkpoints: ran /stats when it did not answer.
- Went wrong: the new session went back to the default gemini-3.8-flash and hung again (8 requests, 0 output tokens). Lesson: start with `gemini --model gemini-3.5-flash-lite`.
- Changed by hand: nothing.

## 2026-10-28 · Slice 1 plan and setup

- Goal: plan slice 1 (AC-1 to AC-4) and start building it.
- Delegated: the plan, npm packages, new npm scripts (db, migrate, seed), .env.example keys, AGENTS.md commands, src/db/pool.js.
- Checkpoints: asked for a plan with no code first, reviewed it, and sent corrections before allowing any file write; approved every write with Allow once.
- Went wrong:
  - gemini-3.8-flash hung in two sessions (requests with 0 output tokens); switched to gemini-3.5-flash-lite. A new session goes back to the default model, so start with `gemini --model gemini-3.5-flash-lite`.
  - The first plan stored free_places as a column, made password_hash NOT NULL (which breaks Google-only accounts), redirected the API instead of returning 401, had no seed data, and planned PostgreSQL with apt. All corrected before any code.
  - The updated plan added a registrations table that was not asked for; removed from slice 1.
  - It tried to delete the course comments in .env.example; rejected.
  - It wrote src/db/pool.js with import/export, which would need "type": "module" and break mcp-server/server.js (require).
  - I stopped the session before src/db/migrate.js; the terminal closed once, but no approved work was lost.
- Changed by hand: emptied the example values of DATABASE_URL and SESSION_SECRET in .env.example; rewrote src/db/pool.js with require; added the CommonJS rule to AGENTS.md.
- Next: start the database (npm run db), then src/db/migrate.js and src/db/seed.js, with SQL only in a data access layer, as the Layers section of AGENTS.md says.

## 2026-11-02 · Check that the agent reads AGENTS.md

- Goal: step 6 of Exercise 2, confirm that a fresh session reads the "Always ask before" list.
- Delegated: nothing; only a question.
- Checkpoints: compared its answer with `grep -A12 "Always ask before" AGENTS.md`.
- Went wrong: it answered with 0 tool calls, so AGENTS.md was loaded at start, but it listed only 6 of the 9 items and left out adding or removing MCP tools, changing a coverage threshold and sending user data to a third-party model. I also typed a shell command into Gemini by mistake and cancelled it.
- Changed by hand: nothing.

## 2026-11-02 · Build slice 1

- Goal: build slice 1 (AC-16 to AC-20): data layer, migrate and seed, services, Express routes and the two pages.
- Delegated: src/db/users.js, src/db/events.js, migrate.js, seed.js, the two services, the API and page routes, app.js, server.js, and the login and events pages.
- Checkpoints: reviewed every file before allowing it; ran migrate and seed myself and opened both tables with psql (real rows, bcrypt hashes starting with $2b$10$); tested 302, 401 and sign-in with curl before the pages; then checked AC-16 to AC-20 in the browser.
- Went wrong: it skipped the plan I asked for and started writing; it rewrote more than asked in almost every file (renamed functions, dropped findById, changed the seed password and dates); it added deleteEvent, ON DELETE CASCADE and a role column without a CHECK; the seed duplicated events; app.js had a hard-coded fallback session secret and served the whole public/ folder, so /events.html skipped the sign-in check; events.js had an unused hrefEscape function that escaped nothing; it tried to run commands and tests after being told to stop; and it said the pages met "all requirements" before I had checked them.
- Changed by hand: removed hrefEscape from events.js; changed the date format to hours and minutes; added the Spec vs result note and the AC-19 change.

## 2026-11-16 · Slice 2: sign up and cancel

- Goal: build slice 2 (AC-1 to AC-3, AC-21 to AC-23): registrations migration, service with its rule tests, API with its tests, authorization and UI.
- Autonomy: alone only inside one step; it stops after each step and does not start the next one.
- Checkpoints: written plan reviewed before any code; I read every diff; npm test green before each commit; one commit per step; Allow once for every file write and command.
- Must stop and ask: anything in "Always ask before", any file outside the step, and any change to an existing test.

### Plan (reviewed)
1. Migration: src/db/registrations.js run by src/db/migrate.js; registrations with UNIQUE (event_id, user_id) and ON DELETE RESTRICT.
2. Database and CI: tests use a separate club_test database, created and migrated by a test setup step; a postgres:16 service in the CI test job.
3. Service: src/services/registrationService.js with EventFull and AlreadySignedUp (409) and NotOwner (403); free places = total_places minus registrations; sign-up in a transaction with SELECT ... FOR UPDATE. Rule tests for AC-1, AC-2, AC-3, AC-21, AC-22.
4. API: POST /api/events/:id/registrations (201, 409, 404) and DELETE /api/registrations/:id (204, 403, 404); 401 before the service. API tests for the failure paths and for AC-23, AC-16 to AC-20.
5. UI: Sign up or Cancel button per event on /events, showing the API message.

Changed in review: the first plan was cut off and duplicated; I fixed the endpoints (cancel by registration id, so AC-22 can be tested), moved the ownership check from the data layer to the service, asked for a separate club_test database so tests never touch my data, added tests for AC-23 and slice 1, made the UI step concrete, and kept the FOR UPDATE transaction for the last place. I approved the CI change because GitHub has no database.
- Went wrong: the session switched by itself to gemini-3.8-flash and then gemini-2.5-pro, which failed; many "Incomplete JSON" errors. The helper had no safety guard before TRUNCATE (it could have emptied my real database); it ignored my request to check the database in the failure tests; it never changed package.json to point npm test to club_test; it tried to rewrite my tests while writing the service; it put SQL in the service, used an Error with a status code instead of EventNotFound, and rewrote the free_places queries dropping ::int. A USAGE.md table separator was missing; I found it in the diff.
- Changed by hand: the _test guard in clearDatabase (the agent later moved it into validateTestDbUrl); the database checks in the AC-2, AC-3 and AC-22 tests and the pool.end hook; the npm test script (club_test, test secret, only *.test.js); lockEventById in src/db/events.js; the postgres service in ci.yml.
- Kept from the agent although not asked for: the DATABASE_URL check in src/db/pool.js.

## 2026-11-16 · Slice 2: registration service (second session)

- Goal: src/services/registrationService.js so the rule tests pass, then the API.
- Autonomy and checkpoints: as in the previous entry.
- Result: the service passed the 5 rule tests on the first try, with no SQL in it and AlreadySignedUp checked before EventFull. The CI test job is green with its own PostgreSQL.
- Decision: cancelling a registration that does not exist also returns NotOwner (403), so the ids of other members' sign-ups are not revealed; changed from the plan (404).
- Went wrong: the API step failed three times with "Incomplete JSON" and once with a rate limit; stopped for today. It kept reading checks/lib.mjs on every request.

## 2026-11-17 · Slice 2 API and UI, slice 1 tests, model feature service

- Goal: finish slice 2 (endpoints, authorization, UI), add tests for slice 1, and start the model feature (slice 3).
- Autonomy and checkpoints: one small step at a time, tests first; I read every diff, ran npm test and committed after each step.
- Result: POST and DELETE routes with API tests (201, 409, 401, 204, 403), Sign up and Cancel buttons on /events, tests for AC-16 to AC-20, and the description suggestion service with its timeout, fallback and fake-client tests. Checked by hand: the tests fail with the event-full rule commented out (step 6), and curl gave 201, 409, 401, 403, 401, 204 (step 7).
- Went wrong: "Incomplete JSON" and rate-limit errors again; once it spent minutes re-reading the same files and running git log instead of writing the test; it kept asking to run npm test after I had run it; it put the Gemini API key in the URL; its summary claimed it had built things I did by hand.
- Changed by hand: the error-name checks in the AC-2 and AC-3 API tests; the clearer empty and error texts in events.html; the traceability table; the CI postgres service. I accepted the slice 3 criteria proposed by my tutor after reviewing them.
- Next: the route for the description suggestion (AC-24 to AC-27), then the MCP tools, the architecture note, and steps 9 to 11.

## 2026-11-17 · Model feature route and MCP tools (afternoon)

- Goal: finish slice 3 (the description suggestion route) and the MCP tools, then the architecture note.
- Autonomy and checkpoints: one small step at a time, tests first; I read every diff and committed after each step.
- Result: the description suggestion route (401, 403, fallback), MCP tokens stored as SHA-256 hashes, and list_upcoming_events, get_event and sign_up_for_event calling the same services as the API. checks/ex3.mjs: 18/18.
- Went wrong: it wandered again, re-reading files and asking to run npm test before writing anything; it put the Gemini API key in the URL; it edited createUsersTable, a migration that had already run; it made findUserByEmail and findUserByMcpTokenHash return more columns than needed. The check found the model client created in the route.
- Changed by hand: emptied GEMINI_API_KEY in the npm test script so no test calls the real model; moved the model client and the fallback into the service; added addMcpTokenHashColumn to the test helper; wrote scripts/mcp-token.js; rotated my MCP token twice after it appeared on screen. The tool list and tool calls in mcp-server/server.js were written with my tutor's help, and I reviewed and tested them by hand.

## 2026-11-17 · Exercise 4: Docker, coverage gate, deploy, Google sign-in

- Tool: no Gemini CLI session. I worked step by step with Claude (chat tutor): it explained each step and gave me commands; I ran them, read every diff and committed by hand.
- Goal: Exercise 4 steps 1 to 8.
- Result: startup check of the required variables, Neon database, /health (200/503), 404 and 400 handlers, Dockerfile, coverage gate (100% services, 80% overall), Render deploy with Auto-Deploy "After CI Checks Pass", and sign in with Google with state and PKCE (AC-28 to AC-31). 49 tests.
- Written by Claude, reviewed and tested by me: the Google sign-in code (googleOAuthClient.js, googleAuthService.js, the two routes, the tests) and the SPEC.md slice 4 text. I chose to keep the account-linking rule I had already written in SPEC.md.
- Went wrong: the first deploy failed for 15 minutes because Render had the local DATABASE_URL (localhost), not the Neon one. The log only said "database unreachable:" with an empty message. I added the database host and the error code to the log, saw `localhost` and `ECONNREFUSED`, and fixed the variable. The Google client secret is shown only once; I lost it twice and had to create new ones and delete the old ones. The local test database stopped when the codespace restarted, so all tests failed until I ran `npm run db`.
- Checked by hand: a failing test (4273ddd) turned CI red and Render did not deploy it; the revert deployed by itself. I signed in with my Gmail on the live site and saw the new row in Neon.
- Secrets: the Neon password, the session secret and the MCP token appeared on my screen or in the chat and I changed all of them. Real values were typed only into Render, Neon and Google, never into the repository.

## 2026-11-18 · Exercise 4: break it, readiness report, UI checklist

- Tool: no Gemini CLI session. Claude (chat tutor) again, same way of working.
- Goal: Exercise 4 steps 9 to 16.
- Result: data survives a redeploy; the three failures, the four states, the waterfall and the security test done on the live site and written down with times; screens table in SPEC.md; READINESS.md; docs/UI.md; UI fixes (design tokens, contrast, heading order, main landmark, 44 px buttons, focus outline); course.json. `node checks/ex4.mjs` in a clean clone: 33/34 (the only FAIL is the three model UI items, listed as gap 8).
- Written by Claude from my notes and decisions, read and checked by me: the English text of the screens table, READINESS.md and docs/UI.md, and the UI fix script. The decisions were mine: the ranking of the gaps, no dark mode, and fixing the UI instead of leaving it as gaps. For the screens table I answered four questions and Claude wrote the English text; three of my answers needed corrections (for example, I thought the page reloads after Sign up).
- Went wrong: my UI fix moved the page while it loaded (CLS 0 to 0.346 in Lighthouse); I kept the box at the top and CLS went back to 0. The rollback turned Auto-Deploy off and I turned it on again. `node checks/ex4.mjs` in my codespace says "no .env is committed" because the check only looks for a .env file in the folder; `git ls-files` shows only .env.example and the clean clone passes.
- Claims about the deployment that proved false:
  - Claude's command printed "CI VERDE" for my heading commit, but it was watching the previous CI run, which had started before my push. I saw that the run ids did not match and watched the right run.
  - Claude said a Gemini API key starts with "AIza"; my new key starts with "AQ.". A curl with the key returned 200, so the key was fine.
  - In a Google sign-in test Claude assumed /api/me returns the email; it returns the name (AC-16). The test failed and I fixed the check.
- Changed by hand: the DATABASE_URL in Render; for the CLS problem Claude suggested `align-self: flex-start` and I measured CLS before (0.346) and after (0); the GEMINI_API_KEY in Render (deleted to test the fallback, then added again).

## 2026-11-18 · Sports and social events, clay court design

- Goal and decisions (mine): two tabs on /events, sports first; social events keep a place limit, so the sign-up rule does not change (I chose this simpler option to keep time for the defence); the clay court design, out of three versions I compared; "Welcome to your tennis club" on the sign-in page; the heading "Upcoming Club Events".
- Code: written by Claude (chat tutor) from these decisions; I reviewed it, ran the tests and tried it locally.
- Checked by me: 51 tests and the coverage gate pass; I ran the migration on Neon before pushing and checked it (2 social, 4 sport events); CI green and Render deployed it; Lighthouse 97 Performance and 100 Accessibility, Cumulative Layout Shift 0.003.

## 2026-11-19 · Model feature screen and prompt

- Goal and decisions (mine): a screen for the model feature so I can show it in the defence; only organizers see it; keep the 10 s timeout even though the model often takes about 9 s; change the prompt after I saw the answers.
- Code: the screen (events.html, events.js, style.css) written by Claude (chat tutor); I tried it locally as organizer and as member, with the key and without it.
- Found by me: the first real answers had Markdown, "[Insert Location]" and "Spaces are limited", which was not in my notes. The prompt now asks for plain text and only facts from the notes. The service gave the fallback once: I measured 3.4 s, 9.0 s and 9.0 s, so it was the 10 s timeout, not a bug. Another fallback was my own server still running without the key from the failure test.
- Went wrong: one of Claude's check commands was wrong (a sed that always printed "defined"), so its first answer about the key meant nothing; the next command checked it properly.

## 2026-11-19 · Create events, 415 for bodies that are not JSON

- Goal and decisions (mine): organizers create events from the app, with the model suggestion only going into the form when they click "Use this description"; the rules for a new event (title, future date, 1 to 500 places, sport or social, optional description); answer 415 when a body is not JSON; keep gemini-3.5-flash-lite.
- Code: written by Claude (chat tutor) from these decisions; I reviewed it, ran the tests (72 pass, services at 100% coverage) and tried it locally as organizer.
- Found by me: with curl, a JSON body sent as text/plain crashed the login with 500, and a form body signed in. I wrote the test first (test(AC-34), CI red), then the fix (fix(AC-34), CI green). In the create form I found that a date in 2222 is accepted and that places are only checked from 1 to 500; there is no way to delete an event. All three are in READINESS.md gaps.
- Measured: Gemini was slow and overloaded all afternoon (9 to 86 s, several 503) on five models, so I did not change the model. Claude suggested two old model names that gave 404; I listed the models my key can use and measured them.

## What the agent did that I did not ask for

- Extra files and functions: getEventById in src/db/events.js (kept, read-only and used later by get_event); deleteEvent and ON DELETE CASCADE in slice 1 (removed); a DATABASE_URL check in src/db/pool.js (kept, it matches the no-fallback convention); a refactor of my test guard into validateTestDbUrl (kept, same protection).
- Changed tests: it tried to rewrite my rule tests while writing the service (rejected), and proposed its own npm test script after I had written mine (rejected).
- Rules in the wrong place: SQL inside the first registration service, an Error with a status code instead of EventNotFound, and the model client created in the route (all fixed).
- Data it returned or changed without being asked: dropped ::int from the free_places queries, added mcp_token_hash to findUserByEmail, returned password_hash from findUserByMcpTokenHash, and edited a migration that had already run (all rejected).
- Its own claims: its summaries said "all requirements" and "I successfully implemented" for work I had done or fixed by hand; I trusted the diffs and the tests instead.
- CI caught a real problem: the tests passed in my codespace but failed on GitHub, because Node runs test files in parallel and they all share the club_test database (one file emptied the tables while another was using them). Fixed by hand with --test-concurrency=1 in the npm test script.
