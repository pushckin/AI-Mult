import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Camera, CamKey, Punch, prog } from "../scene1/CameraRig";
import type { Emotion } from "../scene1/characters";
import { KitchenMess, BathroomDoor, KatyaChat, Smoke, Timers } from "../props";
import { FPS, fr, Grain, Vignette, Line, Seg, makeChar, CharProps } from "./helpers";

export { FPS };

const LINES = Object.fromEntries((timing.lines as Line[]).map((l) => [l.id, l])) as Record<string, Line>;
const CUES = Object.fromEntries((timing.cues as { id: string; sec: number }[]).map((c) => [c.id, c.sec])) as Record<string, number>;
export const SCENE5_FRAMES = fr(timing.durationSec);
const MK = LINES.mk, MA = LINES.ma, K1 = LINES.k1, A1 = LINES.a1, K2 = LINES.k2, A2 = LINES.a2;
const REVEAL = CUES.reveal, LATCH = CUES.latchClick, TICK = CUES.tickStart, BLACK = CUES.finalBlack;

const A_EMO: Seg<Emotion> = [
  [0, "dead"],
  [A1.startSec - 0.3, "worried"],
  [A1.startSec + 1.6, "dead"],
  [A2.startSec, "neutral"],
  [A2.startSec + 2, "dead"],
];
const K_EMO: Seg<Emotion> = [
  [0, "dead"],
  [K1.startSec, "teary"],
  [K1.endSec + 0.2, "dead"],
  [K2.startSec, "neutral"],
  [K2.startSec + 3.5, "dead"],
];
const Char = makeChar(A_EMO, K_EMO, [MA, A1, A2], [MK, K1, K2]);

const CU_S = 1.5;
const CU = { x: 540 - 500 * CU_S, y: 800 - 390 * CU_S, s: CU_S };
const stand = (cx: number, footY: number, s: number) => ({ x: cx - 500 * s, y: footY - 1400 * s, s });
const WIDE_S = 0.62;
const WIDE_A = { x: 250 - 470 * WIDE_S, y: 1095 - 1170 * WIDE_S, s: WIDE_S };
const WIDE_K = { x: 830 - 530 * WIDE_S, y: 1095 - 1170 * WIDE_S, s: WIDE_S };

const katyaFx = (t: number): Partial<CharProps> => ({
  outfit: "robe",
  mascara: 1,
  cry: interpolate(t, [LATCH, K1.startSec + 1, K2.startSec], [0.7, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  tear: 0.6,
});
const artFx: Partial<CharProps> = { soot: 1, smoke: 0.35 };

const Kit: React.FC<{ gf: number; blur?: number; smoke?: number }> = ({ gf, blur = 0, smoke = 0.7 }) => (
  <div style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined }}>
    <KitchenMess frame={gf} view="wide" smokeAmount={smoke} ashOnTable parallax={{ x: Math.sin(gf * 0.012) * 0.6, y: Math.cos(gf * 0.009) * 0.3 }} melt={0.95} />
  </div>
);

/** оба стоят в дыму */
const TwoStand: React.FC<{ gf: number; a?: Partial<CharProps>; k?: Partial<CharProps> }> = ({ gf, a, k }) => (
  <>
    <Kit gf={gf} smoke={0.45} />
    <Char who="a" gf={gf} {...stand(330, 1640, 0.8)} view="front" {...artFx} armL="rest" armR="rest" look={{ x: 0.6, y: 0 }} {...a} />
    <Char who="k" gf={gf} {...stand(760, 1640, 0.8)} view="front" {...katyaFx(gf / FPS)} armL="rest" armR="rest" look={{ x: -0.6, y: 0 }} {...k} />
    <Smoke frame={gf} density={0.18} />
  </>
);
/** оба сидят за столом (профили) */
const TwoSit: React.FC<{ gf: number; a?: Partial<CharProps>; k?: Partial<CharProps>; timers?: boolean }> = ({ gf, a, k, timers }) => (
  <>
    <Kit gf={gf} smoke={0.3} />
    <Char who="a" gf={gf} {...WIDE_A} view="side" facing="right" upperBodyOnly {...artFx} armR="holdHand" armL="underTable" {...a} />
    <Char who="k" gf={gf} {...WIDE_K} view="side" facing="left" upperBodyOnly {...katyaFx(gf / FPS)} armR="holdHand" armL="table" {...k} />
    {timers && (
      <div style={{ position: "absolute", left: 540 - 540 * 0.7, top: 1050 - 540 * 0.7, width: 1080, height: 700, transform: "scale(0.7)", transformOrigin: "0 0" }}>
        <Timers frame={gf - fr(TICK) + 0} />
      </div>
    )}
  </>
);

