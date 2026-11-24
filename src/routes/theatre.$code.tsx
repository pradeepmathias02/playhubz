import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { type View } from "@/components/theatre/TheatreScene";
import { SafeTheatreScene } from "@/components/theatre/SafeTheatreScene";
import { toast } from "sonner";
import { ArrowLeft, Copy, Maximize2, Minimize2, Lightbulb, Mic, MicOff, Pause, Play, Users, Volume2, VolumeX, RotateCcw, Expand, Shrink, Server } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cachedRoom, findRoom, type TheatreRoom } from "@/lib/theatre";
import { VoiceMesh } from "@/lib/theatre-voice";
import { buildEmbedUrls } from "@/lib/embed";
import { getDetails } from "@/lib/tmdb.functions";
import { backdropUrl } from "@/lib/tmdb";

export const Route = createFileRoute("/theatre/$code")({
  ssr: false,
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Virtual Theatre — PlayHub" },
      { name: "description", content: "A 3D virtual cinema room on PlayHub: watch together, look around and talk with friends." },
      { property: "og:title", content: "Virtual Theatre — PlayHub" },
      { property: "og:description", content: "Join my PlayHub theatre and watch together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TheatrePage,
});

interface Show { started: boolean; paused: boolean; pos: number; at: number }
interface Member { id: string; name: string; mic: boolean; host: boolean; show?: Show }
const IDLE: Show = { started: false, paused: false, pos: 0, at: 0 };
// Seconds into the movie right now, given the host's last show state.
const showPosition = (s: Show) => Math.max(0, Math.round(s.pos + (s.started && !s.paused ? (Date.now() - s.at) / 1000 : 0)));

function TheatrePage() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const [room, setRoom] = useState<TheatreRoom | null | undefined>(() => cachedRoom(code));

  useEffect(() => {
    if (!user || cachedRoom(code)) return;
    findRoom(code).then(setRoom).catch(() => setRoom(null));
  }, [code, user]);

  if (!loading && !user) {
    return (
      <Centered>
        <p className="text-foreground">Sign in to enter this theatre.</p>
        <Link to="/auth" className="mt-4 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Sign in</Link>
      </Centered>
    );
  }
  if (room && user) return <Theatre room={room} userId={user.id} userName={(user.email ?? "Guest").split("@")[0]} />;
  if (room === undefined || !user) return <Centered><p className="text-muted-foreground">Opening the doors…</p></Centered>;
  if (room === null) {
    return (
      <Centered>
        <p className="text-foreground">No theatre with code {code}.</p>
        <Link to="/theatre" className="mt-4 text-primary underline">Try another code</Link>
      </Centered>
    );
  }
  return <Theatre room={room} userId={user.id} userName={(user.email ?? "Guest").split("@")[0]} />;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">{children}</div>;
}

