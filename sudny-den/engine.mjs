// Движок: «дрожащие» линии в стиле Rick and Morty, персонаж-марионетка, камера, утилиты
export const W = 1920, H = 1080, FPS = 24;
export const G = { f: 0 }; // текущий кадр (для «кипения» линий)

export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = t => { t = clamp(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 3);
export const backOut = t => { t = clamp(t); const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const boilStep = () => Math.floor(G.f / 3);
export const jit = (seed, amt) => (hash(seed * 13.37 + boilStep() * 7.77) - 0.5) * 2 * amt;

// ---------- примитивы ----------
export function wpath(ctx, pts, closed = true, amt = 2.5, seed = 1) {
  const p = pts.map((q, i) => [q[0] + jit(seed + i * 3.1, amt), q[1] + jit(seed + i * 5.3 + 1, amt)]);
  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (closed) {
    const n = p.length; const m = mid(p[n - 1], p[0]); ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const c = p[i], mm = mid(c, p[(i + 1) % n]); ctx.quadraticCurveTo(c[0], c[1], mm[0], mm[1]); }
    ctx.closePath();
  } else {
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length - 1; i++) { const mm = mid(p[i], p[i + 1]); ctx.quadraticCurveTo(p[i][0], p[i][1], mm[0], mm[1]); }
    const l = p[p.length - 1]; ctx.lineTo(l[0], l[1]);
  }
}
export function paint(ctx, fill, lw = 6, stroke = '#151515') {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
export const ell = (cx, cy, rx, ry, n = 18, rot = 0) => Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2 + rot; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
export function blob(ctx, pts, fill, lw = 6, amt = 2.5, seed = 1) { wpath(ctx, pts, true, amt, seed); paint(ctx, fill, lw); }
export function oval(ctx, cx, cy, rx, ry, fill, lw = 6, amt = 2, seed = 1) { blob(ctx, ell(cx, cy, rx, ry, Math.max(10, Math.min(28, (rx + ry) / 6 | 0))), fill, lw, amt, seed); }
export function poly(ctx, pts, fill, lw = 6, amt = 2, seed = 1) {
  ctx.beginPath();
  pts.forEach((q, i) => { const x = q[0] + jit(seed + i * 2.3, amt), y = q[1] + jit(seed + i * 4.1, amt); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.closePath(); paint(ctx, fill, lw);
}
export const box = (ctx, x, y, w, h, fill, lw = 6, amt = 2, seed = 1) => poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, lw, amt, seed);
export function line(ctx, pts, lw = 6, color = '#151515', amt = 2, seed = 1) {
  wpath(ctx, pts, false, amt, seed); ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
export function limb(ctx, pts, w, color, seed = 1) { line(ctx, pts, w + 11, '#151515', 1.5, seed); line(ctx, pts, w, color, 1.5, seed); }
export function text(ctx, s, x, y, size, color = '#fff', font = 'Impact', align = 'center', stroke = null, lw = 8) {
  ctx.font = `${size}px "${font}"`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (color) { ctx.fillStyle = color; ctx.fillText(s, x, y); }
}

// ---------- камера и эффекты ----------
export function camera(ctx, x = W / 2, y = H / 2, z = 1, shake = 0, rot = 0) {
  const sx = shake ? (hash(G.f * 1.37) - 0.5) * 2 * shake : 0, sy = shake ? (hash(G.f * 2.71 + 5) - 0.5) * 2 * shake : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-x, -y);
}
export function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
export function overlay(ctx, color, alpha, mode = 'source-over') {
  if (alpha <= 0) return; screen(ctx); ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.globalCompositeOperation = mode; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function vignette(ctx, k = 0.55) {
  screen(ctx); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
export function speedLines(ctx, alpha = 0.6, cx = W / 2, cy = H / 2) {
  screen(ctx); ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#fff';
  for (let i = 0; i < 60; i++) { const a = hash(i * 9.1 + G.f * 0.5) * Math.PI * 2, r1 = 380 + hash(i * 3.3 + G.f) * 300, r2 = 1400;
    ctx.lineWidth = 2 + hash(i) * 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke(); }
  ctx.restore();
}

// ---------- персонаж-марионетка ----------
const DEF = {
  x: 0, y: 0, s: 1, flip: 1, rot: 0, seed: 1,
  skin: '#f2c9a0', shirt: '#6b8fbf', pants: '#3a3f55', shoes: '#262626',
  legH: 150, bodyH: 175, bodyW: 150, belly: 0, headW: 88, headH: 92, jowl: 0, headTilt: 0,
  hair: null, hairColor: '#4a3020', eyes: 'normal', eyeR: 27, pupil: 5, look: [0, 0], bags: false, brow: 0, browColor: '#151515',
  nose: '#e8b08a', noseR: 13, mustache: null, stubble: false,
  mouth: 0, mood: 'flat', mask: null, maskDown: false, tears: 0, tearJet: 0, sweat: 0, blink: true,
  arms: { l: [0.25, 0.2], r: [0.25, 0.2] }, legs: [0.06, 0.06], run: null, sit: false,
  tie: null, coat: null, headphones: false, glasses: false, helmet: null, cap: null,
  holdL: null, holdR: null, outfit: null, backpack: false,
};

function shoe(ctx, x, y, c, sd) { oval(ctx, x, y, 30, 15, c, 6, 1.5, sd); }

export function person(ctx, opt) {
  const o = { ...DEF, ...opt, arms: { ...DEF.arms, ...(opt.arms || {}) } };
  const sd = o.seed;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(o.s * o.flip, o.s);
  const LH = o.legH, BH = o.bodyH, BW = o.bodyW;
  const hipY = o.sit ? -LH * 0.5 : -LH;
  const top = hipY - BH;

  if (o.backpack) box(ctx, -BW / 2 - 70, top + 10, 90, 130, '#2fb34a', 6, 2, sd + 90);

  // ноги
  if (o.sit) {
    for (const sx of [-1, 1]) { const hx = sx * BW * 0.2; limb(ctx, [[hx, hipY], [hx + 80, hipY + 4], [hx + 88, -12]], 38, o.pants, sd + sx); shoe(ctx, hx + 100, -10, o.shoes, sd + sx); }
  } else if (o.run != null) {
    [-1, 1].forEach((sx, i) => {
      const ph = o.run + i * Math.PI, a = Math.sin(ph) * 0.85, k = (Math.cos(ph) + 1) * 0.55;
      const hx = sx * BW * 0.12, kx = hx + Math.sin(a) * LH * 0.5, ky = hipY + Math.cos(a) * LH * 0.5;
      const fx = kx + Math.sin(a - k) * LH * 0.5, fy = ky + Math.cos(a - k) * LH * 0.5;
      limb(ctx, [[hx, hipY], [kx, ky], [fx, fy]], 36, o.pants, sd + i); shoe(ctx, fx + 12, fy, o.shoes, sd + i);
    });
  } else {
    [-1, 1].forEach((sx, i) => {
      const a = o.legs[i] * sx, hx = sx * BW * 0.2;
      const fx = hx + Math.sin(a) * LH, fy = hipY + Math.cos(a) * LH;
      limb(ctx, [[hx, hipY], [(hx + fx) / 2, (hipY + fy) / 2], [fx, fy]], 38, o.pants, sd + i); shoe(ctx, fx + sx * 8, fy - 4, o.shoes, sd + i);
    });
  }

  // торс
  const bw = BW / 2, bl = 1 + o.belly;
  blob(ctx, [[-bw + 8, top + 6], [0, top - 4], [bw - 8, top + 6], [bw * bl, top + BH * 0.55], [bw * 0.92, hipY + 8], [0, hipY + 16], [-bw * 0.92, hipY + 8], [-bw * bl, top + BH * 0.55]], o.shirt, 6, 2, sd + 10);
  if (o.outfit === 'hoodie') { line(ctx, [[-14, top + 10], [-16, top + 70]], 4, '#ddd', 1, sd + 11); line(ctx, [[14, top + 10], [16, top + 70]], 4, '#ddd', 1, sd + 12); blob(ctx, [[-bw * 0.6, top + BH * 0.62], [bw * 0.6, top + BH * 0.62], [bw * 0.5, top + BH * 0.85], [-bw * 0.5, top + BH * 0.85]], 'rgba(0,0,0,0.12)', 4, 1, sd + 13); }
  if (o.outfit === 'scrubs') line(ctx, [[-30, top + 2], [0, top + 45], [30, top + 2]], 5, '#151515', 1, sd + 14);
  if (o.outfit === 'vest') { blob(ctx, [[-bw + 14, top + 12], [-12, top + 70], [-14, hipY + 10], [-bw * bl + 6, hipY], [-bw * bl, top + BH * 0.55]], '#7a5a3a', 5, 1.5, sd + 15); blob(ctx, [[bw - 14, top + 12], [12, top + 70], [14, hipY + 10], [bw * bl - 6, hipY], [bw * bl, top + BH * 0.55]], '#7a5a3a', 5, 1.5, sd + 16); }
  if (o.outfit === 'suit') { blob(ctx, [[-bw + 10, top + 8], [-18, top + 90], [-bw * bl + 4, hipY + 5], [-bw * bl, top + BH * 0.5]], '#2c2f3a', 5, 1.5, sd + 17); blob(ctx, [[bw - 10, top + 8], [18, top + 90], [bw * bl - 4, hipY + 5], [bw * bl, top + BH * 0.5]], '#2c2f3a', 5, 1.5, sd + 18); }
  if (o.outfit === 'fireman') { box(ctx, -bw * 1.02, top + BH * 0.55, BW * 1.04, 16, '#f2e14a', 4, 1, sd + 19); }
  if (o.outfit === 'guard') { box(ctx, -bw * 0.75, top + 25, BW * 0.75, BH * 0.6, '#3d4a2c', 5, 1.5, sd + 19); text(ctx, 'ОХРАНА', -bw * 0.38, top + 65, 22, '#e8e070', 'Arial Black'); }
  if (o.outfit === 'courier') { text(ctx, 'ЕДА', 0, top + 70, 34, '#151515', 'Arial Black'); }
  if (o.coat) { blob(ctx, [[-bw - 6, top + 4], [-20, top + 10], [-26, hipY + 40], [-bw * bl - 12, hipY + 40]], o.coat, 5, 2, sd + 20); blob(ctx, [[bw + 6, top + 4], [20, top + 10], [26, hipY + 40], [bw * bl + 12, hipY + 40]], o.coat, 5, 2, sd + 21); }
  if (o.tie) { const sw = o.tieSwing || 0; poly(ctx, [[-10, top + 6], [10, top + 6], [16 + sw, top + 90], [sw, top + 115], [-16 + sw, top + 90]], o.tie, 5, 1.5, sd + 22); }

  // голова
  const neck = 10, hy = top - neck - o.headH * 0.88;
  ctx.save(); ctx.translate(0, top); ctx.rotate(o.headTilt); ctx.translate(0, -top);
  drawHead(ctx, o, 0, hy);
  ctx.restore();

  // руки (поверх тела)
  const shY = top + 24;
  [-1, 1].forEach((sx, i) => {
    const [a1, a2] = i === 0 ? o.arms.l : o.arms.r, len = o.armLen || 1;
    const shx = sx * (bw - 10);
    const ex = shx + sx * Math.sin(a1) * 82 * len, ey = shY + Math.cos(a1) * 82 * len;
    const hx = ex + sx * Math.sin(a1 + a2) * 78 * len, hy2 = ey + Math.cos(a1 + a2) * 78 * len;
    limb(ctx, [[shx, shY], [ex, ey], [hx, hy2]], 30, o.sleeve || o.shirt, sd + 30 + i);
    oval(ctx, hx, hy2, 17, 17, o.skin, 5, 1.5, sd + 33 + i);
    const hold = i === 0 ? o.holdL : o.holdR;
    if (hold) { ctx.save(); ctx.translate(hx, hy2); ctx.rotate(-sx * (a1 + a2)); hold(ctx); ctx.restore(); }
  });
  ctx.restore();
}

export function drawHead(ctx, o, cx, cy) {
  const sd = o.seed, hw = o.headW, hh = o.headH;
  // уши
  oval(ctx, cx - hw + 2, cy + 4, 16, 22, o.skin, 5, 1.5, sd + 40); oval(ctx, cx + hw - 2, cy + 4, 16, 22, o.skin, 5, 1.5, sd + 41);
  if (o.headphones) { oval(ctx, cx - hw - 4, cy + 4, 24, 34, '#222', 5, 1.5, sd + 42); oval(ctx, cx + hw + 4, cy + 4, 24, 34, '#222', 5, 1.5, sd + 43); }
  // форма головы
  const pts = Array.from({ length: 22 }, (_, i) => { const t = i / 22 * Math.PI * 2; const s = Math.sin(t); const jw = s > 0 ? 1 + o.jowl * s * s : 1; return [cx + Math.cos(t) * hw * jw, cy + s * hh * (s > 0 ? 1 + o.jowl * 0.15 : 1)]; });
  blob(ctx, pts, o.skin, 6, 2.2, sd + 44);
  if (o.stubble) { ctx.fillStyle = 'rgba(60,40,30,0.55)'; for (let i = 0; i < 70; i++) { const a = Math.PI * (0.12 + 0.76 * hash(sd + i)), r = 0.55 + 0.42 * hash(i * 7 + sd); ctx.fillRect(cx + Math.cos(a) * hw * r * (1 + o.jowl * 0.6), cy + Math.sin(a) * hh * r * 1.05, 3, 3); } }

  // волосы / головные уборы
  const hc = o.hairColor;
  if (o.hair === 'messy') { const p = []; for (let i = 0; i <= 14; i++) { const t = Math.PI + i / 14 * Math.PI; const r = i % 2 ? 1.0 : 1.22; p.push([cx + Math.cos(t) * hw * r * 1.02, cy - 18 + Math.sin(t) * hh * r]); } p.push([cx + hw * 0.9, cy - 20]); p.push([cx - hw * 0.9, cy - 20]); poly(ctx, p, hc, 6, 2.5, sd + 45); }
  if (o.hair === 'side') blob(ctx, [[cx - hw * 1.02, cy - 5], [cx - hw * 0.9, cy - hh * 0.75], [cx - hw * 0.2, cy - hh * 1.08], [cx + hw * 0.6, cy - hh * 0.98], [cx + hw * 1.02, cy - hh * 0.4], [cx + hw * 0.98, cy - 10], [cx + hw * 0.6, cy - hh * 0.6], [cx - hw * 0.6, cy - hh * 0.55]], hc, 6, 2, sd + 46);
  if (o.hair === 'bald') { blob(ctx, ell(cx - hw * 0.92, cy - 14, 18, 30), hc, 5, 2, sd + 47); blob(ctx, ell(cx + hw * 0.92, cy - 14, 18, 30), hc, 5, 2, sd + 48); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - hw * 0.3, cy - hh * 0.72, 24, 10, -0.3, 0, Math.PI * 2); ctx.fill(); }
  if (o.hair === 'combover') { line(ctx, [[cx - hw * 0.95, cy - 20], [cx - hw * 0.3, cy - hh * 0.95], [cx + hw * 0.7, cy - hh * 0.8]], 7, hc, 2, sd + 49); line(ctx, [[cx - hw * 0.95, cy - 10], [cx - hw * 0.2, cy - hh * 0.85], [cx + hw * 0.8, cy - hh * 0.65]], 7, hc, 2, sd + 50); }
  if (o.cap) blob(ctx, [[cx - hw * 1.05, cy - hh * 0.25], [cx - hw * 0.95, cy - hh * 0.95], [cx, cy - hh * 1.25], [cx + hw * 0.95, cy - hh * 0.95], [cx + hw * 1.05, cy - hh * 0.25], [cx, cy - hh * 0.4]], o.cap, 6, 2, sd + 51);
  if (o.helmet) { blob(ctx, [[cx - hw * 1.15, cy - hh * 0.35], [cx - hw * 0.9, cy - hh * 1.05], [cx, cy - hh * 1.3], [cx + hw * 0.9, cy - hh * 1.05], [cx + hw * 1.15, cy - hh * 0.35]], o.helmet, 6, 2, sd + 52); box(ctx, cx - hw * 1.35, cy - hh * 0.42, hw * 2.7, 18, o.helmet, 5, 1.5, sd + 53); }
  if (o.headphones) line(ctx, [[cx - hw - 4, cy - 10], [cx - hw * 0.8, cy - hh * 1.05], [cx, cy - hh * 1.22], [cx + hw * 0.8, cy - hh * 1.05], [cx + hw + 4, cy - 10]], 14, '#222', 1.5, sd + 54);

  // глаза
  const ey = cy - hh * 0.12, ex = hw * 0.36, R = o.eyeR * (o.eyes === 'wide' ? 1.3 : 1);
  const blinking = o.blink && ((G.f + sd * 37) % 87) < 3;
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex;
    if (o.bags) line(ctx, [[x - R * 0.8, ey + R * 1.05], [x, ey + R * 1.35], [x + R * 0.8, ey + R * 1.05]], 5, '#8a5a8a', 1, sd + 55 + sx);
    if (o.eyes === 'happy' || blinking || o.eyes === 'closed') { line(ctx, o.eyes === 'happy' ? [[x - R, ey + 4], [x, ey - R * 0.7], [x + R, ey + 4]] : [[x - R, ey], [x, ey + 6], [x + R, ey]], 6, '#151515', 1, sd + 57 + sx); continue; }
    if (o.eyes === 'x') { line(ctx, [[x - R * 0.7, ey - R * 0.7], [x + R * 0.7, ey + R * 0.7]], 7, '#151515', 1, sd + 59); line(ctx, [[x + R * 0.7, ey - R * 0.7], [x - R * 0.7, ey + R * 0.7]], 7, '#151515', 1, sd + 60); continue; }
    const white = o.eyes === 'red' ? '#ffd9d2' : '#ffffff';
    oval(ctx, x, ey, R, R * 1.05, white, 5, 1.2, sd + 61 + sx);
    if (o.eyes === 'red') { ctx.strokeStyle = '#e02020'; ctx.lineWidth = 2.5; for (let k = 0; k < 6; k++) { const a = hash(sd + k * 3 + sx) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.95, ey + Math.sin(a) * R * 0.95); ctx.lineTo(x + Math.cos(a + 0.3) * R * 0.5, ey + Math.sin(a + 0.3) * R * 0.5); ctx.lineTo(x + Math.cos(a - 0.2) * R * 0.3, ey + Math.sin(a - 0.2) * R * 0.3); ctx.stroke(); } }
    const px = x + o.look[0] * R * 0.45, py = ey + o.look[1] * R * 0.45;
    ctx.fillStyle = '#151515'; ctx.beginPath(); ctx.arc(px, py, o.eyes === 'wide' ? 4 : o.pupil, 0, Math.PI * 2); ctx.fill();
    if (o.eyes === 'lidded' || o.eyes === 'sad') { ctx.save(); wpath(ctx, ell(x, ey, R, R * 1.05), true, 1.2, sd + 61 + sx); ctx.clip(); ctx.fillStyle = o.skin; ctx.fillRect(x - R - 5, ey - R - 5, 2 * R + 10, R * (o.eyes === 'sad' ? 0.9 : 1.15) + 5); ctx.restore(); line(ctx, o.eyes === 'sad' ? [[x - R, ey - R * 0.1 + sx * 6], [x + R, ey - R * 0.1 - sx * 6]] : [[x - R, ey + 2], [x + R, ey + 2]], 5, '#151515', 1, sd + 63 + sx); }
    if (o.glasses) { ctx.lineWidth = 5; ctx.strokeStyle = '#151515'; ctx.beginPath(); ctx.arc(x, ey, R + 9, 0, Math.PI * 2); ctx.stroke(); }
    // брови
    const b = o.brow; if (o.browW !== 0) line(ctx, [[x + sx * R * 1.0, ey - R - 14 - b * 4], [x - sx * R * 0.2, ey - R - 14 + (b < 0 ? 12 : -12) * Math.abs(b) - 2]], o.browW || 7, o.browColor, 1, sd + 65 + sx);
  }
  if (o.glasses) line(ctx, [[cx - ex + R + 9, ey], [cx + ex - R - 9, ey]], 5, '#151515', 1, sd + 67);

  // нос
  oval(ctx, cx + 4, cy + hh * 0.18, o.noseR, o.noseR * 0.9, o.nose, 5, 1.2, sd + 68);
  if (o.mustache) blob(ctx, [[cx - 45, cy + hh * 0.36], [cx - 20, cy + hh * 0.26], [cx, cy + hh * 0.3], [cx + 20, cy + hh * 0.26], [cx + 45, cy + hh * 0.36], [cx, cy + hh * 0.38]], o.mustache, 5, 1.5, sd + 69);

  // рот
  const my = cy + hh * 0.5, m = o.mouth, mood = o.mood;
  if (o.mask && !o.maskDown) {
    blob(ctx, [[cx - hw * 0.85, cy + hh * 0.05], [cx + hw * 0.85, cy + hh * 0.05], [cx + hw * 0.8, cy + hh * 0.7 + m * 8], [cx, cy + hh * 0.85 + m * 12], [cx - hw * 0.8, cy + hh * 0.7 + m * 8]], o.mask, 5, 1.5, sd + 70);
    line(ctx, [[cx - hw * 0.6, cy + hh * 0.35 + m * 5], [cx + hw * 0.6, cy + hh * 0.35 + m * 5]], 3, 'rgba(0,0,0,0.35)', 1, sd + 71);
    line(ctx, [[cx - hw * 0.85, cy + hh * 0.1], [cx - hw - 6, cy - 5]], 3, '#eee', 1, sd + 72); line(ctx, [[cx + hw * 0.85, cy + hh * 0.1], [cx + hw + 6, cy - 5]], 3, '#eee', 1, sd + 73);
  } else if (m > 0.06 || mood === 'scream') {
    const mm = mood === 'scream' ? Math.max(m, 0.8) : m;
    const w = 34 + (mood === 'grin' ? 34 : 0) + mm * 18, h = 8 + mm * 52;
    const frown = mood === 'frown' || mood === 'scream';
    const p = frown ? [[cx - w, my + h * 0.3], [cx - w * 0.6, my - h * 0.55], [cx, my - h * 0.7], [cx + w * 0.6, my - h * 0.55], [cx + w, my + h * 0.3], [cx, my + h * 0.45]]
      : [[cx - w, my - h * 0.2], [cx, my - h * 0.3], [cx + w, my - h * 0.2], [cx + w * 0.7, my + h * 0.6], [cx, my + h * 0.85], [cx - w * 0.7, my + h * 0.6]];
    blob(ctx, p, '#5a1212', 5, 1.5, sd + 74);
    ctx.save(); wpath(ctx, p, true, 1.5, sd + 74); ctx.clip();
    ctx.fillStyle = '#e46a7a'; ctx.beginPath(); ctx.ellipse(cx, my + h * 0.7, w * 0.6, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (mood === 'grin' || mood === 'smile' || mood === 'scream') { ctx.fillStyle = '#fff'; ctx.fillRect(cx - w, my - h * 0.75, w * 2, h * 0.3); }
    ctx.restore();
  } else if (mood === 'grin') {
    const p = [[cx - 62, my - 12], [cx, my - 4], [cx + 62, my - 12], [cx + 50, my + 18], [cx, my + 26], [cx - 50, my + 18]];
    blob(ctx, p, '#fff', 5, 1.5, sd + 75); for (let k = -2; k <= 2; k++) line(ctx, [[cx + k * 20, my - 6], [cx + k * 19, my + 22]], 3, '#151515', 0.5, sd + 76 + k);
    line(ctx, [[cx - 56, my + 5], [cx, my + 10], [cx + 56, my + 5]], 3, '#151515', 0.5, sd + 82);
  } else if (mood === 'smile') line(ctx, [[cx - 38, my - 8], [cx, my + 12], [cx + 38, my - 8]], 6, '#151515', 1.2, sd + 83);
  else if (mood === 'frown') line(ctx, [[cx - 34, my + 12], [cx, my - 6], [cx + 34, my + 12]], 6, '#151515', 1.2, sd + 84);
  else if (mood === 'wobbly') line(ctx, [[cx - 36, my + 4], [cx - 18, my - 4], [cx, my + 4], [cx + 18, my - 4], [cx + 36, my + 4]], 5, '#151515', 1.2, sd + 85);
  else line(ctx, [[cx - 30, my], [cx + 30, my + 2]], 6, '#151515', 1.2, sd + 86);
  if (o.mask && o.maskDown) blob(ctx, [[cx - hw * 0.75, cy + hh * 0.75], [cx + hw * 0.75, cy + hh * 0.75], [cx + hw * 0.6, cy + hh * 1.08], [cx - hw * 0.6, cy + hh * 1.08]], o.mask, 5, 1.5, sd + 87);

  // слёзы и пот
  if (o.tears > 0) for (const sx of [-1, 1]) {
    const x = cx + sx * ex, len = hh * 0.9 * o.tears;
    line(ctx, [[x, ey + R * 0.7], [x + sx * 4, ey + R + len * 0.5], [x + sx * 2, ey + R + len]], 12, '#6ec6ff', 1.5, sd + 88 + sx);
    for (let k = 0; k < 2; k++) { const ph = ((G.f / FPS) * 2.2 + k * 0.5 + (sx > 0 ? 0.25 : 0)) % 1; oval(ctx, x + sx * 6, ey + R + len + ph * 120, 7, 10, '#6ec6ff', 3, 1, sd + 90 + k); }
  }
  if (o.tearJet > 0) for (const sx of [-1, 1]) for (let k = 0; k < 8; k++) {
    const ph = ((G.f / FPS) * 1.8 + k / 8) % 1, x = cx + sx * ex + sx * ph * 260 * o.tearJet, y = ey - 10 - Math.sin(ph * Math.PI) * 120 * o.tearJet + ph * 160;
    oval(ctx, x, y, 9, 11, '#6ec6ff', 3, 1, sd + 93 + k);
  }
  if (o.sweat > 0) for (let k = 0; k < 3; k++) { const ph = ((G.f / FPS) * 1.5 + k / 3) % 1; const x = cx + (k - 1) * hw * 0.8, y = cy - hh * 0.6 + ph * hh * 1.2; ctx.globalAlpha = (1 - ph) * o.sweat; oval(ctx, x, y, 8, 12, '#a8e0ff', 3, 1, sd + 100 + k); ctx.globalAlpha = 1; }
}

// ---------- реквизит ----------
export const gamepad = (ctx) => { blob(ctx, [[-40, -16], [40, -16], [52, 14], [34, 22], [0, 10], [-34, 22], [-52, 14]], '#2a2a2a', 5, 1.2, 201); ctx.fillStyle = '#e33'; ctx.beginPath(); ctx.arc(26, -4, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#3c3'; ctx.beginPath(); ctx.arc(36, 4, 5, 0, 7); ctx.fill(); };
export const phone = (glow = '#bfe6ff', txt = '') => (ctx) => { box(ctx, -20, -36, 40, 72, '#222', 5, 1, 202); ctx.fillStyle = glow; ctx.fillRect(-14, -29, 28, 56); if (txt) text(ctx, txt, 0, 0, 9, '#151515', 'Arial Black'); };
export const scalpel = (ctx) => { line(ctx, [[0, 0], [0, 55]], 8, '#bbb', 0.5, 203); poly(ctx, [[-5, 55], [5, 55], [0, 85]], '#e8e8e8', 3, 0.5, 204); };
export const bat = (ctx) => { poly(ctx, [[-6, -10], [6, -10], [14, 150], [-14, 150]], '#b8864a', 5, 1, 205); };
