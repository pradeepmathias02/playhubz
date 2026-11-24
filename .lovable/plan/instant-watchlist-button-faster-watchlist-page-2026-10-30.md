# Instant Watchlist button + faster Watchlist page

## What you'll get
- Tapping "Watchlist" on a movie flips to "In Watchlist" instantly (no waiting), with a short pop animation: the button bounces, the plus icon spins into a check, and a small pink ring pulses out. Removing plays a quick reverse shrink.
- If saving fails, the button quietly flips back and shows a small "Couldn't save" message.
- The Watchlist page opens instantly on repeat visits (shows saved titles right away, refreshes quietly in the background), with poster skeletons instead of a blank screen on first load.

## Technical details
- `src/lib/watchlist.ts`: keep a small in-memory cache of saved keys/items per user; `inWatchlist` answers from cache; `toggleWatchlist` takes the known current state (no extra "exists?" query), updates cache + fires the event immediately, then does a single insert/delete; on error reverts cache and throws. Read user id from cached session (`getSession` is local).
- `src/routes/title.$mediaType.$id.tsx`: optimistic `setSaved(!saved)` before awaiting; revert + toast on error; sign-in redirect unchanged.
- Animation via CSS keyframes in `src/styles.css` (pop scale, icon rotate, ring pulse) triggered by a key change; respects reduced-motion.
- `src/routes/watchlist.tsx`: render from cache immediately, skeleton grid while first loading, background refresh.
- Verify with Playwright signed in: click timing (<100 ms visual change) and watchlist page load.
