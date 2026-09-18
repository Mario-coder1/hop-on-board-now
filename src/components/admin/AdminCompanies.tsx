import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Loader2, Plus, UserCog } from 'lucide-react';

interface CompanyRow {
  id: string;
  name: string;
  email_domain: string;
  billing_email: string;
  active: boolean;
  monthly_ride_limit: number;
  monthly_amount_limit: number;
  per_ride_limit: number;
  workdays_only: boolean;
  members: number;
  month_rides: number;
  month_amount: number;
}

const emptyForm = {
  name: '',
  email_domain: '',
  billing_email: '',
  ico: '',
  monthly_ride_limit: 40,
  monthly_amount_limit: 200,
  per_ride_limit: 10,
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [hrEmail, setHrEmail] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_companies');
    setLoading(false);
    if (error) {
      toast.error('Nepodarilo sa načítať firmy');
      return;
    }
    setCompanies((data ?? []) as unknown as CompanyRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!form.name || !form.email_domain || !form.billing_email) {
      toast.error('Vyplňte názov, doménu a fakturačný email');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_upsert_company', {
      _name: form.name,
      _email_domain: form.email_domain.replace(/^@/, ''),
      _billing_email: form.billing_email,
      _ico: form.ico || null,
      _monthly_ride_limit: Number(form.monthly_ride_limit),
      _monthly_amount_limit: Number(form.monthly_amount_limit),
      _per_ride_limit: Number(form.per_ride_limit),
    });
    setSaving(false);
    if (error) {
      toast.error('Vytvorenie firmy zlyhalo', { description: error.message });
      return;
    }
    toast.success('Firma vytvorená');
    setForm({ ...emptyForm });
    await load();
  };

  const setHr = async (companyId: string) => {
    const email = (hrEmail[companyId] || '').trim();
    if (!email) return;
    const { error } = await supabase.rpc('admin_set_company_hr', { _company_id: companyId, _email: email });
    if (error) {
      toast.error('Nepodarilo sa nastaviť HR prístup');
      return;
    }
    toast.success('HR prístup pridelený');
    setHrEmail((p) => ({ ...p, [companyId]: '' }));
    await load();
  };

  const toggleActive = async (c: CompanyRow) => {
    const { error } = await supabase.rpc('admin_upsert_company', {
      _company_id: c.id,
      _name: c.name,
      _email_domain: c.email_domain,
      _billing_email: c.billing_email,
      _monthly_ride_limit: c.monthly_ride_limit,
      _monthly_amount_limit: c.monthly_amount_limit,
      _per_ride_limit: c.per_ride_limit,
      _workdays_only: c.workdays_only,
      _active: !c.active,
    });
    if (error) {
      toast.error('Zmena zlyhala');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Nová firma</CardTitle>
          <CardDescription>Zamestnanci s emailom na danej doméne majú jazdy zdarma v rámci limitov.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Názov firmy</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="INA Kysuce, s.r.o." />
          </div>
          <div className="space-y-1">
            <Label>Emailová doména</Label>
            <Input value={form.email_domain} onChange={(e) => setForm({ ...form, email_domain: e.target.value })} placeholder="ina.sk" />
          </div>
          <div className="space-y-1">
            <Label>Fakturačný email</Label>
            <Input value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} placeholder="fakturacia@ina.sk" />
          </div>
          <div className="space-y-1">
            <Label>IČO</Label>
            <Input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Limit jázd / zamestnanec / mesiac</Label>
            <Input type="number" value={form.monthly_ride_limit} onChange={(e) => setForm({ ...form, monthly_ride_limit: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Limit € / zamestnanec / mesiac</Label>
            <Input type="number" value={form.monthly_amount_limit} onChange={(e) => setForm({ ...form, monthly_amount_limit: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Limit € na jednu jazdu</Label>
            <Input type="number" value={form.per_ride_limit} onChange={(e) => setForm({ ...form, per_ride_limit: Number(e.target.value) })} />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vytvoriť firmu'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{c.email_domain} • faktúra: {c.billing_email}</p>
                  </div>
                  <Badge variant={c.active ? 'default' : 'outline'}>{c.active ? 'Aktívna' : 'Neaktívna'}</Badge>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {c.members} zam. • {c.month_rides} jázd • {Number(c.month_amount).toFixed(2)} €
                  </span>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>
                    {c.active ? 'Deaktivovať' : 'Aktivovať'}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <UserCog className="w-4 h-4 text-muted-foreground" />
                  <Input
                    className="max-w-xs"
                    placeholder={`hr@${c.email_domain}`}
                    value={hrEmail[c.id] ?? ''}
                    onChange={(e) => setHrEmail((p) => ({ ...p, [c.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="secondary" onClick={() => setHr(c.id)}>Pridať HR prístup</Button>
                  <span className="text-xs text-muted-foreground">HR sa prihlási v appke a uvidí portál na /firma</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {companies.length === 0 && <p className="text-sm text-muted-foreground">Žiadne firmy.</p>}
        </div>
      )}
    </div>
  );
}
