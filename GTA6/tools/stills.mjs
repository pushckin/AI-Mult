// Быстрый рендер кадров + контактный лист.
// node tools/stills.mjs <Part1|Part2> <t1,t2,...|cue:ID[+сдвиг],...> <out.png> [--cols=3] [--scale=0.5]
// Время в секундах от начала части, либо cue:p1_pm1+0.5 (от начала cue), cueend:p1_pm1-0.2 (от конца).
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.join(__dirname, '..', 'video');
const req = (m) => import(path.join(VIDEO, 'node_modules', m, 'dist', 'index.js'));
const { bundle } = await req('@remotion/bundler');
const { renderStill, selectComposition } = await req('@remotion/renderer');

const [comp, spec, outArg, ...rest] = process.argv.slice(2);
if (!comp || !spec || !outArg) { console.log('usage: node tools/stills.mjs Part1 1.5,cue:p1_pm1+0.5 out.png [--cols=3] [--scale=0.5]'); process.exit(1); }
const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split('=')));
const cols = +(opt.cols ?? 3), scale = +(opt.scale ?? 0.5);
const tl = fs.readFileSync(path.join(VIDEO, 'src', 'data', 'timeline.ts'), 'utf8');
const TL = JSON.parse(tl.match(/export const TIMELINE[^=]*= (.*);\n/)[1]);
const pid = comp.startsWith('Part1') ? 'p1' : 'p2';
const times = spec.split(',').map((s) => {
  const m = s.match(/^(cue|cueend):([\w]+)([+-][\d.]+)?$/);
  if (!m) return +s;
  const c = TL[pid].cues[m[2]]; if (!c) throw new Error('нет cue ' + m[2]);
  return (m[1] === 'cue' ? c.start : c.end) + (m[3] ? +m[3] : 0);
});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stills-'));
const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src', 'index.ts'), outDir: path.join(tmp, 'bundle'), onProgress: () => {} });
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions: { gl: 'angle' }, logLevel: 'error' });
const files = [];
for (const [i, t] of times.entries()) {
  const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(t * composition.fps)));
  const f = path.join(tmp, `f${String(i).padStart(3, '0')}.png`);
  await renderStill({ serveUrl, composition, frame, output: f, browserExecutable, chromiumOptions: { gl: 'angle' }, scale, logLevel: 'error' });
  files.push(f);
  console.log('кадр', t.toFixed(2) + 'с', '#' + frame);
}
const out = path.resolve(outArg);
fs.mkdirSync(path.dirname(out), { recursive: true });
if (files.length === 1) fs.copyFileSync(files[0], out);
else {
  const rows = Math.ceil(files.length / cols);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(tmp, 'f%03d.png'), '-vf', `tile=${cols}x${rows}:padding=8:color=white`, '-frames:v', '1', out]);
  if (r.status) console.error(r.stderr.toString());
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('→', out);
