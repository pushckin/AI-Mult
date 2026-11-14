// Полный покадровый 2D-рендер мультфильма «Судный день, версия 1.0» в формате YouTube Shorts (1080x1920, 24 FPS)
// Запуск: node render_all_shorts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, FPS, G, vignette, screen, drawShortsSubtitle } from './engine_shorts.mjs';
import { drawScene1Shorts } from './scene1_shorts.mjs';
import { drawScene2Shorts } from './scene2_shorts.mjs';
import { drawScene3Shorts } from './scene3_shorts.mjs';
import { drawScene4Shorts } from './scene4_shorts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tl = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));
const totalFrames = tl.totalFrames;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const previews = [
  { name: 'preview_shorts_s1.png', frame: Math.round((tl.cues.s1_crash + 1.8) * FPS) },
  { name: 'preview_shorts_s2.png', frame: Math.round((tl.cues.s2_menu + 1.6) * FPS) },
  { name: 'preview_shorts_s3.png', frame: Math.round((tl.cues.s3_maskrip + 1.5) * FPS) },
  { name: 'preview_shorts_s4.png', frame: Math.round((tl.cues.s4_oleg_shot + 2.0) * FPS) },
];

const outVideo = path.join(__dirname, 'sudny_den_shorts.mp4');
const audioPath = path.join(__dirname, 'audio', 'master.wav');

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
  ffErr = (ffErr + d.toString()).slice(-3000);
});

const ffDone = new Promise((resolve, reject) => {
  ff.on('error', reject);
  ff.on('close', code => {
    if (code === 0) resolve();
    else reject(new Error(`ffmpeg exited with ${code}:\n${ffErr}`));
  });
});

function renderActiveSubtitle(ctx, tl, t) {
  for (const l of Object.values(tl.lines)) {
    if (t >= l.start && t <= l.end) {
      const progress = (t - l.start) / Math.max(0.01, l.duration);
      drawShortsSubtitle(ctx, l.who, l.text, progress, 1460);
      return;
    }
  }
}

const t0 = Date.now();
for (let f = 0; f < totalFrames; f++) {
  G.f = f;
  const t = f / FPS;

  screen(ctx);
  ctx.clearRect(0, 0, W, H);

  if (t < tl.scenes.s1.end) {
    drawScene1Shorts(ctx, t, tl);
  } else if (t < tl.scenes.s2.end) {
    drawScene2Shorts(ctx, t, tl);
  } else if (t < tl.scenes.s3.end) {
    drawScene3Shorts(ctx, t, tl);
  } else {
    drawScene4Shorts(ctx, t, tl);
  }

  if (t < tl.cues.s4_black) {
    vignette(ctx, 0.48);
  }
  renderActiveSubtitle(ctx, tl, t);

  for (const pv of previews) {
    if (f === pv.frame) {
      fs.writeFileSync(path.join(__dirname, pv.name), canvas.toBuffer('image/png'));
      console.log(`Saved ${pv.name} at frame ${f} (${t.toFixed(2)}s)`);
    }
  }

  const raw = canvas.data();
  if (!ff.stdin.write(raw)) {
    await new Promise(r => ff.stdin.once('drain', r));
  }

  if ((f + 1) % 400 === 0 || f === totalFrames - 1) {
    const pct = (((f + 1) / totalFrames) * 100).toFixed(1);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Rendered ${f + 1}/${totalFrames} (${pct}%) in ${elapsed}s`);
  }
}

ff.stdin.end();
await ffDone;
console.log('FULL SHORTS RENDER COMPLETE:', outVideo);
