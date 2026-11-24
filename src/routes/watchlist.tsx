import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MovieCard } from "@/components/MovieCard";
import type { TmdbItem } from "@/lib/tmdb";
import { getCachedWatchlist, getWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { useAuth } from "@/hooks/use-auth";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";

export const Route = createFileRoute("/watchlist")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "My Watchlist — PlayHub" },
      { name: "description", content: "Movies and shows you saved to watch later on PlayHub." },
      { property: "og:title", content: "My Watchlist — PlayHub" },
      { property: "og:description", content: "Your saved movies and shows on PlayHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<TmdbItem[] | null>(null);
  useEffect(() => {
    const cached = getCachedWatchlist();
    if (cached) setItems(cached);
    const load = () => { getWatchlist().then((l) => setItems([...l])); };
    // Show cache instantly, then refresh quietly in the background.
    getWatchlist(true).then((l) => setItems([...l]));
    const unsub = subscribeWatchlist(load);
    return unsub;
  }, [user?.id]);

  useWebMCP({
    name: "list_watchlist",
    description: "List the movies and shows shown on the user's PlayHub watchlist page.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    enabled: !loading,
    execute: () =>
      runWebMCPTool("list_watchlist", () => {
        if (!user) return "Not signed in; the watchlist needs an account.";
        if (!items) return "Watchlist is still loading.";
        if (items.length === 0) return "The watchlist is empty.";
        return items.map((i) => `${i.title} (${i.mediaType}, TMDB ${i.id})`).join("\n");
      }),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <Bookmark className="h-6 w-6 text-primary" /> My Watchlist
        </h1>
        {!loading && !user && (
          <div className="mt-10 text-center text-muted-foreground">
            <p>Sign in to save movies and shows to your Watchlist on any device.</p>
            <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Sign in
            </Link>
          </div>
        )}
        {(loading || (user && !items)) && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {user && items && items.length === 0 && (
          <div className="mt-10 text-center text-muted-foreground">
            <p>Nothing saved yet. Open any movie or show and tap "Watchlist".</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Browse titles
            </Link>
          </div>
        )}
        {items && items.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <div key={`${item.mediaType}-${item.id}`} className="[&>*]:w-full">
                <MovieCard item={item} />
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