type ShotCtx = { gf: number; lf: number; len: number };
type Shot = {
  id: string;
  from: number;
  to: number;
  handheld?: number;
  seed?: number;
  keys: (len: number) => CamKey[];
  punches?: (len: number) => Punch[];
  render: (c: ShotCtx) => React.ReactNode;
};
const CUKeys = (z0: number, z1: number, rot0 = 0, rot1 = 0, cy = 800): ((n: number) => CamKey[]) => (n) => [
  { f: 0, cx: 540, cy: cy + 20, zoom: z0, rot: rot0 },
  { f: n, cx: 540, cy, zoom: z1, rot: rot1, ease: "inOut" },
];
const kCU = (extra: Partial<CharProps> = {}) => (c: ShotCtx) => (
  <>
    <Kit gf={c.gf} blur={8} smoke={0.5} />
    <Char who="k" gf={c.gf} {...CU} view="front" {...katyaFx(c.gf / FPS)} look={{ x: -0.3, y: 0.1 }} {...extra} />
  </>
);
const aCU = (extra: Partial<CharProps> = {}) => (c: ShotCtx) => (
  <>
    <Kit gf={c.gf} blur={8} smoke={0.5} />
    <Char who="a" gf={c.gf} {...CU} view="front" {...artFx} look={{ x: 0.3, y: 0.1 }} {...extra} />
  </>
);

