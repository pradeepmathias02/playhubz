import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Flame } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MovieCard } from "@/components/MovieCard";
import type { TmdbItem } from "@/lib/tmdb";
import { getUpcoming } from "@/lib/tmdb.functions";
import { Suspense, useEffect, useState } from "react";
import { calendarDay, futureItems } from "@/lib/upcoming";

const upcomingQ = queryOptions({
  queryKey: ["upcoming"],
  queryFn: () => getUpcoming(),
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: "always",
});

export const Route = createFileRoute("/upcoming")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Upcoming Movies — PlayHub Release Calendar" },
      {
        name: "description",
        content:
          "Browse the PlayHub release calendar: upcoming movies organized by release date, updated daily so titles disappear the moment they release.",
      },
      { property: "og:title", content: "Upcoming Movies — PlayHub Release Calendar" },
      {
        property: "og:description",
        content: "See which movies release next, day by day, on PlayHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    // Don't block navigation: start fetching and render the page shell immediately.
    void context.queryClient.prefetchQuery(upcomingQ);
  },
  errorComponent: () => <div role="alert" className="p-8 text-foreground">Couldn't load the release calendar. Please refresh.</div>,
  notFoundComponent: () => <div className="p-8 text-foreground">Release calendar not found.</div>,
  component: UpcomingPage,
});

function dateKey(item: TmdbItem) {
  return item.releaseDate || "unknown";
}

function dayLabel(key: string, today: Date) {
  if (key === "unknown") return "Date TBA";
  const d = new Date(`${key}T00:00:00Z`);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 1) return "Tomorrow";
  if (diffDays === 2) return "In 2 days";
  const formatted = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (diffDays <= 7) return `${formatted} · This week`;
  if (diffDays <= 14) return `${formatted} · Next week`;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function countdown(key: string, today: Date) {
  if (key === "unknown") return null;
  const d = new Date(`${key}T00:00:00Z`);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 1) return "1 day";
  return `${diffDays} days`;
}

function groupByDate(items: TmdbItem[]) {
  const groups = new Map<string, TmdbItem[]>();
  for (const item of items) {
    const key = dateKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === "unknown" ? 1 : b === "unknown" ? -1 : a.localeCompare(b),
  );
}

function UpcomingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Suspense
        fallback={
          <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8">
            <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-card" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-card" />
              ))}
            </div>
          </main>
        }
      >
        <UpcomingContent />
      </Suspense>
      <Footer />
    </div>
  );
}

function UpcomingContent() {
  const { data } = useSuspenseQuery(upcomingQ);
  const [liveDay, setLiveDay] = useState(data.today);
  useEffect(() => {
    const update = () => setLiveDay(calendarDay());
    update();
    const timer = window.setInterval(update, 15000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const today = new Date(`${liveDay}T00:00:00Z`);
  const groups = groupByDate(futureItems(data.items, liveDay));
  const anticipated = data.anticipated.filter(i => i.releaseDate && i.releaseDate > liveDay && i.releaseDate.slice(0, 4) === liveDay.slice(0, 4));

  return (
    <>
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Upcoming Releases
            </h1>
            <p className="text-sm text-muted-foreground">
              A live calendar — titles leave this list the day they release.
            </p>
          </div>
        </div>

        {anticipated.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <Flame className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Most Anticipated of {liveDay.slice(0, 4)}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {anticipated.map((item, rank) => (
                <div key={item.id} className="relative">
                  <span className="absolute -left-1 -top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-gradient-primary font-display text-sm font-bold text-primary-foreground shadow-glow">
                    {rank + 1}
                  </span>
                  <MovieCard item={item} />
                </div>
              ))}
            </div>
            <div
              className="mt-10 h-px w-full bg-gradient-to-r from-primary/45 via-border to-transparent"
              aria-hidden="true"
            />
          </section>
        )}

        {groups.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            No upcoming releases found right now. Check back soon.
          </p>
        ) : (
          <div className="relative space-y-10 before:absolute before:bottom-4 before:left-[7px] before:top-2 before:w-px before:bg-border md:before:left-[9px]">
            {groups.map(([key, items]) => (
              <section key={key} className="relative pl-8 md:pl-10">
                <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-glow md:h-5 md:w-5" />
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold text-foreground md:text-xl">
                    {dayLabel(key, today)}
                  </h2>
                  {countdown(key, today) && (
                    <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      in {countdown(key, today)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "movie" : "movies"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {items.map((item) => (
                    <MovieCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
