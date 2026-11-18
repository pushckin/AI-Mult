// Декорации сцены p2/finale (3D): окна, сарай, палатки, бункер, комната геймеров, взрывы, тишина, тёмная квартира, тёмный город.
import React from "react";
import { Character } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Piece } from "../../kit/Character";
import { CanvasPlane, Sheet, Crowd, crowdGrid, PaperLights } from "../../kit/Stage";
import { paper, glow, geo, rng, FONT } from "../../kit/paper";
import { hash, noise1, twos, easeOut, easeIn, clamp01, prog } from "../../kit/anim";
import { drawInterior, drawTimerScreen, Gamepad, Phone, Sheep, Fireball, Pylon, CoolingTower, CellTower, Sparks, Smoke, Wire, Stars } from "./finale_world";

const NightLights: React.FC<{ k?: number; tint?: string }> = ({ k = 0.7, tint = "#a9b8e8" }) => <PaperLights intensity={k} tint={tint} />;

const Moon: React.FC<{ position: [number, number, number]; r?: number }> = ({ position, r = 0.5 }) => (
  <group position={position}>
    <mesh geometry={geo.ellipse(r * 1.5, r * 1.5, 0.01)} position={[0, 0, -0.02]} material={glow("#f6e7b0", 0.15)} />
    <mesh geometry={geo.ellipse(r, r, 0.03)} material={glow("#f6e7b0")} />
    <mesh geometry={geo.ellipse(r * 0.18, r * 0.18, 0.01)} position={[r * 0.3, r * 0.2, 0.03]} material={glow("#e0cd8f")} />
  </group>
);

