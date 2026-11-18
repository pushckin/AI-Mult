// Хелперы сцены p2/finale: Новая Зеландия из космоса, интерьеры с таймером, овцы, взрывы, опоры ЛЭП.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CanvasPlane, Sheet } from "../../kit/Stage";
import { paper, glow, geo, rng, FONT, Pt } from "../../kit/paper";
import { Piece } from "../../kit/Character";
import { hash, clamp01, easeOut } from "../../kit/anim";

// ---------- Новая Зеландия (контуры по долготе/широте) ----------
const NORTH: Pt[] = [[172.7, -34.4], [173.4, -35.0], [174.3, -35.7], [174.8, -36.7], [175.5, -36.4], [175.9, -37.5], [176.9, -37.9], [178.0, -37.6], [178.5, -38.4], [177.9, -39.1], [177.0, -39.2], [176.9, -39.7], [176.3, -40.6], [175.4, -41.6], [174.8, -41.35], [175.1, -40.6], [174.8, -39.9], [174.0, -39.55], [173.75, -39.2], [174.6, -38.7], [174.7, -37.6], [174.3, -36.6], [173.5, -35.5]];
const SOUTH: Pt[] = [[172.6, -40.5], [173.1, -41.0], [174.0, -40.9], [174.3, -41.7], [173.7, -42.4], [172.8, -43.1], [173.15, -43.8], [172.3, -43.95], [171.2, -44.4], [170.8, -45.8], [169.6, -46.6], [168.3, -46.65], [166.5, -46.0], [166.8, -45.2], [168.2, -44.0], [170.2, -43.0], [171.3, -42.0], [171.5, -41.5], [172.1, -40.9]];
const STEWART: Pt[] = [[167.6, -46.75], [168.2, -46.8], [168.15, -47.2], [167.6, -47.25], [167.45, -47.0]];
const K = 0.25;
export const proj = (lon: number, lat: number): Pt => [(lon - 172.5) * 0.755 * K, (lat + 41) * K];
export const ISLANDS: Pt[][] = [NORTH, SOUTH, STEWART].map((poly) => poly.map(([lo, la]) => proj(lo, la)));
const BX0 = -1.3, BX1 = 1.3, BY0 = -1.75, BY1 = 1.8; // рамка текстур над островами
const BW = BX1 - BX0, BH = BY1 - BY0;
const toPx = (p: Pt, W: number, H: number): Pt => [((p[0] - BX0) / BW) * W, ((BY1 - p[1]) / BH) * H];
const CITIES: Pt[] = [[174.76, -36.85], [174.78, -41.29], [172.63, -43.53], [175.28, -37.79], [170.5, -45.87], [176.25, -38.14], [176.9, -39.5], [173.28, -41.27], [168.35, -46.41], [175.6, -40.35], [174.07, -39.06]].map(([a, b]) => proj(a, b));

