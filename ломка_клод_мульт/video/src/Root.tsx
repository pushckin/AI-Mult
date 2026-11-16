import { Composition } from "remotion";
import { LomkaClaudeMult } from "./LomkaClaudeMult";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LomkaClaudeMult"
        component={LomkaClaudeMult}
        durationInFrames={120}
        fps={24}
        width={1080}
        height={1920}
        defaultProps={{ title: "Ломка Клод мульт" }}
      />
    </>
  );
};
