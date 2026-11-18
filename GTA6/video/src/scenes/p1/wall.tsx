// Часть 1, сцена 2 «Великая Новозеландская стена»: p1_wall → p1_cmd1 → p1_shoot → p1_chant (до p1_grab).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { SceneDef } from "../types";
import { cue, prog, easeInOut, easeOut, easeIn, easeOutBack, shake, twos, hash, noise1, lerp, mouthFor, clamp01 } from "../../kit/anim";
import { Character } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Cam, PaperLights, Sheet, Puff } from "../../kit/Stage";
import { geo, paper, glow, rng } from "../../kit/paper";
import {
  PaperCrowd, CrowdMass, PM, cell, makeBeach, WallSeg, BarbedWire, Spark, Turret, Megaphone, Rifle, Tracer, Dust, Clouds, Hills, Box,
  WH, WT, SEG, AD, Body0, starG, Gear3D,
} from "./wall_kit";

const P = "p1" as const;
const Wc = () => cue(P, "p1_wall"), C1 = () => cue(P, "p1_cmd1"), S = () => cue(P, "p1_shoot"), CH = () => cue(P, "p1_chant"), G = () => cue(P, "p1_grab");
const SKY = "#9fd3f0";
type V3 = [number, number, number];

// ---------------- мир ----------------
const SEGS = Array.from({ length: 192 / SEG }, (_, i) => -96 + SEG * i + SEG / 2);
/** вырастание стены: волна слева направо */
const segStart = (x: number) => Wc().start + 0.35 + Math.min(1.0, Math.max(0, (x + 34) / 60) * 0.7);
const riseK = (x: number, t: number) => easeOutBack(prog(t, segStart(x), segStart(x) + 0.8));

const Ocean: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Sheet w={900} h={500} color="#2f8fc9" position={[0, -0.05, 46 + 250]} rotation={[-Math.PI / 2, 0, 0]} />
    {[0, 1, 2, 3].map((i) => {
      const ph = (twos(t, 8) * 0.5 + i * 0.25) % 1;
      return <Sheet key={i} w={300} h={0.5} color="#e9f6ff" position={[0, -0.02, 46.6 + ph * 7 + i * 0.01]} rotation={[-Math.PI / 2, 0, 0]} opacity={1 - ph} />;
    })}
    {/* тонущий паром и матрасы вдали */}
    <group position={[-30, 0, 150]} rotation={[0, 0, 0.18]}>
      <mesh geometry={geo.poly("ferry", [[-14, 0], [14, 0], [17, 5], [-16, 5]], 0.3, 0.6)} material={paper("#e8e4da")} position={[0, -1, 0]} />
      <mesh geometry={geo.rrect(18, 4, 0.3, 0.6)} material={paper("#c0392b")} position={[0, 5.5, 0]} />
    </group>
  </>
);

const Ground: React.FC = () => (
  <>
    <Sheet w={900} h={47} color="#e3cf9a" position={[0, 0, 23.5]} rotation={[-Math.PI / 2, 0, 0]} />
    <Sheet w={900} h={400} color="#6fae4f" position={[0, 0, -WT - 200]} rotation={[-Math.PI / 2, 0, 0]} />
  </>
);

export const WallLine: React.FC<{ t: number; x0?: number; x1?: number }> = ({ t, x0 = -96, x1 = 96 }) => {
  const segs = SEGS.filter((x) => x > x0 - SEG && x < x1 + SEG);
  const rise = (x: number) => -(1 - riseK(Math.floor((x + 96) / SEG) * SEG - 96 + SEG / 2, t)) * (WH + 3);
  return (
    <>
      {segs.map((x, i) => <WallSeg key={x} x={x} k={riseK(x, t)} seed={i + 3} />)}
      <BarbedWire x0={Math.max(-96, x0 - 4)} x1={Math.min(96, x1 + 4)} y={WH - 0.25} z={0.75} rise={rise} />
      {/* искры по проволоке */}
      {Array.from({ length: 14 }, (_, i) => {
        const tq = Math.floor(t * 12);
        if (hash(tq * 3 + i * 11) > 0.45) return null;
        const x = lerp(x0, x1, hash(i * 7.3 + tq * 0.13));
        if (riseK(x, t) < 0.98) return null;
        return <Spark key={i} p={[x, WH - 0.25 + (hash(tq + i) - 0.5) * 0.8, 1.35]} s={0.8 + hash(i + tq) * 0.7} c={i % 2 ? "#fff36b" : "#9ff3ff"} rot={tq} />;
      })}
    </>
  );
};

const TURRETS = [-60, -36, -12, 14, 38, 62];
const Turrets: React.FC<{ t: number; x0: number; x1: number; firing?: boolean }> = ({ t, x0, x1, firing }) => (
  <>
    {TURRETS.filter((x) => x > x0 - 4 && x < x1 + 4).map((x, i) => {
      const k = riseK(x, t);
      if (k < 0.3) return null;
      return <Turret key={x} p={[x, WH + 0.3 - (1 - k) * (WH + 3) + easeOutBack(prog(t, segStart(x) + 0.7, segStart(x) + 1.1)) * 0 , -2.4]} yaw={Math.sin(t * 1.3 + i) * 0.3} flash={firing && Math.floor(t * 15 + i) % 2 === 0} />;
    })}
  </>
);

