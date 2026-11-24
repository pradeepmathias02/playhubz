// Real WebGL auditorium (React Three Fiber). The movie screen itself stays a DOM
// element synced by a CSS-3D camera so the host's player iframe / guest video work.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface View { yaw: number; pitch: number }

// World units ≈ metres. Screen faces +z; the viewer sits in a seat in the back row.
const ROOM_W = 26, ROOM_H = 13, FRONT = -15, BACK = 10;
const SCREEN_W = 18.5, SCREEN_H = (SCREEN_W * 9) / 16, SCREEN_Y = 7.1, SCREEN_Z = FRONT + 0.9;
const ROWS = 5, PER_ROW = 14, ROW_GAP = 2.3, ROW_RISE = 0.45, FIRST_ROW_Z = -3.2;
const seatX = (i: number) => (i - (PER_ROW - 1) / 2) * 1.05 + (i >= PER_ROW / 2 ? 0.6 : -0.6);
const MY_SEAT = PER_ROW / 2; // first seat right of the aisle, last row
const EYE = new THREE.Vector3(seatX(MY_SEAT), (ROWS - 1) * ROW_RISE + 1.55, FIRST_ROW_Z + (ROWS - 1) * ROW_GAP + 0.15);
const SCREEN_PX_W = 1280; // DOM pixels; scaled to SCREEN_W world units
const SCREEN_PX_H = (SCREEN_PX_W * SCREEN_H) / SCREEN_W;
const WALL = "#2a201a", WOOD = "#30241c", LED = "#ffa860";

export function TheatreScene({ dark, zoomed, viewRef, screen }: {
  dark: boolean; zoomed: boolean; viewRef: MutableRefObject<View>; screen: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null), cam = useRef<HTMLDivElement>(null), obj = useRef<HTMLDivElement>(null);
  const level = useRef(1); // 1 = house lights up, 0 = show dark
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} performance={{ min: 0.6 }} camera={{ fov: 60, near: 0.05, far: 80, position: EYE.toArray() }} gl={{ antialias: typeof window !== "undefined" && window.devicePixelRatio < 2, powerPreference: "high-performance", stencil: false }}
        onCreated={(st) => { st.gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <color attach="background" args={["#050304"]} />
        <CameraRig zoomed={zoomed} viewRef={viewRef} />
        <Lights dark={dark} level={level} />
        <Room level={level} />
        <ScreenFrame />
        <CssSync outer={outer} cam={cam} obj={obj} />
        <Seats />
      </Canvas>
      {/* The screen is real DOM laid over the canvas with a matching CSS 3D camera. */}
      <div ref={outer} className="pointer-events-none absolute inset-0 overflow-hidden">
        <div ref={cam} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          <div ref={obj} className="pointer-events-auto absolute left-0 top-0 overflow-hidden bg-[hsl(0_0%_4%)]"
            style={{ width: SCREEN_PX_W, height: SCREEN_PX_H, visibility: "hidden", backfaceVisibility: "hidden", willChange: "transform" }} onPointerDown={(e) => e.stopPropagation()}>
            <div className="absolute inset-0">{screen}</div>
            {/* panel glass: edge falloff + faint reflection, ignores clicks */}
            <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 40px 6px hsl(0 0% 0% / .55), inset 0 0 0 2px hsl(0 0% 0% / .9)",
              background: "linear-gradient(160deg, hsl(0 0% 100% / .05), transparent 35%, transparent 75%, hsl(0 0% 100% / .02))" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraRig({ zoomed, viewRef }: { zoomed: boolean; viewRef: MutableRefObject<View> }) {
  const { camera, size } = useThree();
  const cur = useRef({ yaw: 0, pitch: 0 });
  const pos = useRef(EYE.clone());
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const cam = camera as THREE.PerspectiveCamera;
    const k = 1 - Math.exp(-14 * dt);
    const ty = zoomed ? 0 : viewRef.current.yaw, tp = zoomed ? 0 : viewRef.current.pitch;
    cur.current.yaw += (ty - cur.current.yaw) * k;
    cur.current.pitch += (tp - cur.current.pitch) * k;
    // Zoom: move up the aisle until the whole screen (with its frame) fits, never past it.
    const half = THREE.MathUtils.degToRad(cam.fov / 2);
    const aspect = size.width / Math.max(1, size.height - 170);
    const fit = Math.max((SCREEN_H / 2) / Math.tan(half), (SCREEN_W / 2) / (Math.tan(half) * aspect)) * 1.12;
    const target = zoomed ? tmp.set(0, SCREEN_Y - 0.3, Math.min(EYE.z, SCREEN_Z + fit)) : EYE;
    pos.current.lerp(target, 1 - Math.exp(-4 * dt));
    cam.position.copy(pos.current);
    // Base aim: centre of the screen, then the user's look-around on top.
    const dx = 0 - pos.current.x, dz = pos.current.z - SCREEN_Z;
    const baseYaw = Math.atan2(dx, dz);
    const basePitch = Math.atan2(SCREEN_Y - pos.current.y, Math.hypot(dx, dz));
    cam.rotation.order = "YXZ";
    cam.rotation.set(basePitch + THREE.MathUtils.degToRad(cur.current.pitch), -baseYaw + THREE.MathUtils.degToRad(-cur.current.yaw), 0);
  });
  return null;
}

