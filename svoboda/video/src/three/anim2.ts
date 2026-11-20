// Анимация сцены 2: позы по планам 07-12 как функции кадра. Всё на двойках, жёсткие рывки.
import { PP, PPatch, mixP } from "./Person";
import { ShotT, S09, STEP_AT, mouthFromEnv, envAt } from "../data/scene2";
import { hold, jitter, lerp, clamp, hash } from "./util";

// ---------- масштаб и места ----------
export const SC = { greg: 1.45, tony: 1.5, marcus: 1.35, chloe: 1.3 };
export const BIN = { x: 5.0, z: 1.0 };
export const BUSH = { x: 8.7, z: 0.7 };
export const GREG_X = -2.4;

const CB = (kind: keyof typeof SC, o: PPatch = {}): PP =>
  mixP({ scale: SC[kind], y: 0.43 * SC[kind], z: 0.4, eyeL: 0, eyeR: 0, alz: 8, arz: 8, llz: 4, lrz: 4 }, o);

// ---------- ключи ----------
type K = PPatch & { t: number };
const DISC: ReadonlyArray<keyof PP> = ["mouth", "eyeL", "eyeR", "acc", "tear", "hl", "hr", "sir"];
/** Кусочно-линейно между ключами (по числам), дискретные поля берутся жёстко с предыдущего ключа. step - «двойки/четвёрки» */
export const track = (base: PPatch, keys: K[], t: number, step = 2): PPatch => {
  const tq = hold(t, step);
  let cum: PPatch = { ...base };
  let prev: PPatch = cum;
  let prevT = keys[0]?.t ?? 0;
  let out: PPatch = cum;
  let found = false;
  for (let i = 0; i < keys.length; i++) {
    const { t: kt, ...patch } = keys[i];
    const next: PPatch = { ...cum, ...patch };
    if (!found && tq < kt) {
      const u = kt === prevT ? 1 : clamp((tq - prevT) / (kt - prevT));
      out = { ...prev };
      for (const key of Object.keys(next) as Array<keyof PP>) {
        const a = (prev[key] as number | undefined) ?? 0;
        const b = next[key] as number;
        (out as Record<string, number>)[key] = DISC.includes(key) ? a : lerp(a, b, u);
      }
      found = true;
    }
    prev = next;
    prevT = kt;
    cum = next;
  }
  return found ? out : cum;
};

const sway = (t: number, seed: number, amp: number) => jitter(t, seed, 6) * amp;

export interface Voices {
  env: Array<number[] | undefined>;
}
export interface Actor {
  kind: "greg" | "tony" | "marcus" | "chloe";
  pose: PP;
}
export interface Cam {
  x: number; y: number; z: number; tx: number; ty: number; shake: number;
}
export interface Frame {
  actors: Actor[];
  cam: Cam;
  bgx: number; // сдвиг фона: кофейня («VEGAN COFFEE») всегда в центре кадра
  bin: number | null; // x горящей урны (или нет)
  bushShake: number; // 0 нет, иначе амплитуда
  leaves: number; // кадр полёта листьев (или -1)
  dust: Array<{ x: number; z: number; k: number }>;
  tl: number;
}

/** Реплика: открытие рта по слогам + кивок на сильных слогах */
const speak = (p: PP, sh: ShotT, t: number, env: number[] | undefined, nod = 3): PP => {
  const k = t - sh.vFrom;
  if (k < 0 || k >= sh.vLen) return p;
  const m = mouthFromEnv(env, k, sh.vLen);
  return { ...p, mouth: m, hx: p.hx + (m === 2 ? nod : 0), tl: p.tl + (m === 2 ? nod * 0.5 : 0) };
};
const speaking = (sh: ShotT, t: number) => t >= sh.vFrom && t < sh.vFrom + sh.vLen;

