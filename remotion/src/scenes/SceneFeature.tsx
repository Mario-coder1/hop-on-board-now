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

interface Props {
  title: string;
  subtitle: string;
  mock: string;
  accent: string;
}

export const SceneFeature: React.FC<Props> = ({ title, subtitle, mock, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const phoneScale = interpolate(phoneIn, [0, 1], [0.7, 1]);
  const phoneY = interpolate(phoneIn, [0, 1], [80, 0]);
  const phoneRot = interpolate(phoneIn, [0, 1], [8, -3]);

  const float = Math.sin(frame / 20) * 10;

  const titleOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [10, 28], [-60, 0], { extrapolateRight: "clamp" });

  const subOpacity = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: "clamp" });
  const subX = interpolate(frame, [22, 40], [-30, 0], { extrapolateRight: "clamp" });

  const barW = interpolate(frame, [8, 35], [0, 200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Top text block */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 70,
          right: 70,
        }}
      >
        <div
          style={{
            width: barW,
            height: 8,
            borderRadius: 4,
            background: accent,
            marginBottom: 28,
            boxShadow: `0 0 20px ${accent}`,
          }}
        />
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
            fontFamily: "Sora",
            fontWeight: 800,
            fontSize: 110,
            color: "white",
            lineHeight: 1.05,
            letterSpacing: -3,
            textShadow: "0 6px 20px rgba(0,0,0,0.4)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            opacity: subOpacity,
            transform: `translateX(${subX}px)`,
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: 42,
            color: "rgba(255,255,255,0.8)",
            marginTop: 20,
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Phone mockup */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: `translateX(-50%) translateY(${phoneY + float}px) scale(${phoneScale}) rotate(${phoneRot}deg)`,
        }}
      >
        <div
          style={{
            width: 560,
            height: 1000,
            borderRadius: 60,
            padding: 14,
            background: "linear-gradient(145deg, #1f2937, #0b1220)",
            boxShadow: `0 50px 100px -20px rgba(0,0,0,0.7), 0 0 80px ${accent}55`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 48,
              overflow: "hidden",
              position: "relative",
              border: "2px solid rgba(255,255,255,0.08)",
            }}
          >
            <Img
              src={staticFile(mock)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* glare */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.05) 100%)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
