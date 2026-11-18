// Процедурные звуковые эффекты для «Вторжения в Новую Зеландию» (GTA 6). Запуск: node sfx.mjs [name ...]
// Пишет audio/sfx/<name>.wav (44100 Гц, моно, 16 бит) и audio/sfx/README.md со списком.
// Всё синтезируется в чистом JS: шумы, фильтры (TPT SVF), осцилляторы с polyBLEP, резонаторы,
// Karplus–Strong, FM-колокольчики, feedback-эхо и лёгкий Freeverb-ревербератор.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const OUT = path.join(__dirname, 'audio', 'sfx');
fs.mkdirSync(OUT, { recursive: true });
const TAU = 2 * Math.PI;

// ---------- базовые утилиты ----------
let seed = 86000000;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const u01 = () => (rnd() + 1) * 0.5;
const rr = (a, b) => a + (b - a) * u01();
const N = (s) => Math.max(1, Math.round(s * SR));
const buf = (s) => new Float32Array(N(s));
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

function white(sec) { const d = buf(sec); for (let i = 0; i < d.length; i++) d[i] = rnd(); return d; }
function pink(sec) {
  const d = buf(sec); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = rnd();
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.12; b6 = w * 0.115926;
  }
  return d;
}
function brown(sec) {
  const d = buf(sec); let y = 0;
  for (let i = 0; i < d.length; i++) { y = (y + 0.02 * rnd()) * 0.997; d[i] = y * 6; }
  return hp(d, 18, 0.6);
}

// TPT state-variable filter; fc — число, функция от t (сек) или Float32Array
function svf(x, fc, Q = 0.707, mode = 'lp') {
  const out = new Float32Array(x.length), k = 1 / Q;
  const fn = typeof fc === 'function', arr = fc instanceof Float32Array;
  const G = (f) => Math.tan((Math.PI * clamp(f, 8, SR * 0.45)) / SR);
  let g = fn || arr ? 0 : G(fc), ic1 = 0, ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (fn) g = G(fc(i / SR)); else if (arr) g = G(fc[i]);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v0 = x[i], v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    out[i] = mode === 'lp' ? v2 : mode === 'hp' ? v0 - k * v1 - v2 : v1 * k;
  }
  return out;
}
const lp = (x, fc, Q = 0.707) => svf(x, fc, Q, 'lp');
const hp = (x, fc, Q = 0.707) => svf(x, fc, Q, 'hp');
const bp = (x, fc, Q = 1) => svf(x, fc, Q, 'bp');

function polyblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
// осциллятор: f — число / функция t / массив; type sin|saw|sqr|tri
function osc(sec, f, type = 'sin', ph = 0) {
  const d = buf(sec); const fn = typeof f === 'function', arr = f instanceof Float32Array;
  let p = ph;
  for (let i = 0; i < d.length; i++) {
    const fr = fn ? f(i / SR) : arr ? f[i] : f, dt = Math.min(0.49, Math.abs(fr) / SR);
    let v;
    if (type === 'sin') v = Math.sin(TAU * p);
    else if (type === 'saw') v = 2 * p - 1 - polyblep(p, dt);
    else if (type === 'sqr') { v = (p < 0.5 ? 1 : -1) + polyblep(p, dt) - polyblep((p + 0.5) % 1, dt); }
    else v = 4 * Math.abs(p - 0.5) - 1;
    d[i] = v; p += dt; if (p >= 1) p -= 1;
  }
  return d;
}
function env(x, fn) { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR); return x; }
function add(dst, src, at = 0, g = 1) {
  const s = Math.round(at * SR);
  for (let i = 0; i < src.length; i++) { const j = s + i; if (j >= 0 && j < dst.length) dst[j] += src[i] * g; }
  return dst;
}
function mix(len, ...layers) { const d = buf(len); for (const [x, at = 0, g = 1] of layers) add(d, x, at, g); return d; }
function peakOf(x) { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; }
function norm(x, p = 1) { const k = peakOf(x); if (k > 0) for (let i = 0; i < x.length; i++) x[i] *= p / k; return x; }
function sat(x, drive = 2) { norm(x); const t = Math.tanh(drive); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / t; return x; }
// мягкий лимитер: нормировка по 99.5-перцентилю модуля и tanh — выбросы не «съедают» громкость
function limit(x, drive = 1.5, q = 0.995) {
  const a = Float32Array.from(x, Math.abs).sort(); const ref = a[Math.floor(q * (a.length - 1))] || 1;
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh((x[i] / ref) * drive);
  return x;
}
const dec = (t, tau, a = 0.001) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / tau));

// feedback-эхо с затуханием высоких
function echo(x, delay, fb = 0.35, wet = 0.4, lpf = 3000, tail = 1) {
  const out = new Float32Array(x.length + N(tail)), D = N(delay), line = new Float32Array(D);
  const a = Math.exp((-TAU * lpf) / SR); let y = 0, idx = 0;
  for (let i = 0; i < out.length; i++) {
    const inp = i < x.length ? x[i] : 0, del = line[idx];
    y = (1 - a) * del + a * y;
    line[idx] = inp + y * fb; idx = (idx + 1) % D;
    out[i] = inp + del * wet;
  }
  return out;
}
// компактный моно-Freeverb
function reverb(x, { room = 0.84, damp = 0.3, wet = 0.3, tail = 1.2, pre = 0.012 } = {}) {
  const len = x.length + N(tail), P = N(pre);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => ({ b: new Float32Array(n), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ b: new Float32Array(n), i: 0 }));
  const w = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const j = i - P, inp = j >= 0 && j < x.length ? x[j] * 0.03 : 0;
    let s = 0;
    for (const c of combs) {
      const y = c.b[c.i]; c.f = y * (1 - damp) + c.f * damp;
      c.b[c.i] = inp + c.f * room; c.i = (c.i + 1) % c.b.length; s += y;
    }
    for (const a of aps) { const bo = a.b[a.i]; const o = -s + bo; a.b[a.i] = s + bo * 0.5; a.i = (a.i + 1) % a.b.length; s = o; }
    w[i] = s;
  }
  const kd = peakOf(x), kw = peakOf(w) || 1, out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = (i < x.length ? x[i] : 0) + (w[i] * kd * wet) / kw;
  return out;
}
// бесшовная петля: длина L - xf, хвост вклеивается в начало равномощным кроссфейдом
function makeLoop(x, xf) {
  const X = N(xf), M = x.length - X, out = new Float32Array(M);
  for (let i = 0; i < M; i++) out[i] = x[i];
  for (let i = 0; i < X; i++) { const p = (i / X) * Math.PI * 0.5; out[i] = x[i] * Math.sin(p) + x[M + i] * Math.cos(p); }
  return out;
}

