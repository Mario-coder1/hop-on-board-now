import React from 'react';
import { motion } from 'framer-motion';

/**
 * Animated background for the Auth page left panel.
 * Stylised Slovakia map with cars gliding along routes between major cities.
 * Uses CSS offset-path (motion path) for reliable animation across browsers.
 */
const AnimatedAuthBackground: React.FC = () => {
  // Routes are kept along the top and bottom edges so animated cars never
  // overlap the feature text sitting in the vertical middle of the panel.
  const routes = [
    { id: 'ba-ke', d: 'M 60 370 Q 250 340 400 360 T 740 355', duration: 14, delay: 0 },
    { id: 'ba-za', d: 'M 60 370 Q 220 355 340 345 T 720 335', duration: 11, delay: 1.5 },
    { id: 'bb-po', d: 'M 60 40 Q 250 30 420 45 T 740 40', duration: 13, delay: 3 },
    { id: 'za-ke', d: 'M 60 60 Q 260 75 460 60 T 740 70', duration: 12, delay: 4.5 },
  ];

  const cities = [
    { name: 'BA', x: 60, y: 370 },
    { name: 'NR', x: 240, y: 358 },
    { name: 'BB', x: 420, y: 358 },
    { name: 'ZA', x: 560, y: 345 },
    { name: 'PO', x: 680, y: 350 },
    { name: 'KE', x: 740, y: 355 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft glow blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/15 blur-3xl animate-float"
        style={{ animationDelay: '3s' }}
      />

      {/* SVG layer — static visuals (routes, cities, outline) */}
      <svg
        viewBox="0 0 800 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Stylised Slovakia outline */}
        <path
          d="M 60 240 Q 120 200 180 215 Q 260 195 340 220 Q 420 200 500 145 Q 580 130 660 165 Q 730 175 750 210 Q 740 250 680 255 Q 600 270 520 250 Q 440 270 360 255 Q 280 270 200 260 Q 120 270 60 240 Z"
          fill="hsl(var(--primary) / 0.04)"
          stroke="hsl(var(--primary) / 0.18)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* Routes */}
        {routes.map((r) => (
          <path
            key={r.id}
            d={r.d}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}

        {/* City dots with pulse */}
        {cities.map((c, i) => (
          <g key={c.name}>
            <motion.circle
              cx={c.x}
              cy={c.y}
              r={6}
              fill="hsl(var(--primary))"
              animate={{ r: [6, 14, 6], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
            />
            <circle cx={c.x} cy={c.y} r="3.5" fill="hsl(var(--primary))" />
            <text
              x={c.x}
              y={c.y - 12}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="hsl(var(--primary-foreground))"
              opacity="0.85"
              fontFamily="ui-sans-serif, system-ui"
            >
              {c.name}
            </text>
          </g>
        ))}
      </svg>

      {/* HTML layer — cars animated via CSS offset-path. 
          The container matches the SVG viewBox 800x400 via aspect-ratio scaling. */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            // Match svg coordinate system using a scaled wrapper.
            // We render at 800x400 then scale to fit container.
          }}
        >
          <svg
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full overflow-visible"
            aria-hidden="true"
          >
            {routes.map((r) => (
              <g key={`car-${r.id}`}>
                <motion.g
                  initial={{ offsetDistance: '0%' }}
                  animate={{ offsetDistance: '100%' }}
                  transition={{
                    duration: r.duration,
                    delay: r.delay,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    offsetPath: `path('${r.d}')`,
                    offsetRotate: 'auto',
                    // @ts-expect-error vendor prefix
                    WebkitOffsetPath: `path('${r.d}')`,
                  }}
                >
                  {/* Glow */}
                  <circle r="12" fill="hsl(var(--primary))" opacity="0.35" />
                  {/* Car body */}
                  <rect
                    x="-9"
                    y="-4"
                    width="18"
                    height="8"
                    rx="2.5"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--primary-foreground))"
                    strokeWidth="0.8"
                  />
                  {/* Windshield */}
                  <rect x="-2" y="-3" width="6" height="6" rx="1" fill="hsl(var(--primary-foreground))" opacity="0.6" />
                </motion.g>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AnimatedAuthBackground;
