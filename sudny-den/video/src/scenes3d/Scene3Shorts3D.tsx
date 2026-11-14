import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUES, getMouthOpen, SCENES } from "../data/scene1Timeline";
import { Character3D, EyeMode, Heart3D, MoodMode, PoseMode } from "../components3d/Character3D";
import { makeSignTexture } from "../components3d/SignTexture";

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p, 0, 1);
const seg = (t: number, a: number, b: number) => clamp((t - a) / Math.max(0.0001, b - a));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
const easeIn = (p: number) => Math.pow(clamp(p), 2.2);

// Deterministic 3D Camera Rig for Vertical 9:16 Shorts
const CameraRig: React.FC<{
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

// -------------------- 1. OVERHEAD SURGICAL LAMP WITH EMERGENCY BEACON --------------------
const OverheadSurgicalLamp3D: React.FC<{
  position: [number, number, number];
  isBlackout: boolean;
  whiteIntensity: number;
  emergencyIntensity: number;
  t: number;
}> = ({ position, isBlackout, whiteIntensity, emergencyIntensity, t }) => {
  const rotBeacon = (t - CUES.s3_blackout) * 4.2;

  return (
    <group position={position}>
      {/* Ceiling Flange Mount */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Chrome Support Boom Arms */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.18, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Main Reflector Saucer Dish */}
      <group position={[0, -0.15, 0]}>
        {/* Outer Dish Shell */}
        <mesh castShadow>
          <cylinderGeometry args={[0.62, 0.45, 0.16, 24]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Inner Reflector Face */}
        <mesh position={[0, -0.075, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.02, 24]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* 6 Peripheral LED Lamp Pods */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const ang = (i * Math.PI * 2) / 6;
          const px = Math.sin(ang) * 0.38;
          const pz = Math.cos(ang) * 0.38;
          return (
            <mesh key={i} position={[px, -0.082, pz]}>
              <cylinderGeometry args={[0.075, 0.075, 0.015, 12]} />
              <meshStandardMaterial
                color={!isBlackout ? "#fef08a" : "#475569"}
                emissive={!isBlackout ? "#fef08a" : "#000000"}
                emissiveIntensity={!isBlackout ? 0.9 : 0}
              />
            </mesh>
          );
        })}

        {/* Center Emergency Dome Beacon */}
        <mesh position={[0, -0.088, 0]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive={isBlackout ? "#ef4444" : "#7f1d1d"}
            emissiveIntensity={isBlackout ? 1.8 : 0.2}
            roughness={0.2}
          />
        </mesh>

        {/* Surgical White Spotlight pointing onto Table (before blackout) */}
        {!isBlackout && whiteIntensity > 0 && (
          <spotLight
            position={[0, -0.1, 0]}
            target-position={[0, -2.83, 0.52]}
            color="#ffffff"
            intensity={whiteIntensity}
            angle={0.55}
            penumbra={0.25}
            distance={9.0}
            castShadow
          />
        )}

        {/* Red Emergency Beacon Light (after blackout) */}
        {isBlackout && (
          <>
            <pointLight
              position={[0, -0.12, 0]}
              color="#ef4444"
              intensity={emergencyIntensity}
              distance={16.0}
            />
            {/* Rotating emergency beam across the room */}
            <spotLight
              position={[0, -0.12, 0]}
              target-position={[Math.sin(rotBeacon) * 4, -2.5, Math.cos(rotBeacon) * 4]}
              color="#dc2626"
              intensity={emergencyIntensity * 0.85}
              angle={0.7}
              penumbra={0.5}
              distance={13.0}
            />
          </>
        )}
      </group>
    </group>
  );
};