// ---------- окна многоэтажки ----------
function drawDarkWindow(g: CanvasRenderingContext2D, W: number, H: number, v: number) {
  const r = rng(v * 17 + 3);
  g.fillStyle = "#0b0f1c"; g.fillRect(0, 0, W, H);
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * W, hy = H * (0.5 + r() * 0.12), hr = W * 0.08;
    if (r() < 0.4) { const gr = g.createRadialGradient(x, hy, 0, x, hy, hr * 2.2); gr.addColorStop(0, "rgba(140,180,255,0.7)"); gr.addColorStop(1, "rgba(140,180,255,0)"); g.fillStyle = gr; g.fillRect(x - hr * 3, hy - hr * 3, hr * 6, hr * 6); }
    g.fillStyle = "#020306";
    g.beginPath(); g.arc(x, hy, hr, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x, H, hr * 1.9, H - hy - hr * 0.2, 0, Math.PI, 0); g.fill();
    g.fillRect(x - hr * 1.6, hy - hr * 1.8, hr * 0.35, hr * 1.8); g.fillRect(x + hr * 1.25, hy - hr * 1.8, hr * 0.35, hr * 1.8); // руки к небу
  }
}
export const FacadeSet: React.FC<{ t: number; sec: number; dark?: boolean }> = ({ t, sec, dark }) => {
  const cols = [-1.55, 0, 1.55], rows = [0, 1.45, 2.9, 4.35];
  const tq = twos(t);
  return (
    <>
      <NightLights k={dark ? 0.3 : 0.55} />
      {dark && rows.flatMap((y, ri) => cols.map((x, ci) => {
        const ph = ((tq * 1.3 + (ri * 3 + ci) * 0.37) % 1);
        const s = 0.5 + ph * 0.9;
        return <CanvasPlane key={"a" + ri + ci} texKey={"fin_aaa" + ((ri + ci) % 3)} w={1.2 * s} h={0.5 * s} px={384} position={[x + (ci - 1) * ph * 0.4, y + 0.35 + ph * 0.9, 0.4 + ph]} transparent opacity={1 - ph * ph} draw={(g, W, H) => { g.clearRect(0, 0, W, H); g.font = `900 ${H * 0.75}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = H * 0.12; g.strokeStyle = "#111"; g.lineJoin = "round"; const txt = ["А-А-А!", "АААА!!", "СУ-У-У!"][(ri + ci) % 3]; g.strokeText(txt, W / 2, H / 2); g.fillStyle = "#ff4d4d"; g.fillText(txt, W / 2, H / 2); }} />;
      }))}
      <Sheet w={14} h={14} color="#0d1430" position={[0, 3, -6]} />
      <Moon position={[2.6, 6.2, -5.8]} r={0.45} />
      <Sheet w={5.2} h={9} color="#5b4466" position={[0, 2.2, 0]} />
      {/* соседние дома */}
      <Sheet w={3} h={7} color="#2e2a45" position={[-3.6, 1.5, -2]} />
      <Sheet w={3} h={8} color="#2b3350" position={[3.7, 2, -2.5]} />
      {rows.flatMap((y, ri) => cols.map((x, ci) => {
        const v = (ri * 3 + ci) % 5;
        return (
          <group key={ri + "_" + ci} position={[x, y, 0]}>
            <Piece g={geo.rrect(1.36, 1.14, 0.04, 0.04)} c="#e9e1cf" p={[0, 0, 0.02]} />
            {dark
              ? <CanvasPlane texKey={`fin_intdark_${v}`} w={1.2} h={0.98} px={256} position={[0, 0, 0.06]} draw={(g, W, H) => drawDarkWindow(g, W, H, v)} />
              : <CanvasPlane texKey={`fin_int_${sec}_${v}`} w={1.2} h={0.98} px={384} position={[0, 0, 0.06]} draw={(g, W, H) => drawInterior(g, W, H, sec, v, ["#d99a3e", "#c97b3a", "#d6b04a", "#b86e9b", "#cf8d4f"][v])} />}
            <Piece g={geo.rrect(1.5, 0.1, 0.02, 0.06)} c="#cfc6b2" p={[0, -0.6, 0.08]} />
          </group>
        );
      }))}
      {/* удлинители из окна в окно */}
      <Wire a={[-1.0, 0.3, 0.12]} b={[0.6, 1.1, 0.12]} sag={0.4} color="#f2f2f2" w={0.035} />
      <Wire a={[0.9, 1.7, 0.12]} b={[1.0, 2.6, 0.12]} sag={0.25} color="#ff8a00" w={0.035} />
      <Wire a={[-0.7, 3.2, 0.12]} b={[-1.0, 4.1, 0.12]} sag={0.3} color="#f2f2f2" w={0.035} />
    </>
  );
};

// ---------- сарай с выселенными овцами ----------
const BARN: [number, number][] = [[-1.6, 0], [1.6, 0], [1.6, 1.9], [0, 2.9], [-1.6, 1.9]];
export const BarnSet: React.FC<{ t: number; sec: number }> = ({ t, sec }) => {
  const tq = twos(t);
  return (
    <>
      <NightLights k={0.6} />
      <Sheet w={20} h={10} color="#0d1430" position={[0, 4, -8]} />
      <Moon position={[-2.2, 5.0, -7.8]} r={0.5} />
      <Sheet w={20} h={14} color="#22402a" position={[0, 0, -2]} rotation={[-Math.PI / 2, 0, 0]} />
      {[[-4, 1.2, "#1b3022"], [3.5, 1.6, "#182a1e"]].map(([x, s, c], i) => <mesh key={i} position={[x as number, -0.2, -6]} geometry={geo.ellipse(3 * (s as number), 1.6 * (s as number), 0.05)} material={paper(c as string)} />)}
      <mesh geometry={geo.poly("barn", BARN, 0.04, 0.4)} position={[0, 0, -1.2]} material={paper("#b0302a")} />
      <mesh geometry={geo.poly("barnroof", [[-1.75, 1.85], [0, 2.95], [1.75, 1.85], [1.75, 2.05], [0, 3.15], [-1.75, 2.05]], 0.02, 0.45)} position={[0, 0, -1.2]} material={paper("#3b2a2a")} />
      <Piece g={geo.rrect(1.9, 1.85, 0.03, 0.03)} c="#f0e6d2" p={[0, 0.98, -0.8]} />
      <CanvasPlane texKey={`fin_barn_${sec}`} w={1.7} h={1.68} px={448} position={[0, 0.93, -0.77]} draw={(g, W, H) => drawInterior(g, W, H, sec, 7, "#c98d3a")} />
      {/* распахнутые створки */}
      {[-1, 1].map((s) => <Piece key={s} g={geo.rrect(0.85, 1.75, 0.02, 0.04)} c="#9c2a25" p={[s * 1.45, 0.92, -0.5]} r={0} />)}
      {[-1, 1].map((s) => <Piece key={"x" + s} g={geo.rrect(0.07, 1.9, 0.02, 0.03)} c="#f0e6d2" p={[s * 1.45, 0.92, -0.46]} r={s * 0.44} />)}
      {/* надпись над дверью */}
      <CanvasPlane texKey="fin_barnsign" w={1.3} h={0.32} px={512} position={[0, 2.25, -0.72]} glowing={false} draw={(g, W, H) => { g.fillStyle = "#f0e6d2"; g.fillRect(0, 0, W, H); g.fillStyle = "#111"; g.font = `900 ${H * 0.55}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ЗАНЯТО", W / 2, H / 2 + 3); }} />
      {/* овцы на улице */}
      <Sheep position={[-0.9, 0, 0.9]} s={0.8} />
      <Sheep position={[-0.55, 0, 1.35]} s={0.75} flip />
      <Sheep position={[1.05, 0, 1.1]} s={0.85} eyes={tq % 1 < 0.15 ? "closed" : "open"} flip />
      {/* табличка */}
      <group position={[0.05, -0.55, 1.9]} rotation={[0, 0, 0.06]}>
        <Piece g={geo.rrect(0.06, 0.9, 0.01, 0.03)} c="#7a5536" p={[0, 0.45, 0]} />
        <CanvasPlane texKey="fin_sheepsign" w={0.9} h={0.42} px={384} position={[0, 0.88, 0.03]} glowing={false} draw={(g, W, H) => { g.fillStyle = "#e8d6a8"; g.fillRect(0, 0, W, H); g.strokeStyle = "#5b3b1e"; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8); g.fillStyle = "#3a1a10"; g.font = `900 ${H * 0.34}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ОВЦЫ", W / 2, H * 0.32); g.fillText("ВЫСЕЛЕНЫ", W / 2, H * 0.7); }} />
      </group>
      {/* кабель от сарая */}
      <Wire a={[1.0, 1.6, -0.5]} b={[3.0, 2.5, -1.5]} sag={0.4} color="#ff8a00" w={0.04} />
    </>
  );
};

// ---------- палатки на пляже ----------
const TENT: [number, number][] = [[-0.9, 0], [0.9, 0], [0, 1.25]];
function drawTent(g: CanvasRenderingContext2D, W: number, H: number, sec: number, v: number) {
  g.fillStyle = "#e9b84e"; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(127,243,255,0.35)"; g.fillRect(0, H * 0.3, W, H);
  // ноутбук с таймером
  const sw = W * 0.56, sh = H * 0.34, sx = (W - sw) / 2, sy = H * 0.36;
  g.fillStyle = "#111"; g.fillRect(sx - 4, sy - 4, sw + 8, sh + 8);
  g.save(); g.translate(sx, sy); drawTimerScreen(g, sw, sh, sec); g.restore();
  // затылки по краям
  const r = rng(40 + v);
  g.fillStyle = "#1c1424";
  for (const x of [W * 0.2, W * 0.4, W * 0.62, W * 0.8]) {
    const hr = W * (0.06 + r() * 0.015), hy = H * (0.8 + r() * 0.05);
    g.beginPath(); g.arc(x, hy, hr, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x, H, hr * 1.8, H - hy - hr * 0.3, 0, Math.PI, 0); g.fill();
  }
}
export const BeachSet: React.FC<{ t: number; sec: number }> = ({ t, sec }) => {
  const tents: [number, number, number, string][] = [[-1.05, 0, -0.3, "#e67e22"], [0.95, 0, -0.9, "#2e86c1"], [0.05, 0, 0.6, "#27ae60"], [-1.4, 0, -2.4, "#c0392b"], [1.6, 0, -3, "#8e44ad"]];
  return (
    <>
      <NightLights k={0.6} />
      <Sheet w={24} h={10} color="#0b1230" position={[0, 4.2, -9]} />
      <Moon position={[1.8, 4.4, -8.8]} r={0.55} />
      <Sheet w={24} h={6} color="#163a6a" position={[0, 0.01, -7]} rotation={[-Math.PI / 2, 0, 0]} />
      {[0, 1, 2].map((i) => <mesh key={i} position={[1.8 + (i - 1) * 0.15, 0.03, -6 + i * 0.6]} rotation={[-Math.PI / 2, 0, 0]} material={glow("#f6e7b0", 0.6)}><planeGeometry args={[0.9 - i * 0.2, 0.08]} /></mesh>)}
      <Sheet w={24} h={8} color="#8f7a52" position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {tents.map(([x, y, z, c], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh geometry={geo.poly("tent", TENT, 0.03, 0.08)} position={[0, 0, 0]} material={paper(c)} />
          <CanvasPlane texKey={`fin_tent_${sec}_${i % 3}`} w={1.2} h={0.95} px={320} position={[0, 0.42, 0.09]} transparent draw={(g, W, H) => {
            g.save(); g.beginPath(); g.moveTo(W * 0.5, 0); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.clip();
            drawTent(g, W, H, sec, i); g.restore();
          }} />
        </group>
      ))}
      {/* столб с удлинителями */}
      <Piece g={geo.rrect(0.08, 1.8, 0.02, 0.06)} c="#5b4636" p={[2.0, 0.9, 0.3]} />
      <Piece g={geo.rrect(0.5, 0.12, 0.03, 0.06)} c="#f2f2f2" p={[2.0, 1.4, 0.36]} />
      <Wire a={[-0.6, 0.15, 0.1]} b={[1.8, 1.4, 0.4]} sag={0.5} color="#f2f2f2" />
      <Wire a={[0.5, 0.1, 0.7]} b={[1.9, 1.38, 0.4]} sag={0.3} color="#ff8a00" />
      <Wire a={[1.2, 0.2, -0.8]} b={[2.1, 1.38, 0.4]} sag={0.3} color="#f2f2f2" />
    </>
  );
};

// ---------- бункер ----------
function drawGaugeFace(g: CanvasRenderingContext2D, W: number, H: number, cracked: boolean) {
  g.fillStyle = "#f3ecd8"; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.56, R = W * 0.4;
  const zone = (a0: number, a1: number, c: string) => {
    g.beginPath();
    for (let i = 0; i <= 30; i++) { const th = a0 + ((a1 - a0) * i) / 30; g.lineTo(cx - Math.sin(th) * R, cy - Math.cos(th) * R); }
    for (let i = 30; i >= 0; i--) { const th = a0 + ((a1 - a0) * i) / 30; g.lineTo(cx - Math.sin(th) * R * 0.78, cy - Math.cos(th) * R * 0.78); }
    g.closePath(); g.fillStyle = c; g.fill();
  };
  zone(1.25, 0.35, "#2e9e4f"); zone(0.35, -0.4, "#f1c40f"); zone(-0.4, -1.25, "#e3262e");
  g.strokeStyle = "#111"; g.lineWidth = 5;
  for (let i = 0; i <= 10; i++) { const th = 1.25 - (2.5 * i) / 10; g.beginPath(); g.moveTo(cx - Math.sin(th) * R * 0.74, cy - Math.cos(th) * R * 0.74); g.lineTo(cx - Math.sin(th) * R * 0.6, cy - Math.cos(th) * R * 0.6); g.stroke(); }
  g.fillStyle = "#111"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 ${W * 0.075}px ${FONT}`; g.fillText("НАГРУЗКА СЕТИ", cx, H * 0.83);
  g.font = `900 ${W * 0.06}px ${FONT}`; g.fillText("5 млн", cx - R * 0.88, cy + R * 0.32); g.fillStyle = "#c0161e"; g.fillText("86 млн", cx + R * 0.86, cy + R * 0.32);
  if (cracked) {
    g.strokeStyle = "#333"; g.lineWidth = 4;
    const r = rng(3);
    for (let k = 0; k < 7; k++) { g.beginPath(); let x = cx + R * 0.7, y = cy - R * 0.55; g.moveTo(x, y); for (let s = 0; s < 4; s++) { const a = r() * 6.28; x += Math.cos(a) * W * 0.1; y += Math.sin(a) * W * 0.1; g.lineTo(x, y); } g.stroke(); }
  }
}
function drawGridMap(g: CanvasRenderingContext2D, W: number, H: number, blink: boolean) {
  g.fillStyle = "#0a1220"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(80,160,255,0.25)"; g.lineWidth = 2;
  for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = blink ? "#ff2a2a" : "#a01010";
  g.font = `900 ${H * 0.13}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("ПЕРЕГРУЗКА", W * 0.5, H * 0.17);
  // столбики нагрузки по регионам
  const r = rng(8);
  for (let i = 0; i < 9; i++) { const h = H * (0.45 + r() * 0.2); g.fillStyle = i % 3 === 0 ? "#ffd23d" : "#ff2a2a"; g.fillRect(W * 0.08 + i * W * 0.095, H * 0.92 - h, W * 0.06, h); }
  g.fillStyle = "#fff"; g.font = `900 ${H * 0.12}px ${FONT}`; g.fillText("1720%", W * 0.5, H * 0.45);
}

export interface BunkerState { t: number; needle: number; broke: number; mouth: number; tsec: number }
export const BunkerSet: React.FC<BunkerState & { showEngineer?: boolean }> = ({ t, needle, broke, mouth, tsec, showEngineer = true }) => {
  const tq = twos(t);
  const tr = (i: number, a = 0.025) => noise1(tq * 30 + i * 13) * a;
  const lamp = Math.floor(t * 4) % 2 === 0;
  const L = 0.42 + 0.5 * easeOut(clamp01(broke * 3));
  const shards = broke > 0 ? [0, 1, 2, 3, 4] : [];
  return (
    <>
      <PaperLights intensity={0.9} tint={lamp ? "#ffd0c8" : "#ffffff"} />
      {/* стены/пол */}
      <Sheet w={12} h={8} color="#7c8086" position={[0, 2.5, -2]} />
      {[-3, -1.5, 0, 1.5, 3].map((x) => <Piece key={x} g={geo.rrect(0.05, 8, 0.01, 0.01)} c="#62666b" p={[x - 0.75, 2.5, -1.98]} />)}
      <Piece g={geo.rrect(12, 0.06, 0.01, 0.01)} c="#62666b" p={[0, 1.5, -1.98]} />
      <Sheet w={12} h={8} color="#4d5055" position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* тревожная лампа */}
      <Piece g={geo.rrect(0.3, 0.16, 0.05, 0.08)} c="#333" p={[-1.5, 3.6, -1.9]} />
      <mesh geometry={geo.ellipse(0.13, 0.15, 0.05)} position={[-1.5, 3.75, -1.85]} material={glow(lamp ? "#ff2020" : "#7a1010")} />
      {lamp && <mesh geometry={geo.ellipse(0.6, 0.6, 0.01)} position={[-1.5, 3.75, -1.9]} material={glow("#ff3030", 0.25)} />}
      {/* монитор энергосистемы */}
      <Piece g={geo.rrect(1.55, 1.05, 0.05, 0.06)} c="#222" p={[-0.95, 2.75, -1.92]} />
      <CanvasPlane texKey={"fin_gridmap_" + (lamp ? 1 : 0)} w={1.42} h={0.92} px={512} position={[-0.95, 2.75, -1.86]} draw={(g, W, H) => drawGridMap(g, W, H, lamp)} />
      {/* табло отсчёта */}
      <Piece g={geo.rrect(1.1, 0.42, 0.04, 0.06)} c="#111" p={[0.55, 3.55, -1.92]} />
      <CanvasPlane texKey={"fin_bunkclock_" + tsec} w={1.0} h={0.34} px={384} position={[0.55, 3.55, -1.86]} draw={(g, W, H) => { g.fillStyle = "#120404"; g.fillRect(0, 0, W, H); g.fillStyle = "#ff3030"; g.shadowColor = "#ff3030"; g.shadowBlur = 12; g.font = `900 ${H * 0.6}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`00:00:0${tsec}`, W / 2, H / 2 + 2); }} />
      {/* стрелочный прибор */}
      <group position={[0.65, 2.6, -1.85]}>
        <Piece g={geo.ellipse(0.62, 0.62, 0.12)} c="#3a3d42" />
        <mesh position={[0, 0, 0.1]} material={paper("#f3ecd8")}><circleGeometry args={[0.53, 48]} /></mesh>
        <CanvasPlane texKey={"fin_gauge_" + (broke > 0 ? 1 : 0)} w={1.0} h={1.0} px={512} position={[0, 0.06, 0.11]} glowing={false} transparent draw={(g, W, H) => { g.save(); g.beginPath(); g.arc(W / 2, H / 2 + H * 0.06, W * 0.52, 0, 7); g.clip(); drawGaugeFace(g, W, H, broke > 0); g.restore(); }} />
        <group position={[0, 0, 0.14]} rotation={[0, 0, needle]}>
          <Piece g={geo.poly("needle", [[-0.03, 0], [0.03, 0], [0.008, 1], [-0.008, 1]], 0, 0.02)} c="#d01010" s={[1, L, 1]} />
        </group>
        <Piece g={geo.ellipse(0.06, 0.06, 0.03)} c="#111" p={[0, 0, 0.17]} />
        {/* осколки корпуса */}
        {shards.map((i) => {
          const k = clamp01(broke);
          const a = -0.9 + i * 0.25;
          return <Piece key={i} g={geo.poly("shard" + (i % 2), i % 2 ? [[0, 0], [0.12, 0.02], [0.03, 0.1]] : [[0, 0], [0.1, -0.04], [0.06, 0.09]], 0, 0.02)} c={i % 2 ? "#3a3d42" : "#cfe6f0"} p={[Math.cos(a) * (0.55 + k * 1.2), Math.sin(-a) * 0.2 + 0.4 + k * 0.6 - k * k * 0.9, 0.2]} r={k * 6 + i} />;
        })}
        {broke > 0 && <Smoke t={t} at={[-Math.sin(needle) * L * 0.95, Math.cos(needle) * L * 0.95, 0.25]} n={5} s={0.55} color="#4a4a50" opacity={0.85} rise={0.9} />}
        {broke > 0 && <Smoke t={t + 0.7} at={[0, 0.1, 0.22]} n={3} s={0.4} color="#6a6a70" opacity={0.6} />}
        {broke > 0 && <Sparks t={t} at={[[-Math.sin(needle) * 0.6, Math.cos(needle) * 0.6, 0.3], [0.45, 0.4, 0.3]]} s={1.2} />}
      </group>
      {/* стол */}
      <mesh geometry={geo.rrect(3.8, 0.14, 0.03, 1.3)} position={[-1.05, 1.5, 0]} material={paper("#5e4634")} />
      {[-2.85, 0.75].map((x) => [-0.5, 0.5].map((z) => <Piece key={x + "_" + z} g={geo.rrect(0.12, 1.43, 0.02, 0.12)} c="#4a3626" p={[x, 0.72, z]} />))}
      {/* на столе: бумаги, кружка, красный телефон */}
      <Piece g={geo.rrect(0.5, 0.04, 0.01, 0.4)} c="#f4f1e8" p={[-0.3, 1.59, 0.1]} />
      <Piece g={geo.rrect(0.16, 0.2, 0.03, 0.16)} c="#e8e8e8" p={[0.35, 1.68, 0.25]} />
      <Piece g={geo.rrect(0.36, 0.14, 0.05, 0.3)} c="#c0161e" p={[-1.1, 1.64, 0.0]} />
      {/* министры под столом, в обнимку, дрожат */}
      <group position={[-0.3, 0, 0]}>
        <Character {...CAST.agri} position={[-0.6 + tr(1), 0, -0.1]} scale={0.66} legs="sit" eyes="sad" mouth="wavy" tears={1} armR={1.25} armL={0.4} headTilt={0.15 + tr(2, 0.05)} rotationY={0.25} />
        <Character {...CAST.defense} position={[0.6 + tr(3), 0, -0.1]} scale={0.66} legs="sit" eyes="wide" mouth="teethGrit" sweat={1} armL={1.25} armR={0.4} headTilt={-0.15 + tr(4, 0.05)} rotationY={-0.25} />
        <Character {...CAST.pm} position={[0 + tr(5), 0, 0.12]} scale={0.68} legs="sit" eyes="wide" mouth="wavy" sweat={1} tears={0.5} armL={1.35} armR={1.35} headTilt={tr(6, 0.06)} />
      </group>
      {/* инженер */}
      {showEngineer && (
        <Character {...CAST.engineer} position={[1.2 + tr(7, 0.01), 0, -0.9]} eyes="wide" mouth="talk" mouthOpen={mouth} sweat={1} armL={0.25} armR={1.9 + tr(8, 0.1)} headTilt={tr(9, 0.06)} lookX={-0.4} lookY={0.5} rotationY={-0.15} />
      )}
    </>
  );
};

// ---------- комната геймеров (POV телевизора) ----------
const ROOM_CROWD = crowdGrid(36, -2.2, 2.2, -2.4, -1.0, 21);
export const GamerRoom: React.FC<{ t: number; up: number; glowC?: string; light?: number }> = ({ t, up, glowC = "#bfe0ff", light = 0.95 }) => {
  const tq = twos(t);
  const arm = 0.7 + up * 1.9;
  const scr = up > 0.5;
  return (
    <>
      <PaperLights intensity={light} tint={glowC} />
      <Sheet w={10} h={8} color="#2a3158" position={[0, 2.5, -3]} />
      {/* постер и гирлянда-удлинитель */}
      <Piece g={geo.rrect(0.9, 1.2, 0.02, 0.02)} c="#ff4fd8" p={[-1.6, 2.6, -2.95]} />
      <Wire a={[-2.5, 3.0, -2.9]} b={[2.5, 3.2, -2.9]} sag={0.4} color="#f2f2f2" w={0.05} />
      <Sheet w={10} h={8} color="#3a2f3f" position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <Crowd members={ROOM_CROWD} t={t} bounce={0.05 + up * 0.15} size={1.25} tint={glowC} />
      {/* диван */}
      <Piece g={geo.rrect(3.2, 0.7, 0.12, 0.6)} c="#6b3a2a" p={[0, 0.55, -0.4]} />
      <Piece g={geo.rrect(3.4, 0.35, 0.12, 0.7)} c="#7d4632" p={[0, 0.3, 0.0]} />
      <Character {...CAST.gamer2} position={[0, 0.25, 0.35]} legs="sit" eyes={scr ? "crazy" : "wide"} mouth={scr ? "scream" : "teethGrit"} mouthOpen={scr ? 0.7 + 0.3 * Math.abs(Math.sin(tq * 8)) : 0} armL={arm} armR={arm} handR={<Gamepad />} />
      <Character outfit="hoodie" color="#27ae60" color2="#2c3e50" hat="beanie" hatColor="#c0392b" skin="#d9a37a" adult stubble position={[-1.05, 0.25, 0.25]} legs="sit" eyes={scr ? "crazy" : "wide"} mouth={scr ? "scream" : "o"} mouthOpen={0.8} armL={arm + 0.2} armR={0.6 + up} handL={<Gamepad />} rotationY={0.15} />
      <Character outfit="tshirt" color="#f39c12" color2="#34495e" hat="curly" hairColor="#2b1b10" skin="#8d5a3b" adult glasses="round" position={[1.05, 0.25, 0.25]} legs="sit" eyes={scr ? "crazy" : "wide"} mouth={scr ? "scream" : "o"} mouthOpen={0.9} armL={0.6 + up} armR={arm + 0.2} handR={<Gamepad />} rotationY={-0.15} />
    </>
  );
};

// ---------- взрывы электростанций ----------
const BOOM_PYLONS: [number, number, number, number][] = [[-1.2, 0, -2.0, 0.55], [0.3, 0, -3.5, 0.5], [1.5, 0, -1.6, 0.6], [-2.2, 0, -5, 0.45]];
export const BoomSet: React.FC<{ t: number; k: number; tb: number }> = ({ t, k, tb }) => {
  // k — время с момента взрыва (сек)
  const fb = (d: number, len = 1.3) => clamp01((k - d) / len);
  const sky = k < 0.12 ? "#fff3c0" : k < 0.5 ? "#c8401c" : "#4a1a22";
  return (
    <>
      <PaperLights intensity={k < 0.15 ? 1.6 : 0.8} tint={k < 0.6 ? "#ffb070" : "#c08070"} />
      <Sheet w={30} h={14} color={sky} position={[0, 5, -12]} glowing />
      {/* холмы */}
      <mesh position={[-3, -0.4, -9]} geometry={geo.ellipse(5, 2.4, 0.05)} material={paper("#2a1e2a")} />
      <mesh position={[4, -0.6, -8]} geometry={geo.ellipse(5, 2.6, 0.05)} material={paper("#24182a")} />
      <Sheet w={30} h={20} color="#2d2a22" position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* электростанция */}
      <CoolingTower position={[-0.9, 0, -6.5]} s={1.1} />
      <CoolingTower position={[0.8, 0, -7]} s={1.0} color="#a9a497" />
      <Piece g={geo.rrect(2.2, 1.1, 0.04, 0.6)} c="#6d6f78" p={[2.4, 0.55, -6]} />
      <Piece g={geo.rrect(0.25, 2.6, 0.03, 0.2)} c="#8c2f2f" p={[3.2, 1.3, -6]} />
      {/* подстанция */}
      {[-0.6, 0, 0.6].map((x, i) => <Piece key={i} g={geo.rrect(0.45, 0.6, 0.04, 0.4)} c="#7f8c8d" p={[x - 1.8, 0.3 + (k > 0.1 + i * 0.07 ? fb(0.1 + i * 0.07, 0.9) * 2.5 : 0), -3.5]} r={fb(0.1 + i * 0.07, 0.9) * (i - 1) * 3} />)}
      {/* опоры и провода (летят) */}
      {BOOM_PYLONS.map(([x, y, z, s], i) => {
        const d = 0.05 + i * 0.09;
        const f = easeOut(fb(d, 1.2));
        return <Pylon key={i} position={[x + (i % 2 ? 1 : -1) * f * 1.5, y + f * 3.2 - f * f * 1.2, z]} rot={(i % 2 ? -1 : 1) * f * 2.6} s={s} color="#8d95a0" />;
      })}
      <CellTower position={[2.5 + easeOut(fb(0.2)) * 1.2, easeOut(fb(0.2)) * 2.5, -4]} s={0.75} rot={-easeOut(fb(0.2)) * 2} />
      {/* огненные шары */}
      <Fireball position={[-0.9, 1.4, -6.2]} k={fb(0, 1.4)} size={2.0} seed={1} />
      <Fireball position={[0.8, 1.2, -6.7]} k={fb(0.1, 1.4)} size={1.7} seed={2} />
      <Fireball position={[2.6, 1.0, -5.6]} k={fb(0.2, 1.3)} size={1.4} seed={3} />
      <Fireball position={[-1.8, 0.6, -3.2]} k={fb(0.12, 1.2)} size={1.1} seed={4} />
      <Fireball position={[1.4, 1.0, -1.4]} k={fb(0.3, 1.1)} size={0.9} seed={5} />
      <Fireball position={[-1.1, 1.2, -1.8]} k={fb(0.22, 1.1)} size={0.8} seed={6} />
      {/* летящая овца */}
      {k > 0.25 && <group position={[-1.5 + (k - 0.25) * 2.4, 0.4 + (k - 0.25) * 3.2 - Math.pow(k - 0.25, 2) * 1.6, -0.5]} rotation={[0, 0, (k - 0.25) * 7]}><Sheep position={[0, 0, 0]} s={0.55} eyes="closed" wool="#3a3434" /></group>}
    </>
  );
};

// ---------- тишина после ----------
export const SilenceSet: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const k = t - t0;
  const blink = (k % 1.4) > 1.25;
  return (
    <>
      <PaperLights intensity={0.45} tint="#6f86c8" />
      <Stars z={-30} w={60} h={60} />
      <Moon position={[-2.5, 6.5, -20]} r={0.6} />
      <mesh position={[-4, -0.3, -10]} geometry={geo.ellipse(6, 2.6, 0.05)} material={paper("#0f1522")} />
      <mesh position={[5, -0.6, -9]} geometry={geo.ellipse(6, 2.2, 0.05)} material={paper("#0c1220")} />
      <Sheet w={40} h={30} color="#151b20" position={[0, 0, -5]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* дальние силуэты тёмных домов */}
      {[[-3.6, 1.2], [-2.4, 0.8], [2.8, 1.4], [4.0, 0.9], [-1.0, 0.6]].map(([x, h], i) => <Piece key={i} g={geo.rrect(1.0, h * 2, 0.02, 0.04)} c="#0b0f18" p={[x, h - 0.05, -8]} />)}
      {/* поваленная опора */}
      <Pylon position={[1.2, 0, -2.6]} rot={0.95} s={0.7} color="#3d444d" />
      <Pylon position={[-1.7, 0, -4.5]} rot={-0.15} s={0.65} color="#2e343c" />
      <Wire a={[-1.95, 1.75, -4.4]} b={[-0.5, 0.7, -2.6]} sag={0.3} color="#151515" w={0.025} />
      <Wire a={[-1.3, 1.75, -4.4]} b={[0.2, 0.3, -2.4]} sag={0.2} color="#151515" w={0.025} />
      <Sparks t={t} at={[[-0.5, 0.7, -2.55], [0.2, 0.32, -2.35], [-0.2, 0.05, -2.2]]} s={1.3} />
      <Smoke t={t} at={[0.4, 0.2, -2.6]} n={4} s={1.0} color="#2a2c33" opacity={0.6} rise={1.0} />
      <Smoke t={t + 0.4} at={[-1.0, 0.1, -3.4]} n={3} s={0.8} color="#25272d" opacity={0.5} />
      <Fireball position={[0.15, 0.12, -2.3]} k={0.62 + 0.03 * Math.sin(twos(t) * 20)} size={0.18} />
      {/* овца, моргающая в темноте */}
      <Sheep position={[-0.6, 0, 0.2]} s={0.75} eyes={blink ? "closed" : "glow"} wool="#3b3f4a" />
    </>
  );
};

// ---------- тёмная квартира ----------
export const DarkRoom: React.FC<{ t: number; phone: number; scream: number; mouth: number; tvLook?: boolean; light?: number }> = ({ t, phone, mouth, tvLook, scream, light = 1 }) => {
  const tq = twos(t);
  const shiver = noise1(tq * 25) * 0.01;
  return (
    <>
      <PaperLights intensity={0.13} tint="#6f80c0" />
      <pointLight position={[0.15, 1.35, 1.0]} intensity={2.6 * phone * light} distance={4} decay={1.2} color="#b9d6ff" />
      <Sheet w={12} h={8} color="#1b2136" position={[0, 2.5, -2.5]} />
      <Sheet w={12} h={8} color="#191a22" position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* окно с луной (тёмный город) */}
      <Piece g={geo.rrect(1.3, 1.5, 0.03, 0.04)} c="#262b3d" p={[1.7, 2.6, -2.45]} />
      <mesh position={[1.7, 2.6, -2.4]} material={paper("#0b1024")}><planeGeometry args={[1.15, 1.35]} /></mesh>
      <Piece g={geo.rrect(0.04, 1.35, 0.01, 0.02)} c="#262b3d" p={[1.7, 2.6, -2.37]} />
      {/* чёрный телевизор */}
      <group position={[-1.35, 0, -0.6]} rotation={[0, 0.55, 0]}>
        <Piece g={geo.rrect(0.12, 0.7, 0.02, 0.12)} c="#111" p={[0, 0.35, 0]} />
        <Piece g={geo.rrect(2.18, 1.33, 0.05, 0.06)} c="#3a4560" p={[0, 1.3, -0.02]} />
        <Piece g={geo.rrect(2.1, 1.25, 0.04, 0.08)} c="#0b0b0d" p={[0, 1.3, 0]} />
        <mesh position={[0, 1.3, 0.05]} material={paper("#050507")}><planeGeometry args={[1.95, 1.1]} /></mesh>
        <mesh position={[0.35, 1.45, 0.06]} rotation={[0, 0, 0.6]} material={glow("#2a3350", 0.5)}><planeGeometry args={[0.1, 1.2]} /></mesh>
        <mesh position={[0.6, 1.4, 0.06]} rotation={[0, 0, 0.6]} material={glow("#2a3350", 0.35)}><planeGeometry args={[0.05, 1.0]} /></mesh>
      </group>
      {/* консоли, тройники, провода на полу */}
      <Piece g={geo.rrect(0.32, 0.55, 0.04, 0.12)} c="#e8e8e8" p={[-0.6, 0.28, 0.2]} />
      <Piece g={geo.rrect(0.07, 0.55, 0.02, 0.13)} c="#111" p={[-0.6, 0.28, 0.21]} />
      <Piece g={geo.rrect(0.5, 0.1, 0.03, 0.2)} c="#d8d8d8" p={[0.9, 0.05, 0.9]} />
      <Piece g={geo.rrect(0.5, 0.1, 0.03, 0.2)} c="#d8d8d8" p={[1.45, 0.05, 1.0]} />
      <Wire a={[-0.6, 0.05, 0.4]} b={[0.65, 0.05, 0.9]} sag={-0.05} color="#0d0d0d" w={0.03} />
      <Wire a={[1.15, 0.05, 0.95]} b={[1.2, 0.05, 1.0]} sag={0} color="#0d0d0d" w={0.03} />
      {/* геймер */}
      <Character {...CAST.gamer} position={[0.35 + shiver, 0, 0.5]} legs="sit" eyes={scream > 0.5 ? "crazy" : tvLook ? "wide" : "sad"} mouth={scream > 0.5 ? "scream" : "talk"} mouthOpen={mouth} lookX={tvLook ? -0.9 : -0.2} lookY={tvLook ? 0 : -0.8} armR={0.95} armL={0.5} handR={<Phone lit={phone} s={1.1} />} rotationY={tvLook ? -0.35 : 0} headTilt={tvLook ? 0.1 : 0.05} />
      {/* отсвет телефона на лице */}
      {phone > 0 && <CanvasPlane texKey="fin_phoneglow" w={1.6} h={1.6} px={128} position={[0.45, 1.3, 0.85]} transparent opacity={0.35 * phone * light} draw={(g, W, H) => { const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); gr.addColorStop(0, "rgba(190,220,255,0.8)"); gr.addColorStop(1, "rgba(190,220,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }} />}
    </>
  );
};

// ---------- тёмный город (отъезд камеры) ----------
function drawDarkFacade(g: CanvasRenderingContext2D, W: number, H: number, seed: number) {
  const r = rng(seed);
  g.fillStyle = ["#161b2b", "#1a1e30", "#141826"][seed % 3]; g.fillRect(0, 0, W, H);
  const cw = W / 6, ch = H / 12;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 6; x++) {
    const glowW = r() < 0.07;
    g.fillStyle = glowW ? "#5a7fd0" : "#0a0d16";
    g.fillRect(x * cw + cw * 0.2, y * ch + ch * 0.2, cw * 0.6, ch * 0.6);
  }
}
const BLDG: [number, number, number, number, number][] = [[0, 0, 2.6, 7, 0], [-2.9, -1.5, 2.4, 9, 1], [2.9, -1, 2.2, 6, 2], [-5.5, -3.5, 2.6, 11, 3], [5.6, -3, 2.5, 8, 4], [-8.5, -5, 3, 7, 5], [8.6, -5.5, 3, 10, 6], [-1.5, -7, 3, 13, 7], [3.5, -8, 2.8, 9, 8]];
export const DarkCity: React.FC<{ t: number }> = ({ t }) => (
  <>
    <PaperLights intensity={0.35} tint="#7a8cc8" />
    <Stars z={-60} w={160} h={160} />
    <Moon position={[-6, 18, -40]} r={1.6} />
    {BLDG.map(([x, z, w, h, s], i) => (
      <CanvasPlane key={i} texKey={"fin_dark_bldg_" + s} w={w} h={h} px={256} position={[x, h / 2, z]} glowing={false} draw={(g, W, H) => drawDarkFacade(g, W, H, s)} />
    ))}
    {/* окно нашего геймера — слабый синий свет */}
    <CanvasPlane texKey="fin_gamerwin" w={0.26} h={0.35} px={128} position={[0.217, 3.79, 0.02]} draw={(g, W, H) => { g.fillStyle = "#4a6fc0"; g.fillRect(0, 0, W, H); const gr = g.createRadialGradient(W * 0.5, H * 0.6, 0, W * 0.5, H * 0.6, W * 0.6); gr.addColorStop(0, "#bcd6ff"); gr.addColorStop(1, "rgba(188,214,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = "#0a0d16"; g.beginPath(); g.arc(W * 0.5, H * 0.58, W * 0.2, 0, 7); g.fill(); g.beginPath(); g.ellipse(W * 0.5, H, W * 0.36, H * 0.25, 0, Math.PI, 0); g.fill(); for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(W * (0.33 + i * 0.085), H * 0.48); g.lineTo(W * (0.36 + i * 0.085), H * 0.33); g.lineTo(W * (0.4 + i * 0.085), H * 0.48); g.fill(); } }} />
    <Sheet w={80} h={60} color="#0a0c12" position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]} />
  </>
);
