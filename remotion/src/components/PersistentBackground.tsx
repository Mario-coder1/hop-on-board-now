import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  return (
    <AbsoluteFill>
      {/* base gradient */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 30% 10%, #1E40AF 0%, transparent 55%), radial-gradient(ellipse at 70% 90%, #0EA5E9 0%, transparent 55%), linear-gradient(180deg, #0A1628 0%, #0F172A 100%)",
        }}
      />
      {/* slow moving blob */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          left: -200 + t * 200,
          top: 200 + Math.sin(t * Math.PI * 2) * 150,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          right: -150 - t * 100,
          bottom: 300 + Math.cos(t * Math.PI * 2) * 200,
          background:
            "radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* subtle grain overlay via repeating dots */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
