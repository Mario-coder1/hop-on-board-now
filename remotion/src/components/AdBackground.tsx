import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/** Slow drifting gradient field — persistent across the whole ad. */
export const AdBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 60;
  const drift2 = Math.cos(frame / 110) * 80;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(165deg, #071122 0%, #0B1E38 45%, #061423 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.55), transparent 62%)",
          transform: `translate(${drift - 180}px, ${drift2 - 240}px) scale(1.15)`,
          filter: "blur(30px)",
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(14,165,233,0.4), transparent 60%)",
          transform: `translate(${-drift2 + 220}px, ${-drift + 520}px) scale(1.05)`,
          filter: "blur(40px)",
          opacity: 0.5,
        }}
      />
      {/* subtle grid */}
      <AbsoluteFill
        style={{
          opacity: 0.06,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          transform: `translateY(${(frame * 0.4) % 120}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
