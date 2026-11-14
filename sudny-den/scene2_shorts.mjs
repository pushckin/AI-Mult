// СЦЕНА 2: «На грани катастрофы» — Пульт управления АЭС (9:16 YouTube Shorts, в точном 2D-стиле bbJriQ5RO1I)
import {
  W, H, G, INK, clamp, lerp, seg, ease, easeIn, easeOut, backOut, shade,
  camera, screen, flatBox, flatOval, flatPoly, text, lightCone, overlay,
  drawForegroundFrame, drawLocationTag, drawCounterHUD, person, propGamepad,
} from './engine_shorts.mjs';

export function mouthOf(tl, id, t) {
  const l = tl.lines[id];
  if (!l || t < l.start || t > l.end) return 0;
  const idx = Math.floor((t - l.start) * tl.fps);
  return l.env[clamp(idx, 0, l.env.length - 1)] || 0;
}

// Цельная рука/нога или трубка без швов
function drawTubeLimb(ctx, x0, y0, x1, y1, x2, y2, width, color, lw = 4) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x1, y1, x2, y2);
  ctx.lineWidth = width + lw * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x1, y1, x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

// Детализированный розовый фламинго в неоновом меню Vice City (с каждым прорисованным пёрышком!)
function drawDetailedFlamingo(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ноги (длинные, тонкие, сочленения суставов)
  drawTubeLimb(ctx, 10, 30, 8, 72, 6, 120, 6, '#FB7185', 2.5);
  drawTubeLimb(ctx, 20, 30, 42, 62, 22, 98, 6, '#FB7185', 2.5);
  // Лапка с перепонками
  flatPoly(ctx, [[6, 120], [-12, 124], [18, 124]], '#E11D48', 2, INK);

  // Хвостовые каскадные перья
  for (let tp = 0; tp < 4; tp++) {
    const ta = -0.4 - tp * 0.18;
    ctx.save();
    ctx.translate(-26, 8 + tp * 6);
    ctx.rotate(ta);
    flatOval(ctx, -14, 0, 18, 7, tp % 2 ? '#BE185D' : '#E11D48', 2, INK);
    ctx.beginPath();
    ctx.moveTo(-28, 0); ctx.lineTo(0, 0);
    ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }

  // Основной контур тела
  flatOval(ctx, 10, 15, 38, 26, '#F472B6', 3.5, INK, -0.15);

  // 1-й ряд перьев крыла (нижний, тёмная маджента)
  const row1 = [[-12, 18], [2, 22], [16, 24], [30, 22]];
  for (const [fx, fy] of row1) {
    flatOval(ctx, fx, fy, 11, 7, '#BE185D', 2, INK, 0.25);
    ctx.beginPath(); ctx.moveTo(fx - 8, fy - 2); ctx.lineTo(fx + 6, fy + 2);
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  }

  // 2-й ряд перьев крыла (средний, яркий розовый)
  const row2 = [[-16, 10], [-2, 13], [12, 15], [26, 13], [38, 10]];
  for (const [fx, fy] of row2) {
    flatOval(ctx, fx, fy, 11, 7, '#EC4899', 2, INK, 0.2);
    ctx.beginPath(); ctx.moveTo(fx - 8, fy - 2); ctx.lineTo(fx + 6, fy + 2);
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  }

  // 3-й ряд перьев крыла (верхний, нежно-розовый)
  const row3 = [[-12, 2], [2, 4], [16, 5], [28, 3]];
  for (const [fx, fy] of row3) {
    flatOval(ctx, fx, fy, 10, 6, '#F9A8D4', 2, INK, 0.15);
    ctx.beginPath(); ctx.moveTo(fx - 7, fy - 1); ctx.lineTo(fx + 5, fy + 1);
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  }

  // Длинная грациозная S-образная шея
  drawTubeLimb(ctx, 36, 10, 48, -25, 34, -58, 13, '#F472B6', 3);

  // Голова
  flatOval(ctx, 32, -64, 15, 12, '#F472B6', 3, INK, -0.2);

  // Изогнутый клюв (чёрный кончик + жёлто-белая основа)
  flatPoly(ctx, [[38, -68], [54, -64], [52, -48], [42, -54]], '#FDE047', 2.5, INK);
  flatPoly(ctx, [[48, -58], [54, -64], [52, -48]], '#181410', 2, INK);

  // Глаз
  flatOval(ctx, 30, -66, 3.5, 3.5, '#FFFFFF', 1.5, INK);
  flatOval(ctx, 31, -66, 1.6, 1.6, INK, 0);

  ctx.restore();
}

