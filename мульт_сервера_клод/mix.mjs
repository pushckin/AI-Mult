// Сведение: голоса (AI Studio TTS) + SFX + музыка (Lyria) -> audio/master.wav + audio/master_censored.wav
// и генерация таймлайна для Remotion (video/src/data/timeline.ts).
// Запуск: node mix.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LINES } from './lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const FPS = 30;
const TEMPO = 1.12; // лёгкое ускорение реплик для темпа Shorts
const TMP = path.join(__dirname, 'audio', 'tmp');
fs.mkdirSync(TMP, { recursive: true });

// ---------- WAV I/O ----------
function readWav(filePath) {
  const b = fs.readFileSync(filePath);
  let pos = 12, channels = 1, rate = SR, bits = 16, ds = -1, dl = 0;
  while (pos + 8 <= b.length) {
    const id = b.slice(pos, pos + 4).toString('ascii');
    const size = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') { channels = b.readUInt16LE(pos + 10); rate = b.readUInt32LE(pos + 12); bits = b.readUInt16LE(pos + 22); }
    else if (id === 'data') { ds = pos + 8; dl = Math.min(size, b.length - ds); break; }
    pos += 8 + size + (size % 2);
  }
  if (ds < 0 || bits !== 16) throw new Error('bad wav ' + filePath);
  const n = Math.floor(dl / (2 * channels));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += b.readInt16LE(ds + (i * channels + c) * 2) / 32768;
    out[i] = s / channels;
  }
  if (rate !== SR) throw new Error(`expected ${SR} Hz: ${filePath}`);
  return out;
}
function writeWav(filePath, data) {
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Math.tanh(data[i] * 0.98))) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([h, pcm]));
}
function ffmpegTo44k(src, dst, extra = []) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, ...extra, '-ac', '1', '-ar', String(SR), '-sample_fmt', 's16', dst]);
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr?.toString());
  return readWav(dst);
}

