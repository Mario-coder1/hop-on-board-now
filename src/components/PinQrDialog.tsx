import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

interface PinQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: string;
}

export const PinQrDialog = ({ open, onOpenChange, pin }: PinQrDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Váš QR kód
          </DialogTitle>
          <DialogDescription>
            Ukážte vodičovi tento QR kód alebo PIN nižšie.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white rounded-2xl border border-border">
            <QRCodeSVG value={pin} size={220} level="H" />
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1">PIN</p>
            <p className="text-4xl font-mono font-bold tracking-[0.4em] text-foreground select-all">{pin}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinQrDialog;
