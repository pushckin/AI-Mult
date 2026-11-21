// Сцена 4: звёзды розыска, дульная вспышка, взрыв гранаты, осколки стекла, искра «тук», плевок. Всё плоскими формами 2-3 тонов.
import React from "react";
import { Part, Flat, planeGeo, circleGeo, extrude, sphereGeo, rbox, flatMat, INK } from "./toon";
import { Puff, Star, Flame, Chunk } from "./Fx";
import { hash } from "./util";

const starPoly = (n: number, ro: number, ri: number, off = -Math.PI / 2): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n * 2; i++) {
    const a = off + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? ro : ri;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
};

/** Звезда розыска: плоская золотая, толстый контур. k - кадры с появления (0 - вспышка, крупнее), yaw - поворот к камере */
export const WantedStar: React.FC<{ position: [number, number, number]; size?: number; k: number; yaw?: number }> = ({ position, size = 0.5, k, yaw = 0 }) => {
  if (k < 0) return null;
  const a = extrude("wanted_a", starPoly(5, 1, 0.45), 0.14, 0.03);
  const b = extrude("wanted_b", starPoly(5, 0.62, 0.28), 0.14, 0.02);
  const pop = k < 2 ? 1.5 : k < 4 ? 0.86 : 1;
  const bob = k > 8 ? Math.round(Math.sin(k * 0.5) * 2) * 0.012 : 0;
  return (
    <group position={[position[0], position[1] + bob * size * 10, position[2]]} rotation={[0, yaw, 0]} scale={size * pop}>
      <Part flat geo={a.geo} hull={a.hull} color={k < 2 ? "#fff3a0" : "#ffc61a"} px={5} />
      <Part flat geo={b.geo} hull={b.hull} color={k < 2 ? "#ffffff" : "#ffe27a"} px={0} position={[0, 0.02, 0.1]} />
      {k < 6 &&
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <group key={i} rotation={[0, 0, (i / 8) * Math.PI * 2 + 0.2]}>
            <Flat geo={planeGeo} color="#ffe27a" position={[0, 1.35 + k * 0.08, 0]} scale={[0.07, 0.28, 1]} />
          </group>
        ))}
    </group>
  );
};

/** Дульная вспышка вдоль +x (в плоскости экрана), поворот rotZ вокруг оси взгляда; k - кадры (0..3) */
const FLASH: Array<[number, number]> = [[0, 0.18], [0.35, 0.3], [0.32, 0.5], [0.62, 0.34], [0.85, 0.55], [0.95, 0.22], [1.4, 0.0], [0.95, -0.22], [0.85, -0.55], [0.62, -0.34], [0.32, -0.5], [0.35, -0.3], [0, -0.18]];
export const Muzzle: React.FC<{ position: [number, number, number]; rotZ?: number; yaw?: number; size?: number; k: number }> = ({ position, rotZ = 0, yaw = 0, size = 1, k }) => {
  if (k < 0 || k > 3) return null;
  const a = extrude("muz_a", FLASH, 0.1, 0.02);
  const b = extrude("muz_b", FLASH.map(([x, y]) => [x * 0.68, y * 0.62] as [number, number]), 0.1, 0.02);
  const c = extrude("muz_c", FLASH.map(([x, y]) => [x * 0.34, y * 0.34] as [number, number]), 0.1, 0.02);
  const s = size * (k < 2 ? 1 : 0.7);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, rotZ]} scale={s}>
        <Part flat geo={a.geo} hull={a.hull} color="#ff7a1a" px={4} />
        <Part flat geo={b.geo} hull={b.hull} color="#ffd23a" px={0} position={[0, 0, 0.08]} />
        <Part flat geo={c.geo} hull={c.hull} color="#fffbe0" px={0} position={[0, 0, 0.16]} />
      </group>
    </group>
  );
};

