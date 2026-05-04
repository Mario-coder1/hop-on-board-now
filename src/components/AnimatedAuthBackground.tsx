import React from 'react';
import { motion } from 'framer-motion';

/**
 * Animated background for the Auth page left panel.
 * Stylised Slovakia map with cars gliding along routes between major cities.
 * All colors use design tokens (primary/accent) — no hardcoded values.
 */
const AnimatedAuthBackground: React.FC = () => {
  // Routes defined as SVG paths — coords roughly mimic Slovakia's main corridors
  // viewBox is 800x400, west (Bratislava) on the left, east (Košice) on the right
  const routes = [
    {
      id: 'ba-ke',
      d: 'M 90 230 Q 250 180 400 200 T 720 210',
      duration: 14,
      delay: 0,
    },
    {
      id: 'ba-za',
      d: 'M 90 230 Q 220 200 340 150 T 500 120',
      duration: 11,
      delay: 2,
    },
    {
      id: 'bb-po',
      d: 'M 380 230 Q 500 200 600 180 T 700 160',
      duration: 13,
      delay: 4,
    },
    {
      id: 'za-ke',
      d: 'M 500 120 Q 600 160 660 190 T 720 210',
      duration: 12,
      delay: 6,
    },
  ];

  const cities = [
    { name: 'BA', x: 90, y: 230 },
    { name: 'NR', x: 200, y: 240 },
    { name: 'BB', x: 380, y: 230 },
    { name: 'ZA', x: 500, y: 120 },
    { name: 'PO', x: 700, y: 160 },
    { name: 'KE', x: 720, y: 210 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft glow blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/15 blur-3xl animate-float"
        style={{ animationDelay: '3s' }}
      />

      <svg
        viewBox="0 0 800 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Route gradient — fades along the line */}
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>

          {/* Car glow */}
          <radialGradient id="carGlow">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>

          {/* Define motion paths so cars can follow them */}
          {routes.map((r) => (
            <path key={`def-${r.id}`} id={`path-${r.id}`} d={r.d} />
          ))}
        </defs>

        {/* Stylised Slovakia outline — subtle */}
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
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}

        {/* City dots */}
        {cities.map((c, i) => (
          <g key={c.name}>
            <motion.circle
              cx={c.x}
              cy={c.y}
              r="6"
              fill="hsl(var(--primary))"
              fillOpacity="0.3"
              animate={{ r: [6, 14, 6], fillOpacity: [0.3, 0, 0.3] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeOut',
              }}
            />
            <circle cx={c.x} cy={c.y} r="3.5" fill="hsl(var(--primary))" />
            <text
              x={c.x}
              y={c.y - 12}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="hsl(var(--primary-foreground) / 0.7)"
              fontFamily="ui-sans-serif, system-ui"
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* Cars travelling along routes */}
        {routes.map((r) => (
          <g key={`car-${r.id}`}>
            {/* Glow halo */}
            <circle r="14" fill="url(#carGlow)">
              <animateMotion
                dur={`${r.duration}s`}
                repeatCount="indefinite"
                begin={`${r.delay}s`}
                rotate="auto"
              >
                <mpath href={`#path-${r.id}`} />
              </animateMotion>
            </circle>
            {/* Car body — small rounded rect */}
            <g>
              <rect
                x="-7"
                y="-3.5"
                width="14"
                height="7"
                rx="2"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="0.5"
              />
              <animateMotion
                dur={`${r.duration}s`}
                repeatCount="indefinite"
                begin={`${r.delay}s`}
                rotate="auto"
              >
                <mpath href={`#path-${r.id}`} />
              </animateMotion>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default AnimatedAuthBackground;
