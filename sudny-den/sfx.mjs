// Процедурный Foley-синтезатор живых звуковых эффектов (шлепки падений, плеск воды, визг шин, шаги, стекло).
// Запуск: node sfx.mjs
import fs from 'node:fs';

const SR = 44100;
fs.mkdirSync('audio/sfx', { recursive: true });

let seed = 13379;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const u01 = () => (rnd() + 1) * 0.5;
const buf = sec => new Float32Array(Math.round(sec * SR));
const env = (t, a, d, len) => Math.min(1, t / Math.max(1e-5, a)) * Math.min(1, Math.max(0, (len - t) / Math.max(1e-5, d)));

function save(name, data, gain = 0.9) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const k = peak > 0 ? gain / peak : 1;
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) {
    const s = Math.tanh(data[i] * k * 1.05);
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
  fs.writeFileSync(`audio/sfx/${name}.wav`, Buffer.concat([h, pcm]));
  console.log('sfx', name, (data.length / SR).toFixed(2) + 's');
}

function lowpass(d, fc) {
  const a = Math.exp(-2 * Math.PI * fc / SR);
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    y = (1 - a) * d[i] + a * y;
    d[i] = y;
  }
  return d;
}

function highpass(d, fc) {
  const lp = lowpass(Float32Array.from(d), fc);
  for (let i = 0; i < d.length; i++) d[i] -= lp[i];
  return d;
}

