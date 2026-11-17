// Липсинг по дорожкам реплик: пересчитывает mouth (раскрытие 0..1) и vowel (0 = «о/у», 1 = «и/э») в timing.json.
// Запуск: node lipsync.mjs [N ...]   (без аргументов — все сцены 1..5). Запускать ПОСЛЕ audio/scene_build.mjs / scene1_build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'video');
const SR = 16000, FPS = 24;
const scenes = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [1, 2, 3, 4, 5];

const readPcm = (f) => {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
};

// RBJ band-pass (constant 0 dB peak gain)
const bandpass = (x, f0, q) => {
  const w = (2 * Math.PI * f0) / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = al, b1 = 0, b2 = -al, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};

function analyse(x) {
  const hop = Math.round(SR * 0.008), win = Math.round(SR * 0.03);
  const nh = Math.floor(x.length / hop);
  const lo1 = bandpass(bandpass(x, 500, 1.2), 500, 1.2);   // F1 «а/о/у»
  const hi1 = bandpass(bandpass(x, 2300, 1.2), 2300, 1.2); // F2 «и/э»
  const rms = (a, s) => { let e = 0, n = 0; for (let i = s; i < Math.min(a.length, s + win); i++) { e += a[i] * a[i]; n++; } return Math.sqrt(e / (n || 1)); };
  const E = new Float32Array(nh), LO = new Float32Array(nh), HI = new Float32Array(nh);
  for (let k = 0; k < nh; k++) { const s = k * hop; E[k] = rms(x, s); LO[k] = rms(lo1, s); HI[k] = rms(hi1, s); }
  const db = Array.from(E, (v) => 20 * Math.log10(v + 1e-7));
  const sorted = [...db].sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)];
  const frames = Math.ceil(x.length / SR * FPS);
  const per = hop / SR; // сек на шаг
  const open = [], vow = [];
  let y = 0, v = 0.5;
  for (let f = 0; f < frames; f++) {
    const a = Math.max(0, Math.floor(((f - 0.5) / FPS) / per)), b = Math.min(nh - 1, Math.ceil(((f + 0.5) / FPS) / per));
    let mx = -120, sum = 0, cnt = 0, lo = 0, hi = 0;
    for (let k = a; k <= b; k++) { mx = Math.max(mx, db[k]); sum += db[k]; cnt++; lo += LO[k]; hi += HI[k]; }
    const d = 0.6 * mx + 0.4 * (sum / (cnt || 1));
    let t = Math.min(1, Math.max(0, (d - (ref - 17)) / 16));   // узкий диапазон 16 дБ → слоги заметно различаются
    t = Math.pow(t, 0.9);
    if (t < 0.1) t = 0;                                        // тишина/паузы — рот закрыт
    y = y + (t - y) * (t > y ? 0.85 : 0.5);                     // быстрая атака, умеренный спад → слоговое «хлопание»
    open.push(y < 0.05 ? 0 : +Math.min(1, y * 1.05).toFixed(3));
    const r = hi / (lo + hi + 1e-9);                            // доля высоких формант
    const tv = t > 0 ? Math.min(1, Math.max(0, (r - 0.18) / 0.5)) : v;
    v = v + (tv - v) * 0.5;
    vow.push(+v.toFixed(3));
  }
  return { open, vow };
}

for (const n of scenes) {
  const tf = path.join(root, 'src', `scene${n}`, 'timing.json');
  const timing = JSON.parse(fs.readFileSync(tf, 'utf8'));
  for (const l of timing.lines) {
    const wav = path.join(root, 'public', 'audio', `scene${n}`, 'lines', `${l.id}.wav`);
    if (!fs.existsSync(wav)) { console.log(`scene${n} ${l.id}: нет дорожки, пропуск`); continue; }
    const { open, vow } = analyse(readPcm(wav));
    l.mouth = open; l.vowel = vow;
    const nz = open.filter((v) => v > 0.05).length;
    console.log(`scene${n} ${l.id}: ${open.length} кадров, рот открыт в ${(nz / open.length * 100).toFixed(0)}%, среднее ${(open.reduce((a, b) => a + b, 0) / open.length).toFixed(2)}`);
  }
  fs.writeFileSync(tf, JSON.stringify(timing));
}
