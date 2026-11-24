/* СЦЕНА 5. ПРИЧИНА №4 — «Вскрытие на столе у пиратов» (35 ном. сек) */
(function () {
  const { R, S, C, clamp, el } = E, { P } = G, K = window.K, ink = C.ink;
  const s = G.mk(4);
  const k = s.k;
  const lerp = G.lerp;
  const solid = (c, w = 4, o = {}) => Object.assign({ c: ink, w, fill: c, fs: 'solid', r: 0.8 }, o);
  const hach = (c, gap = 6, fw = 2.5, w = 4, o = {}) => Object.assign({ c: ink, w, fill: c, gap, fw }, o);
  const dot = (x, y, d = 9) => R.circ(x, y, d, { c: ink, w: 2, fill: ink, fs: 'solid', r: 0.4 });

  /* ---------------- заголовок ---------------- */
  s.txt('ПРИЧИНА №4: ОТКРЫТАЯ СИСТЕМА', 0.2, 2.6, 960, 118, 74, C.red, { anchor: 'middle' });
  s.d(R.curve([[330, 140], [640, 150], [960, 142], [1300, 150], [1600, 141]], { c: C.red, w: 5, r: 0.8 }), 2.8, 0.6);

  /* ---------------- ПРАВАЯ ПОЛОВИНА: операционный стол ---------------- */
  const TX = 1450; // центр монитора
  // стол
  s.d(S(R.rect(1170, 820, 540, 30, hach(C.brown, 6, 2.5, 5)),
    R.rect(1200, 850, 24, 112, solid('#C9CDD3', 4)), R.rect(1656, 850, 24, 112, solid('#C9CDD3', 4)),
    R.line(1212, 905, 1668, 905, { c: ink, w: 3, r: 0.6 })), 3.0, 1.4);
  // красный крест на столе (медицина)
  s.d(S(R.rect(1432, 922, 36, 12, solid(C.red, 2)), R.rect(1444, 910, 12, 36, solid(C.red, 2))), 4.3, 0.4);
  // монитор лежит на боку (подставка торчит вправо)
  s.d(S(R.rect(1240, 570, 420, 240, solid('#F2F3F5', 5)),
    R.rect(1262, 592, 376, 170, solid(C.ltblue, 4)),
    R.poly([[1660, 650], [1712, 636], [1712, 744], [1660, 730]], solid('#D9DCE1', 4)),
    R.ell(1716, 690, 26, 132, solid('#D9DCE1', 4)),
    R.circ(1450, 785, 14, solid(C.green, 2))), 4.2, 1.7);
  s.txt('GTA 6', 5.6, 0.6, 1450, 650, 50, C.ink, { anchor: 'middle' });
  // бирка «Пациент»
  s.txt('Пациент: ПК', 5.9, 0.9, 1450, 895, 38, C.blue, { anchor: 'middle' });
  // лампа над столом
  s.d(S(R.line(1520, 146, 1520, 206, { c: ink, w: 4, r: 0.4 }),
    R.poly([[1450, 276], [1590, 276], [1556, 206], [1484, 206]], hach(C.yellow, 5, 3, 4)),
    R.ell(1520, 278, 100, 20, solid(C.yellow, 3))), 6.0, 1.0);
  const rays = s.d(S(R.line(1470, 292, 1360, 560, { c: C.yellow, w: 4, r: 1 }), R.line(1520, 295, 1500, 560, { c: C.yellow, w: 4, r: 1 }),
    R.line(1570, 292, 1650, 560, { c: C.yellow, w: 4, r: 1 })), 7.0, 0.8);
  rays.dyn = lt => ({ op: lt < 0.8 * k ? 1 : (0.55 + 0.45 * Math.abs(Math.sin(lt * 5.3)) * (Math.sin(lt * 1.7) > 0.93 ? 0.3 : 1)) });

  /* ---------------- ЛЕВАЯ ПОЛОВИНА: бетонный бункер ---------------- */
  // крыша + корпус
  s.d(S(R.rect(80, 400, 770, 550, hach('#A9AEB6', 9, 2.5, 6, { r: 1.4 })),
    R.poly([[60, 405], [870, 405], [836, 352], [96, 352]], hach('#7C828C', 6, 3, 6))), 6.8, 2.4);
  // трещины, заклёпки
  s.d(S(R.lin([[110, 460], [140, 500], [122, 540], [158, 590]], { c: ink, w: 3, r: 0.8 }),
    R.lin([[800, 880], [770, 850], [785, 810], [752, 770]], { c: ink, w: 3, r: 0.8 }),
    ...[[104, 430], [826, 430], [104, 920], [826, 920]].map(([x, y]) => R.circ(x, y, 12, solid('#7C828C', 3)))), 8.8, 0.8);
  // окошко-амбразура с консолью
  s.d(R.rect(230, 470, 470, 300, { c: ink, w: 7, fill: '#FFFFFF', fs: 'solid', r: 1.2 }), 9.0, 0.9);
  s.txt('КОНСОЛЬ', 9.8, 0.7, 465, 520, 36, C.blue, { anchor: 'middle' });
  // консоль (белая стойка с лицом) + геймпад
  const consoleShape = S(R.ell(0, -6, 90, 18, solid('#DADDE2', 3)),
    R.rect(-36, -186, 72, 180, solid('#FFFFFF', 5)),
    R.curve([[-36, -186], [-48, -100], [-36, -6]], { c: C.blue, w: 6, r: 0.6 }),
    R.curve([[36, -186], [48, -100], [36, -6]], { c: C.blue, w: 6, r: 0.6 }),
    R.line(-36, -168, 36, -168, { c: ink, w: 3, r: 0.4 }), R.circ(0, -22, 10, solid(C.green, 2)),
    K.face(0, -112, 28, 'cool'));
  const cn = s.d(consoleShape, 10.2, 1.0, P(380, 770));
  cn.dyn = lt => `translate(380,770) scale(1,${1 + Math.sin(lt * 2.2) * 0.008})`;
  s.d(S(R.ell(0, -18, 84, 38, solid('#EEF0F3', 4)), R.circ(-20, -22, 11, solid(C.blue, 2)), R.circ(20, -22, 11, solid(C.red, 2)), R.line(0, -34, 0, -10, { c: ink, w: 3, r: 0.4 })),
    10.8, 0.6, P(520, 770));
  // колючая проволока
  const wirePts = a => { const pts = []; for (let x = 100; x <= 830; x += 30) pts.push([x, a + Math.sin(x / 38) * 9]); return pts; };
  const barbs = a => { const out = []; for (let x = 130; x <= 810; x += 55) { const y = a + Math.sin(x / 38) * 9; out.push(R.line(x - 11, y - 11, x + 11, y + 11, { c: ink, w: 3, r: 0.3 }), R.line(x + 11, y - 11, x - 11, y + 11, { c: ink, w: 3, r: 0.3 })); } return out; };
  s.d(S(R.line(120, 352, 120, 262, { c: ink, w: 6, r: 0.5 }), R.line(465, 352, 465, 262, { c: ink, w: 6, r: 0.5 }), R.line(810, 352, 810, 262, { c: ink, w: 6, r: 0.5 }),
    R.curve(wirePts(300), { c: C.gray, w: 5, r: 0.5 }), R.curve(wirePts(268), { c: C.gray, w: 5, r: 0.5 }), ...barbs(300), ...barbs(268)), 10.7, 1.6);
  // цепи
  const chainL = [], chainR = [];
  for (let i = 0; i < 7; i++) {
    const a = i % 2 === 0;
    const xl = 120 + i * 41, xr = 560 + i * 41;
    chainL.push(a ? R.ell(xl, 870, 46, 24, { c: ink, w: 4, r: 0.6 }) : R.ell(xl, 870, 26, 40, { c: ink, w: 4, r: 0.6 }));
    chainR.push(a ? R.ell(xr, 870, 46, 24, { c: ink, w: 4, r: 0.6 }) : R.ell(xr, 870, 26, 40, { c: ink, w: 4, r: 0.6 }));
  }
  s.d(S(...chainL, ...chainR), 11.4, 1.0);
  // огромный замок
  s.d(S(R.curve([[418, 810], [412, 730], [468, 706], [518, 730], [512, 810]], { c: '#6B717B', w: 20, r: 0.5 }),
    R.rect(390, 800, 150, 140, hach(C.yellow, 5, 3.5, 6)),
    R.circ(465, 855, 30, solid(ink, 3)), R.poly([[455, 862], [475, 862], [482, 906], [448, 906]], solid(ink, 3))), 12.0, 1.4);
  s.sfx('clunk', 13.3);
  s.txt('Закрытая система', 13.6, 1.4, 465, 1006, 56, C.ink, { anchor: 'middle' });
  s.d(R.curve([[190, 1020], [330, 1026], [470, 1020], [610, 1027], [740, 1021]], { c: C.red, w: 5, r: 0.8 }), 15.0, 0.5);

  /* ---------------- кнопка «Скачать» на мониторе ---------------- */
  s.d(R.rect(1366, 672, 168, 56, solid(C.green, 4)), 14.6, 0.5);
  s.txt('Скачать', 15.0, 0.6, 1450, 712, 40, C.white, { anchor: 'middle' });
  // курсор-стрелка, нажатие
  s.anim(15.4, 1e9, g => { E.addShape(g, R.poly([[0, 0], [0, 38], [10, 29], [20, 46], [29, 42], [19, 26], [32, 26]], solid(C.white, 3, { r: 0.4 }))); },
    (lt, g) => {
      const p = clamp(lt / (0.8 * k)), press = lt > 0.9 * k && lt < 1.1 * k ? 4 : 0;
      g.setAttribute('transform', `translate(${lerp(1600, 1470, E.ease(p)) + press},${lerp(620, 702, E.ease(p)) + press})`);
    });
  s.sfx('ding', 16.4);
  // прогресс-бар загрузки
  s.anim(16.5, 1e9, g => {
    E.addShape(g, R.rect(1290, 744, 320, 14, { c: ink, w: 3, fill: '#fff', fs: 'solid', r: 0.5 }));
    g._r = el('rect', { x: 1292, y: 746, width: 0, height: 10, fill: C.green }, g);
  }, (lt, g) => { g._r.setAttribute('width', 316 * clamp(lt / (2.2 * k))); });

  /* ---------------- ПИРАТЫ ---------------- */
  function pirateBody(o) {
    const w = o.fat ? 1.18 : 1, c = o.band;
    const stripes = [];
    for (let i = 0; i < 5; i++) { const y = -240 + i * 24; stripes.push(R.line(-46 * w, y, 46 * w, y, { c: C.red, w: 8, r: 0.6 })); }
    return S(
      // ноги
      R.rect(-46 * w, -108, 38 * w, 100, hach('#3C5A8A', 6, 3, 4)),
      o.peg ? S(R.rect(14, -108, 34, 48, hach('#3C5A8A', 6, 3, 4)), R.line(30, -60, 26, -4, { c: C.brown, w: 14, r: 0.5 }), R.ell(26, -2, 26, 10, solid(ink, 2)))
        : R.rect(8, -108, 38 * w, 100, hach('#3C5A8A', 6, 3, 4)),
      R.ell(-30 * w, -4, 52, 20, solid(ink, 3)), o.peg ? [] : R.ell(30 * w, -4, 52, 20, solid(ink, 3)),
      // торс
      R.poly([[-44 * w, -256], [44 * w, -256], [54 * w, -112], [-54 * w, -112]], solid('#FFFFFF', 4)),
      ...stripes,
      R.poly([[-44 * w, -256], [44 * w, -256], [54 * w, -112], [-54 * w, -112]], { c: ink, w: 4, r: 0.8 }),
      R.rect(-56 * w, -126, 112 * w, 18, solid(C.brown, 3)), R.rect(-9, -128, 18, 22, solid(C.yellow, 3, { r: 0.4 })),
      // голова
      R.circ(0, -300, 104, solid(C.skin, 4.5)),
      // повязка на голове (бандана)
      R.poly([[-52, -304], [52, -304], [46, -338], [0, -354], [-46, -338]], solid(c, 4)),
      R.line(-50, -308, 50, -308, { c: ink, w: 4, r: 0.5 }),
      dot(-20, -326, 7), dot(0, -336, 7), dot(22, -326, 7),
      R.poly([[-50, -322], [-82, -318], [-70, -334], [-86, -344], [-50, -336]], solid(c, 3)),
      // глаз и повязка на глаз
      R.circ(24, -304, 24, { c: ink, w: 3, fill: '#fff', fs: 'solid', r: 0.4 }), dot(28, -304, 11),
      R.line(10, -322, 40, -322 + (o.brow || 0), { c: ink, w: 5, r: 0.3 }),
      R.ell(-14, -302, 36, 30, solid(ink, 3)), R.line(-30, -318, -52, -336, { c: ink, w: 4, r: 0.3 }), R.line(2, -316, 36, -336 + 4, { c: ink, w: 4, r: 0.3 }),
      R.circ(52, -290, 17, solid(C.skin, 3)),
      R.circ(-50, -284, 16, { c: C.yellow, w: 5, r: 0.4 }),
      o.beard ? R.poly([[-42, -292], [-34, -248], [0, -236], [34, -248], [44, -292], [24, -274], [-24, -274]], hach(ink, 4, 3, 3)) : S(dot(-16, -262, 4), dot(0, -258, 4), dot(18, -260, 4), dot(-30, -270, 4), dot(32, -270, 4)),
      // вторая рука (висит)
      R.lin([[-44 * w, -232], [-66 * w, -176], [-62 * w, -128]], { c: ink, w: 6, r: 0.6 }), R.circ(-62 * w, -122, 15, solid(C.skin, 3)));
  }
  const mouthGrin = S(R.arc(10, -284, 36, 26, 0.1, Math.PI - 0.1, true, { c: ink, w: 3, fill: C.red, fs: 'solid', r: 0.4 }), R.rect(10, -284, 8, 9, solid(C.yellow, 2, { r: 0.2 })));
  const mouthWorry = S(R.lin([[-6, -268], [2, -276], [10, -268], [18, -276], [26, -268]], { c: ink, w: 4, r: 0.5 }), R.poly([[40, -346], [34, -330], [46, -330]], solid(C.ltblue, 2, { r: 0.2 })),
    R.ell(38, -324, 12, 14, solid(C.ltblue, 2, { r: 0.2 })));
  const A = { x: 1110, y: 960, sc: 1 };
  const B = { x: 1790, y: 960, sc: -1 };
  const tfP = (p, dx = 0, dy = 0) => `translate(${p.x + p.sc * dx},${p.y + dy}) scale(${p.sc},1)`;

  s.d(pirateBody({ band: C.red }), 16.6, 2.2, tfP(A));
  s.d(pirateBody({ band: C.blue, fat: true, beard: true, peg: true, brow: -6 }), 18.0, 2.2, tfP(B));
  s.sfx('zap', 16.6);
  // выражения лиц: ухмылка -> нервы
  const faceAnim = (p, at, end, shape) => s.anim(at, end, g => { g.setAttribute('transform', tfP(p)); E.addShape(g, shape); });
  faceAnim(A, 19.0, 27.2, mouthGrin); faceAnim(B, 19.2, 27.4, mouthGrin);
  faceAnim(A, 27.2, 1e9 / k, mouthWorry); faceAnim(B, 27.4, 1e9 / k, mouthWorry);

  // пила (ходит туда-сюда) — рука + пила
  const sawShape = S(R.lin([[34, -232], [100, -250], [150, -270]], { c: ink, w: 6, r: 0.5 }),
    R.circ(158, -272, 24, solid(C.skin, 3)),
    R.rect(150, -300, 36, 54, solid(C.brown, 4)),
    R.poly([[186, -298], [356, -298], [356, -262], [186, -262]], solid('#E5E8EC', 4)),
    R.lin([[186, -262], [200, -250], [214, -262], [228, -250], [242, -262], [256, -250], [270, -262], [284, -250], [298, -262], [312, -250], [326, -262], [340, -250], [356, -262]], { c: ink, w: 4, r: 0.3 }),
    R.line(210, -280, 330, -280, { c: C.gray, w: 3, r: 0.6 }));
  const saw = s.d(sawShape, 19.6, 1.2, tfP(A));
  const SAW_END = 27.2 * k - 19.6 * k;
  saw.dyn = lt => ({ tf: tfP(A, lt > 0.5 * k ? Math.sin(lt * 12) * 14 : 0, 0), op: lt > SAW_END ? 0 : 1 });
  s.sfx('clunk', 20.4);
  // опилки
  s.anim(20.6, 27.2, g => {
    g._d = []; for (let i = 0; i < 7; i++) g._d.push(el('circle', { r: 3 + (i % 3), fill: '#C79A5B' }, g));
  }, (lt, g) => g._d.forEach((c, i) => {
    const ph = ((lt * 1.6 + i / 7) % 1);
    c.setAttribute('cx', 1300 + i * 17 + ph * 24 * (i % 2 ? 1 : -1)); c.setAttribute('cy', 700 + ph * 90 + (i % 3) * 6); c.setAttribute('opacity', 1 - ph);
  }));

  // лупа
  const lensShape = S(R.lin([[34, -232], [92, -262], [140, -290]], { c: ink, w: 6, r: 0.5 }), R.circ(146, -294, 24, solid(C.skin, 3)),
    R.line(150, -296, 196, -340, { c: C.brown, w: 12, r: 0.5 }),
    R.circ(222, -372, 96, { c: ink, w: 7, fill: '#DFF1FB', fs: 'solid', r: 0.7 }),
    R.arc(222, -372, 62, 62, Math.PI * 1.1, Math.PI * 1.55, false, { c: C.white, w: 6, r: 0.4 }));
  const lens = s.d(lensShape, 20.0, 1.2, tfP(B));
  lens.dyn = lt => ({ tf: tfP(B, Math.sin(lt * 3.1) * 20, Math.cos(lt * 4.3) * 8), op: lt > (27.4 - 20.0) * k ? 0 : 1 });

  /* ---------------- красные таблички из монитора ---------------- */
  function sign(at, label, w, tx, ty, rot, sfxAt) {
    let g, tg;
    s.anim(at, 1e9 / k, gg => {
      g = gg;
      E.addShape(gg, R.rect(-w / 2, -34, w, 68, { c: ink, w: 5, fill: C.red, fs: 'solid', r: 0.8 }));
      E.addShape(gg, R.rect(-w / 2 + 8, -26, w - 16, 52, { c: C.white, w: 2.5, r: 0.5 }));
      const t = el('text', { x: 0, y: 14, 'font-size': 42, fill: C.white, stroke: C.white, 'stroke-width': 1, 'font-family': 'Neucha, Caveat, sans-serif', 'text-anchor': 'middle' }, gg); t.textContent = label;
    }, lt => {
      const p = clamp(lt / (0.9 * k)), e = E.ease(p);
      const x = lerp(TX, tx, e), y = lerp(690, ty, e) - Math.sin(p * Math.PI) * 90 + (p >= 1 ? Math.sin(lt * 2.6 + tx) * 5 : 0);
      g.setAttribute('transform', `translate(${x},${y}) rotate(${rot * e + (p >= 1 ? Math.sin(lt * 2.2 + tx) * 2.5 : 0)}) scale(${0.3 + 0.7 * e})`);
    });
    s.sfx('zap', sfxAt);
  }
  sign(21.0, 'СПОЙЛЕРЫ', 270, 1590, 490, 6, 21.2);
  sign(23.2, 'КОД', 150, 1370, 505, -8, 23.4);
  s.txt('Защита вскрыта!', 24.6, 1.2, 1450, 965, 40, C.red, { anchor: 'middle' });

  /* ---------------- облачко пирата с пилой ---------------- */
  s.bub('Ну дайте хоть один файлик поковырять, мы аккуратно — как хирурги!', 22.0, 1140, 345, 1122, 630, { maxW: 400, fs: 38 });

  /* ---------------- Rockstar собирает сливки ---------------- */
  const coinStack = (x, y, n) => { const out = []; for (let i = 0; i < n; i++) out.push(R.ell(x, y - i * 13, 66, 22, solid(C.yellow, 3, { r: 0.5 }))); return S(...out); };
  s.d(S(coinStack(590, 766, 5), coinStack(650, 766, 3), coinStack(540, 766, 2)), 26.0, 1.2);
  s.txt('$$$', 27.0, 0.6, 600, 640, 48, C.green, { anchor: 'middle' });
  s.sfx('ding', 26.4);
  s.txt('Rockstar собирает сливки', 27.4, 1.6, 465, 452, 38, C.green, { anchor: 'middle' });
  // блеск монет
  s.anim(28.0, 1e9 / k, g => { E.addShape(g, K.mark('star', 0, 0, 0.6, C.yellow)); }, (lt, g) => {
    const p = (lt / 0.9) % 1; g.setAttribute('transform', `translate(640,690) scale(${Math.sin(p * Math.PI)}) rotate(${p * 90})`);
  });

  /* ---------------- пираты грызут ногти / смотрят чужой стрим ---------------- */
  const nailA = R.lin([[34, -232], [96, -246], [50, -282]], { c: ink, w: 6, r: 0.5 });
  const nailAh = S(R.circ(28, -282, 22, solid(C.skin, 3)), R.line(14, -292, 20, -300, { c: ink, w: 3, r: 0.2 }), R.line(24, -296, 30, -304, { c: ink, w: 3, r: 0.2 }));
  const na = s.d(S(nailA, nailAh), 27.4, 0.7, tfP(A));
  na.dyn = lt => ({ tf: tfP(A, 0, Math.abs(Math.sin(lt * 14)) * 3), op: 1 });
  const nb = s.d(S(R.lin([[34, -232], [100, -250], [54, -286]], { c: ink, w: 6, r: 0.5 }), R.circ(30, -286, 22, solid(C.skin, 3))), 27.6, 0.7, tfP(B));
  nb.dyn = lt => ({ tf: tfP(B, 0, Math.abs(Math.sin(lt * 13 + 1)) * 3), op: 1 });
  // мысль пирата: чужой стрим
  s.bub('Грызём ногти и смотрим чужой стрим…', 28.4, 1690, 405, 1760, 590, { maxW: 300, fs: 38, thought: true });
  // мини-экран стрима
  s.d(S(R.rect(1230, 412, 150, 96, solid('#FFFFFF', 4)), R.poly([[1285, 430], [1285, 490], [1335, 460]], solid(C.red, 3, { r: 0.4 }))), 29.4, 0.9);
  s.txt('LIVE', 30.4, 0.5, 1305, 536, 34, C.red, { anchor: 'middle' });
})();
