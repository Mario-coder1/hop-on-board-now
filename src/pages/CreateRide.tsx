import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Navigation as NavigationIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NavigationBar from '@/components/Navigation';
import Map from '@/components/Map';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CreateRide = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [origin, setOrigin] = useState({ address: '', lat: 0, lng: 0 });
  const [destination, setDestination] = useState({ address: '', lat: 0, lng: 0 });
  const [departureTime, setDepartureTime] = useState('');
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(5);
  const [selectingPoint, setSelectingPoint] = useState<'origin' | 'destination' | null>(null);

  const handleMapClick = (lng: number, lat: number) => {
    if (selectingPoint === 'origin') {
      setOrigin({ address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      setSelectingPoint('destination');
    } else if (selectingPoint === 'destination') {
      setDestination({ address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      setSelectingPoint(null);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('rides').insert({
        driver_id: profile.id,
        origin_address: origin.address,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_address: destination.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        departure_time: new Date(departureTime).toISOString(),
        available_seats: seats,
        price_per_seat: price,
        status: 'active'
      });

      if (error) throw error;

      toast({
        title: 'Jazda vytvorená!',
        description: 'Vaša jazda bola úspešne pridaná.',
      });
      
      navigate('/driver');
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markers = [];
  if (origin.lat && origin.lng) {
    markers.push({ id: 'origin', lat: origin.lat, lng: origin.lng, type: 'origin' as const, popup: 'Štart' });
  }
  if (destination.lat && destination.lng) {
    markers.push({ id: 'dest', lat: destination.lat, lng: destination.lng, type: 'destination' as const, popup: 'Cieľ' });
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>

          <h1 className="font-display text-3xl font-bold mb-8">Vytvor novú jazdu</h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Trasa
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label>Štart</Label>
                    <div className="flex gap-2">
                      <Input
                        value={origin.address}
                        onChange={(e) => setOrigin({ ...origin, address: e.target.value })}
                        placeholder="Zadajte adresu alebo vyberte na mape"
                      />
                      <Button
                        variant={selectingPoint === 'origin' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setSelectingPoint('origin')}
                      >
                        <NavigationIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Cieľ</Label>
                    <div className="flex gap-2">
                      <Input
                        value={destination.address}
                        onChange={(e) => setDestination({ ...destination, address: e.target.value })}
                        placeholder="Zadajte adresu alebo vyberte na mape"
                      />
                      <Button
                        variant={selectingPoint === 'destination' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setSelectingPoint('destination')}
                      >
                        <NavigationIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {selectingPoint && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Kliknite na mapu pre výber {selectingPoint === 'origin' ? 'štartu' : 'cieľa'}
                  </p>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Dátum a čas
                </h2>
                
                <Input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Detaily
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Voľné miesta</Label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Cena za miesto (€)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={!origin.lat || !destination.lat || !departureTime || loading}
              >
                {loading ? 'Vytváranie...' : 'Vytvoriť jazdu'}
              </Button>
            </div>

            {/* Map */}
            <div className="lg:sticky lg:top-24">
              <Map
                markers={markers}
                onMapClick={handleMapClick}
                className="h-[500px]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateRide;