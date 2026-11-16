import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Camera, CamKey, Punch, prog } from "../scene1/CameraRig";
import type { Emotion } from "../scene1/characters";
import { KitchenMess, BathroomDoor, LockScreen, Smoke } from "../props";
import { FPS, fr, Grain, Vignette, Line, Seg, makeChar, peaks, CharProps } from "./helpers";

export { FPS };

const LINES = Object.fromEntries((timing.lines as Line[]).map((l) => [l.id, l])) as Record<string, Line>;
const CUES = Object.fromEntries((timing.cues as { id: string; sec: number }[]).map((c) => [c.id, c.sec])) as Record<string, number>;
export const SCENE4_FRAMES = fr(timing.durationSec);
const END = timing.durationSec;
const A1 = LINES.a1, A2 = LINES.a2;
const FID = CUES.faceIdFail, T1 = CUES.try1, T2 = CUES.try2, UNL = CUES.unlock, APP = CUES.appOpen;

const A_EMO: Seg<Emotion> = [
  [0, "dead"],
  [2.2, "rage"],
  [A1.startSec + 5.5, "panic"],
  [15.0, "worried"],
  [A2.startSec - 0.2, "smile"],
  [27.2, "smile"],
  [APP, "gasp"],
  [APP + 1.2, "dead"],
];
const Char = makeChar(A_EMO, [[0, "neutral"]], [A1, A2], []);

/* ---------- мир ---------- */
const CU_S = 1.5;
const CU = { x: 540 - 500 * CU_S, y: 800 - 390 * CU_S, s: CU_S };
/** стоящий в полный рост Артём: голова ≈ (cx, headY) */
const stand = (cx: number, footY: number, s: number) => ({ x: cx - 500 * s, y: footY - 1400 * s, s });

