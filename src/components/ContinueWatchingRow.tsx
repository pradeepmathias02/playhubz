import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { motion } from "framer-motion";
import { posterUrl } from "@/lib/tmdb";
import { usePlayer } from "@/components/player/PlayerProvider";
import {
  clearProgress,
  getContinueWatching,
  subscribe,
  type WatchEntry,
} from "@/lib/watch-progress";

export function ContinueWatchingRow() {
  const ref = useRef<HTMLDivElement>(null);
  const { openPlayer } = usePlayer();
  const [entries, setEntries] = useState<WatchEntry[]>([]);

  useEffect(() => {
    const update = () => setEntries(getContinueWatching());
    update();
    return subscribe(update);
  }, []);

  if (!entries.length) return null;

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="group/row relative py-4">
      <h2 className="mb-3 px-4 text-lg font-bold text-foreground md:px-8 md:text-xl">
        Continue Watching
      </h2>

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

      <div ref={ref} className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2 md:px-8">
        {entries.map((entry) => {
          const poster = posterUrl(entry.posterPath, "w342");
          return (
            <motion.div
              key={`${entry.mediaType}-${entry.id}`}
              whileHover={{ scale: 1.06, y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <div className="group relative block w-[150px] shrink-0 overflow-hidden rounded-xl bg-card shadow-card md:w-[180px]">
                <Link
                  to="/title/$mediaType/$id"
                  params={{ mediaType: entry.mediaType, id: String(entry.id) }}
                  className="block"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
                    {poster ? (
                      <img
                        src={poster}
                        alt={entry.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                </Link>

                <button
                  type="button"
                  aria-label={`Remove ${entry.title}`}
                  onClick={() => clearProgress(entry.id, entry.mediaType)}
                  className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  aria-label={`Resume ${entry.title}`}
                  onClick={() =>
                    openPlayer({
                      mediaType: entry.mediaType,
                      id: entry.id,
                      title: entry.title,
                      posterPath: entry.posterPath,
                      season: entry.season,
                      episode: entry.episode,
                    })
                  }
                  className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-110"
                >
                  <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
                </button>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <div
                    className="h-full bg-gradient-primary"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              </div>
              <p className="mt-1 line-clamp-1 px-1 text-xs font-medium text-foreground">
                {entry.title}
                {entry.mediaType === "tv" && entry.season
                  ? ` · S${entry.season}E${entry.episode}`
                  : ""}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
