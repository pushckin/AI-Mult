// Сведение обеих частей: голоса (Gemini TTS) + SFX + музыка -> video/public/audio/{p1,p2}[_censored].wav
// и таймлайн для Remotion: video/src/data/timeline.ts
// Если реплика ещё не озвучена, её длительность оценивается по тексту (тишина) — картинку можно собирать заранее.
// Запуск: node mix.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PARTS } from './lines.mjs';
import { SFX_CUES } from './sfx_cues.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const FPS = 30;
const TEMPO = 1.06;
const TMP = path.join(__dirname, 'audio', 'tmp');
const OUT = path.join(__dirname, 'video', 'public', 'audio');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

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
  if (ds < 0 || bits !== 16 || rate !== SR) return ffmpeg44k(filePath);
  const n = Math.floor(dl / (2 * channels));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += b.readInt16LE(ds + (i * channels + c) * 2) / 32768;
    out[i] = s / channels;
  }
  return out;
}
function ffmpeg44k(src, extra = []) {
  const dst = path.join(TMP, path.basename(src).replace(/\.\w+$/, '') + (extra.length ? '_fx' : '') + '_44k.wav');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, ...extra, '-ac', '1', '-ar', String(SR), '-sample_fmt', 's16', dst]);
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr?.toString());
  return readWav(dst);
}
function writeWav(filePath, data) {
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Math.tanh(data[i] * 0.98))) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([h, pcm]));
}

