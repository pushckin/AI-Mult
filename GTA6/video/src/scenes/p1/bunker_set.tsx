// Сцена p1/bunker — общие декорации: бункер, экран с картой и счётчиком, кружка, силуэты, мелочи.
import React from "react";
import * as THREE from "three";
import { Character, CharacterProps, Piece } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { CanvasPlane, Sheet, Puff } from "../../kit/Stage";
import { geo, paper, glow, rng, FONT } from "../../kit/paper";
import { cue, part, prog, twos, easeOut, easeIn, easeInOut, clamp01, lerp, hash, noise1 } from "../../kit/anim";

// ---------- тайминги ----------
export const C = (id: string) => cue("p1", id);
/** время куска субтитра (по фрагменту текста) внутри реплики — устойчиво к переозвучке */
export function subT(cueId: string, frag: string): { start: number; end: number } {
  const c = C(cueId);
  const s = part("p1").subs.find((x) => x.start >= c.start - 0.02 && x.end <= c.end + 0.02 && x.text.replace(/[{}]/g, "").includes(frag));
  return s ? { start: s.start, end: s.end } : { start: c.start, end: c.end };
}

// ---------- руки: позиция кисти в координатах персонажа ----------
export function handPos(side: -1 | 1, a: number, scale = 1, adult = true, sit = false): [number, number] {
  const up = adult ? 0.186 + (sit ? 0 : 0.13) : 0;
  return [side * (0.3 + 0.07 * Math.cos(a) + 0.36 * Math.sin(a)) * scale, (up + 0.68 + 0.07 * Math.sin(a) - 0.36 * Math.cos(a)) * scale];
}
/** центр головы стоящего взрослого */
export const HEAD_Y = 1.41;

