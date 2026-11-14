// Сборка таймлайна и сведение мастер-аудиодорожки (Сцена 1 отдельно + полный мастер). Запуск: node mix.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES } from './lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const FPS = 24;

function readWav(filePath) {
  const b = fs.readFileSync(filePath);
  if (b.slice(0, 4).toString('ascii') !== 'RIFF') throw new Error(`Not RIFF WAV: ${filePath}`);
  let pos = 12;
  let channels = 1, sampleRate = SR, bits = 16;
  let dataStart = -1, dataLen = 0;
  while (pos + 8 <= b.length) {
    const id = b.slice(pos, pos + 4).toString('ascii');
    const size = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') {
      channels = b.readUInt16LE(pos + 10);
      sampleRate = b.readUInt32LE(pos + 12);
      bits = b.readUInt16LE(pos + 22);
    } else if (id === 'data') {
      dataStart = pos + 8;
      dataLen = Math.min(size, b.length - dataStart);
      break;
    }
    pos += 8 + size + (size % 2);
  }
  if (dataStart < 0) throw new Error(`No data chunk: ${filePath}`);
  const bytesPerSample = bits / 8;
  const frameCount = Math.floor(dataLen / (bytesPerSample * channels));
  const out = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const off = dataStart + (i * channels + c) * bytesPerSample;
      sum += b.readInt16LE(off) / 32768;
    }
    out[i] = sum / channels;
  }
  if (sampleRate === SR) return out;
  const resampledLen = Math.round(out.length * SR / sampleRate);
  const res = new Float32Array(resampledLen);
  for (let i = 0; i < resampledLen; i++) {
    const src = i * sampleRate / SR;
    const i0 = Math.floor(src);
    const i1 = Math.min(out.length - 1, i0 + 1);
    const f = src - i0;
    res[i] = out[i0] * (1 - f) + out[i1] * f;
  }
  return res;
}

function writeWav(filePath, data) {
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) {
    const s = Math.tanh(data[i] * 0.95);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([h, pcm]));
}

function normalizePeak(arr, target = 0.88) {
  let peak = 0;
  for (let i = 0; i < arr.length; i++) peak = Math.max(peak, Math.abs(arr[i]));
  if (peak <= 1e-6) return arr;
  const k = target / peak;
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] * k;
  return out;
}

function envelope24(samples) {
  const nFrames = Math.max(1, Math.ceil((samples.length / SR) * FPS));
  const env = [];
  for (let f = 0; f < nFrames; f++) {
    const a = Math.floor((f / FPS) * SR);
    const b = Math.min(samples.length, Math.floor(((f + 1) / FPS) * SR));
    let sum = 0;
    for (let i = a; i < b; i++) sum += samples[i] * samples[i];
    const rms = b > a ? Math.sqrt(sum / (b - a)) : 0;
    const v = rms < 0.025 ? 0 : Math.min(1, Math.pow(rms * 3.4, 0.78));
    env.push(Number(v.toFixed(3)));
  }
  return env;
}

const BLEEPS = {
  s1_worker: [[0.88, 1.48]],
  s2_petya1: [[0.92, 1.50], [3.06, 3.46]],
  s2_ivan1: [[0.80, 1.32], [9.30, 9.98], [12.74, 13.42]],
  s3_surg1: [[7.40, 8.02]],
  s3_anest2: [[7.14, 7.82]],
  s3_surg3: [[0.28, 0.82], [1.44, 1.94]],
  s3_surg4: [[0.44, 0.96]],
  s4_oleg2: [[0.50, 1.24]],
};

/** Replace specified time intervals in normalized voice PCM with a 1000 Hz TV censorship bleep. */
function applyBleeps(samples, intervals) {
  if (!intervals || intervals.length === 0) return samples;
  const out = new Float32Array(samples);
  const fadeSamples = Math.round(0.008 * SR);
  for (const [startSec, endSec] of intervals) {
    const a = Math.max(0, Math.floor(startSec * SR));
    const b = Math.min(out.length, Math.ceil(endSec * SR));
    for (let i = a; i < b; i++) {
      const rampIn = Math.min(1, (i - a) / fadeSamples);
      const rampOut = Math.min(1, (b - 1 - i) / fadeSamples);
      const env = Math.min(rampIn, rampOut);
      const t = (i - a) / SR;
      const bleep = 0.42 * Math.sin(2 * Math.PI * 1000 * t) + 0.04 * Math.sin(2 * Math.PI * 3000 * t);
      out[i] = out[i] * (1 - env) + bleep * env;
    }
  }
  return out;
}