// ---------- обработка голоса ----------
function rmsWindows(x, win) {
  const rms = [];
  for (let i = 0; i < x.length; i += win) {
    let s = 0; const e = Math.min(x.length, i + win);
    for (let j = i; j < e; j++) s += x[j] * x[j];
    rms.push(Math.sqrt(s / Math.max(1, e - i)));
  }
  return rms;
}
function trimVoice(x) {
  const win = Math.round(0.02 * SR);
  const rms = rmsWindows(x, win);
  const peak = Math.max(...rms);
  const th = peak * 0.08;
  let first = rms.findIndex((v) => v > th);
  let last = rms.length - 1 - [...rms].reverse().findIndex((v) => v > th);
  if (first < 0) return x;
  first = Math.max(0, first - 2); last = Math.min(rms.length - 1, last + 5);
  const keepSil = Math.round(0.28 / 0.02); // внутренние паузы не длиннее 0.28 с
  const keep = []; let run = 0;
  for (let w = first; w <= last; w++) {
    if (rms[w] <= th) { run++; if (run > keepSil) continue; } else run = 0;
    keep.push(w);
  }
  const out = new Float32Array(keep.length * win);
  let o = 0;
  for (const w of keep) for (let j = 0; j < win; j++) out[o++] = x[w * win + j] || 0;
  let p = 0;
  for (let i = 0; i < out.length; i++) p = Math.max(p, Math.abs(out[i]));
  const k = p > 0 ? 0.9 / p : 1;
  for (let i = 0; i < out.length; i++) out[i] *= k;
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
// оценочная огибающая для неозвученной реплики (чтобы рты двигались на черновике)
function fakeEnvelope(text, dur) {
  const n = Math.ceil(dur * FPS), env = [];
  for (let f = 0; f < n; f++) env.push(Number((0.35 + 0.55 * Math.abs(Math.sin(f * 1.7 + text.length))).toFixed(2)));
  return env;
}
const estimateDur = (text) => Math.max(1.0, text.replace(/[{}]/g, '').length / 15.5);

function loadVoice(id) {
  const p = path.join(__dirname, 'audio', 'voice', `${id}.wav`);
  if (!fs.existsSync(p)) return null;
  return trimVoice(ffmpeg44k(p, ['-af', `atempo=${TEMPO}`]));
}
function loadCrowd(id) {
  const takes = [];
  for (let i = 1; i <= 5; i++) { const v = loadVoice(`${id}_c${i}`); if (v) takes.push(v); }
  if (!takes.length) return null;
  const offs = [0, 0.045, 0.09, 0.03, 0.07];
  const len = Math.max(...takes.map((t, i) => t.length + Math.round(offs[i] * SR)));
  const out = new Float32Array(len);
  takes.forEach((t, i) => { const o = Math.round(offs[i] * SR); for (let j = 0; j < t.length; j++) out[o + j] += t[j] * 0.42; });
  return out;
}

// ---------- SFX / музыка ----------
const sfxCache = new Map();
function sfx(name) {
  if (!sfxCache.has(name)) {
    const p = path.join(__dirname, 'audio', 'sfx', `${name}.wav`);
    sfxCache.set(name, fs.existsSync(p) ? readWav(p) : null);
    if (!fs.existsSync(p)) console.warn('нет sfx', name);
  }
  return sfxCache.get(name);
}
function music(part) {
  for (const f of [`${part}_music.wav`, `${part}_music.mp3`, `${part}_fallback.wav`]) {
    const p = path.join(__dirname, 'audio', 'music', f);
    if (fs.existsSync(p)) return { data: ffmpeg44k(p), file: f };
  }
  return null;
}

// цензура: время мата внутри реплики по доле «звучащих» кадров
function bleepRanges(text, env) {
  const clean = text.replace(/[{}]/g, '');
  const ranges = [];
  const re = /\{([^}]*)\}/g; let m, shift = 0;
  const active = env.map((v) => (v > 0 ? 1 : 0));
  const cum = []; let acc = 0;
  for (const a of active) { acc += a; cum.push(acc); }
  const total = acc || 1;
  const atFrac = (p) => { const target = p * total; const i = cum.findIndex((c) => c >= target); return (i < 0 ? env.length : i) / FPS; };
  while ((m = re.exec(text))) {
    const s = m.index - shift, e = s + m[1].length;
    shift += 2;
    ranges.push([Math.max(0, atFrac(s / clean.length) - 0.1), atFrac(e / clean.length) + 0.1]);
  }
  return ranges;
}
function chunkSubs(text, start, end) {
  // сначала по предложениям, длинные предложения — на сбалансированные куски ≤ ~38 символов
  const plainLen = (x) => x.replace(/[{}]/g, '').length;
  const sentences = text.split(/(?<=[.!?…»])\s+(?=[А-ЯЁA-Z«.])/);
  const chunks = [];
  for (const sen of sentences) {
    const n = Math.ceil(plainLen(sen) / 44);
    if (n <= 1) { chunks.push(sen); continue; }
    const words = sen.split(/\s+/);
    const target = plainLen(sen) / n;
    let cur = '';
    for (const w of words) {
      const next = (cur + ' ' + w).trim();
      if (cur && plainLen(next) > target * 1.12 && chunks.length < 99) { chunks.push(cur); cur = w; } else cur = next;
    }
    if (cur) chunks.push(cur);
  }
  // склеить слишком короткие хвосты
  for (let i = chunks.length - 1; i > 0; i--) if (plainLen(chunks[i]) < 9 && plainLen(chunks[i - 1]) + plainLen(chunks[i]) < 46) { chunks[i - 1] += ' ' + chunks[i]; chunks.splice(i, 1); }
  const lens = chunks.map((c) => plainLen(c) + 4);
  const tot = lens.reduce((x, y) => x + y, 0);
  let t = start;
  return chunks.map((c, i) => { const d = ((end - start) * lens[i]) / tot; const r = { start: +t.toFixed(3), end: +(t + d).toFixed(3), text: c }; t += d; return r; });
}

