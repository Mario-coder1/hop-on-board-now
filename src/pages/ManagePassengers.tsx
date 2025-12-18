import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Navigation as NavIcon, Phone, MessageCircle, CheckCircle, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NavigationBar from '@/components/Navigation';
import Map from '@/components/Map';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AcceptedPassenger {
  id: string;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  message: string | null;
  passenger: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    rating: number;
  };
}

interface RideInfo {
  id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

const ManagePassengers = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [passengers, setPassengers] = useState<AcceptedPassenger[]>([]);
  const [ride, setRide] = useState<RideInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPassenger, setSelectedPassenger] = useState<AcceptedPassenger | null>(null);

  useEffect(() => {
    if (rideId && profile) {
      fetchRideAndPassengers();
    }
  }, [rideId, profile]);

  const fetchRideAndPassengers = async () => {
    // Fetch ride info
    const { data: rideData } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideData) {
      setRide(rideData as RideInfo);
    }

    // Fetch accepted passengers
    const { data: passengersData } = await supabase
      .from('ride_requests')
      .select(`
        id, status, pickup_address, pickup_lat, pickup_lng, message,
        passenger:profiles!ride_requests_passenger_id_fkey(id, full_name, phone, avatar_url, rating)
      `)
      .eq('ride_id', rideId)
      .in('status', ['accepted', 'picked_up']);

    if (passengersData) {
      setPassengers(passengersData as unknown as AcceptedPassenger[]);
      if (passengersData.length > 0) {
        setSelectedPassenger(passengersData[0] as unknown as AcceptedPassenger);
      }
    }

    setLoading(false);
  };

  const handlePickup = async (requestId: string) => {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'picked_up' })
      .eq('id', requestId);

    if (!error) {
      toast({
        title: 'Pasažier vyzdvihnutý',
        description: 'Pasažier bol označený ako vyzdvihnutý.',
      });
      fetchRideAndPassengers();
    }
  };

  const openNavigation = (lat: number, lng: number, address: string) => {
    // Try to open in native maps app, fallback to Google Maps
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let url: string;
    
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    } else if (isAndroid) {
      url = `google.navigation:q=${lat},${lng}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    window.open(url, '_blank');
  };

  // Build map markers
  const markers = [];
  
  if (ride) {
    markers.push({
      id: 'origin',
      lat: Number(ride.origin_lat),
      lng: Number(ride.origin_lng),
      type: 'origin' as const,
      popup: `Štart: ${ride.origin_address}`
    });
    markers.push({
      id: 'destination',
      lat: Number(ride.destination_lat),
      lng: Number(ride.destination_lng),
      type: 'destination' as const,
      popup: `Cieľ: ${ride.destination_address}`
    });
  }

  passengers.forEach(p => {
    markers.push({
      id: `passenger-${p.id}`,
      lat: Number(p.pickup_lat),
      lng: Number(p.pickup_lng),
      type: 'pickup' as const,
      popup: `${p.passenger.full_name}: ${p.pickup_address}`
    });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>

          <h1 className="font-display text-3xl font-bold mb-2">Pasažieri na vyzdvihnutie</h1>
          <p className="text-muted-foreground mb-8">
            {ride?.origin_address} → {ride?.destination_address}
          </p>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Passengers List */}
            <div className="space-y-4">
              {passengers.length === 0 ? (
                <Card className="border-0 shadow-card">
                  <CardContent className="p-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-display text-lg font-semibold mb-2">Žiadni pasažieri</h3>
                    <p className="text-muted-foreground">
                      Zatiaľ nemáte žiadnych prijatých pasažierov pre túto jazdu.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                passengers.map((passenger) => (
                  <Card 
                    key={passenger.id} 
                    className={`border-0 shadow-card cursor-pointer transition-all ${
                      selectedPassenger?.id === passenger.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedPassenger(passenger)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {passenger.passenger.avatar_url ? (
                            <img 
                              src={passenger.passenger.avatar_url} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover" 
                            />
                          ) : (
                            <span className="text-xl font-semibold text-primary">
                              {passenger.passenger.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-semibold">
                              {passenger.passenger.full_name}
                            </h3>
                            <Badge variant={passenger.status === 'picked_up' ? 'default' : 'secondary'} 
                              className={passenger.status === 'picked_up' ? 'bg-green-500' : ''}
                            >
                              {passenger.status === 'picked_up' ? 'Vyzdvihnutý' : 'Čaká'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-1">
                            ⭐ {passenger.passenger.rating?.toFixed(1) || '5.0'}
                          </p>
                          
                          <div className="flex items-start gap-1 text-sm">
                            <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{passenger.pickup_address}</span>
                          </div>

                          {passenger.message && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/50 text-sm">
                              <MessageCircle className="w-3 h-3 inline mr-1" />
                              {passenger.message}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="hero"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNavigation(
                              Number(passenger.pickup_lat), 
                              Number(passenger.pickup_lng), 
                              passenger.pickup_address
                            );
                          }}
                        >
                          <NavIcon className="w-4 h-4" />
                          Navigovať
                        </Button>
                        
                        {passenger.passenger.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${passenger.passenger.phone}`, '_self');
                            }}
                          >
                            <Phone className="w-4 h-4" />
                            Volať
                          </Button>
                        )}
                        
                        {passenger.status !== 'picked_up' && (
                          <Button
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePickup(passenger.id);
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Vyzdvihnutý
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Map */}
            <div className="lg:sticky lg:top-24">
              <Card className="border-0 shadow-card overflow-hidden">
                <CardContent className="p-0">
                  <Map 
                    markers={markers}
                    showRoute
                    className="h-[500px]"
                    center={selectedPassenger ? [
                      Number(selectedPassenger.pickup_lng),
                      Number(selectedPassenger.pickup_lat)
                    ] : undefined}
                    zoom={selectedPassenger ? 13 : 10}
                  />
                </CardContent>
              </Card>
              
              {selectedPassenger && (
                <div className="mt-4 p-4 rounded-xl bg-card border border-border">
                  <p className="text-sm text-muted-foreground mb-2">Vybraný pasažier:</p>
                  <p className="font-semibold">{selectedPassenger.passenger.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPassenger.pickup_address}</p>
                  <Button
                    variant="hero"
                    className="w-full mt-3 gap-2"
                    onClick={() => openNavigation(
                      Number(selectedPassenger.pickup_lat),
                      Number(selectedPassenger.pickup_lng),
                      selectedPassenger.pickup_address
                    )}
                  >
                    <NavIcon className="w-4 h-4" />
                    Otvoriť navigáciu
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

export default ManagePassengers;