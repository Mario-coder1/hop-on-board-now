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
    "hero.subtitle": "Nová slovenská platforma na spolujazdu. Bezpečne, pohodlne a výhodne — od Bratislavy po Košice.",
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
    "stats.users": "registrovaných",
    "stats.rides": "jázd",
    "stats.rating": "hodnotenie",
    "howitworks.title": "Ako to funguje",
    "howitworks.step1.title": "Nájdi jazdu",
    "howitworks.step1.desc": "Vyhľadaj trasu, ktorá ti vyhovuje – podľa mesta, ceny alebo času.",
    "howitworks.step2.title": "Rezervuj",
    "howitworks.step2.desc": "Pošli žiadosť vodičovi a zaplať bezpečne cez aplikáciu.",
    "howitworks.step3.title": "Cestuj",
    "howitworks.step3.desc": "Sleduj jazdu naživo a vychutnaj si cestu s novými známymi.",
    "why.title": "Prečo TakeMe",
    "why.money.title": "Ušetríš",
    "why.money.desc": "Zdieľané náklady na palivo ťa vyjdú lacnejšie ako vlak či autobus.",
    "why.safe.title": "Bezpečne",
    "why.safe.desc": "Overené profily, hodnotenia a live sledovanie počas jazdy.",
    "why.green.title": "Eko",
    "why.green.desc": "Menej áut na ceste = menej emisií a čistejšie Slovensko.",
    "why.people.title": "Komunita",
    "why.people.desc": "Spoznávaj nových ľudí a cestuj príjemnejšie.",
    "early.title": "Buď medzi prvými",
    "early.desc": "TakeMe je nová platforma — pridaj sa od začiatku, pomôž nám rásť a získaj výhody prvých používateľov.",
    "early.cta": "Registrovať sa",
    "free.badge": "Registrácia je zadarmo — žiadne skryté poplatky",
    "coverage.title": "Kde funguje",
    "coverage.desc": "TakeMe spája ľudí naprieč strednou Európou. Či už cestuješ doma alebo do zahraničia.",
    "faq.title": "Často kladené otázky",
    "faq.q1": "Je registrácia zadarmo?",
    "faq.a1": "Áno, vytvorenie účtu je úplne zadarmo. Platíš až keď rezervuješ miesto v aute.",
    "faq.q2": "Ako viem, že je jazda bezpečná?",
    "faq.a2": "Každý profil je overený e-mailom. Vodiči majú hodnotenia od iných pasažierov a počas jazdy je k dispozícii live sledovanie polohy.",
    "faq.q3": "Kde všade môžem cestovať?",
    "faq.a3": "TakeMe funguje na Slovensku, v Česku, v Poľsku a ďalších krajinách EÚ. Cesty medzi mestami aj cez hranice.",
    "faq.q4": "Ako funguje platba?",
    "faq.a4": "Platba prebieha bezpečne cez Stripe priamo v aplikácii. Peniaze sa uvoľnia vodičovi až po dokončení jazdy.",
  },
  cs: {
    "hero.badge_online": "online",
    "hero.title_1": "Cestuj společně,",
    "hero.title_2": "ušetři více",
    "hero.subtitle": "Nová česká platforma pro spolujízdu. Bezpečně, pohodlně a výhodně — od Prahy po Brno.",
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
    "stats.users": "registrovaných",
    "stats.rides": "jízd",
    "stats.rating": "hodnocení",
    "howitworks.title": "Jak to funguje",
    "howitworks.step1.title": "Najdi jízdu",
    "howitworks.step1.desc": "Vyhledej trasu podle města, ceny nebo času.",
    "howitworks.step2.title": "Rezervuj",
    "howitworks.step2.desc": "Pošli žádost řidiči a zaplať bezpečně přes aplikaci.",
    "howitworks.step3.title": "Cestuj",
    "howitworks.step3.desc": "Sleduj jízdu naživo a užij si cestu s novými známými.",
    "why.title": "Proč TakeMe",
    "why.money.title": "Ušetříš",
    "why.money.desc": "Sdílené náklady na palivo vyjdou levněji než vlak či autobus.",
    "why.safe.title": "Bezpečně",
    "why.safe.desc": "Ověřené profily, hodnocení a živé sledování během jízdy.",
    "why.green.title": "Eko",
    "why.green.desc": "Méně aut na silnici = méně emisí a čistější svět.",
    "why.people.title": "Komunita",
    "why.people.desc": "Poznávej nové lidi a cestuj příjemněji.",
    "early.title": "Buď mezi prvními",
    "early.desc": "TakeMe je nová platforma — přidej se od začátku, pomoz nám růst a získej výhody prvních uživatelů.",
    "early.cta": "Registrovat se",
    "free.badge": "Registrace je zdarma — žádné skryté poplatky",
    "coverage.title": "Kde funguje",
    "coverage.desc": "TakeMe propojuje lidi napříč střední Evropou. Ať už cestuješ doma nebo do zahraničí.",
    "faq.title": "Často kladené otázky",
    "faq.q1": "Je registrace zdarma?",
    "faq.a1": "Ano, vytvoření účtu je zcela zdarma. Platíš až když rezervuješ místo v autě.",
    "faq.q2": "Jak vím, že je jízda bezpečná?",
    "faq.a2": "Každý profil je ověřen e-mailem. Řidiči mají hodnocení od jiných pasažérů a během jízdy je k dispozici živé sledování polohy.",
    "faq.q3": "Kde všude mohu cestovat?",
    "faq.a3": "TakeMe funguje na Slovensku, v Česku, v Polsku a dalších zemích EU. Cesty mezi městy i přes hranice.",
    "faq.q4": "Jak funguje platba?",
    "faq.a4": "Platba probíhá bezpečně přes Stripe přímo v aplikaci. Peníze se uvolní řidiči až po dokončení jízdy.",
  },
  en: {
    "hero.badge_online": "online",
    "hero.title_1": "Travel together,",
    "hero.title_2": "save more",
    "hero.subtitle": "A new ride-sharing platform for Slovakia. Safely, comfortably and affordably — from Bratislava to Košice.",
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
    "stats.users": "registered",
    "stats.rides": "rides",
    "stats.rating": "rating",
    "howitworks.title": "How it works",
    "howitworks.step1.title": "Find a ride",
    "howitworks.step1.desc": "Search for a route that suits you — by city, price or time.",
    "howitworks.step2.title": "Book it",
    "howitworks.step2.desc": "Send a request to the driver and pay securely in the app.",
    "howitworks.step3.title": "Ride",
    "howitworks.step3.desc": "Track the ride live and enjoy the journey with new friends.",
    "why.title": "Why TakeMe",
    "why.money.title": "Save money",
    "why.money.desc": "Shared fuel costs are cheaper than train or bus tickets.",
    "why.safe.title": "Stay safe",
    "why.safe.desc": "Verified profiles, ratings and live tracking during the ride.",
    "why.green.title": "Go green",
    "why.green.desc": "Fewer cars on the road = fewer emissions and cleaner air.",
    "why.people.title": "Community",
    "why.people.desc": "Meet new people and travel in better company.",
    "early.title": "Be among the first",
    "early.desc": "TakeMe is a new platform — join from the start, help us grow and enjoy early-user benefits.",
    "early.cta": "Sign up",
    "free.badge": "Registration is free — no hidden fees",
    "coverage.title": "Where it works",
    "coverage.desc": "TakeMe connects people across Central Europe. Whether you travel domestically or abroad.",
    "faq.title": "Frequently asked questions",
    "faq.q1": "Is registration free?",
    "faq.a1": "Yes, creating an account is completely free. You only pay when you book a seat in a car.",
    "faq.q2": "How do I know a ride is safe?",
    "faq.a2": "Every profile is email-verified. Drivers have ratings from other passengers and live location tracking is available during the ride.",
    "faq.q3": "Where can I travel?",
    "faq.a3": "TakeMe works in Slovakia, Czechia, Poland and other EU countries. City-to-city rides and cross-border trips.",
    "faq.q4": "How does payment work?",
    "faq.a4": "Payment is handled securely via Stripe directly in the app. Funds are released to the driver only after the ride is completed.",
  },
  pl: {
    "hero.badge_online": "online",
    "hero.title_1": "Podróżuj razem,",
    "hero.title_2": "oszczędzaj więcej",
    "hero.subtitle": "Nowa platforma do wspólnych przejazdów na Słowacji. Bezpiecznie, wygodnie i tanio — od Bratysławy po Koszyce.",
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
    "stats.users": "zarejestrowanych",
    "stats.rides": "przejazdów",
    "stats.rating": "ocena",
    "howitworks.title": "Jak to działa",
    "howitworks.step1.title": "Znajdź przejazd",
    "howitworks.step1.desc": "Wyszukaj trasę według miasta, ceny lub czasu.",
    "howitworks.step2.title": "Zarezerwuj",
    "howitworks.step2.desc": "Wyślij prośbę do kierowcy i zapłać bezpiecznie przez aplikację.",
    "howitworks.step3.title": "Podróżuj",
    "howitworks.step3.desc": "Śledź przejazd na żywo i ciesz się podróżą z nowymi znajomymi.",
    "why.title": "Dlaczego TakeMe",
    "why.money.title": "Oszczędzasz",
    "why.money.desc": "Wspólne koszty paliwa są tańsze niż pociąg czy autobus.",
    "why.safe.title": "Bezpiecznie",
    "why.safe.desc": "Zweryfikowane profile, oceny i śledzenie na żywo podczas przejazdu.",
    "why.green.title": "Eko",
    "why.green.desc": "Mniej aut na drodze = mniej emisji i czystszy świat.",
    "why.people.title": "Społeczność",
    "why.people.desc": "Poznawaj nowych ludzi i podróżuj w lepszym towarzystwie.",
    "early.title": "Bądź jednym z pierwszych",
    "early.desc": "TakeMe to nowa platforma — dołącz od samego początku, pomóż nam rosnąć i ciesz się korzyściami pierwszych użytkowników.",
    "early.cta": "Zarejestruj się",
    "testimonials.title": "Co mówią inni",
    "testimonials.t1.quote": "Z TakeMe przejechałem całe Słowację. Zawsze świetne towarzystwo i oszczędzam sporo pieniędzy.",
    "testimonials.t1.name": "Martin K.",
    "testimonials.t1.role": "Stały pasażer",
    "testimonials.t2.quote": "Jako kierowca dzięki TakeMe opłacam koszty dojazdu do pracy i poznaję ciekawe osoby.",
    "testimonials.t2.name": "Zuzana T.",
    "testimonials.t2.role": "Kierowca",
    "testimonials.t3.quote": "Prościej być nie może. Szukam, klikam, jadę. Polecam każdemu studentowi.",
    "testimonials.t3.name": "Jakub P.",
    "testimonials.t3.role": "Student",
  },
};