// ---------- бетон ----------
export function drawConcrete(seed: number, label?: string) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    const r = rng(seed);
    g.fillStyle = "#6f766f"; g.fillRect(0, 0, W, H);
    // пятна
    for (let i = 0; i < 60; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(40,50,45,0.10)" : "rgba(255,255,240,0.06)";
      g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 90, 10 + r() * 60, r() * 3, 0, 7); g.fill();
    }
    // плиты
    const cols = 6, rows = 3;
    g.strokeStyle = "rgba(25,30,28,0.55)"; g.lineWidth = 4;
    for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo((i * W) / cols, 0); g.lineTo((i * W) / cols, H); g.stroke(); }
    for (let j = 1; j < rows; j++) { g.beginPath(); g.moveTo(0, (j * H) / rows); g.lineTo(W, (j * H) / rows); g.stroke(); }
    // болты
    g.fillStyle = "rgba(30,34,32,0.7)";
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) { g.beginPath(); g.arc((i * W) / cols + 10, (j * H) / rows + 10, 4, 0, 7); g.fill(); }
    // подтёки
    for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(30,40,30,0.18)"; const x = r() * W; g.fillRect(x, r() * H * 0.3, 3 + r() * 5, 40 + r() * 160); }
    // жёлто-чёрная полоса снизу
    const sh = H * 0.05;
    for (let x = -sh; x < W + sh; x += sh * 1.2) {
      g.fillStyle = "#e0b22a"; g.beginPath(); g.moveTo(x, H); g.lineTo(x + sh * 0.6, H); g.lineTo(x + sh * 1.2, H - sh); g.lineTo(x + sh * 0.6, H - sh); g.fill();
      g.fillStyle = "#1c1c1c"; g.beginPath(); g.moveTo(x + sh * 0.6, H); g.lineTo(x + sh * 1.2, H); g.lineTo(x + sh * 1.8, H - sh); g.lineTo(x + sh * 1.2, H - sh); g.fill();
    }
    if (label) {
      g.font = `900 ${Math.floor(H * 0.07)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "rgba(230,225,200,0.55)"; g.fillText(label, W / 2, H * 0.14);
    }
  };
}

// ---------- флаг (вымышленный упрощённый флаг-баннер) ----------
function drawFlag(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#1d2a6b"; g.fillRect(0, 0, W, H);
  // крест-«кантон» упрощённо
  const cw = W * 0.5, ch = H * 0.32;
  g.fillStyle = "#24357f"; g.fillRect(0, 0, cw, ch);
  g.strokeStyle = "#f2f2f2"; g.lineWidth = W * 0.07;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(cw, ch); g.moveTo(cw, 0); g.lineTo(0, ch); g.stroke();
  g.strokeStyle = "#c62828"; g.lineWidth = W * 0.03;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(cw, ch); g.moveTo(cw, 0); g.lineTo(0, ch); g.stroke();
  g.fillStyle = "#f2f2f2"; g.fillRect(cw / 2 - W * 0.06, 0, W * 0.12, ch); g.fillRect(0, ch / 2 - W * 0.06, cw, W * 0.12);
  g.fillStyle = "#c62828"; g.fillRect(cw / 2 - W * 0.035, 0, W * 0.07, ch); g.fillRect(0, ch / 2 - W * 0.035, cw, W * 0.07);
  // звёзды
  const star = (x: number, y: number, r: number, c: string) => {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  };
  for (const [x, y] of [[0.68, 0.45], [0.55, 0.62], [0.82, 0.58], [0.68, 0.82]]) { star(x * W, y * H, W * 0.085, "#fff"); star(x * W, y * H, W * 0.06, "#c62828"); }
  // бахрома
  g.fillStyle = "#e3b23c"; g.fillRect(0, H - H * 0.04, W, H * 0.04);
}

export const Flag: React.FC<{ position: [number, number, number]; t: number; seed?: number }> = ({ position, t, seed = 0 }) => {
  const sway = noise1(twos(t) * 0.8 + seed) * 0.04;
  return (
    <group position={position}>
      <Piece g={geo.rrect(0.06, 2.8, 0.03, 0.05)} c="#b8a26a" p={[0, 1.4, 0]} />
      <Piece g={geo.ellipse(0.08, 0.08, 0.05)} c="#e3b23c" p={[0, 2.84, 0]} />
      <group position={[0.42, 2.7, 0.03]} rotation={[0, 0, sway]}>
        <Piece g={geo.rrect(0.84, 0.04, 0.02, 0.04)} c="#b8a26a" p={[0, 0, 0.01]} />
        <CanvasPlane texKey="nzflag" w={0.78} h={1.25} glowing={false} draw={drawFlag} position={[0, -0.64, 0]} />
      </group>
    </group>
  );
};

// ---------- карта Новой Зеландии и счётчик ----------
const NI: [number, number][] = [[0.512, 0.058], [0.532, 0.058], [0.612, 0.146], [0.648, 0.22], [0.684, 0.2], [0.728, 0.282], [0.868, 0.282], [0.836, 0.35], [0.832, 0.392], [0.77, 0.404], [0.672, 0.548], [0.642, 0.527], [0.666, 0.472], [0.652, 0.432], [0.58, 0.392], [0.598, 0.37], [0.642, 0.31], [0.623, 0.234], [0.598, 0.194], [0.548, 0.132]];
const SI: [number, number][] = [[0.512, 0.472], [0.548, 0.527], [0.604, 0.499], [0.61, 0.554], [0.574, 0.602], [0.537, 0.698], [0.488, 0.704], [0.426, 0.738], [0.39, 0.841], [0.334, 0.875], [0.242, 0.888], [0.137, 0.862], [0.155, 0.8], [0.217, 0.752], [0.285, 0.704], [0.402, 0.622], [0.444, 0.554], [0.476, 0.494]];
function islandPath(g: CanvasRenderingContext2D, pts: [number, number][], W: number, H: number, ox: number, oy: number, sx: number, sy: number) {
  g.beginPath();
  pts.forEach(([x, y], i) => { const X = ox + x * sx, Y = oy + y * sy; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
  g.closePath();
}
// фиксированные «точки людей» внутри островов
let DOTS: [number, number][] | null = null;
function dots(): [number, number][] {
  if (DOTS) return DOTS;
  const c = document.createElement("canvas"); c.width = 400; c.height = 400;
  const g = c.getContext("2d")!;
  const r = rng(99);
  const out: [number, number][] = [];
  let guard = 0;
  while (out.length < 900 && guard++ < 20000) {
    const x = r(), y = r();
    islandPath(g, NI, 400, 400, 0, 0, 400, 400); const a = g.isPointInPath(x * 400, y * 400);
    islandPath(g, SI, 400, 400, 0, 0, 400, 400); const b = g.isPointInPath(x * 400, y * 400);
    if (a || b) out.push([x, y]);
  }
  DOTS = out;
  return out;
}

/** рисунок карты: n — число точек-людей, alarm — красная тревога */
export function drawMap(n: number, alarm: number, stamp: boolean) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = alarm > 0.5 ? "#3a0c10" : "#0f2f3f"; g.fillRect(0, 0, W, H);
    g.strokeStyle = alarm > 0.5 ? "rgba(255,90,90,0.25)" : "rgba(120,220,255,0.18)"; g.lineWidth = 2;
    for (let x = 0; x < W; x += W / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += W / 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const sx = W, sy = H, ox = 0, oy = 0;
    for (const pts of [NI, SI]) {
      islandPath(g, pts, W, H, ox + 8, oy + 10, sx, sy); g.fillStyle = "rgba(0,0,0,0.45)"; g.fill();
      islandPath(g, pts, W, H, ox, oy, sx, sy); g.fillStyle = alarm > 0.5 ? "#b23a2e" : "#5fae4e"; g.fill();
      g.lineWidth = 6; g.strokeStyle = alarm > 0.5 ? "#ffb3a0" : "#c9f2a8"; g.stroke();
    }
    g.fillStyle = alarm > 0.5 ? "#b23a2e" : "#5fae4e"; g.beginPath(); g.ellipse(ox + 0.217 * sx, oy + 0.916 * sy, W * 0.03, H * 0.02, 0, 0, 7); g.fill();
    // люди
    const d = dots();
    for (let i = 0; i < Math.min(n, d.length); i++) {
      const [x, y] = d[i];
      g.fillStyle = i % 3 === 0 ? "#ffe14d" : "#ff3b3b";
      g.beginPath(); g.arc(ox + x * sx, oy + y * sy, W * 0.011, 0, 7); g.fill();
    }
    // Веллингтон
    const wx = ox + 0.642 * sx, wy = oy + 0.527 * sy;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(wx, wy, W * 0.022, 0, 7); g.fill();
    g.fillStyle = "#e53935"; g.beginPath(); g.arc(wx, wy, W * 0.013, 0, 7); g.fill();
    if (!stamp) {
      g.font = `800 ${Math.floor(W * 0.045)}px ${FONT}`; g.textAlign = "right"; g.textBaseline = "middle";
      g.lineWidth = W * 0.012; g.strokeStyle = "#0b1a22"; g.strokeText("ВЕЛЛИНГТОН", wx - W * 0.035, wy + H * 0.035);
      g.fillStyle = "#fff"; g.fillText("ВЕЛЛИНГТОН", wx - W * 0.035, wy + H * 0.035);
    }
    // стрелки вторжения
    if (n > 60 && !stamp) {
      g.strokeStyle = "#ff3b3b"; g.fillStyle = "#ff3b3b"; g.lineWidth = W * 0.018;
      for (const [x0, y0, x1, y1] of [[0.05, 0.25, 0.4, 0.4], [0.97, 0.12, 0.76, 0.3], [0.95, 0.7, 0.62, 0.66], [0.04, 0.9, 0.2, 0.84]]) {
        const X0 = x0 * W, Y0 = y0 * H, X1 = x1 * W, Y1 = y1 * H;
        g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X1, Y1); g.stroke();
        const a = Math.atan2(Y1 - Y0, X1 - X0);
        g.beginPath(); g.moveTo(X1 + Math.cos(a) * W * 0.04, Y1 + Math.sin(a) * W * 0.04);
        g.lineTo(X1 + Math.cos(a + 2.4) * W * 0.05, Y1 + Math.sin(a + 2.4) * W * 0.05);
        g.lineTo(X1 + Math.cos(a - 2.4) * W * 0.05, Y1 + Math.sin(a - 2.4) * W * 0.05); g.fill();
      }
    }
    if (stamp) {
      g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W * 0.5, H * 0.5); g.rotate(-0.95);
      g.fillStyle = "rgba(255,240,230,0.92)"; g.fillRect(-W * 0.37, -H * 0.07, W * 0.74, H * 0.14);
      g.strokeStyle = "#e01b1b"; g.lineWidth = W * 0.022; g.strokeRect(-W * 0.35, -H * 0.055, W * 0.7, H * 0.11);
      g.font = `900 ${Math.floor(W * 0.085)}px ${FONT}`; g.fillStyle = "#e01b1b"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ВТОРЖЕНИЕ", 0, 4);
      g.restore();
    }
    // рамка
    g.strokeStyle = "#0a0a0a"; g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  };
}

/** значение счётчика населения во времени */
export function population(t: number): number {
  const o = C("p1_open");
  const stops: [number, number][] = [
    [o.start + 0.1, 5_400_000], [o.start + 0.5, 5_400_000], [o.start + 0.85, 19_800_000], [o.start + 1.2, 54_000_000], [o.start + 1.6, 86_000_000],
  ];
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [t0, v0] = stops[i - 1], [t1, v1] = stops[i];
    if (t <= t1) { const k = prog(t, t0, t1); return Math.round(lerp(v0, v1, k)); }
  }
  // потом медленно ползёт дальше
  return Math.round(86_000_000 + (t - stops[stops.length - 1][0]) * 1_237);
}

/** одометр: каждая цифра крутится непрерывно */
export function drawCounter(v: number, rate: number, alarm: number) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    g.fillStyle = "#0b0d0c"; g.fillRect(0, 0, W, H);
    g.font = `800 ${Math.floor(H * 0.17)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = alarm > 0.5 ? "#ff6b6b" : "#9fe6ff";
    g.fillText("НАСЕЛЕНИЕ НОВОЙ ЗЕЛАНДИИ", W / 2, H * 0.15);
    const digits = 8;
    const cw = W * 0.105, gap = W * 0.03, ch = H * 0.62;
    const total = digits * cw + 2 * gap;
    let x = (W - total) / 2;
    const y0 = H * 0.3;
    for (let i = digits - 1; i >= 0; i--) {
      const place = Math.pow(10, i);
      const cont = (v / place) % 10; // непрерывное значение разряда
      // разряды, которые крутятся быстро — «смаз»
      const speed = rate / place;
      const d0 = Math.floor(cont), f = cont - d0;
      g.fillStyle = "#1d2321"; g.fillRect(x + 3, y0, cw - 6, ch);
      const lead = v < place && i > 0; // ведущие нули не рисуем
      g.save(); g.beginPath(); g.rect(x + 3, y0, cw - 6, ch); g.clip();
      g.font = `900 ${Math.floor(ch * 0.82)}px ${FONT}`;
      const col = alarm > 0.5 ? "#ff4040" : "#ffd23f";
      const off = speed > 25 ? f : speed > 0.3 ? (f > 0.75 ? easeInOut((f - 0.75) / 0.25) : 0) : 0; // перекат барабана: стоит, потом щёлкает
      for (const k of lead ? [] : [0, 1]) {
        g.fillStyle = col;
        g.globalAlpha = speed > 25 ? 0.55 : 1;
        g.fillText(String((d0 + k) % 10), x + cw / 2, y0 + ch / 2 + (k - off) * ch * 1.0 + 4);
      }
      if (speed > 25) { // полосы смаза
        g.globalAlpha = 0.5; g.fillStyle = col;
        for (let s = 0; s < 5; s++) g.fillRect(x + cw * 0.2, y0 + ((s * 0.21 + f) % 1) * ch, cw * 0.6, ch * 0.04);
      }
      g.globalAlpha = 1;
      // блики барабана
      g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x + 3, y0, cw - 6, ch * 0.16); g.fillRect(x + 3, y0 + ch * 0.84, cw - 6, ch * 0.16);
      g.restore();
      x += cw;
      if (i === 6 || i === 3) x += gap;
    }
    g.strokeStyle = alarm > 0.5 ? "#ff3030" : "#2b3b36"; g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  };
}

