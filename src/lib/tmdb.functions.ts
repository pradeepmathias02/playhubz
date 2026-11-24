import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TmdbItem, TmdbDetails, TmdbEpisode } from "./tmdb";

import { calendarDay, calendarWindow, futureItems, mergeCalendar, theatricalDate, releaseRegion, PINNED_ANTICIPATED, UPCOMING_LANGUAGES } from "./upcoming";

const requestCache = new Map<string, { expires: number; value: Promise<any> }>();

const BASE = "https://api.themoviedb.org/3";

function authFetch(path: string, params: Record<string, string | number> = {}) {
  const key =
    process.env.TMDB_API_KEY ||
    process.env.VITE_TMDB_API_KEY ||
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_TMDB_API_KEY) ||
    "632427d30e719252120be647a7e35f35";

  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = { accept: "application/json" };
  // Support both v4 read tokens (JWT) and v3 api keys.
  if (key.startsWith("ey")) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    url.searchParams.set("api_key", key);
  }

  const cacheKey = `${path}?${JSON.stringify(params)}`;
  const cached = requestCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  // `cf` asks the hosting edge to keep TMDB answers for 10 minutes, so cold
  // server instances answer from the nearby edge cache instead of TMDB.
  const init = { headers, signal: AbortSignal.timeout(15000), cf: { cacheTtl: 600, cacheEverything: true } } as RequestInit;
  const value = fetch(url.toString(), init).then(async (r) => {
    if (!r.ok) throw new Error(`TMDB request failed: ${r.status}`);
    return r.json();
  }).catch(error => { requestCache.delete(cacheKey); throw error; });
  if (requestCache.size >= 300) requestCache.delete(requestCache.keys().next().value || "");
  requestCache.set(cacheKey, { expires: Date.now() + 5 * 60_000, value });
  return value;
}

type RawItem = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type?: string;
  genre_ids?: number[];
};

function mapItem(raw: RawItem, fallbackType: "movie" | "tv" = "movie"): TmdbItem {
  const mediaType = (raw.media_type === "tv" ? "tv" : raw.media_type === "movie" ? "movie" : fallbackType) as
    | "movie"
    | "tv";
  return {
    id: raw.id,
    title: raw.title || raw.name || "Untitled",
    overview: raw.overview || "",
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.release_date || raw.first_air_date || null,
    voteAverage: raw.vote_average || 0,
    mediaType,
    genreIds: raw.genre_ids || [],
  };
}

function mapList(results: RawItem[] = [], fallbackType: "movie" | "tv" = "movie"): TmdbItem[] {
  return results
    .filter((r) => r.poster_path || r.backdrop_path)
    .map((r) => mapItem(r, fallbackType));
}

export const getTrending = createServerFn({ method: "GET" }).handler(async () => {
  const data = await authFetch("/trending/all/week");
  return mapList(data.results);
});

// Top 10 of the week: TMDB weekly trending movies, keeping well-rated ones first.
export const getTopWeek = createServerFn({ method: "GET" }).handler(async () => {
  const [p1, p2] = await Promise.all([
    authFetch("/trending/movie/week"),
    authFetch("/trending/movie/week", { page: 2 }),
  ]);
  const all = mapList([...(p1.results || []), ...(p2.results || [])], "movie").filter((i) => i.posterPath);
  const good = all.filter((i) => i.voteAverage >= 6.5);
  const rest = all.filter((i) => i.voteAverage < 6.5);
  return [...good, ...rest].slice(0, 10);
});

export const getPopular = createServerFn({ method: "GET" }).handler(async () => {
  const data = await authFetch("/movie/popular");
  return mapList(data.results, "movie");
});

export const getTopRated = createServerFn({ method: "GET" }).handler(async () => {
  const data = await authFetch("/movie/top_rated");
  return mapList(data.results, "movie");
});

export const getNowPlaying = createServerFn({ method: "GET" }).handler(async () => {
  const data = await authFetch("/movie/now_playing");
  return mapList(data.results, "movie");
});

export const getBollywood = createServerFn({ method: "GET" }).handler(async () => {
  const res = await authFetch("/discover/movie", {
    with_original_language: "hi",
    sort_by: "popularity.desc",
    region: "IN",
  });
  return mapList(res.results, "movie");
});

export const getByGenre = createServerFn({ method: "GET" })
  .inputValidator((input: { genreId: number }) => z.object({ genreId: z.number() }).parse(input))
  .handler(async ({ data }) => {
    const res = await authFetch("/discover/movie", {
      with_genres: data.genreId,
      sort_by: "popularity.desc",
    });
    return mapList(res.results, "movie");
  });

