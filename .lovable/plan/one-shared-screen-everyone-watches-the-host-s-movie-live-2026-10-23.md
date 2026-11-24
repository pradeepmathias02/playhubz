# One shared screen: everyone watches the host's movie live

## The idea
Right now every person loads their own copy of the movie, so it really is two movies. Instead, only the **host** plays the movie, and their screen is streamed live to everyone in the room. Like a real theatre, there is one projector and everyone sees the same frame at the same moment.

```text
Host browser: plays the movie -> captures only the movie screen + its sound
      |  live video + audio (same connection we already use for voice)
      v
Guests: see the host's picture on the theatre screen, hear the movie
        (no player, no buttons, nothing to click)
```

## How it works for people
- **Host** presses **Start show**. The browser asks once: "Share this tab?" The host picks this tab and leaves **Share tab audio** ticked. Then the host presses Play in the movie player as usual.
- **Guests** instantly see the movie on the big screen, with sound, at the same scene. When the host pauses, skips, or changes server, guests see exactly that, because they are watching the host's screen.
- **Lights** dim for everyone when the stream starts and come back up when the host stops the show.
- Voice chat keeps working on top of the movie, with mic and speaker toggles as now.
- Guests get a small "Movie volume" slider that changes only their own loudness.
- People who join late see the live picture straight away.
- If the host's stream drops, guests see "Waiting for the host's screen…" until it comes back.

## What I remove
- The per-guest movie player, the "Tap play once" hole, and the reload-on-resume logic. Guests no longer load VidSrc.wiki at all.

## Requirements and limits
- The host must be on a **laptop or desktop with Chrome or Edge**. Phones can't share their screen from a browser. Guests can be on any device, including phones.
- The host's internet uploads the movie to each guest. That is fine for a few friends; 5 or more people may lower quality on slower connections.
- Picture quality is targeted at 720p and around 30 frames per second, a little below the original.
- I'll keep the free relay server so friends on different networks still connect. A paid relay may be needed later if many people use it.
- One risk to test: the host's shared sound could include the voice chat, so guests might hear an echo of themselves. If that happens, I'll turn on the browser's option that leaves the page's own voice audio out of the share.

## Testing before I hand it over
- Two accounts in two browsers. The host shares a test video tab, and the guest's screen shows moving frames from the host, checked by comparing screenshots a second apart.
- Check that guest clicks on the screen do nothing, because there is no player there.
- Check that the guest hears the stream's sound, and that voice chat still works both ways at the same time.
- Check a late joiner gets the picture, and that stopping the show turns the lights back on for everyone.

## Technical details
- Host: `navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, height: 720 }, audio: true, preferCurrentTab: true, selfBrowserSurface: "include" })`. Capture only the player using Element Capture (`RestrictionTarget.fromElement(iframeWrapper)` + `track.restrictTo`), falling back to Region Capture (`CropTarget` + `cropTo`). While sharing, the host's screen is drawn flat (not 3D-tilted) so the capture is clean.
- `VoiceMesh` is extended into a room media mesh: the host adds video and movie-audio transceivers on each peer connection and renegotiates. Guests render the stream in a `<video playsInline>` on the theatre screen and play movie audio through a separate element with its own volume.
- Show state gets `streaming: boolean`. Guests render the host stream when it is present, and a waiting card otherwise.
- `src/routes/theatre.$code.tsx`: remove `GuestLock` and the guest iframe. `src/lib/theatre-voice.ts`: add `setScreenStream(stream | null)` plus a remote-stream callback.
- Record in AGENTS.md: the host streams the player via screen capture over the room WebRTC mesh, because the external player can't be controlled or synced remotely.
