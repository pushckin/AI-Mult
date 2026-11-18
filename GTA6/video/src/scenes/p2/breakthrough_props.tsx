// Реквизит сцены p2/breakthrough: овцы, танки, плазмы, консоли, тройники, холодильник, ИВЛ, студийная камера и т.п.
import React, { useMemo } from "react";
import * as THREE from "three";
import { geo, paper, glow, Pt, rng } from "../../kit/paper";
import { Piece } from "../../kit/Character";
import { CanvasPlane } from "../../kit/Stage";

type V3 = [number, number, number];

// ---------- овца ----------
export const Sheep: React.FC<{ position?: V3; rot?: number; scale?: number; dead?: boolean; legPhase?: number; flip?: boolean }> = ({ position, rot = 0, scale = 1, dead, legPhase = 0, flip }) => (
  <group position={position} rotation={[0, 0, rot]} scale={[flip ? -scale : scale, scale, scale]}>
    {[-0.22, 0.22].map((x, i) => (
      <Piece key={"l" + i} g={geo.rrect(0.07, 0.3, 0.03, 0.03)} c="#1b1b1b" p={[x, 0.15, -0.02]} r={Math.sin(legPhase + i * 3) * 0.4} />
    ))}
    {[[0, 0.42, 0.36], [-0.25, 0.45, 0.22], [0.25, 0.47, 0.22], [-0.12, 0.6, 0.2], [0.12, 0.62, 0.2], [0, 0.32, 0.25]].map(([x, y, r], i) => (
      <Piece key={"w" + i} g={geo.ellipse(r, r * 0.85, 0.03)} c="#f4f1ea" p={[x, y, 0.01 * i]} />
    ))}
    <group position={[0.42, 0.55, 0.08]}>
      <Piece g={geo.ellipse(0.15, 0.19, 0.03)} c="#222" />
      <Piece g={geo.ellipse(0.09, 0.05, 0.02)} c="#222" p={[-0.12, 0.13, -0.01]} r={0.6} />
      {dead ? (
        <>
          <Piece g={geo.rrect(0.08, 0.02, 0.01, 0.015)} c="#fff" p={[0.04, 0.05, 0.03]} r={0.78} />
          <Piece g={geo.rrect(0.08, 0.02, 0.01, 0.015)} c="#fff" p={[0.04, 0.05, 0.03]} r={-0.78} />
        </>
      ) : (
        <>
          <Piece g={geo.ellipse(0.05, 0.055, 0.015)} c="#fff" p={[0.04, 0.05, 0.03]} />
          <Piece g={geo.ellipse(0.02, 0.02, 0.015)} c="#111" p={[0.05, 0.05, 0.04]} />
        </>
      )}
      <Piece g={geo.ellipse(0.05, 0.035, 0.015)} c="#7a2a2a" p={[0.05, -0.1, 0.03]} />
    </group>
  </group>
);

// ---------- бумажный танк (профиль) ----------
export const Tank: React.FC<{ position?: V3; rot?: number; scale?: number; crush?: number; flip?: boolean; turretRot?: number }> = ({ position, rot = 0, scale = 1, crush = 0, flip, turretRot = 0 }) => {
  const sy = 1 - crush * 0.75;
  return (
    <group position={position} rotation={[0, 0, rot]} scale={[(flip ? -1 : 1) * scale * (1 + crush * 0.25), scale * sy, scale]}>
      <Piece g={geo.rrect(2.5, 0.55, 0.27, 0.05)} c="#2f3326" p={[0, 0.3, 0]} />
      {[-0.95, -0.48, 0, 0.48, 0.95].map((x, i) => (
        <group key={i} position={[x, 0.3, 0.04]}>
          <Piece g={geo.ellipse(0.2, 0.2, 0.03)} c="#555b47" />
          <Piece g={geo.ellipse(0.07, 0.07, 0.03)} c="#2b2e22" p={[0, 0, 0.02]} />
        </group>
      ))}
      <Piece g={geo.poly("hull", [[-1.3, 0], [1.3, 0], [1.05, 0.42], [-1.15, 0.42]], 0.05, 0.05)} c="#5d6b3a" p={[0, 0.5, 0.02]} />
      <group position={[0.05, 0.92, 0]} rotation={[0, 0, turretRot]}>
        <Piece g={geo.rrect(2.0, 0.14, 0.06, 0.04)} c="#4b5630" p={[1.1, 0.16, -0.01]} />
        <Piece g={geo.arc(0.62, 0.42, 0, Math.PI, 0.05)} c="#6a7843" p={[0, 0, 0.03]} />
        <Piece g={geo.ellipse(0.12, 0.12, 0.03)} c="#e8c547" p={[-0.2, 0.18, 0.06]} />
      </group>
      {[[-0.6, 0.66], [0.4, 0.62], [0.9, 0.7]].map(([x, y], i) => <Piece key={"s" + i} g={geo.ellipse(0.13, 0.08, 0.02)} c="#45502b" p={[x, y, 0.06]} />)}
    </group>
  );
};