type CalendarPayload = { items: TmdbItem[]; anticipated: TmdbItem[]; year: number; today: string };
let calendarRefresh: Promise<CalendarPayload> | undefined;

let memoCalendar: { at: number; today: string; value: CalendarPayload } | undefined;

export const getUpcoming = createServerFn({ method: "GET" }).handler(async (): Promise<CalendarPayload> => {
  // In-memory copy skips the database round trip for repeat visits (same day, 2 min).
  const todayKey = calendarDay();
  if (memoCalendar && memoCalendar.today === todayKey && Date.now() - memoCalendar.at < 2 * 60_000) return memoCalendar.value;
  const value = await loadUpcoming();
  memoCalendar = { at: Date.now(), today: todayKey, value };
  return value;
});

async function loadUpcoming(): Promise<CalendarPayload> {
  // Server-owned public catalogue: no caller-supplied IDs or data can be written.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = calendarDay();
  const { tomorrow, end } = calendarWindow(today);
  const year = Number(today.slice(0, 4));
  const { data: cache, error } = await supabaseAdmin.from("upcoming_calendar_cache")
    .select("payload, updated_at").eq("id", "calendar").maybeSingle();
  if (error) throw new Error("Could not read release calendar");
  const saved = cache?.payload as unknown as CalendarPayload | undefined;
  const format = (payload: CalendarPayload): CalendarPayload => ({
    items: futureItems(payload.items, today, end),
    anticipated: payload.anticipated.filter(i => i.releaseDate && i.releaseDate > today && i.releaseDate <= `${year}-12-31`).slice(0, 4),
    year, today,
  });
  const fresh = Date.now() - Date.parse(cache?.updated_at || '') < 30 * 60_000;
  if (saved && fresh && saved.today === today) return format(saved);
  // Same-day stale cache: answer instantly and refresh in the background.
  const serveStale = !!saved && saved.today === today;
  if (calendarRefresh) return serveStale ? format(saved!) : format(await calendarRefresh);
  calendarRefresh = (async () => {
    const previous = saved?.items || [];
    const knownIds = new Set(previous.map(i => i.id));
    const markets = [{ region: "US", languages: "en" }, { region: "IN", languages: "hi|te|ta|ml|kn|bn|mr|pa" }, { region: "JP", languages: "ja" }];
    const discovered = await Promise.all(markets.map(async market => {
      const params = { region: market.region, with_original_language: market.languages,
        "release_date.gte": tomorrow, "release_date.lte": end, with_release_type: "3|2", sort_by: "popularity.desc" };
      const first = await authFetch("/discover/movie", { ...params, page: 1 });
      const rest = await Promise.all(Array.from({ length: Math.min(first.total_pages || 1, 30) - 1 }, (_, i) =>
        authFetch("/discover/movie", { ...params, page: i + 2 })));
      return [first, ...rest].flatMap(page => (page.results || []) as (RawItem & { original_language?: string; popularity?: number })[])
        .filter(raw => raw.original_language && UPCOMING_LANGUAGES.has(raw.original_language) && raw.poster_path)
        // Only discover notable titles; known films never fall out when their score changes.
        .filter(raw => knownIds.has(raw.id) || (raw.popularity || 0) >= 3 || PINNED_ANTICIPATED.includes(raw.id))
        .map(raw => mapItem(raw, "movie"));
    }));
    const ids = [...new Set([...previous.map(i => i.id), ...PINNED_ANTICIPATED, 1400940])];
    const refreshed: TmdbItem[] = [];
    for (let offset = 0; offset < ids.length; offset += 8) {
      const batch = await Promise.all(ids.slice(offset, offset + 8).map(async id => {
        try {
          const raw = await authFetch(`/movie/${id}`, { append_to_response: "release_dates" });
          return { ...mapItem(raw, "movie"), releaseDate: theatricalDate(raw, releaseRegion(raw.original_language)) };
        } catch { return previous.find(i => i.id === id) || null; }
      }));
      refreshed.push(...batch.filter((i): i is TmdbItem => i !== null));
    }
    const items = futureItems(mergeCalendar(previous, [...discovered.flat(), ...refreshed]), today, end);
    const all = mergeCalendar(items, refreshed);
    const anticipated = PINNED_ANTICIPATED.map(id => all.find(i => i.id === id))
      .filter((i): i is TmdbItem => !!i && !!i.releaseDate && i.releaseDate > today && i.releaseDate <= `${year}-12-31`);
    for (const item of items) {
      if (anticipated.length >= 4) break;
      if (item.releaseDate && item.releaseDate <= `${year}-12-31` && !anticipated.some(i => i.id === item.id)) anticipated.push(item);
    }
    const payload = { items, anticipated, year, today };
    const { error: writeError } = await supabaseAdmin.from("upcoming_calendar_cache").upsert({ id: "calendar", payload: JSON.parse(JSON.stringify(payload)), updated_at: new Date().toISOString() });
    if (writeError) throw new Error("Could not refresh release calendar");
    return payload;
  })();
  if (serveStale) {
    calendarRefresh.catch(() => undefined).finally(() => { calendarRefresh = undefined; });
    return format(saved!);
  }
  try { return format(await calendarRefresh); }
  catch (error) { if (saved) return format(saved); throw error; }
  finally { calendarRefresh = undefined; }
}


