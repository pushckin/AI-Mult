// render-v.cjs — покадровый рендер вертикальных сцен 1080×1920 (GSAP-таймлайн + контракт __sound).
// Каждый кадр: tl.seek(i/fps) + скриншот, поэтому ничего не дёргается и не теряется.
//
//   node tools/render-v.cjs out.mp4 scenes/s1.html [scenes/s2.html …]
//   FPS=30        частота кадров
//   FROM=3 TO=8   рендер куска (секунды сцены; только при одной сцене)
//   SCALE=0.5     черновик 540×960 (быстрее в ~3 раза)
//   JOBS=3        сколько страниц рендерят сцену параллельно (кусками подряд)
//   Стоп-кадры:   T=2.5,7,12.3 node tools/render-v.cjs out/shot.jpg scenes/s1.html  → out/shot-02.50.jpg …
const path = require("path"), fs = require("fs"), { spawn } = require("child_process");
const { chromium } = require("playwright");
const [out, ...parts] = process.argv.slice(2);
if (!out || !parts.length) { console.error("usage: node tools/render-v.cjs out.mp4 scene.html [...]"); process.exit(1); }
const fps = +(process.env.FPS || 30), W = 1080, H = 1920;
const SCALE = +(process.env.SCALE || 1), OW = Math.round(W * SCALE / 2) * 2, OH = Math.round(H * SCALE / 2) * 2;
const FROM = process.env.FROM ? +process.env.FROM : null, TO = process.env.TO ? +process.env.TO : null;
const JOBS = Math.max(1, +(process.env.JOBS || 3));
const STILLS = process.env.T ? process.env.T.split(",").map(Number) : null;
const SR = 48000;

