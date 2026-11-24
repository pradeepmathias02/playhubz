# Lock the guest's screen so only the host controls the movie

## What is happening
- Last time I added a "Tap to join playback" button for guests. Tapping it unlocked the whole player, which is why your friend could open the Servers menu and click the screen. That was my mistake.
- The movie player comes from another site (VidSrc.wiki). PlayHub can't press its buttons or read its time directly. The "Continue watching from 1:13 / Resume / Start over" box also belongs to that site.

## Step 1: Find out whether the player can take orders from PlayHub
- Some of these players accept messages like "play", "pause" or "jump to 12:30", and report their current time back. I'll load VidSrc.wiki in a real browser, listen for what it sends, and try sending those commands.
- If it works, the host's Play, Pause and seek are sent to every guest's player automatically. Guests never need to touch it, and everyone stays at the same time.

## Step 2: Lock guests out completely (always done)
- Remove the "Tap to join playback" button.
- A guest's screen is fully covered and blocked. No Servers menu, no Resume or Start over, no clicking the movie.
- The guest's player always opens at the host's current time with autoplay on, so they never need to press anything.
- If the guest's browser blocks autoplay with sound, the player starts muted. A small "Turn on sound" button outside the screen fixes it. It only changes sound on their side; it never pauses or skips the movie.
- The host's Pause, Resume and Lights stay host-only, as they are now.

## Step 3: Test properly before telling you it works
- Two real accounts in two browsers: host and guest.
- On the guest's side, try clicking the Servers menu, the movie, and Resume or Start over. Check each click is blocked, using what is actually on screen and not just the code.
- Check that host Start, Pause and Resume reach the guest within 3 seconds, including for someone who joins late.
- If Step 1 works: check that the guest's player time stays within a few seconds of the host's.
- Take screenshots of both screens as proof.

## Honest limit
- If Step 1 shows the player won't take orders, guests can't touch anything. But keeping them in sync then relies on reloading their player at the host's time whenever the host pauses or resumes. They may drift by a few seconds, and the player's own "Continue watching" box may still flash briefly before autoplay.

## Technical details
- Investigation: a Playwright script listens for `message` events from the VidSrc.wiki iframe and posts candidate commands (`play`, `pause`, `seek`) in the common vidsrc formats.
- `src/routes/theatre.$code.tsx`: remove `guestTapped`. The guest overlay always blocks pointer events. Add an optional `postMessage` bridge if supported. Guest iframe URL gets `autoplay=1` and the host position as the start time.