// ---------- плазма ----------
export const Plasma: React.FC<{ w?: number; h?: number; screen?: string; position?: V3; rotation?: V3; on?: boolean; screenNode?: React.ReactNode }> = ({ w = 1.2, h = 0.72, screen = "#24344f", position, rotation, on, screenNode }) => (
  <group position={position} rotation={rotation}>
    <Piece g={geo.rrect(w, h, 0.03, 0.05)} c="#111" />
    {screenNode ?? <mesh position={[0, 0.0, 0.045]} material={on ? glow(screen) : paper(screen)}><planeGeometry args={[w - 0.08, h - 0.08]} /></mesh>}
    <mesh position={[-w * 0.18, h * 0.12, 0.048]} rotation={[0, 0, -0.6]} material={glow("#ffffff", 0.12)}><planeGeometry args={[w * 0.05, h * 0.9]} /></mesh>
  </group>
);

// ---------- консоли/техника на спине (для back у Character) ----------
export const BackGear: React.FC<{ kind: number }> = ({ kind }) => {
  const k = kind % 5;
  const tape = <Piece g={geo.rrect(1.0, 0.09, 0.02, 0.02)} c="#c8a85a" p={[0, -0.05, 0.05]} r={0.06} />;
  if (k === 0) return ( // PS-подобная белая
    <group position={[0.1, 0.1, 0]} rotation={[0, 0, -0.12]}>
      <Piece g={geo.poly("ps", [[-0.2, -0.35], [0.2, -0.35], [0.26, 0.4], [-0.16, 0.42]], 0.04, 0.05)} c="#f2f2f2" />
      <Piece g={geo.rrect(0.1, 0.72, 0.03, 0.05)} c="#151515" p={[0.03, 0.03, 0.01]} />
      {tape}
    </group>
  );
  if (k === 1) return ( // чёрный куб
    <group position={[-0.05, 0.05, 0]} rotation={[0, 0, 0.08]}>
      <Piece g={geo.rrect(0.62, 0.62, 0.05, 0.05)} c="#1c1c1c" />
      <Piece g={geo.ellipse(0.06, 0.06, 0.02)} c="#3cb043" m={glow("#3cff6a")} p={[0.18, 0.18, 0.04]} />
      {tape}
    </group>
  );
  if (k === 2) return ( // телевизор
    <group position={[0, 0.12, 0]} rotation={[0, 0, 0.05]}>
      <Plasma w={1.25} h={0.75} screen="#33415e" />
      {tape}
    </group>
  );
  if (k === 3) return ( // системник с подсветкой
    <group position={[0.05, 0.1, 0]} rotation={[0, 0, -0.06]}>
      <Piece g={geo.rrect(0.5, 0.8, 0.04, 0.05)} c="#2a2a2a" />
      <Piece g={geo.rrect(0.04, 0.68, 0.02, 0.02)} c="#ff2fd0" m={glow("#ff3ad6")} p={[-0.18, 0, 0.04]} />
      <Piece g={geo.rrect(0.04, 0.68, 0.02, 0.02)} c="#00e5ff" m={glow("#22eaff")} p={[0.18, 0, 0.04]} />
      {tape}
    </group>
  );
  return ( // моток удлинителя + роутер
    <group position={[0, 0.05, 0]}>
      <Piece g={geo.ellipse(0.36, 0.36, 0.05)} c="#e67e22" />
      <Piece g={geo.ellipse(0.18, 0.18, 0.05)} c="#a04f0d" p={[0, 0, 0.02]} />
      <Piece g={geo.rrect(0.5, 0.14, 0.03, 0.04)} c="#f4f4f4" p={[0, 0.42, 0.03]} />
      {[-0.18, 0.18].map((x, i) => <Piece key={i} g={geo.rrect(0.03, 0.26, 0.01, 0.02)} c="#ddd" p={[x, 0.58, 0.02]} />)}
      {tape}
    </group>
  );
};

