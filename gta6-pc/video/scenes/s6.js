/* Сцена 6: «Доживём ли до релиза на ПК?» — шкалы ожидания, пирог рынка, седой геймер с календарём. */
(function () {
  const { R, S, C, clamp, el } = E, { P } = G, K = window.K, ink = C.ink;
  const s = G.mk(5), k = s.k;
  const lerp = (a, b, p) => a + (b - a) * p;
  const eob = x => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  /* ---------- заголовок ---------- */
  s.txt('ДОЖИВЁМ ЛИ ДО РЕЛИЗА НА ПК?', 0.2, 2.0, 960, 100, 78, C.red, { anchor: 'middle' });
  s.d(R.lin([[420, 122], [700, 128], [1000, 120], [1500, 126]], { c: C.red, w: 5, r: 1.5 }), 2.0, 0.6);

  /* ---------- шкалы ожидания ---------- */
  const BX = 180, BW = 800, BH = 70;
  const rows = [{ y: 225, label: 'GTA V на ПК', col: C.red }, { y: 420, label: 'GTA 6 на ПК', col: C.orange }];
  rows.forEach((r, i) => {
    s.txt(r.label, 2.6 + i * 0.5, 1.0, BX, r.y - 13, 46, ink, {});
    s.d(R.rect(BX, r.y, BW, BH, { c: ink, w: 5, r: 1.1 }), 3.2 + i * 0.5, 1.2);
    // риски времени
    for (let j = 1; j < 4; j++) s.d(R.line(BX + BW * j / 4, r.y + BH, BX + BW * j / 4, r.y + BH + 14, { w: 3, r: 0.5 }), 4.0 + i * 0.4, 0.3);
  });
  s.txt('время ожидания после консолей  →', 4.6, 1.4, BX, 330, 30, C.gray, {});
  function fill(at, end, y, frac, col) {
    let r1;
    s.anim(at, 1e9, g => { r1 = el('rect', { x: BX + 5, y: y + 5, width: 0, height: BH - 10, fill: col, stroke: 'none', rx: 4 }, g); },
      lt => { const n = lt / k, p = clamp((n - 0) / (end - at)); r1.setAttribute('width', Math.max(0, (BW - 10) * frac * E.ease(p)));
        if (p >= 1) r1.setAttribute('opacity', 0.9 + Math.sin(n * 6) * 0.1); });
  }
  // GTA 6: шкала короткая (после слов про инсайдеров)
  fill(22.3, 25.0, 420, 0.28, C.orange);
  s.txt('Слухи: начало 2027?', 23.9, 1.4, BX + BW * 0.28 + 24, 420 + 50, 42, C.orange, {});
  s.sfx('ding', 24.9);
  // GTA V: шкала длинная
  fill(26.3, 29.5, 225, 1.0, C.red);
  s.txt('~1,5 года', 27.6, 1.2, BX + BW * 0.5, 225 + 54, 52, C.white, { anchor: 'middle' });
  s.sfx('boom', 29.5, 0.8);

  /* ---------- человечки ---------- */
  const MX = 1100, MS = 0.55, bob = lt => Math.sin(lt * 3.2) * 2.2;
  // GTA V: поседел, борода до пола
  const Y1 = 340;
  const m1 = s.d(K.man({ hair: C.gray, expr: 'sad' }), 28.0, 1.8, P(MX, Y1, MS));
  m1.dyn = lt => P(MX, Y1 + bob(lt), MS);
  const beard = S(R.poly([[-40, -242], [-38, -200], [-34, -128], [-8, -60], [8, -52], [34, -128], [38, -200], [40, -242], [22, -226], [0, -220], [-22, -226]], { c: ink, w: 3.5, fill: C.gray, gap: 5, fw: 2.5 }),
    R.curve([[-22, -228], [0, -236], [22, -228]], { c: ink, w: 4, r: 0.5 }),
    R.line(-30, -296, -10, -284, { c: C.gray, w: 7, r: 0.4 }), R.line(30, -296, 10, -284, { c: C.gray, w: 7, r: 0.4 }));
  const bd = s.d(beard, 29.0, 1.2, P(MX, Y1, MS));
  bd.dyn = lt => `translate(${MX},${Y1 + bob(lt)}) scale(${MS}) rotate(${Math.sin(lt * 2.6) * 2.5} 0 -230)`;
  // паучок на паутинке
  const spider = S(R.line(60, -330, 60, -392, { w: 2, r: 0.3 }), R.circ(60, -380 + 0, 14, { c: ink, w: 2, fill: ink, fs: 'solid', r: 0.4 }),
    R.line(52, -382, 40, -392, { w: 2, r: 0.3 }), R.line(68, -382, 80, -392, { w: 2, r: 0.3 }), R.line(52, -376, 40, -368, { w: 2, r: 0.3 }), R.line(68, -376, 80, -368, { w: 2, r: 0.3 }));
  const sp = s.d(spider, 30.3, 0.7, P(MX, Y1, MS)); sp.dyn = lt => P(MX, Y1 + bob(lt) + Math.sin(lt * 4) * 5, MS);
  s.txt('Zzz...', 30.7, 0.7, MX + 70, Y1 - 150, 30, C.gray, {});
  // GTA 6: с тростью, но бодрый
  const Y2 = 535;
  const m2 = s.d(K.man({ hair: C.orange, expr: 'happy' }), 23.9, 1.6, P(MX, Y2, MS));
  m2.dyn = lt => P(MX, Y2 - Math.abs(Math.sin(lt * 5)) * 4, MS);
  const cane = S(R.line(75, -110, 75, 0, { c: C.brown, w: 8, r: 0.5 }), R.curve([[75, -110], [75, -140], [100, -142], [102, -122]], { c: C.brown, w: 8, r: 0.5 }));
  const cn = s.d(cane, 25.2, 0.7, P(MX, Y2, MS)); cn.dyn = lt => P(MX, Y2 - Math.abs(Math.sin(lt * 5)) * 4 * 0, MS);
  s.d(K.mark('star', MX + 90, Y2 - 150, 0.9), 25.6, 0.6);

  /* ---------- круговая диаграмма ---------- */
  const PCX = 330, PCY = 810, PR = 185;
  s.d(R.circ(PCX, PCY, PR * 2, { c: ink, w: 6, fill: '#EEF1F4', fs: 'solid', r: 1.0 }), 8.0, 1.8);
  s.txt('Доля ПК в крупных релизах', 8.4, 1.8, 560, PCY - 120, 38, ink, {});
  let slice, lab;
  s.anim(11.2, 1e9, g => { slice = el('path', { fill: C.red, stroke: ink, 'stroke-width': 6, 'stroke-linejoin': 'round' }, g); },
    lt => {
      const n = lt / k + 11.2;
      const p = clamp((n - 12.74) / 1.7), f = n < 12.74 ? 0.05 : 0.05 + 0.45 * eob(p);
      const a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI * f, am = (a0 + a1) / 2;
      let off = n < 12.74 ? 0 : Math.min(1, p * 3) * 10, sh = 0;
      if (n > 11.6 && n < 12.74) sh = Math.sin(n * 70) * (n - 11.6) * 2.4;      // давление растёт
      const cx = PCX + Math.cos(am) * off + sh, cy = PCY + Math.sin(am) * off - Math.abs(sh) * 0.3;
      const x0 = cx + PR * Math.cos(a0), y0 = cy + PR * Math.sin(a0), x1 = cx + PR * Math.cos(a1), y1 = cy + PR * Math.sin(a1);
      slice.setAttribute('d', `M${cx},${cy} L${x0},${y0} A${PR},${PR} 0 ${f > 0.5 ? 1 : 0} 1 ${x1},${y1} Z`);
      const r = Math.round(lerp(0xE6, 0x2A, p)), gc = Math.round(lerp(0x39, 0x9D, p)), b = Math.round(lerp(0x46, 0x8F, p));
      slice.setAttribute('fill', `rgb(${r},${gc},${b})`);
    });
  s.txt('Раньше: 5%', 11.4, 1.0, PCX, PCY - PR - 28, 42, C.red, { anchor: 'middle' });
  s.d(R.line(PCX + 40, PCY - PR - 22, PCX + 12, PCY - PR + 12, { c: C.red, w: 4, r: 0.5 }), 12.0, 0.3);
  s.sfx('boom', 12.9, 0.9); s.sfx('cash', 14.0, 0.8);
  s.txt('50%', 14.2, 0.6, PCX + 100, PCY + 22, 64, C.white, { anchor: 'middle' });
  s.txt('45–50% рынка!', 14.5, 1.4, 560, PCY + 20, 74, C.green, {});
  s.d(R.lin([[560, PCY + 50], [760, PCY + 60], [1000, PCY + 48]], { c: C.green, w: 6, r: 1.4 }), 15.9, 0.5);
  s.sfx('ding', 14.6);
  s.txt('мимо таких денег не пройдут!', 16.7, 1.8, 560, PCY + 125, 40, ink, {});
  // купюры-доллары вылетают
  for (let i = 0; i < 3; i++) {
    const bx = 800 + i * 150, by = PCY + 205;
    s.d(S(R.rect(-38, -22, 76, 44, { c: C.green, w: 4, fill: C.ltgreen, gap: 6, fw: 2 }), R.circ(0, 0, 22, { c: C.green, w: 3 }), R.line(-4, -9, 4, 9, { c: C.green, w: 3, r: 0.3 })), 17.4 + i * 0.4, 0.6, P(bx, by, 0.9, -10 + i * 10));
  }

  /* ---------- седой геймер с календарём ---------- */
  const GX = 1470, GY = 1015, GS = 1.5;
  const gamer = S(
    R.poly([[-52, -218], [52, -218], [64, -98], [-64, -98]], { c: ink, w: 4, fill: C.ltblue, gap: 7, fw: 2.5 }),
    R.rect(-44, -98, 36, 98, { c: ink, w: 4, fill: C.brown, gap: 6, fw: 3 }), R.rect(8, -98, 36, 98, { c: ink, w: 4, fill: C.brown, gap: 6, fw: 3 }),
    R.ell(-26, 4, 64, 20, { c: ink, w: 4, fill: C.pink, gap: 5, fw: 3 }), R.ell(30, 4, 64, 20, { c: ink, w: 4, fill: C.pink, gap: 5, fw: 3 }),
    R.circ(0, -262, 88, { c: ink, w: 4.5 }),
    R.poly([[-44, -270], [-62, -262], [-58, -226], [-44, -244]], { c: ink, w: 3, fill: C.gray, gap: 4, fw: 3 }), R.poly([[44, -270], [62, -262], [58, -226], [44, -244]], { c: ink, w: 3, fill: C.gray, gap: 4, fw: 3 }),
    R.curve([[-40, -300], [-20, -312], [0, -306]], { c: C.gray, w: 5, r: 0.5 }),
    K.face(0, -266, 44, 'sad'),
    R.circ(-17, -266, 32, { c: ink, w: 3.5, r: 0.5 }), R.circ(17, -266, 32, { c: ink, w: 3.5, r: 0.5 }), R.line(-1, -266, 1, -266, { w: 3, r: 0.2 }),
    R.poly([[-40, -246], [-36, -200], [-26, -170], [0, -150], [26, -170], [36, -200], [40, -246], [22, -230], [0, -224], [-22, -230]], { c: ink, w: 3.5, fill: C.gray, gap: 5, fw: 2.5 }),
    R.lin([[-52, -205], [-92, -150], [-86, -112]], { c: ink, w: 5 }),
    R.line(-86, -112, -86, 0, { c: C.brown, w: 8, r: 0.5 }), R.curve([[-86, -112], [-86, -138], [-110, -140], [-112, -122]], { c: C.brown, w: 8, r: 0.5 }),
    R.lin([[52, -205], [82, -198], [104, -214]], { c: ink, w: 5 }),
    // календарь
    R.rect(100, -310, 134, 122, { c: ink, w: 4, fill: '#fff', fs: 'solid', r: 0.8 }), R.rect(100, -310, 134, 30, { c: C.red, w: 4, fill: C.red, fs: 'solid', r: 0.8 }),
    R.line(122, -322, 122, -298, { w: 5, r: 0.3 }), R.line(212, -322, 212, -298, { w: 5, r: 0.3 }),
    R.line(100, -249, 234, -249, { w: 2, r: 0.4 }), R.line(100, -218, 234, -218, { w: 2, r: 0.4 }),
    R.line(133.5, -280, 133.5, -188, { w: 2, r: 0.4 }), R.line(167, -280, 167, -188, { w: 2, r: 0.4 }), R.line(200.5, -280, 200.5, -188, { w: 2, r: 0.4 }));
  s.d(gamer, 2.6, 3.6, P(GX, GY, GS));
  s.txt('2027?', 6.0, 0.8, GX + 167 * GS, GY - 288 * GS, 34, C.white, { anchor: 'middle' });
  s.txt('WASD?', 5.6, 0.8, GX, GY - 112 * GS, 40, C.blue, { anchor: 'middle', rot: -3 });
  // зачёркнутые дни
  const cell = i => { const c = i % 4, r = Math.floor(i / 4); return [GX + (100 + (c + 0.5) * 33.5) * GS, GY + (-280 + (r + 0.5) * 30.7) * GS]; };
  s.anim(7.4, 1e9, g => { for (let i = 0; i < 12; i++) { const [x, y] = cell(i), q = el('g', { opacity: 0 }, g);
      E.addShape(q, S(R.line(x - 15, y - 14, x + 15, y + 14, { c: C.red, w: 4, r: 0.5 }), R.line(x + 15, y - 14, x - 15, y + 14, { c: C.red, w: 4, r: 0.5 }))); } },
    (lt, g) => { const n = lt / k; [...g.children].forEach((q, i) => q.setAttribute('opacity', n > i * 1.1 ? 1 : 0)); });
  // облачко
  s.bub('Главное — дожить до релиза и не забыть, где кнопка WASD!', 30.0, 1520, 350, 1490, GY - 322 * GS, { maxW: 450, fs: 42 });

  /* ---------- «жизнь» доски до губки ---------- */
  s.anim(31.0, 1e9, g => { E.addShape(g, K.mark('star', 0, 0, 0.8, C.yellow)); },
    (lt, g) => { g.setAttribute('transform', `translate(${1830},${600 + Math.sin(lt * 4) * 14}) rotate(${lt * 120})`); });
})();
