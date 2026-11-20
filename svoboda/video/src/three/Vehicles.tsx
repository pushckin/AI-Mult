// Хромированный суперкар, летающий байк Oppressor Mk II, ракета.
import React from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, extrude, latheGeo, Shadow, planeGeo, circleGeo } from "./toon";
import { Person, mixP, PP } from "./Person";
import { D2R } from "./util";

const torusCache = new Map<string, THREE.TorusGeometry>();
const torus = (r: number, t: number) => {
  const k = `${r}_${t}`;
  if (!torusCache.has(k)) torusCache.set(k, new THREE.TorusGeometry(r, t, 10, 28));
  return torusCache.get(k)!;
};

// ---------------- Суперкар ----------------
export const CAR_L = 4.3;
const CHROME = "#cfdaea";
const CHROME_D = "#93a6c4";
const GLASS = "#8fd2f5";

const Wheel: React.FC<{ x: number; z: number; spin: number; r?: number }> = ({ x, z, spin, r = 0.4 }) => {
  const out = Math.sign(z);
  return (
    <group position={[x, r, z]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Part geo={rcyl(r, r, 0.3, 0.09)} color="#2a2a33" px={3.4} />
      </group>
      <group position={[0, 0, out * 0.152]} rotation={[0, 0, spin * D2R]}>
        <Flat geo={circleGeo} color="#e8eef5" scale={r * 0.72} />
        <Flat geo={circleGeo} color="#4a5368" scale={r * 0.2} position={[0, 0, 0.004 * out]} />
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} rotation={[0, 0, (i * 72 * Math.PI) / 180]}>
            <Flat geo={planeGeo} color="#4a5368" position={[0, r * 0.42, 0.003 * out]} scale={[r * 0.15, r * 0.44, 1]} />
          </group>
        ))}
      </group>
    </group>
  );
};

export const SuperCar: React.FC<{ spin?: number; driver?: PP | null; wobble?: number; lights?: boolean }> = ({ spin = 0, driver, wobble = 0 }) => (
  <group rotation={[wobble * D2R * 0.6, 0, wobble * D2R]}>
    {/* нижний кузов */}
    <Part geo={rbox(CAR_L, 0.5, 1.9, 0.2)} color={CHROME} position={[0, 0.5, 0]} />
    {/* нос-клин */}
    <Part geo={rbox(1.7, 0.3, 1.78, 0.14)} color={CHROME} position={[1.35, 0.68, 0]} rotation={[0, 0, -0.1]} />
    {/* задний горб */}
    <Part geo={rbox(1.35, 0.36, 1.72, 0.16)} color={CHROME} position={[-1.2, 0.78, 0]} rotation={[0, 0, 0.05]} />
    {/* салон (тёмная выемка) и сиденье */}
    <Part geo={rbox(1.3, 0.1, 1.25, 0.04)} color="#15141c" px={2.4} position={[0.1, 0.78, 0]} />
    <Part geo={rbox(0.12, 0.42, 0.9, 0.05)} color="#22202c" px={2.4} position={[-0.55, 0.95, 0]} rotation={[0, 0, 0.18]} />
    {/* лобовое стекло */}
    <Part geo={rbox(0.07, 0.42, 1.55, 0.03)} color={GLASS} px={3} position={[0.78, 1.02, 0]} rotation={[0, 0, 0.62]} />
    {/* спойлер */}
    <Part geo={rbox(0.07, 0.3, 0.07, 0.02)} color={CHROME_D} px={2.6} position={[-1.95, 1.0, 0.55]} />
    <Part geo={rbox(0.07, 0.3, 0.07, 0.02)} color={CHROME_D} px={2.6} position={[-1.95, 1.0, -0.55]} />
    <Part geo={rbox(0.5, 0.07, 1.95, 0.03)} color={CHROME} px={3.2} position={[-2.0, 1.16, 0]} />
    {/* бампер/сплиттер */}
    <Part geo={rbox(0.3, 0.16, 1.9, 0.06)} color="#1d1c26" px={3} position={[2.15, 0.36, 0]} />
    {/* боковые воздухозаборники, молдинги */}
    {[1, -1].map((s) => (
      <group key={s}>
        <Flat geo={rbox(0.9, 0.2, 0.02, 0.01)} color="#2a2f44" position={[-0.25, 0.58, s * 0.955]} />
        <Flat geo={rbox(2.4, 0.07, 0.02, 0.01)} color="#6f8fd0" position={[0.3, 0.38, s * 0.955]} />
        <Flat geo={rbox(3.4, 0.12, 0.02, 0.01)} color="#8fb0e6" position={[0.1, 0.55, s * 0.953]} rotation={[0, 0, 0.012]} />
        {/* фары и стоп-сигналы */}
        <Flat geo={circleGeo} color="#fff6b8" position={[2.0, 0.66, s * 0.62]} rotation={[0, Math.PI / 2, 0]} scale={[0.14, 0.09, 1]} double />
        <Flat geo={planeGeo} color="#e0273a" position={[-2.151, 0.62, s * 0.55]} rotation={[0, -Math.PI / 2, 0]} scale={[0.4, 0.1, 1]} double />
      </group>
    ))}
    {/* выхлопы */}
    {[0.32, -0.32].map((z) => (
      <group key={z} position={[-2.2, 0.42, z]} rotation={[0, 0, Math.PI / 2]}>
        <Part geo={rcyl(0.07, 0.07, 0.14, 0.02)} color="#59607a" px={2.4} />
      </group>
    ))}
    {/* колёса */}
    <Wheel x={1.4} z={0.98} spin={spin} />
    <Wheel x={1.4} z={-0.98} spin={-spin} />
    <Wheel x={-1.35} z={1.0} spin={spin} r={0.42} />
    <Wheel x={-1.35} z={-1.0} spin={-spin} r={0.42} />
    {/* руль */}
    <group position={[0.38, 1.0, 0]} rotation={[0, 0, 0.9]}>
      <Part geo={torus(0.17, 0.028)} color="#14131a" px={2.4} rotation={[Math.PI / 2, 0, 0]} />
    </group>
    {/* пришелец за рулём */}
    {driver && (
      <group position={[-0.25, 0, 0]}>
        <Person pose={driver} kind="alien" shadow={false} />
      </group>
    )}
  </group>
);

