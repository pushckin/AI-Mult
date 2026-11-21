// Окружение: тротуар, здания блоками с вывесками, пальмы, фонарь, урны, билборд.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, extrude, planeGeo, circleGeo, flatMat, Shadow } from "./toon";
import { hash } from "./util";

// ---------- текстуры (canvas, плоские) ----------
const texCache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
};
const FONT = "'Arial Black','Impact','DejaVu Sans',sans-serif";
export const signTex = (text: string, fg: string, bg: string) =>
  canvasTex(`sign_${text}_${fg}_${bg}`, 512, 160, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 108;
    g.font = `900 ${size}px ${FONT}`;
    while (g.measureText(text).width > 460 && size > 30) {
      size -= 4;
      g.font = `900 ${size}px ${FONT}`;
    }
    g.fillText(text, 256, 84);
  });
const TexPlane: React.FC<{ tex: THREE.Texture; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number]; order?: number }> = ({ tex, w, h, position, rotation, order }) => (
  <mesh geometry={planeGeo} position={position} rotation={rotation} scale={[w, h, 1]} renderOrder={order}>
    <meshBasicMaterial map={tex} toneMapped={false} />
  </mesh>
);

// ---------- палитра ----------
export interface EnvPal { sky: string; win: string; winOff: string; neon: boolean; }
export const PAL_NIGHT: EnvPal = { sky: "#14143e", win: "#ffd36a", winOff: "#3b3f78", neon: true };
export const PAL_COLD: EnvPal = { sky: "#0e2a66", win: "#ffe9a0", winOff: "#6f80c0", neon: true };

// ---------- здания ----------
interface BDef { x: number; w: number; h: number; wall: string; trim: string; sign: string; fg: string; bg: string; aw: [string, string]; extra?: string }
export const BUILDINGS: BDef[] = [
  { x: -15.4, w: 5.2, h: 4.2, wall: "#7d4d96", trim: "#53306a", sign: "LIQUOR", fg: "#ff5fd0", bg: "#1a1030", aw: ["#ff5fd0", "#fbe9f7"] },
  { x: -10.2, w: 5.2, h: 4.0, wall: "#2e8f9e", trim: "#1c5f6b", sign: "PIZZA", fg: "#6af2ff", bg: "#101a2a", aw: ["#e0273a", "#f4f4f0"] },
  { x: -5.0, w: 5.2, h: 4.2, wall: "#4a5cc4", trim: "#2e3b8e", sign: "MOTEL", fg: "#ffe94a", bg: "#15152e", aw: ["#32b8c9", "#f4f4f0"], extra: "VACANCY" },
  { x: 0.2, w: 5.2, h: 3.9, wall: "#9bd9ba", trim: "#5fa384", sign: "VEGAN COFFEE", fg: "#7dff9a", bg: "#102418", aw: ["#2fa05a", "#e8f8ee"] },
  { x: 5.4, w: 5.2, h: 4.2, wall: "#a53a52", trim: "#6e2236", sign: "TATTOO", fg: "#ffb02e", bg: "#241018", aw: ["#ffd23a", "#16141a"] },
  { x: 10.6, w: 5.2, h: 4.0, wall: "#6a44b8", trim: "#432a82", sign: "BAR", fg: "#c58cff", bg: "#14102a", aw: ["#ff5fd0", "#fbe9f7"] },
  { x: 15.8, w: 5.2, h: 4.2, wall: "#d98a3a", trim: "#9c5c1c", sign: "DONUTS", fg: "#ff5f8a", bg: "#201018", aw: ["#ff5f8a", "#fff0f4"] },
];
const FACE_Z = -2.2;

