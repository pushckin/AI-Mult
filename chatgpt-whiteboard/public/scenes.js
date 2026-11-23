window.buildScenes = () => {
const { C, Ctx, defineScene, textW, clamp, easeInOut, easeOut, spring, el, defs } = engine;
const { k, b, r, o, g } = { k: C.k, b: C.b, r: C.r, o: C.o, g: C.g };
let RV = 0;

// ---------- общие компоненты ----------
function robot(c, op = {}) {
  const col = op.col || b, mood = op.mood || 'happy';
  const legs = [c.line(-45, 100, -45, 160), c.line(45, 100, 45, 160), c.lin([[-80, 168], [-45, 160], [-10, 168]]), c.lin([[10, 168], [45, 160], [80, 168]])];
  const body = [c.rrect(-90, -70, 180, 170, 18, { f: col, gap: 13, fw: 2 }), c.rect(-40, -30, 80, 56), c.circ(-18, -2, 11, { f: o, fs: 'solid' }), c.circ(18, -2, 11, { f: g, fs: 'solid' })];
  const armL = c.lin(op.armL || [[-90, -30], [-145, 15], [-135, 75]], { w: 5 });
  const armR = c.lin(op.armR || [[90, -30], [145, 15], [135, 75]], { w: 5 });
  const head = [c.rect(-18, -112, 36, 44), c.rrect(-100, -260, 200, 150, 28, { f: C.w, fs: 'solid' }), c.rect(-122, -215, 22, 56), c.rect(100, -215, 22, 56)];
  if (!op.noAntenna) head.push(c.line(0, -260, 0, -300), c.circ(0, -314, 26, { f: o, fs: 'solid' }));
  const face = [];
  const ex = mood === 'conf' ? [[-45, -195, 58], [45, -195, 38]] : [[-45, -195, 50], [45, -195, 50]];
  if (op.glasses === 'sun') {
    face.push(c.rect(-76, -218, 68, 44, { f: k, fs: 'solid' }), c.rect(8, -218, 68, 44, { f: k, fs: 'solid' }), c.line(-8, -205, 8, -205), c.line(-76, -205, -98, -215), c.line(76, -205, 98, -215));
  } else {
    ex.forEach(([x, y, d]) => { face.push(c.circ(x, y, d)); face.push(c.circ(x + (mood === 'conf' ? 6 : 0), y + 2, 17, { f: k, fs: 'solid' })); });
    if (op.glasses === 'round') face.push(c.circ(-45, -195, 78, { c: k, w: 5 }), c.circ(45, -195, 78, { c: k, w: 5 }), c.line(-6, -195, 6, -195), c.line(-84, -200, -100, -208), c.line(84, -200, 100, -208));
  }
  if (mood === 'conf') face.push(c.curve([[-45, -135], [-22, -150], [0, -132], [22, -150], [45, -135]]));
  else face.push(c.curve([[-45, -150], [-20, -127], [20, -127], [45, -150]], { w: 5 }));
  if (op.brow) face.push(c.line(20, -240, 70, -228), c.line(-70, -228, -20, -240));
  return { legs, body, armL, armR, head, face };
}
function robotAll(R) { return [R.legs, R.body, R.armL, R.armR, R.head, R.face]; }
function brain(c, R = 100, col = b) {
  const pts = []; const n = 14;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = R * (1 + .13 * Math.sin(i * 2.6 + 1)); pts.push([Math.cos(a) * rr * 1.15, Math.sin(a) * rr * .9]); }
  return [c.closed(pts, { c: col, w: 5, f: col, gap: 14, fw: 2 }),
    c.curve([[0, -R * .85], [-R * .15, -R * .3], [R * .12, R * .2], [0, R * .8]], { c: col, w: 4 }),
    c.curve([[-R * .85, -R * .1], [-R * .45, -R * .3], [-R * .3, R * .1]], { c: col, w: 4 }),
    c.curve([[R * .85, R * .05], [R * .45, -R * .25], [R * .3, R * .2]], { c: col, w: 4 })];
}
function person(c, op = {}) {
  const head = [c.circ(0, -230, 92), c.curve([[-44, -250], [-24, -282], [10, -280], [30, -262], [44, -246]], { w: 6 }), c.circ(-18, -236, 9, { f: k, fs: 'solid' }), c.circ(18, -236, 9, { f: k, fs: 'solid' }), c.curve([[-24, -208], [-8, -194], [10, -194], [26, -208]], { w: 5 })];
  const body = [c.line(0, -184, 0, -70, { w: 5 }), c.line(0, -70, -38, 0, { w: 5 }), c.line(0, -70, 38, 0, { w: 5 })];
  const armL = c.lin(op.armL || [[0, -160], [-55, -110], [-60, -50]], { w: 5 });
  const armR = c.lin(op.armR || [[0, -160], [55, -110], [60, -50]], { w: 5 });
  return { head, body, armL, armR };
}
// ввод в рамке «выезжающей» области (проявление слева направо)
function reveal(S, pieces, t0, dur, box, col) {
  const id = 'rv' + (RV++);
  const cp = el('clipPath', { id }, defs);
  const cr = el('rect', { x: box.x, y: box.y, width: 0, height: box.h }, cp);
  const pg = S.group(); pg.setAttribute('clip-path', `url(#${id})`);
  S.draw(pieces, t0, .01, { parent: pg, instant: true, quiet: true });
  S.add({ t0, t1: t0 + dur,
    update(t) { cr.setAttribute('width', box.w * clamp((t - t0) / dur)); },
    tip(t) { const u = (t - t0) / dur; return u > 0 && u < 1 ? { x: box.x + box.w * u, y: box.y + box.h * .5, c: col } : null; } });
  S.sfx('scribble', t0, .45, dur);
}
const C0 = new Ctx();
const words = (str, size, x0, wt = 700) => { // позиции слов в строке
  const out = []; let x = x0;
  for (const w of str.split(' ')) { out.push({ w, x, width: textW(w, size, wt) }); x += textW(w + ' ', size, wt); }
  return out;
};

