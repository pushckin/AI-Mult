import React from "react";
import { spring } from "remotion";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export type Emotion =
  | "neutral"
  | "smile"
  | "teary"
  | "worried"
  | "panic"
  | "rage"
  | "dead"
  | "furious"
  | "gasp";
export type ArmPose =
  | "rest"
  | "table"
  | "holdHand"
  | "underTable"
  | "typing"
  | "pointing"
  | "handsOnHead"
  | "slap"
  | "holdPhone"
  | "throw"
  | "grab"
  | "drinkBottle";

export type CharacterProps = {
  frame: number;
  view: "front" | "side";
  facing?: "left" | "right";
  mouth: number;
  emotion: Emotion;
  look?: { x: number; y: number };
  blink?: boolean;
  armL?: ArmPose;
  armR?: ArmPose;
  twitch?: number;
  sweat?: number;
  tear?: number;
  upperBodyOnly?: boolean;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  /* --- необязательные расширения (для мягкого overshoot при смене) --- */
  /** предыдущая эмоция; смешивается с текущей пружиной, начиная с emotionSince */
  prevEmotion?: Emotion;
  /** кадр (тот же, что и frame), когда сменилась эмоция */
  emotionSince?: number;
  prevArmL?: ArmPose;
  prevArmR?: ArmPose;
  /** кадр, когда сменилась поза рук */
  poseSince?: number;
  /* --- расширения сцен 2–5 (все необязательны; по умолчанию как раньше) --- */
  /** Катя: "robe" = махровый халат + полотенце-тюрбан */
  outfit?: "dress" | "robe";
  /** 0..1 размазанная тушь по щекам */
  mascara?: number;
  /** 0..1 рыдания (трясутся плечи/голова, рот-скобка, много слёз) */
  cry?: number;
  /** 0..1 копоть на лице и одежде */
  soot?: number;
  /** 0..1 дым-кашель (слезятся глаза, приступы кашля, дымок) */
  smoke?: number;
  /** цвет света экрана телефона (поза holdPhone) */
  light?: string;
  /** скорость «картонной» ходьбы (0 = стоит) */
  walk?: number;
  /** −1..1 наклон корпуса назад/вперёд */
  lean?: number;
  /** 0..1 присел */
  crouch?: number;
};

export const C = {
  bg: "#1b1210",
  wall: "#8a5a3c",
  wallDark: "#5e3a27",
  floor: "#3b2a22",
  table: "#a9713f",
  tableDark: "#7a4c27",
  candleFlame: "#ffb43a",
  wax: "#f4ead2",
  skin: "#f1c9a0",
  skinShade: "#d9a97c",
  artyomHoodie: "#6b7280",
  artyomHair: "#2b1d16",
  katyaHair: "#a8431f",
  katyaDress: "#7a1f3d",
  ink: "#120c0a",
  white: "#ffffff",
  danger: "#e11d2a",
  uiBlue: "#3b82f6",
  // локальные дополнения
  inkSoft: "rgba(18,12,10,0.55)",
  teeth: "#fffbea",
  tongue: "#e0566b",
  mouthIn: "#3a0f14",
  sweat: "#a9defa",
  tear: "#c4ecff",
  gold: "#e8b84a",
};

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Детерминированное моргание: 0 открыт .. 1 закрыт. */
export function blinkAmount(frame: number, seed: number): number {
  const period = 96;
  const k = Math.floor(frame / period);
  let amt = 0;
  for (let j = k - 1; j <= k; j++) {
    const at = j * period + 14 + hash(j + seed) * 62;
    const d = frame - at;
    const shape = [0.55, 1, 1, 0.7, 0.25];
    if (d >= 0 && d < 5) amt = Math.max(amt, shape[Math.floor(d)]);
    // иногда двойное моргание
    if (hash(j * 3.3 + seed) > 0.7) {
      const d2 = frame - (at + 9);
      if (d2 >= 0 && d2 < 5) amt = Math.max(amt, shape[Math.floor(d2)]);
    }
  }
  return amt;
}

/* ------------------------------------------------------------------ */
/* Emotions                                                            */
/* ------------------------------------------------------------------ */
export type EV = {
  bi: number; // inner brow dy (px, + вниз)
  bo: number; // outer brow dy
  bl: number; // brow lift (все)
  arch: number; // выгиб брови
  lid: number; // 0..1 верхнее веко
  lidA: number; // угол века (+ злой, - печальный), градусы
  low: number; // нижнее веко (прищур) 0..1
  pup: number; // масштаб зрачка
  es: number; // масштаб белка
  mw: number; // полуширина рта
  mc: number; // изгиб (-1..1)
  mo: number; // базовое открытие рта
  grit: number; // стиснутые зубы
  skew: number;
  blush: number;
  shake: number;
  flush: number; // красное лицо
  pallor: number; // бледность
  dead: number;
  shine: number; // влажный блеск глаз
  tilt: number; // наклон головы (град)
  mouthDy: number;
  nostril: number; // раздутые ноздри
};

const NEUTRAL: EV = {
  bi: -2, bo: 0, bl: 0, arch: 0.35, lid: 0.08, lidA: 0, low: 0, pup: 1, es: 1,
  mw: 56, mc: -0.05, mo: 0, grit: 0, skew: 0, blush: 0, shake: 0, flush: 0,
  pallor: 0, dead: 0, shine: 0, tilt: 0, mouthDy: 0, nostril: 0,
};

export const EMOTIONS: Record<Emotion, EV> = {
  neutral: NEUTRAL,
  smile: {
    ...NEUTRAL, bi: 0, bo: -6, bl: -10, arch: 0.8, lid: 0, low: 0.5, pup: 1.1,
    mw: 82, mc: 1, mo: 0.28, blush: 0.7, tilt: -3,
  },
  teary: {
    ...NEUTRAL, bi: -26, bo: 8, bl: -4, arch: 0.4, lid: 0.12, lidA: -12, low: 0.3,
    pup: 1.4, es: 1.06, mw: 66, mc: 0.55, mo: 0.08, blush: 0.9, shine: 1, tilt: 4, skew: 0.2,
  },
  worried: {
    ...NEUTRAL, bi: -34, bo: 10, bl: -6, arch: 0.3, lid: 0.18, lidA: -16, pup: 0.85,
    mw: 54, mc: -0.8, mo: 0.06, tilt: 3, pallor: 0.1, mouthDy: 4,
  },
  panic: {
    ...NEUTRAL, bi: -26, bo: -34, bl: -30, arch: 0.9, lid: 0, pup: 0.5, es: 1.22,
    mw: 70, mc: -0.5, mo: 0.78, shake: 1, pallor: 0.28, tilt: 0,
  },
  rage: {
    ...NEUTRAL, bi: 36, bo: -14, bl: 8, arch: -0.1, lid: 0.34, lidA: 24, pup: 0.7, es: 1.04,
    mw: 98, mc: -0.5, mo: 0, grit: 1, shake: 0.6, flush: 0.45, tilt: -2, mouthDy: 6,
  },
  dead: {
    ...NEUTRAL, bi: -8, bo: 6, bl: 4, arch: 0, lid: 0.42, lidA: 0, pup: 0.35, es: 1,
    mw: 44, mc: -0.15, mo: 0, pallor: 0.7, dead: 1, tilt: 0, mouthDy: 8,
  },
  furious: {
    ...NEUTRAL, bi: 40, bo: -10, bl: 10, arch: -0.2, lid: 0.3, lidA: 26, low: 0.5, pup: 0.55, es: 1,
    mw: 92, mc: -0.75, mo: 0.06, grit: 0.7, shake: 0.8, flush: 1, tilt: -2, mouthDy: 6, nostril: 1,
  },
  gasp: {
    ...NEUTRAL, bi: -22, bo: -30, bl: -34, arch: 0.9, lid: 0, pup: 0.5, es: 1.25,
    mw: 40, mc: 0, mo: 0.9, pallor: 0.2, tilt: 0, mouthDy: 6,
  },
};

