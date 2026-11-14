// Отрисовка Сцены 1 (Улица мегаполиса) и Сцены 2 (Пульт АЭС) в детализированном 2.5D/3D-стиле
import {
  W, H, G, hash, clamp, lerp, seg, ease, easeOut, easeIn, backOut, shade, gradV, gradSphere,
  rrect, panel3D, text, camera, screen, overlay, glow, speedLines, person, gamepad, phone,
} from './engine_hd.mjs';

export function mouthOf(tl, id, t) {
  const l = tl.lines[id];
  if (!l || t < l.start || t > l.end) return 0;
  const idx = Math.floor((t - l.start) * tl.fps);
  return l.env[clamp(idx, 0, l.env.length - 1)] || 0;
}

export function drawPhoneProp(g = '#bae6fd', label = '') {
  return phone(g, label);
}

// ---------- СЦЕНА 1: Апокалипсис снаружи ----------
export function drawScene1(ctx, t, tl) {
  const c = tl.cues;
  if (t < c.s1_crash_shot) drawS1OfficeAndStreet(ctx, t, tl);
  else if (t < c.s1_fire_shot) drawS1Crash(ctx, t, tl);
  else drawS1FireTruck(ctx, t, tl);
}

function drawSkyMorning(ctx, t, sunsetShift = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.8);
  g.addColorStop(0, sunsetShift > 0 ? '#c2410c' : '#2563eb');
  g.addColorStop(0.55, sunsetShift > 0 ? '#f97316' : '#60a5fa');
  g.addColorStop(1, sunsetShift > 0 ? '#fde68a' : '#dbeafe');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -200, W + 600, H + 400);

  const sx = 250 + sunsetShift * 1340, sy = 180 + sunsetShift * 260;
  glow(ctx, sx, sy, 280, sunsetShift > 0 ? '#fb923c' : '#fef08a', 0.65);
  ctx.beginPath(); ctx.arc(sx, sy, 78, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, sx, sy, 78, sunsetShift > 0 ? '#fb923c' : '#fde047'); ctx.fill();

  for (let i = 0; i < 4; i++) {
    const cx = ((280 + i * 470 + t * 16) % (W + 320)) - 160, cy = 115 + (i % 2) * 72;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 96, 36, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 46, cy + 10, 56, 26, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 52, cy + 10, 62, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildingWin(ctx, x, y, w, h, lit = false) {
  panel3D(ctx, x, y, w, h, '#273449', 4, '#111827', 2);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, lit ? '#fde047' : '#bae6fd');
  g.addColorStop(1, lit ? '#f97316' : '#38bdf8');
  ctx.fillStyle = g; ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + w * 0.55, y + 8); ctx.lineTo(x + 8, y + h * 0.65); ctx.closePath(); ctx.fill();
}

