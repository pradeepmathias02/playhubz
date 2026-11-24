# Fix: friend stuck on "Waiting for the host" after the show starts

## What we see
- In your screenshot the host's screen shows the movie playing and 2 people in the room, but your friend still saw "Waiting for the host to start the show".
- So both people are in the same room, but the "show started" message from the host is not reaching the guest, or the guest ignores it.

## Likely causes (to confirm during the test)
1. When joining, the guest reads the host's state from the first entry in the host's list of entries. If the host has an old or second tab open, that first entry can still say "not started". That means the guest keeps waiting.
2. The guest only hears "show started" once, plus a repeat every 8 seconds. Nothing makes the host send its state again when a new guest arrives, so a missed message leaves the guest waiting.
3. A guest who opened the room before the host pressed Start may miss the change if the message arrives while their connection is still being set up.

## Fix
- The guest always uses the host's **newest** state, never an old tab's.
- When a guest joins, they ask the host for the current state, and the host replies straight away.
- The host repeats the show state every 3 seconds instead of every 8, and also whenever the list of people changes.
- The guest's waiting screen gets a small "Syncing with host…" note and switches to the movie as soon as any state arrives.
- Keep everything else the same: only the host controls start, pause and lights, and VidSrc.wiki stays the only player.

## Thorough test (two real accounts, two separate browsers)
1. Host creates a room, and the guest joins by code. Both see "2 in theatre".
2. Host presses Start show. Check the guest's screen changes from Waiting to the movie player within 3 seconds.
3. Guest joins **after** the host has already started. Check the guest goes straight to the movie.
4. Host presses Pause for all, then Resume. Check the guest follows both times.
5. Host opens a second tab of the same room. Check the guest still follows the newest state.
6. Voice: turn on both mics (simulated microphone). Check both sides receive sound and that muting stops it.
7. Take screenshots of both screens at each step as proof.

## Limits
- The movie player belongs to another site. We can load it for everyone at the right start time, but we can't press its Play button for your friend. Each person may still need to tap Play once.
- The test needs to sign in as two accounts. If only one account exists, I'll create a second test account in the sign-up flow, or ask you which account to use.

## Technical details
- `src/routes/theatre.$code.tsx`: pick the host meta with the highest `show.at`. Add a `need-state` broadcast from guests on SUBSCRIBED and on presence join; the host answers with a `show` broadcast. Host resync interval drops to 3 seconds, and the host also sends on presence `join` events.
- Verification uses a Playwright script with two browser contexts, fake media flags and two minted sessions.
