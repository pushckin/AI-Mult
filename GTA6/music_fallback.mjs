// Процедурная фоновая музыка-заглушка (если Lyria/ключа нет). Запуск: node music_fallback.mjs [p1|p2]
//   audio/music/p1_fallback.wav — «Вторжение»: пафосный военный андерскор (тайко, струнное остинато, брасс, «казу»-марш), D minor, 96 BPM
//   audio/music/p2_fallback.wav — «Блэкаут»: тревожная электроника обратного отсчёта (пульс-бас, тиканье, райзеры), E minor, ~123 BPM
// Обе дорожки ровно 70 с и бесшовно зациклены: хвосты нот и реверберация заворачиваются в начало.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100, TAU = 2 * Math.PI, LEN = 70;
const OUT = path.join(__dirname, 'audio', 'music');
fs.mkdirSync(OUT, { recursive: true });

// ---------- DSP ----------
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const u01 = () => (rnd() + 1) * 0.5;
const rr = (a, b) => a + (b - a) * u01();
const N = (s) => Math.max(1, Math.round(s * SR));
const buf = (s) => new Float32Array(N(s));
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const dec = (t, tau, a = 0.002) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / tau));

function white(sec) { const d = buf(sec); for (let i = 0; i < d.length; i++) d[i] = rnd(); return d; }
function svf(x, fc, Q = 0.707, mode = 'lp') {
  const out = new Float32Array(x.length), k = 1 / Q, fn = typeof fc === 'function';
  const G = (f) => Math.tan((Math.PI * clamp(f, 8, SR * 0.45)) / SR);
  let g = fn ? 0 : G(fc), ic1 = 0, ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (fn) g = G(fc(i / SR));
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v0 = x[i], v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    out[i] = mode === 'lp' ? v2 : mode === 'hp' ? v0 - k * v1 - v2 : v1 * k;
  }
  return out;
}
const lp = (x, fc, Q) => svf(x, fc, Q, 'lp'), hp = (x, fc, Q) => svf(x, fc, Q, 'hp'), bp = (x, fc, Q = 1) => svf(x, fc, Q, 'bp');
function polyblep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function osc(sec, f, type = 'sin', ph = 0) {
  const d = buf(sec), fn = typeof f === 'function'; let p = ph;
  for (let i = 0; i < d.length; i++) {
    const fr = fn ? f(i / SR) : f, dt = Math.min(0.49, fr / SR);
    d[i] = type === 'sin' ? Math.sin(TAU * p) : type === 'saw' ? 2 * p - 1 - polyblep(p, dt) : (p < 0.5 ? 1 : -1) + polyblep(p, dt) - polyblep((p + 0.5) % 1, dt);
    p += dt; if (p >= 1) p -= 1;
  }
  return d;
}
const env = (x, fn) => { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR); return x; };
const peakOf = (x) => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };

function reverbLoop(x, { room = 0.84, damp = 0.35, wet = 0.25 } = {}) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => ({ b: new Float32Array(n), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ b: new Float32Array(n), i: 0 }));
  const n = x.length, w = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { // 2 прохода: во втором хвост уже «закольцован»
    const inp = x[i] * 0.03; let s = 0;
    for (const c of combs) { const y = c.b[c.i]; c.f = y * (1 - damp) + c.f * damp; c.b[c.i] = inp + c.f * room; c.i = (c.i + 1) % c.b.length; s += y; }
    for (const a of aps) { const bo = a.b[a.i]; const o = -s + bo; a.b[a.i] = s + bo * 0.5; a.i = (a.i + 1) % a.b.length; s = o; }
    if (pass) w[i] = s;
  }
  const k = (peakOf(x) / (peakOf(w) || 1)) * wet;
  for (let i = 0; i < n; i++) x[i] += w[i] * k;
  return x;
}
function echoLoop(x, delay, fb = 0.35, wet = 0.3) {
  const D = N(delay), n = x.length, y = new Float32Array(n);
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) y[i] = x[(i - D + n) % n] + y[(i - D + n) % n] * fb;
  for (let i = 0; i < n; i++) x[i] += y[i] * wet;
  return x;
}

