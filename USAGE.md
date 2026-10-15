# Usage

One row per agent session. In Gemini CLI, type `/stats` before you quit and copy the input and output tokens. Copilot shows credits instead of tokens: write those in the credits column. The free tier charges nothing, so record what the session **would cost at the provider's published list price**, and note once below the table which price list you used. Leave the cost empty for rows that only show credits.

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---|---|---|---|
| 2026-10-15 | Gemini CLI (gemini-3.5-flash-lite) | 30692 | 168 | | $0.0096 |
| 2026-10-15 | Gemini CLI (gemini-3.5-flash-lite) | 25233 | 56 | | $0.0077 |

Prices: Gemini API list price for Gemini 3.5 Flash-Lite ($0.30 / 1M input, $2.50 / 1M output), https://ai.google.dev/gemini-api/docs/pricing. Cached input tokens counted at the full input price. The 13 gemini-3.8-flash requests in the first session returned 0 tokens and cost nothing.
