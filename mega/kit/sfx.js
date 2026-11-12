/* ============================================================================
   kit/sfx.js — звук эффектов «Отряд Мега». Глобальный window.SFX.
   Всё синтезируется Web Audio из ПЕРЕДАННОГО контекста (живой AudioContext
   или OfflineAudioContext рендерера). Шум — только из буферов с зерном
   (свой ГПСЧ), результат детерминирован. Документация: kit/SFX.md

   window.__sound = (ctx, t0) => {
     const s = SFX.init(ctx, t0, { partStart: 34.3, room: 'field' });
     s.ambience('field', 0, 22); s.shot(12.4, { dist: 'far', pan: -0.4 });
   };

   Принцип каждого звука: транзиент + тело + хвост. Огибающая каждого голоса —
   кривая, доведённая до НУЛЯ (нет щелчков на обрывах). Тональные слои — только
   там, где они есть у настоящего предмета (звон металла, музыка, терминал).
   ========================================================================== */
(function (root) {
  'use strict';

  var LAT = 0.006; // задержка мастер-компрессора (look-ahead) — компенсируем

  // ---------- ГПСЧ с зерном ----------
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function dB(x) { return Math.pow(10, x / 20); }

  // Итоговые уровни ролей (подобраны по замерам витрины, см. SFX.md)
  var LV = {
    shot: 0.50, ricochet: 0.30, bulletDirt: 0.34, emptyClick: 0.20,
    explosion: 0.78, mortarThump: 0.62, shellWhistle: 0.34, shellFlyBy: 0.30,
    doorSlam: 0.62, crunch: 0.46, bodyFall: 0.42, step: 0.20, cloth: 0.16, paper: 0.15,
    pencil: 0.12, stamp: 0.36, spoon: 0.11, zap: 0.22, rubHands: 0.13, cashRustle: 0.14,
    coin: 0.10, terminalBeep: 0.085, wireTwang: 0.20, hammer: 0.34, whoosh: 0.16,
    thud: 0.40, dustPuff: 0.20, heli: 0.30, heliLand: 0.50,
    ambience: 0.085, music: 0.16, sting: 0.20
  };

  function init(ctx, t0, opts) {
    opts = opts || {};
    var sr = ctx.sampleRate;
    var partStart = opts.partStart || 0;
    var T = function (t) { return t0 + Math.max(0, t - LAT); };

    // ---------- буферы шума (с зерном, зацикливаются без шва) ----------
    function makeNoise(kind, seed, secs) {
      var n = Math.floor(sr * secs), x = Math.floor(sr * 0.05), r = mulberry(seed);
      var raw = new Float32Array(n + x), i;
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, peak = 0;
      for (i = 0; i < n + x; i++) {
        var w = r() * 2 - 1, v;
        if (kind === 'p') { // розовый (фильтр Келлета)
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
          v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
        } else if (kind === 'b') { // коричневый (интегратор с утечкой)
          last = (last + 0.02 * w) / 1.02; v = last;
        } else v = w;
        raw[i] = v; if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      var buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), k = 0.95 / peak;
      for (i = 0; i < n; i++) d[i] = raw[i] * k;
      for (i = 0; i < x; i++) { // хвост перекрёстно вклеен в начало — шва на петле нет
        var f = i / x; d[i] = (raw[i] * Math.sqrt(f) + raw[n + i] * Math.sqrt(1 - f)) * k;
      }
      return buf;
    }
    var NB = { w: makeNoise('w', 1337, 4), p: makeNoise('p', 7331, 5), b: makeNoise('b', 4242, 6) };
    var NLEN = { w: 4, p: 5, b: 6 };

    // ---------- тембры (PeriodicWave) ----------
    function wave(h) {
      var re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
      for (var i = 0; i < h.length; i++) im[i + 1] = h[i];
      return ctx.createPeriodicWave(re, im);
    }
    var W_TUBA = wave([1, 0.62, 0.36, 0.2, 0.1, 0.05]);
    var W_BRASS = wave([1, 0.8, 0.62, 0.45, 0.3, 0.2, 0.12, 0.08, 0.05]);
    var W_PIZZ = wave([1, 0.5, 0.33, 0.2, 0.12, 0.08, 0.04]);

    // ---------- мастер-шина ----------
    var pre = ctx.createGain(); pre.gain.value = 1;
    var comp = ctx.createDynamicsCompressor(); // мягкая «склейка»
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 2.5;
    comp.attack.value = 0.012; comp.release.value = 0.28;
    var mk = ctx.createGain(); mk.gain.value = opts.master == null ? 1 : opts.master;
    var half = ctx.createGain(); half.gain.value = 0.5;
    var clip = ctx.createWaveShaper(); // мягкий ограничитель: потолок −1.6 dBFS
    (function () {
      var N = 8193, c = new Float32Array(N), k = 0.5, top = 0.83;
      for (var i = 0; i < N; i++) {
        var x = (i / (N - 1) * 2 - 1) * 2, a = Math.abs(x);
        var y = a <= k ? a : k + (top - k) * Math.tanh((a - k) / (top - k));
        c[i] = x < 0 ? -y : y;
      }
      clip.curve = c; clip.oversample = '2x';
    })();
    var fade = ctx.createGain(); fade.gain.value = 1; // общий fadeIn/fadeOut сцены
    pre.connect(comp); comp.connect(mk); mk.connect(half); half.connect(clip); clip.connect(fade); fade.connect(ctx.destination);

    // шины fx / ambience / music с цепочками дакинга
    var fxBus = ctx.createGain(), ambBus = ctx.createGain(), musBus = ctx.createGain(), bgBus = ctx.createGain();
    fxBus.gain.value = opts.fx == null ? 1 : opts.fx;
    ambBus.gain.value = opts.amb == null ? 1 : opts.amb;
    musBus.gain.value = opts.mus == null ? 1 : opts.mus;
    ambBus.connect(bgBus); musBus.connect(bgBus);
    var chainFx = { tail: fxBus }, chainBg = { tail: bgBus };
    fxBus.connect(pre); bgBus.connect(pre);

    // «комната»: ConvolverNode с синтезированным импульсом
    var ROOMS = {
      bunker: { len: 1.5, tau: 0.30, lp0: 5200, lp1: 900, pre: 0.012, echo: 0, wet: 0.5 },
      cabin: { len: 0.5, tau: 0.07, lp0: 3500, lp1: 900, pre: 0.004, echo: 0, wet: 0.4 },
      field: { len: 2.4, tau: 0.50, lp0: 2600, lp1: 350, pre: 0.03, echo: 0.29, wet: 0.36 }
    };
    var room = ROOMS[opts.room] || ROOMS.field;
    var conv = ctx.createConvolver();
    (function () {
      var n = Math.floor(sr * room.len), buf = ctx.createBuffer(2, n, sr);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch), r = mulberry(9001 + ch * 77), lp = 0, p0 = Math.floor(room.pre * sr);
        for (var i = p0; i < n; i++) {
          var t = (i - p0) / sr, fc = room.lp1 + (room.lp0 - room.lp1) * Math.exp(-t / (room.tau * 0.8));
          var a = 1 - Math.exp(-2 * Math.PI * fc / sr);
          lp += a * ((r() * 2 - 1) - lp);
          var e = Math.exp(-t / room.tau) * Math.min(1, t / 0.004);
          if (room.echo) { var te = t - room.echo - ch * 0.013; if (te > 0) e += 0.55 * Math.exp(-te / (room.tau * 0.6)) * Math.min(1, te / 0.01); }
          d[i] = lp * e;
        }
        var fo = Math.floor(sr * 0.15);
        for (var j = 0; j < fo; j++) d[n - 1 - j] *= j / fo;
      }
      conv.buffer = buf;
    })();
    var revIn = ctx.createGain(); revIn.gain.value = 1;
    var revOut = ctx.createGain(); revOut.gain.value = room.wet * (opts.reverb == null ? 1 : opts.reverb);
    revIn.connect(conv); conv.connect(revOut); revOut.connect(fxBus);

    // ---------- примитивы ----------
    function rg(name, t, o) { // ГПСЧ звука: зерно = роль + время в ролике (или явный variant)
      var seed = hash(name) + (o && o.variant != null ? (o.variant * 7919 + 13) : Math.round((t + partStart) * 1000) * 31);
      var r = mulberry(seed); r(); r(); return r;
    }
    // огибающая: атака (полукосинус) + экспоненциальный спад, конец плавно в НОЛЬ
    function envCurve(a, tau, D, peak, shape) {
      var N = clamp(Math.ceil(D / (Math.max(a, 0.0003) / 3)), 48, 6000), c = new Float32Array(N), i, x, v;
      for (i = 0; i < N; i++) {
        x = i / (N - 1) * D;
        if (shape === 'bell') v = Math.pow(Math.sin(Math.PI * x / D), 2);
        else if (shape === 'swell') { // нарастание к концу и быстрый уход
          var u = x / D; v = u < 0.93 ? Math.pow(u / 0.93, a) : Math.pow(Math.cos((u - 0.93) / 0.07 * Math.PI / 2), 2);
        } else {
          v = x < a ? 0.5 - 0.5 * Math.cos(Math.PI * x / a) : Math.exp(-(x - a) / tau);
          var fs = D * 0.75; if (x > fs) { var q = Math.cos((x - fs) / (D - fs) * Math.PI / 2); v *= q * q; }
        }
        c[i] = v * peak;
      }
      c[0] = 0; c[N - 1] = 0;
      return c;
    }
    function applyFilters(node, fl, tt, dur) {
      if (!fl) return node;
      for (var i = 0; i < fl.length; i++) {
        var f = fl[i], b = ctx.createBiquadFilter();
        b.type = f.t; b.Q.value = f.q == null ? 0.707 : f.q;
        b.frequency.setValueAtTime(clamp(f.f, 20, sr * 0.45), tt);
        if (f.f1) b.frequency.exponentialRampToValueAtTime(clamp(f.f1, 20, sr * 0.45), tt + (f.ft || dur));
        if (f.f2) b.frequency.exponentialRampToValueAtTime(clamp(f.f2, 20, sr * 0.45), tt + dur);
        if (f.curve) b.frequency.setValueCurveAtTime(f.curve, tt, dur);
        node.connect(b); node = b;
      }
      return node;
    }
    // шумовой голос: {n:'w'|'p'|'b', fl:[{t,f,f1,ft,q}], a, tau, dur, g, shape, rate, env}
    function nz(dst, r, t, o) {
      var tt = T(t), dur = o.dur, kind = o.n || 'w';
      var src = ctx.createBufferSource(); src.buffer = NB[kind]; src.loop = true;
      if (o.rate) src.playbackRate.value = o.rate;
      var node = applyFilters(src, o.fl, tt, dur);
      var g = ctx.createGain(); g.gain.value = 0;
      g.gain.setValueCurveAtTime(o.env || envCurve(o.a || 0.002, o.tau || dur / 4, dur, o.g == null ? 1 : o.g, o.shape), tt, dur);
      node.connect(g); g.connect(dst);
      src.start(tt, r() * (NLEN[kind] - 0.1)); src.stop(tt + dur + 0.03);
      return g;
    }
    // тональный голос: {f, f1, ft, bend:[[dt,f],...], type, wave, lp:{...}, a, tau, dur, g, shape, vib:[rate,depthHz,delay]}
    function tn(dst, t, o) {
      var tt = T(t), dur = o.dur, osc = ctx.createOscillator(), i;
      if (o.wave) osc.setPeriodicWave(o.wave); else osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f, tt);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, tt + (o.ft || dur));
      if (o.bend) for (i = 0; i < o.bend.length; i++) osc.frequency.linearRampToValueAtTime(o.bend[i][1], tt + o.bend[i][0]);
      if (o.vib) {
        var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = 0;
        lg.gain.setValueAtTime(0, tt + (o.vib[2] || 0)); lg.gain.linearRampToValueAtTime(o.vib[1], tt + dur);
        l.connect(lg); lg.connect(osc.frequency); l.start(tt); l.stop(tt + dur + 0.03);
      }
      var node = applyFilters(osc, o.lp ? [o.lp] : null, tt, dur);
      var g = ctx.createGain(); g.gain.value = 0;
      g.gain.setValueCurveAtTime(o.env || envCurve(o.a || 0.003, o.tau || dur / 4, dur, o.g == null ? 1 : o.g, o.shape), tt, dur);
      node.connect(g); g.connect(dst);
      osc.start(tt); osc.stop(tt + dur + 0.03);
      return g;
    }
    // группа звука: громкость, панорама, «даль» (lowpass), посыл в комнату
    function grp(o) {
      o = o || {};
      var g = ctx.createGain(); g.gain.value = o.gain == null ? 1 : o.gain;
      var n = g;
      if (o.lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.5; n.connect(f); n = f; }
      if (o.hp) { var h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = o.hp; h.Q.value = 0.5; n.connect(h); n = h; }
      var p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan || 0, -1, 1); n.connect(p); p.connect(o.bus || fxBus);
      if (o.rev) { var s = ctx.createGain(); s.gain.value = o.rev; p.connect(s); s.connect(revIn); }
      g.panner = p;
      return g;
    }
    // гранулы: пачка коротких шумовых щелчков со случайной частотой/временем
    function grains(dst, r, t, o) {
      for (var i = 0; i < o.n; i++) {
        var x = Math.pow(r(), o.pow || 1), d = o.d0 + (o.d1 - o.d0) * r();
        var f = o.f0 * Math.pow(o.f1 / o.f0, r());
        var amp = o.g * Math.pow(1 - x, o.fall == null ? 1 : o.fall) * (0.35 + 0.65 * r());
        nz(Array.isArray(dst) ? dst[Math.floor(r() * dst.length)] : dst, r, t + x * o.span,
          { n: o.noise || 'w', fl: [{ t: o.ft || 'bandpass', f: f, q: o.q == null ? 1.2 : o.q }], a: o.a || 0.0006, tau: d / 3, dur: d, g: amp });
      }
    }
    // металлические моды: набор затухающих частичных (так звенит настоящий металл)
    function modes(dst, r, t, list, o) {
      o = o || {};
      for (var i = 0; i < list.length; i++) {
        var m = list[i], f = m[0] * (o.pitch || 1) * (1 + (r() - 0.5) * 0.012);
        tn(dst, t, { f: f, a: o.a || 0.0008, tau: m[2] * (o.len || 1), dur: Math.max(0.03, m[2] * 6 * (o.len || 1)), g: m[1] * (o.g == null ? 1 : o.g) });
      }
    }
    // медленное случайное «дыхание» (порывы ветра, перекаты гула)
    function wander(r, dur, rate, lo, hi) {
      var n = Math.max(2, Math.ceil(dur * rate) + 2), k = [], i;
      for (i = 0; i < n; i++) k.push(r());
      var N = Math.max(8, Math.ceil(dur * 30)), c = new Float32Array(N);
      for (i = 0; i < N; i++) {
        var x = i / (N - 1) * (n - 1), j = Math.floor(x), f = x - j, s = (1 - Math.cos(Math.PI * f)) / 2;
        c[i] = lo + (hi - lo) * (k[j] * (1 - s) + k[Math.min(j + 1, n - 1)] * s);
      }
      return c;
    }
    // длительная шумовая «постель» с дыханием громкости/частоты
    function bed(dst, r, a, b, o) {
      var tt = T(a), dur = b - a; if (dur <= 0.05) return;
      var src = ctx.createBufferSource(); src.buffer = NB[o.n || 'p']; src.loop = true;
      var fl = o.fl || [], i;
      if (o.fw) { fl = fl.slice(); fl[0] = { t: fl[0].t, q: fl[0].q, f: o.fw[0], curve: wander(r, dur, o.fw[2], o.fw[0], o.fw[1]) }; }
      var node = applyFilters(src, fl, tt, dur);
      var g = ctx.createGain(); g.gain.value = o.g;
      if (o.gw) { g.gain.value = 0; g.gain.setValueCurveAtTime(wander(r, dur, o.gw[2], o.g * o.gw[0], o.g * o.gw[1]), tt, dur); }
      node.connect(g); g.connect(dst);
      src.start(tt, r() * (NLEN[o.n || 'p'] - 0.1)); src.stop(tt + dur + 0.05);
      return g;
    }
    // группа с плавным входом/выходом (атмосферы, музыка, вертолёт)
    function span(a, b, o) {
      var G = grp(o), fi = o.fadeIn == null ? 0.5 : o.fadeIn, fo = o.fadeOut == null ? 0.6 : o.fadeOut, lvl = G.gain.value;
      fi = Math.min(fi, (b - a) / 2); fo = Math.min(fo, (b - a) / 2);
      G.gain.value = 0;
      G.gain.setValueAtTime(0, T(a)); G.gain.linearRampToValueAtTime(lvl, T(a) + Math.max(0.005, fi));
      G.gain.setValueAtTime(lvl, T(b) - Math.max(0.005, fo)); G.gain.linearRampToValueAtTime(0, T(b));
      return G;
    }

    var S = { ctx: ctx, t0: t0, partStart: partStart, buses: { fx: fxBus, amb: ambBus, mus: musBus, pre: pre } };

    // =====================================================================
    //  ОРУЖИЕ
    // =====================================================================
    S.shot = function (t, o) {
      o = o || {};
      var d = o.dist || 'mid', r = rg('shot', t, o), p = 0.9 + 0.2 * r(), tail = o.tail == null ? 1 : o.tail;
      var k = { near: 1, mid: 0.62, far: 0.36 }[d] || 0.62;
      var G = grp({ pan: o.pan, gain: LV.shot * k * (o.gain == null ? 1 : o.gain), rev: { near: 0.22, mid: 0.38, far: 0.55 }[d], bus: o.bus });
      if (d === 'far') {
        // глухой «пок»: воздух съел верх, пришли низ и отражение от рельефа
        nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 1000 * p, f1: 240, ft: 0.12 }], a: 0.005, tau: 0.05, dur: 0.42, g: 1.5 });
        tn(G, t, { f: 110 * p, f1: 56, ft: 0.1, a: 0.005, tau: 0.07, dur: 0.42, g: 0.55 });
        var e = 0.2 + 0.18 * r();
        nz(G, r, t + e, { n: 'p', fl: [{ t: 'lowpass', f: 620, f1: 190, ft: 0.3 }], a: 0.025, tau: 0.12, dur: 0.75, g: 0.6 * tail });
        nz(G, r, t + 0.03, { n: 'b', fl: [{ t: 'lowpass', f: 480, f1: 140, ft: 1 }], a: 0.06, tau: 0.4, dur: 1.7, g: 1.1 * tail });
        return;
      }
      var near = d === 'near', top = near ? 6800 : 3600;
      if (near) { // механика: ударник и затвор
        nz(G, r, t, { fl: [{ t: 'bandpass', f: 3200 * p, q: 1.1 }], a: 0.0004, tau: 0.002, dur: 0.012, g: 0.16 });
        nz(G, r, t + 0.05 + 0.012 * r(), { fl: [{ t: 'bandpass', f: 1900 * p, q: 2.5 }], a: 0.0008, tau: 0.006, dur: 0.03, g: 0.1 });
      }
      // хлопок: широкополосный, верх быстро закрывается
      nz(G, r, t, { fl: [{ t: 'lowpass', f: top * p, f1: 800, ft: 0.07 }], a: 0.0007, tau: 0.02 + 0.006 * r(), dur: 0.22, g: 0.55 });
      // тело: «бум» 80–200 Гц
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 150 * p, q: 0.7 }], a: 0.002, tau: 0.065, dur: 0.4, g: 3.2 });
      tn(G, t, { f: 170 * p, f1: 62, ft: 0.07, a: 0.0015, tau: 0.05, dur: 0.32, g: 0.62 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 560 * p, q: 0.6 }], a: 0.001, tau: 0.035, dur: 0.25, g: 1.1 });
      // хвост: шум с опускающимся фильтром + отражение
      nz(G, r, t + 0.012, { n: 'p', fl: [{ t: 'lowpass', f: 2400, f1: 300, ft: 0.8 }], a: 0.014, tau: 0.22, dur: 1.3, g: 0.5 * tail });
      nz(G, r, t + 0.09 + 0.07 * r(), { n: 'p', fl: [{ t: 'lowpass', f: 1300, f1: 380, ft: 0.3 }], a: 0.01, tau: 0.07, dur: 0.5, g: 0.42 * tail });
    };

    S.burst = function (t, n, o) {
      o = o || {};
      var r = rg('burst', t, o), rate = o.rate || 10, tt = t, i;
      for (i = 0; i < n; i++) {
        var oo = { dist: o.dist, pan: (o.pan || 0) + (r() - 0.5) * 0.06, bus: o.bus,
          gain: (o.gain == null ? 1 : o.gain) * dB((r() - 0.5) * 3), tail: i === n - 1 ? 1 : 0.35 };
        S.shot(tt, oo);
        tt += (1 / rate) * (0.86 + 0.28 * r()); // человеческая неровность
      }
      return tt;
    };

    S.ricochet = function (t, o) {
      o = o || {};
      var r = rg('ricochet', t, o), p = 0.85 + 0.3 * r(), dur = 0.32 + 0.16 * r();
      var G = grp({ pan: o.pan, gain: LV.ricochet * (o.gain == null ? 1 : o.gain), rev: 0.35 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 2600 * p, q: 1 }], a: 0.0005, tau: 0.006, dur: 0.04, g: 0.9 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 500 }], a: 0.001, tau: 0.02, dur: 0.1, g: 1.2 });
      // «виу» — не синус, а шум через узкий резонанс; кувыркание пули = дрожание громкости
      var g1 = nz(G, r, t + 0.008, { fl: [{ t: 'bandpass', f: 3000 * p, f1: 950 * p, q: 14 }, { t: 'bandpass', f: 3000 * p, f1: 950 * p, q: 6 }], a: 0.012, tau: dur / 3, dur: dur, g: 2.4 });
      nz(G, r, t + 0.008, { fl: [{ t: 'bandpass', f: 4700 * p, f1: 1500 * p, q: 10 }], a: 0.012, tau: dur / 4, dur: dur, g: 0.5 });
      var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.setValueAtTime(52, T(t)); l.frequency.linearRampToValueAtTime(30, T(t) + dur);
      lg.gain.value = 0.45; var tr = ctx.createGain(); tr.gain.value = 0.55; l.connect(lg); lg.connect(tr.gain);
      g1.disconnect(); g1.connect(tr); tr.connect(G); l.start(T(t)); l.stop(T(t) + dur + 0.05);
    };

    S.bulletDirt = function (t, o) {
      o = o || {};
      var r = rg('bulletDirt', t, o), p = 0.85 + 0.3 * r();
      var G = grp({ pan: o.pan, gain: LV.bulletDirt * (o.gain == null ? 1 : o.gain), rev: 0.15 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 520 * p, f1: 200, ft: 0.06 }], a: 0.0015, tau: 0.03, dur: 0.16, g: 2.2 });
      tn(G, t, { f: 120 * p, f1: 60, ft: 0.05, a: 0.002, tau: 0.035, dur: 0.18, g: 0.5 });
      nz(G, r, t + 0.004, { fl: [{ t: 'bandpass', f: 2400, q: 0.5 }], a: 0.004, tau: 0.05, dur: 0.25, g: 0.2 }); // песок
      grains(G, r, t + 0.02, { n: 14, span: 0.28, pow: 1.6, f0: 1500, f1: 5500, d0: 0.004, d1: 0.014, g: 0.3, fall: 1.2 });
    };

    S.emptyClick = function (t, o) {
      o = o || {};
      var r = rg('emptyClick', t, o), p = 0.92 + 0.16 * r();
      var G = grp({ pan: o.pan, gain: LV.emptyClick * (o.gain == null ? 1 : o.gain), rev: 0.06 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 2900 * p, q: 2.2 }], a: 0.0003, tau: 0.003, dur: 0.02, g: 1.4 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 700 * p, q: 1.5 }], a: 0.0005, tau: 0.008, dur: 0.04, g: 1.3 });
      modes(G, r, t, [[3150, 0.1, 0.012], [4720, 0.07, 0.008], [1730, 0.1, 0.016]], { pitch: p });
      nz(G, r, t + 0.032 + 0.01 * r(), { fl: [{ t: 'bandpass', f: 3600 * p, q: 3 }], a: 0.0003, tau: 0.002, dur: 0.014, g: 0.5 }); // пружина
    };

    // =====================================================================
    //  ВЗРЫВЫ И АРТИЛЛЕРИЯ
    // =====================================================================
    S.explosion = function (t, o) {
      o = o || {};
      var big = (o.size || 'big') === 'big', d = o.dist || 'near', r = rg('explosion', t, o), p = 0.9 + 0.2 * r();
      var k = (big ? 1 : 0.55) * ({ near: 1, mid: 0.6, far: 0.3 }[d] || 1), L = big ? 1 : 0.6;
      var lp = { near: 0, mid: 2600, far: 700 }[d];
      var G = grp({ pan: o.pan, gain: LV.explosion * k * (o.gain == null ? 1 : o.gain), rev: d === 'near' ? 0.3 : 0.5, lp: lp });
      var GL = grp({ pan: (o.pan || 0) - 0.5, gain: LV.explosion * k, rev: 0.2, lp: lp }), GR = grp({ pan: (o.pan || 0) + 0.5, gain: LV.explosion * k, rev: 0.2, lp: lp });
      // 1) первый фронт — короткий широкополосный удар, верх закрывается за 0.2 с
      nz(G, r, t, { fl: [{ t: 'lowpass', f: 3800 * p, f1: 260, ft: 0.22 }], a: 0.002, tau: 0.07, dur: 0.5, g: 0.55 });
      // 2) низкий удар 40–60 Гц с быстрым спадом высоты (+ октава для маленьких динамиков)
      tn(G, t, { f: 64 * p, f1: 36, ft: 0.3 * L, a: 0.006, tau: 0.38 * L, dur: 1.6 * L, g: 0.85 });
      tn(G, t, { f: 118 * p, f1: 48, ft: 0.22 * L, a: 0.004, tau: 0.2 * L, dur: 1.0 * L, g: 0.42 });
      nz(G, r, t, { n: 'b', fl: [{ t: 'lowpass', f: 190, q: 0.6 }], a: 0.006, tau: 0.45 * L, dur: 2.0 * L, g: 1.3 });
      // 3) шумовая волна: фильтр уходит вниз за 1–2 с, громкость «перекатывается»
      var dur = 2.8 * L;
      var wv = nz(G, r, t + 0.01, { n: 'p', fl: [{ t: 'lowpass', f: 2300 * p, f1: 150, ft: 1.7 * L }], a: 0.02, tau: 0.62 * L, dur: dur, g: 1.5 });
      var roll = ctx.createGain(); roll.gain.value = 0; roll.gain.setValueCurveAtTime(wander(r, dur, 9, 0.55, 1), T(t + 0.01), dur);
      wv.disconnect(); wv.connect(roll); roll.connect(G);
      nz(G, r, t + 0.02, { n: 'p', fl: [{ t: 'bandpass', f: 420, f1: 170, q: 0.6 }], a: 0.03, tau: 0.5 * L, dur: 2.2 * L, g: 1.3 });
      // 4) «воздух» — тихое шипение ударной волны
      nz(G, r, t + 0.01, { fl: [{ t: 'highpass', f: 3200 }, { t: 'lowpass', f: 9000, f1: 3500 }], a: 0.05, tau: 0.4 * L, dur: 1.6 * L, g: 0.035 });
      // 5) осыпь: комья земли (низкие шлепки) и камешки (короткие щелчки), редеют
      var D = [G, GL, GR];
      grains(D, r, t + 0.3, { n: big ? 26 : 12, span: 2.0 * L, pow: 1.35, f0: 180, f1: 700, q: 0.8, d0: 0.03, d1: 0.08, g: 0.75, fall: 0.9, noise: 'p', a: 0.003 });
      grains(D, r, t + 0.35, { n: big ? 46 : 20, span: 2.3 * L, pow: 1.2, f0: 900, f1: 4200, q: 1.4, d0: 0.005, d1: 0.022, g: 0.14, fall: 1.1, a: 0.0008 });
      nz(G, r, t + 0.4, { n: 'p', fl: [{ t: 'bandpass', f: 1500, f1: 700, q: 0.5 }], a: 0.3, tau: 0.6 * L, dur: 2.2 * L, g: 0.16 }); // шорох песка
      // 6) звон в ушах — очень тихо, только big и только вблизи
      if (big && d === 'near' && o.ring !== false) {
        tn(G, t + 0.08, { f: 4350, dur: 2.2, shape: 'bell', g: 0.0035 });
        nz(G, r, t + 0.08, { fl: [{ t: 'bandpass', f: 4350, q: 30 }], dur: 2.2, shape: 'bell', g: 0.02 });
      }
    };

    S.mortarThump = function (t, o) {
      o = o || {};
      var r = rg('mortarThump', t, o), p = 0.93 + 0.14 * r();
      var G = grp({ pan: o.pan, gain: LV.mortarThump * (o.gain == null ? 1 : o.gain), rev: 0.35 });
      tn(G, t, { f: 135 * p, f1: 58, ft: 0.09, a: 0.003, tau: 0.085, dur: 0.5, g: 0.9 }); // «тумп»
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 900 * p, f1: 240, ft: 0.08 }], a: 0.002, tau: 0.045, dur: 0.3, g: 1.8 });
      // труба: полый резонанс ствола
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 215 * p, q: 9 }], a: 0.003, tau: 0.11, dur: 0.5, g: 5 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 640 * p, q: 9 }], a: 0.002, tau: 0.06, dur: 0.3, g: 1.6 });
      nz(G, r, t + 0.015, { fl: [{ t: 'bandpass', f: 1500 * p, q: 3 }], a: 0.0008, tau: 0.008, dur: 0.04, g: 0.25 }); // звяк плиты
      nz(G, r, t + 0.02, { n: 'p', fl: [{ t: 'lowpass', f: 1500, f1: 300, ft: 0.5 }], a: 0.03, tau: 0.18, dur: 0.9, g: 0.5 }); // выдох дыма
    };

    S.shellWhistle = function (t, dur, o) {
      o = o || {};
      dur = dur || 1.6;
      var r = rg('shellWhistle', t, o), p = 0.94 + 0.12 * r();
      var G = grp({ pan: o.pan, gain: LV.shellWhistle * (o.gain == null ? 1 : o.gain), rev: 0.25 });
      var f0 = (o.from || 2500) * p, f1 = (o.to || 880) * p;
      // шум через узкий резонанс с падающей частотой; громкость растёт — снаряд приближается
      nz(G, r, t, { fl: [{ t: 'bandpass', f: f0, f1: f1, q: 22 }, { t: 'bandpass', f: f0, f1: f1, q: 7 }], dur: dur, shape: 'swell', a: 2.2, g: 9 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: f0 * 1.52, f1: f1 * 1.52, q: 16 }], dur: dur, shape: 'swell', a: 2.8, g: 0.8 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: f0 * 0.5, f1: f1 * 0.5, q: 1.2 }], dur: dur, shape: 'swell', a: 3, g: 1.0 }); // воздух вокруг
    };

    S.shellFlyBy = function (t, dur, o) {
      o = o || {};
      dur = dur || 1.2;
      var r = rg('shellFlyBy', t, o), p = 0.92 + 0.16 * r(), from = o.from == null ? -0.7 : o.from, to = o.to == null ? 0.7 : o.to;
      var G = grp({ pan: from, gain: LV.shellFlyBy * (o.gain == null ? 1 : o.gain), rev: 0.25 });
      G.panner.pan.setValueAtTime(from, T(t)); G.panner.pan.linearRampToValueAtTime(to, T(t) + dur);
      // доплер: тон чуть выше на подлёте и падает после пролёта
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 1500 * p, f1: 1700 * p, ft: dur * 0.45, f2: 620 * p, q: 5 }], dur: dur, shape: 'bell', g: 3.2 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 500 * p, f1: 560 * p, ft: dur * 0.45, f2: 220 * p, q: 1 }], dur: dur, shape: 'bell', g: 1.8 });
      nz(G, r, t, { fl: [{ t: 'highpass', f: 3000 }], dur: dur, shape: 'bell', g: 0.05 });
    };

    // =====================================================================
    //  ПРЕДМЕТЫ И ТЕЛА
    // =====================================================================
    S.doorSlam = function (t, o) {
      o = o || {};
      var r = rg('doorSlam', t, o), p = 0.93 + 0.14 * r();
      var G = grp({ pan: o.pan, gain: LV.doorSlam * (o.gain == null ? 1 : o.gain), rev: 0.55 });
      nz(G, r, t - 0.09, { n: 'p', fl: [{ t: 'bandpass', f: 300, f1: 700, q: 0.8 }], dur: 0.1, shape: 'swell', a: 2, g: 0.35 }); // воздух перед ударом
      tn(G, t, { f: 92 * p, f1: 46, ft: 0.12, a: 0.003, tau: 0.16, dur: 0.8, g: 0.95 }); // низ
      nz(G, r, t, { n: 'b', fl: [{ t: 'lowpass', f: 220 }], a: 0.004, tau: 0.16, dur: 0.8, g: 1.6 });
      nz(G, r, t, { fl: [{ t: 'lowpass', f: 2600 * p, f1: 350, ft: 0.09 }], a: 0.0008, tau: 0.035, dur: 0.3, g: 0.55 }); // удар
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 480 * p, q: 0.8 }], a: 0.001, tau: 0.06, dur: 0.4, g: 1.8 });
      // стальное полотно: негармоничные моды, низкие живут дольше
      modes(G, r, t, [[173, 0.2, 0.28], [259, 0.13, 0.22], [317, 0.07, 0.2], [431, 0.07, 0.15], [588, 0.045, 0.11], [823, 0.03, 0.08], [1190, 0.016, 0.05]], { pitch: p, a: 0.002 });
      // дребезг засова: отскоки учащаются и гаснут
      var tt = t + 0.055, gap = 0.062, a = 0.32;
      for (var i = 0; i < 7; i++) {
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: (1700 + 900 * r()) * p, q: 2.5 }], a: 0.0005, tau: 0.006, dur: 0.035, g: a });
        modes(G, r, tt, [[2140, 0.02 * a, 0.02], [3380, 0.014 * a, 0.014]], { pitch: p });
        tt += gap * (0.9 + 0.2 * r()); gap *= 0.72; a *= 0.7;
      }
      nz(G, r, t + 0.02, { n: 'p', fl: [{ t: 'lowpass', f: 1200, f1: 250, ft: 0.6 }], a: 0.03, tau: 0.22, dur: 1.1, g: 0.35 }); // гул помещения
    };

    S.crunch = function (t, o) {
      o = o || {};
      var r = rg('crunch', t, o), p = 0.88 + 0.24 * r();
      var G = grp({ pan: o.pan, gain: LV.crunch * (o.gain == null ? 1 : o.gain), rev: 0.2 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 420 * p, f1: 180, ft: 0.06 }], a: 0.003, tau: 0.045, dur: 0.25, g: 2.2 }); // шлепок
      tn(G, t, { f: 105 * p, f1: 58, ft: 0.06, a: 0.003, tau: 0.05, dur: 0.25, g: 0.6 });
      // хруст: пачка коротких щелчков (как сухая ветка / хлопья), сгущение в начале
      grains(G, r, t + 0.004, { n: 13, span: 0.15, pow: 1.5, f0: 800, f1: 3400, q: 1.6, d0: 0.004, d1: 0.016, g: 0.75, fall: 0.6 });
      grains(G, r, t + 0.01, { n: 6, span: 0.12, pow: 1.2, f0: 300, f1: 800, q: 1.2, d0: 0.012, d1: 0.03, g: 1.2, fall: 0.6, noise: 'p' });
      nz(G, r, t + 0.03, { n: 'p', fl: [{ t: 'bandpass', f: 700 * p, f1: 300, q: 2 }], a: 0.02, tau: 0.04, dur: 0.16, g: 0.7 }); // «чвяк»
    };

    S.thud = function (t, o) {
      o = o || {};
      var r = rg('thud', t, o), p = 0.88 + 0.24 * r();
      var G = grp({ pan: o.pan, gain: LV.thud * (o.gain == null ? 1 : o.gain), rev: 0.2 });
      tn(G, t, { f: 82 * p, f1: 44, ft: 0.09, a: 0.004, tau: 0.11, dur: 0.6, g: 0.9 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 380 * p, f1: 150, ft: 0.08 }], a: 0.003, tau: 0.06, dur: 0.35, g: 2.4 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 900, q: 0.6 }], a: 0.002, tau: 0.02, dur: 0.1, g: 0.3 });
    };

    S.bodyFall = function (t, o) {
      o = o || {};
      var w = o.weight == null ? 0.6 : (o.weight === 'heavy' ? 1 : o.weight === 'light' ? 0.3 : o.weight);
      var r = rg('bodyFall', t, o), p = (1.12 - 0.3 * w) * (0.94 + 0.12 * r());
      var G = grp({ pan: o.pan, gain: LV.bodyFall * (0.6 + 0.6 * w) * (o.gain == null ? 1 : o.gain), rev: 0.18 });
      tn(G, t, { f: 88 * p, f1: 46, ft: 0.1, a: 0.006, tau: 0.1, dur: 0.55, g: 0.85 }); // мягкий удар
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 340 * p, f1: 140, ft: 0.1 }], a: 0.005, tau: 0.07, dur: 0.4, g: 2.4 });
      var t2 = t + 0.16 + 0.08 * r(); // вторым приходят руки/ноги
      tn(G, t2, { f: 100 * p, f1: 55, ft: 0.07, a: 0.005, tau: 0.06, dur: 0.3, g: 0.3 });
      nz(G, r, t2, { n: 'p', fl: [{ t: 'lowpass', f: 420 * p }], a: 0.004, tau: 0.04, dur: 0.22, g: 0.9 });
      // шорох формы
      nz(G, r, t - 0.04, { fl: [{ t: 'bandpass', f: 1900, q: 0.6 }], a: 0.04, tau: 0.09, dur: 0.4, g: 0.13 });
      nz(G, r, t2, { fl: [{ t: 'bandpass', f: 2500, q: 0.7 }], a: 0.02, tau: 0.06, dur: 0.25, g: 0.07 });
      // звяк снаряжения (пряжка, фляга)
      if (o.gear !== false) {
        var tg = t + 0.03 + 0.05 * r(), q = 0.85 + 0.3 * r();
        nz(G, r, tg, { fl: [{ t: 'bandpass', f: 2800 * q, q: 2 }], a: 0.0004, tau: 0.004, dur: 0.02, g: 0.2 });
        modes(G, r, tg, [[2380, 0.035, 0.04], [3710, 0.022, 0.03], [5140, 0.012, 0.02]], { pitch: q });
        modes(G, r, t2 + 0.03, [[1870, 0.02, 0.05], [2960, 0.012, 0.03]], { pitch: q });
      }
      nz(G, r, t + 0.02, { n: 'p', fl: [{ t: 'bandpass', f: 1100, f1: 600, q: 0.5 }], a: 0.05, tau: 0.12, dur: 0.5, g: 0.2 }); // пыль
    };

    S.step = function (t, o) {
      o = o || {};
      var r = rg('step', t, o), p = 0.88 + 0.24 * r();
      var G = grp({ pan: o.pan, gain: LV.step * (o.gain == null ? 1 : o.gain), rev: o.surface === 'dirt' ? 0.06 : 0.3 });
      if (o.surface === 'dirt') {
        nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 480 * p, f1: 200, ft: 0.05 }], a: 0.004, tau: 0.035, dur: 0.18, g: 2.2 });
        tn(G, t, { f: 95 * p, f1: 60, ft: 0.04, a: 0.004, tau: 0.03, dur: 0.14, g: 0.3 });
        nz(G, r, t + 0.01, { fl: [{ t: 'bandpass', f: 2600 * p, q: 0.6 }], a: 0.012, tau: 0.04, dur: 0.16, g: 0.12 });
        grains(G, r, t + 0.01, { n: 6, span: 0.12, f0: 1500, f1: 4500, d0: 0.004, d1: 0.012, g: 0.14 });
      } else { // бетон: каблук, потом носок
        nz(G, r, t, { fl: [{ t: 'bandpass', f: 1250 * p, q: 1.4 }], a: 0.0008, tau: 0.007, dur: 0.04, g: 0.6 });
        nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 300 * p }], a: 0.002, tau: 0.03, dur: 0.15, g: 1.9 });
        nz(G, r, t + 0.06 + 0.02 * r(), { fl: [{ t: 'bandpass', f: 1700 * p, q: 0.9 }], a: 0.003, tau: 0.012, dur: 0.06, g: 0.22 });
      }
    };
    S.footsteps = function (a, b, o) {
      o = o || {};
      var r = rg('footsteps', a, o), rate = o.rate || 1.8, t = a, i = 0;
      while (t < b - 0.02) {
        S.step(t, { surface: o.surface || 'concrete', pan: (o.pan || 0) + (i % 2 ? 0.07 : -0.07), gain: (o.gain == null ? 1 : o.gain) * dB((r() - 0.5) * 3) });
        t += (1 / rate) * (0.95 + 0.1 * r()); i++;
      }
    };

    S.cloth = function (t, o) {
      o = o || {};
      var r = rg('cloth', t, o), p = 0.85 + 0.3 * r();
      var G = grp({ pan: o.pan, gain: LV.cloth * (o.gain == null ? 1 : o.gain), rev: 0.1 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 1500 * p, f1: 2300 * p, q: 0.6 }], dur: 0.16, shape: 'bell', g: 0.7 });
      nz(G, r, t + 0.1 + 0.04 * r(), { fl: [{ t: 'bandpass', f: 2100 * p, f1: 1300 * p, q: 0.6 }], dur: 0.2, shape: 'bell', g: 0.45 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 500, q: 0.6 }], dur: 0.28, shape: 'bell', g: 0.8 });
    };

    S.paper = function (t, o) {
      o = o || {};
      var r = rg('paper', t, o), p = 0.88 + 0.24 * r();
      var G = grp({ pan: o.pan, gain: LV.paper * (o.gain == null ? 1 : o.gain), rev: 0.12 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 3200 * p, f1: 4600 * p, q: 0.5 }], dur: 0.3, shape: 'bell', g: 0.4 }); // взмах листа
      grains(G, r, t + 0.02, { n: 16, span: 0.26, pow: 0.9, f0: 2200, f1: 7000, q: 0.9, d0: 0.004, d1: 0.016, g: 0.7, fall: 0.5 }); // хруст бумаги
      nz(G, r, t + 0.04, { n: 'p', fl: [{ t: 'bandpass', f: 900 * p, q: 0.8 }], dur: 0.2, shape: 'bell', g: 0.6 });
    };

    S.pencil = function (t, dur, o) {
      o = o || {};
      dur = dur || 0.8;
      var r = rg('pencil', t, o), G = grp({ pan: o.pan, gain: LV.pencil * (o.gain == null ? 1 : o.gain), rev: 0.08 });
      var tt = t;
      while (tt < t + dur - 0.05) { // штрихи разной длины с паузами
        var d = Math.min(0.07 + 0.13 * r(), t + dur - tt), p = 0.85 + 0.3 * r(), up = r() > 0.5;
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: (up ? 2400 : 3300) * p, f1: (up ? 3300 : 2400) * p, q: 1.1 }], dur: d, shape: 'bell', g: 0.9 });
        nz(G, r, tt, { n: 'p', fl: [{ t: 'bandpass', f: 850 * p, q: 1.3 }], dur: d, shape: 'bell', g: 1.1 }); // стол-резонатор
        tt += d + 0.025 + 0.05 * r();
      }
    };

    S.stamp = function (t, o) {
      o = o || {};
      var r = rg('stamp', t, o), p = 0.92 + 0.16 * r();
      var G = grp({ pan: o.pan, gain: LV.stamp * (o.gain == null ? 1 : o.gain), rev: 0.22 });
      tn(G, t, { f: 210 * p, f1: 125, ft: 0.03, a: 0.0015, tau: 0.03, dur: 0.2, g: 0.6 }); // деревянный «тук»
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 640 * p, q: 2.2 }], a: 0.0008, tau: 0.02, dur: 0.12, g: 3 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 1900 * p, q: 1.2 }], a: 0.0005, tau: 0.006, dur: 0.035, g: 0.4 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 180 }], a: 0.003, tau: 0.04, dur: 0.2, g: 1.6 }); // стол
      // пружинка: 3 мелких отскока + короткая дрожь
      for (var i = 0; i < 3; i++)
        nz(G, r, t + 0.07 + i * (0.026 + 0.004 * r()), { fl: [{ t: 'bandpass', f: (3300 + 400 * i) * p, q: 4 }], a: 0.0004, tau: 0.004, dur: 0.02, g: 0.22 / (i + 1) });
      nz(G, r, t + 0.068, { fl: [{ t: 'bandpass', f: 1250 * p, f1: 1100 * p, q: 18 }], a: 0.004, tau: 0.035, dur: 0.16, g: 1.2 });
    };

    S.spoon = function (t, o) {
      o = o || {};
      var r = rg('spoon', t, o), p = 0.86 + 0.28 * r();
      var G = grp({ pan: o.pan, gain: LV.spoon * (o.gain == null ? 1 : o.gain), rev: 0.25 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 3000 * p, q: 1 }], a: 0.0003, tau: 0.003, dur: 0.018, g: 0.8 });
      modes(G, r, t, [[1820, 0.5, 0.07], [2950, 0.32, 0.055], [4630, 0.2, 0.035], [6240, 0.1, 0.02]], { pitch: p }); // миска
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 420, q: 1.5 }], a: 0.001, tau: 0.02, dur: 0.1, g: 1.2 });
    };

    S.zap = function (t, o) {
      o = o || {};
      var r = rg('zap', t, o), G = grp({ pan: o.pan, gain: LV.zap * (o.gain == null ? 1 : o.gain), rev: 0.12 });
      // статический разряд: сухой треск — неровная пачка микрощелчков, первый ярче
      nz(G, r, t, { fl: [{ t: 'highpass', f: 1400 }, { t: 'lowpass', f: 7500 }], a: 0.0003, tau: 0.003, dur: 0.02, g: 1 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 450, q: 1 }], a: 0.001, tau: 0.012, dur: 0.06, g: 1.4 });
      var tt = t + 0.008, n = 9 + Math.floor(r() * 6);
      for (var i = 0; i < n; i++) {
        var d = 0.002 + 0.006 * r();
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: 1800 + 4200 * r(), q: 0.8 }], a: 0.0003, tau: d / 2.5, dur: d + 0.004, g: (0.3 + 0.6 * r()) * (1 - i / n * 0.6) });
        tt += 0.004 + 0.03 * r() * r();
      }
    };

    S.rubHands = function (t, dur, o) {
      o = o || {};
      dur = dur || 0.8;
      var r = rg('rubHands', t, o), G = grp({ pan: o.pan, gain: LV.rubHands * (o.gain == null ? 1 : o.gain), rev: 0.08 });
      var st = 0.075 + 0.02 * r(), tt = t, i = 0; // туда-сюда ~6–7 раз в секунду
      while (tt < t + dur - st * 0.5) {
        var p = (i % 2 ? 1.15 : 0.9) * (0.94 + 0.12 * r()), d = st * (0.9 + 0.2 * r());
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: 1300 * p, f1: 1700 * p, q: 0.7 }], dur: d * 1.25, shape: 'bell', g: 0.9 });
        nz(G, r, tt, { n: 'p', fl: [{ t: 'bandpass', f: 600 * p, q: 0.8 }], dur: d * 1.25, shape: 'bell', g: 0.9 });
        tt += d; i++;
      }
    };

    S.cashRustle = function (t, o) {
      o = o || {};
      var r = rg('cashRustle', t, o), G = grp({ pan: o.pan, gain: LV.cashRustle * (o.gain == null ? 1 : o.gain), rev: 0.1 });
      var tt = t, n = o.n || 5; // отсчёт купюр: быстрые перелистывания
      for (var i = 0; i < n; i++) {
        var p = 0.85 + 0.3 * r();
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: 2300 * p, f1: 3600 * p, q: 0.7 }], dur: 0.05, shape: 'bell', g: 0.8 });
        nz(G, r, tt + 0.03, { fl: [{ t: 'bandpass', f: 3400 * p, q: 1 }], a: 0.0006, tau: 0.006, dur: 0.03, g: 0.7 });
        nz(G, r, tt + 0.03, { n: 'p', fl: [{ t: 'bandpass', f: 700 * p, q: 1 }], a: 0.001, tau: 0.012, dur: 0.05, g: 1 });
        tt += 0.062 + 0.02 * r();
      }
    };

    S.coin = function (t, o) {
      o = o || {};
      var r = rg('coin', t, o), p = 0.9 + 0.2 * r(), G = grp({ pan: o.pan, gain: LV.coin * (o.gain == null ? 1 : o.gain), rev: 0.25 });
      var M = [[3950, 0.5, 0.11], [5820, 0.3, 0.08], [8900, 0.12, 0.04], [2210, 0.14, 0.05]];
      var tt = t, a = 1, gap = 0.085;
      for (var i = 0; i < 3; i++) { // монета отскакивает и ложится
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: 3500 * p, q: 1 }], a: 0.0003, tau: 0.003, dur: 0.016, g: 0.7 * a });
        modes(G, r, tt, M, { pitch: p * (1 + i * 0.012), g: a, len: 1 - i * 0.2 });
        tt += gap * (0.9 + 0.2 * r()); gap *= 0.6; a *= 0.5;
      }
    };

    S.terminalBeep = function (t, o) {
      o = o || {};
      var G = grp({ pan: o.pan, gain: LV.terminalBeep * (o.gain == null ? 1 : o.gain), rev: 0.15 });
      // единственный «электронный» звук: два мягких тона (кварта вверх), закруглённые края
      var n = [[1318.5, 0], [1760, 0.13]];
      for (var i = 0; i < 2; i++) {
        tn(G, t + n[i][1], { f: n[i][0], dur: 0.12, shape: 'bell', g: 0.9 });
        tn(G, t + n[i][1], { f: n[i][0] * 2, dur: 0.12, shape: 'bell', g: 0.1 });
      }
    };

    S.wireTwang = function (t, o) {
      o = o || {};
      var r = rg('wireTwang', t, o), p = 0.85 + 0.3 * r(), G = grp({ pan: o.pan, gain: LV.wireTwang * (o.gain == null ? 1 : o.gain), rev: 0.3 });
      var f0 = 178 * p, B = 0.004; // жёсткая проволока: обертоны «расползаются» вверх
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 2200 * p, q: 1 }], a: 0.0005, tau: 0.006, dur: 0.04, g: 0.6 }); // зацеп
      for (var n = 1; n <= 9; n++) {
        var f = f0 * n * Math.sqrt(1 + B * n * n);
        tn(G, t, { f: f * 1.035, f1: f, ft: 0.12, a: 0.0015, tau: 0.3 / Math.pow(n, 0.8), dur: 1.3 / Math.pow(n, 0.6), g: 0.42 / Math.pow(n, 0.75) * (n % 2 ? 1 : 0.6) });
      }
      for (var i = 0; i < 5; i++) // шипы дребезжат о столб
        nz(G, r, t + 0.03 + i * (0.027 + 0.006 * r()), { fl: [{ t: 'bandpass', f: (2600 + 1500 * r()) * p, q: 3 }], a: 0.0004, tau: 0.004, dur: 0.02, g: 0.3 * Math.pow(0.7, i) });
    };

    S.hammer = function (t, o) {
      o = o || {};
      var r = rg('hammer', t, o), p = 0.92 + 0.16 * r(), G = grp({ pan: o.pan, gain: LV.hammer * (o.gain == null ? 1 : o.gain), rev: 0.3 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 1500 * p, q: 1 }], a: 0.0005, tau: 0.01, dur: 0.06, g: 0.9 }); // удар
      tn(G, t, { f: 240 * p, f1: 170, ft: 0.03, a: 0.001, tau: 0.035, dur: 0.2, g: 0.5 }); // дерево столба
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 420 * p, q: 2 }], a: 0.001, tau: 0.03, dur: 0.18, g: 2.6 });
      tn(G, t, { f: 96 * p, f1: 60, ft: 0.05, a: 0.002, tau: 0.045, dur: 0.25, g: 0.5 });
      modes(G, r, t, [[3180, 0.06, 0.04], [4760, 0.035, 0.028], [6900, 0.015, 0.016]], { pitch: p }); // звон гвоздя
    };

    S.whoosh = function (t, dur, o) {
      o = o || {};
      dur = dur || 0.6;
      var r = rg('whoosh', t, o), p = 0.85 + 0.3 * r(), G = grp({ pan: o.pan || 0, gain: LV.whoosh * (o.gain == null ? 1 : o.gain), rev: 0.15 });
      if (o.panTo != null) { G.panner.pan.setValueAtTime(o.pan || 0, T(t)); G.panner.pan.linearRampToValueAtTime(o.panTo, T(t) + dur); }
      nz(G, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 320 * p, f1: 1300 * p, ft: dur * 0.5, f2: 420 * p, q: 1.1 }], dur: dur, shape: 'bell', g: 2.2 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 1400 * p, f1: 3200 * p, ft: dur * 0.5, f2: 1500 * p, q: 0.9 }], dur: dur, shape: 'bell', g: 0.22 });
    };

    S.dustPuff = function (t, o) {
      o = o || {};
      var r = rg('dustPuff', t, o), p = 0.88 + 0.24 * r(), big = o.big ? 2 : 1;
      var G = grp({ pan: o.pan, gain: LV.dustPuff * (o.gain == null ? 1 : o.gain), rev: 0.1 });
      nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 2800 * p, f1: 500, ft: 0.35 * big }], a: 0.03 * big, tau: 0.13 * big, dur: 0.6 * big, g: 1.2 });
      nz(G, r, t, { fl: [{ t: 'bandpass', f: 2200 * p, f1: 1200, q: 0.5 }], a: 0.04 * big, tau: 0.1 * big, dur: 0.5 * big, g: 0.12 });
    };

    // =====================================================================
    //  ВЕРТОЛЁТ
    // =====================================================================
    // rpm — обороты несущего винта; частота «лопастей» = rpm/60 × 4 (300 об/мин → 20 Гц)
    S.heli = function (a, b, o) {
      o = o || {};
      var inside = !!o.inside, r = rg('heli', a, o), dur = b - a, ta = T(a), tb = T(b);
      var r0 = o.rpmFrom || 300, r1 = o.rpmTo || r0, f0 = r0 / 60 * 4, f1 = r1 / 60 * 4, rd = Math.min(o.ramp || dur, dur);
      var G = span(a, b, { pan: o.pan, gain: LV.heli * (o.gain == null ? 1 : o.gain), rev: 0.1, lp: inside ? 650 : 0, fadeIn: o.fadeIn == null ? 0.5 : o.fadeIn, fadeOut: o.fadeOut == null ? 0.8 : o.fadeOut });
      // импульс лопасти: синус-НЧ → формирователь → управляет громкостью шума
      var lfo = ctx.createOscillator(); lfo.frequency.setValueAtTime(f0, ta); lfo.frequency.linearRampToValueAtTime(f1, ta + rd);
      var sh = ctx.createWaveShaper(), c = new Float32Array(257);
      for (var i = 0; i < 257; i++) c[i] = Math.pow((i / 256), 3);
      sh.curve = c; lfo.connect(sh); lfo.start(ta); lfo.stop(tb + 0.05);
      function chop(node, base, depth) { var g = ctx.createGain(); g.gain.value = base; var m = ctx.createGain(); m.gain.value = depth; sh.connect(m); m.connect(g.gain); node.disconnect(); node.connect(g); g.connect(G); }
      var k = r1 / 300, kk0 = r0 / 300;
      // «воп-воп»: низкий удар лопасти и шумовой срез воздуха
      chop(bed(G, r, a, b, { n: 'b', fl: [{ t: 'lowpass', f: 170 }], g: 2.6 }), 0.12, 1.6);
      chop(bed(G, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 320, q: 0.7 }], g: 2.2 }), 0.15, 1.5);
      chop(bed(G, r, a, b, { n: 'w', fl: [{ t: 'bandpass', f: inside ? 900 : 1500, q: 0.6 }], g: inside ? 0.25 : 0.4 }), 0.25, 1.3);
      // турбина: узкополосный шум (не синус), частота идёт за оборотами
      var tb1 = bed(G, r, a, b, { n: 'w', fl: [{ t: 'bandpass', f: 410 * kk0, f1: 410 * k, ft: rd, q: 9 }], g: 1.5, gw: [0.8, 1, 1.2] });
      var tb2 = bed(G, r, a, b, { n: 'w', fl: [{ t: 'bandpass', f: 2350 * kk0, f1: 2350 * k, ft: rd, q: 16 }, { t: 'bandpass', f: 2350 * kk0, f1: 2350 * k, ft: rd, q: 5 }], g: inside ? 0.5 : 0.7, gw: [0.7, 1, 0.8] });
      bed(G, r, a, b, { n: 'p', fl: [{ t: 'lowpass', f: 900 }], g: 0.35, gw: [0.7, 1, 0.6] }); // общий гул
      if (inside) { // кабина: низкая вибрация корпуса и дребезг обшивки
        var GI = span(a, b, { pan: o.pan, gain: LV.heli * (o.gain == null ? 1 : o.gain), rev: 0.25, fadeIn: o.fadeIn == null ? 0.5 : o.fadeIn, fadeOut: o.fadeOut == null ? 0.8 : o.fadeOut });
        bed(GI, r, a, b, { n: 'b', fl: [{ t: 'lowpass', f: 130 }], g: 2.2, gw: [0.6, 1, 2.5] });
        var rat = bed(GI, r, a, b, { n: 'w', fl: [{ t: 'bandpass', f: 1700, q: 2.5 }], g: 0.09, gw: [0.2, 1, 3] });
        var g2 = ctx.createGain(); g2.gain.value = 0.1; var m2 = ctx.createGain(); m2.gain.value = 1.4; sh.connect(m2); m2.connect(g2.gain);
        rat.disconnect(); rat.connect(g2); g2.connect(GI);
      }
    };

    S.heliLand = function (t, o) {
      o = o || {};
      var r = rg('heliLand', t, o), G = grp({ pan: o.pan, gain: LV.heliLand * (o.gain == null ? 1 : o.gain), rev: 0.25 });
      var hit = function (tt, a) {
        tn(G, tt, { f: 78, f1: 40, ft: 0.1, a: 0.004, tau: 0.14, dur: 0.7, g: 0.9 * a });
        nz(G, r, tt, { n: 'p', fl: [{ t: 'lowpass', f: 600, f1: 180, ft: 0.1 }], a: 0.003, tau: 0.07, dur: 0.4, g: 2.2 * a });
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: 1400, q: 0.8 }], a: 0.001, tau: 0.02, dur: 0.1, g: 0.3 * a });
        modes(G, r, tt, [[212, 0.12 * a, 0.16], [347, 0.07 * a, 0.12], [561, 0.04 * a, 0.08], [1240, 0.015 * a, 0.04]]); // полозья
        for (var i = 0; i < 4; i++) nz(G, r, tt + 0.04 + i * 0.03 * (0.8 + 0.4 * r()), { fl: [{ t: 'bandpass', f: 1800 + 1200 * r(), q: 2.5 }], a: 0.0005, tau: 0.005, dur: 0.03, g: 0.25 * a * Math.pow(0.7, i) });
      };
      hit(t, 1); hit(t + 0.3 + 0.05 * r(), 0.45); // жёсткая посадка: подскок
      nz(G, r, t + 0.06, { fl: [{ t: 'bandpass', f: 760, f1: 520, q: 14 }], a: 0.05, tau: 0.12, dur: 0.45, g: 2 }); // скрип стоек
      nz(G, r, t + 0.02, { n: 'p', fl: [{ t: 'lowpass', f: 2600, f1: 450, ft: 0.9 }], a: 0.1, tau: 0.5, dur: 1.8, g: 0.6 }); // пыль
    };

    // =====================================================================
    //  АТМОСФЕРЫ
    // =====================================================================
    S.ambience = function (kind, a, b, o) {
      o = o || {};
      var r = rg('amb' + kind, a, o), dur = b - a, lvl = LV.ambience * (o.gain == null ? 1 : o.gain);
      var G = span(a, b, { gain: lvl, bus: ambBus, fadeIn: o.fadeIn, fadeOut: o.fadeOut });
      var GL = span(a, b, { gain: lvl, bus: ambBus, pan: -0.6, fadeIn: o.fadeIn, fadeOut: o.fadeOut }), GR = span(a, b, { gain: lvl, bus: ambBus, pan: 0.6, fadeIn: o.fadeIn, fadeOut: o.fadeOut });
      var t, i;
      if (kind === 'bunker') {
        bed(G, r, a, b, { n: 'b', fl: [{ t: 'lowpass', f: 240 }], g: 3.2, gw: [0.8, 1, 0.3] }); // вентиляция
        bed(GL, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 142, q: 5 }], g: 2.6, gw: [0.7, 1, 0.4] }); // короб
        bed(GR, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 318, q: 6 }], g: 1.0, gw: [0.6, 1, 0.5] });
        bed(G, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 700, q: 0.5 }], g: 0.22, gw: [0.7, 1, 0.3] }); // воздух
        bed(GR, r, a, b, { n: 'w', fl: [{ t: 'bandpass', f: 100, q: 22 }], g: 5, gw: [0.75, 1, 0.8] }); // лампа: гул 100 Гц…
        bed(GR, r, a, b, { n: 'w', fl: [{ t: 'bandpass', f: 200, q: 28 }], g: 1.6, gw: [0.6, 1, 1.2] });
        bed(GR, r, a, b, { n: 'w', fl: [{ t: 'highpass', f: 5500 }], g: 0.008, gw: [0.4, 1, 2] }); // …и зуд дросселя
      } else if (kind === 'cabin') {
        bed(G, r, a, b, { n: 'b', fl: [{ t: 'lowpass', f: 160 }], g: 3, gw: [0.7, 1, 1.5] });
        bed(G, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 270, q: 3 }], g: 1.2, gw: [0.6, 1, 1] });
        bed(G, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 900, q: 0.5 }], g: 0.2, gw: [0.7, 1, 0.5] });
        for (t = a + 0.4 + r(); t < b - 0.3; t += 0.5 + 1.8 * r()) // редкие побрякивания
          nz(r() > 0.5 ? GL : GR, r, t, { fl: [{ t: 'bandpass', f: 1500 + 1800 * r(), q: 3 }], a: 0.0006, tau: 0.006, dur: 0.03, g: 0.5 + 0.5 * r() });
      } else if (kind === 'field' || kind === 'zone') {
        var z = kind === 'zone';
        // ветер с порывами: и громкость, и «высота» шума плавают
        bed(G, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 500, q: 0.7 }], fw: [z ? 260 : 340, z ? 700 : 950, 0.3], g: 2.4, gw: [0.25, 1, 0.3] });
        bed(GL, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 800, q: 1.2 }], fw: [500, 1400, 0.45], g: 0.8, gw: [0.1, 1, 0.5] });
        bed(GR, r, a, b, { n: 'w', fl: [{ t: 'highpass', f: 2800 }, { t: 'lowpass', f: 7000 }], g: 0.045, gw: [0.1, 1, 0.6] }); // трава
        bed(G, r, a, b, { n: 'b', fl: [{ t: 'lowpass', f: 150 }], g: 1.6, gw: [0.4, 1, 0.4] });
        if (!z && o.crickets !== false) { // сверчки: узкополосный шум, тройные «чирки»
          for (i = 0; i < 2; i++) {
            var cf = i ? 4750 : 4150, D = i ? GR : GL;
            for (t = a + 0.3 + r() * 0.5; t < b - 0.2; t += 0.42 + 0.3 * r() + (r() > 0.85 ? 1.2 * r() : 0))
              for (var k = 0; k < 3; k++) nz(D, r, t + k * 0.03, { fl: [{ t: 'bandpass', f: cf, q: 30 }, { t: 'bandpass', f: cf, q: 8 }], dur: 0.022, shape: 'bell', g: 7 });
          }
        }
        if (!z && o.birds !== false) { // редкая птица вдали — «дышащий» свист, тихо
          for (t = a + 1.5 + 3 * r(); t < b - 0.8; t += 3.5 + 4 * r()) {
            var bf = 2700 + 900 * r(), D2 = r() > 0.5 ? GL : GR, nn = 2 + Math.floor(r() * 2);
            for (i = 0; i < nn; i++) nz(D2, r, t + i * 0.15, { fl: [{ t: 'bandpass', f: bf, f1: bf * (i % 2 ? 0.82 : 1.25), q: 26 }, { t: 'bandpass', f: bf, f1: bf * (i % 2 ? 0.82 : 1.25), q: 8 }], dur: 0.09, shape: 'bell', g: 9 });
          }
        }
        if (z) { // далёкая канонада: глухие раскаты и редкие дальние очереди
          for (t = a + 0.6 + 1.5 * r(); t < b - 1; t += 1.4 + 2.8 * r()) {
            var D3 = r() > 0.5 ? GL : GR, p = 0.8 + 0.4 * r(), am = 0.5 + 0.5 * r();
            nz(D3, r, t, { n: 'b', fl: [{ t: 'lowpass', f: 260 * p, f1: 80, ft: 0.8 }], a: 0.04, tau: 0.35, dur: 1.6, g: 9 * am });
            tn(D3, t, { f: 74 * p, f1: 42, ft: 0.3, a: 0.03, tau: 0.3, dur: 1.2, g: 1.6 * am });
            if (r() > 0.6) nz(D3, r, t + 0.35 + 0.3 * r(), { n: 'b', fl: [{ t: 'lowpass', f: 200, f1: 70, ft: 0.8 }], a: 0.06, tau: 0.3, dur: 1.4, g: 5 * am });
            if (r() > 0.55) S.burst(t + 0.5 + r(), 3 + Math.floor(r() * 4), { dist: 'far', pan: r() * 1.6 - 0.8, gain: 0.3, bus: ambBus, rate: 9 });
          }
        }
      } else if (kind === 'aftermath') { // тлеющая тишина
        bed(G, r, a, b, { n: 'b', fl: [{ t: 'lowpass', f: 260 }], g: 2.4, gw: [0.4, 1, 0.25] });
        bed(G, r, a, b, { n: 'p', fl: [{ t: 'bandpass', f: 420, q: 0.7 }], fw: [280, 600, 0.2], g: 1.0, gw: [0.2, 1, 0.25] });
        bed(GL, r, a, b, { n: 'w', fl: [{ t: 'highpass', f: 4200 }], g: 0.012, gw: [0.2, 1, 0.8] }); // шипение углей
        for (t = a + 0.1; t < b - 0.1; t += 0.05 + 0.5 * r() * r()) // потрескивание
          nz(r() > 0.5 ? GL : GR, r, t, { fl: [{ t: 'bandpass', f: 1200 + 3800 * r(), q: 1.2 }], a: 0.0004, tau: 0.003, dur: 0.006 + 0.012 * r(), g: 0.25 + 1.1 * r() * r() });
        for (t = a + 1 + 2 * r(); t < b - 0.3; t += 1.5 + 3 * r()) // оседает камешек
          nz(r() > 0.5 ? GL : GR, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 500 + 600 * r(), q: 1.5 }], a: 0.002, tau: 0.02, dur: 0.09, g: 2 });
      }
    };

    // =====================================================================
    //  МУЗЫКА (тихая подложка; сетка долей — от общего времени ролика)
    // =====================================================================
    function gridBeats(a, b, bpm, fn) { // fn(tЛокальное, номерДоли)
      var beat = 60 / bpm, k = Math.ceil((a + partStart) / beat - 1e-6);
      for (; k * beat - partStart < b - 0.05; k++) fn(k * beat - partStart, k, beat);
    }
    function tuba(dst, t, m, d, g, cents) {
      var f = mtof(m) * Math.pow(2, (cents || 0) / 1200);
      tn(dst, t, { wave: W_TUBA, f: f * 0.985, bend: [[0.05, f], [d, f * 0.99]], lp: { t: 'lowpass', f: 700, f1: 380, ft: d }, a: 0.03, tau: d * 0.9, dur: d, g: g });
    }
    function snare(dst, r, t, g) {
      nz(dst, r, t, { fl: [{ t: 'bandpass', f: 2100, q: 0.6 }], a: 0.001, tau: 0.045, dur: 0.16, g: g });
      nz(dst, r, t, { n: 'p', fl: [{ t: 'bandpass', f: 230, q: 1.5 }], a: 0.001, tau: 0.03, dur: 0.1, g: g * 2.2 });
    }
    function tine(dst, r, t, m, g) { // язычок музыкальной шкатулки
      var f = mtof(m) * Math.pow(2, (r() - 0.5) * 8 / 1200);
      tn(dst, t, { f: f, a: 0.002, tau: 0.42, dur: 1.5, g: g });
      tn(dst, t, { f: f * 2.76, a: 0.001, tau: 0.09, dur: 0.4, g: g * 0.1 });
      tn(dst, t, { f: f * 5.4, a: 0.001, tau: 0.03, dur: 0.12, g: g * 0.035 });
      nz(dst, r, t, { fl: [{ t: 'bandpass', f: 2600, q: 1.5 }], a: 0.0004, tau: 0.003, dur: 0.014, g: g * 0.25 });
    }
    S.music = function (kind, a, b, o) {
      o = (typeof b === 'object' ? b : o) || {};
      var r = rg('mus' + kind, a, o), lvl = LV.music * (o.gain == null ? 1 : o.gain);
      if (kind === 'fanfareSad') return fanfare(a, r, lvl);
      var G = span(a, b, { gain: lvl, bus: musBus, rev: 0.25, fadeIn: o.fadeIn == null ? 0.3 : o.fadeIn, fadeOut: o.fadeOut == null ? 0.7 : o.fadeOut });
      if (kind === 'march') {
        // вялый ироничный марш: туба «ум-па», малый барабан с ленивой дробью
        var PR = [0, 0, 1, 0, 2, 2, 0, 0], BASS = [[46, 41], [39, 46], [41, 48]], PAH = [[62, 65], [63, 67], [60, 63]];
        gridBeats(a, b, o.bpm || 92, function (t, k, beat) {
          var bar = Math.floor(k / 4), bb = ((k % 4) + 4) % 4, ch = PR[((bar % 8) + 8) % 8], lazy = bar % 4 === 3;
          if (bb === 0 || bb === 2) {
            var m = BASS[ch][bb === 0 ? 0 : 1]; if (bar % 8 === 7 && bb === 2) m = 45; // ленивый подход
            tuba(G, t + (lazy ? 0.02 : 0), m, beat * 0.82, 0.8, lazy ? -18 : 0);
            if (bb === 0) { tn(G, t, { f: 74, f1: 44, ft: 0.08, a: 0.004, tau: 0.08, dur: 0.35, g: 0.5 }); nz(G, r, t, { n: 'p', fl: [{ t: 'lowpass', f: 300 }], a: 0.003, tau: 0.04, dur: 0.2, g: 1.2 }); }
          } else {
            var late = lazy ? 0.045 : 0.012, det = lazy ? -30 : 0;
            for (var i = 0; i < 2; i++) { var f = mtof(PAH[ch][i]) * Math.pow(2, det / 1200);
              tn(G, t + late, { wave: W_BRASS, f: f, lp: { t: 'lowpass', f: 1300, f1: 600, ft: 0.2 }, a: 0.02, tau: 0.08, dur: 0.26, g: 0.13 }); }
            snare(G, r, t + late * 0.5, 0.22);
            if (bb === 3 && bar % 2 === 1) { snare(G, r, t + beat - 0.19, 0.08); snare(G, r, t + beat - 0.1, 0.11); }
          }
        });
      } else if (kind === 'tender') {
        // нежная музыкальная шкатулка, вальс 3/4
        var MEL = [[76, 79, 84], [83, 79, 76], [77, 81, 84], [83, 81, 79], [76, 79, 84], [86, 84, 83], [81, 77, 74], [72, 0, 0]];
        var LOW = [60, 55, 53, 55, 60, 55, 53, 60], MID = [[64, 67], [62, 67], [65, 69], [62, 65], [64, 67], [62, 67], [65, 69], [64, 67]];
        gridBeats(a, b, o.bpm || 126, function (t, k) {
          var bar = ((Math.floor(k / 3) % 8) + 8) % 8, bb = ((k % 3) + 3) % 3, j = (r() - 0.5) * 0.012;
          if (MEL[bar][bb]) tine(G, r, t + j, MEL[bar][bb], 0.5 * (0.85 + 0.3 * r()));
          if (bb === 0) tine(G, r, t + j + 0.004, LOW[bar], 0.4);
          else { tine(G, r, t + j + 0.006, MID[bar][0], 0.16); tine(G, r, t + j + 0.018, MID[bar][1], 0.14); }
        });
      }
    };
    function fanfare(t, r, lvl) {
      // кривая победная фанфара: бодро начали, верхняя нота не дотянута и оседает
      var G = grp({ gain: lvl * 1.5, bus: musBus, rev: 0.35 });
      var N = [[67, 0, 0.15], [67, 0.19, 0.15], [67, 0.38, 0.15], [72, 0.57, 0.48], [76, 1.1, 0.26], [79, 1.42, 1.5]];
      for (var v = 0; v < 2; v++) for (var i = 0; i < N.length; i++) {
        var n = N[i], last = i === N.length - 1, f = mtof(n[0] - (v ? (i >= 3 ? 4 : 5) : 0)) * Math.pow(2, (v ? 14 : 0) / 1200), d = n[2];
        var o2 = { wave: W_BRASS, f: f * 0.97, bend: [[0.035, f]], lp: { t: 'lowpass', f: 500, f1: 2200, ft: 0.05, f2: last ? 500 : 1100 }, a: 0.018, tau: last ? 0.7 : d * 1.2, dur: d + 0.12, g: v ? 0.22 : 0.34 };
        if (last) { // не дотянул: на 55 центов ниже и медленно сползает, дрожит
          var ff = f * Math.pow(2, (v ? -85 : -55) / 1200);
          o2.f = ff * 0.96; o2.bend = [[0.05, ff], [0.5, ff * 0.992], [d + 0.12, ff * (v ? 0.93 : 0.955)]]; o2.vib = [5.2, ff * 0.012, 0.3];
        }
        tn(G, t + n[1] + (v ? 0.022 : 0), o2);
      }
      for (var k = 0; k < 4; k++) snare(G, r, t + [0, 0.19, 0.38, 0.57][k], k === 3 ? 0.3 : 0.18);
      for (var q = 0; q < 9; q++) snare(G, r, t + 1.42 + q * 0.062 * (1 + q * 0.06), 0.16 * Math.pow(0.8, q)); // дробь выдыхается
      tn(G, t + 0.57, { f: 80, f1: 46, ft: 0.08, a: 0.004, tau: 0.1, dur: 0.4, g: 0.6 });
    }
    S.sting = function (t, o) {
      o = o || {};
      var r = rg('sting', t, o), G = grp({ pan: o.pan, gain: LV.sting * (o.gain == null ? 1 : o.gain), bus: musBus, rev: 0.3 });
      var P = [[[62, 0], [69, 0], [43, 0.15]], [[65, 0], [59, 0.11], [48, 0.24]], [[57, 0], [64, 0], [38, 0.17]], [[67, 0], [61, 0.12]]];
      var pat = P[o.variant != null ? o.variant % 4 : Math.floor(r() * 4)];
      for (var i = 0; i < pat.length; i++) { // пиццикато: щипок + быстро глохнущая струна + дека
        var f = mtof(pat[i][0]), tt = t + pat[i][1], low = pat[i][0] < 50;
        tn(G, tt, { wave: W_PIZZ, f: f * 1.012, f1: f, ft: 0.03, lp: { t: 'lowpass', f: low ? 1600 : 3000, f1: low ? 300 : 600, ft: 0.16 }, a: 0.002, tau: low ? 0.16 : 0.1, dur: low ? 0.7 : 0.45, g: low ? 0.9 : 0.5 });
        nz(G, r, tt, { n: 'p', fl: [{ t: 'bandpass', f: 320, q: 2 }], a: 0.001, tau: 0.02, dur: 0.1, g: 1.2 });
        nz(G, r, tt, { fl: [{ t: 'bandpass', f: 2400, q: 1 }], a: 0.0004, tau: 0.003, dur: 0.015, g: 0.2 });
      }
    };

    // =====================================================================
    //  ДАКИНГ И МАСТЕР
    // =====================================================================
    function insertDuck(chain, a, b, depthDb, att, rel) {
      var n = ctx.createGain(), v = dB(-depthDb), s = Math.max(0, T(a) - att);
      n.gain.value = 1; n.gain.setValueAtTime(1, s); n.gain.linearRampToValueAtTime(v, Math.max(s + 0.01, T(a)));
      n.gain.setValueAtTime(v, T(b)); n.gain.linearRampToValueAtTime(1, T(b) + rel);
      chain.tail.disconnect(pre); chain.tail.connect(n); n.connect(pre); chain.tail = n;
    }
    // приглушить фон под реплику: amount — дБ для музыки/атмосферы; эффекты опускаются на 40 % от этого
    S.duck = function (a, b, amount, o) {
      o = o || {};
      var d = amount == null ? 8 : amount;
      insertDuck(chainBg, a, b, d, o.attack || 0.15, o.release || 0.4);
      var fx = o.fx == null ? d * 0.4 : o.fx;
      if (fx > 0) insertDuck(chainFx, a, b, fx, o.attack || 0.15, o.release || 0.4);
    };
    S.duckLines = function (lines, amount, o) {
      if (!lines || !lines.length) return;
      var L = lines.slice().sort(function (x, y) { return x.t - y.t; }), a = L[0].t, b = L[0].t + L[0].dur;
      for (var i = 1; i < L.length; i++) {
        if (L[i].t - b < 0.6) b = Math.max(b, L[i].t + L[i].dur); // близкие реплики — одним провалом
        else { S.duck(a, b, amount, o); a = L[i].t; b = L[i].t + L[i].dur; }
      }
      S.duck(a, b, amount, o);
    };
    S.fadeOut = function (t, dur) { fade.gain.setValueAtTime(1, T(t)); fade.gain.linearRampToValueAtTime(0, T(t) + (dur || 0.5)); };
    S.fadeIn = function (t, dur) { fade.gain.setValueAtTime(0, T(t)); fade.gain.linearRampToValueAtTime(1, T(t) + (dur || 0.3)); };

    // низкоуровневый доступ для своих звуков сцены
    S.noise = function (t, o) { var r = rg('custom', t, o); return nz(grp({ pan: o.pan, gain: o.gain, rev: o.rev }), r, t, o); };
    S.tone = function (t, o) { return tn(grp({ pan: o.pan, gain: o.gain, rev: o.rev }), t, o); };
    return S;
  }

  root.SFX = { init: init, levels: LV, version: 1 };
})(typeof window !== 'undefined' ? window : this);
