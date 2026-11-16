import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Camera, CamKey, Punch } from "../scene1/CameraRig";
import type { Emotion } from "../scene1/characters";
import { KitchenMess, BathroomDoor, StoveFire, WineSplash, Smoke } from "../props";
import { FPS, fr, mkLines, mkCues, Seg, Char, CU, FACE, headAt, feetAt, peaksAbs, Grain, Vignette, prog, DeadPhone, Line } from "./helpers";

export { FPS };
export const SCENE2_FRAMES = fr(timing.durationSec);

const L = mkLines(timing.lines);
const C = mkCues(timing.cues);
const K1 = L.k1, A1 = L.a1, A2 = L.a2, A3 = L.a3, A4 = L.a4;
const SLAP = C.slap, SLAM = C.doorSlam, PASTA = C.pastaDump, WHOOSH = C.fireWhoosh, WINE = C.wineSplash, SMOKE = C.smokeFull;
const END = timing.durationSec;
const A_LINES = [A1, A2, A3, A4];
const K_LINES = [K1];

const A_EMO: Seg<Emotion> = [
  [0, "dead"], [K1.startSec + 2.5, "worried"], [K1.endSec - 1.5, "panic"], [A1.startSec + 4.5, "panic"],
  [SLAP, "gasp"], [SLAP + 1.4, "panic"], [A3.startSec, "worried"], [A3.startSec + 4, "gasp"], [PASTA - 1.5, "panic"],
  [WHOOSH, "gasp"], [WINE + 0.2, "panic"], [SMOKE, "dead"],
];
const K_EMO: Seg<Emotion> = [[0, "neutral"], [K1.startSec, "furious"]];

const sootAt = (t: number) => interpolate(t, [WHOOSH, WINE + 1.5, SMOKE + 2], [0, 0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const smokeAt = (t: number) => interpolate(t, [WHOOSH, WINE, SMOKE, END], [0, 0.25, 0.55, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

type CP = Omit<React.ComponentProps<typeof Char>, "emoTrack" | "lines" | "who">;
const A: React.FC<CP> = (p) => <Char who="a" emoTrack={A_EMO} lines={A_LINES} soot={sootAt(p.gf / FPS)} smoke={smokeAt(p.gf / FPS) > 0.3 ? 1 : 0} {...p} />;
const K: React.FC<CP> = (p) => <Char who="k" emoTrack={K_EMO} lines={K_LINES} {...p} />;

const Bg: React.FC<{ gf: number; view?: "wide" | "table" | "backWall"; blur?: number }> = ({ gf, view = "backWall", blur = 0 }) => (
  <div style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined }}>
    <KitchenMess frame={gf} view={view} ashOnTable={gf / FPS > WHOOSH} parallax={{ x: Math.sin(gf * 0.012) * 0.6, y: Math.cos(gf * 0.009) * 0.3 }} melt={0.6} />
  </div>
);
const Fire: React.FC<{ gf: number; x: number; y: number; s: number; wine?: boolean }> = ({ gf, x, y, s, wine = true }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 600, height: 500, transform: `scale(${s})`, transformOrigin: "0 0" }}>
    <StoveFire frame={gf} startFrame={fr(PASTA)} />
    {wine && <WineSplash frame={gf} startFrame={fr(WINE)} />}
  </div>
);

const Pot: React.FC = () => (
  <svg width={300} height={260} viewBox="0 0 300 260" style={{ position: "absolute", left: 650, top: 1215 }}>
    <path d="M 20 70 Q 150 40 280 70 L 270 230 Q 150 250 30 230 Z" fill="#9aa3ad" stroke="#1a100c" strokeWidth={6} />
    <ellipse cx={150} cy={62} rx={130} ry={22} fill="#5c646d" stroke="#1a100c" strokeWidth={6} />
    <path d="M 20 100 L -20 90 M 280 100 L 320 90" stroke="#1a100c" strokeWidth={14} strokeLinecap="round" />
  </svg>
);
const StoveSet: React.FC<{ gf: number; pot?: boolean }> = ({ gf, pot = true }) => (
  <>
    <div style={{ position: "absolute", left: 500, top: 1150, width: 600, height: 500 }}>
      <StoveFire frame={gf} startFrame={999999} />
    </div>
    {pot && <Pot />}
  </>
);
type Ctx = { gf: number; lf: number; len: number };
type Shot = { id: string; from: number; to: number; handheld?: number; seed?: number; keys: (n: number) => CamKey[]; punches?: (n: number) => Punch[]; render: (c: Ctx) => React.ReactNode };

