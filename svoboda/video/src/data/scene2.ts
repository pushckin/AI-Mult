// СЦЕНА 2 «Освобождение» (кадры раскадровки 07-12). Длины планов вычисляются из длительностей реплик (wav в public/audio).
import type { AudioCue } from "../engine/audio";
import type { VoiceInfo } from "../engine/wav";

export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const sec = (s: number) => Math.round(s * FPS);
const even = (n: number) => Math.round(n / 2) * 2;

/** Реплики по порядку (voice_s2_NN_<имя>.wav) */
export const VOICE_FILES = ["voice_s2_01_tony", "voice_s2_02_markus", "voice_s2_03_chloe_mega", "voice_s2_04_greg", "voice_s2_05_chloe", "voice_s2_06_tony"] as const;
export type Who = "tony" | "markus" | "chloe" | "greg";
export const SPEAKERS: Who[] = ["tony", "markus", "chloe", "greg", "chloe", "tony"];

interface ShotDef {
  n: number; // номер кадра раскадровки
  name: string;
  lead: number; // кадров действия до реплики
  tail: number; // пауза после реплики
  defSec: number; // сценарная длительность, пока файла нет
}
export const SHOT_DEFS: ShotDef[] = [
  { n: 7, name: "Тони и Маркус выглядывают из-за горящей урны, принюхивается, снимает очки, слёзы", lead: 44, tail: 10, defSec: 12 },
  { n: 8, name: "Крупно: Маркус бросается Тони на шею, всхлипы", lead: 12, tail: 10, defSec: 7 },
  { n: 9, name: "Жёсткая склейка на кусты, шорох, Хлоя выпрыгивает с разворотом, сирена мегафона", lead: 72, tail: 10, defSec: 8 },
  { n: 10, name: "Реакция: Грег с отвращением, Тони закатывает глаза", lead: 10, tail: 16, defSec: 7 },
  { n: 11, name: "Хлоя обиженно опускает мегафон, тычет в Грега, жест на Тони и Маркуса", lead: 10, tail: 12, defSec: 5 },
  { n: 12, name: "Низкий ракурс: Тони делает шаг к Хлое, бицепсы; Хлоя вжимает голову", lead: 10, tail: 20, defSec: 6 },
];

export interface ShotT {
  i: number;
  n: number;
  from: number;
  len: number;
  vFrom: number; // кадр начала реплики внутри плана
  vLen: number; // длина реплики, кадров
}
export interface Timeline {
  shots: ShotT[];
  total: number;
}
/** durs: длительности реплик в секундах (null = файла нет, берём сценарную) */
export const buildTimeline = (durs: Array<number | null>): Timeline => {
  let from = 0;
  const shots = SHOT_DEFS.map((d, i) => {
    const vLen = durs[i] != null ? Math.ceil(durs[i]! * FPS) : Math.max(24, sec(d.defSec) - d.lead - d.tail);
    const len = even(d.lead + vLen + d.tail);
    const s: ShotT = { i, n: d.n, from, len, vFrom: d.lead, vLen };
    from += len;
    return s;
  });
  return { shots, total: from };
};
export const DEFAULT_TIMELINE = buildTimeline([null, null, null, null, null, null]);

export const shotAt = (tl: Timeline, frame: number): ShotT => {
  for (const s of tl.shots) if (frame < s.from + s.len) return s;
  return tl.shots[tl.shots.length - 1];
};

