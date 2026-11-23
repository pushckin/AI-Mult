// Рендер кадров: Puppeteer (Chromium) → JPEG → FFmpeg (H.264). Параллельно по диапазонам кадров.
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'child_process';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dir = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const FPS = 30, WORKERS = +arg('workers', 4);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((q, s) => { const f = path.join(__dir, 'public', q.url === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); s.end(d); } }); });
await new Promise(r => server.listen(0, r)); const url = `http://127.0.0.1:${server.address().port}/`;
const browsers = [];
// темп анимации каждой сцены подгоняется под длину озвучки (если она есть): k = реальная длина / расчётная
const SC = [[15, 2], [30, 2], [35, 2], [40, 2], [35, 2], [30, 2], [15, 3]];
const K = SC.map(([dur, sp], i) => { const f = path.join(__dir, `audio/voice/s${i + 1}.wav`); if (!fs.existsSync(f) || arg('nokscale', null)) return 1;
  const v = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
  return (v + .3 + .8) / (dur - sp); });
console.log('K:', K.map(x => x.toFixed(2)).join(' '));
async function openPage() { const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] }); browsers.push(browser); const p = await browser.newPage(); await p.evaluateOnNewDocument(k => { window.SCENE_K = k; }, K); await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); p.on('pageerror', e => console.log('PAGEERR', e.message)); await p.goto(url); await p.waitForFunction('window.READY===true', { timeout: 60000 }); return p; }
const p0 = await openPage();
const tl = await p0.evaluate(() => getTimeline());
fs.writeFileSync(path.join(__dir, 'timeline.json'), JSON.stringify(tl, null, 1));
const total = Math.round(tl.total * FPS);
const still = arg('still', null);
if (still != null) { // --still T [--out file]
  await p0.evaluate(T => renderFrame(T), +still);
  await p0.screenshot({ path: arg('out', `still_${still}.png`), type: 'png' }); await Promise.all(browsers.map(b => b.close())); server.close(); process.exit(0);
}
const from = +arg('from', 0), to = Math.min(+arg('to', total), total);
const tmp = path.join(__dir, 'build'); fs.mkdirSync(tmp, { recursive: true });
const per = Math.ceil((to - from) / WORKERS); const chunks = [];
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = from + w * per, bnd = Math.min(to, a + per); if (a >= bnd) return;
  const page = w === 0 ? p0 : await openPage(); const out = path.join(tmp, `chunk_${String(w).padStart(2, '0')}.mp4`); chunks.push(out);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < bnd; f++) {
    await page.evaluate(T => renderFrame(T), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 150 === 0) console.log(`w${w}: ${f - a}/${bnd - a}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}));
await Promise.all(browsers.map(b => b.close())); server.close();
chunks.sort(); fs.writeFileSync(path.join(tmp, 'list.txt'), chunks.map(c => `file '${c}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', path.join(tmp, 'video_silent.mp4')]);
console.log('готово: build/video_silent.mp4');
