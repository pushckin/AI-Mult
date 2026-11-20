// Анимация сцены 2: позы по планам 07-12 как функции кадра. Всё на двойках, жёсткие рывки.
import { PP, PPatch, mixP } from "./Person";
import { ShotT, S09, STEP_AT, mouthFromEnv, envAt } from "../data/scene2";
import { hold, jitter, lerp, clamp, hash } from "./util";

// ---------- масштаб и места ----------
export const SC = { greg: 1.45, tony: 1.5, marcus: 1.35, chloe: 1.3 };
export const BIN = { x: 5.0, z: 1.0 };
export const BUSH = { x: 8.7, z: 0.7 };
export const GREG_X = -2.0;

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
const TONY_PEEK = { x: BIN.x - 1.1, z: 0.2 };
const MARCUS_PEEK = { x: BIN.x + 1.15, z: 0.25 };
const shot07 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  // --- Тони ---
  const stand = { llx: 6, lrx: 6, llk: 6, lrk: 6 };
  const tonyBase: PPatch = {
    x: TONY_PEEK.x, z: TONY_PEEK.z, y: 0.3, tl: 12, llx: 70, lrx: 70, llk: 100, lrk: 100, alx: 6, ale: 25, arx: 6, are: 25, alz: 10, arz: 10,
    hy: -24, hx: -4, ry: 0, brow: 0.3,
  };
  const tk: K[] = [
    { t: 0 },
    { t: 6, hx: -16, hy: -26 }, { t: 10, hx: -4 }, { t: 14, hy: 22, hx: -16 }, { t: 18, hx: -4 }, { t: 22, hy: 0, hx: -20 }, { t: 26, hx: -6 },
    { t: 28, arx: 150, are: 100, alx: 6, brow: 0.6 }, { t: 32, arx: 162, are: 112, hx: 4, acc: 1 },
    { t: 36, arx: 70, are: 60, brow: 1, eyeL: 2, eyeR: 2 }, { t: 40, arx: 20, are: 30 }, { t: 44, y: 0.34, alx: 100, ale: 50 },
    { t: 76, y: 0.46, llx: 50, lrx: 50, llk: 70, lrk: 70, tl: 8, alx: 60, arx: 24, ale: 50, are: 30 },
    { t: 120, y: 0.645, ...stand, tl: 4, alx: 20, ale: 30, arx: 14, are: 30, hy: 12, hx: 2 },
    { t: 190, hy: 26, hx: 6 },
    { t: L - 20, hy: 34, hx: 8, brow: 1 },
  ];
  let tp = track(tonyBase, tk, t, 4);
  // стойка Тони: ноги прямые по ступеням, без дрожи; плечи вздрагивают при плаче
  const tony = mixP({ scale: SC.tony, eyeL: 0, eyeR: 0, alz: 14, arz: 14, llz: 4, lrz: 4, ...tp });
  let tpose = tony;
  if (t >= 36) tpose = { ...tpose, tear: 1 + (Math.floor((t - 36) / 8) % 3), tl: tpose.tl + (Math.floor(t / 6) % 2 ? 1.5 : -1) };
  if (t >= 44) tpose = { ...tpose, hy: tpose.hy + [0, 7, -7, 3][Math.floor(t / 10) % 4], eyeL: 2, eyeR: 2 };
  tpose = speak(tpose, sh, t, v.env[0]);

  // --- Маркус: трясётся с сумочкой ---
  const mBase: PPatch = {
    x: MARCUS_PEEK.x, z: MARCUS_PEEK.z, y: 0.42, tl: 6, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, hy: 25, ry: 0, mouth: 4, brow: 1,
    llx: 40, lrx: 40, llk: 60, lrk: 60,
  };
  const mk: K[] = [
    { t: 0 }, { t: 12, hy: -25 }, { t: 24, hy: 30 }, { t: 36, hy: -10 }, { t: 48, hy: -36, y: 0.46 },
    { t: 120, hy: -30, y: 0.5, llx: 20, lrx: 20, llk: 24, lrk: 24 }, { t: L - 60, hy: -38, y: 0.55, llx: 6, lrx: 6, llk: 6, lrk: 6, tl: 4 },
  ];
  let mp = mixP({ scale: SC.marcus, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, ...track(mBase, mk, t, 4) });
  mp = {
    ...mp,
    tz: jitter(t, 3, 2) * 4,
    tl: mp.tl + jitter(t, 5, 2) * 2,
    hz: jitter(t, 9, 2) * 4,
    mouth: Math.floor(t / 8) % 5 === 1 ? 1 : 4,
    tear: t > L - 90 ? 1 + (Math.floor(t / 8) % 3) : 0,
  };
  return [
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tpose },
  ];
};

