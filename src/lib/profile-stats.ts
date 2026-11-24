import { supabase } from "@/integrations/supabase/client";
import type { TmdbItem } from "@/lib/tmdb";

function dayStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Small, bounded reads so the profile opens quickly.
export async function loadStats() {
  const [act, hist, histCount, votes, wl] = await Promise.all([
    supabase.from("user_activity_daily").select("day, active_seconds, watch_seconds").order("day", { ascending: false }).limit(400),
    supabase.from("watch_history").select("item, last_watched_at").order("last_watched_at", { ascending: false }).limit(20),
    supabase.from("watch_history").select("item", { count: "exact", head: true }),
    supabase.from("movie_votes").select("media_type, tmdb_id, rating, updated_at").order("updated_at", { ascending: false }).limit(500),
    supabase.from("watchlist").select("id", { count: "exact", head: true }),
  ]);
  const today = dayStr(new Date());
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = dayStr(weekAgo);
  let total = 0, todayS = 0, week = 0, watch = 0;
  for (const r of act.data ?? []) {
    total += r.active_seconds; watch += r.watch_seconds;
    if (r.day === today) todayS += r.active_seconds;
    if (r.day >= weekStart) week += r.active_seconds;
  }
  return {
    total, today: todayS, week, watch,
    history: (hist.data ?? []).map((r) => r.item as unknown as TmdbItem),
    historyCount: histCount.count ?? (hist.data?.length ?? 0),
    votes: votes.data ?? [],
    watchlistCount: wl.count ?? 0,
  };
}
