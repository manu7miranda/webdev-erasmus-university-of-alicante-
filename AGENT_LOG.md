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
