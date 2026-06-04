import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bell, Phone, CheckCircle2 } from 'lucide-react';

const DISMISS_KEY = 'takeme_welcome_onboarded';

/**
 * Shown once after first login / registration when the profile has no phone yet.
 * Step 1: phone number, Step 2: push notification permission.
 */
export function WelcomeOnboardingDialog() {
  const { profile, refreshProfile } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushSaving, setPushSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (localStorage.getItem(DISMISS_KEY) === profile.id) return;
    // Show if no phone OR (phone exists but push not yet subscribed/decided)
    const needPhone = !profile.phone;
    const needPush = isSupported && !isSubscribed && permission !== 'denied';
    if (needPhone || needPush) {
      setOpen(true);
      setStep(needPhone ? 1 : 2);
      setPhone(profile.phone || '');
    } else {
      localStorage.setItem(DISMISS_KEY, profile.id);
    }
  }, [profile, isSupported, isSubscribed, permission]);

  const handleSavePhone = async () => {
    if (!profile) return;
    const cleaned = phone.trim();
    if (cleaned && !/^[+0-9\s()-]{6,20}$/.test(cleaned)) {
      toast({ title: 'Neplatné číslo', description: 'Skontroluj formát telefónneho čísla.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ phone: cleaned || null }).eq('id', profile.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    await refreshProfile();
    if (isSupported && !isSubscribed && permission !== 'denied') {
      setStep(2);
    } else {
      finish();
    }
  };

  const handleEnablePush = async () => {
    setPushSaving(true);
    const res = await subscribe();
    setPushSaving(false);
    if (res.success) {
      localStorage.removeItem('takeme_push_optout');
      toast({ title: 'Notifikácie zapnuté' });
    }
    finish();
  };

  const finish = () => {
    if (profile) localStorage.setItem(DISMISS_KEY, profile.id);
    setOpen(false);
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* mandatory – cannot dismiss */ }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === 1 ? (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Doplň telefónne číslo</DialogTitle>
              <DialogDescription>
                Vodiči aj spolujazdci sa s tebou tak môžu rýchlo skontaktovať. Číslo zostáva súkromné a zdieľa sa len pri potvrdených jazdách.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="onboard-phone">Telefón <span className="text-destructive">*</span></Label>
              <Input
                id="onboard-phone"
                type="tel"
                placeholder="+421 900 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Tento krok je povinný pre pokračovanie.</p>
            </div>
            <DialogFooter>
              <Button onClick={handleSavePhone} disabled={saving || !phone.trim()} className="w-full">
                {saving ? 'Ukladám...' : 'Pokračovať'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Zapni si upozornenia</DialogTitle>
              <DialogDescription>
                Dostávaj okamžité notifikácie o novej žiadosti, prijatej jazde alebo keď vodič dorazí. Funguje aj keď je appka zatvorená.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> Vodič ťa vyzdvihne načas</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> Nezmeškáš novú rezerváciu</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> Vypneš ich kedykoľvek v profile</li>
            </ul>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={finish} disabled={pushSaving}>Teraz nie</Button>
              <Button onClick={handleEnablePush} disabled={pushSaving}>
                {pushSaving ? 'Zapínam...' : 'Zapnúť upozornenia'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
