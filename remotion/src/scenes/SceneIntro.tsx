import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const logoRot = interpolate(frame, [0, 30], [-15, 0], { extrapolateRight: "clamp" });

  const titleY = spring({ frame: frame - 12, fps, config: { damping: 20 } });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });

  const subOpacity = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [30, 48], [20, 0], { extrapolateRight: "clamp" });

  // float
  const float = Math.sin(frame / 15) * 6;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRot}deg) translateY(${float}px)`,
          marginBottom: 60,
          filter: "drop-shadow(0 20px 60px rgba(59,130,246,0.6))",
        }}
      >
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 64,
            background: "linear-gradient(135deg, #3B82F6, #0EA5E9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(59,130,246,0.5), inset 0 -8px 30px rgba(0,0,0,0.2)",
          }}
        >
          <Img
            src={staticFile("images/logo.png")}
            style={{ width: 180, height: 180, borderRadius: 48 }}
          />
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
          opacity: titleOpacity,
          fontFamily: "Sora",
          fontWeight: 800,
          fontSize: 160,
          color: "white",
          letterSpacing: -4,
          lineHeight: 1,
          textShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}
      >
        Take<span style={{ color: "#60A5FA" }}>Me</span>
      </div>

      <div
        style={{
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: 44,
          color: "rgba(255,255,255,0.85)",
          marginTop: 24,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Spolujazda novej generácie
      </div>
    </AbsoluteFill>
  );
};
