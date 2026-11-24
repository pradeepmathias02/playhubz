import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, Play } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getUniverse, universeCount, type UniverseItem } from "@/lib/universes";
import { backdropUrl, posterUrl, yearOf } from "@/lib/tmdb";

export const Route = createFileRoute("/universe/$slug")({
  staticData: { sitemap: false },
  beforeLoad: ({ params }) => {
    if (!getUniverse(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const u = getUniverse(params.slug);
    if (!u) return { meta: [{ title: "Universe not found — PlayHub" }, { name: "robots", content: "noindex" }] };
    const title = `${u.name} Watch Order — Release Timeline | PlayHub`;
    const description = `Every ${u.name} movie and series in release order: ${universeCount(u)} titles on one roadmap. ${u.tagline}`;
    const img = backdropUrl(u.bannerPath, "w1280")!;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: img },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: img },
      ],
      links: [{ rel: "canonical", href: `https://playhubz.lovable.app/universe/${u.slug}` }],
    };
  },
  notFoundComponent: () => <div className="p-8 text-foreground">Universe not found.</div>,
  errorComponent: () => <div role="alert" className="p-8 text-foreground">Couldn't load this universe.</div>,
  component: UniversePage,
});

function Stop({ item, n, side }: { item: UniverseItem; n: number; side: "left" | "right" }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = !!item.releaseDate && item.releaseDate > today;
  return (
    <li className={`relative flex animate-in fade-in slide-in-from-bottom-2 duration-500 md:w-1/2 ${side === "right" ? "md:ml-auto md:pl-10" : "md:pr-10 md:justify-end"} pl-12`}>
      <span
        className={`absolute top-6 grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-black text-primary-foreground shadow-[0_0_16px_var(--primary)] left-0 ${side === "right" ? "md:-left-4" : "md:left-auto md:-right-4"}`}
      >
        {n}
      </span>
      <Link
        to="/title/$mediaType/$id"
        params={{ mediaType: item.mediaType, id: String(item.id) }}
        preload="intent"
        className="group flex w-full max-w-md gap-3 rounded-xl border border-border bg-card/70 p-2.5 transition-all hover:border-primary hover:bg-card"
      >
        <img
          src={posterUrl(item.posterPath, "w185") ?? undefined}
          alt={item.title}
          loading={n < 6 ? "eager" : "lazy"}
          decoding="async"
          className="aspect-[2/3] w-20 shrink-0 rounded-lg bg-muted object-cover md:w-24"
        />
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <p className="font-bold leading-tight text-foreground">{item.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{upcoming ? `Coming ${item.releaseDate}` : yearOf(item.releaseDate)}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">
              {item.mediaType === "tv" ? "Series" : "Movie"}
            </span>
            {item.voteAverage > 0 && (
              <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-primary text-primary" />{item.voteAverage.toFixed(1)}</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-80 group-hover:opacity-100">
            <Play className="h-3 w-3 fill-primary" /> {upcoming ? "Details" : "Watch"}
          </span>
        </div>
      </Link>
    </li>
  );
}

function UniversePage() {
  const { slug } = Route.useParams();
  const u = getUniverse(slug)!;
  let n = 0;
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <header className="relative h-[46vh] min-h-[300px] overflow-hidden">
        <img src={backdropUrl(u.bannerPath, "w1280") ?? undefined} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-6 md:px-8">
          <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Release order</span>
          <h1 className="mt-2 text-3xl font-black text-foreground md:text-5xl">{u.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">{u.tagline} · {universeCount(u)} titles</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-8">
        {u.groups.map((g) => (
          <section key={g.name} className="mt-8">
            <h2 className="sticky top-16 z-20 -mx-4 mb-4 bg-background/85 px-4 py-2 text-lg font-bold text-foreground backdrop-blur md:mx-0 md:text-center md:text-xl">{g.name}</h2>
            <ol className="relative space-y-5 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-primary/10 md:before:left-1/2 md:before:-translate-x-1/2">
              {g.items.map((item) => {
                n += 1;
                return <Stop key={`${item.mediaType}-${item.id}`} item={item} n={n} side={n % 2 ? "left" : "right"} />;
              })}
            </ol>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