// солдаты на стене
const SOLDIERS = Array.from({ length: 20 }, (_, i) => -40 + i * 4.2 + (hash(i) - 0.5) * 1.2).filter((x) => Math.abs(x - 1) > 1.8);
const Soldiers: React.FC<{ t: number; x0: number; x1: number; firing?: (i: number) => number; pop?: boolean; scared?: boolean }> = ({ t, x0, x1, firing, pop, scared }) => (
  <>
    {SOLDIERS.map((x, i) => {
      if (x < x0 || x > x1) return null;
      const k = riseK(x, t);
      const popK = pop ? easeOutBack(prog(t, segStart(x) + 0.75 + hash(i) * 0.4, segStart(x) + 1.05 + hash(i) * 0.4)) : 1;
      const y = WH + 0.3 - (1 - k) * (WH + 3) - (1 - popK) * 1.9;
      const f = firing ? firing(i) : 0;
      const fl = f > 0 && Math.floor(t * 15 + i * 0.7) % 2 === 0 ? 1 + hash(Math.floor(t * 15) + i) * 0.5 : 0;
      const kick = fl ? 0.06 : 0;
      return (
        <Character key={i} {...CAST.soldier} position={[x, y, -1.5]} eyes={scared ? "wide" : f > 0 ? "angry" : "normal"} mouth={f > 0 ? "teethGrit" : scared ? "scream" : "frown"} mouthOpen={0.6}
          armR={0.75 + kick} armL={0.9} bodyTilt={-kick} handR={<Rifle rot={-0.55} flash={fl} />} sweat={scared ? 1 : 0} />
      );
    })}
  </>
);

// ---------------- пляжная толпа ----------------
const BEACH = makeBeach(2300, -38, 38, 1.2, 45, 11);
const SWIM = makeBeach(260, -40, 40, 46.5, 60, 12);
const dies = (b: Body0) => b.z < 14 && b.die < 0.92 * (1 - (b.z - 1.2) / 14);
const deathT = (b: Body0) => S().start + 1.25 + (b.z - 1.2) * 0.16 + hash(b.ph * 97) * 0.8;
const adv = (t: number) => 4.0 * easeInOut(prog(t, S().start + 1.2, S().start + 6.4));

function beachState(t: number, opt: { chant?: boolean; armsAll?: boolean } = {}): PM[] {
  const out: PM[] = [];
  const tq = twos(t);
  const Ws = Wc().start;
  const shock = prog(t, Ws + 0.5, Ws + 1.0) * (1 - prog(t, Ws + 2.4, Ws + 3.2));
  for (const b of BEACH) {
    if (dies(b) && t >= deathT(b)) {
      const td = deathT(b), k = easeIn(prog(t, td, td + 0.22));
      const z = Math.max(0.9, b.z - adv(td)) + k * 0.6;
      out.push({ x: b.x, z, y: 0.02 + Math.round(b.ph * 100) % 9 * 0.012, ry: Math.PI, rx: -Math.PI / 2 * k, rz: (hash(b.ph) - 0.5) * 1.2 * k, s: b.s, front: cell(4, b.id), back: cell(4, b.id), shade: b.shade });
      continue;
    }
    const a = adv(t);
    const moving = a > 0.05 && a < 3.95;
    let y = Math.abs(Math.sin(tq * 9 + b.ph)) * (moving ? 0.35 : 0.08);
    let up = b.armsUp || opt.armsAll || (shock > 0.3 && hash(b.ph * 3) < 0.7);
    if (opt.chant) {
      const c = CH(); const ph = prog(t, c.start, c.end) * 9 - hash(b.ph) * 0.12; const f = ph - Math.floor(ph);
      if (t <= c.end + 0.05) { up = f < 0.7; y += Math.sin(Math.PI * Math.min(1, f / 0.7)) * 0.35; } else up = true;
    }
    out.push({ x: b.x + noise1(b.ph + t * 0.6) * 0.15, y, z: Math.max(0.9 + Math.round(b.ph * 100) % 8 * 0.06, b.z - a), ry: Math.PI, s: b.s, front: cell(up ? 1 : 0, b.id), back: cell(up ? 3 : 2, b.id), shade: b.shade });
  }
  for (const b of SWIM) {
    out.push({ x: b.x, y: -1.0 + Math.sin(t * 3 + b.ph) * 0.1, z: b.z, ry: Math.PI, rz: Math.sin(t * 2 + b.ph) * 0.15, s: b.s, front: cell(1, b.id), back: cell(3, b.id), shade: b.shade });
  }
  return out;
}

// ---------------- общий «пейзаж» ----------------
const World: React.FC<{ t: number; x0?: number; x1?: number; crowd?: PM[]; fog?: [number, number, string]; noSoldiers?: boolean; firing?: (i: number) => number; pop?: boolean; scared?: boolean; turretFire?: boolean }> = (p) => {
  const { t, x0 = -60, x1 = 60 } = p;
  return (
    <>
      <PaperLights intensity={1.05} dir={[6, 10, 12]} />
      <Ground />
      <Ocean t={t} />
      <CrowdMass x0={-260} x1={260} z0={1.0} z1={46} />
      <Hills z={-120} facing={1} spread={300} />
      <Clouds z={-260} y={60} spread={300} n={9} s={14} />
      <Clouds z={330} y={25} spread={400} n={9} s={16} seed={8} />
      <WallLine t={t} x0={x0} x1={x1} />
      <Turrets t={t} x0={x0} x1={x1} firing={p.turretFire} />
      {!p.noSoldiers && <Soldiers t={t} x0={x0} x1={x1} firing={p.firing} pop={p.pop} scared={p.scared} />}
      {p.crowd && <PaperCrowd members={p.crowd} fog={p.fog ?? [45, 120, "#2b2632"]} />}
    </>
  );
};

