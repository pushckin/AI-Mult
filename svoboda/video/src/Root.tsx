import React from "react";
import { Composition } from "remotion";
import { Scene1, Scene1Props } from "./Scene1";
import { Turntable } from "./three/Turntable";
import { probeAudio } from "./engine/audio";
import { AUDIO_CUES, DURATION, FPS, HEIGHT, WIDTH } from "./data/scene1";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Scene1"
      component={Scene1}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ audio: {} } satisfies Scene1Props}
      calculateMetadata={async () => ({ props: { audio: await probeAudio(AUDIO_CUES) } })}
    />
    <Composition id="Turn" component={Turntable} durationInFrames={16} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
