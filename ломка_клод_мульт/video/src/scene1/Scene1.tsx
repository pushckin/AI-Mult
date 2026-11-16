import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Camera, CamKey, Punch, mouthAt, prog } from "./CameraRig";
import { Artyom, Katya } from "./characters";
import type { Emotion, ArmPose } from "./characters";
import { Kitchen } from "./set";
import { PhoneScreen, UsageLimit } from "./overlays";

export const FPS = 24;
const fr = (s: number) => Math.round(s * FPS);

type Line = { id: string; who: string; text: string; startSec: number; endSec: number; mouth: number[] };
const LINES = Object.fromEntries((timing.lines as Line[]).map((l) => [l.id, l])) as Record<string, Line>;
const CUES = Object.fromEntries((timing.cues as { id: string; sec: number }[]).map((c) => [c.id, c.sec])) as Record<string, number>;

export const SCENE1_FRAMES = fr(timing.durationSec);

const A = LINES.a1, K1 = LINES.k1, A2 = LINES.a2, A3 = LINES.a3, K2 = LINES.k2, A4 = LINES.a4;
const ZAP = CUES.zap, LIMIT = CUES.limitAppears, SEND = CUES.sendTap, WAX = CUES.waxDrop;
const END = timing.durationSec;

/* ---------- таймлайны эмоций (сек) ---------- */
type Seg<T> = [number, T][];
const track = <T,>(segs: Seg<T>, t: number) => {
  let i = 0;
  for (let k = 0; k < segs.length; k++) if (t >= segs[k][0]) i = k;
  return { cur: segs[i][1], prev: i > 0 ? segs[i - 1][1] : undefined, since: Math.round(segs[i][0] * FPS) };
};

const A_EMO: Seg<Emotion> = [
  [0, "smile"],
  [K1.endSec - 2.8, "worried"],
  [A2.startSec, "smile"],
  [A2.startSec + 3.6, "worried"],
  [ZAP + 0.95, "dead"],
  [A4.startSec + 3.4, "panic"],
  [A4.startSec + 4.6, "rage"],
];
const K_EMO: Seg<Emotion> = [
  [0, "smile"],
  [A.startSec + 5.5, "teary"],
  [K1.endSec - 3.0, "neutral"],
  [A2.startSec, "smile"],
  [ZAP + 0.5, "worried"],
  [A4.startSec + 3.4, "panic"],
  [A4.endSec - 1.2, "dead"],
];

const mouthFor = (who: "a" | "k", gf: number) => {
  const t = gf / FPS;
  const ids = who === "a" ? [A, A2, A3, A4] : [K1, K2];
  for (const l of ids) if (t >= l.startSec && t <= l.endSec + 0.1) return mouthAt(l.mouth, t - l.startSec);
  return 0;
};

/* ---------- персонаж в мире ---------- */
type Place = { x: number; y: number; s: number };
const Char: React.FC<
  Place & {
    who: "a" | "k";
    gf: number;
    view: "front" | "side";
    facing?: "left" | "right";
    upperBodyOnly?: boolean;
    look?: { x: number; y: number };
    armL?: ArmPose;
    armR?: ArmPose;
    twitch?: number;
    sweat?: number;
    tear?: number;
    emo?: Emotion;
  }
> = ({ who, gf, x, y, s, emo, ...rest }) => {
  const t = gf / FPS;
  const e = track(who === "a" ? A_EMO : K_EMO, t);
  const C = who === "a" ? Artyom : Katya;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1000, height: 1400, transform: `translate(${x}px,${y}px) scale(${s})`, transformOrigin: "0 0" }}>
      <C
        frame={gf}
        mouth={mouthFor(who, gf)}
        emotion={emo ?? e.cur}
        prevEmotion={emo ? undefined : e.prev}
        emotionSince={e.since}
        {...rest}
      />
    </div>
  );
};

/* крупный план: центр головы → (540, 800) */
const CU_S = 1.5;
const CU: Place = { x: 540 - 500 * CU_S, y: 800 - 390 * CU_S, s: CU_S };
const FACE = { cx: 540, cy: 800 };

/* общий план за столом (профили) */
const WIDE_S = 0.62;
const WIDE_A: Place = { x: 250 - 470 * WIDE_S, y: 1095 - 1170 * WIDE_S, s: WIDE_S };
const WIDE_K: Place = { x: 830 - 530 * WIDE_S, y: 1095 - 1170 * WIDE_S, s: WIDE_S };

