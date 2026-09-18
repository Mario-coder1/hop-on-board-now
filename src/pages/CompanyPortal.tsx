import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Users, FileSpreadsheet, Download, Loader2, Mail, ShieldCheck } from 'lucide-react';
import SEO from '@/components/SEO';

interface MemberRow {
  id: string;
  work_email: string;
  role: string;
  active: boolean;
  joined: boolean;
  full_name: string | null;
  rides_this_month: number;
  amount_this_month: number;
}

interface Overview {
  company: {
    id: string;
    name: string;
    email_domain: string;
    billing_email: string;
    monthly_ride_limit: number;
    monthly_amount_limit: number;
    per_ride_limit: number;
    workdays_only: boolean;
  } | null;
  members: MemberRow[];
  month_rides: number;
  month_amount: number;
}

interface InvoiceRide {
  created_at: string;
  work_email: string;
  full_name: string | null;
  origin: string | null;
  destination: string | null;
  segment_km: number | null;
  cash_to_driver: number;
  booking_fee: number;
  request_status: string | null;
}

const eur = (n: number) => `${Number(n || 0).toFixed(2)} €`;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function CompanyPortal() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isHr, setIsHr] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [emails, setEmails] = useState('');
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(monthKey());
  const [invoice, setInvoice] = useState<{ rides: InvoiceRide[]; total_cash: number; total_fee: number } | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const loadOverview = useCallback(async (cid: string) => {
    const { data, error } = await supabase.rpc('hr_company_overview', { _company_id: cid });
    if (error) {
      toast.error('Nepodarilo sa načítať prehľad firmy');
      return;
    }
    setOverview(data as unknown as Overview);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!profile?.id) return;
      await supabase.rpc('link_my_company_memberships');
      const { data } = await supabase.rpc('my_company_benefit');
      if (!active) return;
      const b = (data ?? {}) as any;
      if (b.member) {
        setCompanyId(b.company_id);
        setIsHr(b.role === 'hr');
        if (b.role === 'hr') await loadOverview(b.company_id);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [profile?.id, loadOverview]);

  const loadInvoice = useCallback(async () => {
    if (!companyId) return;
    setInvoiceLoading(true);
    const { data, error } = await supabase.rpc('hr_monthly_invoice', {
      _company_id: companyId,
      _month: `${month}-01`,
    });
    setInvoiceLoading(false);
    if (error) {
      toast.error('Nepodarilo sa načítať podklad k faktúre');
      return;
    }
    setInvoice(data as any);
  }, [companyId, month]);

  useEffect(() => {
    if (isHr && companyId) void loadInvoice();
  }, [isHr, companyId, loadInvoice]);

  const registerEmails = async () => {
    if (!companyId) return;
    const list = emails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error('Zadajte aspoň jeden pracovný email');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('hr_register_emails', { _company_id: companyId, _emails: list });
    setSaving(false);
    if (error) {
      toast.error('Registrácia emailov zlyhala', { description: error.message });
      return;
    }
    const res = data as any;
    const skipped: string[] = res?.skipped ?? [];
    toast.success(`Pridané: ${res?.added ?? 0}`, {
      description: skipped.length ? `Nesprávna doména alebo formát: ${skipped.join(', ')}` : undefined,
    });
    setEmails('');
    await loadOverview(companyId);
  };

  const toggleMember = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('hr_set_member_active', { _member_id: id, _active: active });
    if (error) {
      toast.error('Zmena sa nepodarila');
      return;
    }
    if (companyId) await loadOverview(companyId);
  };

  const downloadCsv = () => {
    if (!invoice) return;
    const rows = [
      ['Dátum', 'Zamestnanec', 'Pracovný email', 'Odkiaľ', 'Kam', 'km', 'Cena jazdy (EUR)', 'Rezervačný poplatok (EUR)', 'Stav'],
      ...invoice.rides.map((r) => [
        new Date(r.created_at).toLocaleDateString('sk-SK'),
        r.full_name ?? '',
        r.work_email,
        r.origin ?? '',
        r.destination ?? '',
        r.segment_km != null ? r.segment_km.toFixed(1) : '',
        Number(r.cash_to_driver).toFixed(2),
        Number(r.booking_fee).toFixed(2),
        r.request_status ?? '',
      ]),
      [],
      ['Spolu jazdy', '', '', '', '', '', Number(invoice.total_cash).toFixed(2), Number(invoice.total_fee).toFixed(2), ''],
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `takeme-firma-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = useMemo(() => (invoice ? Number(invoice.total_cash) + Number(invoice.total_fee) : 0), [invoice]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <SEO title="Firemný portál — TakeMe" description="Firemné jazdy pre zamestnancov s mesačnou fakturáciou." />
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Firemný portál</CardTitle>
            <CardDescription>
              Váš účet nie je prepojený so žiadnou firmou. Ak ste zamestnanec, prihláste sa emailom, ktorý vaše HR
              zaregistrovalo. Chcete firemné jazdy pre svoju firmu? Napíšte nám na support@takeme.sk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link to="/profile">Späť na profil</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isHr) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <SEO title="Firemné jazdy — TakeMe" description="Firemné jazdy pre zamestnancov." />
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Firemné jazdy sú aktívne</CardTitle>
            <CardDescription>
              Vaše jazdy v rámci limitov hradí zamestnávateľ. Limit uvidíte pri rezervácii jazdy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/search">Nájsť jazdu</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = overview?.company;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <SEO title="HR portál — TakeMe" description="Správa firemných jázd zamestnancov a mesačný podklad k faktúre." />
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10"><Building2 className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">{c?.name ?? 'Firemný portál'}</h1>
            <p className="text-sm text-muted-foreground">HR portál • doména {c?.email_domain}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Zamestnanci</p>
            <p className="text-2xl font-bold tabular-nums">{overview?.members.filter((m) => m.active).length ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Jazdy tento mesiac</p>
            <p className="text-2xl font-bold tabular-nums">{overview?.month_rides ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Suma tento mesiac</p>
            <p className="text-2xl font-bold tabular-nums">{eur(overview?.month_amount ?? 0)}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Limity: max {c?.monthly_ride_limit} jázd a {eur(c?.monthly_amount_limit ?? 0)} na zamestnanca za mesiac,
            max {eur(c?.per_ride_limit ?? 0)} na jednu jazdu
            {c?.workdays_only ? ', iba v pracovné dni' : ''}. Zmenu limitov nastavíme na požiadanie.
          </CardContent>
        </Card>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members" className="gap-2"><Users className="w-4 h-4" /> Zamestnanci</TabsTrigger>
            <TabsTrigger value="invoice" className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Podklad k faktúre</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" /> Registrovať pracovné emaily</CardTitle>
                <CardDescription>
                  Vložte emaily oddelené riadkom, čiarkou alebo medzerou. Musia byť na doméne {c?.email_domain}.
                  Zamestnanec sa potom prihlási rovnakým emailom a jazdy má zdarma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder={`jan.novak@${c?.email_domain}\nmaria.mala@${c?.email_domain}`}
                />
                <Button onClick={registerEmails} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pridať zamestnancov'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0 divide-y">
                {(overview?.members ?? []).map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{m.full_name || m.work_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.work_email}</p>
                    </div>
                    {m.role === 'hr' && <Badge variant="secondary">HR</Badge>}
                    <Badge variant={m.joined ? 'default' : 'outline'}>{m.joined ? 'Prihlásený' : 'Čaká na prihlásenie'}</Badge>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {m.rides_this_month} jázd • {eur(m.amount_this_month)}
                    </span>
                    <Button size="sm" variant={m.active ? 'outline' : 'default'} onClick={() => toggleMember(m.id, !m.active)}>
                      {m.active ? 'Deaktivovať' : 'Aktivovať'}
                    </Button>
                  </div>
                ))}
                {(overview?.members ?? []).length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground">Ešte nie sú pridaní žiadni zamestnanci.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mesačný podklad k faktúre</CardTitle>
                <CardDescription>Fakturačný email: {c?.billing_email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
                  <Button variant="outline" onClick={loadInvoice} disabled={invoiceLoading}>
                    {invoiceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zobraziť'}
                  </Button>
                  <Button onClick={downloadCsv} disabled={!invoice || invoice.rides.length === 0} className="gap-2">
                    <Download className="w-4 h-4" /> CSV export
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Cena jázd (vodičom)</p>
                    <p className="text-xl font-bold tabular-nums">{eur(invoice?.total_cash ?? 0)}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Rezervačné poplatky</p>
                    <p className="text-xl font-bold tabular-nums">{eur(invoice?.total_fee ?? 0)}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Spolu na faktúru</p>
                    <p className="text-xl font-bold tabular-nums text-primary">{eur(total)}</p>
                  </CardContent></Card>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Dátum</th>
                        <th className="py-2 pr-3">Zamestnanec</th>
                        <th className="py-2 pr-3">Trasa</th>
                        <th className="py-2 pr-3 text-right">km</th>
                        <th className="py-2 pr-3 text-right">Jazda</th>
                        <th className="py-2 text-right">Poplatok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice?.rides ?? []).map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('sk-SK')}</td>
                          <td className="py-2 pr-3">{r.full_name || r.work_email}</td>
                          <td className="py-2 pr-3">{r.origin} → {r.destination}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{r.segment_km != null ? r.segment_km.toFixed(1) : '—'}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{eur(r.cash_to_driver)}</td>
                          <td className="py-2 text-right tabular-nums">{eur(r.booking_fee)}</td>
                        </tr>
                      ))}
                      {(invoice?.rides ?? []).length === 0 && (
                        <tr><td colSpan={6} className="py-6 text-muted-foreground">Za tento mesiac nie sú žiadne firemné jazdy.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