// ---------- строительные блоки ----------
// удар/бочка: синус с падающей частотой + щелчок
function thump({ len = 0.6, f0 = 120, f1 = 45, ptau = 0.05, tau = 0.15, click = 0.3, clickLp = 3000 } = {}) {
  const s = osc(len, (t) => f1 + (f0 - f1) * Math.exp(-t / ptau));
  env(s, (t) => dec(t, tau, 0.002));
  if (click > 0) { const c = env(lp(white(Math.min(len, 0.08)), clickLp), (t) => dec(t, 0.008)); add(s, c, 0, click); }
  return s;
}
function burst(len, tau, filt = null, a = 0.0005) {
  let n = white(len); if (filt) n = filt(n); return env(n, (t) => dec(t, tau, a));
}
// неармоническая «звенелка» (осколки, металл, зуб)
function ting(f, tau, partials = [[1, 1], [1.53, 0.5], [2.37, 0.3]], len = null) {
  const L = len ?? Math.min(2, tau * 7); const d = buf(L);
  for (const [r, a] of partials) { const fr = f * r; if (fr > SR * 0.45) continue; const ph = u01();
    for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] += Math.sin(TAU * (fr * t + ph)) * a * dec(t, tau / Math.sqrt(r), 0.0004); } }
  return d;
}
// резонансное тело (дерево/металл): короткое возбуждение через набор полосовых
function body(len, freqs, Q = 8, excTau = 0.01) {
  const ex = burst(len, excTau); const d = buf(len);
  for (const [f, g] of freqs) add(d, bp(ex, f, Q), 0, g);
  return d;
}
function woodHit(scale = 1) {
  const d = mix(0.6,
    [body(0.6, [[150 * scale, 1], [270 * scale, 0.8], [460 * scale, 0.6], [730 * scale, 0.4], [1150 * scale, 0.25]], 7, 0.012), 0, 1],
    [burst(0.2, 0.03, (n) => lp(n, 2500)), 0, 0.6],
    [burst(0.05, 0.004, (n) => hp(n, 2000)), 0, 0.35],
    [thump({ len: 0.4, f0: 140 * scale, f1: 60 * scale, tau: 0.09, click: 0 }), 0, 0.7]);
  return d;
}
function fmBell(f, tau = 0.6, ratio = 3.5, index = 2.5, len = null) {
  const L = len ?? tau * 5, d = buf(L);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR, e = dec(t, tau, 0.002);
    d[i] = Math.sin(TAU * f * t + index * e * Math.sin(TAU * f * ratio * t)) * e;
  }
  return d;
}
// духовые «брасс»: детюн-пилы через фильтр с огибающей
function brass(f, len, { bright = 1, attack = 0.015, tau = 0.4, sustain = 0.5, release = 0.15 } = {}) {
  let d = buf(len);
  for (const c of [-9, 0, 7]) add(d, osc(len, f * Math.pow(2, c / 1200), 'saw', u01()), 0, 0.33);
  d = lp(d, (t) => 250 + f * 1.5 + 3800 * bright * Math.exp(-t / 0.12) + 700 * bright, 0.9);
  return env(d, (t) => (t < attack ? t / attack : sustain + (1 - sustain) * Math.exp(-(t - attack) / tau)) * (t > len - release ? Math.max(0, (len - t) / release) : 1));
}
function gunshot(v = 1) {
  return sat(mix(0.5,
    [burst(0.1, 0.006, (n) => hp(n, 1000)), 0, 1],
    [burst(0.4, 0.045, (n) => lp(n, 2400)), 0, 0.85],
    [thump({ len: 0.4, f0: 170 * v, f1: 55, ptau: 0.03, tau: 0.07, click: 0 }), 0, 0.9],
    [burst(0.3, 0.02, (n) => bp(n, 1600, 1.2)), 0, 0.5]), 2.2);
}
function punchHit() {
  const d = mix(0.5,
    [env(bp(white(0.07), (t) => 600 + t * 20000, 1.2), (t) => smooth(t / 0.06) * 0.6), 0, 0.35],
    [thump({ len: 0.4, f0: 190, f1: 60, ptau: 0.03, tau: 0.075, click: 0 }), 0.06, 1],
    [burst(0.1, 0.012, (n) => bp(n, 1800, 0.8)), 0.06, 0.9],
    [burst(0.2, 0.04, (n) => lp(n, 450)), 0.06, 0.8]);
  return sat(d, 1.8);
}
// стрекочущий «грануляр»: множество мелких щелчков через полосовой
function grains(len, count, timeFn, { fLo = 800, fHi = 4000, Q = 3, tLo = 0.003, tHi = 0.02, amp = () => 1 } = {}) {
  const d = buf(len);
  for (let k = 0; k < count; k++) {
    const t = timeFn(k, u01()), tau = rr(tLo, tHi), g = burst(tau * 6, tau);
    add(d, bp(g, rr(fLo, fHi), Q), t, amp(t) * rr(0.3, 1));
  }
  return d;
}
// блеяние овцы: пила с «бе-е-е» тремоло через форманты
function baa(f0 = 340, len = 0.8, shift = 1) {
  const jit = rr(0.9, 1.1), rate = rr(19, 25);
  const pitch = (t) => f0 * jit * (0.92 + 0.13 * smooth(t / 0.1) - 0.12 * smooth((t - 0.2) / (len - 0.2))) * (1 + 0.035 * Math.sin(TAU * rate * t));
  const src = osc(len, pitch, 'saw'); add(src, white(len), 0, 0.06);
  const F = [[700 * shift, 7, 1], [1750 * shift, 9, 0.55], [2600 * shift, 10, 0.3]];
  let d = buf(len);
  for (const [f, Q, g] of F) add(d, bp(src, (t) => (t < 0.06 ? 0.45 + 0.55 * (t / 0.06) : 1 - 0.1 * (t / len)) * f, Q), 0, g);
  add(d, lp(src, 350), 0, 0.25);
  return env(d, (t) => smooth(t / 0.05) * (1 - smooth((t - len + 0.22) / 0.22)) * Math.pow(0.55 + 0.45 * Math.sin(TAU * rate * t), 1.4));
}
// «болтающий» голос толпы: слоги с меняющимися формантами
const VOWELS = [[800, 1200], [500, 1800], [320, 2300], [520, 900], [370, 850], [650, 1600]];
function babble(len, f0, bright = 1, shout = 0) {
  const n = N(len), F1 = new Float32Array(n), F2 = new Float32Array(n), A = new Float32Array(n), P = new Float32Array(n);
  let t = u01() * 0.2, pf = f0;
  while (t < len) {
    const sl = rr(0.1, 0.28), v = VOWELS[Math.floor(u01() * VOWELS.length)], gap = u01() < 0.18 ? rr(0.1, 0.4) : 0;
    pf = clamp(pf * rr(0.9, 1.1), f0 * 0.75, f0 * 1.4);
    const s0 = N(t), s1 = Math.min(n, N(t + sl));
    for (let i = s0; i < s1; i++) { const p = (i - s0) / (s1 - s0); A[i] = Math.sin(Math.PI * p) ** 0.7; F1[i] = v[0] * bright; F2[i] = v[1] * bright; P[i] = pf * (1 + shout * 0.15 * p); }
    t += sl + gap;
  }
  let a1 = 500, a2 = 1500, ap = f0;
  for (let i = 0; i < n; i++) { a1 += ((F1[i] || a1) - a1) * 0.003; a2 += ((F2[i] || a2) - a2) * 0.003; ap += ((P[i] || ap) - ap) * 0.002; F1[i] = a1; F2[i] = a2; P[i] = ap; }
  const src = osc(len, P, 'saw');
  const d = mix(len, [bp(src, F1, 5), 0, 1], [bp(src, F2, 7), 0, 0.55]);
  for (let i = 0; i < n; i++) d[i] *= A[i];
  return d;
}
function karplus(f, len, damp = 0.996) {
  const d = buf(len), P = Math.round(SR / f), line = new Float32Array(P);
  for (let i = 0; i < P; i++) line[i] = rnd();
  let idx = 0, prev = 0;
  for (let i = 0; i < d.length; i++) { const cur = line[idx]; const v = (cur + prev) * 0.5 * damp; prev = cur; line[idx] = v; idx = (idx + 1) % P; d[i] = cur; }
  return d;
}
function sweepNoise(len, f0, f1, Q = 1.2, shape = (p) => Math.sin(Math.PI * p) ** 1.5, src = null) {
  const n = src ?? white(len);
  const d = bp(n, (t) => f0 * Math.pow(f1 / f0, t / len), Q);
  return env(d, (t) => shape(t / len));
}

// ---------- реестр ----------
const REG = [];
const S = (name, desc, fn, opts = {}) => REG.push({ name, desc, fn, opts });

