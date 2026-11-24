# AI "What do you feel like watching?" shelf

## What you'll see
- A slim prompt bar on the homepage, between the hero slider and Continue Watching: "Describe what you're in the mood for…"
- 4 quick mood chips (e.g. "Feel-good", "Mind-bending", "Friends on an adventure", "Edge-of-seat thriller") that fill and send the prompt.
- After sending: an "AI Picks for you" poster row (up to 10 titles) using the normal movie cards, each with a one-line "why it matches" note. Clicking opens the usual title page.
- Clear messages for empty results, too many requests, or when AI credits run out.

## Keeping it cheap
- Uses Lovable's built-in AI with its lowest-cost fast model (Gemini 3.1 Flash Lite). Every workspace gets 4 free AI credits per month; one request costs a tiny fraction of a credit, so normal use should stay within the free amount. Beyond that, usage comes from your workspace credits.
- Short instructions and a compact answer (titles + year + short reason only, no long text), capped output length.
- Same prompt asked again is answered from a short-lived cache (no new AI call).
- Prompt length limited to 200 characters; request only fires when the user presses Send or a chip (never while typing).
- Posters/details come from TMDB (free), not the AI.

## How it works
```text
prompt -> AI returns ~10 {title, year, type, reason} -> each searched on TMDB -> real posters shown
```
Titles the AI invents that TMDB can't find are dropped.

## Technical details
- New `src/lib/ai-picks.functions.ts`: public `createServerFn` (POST), zod-validated prompt (1–200 chars). Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3.1-flash-lite`, strict `json_schema` response format, small output cap, streaming consumed server-side. Uses `LOVABLE_API_KEY` (provision if missing).
- Validates each candidate via existing TMDB `authFetch` search (`/search/movie` or `/search/tv` with year), maps with `mapItem`, dedupes, returns `{items, reasons}`.
- In-memory cache keyed by normalized prompt (30 min), same pattern as existing TMDB request cache.
- Error mapping: 429 -> "Too many requests, try again shortly"; 402/403 -> "AI picks are paused right now"; no retries.
- New `src/components/AiPicks.tsx` (prompt bar, chips, results row reusing `ContentRow`/`MovieCard`), mounted in `src/routes/index.tsx` above `ContinueWatchingRow`. Uses existing design tokens.
- Verify with a real prompt ("group of friends go on an adventure") end-to-end in the browser.
