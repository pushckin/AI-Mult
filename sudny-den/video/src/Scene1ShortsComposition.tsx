import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SCENES, S2_START, S3_START, S4_START } from "./data/scene1Timeline";
import { Scene1Shorts3D } from "./scenes3d/Scene1Shorts3D";
import { Scene2Shorts3D } from "./scenes3d/Scene2Shorts3D";
import { Scene3Shorts3D } from "./scenes3d/Scene3Shorts3D";
import { Scene4Shorts3D } from "./scenes3d/Scene4Shorts3D";
import { ShortsOverlays } from "./components2d/ShortsOverlays";

export const Scene1ShortsComposition: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Audio src={staticFile("audio/s1_master.wav")} />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 5.3, 18.0], fov: 46, near: 0.1, far: 120 }}
      >
        <Scene1Shorts3D />
      </ThreeCanvas>
      <ShortsOverlays timeOffsetSec={0} />
    </AbsoluteFill>
  );
};

export const Scene2ShortsComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = S2_START + frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#140b09" }}>
      <Audio src={staticFile("audio/s2_master.wav")} />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 3.0, 9.5], fov: 46, near: 0.1, far: 120 }}
      >
        <Scene2Shorts3D t={t} />
      </ThreeCanvas>
      <ShortsOverlays timeOffsetSec={S2_START} />
    </AbsoluteFill>
  );
};

export const Scene3ShortsComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = S3_START + frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#130a0c" }}>
      <Audio src={staticFile("audio/s3_master.wav")} />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 2.8, 9.2], fov: 46, near: 0.1, far: 120 }}
      >
        <Scene3Shorts3D t={t} />
      </ThreeCanvas>
      <ShortsOverlays timeOffsetSec={S3_START} />
    </AbsoluteFill>
  );
};

export const Scene4ShortsComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = S4_START + frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#140905" }}>
      <Audio src={staticFile("audio/s4_master.wav")} />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 3.8, 12.0], fov: 48, near: 0.1, far: 150 }}
      >
        <Scene4Shorts3D t={t} />
      </ThreeCanvas>
      <ShortsOverlays timeOffsetSec={S4_START} />
    </AbsoluteFill>
  );
};

export const FullCartoonShortsComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      <Audio src={staticFile("audio/master.wav")} />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 4.0, 14.0], fov: 46, near: 0.1, far: 150 }}
      >
        {t < SCENES.s2.start ? (
          <Scene1Shorts3D />
        ) : t < SCENES.s3.start ? (
          <Scene2Shorts3D t={t} />
        ) : t < SCENES.s4.start ? (
          <Scene3Shorts3D t={t} />
        ) : (
          <Scene4Shorts3D t={t} />
        )}
      </ThreeCanvas>
      <ShortsOverlays timeOffsetSec={0} />
    </AbsoluteFill>
  );
};