function save(name, x, { gain = 0.89, loop = false } = {}) {
  let d = x;
  if (loop) { let m = 0; for (let i = 0; i < d.length; i++) m += d[i]; m /= d.length; for (let i = 0; i < d.length; i++) d[i] -= m; }
  else {
    d = hp(d, 22, 0.6);
    const fi = N(0.0015), fo = Math.min(N(0.02), d.length >> 2);
    for (let i = 0; i < fi; i++) d[i] *= i / fi;
    for (let i = 0; i < fo; i++) d[d.length - 1 - i] *= i / fo;
  }
  norm(d, gain);
  const pcm = Buffer.alloc(d.length * 2);
  for (let i = 0; i < d.length; i++) pcm.writeInt16LE(Math.round(clamp(d[i], -1, 1) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([h, pcm]));
  return d.length / SR;
}

// ================= ЧАСТЬ 1 =================
S('counter_spin', 'Бешено крутящийся счётчик населения: ускоряющиеся механико-цифровые тики + жужжание, финальный «ка-чанк»', () => {
  const L = 2.5, d = buf(L);
  const rate = (t) => (t < 0.8 ? 12 + 38 * smooth(t / 0.8) : t < 1.75 ? 50 : 50 - 40 * smooth((t - 1.75) / 0.5));
  let t = 0.01, k = 0;
  while (t < 2.25) {
    const a = rr(0.7, 1);
    add(d, bp(burst(0.03, 0.004), rr(3000, 4200), 3), t, a);
    add(d, bp(burst(0.05, 0.01), 1100, 5), t + 0.002, 0.5 * a);
    add(d, env(osc(0.03, 1200 + (k % 10) * 95, 'sqr'), (x) => dec(x, 0.006)), t, 0.07);
    t += 1 / rate(t) * rr(0.9, 1.1); k++;
  }
  const whir = bp(pink(L), (x) => 500 + rate(x) * 30, 1.5);
  add(d, env(whir, (x) => (rate(x) / 50) * (x < 2.3 ? 1 : 0)), 0, 0.5);
  add(d, woodHit(1.8), 2.28, 0.9);
  add(d, bp(burst(0.05, 0.005), 2500, 2), 2.28, 0.8);
  return reverb(d, { room: 0.7, wet: 0.12, tail: 0.05 }).subarray(0, N(2.6));
});
S('mug_crash', 'Кружка падает: глухой удар керамики, звон осколков, всплеск кофе с каплями', () => {
  const L = 1.2, d = buf(L);
  add(d, thump({ len: 0.3, f0: 260, f1: 110, tau: 0.05, click: 0.5 }), 0, 0.8);
  add(d, burst(0.15, 0.02, (n) => hp(n, 1500)), 0, 0.7);
  add(d, burst(0.4, 0.08, (n) => bp(n, 3000, 0.8)), 0.002, 0.5);
  for (let k = 0; k < 70; k++) { const u = u01(), t = 0.004 + 0.4 * u * u; add(d, ting(rr(2200, 7800), rr(0.02, 0.12)), t, (1 - t / 0.5) * rr(0.15, 0.55)); }
  const sp = env(bp(white(0.8), (t) => 900 + 700 * Math.sin(TAU * 9 * t) ** 2, 1.4), (t) => smooth(t / 0.04) * Math.exp(-t / 0.22));
  add(d, sp, 0.03, 0.7);
  for (let k = 0; k < 18; k++) { const len = rr(0.02, 0.05), f0 = rr(350, 700); add(d, env(osc(len, (t) => f0 * (1 + 2 * t / len)), (t) => Math.sin(Math.PI * t / len)), rr(0.06, 0.8), rr(0.05, 0.18)); }
  return reverb(d, { room: 0.72, wet: 0.16, tail: 0.15 });
});
S('alarm', 'Бункерный клаксон «а-у-у-га», 2 цикла, с бетонной реверберацией', () => {
  const L = 2.2, d = buf(L);
  for (const c0 of [0, 1.15]) {
    const len = 1.05;
    const f = (t) => (t < 0.85 ? 260 + 270 * (1 - Math.exp(-t / 0.22)) : 525 - 230 * smooth((t - 0.85) / 0.2));
    let s = mix(len, [osc(len, f, 'sqr'), 0, 0.6], [osc(len, (t) => f(t) * 1.006, 'saw'), 0, 0.6]);
    s = sat(s, 2.5);
    s = mix(len, [bp(s, 900, 0.9), 0, 1], [bp(s, 2300, 2), 0, 0.35]);
    env(s, (t) => smooth(t / 0.04) * (1 - smooth((t - 0.95) / 0.1)) * (1 + 0.08 * Math.sin(TAU * 7 * t)));
    add(d, s, c0);
  }
  return reverb(d, { room: 0.88, damp: 0.2, wet: 0.35, tail: 0.4 });
});
S('jet_crash', 'Падающий «Боинг»: нисходящий вой турбин, удар брюхом, скрежет по песку/металлу, финальный бух', () => {
  const L = 3.0, d = buf(L), T = 1.65;
  const whineF = (t) => 600 + 2200 * Math.exp(-t * 1.3);
  const wh = mix(T, [osc(T, whineF), 0, 1], [osc(T, (t) => whineF(t) * 2.01), 0, 0.25], [osc(T, (t) => whineF(t) * 0.5), 0, 0.3]);
  add(d, env(wh, (t) => 0.25 + 0.75 * smooth(t / T)), 0, 0.35);
  add(d, env(lp(pink(T), (t) => 600 + 2500 * t / T), (t) => 0.3 + 0.7 * smooth(t / T)), 0, 0.9);
  add(d, sat(thump({ len: 1.3, f0: 95, f1: 32, ptau: 0.08, tau: 0.45, click: 0.6 }), 2), T, 1);
  add(d, burst(0.6, 0.09, (n) => lp(n, 1600)), T, 1);
  const SL = 1.1, gr = env(lp(white(SL), 60), () => 1); for (let i = 0; i < gr.length; i++) gr[i] = Math.abs(gr[i]) * 6;
  const scr = bp(white(SL), 2400, 1.8); for (let i = 0; i < scr.length; i++) scr[i] *= gr[i];
  add(d, env(scr, (t) => smooth(t / 0.03) * (1 - t / SL)), T + 0.03, 0.8);
  const screech = mix(SL, [osc(SL, (t) => 1500 + 60 * Math.sin(TAU * 8 * t) - 300 * t), 0, 1], [osc(SL, (t) => 2370 + 80 * Math.sin(TAU * 11 * t)), 0, 0.5]);
  add(d, env(screech, (t) => smooth(t / 0.05) * (1 - t / SL) ** 1.5), T + 0.05, 0.18);
  add(d, thump({ len: 0.6, f0: 80, f1: 40, tau: 0.18, click: 0.4 }), 2.7, 0.6);
  add(d, grains(L, 25, () => rr(2.7, 2.95), { fLo: 600, fHi: 3000, amp: () => 0.25 }));
  return reverb(sat(d, 1.3), { room: 0.84, wet: 0.22, tail: 0.2 });
});
S('ocean', 'Океан/прибой у пляжа (петля 6 с, бесшовная)', () => {
  const L = 7, X = 1;
  const w = (t) => { const a = Math.sin((Math.PI * ((t % 3) / 3))) ** 2, b = Math.sin(Math.PI * (((t + 1.3) % 6) / 6)) ** 4; return 0.25 + 0.55 * a + 0.3 * b; };
  const base = lp(brown(L), 450);
  const wave = bp(pink(L), (t) => 300 + 1600 * w(t), 0.6); env(wave, w);
  const foam = hp(white(L), 3000); env(foam, (t) => Math.pow(w(t - 0.25), 2.5) * 0.3);
  return makeLoop(mix(L, [norm(base), 0, 0.45], [norm(wave), 0, 1], [norm(foam), 0, 0.12]), X);
}, { gain: 0.7, loop: true });
S('door_burst', 'Дверь с грохотом распахивается: деревянный бах, удар о стену, дребезг', () => {
  const d = buf(1.3);
  add(d, woodHit(1), 0, 1);
  add(d, burst(0.05, 0.003, (n) => hp(n, 3000)), 0, 0.5);
  add(d, woodHit(1.3), 0.13, 0.55);
  add(d, grains(1.3, 14, (k) => 0.18 + k * 0.025 + rr(0, 0.01), { fLo: 1500, fHi: 4500, amp: (t) => 0.4 * Math.exp(-(t - 0.18) / 0.15) }));
  return reverb(d, { room: 0.8, wet: 0.22, tail: 0.2 });
});
S('sheep_baa', 'Мультяшное блеяние овцы «бе-е-е» (форманты)', () => reverb(baa(340, 0.8), { room: 0.6, wet: 0.08, tail: 0.1 }));
S('sheep_crowd', 'Стадо овец: несколько блеяний разной высоты', () => {
  const d = buf(3);
  for (const [t, f, l, g, s] of [[0, 330, 0.7, 1, 1], [0.35, 450, 0.55, 0.6, 1.1], [0.7, 280, 0.9, 0.8, 0.92], [1.1, 390, 0.6, 0.7, 1.05], [1.45, 520, 0.45, 0.5, 1.15], [1.7, 310, 0.8, 0.9, 0.95], [2.1, 420, 0.6, 0.55, 1.08], [2.3, 360, 0.65, 0.7, 1]])
    add(d, baa(f, l, s), t, g);
  return reverb(d, { room: 0.7, wet: 0.14, tail: 0.1 }).subarray(0, N(3.1));
});
S('crowd_murmur', 'Огромная толпа: гул/рёв десятков тысяч голосов (петля 6 с)', () => {
  const L = 7, d = buf(L);
  for (let v = 0; v < 40; v++) add(d, babble(L, rr(95, 260), rr(0.9, 1.15), 0), 0, rr(0.3, 1));
  const roar = bp(pink(L), 700, 0.5); env(roar, (t) => 0.8 + 0.2 * Math.sin((TAU * t) / 6));
  add(d, roar, 0, peakOf(d) * 0.6 / peakOf(roar));
  return makeLoop(lp(d, 4500), 1);
}, { gain: 0.7, loop: true });
S('crowd_roar_swell', 'Нарастающий звериный рёв толпы (для волны/финального крика), 5 с', () => {
  const L = 5, d = buf(L);
  for (let v = 0; v < 36; v++) add(d, babble(L, rr(170, 380), rr(1.1, 1.35), 1), 0, rr(0.4, 1));
  const roar = bp(pink(L), 900, 0.6); add(d, roar, 0, peakOf(d) * 0.7 / peakOf(roar));
  env(d, (t) => smooth(t / 1.6) * (1 - smooth((t - 3.8) / 1.2)));
  return reverb(lp(d, 5000), { room: 0.85, wet: 0.25, tail: 0.3 });
});
S('stampede', 'Топот бегущей толпы, гул земли (петля 5 с)', () => {
  const L = 6, d = buf(L);
  for (let k = 0; k < 420; k++) add(d, thump({ len: 0.2, f0: rr(90, 160), f1: rr(45, 70), tau: rr(0.03, 0.06), click: 0.25, clickLp: 1200 }), u01() * (L - 0.2), rr(0.2, 1));
  add(d, lp(brown(L), 120), 0, 0.8);
  add(d, grains(L, 300, () => u01() * L, { fLo: 600, fHi: 2500, amp: () => 0.15 }));
  return makeLoop(d, 1);
}, { gain: 0.75, loop: true });
S('wall_rise', 'Стена растёт из земли: глубокий бетонный скрежет-рокот по нарастающей + вжух и стоп-удар', () => {
  const L = 4.5, d = buf(L), T = 3.75;
  const motor = lp(mix(T, [osc(T, (t) => 32 + 30 * t / T, 'saw'), 0, 1], [osc(T, (t) => 48 + 45 * t / T, 'saw'), 0, 0.5]), 260);
  add(d, env(motor, (t) => smooth(t / 0.5)), 0, 0.6);
  const gr = lp(white(T), 25); for (let i = 0; i < gr.length; i++) gr[i] = 0.3 + Math.abs(gr[i]) * 12;
  const grind = mix(T, [lp(brown(T), (t) => 150 + 500 * t / T), 0, 1], [bp(white(T), (t) => 300 + 300 * t / T, 1.5), 0, 0.6]);
  for (let i = 0; i < grind.length; i++) grind[i] *= gr[i];
  add(d, env(grind, (t) => 0.2 + 0.8 * smooth(t / T)), 0, 0.8);
  add(d, grains(L, 90, () => rr(0.2, T), { fLo: 400, fHi: 2500, amp: (t) => 0.2 + 0.4 * t / T }));
  add(d, sweepNoise(1.3, 250, 2600, 1.1, (p) => Math.sin(Math.PI * p) ** 2), 2.5, 0.8);
  add(d, sat(thump({ len: 0.8, f0: 85, f1: 34, tau: 0.3, click: 0.6 }), 2), T, 1);
  add(d, burst(0.4, 0.06, (n) => lp(n, 1500)), T, 0.7);
  return reverb(sat(d, 2), { room: 0.86, wet: 0.24, tail: 0.1 });
});
S('megaphone_on', 'Включение мегафона: щелчок + короткий вой обратной связи', () => {
  const d = buf(0.62);
  add(d, bp(burst(0.03, 0.003), 3000, 2), 0, 1);
  add(d, thump({ len: 0.08, f0: 420, f1: 160, tau: 0.015, click: 0 }), 0, 0.6);
  add(d, env(lp(osc(0.6, 120, 'sqr'), 900), (t) => smooth(t / 0.03)), 0.01, 0.06);
  const sq = osc(0.48, (t) => 2850 + 260 * t + 25 * Math.sin(TAU * 6 * t));
  add(d, env(sq, (t) => Math.pow(t / 0.46, 2) * (t > 0.455 ? Math.max(0, (0.48 - t) / 0.025) : 1)), 0.12, 0.8);
  return bp(sat(d, 1.8), 1800, 0.55);
});
S('gunfire', 'Пулемётная очередь (мультяшная), с эхом и звоном гильз, 2 с', () => {
  let d = buf(1.6);
  for (let k = 0; k < 18; k++) add(d, gunshot(rr(0.9, 1.1)), 0.01 + k * 0.08 + rr(-0.006, 0.006), rr(0.75, 1));
  for (let k = 0; k < 7; k++) add(d, ting(rr(4000, 6500), 0.04), rr(0.3, 1.5), 0.06);
  d = echo(d, 0.19, 0.3, 0.35, 1800, 0.25);
  return reverb(d, { room: 0.78, wet: 0.18, tail: 0.15 });
});
S('gunfire_single', 'Одиночный выстрел с эхом', () => reverb(echo(gunshot(1), 0.21, 0.3, 0.35, 1800, 0.7), { room: 0.8, wet: 0.2, tail: 0.2 }));
S('body_thud', 'Тело падает на землю: глухой бух + шорох одежды', () => {
  const d = buf(0.7);
  add(d, thump({ len: 0.6, f0: 115, f1: 45, tau: 0.12, click: 0 }), 0, 1);
  add(d, burst(0.15, 0.03, (n) => lp(n, 650)), 0, 0.8);
  add(d, env(hp(white(0.25), 2000), (t) => Math.sin(Math.PI * t / 0.25) * 0.5), 0.02, 0.25);
  add(d, grains(0.7, 10, () => rr(0.03, 0.25), { fLo: 400, fHi: 1500, amp: () => 0.2 }));
  return reverb(d, { room: 0.6, wet: 0.08, tail: 0.05 });
});
S('catapult', 'Самодельная катапульта: скрип дерева, тванг верёвки, свист полёта', () => {
  const d = buf(1.3);
  const cr = buf(0.36); let t = 0;
  while (t < 0.34) { const i = N(t); if (i < cr.length) cr[i] = rr(0.5, 1); t += 1 / (35 + 40 * t / 0.34) * rr(0.8, 1.2); }
  add(d, env(mix(0.36, [bp(cr, 720, 12), 0, 1], [bp(cr, 1350, 10), 0, 0.6]), (x) => smooth(x / 0.1)), 0, 1.5);
  add(d, woodHit(1.6), 0.36, 0.8);
  add(d, env(karplus(98, 0.9, 0.997), (x) => dec(x, 0.3)), 0.36, 0.5);
  add(d, env(osc(0.7, (x) => 196 * (1 + 0.2 * Math.exp(-x * 7) * Math.sin(TAU * 10 * x)), 'tri'), (x) => dec(x, 0.18)), 0.36, 0.45);
  add(d, sweepNoise(0.85, 500, 1900, 1.4, (p) => Math.sin(Math.PI * p) ** 2), 0.42, 0.6);
  return reverb(d, { room: 0.7, wet: 0.12, tail: 0.05 });
});
S('whoosh', 'Быстрый свист-вжух', () => mix(0.75, [sweepNoise(0.7, 350, 2600, 1.2, (p) => Math.sin(Math.PI * p ** 0.7) ** 2), 0, 1], [sweepNoise(0.7, 150, 600, 0.8, (p) => Math.sin(Math.PI * p ** 0.7) ** 2, pink(0.7)), 0, 0.6]));
S('scuffle', 'Потасовка: хват, шорох одежды, удары, возня', () => {
  const L = 1.3, d = buf(L);
  const rus = lp(white(L), 20); for (let i = 0; i < rus.length; i++) rus[i] = Math.abs(rus[i]) * 10;
  const cloth = hp(white(L), 1800); for (let i = 0; i < cloth.length; i++) cloth[i] *= rus[i];
  add(d, cloth, 0, 0.3);
  add(d, burst(0.1, 0.015, (n) => bp(n, 1200, 0.8)), 0.02, 0.5);
  add(d, punchHit(), 0.12, 1); add(d, punchHit(), 0.46, 0.8); add(d, punchHit(), 0.8, 0.95);
  add(d, thump({ len: 0.4, f0: 100, f1: 45, tau: 0.1, click: 0.2 }), 1.0, 0.6);
  for (const t of [0.3, 0.62, 1.1]) add(d, burst(0.12, 0.03, (n) => bp(n, 650, 1.5)), t, 0.35);
  return reverb(d, { room: 0.6, wet: 0.08, tail: 0.05 });
});
S('punch', 'Мультяшный удар кулаком: свист + мясистый хлопок', () => reverb(punchHit(), { room: 0.6, wet: 0.1, tail: 0.05 }));
S('tooth_spit', 'Плевок «тьфу» и звонко подпрыгивающий выбитый зуб', () => {
  const d = buf(1.0);
  add(d, thump({ len: 0.08, f0: 220, f1: 110, tau: 0.015, click: 0 }), 0, 0.5);
  add(d, burst(0.05, 0.01, (n) => lp(n, 900)), 0, 0.6);
  const sp = env(bp(white(0.22), 3200, 0.7), (t) => smooth(t / 0.015) * Math.exp(-t / 0.06) * (0.6 + 0.4 * Math.sin(TAU * 70 * t)));
  add(d, sp, 0.012, 0.8);
  [[0.3, 1], [0.48, 0.7], [0.61, 0.5], [0.7, 0.36], [0.76, 0.26], [0.8, 0.18], [0.83, 0.12]].forEach(([t, a]) => {
    add(d, ting(3900, 0.06, [[1, 1], [1.58, 0.5], [2.23, 0.25]]), t, a * 0.6);
    add(d, bp(burst(0.01, 0.0015), 6000, 2), t, a * 0.4);
  });
  return reverb(d, { room: 0.6, wet: 0.1, tail: 0.05 });
});
S('plug_clack', 'Пластиковый щелчок тройника/вилки в розетку', () => {
  const d = buf(0.3);
  add(d, mix(0.05, [bp(burst(0.05, 0.003), 2800, 2), 0, 1], [bp(burst(0.05, 0.01), 900, 4), 0, 0.6]), 0, 0.6);
  add(d, mix(0.12, [bp(burst(0.12, 0.004), 1900, 2.5), 0, 1], [bp(burst(0.12, 0.02), 620, 5), 0, 0.8], [thump({ len: 0.1, f0: 320, f1: 150, tau: 0.02, click: 0 }), 0, 0.4]), 0.035, 1);
  return reverb(d, { room: 0.5, wet: 0.08, tail: 0.05 });
});
S('sting_dramatic', 'Драматический оркестровый «дун-дун-ДУН» (DmMaj7) для зума на глаза', () => {
  const d = buf(2.6);
  const hit = (at, notes, len, big) => {
    for (const m of notes) add(d, brass(midi(m), len, { bright: big ? 1.2 : 0.9, tau: big ? 0.6 : 0.15, sustain: big ? 0.45 : 0.2, release: big ? 0.8 : 0.1 }), at, 0.35);
    add(d, sat(thump({ len: 1.2, f0: 110, f1: midi(notes[0] + 12), ptau: 0.04, tau: big ? 0.6 : 0.25, click: 0.4 }), 1.5), at, big ? 1 : 0.8);
    add(d, burst(0.4, 0.05, (n) => bp(n, 1000, 0.5)), at, 0.4);
  };
  hit(0, [38, 50, 53, 57], 0.3, false);
  hit(0.36, [38, 50, 53, 57], 0.3, false);
  hit(0.74, [26, 38, 50, 53, 57, 61], 1.75, true);
  const strL = 1.7; let str = buf(strL);
  for (const m of [62, 65, 69, 73]) add(str, osc(strL, midi(m) * rr(0.998, 1.002), 'saw'), 0, 0.25);
  str = lp(str, 2600); env(str, (t) => smooth(t / 0.05) * (0.6 + 0.4 * Math.sin(TAU * 12 * t)) * (1 - smooth((t - 0.9) / 0.8)));
  add(d, str, 0.74, 0.5);
  add(d, env(hp(white(1.6), 5000), (t) => dec(t, 0.6, 0.005)), 0.74, 0.18);
  return reverb(d, { room: 0.9, damp: 0.35, wet: 0.35, tail: 0.6 }).subarray(0, N(2.7));
});
S('concrete_crack', 'Огромная трещина в бетоне: нарастающий хруст, мощный треск, рокот и осыпь', () => {
  const L = 3.1, d = buf(L);
  let t = 0;
  for (let k = 0; t < 0.36; k++) { add(d, bp(burst(0.03, rr(0.002, 0.006)), rr(800, 4000), 4), t, 0.2 + 0.6 * (t / 0.36)); t += rr(0.008, 0.03); }
  add(d, burst(0.2, 0.015, (n) => hp(n, 700)), 0.36, 1.2);
  add(d, burst(0.5, 0.07, (n) => lp(n, 3000)), 0.36, 1);
  add(d, sat(thump({ len: 1.6, f0: 75, f1: 28, ptau: 0.06, tau: 0.5, click: 0 }), 2), 0.36, 1.2);
  const rum = lp(brown(L), 130); env(rum, (x) => (x < 0.36 ? 0 : smooth((x - 0.36) / 0.08) * Math.exp(-(x - 0.36) / 1.1)));
  add(d, rum, 0, 1.2);
  add(d, grains(L, 70, () => rr(0.45, 2.6), { fLo: 900, fHi: 4000, amp: (x) => Math.exp(-(x - 0.45) / 0.9) * 0.5 }));
  return reverb(d, { room: 0.88, wet: 0.3, tail: 0.1 });
});

// ================= ЧАСТЬ 2 =================
S('wall_collapse', 'Мегаобрушение стены: треск, серия тяжёлых ударов, рокот, сыплющийся бетон и пыль', () => {
  const L = 4.4, d = buf(L);
  add(d, burst(0.2, 0.015, (n) => hp(n, 700)), 0, 1);
  [[0.03, 1], [0.55, 0.8], [1.05, 0.9], [1.45, 0.7], [2.05, 0.75], [2.7, 0.5], [3.3, 0.35]].forEach(([t, a]) => {
    add(d, sat(thump({ len: 1.2, f0: rr(65, 85), f1: rr(26, 34), ptau: 0.06, tau: rr(0.3, 0.5), click: 0.5, clickLp: 1500 }), 2), t, a);
    add(d, burst(0.4, 0.06, (n) => lp(n, 1800)), t, a * 0.7);
  });
  const rum = lp(brown(L), 180); env(rum, (t) => smooth(t / 0.6) * (1 - smooth((t - 2.2) / 2.1)));
  add(d, rum, 0, 1.3);
  add(d, grains(L, 450, () => 0.2 + 3.4 * Math.pow(u01(), 1.4), { fLo: 300, fHi: 3200, tLo: 0.005, tHi: 0.03, amp: (t) => 0.4 * (1 - t / L) }));
  add(d, env(hp(pink(L), 2000), (t) => smooth(t / 0.8) * (1 - smooth((t - 1.5) / 2.5))), 0, 0.25);
  return reverb(sat(d, 2.6), { room: 0.9, wet: 0.28, tail: 0.15 });
});
S('tank_crunch', 'Танк сминается: металлический хруст, скрежет и гул брони', () => {
  const L = 1.6, d = buf(L);
  add(d, thump({ len: 0.8, f0: 95, f1: 40, tau: 0.2, click: 0.5 }), 0, 1);
  add(d, ting(187, 0.5, [[1, 1], [2.31, 0.7], [4.07, 0.5], [6.36, 0.35], [9.25, 0.25], [12.9, 0.15]], 1.5), 0, 0.35);
  add(d, grains(L, 140, () => 0.85 * Math.pow(u01(), 1.6), { fLo: 1500, fHi: 5000, Q: 2, tLo: 0.004, tHi: 0.015, amp: () => 0.5 }));
  const gl = 1.2, groan = bp(osc(gl, (t) => 140 - 50 * t + 12 * Math.sin(TAU * 6 * t), 'saw'), 900, 3);
  add(d, env(groan, (t) => smooth(t / 0.15) * (1 - t / gl) ** 1.3), 0.08, 0.6);
  return reverb(sat(d, 1.8), { room: 0.8, wet: 0.18, tail: 0.1 });
});
S('glass_break', 'Разбитое окно: удар, звонкий каскад осколков, осыпь', () => {
  const L = 1.5, d = buf(L);
  add(d, burst(0.1, 0.01, (n) => hp(n, 2000)), 0, 1);
  add(d, thump({ len: 0.1, f0: 320, f1: 150, tau: 0.03, click: 0 }), 0, 0.4);
  add(d, burst(0.6, 0.1, (n) => hp(n, 4000)), 0, 0.35);
  for (let k = 0; k < 130; k++) { const t = 0.003 + 0.5 * Math.pow(u01(), 2.2); add(d, ting(rr(2500, 10000), rr(0.01, 0.12), [[1, 1], [1.47, 0.5], [2.09, 0.3]]), t, rr(0.1, 0.45) * (1 - t)); }
  for (let k = 0; k < 30; k++) add(d, ting(rr(3000, 8000), rr(0.01, 0.04)), rr(0.45, 1.25), 0.12);
  return reverb(d, { room: 0.7, wet: 0.15, tail: 0.1 });
});
S('news_jingle', 'Тревожная заставка экстренного выпуска новостей (брасс-стабы, литавры, колокольчики)', () => {
  const d = buf(2.2), s16 = 0.1;
  add(d, sweepNoise(0.8, 400, 6000, 1, (p) => p * p), 0, 0.35);
  [[0, 74], [1, 74], [2, 74], [4, 77], [6, 81]].forEach(([k, m]) => {
    for (const n of [m - 12, m]) add(d, brass(midi(n), 0.13, { bright: 1, tau: 0.06, sustain: 0.3, release: 0.04 }), k * s16, 0.4);
    add(d, thump({ len: 0.3, f0: 140, f1: 90, tau: 0.12, click: 0.3 }), k * s16, 0.45);
  });
  const T = 0.8, CL = 1.3;
  for (const m of [38, 50, 62, 65, 69, 74]) add(d, brass(midi(m), CL, { bright: 1.1, tau: 0.35, sustain: 0.45, release: 0.5 }), T, 0.3);
  add(d, sat(thump({ len: 1, f0: 120, f1: 73, tau: 0.5, click: 0.5 }), 1.5), T, 1);
  for (const [k, m] of [[0, 86], [1, 93], [2, 98]]) add(d, fmBell(midi(m), 0.4, 3.5, 2), T + k * 0.07, 0.25);
  add(d, env(hp(white(1.2), 5000), (t) => dec(t, 0.5, 0.004)), T, 0.15);
  return reverb(d, { room: 0.85, wet: 0.28, tail: 0.3 }).subarray(0, N(2.3));
});
S('tv_static', 'ТВ-помехи «шшш» с треском и гудением', () => {
  const L = 1.5;
  let n = lp(hp(white(L), 700), 9000);
  const fl = lp(white(L), 30); env(n, (t) => 0.7 + 4 * Math.abs(fl[Math.min(fl.length - 1, N(t))]));
  const d = mix(L, [n, 0, 1], [lp(osc(L, 60, 'sqr'), 1200), 0, 0.08]);
  add(d, grains(L, 60, () => u01() * L, { fLo: 2000, fHi: 7000, amp: () => 0.5 }));
  return env(d, (t) => smooth(t / 0.02) * (1 - smooth((t - 1.43) / 0.05)));
}, { gain: 0.8 });
S('cord_yank', 'Рывок кабеля: резиновый свист, «чпок» вилки и электрический разряд с искрами', () => {
  const L = 1.0, d = buf(L);
  add(d, sweepNoise(0.13, 800, 3200, 2, (p) => p), 0, 0.6);
  add(d, env(osc(0.12, (t) => 300 + 6000 * t), (t) => t / 0.12), 0, 0.25);
  add(d, thump({ len: 0.08, f0: 650, f1: 220, ptau: 0.01, tau: 0.015, click: 0.6, clickLp: 6000 }), 0.12, 0.9);
  const ZL = 0.55, gate = lp(white(ZL), 80);
  let z = mix(ZL, [osc(ZL, (t) => 120 + 40 * Math.sin(TAU * 17 * t), 'saw'), 0, 0.6], [bp(white(ZL), 5000, 0.8), 0, 0.8]);
  for (let i = 0; i < z.length; i++) z[i] *= gate[i] > 0 ? 1 : 0.25;
  z = hp(sat(z, 3), 400); env(z, (t) => smooth(t / 0.005) * Math.exp(-t / 0.2));
  add(d, z, 0.13, 0.7);
  add(d, grains(L, 25, () => rr(0.13, 0.55), { fLo: 3000, fHi: 8000, Q: 1.5, tLo: 0.001, tHi: 0.004, amp: () => 0.8 }));
  return d;
});
S('electric_zap', 'Удар током (колючая проволока под напряжением): треск + гудящий разряд', () => {
  const L = 0.8, gate = lp(white(L), 120);
  let z = mix(L, [osc(L, (t) => 100 + 30 * Math.sin(TAU * 23 * t), 'saw'), 0, 0.6], [bp(white(L), 4500, 0.7), 0, 0.8], [osc(L, 50, 'sqr'), 0, 0.3]);
  for (let i = 0; i < z.length; i++) z[i] *= gate[i] > 0 ? 1 : 0.2;
  z = hp(sat(z, 3.5), 250); env(z, (t) => smooth(t / 0.004) * (1 - smooth((t - 0.5) / 0.28)));
  add(z, grains(L, 30, () => rr(0, 0.6), { fLo: 3000, fHi: 9000, Q: 1.5, tLo: 0.001, tHi: 0.004, amp: () => 0.9 }));
  return z;
});
S('door_kick', 'Дверь выбита с петель: удар ногой, визг петель, винты звенят, дверь плашмя об пол', () => {
  const L = 2.0, d = buf(L);
  add(d, woodHit(0.9), 0, 1); add(d, thump({ len: 0.4, f0: 120, f1: 50, tau: 0.1, click: 0.5 }), 0, 0.7);
  add(d, env(bp(osc(0.22, (t) => 1300 - 1800 * t, 'saw'), 1200, 2), (t) => Math.sin(Math.PI * t / 0.22)), 0.04, 0.25);
  for (const [t, a] of [[0.16, 1], [0.3, 0.6], [0.38, 0.4], [0.43, 0.25]]) add(d, ting(4400, 0.06), t, a * 0.2);
  add(d, sweepNoise(0.55, 200, 900, 0.9, (p) => p ** 2, pink(0.55)), 0.35, 0.6);
  add(d, burst(0.2, 0.03, (n) => lp(n, 4000)), 0.9, 1); add(d, woodHit(0.75), 0.9, 1);
  add(d, sat(thump({ len: 0.7, f0: 80, f1: 38, tau: 0.25, click: 0.4 }), 1.5), 0.9, 0.9);
  add(d, woodHit(1.1), 1.02, 0.35); add(d, woodHit(1.2), 1.1, 0.15);
  return reverb(d, { room: 0.82, wet: 0.22, tail: 0.2 });
});
S('power_down', 'Прибор умирает: нисходящий гул/жужжание (холодильник выдернули)', () => {
  const L = 1.25, d = buf(L);
  add(d, bp(burst(0.03, 0.003), 2500, 2), 0, 0.4);
  const f = (t) => 15 + 100 * Math.pow(1 - t / L, 1.6);
  let hum = mix(L, [osc(L, f), 0, 1], [osc(L, (t) => 2 * f(t)), 0, 0.5], [osc(L, (t) => 3 * f(t), 'saw'), 0, 0.25]);
  hum = sat(hum, 1.8); env(hum, (t) => Math.pow(1 - t / L, 1.2));
  add(d, hum, 0, 1);
  add(d, env(osc(L, (t) => 200 + 5000 * Math.pow(1 - t / L, 2)), (t) => 0.2 * Math.pow(1 - t / L, 2)), 0, 0.6);
  return d;
});
S('ventilator_stop', 'Аппарат ИВЛ: пшик, писк-писк и обрывающийся протяжный сигнал', () => {
  const L = 1.6, d = buf(L);
  add(d, env(bp(white(0.4), 2500, 0.7), (t) => smooth(t / 0.02) * Math.exp(-t / 0.12)), 0, 0.4);
  add(d, thump({ len: 0.15, f0: 150, f1: 70, tau: 0.04, click: 0 }), 0, 0.3);
  const beep = (len) => env(mix(len, [osc(len, 1000), 0, 1], [osc(len, 2000), 0, 0.1], [osc(len, 1000, 'sqr'), 0, 0.05]), (t) => smooth(t / 0.004) * (1 - smooth((t - len + 0.006) / 0.006)));
  add(d, beep(0.12), 0.2, 0.7); add(d, beep(0.12), 0.5, 0.7); add(d, beep(0.68), 0.82, 0.7);
  return reverb(d, { room: 0.6, wet: 0.08, tail: 0.0 });
});
S('hdmi_click', 'Втыкание HDMI: короткий шорох и чёткий металлический щелчок', () => {
  const d = buf(0.22);
  add(d, env(bp(white(0.05), 4000, 1), (t) => t / 0.05), 0, 0.15);
  add(d, mix(0.1, [bp(burst(0.1, 0.003), 3500, 3), 0, 1], [bp(burst(0.1, 0.008), 1500, 3), 0, 0.5], [ting(6200, 0.015), 0, 0.2]), 0.05, 1);
  return d;
});
S('transformer_hum', 'Зловещий гул трансформаторной будки 50 Гц с треском (петля 4 с)', () => {
  const L = 4, n = N(L), d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = Math.sin(TAU * 50 * t) + 0.7 * Math.sin(TAU * 100 * t + 0.3) + 0.4 * Math.sin(TAU * 150 * t) + 0.3 * Math.sin(TAU * 200 * t + 1) + 0.12 * Math.sin(TAU * 300 * t);
    s = Math.tanh(s * 1.6 + 0.25) - Math.tanh(0.25);
    d[i] = s * (0.85 + 0.15 * Math.sin(TAU * 0.5 * t)) + 0.35 * Math.sin(TAU * 25 * t) * (0.7 + 0.3 * Math.sin(TAU * 0.25 * t));
  }
  const nz = mix(5, [hp(white(5), 3000), 0, 0.04], [grains(5, 35, () => u01() * 4.9, { fLo: 2000, fHi: 6000, tLo: 0.001, tHi: 0.004, amp: () => 0.5 }), 0, 1]);
  const nl = makeLoop(nz, 1);
  for (let i = 0; i < n; i++) d[i] = d[i] * 0.5 + nl[i];
  return d;
}, { gain: 0.7, loop: true });
S('gauge_overload', 'Стрелка нагрузки уходит в красное: напряжённый скрип-вой, треск стекла прибора, шипение дыма', () => {
  const L = 2.2, d = buf(L);
  add(d, env(osc(1.3, (t) => 300 + 900 * t * t, 'tri'), (t) => 0.2 + 0.8 * t / 1.3), 0, 0.3);
  add(d, env(bp(osc(1.3, (t) => 60 + 25 * t, 'saw'), 1100, 6), (t) => t / 1.3), 0, 0.4);
  add(d, burst(0.1, 0.008, (n) => hp(n, 2000)), 1.3, 0.9);
  for (let k = 0; k < 40; k++) add(d, ting(rr(3000, 9000), rr(0.01, 0.06)), 1.3 + 0.2 * Math.pow(u01(), 2), 0.25);
  add(d, env(hp(white(0.9), 2500), (t) => smooth(t / 0.1) * (1 - t / 0.9)), 1.32, 0.25);
  return reverb(d, { room: 0.7, wet: 0.12, tail: 0.05 });
});
S('countdown_beep', 'Один бип обратного отсчёта', () => reverb(env(mix(0.25, [osc(0.25, 880), 0, 1], [osc(0.25, 1760), 0, 0.15], [osc(0.25, 880, 'sqr'), 0, 0.04]), (t) => smooth(t / 0.003) * (1 - smooth((t - 0.15) / 0.06))), { room: 0.6, wet: 0.1, tail: 0.1 }));
S('countdown_final', 'Финальный длинный высокий бип «СТАРТ»', () => reverb(env(mix(1.1, [osc(1.1, 1760), 0, 1], [osc(1.1, 880), 0, 0.35], [osc(1.1, 1760, 'sqr'), 0, 0.03]), (t) => smooth(t / 0.004) * (1 - smooth((t - 0.9) / 0.18))), { room: 0.7, wet: 0.12, tail: 0.25 }));
S('start_chime', 'Кайфовый звук запуска игры: вжух-разгон, басовый дроп, искрящийся шиммер (E maj9)', () => {
  const L = 2.2, d = buf(L), T = 0.45;
  add(d, sweepNoise(T, 300, 7000, 1.3, (p) => p ** 2.5), 0, 0.7);
  add(d, env(osc(T, (t) => 200 + 1200 * (t / T) ** 2, 'saw'), (t) => (t / T) ** 3), 0, 0.08);
  const bass = env(osc(1.7, (t) => 41.2 + 80 * Math.exp(-t / 0.05)), (t) => dec(t, 0.7, 0.004));
  add(d, sat(bass, 1.4), T, 1);
  add(d, burst(0.2, 0.02, (n) => lp(n, 2000)), T, 0.4);
  const pad = buf(1.6); for (const m of [52, 59, 68, 75]) add(pad, osc(1.6, midi(m) * rr(0.998, 1.002), 'saw'), 0, 0.2);
  add(d, env(lp(pad, 2200), (t) => smooth(t / 0.04) * Math.exp(-t / 0.7)), T, 0.45);
  let sh = buf(1.7);
  [76, 80, 83, 87, 90, 95, 99].forEach((m, k) => add(sh, fmBell(midi(m), 0.5, 3.0, 1.5, 1.2), k * 0.055, 0.3));
  sh = echo(sh, 0.165, 0.4, 0.45, 6000, 0.3);
  add(d, sh, T, 0.6);
  add(d, env(hp(white(1.5), 7000), (t) => dec(t, 0.5, 0.01)), T, 0.12);
  return reverb(d, { room: 0.88, wet: 0.35, tail: 0.25 }).subarray(0, N(2.3));
});
S('explosion_big', 'Чудовищный взрыв электростанций: удар, бабах, длинный хвост-рокот с обломками', () => {
  const L = 4.1, d = buf(L);
  add(d, burst(0.1, 0.01, (n) => hp(n, 1500)), 0, 1);
  add(d, env(lp(white(L), (t) => 150 + 4500 * Math.exp(-t / 0.22)), (t) => dec(t, 0.55, 0.003)), 0, 1.4);
  add(d, env(osc(L, (t) => 22 + 38 * Math.exp(-t / 0.3)), (t) => dec(t, 0.9, 0.005)), 0, 1.3);
  const rum = lp(brown(L), 150); env(rum, (t) => smooth(t / 0.08) * Math.exp(-t / 1.4));
  add(d, rum, 0, 1.4);
  add(d, grains(L, 90, () => rr(0.25, 3.2), { fLo: 500, fHi: 3500, amp: (t) => 0.5 * Math.exp(-t / 1.2) }));
  return reverb(sat(d, 2.4), { room: 0.9, wet: 0.3, tail: 0.1 });
});
S('power_blackout', 'Отключение всего: тяжёлый щелчок рубильника + хор нисходящих воющих приборов в тишину', () => {
  const L = 2.1, d = buf(L);
  add(d, sat(thump({ len: 0.5, f0: 95, f1: 40, tau: 0.14, click: 0.6 }), 1.5), 0, 1);
  add(d, body(0.3, [[420, 1], [1130, 0.6], [2300, 0.3]], 12, 0.004), 0, 0.5);
  for (const [f0, a, dur] of [[3200, 0.12, 1.4], [2100, 0.15, 1.6], [900, 0.2, 1.75], [440, 0.2, 1.8]])
    add(d, env(osc(dur, (t) => f0 * Math.pow(0.04, t / dur)), (t) => Math.pow(1 - t / dur, 1.3)), 0.02, a);
  const hf = (t) => 20 + 80 * Math.pow(1 - t / 1.8, 1.5);
  add(d, env(sat(mix(1.8, [osc(1.8, hf), 0, 1], [osc(1.8, (t) => hf(t) * 2, 'saw'), 0, 0.3]), 1.5), (t) => (1 - t / 1.8) ** 1.2), 0.02, 0.45);
  add(d, bp(burst(0.02, 0.002), 3000, 2), 1.95, 0.15);
  return reverb(d, { room: 0.85, wet: 0.28, tail: 0.0 });
});
S('crickets', 'Сверчки в мёртвой тишине ночи (петля 5 с)', () => {
  const L = 5, n = N(L), d = new Float32Array(n);
  for (const [fc, per, off, a, pulses] of [[4300, 0.5, 0.1, 1, 3], [4800, 0.625, 0.33, 0.7, 4], [5200, 0.8333, 0.05, 0.5, 3], [3900, 1.25, 0.71, 0.4, 5]]) {
    for (let c = off; c < L; c += per) for (let p = 0; p < pulses; p++) {
      const s0 = N(c + p * 0.042), len = N(0.026);
      for (let i = 0; i < len; i++) { const j = (s0 + i) % n, t = i / SR; d[j] += Math.sin(TAU * fc * (s0 / SR + t)) * Math.sin((Math.PI * i) / len) * a * (0.75 + 0.25 * Math.sin((TAU * (s0 / SR)) / L)); }
    }
  }
  const amb = makeLoop(lp(pink(6), 500), 1);
  for (let i = 0; i < n; i++) d[i] = d[i] * 0.35 + amb[i] * 0.06;
  return d;
}, { gain: 0.6, loop: true });
S('fire_crackle', 'Треск горящих проводов/огня (петля 4 с)', () => {
  const L = 5, d = buf(L);
  const roar = norm(lp(lp(white(L), 300), 300)); const m = norm(lp(white(L), 2)); for (let i = 0; i < roar.length; i++) roar[i] *= 0.6 + 0.4 * Math.abs(m[i]);
  add(d, roar, 0, 0.22);
  for (let k = 0; k < 260; k++) { const tau = rr(0.0005, 0.003); add(d, hp(burst(tau * 8, tau), 1500), u01() * L, 0.15 + 0.6 * Math.pow(u01(), 2)); }
  for (let k = 0; k < 14; k++) add(d, bp(burst(0.03, 0.004), rr(1500, 3000), 3), u01() * L, rr(0.5, 1));
  add(d, norm(hp(white(L), 4500)), 0, 0.03);
  return makeLoop(limit(d, 1.2), 1);
}, { gain: 0.65, loop: true });
S('phone_ding', 'Уведомление сообщения на смартфоне: двухнотный «динь-дон» вверх', () => {
  const d = buf(0.9);
  add(d, ting(1568, 0.25, [[1, 1], [2.0, 0.25], [2.76, 0.15], [5.4, 0.05]], 0.8), 0, 0.6);
  add(d, ting(2093, 0.3, [[1, 1], [2.0, 0.25], [2.76, 0.15], [5.4, 0.05]], 0.8), 0.1, 0.6);
  return reverb(d, { room: 0.6, wet: 0.1, tail: 0.05 });
});
S('rumble_low', 'Низкий суб-рокот (дрожь земли)', () => {
  const L = 3;
  const d = mix(L, [lp(lp(brown(L), 90), 90), 0, 1.5], [osc(L, (t) => 32 + 2 * Math.sin(TAU * 0.7 * t)), 0, 0.35], [osc(L, 47), 0, 0.15]);
  return env(d, (t) => smooth(t / 0.6) * (1 - smooth((t - 2.2) / 0.8)));
});
S('comedic_boing', 'Мультяшный пружинный «бойоинг»', () => {
  const L = 0.85;
  const f = (t) => (180 + 120 * smooth(t / 0.15)) * (1 + 0.28 * Math.exp(-t * 4) * Math.sin(TAU * 13 * t));
  const d = mix(L, [osc(L, f, 'tri'), 0, 1], [osc(L, (t) => 2 * f(t)), 0, 0.3]);
  return env(lp(d, 2500), (t) => dec(t, 0.3, 0.005));
});
S('tape_rip', 'Скотч отрывается/разматывается: трескучий «вжжжик»', () => {
  const L = 0.8, d = buf(L);
  let t = 0.01;
  while (t < 0.72) { const i = N(t); d[i] += rr(0.4, 1) * (u01() < 0.5 ? 1 : -1); t += 1 / (250 + 500 * t) * rr(0.4, 1.6); }
  const crack = mix(L, [bp(d, 2600, 1.1), 0, 1], [hp(d, 5000), 0, 0.4]);
  add(crack, env(hp(white(L), 3000), (x) => 0.3), 0, 0.15);
  add(crack, osc(L, (x) => 1000 + 300 * x + 80 * Math.sin(TAU * 31 * x)), 0, 0.04);
  env(crack, (x) => smooth(x / 0.05) * (0.6 + 0.4 * x / 0.72) * (1 - smooth((x - 0.71) / 0.02)));
  add(crack, bp(burst(0.03, 0.003), 2000, 2), 0.72, 0.5);
  return sat(crack, 2.5);
});
S('splash', 'Всплеск воды (люди плывут/паром тонет)', () => {
  const L = 1.2, d = buf(L);
  add(d, thump({ len: 0.2, f0: 160, f1: 70, tau: 0.04, click: 0 }), 0, 0.5);
  add(d, env(bp(white(1), (t) => 700 + 1500 * Math.exp(-t / 0.2), 0.8), (t) => smooth(t / 0.02) * Math.exp(-t / 0.25)), 0, 1);
  for (let k = 0; k < 25; k++) { const len = rr(0.015, 0.05), f0 = rr(400, 1100); add(d, env(osc(len, (t) => f0 * (1 + 1.8 * t / len)), (t) => Math.sin(Math.PI * t / len)), rr(0.05, 1.0), rr(0.05, 0.2)); }
  return reverb(d, { room: 0.7, wet: 0.12, tail: 0.05 });
});
S('riser', 'Напряжённый райзер: шум и пила по нарастающей, обрыв на пике (3 с)', () => {
  const L = 3, d = buf(L);
  add(d, sweepNoise(L, 200, 9000, 1.5, (p) => p ** 2), 0, 0.8);
  for (const r of [1, 1.5, 2.005]) add(d, env(lp(osc(L, (t) => 110 * r * Math.pow(4, t / L), 'saw'), 3000), (t) => (t / L) ** 2), 0, 0.15);
  add(d, env(osc(L, (t) => 55 + 10 * t), (t) => t / L * (0.6 + 0.4 * Math.sin(TAU * (2 + 6 * t / L) * t))), 0, 0.4);
  return d;
});

