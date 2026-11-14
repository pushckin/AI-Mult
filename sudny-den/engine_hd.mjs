// 2.5D/3D-стилизованный движок с объёмным шейдингом (в стиле референсов)
export const W = 1920, H = 1080, FPS = 24;
export const G = { f: 0 };

export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = t => { t = clamp(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 3);
export const backOut = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// Работа с цветом для объёмного шейдинга
export function shade(hex, k) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const ch = i => clamp(Math.round(parseInt(m[i], 16) * k), 0, 255).toString(16).padStart(2, '0');
  return `#${ch(1)}${ch(2)}${ch(3)}`;
}

export function gradV(ctx, x1, y1, x2, y2, topC, midC, botC) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, topC);
  g.addColorStop(0.55, midC);
  g.addColorStop(1, botC);
  return g;
}

export function gradSphere(ctx, cx, cy, r, col) {
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.32, r * 0.08, cx, cy, r);
  g.addColorStop(0, shade(col, 1.24));
  g.addColorStop(0.58, col);
  g.addColorStop(1, shade(col, 0.62));
  return g;
}

export function rrect(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function panel3D(ctx, x, y, w, h, col, r = 8, stroke = '#171a21', lw = 2.5) {
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = gradV(ctx, x, y, x, y + h, shade(col, 1.18), col, shade(col, 0.72));
  ctx.fill();
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  // верхний блик
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y + 2);
  ctx.lineTo(x + w - r, y + 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function text(ctx, s, x, y, size, color = '#fff', font = 'Impact', align = 'center', stroke = null, lw = 6) {
  ctx.font = `${font === 'Arial' ? 'bold ' : ''}${size}px "${font}"`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (color) { ctx.fillStyle = color; ctx.fillText(s, x, y); }
}

// ---------- Камера и свет ----------
export function camera(ctx, x = W / 2, y = H / 2, z = 1, shake = 0, rot = 0) {
  const sx = shake ? (hash(G.f * 1.37) - 0.5) * 2 * shake : 0;
  const sy = shake ? (hash(G.f * 2.71 + 5) - 0.5) * 2 * shake : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.rotate(rot);
  ctx.scale(z, z);
  ctx.translate(-x, -y);
}
export function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }

export function overlay(ctx, color, alpha, mode = 'source-over') {
  if (alpha <= 0) return;
  screen(ctx);
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function glow(ctx, x, y, r, color, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function vignette(ctx, k = 0.42) {
  screen(ctx);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.98);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${k})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function speedLines(ctx, alpha = 0.5, cx = W / 2, cy = H / 2) {
  screen(ctx);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 48; i++) {
    const a = hash(i * 9.1 + G.f * 0.5) * Math.PI * 2;
    const r1 = 420 + hash(i * 3.3 + G.f) * 260, r2 = 1400;
    ctx.lineWidth = 2 + hash(i) * 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- Объёмный 2.5D/3D персонаж ----------
const DEF = {
  x: 0, y: 0, s: 1, flip: 1, rot: 0, seed: 1, build: 'normal', // 'stocky' | 'lean' | 'normal'
  skin: '#ebb792', shirt: '#6b8fbf', pants: '#343b4a', shoes: '#22252d',
  legH: 158, bodyH: 180, bodyW: 156, belly: 0, headW: 78, headH: 88, jowl: 0, headTilt: 0,
  hair: null, hairColor: '#3f281b', eyes: 'normal', eyeColor: '#4a7c9b', eyeR: 18, pupil: 6,
  look: [0, 0], bags: false, brow: 0, browColor: '#231610',
  noseW: 15, mustache: null, stubble: false, beard: null,
  mouth: 0, mood: 'flat', mask: null, maskDown: false, tears: 0, tearJet: 0, sweat: 0, blink: true,
  arms: { l: [0.22, 0.15], r: [0.22, 0.15] }, legs: [0.05, 0.05], run: null, sit: false,
  tie: null, coat: null, headphones: false, glasses: false, helmet: null, cap: null,
  holdL: null, holdR: null, outfit: null, backpack: false, glove: null, badge: false,
  shadow: true,
};

function limbSegment(ctx, x1, y1, x2, y2, r1, r2, col, outline = '#1b1715') {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.quadraticCurveTo((x1 + x2) / 2 + nx * (r1 + r2) * 0.56, (y1 + y2) / 2 + ny * (r1 + r2) * 0.56, x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
  ctx.quadraticCurveTo((x1 + x2) / 2 - nx * (r1 + r2) * 0.56, (y1 + y2) / 2 - ny * (r1 + r2) * 0.56, x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
  ctx.closePath();

  const g = ctx.createLinearGradient(x1 + nx * r1, y1 + ny * r1, x1 - nx * r1, y1 - ny * r1);
  g.addColorStop(0, shade(col, 1.2));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, 0.65));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.restore();
}

function drawBoot3D(ctx, x, y, col, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // голенище и верх ботинка
  ctx.beginPath();
  ctx.moveTo(-20, -24);
  ctx.lineTo(14, -24);
  ctx.bezierCurveTo(22, -12, 38, -10, 40, 2);
  ctx.lineTo(-22, 2);
  ctx.closePath();
  ctx.fillStyle = gradV(ctx, 0, -24, 0, 2, shade(col, 1.25), col, shade(col, 0.68));
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#141518';
  ctx.stroke();
  // рельефная подошва
  rrect(ctx, -24, 0, 66, 10, 4);
  ctx.fillStyle = '#181a1f';
  ctx.fill();
  ctx.stroke();
  // шнурки/пряжка
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, -14); ctx.lineTo(16, -12);
  ctx.moveTo(6, -8); ctx.lineTo(20, -6);
  ctx.stroke();
  ctx.restore();
}

function drawHand3D(ctx, x, y, col, r = 15) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, x, y, r, col);
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#1d1612';
  ctx.stroke();
  // пальцы-сегменты
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(x + i * r * 0.42, y + r * 0.72, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = shade(col, 0.92);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

export function person(ctx, opt) {
  const o = { ...DEF, ...opt, arms: { ...DEF.arms, ...(opt.arms || {}) } };
  if (o.build === 'stocky') { o.bodyW = Math.max(o.bodyW, 196); o.belly = Math.max(o.belly, 0.16); o.legH = 138; }
  if (o.build === 'lean') { o.bodyW = Math.min(o.bodyW, 134); o.legH = 166; }
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rot);
  ctx.scale(o.s * o.flip, o.s);

  const LH = o.legH, BH = o.bodyH, BW = o.bodyW;
  const hipY = o.sit ? -LH * 0.45 : -LH;
  const top = hipY - BH;

  // падающая тень на полу
  if (o.shadow && !o.sit) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 6, BW * 0.65, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // рюкзак доставки за спиной (для курьера)
  if (o.backpack) {
    panel3D(ctx, -BW * 0.5 - 64, top + 6, 86, 126, '#27ae60', 12, '#14331d', 3);
    panel3D(ctx, -BW * 0.5 - 56, top + 18, 70, 26, '#2ecc71', 6, '#14331d', 2);
  }

  // ноги (двухсегментные с коленями и тяжёлыми ботинками)
  const thighR = o.build === 'stocky' ? 27 : 22;
  const calfR = o.build === 'stocky' ? 22 : 18;
  if (o.sit) {
    for (const sx of [-1, 1]) {
      const hx = sx * BW * 0.22;
      const kx = hx + 58, ky = hipY + 8;
      const fx = kx + 18, fy = -8;
      limbSegment(ctx, hx, hipY, kx, ky, thighR, calfR + 2, o.pants);
      limbSegment(ctx, kx, ky, fx, fy, calfR + 1, calfR - 2, o.pants);
      drawBoot3D(ctx, fx + 8, fy, o.shoes, 0.96);
    }
  } else if (o.run != null) {
    [-1, 1].forEach((sx, i) => {
      const ph = o.run + i * Math.PI, a = Math.sin(ph) * 0.8, k = (Math.cos(ph) + 1) * 0.55;
      const hx = sx * BW * 0.14;
      const kx = hx + Math.sin(a) * LH * 0.52, ky = hipY + Math.cos(a) * LH * 0.52;
      const fx = kx + Math.sin(a - k) * LH * 0.48, fy = ky + Math.cos(a - k) * LH * 0.48;
      limbSegment(ctx, hx, hipY, kx, ky, thighR, calfR + 2, o.pants);
      limbSegment(ctx, kx, ky, fx, fy, calfR + 1, calfR - 2, o.pants);
      drawBoot3D(ctx, fx + 4, fy, o.shoes, 0.96);
    });
  } else {
    [-1, 1].forEach((sx, i) => {
      const a = o.legs[i] * sx, hx = sx * BW * 0.22;
      const kx = hx + Math.sin(a * 0.8) * LH * 0.52, ky = hipY + Math.cos(a * 0.8) * LH * 0.52;
      const fx = kx + Math.sin(a) * LH * 0.48, fy = ky + Math.cos(a) * LH * 0.48;
      limbSegment(ctx, hx, hipY, kx, ky, thighR, calfR + 2, o.pants);
      limbSegment(ctx, kx, ky, fx, fy, calfR + 1, calfR - 2, o.pants);
      // складки/наколенники
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(kx - 14, ky); ctx.quadraticCurveTo(kx, ky + 6, kx + 14, ky); ctx.stroke();
      drawBoot3D(ctx, fx + sx * 4, fy, o.shoes, 0.98);
    });
  }

  // торс со складками и анатомическим объёмом
  const bw = BW / 2, bl = 1 + o.belly;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-bw * 0.95, top + 16);
  ctx.quadraticCurveTo(-bw * 0.45, top - 8, 0, top - 8);
  ctx.quadraticCurveTo(bw * 0.45, top - 8, bw * 0.95, top + 16);
  ctx.bezierCurveTo(bw * (1.05 + o.belly), top + BH * 0.4, bw * bl, top + BH * 0.8, bw * 0.88, hipY + 12);
  ctx.quadraticCurveTo(0, hipY + 24, -bw * 0.88, hipY + 12);
  ctx.bezierCurveTo(-bw * bl, top + BH * 0.8, -bw * (1.05 + o.belly), top + BH * 0.4, -bw * 0.95, top + 16);
  ctx.closePath();

  const tg = ctx.createRadialGradient(-bw * 0.25, top + BH * 0.25, 18, 0, top + BH * 0.5, BW * 0.85);
  tg.addColorStop(0, shade(o.shirt, 1.22));
  tg.addColorStop(0.55, o.shirt);
  tg.addColorStop(1, shade(o.shirt, 0.62));
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = '#18191e';
  ctx.stroke();
  ctx.restore();

  // детали одежды строго по сценарию
  drawOutfit3D(ctx, o, bw, bl, top, hipY, BH, BW);

  // шея с тенью от подбородка
  limbSegment(ctx, 0, top + 14, 0, top - 14, 24, 22, shade(o.skin, 0.82), '#1d1612');

  // голова 3D
  const hy = top - 10 - o.headH * 0.92;
  ctx.save();
  ctx.translate(0, top);
  ctx.rotate(o.headTilt);
  ctx.translate(0, -top);
  drawHead3D(ctx, o, 0, hy);
  ctx.restore();

  // руки (плечо + предплечье + кисть/перчатка)
  const shY = top + 28;
  const armBase = o.build === 'stocky' ? 21 : 16;
  [-1, 1].forEach((sx, i) => {
    const [a1, a2] = i === 0 ? o.arms.l : o.arms.r;
    const len = o.armLen || 1;
    const shx = sx * (bw - 8);
    const ex = shx + sx * Math.sin(a1) * 78 * len, ey = shY + Math.cos(a1) * 78 * len;
    const hx = ex + sx * Math.sin(a1 + a2) * 72 * len, hy2 = ey + Math.cos(a1 + a2) * 72 * len;
    const sleeveCol = o.coat || o.shirt;
    const forearmCol = o.outfit === 'office' ? o.skin : sleeveCol;
    limbSegment(ctx, shx, shY, ex, ey, armBase, armBase - 3, sleeveCol);
    limbSegment(ctx, ex, ey, hx, hy2, armBase - 3, armBase - 6, forearmCol);
    drawHand3D(ctx, hx, hy2, o.glove || o.skin, o.build === 'stocky' ? 16 : 14);
    const hold = i === 0 ? o.holdL : o.holdR;
    if (hold) { ctx.save(); ctx.translate(hx, hy2); ctx.rotate(-sx * (a1 + a2)); hold(ctx); ctx.restore(); }
  });

  ctx.restore();
}

