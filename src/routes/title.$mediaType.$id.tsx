import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Play, Star, Plus, Check, ArrowLeft, Clapperboard, Film, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { preloadTheatre, createRoom } from "@/lib/theatre";
import { inWatchlist, subscribeWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContentRow } from "@/components/ContentRow";
import { usePlayer } from "@/components/player/PlayerProvider";
import { RatingMeter } from "@/components/RatingMeter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDetails, getSeasonEpisodes } from "@/lib/tmdb.functions";
import { backdropUrl, posterUrl, profileUrl, yearOf } from "@/lib/tmdb";

const paramsSchema = z.object({ mediaType: z.enum(["movie", "tv"]), id: z.coerce.number() });

const detailsQ = (id: number, mediaType: "movie" | "tv") =>
  queryOptions({
    queryKey: ["details", mediaType, id],
    queryFn: () => getDetails({ data: { id, mediaType } }),
  });

export const Route = createFileRoute("/title/$mediaType/$id")({
  staticData: { sitemap: false },
  loader: ({ context, params }) => {
    const { mediaType, id } = paramsSchema.parse(params);
    const q = detailsQ(id, mediaType);
    // Server: wait so the page title/preview card are correct. Browser: navigate instantly,
    // show the skeleton and let the details stream in.
    if (typeof window === "undefined") return context.queryClient.ensureQueryData(q);
    const cached = context.queryClient.getQueryData(q.queryKey);
    if (!cached) void context.queryClient.prefetchQuery(q);
    return cached;
  },
  pendingComponent: TitleSkeleton,
  head: ({ loaderData, params }) => {
    const kind = params.mediaType === "tv" ? "TV show" : "movie";
    const url = `https://playhubz.lovable.app/title/${params.mediaType}/${params.id}`;
    const year = loaderData?.releaseDate ? ` (${String(loaderData.releaseDate).slice(0, 4)})` : "";
    const title = loaderData
      ? `${loaderData.title}${year} — ${kind === "movie" ? "Movie" : "TV Show"} Details & Ratings | PlayHub`
      : `${kind === "movie" ? "Movie" : "TV Show"} #${params.id} — Details & Ratings | PlayHub`;
    const overview = loaderData?.overview?.trim();
    const description = overview
      ? (overview.length > 155 ? `${overview.slice(0, 152).trimEnd()}…` : overview)
      : `Story, cast and community ratings for this ${kind} on PlayHub.`;
    const image = backdropUrl(loaderData?.backdropPath || loaderData?.posterPath || null, "w1280");
    return {
      meta: [
        { title }, { name: "description", content: description },
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { name: "twitter:title", content: title }, { name: "twitter:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: params.mediaType === "tv" ? "video.tv_show" : "video.movie" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: TitleError,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">Title not found.</div>
  ),
  component: TitlePage,
});

function TitleSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-28 md:flex-row md:px-8">
        <div className="aspect-[2/3] w-48 shrink-0 animate-pulse rounded-xl bg-muted md:w-64" />
        <div className="flex-1 space-y-4">
          <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded bg-muted" />
          <div className="h-12 w-64 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

function TitleError() {
  const router = useRouter();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div>
        <p className="text-lg font-semibold text-foreground">Couldn't load this title.</p>
        <button
          onClick={() => router.invalidate()}
          className="mt-4 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function TitlePage() {
  const { mediaType, id } = paramsSchema.parse(Route.useParams());
  const { data } = useSuspenseQuery(detailsQ(id, mediaType));
  const bg = backdropUrl(data.backdropPath || data.posterPath, "original");
  const poster = posterUrl(data.posterPath, "w500");

  const { openPlayer } = usePlayer();
  const isTv = mediaType === "tv";
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [saved, setSaved] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    const sync = () => { inWatchlist(id, mediaType).then(setSaved); };
    sync();
    return subscribeWatchlist(sync);
  }, [id, mediaType]);
  const handleWatchlist = async () => {
    if (!user) {
      toast("Sign in to save titles to your Watchlist");
      navigate({ to: "/auth" });
      return;
    }
    const was = saved;
    setSaved(!was);
    setPulse((n) => n + 1);
    let next: boolean | null;
    try {
      next = await toggleWatchlist({
      id: data.id, title: data.title, overview: data.overview, posterPath: data.posterPath,
      backdropPath: data.backdropPath, releaseDate: data.releaseDate, voteAverage: data.voteAverage,
      mediaType, genreIds: data.genres.map((g) => g.id),
      }, was);
    } catch {
      setSaved(was);
      toast("Couldn't save — try again");
      return;
    }
    if (next === null) {
      setSaved(was);
      toast("Sign in to save titles to your Watchlist");
      navigate({ to: "/auth" });
      return;
    }
    setSaved(next);
  };

  const episodesQ = useQuery({
    queryKey: ["episodes", id, season],
    queryFn: () => getSeasonEpisodes({ data: { id, season } }),
    enabled: isTv,
  });
  const episodes = episodesQ.data ?? [];

  const handleTheatre = async () => {
    if (!user) {
      toast("Sign in to open a theatre");
      navigate({ to: "/auth" });
      return;
    }
    try {
      const code = await createRoom({
        hostId: user.id, mediaType, tmdbId: id, title: data.title,
        ...(isTv ? { season, episode } : {}),
      });
      navigate({ to: "/theatre/$code", params: { code } });
    } catch {
      toast("Could not open a theatre right now");
    }
  };

  const handlePlay = () =>
    openPlayer(
      isTv
        ? { mediaType: "tv", id, season, episode, title: data.title, posterPath: data.posterPath }
        : { mediaType: "movie", id, title: data.title, posterPath: data.posterPath },
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative h-[68vh] min-h-[460px] w-full overflow-hidden">
        {bg && <img src={bg} alt={data.title} className="h-full w-full object-cover object-top" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        <button
          type="button"
          onClick={() => {
            const idx = (window.history.state as { __TSR_index?: number; idx?: number } | null);
            const canBack = (idx?.__TSR_index ?? idx?.idx ?? 0) > 0;
            if (canBack) window.history.back();
            else navigate({ to: "/" });
          }}
          className="pressable absolute left-4 top-20 z-10 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-foreground md:left-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </section>

      <div className="relative z-10 mx-auto -mt-48 max-w-[1600px] px-4 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {poster && (
            <img
              src={poster}
              alt={data.title}
              className="hidden w-56 shrink-0 rounded-2xl shadow-card md:block"
            />
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground md:text-5xl">{data.title}</h1>
            {data.tagline && <p className="mt-2 italic text-muted-foreground">{data.tagline}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {data.voteAverage.toFixed(1)}
              </span>
              <span>{yearOf(data.releaseDate)}</span>
              {data.runtime ? <span>{data.runtime} min</span> : null}
              <div className="flex flex-wrap gap-2">
                {data.genres.map((g) => (
                  <span key={g.id} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            {isTv && data.seasons.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                <Select
                  value={String(season)}
                  onValueChange={(v) => {
                    setSeason(Number(v));
                    setEpisode(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.seasons.map((s) => (
                      <SelectItem key={s.seasonNumber} value={String(s.seasonNumber)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={String(episode)} onValueChange={(v) => setEpisode(Number(v))}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Episode" />
                  </SelectTrigger>
                  <SelectContent>
                    {episodes.map((e) => (
                      <SelectItem key={e.episodeNumber} value={String(e.episodeNumber)}>
                        E{e.episodeNumber} · {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handlePlay}
                className="pressable inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                <Play className="h-4 w-4 fill-current" /> {isTv ? "Play Episode" : "Play"}
              </button>
              <button
                onClick={handleTheatre}
                onPointerEnter={preloadTheatre} onTouchStart={preloadTheatre} onFocus={preloadTheatre}
                className="pressable inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <Clapperboard className="h-4 w-4" /> Theatre
              </button>
              <Link
                to="/theatre"
                className="inline-flex items-center rounded-full px-3 py-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Join with code
              </Link>
              <button
                onClick={handleWatchlist}
                aria-pressed={saved}
                key={pulse ? `wl-${pulse}` : "wl"}
                className={`relative inline-flex ${pulse ? (saved ? "wl-pop" : "wl-shrink") : ""}  items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent`}
              >
                {pulse > 0 && saved && <span aria-hidden className="wl-ring pointer-events-none absolute inset-0 rounded-full" />}
                {saved ? <Check className={`h-4 w-4 text-primary ${pulse ? "wl-icon" : ""}`} /> : <Plus className={`h-4 w-4 ${pulse ? "wl-icon" : ""}`} />}
                {saved ? "In Watchlist" : "Watchlist"}
              </button>
              {data.trailerKey && (
                <button
                  type="button"
                  onClick={() => setShowTrailer(true)}
                  className="pressable inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <Film className="h-4 w-4 text-primary" /> Trailer
                </button>
              )}
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {data.overview}
            </p>

            {data.director && (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="text-foreground">Director:</span> {data.director}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-2xl glass p-6">
          <h2 className="mb-4 text-xl font-bold text-foreground">Community Rating</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            How good is it? Cast your genuine vote — Timepass, Good, or Perfect.
          </p>
          <RatingMeter mediaType={mediaType} tmdbId={id} />
        </div>

        {data.cast.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-foreground">Cast</h2>
            <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
              {data.cast.map((c) => (
                <div key={c.id} className="w-28 shrink-0 text-center">
                  <div className="aspect-square w-28 overflow-hidden rounded-xl bg-muted">
                    {profileUrl(c.profilePath) ? (
                      <img src={profileUrl(c.profilePath)!} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">N/A</div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-10">{data.similar.length > 0 && <ContentRow title="More Like This" items={data.similar} />}</div>

      {showTrailer && data.trailerKey && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 backdrop-blur"
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition-colors"
              aria-label="Close trailer"
            >
              <X className="h-6 w-6" />
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${data.trailerKey}?autoplay=1&rel=0`}
              title={`${data.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
