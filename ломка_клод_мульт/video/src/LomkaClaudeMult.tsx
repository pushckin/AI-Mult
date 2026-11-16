import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  readonly title: string;
};

// Заглушка: проверка, что 3D-сцена рендерится. Заменить на сцены по сценарию.
const SpinningCube: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });
  const rotation = interpolate(frame, [0, 120], [0, Math.PI * 2]);

  return (
    <mesh rotation={[rotation * 0.5, rotation, 0]} scale={scale * 1.6}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#d97757" />
    </mesh>
  );
};

export const LomkaClaudeMult: React.FC<Props> = ({ title }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const titleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#141413" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 6], fov: 50 }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <SpinningCube />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 260,
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#faf9f5",
            fontFamily: "sans-serif",
            fontSize: 96,
            textAlign: "center",
            opacity: titleOpacity,
          }}
        >
          {title}
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
