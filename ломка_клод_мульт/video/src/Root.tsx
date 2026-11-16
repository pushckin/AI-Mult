import { Composition } from "remotion";
import { Scene1, SCENE1_FRAMES, FPS } from "./scene1/Scene1";
import { Scene1WithAudio } from "./scene1/Scene1WithAudio";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Scene1"
        component={Scene1WithAudio}
        durationInFrames={SCENE1_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Scene1Silent"
        component={Scene1}
        durationInFrames={SCENE1_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
