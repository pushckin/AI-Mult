import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Camera, CamKey, Punch, mouthAt } from "../scene1/CameraRig";
import type { Emotion } from "../scene1/characters";
import { BathroomDoor, Smoke, WolfAI, PhoneFlight } from "../props";
import { FPS, fr, mkLines, mkCues, Seg, Char, CU, FACE, headAt, feetAt, peaksAbs, Grain, Vignette, prog } from "./helpers";

export { FPS };
export const SCENE3_FRAMES = fr(timing.durationSec);

const L = mkLines(timing.lines);
const C = mkCues(timing.cues);
const A1 = L.a1, W1 = L.w1, A2 = L.a2, W2 = L.w2, A3 = L.a3;
const OPEN = C.wolfOpen, ERR = C.error502, THROW = C.phoneThrow, SMASH = C.phoneSmash;
const END = timing.durationSec;
const A_LINES = [A1, A2, A3];

const A_EMO: Seg<Emotion> = [
  [0, "gasp"], [A1.startSec, "panic"], [OPEN + 5.5, "worried"], [W1.startSec + 4.5, "gasp"],
  [A2.startSec, "rage"], [ERR + 3.5, "dead"], [A3.startSec - 0.5, "rage"], [THROW + 0.6, "panic"],
];

const smokeAt = (t: number) => interpolate(t, [0, 6, END], [0.22, 0.32, 0.5], { extrapolateRight: "clamp" });

type CP = Omit<React.ComponentProps<typeof Char>, "emoTrack" | "lines" | "who">;
const A: React.FC<CP> = (p) => <Char who="a" emoTrack={A_EMO} lines={A_LINES} soot={1} smoke={1} {...p} />;

const Hall: React.FC<{ gf: number; view?: "front" | "side"; blur?: number }> = ({ gf, view = "front", blur = 0 }) => (
  <div style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined }}>
    <BathroomDoor frame={gf} view={view} slamFrame={-1000} waterOn />
  </div>
);

