import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Connect an app — PlayHub" },
      { name: "description", content: "Approve or cancel an app's access to your PlayHub account." },
      { property: "og:title", content: "Connect an app — PlayHub" },
      { property: "og:description", content: "Approve or cancel an app's access to your PlayHub account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its request ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: s } = await supabase.auth.getSession();
    return { details: data, email: s.session?.user.email ?? "" };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-sm rounded-2xl glass p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">This connection request didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "It may have expired."} Start the connection again from your assistant.
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = details?.client?.name ?? "An app";
  const redirectUri: string | undefined = details?.redirect_uri ?? details?.client?.redirect_uri;
  const scopes: string[] = String(details?.scope ?? "").split(/\s+/).filter(Boolean);
  const scopeLabel = (s: string) =>
    s === "openid" ? "Confirm who you are" : s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : `Additional permission requested: ${s}`;

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect was returned. Please try again."); return; }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl glass p-8 shadow-card">
        <h1 className="text-2xl font-bold text-foreground">Connect {client} to PlayHub</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {client} will be able to read your watchlist, ratings and watch history as you.
        </p>
        {email && <p className="mt-4 text-sm text-foreground">Signed in as <strong>{email}</strong></p>}
        {redirectUri && <p className="mt-1 break-all text-xs text-muted-foreground">Returns to {redirectUri}</p>}
        {scopes.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-foreground">
            {scopes.map((s) => <li key={s}>{scopeLabel(s)}</li>)}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">This does not bypass PlayHub's permissions.</p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button disabled={busy} onClick={() => decide(true)} className="flex-1 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            Approve
          </button>
          <button disabled={busy} onClick={() => decide(false)} className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