/** огромный экран: счётчик сверху, карта снизу. Центр — в начале координат, плоскость XY, смотрит на +Z. */
export const BigScreen: React.FC<{ t: number; alarm?: number; stamp?: boolean; w?: number }> = ({ t, alarm = 0, stamp = false, w = 3.4 }) => {
  const v = population(t);
  const rate = (population(t + 1 / 30) - v) * 30;
  const fr = Math.round(t * 30);
  const n = Math.floor(clamp01((v - 5_400_000) / 80_000_000) * 900);
  const mapH = w * 0.95, cntH = w * 0.32;
  const blink = alarm > 0 && Math.floor(t * 4) % 2 === 0 ? 1 : 0;
  return (
    <group>
      <Piece g={geo.rrect(w + 0.25, mapH + cntH + 0.35, 0.06, 0.08)} c="#1a1d1c" p={[0, 0, -0.06]} />
      <CanvasPlane texKey={`cnt_${v}_${Math.round(rate / 1000)}_${blink}`} w={w} h={cntH} px={768} draw={drawCounter(v, rate, blink)} position={[0, mapH / 2 + 0.05, 0.03]} />
      <CanvasPlane texKey={`map_${Math.floor(n / 6)}_${blink}_${stamp ? 1 : 0}`} w={w} h={mapH} px={640} draw={drawMap(Math.floor(n / 6) * 6, blink, stamp)} position={[0, -cntH / 2 - 0.05, 0.03]} />
      {/* свечение экрана */}
      <mesh position={[0, 0, -0.1]} material={glow(alarm > 0 ? "#ff3030" : "#6fd6ff", 0.12)}>
        <planeGeometry args={[w + 1.4, mapH + cntH + 1.4]} />
      </mesh>
      {void fr}
    </group>
  );
};