// =====================================================================================
// ПЛАН 07: Тони и Маркус выглядывают из-за горящей урны
// =====================================================================================
const TONY_PEEK = { x: 3.45, z: 0.25 };
const MARCUS_PEEK = { x: 6.5, z: 0.3 };
const shot07 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  // --- Тони (слева от урны) ---
  const stand = { llx: 6, lrx: 6, llk: 6, lrk: 6 };
  const tonyBase: PPatch = {
    x: TONY_PEEK.x, z: TONY_PEEK.z, y: 0.3, ry: 22, tl: 12, llx: 70, lrx: 70, llk: 100, lrk: 100, alx: 6, ale: 25, arx: 6, are: 25, alz: 10, arz: 10,
    hy: -14, hx: -4, brow: 0.3,
  };
  const tk: K[] = [
    { t: 0 },
    { t: 6, hx: -8, hy: -24 }, { t: 12, hy: 10, hx: -4 },
    // принюхивание: подбородок вверх, жёсткие рывки на четвёрках
    { t: 14, hx: -22, tl: 14 }, { t: 18, hx: -2, tl: 10 }, { t: 22, hx: -22, tl: 14 }, { t: 26, hx: -2, tl: 10 }, { t: 28, hx: -20, tl: 14 },
    { t: 30, arx: 150, are: 100, alx: 6, brow: 0.6 }, { t: 34, arx: 162, are: 112, hx: 4, acc: 1 },
    { t: 38, arx: 70, are: 60, brow: 1, eyeL: 2, eyeR: 2 }, { t: 42, arx: 20, are: 30 }, { t: 46, y: 0.34, alx: 100, ale: 50 },
    { t: 76, y: 0.46, llx: 50, lrx: 50, llk: 70, lrk: 70, tl: 8, alx: 60, arx: 24, ale: 50, are: 30 },
    { t: 120, y: 0.645, ...stand, tl: 4, alx: 20, ale: 30, arx: 14, are: 30, hy: 12, hx: 2 },
    { t: 190, hy: 26, hx: 6 },
    { t: L - 20, hy: 34, hx: 8, brow: 1 },
  ];
  const tp = track(tonyBase, tk, t, 4);
  const tony = mixP({ scale: SC.tony, eyeL: 0, eyeR: 0, alz: 14, arz: 14, llz: 4, lrz: 4, ...tp });
  let tpose = tony;
  if (t >= 14 && t < 30) tpose = { ...tpose, y: tpose.y + (Math.floor(t / 2) % 2 ? 0.035 : 0) };
  if (t >= 38) tpose = { ...tpose, tear: 1 + (Math.floor((t - 38) / 8) % 3), tl: tpose.tl + (Math.floor(t / 6) % 2 ? 1.5 : -1), hp: 1 };
  if (t >= 46) tpose = { ...tpose, hy: tpose.hy + [0, 7, -7, 3][Math.floor(t / 10) % 4], eyeL: 2, eyeR: 2 };
  tpose = speak(tpose, sh, t, v.env[0]);
  if (!speaking(sh, t)) tpose = { ...tpose, mouth: 0 };

  // --- Маркус: выглядывает справа от урны, трясётся с сумочкой ---
  const peekX = [[0, 7.05], [10, 7.05], [12, 6.5], [22, 6.5], [24, 7.05], [34, 7.05], [36, 6.5], [60, 6.5], [62, 6.8], [74, 6.8], [76, 6.45]];
  let mx = peekX[0][1];
  for (const [kt, kx] of peekX) if (t >= kt) mx = kx;
  const mBase: PPatch = {
    x: mx, z: MARCUS_PEEK.z, y: 0.42, ry: -24, tl: 6, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, hy: 8, mouth: 4, brow: 1,
    llx: 40, lrx: 40, llk: 60, lrk: 60,
  };
  const mk: K[] = [
    { t: 0 }, { t: 12, hy: -8 }, { t: 24, hy: 14 }, { t: 36, hy: -4 }, { t: 48, hy: 10, y: 0.46 },
    { t: 120, hy: -6, y: 0.5, llx: 20, lrx: 20, llk: 24, lrk: 24 }, { t: L - 60, hy: -12, y: 0.55, llx: 6, lrx: 6, llk: 6, lrk: 6, tl: 4 },
  ];
  let mp = mixP({ scale: SC.marcus, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, ...track(mBase, mk, t, 4) });
  mp = {
    ...mp,
    x: mx,
    tz: jitter(t, 3, 4) * 7,
    tl: mp.tl + jitter(t, 5, 2) * 2,
    hz: jitter(t, 9, 4) * 7,
    y: mp.y + (Math.floor(t / 4) % 2 ? 0.03 : 0),
    mouth: 4,
    tear: t > L - 200 ? 1 + (Math.floor(t / 8) % 3) : 0,
  };
  return [
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tpose },
  ];
};