// ---------- трек ----------
function track(bpm) {
  const out = new Float32Array(N(LEN)), beat = 60 / bpm;
  const putInto = (dst, src, at, g = 1) => { const s = Math.round(at * SR), n = dst.length; for (let i = 0; i < src.length; i++) dst[(s + i) % n] += src[i] * g; };
  const put = (src, at, g = 1) => putInto(out, src, at, g);
  return { out, beat, bar: 4 * beat, s16: beat / 4, put, putInto };
}
function finish(name, x, target = 0.79) {
  // мягкий лимитер по 99.9-перцентилю → пик ~ -2 dBFS
  const a = Float32Array.from(x, Math.abs).sort(), ref = a[Math.floor(0.999 * (a.length - 1))] || 1;
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh((x[i] / ref) * 1.1);
  const k = target / peakOf(x);
  const pcm = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) pcm.writeInt16LE(Math.round(clamp(x[i] * k, -1, 1) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([h, pcm]));
  console.log(name, (x.length / SR).toFixed(2) + 's');
}

// ---------- инструменты ----------
function sawStack(f, len, det = [-8, 0, 8]) { const d = buf(len); for (const c of det) { const s = osc(len, f * Math.pow(2, c / 1200), 'saw', u01()); for (let i = 0; i < d.length; i++) d[i] += s[i] / det.length; } return d; }
function taiko(big = true) {
  const len = big ? 0.9 : 0.35, f0 = big ? 95 : 190, f1 = big ? 52 : 120;
  const d = env(osc(len, (t) => f1 + (f0 - f1) * Math.exp(-t / 0.04)), (t) => dec(t, big ? 0.32 : 0.09));
  const sl = env(lp(white(0.1), big ? 900 : 2200), (t) => dec(t, 0.012));
  for (let i = 0; i < sl.length; i++) d[i] += sl[i] * (big ? 0.5 : 0.35);
  return d;
}
function snare(g = 1) {
  const len = 0.25, n = env(bp(white(len), 2200, 0.7), (t) => dec(t, 0.06)), tn = env(osc(len, (t) => 180 + 60 * Math.exp(-t / 0.02)), (t) => dec(t, 0.04));
  for (let i = 0; i < n.length; i++) n[i] = (n[i] + tn[i] * 0.6) * g;
  return n;
}
function brassNote(f, len, { bright = 1, attack = 0.02, tau = 0.3, sustain = 0.55, release = 0.12 } = {}) {
  let d = sawStack(f, len, [-9, 0, 7]);
  d = lp(d, (t) => 250 + f * 1.4 + 3200 * bright * Math.exp(-t / 0.1) + 600 * bright, 0.9);
  return env(d, (t) => (t < attack ? t / attack : sustain + (1 - sustain) * Math.exp(-(t - attack) / tau)) * clamp((len - t) / release, 0, 1));
}
function kazoo(f, len, fall = false) {
  const vib = (t) => 1 + 0.018 * smooth(t / 0.15) * Math.sin(TAU * 6.2 * t);
  const pf = (t) => f * vib(t) * (fall ? Math.pow(0.5, smooth((t - len * 0.45) / (len * 0.55))) : 1) * (1 - 0.04 * Math.exp(-t / 0.03));
  const a = osc(len, pf, 'saw'), b = osc(len, (t) => pf(t) * 1.004, 'sqr');
  const src = new Float32Array(a.length); for (let i = 0; i < a.length; i++) src[i] = a[i] * 0.6 + b[i] * 0.3;
  const d = new Float32Array(src.length), f1 = bp(src, 1100, 2.5), f2 = bp(src, 2600, 3), l = lp(src, 700);
  for (let i = 0; i < d.length; i++) d[i] = f1[i] + f2[i] * 0.5 + l[i] * 0.4;
  return env(d, (t) => smooth(t / 0.025) * clamp((len - t) / 0.05, 0, 1));
}
function swell(len) { return env(hp(white(len), 3000), (t) => Math.pow(t / len, 3) * clamp((len - t) / 0.02, 0, 1)); }

