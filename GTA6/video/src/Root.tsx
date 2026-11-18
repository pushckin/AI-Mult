import React from "react";
import { Composition } from "remotion";
import { PartComposition } from "./PartComposition";
import { TIMELINE, FPS } from "./data/timeline";

export const RemotionRoot: React.FC = () => (
  <>
    {(["p1", "p2"] as const).map((pid) => (
      <React.Fragment key={pid}>
        <Composition id={pid === "p1" ? "Part1" : "Part2"} component={PartComposition} durationInFrames={TIMELINE[pid].totalFrames} fps={FPS} width={1080} height={1920} defaultProps={{ pid, censored: false }} />
        <Composition id={pid === "p1" ? "Part1Censored" : "Part2Censored"} component={PartComposition} durationInFrames={TIMELINE[pid].totalFrames} fps={FPS} width={1080} height={1920} defaultProps={{ pid, censored: true }} />
      </React.Fragment>
    ))}
  </>
);