function drawS1OfficeAndStreet(ctx, t, tl) {
  const c = tl.cues;
  const notified = t >= c.s1_notify;
  const zoomP = ease(seg(t, c.s1_zoom, c.s1_glass + 0.15));
  const shakeOut = t >= c.s1_shakeoff;
  const pullBack = ease(seg(t, c.s1_shakeoff + 0.35, c.s1_shakeoff + 1.25));
  const sunset = ease(seg(t, c.s1_shakeoff + 0.45, c.s1_crash_shot - 0.2));

  const winX = 1045, winY = 475;
  const camZ = lerp(1.0, 2.0, zoomP) - pullBack * 0.85;
  const camX = lerp(W / 2, winX, zoomP) + pullBack * 260;
  const camY = lerp(H / 2, winY + 35, zoomP) + pullBack * 170;
  const shake = t >= c.s1_glass && t < c.s1_glass + 0.4 ? 14 : (t >= c.s1_shakeoff && t < c.s1_shakeoff + 0.3 ? 10 : 0);

  camera(ctx, camX, camY, camZ, shake);
  drawSkyMorning(ctx, t, sunset);

  for (const [bx, by, bw, bh, col] of [[30, 390, 230, 470, '#64748b'], [280, 310, 260, 550, '#74859c'], [1460, 330, 240, 530, '#68798f'], [1720, 410, 200, 450, '#5a6b80']]) {
    panel3D(ctx, bx, by, bw, bh, col, 6, '#1e293b', 3);
    for (let r = 0; r < 5; r++) for (let colI = 0; colI < 3; colI++) drawBuildingWin(ctx, bx + 26 + colI * 62, by + 35 + r * 74, 38, 46);
  }

  panel3D(ctx, 670, 160, 700, 720, '#94a3b8', 8, '#1e293b', 4);
  panel3D(ctx, 745, 108, 550, 56, '#334155', 8, '#0f172a', 3);
  text(ctx, 'ООО «ОФИСПЛАНКТОН»', 1020, 136, 28, '#fde047', 'Impact', 'center', '#0f172a', 5);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = 725 + col * 160, wy = 215 + row * 192;
      const isHero = row === 1 && col === 2;
      if (isHero) {
        panel3D(ctx, wx - 10, wy - 10, 148, 158, '#1e293b', 6, '#090d16', 3);
        if (t < c.s1_glass) {
          drawBuildingWin(ctx, wx, wy, 128, 138);
          ctx.fillStyle = '#1e293b'; ctx.fillRect(wx + 62, wy, 4, 138);
        } else {
          ctx.fillStyle = '#0f172a'; ctx.fillRect(wx, wy, 128, 138);
          ctx.fillStyle = 'rgba(186,230,253,0.85)';
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 42, wy + 22); ctx.lineTo(wx + 12, wy + 52); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(wx + 128, wy); ctx.lineTo(wx + 86, wy + 28); ctx.lineTo(wx + 128, wy + 54); ctx.closePath(); ctx.fill();
          if (t < c.s1_glass + 1.2) {
            const dt = t - c.s1_glass;
            for (let s = 0; s < 14; s++) {
              const sx = wx + 64 + Math.cos(s * 1.7) * dt * 260;
              const sy = wy + 64 + Math.sin(s * 2.3) * dt * 180 + dt * dt * 380;
              ctx.fillStyle = 'rgba(186,230,253,0.88)';
              ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 16, sy + 5); ctx.lineTo(sx + 7, sy + 18); ctx.closePath(); ctx.fill();
            }
          }
        }
      } else {
        drawBuildingWin(ctx, wx, wy, 114, 130);
      }
    }
  }

  panel3D(ctx, -250, 840, 2500, 118, '#94a3b8', 0, '#1e293b', 3);
  panel3D(ctx, -250, 954, 2500, 240, '#334155', 0, '#0f172a', 3);

  for (const tx of [190, 520, 1590]) {
    panel3D(ctx, tx - 16, 695, 32, 155, '#5c3a21', 6, '#27170c', 3);
    ctx.beginPath(); ctx.arc(tx, 630, 82, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, tx, 630, 82, '#22c55e'); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#14532d'; ctx.stroke();
  }
  for (let b = 0; b < 4; b++) {
    const bx0 = 190 + b * 420 + Math.sin(t * 2.2 + b) * 24;
    let by0 = 265 + (b % 2) * 58 + Math.sin(t * 5 + b) * 12;
    if (notified) { const dt = t - c.s1_notify; by0 += dt * dt * 950; }
    if (by0 < 1030) {
      ctx.beginPath(); ctx.ellipse(bx0, by0, 17, 11, 0, 0, Math.PI * 2);
      ctx.fillStyle = gradSphere(ctx, bx0, by0, 17, '#38bdf8'); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#0c4a6e'; ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(bx0 + 15, by0); ctx.lineTo(bx0 + 27, by0 - 4); ctx.lineTo(bx0 + 16, by0 + 5); ctx.closePath(); ctx.fill();
      if (!notified) text(ctx, '♪', bx0 + 12, by0 - 24 - ((t * 40 + b * 20) % 32), 24, '#0f172a', 'Arial');
    }
  }

  if (t >= c.s1_glass) {
    const dt = t - c.s1_glass;
    const chairX = lerp(winX + 50, winX - 180, clamp(dt / 1.1));
    const chairY = dt < 1.1 ? (winY + 60 - Math.sin(clamp(dt / 1.1) * Math.PI) * 120 + dt * 330) : 870;
    ctx.save(); ctx.translate(chairX, chairY); ctx.rotate(dt < 1.1 ? dt * 4.5 : 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, 56, 42, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, 0, 0, 56, '#f97316'); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#7c2d12'; ctx.stroke();
    ctx.restore();
  }

  if (t >= c.s1_glass + 0.15 && !shakeOut) {
    const sway = Math.sin(t * 14) * 0.07;
    person(ctx, {
      x: winX + 90, y: winY + 340, s: 0.72, seed: 201, build: 'lean',
      shirt: '#f1f5f9', outfit: 'office', pants: '#1e293b', tie: '#2563eb', hair: 'messy',
      eyes: 'red', brow: -0.6, mood: 'scream', mouth: mouthOf(tl, 's1_worker', t),
      arms: { l: [-0.45, -0.7], r: [0.85, 0.7] }, holdL: drawPhoneProp('#4ade80', 'GTA6'),
      rot: 0.12 + sway, shadow: false,
    });
    person(ctx, {
      x: winX - 65, y: winY + 465, s: 0.74, seed: 202, build: 'stocky',
      shirt: '#ffffff', outfit: 'suit', tie: '#dc2626', hair: 'bald', hairColor: '#64748b',
      eyes: 'wide', brow: 1.0, tears: 1, tearJet: 0.85, mood: 'scream', mouth: mouthOf(tl, 's1_boss', t),
      arms: { l: [1.8, 0.5], r: [1.5, 0.4] }, rot: 0.32 - sway, shadow: false,
    });
  } else if (shakeOut) {
    const dt = t - c.s1_shakeoff;
    const bossY = winY + 280 + dt * dt * 820;
    if (bossY < 1150) {
      person(ctx, {
        x: winX - dt * 110, y: bossY, s: 0.72, seed: 202, build: 'stocky',
        shirt: '#ffffff', outfit: 'suit', tie: '#dc2626', hair: 'bald',
        eyes: 'wide', tears: 1, mood: 'scream', mouth: 0.9,
        arms: { l: [2.4, 0.3], r: [2.4, 0.3] }, rot: dt * 5, shadow: false,
      });
    }
    const runX = winX + 120 + dt * 360;
    person(ctx, {
      x: runX, y: 925, s: 0.78, seed: 201, build: 'lean',
      shirt: '#f1f5f9', outfit: 'office', pants: '#1e293b', tie: '#2563eb', tieSwing: -45, hair: 'messy',
      eyes: 'red', brow: -0.6, mood: 'scream', mouth: mouthOf(tl, 's1_worker', t),
      run: t * 14, arms: { l: [1.1, 0.9], r: [-0.6, -0.7] }, holdL: drawPhoneProp('#4ade80', '99%'),
    });
  }

  if (zoomP > 0.3 && zoomP < 0.98) speedLines(ctx, 0.42 * (1 - pullBack));

  screen(ctx);
  if (t < c.s1_zoom) {
    const clockStr = notified ? '08:01' : '08:00';
    panel3D(ctx, W / 2 - 430, 56, 860, 114, '#0f172a', 16, '#334155', 3);
    text(ctx, `19 НОЯБРЯ. ${clockStr}. РЕЛИЗ GTA VI`, W / 2, 114, 44, notified ? '#4ade80' : '#fde047', 'Impact', 'center', '#000', 6);
  }
  if (notified && t < c.s1_crash_shot) {
    const pop = backOut(seg(t, c.s1_notify, c.s1_notify + 0.35));
    const ny = lerp(-140, 40, pop);
    panel3D(ctx, W - 520, ny, 480, 108, '#1e293b', 12, '#38bdf8', 3);
    panel3D(ctx, W - 504, ny + 18, 72, 72, '#38bdf8', 10, '#0284c7', 2);
    text(ctx, 'STEAM', W - 468, ny + 54, 15, '#0f172a', 'Arial');
    text(ctx, 'GTA VI — ЗАГРУЗКА!', W - 245, ny + 44, 24, '#7dd3fc', 'Impact');
    text(ctx, 'Нажмите, чтобы играть', W - 245, ny + 76, 18, '#cbd5e1', 'Arial');
  }
}

