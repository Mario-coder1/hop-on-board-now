import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, MessageCircle, User, Car, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LiveTrackingMap from '@/components/LiveTrackingMap';
import Navigation from '@/components/Navigation';

interface RideRequest {
  id: string;
  status: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  ride: {
    id: string;
    destination_lat: number;
    destination_lng: number;
    destination_address: string;
    departure_time: string;
    driver_id: string;
    driver: {
      id: string;
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
      car_model: string | null;
      car_color: string | null;
      license_plate: string | null;
    };
  };
}

const TrackRide: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { profile } = useAuth();
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRideRequest = async () => {
      if (!requestId) return;

      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          ride:rides!inner (
            id,
            destination_lat,
            destination_lng,
            destination_address,
            departure_time,
            driver_id,
            driver:profiles!rides_driver_id_fkey (
              id,
              full_name,
              phone,
              avatar_url,
              car_model,
              car_color,
              license_plate
            )
          )
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ride request:', error);
      } else if (data) {
        const ride = Array.isArray(data.ride) ? data.ride[0] : data.ride;
        const driver = ride?.driver;
        setRideRequest({
          ...data,
          ride: {
            ...ride,
            driver: Array.isArray(driver) ? driver[0] : driver
          }
        } as RideRequest);
      }
      setLoading(false);
    };

    fetchRideRequest();
  }, [requestId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
  const driver = ride.driver;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/my-trips">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Sledovanie jazdy</h1>
              <p className="text-muted-foreground">
                {rideRequest.status === 'accepted' && 'Vodič je na ceste'}
                {rideRequest.status === 'picked_up' && 'Ste na ceste k cieľu'}
                {rideRequest.status === 'completed' && 'Jazda dokončená'}
              </p>
            </div>
          </div>

          {/* Map */}
          <LiveTrackingMap
            driverProfileId={driver.id}
            passengerLocation={{
              lat: Number(rideRequest.pickup_lat),
              lng: Number(rideRequest.pickup_lng)
            }}
            destinationLocation={{
              lat: Number(ride.destination_lat),
              lng: Number(ride.destination_lng)
            }}
            className="h-[50vh] rounded-2xl overflow-hidden"
          />

          {/* Driver Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {driver.avatar_url ? (
                  <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{driver.full_name}</h3>
                {driver.car_model && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Car className="w-4 h-4" />
                    <span>{driver.car_color} {driver.car_model}</span>
                    {driver.license_plate && (
                      <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                        {driver.license_plate}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {driver.phone && (
                  <a href={`tel:${driver.phone}`}>
                    <Button variant="outline" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="icon">
                  <MessageCircle className="w-4 h-4" />
                </Button>
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
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrackRide;
