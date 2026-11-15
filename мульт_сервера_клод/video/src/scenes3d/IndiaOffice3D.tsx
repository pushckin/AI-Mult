import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  CameraRig,
  CeilingFan3D,
  Character3D,
  RedLimitButton3D,
  SweatshopDesk3D,
} from "../components3d/Character3D";
import { makeSignTexture } from "../components3d/SignTexture";
import { CUES, mouthOf } from "../data/timeline";

type EyeMode = "normal" | "red" | "wide" | "dead";
type MoodMode = "neutral" | "scream" | "smile" | "frown";
type HairMode = "messy" | "bald_sides" | "headphones" | "none";
type PoseMode =
  | "idle"
  | "sit_chill"
  | "sit_type"
  | "faceplant"
  | "lie_flat"
  | "megaphoning"
  | "ruler_slap"
  | "phone_call"
  | "panic";

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p, 0, 1);
const seg = (t: number, a: number, b: number) =>
  clamp((t - a) / Math.max(0.0001, b - a));
const ease = (p: number) =>
  p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

interface DeskSlot {
  id: number;
  tokenNumber: number;
  x: number;
  z: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hair: HairMode;
  hairColor: string;
  mustacheColor?: string;
  glasses: boolean;
  redEyes: boolean;
  collapseAt: number;
  seed: number;
}

const SHIRT_PALETTE = [
  "#e2e8f0",
  "#fde047",
  "#fb923c",
  "#a3e635",
  "#c084fc",
  "#f472b6",
  "#94a3b8",
  "#fbbf24",
  "#2dd4bf",
  "#cbd5e1",
];

const PANTS_PALETTE = ["#1e293b", "#334155", "#292524", "#3f3f46", "#1f2937"];

// 16 sweatshop desks in 4 rows: front row leaves clear hero aisles around #418 and RedLimitButton3D
const DESK_LAYOUT: { x: number; z: number; token: number }[] = [
  // Row 4 (back)
  { x: -2.7, z: -4.05, token: 403 },
  { x: -0.9, z: -4.05, token: 404 },
  { x: 0.9, z: -4.05, token: 405 },
  { x: 2.7, z: -4.05, token: 406 },
  // Row 3
  { x: -2.7, z: -2.05, token: 407 },
  { x: -0.9, z: -2.05, token: 408 },
  { x: 0.9, z: -2.05, token: 409 },
  { x: 2.7, z: -2.05, token: 410 },
  // Row 2
  { x: -2.7, z: -0.05, token: 411 },
  { x: -0.9, z: -0.05, token: 412 },
  { x: 0.9, z: -0.05, token: 413 },
  { x: 2.7, z: -0.05, token: 414 },
  // Row 1 (front)
  { x: -3.85, z: 2.2, token: 416 },
  { x: -2.15, z: 2.2, token: 417 },
  { x: 0.0, z: 2.2, token: 418 },
  { x: 3.85, z: 2.2, token: 419 },
];

const DESK_SLOTS: DeskSlot[] = DESK_LAYOUT.map((d, idx) => {
  const isHero = d.token === 418;
  const h1 = hash(idx * 19 + 7);
  const h2 = hash(idx * 31 + 13);
  const h3 = hash(idx * 43 + 5);
  return {
    id: idx,
    tokenNumber: d.token,
    x: d.x,
    z: d.z,
    skinColor: isHero ? "#b87a4b" : h1 > 0.45 ? "#b87a4b" : "#a3683a",
    shirtColor: isHero
      ? "#38bdf8"
      : SHIRT_PALETTE[Math.floor(h2 * SHIRT_PALETTE.length) % SHIRT_PALETTE.length],
    pantsColor: isHero
      ? "#334155"
      : PANTS_PALETTE[Math.floor(h3 * PANTS_PALETTE.length) % PANTS_PALETTE.length],
    hair: isHero
      ? "messy"
      : h2 > 0.78
        ? "headphones"
        : h2 > 0.16
          ? "messy"
          : "bald_sides",
    hairColor: "#171717",
    mustacheColor: !isHero && h3 > 0.62 ? "#1c1917" : undefined,
    glasses: isHero ? true : h1 > 0.68,
    redEyes: isHero ? true : h3 > 0.25,
    collapseAt: isHero ? 51.2 : 51.35 + hash(idx * 17 + 3) * 0.35,
    seed: idx + 1,
  };
});

// ============================================================================
// SWEATSHOP ROOM ARCHITECTURE & PROPS
// ============================================================================

