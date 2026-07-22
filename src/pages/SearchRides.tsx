import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, Users, ArrowRight, Filter, Radio, X, Clock, Euro, Star, ArrowUpDown, Locate, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Navigation from '@/components/Navigation';
import Map from '@/components/Map';
import SEO from '@/components/SEO';
import RouteAlerts from '@/components/RouteAlerts';
import { supabase } from '@/integrations/supabase/client';
import { sk } from 'date-fns/locale';
import { formatDbDate, parseDbTimestamp } from '@/lib/datetime';
import { useGasStations } from '@/hooks/useGasStations';
import { useRidesRealtime } from '@/hooks/useRidesRealtime';
import { useToast } from '@/hooks/use-toast';
import {
  parseRoutePolyline,
  isPointNearRoute,
  hasDriverPassedPoint,
  type LngLat,
} from '@/lib/routeProximity';

interface RideStop {
  id: string;
  address: string;
  stop_order: number;
}

interface Ride {
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
  route_polyline: string | null;
  max_detour_km: number | null;
  driver: {
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    total_rides: number | null;
  } | null;
  ride_stops: RideStop[];
}

const SearchRides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [minRating, setMinRating] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'time-asc' | 'price-asc' | 'price-desc' | 'rating-desc'>('time-asc');

  // Proximity filter: only show rides whose route passes near my location
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [nearMeRadiusKm, setNearMeRadiusKm] = useState('10');
  const [myLocation, setMyLocation] = useState<LngLat | null>(null);
  const [locatingMe, setLocatingMe] = useState(false);
  const [autoFillingOrigin, setAutoFillingOrigin] = useState(false);

  // Detect current GPS position and reverse-geocode it into the "Odkiaľ" input
  const autofillOriginFromLocation = () => {
    if (!('geolocation' in navigator)) {
      toast({ title: 'Poloha nedostupná', description: 'Tvoj prehliadač nepodporuje geolokáciu.', variant: 'destructive' });
      return;
    }
    setAutoFillingOrigin(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        setMyLocation([longitude, latitude]);
        try {
          const token = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?language=sk&limit=1&access_token=${token}`
          );
          const data = await res.json();
          const place = data?.features?.[0];
          const label = place?.place_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          // Prefer the city/locality token so it also matches ride origin_address fields
          const cityCtx = place?.context?.find((c: any) => /place|locality|region/.test(c.id));
          setSearchOrigin(cityCtx?.text || place?.text || label);
          toast({ title: 'Odkiaľ vyplnené', description: label });
        } catch (e) {
          setSearchOrigin(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast({ title: 'Poloha zistená', description: 'Použil som súradnice, adresa sa nenačítala.' });
        } finally {
          setAutoFillingOrigin(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setAutoFillingOrigin(false);
        toast({ title: 'Nepodarilo sa zistiť polohu', description: 'Skontroluj povolenie polohy v prehliadači.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const [liveLocations, setLiveLocations] = useState<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    fetchRides();
  }, []);

  // Realtime: keep available_seats fresh whenever any ride row changes
  useRidesRealtime(() => { fetchRides(); }, 'search-rides');

  const fetchRides = async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:public_profiles!rides_driver_id_fkey(full_name, avatar_url, rating, total_rides),
        ride_stops(id, address, stop_order)
      `)
      .in('status', ['active', 'in_progress'])
      .order('departure_time', { ascending: true });

    if (error) {
      console.error('[SearchRides] fetchRides error:', error);
      setRides([]);
      setLoading(false);
      return;
    }

    setRides((data as unknown as Ride[]) ?? []);
    setLoading(false);
  };

  // Live driver tracking for in_progress rides
  const liveDriverIds = useMemo(
    () => rides
      .filter(r => r.status === 'active' || r.status === 'in_progress')
      .map(r => r.driver_id),
    [rides]
  );

  useEffect(() => {
    if (liveDriverIds.length === 0) {
      setLiveLocations({});
      return;
    }

    let cancelled = false;
    const loadLocations = async () => {
      const { data } = await supabase
        .from('user_locations')
        .select('profile_id, lat, lng')
        .in('profile_id', liveDriverIds);
      if (cancelled || !data) return;
      const map: Record<string, { lat: number; lng: number }> = {};
      data.forEach((row: any) => {
        map[row.profile_id] = { lat: Number(row.lat), lng: Number(row.lng) };
      });
      setLiveLocations(map);
    };
    loadLocations();

    const channel = supabase
      .channel('search-rides-live-drivers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (!liveDriverIds.includes(row.profile_id)) return;
          setLiveLocations(prev => ({
            ...prev,
            [row.profile_id]: { lat: Number(row.lat), lng: Number(row.lng) },
          }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [liveDriverIds.join(',')]);

  // Combine date+time inputs into Date or null
  const fromDate = useMemo(() => {
    if (!dateFrom) return null;
    const d = new Date(`${dateFrom}T${timeFrom || '00:00'}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateFrom, timeFrom]);

  const toDate = useMemo(() => {
    if (!dateTo) return null;
    const d = new Date(`${dateTo}T${timeTo || '23:59'}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateTo, timeTo]);

  const requestMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: 'Poloha nedostupná',
        description: 'Tvoj prehliadač nepodporuje geolokáciu.',
        variant: 'destructive',
      });
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation([pos.coords.longitude, pos.coords.latitude]);
        setNearMeEnabled(true);
        setLocatingMe(false);
        toast({
          title: 'Poloha zistená',
          description: 'Filter „na mojej trase" je aktívny.',
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocatingMe(false);
        toast({
          title: 'Nepodarilo sa zistiť polohu',
          description: 'Skontroluj povolenie polohy v prehliadači.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const filteredRides = useMemo(() => {
    const maxP = maxPrice ? Number(maxPrice) : null;
    const minS = minSeats ? Number(minSeats) : null;
    const minR = minRating ? Number(minRating) : null;
    const radiusM = Math.max(0.5, Number(nearMeRadiusKm) || 10) * 1000;

    const list = rides
      .filter(ride => {
        const origin = searchOrigin.trim().toLowerCase();
        const dest = searchDestination.trim().toLowerCase();
        const stopsLower = (ride.ride_stops ?? []).map(s => s.address.toLowerCase());

        const matchOrigin = !origin
          || ride.origin_address.toLowerCase().includes(origin)
          || stopsLower.some(a => a.includes(origin));

        const matchDestination = !dest
          || ride.destination_address.toLowerCase().includes(dest)
          || stopsLower.some(a => a.includes(dest));

        const departure = parseDbTimestamp(ride.departure_time);
        const matchFrom = !fromDate || (departure && departure >= fromDate);
        const matchTo = !toDate || (departure && departure <= toDate);

        const matchPrice = maxP === null || Number(ride.price_per_seat) <= maxP;
        const matchSeats = minS === null || ride.available_seats >= minS;
        const matchRating = minR === null || (ride.driver?.rating ?? 0) >= minR;
        const matchLive = !liveOnly || ride.status === 'in_progress';

        return matchOrigin && matchDestination && matchFrom && matchTo
          && matchPrice && matchSeats && matchRating && matchLive;
      })
      .map(ride => {
        // Compute proximity metadata — does NOT filter, only annotates the card.
        let nearMe: boolean | null = null;
        let driverPassed = false;
        // Effective radius = max(passenger's chosen radius, driver's willing detour).
        const detourM = Math.max(0, Number(ride.max_detour_km) || 0) * 1000;
        const effectiveRadiusM = Math.max(radiusM, detourM);
        if (nearMeEnabled && myLocation) {
          const route = parseRoutePolyline(ride.route_polyline);
          const fallbackOrigin: LngLat = [Number(ride.origin_lng), Number(ride.origin_lat)];
          const fallbackDest: LngLat = [Number(ride.destination_lng), Number(ride.destination_lat)];
          nearMe = isPointNearRoute(myLocation, route, fallbackOrigin, fallbackDest, effectiveRadiusM);

          if (ride.status === 'in_progress') {
            const driverLoc = liveLocations[ride.driver_id];
            if (driverLoc) {
              const driver: LngLat = [driverLoc.lng, driverLoc.lat];
              driverPassed = hasDriverPassedPoint(myLocation, driver, route);
            }
          }
        }
        return { ...ride, _nearMe: nearMe, _driverPassed: driverPassed };
      });

    const sorted = [...list].sort((a, b) => {
      // When proximity is enabled, surface on-route & not-passed rides first.
      if (nearMeEnabled && myLocation) {
        const aScore = (a._nearMe === false ? 1 : 0) + (a._driverPassed ? 2 : 0);
        const bScore = (b._nearMe === false ? 1 : 0) + (b._driverPassed ? 2 : 0);
        if (aScore !== bScore) return aScore - bScore;
      }
      switch (sortBy) {
        case 'price-asc':
          return Number(a.price_per_seat) - Number(b.price_per_seat);
        case 'price-desc':
          return Number(b.price_per_seat) - Number(a.price_per_seat);
        case 'rating-desc':
          return (b.driver?.rating ?? 0) - (a.driver?.rating ?? 0);
        case 'time-asc':
        default: {
          const ta = parseDbTimestamp(a.departure_time)?.getTime() ?? 0;
          const tb = parseDbTimestamp(b.departure_time)?.getTime() ?? 0;
          return ta - tb;
        }
      }
    });
    return sorted;
  }, [rides, searchOrigin, searchDestination, fromDate, toDate, maxPrice, minSeats, minRating, liveOnly, sortBy, nearMeEnabled, myLocation, nearMeRadiusKm, liveLocations]);

  const activeFilterCount =
    (searchOrigin ? 1 : 0) +
    (searchDestination ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (minSeats ? 1 : 0) +
    (minRating ? 1 : 0) +
    (liveOnly ? 1 : 0) +
    (nearMeEnabled && myLocation ? 1 : 0);

  const clearFilters = () => {
    setSearchOrigin('');
    setSearchDestination('');
    setDateFrom('');
    setTimeFrom('');
    setDateTo('');
    setTimeTo('');
    setMaxPrice('');
    setMinSeats('');
    setMinRating('');
    setLiveOnly(false);
    setSortBy('time-asc');
    setNearMeEnabled(false);
  };

  // Only show real live driver positions. Never fall back to origin/destination points.
  const gasStations = useGasStations();
  const markers = useMemo(() => {
    const live = filteredRides.flatMap(ride => {
      const l = liveLocations[ride.driver_id];
      if (!l) return [];
      return [{
        id: ride.id,
        lat: l.lat,
        lng: l.lng,
        type: 'live-driver' as const,
        avatarUrl: ride.driver?.avatar_url ?? null,
        label: ride.driver?.full_name ?? 'Vodič',
      }];
    });
    return [...live, ...gasStations];
  }, [filteredRides, liveLocations, gasStations]);

  const [selectedMapRideId, setSelectedMapRideId] = useState<string | null>(null);
  const selectedMapRide = useMemo(
    () => filteredRides.find(r => r.id === selectedMapRideId) || null,
    [filteredRides, selectedMapRideId]
  );

  const handleMarkerClick = (id: string) => {
    setSelectedMapRideId(prev => (prev === id ? null : id));
  };

  const resultLabel = (n: number) => {
    if (n === 1) return 'jazda';
    if (n >= 2 && n <= 4) return 'jazdy';
    return 'jázd';
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 overflow-x-hidden">
      <SEO
        title="Vyhľadať jazdu"
        description="Prehľadaj dostupné spolujazdy po celom Slovensku. Filtruj podľa trasy, ceny a času. Bratislava, Košice, Žilina, Trnava, Banská Bystrica."
        path="/search"
      />
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-5 sm:mb-8">Hľadať jazdy</h1>

          {/* Search Bar */}
          <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border mb-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Odkiaľ (vrátane zastávok)"
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  className="pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={autofillOriginFromLocation}
                  disabled={autoFillingOrigin}
                  aria-label="Použi moju polohu"
                  title="Použi moju polohu"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {autoFillingOrigin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Kam (vrátane zastávok)"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="hero" className="w-full" onClick={() => setShowFilters(false)}>
                <Search className="w-4 h-4 mr-2" />
                Hľadať
              </Button>
            </div>

            {/* Advanced filters (time window) */}
            <AnimatePresence initial={false}>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-border grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Odchod od
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <Input
                          type="time"
                          value={timeFrom}
                          onChange={(e) => setTimeFrom(e.target.value)}
                          disabled={!dateFrom}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Odchod do
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                        <Input
                          type="time"
                          value={timeTo}
                          onChange={(e) => setTimeTo(e.target.value)}
                          disabled={!dateTo}
                        />
                      </div>
                    </div>

                    {/* Cena, miesta, rating */}
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Euro className="w-3.5 h-3.5" />
                        Max. cena za miesto (€)
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="napr. 10"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Min. voľných miest
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        placeholder="napr. 2"
                        value={minSeats}
                        onChange={(e) => setMinSeats(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" />
                        Min. hodnotenie vodiča
                      </Label>
                      <Select value={minRating || 'any'} onValueChange={(v) => setMinRating(v === 'any' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Akékoľvek" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Akékoľvek</SelectItem>
                          <SelectItem value="3">3+ ★</SelectItem>
                          <SelectItem value="4">4+ ★</SelectItem>
                          <SelectItem value="4.5">4.5+ ★</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        Zoradiť podľa
                      </Label>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time-asc">Najbližší odchod</SelectItem>
                          <SelectItem value="price-asc">Najlacnejšie</SelectItem>
                          <SelectItem value="price-desc">Najdrahšie</SelectItem>
                          <SelectItem value="rating-desc">Najlepšie hodnotenie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setLiveOnly(!liveOnly)}
                        className={`flex items-center gap-2 px-3 h-9 rounded-full border text-xs font-medium transition-all ${
                          liveOnly
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Radio className={`w-3.5 h-3.5 ${liveOnly ? 'animate-pulse' : ''}`} />
                        Iba prebiehajúce (LIVE)
                      </button>
                    </div>

                    {/* Proximity annotator — labels each ride based on my location */}
                    <div className="sm:col-span-2 p-3 rounded-xl border border-border bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Locate className="w-3.5 h-3.5" />
                            Označiť jazdy podľa mojej polohy
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Všetky jazdy zostanú viditeľné. Tie, ktoré nevedú cez tvoju polohu alebo ťa už vodič prešiel, dostanú upozornenie.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={nearMeEnabled && myLocation ? 'default' : 'outline'}
                          onClick={() => {
                            if (myLocation) {
                              setNearMeEnabled(!nearMeEnabled);
                            } else {
                              requestMyLocation();
                            }
                          }}
                          disabled={locatingMe}
                          className="h-8 text-xs"
                        >
                          {locatingMe ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Locate className="w-3.5 h-3.5 mr-1" />
                          )}
                          {myLocation
                            ? nearMeEnabled
                              ? 'Zapnuté'
                              : 'Vypnuté'
                            : 'Zistiť polohu'}
                        </Button>
                      </div>

                      {nearMeEnabled && myLocation && (
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] text-muted-foreground">Max. vzdialenosť od trasy:</Label>
                          <Select value={nearMeRadiusKm} onValueChange={setNearMeRadiusKm}>
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 km</SelectItem>
                              <SelectItem value="5">5 km</SelectItem>
                              <SelectItem value="10">10 km</SelectItem>
                              <SelectItem value="20">20 km</SelectItem>
                              <SelectItem value="50">50 km</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Route alerts */}
          <div className="mb-4">
            <RouteAlerts
              prefilledOrigin={searchOrigin}
              prefilledDestination={searchDestination}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Results */}
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">
                    <span className="text-primary font-bold">{filteredRides.length}</span>{' '}
                    <span className="text-muted-foreground">{resultLabel(filteredRides.length)}</span>
                  </p>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filtre'}
                    </Badge>
                  )}
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={clearFilters}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Vymazať
                    </Button>
                  )}
                </div>
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtre
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-5 rounded-2xl bg-card border border-border animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredRides.length === 0 ? (
                <div className="p-10 sm:p-12 rounded-2xl bg-card border border-border text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Žiadne jazdy</h3>
                  <p className="text-muted-foreground">Skúste zmeniť vyhľadávacie kritériá</p>
                </div>
              ) : (
                filteredRides.map((ride, index) => {
                  const time = formatDbDate(ride.departure_time, 'HH:mm', { locale: sk });
                  const date = formatDbDate(ride.departure_time, 'd. MMM', { locale: sk });
                  const stops = (ride.ride_stops ?? []).slice().sort((a, b) => a.stop_order - b.stop_order).slice(0, 3);
                  const isLive = ride.status === 'in_progress';
                  // Rotating soft color tints for visual variety
                  const tints = [
                    { bg: 'from-blue-500/10 via-indigo-500/5 to-cyan-400/10', border: 'border-blue-400/30', orb1: 'bg-blue-400/20', orb2: 'bg-cyan-400/15' },
                    { bg: 'from-violet-500/10 via-fuchsia-500/5 to-purple-400/10', border: 'border-violet-400/30', orb1: 'bg-violet-400/20', orb2: 'bg-fuchsia-400/15' },
                    { bg: 'from-emerald-500/10 via-teal-500/5 to-green-400/10', border: 'border-emerald-400/30', orb1: 'bg-emerald-400/20', orb2: 'bg-teal-400/15' },
                    { bg: 'from-amber-500/10 via-orange-500/5 to-yellow-400/10', border: 'border-amber-400/30', orb1: 'bg-amber-400/20', orb2: 'bg-orange-400/15' },
                    { bg: 'from-rose-500/10 via-pink-500/5 to-red-400/10', border: 'border-rose-400/30', orb1: 'bg-rose-400/20', orb2: 'bg-pink-400/15' },
                    { bg: 'from-sky-500/10 via-blue-500/5 to-indigo-400/10', border: 'border-sky-400/30', orb1: 'bg-sky-400/20', orb2: 'bg-indigo-400/15' },
                  ];
                  const tint = tints[index % tints.length];
                  return (
                    <motion.div
                      key={ride.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => setSelectedRide(ride)}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="cursor-pointer group"
                    >
                      <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${tint.bg} ${tint.border} backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.14)] hover:shadow-[0_24px_56px_-16px_rgba(0,0,0,0.22)] transition-all duration-300 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-white/[0.06] dark:border-white/15 ${selectedRide?.id === ride.id ? 'ring-1 ring-primary shadow-[0_24px_56px_-16px_rgba(0,0,0,0.22)]' : ''}`}>
                        {/* Colorful decorative orbs */}
                        <div className={`pointer-events-none absolute -top-20 -right-14 w-48 h-48 rounded-full ${tint.orb1} blur-3xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                        <div className={`pointer-events-none absolute -bottom-24 -left-12 w-52 h-52 rounded-full ${tint.orb2} blur-3xl opacity-60 group-hover:opacity-90 transition-opacity`} />
                        {isLive && (
                          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-emerald-400/40" />
                        )}

                        <div className="relative p-4 sm:p-5">
                          {/* Header: date + LIVE badge + price */}
                          <div className="flex items-center justify-between mb-3 gap-2">
                            <div className="flex items-center gap-2 text-xs min-w-0">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm shadow-sm">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="tabular-nums text-foreground/80">{date}</span>
                              </span>
                              {isLive && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase bg-emerald-500 text-white px-2.5 py-1.5 rounded-full backdrop-blur-sm shadow-[0_0_16px_rgba(16,185,129,0.5)]">
                                  <span className="relative flex w-2 h-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-80 animate-ping" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                  </span>
                                  Live
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline gap-0.5 shrink-0">
                              <span className="display-mono text-2xl sm:text-3xl font-extrabold text-foreground leading-none tracking-tight">
                                {ride.price_per_seat}
                              </span>
                              <span className="text-sm text-muted-foreground font-semibold">€</span>
                            </div>
                          </div>

                          {/* Proximity warnings — shown only when "near me" annotator is enabled */}
                          {nearMeEnabled && myLocation && (ride._driverPassed || ride._nearMe === false) && (
                            <div className="mb-3 space-y-1.5">
                              {ride._nearMe === false && (
                                <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px]">
                                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>Táto jazda nevedie cez tvoju polohu (mimo zvoleného okruhu).</span>
                                </div>
                              )}
                              {ride._driverPassed && (
                                <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px]">
                                  <Radio className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>Vodič ťa už pravdepodobne prešiel — vracať sa nebude.</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Driver detour willingness badge */}
                          {Number(ride.max_detour_km) > 0 && (
                            <div className="mb-3">
                              <Badge variant="secondary" className="h-5 px-2 text-[10px] gap-1 bg-white/60 dark:bg-white/10 border-white/50 dark:border-white/15 backdrop-blur-sm">
                                <Locate className="w-2.5 h-2.5" />
                                Vodič zájde až {ride.max_detour_km} km mimo trasu
                              </Badge>
                            </div>
                          )}

                          {/* Route text only — no map-like points in the card */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex flex-col items-center pt-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-foreground to-foreground/70 ring-4 ring-foreground/10" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Odkiaľ</p>
                                <p className="truncate font-bold text-sm">{ride.origin_address}</p>
                              </div>
                            </div>
                            {stops.length > 0 && (
                              <div className="pl-5 space-y-1">
                                {stops.map((stop) => (
                                  <p key={stop.id} className="truncate text-xs text-muted-foreground flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                    Zastávka · {stop.address}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex flex-col items-center pt-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-background border-[2.5px] border-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Kam</p>
                                <p className="truncate font-bold text-sm">{ride.destination_address}</p>
                              </div>
                            </div>
                          </div>

                          {/* Footer: driver + seats + detail */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-foreground/10 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-white to-white/80 border-2 border-white/80 flex items-center justify-center text-foreground font-bold text-sm shrink-0 overflow-hidden shadow-md dark:from-white/10 dark:to-white/5 dark:border-white/20">
                                {ride.driver?.avatar_url ? (
                                  <img
                                    src={ride.driver.avatar_url}
                                    alt={`${ride.driver?.full_name ?? 'Vodič'} profilová fotka vodiča`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium">{(ride.driver?.full_name?.[0] ?? '?').toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-xs truncate">{ride.driver?.full_name ?? 'Vodič'}</p>
                                  {ride.driver?.total_rides ? (
                                    <span className="text-[10px] text-muted-foreground">{ride.driver.total_rides} jázd</span>
                                  ) : null}
                                </div>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span className="tabular-nums font-bold text-foreground/80">{ride.driver?.rating?.toFixed(1) ?? '5.0'}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-white/60 dark:bg-white/10 border border-white/50 dark:border-white/15 rounded-full px-2.5 py-1.5 backdrop-blur-sm">
                                <Users className="w-3 h-3" />
                                {ride.available_seats}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 rounded-full hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/ride/${ride.id}`);
                                }}
                              >
                                Detail
                                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Map - hidden on mobile, shown on lg */}
            <div className="hidden lg:block lg:sticky lg:top-24">
              <div className="relative">
                <Map markers={markers} onMarkerClick={handleMarkerClick} className="h-[600px]" />

                <AnimatePresence>
                  {selectedMapRide && (
                    <motion.div
                      key={selectedMapRide.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-3 right-3 bottom-3 z-10 rounded-2xl bg-card border border-border shadow-2xl p-4"
                    >
                      <button
                        onClick={() => setSelectedMapRideId(null)}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground"
                        aria-label="Zavrieť"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-3 mb-3 pr-6">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center font-semibold text-primary shrink-0">
                          {selectedMapRide.driver?.avatar_url ? (
                            <img
                              src={selectedMapRide.driver.avatar_url}
                              alt={selectedMapRide.driver.full_name ?? 'Vodič'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (selectedMapRide.driver?.full_name ?? 'V').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">
                            {selectedMapRide.driver?.full_name ?? 'Vodič'}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {(selectedMapRide.driver?.rating ?? 5).toFixed(1)}
                            </span>
                            <span>·</span>
                            <span>{selectedMapRide.driver?.total_rides ?? 0} jázd</span>
                            {selectedMapRide.status === 'in_progress' && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                                  <Radio className="w-3 h-3 animate-pulse" />
                                  LIVE
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="truncate">{selectedMapRide.origin_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="truncate">{selectedMapRide.destination_address}</span>
                        </div>
                        <div className="flex items-center gap-4 pt-1 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDbDate(selectedMapRide.departure_time, 'd. MMM HH:mm', { locale: sk })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {selectedMapRide.available_seats}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Euro className="w-3.5 h-3.5" />
                            {Number(selectedMapRide.price_per_seat).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => navigate(`/ride/${selectedMapRide.id}`)}
                      >
                        Pripojiť sa do jazdy
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Klikni na vodiča na mape — zobrazí sa detail a možnosť pripojiť sa
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SearchRides;
