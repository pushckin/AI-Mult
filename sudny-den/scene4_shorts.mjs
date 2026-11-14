// СЦЕНА 4: «Новый дивный мир» (9:16 YouTube Shorts, 1080x1920, в точном 2D-стиле bbJriQ5RO1I)
import {
  W, H, G, INK, hash, clamp, lerp, seg, ease, easeIn, easeOut, backOut, shade,
  camera, screen, flatBox, flatOval, flatPoly, text, lightCone, overlay,
  drawForegroundFrame, drawLocationTag, person, propGamepad, propMoneyBag,
} from './engine_shorts.mjs';

export function mouthOf(tl, id, t) {
  const l = tl?.lines?.[id];
  if (!l || t < l.start || t > l.end) return 0;
  const idx = Math.floor((t - l.start) * (tl.fps || 24));
  return l.env?.[clamp(idx, 0, l.env.length - 1)] || 0;
}

// ---------- 1. АПОКАЛИПТИЧЕСКОЕ НЕБО И 2D ЯДЕРНЫЙ ГРИБ (в стиле bbJriQ5RO1I) ----------
function drawApocalypticBackdrop(ctx, t, horizonY = 1270) {
  // Багрово-горчичное вечернее/ночное небо после ядерного взрыва
  const skyGrad = ctx.createLinearGradient(0, -250, 0, horizonY + 100);
  skyGrad.addColorStop(0.00, '#09040C');
  skyGrad.addColorStop(0.35, '#260B17');
  skyGrad.addColorStop(0.65, '#5C1A14');
  skyGrad.addColorStop(0.88, '#9E3816');
  skyGrad.addColorStop(1.00, '#421712');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-400, -350, W + 800, horizonY + 500);

  // Центр ядерного гриба на горизонте
  const mx = 540;
  const baseY = horizonY;

  // Радиоактивное свечение у горизонта и за грибом
  const glowPulse = 0.28 + Math.sin(t * 3.5) * 0.08;
  flatOval(ctx, mx, baseY - 120, 620, 360, `rgba(245, 120, 24, ${glowPulse * 0.75})`, 0);
  flatOval(ctx, mx, baseY - 60, 480, 190, `rgba(251, 191, 36, ${glowPulse * 0.55})`, 0);

  // 1) Огненное основание ножки гриба у земли
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 2.1;
    const bx = mx + Math.sin(a) * 190;
    const by = baseY - 20 - Math.abs(Math.cos(a)) * 35;
    const br = 64 + (i % 3) * 18;
    flatOval(ctx, bx, by, br, br * 0.78, '#2D1219', 4, INK);
    flatOval(ctx, bx, by + 6, br * 0.78, br * 0.60, '#7A1C16', 3.5, INK);
    flatOval(ctx, bx, by + 12, br * 0.52, br * 0.42, '#EA580C', 2.5, INK);
  }

  // 2) Вертикальный дымовой столб (ножка гриба)
  const stemLobes = [
    { y: baseY - 110, w: 175, h: 90, c1: '#35141D', c2: '#8E2818', c3: '#EA580C' },
    { y: baseY - 230, w: 150, h: 95, c1: '#2E1119', c2: '#7C2116', c3: '#EA580C' },
    { y: baseY - 350, w: 135, h: 90, c1: '#280F16', c2: '#751E15', c3: '#C2410C' },
    { y: baseY - 470, w: 145, h: 95, c1: '#2F121B', c2: '#882517', c3: '#D97706' },
    { y: baseY - 590, w: 190, h: 105, c1: '#3A1520', c2: '#9E2C19', c3: '#EA580C' },
    { y: baseY - 710, w: 260, h: 120, c1: '#441824', c2: '#B4341B', c3: '#F59E0B' },
  ];

  for (const lobe of stemLobes) {
    const sway = Math.sin(t * 2 + lobe.y * 0.01) * 8;
    flatOval(ctx, mx + sway, lobe.y, lobe.w, lobe.h, lobe.c1, 4.2, INK);
    flatOval(ctx, mx + sway, lobe.y + 4, lobe.w * 0.78, lobe.h * 0.74, lobe.c2, 3.5, INK);
    flatOval(ctx, mx + sway, lobe.y + 8, lobe.w * 0.48, lobe.h * 0.48, lobe.c3, 2.5, INK);
  }

  // 3) Огненный конденсационный пояс (юбка) вокруг ножки гриба
  const skirtY = baseY - 420;
  flatOval(ctx, mx, skirtY, 235, 46, '#280F16', 4.5, INK);
  flatOval(ctx, mx, skirtY, 215, 34, '#EA580C', 3, INK);
  flatOval(ctx, mx, skirtY, 155, 20, '#FDE047', 2, INK);

  // 4) Огромная 2D-шапка гриба (Cap) на высоте y ~ 450
  const capY = 460;
  flatOval(ctx, mx, capY - 20, 460, 240, `rgba(245, 120, 24, ${glowPulse * 0.85})`, 0);

  // Внешний тёмный слой дымовых клубов
  const capOuterLobes = [
    [-280, 40, 140, 110], [-200, -50, 160, 125], [-110, -110, 175, 135],
    [0, -135, 195, 145], [110, -110, 175, 135], [200, -50, 160, 125], [280, 40, 140, 110],
    [-170, 70, 150, 95], [170, 70, 150, 95], [0, 85, 185, 105],
  ];

  for (const [ox, oy, rx, ry] of capOuterLobes) {
    const pulse = 1 + Math.sin(t * 3.2 + ox * 0.02) * 0.035;
    flatOval(ctx, mx + ox, capY + oy, rx * pulse, ry * pulse, '#291018', 4.5, INK);
  }

  // Внутренний огненно-багровый слой
  const capInnerLobes = [
    [-210, 30, 105, 80, '#991B1B'], [-140, -40, 120, 95, '#B91C1C'],
    [-60, -90, 135, 100, '#C2410C'], [0, -100, 150, 105, '#EA580C'],
    [60, -90, 135, 100, '#C2410C'], [140, -40, 120, 95, '#B91C1C'],
    [210, 30, 105, 80, '#991B1B'], [0, 50, 140, 75, '#D97706'],
  ];

  for (const [ox, oy, rx, ry, col] of capInnerLobes) {
    flatOval(ctx, mx + ox, capY + oy, rx, ry, col, 3.8, INK);
  }

  // Центральное сияющее ядро шапки гриба
  flatOval(ctx, mx, capY - 45, 180, 85, '#F59E0B', 3.5, INK);
  flatOval(ctx, mx, capY - 45, 125, 55, '#FDE047', 3, INK);
  flatOval(ctx, mx, capY - 45, 75, 30, '#FFFBEB', 2, INK);

  // 5) Восходящие светящиеся радиоактивные искры/пепел
  for (let s = 0; s < 22; s++) {
    const seed = s * 7.31;
    const speed = 75 + hash(seed) * 90;
    const sy = ((baseY - (t * speed + hash(seed + 1) * 1200)) % (baseY - 180));
    const sx = mx + (hash(seed + 2) - 0.5) * (340 + (baseY - sy) * 0.45) + Math.sin(t * 3.5 + s) * 22;
    const sr = 3.5 + hash(seed + 3) * 4;
    const col = s % 3 === 0 ? '#FDE047' : (s % 3 === 1 ? '#FB923C' : '#EF4444');
    flatOval(ctx, sx, sy, sr, sr, col, 1.5, INK);
  }
}

