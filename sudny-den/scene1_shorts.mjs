// СЦЕНА 1: «Апокалипсис снаружи»
// Гибридная 2D-анимация: иллюстрированные фоны и техника из Nano Banana + живая многосуставная 2D-анимация в стиле bbJriQ5RO1I
import {
  W, H, G, INK, hash, clamp, lerp, seg, ease, easeOut, easeIn, backOut, elasticOut,
  getNanoAsset, drawNanoBgCover, drawNanoBgScrollX,
  camera, screen, flatBox, flatOval, flatPoly, text, lightCone,
  drawImpactBurst, drawDustPuffs, drawCartoonExplosion, drawFlyingBill, drawForegroundFrame,
  drawLocationTag, drawCounterHUD, person, propPhone, propMoneyBag,
} from './engine_shorts.mjs';

export function mouthOf(tl, id, t) {
  const l = tl.lines[id];
  if (!l || t < l.start || t > l.end) return 0;
  const idx = Math.floor((t - l.start) * tl.fps);
  return l.env[clamp(idx, 0, l.env.length - 1)] || 0;
}

function drawFallbackSkyAndStreet(ctx, t, sunset = 0, scrollX = 0) {
  const g = ctx.createLinearGradient(0, -200, 0, H);
  if (sunset > 0.3) {
    g.addColorStop(0, '#7C4D25');
    g.addColorStop(0.45, '#C88438');
    g.addColorStop(0.85, '#E9B85B');
    g.addColorStop(1, '#8D6E3F');
  } else {
    g.addColorStop(0, '#9E7B42');
    g.addColorStop(0.48, '#D7AE63');
    g.addColorStop(0.82, '#F1D28A');
    g.addColorStop(1, '#9E824C');
  }
  ctx.fillStyle = g;
  ctx.fillRect(-500, -400, W + 1000, H + 800);
  flatBox(ctx, -500, 1280, W + 1000, 95, '#6E5031', 0, 4, INK);
  flatBox(ctx, -500, 1370, W + 1000, 750, '#46423B', 0, 4, INK);
}

// Птица с настоящими взмахами крыльев
function drawAnimatedBird(ctx, x, y, t, seed, falling = false, fallDt = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (falling) {
    ctx.rotate(fallDt * 7.5);
  } else {
    ctx.rotate(Math.sin(t * 6 + seed) * 0.08);
  }
  const wingY = falling ? -12 : Math.sin(t * 18 + seed * 2.1) * 18;
  flatPoly(ctx, [[-4, -2], [-18, wingY - 8], [8, -4]], '#4F8999', 3, INK);
  flatOval(ctx, 0, 0, 22, 15, '#68A8B8', 3.5, INK);
  flatPoly(ctx, [[-6, 2], [-14, wingY], [10, 2]], '#82C0D1', 3, INK);
  flatPoly(ctx, [[18, -3], [33, 2], [18, 7]], '#F6C93E', 3, INK);
  const er = falling ? 6.5 : 4.2;
  flatOval(ctx, 9, -3, er, er, '#FFFFFF', 2.2, INK);
  flatOval(ctx, 10, -3, 2, 2, INK, 0);
  if (!falling) {
    const noteY = -28 - ((t * 45 + seed * 15) % 26);
    const noteX = 18 + Math.sin(t * 8 + seed) * 8;
    text(ctx, '♪', noteX, noteY, 26, '#231A12');
  }
  ctx.restore();
}

