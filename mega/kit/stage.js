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

/* ====================== ЭФФЕКТЫ ====================== */
const P = (parent, css) => div('p', parent, css);
function put(e, x, y, rot, sx, sy, op) { e.style.transform = `translate(${f1(x)}px,${f1(y)}px) rotate(${f1(rot || 0)}deg) scale(${(sx == null ? 1 : sx).toFixed(3)},${(sy == null ? (sx == null ? 1 : sx) : sy).toFixed(3)})`; e.style.opacity = op == null ? 1 : (+op).toFixed(3); }
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const rr = (r, a, b) => lerp(a, b, r());
/* универсальный взрыв частиц. Всё — замкнутая формула от времени: seek в любом порядке даёт тот же кадр */
function burst(t, x, y, o) {
  const r = rng(nextSeed()), host = resolveLayer(o.layer, 'fx'), n = o.n || 10, ps = [], sz = o.size || [10, 20], sp = o.speed || [200, 600], an = o.ang || [0, 360],
    lf = o.life || [.6, 1.1], cols = o.colors || ['#fff'], g = o.g == null ? 1800 : o.g, k = o.drag || 0, asp = o.asp || 1, sc0 = o.sc0 == null ? 1 : o.sc0, sc1 = o.sc1 == null ? .6 : o.sc1, alpha = o.alpha == null ? 1 : o.alpha;
  const spw = o.spawn || [0, 0]; let maxLife = 0;
  for (let i = 0; i < n; i++) {
    const a = rr(r, an[0], an[1]) * Math.PI / 180, s = rr(r, sp[0], sp[1]), size = rr(r, sz[0], sz[1]), col = pick(r, cols), life = rr(r, lf[0], lf[1]);
    const w = size * asp, h = size, circ = o.shape === 'c';
    const e = P(host, `width:${f1(w)}px;height:${f1(h)}px;margin:${f1(-h / 2)}px 0 0 ${f1(-w / 2)}px;background:${col};border-radius:${circ ? '50%' : (o.rad == null ? 3 : o.rad) + 'px'};${o.border ? `border:${o.border}px solid ${C.ink};box-sizing:border-box;` : ''}`);
    ps.push({ e, vx: Math.cos(a) * s, vy: Math.sin(a) * s, x0: x + rr(r, -spw[0], spw[0]), y0: y + rr(r, -spw[1], spw[1]), life, rot: r() * 360, spin: rr(r, -(o.spin || 400), o.spin || 400), ph: r() * 6.28, sf: rr(r, 2, 5), delay: (o.delay || 0) * r() });
    maxLife = Math.max(maxLife, life + (o.delay || 0));
  }
  S.addFx(t, t + maxLife, (_, T) => { const tt0 = T - t;
    for (const p of ps) { const tt = tt0 - p.delay; if (tt < 0) { p.e.style.opacity = 0; continue; } const u = tt / p.life; if (u >= 1) { p.e.style.opacity = 0; continue; }
      const d = k > 0 ? (1 - Math.exp(-k * tt)) / k : tt; let px = p.x0 + p.vx * d + (o.sway ? Math.sin(tt * p.sf + p.ph) * o.sway : 0), py = p.y0 + p.vy * d + .5 * g * tt * tt;
      if (o.floor != null && py > o.floor) py = o.floor;
      const rot = o.align ? Math.atan2(p.vy + g * tt, p.vx) * 180 / Math.PI : p.rot + p.spin * tt, sc = lerp(sc0, sc1, eOut(u));
      put(p.e, px, py, rot, sc, sc, alpha * (u < .65 ? 1 : 1 - (u - .65) / .35)); } },
    () => ps.forEach((p) => { p.e.style.opacity = 0; }));
  return maxLife;
}
S.burst = (tl, t, x, y, o) => burst(t, x, y, o || {});
S.dust = function (tl, t, x, y, o) { o = o || {}; const s = o.size || 70;
  burst(t, x, y, { n: o.n || 9, shape: 'c', colors: o.colors || ['#d9b27c', '#c99a62', '#e6c28e'], size: [s * .6, s * 1.2], speed: [40, o.spread || 150], ang: [180, 360], g: -40, drag: 2.5, life: [.8, 1.4], sc0: .45, sc1: 1.7, alpha: .8, layer: o.layer, spawn: [o.spread ? o.spread * .4 : 40, 8] }); };
S.debris = function (tl, t, x, y, o) { o = o || {}; const p = o.power || 1;
  burst(t, x, y, { n: o.n || 12, colors: ['#5a3018', '#7a4524', '#3d2112', '#8a4a24'], size: [10, 26], speed: [380 * p, 950 * p], ang: [215, 325], g: 2400, life: [.9, 1.5], spin: 700, sc0: 1, sc1: .7, border: 3, floor: o.floor == null ? y + 30 : o.floor, layer: o.layer }); };
S.dirtHit = function (tl, t, x, y, o) { o = o || {}; S.dust(tl, t, x, y, { n: 6, size: 55, spread: 90 }); S.debris(tl, t, x, y, { n: 7, power: .55, floor: y + 20 }); };
S.sparks = function (tl, t, x, y, o) { o = o || {}; burst(t, x, y, { n: o.n || 12, colors: ['#fff3b0', '#ffcf1a', '#ff9a2a'], size: [5, 9], asp: 3.2, speed: [350, 900], ang: o.ang || [0, 360], g: 1500, life: [.25, .55], align: true, sc0: 1, sc1: .3, rad: 3, layer: o.layer }); };
S.confetti = function (tl, t, x, y, o) { o = o || {}; burst(t, x, y, { n: o.n || 60, colors: ['#ffcf1a', '#e23b2e', '#58d36b', '#8fd3ff', '#ff8f80', '#fff'], size: [12, 20], asp: .6, speed: [60, 500], ang: o.ang || [230, 310], g: 520, drag: 1.6, life: [2.2, 3.4], spin: 520, sway: 40, sc0: 1, sc1: .9, spawn: [o.w || 300, 20], delay: o.spread == null ? .25 : o.spread, layer: o.layer || 'fg' }); };
/* трассер: светящаяся полоска-пуля из (x1,y1) в (x2,y2) за dur (≈0.12 с) */
S.tracer = function (tl, t, x1, y1, x2, y2, o) { o = o || {}; const dur = o.dur || .14, len = o.len || 190, ang = Math.atan2(y2 - y1, x2 - x1), D = Math.hypot(x2 - x1, y2 - y1);
  const e = P(resolveLayer(o.layer, 'fx'), `width:${len}px;height:7px;margin:-3.5px 0 0 ${-len}px;border-radius:4px;transform-origin:100% 50%;background:linear-gradient(90deg,rgba(255,200,60,0),#ffcf1a 60%,#fff6d0);box-shadow:0 0 14px 3px rgba(255,190,60,.6)`);
  S.addFx(t, t + dur, (tt) => { const u = eOut(tt / dur) * .85 + tt / dur * .15, hx = x1 + Math.cos(ang) * D * u, hy = y1 + Math.sin(ang) * D * u, ln = Math.min(1, u * D / len);
    put(e, hx, hy, ang * 180 / Math.PI, ln, 1, 1); }, () => { e.style.opacity = 0; });
  if (o.hit !== false) S.sparks(tl, t + dur, x2, y2, { n: 7 }); return t + dur; };
/* бумажный листок летит по дуге. from/to = {x,y}; keep:true — остаётся на месте после приземления */
S.paperFly = function (tl, t, from, to, o) { o = o || {}; const dur = o.dur || .75, host = resolveLayer(o.layer, 'fx'), arc = o.arc == null ? 160 : o.arc, rot1 = o.rot == null ? 8 : o.rot;
  const e = P(host, `width:96px;height:126px;margin:-63px 0 0 -48px;background:${C.paper};border:4px solid ${C.ink};border-radius:5px;box-sizing:border-box;background-image:repeating-linear-gradient(180deg,transparent 0 16px,rgba(43,26,18,.45) 16px 19px);background-size:70% 80%;background-repeat:no-repeat;background-position:50% 70%`);
  S.addFx(t, o.keep ? 1e6 : t + dur, (tt) => { const u = clamp(tt / dur, 0, 1), k = eOut(u); put(e, lerp(from.x, to.x, k), lerp(from.y, to.y, k) - Math.sin(u * Math.PI) * arc, lerp(-25, rot1, k) + Math.sin(u * 13) * 22 * (1 - u), .85 + .15 * Math.abs(Math.cos(u * 9)) , 1, 1); }, () => { e.style.opacity = 0; });
  return e; };
/* штамп: хлопок с отпечатком. o: text, color, size(шрифт), rot */
S.stampMark = function (tl, t, x, y, o) { o = o || {}; const col = o.color || C.red, host = resolveLayer(o.layer, 'fx');
  const e = div('', host, `left:${x}px;top:${y}px;transform-origin:50% 50%;font:400 ${o.size || 44}px/1 'Russo One',sans-serif;color:${col};border:6px solid ${col};border-radius:12px;padding:8px 16px 6px;white-space:nowrap;margin:-30px 0 0 -90px;letter-spacing:2px;opacity:0;background:rgba(239,226,189,.18)`);
  e.textContent = o.text || 'ПОГИБ'; gsap.set(e, { opacity: 0, scale: 2.6, rotation: (o.rot == null ? -12 : o.rot) + 10 });
  tl.to(e, { opacity: .92, duration: .05, ease: 'power1.out' }, t).to(e, { scale: 1, rotation: o.rot == null ? -12 : o.rot, duration: .12, ease: 'power4.in' }, t);
  tl.to(e, { scale: 1.07, duration: .06, ease: 'power2.out' }, t + .12).to(e, { scale: 1, duration: .2, ease: 'elastic.out(1,.5)' }, t + .18);
  S.dust(tl, t + .12, x, y + 30, { n: 4, size: 36, spread: 70 }); return e; };