// ---------- обработка голоса ----------
function trimAndCompress(x) {
  const win = Math.round(0.02 * SR);
  const rms = [];
  for (let i = 0; i < x.length; i += win) {
    let s = 0;
    const e = Math.min(x.length, i + win);
    for (let j = i; j < e; j++) s += x[j] * x[j];
    rms.push(Math.sqrt(s / Math.max(1, e - i)));
  }
  const peak = Math.max(...rms);
  const th = peak * 0.1;
  let first = rms.findIndex((v) => v > th);
  let last = rms.length - 1 - [...rms].reverse().findIndex((v) => v > th);
  if (first < 0) return x;
  first = Math.max(0, first - 2);
  last = Math.min(rms.length - 1, last + 4);
  // сжимаем внутренние паузы (и вздохи) до 0.2 c
  const keepSil = Math.round(0.2 / 0.02);
  const keep = [];
  let run = 0;
  for (let w = first; w <= last; w++) {
    if (rms[w] <= th) { run++; if (run > keepSil) continue; } else run = 0;
    keep.push(w);
  }
  const out = new Float32Array(keep.length * win);
  let o = 0;
  for (const w of keep) for (let j = 0; j < win; j++) out[o++] = x[w * win + j] || 0;
  // нормализация пика
  let p = 0;
  for (let i = 0; i < out.length; i++) p = Math.max(p, Math.abs(out[i]));
  const k = p > 0 ? 0.92 / p : 1;
  for (let i = 0; i < out.length; i++) out[i] *= k;
  // микрофейды
  const f = Math.round(0.01 * SR);
  for (let i = 0; i < f && i < out.length; i++) { out[i] *= i / f; out[out.length - 1 - i] *= i / f; }
  return out;
}
function envelope(samples) {
  const n = Math.ceil((samples.length / SR) * FPS);
  const env = [];
  for (let f = 0; f < n; f++) {
    const a = Math.floor((f / FPS) * SR), b = Math.min(samples.length, Math.floor(((f + 1) / FPS) * SR));
    let s = 0;
    for (let i = a; i < b; i++) s += samples[i] * samples[i];
    const r = b > a ? Math.sqrt(s / (b - a)) : 0;
    env.push(Number((r < 0.03 ? 0 : Math.min(1, Math.pow(r * 3.2, 0.75))).toFixed(2)));
  }
  return env;
}
function chunkText(text) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 30 && cur) { chunks.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
    if (/[.!?…]$/.test(w) && cur.length > 12) { chunks.push(cur.trim()); cur = ''; }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

// ---------- цензура (пики 1000 Гц и маскировка субтитров) ----------
// Интервалы в секундах относительно сжатых реплик voices[id].
const CENSOR_SPANS = {
  a_coder1: [[0.01, 0.63]],
  a_coder2: [[3.24, 3.83]],
  c_boss1: [[0.575, 1.12], [1.70, 2.04], [3.35, 3.77]],
  c_w418: [[0.02, 0.58]],
  c_boss2: [[0.99, 1.52]],
  d_coder3: [[3.36, 3.85]],
  e_w418: [[0.02, 1.285]],
  f_coder4: [[0.02, 0.575]],
};
const SUB_CENSOR_RULES = [
  [/(?<!\p{L})ЕБАЛ Я В РОТ(?!\p{L})/gu, 'Е*** Я В ***'],
  [/(?<!\p{L})Ебать(?!\p{L})/gu, 'Е***ь'],
  [/(?<!\p{L})хуйню(?!\p{L})/gu, 'х***ю'],
  [/(?<!\p{L})БЛЯДЬ(?!\p{L})/gu, 'Б***Ь'],
  [/(?<!\p{L})Блядь(?!\p{L})/gu, 'Б***ь'],
  [/(?<!\p{L})хуй(?!\p{L})/gu, 'х*й'],
  [/(?<!\p{L})говнокода(?!\p{L})/gu, 'г****кода'],
  [/(?<!\p{L})сука(?!\p{L})/gu, 'с**а'],
  [/(?<!\p{L})ёпта(?!\p{L})/gu, 'ё**а'],
];
function censorSubtitle(str) {
  let out = str;
  for (const [re, rep] of SUB_CENSOR_RULES) out = out.replace(re, rep);
  return out;
}
function applyCensor(bus, beeps) {
  const out = new Float32Array(bus);
  const fadeVoice = Math.round(0.015 * SR);
  const fadeBeep = Math.round(0.012 * SR);
  for (const { start, end } of beeps) {
    const s0 = Math.max(0, Math.round(start * SR));
    const s1 = Math.min(out.length, Math.round(end * SR));
    for (let j = 0; j < fadeVoice; j++) {
      const idx = s0 - fadeVoice + j;
      if (idx >= 0 && idx < out.length) out[idx] *= 0.5 * (1 + Math.cos((Math.PI * (j + 1)) / fadeVoice));
    }
    for (let i = s0; i < s1; i++) out[i] = 0;
    for (let j = 0; j < fadeVoice; j++) {
      const idx = s1 + j;
      if (idx >= 0 && idx < out.length) out[idx] *= 0.5 * (1 - Math.cos((Math.PI * (j + 1)) / fadeVoice));
    }
    for (let i = s0; i < s1; i++) {
      const env = Math.min(1, (i - s0) / fadeBeep, (s1 - 1 - i) / fadeBeep);
      out[i] += 0.26 * env * Math.sin(2 * Math.PI * 1000 * (i / SR));
    }
  }
  return out;
}

// ---------- раскладка реплик ----------
const voices = {};
const cues = {};
let t = 0;
for (const l of LINES) {
  t += l.gap || 0;
  if (!l.who) { cues[l.id] = { start: +t.toFixed(3), end: +(t + l.dur).toFixed(3) }; t += l.dur; continue; }
  const src = path.join(__dirname, 'audio', 'voice', `${l.id}.wav`);
  if (!fs.existsSync(src)) throw new Error('нет озвучки ' + l.id + ' — запусти node tts.mjs');
  const raw = ffmpegTo44k(src, path.join(TMP, `${l.id}.wav`), ['-af', `atempo=${TEMPO}`]);
  const v = trimAndCompress(raw);
  voices[l.id] = v;
  const dur = v.length / SR;
  cues[l.id] = { start: +t.toFixed(3), end: +(t + dur).toFixed(3) };
  t += dur;
}
const TOTAL = +(t + 0.2).toFixed(3);
const N = Math.ceil(TOTAL * SR);
const voiceBus = new Float32Array(N);
const sfxBus = new Float32Array(N);
const musicBus = new Float32Array(N);

const place = (bus, data, at, gain = 1) => {
  const s = Math.round(at * SR);
  for (let i = 0; i < data.length; i++) if (s + i >= 0 && s + i < N) bus[s + i] += data[i] * gain;
};
for (const [id, v] of Object.entries(voices)) place(voiceBus, v, cues[id].start, 1.0);

// ---------- SFX ----------
const sfx = (name) => readWav(path.join(__dirname, 'audio', 'sfx', `${name}.wav`));
const loop = (name, from, to, gain, fade = 0.4) => {
  const d = sfx(name);
  const s = Math.round(from * SR), e = Math.round(to * SR), f = Math.round(fade * SR);
  for (let i = s; i < e && i < N; i++) {
    const k = Math.min(1, (i - s) / f, (e - i) / f);
    sfxBus[i] += d[(i - s) % d.length] * gain * k;
  }
};
const C = cues;
const SFX_EVENTS = [];
const at = (name, time, gain) => { place(sfxBus, sfx(name), time, gain); SFX_EVENTS.push({ name, time: +time.toFixed(2) }); };

at('slurp', 0.05, 0.35);
loop('keys_single', C.a_coder2.start - 0.3, C.a_coder2.end + 0.1, 0.35, 0.1);
at('ding', C.a_coder2.end + 0.15, 0.45);
for (let i = 0; i < 14; i++) at('tick', C.a_coder2.end + 0.25 + i * 0.07, 0.25);
at('whoosh', C.b_fly.start + 0.1, 0.7);
at('whoosh', C.b_fly.start + 2.4, 0.6);
at('whoosh', C.b_fly.end - 1.1, 0.75);
loop('office_room', C.b_fly.end - 0.4, C.d_claude1.start - 0.2, 0.32);
at('mega_feedback', C.c_boss1.start - 0.35, 0.35);
at('ruler_slap', C.c_boss2.start + 0.1, 0.8);
at('ruler_slap', C.c_boss2.start + 0.55, 0.7);
loop('keys_single', C.d_claude1.start - 0.6, C.d_claude1.end, 0.12, 0.1);
at('ding', C.d_claude1.start - 0.15, 0.4);
loop('office_room', C.d_coder3.end + 0.05, C.e_w418.end + 1.4, 0.3);
at('siren', C.d_coder3.end + 0.05, 0.38);
at('faceplant', C.e_w418.end + 0.05, 0.9);
at('bodies_thud', C.e_w418.end + 0.35, 0.7);
at('power_down', C.f_claude2.start - 0.9, 0.7);
at('error_buzz', C.f_claude2.start - 0.15, 0.4);
at('phone_pickup', C.g_boss3.start - 0.5, 0.55);
loop('office_room', C.g_boss3.start - 0.8, TOTAL, 0.12, 0.6);

// ---------- музыка (Lyria) с даккингом под голос ----------
const musicDir = path.join(__dirname, 'audio', 'music');
// приоритет: трек Lyria (bg_main.*), иначе процедурная заглушка (bg_fallback.wav из music_fallback.mjs)
const musicFiles = fs.existsSync(musicDir) ? fs.readdirSync(musicDir) : [];
const musicFile = musicFiles.find((f) => /^bg_main\.(mp3|wav|ogg|m4a)$/.test(f)) || musicFiles.find((f) => f === 'bg_fallback.wav') || null;
if (musicFile) {
  const m = ffmpegTo44k(path.join(musicDir, musicFile), path.join(TMP, 'music.wav'));
  // огибающая голоса для даккинга
  const win = Math.round(0.05 * SR);
  let duck = 1;
  for (let i = 0; i < N; i++) {
    if (i % win === 0) {
      let s = 0;
      for (let j = i; j < Math.min(N, i + win); j++) s += voiceBus[j] * voiceBus[j];
      const target = Math.sqrt(s / win) > 0.02 ? 0.45 : 1;
      duck += (target - duck) * 0.35;
    }
    const fade = Math.min(1, i / (1.0 * SR), (N - i) / (1.5 * SR));
    musicBus[i] = m[i % m.length] * 0.16 * duck * fade;
  }
  console.log('music:', musicFile);
} else console.log('music: нет файла, сводим без музыки');

const censorBeeps = Object.entries(CENSOR_SPANS)
  .flatMap(([id, spans]) => spans.map(([s, e]) => ({
    start: +(cues[id].start + s).toFixed(3),
    end: +(cues[id].start + e).toFixed(3),
  })))
  .sort((a, b) => a.start - b.start);
const voiceBusCensored = applyCensor(voiceBus, censorBeeps);

function mixBus(vBus, sBus, mBus) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = vBus[i] + sBus[i] + mBus[i];
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
  const k = 0.95 / Math.max(peak, 1e-6);
  for (let i = 0; i < N; i++) out[i] *= Math.min(k, 1.25);
  return out;
}

