// Рендер звука kit/sfx.js через OfflineAudioContext в Playwright + замеры.
//   node tools/render-sfx.cjs [showcase firefight mortar scene1]
// На выходе в out/sfx/: <demo>.wav, <demo>.png (спектрограмма), <demo>.txt (замеры);
// для витрины — таблица по каждому звуку и отдельные вырезки cut_<звук>.wav/.png.
const { chromium } = require("playwright");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out", "sfx");
const PAGE = path.join(ROOT, "kit", "demo-sfx.html");
const SR = 48000;
const CUTS = ["shot near", "shot mid", "shot far", "burst near x5", "explosion big", "explosion small", "mortarThump", "shellWhistle",
  "doorSlam", "crunch", "bodyFall heavy", "ricochet", "zap", "heli outside", "heli inside", "amb bunker", "amb field", "music march", "music tender", "music fanfareSad", "terminalBeep", "wireTwang"];

// как wavOf в step-render.cjs скилла, но отдаём float-пики до обрезки
const wavOf = (dur) => (async (dur) => {
  const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  if (window.__sound) window.__sound(ctx, 0);
  const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
  const out = new Int16Array(n * 2); let peak = 0;
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767;
  }
  let s = ""; const u = new Uint8Array(out.buffer);
  for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
  return { b64: btoa(s), peak };
})(dur);

function wavHeader(bytes) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(bytes, 40);
  return h;
}
const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : "-inf");
function stats(pcm, a, b) { // пик, RMS, максимальный скачок между соседними отсчётами (щелчки)
  let pk = 0, sum = 0, n = 0, jump = 0, prevL = 0, prevR = 0;
  const i0 = Math.max(0, Math.floor(a * SR)), i1 = Math.min(pcm.length / 4, Math.floor(b * SR));
  for (let i = i0; i < i1; i++) {
    const l = pcm.readInt16LE(i * 4) / 32768, r = pcm.readInt16LE(i * 4 + 2) / 32768;
    pk = Math.max(pk, Math.abs(l), Math.abs(r)); sum += l * l + r * r; n += 2;
    if (i > i0) jump = Math.max(jump, Math.abs(l - prevL), Math.abs(r - prevR));
    prevL = l; prevR = r;
  }
  return { pk, rms: Math.sqrt(sum / Math.max(1, n)), jump };
}
const ff = (args) => spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8" });
function spec(wav, png, size) {
  ff(["-loglevel", "error", "-i", wav, "-lavfi", `aformat=channel_layouts=mono,showspectrumpic=s=${size || "1400x520"}:scale=log:fscale=log:start=20:stop=16000:drange=96`, png]);
}
function lufs(wav) {
  const r = ff(["-i", wav, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const tail = r.slice(r.lastIndexOf("Summary:"));
  const g = (re) => { const m = tail.match(re); return m ? m[1] : "?"; };
  return { I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const names = process.argv.slice(2).length ? process.argv.slice(2) : ["showcase", "firefight", "mortar", "scene1"];
  const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] })
    .catch(() => chromium.launch({ headless: true, args: ["--mute-audio"] }));
  const p = await b.newPage();
  p.on("pageerror", (e) => console.log("PAGEERR", e.message));
  p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text()); });
  await p.goto("file://" + PAGE, { waitUntil: "load" });
  for (const name of names) {
    const info = await p.evaluate((n) => window.useDemo(n), name);
    const t1 = Date.now();
    const res = await p.evaluate(wavOf, info.dur);
    const pcm = Buffer.from(res.b64, "base64");
    const wav = path.join(OUT, name + ".wav");
    fs.writeFileSync(wav, Buffer.concat([wavHeader(pcm.length), pcm]));
    spec(wav, path.join(OUT, name + ".png"), name === "showcase" ? "2400x520" : "1600x520");
    const all = stats(pcm, 0, info.dur), L = lufs(wav);
    let txt = `== ${name}: ${info.dur.toFixed(2)} с, рендер ${((Date.now() - t1) / 1000).toFixed(1)} с\n` +
      `пик (float, до записи) ${db(res.peak)} dBFS | пик файла ${db(all.pk)} | RMS ${db(all.rms)} | LUFS I ${L.I} | LRA ${L.LRA} | true peak ${L.TP} dBFS\n` +
      `конец файла: RMS последних 20 мс ${db(stats(pcm, info.dur - 0.02, info.dur).rms)} dB\n`;
    if (info.marks.length) {
      txt += "\nзвук                  | пик dBFS | RMS dB | макс. скачок | тишина после (RMS, dB)\n";
      for (const m of info.marks) {
        const s = stats(pcm, m.t - 0.02, m.t + m.d + 0.3), q = stats(pcm, m.t + m.d + 0.38, m.t + m.d + 0.47);
        txt += `${m.name.padEnd(21)} | ${db(s.pk).padStart(8)} | ${db(s.rms).padStart(6)} | ${s.jump.toFixed(3).padStart(12)} | ${db(q.rms)}\n`;
        if (CUTS.includes(m.name)) {
          const cut = path.join(OUT, "cut_" + m.name.replace(/\W+/g, "_"));
          ff(["-loglevel", "error", "-ss", String(Math.max(0, m.t - 0.1)), "-t", String(m.d + 0.4), "-i", wav, cut + ".wav"]);
          spec(cut + ".wav", cut + ".png", "1200x500");
        }
      }
    }
    fs.writeFileSync(path.join(OUT, name + ".txt"), txt);
    console.log(txt);
  }
  await b.close();
})();
