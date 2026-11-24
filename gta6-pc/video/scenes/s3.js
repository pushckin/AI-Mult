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
      R.circ(0, -70, 26, { c: ink, w: 3, r: 0.6 }), R.line(-60, -24, 60, -24, { c: ink, w: 3, r: 0.6 })), at, 1.2, P(cx, by));
    T(label, at + 1.2, 0.5, cx, by - 268, sub ? 44 : 52, ink);
    if (sub) T(sub, at + 1.5, 0.4, cx, by - 224, 30, C.red);
    // нимб
    const hy = by - 372;
    const h = s.d(R.ell(0, 0, 150, 36, { c: C.yellow, w: 9, r: 0.8 }), at + 1.8, 0.5, P(cx, hy));
    h.dyn = lt => P(cx, hy + Math.sin(lt * 2.4 + cx) * 7, 1, Math.sin(lt * 1.7 + cx) * 3);
    // галочка
    s.d(K.mark('check', cx + 112, by - 24, 1.5, C.green), at + 2.2, 0.4);
    s.sfx('ding', at + 2.3, 0.7);
  };
  T('ВСЁ ПО СТРОЙКЕ, КАК В АРМИИ', 4.4, 2.2, 495, 275, 40, C.green);
  box(235, 850, C.ltblue, 'PS5', '', 5.7, 'happy');
  box(495, 850, C.ltblue, 'PS5', 'Pro', 7.3, 'smile');
  box(755, 850, C.ltgreen, 'Xbox', 'Series', 8.8, 'happy');
  T('одинаковые коробки = вылизано до блеска', 12.1, 1.6, 495, 960, 36, C.ink);
  s.d(K.mark('star', 100, 400, 0.9, C.yellow), 13.0, 0.5);
  s.d(K.mark('star', 880, 420, 0.7, C.yellow), 13.4, 0.5);

  /* ---- правая половина: горящий ПК ---- */
  const px = 1115, pby = 870;
  s.d(S(R.rect(-95, -270, 190, 270, { c: ink, w: 5, fill: '#B9BEC7', gap: 8, fw: 2 }),
    R.rect(-70, -245, 140, 22, { c: ink, w: 3.5, r: 0.6 }), R.rect(-70, -208, 140, 22, { c: ink, w: 3.5, r: 0.6 }),
    R.circ(55, -60, 30, { c: ink, w: 4, fill: C.red, fs: 'solid', r: 0.6 }), R.circ(-50, -60, 34, { c: ink, w: 3.5, r: 0.6 }),
    K.face(0, -150, 34, 'scared')), 13.7, 1.2, P(px, pby));
  const flame = (dx, dy, sc, ph, at) => {
    const f = s.d(S(R.path('M-60,0 C-90,-50 -50,-90 -42,-150 C-10,-110 -4,-60 -20,0Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }),
      R.path('M-8,0 C-48,-60 -6,-110 6,-190 C40,-130 56,-60 40,0Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }),
      R.path('M30,0 C10,-30 22,-60 36,-90 C60,-60 66,-30 56,0Z', { c: C.red, w: 4, fill: C.yellow, gap: 4, fw: 3 })), at, 0.9, P(px + dx, pby - 268 + dy, sc));
    f.dyn = lt => `translate(${px + dx + Math.sin(lt * 7 + ph) * 4},${pby - 268 + dy}) scale(${sc * (1 + Math.sin(lt * 11 + ph) * 0.06)},${sc * (1 + Math.sin(lt * 9 + ph * 2) * 0.12 + 0.05)}) rotate(${Math.sin(lt * 5 + ph) * 3})`;
    return f;
  };
  flame(0, 20, 1.15, 0, 14.9); flame(-60, 40, 0.8, 2, 15.3); flame(60, 40, 0.85, 4, 15.7);
  s.sfx('fire', 14.9);
  // искры
  s.anim(15.8, null, g => { g.sp = []; for (let i = 0; i < 6; i++) g.sp.push(el('circle', { r: 5, fill: C.orange }, g)); },
    (lt, g) => g.sp.forEach((c, i) => { const ph = (lt * 0.5 + i / 6) % 1;
      c.setAttribute('cx', px - 50 + i * 20 + Math.sin(lt * 3 + i) * 14); c.setAttribute('cy', pby - 400 - ph * 150);
      c.setAttribute('opacity', 1 - ph); c.setAttribute('r', 6 - ph * 4); }));
  T('ТЫСЯЧА ВИДЕОКАРТ', 15.4, 1.3, px, pby + 62, 32, C.ink);

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
    s.sfx('error', at, 0.9);
  };
  win(16.9, 1005, 240, 190, -4);
  win(17.7, 1215, 255, 190, 3);
  win(18.6, 1105, 350, 190, 2);

  /* ---- ноутбук, который помнит динозавров ---- */
  const lx = 1470, lby = 870;
  s.d(S(R.poly([[-75, -95], [75, -95], [75, -10], [-75, -10]], { c: ink, w: 4, fill: C.ltblue, fs: 'solid' }),
    R.poly([[-95, -10], [95, -10], [110, 8], [-110, 8]], { c: ink, w: 4, fill: C.gray, gap: 5, fw: 2 }),
    R.lin([[-50, -70], [-20, -50], [0, -78], [20, -48], [50, -70]], { c: C.red, w: 4, r: 0.6 }),
    // трещина
    R.lin([[40, -95], [30, -70], [48, -52], [40, -10]], { c: ink, w: 2.5, r: 0.5 })), 20.2, 1.2, P(lx, lby, 0.85));
  // динозавр (бронтозавр)
  s.d(S(R.ell(0, -30, 90, 44, { c: C.green, w: 4, fill: C.ltgreen, gap: 5, fw: 2.5, r: 0.8 }),
    R.curve([[-30, -44], [-60, -80], [-62, -120], [-48, -140]], { c: C.green, w: 5 }),
    R.ell(-42, -144, 30, 20, { c: C.green, w: 4, fill: C.ltgreen, gap: 5, fw: 2.5, r: 0.6 }),
    R.circ(-48, -148, 5, { c: ink, w: 2, fill: ink, fs: 'solid', r: 0.3 }),
    R.curve([[44, -34], [76, -28], [100, -10]], { c: C.green, w: 5 }),
    R.line(-20, -10, -20, 12, { c: C.green, w: 5, r: 0.4 }), R.line(22, -10, 22, 12, { c: C.green, w: 5, r: 0.4 })), 22.2, 0.9, P(lx + 10, lby - 120, 0.75));
  T('ноутбук помнит', 21.5, 0.9, lx, lby + 55, 28, C.ink);
  T('динозавров', 22.6, 0.8, lx, lby + 85, 28, C.ink);

  /* ---- программист с капельницей ---- */
  const mx = 1775, mby = 940;
  const bagBase = P(mx, mby);
  s.d(S(K.man({ expr: 'sad', hair: C.gray, shirt: 'solid' }),
    // огромные мешки под глазами
    R.ell(-18, -246, 26, 11, { c: '#5B3A8C', w: 2.5, fill: '#7B5AA8', gap: 3, fw: 2, r: 0.4 }),
    R.ell(18, -246, 26, 11, { c: '#5B3A8C', w: 2.5, fill: '#7B5AA8', gap: 3, fw: 2, r: 0.4 })), 23.4, 2.0, bagBase);
  // капельница на колёсиках: стойка, крючок, прозрачный пакет с кофе, камера, трубка к руке
  const sx = 1590, bx = 1652;
  s.d(S(R.line(sx, 925, sx, 470, { c: ink, w: 6, r: 0.6 }), R.line(sx - 40, 925, sx + 40, 925, { c: ink, w: 6, r: 0.5 }),
    R.line(sx - 40, 925, sx - 46, 938, { c: ink, w: 4, r: 0.3 }), R.line(sx + 40, 925, sx + 46, 938, { c: ink, w: 4, r: 0.3 }),
    R.circ(sx - 46, 946, 16, { c: ink, w: 4, fill: C.gray, fs: 'solid', r: 0.4 }), R.circ(sx + 46, 946, 16, { c: ink, w: 4, fill: C.gray, fs: 'solid', r: 0.4 }),
    R.lin([[sx, 470], [sx + 40, 462], [bx, 472], [bx, 500]], { c: ink, w: 5, r: 0.5 })), 24.6, 1.4);
  s.d(S(R.poly([[-55, 0], [55, 0], [60, 150], [0, 168], [-60, 150]], { c: ink, w: 4, fill: '#E9F4FB', fs: 'solid', r: 0.8 }),
    R.poly([[-56, 48], [56, 48], [60, 150], [0, 168], [-60, 150]], { c: C.brown, w: 3, fill: C.brown, gap: 4, fw: 3, r: 0.6 }),
    R.line(-55, 48, 55, 48, { c: ink, w: 3, r: 0.5 }), R.line(0, 168, 0, 180, { c: ink, w: 4, r: 0.3 })), 25.6, 1.1, P(bx, 502));
  T('КОФЕ', 26.4, 0.5, bx, 640, 34, C.white);
  // камера капельницы + трубка
  s.d(S(R.rect(bx - 15, 686, 30, 46, { c: ink, w: 3.5, fill: '#E9F4FB', fs: 'solid', r: 0.5 }), R.line(bx, 680, bx, 686, { c: ink, w: 3, r: 0.2 })), 26.0, 0.4);
  s.d(R.curve([[bx, 732], [bx, 790], [bx + 20, 830], [mx - 76, 828]], { c: '#7A5A3A', w: 3, r: 0.4 }), 26.3, 0.7);
  // капли в камере
  s.anim(26.8, null, g => { g.dr = []; for (let i = 0; i < 2; i++) g.dr.push(el('path', { d: 'M0,-7 C6,1 6,7 0,7 C-6,7 -6,1 0,-7Z', fill: C.brown, stroke: ink, 'stroke-width': 1.2 }, g)); },
    (lt, g) => g.dr.forEach((d, i) => { const ph = (lt * 1.1 + i / 2) % 1; d.setAttribute('transform', `translate(${bx},${694 + ph * 28})`); d.setAttribute('opacity', 1 - ph * 0.5); }));
  // кофе бежит по трубке
  s.anim(26.8, null, g => { g.q = el('circle', { r: 4, fill: C.brown }, g); },
    (lt, g) => { const ph = (lt * 0.45) % 1; const a = ph < 0.5 ? [bx, 732 + ph * 2 * 70] : [bx + 20 + (mx - 76 - bx - 20) * (ph - 0.5) * 2, 802 + 26 * Math.sin((ph - 0.5) * 3)]; g.q.setAttribute('cx', a[0]); g.q.setAttribute('cy', a[1]); });
  s.sfx('ding', 26.8, 0.5);

  /* облачко программиста */
  s.bub('Если я ещё раз увижу вылет на Windows 7, я сам выйду в окно...', 26.6, 1690, 335, 1775, 610, { maxW: 340, fs: 38 });

  /* ---- надгробие и 12 FPS ---- */
  const gx = 1305, gby = 870;
  s.d(S(R.path('M-70,0 L-70,-120 C-70,-190 70,-190 70,-120 L70,0Z', { c: ink, w: 5, fill: '#CFD3DA', gap: 7, fw: 2.5 }),
    R.line(-80, 0, 80, 0, { c: ink, w: 5, r: 0.8 })), 28.5, 1.1, P(gx, gby));
  T('RIP', 29.5, 0.5, gx, gby - 110, 38, ink);
  T('GTX 1060', 29.9, 0.6, gx, gby - 72, 24, ink);
  s.d(S(R.line(-12, 6, -12, 28, { c: C.green, w: 4, r: 0.4 }), R.circ(-12, 4, 14, { c: C.pink, w: 3, fill: C.pink, fs: 'solid', r: 0.5 })), 30.6, 0.4, P(gx + 55, gby - 4));
  const fps = T('12 FPS', 32.0, 0.8, px, 1000, 62, C.red, { rot: -4 });
  s.sfx('zap', 32.0, 0.6);
})();