// ---------- запуск ----------
const only = process.argv.slice(2);
const done = [];
for (const r of REG) {
  if (only.length && !only.includes(r.name)) { if (fs.existsSync(path.join(OUT, `${r.name}.wav`))) done.push({ ...r, len: null }); continue; }
  seed = [...r.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 86000000); // детерминированно для каждого звука
  const len = save(r.name, r.fn(), r.opts);
  console.log('sfx', r.name.padEnd(18), len.toFixed(2) + 's');
  done.push({ ...r, len });
}
if (!only.length) {
  const lines = ['# SFX — «Вторжение в Новую Зеландию» (GTA 6)', '', 'Все звуки сгенерированы процедурно скриптом `node sfx.mjs` (можно перегенерировать выборочно: `node sfx.mjs alarm punch`).',
    'Формат: WAV 44100 Гц, моно, 16 бит, пик ≈ −1 dBFS (петли-амбиенсы тише: −3…−4.5 dBFS). «петля» — бесшовно зацикливается.', '',
    '| имя | длина | описание |', '|---|---|---|'];
  for (const r of done) lines.push(`| \`${r.name}\` | ${r.len.toFixed(2)} с${r.opts.loop ? ' (петля)' : ''} | ${r.desc} |`);
  fs.writeFileSync(path.join(OUT, 'README.md'), lines.join('\n') + '\n');
  console.log('README.md', done.length, 'звуков');
}
