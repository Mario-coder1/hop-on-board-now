export const SPOKEN_LANGUAGES = [
  { code: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
] as const;

export const LANG_CODES: string[] = SPOKEN_LANGUAGES.map((l) => l.code);

/** Detect languages from the browser (e.g. ["sk","en"]). Falls back to Slovak. */
export function detectSpokenLanguages(): string[] {
  const list = typeof navigator !== "undefined" ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  const found = Array.from(new Set(list.map((l) => (l || "").slice(0, 2).toLowerCase()).filter((c) => LANG_CODES.includes(c))));
  return found.length ? found : ["sk"];
}