// ======================= ШОТЫ =======================
// A1: стена вырастает из земли (вид с океана, за спинами толпы)
function shotRise(t: number) {
  const W = Wc(), k = prog(t, W.start, W.start + 2.5);
  const [sx, sy] = shake(t, W.start + 0.55, 0.5, 1.6);
  const pos: V3 = [lerp(-5, 3, easeInOut(k)) + sx, lerp(2.6, 7.5, easeInOut(k)) + sy, lerp(57, 62, k)];
  const look: V3 = [lerp(-2, 2, k), lerp(6, 12, easeInOut(k)), 0];
  return (
    <>
      <Cam pos={pos} look={look} fov={58} roll={-0.03 + sx * 0.01} />
      <World t={t} x0={-34} x1={36} crowd={beachState(t)} fog={[70, 140, "#2b2632"]} noSoldiers />
      {SEGS.filter((x) => x > -34 && x < 36).map((x) => (
        <React.Fragment key={x}>
          <Dust p={[x, 0, 1.5]} k={prog(t, segStart(x), segStart(x) + 1.6)} s={4.5} />
        </React.Fragment>
      ))}
    </>
  );
}
// A2: облёт вдоль гребня стены
function shotFly(t: number) {
  const a = Wc().start + 2.5, b = C1().start - 0.1, k = prog(t, a, b);
  const pos: V3 = [lerp(-34, -20, k), WH + lerp(7, 5, k), lerp(16, 13, k)];
  const look: V3 = [lerp(-4, 8, k), WH - 6, -1];
  return (
    <>
      <Cam pos={pos} look={look} fov={50} roll={0.08 - k * 0.05} />
      <World t={t} x0={-45} x1={50} crowd={beachState(t)} fog={[30, 70, "#1e1a22"]} pop />
    </>
  );
}

// командир
const CMD_POS: V3 = [1, WH + 1.2, -2.0];
const Commander: React.FC<{ t: number; open: number; pos?: V3 }> = ({ t, open, pos = CMD_POS }) => {
  const tw = twos(t);
  return (
    <>
      <Box p={[pos[0], WH + 0.75, pos[2]]} s={[1.6, 0.9, 1.2]} c="#7a6a3a" />
      <Box p={[pos[0], WH + 0.75, pos[2] + 0.61]} s={[1.2, 0.3, 0.02]} c="#c9b25a" />
      <Character {...CAST.commander} position={pos} eyes="angry" mouth="scream" mouthOpen={open} armR={2.25} armL={0.5 + Math.sin(tw * 6) * 0.4}
        handR={<group position={[-0.12, 0.08, 0]}><Megaphone rot={-0.25} /></group>} bodyTilt={-0.05 + open * 0.06} headTilt={Math.sin(tw * 5) * 0.05} />
      {/* затылок под каской (виден со спины) */}
      <mesh geometry={geo.arc(0.6, 0.52, 0, Math.PI, 0.04)} material={paper("#4b5320")} position={[pos[0], pos[1] + 1.52, pos[2] - 0.07]} />
      <mesh geometry={geo.rrect(1.24, 0.09, 0.04, 0.04)} material={paper("#3d4419")} position={[pos[0], pos[1] + 1.53, pos[2] - 0.09]} />
    </>
  );
};
/** звуковые волны из мегафона */
const Waves: React.FC<{ t: number; o: V3; dir: V3; s?: number }> = ({ t, o, dir, s = 1 }) => (
  <>
    {[0, 1, 2].map((i) => {
      const f = (t * 1.8 + i / 3) % 1;
      return <mesh key={i} geometry={geo.arc(0.35 + f * 1.2, 0.5 + f * 1.8, -1.0, 1.0, 0.02)} material={glow("#ffffff", 0.85 * (1 - f))}
        position={[o[0] + dir[0] * f * 2.5 * s, o[1] + dir[1] * f * 2.5 * s, o[2] + dir[2] * f * 2.5 * s]} scale={s} />;
    })}
  </>
);

// B1: командир крупно (низкий ракурс)
function shotCmdFront(t: number, tight = false) {
  const c = C1();
  const m = mouthFor(P, ["p1_cmd1"], t);
  const k = prog(t, c.start - 0.1, c.end);
  const [sx, sy] = tight ? shake(t, cue(P, "p1_cmd1").end - 1.3, 0.12, 1.0) : [0, 0];
  const pos: V3 = tight ? [CMD_POS[0] + 0.35 + sx, CMD_POS[1] + 1.3 + sy, CMD_POS[2] + 3.4] : [CMD_POS[0] + 1.8 - k * 0.6, CMD_POS[1] + 0.1, CMD_POS[2] + 6.6 - k * 1.2];
  const look: V3 = tight ? [CMD_POS[0] + 0.3, CMD_POS[1] + 1.3, CMD_POS[2]] : [CMD_POS[0] + 0.3, CMD_POS[1] + 0.55, CMD_POS[2]];
  return (
    <>
      <Cam pos={pos} look={look} fov={tight ? 34 : 38} />
      <World t={t} x0={-24} x1={26} />
      <Commander t={t} open={m} />
      <Waves t={t} o={[CMD_POS[0] + 1.15, CMD_POS[1] + 1.05, CMD_POS[2] + 0.3]} dir={[0.8, -0.1, 0.4]} s={0.6} />
    </>
  );
}
// B2: толпа внизу задирает головы, сверху «падают» звуковые волны мегафона
function shotCmdBack(t: number) {
  const c = C1(), a = c.start + 4.6, k = prog(t, a, c.end - 1.3);
  const [sx, sy] = shake(t, a + 0.05, 0.1, 0.5);
  const waves: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const f = (t * 1.4 + i / 4) % 1;
    waves.push(<mesh key={i} geometry={geo.arc(2.5 + f * 5, 1.2 + f * 2.6, Math.PI * 1.05, Math.PI * 1.95, 0.05)} material={glow("#ffffff", 0.8 * (1 - f))}
      position={[0.3, 9.5 - f * 7, 4 + f * 6]} rotation={[-0.9, 0, 0]} />);
  }
  return (
    <>
      <Cam pos={[0.5 + sx, 7.6 - k * 0.8 + sy, 1.6 + k * 0.8]} look={[0, 0.8, 11]} fov={54 - k * 6} />
      <World t={t} x0={-24} x1={24} crowd={beachState(t, { armsAll: true })} fog={[30, 70, "#2b2632"]} />
    </>
  );
}