// -------------------- 2. HEART MONITOR STAND WITH ECG DISPLAY & IV DRIP --------------------
// Positioned at [-1.68, 0, -1.55] (angled +0.35 inward, console raised to y = 2.02 cleanly above Surgeon's head/cap)
const HeartMonitorStand3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  t: number;
  stableTex: THREE.Texture;
  alertTex: THREE.Texture;
}> = ({ position, rotation = [0, 0.35, 0], t, stableTex, alertTex }) => {
  const isRemoved = t >= 128.0;
  const pulseRhythm = (t * (62 / 60)) % 1;
  const beepFlash = pulseRhythm < 0.15;
  const alertFlash = (t * 4) % 1 > 0.5;

  return (
    <group position={position} rotation={rotation}>
      {/* 5-Star Caster Base on Floor */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const ang = (i * Math.PI * 2) / 5;
        const bx = Math.sin(ang) * 0.28;
        const bz = Math.cos(ang) * 0.28;
        return (
          <group key={i}>
            <mesh position={[bx * 0.5, 0.04, bz * 0.5]} rotation={[0, -ang, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.016, 0.28, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[bx, 0.03, bz]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshStandardMaterial color="#09090b" roughness={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* Vertical Chrome Pole (tall pole supporting raised console at y = 2.02) */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 2.9, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Monitor Console Unit (Raised to y = 2.02 so it sits cleanly ABOVE Surgeon's head/cap) */}
      <group position={[0, 2.02, 0]}>
        {/* Main chassis box */}
        <mesh castShadow>
          <boxGeometry args={[0.56, 0.42, 0.22]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* Bezel frame */}
        <mesh position={[0, 0, 0.112]}>
          <boxGeometry args={[0.52, 0.38, 0.01]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
        {/* Screen with Canvas Texture */}
        <mesh position={[0, 0.02, 0.118]}>
          <planeGeometry args={[0.48, 0.3]} />
          <meshBasicMaterial map={isRemoved ? alertTex : stableTex} />
        </mesh>

        {/* Dynamic 3D Waveform Bars overlay on screen */}
        {!isRemoved ? (
          <group position={[0, -0.06, 0.122]}>
            {[-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18].map((wx, idx) => {
              const spike = beepFlash && Math.abs(idx - 3) <= 1 ? 0.045 : 0.01;
              return (
                <mesh key={idx} position={[wx, 0, 0]}>
                  <boxGeometry args={[0.035, spike, 0.005]} />
                  <meshBasicMaterial color="#4ade80" />
                </mesh>
              );
            })}
          </group>
        ) : (
          <group position={[0, -0.06, 0.122]}>
            {/* Flatline bar */}
            <mesh>
              <boxGeometry args={[0.42, 0.006, 0.005]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        )}

        {/* Status LED */}
        <mesh position={[0.21, 0.16, 0.118]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial
            color={!isRemoved ? (beepFlash ? "#22c55e" : "#14532d") : alertFlash ? "#ef4444" : "#450a0a"}
          />
        </mesh>

        {/* Control buttons & knobs below screen */}
        {[-0.14, -0.05, 0.04, 0.13].map((bx, i) => (
          <mesh key={i} position={[bx, -0.15, 0.118]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.014, 8]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Top IV Drip Hanger Hooks (Raised to y = 2.75 above the console) */}
      <group position={[0, 2.75, 0]}>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
        {/* Left and right hooks */}
        <mesh position={[-0.14, 0.02, 0]} rotation={[0, 0, 0.35]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
        <mesh position={[0.14, 0.02, 0]} rotation={[0, 0, -0.35]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>

        {/* Saline IV Bag (Left) */}
        <group position={[-0.18, -0.16, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.11, 0.22, 0.04]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
        </group>

        {/* Plasma IV Bag (Right) */}
        <group position={[0.18, -0.16, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.11, 0.22, 0.04]} />
            <meshStandardMaterial color="#fef08a" transparent opacity={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
            <meshStandardMaterial color="#ca8a04" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// -------------------- 3. RIGHT INSTRUMENT TRAY TABLE & PROMINENT 3D BLUE GROCERY BAG ("ПАКЕТ") --------------------
// Positioned at [1.48, 0, -1.15] (beside Seryoga, bag top reaching y = 1.0..1.45, fully visible in 9:16 frame)
const InstrumentTrayMayo3D: React.FC<{
  position: [number, number, number];
  bagLabelTex: THREE.Texture;
  heartSettled: boolean;
  t: number;
}> = ({ position, bagLabelTex, heartSettled, t }) => {
  return (
    <group position={position}>
      {/* Wheeled C-Base on Floor */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.72, 0.04, 0.06]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.32, 0.04, 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.04, 0.4]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.32, 0.04, 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.04, 0.4]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical Chrome Telescoping Upright */}
      <mesh position={[-0.3, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.024, 0.85, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Stainless Steel Tray Table (y = 0.85) */}
      <group position={[0, 0.85, 0]}>
        {/* Main tray plate */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.82, 0.024, 0.54]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Tray rim lips */}
        <mesh position={[0, 0.02, 0.265]}>
          <boxGeometry args={[0.82, 0.02, 0.02]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.02, -0.265]}>
          <boxGeometry args={[0.82, 0.02, 0.02]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[-0.405, 0.02, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.54]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.405, 0.02, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.54]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Surgical Kidney Dish on Left */}
        <mesh position={[-0.24, 0.025, 0.06]} rotation={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.1, 0.08, 0.035, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.15} />
        </mesh>

        {/* Surgical Tweezers & Clamps on Tray */}
        <mesh position={[-0.24, 0.02, -0.14]} rotation={[0, 0.1, 0]}>
          <boxGeometry args={[0.16, 0.008, 0.025]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.08, 0.02, -0.15]} rotation={[0, -0.15, 0]}>
          <boxGeometry args={[0.15, 0.008, 0.02]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* PROMINENT 3D BLUE GROCERY BAG ("ПАКЕТ") on Right Side of Tray */}
        {/* Reaches y = 1.0..1.42 beside Seryoga */}
        <group position={[0.12, 0.015, 0.04]}>
          {/* Bag main crumpled body (height 0.40, top rim at y = 0.40 -> world y = 1.265) */}
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.4, 0.3]} />
            <meshStandardMaterial color="#2563eb" roughness={0.65} />
          </mesh>
          {/* Dark inner cavity opening at top */}
          <mesh position={[0, 0.402, 0]}>
            <boxGeometry args={[0.26, 0.01, 0.2]} />
            <meshBasicMaterial color="#1e3a8a" />
          </mesh>
          {/* Left and Right Bag Handles reaching world y = 1.42 */}
          <mesh position={[-0.13, 0.45, 0]}>
            <torusGeometry args={[0.065, 0.016, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.65} />
          </mesh>
          <mesh position={[0.13, 0.45, 0]}>
            <torusGeometry args={[0.065, 0.016, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.65} />
          </mesh>
          {/* Front Bold White Sign "ПАКЕТ" */}
          <mesh position={[0, 0.2, 0.153]}>
            <planeGeometry args={[0.26, 0.14]} />
            <meshBasicMaterial map={bagLabelTex} />
          </mesh>

          {/* Settled Beating Heart resting inside the grocery bag after toss! */}
          {heartSettled && (
            <Heart3D position={[0, 0.32, 0]} rotation={[0.35, 0.2, 0]} scale={0.95} t={t} />
          )}
        </group>
      </group>
    </group>
  );
};

// -------------------- 4. OPERATING TABLE & OPEN SURGICAL FIELD --------------------
const OperatingTable3D: React.FC<{
  position: [number, number, number];
  t: number;
}> = ({ position, t }) => {
  const heartTaken = t >= 128.0;

  return (
    <group position={position}>
      {/* Heavy Steel Base on Floor */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.12, 0.65]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Foot pedal controls */}
      <mesh position={[0, 0.05, 0.35]}>
        <boxGeometry args={[0.28, 0.04, 0.12]} />
        <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Central Hydraulic Pedestal Column */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.72, 0.46]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Telescopic chrome sleeve */}
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.16, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Main Tabletop Slab (y = 0.90, thickness 0.14 => top at y = 0.97) */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.14, 0.96]} />
        <meshStandardMaterial color="#0e7490" roughness={0.6} />
      </mesh>

      {/* Surgical Drape Skirts Hanging Down from edges */}
      {/* Front skirt (towards +Z) */}
      <mesh position={[0, 0.76, 0.485]} castShadow>
        <boxGeometry args={[2.22, 0.28, 0.02]} />
        <meshStandardMaterial color="#0891b2" roughness={0.75} />
      </mesh>
      {/* Back skirt (towards -Z) */}
      <mesh position={[0, 0.76, -0.485]} castShadow>
        <boxGeometry args={[2.22, 0.28, 0.02]} />
        <meshStandardMaterial color="#0891b2" roughness={0.75} />
      </mesh>
      {/* Left skirt (towards -X) */}
      <mesh position={[-1.105, 0.76, 0]} castShadow>
        <boxGeometry args={[0.02, 0.28, 0.97]} />
        <meshStandardMaterial color="#0891b2" roughness={0.75} />
      </mesh>
      {/* Right skirt (towards +X) */}
      <mesh position={[1.105, 0.76, 0]} castShadow>
        <boxGeometry args={[0.02, 0.28, 0.97]} />
        <meshStandardMaterial color="#0891b2" roughness={0.75} />
      </mesh>

      {/* Head Cushion Pad on Left */}
      <mesh position={[-0.88, 0.99, 0]} castShadow>
        <boxGeometry args={[0.34, 0.05, 0.44]} />
        <meshStandardMaterial color="#164e63" roughness={0.7} />
      </mesh>

      {/* OPEN CHEST SURGICAL FIELD CLEANLY ON TOP OF PATIENT'S CHEST */}
      {/* Table local x = -0.18, y = 1.38 */}
      <group position={[-0.18, 1.38, 0]}>
        {/* Blue sterile drape surround */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.46, 0.035, 0.38]} />
          <meshStandardMaterial color="#0284c7" roughness={0.65} />
        </mesh>
        {/* Dark surgical cavity incision */}
        <mesh position={[0, 0.015, 0]}>
          <boxGeometry args={[0.24, 0.04, 0.18]} />
          <meshStandardMaterial color="#2a0808" roughness={0.8} />
        </mesh>
        {/* Sterile white gauze borders around opening */}
        <mesh position={[0, 0.022, 0.1]}>
          <boxGeometry args={[0.26, 0.015, 0.03]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.022, -0.1]}>
          <boxGeometry args={[0.26, 0.015, 0.03]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </mesh>
        {/* Silver surgical retractors */}
        <mesh position={[-0.13, 0.025, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0.13, 0.025, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Beating Heart inside the cavity until Seryoga lifts it at 128s */}
        {!heartTaken && <Heart3D position={[0, -0.01, 0]} scale={0.72} t={t} />}
      </group>
    </group>
  );
};

// -------------------- 5. OPERATING ROOM ENVIRONMENT (WALLS, FLOOR, DOUBLE DOORS, CLOCK) --------------------
const OperatingRoomSurroundings3D: React.FC<{
  t: number;
  isBlackout: boolean;
  beaconPulse: number;
  exitSignTex: THREE.Texture;
}> = ({ t, isBlackout, beaconPulse, exitSignTex }) => {
  const secAngle = t * 6; // Clock second hand ticking

  // Double exit doors swing open when running out
  const isRunout = t >= CUES.s3_runout;
  const runDt = isRunout ? t - CUES.s3_runout : 0;
  const doorOpenAngle = isRunout ? easeOut(clamp((runDt - 0.35) / 0.45)) * 1.35 : 0;

  return (
    <group>
      {/* Clean Smooth Hospital Floor (Defect #5 Fix: Clean seamless medical floor without noisy high-contrast gap seams) */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[18, 0.04, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.45} />
      </mesh>
      {/* Soft polished operating zone inlay */}
      <mesh position={[0, 0.001, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7.2, 5.4]} />
        <meshStandardMaterial color="#475569" roughness={0.42} />
      </mesh>

      {/* Hospital Back Wall (z = -4.0) */}
      <group position={[0, 0, -4.0]}>
        {/* Lower tiled section (y: 0..1.6) */}
        <mesh position={[0, 0.8, 0]} receiveShadow>
          <boxGeometry args={[14, 1.6, 0.2]} />
          <meshStandardMaterial
            color={!isBlackout ? "#0f766e" : "#1e1b24"}
            emissive={isBlackout ? "#3b0a12" : "#000000"}
            emissiveIntensity={isBlackout ? 0.35 : 0}
            roughness={0.5}
          />
        </mesh>
        {/* Ceramic tile dividing trim */}
        <mesh position={[0, 1.62, 0.02]}>
          <boxGeometry args={[14.1, 0.05, 0.24]} />
          <meshStandardMaterial color={!isBlackout ? "#f8fafc" : "#991b1b"} roughness={0.3} />
        </mesh>
        {/* Upper wall section (y: 1.65..4.0) (Defect #3 Fix: contrast between bright cream and dark crimson emergency atmosphere) */}
        <mesh position={[0, 2.82, 0]} receiveShadow>
          <boxGeometry args={[14, 2.35, 0.2]} />
          <meshStandardMaterial
            color={!isBlackout ? "#f1f5f9" : "#2d0a10"}
            emissive={isBlackout ? "#450a0a" : "#000000"}
            emissiveIntensity={isBlackout ? 0.25 + beaconPulse * 0.15 : 0}
            roughness={0.65}
          />
        </mesh>

        {/* LARGE HOSPITAL WALL CLOCK (Defect #1 Fix: Casing rotated Math.PI / 2, dial and hands in XY plane facing +Z straight toward camera!) */}
        <group position={[0, 3.25, 0.11]}>
          {/* Dark outer rim casing: cylinder rotated Math.PI / 2 so flat circular end caps face +Z */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.04, 32]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* White dial face: circle in XY plane facing +Z directly */}
          <mesh position={[0, 0, 0.022]}>
            <circleGeometry args={[0.31, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* 12 Hour Tick Marks */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr) => {
            const ang = (hr * Math.PI) / 6;
            return (
              <mesh
                key={hr}
                position={[Math.sin(ang) * 0.26, Math.cos(ang) * 0.26, 0.024]}
                rotation={[0, 0, -ang]}
              >
                <boxGeometry args={[hr % 3 === 0 ? 0.018 : 0.01, 0.04, 0.002]} />
                <meshBasicMaterial color="#334155" />
              </mesh>
            );
          })}
          {/* Hour Hand */}
          <mesh position={[0, 0.06, 0.026]}>
            <boxGeometry args={[0.024, 0.13, 0.004]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>
          {/* Minute Hand */}
          <mesh position={[0.07, 0, 0.026]} rotation={[0, 0, -1.2]}>
            <boxGeometry args={[0.018, 0.18, 0.004]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>
          {/* Ticking Red Second Hand */}
          <mesh position={[0, 0, 0.028]} rotation={[0, 0, -secAngle]}>
            <boxGeometry args={[0.008, 0.22, 0.004]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Center cap */}
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>
        </group>

        {/* CHEST X-RAY LIGHTBOX (Defect #3 Fix: positioned at [-0.95, 2.35, -3.90] right behind patient/surgeon; glowing cyan before blackout, dark after blackout!) */}
        <group position={[-0.95, 2.35, 0.11]}>
          <mesh castShadow>
            <boxGeometry args={[0.92, 0.82, 0.08]} />
            <meshStandardMaterial color="#334155" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.042]}>
            <planeGeometry args={[0.84, 0.74]} />
            <meshStandardMaterial
              color={!isBlackout ? "#38bdf8" : "#0f172a"}
              emissive={!isBlackout ? "#0284c7" : "#000000"}
              emissiveIntensity={!isBlackout ? 1.8 : 0}
              roughness={0.2}
            />
          </mesh>
          {/* Ribs / Spine dark silhouette markers */}
          <mesh position={[0, 0, 0.046]}>
            <boxGeometry args={[0.04, 0.55, 0.002]} />
            <meshBasicMaterial color={!isBlackout ? "#0f172a" : "#05070a"} />
          </mesh>
          {[-0.14, -0.06, 0.02, 0.1, 0.18].map((ry, idx) => (
            <React.Fragment key={idx}>
              <mesh position={[-0.16, ry, 0.046]} rotation={[0, 0, -0.15]}>
                <boxGeometry args={[0.22, 0.028, 0.002]} />
                <meshBasicMaterial color={!isBlackout ? "#0f172a" : "#05070a"} />
              </mesh>
              <mesh position={[0.16, ry, 0.046]} rotation={[0, 0, 0.15]}>
                <boxGeometry args={[0.22, 0.028, 0.002]} />
                <meshBasicMaterial color={!isBlackout ? "#0f172a" : "#05070a"} />
              </mesh>
            </React.Fragment>
          ))}
          {/* Dedicated Lightbox glow point light before blackout */}
          {!isBlackout && (
            <pointLight position={[0, 0, 0.2]} color="#38bdf8" intensity={2.5} distance={3.2} />
          )}
        </group>

        {/* Stainless Steel Medicine Cabinet */}
        <group position={[-2.4, 2.05, 0.14]}>
          <mesh castShadow>
            <boxGeometry args={[1.05, 1.35, 0.24]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.122]}>
            <planeGeometry args={[0.96, 1.25]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.45} roughness={0.1} />
          </mesh>
          {[-0.25, 0.15].map((sy, i) => (
            <mesh key={i} position={[-0.25 + i * 0.45, sy, 0.06]}>
              <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
              <meshStandardMaterial color="#93c5fd" />
            </mesh>
          ))}
        </group>

        {/* Medical Gas Outlet Panel (O2, N2O, VAC) */}
        <group position={[1.5, 2.05, 0.11]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.32, 0.06]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
          </mesh>
          {/* O2 (Blue) */}
          <mesh position={[-0.26, 0, 0.035]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 12]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          {/* N2O (Yellow) */}
          <mesh position={[0, 0, 0.035]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 12]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
          {/* VAC (White) */}
          <mesh position={[0.26, 0, 0.035]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 12]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      </group>

      {/* SWINGING DOUBLE EXIT DOORWAY ON RIGHT WALL ([3.6, 0, -2.5]) */}
      <group position={[3.6, 0, -2.5]}>
        {/* Wall lintel above doors (y: 2.6..4.0) */}
        <mesh position={[0, 3.3, 0]} receiveShadow>
          <boxGeometry args={[0.2, 1.4, 1.6]} />
          <meshStandardMaterial color={!isBlackout ? "#f1f5f9" : "#2d0a10"} roughness={0.65} />
        </mesh>
        {/* Door frame outer trim */}
        <mesh position={[-0.02, 1.3, -0.72]}>
          <boxGeometry args={[0.08, 2.64, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh position={[-0.02, 1.3, 0.72]}>
          <boxGeometry args={[0.08, 2.64, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh position={[-0.02, 2.62, 0]}>
          <boxGeometry args={[0.08, 0.08, 1.52]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>

        {/* Left Door Leaf (Hinged at z = -0.70) */}
        <group position={[0, 0, -0.7]} rotation={[0, -doorOpenAngle, 0]}>
          <group position={[0, 1.3, 0.35]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.06, 2.56, 0.68]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.065, 16]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} roughness={0.1} />
            </mesh>
            <mesh position={[-0.045, -0.22, 0]}>
              <boxGeometry args={[0.035, 0.045, 0.58]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
          </group>
        </group>

        {/* Right Door Leaf (Hinged at z = +0.70) */}
        <group position={[0, 0, 0.7]} rotation={[0, doorOpenAngle, 0]}>
          <group position={[0, 1.3, -0.35]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.06, 2.56, 0.68]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.065, 16]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} roughness={0.1} />
            </mesh>
            <mesh position={[-0.045, -0.22, 0]}>
              <boxGeometry args={[0.035, 0.045, 0.58]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
          </group>
        </group>

        {/* Illuminated Green "ВЫХОД" Sign mounted over the doorway */}
        <group position={[-0.06, 2.85, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.74, 0.32, 0.08]} />
            <meshStandardMaterial color="#14532d" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.042]}>
            <planeGeometry args={[0.7, 0.28]} />
            <meshBasicMaterial map={exitSignTex} />
          </mesh>
          <pointLight position={[0, 0, 0.2]} color="#22c55e" intensity={1.8} distance={3.5} />
        </group>
      </group>

      {/* Ceiling Slab */}
      <mesh position={[0, 4.02, 0]}>
        <boxGeometry args={[18, 0.08, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
    </group>
  );
};

// -------------------- 6. DISCARDED SURGICAL MASK ON FLOOR (AFTER MASK RIP) --------------------
const DiscardedMask3D: React.FC<{ t: number }> = ({ t }) => {
  if (t < CUES.s3_maskrip) return null;
  const dt = t - CUES.s3_maskrip;
  const p = clamp(dt / 0.65);
  // Arcs from [-0.85, 1.65, -0.15] down to [-0.75, 0.04, 1.55]
  const mx = lerp(-0.85, -0.75, p);
  const mz = lerp(-0.15, 1.55, p);
  const my = lerp(1.65, 0.04, p * p) + (p < 1 ? Math.sin(p * Math.PI) * 0.32 : 0);
  const rotX = p * 3.4;
  const rotY = p * 4.2;
  const rotZ = p * 1.5;

  return (
    <group position={[mx, my, mz]} rotation={[rotX, rotY, rotZ]}>
      <mesh castShadow>
        <boxGeometry args={[0.32, 0.17, 0.07]} />
        <meshStandardMaterial color="#5eead4" roughness={0.65} />
      </mesh>
      <mesh position={[-0.2, 0.02, 0]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.02]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0.2, 0.02, 0]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.02]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
};

// -------------------- 7. TOSSING HEART PARABOLA (INTO BLUE GROCERY BAG) --------------------
const FlyingHeartToss3D: React.FC<{ t: number }> = ({ t }) => {
  if (t < 137.2 || t >= 137.95) return null;
  const dt = t - 137.2;
  const p = clamp(dt / 0.7);
  // From Seryoga's hand [0.97, 1.20, -0.35] -> into Blue Bag on tray [1.48, 1.22, -1.10]
  const hx = lerp(0.97, 1.48, p);
  const hz = lerp(-0.35, -1.1, p);
  const hy = lerp(1.2, 1.22, p) + Math.sin(p * Math.PI) * 0.55;
  const rotY = p * 4.5;
  const rotZ = p * 2.2;

  return (
    <Heart3D
      position={[hx, hy, hz]}
      rotation={[0.2, rotY, rotZ]}
      scale={1.05}
      t={t}
    />
  );
};

// ==================== MAIN SCENE 3 EXPORT ====================
export const Scene3Shorts3D: React.FC<{ t?: number }> = ({ t: propT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = propT ?? SCENES.s3.start + frame / fps;

  // Memoized Sign Textures
  const ecgStableTex = useMemo(
    () =>
      makeSignTexture(
        ["ЭКГ: 62 BPM", "SpO2 98% • СТАБИЛЬНО"],
        "#0f172a",
        "#22c55e",
        "#14532d",
        256,
        160,
        34
      ),
    []
  );

  const ecgAlertTex = useMemo(
    () =>
      makeSignTexture(
        ["СЕРДЦЕ: ВНЕ ТЕЛА", "ПУЛЬС: 00 BPM • ТРЕВОГА"],
        "#450a0a",
        "#ef4444",
        "#7f1d1d",
        256,
        160,
        32
      ),
    []
  );

  const exitSignTex = useMemo(
    () =>
      makeSignTexture(
        ["ВЫХОД"],
        "#15803d",
        "#f0fdf4",
        "#166534",
        256,
        120,
        56
      ),
    []
  );

  const bagLabelTex = useMemo(
    () =>
      makeSignTexture(
        ["ПАКЕТ"],
        "#ffffff",
        "#1d4ed8",
        "#1e40af",
        256,
        128,
        64
      ),
    []
  );

  // -------------------- LIGHTING & BLACKOUT SEQUENCING --------------------
  const isBlackout = t >= CUES.s3_blackout; // 77.45s
  const isShockwave = t >= 76.8 && t < CUES.s3_blackout;

  let lampWhiteIntensity = 0;
  if (!isBlackout) {
    if (isShockwave) {
      const dt = t - 76.8;
      const flick = Math.sin(dt * 85) * Math.cos(dt * 140);
      lampWhiteIntensity = flick > -0.2 ? 10.5 * (1 - dt / 0.65) : 0.5;
    } else {
      lampWhiteIntensity = 10.5;
    }
  }

  const beaconPulse = isBlackout
    ? Math.pow(Math.max(0, Math.sin((t - CUES.s3_blackout) * 5.2)), 3)
    : 0;
  const emergencyRedIntensity = isBlackout ? 4.5 + beaconPulse * 5.5 : 0;

  // -------------------- CAMERA CHOREOGRAPHY (Defect #2 & #4 Fixes) --------------------
  // Default wide pulled back to camZ = 7.9 (lookAt = [0, 1.38, 0]) so Heart Monitor, both doctors,
  // patient, and Blue "ПАКЕТ" Bag are completely visible in 9:16 Shorts frame!
  let camPos: [number, number, number] = [0, 2.45, 7.9];
  let camLook: [number, number, number] = [0, 1.38, 0];
  let camShake = 0;

  if (t < 77.8) {
    // 1. Shockwave hit & blackout (76.80 .. 77.80)
    const shockP = seg(t, 76.8, 77.45);
    camShake = t < 77.45 ? 22 * easeIn(shockP) : 22 * (1 - seg(t, 77.45, 77.8));
    camPos = [0, 2.45, 7.9];
    camLook = [0, 1.38, 0];
  } else if (t < 87.1) {
    // 2. s3_surg1 (78.9 .. 87.1): "Света нет. Генераторы сдохли..."
    const p = ease(seg(t, 78.5, 86.5));
    camPos = [lerp(0, -0.1, p), lerp(2.45, 2.42, p), lerp(7.9, 7.6, p)];
    camLook = [lerp(0, -0.05, p), 1.38, 0];
  } else if (t < 97.05) {
    // 3. s3_anest1 (87.65 .. 97.05): "Хуже. Сервера Rockstar упали..."
    const p = ease(seg(t, 87.65, 96.5));
    camPos = [lerp(-0.1, 0.2, p), lerp(2.42, 2.4, p), lerp(7.6, 7.4, p)];
    camLook = [lerp(-0.05, 0.25, p), 1.38, 0];
  } else if (t < 99.25) {
    // 4. CUES.s3_silence (97.05 .. 99.25): (Round 3 Fix: shift camPos to [-1.10, 2.22, 4.10], camLook to [-1.15, 1.42, -0.12]
    // cleanly framing Surgeon + open patient chest with Seryoga 100% outside the right viewport!)
    const p = ease(seg(t, 97.05, 98.8));
    camPos = [lerp(0.2, -1.1, p), lerp(2.4, 2.22, p), lerp(7.4, 4.1, p)];
    camLook = [lerp(0.25, -1.15, p), lerp(1.38, 1.42, p), lerp(0, -0.12, p)];
  } else if (t < 108.37) {
    // 5. s3_surg2 (99.25 .. 108.37): Surgeon hysteria close-up on Surgeon & open chest
    camShake = 2.0;
    camPos = [-1.1, 2.22, 4.1];
    camLook = [-1.15, 1.42, -0.12];
  } else if (t < 118.48) {
    // 6. s3_anest2 (108.92 .. 118.48): Pull back smoothly to two-shot
    const p = ease(seg(t, 108.92, 114.5));
    camPos = [lerp(-1.1, 0.0, p), lerp(2.22, 2.45, p), lerp(4.1, 7.9, p)];
    camLook = [lerp(-1.15, 0.0, p), lerp(1.42, 1.38, p), lerp(-0.12, 0.0, p)];
  } else if (t < 129.02) {
    // 7. CUES.s3_maskrip (118.83) & s3_surg3 (119.18 .. 129.02): Medium two-shot, furious mask rip
    const ripDt = t - CUES.s3_maskrip;
    if (ripDt >= 0 && ripDt < 0.45) {
      camShake = 8.0 * (1 - ripDt / 0.45);
    }
    camPos = [0, 2.45, 7.9];
    camLook = [0, 1.38, 0];
  } else if (t < 134.54) {
    // 8. s3_anest3 (129.57 .. 134.09): "А сердце? Мы ж его только достали..." (Framing Seryoga holding heart)
    const p = ease(seg(t, 129.5, 133.0));
    camPos = [lerp(0.0, 0.35, p), lerp(2.45, 2.4, p), lerp(7.9, 7.5, p)];
    camLook = [lerp(0.0, 0.45, p), 1.38, 0];
  } else if (t < 138.19) {
    // 9. s3_surg4 (134.54 .. 137.94): "Да похуй, в пакет положи..." (Framing toss into blue bag)
    const p = ease(seg(t, 134.5, 137.5));
    camPos = [lerp(0.35, 0.45, p), lerp(2.4, 2.42, p), lerp(7.5, 7.7, p)];
    camLook = [lerp(0.45, 0.65, p), 1.35, 0];
  } else {
    // 10. CUES.s3_runout (138.19 .. 139.49): Sprint out double doors! Pan right
    const p = ease(seg(t, 138.19, 139.4));
    camPos = [lerp(0.45, 1.35, p), lerp(2.42, 2.45, p), lerp(7.7, 7.8, p)];
    camLook = [lerp(0.65, 2.2, p), 1.38, -0.8];
  }

  // -------------------- CHARACTERS' POSES & ANIMATION --------------------
  // Lip Sync
  const surgMouth =
    getMouthOpen("s3_surg1", t) ||
    getMouthOpen("s3_surg2", t) ||
    getMouthOpen("s3_surg3", t) ||
    getMouthOpen("s3_surg4", t);

  const anestMouth =
    getMouthOpen("s3_anest1", t) ||
    getMouthOpen("s3_anest2", t) ||
    getMouthOpen("s3_anest3", t);

  // Surgeon State (Standing at [-0.85, 0, -0.45])
  let surgPos: [number, number, number] = [-0.85, 0, -0.45];
  let surgYaw = 0.22;
  let surgPose: PoseMode = "idle";
  let surgMood: MoodMode = "neutral";
  let surgEyes: EyeMode = "normal";
  let surgBrow = 0.4;

  const isSilence = t >= CUES.s3_silence && t < 99.25;
  const isSurg2Hysteria = t >= 99.25 && t < 108.37;
  const isMaskRipped = t >= CUES.s3_maskrip;
  const isSurg4 = t >= 134.54 && t < 137.94;
  const isRunoutActive = t >= CUES.s3_runout;

  if (isRunoutActive) {
    const runDt = t - CUES.s3_runout;
    const p = easeIn(clamp(runDt / 1.25));
    surgPos = [lerp(-0.85, 4.8, p), 0, lerp(-0.45, -2.5, p)];
    surgYaw = Math.PI / 2;
    surgPose = "sprint";
    surgMood = "frown";
    surgEyes = "wide";
    surgBrow = 0.95;
  } else if (isSurg4) {
    surgPose = "wave";
    surgMood = "frown";
    surgEyes = "normal";
    surgBrow = 0.8;
  } else if (isMaskRipped) {
    surgPose = "idle";
    surgMood = "frown";
    surgEyes = "normal";
    surgBrow = 0.95;
  } else if (isSurg2Hysteria) {
    surgPose = "wave";
    surgMood = "scream";
    surgEyes = "wide";
    surgBrow = 0.85;
  } else if (isSilence) {
    surgPose = "look_down";
    surgMood = "neutral";
    surgEyes = "wide";
    surgBrow = -0.6;
  }

  // Anesthesiologist Seryoga State (Standing at [0.85, 0, -0.45])
  let anestPos: [number, number, number] = [0.85, 0, -0.45];
  let anestYaw = -0.25;
  let anestPose: PoseMode = "idle";
  let anestMood: MoodMode = "neutral";
  let anestEyes: EyeMode = "normal";
  let anestBrow = 0.3;

  const isAnest3HoldingHeart = t >= 129.57 && t < 134.09;
  const isHeartInHand = t >= 128.0 && t < 137.2;

  if (isRunoutActive) {
    const runDt = Math.max(0, t - CUES.s3_runout - 0.12);
    const p = easeIn(clamp(runDt / 1.25));
    anestPos = [lerp(0.85, 5.2, p), 0, lerp(-0.45, -2.5, p)];
    anestYaw = Math.PI / 2;
    anestPose = "sprint";
    anestMood = "frown";
    anestEyes = "wide";
    anestBrow = 0.8;
  } else if (isAnest3HoldingHeart) {
    anestEyes = "wide";
    anestBrow = -0.5;
  }

  const heartSettled = t >= 137.95;

  return (
    <>
      {/* Background Color & Fog (Defect #3 Fix: intense blackout contrast) */}
      <color attach="background" args={[!isBlackout ? "#1e293b" : "#2b0b12"]} />
      <fog attach="fog" args={[!isBlackout ? "#1e293b" : "#3b0a12", 10, 32]} />

      {/* Dynamic Shorts Camera Rig */}
      <CameraRig pos={camPos} lookAt={camLook} fov={46} shake={camShake} t={t} />

      {/* Global Lighting (Defect #3 Fix: white ambient dropped to 0.35 after blackout) */}
      <ambientLight intensity={!isBlackout ? 0.85 : 0.35} color={!isBlackout ? "#f1f5f9" : "#1a0508"} />

      {/* Front Readable Key Light on actors & table */}
      <directionalLight
        position={[1.8, 4.0, 6.0]}
        intensity={!isBlackout ? 1.5 : 1.8}
        color={!isBlackout ? "#ffffff" : "#fed7aa"}
        castShadow
      />
      {/* Warm-Rose / Cyan Fill Light */}
      <directionalLight
        position={[-2.5, 3.0, 5.0]}
        intensity={!isBlackout ? 0.8 : 1.0}
        color={!isBlackout ? "#cbd5e1" : "#fecdd3"}
      />
      <directionalLight position={[0, -2, 4]} intensity={0.4} color="#7dd3fc" />

      {/* Emergency Wall Floodlights washing the back tiled walls in dramatic red/crimson after blackout */}
      {isBlackout && (
        <>
          <pointLight position={[0, 2.6, -3.0]} color="#ef4444" intensity={5.0 + beaconPulse * 4.0} distance={9.0} />
          <pointLight position={[-1.8, 2.8, -3.0]} color="#dc2626" intensity={4.0 + beaconPulse * 3.0} distance={8.0} />
          <pointLight position={[1.8, 2.8, -3.0]} color="#dc2626" intensity={4.0 + beaconPulse * 3.0} distance={8.0} />
        </>
      )}

      {/* Overhead Surgical Lamp & Emergency Red Beacon */}
      <OverheadSurgicalLamp3D
        position={[0, 3.8, 0.2]}
        isBlackout={isBlackout}
        whiteIntensity={lampWhiteIntensity}
        emergencyIntensity={emergencyRedIntensity}
        t={t}
      />

      {/* Hospital Walls, Clean Polished Floor, Double Exit Doors, Wall Clock & X-Ray */}
      <OperatingRoomSurroundings3D
        t={t}
        isBlackout={isBlackout}
        beaconPulse={beaconPulse}
        exitSignTex={exitSignTex}
      />

      {/* Operating Table with Zero-Clipping Padded Surface & Sterile Open Field */}
      <OperatingTable3D position={[0, 0, 0.72]} t={t} />

      {/* Patient Lying Flat Strictly On Top of Operating Table Tabletop */}
      <Character3D
        position={[0.04, 0.97, 0.72]}
        yaw={Math.PI / 2}
        scale={0.95}
        pose="lie_flat"
        shirtColor="#e2e8f0"
        pantsColor="#94a3b8"
        hair="bald_sides"
        hairColor="#4b5563"
        eyes="dead"
        mood="neutral"
        brow={0}
      />

      {/* Left Heart Monitor Stand & IV Drip (Round 3 Fix: positioned at [-1.68, 0, -1.55], console at y = 2.02 cleanly above Surgeon's head/cap) */}
      <HeartMonitorStand3D
        position={[-1.68, 0, -1.55]}
        rotation={[0, 0.35, 0]}
        t={t}
        stableTex={ecgStableTex}
        alertTex={ecgAlertTex}
      />

      {/* Right Instrument Tray Table & 3D Blue Grocery Bag ("ПАКЕТ") (Defect #2 Fix: inward to [1.48, 0, -1.15], bag top at y=1.0..1.45, completely visible) */}
      <InstrumentTrayMayo3D
        position={[1.48, 0, -1.15]}
        bagLabelTex={bagLabelTex}
        heartSettled={heartSettled}
        t={t}
      />

      {/* Surgeon Standing Behind Table on Left (Clearance 0.69m behind table back edge) */}
      <Character3D
        position={surgPos}
        yaw={surgYaw}
        scale={1.05}
        shirtColor="#0f766e"
        pantsColor="#115e59"
        hair="surg_cap"
        eyes={surgEyes}
        brow={surgBrow}
        mood={surgMood}
        mouthOpen={surgMouth}
        pose={surgPose}
        surgMask={!isMaskRipped}
        holdScalpel={!isRunoutActive}
        t={t}
        seed={301}
      />

      {/* Discarded Torn Surgical Mask Arcing to Floor on Mask Rip (t >= 118.83s) */}
      <DiscardedMask3D t={t} />

      {/* Anesthesiologist Seryoga Standing Behind Table on Right */}
      <Character3D
        position={anestPos}
        yaw={anestYaw}
        scale={1.02}
        shirtColor="#0284c7"
        pantsColor="#0369a1"
        hair="surg_cap"
        surgMask={true}
        eyes={anestEyes}
        brow={anestBrow}
        mood={anestMood}
        mouthOpen={anestMouth}
        pose={anestPose}
        holdPhone={t < 128.0 ? "OFFLINE" : null}
        holdHeart={isHeartInHand}
        t={t}
        seed={302}
      />

      {/* Flying Beating Heart Arcing from Seryoga into the Blue Grocery Bag (137.2s .. 137.95s) */}
      <FlyingHeartToss3D t={t} />
    </>
  );
};
