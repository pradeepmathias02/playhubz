import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { rankByMatch } from "@/lib/fuzzy";
import { Search, Loader2, Bookmark, User as UserIcon } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { searchContent } from "@/lib/tmdb.functions";
import { posterUrl, yearOf } from "@/lib/tmdb";
import { loadStats } from "@/lib/profile-stats";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [active, setActive] = useState(-1);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 120);
    return () => window.clearTimeout(t);
  }, [query]);
  const { data: live, isFetching } = useQuery({
    queryKey: ["search-quick", debounced],
    queryFn: () => searchContent({ data: { query: debounced, quick: true } }),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  const typed = query.trim();
  const suggestions = useMemo(
    () => (typed.length >= 2 && live ? rankByMatch(typed, live.results).slice(0, 6) : []),
    [typed, live],
  );
  useEffect(() => setActive(-1), [typed]);
  const openItem = (s: { mediaType: "movie" | "tv"; id: number }) => {
    setOpen(false); setQuery("");
    navigate({ to: "/title/$mediaType/$id", params: { mediaType: s.mediaType, id: String(s.id) } });
  };

  // Warm the other pages once the browser is idle so switching feels instant.
  useEffect(() => {
    const warm = () => {
      void router.preloadRoute({ to: "/upcoming" }).catch(() => undefined);
      void router.preloadRoute({ to: "/watchlist" }).catch(() => undefined);
      void router.preloadRoute({ to: "/" }).catch(() => undefined);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(warm) : window.setTimeout(warm, 1500);
    return () => { if (!w.requestIdleCallback) window.clearTimeout(id); };
  }, [router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) return openItem(suggestions[active]);
    const q = query.trim();
    setOpen(false);
    if (q) navigate({ to: "/search", search: { q } });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-3 md:gap-6 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="PlayHub home">
          <BrandLogo className="w-24 sm:w-32 md:w-40" />
        </Link>

        <nav className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground md:gap-5">
          <Link
            to="/upcoming"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Upcoming
          </Link>
          <Link
            to="/watchlist"
            aria-label="My Watchlist"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden md:inline">Watchlist</span>
          </Link>
        </nav>

        <form onSubmit={submit} className="relative ml-auto flex min-w-0 items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-full glass px-3 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
                else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search…"
              aria-label="Search movies and shows"
              className="w-20 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:w-32 md:w-56"
            />
            {isFetching && typed.length >= 2 && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
          </div>
          {open && suggestions.length > 0 && (
            <ul onMouseDown={(e) => e.preventDefault()} className="absolute right-0 top-full mt-2 w-72 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {suggestions.map((s, i) => (
                <li key={`${s.mediaType}-${s.id}`}>
                  <Link
                    to="/title/$mediaType/$id"
                    params={{ mediaType: s.mediaType, id: String(s.id) }}
                    onClick={(e) => { e.preventDefault(); openItem(s); }}
                    className={`flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent ${i === active ? "bg-accent" : ""}`}
                  >
                    {s.posterPath ? <img src={posterUrl(s.posterPath, "w92") ?? ""} alt="" className="h-12 w-8 rounded object-cover" loading="lazy" /> : <span className="h-12 w-8 rounded bg-muted" />}
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className="text-xs text-muted-foreground">{yearOf(s.releaseDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </form>

        {user ? (
          <Link
            to="/profile"
            aria-label="My profile"
            title="My profile"
            onMouseEnter={() => void qc.prefetchQuery({ queryKey: ["profile-stats", user.id], queryFn: loadStats, staleTime: 30_000 })}
            onTouchStart={() => void qc.prefetchQuery({ queryKey: ["profile-stats", user.id], queryFn: loadStats, staleTime: 30_000 })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary font-display text-sm font-bold uppercase text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            {(user.email ?? "U").charAt(0)}
          </Link>
        ) : (
          <Link
            to="/auth"
            aria-label="Sign in"
            className="flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 md:h-auto md:w-auto md:px-4 md:py-1.5"
          >
            <UserIcon className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Sign in</span>
          </Link>
        )}
      </div>
    </header>
  );
}