// =====================================================================
// СЦЕНА 1. ЗАЦЕПКА
// =====================================================================
defineScene('s1', 15, 2, S => {
  S.text('КАК РАБОТАЕТ ИИ?', 960, 104, { size: 88, c: b, anchor: 'middle', t0: .2, dur: 1.5 });
  // робот-мозг
  const c = new Ctx(480, 720, 1.1);
  const R = robot(c, { noAntenna: true, col: b });
  S.draw([R.legs, R.body, R.armL, R.armR], 2.2, 1.4);
  S.draw([R.head, R.face], 3.4, 1.4);
  S.draw(brain(new Ctx(480, 720 - 330 * 1.1, .85), 80, C.b), 4.3, 1.1);
  S.text('ChatGPT', 480, 1010, { size: 92, c: k, anchor: 'middle', t0: 4.4, dur: .9 });
  // оранжевые искры вокруг головы
  const cx = 480, cy = 720 - 230 * 1.1; const sp = [];
  for (let i = 0; i < 10; i++) { const a = (i < 5 ? (-170 + i * 14) : (-70 + (i - 5) * 14)) * Math.PI / 180; const r1 = 215, r2 = 268; sp.push(C0.line(cx + Math.cos(a) * r1 * 1.0, cy + Math.sin(a) * r1 * .95 - 20, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * .95 - 20, { c: o, w: 6 })); }
  S.draw(sp, 4.6, .8, { opacity: u => u < .8 ? 1 : .65 + .35 * Math.sin(u * 14) });
  S.sfx('sparkle', 4.6, .7);
  // смартфон с клавиатурой и строкой Т9
  S.draw([C0.rrect(1200, 340, 380, 650, 38, { w: 5 }), C0.rrect(1222, 385, 336, 560, 18, { w: 3 })], 5.0, 1.0);
  S.text('Привет, как', 1250, 460, { size: 48, t0: 6.1, dur: .8 });
  S.add({ t0: 6.9, update(t) { cursor.style.display = Math.floor(t * 2.5) % 2 === 0 && t > 6.9 ? '' : 'none'; } });
  const cursorG = S.group(); const cursor = el('line', { x1: 1250 + textW('Привет, как', 48) + 8, y1: 425, x2: 1250 + textW('Привет, как', 48) + 8, y2: 470, stroke: k, 'stroke-width': 4 }, cursorG);
  const strip = [C0.rect(1240, 495, 300, 66, { c: o, w: 4 }), C0.line(1340, 495, 1340, 561, { c: o, w: 3 }), C0.line(1440, 495, 1440, 561, { c: o, w: 3 })];
  S.draw(strip, 6.9, .8);
  ['дела', 'ты', 'там'].forEach((wd, i) => S.text(wd, 1290 + i * 100, 543, { size: 40, anchor: 'middle', t0: 7.6 + i * .2, dur: .4, c: b }));
  const keys = []; const ky = [625, 695, 765];
  [7, 7, 6].forEach((n, row) => { for (let i = 0; i < n; i++) keys.push(C0.rect(1242 + i * 43 + (row === 2 ? 22 : 0), ky[row], 36, 50, { w: 3, r: .9 })); });
  keys.push(C0.rect(1290, 840, 200, 52, { w: 3, r: .9 }));
  S.draw(keys, 7.6, 1.5);
  S.sfx('typing', 7.7, .5);
  S.text('Т9', 1700, 540, { size: 100, c: o, anchor: 'middle', t0: 8.2, dur: .5 });
  S.draw(C0.carrow([[1640, 560], [1610, 540], [1565, 535]], { c: o, w: 5 }), 8.7, .4);
  // реплики
  S.bubble(['Слушай, а ты точно не я,', 'только после спортзала?'], 1330, 235, 1390, 345, 9.0, { size: 40 });
  S.bubble(['Тихо, не пали контору!'], 470, 215, 480, 300, 11.0, { size: 44 });
  S.sfx('sponge', 13, 1);
});

