// Финальная громкость мастера сцены до -16 LUFS (true peak -1.5 dB), двухпроходный loudnorm.
// Запуск: node finalize.mjs [N ...] — ПОСЛЕ scene_build/scene1_build (они пишут мастер заново).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'video', 'public', 'audio');
const scenes = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [1, 2, 3, 4, 5];
const T = 'I=-16:TP=-1.5:LRA=9';
for (const n of scenes) {
  const f = path.join(pub, `scene${n}`, `scene${n}_master.wav`);
  const p1 = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', `loudnorm=${T}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /\{[\s\S]*?\}/.exec(p1.stderr);
  const j = JSON.parse(m[0]);
  const tmp = f + '.tmp.wav';
  const af = `loudnorm=${T}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  const p2 = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', tmp], { encoding: 'utf8' });
  if (p2.status !== 0) { console.error(`scene${n}: ошибка`, p2.stderr); continue; }
  fs.renameSync(tmp, f);
  console.log(`scene${n}: ${j.input_i} LUFS → -16 LUFS`);
}