// C1: солдаты открывают огонь
function fireTracers(t: number, n: number, from: (i: number) => V3, to: (i: number, j: number) => V3, period = 0.11, dur = 0.32) {
  const els: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = Math.floor(t / period) - 4; j <= Math.floor(t / period); j++) {
      const t0 = j * period + hash(i * 3.1) * period;
      const k = (t - t0) / dur;
      if (k <= 0 || k >= 1) continue;
      els.push(<Tracer key={i + "_" + j} a={from(i)} b={to(i, j)} k={k} len={3} w={0.09} />);
    }
  }
  return els;
}
const FIRE_LINE = [-3.4, -1.1, 1.2, 3.5, 5.8];
function shotFire(t: number, aim = false) {
  const s = S(), k = aim ? prog(t, C1().start + 3.4, C1().start + 4.6) : prog(t, s.start, s.start + 1.3);
  const [sx, sy] = aim ? [0, 0] : shake(t, s.start + 0.05, 0.25, 1.5, 22);
  const vis = SOLDIERS.map((x, i) => [x, i] as const).filter(([x]) => x > -9 && x < 14);
  return (
    <>
      <Cam pos={[-1.5 + k * 1.2 + sx, WH - 0.6 + sy, 6.6 - k * 0.8]} look={[1.0, WH + 1.9, -0.4]} fov={50} />
      <World t={t} x0={-20} x1={30} crowd={beachState(t)} fog={[40, 100, "#2b2632"]} noSoldiers turretFire={!aim} />
      {FIRE_LINE.map((x, i) => {
        const fl = !aim && Math.floor(t * 15 + i * 0.7) % 2 === 0 ? 1.2 + hash(Math.floor(t * 15) + i) * 0.6 : 0;
        return <Character key={i} {...CAST.soldier} position={[x, WH + 1.12, -0.4]} eyes="angry" mouth="teethGrit" armR={0.75 + (fl ? 0.08 : 0)} armL={0.95} bodyTilt={fl ? -0.05 : 0}
          handR={<Rifle rot={-0.75} flash={fl} />} />;
      })}
      {!aim && fireTracers(t, FIRE_LINE.length, (i) => [FIRE_LINE[i] + 1.0, WH + 1.6, 0.0], (i, j) => [FIRE_LINE[i] + (hash(j * 1.7 + i) - 0.2) * 10, 0, 6 + hash(j * 3.3 + i) * 14])}
    </>
  );
}

// C2: вид со стены вниз — передние ряды падают, задние бегут по трупам
function shotMow(t: number) {
  const s = S(), a = s.start + 1.3, k = prog(t, a, a + 0.9);
  const [sx, sy] = shake(t, a, 0.12, 1.5, 18);
  const crowd = beachState(t);
  const hits: React.ReactNode[] = [];
  for (let j = Math.floor(t / 0.045) - 15; j <= Math.floor(t / 0.045); j++) {
    const t0 = j * 0.045, kk = (t - t0) / 0.25;
    const tx = (hash(j * 1.3) - 0.5) * 9, tz = 2 + hash(j * 2.9) * 9;
    if (kk > 0 && kk < 1) hits.push(<Tracer key={"t" + j} a={[tx * 0.4 + (hash(j) - 0.5) * 6, WH + 1.5, -1]} b={[tx, 0.2, tz]} k={kk} len={4} w={0.1} />);
    const pk = (t - t0 - 0.25) / 0.4;
    if (pk > 0 && pk < 1) hits.push(<Puff key={"p" + j} position={[tx, 0.3 + pk * 0.5, tz]} scale={0.25 + pk * 0.4} color="#e8dcc0" opacity={1 - pk} />);
  }
  return (
    <>
      <Cam pos={[0.5 + sx, 8.0 - k * 1.2 + sy, 1.6 + k * 0.6]} look={[0, 0.6, 11]} fov={52} />
      <World t={t} x0={-20} x1={20} crowd={crowd} fog={[25, 55, "#2b2632"]} noSoldiers />
      {hits}
    </>
  );
}

