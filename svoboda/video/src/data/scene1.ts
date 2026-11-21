// СЦЕНА 1 «Великое исчезновение» (0:00-0:30): тайминги и аудио. v6: 60 fps, 1800 кадров (30.0 с), настоящая 3D-сцена (src/three/*).
// Все события ниже заданы в «кадрах24» (исходная раскадровка 24 fps): секунды = кадр24 / 24. Анимация работает на непрерывном времени f24 = frame*24/FPS.
import type { AudioCue } from "../engine/audio";

export const FPS = 60;
export const SRC_FPS = 24; // раскадровка/тайминги заданы в кадрах 24 fps
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_SEC = 30;
export const DURATION = DURATION_SEC * FPS; // 1800
/** кадр24 -> секунды */
export const t24 = (f24: number) => f24 / SRC_FPS;
/** секунды -> кадр композиции (60 fps) */
export const sec = (s: number) => Math.round(s * FPS);
/** кадр24 -> кадр композиции (60 fps) */
export const fr = (f24: number) => sec(t24(f24));
/** кадр композиции (60 fps) -> непрерывный кадр24 (float); вся анимация считается от него */
export const toF24 = (frame: number) => (frame * SRC_FPS) / FPS;
export const END24 = DURATION_SEC * SRC_FPS; // 720

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
// Cue заданы в кадрах24 (секунды = /24), в кадры композиции (60 fps) переводятся через fr(). null/undefined `to` = до конца сцены.
export const TOOTH_FRAME = 588; // SPIT_FRAME + 22: зуб приземляется
const cue = (base: string, from24: number, to24: number | undefined, volume: number, extra: { loop?: boolean; note?: string } = {}): AudioCue => ({
  base, from: fr(from24), to: to24 === undefined ? DURATION : fr(to24), volume, ...extra,
});
export const AUDIO_CUES: AudioCue[] = [
  // Приоритет файлов: wav, затем mp3 в public/audio/. Синтез-дубли лежат в public/audio/synth/ (не подхватываются).
  // Музыка: ровно 19.0 с (кадр24 456), играет до исчезновения, дальше тишина
  cue("music_s1", 0, VANISH_FRAME, 0.35, { note: "тревожный фон до исчезновения" }),
  cue("sfx_sirens", 0, VANISH_FRAME, 0.3, { loop: true, note: "сирены до самого исчезновения" }),
  // Хаос 0-168
  cue("sfx_explosions", 0, HIT_FRAME, 0.35),
  cue("sfx_rockets", 10, 107, 0.3),
  cue("sfx_rockets", 80, HIT_FRAME, 0.3),
  cue("sfx_supercar", 20, HIT_FRAME, 0.35, { note: "суперкар обрывается ударом" }),
  // Удар
  cue("sfx_hit_crunch", HIT_FRAME - 1, HIT_FRAME + 48, 0.35),
  cue("sfx_bass_drop", HIT_FRAME, HIT_FRAME + 73, 0.28),
  // Слоу-мо
  cue("sfx_slowmo_hum", FLIGHT_FROM, LAND_FRAME + 4, 0.4),
  // Шлёп
  cue("sfx_body_thud", LAND_FRAME, LAND_FRAME + 36, 0.9),
  // Билборд 23:59 -> 00:00
  cue("sfx_billboard_click", BILLBOARD_FLIP - 1, BILLBOARD_FLIP + 36, 0.7),
  // Исчезновение: всё хаотическое обрывается на VANISH_FRAME, остаётся только unplug/glitch
  cue("sfx_unplug_glitch", VANISH_FRAME, VANISH_FRAME + 4, 0.4, { note: "короткий обрыв-глитч 0.17 с, дальше тишина" }),
  // Пустая улица: сверчки и капли до конца
  cue("sfx_crickets", 486, undefined, 0.5, { note: "12 с > 234 кадров24, без лупа" }),
  cue("sfx_water_drip", 500, undefined, 0.55, { loop: true }),
  // Плечо, плевок, зуб
  cue("sfx_shoulder_pop", SHOULDER_FRAME - 1, SHOULDER_FRAME + 36, 0.5),
  cue("sfx_spit", SPIT_FRAME - 2, SPIT_FRAME + 25, 0.5),
  cue("sfx_tooth_clink", TOOTH_FRAME, TOOTH_FRAME + 25, 0.8),
  // Реплика Грега 3.35 с
  cue("voice_greg_01", GREG_LINE.from, undefined, 0.9, { note: "реплика Грега, 3.35 с" }),
];
