// Client-safe helpers to build streaming embed URLs (no API keys involved).

export interface PlayerTarget {
  mediaType: "movie" | "tv";
  id: number;
  season?: number;
  episode?: number;
  // Optional metadata used for "Continue Watching".
  title?: string;
  posterPath?: string | null;
}

export interface EmbedProvider {
  id: string;
  name: string;
  badge?: string;
  getUrl: (target: PlayerTarget) => string;
}

const VIDSRC_MOV = "https://vidsrc.mov/embed";
const VIDSPEED = "https://vidspeed.sbs/embed";

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    // 1️⃣ PRIMARY SERVER (VidSrc.mov)
    id: "vidsrc-mov",
    name: "VidSrc.mov",
    badge: "Primary",
    getUrl: (t) =>
      t.mediaType === "tv"
        ? `${VIDSRC_MOV}/tv/${t.id}/${t.season ?? 1}/${t.episode ?? 1}`
        : `${VIDSRC_MOV}/movie/${t.id}`,
  },
  {
    // 2️⃣ BACKUP SERVER (VidSpeed)
    id: "vidspeed",
    name: "VidSpeed",
    badge: "Backup",
    getUrl: (t) =>
      t.mediaType === "tv"
        ? `${VIDSPEED}/tv/${t.id}/${t.season ?? 1}/${t.episode ?? 1}/`
        : `${VIDSPEED}/movie/${t.id}/`,
  },
];

// Mobile users can also open the player as a full page.
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );
}

export function buildEmbedUrls(target: PlayerTarget): string[] {
  return EMBED_PROVIDERS.map((p) => p.getUrl(target));
}
