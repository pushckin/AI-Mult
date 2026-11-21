import React from "react";
import { Composition } from "remotion";
import { Scene1, Scene1Props } from "./Scene1";
import { Scene2, Scene2Props } from "./Scene2";
import { Scene3Entry } from "./Scene3";
import { Scene4Comp } from "./Scene4";
import { Turntable } from "./three/Turntable";
import { probeWav } from "./engine/wav";
import * as S2 from "./data/scene2";
import { staticFile } from "remotion";
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
    <Composition
      id="Scene2"
      component={Scene2}
      durationInFrames={S2.DEFAULT_TIMELINE.total}
      fps={S2.FPS}
      width={S2.WIDTH}
      height={S2.HEIGHT}
      defaultProps={{ audio: {}, voices: S2.VOICE_FILES.map(() => null) } satisfies Scene2Props}
      calculateMetadata={async () => {
        const voices = await Promise.all(S2.VOICE_FILES.map((n) => probeWav(staticFile(`audio/${n}.wav`), S2.FPS)));
        const tl = S2.buildTimeline(voices.map((v) => v?.dur ?? null));
        const audio = await probeAudio(S2.buildCues(tl));
        return { durationInFrames: tl.total, props: { audio, voices } };
      }}
    />
    <Scene3Entry />
    <Scene4Comp />
    <Composition id="Turn" component={Turntable} durationInFrames={16} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