// =====================================================================================
// ПЛАН 08: Маркус бросается Тони на шею
// =====================================================================================
const T08 = { x: 2.9, z: 0.35 };
const shot08 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  // Тони: стоит, плачет, принимает объятие
  const tBase: PPatch = {
    x: T08.x, z: T08.z, ry: -60, tl: 2, alx: 40, ale: 40, arx: 40, are: 40, hy: 50, hx: 6, acc: 1, brow: 1, eyeL: 2, eyeR: 2, mouth: 4,
  };
  const tk: K[] = [{ t: 0 }, { t: 14, alx: 40, arx: 40, ale: 40, are: 40 }, { t: 18, alx: 82, arx: 88, ale: 46, are: 40, hy: 50, tl: 0 }, { t: 30, alx: 88, arx: 92, ale: 50, are: 44 }];
  let tp = mixP({ scale: SC.tony, llz: 4, lrz: 4, alz: 14, arz: 14, ...track(tBase, tk, t, 2) });
  tp = { ...tp, tear: 1 + (Math.floor(t / 6) % 3), tl: tp.tl + (t > 18 ? (Math.floor(t / 4) % 2 ? 1.5 : -1.5) : 0), y: tp.y + (t > 18 && Math.floor(t / 4) % 2 ? 0.02 : 0), mouth: Math.floor(t / 10) % 3 === 1 ? 1 : 4 };

  // Маркус: подбегает (0-12), прыгает на шею (12), висит и всхлипывает
  const runKeys: K[] = [
    { t: 0, x: T08.x - 2.0, z: 0.6, ry: 70, y: 0.58, hy: -40, tl: 8 },
    { t: 12, x: T08.x - 1.3, z: 0.6, ry: 55, y: 0.58, hy: -40 },
    { t: 14, x: T08.x - 1.1, z: 0.62, ry: 65, y: 0.9, hy: -55, alx: 90, arx: 96, alz: 10, arz: 10, ale: 16, are: 16, llx: 40, lrx: 20, llk: 40, lrk: 10 },
    { t: 18, x: T08.x - 1.0, z: 0.62, ry: 65, y: 0.84, hy: -55, alx: 92, arx: 100, alz: 8, arz: 8, ale: 26, are: 24, llx: 10, lrx: 24, llk: 50, lrk: 30 },
    { t: 24, x: T08.x - 0.95, z: 0.62, ry: 65, y: 0.78, hy: -55, alx: 94, arx: 104, ale: 34, are: 30, llx: 6, lrx: 6, llk: 70, lrk: 60 },
  ];
  const run = t < 14;
  const base: PPatch = { scale: SC.marcus, alx: 40, ale: 100, arx: 40, are: 100, alz: 14, arz: 14, llx: 0, lrx: 0, mouth: 4, brow: 1, eyeL: 0, eyeR: 0 };
  let mp = mixP({ ...base, ...track({}, runKeys, t, 2) });
  if (run) {
    const ph = Math.floor(t / 2) % 2;
    mp = { ...mp, llx: ph ? 50 : -50, lrx: ph ? -50 : 50, llk: ph ? 0 : 60, lrk: ph ? 60 : 0, alx: ph ? -50 : 50, arx: ph ? 50 : -50, ale: 60, are: 60, y: mp.y + (ph ? 0.06 : 0), tl: 14 };
  } else {
    mp = { ...mp, tz: jitter(t, 4, 2) * 5, hz: jitter(t, 8, 2) * 5, hx: 6 + (Math.floor(t / 4) % 2 ? 4 : 0), tear: 1 + (Math.floor(t / 6) % 3), y: mp.y + (Math.floor(t / 4) % 2 ? 0.025 : 0) };
  }
  mp = speak({ ...mp, mouth: run ? 4 : Math.floor(t / 8) % 4 === 1 ? 1 : 4 }, sh, t, v.env[1], 3);
  if (t < sh.vFrom || t >= sh.vFrom + sh.vLen) mp = { ...mp, mouth: Math.floor(t / 8) % 4 === 1 ? 1 : 4 };
  void L;
  return [
    { kind: "tony", pose: tp },
    { kind: "marcus", pose: mp },
  ];
};

