/* Тайминги: сцены пишутся в «номинальных» секундах сценария (NOM), а затем растягиваются
   коэффициентом k под реальную озвучку (voice_timings.js -> window.VOICE_TIMINGS).
   G.mk(i) — создать сцену i (0..6). Губка-переход занимает последние 1.8 c реального времени сцены. */
(function () {
  const NOM = [15, 35, 35, 30, 35, 35, 15];
  const VT = window.VOICE_TIMINGS;
  let ST, END;
  if (VT && VT.starts && VT.starts.length === 7) { ST = VT.starts.slice(); END = VT.end; }
  else { ST = []; let t = 0; for (const d of NOM) { ST.push(t); t += d; } END = t; }
  const INTRO = 2.8, OUTRO = 4.5;
  const P = (x, y, s = 1, r = 0) => `translate(${x},${y}) scale(${s})${r ? ` rotate(${r})` : ''}`;
  const sc = [];
  const mk = (i, outro = 'sponge') => {
    const end = i < 6 ? ST[i + 1] : END;
    const s = E.scene(ST[i], end, outro, (end - ST[i]) / NOM[i]); sc[i] = s; return s;
  };
  // абсолютное время ролика (с заставкой) для номинальной секунды lt сцены i
  const abs = (i, lt) => { const end = i < 6 ? ST[i + 1] : END; return INTRO + ST[i] + lt * (end - ST[i]) / NOM[i]; };
  window.G = { NOM, ST, END, INTRO, OUTRO, P, mk, abs, lerp: (a, b, p) => a + (b - a) * p };
  window.sceneAbs = abs;
})();
