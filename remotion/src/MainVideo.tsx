import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { SceneIntro } from "./scenes/SceneIntro";
import { ScenePhone } from "./scenes/ScenePhone";
import { SceneCTA } from "./scenes/SceneCTA";
import { PersistentBackground } from "./components/PersistentBackground";

loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"] });
loadBody("normal", { weights: ["400", "600", "700"], subsets: ["latin", "latin-ext"] });

const T = 10;

// Total: 450 frames @ 30fps = 15s
// Intro 80 + 4x Phone (75 each) + CTA 80 = 460 - 2*5*T = 410... let's tune:
// With 5 transitions of 10 overlap: durations sum - 5*10 = total
// 80 + 75 + 75 + 75 + 75 + 80 = 460, minus 5*10 = 410. Need 450 -> add 40 -> 90 each phone? Let me recompute:
// Intro 90 + 75*4 + CTA 90 = 480 - 50 = 430. Need 450 -> +20 -> CTA 110.
// Intro 90 + 75 + 75 + 75 + 75 + 110 = 500 - 50 = 450. ✓

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0A1628" }}>
      <PersistentBackground />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={75}>
          <ScenePhone
            shot="images/shot1.png"
            eyebrow="01 · Domov"
            title="Cestuj"
            highlight="spolu"
            accent="#3B82F6"
            align="right"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <ScenePhone
            shot="images/shot4.png"
            eyebrow="02 · Trasy"
            title="Ušetri"
            highlight="až 70 %"
            accent="#60A5FA"
            align="left"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <ScenePhone
            shot="images/shot7.png"
            eyebrow="03 · Live"
            title="Sleduj vodiča"
            highlight="naživo"
            accent="#3B82F6"
            align="right"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <ScenePhone
            shot="images/shot6.png"
            eyebrow="04 · Appka"
            title="Nainštaluj"
            highlight="zadarmo"
            accent="#60A5FA"
            align="left"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={110}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Audio
        src={staticFile("audio/music.mp3")}
        volume={(f) => {
          if (f < 15) return (f / 15) * 0.7;
          if (f > 420) return Math.max(0, (450 - f) / 30) * 0.7;
          return 0.7;
        }}
      />
    </AbsoluteFill>
  );
};