// C3: живая пирамида у стены + катапульты (сбоку)
const PYR_ROWS = 12;
const pyrStart = () => S().start + 3.6;
function pyramid(t: number): PM[] {
  const out: PM[] = [];
  const r = rng(77);
  for (let row = 0; row < PYR_ROWS; row++) {
    const n = PYR_ROWS - row; const t0 = pyrStart() + row * 0.09;
    const k = easeOutBack(prog(t, t0, t0 + 0.25));
    for (let i = 0; i < n; i++) {
      const id = Math.floor(r() * 12);
      if (k <= 0) continue;
      out.push({ x: -4 + (i - (n - 1) / 2) * 0.95 + (r() - 0.5) * 0.15, y: row * 1.45 - (1 - k) * 1.5, z: 0.75 + (PYR_ROWS - row) * 0.05, ry: Math.PI, rz: (r() - 0.5) * 0.2, s: 0.95, front: cell(1, id), back: cell(3, id) });
    }
  }
  // лезущий наверх
  const kc = prog(t, pyrStart() + 1.05, pyrStart() + 1.4);
  if (kc > 0) out.push({ x: -4, y: PYR_ROWS * 1.45 + kc * 5.5, z: 0.6, ry: Math.PI, rz: Math.sin(t * 20) * 0.2, front: cell(1, 3), back: cell(3, 3) });
  return out;
}
const CATS: { p: V3; ph: number }[] = [{ p: [9, 0, 11], ph: 0 }, { p: [3, 0, 19], ph: 0.27 }, { p: [16, 0, 24], ph: 0.55 }];
const CAT_PERIOD = 0.8, FLY = 1.5;
const catT0 = () => S().start + 2.3;
function flyers(t: number, x0 = -100): PM[] {
  const out: PM[] = [];
  CATS.forEach((c, ci) => {
    for (let j = 0; j < 12; j++) {
      const tl = catT0() + c.ph + j * CAT_PERIOD;
      const k = (t - tl) / FLY;
      if (k < 0 || k > 1) continue;
      const id = (ci * 5 + j) % 12;
      const a: V3 = [c.p[0] - 0.2, 3.4, c.p[2] - 1.6];
      const b: V3 = [c.p[0] - 6 - hash(j + ci) * 6, WH + 2, -9 - hash(j * 2 + ci) * 6];
      const y = lerp(a[1], b[1], k) + 4 * (WH + 6 - (a[1] + b[1]) / 2) * k * (1 - k) * 0.9;
      if (a[0] < x0) continue;
      out.push({ x: lerp(a[0], b[0], k), y, z: lerp(a[2], b[2], k), ry: Math.PI / 2 * 0.6, rz: k * 9 + j, front: cell(1, id), back: cell(3, id) });
    }
  });
  return out;
}
/** Катапульта: картон в плоскости YZ (бросает в −Z) */
const Catapult: React.FC<{ p: V3; t: number; ph: number; angle?: number }> = ({ p, t, ph, angle }) => {
  const lt = ((t - catT0() - ph) % CAT_PERIOD + CAT_PERIOD) % CAT_PERIOD;
  const ang = t < catT0() + ph ? 1.0 : lt < 0.12 ? lerp(1.0, -0.9, easeOut(lt / 0.12)) : lerp(-0.9, 1.0, easeInOut((lt - 0.12) / (CAT_PERIOD - 0.12)));
  return (
    <group position={p} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={geo.rrect(3.6, 0.5, 0.1, 0.25)} material={paper("#8a5a2b")} position={[0, 0.5, 0]} />
      {[-1.3, 1.3].map((x) => <mesh key={x} geometry={geo.ellipse(0.45, 0.45, 0.25)} material={paper("#3b2a1a")} position={[x, 0.45, 0.2]} />)}
      <mesh geometry={geo.poly("cat_frame", [[-0.6, 0], [0.6, 0], [0.15, 2.0], [-0.15, 2.0]], 0.05, 0.2)} material={paper("#9c6a35")} position={[0, 0.7, -0.1]} />
      <group position={[0, 2.5, 0.15]} rotation={[0, 0, angle ?? ang]}>
        <mesh geometry={geo.rrect(3.4, 0.22, 0.08, 0.15)} material={paper("#b07a40")} position={[-1.2, 0, 0]} />
        <mesh geometry={geo.arc(0.45, 0.35, Math.PI, Math.PI * 2, 0.2)} material={paper("#6b4423")} position={[-2.8, 0.25, 0]} />
      </group>
      {/* скотч и удлинитель вместо резинки */}
      <mesh geometry={geo.rrect(0.12, 1.6, 0.05, 0.1)} material={paper("#ff7f11")} position={[0.6, 1.4, 0.3]} rotation={[0, 0, 0.6]} />
      <mesh geometry={geo.rrect(1.6, 0.25, 0.05, 0.1)} material={paper("#d6b668")} position={[0, 1.3, 0.25]} rotation={[0, 0, 0.1]} />
    </group>
  );
};
function shotPyramid(t: number) {
  const s = S(), a = s.start + 4.1, k = prog(t, a, a + 0.9);
  const crowd = [...beachState(t), ...pyramid(t), ...flyers(t)];
  return (
    <>
      <Cam pos={[24 - k * 3, 7 + k * 2, 27 - k * 2]} look={[-1, 12 + k * 2, 0]} fov={56} />
      <World t={t} x0={-30} x1={40} crowd={crowd} fog={[40, 110, "#2b2632"]} firing={() => 1} />
      {CATS.map((c, i) => <Catapult key={i} p={c.p} t={t} ph={c.ph} />)}
      {fireTracers(t, 6, (i) => [-8 + i * 4.2, WH + 1.45, -1.0], (i, j) => [-6 + (hash(j + i) - 0.5) * 14, 0, 3 + hash(j * 3.3 + i) * 12], 0.09, 0.3)}
    </>
  );
}

