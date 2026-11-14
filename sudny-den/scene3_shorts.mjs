// СЦЕНА 3: «Медицина бессильна» — Операционная (9:16 YouTube Shorts, 1080x1920, в точном 2D-стиле bbJriQ5RO1I)
import {
  W, H, G, INK, hash, clamp, lerp, seg, ease, easeIn, easeOut, backOut, shade,
  camera, screen, flatBox, flatOval, flatPoly, text, lightCone, overlay,
  drawForegroundFrame, drawLocationTag, drawCounterHUD, person, propPhone,
} from './engine_shorts.mjs';

export function mouthOf(tl, id, t) {
  const l = tl.lines[id];
  if (!l || t < l.start || t > l.end) return 0;
  const idx = Math.floor((t - l.start) * tl.fps);
  return l.env[clamp(idx, 0, l.env.length - 1)] || 0;
}

// ---------- ПРОПСЫ ДЛЯ ОПЕРАЦИОННОЙ ----------

// Скальпель хирурга
export const propScalpel = (ctx) => {
  ctx.save();
  ctx.rotate(-0.35);
  // Стальная рукоятка с насечками
  flatBox(ctx, -4, -30, 8, 40, '#94A3B8', 2, 2.5, INK);
  flatBox(ctx, -2, -20, 4, 14, '#CBD5E1', 1, 0);
  // Острое хирургическое лезвие
  flatPoly(ctx, [
    [-4, 10], [4, 10], [4, 28], [-4, 40],
  ], '#F1F5F9', 2.5, INK);
  ctx.restore();
};

// Пульсирующее мультяшное сердце в стиле bbJriQ5RO1I
export const propHeart = (t, scale = 1) => (ctx) => {
  ctx.save();
  const pulse = scale * (1 + 0.18 * Math.sin(t * 11));
  ctx.scale(pulse, pulse);
  // Аорта и сосуды сверху
  flatBox(ctx, -10, -25, 7, 13, '#38BDF8', 2, 2, INK);
  flatBox(ctx, 3, -27, 8, 15, '#DC2626', 2, 2, INK);
  // Доли сердца
  flatOval(ctx, -11, -9, 14, 14, '#EF4444', 3.5, INK);
  flatOval(ctx, 11, -9, 14, 14, '#EF4444', 3.5, INK);
  // Нижний конус
  flatPoly(ctx, [
    [-23, -6], [23, -6], [0, 24],
  ], '#EF4444', 3.5, INK);
  // Закрываем внутренний шов
  flatOval(ctx, 0, -4, 13, 11, '#EF4444', 0);
  // Глянцевый блик
  flatOval(ctx, -10, -11, 4.5, 3, 'rgba(255,255,255,0.7)', 0, null, -0.3);
  ctx.restore();
};

// Пластиковый пакет с пульсирующим сердцем
export const propHeartBag = (t) => (ctx) => {
  ctx.save();
  ctx.rotate(0.12);
  // Тело белого пакета
  flatPoly(ctx, [
    [-24, -12], [24, -12], [28, 38], [-28, 38],
  ], '#F8FAFC', 4, 3.5, INK);
  // Ручки пакета
  ctx.beginPath();
  ctx.arc(-11, -18, 9, Math.PI, 0);
  ctx.arc(11, -18, 9, Math.PI, 0);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Красный медицинский бейдж BIOHAZARD
  flatBox(ctx, -16, 2, 32, 14, '#EF4444', 3, 2, INK);
  text(ctx, 'BIO', 0, 9, 11, '#FFFFFF', 'Arial Black');
  // Пульсирующее сердце внутри/в пакете
  ctx.save();
  ctx.translate(0, 20);
  propHeart(t, 0.72)(ctx);
  ctx.restore();
  ctx.restore();
};

