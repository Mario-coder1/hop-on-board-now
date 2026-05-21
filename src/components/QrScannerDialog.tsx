import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (pin: string) => void;
}

export const QrScannerDialog = ({ open, onOpenChange, onScanned }: QrScannerDialogProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'qr-reader-container';
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const start = async () => {
      try {
        const scanner = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            const pin = decodedText.replace(/\D/g, '').slice(0, 4);
            if (pin.length === 4) {
              onScanned(pin);
              stop();
            }
          },
          () => {}
        );
        if (cancelled) await scanner.stop().catch(() => {});
      } catch (e: any) {
        toast({
          title: 'Nedá sa spustiť kameru',
          description: e?.message || 'Skontrolujte povolenia kamery.',
          variant: 'destructive',
        });
        onOpenChange(false);
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          if (s.isScanning) await s.stop();
          await s.clear();
        } catch {}
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            Naskenovať QR kód
          </DialogTitle>
          <DialogDescription>
            Namierte kameru na QR kód pasažiera.
          </DialogDescription>
        </DialogHeader>
        <div id={elementId} className="w-full rounded-xl overflow-hidden bg-black aspect-square" />
      </DialogContent>
    </Dialog>
  );
};

export default QrScannerDialog;
