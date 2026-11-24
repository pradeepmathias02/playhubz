// Accurate, lightweight time tracking for signed-in users.
import { supabase } from "@/integrations/supabase/client";
import type { PlayerTarget } from "./embed";

const IDLE_MS = 5 * 60_000;
let playerOpen = false;
let lastInput = Date.now();
let pendingActive = 0;
let pendingWatch = 0;
let userId: string | null = null;

export function setPlayerOpen(open: boolean) { playerOpen = open; lastInput = Date.now(); }

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function flush() {
  if (!userId) { pendingActive = 0; pendingWatch = 0; return; }
  while (pendingActive > 0 || pendingWatch > 0) {
    const a = Math.min(pendingActive, 90), w = Math.min(pendingWatch, 90);
    pendingActive -= a; pendingWatch -= w;
    await supabase.rpc("add_activity", { _day: localDay(), _active: a, _watch: w });
  }
}

export function startActivityTracking(getUserId: () => string | null) {
  const onInput = () => { lastInput = Date.now(); };
  const events = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;
  events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
  const tick = window.setInterval(() => {
    userId = getUserId();
    if (!userId || document.visibilityState !== "visible") return;
    if (playerOpen) { pendingActive++; pendingWatch++; }
    else if (Date.now() - lastInput < IDLE_MS) pendingActive++;
  }, 1000);
  const sync = window.setInterval(() => { void flush(); }, 60_000);
  const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  return () => {
    events.forEach((e) => window.removeEventListener(e, onInput));
    clearInterval(tick); clearInterval(sync);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    void flush();
  };
}

export async function markWatched(t: PlayerTarget) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  const item = { id: t.id, mediaType: t.mediaType, title: t.title ?? "Untitled", posterPath: t.posterPath ?? null, backdropPath: null, overview: "", voteAverage: 0, releaseDate: null, genreIds: [] };
  await supabase.from("watch_history").upsert(
    { user_id: uid, media_type: t.mediaType, tmdb_id: t.id, item, last_watched_at: new Date().toISOString() },
    { onConflict: "user_id,media_type,tmdb_id" },
  );
}
