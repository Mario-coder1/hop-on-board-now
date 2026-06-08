import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { PhoneFrame } from "../components/PhoneFrame";

interface Props {
  shot: string;
  eyebrow: string;
  title: string;
  highlight?: string;
  accent?: string;
  align?: "left" | "right";
}

export const ScenePhone: React.FC<Props> = ({
  shot,
  eyebrow,
  title,
  highlight,
  accent = "#3B82F6",
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneSp = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const phoneScale = interpolate(phoneSp, [0, 1], [0.82, 1]);
  const phoneRot = interpolate(phoneSp, [0, 1], [align === "left" ? 8 : -8, align === "left" ? -4 : 4]);
  const float = Math.sin(frame / 22) * 8;

  const eyebrowOp = interpolate(frame, [6, 18], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [12, 26], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 26], [30, 0], { extrapolateRight: "clamp" });

  const isLeft = align === "left";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: isLeft ? "row" : "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "80px 70px",
      }}
    >
      {/* Text side */}
      <div style={{ flex: 1, maxWidth: 520, zIndex: 2 }}>
        <div
          style={{
            opacity: eyebrowOp,
            display: "inline-block",
            padding: "10px 22px",
            borderRadius: 999,
            background: `${accent}22`,
            border: `1.5px solid ${accent}55`,
            color: accent,
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontFamily: "Sora",
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1.0,
            letterSpacing: -3,
            color: "white",
            textShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}
        >
          {title}
          {highlight && (
            <>
              <br />
              <span style={{ color: accent }}>{highlight}</span>
            </>
          )}
        </div>
      </div>

      {/* Phone side */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}55, transparent 65%)`,
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            transform: `scale(${phoneScale}) rotate(${phoneRot}deg) translateY(${float}px)`,
            transformOrigin: "center",
          }}
        >
          <PhoneFrame src={shot} width={560} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
