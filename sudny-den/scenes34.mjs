// Отрисовка Сцены 3 (Операционная), Сцены 4 (Руины города и финал) и субтитров в 2.5D/3D-стиле
import {
  W, H, G, hash, clamp, lerp, seg, ease, easeOut, backOut, shade, gradV, gradSphere,
  rrect, panel3D, text, camera, screen, overlay, glow, person, gamepad, scalpel,
} from './engine_hd.mjs';
import { mouthOf, drawPhoneProp } from './scenes12.mjs';

const heartProp = (t) => (ctx) => {
  const pulse = 1 + 0.12 * Math.sin(t * 9);
  ctx.save(); ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.arc(-9, -4, 14, 0, Math.PI * 2);
  ctx.arc(9, -4, 14, 0, Math.PI * 2);
  ctx.moveTo(-22, 0); ctx.lineTo(0, 30); ctx.lineTo(22, 0);
  ctx.fillStyle = gradSphere(ctx, 0, 4, 24, '#dc2626'); ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = '#450a0a'; ctx.stroke();
  ctx.restore();
};

const mopToasterGun = (ctx, x, y, rot = -0.45) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  panel3D(ctx, -140, -9, 225, 18, '#a16207', 4, '#451a03', 2.2); // черенок швабры
  panel3D(ctx, -156, -34, 26, 68, '#78350f', 5, '#451a03', 2.4); // перекладина швабры
  panel3D(ctx, 34, -36, 98, 64, '#cbd5e1', 10, '#1e293b', 2.8); // тостер-ствол
  panel3D(ctx, 50, -42, 22, 9, '#0f172a', 2, '#000', 1);
  panel3D(ctx, 82, -42, 22, 9, '#0f172a', 2, '#000', 1);
  panel3D(ctx, 42, -39, 18, 70, '#2563eb', 3, '#1e3a8a', 1.8); // синяя изолента
  panel3D(ctx, 98, -39, 18, 70, '#2563eb', 3, '#1e3a8a', 1.8);
  ctx.beginPath(); ctx.ellipse(134, -6, 9, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#475569'; ctx.stroke();
  ctx.restore();
};