function drawOutfit3D(ctx, o, bw, bl, top, hipY, BH, BW) {
  // складки ткани по центру
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.4, top + BH * 0.45); ctx.quadraticCurveTo(0, top + BH * 0.52, bw * 0.35, top + BH * 0.42);
  ctx.moveTo(-bw * 0.3, top + BH * 0.72); ctx.quadraticCurveTo(0, top + BH * 0.78, bw * 0.4, top + BH * 0.68);
  ctx.stroke();
  ctx.restore();

  if (o.outfit === 'suit') {
    // пиджак с лацканами поверх белой рубашки
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * bw * 0.94, top + 14);
      ctx.lineTo(sx * 16, top + 6);
      ctx.lineTo(sx * 10, top + 115);
      ctx.lineTo(sx * bw * 0.88, hipY + 14);
      ctx.bezierCurveTo(sx * bw * bl, top + BH * 0.7, sx * bw * 1.05, top + BH * 0.35, sx * bw * 0.94, top + 14);
      ctx.closePath();
      ctx.fillStyle = gradV(ctx, 0, top, 0, hipY, '#393e4a', '#282c36', '#1b1e26');
      ctx.fill();
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#121318'; ctx.stroke();
      // лацкан
      ctx.beginPath();
      ctx.moveTo(sx * 24, top + 8); ctx.lineTo(sx * 44, top + 52); ctx.lineTo(sx * 12, top + 96); ctx.closePath();
      ctx.fillStyle = '#474e5e'; ctx.fill(); ctx.stroke();
    }
  } else if (o.outfit === 'office') {
    // воротник и планка пуговиц
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, top + 8); ctx.lineTo(sx * 28, top - 2); ctx.lineTo(sx * 22, top + 28); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#1e293b'; ctx.stroke();
    }
    panel3D(ctx, 18, top + 46, 32, 34, shade(o.shirt, 0.95), 4, '#334155', 1.8);
  } else if (o.outfit === 'guard') {
    // разгрузочный бронежилет инкассатора в духе референсов
    panel3D(ctx, -bw * 0.86, top + 14, BW * 0.86, BH * 0.76, '#4c573c', 12, '#1b2015', 2.8);
    panel3D(ctx, -bw * 0.62, top + 30, BW * 0.62, 32, '#343c29', 6, '#141810', 2);
    text(ctx, 'ИНКАССАЦИЯ', 0, top + 46, 15, '#e5e070', 'Impact');
    for (let i = -1; i <= 1; i++) {
      panel3D(ctx, i * 38 - 16, top + BH * 0.56, 32, 42, '#5a6646', 5, '#191d14', 2);
    }
    panel3D(ctx, -bw * 0.88, hipY - 12, BW * 0.88, 22, '#22261e', 4, '#0f120d', 2);
    panel3D(ctx, -18, hipY - 14, 36, 26, '#7a828e', 4, '#111', 2);
  } else if (o.outfit === 'fireman') {
    panel3D(ctx, -bw * 0.92, top + 10, BW * 0.92, BH * 0.88, '#991b1b', 10, '#1f0b0b', 2.8);
    panel3D(ctx, -bw * 0.94, top + BH * 0.56, BW * 0.94, 18, '#facc15', 3, '#1f0b0b', 2);
    panel3D(ctx, -bw * 0.94, top + BH * 0.62, BW * 0.94, 7, '#e2e8f0', 2, '#1f0b0b', 1.2);
    panel3D(ctx, -bw * 0.92, hipY - 6, BW * 0.92, 18, '#1e293b', 4, '#0f172a', 2);
  } else if (o.outfit === 'vest') {
    // жилет начальника смены АЭС Иваныча с карманами и бейджем
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * bw * 0.96, top + 14);
      ctx.lineTo(sx * 24, top + 10);
      ctx.lineTo(sx * 20, hipY + 14);
      ctx.lineTo(sx * bw * 0.94, hipY + 14);
      ctx.closePath();
      ctx.fillStyle = gradV(ctx, 0, top, 0, hipY, '#7d6c53', '#61523d', '#44392a');
      ctx.fill();
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#1c1710'; ctx.stroke();
      panel3D(ctx, sx > 0 ? 34 : -72, top + BH * 0.52, 38, 44, '#6e5e47', 5, '#1c1710', 2);
    }
    panel3D(ctx, -bw * 0.92, hipY - 8, BW * 0.92, 20, '#2a241d', 4, '#111', 2);
    panel3D(ctx, -16, hipY - 10, 32, 24, '#94a3b8', 3, '#111', 2);
    panel3D(ctx, 32, top + 36, 36, 24, '#f8fafc', 3, '#1e293b', 1.8);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(36, top + 40, 28, 6);
  } else if (o.outfit === 'scrubs') {
    ctx.beginPath();
    ctx.moveTo(-34, top + 4); ctx.lineTo(0, top + 48); ctx.lineTo(34, top + 4);
    ctx.lineWidth = 3; ctx.strokeStyle = '#102a2e'; ctx.stroke();
    ctx.fillStyle = o.skin;
    ctx.beginPath(); ctx.moveTo(-28, top + 2); ctx.lineTo(0, top + 42); ctx.lineTo(28, top + 2); ctx.closePath(); ctx.fill();
    panel3D(ctx, 18, top + 58, 30, 34, shade(o.shirt, 0.9), 4, '#102a2e', 1.8);
  } else if (o.outfit === 'hoodie') {
    // объёмный ворот капюшона, шнурки и карман-кенгуру
    ctx.beginPath();
    ctx.ellipse(0, top + 10, 48, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradV(ctx, 0, top - 12, 0, top + 30, shade(o.shirt, 1.15), shade(o.shirt, 0.78), shade(o.shirt, 0.55));
    ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#171d24'; ctx.stroke();
    // шнурки
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, top + 18); ctx.lineTo(-17, top + 68); ctx.moveTo(14, top + 18); ctx.lineTo(17, top + 68); ctx.stroke();
    // кенгуру-карман
    panel3D(ctx, -bw * 0.58, top + BH * 0.56, BW * 0.58, BH * 0.28, shade(o.shirt, 0.9), 12, '#171d24', 2.2);
  } else if (o.outfit === 'courier') {
    panel3D(ctx, -bw * 0.88, top + BH * 0.55, BW * 0.88, 16, '#f8fafc', 3, '#333', 1.5);
    text(ctx, 'ЕДА', 0, top + 58, 28, '#151515', 'Impact');
  }

  if (o.coat) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * bw * 0.96, top + 8);
      ctx.lineTo(sx * 24, top + 12);
      ctx.lineTo(sx * 32, hipY + 38);
      ctx.lineTo(sx * (bw * bl + 10), hipY + 36);
      ctx.closePath();
      ctx.fillStyle = gradV(ctx, 0, top, 0, hipY + 38, o.coat, shade(o.coat, 0.92), shade(o.coat, 0.78));
      ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#334155'; ctx.stroke();
    }
  }
  if (o.badge) {
    panel3D(ctx, -56, top + 40, 34, 24, '#f8fafc', 3, '#1e293b', 1.8);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(-52, top + 44, 26, 6);
  }
  if (o.tie) {
    const sw = o.tieSwing || 0;
    ctx.beginPath();
    ctx.moveTo(-9, top + 8); ctx.lineTo(9, top + 8);
    ctx.lineTo(14 + sw, top + 92); ctx.lineTo(sw, top + 114); ctx.lineTo(-14 + sw, top + 92);
    ctx.closePath();
    ctx.fillStyle = gradV(ctx, 0, top, 0, top + 114, shade(o.tie, 1.2), o.tie, shade(o.tie, 0.65));
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#141518'; ctx.stroke();
  }
}

