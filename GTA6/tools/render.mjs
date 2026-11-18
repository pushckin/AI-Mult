// Финальный рендер: node tools/render.mjs [Part1 Part1Censored Part2 Part2Censored] [--concurrency=4] [--frames=0-299]
// Выход: GTA6/<имя>.mp4 (H.264, AAC, faststart)
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.join(__dirname, '..', 'video');
const req = (m) => import(path.join(VIDEO, 'node_modules', m, 'dist', 'index.js'));
const { bundle } = await req('@remotion/bundler');
const { renderMedia, selectComposition } = await req('@remotion/renderer');
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const comps = args.filter((a) => !a.startsWith('--'));
const NAMES = { Part1: 'gta6_chast1_vtorzhenie', Part1Censored: 'gta6_chast1_vtorzhenie_censored', Part2: 'gta6_chast2_blackout', Part2Censored: 'gta6_chast2_blackout_censored' };
const list = comps.length ? comps : Object.keys(NAMES);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src', 'index.ts'), outDir: path.join(tmp, 'bundle'), publicDir: path.join(VIDEO, 'public'), onProgress: () => {} });
for (const id of list) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: 'angle' }, logLevel: 'error' });
  const out = opt.out ?? path.join(__dirname, '..', (opt.frames ? 'preview_' : '') + NAMES[id] + '.mp4');
  const t0 = Date.now(); let last = -1;
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation: out, browserExecutable, chromiumOptions: { gl: 'angle' },
    concurrency: +(opt.concurrency ?? 4), crf: 20, audioBitrate: '192k', imageFormat: 'jpeg', jpegQuality: 92, logLevel: 'error',
    frameRange: opt.frames ? opt.frames.split('-').map(Number) : undefined, enforceAudioTrack: true,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log(id, (progress * 100).toFixed(0) + '%', ((Date.now() - t0) / 1000).toFixed(0) + 's'); } },
  });
  console.log('готово', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
fs.rmSync(tmp, { recursive: true, force: true });
