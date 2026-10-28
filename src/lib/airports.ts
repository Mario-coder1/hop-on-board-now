// Airport presets offered first when creating an airport ride.
export interface AirportPreset {
  id: string;
  label: string; // saved as ride address
  search: string; // extra search words (lowercase, no diacritics)
  lat: number;
  lng: number;
}

export const AIRPORT_PRESETS: AirportPreset[] = [
  { id: 'vie', label: 'Letisko Viedeň (Schwechat), Rakúsko', search: 'vieden wien vienna schwechat', lat: 48.1103, lng: 16.5697 },
  { id: 'bts', label: 'Letisko Bratislava (M. R. Štefánika), Slovensko', search: 'bratislava stefanika', lat: 48.1702, lng: 17.2127 },
  { id: 'kse', label: 'Letisko Košice, Slovensko', search: 'kosice', lat: 48.6631, lng: 21.2411 },
  { id: 'tat', label: 'Letisko Poprad-Tatry, Slovensko', search: 'poprad tatry', lat: 49.0736, lng: 20.2411 },
  { id: 'ilz', label: 'Letisko Žilina, Slovensko', search: 'zilina', lat: 49.2315, lng: 18.6135 },
  { id: 'pzy', label: 'Letisko Piešťany, Slovensko', search: 'piestany', lat: 48.6252, lng: 17.8284 },
  { id: 'sld', label: 'Letisko Sliač, Slovensko', search: 'sliac banska bystrica zvolen', lat: 48.6378, lng: 19.1341 },
  { id: 'bud', label: 'Letisko Budapešť (Ferenc Liszt), Maďarsko', search: 'budapest budapest liszt', lat: 47.4394, lng: 19.2618 },
  { id: 'deb', label: 'Letisko Debrecín, Maďarsko', search: 'debrecin debrecen', lat: 47.4889, lng: 21.6153 },
  { id: 'prg', label: 'Letisko Praha (Václava Havla), Česko', search: 'praha prague havla', lat: 50.1008, lng: 14.26 },
  { id: 'brq', label: 'Letisko Brno (Tuřany), Česko', search: 'brno turany', lat: 49.1513, lng: 16.6944 },
  { id: 'osr', label: 'Letisko Ostrava (Mošnov), Česko', search: 'ostrava mosnov', lat: 49.6963, lng: 18.1111 },
  { id: 'krk', label: 'Letisko Krakov (Balice), Poľsko', search: 'krakov krakow balice', lat: 50.0777, lng: 19.7848 },
  { id: 'ktw', label: 'Letisko Katovice (Pyrzowice), Poľsko', search: 'katovice katowice pyrzowice', lat: 50.4743, lng: 19.08 },
  { id: 'rze', label: 'Letisko Rzeszów, Poľsko', search: 'rzeszow', lat: 50.11, lng: 22.019 },
  { id: 'waw', label: 'Letisko Varšava (Chopin), Poľsko', search: 'varsava warszawa warsaw chopin', lat: 52.1657, lng: 20.9671 },
  { id: 'muc', label: 'Letisko Mníchov, Nemecko', search: 'mnichov munchen munich', lat: 48.3538, lng: 11.7861 },
];

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const matchAirportPresets = (query: string): AirportPreset[] => {
  const words = normalize(query).replace(/letisk\w*|airport|letist\w*/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return AIRPORT_PRESETS;
  return AIRPORT_PRESETS.filter((a) => {
    const hay = normalize(`${a.label} ${a.search}`);
    return words.every((w) => hay.includes(w));
  });
};