/* непрерывный дым от t0 до t1 из точки (x,y): o.n, o.size, o.rise, o.color */
S.smoke = function (tl, t0, t1, x, y, o) { o = o || {}; const r = rng(nextSeed()), n = o.n || 9, s = o.size || 80, rise = o.rise || 420, life = o.life || 2.6, host = resolveLayer(o.layer, 'fx'), ps = [];
  for (let i = 0; i < n; i++) ps.push({ e: P(host, `width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:50%;background:${o.color || '#4a3a34'};border:4px solid ${C.ink};box-sizing:border-box`), d: i / n * life, dx: rr(r, -40, 40), sw: rr(r, 20, 50), ph: r() * 6.28 });
  S.addFx(t0, t1 + life, (tt, T) => { const env = ss(0, .6, T - t0) * (1 - ss(t1, t1 + life * .8, T));
    for (const p of ps) { const q = (((tt - p.d) / life) % 1 + 1) % 1; const sc = .4 + 1.5 * eOut(q); put(p.e, x + p.dx + Math.sin(q * 5 + p.ph) * p.sw + q * (o.drift || 60), y - rise * eOut(q) * 1, 0, sc, sc, env * (q < .12 ? q / .12 : 1 - ss(.45, 1, q)) * (o.alpha == null ? .85 : o.alpha)); } },
    () => ps.forEach((p) => { p.e.style.opacity = 0; }));
};
/* взрыв: вспышка, огненный шар из кругов, ударное кольцо, дым, комья. o.size (1 = ≈330 px), o.shake (0 — без тряски) */
S.explosion = function (tl, t, x, y, o) { o = o || {}; const k = o.size || 1, r = rng(nextSeed()), host = resolveLayer(o.layer, 'fx');
  const ball = [], smoke = [];
  const flash = P(host, `width:360px;height:360px;margin:-180px 0 0 -180px;border-radius:50%;background:radial-gradient(circle,#fffbe0 0,#ffd75a 38%,rgba(255,150,40,0) 70%)`);
  const ring = P(host, `width:200px;height:90px;margin:-45px 0 0 -100px;border-radius:50%;border:${10 * k}px solid #ffe3a0;box-sizing:border-box`);
  for (let i = 0; i < 8; i++) { const a = r() * 6.28, d = r() * 80 * k, col = i < 3 ? C.red : i < 6 ? '#ff8a1f' : C.yellow, R = (95 + r() * 70) * k;
    ball.push({ e: P(host, `width:${f1(R * 2)}px;height:${f1(R * 2)}px;margin:${f1(-R)}px 0 0 ${f1(-R)}px;border-radius:50%;background:${col};border:6px solid ${C.ink};box-sizing:border-box`), ox: Math.cos(a) * d, oy: Math.sin(a) * d * .7 - 50 * k, dl: r() * .07, rise: 50 + r() * 70, big: .8 + r() * .5 }); }
  for (let i = 0; i < 7; i++) { const R = (70 + r() * 50) * k;
    smoke.push({ e: P(host, `width:${f1(R * 2)}px;height:${f1(R * 2)}px;margin:${f1(-R)}px 0 0 ${f1(-R)}px;border-radius:50%;background:${i % 2 ? '#4a3a34' : '#3a2c28'};border:6px solid ${C.ink};box-sizing:border-box`), ox: rr(r, -120, 120) * k, dl: .15 + r() * .35, rise: rr(r, 260, 480) * k, sw: rr(r, -50, 50) }); }
  S.addFx(t, t + 3.4, (tt) => {
    const u0 = tt / .24; if (u0 < 1) put(flash, x, y - 40 * k, 0, (.35 + 1.5 * eOut(u0)) * k, (.35 + 1.5 * eOut(u0)) * k, 1 - u0 * u0); else flash.style.opacity = 0;
    const u1 = tt / .55; if (u1 < 1) put(ring, x, y + 20 * k, 0, (.3 + 4.2 * eOut(u1)) * k, (.3 + 4.2 * eOut(u1)) * k, .85 * (1 - u1)); else ring.style.opacity = 0;
    for (const b of ball) { const u = (tt - b.dl) / 1.1; if (u < 0 || u >= 1) { b.e.style.opacity = 0; continue; } const gr = eOut5(Math.min(1, u / .4)) * b.big, sh = 1 - .35 * ss(.4, 1, u);
      put(b.e, x + b.ox, y + b.oy - b.rise * eOut(u), 0, (.15 + gr) * sh, (.15 + gr) * sh * (1 + .2 * ss(.3, 1, u)), 1 - ss(.55, 1, u)); }
    for (const s of smoke) { const u = (tt - s.dl) / 2.6; if (u < 0 || u >= 1) { s.e.style.opacity = 0; continue; } const sc = .3 + 1.1 * eOut(u);
      put(s.e, x + s.ox + s.sw * u, y - 60 * k - s.rise * eOut(u), 0, sc, sc, (u < .15 ? u / .15 : 1) * (1 - ss(.5, 1, u)) * .92); }
  }, () => { flash.style.opacity = 0; ring.style.opacity = 0; ball.concat(smoke).forEach((b) => { b.e.style.opacity = 0; }); });
  burst(t, x, y - 20 * k, { n: Math.round(12 * k) + 4, colors: ['#5a3018', '#7a4524', '#3d2112', '#8a4a24'], size: [14 * k, 34 * k], speed: [500 * k, 1100 * k], ang: [205, 335], g: 2300, life: [1, 1.6], spin: 800, sc0: 1, sc1: .8, border: 3, floor: y + 30 * k, layer: o.layer });
  burst(t, x, y - 40 * k, { n: 14, colors: ['#fff3b0', '#ffcf1a', '#ff9a2a'], size: [6, 11], asp: 3.4, speed: [500, 1300], ang: [0, 360], g: 1300, life: [.3, .7], align: true, sc0: 1, sc1: .3, rad: 3, layer: o.layer });
  S.dust(tl, t + .05, x, y + 20 * k, { n: 10, size: 90 * k, spread: 260 * k });
  if (o.shake !== 0) { S.shake(tl, t, 22 * k, .6); S.punch(tl, t, .05); S.flash(tl, t, { peak: .22, dur: .35 }); }
  return t + .24; };

/* ====================== ДВЕРИ ====================== */
let uid = 0; const U = () => 'u' + (++uid);
function slabSvg(kind, w, h) {
  if (kind === 'wood') { let pl = ''; const n = 4; for (let i = 0; i < n; i++) pl += `<rect x="${i * w / n}" y="0" width="${w / n}" height="${h}" fill="${i % 2 ? '#8a5a30' : '#7a4a26'}" ${OL4}/>`;
    return `<svg width="1" height="1" style="overflow:visible">${pl}<path d="M8,${h * .18} L${w - 8},${h * .36} M8,${h * .72} L${w - 8},${h * .54}" stroke="${C.ink}" stroke-width="16" stroke-linecap="round"/><path d="M8,${h * .18} L${w - 8},${h * .36} M8,${h * .72} L${w - 8},${h * .54}" stroke="#a8743c" stroke-width="8" stroke-linecap="round"/><circle cx="${w - 26}" cy="${h * .5}" r="11" fill="#3d2112" ${OL4}/></svg>`; }
  let riv = ''; for (let i = 0; i < 6; i++) { riv += `<circle cx="16" cy="${40 + i * (h - 80) / 5}" r="5" fill="#4f5a4a"/><circle cx="${w - 16}" cy="${40 + i * (h - 80) / 5}" r="5" fill="#4f5a4a"/>`; }
  return `<svg width="1" height="1" style="overflow:visible"><rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="${C.steel}" ${OL}/><rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="6" fill="#68725f" ${OL4}/>
  <g clip-path="inset(0)"><path d="M0,${h * .08} h${w} v34 h-${w} z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="4"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${i * w / 6 + 10},${h * .08} l24,0 l-18,34 l-24,0 z" fill="${C.ink}"/>`).join('')}</g>
  ${riv}<rect x="${w * .2}" y="${h * .2}" width="${w * .6}" height="40" rx="14" fill="#1d2a1c" ${OL4}/><rect x="${w * .24}" y="${h * .2 + 8}" width="${w * .52}" height="12" rx="6" fill="#58d36b" opacity=".5"/>
  <circle cx="${w * .5}" cy="${h * .52}" r="${Math.min(w, h) * .2}" fill="#9aa392" ${OL}/><circle cx="${w * .5}" cy="${h * .52}" r="${Math.min(w, h) * .2 - 14}" fill="none" stroke="${C.ink}" stroke-width="5"/>
  <path d="M${w * .5 - 60},${h * .52} h120 M${w * .5},${h * .52 - 60} v120 M${w * .5 - 42},${h * .52 - 42} l84,84 M${w * .5 + 42},${h * .52 - 42} l-84,84" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/><circle cx="${w * .5}" cy="${h * .52}" r="14" fill="${C.red}" ${OL4}/>
  <path d="M0,${h * .78} h${w}" stroke="${C.ink}" stroke-width="5"/><text x="${w / 2}" y="${h * .9}" text-anchor="middle" font-family="Russo One" font-size="${Math.round(w * .18)}" fill="${C.ink}" opacity=".6">№ 7</text></svg>`;
}
/* Дверь: Stage.door({x,y,w,h,kind:'steel'|'wood',layer}) — x,y: левый край и «пол» (низ) проёма. Методы open(tl,t,{dur}) и slam(tl,t) */
function makeDoor(o) {
  const w = o.w || 150, h = o.h || 560, host = resolveLayer(o.layer, 'mid'), wood = o.kind === 'wood';
  const box = div('door', host, `left:${o.x}px;top:${o.y - h}px;width:${w}px;height:${h}px`);
  const frame = svg(`<rect x="-14" y="-14" width="${w + 28}" height="${h + 14}" rx="12" fill="${wood ? '#4a2a14' : '#3f4a3b'}" ${OL}/><rect x="0" y="0" width="${w}" height="${h}" fill="#1a0f08"/>`, box); frame.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  const light = div('', box, `left:0;top:0;width:${w}px;height:${h}px;opacity:0;background:linear-gradient(90deg,#ffd27a 0,#f0a04a 55%,#b96a2c 100%)`);
  const sil = svg(`<path d="M${w * .1},${h} L${w * .25},${h * .7} L${w * .6},${h * .66} L${w * .9},${h * .78} L${w},${h} Z" fill="#8a4a24" opacity=".9"/><circle cx="${w * .6}" cy="${h * .36}" r="${w * .2}" fill="#fff1c0" opacity=".85"/>`, light);
  sil.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  const slab = div('', box, `left:0;top:0;width:${w}px;height:${h}px;transform-origin:0% 50%`); slab.innerHTML = slabSvg(o.kind, w, h); slab.firstChild.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  gsap.set(slab, { transformPerspective: 900, rotationY: 0, transformOrigin: '0% 50%' });
  const D = { el: box, slab, light, x: o.x, y: o.y, w, h, cx: o.x + w / 2,
    open(tl, t, oo) { oo = oo || {}; const d = oo.dur || .9; tl.to(light, { opacity: 1, duration: d * .6, ease: 'power2.out' }, t);
      tl.to(slab, { rotationY: -84, duration: d, ease: 'power3.inOut' }, t); return t + d; },
    slam(tl, t, oo) { oo = oo || {}; const d = oo.dur || .16; tl.to(slab, { rotationY: 0, duration: d, ease: 'power4.in' }, t); tl.to(light, { opacity: 0, duration: d, ease: 'power2.in' }, t);
      tl.to(box, { x: 5, duration: .04, ease: 'power2.out' }, t + d).to(box, { x: 0, duration: .3, ease: 'elastic.out(1,.4)' }, t + d + .04);
      S.dust(tl, t + d, o.x + w / 2, o.y - h + 20, { n: 6, size: 50, spread: 90, layer: 'fx' }); S.dust(tl, t + d, o.x + w / 2, o.y, { n: 6, size: 50, spread: 120, layer: 'fx' });
      if (oo.shake !== 0) S.shake(tl, t + d, oo.shake || 16, .45); return t + d; } };
  return D;
}
S.door = makeDoor;
S.bg = {};
const FILL = (l, t, r, b, css) => div('', null, `left:${l}px;top:${t}px;width:${r - l}px;height:${b - t}px;${css}`);
function sheet(layer, l, t, w, h, css) { const e = div('', S.layers[layer], `left:${l}px;top:${t}px;width:${w}px;height:${h}px;${css}`); return e; }
function paint(layer, inner, blur) { const e = svg(inner, S.layers[layer]); e.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; if (blur) e.classList.add(blur); return e; }
function defsGrad(id, stops, x2, y2) { return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 || 0}" y2="${y2 == null ? 1 : y2}">${stops.map((s) => `<stop offset="${s[0]}" stop-color="${s[1]}" ${s[2] != null ? `stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`; }
const rivets = (x, y, w, n, col) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${x + (n > 1 ? i * w / (n - 1) : 0)}" cy="${y}" r="4" fill="${col || '#2e3d2c'}"/>`; return s; };

