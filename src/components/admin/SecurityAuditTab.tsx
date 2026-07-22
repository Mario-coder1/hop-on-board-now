import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Severity = "ok" | "info" | "warning" | "critical";

interface AuditItem {
  category: string;
  title: string;
  description: string;
  status: Severity;
}

const AUDIT_ITEMS: AuditItem[] = [
  // Autentifikácia
  { category: "Autentifikácia", title: "Supabase Auth (JWT)", description: "JWT s automatickým obnovovaním, httpOnly cookies a bcrypt hashovanie hesiel.", status: "ok" },
  { category: "Autentifikácia", title: "OAuth poskytovatelia", description: "Aktívne prihlásenie cez Google a klasické email/heslo s overením adresy.", status: "ok" },
  { category: "Autentifikácia", title: "Ochrana uniknutých hesiel (HIBP)", description: "Zapnutá kontrola hesiel voči databáze Have I Been Pwned.", status: "ok" },
  { category: "Autentifikácia", title: "Systém banov", description: "Zabanovaní používatelia nemôžu vytvárať jazdy ani požiadavky.", status: "ok" },

  // RLS
  { category: "Row-Level Security", title: "RLS na všetkých verejných tabuľkách", description: "Každá tabuľka v schéme public má zapnutú RLS s explicitnými politikami.", status: "ok" },
  { category: "Row-Level Security", title: "Roly v samostatnej tabuľke user_roles", description: "Roly nie sú uložené v profiles, čo chráni pred eskaláciou oprávnení.", status: "ok" },
  { category: "Row-Level Security", title: "Funkcia has_role() ako SECURITY DEFINER", description: "Bezpečne obchádza RLS a zabraňuje rekurzii v politikách.", status: "ok" },
  { category: "Row-Level Security", title: "Pohľad public_profiles", description: "Citlivé údaje (telefón, e-mail) sú skryté, vystavené sú iba neutrálne informácie.", status: "ok" },
  { category: "Row-Level Security", title: "RLS na platobných záznamoch", description: "Prístup k platobným záznamom má iba vlastník alebo service_role. Peniaze nezadržiavame — všetko ide cez Stripe.", status: "ok" },

  // Admin
  { category: "Administrátorské operácie", title: "Edge funkcie overujú JWT a admin rolu", description: "Funkcie admin-user-management a send-mass-push overujú token cez has_role.", status: "ok" },
  { category: "Administrátorské operácie", title: "Service role kľúč iba na serveri", description: "SUPABASE_SERVICE_ROLE_KEY nie je nikdy odoslaný klientovi.", status: "ok" },

  // Platby
  { category: "Platby", title: "Overovanie podpisu Stripe webhooku", description: "Funkcia verifyWebhook overuje HMAC-SHA256 podpis cez hlavičku Stripe-Signature.", status: "ok" },
  { category: "Platby", title: "Výpočty cien na strane servera", description: "Suma, provízia a výplata sa počítajú v databázovom triggeri, nie na klientovi.", status: "ok" },
  { category: "Platby", title: "PIN kódy generované na serveri", description: "Štvormiestny PIN vytvára DB trigger, overuje sa cez SECURITY DEFINER funkciu.", status: "ok" },

  // Push
  { category: "Push notifikácie", title: "VAPID kľúče v secrets", description: "VAPID_PRIVATE_KEY je uložený výhradne v secrets edge funkcií.", status: "ok" },
  { category: "Push notifikácie", title: "Chránená funkcia internal-send-push", description: "Edge funkcia vyžaduje hlavičku x-internal-secret čítanú z databázy.", status: "ok" },

  // Univerzity
  { category: "Univerzity", title: "Overovací kód cez e-mail", description: "Šesťmiestny kód, SHA-256 hash, maximálne 5 pokusov, expirácia a jednorazové použitie.", status: "ok" },

  // Sieť
  { category: "Sieť", title: "HTTPS na všetkých endpointoch", description: "Vynútené HTTPS vrátane vlastnej domény takeme.sk.", status: "ok" },
  { category: "Sieť", title: "CORS hlavičky", description: "Explicitné Access-Control-Allow-Origin v edge funkciách.", status: "ok" },
  { category: "Sieť", title: "Anon kľúč je publishable", description: "Frontendový kľúč je verejný, skutočná ochrana je v RLS politikách.", status: "ok" },

  // Hardening
  { category: "Hardening", title: "REVOKE EXECUTE od PUBLIC", description: "SECURITY DEFINER funkciám je odňaté právo EXECUTE od PUBLIC a anon.", status: "ok" },
  { category: "Hardening", title: "Storage buckety bez LIST politiky", description: "Buckety avatars a chat-images nemajú enumeration politiku, iba scoped SELECT.", status: "ok" },
  { category: "Hardening", title: "Triggerové funkcie bez externého EXECUTE", description: "Notifikácie, výplaty a hodnotenia sa spúšťajú iba ako trigger pod vlastníkom.", status: "ok" },

  // Odporúčania
  { category: "Odporúčania", title: "Rate limiting na edge funkciách", description: "Odporúčané: pridať throttling na login, send-university-code a mass-push proti brute-force útokom.", status: "warning" },
  { category: "Odporúčania", title: "CAPTCHA pri registrácii a prihlásení", description: "Odporúčané: zapnúť Supabase hCaptcha pre auth flow.", status: "warning" },
  { category: "Odporúčania", title: "Content Security Policy hlavička", description: "Odporúčané: pridať CSP do index.html ako ochranu pred XSS.", status: "warning" },
  { category: "Odporúčania", title: "Audit log administrátorských akcií", description: "Odporúčané: logovať, kto a kedy menil heslá alebo mazal používateľov.", status: "warning" },
  { category: "Odporúčania", title: "Dvojfaktorové overenie pre adminov", description: "Odporúčané: vyžadovať TOTP pre administrátorské účty.", status: "info" },
  { category: "Odporúčania", title: "Pravidelná rotácia VAPID a Stripe kľúčov", description: "Odporúčané: rotovať každých 6 až 12 mesiacov.", status: "info" },

  // Platby cez Stripe
  { category: "Platby", title: "Žiadna interná peňaženka", description: "Peniaze používateľov nezadržiavame. Platby aj výplaty vodičom idú výhradne cez Stripe.", status: "ok" },
];

