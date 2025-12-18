import { useState } from 'react';
import { Flag } from 'lucide-react';
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

interface ReportDialogProps {
  reportedUserId: string;
  reportedUserName: string;
  rideId?: string;
}

const REPORT_REASONS = [
  { value: 'dangerous_driving', label: 'Nebezpečná jazda' },
  { value: 'inappropriate_behavior', label: 'Nevhodné správanie' },
  { value: 'no_show', label: 'Neprišiel na miesto' },
  { value: 'wrong_car', label: 'Iné auto ako v profile' },
  { value: 'harassment', label: 'Obťažovanie' },
  { value: 'fraud', label: 'Podvod' },
  { value: 'other', label: 'Iné' },
];

export const ReportDialog = ({ reportedUserId, reportedUserName, rideId }: ReportDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!profile || !reason) {
      toast({
        title: 'Chyba',
        description: 'Vyberte dôvod nahlásenia.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('reports').insert({
      reporter_id: profile.id,
      reported_user_id: reportedUserId,
      ride_id: rideId || null,
      reason,
      description: description.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odoslať nahlásenie.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Nahlásenie odoslané',
      description: 'Ďakujeme za nahlásenie. Preveríme to.',
    });

    setOpen(false);
    setReason('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
          <Flag className="w-4 h-4" />
          Nahlásiť
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nahlásiť používateľa</DialogTitle>
          <DialogDescription>
            Nahlasujete: <strong>{reportedUserName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Dôvod nahlásenia *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte dôvod" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Popis (voliteľné)</Label>
            <Textarea
              placeholder="Popíšte situáciu podrobnejšie..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
            >
              {isSubmitting ? 'Odosielam...' : 'Odoslať nahlásenie'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