// =====================================================================
// СЦЕНА 2. УГАДАЙ СЛЕДУЮЩЕЕ СЛОВО
// =====================================================================
defineScene('s2', 30, 2, S => {
  const fs = 110, px = 220, py = 170;
  const wOn = textW('Кот сел на', fs), wordX = px + textW('Кот сел на ', fs);
  S.draw([C0.rrect(150, 60, 1620, 150, 26, { w: 5, c: k })], 0.2, 1.0);
  S.text('Кот сел на', px, py, { size: fs, t0: 1.0, dur: 1.1 });
  const dots = S.text('...', wordX, py, { size: fs, t0: 2.1, dur: .5, hideAt: 15.4 });
  const cur = el('line', { stroke: k, 'stroke-width': 5, 'stroke-linecap': 'round' }, S.group());
  const land = 15.4, wWord = textW('коврик', fs);
  S.add({ t0: 2.6, update(t) {
    const x = (t < land ? wordX + textW('...', fs) + 12 : wordX + wWord + 14);
    cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.setAttribute('y1', py - 78); cur.setAttribute('y2', py + 12);
    cur.style.display = t > 2.6 && Math.floor(t * 2.5) % 2 === 0 ? '' : 'none';
  } });
  const rows = [
    { w: 'коврик', p: '65%', n: 65, c: g }, { w: 'диван', p: '25%', n: 25, c: b },
    { w: 'клавиатуру', p: '9%', n: 9, c: o }, { w: 'синхрофазотрон', p: '0.01%', n: .01, c: r },
  ];
  const ys = [360, 500, 640, 780]; const bx = 690, scl = 11.5;
  rows.forEach((rw, i) => {
    const t0 = 3.6 + i * 2.2, y = ys[i], wd = Math.max(rw.n * scl, 9);
    S.text(rw.w, 640, y, { size: 64, anchor: 'end', t0, dur: .9 });
    reveal(S, [C0.rect(bx, y - 54, wd, 62, { c: rw.c, f: rw.c, gap: 8, fw: 3.5, w: 4 })], t0 + .9, 1.5, { x: bx - 6, y: y - 70, w: wd + 20, h: 90 }, rw.c);
    S.text(rw.p, bx + wd + 22, y, { size: 60, c: rw.c, t0: t0 + 2.4, dur: .5 });
  });
  // самое подходящее слово переносится в фразу
  S.draw(C0.carrow([[1540, 305], [1450, 240], [1250, 190], [1010, 172]], { c: g, w: 6 }), 12.6, 1.0);
  S.sfx('whoosh', 13.8, .8);
  const sx = 640 - textW('коврик', 64), sy = 360, k0 = 13.9, dd = 1.4;
  S.text('коврик', wordX, py, { size: fs, c: g, t0: k0, instant: true, xf: u => {
    const q = easeInOut(clamp(u / dd)), s = 64 / fs + (1 - 64 / fs) * q, ax = sx + (wordX - sx) * q, ay = sy + (py - sy) * q;
    return `translate(${ax} ${ay}) scale(${s}) translate(${-wordX} ${-py})`; } });
  S.sfx('pop', 15.2, .8);
  // цикл
  const ccx = 1690, ccy = 570, cr = 95, cp = [];
  for (let i = 0; i <= 12; i++) { const a = (-70 + i * 28) * Math.PI / 180; cp.push([ccx + Math.cos(a) * cr, ccy + Math.sin(a) * cr]); }
  S.draw(C0.carrow(cp, { c: b, w: 7 }, 28), 17.0, 1.6);
  S.text('Повторить цикл', ccx, 760, { size: 56, c: b, anchor: 'middle', t0: 18.6, dur: .9 });
  S.bubble(['Меня опять не выбрали...'], 1180, 925, 710, 800, 21.5, { size: 48, c: r, tc: r });
  S.sfx('buzzer', 21.5, .35);
  S.sfx('sponge', 28, 1);
});

