import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeSignTexture } from "./SignTexture";

export type EyeMode = "normal" | "red" | "wide" | "dead";
export type MoodMode = "neutral" | "scream" | "smile" | "frown";
export type HairMode = "messy" | "bald_sides" | "headphones" | "none";
export type PoseMode =
  | "idle"
  | "sit_chill"
  | "sit_type"
  | "faceplant"
  | "lie_flat"
  | "megaphoning"
  | "ruler_slap"
  | "phone_call"
  | "panic";
export type ScreenMode = "chat" | "code_drop" | "answer" | "rust" | "limit";

export interface Character3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  yaw?: number;
  skinColor?: string;
  shirtColor: string;
  pantsColor: string;
  tieColor?: string;
  hair?: HairMode;
  hairColor?: string;
  mustacheColor?: string;
  glasses?: boolean;
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
  seated?: boolean;
  t?: number;
  seed?: number;
  holdSmoothie?: boolean;
  holdMegaphone?: boolean;
  holdRuler?: boolean;
  holdRotaryPhone?: boolean;
}

const SHARED_GEO = {
  sphere: new THREE.SphereGeometry(1, 20, 16),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 14),
  torso: new RoundedBoxGeometry(0.62, 0.68, 0.4, 4, 0.12),
  boot: new RoundedBoxGeometry(0.2, 0.14, 0.34, 3, 0.05),
  paper: new THREE.BoxGeometry(0.22, 0.008, 0.3),
  crumple: new THREE.IcosahedronGeometry(0.045, 0),
  gamingSeat: new RoundedBoxGeometry(0.52, 0.09, 0.5, 3, 0.03),
  gamingBack: new RoundedBoxGeometry(0.5, 0.78, 0.1, 3, 0.04),
  cheapSeat: new RoundedBoxGeometry(0.42, 0.055, 0.4, 2, 0.02),
  cheapBack: new RoundedBoxGeometry(0.4, 0.32, 0.06, 2, 0.02),
};

function useSignTexture(
  lines: string[],
  bg: string,
  fg: string,
  borderColor = "#111827",
  width = 512,
  height = 160,
  fontSize = 64
): THREE.CanvasTexture {
  const linesKey = JSON.stringify(lines);
  const tex = useMemo(
    () =>
      makeSignTexture(
        JSON.parse(linesKey) as string[],
        bg,
        fg,
        borderColor,
        width,
        height,
        fontSize
      ),
    [linesKey, bg, fg, borderColor, width, height, fontSize]
  );

  useEffect(() => {
    return () => {
      tex.dispose();
    };
  }, [tex]);

  return tex;
}

export const CameraRig: React.FC<{
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
  shake?: number;
  t: number;
}> = ({ pos, lookAt, fov = 46, shake = 0, t }) => {
  const { camera } = useThree();
  const frame = useCurrentFrame();

  useLayoutEffect(() => {
    const sx = shake > 0 ? Math.sin(frame * 1.9 + t * 50) * shake * 0.015 : 0;
    const sy = shake > 0 ? Math.cos(frame * 2.7 + t * 40) * shake * 0.015 : 0;
    camera.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
    camera.lookAt(lookAt[0] + sx * 0.4, lookAt[1] + sy * 0.4, lookAt[2]);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }, [camera, pos[0], pos[1], pos[2], lookAt[0], lookAt[1], lookAt[2], fov, shake, frame, t]);

  return null;
};

const SmoothieCup3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Cup body */}
    <mesh position={[0, 0.085, 0]} castShadow>
      <cylinderGeometry args={[0.062, 0.044, 0.17, 16]} />
      <meshStandardMaterial color="#f472b6" roughness={0.28} />
    </mesh>
    {/* Cream swirl band */}
    <mesh position={[0, 0.085, 0]}>
      <cylinderGeometry args={[0.064, 0.056, 0.045, 16]} />
      <meshStandardMaterial color="#fbcfe8" roughness={0.35} />
    </mesh>
    {/* Dome lid */}
    <mesh position={[0, 0.17, 0]} geometry={SHARED_GEO.sphere} scale={[0.062, 0.045, 0.062]}>
      <meshStandardMaterial color="#f8fafc" roughness={0.2} transparent opacity={0.85} />
    </mesh>
    {/* Lid rim */}
    <mesh position={[0, 0.168, 0]}>
      <cylinderGeometry args={[0.066, 0.066, 0.014, 16]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
    </mesh>
    {/* Bent straw */}
    <mesh position={[0.015, 0.22, 0]} rotation={[0, 0, -0.18]}>
      <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
      <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.25} roughness={0.3} />
    </mesh>
  </group>
);

const Megaphone3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Handle grip */}
    <mesh position={[0, -0.05, 0.02]} rotation={[0.2, 0, 0]} castShadow>
      <boxGeometry args={[0.042, 0.13, 0.052]} />
      <meshStandardMaterial color="#1e293b" roughness={0.6} />
    </mesh>
    {/* Rear speaker body */}
    <mesh position={[0, 0.06, -0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.065, 0.05, 0.14, 14]} />
      <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.3} />
    </mesh>
    {/* Conical megaphone horn pointing +Z */}
    <mesh position={[0, 0.06, 0.15]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.14, 0.06, 0.25, 18]} />
      <meshStandardMaterial color="#ef4444" roughness={0.35} />
    </mesh>
    {/* White front rim */}
    <mesh position={[0, 0.06, 0.275]}>
      <torusGeometry args={[0.14, 0.016, 8, 20]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.3} />
    </mesh>
    {/* Dark inner cone core */}
    <mesh position={[0, 0.06, 0.265]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.125, 0.125, 0.01, 16]} />
      <meshBasicMaterial color="#18181b" />
    </mesh>
  </group>
);

const Ruler3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Long wooden ruler body */}
    <mesh position={[0, 0, 0.36]} castShadow>
      <boxGeometry args={[0.055, 0.016, 0.82]} />
      <meshStandardMaterial color="#d97706" roughness={0.55} />
    </mesh>
    {/* Yellowish bevel stripe & dark measurement ticks */}
    <mesh position={[0, 0.009, 0.36]}>
      <boxGeometry args={[0.036, 0.003, 0.78]} />
      <meshStandardMaterial color="#fbbf24" roughness={0.45} />
    </mesh>
    {[-0.28, -0.14, 0, 0.14, 0.28].map((dz, idx) => (
      <mesh key={idx} position={[0.015, 0.01, 0.36 + dz]}>
        <boxGeometry args={[0.018, 0.004, 0.012]} />
        <meshBasicMaterial color="#451a03" />
      </mesh>
    ))}
  </group>
);

