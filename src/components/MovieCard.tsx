import { Link } from "@tanstack/react-router";
import { Star, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { TmdbItem } from "@/lib/tmdb";
import { posterUrl, yearOf } from "@/lib/tmdb";
import { usePlayer } from "@/components/player/PlayerProvider";
import { getProgress, subscribe } from "@/lib/watch-progress";
import { RatingMeter } from "@/components/RatingMeter";

export function MovieCard({ item, priority = false }: { item: TmdbItem; priority?: boolean }) {
  const poster = posterUrl(item.posterPath, "w342");
  const { openPlayer } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const update = () => setProgress(getProgress(item.id, item.mediaType));
    update();
    return subscribe(update);
  }, [item.id, item.mediaType]);


  return (
    <div
      className="transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1.5 hover:scale-[1.06]"
      onMouseEnter={() => setHovered(true)}
    >
      <Link
        to="/title/$mediaType/$id"
        params={{ mediaType: item.mediaType, id: String(item.id) }}
        className="group relative block w-[150px] shrink-0 overflow-hidden rounded-xl bg-card shadow-card md:w-[180px]"
      >
        <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
          {poster ? (
            <img
              src={poster}
              alt={item.title}
              srcSet={`${posterUrl(item.posterPath, "w185")} 185w, ${poster} 342w`}
              sizes="(min-width: 768px) 180px, 150px"
              width={342}
              height={513}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">No image</div>
          )}
        </div>

        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-gradient-primary" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Play ${item.title}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPlayer({
                mediaType: item.mediaType,
                id: item.id,
                title: item.title,
                posterPath: item.posterPath,
              });
            }}
            className="pressable mb-2 grid h-9 w-9 place-items-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-110"
          >
            <Play className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
          </button>
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {item.voteAverage.toFixed(1)}
            </span>
            <span>{yearOf(item.releaseDate)}</span>
          </div>
          {hovered && (
            <div className="mt-2 flex justify-center">
              <RatingMeter mediaType={item.mediaType} tmdbId={item.id} compact />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