/* ---------- БУНКЕР: стены x −400…1480, мир ≈ один экран. seats — x ящиков (верх сиденья y=1090) ---------- */
S.bg.bunker = function () {
  const g1 = U(), g2 = U(), g3 = U(), g4 = U(), r = rng(31);
  sheet('sky', -500, -400, 2080, 2800, 'background:linear-gradient(180deg,#0f180f 0,#1d2a1c 38%,#243524 62%,#101a10 100%)');
  // дальний план: стойки, трубы, вентиляция, тусклые мониторы
  let far = defsGrad(g1, [[0, '#0e170e'], [1, '#1a281a']]);
  far = `<defs>${far}</defs><rect x="-400" y="-100" width="2000" height="300" fill="url(#${g1})"/><rect x="-400" y="170" width="2000" height="16" fill="#0b120b"/>`;
  for (let x = -360; x < 1500; x += 300) far += `<rect x="${x}" y="180" width="46" height="1120" fill="#142014" ${OL4}/><rect x="${x + 8}" y="180" width="8" height="1120" fill="#2a3d28"/>${rivets(x + 23, 260, 0, 1)}<rect x="${x - 6}" y="560" width="58" height="24" fill="#1c2c1b" ${OL4}/>`;
  far += `<path d="M-400,250 H1600" stroke="#0b120b" stroke-width="40"/><path d="M-400,250 H1600" stroke="#2c3f2a" stroke-width="12"/><path d="M-400,330 H1600" stroke="#0b120b" stroke-width="26"/><path d="M-400,330 H1600" stroke="#223422" stroke-width="8"/>`;
  for (let x = -200; x < 1500; x += 300) far += `<rect x="${x + 80}" y="420" width="110" height="80" rx="8" fill="#0d1a0f" ${OL4}/><rect x="${x + 90}" y="430" width="90" height="58" rx="4" fill="#58d36b" opacity="${.18 + r() * .22}"/>`;
  far += `<rect x="-400" y="1180" width="2000" height="120" fill="#0c140c"/><path d="M-400,1170 H1600" stroke="${C.yellow}" stroke-width="10" stroke-dasharray="46 30" opacity=".25"/>`;
  paint('far', far, 'blur-far');
  // средний план
  let m = `<defs>${defsGrad(g2, [[0, '#2a3a28'], [1, '#18241a']])}${defsGrad(g3, [[0, '#2f2a1e'], [1, '#14100a']])}</defs>`;
  m += `<rect x="-400" y="150" width="2000" height="1060" fill="url(#${g2})"/>`;
  for (let x = -400; x < 1500; x += 180) m += `<path d="M${x},150 V1200" stroke="#0f180f" stroke-width="5" opacity=".6"/>`;
  m += `<rect x="-400" y="940" width="2000" height="270" fill="#16221a"/><path d="M-400,940 H1600" stroke="${C.ink}" stroke-width="8"/>${rivets(-380, 972, 1900, 48)}`;
  // пол
  m += `<rect x="-400" y="1200" width="2000" height="1300" fill="url(#${g3})"/><path d="M-400,1200 H1600" stroke="${C.ink}" stroke-width="8"/>`;
  for (let i = 0; i < 9; i++) { const yy = 1200 + Math.pow(i + 1, 1.7) * 14; m += `<path d="M-400,${f1(yy)} H1600" stroke="#0a0805" stroke-width="${3 + i}" opacity=".55"/>`; }
  for (let x = -400; x < 1500; x += 160) m += `<path d="M${x + 40},1200 L${(x - 540) * 1.9 + 540},2400" stroke="#0a0805" stroke-width="5" opacity=".35"/>`;
  m += `<ellipse cx="540" cy="1330" rx="480" ry="70" fill="#f3c968" opacity=".09"/>`;
  // карта на стене
  m += `<g transform="rotate(-1.2 360 600)"><rect x="104" y="368" width="520" height="470" rx="6" fill="#0d140d" opacity=".5" transform="translate(12 16)"/><rect x="100" y="360" width="520" height="470" rx="6" fill="${C.paper}" ${OL}/>
  <g fill="none" stroke="#a89a6a" stroke-width="3"><path d="M120,470 C220,430 300,520 420,470 S560,440 600,500"/><path d="M120,560 C240,520 300,620 440,560 S560,560 600,620"/><path d="M120,690 C220,650 320,740 430,690 S560,700 600,740"/></g>
  <path d="M130,780 C200,700 250,740 300,660 S380,590 450,610 S540,540 590,420" fill="none" stroke="#8a4a24" stroke-width="7" stroke-dasharray="4 14" stroke-linecap="round"/>
  <path d="M150,420 l30,-34 l30,34 z M520,720 l28,-30 l28,30 z M160,720 l24,-28 l24,28 z" fill="#8fa060" ${OL4}/>
  <circle cx="440" cy="590" r="98" fill="rgba(226,59,46,.2)" stroke="${C.red}" stroke-width="9" stroke-dasharray="26 12"/><text x="440" y="606" text-anchor="middle" font-family="Russo One" font-size="46" fill="${C.red}" stroke="${C.paper}" stroke-width="2">ЗОНА</text>
  <text x="360" y="400" text-anchor="middle" font-family="Russo One" font-size="26" fill="${C.ink}" opacity=".75">ОПЕРАЦИЯ «ТИХИЙ ВЗЛЁТ»</text>
  <circle cx="150" cy="780" r="12" fill="#58d36b" ${OL4}/><text x="172" y="788" font-family="Rubik" font-weight="700" font-size="22" fill="${C.ink}">БАЗА</text>
  <circle cx="440" cy="590" r="9" fill="${C.ink}"/><path d="M150,780 L440,590" stroke="${C.ink}" stroke-width="3" stroke-dasharray="3 8" opacity=".5"/>
  <path d="M96,356 l40,0 l-40,40 z M624,356 l-40,0 l40,40 z" fill="#e8d89c" ${OL4}/></g>`;
  // лампа с конусом
  const lamp = `<defs>${defsGrad(g4, [[0, '#ffe9a0', .55], [.6, '#ffd27a', .16], [1, '#ffcf1a', 0]])}</defs><path d="M540,-300 V240" stroke="${C.ink}" stroke-width="6"/><path d="M470,320 L610,320 L580,250 L500,250 Z" fill="#3a4a38" ${OL}/><ellipse cx="540" cy="322" rx="46" ry="12" fill="#fff3b0" ${OL4}/><circle cx="540" cy="318" r="20" fill="#fff8d0" opacity=".9"/>`;
  const cone = `<defs>${defsGrad(g4 + 'c', [[0, '#ffe9a0', .55], [.55, '#ffd27a', .18], [1, '#ffcf1a', 0]])}</defs><path d="M500,330 L580,330 L900,1250 L180,1250 Z" fill="url(#${g4}c)" style="mix-blend-mode:screen"/>`;
  m += `<g><rect x="-60" y="760" width="170" height="200" rx="8" fill="#101a10" ${OL}/><rect x="-44" y="780" width="138" height="104" rx="6" fill="${C.green}" opacity=".55" ${OL4}/><path d="M-30,806 h100 M-30,830 h70 M-30,854 h110" stroke="#0d2a12" stroke-width="7" stroke-linecap="round"/></g>`;
  paint('mid', m);
  const lampEl = paint('mid', lamp), coneEl = paint('fx', cone); lampEl.style.transformOrigin = coneEl.style.transformOrigin = '540px -300px';
  S.onUpdate((t, g) => { const a = Math.sin(g * .9) * 1.1 + Math.sin(g * 2.1) * .25; lampEl.style.transform = coneEl.style.transform = `rotate(${a.toFixed(3)}deg)`; });
  // ящики-сиденья
  const seats = [260, 430, 600, 770];
  seats.forEach((x, i) => { S.prop.crate({ x, y: 1200, w: 140, h: 112, layer: 'mid', rot: (i % 2 ? .6 : -.6) }); });
  paint('mid', `<path d="M-400,1210 C0,1260 300,1236 700,1250 S1300,1236 1600,1252" fill="none" stroke="#0a0805" stroke-width="12" opacity=".6"/>`);
  const door = makeDoor({ x: 900, y: 1200, w: 150, h: 560, layer: 'mid', kind: 'steel' });
  // передний план: размытые трубы и цепи у краёв (только вне центральной зоны)
  paint('fg', `<g opacity=".92"><path d="M-300,40 H1500" stroke="#0a0f0a" stroke-width="64"/><path d="M-300,30 H1500" stroke="#233323" stroke-width="14"/>
  <path d="M120,60 V200 M126,200 m-10,0 a10,16 0 1 0 20,0 a10,16 0 1 0 -20,0 M130,60 V230" stroke="#0a0f0a" stroke-width="7" fill="none"/>
  <path d="M-300,1700 C100,1640 300,1740 700,1690 S1300,1700 1500,1660 V2200 H-300Z" fill="#0a0f0a"/></g>`, 'blur-fg');
  return { door, seats, floor: 1200, mapX: 360, mapY: 590, lampX: 540, light: cone };
};