const timeline = { FPS, parts: {} };
let missing = 0;
for (const [pid, part] of Object.entries(PARTS)) {
  const cues = {}; const env = {}; const subs = [];
  const placed = []; // {data, at, gain}
  const bleeps = [];
  let t = 0.15;
  for (const l of part.lines) {
    t += l.gap || 0;
    let dur, data = null, e;
    if (!l.who) dur = l.dur;
    else {
      data = l.who === 'crowd' ? loadCrowd(l.id) : loadVoice(l.id);
      if (data) { dur = data.length / SR; e = envelope(data); }
      else { missing++; dur = estimateDur(l.text); e = fakeEnvelope(l.text, dur); }
    }
    cues[l.id] = { start: +t.toFixed(3), end: +(t + dur).toFixed(3), who: l.who };
    if (l.who) {
      env[l.id] = e;
      if (data) placed.push({ data, at: t, gain: l.who === 'crowd' ? 1.0 : 1.0, voice: true });
      for (const [a, b] of bleepRanges(l.text, e)) bleeps.push([t + a, t + b]);
      for (const c of chunkSubs(l.sub || l.text, t, t + dur)) subs.push({ ...c, who: l.who });
    }
    t += dur;
  }
  const total = t + 0.3;
  const N = Math.ceil(total * SR);
  const voiceBus = new Float32Array(N), fxBus = new Float32Array(N);
  for (const p of placed) { const o = Math.round(p.at * SR); for (let i = 0; i < p.data.length && o + i < N; i++) voiceBus[o + i] += p.data[i] * p.gain; }
  for (const c of SFX_CUES[pid] || []) {
    const d = sfx(c.sfx); if (!d || !cues[c.cue]) { if (!cues[c.cue]) console.warn('нет cue', c.cue); continue; }
    const at = (c.from === 'end' ? cues[c.cue].end : cues[c.cue].start) + (c.at || 0);
    const o = Math.round(at * SR), len = c.len ? Math.min(d.length, Math.round(c.len * SR)) : d.length;
    const fadeN = Math.round(0.08 * SR);
    for (let i = 0; i < len && o + i < N; i++) { if (o + i < 0) continue; const f = c.len && i > len - fadeN ? (len - i) / fadeN : 1; fxBus[o + i] += d[i] * (c.gain ?? 0.7) * f; }
  }
  // музыка: зацикливание, приглушение под голосом, выключение на «тишине»
  const mus = music(pid);
  const musBus = new Float32Array(N);
  if (mus) {
    const venv = new Float32Array(N); let a = 0;
    for (let i = 0; i < N; i++) { const v = Math.abs(voiceBus[i]); a = v > a ? a + (v - a) * 0.01 : a * 0.99995; venv[i] = a; }
    const mutes = (part.musicMute || []).map(([c, from, to]) => [cues[c].start + from, cues[c].start + to]);
    for (let i = 0; i < N; i++) {
      const ts = i / SR;
      let g = 0.22 - Math.min(0.13, venv[i] * 0.5);
      for (const [s, e] of mutes) if (ts >= s && ts <= e) g = 0;
      musBus[i] = mus.data[i % mus.data.length] * g * Math.min(1, ts / 1.0);
    }
  }
  const mixDown = (censor) => {
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = voiceBus[i] + fxBus[i] + musBus[i];
    if (censor) for (const [a, b] of bleeps) {
      const s = Math.round(a * SR), e = Math.min(N, Math.round(b * SR));
      for (let i = s; i < e; i++) { const k = i - s; const fade = Math.min(1, k / 200, (e - i) / 200); out[i] = voiceBus[i] * (1 - fade) + fxBus[i] + musBus[i] + Math.sin((2 * Math.PI * 1000 * k) / SR) * 0.32 * fade; }
    }
    let p = 0; for (let i = 0; i < N; i++) p = Math.max(p, Math.abs(out[i]));
    const k = p > 0.95 ? 0.95 / p : 1; for (let i = 0; i < N; i++) out[i] *= k;
    return out;
  };
  writeWav(path.join(OUT, `${pid}.wav`), mixDown(false));
  writeWav(path.join(OUT, `${pid}_censored.wav`), mixDown(true));
  timeline.parts[pid] = { title: part.title, duration: +total.toFixed(3), totalFrames: Math.ceil(total * FPS), cues, env, subs, bleeps: bleeps.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]), music: mus?.file ?? null };
  console.log(pid, 'длительность', total.toFixed(2), 'с, кадров', Math.ceil(total * FPS), mus ? 'музыка: ' + mus.file : 'без музыки');
}
fs.writeFileSync(path.join(__dirname, 'video', 'src', 'data', 'timeline.ts'),
  '// СГЕНЕРИРОВАНО mix.mjs — не править руками\n' +
  `export const VOICE_READY = ${missing === 0};\n` +
  `export const FPS = ${FPS};\n` +
  'export type Cue = { start: number; end: number; who: string | null };\n' +
  'export type Sub = { start: number; end: number; text: string; who: string };\n' +
  'export type PartTimeline = { title: string; duration: number; totalFrames: number; cues: Record<string, Cue>; env: Record<string, number[]>; subs: Sub[]; bleeps: [number, number][]; music: string | null };\n' +
  `export const TIMELINE: Record<"p1" | "p2", PartTimeline> = ${JSON.stringify(timeline.parts)};\n`);
console.log(missing ? `ВНИМАНИЕ: не озвучено реплик: ${missing} (тайминги оценочные)` : 'все реплики озвучены');