const OfficeRoom3D: React.FC<{
  t: number;
  isSceneE: boolean;
  isSceneG: boolean;
  powerDown: boolean;
  sirenPulse: number;
  indiaSignTex: THREE.CanvasTexture;
  board4000Tex: THREE.CanvasTexture;
  board0Tex: THREE.CanvasTexture;
  posterTex: THREE.CanvasTexture;
}> = ({
  t,
  isSceneE,
  isSceneG,
  powerDown,
  sirenPulse,
  indiaSignTex,
  board4000Tex,
  board0Tex,
  posterTex,
}) => {
  const showZeroTokens = t >= 51.45;
  const flickerVal = Math.sin(t * 47.0) * Math.cos(t * 23.0);
  const tubesLit = !powerDown && !isSceneG && (!isSceneE || flickerVal > -0.35);

  const wallColor = isSceneG
    ? "#5b4f3a"
    : isSceneE
      ? "#8c7a56"
      : "#b8a370";
  const floorColor = isSceneG ? "#141619" : "#22252a";

  return (
    <group>
      {/* Dirty Concrete Floor */}
      <mesh position={[0, -0.04, -0.5]} receiveShadow>
        <boxGeometry args={[14.5, 0.08, 15.0]} />
        <meshStandardMaterial color={floorColor} roughness={0.95} />
      </mesh>
      {/* Concrete Floor Expansion Seams & Oil/Grime Stains */}
      {[-3.2, -1.1, 1.1, 3.2].map((fx, i) => (
        <mesh key={i} position={[fx, 0.002, -0.5]}>
          <boxGeometry args={[0.025, 0.004, 14.0]} />
          <meshStandardMaterial color="#111317" roughness={0.98} />
        </mesh>
      ))}
      {[-3.5, -1.0, 1.5, 3.5].map((fz, i) => (
        <mesh key={i} position={[0, 0.002, fz]}>
          <boxGeometry args={[13.6, 0.004, 0.025]} />
          <meshStandardMaterial color="#111317" roughness={0.98} />
        </mesh>
      ))}

      {/* Back Wall (z = -5.45) */}
      <mesh position={[0, 2.35, -5.45]} receiveShadow>
        <boxGeometry args={[14.5, 4.7, 0.16]} />
        <meshStandardMaterial color={wallColor} roughness={0.92} />
      </mesh>
      {/* Left Wall (x = -5.8) */}
      <mesh position={[-5.8, 2.35, -0.5]} receiveShadow>
        <boxGeometry args={[0.16, 4.7, 15.0]} />
        <meshStandardMaterial color={wallColor} roughness={0.92} />
      </mesh>
      {/* Right Wall (x = +5.8) */}
      <mesh position={[5.8, 2.35, -0.5]} receiveShadow>
        <boxGeometry args={[0.16, 4.7, 15.0]} />
        <meshStandardMaterial color={wallColor} roughness={0.92} />
      </mesh>

      {/* Grimy Baseboards & Mold/Water Stain Patches along Back Wall */}
      <mesh position={[0, 0.14, -5.36]}>
        <boxGeometry args={[14.2, 0.28, 0.04]} />
        <meshStandardMaterial color="#42392c" roughness={0.95} />
      </mesh>
      {[
        [-2.8, 4.1, 1.8, 0.9],
        [2.9, 3.9, 1.6, 1.1],
        [-0.4, 0.9, 2.2, 0.7],
        [1.8, 1.1, 1.4, 0.6],
      ].map(([px, py, pw, ph], idx) => (
        <mesh key={idx} position={[px, py, -5.365]}>
          <planeGeometry args={[pw, ph]} />
          <meshStandardMaterial color="#7b6b49" roughness={0.98} transparent opacity={0.45} />
        </mesh>
      ))}

      {/* Ceiling Slab & Exposed Concrete Girders (y = 4.65) */}
      <mesh position={[0, 4.68, -0.5]}>
        <boxGeometry args={[14.5, 0.12, 15.0]} />
        <meshStandardMaterial color="#3b362e" roughness={0.95} />
      </mesh>
      {[-4.2, -1.8, 0.6, 3.0].map((bz, idx) => (
        <mesh key={idx} position={[0, 4.5, bz]} castShadow>
          <boxGeometry args={[12.0, 0.24, 0.22]} />
          <meshStandardMaterial color="#474137" roughness={0.9} />
        </mesh>
      ))}

      {/* Hanging Fluorescent Tube Fixtures */}
      {[
        [-1.6, -2.6],
        [1.6, -2.6],
        [-1.6, 0.4],
        [1.6, 0.4],
      ].map(([lx, lz], idx) => {
        const isFlickeringOff = !tubesLit || (idx === 2 && Math.sin(t * 31) > 0.88 && !isSceneE);
        return (
          <group key={idx} position={[lx, 4.3, lz]}>
            {/* Mounting Chains */}
            <mesh position={[-0.65, 0.16, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
              <meshStandardMaterial color="#52525b" metalness={0.6} />
            </mesh>
            <mesh position={[0.65, 0.16, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
              <meshStandardMaterial color="#52525b" metalness={0.6} />
            </mesh>
            {/* Rusty Fixture Hood */}
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[1.55, 0.06, 0.2]} />
              <meshStandardMaterial color="#57534e" roughness={0.7} />
            </mesh>
            {/* Glowing Tube */}
            <mesh position={[0, -0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.032, 0.032, 1.44, 10]} />
              <meshStandardMaterial
                color={isFlickeringOff ? "#52525b" : "#fef9c3"}
                emissive={isFlickeringOff ? "#000000" : "#fef08a"}
                emissiveIntensity={isFlickeringOff ? 0 : 1.5}
              />
            </mesh>
          </group>
        );
      })}

      {/* 3 Spinning Ceiling Fans */}
      <CeilingFan3D position={[0, 4.54, -1.0]} speed={8.0} t={t} />
      <CeilingFan3D position={[-2.5, 4.54, -2.9]} speed={9.2} t={t} />
      <CeilingFan3D position={[2.5, 4.54, -2.9]} speed={7.2} t={t} />

      {/* Crooked Duct-Taped Sign: SERVER RACK INDIA-4 */}
      <group position={[0, 3.5, -5.33]} rotation={[0, 0, -0.055]}>
        <mesh position={[0, 0, -0.015]} castShadow>
          <boxGeometry args={[3.05, 0.78, 0.04]} />
          <meshStandardMaterial color="#78350f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[2.95, 0.7]} />
          <meshStandardMaterial
            map={indiaSignTex}
            emissiveMap={indiaSignTex}
            emissive="#fef08a"
            emissiveIntensity={isSceneG ? 0.14 : 0.22}
            roughness={0.65}
          />
        </mesh>
        {/* Peeling Duct Tape Strips at Corners */}
        {[
          [-1.38, 0.34, 0.62],
          [1.38, 0.34, -0.58],
          [-1.36, -0.34, -0.45],
          [1.36, -0.34, 0.52],
        ].map(([tx, ty, rz], idx) => (
          <mesh key={idx} position={[tx, ty, 0.022]} rotation={[0, 0, rz]}>
            <boxGeometry args={[0.36, 0.09, 0.015]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Large Electronic Scoreboard: LIVE TOKENS: 4000 / LIVE TOKENS: 0 */}
      <group position={[0, 2.54, -5.29]}>
        {/* Heavy Dark Metal Housing */}
        <mesh castShadow>
          <boxGeometry args={[3.22, 0.94, 0.14]} />
          <meshStandardMaterial color="#18181b" roughness={0.45} metalness={0.55} />
        </mesh>
        {/* Hazard Yellow Bottom Strip */}
        <mesh position={[0, -0.43, 0.065]}>
          <boxGeometry args={[3.16, 0.06, 0.03]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        {/* LED Display Face */}
        <mesh position={[0, 0.02, 0.075]}>
          <planeGeometry args={[2.98, 0.76]} />
          <meshStandardMaterial
            map={showZeroTokens ? board0Tex : board4000Tex}
            emissiveMap={showZeroTokens ? board0Tex : board4000Tex}
            emissive={showZeroTokens ? "#ef4444" : "#22c55e"}
            emissiveIntensity={showZeroTokens ? 1.45 : 1.05}
            roughness={0.25}
          />
        </mesh>
        {/* Corner Blinking LED Beacon */}
        <mesh position={[1.42, 0.36, 0.08]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial
            color={
              showZeroTokens
                ? Math.sin(t * 14) > 0
                  ? "#ef4444"
                  : "#7f1d1d"
                : "#22c55e"
            }
          />
        </mesh>
        {/* Power Conduit Running Down Wall */}
        <mesh position={[0.85, -1.6, -0.02]}>
          <cylinderGeometry args={[0.025, 0.025, 2.6, 8]} />
          <meshStandardMaterial color="#27272a" roughness={0.7} />
        </mesh>
      </group>

      {/* Wall Motivational Poster */}
      <group position={[-2.55, 2.65, -5.34]} rotation={[0, 0, 0.03]}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.05, 0.72]} />
          <meshStandardMaterial map={posterTex} roughness={0.85} />
        </mesh>
      </group>

      {/* Rusty Wall AC Unit & Breaker Box on Back Wall Sides */}
      <group position={[2.85, 3.15, -5.22]}>
        <mesh castShadow>
          <boxGeometry args={[1.35, 0.56, 0.38]} />
          <meshStandardMaterial color="#d6d3d1" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.14, 0.195]}>
          <boxGeometry args={[1.18, 0.14, 0.02]} />
          <meshStandardMaterial color="#44403c" roughness={0.8} />
        </mesh>
        <mesh position={[0.52, 0.16, 0.195]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color={powerDown || isSceneG ? "#450a0a" : "#ef4444"} />
        </mesh>
      </group>

      <group position={[-4.2, 2.35, -5.28]}>
        <mesh castShadow>
          <boxGeometry args={[0.68, 0.92, 0.18]} />
          <meshStandardMaterial color="#475569" roughness={0.65} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.1, 0.095]}>
          <boxGeometry args={[0.14, 0.22, 0.03]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
      </group>

      {/* Dusty High Barred Windows on Left & Right Walls */}
      {[-5.7, 5.7].map((wx, wi) => (
        <group
          key={wi}
          position={[wx, 2.95, -1.6]}
          rotation={[0, wi === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
        >
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[2.8, 1.15]} />
            <meshBasicMaterial
              color={isSceneG || powerDown ? "#1f0d12" : isSceneE ? "#451a14" : "#d97706"}
            />
          </mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((bx, bi) => (
            <mesh key={bi} position={[bx, 0, 0.04]}>
              <cylinderGeometry args={[0.022, 0.022, 1.18, 6]} />
              <meshStandardMaterial color="#1c1917" metalness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Red Emergency Siren Beacons on Back Wall */}
      {[-2.05, 2.05].map((sx, idx) => {
        const active = isSceneE && !powerDown;
        return (
          <group key={idx} position={[sx, 3.95, -5.26]}>
            <mesh position={[0, 0, -0.05]}>
              <boxGeometry args={[0.24, 0.24, 0.12]} />
              <meshStandardMaterial color="#18181b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.1, 0.14, 14]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#ef4444"
                emissiveIntensity={active ? 1.2 + sirenPulse * 2.4 : isSceneG ? 0.35 : 0.08}
                transparent
                opacity={0.9}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// HANGING CABLE BUNDLES, ROTARY PHONE STAND & SWEATSHOP CLUTTER
// ============================================================================

const HangingCablesAndClutter3D: React.FC<{
  t: number;
  isSceneG: boolean;
  boxTex: THREE.CanvasTexture;
}> = ({ t, isSceneG, boxTex }) => {
  const cableGeometries = useMemo(() => {
    const curves = [
      // Back wall overhead saggy bundles
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.6, 4.5, -4.9),
        new THREE.Vector3(-3.3, 3.25, -4.85),
        new THREE.Vector3(-1.95, 4.25, -4.95),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.95, 4.3, -4.95),
        new THREE.Vector3(3.2, 3.15, -4.85),
        new THREE.Vector3(4.5, 4.45, -4.9),
      ]),
      // High ceiling cross-room power loops (safe above camera sightlines)
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.2, 4.45, -2.5),
        new THREE.Vector3(-2.1, 3.55, -2.2),
        new THREE.Vector3(0.0, 3.95, -2.05),
        new THREE.Vector3(2.4, 3.45, -2.3),
        new THREE.Vector3(4.2, 4.45, -2.5),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.3, 4.45, 0.35),
        new THREE.Vector3(-2.2, 3.65, 0.55),
        new THREE.Vector3(0.1, 4.05, 0.45),
        new THREE.Vector3(2.3, 3.55, 0.5),
        new THREE.Vector3(4.3, 4.45, 0.35),
      ]),
      // Vertical dangling wire bundle on left side
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.9, 4.5, -1.6),
        new THREE.Vector3(-3.82, 2.8, -1.55),
        new THREE.Vector3(-3.95, 1.15, -1.65),
        new THREE.Vector3(-3.75, 0.04, -1.55),
      ]),
      // Vertical dangling wire bundle on right side
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(3.85, 4.5, -1.3),
        new THREE.Vector3(3.75, 2.75, -1.35),
        new THREE.Vector3(3.9, 1.0, -1.28),
        new THREE.Vector3(3.72, 0.04, -1.32),
      ]),
      // Floor power cable snaking from right corner to RedLimitButton3D
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(4.1, 0.03, -2.0),
        new THREE.Vector3(3.15, 0.03, 0.4),
        new THREE.Vector3(2.65, 0.03, 1.75),
        new THREE.Vector3(2.2, 0.04, 2.4),
      ]),
    ];

    return curves.map((c, idx) => new THREE.TubeGeometry(c, 28, idx < 4 ? 0.036 : 0.028, 7, false));
  }, []);

  useEffect(() => {
    return () => {
      cableGeometries.forEach((g) => g.dispose());
    };
  }, [cableGeometries]);

  const smokeMotes = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: (hash(i * 11 + 2) - 0.5) * 6.5,
        y: 0.9 + hash(i * 23 + 4) * 2.5,
        z: -3.2 + hash(i * 37 + 9) * 6.2,
        r: 0.04 + hash(i * 41 + 1) * 0.05,
        phase: hash(i * 53 + 3) * Math.PI * 2,
      })),
    [],
  );

  return (
    <group>
      {/* Cable Bundles */}
      {cableGeometries.map((geo, idx) => (
        <mesh key={idx} geometry={geo} castShadow>
          <meshStandardMaterial color={idx % 2 === 0 ? "#09090b" : "#1c1917"} roughness={0.7} />
        </mesh>
      ))}

      {/* Cardboard Boxes Stacked in Back Corners */}
      {[
        [-4.55, 0.34, -4.65, 0.12],
        [-4.45, 0.92, -4.68, -0.18],
        [4.5, 0.34, -4.6, -0.08],
      ].map(([bx, by, bz, ry], idx) => (
        <group key={idx} position={[bx, by, bz]} rotation={[0, ry, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.72, 0.58, 0.62]} />
            <meshStandardMaterial color="#a16207" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.02, 0.315]}>
            <planeGeometry args={[0.52, 0.24]} />
            <meshStandardMaterial map={boxTex} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Floor Power Strips & Scattered Crumpled Paper Balls */}
      {[
        [-0.45, 1.55],
        [1.1, -0.65],
        [-1.35, -2.55],
      ].map(([sx, sz], idx) => (
        <group key={idx} position={[sx, 0.02, sz]} rotation={[0, idx * 0.6, 0]}>
          <mesh>
            <boxGeometry args={[0.36, 0.035, 0.08]} />
            <meshStandardMaterial color="#e7e5e4" roughness={0.6} />
          </mesh>
          <mesh position={[0.13, 0.02, 0]}>
            <boxGeometry args={[0.03, 0.01, 0.03]} />
            <meshBasicMaterial color={isSceneG ? "#450a0a" : "#f97316"} />
          </mesh>
        </group>
      ))}

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            -1.9 + hash(i * 13 + 1) * 3.8,
            0.04,
            -2.4 + hash(i * 29 + 5) * 5.2,
          ]}
        >
          <icosahedronGeometry args={[0.045, 0]} />
          <meshStandardMaterial color="#d6d3d1" roughness={0.95} />
        </mesh>
      ))}

      {/* Hazy Smoke / Dust Motes in Scene G */}
      {isSceneG &&
        smokeMotes.map((m, idx) => (
          <mesh
            key={idx}
            position={[
              m.x + Math.sin(t * 0.55 + m.phase) * 0.2,
              m.y + Math.cos(t * 0.4 + m.phase) * 0.12,
              m.z,
            ]}
          >
            <sphereGeometry args={[m.r, 8, 6]} />
            <meshBasicMaterial color="#fca5a5" transparent opacity={0.18} />
          </mesh>
        ))}
    </group>
  );
};

