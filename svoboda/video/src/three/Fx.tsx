// Плоские непрозрачные эффекты из 3D-форм: звезда-импакт, облака дыма, пламя, обломки, пыль, мусор.
import React from "react";
import * as THREE from "three";
import { Part, Flat, rbox, sphereGeo, extrude, planeGeo, rcyl } from "./toon";
import { hash, clamp, hold } from "./util";

const starPts = (n: number, ro: number, ri: number, seed: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? ro * (0.85 + 0.3 * hash(i, seed)) : ri * (0.8 + 0.4 * hash(i + 50, seed));
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
};
/** Зубчатая звезда (3 слоя: красный-оранжевый-жёлтый), лицом к камере */
export const Star: React.FC<{ position: [number, number, number]; size: number; rot?: number; seed?: number; n?: number }> = ({ position, size, rot = 0, seed = 1, n = 9 }) => {
  const a = extrude(`star_a${n}_${seed}`, starPts(n, 1, 0.55, seed), 0.12, 0.03);
  const b = extrude(`star_b${n}_${seed}`, starPts(n, 0.74, 0.42, seed + 3), 0.12, 0.02);
  const c = extrude(`star_c${n}_${seed}`, starPts(n, 0.46, 0.28, seed + 7), 0.12, 0.02);
  return (
    <group position={position} rotation={[0, 0, rot]} scale={size}>
      <Part geo={a.geo} hull={a.hull} color="#e0392a" px={4} />
      <Part geo={b.geo} hull={b.hull} color="#ff8a1c" px={0} position={[0, 0, 0.07]} />
      <Part geo={c.geo} hull={c.hull} color="#ffe04a" px={0} position={[0, 0, 0.14]} />
    </group>
  );
};

/** Клубы дыма-«облака»: непрозрачные плоско-закрашенные сферы с контуром */
export const Puff: React.FC<{ position: [number, number, number]; r: number; color?: string; px?: number }> = ({ position, r, color = "#cfd0dc", px = 3 }) => (
  <Part geo={sphereGeo(16)} color={color} px={px} position={position} scale={r} />
);

/** Дымовой столб: клубы растут и сносятся ветром, цикл на двойках */
export const SmokeColumn: React.FC<{ x: number; y: number; z: number; frame: number; n?: number; dark?: boolean; h?: number }> = ({ x, y, z, frame, n = 6, dark = true, h = 2.3 }) => {
  const f = hold(frame, 2) / 2;
  return (
    <>
      {Array.from({ length: n }).map((_, j) => {
        const age = ((f + j * 3) % (n * 3)) / (n * 3); // 0..1
        const rr = 0.13 + age * 0.3;
        return <Puff key={j} position={[x + age * 1.2 + (j % 2 ? 0.08 : -0.08), y + age * h, z + 0.05]} r={rr} color={dark ? (age > 0.5 ? "#5a5a76" : "#4a4a64") : "#d6d6e2"} />;
      })}
    </>
  );
};

const flameA = (): Array<[number, number]> => [[-0.5, 0], [-0.55, 0.35], [-0.25, 0.7], [-0.32, 1.1], [0.0, 1.6], [0.22, 1.05], [0.5, 0.7], [0.55, 0.3], [0.4, 0]];
const flameB = (): Array<[number, number]> => [[-0.5, 0], [-0.4, 0.5], [-0.5, 0.95], [-0.12, 1.3], [0.15, 1.8], [0.3, 1.2], [0.52, 0.8], [0.5, 0.3], [0.4, 0]];
/** Пламя горящей урны: 2 позы (меняются на двойках) */
export const Flame: React.FC<{ position: [number, number, number]; scale?: number; frame: number }> = ({ position, scale = 1, frame }) => {
  const alt = Math.floor(frame / 2) % 2 === 1;
  const o = extrude(alt ? "flB" : "flA", alt ? flameB() : flameA(), 0.12, 0.03);
  const i = extrude(alt ? "flBi" : "flAi", (alt ? flameB() : flameA()).map(([x, y]) => [x * 0.55, y * 0.6] as [number, number]), 0.12, 0.02);
  return (
    <group position={position} scale={scale}>
      <Part geo={o.geo} hull={o.hull} color="#ff8a1c" px={3.4} />
      <Part geo={i.geo} hull={i.hull} color="#ffe04a" px={0} position={[0, 0.02, 0.08]} />
    </group>
  );
};

