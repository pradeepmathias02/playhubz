// Watchlist saved to the signed-in user's account, with an in-memory cache so the
// button and page respond instantly (optimistic updates, background sync).
import type { TmdbItem } from "./tmdb";
import { supabase } from "@/integrations/supabase/client";

const EVENT = "playhub:watchlist-updated";
const keyOf = (id: number, mediaType: string) => `${mediaType}-${id}`;

let cacheUser: string | null = null;
let cache: TmdbItem[] | null = null;
let inflight: Promise<TmdbItem[]> | null = null;

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Synchronous snapshot of the cached list (null if not loaded yet). */
export function getCachedWatchlist(): TmdbItem[] | null {
  return cache;
}

async function fetchList(uid: string): Promise<TmdbItem[]> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("item")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.item as unknown as TmdbItem);
}

export async function getWatchlist(force = false): Promise<TmdbItem[]> {
  const uid = await currentUserId();
  if (!uid) { cache = null; cacheUser = null; return []; }
  if (cacheUser !== uid) { cache = null; cacheUser = uid; }
  if (cache && !force) return cache;
  if (!inflight) {
    inflight = fetchList(uid)
      .then((list) => { if (cacheUser === uid) cache = list; return list; })
      .catch(() => cache ?? [])
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function inWatchlist(id: number, mediaType: "movie" | "tv") {
  const list = await getWatchlist();
  return list.some((i) => keyOf(i.id, i.mediaType) === keyOf(id, mediaType));
}

/**
 * Optimistic toggle. Pass the state the user sees. Returns the new state,
 * or null when not signed in. Throws (after reverting) if the save fails.
 */
export async function toggleWatchlist(item: TmdbItem, currentlySaved?: boolean): Promise<boolean | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const list = await getWatchlist();
  const k = keyOf(item.id, item.mediaType);
  const exists = currentlySaved ?? list.some((i) => keyOf(i.id, i.mediaType) === k);
  const prev = list;
  cache = exists ? list.filter((i) => keyOf(i.id, i.mediaType) !== k) : [item, ...list.filter((i) => keyOf(i.id, i.mediaType) !== k)];
  emit();
  const { error } = exists
    ? await supabase.from("watchlist").delete().eq("tmdb_id", item.id).eq("media_type", item.mediaType)
    : await supabase.from("watchlist").insert({ user_id: uid, tmdb_id: item.id, media_type: item.mediaType, item: item as never });
  if (error) {
    cache = prev;
    emit();
    throw error;
  }
  return !exists;
}

export function subscribeWatchlist(cb: () => void) {
  window.addEventListener(EVENT, cb);
  const { data: sub } = supabase.auth.onAuthStateChange((e) => {
    if (e === "SIGNED_IN" || e === "SIGNED_OUT") { cache = null; cacheUser = null; cb(); }
  });
  return () => {
    window.removeEventListener(EVENT, cb);
    sub.subscription.unsubscribe();
  };
}
