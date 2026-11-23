// Сведение звука: озвучка по сценам (или voiceover.mp3 из корня) + звуковые эффекты ElevenLabs по таймлайну.
// Читает timeline.json (его пишет render.mjs), собирает build/master.wav и накладывает на видео.
import fs from 'fs'; import { execFileSync, spawnSync } from 'child_process';
const SR = 48000, tl = JSON.parse(fs.readFileSync('timeline.json', 'utf8'));
const N = Math.ceil(tl.total * SR), mix = new Float32Array(N);
const decode = f => { const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 29 }); const b = r.stdout; return new Float32Array(b.buffer, b.byteOffset, b.length >> 2).slice(); };
const put = (buf, t, vol = 1, maxLen) => { const s0 = Math.round(t * SR), len = Math.min(buf.length, maxLen ?? buf.length); for (let i = 0; i < len && s0 + i < N; i++) mix[s0 + i] += buf[i] * vol; };
// звуковые эффекты
const cache = {}; const sfx = n => cache[n] ??= (fs.existsSync(`audio/sfx/${n}.mp3`) ? decode(`audio/sfx/${n}.mp3`) : null);
let ev = 0;
for (const sc of tl.scenes) {
  const evs = [...sc.events]; evs.push({ name: 'sponge', t: sc.dur - sc.sponge, vol: 1 });
  const seen = new Set();
  for (const e of evs) {
    if (e.name === 'sponge' && seen.has('sponge')) continue; if (e.name === 'sponge') seen.add('sponge');
    const b = sfx(e.name); if (!b) continue;
    const t = sc.start + e.t;
    if (e.name === 'scribble') { // растягиваем шорох маркера на длительность рисования (с зацикливанием), плавное вкл/выкл
      const len = Math.round((e.dur ?? 1) * SR), loop = new Float32Array(len);
      for (let i = 0; i < len; i++) { const f = Math.min(1, i / (.06 * SR), (len - i) / (.12 * SR)); loop[i] = b[i % b.length] * f; }
      put(loop, t, (e.vol ?? 1) * .55);
    } else if (e.name === 'sponge') put(b, t, (e.vol ?? 1) * .8, Math.round(sc.sponge * SR));
    else put(b, t, (e.vol ?? 1) * .7);
    ev++;
  }
}
console.log('эффектов:', ev);
// голос
const VOL = 1.0; let voiced = false;
if (fs.existsSync('voiceover.mp3')) { put(decode('voiceover.mp3'), 0, VOL); voiced = true; console.log('голос: voiceover.mp3'); }
else {
  tl.scenes.forEach((sc, i) => {
    const f = `audio/voice/s${i + 1}.wav`; if (!fs.existsSync(f)) return;
    let v = decode(f); const slot = sc.dur - sc.sponge + 1.2 - .3; // до конца губки
    const dur = v.length / SR;
    if (dur > slot) { const tempo = Math.min(1.3, dur / slot); const tmp = `build/v${i + 1}.wav`; execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-af', `atempo=${tempo.toFixed(4)}`, tmp]); v = decode(tmp); console.log(`сцена ${i + 1}: голос ${dur.toFixed(1)}с > слота ${slot.toFixed(1)}с, ускорение x${tempo.toFixed(2)}`); }
    else console.log(`сцена ${i + 1}: голос ${dur.toFixed(1)}с, слот ${slot.toFixed(1)}с`);
    put(v, sc.start + .3, VOL); voiced = true;
  });
}
// ducking не нужен: эффекты тихие; лимитер по пику
let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(mix[i]));
const g = pk > .95 ? .95 / pk : 1; for (let i = 0; i < N; i++) mix[i] *= g;
const pcm = Buffer.alloc(N * 2); for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i])) * 32767), i * 2);
fs.writeFileSync('build/master.pcm', pcm);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 's16le', '-ar', String(SR), '-ac', '1', '-i', 'build/master.pcm', 'build/master.wav']);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', 'build/video_silent.mp4', '-i', 'build/master.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', 'final_ai_chatgpt.mp4']);
console.log(voiced ? 'готово: final_ai_chatgpt.mp4 (с голосом и эффектами)' : 'готово: final_ai_chatgpt.mp4 (эффекты без голоса — озвучка не найдена)');
