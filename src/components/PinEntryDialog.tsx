import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, ScanLine } from 'lucide-react';
import QrScannerDialog from './QrScannerDialog';

interface PinEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  passengerName: string;
  onVerified: () => void;
}

export const PinEntryDialog = ({ open, onOpenChange, requestId, passengerName, onVerified }: PinEntryDialogProps) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();

  const verifyPin = async (pinValue: string) => {
    if (pinValue.length !== 4) {
      toast({ title: 'Zadajte 4-miestny PIN', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('verify_ride_request_pin', {
      _request_id: requestId,
      _pin: pinValue,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }

    const result = data as { success: boolean; error?: string } | null;
    if (result?.success) {
      toast({ title: '✅ PIN potvrdený', description: 'Nástup pasažiera bol potvrdený.' });
      setPin('');
      onOpenChange(false);
      onVerified();
    } else {
      const msg =
        result?.error === 'invalid_pin' ? 'Nesprávny PIN kód.' :
        result?.error === 'already_used' ? 'Tento PIN bol už použitý.' :
        result?.error === 'forbidden' ? 'Nemáte oprávnenie.' :
        'PIN sa nepodarilo overiť.';
      toast({ title: 'Chyba', description: msg, variant: 'destructive' });
    }
  };

  const handleVerify = () => verifyPin(pin);

  const handleScanned = (scannedPin: string) => {
    setScannerOpen(false);
    setPin(scannedPin);
    verifyPin(scannedPin);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Potvrdiť nástup
          </DialogTitle>
          <DialogDescription>
            Zadajte 4-miestny PIN, ktorý vám ukáže pasažier <strong>{passengerName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="text-center text-3xl tracking-[0.6em] font-mono h-14"
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Zrušiť
          </Button>
          <Button onClick={handleVerify} disabled={loading || pin.length !== 4}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Overiť PIN'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinEntryDialog;
