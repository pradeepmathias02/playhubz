import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SearchX, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MovieCard } from "@/components/MovieCard";
import { searchContent } from "@/lib/tmdb.functions";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  staticData: { sitemap: true },
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search · PlayHub" },
      { name: "description", content: "Search movies and TV shows on PlayHub." },
      { property: "og:title", content: "Search · PlayHub" },
      { property: "og:description", content: "Find your next movie or TV show on PlayHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q.trim();

  const { data: res, isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchContent({ data: { query } }),
    enabled: query.length > 0,
    staleTime: 5 * 60_000,
  });
  const data = res?.results;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {query ? (
            <>
              Results for <span className="text-gradient">“{query}”</span>
            </>
          ) : (
            "Search movies and TV shows"
          )}
        </h1>
        {res?.correctedTo && (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing results for <span className="font-semibold text-foreground">{res.correctedTo}</span>
          </p>
        )}

        {!query && (
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Find any film or series by title using the search bar above. Results show posters, release years and
            ratings, and each title opens a page with its story, cast, community votes and where to watch.
          </p>
        )}

        {query && isFetching && !data && (
          <div className="mt-16 flex justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {query && !isFetching && data && data.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
            <SearchX className="h-10 w-10" />
            <p>No results found. Try a different search.</p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="mt-8 grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {data.map((item) => (
              <MovieCard key={`${item.mediaType}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