/** Mask profanity in display subtitles consistently with audio bleeps. */
function censorSubtitle(text) {
  return text
    .replace(/нахер/g, 'на***')
    .replace(/Нахер/g, 'На***')
    .replace(/Пиздец/g, 'П***ец')
    .replace(/пиздец/g, 'п***ец')
    .replace(/ебало/g, 'е***о')
    .replace(/Блядь/g, 'Бл***')
    .replace(/блядь/g, 'бл***')
    .replace(/ебучую/g, 'е***ую')
    .replace(/ёбнула/g, 'ё***ла')
    .replace(/съебались/g, 'съе***ись')
    .replace(/нахуй/g, 'на***')
    .replace(/похуй/g, 'по***')
    .replace(/(^|[^А-Яа-яЁё])Бля(?![А-Яа-яЁё])/g, '$1Бл***')
    .replace(/(^|[^А-Яа-яЁё])бля(?![А-Яа-яЁё])/g, '$1бл***');
}

const UNCENSORED = process.argv.includes('--uncensored');

function cleanSubtitle(raw) {
  const cleaned = raw
    .replace(/<sob>/gi, '')
    .replace(/<sigh>/gi, '')
    .replace(/<gasp>/gi, '')
    .replace(/<short pause>/gi, '')
    .replace(/<long pause>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return UNCENSORED ? cleaned : censorSubtitle(cleaned);
}

const voice = {};
for (const l of LINES) {
  const raw = readWav(path.join(__dirname, 'audio', 'voice', `${l.id}.wav`));
  const norm = normalizePeak(raw, 0.92);
  const samples = UNCENSORED ? norm : applyBleeps(norm, BLEEPS[l.id]);
  voice[l.id] = {
    samples,
    dur: raw.length / SR,
    who: l.who,
    text: cleanSubtitle(l.text),
  };
}

const sfx = {};
const sfxDir = path.join(__dirname, 'audio', 'sfx');
for (const f of fs.readdirSync(sfxDir)) {
  if (f.endsWith('.wav')) sfx[f.replace('.wav', '')] = readWav(path.join(sfxDir, f));
}

const cues = {};
const lineTimes = {};
const events = [];

const addAudio = (samples, start, gain = 1, maxDur = null, fadeIn = 0.01, fadeOut = 0.03) => {
  events.push({ samples, start, gain, maxDur, fadeIn, fadeOut });
};
const placeLine = (id, start) => {
  const v = voice[id];
  addAudio(v.samples, start, 1.0, null, 0.01, 0.02);
  lineTimes[id] = {
    start: Number(start.toFixed(3)),
    end: Number((start + v.dur).toFixed(3)),
    duration: Number(v.dur.toFixed(3)),
    who: v.who,
    text: v.text,
    env: envelope24(v.samples),
  };
  return start + v.dur;
};

// СЦЕНА 1: Апокалипсис снаружи
let t = 0;
const s1Start = 0;
addAudio(sfx.birds, 0.0, 0.38, 3.25, 0.2, 0.02);
cues.s1_notify = 3.25;
addAudio(sfx.notify, 3.25, 0.78, 1.1);
// Птицы камнем падают с неба и шлёпаются об асфальт
if (sfx.bird_splat) addAudio(sfx.bird_splat, 3.32, 0.72);
cues.s1_zoom = 3.95;
addAudio(sfx.whoosh, 3.95, 0.55);
cues.s1_glass = 4.45;
addAudio(sfx.glass, 4.45, 0.78);
// Сотрудник приземляется на ноги (4.82с), а Босс с сочным шлепком падает пузом на асфальт (4.96с)
if (sfx.foot_land) addAudio(sfx.foot_land, 4.82, 0.72);
if (sfx.body_slap) addAudio(sfx.body_slap, 4.96, 0.88);
else addAudio(sfx.thud, 4.90, 0.60);

cues.s1_boss = 5.05;
// Топот ног убегающего сотрудника во время того, как Босс волочится за ним по асфальту
if (sfx.footsteps_run) addAudio(sfx.footsteps_run, 5.05, 0.52, 3.35, 0.05, 0.1);
t = placeLine('s1_boss', 5.05);
cues.s1_shakeoff = t + 0.12;
// Хлесткий пинок ногой + свист полёта Босса + тяжёлый сочный шлепок тела об асфальт при падении!
if (sfx.kick_smack) addAudio(sfx.kick_smack, cues.s1_shakeoff, 0.85);
if (sfx.body_slap_heavy) addAudio(sfx.body_slap_heavy, cues.s1_shakeoff + 0.78, 0.92);
else addAudio(sfx.thud, t + 0.25, 0.70);
// Ураганный спринт сотрудника в закат
if (sfx.footsteps_sprint) addAudio(sfx.footsteps_sprint, cues.s1_shakeoff + 0.12, 0.58, 3.2, 0.04, 0.25);
t = placeLine('s1_worker', t + 0.22);

cues.s1_crash_shot = t + 0.55;
addAudio(sfx.whoosh, cues.s1_crash_shot - 0.15, 0.45);
// Визг тормозов двух броневиков перед лобовым столкновением
if (sfx.tire_screech) addAudio(sfx.tire_screech, cues.s1_crash_shot + 0.05, 0.62, 0.65, 0.03, 0.05);
cues.s1_crash = cues.s1_crash_shot + 0.65;
addAudio(sfx.carcrash, cues.s1_crash, 0.78);
// Мешки с деньгами вываливаются и со шлепками падают на асфальт, инкассаторы выпрыгивают из кабин
if (sfx.money_spill) addAudio(sfx.money_spill, cues.s1_crash + 0.12, 0.75);
if (sfx.foot_land) addAudio(sfx.foot_land, cues.s1_crash + 0.48, 0.68);
addAudio(sfx.notify, cues.s1_crash + 1.05, 0.58);
t = placeLine('s1_guard1', cues.s1_crash + 1.45);
// Инкассаторы бегут в магазин электроники
if (sfx.footsteps_sprint) addAudio(sfx.footsteps_sprint, t - 0.25, 0.55, 1.0, 0.03, 0.15);

cues.s1_fire_shot = t + 0.75;
addAudio(sfx.firesiren, cues.s1_fire_shot, 0.30, 6.5, 0.2, 0.4);
addAudio(sfx.fire, cues.s1_fire_shot, 0.28, 6.5, 0.2, 0.4);
// Визг тормозов пожарной машины при резкой остановке у подъезда (dt = 1.15..1.55)
if (sfx.tire_screech) addAudio(sfx.tire_screech, cues.s1_fire_shot + 1.05, 0.68, 0.55, 0.03, 0.08);
if (sfx.foot_land) addAudio(sfx.foot_land, cues.s1_fire_shot + 1.52, 0.72);
if (sfx.footsteps_sprint) addAudio(sfx.footsteps_sprint, cues.s1_fire_shot + 1.60, 0.56, 2.8, 0.04, 0.2);
t = placeLine('s1_fire', cues.s1_fire_shot + 1.75);
cues.s1_hose = cues.s1_fire_shot + 1.85;
// Живой напор, бульканье и шлепки воды из брошенного шланга по асфальту!
addAudio(sfx.water, cues.s1_hose, 0.78, Math.max(2.8, (t + 1.4) - cues.s1_hose), 0.10, 0.25);
const s1End = Math.max(t + 1.35, cues.s1_fire_shot + 5.80);

// СЦЕНА 2: На грани катастрофы (АЭС)
const s2Start = s1End;
t = s2Start + 0.90;
t = placeLine('s2_petya1', t);
t = placeLine('s2_ivan1', t + 0.50);
t = placeLine('s2_petya2', t + 0.45);
t = placeLine('s2_ivan2', t + 0.50);
cues.s2_menu = t + 0.65;
for (let k = s2Start; k < cues.s2_menu - 0.5; k += 4.0) {
  addAudio(sfx.klaxon, k, 0.13, Math.min(4.0, cues.s2_menu - k), 0.1, 0.25);
}
addAudio(sfx.angelic, cues.s2_menu, 0.24, 6.5, 0.3, 0.8);
t = placeLine('s2_ivan3', cues.s2_menu + 0.55);
cues.s2_zero = t + 0.55;
addAudio(sfx.clicks, cues.s2_zero + 0.20, 0.45, 0.9);
addAudio(sfx.rumble, cues.s2_zero - 0.2, 0.55, 3.8, 0.2, 0.3);
cues.s2_boom = cues.s2_zero + 1.05;
addAudio(sfx.explosion, cues.s2_boom, 0.80, 3.5, 0.02, 0.5);
const s2End = cues.s2_boom + 2.80;

// СЦЕНА 3: Медицина бессильна (Операционная)
const s3Start = s2End;
cues.s3_blackout = s3Start + 0.65;
addAudio(sfx.powerdown, cues.s3_blackout, 0.55);
for (let bp = s3Start + 0.2; bp < s3Start + 1.9; bp += 0.65) addAudio(sfx.beep, bp, 0.22);
t = s3Start + 2.10;
t = placeLine('s3_surg1', t);
t = placeLine('s3_anest1', t + 0.55);
cues.s3_silence = t;
addAudio(sfx.beep, t + 0.65, 0.28);
addAudio(sfx.beep, t + 1.55, 0.24);
t = placeLine('s3_surg2', t + 2.20);
t = placeLine('s3_anest2', t + 0.55);
cues.s3_maskrip = t + 0.35;
addAudio(sfx.whoosh, cues.s3_maskrip, 0.40);
t = placeLine('s3_surg3', t + 0.70);
t = placeLine('s3_anest3', t + 0.55);
t = placeLine('s3_surg4', t + 0.45);
for (let bp = s3Start + 2.5; bp < t - 0.5; bp += 2.2) {
  if (Math.abs(bp - (cues.s3_silence + 0.9)) > 1.2) addAudio(sfx.beep, bp, 0.11);
}
cues.s3_runout = t + 0.25;
addAudio(sfx.whoosh, cues.s3_runout, 0.45);
const s3End = t + 1.55;

// СЦЕНА 4: Новый дивный мир (Руины города + Финал)
const s4Start = s3End;
cues.s4_oleg_shot = s4Start + 4.80;
addAudio(sfx.clicks, cues.s4_oleg_shot + 0.2, 0.45, 5.0);
t = placeLine('s4_oleg1', cues.s4_oleg_shot + 0.70);
cues.s4_poweroff = t + 0.55;
addAudio(sfx.screenoff, cues.s4_poweroff, 0.75);
addAudio(sfx.powerdown, cues.s4_poweroff + 0.05, 0.50);
const blackAt = cues.s4_poweroff + 2.2 + voice.s4_oleg2.dur + 0.9;
for (let f = s4Start; f < blackAt; f += 9.5) {
  addAudio(sfx.fire, f, 0.17, Math.min(9.5, blackAt - f), 0.3, 0.4);
}
t = placeLine('s4_oleg2', cues.s4_poweroff + 2.20);
cues.s4_black = t + 0.90;
addAudio(sfx.airraid, cues.s4_black, 0.38, 6.8, 0.3, 0.8);
cues.s4_wasted = cues.s4_black + 2.00;
addAudio(sfx.wasted, cues.s4_wasted, 0.85, 4.5, 0.01, 0.5);
const s4End = cues.s4_wasted + 4.80;

const totalSec = Number(s4End.toFixed(3));
const totalSamples = Math.ceil(totalSec * SR);
const master = new Float32Array(totalSamples);

for (const ev of events) {
  const s0 = Math.round(ev.start * SR);
  const len = ev.maxDur ? Math.min(ev.samples.length, Math.round(ev.maxDur * SR)) : ev.samples.length;
  const fi = Math.max(1, Math.round(ev.fadeIn * SR));
  const fo = Math.max(1, Math.round(ev.fadeOut * SR));
  for (let i = 0; i < len && s0 + i < totalSamples; i++) {
    if (s0 + i < 0) continue;
    let env = 1;
    if (i < fi) env *= i / fi;
    if (i > len - fo) env *= (len - i) / fo;
    master[s0 + i] += ev.samples[i] * ev.gain * env;
  }
}

writeWav(path.join(__dirname, 'audio', 'master.wav'), master);
const s1Samples = Math.min(totalSamples, Math.ceil(s1End * SR));
writeWav(path.join(__dirname, 'audio', 's1_master.wav'), master.slice(0, s1Samples));

const timeline = {
  fps: FPS,
  totalSec,
  totalFrames: Math.ceil(totalSec * FPS),
  scenes: {
    s1: { start: s1Start, end: Number(s1End.toFixed(3)) },
    s2: { start: Number(s2Start.toFixed(3)), end: Number(s2End.toFixed(3)) },
    s3: { start: Number(s3Start.toFixed(3)), end: Number(s3End.toFixed(3)) },
    s4: { start: Number(s4Start.toFixed(3)), end: totalSec },
  },
  cues: Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, Number(v.toFixed(3))])),
  lines: lineTimes,
};

fs.writeFileSync(path.join(__dirname, 'timeline.json'), JSON.stringify(timeline, null, 2));
console.log(`Master audio written: ${totalSec.toFixed(2)}s (${timeline.totalFrames} frames)`);
console.log('Scenes:', timeline.scenes);