// C4: тела на колючке, искры, прорыв наверх
const WIRE_BODIES = [
  { x: -2.9, look: { outfit: "hoodie" as const, color: "#c0392b", hat: "messyHair" as const, hairColor: "#2b1b10" }, rz: -1.45 },
  { x: -0.6, look: { outfit: "tshirt" as const, color: "#27ae60", hat: "cap" as const, hatColor: "#222" }, rz: 1.5 },
  { x: 1.7, look: { outfit: "tshirt" as const, color: "#8e44ad", hat: "beanie" as const, hatColor: "#f39c12" }, rz: -1.6 },
  { x: 3.9, look: { outfit: "hoodie" as const, color: "#2980b9", hat: "curly" as const, hairColor: "#111" }, rz: 1.42 },
];
const GearBack: React.FC<{ kind: number }> = ({ kind }) => <Gear3D kind={kind} />;
function shotWire(t: number) {
  const s = S(), a = s.start + 5.0, k = prog(t, a, CH().start);
  const els: React.ReactNode[] = [];
  WIRE_BODIES.forEach((w, i) => {
    const t0 = a + 0.05 + i * 0.28, kk = prog(t, t0, t0 + 0.4);
    if (kk <= 0) return;
    const e = easeOut(kk);
    const land = kk >= 1;
    const zap = land && Math.floor((t - t0) * 15) % 3 !== 0 && t - t0 < 1.3;
    const x = lerp(w.x + (i % 2 ? 2 : -2), w.x, e), y = lerp(WH - 7, WH - 0.2, e) + (land ? Math.sin((t - t0) * 30) * 0.03 : 0);
    els.push(
      <group key={i} position={[x - Math.sign(w.rz) * 0.95, y, lerp(3.5, 1.35 + i * 0.03, e)]} rotation={[0, 0, lerp(w.rz * 0.3 + (i % 2 ? 3 : -3), w.rz, e)]}>
        <Character {...w.look} adult skin={zap ? "#fffbe0" : "#f0c8a0"} eyes={land ? "dead" : "wide"} mouth={land ? "wavy" : "scream"} mouthOpen={1}
          armL={2.4} armR={2.0} legs="stand" back={<GearBack kind={i} />} shadow={false} blood={land ? 0.6 : 0} />
      </group>,
    );
    if (zap) els.push(<Spark key={"z" + i} p={[w.x + (hash(i + Math.floor(t * 15)) - 0.5) * 1.2, WH - 0.25, 1.9]} s={1.2 + hash(Math.floor(t * 15) + i) * 0.8} c={i % 2 ? "#9ff3ff" : "#fff36b"} rot={t * 9} />);
  });
  // прорвавшийся геймер лезет по телам
  const kc = prog(t, a + 0.9, a + 1.5);
  const tw = twos(t);
  return (
    <>
      <Cam pos={[0.6 - k * 0.3, WH + 0.9 + k * 0.3, 9.0 - k * 0.8]} look={[0.4, WH - 0.1, 0]} fov={44} />
      <World t={t} x0={-14} x1={16} scared />
      <PaperCrowd members={Array.from({ length: 16 }, (_, i) => {
        const h = hash(i * 5.7), yy = WH - 13 + (((t - a) * (1.6 + h) + h * 9) % 11.5);
        return { x: -6 + (i / 15) * 13 + (h - 0.5) * 0.6, y: yy, z: 0.3 + h * 0.2, ry: Math.PI, rz: Math.sin(t * 9 + i) * 0.12, front: cell(1, i), back: cell(3, i) } as PM;
      })} />
      {els}
      {kc > 0 && (
        <Character {...CAST.gamer} missingEar={false} blood={0.5} color="#d35400" position={[0.5 + kc * 0.4, WH - 3.5 + easeOutBack(kc) * 4.2, lerp(1.6, -0.4, prog(kc, 0.6, 1))]} eyes="crazy" mouth="grin" armL={2.7 + Math.sin(tw * 12) * 0.2} armR={2.5}
          back={<GearBack kind={1} />} shadow={false} />
      )}
    </>
  );
}

// D: «ЗА-ПУС-КАЙ!» — толпа качает кулаками, наезды на каждый слог
const FRONT_ROW = [
  { x: -1.75, z: 8.1, look: { outfit: "hoodie" as const, color: "#c0392b", hat: "messyHair" as const, hairColor: "#2b1b10", stubble: true }, gear: 0 },
  { x: -0.55, z: 8.35, look: { outfit: "tshirt" as const, color: "#f39c12", hat: "cap" as const, hatColor: "#2c3e50", mustache: true }, gear: 1 },
  { x: 0.65, z: 8.05, look: { outfit: "hoodie" as const, color: "#16a085", hat: "beanie" as const, hatColor: "#8e44ad" }, gear: 2 },
  { x: 1.85, z: 8.3, look: { outfit: "tshirt" as const, color: "#2980b9", hat: "curly" as const, hairColor: "#111", beard: true }, gear: 3 },
];
function chantCrowd(t: number): PM[] {
  const base = beachState(t, { chant: true });
  return base.filter((m) => !(Math.abs(m.x) < 4.5 && m.z < 9.8 && m.front < cell(4, 0)));
}
function shotChant(t: number) {
  const c = CH();
  const k = prog(t, c.start, c.end);
  const grp = Math.min(2, Math.floor(k * 3));
  const syl = Math.min(8, Math.floor(k * 9));
  const f = k * 9 - Math.floor(k * 9);
  const sylT = c.start + syl * (c.end - c.start) / 9;
  const punch = t <= c.end ? Math.exp(-(t - sylT) * 9) : 0;
  const [sx, sy] = shake(t, sylT, grp === 2 ? 0.06 : 0.25, 0.25);
  const gk = prog(t, c.start + grp * (c.end - c.start) / 3, c.start + (grp + 1) * (c.end - c.start) / 3);
  const cams: [V3, V3, number][] = [
    [[0, 10.5, 0.4], [0, 0.8, 15], 54],
    [[0.4, 3.2, 2.0], [0, 1.0, 12], 46],
    [[0.2, 2.0, 4.0], [0.05, 1.25, 8.5], 50],
    [[5, 11, 32], [0, 9, 4], 62],
    [[-7, 4.5, 2.5], [2, 1.2, 12], 50],
    [[-1.45, 2.0, 5.3], [-1.75, 0.85, 8.1], 46],
    [[0, 0.9, 5.2], [0, 3.6, 20], 62],
    [[0.2, 2.0, 4.9], [0.1, 1.1, 8.3], 46],
    [[0.62, 2.05, 6.0], [0.62, 1.1, 8.05], 44],
  ];
  const sylDur = (c.end - c.start) / 9;
  const perSyl = sylDur > 0.8;           // длинный хор: смена плана на каждый слог
  const ci = perSyl ? syl : grp;
  const lk = perSyl ? prog(t, sylT, sylT + sylDur) : gk;
  const [p0, l0, fov] = cams[ci];
  const pos: V3 = [p0[0] + sx, p0[1] + sy - lk * 0.15, p0[2] + lk * (ci === 3 ? -2 : 0.35)];
  const up = t > c.end || f < 0.7;
  const m = mouthFor(P, ["p1_chant"], t);
  return (
    <>
      <Cam pos={pos} look={l0} fov={fov - punch * 5} roll={((ci % 3) - 1) * 0.04} />
      <World t={t} x0={-24} x1={24} crowd={chantCrowd(t)} fog={ci === 3 ? [60, 130, "#2b2632"] : [30, 70, "#2b2632"]} scared />
      {FRONT_ROW.map((fr, i) => (
        <Character key={i} {...fr.look} adult position={[fr.x, up ? 0.25 + 0.15 * Math.sin(i + syl) : 0, fr.z]} rotationY={Math.PI} eyes={i % 2 ? "crazy" : "angry"} mouth="scream" mouthOpen={Math.max(0.5, m)}
          armL={up ? 2.75 + (i % 2) * 0.15 : 1.7} armR={up ? 2.6 : 1.5} bodyTilt={up ? (i % 2 ? 0.08 : -0.08) : 0} back={<GearBack kind={fr.gear} />} sweat={1} legs={up ? "run" : "stand"} legPhase={1 + i}
          front={<mesh geometry={geo.rrect(1.0, 0.12, 0.02, 0.02)} material={paper("#d9b866")} position={[0, 0.62, 0.09]} rotation={[0, 0, i % 2 ? 0.6 : -0.6]} />} />
      ))}
    </>
  );
}