// ---------- 2. СИЛУЭТЫ РАЗРУШЕННОГО ГОРОДА И УЛИЦА ----------
function drawRuinedCitySkyline(ctx, groundY = 1270) {
  // Разрушенные многоэтажки на среднем плане (стиль 2D с обводкой)
  const ruins = [
    { x: -140, y: 720, w: 220, h: 560, top: 'slantL' },
    { x: 95, y: 830, w: 175, h: 450, top: 'cracked' },
    { x: 285, y: 910, w: 140, h: 370, top: 'flat' },
    { x: 740, y: 870, w: 160, h: 410, top: 'broken' },
    { x: 915, y: 740, w: 230, h: 540, top: 'slantR' },
  ];

  for (const b of ruins) {
    if (b.top === 'slantL') {
      flatPoly(ctx, [
        [b.x, b.y + 80], [b.x + b.w, b.y],
        [b.x + b.w, groundY + 10], [b.x, groundY + 10],
      ], '#26141D', 4, INK);
    } else if (b.top === 'slantR') {
      flatPoly(ctx, [
        [b.x, b.y], [b.x + b.w, b.y + 90],
        [b.x + b.w, groundY + 10], [b.x, groundY + 10],
      ], '#26141D', 4, INK);
    } else if (b.top === 'broken') {
      flatPoly(ctx, [
        [b.x, b.y + 40], [b.x + 45, b.y], [b.x + 85, b.y + 55], [b.x + 130, b.y + 20], [b.x + b.w, b.y + 65],
        [b.x + b.w, groundY + 10], [b.x, groundY + 10],
      ], '#211219', 4, INK);
    } else {
      flatBox(ctx, b.x, b.y, b.w, b.h + 20, '#23131B', 6, 4, INK);
    }

    // Тёмные пустые глазницы окон и редкие горящие пожары внутри
    const rows = Math.floor((groundY - b.y) / 80);
    const cols = Math.floor(b.w / 60);
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = b.x + 20 + c * 52;
        const wy = b.y + 70 + r * 74;
        const fire = (r + c + b.x) % 7 === 0;
        flatBox(ctx, wx, wy, 32, 42, fire ? '#EA580C' : '#11080D', 3, 2, INK);
        if (fire) {
          flatOval(ctx, wx + 16, wy + 26, 10, 12, '#FDE047', 1.5, INK);
        }
      }
    }
  }

  // Покосившийся уличный фонарь с оборванным проводом
  ctx.save();
  ctx.translate(210, groundY);
  ctx.rotate(-0.16);
  flatBox(ctx, -7, -290, 14, 290, '#3F3530', 4, 3.5, INK);
  flatBox(ctx, -26, -305, 52, 18, '#2B2420', 3, 3, INK);
  // Разбитый плафон
  flatPoly(ctx, [[-16, -305], [0, -325], [16, -305]], '#78716C', 2.5, INK);
  // Провисающий провод
  ctx.beginPath();
  ctx.moveTo(15, -295);
  ctx.quadraticCurveTo(80, -220, 160, -260);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();

  // Дорожное полотно и разрушенный асфальт
  flatBox(ctx, -300, groundY - 15, W + 600, 50, '#3A281E', 0, 4, INK);
  flatBox(ctx, -300, groundY + 35, W + 600, 750, '#2B2320', 0, 4, INK);

  // Выбоины, трещины и булыжники на асфальте
  for (let i = -1; i < 7; i++) {
    // Полустёртая дорожная разметка
    flatBox(ctx, i * 220 + 35, groundY + 230, 95, 16, '#8C7752', 2, 2.5, INK);
  }
  for (let c = 0; c < 9; c++) {
    const cx = -60 + c * 145 + hash(c * 3.3) * 60;
    const cy = groundY + 90 + hash(c * 6.7) * 220;
    flatOval(ctx, cx, cy, 32 + (c % 3) * 12, 14, '#1B1412', 3, INK);
    flatBox(ctx, cx - 18, cy - 8, 16, 12, '#3E342F', 2, 2, INK);
  }
}

