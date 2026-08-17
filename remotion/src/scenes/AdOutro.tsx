import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const AdOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSp = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const logoScale = interpolate(logoSp, [0, 1], [0.55, 1]);

  const titleOp = interpolate(frame, [10, 26], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [10, 26], [50, 0], { extrapolateRight: "clamp" });

  const urlSp = spring({ frame: frame - 24, fps, config: { damping: 11, stiffness: 130 } });
  const urlScale = interpolate(urlSp, [0, 1], [0.7, 1]);

  const subOp = interpolate(frame, [42, 58], [0, 1], { extrapolateRight: "clamp" });
  const breathe = 1 + Math.sin(frame / 12) * 0.02;
  const ringScale = interpolate(frame % 45, [0, 44], [0.9, 1.5]);
  const ringOp = interpolate(frame % 45, [0, 44], [0.35, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 }}>
      <div style={{ position: "relative", marginBottom: 60 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 90,
            border: "3px solid #60A5FA",
            transform: `scale(${ringScale})`,
            opacity: ringOp,
          }}
        />
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 72,
            overflow: "hidden",
            transform: `scale(${logoScale * breathe})`,
            boxShadow: "0 40px 90px rgba(59,130,246,0.45)",
          }}
        >
          <Img
            src={staticFile("images/logo.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      <div
        style={{
          fontFamily: "Sora",
          fontWeight: 800,
          fontSize: 128,
          letterSpacing: -5,
          color: "white",
          textAlign: "center",
          lineHeight: 1,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Cestuj <span style={{ color: "#60A5FA" }}>spolu.</span>
      </div>

      <div
        style={{
          marginTop: 56,
          padding: "30px 78px",
          borderRadius: 100,
          background: "linear-gradient(135deg,#3B82F6,#0EA5E9)",
          fontFamily: "Sora",
          fontWeight: 700,
          fontSize: 62,
          letterSpacing: -1,
          color: "white",
          transform: `scale(${urlScale})`,
          boxShadow: "0 30px 70px rgba(59,130,246,0.45)",
        }}
      >
        takeme.sk
      </div>

      <div
        style={{
          marginTop: 40,
          fontFamily: "Sora",
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.7)",
          opacity: subOp,
          textAlign: "center",
        }}
      >
        Registrácia zdarma · Slovensko
      </div>
    </AbsoluteFill>
  );
};