// ---------- СЦЕНА 3: Медицина бессильна ----------
export function drawScene3(ctx, t, tl) {
  const c = tl.cues;
  const s3s = tl.scenes.s3.start;
  const flicker = t >= c.s3_blackout && t < c.s3_blackout + 0.85 ? (Math.sin(t * 48) > 0 ? 1 : 0) : null;
  const dark = flicker !== null ? flicker === 0 : t >= c.s3_blackout + 0.85;
  const maskRipped = t >= c.s3_maskrip;
  const heartOut = t >= tl.lines.s3_anest3.start - 0.6;
  const runDt = t >= c.s3_runout ? t - c.s3_runout : 0;

  let cx = W / 2, cy = H / 2, cz = 1.0, shake = 0;
  if (t < c.s3_blackout + 0.5 && t > c.s3_blackout - 0.2) shake = 12;
  if (mouthOf(tl, 's3_anest1', t) > 0.05 || mouthOf(tl, 's3_anest3', t) > 0.05) {
    cx = 1260; cy = 510; cz = 1.32;
  } else if (mouthOf(tl, 's3_surg2', t) > 0.05 || mouthOf(tl, 's3_surg3', t) > 0.05) {
    cx = 670; cy = 510; cz = 1.35;
    if (mouthOf(tl, 's3_surg3', t) > 0.2) shake = 4;
  }

  camera(ctx, cx, cy, cz, shake);

  ctx.fillStyle = gradV(ctx, 0, 0, 0, H, dark ? '#1a0609' : '#c7e5ea', dark ? '#2a090d' : '#a8d3dc', dark ? '#120406' : '#85bac5');
  ctx.fillRect(-100, -50, W + 200, H + 100);
  panel3D(ctx, -100, 680, W + 200, 450, dark ? '#180709' : '#84b2bc', 0, '#0f172a', 3);
  ctx.strokeStyle = dark ? 'rgba(255,60,60,0.08)' : 'rgba(15,23,42,0.08)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(120 + i * 240, 0); ctx.lineTo(120 + i * 240, 680); ctx.stroke(); }

  const alarmGlow = dark ? (0.28 + 0.14 * Math.sin(t * 5)) : 0;
  if (dark) glow(ctx, 220, 80, 260, '#ef4444', 0.55);
  panel3D(ctx, 188, 60, 64, 34, dark ? '#ff2424' : '#475569', 10, '#111', 2);
  panel3D(ctx, 740, 85, 440, 62, dark ? '#261e20' : '#f8fafc', 14, '#334155', 3);
  if (!dark) {
    ctx.save(); ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath(); ctx.moveTo(780, 145); ctx.lineTo(560, 820); ctx.lineTo(1360, 820); ctx.lineTo(1140, 145); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Кардиомонитор
  panel3D(ctx, 1380, 360, 260, 185, '#1e293b', 10, '#0f172a', 3);
  panel3D(ctx, 1396, 376, 228, 130, '#04120c', 6, '#334155', 2);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const px = 1404 + i * 9.2, phase = ((i / 24 + t * 1.4) % 1);
    const spike = phase > 0.42 && phase < 0.52 ? -36 : (phase >= 0.52 && phase < 0.6 ? 18 : 0);
    if (i === 0) ctx.moveTo(px, 442 + spike); else ctx.lineTo(px, 442 + spike);
  }
  ctx.lineWidth = 3.5; ctx.strokeStyle = '#22c55e'; ctx.stroke();
  text(ctx, dark ? 'ИВЛ: АВТОНОМНО' : 'ПУЛЬС: 82', 1510, 492, 18, dark ? '#facc15' : '#4ade80', 'Consolas');

  // Операционный стол и пациент с открытой грудной клеткой
  panel3D(ctx, 730, 725, 460, 75, '#475569', 10, '#1e293b', 3);
  panel3D(ctx, 920, 795, 80, 150, '#334155', 6, '#0f172a', 3);
  ctx.beginPath(); ctx.arc(765, 675, 44, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, 765, 675, 44, '#e2b591'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1d1612'; ctx.stroke();
  panel3D(ctx, 810, 665, 360, 72, '#2563eb', 8, '#1e3a8a', 2.5);
  ctx.beginPath(); ctx.ellipse(940, 668, 56, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7f1d1d'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#450a0a'; ctx.stroke();
  ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 4;
  for (let r = -2; r <= 2; r++) { ctx.beginPath(); ctx.moveTo(940 + r * 16, 650); ctx.lineTo(940 + r * 16, 686); ctx.stroke(); }
  if (!heartOut) {
    const hr = 17 + Math.sin(t * 8) * 3;
    ctx.beginPath(); ctx.ellipse(940, 666, hr, hr * 0.78, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, 940, 666, hr, '#ef4444'); ctx.fill();
  }

  if (maskRipped) {
    panel3D(ctx, 520, 932, 68, 32, '#93c5fd', 8, '#1e3a8a', 2);
  }

  // Хирург
  const surgSpeak = Math.max(mouthOf(tl, 's3_surg1', t), mouthOf(tl, 's3_surg2', t), mouthOf(tl, 's3_surg3', t), mouthOf(tl, 's3_surg4', t));
  const droppedArm = t >= c.s3_silence;
  const surgX = 630 + runDt * 1150;
  if (surgX < W + 260) {
    person(ctx, {
      x: surgX, y: 945, s: 0.92, seed: 660, build: 'normal',
      shirt: '#14b8a6', outfit: 'scrubs', coat: '#f8fafc', pants: '#0f766e', glove: '#7dd3fc',
      cap: '#14b8a6', mask: maskRipped ? null : '#9ce2eb',
      eyes: maskRipped ? 'red' : (t >= c.s3_silence ? 'wide' : 'normal'),
      brow: maskRipped ? -1.1 : (t >= c.s3_silence ? 1.0 : -0.3),
      mood: maskRipped ? 'scream' : 'frown', mouth: surgSpeak,
      run: runDt > 0 ? t * 15 : null,
      arms: runDt > 0 ? { l: [1.1, 0.7], r: [-0.8, -0.6] } : { l: [0.3, 0.2], r: droppedArm ? [0.15, 0.1] : [-0.45, -0.75] },
      holdR: scalpel,
    });
  }

  // Анестезиолог Серёга
  const anestSpeak = Math.max(mouthOf(tl, 's3_anest1', t), mouthOf(tl, 's3_anest2', t), mouthOf(tl, 's3_anest3', t));
  const anestX = 1280 + runDt * 1200;
  if (anestX < W + 260) {
    person(ctx, {
      x: anestX, y: 945, s: 0.90, flip: -1, seed: 665, build: 'lean',
      shirt: '#2563eb', outfit: 'scrubs', pants: '#1d4ed8', glove: '#7dd3fc',
      cap: '#2563eb', mask: '#9ce2eb', glasses: true,
      eyes: heartOut ? 'wide' : 'lidded', brow: heartOut ? 1.0 : 0,
      mood: 'flat', mouth: anestSpeak,
      run: runDt > 0 ? t * 15 + 1 : null,
      arms: { l: [-0.45, -0.75], r: [0.25, 0.2] },
      holdL: heartOut ? heartProp(t) : drawPhoneProp('#bae6fd', 'НОВОСТИ'),
    });
  }

  if (dark) overlay(ctx, '#ff1010', alarmGlow);
  if (t - s3s < 0.7) overlay(ctx, '#ffffff', 1 - (t - s3s) / 0.7);
}

// ---------- СЦЕНА 4: Новый дивный мир ----------
export function drawScene4(ctx, t, tl) {
  const c = tl.cues;
  const s4s = tl.scenes.s4.start;
  if (t >= c.s4_black) { drawS4Wasted(ctx, t, tl); return; }
  if (t < c.s4_oleg_shot) drawS4Flyover(ctx, t, s4s, c.s4_oleg_shot);
  else drawS4Oleg(ctx, t, tl);
}

function drawNuclearBackdrop(ctx, t, mx = 1520, my = 440, scale = 1.0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#07050c');
  g.addColorStop(0.55, '#2b1016');
  g.addColorStop(1, '#541b12');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -100, W + 600, H + 200);

  ctx.save(); ctx.translate(mx, my); ctx.scale(scale, scale);
  glow(ctx, 0, -120, 340, '#f97316', 0.45 + 0.1 * Math.sin(t * 4));
  panel3D(ctx, -44, -110, 88, 290, '#7c2d12', 12, '#431407', 3);
  ctx.beginPath(); ctx.ellipse(0, -135, 195, 82, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, 0, -135, 195, '#ea580c'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#431407'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-45, -146, 105, 48, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, -45, -146, 105, '#fb923c'); ctx.fill();
  ctx.beginPath(); ctx.ellipse(52, -140, 98, 44, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, 52, -140, 98, '#facc15'); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -30, 110, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, 0, -30, 110, '#9a3412'); ctx.fill();
  ctx.restore();
}

function drawS4Flyover(ctx, t, start, end) {
  const p = ease(seg(t, start, end));
  camera(ctx, lerp(780, 1160, p), H / 2, 1.02);
  drawNuclearBackdrop(ctx, t, 1520, 440, 1.05);

  for (const [rx, ry, rw, rh] of [[60, 320, 210, 490], [290, 410, 230, 400], [560, 290, 200, 520], [820, 380, 260, 430], [1160, 340, 220, 470], [1640, 360, 260, 450]]) {
    panel3D(ctx, rx, ry, rw, rh, '#1a1520', 6, '#09070d', 3);
    for (let w = 0; w < 3; w++) panel3D(ctx, rx + 35 + w * 55, ry + 85 + (w % 2) * 80, 30, 36, w % 2 ? '#f97316' : '#09070d', 4, '#000', 1.5);
  }

  panel3D(ctx, -300, 800, W + 600, 350, '#1f1d24', 0, '#09090b', 3);
  panel3D(ctx, 280, 710, 270, 95, '#3b2424', 10, '#1c1917', 3);
  for (let f = 0; f < 5; f++) {
    const fx = 310 + f * 52, fh = 75 + Math.sin(t * 15 + f) * 28;
    glow(ctx, fx, 700, 70, '#f97316', 0.35);
    ctx.beginPath(); ctx.moveTo(fx - 26, 715); ctx.quadraticCurveTo(fx, 715 - fh * 1.2, fx + 26, 715); ctx.closePath();
    ctx.fillStyle = f % 2 ? '#ef4444' : '#facc15'; ctx.fill();
  }

  const tussle = Math.sin(t * 18) * 18;
  person(ctx, {
    x: 840 + tussle, y: 895, s: 0.68, seed: 740, build: 'stocky',
    shirt: '#4b5563', pants: '#1f2937', hair: 'messy',
    eyes: 'red', mood: 'scream', mouth: 0.7,
    arms: { l: [1.1, 0.2], r: [1.3, 0.1] },
  });
  person(ctx, {
    x: 1020 - tussle, y: 895, s: 0.68, flip: -1, seed: 741, build: 'lean',
    shirt: '#78350f', pants: '#1c1917', cap: '#dc2626',
    eyes: 'red', mood: 'scream', mouth: 0.8,
    arms: { l: [1.2, 0.2], r: [1.1, 0.1] },
  });
  panel3D(ctx, 895, 760 + tussle * 0.4, 52, 64, '#dc2626', 6, '#450a0a', 2.5);
  text(ctx, 'БЕНЗИН', 921, 795 + tussle * 0.4, 13, '#fff', 'Arial');
  panel3D(ctx, 945, 720 - tussle * 0.3, 62, 34, '#38bdf8', 6, '#0c4a6e', 2.5);
  text(ctx, 'PWR', 976, 737 - tussle * 0.3, 14, '#0f172a', 'Arial');
}

function drawS4Oleg(ctx, t, tl) {
  const c = tl.cues;
  const powerOff = t >= c.s4_poweroff;
  const dtOff = powerOff ? t - c.s4_poweroff : 0;
  const zoomT = ease(seg(t, c.s4_poweroff + 0.5, c.s4_black - 0.8));

  const camX = lerp(W / 2, 910, zoomT);
  const camY = lerp(H / 2, 425, zoomT);
  const camZ = lerp(1.04, 1.85, zoomT);
  camera(ctx, camX, camY, camZ, 0);

  drawNuclearBackdrop(ctx, t, 1540, 390, 1.0);
  panel3D(ctx, 40, 420, 240, 400, '#1a1520', 6, '#09070d', 3);
  panel3D(ctx, 1620, 450, 260, 370, '#1c1622', 6, '#09070d', 3);
  panel3D(ctx, -200, 810, W + 400, 360, '#27272a', 0, '#09090b', 3);

  // Мёртвый курьер в жёлтой куртке с зелёным рюкзаком и ножом в спине
  ctx.save(); ctx.translate(455, 920);
  person(ctx, {
    x: 0, y: 0, s: 0.72, seed: 760, rot: -Math.PI / 2, build: 'lean',
    shirt: '#eab308', outfit: 'courier', backpack: true, pants: '#1f2937',
    eyes: 'x', mood: 'flat', mouth: 0.1, blink: false, shadow: false,
    arms: { l: [0.8, 0.3], r: [0.4, 0.5] },
  });
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(-110, -85); ctx.lineTo(-100, -112); ctx.lineTo(-90, -85); ctx.closePath(); ctx.fill();
  panel3D(ctx, -106, -138, 12, 26, '#1e293b', 3, '#000', 2);
  ctx.restore();

  // Открытая коробка коллекционного издания GTA VI
  panel3D(ctx, 235, 860, 130, 85, '#ec4899', 8, '#831843', 3);
  ctx.beginPath(); ctx.moveTo(235, 860); ctx.lineTo(285, 815); ctx.lineTo(385, 815); ctx.lineTo(365, 860); ctx.closePath();
  ctx.fillStyle = '#f472b6'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#831843'; ctx.stroke();
  text(ctx, 'GTA VI', 300, 895, 24, '#fff', 'Impact');
  text(ctx, 'COLLECTOR', 300, 922, 14, '#fef08a', 'Arial');

  // Перевёрнутый полицейский бобик
  ctx.save(); ctx.translate(930, 770);
  panel3D(ctx, -280, -110, 560, 185, '#e2e8f0', 14, '#1e293b', 3);
  panel3D(ctx, -280, -35, 560, 42, '#1d4ed8', 2, '#1e3a8a', 2);
  text(ctx, 'ПОЛИЦИЯ', 0, -14, 34, '#ffffff', 'Impact');
  for (const wx of [-170, 170]) {
    ctx.beginPath(); ctx.arc(wx, -120, 46, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, wx, -120, 46, '#18181b'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#09090b'; ctx.stroke();
    ctx.beginPath(); ctx.arc(wx, -120, 20, 0, Math.PI * 2); ctx.fillStyle = '#64748b'; ctx.fill();
  }
  const sCol = Math.sin(t * 14) > 0 ? '#3b82f6' : '#ef4444';
  glow(ctx, 0, 88, 60, sCol, 0.55);
  panel3D(ctx, -24, 74, 48, 24, sCol, 8, '#111', 2);
  ctx.restore();

  // Баррикада из автомобильных аккумуляторов с синей изолентой
  for (const [bx, by] of [[640, 745], [730, 755], [1130, 750], [1225, 745], [1175, 675]]) {
    panel3D(ctx, bx, by, 85, 70, '#1e293b', 6, '#090d16', 2.5);
    panel3D(ctx, bx + 12, by - 10, 14, 10, '#ef4444', 2, '#450a0a', 1.5);
    panel3D(ctx, bx + 58, by - 10, 14, 10, '#3b82f6', 2, '#1e3a8a', 1.5);
    text(ctx, '12V', bx + 42, by + 35, 22, '#facc15', 'Impact');
  }
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(630, 765); ctx.lineTo(820, 785); ctx.lineTo(635, 805); ctx.lineTo(820, 815); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1120, 695); ctx.lineTo(1310, 780); ctx.lineTo(1125, 805); ctx.lineTo(1315, 745); ctx.stroke();

  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(1180, 670); ctx.lineTo(1140, 645); ctx.lineTo(1095, 645); ctx.stroke();
  ctx.strokeStyle = '#09090b';
  ctx.beginPath(); ctx.moveTo(1220, 670); ctx.lineTo(1160, 655); ctx.lineTo(1095, 655); ctx.stroke();

  panel3D(ctx, 1015, 632, 105, 28, '#f8fafc', 6, '#334155', 2);
  panel3D(ctx, 995, 502, 165, 125, '#0f172a', 8, '#475569', 3);
  if (!powerOff) {
    glow(ctx, 1077, 565, 140, '#ec4899', 0.35);
    panel3D(ctx, 1007, 514, 141, 101, '#ec4899', 4, '#831843', 1.5);
    text(ctx, 'GTA VI', 1077, 552, 26, '#fff', 'Impact');
    const pct = t < c.s4_poweroff - 1.5 ? '3%' : '1%';
    panel3D(ctx, 1090, 519, 52, 22, '#09090b', 4, '#333', 1);
    text(ctx, pct, 1116, 530, 15, '#ef4444', 'Consolas');
  } else {
    panel3D(ctx, 1007, 514, 141, 101, '#050507', 4, '#18181b', 1.5);
    if (dtOff < 0.25) {
      const h = lerp(100, 4, dtOff / 0.25);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(1007, 564 - h / 2, 141, h);
    }
  }

  mopToasterGun(ctx, 795, 620, -0.55);

  const mash = !powerOff ? Math.sin(t * 28) * 0.14 : 0;
  const lookUp = ease(seg(t, c.s4_poweroff + 0.6, c.s4_poweroff + 1.8));
  const olegMood = !powerOff ? 'grin' : (dtOff < 0.6 ? 'flat' : 'frown');
  const olegSpeak = Math.max(mouthOf(tl, 's4_oleg1', t), mouthOf(tl, 's4_oleg2', t));

  person(ctx, {
    x: 865, y: 660, s: 0.88, seed: 820, sit: true, build: 'stocky',
    skin: '#e8bea0', shirt: '#4f6d7a', outfit: 'hoodie', pants: '#27272a',
    jowl: 0.26, stubble: true, hair: 'messy', hairColor: '#3b271c',
    eyes: 'red', bags: true,
    brow: !powerOff ? 0.5 : 1.1,
    look: [lerp(0.4, 0.75, lookUp), lerp(0.15, -0.55, lookUp)],
    headTilt: lerp(0, -0.22, lookUp),
    mood: olegMood, mouth: olegSpeak,
    arms: { l: [-0.35 + mash, -0.75], r: [-0.35 - mash, -0.75] },
    holdR: gamepad,
  });
}

function drawS4Wasted(ctx, t, tl) {
  const c = tl.cues;
  screen(ctx);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  if (t >= c.s4_wasted) {
    const dt = t - c.s4_wasted;
    const flash = Math.max(0, 1 - dt / 0.35);
    if (flash > 0) overlay(ctx, '#881111', flash * 0.55);

    const sc = backOut(clamp(dt / 0.35));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(20, 20, 24, 0.92)';
    ctx.fillRect(-W / 2, -135, W, 270);
    text(ctx, 'ПОТРАЧЕНО', 0, -18, 126, '#e11d48', 'Impact', 'center', '#000000', 12);
    text(ctx, 'WASTED  •  СУДНЫЙ ДЕНЬ, ВЕРСИЯ 1.0', 0, 82, 34, '#e5e7eb', 'Impact', 'center', '#000000', 6);
    ctx.restore();
  }
}

// ---------- Субтитры ----------
const WHO_LABEL = {
  boss: ['БОСС', '#f87171'],
  worker: ['СОТРУДНИК', '#60a5fa'],
  petya: ['ПЕТЯ', '#facc15'],
  ivanych: ['ИВАНЫЧ', '#4ade80'],
  surgeon: ['ХИРУРГ', '#2dd4bf'],
  anest: ['АНЕСТЕЗИОЛОГ', '#38bdf8'],
  oleg: ['ОЛЕГ', '#fb923c'],
};

export function drawSubtitle(ctx, tl, t) {
  let active = null;
  for (const l of Object.values(tl.lines)) {
    if (t >= l.start && t <= l.end) { active = l; break; }
  }
  if (!active) return;

  screen(ctx);
  const [name, col] = WHO_LABEL[active.who] || ['', '#fff'];
  const full = active.text;

  ctx.font = 'bold 34px "Arial"';
  const maxW = 1480;
  const words = full.split(' ');
  const rows = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? cur + ' ' + w : w;
    if (ctx.measureText(cand).width > maxW && cur) { rows.push(cur); cur = w; } else cur = cand;
  }
  if (cur) rows.push(cur);

  const boxH = 44 + rows.length * 44 + 18;
  const topY = H - boxH - 28;
  ctx.fillStyle = 'rgba(8, 10, 15, 0.80)';
  ctx.beginPath(); ctx.roundRect(W / 2 - 800, topY, 1600, boxH, 16); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px "Arial"'; ctx.fillStyle = col;
  ctx.fillText(name, W / 2, topY + 24);

  ctx.font = 'bold 34px "Arial"';
  rows.forEach((r, idx) => {
    const ry = topY + 62 + idx * 44;
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(r, W / 2, ry);
    ctx.fillStyle = '#ffffff'; ctx.fillText(r, W / 2, ry);
  });
}