// ---------- кружка ----------
export const Mug: React.FC<{ coffee?: boolean }> = ({ coffee = true }) => (
  <group>
    <Piece g={geo.rrect(0.15, 0.17, 0.03, 0.05)} c="#f1ece0" />
    <Piece g={geo.rrect(0.15, 0.035, 0.0, 0.052)} c="#c62828" p={[0, 0.02, 0.001]} />
    <mesh position={[0.095, 0, 0]} material={paper("#f1ece0")}><torusGeometry args={[0.045, 0.014, 6, 16, Math.PI * 1.2]} /></mesh>
    {coffee && <Piece g={geo.ellipse(0.07, 0.015, 0.02)} c="#4a2a14" p={[0, 0.085, 0.01]} />}
  </group>
);

/** падение и осколки кружки. rel — время от момента удара (может быть <0 — ещё летит) */
export const MugCrash: React.FC<{ x: number; y0: number; z: number; tRelease: number; tHit: number; t: number }> = ({ x, y0, z, tRelease, tHit, t }) => {
  if (t < tRelease) return null;
  if (t < tHit) {
    const k = prog(t, tRelease, tHit);
    const y = lerp(y0, 0.09, easeIn(k));
    return <group position={[x + k * 0.05, y, z]} rotation={[0, 0, -k * 2.4]}><Mug /></group>;
  }
  const r = rng(5);
  const rel = twos(t - tHit, 15);
  const shards: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.5;
    const sp = 0.6 + r() * 0.9;
    const vy = 1.2 + r() * 1.4;
    const tt = Math.min(rel, 0.55);
    const dx = Math.cos(a) * sp * tt, dz = Math.sin(a) * sp * tt * 0.5;
    const dy = Math.max(0, vy * tt - 4.9 * tt * tt);
    shards.push(<Piece key={i} g={geo.poly("shard" + (i % 3), i % 3 === 0 ? [[0, 0], [0.07, 0.01], [0.03, 0.06]] : i % 3 === 1 ? [[0, 0], [0.05, -0.02], [0.06, 0.04], [0.01, 0.05]] : [[0, 0], [0.08, 0], [0.04, 0.03]], 0, 0.02)} c={i % 4 === 0 ? "#c62828" : "#f1ece0"} p={[x + dx, 0.03 + dy, z + dz]} r={rel * (6 + i)} />);
  }
  // кофейная клякса растёт + брызги-«корона»
  const sk = 1.5 * easeOut(prog(rel, 0, 0.25));
  const crown = clamp01(1 - rel / 0.6);
  return (
    <group>
      <mesh position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[sk, sk, 1]} geometry={geo.poly("puddle", [[-0.35, 0], [-0.2, 0.15], [0.05, 0.2], [0.3, 0.12], [0.4, -0.05], [0.2, -0.18], [-0.1, -0.2], [-0.32, -0.12]], 0.05, 0.01)} material={paper("#4a2a14")} />
      {crown > 0 && (
        <group position={[x, 0.02, z + 0.05]} scale={[1.0 + rel * 2.0, crown * (1.0 + rel * 2.4), 1]}>
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <Piece key={k} g={geo.poly("cr", [[-0.03, 0], [0.03, 0], [0.0, 0.22]], 0.01, 0.02)} c="#5a3418" p={[k * 0.06, 0, 0]} r={-k * 0.25} />
          ))}
          {[-2, -1, 1, 2].map((k) => <Piece key={"d" + k} g={geo.ellipse(0.025, 0.03, 0.02)} c="#5a3418" p={[k * 0.12, 0.25 + Math.abs(k) * 0.05, 0]} />)}
        </group>
      )}
      {shards}
    </group>
  );
};

