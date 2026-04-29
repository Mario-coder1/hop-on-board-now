import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


interface ActiveRide {
  id: string;
  destination_address: string;
}

const ActiveRideFAB: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isDriver = profile?.selected_role === 'driver';

  // Hide on auth/install/landing routes
  const hiddenRoutes = ['/', '/auth', '/install', '/privacy', '/gdpr'];
  const shouldHide =
    hiddenRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/manage-passengers');

  const fetchActiveRide = async () => {
    if (!profile || !isDriver) {
      setActiveRide(null);
      return;
    }

    const { data } = await supabase
      .from('rides')
      .select('id, destination_address')
      .eq('driver_id', profile.id)
      .in('status', ['active', 'in_progress'])
      .order('departure_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    setActiveRide(data as ActiveRide | null);
  };

  useEffect(() => {
    fetchActiveRide();
  }, [profile, isDriver, location.pathname]);

  // Realtime: listen for ride status changes
  useEffect(() => {
    if (!profile || !isDriver) return;

    const channel = supabase
      .channel('active-ride-fab')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${profile.id}`,
        },
        () => fetchActiveRide()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, isDriver]);

  const handleComplete = async () => {
    if (!activeRide) return;
    setCompleting(true);

    try {
      // Update ride
      const { error: rideError } = await supabase
        .from('rides')
        .update({ status: 'completed' })
        .eq('id', activeRide.id);

      if (rideError) throw rideError;

      // Update requests - push notifications are sent via DB trigger
      await supabase
        .from('ride_requests')
        .update({ status: 'completed' })
        .eq('ride_id', activeRide.id)
        .in('status', ['accepted', 'driver_arrived', 'picked_up']);

      toast({
        title: '🏁 Jazda dokončená',
        description: 'Všetci pasažieri boli upozornení.',
      });

      setActiveRide(null);
      setConfirmOpen(false);
      navigate('/driver');
    } catch (err) {
      console.error('Error completing ride:', err);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa ukončiť jazdu.',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  const visible = isDriver && activeRide && !shouldHide;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed z-[60] bottom-24 right-4 md:bottom-6 md:right-6"
          >
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setConfirmOpen(true)}
              className="rounded-full shadow-2xl gap-2 h-14 px-5 font-semibold"
            >
              <Flag className="w-5 h-5" />
              Ukončiť jazdu
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ukončiť jazdu?</AlertDialogTitle>
            <AlertDialogDescription>
              Týmto označíte jazdu ako dokončenú a všetci pasažieri budú upozornení.
              Túto akciu nie je možné vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleComplete();
              }}
              disabled={completing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ukončujem...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Áno, ukončiť
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActiveRideFAB;
