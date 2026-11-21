// СЦЕНА 2 «Освобождение» (кадры раскадровки 07-12). Длины планов вычисляются из длительностей реплик (wav в public/audio).
import type { AudioCue } from "../engine/audio";
import type { VoiceInfo } from "../engine/wav";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** секунды -> кадры (30 fps) */
export const sec = (s: number) => Math.round(s * FPS);
/** кадров на «двойку»: позы обновляются раз в 2 кадра = 15 поз/с (в холдах/слоу-мо - раз в 4) */
export const STEP = 2;
const even = (n: number) => Math.round(n / 2) * 2;

/** Реплики по порядку (voice_s2_NN_<имя>.wav) */
export const VOICE_FILES = ["voice_s2_01_tony", "voice_s2_02_markus", "voice_s2_03_chloe_mega", "voice_s2_04_greg", "voice_s2_05_chloe", "voice_s2_06_tony"] as const;
export type Who = "tony" | "markus" | "chloe" | "greg";
export const SPEAKERS: Who[] = ["tony", "markus", "chloe", "greg", "chloe", "tony"];

interface ShotDef {
  n: number; // номер кадра раскадровки
  name: string;
  lead: number; // секунд действия до реплики
  tail: number; // секунд паузы после реплики
  defSec: number; // сценарная длительность, пока файла нет
}
export const SHOT_DEFS: ShotDef[] = [
  { n: 7, name: "Тони и Маркус выглядывают из-за горящей урны, принюхивается, снимает очки, слёзы", lead: 1.83, tail: 0.42, defSec: 12 },
  { n: 8, name: "Крупно: Маркус бросается Тони на шею, всхлипы", lead: 0.5, tail: 0.42, defSec: 7 },
  { n: 9, name: "Жёсткая склейка на кусты, шорох, Хлоя выпрыгивает с разворотом, сирена мегафона", lead: 3.0, tail: 0.42, defSec: 8 },
  { n: 10, name: "Реакция: Грег с отвращением, Тони и Маркус переглядываются", lead: 0.42, tail: 0.67, defSec: 7 },
  { n: 11, name: "Хлоя обиженно опускает мегафон, тычет в Грега, жест на Тони и Маркуса", lead: 0.42, tail: 0.5, defSec: 5 },
  { n: 12, name: "Финал: Тони давит на Хлою (общий / Хлоя крупно / Тони снизу / общий вдвоём)", lead: 0.42, tail: 1.3, defSec: 6 },
];