// ---------- силуэт со спины (для планов «из-за плеча») ----------
export const BackOf: React.FC<{ position: [number, number, number]; scale?: number; color?: string; hair?: "combover" | "cap" | "bun" | "curly" | "none"; sit?: boolean; t?: number }> = ({ position, scale = 1, color = "#151917", hair = "none", sit }) => (
  <group position={position} scale={scale}>
    <Piece g={geo.poly("body", [[-0.4, 0], [0.4, 0], [0.31, 0.62], [-0.31, 0.62]], 0.1, 0.035)} c={color} p={[0, sit ? 0.3 : 0.12, 0]} />
    {[-1, 1].map((s) => <Piece key={s} g={geo.rrect(0.15, 0.36, 0.06, 0.035)} c={color} p={[s * 0.38, sit ? 0.72 : 0.54, -0.01]} r={s * 0.15} />)}
    <Piece g={geo.ellipse(0.48, 0.43, 0.05)} c={color} p={[0, sit ? 1.3 : 1.12, 0]} />
    {hair === "combover" && <Piece g={geo.arc(0.46, 0.2, 0.05, Math.PI - 0.05, 0.035)} c="#2a2622" p={[0, (sit ? 1.3 : 1.12) + 0.24, 0.03]} />}
    {hair === "bun" && <Piece g={geo.ellipse(0.14, 0.12, 0.035)} c="#1e140c" p={[0, (sit ? 1.3 : 1.12) + 0.48, 0.03]} />}
    {hair === "curly" && [-0.3, -0.1, 0.1, 0.3].map((x, i) => <Piece key={i} g={geo.ellipse(0.13, 0.12, 0.035)} c="#2a2014" p={[x, (sit ? 1.3 : 1.12) + 0.35, 0.03]} />)}
  </group>
);

// ---------- массовка министров (оригинальные внешности) ----------
export const EXTRAS: Record<string, Partial<CharacterProps>> = {
  bun: { adult: true, outfit: "dress", color: "#355c7d", hat: "bun", hairColor: "#2b1b10", skin: "#f1c9a4" },
  old: { adult: true, outfit: "suit", color: "#6b4f3a", color2: "#3e2e22", tie: "#2e7d32", hat: "baldGray", hairColor: "#d9d9d9", skin: "#eec39b", mustache: true },
  curly: { adult: true, outfit: "suit", color: "#2e5f5a", color2: "#203f3c", tie: "#f39c12", hat: "curly", hairColor: "#c9a227", skin: "#f5d3b3" },
  slick: { adult: true, outfit: "suit", color: "#7a2e3b", color2: "#3d1b22", tie: "#111", hat: "slickHair", hairColor: "#111", skin: "#c68b59" },
};

// ---------- предметы на стол ----------
export const Folder: React.FC<{ position: [number, number, number]; rot?: number; color?: string }> = ({ position, rot = 0, color = "#c0392b" }) => (
  <group position={position} rotation={[-Math.PI / 2, 0, rot]}>
    <Piece g={geo.rrect(0.32, 0.42, 0.02, 0.015)} c={color} />
    <Piece g={geo.rrect(0.28, 0.06, 0.01, 0.017)} c="#f4f0e0" p={[0, 0.1, 0.002]} />
  </group>
);

export const RedPhone: React.FC<{ position: [number, number, number]; t: number; ring?: boolean }> = ({ position, t, ring }) => {
  const j = ring ? Math.sin(twos(t) * 40) * 0.03 : 0;
  return (
    <group position={position}>
      <Piece g={geo.rrect(0.28, 0.14, 0.05, 0.18)} c="#b71c1c" p={[0, 0.07, 0]} />
      <group position={[0, 0.18 + Math.abs(j), 0]} rotation={[0, 0, j * 3]}>
        <Piece g={geo.rrect(0.34, 0.07, 0.035, 0.08)} c="#d32f2f" />
      </group>
    </group>
  );
};

