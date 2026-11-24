# Fix the top bar on mobile

## What changes
- **Remove the Home link.** The PlayHub logo already takes you home.
- **Show Upcoming on every screen size**, including phones. Right now it's hidden on mobile.
- **Turn Sign in / Sign out into a round profile icon** on phones. On laptops and desktops, keep the text label next to the icon so the bar looks the same as it does now.
- **Make the search box narrower on phones** so the logo, Upcoming, search, and profile icon all fit in one row. On phones, the PlayHub word may shrink to just the logo icon if there still isn't enough room.

## QA before finishing
- Take screenshots at phone width (375px), at your current width (886px), and on desktop (1280px), both signed out and signed in.
- Check that nothing overlaps or gets cut off, that Upcoming and the profile icon are visible, and that the desktop layout is unchanged apart from Home being gone.

## Technical details
- Only `src/components/Navbar.tsx` changes. The nav is no longer `hidden md:flex`, and the Home link is removed.
- The profile button is an `h-9 w-9` round icon on mobile and expands to icon + text at `md:`. It has an aria-label.
- The search input is `w-24` on mobile and keeps its current width at `md:`.
- Row items get `shrink-0` / `min-w-0` so they fit.
