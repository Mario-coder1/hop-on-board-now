import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: 'Notifikácie vypnuté',
          description: 'Už nebudete dostávať push notifikácie.',
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: 'Notifikácie povolené',
          description: 'Budete dostávať upozornenia aj keď je aplikácia zatvorená.',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Notifikácie zablokované',
          description: 'Povoľte notifikácie v nastaveniach prehliadača.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Button
      variant={isSubscribed ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2"
    >
      {isSubscribed ? (
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