/* ---------- САЛОН ВЕРТОЛЁТА (разрез): пол y=1200, лавка справа (верх сиденья y≈1085), кресло пилота слева ---------- */
S.bg.heliCabin = function () {
  const gs = U(), gw = U(), c = { sc: 0, alt: 0 }, r = rng(55);
  // небо снаружи (фикс.)
  sheet('sky', -500, -400, 2080, 2800, 'background:linear-gradient(180deg,#f6d58a 0,#efb866 40%,#e9a54a 62%,#b96a2c 100%)');
  const cl = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff3d0" opacity=".85"><ellipse cx="0" cy="0" rx="120" ry="34"/><ellipse cx="-70" cy="10" rx="80" ry="28"/><ellipse cx="80" cy="12" rx="90" ry="26"/></g>`;
  let sk = `<circle cx="780" cy="1010" r="210" fill="#fff1c0" opacity=".5"/><circle cx="780" cy="1010" r="130" fill="#fff6d8"/>`;
  const skyClouds = paint('sky', ''), skyG = []; 
  skyClouds.innerHTML = sk + `<g id="${gs}"></g>`;
  const cg = skyClouds.querySelector('#' + gs); let cs = ''; for (let i = 0; i < 6; i++) cs += cl(i * 420 - 300, 130 + r() * 1500, .8 + r() * .8); cg.innerHTML = cs;
  const farGround = paint('sky', `<g id="${gw}"><path d="M-500,2300 L-500,1620 C-100,1560 300,1640 700,1590 S1300,1610 1600,1570 L1600,2300Z" fill="#a8683a" opacity=".8"/><path d="M-500,2300 L-500,1780 C-100,1730 300,1800 700,1750 S1300,1770 1600,1740 L1600,2300Z" fill="#7a6a2e" opacity=".9"/><path d="M-500,1900 h2100 M-500,2020 h2100" stroke="#5a3018" stroke-width="6" opacity=".4"/></g>`);
  // корпус
  let m = `<path d="M-100,330 C200,250 880,250 1180,330 L1180,1200 L-100,1200Z" fill="#37442a" ${OL}/><rect x="-100" y="330" width="1280" height="870" fill="#3f4d30"/>`;
  for (let x = -60; x < 1180; x += 150) m += `<path d="M${x},330 V1200" stroke="#2a351f" stroke-width="12"/><path d="M${x + 6},330 V1200" stroke="#566640" stroke-width="3"/>`;
  m += `<path d="M-100,330 H1180" stroke="${C.ink}" stroke-width="10"/><rect x="-100" y="1200" width="1280" height="26" fill="#252b1a" ${OL}/><path d="M-100,1226 C100,1300 980,1300 1180,1226 V1330 H-100Z" fill="#4f5a2e" ${OL}/><path d="M-100,1330 H1180" stroke="${C.ink}" stroke-width="8"/>`;
  m += `<rect x="-100" y="1200" width="1280" height="14" fill="#566640"/><path d="M-100,1150 H1180" stroke="#2a351f" stroke-width="8"/>`;
  m += `<path d="M30,1330 V1400 M980,1330 V1400 M-40,1405 H1130" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/><path d="M-40,1405 H1130" stroke="#566640" stroke-width="4"/>`;
  // ось винта сверху
  m += `<rect x="504" y="140" width="72" height="200" rx="14" fill="#566640" ${OL}/><rect x="520" y="100" width="40" height="60" fill="#2a351f" ${OL4}/>`;
  paint('mid', m);
  // окна с движущимся пейзажем
  const wins = []; [[110, 440], [610, 440]].forEach(([x, y]) => { const w = 340, h = 250, sid = U(), el = div('', S.layers.mid, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;border-radius:28px`);
    const gsky = U(); const s = svg(`<defs>${defsGrad(gsky, [[0, '#f6d58a'], [.7, '#efb866'], [1, '#e9a54a']])}</defs><rect width="${w}" height="${h}" fill="url(#${gsky})"/><circle cx="240" cy="${h * .62}" r="46" fill="#fff6d8"/><g class="wc"></g><g class="wh"></g><g class="wg"></g>`, el);
    s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; const P7 = 700;
    let a = ''; for (let k = 0; k < 3; k++) a += cl(k * P7 / 2 + 60, 60 + (k % 2) * 40, .5); s.querySelector('.wc').innerHTML = a.replace(/\/g>/g, '/g>');
    const poly = (f) => { let d = `M-100,${h + 200}`; for (let xx = -100; xx <= 2200; xx += 35) d += ` L${xx},${f(xx)}`; return d + ` L2200,${h + 200}Z`; };
    s.querySelector('.wh').innerHTML = `<path d="${poly((xx) => h * .66 + Math.sin(xx / P7 * 6.2832) * 22 + Math.sin(xx / P7 * 12.566 + 1) * 10)}" fill="#a05a2c" ${OL4}/>`;
    let fld = `<rect x="-100" y="${h * .8}" width="2400" height="300" fill="#7a6a2e"/>`; for (let k = -1; k < 8; k++) fld += `<path d="M${k * 350 + 40},${h * .82} h160 l60,200 h-200z" fill="${k % 2 ? '#8c8a3c' : '#6f7a36'}"/>`;
    s.querySelector('.wg').innerHTML = fld; wins.push({ s, w, h, P7 });
    div('', S.layers.mid, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:28px;background:linear-gradient(115deg,rgba(255,255,255,.28) 0,rgba(255,255,255,0) 28%,rgba(255,255,255,0) 60%,rgba(255,255,255,.12) 66%,rgba(255,255,255,0) 72%);box-shadow:inset 0 0 0 10px #252b1a,inset 0 0 0 14px #1a0f08,0 0 0 4px #1a0f08`);
  });
  S.onUpdate(() => { const sc = c.sc, al = c.alt; wins.forEach((q) => { const P7 = q.P7, md = (v) => ((v % P7) + P7) % P7;
    q.s.querySelector('.wc').setAttribute('transform', `translate(${f1(-md(sc * .35))},${f1(-al * 20)})`);
    q.s.querySelector('.wh').setAttribute('transform', `translate(${f1(-md(sc * .8))},${f1(al * 70)})`);
    q.s.querySelector('.wg').setAttribute('transform', `translate(${f1(-md(sc * 1.8))},${f1(al * 150)})`); });
    cg.setAttribute('transform', `translate(${f1(-((c.sc * .6) % 1260 + 1260) % 1260)},0)`); farGround.setAttribute('transform', `translate(0,${f1(-c.alt * 30)})`); });
  // кресло пилота, пульт, табличка, лавка
  const seat = `<g><path d="M70,1200 V1130 H260 V1200Z" fill="#2a351f" ${OL}/><path d="M80,1130 C70,1030 82,900 120,820 C150,790 200,800 200,830 C190,930 200,1030 230,1130Z" fill="#4f5a2e" ${OL}/><rect x="104" y="760" width="90" height="70" rx="26" fill="#5a6a38" ${OL}/><path d="M90,1130 H250" stroke="#8a9a5a" stroke-width="8"/><path d="M164,1150 v50" stroke="${C.ink}" stroke-width="12"/></g>`;
  const panel = `<g><path d="M300,1200 V1010 H560 V1200Z" fill="#252b1a" ${OL}/><path d="M280,1010 L580,1010 L560,760 L330,760 Z" fill="#2f3a24" ${OL}/><path d="M330,760 L560,760 L548,690 L342,690Z" fill="#1d2a1c" ${OL}/>
   ${[[380, 840], [450, 840], [520, 840]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="26" fill="#efe2bd" ${OL4}/><path d="M${x},${y} l${i % 2 ? 14 : -12},-14" stroke="${C.red}" stroke-width="5" stroke-linecap="round"/>`).join('')}
   <rect x="350" y="900" width="190" height="34" rx="6" fill="#0d2a12" ${OL4}/><rect x="358" y="908" width="${60}" height="18" fill="${C.green}" opacity=".7"/><circle cx="470" cy="917" r="7" fill="${C.red}"/><circle cx="500" cy="917" r="7" fill="${C.yellow}"/>
   <rect x="326" y="946" width="240" height="78" rx="8" fill="#d9a23a" ${OL}/><rect x="334" y="954" width="224" height="62" rx="5" fill="#f4c95a" stroke="#8a5a1a" stroke-width="3"/>
   <text x="446" y="982" text-anchor="middle" font-family="Russo One" font-size="25" fill="${C.ink}">ЧАЕВЫЕ —</text><text x="446" y="1008" text-anchor="middle" font-family="Russo One" font-size="25" fill="${C.ink}">ЭТО УВАЖЕНИЕ</text>
   <circle cx="337" cy="958" r="4" fill="#5a3a10"/><circle cx="555" cy="958" r="4" fill="#5a3a10"/><circle cx="337" cy="1012" r="4" fill="#5a3a10"/><circle cx="555" cy="1012" r="4" fill="#5a3a10"/></g>`;
  const bench = `<g><path d="M650,1200 V1100 H1070 V1200Z" fill="#2a351f" ${OL}/><rect x="650" y="1080" width="420" height="40" rx="14" fill="#6b7340" ${OL}/><path d="M650,1080 C650,1030 660,1010 700,1000 H1070 V1080Z" fill="#4f5a2e" ${OL} opacity="0"/><path d="M700,1150 h320" stroke="#1a0f08" stroke-width="5" opacity=".5"/><path d="M680,1160 V1200 M1040,1160 V1200" stroke="${C.ink}" stroke-width="10"/></g>`;
  paint('mid', seat + panel + bench);
  // винт сверху (зона y<230 — только фон)
  const rot = paint('fx', `<g id="rt"><ellipse cx="540" cy="170" rx="700" ry="30" fill="#2b1a12" opacity=".0" class="rs"/><path class="rb" d="" stroke="#2b1a12" stroke-width="22" stroke-linecap="round" opacity=".5"/></g>`);
  S.onUpdate((t, g) => { const a = g * 2 * Math.PI * 7, x = Math.cos(a) * 640; rot.querySelector('.rb').setAttribute('d', `M${540 - x},${170 - Math.sin(a) * 18} L${540 + x},${170 + Math.sin(a) * 18}`); rot.querySelector('.rs').setAttribute('opacity', .16 + .06 * Math.sin(g * 9)); });
  // вибрация салона и пол
  const nodes = [S.layers.mid, S.layers.actors]; 
  S.onUpdate((t, g) => { const v = c.vib == null ? 1 : c.vib; nodes.forEach((n, i) => { n.dataset.vib = 1; n.style.translate = `${f1(Math.sin(g * 47) * .8 * v)}px ${f1(Math.sin(g * 39 + 1) * 1.4 * v)}px`; }); });
  const cab = { floor: 1200, benchX: [700, 1020], benchY: 1085, seatX: 165,
    /* окна: движение пейзажа. speed — условных px/с */
    scroll(tl, t0, t1, speed) { const sp = speed || 600; c.tot = (c.tot || 0) + sp * (t1 - t0); tl.to(c, { sc: c.tot, duration: t1 - t0, ease: 'sine.inOut' }, t0); return t1; },
    /* высота: h 0 (земля рядом) … 1 (высоко). */
    altitude(tl, t, h, dur) { tl.to(c, { alt: h, duration: dur == null ? 2 : dur, ease: 'power2.inOut' }, t); return t + (dur == null ? 2 : dur); },
    vibe(tl, t, v, dur) { tl.to(c, { vib: v, duration: dur == null ? .5 : dur, ease: 'power2.out' }, t); } };
  c.vib = 1; return cab;
};

/* ---------- ПОЛЕ: закат, мир x 0…3400 (дефолтный кадр 0…1080), земля y=1200 ---------- */
function daisyAt(x, y, s, r) { const pe = []; for (let i = 0; i < 8; i++) { const a = i * 45; pe.push(`<ellipse cx="0" cy="-${12 * s}" rx="${5 * s}" ry="${11 * s}" transform="rotate(${a})" fill="#fff3d6" stroke="${C.ink}" stroke-width="2"/>`); }
  return `<g transform="translate(${f1(x)} ${f1(y)})"><path d="M0,0 Q${f1((r() - .5) * 10 * s)},-${22 * s} 0,-${40 * s}" stroke="#3d5a22" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/><g transform="translate(0 -${42 * s})">${pe.join('')}<circle r="${6 * s}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="2"/></g></g>`; }
