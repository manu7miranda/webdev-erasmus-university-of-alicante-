# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-15 | Gemini CLI (gemini-3.5-flash-lite) | 30692 | 168 | | $0.0096 |
| 2026-10-15 | Gemini CLI (gemini-3.5-flash-lite) | 25233 | 56 | | $0.0077 |
| 2026-10-28 | Gemini CLI (gemini-3.8-flash, hung; router on gemini-3.5-flash-lite) | 2149 | 44 | | $0.0008 |
| 2026-10-28 | Gemini CLI (gemini-3.8-flash, hung; router on gemini-3.5-flash-lite) | 2402 | 60 | | $0.0009 |
| 2026-10-28 | Gemini CLI (gemini-3.5-flash-lite) | 434273 | 4790 | | $0.1423 |

Prices: Gemini API list price for Gemini 3.5 Flash-Lite ($0.30 / 1M input, $2.50 / 1M output), https://ai.google.dev/gemini-api/docs/pricing. Cached input tokens counted at the full input price. The 13 gemini-3.8-flash requests in the first session returned 0 tokens and cost nothing.

On 2026-10-28, gemini-3.8-flash hung again in two sessions (5 and 8 requests, 0 tokens, no cost); the tokens in those rows come from Gemini CLI's router model. In the third session, 364,840 of the 434,273 input tokens were cache reads, counted at the full input price as above.