// Горящий остов легковой машины (в стиле cartoon wreck)
function drawBurningCarWreck(ctx, x, y, flip = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);

  // Тень
  flatOval(ctx, 0, 16, 140, 20, 'rgba(0,0,0,0.36)', 0);

  // Обгоревший металлический кузов
  flatBox(ctx, -120, -70, 240, 75, '#2D2322', 8, 4, INK);
  flatPoly(ctx, [[-90, -70], [-55, -125], [45, -125], [85, -70]], '#241B1A', 4, INK);
  // Выбитые рваные окна
  flatPoly(ctx, [[-50, -76], [-35, -115], [30, -115], [20, -76]], '#140D0D', 3, INK);

  // Обгоревшие колёсные диски без шин
  for (const wx of [-75, 75]) {
    flatOval(ctx, wx, 5, 24, 24, '#1B1514', 4, INK);
    flatOval(ctx, wx, 5, 11, 11, '#574844', 2.5, INK);
  }

  // Языки 2D-пламени и дым из капота
  for (let f = 0; f < 4; f++) {
    const fx = -95 + f * 42;
    const fy = -78 - Math.sin(t * 14 + f * 2) * 14;
    const fr = 26 + (f % 2) * 10;
    // Дым вверх
    const sy = -120 - ((t * 60 + f * 45) % 180);
    flatOval(ctx, fx + Math.sin(t * 3 + f) * 14, sy, 32, 28, 'rgba(40,30,28,0.72)', 2.5, INK);
    // Огонь
    flatOval(ctx, fx, fy, fr, fr * 1.25, '#DC2626', 3.5, INK);
    flatOval(ctx, fx, fy + 4, fr * 0.65, fr * 0.85, '#F59E0B', 2.5, INK);
    flatOval(ctx, fx, fy + 8, fr * 0.35, fr * 0.45, '#FEF08A', 1.8, INK);
  }

  ctx.restore();
}

// ---------- 3. ПРОПСЫ: БЕНЗИН, ПАВЕРБАНК, САМОДЕЛЬНЫЙ ОБРЕЗ И АККУМУЛЯТОРЫ ----------
function drawGasCanister(ctx, x, y, rot = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Красная металлическая канистра
  flatBox(ctx, -28, -38, 56, 76, '#DC2626', 6, 4, INK);
  // Горловина и крышка
  flatBox(ctx, -24, -48, 18, 12, '#991B1B', 2, 2.5, INK);
  flatBox(ctx, -26, -54, 22, 8, '#FBBF24', 2, 2.5, INK);
  // Верхняя ручка для переноски
  flatBox(ctx, -12, -49, 36, 12, '#991B1B', 3, 3, INK);
  // Белая рельефная надпись «БЕНЗИН»
  text(ctx, 'БЕНЗИН', 0, 0, 13, '#FFFFFF', 'Segoe UI', 'center', INK, 4);
  flatBox(ctx, -20, 16, 40, 6, '#991B1B', 2, 0);

  ctx.restore();
}

function drawGiantPowerbank(ctx, x, y, rot = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Огромный туристический павербанк
  flatBox(ctx, -42, -26, 84, 52, '#0284C7', 7, 4, INK);
  flatBox(ctx, -34, -20, 68, 40, '#0369A1', 4, 2, INK);
  // Разъёмы Type-C и USB
  flatBox(ctx, -32, -30, 16, 6, '#0F172A', 1, 2, INK);
  flatBox(ctx, -10, -30, 16, 6, '#0F172A', 1, 2, INK);
  // 4 зелёных светодиода заряда (все горят — это сокровище!)
  for (let d = 0; d < 4; d++) {
    flatOval(ctx, -22 + d * 14, 12, 4.5, 4.5, '#4ADE80', 1.5, INK);
  }
  text(ctx, '100 000 mAh', 0, -4, 11, '#FFFFFF', 'Segoe UI', 'center', INK, 3.5);

  ctx.restore();
}

