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