// =====================================================================================
// ПЛАН 08: Маркус бросается Тони на шею (профили лицом друг к другу)
// =====================================================================================
const T08 = { x: 3.0, z: 0.4 };
const shot08 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  // Тони: стоит в профиль, плачет, принимает объятие, голову опускает на плечо Маркуса
  const tBase: PPatch = {
    x: T08.x, z: T08.z, y: 0.43 * SC.tony, ry: -82, tl: 2, alx: 40, ale: 40, arx: 40, are: 40, hy: 62, hx: 6, acc: 1, brow: 1, eyeL: 2, eyeR: 2, mouth: 0,
  };
  const tk: K[] = [{ t: 0 }, { t: 14, alx: 40, arx: 40, ale: 40, are: 40 }, { t: 18, alx: 74, arx: 80, ale: 52, are: 46, hy: 58, tl: 0 }, { t: 30, alx: 80, arx: 84, ale: 56, are: 50 }];
  let tp = mixP({ scale: SC.tony, llz: 4, lrz: 4, alz: 8, arz: 8, ...track(tBase, tk, t, 2) });
  tp = { ...tp, tear: 1 + (Math.floor(t / 6) % 3), tl: tp.tl + (t > 18 ? (Math.floor(t / 4) % 2 ? 3 : -1.5) : 0), hx: tp.hx + (t > 18 && Math.floor(t / 6) % 2 ? 5 : 0), y: tp.y + (t > 18 && Math.floor(t / 4) % 2 ? 0.03 : 0), mouth: 0 };

  // Маркус: подбегает (0-12), прыгает на шею (12-14), висит; руки вокруг шеи, ноги свисают порознь
  const runKeys: K[] = [
    { t: 0, x: T08.x - 2.3, z: 0.6, ry: 82, y: 0.58, hy: -40, tl: 8 },
    { t: 12, x: T08.x - 1.5, z: 0.6, ry: 82, y: 0.58, hy: -40 },
    { t: 14, x: T08.x - 1.15, z: 0.62, ry: 82, y: 1.1, hy: -58, alx: 118, arx: 122, alz: 6, arz: 6, ale: 24, are: 24 },
    { t: 18, x: T08.x - 1.05, z: 0.62, ry: 82, y: 1.05, hy: -62, alx: 122, arx: 126, ale: 40, are: 36 },
    { t: 24, x: T08.x - 1.05, z: 0.62, ry: 82, y: 1.02, hy: -62, alx: 124, arx: 130, ale: 46, are: 40 },
  ];
  const run = t < 14;
  const base: PPatch = { scale: SC.marcus, alx: 40, ale: 100, arx: 40, are: 100, alz: 14, arz: 14, llx: 0, lrx: 0, mouth: 4, brow: 1, eyeL: 0, eyeR: 0 };
  let mp = mixP({ ...base, ...track({}, runKeys, t, 2) });
  if (run) {
    const ph = Math.floor(t / 2) % 2;
    mp = { ...mp, llx: ph ? 50 : -50, lrx: ph ? -50 : 50, llk: ph ? 0 : 60, lrk: ph ? 60 : 0, alx: ph ? -50 : 50, arx: ph ? 50 : -50, ale: 60, are: 60, y: mp.y + (ph ? 0.06 : 0), tl: 14 };
  } else {
    const bob = Math.floor(t / 4) % 2;
    mp = {
      ...mp, tz: jitter(t, 4, 4) * 4, hz: jitter(t, 8, 4) * 5, hx: 6 + (bob ? 5 : 0), tear: 1 + (Math.floor(t / 6) % 3), y: mp.y + (bob ? 0.03 : 0),
      llx: 8 + (bob ? 6 : 0), lrx: -10, llk: 24, lrk: 62, llz: 8, lrz: 3, tl: 2,
    };
  }
  mp = speak({ ...mp, mouth: 0 }, sh, t, v.env[1], 3);
  if (t < sh.vFrom || t >= sh.vFrom + sh.vLen) mp = { ...mp, mouth: 0 };
  return [
    { kind: "tony", pose: tp },
    { kind: "marcus", pose: mp },
  ];
};