const RotaryPhoneStand3D: React.FC<{
  position: [number, number, number];
  handsetPickedUp: boolean;
}> = ({ position, handsetPickedUp }) => (
  <group position={position}>
    {/* Scarred Tall Metal Stand (tabletop y = 0.74) */}
    <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.48, 0.04, 0.42]} />
      <meshStandardMaterial color="#57534e" roughness={0.8} />
    </mesh>
    {[
      [-0.2, -0.17],
      [0.2, -0.17],
      [-0.2, 0.17],
      [0.2, 0.17],
    ].map(([lx, lz], idx) => (
      <mesh key={idx} position={[lx, 0.36, lz]} castShadow>
        <boxGeometry args={[0.035, 0.72, 0.035]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.6} />
      </mesh>
    ))}

    {/* Vintage Black Rotary Phone Base */}
    <group position={[0, 0.74, 0]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.22]} />
        <meshStandardMaterial color="#18181b" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Slanted Rotary Dial Face */}
      <mesh position={[0, 0.085, 0.085]} rotation={[-0.65, 0, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.02, 16]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.095, 0.092]} rotation={[-0.65, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.015, 12]} />
        <meshStandardMaterial color="#09090b" roughness={0.35} />
      </mesh>
      {/* Cradle Forks */}
      {[-0.065, 0.065].map((cx, i) => (
        <mesh key={i} position={[cx, 0.14, -0.04]}>
          <boxGeometry args={[0.024, 0.045, 0.05]} />
          <meshStandardMaterial color="#52525b" metalness={0.5} />
        </mesh>
      ))}
      {/* Handset rests on cradle until Boss picks it up at phone_pickup */}
      {!handsetPickedUp && (
        <group position={[0, 0.175, -0.04]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <boxGeometry args={[0.045, 0.24, 0.045]} />
            <meshStandardMaterial color="#09090b" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.11, -0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.052, 0.036, 0.045, 12]} />
            <meshStandardMaterial color="#09090b" roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.11, -0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.052, 0.036, 0.045, 12]} />
            <meshStandardMaterial color="#09090b" roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  </group>
);

