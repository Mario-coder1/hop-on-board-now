// 25 najväčších slovenských miest pre SEO podstránky.
// Súradnice (lat/lng) sú približné centrá miest.
export interface City {
  slug: string;       // URL-friendly slug (bez diakritiky)
  name: string;       // Slovenský názov s diakritikou
  nameLocative: string; // 6. pád: "v Bratislave"
  region: string;     // Kraj
  population: number; // Počet obyvateľov (zaokrúhlene)
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { slug: 'bratislava',     name: 'Bratislava',       nameLocative: 'v Bratislave',     region: 'Bratislavský kraj',     population: 475000, lat: 48.1486, lng: 17.1077 },
  { slug: 'kosice',         name: 'Košice',           nameLocative: 'v Košiciach',      region: 'Košický kraj',          population: 228000, lat: 48.7164, lng: 21.2611 },
  { slug: 'presov',         name: 'Prešov',           nameLocative: 'v Prešove',        region: 'Prešovský kraj',        population: 84000,  lat: 48.9966, lng: 21.2393 },
  { slug: 'zilina',         name: 'Žilina',           nameLocative: 'v Žiline',         region: 'Žilinský kraj',         population: 81000,  lat: 49.2237, lng: 18.7395 },
  { slug: 'banska-bystrica',name: 'Banská Bystrica',  nameLocative: 'v Banskej Bystrici', region: 'Banskobystrický kraj', population: 76000, lat: 48.7395, lng: 19.1535 },
  { slug: 'nitra',          name: 'Nitra',            nameLocative: 'v Nitre',          region: 'Nitriansky kraj',       population: 76000,  lat: 48.3069, lng: 18.0843 },
  { slug: 'trnava',         name: 'Trnava',           nameLocative: 'v Trnave',         region: 'Trnavský kraj',         population: 63000,  lat: 48.3774, lng: 17.5887 },
  { slug: 'trencin',        name: 'Trenčín',          nameLocative: 'v Trenčíne',       region: 'Trenčiansky kraj',      population: 54000,  lat: 48.8945, lng: 18.0444 },
  { slug: 'martin',         name: 'Martin',           nameLocative: 'v Martine',        region: 'Žilinský kraj',         population: 52000,  lat: 49.0664, lng: 18.9217 },
  { slug: 'poprad',         name: 'Poprad',           nameLocative: 'v Poprade',        region: 'Prešovský kraj',        population: 49000,  lat: 49.0593, lng: 20.2989 },
  { slug: 'prievidza',      name: 'Prievidza',        nameLocative: 'v Prievidzi',      region: 'Trenčiansky kraj',      population: 44000,  lat: 48.7711, lng: 18.6233 },
  { slug: 'zvolen',         name: 'Zvolen',           nameLocative: 'vo Zvolene',       region: 'Banskobystrický kraj',  population: 42000,  lat: 48.5760, lng: 19.1316 },
  { slug: 'povazska-bystrica', name: 'Považská Bystrica', nameLocative: 'v Považskej Bystrici', region: 'Trenčiansky kraj', population: 38000, lat: 49.1217, lng: 18.4467 },
  { slug: 'michalovce',     name: 'Michalovce',       nameLocative: 'v Michalovciach',  region: 'Košický kraj',          population: 38000,  lat: 48.7553, lng: 21.9170 },
  { slug: 'nove-zamky',     name: 'Nové Zámky',       nameLocative: 'v Nových Zámkoch', region: 'Nitriansky kraj',       population: 37000,  lat: 47.9858, lng: 18.1620 },
  { slug: 'spisska-nova-ves', name: 'Spišská Nová Ves', nameLocative: 'v Spišskej Novej Vsi', region: 'Košický kraj',  population: 35000, lat: 48.9436, lng: 20.5667 },
  { slug: 'humenne',        name: 'Humenné',          nameLocative: 'v Humennom',       region: 'Prešovský kraj',        population: 33000,  lat: 48.9336, lng: 21.9085 },
  { slug: 'komarno',        name: 'Komárno',          nameLocative: 'v Komárne',        region: 'Nitriansky kraj',       population: 33000,  lat: 47.7611, lng: 18.1297 },
  { slug: 'levice',         name: 'Levice',           nameLocative: 'v Leviciach',      region: 'Nitriansky kraj',       population: 32000,  lat: 48.2167, lng: 18.6063 },
  { slug: 'liptovsky-mikulas', name: 'Liptovský Mikuláš', nameLocative: 'v Liptovskom Mikuláši', region: 'Žilinský kraj', population: 31000, lat: 49.0820, lng: 19.6137 },
  { slug: 'bardejov',       name: 'Bardejov',         nameLocative: 'v Bardejove',      region: 'Prešovský kraj',        population: 31000,  lat: 49.2922, lng: 21.2722 },
  { slug: 'ruzomberok',     name: 'Ružomberok',       nameLocative: 'v Ružomberku',     region: 'Žilinský kraj',         population: 27000,  lat: 49.0760, lng: 19.3047 },
  { slug: 'piestany',       name: 'Piešťany',         nameLocative: 'v Piešťanoch',     region: 'Trnavský kraj',         population: 27000,  lat: 48.5933, lng: 17.8266 },
  { slug: 'lucenec',        name: 'Lučenec',          nameLocative: 'v Lučenci',        region: 'Banskobystrický kraj',  population: 27000,  lat: 48.3309, lng: 19.6678 },
  { slug: 'dunajska-streda',name: 'Dunajská Streda',  nameLocative: 'v Dunajskej Strede', region: 'Trnavský kraj',       population: 23000,  lat: 47.9924, lng: 17.6118 },
];

export const CITY_BY_SLUG: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.slug, c]),
);

export function getCity(slug: string): City | undefined {
  return CITY_BY_SLUG[slug.toLowerCase()];
}

// Haversine vzdialenosť v km
export function distanceKm(a: City, b: City): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

// Odhadovaný čas (priemer 75 km/h vrátane miestnych spomalení)
export function estimatedDurationMin(km: number): number {
  return Math.round((km / 75) * 60);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