// звук страницы → base64 PCM s16le stereo (выполняется в странице)
const wavOf = (dur) => (async (dur) => {
  const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  if (window.__sound) window.__sound(ctx, 0);
  const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
  const o = new Int16Array(n * 2);
  for (let i = 0; i < n; i++) { o[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; o[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  let s = ""; const u = new Uint8Array(o.buffer);
  for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
  return btoa(s);
})(dur);

const run = (cmd, args) => new Promise((res, rej) => spawn(cmd, args, { stdio: "inherit" }).on("close", (c) => (c ? rej(new Error(cmd + " exit " + c)) : res())));
const seekTo = (p, t) => p.evaluate((t) => { window.__timelines.main.seek(t, false); if (window.Stage && window.Stage.sync) window.Stage.sync(); }, t);

(async () => {
  const b = await chromium.launch({ headless: true, args: ["--mute-audio", "--allow-file-access-from-files", "--disable-web-security"] });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const open = async (file) => {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
    p.on("pageerror", (e) => console.log("PAGEERR", path.basename(file), e.message));
    p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", path.basename(file), m.text()); });
    await p.goto("file://" + path.resolve(file), { waitUntil: "domcontentloaded" });
    for (let k = 0; k < 150 && !(await p.evaluate(() => !!(window.__timelines && window.__timelines.main))); k++) await new Promise((r) => setTimeout(r, 200));
    if (!(await p.evaluate(() => !!(window.__timelines && window.__timelines.main)))) throw new Error("нет window.__timelines.main в " + file);
    await p.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
    const info = await p.evaluate(async () => {
      if (window.Stage && window.Stage.whenReady) await window.Stage.whenReady();
      for (const el of document.querySelectorAll("button")) if (/старт/i.test(el.textContent)) el.style.display = "none";
      const r = document.getElementById("root"), rect = r.getBoundingClientRect();
      return { dur: +r.dataset.duration || window.__timelines.main.duration(), x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    });
    if (Math.abs(info.w - W) > 1 || Math.abs(info.h - H) > 1) console.log("ВНИМАНИЕ: #root не 1080×1920 в окне рендера:", info.w, info.h);
    return { p, info };
  };

  // ---------- стоп-кадры ----------
  if (STILLS) {
    const { p, info } = await open(parts[0]);
    const ext = path.extname(out) || ".jpg", base = out.slice(0, out.length - path.extname(out).length);
    for (const t of STILLS) {
      await seekTo(p, t);
      const f = `${base}-${t.toFixed(2).padStart(5, "0")}${ext}`;
      await p.screenshot({ path: f, type: ext === ".png" ? "png" : "jpeg", ...(ext === ".png" ? {} : { quality: 90 }), clip: { x: info.x, y: info.y, width: info.w, height: info.h }, animations: "allow" });
      console.log("still", f);
    }
    await b.close(); return;
  }

  const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), ".render-"));
  const segs = [], pcm = [];
  let segN = 0;
  for (const file of parts) {
    const first = await open(file);
    const info = first.info;
    const t0 = parts.length === 1 && FROM != null ? Math.max(0, FROM) : 0;
    const t1 = parts.length === 1 && TO != null ? Math.min(info.dur, TO) : info.dur;
    const f0 = Math.round(t0 * fps), f1 = Math.round(t1 * fps), n = f1 - f0;
    console.log("part", path.basename(file), "dur", info.dur, "frames", n, `(${t0}…${t1} s)`, `${OW}x${OH}`, "jobs", Math.min(JOBS, n));
    // звук (вся сцена, потом вырезаем кусок)
    const bytesAll = Math.round(info.dur * SR) * 4;
    let buf;
    try { buf = Buffer.from(await first.p.evaluate(wavOf, info.dur), "base64").subarray(0, bytesAll); }
    catch (e) { console.log("SOUND BROKEN (тишина):", e.message.split("\n")[0]); buf = Buffer.alloc(bytesAll); }
    if (buf.length < bytesAll) buf = Buffer.concat([buf, Buffer.alloc(bytesAll - buf.length)]);
    const a0 = Math.round(f0 / fps * SR) * 4, a1 = Math.round(f1 / fps * SR) * 4;
    pcm.push(buf.subarray(a0, Math.min(a1, buf.length))); if (a1 > buf.length) pcm.push(Buffer.alloc(a1 - buf.length));
    // кадры: JOBS страниц, каждая идёт по своему куску подряд
    const jobs = Math.min(JOBS, Math.max(1, n)), per = Math.ceil(n / jobs);
    let done = 0;
    const work = async (k, pg) => {
      const a = f0 + k * per, z = Math.min(f1, a + per); if (a >= z) { if (pg) await pg.close(); return null; }
      const p = pg || (await open(file)).p;
      const seg = path.join(tmp, `seg${String(segN + k).padStart(4, "0")}.mp4`);
      const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
        "-vf", `scale=${OW}:${OH}:flags=lanczos`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", SCALE < 1 ? "22" : "16", "-preset", SCALE < 1 ? "veryfast" : "medium", "-r", String(fps), seg], { stdio: ["pipe", "inherit", "inherit"] });
      const clip = { x: info.x, y: info.y, width: info.w, height: info.h };
      for (let i = a; i < z; i++) {
        await seekTo(p, i / fps);
        const shot = await p.screenshot({ type: "jpeg", quality: 93, clip, animations: "allow" });
        if (!ff.stdin.write(shot)) await new Promise((r) => ff.stdin.once("drain", r));
        if (++done % 60 === 0) console.log("  кадров", done, "/", n);
      }
      ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await p.close();
      return seg;
    };
    const res = await Promise.all(Array.from({ length: jobs }, (_, k) => work(k, k === 0 ? first.p : null)));
    res.filter(Boolean).forEach((s) => segs.push(s)); segN += jobs;
  }
  fs.writeFileSync(path.join(tmp, "list.txt"), segs.map((s) => `file '${s}'`).join("\n"));
  fs.writeFileSync(path.join(tmp, "a.pcm"), Buffer.concat(pcm));
  await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), "-f", "s16le", "-ar", String(SR), "-ac", "2", "-i", path.join(tmp, "a.pcm"),
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  await b.close(); console.log("done", out);
})().catch((e) => { console.error(e); process.exit(1); });
