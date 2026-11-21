// Эффекты сцены 1 для 60 fps: все параметры - функции непрерывного времени f (кадр24 как float, секунды = f/24). Без квантования на двойки.
import React from "react";
import * as THREE from "three";
import { Part, extrude } from "./toon";
import { hash } from "./util";
import { Chunk, Puff, Star } from "./Fx";
import { sstep } from "./smooth";

const flameA = (): Array<[number, number]> => [[-0.5, 0], [-0.55, 0.35], [-0.25, 0.7], [-0.32, 1.1], [0.0, 1.6], [0.22, 1.05], [0.5, 0.7], [0.55, 0.3], [0.4, 0]];
/** Пламя горящей урны: одна форма, непрерывно «дышит» (масштаб по высоте/ширине + покачивание) вместо переключения двух поз */
export const FlameC: React.FC<{ position: [number, number, number]; scale?: number; f: number; seed?: number }> = ({ position, scale = 1, f, seed = 0 }) => {
  const o = extrude("flA", flameA(), 0.12, 0.03);
  const i = extrude("flAi", flameA().map(([x, y]) => [x * 0.55, y * 0.6] as [number, number]), 0.12, 0.02);
  const T = Math.PI * 2;
  const sy = 1 + 0.1 * Math.sin((T * f) / 3.4 + seed) + 0.05 * Math.sin((T * f) / 7.3 + seed * 2);
  const sx = 1 + 0.06 * Math.sin((T * f) / 4.1 + 1 + seed);
  const rz = 0.07 * Math.sin((T * f) / 6.1 + seed * 3);
  const sy2 = 1 + 0.14 * Math.sin((T * f) / 2.9 + 2 + seed);
  return (
    <group position={position} scale={scale} rotation={[0, 0, rz]}>
      <group scale={[sx, sy, 1]}>
        <Part flat geo={o.geo} hull={o.hull} color="#ff8a1c" px={3.4} />
      </group>
      <group scale={[sx, sy2, 1]} position={[0, 0.02, 0.08]}>
        <Part flat geo={i.geo} hull={i.hull} color="#ffe04a" px={0} />
      </group>
    </group>
  );
};

/** Дымовой столб: непрерывный подъём и снос ветром, клубы плавно растут/гаснут на концах цикла (без телепорта) */
export const SmokeC: React.FC<{ x: number; y: number; z: number; f: number; n?: number; dark?: boolean; h?: number }> = ({ x, y, z, f, n = 6, dark = true, h = 2.3 }) => {
  const g = f / 2;
  return (
    <>
      {Array.from({ length: n }).map((_, j) => {
        const age = ((g + j * 3) % (n * 3)) / (n * 3); // 0..1
        const fade = sstep(age / 0.1) * (1 - sstep((age - 0.82) / 0.18));
        const rr = (0.13 + age * 0.3) * fade;
        if (rr < 0.01) return null;
        return <Puff key={j} position={[x + age * 1.2 + (j % 2 ? 0.08 : -0.08), y + age * h, z + 0.05]} r={rr} color={dark ? (age > 0.5 ? "#8b8aa6" : "#75748f") : "#e6e6f0"} />;
      })}
    </>
  );
};

/** Взрыв ракеты: звезда + облака + обломки. k - кадров24 с момента взрыва (float) */
export const ExplosionC: React.FC<{ at: [number, number, number]; k: number; seed: number }> = ({ at, k, seed }) => {
  if (k < 0 || k > 44) return null;
  const [x, y, z] = at;
  const out: React.ReactNode[] = [];
  if (k < 8) {
    const grow = 0.55 + 0.45 * sstep(k / 1.5);
    const size = (0.45 + Math.min(k, 6) * 0.1) * grow * (1 - sstep((k - 6.2) / 1.8));
    if (size > 0.02) out.push(<Star key="s" position={[x, y, z + 0.5]} size={size} rot={seed * 0.7 + k * 0.16} seed={seed} />);
  }
  if (k >= 2) {
    const a = k - 2;
    const appear = sstep(a / 1.6);
    [-1, 0, 1].forEach((j) => {
      const rr = (a < 24 ? 0.26 + Math.min(a, 14) * 0.03 : Math.max(0.05, 0.68 - (a - 24) * 0.035)) * appear;
      if (rr < 0.02) return;
      out.push(<Puff key={`p${j}`} position={[x + j * 0.3 + a * 0.012 * j, y + 0.15 + a * 0.06 + Math.abs(j) * 0.05, z + 0.3]} r={rr} color={a < 6 ? "#d0cfdc" : a < 14 ? "#aeadc2" : "#8f8ea8"} />);
    });
  }
  if (k < 14) {
    const fade = 1 - sstep((k - 10) / 4);
    for (let i = 0; i < 5; i++) {
      const ang = hash(i, seed) * Math.PI * 2;
      const sp = 0.25 + hash(i + 9, seed) * 0.3;
      out.push(<Chunk key={`c${i}`} position={[x + Math.cos(ang) * sp * k * 1.5, y + Math.sin(ang) * sp * k * 1.5 - k * k * 0.012, z + 0.4]} rot={[k * 0.4 + i, k * 0.3, i]} s={(0.1 + hash(i, seed + 4) * 0.08) * fade} color={i % 2 ? "#6c5a52" : "#d9c9a8"} />);
    }
  }
  return <>{out}</>;
};

const paperGeo = new THREE.PlaneGeometry(0.34, 0.26);
/** Летящая по ветру бумага: непрерывный дрейф и кувырок */
export const PaperC: React.FC<{ f: number; seed: number; y: number; z: number; v: number; x0: number }> = ({ f, seed, y, z, v, x0 }) => {
  const x = ((x0 + v * f) % 22) - 11 + 0.6;
  const bob = Math.sin(f * 0.35 + seed * 3) * 0.35;
  return (
    <mesh geometry={paperGeo} position={[x, y + bob, z]} rotation={[f * 0.31 + seed, f * 0.23, f * 0.37]} renderOrder={5}>
      <meshBasicMaterial color={seed % 2 ? "#f4f2ea" : "#e9d9a0"} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
};

/** Пыльное кольцо от шлёпа: облака плавно расходятся и сжимаются в конце */
export const DustRingC: React.FC<{ at: [number, number, number]; k: number; r?: number }> = ({ at, k, r = 1 }) => {
  if (k < 0 || k > 15) return null;
  const fade = 1 - sstep((k - 11) / 4);
  const grow = sstep(k / 1.2);
  return (
    <>
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Puff position={[at[0] + s * (0.4 + k * 0.09) * r, at[1] + 0.18 + k * 0.012, at[2]]} r={(0.22 + k * 0.022) * r * fade * grow + 0.001} color="#cbc8d8" />
          <Puff position={[at[0] + s * (0.2 + k * 0.06) * r, at[1] + 0.3 + k * 0.02, at[2] + 0.1]} r={(0.17 + k * 0.016) * r * fade * grow + 0.001} color="#dedcea" />
        </React.Fragment>
      ))}
    </>
  );
};