// =====================================================================
// СЦЕНА 3. ТОКЕНЫ И ВЕКТОРЫ
// =====================================================================
defineScene('s3', 35, 2, S => {
  const fs = 170, wA = textW('НЕЙРО', fs), wB = textW('СЕТЬ', fs), wT = textW('НЕЙРОСЕТЬ', fs);
  const x0 = 960 - wT / 2, by = 235, gap = 70;
  S.text('НЕЙРОСЕТЬ', x0, by, { size: fs, t0: .4, dur: 2.2, hideAt: 4.6 });
  const cutX = x0 + wA - 4;
  S.draw([C0.line(cutX, 40, cutX, 300, { c: r, w: 4, dash: true })], 3.0, 1.0, { notip: true, quiet: true, hideAt: 4.6 });
  const sc = S.custom(3.0, 4.9, (u, gg) => {
    const p = clamp(u / 1.0), y = 40 + 260 * p, open = Math.abs(Math.sin(u * 22)) * 18;
    gg.innerHTML = '';
    el('line', { x1: cutX, y1: y, x2: cutX - 30 - open * .3, y2: y - 70 - open, stroke: k, 'stroke-width': 6, 'stroke-linecap': 'round' }, gg);
    el('line', { x1: cutX, y1: y, x2: cutX + 30 + open * .3, y2: y - 70 - open, stroke: k, 'stroke-width': 6, 'stroke-linecap': 'round' }, gg);
    el('circle', { cx: cutX - 34 - open * .3, cy: y - 86 - open, r: 15, fill: 'none', stroke: r, 'stroke-width': 6 }, gg);
    el('circle', { cx: cutX + 34 + open * .3, cy: y - 86 - open, r: 15, fill: 'none', stroke: r, 'stroke-width': 6 }, gg);
  });
  S.sfx('snip', 3.0, .9); S.sfx('snip', 3.5, .8);
  const mv = u => `translate(${-gap * easeOut(clamp(u / .6))} 0)`, mv2 = u => `translate(${gap * easeOut(clamp(u / .6))} 0)`;
  S.text('НЕЙРО', x0, by, { size: fs, c: b, t0: 4.6, instant: true, xf: mv });
  S.text('СЕТЬ', x0 + wA, by, { size: fs, c: o, t0: 4.6, instant: true, xf: mv2 });
  const aX = x0 - gap + wA / 2, bX = x0 + wA + gap + wB / 2;
  S.draw([C0.rect(x0 - gap - 22, 70, wA + 44, 210, { c: b, w: 5 })], 5.3, .9);
  S.draw([C0.rect(x0 + wA + gap - 22, 70, wB + 44, 210, { c: o, w: 5 })], 6.2, .8);
  S.draw(C0.carrow([[aX, 290], [aX - 10, 325], [aX, 355]], { c: b, w: 5 }), 7.2, .5);
  S.draw(C0.carrow([[bX, 290], [bX + 10, 325], [bX, 355]], { c: o, w: 5 }), 7.6, .5);
  S.text('[4821]', aX, 450, { size: 110, c: b, anchor: 'middle', t0: 8.0, dur: 1.0 });
  S.text('[903]', bX, 450, { size: 110, c: o, anchor: 'middle', t0: 9.2, dur: .9 });
  S.text('токены', 280, 120, { size: 70, c: k, anchor: 'middle', t0: 10.4, dur: .7 });
  S.draw(C0.carrow([[330, 150], [370, 190], [400, 205]], { c: k, w: 4 }), 11.1, .4);
  // карта смыслов
  const ox = 200, oy = 1030;
  S.draw([C0.arrow(ox, oy, 1620, oy, { w: 5 }), C0.arrow(ox, oy, ox, 540, { w: 5 })], 13.0, 1.6);
  S.text('X', 1670, oy + 14, { size: 56, t0: 14.4, dur: .3 }); S.text('Y', ox, 520, { size: 56, anchor: 'middle', t0: 14.4, dur: .3 });
  S.text('Карта смыслов', 260, 590, { size: 66, c: g, t0: 14.8, dur: 1.0 });
  const pt = (x, y, label, col, t0, below) => {
    S.draw([C0.circ(x, y, 24, { c: col, f: col, fs: 'solid' })], t0, .3);
    if (below) S.text(label, x, y + 66, { size: 56, anchor: 'middle', t0: t0 + .3, dur: .6 });
    else S.text(label, x + 30, y + 18, { size: 56, t0: t0 + .3, dur: .6 });
  };
  pt(400, 905, 'Кот', b, 16.2); pt(560, 815, 'Собака', b, 17.2);
  S.draw([C0.ell(590, 870, 540, 260, { c: b, w: 4, dash: true })], 18.4, 1.0);
  pt(960, 770, 'Король', o, 19.8); pt(1120, 680, 'Королева', o, 20.8);
  S.draw([C0.ell(1140, 725, 600, 215, { c: o, w: 4, dash: true })], 22.0, 1.0);
  const tc = new Ctx(1535, 520, .6);
  S.draw([tc.rect(0, 40, 170, 70, { f: g, gap: 10 }), tc.rect(110, -20, 90, 60), tc.circ(40, 130, 90), tc.circ(160, 150, 52), tc.line(190, -20, 190, -50)], 24.0, 1.6);
  pt(1620, 700, 'Трактор', r, 25.7, true);
  S.sfx('sparkle', 25.7, .5);
  S.bubble(['Не толкайся, мы просто', 'рядом по смыслу!'], 1230, 940, 720, 915, 28.2, { size: 46, tail: 200 });
  S.sfx('sponge', 33, 1);
});