// 2-полюсный резонансный полосовой фильтр (Biquad Bandpass) для реалистичных капель воды, шлепков и дерева/металла
function bandpass(d, fc, Q = 2.5) {
  const out = new Float32Array(d.length);
  const w0 = (2 * Math.PI * fc) / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x0 = d[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

// 1. Птицы утром (живые переливы и трели нескольких птиц)
{
  const d = buf(8);
  for (let n = 0; n < 52; n++) {
    const st = u01() * 7.5;
    const f0 = 2100 + u01() * 2400;
    const len = 0.07 + u01() * 0.14;
    const s0 = Math.round(st * SR);
    let ph = 0;
    for (let i = 0; i < len * SR && s0 + i < d.length; i++) {
      const t = i / SR;
      const fm = f0 + 650 * Math.sin(2 * Math.PI * 28 * t) + (n % 3 === 0 ? -1800 * t : 1200 * t);
      ph += (2 * Math.PI * fm) / SR;
      const e = Math.sin((Math.PI * t) / len) ** 1.6;
      d[s0 + i] += (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * e * 0.38;
    }
  }
  save('birds', d, 0.55);
}

// 2. Падение и шлепок птичек об асфальт (короткий свист вниз + 4 сочных маленьких шлепка «шмяк!»)
{
  const d = buf(0.95);
  const drops = [0.04, 0.16, 0.29, 0.42];
  for (let k = 0; k < drops.length; k++) {
    const st = drops[k];
    const s0 = Math.round(st * SR);
    // Маленький свист падения
    let ph = 0;
    for (let i = 0; i < Math.round(0.18 * SR) && s0 + i < d.length; i++) {
      const t = i / SR;
      const f = (2400 - k * 180) * Math.exp(-t * 5.5);
      ph += (2 * Math.PI * f) / SR;
      d[s0 + i] += Math.sin(ph) * Math.sin((Math.PI * t) / 0.18) * 0.25;
    }
    // Сочный маленький шлепок тушки об асфальт
    const imp = s0 + Math.round(0.16 * SR);
    let p2 = 0;
    for (let i = 0; i < Math.round(0.14 * SR) && imp + i < d.length; i++) {
      const t = i / SR;
      const f = 320 * Math.exp(-t * 28) + 95;
      p2 += (2 * Math.PI * f) / SR;
      const slapNoise = rnd() * Math.exp(-t * 95) * (t < 0.012 ? 1.4 : 0.4);
      const wet = Math.sin(2 * Math.PI * (900 + 400 * Math.sin(t * 220)) * t) * Math.exp(-t * 65) * 0.55;
      d[imp + i] += (Math.sin(p2) * Math.exp(-t * 26) * 0.7 + slapNoise + wet) * 0.85;
    }
  }
  save('bird_splat', d, 0.85);
}

// 3. Сочный шлепок падения человека плашмя об асфальт (body_slap — «ШЛЁП / ШМЯК» с глухим ударом тела и хлестким хлопком кожи/одежды)
function makeBodySlap(heavy = false) {
  const dur = heavy ? 0.85 : 0.65;
  const d = buf(dur);
  const slapLayer = buf(dur);
  const thudLayer = buf(dur);
  const clothLayer = buf(dur);

  let ph = 0, phSub = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    // 1) Мясистый низкочастотный удар тела о землю (грудная клетка / живот об асфальт)
    const fBody = (heavy ? 165 : 190) * Math.exp(-t * 26) + (heavy ? 48 : 58);
    ph += (2 * Math.PI * fBody) / SR;
    phSub += (2 * Math.PI * (fBody * 0.5)) / SR;
    thudLayer[i] = (Math.sin(ph) * 0.9 + Math.sin(phSub) * 0.65) * Math.exp(-t * (heavy ? 11 : 14));

    // 2) Двойной хлесткий «ШЛЕПОК» (сначала ладони/колени в t=0, через 18 мс — пузо/лицо об асфальт!)
    const dt2 = Math.max(0, t - 0.018);
    const snap1 = Math.exp(-t * 140) * (1 + 0.8 * Math.sin(2 * Math.PI * 1350 * t));
    const snap2 = (t >= 0.018 ? Math.exp(-dt2 * 85) : 0) * (1.3 + 0.9 * Math.sin(2 * Math.PI * 980 * dt2));
    slapLayer[i] = rnd() * (snap1 + snap2) * 1.4;

    // 3) Шорох одежды / скольжение по асфальту после падения
    if (t > 0.03) {
      const st = t - 0.03;
      clothLayer[i] = rnd() * Math.exp(-st * (heavy ? 5.5 : 8.5)) * (0.45 + 0.25 * Math.sin(st * 45));
    }
  }

  const bpSlap1 = bandpass(slapLayer, 1150, 1.4);
  const bpSlap2 = bandpass(slapLayer, 2600, 1.8);
  const bpCloth = bandpass(clothLayer, 1800, 1.2);

  for (let i = 0; i < d.length; i++) {
    d[i] = thudLayer[i] * 1.1 + bpSlap1[i] * 1.35 + bpSlap2[i] * 0.95 + bpCloth[i] * 0.65;
  }
  return d;
}
save('body_slap', makeBodySlap(false), 0.92);
save('body_slap_heavy', makeBodySlap(true), 0.95);
save('thud', makeBodySlap(false), 0.88);

// 4. Хлесткий пинок ногой + свист отлетающего Босса (kick_smack)
{
  const d = buf(0.95);
  let ph = 0, phFly = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    // Свист замаха ноги (0..0.08s)
    const swing = t < 0.12 ? rnd() * Math.sin((Math.PI * t) / 0.12) ** 2 * 0.7 : 0;
    // Сочный удар ботинком + звонкий шлепок (0.06s)
    const kt = Math.max(0, t - 0.055);
    const hit = t >= 0.055 ? (
      Math.sin((ph += (2 * Math.PI * (240 * Math.exp(-kt * 32) + 65)) / SR)) * Math.exp(-kt * 16) * 1.2 +
      rnd() * Math.exp(-kt * 110) * 1.5
    ) : 0;
    // Мультяшный свист улетающего в воздухе тела (0.10..0.85s)
    let whistle = 0;
    if (t >= 0.09 && t < 0.85) {
      const wt = t - 0.09;
      const wf = 680 + 420 * Math.sin(wt * 4.2) - wt * 480 + 90 * Math.sin(wt * 38);
      phFly += (2 * Math.PI * wf) / SR;
      whistle = Math.sin(phFly) * Math.sin((Math.PI * wt) / 0.76) * 0.28;
    }
    d[i] = swing + hit + whistle;
  }
  save('kick_smack', d, 0.92);
}

// 5. Приземление на ноги (foot_land) и быстрый бег по асфальту (footsteps_run / footsteps_sprint)
{
  const d = buf(0.35);
  const steps = [0.0, 0.055];
  for (const st of steps) {
    const s0 = Math.round(st * SR);
    let ph = 0;
    for (let i = 0; i < Math.round(0.14 * SR) && s0 + i < d.length; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (160 * Math.exp(-t * 35) + 55)) / SR;
      d[s0 + i] += Math.sin(ph) * Math.exp(-t * 25) * 0.8 + rnd() * Math.exp(-t * 90) * 0.7;
    }
  }
  save('foot_land', d, 0.85);
}

