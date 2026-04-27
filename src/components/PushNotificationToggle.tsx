import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    unsupportedReason,
    subscribe,
    unsubscribe
  } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported) {
    return (
      <p className="text-xs text-muted-foreground">
        {unsupportedReason === 'ios_install_required'
          ? 'Na iPhone fungujú push notifikácie až po nainštalovaní aplikácie na plochu (Zdieľať → Pridať na plochu).'
          : 'Push notifikácie nie sú podporované v tomto prehliadači.'}
      </p>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        // Mark as opted out so the auto-subscribe hook doesn't re-enable it.
        localStorage.setItem('takeme_push_optout', 'true');
        toast({
          title: 'Notifikácie vypnuté',
          description: 'Už nebudete dostávať push notifikácie.',
        });
      } else {
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa vypnúť notifikácie.',
          variant: 'destructive',
        });
      }
      return;
    }

    const result = await subscribe();
    if (result.success) {
      // Clear opt-out so future logins keep notifications on automatically.
      localStorage.removeItem('takeme_push_optout');
      toast({
        title: 'Notifikácie povolené',
        description: 'Budete dostávať upozornenia aj keď je aplikácia zatvorená.',
      });
      return;
    }

    if ('error' in result) {
      const error = result.error;

      if ((typeof Notification !== 'undefined' ? Notification.permission : permission) === 'denied' || error === 'permission_denied') {
        toast({
          title: 'Notifikácie zablokované',
          description: 'Povoľte notifikácie v nastaveniach prehliadača.',
          variant: 'destructive',
        });
        return;
      }

      if (error === 'ios_install_required') {
        toast({
          title: 'Najprv nainštalujte appku',
          description: 'Na iPhone fungujú push notifikácie až po Pridať na plochu.',
          variant: 'destructive',
        });
        return;
      }

      if (error === 'database_error') {
        toast({
          title: 'Chyba uloženia',
          description: 'Nepodarilo sa uložiť odber notifikácií, skúste to znova.',
          variant: 'destructive',
        });
        return;
      }

      if (error === 'service_worker_error') {
        toast({
          title: 'Chyba služby notifikácií',
          description: 'Skúste appku úplne zavrieť a otvoriť znova.',
          variant: 'destructive',
        });
        return;
      }
    }

    toast({
      title: 'Chyba',
      description: 'Nepodarilo sa zapnúť notifikácie. Skúste to znova.',
      variant: 'destructive',
    });
  };

  return (
    <Button
      variant={isSubscribed ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Spracovávam...
        </>
      ) : isSubscribed ? (
        <>
          <Bell className="h-4 w-4" />
          Notifikácie zapnuté
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Zapnúť notifikácie
        </>
      )}
    </Button>
  );
}
