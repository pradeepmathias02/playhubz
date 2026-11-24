import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWatchlist from "./tools/list-watchlist";
import listRatings from "./tools/list-ratings";
import listWatchHistory from "./tools/list-watch-history";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "playhub-stream",
  title: "PlayHub Stream",
  version: "0.1.0",
  instructions:
    "Tools for PlayHub Stream, acting as the signed-in user: read their watchlist, their community ratings and their watch history.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWatchlist, listRatings, listWatchHistory],
});