// =====================================================================
// СЦЕНА 4. ТРАНСФОРМЕР И ВНИМАНИЕ
// =====================================================================
defineScene('s4', 40, 2, S => {
  // старый растерянный робот со свитком
  const c = new Ctx(300, 360, .8);
  const R = robot(c, { mood: 'conf', col: '#8A8A8A', armR: [[90, -30], [150, 10], [150, 60]] });
  S.draw([R.legs, R.body, R.armL, R.armR], .3, 1.3); S.draw([R.head, R.face], 1.6, 1.4);
  const sc = new Ctx(0, 0, 1);
  S.draw([sc.rect(440, 380, 100, 170, { c: o, f: o, gap: 14 }), sc.ell(490, 380, 110, 26, { c: o }), sc.ell(490, 550, 110, 26, { c: o }), sc.line(460, 430, 520, 430, { w: 3 }), sc.line(460, 470, 520, 470, { w: 3 }), sc.line(460, 510, 505, 510, { w: 3 })], 3.0, 1.2);
  S.text('?', 100, 250, { size: 120, c: r, anchor: 'middle', t0: 4.4, dur: .3 });
  S.text('?', 70, 410, { size: 90, c: r, anchor: 'middle', t0: 4.8, dur: .3 });
  S.bubble(['Что было в начале?'], 630, 95, 400, 240, 5.4, { size: 46, tail: 140 });
  // GPT
  S.text('G', 790, 330, { size: 270, t0: 8.0, dur: .6 }); S.text('P', 975, 330, { size: 270, t0: 8.6, dur: .6 }); S.text('T', 1250, 330, { size: 270, t0: 9.2, dur: .6, c: o });
  S.draw([C0.ell(1300, 232, 190, 270, { c: o, w: 7 })], 10.0, 1.0);
  S.sfx('sparkle', 10.4, .6);
  S.text('Transformer, 2017', 1440, 405, { size: 66, c: o, t0: 11.2, dur: 1.4 });
  S.draw(C0.carrow([[1470, 360], [1440, 335], [1405, 315]], { c: o, w: 5 }), 12.6, .5);
  // «Старинный ЗАМОК»
  const fs = 100, x1 = 470, y1 = 770;
  const castle = new Ctx(150, 575, 1);
  S.draw([castle.rect(60, 60, 120, 150, { f: b, gap: 12 }), castle.rect(0, 30, 58, 180), castle.rect(182, 30, 58, 180),
    castle.lin([[0, 30], [0, 8], [14, 8], [14, 20], [29, 20], [29, 8], [43, 8], [43, 20], [58, 20], [58, 30]]),
    castle.lin([[182, 30], [182, 8], [196, 8], [196, 20], [211, 20], [211, 8], [225, 8], [225, 20], [240, 20], [240, 30]]),
    castle.curve([[100, 210], [100, 160], [120, 138], [140, 160], [140, 210]]), castle.line(120, 60, 120, 5), castle.poly([[120, 5], [168, 20], [120, 36]], { c: r, f: r, fs: 'solid' })], 14.5, 2.4);
  const w1 = words('Старинный ЗАМОК', fs, x1);
  S.text(w1[0].w, w1[0].x, y1, { size: fs, t0: 17.0, dur: 1.0 });
  S.text(w1[1].w, w1[1].x, y1, { size: fs, t0: 18.0, dur: 1.0, c: k });
  const a1 = w1[0].x + w1[0].width / 2, b1 = w1[1].x + w1[1].width / 2;
  S.draw(C0.carrow([[a1, 680], [a1 + (b1 - a1) * .25, 590], [(a1 + b1) / 2, 568], [b1 - (b1 - a1) * .25, 590], [b1, 680]], { c: b, w: 8 }, 30), 19.2, 1.2);
  // «Сломался ЗАМОК на двери»
  const y2 = 975, padl = new Ctx(190, 840, 1);
  S.draw([padl.rrect(0, 70, 150, 120, 14, { f: o, gap: 12 }), padl.curve([[25, 70], [25, 20], [75, -10], [125, 20], [125, 70]], { w: 7 }), padl.circ(75, 120, 26, { f: k, fs: 'solid' }), padl.line(75, 130, 75, 165, { w: 7 })], 21.0, 1.8);
  const w2 = words('Сломался ЗАМОК на двери', fs, x1);
  w2.forEach((wd, i) => S.text(wd.w, wd.x, y2, { size: fs, t0: 23.0 + i * .9, dur: .85 }));
  const a2 = w2[3].x + w2[3].width / 2, b2 = w2[1].x + w2[1].width / 2;
  S.draw(C0.carrow([[a2, 1000], [a2 - (a2 - b2) * .25, 1055], [(a2 + b2) / 2, 1068], [b2 + (a2 - b2) * .25, 1055], [b2, 1000]], { c: o, w: 8 }, 30), 27.2, 1.4);
  S.bubble(['Определитесь уже,', 'я крепость или железяка!'], 1570, 640, w1[1].x + w1[1].width + 28, 720, 30.0, { size: 46, tail: 260 });
  S.sfx('boing', 30.0, .5);
  S.sfx('sponge', 38, 1);
});

