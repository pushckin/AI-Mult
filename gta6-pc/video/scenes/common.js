/* Общие персонажи и реквизит ролика «GTA 6 без ПК» (автор — сцены 1 и 7).
   Все функции возвращают массив rough-фигур (как R.*) в ЛОКАЛЬНЫХ координатах: (0,0) — пол под персонажем по центру, вверх — минус.
   Рисовать:  s.d(KG.guy({...}), at, dur, KG.tf(x, y, scale, flip))

   window.KG:
     guy({sit=true, pose:'pad'|'mug'|'cheer'|'down', expr:'happy'|'smile'|'big'|'cool'|'closed'|'sad'|'scared', reach:[x,y], headset=true})
         — довольный консольщик (худи-бирюза, рыжие волосы, гарнитура). sit=true — сидит на диване (KG.sofa), sit=false — стоит.
           pose 'pad' — держит геймпад; 'mug' — правая рука с кружкой в точке reach (по умолчанию [170,-360]); 'cheer' — руки вверх.
     skeleton({sit=false, pose:'hug'|'mug'|'wave'|'down', expr:'smile'|'happy'|'sad'|'dead', reach:[x,y], headset=true, part:'all'|'body'|'arms'})
         — мультяшный скелет ПК-игрок. sit=true — в игровом кресле (KG.chair). pose 'hug' — руки обхватывают монитор (KG.monitor),
           для правильного порядка рисования part:'body' (до монитора) и part:'arms' (после монитора).
     sofa(w=440), chair(), tv(w,h), monitor(), tower(), playIcon(s), mug(x,y,s), pad(x,y,s), money(x,y,s)
     tf(x,y,s=1,flip=false,rot=0) — transform-строка (flip зеркалит по горизонтали)
     life(sc, els, x, y, s, {flip, bob, sway, ph}) — «живость» (покачивание/дыхание) для списка уже нарисованных DrawEl
     blink(sc, at, x, y, s, flip, kind, o) — моргание guy / бегающие глаза скелета (оверлей; те же x,y,s,flip,sit что у фигуры)
     glow(sc, at, cx, cy, r, color, id) — пульсирующее свечение (рисовать ДО фигур, чтобы было позади)
     EYES — положения глаз (локальные) */