// ---------- лампа ----------
export const SwingLamp: React.FC<{ position: [number, number, number]; t: number; len?: number; amp?: number; alarm?: number }> = ({ position, t, len = 1.4, amp = 0.22, alarm = 0 }) => {
  const a = Math.sin(t * 2.2) * amp;
  return (
    <group position={position} rotation={[0, 0, a]}>
      <mesh position={[0, -len / 2, 0]} material={paper("#111")}><boxGeometry args={[0.02, len, 0.02]} /></mesh>
      <group position={[0, -len, 0]}>
        <Piece g={geo.arc(0.36, 0.26, 0, Math.PI, 0.05)} c="#2f4a34" p={[0, -0.02, 0]} />
        <Piece g={geo.ellipse(0.1, 0.08, 0.04)} c="#fff4c2" m={glow(alarm > 0 ? "#ff8080" : "#fff1b0")} p={[0, -0.04, 0.03]} />
        <mesh position={[0, -1.25, -0.02]} material={glow(alarm > 0 ? "#ff5050" : "#fff0b0", 0.09)} geometry={geo.poly("cone", [[-0.32, 1.22], [0.32, 1.22], [1.1, -1.2], [-1.1, -1.2]], 0, 0.005)} />
        <pointLight position={[0, -0.3, 0.4]} intensity={alarm > 0 ? 2 : 4} distance={7} decay={1.2} color={alarm > 0 ? "#ff6060" : "#ffd79a"} />
      </group>
    </group>
  );
};

// ---------- красная мигалка ----------
export const Beacon: React.FC<{ position: [number, number, number]; t: number; on: boolean }> = ({ position, t, on }) => {
  const ph = Math.floor(t * 8) % 2;
  return (
    <group position={position}>
      <Piece g={geo.rrect(0.32, 0.1, 0.02, 0.1)} c="#222" />
      <Piece g={geo.arc(0.14, 0.2, 0, Math.PI, 0.12)} c="#7a1010" m={on && ph ? glow("#ff2a2a") : paper("#7a1010")} p={[0, 0.05, 0]} />
      {on && ph === 1 && <mesh position={[0, 0.1, 0.1]} material={glow("#ff2020", 0.22)}><circleGeometry args={[0.7, 24]} /></mesh>}
    </group>
  );
};

// ---------- дверь ----------
export function drawDoor(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#5c6660"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#39413c"; g.lineWidth = 10; g.strokeRect(18, 18, W - 36, H - 36);
  g.fillStyle = "#39413c";
  for (let i = 0; i < 6; i++) for (const x of [36, W - 36]) { g.beginPath(); g.arc(x, 60 + i * (H - 120) / 5, 7, 0, 7); g.fill(); }
  g.fillStyle = "#e0b22a"; g.fillRect(40, H * 0.12, W - 80, H * 0.08);
  g.font = `900 ${Math.floor(W * 0.13)}px ${FONT}`; g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("ПОСТОРОННИМ", W / 2, H * 0.16);
  g.fillStyle = "#2a2f2c"; g.fillRect(W * 0.12, H * 0.5, W * 0.12, H * 0.05);
}
export const BunkerDoor: React.FC<{ position: [number, number, number]; open: number }> = ({ position, open }) => (
  <group position={position}>
    <Piece g={geo.rrect(1.35, 2.45, 0.04, 0.06)} c="#202422" p={[0, 1.2, 0.0]} />
    <Piece g={geo.rrect(1.1, 2.2, 0.0, 0.02)} c="#0b0d0c" p={[0, 1.1, 0.03]} />
    {/* полоса света из коридора, когда открыто */}
    {open > 0.05 && <mesh position={[0, 1.1, 0.045]} material={glow("#f4e7b0", 0.85)}><planeGeometry args={[1.05 * clamp01(open), 2.15]} /></mesh>}
    <group position={[0.55, 0, 0.06]} rotation={[0, open * 1.75, 0]}>
      <CanvasPlane texKey="bdoor" w={1.1} h={2.2} px={256} glowing={false} draw={drawDoor} position={[-0.55, 1.1, 0.0]} />
      <mesh position={[-0.55, 1.1, -0.02]} material={paper("#4b544f")}><boxGeometry args={[1.1, 2.2, 0.035]} /></mesh>
    </group>
  </group>
);

// ---------- вещи на спине у геймеров ----------
export const Gear: React.FC<{ kind: number; s?: number }> = ({ kind, s = 1 }) => {
  const k = kind % 4;
  return (
    <group scale={s}>
      {k === 0 && (<>
        <Piece g={geo.poly("ps", [[-0.18, -0.35], [0.18, -0.35], [0.24, 0.35], [-0.12, 0.38]], 0.06, 0.05)} c="#f4f4f4" />
        <Piece g={geo.rrect(0.1, 0.7, 0.02, 0.055)} c="#151515" p={[0.02, 0, 0]} />
      </>)}
      {k === 1 && (<>
        <Piece g={geo.rrect(0.42, 0.5, 0.03, 0.06)} c="#161616" />
        <Piece g={geo.ellipse(0.06, 0.06, 0.065)} c="#3cb043" p={[0, 0.12, 0]} />
      </>)}
      {k === 2 && (<>
        <Piece g={geo.rrect(0.95, 0.6, 0.03, 0.05)} c="#222" />
        <Piece g={geo.rrect(0.86, 0.5, 0.02, 0.055)} c="#3b4b6b" />
      </>)}
      {k === 3 && (<>
        <Piece g={geo.rrect(0.4, 0.62, 0.03, 0.06)} c="#2d2d2d" />
        <Piece g={geo.rrect(0.04, 0.5, 0.01, 0.065)} c="#ff2fd0" m={glow("#ff2fd0")} p={[-0.13, 0, 0]} />
        <Piece g={geo.rrect(0.04, 0.5, 0.01, 0.065)} c="#00e5ff" m={glow("#00e5ff")} p={[0.13, 0, 0]} />
      </>)}
      {/* скотч */}
      <Piece g={geo.rrect(k === 2 ? 1.0 : 0.56, 0.07, 0.0, 0.07)} c="#cfae5a" p={[0, -0.12, 0.005]} r={0.05} />
    </group>
  );
};

