import React from "react";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CUES } from "./data/timeline";
import { CoderAndFlyover3D } from "./scenes3d/CoderAndFlyover3D";
import { IndiaOffice3D } from "./scenes3d/IndiaOffice3D";
import { ShortsOverlays } from "./components2d/ShortsOverlays";

const T_INDIA_1_START = Number(((CUES.b_fly.end + CUES.c_boss1.start) / 2).toFixed(2)); // 17.75
const T_CODER_2_START = Number((CUES.c_boss2.end + 0.2).toFixed(2)); // 41.78
const T_INDIA_2_START = Number((CUES.d_coder3.end + 0.3).toFixed(2)); // 48.54
const T_CODER_3_START = Number((CUES.f_claude2.start - 0.4).toFixed(2)); // 52.40
const T_INDIA_3_START = Number(((CUES.f_coder4.end + CUES.g_boss3.start) / 2).toFixed(2)); // 60.89

export const ClaudeServersComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;

  const isIndiaScene =
    (t >= T_INDIA_1_START && t < T_CODER_2_START) ||
    (t >= T_INDIA_2_START && t < T_CODER_3_START) ||
    t >= T_INDIA_3_START;

  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      <Audio src={staticFile("audio/master.wav")} />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 2, 5], fov: 46, near: 0.1, far: 200 }}
      >
        {isIndiaScene ? <IndiaOffice3D t={t} /> : <CoderAndFlyover3D t={t} />}
      </ThreeCanvas>
      <ShortsOverlays />
    </AbsoluteFill>
  );
};
