// Browser-safe helpers for Virtual Theatre rooms.
import { supabase } from "@/integrations/supabase/client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export interface TheatreRoom {
  code: string;
  host_id: string;
  media_type: string;
  tmdb_id: number;
  season: number | null;
  episode: number | null;
  title: string;
}

export async function createRoom(input: {
  hostId: string;
  mediaType: "movie" | "tv";
  tmdbId: number;
  season?: number;
  episode?: number;
  title: string;
}): Promise<string> {
  for (let i = 0; i < 4; i++) {
    const code = makeRoomCode();
    const { error } = await supabase.from("theatre_rooms").insert({
      code,
      host_id: input.hostId,
      media_type: input.mediaType,
      tmdb_id: input.tmdbId,
      season: input.season ?? null,
      episode: input.episode ?? null,
      title: input.title,
    });
    if (!error) {
      roomCache.set(code, { code, host_id: input.hostId, media_type: input.mediaType, tmdb_id: input.tmdbId,
        season: input.season ?? null, episode: input.episode ?? null, title: input.title });
      return code;
    }
    if (error.code !== "23505") throw error;
  }
  throw new Error("Could not create a room, please try again");
}

// Rooms we just created or looked up, so opening the room doesn't wait on a second lookup.
const roomCache = new Map<string, TheatreRoom>();
export function cachedRoom(code: string): TheatreRoom | undefined {
  return roomCache.get(normalizeCode(code));
}
/** Warm the theatre page code + 3D engine so opening a room feels instant. */
export function preloadTheatre() {
  void import("@/components/theatre/TheatreScene");
}

export async function findRoom(code: string): Promise<TheatreRoom | null> {
  const hit = cachedRoom(code);
  if (hit) return hit;
  // Exact-code lookup only; signed-in users cannot list other people's rooms.
  const { data, error } = await (supabase.rpc as any)("find_theatre_room", {
    _code: normalizeCode(code),
  });
  if (error) throw error;
  const rows = (data ?? []) as TheatreRoom[];
  if (rows[0]) roomCache.set(rows[0].code, rows[0]);
  return rows[0] ?? null;
}