const RotaryPhoneHandset3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Curved handle bar */}
    <mesh castShadow>
      <boxGeometry args={[0.048, 0.24, 0.045]} />
      <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.2} />
    </mesh>
    {/* Earpiece bell */}
    <mesh position={[0, 0.12, -0.042]} rotation={[Math.PI / 2 - 0.18, 0, 0]} castShadow>
      <cylinderGeometry args={[0.072, 0.044, 0.065, 14]} />
      <meshStandardMaterial color="#27272a" roughness={0.28} metalness={0.35} />
    </mesh>
    {/* Mouthpiece bell */}
    <mesh position={[0, -0.12, -0.042]} rotation={[Math.PI / 2 + 0.18, 0, 0]} castShadow>
      <cylinderGeometry args={[0.068, 0.042, 0.065, 14]} />
      <meshStandardMaterial color="#27272a" roughness={0.28} metalness={0.35} />
    </mesh>
    {/* Metallic rim accents so black handset reads clearly against dark hair */}
    <mesh position={[0, 0.12, -0.072]} rotation={[Math.PI / 2 - 0.18, 0, 0]}>
      <cylinderGeometry args={[0.056, 0.056, 0.012, 14]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.3} />
    </mesh>
    <mesh position={[0, -0.12, -0.072]} rotation={[Math.PI / 2 + 0.18, 0, 0]}>
      <cylinderGeometry args={[0.052, 0.052, 0.012, 14]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.3} />
    </mesh>
    {/* Coiled cord stub */}
    <mesh position={[0, -0.21, 0.01]} rotation={[0.25, 0, 0]}>
      <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
      <meshStandardMaterial color="#3f3f46" roughness={0.6} />
    </mesh>
  </group>
);