export function drawHead3D(ctx, o, cx, cy) {
  const hw = o.headW, hh = o.headH;

  // уши с внутренней тенью
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sx * (hw - 2), cy + 6, 14, 20, sx * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = gradSphere(ctx, cx + sx * (hw - 2), cy + 6, 20, shade(o.skin, 0.92));
    ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + sx * (hw - 3), cy + 7, 7, 0, Math.PI * 2);
    ctx.fillStyle = shade(o.skin, 0.72); ctx.fill();
  }

  // наушники (задняя дуга)
  if (o.headphones) {
    ctx.beginPath();
    ctx.arc(cx, cy - 8, hw + 10, Math.PI, 0);
    ctx.lineWidth = 14; ctx.strokeStyle = '#22262e'; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#525b6e'; ctx.stroke();
  }

  // скульптурная форма головы (челюсть + щёки + лоб)
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.bezierCurveTo(cx + hw * 0.95, cy - hh, cx + hw, cy - hh * 0.25, cx + hw * (0.9 + o.jowl * 0.35), cy + hh * 0.32);
  ctx.bezierCurveTo(cx + hw * (0.8 + o.jowl * 0.3), cy + hh * 0.86, cx + hw * 0.36, cy + hh, cx, cy + hh);
  ctx.bezierCurveTo(cx - hw * 0.36, cy + hh, cx - hw * (0.8 + o.jowl * 0.3), cy + hh * 0.86, cx - hw * (0.9 + o.jowl * 0.35), cy + hh * 0.32);
  ctx.bezierCurveTo(cx - hw, cy - hh * 0.25, cx - hw * 0.95, cy - hh, cx, cy - hh);
  ctx.closePath();

  const hg = ctx.createRadialGradient(cx - hw * 0.26, cy - hh * 0.34, 10, cx, cy, hh * 1.3);
  hg.addColorStop(0, shade(o.skin, 1.18));
  hg.addColorStop(0.65, o.skin);
  hg.addColorStop(1, shade(o.skin, 0.74));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.lineWidth = 2.8; ctx.strokeStyle = '#1d1612'; ctx.stroke();

  // подкожный румянец на скулах и щеках
  for (const sx of [-1, 1]) {
    glow(ctx, cx + sx * hw * 0.52, cy + hh * 0.18, 28, 'rgba(220,90,75,0.22)', 0.9);
  }

  // борода / щетина
  if (o.stubble) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + hh * 0.58, hw * (0.76 + o.jowl * 0.2), hh * 0.42, 0, 0, Math.PI);
    ctx.fillStyle = 'rgba(42, 30, 24, 0.22)';
    ctx.fill();
    ctx.fillStyle = 'rgba(38, 26, 20, 0.48)';
    for (let i = 0; i < 95; i++) {
      const a = Math.PI * (0.08 + 0.84 * hash(o.seed + i * 2.1));
      const r = 0.52 + 0.44 * hash(i * 9.3 + o.seed);
      ctx.fillRect(cx + Math.cos(a) * hw * r * 0.9, cy + hh * 0.15 + Math.sin(a) * hh * r * 0.82, 2.2, 2.2);
    }
    ctx.restore();
  }

  // волосы и головные уборы
  drawHairAndHat3D(ctx, o, cx, cy, hw, hh);

  // глаза с веками, радужкой и двойными бликами
  const ey = cy - hh * 0.1, ex = hw * 0.37;
  const R = o.eyeR * (o.eyes === 'wide' ? 1.22 : 1);
  const blinking = o.blink && ((G.f + o.seed * 37) % 92) < 3;

  for (const sx of [-1, 1]) {
    const x = cx + sx * ex;
    // глазная впадина / тень под бровью
    glow(ctx, x, ey, R * 1.45, 'rgba(95,55,40,0.24)', 0.9);
    if (o.bags) {
      ctx.beginPath();
      ctx.arc(x, ey + 6, R * 1.15, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(110, 58, 92, 0.55)'; ctx.stroke();
    }

    if (o.eyes === 'happy' || blinking || o.eyes === 'closed') {
      ctx.beginPath();
      if (o.eyes === 'happy') ctx.arc(x, ey + 6, R * 0.85, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(x, ey - 4, R * 0.85, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 4; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    } else if (o.eyes === 'x') {
      ctx.strokeStyle = '#1a1512'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - R * 0.65, ey - R * 0.65); ctx.lineTo(x + R * 0.65, ey + R * 0.65);
      ctx.moveTo(x + R * 0.65, ey - R * 0.65); ctx.lineTo(x - R * 0.65, ey + R * 0.65);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, ey, R, R * 0.94, 0, 0, Math.PI * 2);
      const eg = ctx.createRadialGradient(x, ey - 3, 2, x, ey, R);
      eg.addColorStop(0, o.eyes === 'red' ? '#ffe0da' : '#ffffff');
      eg.addColorStop(1, o.eyes === 'red' ? '#f5b0a8' : '#d8dee8');
      ctx.fillStyle = eg;
      ctx.fill();
      ctx.clip();

      if (o.eyes === 'red') {
        ctx.strokeStyle = '#d92b2b'; ctx.lineWidth = 1.6;
        for (let k = 0; k < 7; k++) {
          const a = hash(o.seed + k * 4 + sx) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * R, ey + Math.sin(a) * R);
          ctx.lineTo(x + Math.cos(a + 0.25) * R * 0.5, ey + Math.sin(a + 0.25) * R * 0.5);
          ctx.stroke();
        }
      }

      const px = x + o.look[0] * R * 0.38, py = ey + o.look[1] * R * 0.38;
      const irisR = o.eyes === 'wide' ? R * 0.42 : R * 0.55;
      // радужка
      ctx.beginPath(); ctx.arc(px, py, irisR, 0, Math.PI * 2);
      ctx.fillStyle = o.eyeColor; ctx.fill();
      // зрачок
      ctx.beginPath(); ctx.arc(px, py, irisR * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = '#0f1115'; ctx.fill();
      // двойной живой блик
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(px - irisR * 0.32, py - irisR * 0.35, irisR * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + irisR * 0.32, py + irisR * 0.25, irisR * 0.14, 0, Math.PI * 2); ctx.fill();

      // верхнее веко (для прищура / усталости)
      if (o.eyes === 'lidded' || o.eyes === 'sad') {
        ctx.fillStyle = shade(o.skin, 0.88);
        ctx.fillRect(x - R - 2, ey - R - 2, 2 * R + 4, R * 0.92);
        ctx.beginPath();
        ctx.moveTo(x - R, ey - R * 0.08 + (o.eyes === 'sad' ? sx * 5 : 0));
        ctx.lineTo(x + R, ey - R * 0.08 - (o.eyes === 'sad' ? sx * 5 : 0));
        ctx.lineWidth = 3; ctx.strokeStyle = '#1d1612'; ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(x, ey, R, R * 0.94, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    }

    // скульптурная бровь
    const by = ey - R - 9 - o.brow * 3;
    const tilt = (o.brow < 0 ? 9 : -9) * Math.abs(o.brow);
    ctx.beginPath();
    ctx.moveTo(x + sx * R * 1.05, by);
    ctx.quadraticCurveTo(x + sx * R * 0.3, by - 6 + tilt * 0.4, x - sx * R * 0.35, by + tilt);
    ctx.lineWidth = 6.5; ctx.lineCap = 'round'; ctx.strokeStyle = o.browColor; ctx.stroke();
  }

  // очки (для анестезиолога)
  if (o.glasses) {
    ctx.save();
    for (const sx of [-1, 1]) {
      const gx = cx + sx * ex;
      ctx.beginPath(); ctx.arc(gx, ey, R + 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,235,255,0.16)'; ctx.fill();
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#1e293b'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx - R * 0.4, ey - R * 0.5); ctx.lineTo(gx + R * 0.2, ey + R * 0.4);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx - ex + R + 7, ey); ctx.lineTo(cx + ex - R - 7, ey);
    ctx.lineWidth = 3; ctx.strokeStyle = '#1e293b'; ctx.stroke();
    ctx.restore();
  }

  // наушники (боковые амбушюры поверх ушей)
  if (o.headphones) {
    for (const sx of [-1, 1]) {
      panel3D(ctx, cx + sx * (hw + 4) - 14, cy - 22, 28, 54, '#272c36', 12, '#0f1218', 2.5);
      panel3D(ctx, cx + sx * (hw - 2) - 6, cy - 18, 12, 46, '#64748b', 6, '#111', 1.8);
    }
  }

  // объёмный нос с переносицей и тенью
  const ny = cy + hh * 0.14;
  ctx.beginPath();
  ctx.ellipse(cx + 1, ny + 4, o.noseW * 0.85, o.noseW * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(80,35,25,0.22)'; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, ny, o.noseW, o.noseW * 0.72, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradSphere(ctx, cx, ny, o.noseW, shade(o.skin, 0.94));
  ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#3b2419'; ctx.stroke();

  // усы
  if (o.mustache) {
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy + hh * 0.34);
    ctx.quadraticCurveTo(cx - 16, cy + hh * 0.20, cx, cy + hh * 0.27);
    ctx.quadraticCurveTo(cx + 16, cy + hh * 0.20, cx + 38, cy + hh * 0.34);
    ctx.quadraticCurveTo(cx, cy + hh * 0.40, cx - 38, cy + hh * 0.34);
    ctx.fillStyle = gradV(ctx, 0, cy + hh * 0.2, 0, cy + hh * 0.4, shade(o.mustache, 1.15), o.mustache, shade(o.mustache, 0.7));
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#1f1814'; ctx.stroke();
  }

  // рот и хирургическая маска
  const my = cy + hh * 0.49;
  if (o.mask && !o.maskDown) {
    panel3D(ctx, cx - hw * 0.78, cy + hh * 0.08, hw * 1.56, hh * 0.66, o.mask, 14, '#254e5a', 2.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.56, cy + hh * 0.30); ctx.lineTo(cx + hw * 0.56, cy + hh * 0.30);
    ctx.moveTo(cx - hw * 0.56, cy + hh * 0.50); ctx.lineTo(cx + hw * 0.56, cy + hh * 0.50);
    ctx.stroke();
  } else {
    const m = o.mood === 'scream' ? Math.max(o.mouth, 0.72) : o.mouth;
    if (m > 0.06) {
      const mw = 28 + (o.mood === 'grin' ? 16 : 0) + m * 12;
      const mh = 8 + m * 30;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, my, mw, mh, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#471014'; ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - mw, my - mh, mw * 2, mh * 0.42);
      ctx.fillStyle = '#e06c7a';
      ctx.beginPath(); ctx.ellipse(cx, my + mh * 0.65, mw * 0.58, mh * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(cx, my, mw, mh, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#1d1212'; ctx.stroke();
    } else if (o.mood === 'grin') {
      ctx.beginPath(); ctx.moveTo(cx - 38, my - 4); ctx.quadraticCurveTo(cx, my + 24, cx + 38, my - 4); ctx.closePath();
      ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    } else if (o.mood === 'smile') {
      ctx.beginPath(); ctx.arc(cx, my - 10, 26, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    } else if (o.mood === 'frown') {
      ctx.beginPath(); ctx.arc(cx, my + 16, 22, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(cx - 22, my); ctx.lineTo(cx + 22, my);
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    }
  }

  // слёзы и капли пота
  if (o.tears > 0) {
    for (const sx of [-1, 1]) {
      const tx = cx + sx * ex;
      ctx.beginPath();
      ctx.moveTo(tx - 5, ey + R * 0.6);
      ctx.lineTo(tx - 8, ey + hh * 0.72);
      ctx.lineTo(tx + 8, ey + hh * 0.72);
      ctx.lineTo(tx + 5, ey + R * 0.6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(110, 200, 255, 0.86)'; ctx.fill();
    }
  }
  if (o.tearJet > 0) {
    for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) {
      const ph = ((G.f / FPS) * 1.9 + k / 6) % 1;
      const jx = cx + sx * ex + sx * ph * 200 * o.tearJet;
      const jy = ey - 6 - Math.sin(ph * Math.PI) * 90 * o.tearJet + ph * 140;
      ctx.beginPath(); ctx.arc(jx, jy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#0284c7'; ctx.stroke();
    }
  }
  if (o.sweat > 0) {
    for (let k = 0; k < 3; k++) {
      const ph = ((G.f / FPS) * 1.5 + k / 3) % 1;
      ctx.save(); ctx.globalAlpha = (1 - ph) * o.sweat;
      ctx.beginPath(); ctx.arc(cx + (k - 1) * hw * 0.65, cy - hh * 0.55 + ph * hh, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#bae6fd'; ctx.fill();
      ctx.restore();
    }
  }
}

function drawHairAndHat3D(ctx, o, cx, cy, hw, hh) {
  const hc = o.hairColor;
  if (o.hair === 'messy') {
    ctx.beginPath();
    ctx.moveTo(cx - hw * 1.02, cy - hh * 0.25);
    ctx.lineTo(cx - hw * 1.12, cy - hh * 0.72);
    ctx.lineTo(cx - hw * 0.72, cy - hh * 0.85);
    ctx.lineTo(cx - hw * 0.52, cy - hh * 1.24);
    ctx.lineTo(cx - hw * 0.12, cy - hh * 1.04);
    ctx.lineTo(cx + hw * 0.18, cy - hh * 1.28);
    ctx.lineTo(cx + hw * 0.56, cy - hh * 1.02);
    ctx.lineTo(cx + hw * 0.94, cy - hh * 1.15);
    ctx.lineTo(cx + hw * 1.08, cy - hh * 0.68);
    ctx.lineTo(cx + hw * 0.98, cy - hh * 0.25);
    ctx.quadraticCurveTo(cx, cy - hh * 0.62, cx - hw * 1.02, cy - hh * 0.25);
    ctx.closePath();
    ctx.fillStyle = gradV(ctx, 0, cy - hh * 1.28, 0, cy - hh * 0.25, shade(hc, 1.3), hc, shade(hc, 0.72));
    ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = '#17110d'; ctx.stroke();
  } else if (o.hair === 'bald') {
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + sx * hw * 0.92, cy - 10, 14, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(hc, 0.95); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#1d1612'; ctx.stroke();
    }
    // глянцевый блик на лысине
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.ellipse(cx - hw * 0.3, cy - hh * 0.72, 22, 9, -0.35, 0, Math.PI * 2); ctx.fill();
  }

  if (o.cap) {
    ctx.beginPath();
    ctx.arc(cx, cy - hh * 0.36, hw * 1.04, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = gradV(ctx, 0, cy - hh * 1.3, 0, cy - hh * 0.3, shade(o.cap, 1.2), o.cap, shade(o.cap, 0.75));
    ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#102a2e'; ctx.stroke();
  }
  if (o.helmet) {
    ctx.beginPath();
    ctx.arc(cx, cy - hh * 0.35, hw * 1.14, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = gradV(ctx, 0, cy - hh * 1.35, 0, cy - hh * 0.3, shade(o.helmet, 1.25), o.helmet, shade(o.helmet, 0.72));
    ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = '#141518'; ctx.stroke();
    panel3D(ctx, cx - hw * 1.25, cy - hh * 0.42, hw * 2.5, 16, shade(o.helmet, 0.9), 6, '#141518', 2.2);
  }
}

// ---------- Детализированный реквизит ----------
export const gamepad = (ctx) => {
  panel3D(ctx, -36, -14, 72, 26, '#272c38', 10, '#0f1218', 2.2);
  ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(20, -2, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(28, 4, 4, 0, 7); ctx.fill();
};

export const phone = (glowCol = '#bae6fd', txt = '') => (ctx) => {
  panel3D(ctx, -18, -32, 36, 64, '#1e293b', 6, '#090d16', 2);
  ctx.fillStyle = glowCol; ctx.fillRect(-13, -25, 26, 48);
  if (txt) text(ctx, txt, 0, 0, 8, '#0f172a', 'Arial');
};

export const scalpel = (ctx) => {
  panel3D(ctx, -4, 0, 8, 52, '#94a3b8', 3, '#1e293b', 1.6);
  ctx.beginPath(); ctx.moveTo(-3, 52); ctx.lineTo(4, 52); ctx.lineTo(0, 78); ctx.closePath();
  ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#334155'; ctx.stroke();
};
