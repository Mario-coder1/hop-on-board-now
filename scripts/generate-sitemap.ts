// Generates all sitemap files from source data (cities + SEO variants).
// Run: bunx tsx scripts/generate-sitemap.ts

import { writeFileSync } from "fs";
import { resolve } from "path";

// Import source data (same as app uses)
import { CITIES } from "../src/data/cities";
import { PAIR_VARIANTS, CITY_VARIANTS } from "../src/data/seoVariants";

const BASE_URL = "https://www.takeme.sk";
const LASTMOD = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

interface SitemapEntry {
  path: string;
  changefreq?: string;
  priority?: string;
}

function urlBlock(e: SitemapEntry): string {
  return [
    "  <url>",
    `    <loc>${BASE_URL}${e.path}</loc>`,
    `    <lastmod>${LASTMOD}</lastmod>`,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function writeUrlset(path: string, entries: SitemapEntry[]) {
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(urlBlock),
    `</urlset>`,
    "",
  ].join("\n");
  writeFileSync(resolve(path), xml);
  console.log(`  ${path} — ${entries.length} URLs`);
}

function writeIndex(path: string, sitemaps: { loc: string; lastmod: string }[]) {
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...sitemaps.map(
      (s) =>
        `  <sitemap>\n    <loc>${s.loc}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`
    ),
    `</sitemapindex>`,
    "",
  ].join("\n");
  writeFileSync(resolve(path), xml);
  console.log(`  ${path} — ${sitemaps.length} sub-sitemaps`);
}

console.log(`Generating sitemaps for ${BASE_URL} (lastmod: ${LASTMOD})...\n`);

// ─── CORE ─── public, indexable routes only ───
const coreEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/jazdy", changefreq: "daily", priority: "0.95" },
  { path: "/install", changefreq: "monthly", priority: "0.8" },
  { path: "/co2", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/gdpr", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/tutorial", changefreq: "monthly", priority: "0.4" },
];
writeUrlset("public/sitemap-core.xml", coreEntries);

// ─── CITIES ─── /jazdy/{city} + variants ───
const cityEntries: SitemapEntry[] = [];
for (const city of CITIES) {
  cityEntries.push({ path: `/jazdy/${city.slug}`, changefreq: "daily", priority: "0.8" });
  for (const v of CITY_VARIANTS) {
    cityEntries.push({
      path: `/jazdy/${city.slug}/${v.slug}`,
      changefreq: "weekly",
      priority: "0.6",
    });
  }
}
writeUrlset("public/sitemap-cities.xml", cityEntries);

// ─── PAIRS ─── /jazdy/{a}-{b} ───
const pairEntries: SitemapEntry[] = [];
for (let i = 0; i < CITIES.length; i++) {
  for (let j = 0; j < CITIES.length; j++) {
    if (i === j) continue;
    const a = CITIES[i];
    const b = CITIES[j];
    pairEntries.push({
      path: `/jazdy/${a.slug}-${b.slug}`,
      changefreq: "daily",
      priority: "0.7",
    });
  }
}
writeUrlset("public/sitemap-pairs.xml", pairEntries);

// ─── PAIR VARIANTS ─── /jazdy/{a}-{b}/{variant} ───
const pairVariantEntries: SitemapEntry[] = [];
for (let i = 0; i < CITIES.length; i++) {
  for (let j = 0; j < CITIES.length; j++) {
    if (i === j) continue;
    const a = CITIES[i];
    const b = CITIES[j];
    for (const v of PAIR_VARIANTS) {
      pairVariantEntries.push({
        path: `/jazdy/${a.slug}-${b.slug}/${v.slug}`,
        changefreq: "weekly",
        priority: "0.55",
      });
    }
  }
}
writeUrlset("public/sitemap-pair-variants.xml", pairVariantEntries);

// ─── INDEX ───
writeIndex("public/sitemap.xml", [
  { loc: `${BASE_URL}/sitemap-core.xml`, lastmod: LASTMOD },
  { loc: `${BASE_URL}/sitemap-cities.xml`, lastmod: LASTMOD },
  { loc: `${BASE_URL}/sitemap-pairs.xml`, lastmod: LASTMOD },
  { loc: `${BASE_URL}/sitemap-pair-variants.xml`, lastmod: LASTMOD },
]);

// ─── ROBOTS.TXT ───
const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin",
  "Disallow: /auth",
  "Disallow: /track/",
  "Disallow: /manage-passengers/",
  "Disallow: /my-rides",
  "Disallow: /my-trips",
  "Disallow: /profile",
  "Disallow: /chat",
  "Disallow: /driver",
  "Disallow: /passenger",
  "Disallow: /create-ride",
  "Disallow: /search",
  "Disallow: /wallet",
  "Disallow: /checkout/",
  "Disallow: /komunity",
  "Disallow: /top-drivers",
  "",
  `Sitemap: ${BASE_URL}/sitemap.xml`,
  "",
].join("\n");
writeFileSync(resolve("public/robots.txt"), robots);
console.log(`  public/robots.txt — updated`);

const total = coreEntries.length + cityEntries.length + pairEntries.length + pairVariantEntries.length;
console.log(`\nTotal URLs across all sitemaps: ${total.toLocaleString()}`);
