import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type EyeMode = "normal" | "red" | "wide" | "dead";
export type MoodMode = "neutral" | "scream" | "smile" | "frown" | "buckteeth";
export type HairMode = "messy" | "bald_sides" | "helmet" | "fire" | "headphones" | "surg_cap" | "none";
export type PoseMode =
  | "idle"
  | "panic"
  | "run"
  | "sprint"
  | "dragged"
  | "wave"
  | "look_down"
  | "sit_chill"
  | "sit_play"
  | "lie_flat"
  | "fight";

export interface Character3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  yaw?: number;
  shirtColor: string;
  pantsColor: string;
  tieColor?: string;
  hair?: HairMode;
  hairColor?: string;
  hatColor?: string;
  hatLift?: number;
  mustacheColor?: string;
  eyes?: EyeMode;
  brow?: number; // -1..1
  mood?: MoodMode;
  mouthOpen?: number; // 0..1
  tears?: number; // 0..1
  headTurn?: number;
  headTilt?: number;
  lookX?: number;
  lookY?: number;
  pose?: PoseMode;
  t?: number;
  seed?: number;
  holdPhone?: string | null;
  surgMask?: boolean;
  holdGamepad?: boolean;
  holdScalpel?: boolean;
  holdHeart?: boolean;
  squash?: number;
}

const SHARED_GEO = {
  sphere: new THREE.SphereGeometry(1, 20, 16),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 12),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 8, 12),
};

export const Phone3D: React.FC<{ label?: string; position?: [number, number, number]; rotation?: [number, number, number] }> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.16, 0.27, 0.036]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Front glowing GTA VI screen */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.135, 0.225]} />
        <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={1.6} />
      </mesh>
      {/* Back glowing badge + triple camera bump so phone reads even from behind */}
      <mesh position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.11, 0.14]} />
        <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.035, 0.08, -0.022]}>
        <boxGeometry args={[0.055, 0.055, 0.015]} />
        <meshStandardMaterial color="#09090b" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
};

export const Gamepad3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh castShadow>
      <boxGeometry args={[0.32, 0.14, 0.08]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.35} />
    </mesh>
    <mesh position={[-0.14, -0.08, 0.02]} rotation={[0.25, 0, 0.3]} castShadow>
      <boxGeometry args={[0.08, 0.16, 0.07]} />
      <meshStandardMaterial color="#1e293b" roughness={0.5} />
    </mesh>
    <mesh position={[0.14, -0.08, 0.02]} rotation={[0.25, 0, -0.3]} castShadow>
      <boxGeometry args={[0.08, 0.16, 0.07]} />
      <meshStandardMaterial color="#1e293b" roughness={0.5} />
    </mesh>
    <mesh position={[-0.07, 0.02, 0.048]} geometry={SHARED_GEO.cyl} rotation={[Math.PI / 2, 0, 0]} scale={[0.028, 0.03, 0.028]}>
      <meshStandardMaterial color="#0f172a" roughness={0.4} />
    </mesh>
    <mesh position={[0.07, -0.01, 0.048]} geometry={SHARED_GEO.cyl} rotation={[Math.PI / 2, 0, 0]} scale={[0.028, 0.03, 0.028]}>
      <meshStandardMaterial color="#0f172a" roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.045, 0.042]}>
      <boxGeometry args={[0.12, 0.022, 0.015]} />
      <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
    </mesh>
  </group>
);

export const Scalpel3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0, 0.08]} castShadow>
      <boxGeometry args={[0.025, 0.022, 0.24]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
    </mesh>
    <mesh position={[0, 0.008, 0.23]}>
      <boxGeometry args={[0.01, 0.032, 0.09]} />
      <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.12} />
    </mesh>
  </group>
);

