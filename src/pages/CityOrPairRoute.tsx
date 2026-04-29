import { useParams } from 'react-router-dom';
import CityRides from './CityRides';
import CityPairRides from './CityPairRides';
import { getCity } from '@/data/cities';
import { PAIR_VARIANT_BY_SLUG, CITY_VARIANT_BY_SLUG } from '@/data/seoVariants';

/**
 * Dispatcher pre /jazdy/:slug a /jazdy/:slug/:variant
 *
 * Podporuje:
 *   /jazdy/bratislava                       → CityRides
 *   /jazdy/bratislava/dnes                  → CityRides s variantom
 *   /jazdy/bratislava-kosice                → CityPairRides
 *   /jazdy/bratislava-kosice/dnes           → CityPairRides s variantom
 *   /jazdy/banska-bystrica-bratislava/lacne → CityPairRides (pomlčky v slugu)
 */
const CityOrPairRoute = () => {
  const { slug = '', variant = '' } = useParams<{ slug: string; variant?: string }>();
  const lower = slug.toLowerCase();
  const variantLower = (variant || '').toLowerCase();

  // Skús celý slug ako mesto
  if (getCity(lower)) {
    const cityVariant = variantLower ? CITY_VARIANT_BY_SLUG[variantLower] : undefined;
    return <CityRides variantOverride={cityVariant} />;
  }

  // Skús všetky možné split body (pre slugy s pomlčkami v menách miest)
  const parts = lower.split('-');
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join('-');
    const b = parts.slice(i).join('-');
    if (getCity(a) && getCity(b)) {
      const pairVariant = variantLower ? PAIR_VARIANT_BY_SLUG[variantLower] : undefined;
      return <CityPairRides fromSlug={a} toSlug={b} variantOverride={pairVariant} />;
    }
  }

  return <CityRides />;
};

export default CityOrPairRoute;
