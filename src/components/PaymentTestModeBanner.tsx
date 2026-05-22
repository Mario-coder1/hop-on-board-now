import { isPaymentsTestMode } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!isPaymentsTestMode()) return null;
  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-1.5 text-center text-xs text-orange-800 z-50">
      Platby sú v testovacom režime. Použite kartu <code className="font-mono">4242 4242 4242 4242</code>, ľubovoľné budúce dátum a CVC.
    </div>
  );
}
