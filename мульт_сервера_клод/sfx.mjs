// Процедурные звуковые эффекты для «Серверов Клода». Запуск: node sfx.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const OUT = path.join(__dirname, 'audio', 'sfx');
fs.mkdirSync(OUT, { recursive: true });

let seed = 4181;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const u01 = () => (rnd() + 1) * 0.5;
const buf = (sec) => new Float32Array(Math.round(sec * SR));

function save(name, data, gain = 0.9) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const k = peak > 0 ? gain / peak : 1;
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Math.tanh(data[i] * k))) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([h, pcm]));
  console.log('sfx', name, (data.length / SR).toFixed(2) + 's');
}

function lowpass(d, fc) {
  const a = Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  for (let i = 0; i < d.length; i++) { y = (1 - a) * d[i] + a * y; d[i] = y; }
  return d;
}
function highpass(d, fc) {
  const lp = lowpass(Float32Array.from(d), fc);
  for (let i = 0; i < d.length; i++) d[i] -= lp[i];
  return d;
}
function bandpass(d, fc, Q = 2.5) {
  const out = new Float32Array(d.length);
  const w0 = (2 * Math.PI * fc) / SR, alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x0 = d[i];
    const y0 = (alpha * x0 - alpha * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y0; x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}
const addClick = (d, at, len, fc, amp) => {
  const n = Math.round(len * SR), s = Math.round(at * SR);
  let tmp = new Float32Array(n);
  for (let i = 0; i < n; i++) tmp[i] = rnd() * Math.exp(-i / (n * 0.18));
  tmp = bandpass(tmp, fc, 1.6);
  for (let i = 0; i < n && s + i < d.length; i++) d[s + i] += tmp[i] * amp;
};

// 1. Механическая клавиатура (один человек, 2.5 сек)
{
  const d = buf(2.5);
  let t = 0.02;
  while (t < 2.4) { addClick(d, t, 0.035, 2600 + u01() * 1800, 0.6 + u01() * 0.4); addClick(d, t + 0.012, 0.05, 700, 0.35); t += 0.06 + u01() * 0.11; }
  save('keys_single', d, 0.7);
}

// 2. Офис на тысячи клавиатур + гул вентиляторов (6 сек, лупится)
{
  const d = buf(6);
  for (let k = 0; k < 900; k++) addClick(d, u01() * 5.95, 0.03, 1800 + u01() * 3000, 0.25 + u01() * 0.35);
  const hum = buf(6);
  for (let i = 0; i < hum.length; i++) hum[i] = rnd();
  lowpass(hum, 220);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] += hum[i] * 3.2 + Math.sin(2 * Math.PI * 50 * t) * 0.05 + Math.sin(2 * Math.PI * 4.2 * t) * hum[i] * 0.8;
  }
  save('office_room', d, 0.6);
}

// 3. Вжух (перелёт сквозь монитор/облака), 1.6 сек
{
  const d = buf(1.6);
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    const p = i / d.length;
    const fc = 300 + Math.sin(Math.PI * p) * 3800;
    const a = Math.exp((-2 * Math.PI * fc) / SR);
    y = (1 - a) * rnd() + a * y;
    d[i] = y * Math.sin(Math.PI * p) ** 1.5;
  }
  save('whoosh', d, 0.85);
}

// 4. Сирена-тревога (2.6 сек)
{
  const d = buf(2.6);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 620 + 380 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 1.6 * t));
    ph += (2 * Math.PI * f) / SR;
    d[i] = (Math.sign(Math.sin(ph)) * 0.4 + Math.sin(ph) * 0.6) * Math.min(1, t * 20) * Math.min(1, (2.6 - t) * 6);
  }
  save('siren', lowpass(d, 3500), 0.7);
}

// 5. Фидбэк мегафона (0.7 сек)
{
  const d = buf(0.7);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = Math.sin(2 * Math.PI * (2400 + t * 900) * t) * Math.min(1, t * 12) * Math.exp(-t * 3) + rnd() * 0.05;
  }
  save('mega_feedback', d, 0.5);
}

