// СЦЕНА 4 «Закон и порядок» (кадры раскадровки 19-27). Длины планов вычисляются из длительностей реплик (wav в public/audio), 60 fps.
import type { AudioCue, AudioAvail } from "../engine/audio";

export { FPS, WIDTH, HEIGHT, sec } from "./fps";
import { FPS, sec } from "./fps";

/** Реплики: индекс 0..5 -> voice_s4_NN_<имя>.wav (имя берём из voice_s4_durations.json или перебором) */
export const VOICE_NN = ["01", "02", "03", "04", "05", "06"] as const;
export const VOICE_GUESS: string[][] = [
  ["voice_s4_01_jackson_whisper", "voice_s4_01_jackson", "voice_s4_01_dzhekson_whisper", "voice_s4_01_dzhekson"],
  ["voice_s4_02_jackson_roar", "voice_s4_02_jackson", "voice_s4_02_dzhekson_roar", "voice_s4_02_dzhekson"],
  ["voice_s4_03_chloe", "voice_s4_03_hloya", "voice_s4_03_khloya"],
  ["voice_s4_04_stacey", "voice_s4_04_steysi", "voice_s4_04_stacy"],
  ["voice_s4_05_tony", "voice_s4_05_toni"],
  ["voice_s4_06_greg", "voice_s4_06_greg_dry"],
];
export const DEF_DUR = [3, 3, 2, 1.5, 2.5, 3]; // сценарные длительности, пока файла нет

export type ShotId = "s19" | "s20" | "s21" | "s22a" | "s22b" | "s23a" | "s23b" | "s24a" | "s24b" | "s25a" | "s25b" | "s26" | "s27";
interface ShotDef {
  id: ShotId;
  n: number; // кадр раскадровки
  name: string;
  voice: number; // индекс реплики или -1
  lead: number; // секунд до реплики
  tail: number; // секунд после реплики
  fixed?: number; // фиксированная длина (секунды), если нет реплики
}
export const SHOT_DEFS: ShotDef[] = [
  { id: "s19", n: 19, name: "Патрулька выкатывается, останавливается, Джексон вываливается", voice: -1, lead: 0, tail: 0, fixed: 3.0 },
  { id: "s20", n: 20, name: "ЭКП: глаза Джексона, шёпот", voice: 0, lead: 0.2, tail: 0.2 },
  { id: "s21", n: 21, name: "Хлоя пятится от Стейси, чихает, «тук» о крыло", voice: -1, lead: 0, tail: 0, fixed: 1.4 },
  { id: "s22a", n: 22, name: "ЭКП: зрачки в точки", voice: -1, lead: 0, tail: 0, fixed: 0.5 },
  { id: "s22b", n: 22, name: "Склейка: звезда розыска над Хлоей", voice: -1, lead: 0, tail: 0, fixed: 0.8 },
  { id: "s23a", n: 23, name: "Джексон ревёт, передёргивает затвор, выстрел в упор", voice: 1, lead: 0.2, tail: 0.4 },
  { id: "s23b", n: 23, name: "Хлоя с сальто улетает в бак, крышка захлопывается", voice: 2, lead: 0, tail: 0.2 },
  { id: "s24a", n: 24, name: "Стейси швыряет монтировку в лобовое; две звезды", voice: 3, lead: 0.2, tail: 0.7 },
  { id: "s24b", n: 24, name: "Три патрульки таранят пикап", voice: -1, lead: 0, tail: 0, fixed: 1.3 },
  { id: "s25a", n: 25, name: "Тони в патрульку, газ, сбивает Маркуса", voice: -1, lead: 0, tail: 0, fixed: 1.8 },
  { id: "s25b", n: 25, name: "Тони в окне: «Маркус, прости!», граната, взрыв", voice: 4, lead: 0.2, tail: 0.9 },
  { id: "s26", n: 26, name: "Ад позади, Грег отпивает кофе, плюёт, смотрит в камеру", voice: 5, lead: 1.8, tail: 0.5 },
  { id: "s27", n: 27, name: "Чёрный экран, неоновый титр ВАЙС-СИТИ", voice: -1, lead: 0, tail: 0, fixed: 3.0 },
];