const Bag: React.FC<{ x: number; y: number; glow?: number; sc?: number }> = ({ x, y, glow = 0, sc = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${sc})`}>
    {/* айфон торчит */}
    <g transform="translate(14 -118) rotate(8)">
      <rect x={-34} y={-70} width={74} height={150} rx={14} fill="#1b1b22" stroke="#120c0a" strokeWidth={5} />
      <rect x={-27} y={-62} width={60} height={58} rx={8} fill={`rgba(160,215,255,${0.35 + glow * 0.5})`} />
      <circle cx={-8} cy={-48} r={7} fill="#0f0f14" />
    </g>
    <path d="M -110 0 L -96 -120 Q 0 -140 96 -120 L 112 0 Z" fill="#d94a6b" stroke="#120c0a" strokeWidth={6} strokeLinejoin="round" />
    <path d="M -96 -120 Q 0 -90 96 -120" fill="none" stroke="#120c0a" strokeWidth={5} />
    <path d="M -60 -120 Q -50 -200 0 -200 Q 50 -200 60 -120" fill="none" stroke="#a52f4d" strokeWidth={14} strokeLinecap="round" />
    <circle cx={0} cy={-84} r={9} fill="#f4c46c" stroke="#120c0a" strokeWidth={3} />
  </g>
);
const BAG = { x: 800, y: 1058 };

const Kit: React.FC<{ gf: number; blur?: number; bag?: boolean; glow?: number; shift?: number }> = ({ gf, blur = 0, bag = true, glow = 0, shift = 0 }) => (
  <div style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined }}>
    <KitchenMess frame={gf} view="wide" smokeAmount={0.4} ashOnTable parallax={{ x: Math.sin(gf * 0.012) * 0.6 + shift, y: Math.cos(gf * 0.009) * 0.3 }} melt={0.9} />
    {bag && (
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Bag {...BAG} glow={glow} />
      </svg>
    )}
  </div>
);

/* ---------- шоты ---------- */
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
  noCam?: boolean;
};

const sootA = { soot: 1 };
const face = (extra: Partial<CharProps> = {}) => (c: ShotCtx) => (
  <>
    <Kit gf={c.gf} blur={8} bag={false} />
    <Char who="a" gf={c.gf} {...CU} view="front" {...sootA} {...extra} />
  </>
);
const phoneShot = (c: ShotCtx, children: React.ReactNode, amp: number, seed: number, punches: Punch[] = []) => (
  <Camera
    frame={c.lf}
    handheld={amp}
    seed={seed}
    punches={punches}
    keys={[
      { f: 0, cx: 540, cy: 1020, zoom: 1.0, rot: -3 },
      { f: c.len, cx: 540, cy: 930, zoom: 1.2, rot: 1.5, ease: "inOut" },
    ]}
  >
    {children}
  </Camera>
);

const CREEP_FROM = 8.6, CREEP_TO = 11.9;
const SHOTS: Shot[] = [
  /* 1. Встаёт из-под стола (низкий угол) */
  {
    id: "rise",
    from: 0,
    to: 2.2,
    handheld: 3,
    seed: 1,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1250, zoom: 1.5, rot: -4 },
      { f: n, cx: 540, cy: 1000, zoom: 1.05, rot: 2, ease: "out" },
    ],
    render: (c) => (
      <>
        <Kit gf={c.gf} />
        <Char who="a" gf={c.gf} {...stand(520, 1520, 0.9)} view="front" soot={1} smoke={0.5} crouch={1 - prog(c.lf, 0, 40)} lean={0.2} armL="rest" armR="rest" look={{ x: 0, y: 0.3 }} />
      </>
    ),
  },
  /* 2. Безумные глаза */
  {
    id: "eyes",
    from: 2.2,
    to: A1.startSec,
    handheld: 5,
    seed: 2,
    keys: (n) => [
      { f: 0, cx: 540, cy: 780, zoom: 1.3, rot: 2 },
      { f: n, cx: 540, cy: 760, zoom: 2.1, rot: -1.5, ease: "in" },
    ],
    render: face({ twitch: 0.8, look: { x: 0.6, y: 0.2 } }),
  },
  /* 3. Шёпот — крупно */
  {
    id: "whisper",
    from: A1.startSec,
    to: 7.0,
    handheld: 5,
    seed: 3,
    keys: (n) => [
      { f: 0, cx: 540, cy: 830, zoom: 1.2, rot: -3 },
      { f: n, cx: 520, cy: 790, zoom: 1.55, rot: 2, ease: "inOut" },
    ],
    render: face({ twitch: 0.5, sweat: 0.6, look: { x: 0.9, y: 0.4 } }),
  },
  /* 4. Сумочка: торчит айфон (POV) */
  {
    id: "bag",
    from: 7.0,
    to: CREEP_FROM,
    handheld: 4,
    seed: 4,
    keys: (n) => [
      { f: 0, cx: 640, cy: 1050, zoom: 1.5, rot: 4 },
      { f: n, cx: 760, cy: 990, zoom: 2.5, rot: -2, ease: "inOut" },
    ],
    render: (c) => <Kit gf={c.gf} glow={0.5 + 0.5 * Math.sin(c.gf * 0.3)} />,
  },
  /* 5. Крадётся: низкий угол, голландский угол, трекинг */
  {
    id: "creep",
    from: CREEP_FROM,
    to: CREEP_TO,
    handheld: 6,
    seed: 5,
    keys: (n) => [
      { f: 0, cx: 380, cy: 1080, zoom: 1.2, rot: -7 },
      { f: n, cx: 640, cy: 1060, zoom: 1.3, rot: -5, ease: "linear" },
    ],
    render: (c) => {
      const p = prog(c.lf, 0, c.len);
      return (
        <>
          <Kit gf={c.gf} glow={0.6} />
          <Char who="a" gf={c.gf} {...stand(260 + p * 340, 1560, 0.95)} view="front" soot={1} walk={1.1} lean={0.7} armL="rest" armR="grab" look={{ x: 0.8, y: 0.5 }} />
        </>
      );
    },
  },
  /* 6. Лицо у цели, финал шёпота */
  {
    id: "want",
    from: CREEP_TO,
    to: A1.endSec,
    handheld: 6,
    seed: 6,
    keys: (n) => [
      { f: 0, cx: 540, cy: 800, zoom: 1.5, rot: 5 },
      { f: n, cx: 540, cy: 780, zoom: 2.4, rot: -3, ease: "in" },
    ],
    punches: () => peaks(A1, 0.78, 1),
    render: face({ twitch: 0.9, sweat: 1, look: { x: 0.9, y: 0.6 }, armR: "grab" }),
  },
  /* 7. Хватает */
  {
    id: "grab",
    from: A1.endSec,
    to: 14.7,
    handheld: 7,
    seed: 7,
    keys: (n) => [
      { f: 0, cx: 640, cy: 1050, zoom: 1.2, rot: -4 },
      { f: n, cx: 700, cy: 1000, zoom: 1.45, rot: 3, ease: "snap" },
    ],
    punches: () => [{ f: 6, amp: 34 }],
    render: (c) => (
      <>
        <Kit gf={c.gf} bag />
        <Char who="a" gf={c.gf} {...stand(600, 1560, 0.95)} view="front" soot={1} lean={0.8} armR="grab" armL="rest" look={{ x: 1, y: 0.7 }} />
      </>
    ),
  },
  /* 8. Дверь ванной: подносит телефон к замочной скважине */
  {
    id: "keyhole",
    from: 14.7,
    to: 15.7,
    handheld: 5,
    seed: 8,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1100, zoom: 1.0, rot: 2 },
      { f: n, cx: 540, cy: 1020, zoom: 1.25, rot: -2, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <BathroomDoor frame={c.gf} view="front" waterOn />
        <Char who="a" gf={c.gf} x={540 - 500 * 1.2} y={1020 - 390 * 1.2 + 190} s={1.2} view="front" soot={1} armR="holdPhone" light="#bfe6ff" lean={0.4} look={{ x: 0, y: -0.3 }} />
      </>
    ),
  },
  /* 9. FaceID не срабатывает */
  {
    id: "faceid",
    from: 15.7,
    to: 17.1,
    noCam: true,
    keys: () => [{ f: 0, cx: 540, cy: 960, zoom: 1 }],
    render: (c) =>
      phoneShot(c, <LockScreen frame={c.gf} startFrame={fr(15.7)} mode="faceid" failFrames={[fr(FID)]} />, 6, 9, [{ f: fr(FID) - fr(15.7), amp: 30 }]),
  },
  /* 10-14. пароль */
  ...[
    [17.1, 18.95, 10],
    [20.4, 22.2, 12],
    [22.2, UNL + 0.35, 14],
  ].map(
    ([a, b, seed]): Shot => ({
      id: `pass${seed}`,
      from: a,
      to: b,
      noCam: true,
      keys: () => [{ f: 0, cx: 540, cy: 960, zoom: 1 }],
      render: (c) =>
        phoneShot(
          c,
          <LockScreen frame={c.gf} startFrame={fr(17.1)} mode="passcode" tries={["0614", "1412", "0000"]} failFrames={[fr(T1), fr(T2)]} successFrame={fr(UNL)} />,
          5 + (seed - 10),
          seed,
          [T1, T2, UNL].filter((q) => fr(q) >= fr(a) && fr(q) < fr(b)).map((q) => ({ f: fr(q) - fr(a), amp: 22 }))
        ),
    })
  ),
  {
    id: "sweat1",
    from: 18.95,
    to: 20.4,
    handheld: 7,
    seed: 11,
    keys: (n) => [
      { f: 0, cx: 540, cy: 850, zoom: 1.3, rot: 4 },
      { f: n, cx: 540, cy: 800, zoom: 1.7, rot: -2, ease: "in" },
    ],
    render: (c) => face({ twitch: 0.8, sweat: 1, emo: "panic", armR: "holdPhone", light: "#bfe6ff", look: { x: 0, y: 0.9 } })(c),
  },
  /* 15. «Есть!» — ликование, пунч-зум */
  {
    id: "yes",
    from: UNL + 0.35,
    to: A2.endSec + 0.1,
    handheld: 8,
    seed: 15,
    keys: (n) => [
      { f: 0, cx: 540, cy: 800, zoom: 1.6, rot: -6 },
      { f: n, cx: 540, cy: 790, zoom: 2.4, rot: 5, ease: "linear" },
    ],
    punches: () => peaks(A2, 0, 1),
    render: face({ twitch: 0.5, sweat: 0.8, light: "#bfe6ff", look: { x: 0, y: 0.5 } }),
  },
  /* 16. Тянется к приложению */
  {
    id: "tap",
    from: A2.endSec + 0.1,
    to: APP,
    handheld: 6,
    seed: 16,
    keys: (n) => [
      { f: 0, cx: 540, cy: 900, zoom: 1.0, rot: 3 },
      { f: n, cx: 540, cy: 820, zoom: 1.5, rot: -1, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <Kit gf={c.gf} blur={8} bag={false} />
        <Char who="a" gf={c.gf} {...CU} y={CU.y + 120} view="front" soot={1} sweat={0.6} armR="holdPhone" light="#bfe6ff" emo="smile" look={{ x: 0, y: 0.9 }} />
      </>
    ),
  },
  /* 17. Замирает: экстремальный крупный план, лицо «стекает» */
  {
    id: "freeze",
    from: APP,
    to: END,
    handheld: 2,
    seed: 17,
    keys: (n) => [
      { f: 0, cx: 540, cy: 800, zoom: 1.5, rot: 0 },
      { f: n, cx: 540, cy: 790, zoom: 2.7, rot: -1.5, ease: "linear" },
    ],
    punches: () => [{ f: 0, amp: 28 }],
    render: (c) => {
      const m = prog(c.lf, 14, c.len);
      return (
        <div style={{ position: "absolute", inset: 0, transformOrigin: "540px 700px", transform: `scaleY(${1 + m * 0.1}) skewX(${Math.sin(c.lf * 0.4) * m * 0.8}deg)` }}>
          <Kit gf={c.gf} blur={9} bag={false} />
          <Char who="a" gf={c.gf} {...CU} view="front" soot={1} sweat={1} twitch={0.3 + m * 0.7} armR="holdPhone" light="#e8f4ff" look={{ x: 0, y: 0.95 }} />
        </div>
      );
    },
  },
];

export const Scene4: React.FC = () => {
  const gf = useCurrentFrame();
  const t = gf / FPS;
  const shot = SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];
  const a = fr(shot.from);
  const len = Math.max(1, fr(shot.to) - a);
  const ctx: ShotCtx = { gf, lf: gf - a, len };
  const content = shot.noCam ? (
    shot.render(ctx)
  ) : (
    <Camera frame={ctx.lf} keys={shot.keys(len)} handheld={shot.handheld ?? 3} seed={shot.seed ?? 0} punches={shot.punches?.(len) ?? []}>
      {shot.render(ctx)}
    </Camera>
  );
  // низкий ключ: затемнение почти всей сцены, финальное затемнение
  const dark = interpolate(t, [0, 4.5, 14.7], [0.25, 0.45, 0.35], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(t, [END - 2.2, END - 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0605" }}>
      {content}
      {!shot.noCam && <div style={{ position: "absolute", inset: 0, background: `rgba(6,3,2,${dark})`, pointerEvents: "none" }} />}
      <Grain gf={gf} />
      <Vignette gf={gf} strength={0.85} />
      {fadeOut > 0 && <AbsoluteFill style={{ background: `rgba(0,0,0,${fadeOut})` }} />}
    </AbsoluteFill>
  );
};
export const _s = Smoke;
