import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const geometry = useMemo(() => {
    return new RoundedBoxGeometry(2.4, 2.4, 2.4, 6, 0.35);
  }, []);

  const rotationX = (frame / fps) * 0.8 + 0.5;
  const rotationY = (frame / fps) * 1.2 + 0.6;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 6], fov: 45 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} />
        <pointLight position={[-5, -4, 3]} intensity={0.6} color="#38bdf8" />
        <mesh geometry={geometry} rotation={[rotationX, rotationY, 0]}>
          <meshStandardMaterial
            color="#6366f1"
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
