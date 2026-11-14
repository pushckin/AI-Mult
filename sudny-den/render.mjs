// Покадровый 2D-рендер мультфильма «Судный день, версия 1.0» в MP4. Запуск: node render.mjs
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, FPS, G, vignette, screen } from './engine_hd.mjs';
import { drawScene1, drawScene2 } from './scenes12.mjs';
import { drawScene3, drawScene4, drawSubtitle } from './scenes34.mjs';

const tl = JSON.parse(fs.readFileSync('timeline.json', 'utf8'));
const totalFrames = tl.totalFrames;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const previews = [
  { name: 'preview_s1.png', frame: Math.round((tl.cues.s1_boss + 1.5) * FPS) },
  { name: 'preview_s2.png', frame: Math.round((tl.cues.s2_menu + 1.5) * FPS) },
  { name: 'preview_s3.png', frame: Math.round((tl.cues.s3_maskrip + 1.5) * FPS) },
  { name: 'preview_s4.png', frame: Math.round((tl.cues.s4_oleg_shot + 1.8) * FPS) },
];

const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-pixel_format', 'rgba',
  '-video_size', `${W}x${H}`,
  '-framerate', String(FPS),
  '-i', 'pipe:0',
  '-i', 'audio/master.wav',
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '20',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  '-movflags', '+faststart',
  'sudny_den_v1.mp4',
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

const t0 = Date.now();
for (let f = 0; f < totalFrames; f++) {
  G.f = f;
  const t = f / FPS;

  screen(ctx);
  ctx.clearRect(0, 0, W, H);

  if (t < tl.scenes.s1.end) {
    drawScene1(ctx, t, tl);
  } else if (t < tl.scenes.s2.end) {
    drawScene2(ctx, t, tl);
  } else if (t < tl.scenes.s3.end) {
    drawScene3(ctx, t, tl);
  } else {
    drawScene4(ctx, t, tl);
  }

  if (t < tl.cues.s4_black) vignette(ctx, 0.35);
  drawSubtitle(ctx, tl, t);

  for (const pv of previews) {
    if (f === pv.frame) {
      fs.writeFileSync(pv.name, canvas.toBuffer('image/png'));
      console.log(`Saved ${pv.name} at frame ${f} (${t.toFixed(2)}s)`);
    }
  }

  const raw = canvas.data();
  if (!ff.stdin.write(raw)) {
    await new Promise(r => ff.stdin.once('drain', r));
  }

  if ((f + 1) % 300 === 0 || f === totalFrames - 1) {
    const pct = (((f + 1) / totalFrames) * 100).toFixed(1);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Rendered ${f + 1}/${totalFrames} (${pct}%) in ${elapsed}s`);
  }
}

ff.stdin.end();
await ffDone;
console.log('RENDER COMPLETE: sudny_den_v1.mp4');
