import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { AdVideo } from "./AdVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ad10"
        component={AdVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="main"
        component={MainVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
