import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const WHEEL_GEO = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 20);
const HUB_GEO = new THREE.CylinderGeometry(0.22, 0.22, 0.30, 14);
const DROP_GEO = new THREE.SphereGeometry(0.115, 10, 8);
const RING_GEO = new THREE.CylinderGeometry(1, 1, 0.035, 16);

const Wheel3D: React.FC<{ position: [number, number, number]; spin: number }> = ({ position, spin }) => (
  <group position={position} rotation={[0, 0, spin]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} geometry={WHEEL_GEO} castShadow>
      <meshStandardMaterial color="#18181b" roughness={0.85} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} geometry={HUB_GEO}>
      <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.35} />
    </mesh>
    <mesh position={[0.14, 0, 0]} rotation={[0, 0, 0]}>
      <boxGeometry args={[0.18, 0.06, 0.31]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
  </group>
);

export const ArmoredVan3D: React.FC<{
  position: [number, number, number];
  facingLeft?: boolean;
  doorOpen?: number;
  pitch?: number;
  crumple?: number;
  wheelSpin?: number;
}> = ({ position, facingLeft = false, doorOpen = 0, pitch = 0, crumple = 0, wheelSpin = 0 }) => {
  const cargoGeo = useMemo(() => new RoundedBoxGeometry(2.65, 1.55, 1.65, 4, 0.12), []);
  const cabGeo = useMemo(() => new RoundedBoxGeometry(1.1, 1.15, 1.56, 4, 0.12), []);

  const scaleX = 1 - crumple * 0.12;
  const scaleY = 1 + crumple * 0.08;
  const rotY = facingLeft ? Math.PI : 0;

  return (
    <group position={position} rotation={[0, rotY, pitch]} scale={[scaleX, scaleY, 1]}>
      {/* Cargo Box */}
      <mesh position={[-0.45, 1.18, 0]} geometry={cargoGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#4f5d3c" roughness={0.55} />
      </mesh>
      {/* Yellow Stripe */}
      <mesh position={[-0.45, 1.12, 0]}>
        <boxGeometry args={[2.68, 0.24, 1.68]} />
        <meshStandardMaterial color="#facc15" roughness={0.35} />
      </mesh>
      {/* Cab */}
      <mesh position={[1.15, 0.98, 0]} geometry={cabGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#445233" roughness={0.55} />
      </mesh>
      {/* Windshield */}
      <mesh position={[1.38, 1.32, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.12, 0.54, 1.36]} />
        <meshStandardMaterial color="#7dd3fc" metalness={0.4} roughness={0.15} />
      </mesh>
      {/* Side Cab Windows */}
      <mesh position={[1.05, 1.28, 0]}>
        <boxGeometry args={[0.52, 0.42, 1.58]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.3} />
      </mesh>
      {/* Bumper & Grille */}
      <mesh position={[1.72, 0.56, 0]} castShadow>
        <boxGeometry args={[0.18, 0.24, 1.62]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Headlights */}
      <mesh position={[1.71, 0.78, 0.55]}>
        <boxGeometry args={[0.08, 0.16, 0.22]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[1.71, 0.78, -0.55]}>
        <boxGeometry args={[0.08, 0.16, 0.22]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.6} />
      </mesh>

      {/* Dark Cargo Interior (visible when doors swing open) */}
      <mesh position={[-1.72, 1.15, 0]}>
        <boxGeometry args={[0.15, 1.32, 1.38]} />
        <meshBasicMaterial color="#111827" />
      </mesh>

      {/* Hinged Rear Double Doors */}
      <group position={[-1.78, 1.15, 0.74]} rotation={[0, -doorOpen * 1.45, 0]}>
        <mesh position={[0, 0, -0.35]} castShadow>
          <boxGeometry args={[0.1, 1.35, 0.70]} />
          <meshStandardMaterial color="#3d492e" roughness={0.55} />
        </mesh>
      </group>
      <group position={[-1.78, 1.15, -0.74]} rotation={[0, doorOpen * 1.45, 0]}>
        <mesh position={[0, 0, 0.35]} castShadow>
          <boxGeometry args={[0.1, 1.35, 0.70]} />
          <meshStandardMaterial color="#3d492e" roughness={0.55} />
        </mesh>
      </group>

      {/* 4 Spinning Wheels */}
      <Wheel3D position={[-1.15, 0.42, 0.82]} spin={wheelSpin} />
      <Wheel3D position={[-1.15, 0.42, -0.82]} spin={wheelSpin} />
      <Wheel3D position={[1.15, 0.42, 0.82]} spin={wheelSpin} />
      <Wheel3D position={[1.15, 0.42, -0.82]} spin={wheelSpin} />
    </group>
  );
};

export const FireTruck3D: React.FC<{
  position: [number, number, number];
  brakePitch?: number;
  bounceY?: number;
  t: number;
  wheelSpin?: number;
}> = ({ position, brakePitch = 0, bounceY = 0, t, wheelSpin = 0 }) => {
  const bodyGeo = useMemo(() => new RoundedBoxGeometry(3.2, 1.65, 1.78, 4, 0.12), []);
  const cabGeo = useMemo(() => new RoundedBoxGeometry(1.45, 1.55, 1.74, 4, 0.12), []);

  const blueOn = Math.sin(t * 24) > 0;

  return (
    <group position={[position[0], position[1] + bounceY, position[2]]} rotation={[0, 0, brakePitch]}>
      {/* Equipment Body */}
      <mesh position={[-0.75, 1.25, 0]} geometry={bodyGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#dc2626" roughness={0.35} />
      </mesh>
      {/* White Stripe */}
      <mesh position={[0.02, 1.05, 0]}>
        <boxGeometry args={[4.75, 0.22, 1.81]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      {/* Equipment Roll-up Shutters */}
      {[-1.55, -0.65, 0.25].map((rx, idx) => (
        <mesh key={idx} position={[rx, 1.32, 0]}>
          <boxGeometry args={[0.72, 0.92, 1.80]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
      {/* Cab */}
      <mesh position={[1.65, 1.2, 0]} geometry={cabGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#b91c1c" roughness={0.35} />
      </mesh>
      {/* Cab Windshield & Windows */}
      <mesh position={[2.32, 1.48, 0]}>
        <boxGeometry args={[0.14, 0.58, 1.48]} />
        <meshStandardMaterial color="#bae6fd" metalness={0.35} roughness={0.15} />
      </mesh>
      <mesh position={[1.75, 1.48, 0]}>
        <boxGeometry args={[0.75, 0.52, 1.76]} />
        <meshStandardMaterial color="#bae6fd" metalness={0.35} roughness={0.15} />
      </mesh>
      {/* Chrome Front Bumper */}
      <mesh position={[2.42, 0.56, 0]} castShadow>
        <boxGeometry args={[0.2, 0.26, 1.82]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Ladder Rack on Roof */}
      <group position={[-0.65, 2.18, 0.3]}>
        <mesh>
          <boxGeometry args={[3.4, 0.08, 0.55]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Emergency Lightbar */}
      <group position={[1.72, 2.08, 0]}>
        <mesh position={[0, 0, 0.45]}>
          <boxGeometry args={[0.32, 0.22, 0.45]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0ea5e9"
            emissiveIntensity={blueOn ? 3.5 : 0.2}
          />
        </mesh>
        <mesh position={[0, 0, -0.45]}>
          <boxGeometry args={[0.32, 0.22, 0.45]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={!blueOn ? 3.5 : 0.2}
          />
        </mesh>
        <pointLight
          position={[0, 0.35, 0]}
          color={blueOn ? "#38bdf8" : "#ef4444"}
          intensity={5.5}
          distance={12}
        />
      </group>

      {/* 4 Spinning Wheels */}
      <Wheel3D position={[-1.45, 0.42, 0.90]} spin={wheelSpin} />
      <Wheel3D position={[-1.45, 0.42, -0.90]} spin={wheelSpin} />
      <Wheel3D position={[1.65, 0.42, 0.90]} spin={wheelSpin} />
      <Wheel3D position={[1.65, 0.42, -0.90]} spin={wheelSpin} />
    </group>
  );
};

export const WildFireHose3D: React.FC<{
  origin: [number, number, number];
  t: number;
  active: boolean;
}> = ({ origin, t, active }) => {
  if (!active) return null;

  const whip1 = Math.sin(t * 14) * 0.55;
  const whip2 = Math.cos(t * 18) * 0.45;
  const segments = 16;
  const pts: [number, number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const p = i / segments;
    const x =
      origin[0] -
      Math.sin(p * Math.PI * 0.85) * 1.45 +
      p * 0.25 +
      Math.sin(p * Math.PI * 1.5) * whip2 * 0.35;
    const y = origin[1] * (1 - p) + 0.14 + Math.abs(Math.sin(t * 14 - p * 3.5)) * 0.32 * p;
    const z = origin[2] + p * 1.75 + Math.sin(t * 12 + p * 4) * whip1 * 0.55 * p;
    pts.push([x, y, z]);
  }

  const noz = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const dx = noz[0] - prev[0];
  const dy = noz[1] - prev[1];
  const dz = noz[2] - prev[2];
  const yawAngle = Math.atan2(-dz, dx);
  const pitchAngle = Math.atan2(dy, Math.hypot(dx, dz));

  const dropletCount = 45;

  return (
    <group>
      {/* Connected 3D Hose Segments */}
      {pts.slice(0, -1).map((pt, i) => {
        const next = pts[i + 1];
        const midX = (pt[0] + next[0]) * 0.5;
        const midY = (pt[1] + next[1]) * 0.5;
        const midZ = (pt[2] + next[2]) * 0.5;
        const len = Math.hypot(next[0] - pt[0], next[1] - pt[1], next[2] - pt[2]);
        const dirY = Math.atan2(-(next[2] - pt[2]), next[0] - pt[0]);
        const dirZ = Math.atan2(next[1] - pt[1], Math.hypot(next[0] - pt[0], next[2] - pt[2]));
        return (
          <mesh
            key={i}
            position={[midX, midY, midZ]}
            rotation={[0, dirY, dirZ - Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.07, len + 0.05, 10]} />
            <meshStandardMaterial color="#e5e0d4" roughness={0.45} />
          </mesh>
        );
      })}

      {/* Brass Nozzle */}
      <group position={noz} rotation={[0, yawAngle, pitchAngle - Math.PI / 2]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.095, 0.28, 12]} />
          <meshStandardMaterial color="#eab308" metalness={0.65} roughness={0.25} />
        </mesh>
      </group>

      {/* 45 Animated 3D Water Droplets + Asphalt Splash Rings */}
      {Array.from({ length: dropletCount }).map((_, i) => {
        const wp = (t * 2.6 + i / dropletCount) % 1;
        const tLaunch = t - wp * 0.38;
        const lYaw = -0.55 + Math.sin(tLaunch * 14) * 0.35;
        const lPitch = 0.56 + Math.cos(tLaunch * 18) * 0.2;
        const speed = 3.5 + (i % 5) * 0.28;

        const vx = Math.cos(lYaw) * Math.cos(lPitch) * speed;
        const vy = Math.sin(lPitch) * speed;
        const vz = -Math.sin(lYaw) * Math.cos(lPitch) * speed;

        const px = noz[0] + vx * wp;
        const py = Math.max(0.06, noz[1] + vy * wp - 4.8 * wp * wp);
        const pz = noz[2] + vz * wp;

        const onGround = wp > 0.72 && py <= 0.15;
        const splashScale = onGround ? 0.15 + ((wp - 0.72) / 0.28) * 0.45 : 0;

        return (
          <React.Fragment key={i}>
            <mesh
              position={[px, py, pz]}
              geometry={DROP_GEO}
              scale={1 - wp * 0.35}
            >
              <meshStandardMaterial
                color="#7dd3fc"
                emissive="#38bdf8"
                emissiveIntensity={0.45}
                roughness={0.1}
                transparent
                opacity={0.9}
              />
            </mesh>
            {onGround && (
              <mesh
                position={[px, 0.025, pz]}
                geometry={RING_GEO}
                scale={[splashScale, 1, splashScale]}
              >
                <meshBasicMaterial
                  color="#bae6fd"
                  transparent
                  opacity={Math.max(0, 0.75 * (1 - (wp - 0.72) / 0.28))}
                />
              </mesh>
            )}
          </React.Fragment>
        );
      })}
    </group>
  );
};
