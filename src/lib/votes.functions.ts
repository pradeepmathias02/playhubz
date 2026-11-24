import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface VoteStats {
  total: number;
  // counts per rating: 1 = timepass, 2 = good, 3 = perfect
  counts: { 1: number; 2: number; 3: number };
  average: number; // 0 when no votes, otherwise in [1, 3]
}

const titleInput = z.object({
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
});

// Public: aggregated stats for a title (no PII), read from the public aggregate table.
export const getVoteStats = createServerFn({ method: "GET" })
  .inputValidator((input: { mediaType: "movie" | "tv"; tmdbId: number }) => titleInput.parse(input))
  .handler(async ({ data }): Promise<VoteStats> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: rows, error } = await supabase
      .from("movie_vote_stats")
      .select("rating, cnt")
      .eq("media_type", data.mediaType)
      .eq("tmdb_id", data.tmdbId);
    if (error) throw new Error(error.message);

    const counts = { 1: 0, 2: 0, 3: 0 } as VoteStats["counts"];
    let sum = 0;
    let total = 0;
    for (const r of (rows ?? []) as { rating: number; cnt: number }[]) {
      const rating = r.rating as 1 | 2 | 3;
      const cnt = Number(r.cnt);
      if (rating >= 1 && rating <= 3) {
        counts[rating] += cnt;
        sum += rating * cnt;
        total += cnt;
      }
    }
    return { total, counts, average: total ? sum / total : 0 };
  });

// Protected: get the signed-in user's vote for a title (null if none).
export const getMyVote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mediaType: "movie" | "tv"; tmdbId: number }) => titleInput.parse(input))
  .handler(async ({ data, context }): Promise<{ rating: 1 | 2 | 3 | null }> => {
    const { data: row, error } = await context.supabase
      .from("movie_votes")
      .select("rating")
      .eq("media_type", data.mediaType)
      .eq("tmdb_id", data.tmdbId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { rating: (row?.rating as 1 | 2 | 3 | undefined) ?? null };
  });

// Protected: cast or update a genuine vote (one per user per title).
export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mediaType: "movie" | "tv"; tmdbId: number; rating: 1 | 2 | 3 }) =>
    titleInput.extend({ rating: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("movie_votes").upsert(
      {
        user_id: context.userId,
        media_type: data.mediaType,
        tmdb_id: data.tmdbId,
        rating: data.rating,
      },
      { onConflict: "user_id,media_type,tmdb_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