function Theatre({ room, userId, userName }: { room: TheatreRoom; userId: string; userName: string }) {
  const isHost = room.host_id === userId;
  const [show, setShow] = useState<Show>(IDLE);
  const [synced, setSynced] = useState(false);
  const started = show.started;
  const [ready, setReady] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [mic, setMic] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  useEffect(() => {
    getDetails({ data: { id: room.tmdb_id, mediaType: room.media_type === "tv" ? "tv" : "movie" } })
      .then((d) => setBackdrop(backdropUrl(d.backdropPath, "w1280"))).catch(() => {});
  }, [room.tmdb_id, room.media_type]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const voiceRef = useRef<VoiceMesh | null>(null);
  const voiceIdRef = useRef("");
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const shareRef = useRef<MediaStream | null>(null);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ mic: false, show: IDLE });
  stateRef.current = { mic, show };

  // Realtime: presence (members), show control, voice signalling.
  useEffect(() => {
    const channel = supabase.channel(`theatre-${room.code}`, {
      config: { presence: { key: userId }, broadcast: { self: false } },
    });
    // Each tab gets its own voice id so a second tab of the same account can't hijack the audio link.
    const voiceId = `${userId}:${Math.random().toString(36).slice(2, 10)}`;
    const voice = new VoiceMesh(voiceId, channel);
    voiceIdRef.current = voiceId;
    // Newer host states win; an older delayed message never rolls a guest back.
    const applyShow = (s: Show) => {
      setSynced(true);
      setShow((cur) => (s.at < cur.at ? cur : cur.at === s.at && cur.started === s.started && cur.paused === s.paused ? cur : s));
    };
    const sendShow = () => {
      void channel.send({ type: "broadcast", event: "show", payload: { from: userId, show: stateRef.current.show } });
    };
    channelRef.current = channel;
    voiceRef.current = voice;
    voice.onScreen = (from, stream) => {
      if (!isHost && from.startsWith(room.host_id + ":")) setHostStream(stream);
    };

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Omit<Member, "id">>();
        const list: Member[] = Object.entries(state).map(([id, metas]) => ({ id, ...metas[metas.length - 1] }));
        setMembers(list);
        // The host may have several tabs; trust the newest show state, not the first entry.
        const hostMetas = (state[room.host_id] ?? []) as { show?: Show }[];
        const newest = hostMetas.map((m) => m.show).filter((x): x is Show => !!x).sort((a, b) => b.at - a.at)[0];
        if (!isHost && newest) applyShow(newest);
        if (isHost) sendShow();
        void voice.syncMembers(Object.values(state).flatMap((metas) => (metas as { vid?: string }[]).map((m) => m.vid).filter((v): v is string => !!v)));
      })
      .on("broadcast", { event: "show" }, ({ payload }) => {
        if (isHost || payload.from !== room.host_id) return; // only the host drives the show
        applyShow(payload.show as Show);
      })
      .on("broadcast", { event: "need-state" }, () => {
        if (isHost) sendShow();
      })
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        if (payload.to === voiceId) void voice.handleSignal(payload.from, payload.data);
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        void channel.track({ vid: voiceId, name: userName, mic: false, host: isHost, show: isHost ? stateRef.current.show : undefined });
        if (!isHost) {
          void channel.send({ type: "broadcast", event: "need-state", payload: { from: userId } });
          // Ask again shortly in case the host was still connecting.
          setTimeout(() => void channel.send({ type: "broadcast", event: "need-state", payload: { from: userId } }), 1500);
        }
      });

    return () => {
      voice.destroy();
      void supabase.removeChannel(channel);
    };
  }, [room.code, room.host_id, userId, userName, isHost]);

  const retrack = (patch: Partial<{ mic: boolean; show: Show }>) => {
    const s = { ...stateRef.current, ...patch };
    void channelRef.current?.track({ vid: voiceIdRef.current, name: userName, mic: s.mic, host: isHost, show: isHost ? s.show : undefined });
  };

  const publish = (next: Show) => {
    if (!isHost) return;
    setShow(next);
    void channelRef.current?.send({ type: "broadcast", event: "show", payload: { from: userId, show: next } });
    retrack({ show: next });
  };
  const stopShare = () => {
    shareRef.current?.getTracks().forEach((t) => t.stop());
    shareRef.current = null;
    voiceRef.current?.setScreen(null);
  };
  // Start show begins immediately; streaming to friends is a separate, optional step.
  const toggleShow = () => {
    if (started) { stopShare(); setSharing(false); publish({ ...IDLE, at: Date.now() }); return; }
    publish({ started: true, paused: false, pos: 0, at: Date.now() });
  };
  const [sharing, setSharing] = useState(false);
  // One projector: the host's tab is captured and streamed to everyone over the room link.
  const startShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast("Streaming to friends needs Chrome or Edge on a laptop/desktop.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, height: { ideal: 720 } },
        audio: { suppressLocalAudioPlayback: false } as MediaTrackConstraints,
        preferCurrentTab: true, selfBrowserSurface: "include", systemAudio: "exclude",
      } as DisplayMediaStreamOptions);
    } catch {
      return;
    }
    shareRef.current = stream;
    setSharing(true);
    const vt = stream.getVideoTracks()[0];
    vt.contentHint = "motion";
    vt.addEventListener("ended", () => { if (shareRef.current === stream) { stopShare(); setSharing(false); } });
    voiceRef.current?.setScreen(stream);
    setTimeout(async () => {
      const el = playerBoxRef.current;
      const w = window as unknown as { RestrictionTarget?: { fromElement(e: Element): Promise<unknown> }; CropTarget?: { fromElement(e: Element): Promise<unknown> } };
      const t = vt as unknown as { restrictTo?(x: unknown): Promise<void>; cropTo?(x: unknown): Promise<void> };
      try {
        if (el && w.RestrictionTarget && t.restrictTo) await t.restrictTo(await w.RestrictionTarget.fromElement(el));
        else if (el && w.CropTarget && t.cropTo) await t.cropTo(await w.CropTarget.fromElement(el));
      } catch { /* full-tab capture still works */ }
    }, 600);
  };
  useEffect(() => () => stopShare(), []);
  // Host re-sends the show state so everyone converges, even after a dropped message.
  useEffect(() => {
    if (!isHost) return;
    const t = setInterval(() => {
      const s = stateRef.current.show;
      void channelRef.current?.send({ type: "broadcast", event: "show", payload: { from: userId, show: s } });
    }, 3000);
    return () => clearInterval(t);
  }, [isHost, userId]);
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t); }, []);

  const toggleMic = async () => {
    try {
      const next = await voiceRef.current!.setMic(!mic);
      setMic(next);
      retrack({ mic: next });
    } catch {
      toast("Microphone access was blocked. Allow it in your browser settings.");
    }
  };

  const toggleSpeaker = () => {
    voiceRef.current?.setSpeaker(!speaker);
    setSpeaker(!speaker);
  };

  // Look around: drag, touch, arrow keys. The 3D camera eases toward this target every frame.
  const view = useRef<View>({ yaw: 0, pitch: 0 });
  const rotate = (dYaw: number, dPitch: number) => {
    const v = view.current;
    v.yaw += dYaw;
    v.pitch = Math.max(-35, Math.min(35, v.pitch + dPitch));
  };
  const resetView = () => { view.current = { yaw: 0, pitch: 0 }; };
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoomed) return;
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    rotate(dx * 0.25, -dy * 0.2);
  };
  const onPointerUp = () => { drag.current = null; };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") rotate(-6, 0);
      if (e.key === "ArrowRight") rotate(6, 0);
      if (e.key === "ArrowUp") rotate(0, 4);
      if (e.key === "ArrowDown") rotate(0, -4);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [sourceIndex, setSourceIndex] = useState(0);
  const embedUrls = buildEmbedUrls({
    mediaType: room.media_type === "tv" ? "tv" : "movie",
    id: room.tmdb_id,
    season: room.season ?? undefined,
    episode: room.episode ?? undefined,
  });
  const baseSrc = embedUrls[sourceIndex] ?? embedUrls[0];
  // Fixed per play/resume segment (keyed on show.at) so the iframe doesn't reload on re-render.
  const startAt = showPosition(show);
  const src = baseSrc;
  void startAt;
  const playing = started;

  // Real browser full screen; HUD auto-hides after 3s idle while in it.
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setCanFullscreen(!!document.documentElement.requestFullscreen);
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const wake = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 3000);
  };
  useEffect(() => { if (fullscreen) wake(); else setIdle(false); }, [fullscreen]);
  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen().catch(() => toast("Full screen isn't available here."));
  };

  const copyCode = () => {
    void navigator.clipboard?.writeText(room.code);
    toast(`Code ${room.code} copied — share it with friends`);
  };

  const dark = playing;
  const screen = (
    <>
            {playing ? (
              <>
                {isHost ? (
                  <div ref={playerBoxRef} className="h-full w-full">
                    <iframe src={src} title={room.title} className="h-full w-full border-0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="origin" />
                  </div>
                ) : (
                  <HostScreen stream={hostStream} />
                )}
              </>
            ) : started ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[hsl(0_0%_8%)] text-center">
                <p className="text-6xl font-bold text-foreground">Intermission</p>
                <p className="mt-6 text-2xl text-muted-foreground">{isHost ? "Press Resume to continue for everyone" : "The host paused the show"}</p>
              </div>
            ) : (
              <div className="relative flex h-full w-full flex-col items-center justify-end bg-[hsl(0_0%_8%)] bg-cover bg-center pb-24 text-center"
                style={backdrop ? { backgroundImage: `linear-gradient(to top, hsl(0 0% 0% / .85), hsl(0 0% 0% / .1) 60%), url(${backdrop})` } : undefined}>
                <p className="text-2xl uppercase tracking-[0.4em] text-muted-foreground">Now showing</p>
                <p className="mt-4 px-10 text-6xl font-bold text-foreground">{room.title}</p>
                <p className="mt-6 text-2xl text-muted-foreground">{isHost ? "Press Start Show when everyone is seated" :  synced ? "Waiting for the host to start the show…" : "Syncing with host…"}</p>
              </div>
            )}
              </>
  );

  const hudHidden = fullscreen && idle;
  return (
    <div ref={rootRef} onPointerMove={wake} onPointerDown={wake}
      className="fixed inset-0 select-none overflow-hidden bg-[hsl(0_0%_2%)] transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0, cursor: hudHidden ? "none" : undefined }}>
      <div className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <SafeTheatreScene dark={dark} zoomed={zoomed} viewRef={view} screen={screen} />
      </div>

      <div className={`transition-opacity duration-500 ${hudHidden ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 md:p-4">
        <Link to="/" className="pointer-events-auto inline-flex items-center gap-1 rounded-full glass px-3 py-2 text-sm text-foreground">
          <ArrowLeft className="h-4 w-4" /> Leave
        </Link>
        <button onClick={copyCode} className="pointer-events-auto inline-flex items-center gap-2 rounded-full glass px-4 py-2 font-mono text-sm tracking-widest text-foreground">
          {room.code} <Copy className="h-4 w-4" />
        </button>
        <div className="pointer-events-auto rounded-2xl glass px-3 py-2 text-xs text-foreground">
          <div className="mb-1 flex items-center gap-1 font-semibold"><Users className="h-3.5 w-3.5" /> {members.length} in theatre</div>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-1 text-muted-foreground">
              {m.mic ? <Mic className="h-3 w-3 text-primary" /> : <MicOff className="h-3 w-3" />}
              <span className="max-w-[90px] truncate">{m.host ? "Host ★" : "Guest"}{m.id === userId ? " (you)" : ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 p-4">
        <HudButton onClick={toggleMic} active={mic} label={mic ? "Mute mic" : "Unmute mic"}>
          {mic ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </HudButton>
        <HudButton onClick={toggleSpeaker} active={speaker} label={speaker ? "Mute friends" : "Hear friends"}>
          {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </HudButton>
        <HudButton onClick={() => { view.current = { yaw: 0, pitch: 0 }; setZoomed((z) => !z); }} active={zoomed} label={zoomed ? "Exit zoom" : "Zoom to screen"}>
          {zoomed ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </HudButton>
        <HudButton onClick={() => { setZoomed(false); resetView(); }} label="Face the screen">
          <RotateCcw className="h-5 w-5" />
        </HudButton>
        {isHost && embedUrls.length > 1 && (
          <HudButton onClick={() => setSourceIndex((i) => (i + 1) % embedUrls.length)} active={sourceIndex > 0} label={sourceIndex > 0 ? "Back to main server" : "Switch to backup server"}>
            <Server className="h-5 w-5" />
          </HudButton>
        )}
        {canFullscreen && (
          <HudButton onClick={toggleFullscreen} active={fullscreen} label={fullscreen ? "Exit full screen" : "Full screen"}>
            {fullscreen ? <Shrink className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
          </HudButton>
        )}
        {isHost && started && members.length > 1 && !sharing && (
          <button onClick={startShare} className="rounded-full glass px-4 py-2 text-xs font-medium text-foreground">Show my screen to friends</button>
        )}
        {!isHost && started && <span className="rounded-full glass px-4 py-2 text-xs text-muted-foreground">Watching the host's screen live</span>}
        {isHost && (
          <button onClick={toggleShow} className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            {started ? <><Lightbulb className="h-4 w-4" /> Lights on</> : <><Play className="h-4 w-4 fill-current" /> Start show</>}
          </button>
        )}
        <p className="w-full text-center text-xs text-muted-foreground">{zoomed ? "Zoomed in — press the zoom button again to look around" : "Drag or use arrow keys to look around"}</p>
      </div>
      </div>
    </div>
  );
}

function HudButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${active ? "bg-primary text-primary-foreground" : "glass text-foreground"}`}>
      {children}
    </button>
  );
}