export const Heart3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  t?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, t = 0 }) => {
  const pulse = 1 + Math.pow(Math.max(0, Math.sin(t * 7)), 4) * 0.14;
  return (
    <group position={position} rotation={rotation} scale={scale * pulse}>
      <mesh position={[-0.045, 0.04, 0]} geometry={SHARED_GEO.sphere} scale={[0.09, 0.105, 0.085]} castShadow>
        <meshStandardMaterial color="#dc2626" emissive="#7f1d1d" emissiveIntensity={0.4} roughness={0.28} />
      </mesh>
      <mesh position={[0.045, 0.04, 0]} geometry={SHARED_GEO.sphere} scale={[0.09, 0.105, 0.085]} castShadow>
        <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.4} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.055, 0]} rotation={[Math.PI, 0, 0]} geometry={SHARED_GEO.cone} scale={[0.105, 0.15, 0.085]} castShadow>
        <meshStandardMaterial color="#b91c1c" emissive="#7f1d1d" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      <mesh position={[-0.02, 0.13, 0]} geometry={SHARED_GEO.cyl} scale={[0.032, 0.08, 0.032]}>
        <meshStandardMaterial color="#991b1b" roughness={0.4} />
      </mesh>
      <mesh position={[0.04, 0.12, -0.01]} rotation={[0, 0, -0.35]} geometry={SHARED_GEO.cyl} scale={[0.025, 0.07, 0.025]}>
        <meshStandardMaterial color="#2563eb" roughness={0.45} />
      </mesh>
    </group>
  );
};

export const TeaMug3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.11, 0]} geometry={SHARED_GEO.cyl} scale={[0.095, 0.22, 0.095]} castShadow>
      <meshStandardMaterial color="#f8fafc" roughness={0.35} />
    </mesh>
    <mesh position={[0, 0.215, 0]} geometry={SHARED_GEO.cyl} scale={[0.078, 0.015, 0.078]}>
      <meshStandardMaterial color="#92400e" roughness={0.25} />
    </mesh>
    <mesh position={[0.105, 0.11, 0]}>
      <boxGeometry args={[0.06, 0.12, 0.03]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
    </mesh>
  </group>
);

