import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface RatingDialogProps {
  rideRequestId: string;
  ratedUserId: string;
  ratedUserName: string;
  onRated?: () => void;
  // For controlled mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export const RatingDialog = ({ 
  rideRequestId, 
  ratedUserId, 
  ratedUserName, 
  onRated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true
}: RatingDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleSubmit = async () => {
    if (!profile || rating === 0) {
      toast({
        title: 'Chyba',
        description: 'Vyberte hodnotenie.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('ratings').insert({
      ride_request_id: rideRequestId,
      rater_id: profile.id,
      rated_user_id: ratedUserId,
      rating,
      comment: comment.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Už ste hodnotili',
          description: 'Túto jazdu ste už ohodnotili.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa odoslať hodnotenie.',
          variant: 'destructive',
        });
      }
      return;
    }

    toast({
      title: 'Hodnotenie odoslané',
      description: 'Ďakujeme za vaše hodnotenie!',
    });

    setOpen(false);
    setRating(0);
    setComment('');
    onRated?.();
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Star className="w-4 h-4" />
            Ohodnotiť
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ohodnoťte jazdu</DialogTitle>
          <DialogDescription>
            Hodnotíte: <strong>{ratedUserName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label>Hodnotenie *</Label>
            <div className="flex gap-2 justify-center py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'w-10 h-10 transition-colors',
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {displayRating === 1 && 'Veľmi zlé'}
              {displayRating === 2 && 'Zlé'}
              {displayRating === 3 && 'Priemerné'}
              {displayRating === 4 && 'Dobré'}
              {displayRating === 5 && 'Výborné'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Komentár (voliteľné)</Label>
            <Textarea
              placeholder="Napíšte krátky komentár..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={300}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/300
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
            <Button
              variant="hero"
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
            >
              {isSubmitting ? 'Odosielam...' : 'Odoslať hodnotenie'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
