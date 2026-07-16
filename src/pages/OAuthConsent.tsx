import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_uri?: string; redirect_uris?: string[] };
type AuthorizationDetails = {
  client?: OAuthClient;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
const authOAuth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
    approveAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
    denyAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Chýba parameter authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the FULL consent URL so the auth flow returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: err } = await authOAuth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await authOAuth.approveAuthorization(authorizationId)
      : await authOAuth.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Autorizačný server nevrátil URL na presmerovanie.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Nepodarilo sa načítať žiadosť</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "externá aplikácia";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-mesh">
      <Card className="max-w-md w-full glass-strong">
        <CardHeader>
          <CardTitle>Pripojiť {clientName} k TakeMe</CardTitle>
          <CardDescription>
            {clientName} bude môcť volať TakeMe nástroje vo vašom mene, kým ste prihlásený.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Aplikácia získa prístup k:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vášmu základnému profilu (meno, hodnotenie)</li>
              <li>Vašim jazdám a žiadostiam o jazdu</li>
              <li>Vyhľadávaniu verejne dostupných jázd</li>
            </ul>
            <p className="pt-2">
              Toto povolenie neobchádza RLS pravidlá — dáta iných používateľov zostávajú chránené.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="hero" className="flex-1" disabled={busy} onClick={() => decide(true)}>
              Povoliť
            </Button>
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
              Zamietnuť
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
