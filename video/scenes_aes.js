/* «Как работают атомные электростанции» — раскадровка по таймингам озвучки (voiceover_aes_timings.json). */
(function () {
  const { R, S, C, clamp } = E, K = window.K, A = window.KA, el = E.el, ink = C.ink;
  const P = (x, y, s = 1, r = 0) => `translate(${x},${y}) scale(${s})${r ? ` rotate(${r})` : ''}`;
  const ST = [0, 16.26, 47.33, 79.56, 114.54, 147.62, 172.3], END = 202.0, INTRO = 2.8, OUTRO = 3.2;
  const lerp = (a, b, p) => a + (b - a) * p;
  const jit = (x, y, lt, k = 2, f = 37) => `translate(${x + Math.sin(lt * f) * k},${y + Math.cos(lt * (f + 4)) * k})`;

  /* летящий нейтрон */
  function fly(sc, at, end, [x0, y0], [x1, y1], r = 18) {
    let g;
    sc.anim(at, end, gg => { g = A.neutronBuild(gg, r); }, lt => { const p = clamp(lt / (end - at)); g.setAttribute('transform', `translate(${lerp(x0, x1, p)},${lerp(y0, y1, p)}) rotate(${lt * 300})`); });
  }
  /* атом разваливается на две половинки */
  function split(sc, at, x, y, r, dx = 0) {
    let a, b;
    sc.anim(at, at + 3.2, g => { a = el('g', {}, g); b = el('g', {}, g); E.addShape(a, A.halfAtom(r, true)); E.addShape(b, A.halfAtom(r, false)); },
      lt => { const p = E.ease(clamp(lt / 1.2)); a.setAttribute('transform', `translate(${x + dx * p},${y - p * r * 1.3}) rotate(${-p * 25})`); b.setAttribute('transform', `translate(${x + dx * p},${y + p * r * 1.3}) rotate(${p * 25})`); a.setAttribute('opacity', clamp((3.2 - lt) / 0.9)); b.setAttribute('opacity', clamp((3.2 - lt) / 0.9)); });
  }

  function burst(sc, at, x, y, k) {
    sc.anim(at, at + 1.0, g => { E.addShape(g, A.flash()); }, (lt, g) => { g.setAttribute('transform', `translate(${x},${y}) scale(${k * E.spring(lt / 0.35)})`); g.setAttribute('opacity', clamp((1.0 - lt) / 0.4)); });
  }

  /* ======== СЦЕНА 1: зацепка «АЭС как чайник» ======== */
  (function () {
    const s = E.scene(ST[0], ST[1], 'sponge');
    s.txt('КАК РАБОТАЕТ АЭС?', 0.2, 1.8, 960, 110, 84, C.red, { anchor: 'middle' });
    const px = 400, py = 960;
    s.d(A.ground(60, 820), 0.4, 0.5, P(px, py));
    s.d(A.tower(230, 340), 0.8, 1.6, P(px - 230, py));
    s.d(A.tower(230, 340), 2.4, 1.6, P(px + 10, py));
    s.d(A.reactorBuilding(), 4.0, 1.4, P(px + 250, py));
    A.steamEl(s, 3.2, 1e9, px - 230, py - 345, 3, 30, 230);
    A.steamEl(s, 3.4, 1e9, px + 10, py - 345, 3, 30, 230);
    const k = s.d(A.kettle(), 5.2, 3.0, P(1470, py, 1.3));
    k.dyn = lt => `translate(${1470 + Math.sin(lt * 27) * 2},${py + Math.abs(Math.sin(lt * 13)) * -3}) scale(1.3) rotate(${Math.sin(lt * 31) * 1.1})`;
    A.steamEl(s, 8.2, 1e9, 1470 - 216 * 1.3, py - 262 * 1.3, 3, 14, 200, '#E6A15B', 6);
    s.sfx('boil', 6.2); s.sfx('steam', 8.2);
    s.bub('Слушай, а ты точно не мой старший брат?', 9.2, 1330, 290, 1430, 640, { maxW: 470 });
    s.bub('Тихо, не пали контору!', 11.4, 560, 300, 640, 735, { maxW: 380 });
  })();

  /* ======== СЦЕНА 2: «Кипятим воду» ======== */
  (function () {
    const s = E.scene(ST[1], ST[2], 'sponge');
    const y = 860;
    s.txt('ЛЮБАЯ ЭЛЕКТРОСТАНЦИЯ — ОДИН СЦЕНАРИЙ', 0.3, 3.2, 960, 110, 66, C.blue, { anchor: 'middle' });
    // 1 уголь / костёр
    s.d(A.coal(), 1.6, 1.8, P(190, y, 1.2));
    const fl = s.d(A.flames(), 3.2, 1.2, P(190, y, 1.2));
    fl.dyn = lt => `translate(190,${y}) scale(1.2,${1.2 + Math.sin(lt * 9) * 0.07})`;
    s.txt('УГОЛЬ / ГАЗ', 4.6, 1.0, 190, 925, 40, C.ink, { anchor: 'middle' });
    s.sfx('fire', 3.2);
    // 2 котёл
    s.d(A.boiler(), 9.4, 2.0, P(560, y));
    s.txt('КОТЁЛ', 11.2, 0.8, 560, 925, 40, C.ink, { anchor: 'middle' });
    A.steamEl(s, 11.6, 1e9, 560 + 85, y - 215, 3, 20, 150, '#E6A15B', 6);
    s.d(K.mark('arrow', 320, 740, 1.0), 8.6, 0.7);
    s.d(A.steamArrows(), 12.0, 1.4, P(740, y - 20, 0.9));
    s.sfx('steam', 12.0);
    // 3 турбина
    s.d(A.turbineCase(), 14.6, 1.6, P(970, y));
    const bl = s.d(A.blades(78, 6), 15.8, 1.2, P(970, y - 110));
    bl.dyn = lt => `translate(970,${y - 110}) rotate(${lt * 230})`;
    s.txt('ТУРБИНА', 16.0, 0.8, 970, 925, 40, C.ink, { anchor: 'middle' });
    s.sfx('turbine', 15.8);
    s.bub('Давай, крутись, человеку срочно нужно посмотреть мемы!', 15.4, 770, 360, 790, 700, { maxW: 480, fs: 40 });
    // 4 генератор
    s.d(A.generator(), 18.0, 1.6, P(1360, y));
    const bo = s.d(A.bolt(0.8), 19.2, 0.6, P(1360, y - 70));
    bo.dyn = lt => ({ tf: P(1360, y - 70), op: Math.sin(lt * 14) > -0.2 ? 1 : 0.15 });
    s.txt('ГЕНЕРАТОР', 19.4, 0.9, 1360, 925, 40, C.ink, { anchor: 'middle' });
    s.sfx('zap', 19.2);
    // 5 смартфон в розетке
    s.d(A.phone(), 20.3, 1.2, P(1730, y - 20));
    s.d(A.socket(), 21.0, 0.7, P(1850, y - 360, 0.8));
    s.d(R.curve([[1735, 612], [1765, 570], [1830, 545], [1850, 520]], { w: 5 }), 21.5, 0.6);
    s.txt('ТЕЛЕФОН', 21.4, 0.9, 1730, 925, 40, C.ink, { anchor: 'middle' });
    let bat;
    s.anim(20.6, 1e9, g => { bat = el('rect', { x: 1696, y: y - 20 - 144, width: 0, height: 28, fill: C.green, stroke: 'none' }, g); },
      lt => { bat.setAttribute('width', 64 * clamp(lt / 7)); });
    s.d(R.line(1160, y - 110, 1215, y - 80, { w: 6 }), 17.8, 0.4);
    s.d(K.mark('arrow', 1530, 760, 1.0), 20.0, 0.6);
    // разница: уголь/газ vs атом
    s.txt('ЧЕМ ГРЕЕМ ВОДУ?', 21.9, 1.4, 190, 360, 42, C.orange, { anchor: 'middle' });
    s.d(K.mark('cross', 190, 730, 2.4), 26.0, 0.6);
    s.d(A.atomIcon(55), 27.2, 1.2, P(190, 470));
    s.txt('АТОМ!', 28.2, 0.8, 190, 570, 44, C.blue, { anchor: 'middle' });
  })();

  /* ======== СЦЕНА 3: внутри реактора ======== */
  (function () {
    const s = E.scene(ST[2], ST[3], 'sponge');
    const bx = 800, by = 560, br = 130, tc = 12.4;
    s.txt('ВНУТРИ РЕАКТОРА', 0.2, 1.8, 960, 100, 70, C.red, { anchor: 'middle' });
    const body = s.d(A.atom(br), 0.5, 2.4, P(bx, by));
    body.dyn = lt => ({ tf: jit(bx, by, lt, 2.5), op: lt + 0.5 >= tc ? 0 : 1 });
    const face = s.d(A.atomFace(br, 'big'), 2.9, 0.7, P(bx, by));
    face.dyn = lt => ({ tf: jit(bx, by, lt, 2.5), op: lt + 2.9 >= tc ? 0 : 1 });
    s.txt('U-235', 3.5, 1.0, 540, 480, 72, C.ink, { anchor: 'middle' });
    // группа атомов справа
    const pos = [[1200, 560], [1330, 420], [1330, 700], [1470, 560], [1600, 420], [1600, 700], [1740, 560]];
    const hit = [21.0, 21.0, 21.0, 23.4, 23.4, 23.4, 25.4], scared = 19.0, r = 55;
    pos.forEach(([x, y], i) => {
      const t0 = 5.6 + i * 0.5;
      const b = s.d(A.atom(r), t0, 0.5, P(x, y)); b.dyn = lt => ({ tf: jit(x, y, lt + i, 1.8, 29 + i), op: lt + t0 >= hit[i] ? 0 : 1 });
      const calm = s.d(A.atomFace(r, 'big'), t0 + 0.2, 0.3, P(x, y)); calm.dyn = lt => ({ tf: jit(x, y, lt + i, 1.8, 29 + i), op: (lt + t0 + 0.2 >= scared) ? 0 : 1 });
      const sc2 = s.d(A.atomFace(r, 'scared'), scared, 0.01, P(x, y)); sc2.dyn = lt => ({ tf: jit(x, y, lt + i, 2.6, 33 + i), op: lt + scared >= hit[i] ? 0 : 1 });
      split(s, hit[i], x, y, r, (i % 2 ? 30 : -30));
      burst(s, hit[i], x, y, 0.55);
      s.sfx('boom', hit[i], 0.8);
    });
    // нейтрон-вопрос
    fly(s, 10.0, tc, [110, 560], [bx - br - 14, by], 20);
    s.bub('Извините, я только спросить!', 10.1, 330, 250, 190, 530, { maxW: 380 });
    // столкновение
    split(s, tc, bx, by, br, 0);
    burst(s, tc, bx, by, 1.15);
    s.sfx('boom', tc);
    s.txt('ТЕПЛО!', 12.7, 1.0, 520, 720, 86, C.orange, { anchor: 'middle', rot: -6 });
    // 3 нейтрона вправо
    [[1200, 560], [1330, 420], [1330, 700]].forEach((to, i) => fly(s, 18.0, 21.0, [bx, by], [to[0] - 60, to[1]], 18));
    [[1470, 560], [1600, 420], [1600, 700]].forEach((to, i) => fly(s, 21.0, 23.4, [[1200, 560], [1330, 420], [1330, 700]][i], [to[0] - 55, to[1]], 16));
    fly(s, 23.4, 25.4, [1470, 560], [1685, 560], 16);
    s.bub('Ребята, расходимся!', 22.2, 1480, 215, 1450, 470, { maxW: 380 });
    s.txt('тепло кипятит воду!', 29.0, 1.6, 960, 935, 56, C.orange, { anchor: 'middle' });
    A.steamEl(s, 29.4, 1e9, 960 + 280, 920, 2, 12, 130, '#E6A15B', 6);
  })();

  /* ======== СЦЕНА 4: почему не взрывается ======== */
  (function () {
    const s = E.scene(ST[3], ST[4], 'sponge');
    s.txt('ПОЧЕМУ АЭС НЕ ВЗРЫВАЕТСЯ?', 0.3, 3.4, 960, 90, 62, C.red, { anchor: 'middle' });
    s.d(A.bomb(), 3.6, 3.4, P(380, 545));
    s.txt('ПРИЧИНА №1: ТОПЛИВО', 9.6, 1.3, 960, 180, 48, C.green, { anchor: 'middle' });
    s.d(A.pellet(), 8.0, 1.8, P(1380, 545, 1.3));
    A.mugSteam(s, 10.0, 1e9, 1380 + 98 * 1.3, 545 - 88 * 1.3);
    s.txt('90%+ U-235', 10.9, 1.4, 380, 605, 50, C.red, { anchor: 'middle' });
    s.txt('3–5% U-235', 14.0, 1.4, 1380, 605, 50, C.green, { anchor: 'middle' });
    s.bub('Ты тоже ядерная?!', 11.6, 780, 340, 540, 420, { maxW: 340 });
    s.bub('Да, я просто воду грею', 14.9, 1650, 220, 1440, 370, { maxW: 340 });
    // мокрые дрова
    s.d(S(R.rect(-70, -26, 140, 26, { w: 4, fill: C.brown, gap: 7, fw: 2.5 }), R.rect(-100, -52, 100, 26, { w: 4, fill: C.brown, gap: 7, fw: 2.5 }), R.rect(0, -52, 100, 26, { w: 4, fill: C.brown, gap: 7, fw: 2.5 }),
      R.circ(-60, -90, 14, { c: C.blue, w: 3, fill: C.blue, fs: 'solid' }), R.circ(0, -110, 14, { c: C.blue, w: 3, fill: C.blue, fs: 'solid' }), R.circ(60, -88, 14, { c: C.blue, w: 3, fill: C.blue, fs: 'solid' })), 17.2, 2.0, P(880, 545));
    s.txt('как мокрые дрова', 19.4, 1.4, 880, 600, 42, C.blue, { anchor: 'middle' });
    // ПРИЧИНА 2: стержни
    s.txt('ПРИЧИНА №2: «ТОРМОЗА»', 23.0, 1.4, 300, 680, 46, C.green, { anchor: 'middle' });
    const bx0 = 500, bw = 920, by0 = 715, bh = 320;
    s.d(A.reactorBox(bw, bh), 23.6, 1.6, P(bx0, by0));
    // нейтроны: хаотично
    const N = 18, rng = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
    const refl = (x, a, b) => { const span = b - a; let u = (x - a) % (2 * span); if (u < 0) u += 2 * span; return a + (u > span ? 2 * span - u : u); };
    const dots = [];
    s.anim(24.6, 1e9, g => { for (let i = 0; i < N; i++) dots.push(el('circle', { r: 11, fill: C.red, stroke: '#9E1C27', 'stroke-width': 2 }, g)); },
      lt => {
        const ta = 28.6 - 24.6, tb = 32.4 - 24.6;
        const tau = lt < ta ? lt : lt < tb ? ta + (lt - ta) - 0.75 * (lt - ta) * (lt - ta) / (2 * (tb - ta)) : ta + (tb - ta) * 0.625 + (lt - tb) * 0.25;
        dots.forEach((d, i) => {
          const x0 = bx0 + 30 + rng(i, 1) * (bw - 60), y0 = by0 + 30 + rng(i, 2) * (bh - 60), vx = (rng(i, 3) - .5) * 520, vy = (rng(i, 4) - .5) * 520;
          const abs = ta + 0.6 + rng(i, 5) * (tb + 1.5 - ta);
          d.setAttribute('cx', refl(x0 + vx * tau, bx0 + 14, bx0 + bw - 14)); d.setAttribute('cy', refl(y0 + vy * tau, by0 + 14, by0 + bh - 14));
          d.setAttribute('opacity', (i % 2 === 0 && lt > abs) ? 0 : 1);
        });
      });
    // стержни
    [650, 850, 1050, 1250].forEach((x, i) => {
      const t0 = 25.4 + i * 0.3;
      const rod = s.d(A.rod(110), t0, 0.6, P(x, by0));
      rod.dyn = lt => { const p = E.ease(clamp((lt + t0 - 28.4) / 3.2)); return P(x, by0 + p * 205); };
    });
    s.sfx('clunk', 29.0); s.sfx('clunk', 30.2, 0.8);
    s.txt('стержни из бора / кадмия', 25.6, 1.8, 1690, 800, 36, C.ink, { anchor: 'middle' });
    s.d(R.lin([[1496, 800], [1440, 790], [1290, 765]], { w: 4 }), 27.2, 0.5);
    s.bub('Спокойно, граждане, не толпимся!', 28.6, 270, 830, 640, 790, { maxW: 380, fs: 40 });
  })();

  /* ======== СЦЕНА 5: контуры и миф про трубы ======== */
  (function () {
    const s = E.scene(ST[4], ST[5], 'sponge');
    s.txt('ТРИ НЕЗАВИСИМЫХ КОНТУРА', 0.2, 2.2, 960, 90, 62, C.ink, { anchor: 'middle' });
    const loops = [[80, 360, 520, 430, C.red, '1-й контур: РЕАКТОР', 340], [600, 360, 520, 430, C.blue, '2-й контур: ПАР → ТУРБИНА', 860], [1120, 360, 380, 430, C.green, '3-й контур: ОХЛАЖДЕНИЕ', 1310]];
    const dashes = [];
    loops.forEach(([x, y, w, h, c, label, lx], i) => {
      const t0 = 0.6 + i * 1.9;
      s.d(R.rect(x, y, w, h, { c, w: 6 }), t0, 1.3);
      s.txt(label, t0 + 0.2, 1.2, lx, 335, 36, c, { anchor: 'middle' });
      s.anim(t0 + 1.4, 1e9, g => { const r = el('rect', { x, y, width: w, height: h, rx: 14, fill: 'none', stroke: c, 'stroke-width': 9, 'stroke-dasharray': '22 20', 'stroke-linecap': 'round', opacity: .85 }, g); dashes.push(r); },
        lt => { dashes[i].setAttribute('stroke-dashoffset', -lt * 70 * (i === 1 ? -1 : 1)); });
    });
    s.d(A.reactorVessel(), 7.0, 1.6, P(230, 790));
    s.txt('реактор', 8.4, 0.8, 230, 840, 34, C.red, { anchor: 'middle' });
    s.d(R.line(600, 400, 600, 750, { c: ink, w: 11, r: .5 }), 9.2, 0.8);
    s.d(A.coil(200), 9.8, 1.2, P(600, 470));
    s.txt('СТЕНКА — БЕЗ СМЕШИВАНИЯ!', 10.8, 1.8, 600, 905, 38, C.red, { anchor: 'middle' });
    s.d(A.turbineCase(), 12.6, 1.4, P(860, 700, 0.85));
    const tb = s.d(A.blades(66, 6), 13.8, 1.0, P(860, 606)); tb.dyn = lt => `translate(860,606) rotate(${lt * 260})`;
    s.txt('турбина', 14.0, 0.8, 860, 840, 34, C.blue, { anchor: 'middle' });
    s.d(R.line(1120, 400, 1120, 750, { c: ink, w: 11, r: .5 }), 14.8, 0.6);
    s.d(A.coil(200), 15.2, 1.0, P(1120, 470));
    // градирня
    s.d(R.line(1500, 560, 1620, 560, { c: C.green, w: 7 }), 17.6, 0.5);
    s.d(A.tower(230, 340), 18.2, 2.4, P(1720, 790));
    s.txt('градирня', 20.4, 0.8, 1720, 840, 34, C.green, { anchor: 'middle' });
    A.steamEl(s, 21.0, 1e9, 1720, 790 - 345, 3, 28, 140);
    // облачко
    const cl = s.d(A.cloud(), 22.6, 1.5, P(1700, 300));
    cl.dyn = lt => `translate(${1700 + Math.sin(lt * 1.6) * 18},${300 + Math.sin(lt * 2.1) * 10})`;
    s.txt('H2O (просто пар)', 24.2, 1.4, 1700, 140, 40, C.blue, { anchor: 'middle' });
    s.txt('СПОЙЛЕР: НЕТ!', 26.2, 1.0, 960, 975, 64, C.red, { anchor: 'middle', rot: -3 });
    s.bub('Я вообще-то просто пар, хватит на меня так смотреть!', 27.2, 1150, 190, 1600, 290, { maxW: 520, fs: 40 });
    s.sfx('steam', 21.0);
  })();

  /* ======== СЦЕНА 6: масштаб в цифрах ======== */
  (function () {
    const s = E.scene(ST[5], ST[6], 'sponge');
    s.d(A.pelletTiny(), 0.4, 1.0, P(250, 500, 1.9));
    s.txt('5 г урана', 1.6, 1.0, 250, 580, 46, C.ink, { anchor: 'middle' });
    s.bub('Да, я маленькая, но зато какая эффективная!', 2.4, 340, 230, 260, 410, { maxW: 420, fs: 38 });
    s.txt('ВСЁ ДЕЛО В ПЛОТНОСТИ ЭНЕРГИИ', 4.4, 2.0, 1100, 90, 56, C.red, { anchor: 'middle' });
    s.txt('=', 5.6, 0.8, 620, 470, 250, C.ink, { anchor: 'middle' });
    s.show(A.coal(), 7.0, { tf: P(950, 520, 1.25), origin: [950, 460], pop: 0.5 });
    s.txt('400 кг угля', 7.8, 1.2, 950, 590, 40, C.ink, { anchor: 'middle' });
    [1260, 1350, 1440].forEach((x, i) => s.show(A.barrel(), 9.8 + i * 0.5, { tf: P(x, 520, 1.1), origin: [x, 470], pop: 0.45 }));
    s.txt('350 кг нефти', 11.4, 1.2, 1350, 590, 40, C.ink, { anchor: 'middle' });
    s.show(A.gasTank(), 13.4, { tf: P(1700, 520, 1.3), origin: [1700, 400], pop: 0.5 });
    s.txt('360 м³ газа', 14.4, 1.2, 1700, 590, 40, C.ink, { anchor: 'middle' });
    s.d(R.rect(160, 650, 1600, 380, { c: C.green, w: 7 }), 17.2, 1.0);
    s.txt('ПЛЮСЫ АЭС', 17.6, 1.0, 960, 722, 58, C.green, { anchor: 'middle' });
    ['24/7 без ветра и солнца', 'минимум территории', 'ноль выбросов CO2 при работе'].forEach((t, i) => {
      const t0 = 18.0 + i * 1.5;
      s.d(K.mark('check', 270, 810 + i * 78 - 10, 0.8), t0, 0.35);
      s.txt(t, t0 + 0.1, 1.2, 340, 820 + i * 78, 50, C.ink);
      s.sfx('ding', t0 + 0.4, 0.7);
    });
  })();

  /* ======== СЦЕНА 7: финал ======== */
  (function () {
    const s = E.scene(ST[6], END, 'sponge');
    s.d(A.stickman(), 0.3, 2.6, P(380, 985, 1.5));
    s.d(A.wallSwitch(), 2.9, 0.9, P(590, 760));
    s.d(A.bulb(), 3.6, 1.4, P(400, 330));
    const lit = s.anim(5.6, 1e9, g => { E.addShape(g, A.bulbLit()); E.addShape(g, A.rays()); g.setAttribute('transform', P(400, 330)); }, (lt, g) => g.setAttribute('opacity', 0.82 + Math.sin(lt * 9) * 0.18));
    s.sfx('bulb', 5.6);
    s.txt('ЕСТЬ И ВЫЗОВЫ:', 3.2, 1.3, 860, 150, 52, C.orange, { anchor: 'middle' });
    s.txt('— дорого строить', 4.6, 1.2, 640, 250, 44, C.ink);
    s.txt('— куда девать отходы', 6.6, 1.3, 640, 320, 44, C.ink);
    s.txt('— но их уже умеют перерабатывать!', 10.2, 2.0, 640, 390, 44, C.green);
    s.d(A.towerKettle(), 14.4, 4.0, P(1470, 985, 1.2));
    A.steamEl(s, 18.6, 1e9, 1470, 985 - 440, 3, 22, 160);
    s.txt('САМЫЙ ЧИСТЫЙ «ЧАЙНИК»', 19.0, 2.4, 960, 1050, 44, C.ink, { anchor: 'middle' });
    s.bub('Обращайтесь!', 22.6, 1520, 330, 1480, 500, { maxW: 360, fs: 48 });
    s.txt('ПОДПИШИСЬ!', 22.4, 1.6, 905, 760, 104, C.red, { anchor: 'middle', rot: -5 });
    s.txt('и заряжайся знаниями', 24.2, 1.5, 905, 850, 48, C.blue, { anchor: 'middle' });
  })();

  /* ---- Заставка канала и финальная плашка ---- */
  const brand = (sc, top) => {
    sc.d(R.circ(960, 400, 520, { c: C.blue, w: 8, r: 1.6 }), 0.1, 0.9);
    sc.img('assets/logo.png', 0.15, 960, 400, 470);
    sc.txt('Pushckin AI mult', 0.9, 1.1, 960, 780, 130, C.ink, { anchor: 'middle' });
    sc.txt('@Pushckin_Ai', 2.0, 0.7, 960, 880, 60, C.blue, { anchor: 'middle' });
    if (top) sc.txt(top, 1.0, 1.4, 960, 1010, 54, C.red, { anchor: 'middle', rot: -2 });
    sc.sfx('logo', 0.1);
  };
  brand(E.scene(-INTRO, 0, 'fade'), null);
  brand(E.scene(END, END + OUTRO, 'fade'), 'Подписывайся и жди новые мультики!');
  window.TOTAL_DUR = INTRO + END + OUTRO; window.INTRO = INTRO;
})();