export const Character3D: React.FC<Character3DProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  yaw = 0,
  skinColor = "#f5c99b",
  shirtColor,
  pantsColor,
  tieColor,
  hair = "messy",
  hairColor = "#2d2118",
  mustacheColor,
  glasses = false,
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
  seated = false,
  t = 0,
  seed = 1,
  holdSmoothie,
  holdMegaphone,
  holdRuler,
  holdRotaryPhone,
}) => {
  const skin = useMemo(() => {
    const base = new THREE.Color(skinColor);
    const black = new THREE.Color("#000000");
    const warm = new THREE.Color("#7c2d12");
    const blush = new THREE.Color("#ef5350");
    return {
      base: skinColor,
      neck: `#${base.clone().lerp(black, 0.11).getHexString()}`,
      ear: `#${base.clone().lerp(black, 0.08).getHexString()}`,
      nose: `#${base.clone().lerp(warm, 0.16).getHexString()}`,
      cheek: `#${base.clone().lerp(blush, 0.35).getHexString()}`,
    };
  }, [skinColor]);

  const showSmoothie = Boolean(holdSmoothie);
  const showMegaphone = holdMegaphone ?? pose === "megaphoning";
  const showRuler = holdRuler ?? pose === "ruler_slap";
  const showRotaryPhone = holdRotaryPhone ?? pose === "phone_call";

  let bounceY = 0;
  let offsetZ = 0;
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

  let effectiveHeadTilt = headTilt;
  const phaseOffset = seed * 1.37;

  if (pose === "sit_chill") {
    const bob = Math.sin(t * 2.4 + phaseOffset);
    bounceY = -0.28;
    torsoLeanX = -0.18 + bob * 0.025;
    lHipX = -1.34;
    rHipX = -1.34;
    lKneeX = 1.24;
    rKneeX = 1.24;
    if (showSmoothie) {
      lShX = -0.78 + bob * 0.1;
      lShZ = 0.14;
      lElbX = -1.12 - bob * 0.08;
    } else {
      lShX = -0.35;
      lShZ = -0.28;
      lElbX = -0.92;
    }
    rShX = -0.35;
    rShZ = 0.28;
    rElbX = -0.92;
  } else if (pose === "sit_type") {
    const typeL = Math.sin(t * 28 + phaseOffset);
    const typeR = Math.sin(t * 28 + phaseOffset + Math.PI);
    bounceY = -0.28;
    torsoLeanX = 0.2 + Math.sin(t * 14 + phaseOffset) * 0.025;
    lHipX = -1.38;
    rHipX = -1.38;
    lKneeX = 1.35;
    rKneeX = 1.35;
    lShX = -0.55 + typeL * 0.14;
    rShX = -0.55 + typeR * 0.14;
    lShZ = 0.18;
    rShZ = -0.18;
    lElbX = -1.45 - typeL * 0.18;
    rElbX = -1.45 - typeR * 0.18;
  } else if (pose === "faceplant") {
    bounceY = -0.24;
    offsetZ = -0.06;
    torsoLeanX = 0.92;
    effectiveHeadTilt = headTilt + 0.12;
    lHipX = -1.36;
    rHipX = -1.36;
    lKneeX = 1.32;
    rKneeX = 1.32;
    lShX = -0.75;
    rShX = -0.75;
    lShZ = -0.35;
    rShZ = 0.35;
    lElbX = -0.55;
    rElbX = -0.55;
  } else if (pose === "lie_flat") {
    bounceY = 0;
    lHipX = 0.05;
    rHipX = -0.05;
    lKneeX = 0.08;
    rKneeX = 0.12;
    lShX = -0.08;
    rShX = -0.08;
    lShZ = -0.42;
    rShZ = 0.42;
    lElbX = -0.15;
    rElbX = -0.15;
  } else if (pose === "megaphoning") {
    const yell = Math.sin(t * 9 + phaseOffset);
    bounceY = Math.abs(yell) * 0.025;
    torsoLeanX = 0.08 + yell * 0.03;
    rShX = -1.42;
    rShZ = -0.48;
    rElbX = -1.32;
    lShX = -0.48 + yell * 0.18;
    lShZ = -0.32;
    lElbX = -0.85;
  } else if (pose === "ruler_slap") {
    const c = (((t * 2.22 + seed * 0.11) % 1) + 1) % 1;
    let slapAngle = -0.65;
    let impactLean = 0;
    if (c < 0.55) {
      const p = c / 0.55;
      const eased = 1 - Math.pow(1 - p, 2);
      slapAngle = -0.65 - eased * 1.7;
    } else if (c < 0.72) {
      const p = (c - 0.55) / 0.17;
      slapAngle = -2.35 + p * p * 1.9;
      impactLean = p * 0.18;
    } else {
      const p = (c - 0.72) / 0.28;
      slapAngle = -0.45 - Math.sin(p * Math.PI) * 0.28;
      impactLean = (1 - p) * 0.18;
    }
    torsoLeanX = 0.08 + impactLean;
    torsoTwistY = -0.12 - impactLean * 0.5;
    rShX = slapAngle;
    rShZ = 0.16;
    rElbX = -0.42;
    lShX = -0.55;
    lShZ = -0.28;
    lElbX = -0.88;
  } else if (pose === "phone_call") {
    const nod = Math.sin(t * 5.2 + phaseOffset);
    bounceY = Math.sin(t * 2.6 + phaseOffset) * 0.015;
    torsoLeanX = 0.04;
    effectiveHeadTilt = headTilt + nod * 0.04;
    rShX = -1.78;
    rShZ = 0.34;
    rElbX = -1.36;
    lShX = -0.45 + Math.sin(t * 6.5 + phaseOffset) * 0.16;
    lShZ = -0.28;
    lElbX = -0.88;
  } else if (pose === "panic") {
    const w = Math.sin(t * 16 + phaseOffset);
    if (seated) {
      bounceY = -0.28 + Math.abs(w) * 0.025;
      torsoLeanX = -0.08 + Math.sin(t * 14 + phaseOffset) * 0.04;
      lHipX = -1.36;
      rHipX = -1.36;
      lKneeX = 1.28;
      rKneeX = 1.28;
    } else {
      bounceY = Math.abs(w) * 0.06;
    }
    torsoTwistY = w * 0.12;
    lShX = -2.25 + w * 0.45;
    rShX = -2.25 - w * 0.45;
    lShZ = -0.55;
    rShZ = 0.55;
    lElbX = -0.4;
    rElbX = -0.4;
  } else {
    // idle subtle breathing + optional held props
    const br = Math.sin(t * 3.5 + phaseOffset);
    bounceY = br * 0.025;
    lShZ = -0.22 - br * 0.04;
    rShZ = 0.22 + br * 0.04;
    if (showSmoothie) {
      lShX = -0.78;
      lShZ = 0.12;
      lElbX = -1.08;
    }
    if (showMegaphone) {
      rShX = -1.42;
      rShZ = -0.48;
      rElbX = -1.32;
    } else if (showRuler) {
      rShX = -1.05;
      rShZ = 0.16;
      rElbX = -0.65;
    } else if (showRotaryPhone) {
      rShX = -2.1;
      rShZ = 0.2;
      rElbX = -1.65;
    }
  }

  const eyeScale = eyes === "wide" ? 1.12 : 1.0;
  const innerPos: [number, number, number] =
    pose === "lie_flat" ? [0, 0.22, 0.78] : [0, bounceY, offsetZ];
  const innerRot: [number, number, number] =
    pose === "lie_flat" ? [-Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={[0, yaw, 0]}>
        <group position={innerPos} rotation={innerRot}>
          {/* Left & Right Articulated Legs */}
          {[-1, 1].map((side) => {
            const isLeft = side === -1;
            const hipX = isLeft ? lHipX : rHipX;
            const kneeX = isLeft ? lKneeX : rKneeX;
            return (
              <group key={side} position={[side * 0.165, 0.78, 0]} rotation={[hipX, 0, 0]}>
                <mesh
                  position={[0, -0.19, 0]}
                  geometry={SHARED_GEO.cyl}
                  scale={[0.095, 0.38, 0.095]}
                  castShadow
                >
                  <meshStandardMaterial color={pantsColor} roughness={0.65} />
                </mesh>
                <mesh position={[0, -0.36, 0]} geometry={SHARED_GEO.sphere} scale={0.092} castShadow>
                  <meshStandardMaterial color={pantsColor} roughness={0.65} />
                </mesh>
                <group position={[0, -0.36, 0]} rotation={[kneeX, 0, 0]}>
                  <mesh
                    position={[0, -0.17, 0]}
                    geometry={SHARED_GEO.cyl}
                    scale={[0.088, 0.34, 0.088]}
                    castShadow
                  >
                    <meshStandardMaterial color={pantsColor} roughness={0.65} />
                  </mesh>
                  <mesh position={[0, -0.35, 0.06]} geometry={SHARED_GEO.boot} castShadow>
                    <meshStandardMaterial color="#1f242a" roughness={0.5} />
                  </mesh>
                </group>
              </group>
            );
          })}

          {/* Upper Body (Pelvis Pivot) */}
          <group position={[0, 0.78, 0]} rotation={[torsoLeanX, torsoTwistY, 0]}>
            {/* Torso */}
            <mesh position={[0, 0.34, 0]} geometry={SHARED_GEO.torso} castShadow receiveShadow>
              <meshStandardMaterial color={shirtColor} roughness={0.55} />
            </mesh>
            {/* Belt + Buckle */}
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
                <mesh
                  position={[0, -0.09, 0]}
                  geometry={SHARED_GEO.cone}
                  rotation={[0, 0, Math.PI]}
                  scale={[0.065, 0.38, 0.03]}
                >
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
              const worldKeepUprightX = -(torsoLeanX + shX + elbX);
              return (
                <group key={side} position={[side * 0.36, 0.56, 0]} rotation={[shX, 0, shZ]}>
                  <mesh geometry={SHARED_GEO.sphere} scale={0.095} castShadow>
                    <meshStandardMaterial color={shirtColor} roughness={0.55} />
                  </mesh>
                  <mesh
                    position={[0, -0.16, 0]}
                    geometry={SHARED_GEO.cyl}
                    scale={[0.082, 0.32, 0.082]}
                    castShadow
                  >
                    <meshStandardMaterial color={shirtColor} roughness={0.55} />
                  </mesh>
                  <group position={[0, -0.31, 0]} rotation={[elbX, 0, 0]}>
                    <mesh geometry={SHARED_GEO.sphere} scale={0.078}>
                      <meshStandardMaterial color={shirtColor} roughness={0.55} />
                    </mesh>
                    <mesh
                      position={[0, -0.14, 0]}
                      geometry={SHARED_GEO.cyl}
                      scale={[0.074, 0.28, 0.074]}
                      castShadow
                    >
                      <meshStandardMaterial color={shirtColor} roughness={0.55} />
                    </mesh>
                    {/* Hand */}
                    <mesh position={[0, -0.3, 0]} geometry={SHARED_GEO.sphere} scale={0.095} castShadow>
                      <meshStandardMaterial color={skin.base} roughness={0.5} />
                    </mesh>

                    {/* Held Props */}
                    {isLeft && showSmoothie && (
                      <SmoothieCup3D
                        position={[0, -0.3, 0.04]}
                        rotation={[worldKeepUprightX, 0, -shZ * 0.5]}
                        scale={0.95}
                      />
                    )}
                    {!isLeft && showMegaphone && (
                      <Megaphone3D
                        position={[-0.08, -0.3, 0.02]}
                        rotation={[worldKeepUprightX, 0, -shZ * 0.5]}
                      />
                    )}
                    {!isLeft && showRuler && (
                      <Ruler3D
                        position={[0, -0.32, 0.03]}
                        rotation={[0.25, 0, 0]}
                      />
                    )}
                    {!isLeft && showRotaryPhone && (
                      <RotaryPhoneHandset3D
                        position={[0.04, -0.3, 0.06]}
                        rotation={[0.65, -0.25, -0.2]}
                      />
                    )}
                  </group>
                </group>
              );
            })}

            {/* Head Group */}
            <group position={[0, 0.72, 0]} rotation={[effectiveHeadTilt, headTurn, 0]}>
              {/* Neck */}
              <mesh position={[0, -0.02, 0]} geometry={SHARED_GEO.cyl} scale={[0.14, 0.14, 0.14]}>
                <meshStandardMaterial color={skin.neck} roughness={0.55} />
              </mesh>
              {/* Main Stylized Head Sphere */}
              <mesh
                position={[0, 0.28, 0]}
                geometry={SHARED_GEO.sphere}
                scale={[0.38, 0.34, 0.35]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color={skin.base} roughness={0.48} />
              </mesh>
              {/* Ears */}
              <mesh position={[-0.38, 0.26, 0]} geometry={SHARED_GEO.sphere} scale={[0.06, 0.09, 0.06]}>
                <meshStandardMaterial color={skin.ear} roughness={0.5} />
              </mesh>
              <mesh position={[0.38, 0.26, 0]} geometry={SHARED_GEO.sphere} scale={[0.06, 0.09, 0.06]}>
                <meshStandardMaterial color={skin.ear} roughness={0.5} />
              </mesh>
              {/* Nose */}
              <mesh position={[0, 0.26, 0.35]} geometry={SHARED_GEO.sphere} scale={[0.055, 0.05, 0.07]}>
                <meshStandardMaterial color={skin.nose} roughness={0.48} />
              </mesh>
              {/* Rosy Cheeks */}
              <mesh position={[-0.22, 0.21, 0.29]} geometry={SHARED_GEO.sphere} scale={[0.065, 0.04, 0.03]}>
                <meshStandardMaterial color={skin.cheek} roughness={0.6} />
              </mesh>
              <mesh position={[0.22, 0.21, 0.29]} geometry={SHARED_GEO.sphere} scale={[0.065, 0.04, 0.03]}>
                <meshStandardMaterial color={skin.cheek} roughness={0.6} />
              </mesh>

              {/* Eyes */}
              {[-1, 1].map((side) => (
                <group key={side} position={[side * 0.122, 0.325, 0.272]} scale={eyeScale}>
                  <mesh geometry={SHARED_GEO.sphere} scale={[0.088, 0.088, 0.052]}>
                    <meshStandardMaterial
                      color={eyes === "red" ? "#fecaca" : eyes === "dead" ? "#e5e7eb" : "#ffffff"}
                      emissive={eyes === "red" ? "#ef4444" : "#000000"}
                      emissiveIntensity={eyes === "red" ? 0.22 : 0}
                      roughness={0.2}
                    />
                  </mesh>
                  {eyes !== "dead" ? (
                    <group position={[lookX * 0.032, lookY * 0.032, 0.046]}>
                      {eyes === "red" && (
                        <mesh geometry={SHARED_GEO.sphere} scale={[0.052, 0.052, 0.025]}>
                          <meshBasicMaterial color="#dc2626" />
                        </mesh>
                      )}
                      <mesh position={[0, 0, 0.008]} geometry={SHARED_GEO.sphere} scale={[0.036, 0.036, 0.022]}>
                        <meshBasicMaterial color="#09090b" />
                      </mesh>
                    </group>
                  ) : (
                    <group position={[0, 0, 0.056]}>
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
                  {/* Tired dark under-eye bags when red eyes */}
                  {eyes === "red" && (
                    <mesh position={[0, -0.088, 0.03]} geometry={SHARED_GEO.sphere} scale={[0.085, 0.025, 0.03]}>
                      <meshStandardMaterial color="#5b21b6" roughness={0.85} transparent opacity={0.45} />
                    </mesh>
                  )}
                  {/* Eyebrow */}
                  <mesh position={[0, 0.115 + brow * 0.012, 0.02]} rotation={[0, 0, side * -brow * 0.42]}>
                    <boxGeometry args={[0.14, 0.032, 0.035]} />
                    <meshStandardMaterial
                      color={hair === "bald_sides" ? "#4b5563" : hairColor}
                      roughness={0.6}
                    />
                  </mesh>
                </group>
              ))}

              {/* Glasses (2 frames + lenses + bridge + temples) */}
              {glasses && (
                <group position={[0, 0.325, 0.338]}>
                  {[-1, 1].map((side) => (
                    <group key={side}>
                      {/* Rim frame */}
                      <mesh position={[side * 0.13, 0, 0]}>
                        <torusGeometry args={[0.105, 0.015, 8, 24]} />
                        <meshStandardMaterial color="#18181b" roughness={0.25} metalness={0.65} />
                      </mesh>
                      {/* Semi-transparent glass lens */}
                      <mesh position={[side * 0.13, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.096, 0.096, 0.008, 20]} />
                        <meshStandardMaterial
                          color="#bae6fd"
                          transparent
                          opacity={0.24}
                          roughness={0.08}
                          metalness={0.2}
                        />
                      </mesh>
                      {/* Side temple arm */}
                      <mesh position={[side * 0.285, -0.01, -0.17]} rotation={[0, side * -0.24, 0]}>
                        <boxGeometry args={[0.014, 0.016, 0.34]} />
                        <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.6} />
                      </mesh>
                    </group>
                  ))}
                  {/* Nose bridge */}
                  <mesh position={[0, 0.012, 0.004]}>
                    <boxGeometry args={[0.075, 0.018, 0.018]} />
                    <meshStandardMaterial color="#18181b" roughness={0.25} metalness={0.65} />
                  </mesh>
                </group>
              )}

              {/* Animated Tears */}
              {tears > 0.05 && (
                <group>
                  {[0, 1].map((i) => {
                    const drop = (t * 2.2 + i * 0.5) % 1;
                    const s = 0.7 + tears * 0.5;
                    return (
                      <React.Fragment key={i}>
                        <mesh
                          position={[-0.145, 0.255 - drop * 0.11, 0.312 - drop * 0.035]}
                          geometry={SHARED_GEO.sphere}
                          scale={[0.016 * s, 0.026 * s, 0.014 * s]}
                        >
                          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.35} />
                        </mesh>
                        <mesh
                          position={[0.145, 0.255 - drop * 0.11, 0.312 - drop * 0.035]}
                          geometry={SHARED_GEO.sphere}
                          scale={[0.016 * s, 0.026 * s, 0.014 * s]}
                        >
                          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.35} />
                        </mesh>
                      </React.Fragment>
                    );
                  })}
                </group>
              )}

              {/* Mustache */}
              {mustacheColor && (
                <group position={[0, 0.19, 0.34]}>
                  <mesh position={[-0.055, 0, 0]} rotation={[0, 0, 0.14]}>
                    <boxGeometry args={[0.115, 0.052, 0.045]} />
                    <meshStandardMaterial color={mustacheColor} roughness={0.7} />
                  </mesh>
                  <mesh position={[0.055, 0, 0]} rotation={[0, 0, -0.14]}>
                    <boxGeometry args={[0.115, 0.052, 0.045]} />
                    <meshStandardMaterial color={mustacheColor} roughness={0.7} />
                  </mesh>
                </group>
              )}

              {/* Animated 3D Mouth */}
              {(() => {
                const baseOpen = mood === "scream" ? 0.55 : 0.06;
                const openAmount = Math.max(baseOpen, mouthOpen);
                const isSmileLow = mood === "smile" && mouthOpen < 0.18;
                const isFrownLow = mood === "frown" && mouthOpen < 0.18;
                const mh = isSmileLow || isFrownLow ? 0.036 : 0.026 + openAmount * 0.075;
                const mw = mood === "scream" ? 0.18 : mood === "smile" ? 0.175 : 0.145;
                const mouthY = isSmileLow ? 0.14 : isFrownLow ? 0.128 : 0.142;
                return (
                  <group position={[0, mouthY, 0.288]} rotation={[0.26, 0, 0]}>
                    {isSmileLow ? (
                      <>
                        <mesh position={[0, 0.008, 0.004]} scale={[0.145, 0.048, 0.04]} geometry={SHARED_GEO.sphere}>
                          <meshBasicMaterial color="#450a0a" />
                        </mesh>
                        <mesh position={[0, 0.022, 0.028]}>
                          <boxGeometry args={[0.13, 0.024, 0.016]} />
                          <meshBasicMaterial color="#ffffff" />
                        </mesh>
                      </>
                    ) : isFrownLow ? (
                      <mesh position={[0, -0.02, 0.02]} rotation={[0, 0, 0]}>
                        <torusGeometry args={[0.078, 0.02, 8, 16, Math.PI]} />
                        <meshBasicMaterial color="#450a0a" />
                      </mesh>
                    ) : (
                      <>
                        <mesh scale={[mw, mh, 0.038]} geometry={SHARED_GEO.sphere}>
                          <meshBasicMaterial color="#450a0a" />
                        </mesh>
                        {(mood === "scream" || mood === "smile" || openAmount > 0.32) && (
                          <mesh position={[0, mh * 0.45, 0.028]}>
                            <boxGeometry args={[mw * 1.05, 0.035, 0.02]} />
                            <meshBasicMaterial color="#ffffff" />
                          </mesh>
                        )}
                        {openAmount > 0.25 && (
                          <mesh
                            position={[0, -mh * 0.38, 0.028]}
                            geometry={SHARED_GEO.sphere}
                            scale={[0.065, 0.032, 0.025]}
                          >
                            <meshBasicMaterial color="#f43f5e" />
                          </mesh>
                        )}
                      </>
                    )}
                  </group>
                );
              })()}

              {/* Hair Styles */}
              {(hair === "messy" || hair === "headphones") && (
                <group position={[0, 0.55, -0.02]}>
                  <mesh position={[0, 0.02, 0]} geometry={SHARED_GEO.sphere} scale={[0.37, 0.12, 0.34]}>
                    <meshStandardMaterial color={hairColor} roughness={0.75} />
                  </mesh>
                  {[-0.19, -0.06, 0.07, 0.19].map((hx, idx) => (
                    <mesh
                      key={idx}
                      position={[hx, 0.12, 0.04]}
                      rotation={[0.22, 0, -hx * 0.9]}
                      geometry={SHARED_GEO.cone}
                      scale={[0.1, 0.2, 0.1]}
                      castShadow
                    >
                      <meshStandardMaterial color={hairColor} roughness={0.75} />
                    </mesh>
                  ))}
                </group>
              )}

              {hair === "bald_sides" && (
                <group position={[0, 0.33, -0.04]}>
                  <mesh position={[-0.36, 0.04, 0]} geometry={SHARED_GEO.sphere} scale={[0.11, 0.14, 0.22]}>
                    <meshStandardMaterial color={hairColor} roughness={0.8} />
                  </mesh>
                  <mesh position={[0.36, 0.04, 0]} geometry={SHARED_GEO.sphere} scale={[0.11, 0.14, 0.22]}>
                    <meshStandardMaterial color={hairColor} roughness={0.8} />
                  </mesh>
                  <mesh position={[0, 0.05, -0.31]} geometry={SHARED_GEO.sphere} scale={[0.28, 0.13, 0.1]}>
                    <meshStandardMaterial color={hairColor} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {hair === "headphones" && (
                <group position={[0, 0.31, 0]}>
                  <mesh position={[0, 0.02, 0]}>
                    <torusGeometry args={[0.43, 0.036, 8, 24, Math.PI]} />
                    <meshStandardMaterial color="#18181b" roughness={0.35} />
                  </mesh>
                  <mesh
                    position={[-0.42, -0.02, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    geometry={SHARED_GEO.cyl}
                    scale={[0.13, 0.09, 0.15]}
                  >
                    <meshStandardMaterial color="#0f172a" roughness={0.35} />
                  </mesh>
                  <mesh
                    position={[0.42, -0.02, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    geometry={SHARED_GEO.cyl}
                    scale={[0.13, 0.09, 0.15]}
                  >
                    <meshStandardMaterial color="#0f172a" roughness={0.35} />
                  </mesh>
                  <mesh position={[-0.468, -0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.095, 0.018, 6, 18]} />
                    <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
                  </mesh>
                  <mesh position={[0.468, -0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.095, 0.018, 6, 18]} />
                    <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
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

const SCREEN_CONFIG: Record<
  ScreenMode,
  { lines: string[]; bg: string; fg: string; border: string; emissive: string }
> = {
  chat: {
    lines: ["CLAUDE AI", "Чат готов", "Жду промпт..."],
    bg: "#1e1b2e",
    fg: "#fde68a",
    border: "#d97706",
    emissive: "#f59e0b",
  },
  code_drop: {
    lines: ["500 СТРОК КОДА", "CTRL+V -> ПОФИКСИ!"],
    bg: "#0f172a",
    fg: "#38bdf8",
    border: "#0284c7",
    emissive: "#0ea5e9",
  },
  answer: {
    lines: ["CLAUDE:", "КОНЕЧНО,", "С РАДОСТЬЮ ПОМОГУ!"],
    bg: "#064e3b",
    fg: "#4ade80",
    border: "#22c55e",
    emissive: "#22c55e",
  },
  rust: {
    lines: ["ПЕРЕПИШИ ВСЁ", "НА RUST!"],
    bg: "#431407",
    fg: "#fb923c",
    border: "#f97316",
    emissive: "#ea580c",
  },
  limit: {
    lines: ["ЛИМИТ ДОСТИГНУТ", "ЖДИТЕ 5 ЧАСОВ"],
    bg: "#450a0a",
    fg: "#fca5a5",
    border: "#ef4444",
    emissive: "#ef4444",
  },
};

export const CoderDesk3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  screenMode?: ScreenMode;
  t?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], screenMode = "chat", t = 0 }) => {
  const cfg = SCREEN_CONFIG[screenMode];
  const screenTex = useSignTexture(cfg.lines, cfg.bg, cfg.fg, cfg.border, 512, 256, 48);

  // Deterministic RGB color cycling from t
  const rgbPulse1 = 0.8 + 0.6 * Math.sin(t * 4.5);
  const rgbPulse2 = 0.8 + 0.6 * Math.cos(t * 4.5);
  const rgbHue = ((t * 0.22) % 1 + 1) % 1;
  const rgbColor = useMemo(() => {
    const c = new THREE.Color();
    c.setHSL(rgbHue, 0.9, 0.55);
    return `#${c.getHexString()}`;
  }, [rgbHue]);

  return (
    <group position={position} rotation={rotation}>
      {/* Tabletop (top surface at y = 0.78, width 2.2, depth 1.0) */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.06, 1.0]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Front neon edge trim */}
      <mesh position={[0, 0.75, 0.502]}>
        <boxGeometry args={[2.2, 0.022, 0.012]} />
        <meshStandardMaterial color={rgbColor} emissive={rgbColor} emissiveIntensity={1.1} />
      </mesh>
      {/* Steel desk legs */}
      {[-0.96, 0.96].map((lx) => (
        <group key={lx} position={[lx, 0, 0]}>
          <mesh position={[0, 0.36, -0.36]} castShadow>
            <boxGeometry args={[0.08, 0.72, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.36, 0.36]} castShadow>
            <boxGeometry args={[0.08, 0.72, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.03, 0]} receiveShadow>
            <boxGeometry args={[0.09, 0.06, 0.86]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Desk mat */}
      <mesh position={[0, 0.783, 0.14]} receiveShadow>
        <boxGeometry args={[1.18, 0.008, 0.44]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Ultrawide Monitor at z = -0.22, facing +Z */}
      <group position={[0, 0.78, -0.22]}>
        {/* Stand base & arm */}
        <mesh position={[0, 0.015, -0.05]} castShadow>
          <boxGeometry args={[0.42, 0.03, 0.24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.28, -0.08]} castShadow>
          <boxGeometry args={[0.09, 0.52, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Center monitor panel (wide enough so side bezels never overlap the screen plane) */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[1.22, 0.56, 0.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Angled side frame wings flanking outside the screen */}
        <mesh position={[-0.68, 0.52, 0.02]} rotation={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.14, 0.56, 0.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0.68, 0.52, 0.02]} rotation={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.14, 0.56, 0.05]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Screen display facing +Z */}
        <mesh position={[0, 0.52, 0.03]}>
          <planeGeometry args={[1.12, 0.49]} />
          <meshStandardMaterial
            map={screenTex}
            emissiveMap={screenTex}
            emissive={cfg.emissive}
            emissiveIntensity={0.55}
            roughness={0.88}
          />
        </mesh>
        {/* Back RGB strip */}
        <mesh position={[0, 0.52, -0.03]}>
          <boxGeometry args={[0.8, 0.04, 0.015]} />
          <meshStandardMaterial color={rgbColor} emissive={rgbColor} emissiveIntensity={1.6} />
        </mesh>
      </group>

      {/* RGB PC Tower on right side of desk */}
      <group position={[1.04, 0.78, -0.14]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.26, 0.5, 0.46]} />
          <meshStandardMaterial color="#09090b" roughness={0.35} metalness={0.5} />
        </mesh>
        {/* Tempered glass window facing inward (-X) */}
        <mesh position={[-0.132, 0.25, 0]}>
          <boxGeometry args={[0.008, 0.42, 0.38]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.7} transparent opacity={0.75} />
        </mesh>
        {/* Pulsing RGB fans & strip */}
        {[0.14, 0.34].map((fy, idx) => (
          <mesh key={idx} position={[0, fy, 0.232]}>
            <torusGeometry args={[0.072, 0.014, 8, 20]} />
            <meshStandardMaterial
              color={idx === 0 ? rgbColor : "#38bdf8"}
              emissive={idx === 0 ? rgbColor : "#0ea5e9"}
              emissiveIntensity={idx === 0 ? rgbPulse1 * 1.5 : rgbPulse2 * 1.5}
            />
          </mesh>
        ))}
        <mesh position={[-0.136, 0.25, 0.14]}>
          <boxGeometry args={[0.008, 0.38, 0.025]} />
          <meshStandardMaterial color={rgbColor} emissive={rgbColor} emissiveIntensity={rgbPulse1 * 1.4} />
        </mesh>
      </group>

      {/* Mechanical RGB Keyboard at z = 0.14 */}
      <group position={[-0.08, 0.788, 0.14]}>
        <mesh position={[0, 0.012, 0]} castShadow>
          <boxGeometry args={[0.5, 0.024, 0.17]} />
          <meshStandardMaterial color="#18181b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.026, 0]}>
          <boxGeometry args={[0.46, 0.012, 0.14]} />
          <meshStandardMaterial color="#27272a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.014, 0.086]}>
          <boxGeometry args={[0.48, 0.008, 0.008]} />
          <meshStandardMaterial color={rgbColor} emissive={rgbColor} emissiveIntensity={1.4} />
        </mesh>
      </group>

      {/* Gaming Mouse */}
      <group position={[0.32, 0.788, 0.14]}>
        <mesh position={[0, 0.018, 0]} geometry={SHARED_GEO.sphere} scale={[0.048, 0.025, 0.075]} castShadow>
          <meshStandardMaterial color="#18181b" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.036, -0.025]}>
          <boxGeometry args={[0.012, 0.008, 0.028]} />
          <meshStandardMaterial color={rgbColor} emissive={rgbColor} emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* Smoothie cup with straw on left edge of desk */}
      <SmoothieCup3D position={[-0.68, 0.78, 0.16]} scale={1.05} />

      {/* Gaming Chair at z = 0.62 facing -Z */}
      <group position={[0, 0, 0.62]}>
        {/* 5-star caster base */}
        {[0, 1, 2, 3, 4].map((idx) => {
          const ang = (idx / 5) * Math.PI * 2;
          return (
            <mesh key={idx} position={[Math.sin(ang) * 0.16, 0.05, Math.cos(ang) * 0.16]} rotation={[0, ang, 0]}>
              <boxGeometry args={[0.05, 0.04, 0.34]} />
              <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.5} />
            </mesh>
          );
        })}
        {/* Gas lift stem */}
        <mesh position={[0, 0.23, 0]} geometry={SHARED_GEO.cyl} scale={[0.04, 0.34, 0.04]}>
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Seat cushion */}
        <mesh position={[0, 0.42, -0.02]} geometry={SHARED_GEO.gamingSeat} castShadow receiveShadow>
          <meshStandardMaterial color="#111827" roughness={0.55} />
        </mesh>
        {/* Racing side bolsters */}
        {[-0.25, 0.25].map((ax) => (
          <group key={ax}>
            <mesh position={[ax, 0.47, -0.02]} castShadow>
              <boxGeometry args={[0.06, 0.07, 0.44]} />
              <meshStandardMaterial color="#ef4444" roughness={0.45} />
            </mesh>
            {/* Armrest */}
            <mesh position={[ax * 1.18, 0.56, -0.02]}>
              <boxGeometry args={[0.035, 0.18, 0.04]} />
              <meshStandardMaterial color="#18181b" roughness={0.4} />
            </mesh>
            <mesh position={[ax * 1.18, 0.65, -0.04]} castShadow>
              <boxGeometry args={[0.075, 0.035, 0.26]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
          </group>
        ))}
        {/* Reclined tall backrest at +Z side of chair */}
        <group position={[0, 0.8, 0.22]} rotation={[0.14, 0, 0]}>
          <mesh geometry={SHARED_GEO.gamingBack} castShadow receiveShadow>
            <meshStandardMaterial color="#111827" roughness={0.55} />
          </mesh>
          {/* Red racing stripes & headrest pillow */}
          {[-0.21, 0.21].map((sx) => (
            <mesh key={sx} position={[sx, 0, -0.048]}>
              <boxGeometry args={[0.07, 0.72, 0.02]} />
              <meshStandardMaterial color="#ef4444" roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, 0.28, -0.065]}>
            <boxGeometry args={[0.26, 0.13, 0.05]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const SweatshopDesk3D: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  tokenNumber: number;
  alive?: boolean;
  screenText?: string;
  screenBg?: string;
  t?: number;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  tokenNumber,
  alive = true,
  screenText,
  screenBg,
  t = 0,
}) => {
  const effectiveText = screenText ?? (alive ? "CODING..." : "OFFLINE");
  const effectiveBg = screenBg ?? (alive ? "#0f172a" : "#18181b");
  const screenLines = useMemo(() => effectiveText.split("\n"), [effectiveText]);
  const laptopTex = useSignTexture(
    screenLines,
    effectiveBg,
    alive ? "#4ade80" : "#ef4444",
    alive ? "#334155" : "#450a0a",
    384,
    240,
    46
  );

  const signLines = alive ? [`Token #${tokenNumber}`] : [`Token #${tokenNumber}`, "DEAD"];
  const signTex = useSignTexture(
    signLines,
    alive ? "#0f172a" : "#1f0909",
    alive ? "#38bdf8" : "#dc2626",
    alive ? "#facc15" : "#7f1d1d",
    512,
    144,
    alive ? 62 : 48
  );

  const signGlow = alive ? 0.75 + Math.sin(t * 4 + tokenNumber) * 0.18 : 0.15;

  return (
    <group position={position} rotation={rotation}>
      {/* Scuffed Cheap Office Tabletop (y = 0.75, width 1.45, depth 0.85) */}
      <mesh position={[0, 0.725, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.05, 0.85]} />
        <meshStandardMaterial color="#78716c" roughness={0.88} />
      </mesh>
      {/* Worn edge molding */}
      <mesh position={[0, 0.725, 0.427]}>
        <boxGeometry args={[1.45, 0.052, 0.012]} />
        <meshStandardMaterial color="#44403c" roughness={0.9} />
      </mesh>
      {/* Thin rusty metal legs */}
      {[-0.65, 0.65].map((lx) =>
        [-0.36, 0.36].map((lz) => (
          <mesh key={`${lx}_${lz}`} position={[lx, 0.35, lz]} castShadow>
            <boxGeometry args={[0.045, 0.7, 0.045]} />
            <meshStandardMaterial color="#57534e" roughness={0.7} metalness={0.4} />
          </mesh>
        ))
      )}

      {/* Scuffed Laptop at z = -0.15, screen facing +Z */}
      <group position={[0, 0.75, -0.15]}>
        <mesh position={[0, 0.012, 0.03]} castShadow>
          <boxGeometry args={[0.42, 0.024, 0.28]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.6} />
        </mesh>
        {/* Keyboard depression */}
        <mesh position={[0, 0.025, 0.02]}>
          <boxGeometry args={[0.36, 0.005, 0.14]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
        {/* Tilted Laptop Lid & Screen */}
        <group position={[0, 0.022, -0.105]} rotation={[-0.18, 0, 0]}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[0.42, 0.28, 0.018]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.14, 0.011]}>
            <planeGeometry args={[0.38, 0.24]} />
            <meshStandardMaterial
              map={laptopTex}
              emissiveMap={laptopTex}
              emissive={alive ? "#38bdf8" : "#991b1b"}
              emissiveIntensity={alive ? 0.65 : 0.12}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Messy Stack of Crumpled Paper */}
      <group position={[-0.47, 0.75, 0.08]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 2.1) * 0.018, 0.006 + i * 0.009, Math.cos(i * 1.7) * 0.015]}
            rotation={[0, (i - 1.5) * 0.16, 0]}
            geometry={SHARED_GEO.paper}
            castShadow
          >
            <meshStandardMaterial color="#e7e5e4" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0.14, 0.04, 0.09]} geometry={SHARED_GEO.crumple} castShadow>
          <meshStandardMaterial color="#d6d3d1" roughness={0.95} />
        </mesh>
        <mesh position={[-0.12, 0.036, 0.16]} geometry={SHARED_GEO.crumple} scale={0.85} castShadow>
          <meshStandardMaterial color="#e7e5e4" roughness={0.95} />
        </mesh>
      </group>

      {/* Energy Drink Can */}
      <group position={[0.46, 0.75, 0.1]}>
        <mesh position={[0, 0.065, 0]} castShadow>
          <cylinderGeometry args={[0.036, 0.036, 0.13, 14]} />
          <meshStandardMaterial color="#16a34a" roughness={0.25} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.131, 0]}>
          <cylinderGeometry args={[0.034, 0.036, 0.008, 14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.065, 0.037]}>
          <boxGeometry args={[0.025, 0.065, 0.005]} />
          <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* Cheap Office Chair at z = 0.56 */}
      <group position={[0, 0, 0.56]}>
        {[0, 1, 2, 3].map((idx) => {
          const ang = (idx / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh key={idx} position={[Math.sin(ang) * 0.13, 0.035, Math.cos(ang) * 0.13]} rotation={[0, ang, 0]}>
              <boxGeometry args={[0.035, 0.03, 0.28]} />
              <meshStandardMaterial color="#27272a" roughness={0.6} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.22, 0]} geometry={SHARED_GEO.cyl} scale={[0.028, 0.36, 0.028]}>
          <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, -0.01]} geometry={SHARED_GEO.cheapSeat} castShadow receiveShadow>
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
        {/* Thin backrest bar & small pad */}
        <mesh position={[0, 0.58, 0.2]}>
          <boxGeometry args={[0.045, 0.34, 0.025]} />
          <meshStandardMaterial color="#27272a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.72, 0.19]} geometry={SHARED_GEO.cheapBack} castShadow>
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
      </group>

      {/* Overhead Token #N Sign on Pole Bracket */}
      <group position={[0, 0.75, -0.38]}>
        <mesh position={[-0.6, 0.54, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 1.08, 10]} />
          <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-0.3, 1.07, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.62, 10]} />
          <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Sign Board */}
        <group position={[0, 1.07, 0.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.88, 0.28, 0.045]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.84, 0.24]} />
            <meshStandardMaterial
              map={signTex}
              emissiveMap={signTex}
              emissive={alive ? "#38bdf8" : "#991b1b"}
              emissiveIntensity={signGlow}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0, -0.025]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.84, 0.24]} />
            <meshStandardMaterial
              map={signTex}
              emissiveMap={signTex}
              emissive={alive ? "#38bdf8" : "#991b1b"}
              emissiveIntensity={signGlow}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const CeilingFan3D: React.FC<{
  position?: [number, number, number];
  speed?: number;
  t?: number;
}> = ({ position = [0, 0, 0], speed = 3, t = 0 }) => {
  const angle = t * speed;
  return (
    <group position={position}>
      {/* Ceiling mount canopy & downrod */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 0.08, 16]} />
        <meshStandardMaterial color="#57534e" roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.36, 12]} />
        <meshStandardMaterial color="#44403c" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* Spinning motor & 3 blades */}
      <group position={[0, -0.4, 0]} rotation={[0, angle, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.16, 0.13, 18]} />
          <meshStandardMaterial color="#78716c" roughness={0.55} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.09, 0]}>
          <sphereGeometry args={[0.09, 14, 12]} />
          <meshStandardMaterial color="#57534e" roughness={0.5} metalness={0.4} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const bAng = (i * Math.PI * 2) / 3;
          return (
            <group key={i} rotation={[0, bAng, 0]}>
              <mesh position={[0.2, 0, 0]}>
                <boxGeometry args={[0.14, 0.018, 0.06]} />
                <meshStandardMaterial color="#44403c" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[0.62, 0, 0]} rotation={[0.16, 0, 0]} castShadow>
                <boxGeometry args={[0.78, 0.018, 0.19]} />
                <meshStandardMaterial color="#5c4028" roughness={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

export const RedLimitButton3D: React.FC<{
  position?: [number, number, number];
  pressed?: boolean;
}> = ({ position = [0, 0, 0], pressed = false }) => {
  const plateTex = useSignTexture(
    ["LIMIT", "REACHED"],
    "#facc15",
    "#111827",
    "#111827",
    384,
    160,
    56
  );

  const buttonY = pressed ? 0.995 : 1.045;
  const stripePositions = [-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24];

  return (
    <group position={position}>
      {/* Steel console base */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.1, 0.62]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Pedestal column */}
      <mesh position={[0, 0.49, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.8, 0.44]} />
        <meshStandardMaterial color="#27272a" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* Top console deck */}
      <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.64, 0.1, 0.56]} />
        <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.45} />
      </mesh>

      {/* Yellow-black hazard trim along front & back edges */}
      {stripePositions.map((sx, idx) => {
        const col = idx % 2 === 0 ? "#facc15" : "#111827";
        return (
          <React.Fragment key={idx}>
            <mesh position={[sx, 0.92, 0.285]}>
              <boxGeometry args={[0.08, 0.105, 0.015]} />
              <meshStandardMaterial color={col} roughness={0.45} />
            </mesh>
            <mesh position={[sx, 0.92, -0.285]}>
              <boxGeometry args={[0.08, 0.105, 0.015]} />
              <meshStandardMaterial color={col} roughness={0.45} />
            </mesh>
          </React.Fragment>
        );
      })}
      {[-0.2, -0.12, -0.04, 0.04, 0.12, 0.2].map((sz, idx) => {
        const col = idx % 2 === 0 ? "#facc15" : "#111827";
        return (
          <React.Fragment key={idx}>
            <mesh position={[-0.325, 0.92, sz]}>
              <boxGeometry args={[0.015, 0.105, 0.08]} />
              <meshStandardMaterial color={col} roughness={0.45} />
            </mesh>
            <mesh position={[0.325, 0.92, sz]}>
              <boxGeometry args={[0.015, 0.105, 0.08]} />
              <meshStandardMaterial color={col} roughness={0.45} />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Front "LIMIT REACHED" nameplate */}
      <mesh position={[0, 0.64, 0.224]}>
        <planeGeometry args={[0.42, 0.18]} />
        <meshStandardMaterial
          map={plateTex}
          emissiveMap={plateTex}
          emissive={pressed ? "#facc15" : "#000000"}
          emissiveIntensity={pressed ? 0.35 : 0}
          roughness={0.4}
        />
      </mesh>

      {/* Button collar */}
      <mesh position={[0, 0.985, 0]}>
        <cylinderGeometry args={[0.21, 0.23, 0.04, 24]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Giant Red Button */}
      <mesh position={[0, buttonY, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.18, 0.1, 24]} />
        <meshStandardMaterial
          color={pressed ? "#ef4444" : "#dc2626"}
          emissive="#ef4444"
          emissiveIntensity={pressed ? 2.2 : 0.3}
          roughness={0.25}
        />
      </mesh>
      {pressed && (
        <mesh position={[0, 0.988, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.215, 0.016, 8, 24]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.0} />
        </mesh>
      )}
    </group>
  );
};