/** Guests watch the host's live screen: one projector, same frame for everyone. */
function HostScreen({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    const v = ref.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    const check = () => setLive(stream.getVideoTracks().some((t) => t.readyState === "live" && !t.muted));
    const play = () => v.play().then(() => setNeedTap(false)).catch(() => { v.muted = true; setNeedTap(true); void v.play().catch(() => {}); });
    check(); void play();
    const tracks = stream.getTracks();
    tracks.forEach((t) => { t.addEventListener("unmute", check); t.addEventListener("mute", check); });
    stream.addEventListener("addtrack", () => { check(); void play(); });
    const iv = setInterval(check, 1000);
    return () => { clearInterval(iv); tracks.forEach((t) => { t.removeEventListener("unmute", check); t.removeEventListener("mute", check); }); };
  }, [stream]);
  useEffect(() => { if (ref.current) ref.current.volume = volume; }, [volume]);
  return (
    <div className="relative h-full w-full bg-[hsl(0_0%_2%)]" data-host-screen={live ? "live" : "waiting"}>
      <video ref={ref} autoPlay playsInline className="h-full w-full object-contain" style={{ opacity: live ? 1 : 0 }} />
      {!live && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-muted-foreground">Waiting for the host's screen…</div>
      )}
      {needTap && live && (
        <button type="button" onClick={() => { if (ref.current) { ref.current.muted = false; void ref.current.play(); } setNeedTap(false); }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-primary px-8 py-4 text-2xl font-semibold text-primary-foreground">Tap for movie sound</button>
      )}
      <label className="absolute bottom-4 right-4 flex items-center gap-3 rounded-full bg-[hsl(0_0%_0%/0.5)] px-4 py-2 text-lg text-foreground opacity-40 transition-opacity hover:opacity-100">
        Movie volume
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </label>
    </div>
  );
}