const Building: React.FC<{ b: BDef; pal: EnvPal; idx: number; simple?: boolean; showSign?: boolean; signLift?: number; flat?: boolean }> = ({ b, pal, idx, simple = false, showSign = true, signLift = 0, flat = false }) => {
  const depth = 6;
  const bh = signLift > 0 ? b.h + 1.5 : b.h; // кофейня выше: вывеска над головами
  const zc = FACE_Z - depth / 2;
  const fz = FACE_Z + 0.012;
  const lit = (i: number) => (hash(idx * 13 + i, 5) > 0.35 ? pal.win : pal.winOff);
  if (flat) {
    // крупные плоские формы: стена, карниз, одна большая витрина, дверь, широкий козырёк, вывеска
    return (
      <group position={[b.x, 0, 0]}>
        <Part geo={rbox(b.w, bh, depth, 0.05)} color={b.wall} px={3} position={[0, bh / 2, zc]} />
        <Part geo={rbox(b.w + 0.3, 0.34, depth + 0.2, 0.04)} color={b.trim} px={3} position={[0, bh + 0.12, zc]} />
        <Flat geo={planeGeo} color={pal.win} position={[-b.w * 0.2, 1.25, fz]} scale={[2.5, 1.6, 1]} />
        <Flat geo={planeGeo} color="#1a1a2e" position={[b.w * 0.28, 1.1, fz]} scale={[1.0, 2.2, 1]} />
        {[0, 1, 2, 3].map((i) => (
          <Part key={i} geo={rbox(b.w / 4, 0.1, 0.8, 0.02)} color={b.aw[i % 2]} px={0} position={[-b.w / 2 + (i + 0.5) * (b.w / 4), 2.45, FACE_Z + 0.4]} rotation={[0.38, 0, 0]} />
        ))}
        {showSign && <Part geo={rbox(3.0, 0.78, 0.14, 0.05)} color="#15141c" px={3.4} position={[0, 3.2 + signLift, FACE_Z + 0.16]} />}
        {showSign && <TexPlane tex={signTex(b.sign, pal.neon ? b.fg : "#3a4068", pal.neon ? b.bg : "#101428")} w={2.88} h={0.69} position={[0, 3.2 + signLift, FACE_Z + 0.235]} />}
      </group>
    );
  }
  return (
    <group position={[b.x, 0, 0]}>
      <Part geo={rbox(b.w, bh, depth, 0.05)} color={b.wall} px={3} position={[0, bh / 2, zc]} />
      {/* карниз */}
      <Part geo={rbox(b.w + 0.2, 0.28, depth + 0.2, 0.04)} color={b.trim} px={3} position={[0, bh + 0.1, zc]} />
      {/* витрина и дверь */}
      <Flat geo={planeGeo} color={pal.win} position={[-b.w * 0.2, 1.2, fz]} scale={[2.5, 1.5, 1]} />
      {[-1, 0, 1].map((i) => (
        <Flat key={i} geo={planeGeo} color={b.trim} position={[-b.w * 0.2 + i * 0.83, 1.2, fz + 0.002]} scale={[0.05, 1.5, 1]} />
      ))}
      <Flat geo={planeGeo} color="#1a1a2e" position={[b.w * 0.27, 1.05, fz]} scale={[0.95, 2.1, 1]} />
      <Flat geo={planeGeo} color={pal.win} position={[b.w * 0.27, 1.45, fz + 0.002]} scale={[0.6, 0.7, 1]} />
      {/* козырёк в полоску */}
      {Array.from({ length: simple ? 6 : 10 }).map((_, i, a) => (
        <Part key={i} geo={rbox(b.w / a.length, 0.07, 0.8, 0.02)} color={b.aw[i % 2]} px={0} position={[-b.w / 2 + (i + 0.5) * (b.w / a.length), 2.4, FACE_Z + 0.4]} rotation={[0.38, 0, 0]} />
      ))}

      {/* вывеска (светится, не освещается) */}
      {showSign && <Part geo={rbox(3.0, 0.78, 0.14, 0.05)} color="#15141c" px={3.4} position={[0, 3.2 + signLift, FACE_Z + 0.16]} />}
      {showSign && <TexPlane tex={signTex(b.sign, pal.neon ? b.fg : "#3a4068", pal.neon ? b.bg : "#101428")} w={2.88} h={0.69} position={[0, 3.2 + signLift, FACE_Z + 0.235]} />}
      {!simple && b.extra && <TexPlane tex={signTex(b.extra, pal.neon ? "#ff3b5c" : "#3a4068", "#1a1020")} w={1.3} h={0.32} position={[0, 3.85, FACE_Z + 0.09]} />}
      {/* верхние окна */}
      {!simple && [-1.9, 1.9].map((x, i) => (
        <Flat key={x} geo={planeGeo} color={lit(i)} position={[x, 3.4, fz]} scale={[0.5, 0.7, 1]} />
      ))}
      <Flat geo={planeGeo} color={lit(7)} position={[-b.w * 0.5 + 0.35, 1.2, fz]} scale={[0.0, 0.0, 1]} />
      {/* объём фасада: пилястры, подоконники с ящиками, кондиционер, выносная вывеска, ступень, парапет и крышная коробка */}
      {!simple && [-1, 1].map((s) => (
        <Part key={`pl${s}`} geo={rbox(0.34, bh - 0.1, 0.34, 0.05)} color={b.trim} px={2.8} position={[s * (b.w / 2 - 0.2), (bh - 0.1) / 2, FACE_Z + 0.17]} />
      ))}
      <Part geo={rbox(2.7, 0.14, 0.4, 0.04)} color={b.trim} px={2.6} position={[-b.w * 0.2, 0.42, FACE_Z + 0.2]} />
      {!simple && <Part geo={rbox(1.2, 0.1, 0.5, 0.03)} color="#5d5a74" px={2.6} position={[b.w * 0.27, 0.06, FACE_Z + 0.3]} />}
      {!simple && [-1.9, 1.9].map((x, i) => (
        <group key={`wb${x}`}>
          <Part geo={rbox(0.78, 0.1, 0.34, 0.03)} color={b.trim} px={2.6} position={[x, 3.0, FACE_Z + 0.17]} />
          <Part geo={rbox(0.72, 0.2, 0.3, 0.04)} color={i % 2 ? "#6a4a32" : "#3b3f78"} px={2.4} position={[x, 3.15, FACE_Z + 0.2]} />
          <Part geo={sphereGeo(10)} color="#2fa24e" px={2} position={[x - 0.2, 3.32, FACE_Z + 0.2]} scale={0.13} />
          <Part geo={sphereGeo(10)} color="#e0394f" px={2} position={[x + 0.12, 3.34, FACE_Z + 0.22]} scale={0.11} />
        </group>
      ))}
      {!simple && <Part geo={rbox(0.62, 0.42, 0.5, 0.06)} color="#a9adc4" px={2.6} position={[b.w * 0.36, 3.55 - (idx % 2) * 0.1, FACE_Z + 0.25]} />}
      {!simple && <group position={[idx % 2 ? b.w / 2 - 0.2 : -b.w / 2 + 0.2, 2.9, FACE_Z + 0.55]}>
        <Part geo={rbox(0.1, 0.9, 0.7, 0.03)} color="#15141c" px={3} />
        <Flat geo={planeGeo} color={pal.neon ? b.fg : "#3a4068"} position={[0.056, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.5, 0.7, 1]} />
        <Flat geo={planeGeo} color={pal.neon ? b.fg : "#3a4068"} position={[-0.056, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[0.5, 0.7, 1]} />
      </group>}
      <Part geo={rbox(b.w + 0.1, 0.26, 0.2, 0.04)} color={b.trim} px={3} position={[0, bh + 0.35, FACE_Z - 0.1]} />
      {!simple && idx !== 3 && idx !== 4 && idx % 3 === 0 && <Part geo={rcyl(0.5, 0.5, 0.9, 0.06, 18)} color="#8a6240" px={3} position={[-1.2, bh + 0.62, FACE_Z - 1.5]} />}
      {!simple && idx !== 3 && idx !== 4 && idx % 3 === 1 && <Part geo={rbox(1.1, 0.7, 0.9, 0.08)} color="#a9adc4" px={3} position={[1.2, bh + 0.55, FACE_Z - 1.6]} />}
      {!simple && idx % 3 === 2 && <Part geo={rcyl(0.04, 0.04, 1.2, 0.01, 8)} color="#6a6e88" px={2.6} position={[1.6, bh + 0.9, FACE_Z - 1.4]} />}
      {/* водосточная труба */}
      {!simple && <Part geo={rcyl(0.06, 0.06, bh, 0.01, 10)} color={b.trim} px={2} position={[b.w / 2 - 0.2, bh / 2, FACE_Z + 0.08]} />}
    </group>
  );
};

// ---------- дальний город ----------
const winTex = (simple = false) =>
  simple
    ? canvasTex("wins3", 256, 512, (g) => {
        g.fillStyle = "#1a2a66";
        g.fillRect(0, 0, 256, 512);
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 2; c++) {
            const h = hash(r * 2 + c, 3);
            g.fillStyle = h > 0.62 ? "#ffd36a" : "#2a4496";
            g.fillRect(c * 128 + 26, r * 128 + 22, 76, 84);
          }
      })
    : canvasTex("wins", 256, 512, (g) => {
        g.fillStyle = "#00000000";
        g.clearRect(0, 0, 256, 512);
        for (let r = 0; r < 16; r++)
          for (let c = 0; c < 8; c++) {
            const h = hash(r * 8 + c, 3);
            g.fillStyle = h > 0.55 ? "#ffd36a" : h > 0.3 ? "#3b3f78" : "#242a5c";
            g.fillRect(c * 32 + 7, r * 32 + 7, 18, 18);
          }
      });
