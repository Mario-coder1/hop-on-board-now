import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneFeature } from "./scenes/SceneFeature";
import { SceneSteps } from "./scenes/SceneSteps";
import { SceneCTA } from "./scenes/SceneCTA";
import { PersistentBackground } from "./components/PersistentBackground";

loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"] });
loadBody("normal", { weights: ["400", "600", "700"], subsets: ["latin", "latin-ext"] });

const T = 15; // transition overlap frames

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0A1628" }}>
      <PersistentBackground />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <SceneFeature
            title="Cestuj spolu"
            subtitle="Ušetri až 70% nákladov"
            mock="images/mock1.jpg"
            accent="#3B82F6"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <SceneFeature
            title="Live tracking"
            subtitle="Sleduj vodiča v reálnom čase"
            mock="images/mock2.jpg"
            accent="#60A5FA"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <SceneFeature
            title="100% bezpečne"
            subtitle="Overení vodiči a hodnotenia"
            mock="images/mock3.jpg"
            accent="#2563EB"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={75}>
          <SceneSteps />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Audio src={staticFile("audio/music.mp3")} volume={(f) => {
        // fade in 0-15, fade out last 30 frames
        if (f < 15) return f / 15 * 0.7;
        if (f > 420) return Math.max(0, (450 - f) / 30) * 0.7;
        return 0.7;
      }} />
    </AbsoluteFill>
  );
};