function Lights({ dark, level }: { dark: boolean; level: MutableRefObject<number> }) {
  const amb = useRef<THREE.HemisphereLight>(null);
  const walls = useRef<THREE.Group>(null);
  const screenL = useRef<THREE.PointLight>(null);
  useFrame((_, raw) => {
    // Slow, cinema-style fade (~4 s).
    level.current += ((dark ? 0 : 1) - level.current) * (1 - Math.exp(-0.7 * Math.min(raw, 0.05)));
    const l = level.current;
    if (amb.current) amb.current.intensity = 0.12 + 1.1 * l;
    walls.current?.children.forEach((c) => { if (c instanceof THREE.PointLight) c.intensity = 1.5 + 16 * l; });
    if (screenL.current) screenL.current.intensity = 10 + 8 * (1 - l);
  });
  return (
    <>
      <hemisphereLight ref={amb} args={["#ffe4c8", "#1c120c", 1]} />
      <pointLight ref={screenL} position={[0, SCREEN_Y, SCREEN_Z + 6]} color="#b9c8ff" distance={34} decay={1.3} />
      <group ref={walls}>
        {[-1, 1].flatMap((s) => [-11, -4, 3].map((z) => (
          <pointLight key={`${s}${z}`} position={[s * (ROOM_W / 2 - 1.2), 6, z]} color={LED} distance={12} decay={1.3} />
        )))}
        {[-8, 0, 7].map((z) => <pointLight key={z} position={[0, ROOM_H - 1, z]} color="#ffe2bd" distance={12} decay={1.4} />)}
      </group>
    </>
  );
}