// =====================================================================================
// ПЛАН 09: Хлоя выпрыгивает из кустов
// =====================================================================================
const CH_LAND = { x: 6.6, z: 0.6 };
const shot09 = (t: number, sh: ShotT, v: Voices): { actors: Actor[]; leaves: number } => {
  if (t < S09.jump) return { actors: [], leaves: -1 };
  const air = t < S09.land;
  const k = t - S09.jump;
  let pose: PP;
  if (air) {
    const f = hold(t, 2);
    const u = (f - S09.jump) / (S09.land - S09.jump);
    const x = lerp(BUSH.x, CH_LAND.x, u);
    const y = 0.56 + 0.9 * 4 * u * (1 - u) + 0.3 * (1 - u);
    pose = CB("chloe", {
      x, y, z: lerp(0.6, CH_LAND.z, u), ry: -56, tl: -6, alx: 170, ale: 10, arx: 80, are: 80, arz: -22, alz: 22, llx: 30 - (k % 4) * 8, lrx: -20 + (k % 4) * 6, llz: 26, lrz: 26, llk: 40, lrk: 20, mouth: 0, eyeL: 1, eyeR: 1, hx: -6, hy: 10,
      brow: 1,
    });
  } else {
    const tt = t - S09.land;
    const landing = tt < 4;
    const base: PPatch = {
      x: CH_LAND.x, z: CH_LAND.z, ry: -58, y: 0.56 - (landing ? 0.07 : 0), tl: -4, hx: -6, hy: 12, llz: 17, lrz: 17, llk: landing ? 30 : 0, lrk: landing ? 30 : 0, llx: landing ? 20 : 4, lrx: landing ? 20 : -2,
      alx: 172, ale: 4, alz: 12, arx: 84, are: 78, arz: -26, mouth: 0, eyeL: 0, eyeR: 2, brow: 0.6, hl: 0, acc: 0,
    };
    pose = CB("chloe", base);
    pose = { ...pose, tl: pose.tl + (Math.floor(tt / 6) % 2 ? 1.5 : -1), hz: Math.floor(tt / 8) % 2 ? 3 : -3 };
    if (t >= S09.siren) pose = { ...pose, sir: 1 + (Math.floor((t - S09.siren) / 2) % 3), mouth: 0, eyeL: 3, eyeR: 3 };
    if (speaking(sh, t)) {
      const e = envAt(v.env[2], t - sh.vFrom);
      pose = speak({ ...pose, eyeL: 0, eyeR: 0, brow: 1, sir: e > 0.55 ? 1 + (Math.floor(t / 2) % 3) : 0 }, sh, t, v.env[2], 4);
      pose = { ...pose, alx: 172 - (Math.floor(t / 14) % 2 ? 14 : 0), hy: pose.hy + [0, 8, -4, 6][Math.floor(t / 12) % 4] };
    } else if (t >= sh.vFrom + sh.vLen) {
      pose = { ...pose, sir: 0, mouth: 0, eyeL: 0, eyeR: 0 };
    }
  }
  return { actors: [{ kind: "chloe", pose }], leaves: t - S09.jump };
};