export interface ShotT {
  i: number;
  n: number;
  from: number; // кадр начала плана (30 fps)
  len: number; // длина плана, кадров
  vFrom: number; // кадр начала реплики внутри плана
  vLen: number; // длина реплики, кадров
}
export interface Timeline {
  shots: ShotT[];
  total: number;
}
/** durs: длительности реплик в секундах (null = файла нет, берём сценарную). Все длины - из wav, в кадрах 30 fps, чётные. */
export const buildTimeline = (durs: Array<number | null>): Timeline => {
  let from = 0;
  const shots = SHOT_DEFS.map((d, i) => {
    const vFrom = even(sec(d.lead));
    const vLen = durs[i] != null ? Math.ceil(durs[i]! * FPS) : Math.max(FPS, sec(d.defSec) - vFrom - sec(d.tail));
    const len = even(vFrom + vLen + sec(d.tail));
    const s: ShotT = { i, n: d.n, from, len, vFrom, vLen };
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

/**
 * Рот по огибающей wav (30 кадров/с, обновление на двойках = 15 раз/с):
 * 0 закрыт (пауза, провал между слогами, вне реплики), 1 «о» (тихий слог), 2 «а» (громкий слог).
 * Берём максимум огибающей на паре кадров: на слог - открыт, в паузе и на провале - закрыт.
 */
export const MOUTH_CLOSED = 0.2;
export const MOUTH_WIDE = 0.52;
export const mouthFromEnv = (env: number[] | undefined, k: number, vLen: number): number => {
  if (k < 0 || k >= vLen) return 0;
  const f = Math.floor(k / STEP) * STEP;
  if (!env) return (f >> 2) % 3 === 0 ? 1 : 2;
  const e = Math.max(env[f] ?? 0, env[f + 1] ?? 0);
  return e < MOUTH_CLOSED ? 0 : e < MOUTH_WIDE ? 1 : 2;
};
/** Идёт ли звук (не пауза) в кадре k реплики */
export const voicedAt = (env: number[] | undefined, k: number, vLen: number): boolean => mouthFromEnv(env, k, vLen) > 0;
export const envAt = (env: number[] | undefined, k: number): number => (env ? env[Math.floor(k / STEP) * STEP] ?? 0 : 0.4);

// ---------- ключевые моменты внутри планов (СЕКУНДЫ от начала плана) ----------
export const S09 = { rustle: 0.08, crouch: 0.33, jump: 0.58, land: 1.17, siren: 1.33 };
export const S08 = { run: 0, leap: 0.5 };
/** Финал (план 12), секунды от начала плана: границы под-планов (жёсткие склейки) */
export const S12 = { a: 0, b: 4.2, c: 7.6, d: 11.6 };
/** Шаги Тони в плане 12 (секунды): три в общем плане «a», три в финале «d» */
export const STEP_AT = [0.55, 1.65, 2.75, 12.2, 13.0, 13.8];

// ---------- аудио (всё в секундах, переводится в кадры один раз) ----------
export const buildCues = (tl: Timeline): AudioCue[] => {
  const [a, b, c, d, e, f] = tl.shots;
  const cues: AudioCue[] = [];
  const at = (s: ShotT, t: number) => s.from + sec(t);
  cues.push({ base: "sfx_s2_city_night_ambience", from: 0, to: tl.total, volume: 0.28, loop: true });
  cues.push({ base: "sfx_s2_fire_crackle", from: 0, to: b.from, volume: 0.55, loop: true, note: "07: треск огня в урне" });
  cues.push({ base: "sfx_s2_fire_crackle", from: b.from, to: tl.total, volume: 0.16, loop: true, note: "огонь дальше тише" });
  // 07: голос Тони
  cues.push({ base: VOICE_FILES[0], from: a.from + a.vFrom, volume: 0.95 });
  // 08: шелест объятия + всхлипы + голос Маркуса
  cues.push({ base: "sfx_s2_hug_rustle", from: at(b, 0.58), to: at(b, 1.67), volume: 0.6 });
  cues.push({ base: "sfx_s2_sobs", from: at(b, 0.25), to: at(b, 3.25), volume: 0.45 });
  cues.push({ base: VOICE_FILES[1], from: b.from + b.vFrom, volume: 0.95 });
  // 09: кусты, щелчок мегафона, фидбэк, сирена
  cues.push({ base: "sfx_s2_megaphone_click", from: at(c, 0.125), to: at(c, 0.58), volume: 0.6, note: "09: щелчок мегафона в кустах" });
  cues.push({ base: "sfx_s2_bush_rustle", from: at(c, S09.rustle), to: at(c, S09.rustle + 1.42), volume: 0.7 });
  cues.push({ base: "sfx_s2_megaphone_feedback", from: at(c, S09.land + 0.08), to: at(c, S09.land + 1.6), volume: 0.45 });
  cues.push({ base: "sfx_s2_megaphone_siren", from: at(c, S09.siren), to: at(c, S09.siren + 2.04), volume: 0.5 });
  cues.push({ base: VOICE_FILES[2], from: c.from + c.vFrom, volume: 0.95 });
  // 10: Грег
  cues.push({ base: VOICE_FILES[3], from: d.from + d.vFrom, volume: 0.95 });
  // 11: щелчок мегафона, затем Хлоя
  cues.push({ base: "sfx_s2_megaphone_click", from: at(e, 0.08), to: at(e, 0.92), volume: 0.7 });
  cues.push({ base: VOICE_FILES[4], from: e.from + e.vFrom, volume: 0.95 });
  // 12: тяжёлые шаги Тони и голос
  STEP_AT.forEach((s) => cues.push({ base: "sfx_s2_heavy_steps", from: at(f, s - 0.08), to: at(f, s + 0.92), volume: 0.6 }));
  cues.push({ base: VOICE_FILES[5], from: f.from + f.vFrom, volume: 0.95 });
  return cues;
};
