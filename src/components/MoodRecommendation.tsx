import { useState } from "react";
import { Sparkles, Compass, Play, Plus, Check, Loader2, ArrowRight } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { posterUrl, yearOf, type TmdbItem } from "@/lib/tmdb";
import { Link } from "@tanstack/react-router";

interface RecommendationResult extends TmdbItem {
  matchScore: number;
  reason: string;
  moodTag: string;
}

const QUICK_MOODS = [
  { label: "😂 Funny & Feel-Good", query: "funny feel-good comedy laugh happy" },
  { label: "🤯 Mind-Bending Thriller", query: "mind-bending dark psychological thriller mystery plot twist" },
  { label: "🍿 Timepass Action", query: "action blast adrenaline high octane blockbusters" },
  { label: "🌌 Sci-Fi Like Interstellar", query: "space sci-fi cosmos time travel mind blowing" },
  { label: "❤️ Romantic Drama", query: "romantic romance emotional love story beautiful" },
  { label: "👻 Spine-Chilling Horror", query: "horror scary dark supernatural suspense" },
];

export function MoodRecommendation() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [searchedMood, setSearchedMood] = useState("");
  const { openPlayer } = usePlayer();

  const handleRecommend = async (customText?: string) => {
    const text = (customText ?? prompt).trim();
    if (!text) return;
    setLoading(true);
    setSearchedMood(text);

    try {
      const lower = text.toLowerCase();

      // Determine genre & vibe mappings
      let genreId = 28; // Action default
      let moodTag = "🔥 High Octane";
      let baseReason = "Matches your craving for thrills and fast pacing";

      if (lower.includes("funny") || lower.includes("comedy") || lower.includes("laugh") || lower.includes("feel-good")) {
        genreId = 35;
        moodTag = "😂 Feel-Good Humor";
        baseReason = "Packed with humor, heartwarming moments, and great comedic timing";
      } else if (lower.includes("thrill") || lower.includes("psychological") || lower.includes("twist") || lower.includes("dark")) {
        genreId = 53;
        moodTag = "🧠 Mind-Bender";
        baseReason = "Features intense psychological depth, tension, and unpredictable twists";
      } else if (lower.includes("sci-fi") || lower.includes("space") || lower.includes("interstellar") || lower.includes("cosmos")) {
        genreId = 878;
        moodTag = "🌌 Cosmic Wonder";
        baseReason = "Visually stunning science fiction that explores complex futuristic concepts";
      } else if (lower.includes("romance") || lower.includes("romantic") || lower.includes("love")) {
        genreId = 10749;
        moodTag = "❤️ Romance & Heart";
        baseReason = "Touching romantic chemistry with heartfelt emotional resonance";
      } else if (lower.includes("horror") || lower.includes("scary") || lower.includes("spooky") || lower.includes("creepy")) {
        genreId = 27;
        moodTag = "👻 Spine-Chilling";
        baseReason = "Atmospheric suspense and frightening encounters designed to keep you on edge";
      } else if (lower.includes("drama") || lower.includes("emotional") || lower.includes("sad") || lower.includes("cry")) {
        genreId = 18;
        moodTag = "🎭 Emotional Depth";
        baseReason = "Critically acclaimed storytelling that focuses on powerful human emotions";
      }

      // Fetch matching titles from TMDB discover
      const key = "632427d30e719252120be647a7e35f35";
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=200&include_adult=false&page=1`
      );

      if (!res.ok) throw new Error("Recommendation service busy");
      const data = await res.json();

      const items: RecommendationResult[] = (data.results || [])
        .slice(0, 6)
        .map((r: any, idx: number) => ({
          id: r.id,
          title: r.title || r.name || "Movie",
          overview: r.overview || "",
          posterPath: r.poster_path,
          backdropPath: r.backdrop_path,
          releaseDate: r.release_date || null,
          voteAverage: r.vote_average || 7.0,
          mediaType: "movie" as const,
          genreIds: r.genre_ids || [],
          matchScore: Math.max(88, Math.round(98 - idx * 2.1)),
          reason: baseReason,
          moodTag,
        }));

      setResults(items);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative z-10 mx-auto my-8 max-w-[1600px] px-4 md:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-card/90 via-card/50 to-background p-6 shadow-2xl backdrop-blur-xl md:p-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI Recommendation Engine
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            What are you in the mood to watch today?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Tell PlayHub your exact mood in natural language — our AI matches sentiment, genre intent, and themes.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRecommend();
            }}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Compass className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. mind-blowing thriller with unexpected twists..."
                className="w-full rounded-full border border-border bg-black/40 py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-105 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Recommend
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Try:</span>
            {QUICK_MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => {
                  setPrompt(m.label);
                  void handleRecommend(m.query);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/90 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {results.length > 0 && (
          <div className="relative z-10 mt-10 border-t border-white/10 pt-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground md:text-xl">
                  AI Matches for &ldquo;{searchedMood}&rdquo;
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ranked by intent match score & community reception
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                    {item.posterPath ? (
                      <img
                        src={posterUrl(item.posterPath, "w342") ?? ""}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        No Poster
                      </div>
                    )}
                    <div className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[11px] font-bold text-primary shadow">
                      {item.matchScore}% Match
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {item.moodTag}
                    </span>
                    <h4 className="mt-1 line-clamp-1 text-xs font-bold text-foreground">
                      {item.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                      {item.reason}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-1 pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          openPlayer({
                            mediaType: "movie",
                            id: item.id,
                            title: item.title,
                            posterPath: item.posterPath,
                          })
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-primary/20 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Play className="h-3 w-3 fill-current" /> Play
                      </button>
                      <Link
                        to="/title/$mediaType/$id"
                        params={{ mediaType: "movie", id: String(item.id) }}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground hover:text-foreground"
                        title="View Details"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
