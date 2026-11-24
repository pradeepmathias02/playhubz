// Shared TMDB types and client-safe helpers (no secrets here).

export interface TmdbItem {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  mediaType: "movie" | "tv";
  genreIds: number[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  name: string;
}

export interface TmdbSeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

export interface TmdbEpisode {
  episodeNumber: number;
  name: string;
}

export interface TmdbDetails extends TmdbItem {
  genres: { id: number; name: string }[];
  runtime: number | null;
  tagline: string | null;
  cast: TmdbCastMember[];
  director: string | null;
  trailerKey: string | null;
  similar: TmdbItem[];
  numberOfSeasons: number | null;
  seasons: TmdbSeasonSummary[];
}

const IMG = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size: "w92" | "w185" | "w342" | "w500" = "w500") {
  return path ? `${IMG}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w1280") {
  return path ? `${IMG}/${size}${path}` : null;
}

export function profileUrl(path: string | null) {
  return path ? `${IMG}/w185${path}` : null;
}

export function yearOf(date: string | null) {
  return date ? date.slice(0, 4) : "";
}

// Filter items already present in `seen` and add new keys. Mutates `seen`.
export function dedupeAgainst<T extends { id: number; mediaType: "movie" | "tv" }>(
  seen: Set<string>,
  items: T[],
): T[] {
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}


export const GENRE_ROWS: { id: number; name: string }[] = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 27, name: "Horror" },
  { id: 878, name: "Sci-Fi" },
  { id: 18, name: "Drama" },
  { id: 10749, name: "Romance" },
];