/** Взрыв: звезда-огненный шар, клубы дыма, обломки. k - кадры с момента взрыва (30 fps), на двойках */
export const Blast: React.FC<{ at: [number, number, number]; k: number; seed?: number; big?: number; yaw?: number }> = ({ at, k, seed = 3, big = 1, yaw = 0 }) => {
  if (k < 0 || k > 90) return null;
  const kh = Math.floor(k / 2) * 2;
  const [x, y, z] = at;
  const out: React.ReactNode[] = [];
  if (kh < 14) {
    const sz = (0.5 + Math.min(kh, 8) * 0.2) * big;
    out.push(
      <group key="s" position={[x, y, z + 0.6]} rotation={[0, yaw, 0]}>
        <Star position={[0, 0, 0]} size={sz} rot={seed * 0.7 + kh * 0.12} seed={seed} n={10} />
      </group>,
    );
  }
  if (kh >= 2) {
    const smoke = ["#2e2c3a", "#46445a", "#5e5c74", "#7b7993"];
    [-1.2, -0.4, 0.4, 1.2].forEach((j, i) => {
      const a = kh - 2;
      const rr = (0.5 + Math.min(a, 20) * 0.045) * big;
      out.push(<Puff key={`p${i}`} position={[x + j * 0.7 * big + a * 0.014 * j, y + 0.3 + a * 0.05 * big + Math.abs(j) * 0.1, z + 0.2 + i * 0.03]} r={rr} color={smoke[Math.min(3, i + (a > 20 ? 1 : 0))]} />);
    });
  }
  if (kh >= 4) {
    out.push(<Flame key="f1" position={[x - 0.5 * big, y - 0.5 * big, z + 0.5]} scale={0.8 * big} frame={kh} />);
    out.push(<Flame key="f2" position={[x + 0.6 * big, y - 0.6 * big, z + 0.6]} scale={0.6 * big} frame={kh + 3} />);
  }
  if (kh < 28) {
    for (let i = 0; i < 9; i++) {
      const a = hash(i, seed) * Math.PI * 2;
      const sp = (0.3 + hash(i + 9, seed) * 0.4) * big;
      out.push(
        <Chunk key={`c${i}`} position={[x + Math.cos(a) * sp * kh * 0.9, y + Math.abs(Math.sin(a)) * sp * kh * 0.9 - kh * kh * 0.006, z + 0.5]} rot={[kh * 0.4 + i, kh * 0.3, i]} s={(0.14 + hash(i, seed + 4) * 0.1) * big} color={i % 3 === 0 ? "#2e2c3a" : i % 3 === 1 ? "#d9c9a8" : "#ff8a1c"} />,
      );
    }
  }
  return <>{out}</>;
};

/** Осколки стекла: треугольники разлетаются, k - кадры */
const triG = () => extrude("shard", [[0, 0.14], [-0.1, -0.08], [0.1, -0.06]], 0.03, 0.004);
export const Shards: React.FC<{ at: [number, number, number]; k: number; n?: number; spread?: number; dir?: number }> = ({ at, k, n = 14, spread = 1, dir = 1 }) => {
  if (k < 0 || k > 30) return null;
  const kh = Math.floor(k / 2) * 2;
  const g = triG();
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const a = hash(i, 5) * Math.PI * 2;
        const sp = (0.04 + hash(i, 9) * 0.07) * spread;
        return (
          <group key={i} position={[at[0] + Math.cos(a) * sp * kh * 3 * 0.5 + dir * kh * 0.03, at[1] + Math.sin(a) * sp * kh * 3 * 0.5 - kh * kh * 0.004, at[2] + 0.3 + (hash(i, 2) - 0.5) * 0.5]} rotation={[0, 0, kh * 0.5 + i]} scale={1 + hash(i, 7) * 0.9}>
            <Part flat geo={g.geo} hull={g.hull} color={i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#cbeeff" : "#8fd0f2"} px={2.4} />
          </group>
        );
      })}
    </>
  );
};