// ---------- тройник/удлинитель ----------
export const PowerStrip: React.FC<{ position?: V3; rot?: number; n?: number; scale?: number; color?: string; used?: number }> = ({ position, rot = 0, n = 3, scale = 1, color = "#f5f5f0", used = 0 }) => {
  const w = 0.32 * n + 0.15;
  return (
    <group position={position} rotation={[0, 0, rot]} scale={scale}>
      <Piece g={geo.rrect(w, 0.38, 0.1, 0.08)} c={color} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + 0.24 + i * 0.32;
        return (
          <group key={i} position={[x, 0, 0.05]}>
            <Piece g={geo.ellipse(0.12, 0.12, 0.02)} c="#d8d8d0" />
            {i < used ? <Piece g={geo.rrect(0.2, 0.2, 0.05, 0.05)} c="#222" p={[0, 0, 0.03]} /> : [-0.04, 0.04].map((dx, j) => <Piece key={j} g={geo.ellipse(0.018, 0.018, 0.01)} c="#222" p={[dx, 0, 0.015]} />)}
          </group>
        );
      })}
      <Piece g={geo.ellipse(0.05, 0.05, 0.02)} c="#e53935" m={glow("#ff3b30")} p={[w / 2 - 0.08, 0.12, 0.05]} />
    </group>
  );
};

/** Вилка (корпус + 2 штыря), штыри смотрят вверх по +Y */
export const Plug: React.FC<{ position?: V3; rot?: number; scale?: number; color?: string }> = ({ position, rot = 0, scale = 1, color = "#f5f5f0" }) => (
  <group position={position} rotation={[0, 0, rot]} scale={scale}>
    <Piece g={geo.rrect(0.24, 0.26, 0.06, 0.06)} c={color} />
    {[-0.05, 0.05].map((x, i) => <Piece key={i} g={geo.rrect(0.035, 0.14, 0.01, 0.03)} c="#c9c9c9" p={[x, 0.19, 0]} />)}
  </group>
);

/** Кабель-трубка по точкам (кэш по ключу) */
export const Cable: React.FC<{ pts: V3[]; r?: number; color?: string; k?: string; glowing?: boolean }> = ({ pts, r = 0.025, color = "#1a1a1a", glowing }) => {
  const key = pts.map((p) => p.map((v) => v.toFixed(3)).join(",")).join(";") + r;
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 32, r, 6, false), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} material={glowing ? glow(color) : paper(color, { grain: false })} />;
};

/** Розетка на стене */
export const Socket: React.FC<{ position?: V3; scale?: number; plugged?: boolean }> = ({ position, scale = 1, plugged }) => (
  <group position={position} scale={scale}>
    <Piece g={geo.rrect(0.3, 0.3, 0.05, 0.03)} c="#f1efe6" />
    <Piece g={geo.ellipse(0.1, 0.1, 0.02)} c="#dedbd0" p={[0, 0, 0.02]} />
    {plugged ? <Piece g={geo.rrect(0.16, 0.16, 0.04, 0.05)} c="#eeeeee" p={[0, 0, 0.05]} /> : [-0.035, 0.035].map((x, i) => <Piece key={i} g={geo.ellipse(0.016, 0.016, 0.01)} c="#222" p={[x, 0, 0.035]} />)}
  </group>
);