(function () {
  const { R, S, C, clamp, el } = E, K = window.K, ink = C.ink;
  const BONE = '#FBF8EE', SHADE = '#E2DCC8';
  const hat = (c, g = 5, w = 3) => ({ c, fill: c, gap: g, fw: w, w: 3.5 });
  const solid = (c, w = 4, r = 0.8) => ({ c: ink, w, fill: c, fs: 'solid', r });
  const bone = (x1, y1, x2, y2, t = 14) => S(R.line(x1, y1, x2, y2, { c: ink, w: t + 7, r: 0.25 }), R.line(x1, y1, x2, y2, { c: BONE, w: t, r: 0.2 }));
  const knob = (x, y, d = 22) => R.circ(x, y, d, { c: ink, w: 4, fill: BONE, fs: 'solid', r: 0.5 });

  const tf = (x, y, s = 1, flip = false, rot = 0) => `translate(${x},${y})${rot ? ` rotate(${rot})` : ''} scale(${flip ? -s : s},${s})`;

  /* ---------- реквизит ---------- */
  function mug(x, y, s = 1) { // (x,y) — центр корпуса, ручка слева (со стороны владельца)
    const q = v => v * s;
    return S(R.rect(x - q(30), y - q(34), q(60), q(68), { c: ink, w: 4, fill: C.yellow, gap: 5, fw: 3 }),
      R.curve([[x - q(30), y - q(18)], [x - q(58), y - q(20)], [x - q(58), y + q(18)], [x - q(30), y + q(16)]], { c: ink, w: 4.5, r: 0.7 }),
      R.circ(x - q(16), y - q(38), q(26), solid('#fff', 3.5, 0.6)), R.circ(x + q(8), y - q(42), q(30), solid('#fff', 3.5, 0.6)), R.circ(x + q(24), y - q(36), q(22), solid('#fff', 3.5, 0.6)),
      R.line(x - q(8), y - q(12), x - q(8), y + q(22), { c: '#fff', w: 4, r: 0.3 }), R.line(x + q(10), y - q(6), x + q(10), y + q(26), { c: '#fff', w: 4, r: 0.3 }));
  }
  function pad(x, y, s = 1) { // геймпад
    const q = v => v * s;
    return S(R.ell(x - q(46), y + q(12), q(46), q(60), solid('#3A3F4B', 4, 0.7)), R.ell(x + q(46), y + q(12), q(46), q(60), solid('#3A3F4B', 4, 0.7)),
      R.rect(x - q(54), y - q(26), q(108), q(56), solid('#3A3F4B', 4.5, 0.7)),
      R.line(x - q(40), y - q(4), x - q(18), y - q(4), { c: '#fff', w: 5, r: 0.2 }), R.line(x - q(29), y - q(15), x - q(29), y + q(7), { c: '#fff', w: 5, r: 0.2 }),
      R.circ(x + q(18), y + q(4), q(14), solid(C.green, 2.5, 0.4)), R.circ(x + q(40), y - q(8), q(14), solid(C.red, 2.5, 0.4)), R.circ(x + q(40), y + q(16), q(14), solid(C.blue, 2.5, 0.4)),
      R.circ(x - q(8), y + q(22), q(18), solid('#fff', 2.5, 0.4)), R.circ(x + q(12), y + q(26), q(18), solid('#fff', 2.5, 0.4)));
  }
  function money(x, y, s = 1) { // купюра с «$» (для вставок)
    return S(R.rect(x - 40 * s, y - 20 * s, 80 * s, 40 * s, { c: ink, w: 3.5, fill: C.ltgreen, gap: 5, fw: 2 }), R.circ(x, y, 24 * s, { c: ink, w: 3, r: 0.5 }));
  }
  function playIcon(s = 1) { // «YouTube»-значок: красный прямоугольник с треугольником, центр (0,0)
    return S(R.rect(-62 * s, -42 * s, 124 * s, 84 * s, { c: '#B52B37', w: 4.5, fill: C.red, fs: 'solid', r: 0.7 }),
      R.poly([[-16 * s, -22 * s], [-16 * s, 22 * s], [26 * s, 0]], { c: '#fff', w: 3, fill: '#fff', fs: 'solid', r: 0.5 }));
  }

  /* ---------- мебель ---------- */
  function sofa(w = 440) {
    const h = w / 2, g = { c: ink, w: 4.5, fill: C.green, gap: 7, fw: 2.8 };
    return S(R.rect(-h + 30, -350, w - 60, 250, g),                                // спинка
      R.rect(-h + 40, -130, w - 80, 74, { c: ink, w: 4.5, fill: C.ltgreen, gap: 8, fw: 2 }),   // сиденье
      R.rect(-h - 4, -250, 60, 200, g), R.rect(h - 56, -250, 60, 200, g),          // подлокотники
      R.ell(-h + 26, -255, 64, 30, solid(C.green, 4.5, 0.6)), R.ell(h - 26, -255, 64, 30, solid(C.green, 4.5, 0.6)),
      R.line(-h + 6, -50, -h + 6, -8, { w: 8, r: 0.4 }), R.line(h - 6, -50, h - 6, -8, { w: 8, r: 0.4 }));
  }
  function chair() { // игровое кресло, вид спереди; сидит скелет (голова на y≈-460)
    const blk = { c: ink, w: 4.5, fill: ink, gap: 5, fw: 3.2 };
    const spokes = [];
    for (const a of [-2.55, -1.65, -1.0, 0.0, 0.9]) spokes.push(R.line(0, -30, Math.cos(a) * 125, Math.sin(a) * 0 - 10, { w: 7, r: 0.5 }));
    return S(R.poly([[-112, -548], [112, -548], [132, -470], [128, -140], [-128, -140], [-132, -470]], { c: ink, w: 4.5, fill: '#2B2F3A', fs: 'solid', r: 0.8 }),
      R.poly([[-112, -548], [-92, -548], [-92, -140], [-128, -140], [-132, -470]], { c: ink, w: 3.5, fill: C.red, gap: 5, fw: 3 }),
      R.poly([[112, -548], [92, -548], [92, -140], [128, -140], [132, -470]], { c: ink, w: 3.5, fill: C.red, gap: 5, fw: 3 }),
      R.line(-108, -500, -108, -170, { c: '#fff', w: 4, r: 0.6 }), R.line(108, -500, 108, -170, { c: '#fff', w: 4, r: 0.6 }),
      R.rect(-148, -140, 296, 44, { c: ink, w: 4.5, fill: '#2B2F3A', fs: 'solid', r: 0.8 }), R.line(-120, -118, 120, -118, { c: C.red, w: 5, r: 0.5 }),
      R.line(0, -96, 0, -36, { w: 14, r: 0.3 }), ...spokes,
      R.circ(-128, -12, 22, solid('#555', 4, 0.5)), R.circ(128, -12, 22, solid('#555', 4, 0.5)), R.circ(-52, -8, 20, solid('#555', 4, 0.5)), R.circ(56, -8, 20, solid('#555', 4, 0.5)));
  }
  function tv(w = 440, h = 270) { // ТВ, (0,0) — центр низа корпуса; экран тёмный
    return S(R.rect(-w / 2, -h, w, h, { c: ink, w: 6, fill: '#8A8F98', fs: 'solid', r: 0.8 }),
      R.rect(-w / 2 + 18, -h + 18, w - 36, h - 36, { c: ink, w: 4, fill: '#1E2630', fs: 'solid', r: 0.8 }),
      R.circ(w / 2 - 12, -10, 9, solid(C.green, 2.5, 0.4)));
  }
  function monitor() { // монитор для обнимашек: центр (0,-240), 350×230
    return S(R.rect(-175, -355, 350, 230, { c: ink, w: 6, fill: '#3A3F4B', fs: 'solid', r: 0.8 }),
      R.rect(-158, -340, 316, 180, { c: ink, w: 4, fill: '#D5F0FF', fs: 'solid', r: 0.7 }),
      R.line(-130, -330, -60, -330, { c: '#fff', w: 8, r: 0.3 }), R.circ(0, -140, 8, solid(C.green, 2.5, 0.3)));
  }
  function tower() { // системник с окном; центр низа (0,0), 140×330, окно справа-спереди
    return S(R.rect(-70, -330, 140, 330, { c: ink, w: 6, fill: '#3A3F4B', fs: 'solid', r: 0.9 }),
      R.rect(-52, -310, 104, 230, { c: ink, w: 4, fill: '#1B2430', fs: 'solid', r: 0.7 }),
      R.circ(0, -245, 62, { c: '#9FB2C4', w: 4, r: 0.6 }), R.circ(0, -245, 14, solid('#9FB2C4', 3, 0.4)),
      R.circ(0, -150, 62, { c: '#9FB2C4', w: 4, r: 0.6 }), R.circ(0, -150, 14, solid('#9FB2C4', 3, 0.4)),
      R.circ(0, -40, 26, solid('#2B2F3A', 3.5, 0.5)), R.circ(0, -40, 7, solid(C.green, 2, 0.3)),
      R.line(-84, -330, -84, 0, { c: ink, w: 0.1, r: 0 }));
  }

  /* ---------- консольщик ---------- */
  const DY = 40;
  function guy(o = {}) {
    const sit = o.sit !== false, pose = o.pose || 'pad', expr = o.expr || 'happy', dy = sit ? 0 : DY, Y = v => v - dy;
    const P = [];
    const legTop = sit ? -150 : -232;
    for (const sx of [-1, 1]) {
      if (sit) P.push(R.ell(sx * 46, -146, 76, 66, hat(C.blue, 6, 3)));
      P.push(R.rect(sx * 44 - 24, legTop + (sit ? 20 : 0), 48, -30 - (legTop + (sit ? 20 : 0)), { c: ink, w: 4.5, fill: C.blue, gap: 6, fw: 3 }));
      P.push(R.ell(sx * 44 + sx * 8, -16, 72, 30, { c: ink, w: 4.5, fill: C.red, gap: 5, fw: 2.5 }));
    }
    // торс (худи)
    const tor = [[-70, Y(-355)], [70, Y(-355)], [82, Y(-168)], [-82, Y(-168)]];
    P.push(R.poly(tor, { c: ink, w: 4.5, fill: C.ltblue, fs: 'solid', r: 0.8 }), R.poly(tor, { c: ink, w: 4, fill: C.blue, gap: 8, fw: 2.5 }));
    P.push(R.curve([[-30, Y(-352)], [0, Y(-318)], [30, Y(-352)]], { c: ink, w: 4, r: 0.5 }), R.line(-16, Y(-330), -22, Y(-286), { c: ink, w: 3.5, r: 0.4 }), R.line(16, Y(-330), 22, Y(-286), { c: ink, w: 3.5, r: 0.4 }));
    P.push(R.poly([[-44, Y(-250)], [44, Y(-250)], [38, Y(-206)], [-38, Y(-206)]], { c: ink, w: 3.2, r: 0.6 }));
    // шея, голова
    P.push(R.rect(-16, Y(-382), 32, 34, { c: ink, w: 3.5, fill: C.skin, fs: 'solid', r: 0.5 }));
    // руки (до головы, чтобы голова их не перекрывала)
    const arm = (a, b, c, hand = true) => S(R.lin([a, b, c], { c: ink, w: 15, r: 0.4 }), R.lin([a, b, c], { c: C.ltblue, w: 8, r: 0.3 }), hand ? R.circ(c[0], c[1], 28, solid(C.skin, 3.5, 0.5)) : []);
    if (pose === 'pad') {
      P.push(arm([-70, Y(-335)], [-112, Y(-262)], [-52, Y(-226)]), arm([70, Y(-335)], [112, Y(-262)], [52, Y(-226)]), pad(0, Y(-226), 1));
    } else if (pose === 'mug') {
      const [rx, ry] = o.reach || [170, -360];
      P.push(arm([-70, Y(-335)], [-108, Y(-262)], [-98, Y(-198)]));
      P.push(arm([70, Y(-335)], [128, Y(-280)], [rx, ry]), mug(rx + 22, ry - 8, 1));
      P.push(R.circ(rx + 4, ry + 4, 26, solid(C.skin, 3.5, 0.5)));
    } else if (pose === 'cheer') {
      P.push(arm([-70, Y(-335)], [-130, Y(-380)], [-142, Y(-470)]), arm([70, Y(-335)], [130, Y(-380)], [142, Y(-470)]));
    } else {
      P.push(arm([-70, Y(-335)], [-108, Y(-262)], [-98, Y(-198)]), arm([70, Y(-335)], [108, Y(-262)], [98, Y(-198)]));
    }
    const cy = Y(-436);
    P.push(R.circ(-66, cy + 8, 26, solid(C.skin, 3.5, 0.5)), R.circ(66, cy + 8, 26, solid(C.skin, 3.5, 0.5)));  // уши
    P.push(R.circ(0, cy, 134, { c: ink, w: 4.5, fill: C.skin, fs: 'solid', r: 0.7 }));
    // причёска
    P.push(R.poly([[-64, cy - 20], [-56, cy - 62], [-30, cy - 74], [-8, cy - 66], [6, cy - 82], [28, cy - 66], [54, cy - 60], [64, cy - 20], [44, cy - 40], [10, cy - 46], [-28, cy - 42]], hat(C.orange, 4, 3.2)));
    P.push(R.poly([[-6, cy - 66], [4, cy - 96], [16, cy - 64]], hat(C.orange, 3, 3)));
    // гарнитура
    if (o.headset !== false) P.push(R.arc(0, cy - 4, 150, 150, Math.PI * 1.06, Math.PI * 1.94, false, { c: ink, w: 8, r: 0.5 }),
      R.ell(-72, cy + 8, 22, 50, solid(C.red, 4, 0.5)), R.ell(72, cy + 8, 22, 50, solid(C.red, 4, 0.5)));
    P.push(K.face(0, cy + 4, 62, expr));
    P.push(R.circ(-42, cy + 30, 16, { c: C.ltred, w: 2, fill: C.ltred, fs: 'solid', r: 0.4 }), R.circ(42, cy + 30, 16, { c: C.ltred, w: 2, fill: C.ltred, fs: 'solid', r: 0.4 }));
    return S(...P);
  }

  /* ---------- скелет ---------- */
  function skeleton(o = {}) {
    const sit = !!o.sit, pose = o.pose || 'down', expr = o.expr || 'smile', part = o.part || 'all', dy = sit ? 0 : 50, Y = v => v - dy;
    const body = [], arms = [];
    const hip = sit ? -150 : -230;
    // ноги
    for (const sx of [-1, 1]) {
      const kx = sit ? sx * 100 : sx * 46, ky = -118, fx = sit ? sx * 104 : sx * 46;
      body.push(bone(sx * 34, hip, kx, ky), bone(kx, ky, fx, -26), knob(kx, ky, 26), R.ell(fx + sx * 14, -10, 64, 26, { c: ink, w: 4.5, fill: BONE, fs: 'solid', r: 0.6 }));
    }
    // позвоночник, таз, грудная клетка
    body.push(bone(0, Y(-262), 0, hip, 12));
    for (let i = 0; i < 4; i++) body.push(R.line(-11, Y(-250) + (hip - Y(-250)) * i / 4 * 0.9, 11, Y(-250) + (hip - Y(-250)) * i / 4 * 0.9, { c: ink, w: 5, r: 0.2 }));
    body.push(R.ell(0, hip, 116, 52, { c: ink, w: 5, fill: BONE, fs: 'solid', r: 0.7 }), R.ell(-26, hip, 28, 20, solid(SHADE, 3, 0.4)), R.ell(26, hip, 28, 20, solid(SHADE, 3, 0.4)));
    body.push(R.ell(0, Y(-322), 130, 150, { c: ink, w: 5, fill: BONE, fs: 'solid', r: 0.8 }));
    for (let i = 0; i < 4; i++) { const y = Y(-356 + i * 26), w = 54 - i * 4; body.push(R.curve([[-w, y], [0, y + 14], [w, y]], { c: ink, w: 4.5, r: 0.5 })); }
    body.push(R.line(0, Y(-368), 0, Y(-276), { c: ink, w: 5, r: 0.3 }), bone(-74, Y(-376), 74, Y(-376), 12));
    body.push(R.line(0, Y(-392), 0, Y(-376), { c: ink, w: 14, r: 0.2 }));
    // череп
    const cy = Y(-462);
    body.push(R.poly([[-48, cy + 50], [48, cy + 50], [38, cy + 92], [-38, cy + 92]], { c: ink, w: 4.5, fill: BONE, fs: 'solid', r: 0.6 }));  // челюсть
    body.push(R.circ(0, cy, 140, { c: ink, w: 5, fill: BONE, fs: 'solid', r: 0.7 }));
    body.push(R.curve([[-62, cy + 12], [-50, cy + 36], [-30, cy + 48]], { c: SHADE, w: 4, r: 0.3 }), R.curve([[62, cy + 12], [50, cy + 36], [30, cy + 48]], { c: SHADE, w: 4, r: 0.3 }));
    if (expr === 'dead') {
      for (const sx of [-1, 1]) body.push(R.line(sx * 26 - 14, cy - 18, sx * 26 + 14, cy + 14, { w: 7, r: 0.3 }), R.line(sx * 26 + 14, cy - 18, sx * 26 - 14, cy + 14, { w: 7, r: 0.3 }));
    } else body.push(R.ell(-28, cy - 6, 38, 46, solid(ink, 3, 0.5)), R.ell(28, cy - 6, 38, 46, solid(ink, 3, 0.5)));
    body.push(R.poly([[0, cy + 22], [-9, cy + 42], [9, cy + 42]], solid(ink, 3, 0.4)));
    // зубы
    const my = cy + 56;
    body.push(R.rect(-34, my - 4, 68, 28, { c: ink, w: 4, fill: '#fff', fs: 'solid', r: 0.5 }), R.line(-17, my - 4, -17, my + 24, { w: 3.5, r: 0.2 }), R.line(0, my - 4, 0, my + 24, { w: 3.5, r: 0.2 }), R.line(17, my - 4, 17, my + 24, { w: 3.5, r: 0.2 }));
    if (expr === 'happy' || expr === 'smile') body.push(R.curve([[-40, my - 6], [0, my + 8], [40, my - 6]], { c: ink, w: 4, r: 0.4 }));
    if (expr === 'sad') body.push(R.curve([[-34, my + 30], [0, my + 14], [34, my + 30]], { c: ink, w: 4, r: 0.4 }), R.line(-52, cy - 42, -10, cy - 30, { w: 5, r: 0.3 }), R.line(52, cy - 42, 10, cy - 30, { w: 5, r: 0.3 }));
    // волосок
    body.push(R.curve([[-6, cy - 68], [-22, cy - 98], [-4, cy - 116]], { c: ink, w: 4, r: 0.4 }), R.curve([[8, cy - 68], [22, cy - 96], [34, cy - 90]], { c: ink, w: 4, r: 0.4 }), R.curve([[0, cy - 69], [4, cy - 100], [-8, cy - 124]], { c: ink, w: 4, r: 0.4 }));
    // гарнитура
    if (o.headset !== false) body.push(R.arc(0, cy - 4, 160, 160, Math.PI * 1.06, Math.PI * 1.94, false, { c: ink, w: 8, r: 0.5 }),
      R.ell(-74, cy + 6, 24, 54, solid(C.red, 4, 0.5)), R.ell(74, cy + 6, 24, 54, solid(C.red, 4, 0.5)),
      R.curve([[-76, cy + 34], [-78, cy + 80], [-52, cy + 96], [-30, cy + 96]], { c: ink, w: 4.5, r: 0.5 }), R.circ(-28, cy + 96, 16, solid(C.red, 3, 0.4)));
    // руки
    const sh = Y(-376), ar = (a, b, c) => S(bone(a[0], a[1], b[0], b[1], 13), bone(b[0], b[1], c[0], c[1], 13), knob(b[0], b[1], 20), knob(c[0], c[1], 28));
    if (pose === 'hug') arms.push(ar([-74, sh], [-188, Y(-300)], [-146, Y(-190)]), ar([74, sh], [188, Y(-300)], [146, Y(-190)]));
    else if (pose === 'mug') {
      const [rx, ry] = o.reach || [170, -360];
      arms.push(ar([-74, sh], [-112, Y(-300)], [-100, Y(-220)]), ar([74, sh], [136, Y(-310)], [rx, ry]), mug(rx + 24, ry - 8, 1), knob(rx + 6, ry + 4, 28));
    } else if (pose === 'wave') arms.push(ar([-74, sh], [-112, Y(-300)], [-100, Y(-220)]), ar([74, sh], [150, Y(-400)], [168, Y(-500)]));
    else arms.push(ar([-74, sh], [-112, Y(-300)], [-100, Y(-220)]), ar([74, sh], [112, Y(-300)], [100, Y(-220)]));
    if (part === 'body') return S(...body);
    if (part === 'arms') return S(...arms);
    return S(...body, ...arms);
  }

  const EYES = {
    guy: sit => { const cy = (sit === false ? -DY : 0) - 436 + 4 - 6; return { l: [-25, cy], r: [25, cy] }; },
    skull: sit => { const cy = (sit ? 0 : -50) - 462 - 6; return { l: [-28, cy], r: [28, cy], w: 38, h: 46 }; },
  };

  /* ---------- оживление ---------- */
  function life(sc, els, x, y, s, o = {}) {
    const ph = o.ph || 0, bob = o.bob ?? 3, sway = o.sway ?? 0.7;
    const f = lt => tf(x, y + Math.sin(lt * 2.4 + ph) * bob * 0.5 - bob * 0.5, s, o.flip, Math.sin(lt * 1.5 + ph) * sway);
    for (const e of [].concat(els)) e.dyn = f;
    return f;
  }
  function blink(sc, at, x, y, s, flip, kind, o = {}) { // оверлей: моргание консольщика / бегающие зрачки скелета
    const f = o.f || (() => tf(x, y, s, flip, 0));
    const ph = o.ph || 0;
    if (kind === 'guy') {
      const e = EYES.guy(o.sit), parts = [];
      sc.anim(at, null, g => { for (const sx of [e.l, e.r]) { parts.push(el('rect', { x: sx[0] - 12, y: sx[1] - 10, width: 24, height: 20, fill: C.skin }, g), el('line', { x1: sx[0] - 10, y1: sx[1], x2: sx[0] + 10, y2: sx[1], stroke: ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, g)); } },
        (lt, g) => { g.setAttribute('transform', f(lt)); g.style.display = ((lt + ph) % 3.1) < 0.16 ? '' : 'none'; });
    } else {
      const e = EYES.skull(o.sit), dots = [];
      sc.anim(at, null, g => { for (const sx of [e.l, e.r]) dots.push(el('circle', { r: 6, fill: '#fff' }, g)); },
        (lt, g) => { g.setAttribute('transform', f(lt)); const a = (o.look != null ? o.look : Math.sin(lt * 1.1 + ph)) * 9, b = Math.sin(lt * 0.7 + ph) * 3;
          [e.l, e.r].forEach((p, i) => { dots[i].setAttribute('cx', p[0] + a); dots[i].setAttribute('cy', p[1] + b - 2); }); });
    }
  }
  function glow(sc, at, cx, cy, r, color = '#7FD6FF', id = 'gl') {
    let c;
    sc.anim(at, null, g => {
      const d = el('defs', {}, g), rg = el('radialGradient', { id }, d);
      el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0.75 }, rg); el('stop', { offset: '55%', 'stop-color': color, 'stop-opacity': 0.28 }, rg); el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }, rg);
      c = el('circle', { cx, cy, r, fill: `url(#${id})` }, g);
    }, lt => { const p = 1 + Math.sin(lt * 4.2) * 0.06 + Math.sin(lt * 11) * 0.02; c.setAttribute('r', r * p); c.setAttribute('opacity', clamp(lt / 0.4) * (0.85 + Math.sin(lt * 6.3) * 0.15)); });
  }

  window.KG = { guy, skeleton, sofa, chair, tv, monitor, tower, playIcon, mug, pad, money, tf, life, blink, glow, EYES, BONE };
})();
