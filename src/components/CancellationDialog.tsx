import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  type: 'ride' | 'request';
}

const RIDE_REASONS = [
  'Zmena plánov',
  'Porucha vozidla',
  'Osobné dôvody',
  'Zlé počasie',
  'Iný dôvod'
];

const REQUEST_REASONS = [
  'Zmena plánov',
  'Našiel som inú jazdu',
  'Osobné dôvody',
  'Iný dôvod'
];

export const CancellationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  type
}: CancellationDialogProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const reasons = type === 'ride' ? RIDE_REASONS : REQUEST_REASONS;
  const isOther = selectedReason === 'Iný dôvod';
  const finalReason = isOther ? customReason : selectedReason;

  const handleConfirm = () => {
    if (finalReason.trim()) {
      onConfirm(finalReason.trim());
      setSelectedReason('');
      setCustomReason('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReason('');
      setCustomReason('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'ride' ? 'Zrušiť jazdu' : 'Zrušiť rezerváciu'}
          </DialogTitle>
          <DialogDescription>
            Vyberte dôvod zrušenia. Táto informácia pomôže zlepšiť službu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {reasons.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer">{reason}</Label>
              </div>
            ))}
          </RadioGroup>

          {isOther && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Uveďte dôvod</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Napíšte váš dôvod..."
                className="resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Späť
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={loading || !finalReason.trim()}
          >
            {loading ? 'Ruším...' : 'Potvrdiť zrušenie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
