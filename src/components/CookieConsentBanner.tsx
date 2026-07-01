import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'takeme_cookie_consent_v1';

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: 1;
};

export const getCookieConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
};

export const hasConsent = (category: 'analytics' | 'marketing'): boolean => {
  const c = getCookieConsent();
  return !!c && c[category] === true;
};

const save = (consent: CookieConsent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: consent }));
};

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) {
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  const persist = (a: boolean, m: boolean) => {
    save({
      necessary: true,
      analytics: a,
      marketing: m,
      timestamp: new Date().toISOString(),
      version: 1,
    });
    setVisible(false);
  };

  const acceptAll = () => persist(true, true);
  const declineAll = () => persist(false, false);
  const saveChoice = () => persist(analytics, marketing);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Súhlas s používaním cookies"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-primary/10 p-2">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-base sm:text-lg font-semibold mb-1">
              Používame cookies
            </h2>
            <p className="text-sm text-muted-foreground">
              Nevyhnutné cookies zabezpečujú fungovanie aplikácie (prihlásenie, platby).
              Analytické a marketingové cookies použijeme len s vaším súhlasom. Viac v{' '}
              <Link to="/gdpr" className="text-primary underline">GDPR</Link> a{' '}
              <Link to="/privacy" className="text-primary underline">Zásadách súkromia</Link>.
            </p>

            {showSettings && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="mr-3">
                    <div className="text-sm font-medium">Nevyhnutné</div>
                    <div className="text-xs text-muted-foreground">Vždy aktívne — potrebné pre chod aplikácie.</div>
                  </div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="mr-3">
                    <div className="text-sm font-medium">Analytické</div>
                    <div className="text-xs text-muted-foreground">Anonymné štatistiky návštevnosti.</div>
                  </div>
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="mr-3">
                    <div className="text-sm font-medium">Marketingové</div>
                    <div className="text-xs text-muted-foreground">Personalizované ponuky a kampane.</div>
                  </div>
                  <Switch checked={marketing} onCheckedChange={setMarketing} />
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={acceptAll} className="flex-1 sm:flex-none">
                Prijať všetko
              </Button>
              <Button size="sm" variant="outline" onClick={declineAll} className="flex-1 sm:flex-none">
                Odmietnuť
              </Button>
              {showSettings ? (
                <Button size="sm" variant="secondary" onClick={saveChoice} className="flex-1 sm:flex-none">
                  Uložiť výber
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)} className="flex-1 sm:flex-none">
                  Nastavenia
                </Button>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Zavrieť a odmietnuť"
            onClick={declineAll}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
