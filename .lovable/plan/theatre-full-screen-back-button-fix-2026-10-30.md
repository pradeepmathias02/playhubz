# Theatre full screen + Back button fix

## 1. Theatre full screen
- Add a "Full screen" button to the theatre's bottom bar (next to zoom / face-the-screen).
- Clicking it puts the whole theatre into real browser full screen, so the browser's tab bar, address bar and the Windows taskbar disappear.
- While in full screen, the Leave / code / members bar and the bottom buttons fade away after ~3 seconds of no mouse movement, and come back when you move the mouse or tap.
- Pressing Esc (or the button again) leaves full screen and everything returns as it is now.
- On phones that don't support full screen (iPhone Safari), the button is hidden.

## 2. Back button returns to where you came from
- On a movie/show page, "Back" now goes one step back in your history — so from a Cinematic Universe roadmap it returns to that universe (and scroll position), from search it returns to search, etc.
- If the page was opened directly (shared link, new tab), Back falls back to the home page.

## Technical details
- `src/routes/theatre.$code.tsx`: `requestFullscreen()` on the outer container, track `fullscreenchange` in state, idle timer toggling HUD opacity/pointer-events; icon `Expand`/`Shrink`.
- `src/routes/title.$mediaType.$id.tsx`: replace `<Link to="/">` with a button using `useRouter().history.back()` when `window.history.state?.idx > 0` (TanStack `useCanGoBack`), else `navigate({ to: "/" })`.
