import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDbDate } from "@/lib/datetime";
import { RefreshCw, ScrollText, LogIn, LogOut, KeyRound, UserPlus, MailQuestion } from "lucide-react";
import { toast } from "sonner";

interface SecurityEvent {
  id: string;
  created_at: string;
  event_type: string;
  status: string;
  email: string | null;
  user_agent: string | null;
  detail: string | null;
  full_name: string | null;
}

const LABELS: Record<string, string> = {
  login: "Prihlásenie",
  login_failed: "Neúspešné prihlásenie",
  logout: "Odhlásenie",
  signup: "Registrácia",
  password_reset_requested: "Žiadosť o reset hesla",
  password_changed: "Zmena hesla",
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  login: LogIn,
  login_failed: LogIn,
  logout: LogOut,
  signup: UserPlus,
  password_reset_requested: MailQuestion,
  password_changed: KeyRound,
};

function shortDevice(ua: string | null): string {
  if (!ua) return "—";
  if (/iPhone|iPad|iOS/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Iné";
}

export function SecurityEventsLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_security_events", { _limit: 300 });
    setLoading(false);
    if (error) {
      toast.error("Nepodarilo sa načítať audit logy");
      return;
    }
    setEvents((data ?? []) as SecurityEvent[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? events.filter(
        (e) =>
          (e.email ?? "").toLowerCase().includes(q) ||
          (e.full_name ?? "").toLowerCase().includes(q) ||
          (LABELS[e.event_type] ?? e.event_type).toLowerCase().includes(q),
      )
    : events;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex gap-3">
            <ScrollText className="w-8 h-8 text-primary mt-1" />
            <div>
              <CardTitle>Audit logy účtov</CardTitle>
              <CardDescription>
                Prihlásenia, registrácie, zmeny hesla a resety — kto, kedy a z akého zariadenia.
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Obnoviť
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Hľadať podľa e-mailu, mena alebo typu udalosti..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {loading ? "Načítavam..." : "Žiadne zaznamenané udalosti."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const Icon = ICONS[e.event_type] ?? ScrollText;
              const failed = e.status !== "success";
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      failed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {LABELS[e.event_type] ?? e.event_type}
                      </span>
                      {failed && <Badge variant="destructive">Zlyhalo</Badge>}
                      <Badge variant="secondary">{shortDevice(e.user_agent)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.full_name || e.email || "Neznámy používateľ"}
                      {e.detail ? ` — ${e.detail}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {formatDbDate(e.created_at, "dd.MM.yyyy HH:mm")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SecurityEventsLog;
