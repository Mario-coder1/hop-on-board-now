import { Helmet } from 'react-helmet-async';

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  breadcrumbs?: BreadcrumbItem[];
  keywords?: string;
  locale?: string;
}

const SITE = 'https://www.takeme.sk';
const DEFAULT_OG = `${SITE}/og-image.png`;

// Languages we target across the EU for organic traffic.
const HREFLANGS: { code: string; lang: string }[] = [
  { code: 'sk', lang: 'sk' },
  { code: 'sk-SK', lang: 'sk' },
  { code: 'cs', lang: 'cs' },
  { code: 'cs-CZ', lang: 'cs' },
  { code: 'pl', lang: 'pl' },
  { code: 'pl-PL', lang: 'pl' },
  { code: 'en', lang: 'en' },
  { code: 'en-GB', lang: 'en' },
  { code: 'de', lang: 'de' },
  { code: 'de-DE', lang: 'de' },
  { code: 'de-AT', lang: 'de' },
  { code: 'hu', lang: 'hu' },
  { code: 'hu-HU', lang: 'hu' },
  { code: 'fr', lang: 'fr' },
  { code: 'it', lang: 'it' },
  { code: 'es', lang: 'es' },
];

const OG_ALT_LOCALES = ['cs_CZ', 'pl_PL', 'en_GB', 'en_US', 'de_DE', 'de_AT', 'hu_HU', 'fr_FR', 'it_IT', 'es_ES'];

const SEO = ({
  title,
  description,
  path = '/',
  image = DEFAULT_OG,
  type = 'website',
  noindex = false,
  jsonLd,
  breadcrumbs,
  keywords,
  locale = 'sk_SK',
}: SEOProps) => {
  const url = `${SITE}${path}`;
  const fullTitle = title.includes('TakeMe') ? title : `${title} | TakeMe`;
  const ldBlocks: Record<string, unknown>[] = jsonLd
    ? Array.isArray(jsonLd)
      ? [...jsonLd]
      : [jsonLd]
    : [];

  if (breadcrumbs && breadcrumbs.length > 0) {
    ldBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: `${SITE}${b.path}`,
      })),
    });
  }

  const sep = path.includes('?') ? '&' : '?';

  return (
    <Helmet>
      <html lang="sk" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      )}

      {/* hreflang — surface this URL to search engines in every targeted EU language */}
      {!noindex && <link rel="alternate" hrefLang="x-default" href={url} />}
      {!noindex && HREFLANGS.map(({ code, lang }) => (
        <link
          key={code}
          rel="alternate"
          hrefLang={code}
          href={`${url}${sep}lang=${lang}`}
        />
      ))}

      <meta property="og:site_name" content="TakeMe" />
      <meta property="og:locale" content={locale} />
      {OG_ALT_LOCALES.filter((l) => l !== locale).map((l) => (
        <meta key={l} property="og:locale:alternate" content={l} />
      ))}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