function useCanvasTexture(draw: (c: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  return useMemo(() => {
    const s = 256, cv = document.createElement("canvas");
    cv.width = cv.height = s;
    draw(cv.getContext("2d")!, s);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Emissive material whose glow follows the house-light level (never fully off for LEDs). */
function Glow({ level, on, off, color = LED }: { level: MutableRefObject<number>; on: number; off: number; color?: string }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => { if (m.current) m.current.emissiveIntensity = off + (on - off) * level.current; });
  return <meshStandardMaterial ref={m} color={color} emissive={color} emissiveIntensity={on} toneMapped={false} />;
}

function Room({ level }: { level: MutableRefObject<number> }) {
  const carpet = useCanvasTexture((c, s) => {
    c.fillStyle = "#1e1714"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "110,70,40"},0.3)`; c.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    c.strokeStyle = "rgba(170,110,50,0.22)"; c.lineWidth = 2;
    for (let y = 0; y <= s; y += 32) for (let x = 0; x <= s; x += 32) { c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x + 10, y); c.lineTo(x + 20, y + 10); c.lineTo(x + 10, y + 20); c.closePath(); c.stroke(); }
  }, [14, 14]);
  const panel = useCanvasTexture((c, s) => {
    c.fillStyle = WALL; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,220,180,${Math.random() * 0.03})`; c.fillRect(0, Math.random() * s, s, 1 + Math.random() * 2); }
    c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(0, 0, 3, s);
  }, [8, 1]);
  const depth = BACK - FRONT, midZ = (FRONT + BACK) / 2;
  const sideLedZ = [-12.5, -9.5, -6.5, -2.5, 1.5, 5.5];
  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, midZ]}>
        <planeGeometry args={[ROOM_W, depth]} />
        <meshStandardMaterial map={carpet} roughness={1} />
      </mesh>
      {/* ceiling with downlights */}
      <mesh rotation-x={Math.PI / 2} position={[0, ROOM_H, midZ]}>
        <planeGeometry args={[ROOM_W, depth]} />
        <meshStandardMaterial color="#120e0c" roughness={0.9} />
      </mesh>
      {[-7, 0, 7].flatMap((x) => [-11, -5, 1, 7].map((z) => (
        <mesh key={`${x}${z}`} position={[x, ROOM_H - 0.02, z]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.18, 20]} />
          <Glow level={level} on={3} off={0.05} color="#fff1dc" />
        </mesh>
      )))}
      {/* side walls: wood panels, vertical LED strips, speakers */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * ROOM_W / 2, ROOM_H / 2, midZ]} rotation-y={-s * Math.PI / 2}>
            <planeGeometry args={[depth, ROOM_H]} />
            <meshStandardMaterial map={panel} roughness={0.8} />
          </mesh>
          {sideLedZ.map((z) => (
            <mesh key={z} position={[s * (ROOM_W / 2 - 0.06), 6.6, z]}>
              <boxGeometry args={[0.06, 9, 0.07]} />
              <Glow level={level} on={1.6} off={0.35} />
            </mesh>
          ))}
          {[-10.5, -4.5, 2.5].map((z) => (
            <mesh key={z} position={[s * (ROOM_W / 2 - 0.35), 7.4, z]} rotation-y={-s * 0.35}>
              <boxGeometry args={[0.6, 1.3, 0.7]} />
              <meshStandardMaterial color="#0c0a0a" roughness={0.6} />
            </mesh>
          ))}
          {/* wainscot + cove light */}
          <mesh position={[s * (ROOM_W / 2 - 0.15), 1.1, midZ]}>
            <boxGeometry args={[0.3, 2.2, depth]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
          <mesh position={[s * (ROOM_W / 2 - 0.32), 2.22, midZ]}>
            <boxGeometry args={[0.04, 0.04, depth]} />
            <Glow level={level} on={2} off={0.35} />
          </mesh>
        </group>
      ))}
      {/* back wall with projector port and exit sign */}
      <mesh position={[0, ROOM_H / 2, BACK]} rotation-y={Math.PI}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={panel} roughness={0.8} />
      </mesh>
      <mesh position={[0, 10, BACK - 0.05]} rotation-y={Math.PI}>
        <planeGeometry args={[1.4, 0.8]} />
        <Glow level={level} on={0.3} off={3} color="#cfe6ff" />
      </mesh>
      <mesh position={[-9, 3.6, BACK - 0.05]} rotation-y={Math.PI}>
        <planeGeometry args={[1, 0.4]} />
        <meshStandardMaterial color="#0a3" emissive="#1c4" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* front wall, dark masking around the screen, stage with edge light */}
      <mesh position={[0, ROOM_H / 2, FRONT]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#151010" roughness={1} />
      </mesh>
      <mesh position={[0, 0.45, FRONT + 1.6]}>
        <boxGeometry args={[ROOM_W - 2, 0.9, 3.2]} />
        <meshStandardMaterial color="#16110e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.88, FRONT + 3.21]}>
        <boxGeometry args={[ROOM_W - 2, 0.04, 0.04]} />
        <Glow level={level} on={2.5} off={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (SCREEN_W / 2 + 0.9), 1.05, FRONT + 1.1]}>
          <boxGeometry args={[0.12, 0.25, 0.12]} />
          <Glow level={level} on={3} off={0.8} />
        </mesh>
      ))}
      <Risers level={level} />
    </group>
  );
}

