import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUES, SCENES, getMouthOpen } from "../data/scene1Timeline";
import { Character3D, TeaMug3D } from "../components3d/Character3D";
import { makeSignTexture } from "../components3d/SignTexture";

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p, 0, 1);
const seg = (t: number, a: number, b: number) => clamp((t - a) / Math.max(0.0001, b - a));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeIn = (p: number) => Math.pow(clamp(p), 2.2);

// Deterministic 3D Camera Rig
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

// 5-Star Ergonomic Swivel Chair (Chair back strictly behind character, zero clipping)
const SwivelChair3D: React.FC<{
  position: [number, number, number];
  yaw?: number;
}> = ({ position, yaw = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    {/* Base caster assembly on floor */}
    <group position={[0, 0.05, 0]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const ang = (i * 2 * Math.PI) / 5;
        const len = 0.38;
        return (
          <group key={i} rotation={[0, ang, 0]}>
            <mesh position={[0, 0, len * 0.5]}>
              <boxGeometry args={[0.045, 0.025, len]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.03, len]}>
              <sphereGeometry args={[0.026, 8, 8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* Gas lift cylinder */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.048, 0.055, 0.22, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.16, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>

    {/* Seat Cushion at y = 0.44 */}
    <group position={[0, 0.44, 0]}>
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.56, 0.10, 0.54]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} />
      </mesh>

      {/* Padded armrests flanking character */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.31, 0.14, -0.02]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.035, 0.20, 0.06]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.11, 0.04]}>
            <boxGeometry args={[0.07, 0.03, 0.26]} />
            <meshStandardMaterial color="#09090b" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Reclined backrest situated safely behind Ivanych's back (-Z) */}
      <group position={[0, 0.32, -0.24]} rotation={[-0.24, 0, 0]}>
        <mesh position={[0, 0.04, -0.04]}>
          <boxGeometry args={[0.08, 0.58, 0.05]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.52, 0.56, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.40, 0.02]}>
          <boxGeometry args={[0.28, 0.14, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  </group>
);

// Emergency Button Console with Glowing Dome Button (Cleanly visible on front desk)
const EmergencyButtonConsole3D: React.FC<{
  position: [number, number, number];
  t: number;
  signTex: THREE.CanvasTexture;
}> = ({ position, t, signTex }) => {
  const isAlarm = t < CUES.s2_boom;
  const isZero = t >= CUES.s2_zero;
  const pulse = isZero
    ? Math.sin(t * 30) > 0 ? 1 : 0.2
    : isAlarm
      ? 0.5 + 0.5 * Math.sin(t * 10)
      : 0.1;

  return (
    <group position={position} rotation={[-0.2, 0, 0]}>
      {/* Heavy sloped housing */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.44, 0.14, 0.36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Hazard striped warning border plate */}
      <mesh position={[0, 0.11, 0.01]}>
        <boxGeometry args={[0.40, 0.02, 0.32]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} />
      </mesh>

      {/* Sign label: "АЗ-5 СТОП" */}
      <mesh position={[0, 0.13, -0.09]}>
        <planeGeometry args={[0.30, 0.09]} />
        <meshBasicMaterial map={signTex} />
      </mesh>

      {/* Chrome button bezel ring */}
      <mesh position={[0, 0.13, 0.05]}>
        <cylinderGeometry args={[0.11, 0.12, 0.035, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Red Emergency Dome Mushroom Button */}
      <mesh position={[0, 0.15, 0.05]}>
        <sphereGeometry args={[0.09, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.8 + pulse * 2.0}
          roughness={0.25}
        />
      </mesh>

      {/* Local point light illuminating console & button */}
      <pointLight
        position={[0, 0.32, 0.05]}
        color="#ef4444"
        intensity={2.2 + pulse * 3.0}
        distance={3.8}
      />
    </group>
  );
};

// Dual Rotating/Flashing Red Alarm Beacons on Back Wall
const AlarmBeacon3D: React.FC<{
  position: [number, number, number];
  t: number;
  active: boolean;
}> = ({ position, t, active }) => {
  const rotY = t * 8.5;
  const pulse = active ? 0.6 + 0.4 * Math.sin(t * 8.5) : 0;

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[0.22, 0.28, 0.08]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.12, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.20, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={active ? 0.8 : 0.1}
          transparent
          opacity={0.75}
          roughness={0.2}
        />
      </mesh>
      {/* Rotating chrome reflector */}
      <group position={[0, 0, 0.18]} rotation={[0, 0, rotY]}>
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[0.02, 0.09, 0.14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
      {active && (
        <pointLight
          position={[0, 0, 0.25]}
          color="#ef4444"
          intensity={pulse * 4.5}
          distance={10}
        />
      )}
    </group>
  );
};

// Overhead 3D Warning Display on Back Wall (Narrower & lowered to avoid 2D HUD overlap)
const OverheadWarningBoard3D: React.FC<{
  position: [number, number, number];
  titleTex: THREE.CanvasTexture;
  countdownTex: THREE.CanvasTexture;
  t: number;
}> = ({ position, titleTex, countdownTex, t }) => {
  const isAlarm = t < CUES.s2_boom;
  const pulse = isAlarm ? 0.5 + 0.5 * Math.sin(t * 8) : 0;

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[2.9, 1.35, 0.10]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.84, 1.28, 0.03]} />
        <meshStandardMaterial color="#eab308" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[2.72, 1.18, 0.02]} />
        <meshStandardMaterial color="#18181b" roughness={0.7} />
      </mesh>

      {/* Header Banner: "КРИТИЧЕСКИЙ ПЕРЕГРЕВ РЕАКТОРА" */}
      <mesh position={[0, 0.34, 0.04]}>
        <planeGeometry args={[2.62, 0.38]} />
        <meshBasicMaterial map={titleTex} />
      </mesh>

      {/* Dynamic Countdown & Core Stress Meter */}
      <mesh position={[0, -0.20, 0.04]}>
        <planeGeometry args={[2.62, 0.62]} />
        <meshBasicMaterial map={countdownTex} />
      </mesh>

      {/* Flashing Warning Lamps on Display Frame */}
      {[-1.25, 1.25].map((x, idx) => (
        <group key={idx} position={[x, 0.50, 0.06]}>
          <mesh>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={isAlarm ? 1.0 + pulse * 2.0 : 0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Stylized 3D Pink Flamingo on Holographic Display Stage ("у фламинго каждое пёрышко прорисовано!")
// In 3/4 side profile so S-neck curve, hooked beak, raised leg, and sculpted wing feathers form clear silhouette
const Flamingo3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  t: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, t }) => {
  const breath = Math.sin(t * 4) * 0.03;
  const wingFlutter = Math.sin(t * 8) * 0.05;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Holographic Pedestal / Stage */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.26, 0.30, 0.04, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Neon glowing rim */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.20, 0.25, 24]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={2.2} />
      </mesh>

      {/* Orbiting holographic rings */}
      <group position={[0, 0.46, 0]} rotation={[Math.PI / 2 - 0.35, t * 1.8, 0]}>
        <mesh>
          <torusGeometry args={[0.24, 0.008, 8, 32]} />
          <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={1.8} />
        </mesh>
      </group>
      <group position={[0, 0.54, 0]} rotation={[Math.PI / 2 + 0.32, -t * 1.5, 0]}>
        <mesh>
          <torusGeometry args={[0.20, 0.007, 8, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.8} />
        </mesh>
      </group>

      {/* Floating Flamingo Body */}
      <group position={[0, 0.42 + breath, 0]}>
        {/* Slender Coral-Pink Legs */}
        {/* Standing right leg */}
        <group position={[0.04, 0, 0]}>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.38, 8]} />
            <meshStandardMaterial color="#fb7185" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.17, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#f43f5e" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.37, 0.02]}>
            <boxGeometry args={[0.05, 0.01, 0.06]} />
            <meshStandardMaterial color="#fb7185" roughness={0.5} />
          </mesh>
        </group>

        {/* Bent left leg in classic one-legged flamingo pose */}
        <group position={[-0.04, -0.05, 0]}>
          <mesh position={[0, -0.07, -0.06]} rotation={[-0.7, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.20, 8]} />
            <meshStandardMaterial color="#fb7185" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.14, -0.13]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#f43f5e" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.24, -0.06]} rotation={[0.65, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.22, 8]} />
            <meshStandardMaterial color="#fb7185" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.33, 0.01]}>
            <boxGeometry args={[0.045, 0.01, 0.05]} />
            <meshStandardMaterial color="#fb7185" roughness={0.5} />
          </mesh>
        </group>

        {/* Sculpted Torso */}
        <group position={[0, 0.12, 0]} rotation={[-0.15, 0, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 16, 14]} />
            <meshStandardMaterial color="#f472b6" emissive="#db2777" emissiveIntensity={0.2} roughness={0.35} />
          </mesh>

          {/* Layered Wings & Feathers */}
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.11, 0.02, 0.02]}
              rotation={[0.1 + (side === 1 ? wingFlutter : -wingFlutter), side * 0.08, 0]}
            >
              <mesh position={[0, 0, -0.04]}>
                <boxGeometry args={[0.035, 0.11, 0.18]} />
                <meshStandardMaterial color="#f472b6" roughness={0.4} />
              </mesh>

              {/* Covert feathers */}
              <mesh position={[side * 0.012, 0.03, -0.02]} rotation={[0.2, 0, side * 0.1]}>
                <coneGeometry args={[0.028, 0.12, 6]} />
                <meshStandardMaterial color="#fbcfe8" roughness={0.35} />
              </mesh>
              <mesh position={[side * 0.012, 0.01, -0.06]} rotation={[0.35, 0, side * 0.1]}>
                <coneGeometry args={[0.028, 0.13, 6]} />
                <meshStandardMaterial color="#f472b6" roughness={0.35} />
              </mesh>

              {/* Mid-layer feathers */}
              <mesh position={[side * 0.012, -0.02, -0.08]} rotation={[0.5, 0, side * 0.12]}>
                <coneGeometry args={[0.026, 0.14, 6]} />
                <meshStandardMaterial color="#fb7185" roughness={0.35} />
              </mesh>
              <mesh position={[side * 0.012, -0.04, -0.11]} rotation={[0.65, 0, side * 0.12]}>
                <coneGeometry args={[0.026, 0.15, 6]} />
                <meshStandardMaterial color="#f43f5e" roughness={0.35} />
              </mesh>

              {/* Black-tipped primary flight feathers */}
              <group position={[side * 0.01, -0.06, -0.14]} rotation={[0.8, 0, side * 0.14]}>
                <mesh position={[0, 0.04, 0]}>
                  <coneGeometry args={[0.024, 0.10, 6]} />
                  <meshStandardMaterial color="#e11d48" roughness={0.35} />
                </mesh>
                <mesh position={[0, -0.04, 0]}>
                  <coneGeometry args={[0.022, 0.08, 6]} />
                  <meshStandardMaterial color="#09090b" roughness={0.3} />
                </mesh>
              </group>
            </group>
          ))}

          {/* Tail feathers */}
          <group position={[0, 0.02, -0.15]} rotation={[-0.4, 0, 0]}>
            <mesh position={[-0.03, 0, -0.04]} rotation={[0, -0.2, 0]}>
              <coneGeometry args={[0.025, 0.11, 6]} />
              <meshStandardMaterial color="#f43f5e" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, -0.05]}>
              <coneGeometry args={[0.025, 0.12, 6]} />
              <meshStandardMaterial color="#fb7185" roughness={0.4} />
            </mesh>
            <mesh position={[0.03, 0, -0.04]} rotation={[0, 0.2, 0]}>
              <coneGeometry args={[0.025, 0.11, 6]} />
              <meshStandardMaterial color="#f43f5e" roughness={0.4} />
            </mesh>
          </group>

          {/* Graceful S-Curved Neck */}
          <group position={[0, 0.08, 0.12]} rotation={[0.45, 0, 0]}>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.038, 0.045, 0.12, 12]} />
              <meshStandardMaterial color="#f472b6" roughness={0.35} />
            </mesh>

            <group position={[0, 0.12, 0]} rotation={[0.4, 0, 0]}>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.032, 0.038, 0.12, 12]} />
                <meshStandardMaterial color="#f472b6" roughness={0.35} />
              </mesh>

              <group position={[0, 0.12, 0]} rotation={[-0.9, 0, 0]}>
                <mesh position={[0, 0.05, 0]}>
                  <cylinderGeometry args={[0.028, 0.032, 0.11, 12]} />
                  <meshStandardMaterial color="#f472b6" roughness={0.35} />
                </mesh>

                <group position={[0, 0.10, 0]} rotation={[-0.6, 0, 0]}>
                  <mesh position={[0, 0.04, 0]}>
                    <cylinderGeometry args={[0.026, 0.028, 0.09, 12]} />
                    <meshStandardMaterial color="#f472b6" roughness={0.35} />
                  </mesh>

                  {/* Head & Downward Hook Beak */}
                  <group position={[0, 0.08, 0.02]} rotation={[0.7, 0, 0]}>
                    <mesh position={[0, 0, 0.02]}>
                      <sphereGeometry args={[0.048, 14, 12]} />
                      <meshStandardMaterial color="#f472b6" roughness={0.35} />
                    </mesh>

                    {/* Yellow Eyes with Black Pupils */}
                    {[-1, 1].map((s) => (
                      <group key={s} position={[s * 0.038, 0.015, 0.03]}>
                        <mesh>
                          <sphereGeometry args={[0.012, 8, 8]} />
                          <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.6} />
                        </mesh>
                        <mesh position={[0, 0, 0.008]}>
                          <sphereGeometry args={[0.006, 8, 8]} />
                          <meshBasicMaterial color="#09090b" />
                        </mesh>
                      </group>
                    ))}

                    {/* Pink Beak Base */}
                    <mesh position={[0, -0.015, 0.065]} rotation={[-0.3, 0, 0]}>
                      <boxGeometry args={[0.036, 0.038, 0.06]} />
                      <meshStandardMaterial color="#fbcfe8" roughness={0.3} />
                    </mesh>

                    {/* Curved Black Beak Tip */}
                    <group position={[0, -0.04, 0.08]} rotation={[-0.85, 0, 0]}>
                      <mesh position={[0, -0.02, 0]}>
                        <coneGeometry args={[0.022, 0.07, 10]} />
                        <meshStandardMaterial color="#09090b" roughness={0.25} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// Wide Curved Gaming Monitor (Clearly angled toward both Ivanych & Camera)