const wob = (t: number) => ({ x: Math.sin(t * 1.7) * 0.35, y: Math.sin(t * 0.9) * 0.2 });
/* бег кругами: эллипс по кухне */
const circle = (t: number, sp: number) => {
  const a = t * sp;
  return { x: 540 + Math.cos(a) * 300, d: Math.sin(a) };
};

const SHOTS: Shot[] = [
  { id: "wide0", from: 0, to: K1.startSec + 1.2, handheld: 2, keys: (n) => [{ f: 0, cx: 540, cy: 900, zoom: 1.0 }, { f: n, cx: 540, cy: 860, zoom: 1.25, ease: "linear" }],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="wide" />
        <A {...headAt(250, 800, 0.62)} gf={c.gf} view="side" facing="right" upperBodyOnly armR="holdHand" armL="underTable" x={250 - 470 * 0.62} y={1095 - 1170 * 0.62} s={0.62} />
        <K gf={c.gf} view="side" facing="left" upperBodyOnly armR="holdHand" armL="table" x={830 - 530 * 0.62} y={1095 - 1170 * 0.62} s={0.62} tear={0.8} />
      </>
    ) },
  { id: "k_cu", from: K1.startSec + 1.2, to: K1.endSec - 1.9, handheld: 4, seed: 1,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy + 20, zoom: 1.1, rot: -1 }, { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.75, rot: 1.8, ease: "in" }],
    punches: () => peaksAbs(K1, K1.startSec + 1.2, K1.endSec - 1.9, K1.startSec + 1.2, 0.8),
    render: (c) => (<><Bg gf={c.gf} blur={8} /><K {...CU} gf={c.gf} view="front" tear={0.6} look={{ x: 0, y: 0.1 }} /></>) },
  { id: "k_stand", from: K1.endSec - 1.9, to: A1.startSec + 0.2, handheld: 5, seed: 2,
    keys: (n) => [{ f: 0, cx: 540, cy: 1350, zoom: 1.1, rot: 4 }, { f: n, cx: 540, cy: 850, zoom: 1.45, rot: -2, ease: "inOut" }],
    render: (c) => (<><Bg gf={c.gf} blur={5} /><K {...feetAt(540, 1520, 1.05)} gf={c.gf} view="front" lean={0.4} armL="rest" armR="rest" /></>) },
  { id: "a_phone", from: A1.startSec + 0.2, to: A1.startSec + 4.4, handheld: 5, seed: 3,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy + 30, zoom: 1.05, rot: 2 }, { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.5, rot: -2, ease: "inOut" }],
    punches: () => peaksAbs(A1, A1.startSec + 0.2, A1.startSec + 4.4, A1.startSec + 0.2, 0.7),
    render: (c) => (<><Bg gf={c.gf} blur={8} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#9ec9ff" sweat={0.9} look={{ x: 0.4, y: 0.4 }} /></>) },
  { id: "dead_pov", from: A1.startSec + 4.4, to: A1.startSec + 6.0, handheld: 7, seed: 4,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.0, rot: -3 }, { f: n, cx: 540, cy: 900, zoom: 1.25, rot: 2, ease: "inOut" }],
    render: (c) => <DeadPhone gf={c.gf} /> },
  { id: "a_pan", from: A1.startSec + 6.0, to: A1.endSec - 1.2, handheld: 6, seed: 5,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.3, rot: 3 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.9, rot: 6, ease: "inOut" }],
    punches: () => peaksAbs(A1, A1.startSec + 6.0, A1.endSec - 1.2, A1.startSec + 6.0, 1),
    render: (c) => (<><Bg gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#9ec9ff" sweat={1} twitch={0.6} look={wob(c.gf / FPS)} /></>) },
  { id: "wide_slap", from: A1.endSec - 1.2, to: SLAP, handheld: 3, seed: 6,
    keys: (n) => [{ f: 0, cx: 540, cy: 1050, zoom: 1.0 }, { f: n, cx: 540, cy: 900, zoom: 1.35, ease: "in" }],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" />
        <A {...feetAt(300, 1500, 0.95)} gf={c.gf} view="side" facing="right" lean={-0.3} armR="holdPhone" />
        <K {...feetAt(780, 1500, 0.95)} gf={c.gf} view="side" facing="left" armR="slap" lean={0.4} />
      </>
    ) },
  { id: "slap_hit", from: SLAP, to: SLAP + 1.5, handheld: 6, seed: 7,
    keys: (n) => [{ f: 0, cx: FACE.cx + 60, cy: FACE.cy, zoom: 1.9, rot: -8 }, { f: 6, cx: FACE.cx, cy: FACE.cy, zoom: 1.6, rot: 2, ease: "snap" }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.75, rot: 0, ease: "linear" }],
    punches: () => [{ f: 0, amp: 60 }, { f: 4, amp: 30 }],
    render: (c) => {
      const sw = Math.exp(-c.lf * 0.25);
      return (
        <>
          <Bg gf={c.gf} blur={9} />
          <A {...CU} x={CU.x + 90 * sw} gf={c.gf} view="front" rotate={14 * sw} armR="holdPhone" sweat={1} look={{ x: 0.5, y: 0.2 }} />
          <div style={{ position: "absolute", left: 640, top: 760, width: 300, height: 240, borderRadius: "50%", background: "radial-gradient(rgba(225,29,42,.75), rgba(225,29,42,0) 70%)", opacity: Math.min(1, 0.4 + prog(c.lf, 2, 12)) * (1 - prog(c.lf, 28, 36) * 0.3) }} />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = i * 1.05 + c.lf * 0.15;
            return <div key={i} style={{ position: "absolute", left: 540 + Math.cos(a) * 330, top: 620 + Math.sin(a) * 90, fontSize: 80, color: "#ffd23a", opacity: 1 - prog(c.lf, 10, 30), fontFamily: "Arial Black" }}>★</div>;
          })}
        </>
      );
    } },
  { id: "walk_off", from: SLAP + 1.5, to: SLAM, handheld: 3, seed: 8,
    keys: (n) => [{ f: 0, cx: 640, cy: 1000, zoom: 1.1 }, { f: n, cx: 300, cy: 1000, zoom: 1.2, ease: "inOut" }],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" />
        <K {...feetAt(900 - prog(c.lf, 0, 17) * 640, 1500, 0.95)} gf={c.gf} view="side" facing="left" walk={1.6} armR="rest" lean={0.3} />
      </>
    ) },
  { id: "door", from: SLAM, to: A2.startSec, handheld: 3, seed: 9,
    keys: (n) => [{ f: 0, cx: 540, cy: 960, zoom: 1.25, rot: 3 }, { f: 5, cx: 540, cy: 960, zoom: 1.0, ease: "snap" }, { f: n, cx: 540, cy: 1000, zoom: 1.12, ease: "linear" }],
    punches: () => [{ f: 0, amp: 55 }, { f: 4, amp: 25 }],
    render: (c) => <BathroomDoor frame={c.gf} view="front" slamFrame={fr(SLAM)} waterOn={c.gf >= fr(C.waterOn)} /> },
  { id: "run1", from: A2.startSec, to: A2.startSec + 2.6, handheld: 6, seed: 10,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.0, rot: -6 }, { f: n, cx: 540, cy: 1000, zoom: 1.3, rot: 6, ease: "linear" }],
    punches: () => peaksAbs(A2, A2.startSec, A2.startSec + 2.6, A2.startSec, 0.8),
    render: (c) => {
      const p = circle(c.gf / FPS, 3.2);
      return (<><Bg gf={c.gf} view="wide" /><A {...feetAt(p.x, 1500 + p.d * 60, 0.9 + p.d * 0.1)} gf={c.gf} view="side" facing={Math.sin(c.gf / FPS * 3.2 + 1.57) > 0 ? "right" : "left"} walk={2.5} lean={0.5} armL="handsOnHead" armR="handsOnHead" sweat={1} /></>);
    } },
  { id: "head_cu", from: A2.startSec + 2.6, to: A2.startSec + 4.8, handheld: 8, seed: 11,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.3, rot: -7 }, { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 2.0, rot: 9, ease: "in" }],
    punches: () => peaksAbs(A2, A2.startSec + 2.6, A2.startSec + 4.8, A2.startSec + 2.6, 1.2),
    render: (c) => (<><Bg gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armL="handsOnHead" armR="handsOnHead" sweat={1} twitch={0.8} look={wob(c.gf / FPS)} /></>) },
  { id: "run2", from: A2.startSec + 4.8, to: A2.endSec + 0.05, handheld: 7, seed: 12,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.35, rot: 8 }, { f: n, cx: 540, cy: 1000, zoom: 0.98, rot: -5, ease: "out" }],
    punches: () => peaksAbs(A2, A2.startSec + 4.8, A2.endSec, A2.startSec + 4.8, 1),
    render: (c) => {
      const p = circle(c.gf / FPS + 3, 4);
      return (<><Bg gf={c.gf} view="wide" /><A {...feetAt(p.x, 1500 + p.d * 60, 0.9 + p.d * 0.1)} gf={c.gf} view="front" walk={3} lean={0.4} armL="handsOnHead" armR="grab" sweat={1} /></>);
    } },
  { id: "door2", from: A2.endSec + 0.05, to: A3.startSec, handheld: 3, seed: 13,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.1 }, { f: n, cx: 540, cy: 1180, zoom: 1.5, ease: "in" }],
    render: (c) => <BathroomDoor frame={c.gf} view="front" slamFrame={fr(SLAM)} waterOn /> },
  { id: "stove_a", from: A3.startSec, to: A3.startSec + 4.4, handheld: 3, seed: 14,
    keys: (n) => [{ f: 0, cx: 640, cy: 1150, zoom: 1.0 }, { f: n, cx: 700, cy: 1180, zoom: 1.35, ease: "linear" }],
    render: (c) => (<><Bg gf={c.gf} view="backWall" /><StoveSet gf={c.gf} /><A {...feetAt(430, 1500, 0.95)} gf={c.gf} view="side" facing="right" armR="grab" look={{ x: 0.5, y: 0.3 }} /></>) },
  { id: "a_pot", from: A3.startSec + 4.4, to: A3.startSec + 7.2, handheld: 5, seed: 15,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy + 30, zoom: 1.2, rot: 2 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.7, rot: -3, ease: "inOut" }],
    punches: () => peaksAbs(A3, A3.startSec + 4.4, A3.startSec + 7.2, A3.startSec + 4.4, 1),
    render: (c) => (<><Bg gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" sweat={1} twitch={0.5} look={{ x: 0.6, y: 0.6 }} /></>) },
  { id: "stove_b", from: A3.startSec + 7.2, to: PASTA - 0.3, handheld: 6, seed: 16,
    keys: (n) => [{ f: 0, cx: 640, cy: 1150, zoom: 1.0, rot: 5 }, { f: n, cx: 700, cy: 1180, zoom: 1.4, rot: -4, ease: "in" }],
    punches: () => peaksAbs(A3, A3.startSec + 7.2, A3.endSec, A3.startSec + 7.2, 1),
    render: (c) => (<><Bg gf={c.gf} view="backWall" /><StoveSet gf={c.gf} /><A {...feetAt(430 + Math.sin(c.gf * 0.6) * 12, 1500, 0.95)} gf={c.gf} view="side" facing="right" armR="grab" lean={0.4} sweat={1} walk={1} /></>) },
  { id: "pasta", from: PASTA - 0.3, to: A4.startSec, handheld: 4, seed: 17,
    keys: (n) => [{ f: 0, cx: 540, cy: 1100, zoom: 1.0 }, { f: n, cx: 540, cy: 1000, zoom: 1.2, ease: "in" }],
    punches: () => [{ f: fr(WHOOSH) - fr(PASTA - 0.3), amp: 40 }],
    render: (c) => (<><Bg gf={c.gf} view="backWall" blur={10} /><Fire gf={c.gf} x={90} y={640} s={1.5} wine={false} /><div style={{ position: "absolute", inset: 0, background: "rgba(255,120,20,.25)", opacity: prog(c.gf, fr(WHOOSH), fr(WHOOSH) + 6), mixBlendMode: "screen" }} /></>) },
  { id: "a_fire", from: A4.startSec, to: WINE - 0.3, handheld: 9, seed: 18,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.5, rot: 5 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 2.1, rot: -6, ease: "in" }],
    punches: () => peaksAbs(A4, A4.startSec, A4.endSec, A4.startSec, 1.4),
    render: (c) => (<><Bg gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" emo="gasp" armL="grab" armR="grab" sweat={1} look={{ x: 0.3, y: 0.2 }} /><div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 85%, rgba(255,140,30,${0.5 + Math.sin(c.gf * 1.7) * 0.15}), rgba(255,80,0,0) 65%)`, mixBlendMode: "screen" }} /></>) },
  { id: "wine", from: WINE - 0.3, to: WINE + 1.9, handheld: 8, seed: 19,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.05, rot: -3 }, { f: n, cx: 520, cy: 1000, zoom: 1.35, rot: 2, ease: "out" }],
    punches: () => [{ f: 7, amp: 35 }],
    render: (c) => (<><Bg gf={c.gf} view="backWall" blur={10} /><Fire gf={c.gf} x={90} y={640} s={1.5} /></>) },
  { id: "wide_smoke", from: WINE + 1.9, to: SMOKE + 0.6, handheld: 5, seed: 20,
    keys: (n) => [{ f: 0, cx: 640, cy: 1250, zoom: 1.3, rot: -3 }, { f: n, cx: 560, cy: 1050, zoom: 1.0, rot: 2, ease: "out" }],
    render: (c) => (<><Bg gf={c.gf} view="backWall" /><Fire gf={c.gf} x={500} y={1150} s={1.0} /><A {...feetAt(380, 1500, 0.95)} gf={c.gf} view="side" facing="right" armR="drinkBottle" lean={-0.3} sweat={1} /></>) },
  { id: "final", from: SMOKE + 0.6, to: END, handheld: 4, seed: 21,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.25, rot: 0 }, { f: n, cx: FACE.cx, cy: FACE.cy + 20, zoom: 1.85, rot: 2, ease: "linear" }],
    render: (c) => (<><Bg gf={c.gf} blur={10} /><A {...CU} gf={c.gf} view="front" armL="rest" armR="rest" sweat={1} look={{ x: 0, y: 0.2 }} /></>) },
];