// ---------- холодильник ----------
export const Fridge: React.FC<{ position?: V3; on: boolean; open?: number }> = ({ position, on }) => (
  <group position={position}>
    <Piece g={geo.rrect(1.0, 2.0, 0.12, 0.08)} c="#e9eef2" p={[0, 1.0, 0]} />
    <Piece g={geo.rrect(0.96, 0.025, 0.01, 0.02)} c="#a8b2ba" p={[0, 1.3, 0.05]} />
    <Piece g={geo.rrect(0.05, 0.4, 0.02, 0.03)} c="#9aa4ac" p={[-0.38, 1.6, 0.06]} />
    <Piece g={geo.rrect(0.05, 0.5, 0.02, 0.03)} c="#9aa4ac" p={[-0.38, 0.95, 0.06]} />
    <group position={[0.15, 1.62, 0.06]}>
      <Piece g={geo.rrect(0.36, 0.2, 0.03, 0.02)} c="#26323a" />
      {on ? <mesh position={[0, 0, 0.015]} material={glow("#53e0ff")}><planeGeometry args={[0.3, 0.14]} /></mesh> : null}
      {on && <mesh position={[0, 0, 0.02]} material={glow("#0b3d4a")}><planeGeometry args={[0.16, 0.04]} /></mesh>}
    </group>
    {/* магнитики и рисунок ребёнка */}
    <Piece g={geo.rrect(0.32, 0.4, 0.01, 0.015)} c="#fffdf0" p={[0.12, 0.95, 0.055]} r={0.08} />
    <Piece g={geo.ellipse(0.06, 0.06, 0.015)} c="#f1c40f" p={[0.08, 1.0, 0.065]} />
    <Piece g={geo.rrect(0.15, 0.03, 0.01, 0.015)} c="#27ae60" p={[0.15, 0.85, 0.065]} r={0.08} />
    <Piece g={geo.ellipse(0.04, 0.04, 0.015)} c="#e74c3c" p={[0.12, 1.16, 0.07]} />
    <Piece g={geo.ellipse(0.05, 0.05, 0.015)} c="#3498db" p={[-0.2, 1.75, 0.07]} />
  </group>
);

