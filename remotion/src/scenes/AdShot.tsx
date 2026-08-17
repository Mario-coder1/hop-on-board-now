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

type Props = {
  src: string;
  step: string;
  line1: string;
  line2: string;
  note: string;
  align: "left" | "right";
  live?: boolean;
};

export const AdShot: React.FC<Props> = ({ src, step, line1, line2, note, align, live }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
  const shotY = interpolate(enter, [0, 1], [140, 0]);
  const shotScale = interpolate(enter, [0, 1], [0.9, 1]);
  const float = Math.sin(frame / 24) * 10;
  const tilt = align === "left" ? -4 : 4;

  const w1 = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 140 } });
  const w2 = spring({ frame: frame - 11, fps, config: { damping: 14, stiffness: 140 } });
  const noteOp = interpolate(frame, [20, 34], [0, 1], { extrapolateRight: "clamp" });
  const noteX = interpolate(frame, [20, 34], [align === "left" ? -30 : 30, 0], {
    extrapolateRight: "clamp",
  });
  const barW = interpolate(frame, [6, 46], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 0.5 + Math.abs(Math.sin(frame / 8)) * 0.5;

  const word = (v: number) => ({
    display: "inline-block" as const,
    transform: `translateY(${interpolate(v, [0, 1], [90, 0])}px)`,
    opacity: interpolate(v, [0, 0.4, 1], [0, 0.6, 1]),
  });

  return (
    <AbsoluteFill>
      {/* Copy block */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: align === "left" ? 80 : undefined,
          right: align === "right" ? 80 : undefined,
          textAlign: align,
          fontFamily: "Sora",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: align === "right" ? "row-reverse" : "row",
            alignItems: "center",
            gap: 18,
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#7DD3FC",
            }}
          >
            {step}
          </span>
          <span
            style={{
              width: 140 * barW,
              height: 4,
              borderRadius: 4,
              background: "linear-gradient(90deg,#3B82F6,#0EA5E9)",
            }}
          />
          {live && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 24,
                fontWeight: 700,
                color: "#34D399",
                letterSpacing: 3,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 14,
                  background: "#34D399",
                  opacity: pulse,
                }}
              />
              LIVE
            </span>
          )}
        </div>

        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontSize: 118,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -4,
              color: "white",
              ...word(w1),
            }}
          >
            {line1}
          </div>
        </div>
        <div style={{ overflow: "hidden", marginTop: 4 }}>
          <div
            style={{
              fontSize: 118,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -4,
              color: "#60A5FA",
              ...word(w2),
            }}
          >
            {line2}
          </div>
        </div>

        <div
          style={{
            marginTop: 26,
            maxWidth: 640,
            fontSize: 34,
            fontWeight: 600,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.72)",
            opacity: noteOp,
            transform: `translateX(${noteX}px)`,
            marginLeft: align === "right" ? "auto" : undefined,
          }}
        >
          {note}
        </div>
      </div>

      {/* Real app screenshot */}
      <div
        style={{
          position: "absolute",
          bottom: -120,
          left: align === "left" ? undefined : -60,
          right: align === "left" ? -60 : undefined,
          transform: `translateY(${shotY + float}px) scale(${shotScale}) rotate(${tilt}deg)`,
          filter: "drop-shadow(0 60px 120px rgba(0,0,0,0.65))",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: 760,
            display: "block",
            borderRadius: 64,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
