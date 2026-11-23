/* Движок whiteboard-анимации: Rough.js + SVG, детерминированный renderFrame(t). */
(function () {
  const W = 1920, H = 1080, NS = 'http://www.w3.org/2000/svg';
  const C = { ink: '#1A1A1A', blue: '#0077CC', red: '#E63946', orange: '#F77F00', green: '#2A9D8F',
    pink: '#E5879B', yellow: '#F4C430', white: '#FFFFFF', gray: '#8A8F98', brown: '#8B5A2B', skin: '#FBE3CC',
    ltblue: '#8FC8F0', ltgreen: '#9BD8C8', ltred: '#F4A6AD' };
  const gen = rough.generator();
  let seed = 11;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const spring = x => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(x * 11));
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- фабрика rough-фигур: массив спецификаций путей ---------- */
  function opt(o = {}) {
    return { stroke: o.c || C.ink, strokeWidth: o.w || 4, roughness: o.r ?? 1.2, bowing: o.b ?? 1,
      seed: seed++, fill: o.fill, fillStyle: o.fs || 'hachure', hachureGap: o.gap || 5,
      fillWeight: o.fw || 3, hachureAngle: o.ang ?? -50, curveStepCount: 9, simplification: o.simp ?? 0 };
  }
  function specs(dr, op, o) {
    const solids = [], strokes = [], fills = [];
    const ps = gen.toPaths(dr), lastIdx = ps.length - 1;
    ps.forEach((p, i) => {
      if (p.fill && p.fill !== 'none') solids.push({ d: p.d, kind: 'solid', color: p.fill });
      else if (i === lastIdx && op.stroke !== 'none') strokes.push({ d: p.d, kind: 'stroke', color: op.stroke, w: op.strokeWidth });
      else fills.push({ d: p.d, kind: 'fillsketch', color: p.stroke, w: p.strokeWidth || 3 });
    });
    return solids.concat(strokes, fills);
  }
  const S = (...a) => [].concat(...a);
  const R = {
    line: (x1, y1, x2, y2, o) => { const op = opt(o); return specs(gen.line(x1, y1, x2, y2, op), op, o); },
    rect: (x, y, w, h, o) => { const op = opt(o); return specs(gen.rectangle(x, y, w, h, op), op, o); },
    ell: (cx, cy, w, h, o) => { const op = opt(o); return specs(gen.ellipse(cx, cy, w, h, op), op, o); },
    circ: (cx, cy, d, o) => { const op = opt(o); return specs(gen.circle(cx, cy, d, op), op, o); },
    poly: (pts, o) => { const op = opt(o); return specs(gen.polygon(pts, op), op, o); },
    curve: (pts, o) => { const op = opt(o); return specs(gen.curve(pts, op), op, o); },
    lin: (pts, o) => { const op = opt(o); return specs(gen.linearPath(pts, op), op, o); },
    path: (d, o) => { const op = opt(o); return specs(gen.path(d, op), op, o); },
    arc: (cx, cy, w, h, a0, a1, closed, o) => { const op = opt(o); return specs(gen.arc(cx, cy, w, h, a0, a1, closed, op), op, o); },
  };

  /* ---------- элементы сцены ---------- */
  class DrawEl {
    constructor(sc, shape, t0, dur, tf) {
      this.t0 = t0; this.dur = dur; this.paths = [];
      this.g = el('g', tf ? { transform: tf } : {}, sc.g);
      let total = 0;
      for (const sp of shape) {
        const p = el('path', { d: sp.d }, this.g);
        if (sp.kind === 'solid') { p.setAttribute('fill', sp.color); p.setAttribute('stroke', 'none'); }
        else {
          p.setAttribute('fill', 'none'); p.setAttribute('stroke', sp.color);
          p.setAttribute('stroke-width', sp.w); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
        }
        const len = sp.kind === 'solid' ? 0 : p.getTotalLength();
        const w = sp.kind === 'solid' ? 0 : sp.kind === 'fillsketch' ? len * 0.28 : len;
        total += w;
        this.paths.push({ p, sp, len, w, a: 0, b: 0, last: -1 });
      }
      let c = 0;
      for (const q of this.paths) {
        if (q.sp.kind === 'solid') { q.a = 0; q.b = 0; continue; }
        const f = total ? q.w / total : 0;
        q.a = c * dur; q.b = (c + f) * dur; c += f;
      }
      this.end = t0 + dur;
    }
    update(t) {
      const lt = t - this.t0;
      if (lt < 0) { if (!this.hidden) { this.g.style.display = 'none'; this.hidden = true; } return null; }
      if (this.hidden) { this.g.style.display = ''; this.hidden = false; }
      let tip = null;
      for (const q of this.paths) {
        if (q.sp.kind === 'solid') continue;
        const pr = clamp((lt - q.a) / Math.max(1e-6, q.b - q.a));
        if (pr !== q.last) {
          q.last = pr;
          if (pr <= 0) q.p.style.visibility = 'hidden';
          else {
            q.p.style.visibility = 'visible';
            if (pr >= 1) q.p.removeAttribute('stroke-dasharray');
            else { q.p.setAttribute('stroke-dasharray', q.len); q.p.setAttribute('stroke-dashoffset', q.len * (1 - pr)); }
          }
        }
        if (pr > 0 && pr < 1) {
          const pt = q.p.getPointAtLength(pr * q.len);
          const m = q.p.getCTM();
          const r = new DOMPoint(pt.x, pt.y).matrixTransform(m);
          tip = { x: r.x, y: r.y, color: q.sp.color === C.white ? C.ink : q.sp.color };
        }
      }
      return tip;
    }
  }

  let clipId = 0;
  class TextEl {
    constructor(sc, str, x, y, size, color, t0, dur, o = {}) {
      this.t0 = t0; this.dur = dur; this.size = size; this.y = y;
      this.g = el('g', o.rot ? { transform: `rotate(${o.rot} ${x} ${y})` } : {}, sc.g);
      const id = 'tc' + (clipId++);
      const cp = el('clipPath', { id }, this.g);
      this.rect = el('rect', { x: 0, y: y - size * 1.05, width: 0, height: size * 1.5 }, cp);
      const gg = el('g', { 'clip-path': `url(#${id})` }, this.g);
      this.text = el('text', { x, y, 'font-size': size, fill: color, stroke: color, 'stroke-width': size * 0.022,
        'font-family': 'Neucha, Caveat, sans-serif', 'text-anchor': o.anchor || 'start', 'stroke-linejoin': 'round' }, gg);
      this.text.textContent = str;
      this.width = this.text.getComputedTextLength();
      this.x0 = o.anchor === 'middle' ? x - this.width / 2 : o.anchor === 'end' ? x - this.width : x;
      this.color = color; this.rotate = o.rot || 0; this.cx = x;
      this.end = t0 + dur;
    }
    update(t) {
      const lt = t - this.t0;
      if (lt < 0) { this.g.style.display = 'none'; return null; }
      this.g.style.display = '';
      const pr = clamp(lt / this.dur);
      this.rect.setAttribute('x', this.x0 - 8);
      this.rect.setAttribute('width', (this.width + 16) * pr);
      if (pr > 0 && pr < 1) {
        let x = this.x0 + this.width * pr, y = this.y - this.size * 0.28;
        if (this.rotate) { const a = this.rotate * Math.PI / 180, dx = x - this.cx, dy = y - this.y;
          x = this.cx + dx * Math.cos(a) - dy * Math.sin(a); y = this.y + dx * Math.sin(a) + dy * Math.cos(a); }
        return { x, y, color: this.color };
      }
      return null;
    }
  }

  const measureHost = el('svg', { width: 10, height: 10, style: 'position:absolute;left:-9999px' }, document.body);
  function measure(str, size) {
    const t = el('text', { 'font-size': size, 'font-family': 'Neucha, Caveat, sans-serif' }, measureHost);
    t.textContent = str; const w = t.getComputedTextLength(); measureHost.removeChild(t); return w;
  }
  function wrap(str, size, maxW) {
    const lines = []; let cur = '';
    for (const w of str.split(' ')) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && measure(test, size) > maxW) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  class BubbleEl {
    constructor(sc, text, t0, cx, cy, tx, ty, o = {}) {
      this.t0 = t0; this.end = t0;
      const fs = o.fs || 42, color = o.color || C.ink, lh = fs * 1.14;
      const lines = o.lines || wrap(text, fs, o.maxW || 440);
      const tw = Math.max(...lines.map(l => measure(l, fs)));
      let rx = tw / 2 * 1.2 + 34, ry = (lines.length * lh) / 2 * 1.28 + 30;
      cx = clamp(cx, rx + 24, W - rx - 24); cy = clamp(cy, ry + 24, H - ry - 24);
      this.ox = tx; this.oy = ty;
      this.g = el('g', {}, sc.g);
      const body = el('g', {}, this.g); this.body = body;
      const eo = { c: color, w: 4, fill: C.white, fs: 'solid', r: 1.0 };
      const add = shape => { for (const sp of shape) { const p = el('path', { d: sp.d }, body);
        if (sp.kind === 'solid') { p.setAttribute('fill', sp.color); p.setAttribute('stroke', 'none'); }
        else { p.setAttribute('fill', 'none'); p.setAttribute('stroke', sp.color); p.setAttribute('stroke-width', sp.w); p.setAttribute('stroke-linecap', 'round'); } } };
      const thought = !!o.thought;
      add(thought ? R.ell(cx, cy, rx * 2, ry * 2, eo) : R.ell(cx, cy, rx * 2, ry * 2, eo));
      const ang = Math.atan2((ty - cy) / ry, (tx - cx) / rx);
      if (!thought) {
        const a1 = ang - 0.2, a2 = ang + 0.2;
        const p1 = [cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)], p2 = [cx + rx * Math.cos(a2), cy + ry * Math.sin(a2)];
        const i1 = [cx + (rx - 7) * Math.cos(a1), cy + (ry - 7) * Math.sin(a1)], i2 = [cx + (rx - 7) * Math.cos(a2), cy + (ry - 7) * Math.sin(a2)];
        el('path', { d: `M${i1[0]},${i1[1]} L${p1[0]},${p1[1]} L${tx},${ty} L${p2[0]},${p2[1]} L${i2[0]},${i2[1]}Z`, fill: C.white, stroke: 'none' }, body);
        add(R.lin([p1, [tx, ty], p2], { c: color, w: 4, r: 0.8 }));
      } else {
        const ex = cx + rx * Math.cos(ang), ey = cy + ry * Math.sin(ang);
        for (let i = 1; i <= 3; i++) { const f = i / 3.4, r = 16 - i * 3.5;
          add(R.circ(ex + (tx - ex) * f * 0.9, ey + (ty - ey) * f * 0.9, r * 2, { c: color, w: 3.5, fill: C.white, fs: 'solid', r: 0.8 })); }
      }
      lines.forEach((l, i) => {
        const t = el('text', { x: cx, y: cy - (lines.length - 1) * lh / 2 + i * lh + fs * 0.32, 'font-size': fs, fill: color, stroke: color,
          'stroke-width': fs * 0.02, 'font-family': 'Neucha, Caveat, sans-serif', 'text-anchor': 'middle' }, body);
        t.textContent = l;
      });
      this.bounds = { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
    }
    update(t) {
      const lt = t - this.t0;
      if (lt < 0) { this.g.style.display = 'none'; return null; }
      this.g.style.display = '';
      const s = Math.max(0.001, spring(lt / 0.5));
      this.body.setAttribute('transform', `translate(${this.ox},${this.oy}) scale(${s}) translate(${-this.ox},${-this.oy})`);
      return null;
    }
  }

  class ShowEl { // фигура целиком, "вырастает" (pop) в момент t0
    constructor(sc, shape, t0, o = {}) {
      this.t0 = t0; this.end = t0; this.o = o; this.pop = o.pop ?? 0.45;
      this.g = el('g', {}, sc.g); this.inner = el('g', o.tf ? { transform: o.tf } : {}, this.g);
      for (const sp of shape) { const p = el('path', { d: sp.d }, this.inner);
        if (sp.kind === 'solid') { p.setAttribute('fill', sp.color); p.setAttribute('stroke', 'none'); }
        else { p.setAttribute('fill', 'none'); p.setAttribute('stroke', sp.color); p.setAttribute('stroke-width', sp.w); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); } }
    }
    update(t) {
      const lt = t - this.t0;
      if (lt < 0) { this.g.style.display = 'none'; return null; }
      this.g.style.display = '';
      const [ox, oy] = this.o.origin || [0, 0];
      const s = Math.max(0.001, spring(lt / this.pop));
      this.g.setAttribute('transform', `translate(${ox},${oy}) scale(${s}) translate(${-ox},${-oy})`);
      this.g.setAttribute('opacity', clamp(lt / 0.15));
      return null;
    }
  }

  class ImageEl { // картинка с пружинным появлением
    constructor(sc, href, cx, cy, size, t0) {
      this.t0 = t0; this.end = t0; this.cx = cx; this.cy = cy;
      this.g = el('g', {}, sc.g);
      this.im = el('image', { href, x: cx - size / 2, y: cy - size / 2, width: size, height: size }, this.g);
    }
    update(t) {
      const lt = t - this.t0;
      if (lt < 0) { this.g.style.display = 'none'; return null; }
      this.g.style.display = '';
      const s = Math.max(0.001, spring(lt / 0.7));
      this.g.setAttribute('transform', `translate(${this.cx},${this.cy}) scale(${s}) rotate(${(1 - s) * -25}) translate(${-this.cx},${-this.cy})`);
      return null;
    }
  }

  class AnimEl { // произвольная анимация: build(g) один раз, fn(lt, g, t) каждый кадр
    constructor(sc, t0, t1, build, fn) {
      this.t0 = t0; this.end = t1; this.fn = fn; this.g = el('g', {}, sc.g); build(this.g, sc);
    }
    update(t) {
      if (t < this.t0 || t >= this.end) { this.g.style.display = 'none'; return null; }
      this.g.style.display = ''; return this.fn ? (this.fn(t - this.t0, this.g, t) || null) : null;
    }
  }

  class Scene {
    constructor(start, end, outro) {
      this.start = start; this.end = end; this.outro = outro; this.els = [];
      this.g = el('g', {}, root); this.g.style.display = 'none';
      const id = 'sc' + scenes.length;
      this.clip = el('rect', { x: 0, y: 0, width: W, height: H }, el('clipPath', { id }, defs));
      this.g.setAttribute('clip-path', `url(#${id})`);
    }
    d(shape, at, dur, tf) { const e = new DrawEl(this, shape, at, dur, tf); this.els.push(e); return e; }
    txt(str, at, dur, x, y, size, color, o) { const e = new TextEl(this, str, x, y, size, color || C.ink, at, dur, o); this.els.push(e); return e; }
    bub(text, at, cx, cy, tx, ty, o) { const e = new BubbleEl(this, text, at, cx, cy, tx, ty, o); this.els.push(e); return e; }
    show(shape, at, o) { const e = new ShowEl(this, shape, at, o); this.els.push(e); return e; }
    img(href, at, cx, cy, size) { const e = new ImageEl(this, href, cx, cy, size, at); this.els.push(e); return e; }
    anim(at, end, build, fn) { const e = new AnimEl(this, at, end ?? 1e9, build, fn); this.els.push(e); return e; }
  }

  /* ---------- корень, губка, маркер ---------- */
  const svg = document.getElementById('board');
  const defs = el('defs', {}, svg);
  const rg = el('radialGradient', { id: 'vig', cx: '50%', cy: '50%', r: '75%' }, defs);
  el('stop', { offset: '60%', 'stop-color': '#000', 'stop-opacity': 0 }, rg);
  el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': 0.09 }, rg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#FAFAFA' }, svg);
  const root = el('g', {}, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#vig)', 'pointer-events': 'none' }, svg);

  const spongeG = el('g', {}, svg); spongeG.style.display = 'none';
  (function () {
    const sh = [];
    el('rect', { x: -150, y: -60, width: 300, height: H + 120, rx: 46, fill: C.red, stroke: '#B52B37', 'stroke-width': 6 }, spongeG);
    el('rect', { x: -150, y: -60, width: 300, height: 70, rx: 30, fill: '#F3C74B' }, spongeG);
    let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) el('ellipse', { cx: -120 + rnd() * 240, cy: 40 + rnd() * (H - 40), rx: 6 + rnd() * 12, ry: 5 + rnd() * 9, fill: '#B52B37', opacity: .55 }, spongeG);
  })();
  const pen = el('g', {}, svg); pen.style.display = 'none';
  const penRot = el('g', { transform: 'rotate(32)' }, pen);
  el('rect', { x: -11, y: -190, width: 22, height: 150, rx: 8, fill: '#fff', stroke: C.ink, 'stroke-width': 3 }, penRot);
  const penBand = el('rect', { x: -11, y: -78, width: 22, height: 30, fill: C.ink }, penRot);
  const penNib = el('path', { d: 'M-9,-40 L0,0 L9,-40Z', fill: C.ink, stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, penRot);
  const penDot = el('circle', { cx: 0, cy: -4, r: 5, fill: C.ink }, penRot);

  const scenes = [];
  window.E = { W, H, C, R, S, el, clamp, ease, spring, measure, wrap, scenes,
    scene(start, end, outro) { const s = new Scene(start, end, outro); scenes.push(s); return s; } };

  window.renderFrame = function (t) {
    let sc = scenes.find(s => t >= s.start && t < s.end) || scenes[scenes.length - 1];
    for (const s of scenes) s.g.style.display = s === sc ? '' : 'none';
    const lt = t - sc.start, D = sc.end - sc.start;
    let tip = null, best = -1;
    for (const e of sc.els) { const r = e.update(lt); if (r && e.t0 >= best) { tip = r; best = e.t0; } }
    spongeG.style.display = 'none';
    sc.clip.setAttribute('x', 0); sc.g.removeAttribute('opacity');
    if (sc.outro === 'sponge') {
      const ps = clamp((lt - (D - 1.8)) / 1.7);
      if (ps > 0) {
        const x = -200 + ease(ps) * (W + 400) + Math.sin(ps * 14) * 8;
        sc.clip.setAttribute('x', Math.min(W, Math.max(0, x))); spongeG.style.display = '';
        spongeG.setAttribute('transform', `translate(${x},${Math.sin(ps * 9) * 20}) rotate(${Math.sin(ps * 7) * 2})`); tip = null;
      }
    } else if (sc.outro === 'fade') {
      sc.g.setAttribute('opacity', clamp((D - lt) / 0.3)); tip = lt > D - 0.3 ? null : tip;
    }
    if (tip) {
      pen.style.display = '';
      pen.setAttribute('transform', `translate(${tip.x + (Math.sin(t * 40) * 0.8)},${tip.y + (Math.cos(t * 33) * 0.8)})`);
      const col = tip.color === 'none' ? C.ink : tip.color;
      penBand.setAttribute('fill', col); penNib.setAttribute('fill', col); penDot.setAttribute('fill', col);
    } else pen.style.display = 'none';
  };
})();
