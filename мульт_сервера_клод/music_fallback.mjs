// Процедурная тихая фоновая музыка-заглушка (если Lyria недоступна на тарифе).
// Запуск: node music_fallback.mjs  ->  audio/music/bg_fallback.wav
// Первая половина — «рекламный техно-эмбиент», вторая — тревожный грув с табла и тампурой.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100, LEN = 80, BPM = 100, BEAT = 60 / BPM;
const N = LEN * SR;
const out = new Float32Array(N);
let seed = 99;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SWITCH = 16 * BEAT * 2; // ~19 c — переход в «индийскую» часть

// Аккорды Am - F - C - G (по 4 доли)
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];

// 1. Мягкий пэд
let lp = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const bar = Math.floor(t / (4 * BEAT)) % 4;
  let s = 0;
  for (const m of CHORDS[bar]) for (const det of [-0.08, 0.08]) {
    const f = midi(m) * (1 + det / 100);
    s += ((t * f) % 1) * 2 - 1;
  }
  lp += (s / 6 - lp) * 0.04;
  out[i] += lp * 0.22 * (t < SWITCH ? 1 : 0.55);
}

// 2. Плак-арпеджио (только «рекламная» часть + тихо далее)
for (let k = 0; k * BEAT / 2 < LEN; k++) {
  const st = k * BEAT / 2;
  const bar = Math.floor(st / (4 * BEAT)) % 4;
  const m = CHORDS[bar][k % 3] + 12;
  const f = midi(m), s0 = Math.round(st * SR), amp = st < SWITCH ? 0.16 : 0.05;
  for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
    const t = i / SR;
    out[s0 + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * amp;
  }
}

// 3. Тампура-дрон (A) во второй части
for (let i = Math.round(SWITCH * SR); i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, (t - SWITCH) / 2);
  let s = 0;
  for (const [m, a] of [[45, 1], [52, 0.6], [57, 0.5]]) {
    const f = midi(m);
    for (let h = 1; h <= 8; h++) s += Math.sin(2 * Math.PI * f * h * t + h) * a / h * (0.6 + 0.4 * Math.sin(t * 0.7 * h));
  }
  out[i] += s * 0.05 * fade;
}

// 4. Табла: «дха» (низ) и «на» (звонкий) — тихий грув
const PATTERN = ['dha', null, 'na', 'na', 'dha', null, 'na', null];
for (let k = 0; k * BEAT / 2 < LEN; k++) {
  const st = k * BEAT / 2;
  if (st < SWITCH) continue;
  const p = PATTERN[k % 8];
  if (!p) continue;
  const s0 = Math.round(st * SR);
  for (let i = 0; i < SR * 0.35 && s0 + i < N; i++) {
    const t = i / SR;
    let v;
    if (p === 'dha') v = Math.sin(2 * Math.PI * (95 + 60 * Math.exp(-t * 18)) * t) * Math.exp(-t * 7) * 0.5;
    else v = Math.sin(2 * Math.PI * 620 * t) * Math.exp(-t * 22) * 0.25 + rnd() * Math.exp(-t * 60) * 0.06;
    out[s0 + i] += v * 0.7;
  }
}

// нормализация + запись
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round((out[i] / peak) * 0.8 * 32767), i * 2);
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
const dir = path.join(__dirname, 'audio', 'music');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'bg_fallback.wav'), Buffer.concat([h, pcm]));
console.log('bg_fallback.wav', LEN + 's');
