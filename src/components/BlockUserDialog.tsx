import { useEffect, useState } from 'react';
import { Ban, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BlockUserDialogProps {
  blockedUserId: string;
  blockedUserName: string;
}

const BLOCK_REASONS = [
  { value: 'uncomfortable', label: 'Necítim sa s ním bezpečne' },
  { value: 'dangerous_driving', label: 'Nebezpečná jazda' },
  { value: 'inappropriate_behavior', label: 'Nevhodné správanie' },
  { value: 'no_show', label: 'Neprišiel na miesto' },
  { value: 'spam', label: 'Spam / obťažovanie správami' },
  { value: 'other', label: 'Iné' },
];

export const BlockUserDialog = ({ blockedUserId, blockedUserName }: BlockUserDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!profile?.id || !blockedUserId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', profile.id)
        .eq('blocked_user_id', blockedUserId)
        .maybeSingle();
      if (active) setIsBlocked(!!data);
    })();
    return () => {
      active = false;
    };
  }, [profile?.id, blockedUserId]);

  const handleBlock = async () => {
    if (!profile || !reason) {
      toast({ title: 'Chyba', description: 'Vyberte dôvod blokovania.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const fullReason = note.trim() ? `${reason}: ${note.trim()}` : reason;
    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: profile.id,
      blocked_user_id: blockedUserId,
      reason: fullReason,
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zablokovať používateľa.',
        variant: 'destructive',
      });
      return;
    }

    setIsBlocked(true);
    setOpen(false);
    setReason('');
    setNote('');
    toast({
      title: 'Používateľ zablokovaný',
      description: `${blockedUserName} bol pridaný do tvojho zoznamu blokovaných.`,
    });
  };

  const handleUnblock = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', profile.id)
      .eq('blocked_user_id', blockedUserId);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odblokovať používateľa.',
        variant: 'destructive',
      });
      return;
    }

    setIsBlocked(false);
    toast({ title: 'Odblokované', description: `${blockedUserName} už nie je blokovaný.` });
  };

  if (!profile || profile.id === blockedUserId) return null;

  if (isBlocked) {
    return (
      <Button variant="ghost" size="sm" className="gap-2" onClick={handleUnblock} disabled={isSubmitting}>
        <ShieldCheck className="w-4 h-4" />
        Odblokovať
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Ban className="w-4 h-4" />
          Zablokovať
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zablokovať používateľa</DialogTitle>
          <DialogDescription>
            Blokujete: <strong>{blockedUserName}</strong>. Dôvod evidujeme kvôli bezpečnosti komunity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Dôvod blokovania *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte dôvod" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Poznámka (voliteľné)</Label>
            <Textarea
              placeholder="Doplňujúce informácie..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={!reason || isSubmitting}>
              {isSubmitting ? 'Blokujem...' : 'Zablokovať'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