// Сорванная медицинская маска
function drawFlyingMask(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  flatBox(ctx, -24, -14, 48, 28, '#B9E6FE', 5, 3, INK);
  // Оторванные резиночки
  ctx.beginPath();
  ctx.moveTo(-22, -10); ctx.quadraticCurveTo(-38, -2, -32, 14);
  ctx.moveTo(22, -10); ctx.quadraticCurveTo(38, -2, 32, 14);
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#93C5FD'; ctx.stroke();
  // Складки
  ctx.beginPath();
  ctx.moveTo(-18, -3); ctx.lineTo(18, -3);
  ctx.moveTo(-18, 5); ctx.lineTo(18, 5);
  ctx.lineWidth = 2; ctx.strokeStyle = '#7DD3FC'; ctx.stroke();
  ctx.restore();
}

// Кардиомонитор со скачущей зелёной линией ЭКГ
function drawCardioMonitor(ctx, x, y, w, h, t, dark = false) {
  // Корпус монитора на стойке
  flatBox(ctx, x, y, w, h, '#1E252B', 8, 4, INK);
  // Кнопки управления справа
  flatOval(ctx, x + w - 18, y + 26, 6, 6, '#475569', 2, INK);
  flatOval(ctx, x + w - 18, y + 46, 6, 6, '#475569', 2, INK);
  flatOval(ctx, x + w - 18, y + 66, 6, 6, '#EF4444', 2, INK);

  // Область экрана
  const pad = 8;
  const sx = x + pad, sy = y + pad, sw = w - pad * 2 - 20, sh = h - pad * 2;
  flatBox(ctx, sx, sy, sw, sh, '#08140E', 5, 2, '#2D3748');

  // Верхняя статус-строка
  text(ctx, 'ЧСС 76', sx + 36, sy + 15, 14, '#4ADE80', 'Arial Black');
  text(ctx, 'SpO2 99%', sx + sw - 44, sy + 15, 13, '#38BDF8', 'Arial Black');

  // Бегущая волна ЭКГ (осциллограф)
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx + 3, sy + 26, sw - 6, sh - 54);
  ctx.clip();

  ctx.beginPath();
  const baselineY = sy + 56;
  const numPts = 32;
  for (let i = 0; i <= numPts; i++) {
    const px = sx + 4 + (i / numPts) * (sw - 8);
    const phase = ((i / numPts + t * 1.5) % 1);
    let dy = 0;
    if (phase > 0.40 && phase < 0.44) dy = -5;
    else if (phase >= 0.44 && phase < 0.47) dy = 4;
    else if (phase >= 0.47 && phase < 0.52) dy = -32;
    else if (phase >= 0.52 && phase < 0.55) dy = 10;
    else if (phase >= 0.55 && phase < 0.62) dy = -8;

    if (i === 0) ctx.moveTo(px, baselineY + dy);
    else ctx.lineTo(px, baselineY + dy);
  }
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#22C55E';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // Нижняя плашка со статусом сети / ИВЛ
  flatBox(ctx, sx + 4, sy + sh - 25, sw - 8, 20, dark ? '#2B1215' : '#0F291E', 3, 1.5, INK);
  if (dark) {
    const flash = Math.sin(t * 7) > 0;
    text(ctx, flash ? 'СЕТЬ: ОФФЛАЙН' : 'ИВЛ: АКТИВНО', sx + sw / 2, sy + sh - 15, 12, flash ? '#EF4444' : '#F59E0B', 'Arial Black');
  } else {
    text(ctx, 'ИВЛ: АКТИВНО', sx + sw / 2, sy + sh - 15, 12, '#4ADE80', 'Arial Black');
  }

  // Мобильная тележка под монитором
  flatBox(ctx, x + w / 2 - 6, y + h, 12, 130, '#475569', 2, 3, INK);
  flatBox(ctx, x + w / 2 - 45, y + h + 125, 90, 16, '#334155', 4, 3, INK);
  flatOval(ctx, x + w / 2 - 38, y + h + 143, 6, 6, '#1E293B', 2, INK);
  flatOval(ctx, x + w / 2 + 38, y + h + 143, 6, 6, '#1E293B', 2, INK);
}

