import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, MessageCircle, User, Car, MapPin, CheckCircle, KeyRound, QrCode } from 'lucide-react';
import PinQrDialog from '@/components/PinQrDialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LiveTrackingMap from '@/components/LiveTrackingMap';
import Navigation from '@/components/Navigation';
import { ReportDialog } from '@/components/ReportDialog';
import { RatingDialog } from '@/components/RatingDialog';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';

interface DriverInfo {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  car_model: string | null;
  car_color: string | null;
  license_plate: string | null;
  total_rides: number | null;
}

interface RideRequest {
  id: string;
  status: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  pin_code: string | null;
  pin_verified_at: string | null;
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
  ride: {
    id: string;
    destination_lat: number;
    destination_lng: number;
    destination_address: string;
    departure_time: string;
    driver_id: string;
  };
}

const TrackRide: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const previousStatus = useRef<string | null>(null);

  const fetchRideRequest = async () => {
    if (!requestId) return;

    // First fetch the ride request and ride info
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        id,
        status,
        pickup_lat,
        pickup_lng,
        pickup_address,
        pin_code,
        pin_verified_at,
        driver_confirmed_at,
        passenger_confirmed_at,
        ride:rides!inner (
          id,
          destination_lat,
          destination_lng,
          destination_address,
          departure_time,
          driver_id
        )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ride request:', error);
      setLoading(false);
      return;
    }
    
    if (!data) {
      setLoading(false);
      return;
    }

    const ride = Array.isArray(data.ride) ? data.ride[0] : data.ride;
    
    setRideRequest({
      ...data,
      ride: ride
    } as RideRequest);

    // Fetch driver info from profiles (RLS policy allows passengers to see driver for their accepted rides)
    if (ride?.driver_id) {
      const { data: driverData, error: driverError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url, car_model, car_color, license_plate, total_rides')
        .eq('id', ride.driver_id)
        .maybeSingle();

      if (driverError) {
        console.error('Error fetching driver:', driverError);
      } else if (driverData) {
        setDriver({
          id: driverData.id,
          full_name: driverData.full_name || 'Neznámy vodič',
          phone: driverData.phone,
          avatar_url: driverData.avatar_url,
          car_model: driverData.car_model,
          car_color: driverData.car_color,
          license_plate: driverData.license_plate,
          total_rides: (driverData as any).total_rides ?? null,
        });
      }
    }
    
    setLoading(false);
  };

  // Check if user already rated this ride
  const checkExistingRating = async () => {
    if (!requestId || !profile) return;
    
    const { data } = await supabase
      .from('ratings')
      .select('id')
      .eq('ride_request_id', requestId)
      .eq('rater_id', profile.id)
      .maybeSingle();
    
    setHasRated(!!data);
  };

  useEffect(() => {
    fetchRideRequest();
  }, [requestId]);

  useEffect(() => {
    if (profile && requestId) {
      checkExistingRating();
    }
  }, [profile, requestId]);

  // Show rating dialog when status changes to completed
  useEffect(() => {
    if (rideRequest && !hasRated) {
      const currentStatus = rideRequest.status;
      
      // If status just changed to completed, show rating dialog
      if (currentStatus === 'completed' && previousStatus.current !== 'completed') {
        setTimeout(() => {
          setShowRatingDialog(true);
        }, 500); // Small delay for better UX
      }
      
      previousStatus.current = currentStatus;
    }
  }, [rideRequest?.status, hasRated]);

  // Realtime subscription for ride status changes
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`track-ride-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${requestId}`
        },
        () => {
          console.log('[Realtime] Ride request status changed');
          fetchRideRequest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const handleRated = () => {
    setHasRated(true);
    setShowRatingDialog(false);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Sledovanie jazdy naživo" description="Live sledovanie polohy vodiča v reálnom čase počas tvojej cesty." path="/track" noindex />
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!rideRequest) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Jazda nenájdená</h1>
          <Link to="/passenger">
            <Button>Späť na dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { ride } = rideRequest;

  // Fallback driver info if not loaded
  const displayDriver = driver || {
    id: ride.driver_id,
    full_name: 'Vodič',
    phone: null,
    avatar_url: null,
    car_model: null,
    car_color: null,
    license_plate: null
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <Navigation />
      
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 sm:space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/my-trips">
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Sledovanie jazdy</h1>
              <p className="text-xs sm:text-base text-muted-foreground truncate">
                {rideRequest.status === 'accepted' && 'Vodič je na ceste'}
                {rideRequest.status === 'driver_arrived' && 'Vodič vás čaká na mieste'}
                {rideRequest.status === 'picked_up' && 'Ste na ceste k cieľu'}
                {rideRequest.status === 'completed' && 'Jazda dokončená'}
              </p>
            </div>
          </div>

          {/* Prominent driver-arrived banner */}
          {rideRequest.status === 'driver_arrived' && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sm:p-5 shadow-lg border-2 border-amber-300"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0"
                >
                  <Car className="w-6 h-6" />
                </motion.div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg leading-tight">🚗 Vodič dorazil!</h3>
                  <p className="text-xs sm:text-sm opacity-95 leading-snug">
                    {displayDriver.full_name} vás čaká na mieste vyzdvihnutia. Ukážte mu váš PIN nižšie.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Map */}
          <LiveTrackingMap
            driverProfileId={displayDriver.id}
            passengerLocation={{
              lat: Number(rideRequest.pickup_lat),
              lng: Number(rideRequest.pickup_lng)
            }}
            destinationLocation={{
              lat: Number(ride.destination_lat),
              lng: Number(ride.destination_lng)
            }}
            className="h-[28vh] sm:h-[50vh] rounded-2xl overflow-hidden"
          />

          {/* Driver Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-4 sm:p-6 border border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {displayDriver.avatar_url ? (
                  <img src={displayDriver.avatar_url} alt={displayDriver.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{displayDriver.full_name}</h3>
                  <RideBadge totalRides={(displayDriver as any).total_rides} size="sm" />
                </div>
                {displayDriver.car_model && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Car className="w-4 h-4" />
                    <span>{displayDriver.car_color} {displayDriver.car_model}</span>
                    {displayDriver.license_plate && (
                      <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                        {displayDriver.license_plate}
                      </span>
                    )}
                  </div>
                )}
                {!driver && (
                  <p className="text-xs text-muted-foreground mt-1">Načítavam detaily...</p>
                )}
              </div>

              <div className="flex gap-2">
                {displayDriver.phone && (
                  <a href={`tel:${displayDriver.phone}`}>
                    <Button variant="outline" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="icon">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <ReportDialog
                  reportedUserId={displayDriver.id}
                  reportedUserName={displayDriver.full_name}
                  rideId={ride.id}
                />
              </div>
            </div>

            {/* Route Info */}
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vyzdvihnutie</p>
                  <p className="font-medium">{rideRequest.pickup_address}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cieľ</p>
                  <p className="font-medium">{ride.destination_address}</p>
                </div>
              </div>
            </div>

            {/* PIN verification block — show while ride not yet active */}
            {(rideRequest.status === 'accepted' || rideRequest.status === 'driver_arrived') && rideRequest.pin_code && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border"
              >
                <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-3 sm:p-5">
                  <div className="flex items-center gap-2 mb-1.5 text-primary">
                    <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                    <h3 className="font-semibold text-sm sm:text-base">Váš PIN pre vodiča</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    Ukážte PIN vodičovi. Po jeho overení sa jazda automaticky spustí.
                  </p>
                  <div className="text-center py-2 sm:py-4">
                    {rideRequest.pin_verified_at ? (
                      <div className="inline-flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="font-semibold text-sm sm:text-base">PIN overený vodičom</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl sm:text-5xl font-mono font-bold tracking-[0.3em] sm:tracking-[0.4em] text-primary select-all">
                          {rideRequest.pin_code}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 sm:mt-4 gap-2 rounded-full"
                          onClick={() => setQrOpen(true)}
                        >
                          <QrCode className="w-4 h-4" />
                          Zobraziť ako QR kód
                        </Button>
                      </>
                    )}
                  </div>

                  <PinQrDialog open={qrOpen} onOpenChange={setQrOpen} pin={rideRequest.pin_code} />

                  <div className="text-center text-xs sm:text-sm text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Po overení PINu sa jazda automaticky spustí
                  </div>
                </div>
              </motion.div>
            )}


            {rideRequest.status === 'picked_up' && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-600">Jazda prebieha</p>
                  <p className="text-sm text-muted-foreground">Ste vo vozidle — príjemnú cestu!</p>
                </div>
              </div>
            )}

            {/* Completed Status */}
            {rideRequest.status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center"
              >
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-green-600">Jazda dokončená!</h3>
                <p className="text-muted-foreground mt-1">
                  Ďakujeme, že ste cestovali s nami.
                </p>
                {!hasRated && (
                  <Button 
                    variant="hero" 
                    className="mt-4"
                    onClick={() => setShowRatingDialog(true)}
                  >
                    Ohodnotiť vodiča
                  </Button>
                )}
                {hasRated && (
                  <p className="text-sm text-muted-foreground mt-3">
                    ✓ Ďakujeme za vaše hodnotenie
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Rating Dialog */}
      {driver && (
        <RatingDialog
          rideRequestId={rideRequest.id}
          ratedUserId={driver.id}
          ratedUserName={driver.full_name}
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          showTrigger={false}
          onRated={handleRated}
        />
      )}
    </div>
  );
};

export default TrackRide;
