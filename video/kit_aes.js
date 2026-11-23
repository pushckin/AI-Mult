/* Набор для ролика про АЭС: станция, чайник, цепочка превращений, атомы, контуры, реквизит. Локальные координаты: (0,0) — низ по центру. */
(function () {
  const { R, S, C } = E, K = window.K, ink = C.ink;
  const hat = (c, g = 6, w = 3) => ({ c, fill: c, gap: g, fw: w, w: 3.5 });
  const dot = K.dot;
  const A = {};

  /* ---------- градирня / АЭС ---------- */
  A.towerPts = (w, h) => { const bw = w / 2, mw = w * 0.3, tw = w * 0.4;
    const L = [[-bw, 0], [-bw * 0.86, -h * 0.22], [-mw * 1.05, -h * 0.6], [-tw, -h]]; return { L, Rr: L.map(([x, y]) => [-x, y]) }; };
  A.tower = (w = 230, h = 340, o = {}) => {
    const { L, Rr } = A.towerPts(w, h);
    const fillPts = [L[0], L[1], L[2], [L[2][0] * 0.98, -h * 0.5], [Rr[2][0] * 0.98, -h * 0.5], Rr[2], Rr[1], Rr[0]];
    return S(R.poly(fillPts, { c: 'none', fill: C.blue, gap: o.gap || 9, fw: 2.5 }), R.curve(L, { w: 5 }), R.curve(Rr, { w: 5 }),
      R.ell(0, -h, w * 0.8, 26, { w: 4.5 }), R.line(-w / 2, 0, w / 2, 0, { w: 5 }));
  };
  A.reactorBuilding = () => S(R.rect(-80, -120, 160, 120, { w: 5, fill: C.ltblue, gap: 10, fw: 2 }),
    R.path('M-80,-120 C-80,-200 80,-200 80,-120', { w: 5 }), R.rect(-30, -70, 60, 70, { w: 4 }), R.line(-80, -120, 80, -120, { w: 4 }),
    R.rect(96, -170, 28, 170, { w: 4.5, fill: C.gray, gap: 8, fw: 2 }));
  A.ground = (x1, x2) => R.line(x1, 0, x2, 0, { w: 5, r: 1.6 });

  A.steamEl = (sc, at, end, cx, cy, n, spread = 40, rise = 240, color = '#7FA3BF', w = 6) => {
    const paths = [];
    sc.anim(at, end, g => { for (let i = 0; i < n; i++) paths.push(E.el('path', { d: 'M0,0 c16,-20 -16,-40 0,-60 c16,-20 -16,-40 0,-60', fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, g)); },
      lt => { paths.forEach((p, i) => { const ph = (lt * 0.28 + i / n) % 1, x = cx + (i / n - 0.5) * spread * 2 + Math.sin(lt * 2 + i * 2) * 8;
        p.setAttribute('transform', `translate(${x},${cy - ph * rise}) scale(${0.55 + ph * 0.7})`); p.setAttribute('opacity', Math.sin(Math.PI * ph) * 0.9); }); });
  };

  /* ---------- чайник ---------- */
  A.kettle = () => S(R.ell(0, -118, 250, 190, { w: 5, fill: C.orange, gap: 12, fw: 2.2 }),
    R.curve([[-108, -90], [-165, -125], [-205, -215]], { w: 6 }), R.curve([[-118, -165], [-150, -190], [-172, -222]], { w: 6 }),
    R.curve([[112, -190], [200, -210], [228, -125], [120, -62]], { w: 8 }),
    R.ell(0, -208, 110, 28, { w: 4.5 }), R.circ(0, -240, 28, { w: 4, fill: C.orange, gap: 4, fw: 3 }),
    R.rect(-216, -250, 34, 26, { w: 4, fill: C.orange, gap: 4, fw: 3 }), R.line(-70, 0, 70, 0, { w: 6 }),
    K.face(0, -116, 74, 'big'));
  A.kettleFace = (ex) => K.face(0, -116, 74, ex);

  /* ---------- цепочка: уголь, котёл, турбина, генератор, смартфон ---------- */
  A.coal = () => S(R.poly([[-125, 0], [-95, -52], [-62, -30], [-32, -92], [10, -62], [42, -104], [82, -52], [112, -72], [135, 0]], { w: 5, fill: ink, gap: 6, fw: 3 }),
    R.poly([[-70, -20], [-52, -38], [-35, -20]], { w: 2.5, fill: ink, fs: 'solid' }), R.poly([[40, -30], [60, -50], [78, -30]], { w: 2.5, fill: ink, fs: 'solid' }));
  A.flames = () => S(R.path('M-40,-98 C-62,-128 -48,-148 -40,-184 C-26,-150 -10,-128 -40,-98Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }),
    R.path('M12,-118 C-12,-150 4,-176 12,-214 C28,-176 42,-150 12,-118Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }),
    R.path('M58,-96 C40,-122 52,-140 58,-170 C70,-140 84,-120 58,-96Z', { c: C.red, w: 4, fill: C.orange, gap: 4, fw: 3 }));
  A.atomIcon = (r = 40, c = C.blue) => S(R.circ(0, 0, r * 0.45, { c, w: 4, fill: c, fs: 'solid', r: 0.6 }),
    R.ell(0, 0, r * 2.2, r * 0.8, { c, w: 3.5, r: 0.8 }), R.path(`M${-r * 0.55},${-r * 0.95} L${r * 0.55},${r * 0.95}`, { c: 'none', w: 1 }).slice(0, 0),
    R.ell(0, 0, r * 0.8, r * 2.2, { c, w: 3.5, r: 0.8 }));
  A.boiler = () => S(R.poly([[-95, -90], [-62, -102], [-30, -86], [0, -102], [30, -86], [62, -102], [95, -90], [95, 0], [-95, 0]], { c: C.blue, w: 4, fill: C.blue, gap: 7, fw: 2.5 }),
    R.rect(-100, -150, 200, 150, { w: 5.5 }), R.circ(-40, -45, 16, { c: C.blue, w: 3 }), R.circ(10, -30, 11, { c: C.blue, w: 3 }), R.circ(50, -58, 14, { c: C.blue, w: 3 }),
    R.line(40, -150, 40, -205, { w: 6 }), R.line(40, -205, 130, -205, { w: 6 }));
  A.steamArrows = () => S(R.curve([[-40, -170], [-52, -205], [-36, -240]], { c: C.orange, w: 6 }), R.lin([[-52, -228], [-36, -244], [-22, -226]], { c: C.orange, w: 6 }),
    R.curve([[10, -170], [-2, -205], [14, -240]], { c: C.orange, w: 6 }), R.lin([[-2, -228], [14, -244], [28, -226]], { c: C.orange, w: 6 }));
  A.turbineCase = () => S(R.circ(0, -110, 190, { w: 5.5 }), R.circ(0, -110, 40, { w: 4, fill: ink, fs: 'solid' }), R.line(-190, -110, -95, -110, { w: 6 }), R.line(95, -110, 190, -110, { w: 6 }),
    R.rect(-70, -15, 140, 15, { w: 5 }), R.line(-40, -15, -60, -30, { w: 4 }), R.line(40, -15, 60, -30, { w: 4 }));
  A.blades = (r = 80, n = 6, c = C.blue) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = 0.32;
    out.push(R.poly([[0, 0], [r * Math.cos(a - b), r * Math.sin(a - b)], [r * 1.05 * Math.cos(a), r * 1.05 * Math.sin(a)], [r * Math.cos(a + b), r * Math.sin(a + b)]], { c: ink, w: 3.5, fill: c, gap: 5, fw: 3 })); } return S(...out); };
  A.generator = () => S(R.rect(-95, -160, 190, 160, { w: 5.5, fill: C.ltblue, gap: 12, fw: 2 }), R.circ(0, -80, 100, { w: 4.5 }),
    R.path('M-30,-80 C-30,-118 0,-118 0,-80 C0,-42 30,-42 30,-80', { c: ink, w: 5 }), R.line(-95, -80, -150, -80, { w: 6 }), R.line(95, -80, 150, -80, { w: 6 }),
    R.rect(-70, -10, 140, 10, { w: 4 }));
  A.bolt = (s = 1) => R.poly([[16, -215], [-34, -140], [-6, -140], [-30, -70], [38, -158], [8, -158], [32, -215]].map(([x, y]) => [x * s, y * s]), { c: C.orange, w: 4.5, fill: C.yellow, gap: 4, fw: 3.5 });
  A.phone = () => S(R.rect(-62, -230, 124, 230, { w: 6 }), R.rect(-50, -206, 100, 168, { w: 3.5 }), R.circ(0, -18, 14, { w: 3 }), R.line(-16, -220, 16, -220, { w: 4 }),
    R.rect(-34, -150, 68, 32, { w: 4 }), R.rect(34, -140, 8, 12, { w: 3, fill: ink, fs: 'solid' }));
  A.socket = () => S(R.rect(-46, -56, 92, 112, { w: 5, fill: '#fff', fs: 'solid' }), R.rect(-46, -56, 92, 112, { w: 5 }), R.rect(-18, -32, 8, 22, { w: 3, fill: ink, fs: 'solid' }), R.rect(10, -32, 8, 22, { w: 3, fill: ink, fs: 'solid' }), R.circ(0, 24, 18, { w: 3 }));
  A.cable = () => R.curve([[0, 0], [40, 80], [-30, 150], [20, 230]], { w: 6 });

  /* ---------- атомы и нейтроны ---------- */
  A.atom = (r) => R.circ(0, 0, r * 2, { c: C.blue, w: 5, fill: C.blue, gap: Math.max(4, r / 9), fw: 2.8, r: 1.0 });
  A.atomFace = (r, ex) => K.face(0, 2, r * 0.9, ex);
  A.neutronBuild = (g, r = 20) => { const gg = E.el('g', {}, g); E.el('circle', { r, fill: C.red, stroke: '#9E1C27', 'stroke-width': 3 }, gg);
    const t = E.el('text', { y: r * 0.36, 'font-size': r * 1.1, fill: '#fff', 'text-anchor': 'middle', 'font-family': 'Neucha, sans-serif' }, gg); t.textContent = 'n'; return gg; };
  A.flash = () => { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 62 : 130; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    return S(R.poly(pts, { c: C.orange, w: 5, fill: C.yellow, gap: 5, fw: 4 }), R.lin([[-150, -30], [-100, -50], [-110, 0], [-60, -10]], { c: C.red, w: 5 }), R.lin([[150, 30], [100, 50], [110, 0], [60, 10]], { c: C.red, w: 5 })); };
  A.halfAtom = (r, top) => R.arc(0, 0, r * 2, r * 2, top ? Math.PI : 0, top ? 2 * Math.PI : Math.PI, true, { c: C.blue, w: 5, fill: C.blue, gap: 6, fw: 2.8 });

  /* ---------- бомба, таблетка ---------- */
  A.bomb = () => S(R.circ(0, -110, 220, { w: 6, fill: C.gray, gap: 7, fw: 3 }), R.poly([[-30, -218], [30, -218], [24, -236], [-24, -236]], { w: 5, fill: ink, fs: 'solid' }),
    R.curve([[0, -236], [20, -262], [-6, -284], [26, -300]], { w: 5 }), K.mark('star', 30, -306, 0.9, C.orange),
    K.face(0, -106, 100, 'angry'), R.poly([[-14, -6], [14, -6], [8, 0], [-8, 0]], { w: 3 }));
  A.pellet = () => S(R.rect(-50, -156, 100, 156, { w: 5, fill: '#CFD3DA', gap: 8, fw: 2.2 }), R.ell(0, -156, 100, 28, { w: 5, fill: '#E6E8EC', fs: 'solid' }),
    R.circ(-22, -98, 36, { w: 4 }), R.circ(22, -98, 36, { w: 4 }), R.line(-4, -98, 4, -98, { w: 4 }), dot(-22, -96, 10), dot(22, -96, 10),
    R.curve([[-18, -62], [0, -50], [18, -62]], { w: 4, r: .5 }), R.lin([[50, -90], [86, -70]], { w: 5 }), R.lin([[-50, -90], [-80, -50]], { w: 5 }),
    R.rect(78, -88, 40, 46, { c: C.blue, w: 4, fill: C.ltblue, gap: 5, fw: 2.5 }), R.curve([[118, -80], [140, -76], [136, -54], [118, -50]], { c: C.blue, w: 4 }));
  A.mugSteam = (sc, at, end, x, y) => A.steamEl(sc, at, end, x, y, 2, 8, 60, '#7FA3BF', 3.5);
  A.pelletTiny = () => S(R.rect(-24, -64, 48, 64, { w: 5, fill: ink, gap: 5, fw: 3 }), R.ell(0, -64, 48, 14, { w: 4.5, fill: '#555', fs: 'solid' }));

  /* ---------- реактор и стержни ---------- */
  A.reactorBox = (w, h) => S(R.rect(0, 0, w, h, { w: 7, fill: C.ltblue, gap: 12, fw: 2 }), R.rect(-8, -8, w + 16, h + 16, { w: 4 }));
  A.rod = (h) => R.rect(-16, -h, 32, h, { w: 4, fill: ink, gap: 5, fw: 3.5 });

  /* ---------- контуры ---------- */
  A.reactorVessel = () => S(R.rect(-52, -150, 104, 150, { w: 6, fill: C.ltred, gap: 8, fw: 2.5 }), R.path('M-52,-150 C-52,-195 52,-195 52,-150', { w: 6 }),
    R.line(-26, -190, -26, -90, { w: 8 }), R.line(0, -190, 0, -90, { w: 8 }), R.line(26, -190, 26, -90, { w: 8 }), R.lin([[-36, -30], [-16, -44], [4, -30], [24, -44], [40, -30]], { c: C.red, w: 4 }));
  A.coil = (h = 200) => { const pts = [[-30, 0]]; const n = 6; for (let i = 0; i <= n; i++) pts.push([i % 2 ? 30 : -30, i / n * h]); return R.lin(pts, { c: ink, w: 6, r: .8 }); };
  A.cloud = () => S(R.path('M-100,0 C-140,-10 -140,-72 -90,-72 C-90,-124 -20,-132 0,-92 C30,-132 100,-112 92,-62 C142,-62 152,0 100,0 Z', { c: C.blue, w: 6, fill: '#fff', fs: 'solid' }),
    R.path('M-100,0 C-140,-10 -140,-72 -90,-72 C-90,-124 -20,-132 0,-92 C30,-132 100,-112 92,-62 C142,-62 152,0 100,0 Z', { c: C.blue, w: 6 }), K.face(0, -50, 52, 'happy'));

  /* ---------- сцена 6: таблетка, уголь, бочки, баллон ---------- */
  A.barrel = () => S(R.rect(-38, -110, 76, 110, { w: 5, fill: C.brown, gap: 8, fw: 2.5 }), R.ell(0, -110, 76, 20, { w: 4.5, fill: '#D9B38C', fs: 'solid' }), R.ell(0, -110, 76, 20, { w: 4.5 }),
    R.curve([[-38, -72], [0, -62], [38, -72]], { w: 4 }), R.curve([[-38, -36], [0, -26], [38, -36]], { w: 4 }), R.circ(0, -110, 0.01, { w: 1 }).slice(0, 0));
  A.gasTank = () => S(R.rect(-42, -170, 84, 170, { w: 5.5, fill: C.green, gap: 8, fw: 2.5 }), R.path('M-42,-170 C-42,-208 42,-208 42,-170', { w: 5.5 }), R.rect(-12, -226, 24, 22, { w: 4.5 }),
    R.line(12, -216, 46, -216, { w: 5 }), R.curve([[-42, -95], [0, -84], [42, -95]], { w: 4 }), R.ell(0, 0, 84, 16, { w: 4 }).slice(0, 0));

  /* ---------- финал ---------- */
  A.stickman = () => S(R.circ(0, -250, 84, { w: 5 }), K.face(0, -250, 42, 'happy'), R.line(0, -208, 0, -90, { w: 6 }), R.lin([[0, -90], [-40, 0]], { w: 6 }), R.lin([[0, -90], [40, 0]], { w: 6 }),
    R.lin([[0, -180], [-50, -130], [-70, -100]], { w: 6 }), R.lin([[0, -180], [60, -170], [110, -215]], { w: 6 }), R.circ(112, -218, 22, { w: 4, fill: C.yellow, gap: 5, fw: 3 }));
  A.wallSwitch = () => S(R.rect(-40, -80, 80, 120, { w: 5 }), R.rect(-14, -50, 28, 60, { w: 4 }), R.line(0, -50, 0, -78, { w: 7 }));
  A.bulb = () => S(R.circ(0, -150, 140, { w: 6, fill: '#fff', fs: 'solid' }), R.circ(0, -150, 140, { w: 6 }), R.rect(-34, -80, 68, 40, { w: 5, fill: C.gray, gap: 6, fw: 3 }), R.line(-24, -40, 24, -40, { w: 6 }),
    R.lin([[-20, -80], [-20, -150], [-8, -120], [8, -150], [20, -120], [20, -80]], { w: 3.5 }));
  A.bulbLit = () => R.circ(0, -150, 126, { c: C.orange, w: 4, fill: C.yellow, gap: 5, fw: 5 });
  A.rays = () => { const out = []; for (let i = 0; i < 10; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.1 * 1.0 + 0.05, r1 = 100, r2 = 150; out.push(R.line(r1 * Math.cos(a), -150 + r1 * Math.sin(a) * 1.0, r2 * Math.cos(a) * 1.15, -150 + r2 * Math.sin(a) * 1.15, { c: C.orange, w: 7, r: .8 })); }
    for (let i = 0; i < 4; i++) { const a = i * 0.9 + 0.2; out.push(R.line(100 * Math.cos(a), -150 + 100 * Math.sin(a), 150 * Math.cos(a), -150 + 150 * Math.sin(a), { c: C.orange, w: 7, r: .8 })); } return S(...out); };
  A.towerKettle = () => { const { L, Rr } = A.towerPts(250, 360);
    return S(A.tower(250, 360, { gap: 8 }), R.curve([[-118, -110], [-190, -150], [-230, -250]], { w: 7 }), R.curve([[-125, -190], [-165, -215], [-190, -255]], { w: 7 }),
      R.curve([[100, -290], [200, -300], [225, -170], [118, -90]], { w: 9 }), R.ell(0, -378, 130, 26, { w: 4.5 }), R.circ(0, -406, 26, { w: 4, fill: C.orange, gap: 4, fw: 3 }),
      K.face(0, -215, 62, 'cool'), R.lin([[132, -120], [180, -90], [196, -150]], { w: 6 }), R.line(196, -150, 196, -184, { w: 8, r: .3 }), R.circ(194, -140, 26, { w: 4, fill: C.orange, gap: 5, fw: 3 })); };

  window.KA = A;
})();