/* ---------- фон ---------- */
const Bg: React.FC<{ gf: number; view?: "wide" | "table" | "backWall"; blur?: number; shift?: number }> = ({ gf, view = "backWall", blur = 0, shift = 0 }) => (
  <div style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined }}>
    <Kitchen
      frame={gf}
      view={view}
      parallax={{ x: Math.sin(gf * 0.012) * 0.6 + shift, y: Math.cos(gf * 0.009) * 0.3 }}
      melt={prog(gf, fr(A.startSec), fr(WAX)) * 0.5}
      dropFrame={fr(WAX)}
    />
  </div>
);

/* ---------- шоты ---------- */
type ShotCtx = { gf: number; lf: number; len: number };
type Shot = {
  id: string;
  from: number; // сек
  to: number;
  handheld?: number;
  seed?: number;
  keys: (len: number) => CamKey[];
  punches?: (len: number) => Punch[];
  render: (c: ShotCtx) => React.ReactNode;
  /** без камеры (UI на весь экран) */
  noCam?: boolean;
};


const lookAround = (t: number) => ({ x: Math.sin(t * 1.3) * 0.25, y: Math.max(0, Math.sin(t * 2.3 + 1)) * 0.9 - 0.1 });

const wideRender = (c: ShotCtx, extra?: { a?: Partial<React.ComponentProps<typeof Char>>; k?: Partial<React.ComponentProps<typeof Char>>; tearK?: number }) => (
  <>
    <Bg gf={c.gf} view="wide" />
    <Char who="a" gf={c.gf} {...WIDE_A} view="side" facing="right" upperBodyOnly armR="holdHand" armL="underTable" sweat={prog(c.gf / FPS, K1.endSec - 3, A2.endSec) * 0.7} {...extra?.a} />
    <Char who="k" gf={c.gf} {...WIDE_K} view="side" facing="left" upperBodyOnly armR="holdHand" armL="table" tear={extra?.tearK ?? tearK(c.gf / FPS)} {...extra?.k} />
  </>
);
const tearK = (t: number) => interpolate(t, [A.startSec + 5, A.startSec + 8], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const SHOTS: Shot[] = [
  /* 1. Заставка: свеча → отъезд к окну */
  {
    id: "establish",
    from: 0,
    to: 2.4,
    handheld: 1.5,
    keys: (n) => [
      { f: 0, cx: 540, cy: 1180, zoom: 2.9 },
      { f: n, cx: 540, cy: 960, zoom: 1.12, ease: "out" },
    ],
    render: (c) => <Bg gf={c.gf} view="backWall" />,
  },
  /* 2. Общий план, медленный дольи-ин */
  {
    id: "wide1",
    from: 2.4,
    to: 5.2,
    handheld: 2,
    keys: (n) => [
      { f: 0, cx: 540, cy: 900, zoom: 1.0 },
      { f: n, cx: 540, cy: 840, zoom: 1.32, ease: "linear" },
    ],
    render: (c) => wideRender(c),
  },
  /* 3. Артём крупно — читает с экрана, глаза вниз */
  {
    id: "a_cu1",
    from: 5.2,
    to: 9.0,
    handheld: 4,
    seed: 1,
    keys: (n) => [
      { f: 0, cx: FACE.cx + 20, cy: FACE.cy + 40, zoom: 1.0, rot: 1.2 },
      { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.28, rot: -0.8, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={7} shift={0.5} />
        <Char who="a" gf={c.gf} {...CU} view="front" look={lookAround(c.gf / FPS)} armL="underTable" armR="rest" />
      </>
    ),
  },
  /* 4. Вставка: экран телефона с «стихами» */
  {
    id: "phone_insert",
    from: 9.0,
    to: 10.2,
    noCam: true,
    keys: () => [{ f: 0, cx: 540, cy: 960, zoom: 1 }],
    render: (c) => (
      <Camera
        frame={c.lf}
        handheld={5}
        seed={3}
        keys={[
          { f: 0, cx: 540, cy: 1000, zoom: 1.0, rot: 2.5 },
          { f: c.len, cx: 540, cy: 900, zoom: 1.22, rot: 1.0 },
        ]}
      >
        <PhoneScreen
          frame={c.gf}
          startFrame={-400}
          sendFrame={999999}
          text="Катюш, понимаешь… наши отношения — это не просто быт. Это симфония двух несовершенных душ…"
        />
      </Camera>
    ),
  },
  /* 5. Катя слушает, слеза */
  {
    id: "k_cu1",
    from: 10.2,
    to: K1.startSec,
    handheld: 3,
    seed: 2,
    keys: (n) => [
      { f: 0, cx: FACE.cx - 30, cy: FACE.cy + 30, zoom: 1.05, rot: -1.5 },
      { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.35, rot: 0.5, ease: "linear" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={7} shift={-0.5} />
        <Char who="k" gf={c.gf} {...CU} view="front" tear={tearK(c.gf / FPS)} look={{ x: -0.3, y: 0.1 }} />
      </>
    ),
  },
  /* 6. Катя говорит (про маму) */
  {
    id: "k_cu2",
    from: K1.startSec,
    to: K1.endSec - 3.0,
    handheld: 3,
    seed: 4,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.2, rot: 0.6 },
      { f: n, cx: FACE.cx + 10, cy: FACE.cy + 30, zoom: 1.5, rot: -0.8, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={7} shift={-0.4} />
        <Char who="k" gf={c.gf} {...CU} view="front" tear={0.9} look={{ x: 0.1, y: 0.05 }} />
      </>
    ),
  },
  /* 7. Реакция Артёма: улыбка застывает, пот */
  {
    id: "a_react",
    from: K1.endSec - 3.0,
    to: A2.startSec,
    handheld: 4,
    seed: 5,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy + 20, zoom: 1.0, rot: 0 },
      { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.7, rot: -2.4, ease: "in" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={7} />
        <Char who="a" gf={c.gf} {...CU} view="front" sweat={0.6 + prog(c.lf, 0, c.len) * 0.4} look={{ x: -0.2, y: 0.5 }} armL="underTable" />
      </>
    ),
  },
  /* 8. «Секунду, любимая» — Артём крупно */
  {
    id: "a_cu2",
    from: A2.startSec,
    to: A2.startSec + 3.3,
    handheld: 5,
    seed: 6,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.45, rot: -2.4 },
      { f: n, cx: FACE.cx - 10, cy: FACE.cy, zoom: 1.8, rot: 1.5, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={8} />
        <Char who="a" gf={c.gf} {...CU} view="front" sweat={1} look={lookAround(c.gf / FPS)} />
      </>
    ),
  },
  /* 9. Катя ждёт (улыбка, слезинка) — общий, дольи-аут */
  {
    id: "wide2",
    from: A2.startSec + 3.3,
    to: A2.endSec + 0.15,
    handheld: 2,
    keys: (n) => [
      { f: 0, cx: 560, cy: 840, zoom: 1.5 },
      { f: n, cx: 540, cy: 900, zoom: 1.05, ease: "out" },
    ],
    render: (c) => wideRender(c, { a: { emo: "worried", sweat: 1 }, k: { emo: "smile" }, tearK: 0.9 }),
  },
  /* 10. Шёпот — крупняк Артёма */
  {
    id: "a_whisper",
    from: A2.endSec + 0.15,
    to: A3.startSec + 2.0,
    handheld: 5,
    seed: 7,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy + 40, zoom: 1.2, rot: 3 },
      { f: n, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.6, rot: 5, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={8} />
        <Char who="a" gf={c.gf} {...CU} view="front" emo="panic" sweat={1} look={{ x: 0, y: 0.95 }} />
      </>
    ),
  },
  /* 11. POV телефона: печатает голосом */
  {
    id: "phone_pov",
    from: A3.startSec + 2.0,
    to: ZAP,
    noCam: true,
    keys: () => [{ f: 0, cx: 540, cy: 960, zoom: 1 }],
    render: (c) => (
      <Camera
        frame={c.lf}
        handheld={6}
        seed={8}
        keys={[
          { f: 0, cx: 540, cy: 1100, zoom: 1.0, rot: -3 },
          { f: c.len, cx: 560, cy: 880, zoom: 1.35, rot: 1.5, ease: "inOut" },
        ]}
        punches={[{ f: fr(SEND) - fr(A3.startSec + 2.0), amp: 12 }]}
      >
        <PhoneScreen frame={c.gf} startFrame={fr(SEND) - 140} sendFrame={fr(SEND)} />
      </Camera>
    ),
  },
  /* 12. ZAP: плашка лимита, удар камеры */
  {
    id: "limit",
    from: ZAP,
    to: ZAP + 0.95,
    noCam: true,
    keys: () => [{ f: 0, cx: 540, cy: 960, zoom: 1 }],
    render: (c) => (
      <Camera
        frame={c.lf}
        handheld={10}
        seed={9}
        keys={[
          { f: 0, cx: 540, cy: 960, zoom: 1.5, rot: -6 },
          { f: 8, cx: 540, cy: 960, zoom: 1.0, rot: 0, ease: "snap" },
          { f: c.len, cx: 540, cy: 960, zoom: 1.12, rot: 0.5, ease: "linear" },
        ]}
        punches={[
          { f: 0, amp: 50 },
          { f: 5, amp: 30 },
        ]}
      >
        <PhoneScreen frame={c.gf} startFrame={fr(SEND) - 140} sendFrame={fr(SEND)} />
        <div style={{ position: "absolute", left: 0, top: 480, width: 1080 }}>
          <UsageLimit frame={c.gf} startFrame={fr(LIMIT)} />
        </div>
      </Camera>
    ),
  },
  /* 13. Улыбка сползает: экстремальный крупный план */
  {
    id: "a_dead",
    from: ZAP + 0.95,
    to: K2.startSec,
    handheld: 3,
    seed: 10,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy + 10, zoom: 1.45, rot: 0 },
      { f: n, cx: FACE.cx - 5, cy: FACE.cy - 10, zoom: 2.2, rot: -0.8, ease: "linear" },
    ],
    render: (c) => {
      const t = c.gf / FPS;
      return (
        <>
          <Bg gf={c.gf} view="backWall" blur={9} />
          <Char
            who="a"
            gf={c.gf}
            {...CU}
            view="front"
            emo={t < ZAP + 1.25 ? "smile" : "dead"}
            sweat={0.8}
            twitch={prog(c.lf, 6, c.len) * 1}
            look={{ x: 0, y: 0.2 }}
          />
        </>
      );
    },
  },
  /* 14. Катя: «Тём? Ты чего завис?» */
  {
    id: "k2",
    from: K2.startSec,
    to: A4.startSec,
    handheld: 4,
    seed: 11,
    keys: (n) => [
      { f: 0, cx: FACE.cx + 20, cy: FACE.cy + 20, zoom: 1.15, rot: 2 },
      { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.55, rot: -1.5, ease: "inOut" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={8} shift={-0.4} />
        <Char who="k" gf={c.gf} {...CU} view="front" tear={0.85} look={{ x: 0.1, y: 0 }} />
      </>
    ),
  },
  /* 15. Срыв (1): Артём — сглатывает, хрип */
  {
    id: "a4_1",
    from: A4.startSec,
    to: A4.startSec + (A4.endSec - A4.startSec) * 0.4,
    handheld: 5,
    seed: 12,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.2, rot: 0 },
      { f: n, cx: FACE.cx, cy: FACE.cy + 20, zoom: 1.9, rot: -2.5, ease: "in" },
    ],
    punches: () => peaks(A4, 0, 0.4),
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={8} />
        <Char who="a" gf={c.gf} {...CU} view="front" sweat={1} twitch={Math.max(0, 0.8 - prog(c.lf, 40, 80))} look={{ x: 0, y: 0.1 }} />
      </>
    ),
  },
  /* 16. Реакция Кати (шок) */
  {
    id: "k_shock",
    from: A4.startSec + (A4.endSec - A4.startSec) * 0.4,
    to: A4.startSec + (A4.endSec - A4.startSec) * 0.5,
    handheld: 6,
    seed: 13,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.2, rot: 3 },
      { f: n, cx: FACE.cx, cy: FACE.cy, zoom: 1.55, rot: 0, ease: "snap" },
    ],
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={8} shift={-0.4} />
        <Char who="k" gf={c.gf} {...CU} view="front" emo="panic" tear={1} look={{ x: 0.2, y: 0 }} />
      </>
    ),
  },
  /* 17. Срыв (2): рёв, удары зума на каждый мат */
  {
    id: "a4_2",
    from: A4.startSec + (A4.endSec - A4.startSec) * 0.5,
    to: A4.endSec,
    handheld: 8,
    seed: 14,
    keys: (n) => [
      { f: 0, cx: FACE.cx, cy: FACE.cy, zoom: 1.5, rot: 4 },
      { f: n, cx: FACE.cx, cy: FACE.cy - 10, zoom: 2.3, rot: -4, ease: "linear" },
    ],
    punches: () => peaks(A4, 0.5, 1),
    render: (c) => (
      <>
        <Bg gf={c.gf} view="backWall" blur={9} />
        <Char who="a" gf={c.gf} {...CU} view="front" sweat={1} twitch={0.4} look={{ x: 0.2, y: 0 }} />
      </>
    ),
  },
  /* 18. Тишина: общий, отъезд — оба застыли */
  {
    id: "wide_silence",
    from: A4.endSec,
    to: WAX - 0.25,
    handheld: 1,
    keys: (n) => [
      { f: 0, cx: 540, cy: 860, zoom: 1.22 },
      { f: n, cx: 540, cy: 940, zoom: 1.0, ease: "inOut" },
    ],
    render: (c) => wideRender(c, { a: { emo: "rage", sweat: 1, twitch: 0.6 }, k: { emo: "dead" }, tearK: 1 }),
  },
  /* 19. Капля воска падает со свечи */
  {
    id: "wax",
    from: WAX - 0.25,
    to: END,
    handheld: 0.5,
    keys: (n) => [
      { f: 0, cx: 548, cy: 930, zoom: 2.6 },
      { f: n, cx: 548, cy: 960, zoom: 3.0, ease: "linear" },
    ],
    render: (c) => <Bg gf={c.gf} view="wide" />,
  },
];