const STATUS_LABEL: Record<Severity, string> = {
  ok: "OK",
  info: "Info",
  warning: "Odporúčanie",
  critical: "Kritické",
};

const STATUS_VARIANT: Record<Severity, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  info: "secondary",
  warning: "outline",
  critical: "destructive",
};

// Cache pre font (aby sa nesťahoval pri každom generovaní)
let cachedFontBase64: string | null = null;

async function loadSlovakFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  // Roboto Regular – plne podporuje slovenskú diakritiku
  const url = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf";
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  // ArrayBuffer -> base64
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

interface UserStats {
  total: number;
  firstDate: Date | null;
  lastDate: Date | null;
  avgPerDay: number;
  avgPerWeek: number;
  avgPerMonth: number;
  last7: number;
  last30: number;
  last90: number;
  monthly: { label: string; count: number }[];
}

async function fetchUserStats(): Promise<UserStats> {
  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  if (total === 0) {
    return {
      total: 0, firstDate: null, lastDate: null,
      avgPerDay: 0, avgPerWeek: 0, avgPerMonth: 0,
      last7: 0, last30: 0, last90: 0, monthly: [],
    };
  }
  const dates = rows.map((r: any) => new Date(r.created_at));
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const now = new Date();
  const days = Math.max(1, (now.getTime() - firstDate.getTime()) / 86400000);
  const avgPerDay = total / days;

  const ms = now.getTime();
  const last7 = dates.filter((d) => ms - d.getTime() < 7 * 86400000).length;
  const last30 = dates.filter((d) => ms - d.getTime() < 30 * 86400000).length;
  const last90 = dates.filter((d) => ms - d.getTime() < 90 * 86400000).length;

  // Mesačný histogram (posledných 6 mesiacov)
  const monthly: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = dates.filter((x) => x >= d && x < next).length;
    const label = d.toLocaleDateString("sk-SK", { month: "short", year: "2-digit" });
    monthly.push({ label, count });
  }

  return {
    total, firstDate, lastDate,
    avgPerDay,
    avgPerWeek: avgPerDay * 7,
    avgPerMonth: avgPerDay * 30,
    last7, last30, last90, monthly,
  };
}