// Интерактивное центральное окно, встроенное точно во внутренний проём родной рамы здания (x=423..654, y=822..1080)
function drawHeroOfficeWindow(ctx, broken = false, t = 0, notified = false) {
  const gx = 423, gy = 822, gw = 231, gh = 258;
  if (!broken) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();

    const jump = notified ? easeOut(clamp((t - 3.25) / 0.35)) * 28 : 0;
    // Босс слева за окном
    person(ctx, {
      x: gx + 54, y: gy + gh + 32, s: 0.64, seed: 91,
      shirt: '#3A3F47', pants: '#282C33', tie: '#D93829', hair: 'bald_sides', hairColor: '#596068',
      eyes: 'wide', brow: 0.8, mood: 'scream', mouth: 0.4 + Math.sin(t * 14) * 0.3,
      gesture: 'panic', shadow: false,
    });
    // Сотрудник справа в широкой створке окна
    person(ctx, {
      x: gx + 168, y: gy + gh + 30 - jump, s: 0.68, flip: -1, seed: 92,
      shirt: '#EAE6DF', pants: '#343D46', tie: '#2B6CB0', hair: 'messy',
      eyes: 'red', brow: 0.9, mood: notified ? 'scream' : 'buckteeth',
      squash: notified ? 0.22 : Math.sin(t * 16) * 0.06,
      shadow: false,
    });
    // Монитор и рабочий стол внутри комнаты
    flatBox(ctx, gx + 82, gy + gh - 68, 62, 46, notified ? '#4ADE80' : '#23272E', 4, 3, INK);
    flatBox(ctx, gx - 4, gy + gh - 24, gw + 8, 28, '#5C4028', 0, 3, INK);

    // Родной переплёт оконной рамы здания ПОВЕРХ персонажей (чтобы они стояли строго за стеклом внутри здания!)
    flatBox(ctx, 514, gy - 2, 17, gh + 4, '#6E4E26', 0, 3.5, INK);
    flatBox(ctx, gx - 2, 897, 514 - gx + 4, 14, '#6E4E26', 0, 3.5, INK);

    // Лёгкий солнечный блик на стекле
    flatPoly(ctx, [[535, gy + 6], [648, gy + 6], [535, gy + 145]], 'rgba(255,255,255,0.22)', 0, INK);
    ctx.restore();
  } else {
    // Выбитое окно: тёмный проём комнаты внутри родной рамы здания + торчащие по краям осколки стекла и сломанной деревянной перекладины
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();
    flatBox(ctx, gx - 4, gy - 4, gw + 8, gh + 8, '#1E1710', 0, 0);
    // Обломки деревянной рамы
    flatPoly(ctx, [[514, gy], [531, gy], [524, gy + 42], [516, gy + 28]], '#6E4E26', 3, INK);
    flatPoly(ctx, [[514, gy + gh], [531, gy + gh], [527, gy + gh - 36], [515, gy + gh - 48]], '#6E4E26', 3, INK);
    // Осколки стекла по периметру родной рамы
    flatPoly(ctx, [[gx, gy], [gx + 54, gy + 14], [gx + 18, gy + 64]], '#A5D8E6', 3, INK);
    flatPoly(ctx, [[gx + gw, gy], [gx + gw - 58, gy + 22], [gx + gw, gy + 74]], '#A5D8E6', 3, INK);
    flatPoly(ctx, [[gx, gy + gh], [gx + 48, gy + gh - 26], [gx + 14, gy + gh - 72]], '#A5D8E6', 3, INK);
    flatPoly(ctx, [[gx + gw, gy + gh], [gx + gw - 52, gy + gh - 24], [gx + gw - 12, gy + gh - 68]], '#A5D8E6', 3, INK);
    ctx.restore();
  }
}