// =====================================================================================
// ПЛАН 10: реакция, Грег и Тони
// =====================================================================================
const shot10 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  const gBase: PPatch = {
    scale: SC.greg, x: GREG_X, z: 0.4, y: 0.43 * SC.greg, ry: 38, hy: 18, hx: 4, tl: 2, eyeL: 2, eyeR: 2, brow: -1, mouth: 0, arx: 30, are: 78, alx: 12, alz: 10, llz: 4, lrz: 4,
  };
  const gk: K[] = [{ t: 0 }, { t: 40, hy: 14 }, { t: 90, hy: 22, hx: 2 }, { t: L - 30, hy: 12, hx: 6, tl: 4 }];
  let gp = mixP({ ...gBase, ...track({}, gk, t, 4) });
  if (speaking(sh, t)) {
    const arm = [[16, 14], [58, 30], [24, 24], [74, 36], [30, 20]][Math.floor((t - sh.vFrom) / 14) % 5];
    gp = speak({ ...gp, alx: arm[0], alz: arm[1], tz: Math.floor(t / 6) % 2 ? 2 : -2 }, sh, t, v.env[3], 3);
  } else gp = { ...gp, mouth: 0 };
  if (Math.floor(t / 2) % 13 === 6) gp = { ...gp, eyeL: 3, eyeR: 2 };
  gp = { ...gp, y: gp.y + (Math.floor(t / 6) % 2 ? 0.012 : 0) };

  // Тони: скрестил руки, закатывает глаза
  const roll = (u: number): [number, number] => {
    const a = lerp(200, -20, clamp(u)) * (Math.PI / 180);
    return [Math.cos(a) * 2.2, Math.sin(a) * 2.2];
  };
  let [lx, ly] = [0, 0];
  let rollHead = 0;
  if (t >= 8 && t < 44) {
    const u = (hold(t, 4) - 8) / 32;
    [lx, ly] = roll(u);
    rollHead = lerp(-6, 6, u);
  } else if (t >= 44 && t < 52) {
    [lx, ly] = [-2.2, 0.4];
  }
  const TS = 1.6;
  const tBase: PPatch = {
    scale: TS, x: 0.45, z: 1.0, y: 0.43 * TS, ry: -14, tl: 0, hy: 8, hx: 0, alx: 8, ale: 20, arx: 8, are: 20, alz: 16, arz: 16, acc: 1, eyeL: 2, eyeR: 2, brow: -0.6, mouth: 0, llz: 5, lrz: 5,
  };
  let tp = mixP({ ...tBase, lx, ly, hz: rollHead });
  if (t >= 44) tp = { ...tp, hx: -10 + (Math.floor(t / 10) % 2 ? 2 : 0), tl: -5, mouth: 0 };
  if (t > 40 && Math.floor(t / 2) % 9 === 3) tp = { ...tp, eyeL: 3, eyeR: 3 };
  const MS = 1.5;
  let mp = mixP({
    scale: MS, x: 1.95, z: 0.9, y: 0.43 * MS, ry: -20, tl: 6, hy: -20, hx: 4, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4,
  });
  mp = { ...mp, tz: jitter(t, 6, 4) * 4, hz: jitter(t, 2, 4) * 4, tear: 1 + (Math.floor(t / 7) % 3) };
  return [
    { kind: "greg", pose: gp },
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tp },
  ];
};

// =====================================================================================
// ПЛАН 11: Хлоя обижена, тычет пальцем
// =====================================================================================
const shot11 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const vk = t - sh.vFrom;
  const frac = clamp(vk / sh.vLen);
  const base: PPatch = {
    x: 6.9, z: 0.6, ry: -40, tl: -3, hx: -4, hy: -4, llz: 12, lrz: 12, alx: 12, ale: 8, alz: 30, arx: 0, are: 0, arz: 10, mouth: 0, eyeL: 2, eyeR: 2, brow: -0.8, acc: 1, hr: 0,
  };
  let pose: PP;
  if (t < 10) {
    const kk = hold(t, 2);
    pose = CB("chloe", { ...base, acc: kk < 6 ? 0 : 1, arx: lerp(84, 6, clamp(kk / 8)), are: lerp(78, 8, clamp(kk / 8)), arz: lerp(-26, 10, clamp(kk / 8)), alx: 150, ale: 20, hx: -6, mouth: 0 });
  } else {
    let arx = 6;
    let are = 8;
    let abd = 10;
    let hr = 0;
    let alx = 12;
    let ale = 8;
    const jab = Math.floor(t / 4) % 2;
    if (frac < 0.24 || (frac >= 0.52 && frac < 0.78)) {
      arx = 92 + (jab ? 8 : -2);
      are = 4;
      abd = 34;
      hr = 1;
    } else if (frac >= 0.78) {
      const s = Math.floor((frac - 0.78) / 0.07);
      arx = [40, 70, 100][Math.min(2, s)];
      are = 20;
      abd = [60, 80, 96][Math.min(2, s)];
      hr = 0;
    }
    if (frac >= 0.24 && frac < 0.52) {
      alx = 165; ale = 6;
      arx = 22; are = 60;
    }
    pose = CB("chloe", { ...base, arx, are, arz: abd, hr, alx, ale, hy: -4 + (jab ? 3 : 0), hx: -2, cup: alx > 100 ? 0 : -30 });
  }
  pose = { ...pose, tz: jitter(t, 7, 2) * 1.5 };
  if (speaking(sh, t)) pose = speak({ ...pose, eyeL: 2, eyeR: 2, brow: -1 }, sh, t, v.env[4], 4);
  else pose = { ...pose, mouth: 0, hx: t >= sh.vFrom + sh.vLen ? 6 : pose.hx };
  return [{ kind: "chloe", pose }];
};