function grassTuft(x, y, s, col, r) { let d = ''; for (let i = 0; i < 5; i++) { const a = (i - 2) * 9 + (r() - .5) * 6, h = (28 + r() * 22) * s; d += `M${f1(x)},${f1(y)} q${f1(a * .5)},${f1(-h * .6)} ${f1(a)},${f1(-h)} `; } return `<path d="${d}" stroke="${col}" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>`; }
S.bg.field = function (o) {
  o = o || {}; const W2 = o.width || 3400, r = rng(91), g1 = U(), g2 = U(), g3 = U(); S.addLayer('far2', .5, 'mid');
  sheet('sky', -500, -400, 2080, 2800, 'background:linear-gradient(180deg,#f6d58a 0,#f1c070 34%,#e9a54a 52%,#d8873a 62%,#b96a2c 78%,#8a4a24 100%)');
  paint('sky', `<defs><radialGradient id="${g1}"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffe29a" stop-opacity=".5"/><stop offset="1" stop-color="#ffcf1a" stop-opacity="0"/></radialGradient></defs><circle cx="640" cy="1010" r="520" fill="url(#${g1})"/><circle cx="640" cy="1010" r="150" fill="#fff6d8"/>
  <g fill="#fff0c8" opacity=".55"><ellipse cx="200" cy="520" rx="220" ry="26"/><ellipse cx="330" cy="552" rx="150" ry="20"/><ellipse cx="860" cy="380" rx="260" ry="28"/><ellipse cx="960" cy="412" rx="170" ry="20"/><ellipse cx="500" cy="760" rx="300" ry="22"/></g>`);
  // дальний план (d .2): холмы + дым «зоны»
  let far = `<path d="M-500,1210 L-500,1000 C-250,930 -20,990 220,950 S620,900 900,960 S1400,930 1800,1000 V1210Z" fill="#c98a4a" opacity=".75"/><path d="M-500,1210 L-500,1060 C-200,1010 100,1070 420,1030 S900,1000 1200,1050 S1600,1030 1800,1070 V1210Z" fill="#b9733a" opacity=".85"/>`;
  far += `<g opacity=".7"><path d="M860,1040 C850,900 880,820 850,700 C830,610 880,560 900,500" stroke="#6b3a22" stroke-width="46" stroke-linecap="round" fill="none"/><ellipse cx="900" cy="470" rx="110" ry="46" fill="#6b3a22"/><ellipse cx="960" cy="420" rx="90" ry="38" fill="#7a4524"/><ellipse cx="840" cy="440" rx="80" ry="34" fill="#7a4524"/></g>`;
  far += `<path d="M300,1040 l16,-60 l16,60 M420,1030 l12,-44 l12,44" fill="#7a4524"/><path d="M1180,1030 V930 h40 v100" fill="#8a4a24" opacity=".7"/>`;
  paint('far', far, 'blur-far');
  // средние холмы (d .5): шире, теплее
  let f2 = `<path d="M-600,1215 L-600,1070 C-300,1010 0,1100 300,1060 S800,1010 1100,1075 S1700,1020 2100,1090 S2600,1050 2900,1100 V1215Z" fill="${C.hill}"/><path d="M-600,1215 L-600,1130 C-200,1090 200,1150 600,1120 S1300,1090 1700,1140 S2400,1110 2900,1150 V1215Z" fill="#74401f"/>`;
  for (let i = 0; i < 26; i++) f2 += grassTuft(-500 + i * 130 + r() * 50, 1140 + r() * 60, 1.1, '#5d3418', r);
  for (let i = 0; i < 9; i++) { const x = -400 + i * 330 + r() * 120; f2 += `<g transform="translate(${f1(x)} 1136)"><rect x="-4" y="-30" width="8" height="30" fill="#3d2112"/><ellipse cx="0" cy="-60" rx="${24 + r() * 14}" ry="${34 + r() * 14}" fill="#55602c" ${OL4}/></g>`; }
  paint('far2', f2);
  // земля
  let m = `<defs>${defsGrad(g2, [[0, '#8a8a38'], [.12, '#7a7430'], [.5, '#6a5426'], [1, '#4a2814']])}</defs><path d="M-400,1220 L-400,1196 C100,1186 500,1204 900,1192 S1700,1204 2200,1190 S3000,1202 ${W2 + 400},1194 V2500 H-400Z" fill="url(#${g2})"/><path d="M-400,1196 C100,1186 500,1204 900,1192 S1700,1204 2200,1190 S3000,1202 ${W2 + 400},1194" stroke="${C.ink}" stroke-width="7" fill="none"/>`;
  m += `<path d="M-400,1480 C300,1380 900,1420 1500,1330 S2800,1330 ${W2 + 400},1260 L${W2 + 400},1420 C2800,1500 1900,1450 1400,1520 S300,1560 -400,1640Z" fill="#8a6a34" opacity=".55"/>`;
  m += `<g fill="#3d2112" opacity=".28">${Array.from({ length: 40 }, () => { const x = r() * W2, y = 1250 + r() * 600; return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${20 + r() * 40}" ry="${5 + r() * 10}"/>`; }).join('')}</g>`;
  for (let i = 0; i < 120; i++) { const y = 1215 + Math.pow(r(), 1.5) * 520, s = .6 + (y - 1200) / 380; m += grassTuft(r() * W2, y, s * .9, r() > .5 ? '#5f6a2a' : '#7c8a38', r); }
  for (let i = 0; i < 70; i++) { const y = 1230 + Math.pow(r(), 1.3) * 470, s = .7 + (y - 1200) / 260; m += daisyAt(r() * W2, y, s, r); }
  paint('mid', m);
  // передний план: размытые стебли у нижнего края (только y>1560)
  let fg = ''; for (let i = 0; i < 40; i++) { const x = (r() * (W2 + 400)) - 200, y = 1960; fg += `<path d="M${f1(x)},${y} q${f1((r() - .5) * 40)},-120 ${f1((r() - .5) * 60)},-${180 + r() * 160}" stroke="#2c3a14" stroke-width="${9 + r() * 7}" fill="none" stroke-linecap="round"/>`; }
  for (let i = 0; i < 9; i++) fg += daisyAt(r() * (W2 + 300) - 150, 1900, 3.2, r);
  paint('fg', fg, 'blur-fg');
  return { width: W2, floor: 1200, zoneSmokeX: 880 };
};

/* ---------- ЗОНА: руины, мешки, воронки, холм; сарай с дверью справа. мир x 0…2600, земля y=1200 ---------- */
S.bg.zone = function (o) {
  o = o || {}; const W2 = o.width || 2600, r = rng(131), g1 = U(), g2 = U(); S.addLayer('far2', .5, 'mid');
  sheet('sky', -500, -400, 2080, 2800, 'background:linear-gradient(180deg,#c98a54 0,#d79a58 30%,#e0a050 50%,#c07a38 66%,#8a4a24 100%)');
  paint('sky', `<defs><radialGradient id="${g1}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".8"/><stop offset="1" stop-color="#ffcf1a" stop-opacity="0"/></radialGradient></defs><circle cx="820" cy="980" r="440" fill="url(#${g1})"/><circle cx="820" cy="1000" r="110" fill="#ffe9b0" opacity=".9"/>
  <g fill="#7a4a30" opacity=".35"><ellipse cx="250" cy="420" rx="330" ry="44"/><ellipse cx="900" cy="300" rx="380" ry="50"/><ellipse cx="500" cy="690" rx="360" ry="34"/></g>`);
  let far = `<path d="M-500,1210 L-500,980 C-200,930 100,1000 400,960 S900,920 1300,990 S1700,950 1900,1000 V1210Z" fill="#a8683a" opacity=".8"/>`;
  [[200, 1000, .9], [980, 990, 1.2], [1500, 1000, .8]].forEach(([x, y, s]) => { far += `<g opacity=".75" transform="translate(${x} ${y}) scale(${s})"><path d="M0,0 C-14,-120 30,-200 -4,-320 C-24,-400 30,-450 40,-520" stroke="#3d2a22" stroke-width="40" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="-540" rx="110" ry="46" fill="#3d2a22"/><ellipse cx="-30" cy="-500" rx="80" ry="36" fill="#4a342a"/></g>`; });
  far += `<path d="M400,1000 V900 h24 v-40 h30 v60 h30 v80 Z M1280,990 V890 h40 v-50 h22 v120Z" fill="#6b3a22" opacity=".8"/>`;
  paint('far', far, 'blur-far');
  let f2 = `<path d="M-600,1215 L-600,1060 C-300,1030 0,1090 300,1060 S800,1020 1100,1060 S1700,1030 2200,1090 S2700,1060 3000,1100 V1215Z" fill="#7a4524"/>`;
  f2 += `<path d="M200,1100 V980 h60 v-40 h50 v70 h40 v90Z M700,1090 V1000 h90 V930 h40 v90 h50 v70Z M1500,1100 V960 h120 v50 h60 v90Z" fill="#4a2a1a" ${OL4}/>`;
  f2 += `<path d="M260,980 l20,-40 M740,1000 l10,-34" stroke="#2b1a12" stroke-width="5"/><rect x="214" y="1000" width="22" height="26" fill="#1a0f08"/><rect x="740" y="1030" width="22" height="26" fill="#1a0f08"/><rect x="1530" y="1000" width="22" height="26" fill="#1a0f08"/>`;
  paint('far2', f2);
  // земля с воронками
  let m = `<defs>${defsGrad(g2, [[0, '#7a5a2c'], [.25, '#6a4622'], [1, '#3d2112']])}</defs><path d="M-400,1200 C200,1190 700,1206 1200,1192 S2200,1204 ${W2 + 400},1196 V2500 H-400Z" fill="url(#${g2})"/><path d="M-400,1200 C200,1190 700,1206 1200,1192 S2200,1204 ${W2 + 400},1196" stroke="${C.ink}" stroke-width="7" fill="none"/>`;
  // холм слева
  m += `<path d="M-300,1200 C-100,1080 200,980 420,990 C640,1000 760,1120 860,1200Z" fill="#8a5a2a" ${OL}/><path d="M-80,1170 C60,1090 230,1040 380,1046" stroke="#a8743c" stroke-width="10" fill="none" stroke-linecap="round" opacity=".6"/>`;
  [[1130, 1290, 150], [1700, 1380, 200], [2150, 1330, 120]].forEach(([x, y, rx]) => { m += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * .2}" fill="#2b1a12" ${OL4}/><ellipse cx="${x}" cy="${y + 8}" rx="${rx * .82}" ry="${rx * .13}" fill="#1a0f08"/><path d="M${x - rx - 10},${y - 4} q-18,-20 -4,-34 M${x + rx + 8},${y - 6} q22,-18 8,-34" stroke="#5a3018" stroke-width="12" fill="none" stroke-linecap="round"/>`; });
  // руины и мешки
  m += `<path d="M880,1200 V1040 h60 v40 h50 v-70 h40 V1200Z" fill="#6b4a32" ${OL}/><path d="M900,1100 h30 M960,1050 h20 M920,1160 h60" stroke="#3d2112" stroke-width="5"/><path d="M890,1040 l20,-20 l10,20" fill="#6b4a32" ${OL4}/>`;
  const bag = (x, y, w) => `<path d="M${x},${y} q-6,-34 ${w * .5},-38 q${w * .5},4 ${w * .5},38 z" fill="#b8a468" ${OL4}/><path d="M${x + w * .2},${y - 30} q${w * .3},8 ${w * .6},0" stroke="#7a6a38" stroke-width="3" fill="none"/>`;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row * 2; i++) m += bag(1250 + i * 78 + row * 40, 1200 - row * 36, 80);
  for (let i = 0; i < 5; i++) m += bag(540 + i * 74, 1200, 76) + (i < 3 ? bag(576 + i * 74, 1166, 76) : '');
  m += `<path d="M1500,1200 l50,-130 l16,4 l-40,130Z M1580,1200 l20,-90 l20,4 l-10,86Z" fill="#4a2a1a" ${OL4}/><path d="M1450,1200 l-20,-60 M1470,1200 l30,-40" stroke="#2b1a12" stroke-width="8" stroke-linecap="round"/>`;
  // колючка на земле, бочка, дым
  m += `<path d="M1000,1230 q20,-28 40,0 t40,0 t40,0 t40,0" stroke="#2b1a12" stroke-width="5" fill="none"/>`;
  m += `<g transform="translate(1180 1215)"><ellipse cx="0" cy="0" rx="48" ry="12" fill="#2b1a12" opacity=".4"/><rect x="-40" y="-92" width="80" height="92" rx="8" fill="#6b7340" ${OL4}/><path d="M-40,-60 h80 M-40,-30 h80" stroke="${C.ink}" stroke-width="4"/></g>`;
  for (let i = 0; i < 60; i++) { const x = r() * W2, y = 1220 + r() * 480; m += `<path d="M${f1(x)},${f1(y)} l${6 + r() * 14},-${3 + r() * 8} l${3 + r() * 8},${3 + r() * 6}z" fill="#3d2112" opacity=".55"/>`; }
  paint('mid', m);
  // сарай справа
  const sx = W2 - 700; let sh = `<path d="M${sx - 40},1200 V820 L${sx + 270},720 L${sx + 580},820 V1200Z" fill="#6b4a2a" ${OL}/>`;
  for (let i = 0; i < 8; i++) sh += `<path d="M${sx - 40 + i * 77},820 V1200" stroke="#3d2112" stroke-width="5" opacity=".6"/>`;
  sh += `<path d="M${sx - 70},830 L${sx + 270},700 L${sx + 610},830 L${sx + 590},850 L${sx + 270},740 L${sx - 50},850Z" fill="#3d2112" ${OL}/><rect x="${sx + 40}" y="930" width="130" height="110" fill="#1a0f08" ${OL4}/><path d="M${sx + 40},985 h130 M${sx + 105},930 v110" stroke="#6b4a2a" stroke-width="8"/>`;
  sh += `<path d="M${sx + 200},1200 l30,-60 M${sx + 490},1200 l20,-90" stroke="#3d2112" stroke-width="10" opacity=".5"/>`;
  paint('mid', sh);
  const door = makeDoor({ x: sx + 310, y: 1200, w: 190, h: 400, layer: 'mid', kind: 'wood' });
  let fg = ''; for (let i = 0; i < 16; i++) fg += `<path d="M${f1(r() * (W2 + 300) - 150)},1990 l${f1(r() * 50 - 25)},-${200 + r() * 200}" stroke="#1a0f08" stroke-width="${14 + r() * 14}" stroke-linecap="round"/>`;
  fg += `<path d="M-200,1830 C300,1770 800,1850 1300,1790 S2200,1800 ${W2 + 300},1770 V2100 H-200Z" fill="#1a0f08"/>`;
  paint('fg', fg, 'blur-fg');
  S.smoke(S.tl, 0, 1e5, 1460, 1090, { n: 7, size: 90, rise: 500, layer: 'far2', alpha: .55 });
  return { width: W2, floor: 1200, door, shedX: sx, hillX: 420, craters: [1130, 1700, 2150] };
};

