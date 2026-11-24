import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Clapperboard } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { findRoom, normalizeCode } from "@/lib/theatre";

export const Route = createFileRoute("/theatre/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Join a Virtual Theatre — PlayHub" },
      { name: "description", content: "Enter a room code to join friends in a PlayHub 3D virtual theatre with voice chat." },
      { property: "og:title", content: "Join a Virtual Theatre — PlayHub" },
      { property: "og:description", content: "Watch together in a 3D cinema with friends and voice chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinTheatre,
});

function JoinTheatre() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (c.length !== 6) return toast("Room codes have 6 characters");
    setBusy(true);
    try {
      const room = await findRoom(c);
      if (!room) toast("No theatre found with that code");
      else navigate({ to: "/theatre/$code", params: { code: c } });
    } catch {
      toast("Could not look up that room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 pt-32 text-center">
        <Clapperboard className="h-12 w-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold text-foreground">Join a Theatre</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the 6-character code your friend shared.</p>
        {!loading && !user ? (
          <Link to="/auth" className="mt-6 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Sign in to join
          </Link>
        ) : (
          <form onSubmit={join} className="mt-6 flex w-full gap-2">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="ABC123"
              aria-label="Room code"
              className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-center font-mono text-lg tracking-[0.3em] text-foreground outline-none focus:border-primary"
            />
            <button disabled={busy} className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              Join
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
