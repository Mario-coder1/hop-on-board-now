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

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSp = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const logoScale = interpolate(logoSp, [0, 1], [0.5, 1]);

  const titleOp = interpolate(frame, [8, 24], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [8, 24], [40, 0], { extrapolateRight: "clamp" });

  const ctaSp = spring({ frame: frame - 22, fps, config: { damping: 10, stiffness: 130 } });
  const ctaScale = interpolate(ctaSp, [0, 1], [0.6, 1]);

  const urlOp = interpolate(frame, [38, 56], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(frame / 5) * 0.04;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          transform: `scale(${logoScale * pulse})`,
          marginBottom: 40,
          filter: "drop-shadow(0 20px 60px rgba(59,130,246,0.7))",
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 60,
            background: "linear-gradient(135deg, #3B82F6, #0EA5E9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(59,130,246,0.6)",
          }}
        >
          <Img
            src={staticFile("images/logo.png")}
            style={{ width: 160, height: 160, borderRadius: 44 }}
          />
        </div>
      </div>

      <div
        style={{
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          fontFamily: "Sora",
          fontWeight: 800,
          fontSize: 130,
          color: "white",
          textAlign: "center",
          lineHeight: 1,
          letterSpacing: -3,
        }}
      >
        Stiahni si <span style={{ color: "#60A5FA" }}>TakeMe</span>
      </div>

      <div
        style={{
          transform: `scale(${ctaScale})`,
          marginTop: 50,
          padding: "30px 70px",
          borderRadius: 100,
          background: "linear-gradient(135deg, #3B82F6, #0EA5E9)",
          fontFamily: "Sora",
          fontWeight: 700,
          fontSize: 54,
          color: "white",
          boxShadow: "0 30px 60px rgba(59,130,246,0.5)",
          letterSpacing: -1,
        }}
      >
        takeme.sk
      </div>

      <div
        style={{
          opacity: urlOp,
          marginTop: 36,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: 36,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Cestuj spolu · Šetri viac
      </div>
    </AbsoluteFill>
  );
};
