// Peer-to-peer voice chat for a theatre room. Signalling runs over the
// realtime channel; audio flows directly between browsers (WebRTC mesh).
import type { RealtimeChannel } from "@supabase/supabase-js";

// STUN finds the public address; the free TURN relay carries audio when two
// networks (mobile data, office wifi) refuse a direct connection.
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

type Signal =
  | { kind: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "hello" };

type Sender = Pick<RealtimeChannel, "send">;

interface Peer {
  pc: RTCPeerConnection;
  sender: RTCRtpSender | null;
  // Fixed slots: [0] voice, [1] screen video, [2] movie audio. Pre-allocated on every
  // link so the host can start/stop sharing with replaceTrack (no renegotiation).
  screenSenders: RTCRtpSender[];
  remoteScreen: MediaStream;
  audio: HTMLAudioElement;
  pending: RTCIceCandidateInit[];
  queue: Promise<void>;
  retry?: ReturnType<typeof setTimeout>;
}

export class VoiceMesh {
  private peers = new Map<string, Peer>();
  private track: MediaStreamTrack | null = null;
  private screen: { video: MediaStreamTrack | null; audio: MediaStreamTrack | null } = { video: null, audio: null };
  /** Called with a peer's screen stream (video + movie audio) once tracks arrive. */
  onScreen?: (from: string, stream: MediaStream) => void;
  private speakerOn = true;
  private destroyed = false;
  private unlock = () => this.resumeAudio();

