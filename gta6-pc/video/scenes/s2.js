/* Сцена 2 — «Как ободрать игрока дважды»: касса Take-Two, конвейер, кошелёк, пресс и дефибриллятор. */
(function () {
  const { R, S, C, clamp, el } = E, K = window.K, { P } = G;
  const s = G.mk(1), k = s.k, ink = C.ink;
  const ease = E.ease, spring = E.spring;
  const sm = (a, b, n) => clamp((n - a) / (b - a));
  const hat = (c, g = 7, w = 3) => ({ c: ink, fill: c, gap: g, fw: w, w: 4 });
  const BELT = 720, FLOOR = 826;               // верх ленты и пол
  const X1 = 560, X2 = 1360;                   // отметки «Консоли» / «ПК-версия»
  const T1 = 14.0, Z = 15.7, T2 = 19.5;        // удар пресса 1, разряд, удар пресса 2
  const REST = 340, DOWN = 698;                // низ плиты пресса: в покое / внизу

  /* ---------- состояние кошелька как функция номинального времени ---------- */
  const wx = n => 400 + 160 * ease(sm(11.6, 12.6, n)) + 800 * ease(sm(16.5, 18.7, n));
  const pb = (n, T) => { // низ плиты пресса
    let p = 0;
    if (n >= T - 0.7 && n < T) p = Math.pow((n - (T - 0.7)) / 0.7, 2.2);
    else if (n >= T && n < T + 0.5) p = 1;
    else if (n >= T + 0.5 && n < T + 1.6) p = 1 - ease((n - T - 0.5) / 1.1);
    return REST + (DOWN - REST) * p;
  };
  function wallet(n) {
    let sy = 1;
    if (n >= Z + 0.1) sy = 0.16 + 0.84 * spring((n - Z - 0.1) / 0.7);
    else if (n >= T1 - 0.7) sy = n >= T1 ? 0.16 : clamp((BELT - pb(n, T1)) / 150, 0.16, 1);
    if (n >= T2 - 0.7) sy = n >= T2 ? 0.16 : Math.min(sy, clamp((BELT - pb(n, T2)) / 150, 0.16, 1));
    let dy = 0, dx = 0, rot = 0;
    const seg = (a, b) => { const p = sm(a, b, n); return p > 0 && p < 1 ? Math.min(1, p * 6, (1 - p) * 6) : 0; };
    dy -= Math.abs(Math.sin(n * 11)) * 11 * Math.max(seg(11.6, 12.6), seg(16.5, 18.7));
    if (n >= Z && n < Z + 0.55) { const j = 1 - (n - Z) / 0.55; dx = Math.sin(n * 80) * 7 * j; rot = Math.sin(n * 60) * 4 * j; dy -= Math.abs(Math.sin((n - Z) * 14)) * 16 * j; }
    if (n < T1 - 0.8) rot += Math.sin(n * 5) * 1.2;
    return { x: wx(n) + dx, y: BELT + dy, sy, sx: 1 + (1 - Math.min(sy, 1)) * 0.5, rot };
  }
  const face = n => n < T1 - 0.8 ? 'smile' : n < T1 ? 'scared' : n < Z + 0.15 ? 'X' : n < T2 - 2 ? 'sad' : n < T2 ? 'scared' : 'X';
  const wtf = w => `translate(${w.x},${w.y}) rotate(${w.rot}) scale(${w.sx},${w.sy})`;

  /* ---------- заголовок ---------- */
  s.txt('ПРИЧИНА №1: ДВОЙНЫЕ ПРОДАЖИ', 0.2, 2.2, 960, 112, 76, C.red, { anchor: 'middle' });

  /* ---------- балка и касса ---------- */
  s.d(R.rect(420, 165, 1100, 30, hat(C.gray, 8, 2.5)), 2.4, 0.7);
  const reg = s.d(S(
    R.line(800, 195, 800, 232, { w: 5 }), R.line(1120, 195, 1120, 232, { w: 5 }),
    R.poly([[790, 330], [1130, 330], [1175, 545], [745, 545]], hat(C.green, 7, 3)),
    R.rect(815, 225, 290, 100, { w: 6, fill: C.white, fs: 'solid' }),
    R.rect(845, 392, 230, 72, { w: 4, fill: C.white, fs: 'solid' }),
    R.line(790, 505, 1130, 505, { w: 4 }), R.rect(920, 508, 80, 22, { w: 4, fill: C.yellow, fs: 'solid' }),
    [0, 1, 2, 3, 4].map(i => R.circ(850 + i * 55, 355, 28, { w: 3.5, fill: C.yellow, fs: 'solid', r: 0.8 })).flat()), 2.9, 2.6);
  reg.dyn = lt => `rotate(${Math.sin(lt * 2.6) * 0.7} 960 195)`;
  s.txt('Take-Two', 5.2, 1.0, 960, 448, 52, ink, { anchor: 'middle' });
  s.txt('$', 5.6, 0.4, 783, 465, 80, C.ink, { anchor: 'middle', rot: -14 });
  s.txt('$', 5.8, 0.4, 1137, 465, 80, C.ink, { anchor: 'middle', rot: 14 });
  // счётчик на кассе
  {
    let t;
    s.anim(5.4, 1e9, g => { t = el('text', { 'font-family': 'Neucha, Caveat, sans-serif', 'font-size': 66, 'text-anchor': 'middle', fill: ink, stroke: ink, 'stroke-width': 1.4 }, g); },
      lt => {
        const n = lt / k + 5.4, tsw = n < T1 + 1.4 ? 0 : n < T2 + 1.4 ? T1 + 1.4 : T2 + 1.4;
        const v = tsw === 0 ? 'x0' : tsw === T1 + 1.4 ? 'x1' : 'x2!';
        if (t.textContent !== v) t.textContent = v;
        t.setAttribute('fill', v === 'x2!' ? C.red : ink); t.setAttribute('stroke', v === 'x2!' ? C.red : ink);
        const sc = 1 + 0.45 * Math.max(0, 1 - (n - tsw) / 0.45) * (tsw ? 1 : 0), cy = 296;
        t.setAttribute('transform', `translate(960,${cy}) scale(${sc}) translate(-960,${-cy})`); t.setAttribute('x', 960); t.setAttribute('y', cy);
      });
  }

  /* ---------- конвейер ---------- */
  s.d(R.line(60, FLOOR, 1860, FLOOR, { c: C.gray, w: 4, r: 1.6 }), 5.8, 0.6);
  s.d(S(R.rect(340, BELT, 1180, 50, { w: 5, fill: C.gray, gap: 8, fw: 2.5 }), R.line(460, BELT + 50, 460, FLOOR, { w: 6 }), R.line(1400, BELT + 50, 1400, FLOOR, { w: 6 }),
    R.circ(352, BELT + 25, 54, { w: 5, fill: C.white, fs: 'solid' }), R.circ(1508, BELT + 25, 54, { w: 5, fill: C.white, fs: 'solid' })), 6.0, 1.2);
  {
    const treads = [], spokes = [];
    s.anim(7.1, 1e9, g => {
      for (let i = 0; i < 20; i++) treads.push(el('line', { y1: BELT + 8, y2: BELT + 42, stroke: ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, g));
      [352, 1508].forEach(cx => { for (let a = 0; a < 2; a++) spokes.push({ cx, e: el('line', { stroke: ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, g) }); });
    }, lt => {
      const n = lt / k + 7.1, off = wx(n) - 400;
      treads.forEach((l, i) => { const x = 372 + ((i * 59 + off) % 1180 + 1180) % 1180 * 0.98; l.setAttribute('x1', x - 7); l.setAttribute('x2', x + 7); l.style.display = x > 1496 ? 'none' : ''; });
      spokes.forEach((q, i) => { const a = off / 26 + i * Math.PI / 2, r = 20; q.e.setAttribute('x1', q.cx - Math.cos(a) * r); q.e.setAttribute('y1', BELT + 25 - Math.sin(a) * r);
        q.e.setAttribute('x2', q.cx + Math.cos(a) * r); q.e.setAttribute('y2', BELT + 25 + Math.sin(a) * r); });
    });
  }

  /* ---------- прессы ---------- */
  [[X1, 7.2], [X2, 7.5]].forEach(([px, at], idx) => {
    const T = idx ? T2 : T1;
    s.d(S(R.rect(px - 52, 195, 104, 52, hat(C.ltblue, 7, 2.5)), R.line(px - 52, 215, px + 52, 215, { w: 3 })), at, 0.5);
    const rod = s.d(R.rect(-16, 0, 32, 100, hat('#C9CDD3', 7, 2.5)), at + 0.2, 0.3, `translate(${px},247) scale(1,0.3)`);
    rod.dyn = lt => `translate(${px},247) scale(1,${Math.max(0.05, (pb(lt / k + at + 0.2, T) - 60 - 247) / 100)})`;
    const pl = s.d(S(R.rect(-72, -62, 144, 62, hat(C.red, 6, 3)), R.rect(-80, -14, 160, 14, { w: 4, fill: C.gray, fs: 'solid' }),
      K.face(0, -34, 26, 'angry'), R.lin([[-24, -4], [-16, 8], [-8, -4], [0, 8], [8, -4], [16, 8], [24, -4]], { w: 3 })), at + 0.4, 0.5, `translate(${px},${REST})`);
    pl.dyn = lt => `translate(${px},${pb(lt / k + at + 0.4, T)})`;
  });
  s.sfx('squish', T1 - 0.05); s.sfx('squish', T2 - 0.05);

  /* ---------- подписи отметок ---------- */
  s.d(S(R.line(X1 - 40, BELT + 4, X1 + 40, BELT + 44, { c: C.red, w: 6 }), R.line(X1 + 40, BELT + 4, X1 - 40, BELT + 44, { c: C.red, w: 6 })), 8.0, 0.4);
  s.d(S(R.line(X2 - 40, BELT + 4, X2 + 40, BELT + 44, { c: C.red, w: 6 }), R.line(X2 + 40, BELT + 4, X2 - 40, BELT + 44, { c: C.red, w: 6 })), 8.4, 0.4);
  s.txt('КОНСОЛИ', 8.4, 0.9, X1, 905, 56, C.blue, { anchor: 'middle' });
  s.txt('ПК-ВЕРСИЯ', 10.1, 1.0, X2, 905, 56, C.green, { anchor: 'middle' });
  s.txt('(80 баксов)', 14.0, 0.8, X1, 958, 38, C.gray, { anchor: 'middle' });
  s.txt('моды и FPS', 17.4, 1.0, X2 + 20, 958, 38, C.gray, { anchor: 'middle' });

  /* ---------- кошелёк ---------- */
  const wBody = s.d(S(
    R.poly([[-48, -150], [-40, -182], [44, -186], [52, -150]], { w: 4, fill: C.ltgreen, fs: 'solid' }), R.circ(2, -166, 22, { w: 3, r: 0.6 }),
    R.rect(-88, -150, 176, 150, { w: 6, fill: C.brown, gap: 6, fw: 3 }),
    R.lin([[-88, -126], [0, -104], [88, -126]], { w: 5 }), R.circ(0, -104, 20, { w: 4, fill: C.yellow, fs: 'solid' }),
    R.line(-60, -22, -20, -22, { w: 3 }), R.line(30, -22, 66, -22, { w: 3 })), 8.6, 1.4, wtf(wallet(8.6)));
  wBody.dyn = lt => wtf(wallet(lt / k + 8.6));
  const xEyes = S(R.line(-26, -84, -10, -68, { w: 4, r: 0.4 }), R.line(-10, -84, -26, -68, { w: 4, r: 0.4 }),
    R.line(10, -84, 26, -68, { w: 4, r: 0.4 }), R.line(26, -84, 10, -68, { w: 4, r: 0.4 }),
    R.curve([[-18, -40], [-8, -46], [2, -38], [12, -44], [20, -38]], { w: 3.5, r: 0.5 }), R.ell(8, -34, 12, 14, { w: 2.5, fill: C.pink, fs: 'solid', r: 0.5 }));
  [['smile', K.face(0, -60, 36, 'smile')], ['scared', K.face(0, -60, 36, 'scared')], ['sad', K.face(0, -60, 36, 'sad')], ['X', xEyes]].forEach(([name, shape], i) => {
    const at = 10.0 + i * 0.02;
    const f = s.d(shape, at, name === 'smile' ? 0.5 : 0.05, wtf(wallet(at)));
    f.dyn = lt => { const n = lt / k + at; return { tf: wtf(wallet(n)), op: face(n) === name ? 1 : 0 }; };
  });

  /* купюры «$79.99» улетают в кассу */
  [[T1, X1, 650, 640, 330, 850, 455], [T2, X2, 650, 1280, 330, 1070, 455]].forEach(([T, x0, y0, cx1, cy1, x2, y2]) => {
    const at = T + 0.1;
    let g0, r0, t0;
    s.anim(at, T + 1.6, g => {
      g0 = el('g', {}, g);
      r0 = el('rect', { x: -70, y: -32, width: 140, height: 64, rx: 6, fill: C.ltgreen, stroke: ink, 'stroke-width': 4 }, g0);
      el('rect', { x: -60, y: -23, width: 120, height: 46, rx: 4, fill: 'none', stroke: ink, 'stroke-width': 2 }, g0);
      t0 = el('text', { 'text-anchor': 'middle', y: 11, 'font-family': 'Neucha, Caveat, sans-serif', 'font-size': 36, fill: ink, stroke: ink, 'stroke-width': 0.8 }, g0);
      t0.textContent = '$79.99';
    }, lt => {
      const n = lt / k + at, p = clamp(n - at) / 1.4, q = 1 - p, ee = ease(Math.min(1, p));
      const x = q * q * x0 + 2 * q * p * cx1 + p * p * x2, y = q * q * y0 + 2 * q * p * cy1 + p * p * y2;
      const pop = n < at + 0.25 ? 0.4 + 0.6 * spring((n - at) / 0.25) : 1;
      g0.setAttribute('transform', `translate(${x},${y - 20 * Math.sin(Math.min(1, p) * Math.PI)}) rotate(${Math.sin(p * 9) * 18}) scale(${pop * (1 - 0.55 * ee)})`);
      g0.setAttribute('opacity', p > 0.92 ? clamp((1 - p) / 0.08) : 1);
    });
    s.sfx('cash', T + 1.5);
    // искры на кассе
    s.anim(T + 1.45, T + 2.2, g => { for (let i = 0; i < 10; i++) el('line', { stroke: i % 2 ? C.orange : C.yellow, 'stroke-width': 7, 'stroke-linecap': 'round', 'data-i': i }, g); },
      (lt, g) => { const n = lt / k, e = ease(clamp(n / 0.7)); [...g.children].forEach((l, i) => { const a = i / 10 * Math.PI * 2, r0_ = 190 + e * 40, r1 = r0_ + 28 + (1 - e) * 20;
        l.setAttribute('x1', 960 + Math.cos(a) * r0_ * 1.35); l.setAttribute('y1', 275 + Math.sin(a) * r0_ * 0.42); l.setAttribute('x2', 960 + Math.cos(a) * r1 * 1.35); l.setAttribute('y2', 275 + Math.sin(a) * r1 * 0.42); });
        g.setAttribute('opacity', clamp(1 - n / 0.7)); });
  });

  /* ---------- игрок с дефибриллятором ---------- */
  const px0 = 190;
  const pl = s.d(S(
    R.rect(-30, -168, 60, 92, hat(C.ltblue, 7, 3)),
    R.circ(0, -208, 80, { w: 5, fill: C.skin, fs: 'solid' }), K.face(0, -208, 40, 'angry'),
    R.lin([[-30, -250], [-20, -278], [-8, -256], [4, -284], [14, -258], [30, -274], [32, -246]], { w: 4 }),
    R.line(-16, -76, -26, 0, { w: 6 }), R.line(16, -76, 26, 0, { w: 6 }), R.line(-40, 0, -14, 0, { w: 6 }), R.line(14, 0, 42, 0, { w: 6 }),
    R.lin([[-30, -150], [-58, -120], [-46, -92]], { w: 6 }), R.lin([[30, -150], [66, -128], [92, -140]], { w: 6 }),
    R.rect(76, -168, 80, 50, { w: 5, fill: C.orange, gap: 7, fw: 3 }), R.lin([[104, -160], [94, -142], [112, -142], [102, -124]], { c: C.red, w: 5 }),
    R.line(118, -168, 118, -178, { w: 4 }), R.circ(131, -172, 10, { w: 3, fill: C.red, fs: 'solid' })), 12.6, 1.4, P(px0, FLOOR));
  pl.dyn = lt => `translate(${px0},${FLOOR + Math.abs(Math.sin(lt * 9)) * -3}) rotate(${Math.sin(lt * 4) * 1.2})`;
  s.bub('Вставай, там мод на Шрека вышел!', 14.6, 245, 372, 190, 535, { maxW: 340, fs: 42 });

  /* ---------- электроды ---------- */
  const padY = n => { const d = sm(14.2, 15.2, n), u = sm(Z + 0.9, Z + 1.9, n); return 330 + 360 * ease(d) - 360 * ease(u); };
  [[455, -1], [665, 1]].forEach(([px, sg]) => {
    const at = 13.8;
    s.d(R.line(0, 0, 0, 100, { w: 6, c: ink, r: 0.5 }), at, 0.2, `translate(${px},195)`).dyn = lt => ({ tf: `translate(${px},195) scale(1,${Math.max(0.02, (padY(lt / k + at) - 112 - 195) / 100)})`, op: lt / k + at > Z + 1.9 ? 0 : 1 });
    const pd = s.d(S(R.rect(-30, -36, 60, 36, { w: 5, fill: C.gray, gap: 6, fw: 3 }), R.rect(-11, -112, 22, 78, { w: 5, fill: C.orange, gap: 6, fw: 3 }), R.line(-22, -17, 22, -17, { c: C.white, w: 4 })), at, 0.3, `translate(${px},${padY(at)})`);
    pd.dyn = lt => { const n = lt / k + at; return { tf: `translate(${px},${padY(n)}) rotate(${sg * -6 * (1 - sm(14.5, 15.2, n))})`, op: n > Z + 1.9 ? 0 : 1 }; };
  });
  s.sfx('defib', Z - 1.0); s.sfx('zap', Z); s.sfx('boom', Z + 0.05, 0.5);
  // разряд и «БАХ!»
  s.anim(Z, Z + 1.4, g => { el('path', { stroke: C.orange, fill: 'none', 'stroke-width': 11, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g); el('path', { stroke: C.yellow, fill: 'none', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g); },
    (lt, g) => {
      const n = lt / k, f = Math.floor(n * 22), rnd = i => { const v = Math.sin((f + 1) * 91.7 + i * 47.3) * 43758.5453; return v - Math.floor(v); };
      let d = '';
      [[455, 1], [665, -1]].forEach(([x0, dir], b) => { let x = x0 + dir * 22, y = 690; d += `M${x0 + dir * 10},686`;
        for (let i = 0; i < 5; i++) { x += dir * (14 + rnd(i + b * 9) * 14); y = 690 - (i % 2 ? -1 : 1) * (10 + rnd(i + 3 + b * 9) * 26); d += `L${x},${y}`; } d += `L${560 + dir * -6},694`; });
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 5); const r1 = 30 + rnd(i + 20) * 40, r2 = r1 + 36 + rnd(i + 30) * 30;
        d += `M${560 + Math.cos(a) * r1},${690 + Math.sin(a) * r1 * 0.9}L${560 + Math.cos(a) * r2},${690 + Math.sin(a) * r2 * 0.9}`; }
      [...g.children].forEach(p => p.setAttribute('d', d)); g.setAttribute('opacity', n < 1.0 ? 1 : clamp((1.4 - n) / 0.4));
    });
  s.anim(Z, Z + 2.0, g => {
    const pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i % 2 ? 86 : 128; pts.push([Math.cos(a) * r * 1.12, Math.sin(a) * r * 0.9]); }
    el('path', { d: 'M' + pts.map(p => p.join(',')).join('L') + 'Z', fill: C.yellow, stroke: C.orange, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
    const t = el('text', { 'text-anchor': 'middle', y: 24, 'font-family': 'Neucha, Caveat, sans-serif', 'font-size': 88, fill: C.red, stroke: C.red, 'stroke-width': 2.5 }, g); t.textContent = 'БАХ!';
  }, (lt, g) => { const n = lt / k; g.setAttribute('transform', `translate(${560 + Math.sin(n * 70) * 4 * Math.max(0, 1 - n)},${440}) scale(${Math.max(0.01, spring(n / 0.35))}) rotate(${-8 + Math.sin(n * 30) * 2})`); g.setAttribute('opacity', clamp((2.0 - n) / 0.45)); });

  /* ---------- реплика кошелька ---------- */
  s.bub('Добейте меня, я больше не могу...', 17.6, 960, 946, 990, 715, { maxW: 470, fs: 42 });

  /* ---------- «поплачет на форуме...» ---------- */
  s.txt('поплачет на форуме...', 22.4, 1.3, 1300, 590, 40, C.gray, { anchor: 'middle' });
  s.txt('проклянёт менеджеров...', 23.9, 1.4, 1300, 638, 40, C.gray, { anchor: 'middle' });
  s.txt('...и принесёт деньги дважды!', 25.7, 1.6, 590, 625, 46, C.red, { anchor: 'middle', rot: -3 });

  /* ---------- «уже прокатило» ---------- */
  s.txt('GTA V — уже прокатило', 27.0, 1.4, 1800, 272, 36, C.blue, { anchor: 'end' });
  s.d(K.mark('check', 1835, 252, 0.7, C.green), 28.5, 0.4);
  s.txt('RDR 2 — тоже', 29.3, 1.0, 1800, 342, 36, C.blue, { anchor: 'end' });
  s.d(K.mark('check', 1835, 322, 0.7, C.green), 30.4, 0.4);

  /* ---------- дойная корова ---------- */
  const cx = 1740, cs = 0.82;
  const cow = s.d(S(
    R.line(-96, -64, -96, 0, { w: 9 }), R.line(-52, -64, -52, 0, { w: 9 }), R.line(70, -64, 70, 0, { w: 9 }), R.line(112, -64, 112, 0, { w: 9 }),
    R.ell(0, -124, 250, 130, { w: 6, fill: C.white, fs: 'solid' }),
    R.ell(-50, -150, 70, 50, { w: 2, c: ink, fill: ink, fs: 'solid', r: 0.5 }), R.ell(60, -108, 60, 44, { w: 2, c: ink, fill: ink, fs: 'solid', r: 0.5 }), R.ell(90, -170, 46, 34, { w: 2, c: ink, fill: ink, fs: 'solid', r: 0.5 }),
    R.curve([[122, -150], [160, -130], [158, -90], [148, -60]], { w: 5 }), R.ell(148, -52, 20, 30, { w: 3, fill: ink, fs: 'solid', r: 0.5 }),
    R.circ(-150, -158, 96, { w: 6, fill: C.white, fs: 'solid' }), R.ell(-186, -134, 74, 52, { w: 4, fill: C.pink, fs: 'solid' }), K.face(-142, -178, 40, 'happy'),
    R.lin([[-176, -204], [-186, -240], [-164, -224]], { w: 5 }), R.lin([[-116, -206], [-100, -240], [-96, -212]], { w: 5 }),
    R.ell(-110, -214, 40, 22, { w: 4, fill: ink, fs: 'solid', r: 0.5 }),
    R.ell(10, -58, 70, 46, { w: 5, fill: C.pink, gap: 6, fw: 3 }), R.line(-12, -38, -12, -24, { w: 5 }), R.line(10, -34, 10, -20, { w: 5 }), R.line(32, -38, 32, -24, { w: 5 })), 29.6, 1.6, P(cx, FLOOR, cs));
  cow.dyn = lt => `translate(${cx},${FLOOR + Math.abs(Math.sin(lt * 5)) * -2}) scale(${cs}) rotate(${Math.sin(lt * 3) * 0.6})`;
  s.txt('ДОЙНАЯ КОРОВА', 30.8, 1.0, 1700, 905, 50, C.orange, { anchor: 'middle' });
  { // монеты капают из вымени
    const coins = [];
    s.anim(31.2, 1e9, g => { for (let i = 0; i < 3; i++) { const gg = el('g', {}, g); el('circle', { r: 15, fill: C.yellow, stroke: ink, 'stroke-width': 3.5 }, gg); const t = el('text', { 'text-anchor': 'middle', y: 6, 'font-size': 18, 'font-family': 'Neucha, Caveat, sans-serif', fill: ink }, gg); t.textContent = '$'; coins.push(gg); } },
      lt => coins.forEach((c, i) => { const ph = (lt * 0.9 + i / 3) % 1; c.setAttribute('transform', `translate(${cx - 4 + i * 20},${FLOOR - 20 + ph * 26})`); c.setAttribute('opacity', ph < 0.85 ? 1 : (1 - ph) / 0.15); }));
  }
  s.bub('Му-у! А добавки можно?', 31.5, 1700, 470, 1625, 625, { maxW: 330, fs: 42 });
})();
