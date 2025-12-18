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
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

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
  driver: {
    id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    bio: string | null;
    car_model: string | null;
    car_color: string | null;
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

  const [hasRequested, setHasRequested] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(null);

  const [acceptedPassengers, setAcceptedPassengers] = useState<AcceptedPassenger[]>([]);

  const [pickup, setPickup] = useState<{ address: string; lat: number; lng: number }>({
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

  useEffect(() => {
    if (!id) return;
    void fetchRide();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void checkExistingRequest();
    void fetchAcceptedPassengers();
  }, [id, profile?.id]);

  useEffect(() => {
    if (!ride) return;

    // Default pickup = origin (so passenger can request immediately like before)
    if (!pickup.lat || !pickup.lng) {
      setPickup({
        address: ride.origin_address,
        lat: Number(ride.origin_lat),
        lng: Number(ride.origin_lng),
      });
    }
  }, [ride]);

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
          driver:public_profiles!rides_driver_id_fkey(
            id,
            full_name,
            avatar_url,
            rating,
            bio,
            car_model,
            car_color
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
      toast({
        title: 'Chyba',
        description: 'Vyberte miesto nastúpenia.',
        variant: 'destructive',
      });
      return;
    }

    if (ride.available_seats <= 0) {
      toast({
        title: 'Plné',
        description: 'Táto jazda už nemá voľné miesta.',
        variant: 'destructive',
      });
      return;
    }

    setRequesting(true);
    try {
      const { error } = await supabase.from('ride_requests').insert({
        ride_id: ride.id,
        passenger_id: profile.id,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        message: message || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Žiadosť odoslaná!',
        description: 'Vodič bol notifikovaný o vašej žiadosti.',
      });

      setHasRequested(true);
      setRequestStatus('pending');
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
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
  }, [ride, acceptedPassengers, pickup.lat, pickup.lng, pickup.address, isDriver]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
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
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    <div className="w-0.5 h-16 bg-border my-1" />
                    <div className="w-4 h-4 rounded-full bg-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-6">
                      <p className="text-sm text-muted-foreground">Štart</p>
                      <p className="font-display text-lg font-semibold">{ride.origin_address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cieľ</p>
                      <p className="font-display text-lg font-semibold">{ride.destination_address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="font-medium">{format(new Date(ride.departure_time), 'd. MMMM', { locale: sk })}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(ride.departure_time), 'HH:mm')}</p>
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
              </article>

              {/* Map with route */}
              <Map markers={markers} showRoute className="h-[400px]" />
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

              {/* Request */}
              {!isDriver && profile && (
                <article className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="font-display font-semibold mb-4">Požiadať o pripojenie</h2>

                  {hasRequested ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="font-medium text-green-600">{requestStatusLabel?.title ?? 'Žiadosť odoslaná'}</p>
                      <p className="text-sm text-muted-foreground">{requestStatusLabel?.desc ?? 'Čakajte na odpoveď vodiča'}</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Label>Miesto nastúpenia</Label>
                        <div className="flex gap-2 mt-1">
                          <AddressSearch
                            value={pickup.address}
                            onSelect={(address, lat, lng) => setPickup({ address, lat, lng })}
                            placeholder="Kde chcete nastúpiť?"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={getPickupFromCurrentLocation}
                            disabled={gettingPickupLocation}
                            aria-label="Použiť moju polohu"
                          >
                            {gettingPickupLocation ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Locate className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vyberte bod, kde vás má vodič vyzdvihnúť (napr. po ceste).
                        </p>
                      </div>

                      <Textarea
                        placeholder="Správa pre vodiča (voliteľné)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="mb-4"
                        rows={3}
                      />

                      <Button
                        variant="hero"
                        className="w-full"
                        onClick={handleRequest}
                        disabled={requesting}
                      >
                        {requesting ? 'Odosielanie...' : 'Poslať žiadosť'}
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
    </div>
  );
};

export default RideDetail;
