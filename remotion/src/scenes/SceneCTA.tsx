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

  const logoSp = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const logoScale = interpolate(logoSp, [0, 1], [0.5, 1]);

  const titleOp = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [10, 28], [40, 0], { extrapolateRight: "clamp" });

  const ctaSp = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 120 } });
  const ctaScale = interpolate(ctaSp, [0, 1], [0.6, 1]);

  const urlOp = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  // pulse
  const pulse = 1 + Math.sin(frame / 6) * 0.04;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          transform: `scale(${logoScale * pulse})`,
          marginBottom: 50,
          filter: "drop-shadow(0 20px 60px rgba(59,130,246,0.7))",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 56,
            background: "linear-gradient(135deg, #3B82F6, #0EA5E9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(59,130,246,0.6)",
          }}
        >
          <Img
            src={staticFile("images/logo.png")}
            style={{ width: 150, height: 150, borderRadius: 40 }}
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
        Stiahni si
        <br />
        <span style={{ color: "#60A5FA" }}>TakeMe</span>
      </div>

      <div
        style={{
          transform: `scale(${ctaScale})`,
          marginTop: 60,
          padding: "32px 72px",
          borderRadius: 100,
          background: "linear-gradient(135deg, #3B82F6, #0EA5E9)",
          fontFamily: "Sora",
          fontWeight: 700,
          fontSize: 56,
          color: "white",
          boxShadow: "0 30px 60px rgba(59,130,246,0.5)",
          letterSpacing: -1,
        }}
      >
        Začať zadarmo →
      </div>

      <div
        style={{
          opacity: urlOp,
          marginTop: 50,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: 38,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: 1,
        }}
      >
        www.takeme.sk
      </div>
    </AbsoluteFill>
  );
};
