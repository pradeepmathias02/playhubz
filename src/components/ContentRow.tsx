import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TmdbItem } from "@/lib/tmdb";
import { MovieCard } from "./MovieCard";

export function ContentRow({ title, items, priority = false }: { title: string; items: TmdbItem[]; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  if (!items?.length) return null;

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="group/row relative py-4 [content-visibility:auto] [contain-intrinsic-size:auto_340px]">
      <h2 className="mb-3 px-4 text-lg font-bold text-foreground md:px-8 md:text-xl">{title}</h2>

      <button
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="absolute left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity group-hover/row:opacity-100 md:grid"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="absolute right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity group-hover/row:opacity-100 md:grid"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div
        ref={ref}
        className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2 md:px-8"
      >
        {items.map((item, index) => (
          <MovieCard key={`${item.mediaType}-${item.id}`} item={item} priority={priority && index < 4} />
        ))}
      </div>
    </section>
  );
}

export function ContentRowSkeleton({ title }: { title: string }) {
  return (
    <section className="py-4">
      <h2 className="mb-3 px-4 text-lg font-bold text-foreground md:px-8 md:text-xl">{title}</h2>
      <div className="flex gap-3 overflow-hidden px-4 md:px-8">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[2/3] w-[150px] shrink-0 animate-pulse rounded-xl bg-muted md:w-[180px]"
          />
        ))}
      </div>
    </section>
  );
}
