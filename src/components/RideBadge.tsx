import React from 'react';
import { getTopBadge } from '@/lib/badges';
import { cn } from '@/lib/utils';

interface RideBadgeProps {
  totalRides: number | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

/**
 * Auto-earned ride badge displayed next to user names across the app.
 * Returns null if user hasn't earned any badge yet (under 5 rides).
 */
const RideBadge: React.FC<RideBadgeProps> = ({
  totalRides,
  size = 'sm',
  showLabel = false,
  className,
}) => {
  const tier = getTopBadge(totalRides);
  if (!tier) return null;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1',
  };

  return (
    <span
      title={`${tier.label} — ${tier.description}`}
      className={cn(
        'inline-flex items-center rounded-full font-semibold text-white border-0 shadow-sm bg-gradient-to-r whitespace-nowrap',
        tier.gradient,
        sizeClasses[size],
        className,
      )}
    >
      <span className="leading-none">{tier.emoji}</span>
      {showLabel && <span className="leading-none">{tier.label}</span>}
    </span>
  );
};

export default RideBadge;