function drawArmoredTruck(ctx, x, y, flip = 1, doorOpen = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
  panel3D(ctx, -210, -175, 340, 150, '#475569', 10, '#0f172a', 3);
  panel3D(ctx, 130, -140, 92, 115, '#475569', 8, '#0f172a', 3);
  panel3D(ctx, 148, -124, 58, 48, '#bae6fd', 5, '#0f172a', 2);
  panel3D(ctx, -210, -90, 340, 22, '#facc15', 2, '#1e293b', 1.5);
  text(ctx, 'ИНКАССАЦИЯ', -40, -128, 28, '#fde047', 'Impact');
  if (doorOpen > 0) panel3D(ctx, -210 - doorOpen * 45, -160, 46, 122, '#334155', 6, '#0f172a', 2.5);
  for (const wx of [-125, 130]) {
    ctx.beginPath(); ctx.arc(wx, -16, 36, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, wx, -16, 36, '#18181b'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#09090b'; ctx.stroke();
    ctx.beginPath(); ctx.arc(wx, -16, 16, 0, Math.PI * 2); ctx.fillStyle = '#94a3b8'; ctx.fill();
  }
  ctx.restore();
}

function drawS1Crash(ctx, t, tl) {
  const c = tl.cues;
  const impact = t >= c.s1_crash;
  const shake = impact && t < c.s1_crash + 0.55 ? 20 * (1 - (t - c.s1_crash) / 0.55) : 0;
  camera(ctx, W / 2, H / 2, 1.04, shake);
  drawSkyMorning(ctx, t, 0.25);

  panel3D(ctx, 60, 290, 420, 540, '#64748b', 8, '#1e293b', 3);
  panel3D(ctx, 1380, 320, 520, 510, '#1e293b', 8, '#0f172a', 3);
  panel3D(ctx, 1410, 350, 450, 82, '#0f172a', 8, '#22c55e', 3);
  text(ctx, 'ЭЛЕКТРОНИКА', 1635, 392, 42, '#4ade80', 'Impact', 'center', '#000', 5);
  panel3D(ctx, 1440, 470, 390, 230, '#bae6fd', 8, '#0284c7', 3);
  panel3D(ctx, 1540, 560, 120, 90, '#18181b', 6, '#000', 2);
  text(ctx, 'PS6', 1600, 605, 30, '#4ade80', 'Impact');

  panel3D(ctx, -100, 820, 2200, 320, '#334155', 0, '#0f172a', 3);
  for (let i = 0; i < 6; i++) panel3D(ctx, 660 + i * 95, 890, 55, 140, '#e2e8f0', 4, '#64748b', 1.5);

  const p = clamp((t - c.s1_crash_shot) / (c.s1_crash - c.s1_crash_shot));
  const door = easeOut(seg(t, c.s1_crash + 0.1, c.s1_crash + 0.6));
  drawArmoredTruck(ctx, lerp(140, 720, p), 860, 1, door);
  drawArmoredTruck(ctx, lerp(1760, 1180, p), 860, -1, door);

  if (impact) {
    const it = t - c.s1_crash;
    if (it < 0.7) {
      const s = backOut(it / 0.25) * (1 - it / 0.7);
      glow(ctx, 950, 740, 220 * s, '#facc15', 0.9);
      text(ctx, 'ХРЯСЬ!', 950, 740, 58 * Math.max(0.5, s), '#ef4444', 'Impact', 'center', '#000', 7);
    }
    const fall = easeOut(seg(t, c.s1_crash, c.s1_crash + 0.6));
    for (let m = 0; m < 6; m++) {
      const mx = 750 + (m - 2.5) * 85, my = lerp(740, 885 + (m % 2) * 30, fall);
      ctx.beginPath(); ctx.ellipse(mx, my, 32, 26, 0, 0, Math.PI * 2);
      ctx.fillStyle = gradSphere(ctx, mx, my, 32, '#caa86a'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5c4620'; ctx.stroke();
      text(ctx, '$', mx, my + 2, 24, '#15803d', 'Impact');
    }
    for (let k = 0; k < 18; k++) {
      const bx = 680 + hash(k * 5) * 540, by = lerp(680, 910 + hash(k * 9) * 80, fall) + Math.sin(t * 6 + k) * 6;
      panel3D(ctx, bx, by, 28, 15, '#4ade80', 2, '#14532d', 1.5);
    }
    const runT = seg(t, c.s1_crash + 1.85, c.s1_crash + 3.35);
    const easeRun = runT < 0.5 ? 2 * runT * runT : 1 - Math.pow(-2 * runT + 2, 2) / 2;
    for (let g = 0; g < 2; g++) {
      const gx = lerp(690 + g * 500, 1650 + g * 120, easeRun);
      const lookPhone = it > 0.75 && it < 1.85;
      person(ctx, {
        x: gx, y: 925, s: 0.78, seed: 380 + g, build: g === 0 ? 'stocky' : 'normal',
        shirt: '#546140', outfit: 'guard', helmet: '#36402a', pants: '#343b2a',
        eyes: lookPhone ? 'wide' : 'red', mood: runT > 0 ? 'grin' : 'flat',
        run: runT > 0 ? t * 13 + g : null,
        arms: lookPhone ? { l: [-0.4, -0.8], r: [0.3, 0.3] } : { l: [2.2, 0.2], r: [0.9, 0.5] },
        holdL: drawPhoneProp('#60a5fa', 'GTA6'),
      });
    }
  }
}

function drawS1FireTruck(ctx, t, tl) {
  const c = tl.cues;
  const dt = t - c.s1_fire_shot;
  camera(ctx, W / 2, H / 2, 1.03, dt > 1.7 && dt < 2.2 ? 8 : 0);
  drawSkyMorning(ctx, t, 0.15);

  panel3D(ctx, 50, 420, 560, 410, '#f3b78b', 8, '#451a03', 3);
  panel3D(ctx, 110, 450, 440, 68, '#ffffff', 8, '#1e293b', 3);
  text(ctx, 'ДЕТСКИЙ САД', 330, 484, 38, '#dc2626', 'Impact');
  for (let w = 0; w < 3; w++) panel3D(ctx, 110 + w * 165, 550, 110, 120, '#f97316', 6, '#431407', 3);
  for (let f = 0; f < 10; f++) {
    const fx = 100 + f * 50, fh = 85 + Math.sin(t * 14 + f * 1.3) * 35;
    glow(ctx, fx, 410, 75, '#f97316', 0.4);
    ctx.beginPath(); ctx.moveTo(fx - 34, 430); ctx.quadraticCurveTo(fx, 430 - fh * 1.3, fx + 34, 430); ctx.closePath();
    ctx.fillStyle = f % 2 ? '#ef4444' : '#facc15'; ctx.fill();
    const dy = 240 - ((t * 90 + f * 35) % 240);
    ctx.beginPath(); ctx.arc(fx + Math.sin(t * 3 + f) * 20, dy, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,30,36,0.58)'; ctx.fill();
  }

  panel3D(ctx, 1340, 260, 540, 570, '#7c8899', 8, '#1e293b', 3);
  panel3D(ctx, 1480, 580, 180, 250, '#1e293b', 6, '#0f172a', 3);
  panel3D(ctx, 1460, 515, 220, 54, '#0f172a', 6, '#334155', 2);
  text(ctx, 'ПОДЪЕЗД №3', 1570, 542, 26, '#facc15', 'Impact');
  panel3D(ctx, -100, 825, 2200, 300, '#334155', 0, '#0f172a', 3);

  const drive = easeOut(clamp(dt / 1.9));
  const truckX = lerp(-360, 930, drive);
  panel3D(ctx, truckX - 240, 610, 410, 180, '#dc2626', 10, '#450a0a', 3);
  panel3D(ctx, truckX + 170, 640, 125, 150, '#dc2626', 8, '#450a0a', 3);
  panel3D(ctx, truckX + 190, 658, 86, 62, '#bae6fd', 6, '#0f172a', 2);
  panel3D(ctx, truckX - 240, 710, 410, 20, '#f8fafc', 2, '#991b1b', 1.5);
  text(ctx, '01', truckX - 40, 665, 52, '#fff', 'Impact');
  const flashCol = Math.sin(t * 20) > 0 ? '#38bdf8' : '#ef4444';
  glow(ctx, truckX + 225, 622, 65, flashCol, 0.65);
  panel3D(ctx, truckX + 205, 610, 40, 24, flashCol, 8, '#111', 2);
  for (const wx of [truckX - 130, truckX + 205]) {
    ctx.beginPath(); ctx.arc(wx, 800, 40, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, wx, 800, 40, '#18181b'); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(wx, 800, 18, 0, Math.PI * 2); ctx.fillStyle = '#cbd5e1'; ctx.fill();
  }

  if (dt >= 2.0) {
    const runDt = dt - 2.0;
    for (let i = 0; i < 4; i++) {
      const fx = lerp(truckX + 120 - i * 45, 1570, clamp((runDt - i * 0.14) / 1.1));
      if (fx < 1550) {
        person(ctx, {
          x: fx, y: 895, s: 0.68, seed: 450 + i,
          shirt: '#991b1b', outfit: 'fireman', helmet: '#facc15', pants: '#7f1d1d',
          eyes: 'wide', mood: 'grin', run: t * 15 + i * 1.4,
          arms: { l: [0.9, 0.6], r: [-0.7, -0.6] },
        });
      }
    }
  }

  if (dt >= 2.3) {
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(truckX + 60, 770); ctx.quadraticCurveTo(truckX + 150, 895, truckX + 270, 880); ctx.stroke();
    for (let w = 0; w < 20; w++) {
      const p = ((t * 2.4 + w / 20) % 1);
      const wx = truckX + 275 + p * 340, wy = 875 - Math.sin(p * Math.PI) * 165 + p * 85;
      ctx.beginPath(); ctx.arc(wx, wy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa'; ctx.fill();
    }
  }
}

// ---------- СЦЕНА 2: На грани катастрофы (АЭС) ----------
export function drawScene2(ctx, t, tl) {
  const c = tl.cues;
  const s2s = tl.scenes.s2.start;
  const menuOn = t >= c.s2_menu;
  const zeroOn = t >= c.s2_zero;
  const boomP = easeIn(seg(t, c.s2_boom, tl.scenes.s2.end));

  let cx = W / 2, cy = H / 2, cz = 1.0, shake = 0;
  if (mouthOf(tl, 's2_petya1', t) > 0.05 || mouthOf(tl, 's2_petya2', t) > 0.05) {
    cx = 1340; cy = 540; cz = 1.38; shake = 6;
  } else if (t >= c.s2_menu && t < c.s2_zero) {
    cx = 640; cy = 520; cz = 1.40;
  } else if (mouthOf(tl, 's2_ivan1', t) > 0.05 || mouthOf(tl, 's2_ivan2', t) > 0.05) {
    cx = 660; cy = 540; cz = 1.30;
  }
  if (zeroOn) shake = 18;

  camera(ctx, cx, cy, cz, shake);

  ctx.fillStyle = gradV(ctx, 0, 0, 0, H, '#111827', '#1e293b', '#0f172a');
  ctx.fillRect(-100, -50, W + 200, H + 100);
  panel3D(ctx, 80, 110, W - 160, 620, '#273244', 12, '#0f172a', 4);

  const alarm = !menuOn && Math.sin(t * 10) > 0;
  for (const lx of [220, 960, 1700]) {
    if (alarm) glow(ctx, lx, 80, 260, '#ef4444', 0.45);
    panel3D(ctx, lx - 36, 52, 72, 34, alarm ? '#ff2a2a' : '#450a0a', 12, '#111', 2.5);
  }

  const rem = Math.max(0, Math.ceil(45 * (1 - clamp((t - s2s) / (c.s2_zero - s2s)))));
  const remStr = `00:${String(rem).padStart(2, '0')}`;
  panel3D(ctx, 560, 145, 800, 185, '#090d16', 12, '#334155', 4);
  text(ctx, 'КРИТИЧЕСКИЙ ПЕРЕГРЕВ РЕАКТОРА', 960, 195, 36, '#f87171', 'Impact');
  text(ctx, `ВЗРЫВ ЧЕРЕЗ ${remStr}`, 960, 272, 68, rem === 0 ? '#ffffff' : '#ef4444', 'Impact');

  panel3D(ctx, 110, 680, 1700, 420, '#334155', 14, '#0f172a', 4);
  panel3D(ctx, 1420, 635, 190, 65, '#475569', 10, '#1e293b', 3);
  ctx.beginPath(); ctx.ellipse(1515, 625, 56, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, 1515, 625, 56, '#ef4444'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#450a0a'; ctx.stroke();
  text(ctx, 'АВАРИЙНЫЙ СТОП', 1515, 725, 22, '#fca5a5', 'Impact');

  panel3D(ctx, 350, 395, 440, 275, '#0f172a', 10, '#475569', 4);
  if (!menuOn) {
    panel3D(ctx, 368, 413, 404, 239, '#172554', 6, '#0284c7', 2);
    text(ctx, 'GTA VI — ЗАГРУЗКА 99%', 570, 468, 30, '#38bdf8', 'Impact');
    panel3D(ctx, 400, 515, 340, 34, '#0f172a', 8, '#334155', 2);
    panel3D(ctx, 404, 519, 326, 26, '#22c55e', 6, '#14532d', 1);
    text(ctx, 'КОМПИЛЯЦИЯ ШЕЙДЕРОВ...', 570, 588, 22, '#cbd5e1', 'Arial');
  } else {
    const mg = ctx.createLinearGradient(368, 413, 368, 652);
    mg.addColorStop(0, '#ec4899'); mg.addColorStop(1, '#38bdf8');
    ctx.fillStyle = mg; ctx.fillRect(368, 413, 404, 239);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(670, 565); ctx.lineTo(670, 635); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(675, 550, 34, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, 675, 550, 34, '#f472b6'); ctx.fill();
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(695, 545); ctx.quadraticCurveTo(715, 500, 692, 470); ctx.stroke();
    ctx.beginPath(); ctx.arc(692, 470, 11, 0, Math.PI * 2); ctx.fillStyle = '#f472b6'; ctx.fill();
    text(ctx, 'VICE CITY VI', 515, 475, 38, '#fff', 'Impact', 'center', '#151515', 5);
    panel3D(ctx, 415, 540, 200, 54, zeroOn ? '#facc15' : '#22c55e', 8, '#14532d', 2.5);
    text(ctx, 'НОВАЯ ИГРА', 515, 568, 26, '#0f172a', 'Impact');
  }

  panel3D(ctx, 845, 620, 48, 56, '#f8fafc', 6, '#475569', 2);
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(894, 646, 13, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(868, 610); ctx.quadraticCurveTo(875 + Math.sin(t * 4) * 8, 595, 865, 580); ctx.stroke();

  panel3D(ctx, 560, 610, 180, 210, '#1e293b', 16, '#090d16', 3);
  const ivanSpeak = Math.max(mouthOf(tl, 's2_ivan1', t), mouthOf(tl, 's2_ivan2', t), mouthOf(tl, 's2_ivan3', t));
  person(ctx, {
    x: 650, y: 890, s: 0.92, seed: 540, sit: true, build: 'stocky',
    skin: '#ebb894', shirt: '#5b6c5d', outfit: 'vest', pants: '#334155',
    belly: 0.25, jowl: 0.22, stubble: true,
    hair: 'bald', hairColor: '#94a3b8', mustache: '#94a3b8',
    headphones: true,
    eyes: menuOn ? 'wide' : 'lidded', brow: menuOn ? 1 : 0,
    tears: menuOn ? 1 : 0, mood: 'smile', mouth: ivanSpeak,
    arms: { l: [-0.35, -0.75], r: [-0.35, -0.75] }, holdR: gamepad,
  });

  const petyaSpeak = Math.max(mouthOf(tl, 's2_petya1', t), mouthOf(tl, 's2_petya2', t));
  const flail = Math.sin(t * 16) * 0.6;
  person(ctx, {
    x: 1310, y: 925, s: 0.86, seed: 545, build: 'lean',
    shirt: '#38bdf8', coat: '#f1f5f9', tie: '#1e40af', badge: true, pants: '#334155',
    hair: 'messy', hairColor: '#6b4226',
    eyes: 'wide', brow: 1.2, sweat: 1, mood: 'scream',
    mouth: petyaSpeak || (t < c.s2_menu ? 0.3 : 0.6),
    arms: { l: [2.2 + flail, 0.3], r: [2.2 - flail, 0.3] },
  });

  if (zeroOn) {
    const light = easeIn(seg(t, c.s2_zero + 0.3, tl.scenes.s2.end));
    for (let i = 0; i < 6; i++) {
      const rx = 200 + i * 310;
      ctx.fillStyle = `rgba(255,255,255,${0.4 + light * 0.6})`;
      ctx.beginPath(); ctx.moveTo(rx - 40, H + 50); ctx.lineTo(rx + 180, -50); ctx.lineTo(rx + 360, -50); ctx.lineTo(rx + 120, H + 50); ctx.closePath(); ctx.fill();
    }
    overlay(ctx, '#ffffff', boomP);
  } else if (alarm) {
    overlay(ctx, '#ff0000', 0.14);
  }
}
