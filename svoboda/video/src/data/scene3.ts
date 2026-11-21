// СЦЕНА 3 «Классовая борьба» (кадры раскадровки 13-18). Длины планов вычисляются из длительностей реплик (wav в public/audio).
import { staticFile } from "remotion";
import type { AudioCue } from "../engine/audio";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const sec = (s: number) => Math.round(s * FPS);
/** поза обновляется раз в 4 кадра = 7.5 поз/с */
export const STEP = 4;
/** рот обновляется чаще позы - раз в 2 кадра */
export const MSTEP = 2;
const even = (n: number) => Math.round(n / 2) * 2;

/** Реплики по порядку: 01 Хлоя, 02 Бренда, 03 Стейси, 04 Маркус, 05 Тони, 06 Грег. Имена по умолчанию (уточняются по voice_s3_durations.json) */
export const VOICE_FILES = ["voice_s3_01_chloe", "voice_s3_02_brenda", "voice_s3_03_stacey", "voice_s3_04_markus", "voice_s3_05_tony", "voice_s3_06_greg"];
export const VOICE_DEF_SEC = [4, 8, 8, 5, 3, 8];
export const SPEAKERS = ["chloe", "brenda", "stacey", "marcus", "tony", "greg"] as const;
export type Who = (typeof SPEAKERS)[number];

interface ShotDef {
  n: number;
  name: string;
  lead: number; // секунд действия до первой реплики
  voices: number[]; // индексы реплик в плане
  gap: number; // пауза между репликами
  tail: number; // секунд после последней реплики
  fixed?: number; // длина плана без реплик
}
export const SHOT_DEFS: ShotDef[] = [
  { n: 13, name: "Общий: пикап с заносом, Бренда и Стейси выходят, Хлоя подбегает", lead: 1.9, voices: [0], gap: 0, tail: 0.2 },
  { n: 14, name: "Окурок в плакат (деталь) -> суровое лицо Бренды", lead: 1.2, voices: [1], gap: 0, tail: 0.2 },
  { n: 15, name: "Стейси тычет монтировкой в мегафон, Хлоя у стены (завал горизонта)", lead: 0.2, voices: [2], gap: 0, tail: 0.2 },
  { n: 16, name: "Маркус хватается за голову, Тони машет рукой, лицо вытягивается", lead: 0.2, voices: [3, 4], gap: 0.3, tail: 0.2 },
  { n: 17, name: "Балаган (общий, тряска)", lead: 0, voices: [], gap: 0, tail: 0, fixed: 3.0 },
  { n: 18, name: "Грег в центре, crash zoom, все замирают", lead: 0.5, voices: [5], gap: 0, tail: 0.9 },
];

