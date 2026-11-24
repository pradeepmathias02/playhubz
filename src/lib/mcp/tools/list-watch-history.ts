import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_watch_history",
  title: "List my watch history",
  description: "List titles the signed-in user has watched on PlayHub, most recent first.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("watch_history")
      .select("tmdb_id, media_type, item, last_watched_at")
      .order("last_watched_at", { ascending: false })
      .limit(100);
    if (error) throw new ToolError("Could not load watch history.");
    const history = (data ?? []).map((r) => {
      const it = (r.item ?? {}) as { title?: string };
      return {
        tmdbId: r.tmdb_id,
        mediaType: r.media_type,
        title: typeof it.title === "string" ? it.title : "Untitled",
        lastWatchedAt: r.last_watched_at,
      };
    });
    const text = history.length
      ? history.map((h) => `${h.title} (${h.mediaType}) — ${h.lastWatchedAt}`).join("\n")
      : "No watch history yet.";
    return { content: [{ type: "text", text }], structuredContent: { history } };
  },
});