// Бандитский самодельный обрез из швабры и тостера с синей изолентой
function drawMopToasterGun(ctx, x, y, rot = -0.42) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // 1) Деревянный черенок швабры (ложе и приклад)
  flatBox(ctx, -135, -9, 215, 18, '#92400E', 4, 3.5, INK);
  // Перекладина швабры на конце приклада
  flatBox(ctx, -150, -32, 22, 64, '#78350F', 4, 3.5, INK);

  // 2) Хромированный тостер (двуствольная ствольная коробка)
  flatBox(ctx, 32, -34, 94, 66, '#CBD5E1', 8, 4, INK);
  // Два продольных слота для хлеба (два гигантских орудийных ствола!)
  flatBox(ctx, 48, -42, 22, 9, '#0F172A', 2, 2, INK);
  flatBox(ctx, 80, -42, 22, 9, '#0F172A', 2, 2, INK);
  // Рычаг тостера (спусковой крючок)
  flatBox(ctx, 118, -12, 14, 7, '#334155', 2, 2, INK);

  // 3) Культовая СИНЯЯ ИЗОЛЕНТА (толстые плотные мотки, удерживающие тостер на черенке)
  flatBox(ctx, 38, -37, 20, 72, '#2563EB', 3, 3, INK);
  flatBox(ctx, 92, -37, 20, 72, '#2563EB', 3, 3, INK);
  // Диагональный виток изоленты крест-накрест
  flatPoly(ctx, [[24, -22], [42, -22], [36, 24], [18, 24]], '#1D4ED8', 2, INK);

  // Дульный срез тостера
  flatOval(ctx, 126, -2, 8, 16, '#0F172A', 2.5, INK);

  ctx.restore();
}

// Автомобильный аккумулятор 12V с синей изолентой
function drawCarBattery(ctx, x, y, label = '12V', ah = '75Ah') {
  ctx.save();
  ctx.translate(x, y);

  // Чёрный пластиковый корпус
  flatBox(ctx, -42, -34, 84, 68, '#1E293B', 6, 4, INK);
  // Ручка для переноски
  flatBox(ctx, -24, -42, 48, 10, '#475569', 2, 2.5, INK);

  // Красная клемма (+)
  flatBox(ctx, -28, -46, 14, 14, '#EF4444', 2, 2.5, INK);
  // Синяя клемма (-)
  flatBox(ctx, 14, -46, 14, 14, '#2563EB', 2, 2.5, INK);

  // Жёлтая этикетка
  flatBox(ctx, -32, -18, 64, 40, '#F6C93E', 4, 2.5, INK);
  text(ctx, label, 0, -2, 20, '#181410', 'Segoe UI', 'center', null, 0);
  text(ctx, ah, 0, 13, 11, '#181410', 'Segoe UI', 'center', null, 0);

  ctx.restore();
}

// ---------- 4. ПЕРЕВЁРНУТЫЙ ПОЛИЦЕЙСКИЙ БОБИК И МЁРТВЫЙ КУРЬЕР ----------
function drawOverturnedPoliceBobik(ctx, x, y, t, wheelSpin = 0) {
  ctx.save();
  ctx.translate(x, y);

  // Тень под перевёрнутой машиной
  flatOval(ctx, 0, 22, 280, 32, 'rgba(0,0,0,0.36)', 0);

  // Белый кузов бобика (вверх ногами!)
  flatBox(ctx, -240, -170, 480, 170, '#ECEFEF', 12, 4.5, INK);

  // Синяя полоса «ПОЛИЦИЯ» вдоль кузова
  flatBox(ctx, -240, -105, 480, 46, '#1D4ED8', 0, 4, INK);
  text(ctx, 'ПОЛИЦИЯ', 0, -82, 34, '#FFFFFF', 'Segoe UI', 'center', INK, 5);

  // Днище автомобиля на самом верху (рама, кардан, глушитель)
  flatBox(ctx, -190, -178, 380, 16, '#374151', 4, 3.5, INK);
  flatOval(ctx, 35, -178, 26, 18, '#1F2937', 3, INK); // редуктор

  // Два крутящихся в воздухе колеса (торчат вверх)
  for (const wx of [-155, 155]) {
    ctx.save();
    ctx.translate(wx, -196);
    ctx.rotate(wheelSpin);
    // Резина колеса
    flatOval(ctx, 0, 0, 42, 42, '#231F1C', 4.5, INK);
    // Стальной штампованный диск с болтами
    flatOval(ctx, 0, 0, 20, 20, '#8C857B', 3.5, INK);
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2;
      flatOval(ctx, Math.cos(a) * 11, Math.sin(a) * 11, 3, 3, '#181410', 0);
    }
    ctx.restore();
  }

  // Смятые перевёрнутые стойки крыши и треснувшее лобовое стекло
  flatBox(ctx, -210, -50, 85, 45, '#181410', 4, 3, INK);
  flatBox(ctx, 125, -50, 85, 45, '#181410', 4, 3, INK);
  // Осколки стекла на раме
  flatPoly(ctx, [[-205, -5], [-175, -45], [-140, -5]], '#A5D8E6', 2.5, INK);

  // Разбитая полицейская мигалка на асфальте (сине-красная, раздавленная)
  flatBox(ctx, -38, 6, 76, 22, '#374151', 4, 3, INK);
  flatBox(ctx, -34, 4, 34, 18, '#DC2626', 3, 2, INK);
  flatBox(ctx, 0, 4, 34, 18, '#2563EB', 3, 2, INK);
  // Слабые предсмертные искры от разбитой мигалки
  if (Math.sin(t * 18) > 0.45) {
    flatOval(ctx, -17, 8, 6, 6, '#F87171', 0);
    flatOval(ctx, 17, 8, 6, 6, '#60A5FA', 0);
  }

  ctx.restore();
}