const GamingMonitor3D: React.FC<{
  position: [number, number, number];
  yaw?: number;
  t: number;
  shaderTex: THREE.CanvasTexture;
  viceCityTex: THREE.CanvasTexture;
  clickedTex: THREE.CanvasTexture;
}> = ({ position, yaw = 0, t, shaderTex, viceCityTex, clickedTex }) => {
  const isMenu = t >= CUES.s2_menu;
  const isZero = t >= CUES.s2_zero;

  const currentScreenTex = isZero
    ? clickedTex
    : isMenu
      ? viceCityTex
      : shaderTex;

  const glowColor = isMenu ? "#f43f5e" : "#22c55e";
  const glowIntensity = isZero ? 3.5 : isMenu ? 2.2 : 1.2;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Heavy Desk Mount Arm */}
      <mesh position={[0, -0.38, -0.15]}>
        <boxGeometry args={[0.24, 0.03, 0.24]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.16, -0.15]} rotation={[-0.2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.44, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Monitor Outer Chassis */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[1.22, 0.72, 0.07]} />
        <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* RGB Ambient Backlight glow strip */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[1.18, 0.68, 0.01]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1.5} />
      </mesh>

      {/* Screen Display Surface */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[1.16, 0.66]} />
        <meshBasicMaterial map={currentScreenTex} />
      </mesh>

      {/* Glow Point Light casting gamer light onto Ivanych */}
      <pointLight
        position={[0, 0, 0.45]}
        color={glowColor}
        intensity={glowIntensity}
        distance={4.0}
      />
    </group>
  );
};

