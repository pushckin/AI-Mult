(function () {
  const { R, S, C, clamp, el } = E, { P } = G;
  const s = G.mk(3);
  const ink = C.ink, DG = '#1F7A4D';
  const rnd = (() => { let q = 7; return () => (q = (q * 16807) % 2147483647) / 2147483647; })();

  /* ---------- заголовок ---------- */
  s.txt('ПРИЧИНА №3: ВЫ — ДЕСЕРТ НА ПОТОМ', 0.3, 1.8, 960, 118, 58, C.green, { anchor: 'middle' });
  s.d(R.lin([[400, 146], [700, 154], [1000, 146], [1300, 154], [1520, 148]], { c: C.green, w: 5, r: 1.4 }), 2.0, 0.5);

  /* ---------- гора денег ---------- */
  const MX0 = 520, MX1 = 1400, MY = 1020, PX = 960, PY = 540;
  s.d(S(R.poly([[MX0, MY], [760, 700], [860, 610], [PX - 40, PY], [PX + 40, PY], [1080, 600], [1190, 690], [MX1, MY]],
    { c: DG, w: 6, fill: C.ltgreen, gap: 9, fw: 3 })), 1.0, 2.4);
  const bill = () => S(R.rect(-34, -18, 68, 36, { c: DG, w: 3.5, fill: '#CDEBC0', fs: 'solid', r: 0.8 }),
    R.circ(0, 0, 20, { c: DG, w: 3, r: 0.6 }), R.line(-26, -9, -26, 9, { c: DG, w: 2.5, r: 0.3 }), R.line(26, -9, 26, 9, { c: DG, w: 2.5, r: 0.3 }));
  const coin = () => S(R.circ(0, 0, 40, { c: ink, w: 3.5, fill: C.yellow, fs: 'solid', r: 0.7 }), R.circ(0, 0, 28, { c: ink, w: 2, r: 0.6 }));
  const hill = y => { // x-границы горы на высоте y
    const k = (y - PY) / (MY - PY); return [PX - 40 - (PX - 40 - MX0) * k * 0.98, PX + 40 + (MX1 - PX - 40) * k * 0.98];
  };
  // раскладка купюр/монет/долларов по склонам
  const items = [];
  for (let i = 0; i < 34; i++) {
    const y = 600 + rnd() * 390, [a, b] = hill(y), x = a + 40 + rnd() * (b - a - 80);
    items.push({ t: i % 3 === 0 ? 'coin' : i % 3 === 1 ? 'bill' : 'dol', x, y, r: (rnd() - .5) * 70 });
  }
  items.sort((p, q) => p.y - q.y);
  items.forEach((it, i) => {
    const at = 4.6 + i * 0.07 + (it.y > 800 ? 8.6 : 0) * (i % 2 ? 0 : 0) ;
    const t0 = i < 14 ? 9.6 + i * 0.1 : 13.4 + (i - 14) * 0.1;
    if (it.t === 'bill') s.d(bill(), t0, 0.28, P(it.x, it.y, 0.9, it.r));
    else if (it.t === 'coin') s.d(coin(), t0, 0.28, P(it.x, it.y, 0.62, it.r));
    else s.txt('$', t0, 0.22, it.x, it.y + 16, 56, DG, { anchor: 'middle', rot: it.r });
  });
  s.sfx('coins', 9.7); s.sfx('coins', 13.3);
  // монеты, сыплющиеся с вершины
  s.anim(9.6, 1e9, g => { for (let i = 0; i < 5; i++) el('circle', { r: 11, fill: C.yellow, stroke: ink, 'stroke-width': 3 }, g); },
    (lt, g) => { [...g.children].forEach((c, i) => { const p = ((lt * 0.5 + i / 5) % 1);
      c.setAttribute('cx', 980 + (i - 2) * 36 + Math.sin(lt * 3 + i) * 6); c.setAttribute('cy', 560 + p * 250); c.setAttribute('opacity', 1 - p); }); });

  /* ---------- босс ---------- */
  const boss = () => S(
    R.poly([[-56, -218], [56, -218], [70, -96], [-70, -96]], { c: ink, w: 4.5, fill: '#3A4A5E', gap: 6, fw: 3 }),   // пиджак
    R.poly([[-20, -218], [0, -150], [20, -218]], { c: ink, w: 3, fill: '#fff', fs: 'solid' }),                     // рубашка
    R.poly([[-7, -212], [7, -212], [11, -150], [0, -128], [-11, -150]], { c: ink, w: 3, fill: C.red, gap: 4, fw: 3 }), // галстук
    R.rect(-52, -96, 44, 96, { c: ink, w: 4.5, fill: '#2C3947', gap: 6, fw: 3 }), R.rect(8, -96, 44, 96, { c: ink, w: 4.5, fill: '#2C3947', gap: 6, fw: 3 }),
    R.ell(-34, 4, 66, 20, { c: ink, w: 4, fill: ink, fs: 'solid' }), R.ell(34, 4, 66, 20, { c: ink, w: 4, fill: ink, fs: 'solid' }),
    R.circ(0, -266, 96, { c: ink, w: 4.5, fill: C.skin, fs: 'solid' }),
    R.poly([[-48, -296], [-30, -322], [20, -326], [50, -298], [30, -300], [-10, -306]], { c: ink, w: 3.5, fill: '#777', gap: 4, fw: 3 }),   // зализанные волосы
    R.ell(0, -246, 24, 16, { c: ink, w: 3, fill: C.skin, fs: 'solid' }),  // нос
    K.face(0, -268, 44, 'happy'),
    R.lin([[-56, -206], [-92, -160], [-100, -122]], { c: ink, w: 6 }),   // рука на поясе
    R.lin([[56, -206], [100, -240], [126, -300]], { c: ink, w: 6 }),     // рука вверх
    R.circ(128, -312, 26, { c: ink, w: 3.5, fill: C.skin, fs: 'solid', r: 0.6 }));
  s.d(boss(), 3.0, 2.6, P(PX, PY + 6, 1.15));
  // бейдж
  s.d(S(R.rect(-52, -190, 92, 40, { c: ink, w: 3.5, fill: '#fff', fs: 'solid', r: 0.7 }), R.rect(-52, -190, 92, 40, { c: C.blue, w: 3, r: 0.7 })), 5.2, 0.5, P(PX - 5, PY + 6, 1.15));
  s.txt('Take-Two', 5.4, 0.7, PX - 8, PY - 175, 26, C.blue, { anchor: 'middle' });
  // купюра в поднятой руке и «блеск»
  s.d(bill(), 5.6, 0.3, P(PX + 150, PY - 355, 0.8, -25));
  // зубы-золото: блеск вокруг головы
  s.anim(5.8, 1e9, g => { for (let i = 0; i < 3; i++) el('path', { d: 'M0,-14 L4,0 L0,14 L-4,0Z M-14,0 L0,-4 L14,0 L0,4Z', fill: C.yellow, stroke: ink, 'stroke-width': 2 }, g); },
    (lt, g) => [...g.children].forEach((c, i) => { const k = Math.max(0, Math.sin(lt * 4 + i * 2.1)); const x = [PX - 100, PX + 70, PX + 160][i], y = [PY - 330, PY - 370, PY - 280][i];
      c.setAttribute('transform', `translate(${x},${y}) scale(${k * 1.2 + 0.05})`); }));

  /* ---------- флаги ---------- */
  function flag(px, base, top, dir, l1, l2, at) {
    const x2 = px + dir * 250;
    s.d(R.line(px, base, px, top, { c: ink, w: 7, r: 0.6 }), at, 0.5);
    const f = s.d(S(R.poly([[px, top], [x2, top + 6], [x2 - dir * 20, top + 52], [x2, top + 100], [px, top + 96]], { c: ink, w: 4.5, fill: '#FFE9A3', gap: 8, fw: 3, r: 1 })), at + 0.4, 0.9);
    f.dyn = lt => `rotate(${Math.sin(lt * 4.5) * 1.8} ${px} ${top})`;
    const cx = (px + x2) / 2 - dir * 6;
    s.txt(l1, at + 1.0, 0.7, cx, top + 44, 40, C.red, { anchor: 'middle' });
    s.txt(l2, at + 1.6, 0.6, cx, top + 82, 28, ink, { anchor: 'middle' });
  }
  flag(700, 848, 590, -1, '32,5 млн', 'предзаказов', 9.8);
  flag(1220, 848, 590, 1, '$3,79 млрд', 'в 1-й день', 13.1);
  s.sfx('cash', 10.0); s.sfx('cash', 13.2);

  /* ---------- консоль под прожектором ---------- */
  const CX = 270, CY = 790;
  s.d(S(R.line(190, 60, 190, 190, { c: ink, w: 5, r: 0.5 }),
    R.poly([[160, 190], [220, 190], [250, 262], [130, 262]], { c: ink, w: 4.5, fill: C.gray, gap: 6, fw: 3 }),
    R.ell(190, 266, 130, 30, { c: ink, w: 4, fill: C.yellow, fs: 'solid' })), 5.0, 1.2);
  // луч
  s.anim(6.3, 1e9, g => {
    el('polygon', { points: `150,270 230,270 500,830 70,830`, fill: C.yellow, opacity: 0 }, g);
    el('ellipse', { cx: CX, cy: 832, rx: 215, ry: 30, fill: C.yellow, opacity: 0 }, g);
    for (const x of [90, 190, 270, 360, 470]) el('line', { x1: 190, y1: 270, x2: x, y2: 820, stroke: C.orange, 'stroke-width': 3, 'stroke-dasharray': '16 22', opacity: 0.5, 'stroke-linecap': 'round' }, g);
  }, (lt, g) => { const k = clamp(lt / 0.5), p = 0.5 + 0.5 * Math.sin(lt * 5);
    g.children[0].setAttribute('opacity', (0.20 + 0.12 * p) * k); g.children[1].setAttribute('opacity', (0.35 + 0.2 * p) * k);
    [...g.children].slice(2).forEach((c, i) => c.setAttribute('stroke-dashoffset', -lt * 25 - i * 5)); });
  s.sfx('zap', 6.3);
  const console_ = () => S(
    R.rect(-130, -150, 260, 150, { c: ink, w: 5, fill: '#fff', fs: 'solid', r: 1 }),
    R.rect(-130, -150, 260, 150, { c: C.blue, w: 3, fill: C.ltblue, gap: 12, fw: 2 }),
    R.rect(-110, -128, 140, 18, { c: ink, w: 3.5, fill: ink, fs: 'solid', r: 0.6 }),   // щель диска
    R.circ(80, -118, 20, { c: ink, w: 3, fill: C.green, fs: 'solid', r: 0.5 }),       // кнопка
    R.line(-110, -60, 110, -60, { c: ink, w: 3, r: 0.8 }));
  s.d(console_(), 6.6, 1.4, P(CX, CY - 6));
  s.txt('КОНСОЛЬ', 7.8, 0.8, CX, CY - 30, 40, C.blue, { anchor: 'middle' });
  // геймпад
  const pad = () => S(R.path('M-70,-24 C-82,-60 -50,-72 -30,-62 L30,-62 C50,-72 82,-60 70,-24 C64,-2 40,-6 28,-20 L-28,-20 C-40,-6 -64,-2 -70,-24Z', { c: ink, w: 4.5, fill: C.ltblue, gap: 6, fw: 3 }),
    R.circ(-38, -44, 18, { c: ink, w: 3, r: 0.6 }), R.circ(22, -34, 18, { c: ink, w: 3, r: 0.6 }),
    R.line(-52, -44, -26, -44, { w: 3, r: 0.3 }), R.line(-38, -58, -38, -30, { w: 3, r: 0.3 }),
    R.circ(52, -50, 9, { c: C.red, w: 2.5, fill: C.red, fs: 'solid', r: 0.4 }), R.circ(64, -40, 9, { c: C.green, w: 2.5, fill: C.green, fs: 'solid', r: 0.4 }));
  s.d(pad(), 7.4, 1.0, P(CX + 40, CY + 74, 1.25));
  // сердечки-обожание
  s.d(K.mark('star', 0, 0, 0.9, C.yellow), 8.4, 0.4, P(CX - 150, CY - 220));
  s.d(K.mark('star', 0, 0, 0.7, C.yellow), 8.7, 0.4, P(CX + 160, CY - 250));
  s.txt('любимчик!', 8.5, 0.8, CX + 10, CY - 190, 36, C.orange, { anchor: 'middle', rot: -5 });

  /* ---------- чемодан от Sony ---------- */
  const case_ = () => S(
    R.rect(-70, -78, 140, 78, { c: ink, w: 4.5, fill: C.brown, gap: 7, fw: 3 }),
    R.path('M-24,-78 L-24,-96 L24,-96 L24,-78', { c: ink, w: 4.5 }),
    R.rect(-10, -48, 20, 16, { c: ink, w: 3, fill: C.yellow, fs: 'solid', r: 0.5 }),
    R.line(-70, -42, 70, -42, { c: ink, w: 3, r: 0.5 }), R.line(-50, 0, -50, 8, { c: ink, w: 5 }), R.line(50, 0, 50, 8, { c: ink, w: 5 }));
  s.d(case_(), 17.3, 1.1, P(215, 975, 1.0));
  s.txt('$$$', 17.9, 0.6, 215, 954, 30, DG, { anchor: 'middle' });
  s.txt('Sony', 18.3, 0.5, 215, 928, 24, ink, { anchor: 'middle' });
  s.d(K.mark('cross', 0, 0, 2.0, C.red), 21.3, 0.5, P(215, 935));
  s.sfx('clunk', 21.4);
  s.txt('Теория заговора? Отвергнуто', 21.7, 1.6, 255, 1045, 32, C.red, { anchor: 'middle', rot: -2 });

  /* ---------- яма с рукой ПК-игрока ---------- */
  s.d(S(R.ell(1670, 985, 340, 100, { c: ink, w: 5, fill: ink, gap: 5, fw: 4 }), R.ell(1670, 976, 260, 60, { c: ink, w: 3, fill: '#222', fs: 'solid', r: 0.5 })), 22.5, 1.2);
  s.d(S(R.line(1500, 900, 1500, 800, { c: ink, w: 7, r: 0.5 }), R.poly([[1420, 735], [1585, 742], [1580, 810], [1418, 803]], { c: ink, w: 4.5, fill: '#F7E1B0', gap: 7, fw: 3 })), 23.2, 1.0);
  s.txt('Потом', 23.8, 0.6, 1500, 788, 46, C.red, { anchor: 'middle', rot: 2 });
  const hand = S(
    R.poly([[-34, 210], [-30, 20], [30, 20], [36, 210]], { c: ink, w: 4.5, fill: C.ltblue, gap: 6, fw: 3 }),            // рукав
    R.circ(0, -6, 82, { c: ink, w: 4.5, fill: C.skin, fs: 'solid', r: 0.8 }),                                           // кисть
    R.lin([[-28, -64], [-34, -100]], { c: ink, w: 4.5 }), R.lin([[-6, -80], [-8, -118]], { c: ink, w: 4.5 }), R.lin([[18, -76], [24, -108]], { c: ink, w: 4.5 }),
    R.ell(0, -34, 62, 92, { c: ink, w: 4.5, fill: '#fff', fs: 'solid', r: 0.8 }), R.ell(0, -34, 62, 92, { c: C.blue, w: 3, r: 0.8 }),
    R.line(0, -78, 0, -40, { c: ink, w: 3.5, r: 0.3 }), R.line(-31, -40, 31, -40, { c: ink, w: 3.5, r: 0.3 }), R.rect(-5, -70, 10, 20, { c: C.red, w: 3, fill: C.red, fs: 'solid', r: 0.3 }));
  const h = s.d(hand, 24.2, 1.4, P(1690, 800));
  h.dyn = lt => `rotate(${Math.sin(lt * 2.6) * 5} 1690 985) translate(1690,800)`;
  s.bub('Я тут подожду…', 26.4, 1650, 560, 1690, 690, { fs: 36, maxW: 280 });

  /* ---------- облачко босса ---------- */
  s.bub('Ничего личного, ребята, просто вы — наш десерт на следующий квартал!', 24.6, 1500, 300, 1035, 258, { maxW: 480, fs: 42 });
  s.sfx('ding', 24.7);

  // живая доска до губки: летающие долларики
  s.anim(17.0, 1e9, g => { for (let i = 0; i < 4; i++) { const t = el('text', { 'font-size': 44, fill: DG, 'font-family': 'Neucha, Caveat, sans-serif', 'text-anchor': 'middle', 'font-weight': 700 }, g); t.textContent = '$'; } },
    (lt, g) => [...g.children].forEach((c, i) => { const p = (lt * 0.28 + i / 4) % 1;
      c.setAttribute('x', 800 + i * 110 + Math.sin(lt * 2 + i) * 20); c.setAttribute('y', 500 - p * 150); c.setAttribute('opacity', Math.sin(p * Math.PI)); }));
})();
