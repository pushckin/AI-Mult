import React from "react";
import { Composition } from "remotion";
import { ClaudeServersComposition } from "./ClaudeServersComposition";
import { FPS, TOTAL_FRAMES } from "./data/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ClaudeServersShorts"
        component={ClaudeServersComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ censored: false }}
      />
      <Composition
        id="ClaudeServersShortsCensored"
        component={ClaudeServersComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ censored: true }}
      />
    </>
  );
};