/** «рыдание» — подмешивается по prop cry */
const CRY_EV: EV = {
  ...NEUTRAL, bi: -34, bo: 12, bl: -4, arch: 0.3, lid: 0.28, lidA: -16, low: 0.55, pup: 1.3, es: 1.04,
  mw: 84, mc: -0.95, mo: 0.5, blush: 1, shine: 1, shake: 0.8, tilt: 3, mouthDy: 4,
};

export function blendEV(a: EV, b: EV, t: number): EV {
  const out = { ...a };
  (Object.keys(a) as (keyof EV)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], t);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Arm poses                                                           */
/* ------------------------------------------------------------------ */
export type ArmGeom = {
  sx: number; sy: number; ex: number; ey: number; hx: number; hy: number;
  point: number; front: number;
  item?: "phone" | "bottle"; claw?: number; hs?: number;
};

/** side: -1 левая (слева на экране в front), +1 правая. */
/** положение бутылки у рта: горлышко (mx,my), поворот r, рука hx,hy */
export function bottleXf(view: "front" | "side", s: number) {
  const mx = view === "front" ? 500 + s * 8 : 604, my = view === "front" ? 560 : 556;
  const r = view === "front" ? 180 + s * 35 : 180 + 32;
  const a = (r * Math.PI) / 180;
  return { mx, my, r, hx: mx - 150 * Math.sin(a), hy: my + 150 * Math.cos(a) };
}

export function armGeom(
  pose: ArmPose,
  s: number,
  view: "front" | "side",
  frame: number,
): ArmGeom {
  const jit = (a: number, b: number) => Math.sin(frame * a + s * 2) * b;
  if (view === "front") {
    const sx = 500 + s * 215, sy = 745;
    const g = (ex: number, ey: number, hx: number, hy: number, point = 0, front = 0): ArmGeom => ({
      sx, sy, ex: 500 + s * ex, ey, hx: 500 + s * hx, hy, point, front,
    });
    switch (pose) {
      case "rest": return g(275, 930, 268, 1110);
      case "table": return g(300, 930, 175, 1085);
      case "holdHand": return g(265, 950, 70, 1045);
      case "underTable": return g(285, 985, 100, 1240);
      case "typing": {
        const a = g(290, 975, 62, 1195);
        a.hx += jit(1.9, 10); a.hy += jit(3.1, 9);
        return a;
      }
      case "pointing": return g(330, 800, 470, 690, 1, 1);
      case "handsOnHead": return g(405, 520, 215, 190, 0, 1);
      case "slap": {
        const ph = (frame % 14) / 14;
        const lift = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI * 0.5) * 150 : 150 * Math.max(0, 1 - (ph - 0.55) / 0.12);
        const a = g(310, 900 - lift * 0.5, 195, 1075 - lift);
        return a;
      }
      case "holdPhone": {
        const a = g(330, 880, 175, 640, 0, 1);
        a.item = "phone"; a.hx += jit(1.7, 3); a.hy += jit(2.3, 3);
        return a;
      }
      case "throw": {
        const a = g(385, 660, 335, 330, 0, 1);
        a.hx += jit(2.1, 6); a.hy += jit(2.9, 6);
        return a;
      }
      case "grab": {
        const a = g(335, 900, 285, 700, 0, 1);
        a.claw = 1; a.hs = 1.45; a.hx += jit(2.4, 8); a.hy += jit(3.3, 8);
        return a;
      }
      case "drinkBottle": {
        const b = bottleXf("front", s);
        return { sx, sy, ex: 500 + s * 285, ey: 640, hx: b.hx, hy: b.hy - 30, point: 0, front: 1, item: "bottle" };
      }
    }
  }
  // side: направление "вперёд" = +x (лицом вправо). L = дальняя, R = ближняя.
  const sx = 470 + (s > 0 ? 24 : -26), sy = 745;
  const o = s > 0 ? 0 : -18; // дальняя рука чуть сдвинута
  const g = (ex: number, ey: number, hx: number, hy: number, point = 0, front = 0): ArmGeom => ({
    sx, sy, ex: ex + o, ey, hx: hx + o, hy, point, front,
  });
  switch (pose) {
    case "rest": return g(440, 935, 430, 1110);
    case "table": return g(485, 925, 650, 1065);
    case "holdHand": return g(530, 925, 775, 1030);
    case "underTable": return g(505, 985, 610, 1245);
    case "typing": {
      const a = g(505, 990, 615, 1205);
      a.hx += jit(1.9, 10); a.hy += jit(3.1, 9);
      return a;
    }
    case "pointing": return g(620, 800, 850, 710, 1, 1);
    case "handsOnHead": return g(570, 565, 440, 195, 0, 1);
    case "slap": {
      const ph = (frame % 14) / 14;
      const lift = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI * 0.5) * 150 : 150 * Math.max(0, 1 - (ph - 0.55) / 0.12);
      return g(530, 900 - lift * 0.5, 690, 1078 - lift);
    }
    case "holdPhone": {
      const a = g(590, 840, 745, 640, 0, 1);
      a.item = "phone"; a.hx += jit(1.7, 3); a.hy += jit(2.3, 3);
      return a;
    }
    case "throw": {
      const a = g(350, 680, 190, 400, 0, 1);
      a.hx += jit(2.1, 6); a.hy += jit(2.9, 6);
      return a;
    }
    case "grab": {
      const a = g(650, 800, 900, 790, 0, 1);
      a.claw = 1; a.hs = 1.25; a.hx += jit(2.4, 8); a.hy += jit(3.3, 8);
      return a;
    }
    case "drinkBottle": {
      const b = bottleXf("side", s);
      return { sx, sy, ex: 575 + o, ey: 700, hx: b.hx + o, hy: b.hy - 30, point: 0, front: 1, item: "bottle" };
    }
  }
  return g(440, 935, 430, 1110);
}

function lerpArm(a: ArmGeom, b: ArmGeom, t: number): ArmGeom {
  return {
    sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t),
    ex: lerp(a.ex, b.ex, t), ey: lerp(a.ey, b.ey, t),
    hx: lerp(a.hx, b.hx, t), hy: lerp(a.hy, b.hy, t),
    point: lerp(a.point, b.point, clamp(t, 0, 1)),
    front: b.front > 0.5 || (a.front > 0.5 && t < 0.4) ? 1 : 0,
    item: t > 0.5 ? b.item : a.item,
    claw: lerp(a.claw ?? 0, b.claw ?? 0, t),
    hs: lerp(a.hs ?? 1, b.hs ?? 1, t),
  };
}