function makeFootsteps(sec, stepInterval = 0.14) {
  const d = buf(sec);
  let idx = 0;
  for (let st = 0.02; st < sec - 0.12; st += stepInterval * (0.94 + u01() * 0.12)) {
    const s0 = Math.round(st * SR);
    const fBase = idx % 2 === 0 ? 175 : 195;
    idx++;
    let ph = 0;
    for (let i = 0; i < Math.round(0.09 * SR) && s0 + i < d.length; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (fBase * Math.exp(-t * 40) + 65)) / SR;
      const heel = Math.sin(ph) * Math.exp(-t * 35) * 0.65;
      const soleSlap = rnd() * Math.exp(-t * 115) * (0.85 + 0.4 * Math.sin(2 * Math.PI * 1400 * t));
      d[s0 + i] += (heel + soleSlap) * 0.7;
    }
  }
  return d;
}
save('footsteps_run', makeFootsteps(3.6, 0.145), 0.75);
save('footsteps_sprint', makeFootsteps(3.6, 0.105), 0.80);

// 6. Уведомление Steam / Rockstar (яркий сочный аккорд)
{
  const d = buf(1.2);
  const notes = [[0, 1318.5], [0.11, 1975.5], [0.22, 2637]];
  for (const [st, f] of notes) {
    const s0 = Math.round(st * SR);
    for (let i = 0; i < 0.9 * SR && s0 + i < d.length; i++) {
      const t = i / SR;
      d[s0 + i] += (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t)) * Math.exp(-t * 5.2);
    }
  }
  save('notify', d, 0.9);
}

// 7. Разбитие офисного окна: мощный удар рамы + взрыв стекла + десятки осыпающихся на тротуар осколков!
{
  const d = buf(1.85);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    // Пробитие рамы и стекла
    ph += (2 * Math.PI * (180 * Math.exp(-t * 25) + 60)) / SR;
    const punch = Math.sin(ph) * Math.exp(-t * 14) * 0.85;
    const burst = rnd() * Math.exp(-t * 9.5) * 1.1;
    d[i] = punch + burst;
  }
  const hi = highpass(Float32Array.from(d), 2600);
  for (let i = 0; i < d.length; i++) d[i] = d[i] * 0.45 + hi[i] * 0.95;

  // Отдельные звенящие осколки стекла, падающие и прыгающие по асфальту (0.05..1.65s)
  for (let k = 0; k < 55; k++) {
    const st = 0.03 + (u01() ** 1.4) * 1.45;
    const s0 = Math.round(st * SR);
    const f1 = 3200 + u01() * 5800;
    const f2 = f1 * (1.34 + u01() * 0.25);
    const shardDur = 0.04 + u01() * 0.12;
    for (let i = 0; i < shardDur * SR && s0 + i < d.length; i++) {
      const t = i / SR;
      const ring = (Math.sin(2 * Math.PI * f1 * t) + 0.6 * Math.sin(2 * Math.PI * f2 * t)) * Math.exp(-t * 28);
      const click = rnd() * Math.exp(-t * 180) * 0.8;
      d[s0 + i] += (ring + click) * (0.35 * (1 - st / 1.8));
    }
  }
  save('glass', d, 0.92);
}