// B2a: герой со спины (консоль на спине), снизу вверх на гигантскую стену с командиром
const HERO: V3 = [0.4, 0, 6.0];
function shotHero(t: number) {
  const a = C1().start + 2.0, k = prog(t, a, a + 1.4);
  const tw = twos(t);
  const crowd = beachState(t, { armsAll: true }).filter((m) => !(Math.abs(m.x - HERO[0]) < 1.6 && m.z > HERO[2] - 1.2));
  return (
    <>
      <Cam pos={[1.3 - k * 0.3, 1.1, 9.0 - k * 0.5]} look={[0.2, 5.5 + k * 1.5, 0]} fov={66} roll={-0.05} />
      <World t={t} x0={-24} x1={24} crowd={crowd} fog={[25, 60, "#2b2632"]} />
      <Commander t={t} open={mouthFor(P, ["p1_cmd1"], t)} />
      <Character {...{ outfit: "hoodie" as const, color: "#d35400", hat: "messyHair" as const, hairColor: "#2b1b10" }} adult position={HERO} rotationY={Math.PI}
        armL={2.5 + Math.sin(tw * 11) * 0.25} armR={2.7 - Math.sin(tw * 11) * 0.25} back={<Gear3D kind={0} />} legs="stand" />
    </>
  );
}

// C2b: на уровне земли — бегут прямо по телам
const TRAMPLE_BODIES = [
  { x: -1.3, z: 3.3, rz: 1.57, look: { outfit: "tshirt" as const, color: "#27ae60", hat: "cap" as const, hatColor: "#222" } },
  { x: 0.6, z: 3.6, rz: -1.57, look: { outfit: "hoodie" as const, color: "#8e44ad", hat: "curly" as const, hairColor: "#111" } },
  { x: 2.3, z: 3.2, rz: 1.5, look: { outfit: "tshirt" as const, color: "#f39c12", hat: "beanie" as const, hatColor: "#2c3e50" } },
];
const RUNNERS = [
  { x: -1.0, ph: 0, look: { outfit: "hoodie" as const, color: "#c0392b", hat: "messyHair" as const, hairColor: "#2b1b10" }, gear: 2 },
  { x: 0.9, ph: 0.3, look: { outfit: "tshirt" as const, color: "#2980b9", hat: "cap" as const, hatColor: "#e84393" }, gear: 0 },
  { x: 2.4, ph: 0.55, look: { outfit: "hoodie" as const, color: "#16a085", hat: "beanie" as const, hatColor: "#f1c40f" }, gear: 3 },
];
function shotTrample(t: number) {
  const a = S().start + 2.2, lt = t - a, k = prog(t, a, a + 0.9);
  const tw = twos(t);
  const crowd = beachState(t).filter((m) => !(Math.abs(m.x) < 4.5 && m.z > 1.5 && m.z < 11));
  return (
    <>
      <Cam pos={[0.6, 1.5, 10.5 - k * 0.6]} look={[0.4, 1.1, 2]} fov={50} />
      <World t={t} x0={-20} x1={20} crowd={crowd} fog={[25, 70, "#2b2632"]} />
      {TRAMPLE_BODIES.map((b, i) => (
        <group key={i} position={[b.x, 0.5, b.z]} rotation={[0, 0, b.rz]}>
          <Character {...b.look} adult position={[0, -0.95, 0]} eyes="dead" mouth="wavy" armL={2.6} armR={2.2} shadow={false} blood={0.6} />
        </group>
      ))}
      {RUNNERS.map((r, i) => {
        const z = 6.2 - (lt + r.ph) * 4.5;
        const over = Math.max(0, 1 - Math.abs(z - 3.4) / 1.2);
        const hop = Math.sin(over * Math.PI / 2) * 1.1 + Math.abs(Math.sin(tw * 12 + i)) * 0.12;
        return <Character key={i} {...r.look} adult position={[r.x, hop, z]} rotationY={Math.PI} legs="run" legPhase={tw * 16 + i} armL={2.4} armR={2.6} back={<Gear3D kind={r.gear} />} bodyTilt={(i % 2 ? 0.1 : -0.1)} />;
      })}
      {fireTracers(t, 3, (i) => [-2 + i * 2.5, WH, -1], (i, j) => [-2 + i * 2 + (hash(j) - 0.5) * 3, 0, 2 + hash(j * 2.2) * 4], 0.12, 0.3)}
    </>
  );
}