/* ====================== РЕКВИЗИТ ====================== */
/* Stage.prop.NAME({x,y,s,rot,flip,layer}) → SVG-узел. Точка (0,0) рисунка = x,y в мире. Двигать: tl.to(el,{x,y,rotation}). */
function mk(inner, o, defLayer) { o = o || {}; const e = svg(inner, resolveLayer(o.layer, defLayer || 'actors'), 'prop'); e.style.overflow = 'visible'; const s = o.s == null ? 1 : o.s;
  gsap.set(e, { x: o.x || 0, y: o.y || 0, scaleX: (o.flip ? -1 : 1) * s, scaleY: s, rotation: o.rot || 0, transformOrigin: '0px 0px' }); return e; }
const crateSvg = (w, h) => `<ellipse cx="0" cy="2" rx="${w * .6}" ry="9" fill="#000" opacity=".28"/><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="6" fill="#9a6a38" ${OL}/><path d="M${-w / 2 + 10},${-h + 10} h${w - 20} M${-w / 2 + 10},${-10} h${w - 20}" stroke="#6a4422" stroke-width="12" stroke-linecap="round"/><path d="M${-w / 2 + 14},${-14} L${w / 2 - 14},${-h + 14} M${-w / 2 + 14},${-h + 14} L${w / 2 - 14},${-14}" stroke="#6a4422" stroke-width="10"/><path d="M${-w / 2},${-h / 2} h${w}" stroke="${C.ink}" stroke-width="3" opacity=".5"/><rect x="${-w / 2 + 6}" y="${-h + 6}" width="${w - 12}" height="${h - 12}" rx="4" fill="none" stroke="${C.ink}" stroke-width="3" opacity=".35"/>`;
const PR = S.prop = {};
PR.crate = (o) => { o = o || {}; return mk(crateSvg(o.w || 140, o.h || 112), o, 'mid'); };
PR.daisy = (o) => { const r = rng(7); return mk(daisyAt(0, 0, o && o.big ? 1.6 : 1.1, r), o); };
PR.butterfly = (o) => { const e = mk(`<g class="bf"><g class="wl"><path d="M0,0 C-30,-34 -58,-26 -52,-4 C-48,14 -20,16 0,2Z" fill="${C.yellow}" ${OL4}/><circle cx="-34" cy="-8" r="5" fill="${C.red}"/></g><g class="wr"><path d="M0,0 C30,-34 58,-26 52,-4 C48,14 20,16 0,2Z" fill="${C.yellow}" ${OL4}/><circle cx="34" cy="-8" r="5" fill="${C.red}"/></g><ellipse cx="0" cy="0" rx="5" ry="16" fill="${C.ink}"/><path d="M0,-14 q-8,-14 -14,-16 M0,-14 q8,-14 14,-16" stroke="${C.ink}" stroke-width="3" fill="none"/></g>`, o);
  const wl = e.querySelector('.wl'), wr = e.querySelector('.wr'); S.onUpdate((t, g) => { const k = Math.abs(Math.cos(g * 9)) * .85 + .15; wl.setAttribute('transform', `scale(${k.toFixed(3)} 1)`); wr.setAttribute('transform', `scale(${k.toFixed(3)} 1)`); }); return e; };
