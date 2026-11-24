// Browser-safe curated cinematic universes, baked in release order so the
// home row and roadmap pages render instantly without calling TMDB.
import data from "./universes.data.json";
import type { TmdbItem } from "./tmdb";

export type UniverseItem = Pick<TmdbItem, "id" | "mediaType" | "title" | "posterPath" | "backdropPath" | "releaseDate" | "voteAverage">;
export interface UniverseGroup { name: string; items: UniverseItem[] }
export interface Universe { slug: string; name: string; tagline: string; bannerPath: string; groups: UniverseGroup[] }

export const UNIVERSES = data as Universe[];

export function getUniverse(slug: string) {
  return UNIVERSES.find((u) => u.slug === slug);
}

export function universeCount(u: Universe) {
  return u.groups.reduce((n, g) => n + g.items.length, 0);
}
