import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { AdShot } from "./scenes/AdShot";
import { AdOutro } from "./scenes/AdOutro";
import { AdBackground } from "./components/AdBackground";

loadDisplay("normal", { weights: ["600", "700", "800"], subsets: ["latin", "latin-ext"] });

const T = 8;

// 60 + 58 + 68 + 54 + 92 = 332 - 4*8 = 300 frames = 10s @ 30fps
export const AdVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07101F" }}>
      <AdBackground />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={60}>
          <AdShot
            src="real/1-search.png"
            step="01"
            line1="Kam"
            line2="ideš?"
            note="Zadaj odkiaľ a kam — nájdeš jazdu v pár sekundách."
            align="left"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={58}>
          <AdShot
            src="real/2-results.png"
            step="02"
            line1="Od"
            line2="5 €"
            note="Reálni vodiči, hodnotenia a cena vopred."
            align="right"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={68}>
          <AdShot
            src="real/3-live.png"
            step="03"
            line1="Sleduj"
            line2="naživo"
            note="Vidíš auto na mape aj čas príchodu."
            align="left"
            live
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={54}>
          <AdShot
            src="real/4-done.png"
            step="04"
            line1="Dojdeš."
            line2="Ušetríš."
            note="Platba cez Stripe, hodnotenie po jazde."
            align="right"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={92}>
          <AdOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