/** пики громкости реплики (мат и крики) → удары камеры */
function peaks(l: Line, a: number, b: number): Punch[] {
  const out: Punch[] = [];
  const n = l.mouth.length;
  const i0 = Math.floor(n * a), i1 = Math.floor(n * b);
  const baseGf = fr(l.startSec + (l.endSec - l.startSec) * a);
  let last = -99;
  for (let i = Math.max(1, i0); i < i1; i++) {
    if (l.mouth[i] > 0.55 && l.mouth[i] - l.mouth[i - 2 < 0 ? 0 : i - 2] > 0.28 && i - last > 5) {
      out.push({ f: i - i0 + (fr(l.startSec) - baseGf) * 0, amp: 14 + l.mouth[i] * 26, dir: out.length % 2 ? 1 : -1 });
      last = i;
    }
  }
  return out;
}

/* ---------- общие слои: зерно, виньетка, вспышка ---------- */
const Grain: React.FC<{ gf: number }> = ({ gf }) => {
  const seed = Math.floor(gf / 2) % 7;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.22, pointerEvents: "none" }}>
      <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0.9 0" />
      </filter>
      <rect width={1080} height={1920} filter="url(#paperGrain)" />
    </svg>
  );
};

const Vignette: React.FC<{ gf: number }> = ({ gf }) => {
  const flick = 0.92 + Math.sin(gf * 0.9) * 0.02 + Math.sin(gf * 2.3) * 0.015;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 40%, rgba(10,4,2,${0.62 * flick}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

export const Scene1: React.FC = () => {
  const gf = useCurrentFrame();
  const t = gf / FPS;
  const shot = SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];
  const a = fr(shot.from);
  const len = Math.max(1, fr(shot.to) - a);
  const lf = gf - a;
  const ctx: ShotCtx = { gf, lf, len };

  // вспышка на ZAP: белая 2 кадра → красная затухающая
  const zf = gf - fr(ZAP);
  const flashWhite = zf >= 0 && zf < 2 ? 1 : 0;
  const flashRed = zf >= 2 && zf < 14 ? interpolate(zf, [2, 14], [0.55, 0]) : 0;

  const content = shot.noCam ? (
    shot.render(ctx)
  ) : (
    <Camera frame={lf} keys={shot.keys(len)} handheld={shot.handheld ?? 3} seed={shot.seed ?? 0} punches={shot.punches?.(len) ?? []}>
      {shot.render(ctx)}
    </Camera>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#120c0a" }}>
      {content}
      <Grain gf={gf} />
      <Vignette gf={gf} />
      {flashRed > 0 && <AbsoluteFill style={{ background: `rgba(225,29,42,${flashRed})`, mixBlendMode: "screen" }} />}
      {flashWhite > 0 && <AbsoluteFill style={{ background: "#fff" }} />}
    </AbsoluteFill>
  );
};

export const _unused = Easing;