// Круглый аналоговый манометр/индикатор с красной опасной зоной
function drawAnalogDial(ctx, x, y, radius = 30, value = 0.88, label = 'МПа') {
  ctx.save();
  ctx.translate(x, y);
  flatOval(ctx, 0, 0, radius, radius, '#37433B', 3.5, INK);
  flatOval(ctx, 0, 0, radius - 5, radius - 5, '#EFE8D3', 2, INK);

  // Красный сектор опасности
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius - 7, Math.PI * 0.1, Math.PI * 0.85);
  ctx.closePath();
  ctx.fillStyle = '#EF4444';
  ctx.fill();

  // Деления шкалы
  for (let i = 0; i < 9; i++) {
    const ang = -Math.PI * 0.85 + (i / 8) * (Math.PI * 1.7);
    const r1 = radius - 11, r2 = radius - 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  // Стрелка (дрожит в красной зоне)
  const needleAng = lerp(-Math.PI * 0.85, Math.PI * 0.85, clamp(value)) + (Math.sin(G.f * 0.6 + x) * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(needleAng) * (radius - 8), Math.sin(needleAng) * (radius - 8));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#181410';
  ctx.stroke();
  flatOval(ctx, 0, 0, 4, 4, '#B91C1C', 1.5, INK);

  if (label) {
    text(ctx, label, 0, radius * 0.45, 10, '#4B5563', 'Arial Black');
  }
  ctx.restore();
}