// =====================================================================================
// ПЛАН 12: Тони нависает (низкий ракурс), профили лицом друг к другу
// =====================================================================================
export const T12 = { x0: 4.9, z: 1.0 };
const CHLOE12 = { x: 7.9, z: 1.25 };
const shot12 = (t: number, sh: ShotT, v: Voices): { actors: Actor[]; dust: Array<{ x: number; z: number; k: number }> } => {
  const L = sh.len;
  let x = T12.x0;
  let cx = CHLOE12.x;
  let stepPh = -1;
  const dust: Array<{ x: number; z: number; k: number }> = [];
  STEP_AT.forEach((s, i) => {
    const u = clamp((hold(t, 2) - s) / 6);
    x += 0.5 * u;
    cx += 0.32 * clamp((hold(t, 2) - s - 2) / 4);
    if (t >= s && t < s + 10) stepPh = i;
    if (t >= s + 6 && t < s + 20) dust.push({ x: T12.x0 + 0.5 * (i + 1) - 0.3, z: T12.z + 0.1, k: t - (s + 6) });
  });
  const walking = stepPh >= 0;
  // позы-акценты: A (0-12) стоит грудью вперёд; B (12-84) бицепс сбоку; C (84-150) кулаки к лицу; D (150-230) двойной бицепс, наклон; E (230+) руки в боки, грудь колесом
  const pose = t < 12 ? "A" : t < 84 ? "B" : t < 150 ? "C" : t < 232 ? "D" : "E";
  const strain = pose === "B" || pose === "D" ? jitter(t, 3, 2) : 0;
  const tBase: PPatch = {
    scale: SC.tony, x, z: T12.z, y: 0.43 * SC.tony, ry: 70, rz: -3, tl: 3, hy: -12, hx: -4, alx: 12, ale: 20, arx: 12, are: 20, alz: 10, arz: 10, brow: -1, eyeL: 2, eyeR: 2, mouth: 0,
    llz: 8, lrz: 8, acc: 1, hl: 0, hr: 0,
  };
  let tp = mixP(tBase);
  if (pose === "B") {
    // двойной бицепс: плечи горизонтально в стороны, предплечья вертикально вверх, кулаки; грудью к камере, смотрит на Хлою
    tp = { ...tp, ry: 40, arx: 90, are: 100, arz: 88, hr: 2, alx: 90, ale: 100, alz: 88, hl: 2, rz: -4, tl: -3, hy: 38, hx: -6, brow: -1, y: tp.y + (Math.floor(t / 2) % 2 ? 0.015 : 0) };
    tp = { ...tp, ale: tp.ale + strain * 5, are: tp.are - strain * 5 };
  } else if (pose === "C") {
    // боксёрская стойка: кулаки перед лицом
    tp = { ...tp, arx: 78, are: 128, arz: 8, hr: 2, alx: 70, ale: 122, alz: 12, hl: 2, rz: -10, tl: 10, hy: -10, hx: 2 };
  } else if (pose === "D") {
    // второй двойной бицепс: корпус откинут, подбородок вверх
    tp = { ...tp, ry: 30, arx: 90, are: 96, arz: 84, hr: 2, alx: 90, ale: 96, alz: 84, hl: 2, rz: -2, tl: -8, hy: 44, hx: -12, y: tp.y + (Math.floor(t / 2) % 2 ? 0.02 : 0) };
    tp = { ...tp, ale: tp.ale + strain * 6, are: tp.are - strain * 6 };
  } else if (pose === "E") {
    // руки в боки, грудь колесом
    tp = { ...tp, ry: 62, arx: -4, are: 70, arz: 46, hr: 2, alx: -4, ale: 70, alz: 46, hl: 2, rz: -2, tl: -4, hy: -14, hx: -8 };
  }
  if (walking) {
    const ph = Math.floor((t - STEP_AT[stepPh]) / 4) % 2;
    tp = { ...tp, llx: ph ? 34 : -22, lrx: ph ? -22 : 34, llk: ph ? 0 : 30, lrk: ph ? 30 : 0, y: tp.y + (ph ? 0.05 : 0), tl: tp.tl + 4 };
  }
  tp = speak(tp, sh, t, v.env[5], 4);
  if (!speaking(sh, t)) tp = { ...tp, mouth: 0, brow: -1 };
  tp = { ...tp, tz: speaking(sh, t) ? jitter(t, 5, 4) * 1.5 : 0 };

  // Хлоя: вжимает голову в плечи, плечи вверх, отступает; плакат и мегафон опущены; рот закрыт (дрожит)
  const cow = t >= 8;
  const blink = Math.floor(t / 12) % 5 === 2;
  let cp = CB("chloe", {
    x: cx, z: CHLOE12.z, ry: -70, rz: cow ? -7 : 0, tl: cow ? -2 : 0, hx: cow ? -2 : -4, hy: cow ? 18 : 8, hdy: cow ? -0.1 : 0, y: 0.43 * SC.chloe - (cow ? 0.05 : 0), llx: cow ? 12 : 0, lrx: cow ? -6 : 0, llk: cow ? 18 : 0, lrk: cow ? 22 : 0,
    llz: 12, lrz: 12, alx: cow ? 12 : 16, ale: cow ? 14 : 12, alz: 14, arx: cow ? 10 : 14, are: cow ? 14 : 12, arz: 14, acc: 1, brow: 1, eyeL: cow ? (blink ? 3 : 1) : 0, eyeR: cow ? (blink ? 3 : 1) : 0, mouth: cow ? 6 : 0,
    cup: -55, hp: 12,
  });
  if (cow) cp = { ...cp, tz: jitter(t, 11, 4) * 3, hz: jitter(t, 12, 4) * 3, tear: 1 + (Math.floor(t / 9) % 3), y: cp.y + (Math.floor(t / 4) % 2 ? 0.018 : 0) };

  // Маркус: слева за Тони, прижимает сумочку и всхлипывает; рот закрыт
  let mp = mixP({
    scale: SC.marcus, x: 3.0, z: 0.45, y: 0.43 * SC.marcus, ry: 28, tl: 6, hy: 12, hx: 4, alx: 52, ale: 108, arx: 52, are: 108, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4,
  });
  mp = { ...mp, tz: jitter(t, 8, 4) * 3, hz: Math.floor(t / 10) % 2 ? 3 : -3, tear: t > 60 ? 1 + (Math.floor(t / 8) % 3) : 0 };
  void L;
  return { actors: [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }], dust };
};

