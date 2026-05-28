import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "sk" | "cs" | "en" | "pl";

const LANGS: Lang[] = ["sk", "cs", "en", "pl"];
const STORAGE_KEY = "takeme_lang";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  sk: {
    "hero.badge_online": "online",
    "hero.title_1": "Cestuj spolu,",
    "hero.title_2": "ušetri viac",
    "hero.subtitle": "Pripoj sa k tisícom ľudí, ktorí zdieľajú cesty po celom Slovensku. Bezpečne, pohodlne a ekonomicky.",
    "hero.cta_start": "Začať teraz",
    "hero.cta_search": "Hľadať jazdy",
    "feature.offer.title": "Ponúkni jazdu",
    "feature.offer.desc": "Zdieľaj cestu a ušetri na nákladoch",
    "feature.find.title": "Nájdi spolucestujúcich",
    "feature.find.desc": "Cestuj s overenými vodičmi",
    "feature.live.title": "Live sledovanie",
    "feature.live.desc": "Sleduj polohu v reálnom čase",
    "feature.safety.title": "Bezpečnosť",
    "feature.safety.desc": "Overené profily a hodnotenia",
    "cta.ready.title": "Pripravený na cestu?",
    "cta.ready.desc": "Vytvor si účet zadarmo a začni cestovať ešte dnes.",
    "cta.ready.button": "Registrovať sa",
    "routes.title": "Populárne trasy",
    "routes.all": "Všetky trasy →",
    "lang.label": "Jazyk",
    "gas_station.label": "Čerpacia stanica",
    "gas_station.partner": "Partnerská stanica",
    "gas_station.stop": "Zastaviť sa na stanici",
    "gas_station.stopped": "Zastavil som sa",
    "gas_station.select": "Vybrať čerpaciu stanicu",
    "gas_station.discount": "Zľava pre vodičov",
    "gas_station.none": "Žiadna stanica",
    "admin.gas_stations": "Čerpacie stanice",
  },
  cs: {
    "hero.badge_online": "online",
    "hero.title_1": "Cestuj společně,",
    "hero.title_2": "ušetři více",
    "hero.subtitle": "Připoj se k tisícům lidí, kteří sdílejí cesty. Bezpečně, pohodlně a ekonomicky.",
    "hero.cta_start": "Začít nyní",
    "hero.cta_search": "Hledat jízdy",
    "feature.offer.title": "Nabídni jízdu",
    "feature.offer.desc": "Sdílej cestu a ušetři na nákladech",
    "feature.find.title": "Najdi spolucestující",
    "feature.find.desc": "Cestuj s ověřenými řidiči",
    "feature.live.title": "Živé sledování",
    "feature.live.desc": "Sleduj polohu v reálném čase",
    "feature.safety.title": "Bezpečnost",
    "feature.safety.desc": "Ověřené profily a hodnocení",
    "cta.ready.title": "Připraven na cestu?",
    "cta.ready.desc": "Vytvoř si účet zdarma a začni cestovat ještě dnes.",
    "cta.ready.button": "Registrovat se",
    "routes.title": "Populární trasy",
    "routes.all": "Všechny trasy →",
    "lang.label": "Jazyk",
    "gas_station.label": "Čerpací stanice",
    "gas_station.partner": "Partnerská stanice",
    "gas_station.stop": "Zastavit se na stanici",
    "gas_station.stopped": "Zastavil jsem se",
    "gas_station.select": "Vybrat čerpací stanici",
    "gas_station.discount": "Sleva pro řidiče",
    "gas_station.none": "Žádná stanice",
    "admin.gas_stations": "Čerpací stanice",
  },
  en: {
    "hero.badge_online": "online",
    "hero.title_1": "Travel together,",
    "hero.title_2": "save more",
    "hero.subtitle": "Join thousands of people sharing rides. Safely, comfortably and affordably.",
    "hero.cta_start": "Get started",
    "hero.cta_search": "Find rides",
    "feature.offer.title": "Offer a ride",
    "feature.offer.desc": "Share the trip and cut your costs",
    "feature.find.title": "Find passengers",
    "feature.find.desc": "Travel with verified drivers",
    "feature.live.title": "Live tracking",
    "feature.live.desc": "Track location in real time",
    "feature.safety.title": "Safety",
    "feature.safety.desc": "Verified profiles and ratings",
    "cta.ready.title": "Ready to ride?",
    "cta.ready.desc": "Create a free account and start travelling today.",
    "cta.ready.button": "Sign up",
    "routes.title": "Popular routes",
    "routes.all": "All routes →",
    "lang.label": "Language",
    "gas_station.label": "Gas station",
    "gas_station.partner": "Partner station",
    "gas_station.stop": "Stop at station",
    "gas_station.stopped": "I stopped",
    "gas_station.select": "Select gas station",
    "gas_station.discount": "Driver discount",
    "gas_station.none": "No station",
    "admin.gas_stations": "Gas stations",
  },
  pl: {
    "hero.badge_online": "online",
    "hero.title_1": "Podróżuj razem,",
    "hero.title_2": "oszczędzaj więcej",
    "hero.subtitle": "Dołącz do tysięcy osób dzielących przejazdy. Bezpiecznie, wygodnie i tanio.",
    "hero.cta_start": "Zacznij teraz",
    "hero.cta_search": "Szukaj przejazdów",
    "feature.offer.title": "Zaproponuj przejazd",
    "feature.offer.desc": "Dziel się trasą i obniż koszty",
    "feature.find.title": "Znajdź pasażerów",
    "feature.find.desc": "Podróżuj ze zweryfikowanymi kierowcami",
    "feature.live.title": "Śledzenie na żywo",
    "feature.live.desc": "Śledź lokalizację w czasie rzeczywistym",
    "feature.safety.title": "Bezpieczeństwo",
    "feature.safety.desc": "Zweryfikowane profile i oceny",
    "cta.ready.title": "Gotowy w drogę?",
    "cta.ready.desc": "Załóż darmowe konto i ruszaj już dziś.",
    "cta.ready.button": "Zarejestruj się",
    "routes.title": "Popularne trasy",
    "routes.all": "Wszystkie trasy →",
    "lang.label": "Język",
    "gas_station.label": "Stacja benzynowa",
    "gas_station.partner": "Stacja partnerska",
    "gas_station.stop": "Zatrzymaj się na stacji",
    "gas_station.stopped": "Zatrzymałem się",
    "gas_station.select": "Wybierz stację benzynową",
    "gas_station.discount": "Zniżka dla kierowców",
    "gas_station.none": "Brak stacji",
    "admin.gas_stations": "Stacje benzynowe",
  },
};

function detectLang(): Lang {
  if (typeof window === "undefined") return "sk";
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && LANGS.includes(stored)) return stored;

  const candidates: string[] = [];
  const navAny = navigator as any;
  if (navAny.languages) candidates.push(...navAny.languages);
  if (navigator.language) candidates.push(navigator.language);

  for (const c of candidates) {
    const code = c.toLowerCase().split("-")[0];
    const region = c.toLowerCase().split("-")[1];
    if (region === "sk") return "sk";
    if (region === "cz") return "cs";
    if (region === "pl") return "pl";
    if (code === "sk") return "sk";
    if (code === "cs") return "cs";
    if (code === "pl") return "pl";
    if (code === "en") return "en";
  }
  return "sk";
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>("sk");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  const t = (key: string) => translations[lang][key] ?? translations.sk[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
