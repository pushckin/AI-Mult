import React from "react";
import { Composition } from "remotion";
import { Scene } from "./Scene";
import {
  FullCartoonShortsComposition,
  Scene1ShortsComposition,
  Scene2ShortsComposition,
  Scene3ShortsComposition,
  Scene4ShortsComposition,
} from "./Scene1ShortsComposition";
import {
  DURATION_IN_FRAMES,
  FPS,
  HEIGHT,
  S2_DURATION_IN_FRAMES,
  S3_DURATION_IN_FRAMES,
  S4_DURATION_IN_FRAMES,
  TOTAL_DURATION_IN_FRAMES,
  WIDTH,
} from "./data/scene1Timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Scene1Shorts"
        component={Scene1ShortsComposition}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene2Shorts"
        component={Scene2ShortsComposition}
        durationInFrames={S2_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene3Shorts"
        component={Scene3ShortsComposition}
        durationInFrames={S3_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene4Shorts"
        component={Scene4ShortsComposition}
        durationInFrames={S4_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="FullCartoonShorts"
        component={FullCartoonShortsComposition}
        durationInFrames={TOTAL_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene"
        component={Scene}
        durationInFrames={30}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
