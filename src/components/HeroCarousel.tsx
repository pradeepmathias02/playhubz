import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Plus, Star } from "lucide-react";
import type { TmdbItem } from "@/lib/tmdb";
import { backdropUrl, yearOf } from "@/lib/tmdb";
import { usePlayer } from "@/components/player/PlayerProvider";

export function HeroCarousel({ items }: { items: TmdbItem[] }) {
  const slides = items.slice(0, 6);
  const [index, setIndex] = useState(0);
  const { openPlayer, isPlaying } = usePlayer();

  // Pause the slideshow while a movie plays so it doesn't compete for bandwidth.
  useEffect(() => {
    if (slides.length < 2 || isPlaying) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length, isPlaying]);

  if (!slides.length) return <div className="h-[70vh] bg-card" />;

  const active = slides[index];
  const next = slides[(index + 1) % slides.length];
  const bg = backdropUrl(active.backdropPath || active.posterPath, "w1280");

  return (
    <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {bg && <img src={bg} srcSet={`${backdropUrl(active.backdropPath || active.posterPath, "w780")} 780w, ${bg} 1280w`} sizes="100vw" alt={active.title} fetchPriority={index === 0 ? "high" : "auto"} decoding={index === 0 ? "sync" : "async"} className="h-full w-full object-cover object-top" />}
          {next && next !== active && <link rel="preload" as="image" href={backdropUrl(next.backdropPath || next.posterPath, "w1280") ?? undefined} />}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

      <div className="relative z-10 flex h-full max-w-[1600px] flex-col justify-end gap-4 px-4 pb-8 md:px-12 md:pb-10">
        <motion.div
          key={`text-${active.id}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="mb-3 inline-block rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
            Featured
          </span>
          <h2 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">{active.title}</h2>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" />
              {active.voteAverage.toFixed(1)}
            </span>
            <span>{yearOf(active.releaseDate)}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-xs uppercase">
              {active.mediaType}
            </span>
          </div>
          <p className="mt-4 line-clamp-3 text-sm text-muted-foreground md:text-base">{active.overview}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                openPlayer({
                  mediaType: active.mediaType,
                  id: active.id,
                  title: active.title,
                  posterPath: active.posterPath,
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              <Play className="h-4 w-4 fill-current" /> Watch Now
            </button>
            <Link
              to="/title/$mediaType/$id"
              params={{ mediaType: active.mediaType, id: String(active.id) }}
              className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> More Info
            </Link>
          </div>
        </motion.div>

        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8 bg-primary" : "w-4 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