function Risers({ level }: { level: MutableRefObject<number> }) {
  return (
    <>
      {Array.from({ length: ROWS - 1 }, (_, i) => i + 1).map((r) => {
        const start = FIRST_ROW_Z + r * ROW_GAP - ROW_GAP / 2 + 0.2;
        const end = r === ROWS - 1 ? BACK : start + ROW_GAP;
        return (
          <group key={r}>
            <mesh position={[0, (r * ROW_RISE) / 2, (start + end) / 2]}>
              <boxGeometry args={[ROOM_W - 0.6, r * ROW_RISE, end - start]} />
              <meshStandardMaterial color="#1d1613" roughness={1} />
            </mesh>
            {/* aisle step lights */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.75, r * ROW_RISE - 0.12, start - 0.01]}>
                <boxGeometry args={[0.18, 0.05, 0.02]} />
                <Glow level={level} on={3} off={2} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

function ScreenFrame() {
  // Wall-mounted unit: big matte-black masking surround, a slim metal bezel, and the panel recess.
  return (
    <group position={[0, SCREEN_Y, SCREEN_Z]}>
      <mesh position={[0, 0, -0.55]}>
        <boxGeometry args={[SCREEN_W + 4, SCREEN_H + 2.4, 0.3]} />
        <meshBasicMaterial color="#030303" />
      </mesh>
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[SCREEN_W + 0.5, SCREEN_H + 0.5, 0.4]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[SCREEN_W + 0.16, SCREEN_H + 0.16, 0.12]} />
        <meshStandardMaterial color="#020202" roughness={0.6} />
      </mesh>
    </group>
  );
}

const eps = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);
// Port of three's CSS3DRenderer math for a single element (the movie screen).
function CssSync({ outer, cam, obj }: { outer: RefObject<HTMLDivElement | null>; cam: RefObject<HTMLDivElement | null>; obj: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree();
  const objCss = useMemo(() => {
    const e = new THREE.Matrix4().compose(
      new THREE.Vector3(0, SCREEN_Y, SCREEN_Z + 0.01), new THREE.Quaternion(), new THREE.Vector3(SCREEN_W / SCREEN_PX_W, SCREEN_W / SCREEN_PX_W, 1)).elements;
    return `translate(-50%,-50%) matrix3d(${[e[0], e[1], e[2], e[3], -e[4], -e[5], -e[6], -e[7], e[8], e[9], e[10], e[11], e[12], e[13], e[14], e[15]].map(eps).join(",")})`;
  }, []);
  const dir = useMemo(() => new THREE.Vector3(), []), to = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!outer.current || !cam.current || !obj.current) return;
    const c = camera as THREE.PerspectiveCamera;
    c.updateMatrixWorld();
    const fov = c.projectionMatrix.elements[5] * size.height * 0.5;
    const e = c.matrixWorldInverse.elements;
    const m = [e[0], -e[1], e[2], e[3], e[4], -e[5], e[6], e[7], e[8], -e[9], e[10], e[11], e[12], -e[13], e[14], e[15]].map(eps).join(",");
    outer.current.style.perspective = `${fov}px`;
    cam.current.style.transform = `translateZ(${fov}px) matrix3d(${m}) translate(${size.width / 2}px,${size.height / 2}px)`;
    obj.current.style.transform = objCss;
    c.getWorldDirection(dir);
    to.set(0, SCREEN_Y, SCREEN_Z).sub(c.position).normalize();
    obj.current.style.visibility = dir.dot(to) > 0.2 ? "visible" : "hidden";
  });
  return null;
}

// All seats as a handful of instanced meshes (few draw calls, solid geometry).
function Seats() {
  const cushion = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const shell = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const cups = useRef<THREE.InstancedMesh>(null);
  const n = ROWS * PER_ROW;
  const geos = useMemo(() => ({
    cushion: new RoundedBoxGeometry(0.84, 0.26, 0.74, 3, 0.09),
    back: new RoundedBoxGeometry(0.82, 1.0, 0.24, 3, 0.1),
    shell: new RoundedBoxGeometry(0.88, 1.06, 0.1, 2, 0.04),
    arm: new RoundedBoxGeometry(0.13, 0.82, 0.8, 2, 0.05),
  }), []);
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    let i = 0, a = 0;
    for (let r = 0; r < ROWS; r++) for (let s = 0; s < PER_ROW; s++, i++) {
      const x = seatX(s), y = r * ROW_RISE, z = FIRST_ROW_Z + r * ROW_GAP;
      const set = (mesh: THREE.InstancedMesh | null, idx: number, px: number, py: number, pz: number, rx = 0) => {
        m.position.set(px, py, pz); m.rotation.set(rx, 0, 0); m.updateMatrix(); mesh?.setMatrixAt(idx, m.matrix);
      };
      set(cushion.current, i, x, y + 0.5, z);
      set(back.current, i, x, y + 1.0, z + 0.4, 0.16);
      set(shell.current, i, x, y + 0.95, z + 0.5, 0.16);
      for (const sx of [-0.48, 0.48]) {
        set(arms.current, a, x + sx, y + 0.4, z + 0.05);
        set(cups.current, a, x + sx, y + 0.83, z - 0.28);
        a++;
      }
    }
    [cushion, back, shell, arms, cups].forEach((r) => { if (r.current) r.current.instanceMatrix.needsUpdate = true; });
  }, []);
  return (
    <>
      <instancedMesh ref={cushion} args={[geos.cushion, undefined, n]}>
        
        <meshStandardMaterial color="#5a3a2a" roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={back} args={[geos.back, undefined, n]}>
        
        <meshStandardMaterial color="#4d3124" roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={shell} args={[geos.shell, undefined, n]}>
        
        <meshStandardMaterial color="#1a1210" roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[geos.arm, undefined, n * 2]}>
        
        <meshStandardMaterial color="#1f1613" roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={cups} args={[undefined, undefined, n * 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
        <meshStandardMaterial color="#0d0b0a" roughness={0.4} metalness={0.5} />
      </instancedMesh>
    </>
  );
}