// ---------- аппарат ИВЛ ----------
export function drawVentScreen(g: CanvasRenderingContext2D, W: number, H: number, phase: number, alive: boolean) {
  g.fillStyle = "#06140c"; g.fillRect(0, 0, W, H);
  g.strokeStyle = alive ? "#39ff7a" : "#ff3b30"; g.lineWidth = 5; g.lineJoin = "round";
  g.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const u = x / W * 3 + phase;
    const f = u - Math.floor(u);
    const y = alive ? (f < 0.12 ? -Math.sin(f / 0.12 * Math.PI) * 0.35 : f > 0.4 && f < 0.6 ? Math.sin((f - 0.4) / 0.2 * Math.PI) * 0.12 : 0) : 0;
    const py = H * 0.55 + y * H;
    if (x === 0) g.moveTo(x, py); else g.lineTo(x, py);
  }
  g.stroke();
  g.fillStyle = alive ? "#39ff7a" : "#ff3b30";
  g.font = `900 ${Math.floor(H * 0.2)}px sans-serif`; g.textAlign = "left"; g.textBaseline = "top";
  g.fillText(alive ? "♥ 72" : "♥ ---", 10, 8);
}
export const Ventilator: React.FC<{ position?: V3; t: number; alive: boolean; screenOn: boolean; bellows?: number }> = ({ position, t, alive, screenOn }) => {
  const ph = Math.floor(t * 12) / 12;
  const breathe = alive ? 0.5 + 0.5 * Math.sin(ph * 4) : 0.05;
  const frameKey = alive ? Math.floor(t * 12) % 24 : 0;
  return (
    <group position={position}>
      {/* стойка на колёсиках */}
      <Piece g={geo.rrect(0.08, 0.7, 0.03, 0.04)} c="#9aa0a6" p={[0, 0.38, -0.05]} />
      <Piece g={geo.rrect(0.7, 0.06, 0.03, 0.04)} c="#9aa0a6" p={[0, 0.07, -0.05]} />
      {[-0.3, 0.3].map((x, i) => <Piece key={i} g={geo.ellipse(0.06, 0.06, 0.03)} c="#333" p={[x, 0.05, 0]} />)}
      <Piece g={geo.rrect(0.85, 0.8, 0.08, 0.1)} c="#dfe6ea" p={[0, 1.1, 0]} />
      <Piece g={geo.rrect(0.85, 0.12, 0.05, 0.1)} c="#2e86c1" p={[0, 1.45, 0.01]} />
      <group position={[-0.1, 1.1, 0.06]}>
        <Piece g={geo.rrect(0.5, 0.36, 0.03, 0.02)} c="#222" />
        {screenOn
          ? <CanvasPlane texKey={`vent_${alive ? 1 : 0}_${frameKey}`} w={0.44} h={0.3} px={256} position={[0, 0, 0.015]} draw={(g, W, H) => drawVentScreen(g, W, H, frameKey / 24 * 3, alive)} />
          : <mesh position={[0, 0, 0.015]} material={paper("#151a18")}><planeGeometry args={[0.44, 0.3]} /></mesh>}
      </group>
      {[0, 1, 2].map((i) => <Piece key={i} g={geo.ellipse(0.04, 0.04, 0.02)} c={["#e74c3c", "#f1c40f", "#27ae60"][i]} p={[0.3, 1.25 - i * 0.12, 0.07]} />)}
      {/* меха-гармошка */}
      <group position={[0, 0.78, 0.07]}>
        <Piece g={geo.rrect(0.3, 0.1 + breathe * 0.1, 0.03, 0.03)} c="#7fb3d5" p={[0, -(0.05 + breathe * 0.05), 0]} />
      </group>
    </group>
  );
};

/** Маска ИВЛ на лицо (в системе координат персонажа) */
export const VentMask: React.FC<{ off?: number }> = ({ off = 0 }) => (
  <group position={[0.0 + off * 0.25, 0.95 - off * 0.2, 0.2]} rotation={[0, 0, off * 0.8]}>
    <Piece g={geo.ellipse(0.16, 0.13, 0.03)} c="#bfe6f5" m={paper("#bfe6f5", { opacity: 0.85 })} />
    <Piece g={geo.ellipse(0.07, 0.06, 0.03)} c="#7fb3d5" p={[0, -0.06, 0.02]} />
    <Piece g={geo.rrect(0.9, 0.03, 0.01, 0.015)} c="#6d8fa3" p={[0, 0.04, -0.02]} />
  </group>
);

// ---------- осколки стекла ----------
const TRIS: Pt[][] = [
  [[0, 1], [0.7, -0.6], [-0.5, -0.4]], [[0, 1.2], [0.4, -0.5], [-0.3, -0.7]], [[-0.6, 0.8], [0.8, 0.2], [-0.1, -0.9]],
  [[0, 0.9], [0.9, -0.2], [0.1, -0.8], [-0.6, -0.2]], [[-0.3, 1], [0.5, 0.6], [0.2, -1], [-0.4, -0.3]],
];
export const Shards: React.FC<{ t: number; t0: number; origin: V3; n?: number; seed?: number; spread?: number; dir?: V3 }> = ({ t, t0, origin, n = 22, seed = 3, spread = 2.4, dir = [0, 0.6, 2.2] }) => {
  if (t < t0) return null;
  const r = rng(seed);
  const dt = t - t0;
  const els: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const vx = (r() - 0.5) * spread + dir[0], vy = r() * 2.2 + dir[1], vz = r() * dir[2] + 0.3;
    const sz = 0.05 + r() * 0.13;
    const spin = (r() - 0.5) * 18;
    const oy = (r() - 0.5) * 1.2, ox = (r() - 0.5) * 0.8;
    const x = origin[0] + ox + vx * dt, y = Math.max(0.02, origin[1] + oy + vy * dt - 4.9 * dt * dt), z = origin[2] + vz * dt;
    els.push(<mesh key={i} position={[x, y, z]} rotation={[spin * dt * 0.3, spin * dt * 0.5, spin * dt]} geometry={geo.poly("shard" + (i % 5), TRIS[i % 5], 0, 0.01)} scale={[sz, sz, 1]} material={glow(i % 3 ? "#cdeefe" : "#ffffff", 0.9)} />);
  }
  return <>{els}</>;
};