const master = mixBus(voiceBus, sfxBus, musicBus);
const masterCensored = mixBus(voiceBusCensored, sfxBus, musicBus);

writeWav(path.join(__dirname, 'audio', 'master.wav'), master);
writeWav(path.join(__dirname, 'video', 'public', 'audio', 'master.wav'), master);
writeWav(path.join(__dirname, 'audio', 'master_censored.wav'), masterCensored);
writeWav(path.join(__dirname, 'video', 'public', 'audio', 'master_censored.wav'), masterCensored);

// ---------- таймлайн для Remotion ----------
const subs = [];
for (const l of LINES) {
  if (!l.who) continue;
  const { start, end } = cues[l.id];
  const chunks = chunkText(l.text);
  const total = chunks.reduce((a, c) => a + c.length, 0);
  let s = start;
  for (const c of chunks) {
    const d = ((end - start) * c.length) / total;
    subs.push({ who: l.who, text: c, start: +s.toFixed(3), end: +(s + d).toFixed(3) });
    s += d;
  }
}
const subsCensored = subs.map((s) => ({ ...s, text: censorSubtitle(s.text) }));
const mouth = {};
for (const [id, v] of Object.entries(voices)) mouth[id] = envelope(v);
const lineWho = Object.fromEntries(LINES.filter((l) => l.who).map((l) => [l.id, l.who]));

