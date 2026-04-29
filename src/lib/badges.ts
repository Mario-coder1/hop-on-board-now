// Auto-earned ride badges based on total_rides count.
// Tier system: 5, 20, 50, 100, 500 rides.

export type BadgeTier = {
  threshold: number;
  label: string;
  emoji: string;
  // Tailwind gradient classes for the badge background
  gradient: string;
  // Description shown in profile achievements
  description: string;
};

export const BADGE_TIERS: BadgeTier[] = [
  {
    threshold: 5,
    label: 'Nováčik',
    emoji: '🌱',
    gradient: 'from-emerald-400 to-green-500',
    description: 'Prvých 5 jázd',
  },
  {
    threshold: 20,
    label: 'Skúsený',
    emoji: '⭐',
    gradient: 'from-sky-400 to-blue-500',
    description: '20 dokončených jázd',
  },
  {
    threshold: 50,
    label: 'Veterán',
    emoji: '🔥',
    gradient: 'from-orange-400 to-red-500',
    description: '50 dokončených jázd',
  },
  {
    threshold: 100,
    label: 'Profík',
    emoji: '💎',
    gradient: 'from-violet-500 to-fuchsia-600',
    description: '100 dokončených jázd',
  },
  {
    threshold: 500,
    label: 'Legenda',
    emoji: '👑',
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    description: '500 dokončených jázd',
  },
];

/**
 * Returns the highest badge tier earned by the user, or null if none.
 */
export function getTopBadge(totalRides: number | null | undefined): BadgeTier | null {
  const count = totalRides ?? 0;
  let top: BadgeTier | null = null;
  for (const tier of BADGE_TIERS) {
    if (count >= tier.threshold) top = tier;
  }
  return top;
}

/**
 * Returns all earned tiers (for achievements display).
 */
export function getEarnedBadges(totalRides: number | null | undefined): BadgeTier[] {
  const count = totalRides ?? 0;
  return BADGE_TIERS.filter((t) => count >= t.threshold);
}
