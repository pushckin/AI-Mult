import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUES, getMouthOpen } from "../data/scene1Timeline";
import { Bird3D, Character3D, MoneyBag3D } from "../components3d/Character3D";
import { ArmoredVan3D, FireTruck3D, WildFireHose3D } from "../components3d/Vehicles3D";
import { makeSignTexture } from "../components3d/SignTexture";

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p, 0, 1);
const seg = (t: number, a: number, b: number) => clamp((t - a) / Math.max(0.0001, b - a));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
const easeIn = (p: number) => Math.pow(clamp(p), 2.2);
const elasticOut = (p: number) => {
  const x = clamp(p);
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

// Deterministic 3D Camera Rig (uses useLayoutEffect so camera updates BEFORE ThreeCanvas's ManualFrameRenderer effect)
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

// Reusable 3D Recessed Office Window (used for the 8 surrounding windows)
const DecorativeWindow3D: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    {/* Dark glass */}
    <mesh position={[0, 0, -0.02]}>
      <boxGeometry args={[1.95, 2.15, 0.08]} />
      <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.5} />
    </mesh>
    {/* Wooden outer trim */}
    <mesh position={[0, 1.12, 0.05]} castShadow>
      <boxGeometry args={[2.16, 0.14, 0.14]} />
      <meshStandardMaterial color="#6e4e26" roughness={0.65} />
    </mesh>
    <mesh position={[0, -1.14, 0.07]} castShadow>
      <boxGeometry args={[2.28, 0.18, 0.22]} />
      <meshStandardMaterial color="#5c4028" roughness={0.65} />
    </mesh>
    <mesh position={[-1.02, 0, 0.05]}>
      <boxGeometry args={[0.14, 2.24, 0.14]} />
      <meshStandardMaterial color="#6e4e26" roughness={0.65} />
    </mesh>
    <mesh position={[1.02, 0, 0.05]}>
      <boxGeometry args={[0.14, 2.24, 0.14]} />
      <meshStandardMaterial color="#6e4e26" roughness={0.65} />
    </mesh>
    {/* Center mullion & left transom */}
    <mesh position={[-0.08, 0, 0.04]}>
      <boxGeometry args={[0.1, 2.16, 0.1]} />
      <meshStandardMaterial color="#6e4e26" roughness={0.65} />
    </mesh>
    <mesh position={[-0.55, 0.36, 0.04]}>
      <boxGeometry args={[0.92, 0.1, 0.1]} />
      <meshStandardMaterial color="#6e4e26" roughness={0.65} />
    </mesh>
  </group>
);

const Tree3D: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 1.1, 0]} castShadow>
      <cylinderGeometry args={[0.16, 0.24, 2.2, 10]} />
      <meshStandardMaterial color="#5c4028" roughness={0.85} />
    </mesh>
    <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
      <sphereGeometry args={[1.05, 16, 14]} />
      <meshStandardMaterial color="#567d38" roughness={0.75} />
    </mesh>
    <mesh position={[0.45, 3.1, 0.2]} castShadow>
      <sphereGeometry args={[0.68, 14, 12]} />
      <meshStandardMaterial color="#699643" roughness={0.75} />
    </mesh>
    <mesh position={[-0.45, 2.9, -0.15]} castShadow>
      <sphereGeometry args={[0.62, 14, 12]} />
      <meshStandardMaterial color="#4b6f30" roughness={0.75} />
    </mesh>
  </group>
);