const ts = `// АВТОГЕНЕРАЦИЯ: node mix.mjs — не редактировать вручную
export const FPS = ${FPS};
export const TOTAL_SEC = ${TOTAL};
export const TOTAL_FRAMES = ${Math.ceil(TOTAL * FPS)};
export type Who = "coder" | "claude" | "boss" | "w418";
export const CUES: Record<string, { start: number; end: number }> = ${JSON.stringify(cues, null, 2)};
export const LINE_WHO: Record<string, Who> = ${JSON.stringify(lineWho)};
export const SUBS: { who: Who; text: string; start: number; end: number }[] = ${JSON.stringify(subs, null, 2)};
export const SUBS_CENSORED: { who: Who; text: string; start: number; end: number }[] = ${JSON.stringify(subsCensored, null, 2)};
export const CENSOR_BEEPS: { start: number; end: number }[] = ${JSON.stringify(censorBeeps)};
export const MOUTH: Record<string, number[]> = ${JSON.stringify(mouth)};
export const SFX_EVENTS = ${JSON.stringify(SFX_EVENTS)};

/** Открытие рта персонажа в момент t (0..1). */
export const mouthOf = (who: Who, t: number): number => {
  for (const id in LINE_WHO) {
    if (LINE_WHO[id] !== who) continue;
    const c = CUES[id];
    if (t >= c.start && t < c.end) {
      const env = MOUTH[id];
      return env[Math.min(env.length - 1, Math.floor((t - c.start) * FPS))] || 0;
    }
  }
  return 0;
};
`;
fs.mkdirSync(path.join(__dirname, 'video', 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'video', 'src', 'data', 'timeline.ts'), ts);
console.log('TOTAL', TOTAL, 's');
for (const [id, c] of Object.entries(cues)) console.log(id.padEnd(10), c.start.toFixed(2), '→', c.end.toFixed(2));
