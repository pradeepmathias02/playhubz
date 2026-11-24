# Profile dashboard with confirm sign-out

## What you'll see
- The top-bar "Sign out" button becomes a round **profile icon** with your initial. Clicking it opens a new **My Profile** page.
- The profile page shows:
  - **Your account**: email and the date you joined.
  - **Time on PlayHub**: today, this week and total. It counts only active time, meaning the tab is open and in front of you.
  - **Watch time**: total time spent in the movie player.
  - **Movies & episodes watched**: how many titles you opened in the player, plus a recent-history grid of posters.
  - **Community contribution**: how many ratings you've given, split into Timepass, Good and Perfect, plus a poster grid of every title you rated with its badge.
  - **Watchlist**: how many titles you've saved, with a link to the Watchlist page.
- A **Sign out** button at the bottom opens a "Are you sure you want to sign out?" box with **No** and **Yes**. Only Yes signs you out.

## How accuracy is ensured
- Time is saved to your account, so it follows you across devices. It keeps counting while you browse and pauses when you switch tabs or minimise the window, so leaving a tab open doesn't add hours. It also pauses after 5 minutes without any mouse movement or typing, except while the player is open.
- Each title counts as "watched" once, however many times you reopen it. The player embeds an outside site, so PlayHub can't see whether a video actually played. A title counts once the player has been open for at least 2 minutes.
- Ratings and watchlist numbers come straight from your saved account data, so they always match.
- Tracking only happens while you are signed in.

## Speed
- Tracking adds no extra loading. It saves a small update once a minute and once when you leave the page.
- The profile page opens instantly and fills in its numbers a moment later, the same way the other pages work now.

## Technical details
- New tables, each restricted to the owner with owner-only access rules (RLS) and grants for signed-in users:
  - `user_activity_daily` (user_id, day, active_seconds, watch_seconds), with one row per user per day. Adding time increases the existing row through an authenticated function that caps each call at 90 seconds, so the numbers can't be inflated.
  - `watch_history` (user_id, media_type, tmdb_id, item jsonb, first_watched_at, last_watched_at), unique per title.
- `useActivityTracker` hook mounted in the root layout: it counts visible and active seconds, plus player-open seconds from the player, and sends them every 60 seconds and when the page is hidden.
- The player marks a title as watched in `watch_history` after 120 seconds open.
- New route `src/routes/profile.tsx` (client data via `useQuery`, with a sign-in prompt when signed out). The ratings grid joins `movie_votes` for the user.
- The navbar shows a profile link instead of sign-out. Sign-out uses an AlertDialog, then cancels and clears cached queries, signs out, and navigates home.
- Continue Watching stays device-only as before.
