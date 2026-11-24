# Theatre: host-controlled show for everyone + smoother room

## What changes for you
1. **Starts for everyone together.** When the host presses Start show, the movie loads and starts on every screen in the room at the same moment. People who join late get the show already running.
2. **Only the host controls the show.** Guests can't press play, pause or seek on the movie, and they can't switch the lights. They see a small "Host controls the show" note instead.
3. **Host pause / resume for all.** The host gets Pause and Resume buttons. Pausing dims the screen for everyone and brings the lights halfway up; resuming continues for everyone.
4. **Smoother room.** Looking around and opening the theatre should feel steady, with no stutter.

## Honest limit
The movie comes from an outside player PlayHub can't directly press buttons inside. To pause for everyone, PlayHub stops the screen and restarts it at the host's time when resumed. If that player doesn't support jumping to a time, Resume will restart from where its own memory left off, and people may drift a few seconds apart. I'll test this first and tell you what works.

## Technical details
- Realtime channel: host broadcasts `show` state `{ started, paused, startedAt, positionSec }`; guests apply it and late joiners read it from the host's presence meta. Host periodically re-broadcasts so everyone converges.
- Guests: transparent overlay over the iframe (pointer events blocked) so no in-player controls; lights/show buttons render only for host (already) and incoming show events are ignored unless sent by `room.host_id`.
- Autoplay: add VidSrc.wiki autoplay / start-time query params if supported (verify first); iframe mounts on all clients when `started && !paused`, keyed on resume to restart at `positionSec`.
- Performance: cut seats from 40 multi-box seats (~1000 3D layers) to simpler 3-face seats and merge back rows into fewer layers; remove large blurred box-shadows on sconces/ceiling lights (use pre-rendered radial gradients); drop per-plane darkening transitions in favour of one fullscreen dim layer; avoid React re-renders during presence updates by memoizing the scene; show a short fade-in once the room has painted instead of pieces popping in.
- Verify with Playwright: two browser contexts (host + guest) confirm start/pause propagate and guest controls are blocked; measure frame times while dragging.
