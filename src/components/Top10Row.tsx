import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { TmdbItem } from "@/lib/tmdb";
import { posterUrl } from "@/lib/tmdb";

export function Top10Row({ items }: { items: TmdbItem[] }) {
  const ref = useRef<HTMLOListElement>(null);
  if (!items?.length) return null;
  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="group/row relative py-4">
      <div className="mb-3 flex items-baseline gap-3 px-4 md:px-8">
        <h2 className="text-lg font-bold text-foreground md:text-xl">Top 10 Movies This Week</h2>
        <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
          Weekly
        </span>
      </div>
      <button onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity group-hover/row:opacity-100 md:grid">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button onClick={() => scroll(1)} aria-label="Scroll right" className="absolute right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity group-hover/row:opacity-100 md:grid">
        <ChevronRight className="h-6 w-6" />
      </button>
      <ol ref={ref} className="scrollbar-hide flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pt-3 pb-3 md:px-8">
        {items.map((item, i) => (
          <li key={item.id} className="flex shrink-0 items-end">
            <span
              aria-hidden
              className="-mr-4 select-none text-[110px] font-black leading-[0.8] text-transparent md:-mr-6 md:text-[170px]"
              style={{ WebkitTextStroke: "3px color-mix(in oklch, var(--primary) 85%, transparent)" }}
            >
              {i + 1}
            </span>
            <Link
              to="/title/$mediaType/$id"
              params={{ mediaType: item.mediaType, id: String(item.id) }}
              preload="intent"
              className="relative z-10 block w-[120px] overflow-hidden rounded-xl bg-muted shadow-lg ring-1 ring-border transition-transform duration-200 hover:scale-105 md:w-[160px]"
            >
              <img
                src={posterUrl(item.posterPath, "w342") ?? undefined}
                alt={`#${i + 1} ${item.title}`}
                loading={i < 5 ? "eager" : "lazy"}
                decoding="async"
                className="aspect-[2/3] w-full object-cover"
              />
              <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full glass px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {item.voteAverage.toFixed(1)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
