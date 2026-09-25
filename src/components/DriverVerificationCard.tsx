import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BadgeCheck, Loader2, ShieldQuestion } from 'lucide-react';
import { toast } from 'sonner';

const LABELS: Record<string, string> = {
  not_started: 'Neoverený',
  in_progress: 'Overovanie prebieha',
  in_review: 'Čaká na kontrolu',
  declined: 'Overenie zamietnuté',
  approved: 'Overený vodič',
};

export default function DriverVerificationCard() {
  const [status, setStatus] = useState<string>('not_started');
  const [busy, setBusy] = useState(false);

  const check = async () => {
    const { data } = await supabase.functions.invoke('didit-kyc', { body: { action: 'check' } });
    if (data?.status) setStatus(data.status);
  };
  useEffect(() => { check(); }, []);

  const start = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('didit-kyc', {
      body: { action: 'start', return_url: `${window.location.origin}/profile` },
    });
    setBusy(false);
    if (error || !data?.url) { toast.error('Overenie sa nepodarilo spustiť'); return; }
    window.location.href = data.url;
  };

  const ok = status === 'approved';
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border mt-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {ok ? <BadgeCheck className="w-5 h-5 text-primary" /> : <ShieldQuestion className="w-5 h-5 text-primary" />}
        </div>
        <div>
          <div className="font-semibold">Overenie vodiča (doklad + selfie)</div>
          <div className="text-xs text-muted-foreground">{LABELS[status] ?? status}</div>
        </div>
      </div>
      {!ok && (
        <Button size="sm" onClick={status === 'in_progress' || status === 'in_review' ? check : start} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'in_progress' || status === 'in_review' ? 'Skontrolovať' : 'Overiť sa'}
        </Button>
      )}
    </div>
  );
}