// Стойка с капельницей
function drawIVStand(ctx, x, y, patX, patY) {
  // Крестовина основания с колёсиками
  flatBox(ctx, x - 28, y - 10, 56, 10, '#475569', 3, 3, INK);
  flatOval(ctx, x - 24, y - 3, 5, 5, '#1E293B', 2, INK);
  flatOval(ctx, x + 24, y - 3, 5, 5, '#1E293B', 2, INK);

  // Хромированная вертикальная стойка
  flatBox(ctx, x - 4, y - 390, 8, 380, '#94A3B8', 2, 3, INK);

  // Верхняя перекладина с крючками
  flatBox(ctx, x - 24, y - 392, 48, 6, '#64748B', 2, 2.5, INK);
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 392); ctx.lineTo(x - 22, y - 404);
  ctx.moveTo(x + 22, y - 392); ctx.lineTo(x + 22, y - 404);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();

  // Пакет физраствора
  flatBox(ctx, x - 15, y - 386, 30, 52, 'rgba(224, 242, 254, 0.92)', 5, 2.5, INK);
  flatBox(ctx, x - 11, y - 362, 22, 24, 'rgba(56, 189, 248, 0.55)', 3, 0);
  text(ctx, 'NaCl', x, y - 372, 10, '#0369A1', 'Arial Black');

  // Капельная камера и трубка к пациенту
  flatBox(ctx, x - 4, y - 334, 8, 16, '#BAE6FD', 2, 1.5, INK);
  ctx.beginPath();
  ctx.moveTo(x, y - 318);
  ctx.quadraticCurveTo(x + 35, y - 190, patX, patY);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
  ctx.stroke();
}

// Столик для хирургических инструментов
function drawInstrumentTray(ctx, x, y) {
  flatBox(ctx, x - 3, y, 6, 290, '#64748B', 2, 2.5, INK);
  flatBox(ctx, x - 32, y + 285, 64, 10, '#334155', 2, 2.5, INK);
  flatOval(ctx, x - 28, y + 296, 5, 5, '#1E293B', 2, INK);
  flatOval(ctx, x + 28, y + 296, 5, 5, '#1E293B', 2, INK);

  // Лоток из нержавеющей стали
  flatBox(ctx, x - 70, y - 14, 140, 20, '#94A3B8', 4, 3, INK);
  flatBox(ctx, x - 64, y - 22, 128, 10, '#CBD5E1', 3, 2, INK);
  // Почкообразный лоток и зажимы
  flatOval(ctx, x - 25, y - 26, 26, 11, '#E2E8F0', 2, INK);
  flatBox(ctx, x + 16, y - 26, 28, 4, '#64748B', 1, 1.5, INK);
  flatBox(ctx, x + 22, y - 31, 20, 3, '#94A3B8', 1, 1.5, INK);
}

