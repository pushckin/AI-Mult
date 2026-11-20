// Утилиты «рваной» кукольной анимации: всё на двойках, жёсткие повороты, детерминированный шум.
import { IDLE_POSE, Pose, pose } from "./types";

/** Кадр, «зажатый» на двойках: поза обновляется 12 раз в секунду при 24 fps. */
export const hold = (frame: number, step = 2) => Math.floor(frame / step) * step;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (frame: number, a: number, b: number) => clamp((frame - a) / (b - a));

/** Детерминированный шум [0,1) от целого и сида. */
export const hash = (n: number, seed = 1) => {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Шум [-1,1], обновляется каждые `step` кадров. */
export const jitter = (frame: number, seed = 1, step = 2) => hash(Math.floor(frame / step), seed) * 2 - 1;

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;

/** Ремап времени (слоу-мо): пары [кадр_вывода, игровое_время], кусочно-линейно. */
export const remap = (frame: number, keys: ReadonlyArray<readonly [number, number]>) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i][0]) {
      const [f0, t0] = keys[i - 1];
      const [f1, t1] = keys[i];
      return lerp(t0, t1, (frame - f0) / (f1 - f0));
    }
  }
  return keys[keys.length - 1][1];
};

/** Кусочно-линейный трек значения с зажатием на двойках. */
export const track = (frame: number, keys: ReadonlyArray<readonly [number, number]>, step = 2) => remap(hold(frame, step), keys);
export const track2 = (frame: number, keys: ReadonlyArray<readonly [number, number, number]>, step = 2): [number, number] => {
  const f = hold(frame, step);
  const xs = keys.map((k) => [k[0], k[1]] as const);
  const ys = keys.map((k) => [k[0], k[2]] as const);
  return [remap(f, xs), remap(f, ys)];
};

/** Жёсткие ключи позы: между ключами поза СТОИТ (без интерполяции), как смена вырезок. */
export const holdKeys = <T>(frame: number, keys: ReadonlyArray<{ f: number } & T>): ({ f: number } & T) | undefined => {
  let cur: ({ f: number } & T) | undefined;
  for (const k of keys) if (k.f <= frame) cur = k;
  return cur;
};

/** Объединение поз: базовая + частичные поправки (суммируются суставы, остальное перезаписывается). */
const ADD: Array<keyof Pose> = ["rot", "torso", "head", "armL", "armR", "legL", "legR", "headDx", "headDy", "x", "y"];
export const mix = (base: Pose, ...parts: Array<Partial<Pose> | undefined>): Pose => {
  const out: Pose = { ...base };
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p) as Array<[keyof Pose, never]>) {
      if (v === undefined) continue;
      if ((ADD as string[]).includes(k)) (out[k] as number) += v as number;
      else (out[k] as unknown) = v;
    }
  }
  return out;
};

// ---------- Ходьба ----------
export interface WalkOpts {
  /** кадров на полный шаг (двойной шаг) */
  period?: number;
  legAmp?: number;
  rock?: number;
  bob?: number;
  /** рука с предметом (правая) почти не качается */
  holdRightArm?: boolean;
  seed?: number;
}
/** Качание корпуса + жёсткий поворот ног. Возвращает частичную позу. */
export const walk = (frame: number, o: WalkOpts = {}): Partial<Pose> => {
  const { period = 16, legAmp = 28, rock = 5, bob = 7, holdRightArm = false } = o;
  const f = hold(frame);
  const ph = (f / period) * Math.PI * 2;
  const s = Math.sin(ph);
  // жёсткие позы: 3 дискретных положения ноги
  const q = Math.round(s * 1.2) / 1.2;
  const sq = Math.abs(s) > 0.55 ? Math.sign(s) : 0;
  return {
    legL: q * legAmp,
    legR: -q * legAmp,
    armL: -q * legAmp * 0.8,
    armR: holdRightArm ? 22 + sq * 3 : q * legAmp * 0.8,
    torso: sq * rock * -1,
    head: sq * rock * 0.6,
    y: Math.abs(sq) * bob,
    cupUpright: holdRightArm,
  };
};