/* ------------------------------------------------------------------ */
/* Rig (resolved parameters)                                           */
/* ------------------------------------------------------------------ */
export type CharacterCfg = {
  seed: number;
  skin: string;
  skinShade: string;
  sleeve: string;
  sleeveDark: string;
  browColor: string;
  browThick: number;
  lashes: boolean;
  lipColor: string;
  lipWidth: number;
  eyeR: number;
  pupilR: number;
  headR: number;
  tweaks?: Partial<Record<Emotion, Partial<EV>>>;
  /** слои, зависящие от персонажа */
  hairBack: (r: Rig, view: "front" | "side") => React.ReactNode;
  hairFront: (r: Rig, view: "front" | "side") => React.ReactNode;
  body: (r: Rig, view: "front" | "side") => React.ReactNode;
  faceDecor?: (r: Rig, view: "front" | "side") => React.ReactNode;
  earDecor?: (r: Rig, view: "front" | "side") => React.ReactNode;
  headBehind?: (r: Rig, view: "front" | "side") => React.ReactNode;
};

export type Rig = {
  p: CharacterProps;
  f: number;
  cfg: CharacterCfg;
  ev: EV;
  mouthOpen: number;
  blink: number;
  look: { x: number; y: number };
  breath: number;
  armL: ArmGeom;
  armR: ArmGeom;
  twitchPulse: number;
  tw: number;
  id: string;
  /** 0..1 импульс приступа кашля */
  cough: number;
};

function evFor(cfg: CharacterCfg, e: Emotion): EV {
  const t = cfg.tweaks && cfg.tweaks[e];
  return t ? { ...EMOTIONS[e], ...t } : EMOTIONS[e];
}

export function computeRig(p: CharacterProps, cfg: CharacterCfg, id: string): Rig {
  const f = p.frame;
  let ev = evFor(cfg, p.emotion);
  if (p.prevEmotion && p.emotionSince !== undefined && p.prevEmotion !== p.emotion) {
    const t = spring({ frame: f - p.emotionSince, fps: 24, config: { damping: 9, mass: 0.6, stiffness: 190 } });
    ev = blendEV(evFor(cfg, p.prevEmotion), ev, t);
  }
  const cryA = clamp(p.cry ?? 0, 0, 1);
  const smokeA = clamp(p.smoke ?? 0, 0, 1);
  if (cryA > 0.001) ev = blendEV(ev, CRY_EV, cryA);
  if (smokeA > 0.001) ev = { ...ev, shine: Math.max(ev.shine, smokeA), low: clamp(ev.low + 0.35 * smokeA, 0, 0.9) };
  const cph = (f % 34) / 34;
  const cough = smokeA > 0.001 ? smokeA * (cph < 0.32 ? Math.sin((cph / 0.32) * Math.PI) : 0) : 0;
  const m = clamp(p.mouth, 0, 1);
  const mouthOpen = clamp(
    ev.mo + m * (1 - ev.grit * 0.75) * (1 - ev.mo * 0.35) + cough * 0.5 + cryA * 0.14 * Math.sin(f * 1.7),
    0, 1,
  );
  const blinkAuto = blinkAmount(f, cfg.seed);
  const dead = ev.dead;
  const blink = p.blink ? 1 : blinkAuto * (1 - dead * 0.5);
  const breath = Math.sin((f / 72) * Math.PI * 2 + cfg.seed);
  const poseT =
    p.poseSince !== undefined
      ? spring({ frame: f - p.poseSince, fps: 24, config: { damping: 10, mass: 0.7, stiffness: 160 } })
      : 1;
  const mk = (cur: ArmPose, prev: ArmPose | undefined, s: number): ArmGeom => {
    const g = armGeom(cur, s, p.view, f);
    if (prev && prev !== cur && p.poseSince !== undefined) {
      return lerpArm(armGeom(prev, s, p.view, f), g, poseT);
    }
    return g;
  };
  const tw = clamp(p.twitch ?? 0, 0, 1);
  const raw = Math.sin(f * 2.3) * Math.sin(f * 0.93 + 1.2) + Math.sin(f * 5.1) * 0.25;
  const twitchPulse = tw * clamp(raw * 2 - 0.15, 0, 1);
  return {
    p, f, cfg, ev, mouthOpen, blink,
    look: p.look ?? { x: 0, y: 0 },
    breath,
    armL: mk(p.armL ?? "rest", p.prevArmL, -1),
    armR: mk(p.armR ?? "rest", p.prevArmR, 1),
    twitchPulse, tw, id, cough,
  };
}

/* ------------------------------------------------------------------ */
/* Face primitives                                                     */
/* ------------------------------------------------------------------ */
const EDGE = { stroke: C.inkSoft, strokeWidth: 3, strokeLinejoin: "round" as const };