// Осциллограф / мини-экран мониторинга реактора
function drawOscilloscope(ctx, x, y, w, h, t) {
  flatBox(ctx, x, y, w, h, '#1F2923', 8, 3.5, INK);
  flatBox(ctx, x + 6, y + 6, w - 12, h - 12, '#0B1610', 4, 2, '#2D3B31');

  ctx.strokeStyle = 'rgba(74, 222, 128, 0.18)';
  ctx.lineWidth = 1;
  for (let lx = x + 18; lx < x + w - 10; lx += 22) {
    ctx.beginPath(); ctx.moveTo(lx, y + 6); ctx.lineTo(lx, y + h - 6); ctx.stroke();
  }
  for (let ly = y + 16; ly < y + h - 10; ly += 20) {
    ctx.beginPath(); ctx.moveTo(x + 6, ly); ctx.lineTo(x + w - 6, ly); ctx.stroke();
  }

  // Дрожащая синусоида перегрузки реактора
  ctx.beginPath();
  ctx.strokeStyle = '#4ADE80';
  ctx.lineWidth = 2.5;
  for (let px = x + 8; px <= x + w - 8; px += 4) {
    const norm = (px - x) / w;
    const wave = Math.sin(norm * 18 - t * 14) * Math.cos(norm * 6 + t * 4);
    const py = y + h / 2 + wave * (h * 0.32);
    if (px === x + 8) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  text(ctx, 'АКТИВНОСТЬ 100%', x + w / 2, y + 18, 11, '#4ADE80', 'Arial Black');
}

// ---------- СТЕНЫ БУНКЕРА, АВАРИЙНЫЕ ЛАМПЫ И ПОТОЛОЧНЫЕ СИРЕНЫ ----------
function drawBunkerBackground(ctx, t, menuOn, alarm) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#151C17');
  bgGrad.addColorStop(0.35, '#222C24');
  bgGrad.addColorStop(0.7, '#2A362C');
  bgGrad.addColorStop(1, '#18201A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-200, -100, W + 400, H + 200);

  // Вертикальные стальные швы и колонны панелей
  for (let px = -120; px <= W + 120; px += 160) {
    flatBox(ctx, px, -50, 14, H + 100, '#172019', 0, 2.5, '#0E1410');
    for (let ry = 80; ry < 1700; ry += 190) {
      flatOval(ctx, px + 7, ry, 3.5, 3.5, '#354338', 1.5, INK);
    }
  }

  // Горизонтальная балка с жёлто-чёрной разметкой
  flatBox(ctx, -100, 105, W + 200, 36, '#1C1917', 0, 3.5, INK);
  for (let hx = -80; hx < W + 80; hx += 42) {
    flatPoly(ctx, [
      [hx, 105], [hx + 24, 105], [hx + 12, 141], [hx - 12, 141],
    ], '#F6C93E', 0, INK);
  }

  // Трубы и коммуникации
  flatBox(ctx, -100, 75, W + 200, 20, '#5C4931', 0, 3, INK);
  flatBox(ctx, -100, 48, W + 200, 16, '#3A483E', 0, 2.5, INK);
  for (let cx = 80; cx < W; cx += 220) {
    flatBox(ctx, cx, 40, 18, 62, '#2A332B', 2, 2, INK);
  }

  // Настенные манометры
  drawAnalogDial(ctx, 80, 220, 30, 0.94, 'ТЕМП.');
  drawAnalogDial(ctx, 80, 290, 28, 0.98, 'МПа');
  drawAnalogDial(ctx, W - 80, 220, 30, 0.96, 'БАР');
  drawAnalogDial(ctx, W - 80, 290, 28, 0.92, 'РАД.');

  // Красные аварийные лампы под потолком с конусами света
  const sirenFlash = alarm ? (Math.sin(t * 11) + 1) * 0.5 : 0.08;
  const sirens = [180, 540, 900];

  for (const lx of sirens) {
    flatBox(ctx, lx - 30, 126, 60, 20, '#262A27', 4, 3, INK);
    const domeCol = alarm && sirenFlash > 0.35 ? '#FF2E2E' : '#7F1D1D';
    flatOval(ctx, lx, 148, 22, 16, domeCol, 3, INK);
    flatOval(ctx, lx - 5, 144, 8, 6, '#FFA4A4', 0);

    if (alarm) {
      const coneAlpha = 0.12 + sirenFlash * 0.28;
      lightCone(ctx, lx, 154, 44, 380, 1250, `rgba(239, 68, 68, ${coneAlpha})`);
    }
  }

  // Светодиодная матрица статуса
  flatBox(ctx, 35, 420, 95, 145, '#172019', 6, 3, INK);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const ledX = 55 + c * 35;
      const ledY = 445 + r * 32;
      const isRed = r < 2 || (r === 2 && c === 1);
      const isBlink = isRed && Math.sin(t * 10 + r * 2 + c) > 0;
      const ledFill = isRed ? (isBlink ? '#EF4444' : '#5A1212') : '#22C55E';
      flatOval(ctx, ledX, ledY, 8, 8, ledFill, 2, INK);
    }
  }
}

