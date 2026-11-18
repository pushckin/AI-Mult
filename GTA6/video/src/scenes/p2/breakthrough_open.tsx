// p2/breakthrough — бит p2_open: стена рушится, волна геймеров сносит армию, карта Новой Зеландии заливается толпой.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Character } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Cam, PaperLights, Sheet, Crowd, CrowdMember, Puff, CanvasPlane } from "../../kit/Stage";
import { geo, paper, glow, rng, Pt, FONT } from "../../kit/paper";
import { cue, prog, easeIn, easeOut, easeInOut, shake, twos, hash, lerp, clamp01 } from "../../kit/anim";
import { Sheep, Tank, ballistic } from "./breakthrough_props";

type V3 = [number, number, number];
export const O = () => cue("p2", "p2_open").start;
// границы планов внутри бита p2_open
export const OPEN_CUT1 = () => O() + 2.15; // стена → волна
export const OPEN_CUT2 = () => O() + 3.6;  // волна → карта

// ======================= A1: стена рушится =======================
const SLAB_W = 2.4, SLAB_H = 9, SLAB_D = 0.7;
const SLAB_COLORS = ["#9b9a94", "#8e8f8a", "#a6a59e", "#93928b"];
const slabFall = (i: number, t: number) => {
  const o = O();
  const start: Record<number, number> = { [-1]: o + 0.85, 0: o + 0.7, 1: o + 0.95, [-2]: o + 1.35, 2: o + 1.5 };
  const s = start[i];
  if (s === undefined) return 0;
  const max = Math.abs(i) === 2 ? 1.53 : 1.53;
  return Math.pow(prog(t, s, s + 0.95), 2.2) * max;
};

const BarbedWire: React.FC<{ w: number }> = ({ w }) => (
  <group>
    {Array.from({ length: Math.round(w / 0.8) }, (_, k) => (
      <mesh key={k} position={[-w / 2 + 0.4 + k * 0.8, 0.32, 0.05]} material={paper("#2a2a2a", { grain: false })}>
        <ringGeometry args={[0.27, 0.31, 18]} />
      </mesh>
    ))}
    {[-0.9, 0, 0.9].map((x, k) => <mesh key={"p" + k} position={[x, 0.35, 0.02]} material={paper("#3b3b3b")}><planeGeometry args={[0.07, 0.75]} /></mesh>)}
    <mesh position={[0, 0.5, 0.06]} material={paper("#2a2a2a", { grain: false })}><planeGeometry args={[w, 0.03]} /></mesh>
    <mesh position={[0, 0.2, 0.06]} material={paper("#2a2a2a", { grain: false })}><planeGeometry args={[w, 0.03]} /></mesh>
  </group>
);

const Crack: React.FC<{ seed: number; grow: number }> = ({ seed, grow }) => {
  const r = rng(seed);
  const n = 9;
  const segs: React.ReactNode[] = [];
  let x = (r() - 0.5) * 0.6, y = 0.6 + r() * 2;
  for (let k = 0; k < n; k++) {
    const a = 1.1 + (r() - 0.5) * 1.4;
    const len = 0.5 + r() * 0.6;
    const nx = x + Math.cos(a) * len * (k % 2 ? 1 : -1) * 0.5, ny = y + Math.sin(a) * len;
    if (k / n < grow) {
      const cx = (x + nx) / 2, cy = (y + ny) / 2, ang = Math.atan2(ny - y, nx - x);
      segs.push(<mesh key={k} position={[cx, cy, 0]} rotation={[0, 0, ang]} material={paper("#1d1d1d", { grain: false })}><planeGeometry args={[Math.hypot(nx - x, ny - y) + 0.04, 0.07]} /></mesh>);
    }
    x = nx; y = ny;
  }
  return <>{segs}</>;
};

