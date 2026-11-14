// Рендер ТОЛЬКО Сцены 1 в вертикальном формате YouTube Shorts (1080x1920, 24 FPS)
// С предзагрузкой фонов и спрайтов из Nano Banana
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, FPS, G, preloadNanoAssets, vignette, screen, drawShortsSubtitle } from './engine_shorts.mjs';
import { drawScene1Shorts } from './scene1_shorts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nanoDir = path.join(__dirname, 'assets', 'nano_s1');

await preloadNanoAssets({
  bg_s1_office:       { path: path.join(nanoDir, 'bg_s1_office.png'), chroma: false },
  bg_s1_street_chase: { path: path.join(nanoDir, 'bg_s1_street_chase.png'), chroma: false },
  bg_s1_crossroads:   { path: path.join(nanoDir, 'bg_s1_crossroads.png'), chroma: false },
  bg_s1_fire_street:  { path: path.join(nanoDir, 'bg_s1_fire_street.png'), chroma: false },
  spr_van:            { path: path.join(nanoDir, 'spr_van.png'), chroma: true },
  spr_firetruck:      { path: path.join(nanoDir, 'spr_firetruck.png'), chroma: true },
});

const tl = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));
const duration = tl.scenes.s1.end;
const totalFrames = Math.ceil(duration * FPS);

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const previews = [
  { name: 'preview_shorts_s1_0_window.png', frame: Math.round(2.0 * FPS) },
  { name: 'preview_shorts_s1_0_break.png', frame: Math.round(4.65 * FPS) },
  { name: 'preview_shorts_s1_1.png', frame: Math.round((tl.cues.s1_boss + 1.2) * FPS) },
  { name: 'preview_shorts_s1_2.png', frame: Math.round((tl.cues.s1_crash + 1.8) * FPS) },
  { name: 'preview_shorts_s1_3.png', frame: Math.round((tl.cues.s1_fire_shot + 2.4) * FPS) },
];

const outVideo = path.join(__dirname, 'scene1_shorts.mp4');
const audioPath = path.join(__dirname, 'audio', 's1_master.wav');

const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-pixel_format', 'rgba',
  '-video_size', `${W}x${H}`,
  '-framerate', String(FPS),
  '-i', 'pipe:0',
  '-i', audioPath,
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '19',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  '-movflags', '+faststart',
  outVideo,
], { stdio: ['pipe', 'ignore', 'pipe'] });

let ffErr = '';
ff.stderr.on('data', d => {
  ffErr = (ffErr + d.toString()).slice(-2000);
});

const ffDone = new Promise((res, rej) => {
  ff.on('close', code => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}\n${ffErr}`))));
});

const s1Lines = Object.values(tl.lines).filter(l => l.end <= duration + 0.5);
function activeLineAt(t) {
  for (const l of s1Lines) {
    if (t >= l.start - 0.05 && t <= l.end + 0.18) {
      const p = (t - l.start) / Math.max(0.1, l.duration);
      return { who: l.who, text: l.text, p: Math.max(0, Math.min(1, p)) };
    }
  }
  return null;
}

const t0 = Date.now();
for (let f = 0; f < totalFrames; f++) {
  G.f = f;
  const t = f / FPS;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  drawScene1Shorts(ctx, t, tl);
  vignette(ctx, 0.42);

  const sub = activeLineAt(t);
  if (sub) {
    drawShortsSubtitle(ctx, sub.who, sub.text, sub.p);
  }

  screen(ctx);

  for (const p of previews) {
    if (f === p.frame) {
      fs.writeFileSync(path.join(__dirname, p.name), canvas.toBuffer('image/png'));
      console.log(`Saved ${p.name} at frame ${f} (${t.toFixed(2)}s)`);
    }
  }

  const raw = ctx.getImageData(0, 0, W, H).data;
  const buf = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  if (!ff.stdin.write(buf)) {
    await new Promise(r => ff.stdin.once('drain', r));
  }

  if ((f + 1) % 150 === 0 || f === totalFrames - 1) {
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Rendered ${f + 1}/${totalFrames} (${(((f + 1) / totalFrames) * 100).toFixed(1)}%) in ${dt}s`);
  }
}

ff.stdin.end();
await ffDone;
console.log('SCENE 1 RENDER COMPLETE:', outVideo);