// C3a: катапульта крупно — геймер с консолью улетает через стену
const CP: V3 = [5, 0, 13];
function shotCatapult(t: number) {
  const a = S().start + 3.1, lt = t - a, k = prog(t, a, a + 1.0);
  const tw = twos(t);
  const L = 0.3;
  const ang = lt < L ? 1.0 : lerp(1.0, -0.9, easeOut(Math.min(1, (lt - L) / 0.12)));
  const bucket = (an: number): V3 => {
    const lx = -2.8 * Math.cos(an) - 0.25 * Math.sin(an), ly = 2.5 - 2.8 * Math.sin(an) + 0.25 * Math.cos(an);
    return [CP[0] + 0.15, ly, CP[2] - lx];
  };
  const rel = bucket(-0.9);
  let gp: V3; let rz = 0;
  if (lt < L + 0.1) gp = bucket(ang);
  else { const ft = lt - L - 0.1; gp = [rel[0], rel[1] + 13 * ft - 6 * ft * ft, rel[2] - 9 * ft]; rz = ft * 9; }
  const [sx, sy] = shake(t, a + L, 0.15, 0.5);
  const crowd = beachState(t).map((m) => ({ ...m, ry: Math.PI / 2, front: m.front, back: m.front })).filter((m) => !(Math.abs(m.z - CP[2]) < 4 && m.x > CP[0] - 1));
  return (
    <>
      <Cam pos={[CP[0] + 8.5 + sx, 2.6 + sy, CP[2] + 0.3]} look={[CP[0], 2.6 + Math.max(0, gp[1] - 3) * 0.55, CP[2] - 0.6 - Math.max(0, CP[2] - gp[2]) * 0.4]} fov={52} />
      <World t={t} x0={-20} x1={30} crowd={crowd} fog={[25, 70, "#2b2632"]} />
      <Catapult p={CP} t={t} ph={0} angle={ang} />
      <group position={gp} rotation={[0, 0, rz]}>
        <Character {...{ outfit: "tshirt" as const, color: "#e84393", hat: "cap" as const, hatColor: "#222" }} adult position={[0, -0.3, 0]} rotationY={Math.PI / 2} eyes="crazy" mouth="scream" mouthOpen={1}
          legs={lt < L ? "sit" : "run"} legPhase={tw * 20} armL={2.7} armR={2.4} back={<Gear3D kind={1} />} shadow={false} />
      </group>
      {[0, 1].map((i) => (
        <Character key={i} {...{ outfit: "hoodie" as const, color: i ? "#2980b9" : "#27ae60", hat: i ? "beanie" as const : "messyHair" as const, hatColor: "#c0392b", hairColor: "#3a2414" }} adult
          position={[CP[0] + 0.3, 0, CP[2] + 3.4 + i * 1.3]} rotationY={Math.PI / 2} eyes="crazy" mouth="grin" armL={lt > L ? 2.8 : 1.4} armR={lt > L ? 2.8 : 1.4} back={<Gear3D kind={i ? 2 : 3} />} />
      ))}
      {lt > L && lt < L + 0.5 && <Puff position={[CP[0], 0.4, CP[2] + 1.5]} scale={1 + (lt - L) * 2} color="#e3d6b0" opacity={1 - (lt - L) * 2} />}
    </>
  );
}

// ======================= СЦЕНЫ =======================
export const SCENES: SceneDef[] = [
  { id: "p1_wall_rise", from: Wc().start, to: Wc().start + 2.5, bg: SKY, render3d: shotRise },
  { id: "p1_wall_fly", from: Wc().start + 2.5, to: C1().start - 0.1, bg: SKY, render3d: shotFly },
  { id: "p1_wall_cmd_front", from: C1().start - 0.1, to: C1().start + 2.0, bg: SKY, render3d: (t) => shotCmdFront(t) },
  { id: "p1_wall_cmd_hero", from: C1().start + 2.0, to: C1().start + 3.4, bg: SKY, render3d: shotHero },
  { id: "p1_wall_cmd_aim", from: C1().start + 3.4, to: C1().start + 4.6, bg: SKY, render3d: (t) => shotFire(t, true) },
  { id: "p1_wall_cmd_back", from: C1().start + 4.6, to: C1().end - 1.3, bg: SKY, render3d: shotCmdBack },
  { id: "p1_wall_cmd_tight", from: C1().end - 1.3, to: S().start, bg: SKY, render3d: (t) => shotCmdFront(t, true) },
  { id: "p1_wall_fire", from: S().start, to: S().start + 1.3, bg: SKY, render3d: (t) => shotFire(t), overlay: (t) => <MuzzleFlashOverlay t={t} a={S().start} b={S().start + 1.3} /> },
  { id: "p1_wall_mow", from: S().start + 1.3, to: S().start + 2.2, bg: SKY, render3d: shotMow },
  { id: "p1_wall_trample", from: S().start + 2.2, to: S().start + 3.1, bg: SKY, render3d: shotTrample },
  { id: "p1_wall_catapult", from: S().start + 3.1, to: S().start + 4.1, bg: SKY, render3d: shotCatapult },
  { id: "p1_wall_pyramid", from: S().start + 4.1, to: S().start + 5.0, bg: SKY, render3d: shotPyramid },
  { id: "p1_wall_wire", from: S().start + 5.0, to: CH().start, bg: SKY, render3d: shotWire },
  { id: "p1_wall_chant", from: CH().start, to: G().start, bg: SKY, render3d: shotChant, overlay: (t) => <ChantOverlay t={t} /> },
];

// лёгкие вспышки кадра при стрельбе
const MuzzleFlashOverlay: React.FC<{ t: number; a: number; b: number }> = ({ t, a, b }) => {
  const on = t >= a && t < b && Math.floor(t * 15) % 3 === 0;
  return on ? <AbsoluteFill style={{ background: "#fff3b0", opacity: 0.12, pointerEvents: "none" }} /> : null;
};
// на слогах — короткая красная пульсация по краям кадра
const ChantOverlay: React.FC<{ t: number }> = ({ t }) => {
  const c = CH();
  if (t > c.end) return null;
  const k = prog(t, c.start, c.end) * 9; const f = k - Math.floor(k);
  const a = Math.max(0, 1 - f * 2.5) * 0.35;
  return <AbsoluteFill style={{ pointerEvents: "none", boxShadow: `inset 0 0 220px 60px rgba(200,20,20,${a})` }} />;
};
