/* Набор персонажей и реквизита. Координаты локальные: (0,0) — центр под ногами, вверх — минус. */
(function () {
  const { R, S, C } = E;
  const ink = C.ink;
  const dot = (x, y, d = 9) => R.circ(x, y, d, { c: ink, w: 2, fill: ink, fs: 'solid', r: 0.5 });
  const hat = (c, g = 5, w = 3) => ({ c, fill: c, gap: g, fw: w, w: 3.5 });

  function face(cx, cy, r, ex) {
    const eyY = cy - r * 0.1, dx = r * 0.4;
    switch (ex) {
      case 'big': return S(R.circ(cx - dx, eyY, r * 0.34, { w: 2.5, r: 0.6 }), R.circ(cx + dx, eyY, r * 0.34, { w: 2.5, r: 0.6 }),
        dot(cx - dx, eyY, r * 0.14), dot(cx + dx, eyY, r * 0.14), R.ell(cx, cy + r * 0.5, r * 0.3, r * 0.4, { w: 3, r: 0.6 }));
      case 'scared': return S(R.circ(cx - dx, eyY, r * 0.36, { w: 2.5, r: 0.6 }), R.circ(cx + dx, eyY, r * 0.36, { w: 2.5, r: 0.6 }),
        dot(cx - dx + 3, eyY + 2, r * 0.12), dot(cx + dx - 3, eyY + 2, r * 0.12),
        R.lin([[cx - r * 0.35, cy + r * 0.55], [cx - r * 0.15, cy + r * 0.45], [cx + r * 0.05, cy + r * 0.55], [cx + r * 0.25, cy + r * 0.45], [cx + r * 0.4, cy + r * 0.55]], { w: 3, r: 0.6 }),
        R.line(cx - dx - 8, eyY - r * 0.36, cx - dx + 8, eyY - r * 0.28, { w: 3, r: 0.4 }), R.line(cx + dx + 8, eyY - r * 0.36, cx + dx - 8, eyY - r * 0.28, { w: 3, r: 0.4 }));
      case 'sad': return S(dot(cx - dx, eyY), dot(cx + dx, eyY),
        R.curve([[cx - r * 0.3, cy + r * 0.55], [cx, cy + r * 0.38], [cx + r * 0.3, cy + r * 0.55]], { w: 3, r: 0.6 }));
      case 'happy': return S(R.curve([[cx - dx - 8, eyY + 3], [cx - dx, eyY - 6], [cx - dx + 8, eyY + 3]], { w: 3, r: 0.5 }),
        R.curve([[cx + dx - 8, eyY + 3], [cx + dx, eyY - 6], [cx + dx + 8, eyY + 3]], { w: 3, r: 0.5 }),
        R.arc(cx, cy + r * 0.28, r * 0.8, r * 0.55, 0.15, Math.PI - 0.15, true, { w: 3, r: 0.5, fill: C.red, gap: 3, c: ink }));
      case 'closed': return S(R.line(cx - dx - 8, eyY, cx - dx + 8, eyY, { w: 3, r: 0.4 }), R.line(cx + dx - 8, eyY, cx + dx + 8, eyY, { w: 3, r: 0.4 }),
        R.curve([[cx - r * 0.25, cy + r * 0.38], [cx, cy + r * 0.48], [cx + r * 0.25, cy + r * 0.38]], { w: 3, r: 0.5 }));
      case 'cool': return S(R.rect(cx - r * 0.78, eyY - r * 0.2, r * 0.68, r * 0.42, { c: ink, w: 3, fill: ink, fs: 'solid', r: 0.6 }),
        R.rect(cx + r * 0.1, eyY - r * 0.2, r * 0.68, r * 0.42, { c: ink, w: 3, fill: ink, fs: 'solid', r: 0.6 }),
        R.line(cx - r * 0.1, eyY - r * 0.05, cx + r * 0.1, eyY - r * 0.05, { w: 3, r: 0.3 }),
        R.curve([[cx - r * 0.3, cy + r * 0.45], [cx, cy + r * 0.62], [cx + r * 0.3, cy + r * 0.45]], { w: 3, r: 0.5 }));
      case 'angry': return S(dot(cx - dx, eyY), dot(cx + dx, eyY),
        R.line(cx - dx - 10, eyY - r * 0.3, cx - dx + 8, eyY - r * 0.15, { w: 4, r: 0.4 }), R.line(cx + dx + 10, eyY - r * 0.3, cx + dx - 8, eyY - r * 0.15, { w: 4, r: 0.4 }),
        R.curve([[cx - r * 0.3, cy + r * 0.55], [cx, cy + r * 0.4], [cx + r * 0.3, cy + r * 0.55]], { w: 3, r: 0.6 }));
      default: return S(dot(cx - dx, eyY), dot(cx + dx, eyY),
        R.curve([[cx - r * 0.35, cy + r * 0.32], [cx, cy + r * 0.52], [cx + r * 0.35, cy + r * 0.32]], { w: 3, r: 0.5 }));
    }
  }

  function carton(x, y, w, h, o = {}) { // (x,y) — левый верх
    return S(R.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { c: C.blue, w: 4, fill: '#DCEEFB', gap: 6, fw: 2 }),
      R.poly([[x, y], [x + w * 0.5, y - h * 0.22], [x + w, y]], { c: C.blue, w: 4 }),
      R.circ(x + w * 0.5, y + h * 0.35, w * 0.3, { c: C.blue, w: 3, r: 0.6 }),
      o.label === false ? [] : R.lin([[x + w * 0.2, y + h * 0.7], [x + w * 0.4, y + h * 0.62], [x + w * 0.6, y + h * 0.7], [x + w * 0.8, y + h * 0.62]], { c: C.blue, w: 3, r: 0.5 }));
  }
  function glass(cx, cy, w, h) { return S(R.poly([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w * 0.38, cy + h / 2], [cx - w * 0.38, cy + h / 2]], { c: C.blue, w: 4 }),
    R.poly([[cx - w * 0.43, cy - h * 0.1], [cx + w * 0.43, cy - h * 0.1], [cx + w * 0.38, cy + h / 2], [cx - w * 0.38, cy + h / 2]], { c: C.blue, w: 3, fill: '#CFE8FA', gap: 5, fw: 2 })); }
  function jug(cx, cy, s = 1) { return S(R.poly([[cx - 40 * s, cy - 70 * s], [cx + 40 * s, cy - 70 * s], [cx + 55 * s, cy + 10 * s], [cx - 55 * s, cy + 10 * s]], { c: C.blue, w: 4, fill: '#DCEEFB', gap: 6, fw: 2 }),
    R.ell(cx, cy - 72 * s, 80 * s, 18 * s, { c: C.blue, w: 3 }), R.curve([[cx + 52 * s, cy - 50 * s], [cx + 90 * s, cy - 45 * s], [cx + 88 * s, cy - 5 * s], [cx + 54 * s, cy - 8 * s]], { c: C.blue, w: 4 })); }

  function man(o = {}) {
    const pose = o.pose || 'stand', hair = o.hair || C.orange, shirt = o.shirt || 'stripes';
    const parts = [];
    parts.push(R.poly([[-48, -218], [48, -218], [58, -98], [-58, -98]], { c: ink, w: 4 }));
    if (shirt === 'stripes') for (let i = 0; i < 5; i++) { const y = -200 + i * 22; parts.push(R.line(-50 + i * 0.5, y, 50 - i * 0.5, y, { c: C.blue, w: 6, r: 0.8 })); }
    else parts.push(R.poly([[-48, -218], [48, -218], [58, -98], [-58, -98]], { c: C.brown, w: 3, fill: C.brown, gap: 7, fw: 2.5 }));
    parts.push(R.rect(-44, -98, 36, 98, { c: ink, w: 4, fill: C.blue, gap: 6, fw: 3 }), R.rect(8, -98, 36, 98, { c: ink, w: 4, fill: C.blue, gap: 6, fw: 3 }));
    parts.push(R.circ(0, -262, 88, { c: ink, w: 4.5 }));
    parts.push(R.ell(0, -296, 98, 40, hat(hair, 4, 3)), R.poly([[-44, -262], [-42, -224], [-22, -204], [0, -198], [22, -204], [42, -224], [44, -262], [30, -238], [0, -230], [-30, -238]], hat(hair, 4, 3.2)));
    parts.push(face(0, -266, 44, pose === 'drink' ? 'closed' : (o.expr || 'smile')));
    if (pose === 'drink') {
      parts.push(R.lin([[50, -200], [96, -178], [60, -246]], { c: ink, w: 5 }), R.lin([[-50, -200], [-80, -150], [-74, -112]], { c: ink, w: 5 }));
      parts.push(carton(56, -300, 44, 64), R.line(70, -302, 14, -252, { c: C.red, w: 4, r: 0.4 }));
    } else if (pose === 'hold') {
      parts.push(R.lin([[50, -200], [92, -170], [88, -150]], { c: ink, w: 5 }), R.lin([[-50, -200], [-80, -150], [-74, -112]], { c: ink, w: 5 }), carton(70, -200, 44, 62));
    } else if (pose === 'thumb') {
      parts.push(R.lin([[50, -200], [104, -196], [112, -256]], { c: ink, w: 5 }), R.line(112, -256, 112, -284, { c: ink, w: 7, r: 0.3 }), R.circ(110, -246, 22, { w: 3, r: 0.6 }), R.lin([[-50, -200], [-80, -150], [-74, -112]], { c: ink, w: 5 }));
    } else parts.push(R.lin([[50, -200], [80, -150], [74, -112]], { c: ink, w: 5 }), R.lin([[-50, -200], [-80, -150], [-74, -112]], { c: ink, w: 5 }));
    return S(...parts);
  }

  function cat(o = {}) { // сидящая кошка; kitten — котёнок
    const k = !!o.kitten, hr = k ? 96 : 76;
    const hy = k ? -126 : -146, by = k ? -52 : -64;
    const gr = { c: ink, w: 3.5, fill: C.gray, gap: 8, fw: 2.5 };
    return S(R.curve([[60, -20], [110, -40], [120, -100], [100, -150]], { c: ink, w: 5 }),
      R.ell(0, by, k ? 80 : 110, k ? 90 : 120, gr),
      R.circ(0, hy, hr, { c: ink, w: 4, fill: '#E4E6EA', gap: 9, fw: 2 }),
      R.poly([[-hr * 0.5, hy - hr * 0.3], [-hr * 0.46, hy - hr * 0.8], [-hr * 0.1, hy - hr * 0.46]], { c: ink, w: 4 }),
      R.poly([[hr * 0.5, hy - hr * 0.3], [hr * 0.46, hy - hr * 0.8], [hr * 0.1, hy - hr * 0.46]], { c: ink, w: 4 }),
      face(0, hy + 2, hr * 0.55, o.expr || 'smile'),
      R.line(-hr * 0.15, hy + hr * 0.16, -hr * 0.8, hy + hr * 0.08, { w: 2, r: 0.4 }), R.line(hr * 0.15, hy + hr * 0.16, hr * 0.8, hy + hr * 0.08, { w: 2, r: 0.4 }),
      R.line(-24, by + 52, -24, 0, { c: ink, w: 5 }), R.line(24, by + 52, 24, 0, { c: ink, w: 5 }));
  }

  /* ---- животные для верхнего ряда (≈ 250×230) ---- */
  const animals = {
    bear: () => S(R.ell(0, -70, 130, 110, hat(C.brown, 6, 2.5)), R.circ(0, -150, 92, { c: ink, w: 4, fill: C.brown, gap: 7, fw: 2.5 }), R.circ(-40, -192, 34, { c: ink, w: 4 }), R.circ(40, -192, 34, { c: ink, w: 4 }),
      R.ell(0, -132, 50, 36, { c: ink, w: 3.5 }), dot(0, -138, 14), face(0, -160, 34, 'smile'), R.line(-32, -22, -32, 0, { w: 6 }), R.line(32, -22, 32, 0, { w: 6 })),
    fox: () => S(R.ell(0, -62, 130, 100, hat(C.orange, 6, 3)), R.poly([[-70, -170], [-40, -240], [-10, -190], [10, -190], [40, -240], [70, -170], [30, -110], [-30, -110]], { c: ink, w: 4, fill: C.orange, gap: 7, fw: 3 }),
      R.poly([[-34, -140], [0, -100], [34, -140], [0, -150]], { c: ink, w: 3, fill: '#fff', fs: 'solid' }), dot(-22, -160, 11), dot(22, -160, 11), dot(0, -112, 14),
      R.curve([[60, -40], [130, -60], [140, -110], [120, -140]], { c: C.orange, w: 14, r: 0.8 }), R.line(-30, -14, -30, 0, { w: 6 }), R.line(30, -14, 30, 0, { w: 6 })),
    cat: () => cat({ expr: 'smile' }),
    dolphin: () => S(R.ell(0, -90, 240, 84, { c: ink, w: 4.5, fill: C.ltblue, gap: 6, fw: 3 }), R.poly([[108, -92], [170, -150], [160, -96], [176, -48]], { c: ink, w: 4, fill: C.ltblue, gap: 6, fw: 3 }),
      R.poly([[-20, -128], [10, -186], [44, -124]], { c: ink, w: 4, fill: C.ltblue, gap: 6, fw: 3 }), R.line(-120, -84, -158, -80, { c: ink, w: 5 }), dot(-84, -104, 11),
      R.curve([[-120, -76], [-96, -68], [-70, -78]], { c: ink, w: 3 }), R.curve([[-30, -52], [10, -30], [50, -50]], { c: ink, w: 4 })),
    cow: () => S(R.ell(0, -108, 170, 100, { c: ink, w: 4.5 }), R.ell(-50, -118, 40, 30, { c: ink, w: 2, fill: ink, gap: 3, fw: 3 }), R.ell(30, -90, 50, 34, { c: ink, w: 2, fill: ink, gap: 3, fw: 3 }),
      R.ell(-105, -150, 72, 62, { c: ink, w: 4.5 }), R.poly([[-130, -182], [-120, -205], [-108, -182]], { c: ink, w: 3 }), R.poly([[-84, -182], [-92, -205], [-100, -182]], { c: ink, w: 3 }),
      R.ell(-112, -134, 40, 22, { c: C.pink, w: 3, fill: C.pink, gap: 4, fw: 2 }), dot(-122, -160, 8), dot(-92, -160, 8), R.ell(0, -62, 36, 26, { c: C.pink, w: 3, fill: C.pink, gap: 4, fw: 2 }),
      R.line(-60, -62, -60, 0, { w: 6 }), R.line(-20, -62, -20, 0, { w: 6 }), R.line(40, -62, 40, 0, { w: 6 }), R.line(70, -66, 70, 0, { w: 6 })),
    calf: () => S(R.ell(0, -56, 100, 56, { c: ink, w: 4 }), R.ell(-56, -80, 44, 40, { c: ink, w: 4 }), dot(-66, -88, 6), dot(-46, -88, 6), R.line(-30, -30, -30, 0, { w: 5 }), R.line(30, -30, 30, 0, { w: 5 })),
    mom: () => S(R.circ(0, -180, 56, { c: ink, w: 4 }), R.ell(0, -204, 62, 26, hat(C.brown, 5, 3)), face(0, -180, 28, 'smile'),
      R.poly([[-34, -150], [34, -150], [62, -10], [-62, -10]], { c: ink, w: 4, fill: C.pink, gap: 7, fw: 2.5 }), R.lin([[-30, -140], [-70, -100], [-30, -80]], { c: ink, w: 5 }),
      R.circ(-62, -100, 38, { c: ink, w: 4 }), face(-62, -100, 19, 'closed'), R.line(-20, -10, -20, 0, { w: 5 }), R.line(20, -10, 20, 0, { w: 5 })),
  };

  /* ---- молекулы и монстр ---- */
  function hex(cx, cy, r, c) { const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return S(R.poly(pts, { c, w: 5, fill: c, gap: 8, fw: 2, ang: -30 }), R.circ(cx, cy, r * 0.5, { c: ink, w: 3, r: 0.6 })); }
  function lactoseA() { return hex(0, 0, 62, C.blue); }
  function lactoseB() { return hex(0, 0, 62, C.orange); }
  function lactaseMonster() {
    return S(R.ell(0, -90, 190, 170, { c: C.green, w: 5, fill: C.green, gap: 8, fw: 3 }),
      R.circ(-40, -130, 46, { c: ink, w: 4, fill: '#fff', fs: 'solid' }), R.circ(40, -130, 46, { c: ink, w: 4, fill: '#fff', fs: 'solid' }), dot(-36, -128, 20), dot(44, -128, 20),
      R.arc(0, -64, 120, 76, 0.05, Math.PI - 0.05, true, { c: ink, w: 4, fill: C.red, fs: 'solid' }),
      R.poly([[-48, -64], [-36, -40], [-24, -62]], { c: ink, w: 3, fill: '#fff', fs: 'solid' }), R.poly([[-12, -60], [0, -34], [12, -60]], { c: ink, w: 3, fill: '#fff', fs: 'solid' }), R.poly([[24, -62], [36, -40], [48, -64]], { c: ink, w: 3, fill: '#fff', fs: 'solid' }),
      R.line(-50, -190, -66, -222, { c: ink, w: 4 }), R.line(50, -190, 66, -222, { c: ink, w: 4 }), R.line(-34, -12, -34, 0, { w: 6 }), R.line(34, -12, 34, 0, { w: 6 }));
  }

  /* ---- герои-мутанты (оригинальные) ---- */
  function hero(o = {}) {
    const c = o.c || C.blue;
    return S(R.poly([[-54, -210], [54, -210], [84, -20], [-84, -20]], { c: C.red, w: 4, fill: C.red, gap: 8, fw: 2.5 }),
      R.poly([[-40, -210], [40, -210], [44, -96], [-44, -96]], { c, w: 4.5, fill: c, gap: 6, fw: 3 }), R.rect(-46, -122, 92, 16, { c: C.yellow, w: 3, fill: C.yellow, fs: 'solid' }),
      R.rect(-40, -96, 32, 96, { c: ink, w: 4, fill: c, gap: 7, fw: 3 }), R.rect(8, -96, 32, 96, { c: ink, w: 4, fill: c, gap: 7, fw: 3 }),
      R.circ(0, -250, 78, { c: ink, w: 4.5 }), R.rect(-44, -268, 88, 26, { c: ink, w: 3, fill: o.mask || ink, fs: 'solid', r: 0.7 }),
      S(R.circ(-20, -255, 12, { w: 2, fill: '#fff', fs: 'solid', r: .4 }), R.circ(20, -255, 12, { w: 2, fill: '#fff', fs: 'solid', r: .4 })),
      R.curve([[-24, -228], [0, -214], [24, -228]], { w: 3.5, r: .5 }), o.hair ? R.poly([[-40, -284], [-20, -320], [0, -288], [20, -322], [40, -284]], hat(o.hair, 4, 3)) : [],
      R.lin([[-40, -196], [-80, -150], [-100, -110]], { c: ink, w: 5 }), R.lin([[40, -196], [80, -150], [100, -110]], { c: ink, w: 5 }),
      o.claws ? S(R.line(-100, -110, -118, -150, { w: 3 }), R.line(-100, -110, -104, -156, { w: 3 }), R.line(-100, -110, -90, -154, { w: 3 })) : []);
  }

  /* ---- древние люди и рынок ---- */
  function oldMan() {
    return S(R.poly([[-40, -190], [40, -190], [54, -60], [-54, -60]], { c: ink, w: 4, fill: C.brown, gap: 7, fw: 2.5 }), R.rect(-34, -60, 26, 60, { c: ink, w: 4 }), R.rect(8, -60, 26, 60, { c: ink, w: 4 }),
      R.circ(0, -230, 78, { c: ink, w: 4.5 }), R.poly([[-38, -228], [-34, -176], [0, -150], [34, -176], [38, -228], [20, -204], [-20, -204]], { c: ink, w: 3.5, fill: C.gray, gap: 5, fw: 2.5 }), R.ell(0, -262, 84, 22, { c: ink, w: 3, fill: C.gray, gap: 6, fw: 2 }),
      face(0, -236, 38, 'angry'), R.lin([[40, -176], [90, -140], [88, -90]], { c: ink, w: 5 }), R.line(88, -100, 88, 0, { c: C.brown, w: 8, r: 0.5 }), R.lin([[-40, -176], [-72, -130], [-66, -96]], { c: ink, w: 5 }));
  }
  function cheese(cx, cy, s = 1) { return S(R.poly([[cx - 34 * s, cy + 14 * s], [cx + 34 * s, cy + 14 * s], [cx + 34 * s, cy - 8 * s], [cx - 34 * s, cy - 28 * s]], { c: ink, w: 3.5, fill: C.yellow, gap: 5, fw: 3 }),
    R.circ(cx - 6 * s, cy - 4 * s, 9 * s, { c: ink, w: 2.5 }), R.circ(cx + 16 * s, cy + 2 * s, 7 * s, { c: ink, w: 2.5 })); }
  function woman() {
    return S(R.poly([[-36, -170], [36, -170], [70, -10], [-70, -10]], { c: ink, w: 4, fill: C.green, gap: 7, fw: 2.5 }), R.circ(0, -212, 70, { c: ink, w: 4.5 }),
      R.ell(0, -240, 76, 34, hat(C.brown, 5, 3)), R.poly([[-36, -228], [-44, -170], [-26, -190], [-24, -228]], hat(C.brown, 5, 3)), R.poly([[36, -228], [44, -170], [26, -190], [24, -228]], hat(C.brown, 5, 3)), R.ell(0, -256, 30, 30, hat(C.brown, 5, 3)), R.line(-30, -236, 30, -236, { c: C.red, w: 9, r: .6 }), face(0, -208, 32, 'smile'),
      R.lin([[34, -160], [86, -130], [96, -110]], { c: ink, w: 5 }), cheese(112, -112, 1), R.lin([[-34, -160], [-66, -110], [-58, -80]], { c: ink, w: 5 }),
      R.line(-22, -10, -22, 0, { w: 5 }), R.line(22, -10, 22, 0, { w: 5 }));
  }
  function stall() {
    const st = [];
    for (let i = 0; i < 6; i++) st.push(R.poly([[-150 + i * 50, -250], [-100 + i * 50, -250], [-100 + i * 50, -196], [-150 + i * 50, -196]], { c: ink, w: 3, fill: i % 2 ? '#fff' : C.red, fs: i % 2 ? 'solid' : 'hachure', gap: 5, fw: 3 }));
    return S(...st, R.line(-150, -196, -150, -20, { w: 5 }), R.line(150, -196, 150, -20, { w: 5 }), R.rect(-160, -70, 320, 34, { c: ink, w: 4.5, fill: C.brown, gap: 7, fw: 2.5 }),
      R.rect(-120, -190, 240, 70, { c: ink, w: 4, fill: '#fff', fs: 'solid', r: 0.8 }), jug(100, -70, 0.35), glass(60, -86, 28, 40));
  }
  function outhouse() { return S(R.poly([[-46, -150], [0, -190], [46, -150]], { c: ink, w: 4, fill: C.brown, gap: 6, fw: 3 }), R.rect(-40, -150, 80, 150, { c: ink, w: 4.5, fill: C.brown, gap: 9, fw: 2 }),
    R.rect(-18, -126, 36, 100, { c: ink, w: 3.5 }), R.circ(0, -150, 18, { c: ink, w: 3, fill: '#fff', fs: 'solid' }), R.poly([[-6, -158], [6, -158], [3, -142], [-3, -142]], { c: ink, w: 2, fill: ink, fs: 'solid' })); }
  function crowdFig(o = {}) { return S(R.circ(0, -98, 38, { c: ink, w: 3.5 }), face(0, -98, 19, o.expr || 'smile'), R.line(0, -78, 0, -34, { c: ink, w: 4.5 }), R.lin([[-28, -64], [0, -58], [28, -64]], { c: ink, w: 4 }), R.lin([[-22, 0], [0, -34], [22, 0]], { c: ink, w: 4.5 })); }

  function dna(len = 330) {
    const a = [], b = [], rung = [];
    for (let i = 0; i <= 40; i++) { const y = i / 40 * len, x = Math.sin(i / 40 * Math.PI * 4) * 55; a.push([x, y]); b.push([-x, y]); }
    for (let i = 2; i < 40; i += 4) rung.push(R.line(a[i][0], a[i][1], b[i][0], b[i][1], { c: i % 8 === 2 ? C.red : C.blue, w: 4, r: .5 }));
    return S(R.curve(a, { c: C.blue, w: 6, r: .6 }), R.curve(b, { c: C.red, w: 6, r: .6 }), ...rung);
  }

  function mark(type, x, y, s = 1, c) {
    if (type === 'check') return R.lin([[x - 26 * s, y], [x - 8 * s, y + 24 * s], [x + 30 * s, y - 30 * s]], { c: c || C.green, w: 9 * s, r: .6 });
    if (type === 'cross') return S(R.line(x - 26 * s, y - 26 * s, x + 26 * s, y + 26 * s, { c: c || C.red, w: 9 * s, r: .6 }), R.line(x + 26 * s, y - 26 * s, x - 26 * s, y + 26 * s, { c: c || C.red, w: 9 * s, r: .6 }));
    if (type === 'arrow') return S(R.line(x, y, x + 110 * s, y, { c: c || ink, w: 6, r: .8 }), R.lin([[x + 86 * s, y - 20 * s], [x + 112 * s, y], [x + 86 * s, y + 20 * s]], { c: c || ink, w: 6, r: .6 }));
    if (type === 'darrow') return S(R.line(x, y, x, y + 110 * s, { c: c || ink, w: 6, r: .8 }), R.lin([[x - 20 * s, y + 86 * s], [x, y + 112 * s], [x + 20 * s, y + 86 * s]], { c: c || ink, w: 6, r: .6 }));
    if (type === 'star') { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 * s : 28 * s, a = -Math.PI / 2 + i * Math.PI / 5; p.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
      return R.poly(p, { c: c || C.yellow, w: 4, fill: c || C.yellow, gap: 4, fw: 3 }); }
    return [];
  }

  function bacterium(o = {}) { return S(R.ell(0, 0, 150, 56, { c: C.pink, w: 5, fill: C.pink, gap: 5, fw: 3 }), face(0, 0, 24, o.expr || 'smile'), R.line(-76, -6, -92, -14, { c: C.pink, w: 4 }), R.line(76, 6, 92, 14, { c: C.pink, w: 4 })); }
  function scientist() {
    return S(R.poly([[-56, -200], [56, -200], [70, -20], [-70, -20]], { c: ink, w: 4, fill: '#fff', fs: 'solid' }), R.poly([[-56, -200], [56, -200], [70, -20], [-70, -20]], { c: ink, w: 4 }),
      R.poly([[-22, -200], [0, -150], [22, -200]], { c: ink, w: 3.5, fill: C.blue, gap: 6, fw: 3 }), R.rect(-40, -20, 30, 20, { c: ink, w: 4 }), R.rect(10, -20, 30, 20, { c: ink, w: 4 }),
      R.circ(0, -250, 82, { c: ink, w: 4.5 }), R.poly([[-42, -246], [-44, -196], [0, -160], [44, -196], [42, -246], [20, -214], [-20, -214]], { c: ink, w: 3.5, fill: C.gray, gap: 5, fw: 2.5 }),
      R.circ(-20, -258, 26, { c: ink, w: 3, r: .6 }), R.circ(20, -258, 26, { c: ink, w: 3, r: .6 }), dot(-20, -258, 8), dot(20, -258, 8), R.line(-7, -258, 7, -258, { w: 3, r: .3 }),
      R.lin([[56, -180], [100, -150], [96, -120]], { c: ink, w: 5 }), R.poly([[84, -170], [106, -170], [100, -114], [90, -114]], { c: C.green, w: 3.5, fill: C.green, gap: 4, fw: 2.5 }),
      R.lin([[-56, -180], [-86, -130], [-76, -96]], { c: ink, w: 5 }));
  }
  function girl() {
    return S(R.poly([[-34, -170], [34, -170], [66, -10], [-66, -10]], { c: ink, w: 4, fill: C.pink, gap: 6, fw: 2.5 }), R.circ(0, -214, 72, { c: ink, w: 4.5 }),
      R.ell(0, -248, 82, 38, hat(C.brown, 5, 3)), R.poly([[-38, -226], [-52, -150], [-30, -172], [-28, -226]], hat(C.brown, 5, 3)), R.poly([[38, -226], [52, -150], [30, -172], [28, -226]], hat(C.brown, 5, 3)), face(0, -208, 34, 'happy'),
      R.lin([[34, -160], [80, -130], [92, -108]], { c: ink, w: 5 }), R.lin([[-34, -160], [-80, -130], [-92, -108]], { c: ink, w: 5 }),
      R.line(-22, -10, -22, 0, { w: 5 }), R.line(22, -10, 22, 0, { w: 5 }));
  }
  function cake(cx, cy, s = 1) { return S(R.ell(cx, cy, 90 * s, 20 * s, { c: ink, w: 3.5 }), R.rect(cx - 38 * s, cy - 40 * s, 76 * s, 40 * s, { c: ink, w: 3.5, fill: C.pink, gap: 5, fw: 3 }),
    R.curve([[cx - 38 * s, cy - 40 * s], [cx - 20 * s, cy - 30 * s], [cx, cy - 42 * s], [cx + 20 * s, cy - 30 * s], [cx + 38 * s, cy - 40 * s]], { c: '#fff', w: 5 }), R.line(cx, cy - 44 * s, cx, cy - 62 * s, { c: C.red, w: 4 }), R.circ(cx, cy - 68 * s, 12 * s, { c: C.orange, w: 3, fill: C.orange, gap: 3, fw: 3 })); }
  function lying() { // лежащий расслабленный мужчина (голова слева)
    return S(R.rect(-170, -40, 360, 18, { c: ink, w: 3, fill: C.ltblue, gap: 6, fw: 2 }),
      R.rect(-100, -110, 220, 70, { c: ink, w: 4 }), ...[0, 1, 2, 3].map(i => R.line(-60 + i * 55, -108, -60 + i * 55, -42, { c: C.blue, w: 6, r: .8 })),
      R.rect(120, -100, 100, 36, { c: ink, w: 4, fill: C.blue, gap: 6, fw: 3 }), R.rect(215, -100, 40, 36, { c: ink, w: 4, fill: C.blue, gap: 6, fw: 3 }),
      R.circ(-150, -120, 80, { c: ink, w: 4.5 }), R.ell(-150, -158, 86, 36, hat(C.orange, 4, 3)), R.poly([[-190, -118], [-186, -76], [-150, -56], [-114, -76], [-110, -118], [-130, -96], [-170, -96]], hat(C.orange, 4, 3.2)),
      face(-150, -120, 40, 'closed'), R.lin([[-80, -86], [-110, -170], [-150, -170]], { c: ink, w: 5 }), R.lin([[60, -100], [70, -150], [110, -150]], { c: ink, w: 5 }), glass(130, -168, 40, 56));
  }
  function nursery() { return []; }

  window.K = { face, carton, glass, jug, man, cat, animals, hex, lactoseA, lactoseB, lactaseMonster, hero, oldMan, cheese, woman, stall, outhouse, crowdFig, dna, mark, bacterium, scientist, girl, cake, lying, dot };
})();
