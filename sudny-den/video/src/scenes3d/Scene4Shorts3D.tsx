import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUES, SCENES, getMouthOpen } from "../data/scene1Timeline";
import { Character3D } from "../components3d/Character3D";
import { makeSignTexture } from "../components3d/SignTexture";

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p, 0, 1);
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// Deterministic 3D Camera Rig for Remotion
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

// ---------------------------------------------------------------------------
// 1. Iconic 3D Nuclear Mushroom Cloud on Horizon ([0, 0, -24])
// ---------------------------------------------------------------------------
const MushroomCloud3D: React.FC<{ t: number }> = ({ t }) => {
  const pulse = Math.sin(t * 1.6) * 0.05;
  const billowPulse = Math.sin(t * 1.2) * 0.08;

  // Smooth under-cap curling fiery spheres (y = 11.0, radius ~2.2)
  const underCapSpheres = useMemo(() => {
    const items = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 2.2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      items.push({ x, z, key: i });
    }
    return items;
  }, []);

  // Layered cloud cap spheres (Lower Tier y = 12.0, radius ~4.5)
  const lowerCapSpheres = useMemo(() => {
    const items = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 4.2 + Math.cos(i * 3.1) * 0.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const rad = 1.9 + (i % 2) * 0.35;
      items.push({ x, z, rad, key: i });
    }
    return items;
  }, []);

  // Mid Tier Cap (y = 13.5, radius ~6.0)
  const midCapSpheres = useMemo(() => {
    const items = [];
    const count = 13;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 5.6 + Math.sin(i * 2.7) * 0.55;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const rad = 2.5 + (i % 3) * 0.4;
      items.push({ x, z, rad, key: i });
    }
    return items;
  }, []);

  // Upper Ash Crown (y = 15.2 .. 16.8)
  const crownSpheres = useMemo(() => {
    const items = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 3.6 + (i % 2) * 0.8;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const rad = 2.8 + (i % 2) * 0.6;
      items.push({ x, z, rad, key: i });
    }
    return items;
  }, []);

  return (
    <group position={[0, 0, -24]}>
      {/* 1. Stem: Thick Glowing Fiery Column */}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.95, 1.55, 10.5, 24]} />
        <meshStandardMaterial
          color="#ea580c"
          emissive="#dc2626"
          emissiveIntensity={1.8 + pulse * 4}
          roughness={0.7}
        />
      </mesh>
      {/* Inner superheated core */}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.48, 0.82, 10.4, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>

      {/* Stem Base Asymmetrical Dust Clouds & Ground Shockwave Ring (y = 0.5 .. 2.6, NO symmetric pairs) */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.8, 0.5, 16, 48]} />
        <meshStandardMaterial color="#431407" roughness={0.95} />
      </mesh>
      <mesh position={[-1.4, 0.8, 0.5]}>
        <sphereGeometry args={[1.4, 14, 10]} />
        <meshStandardMaterial color="#431407" roughness={0.9} />
      </mesh>
      <mesh position={[1.1, 0.7, -0.6]}>
        <sphereGeometry args={[1.25, 14, 10]} />
        <meshStandardMaterial color="#292524" roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 1.8, -0.4]}>
        <sphereGeometry args={[1.1, 14, 10]} />
        <meshStandardMaterial color="#7c2d12" emissive="#9a3412" emissiveIntensity={0.4} roughness={0.8} />
      </mesh>
      <mesh position={[1.3, 1.5, 0.3]}>
        <sphereGeometry args={[1.15, 14, 10]} />
        <meshStandardMaterial color="#3b1308" roughness={0.9} />
      </mesh>
      <mesh position={[0.4, 2.3, -0.5]}>
        <sphereGeometry args={[0.9, 14, 10]} />
        <meshStandardMaterial color="#292524" roughness={0.9} />
      </mesh>
      <mesh position={[-1.0, 2.5, 0.2]}>
        <sphereGeometry args={[0.85, 14, 10]} />
        <meshStandardMaterial color="#431407" roughness={0.9} />
      </mesh>

      {/* 2. Billowing Shockwave Condensation Rings (Smooth vapor toruses, NO sawtooth sheets) */}
      <group position={[0, 5.2, 0]}>
        {/* Main inner glowing vapor ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.4, 0.42, 24, 48]} />
          <meshStandardMaterial
            color="#ea580c"
            emissive="#f97316"
            emissiveIntensity={1.5 + pulse * 2}
            transparent
            opacity={0.65}
            roughness={0.4}
          />
        </mesh>
        {/* Wider secondary warm atmospheric ring */}
        <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.6, 0.32, 24, 48]} />
          <meshStandardMaterial
            color="#fed7aa"
            emissive="#fb923c"
            emissiveIntensity={1.2}
            transparent
            opacity={0.45}
            roughness={0.5}
          />
        </mesh>
      </group>

      {/* 3. Inverted Stem-to-Cap Flare (y = 9.8) */}
      <mesh position={[0, 9.8, 0]}>
        <cylinderGeometry args={[2.9, 1.05, 3.4, 24]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={2.0 + pulse * 3}
          roughness={0.65}
        />
      </mesh>

      {/* 4. Under-Cap Smooth Incandescent Fireball & Curling Underside Spheres (y = 11.0 .. 11.4) */}
      <group position={[0, 11.2, 0]} scale={1 + pulse}>
        {/* Central glowing core sphere */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2.6, 18, 14]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={2.5}
            roughness={0.4}
          />
        </mesh>
        {/* Smooth overlapping curling fiery spheres under the cap */}
        {underCapSpheres.map((s) => (
          <mesh key={s.key} position={[s.x, -0.2, s.z]}>
            <sphereGeometry args={[1.75, 14, 10]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#ea580c"
              emissiveIntensity={2.1}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>

      {/* 5. Lower Cloud Cap Tier (y = 12.0) */}
      <group position={[0, 12.0, 0]} scale={1 + billowPulse}>
        {lowerCapSpheres.map((s) => (
          <mesh key={s.key} position={[s.x, 0, s.z]}>
            <sphereGeometry args={[s.rad, 14, 10]} />
            <meshStandardMaterial
              color="#ea580c"
              emissive="#c2410c"
              emissiveIntensity={1.4 + pulse * 2}
              roughness={0.7}
            />
          </mesh>
        ))}
      </group>

      {/* 6. Mid Billowing Cap Tier (y = 13.5) */}
      <group position={[0, 13.5, 0]} scale={1 - billowPulse * 0.7}>
        {midCapSpheres.map((s) => (
          <mesh key={s.key} position={[s.x, 0, s.z]}>
            <sphereGeometry args={[s.rad, 14, 10]} />
            <meshStandardMaterial
              color="#431407"
              emissive="#7c2d12"
              emissiveIntensity={0.65}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* 7. Massive Upper Ash & Pyroclastic Crown (y = 15.2 .. 16.8) */}
      <group position={[0, 15.2, 0]}>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[4.2, 18, 14]} />
          <meshStandardMaterial color="#1c1917" roughness={0.95} />
        </mesh>
        {crownSpheres.map((s) => (
          <mesh key={s.key} position={[s.x, 0.4, s.z]}>
            <sphereGeometry args={[s.rad, 14, 10]} />
            <meshStandardMaterial color="#292524" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Horizon Point Light Casting Fiery Glow Down Avenue */}
      <pointLight position={[0, 11.5, 2.0]} color="#ff6b1a" intensity={4.2} distance={60} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// 2. Ruined City Silhouette, Burning Wrecks & Cracked Asphalt Street
// ---------------------------------------------------------------------------
const RuinedCity3D: React.FC<{ t: number }> = ({ t }) => {
  const fireFlicker1 = Math.sin(t * 18) * 0.15 + Math.cos(t * 27) * 0.1;
  const fireFlicker2 = Math.sin(t * 16 + 2.1) * 0.15 + Math.cos(t * 23 + 1.2) * 0.1;

  return (
    <group>
      {/* Wide Cracked Asphalt Street */}
      <mesh position={[0, -0.04, -5]} receiveShadow>
        <boxGeometry args={[11.5, 0.08, 68]} />
        <meshStandardMaterial color="#18181b" roughness={0.92} />
      </mesh>

      {/* Broken Faded Center Dashed Lines */}
      {[-24, -18, -12, -6, 0, 6, 12, 18].map((z) => (
        <mesh key={z} position={[0, 0.005, z]}>
          <planeGeometry args={[0.22, 2.8]} />
          <meshStandardMaterial color="#ca8a04" opacity={0.65} transparent roughness={0.8} />
        </mesh>
      ))}

      {/* Concrete Curbs */}
      <mesh position={[-4.2, 0.06, -5]}>
        <boxGeometry args={[0.3, 0.14, 68]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[4.2, 0.06, -5]}>
        <boxGeometry args={[0.3, 0.14, 68]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Sidewalks */}
      <mesh position={[-6.8, 0.08, -5]} receiveShadow>
        <boxGeometry args={[4.8, 0.16, 68]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>
      <mesh position={[6.8, 0.08, -5]} receiveShadow>
        <boxGeometry args={[4.8, 0.16, 68]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>

      {/* Scattered Rubble Chunks on Street */}
      {[
        [-2.4, 0.08, 1.8, 0.35, 0.18, 0.4],
        [2.2, 0.06, 3.6, 0.42, 0.14, 0.3],
        [-2.0, 0.06, -2.4, 0.32, 0.14, 0.38],
        [2.3, 0.07, -3.1, 0.48, 0.16, 0.35],
      ].map(([rx, ry, rz, sx, sy, sz], idx) => (
        <mesh key={idx} position={[rx, ry, rz]} rotation={[0.2 * idx, 0.4 * idx, 0.1 * idx]}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
      ))}

      {/* Left Flanking Ruined Silhouette Buildings (x = -7.5) */}
      <group position={[-7.5, 0, 0]}>
        <mesh position={[0, 4.5, 4.5]}>
          <boxGeometry args={[3.8, 9.0, 5.0]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh position={[-0.4, 9.3, 5.2]}>
          <boxGeometry args={[2.2, 1.2, 2.4]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
        <mesh position={[1.92, 3.8, 4.5]}>
          <planeGeometry args={[0.7, 1.1]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
        </mesh>

        <mesh position={[0, 7.0, -2.5]}>
          <boxGeometry args={[4.2, 14.0, 5.8]} />
          <meshStandardMaterial color="#1e1b18" roughness={0.9} />
        </mesh>
        <mesh position={[0.5, 14.4, -2.2]}>
          <boxGeometry args={[2.4, 1.8, 2.8]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
        <mesh position={[2.12, 6.5, -1.8]}>
          <planeGeometry args={[0.8, 1.2]} />
          <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={1.3} />
        </mesh>

        <mesh position={[0, 8.5, -10.0]}>
          <boxGeometry args={[4.5, 17.0, 6.2]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh position={[-0.8, 17.5, -9.5]}>
          <boxGeometry args={[2.0, 1.6, 2.2]} />
          <meshStandardMaterial color="#09090b" roughness={0.9} />
        </mesh>
        <mesh position={[2.27, 9.2, -9.2]}>
          <planeGeometry args={[0.7, 1.0]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
        </mesh>

        <mesh position={[0, 6.0, -17.5]}>
          <boxGeometry args={[4.8, 12.0, 6.5]} />
          <meshStandardMaterial color="#1c1917" roughness={0.9} />
        </mesh>
      </group>

      {/* Right Flanking Ruined Silhouette Buildings (x = +7.5) */}
      <group position={[7.5, 0, 0]}>
        <mesh position={[0, 5.0, 3.5]}>
          <boxGeometry args={[3.8, 10.0, 5.2]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh position={[0.4, 10.4, 3.8]}>
          <boxGeometry args={[2.0, 1.4, 2.4]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
        <mesh position={[-1.92, 4.2, 3.2]}>
          <planeGeometry args={[0.7, 1.1]} />
          <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={1.4} />
        </mesh>

        <mesh position={[0, 7.5, -3.5]}>
          <boxGeometry args={[4.2, 15.0, 5.6]} />
          <meshStandardMaterial color="#1c1917" roughness={0.9} />
        </mesh>
        <mesh position={[-0.6, 15.3, -3.8]}>
          <boxGeometry args={[2.2, 1.6, 2.5]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
        <mesh position={[-2.12, 7.8, -3.0]}>
          <planeGeometry args={[0.8, 1.2]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
        </mesh>

        <mesh position={[0, 9.0, -11.5]}>
          <boxGeometry args={[4.6, 18.0, 6.0]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh position={[0.6, 18.4, -11.2]}>
          <boxGeometry args={[2.5, 1.5, 2.0]} />
          <meshStandardMaterial color="#09090b" roughness={0.9} />
        </mesh>

        <mesh position={[0, 6.5, -18.0]}>
          <boxGeometry args={[4.8, 13.0, 6.2]} />
          <meshStandardMaterial color="#1e1b18" roughness={0.9} />
        </mesh>
      </group>

      {/* Burning Car Wreck 1 (Left Midground, [-2.9, 0, 4.6]) */}
      <group position={[-2.9, 0, 4.6]} rotation={[0.08, 0.35, -0.12]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[1.75, 0.7, 3.2]} />
          <meshStandardMaterial color="#27272a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.95, -0.3]}>
          <boxGeometry args={[1.5, 0.55, 1.8]} />
          <meshStandardMaterial color="#1c1917" roughness={0.95} />
        </mesh>
        <mesh position={[-0.9, 0.32, 1.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.22, 12]} />
          <meshStandardMaterial color="#09090b" roughness={0.95} />
        </mesh>
        <mesh position={[0.9, 0.32, -1.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.22, 12]} />
          <meshStandardMaterial color="#09090b" roughness={0.95} />
        </mesh>
        {/* Animated Fire Cone */}
        <group position={[0.1, 1.15, -0.2]} scale={[1, 1 + fireFlicker1 * 2, 1]}>
          <mesh position={[0, 0.45, 0]}>
            <coneGeometry args={[0.42, 0.95, 10]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#ea580c"
              emissiveIntensity={2.2}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <coneGeometry args={[0.25, 0.75, 10]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        </group>
        <mesh position={[0.1, 2.1 + Math.sin(t * 3) * 0.15, -0.2]}>
          <sphereGeometry args={[0.5, 10, 8]} />
          <meshStandardMaterial color="#374151" opacity={0.7} transparent roughness={0.95} />
        </mesh>
        <pointLight position={[0.1, 1.2, -0.2]} color="#f97316" intensity={1.5} distance={6} />
      </group>

      {/* Burning Car Wreck 2 (Right Midground, [2.9, 0, 3.2]) */}
      <group position={[2.9, 0, 3.2]} rotation={[-0.05, -0.25, 0.08]}>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.7, 0.65, 3.0]} />
          <meshStandardMaterial color="#292524" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.88, -0.2]}>
          <boxGeometry args={[1.45, 0.5, 1.6]} />
          <meshStandardMaterial color="#1c1917" roughness={0.95} />
        </mesh>
        {/* Animated Fire Cone */}
        <group position={[-0.1, 1.1, 0.1]} scale={[1, 1 + fireFlicker2 * 2, 1]}>
          <mesh position={[0, 0.4, 0]}>
            <coneGeometry args={[0.38, 0.85, 10]} />
            <meshStandardMaterial
              color="#ea580c"
              emissive="#f97316"
              emissiveIntensity={2.0}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.22, 0.65, 10]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
        <mesh position={[-0.1, 2.0 + Math.sin(t * 2.8 + 1) * 0.15, 0.1]}>
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshStandardMaterial color="#4b5563" opacity={0.65} transparent roughness={0.95} />
        </mesh>
        <pointLight position={[-0.1, 1.1, 0.1]} color="#f59e0b" intensity={1.4} distance={5} />
      </group>

      {/* Burnt Car Wreck 3 (Left Background, [-2.6, 0, -5.2]) */}
      <group position={[-2.6, 0, -5.2]} rotation={[0.04, 0.5, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[1.65, 0.65, 2.9]} />
          <meshStandardMaterial color="#1f242a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <coneGeometry args={[0.28, 0.6, 8]} />
          <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={1.4} />
        </mesh>
      </group>

      {/* Burnt Car Wreck 4 (Right Background, [2.5, 0, -8.0]) */}
      <group position={[2.5, 0, -8.0]} rotation={[-0.04, -0.4, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[1.65, 0.65, 2.9]} />
          <meshStandardMaterial color="#18181b" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.25, 0.55, 8]} />
          <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 3. Shot 4A Looters Brawling in Open Street (ONLY rendered in Shot 4A!)
// ---------------------------------------------------------------------------
const LootersBrawl3D: React.FC<{
  t: number;
  powerbankTex: THREE.CanvasTexture;
  jerrycanTex: THREE.CanvasTexture;
}> = ({ t, powerbankTex, jerrycanTex }) => {
  return (
    <group>
      {/* Pair 1 fighting over "ПАВЕРБАНК" at z = +5.2 (well in front of courier at z = 0.65) */}
      <Character3D
        position={[-1.35, 0, 5.2]}
        yaw={1.35}
        scale={1.02}
        shirtColor="#dc2626"
        pantsColor="#1e293b"
        hair="messy"
        hairColor="#0f172a"
        eyes="red"
        brow={0.8}
        mood="scream"
        mouthOpen={0.7 + 0.3 * Math.sin(t * 14)}
        pose="fight"
        t={t}
        seed={401}
      />
      <Character3D
        position={[-0.45, 0, 5.2]}
        yaw={-1.35}
        scale={1.0}
        shirtColor="#475569"
        pantsColor="#0f172a"
        hair="bald_sides"
        hairColor="#1e293b"
        eyes="red"
        brow={0.85}
        mood="scream"
        mouthOpen={0.7 + 0.3 * Math.sin(t * 14 + 1.5)}
        pose="fight"
        t={t}
        seed={402}
      />
      {/* Glowing Powerbank Box on ground between them at [-0.9, 0.06, 5.2] */}
      <group position={[-0.9, 0.06, 5.2]} rotation={[0, 0.25, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.08, 0.2]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.042, 0.04]}>
          <planeGeometry args={[0.24, 0.035]} />
          <meshStandardMaterial color="#38bdf8" emissive="#06b6d4" emissiveIntensity={2.0} />
        </mesh>
        <mesh position={[0, 0.042, -0.035]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.28, 0.09]} />
          <meshBasicMaterial map={powerbankTex} />
        </mesh>
        <pointLight position={[0, 0.15, 0]} color="#38bdf8" intensity={1.2} distance={2.2} />
      </group>

      {/* Pair 2 fighting over "БЕНЗИН" jerrycan at z = +3.8 (well in front of van at z = -0.8) */}
      <Character3D
        position={[0.55, 0, 3.8]}
        yaw={1.3}
        scale={1.04}
        shirtColor="#d97706"
        pantsColor="#1c1917"
        hair="none"
        eyes="red"
        brow={0.85}
        mood="scream"
        mouthOpen={0.7 + 0.3 * Math.sin(t * 13)}
        pose="fight"
        t={t}
        seed={403}
      />
      <Character3D
        position={[1.45, 0, 3.8]}
        yaw={-1.3}
        scale={0.98}
        shirtColor="#0284c7"
        pantsColor="#18181b"
        hair="messy"
        hairColor="#334155"
        eyes="red"
        brow={0.9}
        mood="scream"
        mouthOpen={0.7 + 0.3 * Math.sin(t * 13 + 1.2)}
        pose="fight"
        t={t}
        seed={404}
      />
      {/* Red Jerrycan at [1.0, 0.18, 3.8] */}
      <group position={[1.0, 0.18, 3.8]} rotation={[0, -0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.36, 0.28]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.22]} />
          <meshStandardMaterial color="#991b1b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.21, 0.1]}>
          <cylinderGeometry args={[0.035, 0.035, 0.06, 10]} />
          <meshStandardMaterial color="#78716c" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.102, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.22, 0.12]} />
          <meshBasicMaterial map={jerrycanTex} />
        </mesh>
        <mesh position={[-0.102, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.22, 0.12]} />
          <meshBasicMaterial map={jerrycanTex} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 4. Overturned 3D Police Van ("Бобик") at [0, 0, -0.8]
// ---------------------------------------------------------------------------
const OverturnedPoliceVan3D: React.FC<{
  policeSignTex: THREE.CanvasTexture;
  policeDpsTex: THREE.CanvasTexture;
  t: number;
}> = ({ policeSignTex, policeDpsTex, t }) => {
  const isSparking = t < CUES.s4_poweroff && Math.sin(t * 32) > 0.65;

  return (
    <group position={[0, 0, -0.8]}>
      {/* 1. Inverted Van Body: Cargo Box & Cab */}
      <mesh position={[0, 0.74, -0.85]} castShadow receiveShadow>
        <boxGeometry args={[2.24, 1.15, 1.85]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.68, 0.52]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.02, 1.1]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.45} />
      </mesh>

      {/* Dark Blue Police Stripe along sides */}
      <mesh position={[-1.135, 0.72, -0.2]}>
        <boxGeometry args={[0.04, 0.32, 2.7]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.35} />
      </mesh>
      <mesh position={[1.135, 0.72, -0.2]}>
        <boxGeometry args={[0.04, 0.32, 2.7]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.35} />
      </mesh>

      {/* "ПОЛИЦИЯ" Sign Texture on sides */}
      <mesh position={[-1.158, 0.72, -0.2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 0.28]} />
        <meshBasicMaterial map={policeSignTex} />
      </mesh>
      <mesh position={[1.158, 0.72, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 0.28]} />
        <meshBasicMaterial map={policeSignTex} />
      </mesh>

      {/* Front Blue Trim & "ДПС 02" on inverted front hood/fascia facing camera */}
      <mesh position={[0, 0.88, 1.08]}>
        <boxGeometry args={[2.18, 0.22, 0.04]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.88, 1.105]}>
        <planeGeometry args={[0.7, 0.18]} />
        <meshBasicMaterial map={policeDpsTex} />
      </mesh>

      {/* Shattered Cab Windshield (crushed against asphalt at cab bottom) */}
      <mesh position={[0, 0.42, 1.06]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[1.78, 0.48, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Front Bumper & Radiator Grille squashed at front bottom */}
      <mesh position={[0, 0.18, 1.14]} castShadow>
        <boxGeometry args={[2.22, 0.22, 0.16]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* 2. Undercarriage Top Surface (Chassis surface y = 1.30, completely flat, NO center knob!) */}
      <mesh position={[0, 1.31, -0.2]}>
        <boxGeometry args={[2.14, 0.04, 2.75]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Side steel chassis frame rails */}
      <mesh position={[-0.75, 1.33, -0.2]}>
        <boxGeometry args={[0.12, 0.04, 2.7]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      <mesh position={[0.75, 1.33, -0.2]}>
        <boxGeometry args={[0.12, 0.04, 2.7]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* Flat reinforced seat plate where Oleg sits cleanly at [-0.65, 1.32, -0.75 world] */}
      <mesh position={[-0.65, 1.32, 0.05]}>
        <boxGeometry args={[0.75, 0.02, 0.75]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* 3. 4 Chunky Wheels Pointing UP / OUTWARD Prominently Visible on Left/Right Top Edges */}
      {/* Front-Left Wheel */}
      <group position={[-1.25, 1.35, 0.22]} rotation={[0, 0, 0.45]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.26, 18]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.28, 14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
      {/* Front-Right Wheel */}
      <group position={[1.25, 1.35, 0.22]} rotation={[0, 0, -0.45]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.26, 18]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.28, 14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
      {/* Rear-Left Wheel */}
      <group position={[-1.25, 1.4, -1.25]} rotation={[0, 0, 0.35]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.26, 18]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.28, 14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
      {/* Rear-Right Wheel */}
      <group position={[1.25, 1.4, -1.25]} rotation={[0, 0, -0.35]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.26, 18]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.28, 14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>

      {/* 4. Squashed Lightbar tucked cleanly UNDER overturned cab on the asphalt (no vertical obstruction) */}
      <group position={[0, 0.05, 0.48]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.35, 0.04, 0.2]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[-0.44, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.06, 0.18]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#b91c1c"
            emissiveIntensity={isSparking ? 1.8 : 0.3}
            roughness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[0.44, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.06, 0.18]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#1d4ed8"
            emissiveIntensity={isSparking ? 1.8 : 0.3}
            roughness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
        {isSparking && (
          <pointLight position={[0, 0.1, 0]} color="#60a5fa" intensity={1.2} distance={2.5} />
        )}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 5. Car Battery Barricade Wrapped in Blue Electrical Tape, PS5 & Monitor
// (Non-overlapping spots on van top: Monitor raised, PS5 to left/below, Battery to right/below)
// ---------------------------------------------------------------------------
const BatteryBarricadeAndRig3D: React.FC<{
  t: number;
  monitorGtaTex: THREE.CanvasTexture;
  monitorDeadTex: THREE.CanvasTexture;
}> = ({ t, monitorGtaTex, monitorDeadTex }) => {
  const isPowered = t < CUES.s4_poweroff;
  const isSparking = t >= CUES.s4_poweroff && t < CUES.s4_poweroff + 0.7;
  const sparkIntensity = isSparking ? (1 - (t - CUES.s4_poweroff) / 0.7) * 4.5 : 0;

  return (
    <group>
      {/* 1. Ground Heavy Battery Stack at [1.08, 0, 0.15] */}
      <group position={[1.08, 0, 0.15]}>
        {/* Lower Chunky Battery */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.54, 0.36, 0.38]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} />
        </mesh>
        {/* Terminal Posts */}
        <mesh position={[-0.18, 0.38, 0.08]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 10]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        <mesh position={[0.18, 0.38, 0.08]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 10]} />
          <meshStandardMaterial color="#78716c" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Upper Battery */}
        <mesh position={[0.02, 0.52, -0.02]} castShadow>
          <boxGeometry args={[0.5, 0.32, 0.34]} />
          <meshStandardMaterial color="#374151" roughness={0.6} />
        </mesh>
        <mesh position={[-0.16, 0.7, 0.06]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 10]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        <mesh position={[0.16, 0.7, 0.06]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 10]} />
          <meshStandardMaterial color="#78716c" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* BRIGHT BLUE ELECTRICAL TAPE ("Синяя изолента", #2563eb) HORIZONTAL BANDS */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.55, 0.09, 0.39]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} metalness={0.15} />
        </mesh>
        <mesh position={[0.02, 0.52, -0.02]}>
          <boxGeometry args={[0.51, 0.08, 0.35]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} metalness={0.15} />
        </mesh>

        {/* PROMINENT BLUE TAPE X-STRAPS ON FRONT FACES */}
        <mesh position={[0, 0.18, 0.195]} rotation={[0, 0, 0.55]}>
          <boxGeometry args={[0.42, 0.06, 0.015]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.18, 0.195]} rotation={[0, 0, -0.55]}>
          <boxGeometry args={[0.42, 0.06, 0.015]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} />
        </mesh>
        <mesh position={[0.02, 0.52, 0.155]} rotation={[0, 0, 0.55]}>
          <boxGeometry args={[0.38, 0.06, 0.015]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} />
        </mesh>
        <mesh position={[0.02, 0.52, 0.155]} rotation={[0, 0, -0.55]}>
          <boxGeometry args={[0.38, 0.06, 0.015]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} />
        </mesh>
      </group>

      {/* 2. Top Blue-Taped Car Battery cleanly to the RIGHT/BELOW monitor at [1.12, 1.42, -0.62] */}
      <group position={[1.12, 1.42, -0.62]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <boxGeometry args={[0.46, 0.28, 0.3]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} />
        </mesh>
        {/* Blue Tape Band & X-Strap */}
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.47, 0.08, 0.31]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.14, 0.155]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.34, 0.055, 0.015]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.14, 0.155]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.34, 0.055, 0.015]} />
          <meshStandardMaterial color="#2563eb" roughness={0.25} />
        </mesh>
        {/* Terminal Posts with Alligator Clamps */}
        <mesh position={[-0.14, 0.3, 0.06]}>
          <cylinderGeometry args={[0.026, 0.026, 0.07, 10]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        <mesh position={[0.14, 0.3, 0.06]}>
          <cylinderGeometry args={[0.026, 0.026, 0.07, 10]} />
          <meshStandardMaterial color="#78716c" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.14, 0.33, 0.06]}>
          <boxGeometry args={[0.06, 0.06, 0.09]} />
          <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.14, 0.33, 0.06]}>
          <boxGeometry args={[0.06, 0.06, 0.09]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* 3. White/Black PS5 Console cleanly to the LEFT/BELOW beside Oleg at [0.04, 1.46, -0.72] (Zero overlap with monitor!) */}
      <group position={[0.04, 1.46, -0.72]} rotation={[0, -0.15, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.09, 0.3, 0.24]} />
          <meshStandardMaterial color="#09090b" roughness={0.2} metalness={0.6} />
        </mesh>
        <mesh position={[-0.05, 0.15, 0]}>
          <boxGeometry args={[0.02, 0.34, 0.26]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
        <mesh position={[0.05, 0.15, 0]}>
          <boxGeometry args={[0.02, 0.34, 0.26]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
        {/* Blue LED Power Light Line (turns OFF on poweroff!) */}
        <mesh position={[0, 0.29, 0.11]}>
          <boxGeometry args={[0.035, 0.015, 0.04]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive={isPowered ? "#0ea5e9" : "#09090b"}
            emissiveIntensity={isPowered ? 2.0 : 0}
          />
        </mesh>
      </group>

      {/* Jumper Cables Linking Batteries to PS5 and Monitor */}
      <mesh position={[0.82, 1.0, -0.2]} rotation={[0.45, 0.3, 0.8]}>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
      <mesh position={[0.78, 0.96, -0.15]} rotation={[0.42, 0.32, 0.82]}>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>

      {/* 4. Portable Gaming Monitor Raised on angled stand at [0.52, 1.88, -0.82], yaw = -0.32 (NO object in front in +Z!) */}
      <group position={[0.52, 1.88, -0.82]} rotation={[-0.08, -0.32, 0]}>
        {/* Monitor Bezel */}
        <mesh castShadow>
          <boxGeometry args={[0.78, 0.48, 0.04]} />
          <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Support Stand beneath it */}
        <mesh position={[0, -0.24, -0.06]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>

        {/* 100% Unobstructed Screen Display (width 0.72, height 0.42) */}
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[0.72, 0.42]} />
          <meshBasicMaterial map={isPowered ? monitorGtaTex : monitorDeadTex} />
        </mesh>

        {/* Screen Bounce Light Illuminating Oleg's Face & Hands before poweroff */}
        {isPowered && (
          <>
            <pointLight position={[0, 0, 0.3]} color="#38bdf8" intensity={2.6} distance={3.2} />
            <pointLight position={[0, -0.05, 0.25]} color="#ec4899" intensity={1.3} distance={2.2} />
          </>
        )}
      </group>

      {/* 5. Electric Spark Burst at Batteries at CUES.s4_poweroff (152.50 .. 153.20s) */}
      {isSparking && (
        <group position={[1.12, 1.74, -0.62]}>
          <pointLight position={[0, 0, 0]} color="#93c5fd" intensity={sparkIntensity} distance={5} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            const r = 0.24 + ((i * 3) % 4) * 0.09;
            return (
              <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]}>
                <boxGeometry args={[0.02, 0.13, 0.02]} />
                <meshBasicMaterial color={i % 2 === 0 ? "#67e8f9" : "#fef08a"} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// 6. Foreground Dead Courier & Collector's Edition Box at z = 0.86 .. 0.90
// (Moved onto open asphalt with gap from van bumper and clear of subtitle overlay!)
// ---------------------------------------------------------------------------
const DeadCourierScene3D: React.FC<{
  collectorBoxTex: THREE.CanvasTexture;
}> = ({ collectorBoxTex }) => {
  return (
    <group>
      {/* Delivery Courier lying face down in front of van on asphalt at [-0.72, 0.48, 0.90] */}
      <Character3D
        position={[-0.72, 0.48, 0.90]}
        rotation={[0, 0, Math.PI]}
        yaw={0.95}
        scale={1.0}
        shirtColor="#eab308"
        pantsColor="#334155"
        eyes="dead"
        mood="frown"
        pose="lie_flat"
      />

      {/* Cartoon Silver Blade + Brown Handle Knife Sticking Vertically Out of His Back */}
      <group position={[-0.72, 0.36, 0.90]}>
        <mesh position={[0, -0.05, 0]} castShadow>
          <boxGeometry args={[0.024, 0.2, 0.06]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.045, 0.028, 0.12]} />
          <meshStandardMaterial color="#78350f" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.026, 0.026, 0.18, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.7} />
        </mesh>
      </group>

      {/* Yellow Delivery Backpack beside him at [-1.22, 0.22, 0.82] */}
      <group position={[-1.22, 0.22, 0.82]} rotation={[0.15, 0.4, -0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.48, 0.52, 0.42]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0.215]}>
          <boxGeometry args={[0.42, 0.08, 0.015]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.3} roughness={0.2} />
        </mesh>
        <mesh position={[-0.14, 0, -0.215]}>
          <boxGeometry args={[0.06, 0.45, 0.015]} />
          <meshStandardMaterial color="#09090b" roughness={0.8} />
        </mesh>
        <mesh position={[0.14, 0, -0.215]}>
          <boxGeometry args={[0.06, 0.45, 0.015]} />
          <meshStandardMaterial color="#09090b" roughness={0.8} />
        </mesh>
      </group>

      {/* Open "GTA VI COLLECTOR'S EDITION" Box at [0.92, 0.14, 0.86] */}
      <group position={[0.92, 0.14, 0.86]} rotation={[0, -0.22, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.18, 0.42]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.092, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.38]} />
          <meshBasicMaterial map={collectorBoxTex} />
        </mesh>
        {/* Open box lid propped on edge */}
        <mesh position={[0.32, 0.06, 0]} rotation={[0, 0, -0.65]}>
          <boxGeometry args={[0.56, 0.04, 0.43]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.4} />
        </mesh>

        {/* Spilled Artbook */}
        <mesh position={[0.25, -0.09, -0.32]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[0.32, 0.035, 0.24]} />
          <meshStandardMaterial color="#312e81" roughness={0.4} />
        </mesh>

        {/* Spilled Steelbook */}
        <mesh position={[-0.32, -0.1, 0.12]} rotation={[0, -0.4, 0]}>
          <boxGeometry args={[0.18, 0.025, 0.26]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Glowing Holographic Game Disc */}
        <group position={[-0.18, -0.11, -0.15]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.025, 0.11, 24]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#c084fc"
              emissiveIntensity={0.8}
              metalness={0.9}
              roughness={0.15}
            />
          </mesh>
          <pointLight position={[0, 0.08, 0]} color="#38bdf8" intensity={0.6} distance={1.2} />
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Main Component: Scene4Shorts3D
// ---------------------------------------------------------------------------
export const Scene4Shorts3D: React.FC<{ t?: number }> = ({ t: propT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = propT ?? SCENES.s4.start + frame / fps;

  // Memoized Textures with Clean Sizing (Zero Text Clipping!)
  const policeSignTex = useMemo(
    () => makeSignTexture(["ПОЛИЦИЯ"], "#1e3a8a", "#ffffff", "#172554", 512, 128, 54),
    []
  );
  const policeDpsTex = useMemo(
    () => makeSignTexture(["ДПС 02"], "#1e3a8a", "#ffffff", "#172554", 256, 128, 48),
    []
  );
  const monitorGtaTex = useMemo(
    () => makeSignTexture(["GTA VI", "VICE CITY"], "#ec4899", "#38bdf8", "#06b6d4", 512, 256, 44),
    []
  );
  const monitorDeadTex = useMemo(
    () => makeSignTexture(["0%", "РАЗРЯЖЕНО"], "#09090b", "#ef4444", "#27272a", 512, 256, 44),
    []
  );
  const powerbankTex = useMemo(
    () => makeSignTexture(["ПАВЕРБАНК", "100k mAh"], "#111827", "#38bdf8", "#0284c7", 256, 128, 32),
    []
  );
  const jerrycanTex = useMemo(
    () => makeSignTexture(["БЕНЗИН"], "#b91c1c", "#fef08a", "#7f1d1d", 256, 128, 44),
    []
  );
  const collectorBoxTex = useMemo(
    () => makeSignTexture(["GTA VI", "COLLECTOR'S"], "#1e1b4b", "#fbbf24", "#d97706", 512, 256, 44),
    []
  );

  // Timing states
  const isShot4A = t < CUES.s4_oleg_shot; // 139.49 .. 144.29
  const isBeforePoweroff = t < CUES.s4_poweroff; // 144.29 .. 152.50
  const isAfterBlack = t >= CUES.s4_black; // 159.92 .. 166.72

  // Oleg Mouth Sync
  const olegMouth = Math.max(getMouthOpen("s4_oleg1", t), getMouthOpen("s4_oleg2", t));

  // Devastated Oleg Brow: positive 0.4 creates / \ sad/worried brows, 0.85 makes them deeply crushed/devastated!
  const olegBrow = isBeforePoweroff ? 0.4 : 0.85;

  // Oleg Head Tilt: after poweroff stares at dead screen for 0.6s, then slowly raises eyes to mushroom cloud!
  const olegHeadTilt = !isBeforePoweroff
    ? lerp(0, -0.45, clamp((t - CUES.s4_poweroff - 0.6) / 1.5))
    : 0.12;

  // Camera Rig Poses (Framed to keep Courier & Box comfortably ABOVE subtitle overlay with clean gap from van bumper!)
  let camPos: [number, number, number];
  let camLookAt: [number, number, number];
  let camFov = 46;
  let camShake = 0;

  if (isShot4A) {
    // Shot 4A (139.49 .. 144.29) - Clean drone flyover passing overhead the looters
    const pA = clamp((t - SCENES.s4.start) / (CUES.s4_oleg_shot - SCENES.s4.start));
    const epA = ease(pA);
    camPos = [
      0,
      lerp(5.8, 3.2, epA),
      lerp(15.5, 8.8, epA),
    ];
    camLookAt = [0, lerp(1.2, 1.45, epA), -0.8];
    camFov = 46;
    camShake = 0.08;
  } else if (isBeforePoweroff) {
    // Shot 4B Early (144.29 .. 152.50) - Framing Oleg, Monitor, and Courier comfortably above subtitles
    const drift = Math.sin(t * 0.45) * 0.03;
    camPos = [0.10 + drift, 2.02, 6.65];
    camLookAt = [-0.02, 1.15, -0.75];
    camFov = 46;
    camShake = 0;
  } else if (!isAfterBlack) {
    // Shot 4B Late (152.50 .. 159.92) - Tragic pull-back revealing tiny Oleg beneath colossal mushroom cloud
    const pB = clamp((t - CUES.s4_poweroff) / (CUES.s4_black - CUES.s4_poweroff));
    const epB = ease(pB);
    camPos = [
      lerp(0.10, 0.0, epB),
      lerp(2.02, 2.85, epB),
      lerp(6.65, 9.8, epB),
    ];
    camLookAt = [0, lerp(1.15, 2.6, epB), -0.75];
    camFov = lerp(46, 52, epB);
    camShake = pB > 0.02 && pB < 0.18 ? 0.04 : 0;
  } else {
    // Shot 4C (159.92 .. 166.72) - Finale blackout & WASTED slam in 2D overlay
    camPos = [0, 2.85, 9.8];
    camLookAt = [0, 2.6, -0.75];
    camFov = 52;
    camShake = 0;
  }

  // Lighting Dimmer for Shot 4C
  const sceneDim = isAfterBlack ? 0.15 : 1.0;

  return (
    <>
      {/* Apocalyptic Deep Horizon Atmosphere */}
      <color attach="background" args={["#1c0d08"]} />
      <fog attach="fog" args={["#1c0d08", 12, 48]} />

      {/* Deterministic Camera Rig */}
      <CameraRig pos={camPos} lookAt={camLookAt} fov={camFov} shake={camShake} t={t} />

      {/* Apocalyptic Ambient Light */}
      <ambientLight color="#521f08" intensity={0.85 * sceneDim} />

      {/* Directional Horizon Key Light from Nuclear Mushroom Cloud */}
      <directionalLight
        position={[0, 10, -20]}
        color="#f97316"
        intensity={2.8 * sceneDim}
      />

      {/* Strong Front-Warm Fill Lights ensuring Oleg, courier, blue tape & monitor are rich and crisp */}
      <directionalLight
        position={[2.5, 4.5, 6.0]}
        color="#fed7aa"
        intensity={2.5 * sceneDim}
        castShadow
      />
      <directionalLight
        position={[-3.0, 3.5, 5.0]}
        color="#fb923c"
        intensity={1.6 * sceneDim}
      />
      <pointLight
        position={[0, 2.2, 1.5]}
        color="#f59e0b"
        intensity={1.3 * sceneDim}
        distance={8}
      />

      {/* 1. Iconic 3D Nuclear Mushroom Cloud on Horizon */}
      <MushroomCloud3D t={t} />

      {/* 2. Ruined City Silhouette, Burning Wrecks & Boulevard */}
      <RuinedCity3D t={t} />

      {/* 3. Shot 4A Looters Brawling in Open Street (ONLY rendered when t < CUES.s4_oleg_shot!) */}
      {isShot4A && <LootersBrawl3D t={t} powerbankTex={powerbankTex} jerrycanTex={jerrycanTex} />}

      {/* 4. Overturned 3D Police Van / "Бобик" at [0, 0, -0.8] */}
      <OverturnedPoliceVan3D policeSignTex={policeSignTex} policeDpsTex={policeDpsTex} t={t} />

      {/* 5. Oleg Seated Cleanly ON TOP of Upturned Van Chassis */}
      <Character3D
        position={[-0.65, 1.32, -0.75]}
        yaw={0.28}
        scale={1.0}
        shirtColor="#cbd5e1"
        pantsColor="#1e293b"
        hair="messy"
        hairColor="#1f2937"
        eyes={isBeforePoweroff ? "red" : "wide"}
        brow={olegBrow}
        mood={isBeforePoweroff ? "smile" : "frown"}
        mouthOpen={olegMouth}
        headTilt={olegHeadTilt}
        holdGamepad={true}
        pose={isBeforePoweroff ? "sit_play" : "sit_chill"}
        t={t}
        seed={400}
      />

      {/* 6. Car Battery Barricade Wrapped in Blue Electrical Tape, PS5 & Monitor */}
      <BatteryBarricadeAndRig3D
        t={t}
        monitorGtaTex={monitorGtaTex}
        monitorDeadTex={monitorDeadTex}
      />

      {/* 7. Foreground Dead Courier & Collector's Edition Box at z = 0.65 .. 0.68 */}
      <DeadCourierScene3D collectorBoxTex={collectorBoxTex} />
    </>
  );
};
