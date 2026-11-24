/* СЦЕНА 3 — ПРИЧИНА №2: «Кладбище видеокарт» (35 ном. секунд) */
(function () {
  const { R, S, C, clamp, el } = E, { P } = G, K = window.K, ink = C.ink;
  const s = G.mk(2);
  const T = (str, at, dur, x, y, size, color, o) => s.txt(str, at, dur, x, y, size, color, Object.assign({ anchor: 'middle' }, o));

  /* ---- заголовок и делитель ---- */
  T('ПРИЧИНА №2: ВИДЕОКАРТ МНОГО, А НЕРВЫ ОДНИ', 0.2, 2.8, 960, 108, 58, C.red);
  s.d(R.lin([[960, 175], [956, 420], [964, 700], [960, 1010]], { c: C.gray, w: 6, r: 1.6 }), 3.0, 1.0);
  T('КОНСОЛИ', 3.4, 0.9, 495, 205, 60, C.green);
  T('ПК', 3.8, 0.6, 1425, 205, 60, C.red);

  /* ---- левая половина: три аккуратные коробки ---- */
  const box = (cx, by, fill, label, sub, at, face) => {
    s.d(S(R.rect(-105, -330, 210, 330, { c: ink, w: 5, fill, gap: 9, fw: 2 }),
      R.line(-105, -250, 105, -250, { c: ink, w: 3, r: 0.6 }),
      K.face(0, -185, 38, face),
      R.circ(0, -70, 26, { c: ink, w: 3, r: 0.6 }), R.line(-60, -24, 60, -24, { c: ink, w: 3, r: 0.6 })), at, 1.5, P(cx, by));
    T(label, at + 1.4, 0.6, cx, by - 268, sub ? 44 : 52, ink);
    if (sub) T(sub, at + 1.6, 0.4, cx, by - 224, 30, C.red);
    // нимб
    const hy = by - 372;
    const h = s.d(R.ell(0, 0, 150, 36, { c: C.yellow, w: 9, r: 0.8 }), at + 2.0, 0.6, P(cx, hy));
    h.dyn = lt => P(cx, hy + Math.sin(lt * 2.4 + cx) * 7, 1, Math.sin(lt * 1.7 + cx) * 3);
    // галочка
    s.d(K.mark('check', cx + 112, by - 24, 1.5, C.green), at + 2.5, 0.5);
    s.sfx('ding', at + 2.6, 0.7);
  };
  T('ВСЁ ПО СТРОЙКЕ, КАК В АРМИИ', 4.4, 2.2, 495, 275, 40, C.green);
  box(235, 850, C.ltblue, 'PS5', '', 5.0, 'happy');
  box(495, 850, C.ltblue, 'PS5', 'Pro', 7.2, 'smile');
  box(755, 850, C.ltgreen, 'Xbox', 'Series', 9.4, 'happy');
  T('одинаковые коробки = вылизано до блеска', 11.8, 2.0, 495, 960, 36, C.ink);
  s.d(K.mark('star', 100, 400, 0.9, C.yellow), 12.8, 0.5);
  s.d(K.mark('star', 880, 420, 0.7, C.yellow), 13.2, 0.5);

  /* ---- правая половина: горящий ПК ---- */
  const px = 1115, pby = 870;
  s.d(S(R.rect(-95, -270, 190, 270, { c: ink, w: 5, fill: '#B9BEC7', gap: 8, fw: 2 }),
    R.rect(-70, -245, 140, 22, { c: ink, w: 3.5, r: 0.6 }), R.rect(-70, -208, 140, 22, { c: ink, w: 3.5, r: 0.6 }),
    R.circ(55, -60, 30, { c: ink, w: 4, fill: C.red, fs: 'solid', r: 0.6 }), R.circ(-50, -60, 34, { c: ink, w: 3.5, r: 0.6 }),
    K.face(0, -150, 34, 'scared')), 14.0, 1.6, P(px, pby));
  const flame = (dx, dy, sc, ph, at) => {
    const f = s.d(S(R.path('M-60,0 C-90,-50 -50,-90 -42,-150 C-10,-110 -4,-60 -20,0Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }),
      R.path('M-8,0 C-48,-60 -6,-110 6,-190 C40,-130 56,-60 40,0Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }),
      R.path('M30,0 C10,-30 22,-60 36,-90 C60,-60 66,-30 56,0Z', { c: C.red, w: 4, fill: C.yellow, gap: 4, fw: 3 })), at, 0.9, P(px + dx, pby - 268 + dy, sc));
    f.dyn = lt => `translate(${px + dx + Math.sin(lt * 7 + ph) * 4},${pby - 268 + dy}) scale(${sc * (1 + Math.sin(lt * 11 + ph) * 0.06)},${sc * (1 + Math.sin(lt * 9 + ph * 2) * 0.12 + 0.05)}) rotate(${Math.sin(lt * 5 + ph) * 3})`;
    return f;
  };
  flame(0, 20, 1.15, 0, 14.8); flame(-60, 40, 0.8, 2, 15.3); flame(60, 40, 0.85, 4, 15.6);
  s.sfx('fire', 14.8);
  // искры
  s.anim(15.6, null, g => { g.sp = []; for (let i = 0; i < 6; i++) g.sp.push(el('circle', { r: 5, fill: C.orange }, g)); },
    (lt, g) => g.sp.forEach((c, i) => { const ph = (lt * 0.5 + i / 6) % 1;
      c.setAttribute('cx', px - 50 + i * 20 + Math.sin(lt * 3 + i) * 14); c.setAttribute('cy', pby - 400 - ph * 150);
      c.setAttribute('opacity', 1 - ph); c.setAttribute('r', 6 - ph * 4); }));
  T('ТЫСЯЧА ВИДЕОКАРТ', 16.0, 1.5, px, pby + 62, 32, C.ink);

  /* ---- красные окна «Driver Error!» ---- */
  const win = (at, x, y, w, rot) => {
    let body;
    s.anim(at, null, g => {
      body = el('g', {}, g);
      E.addShape(body, S(R.rect(0, 0, w, 100, { c: ink, w: 4, fill: C.white, fs: 'solid', r: 0.8 }), R.rect(0, 0, w, 30, { c: ink, w: 4, fill: C.red, fs: 'solid', r: 0.8 })));
      E.addShape(body, K.mark('cross', w - 20, 15, 0.28, C.white));
      const t = el('text', { x: w / 2 + 6, y: 74, 'font-size': 28, fill: C.red, stroke: C.red, 'stroke-width': 0.7, 'font-family': 'Neucha, Caveat, sans-serif', 'text-anchor': 'middle' }, body);
      t.textContent = 'Driver Error!';
      const i = el('text', { x: 10, y: 22, 'font-size': 20, fill: '#fff', 'font-family': 'Neucha, Caveat, sans-serif' }, body); i.textContent = 'ошибка';
    }, lt => { const k = Math.max(0.001, E.spring(lt / 0.45)); body.setAttribute('transform', `translate(${x + w / 2},${y + 50}) rotate(${rot}) scale(${k}) translate(${-w / 2},-50)`); });
    s.sfx('clunk', at, 0.7);
  };
  win(17.2, 1005, 240, 190, -4);
  win(18.6, 1215, 255, 190, 3);
  win(20.0, 1105, 350, 190, 2);

  /* ---- ноутбук, который помнит динозавров ---- */
  const lx = 1470, lby = 870;
  s.d(S(R.poly([[-75, -95], [75, -95], [75, -10], [-75, -10]], { c: ink, w: 4, fill: C.ltblue, fs: 'solid' }),
    R.poly([[-95, -10], [95, -10], [110, 8], [-110, 8]], { c: ink, w: 4, fill: C.gray, gap: 5, fw: 2 }),
    R.lin([[-50, -70], [-20, -50], [0, -78], [20, -48], [50, -70]], { c: C.red, w: 4, r: 0.6 }),
    // трещина
    R.lin([[40, -95], [30, -70], [48, -52], [40, -10]], { c: ink, w: 2.5, r: 0.5 })), 21.0, 1.3, P(lx, lby, 0.85));
  // динозавр (бронтозавр)
  s.d(S(R.ell(0, -30, 90, 44, { c: C.green, w: 4, fill: C.ltgreen, gap: 5, fw: 2.5, r: 0.8 }),
    R.curve([[-30, -44], [-60, -80], [-62, -120], [-48, -140]], { c: C.green, w: 5 }),
    R.ell(-42, -144, 30, 20, { c: C.green, w: 4, fill: C.ltgreen, gap: 5, fw: 2.5, r: 0.6 }),
    R.circ(-48, -148, 5, { c: ink, w: 2, fill: ink, fs: 'solid', r: 0.3 }),
    R.curve([[44, -34], [76, -28], [100, -10]], { c: C.green, w: 5 }),
    R.line(-20, -10, -20, 12, { c: C.green, w: 5, r: 0.4 }), R.line(22, -10, 22, 12, { c: C.green, w: 5, r: 0.4 })), 22.2, 1.0, P(lx + 10, lby - 120, 0.75));
  T('ноутбук помнит', 22.0, 0.9, lx, lby + 55, 28, C.ink);
  T('динозавров', 22.7, 0.7, lx, lby + 85, 28, C.ink);

  /* ---- программист с капельницей ---- */
  const mx = 1775, mby = 940;
  const bagBase = P(mx, mby);
  s.d(S(K.man({ expr: 'sad', hair: C.gray, shirt: 'solid' }),
    // огромные мешки под глазами
    R.ell(-18, -247, 38, 24, { c: '#5B3A8C', w: 3, fill: '#7B5AA8', gap: 3, fw: 3, r: 0.5 }),
    R.ell(18, -247, 38, 24, { c: '#5B3A8C', w: 3, fill: '#7B5AA8', gap: 3, fw: 3, r: 0.5 })), 22.8, 2.2, bagBase);
  // иголка в руке + рука к капельнице
  s.d(R.lin([[-48, -200], [-110, -190], [-150, -230]], { c: ink, w: 5 }), 25.0, 0.5, bagBase);
  // стойка и пакет
  const sx = 1620;
  s.d(S(R.line(sx, 930, sx, 480, { c: ink, w: 6, r: 0.8 }), R.line(sx - 55, 930, sx + 55, 930, { c: ink, w: 6, r: 0.8 }),
    R.lin([[sx - 70, 480], [sx + 70, 480]], { c: ink, w: 6 })), 25.0, 1.0);
  s.d(S(R.poly([[-48, -10], [48, -10], [56, 80], [0, 100], [-56, 80]], { c: ink, w: 4, fill: C.brown, gap: 5, fw: 3 }),
    R.line(0, -12, 0, -34, { c: ink, w: 4 })), 25.8, 1.0, P(sx, 520));
  T('КОФЕ', 26.6, 0.6, sx, 592, 38, C.white);
  s.d(R.curve([[sx, 626], [sx, 700], [sx - 10, 760], [mx - 150, 745]], { c: C.brown, w: 4, r: 0.8 }), 26.4, 0.8);
  s.d(S(R.rect(sx - 14, 650, 28, 44, { c: ink, w: 3.5, r: 0.6 })), 26.2, 0.5);
  // капли
  s.anim(26.8, null, g => { g.dr = []; for (let i = 0; i < 2; i++) g.dr.push(el('path', { d: 'M0,-10 C8,2 8,10 0,10 C-8,10 -8,2 0,-10Z', fill: C.brown, stroke: ink, 'stroke-width': 1.5 }, g)); },
    (lt, g) => g.dr.forEach((d, i) => { const ph = (lt * 0.9 + i / 2) % 1; d.setAttribute('transform', `translate(${sx},${666 + ph * 24})`); d.setAttribute('opacity', 1 - ph * 0.6); }));
  // капли в трубке (пульсация)
  s.anim(26.8, null, g => { g.q = el('circle', { r: 5, fill: C.brown }, g); },
    (lt, g) => { const ph = (lt * 0.5) % 1; g.q.setAttribute('cx', sx - 5 - ph * (mx - 150 - sx + 5) * 0.95); g.q.setAttribute('cy', 740 + Math.sin(ph * 3) * 12 + ph * 6); });
  s.sfx('ding', 27.0, 0.5);

  /* облачко программиста */
  s.bub('Если я ещё раз увижу вылет на Windows 7, я сам выйду в окно...', 27.4, 1690, 335, 1775, 610, { maxW: 340, fs: 38 });

  /* ---- надгробие и 12 FPS ---- */
  const gx = 1305, gby = 870;
  s.d(S(R.path('M-70,0 L-70,-120 C-70,-190 70,-190 70,-120 L70,0Z', { c: ink, w: 5, fill: '#CFD3DA', gap: 7, fw: 2.5 }),
    R.line(-80, 0, 80, 0, { c: ink, w: 5, r: 0.8 })), 29.0, 1.2, P(gx, gby));
  T('RIP', 30.0, 0.5, gx, gby - 110, 38, ink);
  T('GTX 1060', 30.4, 0.6, gx, gby - 72, 24, ink);
  s.d(S(R.line(-12, 6, -12, 28, { c: C.green, w: 4, r: 0.4 }), R.circ(-12, 4, 14, { c: C.pink, w: 3, fill: C.pink, fs: 'solid', r: 0.5 })), 31.0, 0.4, P(gx + 55, gby - 4));
  const fps = T('12 FPS', 31.0, 0.7, px, 1000, 62, C.red, { rot: -4 });
  s.sfx('zap', 31.0, 0.6);
})();