function mapToSupported(raw: string | null | undefined): Lang | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  const code = v.split("-")[0];
  const region = v.split("-")[1];
  if (region === "sk") return "sk";
  if (region === "cz") return "cs";
  if (region === "pl") return "pl";
  if (code === "sk") return "sk";
  if (code === "cs" || code === "cz") return "cs";
  if (code === "pl") return "pl";
  if (code === "en") return "en";
  // DE/HU/FR/IT/ES and other EU langs → fall back to EN
  if (["de", "hu", "fr", "it", "es", "nl", "ro", "hr", "sl"].includes(code)) return "en";
  return null;
}

function detectLang(): Lang {
  if (typeof window === "undefined") return "sk";

  // 1) URL ?lang= has the highest priority (hreflang + shared links)
  try {
    const url = new URL(window.location.href);
    const fromUrl = mapToSupported(url.searchParams.get("lang"));
    if (fromUrl) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch {}

  // 2) Stored preference
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && LANGS.includes(stored)) return stored;

  // 3) Browser languages
  const candidates: string[] = [];
  const navAny = navigator as any;
  if (navAny.languages) candidates.push(...navAny.languages);
  if (navigator.language) candidates.push(navigator.language);
  for (const c of candidates) {
    const mapped = mapToSupported(c);
    if (mapped) return mapped;
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
