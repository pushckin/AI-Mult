/* СЦЕНА 7: финал. Чокаются консольщик и скелет; справа звезда-инвестор в очках с мешками денег. */
(function () {
  const { R, S, C, clamp, el } = E, { P } = G, KG = window.KG, ink = C.ink;
  const s = G.mk(6);
  const FY = 900;

  s.d(R.line(60, FY, 1860, FY, { w: 5, r: 1.6 }), 0.2, 0.5);

  // чокаются
  const GX = 330, SX = 800;
  const guy = s.d(KG.guy({ sit: false, pose: 'mug', expr: 'happy' }), 0.3, 1.2, KG.tf(GX, FY));
  const sk = s.d(KG.skeleton({ sit: false, pose: 'mug', expr: 'happy' }), 1.7, 1.4, KG.tf(SX, FY, 1, true));
  const gF = lt => { const p = (lt % 2.2) / 2.2, lean = p < 0.3 ? Math.sin(p / 0.3 * Math.PI) * 3.2 : 0; return KG.tf(GX, FY + Math.sin(lt * 2.4) * -1.5, 1, false, lean + Math.sin(lt * 1.5) * 0.5); };
  const sF = lt => { const p = ((lt + 0.0) % 2.2) / 2.2, lean = p < 0.3 ? Math.sin(p / 0.3 * Math.PI) * -3.2 : 0; return KG.tf(SX, FY + Math.sin(lt * 2.4 + 1) * -1.5, 1, true, lean + Math.sin(lt * 1.5 + 1) * 0.5); };
  guy.dyn = gF; sk.dyn = sF;
  KG.blink(s, 1.5, GX, FY, 1, false, 'guy', { sit: false, f: gF, ph: 0.6 });
  KG.blink(s, 3.1, SX, FY, 1, true, 'skull', { sit: false, f: sF, look: -0.8 });

  s.txt('ЗА ОПТИМИЗАЦИЮ!', 4.73, 1.2, 565, 215, 70, C.orange, { anchor: 'middle', rot: -2 });
  s.d(R.curve([[330, 240], [560, 250], [800, 238]], { c: C.orange, w: 5, r: 1.2 }), 5.95, 0.4);
  // искры чокания
  let spark, chok;
  s.anim(3.3, null, g => {
    spark = []; for (let i = 0; i < 8; i++) spark.push(el('line', { stroke: C.yellow, 'stroke-width': 7, 'stroke-linecap': 'round' }, g));
    chok = el('text', { x: 565, y: 455, 'font-size': 56, fill: C.red, stroke: C.red, 'stroke-width': 1.2, 'font-family': 'Neucha, sans-serif', 'text-anchor': 'middle' }, g);
    chok.textContent = 'ЧОК!';
  }, lt => {
    const p = (lt % 2.2) / 2.2, a = clamp((p - 0.12) / 0.5), on = p > 0.12 && p < 0.62;
    spark.forEach((l, i) => { const ang = i / 8 * Math.PI * 2, r0 = 14 + a * 14, r1 = 34 + a * 40;
      l.setAttribute('x1', 565 + Math.cos(ang) * r0); l.setAttribute('y1', 530 + Math.sin(ang) * r0); l.setAttribute('x2', 565 + Math.cos(ang) * r1); l.setAttribute('y2', 530 + Math.sin(ang) * r1);
      l.setAttribute('opacity', on ? 1 - a * 0.6 : 0); });
    chok.setAttribute('opacity', on ? 1 : 0); chok.setAttribute('transform', `rotate(${-6 + Math.sin(lt * 20) * 2} 565 455) scale(1)`);
  });
  s.sfx('clink', 3.5, 0.9);

  // звезда-инвестор
  const bag = (cx, cy) => {
    return S(R.path(`M${cx - 20},${cy - 68} C${cx - 78},${cy - 44} ${cx - 92},${cy + 24} ${cx - 70},${cy + 58} C${cx - 40},${cy + 72} ${cx + 40},${cy + 72} ${cx + 70},${cy + 58} C${cx + 92},${cy + 24} ${cx + 78},${cy - 44} ${cx + 20},${cy - 68} Z`, { c: ink, w: 5, fill: C.green, gap: 7, fw: 3 }),
      R.poly([[cx - 22, cy - 72], [cx + 22, cy - 72], [cx + 30, cy - 98], [cx - 30, cy - 98]], { c: ink, w: 4.5, fill: C.ltgreen, fs: 'solid' }), R.line(cx - 30, cy - 70, cx + 30, cy - 70, { c: C.red, w: 7, r: 0.4 }),
      R.circ(cx, cy + 6, 70, { c: ink, w: 3, fill: '#fff', fs: 'solid', r: 0.5 }),
      R.path(`M${cx + 18},${cy - 20} C${cx},${cy - 32} ${cx - 18},${cy - 24} ${cx - 14},${cy - 8} C${cx - 10},${cy + 4} ${cx + 14},${cy + 2} ${cx + 18},${cy + 18} C${cx + 22},${cy + 34} ${cx - 6},${cy + 38} ${cx - 18},${cy + 26}`, { c: C.green, w: 7, r: 0.3 }),
      R.line(cx, cy - 38, cx, cy + 46, { c: C.green, w: 6, r: 0.3 }));
  };
  const pts = [], inner = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 78 : 160, a = -Math.PI / 2 + i * Math.PI / 5; pts.push([Math.cos(a) * r, -300 + Math.sin(a) * r]); inner.push([Math.cos(a) * r * 0.78, -300 + Math.sin(a) * r * 0.78]); }
  const arm = (sx) => R.lin([[sx * 150, -346], [sx * 214, -300], [sx * 226, -176]], { c: ink, w: 11, r: 0.4 });
  const star = S(
    R.lin([[-40, -190], [-44, -50]], { c: ink, w: 12, r: 0.4 }), R.lin([[40, -190], [44, -50]], { c: ink, w: 12, r: 0.4 }),
    R.ell(-58, -18, 80, 34, { c: ink, w: 4.5, fill: C.red, gap: 5, fw: 3 }), R.ell(60, -18, 80, 34, { c: ink, w: 4.5, fill: C.red, gap: 5, fw: 3 }),
    arm(-1), arm(1),
    bag(-236, -88), bag(236, -88),
    R.circ(-226, -176, 30, { c: ink, w: 3.5, fill: C.yellow, fs: 'solid', r: 0.5 }), R.circ(226, -176, 30, { c: ink, w: 3.5, fill: C.yellow, fs: 'solid', r: 0.5 }),
    R.poly(pts, { c: ink, w: 7, fill: C.yellow, fs: 'solid', r: 0.9 }), R.poly(inner, { c: 'none', fill: C.orange, gap: 8, fw: 2.5, ang: -40 }),
    // очки: правая линза — обычная, левая — «подмигивающая» (приплюснутая)
    R.ell(48, -296, 70, 52, { c: ink, w: 4, fill: ink, fs: 'solid', r: 0.5 }), R.ell(-48, -292, 72, 30, { c: ink, w: 4, fill: ink, fs: 'solid', r: 0.5 }),
    R.line(-12, -296, 12, -296, { c: ink, w: 6, r: 0.2 }), R.line(-84, -298, -118, -312, { c: ink, w: 6, r: 0.3 }), R.line(84, -300, 118, -314, { c: ink, w: 6, r: 0.3 }),
    R.line(34, -310, 58, -300, { c: '#fff', w: 5, r: 0.3 }), R.line(-64, -296, -50, -290, { c: '#fff', w: 4, r: 0.3 }),
    R.curve([[-78, -334], [-52, -346], [-24, -334]], { c: ink, w: 5, r: 0.4 }), R.curve([[24, -346], [52, -362], [80, -346]], { c: ink, w: 5, r: 0.4 }),
    R.arc(0, -246, 90, 56, 0.1, Math.PI - 0.1, true, { c: ink, w: 4.5, fill: '#fff', fs: 'solid', r: 0.5 }),
    R.line(-30, -234, 30, -234, { c: ink, w: 3, r: 0.3 }), R.circ(-68, -252, 22, { c: C.ltred, w: 2, fill: C.ltred, fs: 'solid', r: 0.4 }), R.circ(68, -252, 22, { c: C.ltred, w: 2, fill: C.ltred, fs: 'solid', r: 0.4 }));
  const ST = 1450;
  const sdraw = s.d(star, 6.5, 1.5, P(ST, FY));
  const sf = lt => `translate(${ST},${FY + Math.sin(lt * 3) * -4}) rotate(${Math.sin(lt * 1.8) * 1.6})`;
  sdraw.dyn = sf;
  // подмигивание-искорка и «летящие» монеты
  s.anim(8.0, null, g => { g.sp = el('g', {}, g); const pth = el('path', { d: 'M0,-22 L5,-5 L22,0 L5,5 L0,22 L-5,5 L-22,0 L-5,-5Z', fill: '#fff', stroke: ink, 'stroke-width': 3 }, g.sp); },
    (lt, g) => { const on = (lt % 2.4) < 0.5, k = on ? 0.6 + Math.sin((lt % 2.4) / 0.5 * Math.PI) * 0.6 : 0; g.sp.setAttribute('transform', `${sf(lt)} translate(-100,-340) scale(${k})`); });
  let coins = [];
  s.anim(7.9, null, g => { for (let i = 0; i < 7; i++) { const c = el('g', {}, g); el('circle', { r: 17, fill: C.yellow, stroke: ink, 'stroke-width': 3.5 }, c); const t = el('text', { y: 7, 'font-size': 22, 'text-anchor': 'middle', fill: ink, 'font-family': 'Neucha, sans-serif' }, c); t.textContent = '$'; coins.push(c); } },
    lt => coins.forEach((c, i) => { const ph = (lt * 0.45 + i / 7) % 1, side = i % 2 ? 1 : -1;
      c.setAttribute('transform', `translate(${ST + side * (236 + Math.sin(ph * 6 + i) * 30)},${FY - 190 - ph * 170}) rotate(${ph * 300 * side})`); c.setAttribute('opacity', clamp(ph * 6) * clamp((1 - ph) * 3)); }));

  s.bub('Готовьте кошельки ко второму раунду!', 8.2, 1450, 245, 1440, 478, { maxW: 520, fs: 46 });
  s.sfx('ding', 8.3, 0.6); s.sfx('coins', 6.6, 0.7);

  // призыв
  s.txt('Пиши в комментариях и подписывайся!', 10.16, 1.9, 960, 996, 62, C.blue, { anchor: 'middle', rot: -1 });
  s.d(R.curve([[380, 1016], [700, 1024], [1250, 1014], [1560, 1020]], { c: C.blue, w: 5, r: 1.3 }), 12.1, 0.4);
})();
