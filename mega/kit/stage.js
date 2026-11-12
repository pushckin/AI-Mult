/* stage.js — общий каркас сцены «Отряд Мега»: камера, слои, субтитры, титры, частицы, фоны, реквизит.
   Документация для авторов сцен — kit/STAGE.md. Глобальный объект: window.Stage.
   Всё детерминировано: кадр — функция времени таймлайна (tl.seek(t) в любом порядке даёт тот же кадр). */
(function () {
'use strict';
const W = 1080, H = 1920, GROUND = 1200, NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#2b1a12', sky1: '#f6d58a', sky2: '#e9a54a', sky3: '#b96a2c', hill: '#8a4a24', earth: '#5a3018',
  olive: '#6b7340', olive2: '#4f5a2e', skin: '#f2c9a0', blush: '#e58a6a', yellow: '#ffcf1a', red: '#e23b2e',
  green: '#58d36b', bunker: '#1d2a1c', paper: '#efe2bd', steel: '#77806f' };
const S = { W, H, GROUND, C, layers: {}, partStart: 0, floatAmp: 1 };
window.Stage = S;

/* ---------- утилиты ---------- */
function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
S.rng = rng;
let seedN = 1000; const nextSeed = () => (seedN += 7919);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const eOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const eOut5 = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 5);
const eInOut = (t) => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const f1 = (n) => Math.round(n * 10) / 10;
const $ = (s, r) => (r || document).querySelector(s);
function div(cls, parent, css) { const e = document.createElement('div'); if (cls) e.className = cls; if (css) e.style.cssText = css; if (parent) parent.appendChild(e); return e; }
function resolveLayer(l, def) { if (l && l.nodeType) return l; return S.layers[l || def] || S.layers.mid; }
function svg(inner, parent, cls) { const e = document.createElementNS(NS, 'svg'); e.setAttribute('width', 1); e.setAttribute('height', 1);
  if (cls) e.setAttribute('class', cls); e.innerHTML = inner; if (parent) parent.appendChild(e); return e; }
S.svg = (inner, layer) => svg(inner, resolveLayer(layer, 'mid'));
const OL = `stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const OL4 = `stroke="${C.ink}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
function outlined(html) { return `<span class="ol"><span class="ol-s" aria-hidden="true">${html}</span><span class="ol-f">${html}</span></span>`; }

/* ---------- структура страницы ---------- */
const LAYERS = [['sky', 0], ['far', .2], ['mid', 1], ['actors', 1], ['fx', 1], ['fg', 1.3]];
function build() {
  const root = $('#root'); if (!root) throw new Error('Stage: нет #root');
  let cam = $('#camera'); if (!cam) cam = div('', root); cam.id = 'camera';
  let fl = $('#float'); if (!fl) fl = div('', cam); fl.id = 'float';
  let sh = $('#shake'); if (!sh) sh = div('', fl); sh.id = 'shake';
  let world = $('#world'); if (!world) world = div('', sh); world.id = 'world';
  LAYERS.forEach(([n, d]) => { let l = $('.layer-' + n, world); if (!l) l = div('layer layer-' + n, world); if (!l.dataset.depth) l.dataset.depth = d; S.layers[n] = l; });
  let atmo = $('#atmo'); if (!atmo) { atmo = div('', root); atmo.id = 'atmo'; }
  let ov = $('#overlay'); if (!ov) { ov = div('', root); ov.id = 'overlay'; }
  ['ov-black', 'ov-flash', 'ov-fx', 'ov-titles', 'ov-caps'].forEach((id) => { if (!$('#' + id)) div('', ov).id = id; });
  let grain = $('#grain'); if (!grain) { grain = div('', root); grain.id = 'grain'; }
  S.el = { root, camera: cam, float: fl, shake: sh, world, atmo, overlay: ov, grain, black: $('#ov-black'), flash: $('#ov-flash'),
    ovfx: $('#ov-fx'), titles: $('#ov-titles'), caps: $('#ov-caps') };
  S.refreshLayers();
}
/* Доп. слой глубины: Stage.addLayer('far2', .45, 'mid') — вставить перед слоем mid */
S.addLayer = function (name, depth, before) {
  if (S.layers[name]) { S.layers[name].dataset.depth = depth; S.refreshLayers(); return S.layers[name]; }
  const l = div('layer layer-' + name); l.dataset.depth = depth;
  S.el.world.insertBefore(l, before ? S.layers[before] : null); S.layers[name] = l; S.refreshLayers(); return l;
};
S.refreshLayers = function () { S._layers = Array.from(S.el.world.querySelectorAll('.layer')).map((el) => {
  const d = +el.dataset.depth; return { el, d, dv: el.dataset.depthY != null ? +el.dataset.depthY : d + (1 - d) * .6 }; }); };