// =====================================================================
// СЦЕНА 5. ОБУЧЕНИЕ
// =====================================================================
defineScene('s5', 35, 2, S => {
  S.text('ЭТАП 1: ПРЕДОБУЧЕНИЕ', 480, 84, { size: 58, c: b, anchor: 'middle', t0: .3, dur: 1.6 });
  S.draw([C0.line(960, 40, 960, 1040, { w: 3, dash: true })], 1.4, 1.5, { quiet: true, notip: true });
  S.draw([C0.poly([[320, 340], [640, 340], [540, 470], [540, 530], [420, 530], [420, 470]], { c: b, f: b, gap: 14, w: 5 })], 2.0, 1.8);
  // падающие иконки: книга, страница, код
  const drop = (u, dly) => { const q = clamp((u - dly) / 1.5); return { y: easeInOut(q) * 215, a: q > .7 ? 1 - (q - .7) / .3 : 1, s: 1 - .55 * q }; };
  const icons = [
    (c) => [c.rect(-38, -30, 76, 60, { c: o, f: o, gap: 9 }), c.line(0, -30, 0, 30), c.line(-22, -10, -8, -10, { w: 3 }), c.line(8, -10, 22, -10, { w: 3 })],
    (c) => [c.rect(-32, -42, 64, 84, { c: b }), c.rect(-22, -32, 44, 14, { c: b, f: b, fs: 'solid' }), c.line(-22, -4, 22, -4, { w: 3 }), c.line(-22, 12, 22, 12, { w: 3 }), c.line(-22, 28, 8, 28, { w: 3 })],
  ];
  const ix = [380, 480, 580], iy = 205;
  const loops = [{ t: 3.8, first: true }, { t: 9.5 }, { t: 12.2 }, { t: 14.9 }, { t: 17.6 }, { t: 20.3 }, { t: 23.0 }, { t: 25.7 }, { t: 28.4 }];
  loops.forEach((lp, li) => {
    [0, 1, 2].forEach(j => {
      const cx = ix[j], t0 = lp.t + j * .35;
      const xf = u => { const d = drop(u, lp.first ? 1.6 : .2); return `translate(${cx} ${iy + d.y}) scale(${d.s}) translate(${-cx} ${-iy})`; };
      const op = u => drop(u, lp.first ? 1.6 : .2).a;
      const hideAt = t0 + (lp.first ? 3.5 : 2.2);
      if (j < 2) S.draw(icons[j](new Ctx(cx, iy, 1)), t0, lp.first ? .9 : .01, { xf, opacity: op, hideAt, instant: !lp.first, quiet: !lp.first });
      else S.text('</>', cx, iy + 18, { size: 62, c: g, anchor: 'middle', t0, dur: lp.first ? .6 : 0, instant: !lp.first, xf: u => { const d = drop(u, lp.first ? 1.6 : .2); return `translate(${cx} ${iy + d.y}) scale(${d.s}) translate(${-cx} ${-iy})`; }, opacity: op, hideAt, quiet: true });
    });
    S.sfx('drop', lp.t + 1.8, .7);
  });
  S.draw(C0.carrow([[480, 540], [480, 580], [480, 600]], { c: k, w: 5 }), 6.0, .5);
  S.draw(brain(new Ctx(480, 730, 1), 118, C.b), 6.4, 2.0);
  const knobs = [270, 375, 480, 585, 690];
  knobs.forEach((x, i) => {
    S.draw([C0.circ(x, 915, 74, { w: 5 })], 8.6 + i * .3, .5, { quiet: true });
    const kg = S.custom(9.1 + i * .3, null, (u, gg) => {
      const a = (-120 + i * 40 + Math.sin(u * 1.4 + i) * 60 + u * 25) * Math.PI / 180;
      gg.innerHTML = '';
      el('line', { x1: x, y1: 915, x2: x + Math.cos(a) * 30, y2: 915 + Math.sin(a) * 30, stroke: r, 'stroke-width': 7, 'stroke-linecap': 'round' }, gg);
      el('circle', { cx: x, cy: 915, r: 6, fill: k }, gg);
    });
  });
  S.sfx('click', 9.0, .6);
  S.text('Веса / параметры', 480, 1030, { size: 56, c: k, anchor: 'middle', t0: 10.4, dur: 1.0 });
  // правая половина
  S.text('ЭТАП 2: НАСТРОЙКА ЛЮДЬМИ (RLHF)', 1440, 84, { size: 52, c: o, anchor: 'middle', t0: 12.4, dur: 1.9 });
  const tc = new Ctx(1250, 990, 1.3);
  const P = person(tc, { armL: [[0, -160], [-60, -215], [-92, -280]], armR: [[0, -160], [60, -215], [92, -280]] });
  S.draw([P.body, P.head], 14.4, 2.0);
  S.draw([P.armL, P.armR], 16.4, .8);
  const rb = new Ctx(1690, 855, .85);
  const R = robot(rb, { col: g });
  S.draw([R.legs, R.body, R.armL, R.armR], 17.2, 1.5); S.draw([R.head, R.face], 18.5, 1.3);
  S.bubble(['Я прочитал весь', 'интернет!'], 1690, 240, 1690, 575, 20.2, { size: 46 });
  // таблички
  const sg = new Ctx(1250, 990, 1.3);
  S.draw([sg.line(-92, -280, -92, -345, { w: 5 }), sg.rect(-145, -440, 105, 95, { c: g, f: g, fs: 'solid', w: 5 }), sg.line(-92, -420, -92, -362, { c: C.w, w: 9 }), sg.line(-121, -391, -63, -391, { c: C.w, w: 9 })], 22.4, 1.2);
  S.sfx('ding', 23.4, .8);
  S.draw([sg.line(92, -280, 92, -345, { w: 5 }), sg.rect(40, -440, 105, 95, { c: r, f: r, fs: 'solid', w: 5 }), sg.line(63, -391, 121, -391, { c: C.w, w: 9 })], 23.6, 1.2);
  S.sfx('buzzer', 24.6, .4);
  S.bubble(['Вот именно поэтому без', 'воспитания тебя к людям', 'выпускать нельзя.'], 1250, 262, 1250, 560, 25.4, { size: 44, tail: 120 });
  S.sfx('sponge', 33, 1);
});

