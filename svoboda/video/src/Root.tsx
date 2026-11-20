import React from "react";
import { Composition } from "remotion";
import { Scene1, Scene1Props } from "./Scene1";
import { fetchManifest } from "./engine/assets";
import { probeAudio } from "./engine/audio";
import { AUDIO_CUES, DURATION, FPS, HEIGHT, WIDTH } from "./data/scene1";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Scene1"
    component={Scene1}
    durationInFrames={DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ manifest: {}, audio: {} } satisfies Scene1Props}
    calculateMetadata={async () => {
      // манифест и наличие аудио определяются один раз; нет файлов - рендер не падает
      const [manifest, audio] = await Promise.all([fetchManifest(), probeAudio(AUDIO_CUES)]);
      return { props: { manifest, audio } };
    }}
  />
);
