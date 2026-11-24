/* СЦЕНА 1: зацепка. Консольщик с GTA VI слева, скелет с ПК справа. */
(function () {
  const { R, S, C, clamp, el } = E, { P } = G, K = window.K, KG = window.KG, ink = C.ink;
  const s = G.mk(0);
  const FY = 960;

  // заголовок
  s.txt('ПОЧЕМУ GTA 6 БЕЗ ПК?', 0.2, 1.2, 960, 112, 80, C.red, { anchor: 'middle' });
  s.d(R.curve([[360, 140], [700, 152], [1100, 138], [1560, 150]], { c: C.red, w: 5, r: 1.2 }), 1.4, 0.4);
  s.d(R.line(60, FY, 1860, FY, { w: 5, r: 1.6 }), 0.3, 0.6);

  // ТВ на тумбе
  s.d(R.rect(70, 780, 440, 180, { c: ink, w: 5, fill: C.brown, gap: 9, fw: 2 }), 0.4, 0.5);
  s.d(R.rect(120, 800, 130, 52, { c: ink, w: 4, fill: C.ltblue, fs: 'solid' }), 2.3, 0.3);
  s.d(R.rect(300, 800, 130, 52, { c: ink, w: 4, fill: C.ltgreen, fs: 'solid' }), 2.8, 0.3);
  s.txt('PS5', 2.5, 0.5, 185, 920, 50, C.blue, { anchor: 'middle' });
  s.txt('XBOX', 3.25, 0.6, 365, 920, 50, C.green, { anchor: 'middle' });
  s.d(KG.tv(), 0.5, 0.8, P(290, 780));
  s.txt('GTA VI', 0.21, 0.8, 290, 664, 118, '#FFD24D', { anchor: 'middle' });
  s.txt('19 ноября 2026', 1.03, 1.3, 290, 734, 46, '#fff', { anchor: 'middle' });
  s.txt('$3,79 млрд за день!', 4.63, 1.4, 80, 478, 46, C.green, { anchor: 'start', rot: -3 });
  s.d(S(K.mark('star', 458, 440, 0.9, C.yellow)), 6.2, 0.4);

  // диван + консольщик
  const GX = 770;
  s.d(KG.sofa(440), 1.8, 0.9, P(GX, FY));
  const guy = s.d(KG.guy({ sit: true, pose: 'pad', expr: 'happy' }), 2.7, 1.6, KG.tf(GX, FY));
  const guyF = KG.life(s, [guy], GX, FY, 1, { ph: 0.4 });
  KG.blink(s, 4.4, GX, FY, 1, false, 'guy', { sit: true, f: guyF, ph: 1.1 });

  // ПК-часть: свечение позади
  const SX = 1330;
  KG.glow(s, 8.7, SX, FY - 250, 330, '#7FD6FF', 'pcg1');
  s.d(KG.chair(), 6.4, 0.7, P(SX, FY));
  const sk = s.d(KG.skeleton({ sit: true, pose: 'hug', expr: 'smile', part: 'body' }), 7.0, 0.9, KG.tf(SX, FY));
  const mon = s.d(KG.monitor(), 8.0, 0.6, KG.tf(SX, FY));
  const arms = s.d(KG.skeleton({ sit: true, pose: 'hug', part: 'arms' }), 8.7, 0.5, KG.tf(SX, FY));
  const icon = s.d(KG.playIcon(1.0), 9.8, 0.4, KG.tf(SX, FY - 285));
  const f1 = KG.life(s, [sk, mon, arms], SX, FY, 1, { ph: 0, bob: 4, sway: 0.5 });
  KG.life(s, [icon], SX, FY - 285, 1, { ph: 0, bob: 4, sway: 0.5 });
  KG.blink(s, 7.9, SX, FY, 1, false, 'skull', { sit: true, f: f1 });
  s.txt('YouTube', 10.1, 0.6, SX, FY - 212, 34, C.ink, { anchor: 'middle' });
  // наклейка
  s.d(R.rect(-168, -32, 336, 62, { c: ink, w: 3.5, fill: C.yellow, fs: 'solid', r: 0.8 }), 9.25, 0.4, P(SX + 6, FY - 150, 1, -3));
  s.txt('Продал почку ради 4K', 9.4, 0.7, SX + 6, FY - 140, 30, ink, { anchor: 'middle', rot: -3 });
  // «буферизация» на мониторе
  s.anim(10.3, null, g => { g.sp = el('path', { d: 'M0,-24 A24,24 0 0 1 24,0', fill: 'none', stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, g); },
    (lt, g) => { g.sp.setAttribute('transform', `translate(${SX + 100},${FY - 300}) rotate(${lt * 300})`); });

  // системник справа с RGB
  const TX = 1665;
  s.d(KG.tower(), 8.3, 0.7, P(TX, FY));
  s.anim(9.0, null, g => { g.strip = el('rect', { x: TX - 46, y: FY - 304, width: 7, height: 218, fill: '#f0f', rx: 3 }, g);
    g.fans = [FY - 245, FY - 150].map(cy => el('g', {}, g)); g.fans.forEach(f => [0, 1, 2, 3, 4].forEach(i => el('ellipse', { cx: 0, cy: -26, rx: 9, ry: 24, fill: '#9FB2C4', transform: `rotate(${i * 72})` }, f))); },
    (lt, g) => { g.strip.setAttribute('fill', `hsl(${(lt * 160) % 360},95%,60%)`); g.fans.forEach((f, i) => f.setAttribute('transform', `translate(${TX},${FY - (i ? 150 : 245)}) rotate(${lt * 420})`)); });
  s.txt('ПК-бояре', 7.75, 0.8, 1730, 560, 50, C.red, { anchor: 'middle', rot: 4 });
  s.d(R.lin([[1660, 585], [1630, 620], [1600, 640]], { c: C.red, w: 5, r: 0.6 }), 8.6, 0.3);
  s.d(R.lin([[1618, 612], [1600, 640], [1628, 650]], { c: C.red, w: 5, r: 0.6 }), 8.9, 0.2);

  // облачка
  s.bub('Ничего, дождусь ПК-версии... я же ещё не совсем разложился!', 10.7, 1420, 300, 1345, 444, { maxW: 500, fs: 40 });
  s.bub('Зато у тебя 240 FPS в комментариях!', 12.3, 760, 300, 785, 450, { maxW: 480, fs: 42 });
  s.sfx('ding', 0.5, 0.5);
})();