// =====================================================================
// СЦЕНА 6. ГАЛЛЮЦИНАЦИИ
// =====================================================================
defineScene('s6', 30, 2, S => {
  const c = new Ctx(1560, 495, .8);
  const R = robot(c, { glasses: 'round', col: b, brow: true, armL: [[-90, -30], [-170, -45], [-255, -70]] });
  S.draw([R.legs, R.body, R.armL, R.armR], .3, 1.5); S.draw([R.head, R.face], 1.8, 1.4);
  S.draw([c.line(-255, -70, -470, -190, { c: o, w: 7 })], 3.2, .5);
  // мини-доска
  S.draw([C0.rect(160, 120, 1050, 390, { w: 6 }), C0.line(480, 510, 440, 580), C0.line(880, 510, 920, 580)], 3.0, 2.0);
  S.text('Наполеон любил TikTok —', 685, 245, { size: 78, anchor: 'middle', t0: 5.2, dur: 1.6 });
  S.text('100% факт!', 685, 330, { size: 84, anchor: 'middle', t0: 6.9, dur: 1.0, c: b });
  const stp = new Ctx(0, 0, 1);
  const sw = textW('ГАЛЛЮЦИНАЦИЯ!', 86) + 60;
  const stampG = S.group(); stampG.setAttribute('transform', 'rotate(-6 685 432)');
  S.draw([stp.rect(685 - sw / 2, 385, sw, 100, { c: r, w: 8 })], 10.0, .01, { parent: stampG, instant: true, quiet: true, opacity: u => 1 });
  S.text('ГАЛЛЮЦИНАЦИЯ!', 685, 462, { size: 86, c: r, anchor: 'middle', t0: 10.0, instant: true, parent: stampG, xf: u => { const s = 1 + 1.4 * (1 - spring(u / .35)); return `translate(685 432) scale(${s}) translate(-685 -432)`; } });
  S.sfx('stamp', 10.1, 1);
  S.bubble(['Звучит правдоподобно?', 'Значит, пойдёт!'], 1560, 120, 1560, 245, 11.6, { size: 44 });
  // рамка с чек-листом
  S.draw([C0.rrect(160, 665, 1600, 385, 22, { w: 6, c: b })], 14.8, 1.8);
  S.text('ЧТО ПОМНИТЬ ПРО ИИ', 960, 748, { size: 70, c: b, anchor: 'middle', t0: 16.7, dur: 1.4 });
  const L = [
    { y: 850, t: 18.4, s: 'Отлично пишет тексты и код', ok: true }, { y: 935, t: 20.8, s: 'Понятно объясняет сложное', ok: true },
    { y: 1018, t: 23.2, s: 'Может уверенно соврать — проверяй факты', ok: false }];
  L.forEach(l => {
    if (l.ok) S.draw([C0.lin([[215, l.y - 22], [245, l.y + 4], [300, l.y - 52]], { c: g, w: 10 })], l.t, .5);
    else S.draw([C0.line(255, l.y - 58, 255, l.y - 14, { c: r, w: 10 }), C0.circ(255, l.y + 8, 10, { c: r, f: r, fs: 'solid', w: 4 })], l.t, .5);
    S.text(l.s, 330, l.y, { size: 60, c: l.ok ? k : r, t0: l.t + .5, dur: 1.5 });
    S.sfx(l.ok ? 'ding' : 'buzzer', l.t + .4, l.ok ? .7 : .4);
  });
  S.sfx('sponge', 28, 1);
});