const Slab: React.FC<{ i: number; t: number }> = ({ i, t }) => {
  const ang = slabFall(i, t);
  const col = SLAB_COLORS[(i + 20) % 4];
  const o = O();
  const tremble = t < o + 1.0 && Math.abs(i) <= 1 ? Math.sin(twos(t) * 60 + i) * 0.03 * prog(t, o, o + 0.8) : 0;
  return (
    <group position={[i * SLAB_W, 0, SLAB_D / 2]} rotation={[ang, 0, tremble]}>
      <mesh position={[0, SLAB_H / 2, -SLAB_D / 2]} material={paper(col)}>
        <boxGeometry args={[SLAB_W - 0.04, SLAB_H, SLAB_D]} />
      </mesh>
      {/* швы опалубки и пятна */}
      {[2.2, 4.5, 6.8].map((y, k) => <mesh key={k} position={[0, y, 0.005]} material={paper("#7d7c76", { grain: false })}><planeGeometry args={[SLAB_W - 0.1, 0.05]} /></mesh>)}
      {[[-0.6, 1.2], [0.5, 3.4], [-0.3, 5.6], [0.6, 7.6]].map(([x, y], k) => <mesh key={"d" + k} position={[x, y, 0.006]} material={paper("#6f6e69", { grain: false })}><circleGeometry args={[0.07, 10]} /></mesh>)}
      {Math.abs(i) <= 1 && <Crack seed={i + 5} grow={prog(t, o + 0.2 + Math.abs(i) * 0.12, o + 0.85)} />}
      <group position={[0, SLAB_H, 0]}><BarbedWire w={SLAB_W} /></group>
    </group>
  );
};

// толпа за стеной
const WALL_CROWD: CrowdMember[] = (() => {
  const r = rng(11);
  const out: CrowdMember[] = [];
  for (let k = 0; k < 1700; k++) {
    const z = -1.5 - Math.pow(r(), 0.8) * 34;
    const x = (r() - 0.5) * (8 + (-z) * 1.2);
    out.push({ x, z, s: 0.95 + r() * 0.35, variant: Math.floor(r() * 64), phase: r() * 10 });
  }
  return out.sort((a, b) => a.z - b.z);
})();

const SOLDIERS: { x: number; z: number; flyAt: number; v: V3; spin: number; eyes: "wide" | "dead"; armL: number; armR: number }[] = [
  { x: -2.3, z: 11.2, flyAt: 1.8, v: [-2.5, 9, 3], spin: 7, eyes: "dead", armL: 2.6, armR: 2.2 },
  { x: -1.25, z: 12.2, flyAt: 1.92, v: [-0.6, 11, 4], spin: -8, eyes: "wide", armL: 2.4, armR: 2.8 },
  { x: 1.25, z: 11.6, flyAt: 1.86, v: [1.4, 10, 3.5], spin: 9, eyes: "dead", armL: 2.9, armR: 2.0 },
  { x: 2.3, z: 12.6, flyAt: 1.98, v: [2.4, 8.5, 4], spin: -6, eyes: "wide", armL: 2.2, armR: 2.6 },
];