/** Искры */
export const Sparks: React.FC<{ t: number; t0: number; origin: V3; n?: number; seed?: number; dur?: number; scale?: number }> = ({ t, t0, origin, n = 14, seed = 9, dur = 0.5, scale = 1 }) => {
  const dt = t - t0;
  if (dt < 0 || dt > dur) return null;
  const r = rng(seed);
  const k = 1 - dt / dur;
  return (
    <group position={origin} scale={scale}>
      {Array.from({ length: n }, (_, i) => {
        const a = r() * Math.PI * 2, sp = 0.6 + r() * 1.6;
        const len = 0.12 + r() * 0.2;
        const x = Math.cos(a) * sp * dt, y = Math.sin(a) * sp * dt - 1.5 * dt * dt;
        return <mesh key={i} position={[x, y, 0.05]} rotation={[0, 0, a]} material={glow(i % 2 ? "#fff3a0" : "#ffb300")} scale={[k, 1, 1]}><planeGeometry args={[len, 0.03]} /></mesh>;
      })}
      <mesh material={glow("#fffbe0", 0.9 * k)}><circleGeometry args={[0.14 * k + 0.02, 12]} /></mesh>
    </group>
  );
};

// ---------- студийная ТВ-камера на штативе ----------
export const StudioCam: React.FC<{ position?: V3; tally: boolean; rot?: number }> = ({ position, tally, rot = 0 }) => (
  <group position={position} rotation={[0, rot, 0]}>
    {[-0.5, 0, 0.5].map((x, i) => <Piece key={i} g={geo.rrect(0.06, 1.4, 0.02, 0.04)} c="#2b2b2b" p={[x * 0.9, 0.62, -0.02]} r={x * 0.5} />)}
    <Piece g={geo.rrect(0.16, 0.5, 0.03, 0.05)} c="#3a3a3a" p={[0, 1.4, 0]} />
    <Piece g={geo.rrect(1.2, 0.62, 0.08, 0.08)} c="#4a4f57" p={[0, 1.9, 0]} />
    <Piece g={geo.rrect(0.5, 0.42, 0.06, 0.08)} c="#2d3036" p={[-0.62, 1.92, 0.02]} />
    <Piece g={geo.rrect(0.58, 0.32, 0.03, 0.06)} c="#1b1d22" p={[0.95, 1.92, 0.02]} />
    <Piece g={geo.ellipse(0.15, 0.15, 0.04)} c="#111" p={[1.25, 1.92, 0.04]} />
    <Piece g={geo.rrect(0.35, 0.14, 0.03, 0.05)} c="#c0392b" p={[0.2, 2.28, 0]} />
    <mesh position={[0.2, 2.28, 0.06]} material={tally ? glow("#ff2a2a") : paper("#5a1f1f")}><circleGeometry args={[0.06, 16]} /></mesh>
    <Piece g={geo.rrect(0.6, 0.14, 0.03, 0.04)} c="#888" p={[0, 1.55, 0.04]} />
  </group>
);

/** Падающие кадры «на двойках»: позиция по параболе */
export function ballistic(t: number, t0: number, p0: V3, v: V3, g = 9.8): V3 {
  const dt = Math.max(0, t - t0);
  return [p0[0] + v[0] * dt, p0[1] + v[1] * dt - 0.5 * g * dt * dt, p0[2] + v[2] * dt];
}