export const searchContent = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; quick?: boolean }) =>
    z.object({ query: z.string().min(1).max(120), quick: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { queryVariants, rankByMatch, similarity } = await import("./fuzzy");
    const run = async (q: string) => {
      try {
        const res = await authFetch("/search/multi", { query: q, include_adult: "false" });
        return ((res.results || []) as (RawItem & { popularity?: number })[]).filter(r => r.media_type !== "person" && (r.poster_path || r.backdrop_path));
      } catch { return []; }
    };
    const variants = queryVariants(data.query).slice(0, data.quick ? 1 : 4);
    const [exact, ...others] = await Promise.all([run(data.query), ...variants.map(run)]);
    const pop = new Map<number, number>();
    const seen = new Set<string>();
    const merged: TmdbItem[] = [];
    for (const r of [...exact, ...others.flat()]) {
      const item = mapItem(r);
      const key = `${item.mediaType}-${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key); pop.set(item.id, r.popularity || 0); merged.push(item);
    }
    const results = rankByMatch(data.query, merged, i => pop.get(i.id) || 0).slice(0, 40);
    const top = results[0];
    const correctedTo = top && !exact.some(r => r.id === top.id) && similarity(data.query, top.title) < 1 ? top.title : null;
    return { results, correctedTo };
  });

export const getDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { id: number; mediaType: "movie" | "tv" }) =>
    z.object({ id: z.number().int().positive().max(100_000_000), mediaType: z.enum(["movie", "tv"]) }).parse(input),
  )
  .handler(async ({ data }): Promise<TmdbDetails> => {
    const { id, mediaType } = data;
    const raw = await authFetch(`/${mediaType}/${id}`, {
      append_to_response: "credits,videos,similar",
    });

    const cast = (raw.credits?.cast || []).slice(0, 12).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character || "",
      profilePath: c.profile_path,
    }));

    const director =
      (raw.credits?.crew || []).find((c: any) => c.job === "Director")?.name ||
      (raw.created_by?.[0]?.name ?? null);

    const trailer =
      (raw.videos?.results || []).find(
        (v: any) => v.site === "YouTube" && v.type === "Trailer",
      ) || (raw.videos?.results || []).find((v: any) => v.site === "YouTube");

    const base = mapItem(raw, mediaType);

    const seasons = (raw.seasons || [])
      .filter((s: any) => s.season_number >= 1)
      .map((s: any) => ({
        seasonNumber: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        episodeCount: s.episode_count || 0,
      }));

    return {
      ...base,
      genres: raw.genres || [],
      runtime: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
      tagline: raw.tagline || null,
      cast,
      director: director ?? null,
      trailerKey: trailer?.key ?? null,
      similar: mapList(raw.similar?.results || [], mediaType).slice(0, 12),
      numberOfSeasons: raw.number_of_seasons ?? null,
      seasons,
    };
  });

// Lightweight card data (no credits/videos/similar) for lists like profile ratings.
export const getBasic = createServerFn({ method: "GET" })
  .inputValidator((input: { id: number; mediaType: "movie" | "tv" }) =>
    z.object({ id: z.number().int().positive().max(100_000_000), mediaType: z.enum(["movie", "tv"]) }).parse(input),
  )
  .handler(async ({ data }): Promise<TmdbItem> => mapItem(await authFetch(`/${data.mediaType}/${data.id}`), data.mediaType));

export const getSeasonEpisodes = createServerFn({ method: "GET" })
  .inputValidator((input: { id: number; season: number }) =>
    z.object({ id: z.number().int().positive().max(100_000_000), season: z.number().int().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<TmdbEpisode[]> => {
    const raw = await authFetch(`/tv/${data.id}/season/${data.season}`);
    return (raw.episodes || []).map((e: any) => ({
      episodeNumber: e.episode_number,
      name: e.name || `Episode ${e.episode_number}`,
    }));
  });