  constructor(private me: string, private channel: Sender) {
    // Browsers block audio until the user taps; retry playback on any tap.
    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.unlock);
      window.addEventListener("keydown", this.unlock);
    }
  }

  private send(to: string, data: Signal) {
    void this.channel.send({ type: "broadcast", event: "signal", payload: { from: this.me, to, data } });
  }

  private resumeAudio() {
    if (!this.speakerOn) return;
    for (const p of this.peers.values()) if (p.audio.srcObject && p.audio.paused) void p.audio.play().catch(() => {});
  }

  private drop(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    clearTimeout(p.retry);
    p.pc.close();
    p.audio.srcObject = null;
    p.audio.remove();
    this.peers.delete(id);
  }

  private ensurePeer(id: string, initiator = false): Peer {
    const existing = this.peers.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection(ICE);
    // Only the caller creates the audio slot; the answerer adopts the one in the offer,
    // otherwise its microphone would sit on an unused second slot and never be heard.
    let sender: RTCRtpSender | null = null;
    let screenSenders: RTCRtpSender[] = [];
    if (initiator) {
      const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      sender = transceiver.sender;
      if (this.track) void sender.replaceTrack(this.track);
      const v = pc.addTransceiver("video", { direction: "sendrecv" });
      const a = pc.addTransceiver("audio", { direction: "sendrecv" });
      screenSenders = [v.sender, a.sender];
      this.applyScreen(screenSenders);
    }
    const remoteScreen = new MediaStream();
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "");
    audio.muted = !this.speakerOn;
    audio.style.display = "none";
    document.body.appendChild(audio);
    pc.ontrack = (e) => {
      const slot = pc.getTransceivers().indexOf(e.transceiver);
      if (slot <= 0) {
        audio.srcObject = new MediaStream([e.track]);
        if (this.speakerOn) void audio.play().catch(() => {});
      } else {
        remoteScreen.addTrack(e.track);
        this.onScreen?.(id, remoteScreen);
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send(id, { kind: "ice", candidate: e.candidate.toJSON() });
    };
    const peer: Peer = { pc, sender, screenSenders, remoteScreen, audio, pending: [], queue: Promise.resolve() };
    pc.onconnectionstatechange = () => {
      // A failed link is rebuilt from scratch instead of staying silent forever.
      if (pc.connectionState === "failed" && !this.destroyed) {
        this.drop(id);
        if (this.me < id) void this.call(id);
        else this.send(id, { kind: "hello" });
      }
    };
    this.peers.set(id, peer);
    return peer;
  }

  private async call(id: string) {
    const peer = this.ensurePeer(id, true);
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    this.send(id, { kind: "offer", sdp: offer });
    // If the offer or answer got lost, try again.
    clearTimeout(peer.retry);
    peer.retry = setTimeout(() => {
      if (this.peers.get(id) === peer && peer.pc.signalingState === "have-local-offer") {
        this.drop(id);
        void this.call(id);
      }
    }, 6000);
  }

  /** Call with the current member list; the smaller id starts each connection. */
  async syncMembers(ids: string[]) {
    const others = new Set(ids.filter((i) => i !== this.me));
    for (const id of [...this.peers.keys()]) if (!others.has(id)) this.drop(id);
    for (const id of others) {
      if (this.peers.has(id)) continue;
      if (this.me < id) await this.call(id);
      else this.send(id, { kind: "hello" }); // ask the other side to (re)call us
    }
  }

  handleSignal(from: string, data: Signal) {
    if (this.destroyed) return Promise.resolve();
    if (data.kind === "hello") {
      if (this.me < from) {
        const p = this.peers.get(from);
        if (!p || p.pc.connectionState === "failed" || p.pc.connectionState === "closed") {
          this.drop(from);
          return this.call(from);
        }
      }
      return Promise.resolve();
    }
    if (data.kind === "offer") {
      // A fresh offer means the other side restarted; start clean.
      const old = this.peers.get(from);
      if (old && old.pc.signalingState !== "stable") this.drop(from);
      else if (old && old.pc.remoteDescription) this.drop(from);
    }
    const peer = this.ensurePeer(from);
    // Process signals one at a time so ICE candidates never race the offer/answer.
    peer.queue = peer.queue.then(() => this.process(peer, from, data)).catch(() => {});
    return peer.queue;
  }

  private async process(peer: Peer, from: string, data: Signal) {
    const { pc } = peer;
    if (data.kind === "offer") {
      await pc.setRemoteDescription(data.sdp);
      const ts = pc.getTransceivers();
      for (const x of ts) x.direction = "sendrecv";
      if (ts[0]) {
        peer.sender = ts[0].sender;
        if (this.track) await ts[0].sender.replaceTrack(this.track);
      }
      if (ts[1] && ts[2]) {
        peer.screenSenders = [ts[1].sender, ts[2].sender];
        this.applyScreen(peer.screenSenders);
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send(from, { kind: "answer", sdp: answer });
    } else if (data.kind === "answer") {
      if (pc.signalingState !== "have-local-offer") return;
      await pc.setRemoteDescription(data.sdp);
      clearTimeout(peer.retry);
    } else if (data.kind === "ice") {
      if (!pc.remoteDescription) { peer.pending.push(data.candidate); return; }
      await pc.addIceCandidate(data.candidate).catch(() => {});
      return;
    } else return;
    for (const c of peer.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});
  }

  async setMic(on: boolean): Promise<boolean> {
    if (on && !this.track) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.track = stream.getAudioTracks()[0] ?? null;
      for (const p of this.peers.values()) if (p.sender) await p.sender.replaceTrack(this.track);
    }
    if (this.track) this.track.enabled = on;
    this.resumeAudio();
    return on;
  }

  private applyScreen(senders: RTCRtpSender[]) {
    if (senders.length < 2) return;
    void senders[0].replaceTrack(this.screen.video).catch(() => {});
    void senders[1].replaceTrack(this.screen.audio).catch(() => {});
  }

  /** Host only: send this stream (shared tab) to everyone, or null to stop. */
  setScreen(stream: MediaStream | null) {
    this.screen = { video: stream?.getVideoTracks()[0] ?? null, audio: stream?.getAudioTracks()[0] ?? null };
    for (const p of this.peers.values()) this.applyScreen(p.screenSenders);
  }

  /** The screen stream received from a given peer (may have no live tracks). */
  screenFrom(id: string): MediaStream | null {
    for (const [k, p] of this.peers) if (k.startsWith(id + ":") || k === id) return p.remoteScreen;
    return null;
  }

  setSpeaker(on: boolean) {
    this.speakerOn = on;
    for (const p of this.peers.values()) {
      p.audio.muted = !on;
      if (on) void p.audio.play().catch(() => {});
    }
  }

  /** For diagnostics/tests. */
  stats() {
    return [...this.peers.entries()].map(([id, p]) => ({ id, state: p.pc.connectionState, hasAudio: !!p.audio.srcObject }));
  }

  destroy() {
    this.destroyed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.unlock);
      window.removeEventListener("keydown", this.unlock);
    }
    for (const id of [...this.peers.keys()]) this.drop(id);
    this.track?.stop();
    this.track = null;
  }
}