export const sitPose = (extra: Partial<PP> = {}): PP =>
  mixP({ x: -0.15, y: 0.93, z: 0, ry: 90, scale: 0.9, llx: 88, lrx: 88, llk: 88, lrk: 88, llz: 6, lrz: 6, alx: 52, arx: 52, ale: 24, are: 24, alz: 18, arz: 18, mouth: 0, ...extra });

// ---------------- Ракета ----------------
/** Ракета, нос по +x */
const rocketProf = (): Array<[number, number]> => [
  [0, -0.42], [0.06, -0.42], [0.09, -0.36], [0.09, 0.14], [0.07, 0.26], [0.04, 0.34], [0, 0.4],
];
export const Rocket: React.FC<{ flame?: number; scale?: number }> = ({ flame = 0, scale = 1 }) => (
  <group scale={scale} rotation={[0, 0, -Math.PI / 2]}>
    <Part geo={latheGeo("rocket", rocketProf(), 14)} color="#f4f3ee" px={3} />
    <Part geo={latheGeo("rocketN", [[0, 0.2], [0.093, 0.2], [0.075, 0.26], [0.045, 0.35], [0, 0.4]].map(([a, b]) => [a, b] as [number, number]), 14)} color="#e0273a" px={0} />
    {[0, 1, 2].map((i) => (
      <group key={i} rotation={[0, (i * 120 * Math.PI) / 180, 0]}>
        <Part geo={rbox(0.15, 0.17, 0.025, 0.008)} color="#e0273a" px={2.6} position={[0.1, -0.33, 0]} rotation={[0, 0, -0.35]} />
      </group>
    ))}
    {flame > 0 && (
      <group position={[0, -0.42 - 0.12 * flame, 0]} rotation={[Math.PI, 0, 0]}>
        <Part geo={rcyl(0.075, 0.0, 0.26 * flame + 0.1, 0.005, 12)} color={flame > 1 ? "#ffd23a" : "#ff8a1c"} px={2.4} />
      </group>
    )}
  </group>
);