// Операционный стол и пациент под синей простынёй
function drawOperatingTable(ctx, x, y, heartOut = false, t = 0) {
  // Гидравлическая массивная опора стола
  flatBox(ctx, x - 50, y + 10, 100, 165, '#334155', 6, 4, INK);
  flatBox(ctx, x - 85, y + 162, 170, 24, '#1E293B', 5, 4, INK);
  // Педаль блокировки стола
  flatBox(ctx, x + 52, y + 146, 24, 12, '#F59E0B', 2, 2.5, INK);

  // Рама и ложе операционного стола
  flatBox(ctx, x - 270, y - 8, 540, 28, '#475569', 6, 4, INK);
  flatBox(ctx, x - 260, y - 28, 520, 22, '#1E293B', 4, 3.5, INK);

  // --- ПАЦИЕНТ ---
  // Подушка
  flatBox(ctx, x - 245, y - 50, 75, 26, '#E2E8F0', 6, 3, INK);

  // Голова пациента
  const headX = x - 205, headY = y - 58;
  flatOval(ctx, headX, headY, 34, 28, '#F3C7A0', 3.5, INK);
  // Медицинская одноразовая шапочка
  ctx.beginPath();
  ctx.ellipse(headX - 6, headY - 4, 30, 24, 0, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fillStyle = '#93C5FD';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Глаза пациента с крестиками (под наркозом / dead)
  for (const ex of [headX + 3, headX + 19]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(ex - 6, headY - 5); ctx.lineTo(ex + 6, headY + 5);
    ctx.moveTo(ex + 6, headY - 5); ctx.lineTo(ex - 6, headY + 5);
    ctx.stroke();
  }
  // Брови
  ctx.beginPath();
  ctx.moveTo(headX - 2, headY - 14); ctx.lineTo(headX + 7, headY - 14);
  ctx.moveTo(headX + 15, headY - 14); ctx.lineTo(headX + 24, headY - 14);
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();

  // Дыхательная трубка ИВЛ ко рту
  flatBox(ctx, headX + 17, headY + 8, 14, 7, '#FFFFFF', 1, 1.5, INK);
  ctx.beginPath();
  ctx.moveTo(headX + 24, headY + 11);
  ctx.quadraticCurveTo(headX + 65, headY + 45, headX + 115, y + 25);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#BAE6FD';
  ctx.stroke();

  // Синяя хирургическая простыня, укрывающая тело пациента
  flatBox(ctx, x - 175, y - 54, 425, 48, '#2563EB', 8, 4, INK);
  flatBox(ctx, x - 170, y - 16, 415, 10, '#1D4ED8', 0, 0);

  // Ступни под простынёй справа
  flatOval(ctx, x + 236, y - 50, 15, 24, '#2563EB', 3, INK, 0.2);

  // ОТКРЫТАЯ ГРУДНАЯ КЛЕТКА
  const chestX = x - 25, chestY = y - 44;
  // Контур разреза
  flatOval(ctx, chestX, chestY, 58, 28, '#7F1D1D', 3.5, INK);
  // Тёмная глубина полости
  flatOval(ctx, chestX, chestY, 50, 22, '#450A0A', 0);

  // Рёбра (белые изогнутые дуги)
  ctx.strokeStyle = '#FEF3C7';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (let r = -2; r <= 2; r++) {
    const rx = chestX + r * 16;
    ctx.beginPath();
    ctx.moveTo(rx, chestY - 19); ctx.lineTo(rx - 2, chestY - 6);
    ctx.moveTo(rx, chestY + 19); ctx.lineTo(rx - 2, chestY + 6);
    ctx.stroke();
  }

  // Пульсирующее мультяшное сердце внутри груди (до того, как его достали)
  if (!heartOut) {
    ctx.save();
    ctx.translate(chestX, chestY);
    propHeart(t, 0.74)(ctx);
    ctx.restore();
  }
}

// Задний план операционной (кафель, потолочный светильник и аварийная лампа)
function drawOperatingRoomBackground(ctx, t, dark = false, flicker = false) {
  // Потолок
  flatBox(ctx, -200, -200, W + 400, 560, dark ? '#15080A' : '#DCE8E8', 0, 0);

  // Стены с кафелем
  const wallY = 360;
  const wallH = 1060;
  flatBox(ctx, -200, wallY, W + 400, wallH, dark ? '#220D11' : '#B2D8DC', 0, 4, INK);

  // Сетка плитки
  ctx.strokeStyle = dark ? 'rgba(75, 18, 22, 0.40)' : 'rgba(125, 175, 180, 0.45)';
  ctx.lineWidth = 2.5;
  const tileSize = 92;
  for (let ty = wallY; ty < wallY + wallH; ty += tileSize) {
    ctx.beginPath(); ctx.moveTo(-200, ty); ctx.lineTo(W + 200, ty); ctx.stroke();
  }
  for (let tx = -180; tx < W + 200; tx += tileSize) {
    ctx.beginPath(); ctx.moveTo(tx, wallY); ctx.lineTo(tx, wallY + wallH); ctx.stroke();
  }

  // Защитный медицинский отбойник на стене
  flatBox(ctx, -200, 915, W + 400, 36, dark ? '#38161A' : '#7FA8AE', 0, 3, INK);
  flatBox(ctx, -200, 923, W + 400, 8, dark ? '#522026' : '#A4CCD2', 0, 0);

  // Пол (больничный линолеум)
  const floorY = 1420;
  flatBox(ctx, -200, floorY, W + 400, H - floorY + 400, dark ? '#16080A' : '#517E85', 0, 4, INK);
  flatBox(ctx, -200, floorY - 14, W + 400, 14, dark ? '#2A1014' : '#3B6066', 0, 3, INK);

  // Главный потолочный хирургический светильник
  const lampX = 540, lampY = 320;
  ctx.beginPath();
  ctx.moveTo(lampX - 70, 0);
  ctx.lineTo(lampX - 50, 160);
  ctx.lineTo(lampX, lampY - 45);
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = dark ? '#475569' : '#CBD5E1';
  ctx.stroke();

  flatOval(ctx, lampX - 50, 160, 14, 14, '#64748B', 3, INK);

  // Купол лампы
  flatOval(ctx, lampX, lampY - 20, 160, 48, dark ? '#334155' : '#E2E8F0', 4.5, INK);
  flatOval(ctx, lampX, lampY - 14, 135, 34, dark ? '#1E293B' : (flicker ? '#FFF59D' : '#FFFFFF'), 3.5, INK);

  // Если белый свет горит или мигает — конус света на стол
  if (!dark || flicker) {
    lightCone(ctx, lampX, lampY - 10, 240, 780, 980, 'rgba(255, 255, 210, 0.36)');
  }

  // Аварийный красный маяк на потолке/стене
  const beaconX = 540, beaconY = 110;
  flatBox(ctx, beaconX - 28, beaconY - 20, 56, 18, '#334155', 3, 3, INK);
  const beaconCol = dark ? '#EF4444' : '#7F1D1D';
  flatOval(ctx, beaconX, beaconY + 6, 22, 18, beaconCol, 3, INK);

  if (dark) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    lightCone(ctx, beaconX, beaconY + 12, 160, 840, 1200, `rgba(239, 68, 68, ${0.16 + pulse * 0.16})`);
    flatOval(ctx, beaconX, beaconY + 6, 45, 35, `rgba(239, 68, 68, ${0.28 + pulse * 0.3})`, 0);
  }
}