const SHOTS: Shot[] = [
  /* экран Кати: плашка лимита + запрос */
  {
    id: "chat",
    from: 0,
    to: 3.2,
    handheld: 4,
    seed: 1,
    keys: (n) => [
      { f: 0, cx: 540, cy: 960, zoom: 1.0, rot: -1.5 },
      { f: n, cx: 540, cy: 840, zoom: 1.2, rot: 0.8, ease: "linear" },
    ],
    punches: () => [{ f: fr(REVEAL), amp: 26 }],
    render: (c) => <KatyaChat frame={c.gf} startFrame={fr(REVEAL) - 110} limitFrame={fr(REVEAL)} />,
  },
  /* щеколда: низкий угол на дверь */
  {
    id: "door",
    from: 3.2,
    to: 5.2,
    handheld: 3,
    seed: 2,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1200, zoom: 1.4, rot: -3 },
      { f: n, cx: 540, cy: 1050, zoom: 1.1, rot: 0, ease: "out" },
    ],
    punches: () => [{ f: fr(LATCH) - fr(3.2), amp: 24 }],
    render: (c) => {
      const t = c.gf / FPS;
      const enter = prog(t, 4.3, 4.9);
      return (
        <>
          <BathroomDoor frame={c.gf} view="front" latchFrame={fr(LATCH)} />
          {enter > 0 && <Char who="k" gf={c.gf} {...stand(540 + (1 - enter) * 250, 1750, 0.95)} view="front" {...katyaFx(t)} armL="rest" armR="rest" look={{ x: -0.8, y: 0.5 }} />}
        </>
      );
    },
  },
  /* общий: двое в дыму */
  {
    id: "wide_a",
    from: 5.2,
    to: MK.startSec,
    handheld: 2,
    seed: 3,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1000, zoom: 1.05 },
      { f: n, cx: 540, cy: 1000, zoom: 1.25, ease: "linear" },
    ],
    render: (c) => <TwoStand gf={c.gf} />,
  },
  /* мычание: Катя, потом Артём */
  {
    id: "k_mumble",
    from: MK.startSec,
    to: 7.45,
    handheld: 5,
    seed: 4,
    keys: CUKeys(1.1, 1.5, 2, -1),
    render: kCU({ twitch: 0.6 }),
  },
  {
    id: "a_mumble",
    from: 7.45,
    to: MA.endSec + 0.1,
    handheld: 5,
    seed: 5,
    keys: CUKeys(1.1, 1.6, -2, 1),
    render: aCU({ twitch: 0.8, sweat: 0.4 }),
  },
  {
    id: "wide_b",
    from: MA.endSec + 0.1,
    to: K1.startSec,
    handheld: 2,
    seed: 6,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1000, zoom: 1.25 },
      { f: n, cx: 540, cy: 1000, zoom: 1.05, ease: "inOut" },
    ],
    render: (c) => <TwoStand gf={c.gf} />,
  },
  /* k1 */
  { id: "k1", from: K1.startSec, to: A1.startSec, handheld: 3, seed: 7, keys: CUKeys(1.2, 1.5, 1, -0.5), render: kCU() },
  /* a1 */
  {
    id: "a1",
    from: A1.startSec,
    to: A1.endSec - 0.9,
    handheld: 3,
    seed: 8,
    keys: CUKeys(1.2, 1.55, -1, 0.5),
    render: (c) => aCU({ look: { x: 0, y: 0.5 } , sweat: 0.3, armR: "rest" })(c),
  },
  { id: "wide_c", from: A1.endSec - 0.9, to: K2.startSec + 1.6, handheld: 2, seed: 9, keys: (n) => [{ f: 0, cx: 540, cy: 1000, zoom: 1.1 }, { f: n, cx: 560, cy: 1000, zoom: 1.2, ease: "linear" }], render: (c) => <TwoStand gf={c.gf} k={{ emo: "neutral" }} /> },
  /* k2: говорит, потом садится */
  { id: "k2a", from: K2.startSec + 1.6, to: 19.4, handheld: 3, seed: 10, keys: CUKeys(1.25, 1.55, 1.5, -1), render: kCU() },
  {
    id: "sit",
    from: 19.4,
    to: A1.endSec + 9,
    handheld: 2,
    seed: 11,
    keys: (n) => [
      { f: 0, cx: 540, cy: 900, zoom: 1.4 },
      { f: n, cx: 540, cy: 900, zoom: 1.1, ease: "out" },
    ],
    render: (c) => <TwoSit gf={c.gf} />,
  },
  /* пауза: Артём тихо */
  { id: "a_beat", from: A1.endSec + 9, to: A2.startSec + 0.9, handheld: 3, seed: 12, keys: CUKeys(1.2, 1.45, 1, 0), render: aCU() },
  /* пьёт с горла */
  {
    id: "drink",
    from: A2.startSec + 0.9,
    to: TICK,
    handheld: 3,
    seed: 13,
    keys: (n) => [
      { f: 0, cx: 440, cy: 780, zoom: 1.6 },
      { f: n, cx: 540, cy: 840, zoom: 1.25, ease: "linear" },
    ],
    render: (c) => <TwoSit gf={c.gf} a={{ armR: "drinkBottle", emo: "dead" }} k={{ emo: "dead" }} />,
  },
  /* отъезд: два таймера, дым, тикание */
  {
    id: "pullback",
    from: TICK,
    to: BLACK,
    handheld: 1.5,
    seed: 14,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1000, zoom: 2.0, rot: 0 },
      { f: n, cx: 540, cy: 1000, zoom: 0.98, rot: 0, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <TwoSit gf={c.gf} timers a={{ emo: "dead" }} k={{ emo: "dead" }} />
      </>
    ),
  },
];

export const Scene5: React.FC = () => {
  const gf = useCurrentFrame();
  const t = gf / FPS;
  if (t >= BLACK) return <AbsoluteFill style={{ background: "#000" }} />;
  const shot = SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];
  const a = fr(shot.from);
  const len = Math.max(1, fr(shot.to) - a);
  const ctx: ShotCtx = { gf, lf: gf - a, len };
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0605" }}>
      <Camera frame={ctx.lf} keys={shot.keys(len)} handheld={shot.handheld ?? 3} seed={shot.seed ?? 0} punches={shot.punches?.(len) ?? []}>
        {shot.render(ctx)}
      </Camera>
      <Grain gf={gf} />
      <Vignette gf={gf} strength={0.75} />
    </AbsoluteFill>
  );
};
