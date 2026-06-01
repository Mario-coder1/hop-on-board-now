import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Calendar, Users, Locate, Loader2, Repeat,
  ChevronDown, ChevronUp, Dog, Cigarette, Briefcase, Music, Wind, Coffee, Fuel
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import NavigationBar from '@/components/Navigation';
import Map from '@/components/Map';
import AddressSearch from '@/components/AddressSearch';
import StopsManager, { Stop } from '@/components/StopsManager';
import RouteAlternativesSelector, { RouteOption } from '@/components/RouteAlternativesSelector';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mapDatabaseError } from '@/lib/errorMapping';
import { useMyMemberships } from '@/hooks/useUniversities';
import { GraduationCap } from 'lucide-react';
import SEO from '@/components/SEO';
const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

const WEEKDAYS = [
  { value: 1, label: 'Po' },
  { value: 2, label: 'Ut' },
  { value: 3, label: 'St' },
  { value: 4, label: 'Št' },
  { value: 5, label: 'Pi' },
  { value: 6, label: 'So' },
  { value: 0, label: 'Ne' },
];

const CreateRide = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [origin, setOrigin] = useState({ address: '', lat: 0, lng: 0 });
  const [destination, setDestination] = useState({ address: '', lat: 0, lng: 0 });
  const [stops, setStops] = useState<Stop[]>([]);
  const [departureTime, setDepartureTime] = useState('');
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(5);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedRouteCoords, setSelectedRouteCoords] = useState<Array<[number, number]> | null>(null);

  // Ride preferences (optional, like BlaBlaCar)
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    pets_allowed: false,
    smoking_allowed: false,
    luggage_allowed: true,
    music_allowed: true,
    ac_allowed: true,
    food_allowed: true,
  });

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringTime, setRecurringTime] = useState('07:00');
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // University community
  const { memberships } = useMyMemberships();
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');

  // Gas station partner
  const [gasStations, setGasStations] = useState<Array<{ id: string; name: string; address: string; lat: number; lng: number; discount_note: string | null }>>([]);
  const [selectedGasStationId, setSelectedGasStationId] = useState<string>('');

  useEffect(() => {
    const fetchStations = async () => {
      const { data } = await supabase.from('gas_stations').select('id, name, address, lat, lng, discount_note').eq('active', true).order('name');
      if (data) setGasStations(data);
    };
    fetchStations();
  }, []);

  const toggleDay = (d: number) => {
    setRecurringDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  // Auto-detect location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Chyba',
        description: 'Geolokácia nie je podporovaná vo vašom prehliadači.',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&language=sk`
          );
          const data = await response.json();
          const address = data.features?.[0]?.place_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setOrigin({ address, lat: latitude, lng: longitude });
        } catch {
          setOrigin({ 
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 
            lat: latitude, 
            lng: longitude 
          });
        }
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa získať vašu polohu. Povoľte prístup k polohe.',
          variant: 'destructive'
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!profile) {
      toast({
        title: 'Chyba',
        description: 'Musíte byť prihlásený.',
        variant: 'destructive'
      });
      return;
    }

    if (!origin.lat || !destination.lat) {
      toast({
        title: 'Chyba',
        description: 'Zadajte štart aj cieľ.',
        variant: 'destructive'
      });
      return;
    }

    if (isRecurring) {
      if (recurringDays.length === 0) {
        toast({ title: 'Chyba', description: 'Vyber aspoň jeden deň.', variant: 'destructive' });
        return;
      }
    } else if (!departureTime) {
      toast({ title: 'Chyba', description: 'Zadajte čas odchodu.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (isRecurring) {
        const { error: tplError } = await supabase
          .from('ride_templates')
          .insert({
            driver_id: profile.id,
            origin_address: origin.address,
            origin_lat: origin.lat,
            origin_lng: origin.lng,
            destination_address: destination.address,
            destination_lat: destination.lat,
            destination_lng: destination.lng,
            departure_time: recurringTime + ':00',
            weekdays: recurringDays,
            available_seats: seats,
            price_per_seat: price,
            active: true,
            ...preferences,
          });
        if (tplError) throw tplError;

        toast({
          title: 'Pravidelná jazda nastavená! 🔁',
          description: 'Jazdy sa budú generovať automaticky každý týždeň.',
        });
        navigate('/driver');
        return;
      }

      // Insert single ride
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .insert({
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
          status: 'active',
          route_polyline: routePolyline,
          university_id: selectedUniversityId || null,
          gas_station_id: selectedGasStationId || null,
          ...preferences,
        })
        .select('id')
        .single();

      if (rideError) throw rideError;

      // Insert stops if any
      const validStops = stops.filter(stop => stop.lat !== 0 && stop.lng !== 0);
      if (validStops.length > 0 && rideData) {
        const stopsToInsert = validStops.map((stop, index) => ({
          ride_id: rideData.id,
          stop_order: index + 1,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng
        }));

        const { error: stopsError } = await supabase
          .from('ride_stops')
          .insert(stopsToInsert);

        if (stopsError) {
          console.error('Error inserting stops:', stopsError);
        }
      }

      toast({
        title: 'Jazda vytvorená!',
        description: 'Vaša jazda bola úspešne pridaná.',
      });
      
      navigate('/driver');
    } catch (error: unknown) {
      toast({
        title: 'Chyba',
        description: mapDatabaseError(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRouteCalculated = useCallback((polyline: string) => {
    setRoutePolyline(polyline);
  }, []);

  const handleRouteSelect = useCallback((route: RouteOption) => {
    setSelectedRouteIndex(route.index);
    setSelectedRouteCoords(route.coordinates);
    setRoutePolyline(JSON.stringify(route.coordinates));
  }, []);

  const markers = [];
  if (origin.lat && origin.lng) {
    markers.push({ id: 'origin', lat: origin.lat, lng: origin.lng, type: 'origin' as const, popup: 'Štart' });
  }
  
  // Add stop markers
  stops.forEach((stop, index) => {
    if (stop.lat && stop.lng) {
      markers.push({
        id: `stop-${stop.id}`,
        lat: stop.lat,
        lng: stop.lng,
        type: 'stop' as const,
        popup: `Zastávka ${index + 1}: ${stop.address}`
      });
    }
  });
  
  if (destination.lat && destination.lng) {
    markers.push({ id: 'dest', lat: destination.lat, lng: destination.lng, type: 'destination' as const, popup: 'Cieľ' });
  }

  // Add selected gas station marker
  const selectedStation = gasStations.find(s => s.id === selectedGasStationId);
  if (selectedStation && selectedStation.lat && selectedStation.lng) {
    markers.push({
      id: 'gas-station',
      lat: selectedStation.lat,
      lng: selectedStation.lng,
      type: 'gas_station' as const,
      popup: `⛽ ${selectedStation.name} ${selectedStation.discount_note ? '— ' + selectedStation.discount_note : ''}`
    });
  }

  // Waypoints for route calculation (only stops with valid coordinates)
  const waypoints = stops
    .filter(stop => stop.lat !== 0 && stop.lng !== 0)
    .map(stop => ({ lat: stop.lat, lng: stop.lng }));

  const mapCenter: [number, number] = origin.lat && origin.lng 
    ? [origin.lng, origin.lat] 
    : [19.699, 48.669];

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Vytvoriť jazdu" description="Ponúkni miesto v aute, zadaj trasu, čas, cenu a počet voľných miest." path="/create-ride" noindex />
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
                    <Label>Štart (vaša poloha)</Label>
                    <div className="flex gap-2">
                      <AddressSearch
                        value={origin.address}
                        onSelect={(address, lat, lng) => setOrigin({ address, lat, lng })}
                        placeholder="Vaša aktuálna poloha"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                      >
                        {gettingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Locate className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {origin.lat > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ✓ Poloha nastavená
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Cieľ</Label>
                    <AddressSearch
                      value={destination.address}
                      onSelect={(address, lat, lng) => setDestination({ address, lat, lng })}
                      placeholder="Kam idete? Zadajte adresu..."
                    />
                    {destination.lat > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ✓ Cieľ nastavený
                      </p>
                    )}
                  </div>

                  {/* Stops section */}
                  <div className="pt-4 border-t border-border">
                    <StopsManager
                      stops={stops}
                      onStopsChange={setStops}
                      maxStops={5}
                    />
                  </div>
                </div>
              </div>

              {/* Typ jazdy - oddelená sekcia */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-lg font-semibold mb-3">Typ jazdy</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(false)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !isRecurring
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Calendar className="w-4 h-4" />
                      Jednorazová
                    </div>
                    <p className="text-[11px] mt-1 opacity-80">Jeden konkrétny dátum a čas</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(true)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isRecurring
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Repeat className="w-4 h-4" />
                      Pravidelná
                    </div>
                    <p className="text-[11px] mt-1 opacity-80">Opakuje sa každý týždeň</p>
                  </button>
                </div>
              </div>

              {/* Dátum/čas - samostatná sekcia podľa typu */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {isRecurring ? 'Dni a čas odchodu' : 'Dátum a čas odchodu'}
                </h2>

                {isRecurring ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Dni v týždni</Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {WEEKDAYS.map((d) => {
                          const active = recurringDays.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => toggleDay(d.value)}
                              className={`min-w-[44px] h-9 px-3 rounded-full text-xs font-semibold border transition-all ${
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Čas odchodu</Label>
                      <Input
                        type="time"
                        value={recurringTime}
                        onChange={(e) => setRecurringTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      💡 Jazdy sa generujú automaticky každý deň o 03:00 na nasledujúcich 7 dní.
                    </p>
                  </div>
                ) : (
                  <Input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                )}
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
                      value={seats || ''}
                      onChange={(e) => setSeats(e.target.value ? parseInt(e.target.value) : 0)}
                    />
                  </div>
                  <div>
                    <Label>Cena za miesto (€)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={price || ''}
                      onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : 0)}
                    />
                  </div>
                </div>

                {memberships.length > 0 && (
                  <div className="mt-4">
                    <Label>Univerzitná komunita (voliteľné)</Label>
                    <select
                      className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedUniversityId}
                      onChange={(e) => setSelectedUniversityId(e.target.value)}
                    >
                      <option value="">Verejná jazda (pre každého)</option>
                      {memberships.map((m) => (
                        <option key={m.university_id} value={m.university_id}>
                          Iba pre {m.university?.short_name || 'univerzitu'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ak vyberieš univerzitu, jazdu uvidia iba overení členovia.
                    </p>
                  </div>
                )}

                {/* Gas Station Partner */}
                {gasStations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Fuel className="w-4 h-4 text-primary" />
                      <Label className="text-sm">Partnerská čerpacia stanica</Label>
                    </div>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedGasStationId}
                      onChange={(e) => setSelectedGasStationId(e.target.value)}
                    >
                      <option value="">Žiadna stanica</option>
                      {gasStations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.discount_note ? `— ${s.discount_note}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Vodiči sa môžu zastaviť na partnerskej stanici. Výhodné pre šetrenie nákladov.
                    </p>
                  </div>
                )}
              </div>

              {/* Ride Preferences — optional, collapsible like BlaBlaCar */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <button
                  type="button"
                  onClick={() => setPreferencesOpen((p) => !p)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h2 className="font-display text-lg font-semibold">Preferencie jazdy</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Voliteľné — upresni podmienky v aute</p>
                  </div>
                  {preferencesOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {preferencesOpen && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    {[
                      { key: 'pets_allowed' as const, label: 'Zvieratá povolené', icon: Dog, desc: 'Pes alebo mačka v prepravke' },
                      { key: 'smoking_allowed' as const, label: 'Fajčenie povolené', icon: Cigarette, desc: 'Cigarety počas jazdy' },
                      { key: 'luggage_allowed' as const, label: 'Veľká batožina', icon: Briefcase, desc: 'Kufor alebo batoh do kufra' },
                      { key: 'music_allowed' as const, label: 'Hudba v aute', icon: Music, desc: 'Rádio alebo vlastný playlist' },
                      { key: 'ac_allowed' as const, label: 'Klimatizácia', icon: Wind, desc: 'Chladenie/vykurovanie zapnuté' },
                      { key: 'food_allowed' as const, label: 'Občerstvenie', icon: Coffee, desc: 'Jedlo a nápoje v aute' },
                    ].map((pref) => (
                      <div key={pref.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <pref.icon className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{pref.label}</p>
                            <p className="text-[11px] text-muted-foreground">{pref.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences[pref.key]}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({ ...prev, [pref.key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Route alternatives selector */}
              {origin.lat !== 0 && destination.lat !== 0 && (
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <RouteAlternativesSelector
                    origin={origin.lat ? { lat: origin.lat, lng: origin.lng } : null}
                    destination={destination.lat ? { lat: destination.lat, lng: destination.lng } : null}
                    waypoints={waypoints}
                    selectedIndex={selectedRouteIndex}
                    onSelect={handleRouteSelect}
                  />
                </div>
              )}

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={!origin.lat || !destination.lat || (isRecurring ? recurringDays.length === 0 : !departureTime) || loading}
              >
                {loading ? 'Vytváranie...' : isRecurring ? 'Nastaviť pravidelnú jazdu' : 'Vytvoriť jazdu'}
              </Button>
            </div>

            {/* Map */}
            <div className="lg:sticky lg:top-24">
              <Map
                markers={markers}
                waypoints={waypoints}
                center={mapCenter}
                zoom={origin.lat ? 12 : 7}
                showRoute={!selectedRouteCoords && origin.lat !== 0 && destination.lat !== 0}
                route={selectedRouteCoords || undefined}
                onRouteCalculated={handleRouteCalculated}
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