// =====================================================================================
// ПЛАН 09: Хлоя выпрыгивает из кустов
// =====================================================================================
const CH_LAND = { x: 6.7, z: 0.6 };
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
      x, y, z: lerp(0.6, CH_LAND.z, u), ry: -10, tl: -6, alx: 170, ale: 10, arx: 150, are: 30, alz: 22, arz: 22, llx: 30 - (k % 4) * 8, lrx: -20 + (k % 4) * 6, llz: 26, lrz: 26, llk: 40, lrk: 20, mouth: 2, eyeL: 1, eyeR: 1, hx: -10,
      brow: 1,
    });
  } else {
    const tt = t - S09.land;
    // приземление (присела), затем пафосная поза: ноги широко, подбородок вверх, мегафон у рта, плакат над головой
    const landing = tt < 4;
    const base: PPatch = {
      x: CH_LAND.x, z: CH_LAND.z, ry: -12, y: 0.56 - (landing ? 0.07 : 0), tl: -7, hx: -12, hy: 6, llz: 17, lrz: 17, llk: landing ? 30 : 0, lrk: landing ? 30 : 0, llx: landing ? 20 : 4, lrx: landing ? 20 : -2,
      alx: 176, ale: 4, alz: 12, arx: 82, are: 92, arz: 12, hp: 0, mouth: 5, eyeL: 0, eyeR: 2, brow: 0.6, hl: 0,
    };
    pose = CB("chloe", base);
    // лёгкое покачивание от пафоса
    pose = { ...pose, tl: pose.tl + (Math.floor(tt / 6) % 2 ? 1.5 : -1), hz: Math.floor(tt / 8) % 2 ? 3 : -3 };
    if (t >= S09.siren) pose = { ...pose, sir: 1 + (Math.floor((t - S09.siren) / 2) % 3), mouth: 0, eyeL: 3, eyeR: 3 };
    if (speaking(sh, t)) {
      const e = envAt(v.env[2], t - sh.vFrom);
      pose = speak({ ...pose, eyeL: 0, eyeR: 0, brow: 1, sir: e > 0.55 ? 1 + (Math.floor(t / 2) % 3) : 0 }, sh, t, v.env[2], 4);
      // жесты: плакат качается вверх-вниз на фразах
      pose = { ...pose, alx: 176 - (Math.floor(t / 14) % 2 ? 14 : 0), hy: pose.hy + [0, 8, -4, 6][Math.floor(t / 12) % 4] };
    } else if (t >= sh.vFrom + sh.vLen) {
      pose = { ...pose, sir: 0, mouth: 5, eyeL: 0, eyeR: 0 };
    }
    // мегафон не должен «стрелять» в камеру: поворот предмета
    pose = { ...pose, hp: 0 };
  }
  return { actors: [{ kind: "chloe", pose }], leaves: t - S09.jump };
};

// =====================================================================================
// ПЛАН 10: реакция, Грег и Тони
// =====================================================================================
const shot10 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  // Грег: отвращение. Смотрит направо (на Хлою), левая рука в жесте, кофе в правой.
  const gBase: PPatch = {
    scale: SC.greg, x: GREG_X, z: 0.55, y: 0.43 * SC.greg, ry: 38, hy: 18, hx: 4, tl: 2, eyeL: 2, eyeR: 2, brow: -1, mouth: 3, arx: 30, are: 78, alx: 12, alz: 10, llz: 4, lrz: 4,
  };
  const gk: K[] = [{ t: 0 }, { t: 40, hy: 14 }, { t: 90, hy: 22, hx: 2 }, { t: L - 30, hy: 12, hx: 6, tl: 4 }];
  let gp = mixP({ ...gBase, ...track({}, gk, t, 4) });
  if (speaking(sh, t)) {
    const arm = [[16, 14], [58, 30], [24, 24], [74, 36], [30, 20]][Math.floor((t - sh.vFrom) / 14) % 5];
    gp = speak({ ...gp, alx: arm[0], alz: arm[1], tz: Math.floor(t / 6) % 2 ? 2 : -2 }, sh, t, v.env[3], 3);
  }
  // тик
  if (Math.floor(t / 2) % 13 === 6) gp = { ...gp, eyeL: 3, eyeR: 2 };
  // чуть поднимает чашку на «ебанутая»
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
  const tBase: PPatch = {
    scale: SC.tony, x: 1.75, z: 0.4, y: 0.43 * SC.tony, ry: -12, tl: 0, hy: 8, hx: 0, alx: 8, ale: 20, arx: 8, are: 20, alz: 16, arz: 16, acc: 1, eyeL: 2, eyeR: 2, brow: -0.6, mouth: 0, llz: 5, lrz: 5,
  };
  let tp = mixP({ ...tBase, lx, ly, hz: rollHead });
  if (t >= 44) tp = { ...tp, hx: -10 + (Math.floor(t / 10) % 2 ? 2 : 0), tl: -5, mouth: t < 60 ? 1 : 0 };
  if (t > 40 && Math.floor(t / 2) % 9 === 3) tp = { ...tp, eyeL: 3, eyeR: 3 };
  // Маркус: жмётся за спиной Тони, всхлипывает
  let mp = mixP({
    scale: SC.marcus, x: 2.95, z: 0.3, y: 0.43 * SC.marcus, ry: -20, tl: 6, hy: -20, hx: 4, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, brow: 1, mouth: Math.floor(t / 10) % 4 === 1 ? 1 : 4, llz: 4, lrz: 4,
  });
  mp = { ...mp, tz: jitter(t, 6, 2) * 3, hz: jitter(t, 2, 2) * 3, tear: 1 + (Math.floor(t / 7) % 3) };
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
  // фазы реплики (по долям длины): 0-.24 тычет в Грега, .24-.52 плакат, .52-.78 снова Грега, .78-1 широкий жест
  const base: PPatch = {
    x: 6.9, z: 0.6, ry: -34, tl: -3, hx: -4, hy: -10, llz: 12, lrz: 12, alx: 12, ale: 8, alz: 30, arx: 0, are: 0, arz: 10, mouth: 4, eyeL: 2, eyeR: 2, brow: -0.8, acc: 1, hr: 0,
  };
  // опускает мегафон (0-8): рука с мегафоном вниз, затем он повисает на шнурке
  let pose: PP;
  if (t < 10) {
    const kk = hold(t, 2);
    pose = CB("chloe", { ...base, acc: kk < 6 ? 0 : 1, arx: lerp(82, 6, clamp(kk / 8)), are: lerp(92, 8, clamp(kk / 8)), alx: 150, ale: 20, hx: -10, mouth: 4 });
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
      alx = 125; ale = 6; // поднимает плакат
      arx = 30; are = 100; // правая рука на груди
    }
    pose = CB("chloe", { ...base, arx, are, arz: abd, hr, alx, ale, hy: -10 + (jab ? 3 : 0), hx: -2 });
  }
  pose = { ...pose, tz: jitter(t, 7, 2) * 1.5 };
  if (speaking(sh, t)) pose = speak({ ...pose, eyeL: 2, eyeR: 2, brow: -1 }, sh, t, v.env[4], 4);
  else if (t >= sh.vFrom + sh.vLen) pose = { ...pose, mouth: 4, hx: 6 };
  return [{ kind: "chloe", pose }];
};