// 8. Визг тормозов / шин по асфальту (tire_screech)
{
  const d = buf(1.15);
  let ph1 = 0, ph2 = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const e = env(t, 0.04, 0.18, 1.15);
    const f1 = 1080 + 140 * Math.sin(t * 24) - t * 160 + rnd() * 45;
    const f2 = 1620 + 190 * Math.cos(t * 19) - t * 210 + rnd() * 65;
    ph1 += (2 * Math.PI * f1) / SR;
    ph2 += (2 * Math.PI * f2) / SR;
    const squeal = Math.tanh((Math.sin(ph1) * 0.7 + Math.sin(ph2) * 0.55 + rnd() * 0.35) * 2.2);
    d[i] = squeal * e * (0.75 + 0.25 * Math.sin(t * 38));
  }
  const bp = bandpass(d, 1450, 1.4);
  save('tire_screech', bp, 0.78);
}

// 9. Столкновение броневиков: мощный металлический удар, скрежет кузова и осыпающиеся фары
function boom(sec, fc, decay) {
  const d = buf(sec);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = rnd() * Math.exp(-t * decay) + Math.sin(2 * Math.PI * (65 - 32 * Math.min(1, t)) * t) * Math.exp(-t * decay * 0.65);
  }
  return lowpass(d, fc);
}
save('explosion', boom(6, 260, 0.8));

{
  const d = boom(2.6, 1800, 3.2);
  // Резонансные удары листового металла и брони
  const metalFreqs = [310, 465, 680, 940, 1380, 2150];
  for (let k = 0; k < 18; k++) {
    const f = metalFreqs[k % metalFreqs.length] * (0.9 + u01() * 0.25);
    const st = u01() * 0.28;
    const s0 = Math.round(st * SR);
    for (let i = 0; i < 1.2 * SR && s0 + i < d.length; i++) {
      const t = i / SR;
      d[s0 + i] += Math.tanh(Math.sin(2 * Math.PI * f * t + 0.4 * Math.sin(2 * Math.PI * f * 1.41 * t)) * 2.5) * Math.exp(-t * (6 + (k % 4) * 3)) * 0.18;
    }
  }
  save('carcrash', d, 0.92);
}

// 10. Падение мешков с деньгами и разлетающиеся пачки купюр (money_spill)
{
  const d = buf(1.6);
  // 6 тяжёлых брезентовых мешков падают на асфальт со шлепком и звоном монет
  const bagTimes = [0.04, 0.14, 0.23, 0.34, 0.46, 0.58];
  for (let b = 0; b < bagTimes.length; b++) {
    const s0 = Math.round(bagTimes[b] * SR);
    let ph = 0;
    for (let i = 0; i < Math.round(0.22 * SR) && s0 + i < d.length; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (135 * Math.exp(-t * 25) + 48)) / SR;
      const sack = Math.sin(ph) * Math.exp(-t * 18) * 0.75 + rnd() * Math.exp(-t * 55) * 0.6;
      const coins = (Math.sin(2 * Math.PI * 3800 * t) + Math.sin(2 * Math.PI * 5100 * t)) * Math.exp(-t * 35) * 0.18;
      d[s0 + i] += (sack + coins) * 0.75;
    }
  }
  // Шелест разлетающихся бумажных купюр
  for (let f = 0; f < 22; f++) {
    const s0 = Math.round((0.1 + u01() * 1.25) * SR);
    for (let i = 0; i < Math.round(0.065 * SR) && s0 + i < d.length; i++) {
      const t = i / SR;
      d[s0 + i] += rnd() * Math.sin((Math.PI * t) / 0.065) * 0.28;
    }
  }
  save('money_spill', d, 0.85);
}