function islandPath(g: CanvasRenderingContext2D, W: number, H: number) {
  g.beginPath();
  for (const poly of ISLANDS) {
    poly.forEach((p, i) => { const [x, y] = toPx(p, W, H); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath();
  }
}

/** Огни страны: lit — тёплые окна; neon — загрузочный неон; arcs — искрящие дуги (вариант кадра) */
function drawLights(g: CanvasRenderingContext2D, W: number, H: number, mode: "lit" | "neon") {
  g.clearRect(0, 0, W, H);
  g.save();
  islandPath(g, W, H);
  g.clip();
  const r = rng(mode === "lit" ? 11 : 12);
  if (mode === "neon") {
    const gr = g.createLinearGradient(0, 0, W * 0.3, H);
    gr.addColorStop(0, "#ff2fd0"); gr.addColorStop(0.5, "#ff8a3d"); gr.addColorStop(1, "#22e6ff");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.5; g.fillStyle = "#fff";
    for (let y = 0; y < H; y += 14) g.fillRect(0, y, W, 4);
    g.globalAlpha = 1;
  } else {
    g.fillStyle = "rgba(255,190,60,0.22)"; g.fillRect(0, 0, W, H);
    // все окна страны: ровная россыпь
    for (let i = 0; i < 2600; i++) {
      const x = r() * W, y = r() * H;
      g.fillStyle = r() < 0.75 ? "#ffd54a" : r() < 0.5 ? "#fff3b0" : "#7ff3ff";
      g.fillRect(x, y, 3 + r() * 3, 3 + r() * 3);
    }
    // города — плотные пятна
    for (const c of CITIES) {
      const [cx, cy] = toPx(c, W, H);
      for (let i = 0; i < 220; i++) {
        const a = r() * 6.28, d = Math.pow(r(), 1.8) * W * 0.07;
        g.fillStyle = r() < 0.8 ? "#fff6c4" : "#ffd54a";
        g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, 4);
      }
    }
  }
  g.restore();
}
function drawHalo(g: CanvasRenderingContext2D, W: number, H: number, c0: string, c1: string) {
  g.clearRect(0, 0, W, H);
  const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  gr.addColorStop(0, c0); gr.addColorStop(0.45, c1); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function drawArcs(g: CanvasRenderingContext2D, W: number, H: number, v: number) {
  g.clearRect(0, 0, W, H);
  const r = rng(100 + v);
  g.lineJoin = "round";
  for (let k = 0; k < 9; k++) {
    // от случайной точки побережья — зигзаг наружу
    const poly = ISLANDS[k % 2];
    const p = poly[Math.floor(r() * poly.length)];
    let [x, y] = toPx(p, W, H);
    const a = r() * 6.28;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += Math.cos(a) * 16 + (r() - 0.5) * 34; y += Math.sin(a) * 16 + (r() - 0.5) * 34; g.lineTo(x, y); }
    g.strokeStyle = "#7ff3ff"; g.lineWidth = 7; g.globalAlpha = 0.5; g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.globalAlpha = 1; g.stroke();
  }
}

export const Stars: React.FC<{ z?: number; w?: number; h?: number }> = ({ z = -60, w = 140, h = 220 }) => (
  <CanvasPlane texKey="fin_stars" w={w} h={h} px={1024} position={[0, 0, z]} draw={(g, W, H) => {
    g.fillStyle = "#04060e"; g.fillRect(0, 0, W, H);
    const r = rng(5);
    for (let i = 0; i < 900; i++) {
      const s = r() < 0.92 ? 1.5 : 3.5;
      g.fillStyle = r() < 0.8 ? "#ffffff" : "#ffe9a8";
      g.globalAlpha = 0.4 + r() * 0.6;
      g.fillRect(r() * W, r() * H, s, s);
    }
    g.globalAlpha = 1;
  }} />
);

/** Земля (ночная сторона) + острова НЗ. lights 0..1 — яркость огней, neon 0..1, buzz — гудящий трансформатор, rings — 0..1 волна крика */
export const SpaceNZ: React.FC<{ t: number; lights: number; neon?: number; buzz?: number; rings?: number; burn?: number }> = ({ t, lights, neon = 0, buzz = 0, rings = -1, burn = 0 }) => {
  const sphere = useMemo(() => new THREE.SphereGeometry(6, 64, 48), []);
  const ring = useMemo(() => new THREE.RingGeometry(5.95, 6.45, 96), []);
  const tq = Math.floor(t * 12);
  const hum = 0.85 + 0.15 * Math.sin(tq * 2.7) ;
  const dark = lights <= 0.01 && neon <= 0.01;
  return (
    <group>
      <mesh geometry={sphere} position={[0, 0, -6.02]} material={paper(dark ? "#0b1830" : "#163a6e")} />
      <mesh geometry={ring} position={[0, 0, -6.02]} material={glow(dark ? "#1d3a66" : "#4fa3ff", 0.45)} />
      {/* бумажные облака */}
      {[[-1.8, 1.9, 0.9], [1.7, -0.9, 0.7], [-1.5, -2.4, 0.8], [2.0, 2.6, 0.6]].map(([x, y, s], i) => (
        <mesh key={i} geometry={geo.ellipse(s, s * 0.32, 0.02)} position={[x, y, 0.02 - (x * x + y * y) / 12]} material={paper(dark ? "#2a3a55" : "#9fb3cf", { opacity: 0.85 })} />
      ))}
      {/* острова — вырезанная бумага */}
      {ISLANDS.map((poly, i) => (
        <mesh key={i} geometry={geo.poly("nz" + i, poly, 0.02, 0.07)} position={[0, 0, 0.06]} material={paper(dark ? "#141a14" : neon > 0.5 ? "#3a1450" : "#2c5a33")} />
      ))}
      {burn > 0 && CITIES.slice(0, 8).map((c, i) => (
        <mesh key={"b" + i} geometry={geo.ellipse(0.05, 0.05, 0.01)} position={[c[0], c[1], 0.12]} material={glow(i % 2 ? "#ff7a1a" : "#ffcc33", burn * (0.5 + 0.5 * hash(tq + i)))} />
      ))}
      {lights > 0.01 && (
        <>
          <CanvasPlane texKey="fin_halo_lit" w={6.5} h={7.5} px={256} position={[0, 0, 0.03]} transparent opacity={0.55 * lights * hum} draw={(g, W, H) => drawHalo(g, W, H, "rgba(255,210,90,0.9)", "rgba(255,170,40,0.35)")} />
          <CanvasPlane texKey="fin_lights_lit" w={BW} h={BH} px={512} position={[0, 0, 0.11]} transparent opacity={lights} draw={(g, W, H) => drawLights(g, W, H, "lit")} />
        </>
      )}
      {neon > 0.01 && (
        <>
          <CanvasPlane texKey="fin_halo_neon" w={9} h={10} px={256} position={[0, 0, 0.035]} transparent opacity={0.9 * neon} draw={(g, W, H) => drawHalo(g, W, H, "rgba(255,60,210,1)", "rgba(40,220,255,0.45)")} />
          <CanvasPlane texKey="fin_lights_neon" w={BW} h={BH} px={512} position={[0, 0, 0.115]} transparent opacity={neon} draw={(g, W, H) => drawLights(g, W, H, "neon")} />
        </>
      )}
      {buzz > 0.01 && (
        <CanvasPlane texKey={"fin_arcs" + (tq % 4)} w={BW} h={BH} px={512} position={[0, 0, 0.13]} transparent opacity={buzz} draw={(g, W, H) => drawArcs(g, W, H, tq % 4)} />
      )}
      {rings >= 0 && [0, 0.33, 0.66].map((o, i) => {
        const k = (rings + o) % 1;
        const s = 0.4 + k * 3.2;
        return <mesh key={"r" + i} position={[0.1, -0.2, 0.2]} scale={[s, s, 1]} geometry={RING_UNIT} material={glow("#ff3b3b", 0.75 * (1 - k))} />;
      })}
    </group>
  );
};
const RING_UNIT = new THREE.RingGeometry(0.9, 1.0, 64);

// ---------- таймер ----------
export const timerText = (sec: number) => `00:00:0${Math.max(0, sec)}`;
export function drawTimerScreen(g: CanvasRenderingContext2D, W: number, H: number, sec: number, hue = "#7ff3ff") {
  g.fillStyle = "#08122a"; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(127,243,255,0.08)";
  for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 ${Math.floor(H * 0.13)}px ${FONT}`;
  g.fillStyle = "#ff4fd8"; g.fillText("GTA VI · РЕЛИЗ", W / 2, H * 0.2);
  g.font = `900 ${Math.floor(Math.min(H * 0.42, W * 0.2))}px ${FONT}`;
  g.shadowColor = hue; g.shadowBlur = H * 0.06;
  g.fillStyle = sec === 0 ? "#ffe14d" : hue; g.fillText(timerText(sec), W / 2, H * 0.6);
  g.shadowBlur = 0;
}

/** «Интерьер» окна/сарая/палатки: экран с таймером и силуэты затылков геймеров */
export function drawInterior(g: CanvasRenderingContext2D, W: number, H: number, sec: number, variant: number, wall = "#d99a3e") {
  const r = rng(variant * 31 + 7);
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // синий отсвет экрана
  const gr = g.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.7);
  gr.addColorStop(0, "rgba(120,220,255,0.65)"); gr.addColorStop(1, "rgba(120,220,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // экран
  const sx = W * 0.12, sy = H * 0.1, sw = W * 0.76, sh = H * 0.42;
  g.fillStyle = "#111"; g.fillRect(sx - 6, sy - 6, sw + 12, sh + 12);
  g.save(); g.translate(sx, sy);
  drawTimerScreen(g, sw, sh, sec);
  g.restore();
  // затылки
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * W + (r() - 0.5) * W * 0.06;
    const hy = H * (0.62 + r() * 0.08);
    const hr = W * (0.065 + r() * 0.02);
    g.fillStyle = "#1c1424";
    const back = r();
    if (back < 0.35) { g.fillStyle = "#f2f2f2"; g.fillRect(x - hr * 0.6, hy - hr * 0.2, hr * 1.2, hr * 2.4); g.fillStyle = "#111"; g.fillRect(x - hr * 0.15, hy - hr * 0.2, hr * 0.3, hr * 2.4); }
    else if (back < 0.55) { g.fillStyle = "#222"; g.fillRect(x - hr * 1.3, hy, hr * 2.6, hr * 1.6); g.fillStyle = "#3b4b6b"; g.fillRect(x - hr * 1.15, hy + hr * 0.15, hr * 2.3, hr * 1.3); }
    g.fillStyle = "#1c1424";
    g.beginPath(); g.arc(x, hy, hr, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x, H, hr * 1.9, H - hy - hr * 0.2, 0, Math.PI, 0); g.fill();
    if (r() < 0.4) { g.fillRect(x - hr * 0.2, hy - hr * 2.2, hr * 0.4, hr * 1.4); g.fillRect(x - hr * 0.7, hy - hr * 2.6, hr * 1.4, hr * 0.6); } // руки с геймпадом вверх
  }
}

// ---------- предметы ----------
export const Gamepad: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s} position={[0, 0, 0.05]}>
    <Piece g={geo.rrect(0.34, 0.15, 0.07, 0.03)} c="#26262b" />
    <Piece g={geo.ellipse(0.025, 0.025, 0.015)} c="#e74c3c" p={[0.09, 0.02, 0.03]} />
    <Piece g={geo.ellipse(0.025, 0.025, 0.015)} c="#2ecc71" p={[0.12, -0.02, 0.03]} />
    <Piece g={geo.rrect(0.07, 0.022, 0.01, 0.015)} c="#999" p={[-0.09, 0, 0.03]} />
    <Piece g={geo.rrect(0.022, 0.07, 0.01, 0.015)} c="#999" p={[-0.09, 0, 0.03]} />
  </group>
);
export const Phone: React.FC<{ lit?: number; s?: number }> = ({ lit = 1, s = 1 }) => (
  <group scale={s} position={[0, 0.06, 0.06]}>
    <Piece g={geo.rrect(0.16, 0.28, 0.03, 0.03)} c="#111" />
    <mesh position={[0, 0, 0.025]} material={glow(lit > 0.5 ? "#cfe6ff" : "#4a5a7a")}>
      <planeGeometry args={[0.13, 0.24]} />
    </mesh>
  </group>
);

export const Sheep: React.FC<{ position: [number, number, number]; s?: number; eyes?: "open" | "closed" | "glow"; flip?: boolean; wool?: string }> = ({ position, s = 1, eyes = "open", flip, wool = "#f4f1e8" }) => (
  <group position={position} scale={[flip ? -s : s, s, s]}>
    {[[-0.18, 0.55, 0.22], [0.05, 0.6, 0.25], [0.25, 0.52, 0.2], [0, 0.42, 0.26], [-0.25, 0.4, 0.18], [0.25, 0.38, 0.18]].map(([x, y, r], i) => (
      <Piece key={i} g={geo.ellipse(r, r * 0.9, 0.05)} c={wool} p={[x, y, i * 0.01]} />
    ))}
    {[-0.2, -0.05, 0.12, 0.25].map((x, i) => <Piece key={"l" + i} g={geo.rrect(0.06, 0.3, 0.02, 0.03)} c="#1d1d1d" p={[x, 0.15, -0.02]} />)}
    <Piece g={geo.ellipse(0.15, 0.19, 0.04)} c="#1d1d1d" p={[0.42, 0.62, 0.08]} r={-0.3} />
    <Piece g={geo.ellipse(0.09, 0.04, 0.03)} c="#1d1d1d" p={[0.36, 0.76, 0.05]} r={0.5} />
    {eyes === "closed"
      ? <Piece g={geo.rrect(0.1, 0.018, 0.008, 0.015)} c="#eee" p={[0.45, 0.66, 0.12]} />
      : [0.39, 0.5].map((x, i) => (
        <group key={i}>
          <Piece g={geo.ellipse(0.04, 0.045, 0.015)} c={eyes === "glow" ? "#fff6a0" : "#fbfbf6"} m={eyes === "glow" ? glow("#fff6a0") : undefined} p={[x, 0.66, 0.12]} />
          <Piece g={geo.ellipse(0.015, 0.015, 0.015)} c="#111" p={[x + 0.01, 0.66, 0.135]} />
        </group>
      ))}
  </group>
);

/** Бумажный взрыв: k — 0..1 прогресс, size — радиус */
const STAR = (n: number, r0: number, r1: number, seed: number): Pt[] => {
  const r = rng(seed); const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? r0 * (0.8 + r() * 0.3) : r1 * (0.85 + r() * 0.3); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return pts;
};
const BOOM_RED = STAR(11, 0.62, 1.0, 3), BOOM_OR = STAR(9, 0.55, 0.85, 4), BOOM_YE = STAR(8, 0.45, 0.68, 5);
export const Fireball: React.FC<{ position: [number, number, number]; k: number; size?: number; seed?: number }> = ({ position, k, size = 1, seed = 0 }) => {
  if (k <= 0 || k >= 1) return null;
  const grow = easeOut(Math.min(1, k * 2.4));
  const s = size * (0.25 + 0.9 * grow);
  const fade = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
  const rot = seed + Math.floor(k * 10) * 0.12;
  return (
    <group position={position}>
      {k > 0.3 && [0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * size * 0.45, size * (0.6 + k * 1.2) + i * 0.1, -0.05]} geometry={geo.ellipse(size * 0.35, size * 0.3, 0.02)} material={paper(i % 2 ? "#3a3438" : "#4b4448", { opacity: 0.9 * fade })} />
      ))}
      <group scale={[s, s, 1]} rotation={[0, 0, rot]}>
        <mesh geometry={geo.poly("boomR", BOOM_RED, 0.02, 0.03)} material={glow("#e8401c", fade)} />
        <mesh position={[0, 0, 0.03]} rotation={[0, 0, 0.3]} geometry={geo.poly("boomO", BOOM_OR, 0.02, 0.03)} material={glow("#ff9a1f", fade)} />
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, -0.2]} geometry={geo.poly("boomY", BOOM_YE, 0.02, 0.03)} material={glow("#ffe14d", fade)} />
        {k < 0.45 && <mesh position={[0, 0, 0.09]} geometry={geo.ellipse(0.3, 0.3, 0.02)} material={glow("#fffbe6")} />}
      </group>
    </group>
  );
};

/** Решётчатая опора ЛЭП (бумажные полоски) */
export const Pylon: React.FC<{ position?: [number, number, number]; rot?: number; s?: number; color?: string }> = ({ position, rot = 0, s = 1, color = "#9aa3ad" }) => (
  <group position={position} rotation={[0, 0, rot]} scale={s}>
    <Piece g={geo.rrect(0.07, 3.1, 0.01, 0.04)} c={color} p={[-0.33, 1.5, 0]} r={-0.11} />
    <Piece g={geo.rrect(0.07, 3.1, 0.01, 0.04)} c={color} p={[0.33, 1.5, 0]} r={0.11} />
    {[0.4, 0.95, 1.5, 2.05].map((y, i) => {
      const w = 0.66 - y * 0.2;
      return <group key={i}>
        <Piece g={geo.rrect(Math.hypot(w, 0.5), 0.04, 0.01, 0.03)} c={color} p={[0, y + 0.25, 0.02]} r={Math.atan2(0.5, w)} />
        <Piece g={geo.rrect(Math.hypot(w, 0.5), 0.04, 0.01, 0.03)} c={color} p={[0, y + 0.25, 0.02]} r={-Math.atan2(0.5, w)} />
      </group>;
    })}
    <Piece g={geo.rrect(1.6, 0.08, 0.01, 0.04)} c={color} p={[0, 2.6, 0.03]} />
    <Piece g={geo.rrect(1.1, 0.08, 0.01, 0.04)} c={color} p={[0, 3.0, 0.03]} />
    {[-0.75, 0.75, -0.5, 0.5].map((x, i) => <Piece key={i} g={geo.rrect(0.05, 0.2, 0.02, 0.03)} c="#e8e8e8" p={[x, i < 2 ? 2.5 : 2.9, 0.05]} />)}
  </group>
);

/** Градирня (силуэт с изгибом) */
const TOWER: Pt[] = [[-0.9, 0], [0.9, 0], [0.62, 1.2], [0.58, 1.6], [0.66, 2.1], [-0.66, 2.1], [-0.58, 1.6], [-0.62, 1.2]];
export const CoolingTower: React.FC<{ position: [number, number, number]; s?: number; color?: string }> = ({ position, s = 1, color = "#b9b4a8" }) => (
  <group position={position} scale={s}>
    <Piece g={geo.poly("ctower", TOWER, 0.08, 0.05)} c={color} />
    <Piece g={geo.rrect(1.2, 0.12, 0.02, 0.02)} c="#c0392b" p={[0, 1.85, 0.04]} />
  </group>
);
export const CellTower: React.FC<{ position: [number, number, number]; s?: number; rot?: number }> = ({ position, s = 1, rot = 0 }) => (
  <group position={position} scale={s} rotation={[0, 0, rot]}>
    {[0, 1, 2, 3, 4, 5].map((i) => <Piece key={i} g={geo.rrect(0.12 - i * 0.012, 0.5, 0.01, 0.04)} c={i % 2 ? "#e8e8e8" : "#d63031"} p={[0, 0.25 + i * 0.5, 0]} />)}
    <Piece g={geo.rrect(0.5, 0.08, 0.02, 0.03)} c="#888" p={[0, 2.6, 0.03]} />
    <Piece g={geo.ellipse(0.16, 0.16, 0.03)} c="#ddd" p={[0.18, 2.2, 0.05]} />
    <Piece g={geo.rrect(0.08, 0.28, 0.02, 0.03)} c="#ccc" p={[-0.22, 2.75, 0.03]} />
    <Piece g={geo.rrect(0.08, 0.28, 0.02, 0.03)} c="#ccc" p={[0.22, 2.75, 0.03]} />
  </group>
);

/** Искры: мерцающие крестики-звёздочки */
export const Sparks: React.FC<{ t: number; at: [number, number, number][]; s?: number; color?: string }> = ({ t, at, s = 1, color = "#ffe680" }) => {
  const tq = Math.floor(t * 12);
  return <>{at.map((p, i) => {
    const on = hash(tq * 3.1 + i * 7.7);
    if (on < 0.45) return null;
    const sc = s * (0.5 + on * 0.7);
    return <group key={i} position={p} scale={[sc, sc, 1]} rotation={[0, 0, on * 3]}>
      <mesh geometry={geo.poly("spark", STAR(4, 0.03, 0.14, 9), 0, 0.01)} material={glow(color)} />
    </group>;
  })}</>;
};

/** Бумажный дымок (тонкие тёмные облачка, всплывают) */
export const Smoke: React.FC<{ t: number; at: [number, number, number]; n?: number; s?: number; color?: string; opacity?: number; rise?: number }> = ({ t, at, n = 4, s = 1, color = "#5a5a60", opacity = 0.7, rise = 0.6 }) => (
  <>{Array.from({ length: n }, (_, i) => {
    const ph = ((t * 0.5 + i / n) % 1);
    const sc = s * (0.15 + ph * 0.35);
    return <mesh key={i} position={[at[0] + Math.sin(ph * 4 + i) * 0.08 * s, at[1] + ph * rise * s * 2, at[2] + i * 0.01]} scale={[sc, sc, 1]} geometry={geo.ellipse(1, 0.85, 0.02)} material={paper(color, { opacity: opacity * (1 - ph) })} />;
  })}</>
);

export const Wire: React.FC<{ a: [number, number, number]; b: [number, number, number]; sag?: number; color?: string; w?: number }> = ({ a, b, sag = 0.3, color = "#222", w = 0.03 }) => {
  const N = 8; const els: React.ReactNode[] = [];
  const pt = (k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag, a[2] + (b[2] - a[2]) * k];
  for (let i = 0; i < N; i++) {
    const p0 = pt(i / N), p1 = pt((i + 1) / N);
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    els.push(<mesh key={i} position={[(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2]} rotation={[0, 0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0])]} material={paper(color)}><planeGeometry args={[len + 0.01, w]} /></mesh>);
  }
  return <>{els}</>;
};

export { clamp01, Sheet };
