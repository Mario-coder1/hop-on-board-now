import { useParams } from 'react-router-dom';
import CityRides from './CityRides';
import CityPairRides from './CityPairRides';
import { getCity } from '@/data/cities';

/**
 * Dispatcher pre /jazdy/:slug
 * - Ak slug obsahuje "-" a obe časti sú validné mestá → CityPairRides
 *   (rozdelíme na poslednom validnom split bode, lebo niektoré sluggy obsahujú pomlčku, napr. "banska-bystrica")
 * - Inak skúsime ako jedno mesto → CityRides
 * - Inak CityRides spraví Navigate /jazdy
 */
const CityOrPairRoute = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const lower = slug.toLowerCase();

  // Skús celý slug ako mesto
  if (getCity(lower)) {
    return <CityRides />;
  }

  // Skús všetky možné split body
  const parts = lower.split('-');
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join('-');
    const b = parts.slice(i).join('-');
    if (getCity(a) && getCity(b)) {
      return <CityPairRides fromSlug={a} toSlug={b} />;
    }
  }

  // Fallback — necháme CityRides spraviť Navigate
  return <CityRides />;
};

export default CityOrPairRoute;