export const Scene2: React.FC = () => {
  const gf = useCurrentFrame();
  const t = gf / FPS;
  const shot = SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];
  const a = fr(shot.from);
  const len = Math.max(1, fr(shot.to) - a);
  const lf = gf - a;
  const sf = gf - fr(SLAP);
  const flashW = sf >= 0 && sf < 2 ? 1 : 0;
  const flashR = sf >= 2 && sf < 14 ? interpolate(sf, [2, 14], [0.55, 0]) : 0;
  const wf = gf - fr(WHOOSH);
  const flashO = wf >= 0 && wf < 12 ? interpolate(wf, [0, 12], [0.6, 0]) : 0;
  const d = smokeAt(t);
  const dark = interpolate(t, [SMOKE, END], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panic = interpolate(t, [A2.startSec, A3.startSec], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#120c0a" }}>
      <Camera frame={lf} keys={shot.keys(len)} handheld={shot.handheld ?? 3} seed={shot.seed ?? 0} punches={shot.punches?.(len) ?? []}>
        {shot.render({ gf, lf, len })}
      </Camera>
      {d > 0 && <Smoke frame={gf} density={d} from={fr(WHOOSH)} />}
      <Grain gf={gf} />
      <Vignette gf={gf} strength={0.62 + panic * 0.1} />
      {dark > 0 && <AbsoluteFill style={{ background: `rgba(8,5,4,${dark})` }} />}
      {flashO > 0 && <AbsoluteFill style={{ background: `rgba(255,140,30,${flashO})`, mixBlendMode: "screen" }} />}
      {flashR > 0 && <AbsoluteFill style={{ background: `rgba(225,29,42,${flashR})`, mixBlendMode: "screen" }} />}
      {flashW > 0 && <AbsoluteFill style={{ background: "#fff" }} />}
    </AbsoluteFill>
  );
};
export type _L = Line;