// ================= P1: «Вторжение» — D minor, 96 BPM, 28 тактов =================
function p1() {
  seed = 1966;
  const T = track(96), { put, bar, beat, s16 } = T;
  const PROG = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'];
  const ROOT = { Dm: 38, Bb: 34, C: 36, Gm: 31, A: 33 };
  const CH = { Dm: [50, 53, 57], Bb: [50, 53, 58], C: [48, 52, 55], Gm: [50, 55, 58], A: [49, 52, 57] };
  const chordAt = (b) => (b >= 24 ? ['Dm', 'Bb', 'Gm', 'A'][b - 24] : PROG[b % 8]);
  const sec = (b) => (b < 8 ? 'A' : b < 16 ? 'B' : b < 24 ? 'C' : 'D');
  const OST = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 0], ACC = new Set([0, 3, 6, 8, 11, 14]);
  for (let b = 0; b < 28; b++) {
    const c = chordAt(b), r = ROOT[c], s = sec(b), t0 = b * bar;
    // струнное остинато 16-ми (3+3+2)
    for (let k = 0; k < 16; k++) {
      const f = midi(r + 12 + OST[k]), len = 0.14, acc = ACC.has(k);
      const n = env(lp(sawStack(f, len), (t) => 600 + (acc ? 2200 : 1200) * Math.exp(-t / 0.05)), (t) => dec(t, 0.07, 0.004));
      put(n, t0 + k * s16, (acc ? 0.5 : 0.28) * (s === 'A' ? 0.8 : 1));
    }
    // тайко
    const BIG = { A: [0, 8], B: [0, 6, 8, 11], C: [0, 3, 6, 8, 10, 11], D: [0, 8] }[s];
    for (const k of BIG) put(taiko(true), t0 + k * s16, 0.9);
    if (s !== 'A') for (const k of [4, 12]) put(taiko(false), t0 + k * s16, 0.35);
    if (b % 4 === 3 || b === 27) for (const k of [12, 13, 14, 15]) put(taiko(false), t0 + k * s16, 0.3 + 0.1 * (k - 12));
    // военный малый барабан
    if (s === 'B' || s === 'C') {
      for (const [k, g] of [[4, 0.5], [12, 0.5], [2, 0.15], [7, 0.15], [10, 0.15], [14, 0.2], [15, 0.25]]) put(snare(1), t0 + k * s16, g * 0.6);
    }
    // низкий струнный пэд
    if (s !== 'A' || b >= 4) {
      const pad = env(lp(sawStack(midi(r), bar + 0.3, [-6, 6]), 500), (t) => smooth(t / 0.4) * clamp((bar + 0.3 - t) / 0.3, 0, 1));
      put(pad, t0, 0.3);
      for (const m of CH[c]) put(env(lp(sawStack(midi(m), bar + 0.3, [-7, 7]), 1100), (t) => smooth(t / 0.5) * clamp((bar + 0.3 - t) / 0.3, 0, 1)), t0, s === 'A' ? 0.08 : 0.12);
    }
    // брасс: в B — длинный «хорн» раз в 2 такта, в C — стабы
    if (s === 'B' && b % 2 === 0) for (const m of [r + 12, ...CH[c]]) put(brassNote(midi(m), bar * 1.8, { bright: 0.5, attack: 0.3, sustain: 0.8, release: 0.6 }), t0, 0.14);
    if (s === 'C' || s === 'D') for (const k of s === 'C' ? [0, 6, 8] : [0]) for (const m of [r + 12, ...CH[c]]) put(brassNote(midi(m), 0.32, { bright: 1, tau: 0.12, sustain: 0.3 }), t0 + k * s16, 0.17);
    // туба «умпа» в C
    if (s === 'C') for (const q of [0, 2]) put(brassNote(midi(r - 12 + (q ? 7 : 0)) * 2, 0.3, { bright: 0.35, tau: 0.15, sustain: 0.4 }), t0 + q * beat, 0.35);
    // реверс-тарелка перед сменой секции
    if (b % 8 === 7 || b === 27) put(swell(bar), t0, 0.15);
  }
  // пафосная «казу»-мелодия (секция C)
  const MEL = [
    [[62, 1], [62, 0.5], [64, 0.5], [65, 1], [62, 1]], [[69, 2], [67, 1], [65, 1]],
    [[65, 1], [67, 0.5], [65, 0.5], [62, 1], [58, 1]], [[60, 1.5], [64, 0.5], [67, 2]],
    [[62, 1], [62, 0.5], [64, 0.5], [65, 1], [69, 1]], [[74, 2], [72, 1], [69, 1]],
    [[70, 1], [69, 0.5], [67, 0.5], [65, 1], [62, 1]], [[61, 1], [64, 1], [69, 2, 'fall']],
  ];
  MEL.forEach((notes, i) => { let t = (16 + i) * bar; for (const [m, d, fx] of notes) { T.put(kazoo(midi(m), d * beat * 0.95, fx === 'fall'), t, 0.32); t += d * beat; } });
  reverbLoop(T.out, { room: 0.86, damp: 0.4, wet: 0.22 });
  return T.out;
}