PR.bowl = (o) => mk(`<ellipse cx="0" cy="4" rx="58" ry="9" fill="#000" opacity=".25"/><path d="M-60,-48 C-60,-6 -34,0 0,0 S60,-6 60,-48Z" fill="#c8c0a8" ${OL}/><ellipse cx="0" cy="-48" rx="60" ry="14" fill="#efe2bd" ${OL4}/>${[[-30, -52], [-6, -56], [22, -52], [-16, -46], [38, -50], [8, -47]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="8" fill="${i % 2 ? '#e0a040' : '#f2c970'}" stroke="${C.ink}" stroke-width="3"/>`).join('')}<path d="M14,-60 L62,-96" stroke="${C.ink}" stroke-width="13" stroke-linecap="round"/><path d="M14,-60 L62,-96" stroke="#d8d8d0" stroke-width="6" stroke-linecap="round"/><ellipse cx="10" cy="-58" rx="13" ry="8" fill="#d8d8d0" ${OL4} transform="rotate(-30 10 -58)"/>`, o);
PR.form = (o) => { o = o || {}; return mk(`<rect x="-150" y="-205" width="300" height="410" rx="6" fill="#000" opacity=".2" transform="translate(8 10)"/><rect x="-150" y="-205" width="300" height="410" rx="6" fill="${C.paper}" ${OL}/><text x="0" y="-150" text-anchor="middle" font-family="Russo One" font-size="30" fill="${C.ink}">ПОХОРОНКА</text><path d="M-120,-132 h240" stroke="${C.ink}" stroke-width="4"/>
  <text x="-120" y="-80" font-family="Rubik" font-weight="900" font-size="31" fill="${C.ink}">ПОГИБ ГЕРОЙСКИ.</text><text x="-120" y="-20" font-family="Rubik" font-weight="700" font-size="27" fill="${C.ink}">Причина:</text><path d="M-8,-18 h128" stroke="${C.ink}" stroke-width="3"/>
  <path d="M-120,40 h240 M-120,80 h240 M-120,120 h170" stroke="#8a7a50" stroke-width="3"/><text x="-120" y="170" font-family="Rubik" font-weight="700" font-size="20" fill="${C.ink}" opacity=".7">Подпись: ________</text>${o.signed ? `<path d="M0,150 q20,-30 36,0 t40,-10" stroke="#2a4a9a" stroke-width="4" fill="none"/>` : ''}`, o); };
PR.card = (o) => { const e = mk(`<rect x="-130" y="-90" width="260" height="180" rx="10" fill="#000" opacity=".2" transform="translate(6 8)"/><rect x="-130" y="-90" width="260" height="180" rx="10" fill="#f3e6c4" ${OL}/><rect x="-116" y="-76" width="62" height="76" rx="6" fill="${C.skin}" ${OL4}/><circle cx="-85" cy="-48" r="14" fill="#f2c9a0" ${OL4}/><text x="-40" y="-52" font-family="Russo One" font-size="22" fill="${C.ink}">КЛИЕНТ №</text><path d="M-40,-30 h150 M-116,16 h226 M-116,40 h226" stroke="#8a7a50" stroke-width="3"/><g class="stp"></g>`, o);
  const g = e.querySelector('.stp'); g.innerHTML = [[60, 62, C.red], [-30, 70, '#2a6ad0'], [-84, 66, C.green]].map(([x, y, c], i) => `<g class="s${i}" opacity="0"><circle cx="${x}" cy="${y}" r="22" fill="none" stroke="${c}" stroke-width="5"/><path d="M${x - 11},${y} l8,8 l14,-16" stroke="${c}" stroke-width="5" fill="none"/></g>`).join('');
  e.stamp = (tl, t, i) => { const s = e.querySelector('.s' + (i || 0)); tl.set(s, { opacity: 1 }, t); tl.fromTo(s, { scale: 2, transformOrigin: 'center' }, { scale: 1, duration: .1, ease: 'power4.in', svgOrigin: [60, -30, 70][i || 0] + ' ' + [62, 70, 66][i || 0] }, t); return e; }; return e; };
PR.notebook = (o) => mk(`<rect x="-80" y="-105" width="170" height="220" rx="8" fill="#000" opacity=".2" transform="translate(6 8)"/><rect x="-80" y="-110" width="170" height="220" rx="8" fill="#6b3a22" ${OL}/><rect x="-66" y="-96" width="146" height="192" rx="4" fill="${C.paper}" ${OL4}/>${Array.from({ length: 6 }, (_, i) => `<circle cx="-80" cy="${-86 + i * 34}" r="7" fill="#9aa392" ${OL4}/>`).join('')}<text x="-4" y="-66" text-anchor="middle" font-family="Russo One" font-size="17" fill="${C.red}">ПОТЕРИ</text>${Array.from({ length: 5 }, (_, i) => `<path d="M-48,${-40 + i * 28} h100" stroke="#8a7a50" stroke-width="3"/><path d="M${30 + i * 4},${-48 + i * 28} l10,10 m0,-10 l-10,10" stroke="${C.ink}" stroke-width="3"/>`).join('')}`, o);
PR.pointer = (o) => mk(`<path d="M0,0 L520,0" stroke="${C.ink}" stroke-width="16" stroke-linecap="round"/><path d="M0,0 L520,0" stroke="#d9b27c" stroke-width="8" stroke-linecap="round"/><path d="M470,0 L520,0" stroke="${C.red}" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="0" r="12" fill="#6b3a22" ${OL4}/>`, o);
PR.banknote = (o) => mk(`<rect x="-100" y="-50" width="200" height="100" rx="8" fill="#000" opacity=".2" transform="translate(5 7)"/><rect x="-100" y="-50" width="200" height="100" rx="8" fill="#7fc070" ${OL}/><rect x="-88" y="-38" width="176" height="76" rx="5" fill="none" stroke="#2f6a2a" stroke-width="4"/><ellipse cx="0" cy="0" rx="34" ry="28" fill="#a8dc90" ${OL4}/><text x="0" y="12" text-anchor="middle" font-family="Russo One" font-size="34" fill="#1f4a1a">100</text><text x="-78" y="-18" font-family="Russo One" font-size="18" fill="#1f4a1a">$</text><text x="64" y="34" font-family="Russo One" font-size="18" fill="#1f4a1a">$</text>`, o);
PR.terminal = (o) => { const e = mk(`<ellipse cx="0" cy="4" rx="80" ry="10" fill="#000" opacity=".25"/><path d="M-70,0 L-58,-250 Q-56,-262 -44,-262 H44 Q56,-262 58,-250 L70,0Z" fill="#2a2f2a" ${OL}/><rect x="-46" y="-236" width="92" height="74" rx="8" fill="#0d2a12" ${OL4}/><rect x="-40" y="-230" width="80" height="62" rx="5" fill="${C.green}"/><text x="0" y="-205" text-anchor="middle" font-family="Russo One" font-size="17" fill="#0d2a12">К ОПЛАТЕ</text><text x="0" y="-182" text-anchor="middle" font-family="Russo One" font-size="22" fill="#0d2a12">48 ✓</text>${Array.from({ length: 12 }, (_, i) => `<rect x="${-38 + (i % 3) * 28}" y="${-146 + Math.floor(i / 3) * 34}" width="22" height="24" rx="5" fill="${i === 11 ? C.green : i === 9 ? C.red : '#d8d8c8'}" ${OL4} stroke-width="3"/>`).join('')}`, o); return e; };
PR.hammer = (o) => mk(`<path d="M0,40 L0,-190" stroke="${C.ink}" stroke-width="26" stroke-linecap="round"/><path d="M0,40 L0,-190" stroke="#a8743c" stroke-width="14" stroke-linecap="round"/><rect x="-62" y="-246" width="124" height="62" rx="10" fill="${C.steel}" ${OL}/><path d="M-62,-236 h124" stroke="#a9b3a0" stroke-width="8" opacity=".7"/><rect x="-62" y="-246" width="26" height="62" rx="6" fill="#4f5a4a" ${OL4}/>`, o);
PR.shell = (o) => mk(`<path d="M-22,0 V-120 C-22,-170 -8,-200 0,-212 C8,-200 22,-170 22,-120 V0Z" fill="${C.olive}" ${OL}/><rect x="-22" y="-96" width="44" height="18" fill="${C.yellow}" ${OL4}/><path d="M-22,0 L-36,26 L-22,18Z M22,0 L36,26 L22,18Z" fill="${C.olive2}" ${OL4}/><path d="M-12,-130 V-30" stroke="#8a9a5a" stroke-width="6" opacity=".6"/>`, o);
PR.wire = (o) => { o = o || {}; const rx = (o.d || 700) / 2, ry = rx * .26, mkarc = (a0, a1) => { let d = '', barbs = '', n = 220; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, ph = a * 26, k = 1 + Math.sin(ph) * .055, x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k + Math.cos(ph) * 12; d += (i ? 'L' : 'M') + f1(x) + ',' + f1(y); if (i % 14 === 3) barbs += `M${f1(x - 9)},${f1(y - 9)} l18,18 M${f1(x + 9)},${f1(y - 9)} l-18,18 `; }
    return `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#9aa392" stroke-width="4" stroke-linecap="round"/><path d="${barbs}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`; };
  const back = mk(mkarc(Math.PI, 2 * Math.PI), Object.assign({}, o, { layer: o.backLayer || 'mid' })), front = mk(mkarc(0, Math.PI), Object.assign({}, o, { layer: o.frontLayer || 'fx' }));
  return { back, front, all: [back, front], set(v) { gsap.set(back, v); gsap.set(front, v); }, to(tl, v, t) { tl.to(back, v, t); tl.to(front, v, t); return this; }, radius: rx }; };
