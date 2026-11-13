/* rig.js — риг персонажей «Отряд Мега». Глобальный объект window.Rig. Зависит только от глобального gsap.
   Документация для авторов сцен: kit/RIG.md (этот файл читать не обязательно).

   Как устроено:
   - У персонажа есть МОДЕЛЬ ch.m — плоский объект каналов (углы суставов, позиция, лицо, слои idle/talk/look).
   - Всё движение — твины GSAP по каналам модели через два плагина: `rig` (обычный твин каналов с изингом)
     и `rigClip` (запечённая заранее дорожка: походка, падение, подъём). Оба после каждого шага вызывают
     ch.apply(), который считает прямую кинематику и пишет матрицы в SVG. Значит tl.seek(t) в любую сторону
     всегда даёт один и тот же кадр.
   - Падения — запечённая детерминированная физика: ключевые позы задают форму тела и «силу мышц»,
     а высоту таза, опору, отскоки, болтание рук/головы/ног считает симулятор (гравитация, маятники, земля). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', RAD = Math.PI / 180, PI = Math.PI;
  var OUT = '#2b1a12', SKIN = '#f2c9a0', BLUSH = '#e58a6a', OLV = '#6b7340', OLD = '#4f5a2e', BOOT = '#3a2618';
  var KSCALE = 1.1; // при scale 1 рост ≈ 600 px

  // ───────────── математика ─────────────
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function wrap(a) { a = a % 360; if (a > 180) a -= 360; if (a <= -180) a += 360; return a; }
  function smooth(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  var EZ = {
    io: function (p) { return 0.5 - 0.5 * Math.cos(PI * p); },
    'in': function (p) { return p * p; },
    out: function (p) { return 1 - (1 - p) * (1 - p); },
    in3: function (p) { return p * p * p; },
    out3: function (p) { return 1 - Math.pow(1 - p, 3); },
    back: function (p) { var q = p - 1; return 1 + 2.7 * q * q * q + 1.7 * q * q; }
  };
  // матрица [a,b,c,d,e,f]; TR(M,x,y,deg) = M·T(x,y)·R(deg)
  function TR(M, x, y, deg) {
    var e = M[0] * x + M[2] * y + M[4], f = M[1] * x + M[3] * y + M[5];
    if (!deg) return [M[0], M[1], M[2], M[3], e, f];
    var c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
    return [M[0] * c + M[2] * s, M[1] * c + M[3] * s, -M[0] * s + M[2] * c, -M[1] * s + M[3] * c, e, f];
  }
  function SC(M, sx, sy) { return [M[0] * sx, M[1] * sx, M[2] * sy, M[3] * sy, M[4], M[5]]; }
  function MUL(A, B) { return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]]; }
  function PT(M, x, y) { return [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]]; }
  function rv(x, y, deg) { var c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [x * c - y * s, x * s + y * c]; }
  // двухкостная IK: от (hx,hy) к (tx,ty), длины a,b; bend=+1 — сустав уходит в сторону большего угла (влево на экране)
  function ik2(hx, hy, tx, ty, a, b, bend) {
    var dx = tx - hx, dy = ty - hy, d = Math.sqrt(dx * dx + dy * dy), phi = Math.atan2(-dx, dy) / RAD;
    if (d >= a + b - 0.01) return [phi, phi];
    d = Math.max(d, Math.abs(a - b) + 0.5);
    var al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) / RAD;
    var t1 = phi + bend * al, kx = hx - a * Math.sin(t1 * RAD), ky = hy + a * Math.cos(t1 * RAD);
    return [t1, Math.atan2(-(tx - kx), ty - ky) / RAD];
  }

  // ───────────── плагины GSAP ─────────────
  var DISCRETE = { mouth: 1, kL: 1, kR: 1, hatFree: 1 };
  var plugged = false;
  function plug() {
    if (plugged) return; plugged = true;
    gsap.registerPlugin({
      name: 'rig', rawVars: 1,
      init: function (target, v) { this.m = target; this.e = v; this.k = Object.keys(v); this.s = {}; for (var i = 0; i < this.k.length; i++) this.s[this.k[i]] = target[this.k[i]]; },
      render: function (ratio, d) {
        var m = d.m, k = d.k, i, n;
        for (i = 0; i < k.length; i++) { n = k[i]; m[n] = DISCRETE[n] ? (ratio >= 0.5 ? d.e[n] : d.s[n]) : d.s[n] + (d.e[n] - d.s[n]) * ratio; }
        m.__ch.apply();
      }
    });
    gsap.registerPlugin({
      name: 'rigClip', rawVars: 1,
      init: function (target, v) { this.m = target; this.c = v; this.s = {}; for (var k in v.tr) if (!v.step[k]) this.s[k] = target[k] - v.tr[k][0]; },
      render: function (ratio, d) {
        var c = d.c, m = d.m, n = c.n, f = ratio * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i, k, a, v;
        var bl = 1 - smooth(ratio * c.dur / 0.2);
        for (k in c.tr) {
          a = c.tr[k];
          if (c.step[k]) v = a[ratio >= 1 ? n - 1 : Math.floor(f + 1e-6)];
          else { v = a[i] + (a[i + 1] - a[i]) * u; if (bl > 0) v += d.s[k] * bl; }
          m[k] = v;
        }
        m.__ch.apply();
      }
    });
  }
  function clock(p) { return p; } // часы запечённой дорожки: само движение в дорожке уже нелинейное

  // ───────────── размеры и внешность ─────────────
  function dims(o) {
    var D = { hr: 118, nh: 104, chestH: 118, shY: 100, shX: 72, tw: 148, pelvisH: 32, hipX: 33, thigh: 62, shin: 60, ankle: 18, arm1: 58, arm2: 54, armW: 32, legW: 40, handR: 19, hatRot: 0, hatDX: 0, hatDY: 0, hatS: 1 };
    for (var k in o) D[k] = o[k];
    D.hipY = D.thigh + D.shin + D.ankle;
    return D;
  }
  var CHARS = {
    ustav: { D: { tw: 160, shX: 78, hr: 116, thigh: 66, shin: 64, armW: 34, legW: 42 }, hat: 'cap', lids: [0.2, 0], brow: [16, 9, -4], rest: 'frown', pupil: 6.5, idle: [3.4, 6.6, 5.2], cloth: OLV },
    chaika: { D: { tw: 132, shX: 66, hr: 112, armW: 28, legW: 34 }, hat: 'pilot', lids: [0.32, 0], brow: [-6, 6, 4], rest: 'smirk', pupil: 6.5, idle: [2.9, 5.2, 4.1], cloth: '#7a5230' },
    ladoshka: { D: { tw: 176, shX: 84, hr: 122, chestH: 108, shY: 92, thigh: 50, shin: 48, legW: 44, armW: 34, arm1: 54, arm2: 50 }, hat: 'medic', lids: [0.4, 0.22], brow: [-8, 6, 0], rest: 'sly', pupil: 6.5, idle: [2.6, 4.4, 3.6], cloth: OLV },
    hohotun: { D: { tw: 122, shX: 62, hr: 108, chestH: 128, shY: 110, thigh: 72, shin: 70, armW: 26, legW: 32, arm1: 64, arm2: 60, hatRot: 13, hatDX: 8, hatDY: -4 }, hat: 'helmet', lids: [0, 0], brow: [-10, 6, 6], rest: 'grin', pupil: 6, idle: [2.2, 3.8, 3.1], cloth: OLV },
    gvozd: { D: { tw: 190, shX: 94, hr: 124, chestH: 130, shY: 110, armW: 40, legW: 46, arm1: 62, arm2: 58, handR: 23, hatS: 0.84, hatDY: -14 }, hat: 'helmet', lids: [0, 0], brow: [-12, 5, 10], rest: 'smile', pupil: 8.5, idle: [3.9, 7.4, 6.0], cloth: OLV }
  };

  function el(tag, at, parent) { var e = document.createElementNS(NS, tag); if (at) for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function G(parent, html) { var g = el('g', null, parent); if (html) g.innerHTML = html; return g; }
  function r1(v) { return Math.round(v * 10) / 10; }

  function hatSVG(type, hr) {
    var h = hr;
    if (type === 'cap') return '' +
      '<path d="M' + (-h - 18) + ',-70 C' + (-h - 34) + ',' + (-h - 78) + ' ' + (h + 34) + ',' + (-h - 78) + ' ' + (h + 18) + ',-70 Z" fill="' + OLV + '"/>' +
      '<path d="M' + (-h + 2) + ',-88 Q0,-104 ' + (h - 2) + ',-88 L' + (h - 4) + ',-58 Q0,-74 ' + (-h + 4) + ',-58 Z" fill="#8a2f24"/>' +
      '<g class="peak"><path d="M-84,-60 Q0,-80 84,-60 Q60,-30 0,-28 Q-60,-30 -84,-60 Z" fill="#33231a"/></g>' +
      '<g class="badge"><circle cx="0" cy="' + (-h - 22) + '" r="15" fill="#ffcf1a"/><circle cx="0" cy="' + (-h - 22) + '" r="6" fill="#e23b2e" stroke-width="3"/></g>';
    if (type === 'pilot') return '' +
      '<path d="M' + (-h - 12) + ',34 C' + (-h - 22) + ',' + (-h - 60) + ' ' + (h + 22) + ',' + (-h - 60) + ' ' + (h + 12) + ',34 Q' + (h - 6) + ',52 ' + (h - 22) + ',26 C' + (h - 20) + ',-52 ' + (-h + 20) + ',-52 ' + (-h + 22) + ',26 Q' + (-h + 6) + ',52 ' + (-h - 12) + ',34 Z" fill="#7a4a2a"/>' +
      '<path d="M0,' + (-h - 4) + ' L0,-58" fill="none" stroke-width="4"/>' +
      '<g class="peak"><path d="M' + (-h + 8) + ',-86 Q0,-98 ' + (h - 8) + ',-86 L' + (h - 8) + ',-70 Q0,-82 ' + (-h + 8) + ',-70 Z" fill="#33231a"/>' +
      '<circle cx="-34" cy="-80" r="27" fill="#bfe3ea"/><circle cx="34" cy="-80" r="27" fill="#bfe3ea"/>' +
      '<path d="M-48,-90 q8,-10 20,-8 M20,-90 q8,-10 20,-8" fill="none" stroke="#fff" stroke-width="5"/></g>';
    var s = '<path d="M' + (-h - 14) + ',-52 C' + (-h - 20) + ',' + (-h - 62) + ' ' + (h + 20) + ',' + (-h - 62) + ' ' + (h + 14) + ',-52 Q0,-74 ' + (-h - 14) + ',-52 Z" fill="' + OLV + '"/>' +
      '<path d="M' + (-h - 14) + ',-52 Q0,-74 ' + (h + 14) + ',-52 Q0,-50 ' + (-h - 14) + ',-52 Z" fill="' + OLD + '"/>' +
      '<path d="M' + (-h * 0.62) + ',' + (-h - 8) + ' q22,-22 54,-24" fill="none" stroke="#8d965a" stroke-width="7"/>';
    if (type === 'medic') s += '<g class="badge"><circle cx="0" cy="' + (-h + 4) + '" r="27" fill="#fff"/><path d="M-15,' + (-h + 4) + ' h30 M0,' + (-h - 11) + ' v30" stroke="#e23b2e" stroke-width="10" stroke-linecap="butt" fill="none"/></g>';
    return s;
  }
  function mouthSVG(kind) {
    var DK = '#5a1f1a', T = '#fff', s = '';
    var rest = {
      frown: '<path d="M-17,9 Q0,1 17,9" fill="none" stroke-width="6"/>',
      smirk: '<path d="M-20,2 Q6,16 26,-8" fill="none" stroke-width="6"/><path d="M24,-14 q6,4 4,10" fill="none" stroke-width="4"/>',
      sly: '<path d="M-22,-2 Q0,16 22,-2" fill="none" stroke-width="6"/>',
      grin: '<path d="M-36,-10 Q0,0 36,-10 Q32,24 0,26 Q-32,24 -36,-10 Z" fill="' + DK + '"/><path d="M-30,-8 Q0,0 30,-8 L28,6 L8,8 L8,-3 L-6,-3 L-6,8 L-28,6 Z" fill="' + T + '" stroke-width="4"/>',
      smile: '<path d="M-24,-4 Q0,20 24,-4" fill="none" stroke-width="6"/>'
    }[kind];
    var E = kind === 'frown'
      ? '<path d="M-30,-4 L30,-4 Q28,18 0,18 Q-28,18 -30,-4 Z" fill="' + DK + '"/><path d="M-25,-2 L25,-2 L24,7 L-24,7 Z" fill="' + T + '" stroke-width="4"/>'
      : (kind === 'grin'
        ? '<path d="M-40,-12 Q0,0 40,-12 Q36,30 0,32 Q-36,30 -40,-12 Z" fill="' + DK + '"/><path d="M-33,-9 Q0,0 33,-9 L31,7 L9,9 L9,-3 L-7,-3 L-7,9 L-31,7 Z" fill="' + T + '" stroke-width="4"/><ellipse cx="0" cy="22" rx="14" ry="7" fill="#e0705f" stroke="none"/>'
        : '<path d="M-34,-8 Q0,2 34,-8 Q30,22 0,24 Q-30,22 -34,-8 Z" fill="' + DK + '"/><path d="M-28,-6 Q0,2 28,-6 L26,5 Q0,10 -26,5 Z" fill="' + T + '" stroke-width="4"/>');
    var A = '<path d="M-22,-10 Q0,-18 22,-10 Q27,28 0,32 Q-27,28 -22,-10 Z" fill="' + DK + '"/><path d="M-16,-10 Q0,-15 16,-10 L15,-1 Q0,3 -15,-1 Z" fill="' + T + '" stroke-width="4"/><ellipse cx="0" cy="22" rx="12" ry="7" fill="#e0705f" stroke="none"/>';
    if (kind === 'grin') A = A.replace('L15,-1 Q0,3 -15,-1 Z', 'L15,-1 L6,1 L6,-8 L-5,-8 L-5,1 L-15,-1 Z');
    var O = '<ellipse cx="0" cy="6" rx="12" ry="15" fill="' + DK + '"/>';
    var Pr = '<path d="M-17,5 L17,5" fill="none" stroke-width="6"/>';
    var Sm = '<ellipse cx="0" cy="5" rx="16" ry="9" fill="' + DK + '"/>';
    [rest, A, O, E, Pr, Sm].forEach(function (p, i) { s += '<g class="mo" data-i="' + i + '"' + (i ? ' display="none"' : '') + '>' + p + '</g>'; });
    return s;
  }
  var PROPS = [
    '',
    '<g transform="rotate(-8)"><rect x="-26" y="-58" width="52" height="66" rx="5" fill="#f4ecd6"/><path d="M-16,-44 h32 M-16,-32 h32 M-16,-20 h22" fill="none" stroke-width="3.5" stroke="#8a7a66"/><rect x="-26" y="-64" width="52" height="12" rx="4" fill="#8a2f24"/></g>',
    '<g transform="rotate(28)"><rect x="-5" y="-42" width="10" height="46" fill="#ffcf1a"/><path d="M-5,4 L0,17 L5,4 Z" fill="#f2c9a0"/></g>',
    '<g><path d="M-38,-14 L38,-14 Q34,22 0,22 Q-34,22 -38,-14 Z" fill="#e9eef0"/><ellipse cx="0" cy="-14" rx="38" ry="9" fill="#f6d58a"/><circle cx="-12" cy="-16" r="4" fill="#e9a54a" stroke-width="2.5"/><circle cx="9" cy="-14" r="4" fill="#e9a54a" stroke-width="2.5"/></g>',
    '<g transform="rotate(18)"><path d="M0,6 L0,-38" fill="none" stroke="#2b1a12" stroke-width="11"/><path d="M0,6 L0,-38" fill="none" stroke="#c9ced2" stroke-width="5"/><ellipse cx="0" cy="-48" rx="11" ry="14" fill="#c9ced2"/></g>'
  ];
  var PROPID = { none: 0, notebook: 1, pencil: 2, bowl: 3, spoon: 4 };
  var uid = 0;

  // ───────────── персонаж ─────────────
  function Char(name, o) {
    plug();
    var def = CHARS[name]; if (!def) throw new Error('Rig: нет персонажа ' + name);
    o = o || {};
    this.name = name; this.def = def; this.D = dims(def.D); this.id = ++uid; this.seed = hash(name) + (o.seed || 0);
    var f = o.facing || 0;
    this.m = {
      x: o.x || 0, y: o.y || 0, sc: o.scale || 1, jy: 0, sx: 1, sy: 1, turnH: f * 0.85, turnB: f * 0.85, px: 0, py: 0, rot: 0, chest: 0, head: 0, hat: 0, hatX: 0, hatY: 0, bag: 0,
      aL1: 5, aL2: -9, aL3: 0, aR1: -5, aR2: 9, aR3: 0, lL1: 0, lL2: 0, lL3: 0, lR1: 0, lR2: 0, lR3: 0,
      plant: 1, fLx: 0, fRx: 0, fLy: 0, fRy: 0, fLr: 0, fRr: 0,
      ex: 0, ey: 0, lid: 0, brow: 0, browA: 0, mouth: 0, dead: 0, eyeS: 1,
      live: 1, iB: 0, iS: 0, iH: 0, tNod: 0, tDip: 0, tBrow: 0, gL1: 0, gL2: 0, gR1: 0, gR2: 0, lkH: 0, lkT: 0, lkC: 0, bk: 0, hatK: 0, bagK: 0,
      pL: 0, pR: 0, kL: 0, kR: 0, hatFree: 0, hatWX: 0, hatWY: 0, hatWR: 0, op: 1
    };
    Object.defineProperty(this.m, '__ch', { value: this, enumerable: false });
    this.B = {}; for (var k in this.m) this.B[k] = this.m[k]; // состояние «на момент последнего вызова API»
    this._busy = {}; this._cache = new Map();
    this._build();
    this.apply();
    if (o.parent) o.parent.appendChild(this.el);
  }
  var P = Char.prototype;

  P._build = function () {
    var D = this.D, def = this.def, id = this.id, cl = def.cloth, t = this, name = this.name;
    var svg = this.el = el('svg', { 'class': 'rig rig-' + name, width: 1, height: 1, overflow: 'visible', stroke: OUT, 'stroke-width': 5.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', fill: 'none' });
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    this.shadow = el('ellipse', { fill: '#2b1a12', stroke: 'none', opacity: 0.3 }, svg);
    this.dustG = G(svg);
    this.body = G(svg);
    var E = this.E = {};
    function limb(key, w, l1, l2, col, col2) {
      var g = E[key] = G(t.body), o = w + 11;
      E[key + 'o1'] = el('line', { x1: 0, y1: 0, x2: 0, y2: l1, stroke: OUT, 'stroke-width': o }, g);
      E[key + 'o2'] = el('line', { x1: 0, y1: 0, x2: 0, y2: l2, stroke: OUT, 'stroke-width': o }, g);
      E[key + 'f1'] = el('line', { x1: 0, y1: 0, x2: 0, y2: l1, stroke: col, 'stroke-width': w }, g);
      E[key + 'f2'] = el('line', { x1: 0, y1: 0, x2: 0, y2: l2, stroke: col2 || col, 'stroke-width': w }, g);
      return g;
    }
    ['L', 'R'].forEach(function (s) {
      var g = limb('leg' + s, D.legW, D.thigh, D.shin - 6, OLD);
      var w = D.legW / 2 + 5;
      E['foot' + s] = G(g, '<path d="M' + (-w) + ',-16 Q' + (-w) + ',-24 ' + (-w + 8) + ',-24 L' + (w - 8) + ',-24 Q' + w + ',-24 ' + w + ',-16 L' + (w + 3) + ',' + (D.ankle - 12) + ' Q' + (w + 3) + ',' + D.ankle + ' ' + (w - 9) + ',' + D.ankle + ' L' + (-w + 9) + ',' + D.ankle + ' Q' + (-w - 3) + ',' + D.ankle + ' ' + (-w - 3) + ',' + (D.ankle - 12) + ' Z" fill="' + BOOT + '"/><path d="M' + (-w - 2) + ',' + (D.ankle - 7) + ' h' + (2 * w + 4) + '" stroke-width="3.5" stroke="#1f140d"/>');
    });
    ['L', 'R'].forEach(function (s) {
      var g = limb('arm' + s, D.armW, D.arm1, D.arm2 - 4, cl);
      var h = E['hand' + s] = G(g);
      E['props' + s] = [null];
      for (var i = 1; i < PROPS.length; i++) { var p = G(h, PROPS[i]); p.setAttribute('display', 'none'); E['props' + s].push(p); }
      el('circle', { cx: 0, cy: 6, r: D.handR, fill: SKIN }, h);
      E['slot' + s] = G(h);
    });
    // таз
    var tw = D.tw, pw = tw / 2 - 7;
    E.pel = G(this.body, '<rect x="' + (-pw) + '" y="' + (-D.pelvisH - 6) + '" width="' + (2 * pw) + '" height="' + (D.pelvisH + 26) + '" rx="16" fill="' + OLD + '"/>' +
      (name === 'gvozd' ? '<g transform="translate(' + (pw - 26) + ',-22) rotate(14)"><rect x="-6" y="-8" width="12" height="62" rx="4" fill="#a8703a"/><rect x="-22" y="-26" width="44" height="24" rx="5" fill="#8a8f96"/></g>' : ''));
    // грудь
    var ch = D.chestH, hw = tw / 2, s = '<rect x="' + (-hw) + '" y="' + (-ch - 8) + '" width="' + tw + '" height="' + (ch + 18) + '" rx="30" fill="' + cl + '"/>';
    s += '<path d="M' + (-hw + 3) + ',-12 h' + (tw - 6) + '" stroke="' + BOOT + '" stroke-width="15" stroke-linecap="butt"/><path d="M' + (-hw + 3) + ',-20 h' + (tw - 6) + ' M' + (-hw + 3) + ',-4 h' + (tw - 6) + '" stroke-width="4"/><rect x="-13" y="-23" width="26" height="22" rx="4" fill="#ffcf1a" stroke-width="4"/>';
    s += '<rect x="' + (-hw + 16) + '" y="' + (-ch * 0.56) + '" width="' + (hw - 30) + '" height="30" rx="6" fill="' + (cl === OLV ? OLD : '#5e3d22') + '" stroke-width="4"/><rect x="14" y="' + (-ch * 0.56) + '" width="' + (hw - 30) + '" height="30" rx="6" fill="' + (cl === OLV ? OLD : '#5e3d22') + '" stroke-width="4"/>';
    if (name === 'ustav') s += '<rect x="' + (-hw - 2) + '" y="' + (-ch - 2) + '" width="40" height="17" rx="6" fill="#e23b2e" stroke-width="4"/><rect x="' + (hw - 38) + '" y="' + (-ch - 2) + '" width="40" height="17" rx="6" fill="#e23b2e" stroke-width="4"/><circle cx="' + (-hw + 34) + '" cy="' + (-ch * 0.56 - 16) + '" r="9" fill="#ffcf1a" stroke-width="4"/>';
    if (name === 'chaika') s += '<path d="M' + (-hw + 20) + ',' + (-ch + 4) + ' Q0,' + (-ch + 44) + ' ' + (hw - 20) + ',' + (-ch + 4) + ' L' + (hw - 26) + ',' + (-ch + 28) + ' Q0,' + (-ch + 62) + ' ' + (-hw + 26) + ',' + (-ch + 28) + ' Z" fill="#f4ecd6"/>';
    if (name === 'ladoshka') s += '<path d="M' + (hw - 16) + ',' + (-ch) + ' L' + (-hw + 12) + ',-6" stroke="' + OUT + '" stroke-width="22"/><path d="M' + (hw - 16) + ',' + (-ch) + ' L' + (-hw + 12) + ',-6" stroke="#8a5a34" stroke-width="12"/>';
    if (name === 'gvozd') {
      s += '<g transform="translate(' + (hw - 40) + ',' + (-ch * 0.5) + ') rotate(-24)">';
      for (var i = 0; i < 3; i++) s += '<ellipse cx="' + (i * 5 - 5) + '" cy="' + (i * 4 - 4) + '" rx="' + (40 - i * 3) + '" ry="' + (62 - i * 3) + '" stroke="' + OUT + '" stroke-width="9"/><ellipse cx="' + (i * 5 - 5) + '" cy="' + (i * 4 - 4) + '" rx="' + (40 - i * 3) + '" ry="' + (62 - i * 3) + '" stroke="#9aa0a6" stroke-width="4"/>';
      for (i = 0; i < 9; i++) { var an = i * 40 * RAD, bx = Math.cos(an) * 40, by = Math.sin(an) * 62; s += '<path d="M' + r1(bx - 6) + ',' + r1(by - 6) + ' l12,12 M' + r1(bx + 6) + ',' + r1(by - 6) + ' l-12,12" stroke-width="3"/>'; }
      s += '</g>';
    }
    E.chest = G(this.body, s);
    if (name === 'ladoshka') E.bag = G(this.body, '<rect x="-34" y="-6" width="68" height="60" rx="12" fill="#8a5a34"/><path d="M-34,14 h68" stroke-width="4"/><circle cx="0" cy="30" r="16" fill="#fff" stroke-width="4"/><path d="M-9,30 h18 M0,21 v18" stroke="#e23b2e" stroke-width="7" stroke-linecap="butt"/>');
    // голова
    var hr = D.hr, hg = E.headG = G(this.body), hd = E.head = G(hg);
    E.earL = G(hd, '<circle cx="0" cy="0" r="25" fill="' + SKIN + '"/><path d="M5,-9 q-12,9 0,19" stroke-width="4"/>');
    E.earR = G(hd, '<circle cx="0" cy="0" r="25" fill="' + SKIN + '"/><path d="M-5,-9 q12,9 0,19" stroke-width="4"/>');
    el('circle', { cx: 0, cy: -D.nh, r: hr, fill: SKIN }, hd);
    var fc = E.face = G(hd), eyeR = 23, ey0 = -D.nh + 12, ex0 = 37;
    G(fc, '<ellipse cx="' + (-hr * 0.63) + '" cy="' + (-D.nh + 42) + '" rx="19" ry="14" fill="' + BLUSH + '" stroke="none" opacity="0.85"/><ellipse cx="' + (hr * 0.63) + '" cy="' + (-D.nh + 42) + '" rx="19" ry="14" fill="' + BLUSH + '" stroke="none" opacity="0.85"/>');
    E.eye = []; E.pup = []; E.lidU = []; E.lidD = []; E.lidLn = []; E.cross = []; E.brow = [];
    [-1, 1].forEach(function (sd, i) {
      var g = G(fc), cid = 'rigc' + id + '_' + i;
      g.innerHTML = '<clipPath id="' + cid + '"><circle cx="0" cy="0" r="' + eyeR + '"/></clipPath><circle cx="0" cy="0" r="' + eyeR + '" fill="#fff" stroke="none"/>' +
        '<g clip-path="url(#' + cid + ')"><circle class="pu" cx="0" cy="0" r="' + def.pupil + '" fill="#1a0f08" stroke="none"/><rect class="lu" x="-30" y="-30" width="60" height="0" fill="' + SKIN + '" stroke="none"/><rect class="ld" x="-30" y="30" width="60" height="0" fill="' + SKIN + '" stroke="none"/><path class="ll" d="M-30,0 h60" stroke-width="5"/></g>' +
        '<circle cx="0" cy="0" r="' + eyeR + '"/><path class="cr" d="M-13,-13 L13,13 M13,-13 L-13,13" stroke-width="7" display="none"/>';
      g._x = sd * ex0; g._y = ey0;
      E.eye.push(g); E.pup.push(g.querySelector('.pu')); E.lidU.push(g.querySelector('.lu')); E.lidD.push(g.querySelector('.ld')); E.lidLn.push(g.querySelector('.ll')); E.cross.push(g.querySelector('.cr'));
      var b = G(fc, '<path d="M-17,0 L17,0" stroke-width="' + def.brow[1] + '"/>'); b._x = sd * ex0; b._y = ey0 - 36 - def.brow[2]; b._s = sd; E.brow.push(b);
    });
    E.mouth = G(fc, mouthSVG(def.rest)); E.mouth.setAttribute('transform', 'translate(0,' + (-D.nh + 68) + ')');
    E.mo = Array.prototype.slice.call(E.mouth.querySelectorAll('.mo'));
    if (name === 'ustav') E.stache = G(fc, '<path d="M0,-6 C-12,-18 -40,-12 -46,8 C-34,2 -14,10 0,2 C14,10 34,2 46,8 C40,-12 12,-18 0,-6 Z" fill="#3a2416"/>');
    // головной убор
    E.hat = G(hg, hatSVG(def.hat, hr));
    E.peak = E.hat.querySelector('.peak'); E.badge = E.hat.querySelector('.badge');
    this._order = '';
  };

  // прямая кинематика: по модели (или её копии) — матрицы в «пространстве тела» (ед. без масштаба, (0,0) — точка на земле между стоп)
  P._fk = function (m) {
    var D = this.D, lv = m.live, tb = m.turnB, nar = 1 - 0.5 * Math.abs(tb), hx = D.hipX * nar, shx = D.shX * nar, I = [1, 0, 0, 1, 0, 0];
    var br = m.iB * lv, sw = m.iS * lv;
    var px = m.px + sw * 5, py = m.py + Math.abs(sw) * 1.5 + m.tDip + br * 0.8, rot = m.rot + sw * 1.2;
    var F = { rot: rot };
    var pel = F.pel = TR(I, px, -D.hipY + py, rot);
    var cw = m.chest + m.lkC - sw * 1.6;
    var chest = F.chest = SC(TR(pel, 0, -D.pelvisH, cw), 1, 1 + 0.022 * br);
    var hw = m.head + m.iH * lv * 3 + m.tNod + m.lkH + sw * 0.6;
    F.head = TR(chest, 0, -D.chestH, hw);
    F.hat = TR(TR(TR(F.head, 0, -D.nh, m.hat + m.hatK + D.hatRot), m.hatX + D.hatDX, m.hatY + D.hatDY, 0), 0, 0, 0);
    if (D.hatS !== 1) F.hat = SC(F.hat, D.hatS, D.hatS);
    F.bag = TR(chest, -D.tw / 2 + 14, -8, m.bag + m.bagK - (rot + cw) * (1 - 0)); // сумка висит по миру
    var a;
    a = F.aL1 = TR(chest, -shx, -D.shY, m.aL1 + m.gL1 + br * 1.5); a = F.aL2 = TR(a, 0, D.arm1, m.aL2 + m.gL2); F.aL3 = TR(a, 0, D.arm2, m.aL3);
    a = F.aR1 = TR(chest, shx, -D.shY, m.aR1 + m.gR1 - br * 1.5); a = F.aR2 = TR(a, 0, D.arm1, m.aR2 + m.gR2); F.aR3 = TR(a, 0, D.arm2, m.aR3);
    var loc = F.loc = {}, sides = [['L', -1], ['R', 1]];
    for (var i = 0; i < 2; i++) {
      var S = sides[i][0], sd = sides[i][1], l1 = m['l' + S + '1'], l2 = m['l' + S + '2'], l3 = m['l' + S + '3'];
      if (m.plant > 0.001) {
        var hp = PT(pel, sd * hx, 0), bk = -sd * (1 - Math.abs(tb)) - 2 * tb, bend = bk >= 0 ? 1 : -1;
        var r = ik2(hp[0], hp[1], m['f' + S + 'x'] + sd * hx, -D.ankle - m['f' + S + 'y'], D.thigh, D.shin, bend);
        var i1 = r[0] - rot, i2 = r[1] - r[0], i3 = -r[1] + m['f' + S + 'r'];
        l1 = lerp(l1, i1, m.plant); l2 = lerp(l2, i2, m.plant); l3 = lerp(l3, i3, m.plant);
      }
      loc['l' + S + '1'] = l1; loc['l' + S + '2'] = l2; loc['l' + S + '3'] = l3;
      a = F['l' + S + '1'] = TR(pel, sd * hx, 0, l1); a = F['l' + S + '2'] = TR(a, 0, D.thigh, l2); F['l' + S + '3'] = TR(a, 0, D.shin, l3);
    }
    return F;
  };

  P._set = function (e, k, v) { var c = this._cache, kk = e.__k || (e.__k = {}), old = kk[k]; if (old === v) return; kk[k] = v; e.setAttribute(k, v); };
  P._mx = function (e, M) { this._set(e, 'transform', 'matrix(' + M[0].toFixed(4) + ',' + M[1].toFixed(4) + ',' + M[2].toFixed(4) + ',' + M[3].toFixed(4) + ',' + M[4].toFixed(2) + ',' + M[5].toFixed(2) + ')'); };

  P.apply = function () {
    var m = this.m, D = this.D, E = this.E, F = this._fk(m), s = KSCALE * m.sc, t = this, def = this.def;
    var back = m.sx < 0;
    var Rm = [s * m.sx, 0, 0, s * m.sy, m.x, m.y - m.jy * s];
    function put(e, M) { t._mx(e, MUL(Rm, M)); }
    // порядок слоёв
    var ord = m.turnB > 0.25 ? 'R' : m.turnB < -0.25 ? 'L' : 'F';
    if (ord !== this._order) {
      this._order = ord;
      var seq = ord === 'R' ? ['legR', 'legL', 'armR', 'pel', 'chest', 'bag', 'headG', 'armL'] : ord === 'L' ? ['legL', 'legR', 'armL', 'pel', 'chest', 'bag', 'headG', 'armR'] : ['legL', 'legR', 'pel', 'chest', 'bag', 'headG', 'armL', 'armR'];
      for (var i = 0; i < seq.length; i++) if (E[seq[i]]) this.body.appendChild(E[seq[i]]);
    }
    put(E.pel, F.pel); put(E.chest, F.chest);
    if (E.bag) put(E.bag, F.bag);
    put(E.head, F.head);
    if (m.hatFree > 0.5) this._mx(E.hat, SC(TR(SC(TR([1, 0, 0, 1, 0, 0], m.hatWX, m.hatWY, m.hatWR), s, s), D.hatDX, D.hatDY, 0), D.hatS, D.hatS));
    else put(E.hat, F.hat);
    ['L', 'R'].forEach(function (S) {
      put(E['arm' + S + 'o1'], F['a' + S + '1']); put(E['arm' + S + 'f1'], F['a' + S + '1']);
      put(E['arm' + S + 'o2'], F['a' + S + '2']); put(E['arm' + S + 'f2'], F['a' + S + '2']);
      put(E['hand' + S], F['a' + S + '3']);
      put(E['leg' + S + 'o1'], F['l' + S + '1']); put(E['leg' + S + 'f1'], F['l' + S + '1']);
      put(E['leg' + S + 'o2'], F['l' + S + '2']); put(E['leg' + S + 'f2'], F['l' + S + '2']);
      put(E['foot' + S], TR(F['l' + S + '3'], m.turnB * 11, 0, 0));
      var k = Math.round(m['k' + S]), p = m['p' + S], pr = E['props' + S];
      for (var i = 1; i < pr.length; i++) {
        var on = i === k && p > 0.02;
        t._set(pr[i], 'display', on ? 'inline' : 'none');
        if (on) t._set(pr[i], 'transform', 'translate(0,8) scale(' + p.toFixed(3) + ')');
      }
    });
    // лицо
    var th = m.turnH + m.lkT, fx = th * 26, hr = D.hr;
    this._set(E.face, 'display', back ? 'none' : 'inline');
    this._set(E.face, 'transform', 'translate(' + fx.toFixed(2) + ',0)');
    this._set(E.earL, 'transform', 'translate(' + (-hr - 4 - th * 17).toFixed(2) + ',' + (-D.nh + 10) + ')');
    this._set(E.earR, 'transform', 'translate(' + (hr + 4 - th * 17).toFixed(2) + ',' + (-D.nh + 10) + ')');
    if (E.peak) this._set(E.peak, 'transform', 'translate(' + (th * 22).toFixed(2) + ',0)');
    if (E.badge) { this._set(E.badge, 'transform', 'translate(' + (th * 30).toFixed(2) + ',0)'); this._set(E.badge, 'display', back ? 'none' : 'inline'); }
    if (E.peak && back) this._set(E.peak, 'display', 'none'); else if (E.peak) this._set(E.peak, 'display', 'inline');
    var dead = m.dead > 0.5, c = clamp(Math.max(m.bk, m.lid), 0, 1), neg = Math.min(0, m.lid);
    var u = def.lids[0] * (1 + neg) + (0.56 - def.lids[0]) * c, l = def.lids[1] * (1 + neg) + (0.47 - def.lids[1]) * c, er = 23;
    if (dead) { u = 0; l = 0; }
    for (var i = 0; i < 2; i++) {
      var g = E.eye[i];
      this._set(g, 'transform', 'translate(' + g._x + ',' + g._y + ') scale(' + m.eyeS.toFixed(3) + ')');
      this._set(E.pup[i], 'cx', (m.ex * 9 + th * 5 + (this.name === 'gvozd' ? (i ? 3 : -3) : 0)).toFixed(2));
      this._set(E.pup[i], 'cy', (m.ey * 8).toFixed(2));
      this._set(E.pup[i], 'display', dead ? 'none' : 'inline');
      this._set(E.cross[i], 'display', dead ? 'inline' : 'none');
      this._set(E.lidU[i], 'height', (30 - er + 2 * er * u).toFixed(2));
      this._set(E.lidD[i], 'y', (er - 2 * er * l).toFixed(2)); this._set(E.lidD[i], 'height', (2 * er * l + 8).toFixed(2));
      this._set(E.lidLn[i], 'transform', 'translate(0,' + (-er + 2 * er * u).toFixed(2) + ')');
      this._set(E.lidLn[i], 'display', u > 0.04 ? 'inline' : 'none');
      var b = E.brow[i];
      this._set(b, 'transform', 'translate(' + b._x + ',' + (b._y - (m.brow + m.tBrow) * 11 + (dead ? -6 : 0)).toFixed(2) + ') rotate(' + (b._s * -(def.brow[0] + m.browA * 16)).toFixed(2) + ')');
    }
    var mo = Math.round(m.mouth);
    for (i = 0; i < E.mo.length; i++) this._set(E.mo[i], 'display', i === mo ? 'inline' : 'none');
    if (E.stache) this._set(E.stache, 'transform', 'translate(0,' + (-D.nh + 52 - (mo === 1 || mo === 3 ? 5 : mo ? 3 : 0)) + ')');
    // тень: ширина по габариту тела, плотность по высоте
    var pts = [PT(F.lL3, 0, 0), PT(F.lR3, 0, 0), PT(F.pel, -D.tw / 2, 0), PT(F.pel, D.tw / 2, 0), PT(F.head, -D.hr, -D.nh), PT(F.head, D.hr, -D.nh), PT(F.head, 0, -D.nh - D.hr)], mn = 1e9, mxx = -1e9, low = -1e9;
    for (i = 0; i < pts.length; i++) { if (pts[i][0] < mn) mn = pts[i][0]; if (pts[i][0] > mxx) mxx = pts[i][0]; }
    low = Math.max(pts[0][1] + D.ankle, pts[1][1] + D.ankle, F.pel[5] + D.tw / 2 - 10, PT(F.head, 0, -D.nh)[1] + D.hr);
    var lift = Math.max(0, -low * m.sy) + m.jy, ff = 1 / (1 + lift / 200), ax = Math.abs(m.sx);
    var wdt = Math.max(70, (mxx - mn) / 2 * 0.86 + 14) * (0.35 + 0.65 * ax) * ff;
    this._set(this.shadow, 'cx', (m.x + (mn + mxx) / 2 * s * m.sx).toFixed(2)); this._set(this.shadow, 'cy', (m.y + 2).toFixed(2));
    this._set(this.shadow, 'rx', (wdt * s).toFixed(2)); this._set(this.shadow, 'ry', (15 * s * ff).toFixed(2));
    this._set(this.shadow, 'opacity', (0.34 * ff * m.op).toFixed(3));
    this._set(this.body, 'opacity', m.op.toFixed(3));
    this._F = F;
  };

  // ───────────── низкоуровневые помощники ─────────────
  P._to = function (tl, t, vars, dur, ease, extra) {
    var v = { rig: vars, duration: Math.max(0.001, dur), ease: ease || 'sine.inOut' }, k;
    if (extra) for (k in extra) v[k] = extra[k];
    var end = t + v.duration * (1 + (v.repeat || 0));
    for (k in vars) { if (this._busy[k] > t + 1e-4 && !this._warned) { this._warned = 1; console.warn('Rig[' + this.name + ']: два твина канала «' + k + '» пересекаются около t=' + t.toFixed(2) + ' (см. RIG.md, «нельзя»)'); } if (!(this._busy[k] > end)) this._busy[k] = end; }
    tl.to(this.m, v, t);
    if (end > (this._end || 0)) this._end = end;
    return this;
  };
  P._clip = function (tl, t, dur, tr, step) {
    var n = 0, k; for (k in tr) { n = tr[k].length; break; }
    for (k in tr) this._busy[k] = t + dur;
    tl.to(this.m, { rigClip: { tr: tr, n: n, dur: dur, step: step || {} }, duration: dur, ease: clock }, t);
    if (t + dur > (this._end || 0)) this._end = t + dur;
  };
  P._kick = function (tl, t, amp) { // вторичное движение: убор и сумка доигрывают после остановки
    if (this._busy.hatK > t) return; // предыдущий доигрыш ещё идёт
    this._to(tl, t, { hatK: amp, bagK: amp * 2.2 }, 0.1, 'sine.out');
    this._to(tl, t + 0.1, { hatK: 0, bagK: 0 }, 0.75, 'elastic.out(1.1,0.32)');
  };
  P._rng = function (t) { return rng(this.seed + Math.round(t * 977)); };
  // поза модели на момент сборки: слои обнулены, ноги — эффективные углы FK
  P._poseNow = function () {
    var B = this.B, p = {}, k; for (k in B) p[k] = B[k];
    p.live = 0; p.tNod = p.tDip = p.gL1 = p.gL2 = p.gR1 = p.gR2 = p.lkH = p.lkC = p.hatK = p.bagK = 0;
    var F = this._fk(p); for (k in F.loc) p[k] = F.loc[k];
    return p;
  };
  var SWAP = [['aL1', 'aR1'], ['aL2', 'aR2'], ['aL3', 'aR3'], ['lL1', 'lR1'], ['lL2', 'lR2'], ['lL3', 'lR3'], ['fLx', 'fRx'], ['fLy', 'fRy'], ['fLr', 'fRr'], ['gL1', 'gR1'], ['gL2', 'gR2']];
  var NEG = { rot: 1, chest: 1, head: 1, hat: 1, bag: 1, px: 1, turnH: 1, turnB: 1, hatX: 1, ex: 1, fLx: 1, fRx: 1, fLr: 1, fRr: 1, aL1: 1, aL2: 1, aL3: 1, aR1: 1, aR2: 1, aR3: 1, lL1: 1, lL2: 1, lL3: 1, lR1: 1, lR2: 1, lR3: 1, gL1: 1, gL2: 1, gR1: 1, gR2: 1, lkH: 1, lkT: 1, lkC: 1 };
  function mir(p) { // зеркало позы (число) или дорожек (массивы)
    var q = {}, k, i;
    for (k in p) q[k] = p[k];
    for (i = 0; i < SWAP.length; i++) { var a = SWAP[i][0], b = SWAP[i][1], ha = a in p, hb = b in p; if (ha) q[b] = p[a]; else delete q[b]; if (hb) q[a] = p[b]; else delete q[a]; }
    for (k in q) if (NEG[k]) { if (typeof q[k] === 'number') q[k] = -q[k]; else { var arr = new Float32Array(q[k].length); for (i = 0; i < arr.length; i++) arr[i] = -q[k][i]; q[k] = arr; } }
    return q;
  }

  // ───────────── жизнь: дыхание, моргание, речь, взгляд ─────────────
  P.idle = function (tl, t0, t1) {
    var r = this._rng(t0 + 3), I = this.def.idle, t = this;
    function osc(key, per, a, start) {
      var half = per / 2, t2 = t0, v = {}, n;
      if (start) { v[key] = a; t._to(tl, t2, v, half / 2, 'sine.inOut'); t2 += half / 2; }
      n = Math.floor((t1 - 0.5 - t2) / half);
      if (n > 0) { v = {}; v[key] = start ? -a : a; t._to(tl, t2, v, half, 'sine.inOut', { repeat: n - 1, yoyo: true }); t2 += n * half; }
      v = {}; v[key] = 0; t._to(tl, t2, v, Math.max(0.2, Math.min(0.6, t1 - t2)), 'sine.inOut');
    }
    osc('iB', I[0] * (0.92 + 0.16 * r()), 1, false);
    osc('iS', I[1] * (0.9 + 0.2 * r()), r() < 0.5 ? 1 : -1, true);
    osc('iH', I[2] * (0.9 + 0.2 * r()), r() < 0.5 ? 1 : -1, true);
    return this;
  };
  P.blinks = function (tl, t0, t1) {
    var r = this._rng(t0 + 11), t = t0 + 0.4 + r() * 2.2;
    while (t < t1 - 0.25) {
      this._to(tl, t, { bk: 1 }, 0.06, 'power2.in'); this._to(tl, t + 0.07, { bk: 0 }, 0.1, 'power2.out');
      if (r() < 0.2 && t + 0.5 < t1) { this._to(tl, t + 0.24, { bk: 1 }, 0.06, 'power2.in'); this._to(tl, t + 0.31, { bk: 0 }, 0.1, 'power2.out'); }
      t += 2 + r() * 3;
    }
    return this;
  };
  P.mouth = function (tl, t, shape) { return this._to(tl, t, { mouth: shape }, 0.02, 'power1.out'); };
  P.talk = function (tl, t, dur, o) {
    o = o || {};
    var en = o.energy == null ? 1 : o.energy, r = this._rng(t + 5), N = Math.max(2, Math.round(dur * 60)), a = new Float32Array(N + 1), i, tt = 0, prev = 0;
    var SH = [1, 5, 3, 2, 1, 5, 3, 4];
    while (tt < dur - 0.06) { // слоги: 8–10 в секунду, форма держится ≥ 2 кадров
      var len = 0.085 + r() * 0.05, sh = SH[Math.floor(r() * SH.length)];
      if (r() < 0.14) { sh = 0; len = 0.07 + r() * 0.06; }
      if (sh === prev) sh = sh === 1 ? 5 : 1;
      if (en < 0.5 && sh === 1) sh = 5;
      for (i = Math.round(tt * 60); i < Math.min(N, Math.round((tt + len) * 60)); i++) a[i] = sh;
      prev = sh; tt += len;
    }
    a[N] = 0; a[N - 1] = 0;
    this._clip(tl, t - 0.04 < 0 ? 0 : t - 0.04, dur, { mouth: a }, { mouth: 1 }); // рот опережает звук на кадр
    // ударения: кивок, бровь, жест
    var hand = o.hand || (this.B.turnB < -0.3 ? 'L' : 'R'), sg = hand === 'R' ? -1 : 1, ts = t + 0.05, n = 0, g1 = 'g' + hand + '1', g2 = 'g' + hand + '2', v;
    var gest = o.gesture !== false && Math.abs(this.B.rot) < 30;
    while (ts < t + dur - 0.3) {
      var amp = (0.6 + r() * 0.6) * en, up = r() < 0.3 ? -1 : 1;
      this._to(tl, ts, { tNod: 5.5 * amp * up, tDip: 2.5 * amp, tBrow: 0.35 * amp }, 0.1, 'power2.out');
      this._to(tl, ts + 0.1, { tNod: 0, tDip: 0, tBrow: 0 }, 0.3, 'sine.inOut');
      if (gest && (n % 2 === 0 || en > 1.2)) {
        v = {}; v[g1] = sg * 10 * amp; v[g2] = sg * (24 + r() * 22) * amp;
        this._to(tl, ts - 0.04 < t ? t : ts - 0.04, v, 0.16, 'back.out(2)');
        v = {}; v[g1] = 0; v[g2] = 0; this._to(tl, ts + 0.16, v, 0.3, 'sine.inOut');
      }
      ts += 0.48 + r() * 0.32; n++;
    }
    return this;
  };
  P.look = function (tl, t, dx, dy, dur) {
    dur = dur || 0.35; dy = dy || 0;
    this._to(tl, t, { ex: dx, ey: dy }, dur * 0.45, 'power3.out');               // зрачки ведут
    this._to(tl, t + 0.05, { lkH: dx * 5 + dy * dx * 2, lkT: dx * 0.32 }, dur, 'back.out(1.6)'); // голова
    this._to(tl, t + 0.13, { lkC: dx * 2.2 }, dur * 1.2, 'sine.inOut');           // корпус догоняет
    this.B.ex = dx; this.B.ey = dy;
    return this;
  };
  P.turn = function (tl, t, facing, dur) {
    dur = dur || 0.4; var v = clamp(facing, -1, 1) * 0.85;
    this._to(tl, t, { turnH: v }, dur * 0.6, 'power2.out');
    this._to(tl, t + 0.08, { turnB: v }, dur * 0.8, 'power2.inOut');
    this._to(tl, t + 0.04, { py: this.B.py + 7 }, dur * 0.4, 'sine.out'); this._to(tl, t + 0.04 + dur * 0.4, { py: this.B.py }, dur * 0.6, 'back.out(2.2)');
    this._kick(tl, t + dur * 0.5, (v - this.B.turnB) * -7);
    this.B.turnH = this.B.turnB = v;
    return this;
  };

  // ───────────── позы ─────────────
  P._arm = function (S, tx, ty, elbow) { // цель кисти в системе груди (0,0 — талия), возвращает {aS1,aS2}
    var D = this.D, sd = S === 'R' ? 1 : -1, r = ik2(sd * D.shX, -D.shY, tx, ty - 6, D.arm1, D.arm2 + 4, -sd * (elbow || 1)), o = {};
    o['a' + S + '1'] = wrap(r[0]); o['a' + S + '2'] = wrap(r[1] - r[0]); return o;
  };
  function add(a, b) { for (var k in b) a[k] = b[k]; return a; }
  var STAND = { px: 0, py: 0, rot: 0, chest: 0, head: 0, plant: 1, fLx: 0, fRx: 0, fLy: 0, fRy: 0, fLr: 0, fRr: 0, aL1: 5, aL2: -9, aL3: 0, aR1: -5, aR2: 9, aR3: 0, lid: 0, brow: 0, browA: 0, eyeS: 1, jy: 0, sx: 1, sy: 1, pL: 0, pR: 0 };
  var POSES = {
    stand: function () { return {}; },
    sit: function (c) { var D = c.D; return { py: D.thigh - 6, fLx: -20, fRx: 20, chest: 3, aL1: 16, aL2: -44, aR1: -16, aR2: 44 }; },
    salute: function (c) { var D = c.D; return add({ py: -3, chest: -2, brow: 0.3, aL1: 3, aL2: -3, aR3: -30 }, c._arm('R', D.hr * 0.8, -(D.chestH + D.nh) - 22)); },
    point: function (c) { var D = c.D; return add({ chest: 4, head: 3, aL1: 26, aL2: -72 }, c._arm('R', D.shX + D.arm1 + D.arm2 - 10, -D.shY - 52)); },
    shrug: function () { return { py: -6, head: 7, brow: 1, aR1: -30, aR2: -86, aR3: -24, aL1: 30, aL2: 86, aL3: 24 }; },
    think: function (c) { var D = c.D; return add(add({ head: -6, ex: 0.5, ey: -0.9, brow: 0.7, chest: -2 }, c._arm('R', 30, -(D.chestH + D.nh) + D.hr - 2)), c._arm('L', 36, -34, -1)); },
    handOut: function (c) { var D = c.D; return add({ chest: 5, head: 4, aR3: -75, aL1: 8, aL2: -14 }, c._arm('R', D.shX + 80, -D.shY + 46)); },
    rubHands: function (c) { var D = c.D; return add(add({ chest: 6, head: 5, lid: 0.3, browA: -0.3, py: 4 }, c._arm('R', 15, -D.shY + 54)), c._arm('L', -15, -D.shY + 54)); },
    write: function (c) { var D = c.D; return add(add({ head: 9, ey: 0.8, ex: -0.15, chest: 3, pL: 1, pR: 1, kL: 1, kR: 2 }, c._arm('L', -24, -D.shY + 62)), c._arm('R', 22, -D.shY + 46)); },
    eat: function (c) { var D = c.D; return add(add({ head: 5, ey: 0.6, pL: 1, pR: 1, kL: 3, kR: 4 }, c._arm('L', -26, -D.shY + 76)), c._arm('R', 6, -D.shY + 50)); },
    cower: function (c) { var D = c.D, hc = -(D.chestH + D.nh); return add(add({ py: 44, chest: 12, head: 12, lid: 0.85, brow: -0.6, fLx: -8, fRx: 8 }, c._arm('R', 66, hc - 50)), c._arm('L', -66, hc - 50)); },
    facepalm: function (c) { var D = c.D; return add({ head: 10, chest: 5, lid: 1, aL1: 4, aL2: -6 }, c._arm('R', 6, -(D.chestH + D.nh) + 8)); },
    wave: function (c) { var D = c.D; return add({ head: -4, brow: 0.5, aR3: 0 }, c._arm('R', D.shX + 56, -(D.chestH + D.nh) - 30)); },
    hold: function () { return { aR1: -12, aR2: -84 }; }
  };
  var CYCLIC = { rubHands: 1, write: 1, eat: 1, wave: 1, cheerWeak: 1 };
  var GROUPS = { head: 'h', ex: 'h', ey: 'h', lid: 'h', brow: 'h', browA: 'h', eyeS: 'h', aL1: 'L1', aL2: 'L2', aL3: 'L2', aR1: 'R1', aR2: 'R2', aR3: 'R2' };

  P.pose = function (tl, t, pose, dur, ease, o) {
    o = o || {};
    var B = this.B, self = this, name = typeof pose === 'string' ? pose : null, cyc = name && CYCLIC[name], total = dur, tgt, k, v;
    if (name === 'cheerWeak') return this._cheerWeak(tl, t, dur || 1.4);
    var flip = false;
    if (name) {
      if (!POSES[name]) throw new Error('Rig: нет позы ' + name);
      tgt = add(add({}, STAND), POSES[name](this));
      if (o.sit) { var ss = POSES.sit(this); tgt.py = ss.py; tgt.fLx = ss.fLx; tgt.fRx = ss.fRx; } // o.sit: поза сидя (ноги/таз как у sit)
      if (name === 'hold') { delete tgt.pL; delete tgt.pR; }
      flip = o.flip != null ? !!o.flip : B.turnB < -0.3;
      if (flip) { var ex = tgt.ex; tgt = mir(tgt); tgt.ex = -ex; v = tgt.pL; tgt.pL = tgt.pR; tgt.pR = v; var kl = tgt.kL, kr = tgt.kR; delete tgt.kL; delete tgt.kR; if (kr != null) tgt.kL = kr; if (kl != null) tgt.kR = kl; }
      tgt.rot += 360 * Math.round(B.rot / 360);
      if ('ex' in tgt) this._gaze = true; else if (this._gaze) { this._gaze = false; tgt.ex = 0; tgt.ey = 0; }
    } else {
      tgt = {};
      for (k in pose) { if (k === 'handL' || k === 'handR') add(tgt, this._arm(k.charAt(4), pose[k][0], pose[k][1], pose[k][2])); else tgt[k] = pose[k]; }
    }
    dur = cyc ? Math.min(0.7, (total || 2) * 0.4) : (dur == null ? 0.4 : dur);
    ['aL1', 'aL2', 'aR1', 'aR2'].forEach(function (a) { if (a in tgt) tgt[a] = B[a] + wrap(tgt[a] - B[a]); });
    var bigA = 0; ['aL1', 'aL2', 'aR1', 'aR2'].forEach(function (a) { if (a in tgt) bigA = Math.max(bigA, Math.abs(tgt[a] - B[a])); });
    if (bigA / 220 > dur) dur = bigA / 220; // за кадр сегмент не поворачивается больше ~25°
    var g = { b: {}, h: {}, L1: {}, L2: {}, R1: {}, R2: {} }, dly = { b: 0, h: 0.05, L1: 0.03, L2: 0.085, R1: 0.03, R2: 0.085 }, big = 0;
    for (k in tgt) {
      if (DISCRETE[k]) continue;
      if (Math.abs(tgt[k] - B[k]) < 1e-4) continue;
      g[GROUPS[k] || 'b'][k] = tgt[k]; if (k.charAt(0) === 'a') big = Math.max(big, Math.abs(tgt[k] - B[k]));
    }
    if (tgt.kL != null && tgt.pL > 0 && tgt.kL !== B.kL) { this._to(tl, t, { kL: tgt.kL }, 0.02, 'power1.out'); B.kL = tgt.kL; }
    if (tgt.kR != null && tgt.pR > 0 && tgt.kR !== B.kR) { this._to(tl, t, { kR: tgt.kR }, 0.02, 'power1.out'); B.kR = tgt.kR; }
    var aEase = ease || (dur >= 0.25 ? 'back.out(1.5)' : 'power2.out'), bEase = ease || 'power2.inOut';
    ['b', 'h', 'L1', 'L2', 'R1', 'R2'].forEach(function (key) {
      var vars = g[key], has = false, kk; for (kk in vars) { has = true; break; }
      if (!has) return;
      var isArm = key.length === 2, d0 = dur > 0.12 ? dly[key] : 0;
      if (isArm && key.charAt(1) === '1' && dur >= 0.3 && big > 40) { // предвосхищение: короткий замах в обратную сторону
        var an = {}; for (kk in vars) an[kk] = B[kk] - (vars[kk] - B[kk]) * 0.09;
        self._to(tl, t + d0, an, dur * 0.22, 'sine.inOut'); self._to(tl, t + d0 + dur * 0.22, vars, dur * 0.78, aEase);
      } else self._to(tl, t + d0, vars, dur, isArm || key === 'h' ? aEase : bEase);
    });
    for (k in tgt) if (!DISCRETE[k]) B[k] = tgt[k];
    if (big > 25 || Math.abs((g.b.py || 0)) > 10) this._kick(tl, t + dur * 0.55, (flip ? 1 : -1) * Math.min(7, 2 + big / 25));
    if (cyc) this._cycle(tl, t + dur, Math.max(0.2, total - dur), name, flip);
    return this;
  };
  P._cycle = function (tl, t, dur, name, flip) {
    var M = flip ? 'L' : 'R', O = flip ? 'R' : 'L', sg = flip ? -1 : 1, self = this, v, n, hp;
    function osc(key, a, half) { var n = Math.max(1, Math.round(dur / half)), h = dur / n, v = {}; if (n < 2) return; v[key] = a; self._to(tl, t, v, h, 'sine.inOut'); if (n > 2) { v = {}; v[key] = -a; self._to(tl, t + h, v, h, 'sine.inOut', { repeat: n - 3, yoyo: true }); } v = {}; v[key] = 0; self._to(tl, t + h * (n - 1), v, h, 'sine.inOut'); }
    if (name === 'rubHands') { osc('g' + M + '2', 9, 0.13); osc('g' + O + '2', 9, 0.13); osc('g' + M + '1', -4, 0.26); osc('tDip', 1.5, 0.39); }
    if (name === 'write') { osc('g' + M + '2', 6, 0.085); osc('g' + M + '1', 3 * sg, 0.45); osc('tNod', 1.5, 0.6); }
    if (name === 'wave') { osc('g' + M + '2', 24, 0.17); osc('g' + M + '1', 5, 0.34); }
    if (name === 'eat') {
      var D = this.D, B = this.B, a1 = 'a' + M + '1', a2 = 'a' + M + '2', dn = {}, up, per = 2.3, tt = t, mth = this._arm('R', 16, -(D.chestH + D.nh) + 66);
      up = {}; up[a1] = flip ? -mth.aR1 : mth.aR1; up[a2] = flip ? -mth.aR2 : mth.aR2; dn[a1] = B[a1]; dn[a2] = B[a2];
      up[a1] = B[a1] + wrap(up[a1] - B[a1]); up[a2] = B[a2] + wrap(up[a2] - B[a2]);
      while (tt + per <= t + dur + 0.01) {
        this._to(tl, tt, up, 0.3, 'power2.out'); this._to(tl, tt + 0.1, { tNod: 6 }, 0.2, 'sine.out');
        this.mouth(tl, tt + 0.22, 1); this.mouth(tl, tt + 0.42, 0); // рот открыт только под ложку
        this._to(tl, tt + 0.42, dn, 0.36, 'power2.inOut'); this._to(tl, tt + 0.42, { tNod: 0 }, 0.3, 'sine.inOut');
        this._to(tl, tt + 0.75, { tNod: 2.2 }, 0.16, 'sine.inOut'); this._to(tl, tt + 0.91, { tNod: 0 }, 0.16, 'sine.inOut'); this._to(tl, tt + 1.1, { tNod: 2 }, 0.16, 'sine.inOut'); this._to(tl, tt + 1.26, { tNod: 0 }, 0.2, 'sine.inOut'); // жуёт с закрытым ртом: только лёгкие кивки
        tt += per;
      }
    }
  };
  P._cheerWeak = function (tl, t, dur) { // лёжа слабо поднимает руку
    var B = this.B, r = wrap(B.rot), S = r > 0 ? 'L' : 'R', a1 = 'a' + S + '1', a2 = 'a' + S + '2', v = {}, base = {};
    var up = (r > 0 ? 180 - 24 : -180 + 24) - B.rot - B.chest; up = B[a1] + wrap(up - B[a1]);
    base[a1] = B[a1]; base[a2] = B[a2];
    v[a1] = up; v[a2] = r > 0 ? 34 : -34; this._to(tl, t, v, 0.5, 'power2.out');
    v = {}; v[a1] = up + (r > 0 ? -12 : 12); this._to(tl, t + 0.5, v, 0.18, 'sine.inOut', { repeat: Math.max(1, 2 * Math.round((dur - 1) / 0.36) + 1), yoyo: true });
    var te = t + 0.5 + 0.18 * (Math.max(1, 2 * Math.round((dur - 1) / 0.36) + 1) + 1);
    this._to(tl, te, base, 0.8, 'power2.inOut');
    return this;
  };

  // ───────────── реакции ─────────────
  P.flinch = function (tl, t, o) {
    var B = this.B, a = (o && o.amp) || 1, d = (o && o.dir) || (this._rng(t)() < 0.5 ? 1 : -1);
    var v = { py: B.py + 16 * a, chest: B.chest - d * 7 * a, head: B.head - d * 8 * a, aL1: B.aL1 + 34 * a, aL2: B.aL2 + 46 * a, aR1: B.aR1 - 34 * a, aR2: B.aR2 - 46 * a, eyeS: 1.28, brow: 1, lid: -1 };
    var back = { py: B.py, chest: B.chest, head: B.head, aL1: B.aL1, aL2: B.aL2, aR1: B.aR1, aR2: B.aR2, eyeS: B.eyeS, brow: B.brow, lid: B.lid };
    this._to(tl, t, v, 0.09, 'power3.out');
    this._to(tl, t + 0.34, { py: back.py, chest: back.chest, eyeS: back.eyeS, brow: back.brow, lid: back.lid }, 0.4, 'back.out(1.6)');
    this._to(tl, t + 0.38, { head: back.head }, 0.45, 'back.out(2)');
    this._to(tl, t + 0.4, { aL1: back.aL1, aL2: back.aL2, aR1: back.aR1, aR2: back.aR2 }, 0.5, 'back.out(1.8)');
    this._kick(tl, t + 0.03, d * 9 * a);
    return this;
  };
  P.bounce = function (tl, t, amp) { // подбросило тряской
    amp = amp == null ? 30 : amp; var B = this.B, up = Math.max(0.1, Math.sqrt(2 * amp / 2600));
    this._to(tl, t, { jy: amp, sy: 1.05, sx: 0.96 }, up, 'power2.out');
    this._to(tl, t + up, { jy: 0, sy: 1, sx: 1 }, up, 'power2.in');
    this._to(tl, t + 2 * up, { sy: 0.92, sx: 1.07, py: B.py + 9 }, 0.07, 'power2.out');
    this._to(tl, t + 2 * up + 0.07, { sy: 1, sx: 1, py: B.py }, 0.38, 'elastic.out(1,0.45)');
    this._to(tl, t + 0.04, { aL1: B.aL1 + 26, aR1: B.aR1 - 26, aL2: B.aL2 + 14, aR2: B.aR2 - 14 }, up + 0.06, 'power2.out');
    this._to(tl, t + up + 0.14, { aL1: B.aL1, aR1: B.aR1, aL2: B.aL2, aR2: B.aR2 }, 0.5, 'back.out(2.4)');
    this._to(tl, t + 0.05, { hatY: -amp * 0.5 }, up, 'power2.out'); this._to(tl, t + 0.05 + up, { hatY: 0 }, up + 0.05, 'power2.in');
    this._to(tl, t + 0.02, { head: B.head - 5, eyeS: 1.15 }, up, 'power2.out'); this._to(tl, t + up + 0.1, { head: B.head, eyeS: B.eyeS }, 0.45, 'back.out(2)');
    this._kick(tl, t + 2 * up + 0.1, 6);
    return this;
  };
  P.jump = function (tl, t, h) {
    h = h == null ? 120 : h; var B = this.B, G0 = 2600, up = Math.sqrt(2 * h / G0), t1 = t + 0.2, t2 = t1 + up, t3 = t2 + up;
    this._to(tl, t, { py: B.py + 30, sy: 0.95, sx: 1.04, chest: B.chest + 5 }, 0.2, 'power2.out');              // присел — предвосхищение
    this._to(tl, t, { aL1: B.aL1 - 22, aR1: B.aR1 + 22 }, 0.2, 'sine.inOut');
    this._to(tl, t1, { jy: h }, up, 'power2.out'); this._to(tl, t2, { jy: 0 }, up, 'power2.in');
    this._to(tl, t1, { py: B.py - 4, sy: 1.07, sx: 0.95, chest: B.chest - 3 }, 0.12, 'power2.out');
    this._to(tl, t1 + 0.12, { sy: 1, sx: 1, fLy: 22, fRy: 30 }, up - 0.12, 'sine.inOut');
    this._to(tl, t2, { fLy: 0, fRy: 0 }, up, 'power2.in');
    this._to(tl, t1 + 0.03, { aL1: B.aL1 + 120, aR1: B.aR1 - 120, aL2: B.aL2 + 20, aR2: B.aR2 - 20 }, up * 1.1, 'power2.out');
    this._to(tl, t2 + up * 0.3, { aL1: B.aL1 + 30, aR1: B.aR1 - 30 }, up * 0.7, 'sine.in');
    this._to(tl, t3, { py: B.py + 26, sy: 0.9, sx: 1.08 }, 0.08, 'power2.out');                                   // приземление: сжатие
    this._to(tl, t3 + 0.08, { py: B.py, sy: 1, sx: 1, chest: B.chest }, 0.45, 'elastic.out(1,0.5)');
    this._to(tl, t3 + 0.05, { aL1: B.aL1, aR1: B.aR1, aL2: B.aL2, aR2: B.aR2 }, 0.55, 'back.out(2.2)');
    this._to(tl, t1 + 0.05, { hatY: -12 }, up, 'power2.out'); this._to(tl, t2 + 0.05, { hatY: 0 }, up, 'power2.in');
    this._kick(tl, t3 + 0.05, 7);
    this._dust(tl, t3, this.B.x, this.B.y, 0.6);
    return this;
  };
  P.squash = function (tl, t, o) { // сплющивание (дверь): axis 'y' — в блин, 'x' — в лист
    o = o || {}; var ax = o.axis || 'y', to = o.to || 0.14, B = this.B, a, b, T = t;
    a = ax === 'y' ? { sy: 1.1, sx: 0.93 } : { sx: 1.08, sy: 0.95 };
    this._to(tl, T, a, 0.09, 'sine.out'); this._to(tl, T, { eyeS: 1.35, lid: -1, brow: 1 }, 0.08, 'power2.out'); T += 0.09;
    b = ax === 'y' ? { sy: to, sx: 1.55 } : { sx: to, sy: 1.16 };
    this._to(tl, T, b, 0.11, 'power3.in'); T += 0.11;
    b = ax === 'y' ? { sy: to * 1.5, sx: 1.42 } : { sx: to * 1.5, sy: 1.1 };
    this._to(tl, T, b, 0.5, 'elastic.out(1.2,0.3)'); T += 0.5;
    this._to(tl, t + 0.2, { aL1: B.aL1 + 60, aR1: B.aR1 - 60, live: 0 }, 0.25, 'back.out(2)');
    if (o.hold !== Infinity && o.recover !== false) {
      T += (o.hold == null ? 0.6 : o.hold);
      this._to(tl, T, { sx: 1, sy: 1 }, 0.7, 'elastic.out(1,0.35)');
      this._to(tl, T + 0.1, { aL1: B.aL1, aR1: B.aR1, eyeS: B.eyeS, lid: B.lid, brow: B.brow, live: 1 }, 0.5, 'back.out(2)');
      this._kick(tl, T + 0.1, 9);
    } else { B.sx = b.sx; B.sy = b.sy; B.live = 0; B.aL1 += 60; B.aR1 -= 60; B.eyeS = 1.35; B.lid = -1; B.brow = 1; }
    return this;
  };

  // ───────────── походка (запечённая) ─────────────
  P.walkTo = function (tl, t, x, dur, o) {
    o = o || {};
    var B = this.B, D = this.D, s = KSCALE * B.sc, d = (x - B.x) / s, dir = d >= 0 ? 1 : -1, ad = Math.abs(d);
    if (ad < 2) return this;
    var S0 = (o.stride || 0.74) * (D.thigh + D.shin), n = Math.max(2, Math.round(ad / S0) + 1), S = ad / (n - 1);
    if (dur == null) dur = n * 0.33;
    var N = Math.max(4, Math.round(dur * 60)) + 1, tr = {}, names = ['x', 'py', 'px', 'rot', 'chest', 'head', 'hat', 'bag', 'aL1', 'aL2', 'aR1', 'aR2', 'fLx', 'fRx', 'fLy', 'fRy', 'fLr', 'fRr', 'turnH', 'turnB', 'plant', 'fLx', 'tDip'];
    names.forEach(function (k) { tr[k] = new Float32Array(N); });
    var tf = dir * 0.85, endF = o.face == null ? tf : clamp(o.face, -1, 1) * 0.85, A = dir > 0 ? 'R' : 'L', Bf = dir > 0 ? 'L' : 'R';
    var ampL = Math.abs(B.aL1) < 28 && Math.abs(B.aL2) < 40 ? 1 : 0.25, ampR = Math.abs(B.aR1) < 28 && Math.abs(B.aR2) < 40 ? 1 : 0.25;
    function g(p) { return p < 1 ? 0.5 * p * p * S : p > n - 1 ? ad - 0.5 * (n - p) * (n - p) * S : (p - 0.5) * S; }
    function land(k) { return k <= 0 ? 0 : Math.min(k, n - 1) * S; }
    function foot(p, first) { // first=1: нога A (шаги 1,3,5…), 2: нога B (шаги 2,4…)
      var k = Math.floor(p), fr = p - k; if (k >= n) { k = n - 1; fr = 1; }
      var stepK = k + 1, mine = (stepK % 2 === 1) === (first === 1);
      if (!mine) { var last = stepK - 1; return [land(last), 0, 0]; }
      var from = land(stepK - 2), to = land(stepK), tau = clamp((fr - 0.06) / 0.86, 0, 1), e = EZ.io(tau), len = to - from;
      return [lerp(from, to, e), Math.sin(PI * tau) * (10 + 16 * len / (2 * S)), -Math.sin(2 * PI * tau) * 15 * len / (2 * S) - 6 * Math.sin(PI * tau)];
    }
    var hatS = 0, hatV = 0, bagS = 0, bagV = 0, prevLean = 0;
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1), p = n * (u - 0.3 * Math.sin(2 * PI * u) / (2 * PI)), gp = g(p);
      var env = smooth(Math.min(p / 0.6, (n - p) / 0.6)), tt = u * dur;
      var fa = foot(p, 1), fb = foot(p, 2);
      tr.x[i] = B.x + dir * gp * s; tr.px[i] = B.px * (1 - smooth(tt / 0.2));
      tr['f' + A + 'x'][i] = dir * (fa[0] - gp); tr['f' + A + 'y'][i] = fa[1]; tr['f' + A + 'r'][i] = dir * fa[2] * -1;
      tr['f' + Bf + 'x'][i] = dir * (fb[0] - gp); tr['f' + Bf + 'y'][i] = fb[1]; tr['f' + Bf + 'r'][i] = dir * fb[2] * -1;
      tr.py[i] = lerp(B.py, 6 + 5 * Math.cos(2 * PI * p), env) * (env > 0 ? 1 : 1);
      if (u > 0.5) tr.py[i] = (6 + 5 * Math.cos(2 * PI * p)) * env;
      var bumpIn = p < 1.3 ? Math.sin(PI * p / 1.3) : 0, bumpOut = p > n - 1.3 ? Math.sin(PI * (n - p) / 1.3) : 0;
      var lean = dir * (3.2 * env + 6.5 * bumpIn - 5.5 * bumpOut);
      tr.rot[i] = lerp(B.rot, lean, smooth(tt / 0.25)); if (u > 0.5) tr.rot[i] = lean;
      tr.chest[i] = lerp(B.chest, dir * 2 * env, smooth(tt / 0.25)); if (u > 0.5) tr.chest[i] = dir * 2 * env * 1;
      var hb = -lean * 0.55 + 1.6 * Math.sin(2 * PI * p - 1.1) * env;
      tr.head[i] = lerp(B.head, hb, smooth(tt / 0.25)); if (u > 0.5) tr.head[i] = hb * env;
      var fw = -Math.cos(PI * p) * env, fw2 = -Math.cos(PI * (p - 0.16)) * env; // +1 — нога A впереди
      var sw = 24, aA = dir * fw * sw, aA2 = dir * fw2;
      // рука со стороны ноги A идёт назад, когда нога A впереди
      var a1A = aA, a1B = -aA, bendA = -dir * (13 + 9 * -fw2) * env, bendB = -dir * (13 + 9 * fw2) * env;
      var mA = A === 'R' ? ampR : ampL, mB = A === 'R' ? ampL : ampR;
      tr['a' + A + '1'][i] = B['a' + A + '1'] * (mA < 1 ? 1 : 1 - env) + a1A * mA; tr['a' + A + '2'][i] = B['a' + A + '2'] * (mA < 1 ? 1 : 1 - env) + bendA * mA;
      tr['a' + Bf + '1'][i] = B['a' + Bf + '1'] * (mB < 1 ? 1 : 1 - env) + a1B * mB; tr['a' + Bf + '2'][i] = B['a' + Bf + '2'] * (mB < 1 ? 1 : 1 - env) + bendB * mB;
      // убор и сумка — пружины, запаздывают за качанием
      var drive = dir * -2.2 * Math.cos(2 * PI * p) * env + (lean - prevLean) * 4; prevLean = lean;
      hatV += (200 * (drive - hatS) - 9 * hatV) / 60; hatS += hatV / 60; tr.hat[i] = B.hat + hatS * smooth((dur - tt) / 0.25);
      var drb = dir * 9 * Math.cos(PI * p) * env;
      bagV += (120 * (drb - bagS) - 6 * bagV) / 60; bagS += bagV / 60; tr.bag[i] = B.bag + bagS * smooth((dur - tt) / 0.3);
      var tin = smooth(tt / 0.22), tout = smooth((dur - tt) / 0.3);
      tr.turnH[i] = tt < dur / 2 ? lerp(B.turnH, tf, tin) : lerp(endF, tf, smooth((dur - tt) / 0.34));
      tr.turnB[i] = tt < dur / 2 ? lerp(B.turnB, tf, smooth((tt - 0.06) / 0.28)) : lerp(endF, tf, smooth((dur - tt) / 0.26));
      tr.plant[i] = 1; tr.tDip[i] = 0;
    }
    delete tr.tDip;
    this._clip(tl, t, dur, tr);
    for (var k in tr) B[k] = tr[k][N - 1];
    B.x = x; B.px = 0; B.py = 0; B.rot = 0; B.chest = 0; B.head = 0; B.plant = 1; B.fLx = B.fRx = B.fLy = B.fRy = B.fLr = B.fRr = 0; B.turnH = B.turnB = endF;
    this._kick(tl, t + dur, dir * -5);
    return this;
  };

  // ───────────── пыль ─────────────
  P._dust = function (tl, t, wx, wy, k) {
    var r = this._rng(t + 31), s = KSCALE * this.B.sc, n = 5 + Math.round(k * 3);
    for (var i = 0; i < n; i++) {
      var a = (i / (n - 1) - 0.5) * 2, r0 = (10 + r() * 12) * s * (0.6 + k * 0.5), c = el('circle', { cx: r1(wx + a * 26 * s), cy: r1(wy - 6 * s), r: r1(r0), fill: i % 2 ? '#c9a06a' : '#e3c08a', stroke: 'none', opacity: 0 }, this.dustG);
      var d = 0.55 + r() * 0.35;
      tl.to(c, { opacity: 0.75, duration: 0.05, ease: 'power1.out' }, t + r() * 0.03);
      tl.to(c, { attr: { cx: r1(wx + a * (70 + r() * 60) * s * k), cy: r1(wy - (18 + r() * 44) * s * k), r: r1(r0 * (1.9 + r())) }, duration: d, ease: 'power3.out' }, t + 0.02);
      tl.to(c, { opacity: 0, duration: d * 0.7, ease: 'sine.in' }, t + 0.06 + d * 0.3);
    }
  };

  // ───────────── симулятор тела (падения, подъём) ─────────────
  // Стиль: T — длительность, keys — [t, {канал: значение}, изинг], каналы — ЛОКАЛЬНЫЕ углы суставов
  // (rot, chest, head, aL1,aL2,aR1,aR2,lL1,lL2,lR1,lR2) и «мышцы» mA/mL/mH/mC (1 — держит позу, 0 — тряпка),
  // sup (1 — ноги держат вес). Всё задано для падения ВПРАВО (dir=+1), влево — зеркалом.
  var FALLS = {
    knees: {
      T: 2.7, rest: 0.22, deadAt: 1.42, main: 1.6, keys: [
        [0.10, { chest: -6, head: -11, aL1: 26, aR1: -26, mA: 0.5, mH: 0.6 }, 'out'],
        [0.50, { lL1: -48, lL2: 96, lR1: -53, lR2: 104, rot: -7, chest: 14, mA: 0.1, mH: 0.3 }, 'in'],
        [0.74, { lL1: -24, lL2: 112, lR1: -18, lR2: 106, rot: 3, chest: 17 }, 'io'],
        [1.02, { rot: 9, chest: 22, head: 22, mH: 0.2 }, 'io'],
        [1.26, { sup: 0 }, 'io'],
        [1.48, { rot: 90, chest: 5, lL1: 38, lL2: -84, lR1: 12, lR2: -30, mL: 0.5, mC: 0.6 }, 'in'],
        [1.95, { chest: 0, lL1: 30, lL2: -70, lR1: 6, lR2: -14, mL: 0.08 }, 'io']],
      twitch: 'lL2'
    },
    back: {
      T: 2.5, rest: 0.3, deadAt: 0.6, main: 1.3, hatOff: 0.1, kicks: [[0.07, 320, -660]], keys: [
        [0.08, { chest: -12, head: -16, mA: 0.04, mH: 0.3, mL: 0.55, sup: 0 }, 'out'],
        [0.30, { chest: 12, head: 10 }, 'io'],
        [0.52, { rot: 99, lL1: 64, lL2: -26, lR1: 80, lR2: -12 }, 'out'],
        [0.70, { chest: -4, mL: 0.05 }, 'io'],
        [0.90, { rot: 90, chest: 0 }, 'io'],
        [1.40, { lL1: 6, lL2: -8, lR1: 14, lR2: -22 }, 'io']],
      twitch: 'lR2'
    },
    face: {
      T: 2.6, rest: 0.4, deadAt: 0.8, main: 1.4, hatOff: 0.7, hatKick: [260, -260], kicks: [[0.78, 0, -470]], keys: [
        [0.12, { chest: -5, head: -8, aL1: 22, aR1: -22, mA: 0.4 }, 'out'],
        [0.44, { lL1: -40, lL2: 118, lR1: -46, lR2: 124, rot: 8, chest: 10, mA: 0.25 }, 'in'],
        [0.74, { rot: 62, chest: 27, head: -18, aL1: -72, aR1: -96, aL2: -30, aR2: -24, mA: 0.45, mH: 0.5 }, 'in'],
        [0.84, { mA: 0.08, sup: 0 }, 'io'],
        [0.95, { rot: 103, chest: -2, lL1: -8, lL2: 40, lR1: -12, lR2: 46, mL: 0.4 }, 'out'],
        [1.14, { rot: 90, chest: 0, head: -8, lL1: 0, lL2: 6, lR1: 4, lR2: 10 }, 'in'],
        [1.5, { mL: 0.08, head: 0, mH: 0.2 }, 'io']],
      twitch: 'lL2'
    },
    spin: {
      T: 2.8, rest: 0.2, deadAt: 1.72, main: 1.9, spin: [0.05, 1.0, 2], dizzy: [0.9, 1.6], keys: [
        [0.10, { aL1: 40, aR1: -40, mA: 0.6, chest: -4 }, 'out'],
        [0.50, { aL1: 78, aL2: 10, aR1: -84, aR2: -10, lR1: -20, lR2: 34, head: 8, mH: 0.5 }, 'out'],
        [0.98, { aL1: 30, aR1: -25, mA: 0.12, lR1: 0, lR2: 0, rot: -5, head: -10 }, 'io'],
        [1.34, { lL1: 58, lL2: -116, lR1: -58, lR2: 116, chest: 16, rot: 5, head: 22, mH: 0.25 }, 'in'],
        [1.50, { sup: 0 }, 'io'],
        [1.80, { rot: 80, chest: 26, lL1: 44, lL2: -96, lR1: 20, lR2: -60, mL: 0.4, mC: 0.5 }, 'in'],
        [2.25, { chest: 16, mL: 0.08 }, 'io']],
      twitch: 'lR2'
    },
    sit: {
      T: 3.4, rest: 0.3, deadAt: 2.85, main: 3.0, dizzy: [0.65, 2.2], keys: [
        [0.12, { chest: -4, head: -6 }, 'out'],
        [0.20, { sup: 1 }, 'io'], [0.30, { sup: 0 }, 'io'],
        [0.46, { lL1: 72, lL2: -6, lR1: -72, lR2: 6, mL: 0.7, aL1: 30, aR1: -30, mA: 0.15, chest: 9, head: 14, mH: 0.4 }, 'in'],
        [0.72, { chest: -4, head: -7 }, 'out'], [1.02, { chest: 5, head: 6, mH: 0.5 }, 'io'],
        [1.7, { head: -9, rot: -3, chest: 6 }, 'io'], [2.15, { head: 10, rot: 4, mL: 0.3 }, 'io'],
        [2.85, { rot: 90, chest: -4, head: -6, lL1: 24, lL2: -10, lR1: -30, lR2: 20, mL: 0.2, mH: 0.25 }, 'in'],
        [3.2, { lL1: 6, lR1: -4, lL2: 0, lR2: 0, mL: 0.08, chest: 0 }, 'io']],
      twitch: 'lL2'
    },
    blast: {
      T: 3.0, rest: 0.42, deadAt: 0.86, main: 1.9, hatOff: 0.06, hatKick: [200, -700], kicks: [[0.05, 540, -1040]], keys: [
        [0.06, { chest: -14, head: -18, mA: 0.03, mL: 0.14, mH: 0.2, mC: 0.5, sup: 0 }, 'out'],
        [0.36, { chest: 16, lL1: -40, lL2: 50, lR1: 30, lR2: 20, head: 10 }, 'io'],
        [1.12, { rot: 450 }, 'io'],
        [1.6, { chest: 0, lL1: 0, lL2: 0, lR1: 6, lR2: -10, mL: 0.06 }, 'io']],
      twitch: 'lR2'
    }
  };
  var GETUP = {
    T: 2.4, rest: 0.2, init: { mA: 0.1, mL: 0.1, mH: 0.2, mC: 0.6, sup: 0 }, kicks: [[0.03, 0, -400]], getUp: true, keys: [
      [0.07, { mA: 1, mL: 1, mH: 1, mC: 1, chest: -14, head: -12, aL1: 104, aL2: 10, aR1: 84, aR2: -10, lL1: 40, lL2: -20, lR1: 56, lR2: -10 }, 'out'],
      [0.20, { chest: -10 }, 'io'],
      [0.36, { aL1: 24, aR1: 12, lL1: 4, lL2: 0, lR1: 8, lR2: 0, chest: 0, head: 0, mA: 0.5, mL: 0.6 }, 'in'],
      [0.44, { rot: 90, mH: 0.7, mA: 0.5 }, 'io'],
      [0.98, { rot: -5, chest: 9, head: 6, lL1: 97, lL2: 0, lR1: 91, lR2: 0, aL1: 34, aL2: -12, aR1: -30, aR2: 12, mL: 0.9, mA: 0.6 }, 'io'],
      [1.10, { head: 17, mH: 1 }, 'io'], [1.22, { head: -17 }, 'io'], [1.34, { head: 13 }, 'io'], [1.46, { head: -9 }, 'io'], [1.58, { head: 0, sup: 0 }, 'io'],
      [1.62, { sup: 1 }, 'io'],
      [1.84, { rot: -15, chest: -8, lL1: 76, lL2: -96, lR1: 82, lR2: -102, mL: 1, aL1: 38, aR1: 22, mA: 0.8 }, 'io'],
      [2.2, { rot: 0, chest: 0, lL1: 0, lL2: 0, lR1: 0, lR2: 0, aL1: 5, aL2: -9, aR1: -5, aR2: 9, mA: 1 }, 'back'],
      [2.4, { head: 0 }, 'io']]
  };

  function simulate(ch, st, o) {
    var D = ch.D, G0 = 3000, h = 1 / 120, T = st.T, sc = o.timeScale || 1, nS = Math.round(T * sc * 60) + 1, dir = o.dir;
    var P0 = dir < 0 ? mir(o.pose) : o.pose, r = rng(o.seed), jit = function (a) { return 1 + (r() - 0.5) * 2 * a; };
    var nar = 1 - 0.5 * Math.abs(P0.turnB), hx = D.hipX * nar, shx = D.shX * nar;
    var rot0 = P0.rot, base = 360 * Math.round(rot0 / 360);
    var X = P0.px, Y = -D.hipY + P0.py, vx = 0, vy = 0;
    var W = { pel: rot0 }, V = {}, k, i;
    W.chest = rot0 + P0.chest; W.head = W.chest + P0.head; W.aL1 = W.chest + P0.aL1; W.aL2 = W.aL1 + P0.aL2; W.aR1 = W.chest + P0.aR1; W.aR2 = W.aR1 + P0.aR2;
    W.lL1 = rot0 + P0.lL1; W.lL2 = W.lL1 + P0.lL2; W.lR1 = rot0 + P0.lR1; W.lR2 = W.lR1 + P0.lR2; W.bag = 0; W.hat = W.head + P0.hat;
    for (k in W) V[k] = 0;
    // каналы ключей
    var K0 = { rot: rot0 - base, chest: P0.chest, head: P0.head, aL1: P0.aL1, aL2: P0.aL2, aR1: P0.aR1, aR2: P0.aR2, lL1: P0.lL1, lL2: P0.lL2, lR1: P0.lR1, lR2: P0.lR2, mA: 1, mL: 1, mH: 1, mC: 1, sup: 1 };
    if (st.init) for (k in st.init) K0[k] = st.init[k];
    var CHN = {}; for (k in K0) CHN[k] = [[0, K0[k], 'io']];
    var keys = st.keys.slice();
    if (st.twitch) { // остаточное: нога дёргается и опадает
      var tw = st.twitch, lastV = K0[tw]; keys.forEach(function (q) { if (tw in q[1]) lastV = q[1][tw]; });
      var q1 = {}, q2 = {}, q0 = {}; q0.mL = 0.08; q1[tw] = lastV + (lastV < 0 ? -1 : 1) * 30; q1.mL = 0.75; q2[tw] = lastV; q2.mL = 0.06;
      keys.push([T - 0.62, q0, 'io'], [T - 0.52, q1, 'out'], [T - 0.3, q2, 'io']);
    }
    var ANG = { rot: 1, chest: 1, head: 1, aL1: 1, aL2: 1, aR1: 1, aR2: 1, lL1: 1, lL2: 1, lR1: 1, lR2: 1 };
    keys.forEach(function (q) { for (var c in q[1]) { var v = q[1][c]; if (ANG[c] && c !== 'rot' && o.jitter) v *= jit(o.jitter); CHN[c].push([q[0] * sc, v, q[2] || 'io']); } });
    var ptr = {}; for (k in CHN) ptr[k] = 0;
    function ev(c, t) {
      var a = CHN[c], p = ptr[c];
      while (p < a.length - 1 && a[p + 1][0] <= t) p++;
      ptr[c] = p;
      if (p >= a.length - 1) return a[p][1];
      var u = (t - a[p][0]) / (a[p + 1][0] - a[p][0]);
      return a[p][1] + (a[p + 1][1] - a[p][1]) * EZ[a[p + 1][2]](u);
    }
    function seg(name, par, tgtLocal, Ks, z, L, up, lim, m, pv, acc) {
      var th = W[name], om = V[name], tg = W[par] + tgtLocal, ws = Math.sqrt(Ks);
      var s = Math.sin(th * RAD), c = Math.cos(th * RAD), dx = up ? s : -s, dy = up ? -c : c;
      var gx = -acc[0], gy = G0 - acc[1];
      var ag = (dx * gy - dy * gx) / L / RAD * 0.9;
      var al = Ks * m * (tg - th) - (2 * z * ws * m + 2.6 * (1 - m)) * om + (1 - m) * ag;
      om += al * h; th += om * h;
      if (lim) { var lo = W[par] + lim[0], hi = W[par] + lim[1]; if (th < lo) { th = lo; if (om < 0) om *= -0.2; } if (th > hi) { th = hi; if (om > 0) om *= -0.2; } }
      W[name] = th; V[name] = om;
    }
    function ground(name, pv, L, rad, up) { // конец сегмента не уходит под землю: довернуть угол
      var c = (-rad - pv[1]) / L, th = W[name], tn = wrap(th), nw;
      if (!up) { if (c >= 1) return; if (c <= -1) return; if (Math.cos(tn * RAD) <= c) return; nw = (tn >= 0 ? 1 : -1) * Math.acos(c) / RAD; }
      else { c = -c; if (c <= -1) return; if (c >= 1) return; if (Math.cos(tn * RAD) >= c) return; nw = (tn >= 0 ? 1 : -1) * Math.acos(c) / RAD; }
      var dlt = wrap(nw - tn); if (dlt > 7) dlt = 7; else if (dlt < -7) dlt = -7; W[name] = th + dlt;
      if (V[name] * dlt < 0) V[name] *= -0.28; V[name] *= 0.9;
    }
    var ACCN = ['waist', 'neck', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR'], pos1 = {}, pos2 = {}, acc = {};
    ACCN.forEach(function (n) { acc[n] = [0, 0]; });
    var tracks = {}, TN = ['x', 'px', 'py', 'rot', 'chest', 'head', 'hat', 'bag', 'aL1', 'aL2', 'aL3', 'aR1', 'aR2', 'aR3', 'lL1', 'lL2', 'lL3', 'lR1', 'lR2', 'lR3', 'plant', 'live', 'sx', 'sy', 'dead', 'eyeS', 'brow', 'lid', 'ex', 'ey', 'mouth', 'hatFree', 'hatWX', 'hatWY', 'hatWR', 'hatX', 'hatY', 'jy', 'fLy', 'fRy', 'turnH', 'turnB'];
    TN.forEach(function (n) { tracks[n] = new Float32Array(nS); });
    var events = [], anchorId = -1, anchorX = 0, fwL = W.lL2 + P0.lL3, fwR = W.lR2 + P0.lR3, sq = 0, sqV = 0;
    var hatFree = P0.hatFree > 0.5, hc = null, hv = [0, 0], hphi = 0, hw = 0, hatL = D.hr + 8, hatR = 34, hatBack = null;
    var s = KSCALE * P0.sc, x0 = o.x0, y0 = o.y0;
    if (hatFree) { hphi = dir * P0.hatWR; var pvx = dir * (P0.hatWX - x0) / s, pvy = (P0.hatWY - y0) / s, q = rv(0, -hatL, hphi); hc = [pvx + q[0], pvy + q[1]]; }
    var kicks = (st.kicks || []).map(function (q) { return [q[0] * sc, q[1], q[2], false]; });
    var si = 0, steps = Math.round(T * sc / h), deadAt = (st.deadAt || 0) * sc, inContact = true, lastImp = -1;
    for (var n = 0; n <= steps; n++) {
      var t = n * h;
      for (i = 0; i < kicks.length; i++) if (!kicks[i][3] && t >= kicks[i][0]) { kicks[i][3] = true; vx += kicks[i][1] * jit(0.06); vy += kicks[i][2]; }
      var mA = ev('mA', t), mL = ev('mL', t), mH = ev('mH', t), mC = ev('mC', t), sup = ev('sup', t) > 0.5;
      W.pel = ev('rot', t) + base;
      vy += G0 * h; Y += vy * h; X += vx * h;
      var Pp = [X, Y], q = rv(0, -D.pelvisH, W.pel), waist = [X + q[0], Y + q[1]];
      seg('chest', 'pel', ev('chest', t), 420, 0.75, 70, 1, [-60, 60], mC, waist, acc.waist);
      q = rv(0, -D.chestH, W.chest); var neck = [waist[0] + q[0], waist[1] + q[1]];
      seg('head', 'chest', ev('head', t), 300, 0.5, D.nh, 1, [-52, 52], mH, neck, acc.neck);
      ground('head', neck, D.nh, D.hr, 1);
      var hcn = rv(0, -D.nh, W.head); hcn = [neck[0] + hcn[0], neck[1] + hcn[1]];
      var P2 = {};
      [['L', -1], ['R', 1]].forEach(function (sd) {
        var S = sd[0], q = rv(sd[1] * shx, -D.shY, W.chest), sh = [waist[0] + q[0], waist[1] + q[1]];
        seg('a' + S + '1', 'chest', ev('a' + S + '1', t), 260, 0.55, D.arm1, 0, null, mA, sh, acc['sh' + S]);
        ground('a' + S + '1', sh, D.arm1, 17, 0);
        var th = W['a' + S + '1'], elb = [sh[0] - D.arm1 * Math.sin(th * RAD), sh[1] + D.arm1 * Math.cos(th * RAD)];
        seg('a' + S + '2', 'a' + S + '1', ev('a' + S + '2', t), 240, 0.5, D.arm2, 0, [-150, 150], mA, elb, acc['el' + S]);
        ground('a' + S + '2', elb, D.arm2 + 6, D.handR, 0);
        P2['sh' + S] = sh; P2['el' + S] = elb;
        q = rv(sd[1] * hx, 0, W.pel); var hip = [X + q[0], Y + q[1]];
        seg('l' + S + '1', 'pel', ev('l' + S + '1', t), 480, 0.8, D.thigh, 0, [-125, 125], mL, hip, acc['hip' + S]);
        if (!sup) ground('l' + S + '1', hip, D.thigh, D.legW / 2 + 3, 0);
        th = W['l' + S + '1']; var kn = [hip[0] - D.thigh * Math.sin(th * RAD), hip[1] + D.thigh * Math.cos(th * RAD)];
        seg('l' + S + '2', 'l' + S + '1', ev('l' + S + '2', t), 420, 0.7, D.shin, 0, [-150, 150], mL, kn, acc['kn' + S]);
        if (!sup) ground('l' + S + '2', kn, D.shin, D.ankle, 0);
        th = W['l' + S + '2']; var an = [kn[0] - D.shin * Math.sin(th * RAD), kn[1] + D.shin * Math.cos(th * RAD)];
        P2['hip' + S] = hip; P2['kn' + S] = kn; P2['an' + S] = an;
      });
      P2.waist = waist; P2.neck = neck;
      // опора: что глубже всего под землёй — выталкивает тело вверх
      q = rv(0, -D.shY, W.chest); var shm = [waist[0] + q[0], waist[1] + q[1]], cr = D.tw / 2 - 5;
      var sp = [[Pp, cr - 5], [waist, cr], [shm, cr], [hcn, D.hr]];
      if (sup) sp.push([P2.knL, D.legW / 2 + 3], [P2.knR, D.legW / 2 + 3], [P2.anL, D.ankle], [P2.anR, D.ankle]);
      var pen = -1e9, pid = -1;
      for (i = 0; i < sp.length; i++) { var pe = sp[i][0][1] + sp[i][1]; if (pe > pen + (i === anchorId ? -1.5 : 1.5)) { pen = pe; pid = i; } }
      pen = -1e9; for (i = 0; i < sp.length; i++) pen = Math.max(pen, sp[i][0][1] + sp[i][1]);
      inContact = pen > -1.5;
      if (pen > 0) {
        Y -= pen;
        if (vy > 0) {
          if (vy > 300) { if (t - lastImp > 0.08) { events.push({ t: t, x: sp[pid][0][0], v: vy }); sqV -= Math.min(0.11, vy / 8000) * 30; } lastImp = t; vy = -vy * st.rest; vx *= 0.8; }
          else vy = 0;
        }
      }
      if (inContact) {
        var fr = 0.6 * G0 * h; vx = Math.abs(vx) <= fr ? 0 : vx - (vx > 0 ? fr : -fr);
        if (Math.abs(vx) < 5) { var ax = sp[pid][0][0]; if (pid === anchorId) { X += anchorX - ax; } else { anchorId = pid; anchorX = ax; } } else anchorId = -1;
      } else anchorId = -1;
      // ускорения шарниров для маятников
      var cur = { waist: waist, neck: neck, shL: P2.shL, shR: P2.shR, elL: P2.elL, elR: P2.elR, hipL: P2.hipL, hipR: P2.hipR, knL: P2.knL, knR: P2.knR };
      ACCN.forEach(function (nm) {
        if (pos2[nm]) { var a0 = (cur[nm][0] - 2 * pos1[nm][0] + pos2[nm][0]) / (h * h), a1 = (cur[nm][1] - 2 * pos1[nm][1] + pos2[nm][1]) / (h * h); acc[nm][0] = acc[nm][0] * 0.8 + clamp(a0, -7000, 7000) * 0.2; acc[nm][1] = acc[nm][1] * 0.8 + clamp(a1, -7000, 7000) * 0.2; }
        pos2[nm] = pos1[nm]; pos1[nm] = [cur[nm][0], cur[nm][1]];
      });
      // убор
      var hatLoc = 0;
      if (!hatFree) {
        V.hat += (220 * (W.head - W.hat) - 2 * 0.3 * 14.8 * V.hat) * h; W.hat += V.hat * h;
        var dl = clamp(W.hat - W.head, -26, 26); W.hat = W.head + dl; hatLoc = dl;
        if (st.hatOff != null && t >= st.hatOff * sc && !st.getUp) {
          hatFree = true; hphi = W.hat + dir * D.hatRot; q = rv(0, -hatL, hphi); hc = [hcn[0] + q[0], hcn[1] + q[1]];
          var hk = st.hatKick || [120, -520]; hv = [vx * 0.6 + hk[0] * jit(0.2), Math.min(vy, 0) * 0.5 + hk[1]]; hw = 240 * jit(0.3);
        }
      } else if (st.getUp) {
        var fa = 0.5 * T * sc, fb = 0.68 * T * sc;
        if (!hatBack) hatBack = { c: [hc[0], hc[1]], phi: hphi };
        if (t >= fa) {
          var e = EZ.io(clamp((t - fa) / (fb - fa), 0, 1)), tphi = W.head + dir * D.hatRot, p0 = hatBack.phi; p0 = tphi + wrap(p0 - tphi);
          hphi = lerp(p0, tphi, e); q = rv(0, -hatL, hphi);
          var c0 = [hatBack.c[0] - rv(0, -hatL, hatBack.phi)[0], hatBack.c[1] - rv(0, -hatL, hatBack.phi)[1]]; // стартовая точка привязки
          var pvt = [lerp(c0[0], hcn[0], e), lerp(c0[1], hcn[1], e) - 150 * Math.sin(PI * e)];
          hc = [pvt[0] + q[0], pvt[1] + q[1]];
          if (t >= fb) { hatFree = false; W.hat = W.head; V.hat = 260; }
        }
      } else {
        hv[1] += G0 * h; hc[0] += hv[0] * h; hc[1] += hv[1] * h; hphi += hw * h;
        if (hc[1] > -hatR) { hc[1] = -hatR; if (hv[1] > 160) { hv[1] = -hv[1] * 0.42; hv[0] *= 0.75; } else hv[1] = 0; var frh = 420 * h; hv[0] = Math.abs(hv[0]) <= frh ? 0 : hv[0] - (hv[0] > 0 ? frh : -frh); hw = lerp(hw, hv[0] / hatR / RAD, 0.2); }
      }
      // сжатие от удара
      sqV += (-260 * sq - 22 * sqV) * h; sq += sqV * h;
      // запись дорожек
      if (n % 2 === 0 && si < nS) {
        var o2 = {};
        o2.rot = W.pel; o2.chest = W.chest - W.pel; o2.head = W.head - W.chest; o2.hat = hatFree ? 0 : hatLoc;
        o2.aL1 = W.aL1 - W.chest; o2.aL2 = W.aL2 - W.aL1; o2.aR1 = W.aR1 - W.chest; o2.aR2 = W.aR2 - W.aR1;
        o2.lL1 = W.lL1 - W.pel; o2.lL2 = W.lL2 - W.lL1; o2.lR1 = W.lR1 - W.pel; o2.lR2 = W.lR2 - W.lR1;
        var flat = function (an, shin) { return sup && an[1] > -D.ankle - 8 ? 0 : shin; };
        fwL += (flat(P2.anL, W.lL2) - fwL) * 0.3; fwR += (flat(P2.anR, W.lR2) - fwR) * 0.3;
        o2.lL3 = fwL - W.lL2; o2.lR3 = fwR - W.lR2;
        var dec = Math.exp(-t * 7); o2.aL3 = P0.aL3 * dec; o2.aR3 = P0.aR3 * dec; o2.bag = P0.bag * dec;
        o2.px = 0; o2.py = Y + D.hipY; o2.plant = 0; o2.jy = 0; o2.fLy = 0; o2.fRy = 0;
        o2.hatX = P0.hatX * dec; o2.hatY = P0.hatY * dec; o2.turnH = P0.turnH; o2.turnB = P0.turnB;
        var sy = 1 + sq, sx = 1 / sy;
        if (st.spin) { var ph = 2 * PI * st.spin[2] * EZ.out(clamp((t - st.spin[0] * sc) / ((st.spin[1] - st.spin[0]) * sc), 0, 1)); sx *= Math.cos(ph); if (Math.abs(sx) < 0.07) sx = sx < 0 ? -0.07 : 0.07; }
        o2.sx = sx; o2.sy = sy;
        // лицо
        if (st.getUp) {
          var wk = t > 0.05 * sc; o2.dead = wk ? 0 : P0.dead; o2.live = smooth((t - T * sc + 0.5) / 0.4);
          o2.eyeS = 1 + 0.35 * (wk ? Math.exp(-(t - 0.05) * 2.4) : 0); o2.brow = wk ? Math.exp(-t * 1.5) : 0; o2.lid = t > 1.0 * sc && t < 1.5 * sc ? 0.9 : -Math.exp(-t * 2.5);
          o2.mouth = t < 0.05 * sc ? 0 : t < 0.5 * sc ? 2 : 0; o2.ex = 0; o2.ey = 0;
        } else {
          var dd = t >= deadAt; o2.dead = dd ? 1 : 0; o2.live = o.live0 * (1 - smooth(t / 0.15));
          o2.eyeS = dd ? 1 : 1 + 0.3 * smooth(t / 0.07); o2.brow = dd ? 0 : smooth(t / 0.08); o2.lid = dd ? 0 : -smooth(t / 0.07);
          o2.mouth = dd ? (t < deadAt + 0.35 ? 2 : 0) : (t < 0.04 ? P0.mouth : 1);
          o2.ex = 0; o2.ey = 0;
          if (st.dizzy && t > st.dizzy[0] * sc && !dd) { var dz = smooth((t - st.dizzy[0] * sc) / 0.2) * (1 - smooth((t - st.dizzy[1] * sc) / 0.3)); o2.ex = Math.cos(t * 9) * 0.9 * dz; o2.ey = Math.sin(t * 9) * 0.9 * dz; o2.eyeS = 1 + 0.12 * (1 - dz); o2.mouth = 2; o2.lid = 0; o2.brow = 0.5; }
        }
        if (dir < 0) o2 = mir(o2);
        for (k in o2) tracks[k][si] = o2[k];
        tracks.x[si] = x0 + dir * X * s;
        tracks.hatFree[si] = hatFree ? 1 : 0;
        if (hatFree) { q = rv(0, -hatL, hphi); tracks.hatWX[si] = x0 + dir * (hc[0] - q[0]) * s; tracks.hatWY[si] = y0 + (hc[1] - q[1]) * s; tracks.hatWR[si] = dir * hphi; }
        else if (si) { tracks.hatWX[si] = tracks.hatWX[si - 1]; tracks.hatWY[si] = tracks.hatWY[si - 1]; tracks.hatWR[si] = tracks.hatWR[si - 1]; }
        si++;
      }
    }
    for (; si < nS; si++) for (k in tracks) tracks[k][si] = tracks[k][si - 1];
    return { tracks: tracks, events: events, dur: (nS - 1) / 60, n: nS };
  }

  var STEP = { mouth: 1, hatFree: 1, dead: 1, plant: 0 };
  P._runSim = function (tl, t, st, o) {
    var B = this.B, pose = this._poseNow(), k;
    var res = simulate(this, st, { dir: o.dir, pose: pose, seed: this.seed + Math.round(t * 131) + (o.seed || 0), jitter: o.jitter, timeScale: o.timeScale, x0: B.x, y0: B.y, live0: B.live });
    var tr = res.tracks, n = res.n;
    if (st.getUp) { // в конце — точная стойка и возврат ног на «посадку»
      var nb = Math.min(n - 1, 14), tg = { py: 0, chest: 0, head: 0, aL1: 5, aL2: -9, aR1: -5, aR2: 9, lL1: 0, lL2: 0, lL3: 0, lR1: 0, lR2: 0, lR3: 0, hat: 0, sx: 1, sy: 1, bag: 0 };
      tg.rot = 360 * Math.round(tr.rot[n - 1] / 360);
      for (var i = 0; i <= nb; i++) { var u = smooth(i / nb), j = n - 1 - nb + i; for (k in tg) tr[k][j] = lerp(tr[k][j], tg[k], u); tr.plant[j] = u >= 1 ? 1 : 0; }
      tr.plant[n - 1] = 1;
    }
    this._clip(tl, t, res.dur, tr, STEP);
    for (k in tr) B[k] = tr[k][n - 1];
    B.tNod = 0;
    var s = KSCALE * B.sc, self = this;
    res.events.forEach(function (e, i) { if (i < 4) self._dust(tl, t + e.t, pose.x + o.dir * e.x * s, B.y, clamp(e.v / 900, 0.35, 1.25)); });
    this._lastSim = res;
    return res;
  };
  P.fall = function (tl, t, o) {
    o = o || {};
    var st = FALLS[o.style || 'knees']; if (!st) throw new Error('Rig: нет стиля падения ' + o.style);
    var dir = o.dir || (this._rng(t + 7)() < 0.5 ? 1 : -1);
    this._runSim(tl, t, st, { dir: dir, jitter: o.jitter == null ? 0.06 : o.jitter, seed: o.seed, timeScale: o.timeScale });
    return this;
  };
  P.getUp = function (tl, t, dur) {
    var r = wrap(this.B.rot), dir = r >= 0 ? 1 : -1;
    this._runSim(tl, t, GETUP, { dir: dir, jitter: 0, timeScale: (dur || GETUP.T) / GETUP.T });
    var B = this.B; B.live = 1; B.dead = 0; B.plant = 1; B.py = 0; B.px = 0; B.fLx = B.fRx = 0; B.eyeS = 1; B.lid = 0; B.brow = 0; B.mouth = 0;
    this._to(tl, t + (dur || GETUP.T), { eyeS: 1, lid: 0, brow: 0, live: 1, fLx: 0, fRx: 0 }, 0.2, 'sine.inOut');
    return this;
  };

  // ───────────── реквизит ─────────────
  P.hand = function (side) { return this.E['slot' + (side === 'L' ? 'L' : 'R')]; };
  P.give = function (node, side, o) { // прикрепить SVG-узел (или имя встроенного реквизита) к кисти
    o = o || {}; var slot = this.hand(side || 'R');
    if (typeof node === 'string') { var g = el('g'); g.innerHTML = PROPS[PROPID[node]] || ''; node = g; }
    if (node.namespaceURI !== NS) throw new Error('Rig.give: нужен SVG-узел (<g>, <path>…)');
    node.setAttribute('transform', 'translate(' + (o.x || 0) + ',' + (o.y == null ? 8 : o.y) + ') rotate(' + (o.rot || 0) + ') scale(' + (o.scale || 1) + ')');
    slot.appendChild(node); return node;
  };
  P.take = function (side) { var s = this.hand(side || 'R'), n = s.lastChild; if (n) s.removeChild(n); return n; };
  P.prop = function (tl, t, side, name, on) { // встроенный реквизит в руке: notebook, pencil, bowl, spoon
    var S = side === 'L' ? 'L' : 'R', v = {}; on = on !== false && name !== 'none';
    if (on) { v['k' + S] = PROPID[name]; this._to(tl, t, v, 0.02, 'power1.out'); v = {}; v['p' + S] = 1; this._to(tl, t + 0.02, v, 0.3, 'back.out(2.5)'); }
    else { v['p' + S] = 0; this._to(tl, t, v, 0.2, 'power2.in'); }
    this.B['p' + S] = on ? 1 : 0; if (on) this.B['k' + S] = PROPID[name];
    return this;
  };
  P.set = function (vars) { for (var k in vars) { this.m[k] = vars[k]; this.B[k] = vars[k]; } this.apply(); return this; }; // мгновенно, ДО таймлайна
  P.to = function (tl, t, vars, dur, ease) { this._to(tl, t, vars, dur == null ? 0.4 : dur, ease || 'power2.inOut'); for (var k in vars) this.B[k] = vars[k]; return this; };

  // отладка: мировые углы сегментов и корень (для числовой проверки плавности)
  P.debug = function () {
    var F = this._F, o = { x: this.m.x, y: this.m.y }, k;
    ['pel', 'chest', 'head', 'aL1', 'aL2', 'aR1', 'aR2', 'lL1', 'lL2', 'lR1', 'lR2'].forEach(function (n) { o[n] = Math.atan2(F[n][1], F[n][0]) / RAD; });
    o.pelX = F.pel[4]; o.pelY = F.pel[5];
    return o;
  };

  P.loop = function (tl, name, t0, t1) { return this.pose(tl, t0, name, Math.max(0.5, t1 - t0)); }; // цикличные позы: rubHands, write, eat, wave
  // публичные методы анимации возвращают ВРЕМЯ ОКОНЧАНИЯ (сек) добавленного движения
  ['idle', 'blinks', 'mouth', 'talk', 'look', 'turn', 'pose', 'flinch', 'bounce', 'jump', 'squash', 'walkTo', 'fall', 'getUp', 'prop'].forEach(function (n) {
    var f = P[n];
    P[n] = function (tl, t) { if (typeof tl === 'string') { t = arguments[2]; }
      var e0 = this._end || 0; this._end = 0;
      f.apply(this, arguments);
      var e = Math.max(this._end, t || 0); this._end = Math.max(e0, e);
      return e;
    };
  });

  window.Rig = {
    create: function (name, o) { return new Char(name, o); },
    names: Object.keys(CHARS), poses: Object.keys(POSES).concat(['cheerWeak']), falls: Object.keys(FALLS),
    fallInfo: function (s) { return { total: FALLS[s].T, main: FALLS[s].main }; },
    prop: function (name) { var g = el('g'); g.innerHTML = PROPS[PROPID[name]] || ''; return g; },
    KSCALE: KSCALE
  };
})();