/** Обломок */
export const Chunk: React.FC<{ position: [number, number, number]; rot: [number, number, number]; s: number; color?: string }> = ({ position, rot, s, color = "#6c5a52" }) => (
  <Part geo={rbox(1, 0.7, 0.8, 0.12)} color={color} px={2.6} position={position} rotation={rot} scale={s} />
);

/** Взрыв ракеты: звезда + облака + обломки. k - кадров с момента взрыва */
export const Explosion: React.FC<{ at: [number, number, number]; k: number; seed: number }> = ({ at, k, seed }) => {
  if (k < 0 || k > 44) return null;
  const kh = Math.floor(k / 2) * 2;
  const [x, y, z] = at;
  const out: React.ReactNode[] = [];
  if (kh < 8) out.push(<Star key="s" position={[x, y, z + 0.5]} size={0.45 + Math.min(kh, 6) * 0.1} rot={seed * 0.7 + kh * 0.16} seed={seed} />);
  if (kh >= 2) {
    [-1, 0, 1].forEach((j) => {
      const a = kh - 2;
      const rr = a < 24 ? 0.26 + Math.min(a, 14) * 0.03 : Math.max(0.05, 0.68 - (a - 24) * 0.035);
      out.push(<Puff key={`p${j}`} position={[x + j * 0.3 + a * 0.012 * j, y + 0.15 + a * 0.06 + Math.abs(j) * 0.05, z + 0.3]} r={rr} color={a < 6 ? "#8a8aa4" : a < 14 ? "#6c6c88" : "#55556f"} />);
    });
  }
  if (kh < 14) {
    for (let i = 0; i < 5; i++) {
      const a = hash(i, seed) * Math.PI * 2;
      const sp = 0.25 + hash(i + 9, seed) * 0.3;
      out.push(<Chunk key={`c${i}`} position={[x + Math.cos(a) * sp * kh * 1.5, y + Math.sin(a) * sp * kh * 1.5 - kh * kh * 0.012, z + 0.4]} rot={[kh * 0.4 + i, kh * 0.3, i]} s={0.1 + hash(i, seed + 4) * 0.08} color={i % 2 ? "#6c5a52" : "#d9c9a8"} />);
    }
  }
  return <>{out}</>;
};

const paperGeo = new THREE.PlaneGeometry(0.34, 0.26);
/** Летящая по ветру бумага (плоская непрозрачная, кувыркается на двойках) */
export const Paper: React.FC<{ frame: number; seed: number; y: number; z: number; v: number; x0: number }> = ({ frame, seed, y, z, v, x0 }) => {
  const f = hold(frame, 2);
  const x = ((x0 + v * f) % 22) - 11 + 0.6;
  const bob = Math.sin(f * 0.35 + seed * 3) * 0.35;
  return (
    <mesh geometry={paperGeo} position={[x, y + bob, z]} rotation={[f * 0.31 + seed, f * 0.23, f * 0.37]} renderOrder={5}>
      <meshBasicMaterial color={seed % 2 ? "#f4f2ea" : "#e9d9a0"} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
};

/** Пыльное облако: кольцо плоских шаров от шлёпа/удара */
export const DustRing: React.FC<{ at: [number, number, number]; k: number; r?: number }> = ({ at, k, r = 1 }) => {
  if (k < 0 || k > 14) return null;
  const kh = Math.floor(k / 2) * 2;
  return (
    <>
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Puff position={[at[0] + s * (0.4 + kh * 0.09) * r, at[1] + 0.18 + kh * 0.012, at[2]]} r={(0.22 + kh * 0.022) * r} color="#cbc8d8" />
          <Puff position={[at[0] + s * (0.2 + kh * 0.06) * r, at[1] + 0.3 + kh * 0.02, at[2] + 0.1]} r={(0.17 + kh * 0.016) * r} color="#dedcea" />
        </React.Fragment>
      ))}
    </>
  );
};

/** Зуб */
export const Tooth: React.FC<{ position: [number, number, number]; rot: number; s: number }> = ({ position, rot, s }) => (
  <group position={position} rotation={[0, 0, rot]} scale={s}>
    <Part geo={rbox(0.3, 0.26, 0.2, 0.09)} color="#fbfaf2" px={3} position={[0, 0.07, 0]} />
    <Part geo={rcyl(0.07, 0.04, 0.2, 0.03, 10)} color="#fbfaf2" px={3} position={[-0.07, -0.12, 0]} />
    <Part geo={rcyl(0.07, 0.04, 0.2, 0.03, 10)} color="#fbfaf2" px={3} position={[0.07, -0.12, 0]} />
  </group>
);

void clamp;
void planeGeo;
void Flat;
