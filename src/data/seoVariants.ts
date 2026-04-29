// SEO varianty (sufixy) pre páry miest a mestá.
// Každý variant tvorí ďalšiu unikátnu URL s mierne iným titulkom/popisom,
// čo dramaticky zväčšuje long-tail pokrytie v Google.

export interface PairVariant {
  slug: string;          // suffix po páre, napr. "dnes"
  label: string;         // pre breadcrumb / nadpis
  titleSuffix: string;   // pridá sa do <title>
  descSuffix: string;    // pridá sa do meta description
  h1Suffix: string;      // pridá sa do H1
  filter?: 'today' | 'tomorrow' | 'weekend' | 'evening' | 'morning' | 'cheap';
}

export const PAIR_VARIANTS: PairVariant[] = [
  { slug: 'dnes',     label: 'dnes',           titleSuffix: 'dnes',                descSuffix: 'Pozri si jazdy ešte dnes.',                          h1Suffix: 'dnes',          filter: 'today' },
  { slug: 'zajtra',   label: 'zajtra',         titleSuffix: 'zajtra',              descSuffix: 'Plánuj jazdu na zajtra.',                            h1Suffix: 'zajtra',        filter: 'tomorrow' },
  { slug: 'vikend',   label: 'cez víkend',     titleSuffix: 'cez víkend',          descSuffix: 'Víkendové spolujazdy.',                              h1Suffix: 'cez víkend',    filter: 'weekend' },
  { slug: 'vecer',    label: 'večer',          titleSuffix: 'večer',               descSuffix: 'Večerné odjazdy po 17:00.',                          h1Suffix: 'večer',         filter: 'evening' },
  { slug: 'rano',     label: 'ráno',           titleSuffix: 'ráno',                descSuffix: 'Ranné odjazdy do 10:00.',                            h1Suffix: 'ráno',          filter: 'morning' },
  { slug: 'lacne',    label: 'lacné',          titleSuffix: 'lacná spolujazda',    descSuffix: 'Najlacnejšie ponuky na trase.',                      h1Suffix: '— lacno',       filter: 'cheap' },
  { slug: 'auto',     label: 'autom',          titleSuffix: 'autom',               descSuffix: 'Cestuj autom so zdieľaním nákladov.',                h1Suffix: 'autom' },
  { slug: 'doprava',  label: 'doprava',        titleSuffix: 'doprava',             descSuffix: 'Najrýchlejšia alternatíva k vlaku a autobusu.',      h1Suffix: '— doprava' },
  { slug: 'cena',     label: 'cena',           titleSuffix: 'cena a info',         descSuffix: 'Cena, vzdialenosť a čas jazdy.',                     h1Suffix: '— cena' },
];

export interface CityVariant {
  slug: string;
  label: string;
  titleSuffix: string;
  descSuffix: string;
}

export const CITY_VARIANTS: CityVariant[] = [
  { slug: 'dnes',     label: 'dnes',     titleSuffix: 'dnes',     descSuffix: 'Aktuálne jazdy ešte dnes.' },
  { slug: 'zajtra',   label: 'zajtra',   titleSuffix: 'zajtra',   descSuffix: 'Naplánuj cestu na zajtra.' },
  { slug: 'lacne',    label: 'lacné',    titleSuffix: 'lacná spolujazda', descSuffix: 'Najlacnejšie ponuky.' },
  { slug: 'odchody',  label: 'odchody',  titleSuffix: 'odchody',  descSuffix: 'Všetky plánované odchody.' },
  { slug: 'doprava',  label: 'doprava',  titleSuffix: 'doprava',  descSuffix: 'Spoľahlivá zdieľaná doprava.' },
];

export const PAIR_VARIANT_BY_SLUG: Record<string, PairVariant> = Object.fromEntries(
  PAIR_VARIANTS.map((v) => [v.slug, v]),
);
export const CITY_VARIANT_BY_SLUG: Record<string, CityVariant> = Object.fromEntries(
  CITY_VARIANTS.map((v) => [v.slug, v]),
);