async function generatePdf(stats: UserStats) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // Pridáme Roboto font s plnou slovenskou diakritikou
  try {
    const fontBase64 = await loadSlovakFont();
    doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
    doc.setFont("Roboto", "normal");
  } catch (e) {
    console.warn("Nepodarilo sa načítať Roboto font, použijem helvetica", e);
  }

  const FONT = (doc.getFont().fontName === "Roboto") ? "Roboto" : "helvetica";

  // Hlavička
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT, "bold");
  doc.setFontSize(22);
  doc.text("Bezpečnostný audit", 40, 45);
  doc.setFont(FONT, "normal");
  doc.setFontSize(11);
  doc.text("TakeMe.sk – aplikácia pre zdieľanie jázd", 40, 65);
  doc.text(
    `Vygenerované: ${now.toLocaleDateString("sk-SK")} ${now.toLocaleTimeString("sk-SK")}`,
    40, 80
  );

  // Súhrn
  const counts = AUDIT_ITEMS.reduce(
    (acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }),
    {} as Record<Severity, number>
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.text("Súhrn kontrol", 40, 120);

  autoTable(doc, {
    startY: 130,
    head: [["Status", "Počet"]],
    body: [
      ["OK (bezpečné)", String(counts.ok ?? 0)],
      ["Info", String(counts.info ?? 0)],
      ["Odporúčania", String(counts.warning ?? 0)],
      ["Kritické", String(counts.critical ?? 0)],
      ["SPOLU", String(AUDIT_ITEMS.length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, font: FONT, fontStyle: "bold" },
    styles: { font: FONT, fontSize: 10 },
    margin: { left: 40, right: 40 },
  });

  let lastY = (doc as any).lastAutoTable.finalY + 20;

  // Sekcia: Vývoj používateľov
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.text("Vývoj používateľov", 40, lastY);
  lastY += 10;

  const firstDateStr = stats.firstDate
    ? stats.firstDate.toLocaleDateString("sk-SK")
    : "–";
  const lastDateStr = stats.lastDate
    ? stats.lastDate.toLocaleDateString("sk-SK")
    : "–";

  autoTable(doc, {
    startY: lastY,
    head: [["Ukazovateľ", "Hodnota"]],
    body: [
      ["Celkový počet registrovaných používateľov", String(stats.total)],
      ["Prvá registrácia", firstDateStr],
      ["Posledná registrácia", lastDateStr],
      ["Priemer registrácií za deň", stats.avgPerDay.toFixed(2)],
      ["Priemer registrácií za týždeň", stats.avgPerWeek.toFixed(1)],
      ["Priemer registrácií za mesiac", stats.avgPerMonth.toFixed(1)],
      ["Nových za posledných 7 dní", String(stats.last7)],
      ["Nových za posledných 30 dní", String(stats.last30)],
      ["Nových za posledných 90 dní", String(stats.last90)],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, font: FONT, fontStyle: "bold" },
    styles: { font: FONT, fontSize: 10 },
    margin: { left: 40, right: 40 },
  });

  lastY = (doc as any).lastAutoTable.finalY + 20;

  // Jednoduchý stĺpcový graf – posledných 6 mesiacov
  if (stats.monthly.length > 0) {
    if (lastY > 600) { doc.addPage(); lastY = 40; }
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    doc.text("Registrácie po mesiacoch (posledných 6 mesiacov)", 40, lastY);
    lastY += 15;

    const chartX = 40;
    const chartY = lastY;
    const chartW = pageWidth - 80;
    const chartH = 140;
    const maxVal = Math.max(1, ...stats.monthly.map((m) => m.count));
    const barGap = 10;
    const barW = (chartW - barGap * (stats.monthly.length + 1)) / stats.monthly.length;

    // Os
    doc.setDrawColor(200, 200, 200);
    doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

    stats.monthly.forEach((m, idx) => {
      const h = (m.count / maxVal) * (chartH - 20);
      const x = chartX + barGap + idx * (barW + barGap);
      const y = chartY + chartH - h;
      doc.setFillColor(59, 130, 246);
      doc.rect(x, y, barW, h, "F");
      // Hodnota nad stĺpcom
      doc.setFont(FONT, "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(String(m.count), x + barW / 2, y - 4, { align: "center" });
      // Popis pod stĺpcom
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, x + barW / 2, chartY + chartH + 12, { align: "center" });
    });

    lastY = chartY + chartH + 30;
  }

  // Detail po kategóriách
  const categories = Array.from(new Set(AUDIT_ITEMS.map((i) => i.category)));
  for (const cat of categories) {
    const items = AUDIT_ITEMS.filter((i) => i.category === cat);
    if (lastY > 720) { doc.addPage(); lastY = 40; }
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(cat, 40, lastY);

    autoTable(doc, {
      startY: lastY + 8,
      head: [["Status", "Položka", "Popis"]],
      body: items.map((i) => [STATUS_LABEL[i.status], i.title, i.description]),
      theme: "striped",
      headStyles: { fillColor: [241, 245, 249], textColor: 15, font: FONT, fontStyle: "bold" },
      styles: { font: FONT, fontSize: 9, cellPadding: 6 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 150, fontStyle: "bold" },
        2: { cellWidth: "auto" },
      },
      margin: { left: 40, right: 40 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const status = items[data.row.index].status;
          if (status === "ok") data.cell.styles.textColor = [22, 101, 52];
          if (status === "warning") data.cell.styles.textColor = [161, 98, 7];
          if (status === "critical") data.cell.styles.textColor = [153, 27, 27];
          if (status === "info") data.cell.styles.textColor = [30, 64, 175];
        }
      },
    });

    lastY = (doc as any).lastAutoTable.finalY + 16;
  }

  // Päta
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `TakeMe.sk – Bezpečnostný audit – Strana ${p} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  doc.save(`takeme-bezpecnostny-audit-${now.toISOString().slice(0, 10)}.pdf`);
}

export function SecurityAuditTab() {
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetchUserStats().then(setStats).catch((e) => console.error(e));
  }, []);

  const counts = AUDIT_ITEMS.reduce(
    (acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }),
    {} as Record<Severity, number>
  );

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const s = stats ?? (await fetchUserStats());
      if (!stats) setStats(s);
      await generatePdf(s);
      toast.success("PDF audit vygenerovaný");
    } catch (e) {
      console.error(e);
      toast.error("Chyba pri generovaní PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex gap-3">
              <ShieldCheck className="w-8 h-8 text-primary mt-1" />
              <div>
                <CardTitle>Bezpečnostný audit</CardTitle>
                <CardDescription>
                  Prehľad bezpečnostných opatrení aplikácie, odporúčaní a reálneho vývoja používateľov.
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleDownload} disabled={generating} className="gap-2">
              <Download className="w-4 h-4" />
              {generating ? "Generujem..." : "Stiahnuť PDF"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Bezpečné
              </div>
              <div className="text-2xl font-bold text-green-600">{counts.ok ?? 0}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                Odporúčania
              </div>
              <div className="text-2xl font-bold text-yellow-600">{counts.warning ?? 0}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Kritické
              </div>
              <div className="text-2xl font-bold text-destructive">{counts.critical ?? 0}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Spolu kontrol</div>
              <div className="text-2xl font-bold">{AUDIT_ITEMS.length}</div>
            </div>
          </div>

          {stats && (
            <div className="rounded-lg border p-4 mb-6 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Vývoj používateľov</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Spolu</div>
                  <div className="font-bold text-lg">{stats.total}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Priemer / deň</div>
                  <div className="font-bold text-lg">{stats.avgPerDay.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Priemer / týždeň</div>
                  <div className="font-bold text-lg">{stats.avgPerWeek.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Posledných 30 dní</div>
                  <div className="font-bold text-lg">{stats.last30}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {Array.from(new Set(AUDIT_ITEMS.map((i) => i.category))).map((cat) => (
              <div key={cat}>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  {cat}
                </h3>
                <div className="space-y-2">
                  {AUDIT_ITEMS.filter((i) => i.category === cat).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </div>
                      </div>
                      <Badge variant={STATUS_VARIANT[item.status]} className="shrink-0">
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