// ---------- ОГРОМНОЕ АВАРИЙНОЕ ТАБЛО С ОБРАТНЫМ ОТСЧЁТОМ ----------
function drawEmergencyBillboard(ctx, t, tl, alarm) {
  const s2s = tl.scenes.s2.start;
  const s2z = tl.cues.s2_zero;
  const remSec = Math.max(0, Math.ceil(45 * (1 - clamp((t - s2s) / (s2z - s2s)))));
  const remStr = `00:${String(remSec).padStart(2, '0')}`;
  const isZero = remSec === 0;

  const bx = 110, by = 350, bw = 860, bh = 205;

  // Тяжёлый стальной каркас табло
  flatBox(ctx, bx, by, bw, bh, '#121A15', 12, 4.5, INK);
  flatBox(ctx, bx + 10, by + 10, bw - 20, bh - 20, '#090D0B', 8, 3, '#2A362C');

  // Болты по углам рамки
  for (const cx of [bx + 18, bx + bw - 18]) {
    for (const cy of [by + 18, by + bh - 18]) {
      flatOval(ctx, cx, cy, 5, 5, '#68786C', 2, INK);
    }
  }

  // Верхняя полоса «КРИТИЧЕСКИЙ ПЕРЕГРЕВ РЕАКТОРА»
  const bannerFlash = alarm && Math.sin(t * 8) > 0;
  flatBox(ctx, bx + 22, by + 18, bw - 44, 44, bannerFlash ? '#991B1B' : '#5A1010', 6, 3, INK);
  text(ctx, 'КРИТИЧЕСКИЙ ПЕРЕГРЕВ РЕАКТОРА', bx + bw / 2, by + 40, 27, '#FEE2E2', 'Arial Black', '#1C1917', 5);

  // Центральный таймер «ВЗРЫВ ЧЕРЕЗ 00:XX»
  const timeFlash = remSec <= 10 && Math.sin(t * 14) > 0;
  const timeColor = isZero ? '#FFFFFF' : (timeFlash ? '#FDE047' : '#EF4444');
  text(ctx, `ВЗРЫВ ЧЕРЕЗ ${remStr}`, bx + bw / 2, by + 110, 56, timeColor, 'Arial Black', '#160B08', 8);

  // Сегментированная шкала расплава активной зоны
  const barX = bx + 45, barY = by + 152, barW = bw - 90, barH = 18;
  flatBox(ctx, barX, barY, barW, barH, '#171E19', 4, 2, '#354338');

  const filledSegments = clamp(Math.round(20 * (1 - remSec / 45)), 0, 20);
  const segW = (barW - 6) / 20;
  for (let s = 0; s < 20; s++) {
    const sx = barX + 3 + s * segW;
    const isLit = s < filledSegments;
    const segCol = s < 10 ? '#22C55E' : (s < 16 ? '#F59E0B' : '#EF4444');
    flatBox(ctx, sx + 1, barY + 2, segW - 2, barH - 4, isLit ? segCol : '#222A23', 2, 0);
  }

  text(ctx, 'АКТИВНАЯ ЗОНА: 100% РАСПЛАВ • РЕКОМЕНДУЕТСЯ ЭВАКУАЦИЯ', bx + bw / 2, by + 186, 13, '#9CA3AF', 'Arial Black');
}

// ---------- ПУЛЬТ УПРАВЛЕНИЯ АЭС (СТОЛ, ПРИБОРЫ, КНОПКА, ЧАЙ) ----------
function drawControlDeskSurface(ctx, t) {
  const deskY = 820;
  flatBox(ctx, -100, deskY, W + 200, 1000, '#2C372F', 0, 4.5, INK);
  flatBox(ctx, -100, deskY - 14, W + 200, 24, '#38473C', 4, 3.5, INK);

  // Слева: осциллограф
  drawOscilloscope(ctx, 35, deskY + 60, 165, 125, t);

  // Тумблеры
  flatBox(ctx, 35, deskY + 210, 165, 95, '#222B24', 6, 3, INK);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const tx = 56 + c * 36;
      const ty = deskY + 235 + r * 38;
      flatBox(ctx, tx - 9, ty - 9, 18, 18, '#161C18', 3, 2, INK);
      flatBox(ctx, tx - 4, ty - (c % 2 ? 12 : 2), 8, 14, c % 2 ? '#EF4444' : '#22C55E', 2, 1.5, INK);
    }
  }

  // Центральный блок управления под монитором
  flatBox(ctx, 230, deskY + 250, 400, 75, '#1E2520', 6, 3.5, INK);
  for (let k = 0; k < 12; k++) {
    flatBox(ctx, 246 + k * 31, deskY + 266, 24, 42, '#36443A', 3, 2, INK);
  }
}