const wolfLoud = (gf: number) => {
  const t = gf / FPS;
  if (t >= W1.startSec && t <= W1.endSec + 0.1) return mouthAt(W1.mouth, t - W1.startSec);
  if (t >= W2.startSec && t <= W2.endSec + 0.1) return mouthAt(W2.mouth, t - W2.startSec);
  return 0;
};
const Screen: React.FC<{ gf: number }> = ({ gf }) => {
  const m = wolfLoud(gf);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + m * 0.025}) translateY(${-m * 8}px)`, transformOrigin: "50% 50%" }}>
      <WolfAI frame={gf} startFrame={fr(OPEN)} errorFrame={fr(ERR)} />
    </div>
  );
};

type Ctx = { gf: number; lf: number; len: number };
type Shot = { id: string; from: number; to: number; handheld?: number; seed?: number; keys: (n: number) => CamKey[]; punches?: (n: number) => Punch[]; render: (c: Ctx) => React.ReactNode };

const SHOTS: Shot[] = [
  { id: "door_low", from: 0, to: A1.startSec + 2.4, handheld: 2, seed: 1,
    keys: (n) => [{ f: 0, cx: 540, cy: 1250, zoom: 1.0, rot: 2 }, { f: n, cx: 540, cy: 1330, zoom: 1.35, rot: -1, ease: "linear" }],
    render: (c) => (<><Hall gf={c.gf} /><A {...headAt(540, 1380, 1.0)} gf={c.gf} view="front" crouch={1} armL="rest" armR="holdPhone" light="#9ec9ff" look={{ x: 0, y: 0.5 }} /></>) },
  { id: "whisper", from: A1.startSec + 2.4, to: A1.endSec - 0.4, handheld: 6, seed: 2,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy + 30, zoom: 1.1, rot: 4 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.75, rot: 8, ease: "inOut" }],
    punches: () => peaksAbs(A1, A1.startSec + 2.4, A1.endSec, A1.startSec + 2.4, 0.5),
    render: (c) => (<><Hall gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#9ec9ff" sweat={0.8} look={{ x: 0.3, y: 0.3 }} /></>) },
  { id: "tap", from: A1.endSec - 0.4, to: OPEN, handheld: 8, seed: 3,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.0, rot: -3 }, { f: n, cx: 540, cy: 960, zoom: 1.2, rot: 2, ease: "in" }],
    render: (c) => (<div style={{ position: "absolute", inset: 0, background: "#08121a" }}><WolfAI frame={c.gf} startFrame={999999} /></div>) },
  { id: "pov1", from: OPEN, to: OPEN + 3.6, handheld: 6, seed: 4,
    keys: (n) => [{ f: 0, cx: 540, cy: 1060, zoom: 1.0, rot: -3 }, { f: n, cx: 540, cy: 900, zoom: 1.12, rot: 1.0, ease: "inOut" }],
    punches: () => [{ f: 0, amp: 25 }, { f: fr(W1.startSec) - fr(OPEN), amp: 18 }],
    render: (c) => <Screen gf={c.gf} /> },
  { id: "react1", from: OPEN + 3.6, to: OPEN + 6.0, handheld: 5, seed: 5,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy + 20, zoom: 1.2, rot: 2 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.6, rot: -2, ease: "in" }],
    render: (c) => (<><Hall gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#8dff9a" sweat={1} look={{ x: 0.35, y: 0.5 }} /><div style={{ position: "absolute", inset: 0, background: "rgba(80,255,120,.08)", mixBlendMode: "screen" }} /></>) },
  { id: "pov2", from: OPEN + 6.0, to: W1.endSec - 3.2, handheld: 5, seed: 6,
    keys: (n) => [{ f: 0, cx: 540, cy: 900, zoom: 1.0, rot: 1 }, { f: n, cx: 540, cy: 1000, zoom: 1.2, rot: -1, ease: "linear" }],
    punches: () => peaksAbs(W1, OPEN + 6.0, W1.endSec, OPEN + 6.0, 0.5),
    render: (c) => <Screen gf={c.gf} /> },
  { id: "horror", from: W1.endSec - 3.2, to: A2.startSec + 0.3, handheld: 5, seed: 7,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.3, rot: 0 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 2.3, rot: -4, ease: "in" }],
    render: (c) => (<><Hall gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#8dff9a" emo="gasp" sweat={1} twitch={0.4} look={{ x: 0.35, y: 0.5 }} /></>) },
  { id: "rant1", from: A2.startSec + 0.3, to: A2.startSec + 3.3, handheld: 8, seed: 8,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.5, rot: -7 }, { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.95, rot: 7, ease: "inOut" }],
    punches: () => peaksAbs(A2, A2.startSec + 0.3, A2.startSec + 3.3, A2.startSec + 0.3, 1.2),
    render: (c) => (<><Hall gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#8dff9a" sweat={1} twitch={0.6} look={{ x: 0.3, y: 0.4 }} /></>) },
  { id: "rant2", from: A2.startSec + 3.3, to: A2.endSec + 0.1, handheld: 9, seed: 9,
    keys: (n) => [{ f: 0, cx: 540, cy: 1250, zoom: 1.1, rot: 6 }, { f: n, cx: 540, cy: 1250, zoom: 1.5, rot: -6, ease: "in" }],
    punches: () => peaksAbs(A2, A2.startSec + 3.3, A2.endSec, A2.startSec + 3.3, 1.4),
    render: (c) => (<><Hall gf={c.gf} /><A {...headAt(540, 1330, 1.15)} gf={c.gf} view="front" crouch={0.8} armL="grab" armR="holdPhone" light="#8dff9a" sweat={1} twitch={0.8} look={{ x: 0.3, y: 0.4 }} /></>) },
  { id: "pov_err", from: A2.endSec + 0.1, to: ERR + 3.2, handheld: 7, seed: 10,
    keys: (n) => [{ f: 0, cx: 540, cy: 960, zoom: 1.0, rot: -2 }, { f: fr(ERR - A2.endSec - 0.1), cx: 540, cy: 960, zoom: 1.0, rot: 0 }, { f: fr(ERR - A2.endSec - 0.1) + 6, cx: 540, cy: 980, zoom: 1.2, rot: 3, ease: "snap" }, { f: n, cx: 540, cy: 1000, zoom: 1.3, rot: 0, ease: "linear" }],
    punches: () => [{ f: fr(ERR) - fr(A2.endSec + 0.1), amp: 55 }, { f: fr(ERR) - fr(A2.endSec + 0.1) + 5, amp: 30 }],
    render: (c) => <Screen gf={c.gf} /> },
  { id: "sink", from: ERR + 3.2, to: ERR + 5.4, handheld: 4, seed: 11,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.5, rot: 2 }, { f: n, cx: FACE.cx, cy: FACE.cy + 20, zoom: 2.0, rot: 0, ease: "linear" }],
    render: (c) => (<><Hall gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="holdPhone" light="#e11d2a" sweat={1} twitch={Math.min(1, 0.3 + prog(c.lf, 0, 40))} look={{ x: 0.3, y: 0.5 }} /><div style={{ position: "absolute", inset: 0, background: "rgba(225,29,42,.12)", mixBlendMode: "screen" }} /></>) },
  { id: "pov_casino", from: ERR + 5.4, to: A3.startSec - 0.6, handheld: 6, seed: 12,
    keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.3, rot: -2 }, { f: n, cx: 540, cy: 900, zoom: 1.1, rot: 3, ease: "linear" }],
    render: (c) => <Screen gf={c.gf} /> },
  { id: "windup", from: A3.startSec - 0.6, to: THROW, handheld: 9, seed: 13,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.4, rot: -4 }, { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 2.1, rot: 5, ease: "in" }],
    render: (c) => (<><Hall gf={c.gf} blur={9} /><A {...CU} gf={c.gf} view="front" armR="throw" emo="rage" sweat={1} twitch={0.7} look={{ x: 0.7, y: 0 }} /></>) },
  { id: "throw", from: THROW, to: THROW + 1.5, handheld: 4, seed: 14,
    keys: (n) => [{ f: 0, cx: 540, cy: 1050, zoom: 1.0, rot: 0 }, { f: 12, cx: 600, cy: 1000, zoom: 1.0, rot: 0 }, { f: 14, cx: 600, cy: 1000, zoom: 1.12, rot: 3, ease: "snap" }, { f: n, cx: 600, cy: 1000, zoom: 1.05, rot: 0, ease: "linear" }],
    punches: () => [{ f: fr(SMASH) - fr(THROW), amp: 70 }, { f: fr(SMASH) - fr(THROW) + 4, amp: 40 }, { f: fr(SMASH) - fr(THROW) + 9, amp: 20 }],
    render: (c) => (
      <>
        <Hall gf={c.gf} view="side" blur={2} />
        <A {...feetAt(260, 1600, 0.95)} gf={c.gf} view="side" facing="right" armR={c.lf < 3 ? "throw" : "rest"} emo="rage" lean={c.lf < 3 ? -0.4 : 0.5} sweat={1} />
        <PhoneFlight frame={c.gf} startFrame={fr(THROW)} />
      </>
    ) },
  { id: "scream", from: THROW + 1.5, to: A3.endSec + 0.05, handheld: 10, seed: 15,
    keys: (n) => [{ f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.5, rot: 5 }, { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 2.1, rot: -5, ease: "linear" }],
    punches: () => peaksAbs(A3, THROW + 1.5, A3.endSec, THROW + 1.5, 1.4),
    render: (c) => (<><Hall gf={c.gf} view="front" blur={9} /><A {...CU} gf={c.gf} view="front" armL="handsOnHead" armR="handsOnHead" sweat={1} twitch={0.8} look={{ x: 0.4, y: 0.1 }} /></>) },
  { id: "shards", from: A3.endSec + 0.05, to: END, handheld: 1.5, seed: 16,
    keys: (n) => [{ f: 0, cx: 640, cy: 1300, zoom: 1.0 }, { f: n, cx: 800, cy: 1760, zoom: 2.0, ease: "inOut" }],
    render: (c) => (<><Hall gf={c.gf} view="side" /><PhoneFlight frame={c.gf} startFrame={fr(THROW)} /></>) },
];

export const Scene3: React.FC = () => {
  const gf = useCurrentFrame();
  const t = gf / FPS;
  const shot = SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];
  const a = fr(shot.from);
  const len = Math.max(1, fr(shot.to) - a);
  const lf = gf - a;
  const pov = ["tap", "pov1", "pov2", "pov_err", "pov_casino"].includes(shot.id);
  const sf = gf - fr(SMASH);
  const flashW = sf >= 0 && sf < 2 ? 1 : 0;
  const ef = gf - fr(ERR);
  const flashR = ef >= 0 && ef < 10 ? interpolate(ef, [0, 10], [0.5, 0]) : 0;
  const d = smokeAt(t);
  const phoneDead = t > A3.endSec;
  return (
    <AbsoluteFill style={{ backgroundColor: "#120c0a" }}>
      <Camera frame={lf} keys={shot.keys(len)} handheld={shot.handheld ?? 3} seed={shot.seed ?? 0} punches={shot.punches?.(len) ?? []}>
        {shot.render({ gf, lf, len })}
      </Camera>
      {!pov && <Smoke frame={gf} density={d} from={-30} />}
      {!pov && <Grain gf={gf} id="pg3" />}
      {!pov && <Vignette gf={gf} strength={0.7} />}
      {pov && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)" }} />}
      {phoneDead && <AbsoluteFill style={{ background: `rgba(8,5,4,${prog(t, A3.endSec, END) * 0.2})` }} />}
      {flashR > 0 && <AbsoluteFill style={{ background: `rgba(225,29,42,${flashR})`, mixBlendMode: "screen" }} />}
      {flashW > 0 && <AbsoluteFill style={{ background: "#fff" }} />}
    </AbsoluteFill>
  );
};