// ---------- SHOT 1A: 3D Office Building + Native Central Window + Birds + Breakout ----------
const Shot1AOffice: React.FC<{ t: number }> = ({ t }) => {
  const notified = t >= CUES.s1_notify;
  const broken = t >= CUES.s1_glass;
  const dt = broken ? t - CUES.s1_glass : 0;

  const zoomP = ease(seg(t, CUES.s1_notify - 0.1, CUES.s1_glass));
  const camZ = lerp(18.0, 8.1, zoomP);
  const camY = lerp(5.3, 5.25, zoomP);
  const shake = broken ? Math.max(0, 22 * (1 - dt / 0.6)) : notified ? 4 : 0;

  const screenTex = useMemo(
    () => makeSignTexture(["GTA VI", notified ? "99% READY!" : "LOADING..."], notified ? "#22c55e" : "#1e293b", "#ffffff", "#0f172a", 256, 160, 38),
    [notified]
  );

  return (
    <>
      <color attach="background" args={["#6bb9e8"]} />
      <fog attach="fog" args={["#89cbed", 26, 60]} />
      <CameraRig pos={[0, camY, camZ]} lookAt={[0, 5.2, 0]} fov={46} shake={shake} t={t} />

      <ambientLight intensity={0.75} />
      <directionalLight position={[10, 16, 14]} intensity={1.7} color="#fff7ed" castShadow />

      {/* Ground: Sidewalk & Asphalt Street */}
      <mesh position={[0, -0.25, 1.6]} receiveShadow>
        <boxGeometry args={[28, 0.5, 4.2]} />
        <meshStandardMaterial color="#a89068" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.35, 6.2]} receiveShadow>
        <boxGeometry args={[28, 0.4, 5.5]} />
        <meshStandardMaterial color="#37332d" roughness={0.9} />
      </mesh>

      {/* Fluffy 3D Morning Clouds */}
      {[-4.5, 0.8, 5.2].map((cx, i) => (
        <group key={i} position={[cx + t * 0.25, 11.4 + (i % 2) * 0.9, -4]}>
          <mesh>
            <sphereGeometry args={[1.1, 14, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <mesh position={[0.95, -0.18, 0]}>
            <sphereGeometry args={[0.8, 14, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          <mesh position={[-0.9, -0.2, 0]}>
            <sphereGeometry args={[0.75, 14, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Main 3D 3-Story Office Building with REAL architectural central cutout (x: -1.0..+1.0, y: 4.1..6.3) */}
      <group position={[0, 0, 0]}>
        {/* Lower Facade Slab (y: 0..4.1) */}
        <mesh position={[0, 2.05, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[8.4, 4.1, 0.5]} />
          <meshStandardMaterial color="#d49538" roughness={0.75} />
        </mesh>
        {/* Upper Facade Slab (y: 6.3..10.3) */}
        <mesh position={[0, 8.3, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[8.4, 4.0, 0.5]} />
          <meshStandardMaterial color="#d49538" roughness={0.75} />
        </mesh>
        {/* Left Pillar (x: -4.2..-1.0, y: 4.1..6.3) */}
        <mesh position={[-2.6, 5.2, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 2.2, 0.5]} />
          <meshStandardMaterial color="#d49538" roughness={0.75} />
        </mesh>
        {/* Right Pillar (x: +1.0..+4.2, y: 4.1..6.3) */}
        <mesh position={[2.6, 5.2, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 2.2, 0.5]} />
          <meshStandardMaterial color="#d49538" roughness={0.75} />
        </mesh>

        {/* Building Side Depth & Roof Cornice */}
        <mesh position={[-4.2, 5.15, -1.6]} receiveShadow>
          <boxGeometry args={[0.3, 10.3, 2.6]} />
          <meshStandardMaterial color="#b37825" roughness={0.8} />
        </mesh>
        <mesh position={[4.2, 5.15, -1.6]} receiveShadow>
          <boxGeometry args={[0.3, 10.3, 2.6]} />
          <meshStandardMaterial color="#b37825" roughness={0.8} />
        </mesh>
        <mesh position={[0, 10.48, -1.25]} castShadow>
          <boxGeometry args={[8.9, 0.46, 3.3]} />
          <meshStandardMaterial color="#a66d20" roughness={0.7} />
        </mesh>
        {/* Plinth */}
        <mesh position={[0, 0.25, -0.05]}>
          <boxGeometry args={[8.6, 0.5, 0.7]} />
          <meshStandardMaterial color="#785026" roughness={0.85} />
        </mesh>

        {/* Surrounding 8 Symmetrical 3D Windows */}
        {[-2.6, 0, 2.6].map((wx) =>
          [2.2, 5.2, 8.2].map((wy) => {
            if (wx === 0 && wy === 5.2) return null;
            return <DecorativeWindow3D key={`${wx}_${wy}`} position={[wx, wy, 0]} />;
          })
        )}

        {/* RECESSED 3D OFFICE ROOM INSIDE THE CENTRAL WINDOW OPENING */}
        <group>
          <pointLight position={[0, 5.9, -0.8]} color="#ffcb6b" intensity={5.0} distance={6.5} />
          {/* Room Back Wall */}
          <mesh position={[0, 5.2, -2.15]}>
            <boxGeometry args={[2.3, 2.3, 0.15]} />
            <meshStandardMaterial color="#f5d08a" emissive="#d97706" emissiveIntensity={0.22} roughness={0.6} />
          </mesh>
          {/* Room Floor, Ceiling, Left & Right Interior Walls */}
          <mesh position={[0, 4.18, -1.1]}>
            <boxGeometry args={[2.2, 0.16, 2.1]} />
            <meshStandardMaterial color="#784b26" roughness={0.75} />
          </mesh>
          <mesh position={[0, 6.26, -1.1]}>
            <boxGeometry args={[2.2, 0.14, 2.1]} />
            <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[-1.02, 5.2, -1.1]}>
            <boxGeometry args={[0.08, 2.2, 2.1]} />
            <meshStandardMaterial color="#e7b665" />
          </mesh>
          <mesh position={[1.02, 5.2, -1.1]}>
            <boxGeometry args={[0.08, 2.2, 2.1]} />
            <meshStandardMaterial color="#e7b665" />
          </mesh>

          {/* Outer Window Frame Trim (matching the other 8 windows!) */}
          <mesh position={[0, 6.32, 0.05]}>
            <boxGeometry args={[2.16, 0.14, 0.14]} />
            <meshStandardMaterial color="#6e4e26" roughness={0.65} />
          </mesh>
          <mesh position={[0, 4.06, 0.07]}>
            <boxGeometry args={[2.28, 0.18, 0.22]} />
            <meshStandardMaterial color="#5c4028" roughness={0.65} />
          </mesh>
          <mesh position={[-1.02, 5.2, 0.05]}>
            <boxGeometry args={[0.14, 2.24, 0.14]} />
            <meshStandardMaterial color="#6e4e26" roughness={0.65} />
          </mesh>
          <mesh position={[1.02, 5.2, 0.05]}>
            <boxGeometry args={[0.14, 2.24, 0.14]} />
            <meshStandardMaterial color="#6e4e26" roughness={0.65} />
          </mesh>

          {/* Desk & Monitor inside the room */}
          <mesh position={[0, 4.44, -0.58]}>
            <boxGeometry args={[1.45, 0.38, 0.45]} />
            <meshStandardMaterial color="#4a3219" roughness={0.7} />
          </mesh>
          <mesh position={[0.42, 4.82, -0.52]}>
            <boxGeometry args={[0.66, 0.42, 0.06]} />
            <meshStandardMaterial color="#18181b" roughness={0.35} />
          </mesh>
          <mesh position={[0.42, 4.82, -0.48]}>
            <planeGeometry args={[0.58, 0.34]} />
            <meshBasicMaterial map={screenTex} />
          </mesh>

          {/* Boss & Employee Inside Window (before breakout) + Bursting Out in 3D (after CUES.s1_glass) */}
          {!broken ? (
            <>
              <Character3D
                position={[-0.44, 4.26, -0.95]}
                scale={0.64}
                shirtColor="#334155"
                pantsColor="#1e293b"
                tieColor="#dc2626"
                hair="bald_sides"
                hairColor="#64748b"
                eyes="wide"
                brow={0.8}
                mood="scream"
                mouthOpen={0.4 + Math.sin(t * 14) * 0.25}
                pose="panic"
                t={t}
                seed={91}
              />
              <Character3D
                position={[0.44, 4.26 + (notified ? easeOut(seg(t, CUES.s1_notify, CUES.s1_notify + 0.35)) * 0.18 : 0), -0.92]}
                scale={0.66}
                shirtColor="#f8fafc"
                pantsColor="#334155"
                tieColor="#2563eb"
                hair="messy"
                eyes="red"
                brow={0.9}
                mood={notified ? "scream" : "buckteeth"}
                mouthOpen={notified ? 0.8 : 0.1}
                pose={notified ? "panic" : "idle"}
                t={t}
                seed={92}
                holdPhone={notified ? "GTA VI" : null}
              />
              {/* Intact Inner Wooden Mullions + Semi-transparent Glass */}
              <mesh position={[-0.08, 5.2, 0.03]}>
                <boxGeometry args={[0.09, 2.16, 0.09]} />
                <meshStandardMaterial color="#6e4e26" roughness={0.65} />
              </mesh>
              <mesh position={[-0.55, 5.56, 0.03]}>
                <boxGeometry args={[0.92, 0.09, 0.09]} />
                <meshStandardMaterial color="#6e4e26" roughness={0.65} />
              </mesh>
              <mesh position={[0, 5.2, 0.02]}>
                <planeGeometry args={[1.95, 2.15]} />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.22} roughness={0.1} />
              </mesh>
            </>
          ) : (
            <>
              {/* Jagged Glass Shards Remaining in Frame Perimeter */}
              {[
                [-0.86, 6.1, -0.3],
                [0.86, 6.08, 0.3],
                [-0.86, 4.3, 0.4],
                [0.86, 4.32, -0.4],
              ].map(([sx, sy, rz], i) => (
                <mesh key={i} position={[sx, sy, 0.04]} rotation={[0, 0, rz]} scale={[0.18, 0.38, 0.04]}>
                  <coneGeometry args={[1, 1, 3]} />
                  <meshStandardMaterial color="#a5f3fc" roughness={0.15} metalness={0.3} />
                </mesh>
              ))}

              {/* 32 Flying 3D Glass Shards Bursting Toward Camera */}
              {Array.from({ length: 32 }).map((_, i) => {
                const a = (i / 32) * Math.PI * 2 + hash(i) * 0.4;
                const spd = 2.6 + hash(i * 3.1) * 3.2;
                const gx = Math.cos(a) * dt * spd;
                const gy = 5.2 + Math.sin(a) * dt * spd * 0.85 - dt * dt * 5.2;
                const gz = 0.2 + dt * (4.5 + hash(i * 5.7) * 3.5);
                return (
                  <mesh
                    key={i}
                    position={[gx, gy, gz]}
                    rotation={[dt * (4 + i), dt * 6, a]}
                    scale={[0.14, 0.22, 0.03]}
                  >
                    <coneGeometry args={[1, 1, 3]} />
                    <meshStandardMaterial color="#a5f3fc" transparent opacity={0.85} roughness={0.1} />
                  </mesh>
                );
              })}

              {/* Flying Orange 3D Beanbag Chair */}
              <mesh
                position={[lerp(-0.65, -2.1, dt / 0.55), 5.65 + Math.sin(clamp(dt / 0.55) * Math.PI) * 0.6 - dt * 1.1, lerp(0.1, 3.6, dt / 0.55)]}
                rotation={[dt * 6, dt * 8, dt * 5]}
                scale={[0.56, 0.45, 0.56]}
                castShadow
              >
                <sphereGeometry args={[1, 16, 14]} />
                <meshStandardMaterial color="#ea580c" roughness={0.6} />
              </mesh>

              {/* Employee Bursting Out the Window in 3D */}
              {(() => {
                const p = dt / 0.6;
                const empX = lerp(0.25, 0.85, p);
                const empY = lerp(4.45, 2.9, p) + Math.sin(clamp(p) * Math.PI) * 0.65;
                const empZ = lerp(-0.2, 3.8, p);
                return (
                  <>
                    <Character3D
                      position={[empX, empY, empZ]}
                      rotation={[0.45, -0.25, -0.18]}
                      scale={0.88}
                      shirtColor="#f8fafc"
                      pantsColor="#334155"
                      tieColor="#2563eb"
                      hair="messy"
                      eyes="red"
                      brow={0.9}
                      mood="scream"
                      mouthOpen={0.9}
                      pose="sprint"
                      t={t}
                      seed={101}
                      holdPhone="GTA VI"
                    />

                    {/* Boss Lunging Out After Employee, Clinging onto His Trailing Leg */}
                    <Character3D
                      position={[empX - 0.18, empY - 0.05, empZ - 0.22]}
                      rotation={[-0.35, 0, 0]}
                      yaw={0.38}
                      scale={0.82}
                      shirtColor="#334155"
                      pantsColor="#1e293b"
                      tieColor="#dc2626"
                      hair="bald_sides"
                      hairColor="#64748b"
                      eyes="wide"
                      brow={-0.9}
                      tears={1}
                      mood="scream"
                      mouthOpen={0.95}
                      pose="dragged"
                      t={t}
                      seed={102}
                    />
                  </>
                );
              })()}
            </>
          )}
        </group>
      </group>

      {/* Edge Trees */}
      <Tree3D position={[-4.6, 0, 1.4]} scale={1.15} />
      <Tree3D position={[4.6, 0, 1.4]} scale={1.15} />

      {/* 4 Animated 3D Birds Flying & plummeting at 3.25s */}
      {[0, 1, 2, 3].map((b) => {
        const flyT = notified ? CUES.s1_notify : t;
        const bx = -3.2 + ((b * 2.1 + flyT * 1.35) % 6.8);
        const fallDt = notified ? t - CUES.s1_notify : 0;
        const rawY = 7.9 + (b % 2) * 1.35 + Math.sin(t * 4.5 + b) * 0.25 - (notified ? fallDt * fallDt * 34 : 0);
        const by = Math.max(0.14, rawY);
        return <Bird3D key={b} position={[bx, by, 2.0]} t={t} seed={b + 1} falling={notified} fallDt={fallDt} />;
      })}
    </>
  );
};

// ---------- SHOT 1B: 3D Sunset Boulevard Dragging & Hero Kick ----------
const Shot1BStreetChase: React.FC<{ t: number }> = ({ t }) => {
  const shakeOut = t >= CUES.s1_shakeoff;
  const kickDt = shakeOut ? t - CUES.s1_shakeoff : 0;
  const dragDt = t - CUES.s1_boss;
  const scrollDist = shakeOut
    ? (CUES.s1_shakeoff - CUES.s1_boss) * 6.5 + kickDt * 11.0
    : dragDt * 6.5;

  const camZ = shakeOut ? lerp(11.4, 12.6, clamp(kickDt / 0.8)) : 11.4;
  const shake = shakeOut && kickDt < 0.42 ? 18 * (1 - kickDt / 0.42) : 2.5;

  // Seamless looping 3D city tiles along X
  const tileLen = 10;
  const scrollMod = scrollDist % tileLen;

  const flyP = clamp(kickDt / 0.82);
  const bossX = lerp(-0.4, -2.5, easeOut(flyP));
  const bossY = flyP < 1 ? 0.35 + Math.sin(flyP * Math.PI) * 2.35 : 0.15;
  const bossLanded = flyP >= 0.96;

  // Dynamic position of Employee & exact ankle point where Boss grips his leg
  const empX = 1.25 + Math.sin(t * 14) * 0.06;
  const empY = 0;
  const empZ = 1.15;
  const empYaw = Math.PI / 2 - 0.12;
  const grabX = empX - 0.28 + Math.sin(t * 19 + 101 * 1.37) * 0.18;
  const grabY = 0.02 + Math.abs(Math.cos(t * 19)) * 0.06;

  return (
    <>
      <color attach="background" args={["#d97724"]} />
      <fog attach="fog" args={["#e07b29", 18, 46]} />
      <CameraRig pos={[0, 2.35, camZ]} lookAt={[0, 1.5, 0]} fov={46} shake={shake} t={t} />

      <ambientLight intensity={0.98} color="#ffedd5" />
      <directionalLight position={[-10, 9, 12]} intensity={1.85} color="#fed7aa" castShadow />
      <directionalLight position={[4, 4, 14]} intensity={0.75} color="#ffffff" />

      {/* Big Sunset Sun Orb Behind City */}
      <mesh position={[-3.5, 6.5, -24]}>
        <sphereGeometry args={[3.2, 24, 24]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>

      {/* Road & Sidewalk */}
      <mesh position={[0, -0.2, 1.5]} receiveShadow>
        <boxGeometry args={[46, 0.4, 10]} />
        <meshStandardMaterial color="#38342e" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.1, -2.8]} receiveShadow>
        <boxGeometry args={[46, 0.3, 3.2]} />
        <meshStandardMaterial color="#785e3c" roughness={0.85} />
      </mesh>

      {/* Scrolling Road Lane Dashes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const dx = -18 + i * 3.5 - (scrollDist % 3.5);
        return (
          <mesh key={i} position={[dx, 0.02, 1.6]}>
            <boxGeometry args={[1.6, 0.02, 0.18]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        );
      })}

      {/* Scrolling Background 3D City Buildings & Streetlamps */}
      {[-1, 0, 1, 2].map((tileIdx) => {
        const bx = tileIdx * tileLen - scrollMod;
        return (
          <group key={tileIdx} position={[bx, 0, -5.8]}>
            <mesh position={[-2.8, 3.5, 0]} castShadow>
              <boxGeometry args={[3.6, 7.0, 3.2]} />
              <meshStandardMaterial color="#7c4a21" roughness={0.8} />
            </mesh>
            <mesh position={[2.2, 4.8, -0.5]} castShadow>
              <boxGeometry args={[4.2, 9.6, 3.4]} />
              <meshStandardMaterial color="#5c3618" roughness={0.85} />
            </mesh>
            {/* Glowing Sunset Windows */}
            {[-3.4, -2.2, 1.4, 2.8].map((wx, wi) =>
              [2.2, 4.0, 5.8].map((wy, hi) => (
                <mesh key={`${wi}_${hi}`} position={[wx, wy, 1.68]}>
                  <planeGeometry args={[0.75, 0.95]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.45} />
                </mesh>
              ))
            )}
            {/* Streetlamp set back along sidewalk building edge away from flying Boss */}
            <group position={[4.6, 0, 1.85]}>
              <mesh position={[0, 2.1, 0]}>
                <cylinderGeometry args={[0.06, 0.08, 4.2, 8]} />
                <meshStandardMaterial color="#1f2937" metalness={0.5} />
              </mesh>
              <mesh position={[0, 4.25, 0.25]}>
                <sphereGeometry args={[0.2, 10, 10]} />
                <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.8} />
              </mesh>
            </group>
            <Tree3D position={[-4.5, 0, 3.4]} scale={0.95} />
          </group>
        );
      })}

      {!shakeOut ? (
        <>
          {/* Boss dragged horizontally on belly behind Employee, hands locked onto Employee's trailing ankle */}
          <Character3D
            position={[grabX, grabY, empZ]}
            yaw={empYaw}
            scale={1.08}
            shirtColor="#334155"
            pantsColor="#1e293b"
            tieColor="#dc2626"
            hair="bald_sides"
            hairColor="#64748b"
            eyes="wide"
            brow={-0.8}
            tears={1}
            mood="scream"
            mouthOpen={getMouthOpen("s1_boss", t)}
            pose="dragged"
            t={t}
            seed={102}
          />
          {/* Dust clouds under Boss's sliding belly */}
          {[0, 1, 2, 3].map((d) => {
            const p = ((t * 2.2 + d * 0.25) % 1);
            return (
              <mesh key={d} position={[grabX - 0.95 - p * 1.25, 0.22 + p * 0.45, empZ + Math.sin(d) * 0.2]} scale={0.22 + (1 - p) * 0.24}>
                <sphereGeometry args={[1, 10, 10]} />
                <meshStandardMaterial color="#d6c5a3" transparent opacity={(1 - p) * 0.72} />
              </mesh>
            );
          })}
          {/* Sprinting Employee looking back at Boss */}
          <Character3D
            position={[empX, empY, empZ]}
            yaw={empYaw}
            scale={1.12}
            shirtColor="#f8fafc"
            pantsColor="#334155"
            tieColor="#2563eb"
            hair="messy"
            eyes="red"
            brow={0.9}
            headTurn={-0.85}
            mood="frown"
            pose="sprint"
            t={t}
            seed={101}
            holdPhone="GTA VI"
          />
        </>
      ) : (
        <>
          {/* 3D Kick Impact Starburst */}
          {kickDt < 0.45 && (
            <mesh position={[0.45, 0.85, 1.3]} scale={(1 - kickDt / 0.45) * 1.15} rotation={[0, 0, kickDt * 10]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          )}

          {/* Boss Launched Backward & Splatted Flat on Asphalt */}
          <Character3D
            position={[bossX, bossY, flyP < 1 ? 1.15 + Math.sin(flyP * Math.PI) * 0.55 : 1.15]}
            rotation={[flyP < 1 ? 0.25 : Math.PI / 2, 0, flyP < 1 ? kickDt * 7.5 : -1.2]}
            yaw={flyP < 1 ? 0.35 : Math.PI / 2}
            scale={bossLanded ? 1.0 : 1.05}
            squash={bossLanded ? -0.35 : 0}
            shirtColor="#334155"
            pantsColor="#1e293b"
            tieColor="#dc2626"
            hair="bald_sides"
            hairColor="#64748b"
            eyes={bossLanded ? "dead" : "wide"}
            tears={1}
            mood="scream"
            mouthOpen={bossLanded ? 0.2 : 0.9}
            pose="panic"
            t={t}
            seed={102}
          />

          {/* Employee Sprinting Into the Sunset */}
          <Character3D
            position={[lerp(1.25, 1.65, kickDt / 1.5), 0, 1.15]}
            yaw={Math.PI / 2 - 0.12}
            scale={1.14}
            shirtColor="#f8fafc"
            pantsColor="#334155"
            tieColor="#2563eb"
            hair="messy"
            eyes="red"
            brow={0.85}
            mood="scream"
            mouthOpen={getMouthOpen("s1_worker", t)}
            pose="sprint"
            t={t}
            seed={101}
            holdPhone="99%"
          />
        </>
      )}
    </>
  );
};

// ---------- SHOT 1C: 3D Crossroads Armored Van Crash & Electronics Store ----------
const Shot1CCrossroadsCrash: React.FC<{ t: number }> = ({ t }) => {
  const impact = t >= CUES.s1_crash;
  const it = impact ? t - CUES.s1_crash : 0;
  const speakMouth = getMouthOpen("s1_guard1", t);
  const runStart = 21.1;
  const runShop = seg(t, runStart, CUES.s1_fire_shot - 0.1);

  const closeP = impact ? ease(seg(it, 0.85, 1.35)) * (1 - ease(seg(t, runStart - 0.2, runStart + 0.3))) : 0;
  const camZ = lerp(16.8, 13.0, closeP);
  const camY = lerp(3.8, 2.9, closeP);
  const lookZ = lerp(-1.0, 0.4, closeP);
  const shake = impact && it < 0.65 ? 26 * (1 - it / 0.65) : 0;

  const driveP = easeIn(seg(t, CUES.s1_crash_shot, CUES.s1_crash));
  const doorP = impact ? elasticOut(seg(it, 0.05, 0.7)) : 0;
  const rearLift = impact && it < 0.5 ? Math.sin((it / 0.5) * Math.PI) * 0.16 : 0;
  const crumple = impact ? clamp(it / 0.15) : 0;
  const wSpin = !impact ? -t * 16 : 0;

  const shopTex = useMemo(() => makeSignTexture(["ЭЛЕКТРОНИКА"], "#1e293b", "#facc15", "#facc15", 512, 128, 56), []);
  const gtaBannerTex = useMemo(() => makeSignTexture(["GTA VI", "ВЫШЛА!"], "#16a34a", "#ffffff", "#052e16", 256, 256, 48), []);

  return (
    <>
      <color attach="background" args={["#c76c2e"]} />
      <fog attach="fog" args={["#d17736", 22, 55]} />
      <CameraRig pos={[0, camY, camZ]} lookAt={[0, 2.05, lookZ]} fov={46} shake={shake} t={t} />

      <ambientLight intensity={0.92} color="#ffedd5" />
      <directionalLight position={[10, 14, 14]} intensity={1.75} color="#fff7ed" castShadow />

      {/* Ground Crossroads */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[42, 0.5, 34]} />
        <meshStandardMaterial color="#36322d" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.05, -4.5]} receiveShadow>
        <boxGeometry args={[30, 0.25, 4.2]} />
        <meshStandardMaterial color="#8c724d" roughness={0.85} />
      </mesh>

      {/* Background 3D ЭЛЕКТРОНИКА Store */}
      <group position={[0, 0, -7.2]}>
        {/* Main Building */}
        <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.8, 5.1, 3.6]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        {/* Rooftop Neon Sign */}
        <mesh position={[0, 5.55, 1.55]}>
          <boxGeometry args={[5.5, 1.15, 0.35]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 5.55, 1.74]}>
          <planeGeometry args={[5.2, 1.0]} />
          <meshBasicMaterial map={shopTex} />
        </mesh>
        {/* Glowing Shop Windows with GTA VI Poster */}
        {[-2.2, 2.2].map((wx, i) => (
          <mesh key={i} position={[wx, 2.3, 1.82]}>
            <planeGeometry args={[1.95, 2.2]} />
            <meshBasicMaterial map={gtaBannerTex} />
          </mesh>
        ))}
        {/* Open Store Entrance */}
        <mesh position={[0, 1.7, 1.82]}>
          <planeGeometry args={[1.65, 3.2]} />
          <meshBasicMaterial color="#090d14" />
        </mesh>
        <pointLight position={[0, 3.2, 2.4]} color="#4ade80" intensity={4.0} distance={8} />
      </group>

      {/* Colliding Armored Vans stopping at x=-2.75 and x=+2.75 to leave a clear center corridor (x: -1.03..+1.03) */}
      <ArmoredVan3D
        position={[lerp(-9.2, -2.75, driveP), rearLift * 0.45, 1.35]}
        doorOpen={doorP}
        pitch={rearLift}
        crumple={crumple}
        wheelSpin={wSpin}
      />
      <ArmoredVan3D
        position={[lerp(9.2, 2.75, driveP), rearLift * 0.45, 1.35]}
        facingLeft
        doorOpen={doorP}
        pitch={rearLift}
        crumple={crumple}
        wheelSpin={wSpin}
      />

      {/* Crash Explosion, Money Bags, Flying Bills & Guards */}
      {impact && (
        <>
          {it < 0.85 && (
            <group position={[0, 1.35, 1.4]}>
              <mesh scale={elasticOut(it / 0.35) * (1 - clamp((it - 0.3) / 0.55)) * 1.45}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#facc15" emissive="#ea580c" emissiveIntensity={1.6} />
              </mesh>
            </group>
          )}

          {/* 6 Scattered 3D Money Bags placed on the sides (leaving the central corridor clear!) */}
          {[-2.3, -1.6, -1.15, 1.15, 1.6, 2.3].map((bx, i) => {
            const fp = clamp(it / 0.65);
            const bounce = Math.abs(Math.sin(fp * Math.PI * 2.5)) * (1 - fp) * 0.75;
            const by = lerp(1.1, 0.05, easeOut(fp)) + bounce;
            return <MoneyBag3D key={i} position={[bx, by, 2.1 + (i % 2) * 0.35]} rotation={[0, i * 0.9, 0]} scale={1.15} />;
          })}

          {/* 24 Fluttering 3D Green Dollar Bills */}
          {Array.from({ length: 24 }).map((_, i) => {
            const bx = (hash(i * 3.7) - 0.5) * 6.2 * clamp(it / 1.4) + Math.sin(t * 3 + i) * 0.25;
            const peak = 2.6 + hash(i * 9.1) * 2.2;
            const by = Math.max(0.08, it < 0.7 ? lerp(1.2, peak, easeOut(it / 0.7)) : peak - (it - 0.7) * 0.75);
            const bz = 1.4 + (hash(i * 2.3) - 0.5) * 1.8;
            return (
              <mesh key={i} position={[bx, by, bz]} rotation={[t * 4 + i, t * 3 + i, hash(i) * 3]}>
                <boxGeometry args={[0.26, 0.02, 0.13]} />
                <meshStandardMaterial color="#4ade80" emissive="#16a34a" emissiveIntensity={0.25} />
              </mesh>
            );
          })}

          {/* Two Armored Guards hopping into open corridor and sprinting straight into ЭЛЕКТРОНИКА */}
          {(() => {
            const hop = easeOut(seg(it, 0.15, 0.65));
            const lookBags = it >= 0.6 && it < 1.05;
            const shock = it >= 1.0 && it < 1.55;
            const hatJump = shock ? Math.sin(seg(it, 1.0, 1.45) * Math.PI) * 0.25 : 0;
            const waveOff = speakMouth > 0.03 || (it >= 1.35 && runShop === 0);
            const runEase = ease(runShop);

            return [0, 1].map((g) => {
              const baseX = g === 0 ? lerp(-1.1, -0.68, hop) : lerp(1.1, 0.68, hop);
              const gx = lerp(baseX, g === 0 ? -0.45 : 0.45, runEase);
              const gz = lerp(2.0, -5.2, runEase);
              const gy = hop < 1 ? Math.sin(hop * Math.PI) * 0.5 : 0;
              if (runShop > 0.95) return null;

              const yawAngle = runShop > 0 ? Math.PI : g === 0 ? 0.35 : -0.35;
              const pose = runShop > 0 ? "sprint" : waveOff && g === 0 ? "wave" : lookBags ? "look_down" : "idle";

              return (
                <Character3D
                  key={g}
                  position={[gx, gy, gz]}
                  yaw={yawAngle}
                  scale={1.06}
                  shirtColor="#4f5f3b"
                  pantsColor="#3f4c2f"
                  hair="helmet"
                  hatColor="#596b42"
                  hatLift={hatJump}
                  mustacheColor={g === 0 ? "#2d2118" : undefined}
                  eyes={shock ? "wide" : runShop > 0 ? "red" : "normal"}
                  brow={shock ? -0.9 : runShop > 0 ? 0.9 : 0.25}
                  mood={runShop > 0 ? "buckteeth" : "neutral"}
                  mouthOpen={g === 0 ? speakMouth : 0}
                  pose={pose}
                  t={t}
                  seed={210 + g}
                  holdPhone={it >= 0.95 ? "GTA VI" : null}
                />
              );
            });
          })()}
        </>
      )}
    </>
  );
};

// ---------- SHOT 1D: 3D Burning Kindergarten, Fire Truck & Wild Hose ----------
const Shot1DFireTruck: React.FC<{ t: number }> = ({ t }) => {
  const dt = Math.max(0, t - CUES.s1_fire_shot);
  const fSpeak = getMouthOpen("s1_fire", t);
  const drive = easeOut(clamp(dt / 1.45));
  const truckX = lerp(-10.8, -2.55, drive);
  const brakePitch = dt > 1.15 && dt < 1.85 ? Math.sin(((dt - 1.15) / 0.7) * Math.PI) * -0.075 : 0;
  const bounceY = dt > 1.45 && dt < 2.1 ? Math.sin((dt - 1.45) * 18) * 0.08 * (1 - (dt - 1.45) / 0.65) : 0;

  const zoomP = ease(seg(dt, 1.4, 2.2));
  const camZ = lerp(16.2, 13.8, zoomP);
  const camY = lerp(3.6, 3.0, zoomP);
  const shake = dt > 1.35 && dt < 1.85 ? 14 * (1 - (dt - 1.35) / 0.5) : 0;

  const detsadTex = useMemo(() => makeSignTexture(["ДЕТСАД"], "#f59e0b", "#1c1917", "#1c1917", 384, 112, 54), []);
  const podezdTex = useMemo(() => makeSignTexture(["ПОДЪЕЗД", "1 Гбит/с"], "#0f172a", "#4ade80", "#38bdf8", 384, 128, 42), []);

  return (
    <>
      <color attach="background" args={["#9a3c1a"]} />
      <fog attach="fog" args={["#7c2d12", 20, 50]} />
      <CameraRig pos={[0, camY, camZ]} lookAt={[0, 1.85, -1.0]} fov={46} shake={shake} t={t} />

      <ambientLight intensity={0.90} color="#ffedd5" />
      <directionalLight position={[8, 12, 12]} intensity={1.65} color="#fed7aa" castShadow />

      {/* Ground Street & Sidewalk */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[42, 0.5, 32]} />
        <meshStandardMaterial color="#34302b" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.05, -4.4]} receiveShadow>
        <boxGeometry args={[32, 0.25, 3.8]} />
        <meshStandardMaterial color="#7a6448" roughness={0.85} />
      </mesh>

      {/* Left Background: Burning Kindergarten ("ДЕТСАД") */}
      <group position={[-2.4, 0, -6.5]}>
        <pointLight
          position={[0.5, 3.2, 2.2]}
          color="#ff6b2b"
          intensity={5.5 + Math.sin(t * 20) * 1.8}
          distance={12}
        />
        <mesh position={[0, 2.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 4.8, 3.2]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        {/* Glowing burning kindergarten windows */}
        {[-1.0, 1.0].map((wx, idx) => (
          <mesh key={idx} position={[wx, 2.7, 1.62]}>
            <planeGeometry args={[0.95, 1.15]} />
            <meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={1.1} />
          </mesh>
        ))}
        <mesh position={[0, 4.18, 1.66]}>
          <planeGeometry args={[2.5, 0.72]} />
          <meshBasicMaterial map={detsadTex} />
        </mesh>
        {/* 3D Animated Flames placed on windows & roof so ДЕТСАД sign stays crystal clear */}
        {Array.from({ length: 12 }).map((_, i) => {
          const fp = (t * 2.4 + i * 0.19) % 1;
          const fx = -1.35 + (i % 4) * 0.9 + Math.sin(t * 10 + i) * 0.16;
          const row = Math.floor(i / 4);
          const fy = row === 2 ? 4.85 + fp * 0.75 : 1.7 + row * 1.0 + fp * 0.55;
          const fs = (1 - fp * 0.55) * 0.40;
          return (
            <mesh key={i} position={[fx, fy, 1.64]} scale={[fs, fs * 1.6, fs]}>
              <coneGeometry args={[1, 1.4, 7]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#ef4444" : "#facc15"}
                emissive={i % 2 === 0 ? "#dc2626" : "#f97316"}
                emissiveIntensity={1.6}
              />
            </mesh>
          );
        })}
        {/* Rising 3D Smoke Puffs */}
        {Array.from({ length: 6 }).map((_, s) => {
          const sp = (t * 0.48 + s / 6) % 1;
          return (
            <mesh
              key={s}
              position={[-0.8 + s * 0.35 + Math.sin(t * 2 + s) * 0.25, 5.1 + sp * 3.0, 1.2]}
              scale={0.55 + sp * 0.65}
            >
              <sphereGeometry args={[1, 10, 10]} />
              <meshStandardMaterial color="#27272a" transparent opacity={(1 - sp) * 0.75} />
            </mesh>
          );
        })}
      </group>

      {/* Right Background: Apartment Entrance ("ПОДЪЕЗД 1 Гбит/с") */}
      <group position={[2.25, 0, -5.8]}>
        <mesh position={[0, 3.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 7.6, 3.2]} />
          <meshStandardMaterial color="#64748b" roughness={0.78} />
        </mesh>
        {/* Apartment Windows Above Entrance */}
        {[-0.85, 0.85].map((wx, wi) =>
          [4.8, 6.2].map((wy, hi) => (
            <mesh key={`${wi}_${hi}`} position={[wx, wy, 1.62]}>
              <planeGeometry args={[0.9, 0.95]} />
              <meshStandardMaterial
                color={hi === 0 ? "#fef08a" : "#1e293b"}
                emissive={hi === 0 ? "#f59e0b" : "#000000"}
                emissiveIntensity={0.45}
              />
            </mesh>
          ))
        )}
        {/* Sign over door */}
        <mesh position={[0, 3.55, 1.64]}>
          <planeGeometry args={[2.3, 0.78]} />
          <meshBasicMaterial map={podezdTex} />
        </mesh>
        {/* Open Glowing Entrance Doorway */}
        <mesh position={[0, 1.35, 1.63]}>
          <planeGeometry args={[1.55, 2.7]} />
          <meshBasicMaterial color="#090d14" />
        </mesh>
        <pointLight position={[0, 2.1, 2.2]} color="#4ade80" intensity={2.2} distance={5} />
        {/* Awning */}
        <mesh position={[0, 2.85, 2.0]}>
          <boxGeometry args={[2.1, 0.18, 0.9]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
      </group>

      {/* Red 3D Fire Truck parked on left road (front bumper ends at x=-0.13) */}
      <FireTruck3D
        position={[truckX, 0, 0.55]}
        brakePitch={brakePitch}
        bounceY={bounceY}
        t={t}
        wheelSpin={dt < 1.45 ? -t * 18 : 0}
      />

      {/* 4 Firefighters hopping out strictly to the right of the bumper (x >= +0.35) and sprinting into ПОДЪЕЗД */}
      {dt >= 1.45 && (
        <>
          {[3, 2, 1, 0].map((i) => {
            const runDt = dt - 1.45;
            if (i === 0) {
              const hopIn = easeOut(clamp(runDt / 0.45));
              const speakEnd = 4.6;
              const exitP = easeIn(clamp((runDt - speakEnd) / 0.85));
              if (exitP > 0.95) return null;
              const fx = lerp(0.55, 1.15, hopIn) + exitP * 1.1;
              const fz = lerp(1.4, 2.15, hopIn) - exitP * 6.35;
              const fy = hopIn < 1 ? Math.sin(hopIn * Math.PI) * 0.45 : 0;
              const isRunning = hopIn < 1 || exitP > 0;
              return (
                <Character3D
                  key={i}
                  position={[fx, fy, fz]}
                  yaw={exitP > 0 ? Math.PI : -0.15}
                  scale={1.08}
                  shirtColor="#991b1b"
                  pantsColor="#451a1a"
                  hair="fire"
                  mustacheColor="#2d2118"
                  eyes="red"
                  brow={0.9}
                  mood="buckteeth"
                  mouthOpen={fSpeak}
                  pose={isRunning ? "sprint" : "wave"}
                  t={t}
                  seed={310}
                  holdPhone="GTA VI"
                />
              );
            } else {
              const p = clamp((runDt - (i - 1) * 0.42) / 1.85);
              if (p <= 0 || p >= 0.96) return null;
              const fx = lerp(0.45 + i * 0.28, 2.25, ease(p));
              const fz = lerp(0.9, -4.2, ease(p));
              return (
                <Character3D
                  key={i}
                  position={[fx, 0, fz]}
                  yaw={Math.PI - 0.15}
                  scale={1.0}
                  shirtColor="#991b1b"
                  pantsColor="#451a1a"
                  hair="fire"
                  eyes="red"
                  brow={0.8}
                  mood="buckteeth"
                  pose="sprint"
                  t={t}
                  seed={310 + i}
                  holdPhone={i === 2 ? "99%" : null}
                />
              );
            }
          })}
        </>
      )}

      {/* Wild Thrashing 3D Hose + Water Spray & Splash Rings in foreground asphalt left of firefighters */}
      <WildFireHose3D origin={[truckX + 1.85, 0.72, 1.48]} t={t} active={dt >= 1.75} />
    </>
  );
};

export const Scene1Shorts3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (t < CUES.s1_boss) {
    return <Shot1AOffice t={t} />;
  }
  if (t < CUES.s1_crash_shot) {
    return <Shot1BStreetChase t={t} />;
  }
  if (t < CUES.s1_fire_shot) {
    return <Shot1CCrossroadsCrash t={t} />;
  }
  return <Shot1DFireTruck t={t} />;
};