// 6. Удар линейкой по столу
{
  const d = buf(0.5);
  addClick(d, 0, 0.06, 2200, 1);
  for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] += Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 18) * 0.6 + Math.sin(2 * Math.PI * 610 * t) * Math.exp(-t * 25) * 0.3; }
  save('ruler_slap', d, 0.9);
}

// 7. Падение лицом на клавиатуру (глухой удар + рассыпанные клики)
{
  const d = buf(1.0);
  for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = Math.sin(2 * Math.PI * (90 - t * 40) * t) * Math.exp(-t * 9) * 1.2 + rnd() * Math.exp(-t * 30) * 0.4; }
  for (let k = 0; k < 14; k++) addClick(d, 0.01 + u01() * 0.12, 0.03, 2000 + u01() * 2500, 0.5);
  save('faceplant', d, 0.95);
}

// 8. Большая красная кнопка (клац + низкий гудок отключения)
{
  const d = buf(1.6);
  addClick(d, 0, 0.05, 1500, 1.2);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR - 0.08;
    if (t < 0) continue;
    const f = 140 - t * 60;
    d[i] += (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sign(Math.sin(2 * Math.PI * f * t))) * Math.exp(-t * 1.6) * 0.5;
  }
  save('power_down', lowpass(d, 2500), 0.85);
}

// 9. Сообщение отправлено / дзынь уведомления
{
  const d = buf(0.6);
  for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (Math.sin(2 * Math.PI * 1320 * t) + 0.6 * Math.sin(2 * Math.PI * 1980 * t)) * Math.exp(-t * 7) * (t > 0.09 ? 1 : 0.6); }
  save('ding', d, 0.6);
}

// 10. Ошибка лимита (низкий «бззт»)
{
  const d = buf(0.7);
  for (let i = 0; i < d.length; i++) { const t = i / SR; const g = t < 0.28 || (t > 0.36 && t < 0.64) ? 1 : 0; d[i] = Math.sign(Math.sin(2 * Math.PI * 110 * t)) * 0.5 * g; }
  save('error_buzz', lowpass(d, 1600), 0.6);
}

// 11. Тик счётчика токенов (кассовый щелчок)
{
  const d = buf(0.08);
  addClick(d, 0, 0.05, 3800, 1);
  save('tick', d, 0.5);
}

// 12. Старый дисковый телефон: снятие трубки
{
  const d = buf(0.6);
  addClick(d, 0, 0.06, 900, 1);
  addClick(d, 0.09, 0.05, 1600, 0.6);
  for (let i = 0; i < d.length; i++) { const t = i / SR - 0.15; if (t > 0) d[i] += Math.sin(2 * Math.PI * 425 * t) * 0.15 * Math.exp(-t * 4); }
  save('phone_pickup', d, 0.7);
}

// 13. Толпа падающих тел (несколько глухих ударов вразнобой)
{
  const d = buf(1.6);
  for (let k = 0; k < 9; k++) {
    const st = Math.round((0.05 + u01() * 1.3) * SR);
    const f0 = 70 + u01() * 50;
    for (let i = 0; i < SR * 0.4 && st + i < d.length; i++) { const t = i / SR; d[st + i] += Math.sin(2 * Math.PI * f0 * t) * Math.exp(-t * 11) * (0.5 + u01() * 0.2) + rnd() * Math.exp(-t * 40) * 0.15; }
  }
  save('bodies_thud', d, 0.85);
}

// 14. Глоток смузи через трубочку
{
  const d = buf(0.9);
  for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = rnd() * (0.5 + 0.5 * Math.sin(2 * Math.PI * 9 * t)) * Math.min(1, t * 10) * Math.min(1, (0.9 - t) * 8); }
  save('slurp', highpass(bandpass(d, 1400, 1.2), 300), 0.6);
}
