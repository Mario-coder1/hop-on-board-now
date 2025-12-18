import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users, Car, Star, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface RideDetail {
  id: string;
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
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating: number;
    bio: string | null;
    car_model: string | null;
    car_color: string | null;
    license_plate: string | null;
    phone: string | null;
  };
}

interface AcceptedPassenger {
  id: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  passenger: {
    full_name: string;
  };
}

const RideDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const [hasRequested, setHasRequested] = useState(false);
  const [acceptedPassengers, setAcceptedPassengers] = useState<AcceptedPassenger[]>([]);

  useEffect(() => {
    if (id) {
      fetchRide();
      checkExistingRequest();
      fetchAcceptedPassengers();
    }
  }, [id, profile]);

  const fetchRide = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:profiles!rides_driver_id_fkey(
          id, full_name, avatar_url, rating, bio, 
          car_model, car_color, license_plate, phone
        )
      `)
      .eq('id', id)
      .single();

    if (data && !error) {
      setRide(data as unknown as RideDetail);
    }
    setLoading(false);
  };

  const checkExistingRequest = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('ride_requests')
      .select('id')
      .eq('ride_id', id)
      .eq('passenger_id', profile.id)
      .maybeSingle();
    
    setHasRequested(!!data);
  };

  const fetchAcceptedPassengers = async () => {
    const { data } = await supabase
      .from('ride_requests')
      .select(`
        id, pickup_address, pickup_lat, pickup_lng,
        passenger:profiles!ride_requests_passenger_id_fkey(full_name)
      `)
      .eq('ride_id', id)
      .in('status', ['accepted', 'picked_up']);

    if (data) {
      setAcceptedPassengers(data as unknown as AcceptedPassenger[]);
    }
  };

  const handleRequest = async () => {
    if (!profile || !ride) return;
    
    setRequesting(true);
    try {
      const { error } = await supabase.from('ride_requests').insert({
        ride_id: ride.id,
        passenger_id: profile.id,
        pickup_address: ride.origin_address,
        pickup_lat: ride.origin_lat,
        pickup_lng: ride.origin_lng,
        message: message || null,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: 'Žiadosť odoslaná!',
        description: 'Vodič bol notifikovaný o vašej žiadosti.',
      });
      
      setHasRequested(true);
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setRequesting(false);
    }
  };

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

  const isDriver = profile?.id === ride.driver.id;
  
  // Build markers - origin, destination, and accepted passengers' pickup locations
  const markers = [
    { id: 'origin', lat: Number(ride.origin_lat), lng: Number(ride.origin_lng), type: 'origin' as const, popup: `<strong>Štart:</strong><br/>${ride.origin_address}` },
    { id: 'dest', lat: Number(ride.destination_lat), lng: Number(ride.destination_lng), type: 'destination' as const, popup: `<strong>Cieľ:</strong><br/>${ride.destination_address}` },
    ...acceptedPassengers.map(p => ({
      id: `pickup-${p.id}`,
      lat: Number(p.pickup_lat),
      lng: Number(p.pickup_lng),
      type: 'pickup' as const,
      popup: `<strong>Pasažier:</strong> ${p.passenger.full_name}<br/>${p.pickup_address}`
    }))
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Route */}
              <div className="p-6 rounded-2xl bg-card border border-border">
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
              </div>

              {/* Map with route */}
              <Map markers={markers} showRoute className="h-[400px]" />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Driver */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h3 className="font-display font-semibold mb-4">Vodič</h3>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {ride.driver.avatar_url ? (
                      <img src={ride.driver.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-2xl">{ride.driver.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg">{ride.driver.full_name}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{ride.driver.rating?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {ride.driver.bio && (
                  <p className="text-sm text-muted-foreground mb-4">{ride.driver.bio}</p>
                )}

                {ride.driver.car_model && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span>{ride.driver.car_color} {ride.driver.car_model}</span>
                  </div>
                )}

                {ride.driver.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{ride.driver.phone}</span>
                  </div>
                )}
              </div>

              {/* Request */}
              {!isDriver && profile && (
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h3 className="font-display font-semibold mb-4">Požiadať o pripojenie</h3>
                  
                  {hasRequested ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="font-medium text-green-600">Žiadosť odoslaná</p>
                      <p className="text-sm text-muted-foreground">Čakajte na odpoveď vodiča</p>
                    </div>
                  ) : (
                    <>
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
                </div>
              )}

              {!profile && (
                <div className="p-6 rounded-2xl bg-card border border-border text-center">
                  <p className="text-muted-foreground mb-4">Pre pripojenie k jazde sa prihláste</p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    Prihlásiť sa
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RideDetail;