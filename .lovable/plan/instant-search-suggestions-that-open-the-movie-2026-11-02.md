# Instant search suggestions that open the movie

## What changes
1. **Updates on every letter**: the list filters instantly as you type, using the results already loaded (re-ranked locally by closeness to what you typed), so there is no blank wait between letters.
2. **Faster fresh results**: wait only ~120 ms after typing stops (was 250 ms), start from 1 letter... actually 2 letters, cancel outdated lookups, and keep the previous list visible while the new one arrives (no flicker). A small spinner shows while refreshing.
3. **Quick suggestions mode**: the dropdown asks the server for a light version (typed text + 1 spelling variant instead of 4 extra lookups), so suggestions come back in roughly half the time. The full search page keeps the thorough version.
4. **Clicking a suggestion always opens the movie**: today the list can close before the click lands (especially on phones). The list will stay open while pressing it, and tapping a title opens its page. Arrow keys + Enter also work.
5. Results cached 5 minutes, so backspacing back to an earlier word is instant.

## Technical details
- `Navbar.tsx`: `useQuery` with `placeholderData: keepPreviousData`, debounce 120 ms, `signal` aware; derive `suggestions` via `rankByMatch(query, lastResults)` on each keystroke; `onMouseDown={e => e.preventDefault()}` on the `<ul>` so input blur doesn't unmount before click; navigate via `navigate()` in `onPointerDown`/click; keyboard highlight index.
- `searchContent`: add optional `quick: boolean` input; when true use only the first variant. Query key `["search-quick", q]`.
- Verify with Playwright: type "spid" letter by letter, confirm list updates, click a suggestion and confirm the title page opens.