// ---------- ЧАСТЬ 1: Офис (Nano Banana фон), пробитие окна и драйвовая погоня по улице ----------
function drawS1OfficeAndStreet(ctx, t, tl) {
  const c = tl.cues;
  const notified = t >= c.s1_notify;

  if (t < c.s1_boss) {
    const zoomP = ease(seg(t, c.s1_notify - 0.2, c.s1_glass));
    const winX = 538, winY = 951;
    const camZ = lerp(1.0, 1.56, zoomP);
    const camX = lerp(W / 2, winX, zoomP);
    const camY = lerp(H / 2, winY - 10, zoomP);
    const shake = t >= c.s1_glass ? 24 : (notified ? 6 : 0);

    camera(ctx, camX, camY, camZ, shake);

    const bgOffice = getNanoAsset('bg_s1_office');
    if (!drawNanoBgCover(ctx, bgOffice, 90)) {
      drawFallbackSkyAndStreet(ctx, t, 0, 0);
    }

    // Персонажи внутри родного центрального окна 2-го этажа здания
    drawHeroOfficeWindow(ctx, t >= c.s1_glass, t, notified);

    for (let b = 0; b < 4; b++) {
      const bx0 = ((120 + b * 250 + (notified ? 3.25 : t) * 75) % (W + 120)) - 60;
      let by0 = 290 + (b % 2) * 70 + Math.sin(t * 4.5 + b) * 16;
      const fallDt = notified ? (t - c.s1_notify) : 0;
      if (notified) by0 += fallDt * fallDt * 1250;
      if (by0 < 1450) {
        drawAnimatedBird(ctx, bx0, by0, t, b + 1, notified, fallDt);
      }
    }

    if (t >= c.s1_glass) {
      const dt = t - c.s1_glass;
      drawImpactBurst(ctx, winX, winY, dt / 0.45, 210);
      for (let s = 0; s < 16; s++) {
        const a = (s / 16) * Math.PI * 2;
        const sx = winX + Math.cos(a) * (40 + dt * 390);
        const sy = winY + Math.sin(a) * (30 + dt * 270) + dt * dt * 450;
        flatPoly(ctx, [[sx, sy], [sx + 22, sy + 8], [sx + 8, sy + 24]], '#A5D8E6', 2.8, INK);
      }
      const cx = lerp(winX, winX - 250, dt / 0.6);
      const cy = winY - Math.sin((dt / 0.6) * Math.PI) * 130 + dt * 330;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(dt * 8.5);
      flatOval(ctx, 0, 0, 68, 48, '#E06D3B', 4, INK);
      flatOval(ctx, -10, -8, 38, 22, '#F08856', 2.5, INK);
      ctx.restore();

      const jumpP = clamp(dt / 0.6);
      person(ctx, {
        x: lerp(winX, winX + 95, jumpP),
        y: lerp(winY + 60, winY + 290, jumpP),
        s: lerp(0.88, 1.38, jumpP),
        seed: 101,
        shirt: '#EAE6DF', pants: '#343D46', tie: '#2B6CB0', hair: 'messy',
        eyes: 'red', brow: 0.9, mood: 'scream', mouth: 0.85,
        squash: 0.18,
        arms: { l: [-1.1, 0.5], r: [1.3, 0.5] },
        holdL: propPhone('#5CE67E', 'GTA VI'),
        rot: 0.32, shadow: false,
      });
      person(ctx, {
        x: lerp(winX - 30, winX - 85, jumpP),
        y: lerp(winY + 90, winY + 370, jumpP),
        s: lerp(0.82, 1.28, jumpP),
        seed: 102,
        shirt: '#3A3F47', pants: '#282C33', tie: '#D93829', hair: 'bald_sides', hairColor: '#596068',
        eyes: 'wide', brow: -0.9, tears: 1, mood: 'scream', mouth: 0.9,
        squash: -0.15,
        arms: { l: [1.5, 0.2], r: [1.35, 0.2] },
        rot: 0.82, shadow: false,
      });
    }
  } else {
    // ПЛАН Б (t >= c.s1_boss): Драйвовая погоня по закатной улице (бесшовный скролл панорамы Nano Banana!)
    const shakeOut = t >= c.s1_shakeoff;
    const kickDt = Math.max(0, t - c.s1_shakeoff);
    const dragTime = t - c.s1_boss;
    const sunset = ease(seg(t, c.s1_shakeoff, c.s1_crash_shot - 0.1));

    const scrollX = dragTime * (shakeOut ? 640 : 340);
    const camZ = shakeOut ? lerp(1.18, 1.04, clamp(kickDt / 0.9)) : 1.18;
    const shake = (shakeOut && kickDt < 0.38) ? 24 * (1 - kickDt / 0.38) : 4;

    camera(ctx, W / 2, 1140, camZ, shake);

    // Заполняем верх небом в тон панорамы и нижнюю часть дороги под панорамой
    ctx.fillStyle = '#F5BA54';
    ctx.fillRect(-500, -400, W + 1000, 800);
    ctx.fillStyle = '#38291B';
    ctx.fillRect(-500, 1450, W + 1000, 800);

    const bgChase = getNanoAsset('bg_s1_street_chase') || getNanoAsset('bg_s1_office');
    if (!drawNanoBgScrollX(ctx, bgChase, scrollX, 60, 1620)) {
      drawFallbackSkyAndStreet(ctx, t, sunset, scrollX);
    }

    // Дорожная разметка поверх асфальта для ощущения ураганной скорости
    const stripeOffset = ((-scrollX * 1.35) % 240 + 240) % 240;
    for (let i = -2; i < 8; i++) {
      flatBox(ctx, i * 240 + stripeOffset - 100, 1560, 120, 16, '#E2C878', 3, 2.8, INK);
    }

    if (!shakeOut) {
      const workerX = 650 + Math.sin(t * 15) * 16;
      const workerY = 1380;

      // Клубы пыли из-под волочащегося по асфальту Босса
      drawDustPuffs(ctx, workerX - 245, 1390, t * 1.4, -1, 6);

      // Босс горизонтально волочится по асфальту на пузе, двумя руками вцепившись в ногу сотрудника!
      person(ctx, {
        x: workerX - 135, y: 1382, s: 1.34, seed: 102,
        pose: 'dragged',
        shirt: '#3A3F47', pants: '#282C33', tie: '#D93829', hairColor: '#596068',
        mouth: mouthOf(tl, 's1_boss', t),
      });

      // Сотрудник изо всех сил несётся вправо, наклонившись вперёд и оглядываясь на Босса
      person(ctx, {
        x: workerX, y: workerY, s: 1.38, seed: 101,
        shirt: '#EAE6DF', pants: '#343D46', tie: '#2B6CB0', hair: 'messy',
        eyes: 'red', brow: 0.9, mood: 'frown',
        headTurn: -0.75,
        run: t * 15,
        holdL: propPhone('#5CE67E', 'GTA VI'),
      });
    } else {
      drawImpactBurst(ctx, 480, 1290, kickDt / 0.45, 185);

      const flyT = clamp(kickDt / 0.95);
      const bossX = lerp(430, 120, easeOut(flyT));
      const bossY = flyT < 1
        ? 1330 - Math.sin(flyT * Math.PI) * 350
        : 1345;
      person(ctx, {
        x: bossX, y: bossY, s: lerp(1.3, 0.95, flyT), seed: 102,
        shirt: '#3A3F47', pants: '#282C33', tie: '#D93829', hair: 'bald_sides', hairColor: '#596068',
        eyes: flyT > 0.8 ? 'dead' : 'wide', tears: 1, mood: 'scream', mouth: 0.75,
        gesture: 'panic',
        rot: flyT < 1 ? -kickDt * 11.5 : -1.52,
        squash: flyT > 0.88 && flyT < 1.0 ? -0.24 : 0,
      });

      const sprintX = lerp(630, 745, clamp(kickDt / 1.8));
      drawDustPuffs(ctx, sprintX - 50, 1390, t * 1.8, -1, 7);
      person(ctx, {
        x: sprintX, y: 1390, s: 1.44, seed: 101,
        shirt: '#EAE6DF', pants: '#343D46', tie: '#2B6CB0', hair: 'messy',
        eyes: 'red', brow: 0.85, mood: 'scream',
        mouth: mouthOf(tl, 's1_worker', t),
        run: t * 22,
        rot: 0.14,
        holdL: propPhone('#5CE67E', '99%'),
      });
    }
  }

  drawForegroundFrame(ctx, 'park', t);

  const clockStr = notified ? '08:01' : '08:00';
  drawLocationTag(ctx, `19 НОЯБРЯ • ${clockStr} • РЕЛИЗ GTA VI`, W / 2, 165, -0.018, notified ? '#6EE7B7' : '#F6C93E');

  if (notified && t < c.s1_boss + 1.2) {
    const pop = elasticOut(seg(t, c.s1_notify, c.s1_notify + 0.55));
    const ny = lerp(-120, 285, pop);
    screen(ctx);
    ctx.save();
    flatBox(ctx, W / 2 - 340, ny - 52, 680, 104, '#1D242B', 10, 4.5, INK);
    flatBox(ctx, W / 2 - 322, ny - 36, 72, 72, '#4ADE80', 8, 3.5, INK);
    text(ctx, 'GTA', W / 2 - 286, ny + 1, 22, '#181410');
    text(ctx, 'ЗАГРУЗКА GTA VI ДОСТУПНА!', W / 2 + 34, ny - 14, 25, '#F6C93E');
    text(ctx, 'Шейдеры: 99% • Нажмите ИГРАТЬ', W / 2 + 34, ny + 22, 20, '#E2E8F0');
    ctx.restore();
  }
}

