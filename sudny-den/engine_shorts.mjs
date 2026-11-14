// Живой 2D Cut-out Engine (9:16 YouTube Shorts, 1080x1920, 24 FPS)
// Гибридный движок: фоны и техника из Nano Banana 2.1 + многосуставная марионеточная 2D-анимация в стиле PushckinAi (bbJriQ5RO1I)
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';

export const W = 1080, H = 1920, FPS = 24;
export const G = { f: 0, camX: W / 2, camY: H / 2, camZ: 1 };
export const INK = '#231A12';

export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / Math.max(0.0001, b - a));
export const ease = t => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 3);
export const backOut = t => { t = clamp(t); const c = 1.95; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const elasticOut = t => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

export function shade(hex, k) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const ch = i => clamp(Math.round(parseInt(m[i], 16) * k), 0, 255).toString(16).padStart(2, '0');
  return `#${ch(1)}${ch(2)}${ch(3)}`;
}

// ---------- Загрузка и Chroma-Key очистка ассетов Nano Banana 2.1 ----------
const IMG_CACHE = new Map();

export async function preloadNanoAssets(assetMap) {
  for (const [key, info] of Object.entries(assetMap)) {
    if (!fs.existsSync(info.path)) continue;
    const raw = await loadImage(fs.readFileSync(info.path));
    if (info.chroma) {
      IMG_CACHE.set(key, removeChromaKey(raw, info.chroma));
    } else {
      IMG_CACHE.set(key, raw);
    }
  }
}

export function getNanoAsset(key) {
  return IMG_CACHE.get(key) || null;
}

// Удаляет хромакей-фон (#00FF00 или цвет из угла изображения) с мягким подавлением зелёного ореола (de-spill)
function removeChromaKey(img, mode = 'auto') {
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const d = imgData.data;

  // Определяем цвет фона по углам
  const kr = d[0], kg = d[1], kb = d[2];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // Проверка на ярко-зелёный хромакей ИЛИ близость к угловому цвету фона
    const greenExcess = g - Math.max(r, b);
    const distCorner = Math.hypot(r - kr, g - kg, b - kb);

    if (greenExcess > 48 || (kg > 150 && greenExcess > 28 && distCorner < 95)) {
      const alpha = clamp((48 - greenExcess) / 22, 0, 1);
      d[i + 3] = Math.round(alpha * 255);
      // Подавление зелёного рефлекса на краях контура
      d[i + 1] = Math.min(g, Math.round((r + b) * 0.55));
    } else if (greenExcess > 18 && kg > 150) {
      // Мягкий антиалиасинг на границе тёмного контура
      d[i + 1] = Math.min(g, Math.round((r + b) * 0.65));
    }
  }

  // Находим плотный bounding box непрозрачных пикселей, чтобы центрировать спрайт
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const a = d[(y * img.width + x) * 4 + 3];
      if (a > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) return c;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const cropped = createCanvas(bw, bh);
  cropped.getContext('2d').drawImage(c, minX, minY, bw, bh, 0, 0, bw, bh);
  return cropped;
}

// Отрисовка 9:16 фона Nano Banana 2.1 с покрытием кадра (и запасом под тряску камеры)
export function drawNanoBgCover(ctx, img, pad = 60, alpha = 1) {
  if (!img) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  const tw = W + pad * 2;
  const th = H + pad * 2;
  const scale = Math.max(tw / img.width, th / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();
  return true;
}

// Бесшовная горизонтальная панорама улицы из Nano Banana 2.1 для динамичной погони!
export function drawNanoBgScrollX(ctx, img, scrollX = 0, yOffset = 0, height = H + 120) {
  if (!img) return false;
  ctx.save();
  const scale = height / img.height;
  const tileW = Math.round(img.width * scale);
  const shift = ((scrollX % (tileW * 2)) + tileW * 2) % (tileW * 2);

  // Рисуем тайлы с зеркальным стыком (чередуя прямой и отражённый тайл для идеально бесшовного скролла!)
  for (let k = -1; k <= 2; k++) {
    const tx = k * tileW - shift;
    const mirror = Math.abs(k) % 2 === 1;
    ctx.save();
    if (mirror) {
      ctx.translate(tx + tileW, yOffset - 60);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, tileW + 2, height);
    } else {
      ctx.drawImage(img, tx, yOffset - 60, tileW + 2, height);
    }
    ctx.restore();
  }
  ctx.restore();
  return true;
}

// ---------- Камера с живым дыханием (handheld sway) и тряской ----------
export function camera(ctx, x = W / 2, y = H / 2, z = 1, shake = 0, rot = 0, handheld = 1.0) {
  const t = G.f / FPS;
  const hx = handheld ? (Math.sin(t * 1.9) * 4.5 + Math.cos(t * 3.1) * 2.0) * handheld : 0;
  const hy = handheld ? (Math.cos(t * 2.3) * 4.0 + Math.sin(t * 3.7) * 1.8) * handheld : 0;
  const hrot = handheld ? Math.sin(t * 1.5) * 0.0035 * handheld : 0;

  const sx = shake ? (hash(G.f * 1.37) - 0.5) * 2 * shake : 0;
  const sy = shake ? (hash(G.f * 2.71 + 5) - 0.5) * 2 * shake : 0;
  const srot = shake ? (hash(G.f * 3.91 + 9) - 0.5) * 0.016 * (shake / 15) : 0;

  G.camX = x;
  G.camY = y;
  G.camZ = z;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + sx + hx, H / 2 + sy + hy);
  ctx.rotate(rot + hrot + srot);
  ctx.scale(z, z);
  ctx.translate(-x, -y);
}