const SKY_BLDGS = [
  [-38, 9, 17], [-27, 8, 11], [-18, 7, 14], [-8, 9, 10], [4, 7, 19], [13, 8, 12], [22, 9, 16], [32, 8, 11], [42, 9, 15], [-48, 8, 10],
];
const Skyline: React.FC<{ pal: EnvPal; simple?: boolean }> = ({ pal, simple = false }) => {
  const cold = !pal.neon;
  return (
    <group position={[0, 0, -30]}>
      {SKY_BLDGS.map(([x, w, h], i) => (
        <group key={i} position={[x, 0, -i * 0.6]}>
          <Part geo={rbox(w, h, 6, 0.05)} color={cold ? "#1a2a66" : "#1f2760"} px={2.4} position={[0, h / 2, 0]} />
          <mesh geometry={planeGeo} position={[0, h / 2, 3.02]} scale={[w - 0.8, h - 0.6, 1]} visible={true}>
            <meshBasicMaterial map={winTex(simple)} transparent={false} toneMapped={false} color="#fff" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const SKY_STARS = Array.from({ length: 12 }).map((_, i) => [(hash(i, 1) - 0.5) * 150, 11 + hash(i, 2) * 38, -80, 0.3 + hash(i, 3) * 0.2] as const);
const Sky: React.FC<{ pal: EnvPal }> = ({ pal }) => (
  <group>
    <mesh geometry={planeGeo} position={[0, 20, -90]} scale={[420, 170, 1]} material={flatMat(pal.sky)} />
    {SKY_STARS.map(([x, y, z, r], i) => (
      <Flat key={i} geo={circleGeo} color="#f4f0ff" position={[x, y, z]} scale={r} />
    ))}
    {/* луна */}
    <Flat geo={circleGeo} color="#161840" position={[-22, 20.5, -84]} scale={5.3} />
    <Flat geo={circleGeo} color="#f6efb4" position={[-22, 20.5, -83.9]} scale={4.8} />
  </group>
);

// ---------- пальма ----------
const leafPts = (): Array<[number, number]> => [[0, 0], [0.45, 0.28], [1.2, 0.34], [1.9, 0.0], [1.2, -0.16], [0.45, -0.1]];
export const Palm: React.FC<{ x: number; z: number; h?: number; sway?: number; seed?: number }> = ({ x, z, h = 4.4, sway = 0, seed = 0 }) => {
  const leaf = extrude("palmleaf", leafPts(), 0.05, 0.015);
  const segs = 5;
  const top = new THREE.Vector3(0, 0, 0);
  const parts: React.ReactNode[] = [];
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const ang = (0.1 + 0.06 * i + sway * 0.012) * (seed % 2 ? 1 : -1);
    const len = h / segs;
    parts.push(<Part key={i} geo={rcyl(0.17 - t * 0.07, 0.16 - t * 0.07, len, 0.03, 12)} color={i % 2 ? "#7a5232" : "#8a6038"} px={2.8} position={[cx + Math.sin(ang) * len * 0.5, cy + Math.cos(ang) * len * 0.5, 0]} rotation={[0, 0, -ang]} />);
    cx += Math.sin(ang) * len;
    cy += Math.cos(ang) * len;
  }
  top.set(cx, cy, 0);
  return (
    <group position={[x, 0, z]}>
      {parts}
      <group position={[top.x, top.y, 0]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2 + seed;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <group rotation={[0, 0, -0.25 - (i % 2) * 0.45 + sway * 0.02]}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                  <Part geo={leaf.geo} hull={leaf.hull} color={i % 2 ? "#2fa24e" : "#2a9246"} px={2.8} />
                </group>
              </group>
            </group>
          );
        })}
        <Part geo={sphereGeo(12)} color="#5a3a1e" px={2.4} position={[0.12, -0.12, 0.1]} scale={0.1} />
        <Part geo={sphereGeo(12)} color="#5a3a1e" px={2.4} position={[-0.1, -0.12, -0.08]} scale={0.1} />
      </group>
      <Shadow position={[0, 0.02, 0.2]} w={0.5} d={0.3} />
    </group>
  );
};

// ---------- фонарь ----------
export const Lamp: React.FC<{ x: number; z: number; on: boolean }> = ({ x, z, on }) => (
  <group position={[x, 0, z]}>
    <Part geo={rcyl(0.14, 0.14, 0.18, 0.04, 14)} color="#2a2b3a" px={3} position={[0, 0.09, 0]} />
    <Part geo={rcyl(0.07, 0.06, 4.6, 0.015, 12)} color="#3b3d52" px={3} position={[0, 2.4, 0]} />
    <Part geo={rbox(0.9, 0.07, 0.08, 0.02)} color="#3b3d52" px={3} position={[-0.4, 4.65, 0]} />
    <Part geo={rcyl(0.19, 0.28, 0.2, 0.05, 14)} color="#2a2b3a" px={3} position={[-0.85, 4.62, 0]} />
    <Flat geo={circleGeo} color={on ? "#fff3b0" : "#58608a"} position={[-0.85, 4.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.22} />
  </group>
);

// ---------- урны, гидрант ----------
export const Bin: React.FC<{ x: number; z: number; color?: string; detail?: boolean }> = ({ x, z, color = "#4d6a52", detail = false }) => (
  <group position={[x, 0, z]}>
    {detail && (
      <>
        {/* объём: утолщённый обод-«бублик», рёбра-пояса, боковые ручки, ножки */}
        <Part geo={rcyl(0.47, 0.47, 0.1, 0.045, 22)} color="#243327" px={3} position={[0, 0.99, 0]} />
        <Part geo={rcyl(0.4, 0.4, 0.06, 0.02, 22)} color="#2f3f33" px={2.6} position={[0, 0.7, 0]} scale={[1.05, 1, 1.05]} />
        <Part geo={rcyl(0.375, 0.375, 0.06, 0.02, 22)} color="#2f3f33" px={2.6} position={[0, 0.42, 0]} scale={[1.05, 1, 1.05]} />
        {[1, -1].map((s) => (
          <Part key={s} geo={rbox(0.12, 0.08, 0.2, 0.03)} color="#243327" px={2.6} position={[s * 0.5, 0.82, 0]} />
        ))}
      </>
    )}
    <Part geo={rcyl(0.36, 0.42, 0.95, 0.05, 20)} color={color} px={3.4} position={[0, 0.475, 0]} />
    <Part geo={rcyl(0.45, 0.45, 0.07, 0.025, 20)} color="#2f3f33" px={3} position={[0, 0.97, 0]} />
    <Part geo={rcyl(0.38, 0.4, 0.05, 0.015, 20)} color="#2f3f33" px={0} position={[0, 0.3, 0]} scale={[1.03, 1, 1.03]} />
    <Shadow position={[0, 0.02, 0.05]} w={0.55} d={0.4} />
  </group>
);
export const Hydrant: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <Part geo={rcyl(0.17, 0.15, 0.62, 0.05, 14)} color="#d6283a" px={3} position={[0, 0.31, 0]} />
    <Part geo={sphereGeo(14)} color="#d6283a" px={3} position={[0, 0.66, 0]} scale={[0.17, 0.12, 0.17]} />
    <Part geo={rcyl(0.07, 0.07, 0.4, 0.02, 10)} color="#b01e30" px={2.6} position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]} />
    <Shadow position={[0, 0.02, 0.05]} w={0.3} d={0.2} />
  </group>
);