function drawCourierAndGtaBox(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Мёртвый курьер лежит плашмя на асфальте лицом вниз
  person(ctx, {
    x: 0, y: 0, s: 0.92, seed: 901, rot: -Math.PI / 2,
    shirt: '#EAB308', // ярко-жёлтая куртка курьера Яндекс/Самокат
    pants: '#1F2937',
    eyes: 'dead', mood: 'neutral', mouth: 0.1,
    arms: { l: [0.8, 0.4], r: [0.5, 0.3] },
    shadow: false,
  });

  // Зелёный терморюкзак доставки на спине
  flatBox(ctx, -55, -40, 78, 72, '#059669', 8, 4, INK);
  flatBox(ctx, -55, -12, 78, 16, '#E2E8F0', 2, 2, INK); // светоотражающая полоса
  text(ctx, 'ДОСТАВКА', -16, -4, 11, '#181410', 'Segoe UI', 'center', null, 0);

  // Нож, торчащий из спины
  flatPoly(ctx, [[12, -45], [16, -72], [22, -45]], '#CBD5E1', 2, INK);
  flatBox(ctx, 12, -92, 14, 22, '#0F172A', 2, 2, INK); // рукоятка ножа
  flatBox(ctx, 8, -72, 22, 6, '#64748B', 1, 1.5, INK);

  // Рядом валяется открытая розовая коробка GTA VI COLLECTOR'S EDITION
  ctx.save();
  ctx.translate(-140, 10);
  flatBox(ctx, -60, -40, 120, 80, '#EC4899', 8, 4, INK);
  // Откинутая розовая крышка коробки
  flatPoly(ctx, [[-60, -40], [-35, -78], [75, -78], [60, -40]], '#F472B6', 4, INK);
  // Золотое тиснение «GTA VI COLLECTOR'S EDITION»
  text(ctx, 'GTA VI', 0, -10, 26, '#FFFFFF', 'Segoe UI', 'center', INK, 5);
  text(ctx, "COLLECTOR'S", 0, 14, 12, '#FDE047', 'Segoe UI', 'center', INK, 3);
  // Стальной стилбук с игрой, выскользнувший на дорогу
  flatBox(ctx, -95, -15, 42, 54, '#94A3B8', 4, 3, INK);
  flatOval(ctx, -74, 12, 9, 9, '#F472B6', 2, INK);
  ctx.restore();

  ctx.restore();
}

