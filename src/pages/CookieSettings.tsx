import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { getCookieConsent, type CookieConsent } from '@/components/CookieConsentBanner';

const STORAGE_KEY = 'takeme_cookie_consent_v1';

const persist = (analytics: boolean, marketing: boolean) => {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    marketing,
    timestamp: new Date().toISOString(),
    version: 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: consent }));
};

const CookieSettings = () => {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const c = getCookieConsent();
    if (c) {
      setAnalytics(c.analytics);
      setMarketing(c.marketing);
      setSavedAt(c.timestamp);
    }
  }, []);

  const save = (a = analytics, m = marketing) => {
    persist(a, m);
    setAnalytics(a);
    setMarketing(m);
    setSavedAt(new Date().toISOString());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Nastavenia cookies | TakeMe"
        description="Spravujte svoje preferencie cookies pre TakeMe. Zmeny sa uložia okamžite."
      />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Späť
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-primary/10 p-3">
            <Cookie className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Nastavenia cookies</h1>
            <p className="text-sm text-muted-foreground">
              Kedykoľvek upravte svoje preferencie.
            </p>
          </div>
        </div>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="mr-3">
              <div className="font-medium">Nevyhnutné</div>
              <div className="text-xs text-muted-foreground">
                Vždy aktívne — potrebné pre prihlásenie, platby a chod aplikácie.
              </div>
            </div>
            <Switch checked disabled />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="mr-3">
              <div className="font-medium">Analytické</div>
              <div className="text-xs text-muted-foreground">
                Anonymné štatistiky návštevnosti — pomáhajú nám vylepšovať appku.
              </div>
            </div>
            <Switch checked={analytics} onCheckedChange={(v) => save(v, marketing)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="mr-3">
              <div className="font-medium">Marketingové</div>
              <div className="text-xs text-muted-foreground">
                Personalizované ponuky a kampane.
              </div>
            </div>
            <Switch checked={marketing} onCheckedChange={(v) => save(analytics, v)} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => save(true, true)} className="flex-1 sm:flex-none">
              Prijať všetko
            </Button>
            <Button variant="outline" onClick={() => save(false, false)} className="flex-1 sm:flex-none">
              Odmietnuť všetko
            </Button>
            <Button variant="secondary" onClick={() => save()} className="flex-1 sm:flex-none">
              Uložiť výber
            </Button>
          </div>

          {justSaved && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" /> Preferencie uložené
            </div>
          )}

          {savedAt && (
            <p className="text-xs text-muted-foreground">
              Naposledy uložené: {new Date(savedAt).toLocaleString('sk-SK')}
            </p>
          )}
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          Viac informácií nájdete v{' '}
          <Link to="/gdpr" className="text-primary underline">GDPR</Link> a{' '}
          <Link to="/privacy" className="text-primary underline">Zásadách súkromia</Link>.
        </p>
      </div>
    </div>
  );
};

export default CookieSettings;