// ---------- билборд ----------
export const BB = { x: 5.2, y: 6.35, z: -4.0, w: 5.0, h: 2.4 };
const bbCanvas = (kind: "a" | "g1" | "g2" | "b") =>
  canvasTex(`bb_${kind}`, 1280, 640, (g) => {
    const W = 1280;
    const H = 640;
    g.fillStyle = "#07070b";
    g.fillRect(0, 0, W, H);
    const draw = (time: string, col: string, showDate: boolean) => {
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      g.font = `900 ${showDate ? 300 : 400}px 'Courier New','DejaVu Sans Mono',monospace`;
      g.fillStyle = col;
      g.fillText(time, W / 2, showDate ? 330 : 430);
      if (showDate) {
        g.font = `900 100px ${FONT}`;
        g.fillStyle = "#ffe9b0";
        g.fillText("19 НОЯБРЯ 2026", W / 2, 510);
      }
    };
    if (kind === "b") {
      draw("00:00", "#ff2b22", false);
      return;
    }
    draw("23:59", "#ff8a1c", true);
    if (kind === "g1" || kind === "g2") {
      // глитч: яркие красные блоки поверх табло (2 кадра)
      g.fillStyle = "#ff1a1a";
      const blocks = kind === "g1" ? [[80, 70, 420, 130], [640, 190, 560, 110], [220, 380, 700, 90], [900, 20, 300, 80]] : [[360, 40, 520, 120], [60, 230, 380, 100], [760, 330, 440, 130], [200, 500, 600, 80]];
      for (const [x, y, w, h] of blocks) g.fillRect(x, y, w, h);
    }
  });