// =====================================================================
// СЦЕНА 7. ФИНАЛ
// =====================================================================
defineScene('s7', 15, 3, S => {
  // человек за ноутбуком
  const pc = new Ctx(520, 700, 1.15);
  const P = person(pc, { armL: [[0, -150], [-45, -100], [-20, -50]], armR: [[0, -150], [45, -100], [20, -50]] });
  S.draw([P.body, P.head, P.armL, P.armR], .2, 2.2);
  const lp = new Ctx(520, 700, 1.15);
  S.draw([lp.poly([[-150, 0], [150, 0], [200, 50], [-200, 50]], { f: '#FAFAFA', fs: 'solid', w: 5 }), lp.rect(-130, -105, 260, 105, { f: '#FAFAFA', fs: 'solid', w: 5 }), lp.circ(0, -52, 30, { c: g, f: g, fs: 'solid', w: 3 })], 2.0, 1.4);
  S.draw([C0.line(180, 790, 880, 790, { w: 5 })], 3.2, .6);
  // робот в тёмных очках с лампочкой
  const c = new Ctx(1390, 720, 1.0);
  const R = robot(c, { glasses: 'sun', col: g, armL: [[-90, -30], [-170, -60], [-250, -110]] });
  S.draw([R.legs, R.body, R.armL, R.armR], 3.2, 1.5); S.draw([R.head, R.face], 4.6, 1.3);
  const bx = 1140, by = 560;
  S.draw([C0.circ(bx, by - 50, 96, { c: o, f: C.y, fs: 'solid', w: 6 }), C0.rect(bx - 28, by, 56, 44, { w: 5 }), C0.line(bx - 22, by + 20, bx + 22, by + 20, { w: 4 }), C0.curve([[bx - 22, by - 62], [bx - 8, by - 38], [bx, by - 62], [bx + 8, by - 38], [bx + 22, by - 62]], { c: o, w: 4 })], 5.8, 1.2);
  S.sfx('bulb', 6.9, .9);
  const rays = [];
  for (let i = 0; i < 9; i++) { const a = (-170 + i * 20) * Math.PI / 180; rays.push(C0.line(bx + Math.cos(a) * 68, by - 50 + Math.sin(a) * 68, bx + Math.cos(a) * 118, by - 50 + Math.sin(a) * 118, { c: o, w: 7 })); }
  S.draw(rays, 7.0, .7, { xf: u => { const s = 1 + .1 * Math.sin(u * 12); return `translate(${bx} ${by - 50}) scale(${s}) translate(${-bx} ${-(by - 50)})`; } });
  S.sfx('sparkle', 7.0, .6);
  S.bubble(['Обращайтесь! Кстати,', 'я уже угадал твоё', 'следующее слово.'], 1560, 205, 1440, 420, 7.6, { size: 44 });
  S.text('Подпишись, чтобы не пропустить новые разборы!', 960, 1040, { size: 64, c: g, anchor: 'middle', t0: 10.2, dur: 1.6 });
  S.sfx('sponge', 12, 1);
});
};