// ---------- ГЛАВНАЯ ФУНКЦИЯ СЦЕНЫ 3 ----------
export function drawScene3Shorts(ctx, t, tl) {
  const c = tl.cues;
  const s3s = tl.scenes.s3.start;

  // 1. Освещение и блэкаут
  const isShockwave = t < c.s3_blackout;
  const flickerDuration = 0.55;
  const isFlickering = t >= c.s3_blackout && t < c.s3_blackout + flickerDuration;
  const flickerLight = isFlickering && (Math.sin((t - c.s3_blackout) * 55) > 0);
  const isDark = (t >= c.s3_blackout + flickerDuration) || (isFlickering && !flickerLight);

  // 2. Логика сюжетных событий
  const inSilence = t >= c.s3_silence && t < tl.lines.s3_surg2.start;
  const maskRipped = t >= c.s3_maskrip;
  const heartOut = t >= tl.lines.s3_anest3.start - 0.5;
  const isRunning = t >= c.s3_runout;
  const runDt = isRunning ? t - c.s3_runout : 0;

  // 3. Динамическая камера и наезды
  let camX = 540, camY = 1120, camZ = 1.05, shake = 0;

  if (isShockwave) {
    // Ударная волна от взрыва АЭС
    const sp = seg(t, s3s, c.s3_blackout);
    shake = 18 * (1 - sp);
    camX = 540; camY = 1120; camZ = 1.05;
  } else if (t < tl.lines.s3_anest1.start - 0.25) {
    // Реплика хирурга s3_surg1 («Света нет. Генераторы сдохли...»)
    camX = 400; camY = 1060; camZ = 1.35;
  } else if (t < c.s3_silence) {
    // Реплика анестезиолога s3_anest1 («Хуже. Сервера Rockstar упали...»)
    camX = 690; camY = 1060; camZ = 1.35;
  } else if (inSilence) {
    // Гробовая тишина после «Сервера Rockstar упали»: драматичный медленный наезд
    const p = ease(seg(t, c.s3_silence, tl.lines.s3_surg2.start));
    camX = lerp(540, 360, p);
    camY = lerp(1100, 1030, p);
    camZ = lerp(1.18, 1.62, p);
  } else if (t < tl.lines.s3_anest2.start - 0.25) {
    // Истерика хирурга s3_surg2 («То есть... я сейчас зря этого мужика вскрывал?!»)
    camX = 370; camY = 1050; camZ = 1.42;
    if (mouthOf(tl, 's3_surg2', t) > 0.35) shake = 3.5;
  } else if (t < c.s3_maskrip - 0.25) {
    // Ответ Серёги s3_anest2 («Походу да. Пишут, что из-за отключения...»)
    camX = 700; camY = 1060; camZ = 1.34;
  } else if (t < tl.lines.s3_anest3.start - 0.35) {
    // Срыв маски и крик s3_surg3 («Блядь. Ну и нахуй я тогда его спасаю...»)
    camX = 390; camY = 1050; camZ = 1.40;
    if (mouthOf(tl, 's3_surg3', t) > 0.35) shake = 4.0;
  } else if (t < tl.lines.s3_surg4.start - 0.25) {
    // Вопрос Серёги s3_anest3 («А сердце? Мы ж его только достали...»)
    camX = 580; camY = 1100; camZ = 1.25;
  } else if (!isRunning) {
    // Реплика хирурга s3_surg4 («Да похуй, в пакет положи...»)
    camX = 540; camY = 1100; camZ = 1.18;
  } else {
    // Побег из операционной в гараж
    camX = 540; camY = 1120; camZ = 1.05;
  }

  // Применяем камеру
  camera(ctx, camX, camY, camZ, shake);

  // 4. Отрисовка декораций операционной
  drawOperatingRoomBackground(ctx, t, isDark, flickerLight);

  // Инструментальный столик слева
  drawInstrumentTray(ctx, 160, 1140);

  // Стойка с капельницей
  drawIVStand(ctx, 230, 1420, 350, 1205);

  // Кардиомонитор справа
  drawCardioMonitor(ctx, 840, 1020, 185, 140, t, isDark);

  // Операционный стол с пациентом
  drawOperatingTable(ctx, 540, 1260, heartOut, t);

  // Сорванная маска, летящая на пол
  if (maskRipped) {
    const maskDt = t - c.s3_maskrip;
    const maskP = clamp(maskDt / 0.85);
    const mx = lerp(330, 180, maskP);
    const my = maskP < 1
      ? lerp(1120, 1425, easeIn(maskP)) - Math.sin(maskP * Math.PI) * 110
      : 1425;
    const mRot = maskP < 1 ? maskDt * 12 : 0.35;
    drawFlyingMask(ctx, mx, my, mRot);
  }

  // 5. Отрисовка персонажей

  // Синхронизация губ
  const surgSpeak = Math.max(
    mouthOf(tl, 's3_surg1', t),
    mouthOf(tl, 's3_surg2', t),
    mouthOf(tl, 's3_surg3', t),
    mouthOf(tl, 's3_surg4', t),
  );
  const anestSpeak = Math.max(
    mouthOf(tl, 's3_anest1', t),
    mouthOf(tl, 's3_anest2', t),
    mouthOf(tl, 's3_anest3', t),
  );

  // Эмоции и жесты хирурга
  let surgEyes = 'normal';
  let surgBrow = 0.7;
  let surgMood = 'frown';
  let surgSweat = 0;

  if (inSilence) {
    surgEyes = 'wide';
    surgBrow = -0.7;
    surgMood = 'neutral';
    surgSweat = 1;
  } else if (t >= tl.lines.s3_surg2.start && t < tl.lines.s3_anest2.start) {
    surgEyes = 'wide';
    surgBrow = 0.85;
    surgMood = 'scream';
    surgSweat = 1;
  } else if (t >= c.s3_maskrip) {
    surgEyes = 'red';
    surgBrow = 1.0;
    surgMood = 'scream';
  }

  // Руки хирурга
  let surgArms = { l: [-0.35, 0.15], r: [0.65, -0.75] };
  let surgHoldR = propScalpel;

  if (inSilence) {
    surgArms = { l: [-0.25, 0.1], r: [0.35, -0.3] };
  } else if (t >= tl.lines.s3_surg2.start && t < tl.lines.s3_anest2.start) {
    // В истерике размахивает скальпелем
    const wave = Math.sin(t * 18);
    surgArms = {
      l: [-0.85 + wave * 0.15, -0.4],
      r: [0.85 + wave * 0.3, -0.5 + Math.cos(t * 18) * 0.25],
    };
  } else if (t >= c.s3_maskrip && t < tl.lines.s3_surg4.start - 0.2) {
    // В ярости кричит и жестикулирует скальпелем
    surgArms = { l: [-0.95, -0.4], r: [1.05 + Math.sin(t * 12) * 0.2, 0.35] };
  } else if (t >= tl.lines.s3_surg4.start - 0.2) {
    // Держит пакет с сердцем
    surgArms = { l: [-0.4, 0.2], r: [0.6, -0.65] };
    surgHoldR = propHeartBag(t);
  }

  // Координаты хирурга при побеге
  const surgBaseX = 310;
  const surgX = isRunning ? surgBaseX + runDt * 1650 : surgBaseX;

  if (surgX < W + 350) {
    person(ctx, {
      x: surgX, y: 1420, s: 1.15, seed: 501, flip: 1,
      shirt: '#3B9B90', pants: '#2C7A71',
      hat: 'scrub', hatColor: '#3B9B90', badge: true,
      mask: !maskRipped, maskDown: false,
      eyes: surgEyes, brow: surgBrow, mood: surgMood, sweat: surgSweat,
      mouth: inSilence ? 0 : surgSpeak,
      run: isRunning ? t * 15 : null,
      arms: isRunning ? { l: [-1.1, -0.4], r: [0.95, 0.45] } : surgArms,
      holdR: surgHoldR,
    });
  }

  // Руки и предмет анестезиолога Серёги
  let anestArms = { l: [-0.75, -0.6], r: [0.25, 0.15] };
  let anestHoldR = null;

  if (heartOut && t < tl.lines.s3_surg4.start - 0.1) {
    // Серёга держит пульсирующее сердце в правой руке, показывая хирургу
    anestArms = { l: [-0.75, -0.6], r: [0.85, -0.85] };
    anestHoldR = propHeart(t);
  }

  // Координаты анестезиолога при побеге
  const anestBaseX = 770;
  const anestX = isRunning ? anestBaseX + runDt * 1750 : anestBaseX;

  if (anestX < W + 350) {
    person(ctx, {
      x: anestX, y: 1420, s: 1.14, seed: 502, flip: isRunning ? 1 : -1,
      shirt: '#4A82B0', pants: '#366185',
      hat: 'scrub', hatColor: '#4A82B0',
      mask: true, maskDown: true,
      eyes: heartOut ? 'wide' : 'lidded',
      brow: heartOut ? -0.7 : 0.15,
      mood: 'neutral',
      mouth: inSilence ? 0 : anestSpeak,
      run: isRunning ? t * 15 + 1 : null,
      arms: isRunning ? { l: [-1.0, -0.4], r: [1.0, 0.4] } : anestArms,
      holdL: propPhone('#EF4444', 'ERR'),
      holdR: isRunning ? null : anestHoldR,
    });
  }

  // 6. Атмосферное аварийное освещение поверх сцены
  if (isDark) {
    const alarmGlow = 0.18 + 0.10 * Math.sin(t * 7);
    overlay(ctx, '#FF0000', alarmGlow);
  }

  // 7. Передний план (затемнение снизу)
  drawForegroundFrame(ctx, 'city', t);

  // 8. Верхняя жёлтая табличка локации и счётчик HUD (1-в-1 bbJriQ5RO1I)
  drawLocationTag(ctx, 'ОПЕРАЦИОННАЯ • СЕРВЕРА УПАЛИ', W / 2, 165, -0.015);
  drawCounterHUD(ctx, 'СЕРВЕРА', '0', '0', W - 210, 290);
}