// ---------- ЧАСТЬ 2: Перекрёсток и магазин ЭЛЕКТРОНИКА (Nano Banana фон + спрайты броневиков) ----------
function drawArmoredVanHybrid(ctx, x, y, flip = 1, doorOpen = 0, pitch = 0, crumple = 0, wheelSpin = 0) {
  const spr = getNanoAsset('spr_van');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pitch);
  ctx.scale(flip * (1 - crumple * 0.08), 1 + crumple * 0.08);

  flatOval(ctx, 0, 10, 205, 22, 'rgba(0,0,0,0.36)', 0);

  if (spr) {
    const targetW = 440;
    const targetH = targetW * (spr.height / spr.width);
    ctx.drawImage(spr, -targetW * 0.5, -targetH + 14, targetW, targetH);

    // Если фургон отражён по горизонтали (flip === -1), перекрываем зеркальную надпись прямой!
    if (flip === -1) {
      ctx.save();
      ctx.translate(-46, -targetH * 0.468);
      ctx.scale(-1, 1);
      flatBox(ctx, -135, -24, 270, 48, '#FDDD2E', 2, 0);
      text(ctx, 'ИНКАССАЦИЯ', 0, 1, 24, '#111111');
      ctx.restore();
    }

    if (doorOpen > 0) {
      ctx.save();
      ctx.translate(-targetW * 0.48, -targetH * 0.72);
      ctx.rotate(-doorOpen * 0.48);
      flatBox(ctx, -44 * doorOpen, 0, 46, targetH * 0.55, '#3F4A33', 6, 4, INK);
      ctx.restore();
    }
  } else {
    flatBox(ctx, -200, -195, 310, 165, '#596649', 10, 4.5, INK);
    flatBox(ctx, 105, -155 - crumple * 14, 95 - crumple * 16, 125 + crumple * 10, '#4B573D', 8, 4.5, INK);
  }
  ctx.restore();
}