// 11. Живая вода из бешеного пожарного шланга (water.wav):
// Напор из брандспойта + бульканье + сотни сочных капель и шлепков воды по лужам и асфальту!
{
  const dur = 5.5;
  const d = buf(dur);
  const stream = buf(dur);
  const slapDrops = buf(dur);

  // А) Пульсирующая струя под давлением (вращающийся шланг)
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const whipMod = 0.65 + 0.35 * Math.sin(t * 14) * Math.cos(t * 9);
    stream[i] = rnd() * whipMod * 0.38;
  }
  const streamBp1 = bandpass(stream, 950, 1.1);
  const streamBp2 = bandpass(stream, 2400, 1.5);
  for (let i = 0; i < d.length; i++) {
    d[i] = streamBp1[i] * 0.75 + streamBp2[i] * 0.55;
  }

  // Б) Реалистичное бульканье и резонансные капли воды (частота взлетает вверх при схлопывании пузырька воздуха в воде!)
  for (let k = 0; k < 420; k++) {
    const st = u01() * (dur - 0.12);
    const s0 = Math.round(st * SR);
    const dropDur = 0.018 + u01() * 0.045;
    const fStart = 380 + u01() * 1450;
    const fEnd = fStart * (1.45 + u01() * 0.65);
    let ph = 0;
    const amp = 0.18 + u01() * 0.28;
    for (let i = 0; i < dropDur * SR && s0 + i < d.length; i++) {
      const t = i / SR;
      const p = t / dropDur;
      // Физика капли/пузырька воды: частота быстро растёт к концу импульса
      const f = fStart + (fEnd - fStart) * (p * p);
      ph += (2 * Math.PI * f) / SR;
      const e = Math.sin(Math.PI * p) * Math.exp(-p * 2.2);
      d[s0 + i] += Math.sin(ph) * e * amp;
    }
  }

  // В) Ритмичные мокрые шлепки струи воды об асфальт и разбрызгивание луж (когда шланг хлещет по дороге)
  for (let k = 0; k < 95; k++) {
    const st = u01() * (dur - 0.18);
    const s0 = Math.round(st * SR);
    const splashDur = 0.05 + u01() * 0.09;
    for (let i = 0; i < splashDur * SR && s0 + i < slapDrops.length; i++) {
      const t = i / SR;
      slapDrops[s0 + i] += rnd() * Math.exp(-t * 38) * (0.7 + 0.5 * Math.sin(2 * Math.PI * 650 * t));
    }
  }
  const wetSplashLo = bandpass(slapDrops, 680, 1.6);
  const wetSplashHi = bandpass(slapDrops, 1850, 1.4);
  for (let i = 0; i < d.length; i++) {
    d[i] += wetSplashLo[i] * 1.15 + wetSplashHi[i] * 0.95;
  }

  save('water', d, 0.88);
}

// 12. Свист кадра (whoosh)
{
  const d = buf(0.5);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = rnd() * Math.sin((Math.PI * t) / 0.5) ** 2;
  }
  lowpass(d, 1800);
  save('whoosh', d, 0.7);
}

// 13. Пожарная сирена (с реалистичным эффектом Доплера и гармониками)
{
  const d = buf(6.5);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const doppler = t < 1.5 ? 1.04 : (1.0 - Math.min(0.06, (t - 1.5) * 0.08));
    const f = (680 + 460 * Math.sin(2 * Math.PI * 0.55 * t)) * doppler;
    ph += (2 * Math.PI * f) / SR;
    d[i] = Math.sin(ph) + 0.32 * Math.sin(2 * ph) + 0.18 * Math.sin(3 * ph);
  }
  save('firesiren', d, 0.62);
}