PR.mortar = (o) => { o = o || {}; const e = mk(`<ellipse cx="0" cy="4" rx="100" ry="14" fill="#000" opacity=".3"/><path d="M-70,0 L-20,-78 M70,0 L24,-78" stroke="${C.ink}" stroke-width="16" stroke-linecap="round"/><path d="M-70,0 L-20,-78 M70,0 L24,-78" stroke="${C.olive2}" stroke-width="8" stroke-linecap="round"/><ellipse cx="0" cy="-8" rx="62" ry="14" fill="#4f5a4a" ${OL}/>
  <g class="tube" transform="rotate(-14 0 -34)"><rect x="-24" y="-250" width="48" height="216" rx="8" fill="${C.olive}" ${OL}/><rect x="-30" y="-262" width="60" height="24" rx="6" fill="${C.olive2}" ${OL4}/><ellipse cx="0" cy="-262" rx="22" ry="7" fill="#1a0f08"/><rect x="-24" y="-90" width="48" height="12" fill="${C.ink}" opacity=".5"/><path d="M-10,-230 V-110" stroke="#8a9a5a" stroke-width="6" opacity=".5"/></g>
  <g class="mf" opacity="0"><path d="M-46,-300 l18,-50 l16,34 l22,-60 l16,56 l30,-30 l-10,56 l36,16 l-50,14 l22,40 l-46,-14 l-12,40 l-22,-40 l-34,20 l8,-44 l-40,-10 l34,-22z" transform="translate(-30 20) rotate(-14 0 -34)" fill="#ffd75a" ${OL4}/></g>`, o);
  const tube = e.querySelector('.tube'), mf = e.querySelector('.mf'); const sc = o.s == null ? 1 : o.s;
  e.muzzle = () => { o = o || {}; return { x: (o.x || 0) - 55 * sc * (o.flip ? -1 : 1), y: (o.y || 0) - 255 * sc }; };
  e.fire = (tl, t) => { tl.to(tube, { y: 22, duration: .05, ease: 'power2.out', svgOrigin: '0 -34' }, t).to(tube, { y: 0, duration: .55, ease: 'elastic.out(1,.4)' }, t + .05);
    tl.set(mf, { opacity: 1 }, t).set(mf, { opacity: 0 }, t + .08); const m = e.muzzle(); S.dust(tl, t, m.x, m.y, { n: 7, size: 60, spread: 90, layer: 'fx' }); S.sparks(tl, t, m.x, m.y, { n: 8, ang: [230, 310] }); S.shake(tl, t, 7, .25); return t; }; return e; };
PR.heli = (o) => { const e = mk(`<ellipse cx="20" cy="6" rx="260" ry="22" fill="#000" opacity=".28"/>
  <path d="M-70,-170 L-345,-232 L-350,-198 L-84,-116Z" fill="${C.olive}" ${OL}/><path d="M-345,-232 L-385,-318 L-326,-318 L-300,-228Z" fill="${C.olive2}" ${OL}/>
  <g class="trot"><ellipse cx="-352" cy="-250" rx="12" ry="46" fill="#2b1a12" opacity=".25" class="ts"/></g>
  <path d="M-120,-110 C-124,-248 50,-290 142,-238 C206,-200 222,-142 196,-92 C176,-58 104,-56 44,-56 L-92,-56 C-112,-62 -120,-86 -120,-110Z" fill="${C.olive}" ${OL}/>
  <path d="M-90,-120 H190" stroke="${C.olive2}" stroke-width="6" opacity=".6"/><path d="M52,-238 C124,-228 182,-196 196,-146 L52,-146Z" fill="#bfe3e0" ${OL}/><path d="M72,-226 C110,-220 140,-204 156,-186" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".6" fill="none"/>
  <rect x="-80" y="-212" width="100" height="70" rx="12" fill="#bfe3e0" ${OL4}/><path d="M-80,-142 h100" stroke="${C.ink}" stroke-width="4"/><path d="M-96,-100 h170" stroke="${C.ink}" stroke-width="3" opacity=".4"/>
  <path d="M-80,-30 H168 Q196,-30 196,-52" stroke="${C.ink}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-80,-30 H168" stroke="#7a806f" stroke-width="5"/><path d="M-30,-58 L-36,-30 M92,-58 L98,-30" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/>
  <rect x="-10" y="-312" width="20" height="40" fill="${C.olive2}" ${OL4}/><circle cx="0" cy="-314" r="12" fill="#4f5a4a" ${OL4}/>
  <g class="rot"><path class="rest" d="M-8,-314 C-120,-300 -250,-286 -330,-262 M8,-314 C120,-300 250,-286 330,-262" stroke="${C.ink}" stroke-width="14" fill="none" stroke-linecap="round"/><ellipse class="smear" cx="0" cy="-316" rx="360" ry="22" fill="#2b1a12" opacity="0"/><path class="bl" d="" stroke="${C.ink}" stroke-width="12" stroke-linecap="round" opacity="0"/></g>`, o);
  const rest = e.querySelector('.rest'), sm = e.querySelector('.smear'), bl = e.querySelector('.bl'), ts = e.querySelector('.ts');
  e.rotor = (tl, t0, t1) => { t1 = t1 == null ? 1e6 : t1; S.addFx(t0, t1, (tt) => { const ph = 2 * Math.PI * 9 * (tt < 1.4 ? tt * tt / 2.8 : tt - .7), spd = Math.min(1, tt / 1.4), x = Math.cos(ph) * 350;
      rest.setAttribute('opacity', 1 - spd); sm.setAttribute('opacity', .2 * spd + .04 * Math.sin(tt * 20) * spd); bl.setAttribute('opacity', .55 * spd); bl.setAttribute('d', `M${f1(-x)},${f1(-316 - Math.sin(ph) * 10)} L${f1(x)},${f1(-316 + Math.sin(ph) * 10)}`); ts.setAttribute('opacity', .25 + .1 * Math.sin(tt * 30) * spd); ts.setAttribute('ry', 46 * Math.max(.2, Math.abs(Math.cos(ph * 1.7)))); },
      () => { rest.setAttribute('opacity', 1); sm.setAttribute('opacity', 0); bl.setAttribute('opacity', 0); }); return e; };
  return e; };

//@@END@@
})();