/** Паузы реплики: серии >= 5 кадров с огибающей < 0.14 (рот в паузах закрыт, внутри слов - открыт всегда) */
const pauseCache = new WeakMap<number[], boolean[]>();
const pausesOf = (env: number[]): boolean[] => {
  let m = pauseCache.get(env);
  if (m) return m;
  m = env.map(() => false);
  let run = 0;
  for (let i = 0; i <= env.length; i++) {
    if (i < env.length && env[i] < 0.14) run++;
    else {
      if (run >= 5) for (let j = i - run; j < i; j++) m[j] = true;
      run = 0;
    }
  }
  pauseCache.set(env, m);
  return m;
};
/** 0 закрыт (пауза/вне реплики), 1 «о» (тихий слог), 2 «а» (громкий); меняется на двойках */
export const mouthFromEnv = (env: number[] | undefined, k: number, vLen: number): number => {
  if (k < 0 || k >= vLen) return 0;
  const f = Math.floor(k / 2) * 2;
  if (!env) return (f >> 2) % 3 === 0 ? 1 : 2;
  const pm = pausesOf(env);
  if (pm[f] && pm[Math.min(env.length - 1, f + 1)]) return 0;
  const e = Math.max(env[f] ?? 0, env[f + 1] ?? 0);
  return e > 0.4 ? 2 : 1;
};
/** Идёт ли звук (не пауза) в кадре k реплики */
export const voicedAt = (env: number[] | undefined, k: number, vLen: number): boolean => mouthFromEnv(env, k, vLen) > 0;
export const envAt = (env: number[] | undefined, k: number): number => (env ? env[Math.floor(k / 2) * 2] ?? 0 : 0.4);

// ---------- ключевые моменты внутри планов (кадры от начала плана) ----------
export const S09 = { rustle: 2, crouch: 8, jump: 14, land: 28, siren: 32 };
export const S08 = { run: 0, leap: 12 };

// ---------- аудио ----------
export const buildCues = (tl: Timeline): AudioCue[] => {
  const [a, b, c, d, e, f] = tl.shots;
  const cues: AudioCue[] = [];
  // фон: ночной город всю сцену, треск огня пока урна в кадре (07-09 и сзади в 12)
  cues.push({ base: "sfx_s2_city_night_ambience", from: 0, to: tl.total, volume: 0.28, loop: true });
  cues.push({ base: "sfx_s2_fire_crackle", from: 0, to: b.from, volume: 0.55, loop: true, note: "07: треск огня в урне" });
  cues.push({ base: "sfx_s2_fire_crackle", from: b.from, to: tl.total, volume: 0.16, loop: true, note: "огонь дальше тише" });
  // 07: тут же голос Тони
  cues.push({ base: VOICE_FILES[0], from: a.from + a.vFrom, volume: 0.95 });
  // 08: всхлипы + шелест объятия
  cues.push({ base: "sfx_s2_hug_rustle", from: b.from + 14, to: b.from + 40, volume: 0.6 });
  cues.push({ base: "sfx_s2_sobs", from: b.from + 6, to: b.from + 6 + 72, volume: 0.45 });
  cues.push({ base: VOICE_FILES[1], from: b.from + b.vFrom, volume: 0.95 });
  // 09: кусты, фидбэк, сирена
  cues.push({ base: "sfx_s2_megaphone_click", from: c.from + 3, to: c.from + 14, volume: 0.6, note: "09: щелчок мегафона в кустах" });
  cues.push({ base: "sfx_s2_bush_rustle", from: c.from + S09.rustle, to: c.from + S09.rustle + 34, volume: 0.7 });
  cues.push({ base: "sfx_s2_megaphone_feedback", from: c.from + S09.land + 2, to: c.from + S09.land + 38, volume: 0.45 });
  cues.push({ base: "sfx_s2_megaphone_siren", from: c.from + S09.siren, to: c.from + S09.siren + 49, volume: 0.5 });
  cues.push({ base: VOICE_FILES[2], from: c.from + c.vFrom, volume: 0.95 });
  // 10: Грег
  cues.push({ base: VOICE_FILES[3], from: d.from + d.vFrom, volume: 0.95 });
  // 11: щелчок мегафона, затем Хлоя
  cues.push({ base: "sfx_s2_megaphone_click", from: e.from + 2, to: e.from + 22, volume: 0.7 });
  cues.push({ base: VOICE_FILES[4], from: e.from + e.vFrom, volume: 0.95 });
  // 12: тяжёлые шаги Тони (4 шага) и голос
  STEP_AT.forEach((s) => cues.push({ base: "sfx_s2_heavy_steps", from: f.from + s - 2, to: f.from + s + 22, volume: 0.6 }));
  cues.push({ base: VOICE_FILES[5], from: f.from + f.vFrom, volume: 0.95 });
  return cues;
};
/** Шаги Тони в плане 12 (кадры от начала плана): 3 шага в общем плане, один в финале */
export const STEP_AT = [14, 40, 66, 300, 322, 344];
