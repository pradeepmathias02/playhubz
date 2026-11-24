# Cinematic Universes section

## What you'll see
- **Home page:** a new "Cinematic Universes" row between "Top 10 Movies This Week" and "Trending Now". It shows 11 wide banner cards: Marvel, DC, Star Wars, The Lord of the Rings, Harry Potter, The Conjuring, The Chronicles of Narnia, Jurassic, Fast & Furious, Mission Impossible and Terminator. Each card uses a big film still, the universe name and a "X titles" count. On hover the card lifts and glows slightly in the site's pink.
- **Universe page** (for example `/universe/marvel`): a full-width banner, a short intro and a vertical **roadmap**. The roadmap is a glowing timeline line with a numbered stop for each film or series, in release order. Each stop shows the poster, title, year, a Movie/Series tag, the rating meter badge and a Play/details link.
  - Large universes (Marvel, Star Wars, DC) are split into phase or era groups with sticky headers, such as "Phase 1" or "Skywalker Saga".
  - A small "Release order" label explains the order. Unreleased titles show "Coming {date}".
- **Speed:** the banners on the home page load instantly because the list is built into the app, so the movie service isn't called. Posters on a universe page load in parallel and are cached. Cards fade in as they arrive, and grey placeholders show until then. Hovering a banner preloads its page so it opens right away.
- The layout works on phones (single column, compact stops) and on desktop (alternating left/right stops along the centre line).

## Technical details
- `src/lib/universes.ts` (browser-safe): a curated list per universe with slug, name, tagline, banner image path, and ordered entries `{ tmdbId, mediaType, group? }`. Entries are hand-ordered by release date: main films plus the key series (Marvel Disney+ shows, The Mandalorian/Andor, The Rings of Power, Peacemaker, etc.).
- `getUniverseTitles` server function in `src/lib/tmdb.functions.ts`: takes a slug, fetches card data for every entry in batches of 8 using the existing `authFetch` cache, and returns DTOs sorted by release date within each group. Unknown slugs return notFound.
- `src/components/UniverseRow.tsx` for the home row (horizontal scroll, same arrows as ContentRow, with wheel scrolling left to the page as in the Top 10 fix).
- New route `src/routes/universe.$slug.tsx` with a loader (ensureQueryData + useSuspenseQuery), errorComponent, notFoundComponent, and a unique head() per universe including an absolute TMDB banner og:image. Add the 11 universe URLs to the sitemap as owned static pages.
- The rating badges reuse `src/lib/ratings.ts`. Colours come only from the existing design tokens.
- Add a small test that checks each universe's entries come out in release order, and that the 11 slugs exist.