// ---------- Говорение ----------
const VISEMES = ["a", "o", "wide", "a", "o"];
export interface TalkOpts {
  /** кадров на слог (кратно 2 - рот меняется на двойках) */
  syllable?: number;
  seed?: number;
  nod?: number;
}
/** Смена рта под слог в окне [start,end). Вне окна - закрыт. */
export const talk = (frame: number, start: number, end: number, o: TalkOpts = {}): Partial<Pose> => {
  const { syllable = 4, seed = 3, nod = 3 } = o;
  if (frame < start || frame >= end) return { mouth: "closed" };
  const f = hold(frame);
  const idx = Math.floor((f - start) / syllable);
  const inSyl = (f - start) % syllable;
  const closedGap = idx % 3 === 2 || inSyl >= syllable - 2 * (hash(idx, seed) > 0.6 ? 1 : 0);
  const v = closedGap ? "closed" : VISEMES[Math.floor(hash(idx, seed) * VISEMES.length)];
  return { mouth: v, head: idx % 2 ? nod : -nod * 0.5, headDy: idx % 2 ? -2 : 0 };
};

// ---------- Тик глаза / дёрганье ----------
/** Нервный тик: редкие короткие события (2-4 кадра): веко + рывок головы. */
export const eyeTick = (frame: number, seed = 5, every = 36): Partial<Pose> => {
  const slot = Math.floor(frame / every);
  const at = slot * every + Math.floor(hash(slot, seed) * (every - 6));
  const f = hold(frame);
  const d = f - hold(at);
  if (d >= 0 && d < 4 && hash(slot, seed + 9) > 0.25) {
    const dir = hash(slot, seed + 4) > 0.5 ? 1 : -1;
    return { tick: true, head: dir * 7, headDx: dir * 4, headDy: -2 };
  }
  return { tick: false };
};
/** Дёрганье части тела на двойках: амплитуда в градусах. */
export const twitch = (frame: number, seed = 2, amp = 3): number => jitter(frame, seed, 2) * amp;

// ---------- Полёт / падение (ragdoll-слайд) ----------
export interface FlightOpts {
  from: [number, number];
  to: [number, number];
  apex: number;
  /** итоговое вращение всего тела, градусы (отриц. = по часовой, головой вперёд) */
  spin: number;
  seed?: number;
  flail?: number;
}
/** u: 0..1 прогресс полёта (уже с учётом слоу-мо). Жёсткое вращение целиком + дрыгающиеся жёсткие конечности. */
export const ragdoll = (u: number, o: FlightOpts, frame: number): Partial<Pose> => {
  const t = clamp(u);
  const { from, to, apex, spin, seed = 4, flail = 18 } = o;
  const x = lerp(from[0], to[0], t);
  const y = lerp(from[1], to[1], t) + apex * 4 * t * (1 - t);
  const j = (n: number) => jitter(frame, seed + n, 2) * flail;
  return {
    x,
    y,
    rot: spin * easeInOut(t),
    armL: 150 + j(1),
    armR: 40 + j(2) * 0.4,
    legL: -25 + j(3),
    legR: 35 + j(4),
    torso: -8,
    head: 18 + j(5) * 0.4,
    cupUpright: true,
  };
};

/** Шлепок о землю: короткий отскок на двойках (px по y и угол). */
export const bounce = (frame: number, hitFrame: number, h = 22): { dy: number; drot: number } => {
  const d = hold(frame) - hold(hitFrame);
  if (d < 0 || d > 10) return { dy: 0, drot: 0 };
  const k = [h, 0, h * 0.4, 0, h * 0.12, 0][Math.floor(d / 2)] ?? 0;
  return { dy: k, drot: k ? 4 : 0 };
};

export { IDLE_POSE, pose };
