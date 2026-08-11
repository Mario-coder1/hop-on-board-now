import React, { useState } from 'react';
import { Share2, Copy, Check, Facebook, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDbDate } from '@/lib/datetime';
import { sk } from 'date-fns/locale';

interface ShareRideButtonProps {
  rideId: string;
  origin: string;
  destination: string;
  departureTime?: string | null;
  pricePerSeat?: number | string | null;
  seats?: number | null;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

const ShareRideButton: React.FC<ShareRideButtonProps> = ({
  rideId,
  origin,
  destination,
  departureTime,
  pricePerSeat,
  seats,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Zdieľať',
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/ride/${rideId}`;

  const when = departureTime
    ? `${formatDbDate(departureTime, 'd. MMMM', { locale: sk })} o ${formatDbDate(departureTime, 'HH:mm')}`
    : null;

  const priceText =
    pricePerSeat !== null && pricePerSeat !== undefined
      ? `${Number(pricePerSeat).toFixed(2)} € / miesto`
      : null;

  // Text bez odkazu — pre nativne zdieľanie (Messenger si odkaz vezme z `url`)
  const messageNoUrl = [
    `🚗 Ponúkam spolujazdu: ${origin} → ${destination}`,
    when ? `📅 ${when}` : null,
    priceText ? `💰 ${priceText}` : null,
    seats ? `👥 Voľné miesta: ${seats}` : null,
    '#TakeMe #spolujazda',
  ]
    .filter(Boolean)
    .join('\n');

  const message = `${messageNoUrl}\n\nPripoj sa jedným klikom: ${url}`;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Skopírované', description: `${what} je v schránke — vlož to na Facebook.` });
    } catch {
      toast({ title: 'Chyba', description: 'Nepodarilo sa skopírovať.', variant: 'destructive' });
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Spolujazda ${origin} → ${destination}`,
          text: messageNoUrl,
          url,
        });
        return;
      } catch {
        // user cancelled or unsupported — fall back to dialog
      }
    }
    setOpen(true);
  };


  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleClick} aria-label="Zdieľať jazdu">
        <Share2 className={size === 'icon' ? 'w-4 h-4' : 'w-4 h-4 mr-2'} />
        {size !== 'icon' && label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Zdieľať jazdu</DialogTitle>
            <DialogDescription>
              Skopíruj text alebo odkaz a vlož ho na Facebook, do skupiny či na WhatsApp. Kto klikne, otvorí sa mu
              priamo táto jazda.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap break-words">
            {message}
          </div>

          <div className="grid gap-2">
            <Button onClick={() => copy(message, 'Text jazdy')} className="w-full">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Kopírovať text s odkazom
            </Button>
            <Button variant="outline" onClick={() => copy(url, 'Odkaz')} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Kopírovať len odkaz
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                asChild
                className="w-full"
              >
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </a>
              </Button>
              <Button variant="secondary" asChild className="w-full">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareRideButton;