// ---------- 5. МОНИТОР, PS6 И ОЛЕГ С ГЕЙМПАДОМ ----------
function drawMonitorAndRig(ctx, t, tl, monX, monY) {
  const c = tl?.cues || { s4_poweroff: 152.5 };
  const powerOff = t >= c.s4_poweroff;
  const dtOff = powerOff ? t - c.s4_poweroff : 0;

  // Консоль PS6 на аккумуляторе рядом с монитором
  flatBox(ctx, monX + 90, monY + 82, 108, 30, '#F8FAFC', 6, 3.5, INK);
  flatBox(ctx, monX + 104, monY + 89, 78, 16, '#0F172A', 2, 2, INK);
  // Синий светодиод включения PS6
  if (!powerOff) {
    flatBox(ctx, monX + 110, monY + 95, 66, 4, '#38BDF8', 1, 0);
  }

  // Провода-«крокодилы», идущие к аккумуляторам
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#EF4444'; // красный провод (+)
  ctx.beginPath();
  ctx.moveTo(monX + 130, monY + 112);
  ctx.quadraticCurveTo(monX + 80, monY + 140, monX - 10, monY + 135);
  ctx.stroke();

  ctx.strokeStyle = '#181410'; // чёрный провод (-)
  ctx.beginPath();
  ctx.moveTo(monX + 155, monY + 112);
  ctx.quadraticCurveTo(monX + 110, monY + 160, monX + 30, monY + 155);
  ctx.stroke();

  // Стойка и корпус портативного монитора
  flatBox(ctx, monX - 25, monY + 86, 50, 14, '#334155', 3, 3, INK);
  flatBox(ctx, monX - 6, monY + 62, 12, 26, '#1E293B', 2, 2.5, INK);
  flatBox(ctx, monX - 105, monY - 76, 210, 142, '#1E242B', 8, 4, INK);

  const screenW = 186, screenH = 118;
  const sx0 = monX - screenW / 2;
  const sy0 = monY - 64;

  if (!powerOff) {
    // 1) ДО ВЫКЛЮЧЕНИЯ: Экран ярко сияет (пальмы Вайс-Сити, спорткар, закат)
    lightCone(ctx, monX, monY - 5, 120, 360, 280, 'rgba(236,72,153,0.30)');

    // Фон игры: розово-оранжевый закат Вайс-Сити
    ctx.save();
    flatBox(ctx, sx0, sy0, screenW, screenH, '#EC4899', 4, 2.5, INK);
    ctx.beginPath();
    ctx.roundRect(sx0, sy0, screenW, screenH, 4);
    ctx.clip();

    // Градиент заката на экране
    const vg = ctx.createLinearGradient(sx0, sy0, sx0, sy0 + screenH);
    vg.addColorStop(0, '#F43F5E');
    vg.addColorStop(0.55, '#F59E0B');
    vg.addColorStop(1, '#831843');
    ctx.fillStyle = vg;
    ctx.fillRect(sx0, sy0, screenW, screenH);

    // Пальмы по бокам
    for (const px of [sx0 + 22, sx0 + screenW - 22]) {
      ctx.beginPath();
      ctx.moveTo(px, sy0 + screenH);
      ctx.quadraticCurveTo(px + 8, sy0 + screenH * 0.5, px + 4, sy0 + 28);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#181410';
      ctx.stroke();
      // Листья пальмы
      for (let l = 0; l < 5; l++) {
        const la = (l / 4) * Math.PI - 0.2;
        flatOval(ctx, px + 4 + Math.cos(la) * 16, sy0 + 28 + Math.sin(la) * 10, 14, 5, '#064E3B', 1, '#181410', la);
      }
    }

    // Спорткар на шоссе
    flatBox(ctx, monX - 32, sy0 + screenH - 34, 64, 22, '#06B6D4', 4, 2, INK);
    flatBox(ctx, monX - 18, sy0 + screenH - 42, 36, 12, '#FBBF24', 2, 1.5, INK);
    // Колёса спорткара
    flatOval(ctx, monX - 22, sy0 + screenH - 12, 7, 7, '#0F172A', 1);
    flatOval(ctx, monX + 22, sy0 + screenH - 12, 7, 7, '#0F172A', 1);

    // Логотип GTA VI на экране
    text(ctx, 'GTA VI', monX - 36, sy0 + 20, 18, '#FFFFFF', 'Segoe UI', 'center', INK, 4);

    // Индикатор батареи: «1%» с красным мигающим значком
    flatBox(ctx, sx0 + screenW - 48, sy0 + 8, 42, 18, '#7F1D1D', 3, 1.5, INK);
    const blink = Math.sin(t * 12) > 0;
    text(ctx, '1%', sx0 + screenW - 27, sy0 + 17, 12, blink ? '#EF4444' : '#FDE047', 'Segoe UI', 'center', null, 0);

    ctx.restore();
  } else {
    // 2) ПОСЛЕ ВЫКЛЮЧЕНИЯ: Схлопывание в белую линию и чёрный экран
    flatBox(ctx, sx0, sy0, screenW, screenH, '#08080A', 4, 2.5, INK);

    if (dtOff < 0.24) {
      // Экран схлопывается в тонкую белую лазерную линию
      const lineH = lerp(screenH, 2, dtOff / 0.24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx0, monY - lineH / 2, screenW, lineH);
    } else {
      // Экран полностью чёрный, диагональный блик
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sx0, sy0, screenW, screenH, 4);
      ctx.clip();
      flatPoly(ctx, [[sx0 + 20, sy0], [sx0 + 60, sy0], [sx0, sy0 + 60]], 'rgba(255,255,255,0.06)', 0);
      ctx.restore();

      // В первые доли секунды мигает предупреждение «0%»
      if (dtOff < 1.1 && Math.sin(dtOff * 18) > 0) {
        flatBox(ctx, monX - 32, monY - 14, 64, 28, '#DC2626', 4, 2, INK);
        text(ctx, '0% ЗАРЯД', monX, monY, 11, '#FFFFFF', 'Segoe UI');
      }
    }
  }
}

// ---------- 6. ЧАСТЬ 1: ПАНОРАМНЫЙ ПРОЛЁТ НАД РУИНАМИ (t < cues.s4_oleg_shot) ----------
function drawS4Flyover(ctx, t, tl) {
  const cues = tl?.cues || { s4_oleg_shot: 144.29 };
  const s4Start = tl?.scenes?.s4?.start ?? 139.49;
  const p = ease(seg(t, s4Start, cues.s4_oleg_shot));

  // Плавный пролёт камеры вдоль разрушенной улицы
  const camX = lerp(340, 720, p);
  const camY = lerp(1100, 1150, p);
  const camZ = lerp(0.94, 1.04, p);

  camera(ctx, camX, camY, camZ, 0);

  drawApocalypticBackdrop(ctx, t, 1270);
  drawRuinedCitySkyline(ctx, 1270);

  // Горящий остов машины слева
  drawBurningCarWreck(ctx, 160, 1270, 1, t);

  // Мародёры дерутся в центре улицы за павербанк и бензин
  const tussle = Math.sin(t * 24) * 20;

  // Мародёр 1 (слева, в армейской каске, рвёт на себя)
  person(ctx, {
    x: 480 + tussle, y: 1390, s: 1.08, seed: 710,
    shirt: '#4B5563', pants: '#1F2937', hat: 'helmet', hatColor: '#374151',
    eyes: 'red', brow: 0.9, mood: 'scream', mouth: 0.85,
    arms: { l: [1.15, 0.35], r: [1.35, 0.2] },
  });

  // Мародёр 2 (справа, в красной кепке/капюшоне, тянет в другую сторону)
  person(ctx, {
    x: 660 - tussle, y: 1390, s: 1.08, flip: -1, seed: 711,
    shirt: '#78350F', pants: '#1C1917', hat: 'cap_cmd', hatColor: '#991B1B',
    eyes: 'red', brow: 0.9, mood: 'scream', mouth: 0.85,
    arms: { l: [1.25, 0.3], r: [1.15, 0.2] },
  });

  // Канистра бензина и гигантский павербанк, зажатые в драке между ними
  drawGasCanister(ctx, 535 + tussle * 0.45, 1260 + Math.abs(tussle) * 0.2, tussle * 0.02, 1.15);
  drawGiantPowerbank(ctx, 605 - tussle * 0.45, 1225 - Math.abs(tussle) * 0.2, -tussle * 0.02, 1.18);

  // Фоновый мародёр на заднем плане убегает вдаль с украденным мешком
  const runP = seg(t, s4Start, cues.s4_oleg_shot);
  const runX = lerp(860, 1180, runP);
  person(ctx, {
    x: runX, y: 1240, s: 0.74, seed: 712, run: t * 16,
    shirt: '#52525B', pants: '#27272A', hat: 'helmet', hatColor: '#52525B',
    eyes: 'wide', mood: 'buckteeth',
    arms: { l: [-0.95, -0.45], r: [0.95, 0.45] },
    holdL: propMoneyBag,
  });

  // Ещё один горящий остов машины справа на обочине
  drawBurningCarWreck(ctx, 1020, 1270, -1, t + 1.2);

  // Рамка переднего плана с обломками и ящиками
  drawForegroundFrame(ctx, 'crates', t);

  // Верхняя жёлтая табличка локации
  drawLocationTag(ctx, 'РУИНЫ ГОРОДА • СУДНЫЙ ДЕНЬ', W / 2, 175, -0.015, '#F87171');
}

