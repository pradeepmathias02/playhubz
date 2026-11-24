import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UNIVERSES, universeCount } from "@/lib/universes";
import { backdropUrl } from "@/lib/tmdb";

export function UniverseRow() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="group/row relative py-4">
      <h2 className="mb-3 px-4 text-lg font-bold text-foreground md:px-8 md:text-xl">Cinematic Universes</h2>
      <button onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity group-hover/row:opacity-100 md:grid">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button onClick={() => scroll(1)} aria-label="Scroll right" className="absolute right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity group-hover/row:opacity-100 md:grid">
        <ChevronRight className="h-6 w-6" />
      </button>
      <div ref={ref} className="scrollbar-hide flex gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-2 md:px-8">
        {UNIVERSES.map((u, i) => (
          <Link
            key={u.slug}
            to="/universe/$slug"
            params={{ slug: u.slug }}
            preload="intent"
            className="group relative block aspect-video w-[260px] shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:ring-primary hover:shadow-[0_10px_30px_-10px_var(--primary)] md:w-[340px]"
          >
            <img
              src={backdropUrl(u.bannerPath, "w780") ?? undefined}
              alt=""
              loading={i < 4 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
              <p className="text-base font-black uppercase tracking-wide text-foreground md:text-lg">{u.name}</p>
              <p className="text-xs text-muted-foreground">{universeCount(u)} titles · watch order</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