// =====================================================================================
// Камеры: везде одна и та же «операторская» высота, фон сдвинут так, что кофейня («VEGAN COFFEE») по центру,
// верх кадра всегда выше крыш -> небо видно во всех планах
// =====================================================================================
const camAt = (x: number, z: number, ty: number, drop = 0.9) => ({ x, y: ty - drop, z, tx: x, ty });
const CAMS = {
  c07: camAt(4.95, 6.6, 1.95),
  c08: camAt(3.0, 6.2, 1.95),
  c09a: camAt(7.2, 6.9, 2.05),
  c09b: camAt(7.1, 6.5, 2.0),
  c10: camAt(-0.2, 6.2, 2.0),
  c11: camAt(6.8, 6.0, 2.0),
  c12: camAt(6.2, 7.0, 2.0, 1.25),
};
/** x кофейни (VEGAN COFFEE) в мире = 0.2; фон сдвигаем так, чтобы она была в центре кадра */
const bgFor = (camX: number) => camX - 0.2;
const camShake = (t: number, amp: number, seed = 1) => ({ x: jitter(t, seed, 2) * amp, y: jitter(t, seed + 7, 2) * amp });

export const frameAt = (frame: number, sh: ShotT, tlCount: number, v: Voices): Frame => {
  const t = frame - sh.from;
  let actors: Actor[] = [];
  let cam: Cam = { ...CAMS.c07, shake: 0 };
  let bushShake = 0;
  let leaves = -1;
  let dust: Array<{ x: number; z: number; k: number }> = [];
  let sx = 0;
  let sy = 0;
  let bgx = bgFor(CAMS.c07.x);
  let bin: number | null = null;
  switch (sh.n) {
    case 7:
      actors = shot07(t, sh, v);
      cam = { ...CAMS.c07, shake: 0 };
      bgx = bgFor(CAMS.c07.x);
      bin = BIN.x;
      break;
    case 8:
      actors = shot08(t, sh, v);
      cam = { ...CAMS.c08, shake: 0 };
      bgx = bgFor(CAMS.c08.x);
      bin = BIN.x;
      if (t >= 14 && t < 22) {
        const s = camShake(t, 0.05 * (1 - (t - 14) / 8), 4);
        sx = s.x;
        sy = s.y;
      }
      break;
    case 9: {
      const r = shot09(t, sh, v);
      actors = r.actors;
      leaves = r.leaves;
      bgx = bgFor(CAMS.c09a.x);
      bin = BIN.x;
      const wx = t < 2 ? 5.0 : t < 4 ? 5.9 : t < 6 ? 6.7 : 7.2;
      cam = t < S09.jump ? { ...CAMS.c09a, x: wx, tx: wx, shake: 0 } : { ...CAMS.c09b, shake: 0 };
      if (t >= S09.jump && t < S09.jump + 4) cam = { ...CAMS.c09a, z: t < S09.jump + 2 ? 6.2 : 5.9, shake: 0 };
      bushShake = t >= S09.rustle && t < S09.jump ? 0.07 : 0;
      if (t >= S09.land && t < S09.land + 8) {
        const s = camShake(t, 0.07 * (1 - (t - S09.land) / 8), 5);
        sx = s.x;
        sy = s.y;
      }
      if (t >= S09.siren && t < sh.vFrom) {
        const s = camShake(t, 0.035, 9);
        sx = s.x;
        sy = s.y;
      }
      if (t >= S09.land && t < S09.land + 14) dust.push({ x: CH_LAND.x, z: CH_LAND.z + 0.3, k: t - S09.land });
      break;
    }
    case 10:
      actors = shot10(t, sh, v);
      cam = { ...CAMS.c10, shake: 0 };
      bgx = bgFor(CAMS.c10.x);
      break;
    case 11:
      actors = shot11(t, sh, v);
      cam = { ...CAMS.c11, shake: 0 };
      bgx = bgFor(CAMS.c11.x);
      break;
    default: {
      const r = shot12(t, sh, v);
      actors = r.actors;
      dust = r.dust;
      cam = { ...CAMS.c12, shake: 0 };
      bgx = bgFor(CAMS.c12.x);
      STEP_AT.forEach((s) => {
        if (t >= s + 6 && t < s + 16) {
          const k = camShake(t, 0.06 * (1 - (t - s - 6) / 10), 12);
          sx = k.x;
          sy = k.y;
        }
      });
    }
  }
  cam = { ...cam, x: cam.x + sx, y: cam.y + sy, tx: cam.tx + sx * 0.5, ty: cam.ty + sy * 0.5 };
  void hash;
  return { actors, cam, bgx, bin, bushShake, leaves, dust, tl: tlCount };
};