// ---------- МОНИТОР ИВАНЫЧА (ЗАГРУЗКА 99% ИЛИ VICE CITY С ФЛАМИНГО) ----------
function drawIvanychMonitor(ctx, t, tl, menuOn, zeroOn) {
  const mx = 430, my = 730;
  const mw = 480, mh = 320;

  // Стойка монитора
  flatBox(ctx, mx - 30, my + mh / 2 - 10, 60, 80, '#1E2621', 4, 3.5, INK);
  flatOval(ctx, mx, my + mh / 2 + 70, 84, 20, '#18201B', 3.5, INK);

  // Корпус монитора
  flatBox(ctx, mx - mw / 2, my - mh / 2, mw, mh, '#2B352E', 12, 4.5, INK);
  flatBox(ctx, mx - mw / 2 + 12, my - mh / 2 + 12, mw - 24, mh - 24, '#171E19', 8, 3, INK);

  const sx = mx - mw / 2 + 18;
  const sy = my - mh / 2 + 18;
  const sw = mw - 36;
  const sh = mh - 36;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, 6);
  ctx.clip();

  if (!menuOn) {
    // --- ДО МЕНЮ: ЭКРАН ЗАГРУЗКИ GTA VI (99%) ---
    const bg = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    bg.addColorStop(0, '#0F1A2E');
    bg.addColorStop(1, '#080E1A');
    ctx.fillStyle = bg;
    ctx.fillRect(sx, sy, sw, sh);

    text(ctx, 'GTA VI — ЗАГРУЗКА 99%', mx, sy + 44, 27, '#38BDF8', 'Arial Black', '#080E1A', 5);

    const barX = sx + 28, barY = sy + 88, barW = sw - 56, barH = 34;
    flatBox(ctx, barX, barY, barW, barH, '#090D14', 6, 3, '#334155');
    const fillW = barW * 0.99;
    flatBox(ctx, barX + 2, barY + 2, fillW - 4, barH - 4, '#22C55E', 4, 0);

    const shimmer = ((t * 1.8) % 1) * fillW;
    flatBox(ctx, barX + shimmer, barY + 3, 26, barH - 6, 'rgba(255, 255, 255, 0.45)', 2, 0);
    text(ctx, '99%', mx, barY + barH / 2 + 1, 19, '#090D14', 'Arial Black');

    const dotCount = Math.floor((t * 3) % 4);
    const dots = '.'.repeat(dotCount);
    const shaderAlpha = 0.85 + Math.sin(t * 6) * 0.15;
    ctx.globalAlpha = shaderAlpha;
    text(ctx, `КОМПИЛЯЦИЯ ШЕЙДЕРОВ${dots}`, mx, sy + 156, 22, '#F1F5F9', 'Arial Black', '#090D14', 4);
    ctx.globalAlpha = 1;

    text(ctx, 'Шейдерный кэш: 14881 / 15000 • DirectX 12', mx, sy + 198, 15, '#94A3B8');
    text(ctx, 'ВНИМАНИЕ: НЕ ВЫКЛЮЧАЙТЕ ПИТАНИЕ СТАНЦИИ!', mx, sy + 232, 15, '#F87171', 'Arial Black');
  } else {
    // --- ПОСЛЕ МЕНЮ: ЯРКИЙ НЕОНОВЫЙ VICE CITY VI С ФЛАМИНГО ---
    const synthGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    synthGrad.addColorStop(0, '#C026D3');
    synthGrad.addColorStop(0.48, '#EC4899');
    synthGrad.addColorStop(1, '#06B6D4');
    ctx.fillStyle = synthGrad;
    ctx.fillRect(sx, sy, sw, sh);

    // Заходящее ретро-солнце
    flatOval(ctx, sx + 130, sy + 125, 65, 65, '#FDE047', 0);
    for (let sl = 0; sl < 5; sl++) {
      flatBox(ctx, sx + 55, sy + 105 + sl * 11, 150, 4, '#C026D3', 0, 0);
    }

    // Силуэт пальмы
    flatPoly(ctx, [
      [sx + 22, sy + 180], [sx + 32, sy + 105], [sx + 38, sy + 180],
    ], '#1E1B4B', 0, INK);
    flatOval(ctx, sx + 32, sy + 105, 44, 20, '#1E1B4B', 0);

    // Логотип «VICE CITY VI»
    text(ctx, 'VICE CITY VI', sx + 140, sy + 44, 34, '#FFFFFF', 'Arial Black', '#1E1B4B', 6);
    text(ctx, 'OFFICIAL RELEASE', sx + 140, sy + 72, 13, '#FDE047', 'Arial Black', '#1E1B4B', 3);

    // Детализированный розовый фламинго (с каждым прорисованным пёрышком!)
    drawDetailedFlamingo(ctx, sx + sw - 110, sy + 182, 1.25);

    // Кнопка «НОВАЯ ИГРА»
    const btnX = sx + 30, btnY = sy + 160, btnW = 190, btnH = 54;
    const btnFill = zeroOn ? '#FDE047' : '#22C55E';
    flatBox(ctx, btnX, btnY, btnW, btnH, btnFill, 8, 3.5, INK);
    text(ctx, 'НОВАЯ ИГРА', btnX + btnW / 2, btnY + btnH / 2 + 1, 24, '#090D14', 'Arial Black');

    // Курсор мыши
    const curX = btnX + btnW - 24 + (zeroOn ? -6 : Math.sin(t * 4) * 4);
    const curY = btnY + btnH / 2 + 4;
    flatPoly(ctx, [
      [curX, curY], [curX + 16, curY + 12], [curX + 8, curY + 15], [curX + 12, curY + 24],
      [curX + 7, curY + 26], [curX + 3, curY + 16], [curX - 2, curY + 20],
    ], '#FFFFFF', 2, INK);
  }

  // Блик по экрану
  flatPoly(ctx, [
    [sx, sy], [sx + 140, sy], [sx, sy + 180],
  ], 'rgba(255, 255, 255, 0.12)', 0, INK);

  ctx.restore();
}

