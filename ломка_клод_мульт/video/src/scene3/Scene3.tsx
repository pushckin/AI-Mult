import React from "react";
import { AbsoluteFill } from "remotion";
import timing from "./timing.json";

export const FPS = 24;
export const SCENE3_FRAMES = Math.round(timing.durationSec * FPS);

/** ЗАГЛУШКА: заменяется агентом сборки */
export const Scene3: React.FC = () => <AbsoluteFill style={{ background: "#222" }} />;
