import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (pin: string) => void;
}

type PermState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export const QrScannerDialog = ({ open, onOpenChange, onScanned }: QrScannerDialogProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'qr-reader-container';
  const { toast } = useToast();
  const [perm, setPerm] = useState<PermState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true);
  const isSecure = typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost');

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

  const startScanner = async () => {
    setErrorMsg('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setPerm('unsupported');
      setErrorMsg('Tento prehliadač nepodporuje prístup ku kamere.');
      return;
    }
    if (!isSecure) {
      setPerm('denied');
      setErrorMsg('Kameru je možné použiť iba cez HTTPS.');
      return;
    }
    setPerm('requesting');
    try {
      // Explicit getUserMedia call triggered by user tap — this is the moment iOS/Android shows the permission prompt.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      // Immediately stop this probe stream — html5-qrcode will open its own.
      stream.getTracks().forEach((t) => t.stop());
      setPerm('granted');

      // Slight delay to let dialog/container mount
      await new Promise((r) => setTimeout(r, 50));
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
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPerm('denied');
        setErrorMsg('Prístup ku kamere bol zamietnutý.');
      } else if (name === 'NotFoundError') {
        setPerm('denied');
        setErrorMsg('Nenašla sa žiadna kamera.');
      } else {
        setPerm('denied');
        setErrorMsg(e?.message || 'Kameru sa nepodarilo spustiť.');
      }
    }
  };

  useEffect(() => {
    if (!open) {
      stop();
      setPerm('idle');
      setErrorMsg('');
    }
    return () => {
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
            Pre skenovanie QR kódu je potrebný prístup ku kamere.
          </DialogDescription>
        </DialogHeader>

        {/* Scanner container — always mounted so html5-qrcode can attach */}
        <div
          id={elementId}
          className={`w-full rounded-xl overflow-hidden bg-black aspect-square ${perm === 'granted' ? '' : 'hidden'}`}
        />

        {perm === 'idle' && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Camera className="w-6 h-6" strokeWidth={1.6} />
            </div>
            <p className="text-sm text-muted-foreground">
              Klikni na tlačidlo nižšie — prehliadač sa opýta na povolenie kamery.
            </p>
            <Button onClick={startScanner} className="w-full gap-2 h-12 rounded-full">
              <Camera className="w-4 h-4" />
              Povoliť kameru a spustiť
            </Button>
            {isIOS && isStandalone && (
              <p className="text-[11px] text-muted-foreground">
                Ak sa nič nestane, otvor appku v Safari (nie z plochy) a skús znova.
              </p>
            )}
          </div>
        )}

        {perm === 'requesting' && (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Čakám na povolenie kamery…</p>
          </div>
        )}

        {(perm === 'denied' || perm === 'unsupported') && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" strokeWidth={1.6} />
            </div>
            <p className="text-sm font-semibold">Kamera nie je dostupná</p>
            {errorMsg && <p className="text-xs text-muted-foreground">{errorMsg}</p>}
            <div className="text-left text-xs text-muted-foreground space-y-2 w-full bg-muted/40 rounded-lg p-3">
              {isIOS ? (
                <>
                  <p className="font-semibold text-foreground">iPhone / iPad:</p>
                  <p>1. Otvor <strong>Nastavenia</strong> → <strong>Safari</strong> → <strong>Kamera</strong> → <em>Povoliť</em>.</p>
                  <p>2. Alebo v Safari ťukni na <strong>„aA"</strong> v adresnom riadku → <strong>Nastavenia webovej stránky</strong> → <strong>Kamera: Povoliť</strong>.</p>
                  {isStandalone && <p>3. PWA z plochy môže mať obmedzený prístup — skús cez Safari.</p>}
                </>
              ) : (
                <>
                  <p className="font-semibold text-foreground">Android (Chrome):</p>
                  <p>1. Ťukni na ikonu vedľa adresy ( <strong>🔒</strong> alebo <strong>ⓘ</strong> ) → <strong>Povolenia</strong> → <strong>Kamera: Povoliť</strong>.</p>
                  <p>2. Alebo <strong>Nastavenia Chrome</strong> → <strong>Nastavenia stránok</strong> → <strong>Kamera</strong>.</p>
                  <p>3. Obnov stránku a skús znova.</p>
                </>
              )}
            </div>
            <Button onClick={startScanner} variant="outline" className="w-full rounded-full">
              Skúsiť znova
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QrScannerDialog;