export const Eye: React.FC<{
  cx: number; cy: number; R: number; side: number; rig: Rig; far?: boolean; twitchEye?: boolean;
  uid: string;
}> = ({ cx, cy, R: R0, side, rig, far, twitchEye, uid }) => {
  const { ev, cfg, look } = rig;
  const R = R0 * ev.es;
  const tp = twitchEye ? rig.twitchPulse : 0;
  const lidBase = clamp(ev.lid + (twitchEye ? rig.tw * 0.1 : 0) + tp * 0.38, 0, 0.95);
  const L = clamp(lidBase + rig.blink * (1 - lidBase), 0, 1);
  const lidY = -R + 2 * R * L + (L > 0.99 ? 2 : 0);
  const lidRot = (-side * ev.lidA) * (1 - rig.blink * 0.7) + (twitchEye ? tp * 6 * side : 0);
  const pr = R * cfg.pupilR * ev.pup * (ev.dead > 0.5 ? 0.5 : 1);
  const lim = Math.max(0, R - pr - 7);
  const px = clamp(look.x, -1, 1) * lim * 0.8 + (twitchEye ? Math.sin(rig.f * 7) * tp * 3 : 0);
  const py = clamp(look.y, -1, 1) * lim * 0.8;
  const clipId = `${uid}clip`;
  const lowLid = clamp(ev.low + (twitchEye ? tp * 0.2 : 0), 0, 0.9);
  const ox = twitchEye ? Math.sin(rig.f * 9) * tp * 2.5 : 0;
  return (
    <g transform={`translate(${cx + ox} ${cy + (twitchEye ? tp * 3 : 0)})`}>
      <clipPath id={clipId}>
        <circle r={R} />
      </clipPath>
      <circle r={R} fill={C.white} {...EDGE} strokeWidth={4} />
      <g clipPath={`url(#${clipId})`}>
        {/* вода */}
        {ev.shine > 0.02 && (
          <ellipse cx={0} cy={R * 0.82} rx={R * 0.95} ry={R * 0.34 * ev.shine} fill={C.tear} opacity={0.85} />
        )}
        {/* зрачок */}
        <circle cx={px} cy={py} r={pr} fill={C.ink} />
        {ev.dead < 0.5 && (
          <>
            <circle cx={px - pr * 0.32} cy={py - pr * 0.36} r={Math.max(2.5, pr * (0.3 + ev.shine * 0.15))} fill={C.white} />
            {ev.shine > 0.3 && (
              <circle cx={px + pr * 0.4} cy={py + pr * 0.42} r={pr * 0.16} fill={C.white} opacity={0.9} />
            )}
          </>
        )}
        {/* нижнее веко */}
        {lowLid > 0.01 && (
          <ellipse
            cx={0}
            cy={R - 1.15 * R * lowLid + 1.25 * R}
            rx={R * 1.25}
            ry={R * 1.25}
            fill={cfg.skin}
            stroke={C.inkSoft}
            strokeWidth={3}
          />
        )}
        {/* верхнее веко */}
        <g transform={`rotate(${lidRot} 0 ${lidY})`}>
          <rect x={-R * 1.8} y={-R * 3} width={R * 3.6} height={lidY + R * 3} fill={cfg.skin} />
          <line x1={-R * 1.8} y1={lidY} x2={R * 1.8} y2={lidY} stroke={C.ink} strokeWidth={5} />
        </g>
      </g>
      {cfg.lashes && (
        <g transform={`rotate(${lidRot} 0 ${lidY})`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" fill="none">
          <path d={`M ${side * R * 0.78} ${lidY - 1} l ${side * R * 0.38} ${-R * 0.14}`} />
          <path d={`M ${side * R * 0.62} ${lidY - 3} l ${side * R * 0.3} ${-R * 0.3}`} />
          <path d={`M ${side * R * 0.9} ${lidY + 3} l ${side * R * 0.3} ${R * 0.0}`} />
        </g>
      )}
      <circle r={R} fill="none" stroke={C.ink} strokeWidth={4.5} opacity={0.9} />
      {far && <circle r={R} fill="none" stroke={C.skinShade} strokeWidth={0} />}
    </g>
  );
};

export const Brow: React.FC<{
  xi: number; xo: number; y: number; rig: Rig; side: number; twitch?: boolean;
}> = ({ xi, xo, y, rig, side, twitch }) => {
  const { ev, cfg } = rig;
  const tp = twitch ? rig.twitchPulse : 0;
  const bi = ev.bi + ev.bl + tp * 7;
  const bo = ev.bo + ev.bl + tp * 3;
  const mid = (bi + bo) / 2 - ev.arch * 24;
  const x0 = xi, x1 = xo;
  const d = `M ${x0} ${y + bi} Q ${(x0 + x1) / 2} ${y + 2 * mid - (bi + bo) / 2} ${x1} ${y + bo}`;
  void side;
  return (
    <g>
      <path d={d} fill="none" stroke={C.inkSoft} strokeWidth={cfg.browThick + 5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={cfg.browColor} strokeWidth={cfg.browThick} strokeLinecap="round" />
    </g>
  );
};

export const Mouth: React.FC<{ cx: number; cy: number; wScale?: number; rig: Rig; uid: string }> = ({
  cx, cy, wScale = 1, rig, uid,
}) => {
  const { ev, cfg } = rig;
  const w = ev.mw * wScale * (1 + rig.mouthOpen * 0.0);
  const kc = -ev.mc * 32;
  const kL = kc - ev.skew * 14, kR = kc + ev.skew * 14;
  const ym = ev.mc * 16 - rig.mouthOpen * 6;
  const o = rig.mouthOpen;
  const thick = 6 + o * 70 * (1 - ev.dead * 0.8);
  const avg = (kL + kR) / 2;
  const open = 1 - ev.grit;
  const upper = `M ${-w} ${kL} Q 0 ${2 * ym - avg} ${w} ${kR}`;
  const lower = `C ${w * 0.92} ${kR + thick * 1.38} ${-w * 0.92} ${kL + thick * 1.38} ${-w} ${kL} Z`;
  const shape = `${upper} ${lower}`;
  const clipId = `${uid}mclip`;
  const teethH = clamp(thick * 0.42, 0, 34);
  const gh = 26 + rig.p.mouth * 22; // стиснутые зубы
  const gw = w * 1.02;
  return (
    <g transform={`translate(${cx} ${cy + ev.mouthDy})`}>
      <g opacity={open}>
        <clipPath id={clipId}>
          <path d={shape} />
        </clipPath>
        <path d={shape} fill={C.mouthIn} />
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={-w * 1.1}
            y={ym - 40}
            width={w * 2.2}
            height={40 + teethH}
            fill={C.teeth}
            opacity={clamp((o - 0.18) * 4, 0, 1)}
          />
          <ellipse
            cx={0}
            cy={ym + thick * 1.0}
            rx={w * 0.55}
            ry={Math.max(1, thick * 0.38)}
            fill={C.tongue}
            opacity={clamp((o - 0.35) * 3, 0, 1)}
          />
        </g>
        <path d={shape} fill="none" stroke={cfg.lipColor} strokeWidth={cfg.lipWidth} strokeLinejoin="round" />
        {/* уголки-ямочки для улыбки */}
        {ev.mc > 0.3 && (
          <g stroke={C.inkSoft} strokeWidth={4} fill="none" strokeLinecap="round" opacity={clamp(ev.mc, 0, 1)}>
            <path d={`M ${-w - 6} ${kL - 14} q -10 12 2 26`} />
            <path d={`M ${w + 6} ${kR - 14} q 10 12 -2 26`} />
          </g>
        )}
      </g>
      {ev.grit > 0.02 && (
        <g opacity={ev.grit}>
          <rect x={-gw} y={-gh / 2} width={gw * 2} height={gh} rx={gh * 0.4} fill={C.teeth} stroke={C.ink} strokeWidth={6} />
          <line x1={-gw} y1={0} x2={gw} y2={0} stroke={C.ink} strokeWidth={4} />
          {[-0.66, -0.33, 0, 0.33, 0.66].map((u) => (
            <line key={u} x1={gw * u} y1={-gh / 2} x2={gw * u} y2={gh / 2} stroke={C.ink} strokeWidth={3} />
          ))}
        </g>
      )}
    </g>
  );
};

/* капли пота */
export const Sweat: React.FC<{ rig: Rig; pts: Array<[number, number]> }> = ({ rig, pts }) => {
  const sw = clamp(rig.p.sweat ?? 0, 0, 1);
  if (sw < 0.02) return null;
  return (
    <g>
      {pts.map(([x, y], i) => {
        const t = ((rig.f * 1.6 + i * 31) % 60) / 60;
        const dy = t * 70;
        const sc = (0.75 + 0.5 * hash(i + 4)) * (1 - t * 0.25);
        const op = clamp(sw * 1.4 - i * 0.2, 0, 1) * (t < 0.1 ? t * 10 : t > 0.85 ? (1 - t) * 6.6 : 1);
        return (
          <g key={i} transform={`translate(${x} ${y + dy}) scale(${sc})`} opacity={op}>
            <path d="M0 -34 C 18 -6 24 8 0 20 C -24 8 -18 -6 0 -34 Z" fill={C.sweat} stroke={C.inkSoft} strokeWidth={3} />
            <ellipse cx={-6} cy={4} rx={4} ry={7} fill={C.white} opacity={0.8} />
          </g>
        );
      })}
    </g>
  );
};

/* слеза */
export const TearDrop: React.FC<{ rig: Rig; x: number; y: number; phase?: number; len?: number }> = ({
  rig, x, y, phase = 0, len = 150,
}) => {
  const tr = clamp(Math.max(rig.p.tear ?? 0, rig.p.cry ?? 0, (rig.p.smoke ?? 0) * 0.35), 0, 1);
  if (tr < 0.02) return null;
  const t = ((rig.f * (1.1 + (rig.p.cry ?? 0) * 0.8) + phase) % 54) / 54;
  const ease = t * t * (3 - 2 * t);
  const dy = ease * len;
  const op = clamp(tr * 1.3, 0, 1) * (t < 0.08 ? t / 0.08 : t > 0.9 ? (1 - t) / 0.1 : 1);
  const sc = 0.8 + tr * 0.5;
  return (
    <g opacity={op}>
      <path d={`M ${x} ${y} L ${x} ${y + dy}`} stroke={C.tear} strokeWidth={9} strokeLinecap="round" opacity={0.7} />
      <g transform={`translate(${x} ${y + dy}) scale(${sc})`}>
        <path d="M0 -30 C 20 -4 26 10 0 24 C -26 10 -20 -4 0 -30 Z" fill={C.tear} stroke={C.inkSoft} strokeWidth={3} />
        <ellipse cx={-7} cy={5} rx={4} ry={8} fill={C.white} />
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Arms                                                                */
/* ------------------------------------------------------------------ */
const PhoneItem: React.FC<{ x: number; y: number; rot: number; light: string; view: "front" | "side" }> = ({ x, y, rot, light, view }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <circle r={210} fill={light} opacity={0.14} />
    <circle r={130} fill={light} opacity={0.14} />
    {view === "front" ? (
      <>
        <rect x={-72} y={-128} width={144} height={256} rx={24} fill="#1c1c22" stroke={C.inkSoft} strokeWidth={4} />
        <rect x={-60} y={-114} width={120} height={228} rx={14} fill={light} />
        <rect x={-60} y={-114} width={120} height={228} rx={14} fill="#fff" opacity={0.25} />
        <path d="M -42 -78 H 40 M -42 -46 H 20 M -42 -14 H 34 M -42 18 H 8" stroke="#1c1c22" strokeWidth={9} strokeLinecap="round" opacity={0.45} />
        <rect x={-14} y={-124} width={28} height={7} rx={3} fill="#0c0c10" />
      </>
    ) : (
      <>
        <rect x={-22} y={-128} width={44} height={256} rx={14} fill="#1c1c22" stroke={C.inkSoft} strokeWidth={4} />
        <rect x={-22} y={-114} width={9} height={228} rx={4} fill={light} />
      </>
    )}
  </g>
);

const BottleItem: React.FC<{ b: ReturnType<typeof bottleXf> }> = ({ b }) => (
  <g transform={`translate(${b.mx} ${b.my}) rotate(${b.r}) scale(1.25) translate(0 150)`}>
    <path d="M -17 -150 L 17 -150 L 17 -118 L 20 -64 Q 46 -44 46 -12 L 46 112 Q 46 128 30 128 L -30 128 Q -46 128 -46 112 L -46 -12 Q -46 -44 -20 -64 L -17 -118 Z" fill="#3f7a4b" stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round" />
    <path d="M -46 70 L 46 70 L 46 112 Q 46 128 30 128 L -30 128 Q -46 128 -46 112 Z" fill="#7b2f3a" opacity={0.9} />
    <rect x={-46} y={-4} width={92} height={52} fill="#f1e6c8" stroke={C.inkSoft} strokeWidth={3} />
    <path d="M -28 12 H 28 M -22 30 H 22" stroke="#7b2f3a" strokeWidth={6} strokeLinecap="round" />
    <rect x={-19} y={-152} width={38} height={12} rx={4} fill="#b8203f" stroke={C.inkSoft} strokeWidth={3} />
    <path d="M -34 -20 q -2 40 4 70" stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.5} />
  </g>
);

export const Arm: React.FC<{ g: ArmGeom; rig: Rig; s: number; fingerBase?: number }> = ({ g, rig, s }) => {
  const { cfg } = rig;
  const sootA = clamp(rig.p.soot ?? 0, 0, 1);
  const hs = g.hs ?? 1;
  const claw = g.claw ?? 0;
  const view = rig.p.view;
  const dx = g.hx - g.ex, dy = g.hy - g.ey;
  const len = Math.hypot(dx, dy) || 1;
  const ang = (Math.atan2(-dx, dy) * 180) / Math.PI;
  const cuffStart = 1 - 62 / len;
  const cx0 = g.ex + dx * cuffStart, cy0 = g.ey + dy * cuffStart;
  const d = `M ${g.sx} ${g.sy} L ${g.ex} ${g.ey} L ${g.hx} ${g.hy}`;
  const thumbSide = s === 0 ? 1 : -s;
  return (
    <g>
      <path d={d} fill="none" stroke={C.inkSoft} strokeWidth={86} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={cfg.sleeve} strokeWidth={80} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${cx0} ${cy0} L ${g.hx} ${g.hy}`} fill="none" stroke={cfg.sleeveDark} strokeWidth={80} strokeLinecap="butt" />
      {sootA > 0.01 && <path d={d} fill="none" stroke="#14100d" strokeWidth={78} strokeLinecap="round" strokeLinejoin="round" opacity={sootA * 0.32} />}
      {g.item === "phone" && (
        <PhoneItem
          x={view === "front" ? g.hx - s * 12 : g.hx + 34}
          y={g.hy - (view === "front" ? 20 : 20)}
          rot={view === "front" ? s * 8 : 0}
          light={rig.p.light ?? "#8fd8ff"} view={view}
        />
      )}
      {g.item === "bottle" && <BottleItem b={bottleXf(view, s)} />}
      <g transform={`translate(${g.hx} ${g.hy}) rotate(${ang}) scale(${hs})`}>
        {claw > 0.02 && (
          <g opacity={claw}>
            {[-33, -11, 11, 33].map((x, i) => {
              const d2 = `M ${x} 70 q ${x * 0.15 + 4} ${26 + (i % 2) * 6} ${-x * 0.2 - 12} ${46 + (i % 2) * 6}`;
              return (
                <g key={i}>
                  <path d={d2} fill="none" stroke={C.inkSoft} strokeWidth={26} strokeLinecap="round" />
                  <path d={d2} fill="none" stroke={cfg.skin} strokeWidth={20} strokeLinecap="round" />
                </g>
              );
            })}
          </g>
        )}
        {/* большой палец */}
        <ellipse cx={thumbSide * 46} cy={26} rx={20} ry={32} transform={`rotate(${thumbSide * -28} ${thumbSide * 46} 26)`} fill={cfg.skin} {...EDGE} />
        {/* указательный */}
        {g.point > 0.02 && (
          <rect x={-15} y={20} width={30} height={100 * g.point} rx={15} fill={cfg.skin} {...EDGE} />
        )}
        <ellipse cx={0} cy={34} rx={47} ry={50} fill={cfg.skin} {...EDGE} />
        <path d="M -30 54 q 10 8 22 0 M 2 58 q 10 8 22 0" stroke={C.inkSoft} strokeWidth={3} fill="none" strokeLinecap="round" opacity={g.point > 0.5 ? 0.9 : 0.35} />
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Head                                                                */
/* ------------------------------------------------------------------ */
const Head: React.FC<{ rig: Rig; view: "front" | "side" }> = ({ rig, view }) => {
  const { cfg, ev, id } = rig;
  const R = cfg.headR;
  const hc = { x: view === "front" ? 500 : 470, y: 390 };
  const uid = `${id}h${view}`;
  const side = view === "side";
  const headClip = `${uid}hc`;
  const eyeY = 398;
  const eyeR = cfg.eyeR;
  const skinC = cfg.skin;
  const tintColor = ev.flush > 0.01 ? C.danger : "#a8b79a";
  const tintOp = ev.flush * 0.55 + ev.pallor * 0.42;
  const wob = (a: number, b: number) => Math.sin(rig.f * a + cfg.seed) * b;
  const mascara = clamp(rig.p.mascara ?? 0, 0, 1);
  const cryA = clamp(rig.p.cry ?? 0, 0, 1);
  const sootA = clamp(rig.p.soot ?? 0, 0, 1);
  const smokeA = clamp(rig.p.smoke ?? 0, 0, 1);
  const phoneSide = rig.armL.item === "phone" ? -1 : rig.armR.item === "phone" ? 1 : 0;
  return (
    <g>
      {cfg.headBehind && cfg.headBehind(rig, view)}
      {/* уши */}
      {!side && (
        <g>
          <ellipse cx={hc.x - R + 6} cy={hc.y + 30} rx={34} ry={44} fill={cfg.skinShade} {...EDGE} />
          <ellipse cx={hc.x + R - 6} cy={hc.y + 30} rx={34} ry={44} fill={cfg.skinShade} {...EDGE} />
          <ellipse cx={hc.x - R + 8} cy={hc.y + 30} rx={14} ry={24} fill="#c28b5e" opacity={0.7} />
          <ellipse cx={hc.x + R - 8} cy={hc.y + 30} rx={14} ry={24} fill="#c28b5e" opacity={0.7} />
          {cfg.earDecor && cfg.earDecor(rig, view)}
        </g>
      )}
      {/* нос (профиль — выпирает) */}
      {side && (
        <g>
          <ellipse cx={hc.x + R + 16} cy={hc.y + 62} rx={54} ry={46} fill={skinC} {...EDGE} />
          <ellipse cx={hc.x + R + 38} cy={hc.y + 84} rx={16} ry={10} fill={cfg.skinShade} opacity={0.8} />
        </g>
      )}
      <clipPath id={headClip}>
        <circle cx={hc.x} cy={hc.y} r={R} />
      </clipPath>
      <circle cx={hc.x} cy={hc.y} r={R} fill={skinC} {...EDGE} strokeWidth={4} />
      <g clipPath={`url(#${headClip})`}>
        {/* тень по краю головы */}
        <circle cx={hc.x} cy={hc.y} r={R - 6} fill="none" stroke={cfg.skinShade} strokeWidth={22} opacity={0.35} />
        {tintOp > 0.01 && <rect x={hc.x - R} y={hc.y - R} width={R * 2} height={R * 2} fill={tintColor} opacity={tintOp} />}
        {sootA > 0.01 && (
          <g fill="#17110e">
            <ellipse cx={hc.x + (side ? 40 : 0)} cy={hc.y - 150} rx={170} ry={60} opacity={sootA * 0.55} />
            <ellipse cx={hc.x + (side ? 60 : -130)} cy={eyeY + 110} rx={70} ry={42} opacity={sootA * 0.5} />
            <ellipse cx={hc.x + (side ? 170 : 130)} cy={eyeY + 110} rx={70} ry={42} opacity={sootA * 0.5} />
            <ellipse cx={hc.x + (side ? 100 : 0)} cy={hc.y + 215} rx={120} ry={50} opacity={sootA * 0.55} />
            <ellipse cx={hc.x + (side ? 110 : 6)} cy={eyeY + 70} rx={34} ry={46} opacity={sootA * 0.3} />
            <ellipse cx={hc.x - R + 20} cy={hc.y + 40} rx={50} ry={140} opacity={sootA * 0.4} />
            <path d={`M ${hc.x - 80} ${hc.y - 190} q 40 60 10 130 M ${hc.x + 70} ${hc.y - 180} q -30 50 -4 100`} stroke="#0d0907" strokeWidth={16} fill="none" strokeLinecap="round" opacity={sootA * 0.5} />
          </g>
        )}
        {phoneSide !== 0 && (
          <>
            <defs>
              <radialGradient id={`${uid}pg`}>
                <stop offset="0" stopColor={rig.p.light ?? "#8fd8ff"} stopOpacity={0.6} />
                <stop offset="1" stopColor={rig.p.light ?? "#8fd8ff"} stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle cx={side ? hc.x + 190 : hc.x + phoneSide * 160} cy={side ? 520 : 540} r={290} fill={`url(#${uid}pg)`} />
          </>
        )}
      </g>
      {cfg.hairFront(rig, view)}
      {side && (
        <g>
          <ellipse cx={hc.x - 62} cy={hc.y + 36} rx={40} ry={52} fill={cfg.skinShade} {...EDGE} />
          <path d={`M ${hc.x - 70} ${hc.y + 14} q 22 6 12 40`} stroke="#b07c52" strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>
      )}
      {!side && (
        <g>
          {/* румянец */}
          {ev.blush > 0.01 && (
            <g opacity={ev.blush * 0.7}>
              <ellipse cx={hc.x - 150} cy={eyeY + 82} rx={46} ry={28} fill="#e8836f" />
              <ellipse cx={hc.x + 150} cy={eyeY + 82} rx={46} ry={28} fill="#e8836f" />
            </g>
          )}
          {/* нос */}
          <ellipse cx={hc.x + 4} cy={eyeY + 76} rx={26} ry={20} fill={cfg.skinShade} {...EDGE} />
          <ellipse cx={hc.x - 2} cy={eyeY + 68} rx={9} ry={6} fill="#f8dcb8" opacity={0.8} />
          {ev.nostril > 0.02 && (
            <g opacity={clamp(ev.nostril, 0, 1)}>
              <ellipse cx={hc.x - 13} cy={eyeY + 86} rx={7 + 6 * ev.nostril} ry={4 + 4 * ev.nostril} fill={C.ink} transform={`rotate(-14 ${hc.x - 13} ${eyeY + 86})`} />
              <ellipse cx={hc.x + 21} cy={eyeY + 86} rx={7 + 6 * ev.nostril} ry={4 + 4 * ev.nostril} fill={C.ink} transform={`rotate(14 ${hc.x + 21} ${eyeY + 86})`} />
              <path d={`M ${hc.x - 32} ${eyeY + 78} q -10 10 -2 18 M ${hc.x + 40} ${eyeY + 78} q 10 10 2 18`} stroke={C.inkSoft} strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          )}
          {/* мешки у мёртвого */}
          {ev.dead > 0.01 && (
            <g opacity={ev.dead * 0.55} stroke="#6a5a66" strokeWidth={9} strokeLinecap="round" fill="none">
              <path d={`M ${hc.x - 150} ${eyeY + 58} q 58 24 112 0`} />
              <path d={`M ${hc.x + 38} ${eyeY + 58} q 58 24 112 0`} />
            </g>
          )}
          {/* щека-тик */}
          {rig.twitchPulse > 0.02 && (
            <ellipse cx={hc.x - 100} cy={eyeY + 92 - rig.twitchPulse * 6} rx={44} ry={20 + rig.twitchPulse * 6} fill={cfg.skinShade} opacity={0.85 * rig.twitchPulse} />
          )}
          {mascara > 0.01 && (
            <g opacity={mascara}>
              {[-1, 1].map((sd) => {
                const ex = hc.x + sd * 96;
                return (
                  <g key={sd} fill="none" strokeLinecap="round">
                    <ellipse cx={ex} cy={eyeY + 54} rx={64} ry={26} fill="#2c1d38" opacity={0.5} />
                    <path d={`M ${ex - 18} ${eyeY + 50} q ${sd * 14} 60 ${sd * 6} ${96 + mascara * 36}`} stroke="#241730" strokeWidth={16} opacity={0.85} />
                    <path d={`M ${ex + 14} ${eyeY + 52} q ${sd * 34} 46 ${sd * 38} ${80 + mascara * 30}`} stroke="#241730" strokeWidth={11} opacity={0.8} />
                    <path d={`M ${ex + sd * 36} ${eyeY + 46} q ${sd * 26} 20 ${sd * 30} 56`} stroke="#3a2a4a" strokeWidth={8} opacity={0.6} />
                  </g>
                );
              })}
            </g>
          )}
          <Eye cx={hc.x - 96} cy={eyeY} R={eyeR} side={-1} rig={rig} twitchEye uid={uid + "L"} />
          <Eye cx={hc.x + 96} cy={eyeY} R={eyeR} side={1} rig={rig} uid={uid + "R"} />
          <Brow xi={hc.x - 22} xo={hc.x - 170} y={eyeY - eyeR - 36} rig={rig} side={-1} twitch />
          <Brow xi={hc.x + 22} xo={hc.x + 170} y={eyeY - eyeR - 36} rig={rig} side={1} />
          <Mouth cx={hc.x} cy={hc.y + 160} rig={rig} uid={uid} />
          {cfg.faceDecor && cfg.faceDecor(rig, view)}
          <TearDrop rig={rig} x={hc.x + 118} y={eyeY + eyeR * 0.9} phase={0} />
          <TearDrop rig={rig} x={hc.x - 126} y={eyeY + eyeR * 0.9} phase={22} len={120} />
          {cryA > 0.05 && (
            <>
              <TearDrop rig={rig} x={hc.x + 74} y={eyeY + eyeR * 0.9} phase={13} len={140} />
              <TearDrop rig={rig} x={hc.x - 70} y={eyeY + eyeR * 0.9} phase={36} len={150} />
              <TearDrop rig={rig} x={hc.x + 150} y={eyeY + eyeR * 0.8} phase={40} len={110} />
              <TearDrop rig={rig} x={hc.x - 156} y={eyeY + eyeR * 0.8} phase={5} len={110} />
            </>
          )}
        </g>
      )}
      {side && (
        <g>
          {ev.blush > 0.01 && (
            <ellipse cx={hc.x + 110} cy={eyeY + 82} rx={44} ry={26} fill="#e8836f" opacity={ev.blush * 0.6} />
          )}
          {ev.dead > 0.01 && (
            <path d={`M ${hc.x + 60} ${eyeY + 58} q 50 22 100 0`} stroke="#6a5a66" strokeWidth={9} strokeLinecap="round" fill="none" opacity={ev.dead * 0.55} />
          )}
          {/* дальний глаз */}
          <g clipPath={`url(#${headClip})`}>
            <Eye cx={hc.x + 176} cy={eyeY + 2} R={eyeR * 0.82} side={1} rig={rig} far uid={uid + "F"} />
          </g>
          {mascara > 0.01 && (
            <g opacity={mascara} fill="none" strokeLinecap="round">
              <ellipse cx={hc.x + 84} cy={eyeY + 54} rx={60} ry={24} fill="#2c1d38" opacity={0.5} />
              <path d={`M ${hc.x + 60} ${eyeY + 50} q 10 60 2 ${96 + mascara * 36}`} stroke="#241730" strokeWidth={16} opacity={0.85} />
              <path d={`M ${hc.x + 100} ${eyeY + 52} q 22 46 20 ${80 + mascara * 30}`} stroke="#241730" strokeWidth={11} opacity={0.8} />
            </g>
          )}
          {ev.nostril > 0.02 && (
            <ellipse cx={hc.x + R + 38} cy={hc.y + 84} rx={10 + 9 * ev.nostril} ry={6 + 6 * ev.nostril} fill={C.ink} opacity={ev.nostril} />
          )}
          <Eye cx={hc.x + 78} cy={eyeY} R={eyeR} side={1} rig={rig} twitchEye uid={uid + "N"} />
          <Brow xi={hc.x + 28} xo={hc.x + 140} y={eyeY - eyeR - 36} rig={rig} side={1} twitch />
          <Brow xi={hc.x + 160} xo={hc.x + 218} y={eyeY - eyeR - 30} rig={rig} side={1} />
          <Mouth cx={hc.x + 112} cy={hc.y + 158} wScale={0.72} rig={rig} uid={uid} />
          {cfg.faceDecor && cfg.faceDecor(rig, view)}
          <TearDrop rig={rig} x={hc.x + 78} y={eyeY + eyeR * 0.9} />
          {cryA > 0.05 && (
            <>
              <TearDrop rig={rig} x={hc.x + 100} y={eyeY + eyeR * 0.9} phase={20} len={130} />
              <TearDrop rig={rig} x={hc.x + 52} y={eyeY + eyeR * 0.9} phase={38} len={140} />
            </>
          )}
        </g>
      )}
      <Sweat
        rig={rig}
        pts={
          side
            ? [[hc.x + 60, hc.y - 120], [hc.x - 40, hc.y - 150], [hc.x + 150, hc.y - 70]]
            : [[hc.x - 190, hc.y - 110], [hc.x + 190, hc.y - 90], [hc.x + 120, hc.y - 170]]
        }
      />
      {smokeA > 0.01 && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const t = ((rig.f * 0.9 + i * 17) % 85) / 85;
            const k = rig.cough * 0.9 + 0.35 * smokeA;
            const mx = side ? hc.x + 120 : hc.x;
            const x = mx + (i - 2) * 30 + t * (i % 2 ? 50 : -40) + Math.sin(t * 6 + i) * 14;
            const y = hc.y + 190 - t * 330;
            return <circle key={i} cx={x} cy={y} r={30 + t * 50} fill="#6a6560" stroke={C.inkSoft} strokeWidth={3} opacity={clamp(k, 0, 1) * (1 - t) * 0.75} />;
          })}
        </g>
      )}
      {/* неиспользуемые хелперы */}
      {void wob}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Character shell                                                     */
/* ------------------------------------------------------------------ */
const SootBody: React.FC<{ soot: number; view: "front" | "side" }> = ({ soot, view }) => {
  const x0 = view === "front" ? 320 : 320, w = view === "front" ? 360 : 320;
  return (
    <g fill="#14100d">
      {Array.from({ length: 12 }, (_, i) => {
        const x = x0 + hash(i + 31) * w, y = 760 + hash(i + 71) * 560;
        return <ellipse key={i} cx={x} cy={y} rx={40 + hash(i + 5) * 60} ry={30 + hash(i + 9) * 50} opacity={soot * (0.2 + hash(i + 2) * 0.28)} transform={`rotate(${hash(i + 13) * 80 - 40} ${x} ${y})`} />;
      })}
      <path d={`M ${x0 + 30} 1000 q 60 40 40 120 M ${x0 + w - 60} 900 q -40 50 -10 140`} stroke="#0d0907" strokeWidth={22} fill="none" strokeLinecap="round" opacity={soot * 0.4} />
    </g>
  );
};

let ctr = 0;
export const CharacterShell: React.FC<{ p: CharacterProps; cfg: CharacterCfg }> = ({ p, cfg }) => {
  const rawId = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = `c${rawId}${ctr++ % 1 }`;
  const rig = computeRig(p, cfg, id);
  const { ev } = rig;
  const f = p.frame;
  const view = p.view;
  const facingLeft = view === "side" && p.facing === "left";
  const sc = p.scale ?? 1;
  const tx = p.x ?? 0, ty = p.y ?? 0, rot = p.rotate ?? 0;
  const clipId = `${id}ub`;
  const seed = Math.floor(f / 3) % 4; // "кипящий" контур: меняется каждые 3 кадра

  // микродвижения головы
  const shake = ev.shake;
  const talk = clamp(p.mouth, 0, 1);
  const walk = p.walk ?? 0;
  const lean = clamp(p.lean ?? 0, -1, 1);
  const crouch = clamp(p.crouch ?? 0, 0, 1);
  const cry = clamp(p.cry ?? 0, 0, 1);
  const soot = clamp(p.soot ?? 0, 0, 1);
  const cough = rig.cough;
  const crouchDY = crouch * (1392 - 745) * 0.3;
  const shDY = Math.abs(Math.sin(f * 1.45)) * cry * 9 - cough * 8;
  const armDY = crouchDY + shDY;
  const headDX = Math.sin(f / 31 + cfg.seed) * 3 + Math.sin(f * 7.3) * shake * 4 + Math.sin(f * 1.9) * cry * 7;
  const headDY = rig.breath * -3 - talk * 3 + Math.cos(f * 9.1) * shake * 3 + crouchDY + Math.abs(Math.sin(f * 1.45)) * cry * 12
    + cough * 16 + (p.view === "front" ? lean * 18 : 0);
  const headRot = Math.sin(f / 47 + cfg.seed * 2) * 1.3 + ev.tilt + Math.sin(f * 5.7) * shake * 1.2
    + Math.sin(f * 1.1) * cry * 3.5 + cough * 7 + (p.view === "side" ? lean * 5 : 0);
  const pivotX = view === "front" ? 500 : 470;

  const squash = 1 + rig.breath * 0.012;
  const slapDip = p.armL === "slap" || p.armR === "slap" ? Math.max(0, Math.sin(((f % 14) / 14) * Math.PI * 2)) * 0 : 0;

  const clipH = p.upperBodyOnly ? 1170 : 1500;

  const armFront = (g: ArmGeom, s: number) => <Arm g={g} rig={rig} s={s} />;
  const aL = rig.armL, aR = rig.armR;
  // порядок: в side дальняя (L) за корпусом
  const behindArms =
    view === "side" ? (
      <>
        {aL.front < 0.5 && armFront(aL, -1)}
      </>
    ) : null;
  const midArms =
    view === "side" ? (
      <>{aR.front < 0.5 && armFront(aR, 1)}</>
    ) : (
      <>
        {aL.front < 0.5 && armFront(aL, -1)}
        {aR.front < 0.5 && armFront(aR, 1)}
      </>
    );
  const topArms =
    view === "side" ? (
      <>
        {aL.front >= 0.5 && armFront(aL, -1)}
        {aR.front >= 0.5 && armFront(aR, 1)}
      </>
    ) : (
      <>
        {aL.front >= 0.5 && armFront(aL, -1)}
        {aR.front >= 0.5 && armFront(aR, 1)}
      </>
    );

  const wrapMove = (node: React.ReactNode) => {
    if (!walk && !lean) return node;
    const ph = f * walk * 0.3;
    const bob = walk ? -Math.abs(Math.sin(ph)) * 16 : 0;
    const wx = walk ? Math.sin(ph) * 7 : 0;
    const rock = walk ? Math.sin(ph) * 3.2 : 0;
    const lr = view === "side" ? lean * 9 : 0;
    const sc2 = view === "front" ? ` translate(500 1392) scale(${1 + lean * 0.06} ${1 - Math.abs(lean) * 0.02}) translate(-500 -1392)` : "";
    return <g transform={`translate(${wx} ${bob}) rotate(${rock + lr} 500 1392)${sc2}`}>{node}</g>;
  };

  const scene = (
    <g>
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(0 ${armDY})`}>{behindArms}</g>
        {cfg.hairBack(rig, view)}
        <g transform={`translate(${pivotX} 700) scale(1 ${squash}) translate(${-pivotX} -700) translate(0 ${slapDip + shDY})${crouch > 0 ? ` translate(0 1392) scale(1 ${1 - crouch * 0.3}) translate(0 -1392)` : ""}`}>
          {cfg.body(rig, view)}
          {soot > 0.01 && <SootBody soot={soot} view={view} />}
        </g>
        <g transform={`translate(0 ${armDY})`}>{midArms}</g>
      </g>
      <g transform={`translate(${headDX} ${headDY}) rotate(${headRot} ${pivotX} 640)`}>
        <Head rig={rig} view={view} />
      </g>
      <g clipPath={`url(#${clipId})`}><g transform={`translate(0 ${armDY})`}>{topArms}</g></g>
    </g>
  );

  return (
    <svg
      width={1000}
      height={1400}
      viewBox="0 0 1000 1400"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={-300} y={-300} width={1600} height={clipH + 300} />
        </clipPath>
        <filter id={`${id}paper`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves={3} seed={seed + cfg.seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={7} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feDropShadow in="d" dx={3} dy={5} stdDeviation={0} floodColor="#000" floodOpacity={0.4} />
        </filter>
      </defs>
      <g
        transform={`translate(${tx} ${ty}) rotate(${rot} 500 700) translate(500 700) scale(${sc}) translate(-500 -700)`}
        filter={`url(#${id}paper)`}
      >
        {facingLeft ? <g transform="translate(1000 0) scale(-1 1)">{wrapMove(scene)}</g> : wrapMove(scene)}
      </g>
    </svg>
  );
};

export const edge = EDGE;
export { clamp };