// =====================================================================================
// ПЛАН 12: Тони нависает (низкий ракурс)
// =====================================================================================
export const T12 = { x0: 4.7, z: 1.0 };
const shot12 = (t: number, sh: ShotT, v: Voices): { actors: Actor[]; dust: Array<{ x: number; z: number; k: number }> } => {
  const L = sh.len;
  // шаги к Хлое: x растёт ступенями, на каждый шаг ноги качаются
  let x = T12.x0;
  let stepPh = -1;
  const dust: Array<{ x: number; z: number; k: number }> = [];
  STEP_AT.forEach((s, i) => {
    const u = clamp((hold(t, 2) - s) / 10);
    x += 0.5 * u;
    if (t >= s && t < s + 10) stepPh = i;
    if (t >= s + 8 && t < s + 22) dust.push({ x: T12.x0 + 0.5 * (i + 1) - 0.25, z: T12.z + 0.1, k: t - (s + 8) });
  });
  const walking = stepPh >= 0;
  const flex = (t >= 18 && t < 74) || (t >= 150 && t < 200);
  const strain = flex ? jitter(t, 3, 2) : 0;
  const tBase: PPatch = {
    scale: SC.tony, x, z: T12.z, y: 0.43 * SC.tony, ry: 52, tl: 6, hy: 22, hx: 8, alx: 20, ale: 30, arx: 20, are: 30, alz: 14, arz: 14, brow: -1, eyeL: 2, eyeR: 2, mouth: 0,
    llz: 8, lrz: 8, acc: 1,
  };
  let tp = mixP(tBase);
  if (flex) {
    // двойной бицепс: локти в стороны, кулаки у головы
    tp = { ...tp, alx: 72 + strain * 3, arx: 72 - strain * 3, alz: 48 + strain * 4, arz: 48 - strain * 3, ale: 112, are: 112, hl: 2, hr: 2, tl: 2, hx: 12, hy: 14, y: tp.y + (Math.floor(t / 2) % 2 ? 0.015 : 0) };
  } else {
    // указывает пальцем на Хлою, тычки
    const jab = Math.floor(t / 6) % 2;
    tp = { ...tp, arx: 88 + (jab ? 8 : 0), are: 6, arz: 14, hr: 1, alx: 30, ale: 100, tl: 8 };
  }
  if (walking) {
    const ph = Math.floor((t - STEP_AT[stepPh]) / 4) % 2;
    tp = { ...tp, llx: ph ? 34 : -22, lrx: ph ? -22 : 34, llk: ph ? 0 : 30, lrk: ph ? 30 : 0, y: tp.y + (ph ? 0.05 : 0), tl: tp.tl + 4 };
  }
  tp = speak(tp, sh, t, v.env[5], 4);
  if (!speaking(sh, t) && t >= sh.vFrom + sh.vLen) tp = { ...tp, mouth: 0, brow: -1 };
  tp = { ...tp, tz: speaking(sh, t) ? jitter(t, 5, 4) * 2 : 0 };

  // Хлоя: вжимает голову в плечи
  const cow = t >= 8;
  let cp = CB("chloe", {
    x: 7.45, z: 0.2, ry: -62, tl: cow ? 14 : 0, hx: cow ? 16 : -4, hy: cow ? -6 : 0, hdy: cow ? -0.22 : 0, y: 0.43 * SC.chloe - (cow ? 0.05 : 0), llx: cow ? 20 : 0, lrx: cow ? 20 : 0, llk: cow ? 26 : 0, lrk: cow ? 26 : 0,
    llz: 12, lrz: 12, alx: cow ? 78 : 20, ale: cow ? 76 : 10, alz: 10, arx: cow ? 60 : 10, are: cow ? 96 : 10, acc: 1, brow: 1, eyeL: cow ? 3 : 1, eyeR: cow ? 3 : 1, mouth: cow ? 4 : 1,
  });
  if (cow) cp = { ...cp, tz: jitter(t, 11, 2) * 3, hz: jitter(t, 12, 2) * 4, tear: 1 + (Math.floor(t / 9) % 3), mouth: Math.floor(t / 8) % 3 === 0 ? 1 : 4, eyeL: Math.floor(t / 12) % 5 === 2 ? 1 : 3, eyeR: Math.floor(t / 12) % 5 === 2 ? 1 : 3 };

  // Маркус: справа/слева за Тони, прижимает сумочку и кивает
  let mp = mixP({
    scale: SC.marcus, x: 3.55, z: 0.45, y: 0.43 * SC.marcus, ry: 25, tl: 6, hy: 22, hx: 4, alx: 52, ale: 108, arx: 52, are: 108, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4,
  });
  mp = { ...mp, tz: jitter(t, 8, 2) * 2.5, hz: Math.floor(t / 10) % 2 ? 3 : -3, tear: t > 60 ? 1 + (Math.floor(t / 8) % 3) : 0 };
  if (t > L - 80) mp = { ...mp, hx: 8, mouth: 1 };
  return { actors: [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }], dust };
};

