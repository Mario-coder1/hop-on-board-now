import React from "react";
import { Img, staticFile } from "remotion";

export const PhoneFrame: React.FC<{ src: string; width?: number }> = ({ src, width = 620 }) => {
  const height = width * 2.16;
  const radius = width * 0.13;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(160deg,#1a2540 0%,#0a1224 100%)",
        padding: width * 0.025,
        boxShadow:
          "0 60px 120px rgba(0,0,0,0.55), 0 20px 40px rgba(59,130,246,0.35), inset 0 0 0 2px rgba(255,255,255,0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: radius * 0.88,
          overflow: "hidden",
          position: "relative",
          background: "#fff",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.38,
            height: 28,
            borderRadius: 999,
            background: "#0a1224",
            zIndex: 5,
          }}
        />
        {/* Glare */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};
