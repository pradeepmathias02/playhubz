import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Film, Star, Bookmark, LogOut, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MovieCard } from "@/components/MovieCard";
import { useAuth } from "@/hooks/use-auth";
import { loadStats } from "@/lib/profile-stats";
import { getBasic } from "@/lib/tmdb.functions";
import { RATING_LABELS, RATING_COLORS, ratingColor, ratingLabel, type Rating } from "@/lib/ratings";
import type { TmdbItem } from "@/lib/tmdb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "My Profile — PlayHub" },
      { name: "description", content: "Your PlayHub stats: time spent, titles watched and ratings you've given." },
      { property: "og:title", content: "My Profile — PlayHub" },
      { property: "og:description", content: "Your personal PlayHub dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});


function fmt(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}
function ProfilePage() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-24 md:px-8 animate-in fade-in duration-300">
        {!loading && !user ? (
          <div className="mt-10 text-center text-muted-foreground">
            <p>Sign in to see your profile and stats.</p>
            <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Sign in</Link>
          </div>
        ) : user ? <Dashboard userId={user.id} email={user.email ?? ""} joined={user.created_at} /> : (
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4"><div className="h-16 w-16 rounded-full bg-card" /><div className="h-8 w-48 rounded bg-card" /></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-card" />)}</div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Dashboard({ userId, email, joined }: { userId: string; email: string; joined: string }) {
  const { data } = useQuery({ queryKey: ["profile-stats", userId], queryFn: loadStats, staleTime: 30_000 });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const doSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/", replace: true });
  };

  const counts = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  for (const v of data?.votes ?? []) counts[v.rating] = (counts[v.rating] ?? 0) + 1;

  return (
    <>
      <div className="mb-8 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary font-display text-2xl font-bold uppercase text-primary-foreground shadow-glow">
          {email.charAt(0) || "U"}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">My Profile</h1>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          <p className="text-xs text-muted-foreground">Member since {new Date(joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Clock className="h-5 w-5" />} label="Time on PlayHub" value={data ? fmt(data.total) : "…"} sub={data ? `Today ${fmt(data.today)} · Week ${fmt(data.week)}` : ""} />
        <Stat icon={<PlayCircle className="h-5 w-5" />} label="Watch time" value={data ? fmt(data.watch) : "…"} sub="Time in the player" />
        <Stat icon={<Film className="h-5 w-5" />} label="Titles watched" value={data ? String(data.historyCount) : "…"} sub="Movies & shows" />
        <Stat icon={<Bookmark className="h-5 w-5" />} label="Watchlist" value={data ? String(data.watchlistCount) : "…"} sub={<Link to="/watchlist" className="text-primary hover:underline">Open watchlist</Link>} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-foreground"><Star className="h-5 w-5 text-primary" /> Community contribution</h2>
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full glass px-3 py-1 text-foreground">{(data?.votes.length ?? 0).toLocaleString()} {(data?.votes.length ?? 0) === 1 ? "rating" : "ratings"}</span>
          {([1, 2, 3] as Rating[]).map((r) => (
            <span
              key={r}
              className="flex items-center gap-1.5 rounded-full glass px-3 py-1"
              style={{ color: RATING_COLORS[r] }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RATING_COLORS[r] }} />
              {RATING_LABELS[r]} <span className="font-semibold">{counts[r]}</span>
            </span>
          ))}
        </div>
        {data && data.votes.length === 0 && <p className="text-sm text-muted-foreground">You haven't rated anything yet. Open a title and cast your vote.</p>}
        <div className="flex flex-wrap gap-3">
          {(data?.votes ?? []).slice(0, 18).map((v) => (
            <RatedCard key={`${v.media_type}-${v.tmdb_id}`} mediaType={v.media_type as "movie" | "tv"} id={v.tmdb_id} rating={v.rating} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-foreground"><Film className="h-5 w-5 text-primary" /> Recently watched</h2>
        {data && data.history.length === 0 && <p className="text-sm text-muted-foreground">Titles appear here after you watch for at least 2 minutes.</p>}
        <div className="flex flex-wrap gap-3">
          {(data?.history ?? []).slice(0, 30).map((item) => <MovieCard key={`${item.mediaType}-${item.id}`} item={item} />)}
        </div>
      </section>

      <div className="mt-12 flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-full glass px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to sign out of PlayHub?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction onClick={doSignOut}>Yes, sign out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="rounded-2xl glass p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function RatedCard({ mediaType, id, rating }: { mediaType: "movie" | "tv"; id: number; rating: number }) {
  const { data } = useQuery({
    queryKey: ["basic", mediaType, id],
    queryFn: () => getBasic({ data: { id, mediaType } }),
    staleTime: 60 * 60_000,
  });
  if (!data) return <div className="aspect-[2/3] w-[150px] animate-pulse rounded-xl bg-card md:w-[180px]" />;
  return (
    <div className="relative">
      <span
        className="absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-md"
        style={{ backgroundColor: ratingColor(rating) }}
      >
        {ratingLabel(rating)}
      </span>
      <MovieCard item={data as unknown as TmdbItem} />
    </div>
  );
}