// ---------- 7. ЧАСТЬ 2: ОЛЕГ НА КРЫШЕ БОБИКА (cues.s4_oleg_shot <= t < cues.s4_black) ----------
function drawS4OlegShot(ctx, t, tl) {
  const cues = tl?.cues || {
    s4_oleg_shot: 144.29,
    s4_poweroff: 152.5,
    s4_black: 159.92,
  };
  const powerOff = t >= cues.s4_poweroff;

  // Камера: наезд на Олега на бобике, а после отключения монитора — медленный драматичный отъезд назад
  const zoomBack = ease(seg(t, cues.s4_poweroff + 0.8, cues.s4_black - 0.4));
  const camX = 540 + Math.sin(t * 1.2) * 5;
  const camY = lerp(1135, 1060, zoomBack) + Math.cos(t * 1.5) * 4;
  const camZ = lerp(1.10, 0.96, zoomBack);

  camera(ctx, camX, camY, camZ, 0);

  drawApocalypticBackdrop(ctx, t, 1270);
  drawRuinedCitySkyline(ctx, 1270);

  // Горящий остов машины на среднем плане справа
  drawBurningCarWreck(ctx, 960, 1270, -1, t);

  // Мёртвый курьер и открытая розовая коробка GTA VI на асфальте слева
  drawCourierAndGtaBox(ctx, 185, 1315);

  // Перевёрнутый полицейский бобик в центре улицы
  const spin = Math.max(0, 1 - (t - cues.s4_oleg_shot) * 0.12) * ((t - cues.s4_oleg_shot) * 3);
  drawOverturnedPoliceBobik(ctx, 540, 1265, t, spin);

  // Баррикада из автомобильных аккумуляторов 12V АКБ вокруг Олега
  const batteries = [
    { x: 330, y: 1150, lbl: '12V', ah: '60Ah' },
    { x: 405, y: 1140, lbl: '12V', ah: '75Ah' },
    { x: 675, y: 1160, lbl: 'АКБ', ah: '90Ah' },
    { x: 755, y: 1155, lbl: '12V', ah: '75Ah' },
    { x: 715, y: 1085, lbl: '12V', ah: '100Ah' },
  ];
  for (const b of batteries) {
    drawCarBattery(ctx, b.x, b.y, b.lbl, b.ah);
  }

  // Густая СИНЯЯ ИЗОЛЕНТА, перематывающая аккумуляторы в единый мощный блок
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#2563EB';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(310, 1165);
  ctx.lineTo(440, 1175);
  ctx.lineTo(315, 1195);
  ctx.lineTo(445, 1205);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(660, 1105);
  ctx.lineTo(775, 1170);
  ctx.lineTo(665, 1195);
  ctx.lineTo(780, 1140);
  ctx.stroke();
  ctx.restore();

  // Прислонённый к бобику бандитский самодельный обрез из швабры и тостера
  drawMopToasterGun(ctx, 365, 1115, -0.48);

  // Портативный монитор и PS6
  const monX = 665, monY = 970;
  drawMonitorAndRig(ctx, t, tl, monX, monY);

  // ОЛЕГ (32 года) сидит на крыше перевёрнутого бобика перед монитором
  const mash = !powerOff ? Math.sin(t * 32) * 0.12 : 0;
  const oleg1Mouth = mouthOf(tl, 's4_oleg1', t);
  const oleg2Mouth = mouthOf(tl, 's4_oleg2', t);
  const olegMouth = Math.max(oleg1Mouth, oleg2Mouth);

  const dtOff = powerOff ? t - cues.s4_poweroff : 0;
  const smileSlide = ease(seg(t, cues.s4_poweroff, cues.s4_poweroff + 0.65));

  // Мимика: до выключения безумная радость, после — сползающая улыбка, шок и отчаяние
  const olegMood = !powerOff ? 'buckteeth' : (dtOff < 0.35 ? 'neutral' : 'frown');
  const olegBrow = !powerOff ? 0.7 : -0.85;
  const olegEyes = !powerOff ? 'red' : 'wide';
  const olegTilt = lerp(0, -0.18, smileSlide);
  const olegLook = [lerp(0.85, 0.45, smileSlide), lerp(-0.15, -0.45, smileSlide)];

  person(ctx, {
    x: 485, y: 1115, s: 1.05, sit: true, seed: 801,
    shirt: '#E5E1D8', // помятая офисная рубашка
    pants: '#343D46', // тёмные офисные брюки
    tie: '#2563EB',   // синий офисный галстук
    stubble: true,    // лёгкая щетина
    hair: 'messy',    // взъерошенные волосы
    hairColor: '#3B271C',
    eyes: olegEyes,   // красные безумные глаза
    brow: olegBrow,
    mood: olegMood,
    mouth: olegMouth,
    look: olegLook,
    headTilt: olegTilt,
    // Руки держат геймпад и яростно жмут кнопки до выключения
    arms: !powerOff
      ? { l: [0.65 + mash, 0.85], r: [-0.65 - mash, -0.85] }
      : { l: [0.45, 0.65], r: [-0.45, -0.65] },
    holdR: propGamepad,
  });

  // Розовый отсвет экрана на лице Олега (пока монитор включён)
  if (!powerOff) {
    flatOval(ctx, 510, 995, 38, 48, 'rgba(244,114,182,0.28)', 0);
  }

  // Верхняя жёлтая табличка локации
  const tagText = powerOff ? 'РУИНЫ ГОРОДА • 0% ЗАРЯДА' : 'РУИНЫ ГОРОДА • 19 НОЯБРЯ';
  const tagColor = powerOff ? '#EF4444' : '#F59E0B';
  drawLocationTag(ctx, tagText, W / 2, 175, 0.012, tagColor);
}

