// Движок whiteboard-анимации: кадр = чистая функция от времени T (секунды).
(() => {
const W = 1920, H = 1080, NS = 'http://www.w3.org/2000/svg';
const C = { k: '#1A1A1A', b: '#0077CC', r: '#E63946', o: '#F77F00', g: '#2A9D8F', y: '#FFC93C', w: '#FFFFFF' };
const FONT = 'Caveat';
const gen = rough.generator();
let SEED = 11, CLIPID = 0;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const spring = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(11 * x);

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const cv = document.createElement('canvas').getContext('2d');
function textW(str, size, weight = 700) { cv.font = `${weight} ${size}px ${FONT}`; return cv.measureText(str).width; }

// ---------- контекст рисования (сдвиг + масштаб) ----------
class Ctx {
  constructor(ox = 0, oy = 0, s = 1) { this.ox = ox; this.oy = oy; this.s = s; }
  X(x) { return this.ox + x * this.s; } Y(y) { return this.oy + y * this.s; }
  P(pts) { return pts.map(([x, y]) => [this.X(x), this.Y(y)]); }
  opt(o) {
    const op = { stroke: o.c || C.k, strokeWidth: (o.w || 4) * clamp(this.s, .8, 1.2), roughness: o.r ?? 1.2, bowing: 1, seed: SEED++ };
    if (o.f) { op.fill = o.f; op.fillStyle = o.fs || 'hachure'; op.hachureGap = (o.gap || 10) * Math.max(.7, this.s); op.fillWeight = o.fw || 2.5; op.hachureAngle = o.ang ?? -41; }
    return op;
  }
  mk(dr, o) { return { dr, dash: o.dash }; }
  line(x1, y1, x2, y2, o = {}) { return this.mk(gen.line(this.X(x1), this.Y(y1), this.X(x2), this.Y(y2), this.opt(o)), o); }
  rect(x, y, w, h, o = {}) { return this.mk(gen.rectangle(this.X(x), this.Y(y), w * this.s, h * this.s, this.opt(o)), o); }
  ell(cx, cy, w, h, o = {}) { return this.mk(gen.ellipse(this.X(cx), this.Y(cy), w * this.s, h * this.s, this.opt(o)), o); }
  circ(cx, cy, d, o = {}) { return this.ell(cx, cy, d, d, o); }
  poly(pts, o = {}) { return this.mk(gen.polygon(this.P(pts), this.opt(o)), o); }
  lin(pts, o = {}) { return this.mk(gen.linearPath(this.P(pts), this.opt(o)), o); }
  curve(pts, o = {}) { return this.mk(gen.curve(this.P(pts), this.opt(o)), o); }
  closed(pts, o = {}) { return this.curve([...pts, pts[0], pts[1], pts[2]], o); }
  rrect(x, y, w, h, r, o = {}) {
    const X = this.X(x), Y = this.Y(y), Wd = w * this.s, Hd = h * this.s, R = r * this.s;
    const d = `M${X + R} ${Y} L${X + Wd - R} ${Y} Q${X + Wd} ${Y} ${X + Wd} ${Y + R} L${X + Wd} ${Y + Hd - R} Q${X + Wd} ${Y + Hd} ${X + Wd - R} ${Y + Hd} L${X + R} ${Y + Hd} Q${X} ${Y + Hd} ${X} ${Y + Hd - R} L${X} ${Y + R} Q${X} ${Y} ${X + R} ${Y} Z`;
    return this.mk(gen.path(d, this.opt(o)), o);
  }
  arrow(x1, y1, x2, y2, o = {}, hs = 22) {
    const a = Math.atan2(y2 - y1, x2 - x1), p = Math.PI / 7;
    return [this.line(x1, y1, x2, y2, o),
      this.line(x2, y2, x2 - hs * Math.cos(a - p), y2 - hs * Math.sin(a - p), o),
      this.line(x2, y2, x2 - hs * Math.cos(a + p), y2 - hs * Math.sin(a + p), o)];
  }
  // кривая со стрелкой на конце
  carrow(pts, o = {}, hs = 22) {
    const n = pts.length, [x2, y2] = pts[n - 1], [x1, y1] = pts[n - 2];
    const a = Math.atan2(y2 - y1, x2 - x1), p = Math.PI / 7;
    return [this.curve(pts, o),
      this.line(x2, y2, x2 - hs * Math.cos(a - p), y2 - hs * Math.sin(a - p), o),
      this.line(x2, y2, x2 - hs * Math.cos(a + p), y2 - hs * Math.sin(a + p), o)];
  }
}

// ---------- Сцена ----------
class Scene {
  constructor(name, dur, sponge, k = 1) { this.name = name; this.dur = dur; this.sp = sponge; this.k = k; this.real = (dur - sponge) * k + sponge; this.g = el('g', {}, root); this.items = []; this.events = []; }
  sfx(name, t, vol = 1, dur) { this.events.push({ name, t, vol, dur }); }
  add(it) { this.items.push(it); return it; }
  group(parent) { return el('g', {}, parent || this.g); }

  // рисование набора фигур маркером
  draw(pieces, t0, dur, o = {}) {
    const parent = o.parent || this.g;
    const g = el('g', {}, parent); g.style.display = 'none';
    const ps = [];
    for (const pc of pieces.flat(Infinity)) {
      const paths = gen.toPaths(pc.dr), sets = pc.dr.sets;
      const P = { outs: [], fills: [], len: 0, dash: pc.dash };
      paths.forEach((pi, i) => {
        const e = el('path', { d: pi.d, fill: pi.fill || 'none', stroke: pi.stroke, 'stroke-width': pi.strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        if (sets[i].type === 'path') { e.style.visibility = 'hidden'; P.outs.push(e); P.len += e.getTotalLength(); }
        else { e.style.opacity = 0; P.fills.push(e); }
      });
      ps.push(P);
    }
    const tot = ps.reduce((a, P) => a + Math.max(P.len, 60), 0);
    let acc = 0;
    for (const P of ps) { const w = Math.max(P.len, 60) / tot; P.s = acc * dur; P.d = w * dur; acc += w; P.L = P.outs.map(e => e.getTotalLength()); }
    const it = {
      t0, t1: t0 + dur,
      update(t) {
        const u = t - t0;
        const hide = u < 0 || (o.hideAt != null && t >= o.hideAt);
        g.style.display = hide ? 'none' : '';
        if (hide) return;
        if (o.xf) g.setAttribute('transform', o.xf(u));
        if (o.opacity) g.style.opacity = o.opacity(u);
        for (const P of ps) {
          const p = o.instant ? 1 : clamp((u - P.s) / P.d);
          P.outs.forEach((e, i) => {
            if (p <= 0) { e.style.visibility = 'hidden'; return; }
            e.style.visibility = 'visible'; const L = P.L[i];
            if (p >= 1) { e.style.strokeDasharray = P.dash ? '16 14' : 'none'; e.style.strokeDashoffset = 0; }
            else { e.style.strokeDasharray = `${L} ${L + 4}`; e.style.strokeDashoffset = L * (1 - p); }
          });
          const fo = o.instant ? 1 : clamp((p - .45) / .55);
          for (const f of P.fills) f.style.opacity = fo;
        }
      },
      tip(t) {
        const u = t - t0; if (u < 0 || u > dur || o.instant || o.notip) return null;
        for (const P of ps) {
          const p = (u - P.s) / P.d;
          if (p > 0 && p < 1 && P.outs.length) {
            const e = P.outs[0], pt = e.getPointAtLength(p * P.L[0]);
            return { x: pt.x, y: pt.y, c: e.getAttribute('stroke') };
          }
        }
        return null;
      },
    };
    if (!o.instant && !o.quiet && dur >= .3) this.sfx('scribble', t0, .55, dur);
    return this.add(it);
  }

  // рукописный текст (проявляется слева направо вслед за маркером)
  text(str, x, y, o = {}) {
    const size = o.size || 60, weight = o.weight || 700, anchor = o.anchor || 'start', c = o.c || C.k;
    const w = textW(str, size, weight);
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const dur = o.dur ?? Math.max(.5, str.length * .055), t0 = o.t0 ?? 0;
    const g = el('g', {}, o.parent || this.g); g.style.display = 'none';
    const id = 'clip' + (CLIPID++);
    const cp = el('clipPath', { id }, defs);
    const pad = Math.max(14, size * .22);
    const cr = el('rect', { x: x0 - pad, y: y - size * 1.15, width: 0, height: size * 1.7 }, cp);
    const te = el('text', { x: x0, y, 'font-size': size, 'font-weight': weight, 'font-family': FONT, fill: c, 'clip-path': `url(#${id})` }, g);
    te.textContent = str;
    const rot = o.rot ? `rotate(${o.rot} ${x} ${y})` : '';
    const it = {
      t0, t1: t0 + dur, w, x0, el: te, g,
      update(t) {
        const u = t - t0;
        const hide = u < 0 || (o.hideAt != null && t >= o.hideAt);
        g.style.display = hide ? 'none' : ''; if (hide) return;
        const p = o.instant ? 1 : clamp(u / dur);
        cr.setAttribute('width', p * (w + 2 * pad));
        const xf = (o.xf ? o.xf(u) : '') + ' ' + rot; g.setAttribute('transform', xf);
        if (o.opacity) g.style.opacity = o.opacity(u);
        if (o.fill) te.setAttribute('fill', o.fill(u));
      },
      tip(t) {
        const u = t - t0; if (u < 0 || u > dur || o.instant || o.notip) return null;
        const p = u / dur; return { x: x0 + p * w, y: y - size * .28, c };
      },
    };
    if (!o.instant && !o.quiet && dur >= .5) this.sfx('scribble', t0, .35, dur);
    return this.add(it);
  }

  // комиксное облачко: pop-in + текст
  bubble(lines, cx, cy, tx, ty, t0, o = {}) {
    const size = o.size || 44, c = o.c || C.k, padX = 40, padY = 30, lh = size * 1.1;
    const tw = Math.max(...lines.map(l => textW(l, size)));
    const w = tw + padX * 2, h = lines.length * lh + padY * 2;
    const x = cx - w / 2, y = cy - h / 2;
    let pts, tip;
    const k = 26;
    const tipFrom = (bx, by) => { const dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1, m = Math.min(1, (o.tail || 150) / d); return [bx + dx * m, by + dy * m]; };
    if (ty > y + h) { const bx = clamp(tx, x + 70, x + w - 70); tip = tipFrom(bx, y + h); pts = [[x, y], [x + w, y], [x + w, y + h], [bx + k, y + h], tip, [bx - k, y + h], [x, y + h]]; }
    else if (ty < y) { const bx = clamp(tx, x + 70, x + w - 70); tip = tipFrom(bx, y); pts = [[x, y], [bx - k, y], tip, [bx + k, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
    else if (tx < x) { const by = clamp(ty, y + 50, y + h - 50); tip = tipFrom(x, by); pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, by + k], tip, [x, by - k]]; }
    else { const by = clamp(ty, y + 50, y + h - 50); tip = tipFrom(x + w, by); pts = [[x, y], [x + w, y], [x + w, by - k], tip, [x + w, by + k], [x + w, y + h], [x, y + h]]; }
    const pg = el('g', {}, this.g); pg.style.display = 'none';
    const c0 = new Ctx();
    this.draw([c0.poly(pts, { c, f: C.w, fs: 'solid', w: 4.5, r: 1.1 })], t0, .01, { parent: pg, instant: true });
    const tw0 = t0 + .45; let tt = tw0;
    lines.forEach((l, i) => {
      const d = Math.max(.5, l.length * .045);
      this.text(l, cx, y + padY + i * lh + size * .8, { size, c: o.tc || C.k, anchor: 'middle', t0: tt, dur: d, parent: pg });
      tt += d;
    });
    this.sfx('pop', t0, .9);
    const pt = { x: tip[0], y: tip[1] };
    this.add({
      t0, t1: tt, bubbleEnd: tt,
      update(t) {
        const u = (t - t0) / .5;
        pg.style.display = u < 0 ? 'none' : '';
        const s = .02 + .98 * spring(u);
        pg.setAttribute('transform', `translate(${pt.x} ${pt.y}) scale(${s}) translate(${-pt.x} ${-pt.y})`);
      },
    });
    return { w, h, x, y, end: tt };
  }

  // произвольная покадровая анимация
  custom(t0, t1, fn, o = {}) {
    const g = el('g', {}, o.parent || this.g); g.style.display = 'none';
    const it = { t0, t1, g, update(t) { const vis = t >= t0 && (t1 == null || t < t1); g.style.display = vis ? '' : 'none'; if (vis) fn(t - t0, g); } };
    if (o.tip) it.tip = o.tip;
    return { it: this.add(it), g };
  }
}

// ---------- глобальное ----------
const svg = document.getElementById('board');
const defs = el('defs', {}, svg);
el('rect', { width: W, height: H, fill: '#FAFAFA' }, svg);
const vg = el('radialGradient', { id: 'vig', cx: '50%', cy: '50%', r: '75%' }, defs);
el('stop', { offset: '60%', 'stop-color': '#FAFAFA', 'stop-opacity': 0 }, vg);
el('stop', { offset: '100%', 'stop-color': '#CFCFD4', 'stop-opacity': .55 }, vg);
el('rect', { width: W, height: H, fill: 'url(#vig)' }, svg);
const root = el('g', {}, svg);
const clip = el('clipPath', { id: 'spclip' }, defs);
const clipPoly = el('polygon', { points: '' }, clip);
const spongeG = el('g', {}, svg); spongeG.style.display = 'none';
const markerG = el('g', {}, svg); markerG.style.display = 'none';

// маркер-наконечник
const mk = el('g', {}, markerG);
const mkRot = el('g', { transform: 'rotate(38)' }, mk);
el('polygon', { points: '0,0 -8,-26 8,-26', fill: '#1A1A1A' }, mkRot);
const mkNib = el('polygon', { points: '0,-2 -6,-22 6,-22', fill: C.k }, mkRot);
el('rect', { x: -12, y: -110, width: 24, height: 86, rx: 7, fill: '#F4F4F6', stroke: '#1A1A1A', 'stroke-width': 3 }, mkRot);
const mkBand = el('rect', { x: -12, y: -78, width: 24, height: 26, fill: C.k, stroke: '#1A1A1A', 'stroke-width': 3 }, mkRot);

// губка (стирает доску): широкая красная губка с волнистым краем
const wave = (y, ph) => 16 * Math.sin(y / 70 + ph) + 8 * Math.sin(y / 23 + ph * 2);
const SPW = 250;
const spBody = el('path', { fill: '#E63946', stroke: '#9C1F2B', 'stroke-width': 6, 'stroke-linejoin': 'round' }, spongeG);
const spPores = el('g', {}, spongeG);
let prng = 7; const rnd = () => (prng = (prng * 16807) % 2147483647) / 2147483647;
const pores = [];
for (let i = 0; i < 70; i++) {
  const px = rnd() * (SPW - 50) + 25, py = rnd() * (H + 60) - 30, rx = 6 + rnd() * 14;
  pores.push([px, py, rx, rx * (.6 + rnd() * .5), rnd() > .5]);
}
for (const [px, py, rx, ry, dk] of pores) el('ellipse', { cx: -SPW + px, cy: py, rx, ry, fill: dk ? '#B52A36' : '#F4727D', opacity: .85 }, spPores);
const scenes = [];
function defineScene(name, dur, sponge, build) { const s = new Scene(name, dur, sponge, (window.SCENE_K || [])[scenes.length] || 1); s.g.style.display = ''; build(s); s.g.style.display = 'none'; scenes.push(s); }

let starts = [];
function layout() { let a = 0; for (const s of scenes) { s.start = a; a += s.real; } }

function renderFrame(T) {
  let idx = scenes.findIndex(s => T >= s.start && T < s.start + s.real); if (idx < 0) idx = scenes.length - 1;
  scenes.forEach((s, i) => s.g.style.display = i === idx ? '' : 'none');
  const S = scenes[idx], tr = T - S.start;
  const sp0r = (S.dur - S.sp) * S.k, sp0 = S.dur - S.sp;
  const t = tr < sp0r ? tr / S.k : sp0 + (tr - sp0r);
  for (const it of S.items) it.update(t);
  // губка
  if (tr >= sp0r) {
    const p = easeInOut(clamp((tr - sp0r) / S.sp)), R = -30 + p * (W + SPW + 80);
    const ph = 0;
    let d = `M${R + wave(-40, ph)} -40`; const pts = [];
    for (let y = -40; y <= H + 40; y += 24) pts.push([R + wave(y, ph), y]);
    pts.forEach(([x, y]) => d += ` L${x} ${y}`);
    for (let y = H + 40; y >= -40; y -= 60) d += ` L${R - SPW + wave(y, ph + 2) * .5} ${y}`;
    d += ' Z';
    spBody.setAttribute('d', d);
    spPores.setAttribute('transform', `translate(${R} 0)`);
    spongeG.style.display = '';
    clipPoly.setAttribute('points', pts.map(p => p.join(',')).join(' ') + ` ${W + 200},${H + 40} ${W + 200},-40`);
    S.g.setAttribute('clip-path', 'url(#spclip)');
    if (R > W + 20) S.g.style.display = 'none';
  } else { spongeG.style.display = 'none'; S.g.removeAttribute('clip-path'); }
  // кончик маркера
  let best = null;
  for (const it of S.items) if (it.tip && t >= it.t0) { const tp = it.tip(t); if (tp && (!best || it.t0 >= best.t0)) best = { ...tp, t0: it.t0 }; }
  if (best && t < sp0) { markerG.style.display = ''; mk.setAttribute('transform', `translate(${best.x} ${best.y})`); mkBand.setAttribute('fill', best.c); mkNib.setAttribute('fill', best.c); }
  else markerG.style.display = 'none';
}

window.engine = { defs, C, Ctx, W, H, clamp, lerp, easeInOut, easeOut, spring, textW, el, defineScene, scenes };
window.renderFrame = renderFrame;
window.getTimeline = () => ({ total: scenes.reduce((a, s) => a + s.real, 0), scenes: scenes.map(s => ({ name: s.name, start: s.start, dur: s.real, sponge: s.sp, k: s.k, events: s.events.filter(e => e.name !== 'sponge').map(e => ({ ...e, t: e.t * s.k, dur: e.dur != null ? e.dur * s.k : e.dur })) })) });
window.boot = async () => {
  await Promise.all([document.fonts.load('700 60px Caveat', 'Аб Привет'), document.fonts.load('700 60px Caveat', 'Ab 12%'), document.fonts.load('400 60px Caveat', 'Аб Ab')]);
  window.buildScenes(); layout(); window.READY = true;
};
})();
