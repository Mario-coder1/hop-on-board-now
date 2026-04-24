import { useState } from 'react';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { profile } = useAuth();
  const [testLoading, setTestLoading] = useState(false);

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

  const handleSendTest = async () => {
    if (!profile?.id) return;
    setTestLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id);

      if (countError) throw countError;

      if (!count || count === 0) {
        toast({
          title: 'Žiadny aktívny odber',
          description: 'Najprv zapnite notifikácie a povoľte ich v prehliadači.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          profile_id: profile.id,
          title: '🔔 Testovacia notifikácia',
          body: 'Skvelé! Push notifikácie fungujú správne.',
          data: { type: 'test' },
          tag: 'test-push',
        },
      });

      if (error) throw error;

      toast({
        title: 'Test odoslaný',
        description: `Notifikácia bola odoslaná na ${count} zariadenie(í).`,
      });
    } catch (error: any) {
      console.error('[Push] Test error:', error);
      toast({
        title: 'Chyba odoslania',
        description: error?.message || 'Nepodarilo sa odoslať testovaciu notifikáciu.',
        variant: 'destructive',
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
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
      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendTest}
          disabled={testLoading}
          className="gap-2"
        >
          {testLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Odosielam...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Pošli mi test push
            </>
          )}
        </Button>
      )}
    </div>
  );
}