/** Искра «тук»: маленькая жёлтая 4-лучевая звезда и три чёрточки. k - кадры */
export const Tink: React.FC<{ position: [number, number, number]; k: number; yaw?: number; size?: number }> = ({ position, k, yaw = 0, size = 1 }) => {
  if (k < 0 || k > 8) return null;
  const e = extrude("tink", starPoly(4, 0.3, 0.09, 0), 0.06, 0.01);
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={size}>
      <Part flat geo={e.geo} hull={e.hull} color="#ffe04a" px={3} scale={k < 4 ? 1 : 0.75} />
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, 0, 0.9 + i * 0.7]}>
          <Flat geo={planeGeo} color="#fff6c8" position={[0, 0.5 + k * 0.025, 0.04]} scale={[0.035, 0.12, 1]} />
        </group>
      ))}
    </group>
  );
};

/** Плевок кофе: капли летят вниз и лужа. k - кадры */
export const Spit: React.FC<{ from: [number, number, number]; groundY: number; k: number }> = ({ from, groundY, k }) => {
  if (k < 0) return null;
  const kh = Math.floor(k / 2) * 2;
  const land = 10;
  return (
    <>
      {kh < land + 4 &&
        Array.from({ length: 6 }).map((_, i) => {
          const t = kh * (0.9 + hash(i, 4) * 0.4);
          const px = from[0] + (hash(i, 1) - 0.5) * 0.35 * t * 0.3;
          const py = Math.max(groundY + 0.02, from[1] - t * t * 0.0125 + 0.1 * Math.sin(t * 0.3));
          return (
            <group key={i} position={[px, py, from[2] + 0.1 + i * 0.01]}>
              <mesh geometry={sphereGeo(8)} material={flatMat(INK)} scale={0.17} />
              <mesh geometry={sphereGeo(8)} material={flatMat(i % 2 ? "#6b4326" : "#8a5a34")} position={[0, 0, 0.02]} scale={0.125} />
            </group>
          );
        })}
      {kh >= land && (
        <group position={[from[0], groundY + 0.025, from[2] + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={circleGeo} material={flatMat(INK)} scale={[1.0, 0.55, 1]} renderOrder={2} />
          <mesh geometry={circleGeo} material={flatMat("#6b4326")} position={[0, 0, 0.002]} scale={[0.92, 0.5, 1]} renderOrder={3} />
          <mesh geometry={circleGeo} material={flatMat("#8a5a34")} position={[0.06, 0.03, 0.004]} scale={[0.4, 0.2, 1]} renderOrder={4} />
        </group>
      )}
    </>
  );
};

/** Пороховой дым дульный: 3 клуба */
export const GunSmoke: React.FC<{ at: [number, number, number]; k: number; dir?: number }> = ({ at, k, dir = 1 }) => {
  if (k < 0 || k > 24) return null;
  const kh = Math.floor(k / 2) * 2;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Puff key={i} position={[at[0] + dir * (0.2 + kh * 0.05 * (i + 1)), at[1] + 0.1 + kh * 0.03 * (i + 0.5), at[2] + 0.1]} r={0.14 + kh * 0.012 + i * 0.05} color={i === 0 ? "#e6e6f0" : "#b8b6cc"} />
      ))}
    </>
  );
};

/** Линии скорости/удара: пучок белых полос вокруг точки (плоские) */
export const ImpactLines: React.FC<{ at: [number, number, number]; k: number; r?: number; n?: number; yaw?: number; color?: string }> = ({ at, k, r = 0.8, n = 10, yaw = 0, color = "#ffffff" }) => {
  if (k < 0 || k > 6) return null;
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} rotation={[0, 0, (i / n) * Math.PI * 2 + 0.2]}>
          <Flat geo={planeGeo} color={color} position={[0, r * (1 + k * 0.12), 0]} scale={[0.05, r * 0.5, 1]} />
        </group>
      ))}
    </group>
  );
};
void rbox;
