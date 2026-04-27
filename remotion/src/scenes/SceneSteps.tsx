import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

const STEPS = [
  { n: "1", t: "Zaregistruj sa", d: "Vyber vodič alebo pasažier" },
  { n: "2", t: "Vyhľadaj jazdu", d: "Alebo ponúkni svoju trasu" },
  { n: "3", t: "Cestujte spolu", d: "Live tracking, chat, hodnotenia" },
];

export const SceneSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerY = spring({ frame, fps, config: { damping: 20 } });
  const headerOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 70, justifyContent: "center" }}>
      <div
        style={{
          opacity: headerOp,
          transform: `translateY(${interpolate(headerY, [0, 1], [40, 0])}px)`,
          marginBottom: 60,
        }}
      >
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 32,
            color: "#60A5FA",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Ako to funguje
        </div>
        <div
          style={{
            fontFamily: "Sora",
            fontWeight: 800,
            fontSize: 100,
            color: "white",
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          3 kroky
          <br />
          k jazde
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {STEPS.map((s, i) => {
          const delay = 15 + i * 12;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 110 } });
          const op = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(sp, [0, 1], [-80, 0]);
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${x}px)`,
                display: "flex",
                alignItems: "center",
                gap: 32,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 32,
                padding: "28px 36px",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 28,
                  background: "linear-gradient(135deg, #3B82F6, #0EA5E9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Sora",
                  fontWeight: 800,
                  fontSize: 64,
                  color: "white",
                  boxShadow: "0 20px 40px rgba(59,130,246,0.4)",
                  flexShrink: 0,
                }}
              >
                {s.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Sora",
                    fontWeight: 700,
                    fontSize: 52,
                    color: "white",
                    lineHeight: 1.1,
                  }}
                >
                  {s.t}
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: 30,
                    color: "rgba(255,255,255,0.7)",
                    marginTop: 6,
                  }}
                >
                  {s.d}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