// ================= P2: «Блэкаут» — E minor, 36 тактов за 70 с (~123.4 BPM) =================
function p2() {
  seed = 2026;
  const T = track((36 * 4 * 60) / LEN), { put, putInto, bar, beat, s16 } = T;
  const ARPBUF = new Float32Array(T.out.length), LEADBUF = new Float32Array(T.out.length);
  const PROG = ['Em', 'C', 'D', 'B'];
  const ROOT = { Em: 40, C: 36, D: 38, B: 35 };
  const CH = { Em: [64, 67, 71], C: [64, 67, 72], D: [62, 66, 69], B: [63, 66, 71] };
  const sec = (b) => (b < 8 ? 'A' : b < 16 ? 'B' : b < 28 ? 'C' : 'D');
  const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3];
  const kick = () => { const len = 0.4, d = env(osc(len, (t) => 46 + 110 * Math.exp(-t / 0.03)), (t) => dec(t, 0.18)); const c = env(lp(white(0.02), 4000), (t) => dec(t, 0.003)); for (let i = 0; i < c.length; i++) d[i] += c[i] * 0.4; return d; };
  const hat = (open) => env(hp(white(open ? 0.2 : 0.05), 7500), (t) => dec(t, open ? 0.06 : 0.012));
  const clap = () => { const d = buf(0.3); for (const o of [0, 0.011, 0.022]) { const b = env(bp(white(0.25), 1500, 0.9), (t) => dec(t, o === 0.022 ? 0.07 : 0.008)); for (let i = 0; i < b.length && N(o) + i < d.length; i++) d[N(o) + i] += b[i]; } return d; };
  const tick = (hi) => { const len = 0.05, d = env(bp(white(len), hi ? 3200 : 2300, 9), (t) => dec(t, 0.006)); const s = env(osc(len, hi ? 2400 : 1800), (t) => dec(t, 0.008)); for (let i = 0; i < d.length; i++) d[i] = d[i] * 2 + s[i] * 0.4; return d; };
  for (let b = 0; b < 36; b++) {
    const c = PROG[b % 4], r = ROOT[c], s = sec(b), t0 = b * bar, last = b === 35;
    // часы тик-так — всегда
    for (let q = 0; q < 4; q++) put(tick(q % 2 === 0), t0 + q * beat, 0.35);
    // пульсирующий бас 16-ми с «пампингом»
    const cut = s === 'A' ? 300 + 900 * (b / 8) : s === 'D' ? 2200 : 1600;
    if (!last) for (let k = 0; k < 16; k++) {
      const len = s16 * 0.9, f = midi(r + (k % 4 === 2 ? 12 : 0));
      const n = env(lp(sawStack(f, len, [-10, 10]), (t) => cut * (0.5 + Math.exp(-t / 0.04)), 1.2), (t) => smooth(t / 0.004) * dec(t, 0.09, 0.004));
      const sub = env(osc(len, f / 2), (t) => smooth(t / 0.004) * clamp((len - t) / 0.01, 0, 1));
      const pump = k % 4 === 0 ? 0.55 : 1;
      put(n, t0 + k * s16, 0.32 * pump); put(sub, t0 + k * s16, 0.18 * pump);
    }
    // пэд
    for (const m of CH[c]) put(env(lp(sawStack(midi(m - 12), bar + 0.2, [-9, 9]), 1300), (t) => smooth(t / 0.3) * clamp((bar + 0.2 - t) / 0.2, 0, 1)), t0, s === 'A' ? 0.07 : 0.05);
    if (s === 'A') continue;
    // бочка, хэты, клэп
    if (!last) for (let q = 0; q < 4; q++) put(kick(), t0 + q * beat, 0.85);
    for (let k = 0; k < 16; k++) if (!last || k < 8) put(hat(k % 4 === 2), t0 + k * s16, k % 4 === 2 ? 0.12 : 0.07);
    if ((s === 'C' || s === 'D') && !last) for (const q of [1, 3]) put(clap(), t0 + q * beat, 0.4);
    // арпеджио с эхом
    const tones = [...CH[c], CH[c][0] + 12, CH[c][1] + 12];
    if (!last) for (let k = 0; k < 16; k++) {
      const f = midi(tones[ARP[k]] + 12), len = s16 * 0.8;
      putInto(ARPBUF, env(lp(osc(len, f, 'sqr'), 3500), (t) => dec(t, 0.05, 0.003)), t0 + k * s16, 0.08);
    }
    // «обратный отсчёт»: высокий бип на сильную долю в D
    if (s === 'D') put(env(osc(0.12, 1760), (t) => smooth(t / 0.003) * clamp((0.12 - t) / 0.02, 0, 1)), t0, 0.1);
    // нагнетающий барабанный ролл в конце
    if (b >= 32 && b < 35) { const dens = b === 34 ? 16 : b === 33 ? 8 : 4; for (let k = 0; k < 16; k += 16 / dens) put(snare(1), t0 + k * s16, 0.12 + 0.1 * (b - 32)); }
  }
  // райзеры (шум + растущая пила) перед кульминациями
  for (const [b0, bars] of [[12, 4], [24, 4], [31, 4]]) {
    const len = bars * bar;
    const nz = env(bp(white(len), (t) => 300 * Math.pow(25, t / len), 1.3), (t) => Math.pow(t / len, 2) * clamp((len - t) / 0.03, 0, 1));
    const sw = env(lp(sawStack(midi(52), len), 2500), (t) => Math.pow(t / len, 2.5) * 0.5 * clamp((len - t) / 0.03, 0, 1));
    const up = env(osc(len, (t) => midi(52) * Math.pow(4, t / len), 'saw'), (t) => Math.pow(t / len, 2.5) * clamp((len - t) / 0.03, 0, 1));
    T.put(nz, b0 * bar, 0.35); T.put(sw, b0 * bar, 0.05); T.put(lp(up, 3000), b0 * bar, 0.08);
  }
  // свистулька-слайд в конце 8-тактовых фраз (комедия)
  for (const b of [7, 15, 23]) T.put(env(osc(bar / 2, (t) => 600 * Math.pow(3, t / (bar / 2))), (t) => smooth(t / 0.03) * clamp((bar / 2 - t) / 0.05, 0, 1) * (1 + 0.1 * Math.sin(TAU * 8 * t))), b * bar + bar / 2, 0.06);
  // лид в C с «падающими» комедийными нотами
  const PH = [
    [[71, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [69, 1], [67, 1]],
    [[67, 0.5], [69, 0.5], [71, 1], [72, 1], [71, 1]],
    [[69, 0.5], [69, 0.5], [74, 0.5], [69, 0.5], [66, 1], [62, 1]],
    [[63, 1], [66, 1], [71, 1.5, 'fall'], [0, 0.5]],
  ];
  const lead = (f, len, fall) => {
    const pf = (t) => f * (1 + 0.012 * smooth((t - 0.1) / 0.2) * Math.sin(TAU * 5.5 * t)) * (fall ? Math.pow(0.5, smooth((t - len * 0.35) / (len * 0.65))) : 1);
    let d = buf(len);
    const a = osc(len, pf, 'saw'), b2 = osc(len, (t) => pf(t) * 1.007, 'saw');
    for (let i = 0; i < d.length; i++) d[i] = (a[i] + b2[i]) * 0.5;
    d = lp(d, (t) => 1200 + 2500 * Math.exp(-t / 0.15), 1.5);
    return env(d, (t) => smooth(t / 0.01) * clamp((len - t) / 0.04, 0, 1));
  };
  for (let b = 16; b < 28; b++) { let t = b * bar; for (const [m, d, fx] of PH[(b - 16) % 4]) { if (m) putInto(LEADBUF, lead(midi(m), d * beat * 0.92, fx === 'fall'), t, 0.16); t += d * beat; } }
  // эхо на пунктирную восьмую для арпеджио и лида (закольцованное)
  echoLoop(ARPBUF, beat * 0.75, 0.38, 0.55); echoLoop(LEADBUF, beat * 0.75, 0.3, 0.35);
  for (let i = 0; i < T.out.length; i++) T.out[i] += ARPBUF[i] + LEADBUF[i];
  reverbLoop(T.out, { room: 0.8, damp: 0.45, wet: 0.16 });
  return T.out;
}

const which = process.argv[2];
if (!which || which === 'p1') finish('p1_fallback.wav', p1());
if (!which || which === 'p2') finish('p2_fallback.wav', p2());