// =====================================================================================
// Камеры
// =====================================================================================
const CAMS = {
  c07: { x: 5.0, y: 1.8, z: 6.0, tx: 5.0, ty: 1.8 },
  c08: { x: 3.0, y: 1.8, z: 5.8, tx: 3.0, ty: 1.8 },
  c09a: { x: 7.2, y: 1.9, z: 6.0, tx: 7.2, ty: 1.9 },
  c09b: { x: 7.0, y: 1.7, z: 5.4, tx: 7.0, ty: 1.7 },
  c10: { x: 0.3, y: 1.8, z: 6.2, tx: 0.3, ty: 1.8 },
  c11: { x: 6.8, y: 1.9, z: 5.2, tx: 6.8, ty: 1.9 },
  c12: { x: 6.2, y: 0.5, z: 6.4, tx: 6.2, ty: 2.1 },
};
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
  switch (sh.n) {
    case 7:
      actors = shot07(t, sh, v);
      cam = { ...CAMS.c07, shake: 0 };
      break;
    case 8:
      actors = shot08(t, sh, v);
      cam = { ...CAMS.c08, shake: 0 };
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
      // whip pan: 3 ступени, затем резкий наезд на прыжке
      const wx = t < 2 ? 5.0 : t < 4 ? 5.9 : t < 6 ? 6.7 : 7.2;
      cam = t < S09.jump ? { ...CAMS.c09a, x: wx, tx: wx, shake: 0 } : { ...CAMS.c09b, shake: 0 };
      if (t >= S09.jump && t < S09.jump + 4) cam = { ...CAMS.c09a, z: t < S09.jump + 2 ? 5.6 : 5.2, shake: 0 };
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
      break;
    case 11:
      actors = shot11(t, sh, v);
      cam = { ...CAMS.c11, shake: 0 };
      break;
    default: {
      const r = shot12(t, sh, v);
      actors = r.actors;
      dust = r.dust;
      cam = { ...CAMS.c12, shake: 0 };
      STEP_AT.forEach((s) => {
        if (t >= s + 8 && t < s + 18) {
          const k = camShake(t, 0.06 * (1 - (t - s - 8) / 10), 12);
          sx = k.x;
          sy = k.y;
        }
      });
    }
  }
  cam = { ...cam, x: cam.x + sx, y: cam.y + sy, tx: cam.tx + sx * 0.5, ty: cam.ty + sy * 0.5 };
  void hash;
  return { actors, cam, bushShake, leaves, dust, tl: tlCount };
};
