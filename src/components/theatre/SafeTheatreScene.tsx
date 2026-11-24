// Falls back to a flat screen when WebGL is unavailable or the 3D room crashes,
// so a device/GPU problem never takes down the whole theatre page.
import { Component, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { TheatreScene } from "./TheatreScene";

type Props = ComponentProps<typeof TheatreScene>;

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function FlatScreen({ screen }: { screen: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[hsl(20_15%_5%)] p-4 pt-20">
      <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-md bg-[hsl(0_0%_4%)] ring-8 ring-[hsl(0_0%_8%)]"
        onPointerDown={(e) => e.stopPropagation()}>
        {screen}
      </div>
    </div>
  );
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("Theatre 3D room failed, using flat screen", e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function SafeTheatreScene(props: Props) {
  const [mode, setMode] = useState<"pending" | "3d" | "flat">("pending");
  useEffect(() => { setMode(hasWebGL() ? "3d" : "flat"); }, []);
  const flat = <FlatScreen screen={props.screen} />;
  if (mode === "pending") return null;
  if (mode === "flat") return flat;
  return <Boundary fallback={flat}><TheatreScene {...props} /></Boundary>;
}
