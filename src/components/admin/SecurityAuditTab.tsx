import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

type Severity = "ok" | "info" | "warning" | "critical";

interface AuditItem {
  category: string;
  title: string;
  description: string;
  status: Severity;
}

const AUDIT_ITEMS: AuditItem[] = [
  // Auth
  { category: "Autentifikácia", title: "Supabase Auth (JWT)", description: "JWT s auto-refresh, httpOnly cookies, bcrypt hashing hesiel.", status: "ok" },
  { category: "Autentifikácia", title: "OAuth providers", description: "Google OAuth aktívny, email/password s overením.", status: "ok" },
  { category: "Autentifikácia", title: "Leaked Password Protection (HIBP)", description: "Aktivovaná kontrola hesiel voči databáze úniku Have I Been Pwned.", status: "ok" },
  { category: "Autentifikácia", title: "Ban systém", description: "Banovaní používatelia nemôžu vytvárať jazdy ani požiadavky.", status: "ok" },

  // RLS
  { category: "Row-Level Security", title: "RLS na všetkých public tabuľkách", description: "Každá tabuľka v public schéme má zapnutú RLS s explicitnými policies.", status: "ok" },
  { category: "Row-Level Security", title: "user_roles v samostatnej tabuľke", description: "Role nie sú uložené na profiles (chráni pred privilege escalation).", status: "ok" },
  { category: "Row-Level Security", title: "has_role() ako SECURITY DEFINER", description: "Funkcia bypassuje RLS, zabraňuje rekurzii v politikách.", status: "ok" },
  { category: "Row-Level Security", title: "public_profiles view", description: "Citlivé údaje (phone, email) skryté, vystavené iba neutrálne info.", status: "ok" },
  { category: "Row-Level Security", title: "wallets RLS", description: "Prístup len pre vlastníka peňaženky alebo service_role.", status: "ok" },

  // Admin
  { category: "Admin operácie", title: "Edge functions overujú JWT + admin rolu", description: "admin-user-management, send-mass-push verifikujú token a has_role.", status: "ok" },
  { category: "Admin operácie", title: "Service role kľúč iba na serveri", description: "SUPABASE_SERVICE_ROLE_KEY nikdy nie je odoslaný na klient.", status: "ok" },

  // Payments
  { category: "Platby", title: "Stripe webhook signature", description: "verifyWebhook overuje HMAC-SHA256 podpis cez STRIPE_SIGNATURE.", status: "ok" },
  { category: "Platby", title: "Server-side kalkulácie cien", description: "Suma, provízia a payout počítané v DB triggeri, nie na klientovi.", status: "ok" },
  { category: "Platby", title: "PIN kódy generované server-side", description: "4-miestny PIN generovaný DB triggerom, overený cez SECURITY DEFINER funkciu.", status: "ok" },

  // Push notifications
  { category: "Push notifikácie", title: "VAPID kľúče v secrets", description: "VAPID_PRIVATE_KEY uložený výhradne v edge function secrets.", status: "ok" },
  { category: "Push notifikácie", title: "internal-send-push chránený", description: "Edge function vyžaduje x-internal-secret header z DB.", status: "ok" },

  // University verification
  { category: "Univerzity", title: "Email verification kód", description: "6-miestny kód, SHA-256 hash, max 5 pokusov, expirácia, jednorazové použitie.", status: "ok" },

  // Network
  { category: "Sieť", title: "HTTPS všade", description: "Vynútený HTTPS na všetkých endpointoch, vrátane custom domény takeme.sk.", status: "ok" },
  { category: "Sieť", title: "CORS headers", description: "Explicitné Access-Control-Allow-Origin v edge functions.", status: "ok" },
  { category: "Sieť", title: "Anon key = publishable", description: "Frontend kľúč je verejný (publishable), ochrana RLS.", status: "ok" },

  // SECURITY DEFINER hardening
  { category: "Hardening", title: "REVOKE EXECUTE z PUBLIC", description: "SECURITY DEFINER funkcie majú odňatý EXECUTE od PUBLIC/anon.", status: "ok" },
  { category: "Hardening", title: "Storage buckets bez LIST policy", description: "avatars a chat-images bez enumeration policy, len scoped SELECT.", status: "ok" },
  { category: "Hardening", title: "Trigger funkcie bez external EXECUTE", description: "Notifikácie, payouts, ratings spúšťané iba ako trigger (owner-level).", status: "ok" },

  // Doporučenia
  { category: "Odporúčania", title: "Rate limiting na edge funkciách", description: "Doporučené: pridať throttling na login, send-university-code, mass-push (proti brute-force).", status: "warning" },
  { category: "Odporúčania", title: "CAPTCHA pri signup/login", description: "Doporučené: zapnúť Supabase hCaptcha pre auth flow.", status: "warning" },
  { category: "Odporúčania", title: "Content Security Policy header", description: "Doporučené: pridať CSP do index.html (proti XSS).", status: "warning" },
  { category: "Odporúčania", title: "Audit log admin akcií", description: "Doporučené: logovať kto/kedy zmenil hesla, vymazal používateľov.", status: "warning" },
  { category: "Odporúčania", title: "2FA pre adminov", description: "Doporučené: vyžadovať TOTP pre admin účty.", status: "info" },
  { category: "Odporúčania", title: "Rotácia VAPID/Stripe kľúčov", description: "Doporučené: pravidelná rotácia (každých 6-12 mesiacov).", status: "info" },

  // Critical pending
  { category: "Kritické", title: "Stripe Connect (driver payouts)", description: "Aktuálne držíme peniaze vodičov vo wallete – právne riziko. Plánovaný prechod na Stripe Connect Express.", status: "critical" },
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

function generatePdf() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // Hlavička
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Bezpecnostny audit", 40, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("TakeMe.sk - aplikacia pre zdielanie jazd", 40, 65);
  doc.text(
    `Vygenerovane: ${now.toLocaleDateString("sk-SK")} ${now.toLocaleTimeString("sk-SK")}`,
    40,
    80
  );

  // Súhrn
  const counts = AUDIT_ITEMS.reduce(
    (acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }),
    {} as Record<Severity, number>
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Suhrn", 40, 120);

  autoTable(doc, {
    startY: 130,
    head: [["Status", "Pocet"]],
    body: [
      ["OK (bezpecne)", String(counts.ok ?? 0)],
      ["Info", String(counts.info ?? 0)],
      ["Odporucania", String(counts.warning ?? 0)],
      ["Kriticke", String(counts.critical ?? 0)],
      ["SPOLU", String(AUDIT_ITEMS.length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { font: "helvetica", fontSize: 10 },
    margin: { left: 40, right: 40 },
  });

  // Detailné položky po kategóriách
  const categories = Array.from(new Set(AUDIT_ITEMS.map((i) => i.category)));
  let lastY = (doc as any).lastAutoTable.finalY + 20;

  for (const cat of categories) {
    const items = AUDIT_ITEMS.filter((i) => i.category === cat);
    if (lastY > 720) {
      doc.addPage();
      lastY = 40;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(cat, 40, lastY);

    autoTable(doc, {
      startY: lastY + 8,
      head: [["Status", "Polozka", "Popis"]],
      body: items.map((i) => [
        STATUS_LABEL[i.status],
        i.title,
        // Bez diakritiky pre helvetica
        i.description
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      ]),
      theme: "striped",
      headStyles: { fillColor: [241, 245, 249], textColor: 15 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
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

  // Päta na každej strane
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `TakeMe.sk - Bezpecnostny audit - Strana ${p} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  doc.save(`takeme-security-audit-${now.toISOString().slice(0, 10)}.pdf`);
}

export function SecurityAuditTab() {
  const [generating, setGenerating] = useState(false);

  const counts = AUDIT_ITEMS.reduce(
    (acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }),
    {} as Record<Severity, number>
  );

  const handleDownload = async () => {
    setGenerating(true);
    try {
      generatePdf();
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
                  Prehľad bezpečnostných opatrení aplikácie a odporúčaní na zlepšenie.
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
