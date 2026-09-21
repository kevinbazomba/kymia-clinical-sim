import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, Loader2, ShieldCheck } from "lucide-react";

// Typed local wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_name?: string; redirect_uris?: string[] };
type OAuthDetails = {
  client?: OAuthClient | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResp<T> = { data: T | null; error: { message: string } | null };
type SupabaseOAuth = {
  auth: {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<OAuthResp<OAuthDetails>>;
      approveAuthorization: (id: string) => Promise<OAuthResp<{ redirect_url?: string; redirect_to?: string }>>;
      denyAuthorization: (id: string) => Promise<OAuthResp<{ redirect_url?: string; redirect_to?: string }>>;
    };
  };
};
const sbOAuth = supabase as unknown as SupabaseOAuth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("authorization_id manquant");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { mode: "signin", redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await sbOAuth.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-serif text-2xl">Autorisation impossible</h1>
      <p className="text-sm text-muted-foreground">
        {(error as Error)?.message ?? String(error)}
      </p>
    </main>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName =
    details?.client?.client_name ?? details?.client?.name ?? "une application externe";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await sbOAuth.auth.oauth.approveAuthorization(authorization_id)
      : await sbOAuth.auth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Le serveur d'autorisation n'a pas renvoyé d'URL de redirection.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-primary">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
          <Activity className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <span className="font-serif text-2xl font-semibold">Kymia</span>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Autorisation requise</span>
        </div>
        <h1 className="font-serif text-2xl">
          Connecter <span className="font-semibold">{clientName}</span> à votre compte Kymia
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette application pourra utiliser Kymia <em>en votre nom</em> et appeler les outils Kymia
          disponibles pendant votre session. Elle ne verra que vos propres données (consultations,
          rapports, profil). Cela ne contourne pas les règles d'accès de Kymia.
        </p>

        {details?.scope && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Portée demandée : <span className="font-mono">{details.scope}</span>
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Autoriser
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Refuser
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Vous pouvez révoquer cet accès à tout moment depuis les paramètres de sécurité de votre compte.
      </p>
    </main>
  );
}
