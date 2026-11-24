import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import { ratingLabel } from "@/lib/ratings";

export default defineTool({
  name: "list_my_ratings",
  title: "List my ratings",
  description: "List the community ratings (Timepass, Good, Perfect) the signed-in user has given on PlayHub.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("movie_votes")
      .select("tmdb_id, media_type, rating, updated_at")
      .eq("user_id", ctx.getUserId() ?? "")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new ToolError("Could not load ratings.");
    const ratings = (data ?? []).map((r) => ({
      tmdbId: r.tmdb_id,
      mediaType: r.media_type,
      rating: ratingLabel(r.rating),
      ratedAt: r.updated_at,
    }));
    const text = ratings.length
      ? ratings.map((r) => `${r.mediaType} TMDB ${r.tmdbId}: ${r.rating}`).join("\n")
      : "No ratings yet.";
    return { content: [{ type: "text", text }], structuredContent: { ratings } };
  },
});
