import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_watchlist",
  title: "List my watchlist",
  description: "List the movies and TV shows saved to the signed-in user's PlayHub watchlist.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("watchlist")
      .select("tmdb_id, media_type, item, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new ToolError("Could not load the watchlist.");
    const items = (data ?? []).map((r) => {
      const it = (r.item ?? {}) as { title?: string; releaseDate?: string | null };
      return {
        tmdbId: r.tmdb_id,
        mediaType: r.media_type,
        title: typeof it.title === "string" ? it.title : "Untitled",
        releaseDate: typeof it.releaseDate === "string" ? it.releaseDate : null,
        savedAt: r.created_at,
      };
    });
    const text = items.length
      ? items.map((i) => `${i.title} (${i.mediaType}, TMDB ${i.tmdbId})`).join("\n")
      : "The watchlist is empty.";
    return { content: [{ type: "text", text }], structuredContent: { items } };
  },
});