export const Pad: React.FC = () => (
  <group>
    <Piece g={geo.rrect(0.2, 0.1, 0.04, 0.05)} c="#1d1d1d" />
    <Piece g={geo.ellipse(0.018, 0.018, 0.06)} c="#e53935" p={[0.05, 0.01, 0]} />
  </group>
);

// ---------- бункер целиком ----------
export interface RoomState {
  t: number;
  alarm?: boolean;        // красная тревога
  dark?: number;          // 0..1 затемнение (зловещий момент)
  doorOpen?: number;      // 0..1
  backView?: boolean;     // персонажи заменяются силуэтами (план от стены к экрану)
  hide?: string[];        // кого не рисовать
  pm?: Partial<CharacterProps>;
  agri?: Partial<CharacterProps> | null;
  def?: Partial<CharacterProps> | null;
  extras?: Record<string, Partial<CharacterProps>>;
  tableJump?: number;     // подскок вещей на столе
  mug?: React.ReactNode;  // падающая кружка (мировые координаты)
  stamp?: boolean;        // штамп «ВТОРЖЕНИЕ» на карте
}

export const PM_POS: [number, number, number] = [0, 0, -3.55];
export const SEATS: Record<string, [number, number, number]> = {
  bun: [-0.98, 0.26, -2.15], curly: [0.98, 0.26, -2.15], old: [-0.98, 0.26, -0.75], slick: [0.98, 0.26, -0.75],
};
export const DEF_POS: [number, number, number] = [-1.95, 0, -3.35];

