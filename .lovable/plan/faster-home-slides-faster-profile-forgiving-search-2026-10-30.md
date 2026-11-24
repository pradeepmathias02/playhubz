# Faster home slides, faster profile, forgiving search

## 1. Home page top slides
- Show the first slide's picture straight away: the server already knows the trending list, so put the first slide image in the page head as a high-priority preload, and render it without the fade-in on first load.
- Use the smaller picture size on phones/tablets, full size only on large screens.
- Load the remaining slide pictures quietly after the first one shows.

## 2. Profile page
- Today it loads all activity, all watch history and all votes, then looks up every rated movie on the movie service one by one.
- Change to: only the last 30 days of activity plus a single total, latest 20 history items, latest 30 votes.
- Show stats numbers instantly; rated-movie posters fill in afterwards and are remembered for 1 hour, so revisits are instant.
- Start loading profile data as soon as the user hovers/taps the profile icon.

## 3. Search that forgives spelling ("spidermen" finds Spider-Man)
- Search the movie service with what was typed. If few/no results, automatically retry with corrected variants:
  - remove spaces/hyphens and add hyphen variants ("spider man", "spider-man"),
  - common misspelling fixes (trailing "men"→"man", doubled letters, vowel swaps),
  - drop the last word / shorter prefix.
- Merge results and rank them by how closely each title matches what was typed (fuzzy similarity score), then by popularity.
- Show "Showing results for Spider-Man" when a corrected term was used.
- Add live suggestions under the search box as you type (short delay), so you can pick the right title without knowing the spelling.

## Technical details
- Hero: `HeroCarousel` first slide `initial={false}`, `<picture>` with media-specific sizes; index route `head` cannot read loader data cheaply, so preload via `<link rel=preload>` rendered inside the first slide plus `fetchPriority="high"`.
- Profile: query `user_activity_daily` filtered `day >= today-30`, `.limit()` on history/votes, split into two `useQuery`s; rated posters via `getBasic` with `staleTime: 1h`; prefetch on Navbar profile hover.
- Search: new browser-safe `src/lib/fuzzy.ts` (normalize, Levenshtein/trigram similarity, variant generator) with unit tests (`spidermen`→`spider-man` ranks Spider-Man first). `searchContent` runs original + up to 3 variants in parallel server-side, dedupes, scores, returns `{ results, correctedTo }`. Navbar gets a debounced suggestions dropdown (top 6).
