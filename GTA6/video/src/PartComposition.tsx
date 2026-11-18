import React from "react";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { PartId } from "./kit/anim";
import { Subtitles } from "./kit/Overlays";
import { P1_SCENES } from "./scenes/p1";
import { P2_SCENES } from "./scenes/p2";

export type PartProps = { pid: PartId; censored: boolean; noAudio?: boolean };

export const PartComposition: React.FC<PartProps> = ({ pid, censored, noAudio }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const scenes = pid === "p1" ? P1_SCENES : P2_SCENES;
  const sc = scenes.find((s) => t >= s.from && t < s.to) ?? scenes[scenes.length - 1];
  return (
    <AbsoluteFill style={{ backgroundColor: sc.bg ?? "#000" }}>
      {!noAudio && <Audio src={staticFile(`audio/${pid}${censored ? "_censored" : ""}.wav`)} />}
      <ThreeCanvas
        key={sc.id}
        width={width}
        height={height}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        camera={{ position: [0, 1.4, 6], fov: 40, near: 0.05, far: 500 }}
      >
        <color attach="background" args={[sc.bg ?? "#000000"]} />
        {sc.render3d(t)}
      </ThreeCanvas>
      {sc.overlay?.(t, censored)}
      <Subtitles pid={pid} t={t} censored={censored} hide={sc.hideSubs?.(t)} />
    </AbsoluteFill>
  );
};