// ============================================================================
// MAIN INDIA OFFICE 3D COMPONENT (Scenes C, E, G)
// ============================================================================

export const IndiaOffice3D: React.FC<{ t: number }> = ({ t }) => {
  // Memoized Sign & Wall Textures with guaranteed cleanup
  const indiaSignTex = useMemo(
    () =>
      makeSignTexture(
        ["SERVER RACK INDIA-4"],
        "#fef08a",
        "#1c1917",
        "#78350f",
        640,
        160,
        44,
      ),
    [],
  );
  const board4000Tex = useMemo(
    () =>
      makeSignTexture(
        ["LIVE TOKENS: 4000"],
        "#052e16",
        "#4ade80",
        "#14532d",
        640,
        176,
        52,
      ),
    [],
  );
  const board0Tex = useMemo(
    () =>
      makeSignTexture(
        ["LIVE TOKENS: 0"],
        "#450a0a",
        "#ef4444",
        "#7f1d1d",
        640,
        176,
        56,
      ),
    [],
  );
  const posterTex = useMemo(
    () =>
      makeSignTexture(
        ["SMILE & CODE!", "1 TOKEN = 1 DEV"],
        "#fef3c7",
        "#7c2d12",
        "#92400e",
        384,
        256,
        40,
      ),
    [],
  );
  const boxTex = useMemo(
    () =>
      makeSignTexture(
        ["JUNIORS", "FRAGILE"],
        "#d97706",
        "#1c1917",
        "#451a03",
        256,
        128,
        42,
      ),
    [],
  );

  useEffect(() => {
    return () => {
      indiaSignTex.dispose();
      board4000Tex.dispose();
      board0Tex.dispose();
      posterTex.dispose();
      boxTex.dispose();
    };
  }, [indiaSignTex, board4000Tex, board0Tex, posterTex, boxTex]);

  // Scene routing across C (17.75..41.78), E (48.54..52.40), G (60.89..69.21)
  const isSceneE = t >= 45.0 && t < 56.0;
  const isSceneG = t >= 56.0;
  const powerDown = t >= 51.9;
  const buttonPressed = t >= 51.9;
  const sirenPulse =
    isSceneE && !powerDown
      ? Math.pow(Math.max(0, Math.sin((t - 48.29) * 8.2)), 2)
      : 0;

  // -------------------- CAMERA CHOREOGRAPHY (9:16 Vertical Shorts) --------------------
  let camPos: [number, number, number] = [0.1, 3.05, 6.2];
  let camLook: [number, number, number] = [0, 1.55, -1.4];
  let camFov = 50;
  let camShake = 0;

  if (!isSceneE && !isSceneG) {
    // SCENE C (17.75 .. 41.78)
    if (t < 20.5) {
      // Wide establishing panorama of the muggy sweatshop, cables & desks
      const p = ease(seg(t, 17.75, 20.5));
      camPos = [lerp(0.15, -0.08, p), lerp(3.15, 2.75, p), lerp(6.2, 5.55, p)];
      camLook = [lerp(0, 0.35, p), lerp(1.65, 1.55, p), lerp(-1.4, -0.5, p)];
      camFov = 50;
    } else if (t < 25.25) {
      // Push in onto Overseer screaming into megaphone (CUES.c_boss1)
      if (t < 22.6) {
        const p = ease(seg(t, 20.5, 22.6));
        camPos = [lerp(-0.08, 1.15, p), lerp(2.75, 1.66, p), lerp(5.55, 3.9, p)];
        camLook = [lerp(0.35, 1.15, p), lerp(1.55, 1.45, p), lerp(-0.5, 1.45, p)];
        camFov = lerp(50, 45, p);
      } else {
        const p = ease(seg(t, 22.6, 25.25));
        camPos = [lerp(1.15, 1.08, p), lerp(1.66, 1.6, p), lerp(3.9, 3.55, p)];
        camLook = [1.15, 1.45, 1.45];
        camFov = lerp(45, 44, p);
      }
      if (t >= 22.1) {
        camShake = 1.6;
      }
    } else if (t < 33.4) {
      // Expressive 3/4 front close-up on Token #418 showing BOTH laptop screen & crying face with clean aisle behind
      const p = ease(seg(t, 25.25, 33.21));
      camPos = [lerp(2.08, 1.92, p), lerp(1.62, 1.58, p), lerp(2.86, 2.78, p)];
      camLook = [0.0, 1.28, 2.68];
      camFov = lerp(52, 50, p);
    } else {
      // Boss walks up to #418's desk and slams wooden ruler (CUES.c_boss2)
      const p = ease(seg(t, 33.4, 41.58));
      camPos = [lerp(-1.62, -1.56, p), lerp(1.44, 1.46, p), lerp(1.38, 1.48, p)];
      camLook = [0.48, 1.26, 2.46];
      camFov = 55;

      // Exact camera shakes on ruler_slap SFX at 33.66s & 34.11s
      const slap1 = t >= 33.66 && t < 33.94 ? 7.5 * (1 - (t - 33.66) / 0.28) : 0;
      const slap2 = t >= 34.11 && t < 34.39 ? 7.5 * (1 - (t - 34.11) / 0.28) : 0;
      const shoutTremor = t >= 34.4 && t < 41.58 ? 0.8 : 0;
      camShake = Math.max(slap1, slap2, shoutTremor);
    }
  } else if (isSceneE) {
    // SCENE E (48.54 .. 52.40): Rust Panic & Collapse
    if (t < 49.08) {
      // Tight reaction on #418 reading "REWRITE TO RUST!!"
      const p = ease(seg(t, 48.54, 49.08));
      camPos = [lerp(2.15, 2.02, p), lerp(1.64, 1.60, p), lerp(2.92, 2.86, p)];
      camLook = [0.0, lerp(1.26, 1.30, p), 2.68];
      camFov = lerp(53, 51, p);
      camShake = 1.2;
    } else if (t < 51.2) {
      // #418 panics seated screaming "ЕБАЛ Я В РОТ ЭТОТ РАСТ!!!" — clean framing without cropping head
      const p = ease(seg(t, 49.08, 51.0));
      camPos = [lerp(2.02, 1.88, p), lerp(1.60, 1.56, p), lerp(2.86, 2.78, p)];
      camLook = [0.0, 1.30, 2.70];
      camFov = lerp(52, 50, p);
      camShake = 3.8;
    } else if (t < 51.8) {
      // 51.20 faceplant -> 51.35..51.70 domino collapse wave across whole sweatshop
      if (t < 51.36) {
        camPos = [1.46, 1.58, 2.85];
        camLook = [0.0, 1.06, 2.4];
        camFov = 50;
      } else {
        const p = ease(seg(t, 51.36, 51.74));
        camPos = [lerp(1.46, 0.35, p), lerp(1.58, 2.75, p), lerp(2.85, 5.55, p)];
        camLook = [0.0, lerp(1.06, 1.38, p), lerp(2.4, -0.75, p)];
        camFov = lerp(50, 51, p);
      }
      const fpShake = t >= 51.2 && t < 51.42 ? 8.0 * (1 - (t - 51.2) / 0.22) : 0;
      const thudShake = t >= 51.52 && t < 51.72 ? 5.0 * (1 - (t - 51.52) / 0.2) : 0;
      camShake = Math.max(fpShake, thudShake);
    } else {
      // 51.80..52.40: Boss smashes RedLimitButton3D — front 3/4 view showing Boss face & button smash
      camPos = [3.25, 1.76, 4.62];
      camLook = [1.9, 1.26, 2.38];
      camFov = 48;
      camShake = t >= 51.9 && t < 52.16 ? 7.0 * (1 - (t - 51.9) / 0.26) : 0;
    }
  } else {
    // SCENE G (60.89 .. 69.21): Boss calling employment exchange + crane pull-out
    if (t < CUES.g_end.start) {
      const p = ease(seg(t, 60.89, CUES.g_end.start));
      camPos = [lerp(1.58, 1.52, p), lerp(1.62, 1.65, p), lerp(5.45, 5.6, p)];
      camLook = [lerp(1.56, 1.54, p), lerp(1.32, 1.30, p), 2.22];
      camFov = 50;
    } else {
      const p = ease(seg(t, CUES.g_end.start, CUES.g_end.end));
      camPos = [lerp(1.52, 0.0, p), lerp(1.68, 3.85, p), lerp(5.3, 7.65, p)];
      camLook = [lerp(1.54, 0.0, p), lerp(1.28, 1.2, p), lerp(2.22, -1.4, p)];
      camFov = lerp(48, 52, p);
    }
  }

  // -------------------- BOSS STATE --------------------
  let bossPos: [number, number, number] = [1.15, 0, 1.45];
  let bossYaw = -0.25;
  let bossPose: PoseMode = "idle";
  let bossMood: MoodMode = "neutral";
  let bossEyes: EyeMode = "normal";
  let bossBrow = -0.5;
  let bossMouth = 0;
  let bossHeadTilt = 0;
  let bossMegaphone = false;
  let bossRuler = false;
  let bossRotaryPhone = false;
  let bossSeed = 0;

  if (!isSceneE && !isSceneG) {
    if (t < 25.25) {
      bossPos = [1.15, 0, 1.45];
      bossYaw = -0.25;
      bossPose = "megaphoning";
      bossMood = "scream";
      bossEyes = "normal";
      bossBrow = -0.8;
      bossMouth = mouthOf("boss", t);
      bossMegaphone = true;
    } else if (t < 33.4) {
      // Parked out of #418 close-up camera path
      bossPos = [1.35, 0, 0.85];
      bossYaw = -0.6;
      bossPose = "idle";
      bossMood = "frown";
      bossBrow = -0.7;
      bossRuler = true;
    } else {
      bossPos = [1.05, 0, 2.5];
      bossYaw = -Math.PI * 0.56;
      bossPose = "ruler_slap";
      bossMood = "scream";
      bossEyes = "wide";
      bossBrow = -0.9;
      bossMouth = mouthOf("boss", t);
      bossRuler = true;
      bossSeed = 0;
    }
  } else if (isSceneE) {
    if (t < 51.75) {
      bossPos = [1.85, 0, 1.1];
      bossYaw = -0.35;
      bossPose = "idle";
      bossMood = "frown";
      bossEyes = "wide";
      bossBrow = -0.7;
    } else {
      bossPos = [1.55, 0, 2.25];
      bossYaw = Math.PI * 0.32;
      bossMood = "frown";
      bossEyes = "wide";
      bossBrow = -0.8;
      // seed = 4.56 aligns ruler_slap downstroke impact cycle with t = 51.90s
      bossSeed = 4.56;
      bossPose = t >= 51.78 && t < 51.98 ? "ruler_slap" : "idle";
    }
  } else {
    bossPos = [1.36, 0, 2.18];
    bossYaw = -0.35;
    bossPose = "phone_call";
    bossMood = "neutral";
    bossEyes = "normal";
    bossBrow = -0.25;
    bossHeadTilt = 0.08;
    bossMouth = mouthOf("boss", t);
    bossRotaryPhone = true;
  }

  // -------------------- LIGHTING PALETTE PER SCENE --------------------
  let bgHex = "#2a241b";
  let fogHex = "#362f23";
  let ambientIntensity = 0.72;
  let ambientColor = "#fef3c7";
  let keyIntensity = 1.35;
  let keyColor = "#fffbeb";
  let fillIntensity = 0.55;
  let fillColor = "#7dd3fc";

  if (isSceneE) {
    if (!powerDown) {
      bgHex = "#2b0b0e";
      fogHex = "#3a0d11";
      ambientIntensity = 0.42;
      ambientColor = "#fecaca";
      keyIntensity = 0.95;
      keyColor = "#fed7aa";
      fillIntensity = 0.45;
      fillColor = "#fca5a5";
    } else {
      bgHex = "#18080a";
      fogHex = "#220b0d";
      ambientIntensity = 0.28;
      ambientColor = "#fca5a5";
      keyIntensity = 0.75;
      keyColor = "#fecaca";
      fillIntensity = 0.25;
      fillColor = "#ef4444";
    }
  } else if (isSceneG) {
    bgHex = "#14090b";
    fogHex = "#1f0d10";
    ambientIntensity = 0.3;
    ambientColor = "#fca5a5";
    keyIntensity = 0.85;
    keyColor = "#fed7aa";
    fillIntensity = 0.3;
    fillColor = "#dc2626";
  }

  return (
    <>
      <color attach="background" args={[bgHex]} />
      <fog attach="fog" args={[fogHex, isSceneG ? 6 : 8, isSceneG ? 20 : 24]} />

      <CameraRig
        pos={camPos}
        lookAt={camLook}
        fov={camFov}
        shake={camShake}
        t={t}
      />

      {/* Base Room & Key Lighting */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[2.5, 4.4, 3.8]}
        intensity={keyIntensity}
        color={keyColor}
        castShadow
      />
      <directionalLight
        position={[-2.8, 3.0, 2.2]}
        intensity={fillIntensity}
        color={fillColor}
      />

      {/* Fluorescent Overhead Glow (Scene C) / Pulsing Red Emergency Sirens (Scene E & G) */}
      {!isSceneE && !isSceneG ? (
        <>
          <pointLight position={[0, 4.1, -1.6]} color="#fef08a" intensity={2.2} distance={11} />
          <pointLight position={[0, 3.6, 1.8]} color="#fde68a" intensity={1.8} distance={9} />
        </>
      ) : (
        <>
          <pointLight
            position={[-2.0, 3.8, -3.5]}
            color="#ef4444"
            intensity={isSceneE && !powerDown ? 3.5 + sirenPulse * 6.5 : 2.2}
            distance={14}
          />
          <pointLight
            position={[2.0, 3.8, -3.5]}
            color="#dc2626"
            intensity={isSceneE && !powerDown ? 3.5 + sirenPulse * 6.5 : 2.2}
            distance={14}
          />
          <pointLight
            position={[0.4, 3.5, 2.1]}
            color="#ef4444"
            intensity={isSceneE && !powerDown ? 2.4 + sirenPulse * 4.5 : 1.8}
            distance={10}
          />
        </>
      )}

      {/* Architectural Shell, Signs, Scoreboard & Ceiling Fans */}
      <OfficeRoom3D
        t={t}
        isSceneE={isSceneE}
        isSceneG={isSceneG}
        powerDown={powerDown}
        sirenPulse={sirenPulse}
        indiaSignTex={indiaSignTex}
        board4000Tex={board4000Tex}
        board0Tex={board0Tex}
        posterTex={posterTex}
      />

      {/* Hanging Cable Spaghetti, Boxes & Smog Motes */}
      <HangingCablesAndClutter3D t={t} isSceneG={isSceneG} boxTex={boxTex} />

      {/* Red LIMIT REACHED Pedestal & Rotary Phone Stand beside Front Row */}
      <RedLimitButton3D position={[2.2, 0, 2.4]} pressed={buttonPressed} />
      <RotaryPhoneStand3D
        position={[2.02, 0, 1.62]}
        handsetPickedUp={t >= 60.69}
      />

      {/* 16 Sweatshop Desks + Seated Indian Programmers (1 Token = 1 Human) */}
      {DESK_SLOTS.map((slot) => {
        const isHero = slot.tokenNumber === 418;
        const alive = t < slot.collapseAt;

        let screenText = "WAITING...";
        let screenBg = "#0f172a";
        if (isSceneG || powerDown) {
          screenText = "LIMIT: 0\nOFFLINE";
          screenBg = "#18181b";
        } else if (isSceneE) {
          screenText = "REWRITE TO\nRUST!!";
          screenBg = "#b91c1c";
        } else if (t >= 18.2) {
          if (isHero) {
            screenText = "NO BRACKETS?!";
            screenBg = "#7f1d1d";
          } else {
            screenText =
              slot.id % 2 === 0 ? "500 LINES\nFIX BUGS!" : "DEF FIX():\nERROR!";
            screenBg = slot.id % 3 === 0 ? "#3f1d1d" : "#1e293b";
          }
        }

        // Character pose & expression
        let pose: PoseMode = "sit_chill";
        let eyes: EyeMode = slot.redEyes ? "red" : "normal";
        let brow = -0.35;
        let mood: MoodMode = "frown";
        let mouthOpen = 0;
        let tears = 0;
        let charYaw = Math.PI;
        let headTurn = 0;
        let headTilt = 0;
        let lookX = 0;
        let lookY = 0;

        if (!alive) {
          pose = "faceplant";
          eyes = "dead";
          mood = "frown";
          brow = 0;
        } else if (isHero) {
          if (isSceneE) {
            if (t < 49.05) {
              pose = "sit_type";
              eyes = "wide";
              brow = 0.75;
              mood = "frown";
              charYaw = Math.PI - 0.55;
              headTurn = -0.35;
              headTilt = -0.06;
            } else {
              pose = "panic";
              eyes = "wide";
              brow = -0.9;
              mood = "scream";
              mouthOpen = Math.max(0.4, mouthOf("w418", t));
              tears = 0.75;
              charYaw = Math.PI - 0.95;
              headTurn = -0.52;
              headTilt = -0.06;
            }
          } else if (t < 18.2) {
            pose = "sit_chill";
            eyes = "red";
            brow = -0.5;
            mood = "frown";
            headTilt = 0.22;
          } else if (t < 25.25) {
            pose = "sit_type";
            eyes = "red";
            brow = -0.6;
            mood = "frown";
            tears = 0.3;
          } else if (t < 33.4) {
            pose = "sit_type";
            eyes = "red";
            tears = 0.9;
            brow = -0.8;
            mood = "frown";
            mouthOpen = mouthOf("w418", t);
            charYaw = Math.PI - 0.92;
            headTurn = -0.52 + Math.sin(t * 4.8) * 0.06;
            headTilt = 0.06;
            lookX = 0.05;
          } else {
            pose = "sit_type";
            eyes = "wide";
            tears = 0.45;
            brow = 0.6;
            mood = "frown";
            headTurn = 0.3;
            headTilt = 0.14;
            lookX = -0.55;
            lookY = 0.25;
          }
        } else {
          // Background Indian coders
          if (isSceneE) {
            pose = t >= 49.4 && slot.id % 3 === 0 ? "panic" : "sit_type";
            eyes = "wide";
            brow = -0.7;
            mood = slot.id % 3 === 0 ? "scream" : "frown";
            mouthOpen = slot.id % 3 === 0 ? 0.55 : 0.15;
          } else if (t < 18.2) {
            pose = "sit_chill";
            headTilt = 0.25;
          } else {
            pose = "sit_type";
            headTurn = Math.sin(t * 2.1 + slot.seed) * 0.08;
          }
        }

        return (
          <group key={slot.id}>
            <SweatshopDesk3D
              position={[slot.x, 0, slot.z]}
              tokenNumber={slot.tokenNumber}
              alive={alive}
              screenText={screenText}
              screenBg={screenBg}
              t={t}
            />
            <Character3D
              position={[slot.x, 0, slot.z + 0.56]}
              yaw={charYaw}
              skinColor={slot.skinColor}
              shirtColor={slot.shirtColor}
              pantsColor={slot.pantsColor}
              hair={slot.hair}
              hairColor={slot.hairColor}
              mustacheColor={slot.mustacheColor}
              glasses={slot.glasses}
              eyes={eyes}
              brow={brow}
              mood={mood}
              mouthOpen={mouthOpen}
              tears={tears}
              headTurn={headTurn}
              headTilt={headTilt}
              lookX={lookX}
              lookY={lookY}
              pose={pose}
              seated
              t={t}
              seed={slot.seed}
            />
          </group>
        );
      })}

      {/* Overseer / Boss */}
      <Character3D
        position={bossPos}
        yaw={bossYaw}
        scale={1.06}
        skinColor="#9a6238"
        shirtColor="#dc2626"
        pantsColor="#1e293b"
        tieColor="#facc15"
        hair="bald_sides"
        hairColor="#1c1917"
        mustacheColor="#1c1917"
        eyes={bossEyes}
        brow={bossBrow}
        mood={bossMood}
        mouthOpen={bossMouth}
        headTilt={bossHeadTilt}
        pose={bossPose}
        holdMegaphone={bossMegaphone}
        holdRuler={bossRuler}
        holdRotaryPhone={bossRotaryPhone}
        t={t}
        seed={bossSeed}
      />
    </>
  );
};