// 14. Треск и гул пламени горящего здания (fire.wav)
{
  const d = buf(10);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = rnd() * (0.22 + 0.1 * Math.sin(t * 7.5));
  }
  lowpass(d, 480);
  // Реалистичное потрескивание углей и горящих досок
  const crackle = buf(10);
  for (let k = 0; k < 420; k++) {
    const s0 = (u01() * (d.length - 600)) | 0;
    for (let i = 0; i < 320; i++) {
      crackle[s0 + i] += rnd() * Math.exp(-i / 45) * 0.8;
    }
  }
  const bpCrackle = bandpass(crackle, 2400, 1.5);
  for (let i = 0; i < d.length; i++) d[i] += bpCrackle[i] * 0.85;
  save('fire', d, 0.65);
}

// 15. Остальные эффекты для сцен 2–4 (клаксон, реактор, кардиомонитор, питание, сирена, потрачено, клики, хор)
{
  const d = buf(4);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const on = (t % 1) < 0.6;
    const f = (t % 1) < 0.3 ? 520 : 440;
    ph += (2 * Math.PI * f) / SR;
    d[i] = on ? Math.sign(Math.sin(ph)) * 0.6 + Math.sin(ph * 2) * 0.2 : 0;
  }
  lowpass(d, 3000);
  save('klaxon', d, 0.6);
}

{
  const d = buf(6);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = rnd() * 0.6 + Math.sin(2 * Math.PI * 45 * t) * (0.5 + t / 6);
  }
  lowpass(d, 120);
  save('rumble', d);
}

{
  const d = buf(0.15);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = Math.sin(2 * Math.PI * 1000 * t) * env(t, 0.005, 0.02, 0.15);
  }
  save('beep', d, 0.5);
}

{
  const d = buf(4);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = Math.sin(2 * Math.PI * 1000 * t) * env(t, 0.01, 0.3, 4);
  }
  save('flatline', d, 0.4);
}

{
  const d = buf(1.6);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 900 * Math.exp(-t * 3) + 30;
    ph += (2 * Math.PI * f) / SR;
    d[i] = ((ph / Math.PI) % 2 - 1) * Math.exp(-t * 1.5);
  }
  lowpass(d, 2500);
  save('powerdown', d);
}

{
  const d = buf(0.8);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = (i < 400 ? rnd() : 0) + Math.sin(2 * Math.PI * 15000 * t) * 0.1 * Math.exp(-t * 4) + Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 20);
  }
  save('screenoff', d);
}

{
  const d = buf(9);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 250 + 300 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 9));
    ph += (2 * Math.PI * f) / SR;
    d[i] = Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph);
  }
  save('airraid', d, 0.6);
}

{
  const d = buf(4);
  const fr = [55, 82.4, 110, 130.8, 164.8];
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const f of fr) s += Math.sin(2 * Math.PI * f * (1 - 0.04 * t) * t) + 0.5 * Math.sign(Math.sin(2 * Math.PI * f * 2 * t)) * 0.2;
    d[i] = s * Math.exp(-t * 0.9) * Math.min(1, t / 0.01) + rnd() * Math.exp(-t * 8) * 0.8;
  }
  lowpass(d, 1500);
  save('wasted', d);
}

{
  const d = buf(3);
  for (let k = 0; k < 30; k++) {
    const s0 = (u01() * (d.length - 2000)) | 0;
    for (let i = 0; i < 600; i++) d[s0 + i] += rnd() * Math.exp(-i / 80);
  }
  highpass(d, 1500);
  save('clicks', d, 0.4);
}

{
  const d = buf(5);
  const fr = [261.6, 329.6, 392, 523.3, 659.3];
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const f of fr) s += Math.sin(2 * Math.PI * f * t + 0.3 * Math.sin(2 * Math.PI * 5 * t));
    d[i] = s * env(t, 1.2, 1.5, 5);
  }
  save('angelic', d, 0.5);
}