export interface ShotT {
  i: number;
  id: ShotId;
  n: number;
  from: number;
  len: number;
  vFrom: number; // кадр начала реплики внутри плана
  vLen: number; // длина реплики, кадров (0, если нет)
  voice: number;
}
export interface Timeline {
  shots: ShotT[];
  total: number;
}
export const buildTimeline = (durs: Array<number | null>): Timeline => {
  let from = 0;
  const shots = SHOT_DEFS.map((d, i) => {
    let vFrom = 0;
    let vLen = 0;
    let len: number;
    if (d.voice >= 0) {
      vFrom = sec(d.lead);
      vLen = Math.ceil((durs[d.voice] ?? DEF_DUR[d.voice]) * FPS);
      len = vFrom + vLen + sec(d.tail);
    } else len = sec(d.fixed ?? 1);
    const s: ShotT = { i, id: d.id, n: d.n, from, len, vFrom, vLen, voice: d.voice };
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
export const shotById = (tl: Timeline, id: ShotId): ShotT => tl.shots.find((s) => s.id === id)!;

// ---------- имена аудио: роль -> варианты имён файлов (берётся первый существующий) ----------
export const SFX_CANDS: Record<string, string[]> = {
  engine: ["sfx_s4_patrol_idle"],
  creak: ["sfx_s4_suspension_creak"],
  breath: ["sfx_s4_heavy_breath"],
  safety: ["sfx_s4_shotgun_safety"],
  heartbeat: ["sfx_s4_heartbeat"],
  sneeze: ["sfx_s4_sneeze"],
  tuk: ["sfx_s4_fender_tap"],
  star: ["sfx_s4_wanted_star"],
  star2: ["sfx_s4_wanted_star2", "sfx_s4_wanted_star"],
  violin: ["sfx_s4_psycho_violin"],
  pump: ["sfx_s4_shotgun_pump"],
  shot: ["sfx_s4_shotgun_blast", "sfx_s4_shotgun_shot", "sfx_s4_shotgun_fire", "sfx_s4_shotgun_bang", "sfx_s4_shotgun_boom", "sfx_s4_gunshot", "sfx_s4_shot"],
  lid: ["sfx_s4_bin_lid_clang"],
  glass: ["sfx_s4_glass_break"],
  sirens: ["sfx_s4_sirens_ram"],
  crunch: ["sfx_s4_crunch", "sfx_s4_car_hit", "sfx_crunch_hit", "sfx_hit_crunch"],
  rev: ["sfx_s4_engine_rev", "sfx_engine_roar"],
  grenade: ["sfx_s4_grenade_blast"],
  spit: ["sfx_s4_coffee_spit"],
  chaos: ["sfx_s4_chaos_muffled"],
  music: ["music_s4_title"],
};
export type SfxNames = Record<string, string | null>;
export interface S4Audio {
  avail: AudioAvail;
  voices: Array<string | null>; // имена файлов реплик
  sfx: SfxNames;
}

/** Момент (секунды от начала плана) ключевых событий - общие для анимации и аудио */
export const K = {
  s19: { stop: 1.5, door: 1.8, out: 2.0, stand: 2.6 },
  s21: { sneeze: 0.8, tuk: 1.1 },
  s23b: { slamBefore: 0.2 },
};

export const buildCues = (tl: Timeline, a: S4Audio): AudioCue[] => {
  const g = (id: ShotId) => shotById(tl, id);
  const cues: AudioCue[] = [];
  const sx = a.sfx;
  const add = (role: string, from: number, o: Partial<AudioCue> = {}) => {
    const base = sx[role];
    if (base) cues.push({ base, from, ...o });
  };
  const at = (s: ShotT, t: number) => s.from + sec(t);
  const end = (s: ShotT) => s.from + s.len;
  const vc = (s: ShotT, vol = 0.95) => {
    const name = a.voices[s.voice];
    if (name) cues.push({ base: name, from: s.from + s.vFrom, volume: vol });
  };
  const vEnd = (s: ShotT) => (s.vFrom + s.vLen) / FPS;

  const s19 = g("s19");
  add("engine", s19.from, { to: end(s19), volume: 0.55, loop: true });
  add("creak", at(s19, K.s19.stop - 0.15), { to: at(s19, K.s19.stop + 0.9), volume: 0.6 });
  add("breath", at(s19, K.s19.out), { to: end(s19), volume: 0.6 });

  const s20 = g("s20");
  add("safety", at(s20, 0.05), { volume: 0.8 });
  add("heartbeat", s20.from, { to: end(g("s22a")), volume: 0.6, loop: true });
  vc(s20, 0.95);

  const s21 = g("s21");
  add("sneeze", at(s21, K.s21.sneeze - 0.25), { volume: 0.8 });
  add("tuk", at(s21, K.s21.tuk), { volume: 0.9 });

  const s22b = g("s22b");
  add("star", s22b.from, { volume: 0.9 });
  add("violin", s22b.from, { to: end(s22b), volume: 0.75 });

  const s23a = g("s23a");
  add("pump", at(s23a, 0.12), { volume: 0.85 });
  vc(s23a, 1.0);
  add("shot", at(s23a, vEnd(s23a) + 0.05), { volume: 1.0 });
  const s23b = g("s23b");
  vc(s23b, 0.95);
  add("lid", at(s23b, vEnd(s23b) - 0.15), { volume: 0.9 });

  const s24a = g("s24a");
  vc(s24a, 0.95);
  const tI = vEnd(s24a) + 0.0;
  add("glass", at(s24a, tI), { volume: 0.9 });
  add("star2", at(s24a, tI + 0.2), { volume: 0.85 });
  const s24b = g("s24b");
  add("sirens", s24b.from, { to: end(g("s26")), volume: 0.4 });
  add("crunch", at(s24b, 0.3), { volume: 0.9 });
  add("crunch", at(s24b, 0.55), { volume: 0.8 });
  add("crunch", at(s24b, 0.8), { volume: 0.8 });
  add("chaos", s24b.from, { to: g("s26").from, volume: 0.5, loop: true });

  const s25a = g("s25a");
  add("rev", at(s25a, 0.75), { to: at(s25a, 1.6), volume: 0.55 });
  add("crunch", at(s25a, 1.3), { volume: 1.0 });
  const s25b = g("s25b");
  vc(s25b, 0.98);
  add("grenade", at(s25b, vEnd(s25b) + 0.1), { volume: 1.0 });

  const s26 = g("s26");
  add("chaos", s26.from, { to: end(s26), volume: 0.2, loop: true });
  add("spit", at(s26, 0.2), { volume: 0.9 });
  vc(s26, 1.0);

  const s27 = g("s27");
  add("music", at(s27, 0.1), { volume: 1.0 });
  return cues;
};