export interface VoiceT {
  idx: number; // индекс реплики
  from: number; // кадр начала внутри плана
  len: number; // длина, кадров
}
export interface ShotT {
  i: number;
  n: number;
  from: number; // кадр начала плана
  len: number;
  voices: VoiceT[];
}
export interface Timeline {
  shots: ShotT[];
  total: number;
}
/** durs: длительности реплик в секундах (null = файла нет, берём сценарную) */
export const buildTimeline = (durs: Array<number | null>): Timeline => {
  let from = 0;
  const shots = SHOT_DEFS.map((d, i) => {
    let t = even(sec(d.lead));
    const voices: VoiceT[] = d.voices.map((idx, k) => {
      if (k > 0) t += even(sec(d.gap));
      const len = durs[idx] != null ? Math.ceil(durs[idx]! * FPS) : sec(VOICE_DEF_SEC[idx]);
      const v = { idx, from: t, len };
      t += len;
      return v;
    });
    const len = d.fixed != null ? even(sec(d.fixed)) : even(t + sec(d.tail));
    const s: ShotT = { i, n: d.n, from, len, voices };
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

/** Рот по огибающей wav: 0 закрыт (пауза, провал между слогами), 1 «о», 2 «а» */
export const MOUTH_CLOSED = 0.2;
export const MOUTH_WIDE = 0.52;
export const mouthFromEnv = (env: number[] | undefined, k: number, vLen: number): number => {
  if (k < 0 || k >= vLen) return 0;
  const f = Math.floor(k / MSTEP) * MSTEP;
  if (!env) return (f >> 2) % 3 === 0 ? 1 : 2;
  const e = Math.max(env[f] ?? 0, env[f + 1] ?? 0);
  return e < MOUTH_CLOSED ? 0 : e < MOUTH_WIDE ? 1 : 2;
};

// ---------- аудио ----------
/** Имена файлов, найденных в public/audio (заполняется в calculateMetadata): voice_s3_NN_<имя> по voice_s3_durations.json */
export const voiceNamesFromDurations = (json: Record<string, number> | null): string[] =>
  VOICE_FILES.map((def, i) => {
    if (!json) return def;
    const pre = `voice_s3_0${i + 1}_`;
    const key = Object.keys(json).find((k) => k.startsWith(pre));
    return key ? key.replace(/\.wav$/, "") : def;
  });

export const buildCues = (tl: Timeline, voiceNames: string[]): AudioCue[] => {
  const [a, b, c, d, e, f] = tl.shots;
  const cues: AudioCue[] = [];
  const at = (s: ShotT, t: number) => s.from + sec(t);
  cues.push({ base: "music_s3_tension", from: 0, to: f.from + f.voices[0].from, volume: 0.32, loop: true, note: "напряжение, обрывается вместе с какофонией" });
  // 13: пикап, двери, постукивание монтировкой
  cues.push({ base: "sfx_s3_pickup_arrive", from: a.from, to: at(a, 3.4), volume: 0.8 });
  cues.push({ base: "sfx_s3_door_slam", from: at(a, 0.95), to: at(a, 2.4), volume: 0.6 });
  cues.push({ base: "sfx_s3_crowbar_palm", from: at(a, 3.0), to: at(a, 5.0), volume: 0.5 });
  cues.push({ base: VOICE_FILES[0], from: a.from + a.voices[0].from, volume: 0.95 });
  // 14: шипение окурка, речь Бренды
  cues.push({ base: "sfx_s3_cig_sizzle", from: b.from, to: at(b, 1.5), volume: 0.8 });
  cues.push({ base: VOICE_FILES[1], from: b.from + b.voices[0].from, volume: 0.95 });
  // 15: металл по пластику
  cues.push({ base: "sfx_s3_crowbar_plastic", from: at(c, 0.05), to: at(c, 1.1), volume: 0.7 });
  for (let k = 1; k * 1.6 < c.len / FPS - 1.2; k++) cues.push({ base: "sfx_s3_crowbar_plastic", from: at(c, 0.05 + k * 1.6), to: at(c, 1.1 + k * 1.6), volume: 0.6 });
  cues.push({ base: VOICE_FILES[2], from: c.from + c.voices[0].from, volume: 0.95 });
  // 16: тревожный аккорд на «экономика» и реплики
  cues.push({ base: "sfx_s3_tension_sting", from: d.from, to: d.from + sec(2.5), volume: 0.6 });
  cues.push({ base: VOICE_FILES[3], from: d.from + d.voices[0].from, volume: 0.95 });
  cues.push({ base: VOICE_FILES[4], from: d.from + d.voices[1].from, volume: 0.95 });
  // 17: какофония: автомат, мегафон, монтировка
  const hit = tl.shots[4];
  cues.push({ base: "sfx_s3_brawl_vending", from: hit.from, to: hit.from + hit.len, volume: 0.7 });
  cues.push({ base: "sfx_s3_megaphone_feedback", from: hit.from + sec(0.2), to: hit.from + sec(2.3), volume: 0.5 });
  cues.push({ base: "sfx_s3_crowbar_palm", from: hit.from + sec(1.0), to: hit.from + sec(2.2), volume: 0.5 });
  // 18: обрыв и голос Грега
  cues.push({ base: "sfx_s3_shutup_cut", from: f.from + f.voices[0].from - 4, to: f.from + f.voices[0].from + sec(2.8), volume: 0.7 });
  cues.push({ base: VOICE_FILES[5], from: f.from + f.voices[0].from, volume: 1.0 });
  // голоса идут под актуальными именами файлов
  voiceNames.forEach((n, i) => {
    cues.filter((c2) => c2.base === VOICE_FILES[i] && n !== VOICE_FILES[i]).forEach((c2) => (c2.base = n));
  });
  return cues;
};

/** Имена файлов реплик: из voice_s3_durations.json, иначе по умолчанию */
export const resolveVoiceNames = async (): Promise<string[]> => {
  try {
    const res = await fetch(staticFile("audio/voice_s3_durations.json"));
    const ct = res.headers.get("content-type") || "";
    if (res.ok && !ct.includes("text/html")) return voiceNamesFromDurations(await res.json());
  } catch {
    /* нет файла */
  }
  return VOICE_FILES;
};
