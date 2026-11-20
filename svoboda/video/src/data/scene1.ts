// СЦЕНА 1 «Великое исчезновение» (0:00-0:30): тайминги и аудио. 24 fps, 720 кадров. v5: настоящая 3D-сцена (src/three/*).
import type { AudioCue } from "../engine/audio";

export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 720;
export const sec = (s: number) => Math.round(s * FPS);

export const SHOTS = [
  { n: 1, from: 0, to: 168, name: "Хаос: байк, ракеты, взрывы; Грег бредёт по тротуару; суперкар на тротуар" },
  { n: 2, from: 168, to: 178, name: "Удар (хит-стоп, звезда), тот же масштаб" },
  { n: 3, from: 178, to: 296, name: "Слоу-мо: полёт Грега (жёсткие позы, дуга)" },
  { n: 4, from: 296, to: 456, name: "Шлёп, лежит; билборд 23:59 -> 00:00" },
  { n: 5, from: 456, to: 480, name: "Жёсткий стык: всё исчезло, пустая холодная улица, тишина" },
  { n: 6, from: 480, to: 720, name: "Грег встаёт, плечо, зуб дугой, небо, реплика" },
] as const;

// ---------- Ключевые кадры ----------
export const HIT_FRAME = 168;
export const FLIGHT_FROM = 174;
export const LAND_FRAME = 296;
export const VANISH_FRAME = 456;
export const RISE_FROM = 480;
export const SHOULDER_FRAME = 552;
export const HEADJERK_FRAME = 558;
export const SPIT_FRAME = 566;
export const BILLBOARD_FLIP = 418;
export const BILLBOARD_GLITCH = 414;
/** Реплика Грега (voice_greg_01.wav = 3.35 с = 80 кадров) */
export const GREG_LINE = { from: 630, to: 710 };

/** Огибающая голоса voice_greg_01.wav по кадрам (0..1): рот открывается по слогам */
export const VOICE_ENV = [
  0.18, 0.21, 0.22, 0.26, 0.36, 0.3, 0.19, 0.01, 0.02, 0.01, 0.01, 0.36, 0.4, 0.45, 0.26, 0.34, 0.42, 0.89, 0.52, 0.17, 0.57, 0.48, 0.21, 0.14,
  0.11, 0.06, 0.01, 0.07, 0.15, 0.16, 0.12, 0.09, 0.07, 0.06, 0.04, 0.04, 0.03, 0.02, 0.01, 0.0, 0.0, 0.0, 0.01, 0.05, 0.13, 0.15, 0.15, 0.12, 0.09,
  0.12, 0.07, 0.09, 0.17, 0.16, 0.15, 0.23, 0.58, 0.96, 0.77, 0.19, 0.46, 0.16, 0.37, 0.9, 0.75, 0.68, 0.31, 0.35, 0.18, 0.0, 0.18, 0.34, 0.4, 0.51,
  0.22, 0.22, 0.31, 0.58, 1.0, 0.9,
];

// ---------- Аудио ----------
export const TOOTH_FRAME = SPIT_FRAME + 22; // зуб приземляется
export const AUDIO_CUES: AudioCue[] = [
  // Приоритет файлов: wav, затем mp3 в public/audio/. Синтез-дубли лежат в public/audio/synth/ (не подхватываются).
  // Музыка: ровно 19.0 с (456 кадров), играет до исчезновения, дальше тишина
  { base: "music_s1", from: 0, to: VANISH_FRAME, volume: 0.35, note: "тревожный фон до исчезновения" },
  // Хаос 0-168
  { base: "sfx_sirens", from: 0, to: VANISH_FRAME, volume: 0.4, loop: true, note: "сирены до самого исчезновения" },
  { base: "sfx_explosions", from: 0, to: HIT_FRAME, volume: 0.5 },
  { base: "sfx_rockets", from: 10, to: 107, volume: 0.55 },
  { base: "sfx_rockets", from: 80, to: HIT_FRAME, volume: 0.55 },
  { base: "sfx_supercar", from: 20, to: HIT_FRAME, volume: 0.7, note: "суперкар обрывается ударом" },
  // Удар
  { base: "sfx_hit_crunch", from: HIT_FRAME - 1, to: HIT_FRAME + 48, volume: 0.9 },
  { base: "sfx_bass_drop", from: HIT_FRAME, to: HIT_FRAME + 73, volume: 0.8 },
  // Слоу-мо
  { base: "sfx_slowmo_hum", from: FLIGHT_FROM, to: LAND_FRAME + 4, volume: 0.5 },
  // Шлёп
  { base: "sfx_body_thud", from: LAND_FRAME, to: LAND_FRAME + 36, volume: 0.9 },
  // Билборд 23:59 -> 00:00
  { base: "sfx_billboard_click", from: BILLBOARD_FLIP - 1, to: BILLBOARD_FLIP + 48, volume: 0.7 },
  // Исчезновение: всё хаотическое обрывается на VANISH_FRAME, остаётся только unplug/glitch
  { base: "sfx_unplug_glitch", from: VANISH_FRAME, to: VANISH_FRAME + 60, volume: 0.85 },
  // Пустая улица: сверчки и капли до конца
  { base: "sfx_crickets", from: 486, to: DURATION, volume: 0.5, note: "12 с > 234 кадров, без лупа" },
  { base: "sfx_water_drip", from: 500, to: DURATION, volume: 0.55, loop: true },
  // Плечо, плевок, зуб
  { base: "sfx_shoulder_pop", from: SHOULDER_FRAME - 1, to: SHOULDER_FRAME + 36, volume: 0.8 },
  { base: "sfx_spit", from: SPIT_FRAME - 2, to: SPIT_FRAME + 25, volume: 0.75 },
  { base: "sfx_tooth_clink", from: TOOTH_FRAME, to: TOOTH_FRAME + 25, volume: 0.7 },
  // Реплика Грега 3.35 с
  { base: "voice_greg_01", from: GREG_LINE.from, to: DURATION, volume: 1, note: "реплика Грега, 3.35 с" },
];
