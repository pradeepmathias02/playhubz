# Add VidSpeed as a backup player

## What you'll see
- Movies and shows still open on VidSrc.wiki first, like now.
- A new **Switch server** button sits next to Reload in the player, so you can jump to VidSpeed any time.
- If the main player doesn't load within 12 seconds, or fails, the "hasn't loaded" message offers **Try backup server** as the main button. Reload and Open in new tab stay too.
- Once on the backup, the same button lets you switch back to the main server.
- The theatre room host player gets the same switch.

## Backup links
- Movie: `https://vidspeed.sbs/embed/movie/{tmdb_id}/`
- TV: `https://vidspeed.sbs/embed/tv/{tmdb_id}/{season}/{episode}/` (season/episode default to 1/1)

## Technical details
- `src/lib/embed.ts`: `buildEmbedUrls` returns `[vidsrc, vidspeed]` (main first, backup second).
- `PlayerProvider.tsx`: keep a `sourceIndex` that resets to 0 for each new title. Reload, new tab and the timeout all use the current source. The exhausted state shows a backup button when another source is available.
- `theatre.$code.tsx`: host player uses the same source index and switch.
- Update `embed.test.mts` to expect both URLs in order, for movie, TV and default episode, then run it.
- Update memory: the standing rule changes from "VidSrc.wiki only" to "VidSrc.wiki first, VidSpeed backup, switched manually or on failure". Replace the matching AGENTS.md rule.
- Check that the VidSpeed sample URLs respond. Playback on real phones won't be verified.