function drawS1Crash(ctx, t, tl) {
  const c = tl.cues;
  const impact = t >= c.s1_crash;
  const it = Math.max(0, t - c.s1_crash);
  const gSpeak = mouthOf(tl, 's1_guard1', t);
  const runStart = tl.lines.s1_guard1 ? tl.lines.s1_guard1.end - 0.25 : c.s1_crash + 3.2;
  const runShop = seg(t, runStart, c.s1_fire_shot - 0.1);

  const closeUpP = impact ? ease(seg(it, 0.75, 1.25)) * (1 - ease(seg(t, runStart - 0.15, runStart + 0.35))) : 0;
  const camZ = lerp(1.0, 1.26, closeUpP);
  const camY = lerp(H / 2, 1200, closeUpP);
  const shake = impact && it < 0.65 ? 28 * (1 - it / 0.65) : 0;

  camera(ctx, W / 2, camY, camZ, shake);

  const bgCross = getNanoAsset('bg_s1_crossroads');
  if (!drawNanoBgCover(ctx, bgCross, 90)) {
    drawFallbackSkyAndStreet(ctx, t, 0.35, 0);
  }

  const driveP = easeIn(seg(t, c.s1_crash_shot, c.s1_crash));
  const doorP = elasticOut(seg(t, c.s1_crash + 0.05, c.s1_crash + 0.7));
  const rearLift = impact && it < 0.55 ? Math.sin((it / 0.55) * Math.PI) * 0.2 : 0;
  const crumple = impact ? clamp(it / 0.15) : 0;
  const spin = !impact ? t * 18 : 0;

  drawArmoredVanHybrid(ctx, lerp(-220, 285, driveP), 1395 - rearLift * 85, 1, doorP, rearLift, crumple, spin);
  drawArmoredVanHybrid(ctx, lerp(W + 220, 795, driveP), 1395 - rearLift * 85, -1, doorP, -rearLift, crumple, -spin);

  if (impact) {
    const fallP = clamp(it / 0.75);
    const bounce = Math.abs(Math.sin(fallP * Math.PI * 2.5)) * (1 - fallP) * 90;
    const bagPositions = [200, 325, 455, 620, 750, 875];
    bagPositions.forEach((bx, i) => {
      const by = lerp(1240, 1465 + (i % 2) * 30, easeOut(fallP)) - bounce;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.sin(i * 2.1 + fallP * 6) * 0.18 * (1 - fallP));
      propMoneyBag(ctx);
      ctx.restore();
    });

    drawCartoonExplosion(ctx, W / 2, 1250, clamp(it / 1.15), 260);

    for (let b = 0; b < 18; b++) {
      const bx = W / 2 + (hash(b * 3.7) - 0.5) * 800 * clamp(it / 1.6) + Math.sin(t * 3.2 + b) * 28;
      const peakY = 560 + hash(b * 9.1) * 380;
      const by = it < 0.85
        ? lerp(1220, peakY, easeOut(it / 0.85))
        : peakY + (it - 0.85) * 145;
      const rot = (hash(b * 5.3) - 0.5) * 2.2 + Math.sin(t * 2.5 + b) * 0.6;
      drawFlyingBill(ctx, bx, by, rot, 1.08, t * 7 + b * 1.9);
    }

    const hopOut = easeOut(seg(it, 0.15, 0.7));
    const lookBags = it >= 0.65 && it < 1.15;
    const phoneShock = it >= 1.05 && it < 1.65;
    const hatJump = phoneShock ? Math.sin(seg(it, 1.05, 1.55) * Math.PI) * 28 : 0;
    const waveOff = gSpeak > 0.02 || (it >= 1.45 && runShop === 0);
    const runEase = ease(runShop);

    for (let g = 0; g < 2; g++) {
      const baseX = g === 0 ? lerp(210, 395, hopOut) : lerp(870, 685, hopOut);
      const gx = lerp(baseX, W / 2 - 25 + g * 50, runEase);
      const gy = lerp(1470, 1215, runEase * 0.9) - (hopOut < 1 ? Math.sin(hopOut * Math.PI) * 65 : 0);
      const scale = lerp(1.36, 0.76, runEase);

      if (runShop < 0.96) {
        const waveAngle = Math.sin(t * 16) * 0.55;
        person(ctx, {
          x: gx, y: gy, s: scale, seed: 210 + g,
          flip: runShop > 0 ? (gx < W / 2 ? 1 : -1) : (g === 0 ? 1 : -1),
          shirt: '#53633F', pants: '#414F31', hat: 'helmet', hatColor: '#5B6D44',
          hatLift: hatJump,
          mustache: g === 0 ? '#2D2118' : null,
          eyes: phoneShock ? 'wide' : (runShop > 0 ? 'red' : (lookBags ? 'lidded' : 'normal')),
          look: lookBags ? [0, 0.95] : (phoneShock ? [0.7, 0.3] : (waveOff ? [0.6, 0] : null)),
          headTurn: lookBags ? 0 : (waveOff ? 0.45 : 0),
          headTilt: lookBags ? 0.18 : 0,
          squash: phoneShock ? Math.sin(seg(it, 1.05, 1.45) * Math.PI) * 0.18 : 0,
          brow: phoneShock ? -0.9 : (runShop > 0 ? 0.9 : 0.3),
          mood: runShop > 0 ? 'buckteeth' : 'neutral',
          mouth: g === 0 ? gSpeak : 0,
          run: runShop > 0 ? t * 20 + g * 1.5 : null,
          arms: waveOff && g === 0 && runShop === 0
            ? { l: [-0.62, -0.78], r: [1.35 + waveAngle, 0.35] }
            : null,
          holdL: it >= 1.0 ? propPhone('#5CE67E', 'GTA VI') : null,
        });
      }
    }
  }

  drawForegroundFrame(ctx, 'park', t);
  drawLocationTag(ctx, 'ПЕРЕКРЁСТОК • ИНКАССАЦИЯ', W / 2, 165, 0.015);
  drawCounterHUD(ctx, 'КУПЮРЫ', '0', '0', W - 210, 285);
}