export const Billboard: React.FC<{ state: "a" | "g1" | "g2" | "b" }> = ({ state }) => (
  <group position={[BB.x, 0, BB.z]}>
    {/* ножки с раскосами */}
    {[-2.0, 2.0].map((x) => (
      <Part key={x} geo={rcyl(0.17, 0.17, BB.y - BB.h / 2 + 0.2, 0.03, 14)} color="#4a4d62" px={3.4} position={[x, (BB.y - BB.h / 2 + 0.2) / 2, -0.1]} />
    ))}
    {[-1, 1].map((s) => (
      <Part key={s} geo={rbox(0.1, 1.3, 0.1, 0.03)} color="#4a4d62" px={2.6} position={[s * 1.0, BB.y - BB.h / 2 - 0.55, -0.1]} rotation={[0, 0, -s * 0.5]} />
    ))}
    {/* мостик-помост и перила */}
    <Part geo={rbox(BB.w + 0.2, 0.1, 1.0, 0.03)} color="#2b2d3c" px={3} position={[0, BB.y - BB.h / 2 - 0.05, 0.45]} />
    <Part geo={rbox(BB.w + 0.2, 0.06, 0.06, 0.02)} color="#6a6e88" px={2.4} position={[0, BB.y - BB.h / 2 + 0.38, 0.92]} />
    {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
      <Part key={x} geo={rbox(0.05, 0.43, 0.05, 0.015)} color="#6a6e88" px={2.2} position={[x, BB.y - BB.h / 2 + 0.17, 0.92]} />
    ))}
    {/* рама */}
    <Part geo={rbox(BB.w, BB.h, 0.55, 0.09)} color="#34374a" px={4} position={[0, BB.y, 0]} />
    <Part geo={rbox(BB.w + 0.12, 0.26, 0.7, 0.06)} color="#262838" px={3} position={[0, BB.y + BB.h / 2 + 0.12, 0]} />
    <Part geo={rbox(BB.w - 0.3, 0.18, 0.62, 0.05)} color="#262838" px={2.6} position={[0, BB.y - BB.h / 2 - 0.02, 0.04]} />
    <TexPlane tex={bbCanvas(state)} w={BB.w - 0.4} h={BB.h - 0.4} position={[0, BB.y, 0.285]} />
    {/* прожекторы на выносных штангах */}
    {[-2.0, 0, 2.0].map((x) => (
      <group key={x} position={[x, BB.y + BB.h / 2 + 0.34, 0.45]}>
        <Part geo={rbox(0.08, 0.08, 0.5, 0.02)} color="#1d1e2a" px={2.2} position={[0, -0.04, -0.2]} />
        <Part geo={rbox(0.34, 0.16, 0.26, 0.04)} color="#1d1e2a" px={2.6} />
        <Flat geo={planeGeo} color="#fff3b0" position={[0, -0.02, 0.135]} scale={[0.26, 0.09, 1]} />
      </group>
    ))}
  </group>
);

