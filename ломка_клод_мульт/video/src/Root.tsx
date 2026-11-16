import { Composition } from "remotion";
import { Scene1, SCENE1_FRAMES, FPS } from "./scene1/Scene1";
import { Scene1WithAudio } from "./scene1/Scene1WithAudio";
import { Scene2, SCENE2_FRAMES } from "./scene2/Scene2";
import { Scene2WithAudio } from "./scene2/Scene2WithAudio";
import { Scene3, SCENE3_FRAMES } from "./scene3/Scene3";
import { Scene3WithAudio } from "./scene3/Scene3WithAudio";
import { Scene4, SCENE4_FRAMES } from "./scene4/Scene4";
import { Scene4WithAudio } from "./scene4/Scene4WithAudio";
import { Scene5, SCENE5_FRAMES } from "./scene5/Scene5";
import { Scene5WithAudio } from "./scene5/Scene5WithAudio";

const size = { fps: FPS, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Scene1" component={Scene1WithAudio} durationInFrames={SCENE1_FRAMES} {...size} />
      <Composition id="Scene1Silent" component={Scene1} durationInFrames={SCENE1_FRAMES} {...size} />
      <Composition id="Scene2" component={Scene2WithAudio} durationInFrames={SCENE2_FRAMES} {...size} />
      <Composition id="Scene2Silent" component={Scene2} durationInFrames={SCENE2_FRAMES} {...size} />
      <Composition id="Scene3" component={Scene3WithAudio} durationInFrames={SCENE3_FRAMES} {...size} />
      <Composition id="Scene3Silent" component={Scene3} durationInFrames={SCENE3_FRAMES} {...size} />
      <Composition id="Scene4" component={Scene4WithAudio} durationInFrames={SCENE4_FRAMES} {...size} />
      <Composition id="Scene4Silent" component={Scene4} durationInFrames={SCENE4_FRAMES} {...size} />
      <Composition id="Scene5" component={Scene5WithAudio} durationInFrames={SCENE5_FRAMES} {...size} />
      <Composition id="Scene5Silent" component={Scene5} durationInFrames={SCENE5_FRAMES} {...size} />
    </>
  );
};
