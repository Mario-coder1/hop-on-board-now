import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Car,
  Loader2,
  Locate,
  MessageCircle,
  Phone,
  Star,
  Users,
  Dog,
  Cigarette,
  Briefcase,
  Music,
  Wind,
  Coffee,
  Info,
  Timer,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import AddressSearch from '@/components/AddressSearch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sk } from 'date-fns/locale';
import { formatDbDate, parseDbTimestamp } from '@/lib/datetime';
import SEO from '@/components/SEO';
import RideBadge from '@/components/RideBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RidePaymentCheckout } from '@/components/RidePaymentCheckout';
import { CancellationDialog } from '@/components/CancellationDialog';
import { sendPushNotification } from '@/hooks/usePushNotifications';
import { getStripeEnvironment } from '@/lib/stripe';
import { useGasStations } from '@/hooks/useGasStations';
import { computeRidePrice } from '@/lib/ridePricing';
import { isPointNearRoute, parseRoutePolyline, type LngLat } from '@/lib/routeProximity';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'driver_arrived'
  | 'rejected'
  | 'picked_up'
  | 'completed'
  | null;

interface RideStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  stop_order: number;
}

interface RideDetailData {
  id: string;
  driver_id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  pets_allowed: boolean | null;
  smoking_allowed: boolean | null;
  luggage_allowed: boolean | null;
  music_allowed: boolean | null;
  ac_allowed: boolean | null;
  food_allowed: boolean | null;
  gas_station_id: string | null;
  route_polyline: string | null;
  max_detour_km: number | null;
  gas_station: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    discount_note: string | null;
  } | null;
  driver: {
    id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    bio: string | null;
    car_model: string | null;
    car_color: string | null;
    total_rides: number | null;
  } | null;
}

interface AcceptedPassenger {
  id: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  passenger: {
    full_name: string | null;
  } | null;
}

type DriverContact = {
  phone: string | null;
  license_plate: string | null;
};

const RideDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [ride, setRide] = useState<RideDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [hasRequested, setHasRequested] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [acceptedPassengers, setAcceptedPassengers] = useState<AcceptedPassenger[]>([]);
  const [stops, setStops] = useState<RideStop[]>([]);

  const [pickup, setPickup] = useState<{ address: string; lat: number; lng: number }>({
    address: '',
    lat: 0,
    lng: 0,
  });
  const [dropoff, setDropoff] = useState<{ address: string; lat: number; lng: number }>({
    address: '',
    lat: 0,
    lng: 0,
  });
  const [gettingPickupLocation, setGettingPickupLocation] = useState(false);

  const [driverContact, setDriverContact] = useState<DriverContact | null>(null);

  const isDriver = useMemo(() => {
    if (!profile || !ride) return false;
    return profile.id === ride.driver_id;
  }, [profile, ride]);

  const canSeeDriverContact = useMemo(() => {
    if (!profile || !ride) return false;
    if (isDriver) return true;
    return (
      requestStatus === 'accepted' ||
      requestStatus === 'driver_arrived' ||
      requestStatus === 'picked_up' ||
      requestStatus === 'completed'
    );
  }, [profile, ride, isDriver, requestStatus]);

  // Proportional price preview based on selected pickup/dropoff
  const priceEstimate = useMemo(() => {
    if (!ride || !pickup.lat) return null;
    return computeRidePrice({
      pricePerSeat: Number(ride.price_per_seat),
      origin: [ride.origin_lng, ride.origin_lat],
      destination: [ride.destination_lng, ride.destination_lat],
      pickup: [pickup.lng, pickup.lat],
      dropoff: dropoff.lat ? [dropoff.lng, dropoff.lat] : null,
      routePolyline: ride.route_polyline,
    });
  }, [ride, pickup, dropoff]);

  // Verify pickup/dropoff lie within reasonable distance from the ride's route.
  // Threshold = max(driver's declared detour, 15 km default).
  const routeCheck = useMemo(() => {
    if (!ride) return { pickupOk: true, dropoffOk: true, thresholdKm: 0 };
    const detourKm = Math.max(Number(ride.max_detour_km) || 0, 15);
    const thresholdM = detourKm * 1000;
    const route = parseRoutePolyline(ride.route_polyline);
    const origin: LngLat = [Number(ride.origin_lng), Number(ride.origin_lat)];
    const dest: LngLat = [Number(ride.destination_lng), Number(ride.destination_lat)];
    const pickupOk = !pickup.lat
      ? true
      : isPointNearRoute([pickup.lng, pickup.lat], route, origin, dest, thresholdM);
    const dropoffOk = !dropoff.lat
      ? true
      : isPointNearRoute([dropoff.lng, dropoff.lat], route, origin, dest, thresholdM);
    return { pickupOk, dropoffOk, thresholdKm: detourKm };
  }, [ride, pickup, dropoff]);

  useEffect(() => {
    if (!id) return;
    void fetchRide();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void checkExistingRequest();
    void fetchAcceptedPassengers();
    void fetchStops();
  }, [id, profile?.id]);

  // Realtime: keep request status in sync so UI reflects driver actions immediately
  useEffect(() => {
    if (!id || !profile?.id) return;
    const channel = supabase
      .channel(`ride-detail-${id}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: `passenger_id=eq.${profile.id}`,
        },
        (payload: any) => {
          const row = (payload.new || payload.old) as { ride_id?: string } | null;
          if (row?.ride_id && row.ride_id !== id) return;
          void checkExistingRequest();
          void fetchAcceptedPassengers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` },
        () => { void fetchRide(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, profile?.id]);


  // Removed: Default pickup = origin - now passengers must specify their own pickup location

  useEffect(() => {
    if (!ride || !profile || !canSeeDriverContact) {
      setDriverContact(null);
      return;
    }

    const fetchContact = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone, license_plate')
        .eq('id', ride.driver_id)
        .maybeSingle();

      if (!error && data) {
        setDriverContact({
          phone: data.phone ?? null,
          license_plate: data.license_plate ?? null,
        });
      }
    };

    void fetchContact();
  }, [ride?.driver_id, profile?.id, canSeeDriverContact]);

  const fetchRide = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('rides')
      .select(
        `
          id,
          driver_id,
          origin_address,
          destination_address,
          origin_lat,
          origin_lng,
          destination_lat,
          destination_lng,
          departure_time,
          available_seats,
          price_per_seat,
          status,
          pets_allowed,
          smoking_allowed,
          luggage_allowed,
          music_allowed,
          ac_allowed,
          food_allowed,
          route_polyline,
          max_detour_km,
          gas_station_id,
          gas_station:gas_stations!rides_gas_station_id_fkey(
            id, name, address, lat, lng, discount_note
          ),
          driver:public_profiles!rides_driver_id_fkey(
            id,
            full_name,
            avatar_url,
            rating,
            bio,
            car_model,
            car_color,
            total_rides
          )
        `
      )
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
      setRide(null);
      setLoading(false);
      return;
    }

    setRide(data as unknown as RideDetailData);
    setLoading(false);
  };

  const checkExistingRequest = async () => {
    if (!profile || !id) {
      setHasRequested(false);
      setRequestStatus(null);
      return;
    }

    const { data } = await supabase
      .from('ride_requests')
      .select('id, status')
      .eq('ride_id', id)
      .eq('passenger_id', profile.id)
      .maybeSingle();

    setHasRequested(!!data);
    setRequestStatus((data?.status as RequestStatus) ?? null);
    setRequestId((data?.id as string) ?? null);
  };

  const handleCancelRequest = async (reason: string) => {
    if (!requestId || !ride || !profile) return;
    setCancelling(true);
    const wasAccepted = requestStatus === 'accepted' || requestStatus === 'driver_arrived';

    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa zrušiť žiadosť.', variant: 'destructive' });
      setCancelling(false);
      return;
    }

    if (wasAccepted) {
      await supabase
        .from('rides')
        .update({ available_seats: ride.available_seats + 1 })
        .eq('id', ride.id);
    }

    try {
      await supabase.functions.invoke('refund-ride-payment', {
        body: { request_id: requestId, environment: getStripeEnvironment() },
      });
    } catch (e) {
      console.error('refund error', e);
    }

    try {
      const passengerName = profile?.full_name || 'Pasažier';
      await sendPushNotification(
        ride.driver_id,
        '❌ Zrušená rezervácia',
        `${passengerName} zrušil rezerváciu. Dôvod: ${reason}`
      );
    } catch (err) {
      console.error('push error', err);
    }

    toast({
      title: 'Žiadosť zrušená',
      description: wasAccepted
        ? 'Vaša rezervácia bola zrušená a miesto bolo uvoľnené. Platba bude vrátená.'
        : 'Vaša žiadosť bola zrušená. Platba bude vrátená.',
    });

    setCancelOpen(false);
    setCancelling(false);
    void checkExistingRequest();
    void fetchRide();
  };

  const fetchAcceptedPassengers = async () => {
    if (!id) return;

    const { data } = await supabase
      .from('ride_requests')
      .select(
        `
          id,
          pickup_address,
          pickup_lat,
          pickup_lng,
          passenger:public_profiles!ride_requests_passenger_id_fkey(full_name)
        `
      )
      .eq('ride_id', id)
      .in('status', ['accepted', 'picked_up']);

    if (data) {
      setAcceptedPassengers(data as unknown as AcceptedPassenger[]);
    }
  };

  const fetchStops = async () => {
    if (!id) return;

    const { data } = await supabase
      .from('ride_stops')
      .select('id, address, lat, lng, stop_order')
      .eq('ride_id', id)
      .order('stop_order', { ascending: true });

    if (data) {
      setStops(data as RideStop[]);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=sk`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const getPickupFromCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Chyba',
        description: 'Geolokácia nie je podporovaná vo vašom prehliadači.',
        variant: 'destructive',
      });
      return;
    }

    setGettingPickupLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setPickup({ address, lat: latitude, lng: longitude });
        setGettingPickupLocation(false);
      },
      () => {
        setGettingPickupLocation(false);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa získať vašu polohu. Povoľte prístup k polohe.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleRequest = async () => {
    if (!profile || !ride) return;
    if (!pickup.lat || !pickup.lng || !pickup.address) {
      toast({ title: 'Chyba', description: 'Vyberte miesto nastúpenia.', variant: 'destructive' });
      return;
    }
    if (ride.available_seats <= 0) {
      toast({ title: 'Plné', description: 'Táto jazda už nemá voľné miesta.', variant: 'destructive' });
      return;
    }
    if (!routeCheck.pickupOk) {
      toast({
        title: 'Mimo trasy',
        description: `Miesto nastúpenia je príliš ďaleko od trasy vodiča (max ${routeCheck.thresholdKm} km). Vyberte miesto bližšie k trase.`,
        variant: 'destructive',
      });
      return;
    }
    if (!routeCheck.dropoffOk) {
      toast({
        title: 'Mimo trasy',
        description: `Miesto vystúpenia je príliš ďaleko od trasy vodiča (max ${routeCheck.thresholdKm} km). Vyberte miesto bližšie k trase.`,
        variant: 'destructive',
      });
      return;
    }
    // Stripe zatiaľ nie je nakonfigurovaný — žiadosť odošleme priamo bez platby
    setRequesting(true);
    try {
      const { error } = await supabase.from('ride_requests').insert({
        ride_id: ride.id,
        passenger_id: profile.id,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address || null,
        dropoff_lat: dropoff.lat || null,
        dropoff_lng: dropoff.lng || null,
        message: message || null,
        status: 'pending',
        payment_status: 'unpaid',
        price_per_seat_snapshot: Number(ride.price_per_seat),
      });
      if (error) throw error;
      toast({ title: 'Žiadosť odoslaná', description: 'Vodič dostane upozornenie. Platba bude doplnená neskôr.' });
    } catch (e: any) {
      toast({ title: 'Chyba', description: e.message || 'Nepodarilo sa odoslať žiadosť.', variant: 'destructive' });
    } finally {
      setRequesting(false);
    }
  };


  const requestStatusLabel = useMemo(() => {
    switch (requestStatus) {
      case 'pending':
        return { title: 'Žiadosť odoslaná', desc: 'Čakajte na odpoveď vodiča' };
      case 'accepted':
        return { title: 'Schválené', desc: 'Vodič vás prijal' };
      case 'driver_arrived':
        return { title: 'Vodič je na mieste', desc: 'Príďte k autu' };
      case 'picked_up':
        return { title: 'Ste na ceste', desc: 'Jazda prebieha' };
      case 'completed':
        return { title: 'Dokončené', desc: 'Jazda je ukončená' };
      case 'rejected':
        return { title: 'Zamietnuté', desc: 'Vodič zamietol vašu žiadosť' };
      default:
        return null;
    }
  }, [requestStatus]);

  const ttlDate = useMemo(() => {
    if (!ride?.departure_time) return null;
    const d = parseDbTimestamp(ride.departure_time);
    if (!d) return null;
    d.setHours(d.getHours() + 24);
    return d;
  }, [ride?.departure_time]);

  const gasStations = useGasStations();
  const markers = useMemo(() => {
    if (!ride) return [];

    const base = [
      {
        id: 'origin',
        lat: Number(ride.origin_lat),
        lng: Number(ride.origin_lng),
        type: 'origin' as const,
        popup: `Štart: ${ride.origin_address}`,
      },
      ...stops.map((stop) => ({
        id: `stop-${stop.id}`,
        lat: Number(stop.lat),
        lng: Number(stop.lng),
        type: 'stop' as const,
        popup: `Zastávka ${stop.stop_order}: ${stop.address}`,
      })),
      {
        id: 'dest',
        lat: Number(ride.destination_lat),
        lng: Number(ride.destination_lng),
        type: 'destination' as const,
        popup: `Cieľ: ${ride.destination_address}`,
      },
      ...acceptedPassengers.map((p) => ({
        id: `pickup-${p.id}`,
        lat: Number(p.pickup_lat),
        lng: Number(p.pickup_lng),
        type: 'pickup' as const,
        popup: p.passenger?.full_name
          ? `Pasažier: ${p.passenger.full_name} — ${p.pickup_address}`
          : `Miesto nastúpenia: ${p.pickup_address}`,
      })),
      ...(ride.gas_station ? [{
        id: 'gas-station',
        lat: Number(ride.gas_station.lat),
        lng: Number(ride.gas_station.lng),
        type: 'gas_station' as const,
        popup: `⛽ ${ride.gas_station.name} ${ride.gas_station.discount_note ? '— ' + ride.gas_station.discount_note : ''}`,
      }] : []),
    ];

    const pickupIsDifferentFromOrigin =
      !!pickup.lat &&
      !!pickup.lng &&
      (Number(pickup.lat) !== Number(ride.origin_lat) || Number(pickup.lng) !== Number(ride.origin_lng));

    if (!isDriver && pickupIsDifferentFromOrigin) {
      base.push({
        id: 'your-pickup',
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
        type: 'pickup' as const,
        popup: `Vaše nastúpenie: ${pickup.address}`,
      });
    }

    return base;
  }, [ride, acceptedPassengers, stops, pickup.lat, pickup.lng, pickup.address, isDriver]);

  const waypoints = useMemo(() => {
    return stops.map((stop) => ({
      lat: Number(stop.lat),
      lng: Number(stop.lng),
    }));
  }, [stops]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Detail jazdy" description="Detail spolujazdy — trasa, cena, vodič, dostupné miesta a možnosť rezervácie cez TakeMe." path="/ride" noindex />
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Jazda nenájdená</h1>
          <Button onClick={() => navigate('/search')}>Späť na vyhľadávanie</Button>
        </div>
      </div>
    );
  }

  const driverName = ride.driver?.full_name || 'Vodič';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation />

      <main className="container mx-auto px-4 py-8 pb-32 md:pb-8 max-w-full">
        <h1 className="sr-only">Detail jazdy</h1>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <section className="lg:col-span-2 space-y-6">
              {/* Route */}
              <article className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted px-3 py-1.5 rounded-full">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{ride.available_seats} voľných miest</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    {stops.length > 0 ? (
                      <>
                        {stops.map((_, idx) => (
                          <div key={idx} className="flex flex-col items-center">
                            <div className="w-0.5 h-8 bg-border my-1" />
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                          </div>
                        ))}
                        <div className="w-0.5 h-8 bg-border my-1" />
                      </>
                    ) : (
                      <div className="w-0.5 h-16 bg-border my-1" />
                    )}
                    <div className="w-4 h-4 rounded-full bg-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Štart</p>
                      <p className="font-display text-lg font-semibold">{ride.origin_address}</p>
                    </div>
                    {stops.map((stop) => (
                      <div key={stop.id} className="mb-4">
                        <p className="text-sm text-orange-500">Zastávka {stop.stop_order}</p>
                        <p className="font-display font-medium">{stop.address}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-sm text-muted-foreground">Cieľ</p>
                      <p className="font-display text-lg font-semibold">{ride.destination_address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="font-medium">{formatDbDate(ride.departure_time, 'd. MMMM', { locale: sk })}</p>
                    <p className="text-sm text-muted-foreground">{formatDbDate(ride.departure_time, 'HH:mm')}</p>
                  </div>
                  <div className="text-center">
                    <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="font-medium">{ride.available_seats}</p>
                    <p className="text-sm text-muted-foreground">voľné miesta</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-primary">{ride.price_per_seat}€</span>
                    <p className="text-sm text-muted-foreground">za miesto</p>
                  </div>
                </div>

                {ttlDate && (
                  <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border flex items-start gap-2 text-xs text-muted-foreground">
                    <Timer className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Jazda sa automaticky zmaže:{' '}
                      <span className="font-medium text-foreground">
                        {formatDbDate(ttlDate.toISOString(), 'd. MMMM HH:mm', { locale: sk })}
                      </span>
                    </span>
                  </div>
                )}
              </article>

              {/* Map with route */}
              <Map markers={[...markers, ...gasStations]} waypoints={waypoints} showRoute className="h-[400px]" />
            </section>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Driver */}
              <article className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display font-semibold mb-4">Vodič</h2>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {ride.driver?.avatar_url ? (
                      <img
                        src={ride.driver.avatar_url}
                        alt={`${driverName} profilová fotka vodiča`}
                        className="w-full h-full rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">{driverName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg">{driverName}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{ride.driver?.rating?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {ride.driver?.bio && <p className="text-sm text-muted-foreground mb-4">{ride.driver.bio}</p>}

                {ride.driver?.car_model && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {ride.driver.car_color} {ride.driver.car_model}
                    </span>
                  </div>
                )}

                {canSeeDriverContact && driverContact?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{driverContact.phone}</span>
                  </div>
                )}
              </article>

              {/* Ride Preferences */}
              {ride && (
                <article className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="font-display font-semibold mb-4">Preferencie jazdy</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'pets_allowed' as const, label: 'Zvieratá', icon: Dog },
                      { key: 'smoking_allowed' as const, label: 'Fajčenie', icon: Cigarette },
                      { key: 'luggage_allowed' as const, label: 'Batožina', icon: Briefcase },
                      { key: 'music_allowed' as const, label: 'Hudba', icon: Music },
                      { key: 'ac_allowed' as const, label: 'Klimatizácia', icon: Wind },
                      { key: 'food_allowed' as const, label: 'Občerstvenie', icon: Coffee },
                    ].map((pref) => {
                      const allowed = ride[pref.key] ?? (pref.key === 'pets_allowed' || pref.key === 'smoking_allowed' ? false : true);
                      return (
                        <div
                          key={pref.key}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-sm ${
                            allowed
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <pref.icon className="w-4 h-4 shrink-0" />
                          <span className="font-medium">{pref.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              )}

              {/* Request */}
              {!isDriver && profile && (
                <article className="p-6 rounded-2xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold">Požiadať o pripojenie</h2>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted px-3 py-1.5 rounded-full">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{ride.available_seats} voľných</span>
                    </div>
                  </div>

                  {ride.available_seats <= 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-destructive" />
                      </div>
                      <p className="font-medium text-destructive">Jazda je plná</p>
                      <p className="text-sm text-muted-foreground">
                        Všetky miesta sú obsadené. Skúste vyhľadať inú jazdu.
                      </p>
                    </div>
                  ) : hasRequested ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="font-medium text-green-600">{requestStatusLabel?.title ?? 'Žiadosť odoslaná'}</p>
                      <p className="text-sm text-muted-foreground mb-4">{requestStatusLabel?.desc ?? 'Čakajte na odpoveď vodiča'}</p>
                      {(requestStatus === 'pending' || requestStatus === 'accepted' || requestStatus === 'driver_arrived') && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => setCancelOpen(true)}
                        >
                          Zrušiť rezerváciu
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Label className="text-primary font-semibold">Kde vás má vodič vyzdvihnúť?</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Zadajte vašu presnú adresu, aby vás vodič vedel nájsť
                        </p>
                        <Button
                          variant="secondary"
                          className="w-full mb-2 gap-2"
                          onClick={getPickupFromCurrentLocation}
                          disabled={gettingPickupLocation}
                        >
                          {gettingPickupLocation ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Locate className="w-4 h-4" />
                          )}
                          Použiť moju aktuálnu polohu
                        </Button>
                        <div className="relative">
                          <AddressSearch
                            value={pickup.address}
                            onSelect={(address, lat, lng) => setPickup({ address, lat, lng })}
                            placeholder="alebo zadajte adresu..."
                            className="w-full"
                          />
                        </div>
                        {pickup.address && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Locate className="w-3 h-3" />
                            {pickup.address}
                          </p>
                        )}
                      </div>

                      <div className="mb-4">
                        <Label>Miesto vystúpenia <span className="text-muted-foreground font-normal">(voliteľné)</span></Label>
                        <div className="flex gap-2 mt-1">
                          <AddressSearch
                            value={dropoff.address}
                            onSelect={(address, lat, lng) => setDropoff({ address, lat, lng })}
                            placeholder="Kde chcete vystúpiť?"
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ak nechcete ísť až do cieľa, vyberte kde vystúpite.
                        </p>
                      </div>

                      <Textarea
                        placeholder="Správa pre vodiča (voliteľné)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="mb-4"
                        rows={3}
                      />

                      {priceEstimate && (dropoff.lat || (Number(pickup.lat) === Number(ride.origin_lat) && Number(pickup.lng) === Number(ride.origin_lng))) && (
                        <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                          {priceEstimate.proportional && priceEstimate.ratio < 0.999 && (
                            <>
                              <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">Vaša časť trasy</span>
                                <span className="font-medium tabular-nums">
                                  {priceEstimate.segmentKm.toFixed(1)} km z {priceEstimate.totalKm.toFixed(1)} km
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline mt-1">
                                <span className="text-muted-foreground">Plná cena vodiča</span>
                                <span className="line-through text-muted-foreground tabular-nums">{Number(ride.price_per_seat).toFixed(2)} €</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between items-baseline mt-1">
                            <span className="text-muted-foreground">Cena vodiča</span>
                            <span className="tabular-nums">{priceEstimate.basePrice.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <span className="text-muted-foreground">Poplatok platformy ({priceEstimate.commissionPercent}%)</span>
                            <span className="tabular-nums">+{priceEstimate.commission.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <span className="text-muted-foreground">Poplatok za platbu kartou</span>
                            <span className="tabular-nums">+{priceEstimate.stripeFee.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between items-baseline mt-1 pt-2 border-t border-primary/20">
                            <span className="font-semibold">Zaplatíte spolu</span>
                            <span className="font-bold text-primary tabular-nums">{priceEstimate.amount.toFixed(2)} €</span>
                          </div>
                        </div>
                      )}

                      {pickup.lat && !dropoff.lat && (Number(pickup.lat) !== Number(ride.origin_lat) || Number(pickup.lng) !== Number(ride.origin_lng)) && (
                        <div className="mb-3 p-3 rounded-xl bg-muted border border-border text-sm">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-muted-foreground">
                                Cena sa odvíja od miesta výstupenia. Vyberte kde chcete vystúpiť, aby sa zobrazila presná suma.
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Ak pôjdete celú trasu až do cieľa, zaplatíte <span className="font-medium text-foreground">{Number(ride.price_per_seat).toFixed(2)} €</span>.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!pickup.lat && (
                        <p className="text-xs text-muted-foreground text-center mb-3">
                          Cena sa zobrazí po výbere miesta nastúpenia.
                        </p>
                      )}

                      {(!routeCheck.pickupOk || !routeCheck.dropoffOk) && (
                        <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                          {!routeCheck.pickupOk && (
                            <p>
                              <strong>Miesto nastúpenia je mimo trasy vodiča.</strong> Vodič ide po inej trase – vyberte miesto do {routeCheck.thresholdKm} km od jeho trasy.
                            </p>
                          )}
                          {!routeCheck.dropoffOk && (
                            <p className={!routeCheck.pickupOk ? 'mt-2' : ''}>
                              <strong>Miesto vystúpenia je mimo trasy vodiča.</strong> Vyberte miesto do {routeCheck.thresholdKm} km od jeho trasy.
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        variant="hero"
                        className="w-full"
                        onClick={handleRequest}
                        disabled={
                          requesting ||
                          ride.available_seats <= 0 ||
                          !pickup.lat ||
                          !routeCheck.pickupOk ||
                          !routeCheck.dropoffOk
                        }
                      >
                        {requesting
                          ? 'Odosielanie...'
                          : pickup.lat && (dropoff.lat || (Number(pickup.lat) === Number(ride.origin_lat) && Number(pickup.lng) === Number(ride.origin_lng)))
                            ? `Rezervovať a zaplatiť ${priceEstimate?.amount?.toFixed(2)} €`
                            : 'Rezervovať a zaplatiť'}
                      </Button>
                    </>
                  )}
                </article>
              )}

              {!profile && (
                <article className="p-6 rounded-2xl bg-card border border-border text-center">
                  <p className="text-muted-foreground mb-4">Pre pripojenie k jazde sa prihláste</p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Prihlásiť sa
                  </Button>
                </article>
              )}
            </aside>
          </div>
        </motion.div>
      </main>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zaplatiť rezerváciu ({(priceEstimate?.amount ?? Number(ride?.price_per_seat ?? 0)).toFixed(2)} €)</DialogTitle>
          </DialogHeader>
          {ride && pickup.lat !== 0 && (
            <RidePaymentCheckout
              rideId={ride.id}
              pickup={pickup}
              dropoff={dropoff.lat ? dropoff : {}}
              message={message}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>

      <CancellationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancelRequest}
        loading={cancelling}
        type="request"
      />
    </div>
  );
};

export default RideDetail;