// ---------- ЧАСТЬ 3: Горящий детсад, пожарная машина (Nano Banana) и бешеный шланг ----------
function drawFireTruckHybrid(ctx, x, y, brakePitch = 0, bounceY = 0, t = 0, wSpin = 0) {
  const spr = getNanoAsset('spr_firetruck');
  ctx.save();
  ctx.translate(x, y + bounceY);
  ctx.rotate(brakePitch);
  flatOval(ctx, 10, 12, 260, 24, 'rgba(0,0,0,0.38)', 0);

  const flashCol = Math.sin(t * 24) > 0 ? '#38BDF8' : '#EF4444';

  if (spr) {
    const targetW = 520;
    const targetH = targetW * (spr.height / spr.width);
    ctx.drawImage(spr, -targetW * 0.5, -targetH + 16, targetW, targetH);
    lightCone(ctx, targetW * 0.25, -targetH + 28, 30, 190, -150, flashCol === '#38BDF8' ? 'rgba(56,189,248,0.34)' : 'rgba(239,68,68,0.34)');
  } else {
    flatBox(ctx, -230, -205, 350, 175, '#C83228', 10, 4.5, INK);
  }
  ctx.restore();
}

function drawS1FireTruck(ctx, t, tl) {
  const c = tl.cues;
  const dt = Math.max(0, t - c.s1_fire_shot);
  const fSpeak = mouthOf(tl, 's1_fire', t);

  const zoomP = ease(seg(dt, 1.5, 2.3));
  const shake = dt > 1.35 && dt < 1.85 ? 16 * (1 - (dt - 1.35) / 0.5) : 0;

  camera(ctx, lerp(W / 2, 550, zoomP), lerp(H / 2, 1180, zoomP), lerp(1.0, 1.15, zoomP), shake);

  const bgFire = getNanoAsset('bg_s1_fire_street');
  if (!drawNanoBgCover(ctx, bgFire, 90)) {
    drawFallbackSkyAndStreet(ctx, t, 0.22, 0);
  }

  // Живые восходящие искры, пульсация жара и клубы дыма поверх горящего детсада из Nano Banana!
  const fireGlow = 0.16 + Math.sin(t * 18) * 0.06;
  flatOval(ctx, 240, 820, 220, 190, `rgba(255,140,30,${fireGlow})`, 0);
  for (let s = 0; s < 14; s++) {
    const sp = ((t * 0.65 + s / 14) % 1);
    const sx = 80 + (s * 31) % 340 + Math.sin(t * 5 + s) * 22;
    const sy = 920 - sp * 460;
    const r = (1 - sp * 0.6) * 6.5;
    flatOval(ctx, sx, sy, r, r, s % 2 === 0 ? '#FADB39' : '#FF6B2B', 2, INK);
  }
  for (let f = 0; f < 4; f++) {
    const smokeP = ((t * 0.38 + f * 0.25) % 1);
    const smokeX = 110 + f * 82 + Math.sin(t * 2.5 + f) * 20 - smokeP * 30;
    const smokeY = 580 - smokeP * 240;
    flatOval(ctx, smokeX, smokeY, 34 + smokeP * 28, 26 + smokeP * 20, `rgba(42,33,26,${(1 - smokeP) * 0.55})`, 0);
  }

  const drive = easeOut(clamp(dt / 1.45));
  const truckX = lerp(-360, 310, drive);
  const truckY = 1435;
  const brakePitch = dt > 1.15 && dt < 1.85 ? Math.sin(((dt - 1.15) / 0.7) * Math.PI) * 0.095 : 0;
  const bounceY = dt > 1.45 && dt < 2.1 ? Math.sin((dt - 1.45) * 18) * 8 * (1 - (dt - 1.45) / 0.65) : 0;

  if (dt > 1.1 && dt < 1.85) {
    drawDustPuffs(ctx, truckX + 120, 1435, t * 2, -1, 5);
  }

  const wSpin = dt < 1.45 ? t * 22 : 0;
  drawFireTruckHybrid(ctx, truckX, truckY, brakePitch, bounceY, t, wSpin);

  // 4 пожарных выскакивают и цепочкой забегают прямо в открытый ПОДЪЕЗД справа (x = 810, y = 1190)!
  if (dt >= 1.45) {
    const runDt = dt - 1.45;
    for (let i = 3; i >= 0; i--) {
      if (i === 0) {
        const hopIn = easeOut(clamp(runDt / 0.45));
        const speakEnd = tl.lines.s1_fire ? (tl.lines.s1_fire.end - c.s1_fire_shot - 1.45) : 3.2;
        const exitP = easeIn(clamp((runDt - speakEnd) / 0.85));
        if (exitP < 0.98) {
          const fx = lerp(truckX + 145, 455, hopIn) + exitP * 355;
          const fy = lerp(1435, 1475, hopIn) - (hopIn < 1 ? Math.sin(hopIn * Math.PI) * 55 : 0) - exitP * 275;
          const waveArm = Math.sin(t * 16) * 0.5;
          person(ctx, {
            x: fx, y: fy, s: lerp(1.36, 0.85, exitP), seed: 310,
            shirt: '#8F2D24', pants: '#4A2521', hat: 'fire',
            mustache: '#2D2118',
            eyes: 'red', brow: 0.9, mood: 'buckteeth',
            mouth: fSpeak,
            run: (hopIn < 1 || exitP > 0) ? t * 20 : null,
            arms: (hopIn >= 1 && exitP === 0) ? { l: [-0.62, -0.78], r: [1.25 + waveArm, 0.35] } : null,
            holdL: propPhone('#5CE67E', 'GTA VI'),
          });
        }
      } else {
        const p = clamp((runDt - (i - 1) * 0.42) / 1.55);
        if (p > 0 && p < 0.98) {
          const fx = lerp(truckX + 195 + i * 35, 815, ease(p));
          const fy = lerp(1415 - i * 18, 1195, ease(p) * 0.9) - Math.abs(Math.sin(p * Math.PI * 3)) * 26;
          person(ctx, {
            x: fx, y: fy, s: lerp(1.18, 0.78, p), seed: 310 + i,
            shirt: '#8F2D24', pants: '#4A2521', hat: 'fire',
            eyes: 'red', brow: 0.8, mood: 'buckteeth',
            run: t * 20 + i * 1.6,
            holdL: i === 2 ? propPhone('#5CE67E', '99%') : null,
          });
        }
      }
    }
  }

  // Брошенный пожарный шланг бешено извивается змеёй по асфальту и поливает всё вокруг!
  if (dt >= 1.85) {
    ctx.save();
    const whip1 = Math.sin(t * 14) * 38;
    const whip2 = Math.cos(t * 18) * 34;
    const nozX = truckX + 275 + whip2 * 0.5;
    const nozY = 1475 + whip1 * 0.6;
    const nozAngle = Math.sin(t * 14) * 0.45 - 0.35;

    ctx.beginPath();
    ctx.moveTo(truckX + 40, 1385);
    ctx.bezierCurveTo(truckX + 115, 1515 + whip1, truckX + 195, 1410 - whip2, nozX, nozY);
    ctx.lineWidth = 22;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#DDD6C7';
    ctx.stroke();

    ctx.save();
    ctx.translate(nozX, nozY);
    ctx.rotate(nozAngle);
    flatBox(ctx, -6, -11, 34, 22, '#D9A31E', 4, 3.5, INK);
    ctx.restore();

    for (let w = 0; w < 24; w++) {
      const wp = ((t * 2.8 + w / 24) % 1);
      const launchAngle = Math.sin((t - wp * 0.35) * 14) * 0.48 - 0.42;
      const speed = 340;
      const wx = nozX + Math.cos(launchAngle) * wp * speed;
      const wy = nozY + Math.sin(launchAngle) * wp * speed + wp * wp * 260;
      const r = (1 - wp * 0.3) * 11;
      flatOval(ctx, wx, wy, r, r * 0.68, '#7DD3FC', 2.5, INK, launchAngle + wp);
    }
    ctx.restore();
  }

  drawForegroundFrame(ctx, 'park', t);
  drawLocationTag(ctx, 'ВЫЗОВ 01 • ПОЖАР ПОДОЖДЁТ', W / 2, 165, -0.015);
}

export function drawScene1Shorts(ctx, t, tl) {
  const c = tl.cues;
  if (t < c.s1_crash_shot) {
    drawS1OfficeAndStreet(ctx, t, tl);
  } else if (t < c.s1_fire_shot) {
    drawS1Crash(ctx, t, tl);
  } else {
    drawS1FireTruck(ctx, t, tl);
  }
}