// Floating Steam above Ivanych's Tea Mug
const TeaSteam3D: React.FC<{ position: [number, number, number]; t: number }> = ({ position, t }) => (
  <group position={position}>
    {[0, 1, 2].map((i) => {
      const p = (t * 0.8 + i * 0.33) % 1;
      const y = 0.22 + p * 0.35;
      const drift = Math.sin(t * 3 + i) * 0.03;
      const op = Math.sin(p * Math.PI) * 0.25;
      const sz = 0.02 + p * 0.04;
      return (
        <mesh key={i} position={[drift, y, 0]} scale={sz}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={op} />
        </mesh>
      );
    })}
  </group>
);

// NPP Control Room Environment (Walls, Floor, Console Desks, Ceiling Beams)
const ControlRoomEnvironment3D: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {/* Industrial Floor */}
    <mesh position={[0, -0.01, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[16, 14]} />
      <meshStandardMaterial color="#222823" roughness={0.7} metalness={0.2} />
    </mesh>

    {/* Hazard perimeter line on floor */}
    <mesh position={[0, 0.005, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5.2, 0.12]} />
      <meshStandardMaterial color="#eab308" roughness={0.4} />
    </mesh>

    {/* Back Concrete Wall (z = -4.55) */}
    <mesh position={[0, 3.2, -4.55]} receiveShadow>
      <planeGeometry args={[16, 6.8]} />
      <meshStandardMaterial color="#2b3329" roughness={0.8} />
    </mesh>

    {/* Left Wall (x = -5.5) */}
    <mesh position={[-5.5, 3.2, -0.5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[14, 6.8]} />
      <meshStandardMaterial color="#262d24" roughness={0.8} />
    </mesh>

    {/* Right Wall (x = +5.5) */}
    <mesh position={[5.5, 3.2, -0.5]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[14, 6.8]} />
      <meshStandardMaterial color="#262d24" roughness={0.8} />
    </mesh>

    {/* Ceiling */}
    <mesh position={[0, 6.2, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 14]} />
      <meshStandardMaterial color="#1a201a" roughness={0.85} />
    </mesh>

    {/* Vertical Wall Support Ribs */}
    {[-3.8, -1.8, 1.8, 3.8].map((x, i) => (
      <group key={i} position={[x, 3.2, -4.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 6.8, 0.18]} />
          <meshStandardMaterial color="#3f483b" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
    ))}

    {/* Horizontal High-Pressure Steam Conduits */}
    <group position={[0, 5.3, -4.2]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 16, 16]} />
        <meshStandardMaterial color="#eab308" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.32, -0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 16, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>

    {/* Background Rack Status Meter Banks */}
    {[-3.0, 3.0].map((x, idx) => (
      <group key={idx} position={[x, 2.0, -4.45]}>
        <mesh>
          <boxGeometry args={[1.2, 1.8, 0.1]} />
          <meshStandardMaterial color="#1e241d" roughness={0.7} />
        </mesh>
        {[0, 1, 2, 3].map((row) => (
          <mesh key={row} position={[0, 0.6 - row * 0.35, 0.06]}>
            <boxGeometry args={[0.9, 0.18, 0.02]} />
            <meshStandardMaterial
              color={row % 2 === 0 ? "#ef4444" : "#f59e0b"}
              emissive={row % 2 === 0 ? "#dc2626" : "#d97706"}
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
      </group>
    ))}

    {/* Main Industrial Control Desk (spans x = -2.2 .. 0.5, depth 1.15, height 0.94) */}
    <group position={[-0.45, 0.47, -0.95]}>
      <mesh position={[0, -0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.90, 1.10]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.05, 1.20]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.44, 0.61]}>
        <boxGeometry args={[3.3, 0.04, 0.02]} />
        <meshStandardMaterial color="#eab308" roughness={0.4} />
      </mesh>
    </group>

    {/* Right Workstation Wing (x = 0.5 .. 1.8, angled toward Ivanych) */}
    <group position={[1.15, 0.47, -0.55]} rotation={[0, -0.28, 0]}>
      <mesh position={[0, -0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.90, 1.10]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.05, 1.18]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.44, 0.60]}>
        <boxGeometry args={[1.48, 0.04, 0.02]} />
        <meshStandardMaterial color="#eab308" roughness={0.4} />
      </mesh>
    </group>

    {/* Desk Gauges on Left Console */}
    <group position={[-1.15, 0.97, -0.95]}>
      <mesh position={[-0.1, 0.08, -0.22]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[1.1, 0.22, 0.32]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      {[-0.32, 0, 0.32].map((gx, gi) => (
        <group key={gi} position={[gx - 0.1, 0.13, -0.25]} rotation={[-0.35, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.015, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[0, Math.sin(t * 3.5 + gi * 2) * 1.2, 0]}>
            <boxGeometry args={[0.01, 0.01, 0.07]} />
            <meshBasicMaterial color="#dc2626" />
          </mesh>
        </group>
      ))}
    </group>
  </group>
);

// Meltdown Eruption: Branching Glowing Floor Fissures & Expanding Plasma Sphere
const MeltdownEruption3D: React.FC<{ t: number }> = ({ t }) => {
  if (t < CUES.s2_zero) return null;

  const dt = t - CUES.s2_boom;
  const isBoom = dt >= 0;
  const boomProgress = clamp(dt / 2.8);

  const sphereScale = isBoom ? lerp(0.2, 24, easeIn(boomProgress)) : 0.01;
  const sphereIntensity = isBoom ? lerp(4, 35, boomProgress) : 0;
  const floorLightIntensity = isBoom ? lerp(8, 25, boomProgress) : 6.0;

  // Interconnected branching crack network radiating across floor from core [0, 0, -1.2]
  const CRACKS: { start: [number, number]; end: [number, number]; width: number }[] = [
    // Main Left Trunk toward Petya
    { start: [-0.05, -1.2], end: [-0.55, -0.3], width: 0.12 },
    { start: [-0.55, -0.3], end: [-1.25, 0.4], width: 0.10 },
    { start: [-1.25, 0.4], end: [-2.1, 1.1], width: 0.08 },
    // Left Branches
    { start: [-0.55, -0.3], end: [-0.95, 0.15], width: 0.09 },
    { start: [-0.95, 0.15], end: [-0.75, 0.95], width: 0.07 },
    { start: [-1.25, 0.4], end: [-1.8, 0.1], width: 0.07 },
    { start: [-0.05, -1.2], end: [-0.9, -1.9], width: 0.08 },
    { start: [-0.9, -1.9], end: [-1.8, -2.6], width: 0.06 },

    // Main Right Trunk toward Ivanych
    { start: [0.05, -1.2], end: [0.55, -0.35], width: 0.12 },
    { start: [0.55, -0.35], end: [1.2, 0.35], width: 0.10 },
    { start: [1.2, 0.35], end: [2.0, 1.0], width: 0.08 },
    // Right Branches
    { start: [0.55, -0.35], end: [0.85, 0.1], width: 0.08 },
    { start: [0.85, 0.1], end: [0.65, 0.85], width: 0.06 },
    { start: [1.2, 0.35], end: [1.7, 0.1], width: 0.07 },
    { start: [0.05, -1.2], end: [0.85, -1.9], width: 0.08 },
    { start: [0.85, -1.9], end: [1.7, -2.5], width: 0.06 },

    // Center Front Spikes
    { start: [0.0, -1.2], end: [-0.15, -0.4], width: 0.11 },
    { start: [-0.15, -0.4], end: [0.15, 0.45], width: 0.09 },
    { start: [0.15, 0.45], end: [-0.05, 1.35], width: 0.08 },
    { start: [0.0, -1.2], end: [0.0, -2.8], width: 0.10 },
  ];

  return (
    <group>
      {/* Radiating Branching Fissures on Floor */}
      <group position={[0, 0.025, 0]}>
        {CRACKS.map((c, i) => {
          const dx = c.end[0] - c.start[0];
          const dz = c.end[1] - c.start[1];
          const len = Math.sqrt(dx * dx + dz * dz);
          const angle = Math.atan2(dx, dz);
          const cx = (c.start[0] + c.end[0]) / 2;
          const cz = (c.start[1] + c.end[1]) / 2;

          return (
            <group key={i} position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, -angle]}>
              {/* Outer Cyan Glow Fringe */}
              <mesh position={[0, 0, -0.002]}>
                <planeGeometry args={[c.width * 2.2, len]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
              </mesh>
              {/* Core Blinding White Crack */}
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[c.width, len]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          );
        })}

        {/* Central Rupture Point */}
        <mesh position={[0, 0.005, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.003, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.75, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
        </mesh>
      </group>

      {/* Multiple Floor Point Lights Illuminating Room from Below */}
      <pointLight position={[0, 0.35, -1.2]} color="#67e8f9" intensity={floorLightIntensity} distance={12} />
      <pointLight position={[-0.8, 0.35, 0.3]} color="#ffffff" intensity={floorLightIntensity * 0.6} distance={8} />
      <pointLight position={[0.8, 0.35, 0.3]} color="#38bdf8" intensity={floorLightIntensity * 0.6} distance={8} />

      {/* Volumetric Vertical Light Shafts Rising through Fissures */}
      {[-1.0, -0.3, 0.3, 1.0].map((vx, vi) => (
        <mesh key={vi} position={[vx, 1.6, -0.5 + vi * 0.3]}>
          <cylinderGeometry args={[0.08 + vi * 0.04, 0.18 + vi * 0.06, 3.2, 12]} />
          <meshBasicMaterial color={vi % 2 === 0 ? "#ffffff" : "#67e8f9"} transparent opacity={isBoom ? 0.75 : 0.4} />
        </mesh>
      ))}

      {/* Blinding Expanding Plasma Energy Core */}
      {isBoom && (
        <group position={[0, 1.6, -3.8]} scale={sphereScale}>
          <mesh>
            <sphereGeometry args={[1, 32, 24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh scale={1.12}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
          </mesh>
          <pointLight color="#ffffff" intensity={sphereIntensity} distance={40} />
        </group>
      )}

      {/* Screen White-Out Flash at Climax (t >= 75.8) */}
      {t >= 75.8 && (
        <mesh position={[0, 1.6, 2.0]}>
          <planeGeometry args={[12, 12]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={clamp((t - 75.8) / 0.85)}
          />
        </mesh>
      )}
    </group>
  );
};

// Camera Choreography Helper (Framed specifically for 9:16 vertical Shorts safe zones)
function getCameraParams(t: number): {
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  shake: number;
} {
  // Shot 1: s2_petya1 (30.01 .. 37.65) - Wide alarm shot framing both Petya & Ivanych comfortably inside 9:16 portrait
  if (t < 37.65) {
    const shake = 0.55 + 0.25 * Math.sin(t * 8.5);
    return {
      pos: [0.0, 2.1, 9.0],
      lookAt: [0.0, 1.65, -0.2],
      fov: 46,
      shake,
    };
  }

  // Shot 2: s2_ivan1 (37.65 .. 53.00) - Medium shot framing BOTH Ivanych + headphones + gamepad AND 99% screen side-by-side (shifted right so zero Petya hand overlap)
  if (t < 53.00) {
    const p = ease(seg(t, 37.65, 52.69));
    return {
      pos: [
        lerp(0.55, 0.52, p),
        lerp(1.55, 1.50, p),
        lerp(4.6, 4.4, p),
      ],
      lookAt: [0.52, 1.35, -0.1],
      fov: lerp(42, 40, p),
      shake: 0.05,
    };
  }

  // Shot 3A: s2_petya2 (53.00 .. 55.50) - Tight panicked reaction cut to Petya screaming ("Мы умрём!")
  if (t < 55.50) {
    return {
      pos: [-0.78, 1.62, 4.4],
      lookAt: [-0.82, 1.45, 0.5],
      fov: 38,
      shake: 0.85,
    };
  }

  // Shot 3B: s2_ivan2 (55.50 .. 61.25) - Reaction cut to chilled Ivanych ("Все там будем...")
  if (t < 61.25) {
    return {
      pos: [0.52, 1.55, 4.5],
      lookAt: [0.50, 1.35, -0.1],
      fov: 40,
      shake: 0.06,
    };
  }

  // Shot 4A: s2_menu & start of s2_ivan3 (61.25 .. 66.50)
  // frame 1550 (64.58s): Medium shot framing BOTH 3/4 sculpted 3D Pink Flamingo silhouette on Vice City screen AND Ivanych's crying face
  if (t < 66.50) {
    return {
      pos: [0.46, 1.50, 4.65],
      lookAt: [0.42, 1.38, -0.1],
      fov: 42,
      shake: 0.04,
    };
  }

  // Shot 4B: s2_ivan3 climax (66.50 .. 72.95) - Ivanych with tears of joy + flamingo in 3/4 framing
  if (t < 72.95) {
    return {
      pos: [0.46, 1.50, 4.65],
      lookAt: [0.42, 1.38, -0.1],
      fov: 42,
      shake: 0.04,
    };
  }

  // Shot 5: s2_zero & s2_boom (72.95 .. 76.80)
  // frame 1765 (73.54s): Wide dramatic shot: wall timer hits 00:00, glowing floor fissures erupt across floor, expanding energy sphere
  const dt = t - CUES.s2_boom;
  const shake = dt < 0 ? 0.35 : lerp(1.5, 4.5, seg(t, 74.0, 76.8));
  return {
    pos: [0.0, 2.15, 9.2],
    lookAt: [0.0, 1.60, -0.2],
    fov: 46,
    shake,
  };
}

// Main Scene 2 3D Component
export const Scene2Shorts3D: React.FC<{ t?: number }> = ({ t: propT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = propT ?? SCENES.s2.start + frame / fps;

  // Pre-memoize 46 countdown textures (00:45 down to 00:00) with wide padding to prevent clipped letters
  const countdownTextures = useMemo(() => {
    const textures: THREE.CanvasTexture[] = [];
    for (let s = 0; s <= 45; s++) {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = s === 0 ? "#450a0a" : "#0f172a";
        ctx.fillRect(0, 0, 768, 256);

        // Hazard stripes top & bottom
        const stripeHeight = 16;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, 768, stripeHeight);
        ctx.fillRect(0, 256 - stripeHeight, 768, stripeHeight);
        ctx.fillStyle = "#eab308";
        for (let x = -20; x < 790; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 16, 0);
          ctx.lineTo(x, stripeHeight);
          ctx.lineTo(x - 16, stripeHeight);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(x, 256 - stripeHeight);
          ctx.lineTo(x + 16, 256 - stripeHeight);
          ctx.lineTo(x, 256);
          ctx.lineTo(x - 16, 256);
          ctx.fill();
        }

        // Title
        ctx.fillStyle = s === 0 ? "#f87171" : "#facc15";
        ctx.font = `bold 30px "Arial Black", Impact, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s === 0 ? "АВАРИЙНЫЙ РАЗРЫВ АКТИВНОЙ ЗОНЫ" : "ВРЕМЯ ДО ВЗРЫВА:", 384, 46);

        // Countdown numbers
        const mm = "00";
        const ss = String(s).padStart(2, "0");
        const timeStr = `${mm}:${ss}`;
        ctx.fillStyle = s <= 5 ? "#ef4444" : s <= 15 ? "#f97316" : "#e2e8f0";
        ctx.font = `bold 96px "Arial Black", Impact, sans-serif`;
        ctx.fillText(timeStr, 384, 128);

        // Core stress meter
        if (s === 0) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold 32px "Arial Black", Impact, sans-serif`;
          ctx.fillText("! КРИТИЧЕСКИЙ СБОЙ !", 384, 204);
        } else {
          const stress = (45 - s) / 45;
          const barW = 540;
          const barH = 18;
          const barX = (768 - barW) / 2;
          const barY = 196;

          ctx.fillStyle = "#334155";
          ctx.fillRect(barX, barY, barW, barH);

          ctx.fillStyle = stress > 0.8 ? "#ef4444" : stress > 0.5 ? "#f97316" : "#eab308";
          ctx.fillRect(barX, barY, barW * stress, barH);

          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 2;
          ctx.strokeRect(barX, barY, barW, barH);
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      textures.push(tex);
    }
    return textures;
  }, []);

  // Pre-memoize Monitor Screen Textures (Generous margins, zero clipped letters)
  const shaderScreenTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, 512, 320);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x < 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 320);
        ctx.stroke();
      }
      for (let y = 0; y < 320; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#f43f5e";
      ctx.font = `bold 30px "Arial Black", Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GRAND THEFT AUTO VI", 256, 52);

      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold 20px "Arial Black", sans-serif`;
      ctx.fillText("ОПТИМИЗАЦИЯ СИСТЕМЫ", 256, 90);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = `bold 22px sans-serif`;
      ctx.fillText("КОМПИЛЯЦИЯ ШЕЙДЕРОВ...", 256, 145);

      const barW = 380;
      const barH = 34;
      const barX = (512 - barW) / 2;
      const barY = 172;

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.fillStyle = "#22c55e";
      ctx.fillRect(barX + 2, barY + 2, (barW - 4) * 0.99, barH - 4);

      ctx.fillStyle = "#052e16";
      ctx.font = `900 22px "Arial Black", sans-serif`;
      ctx.fillText("99%", 256, barY + barH / 2);

      ctx.fillStyle = "#94a3b8";
      ctx.font = `italic 16px sans-serif`;
      ctx.fillText("Не выключайте питание системы", 256, 240);
      ctx.fillStyle = "#64748b";
      ctx.font = `14px sans-serif`;
      ctx.fillText("13 ЛЕТ ОЖИДАНИЯ • ПРЕДРЕЛИЗНЫЙ БИЛД", 256, 275);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const viceCityMenuTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 320);
      grad.addColorStop(0, "#831843");
      grad.addColorStop(0.4, "#4c1d95");
      grad.addColorStop(0.7, "#1e1b4b");
      grad.addColorStop(1, "#09090b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 320);

      // Palm tree silhouette
      ctx.beginPath();
      ctx.moveTo(20, 320);
      ctx.quadraticCurveTo(45, 180, 70, 90);
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#0f172a";
      ctx.stroke();

      const drawFrond = (ox: number, oy: number, ex: number, ey: number) => {
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(ox + (ex - ox) * 0.5, oy - 25, ex, ey);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#0f172a";
        ctx.stroke();
      };
      drawFrond(70, 90, 10, 60);
      drawFrond(70, 90, 25, 40);
      drawFrond(70, 90, 80, 35);
      drawFrond(70, 90, 120, 55);
      drawFrond(70, 90, 130, 90);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#fef08a";
      ctx.font = `bold 20px "Arial Black", Impact, sans-serif`;
      ctx.fillText("★ GRAND THEFT AUTO VI ★", 256, 36);

      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 15;
      ctx.font = `900 48px "Arial Black", Impact, sans-serif`;
      ctx.fillText("VICE CITY", 256, 92);
      ctx.shadowBlur = 0;

      const btnW = 300;
      const btnH = 46;
      const btnX = (512 - btnW) / 2;
      const btnY = 142;

      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 4;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = "#09090b";
      ctx.font = `900 24px "Arial Black", sans-serif`;
      ctx.fillText("▶ НОВАЯ ИГРА ◀", 256, btnY + btnH / 2);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = `bold 20px sans-serif`;
      ctx.fillText("ПРОДОЛЖИТЬ", 256, 218);
      ctx.fillText("НАСТРОЙКИ", 256, 254);

      ctx.fillStyle = "#f472b6";
      ctx.font = `italic 14px sans-serif`;
      ctx.fillText("4K • 60 FPS • RAY TRACING: ULTRA", 256, 292);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const viceCityClickedTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 320);
      grad.addColorStop(0, "#9d174d");
      grad.addColorStop(0.5, "#581c87");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 320);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#fef08a";
      ctx.font = `bold 20px "Arial Black", Impact, sans-serif`;
      ctx.fillText("★ GRAND THEFT AUTO VI ★", 256, 36);

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 20;
      ctx.font = `900 48px "Arial Black", Impact, sans-serif`;
      ctx.fillText("VICE CITY", 256, 92);
      ctx.shadowBlur = 0;

      const btnW = 300;
      const btnH = 46;
      const btnX = (512 - btnW) / 2;
      const btnY = 142;

      ctx.fillStyle = "#fef08a";
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = "#831843";
      ctx.font = `900 24px "Arial Black", sans-serif`;
      ctx.fillText("ЗАГРУЗКА ИГРЫ...", 256, btnY + btnH / 2);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = `bold 20px sans-serif`;
      ctx.fillText("ПРОДОЛЖИТЬ", 256, 218);
      ctx.fillText("НАСТРОЙКИ", 256, 254);

      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold 15px sans-serif`;
      ctx.fillText("ДОБРО ПОЖАЛОВАТЬ В ВАЙС-СИТИ!", 256, 292);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Wide 1024x160 header with ample padding so zero Russian letters clip
  const warningTitleTex = useMemo(() => {
    return makeSignTexture(
      ["КРИТИЧЕСКИЙ ПЕРЕГРЕВ РЕАКТОРА"],
      "#450a0a",
      "#fef08a",
      "#dc2626",
      1024,
      160,
      40
    );
  }, []);

  const buttonSignTex = useMemo(() => {
    return makeSignTexture(
      ["АЗ-5", "АВАРИЙНЫЙ СБРОС"],
      "#facc15",
      "#111827",
      "#000000",
      384,
      160,
      32
    );
  }, []);

  // Compute countdown index (45 down to 00 at CUES.s2_zero)
  const secLeft = Math.max(0, Math.min(45, Math.ceil(CUES.s2_zero - t)));
  const currentCountdownTex = countdownTextures[secLeft];

  // Camera parameters for current timestamp
  const cam = getCameraParams(t);

  // Character lip sync
  const ivanMouth = Math.max(
    getMouthOpen("s2_ivan1", t),
    getMouthOpen("s2_ivan2", t),
    getMouthOpen("s2_ivan3", t)
  );
  const petyaMouth = Math.max(
    getMouthOpen("s2_petya1", t),
    getMouthOpen("s2_petya2", t)
  );

  const isMenu = t >= CUES.s2_menu;

  // Petya pose & positioning logic: when Ivanych is speaking, lower Petya's arms (idle) and shift him further left so zero hand pokes into close-ups
  const isPetyaSpeaking = (t >= 30.01 && t < 37.65) || (t >= 53.00 && t < 55.50);
  const petyaX = isPetyaSpeaking || t >= 72.95 ? -0.82 : -1.60;
  const petyaPose = isPetyaSpeaking || t >= 72.95 ? "panic" : "idle";

  return (
    <>
      <color attach="background" args={["#141915"]} />

      {/* Main Studio & Industrial Lighting */}
      <ambientLight intensity={0.9} color="#94a3b8" />
      <directionalLight
        position={[1.5, 5.5, 2.5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-2.5, 4.0, 1.0]}
        intensity={0.6}
        color="#cbd5e1"
      />

      {/* Synchronized 3D Camera Rig */}
      <CameraRig pos={cam.pos} lookAt={cam.lookAt} fov={cam.fov} shake={cam.shake} t={t} />

      {/* Room Architecture & Control Desks */}
      <ControlRoomEnvironment3D t={t} />

      {/* Dual Rotating Red Alarm Beacons */}
      <AlarmBeacon3D position={[-2.8, 4.4, -4.2]} t={t} active={t < CUES.s2_boom} />
      <AlarmBeacon3D position={[2.8, 4.4, -4.2]} t={t} active={t < CUES.s2_boom} />

      {/* Overhead Warning Display (Centered at [0, 3.15, -4.40], lowered below HUD overlays) */}
      <OverheadWarningBoard3D
        position={[0, 3.15, -4.40]}
        titleTex={warningTitleTex}
        countdownTex={currentCountdownTex}
        t={t}
      />

      {/* Front-Left Desk Emergency Dome Button Console & Tea Mug (Cleanly visible, zero shadow/waist occlusion) */}
      <EmergencyButtonConsole3D
        position={[-0.58, 0.96, -0.55]}
        t={t}
        signTex={buttonSignTex}
      />
      <TeaMug3D position={[-0.25, 0.96, -0.60]} />
      <TeaSteam3D position={[-0.25, 0.96, -0.60]} t={t} />

      {/* Desk Center-Right: Wide Curved Gaming Monitor */}
      <GamingMonitor3D
        position={[0.10, 1.35, -0.48]}
        yaw={0.22}
        t={t}
        shaderTex={shaderScreenTex}
        viceCityTex={viceCityMenuTex}
        clickedTex={viceCityClickedTex}
      />

      {/* Stylized 3D Pink Flamingo in 3/4 Side Profile on Hologram Pedestal (from CUES.s2_menu, at x = -0.04, z = -0.10) */}
      {isMenu && (
        <Flamingo3D
          position={[-0.04, 0.96, -0.10]}
          rotation={[0, 0.95, 0]}
          scale={0.90}
          t={t}
        />
      )}

      {/* Ivanych's Ergonomic Swivel Chair (Zero clipping: chair strictly behind character) */}
      <SwivelChair3D position={[0.76, 0, 0.45]} yaw={-0.75} />

      {/* Ivanych: 58yo Shift Boss (Cleanly on right at x = +0.76, z = 0.45) */}
      <Character3D
        position={[0.76, 0, 0.45]}
        yaw={-0.75}
        shirtColor="#475569"
        pantsColor="#1e293b"
        hair="headphones"
        hairColor="#9ca3af"
        mustacheColor="#64748b"
        holdGamepad={true}
        pose={isMenu ? "sit_play" : "sit_chill"}
        eyes={isMenu ? "wide" : "normal"}
        tears={isMenu ? 1 : 0}
        mood="smile"
        mouthOpen={ivanMouth}
        t={t}
        seed={201}
      />

      {/* Petya: Young Panicked Trainee (Arms lowered during Ivanych speech, zero disembodied hand poking) */}
      <Character3D
        position={[petyaX, 0, 0.65]}
        yaw={0.45}
        hair="helmet"
        hatColor="#facc15"
        shirtColor="#f8fafc"
        pantsColor="#334155"
        tieColor="#dc2626"
        eyes="wide"
        mood="scream"
        mouthOpen={petyaMouth}
        pose={petyaPose}
        headTurn={Math.sin(t * 7.5) * 0.35}
        t={t}
        seed={202}
      />

      {/* Climax Meltdown: Branching Glowing Floor Fissures & Expanding Plasma Sphere */}
      <MeltdownEruption3D t={t} />
    </>
  );
};