// ---------- 8. ЧАСТЬ 3: ЧЁРНЫЙ ЭКРАН И ФИНАЛ «ПОТРАЧЕНО» (t >= cues.s4_black) ----------
function drawS4Wasted(ctx, t, tl) {
  const cues = tl?.cues || {
    s4_black: 159.92,
    s4_wasted: 161.92,
  };

  // 1) Резкий переход в чёрный экран
  screen(ctx);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 2) В момент tl.cues.s4_wasted появляется культовая надпись «ПОТРАЧЕНО»
  if (t >= cues.s4_wasted) {
    const dt = t - cues.s4_wasted;

    // Вспышка красного света при ударе печати
    const flash = Math.max(0, 1 - dt / 0.42);
    if (flash > 0) {
      overlay(ctx, '#991B1B', flash * 0.65);
    }

    // Эффект удара/печати с пружинящим отскоком (backOut)
    const pop = backOut(clamp(dt / 0.38));

    screen(ctx);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(pop, pop);

    // Тёмная кинематографичная плашка во всю ширину экрана с кроваво-красным кантом
    flatBox(ctx, -W / 2 - 20, -200, W + 40, 400, 'rgba(16, 12, 18, 0.95)', 0, 5, '#B91C1C');

    // Маленькая жёлтая плашка сверху: [СУДНЫЙ ДЕНЬ • ВЕРСИЯ 1.0]
    flatBox(ctx, -270, -162, 540, 56, '#F6C93E', 7, 4, INK);
    flatBox(ctx, -263, -155, 526, 42, null, 4, 2, INK);
    text(ctx, 'СУДНЫЙ ДЕНЬ • ВЕРСИЯ 1.0', 0, -133, 26, '#181410', 'Segoe UI', 'center', null, 0);

    // Культовая красная надпись в стиле GTA с толстой чёрной обводкой: ПОТРАЧЕНО
    text(ctx, 'ПОТРАЧЕНО', 0, -22, 126, '#E11D48', 'Segoe UI', 'center', '#000000', 18);

    // Английский культовый оригинал: WASTED
    text(ctx, 'WASTED', 0, 72, 52, '#FFFFFF', 'Segoe UI', 'center', '#000000', 10);

    // Маленькая ироничная подпись снизу
    text(ctx, '19 НОЯБРЯ • РЕЛИЗ GTA VI СОСТОЯЛСЯ', 0, 142, 22, '#9CA3AF', 'Segoe UI');

    ctx.restore();
  }
}

// ---------- ГЛАВНАЯ ЭКСПОРТИРУЕМАЯ ФУНКЦИЯ ДЛЯ СЦЕНЫ 4 SHORTS ----------
export function drawScene4Shorts(ctx, t, tl) {
  const cues = tl?.cues || {
    s4_oleg_shot: 144.29,
    s4_poweroff: 152.5,
    s4_black: 159.92,
    s4_wasted: 161.92,
  };

  if (t >= cues.s4_black) {
    drawS4Wasted(ctx, t, tl);
  } else if (t < cues.s4_oleg_shot) {
    drawS4Flyover(ctx, t, tl);
  } else {
    drawS4OlegShot(ctx, t, tl);
  }
}