export const WallShot: React.FC<{ t: number }> = ({ t }) => {
  const o = O();
  const tq = twos(t);
  const k = prog(t, o, OPEN_CUT1());
  const [sx, sy] = shake(t, o + 1.6, 0.45, 0.9);
  const [sx0, sy0] = shake(t, o + 0.1, 0.08, 1.0, 20);
  const breach = o + 1.45; // толпа пошла в пролом
  const crowdAdv = Math.max(0, t - breach);
  const front = -1.5 + crowdAdv * 11;
  const members = WALL_CROWD.map((m) => {
    const zz = m.z + crowdAdv * 16;
    const inGap = Math.abs(m.x) < 3.6 + Math.max(0, crowdAdv - 0.4) * 6;
    const hidden = zz > -0.6 && !inGap;
    return { ...m, z: Math.min(zz, 15.5 + hash(m.phase ?? 0) * 1.5), hidden: hidden || (crowdAdv <= 0 && m.z > -2), y: zz > 0.0 && zz < 9.6 && Math.abs(m.x) < 3.6 ? 0.72 : 0 };
  });
  // карабкающиеся по стене до обрушения
  const climbers: CrowdMember[] = t < o + 1.0 ? [-3.1, -1.6, 0.3, 1.9, 3.3].map((x, j) => ({ x, z: 0.75, y: SLAB_H - 0.7 + Math.abs(Math.sin(tq * 6 + j)) * 0.25, s: 1.1, variant: j * 9 + 3, rot: (j % 2 ? 0.2 : -0.2) })) : [];
  return (
    <>
      <Cam pos={[sx + sx0 + lerp(0, 0.4, k), 3.2 + sy + sy0 + lerp(0, -0.6, k), lerp(27, 22, easeInOut(k))]} look={[0, lerp(5.2, 3.6, easeInOut(k)), 2]} fov={44} roll={sx * 0.04} />
      <PaperLights />
      <Sheet w={260} h={90} color="#a9cbe6" position={[0, 30, -90]} />
      {[[-22, 22], [14, 26], [40, 18], [-48, 30]].map(([x, y], j) => <Puff key={j} position={[x, y, -85]} scale={7} color="#f4f6f6" />)}
      <Sheet w={260} h={110} color="#e2cf9b" position={[0, 0, -55]} rotation={[-Math.PI / 2, 0, 0]} />
      <Sheet w={260} h={40} color="#7dab4e" position={[0, 0.01, 20]} rotation={[-Math.PI / 2, 0, 0]} />
      {Array.from({ length: 16 }, (_, i) => <Slab key={i} i={i - 8} t={t} />)}
      <Crowd members={members} t={t} bounce={0.12} size={1.15} />
      {climbers.length > 0 && <Crowd members={climbers} t={t} bounce={0.05} size={1.15} />}
      {/* пыль */}
      {t > o + 1.75 && [-3, -1, 1, 3, -2, 2].map((x, j) => {
        const kk = prog(t, o + 1.75 + j * 0.05, o + 2.6);
        return <Puff key={j} position={[x * 1.3, 0.6 + kk * 2.5 + (j % 2) * 0.8, 1 + kk * 3 + (j % 3)]} scale={1.2 + kk * 2.5} color="#c9c4b8" opacity={0.92} />;
      })}
      {/* танк — будет раздавлен плитой */}
      <Tank position={[-2.6, 0, 7.6]} scale={1.3} crush={clamp01((slabFall(-1, t) - 1.3) / 0.23)} turretRot={0.15} />
      {/* солдаты */}
      {SOLDIERS.map((s, j) => {
        const fa = o + s.flyAt;
        const panic = t > o + 0.7;
        if (t < fa) {
          const run = panic ? Math.min(0.4, (t - (o + 0.7)) * 1.5) : 0;
          return <Character key={j} {...CAST.soldier} position={[s.x, 0, s.z + run]} eyes="wide" mouth={panic ? "scream" : "o"} mouthOpen={0.8} lookY={panic ? 0.6 : 0.8} legs={panic ? "run" : "stand"} legPhase={tq * 18 + j} armL={panic ? 2.5 : 0.3} armR={panic ? 2.3 : 0.3} handR={!panic ? <mesh material={paper("#2b2b2b")} position={[0.1, 0.05, 0.05]}><planeGeometry args={[0.6, 0.1]} /></mesh> : undefined} />;
        }
        const p = ballistic(t, fa, [s.x, 0, s.z + 0.4], s.v, 14);
        return (
          <group key={j} position={p} rotation={[0, 0, s.spin * (t - fa)]}>
            <Character {...CAST.soldier} position={[0, -0.9, 0]} eyes={s.eyes} mouth="scream" mouthOpen={1} armL={s.armL} armR={s.armR} legs="run" legPhase={tq * 20} />
          </group>
        );
      })}
      {/* овцы */}
      {[[-1.3, 16.4, 1.95, [-3, 10, 3], 1], [1.3, 16.0, 2.0, [3, 11, 3.5], 0], [0.1, 17.0, 2.06, [0.8, 12, 2], 1]].map(([x, z, fl, v, f], j) => {
        const fa = o + (fl as number);
        if (t < fa) return <Sheep key={j} position={[x as number, 0, z as number]} scale={0.8} flip={!!f} legPhase={t > o + 0.8 ? tq * 20 : 0} />;
        const p = ballistic(t, fa, [x as number, 0.3, z as number], v as V3, 14);
        return <Sheep key={j} position={p} rot={(t - fa) * 9 * (j % 2 ? 1 : -1)} scale={0.8} dead={j === 1} flip={!!f} legPhase={tq * 30} />;
      })}
    </>
  );
};

// ======================= A2: волна сносит армию =======================
const WAVE: CrowdMember[] = (() => {
  const r = rng(23);
  const out: CrowdMember[] = [];
  for (let k = 0; k < 1500; k++) out.push({ x: (r() - 0.5) * 22, z: -Math.pow(r(), 0.7) * 30, s: 1.0 + r() * 0.35, variant: Math.floor(r() * 64), phase: r() * 10 });
  return out.sort((a, b) => a.z - b.z);
})();
const TUFTS = (() => { const r = rng(5); return Array.from({ length: 40 }, () => ({ x: (r() - 0.5) * 14, z: r() * 30 })); })();

