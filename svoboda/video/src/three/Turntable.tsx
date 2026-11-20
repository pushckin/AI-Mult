// Проверка 3D: Грег + суперкар + байк + пришелец под разными углами. Кадр N -> угол.
import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FOV, Lights } from "./toon";
import { Person, mixP } from "./Person";
import { SuperCar, Bike, Rocket } from "./Vehicles";
import { alienPose } from "./anim";

export const Turntable: React.FC = () => {
  const f = useCurrentFrame();
  const yaw = [0, 45, 90, 135, 180, 225, 270, 315][f % 8];
  const bikeMode = f >= 8;
  return (
    <AbsoluteFill style={{ backgroundColor: "#4d5a86" }}>
      <ThreeCanvas width={1920} height={1080} flat shadows camera={{ fov: FOV, position: [0, 3.2, 11], near: 0.5, far: 400 }} onCreated={(s) => s.camera.lookAt(0, 1.0, 0)}>
        <Lights target={[0, 1, 0]} />
        {!bikeMode && (
          <>
            <Person pose={mixP({ x: -3.2, y: 0.6, ry: yaw, scale: 1.4, eyeR: 2, mouth: 2, alx: 20, arx: 30, are: 80 })} />
            <group position={[1.4, 0, 0]} rotation={[0, (yaw * Math.PI) / 180, 0]} scale={0.93}>
              <SuperCar driver={alienPose(300)} />
            </group>
          </>
        )}
        {bikeMode && (
          <group position={[0, 0.2, 0]} rotation={[0, (yaw * Math.PI) / 180, 0]} scale={1.5}>
            <Bike flame={1} />
          </group>
        )}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
