import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ContentRow, ContentRowSkeleton } from "@/components/ContentRow";
import { Top10Row } from "@/components/Top10Row";
import { UniverseRow } from "@/components/UniverseRow";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { MoodRecommendation } from "@/components/MoodRecommendation";
import { GENRE_ROWS, dedupeAgainst, backdropUrl } from "@/lib/tmdb";
import type { TmdbItem } from "@/lib/tmdb";
import {
  getTrending,
  getPopular,
  getTopRated,
  getNowPlaying,
  getByGenre,
  getBollywood,
  getTopWeek,
} from "@/lib/tmdb.functions";

const trendingQ = queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["trending"], queryFn: () => getTrending() });
const popularQ = queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["popular"], queryFn: () => getPopular() });
const topRatedQ = queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["topRated"], queryFn: () => getTopRated() });
const nowPlayingQ = queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["nowPlaying"], queryFn: () => getNowPlaying() });
const bollywoodQ = queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["bollywood"], queryFn: () => getBollywood() });
const topWeekQ = queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["topWeek"], queryFn: () => getTopWeek(), staleTime: 60 * 60_000 });
const genreQ = (genreId: number) =>
  queryOptions<TmdbItem[], Error, TmdbItem[], (string | number)[]>({ queryKey: ["genre", genreId], queryFn: () => getByGenre({ data: { genreId } }) });

const homeRows = [
  { title: "Trending Now", query: trendingQ },
  { title: "Bollywood & Hindi", query: bollywoodQ },
  { title: "Popular Movies", query: popularQ },
  { title: "New Releases", query: nowPlayingQ },
  { title: "Top Rated", query: topRatedQ },
  ...GENRE_ROWS.map(g => ({ title: g.name, query: genreQ(g.id) })),
];

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  loader: async ({ context }) => {
    for (const row of homeRows) {
      void context.queryClient.ensureQueryData(row.query).catch(() => undefined);
    }
    void context.queryClient.ensureQueryData(topWeekQ).catch(() => undefined);
    // Wait only for the slideshow list so the first slide arrives with the page.
    const trending = await context.queryClient.ensureQueryData(trendingQ).catch(() => [] as TmdbItem[]);
    const first = trending[0];
    const path = first ? first.backdropPath || first.posterPath : null;
    return {
      hero: backdropUrl(path, "w1280"),
      heroSet: path ? `${backdropUrl(path, "w780")} 780w, ${backdropUrl(path, "w1280")} 1280w` : undefined,
    };
  },
  head: ({ loaderData }) => {
    const title = "PlayHub — Discover Movies & TV Shows, Ratings and Upcoming Releases";
    const description =
      "Browse trending Hollywood, Bollywood, South Indian and Japanese movies and TV shows, see community ratings, save a watchlist and track upcoming releases.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { property: "og:url", content: "https://playhubz.lovable.app/" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "PlayHub" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: "https://playhubz.lovable.app/" },
        ...(loaderData?.hero ? [{ rel: "preload", as: "image", href: loaderData.hero, imageSrcSet: loaderData.heroSet, imageSizes: "100vw", fetchPriority: "high" as const }] : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "PlayHub",
            alternateName: ["PlayHubz", "PlayHub Movies"],
            url: "https://playhubz.lovable.app/",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://playhubz.lovable.app/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        },
      ],
    };
  },
  errorComponent: () => <div role="alert" className="p-8 text-foreground">Couldn't load PlayHub. Please refresh.</div>,
  notFoundComponent: () => <div className="p-8 text-foreground">Page not found.</div>,
  component: Index,
});

function HeroSection() {
  const { data } = useSuspenseQuery(trendingQ);
  return <div className="animate-in fade-in duration-500"><HeroCarousel items={data} /></div>;
}

function TopWeekSection() {
  const { data } = useSuspenseQuery(topWeekQ);
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><Top10Row items={data} /></div>;
}

function OrderedRows({ index, seen }: { index: number; seen: Set<string> }) {
  const row = homeRows[index];
  const { data } = useSuspenseQuery(row.query);
  const nextSeen = new Set(seen);
  const items = dedupeAgainst(nextSeen, data);
  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><ContentRow title={row.title} items={items} priority={index === 0} /></div>
      {index + 1 < homeRows.length && (
        <Suspense fallback={<ContentRowSkeleton title={homeRows[index + 1].title} />}>
          <OrderedRows index={index + 1} seen={nextSeen} />
        </Suspense>
      )}
    </>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Suspense fallback={<div className="h-[78vh] animate-pulse bg-card" />}>
          <HeroSection />
        </Suspense>
        <section className="relative z-10 mx-auto max-w-[1600px] px-4 pt-2 md:px-8">
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            PlayHub: discover and watch movies and TV shows
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
            Browse trending films, popular series, Hollywood, Bollywood, South Indian and Japanese picks, see
            community ratings, track upcoming releases and save titles to your watchlist.
          </p>
        </section>
        <MoodRecommendation />
        <div className="relative z-10">
          <Suspense
            fallback={
              <div className="space-y-2 pt-4">
                <ContentRowSkeleton title="Trending Now" />
                <ContentRowSkeleton title="Popular Movies" />
              </div>
            }
          >
            <div className="space-y-2">
              <ContinueWatchingRow />
              <Suspense fallback={<ContentRowSkeleton title="Top 10 Movies This Week" />}>
                <TopWeekSection />
              </Suspense>
              <UniverseRow />
              <OrderedRows index={0} seen={new Set()} />
            </div>
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
