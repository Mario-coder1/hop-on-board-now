import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Fuel, Gauge, TreePine, Car, Plane } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// kg CO2 per liter of fuel (well-to-wheel approximations)
const FACTORS: Record<string, { kgPerL: number; label: string }> = {
  petrol: { kgPerL: 2.31, label: 'Benzín' },
  diesel: { kgPerL: 2.68, label: 'Diesel' },
  lpg: { kgPerL: 1.51, label: 'LPG' },
};

export default function Co2Calculator() {
  const [fuel, setFuel] = useState<'petrol' | 'diesel' | 'lpg'>('petrol');
  const [consumption, setConsumption] = useState(6.5);
  const [kmYear, setKmYear] = useState(15000);
  const consumptionId = useId();
  const kmYearId = useId();

  const { liters, kg, tons, trees, flights } = useMemo(() => {
    const liters = (consumption * kmYear) / 100;
    const kg = liters * FACTORS[fuel].kgPerL;
    const tons = kg / 1000;
    // 1 mature tree absorbs ~21 kg CO2/year
    const trees = Math.round(kg / 21);
    // BA-LON return flight ~ 230 kg CO2
    const flights = +(kg / 230).toFixed(1);
    return { liters, kg, tons, trees, flights };
  }, [fuel, consumption, kmYear]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="CO₂ kalkulačka jazdy | takeme"
        description="Vypočítaj si ročnú produkciu CO₂ tvojho auta podľa spotreby a nájazdu kilometrov."
      />
      <Navigation />

      <main className="container mx-auto px-4 py-8 pb-32 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold mb-3">
            <Leaf className="w-3.5 h-3.5" />
            Eko kalkulačka
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Koľko <span className="text-gradient-primary">CO₂</span> vyprodukuje tvoje auto?
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Zadaj spotrebu a ročný nájazd. Spočítame ti ročnú produkciu CO₂ a porovnáme ju s prírodou.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-semibold mb-3 block">Typ paliva</Label>
                <Tabs value={fuel} onValueChange={(v) => setFuel(v as any)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="petrol">Benzín</TabsTrigger>
                    <TabsTrigger value="diesel">Diesel</TabsTrigger>
                    <TabsTrigger value="lpg">LPG</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor={consumptionId} className="text-sm font-semibold flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-primary" />
                    Spotreba
                  </Label>
                  <div className="text-sm font-bold tabular-nums">
                    {consumption.toFixed(1)} L/100 km
                  </div>
                </div>
                <Slider
                  aria-label="Spotreba paliva v litroch na 100 kilometrov"
                  value={[consumption]}
                  onValueChange={(v) => setConsumption(v[0])}
                  min={2}
                  max={20}
                  step={0.1}
                />
                <Input
                  id={consumptionId}
                  type="number"
                  value={consumption}
                  onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="mt-3"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    Ročný nájazd
                  </Label>
                  <div className="text-sm font-bold tabular-nums">
                    {kmYear.toLocaleString('sk-SK')} km
                  </div>
                </div>
                <Slider
                  value={[kmYear]}
                  onValueChange={(v) => setKmYear(v[0])}
                  min={1000}
                  max={60000}
                  step={500}
                />
                <Input
                  type="number"
                  value={kmYear}
                  onChange={(e) => setKmYear(parseInt(e.target.value) || 0)}
                  step="500"
                  className="mt-3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          <motion.div
            key={`${fuel}-${kg.toFixed(0)}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-primary/5">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/20 blur-3xl" />
              <CardContent className="p-6 relative">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Ročná produkcia CO₂
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl md:text-6xl font-black tabular-nums text-gradient-primary">
                    {tons.toFixed(2)}
                  </span>
                  <span className="text-2xl font-bold text-muted-foreground">t</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                  {Math.round(kg).toLocaleString('sk-SK')} kg CO₂ · {Math.round(liters).toLocaleString('sk-SK')} L paliva
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-background/70 backdrop-blur p-4 border border-border/60">
                    <TreePine className="w-5 h-5 text-emerald-600 mb-1" />
                    <div className="text-xl font-bold tabular-nums">{trees}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      stromov potrebných na pohltenie
                    </div>
                  </div>
                  <div className="rounded-xl bg-background/70 backdrop-blur p-4 border border-border/60">
                    <Plane className="w-5 h-5 text-blue-500 mb-1" />
                    <div className="text-xl font-bold tabular-nums">{flights}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      letov Bratislava → Londýn
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4 border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Spolujazda = polovica CO₂</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Každý ďalší pasažier v aute zníži jeho podiel na emisiách. Zdieľaj cestu cez takeme a šetri planétu aj peňaženku.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-6 text-center">
          Výpočet je orientačný. Emisné faktory: benzín 2,31 kg/L · diesel 2,68 kg/L · LPG 1,51 kg/L.
        </p>
      </main>
    </div>
  );
}