// ---------------- Байк Oppressor Mk II ----------------
const wingPts = (): Array<[number, number]> => [[0.6, 0], [0.1, 0.12], [-0.7, 1.45], [-1.05, 1.5], [-0.95, 0.9], [-0.7, 0.0]];
const BikeWheel: React.FC<{ x: number; y: number; r: number; w: number; spin: number }> = ({ x, y, r, w, spin }) => (
  <group position={[x, y, 0]}>
    <group rotation={[Math.PI / 2, 0, 0]}>
      <Part geo={rcyl(r, r, w, 0.07)} color="#25252e" px={3.4} />
    </group>
    {[1, -1].map((s) => (
      <group key={s} position={[0, 0, s * (w / 2 + 0.004)]} rotation={[0, 0, spin * s * D2R]}>
        <Flat geo={circleGeo} color="#dfe6ee" scale={r * 0.62} double />
        <Flat geo={circleGeo} color="#d6283a" scale={r * 0.2} position={[0, 0, 0.004 * s]} double />
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * 90 * Math.PI) / 180]}>
            <Flat geo={planeGeo} color="#414a60" position={[0, r * 0.36, 0.003 * s]} scale={[r * 0.12, r * 0.38, 1]} double />
          </group>
        ))}
      </group>
    ))}
  </group>
);

export const Bike: React.FC<{ spin?: number; flame?: number; rockets?: boolean[]; wob?: number }> = ({ spin = 0, flame = 0, rockets = [true, true, true, true, true, true], wob = 0 }) => {
  const wing = extrude("bikewing", wingPts(), 0.06, 0.02);
  return (
    <group rotation={[0, 0, wob * D2R]}>
      {/* корпус-торпеда */}
      <Part geo={sphereGeo(24)} color="#343a6e" position={[0.15, 0.82, 0]} scale={[0.95, 0.34, 0.36]} />
      <Part geo={rbox(1.0, 0.3, 0.5, 0.12)} color="#2b3060" position={[-0.65, 0.78, 0]} />
      {/* кабина-стекло */}
      <Part geo={sphereGeo(16)} color="#7fd0f2" px={3} position={[0.55, 1.02, 0]} scale={[0.28, 0.18, 0.2]} />
      {/* сиденье, руль */}
      <Part geo={rbox(0.6, 0.12, 0.3, 0.05)} color="#18171f" px={2.6} position={[-0.3, 1.02, 0]} />
      <Part geo={rbox(0.09, 0.08, 1.0, 0.03)} color="#18171f" px={2.6} position={[0.8, 1.12, 0]} />
      {/* вилка к переднему колесу */}
      <Part geo={rbox(0.08, 0.78, 0.11, 0.03)} color="#8d96ae" px={2.6} position={[0.98, 0.76, 0.2]} rotation={[0, 0, 0.32]} />
      <Part geo={rbox(0.08, 0.78, 0.11, 0.03)} color="#8d96ae" px={2.6} position={[0.98, 0.76, -0.2]} rotation={[0, 0, 0.32]} />
      <BikeWheel x={1.12} y={0.38} r={0.38} w={0.2} spin={spin} />
      <BikeWheel x={-1.0} y={0.46} r={0.46} w={0.3} spin={spin} />
      {/* крылья (выдавленные, объёмные) */}
      <group position={[-0.1, 0.9, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <group rotation={[0, 0, 0]} scale={[1, 1, 1]}>
            <Part geo={wing.geo} hull={wing.hull} color="#d6283a" px={3.4} rotation={[0, 0, 0]} position={[0, 0, 0.12]} />
          </group>
          <group scale={[1, -1, 1]}>
            <Part geo={wing.geo} hull={wing.hull} color="#d6283a" px={3.4} position={[0, 0, 0.12]} />
          </group>
        </group>
      </group>
      {/* реактивные сопла */}
      {[0.3, -0.3].map((z) => (
        <group key={z} position={[-1.3, 0.92, z]} rotation={[0, 0, Math.PI / 2]}>
          <Part geo={rcyl(0.17, 0.13, 0.5, 0.03)} color="#454c66" px={3} />
          {flame > 0 && (
            <group position={[0, 0.25 + 0.2 * flame, 0]} rotation={[0, 0, Math.PI]}>
              <Part geo={rcyl(0.13, 0.0, 0.4 + 0.3 * flame, 0.01, 14)} color={flame > 1 ? "#ffe04a" : "#ff8a1c"} px={2.6} />
            </group>
          )}
        </group>
      ))}
      {/* ракеты на пилонах */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const row = Math.floor(i / 2);
        return rockets[i] ? (
          <group key={i} position={[0.35 - row * 0.05, 0.62 - (row > 0 ? 0 : 0), side * (0.55 + row * 0.2)]}>
            <Rocket scale={0.78} />
          </group>
        ) : null;
      })}
    </group>
  );
};
export const BikeShadow: React.FC<{ x: number; z: number }> = ({ x, z }) => <Shadow position={[x, 0.025, z]} w={1.2} d={0.5} />;
