// Client-side "Continue Watching" store backed by localStorage.
// Playback happens in a cross-origin iframe, so exact position can't be read.
// We approximate progress from elapsed watch time while the player is open.

export interface WatchEntry {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
  progress: number; // 0-100 (approximate)
  updatedAt: number;
}

const KEY = "playhub:continue-watching";
const EVENT = "playhub:watch-progress-updated";
const MAX_ENTRIES = 20;
// Assume an average title runs ~110 minutes; cap progress at 95%.
const ASSUMED_RUNTIME_SEC = 110 * 60;
const MAX_PROGRESS = 95;

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): WatchEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: WatchEntry[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore quota / serialization errors
  }
}

function keyOf(id: number, mediaType: "movie" | "tv") {
  return `${mediaType}-${id}`;
}

export function getContinueWatching(): WatchEntry[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProgress(id: number, mediaType: "movie" | "tv"): number {
  const entry = read().find((e) => keyOf(e.id, e.mediaType) === keyOf(id, mediaType));
  return entry?.progress ?? 0;
}

export function elapsedToProgress(elapsedSec: number): number {
  return Math.min(MAX_PROGRESS, Math.round((elapsedSec / ASSUMED_RUNTIME_SEC) * 100));
}

interface UpsertInput {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
  progress: number;
}

export function upsertProgress(input: UpsertInput) {
  const entries = read();
  const k = keyOf(input.id, input.mediaType);
  const existing = entries.find((e) => keyOf(e.id, e.mediaType) === k);
  const progress = Math.max(existing?.progress ?? 0, input.progress);

  const next: WatchEntry = {
    id: input.id,
    mediaType: input.mediaType,
    title: input.title,
    posterPath: input.posterPath,
    season: input.season,
    episode: input.episode,
    progress,
    updatedAt: Date.now(),
  };

  const filtered = entries.filter((e) => keyOf(e.id, e.mediaType) !== k);
  write([next, ...filtered]);
}

export function clearProgress(id: number, mediaType: "movie" | "tv") {
  const k = keyOf(id, mediaType);
  write(read().filter((e) => keyOf(e.id, e.mediaType) !== k));
}

export function subscribe(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