export const Character3D: React.FC<Character3DProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  yaw = 0,
  shirtColor,
  pantsColor,
  tieColor,
  hair = "messy",
  hairColor = "#2d2118",
  hatColor = "#55683d",
  hatLift = 0,
  mustacheColor,
  eyes = "normal",
  brow = 0,
  mood = "neutral",
  mouthOpen = 0,
  tears = 0,
  headTurn = 0,
  headTilt = 0,
  lookX = 0,
  lookY = 0,
  pose = "idle",
  t = 0,
  seed = 1,
  holdPhone = null,
  surgMask = false,
  holdGamepad = false,
  holdScalpel = false,
  holdHeart = false,
  squash = 0,
}) => {
  const torsoGeo = useMemo(() => new RoundedBoxGeometry(0.62, 0.68, 0.40, 4, 0.12), []);
  const bootGeo = useMemo(() => new RoundedBoxGeometry(0.20, 0.14, 0.34, 3, 0.05), []);
  const visorGeo = useMemo(() => new RoundedBoxGeometry(0.56, 0.06, 0.28, 2, 0.02), []);

  // Deterministic gait & limb angles based on t and pose
  let bounceY = 0;
  let torsoLeanX = 0;
  let torsoTwistY = 0;

  let lHipX = 0;
  let rHipX = 0;
  let lKneeX = 0.05;
  let rKneeX = 0.05;

  let lShX = -0.15;
  let rShX = -0.15;
  let lShZ = -0.22;
  let rShZ = 0.22;
  let lElbX = -0.25;
  let rElbX = -0.25;

  const phaseOffset = seed * 1.37;

  if (pose === "run" || pose === "sprint") {
    const speed = pose === "sprint" ? 19 : 14;
    const ph = t * speed + phaseOffset;
    const sw = Math.sin(ph);
    const amp = pose === "sprint" ? 1.08 : 0.85;
    bounceY = Math.abs(Math.sin(ph)) * (pose === "sprint" ? 0.15 : 0.1);
    torsoLeanX = pose === "sprint" ? 0.26 : 0.18;
    torsoTwistY = sw * 0.18;

    lHipX = sw * amp;
    rHipX = -sw * amp;
    lKneeX = Math.max(0.08, -Math.cos(ph) * 0.95 + 0.35);
    rKneeX = Math.max(0.08, Math.cos(ph) * 0.95 + 0.35);

    lShX = -sw * amp * 0.85;
    rShX = sw * amp * 0.85;
    lShZ = -0.22;
    rShZ = 0.22;
    lElbX = -1.1;
    rElbX = -1.1;
    if (holdPhone) {
      lShX = -1.05;
      lElbX = -0.9;
    }
  } else if (pose === "panic") {
    const w = Math.sin(t * 16 + phaseOffset);
    bounceY = Math.abs(w) * 0.06;
    lShX = -2.3 + w * 0.45;
    rShX = -2.3 - w * 0.45;
    lShZ = -0.55;
    rShZ = 0.55;
    lElbX = -0.4;
    rElbX = -0.4;
  } else if (pose === "wave") {
    const w = Math.sin(t * 15 + phaseOffset);
    lShX = holdPhone ? -1.15 : -0.2;
    lElbX = holdPhone ? -0.95 : -0.3;
    rShX = -2.1 + w * 0.5;
    rShZ = 0.55;
    rElbX = -0.5;
  } else if (pose === "look_down") {
    torsoLeanX = 0.16;
    lShX = -0.4;
    rShX = -0.4;
    lElbX = -0.6;
    rElbX = -0.6;
  } else if (pose === "dragged") {
    const kick = Math.sin(t * 18 + phaseOffset);
    lHipX = kick * 0.55;
    rHipX = -kick * 0.55;
    lKneeX = 0.5 + kick * 0.3;
    rKneeX = 0.5 - kick * 0.3;
    lShX = -2.85;
    rShX = -2.85;
    lShZ = 0.18;
    rShZ = -0.18;
    lElbX = -0.15;
    rElbX = -0.15;
  } else if (pose === "sit_chill" || pose === "sit_play") {
    const isPlay = pose === "sit_play";
    const m = Math.sin(t * (isPlay ? 22 : 5) + phaseOffset);
    bounceY = -0.34;
    torsoLeanX = isPlay ? 0.16 + m * 0.04 : -0.18;
    lHipX = isPlay ? -1.42 : -1.35;
    rHipX = isPlay ? -1.42 : -1.35;
    lKneeX = isPlay ? 1.38 : 1.25;
    rKneeX = isPlay ? 1.38 : 1.25;
    lShX = -0.95 + (isPlay ? m * 0.1 : 0);
    rShX = -0.95 - (isPlay ? m * 0.1 : 0);
    lShZ = 0.28;
    rShZ = -0.28;
    lElbX = -0.85;
    rElbX = -0.85;
  } else if (pose === "lie_flat") {
    bounceY = 0;
    lHipX = 0.04;
    rHipX = -0.04;
    lShX = -0.08;
    rShX = -0.08;
    lShZ = -0.32;
    rShZ = 0.32;
  } else if (pose === "fight") {
    const p = Math.sin(t * 14 + phaseOffset);
    bounceY = Math.abs(p) * 0.1;
    torsoLeanX = 0.22;
    torsoTwistY = p * 0.45;
    lHipX = p * 0.45;
    rHipX = -p * 0.45;
    lKneeX = 0.35;
    rKneeX = 0.35;
    lShX = -1.45 + p * 0.85;
    rShX = -1.45 - p * 0.85;
    lElbX = -0.85 - p * 0.35;
    rElbX = -0.85 + p * 0.35;
  } else {
    // idle subtle breathing
    const br = Math.sin(t * 3.5 + phaseOffset);
    bounceY = br * 0.025;
    lShZ = -0.22 - br * 0.04;
    rShZ = 0.22 + br * 0.04;
    if (holdPhone) {
      lShX = -1.0;
      lElbX = -0.85;
    }
    if (holdHeart) {
      lShX = -1.18 + br * 0.05;
      lElbX = -0.78;
    }
    if (holdScalpel) {
      rShX = -1.05;
      rElbX = -0.82;
    }
    if (holdGamepad) {
      lShX = -0.95;
      rShX = -0.95;
      lShZ = 0.28;
      rShZ = -0.28;
      lElbX = -0.85;
      rElbX = -0.85;
    }
  }

  const sqY = 1 + squash;
  const sqXZ = 1 / Math.sqrt(Math.max(0.35, sqY));

  const eyeScale = eyes === "wide" ? 1.24 : 1.0;
  const effectiveHeadTilt = pose === "dragged" ? -1.15 : pose === "look_down" ? 0.42 : headTilt;
  const innerPos: [number, number, number] =
    pose === "dragged"
      ? [0, 0.34, -1.85]
      : pose === "lie_flat"
        ? [0, 0.24, 0.85]
        : [0, bounceY, 0];
  const innerRot: [number, number, number] =
    pose === "dragged"
      ? [Math.PI / 2, 0, 0]
      : pose === "lie_flat"
        ? [-Math.PI / 2, 0, 0]
        : [0, 0, 0];

  return (
    <group position={position} rotation={rotation} scale={[scale * sqXZ, scale * sqY, scale * sqXZ]}>
      <group rotation={[0, yaw, 0]}>
        <group position={innerPos} rotation={innerRot}>
          {/* Left & Right Articulated Legs */}
          {[-1, 1].map((side) => {
            const isLeft = side === -1;
            const hipX = isLeft ? lHipX : rHipX;
            const kneeX = isLeft ? lKneeX : rKneeX;
            return (
              <group key={side} position={[side * 0.165, 0.78, 0]} rotation={[hipX, 0, 0]}>
                {/* Thigh */}
                <mesh position={[0, -0.19, 0]} geometry={SHARED_GEO.cyl} scale={[0.095, 0.38, 0.095]} castShadow>
                  <meshStandardMaterial color={pantsColor} roughness={0.65} />
                </mesh>
                {/* Knee joint */}
                <mesh position={[0, -0.36, 0]} geometry={SHARED_GEO.sphere} scale={0.092} castShadow>
                  <meshStandardMaterial color={pantsColor} roughness={0.65} />
                </mesh>
                {/* Shin + Boot */}
                <group position={[0, -0.36, 0]} rotation={[kneeX, 0, 0]}>
                  <mesh position={[0, -0.17, 0]} geometry={SHARED_GEO.cyl} scale={[0.088, 0.34, 0.088]} castShadow>
                    <meshStandardMaterial color={pantsColor} roughness={0.65} />
                  </mesh>
                  <mesh position={[0, -0.35, 0.06]} geometry={bootGeo} castShadow>
                    <meshStandardMaterial color="#1f242a" roughness={0.5} />
                  </mesh>
                </group>
              </group>
            );
          })}

          {/* Upper Body (Pelvis Pivot) */}
          <group position={[0, 0.78, 0]} rotation={[torsoLeanX, torsoTwistY, 0]}>
            {/* Torso */}
            <mesh position={[0, 0.34, 0]} geometry={torsoGeo} castShadow receiveShadow>
              <meshStandardMaterial color={shirtColor} roughness={0.55} />
            </mesh>
            {/* Belt + Gold Buckle */}
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.64, 0.08, 0.42]} />
              <meshStandardMaterial color="#1c1917" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.04, 0.215]}>
              <boxGeometry args={[0.14, 0.09, 0.03]} />
              <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.25} />
            </mesh>

            {/* Optional Tie */}
            {tieColor && (
              <group position={[0, 0.44, 0.205]}>
                <mesh position={[0, 0.14, 0]}>
                  <boxGeometry args={[0.11, 0.1, 0.04]} />
                  <meshStandardMaterial color={tieColor} roughness={0.4} />
                </mesh>
                <mesh position={[0, -0.09, 0]} geometry={SHARED_GEO.cone} rotation={[0, 0, Math.PI]} scale={[0.065, 0.38, 0.03]}>
                  <meshStandardMaterial color={tieColor} roughness={0.4} />
                </mesh>
              </group>
            )}

            {/* Left & Right 2-Segment Arms */}
            {[-1, 1].map((side) => {
              const isLeft = side === -1;
              const shX = isLeft ? lShX : rShX;
              const shZ = isLeft ? lShZ : rShZ;
              const elbX = isLeft ? lElbX : rElbX;
              return (
                <group key={side} position={[side * 0.36, 0.56, 0]} rotation={[shX, 0, shZ]}>
                  {/* Shoulder Ball */}
                  <mesh geometry={SHARED_GEO.sphere} scale={0.095} castShadow>
                    <meshStandardMaterial color={shirtColor} roughness={0.55} />
                  </mesh>
                  {/* Upper Arm */}
                  <mesh position={[0, -0.16, 0]} geometry={SHARED_GEO.cyl} scale={[0.082, 0.32, 0.082]} castShadow>
                    <meshStandardMaterial color={shirtColor} roughness={0.55} />
                  </mesh>
                  {/* Elbow & Forearm */}
                  <group position={[0, -0.31, 0]} rotation={[elbX, 0, 0]}>
                    <mesh geometry={SHARED_GEO.sphere} scale={0.078}>
                      <meshStandardMaterial color={shirtColor} roughness={0.55} />
                    </mesh>
                    <mesh position={[0, -0.14, 0]} geometry={SHARED_GEO.cyl} scale={[0.074, 0.28, 0.074]} castShadow>
                      <meshStandardMaterial color={shirtColor} roughness={0.55} />
                    </mesh>
                    {/* Hand */}
                    <mesh position={[0, -0.30, 0]} geometry={SHARED_GEO.sphere} scale={0.095} castShadow>
                      <meshStandardMaterial color="#f5c99b" roughness={0.5} />
                    </mesh>
                    {/* Phone / Gamepad / Heart / Scalpel Props in Hands */}
                    {isLeft && holdPhone && (
                      <Phone3D position={[0, -0.34, 0.09]} rotation={[-0.35, 0.72, -0.15]} label={holdPhone} />
                    )}
                    {isLeft && holdGamepad && (
                      <Gamepad3D position={[0.14, -0.32, 0.08]} rotation={[-0.45, 0, 0]} scale={0.95} />
                    )}
                    {isLeft && holdHeart && (
                      <Heart3D position={[0.02, -0.36, 0.08]} scale={1.15} t={t} />
                    )}
                    {!isLeft && holdScalpel && (
                      <Scalpel3D position={[0, -0.30, 0.05]} rotation={[-0.15, 0, 0]} />
                    )}
                  </group>
                </group>
              );
            })}

            {/* Head Group */}
            <group position={[0, 0.72, 0]} rotation={[effectiveHeadTilt, headTurn, 0]}>
              {/* Neck */}
              <mesh position={[0, -0.02, 0]} geometry={SHARED_GEO.cyl} scale={[0.14, 0.14, 0.14]}>
                <meshStandardMaterial color="#e6b687" roughness={0.55} />
              </mesh>
              {/* Main Stylized Head Sphere */}
              <mesh position={[0, 0.28, 0]} geometry={SHARED_GEO.sphere} scale={[0.38, 0.34, 0.35]} castShadow receiveShadow>
                <meshStandardMaterial color="#f5c99b" roughness={0.48} />
              </mesh>
              {/* Ears */}
              <mesh position={[-0.38, 0.26, 0]} geometry={SHARED_GEO.sphere} scale={[0.06, 0.09, 0.06]}>
                <meshStandardMaterial color="#eab585" roughness={0.5} />
              </mesh>
              <mesh position={[0.38, 0.26, 0]} geometry={SHARED_GEO.sphere} scale={[0.06, 0.09, 0.06]}>
                <meshStandardMaterial color="#eab585" roughness={0.5} />
              </mesh>
              {/* Nose */}
              <mesh position={[0, 0.26, 0.35]} geometry={SHARED_GEO.sphere} scale={[0.055, 0.05, 0.07]}>
                <meshStandardMaterial color="#e8aa76" roughness={0.48} />
              </mesh>
              {/* Rosy Cheeks */}
              <mesh position={[-0.22, 0.21, 0.29]} geometry={SHARED_GEO.sphere} scale={[0.065, 0.04, 0.03]}>
                <meshStandardMaterial color="#ef8c7e" roughness={0.6} />
              </mesh>
              <mesh position={[0.22, 0.21, 0.29]} geometry={SHARED_GEO.sphere} scale={[0.065, 0.04, 0.03]}>
                <meshStandardMaterial color="#ef8c7e" roughness={0.6} />
              </mesh>

              {/* Eyes */}
              {[-1, 1].map((side) => (
                <group key={side} position={[side * 0.125, 0.34, 0.29]} scale={eyeScale}>
                  <mesh geometry={SHARED_GEO.sphere} scale={[0.095, 0.095, 0.065]}>
                    <meshStandardMaterial
                      color={eyes === "red" ? "#fecaca" : "#ffffff"}
                      emissive={eyes === "red" ? "#ef4444" : "#000000"}
                      emissiveIntensity={eyes === "red" ? 0.25 : 0}
                      roughness={0.2}
                    />
                  </mesh>
                  {eyes !== "dead" ? (
                    <group position={[lookX * 0.035, lookY * 0.035, 0.058]}>
                      {eyes === "red" && (
                        <mesh geometry={SHARED_GEO.sphere} scale={[0.05, 0.05, 0.025]}>
                          <meshBasicMaterial color="#dc2626" />
                        </mesh>
                      )}
                      <mesh position={[0, 0, 0.008]} geometry={SHARED_GEO.sphere} scale={[0.036, 0.036, 0.022]}>
                        <meshBasicMaterial color="#09090b" />
                      </mesh>
                    </group>
                  ) : (
                    <group position={[0, 0, 0.07]}>
                      <mesh rotation={[0, 0, 0.78]}>
                        <boxGeometry args={[0.11, 0.024, 0.02]} />
                        <meshBasicMaterial color="#111111" />
                      </mesh>
                      <mesh rotation={[0, 0, -0.78]}>
                        <boxGeometry args={[0.11, 0.024, 0.02]} />
                        <meshBasicMaterial color="#111111" />
                      </mesh>
                    </group>
                  )}
                  {/* Eyebrow */}
                  <mesh position={[0, 0.115, 0.02]} rotation={[0, 0, side * -brow * 0.42]}>
                    <boxGeometry args={[0.14, 0.032, 0.035]} />
                    <meshStandardMaterial color={hair === "bald_sides" ? "#4b5563" : "#1c1917"} roughness={0.6} />
                  </mesh>
                </group>
              ))}

              {/* Animated Tears when crying */}
              {tears > 0.05 && (
                <group>
                  {[0, 1].map((i) => {
                    const drop = ((t * 2.2 + i * 0.5) % 1);
                    return (
                      <React.Fragment key={i}>
                        <mesh position={[-0.14, 0.27 - drop * 0.16, 0.34]} geometry={SHARED_GEO.sphere} scale={[0.03, 0.045, 0.03]}>
                          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.3} />
                        </mesh>
                        <mesh position={[0.14, 0.27 - drop * 0.16, 0.34]} geometry={SHARED_GEO.sphere} scale={[0.03, 0.045, 0.03]}>
                          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.3} />
                        </mesh>
                      </React.Fragment>
                    );
                  })}
                </group>
              )}

              {/* Mustache */}
              {mustacheColor && (
                <mesh position={[0, 0.19, 0.335]}>
                  <boxGeometry args={[0.20, 0.055, 0.05]} />
                  <meshStandardMaterial color={mustacheColor} roughness={0.7} />
                </mesh>
              )}

              {/* Surgical Face Mask */}
              {surgMask && (
                <group position={[0, 0.14, 0.335]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.34, 0.19, 0.09]} />
                    <meshStandardMaterial color="#5eead4" roughness={0.5} />
                  </mesh>
                  <mesh position={[-0.24, 0.02, -0.14]} rotation={[0, 0.7, 0]}>
                    <boxGeometry args={[0.26, 0.02, 0.02]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.4} />
                  </mesh>
                  <mesh position={[0.24, 0.02, -0.14]} rotation={[0, -0.7, 0]}>
                    <boxGeometry args={[0.26, 0.02, 0.02]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.4} />
                  </mesh>
                </group>
              )}

              {/* Animated 3D Mouth */}
              {(() => {
                const openAmount = Math.max(mood === "scream" ? 0.55 : 0.08, mouthOpen);
                const mh = 0.035 + openAmount * 0.13;
                const mw = mood === "scream" ? 0.18 : 0.15;
                return (
                  <group position={[0, 0.12, 0.31]}>
                    <mesh scale={[mw, mh, 0.06]} geometry={SHARED_GEO.sphere}>
                      <meshBasicMaterial color="#450a0a" />
                    </mesh>
                    {(mood === "buckteeth" || mood === "scream" || mood === "smile") && (
                      <mesh position={[0, mh * 0.45, 0.045]}>
                        <boxGeometry args={[mw * 1.1, 0.035, 0.02]} />
                        <meshBasicMaterial color="#ffffff" />
                      </mesh>
                    )}
                    {openAmount > 0.25 && (
                      <mesh position={[0, -mh * 0.42, 0.045]} geometry={SHARED_GEO.sphere} scale={[0.065, 0.032, 0.025]}>
                        <meshBasicMaterial color="#f43f5e" />
                      </mesh>
                    )}
                  </group>
                );
              })()}

              {/* Hair & Hats */}
              {hair === "messy" && (
                <group position={[0, 0.56, -0.02]}>
                  <mesh position={[0, 0.02, 0]} geometry={SHARED_GEO.sphere} scale={[0.37, 0.12, 0.34]}>
                    <meshStandardMaterial color={hairColor} roughness={0.75} />
                  </mesh>
                  {[-0.2, -0.07, 0.07, 0.2].map((hx, idx) => (
                    <mesh
                      key={idx}
                      position={[hx, 0.13, 0.04]}
                      rotation={[0.2, 0, -hx * 0.9]}
                      geometry={SHARED_GEO.cone}
                      scale={[0.11, 0.22, 0.1]}
                      castShadow
                    >
                      <meshStandardMaterial color={hairColor} roughness={0.75} />
                    </mesh>
                  ))}
                </group>
              )}

              {(hair === "bald_sides" || hair === "headphones") && (
                <group position={[0, 0.33, -0.04]}>
                  <mesh position={[-0.36, 0.04, 0]} geometry={SHARED_GEO.sphere} scale={[0.11, 0.14, 0.22]}>
                    <meshStandardMaterial color={hairColor} roughness={0.8} />
                  </mesh>
                  <mesh position={[0.36, 0.04, 0]} geometry={SHARED_GEO.sphere} scale={[0.11, 0.14, 0.22]}>
                    <meshStandardMaterial color={hairColor} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {hair === "headphones" && (
                <group position={[0, 0.30, 0]}>
                  <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
                    <torusGeometry args={[0.42, 0.038, 8, 20, Math.PI]} />
                    <meshStandardMaterial color="#18181b" roughness={0.35} />
                  </mesh>
                  <mesh position={[-0.42, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} geometry={SHARED_GEO.cyl} scale={[0.13, 0.09, 0.15]}>
                    <meshStandardMaterial color="#0f172a" roughness={0.35} />
                  </mesh>
                  <mesh position={[0.42, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} geometry={SHARED_GEO.cyl} scale={[0.13, 0.09, 0.15]}>
                    <meshStandardMaterial color="#0f172a" roughness={0.35} />
                  </mesh>
                  <mesh position={[-0.465, -0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.095, 0.018, 6, 16]} />
                    <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
                  </mesh>
                  <mesh position={[0.465, -0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.095, 0.018, 6, 16]} />
                    <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
                  </mesh>
                </group>
              )}

              {hair === "surg_cap" && (
                <group position={[0, 0.49, -0.02]}>
                  <mesh geometry={SHARED_GEO.sphere} scale={[0.40, 0.22, 0.38]} castShadow>
                    <meshStandardMaterial color="#0d9488" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.05, 0.01]} geometry={SHARED_GEO.cyl} scale={[0.395, 0.09, 0.375]}>
                    <meshStandardMaterial color="#0f766e" roughness={0.65} />
                  </mesh>
                </group>
              )}

              {hair === "helmet" && (
                <group position={[0, 0.51 + hatLift, -0.02]}>
                  <mesh geometry={SHARED_GEO.sphere} scale={[0.42, 0.28, 0.41]} castShadow>
                    <meshStandardMaterial color={hatColor} roughness={0.4} metalness={0.15} />
                  </mesh>
                  <mesh position={[0, -0.05, 0.04]} geometry={SHARED_GEO.cyl} scale={[0.43, 0.07, 0.43]}>
                    <meshStandardMaterial color="#3f4d2d" roughness={0.5} />
                  </mesh>
                </group>
              )}

              {hair === "fire" && (
                <group position={[0, 0.52 + hatLift, -0.02]}>
                  <mesh geometry={SHARED_GEO.sphere} scale={[0.42, 0.26, 0.41]} castShadow>
                    <meshStandardMaterial color="#dc2626" roughness={0.3} />
                  </mesh>
                  {/* Gold Firefighter Crest & Visor */}
                  <mesh position={[0, -0.04, -0.08]} rotation={[-0.12, 0, 0]} geometry={visorGeo} castShadow>
                    <meshStandardMaterial color="#b91c1c" roughness={0.35} />
                  </mesh>
                  <mesh position={[0, 0.12, 0.39]} rotation={[0.1, 0, 0]}>
                    <boxGeometry args={[0.16, 0.16, 0.05]} />
                    <meshStandardMaterial color="#facc15" metalness={0.5} roughness={0.25} />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export const Bird3D: React.FC<{
  position: [number, number, number];
  t: number;
  seed: number;
  falling?: boolean;
  fallDt?: number;
}> = ({ position, t, seed, falling = false, fallDt = 0 }) => {
  const flap = falling ? -0.45 : Math.sin(t * 20 + seed * 2.1) * 0.7;
  const landed = position[1] <= 0.16 && falling;
  const rotZ = falling && !landed ? fallDt * 7.5 : Math.sin(t * 6 + seed) * 0.08;

  return (
    <group
      position={position}
      rotation={[0, 0, rotZ]}
      scale={landed ? [1.25, 0.45, 1.25] : [1, 1, 1]}
    >
      {/* Body */}
      <mesh geometry={SHARED_GEO.sphere} scale={[0.24, 0.17, 0.17]} castShadow>
        <meshStandardMaterial color="#38bdf8" roughness={0.4} />
      </mesh>
      {/* Beak */}
      <mesh position={[0.26, 0, 0]} rotation={[0, 0, -Math.PI / 2]} geometry={SHARED_GEO.cone} scale={[0.06, 0.14, 0.06]}>
        <meshStandardMaterial color="#facc15" roughness={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.14, 0.06, 0.11]} geometry={SHARED_GEO.sphere} scale={0.042}>
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.16, 0.06, 0.14]} geometry={SHARED_GEO.sphere} scale={0.02}>
        <meshBasicMaterial color="#111111" />
      </mesh>
      {/* Wings */}
      <mesh position={[-0.02, 0.05, 0.14]} rotation={[flap, 0, 0]} geometry={SHARED_GEO.cone} scale={[0.14, 0.24, 0.05]}>
        <meshStandardMaterial color="#0284c7" roughness={0.45} />
      </mesh>
      <mesh position={[-0.02, 0.05, -0.14]} rotation={[-flap, 0, 0]} geometry={SHARED_GEO.cone} scale={[0.14, 0.24, 0.05]}>
        <meshStandardMaterial color="#0284c7" roughness={0.45} />
      </mesh>
    </group>
  );
};

export const MoneyBag3D: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; scale?: number }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.22, 0]} geometry={SHARED_GEO.sphere} scale={[0.26, 0.24, 0.24]} castShadow receiveShadow>
        <meshStandardMaterial color="#a88b5a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.44, 0]} geometry={SHARED_GEO.cyl} scale={[0.08, 0.06, 0.08]}>
        <meshStandardMaterial color="#654321" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.50, 0]} geometry={SHARED_GEO.cone} rotation={[Math.PI, 0, 0]} scale={[0.13, 0.11, 0.13]}>
        <meshStandardMaterial color="#b99c6b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.23, 0.23]}>
        <boxGeometry args={[0.14, 0.16, 0.03]} />
        <meshStandardMaterial color="#22c55e" emissive="#15803d" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};