export const Room: React.FC<RoomState> = (s) => {
  const { t } = s;
  const alarmOn = !!s.alarm;
  const flash = alarmOn ? (Math.floor(t * 4) % 2 === 0 ? 1 : 0.35) : 0;
  const dark = s.dark ?? 0;
  const amb = (alarmOn ? 0.62 : 1.12) * (1 - dark * 0.6);
  const jump = s.tableJump ?? 0;
  const hide = new Set(s.hide ?? []);
  const sitM = (k: string) => {
    const p = SEATS[k];
    const ex = { ...EXTRAS[k], ...(s.extras?.[k] ?? {}) };
    if (s.backView) return <BackOf key={k} position={[p[0], 0.18, p[2]]} sit hair={k === "bun" ? "bun" : k === "curly" ? "curly" : "none"} />;
    return <Character key={k} {...ex} legs="sit" position={p} />;
  };
  return (
    <group>
      <ambientLight intensity={1.1 * amb} color={alarmOn ? "#ffb0a8" : "#d6e6d4"} />
      <hemisphereLight args={["#e8f2ea", "#3a3f3a", 0.5 * amb]} />
      <directionalLight position={[2, 6, 6]} intensity={1.0 * amb} color={alarmOn ? "#ffd0c8" : "#f1f6e8"} />
      {/* свет экрана спереди */}
      <pointLight position={[0, 2.6, 3.6]} intensity={(alarmOn ? 3 : 4) * (1 - dark * 0.3)} distance={11} decay={1} color={alarmOn ? "#ff5a5a" : "#7fdcff"} />
      {alarmOn && <pointLight position={[0, 4.2, -2]} intensity={7 * flash} distance={12} decay={1} color="#ff1a1a" />}

      {/* пол, стены, потолок */}
      <Sheet w={8} h={14} color="#363d39" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
      <CanvasPlane texKey="concBack" w={8} h={5.2} px={1024} glowing={false} draw={drawConcrete(3, "ОПЕРАТИВНЫЙ ШТАБ · ВЕЛЛИНГТОН")} position={[0, 2.6, -5]} />
      <CanvasPlane texKey="concL" w={14} h={5.2} px={1024} glowing={false} draw={drawConcrete(4)} position={[-3.2, 2.6, 0]} rotation={[0, Math.PI / 2, 0]} />
      <CanvasPlane texKey="concR" w={14} h={5.2} px={1024} glowing={false} draw={drawConcrete(5)} position={[3.2, 2.6, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <CanvasPlane texKey="concF" w={8} h={5.2} px={1024} glowing={false} draw={drawConcrete(6)} position={[0, 2.6, 5.2]} rotation={[0, Math.PI, 0]} />
      <Sheet w={8} h={14} color="#262a28" rotation={[Math.PI / 2, 0, 0]} position={[0, 5.2, 0]} />
      {/* трубы под потолком */}
      {[-2.6, 2.7].map((x, i) => <mesh key={i} position={[x, 4.75, 0]} rotation={[Math.PI / 2, 0, 0]} material={paper(i ? "#7a5b2e" : "#4d5a52")}><cylinderGeometry args={[0.12, 0.12, 14, 10]} /></mesh>)}

      {/* задняя стена: флаги, часы, дверь, мигалка */}
      <Flag position={[-1.25, 0, -4.85]} t={t} />
      <Flag position={[0.75, 0, -4.85]} t={t} seed={3} />
      <group position={[-0.25, 3.55, -4.93]}>
        <Piece g={geo.ellipse(0.42, 0.42, 0.06)} c="#1c1c1c" />
        <Piece g={geo.ellipse(0.36, 0.36, 0.07)} c="#f2efe2" />
        <Piece g={geo.rrect(0.04, 0.26, 0.02, 0.08)} c="#111" p={[0.06, 0.1, 0.01]} r={-0.5} />
        <Piece g={geo.rrect(0.03, 0.32, 0.02, 0.08)} c="#c62828" p={[0, 0, 0.02]} r={-t * 6} />
      </group>
      <BunkerDoor position={[2.05, 0, -4.97]} open={s.doorOpen ?? 0} />
      <Beacon position={[-2.3, 4.2, -4.9]} t={t} on={alarmOn} />
      <Beacon position={[2.05, 2.75, -4.9]} t={t + 0.13} on={alarmOn} />
      {/* огромный экран на передней стене */}
      <group position={[0, 2.75, 5.12]} rotation={[0, Math.PI, 0]}>
        <BigScreen t={t} alarm={alarmOn ? 1 : 0} stamp={!!s.alarm || !!s.stamp} />
      </group>

      {/* стол */}
      <group position={[0, 0, -0.9]}>
        <mesh position={[0, 0.6, 0]} material={paper("#5a3b26")}><boxGeometry args={[1.35, 0.08, 4.3]} /></mesh>
        <mesh position={[0, 0.64, 0]} material={paper("#2f5a3a")}><boxGeometry args={[1.15, 0.01, 4.1]} /></mesh>
        <mesh position={[0, 0.32, 0]} material={paper("#3f2a1b")}><boxGeometry args={[1.1, 0.5, 4.0]} /></mesh>
        <group position={[0, jump, 0]}>
          <Folder position={[-0.32, 0.66, -1.3]} rot={0.2} />
          <Folder position={[0.3, 0.66, 0.1]} rot={-0.3} color="#2c3e66" />
          <Folder position={[-0.3, 0.66, 1.0]} rot={0.1} color="#c0392b" />
          <RedPhone position={[-0.35, 0.65, -2.0]} t={t} ring={alarmOn} />
          <group position={[-0.38, 0.73, 0.3]} rotation={[0, 0, jump * 8]}><Mug /></group>
          <group position={[0.36, 0.73, 1.25]} rotation={[0, 0, -jump * 6]}><Mug coffee={false} /></group>
          {[-1.5, -0.1].map((z, i) => (
            <group key={i} position={[i ? 0.45 : -0.45, 0.66, z]}>
              <mesh position={[0, 0.12, 0]} material={paper("#111")}><cylinderGeometry args={[0.012, 0.012, 0.24, 6]} /></mesh>
              <Piece g={geo.ellipse(0.035, 0.05, 0.05)} c="#222" p={[0, 0.26, 0]} />
            </group>
          ))}
        </group>
      </group>
      {/* кресла */}
      {Object.entries(SEATS).filter(([k]) => !hide.has(k)).map(([k, p]) => (
        <group key={k} position={[p[0], 0, p[2] - 0.22]}>
          <Piece g={geo.rrect(0.95, 1.15, 0.12, 0.1)} c="#2a2320" p={[0, 1.0, 0]} />
          <mesh position={[0, 0.3, 0.25]} material={paper("#2a2320")}><boxGeometry args={[0.85, 0.1, 0.5]} /></mesh>
        </group>
      ))}
      <group position={[PM_POS[0], 0, PM_POS[2] - 0.3]}>
        <Piece g={geo.rrect(1.05, 1.7, 0.14, 0.1)} c="#4a1f1f" p={[0, 1.15, 0]} />
        <Piece g={geo.ellipse(0.12, 0.12, 0.11)} c="#e3b23c" p={[0, 1.75, 0.01]} />
      </group>

      {/* министры */}
      {Object.keys(SEATS).filter((k) => !hide.has(k)).map(sitM)}
      {!hide.has("pm") && (s.backView
        ? <BackOf position={PM_POS} hair="combover" color="#141816" />
        : <Character {...CAST.pm} position={PM_POS} {...s.pm} />)}
      {s.def && !hide.has("def") && <Character {...CAST.defense} position={DEF_POS} {...s.def} />}
      {s.agri && !hide.has("agri") && <Character {...CAST.agri} {...s.agri} />}
      {s.mug}

      <SwingLamp position={[0, 5.2, -1.6]} t={t} len={1.9} alarm={alarmOn ? 1 : 0} amp={alarmOn ? 0.4 : 0.18} />
      {/* пыль в воздухе */}
      {dark < 0.5 && [0, 1, 2, 3, 4, 5].map((i) => {
        const x = (hash(i) - 0.5) * 4, y = 1.5 + hash(i + 9) * 2.5 + Math.sin(t * 0.7 + i) * 0.1;
        return <mesh key={i} position={[x, y, -1 + hash(i + 3) * 3]} material={glow("#e8f0d8", 0.25)}><circleGeometry args={[0.015, 6]} /></mesh>;
      })}
      {void easeInOut}
    </group>
  );
};

export { Puff, THREE };
