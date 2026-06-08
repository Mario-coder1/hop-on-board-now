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
import { PhoneFrame } from "../components/PhoneFrame";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSp = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const logoScale = interpolate(logoSp, [0, 1], [0.4, 1]);
  const logoRot = interpolate(frame, [0, 30], [-20, 0], { extrapolateRight: "clamp" });

  const titleOp = interpolate(frame, [16, 32], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [16, 32], [40, 0], { extrapolateRight: "clamp" });

  const subOp = interpolate(frame, [30, 46], [0, 1], { extrapolateRight: "clamp" });

  const phoneSp = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 100 } });
  const phoneScale = interpolate(phoneSp, [0, 1], [0.5, 1]);
  const phoneOp = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const float = Math.sin(frame / 18) * 10;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Background phone peeking */}
      <div
        style={{
          position: "absolute",
          right: -120,
          bottom: -180,
          opacity: phoneOp * 0.6,
          transform: `scale(${phoneScale}) rotate(18deg) translateY(${float}px)`,
        }}
      >
        <PhoneFrame src="images/shot1.png" width={520} />
      </div>

      <div style={{ textAlign: "center", zIndex: 2 }}>
        <div
          style={{
            transform: `scale(${logoScale}) rotate(${logoRot}deg)`,
            margin: "0 auto 40px",
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

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: "Sora",
            fontWeight: 800,
            fontSize: 180,
            color: "white",
            letterSpacing: -6,
            lineHeight: 1,
            textShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          Take<span style={{ color: "#60A5FA" }}>Me</span>
        </div>

        <div
          style={{
            opacity: subOp,
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 38,
            color: "rgba(255,255,255,0.85)",
            marginTop: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Spolujazda novej generácie
        </div>
      </div>
    </AbsoluteFill>
  );
};
