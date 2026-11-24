import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, RefreshCw, ExternalLink, Server } from "lucide-react";
import { buildEmbedUrls, EMBED_PROVIDERS, isMobileDevice, type PlayerTarget } from "@/lib/embed";
import { elapsedToProgress, upsertProgress } from "@/lib/watch-progress";
import { markWatched, setPlayerOpen } from "@/lib/activity";

interface PlayerContextValue {
  openPlayer: (target: PlayerTarget) => void;
  closePlayer: () => void;
  isPlaying: boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<PlayerTarget | null>(null);

  const openPlayer = useCallback((t: PlayerTarget) => setTarget(t), []);
  const closePlayer = useCallback(() => setTarget(null), []);

  const value = useMemo(() => ({ openPlayer, closePlayer, isPlaying: !!target }), [openPlayer, closePlayer, target]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerModal target={target} onClose={closePlayer} />
    </PlayerContext.Provider>
  );
}

function PlayerModal({ target, onClose }: { target: PlayerTarget | null; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);

  // Third-party players may be blocked inside the Lovable editor frame. Detect
  // that case so users can open the requested provider in a normal tab.
  const isFramed = typeof window !== "undefined" && window.self !== window.top;

  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(isMobileDevice()), []);

  const [sourceIndex, setSourceIndex] = useState(0);
  const urls = useMemo(() => (target ? buildEmbedUrls(target) : []), [target]);
  const currentUrl = urls[sourceIndex] ?? urls[0] ?? "";
  const currentProvider = EMBED_PROVIDERS[sourceIndex] ?? { name: `Server ${sourceIndex + 1}` };
  const onBackup = sourceIndex > 0;

  // Reset state whenever a new title is opened.
  useEffect(() => {
    if (target) {
      setLoading(true);
      setExhausted(false);
      setSourceIndex(0);
    }
  }, [target]);

  // Offer reload or a new tab when the sole provider takes too long.
  useEffect(() => {
    if (!target || !loading) return;
    const timer = setTimeout(() => {
      setExhausted(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [target, loading, sourceIndex]);

  function handleIframeError() {
    setLoading(false);
    setExhausted(true);
  }

  // Escape key closes the player.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Account stats: player time, and count a title as watched after 2 minutes open.
  useEffect(() => {
    if (!target) return;
    setPlayerOpen(true);
    const t = setTimeout(() => { void markWatched(target); }, 120_000);
    return () => { clearTimeout(t); setPlayerOpen(false); };
  }, [target]);

  // Approximate "Continue Watching" progress from elapsed time while open.
  useEffect(() => {
    if (!target) return;
    const startedAt = Date.now();

    const save = () => {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      upsertProgress({
        id: target.id,
        mediaType: target.mediaType,
        title: target.title ?? "Untitled",
        posterPath: target.posterPath ?? null,
        season: target.season,
        episode: target.episode,
        progress: elapsedToProgress(elapsedSec),
      });
    };

    // Record immediately so it shows up even on a quick close.
    save();
    const interval = setInterval(save, 15000);
    return () => {
      clearInterval(interval);
      save();
    };
  }, [target]);

  function handleClose() {
    // Stop playback completely by clearing the src before unmounting.
    if (iframeRef.current) iframeRef.current.src = "";
    onClose();
  }

  function reloadSource() {
    setLoading(true);
    setExhausted(false);
    if (iframeRef.current) iframeRef.current.src = currentUrl;
  }

  function switchServer() {
    if (urls.length < 2) return;
    setLoading(true);
    setExhausted(false);
    setSourceIndex((i) => (i + 1) % urls.length);
  }


  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={handleClose}
            aria-label="Close player"
            className="absolute right-4 top-5 sm:right-[30px] sm:top-[20px] z-[10000] text-[2rem] leading-none text-white transition-opacity hover:opacity-70"
          >
            <X className="h-8 w-8" />
          </button>

          <div className="absolute left-4 top-5 sm:left-[30px] sm:top-[24px] z-[10000] flex items-center gap-2">
            <button
              onClick={reloadSource}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Reload</span>
            </button>
            {urls.length > 1 && (
              <button
                onClick={switchServer}
                title="Click to switch streaming server"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">{currentProvider.name}</span>
                {currentProvider.badge && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {currentProvider.badge}
                  </span>
                )}
              </button>
            )}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Open in new tab</span>
            </a>
          </div>

          {isFramed ? (
            // Running inside the editor preview frame. Offer a direct,
            // top-level player link for the requested embed provider.
            <div className="flex w-[90vw] max-w-md flex-col items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-white">
              <p className="text-sm text-white/80">
                The player can't run inside this preview frame. Open it in a new
                tab to watch.
              </p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" /> Open player
              </a>
            </div>
          ) : exhausted ? (
            <div className="flex w-[92vw] max-w-lg flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/90 p-6 text-center text-white backdrop-blur shadow-2xl">
              <p className="text-sm text-white/90 font-medium">
                {EMBED_PROVIDERS.length > 1
                  ? "Server taking too long or blocked? Choose an alternate server:"
                  : "The stream is taking a moment to load. Try reloading or opening in a new tab:"}
              </p>
              {EMBED_PROVIDERS.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {EMBED_PROVIDERS.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setLoading(true);
                        setExhausted(false);
                        setSourceIndex(idx);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        idx === sourceIndex
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {p.name} {p.badge ? `• ${p.badge}` : ""}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={reloadSource}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reload
                </button>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
                </a>
              </div>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-black">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary" />
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary">
                      ▶
                    </div>
                  </div>
                  <span className="text-sm font-medium tracking-wide text-white/80">
                    Loading your stream…
                  </span>
                </div>
              )}

              <iframe
                ref={iframeRef}
                id="player-iframe"
                key={currentUrl}
                src={currentUrl}
                title="PlayHub Player"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="origin"
                onLoad={() => setLoading(false)}
                onError={handleIframeError}
                className="aspect-video max-h-[80vh] w-screen rounded-none sm:rounded-lg border-0 bg-black md:aspect-auto md:h-[80vh] md:w-[90vw]"
              />
              {mobile && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-8 left-1/2 z-[10000] inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
                >
                  <ExternalLink className="h-4 w-4" /> Stuck loading? Play full screen
                </a>
              )}
            </>
          )}

        </motion.div>
      )}
    </AnimatePresence>
  );
}