export const WaveShot: React.FC<{ t: number }> = ({ t }) => {
  const t0 = OPEN_CUT1();
  const tl = t - t0;
  const tq = twos(t);
  const speed = 7.5;
  const front = -1.0 + tl * 3.2; // фронт волны догоняет камеру
  const members = WAVE.map((m) => ({ ...m, z: m.z + front, y: Math.max(0, (m.z + front + 6) * 0.03) * Math.abs(Math.sin((m.phase ?? 0) * 3 + tq * 4)) }));
  const [sx, sy] = shake(t, t0, 0.18, 2, 18);
  const fly = (j: number, at: number, p0: V3, v: V3) => ballistic(t, t0 + at, p0, v, 9);
  return (
    <>
      <Cam pos={[sx, 1.3 + sy, 10]} look={[0, 3.6, 0]} fov={52} roll={sx * 0.08} />
      <PaperLights />
      <Sheet w={200} h={80} color="#a9cbe6" position={[0, 25, -60]} />
      {[[-16, 16], [10, 20], [26, 12]].map(([x, y], j) => <Puff key={j} position={[x, y, -55]} scale={5} color="#f4f6f6" />)}
      <Sheet w={200} h={120} color="#7dab4e" position={[0, 0, -20]} rotation={[-Math.PI / 2, 0, 0]} />
      {TUFTS.map((u, j) => {
        const z = ((u.z + tl * speed) % 30) - 20;
        return <mesh key={j} position={[u.x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} material={paper("#5e8f3a")}><circleGeometry args={[0.25, 7]} /></mesh>;
      })}
      <Crowd members={members} t={t} bounce={0.25} size={1.2} />
      {/* пыль за волной */}
      {[-5, -2, 1, 4].map((x, j) => <Puff key={j} position={[x, 1.2 + (j % 2) * 0.6, front - 6]} scale={3.2} color="#d8cfb8" opacity={0.85} />)}
      {/* кувыркающийся танк */}
      {(() => { const p = fly(0, -0.25, [-1.6, 2.0, -6], [1.3, 8.2, 2.2]); return <Tank position={p} rot={-(tl + 0.25) * 3.2} scale={0.95} turretRot={Math.sin(tq * 9) * 0.6} />; })()}
      {/* солдаты летят */}
      {[[0, 0.0, [1.8, 1, -2], [-0.4, 9.5, 2.5], 6, "dead"], [1, 0.25, [-2.0, 1, -1], [0.6, 9, 3], -7, "wide"], [2, 0.5, [0.6, 1, 0], [0.9, 8.6, 2.6], 8, "dead"], [3, 0.75, [-0.6, 1, 0.5], [-0.5, 8.8, 2.4], -9, "wide"]].map(([j, at, p0, v, spin, eyes]) => {
        const p = fly(j as number, at as number, p0 as V3, v as V3);
        if (t < t0 + (at as number)) return null;
        return (
          <group key={"s" + j} position={p} rotation={[0, 0, (spin as number) * (t - t0 - (at as number))]}>
            <Character {...CAST.soldier} position={[0, -0.95, 0]} eyes={eyes as "dead"} mouth="scream" mouthOpen={1} armL={2.6} armR={2.1} legs="run" legPhase={tq * 22 + (j as number)} />
          </group>
        );
      })}
      {/* овцы летят */}
      {[[0, 0.1, [2.6, 1, -3], [-1.6, 9.8, 2.5]], [1, 0.45, [-2.4, 1, -2], [1.4, 10.2, 2.2]], [2, 0.85, [1.5, 1, -1], [-0.6, 9.2, 2.4]]].map(([j, at, p0, v]) => {
        if (t < t0 + (at as number)) return null;
        const p = fly(j as number, at as number, p0 as V3, v as V3);
        return <Sheep key={"o" + j} position={p} rot={(t - t0) * 8 * ((j as number) % 2 ? 1 : -1)} scale={0.9} dead={(j as number) === 1} flip={(j as number) === 2} legPhase={tq * 30} />;
      })}
    </>
  );
};

// ======================= A3: карта =======================
const LL = (lon: number, lat: number): Pt => [(lon - 172.5) * 0.755, lat + 40.5];
const NORTH: Pt[] = ([[172.7, -34.4], [173.4, -35.0], [174.3, -35.3], [174.8, -36.6], [175.5, -36.5], [175.9, -37.5], [177.0, -37.9], [178.0, -37.6], [178.5, -37.7], [178.3, -38.5], [177.9, -39.1], [177.0, -39.3], [176.9, -39.6], [176.4, -40.3], [175.9, -41.0], [175.3, -41.6], [174.8, -41.3], [175.1, -40.6], [175.0, -39.9], [174.1, -39.5], [173.8, -39.2], [174.6, -38.8], [174.8, -38.1], [174.6, -37.1], [174.1, -36.4], [173.1, -35.2]] as [number, number][]).map(([a, b]) => LL(a, b));
const SOUTH: Pt[] = ([[172.7, -40.5], [173.2, -41.0], [174.0, -41.0], [174.3, -41.7], [173.7, -42.4], [173.0, -43.1], [172.8, -43.6], [173.1, -43.8], [172.4, -43.9], [171.3, -44.4], [170.8, -45.2], [170.6, -45.9], [169.7, -46.5], [168.4, -46.6], [167.5, -46.2], [166.5, -45.6], [166.9, -44.9], [168.2, -44.0], [169.4, -43.5], [170.4, -43.0], [171.2, -42.4], [171.5, -41.8], [172.1, -41.0]] as [number, number][]).map(([a, b]) => LL(a, b));
const ORIGINS: Pt[] = [LL(174.8, -36.8), LL(173.1, -35.3), LL(176.3, -37.7), LL(174.8, -41.2), LL(172.7, -43.6), LL(170.6, -45.9), LL(171.2, -42.4), LL(174.2, -39.0)];
function inPoly(p: Pt, poly: Pt[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const BLOBS = (() => {
  const r = rng(77);
  const out: { x: number; y: number; thr: number; s: number; glint: boolean }[] = [];
  while (out.length < 1100) {
    const p: Pt = [-4.8 + r() * 9.6, -6.4 + r() * 12.8];
    if (!inPoly(p, NORTH) && !inPoly(p, SOUTH)) continue;
    const d = Math.min(...ORIGINS.map((o) => Math.hypot(o[0] - p[0], o[1] - p[1])));
    out.push({ x: p[0], y: p[1], thr: Math.min(1, d / 2.6) * 0.8 + r() * 0.15, s: 0.16 + r() * 0.14, glint: r() < 0.22 });
  }
  return out;
})();
const MAP_W = 10, MAP_H = 13.4; // канвас покрывает x∈[-5,5], y∈[-6.7,6.7]
function drawMass(g: CanvasRenderingContext2D, W: number, H: number, p: number) {
  g.clearRect(0, 0, W, H);
  const tx = (x: number) => ((x + MAP_W / 2) / MAP_W) * W, ty = (y: number) => ((MAP_H / 2 - y) / MAP_H) * H;
  const sc = W / MAP_W;
  g.save();
  g.beginPath();
  for (const poly of [NORTH, SOUTH]) { poly.forEach(([x, y], i) => (i ? g.lineTo(tx(x), ty(y)) : g.moveTo(tx(x), ty(y)))); g.closePath(); }
  g.clip();
  for (const b of BLOBS) {
    if (b.thr > p) continue;
    const grow = Math.min(1, (p - b.thr) / 0.12);
    g.fillStyle = "#211c26";
    g.beginPath(); g.arc(tx(b.x), ty(b.y), b.s * sc * grow, 0, 7); g.fill();
  }
  for (const b of BLOBS) {
    if (!b.glint || b.thr > p - 0.05) continue;
    g.fillStyle = (Math.floor(b.x * 13 + b.y * 7) % 2) ? "#7fe7ff" : "#c9f3ff";
    g.fillRect(tx(b.x) - 2.5, ty(b.y) - 2, 5, 4);
  }
  g.restore();
  // остатки «стены» по берегу (с проломами там, где толпа уже прошла)
  g.lineWidth = 5; g.strokeStyle = "#8e8d88"; g.setLineDash([10, 6]);
  for (const poly of [NORTH, SOUTH]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const d = Math.min(...ORIGINS.map((o) => Math.hypot(o[0] - m[0], o[1] - m[1])));
      if (d / 2.6 * 0.8 < p - 0.05) continue;
      g.beginPath(); g.moveTo(tx(a[0]), ty(a[1])); g.lineTo(tx(b[0]), ty(b[1])); g.stroke();
    }
  }
  g.setLineDash([]);
}

const mapProg = (t: number) => { const t0 = OPEN_CUT2(), t1 = cue("p2", "p2_news1").start; return 0.08 + easeInOut(prog(t, t0, t1 - 0.2)) * 0.96; };
export const MapShot: React.FC<{ t: number }> = ({ t }) => {
  const t0 = OPEN_CUT2(), t1 = cue("p2", "p2_news1").start;
  const k = prog(t, t0, t1);
  const p = mapProg(t);
  const pq = Math.floor(p * 40) / 40;
  const [sx, sy] = shake(t, t0, 0.15, 0.6);
  return (
    <>
      <Cam pos={[sx + 0.15, lerp(19.5, 22, k) + sy, lerp(7.5, 8.5, k)]} look={[0.15, 0, lerp(0.9, 1.1, k)]} fov={44} roll={lerp(-0.05, 0.02, k)} />
      <PaperLights />
      <Sheet w={80} h={80} color="#3d7fb8" position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* волны-штрихи на море */}
      {Array.from({ length: 26 }, (_, j) => {
        const r = rng(j + 100);
        const x = (r() - 0.5) * 16, z = (r() - 0.5) * 18;
        if (Math.abs(x) < 4.6 && Math.abs(z) < 6.2 && Math.abs(x + z * 0.6) < 3.5) return null;
        return <mesh key={j} position={[x, 0.0, z]} rotation={[-Math.PI / 2, 0, 0]} material={paper("#6aa3d3")}><planeGeometry args={[0.6, 0.06]} /></mesh>;
      })}
      {[NORTH, SOUTH].map((poly, j) => (
        <group key={j} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0, 0.08]} geometry={geo.poly("nz" + j, poly, 0.05, 0.2)} material={paper("#e6d6a6")} />
          <mesh position={[0, 0, 0.2]} scale={[0.985, 0.985, 1]} geometry={geo.poly("nzg" + j, poly, 0.1, 0.05)} material={paper(j ? "#6ea64a" : "#78b04f")} />
        </group>
      ))}
      {/* Южные Альпы */}
      {[[169.3, -44.2], [170.2, -43.6], [171.0, -43.0], [168.6, -44.9], [171.7, -42.4]].map(([lo, la], j) => {
        const [x, y] = LL(lo, la);
        return (
          <group key={j} position={[x, 0.22, -y]} rotation={[-0.9, 0, 0]}>
            <mesh geometry={geo.poly("mtn", [[-0.4, 0], [0.4, 0], [0, 0.6]], 0.03, 0.03)} material={paper("#8a7a63")} />
            <mesh position={[0, 0.42, 0.02]} geometry={geo.poly("mtn2", [[-0.13, 0], [0.13, 0], [0, 0.19]], 0.02, 0.02)} material={paper("#ffffff")} />
          </group>
        );
      })}
      <CanvasPlane texKey={"nzmass_" + pq.toFixed(3)} w={MAP_W} h={MAP_H} px={700} position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]} transparent draw={(g, W, H) => drawMass(g, W, H, pq)} />
      {/* овцы, бегущие в море */}
      {[[176.5, -40.2, 1.5, -0.4], [170.0, -46.4, -0.8, 1.6], [167.0, -45.0, -1.5, 0.3]].map(([lo, la, vx, vz], j) => {
        const [x, y] = LL(lo, la);
        const dt = Math.max(0, t - t0 - 0.2 - j * 0.15);
        return <group key={j} position={[x + vx * dt, 0.3 + Math.abs(Math.sin(dt * 9)) * 0.2, -y + vz * dt]} rotation={[-1.0, 0, 0]}><Sheep scale={0.38} flip={vx < 0} legPhase={twos(t) * 30} /></group>;
      })}
    </>
  );
};

/** HUD «захвата территории» в стиле стратегии */
export const MapHud: React.FC<{ t: number }> = ({ t }) => {
  const t0 = OPEN_CUT2(), t1 = cue("p2", "p2_news1").start;
  if (t < t0) return null;
  const p = clamp01(mapProg(t));
  const pct = Math.min(100, Math.round(p * 100));
  const pop = prog(t, t0, t0 + 0.25);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 70, right: 150, top: 1330, transform: `scale(${0.8 + 0.2 * pop})`, opacity: pop }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: "#fff", WebkitTextStroke: "8px #000", paintOrder: "stroke fill", marginBottom: 10 }}>ЗАХВАТ ТЕРРИТОРИИ: {pct}%</div>
        <div style={{ height: 42, border: "6px solid #111", background: "#f7e9c9", boxShadow: "6px 6px 0 rgba(0,0,0,0.45)" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#c62828" : "#2b2433" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