export function screen(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- Базовые 2D-векторные примитивы ----------
export function rrect(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function flatBox(ctx, x, y, w, h, fill, r = 6, lw = 4, stroke = INK) {
  rrect(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function flatOval(ctx, x, y, rx, ry, fill, lw = 4, stroke = INK, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function flatPoly(ctx, pts, fill, lw = 4, stroke = INK, close = true) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function text(ctx, str, x, y, size = 32, fill = '#FFF', font = 'Segoe UI', align = 'center', stroke = null, sw = 0, weight = '900') {
  ctx.save();
  ctx.font = `${weight} ${size}px "${font}", "Arial Black", "Arial", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (stroke && sw > 0) {
    ctx.lineWidth = sw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function lightCone(ctx, x, y, wTop, wBot, h, color = 'rgba(255,244,180,0.22)') {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - wTop / 2, y);
  ctx.lineTo(x + wTop / 2, y);
  ctx.lineTo(x + wBot / 2, y + h);
  ctx.lineTo(x - wBot / 2, y + h);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

export function overlay(ctx, color, alpha = 0.5) {
  if (alpha <= 0) return;
  screen(ctx);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function vignette(ctx, strength = 0.42) {
  screen(ctx);
  const g = ctx.createRadialGradient(W / 2, H * 0.48, W * 0.36, W / 2, H * 0.5, H * 0.68);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(12,8,4,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------- Спецэффекты (вспышки ударов, клубы пыли, взрывы, купюры) ----------
export function drawImpactBurst(ctx, x, y, p, maxR = 160, color = '#FFF59D') {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p * 1.4);
  const r = maxR * Math.sin(p * Math.PI);
  const pts = [];
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  flatPoly(ctx, pts, color, 4, INK);
  flatOval(ctx, 0, 0, r * 0.28, r * 0.28, '#FFFFFF', 0);
  ctx.restore();
}

export function drawDustPuffs(ctx, x, y, t, dir = -1, count = 4) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const p = ((t * 3.2 + i / count) % 1);
    const dx = x + dir * (18 + p * 95) + Math.sin(i * 2.3 + t * 5) * 10;
    const dy = y - 8 - p * 38 - Math.abs(Math.sin(p * Math.PI)) * 16;
    const r = (1 - p * 0.55) * (16 + (i % 2) * 8);
    ctx.globalAlpha = clamp((1 - p) * 0.85, 0, 1);
    flatOval(ctx, dx, dy, r * 1.15, r * 0.9, '#E6D7BE', 3, INK);
  }
  ctx.restore();
}

export function drawCartoonExplosion(ctx, x, y, p, maxR = 260) {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  const grow = easeOut(clamp(p * 2.5));
  const fade = clamp(1 - (p - 0.55) / 0.45);
  ctx.globalAlpha = fade;
  const r = maxR * (0.45 + grow * 0.65);

  flatOval(ctx, x, y + r * 0.35, r * 1.35 * p, r * 0.25 * p, 'rgba(255,238,190,0.45)', 0);
  flatOval(ctx, x, y, r, r * 0.94, '#F0532B', 5, INK);
  flatOval(ctx, x - r * 0.08, y + r * 0.04, r * 0.78, r * 0.74, '#F58F29', 4, INK);
  flatOval(ctx, x + r * 0.04, y + r * 0.08, r * 0.54, r * 0.52, '#FADB39', 3.5, INK);

  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 1.8;
    const sx = x + Math.sin(a) * r * (0.45 + p * 0.42);
    const sy = y + r * 0.32 + Math.cos(a * 2) * 30 - p * 40;
    const sr = (38 + (i % 3) * 18) * grow;
    flatOval(ctx, sx, sy, sr, sr * 0.88, 'rgba(232,213,183,0.94)', 3.5, INK);
  }

  for (let i = 0; i < 16; i++) {
    const ang = i * 0.42 + 0.2;
    const dist = r * (0.35 + hash(i * 7.1) * 0.95) * (0.55 + p * 0.85);
    const dx = x + Math.cos(ang) * dist;
    const dy = y + Math.sin(ang) * dist * 0.85 + p * p * 120;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(ang + p * 6);
    flatBox(ctx, -11, -11, 22, 22, '#2B2118', 2, 2.8, INK);
    ctx.restore();
  }
  ctx.restore();
}

export function drawFlyingBill(ctx, x, y, rot = 0, scale = 1, flutter = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const flipScale = Math.cos(flutter);
  ctx.scale(scale, scale * Math.max(0.28, Math.abs(flipScale)));
  flatBox(ctx, -36, -19, 72, 38, '#7CC674', 4, 3.4, INK);
  flatBox(ctx, -28, -12, 56, 24, '#A3DF9B', 2, 2.2, '#355E30');
  flatOval(ctx, 0, 0, 9, 9, '#7CC674', 2.2, '#355E30');
  ctx.restore();
}

// Передний план с мягким размытием/силуэтом ромашек как в bbJriQ5RO1I
export function drawForegroundFrame(ctx, kind = 'park', t = 0) {
  const px = -(G.camX - W / 2) * 0.35;
  screen(ctx);
  ctx.save();
  const g = ctx.createLinearGradient(0, H - 320, 0, H);
  g.addColorStop(0, 'rgba(15,12,8,0)');
  g.addColorStop(1, 'rgba(15,12,8,0.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 320, W, 320);

  ctx.translate(px % 280, 0);
  if (kind === 'park' || kind === 'street') {
    ctx.strokeStyle = 'rgba(35,44,20,0.85)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    for (let i = -3; i < 18; i++) {
      const gx = i * 82;
      const sway = Math.sin(t * 3.4 + i * 0.9) * 14 + Math.cos(t * 1.8 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(gx, H + 12);
      ctx.quadraticCurveTo(gx + sway * 0.6, H - 62, gx + sway * 1.3, H - 122 - (Math.abs(i) % 3) * 26);
      ctx.stroke();
    }
    const flowerPositions = [-160, 120, 460, 560, 960, 1220];
    for (const fx of flowerPositions) {
      const sway = Math.sin(t * 3.0 + fx * 0.02) * 12;
      const fy = H - 86 + Math.cos(t * 2.5 + fx) * 6;
      const rot = sway * 0.025;
      ctx.save();
      ctx.globalAlpha = 0.72;
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2 + rot;
        flatOval(ctx, fx + sway + Math.cos(a) * 26, fy + Math.sin(a) * 26, 17, 9.5, '#E5E0D0', 2, '#2B261F', a);
      }
      flatOval(ctx, fx + sway, fy, 13, 13, '#DF9F28', 2.5, '#2B261F');
      ctx.restore();
    }
  } else if (kind === 'crates') {
    flatBox(ctx, -220, H - 150, 210, 170, '#4A331C', 6, 4, INK);
    flatBox(ctx, 20, H - 150, 210, 170, '#4A331C', 6, 4, INK);
    flatBox(ctx, 250, H - 120, 170, 140, '#3D2916', 6, 4, INK);
    flatBox(ctx, W - 210, H - 145, 210, 165, '#4A331C', 6, 4, INK);
  }
  ctx.restore();
}

// ---------- Фирменные таблички локаций и субтитры (bbJriQ5RO1I) ----------
export function drawLocationTag(ctx, label, x = W / 2, y = 175, tilt = -0.022, bg = '#F6C93E') {
  screen(ctx);
  ctx.save();
  const t = G.f / FPS;
  const hover = Math.sin(t * 2.4) * 3;
  ctx.translate(x, y + hover);
  ctx.rotate(tilt + Math.cos(t * 1.9) * 0.004);
  ctx.font = '900 31px "Segoe UI", "Arial", sans-serif';
  const tw = Math.max(210, ctx.measureText(label).width + 64);
  const th = 66;
  flatBox(ctx, -tw / 2 + 4, -th / 2 + 5, tw, th, 'rgba(0,0,0,0.35)', 6, 0);
  flatBox(ctx, -tw / 2, -th / 2, tw, th, bg, 6, 4.5, INK);
  flatBox(ctx, -tw / 2 + 6, -th / 2 + 6, tw - 12, th - 12, null, 4, 2, INK);
  text(ctx, label, 0, 1, 30, '#181410');
  ctx.restore();
}

export function drawCounterHUD(ctx, label, d1, d2, x = W - 210, y = 285) {
  screen(ctx);
  ctx.save();
  ctx.translate(x, y);
  flatBox(ctx, -155, -42, 310, 84, '#181410', 8, 4, '#F6C93E');
  text(ctx, label, -52, 2, 23, '#F6C93E');
  flatBox(ctx, 42, -30, 46, 60, '#EFECE6', 4, 3, INK);
  flatBox(ctx, 94, -30, 46, 60, '#EFECE6', 4, 3, INK);
  text(ctx, String(d1), 65, 2, 36, '#181410');
  text(ctx, String(d2), 117, 2, 36, '#181410');
  ctx.restore();
}

const SPEAKER_META = {
  boss:   { name: 'БОСС',        bg: '#F29B8E' },
  worker: { name: 'СОТРУДНИК',   bg: '#F6C93E' },
  guard1: { name: 'ИНКАССАТОР',  bg: '#7DD3FC' },
  guard2: { name: 'НАПАРНИК',    bg: '#A7F3D0' },
  fire:   { name: 'ПОЖАРНЫЙ',    bg: '#FCA5A5' },
  petya:  { name: 'ПЕТЯ',        bg: '#7DD3FC' },
  ivanych:{ name: 'ИВАНЫЧ',      bg: '#F6C93E' },
  surgeon:{ name: 'ХИРУРГ',      bg: '#F29B8E' },
  anest:  { name: 'АНЕСТЕЗИОЛОГ',bg: '#93C5FD' },
  oleg:   { name: 'ОЛЕГ',        bg: '#F6C93E' },
};

function wrapWords(ctx, str, maxWidth, fontSize) {
  ctx.font = `900 ${fontSize}px "Segoe UI", "Arial", sans-serif`;
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawShortsSubtitle(ctx, who, fullText, progress = 0, y = 1485) {
  if (!fullText) return;
  screen(ctx);
  ctx.save();
  const meta = SPEAKER_META[who] || { name: String(who).toUpperCase(), bg: '#F6C93E' };

  const words = fullText.split(/\s+/).filter(Boolean);
  const chunkSize = 5;
  let chunkText = fullText;
  let localP = progress;
  if (words.length > chunkSize) {
    const totalChunks = Math.ceil(words.length / chunkSize);
    const idx = clamp(Math.floor(progress * totalChunks), 0, totalChunks - 1);
    localP = (progress * totalChunks) - idx;
    chunkText = words.slice(idx * chunkSize, (idx + 1) * chunkSize).join(' ');
  }

  const pop = backOut(clamp(localP / 0.14));
  ctx.translate(W / 2, y);
  ctx.scale(lerp(0.86, 1.0, pop), lerp(0.86, 1.0, pop));

  const lines = wrapWords(ctx, chunkText, 930, 44);
  const badgeY = -(lines.length - 1) * 28 - 58;

  ctx.font = '900 24px "Segoe UI", "Arial", sans-serif';
  const bw = Math.max(142, ctx.measureText(meta.name).width + 42);
  const bh = 42;
  flatBox(ctx, -bw / 2, badgeY - bh / 2, bw, bh, meta.bg, 5, 3.5, INK);
  text(ctx, meta.name, 0, badgeY + 1, 23, '#181410');

  lines.forEach((ln, i) => {
    const ly = (i - (lines.length - 1) / 2) * 56;
    text(ctx, ln, 0, ly + 4, 44, 'rgba(0,0,0,0.55)', 'Segoe UI', 'center', 'rgba(0,0,0,0.55)', 14);
    text(ctx, ln, 0, ly, 44, '#FFFFFF', 'Segoe UI', 'center', '#14100C', 11);
  });
  ctx.restore();
}

// ---------- МНОГОСУСТАВНЫЙ 2D-ПЕРСОНАЖ В ТОЧНОМ СТИЛЕ bbJriQ5RO1I (PushckinAi) ----------
const CHAR_DEF = {
  x: 0, y: 0, s: 1, flip: 1, rot: 0, seed: 1,
  skin: '#F3C7A0',
  blush: '#E48974',
  shirt: '#53633F',
  pants: '#445233',
  coat: null,
  vest: null,
  tie: null,
  collar: true,
  pockets: true,
  belt: true,
  badge: false,
  hair: 'none',
  hairColor: '#4A3121',
  hat: null,
  hatColor: '#5B6D44',
  hatLift: 0,
  mustache: null,
  stubble: false,
  headphones: false,
  mask: false,
  maskDown: false,
  eyes: 'normal',
  look: null,
  headTurn: 0,
  headTilt: 0,
  squash: 0,
  brow: 0,
  mouth: 0,
  mood: 'neutral',
  tears: 0,
  sweat: 0,
  sit: false,
  pose: null, // 'dragged' | null
  walk: null,
  run: null,
  gesture: null,
  arms: null,
  holdL: null,
  holdR: null,
  shadow: true,
};

// Двухсегментная рука/нога с настоящим локтевым/коленным сгибом и манжетой рукава/штанины
function drawTwoSegmentLimb(ctx, x0, y0, x1, y1, x2, y2, w1, w2, color, cuffColor = null, lw = 4) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Внешний контур INK для обоих сегментов
  ctx.strokeStyle = INK;
  ctx.lineWidth = w1 + lw * 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.lineWidth = w2 + lw * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Внутренняя заливка цвета одежды
  ctx.strokeStyle = color;
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.lineWidth = w2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Аккуратная складка/манжета на конце сегмента (как в bbJriQ5RO1I)
  if (cuffColor) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.translate(x2, y2);
    ctx.rotate(ang);
    flatBox(ctx, -6, -w2 * 0.56, 7, w2 * 1.12, cuffColor, 2, 2.8, INK);
    ctx.restore();
  }
  ctx.restore();
}

// Анатомический мультяшный ботинок с плоской подошвой и носком по направлению взгляда
function drawCartoonBoot(ctx, x, y, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // Ботинок смотрит вправо (+X в локальных координатах персонажа)
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(10, -10);
  ctx.quadraticCurveTo(25, -9, 25, 4);
  ctx.lineTo(25, 9);
  ctx.lineTo(-15, 9);
  ctx.closePath();
  ctx.fillStyle = '#332216';
  ctx.fill();
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // Подошва
  flatBox(ctx, -16, 5, 42, 5, '#1D140D', 2, 2.5, INK);
  ctx.restore();
}

export function person(ctx, opts = {}) {
  const o = { ...CHAR_DEF, ...opts };
  const t = G.f / FPS;
  const sd = o.seed * 1.73;

  // Специальная живая поза для Босса, который горизонтально волочится по асфальту, вцепившись двумя руками в лодыжку Сотрудника!
  if (o.pose === 'dragged') {
    ctx.save();
    const bounce = Math.abs(Math.sin(t * 24)) * 13;
    const pitch = Math.sin(t * 28) * 0.04;
    ctx.translate(o.x, o.y - bounce);
    ctx.scale(o.s * o.flip, o.s);
    ctx.rotate(pitch);

    // Тень под волочащимся телом
    flatOval(ctx, -35, 16 + bounce * 0.7, 115, 14, 'rgba(0,0,0,0.34)', 0);

    // Задняя нога босса (болтается в воздухе от тряски по кочкам)
    {
      const kick = Math.sin(t * 22 - 1.5) * 16;
      drawTwoSegmentLimb(ctx, -84, -22, -132, -32 + kick * 0.5, -174, -22 + kick, 22, 19, o.pants, shade(o.pants, 0.86), 4);
      drawCartoonBoot(ctx, -174, -22 + kick, 1.25 + kick * 0.015);
    }

    // Задняя (левая) рука тянется вперёд к лодыжке сотрудника
    drawTwoSegmentLimb(ctx, -6, -34, 44, -30, 92, -24, 20, 18, o.shirt, shade(o.shirt, 0.85), 3.8);
    flatOval(ctx, 95, -24, 11, 10.5, o.skin, 3.8, INK);

    // Горизонтальный торс в тёмном костюме (от бедра x=-92 до плеч x=-4)
    flatBox(ctx, -92, -52, 92, 48, o.shirt, 12, 4, INK);
    // Ремень поперёк торса у бёдер
    flatBox(ctx, -82, -51, 14, 46, '#3B2D1F', 3, 3.5, INK);
    flatBox(ctx, -84, -36, 18, 16, '#F5C431', 2.5, 3.2, INK);
    // Красный галстук развевается назад по ветру
    if (o.tie) {
      const tieWave = Math.sin(t * 26) * 8;
      flatPoly(ctx, [[-12, -22], [-12, -10], [-66, -2 + tieWave], [-78, -10 + tieWave], [-64, -18 + tieWave]], o.tie, 3.5, INK);
    }

    // Передняя нога босса
    {
      const kick = Math.sin(t * 22 + 1.5) * 16;
      drawTwoSegmentLimb(ctx, -80, -14, -128, -20 + kick * 0.5, -168, -10 + kick, 22, 19, o.pants, shade(o.pants, 0.86), 4);
      drawCartoonBoot(ctx, -168, -10 + kick, 1.25 + kick * 0.015);
    }

    // Передняя (правая) рука мёртвой хваткой держит лодыжку сотрудника
    drawTwoSegmentLimb(ctx, -2, -18, 48, -14, 96, -14, 20, 18, o.shirt, shade(o.shirt, 0.85), 3.8);
    flatOval(ctx, 99, -14, 11, 10.5, o.skin, 3.8, INK);

    // Голова босса на шее (x = 4, y = -66), запрокинута вперёд-вверх, он рыдает фонтаном и кричит реплику
    ctx.save();
    ctx.translate(6, -66 + Math.sin(t * 20) * 3.5);
    ctx.rotate(-0.08 + Math.sin(t * 16) * 0.05);
    const rx = 64, ry = 50;
    flatOval(ctx, -rx + 2, 4, 13, 14, o.skin, 3.8, INK);
    flatOval(ctx, rx - 2, 4, 13, 14, o.skin, 3.8, INK);
    flatOval(ctx, 0, 0, rx, ry, o.skin, 4.2, INK);
    flatOval(ctx, -60, -10, 11, 16, o.hairColor, 3.5, INK);
    flatOval(ctx, 60, -10, 11, 16, o.hairColor, 3.5, INK);
    flatOval(ctx, -36, 10, 13, 8, o.blush, 0);
    flatOval(ctx, 36, 10, 13, 8, o.blush, 0);

    for (const sx of [-1, 1]) {
      const ex = sx * 18.5 + 5;
      flatOval(ctx, ex, -5, 16, 16, '#FFFFFF', 3.8, INK);
      flatOval(ctx, ex + 4.5, -4, 4, 4, INK, 0);
      ctx.beginPath();
      ctx.moveTo(ex - 13, -23 + sx * 6);
      ctx.lineTo(ex + 13, -23 - sx * 6);
      ctx.lineWidth = 4.4;
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      ctx.stroke();

      for (let d = 0; d < 4; d++) {
        const dp = ((t * 4.5 + d / 4 + (sx > 0 ? 0.5 : 0)) % 1);
        const tx = ex - 16 - dp * 78;
        const ty = -2 - Math.sin(dp * Math.PI) * 18 + dp * 14;
        flatOval(ctx, tx, ty, (1 - dp * 0.5) * 7.5, (1 - dp * 0.5) * 4.2, '#60C3FF', 2.2, INK, -0.2);
      }
    }

    const open = clamp(o.mouth, 0.25, 1);
    const mw = 16 + open * 13;
    const mh = 9 + open * 13;
    flatOval(ctx, 6, 22, mw, mh, '#3D1512', 3.6, INK);
    flatBox(ctx, 6 - mw * 0.6, 22 - mh + 2, mw * 1.2, 6, '#FFFFFF', 2, 2, INK);
    flatOval(ctx, 6, 22 + mh * 0.45, mw * 0.65, mh * 0.45, '#E06D65', 0);

    ctx.restore();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(o.x, o.y);

  const phase = o.run != null ? o.run : o.walk;
  const isRun = o.run != null;
  const isMoving = phase != null;

  const breath = Math.sin(t * 3.4 + sd) * 0.02;
  const stepBounce = isMoving ? Math.sin(phase * 2) : 0;
  const bobY = isMoving ? Math.abs(Math.sin(phase)) * (isRun ? 21 : 9) : Math.sin(t * 3.4 + sd) * 2.2;
  const talkPulse = o.mouth > 0.05 ? Math.sin(t * 22 + sd) * o.mouth * 0.042 : 0;
  const sq = o.squash + (isMoving ? stepBounce * (isRun ? 0.07 : 0.035) : breath) + talkPulse;

  const moveLean = isMoving ? (isRun ? 0.22 : 0.07) + Math.sin(phase * 2) * 0.045 : Math.sin(t * 2.1 + sd) * 0.015;
  const talkLean = o.mouth > 0.1 ? Math.sin(t * 9 + sd) * 0.04 * o.mouth : 0;

  if (isRun && o.shadow) {
    drawDustPuffs(ctx, 0, 0, t + o.seed, -o.flip, 3);
  }

  if (o.shadow) {
    const shScale = clamp(1 - bobY / 65, 0.62, 1.05);
    flatOval(ctx, 0, 5, 52 * shScale, 12 * shScale, 'rgba(0,0,0,0.32)', 0);
  }

  ctx.rotate(o.rot);
  ctx.scale(o.s * o.flip * (1 - sq * 0.6), o.s * (1 + sq));
  ctx.translate(0, -bobY);

  const thighLen = 30;
  const shinLen = 28;
  const legLen = thighLen + shinLen;
  const bodyW = 76;
  const bodyH = 88;
  const hipY = o.sit ? -26 : -legLen;
  const torsoTop = hipY - bodyH;

  // --- 1. ДВУХСЕГМЕНТНЫЕ НОГИ С КОЛЕНОМ, МАНЖЕТОЙ И БОТИНКОМ (как в bbJriQ5RO1I) ---
  const drawOneLeg = (sx, legIndex) => {
    if (o.sit) {
      const lx = sx * 18;
      const kick = Math.sin(t * 8 + sx + sd) * (o.mouth > 0.1 ? 6 : 2);
      drawTwoSegmentLimb(ctx, lx, hipY, lx + sx * 12, hipY + 15, lx + sx * 24, hipY + 25 + kick, 22, 20, o.pants, shade(o.pants, 0.85), 4);
      drawCartoonBoot(ctx, lx + sx * 24, hipY + 25 + kick, 0);
      return;
    }

    const ph = isMoving ? phase + legIndex * Math.PI : 0;
    const hx = sx * 15;
    if (!isMoving) {
      drawTwoSegmentLimb(ctx, hx, hipY, hx + sx * 1.5, hipY + thighLen, hx + sx * 2, hipY + legLen - 5, 22, 20, o.pants, shade(o.pants, 0.85), 4);
      drawCartoonBoot(ctx, hx + sx * 2, hipY + legLen - 4, 0);
      return;
    }

    // Реалистичная кинематика бега и шага:
    // Бедро качается вперёд/назад, а голень сгибается назад в колене при проносе ноги над землёй!
    const hipSwing = Math.sin(ph) * (isRun ? 0.88 : 0.46);
    const kneeFlex = Math.max(0, -Math.cos(ph - 0.25)) * (isRun ? 1.18 : 0.55);
    const shinAngle = hipSwing - kneeFlex;

    const kx = hx + Math.sin(hipSwing) * thighLen;
    const ky = hipY + Math.cos(hipSwing) * thighLen;
    const fx = kx + Math.sin(shinAngle) * shinLen;
    const fy = ky + Math.cos(shinAngle) * shinLen;

    drawTwoSegmentLimb(ctx, hx, hipY, kx, ky, fx, fy - 4, 22, 19, o.pants, shade(o.pants, 0.85), 4);
    const bootRot = -shinAngle * 0.65;
    drawCartoonBoot(ctx, fx, fy - 3, bootRot);
  };

  // Задняя нога рисуется первой, передняя — второй
  drawOneLeg(-1, 0);
  drawOneLeg(1, 1);

  // --- 2. СТРУКТУРИРОВАННЫЙ ТОРС В СТИЛЕ bbJriQ5RO1I ---
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(moveLean + talkLean);
  ctx.translate(0, -hipY);

  // Задняя рука рисуется ЗА торсом при беге/ходьбе для настоящей глубины 2.5D!
  let armL, armR;
  if (o.arms) {
    armL = o.arms.l || [-0.22, 0.2];
    armR = o.arms.r || [0.22, 0.2];
  } else if (o.gesture === 'panic') {
    const w = Math.sin(t * 18 + sd) * 0.55;
    armL = [-2.25 + w, -0.35];
    armR = [2.25 + w, 0.35];
  } else if (isMoving) {
    // При беге локти согнуты вперёд (+X), руки работают в противофазе ногам!
    const sw = Math.sin(phase + Math.PI) * (isRun ? 0.95 : 0.48);
    const elbowForward = isRun ? 0.95 : 0.38;
    armL = [sw, elbowForward];
    armR = [-sw, elbowForward];
  } else {
    const idleSw = Math.sin(t * 2.8 + sd) * 0.06;
    const talkG = o.mouth > 0.05 ? Math.sin(t * 13 + sd) * 0.48 * o.mouth + 0.52 * o.mouth : 0;
    armL = [-0.18 - idleSw + talkG, 0.25 + o.mouth * 0.45];
    armR = [0.18 + idleSw + talkG * 0.6, 0.22 + o.mouth * 0.35];
  }

  if (o.holdL && !o.arms) {
    // Держит телефон сбоку-спереди от корпуса, чтобы не перекрывать ремень и галстук
    armL = [-0.62 + Math.sin(t * 7 + sd) * 0.08, -0.78];
  }

  const armColor = o.coat || o.shirt;
  const cuffCol = shade(armColor, 0.84);
  const drawArm = (side, angles, holdFn) => {
    const sx = side === 'l' ? -1 : 1;
    const [a1, a2] = angles;
    const shX = sx * (bodyW / 2 - 5);
    const shY = torsoTop + 18;
    const L1 = 29, L2 = 27;
    const elX = shX + Math.sin(a1) * L1;
    const elY = shY + Math.cos(a1) * L1;
    const haX = elX + Math.sin(a1 + a2) * L2;
    const haY = elY + Math.cos(a1 + a2) * L2;
    drawTwoSegmentLimb(ctx, shX, shY, elX, elY, haX, haY, 19, 17, armColor, cuffCol, 3.8);
    // Чистая круглая кисть руки как в bbJriQ5RO1I (без лишнего внутреннего кружка!)
    flatOval(ctx, haX, haY, 11, 11, o.skin, 3.8, INK);
    if (holdFn) {
      ctx.save();
      ctx.translate(haX, haY);
      ctx.scale(o.flip, 1);
      holdFn(ctx);
      ctx.restore();
    }
  };

  // Задняя рука (левая) рисуется перед торсом только если не бежит, иначе за торсом
  if (isMoving) drawArm('l', armL, o.holdL);

  const chestW = bodyW * (1 + breath * 0.7);
  // Куртка с нижней баской под ремнём (как у солдат в bbJriQ5RO1I)
  flatBox(ctx, -chestW / 2, torsoTop, chestW, bodyH, o.shirt, 12, 4, INK);

  if (o.vest) {
    flatBox(ctx, -chestW / 2 + 2, torsoTop + 4, 24, bodyH - 8, o.vest, 6, 3.5, INK);
    flatBox(ctx, chestW / 2 - 26, torsoTop + 4, 24, bodyH - 8, o.vest, 6, 3.5, INK);
  }
  if (o.coat) {
    const coatFlare = isMoving ? Math.sin(phase) * 7 : Math.sin(t * 3 + sd) * 2;
    flatBox(ctx, -chestW / 2 - 3 - Math.max(0, coatFlare), torsoTop + 2, 26, bodyH + 8, o.coat, 6, 3.5, INK);
    flatBox(ctx, chestW / 2 - 23 + Math.max(0, -coatFlare), torsoTop + 2, 26, bodyH + 8, o.coat, 6, 3.5, INK);
  }

  if (o.tie) {
    const tieSwing = (isRun ? -22 + Math.sin(phase * 2) * 9 : Math.sin(t * 4.5 + sd) * 3.5) + (o.mouth > 0.1 ? Math.sin(t * 14) * 5 : 0);
    flatPoly(ctx, [
      [-7, torsoTop + 12], [7, torsoTop + 12],
      [10 + tieSwing * 0.7, torsoTop + 56],
      [tieSwing, torsoTop + 70],
      [-10 + tieSwing * 0.7, torsoTop + 56],
    ], o.tie, 3.5, INK);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, torsoTop + 12);
    ctx.lineTo(0, hipY - 4);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  if (o.collar) {
    flatPoly(ctx, [[-22, torsoTop + 2], [-3, torsoTop + 19], [-27, torsoTop + 21]], shade(o.shirt, 0.88), 3.4, INK);
    flatPoly(ctx, [[22, torsoTop + 2], [3, torsoTop + 19], [27, torsoTop + 21]], shade(o.shirt, 0.88), 3.4, INK);
  }

  if (o.pockets && !o.tie) {
    for (const px of [-20, 20]) {
      flatBox(ctx, px - 11, torsoTop + 28, 22, 20, shade(o.shirt, 0.9), 2.5, 2.8, INK);
      flatBox(ctx, px - 12, torsoTop + 26, 24, 7, shade(o.shirt, 0.82), 2, 2.5, INK);
    }
  }

  if (o.badge) {
    flatBox(ctx, 12, torsoTop + 26, 22, 16, '#FFFFFF', 3, 2.5, INK);
    flatBox(ctx, 15, torsoTop + 30, 16, 4, '#EF4444', 1, 0);
  }

  if (o.belt) {
    flatBox(ctx, -chestW / 2 + 1, hipY - 22, chestW - 2, 14, '#3B2D1F', 3, 3.5, INK);
    flatBox(ctx, -9, hipY - 24, 18, 18, '#F5C431', 2.5, 3.2, INK);
    flatBox(ctx, -4, hipY - 19, 8, 8, '#3B2D1F', 1, 2, INK);
  }

  if (!isMoving) drawArm('l', armL, o.holdL);
  drawArm('r', armR, o.holdR);

  // --- 3. ГОЛОВА В ТОЧНЫХ ПРОПОРЦИЯХ bbJriQ5RO1I ---
  const headY = torsoTop - 46;
  ctx.save();
  const headLagX = isMoving ? Math.sin(phase - 0.4) * 4.5 : 0;
  const headLagY = isMoving ? Math.cos(phase * 2 - 0.5) * 3.5 : 0;
  ctx.translate(headLagX, headY + headLagY);

  const autoTilt = (o.mouth > 0.06 ? Math.sin(t * 11 + sd) * 0.08 * o.mouth : Math.sin(t * 2.2 + sd) * 0.025)
    + (isMoving ? Math.sin(phase) * 0.045 : 0)
    + o.headTilt;
  ctx.rotate(autoTilt);

  const headSqX = 1 + o.mouth * 0.065 - Math.abs(stepBounce) * 0.022;
  const headSqY = 1 - o.mouth * 0.05 + Math.abs(stepBounce) * 0.022;
  ctx.scale(headSqX, headSqY);

  const autoTurn = o.headTurn || (o.mouth > 0.08 ? Math.sin(t * 5.5 + sd) * 0.32 : Math.sin(t * 1.6 + sd) * 0.18);
  const faceShiftX = clamp(autoTurn, -1, 1) * 10;

  const rx = 66, ry = 52;

  for (const sx of [-1, 1]) {
    const earX = sx * (rx - 2) - faceShiftX * 0.42;
    const earY = 3 + Math.sin(t * 6 + sx) * (isMoving ? 1.5 : 0);
    flatOval(ctx, earX, earY, 13, 14, o.skin, 3.8, INK);
    ctx.beginPath();
    ctx.arc(earX + sx, earY, 5.5, sx > 0 ? -1.2 : 1.9, sx > 0 ? 1.2 : 4.3);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  flatOval(ctx, 0, 0, rx, ry, o.skin, 4.2, INK);

  ctx.save();
  ctx.translate(faceShiftX, 0);

  if (o.stubble) {
    ctx.save();
    ctx.fillStyle = 'rgba(70,55,45,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (o.blush) {
    flatOval(ctx, -36, 10, 13, 8, o.blush, 0);
    flatOval(ctx, 36, 10, 13, 8, o.blush, 0);
  }

  // Близко посаженные выразительные глаза как в bbJriQ5RO1I!
  const eyeX = 18.5, eyeY = -4, eyeR = 15.5;
  const blinkFrame = (G.f + o.seed * 23) % 88;
  const blink = blinkFrame < 3 && o.eyes !== 'wide' && o.eyes !== 'red' && o.eyes !== 'dead';

  const sacStep = Math.floor(t * 1.3 + o.seed * 3.7);
  const lookX = o.look ? o.look[0] : (hash(sacStep * 5.1 + o.seed) - 0.5) * 1.3;
  const lookY = o.look ? o.look[1] : (hash(sacStep * 8.3 + o.seed) - 0.5) * 0.8;

  for (const sx of [-1, 1]) {
    const ex = sx * eyeX;
    if (o.eyes === 'dead') {
      flatOval(ctx, ex, eyeY, eyeR, eyeR, '#FFFFFF', 3.8, INK);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(ex - 8, eyeY); ctx.lineTo(ex + 8, eyeY);
      ctx.moveTo(ex, eyeY - 8); ctx.lineTo(ex, eyeY + 8);
      ctx.stroke();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - eyeR, eyeY + 2);
      ctx.quadraticCurveTo(ex, eyeY + 5, ex + eyeR, eyeY + 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.stroke();
    } else {
      const eyeOpenScale = o.eyes === 'wide' ? 1.12 : 1.0;
      flatOval(ctx, ex, eyeY, eyeR * eyeOpenScale, eyeR * eyeOpenScale, o.eyes === 'red' ? '#FDE2E2' : '#FFFFFF', 3.8, INK);

      if (o.eyes === 'red') {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        for (let v = 0; v < 4; v++) {
          const a = v * 1.57 + 0.4;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(a) * 8, eyeY + Math.sin(a) * 8);
          ctx.lineTo(ex + Math.cos(a) * 14, eyeY + Math.sin(a) * 14);
          ctx.stroke();
        }
      }

      const px = ex + clamp(lookX, -1, 1) * 5.2;
      const py = eyeY + clamp(lookY, -1, 1) * 4.5;
      const pr = o.eyes === 'wide' ? 3.5 : (o.eyes === 'red' ? 3.8 + Math.sin(t * 24) * 0.7 : 4.2);
      flatOval(ctx, px, py, pr, pr, INK, 0);

      if (o.eyes === 'lidded') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeR, eyeR, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = o.skin;
        ctx.fill();
        ctx.lineWidth = 3.6;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.restore();
      }
    }

    const browTalk = o.mouth > 0.1 ? Math.sin(t * 16 + sd) * 3.8 * o.mouth : 0;
    const by = eyeY - eyeR - 6 - browTalk;
    const tilt = o.brow * sx * 6.5;
    ctx.beginPath();
    ctx.moveTo(ex - 13, by - tilt);
    ctx.quadraticCurveTo(ex, by - 3 - Math.abs(o.mouth) * 2.5, ex + 13, by + tilt);
    ctx.lineWidth = 4.4;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  if (o.tears > 0) {
    for (const sx of [-1, 1]) {
      const tx = sx * eyeX;
      ctx.fillStyle = 'rgba(96,195,255,0.88)';
      ctx.beginPath();
      ctx.roundRect(tx - 5, eyeY + 11, 10, 30 * o.tears, 5);
      ctx.fill();
      for (let d = 0; d < 3; d++) {
        const dp = ((t * 3.8 + d / 3 + (sx > 0 ? 0.5 : 0)) % 1);
        const dx = tx + sx * (12 + dp * 42);
        const dy = eyeY + 9 - Math.sin(dp * Math.PI) * 18 + dp * 32;
        flatOval(ctx, dx, dy, (1 - dp) * 5.5 + 2, (1 - dp) * 3.5 + 2, '#60C3FF', 2, INK);
      }
    }
  }

  if (o.sweat > 0) {
    const swY = -16 + ((t * 28 + o.seed * 7) % 16);
    flatOval(ctx, rx - 16, swY, 5.5, 9, '#7DD3FC', 2.4, INK, 0.2);
  }

  if (o.mustache) {
    const mBob = o.mouth > 0.1 ? Math.sin(t * 20) * 2.2 * o.mouth : 0;
    flatPoly(ctx, [
      [-24, 16 + mBob], [-10, 9 + mBob], [0, 13 + mBob], [10, 9 + mBob], [24, 16 + mBob],
      [19, 21 + mBob], [0, 16 + mBob], [-19, 21 + mBob],
    ], o.mustache, 3, INK);
  }

  const my = o.mustache ? 27 : 22;
  const open = clamp(o.mouth, 0, 1);
  if (open > 0.07 || o.mood === 'scream') {
    const vowelShape = Math.sin(t * 26 + o.seed * 5);
    const mw = 11 + open * (14 + vowelShape * 4) + (o.mood === 'scream' ? 7 : 0);
    const mh = 5 + open * (15 - vowelShape * 2.5) + (o.mood === 'scream' ? 5 : 0);
    flatOval(ctx, 0, my, mw, mh, '#3D1512', 3.5, INK);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, my, Math.max(1, mw - 2), Math.max(1, mh - 2), 0, 0, Math.PI * 2);
    ctx.clip();
    if (open > 0.25 || o.mood === 'scream') {
      flatBox(ctx, -mw * 0.75, my - mh - 2, mw * 1.5, mh * 0.72, '#FFFFFF', 2, 2, INK);
    }
    flatOval(ctx, 0, my + mh * 0.58, mw * 0.72, mh * 0.62, '#E06D65', 0);
    ctx.restore();
  } else if (o.mood === 'smile' || o.mood === 'happy') {
    ctx.beginPath();
    ctx.arc(0, my - 4, 12, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (o.mood === 'buckteeth') {
    ctx.beginPath();
    ctx.arc(0, my - 4, 13, 0.15, Math.PI - 0.15);
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    flatBox(ctx, -6, my + 2, 6, 7, '#FFFFFF', 1, 2.4, INK);
    flatBox(ctx, 0, my + 2, 6, 7, '#FFFFFF', 1, 2.4, INK);
  } else if (o.mood === 'frown') {
    ctx.beginPath();
    ctx.arc(0, my + 8, 12, Math.PI + 0.25, -0.25);
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-10, my);
    ctx.lineTo(10, my);
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  if (o.mask) {
    const maskY = o.maskDown ? 38 : 15;
    const maskH = o.maskDown ? 16 : 30;
    flatBox(ctx, -40, maskY, 80, maskH, '#B9E6FE', 9, 3.4, INK);
  }

  ctx.restore(); // конец faceShiftX

  const hatBounce = (isMoving ? Math.max(0, Math.sin(phase * 2 - 0.8)) * (isRun ? 8 : 3.5) : 0) + o.hatLift;
  ctx.save();
  ctx.translate(faceShiftX * 0.35, -hatBounce);
  ctx.rotate(-headLagX * 0.012);

  if (o.hair === 'messy') {
    flatPoly(ctx, [
      [-60, -18], [-66, -44], [-38, -40], [-28, -62],
      [0, -46], [24, -64], [42, -42], [64, -46],
      [60, -16], [36, -28], [0, -30], [-36, -26],
    ], o.hairColor, 3.8, INK);
  } else if (o.hair === 'bald_sides') {
    flatOval(ctx, -60, -10, 11, 16, o.hairColor, 3.4, INK);
    flatOval(ctx, 60, -10, 11, 16, o.hairColor, 3.4, INK);
  }

  if (o.hat === 'helmet' || o.hat === 'helmet_medic') {
    ctx.beginPath();
    ctx.ellipse(0, -21, rx + 4, 38, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = o.hatColor;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    flatBox(ctx, -rx - 5, -25, (rx + 5) * 2, 10, shade(o.hatColor, 0.88), 4, 3.6, INK);
    if (o.hat === 'helmet_medic') {
      flatOval(ctx, 0, -40, 12, 12, '#FFFFFF', 2.8, INK);
      flatBox(ctx, -8, -43, 16, 5, '#DC2626', 1, 0);
      flatBox(ctx, -2.5, -48, 5, 16, '#DC2626', 1, 0);
    }
  } else if (o.hat === 'cap_cmd') {
    flatOval(ctx, 0, -46, rx + 12, 20, o.hatColor, 3.8, INK);
    flatBox(ctx, -rx + 6, -37, (rx - 6) * 2, 12, '#992929', 3, 3.4, INK);
    flatBox(ctx, -rx + 2, -26, (rx - 2) * 2, 7, '#1E1A17', 3, 3.4, INK);
    flatOval(ctx, 0, -46, 7, 7, '#F5C431', 2.4, INK);
  } else if (o.hat === 'fire') {
    ctx.beginPath();
    ctx.ellipse(0, -22, rx + 5, 38, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#F5C431';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    flatBox(ctx, -rx - 8, -24, (rx + 8) * 2, 9, '#D9A31E', 4, 3.6, INK);
    flatBox(ctx, -13, -46, 26, 16, '#DC2626', 3, 2.6, INK);
    text(ctx, '01', 0, -37, 12, '#FFFFFF');
  } else if (o.hat === 'scrub') {
    ctx.beginPath();
    ctx.ellipse(0, -22, rx + 3, 34, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = o.hatColor || '#5CC4B8';
    ctx.fill();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    flatBox(ctx, -rx - 2, -24, (rx + 2) * 2, 9, shade(o.hatColor || '#5CC4B8', 0.88), 3, 3.4, INK);
  }
  ctx.restore();

  if (o.headphones) {
    ctx.beginPath();
    ctx.arc(0, -5, rx + 5, Math.PI * 1.08, Math.PI * 1.92);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#2B2F36';
    ctx.stroke();
    flatBox(ctx, -rx - 12, -16, 18, 34, '#3B424C', 6, 3.6, INK);
    flatBox(ctx, rx - 6, -16, 18, 34, '#3B424C', 6, 3.6, INK);
  }

  ctx.restore(); // конец головы
  ctx.restore(); // конец торса
  ctx.restore(); // конец персонажа
}

// ---------- ПРОПСЫ В РУКИ ----------
export const propPhone = (screenCol = '#5CE67E', label = 'GTA VI') => ctx => {
  ctx.save();
  ctx.rotate(-0.22 + Math.sin(G.f * 0.35) * 0.06);
  flatBox(ctx, -15, -26, 32, 52, '#23272E', 5, 3.4, INK);
  flatBox(ctx, -11, -21, 24, 40, screenCol, 2.5, 2, INK);
  if (label) text(ctx, label, 1, -1, 9, '#111');
  ctx.restore();
};

export const propGamepad = ctx => {
  ctx.save();
  ctx.rotate(Math.sin(G.f * 0.8) * 0.08);
  flatBox(ctx, -26, -13, 52, 26, '#2C313A', 9, 3.4, INK);
  flatOval(ctx, -13, 0, 4.5, 4.5, '#60A5FA', 2, INK);
  flatOval(ctx, 13, -3, 3.5, 3.5, '#4ADE80', 1.5, INK);
  flatOval(ctx, 18, 3, 3.5, 3.5, '#EF4444', 1.5, INK);
  ctx.restore();
};

export const propMoneyBag = ctx => {
  flatOval(ctx, 0, 8, 30, 25, '#C8A46E', 3.5, INK);
  flatBox(ctx, -10, -16, 20, 10, '#C8A46E', 3, 3, INK);
  text(ctx, '$', 0, 10, 22, '#2F6F3E');
};