// ---------- КРАСНАЯ КНОПКА «АВАРИЙНЫЙ СТОП» И КРУЖКА ЧАЯ С ПАРОМ ----------
function drawEmergencyButtonAndTea(ctx, t) {
  // 1. БОЛЬШАЯ КРАСНАЯ КНОПКА ПОД КОЛПАКОМ
  const bx = 760, by = 980;
  flatBox(ctx, bx - 65, by - 52, 130, 104, '#36443A', 8, 4, INK);

  // Жёлто-чёрная предупреждающая рамка вокруг кнопки
  flatBox(ctx, bx - 55, by - 42, 110, 20, '#F6C93E', 3, 2, INK);
  for (let hx = bx - 50; hx < bx + 50; hx += 16) {
    flatPoly(ctx, [[hx, by - 42], [hx + 8, by - 42], [hx, by - 22], [hx - 8, by - 22]], '#1C1917', 0, INK);
  }

  // Большая красная грибовидная кнопка (АЗ-5)
  flatBox(ctx, bx - 18, by - 12, 36, 24, '#991B1B', 2, 2.5, INK);
  flatOval(ctx, bx, by - 14, 44, 25, '#EF4444', 4, INK);
  flatOval(ctx, bx - 10, by - 20, 24, 11, '#FCA5A5', 0);

  // Откидной прозрачный пластиковый защитный колпак
  ctx.save();
  ctx.translate(bx - 55, by - 45);
  ctx.rotate(-0.52);
  flatBox(ctx, 0, -55, 110, 55, 'rgba(186, 230, 253, 0.45)', 6, 2.5, '#7DD3FC');
  ctx.restore();

  text(ctx, 'АВАРИЙНЫЙ СТОП', bx, by + 34, 13, '#FCA5A5', 'Arial Black', '#1C1917', 3.5);

  // 2. КРУЖКА ГОРЯЧЕГО ЧАЯ С ПАРОМ ИВАНЫЧА
  const mx = 645, my = 995;
  flatBox(ctx, mx - 20, my - 24, 40, 48, '#F8FAFC', 5, 3.5, INK);
  ctx.beginPath();
  ctx.arc(mx + 22, my, 12, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = INK;
  ctx.stroke();

  flatOval(ctx, mx, my - 24, 17, 6, '#78350F', 2, INK);
  flatOval(ctx, mx, my + 2, 8, 8, '#F59E0B', 2, INK);

  // Клубящийся горячий пар
  for (let s = 0; s < 3; s++) {
    const sp = ((t * 0.9 + s * 0.33) % 1);
    const sy = my - 32 - sp * 68;
    const sx = mx + Math.sin(t * 3 + s * 2) * 12;
    const sa = (1 - sp) * 0.65;
    flatOval(ctx, sx, sy, 7 + sp * 8, 5 + sp * 5, `rgba(245, 245, 250, ${sa})`, 0);
  }
}

// ---------- КРЕСЛО ОПЕРАТОРА ИВАНЫЧА ----------
function drawOperatorChair(ctx, x, y) {
  flatBox(ctx, x - 56, y - 195, 112, 145, '#1E252B', 14, 4, INK);
  flatBox(ctx, x - 44, y - 235, 88, 48, '#171D22', 10, 3.5, INK);
  flatBox(ctx, x - 72, y - 110, 22, 55, '#171D22', 6, 3, INK);
  flatBox(ctx, x + 50, y - 110, 22, 55, '#171D22', 6, 3, INK);
}

// ---------- ПЕРСОНАЖИ: ИВАНЫЧ И ПЕТЯ ----------
function drawCharacters(ctx, t, tl, menuOn) {
  const ivanSpeak = Math.max(
    mouthOf(tl, 's2_ivan1', t),
    mouthOf(tl, 's2_ivan2', t),
    mouthOf(tl, 's2_ivan3', t)
  );
  const petyaSpeak = Math.max(
    mouthOf(tl, 's2_petya1', t),
    mouthOf(tl, 's2_petya2', t)
  );

  // --- 1. ИВАНЫЧ (58 лет): сидит в кресле перед монитором, держит геймпад двумя руками ---
  const ivanX = 380, ivanY = 1380;
  drawOperatorChair(ctx, ivanX, ivanY);

  person(ctx, {
    x: ivanX, y: ivanY, s: 1.15, seed: 540,
    sit: true,
    skin: '#F3C7A0', blush: '#E48974',
    shirt: '#53633F', vest: '#3B482D', pants: '#323E28',
    badge: true,
    hair: 'bald_sides', hairColor: '#8C969E',
    mustache: '#8C969E', stubble: true,
    headphones: true,
    eyes: menuOn ? 'wide' : 'lidded',
    brow: menuOn ? -0.8 : 0.1,
    mood: 'smile',
    tears: menuOn ? 1 : 0,
    mouth: ivanSpeak,
    arms: { l: [0.55, 0.65], r: [-0.55, -0.65] },
    holdR: propGamepad,
  });

  // --- 2. ПЕТЯ (молодой стажёр): стоит справа у пульта, машет руками в дикой панике ---
  const petyaX = 930, petyaY = 1420;
  const flail = Math.sin(t * 18) * 0.55;

  person(ctx, {
    x: petyaX, y: petyaY, s: 1.12, seed: 545,
    shirt: '#60A5FA', coat: '#F1F5F9', tie: '#1E3A8A', pants: '#334155',
    badge: true,
    hair: 'messy', hairColor: '#4A3121',
    eyes: 'wide', brow: -1.0, sweat: 1, mood: 'scream',
    mouth: petyaSpeak || (t < tl.cues.s2_menu ? 0.35 : 0.65),
    arms: { l: [-2.4 - flail, -0.3], r: [2.4 + flail, 0.3] },
  });
}

// ---------- МОЩНЫЕ БЕЛЫЕ ЛУЧИ И ОСЛЕПИТЕЛЬНЫЙ ВЗРЫВ (00:00) ----------
function drawMeltdownExplosion(ctx, t, tl) {
  const c = tl.cues;
  const s2End = tl.scenes.s2.end;
  if (t < c.s2_zero) return;

  const zt = t - c.s2_zero;
  const rayAlpha = clamp(zt / 1.1);

  // Мощные белые лучи света пробиваются из-под пола
  for (let i = 0; i < 7; i++) {
    const rx = 70 + i * 160;
    const rwTop = 80 + (i % 3) * 45;
    const rwBot = 210 + (i % 2) * 65;

    ctx.save();
    const rg = ctx.createLinearGradient(rx, H, rx, 0);
    rg.addColorStop(0, `rgba(255, 255, 255, ${0.48 + rayAlpha * 0.52})`);
    rg.addColorStop(0.65, `rgba(255, 255, 240, ${0.25 + rayAlpha * 0.45})`);
    rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx - rwBot / 2, H);
    ctx.lineTo(rx + rwBot / 2, H);
    ctx.lineTo(rx + rwTop / 2, 0);
    ctx.lineTo(rx - rwTop / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Заливка кадра ослепительным белым светом к tl.scenes.s2.end
  const boomFade = easeIn(seg(t, c.s2_boom - 0.2, s2End));
  overlay(ctx, '#FFFFFF', boomFade);
}

// ---------- ГЛАВНАЯ ФУНКЦИЯ СЦЕНЫ 2 ДЛЯ YOUTUBE SHORTS (9:16) ----------
export function drawScene2Shorts(ctx, t, tl) {
  const c = tl.cues;
  const menuOn = t >= c.s2_menu;
  const zeroOn = t >= c.s2_zero;
  const alarm = !menuOn || zeroOn;

  // --- КАМЕРА: ДИНАМИЧНЫЕ НАЕЗДЫ НА ПЕТЮ, ИВАНЫЧА И МОНИТОР ---
  let cx = W / 2, cy = 960, cz = 1.0, shake = 0;

  if (t < tl.lines.s2_petya1.end + 0.35) {
    // Реплика Пети 1 («Иваныч! Пиздец! Стержни плавятся...»): наезд на Петю справа
    cx = 720; cy = 1000; cz = 1.18; shake = 4;
  } else if (t < tl.lines.s2_petya2.start - 0.25) {
    // Реплика Иваныча 1 («Закрой ебало, Петя...»): наезд на Иваныча и загрузку
    cx = 450; cy = 980; cz = 1.16;
  } else if (t < tl.lines.s2_ivan2.start - 0.2) {
    // Реплика Пети 2 («Мы умрём!»): резкий панический наезд на Петю
    cx = 750; cy = 1010; cz = 1.22; shake = 6;
  } else if (t < c.s2_menu) {
    // Реплика Иваныча 2 («Все там будем...»): обратно к Иванычу
    cx = 450; cy = 980; cz = 1.16;
  } else if (t < c.s2_zero) {
    // Реплика Иваныча 3 («О господи... Графон-то какой... фламинго»): наезд на монитор с фламинго и Иваныча
    cx = 430; cy = 840; cz = 1.24;
    if (t >= c.s2_zero - 2.8) {
      shake = lerp(4, 18, seg(t, c.s2_zero - 2.8, c.s2_zero));
    }
  } else {
    // Взрыв и отсчёт 00:00: мощная тряска и общий катастрофический план
    cx = W / 2; cy = 960; cz = 1.08;
    shake = lerp(22, 38, seg(t, c.s2_zero, c.s2_boom));
  }

  // Применяем камеру
  camera(ctx, cx, cy, cz, shake);

  // 1. Задний план: стены бункера, аварийные лампы и конусы света
  drawBunkerBackground(ctx, t, menuOn, alarm);

  // 2. Огромное аварийное табло с обратным отсчётом
  drawEmergencyBillboard(ctx, t, tl, alarm);

  // 3. Пульт управления, кнопка АВАРИЙНЫЙ СТОП и кружка чая с паром
  drawControlDeskSurface(ctx, t);
  drawIvanychMonitor(ctx, t, tl, menuOn, zeroOn);
  drawEmergencyButtonAndTea(ctx, t);

  // 4. Персонажи: Иваныч (сидя) и Петя (паника)
  drawCharacters(ctx, t, tl, menuOn);

  // 5. Лучи света при 00:00 и ослепительный белый взрыв
  drawMeltdownExplosion(ctx, t, tl);

  // 6. Передний план (ящики внизу в стиле bbJriQ5RO1I)
  drawForegroundFrame(ctx, 'crates', t);

  // 7. Верхняя фирменная жёлтая табличка локации
  drawLocationTag(ctx, 'ПУЛЬТ АЭС • БЛОК №4', W / 2, 165);

  // 8. Счётчик в углу: ШЕЙДЕРЫ [0][9] -> [1][0]
  drawCounterHUD(ctx, 'ШЕЙДЕРЫ', menuOn ? '10' : '9', menuOn ? '0' : '9', W - 210, 290);
}