// ---------- улица целиком ----------
export const Street: React.FC<{ pal: EnvPal; lampOn: boolean; time: number; calm?: boolean; simple?: boolean; signs?: number[]; signLift?: number; flat?: boolean }> = ({ pal, lampOn, calm = false, simple = false, signs, signLift = 0, flat = false }) => {
  const seams = useMemo(() => Array.from({ length: 41 }).map((_, i) => -24 + i * 1.2), []);
  return (
    <group>
      <Sky pal={pal} />
      <Skyline pal={pal} simple={simple} />
      {/* тротуар (плита) и бордюр */}
      <Part geo={rbox(80, 0.3, 3.9, 0.03)} color="#8d8ba6" px={0} position={[0, -0.15, -0.25]} />
      {/* бордюр блоками (видны боковые грани и торцы) + нижняя ступень */}
      <Part geo={rbox(80, 0.12, 0.6, 0.03)} color="#7d7a98" px={0} position={[0, -0.28, 1.95]} />
      {flat && <Part geo={rbox(80, 0.36, 0.34, 0.05)} color="#b4b1cb" px={2.4} position={[0, -0.14, 1.78]} />}
      {!flat && Array.from({ length: 36 }).map((_, i) => (
        <Part key={`cb${i}`} geo={rbox(2.1, 0.36, 0.34, 0.05)} color={i % 2 ? "#c2bfd6" : "#b4b1cb"} px={2.4} position={[-26 + i * 2.2, -0.14, 1.78]} />
      ))}
      {!flat && seams.map((x) => (
        <Flat key={x} geo={planeGeo} color="#6c6a88" position={[x, 0.004, -0.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.04, 3.7, 1]} />
      ))}
      {/* дорога */}
      <mesh geometry={planeGeo} material={flatMat("#2d2d44")} position={[0, -0.3, 12]} rotation={[-Math.PI / 2, 0, 0]} scale={[200, 22, 1]} />
      {Array.from({ length: flat ? 7 : 14 }).map((_, i) => (
        <Flat key={i} geo={planeGeo} color="#f0d24a" position={[-26 + i * (flat ? 8 : 4), -0.295, 7.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[flat ? 4 : 2, 0.14, 1]} />
      ))}
      {BUILDINGS.map((b, i) => (
        <Building key={i} b={b} pal={pal} idx={i} simple={simple} flat={flat} showSign={!signs || signs.includes(i)} signLift={i === 3 ? signLift : 0} />
      ))}
      {!simple && (
        <>
          <Palm x={-7.2} z={-1.3} h={4.4} seed={1} />
          <Palm x={-4.8} z={-1.6} h={3.9} seed={2} />
          <Palm x={9.6} z={-1.3} h={4.2} seed={4} />
          <Palm x={14.0} z={-1.5} h={4.5} seed={5} />
          <Lamp x={-3.6} z={1.45} on={lampOn} />
          {!calm && <Lamp x={7.6} z={1.45} on={lampOn} />}
        </>
      )}
      {!calm && (
        <>
          <Bin x={-4.4} z={-1.0} />
          <Bin x={0.9} z={-1.45} color="#5a5f78" />
          <Bin x={6.9} z={-1.2} />
          <Hydrant x={-4.5} z={1.2} />
          <Hydrant x={6.6} z={1.2} />
        </>
      )}
    </group>
  );
};