function fit() { const r = S.el.root, s = Math.min(innerWidth / W, innerHeight / H);
  r.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`; }

/* ---------- атмосфера: виньетка, пыль, зерно ---------- */
function buildAtmo() {
  const a = S.el.atmo; a.innerHTML = ''; const r = rng(77); S._motes = [];
  for (let i = 0; i < 30; i++) { const z = r(), size = 4 + z * 9; const e = div('mote', a, `width:${f1(size)}px;height:${f1(size)}px;${z > .72 ? 'filter:blur(2.5px);' : ''}`);
    S._motes.push({ e, x: r() * 1200, y: r() * 2000, vx: 6 + r() * 16, vy: -(4 + r() * 12), a: 14 + r() * 30, f: .25 + r() * .5, ph: r() * 6.28, o: .16 + z * .3 }); }
  div('', a).id = 'vignette';
  // зерно: статичная текстура с зерном, сдвигается от общего времени
  const cv = document.createElement('canvas'); cv.width = cv.height = 160; const ctx = cv.getContext('2d'), im = ctx.createImageData(160, 160), g = rng(4242);
  for (let i = 0; i < im.data.length; i += 4) { const v = 40 + g() * 215 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  ctx.putImageData(im, 0, 0); S.el.grain.style.backgroundImage = `url(${cv.toDataURL()})`;
}
function drawAtmo(g) {
  for (const m of S._motes) { const x = ((m.x + m.vx * g + Math.sin(g * m.f + m.ph) * m.a) % 1200 + 1200) % 1200 - 60, y = ((m.y + m.vy * g) % 2000 + 2000) % 2000 - 40;
    m.e.style.transform = `translate(${f1(x)}px,${f1(y)}px)`; m.e.style.opacity = f1(m.o * (.6 + .4 * Math.sin(g * m.f * 2.3 + m.ph)) * 10) / 10; }
  const k = Math.floor(g * 12), gx = (k * 73) % 320, gy = (k * 151) % 320; S.el.grain.style.backgroundPosition = `${gx}px ${gy}px`;
}

/* ---------- такт кадра: всё, что считается от времени ---------- */
S._cam = { x: 540, y: 960, scale: 1, rot: 0 };
S._fx = []; S._upd = []; S._clock = { v: 0 };
/* Процедурный эффект: draw(tt) вызывается, пока t0 ≤ t ≤ t1; hide() — один раз, когда время вышло из отрезка */
S.addFx = function (t0, t1, draw, hide) { const f = { t0, t1, draw, hide, on: false }; S._fx.push(f); return f; };
/* Своя функция на каждый кадр: fn(t, g) — t время сцены, g общее время ролика. Вместо tl.eventCallback('onUpdate') */
S.onUpdate = function (fn) { S._upd.push(fn); };
S.sync = function () {
  const tl = S.tl; if (!tl) return; const t = tl.time(), g = S.partStart + t, c = S._cam, A = S.floatAmp;
  S.el.float.style.transform = `translate(${f1(Math.sin(g * .55) * 9 * A)}px,${f1(Math.cos(g * .43) * 7 * A)}px) rotate(${(Math.sin(g * .31) * .3 * A).toFixed(3)}deg)`;
  S.el.camera.style.transform = `rotate(${c.rot.toFixed(3)}deg) scale(${c.scale.toFixed(4)})`;
  S.el.world.style.transform = `translate(${f1(540 - c.x)}px,${f1(960 - c.y)}px)`;
  for (const l of S._layers) l.el.style.transform = (l.d === 1 && l.dv === 1) ? '' : `translate(${f1((c.x - 540) * (1 - l.d))}px,${f1((c.y - 960) * (1 - l.dv))}px)`;
  drawAtmo(g);
  for (const f of S._fx) { if (t >= f.t0 && t <= f.t1) { f.draw(t - f.t0, t); f.on = true; } else if (f.on) { f.on = false; if (f.hide) f.hide(t < f.t0); } }
  for (const u of S._upd) u(t, g);
  if (S._live) liveVoices(t);
};

/* ---------- запуск ---------- */
S.init = function (o) {
  o = o || {}; build();
  const N = o.scene, T = (N != null && window.TIMING) ? window.TIMING[N] : null;
  const dur = o.duration || (T && T.duration) || +S.el.root.dataset.duration || 10;
  S.el.root.dataset.duration = dur; S.duration = dur; S.T = T;
  S.partStart = o.partStart != null ? o.partStart : (T ? T.partStart : 0);
  const tl = gsap.timeline({ paused: true }); window.__timelines = { main: tl }; S.tl = tl;
  tl.to(S._clock, { v: 1, duration: dur, ease: 'none' }, 0); // держит длину таймлайна = длине сцены
  const ec = tl.eventCallback.bind(tl); ec('onUpdate', S.sync);
  tl.eventCallback = function (type, fn) { if (type === 'onUpdate' && arguments.length > 1) { if (fn) S.onUpdate(() => fn()); return tl; } return ec.apply(null, arguments); };
  buildAtmo(); fit(); addEventListener('resize', fit);
  gsap.set('#shake', { x: 0, y: 0, rotation: 0, scale: 1 });
  ui(); S.sync();
  S._ready = Promise.all([document.fonts.load("900 64px Rubik", "Привет Aa"), document.fonts.load("400 40px 'Russo One'", "Привет Aa")])
    .catch(() => 0).then(() => document.fonts.ready).then(() => { refit(); S.sync(); const q = new URLSearchParams(location.search); if (q.has('t')) { tl.seek(+q.get('t'), false); S.sync(); } });
  return { tl, T, dur };
};
S.whenReady = () => S._ready || Promise.resolve();

/* предпросмотр в браузере: кнопка, R — заново, пробел — пауза; голоса из ../voice/ */
let ac = null;
function ui() {
  if (navigator.webdriver) return;
  const b = document.createElement('button'); b.id = 'startBtn'; b.textContent = '▶ Старт'; document.body.appendChild(b);
  const start = () => { b.style.display = 'none'; stopVoices(); if (ac) ac.close();
    ac = new AudioContext(); if (window.__sound) window.__sound(ac, ac.currentTime + .05);
    if (!S._voices && S.T) S._voices = S.T.lines.map((l) => { const a = new Audio('../voice/' + l.file); a.preload = 'auto'; return { l, a, on: false }; });
    S._live = true; S.tl.play(0); };
  b.onclick = start;
  addEventListener('keydown', (e) => { if (e.code === 'KeyR') start();
    if (e.code === 'Space' && S._live) { e.preventDefault(); if (S.tl.paused()) { S.tl.play(); ac && ac.resume(); } else { S.tl.pause(); ac && ac.suspend(); stopVoices(); } } });
}
function stopVoices() { (S._voices || []).forEach((v) => { v.a.pause(); v.on = false; }); }
function liveVoices(t) { if (!S._voices || S.tl.paused()) return;
  for (const v of S._voices) { const inside = t >= v.l.t && t < v.l.t + v.l.dur;
    if (inside && !v.on) { v.on = true; try { v.a.currentTime = Math.max(0, t - v.l.t); v.a.play().catch(() => 0); } catch (e) {} } else if (!inside && v.on && t < v.l.t) { v.on = false; v.a.pause(); } else if (!inside) v.on = false; } }

/* ---------- камера ---------- */
/* Точка мира (x,y) — в центре кадра. scale > 1 — крупнее. rot — градусы. */
S.camSet = function (o) { Object.assign(S._cam, pickCam(o)); S.sync(); };
function pickCam(o) { const r = {}; ['x', 'y', 'scale', 'rot'].forEach((k) => { if (o[k] != null) r[k] = o[k]; }); return r; }
S.cam = function (tl, t, o, dur, ease) { tl.to(S._cam, Object.assign(pickCam(o), { duration: dur == null ? 1.2 : dur, ease: ease || 'power2.inOut' }), t); return t + (dur == null ? 1.2 : dur); };
/* Вписать прямоугольник мира в кадр: Stage.cam(tl, t, Stage.fitRect(l, t, w, h), 1.2) */
S.fitRect = function (l, t, w, h, pad) { const p = pad == null ? .84 : pad; return { x: l + w / 2, y: t + h / 2, scale: Math.min(W * p / w, H * p / h) }; };
S.shake = function (tl, t, amp, dur) {
  amp = amp == null ? 10 : amp; dur = dur == null ? .35 : dur; const r = rng(nextSeed()), n = Math.max(2, Math.round(dur / .05)); let at = t;
  for (let i = 0; i < n; i++) { const k = 1 - i / n, a = r() * 6.28;
    tl.to('#shake', { x: f1(Math.cos(a) * amp * k), y: f1(Math.sin(a) * amp * k * 1.2), rotation: f1((r() - .5) * amp * .05 * k), duration: .05, ease: 'sine.inOut' }, at); at += .05; }
  tl.to('#shake', { x: 0, y: 0, rotation: 0, duration: .22, ease: 'elastic.out(1,0.5)' }, at); return at + .22;
};
S.punch = function (tl, t, amt) { amt = amt == null ? .035 : amt;
  tl.to('#shake', { scale: 1 + amt, duration: .07, ease: 'power2.out' }, t).to('#shake', { scale: 1, duration: .42, ease: 'elastic.out(1,0.45)' }, t + .07); };

/* ---------- текст: подгонка после загрузки шрифтов ---------- */
const fitList = [];
function refit() { for (const f of fitList) { const w = f.el.scrollWidth; if (w > f.max) { const fs = parseFloat(getComputedStyle(f.el).fontSize); f.el.style.fontSize = Math.floor(fs * f.max / w) + 'px';
  if (f.lh) f.el.style.lineHeight = Math.floor(fs * f.max / w * f.lh) + 'px'; } } }
function needFit(el, max, lh) { fitList.push({ el, max, lh }); }

/* ---------- субтитры ---------- */
const WHO = { ustav: ['УСТАВ', '#ffcf1a'], chaika: ['ЧАЙКА', '#8fd3ff'], ladoshka: ['ЛАДОШКА', '#ff8f80'], hohotun: ['ХОХОТУН', '#9be36f'], gvozd: ['ГВОЗДЬ', '#ffa64a'] };
const GLUE = /^(а|и|в|к|с|у|о|я|не|ни|на|по|за|от|до|из|об|во|со|ко|но|да|же|бы|ли|мы|вы|он|ты|то|это|что|как|для|без|при|над|под|про|или|так|нас|вас|кто|тот|эта|мой|уже)$/i;
function capWords(text) { // слова с приклеенными предлогами и тире
  const raw = text.trim().split(/\s+/), out = [];
  for (let i = 0; i < raw.length; i++) { let w = raw[i];
    if (/^[—–-]$/.test(w) && out.length) { out[out.length - 1] += ' ' + w; continue; }
    while (i < raw.length - 1 && GLUE.test(raw[i]) && !/^[—–-]$/.test(raw[i + 1])) { i++; w += ' ' + raw[i]; if (w.length > 12) break; }
    out.push(w); }
  return out;
}
function capChunks(text, maxLine) { // → [{lines:[..], n}] куски не длиннее двух строк
  const maxC = maxLine * 2 - 2, sents = text.match(/[^.!?…]+[.!?…]*\s*/g).map((s) => s.trim()).filter(Boolean), parts = [];
  for (const s of sents) { if (s.length <= maxC) { parts.push(s); continue; }
    let cur = ''; for (const piece of s.split(/(?<=[,;:—])\s+/)) { if (cur && (cur + ' ' + piece).length > maxC) { parts.push(cur); cur = piece; } else cur = cur ? cur + ' ' + piece : piece; }
    if (cur) parts.push(cur); }
  const chunks = []; for (const p of parts) { const last = chunks[chunks.length - 1]; if (last != null && (last + ' ' + p).length <= maxC && last.length + p.length <= maxLine * 2 - 6) chunks[chunks.length - 1] = last + ' ' + p; else chunks.push(p); }
  return chunks.map((c) => { const w = capWords(c); let best = [w.join(' ')];
    if (c.length > maxLine) { let bc = 1e9; for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
      const cost = Math.abs(a.length - b.length) + (/[.,!?:;—]$/.test(a) ? -5 : 0) + (Math.max(a.length, b.length) > maxLine + 2 ? 50 : 0); if (cost < bc) { bc = cost; best = [a, b]; } } }
    return { lines: best, n: c.length }; });
}
S.captions = function (tl, lines, o) {
  o = o || {}; const colors = o.speakerColors || {}, maxLine = o.maxLine || 21, host = S.el.caps;
  lines.forEach((ln, i) => {
    const who = WHO[ln.who] || [String(ln.who || '').toUpperCase(), '#fff'], col = colors[ln.who] || who[1];
    const cap = div('cap', host), lab = div('cap-who', cap); lab.textContent = who[0]; lab.style.background = col;
    const next = lines[i + 1], tIn = ln.t, tOut = Math.max(tIn + .4, Math.min(ln.t + ln.dur + .3, next ? next.t - .16 : 1e9));
    const chunks = capChunks(ln.text, maxLine), total = chunks.reduce((s, c) => s + c.n + 6, 0); let acc = 0;
    gsap.set(lab, { opacity: 0, y: 18, scale: .7 });
    tl.to(lab, { opacity: 1, y: 0, scale: 1, duration: .18, ease: 'back.out(2)' }, tIn);
    tl.to(lab, { opacity: 0, y: -14, duration: .13, ease: 'power2.in' }, tOut);
    const starts = chunks.map((c) => { const s = tIn + ln.dur * acc / total; acc += c.n + 6; return s; });
    chunks.forEach((c, k) => {
      const el = div('cap-text', cap); el.innerHTML = outlined(c.lines.join('<br>')); needFit(el.firstChild, 900, 74 / 64);
      const a = starts[k], z = k < chunks.length - 1 ? starts[k + 1] - .1 : tOut;
      gsap.set(el, { opacity: 0, y: 34, scale: .9, transformOrigin: '50% 60%' });
      tl.to(el, { opacity: 1, duration: .09, ease: 'power1.out' }, a);
      tl.to(el, { y: 0, scale: 1, duration: .18, ease: 'back.out(2.2)' }, a);
      tl.to(el, { opacity: 0, y: -24, duration: .13, ease: 'power2.in' }, Math.max(z, a + .22));
    });
  });
};

/* ---------- плашка, титр, счётчик, затемнение, вспышка ---------- */
S.tag = function (tl, t, text, dur, o) { o = o || {};
  const el = div('tag', S.el.titles); if (o.y != null) el.style.top = o.y + 'px'; const sp = document.createElement('span'); sp.textContent = text; el.appendChild(sp); needFit(sp, 900);
  if (o.color) sp.style.background = o.color;
  gsap.set(sp, { opacity: 0, y: -40, scale: .6, rotation: -5 });
  tl.to(sp, { opacity: 1, duration: .1, ease: 'power1.out' }, t).to(sp, { y: 0, scale: 1, rotation: -1.5, duration: .38, ease: 'back.out(2.4)' }, t);
  if (dur !== 0) tl.to(sp, { opacity: 0, y: -30, duration: .22, ease: 'power2.in' }, t + (dur || 2.5));
  return el;
};
S.title = function (tl, t, text, o) { o = o || {};
  const el = div('title', S.el.titles); el.style.top = (o.y == null ? 560 : o.y) + 'px';
  const m = div('title-main', el); m.innerHTML = outlined(String(text).replace(/\n/g, '<br>')); if (o.color) m.style.color = o.color; if (o.size) m.style.fontSize = o.size + 'px'; needFit(m.firstChild, 960);
  gsap.set(m, { opacity: 0, scale: 2.4, rotation: -4, transformOrigin: '50% 55%' });
  tl.to(m, { opacity: 1, duration: .08, ease: 'power1.out' }, t).to(m, { scale: 1, rotation: 0, duration: .5, ease: 'back.out(1.9)' }, t);
  let s = null;
  if (o.sub) { s = div('title-sub', el); s.innerHTML = outlined(o.sub); if (o.subColor) s.style.color = o.subColor; needFit(s.firstChild, 940);
    gsap.set(s, { opacity: 0, y: 40 }); tl.to(s, { opacity: 1, y: 0, duration: .32, ease: 'back.out(2)' }, t + .32); }
  if (o.dur) { tl.to(m, { opacity: 0, scale: .85, duration: .22, ease: 'power2.in' }, t + o.dur); if (s) tl.to(s, { opacity: 0, y: -20, duration: .2, ease: 'power2.in' }, t + o.dur - .05); }
  return { el, hit: t + .22 };
};
/* Счётчик: c = Stage.counter(tl, t, {label:'ШТАМПЫ', value:0, x:540, y:330}); c.set(tl, t2, 7); c.hide(tl, t3) */
S.counter = function (tl, t, o) { o = o || {};
  const digits = o.digits || 2, max = o.max || 99, el = div('counter', S.el.titles); let val = o.value || 0;
  if (o.color) el.style.borderColor = o.color;
  if (o.label) { const l = div('counter-label', el); l.textContent = o.label; if (o.color) l.style.color = o.color; }
  const dw = div('counter-digits', el), strips = [];
  for (let k = digits - 1; k >= 0; k--) { const d = div('counter-d', dw), st = div('', d), n = Math.floor(max / Math.pow(10, k)) + 1; let h = '';
    for (let i = 0; i < n; i++) h += `<span>${i % 10}</span>`; st.innerHTML = h; strips[k] = st; gsap.set(st, { y: -76 * Math.floor(val / Math.pow(10, k)) }); }
  gsap.set(el, { x: o.x == null ? 540 : o.x, y: o.y == null ? 330 : o.y, xPercent: -50, yPercent: -50, opacity: 0, scale: .5 });
  tl.to(el, { opacity: 1, scale: 1, duration: .32, ease: 'back.out(2.2)' }, t);
  return { el, set(tl2, t2, n) { for (let k = 0; k < digits; k++) { const a = Math.floor(val / Math.pow(10, k)), b = Math.floor(n / Math.pow(10, k));
        if (a !== b) tl2.to(strips[k], { y: -76 * b, duration: .34, ease: 'back.out(1.8)' }, t2 + (k ? .04 : 0)); }
      tl2.to(dw, { scale: 1.16, duration: .08, ease: 'power2.out' }, t2).to(dw, { scale: 1, duration: .3, ease: 'elastic.out(1,0.5)' }, t2 + .08); val = n; return this; },
    hide(tl2, t2) { tl2.to(el, { opacity: 0, scale: .7, duration: .2, ease: 'power2.in' }, t2); return this; } };
};
S.blackout = function (tl, t, dur) { tl.to(S.el.black, { opacity: 1, duration: dur == null ? .06 : dur, ease: 'power2.in' }, t); };
S.blackoutOff = function (tl, t, dur) { tl.to(S.el.black, { opacity: 0, duration: dur == null ? .5 : dur, ease: 'power2.out' }, t); };
S.flash = function (tl, t, o) { o = o || {};
  tl.to(S.el.flash, { opacity: o.peak == null ? .6 : o.peak, duration: .06, ease: 'power2.out' }, t).to(S.el.flash, { opacity: 0, duration: o.dur || .4, ease: 'power2.out' }, t + .06); };

//@@PART2@@
})();
