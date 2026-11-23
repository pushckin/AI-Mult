// Генерация звуковых эффектов через ElevenLabs Sound Generation (ключ подставляет прокси окружения)
import fs from 'fs';
const SFX = {
  scribble: ['felt marker drawing quick scribble on a whiteboard, dry squeaky', 2.0],
  pop:      ['cartoon speech bubble pop, short bubbly', 0.6],
  sponge:   ['wet sponge wiping across a whiteboard, smooth long swoosh', 2.0],
  snip:     ['scissors snip cut, two quick snips', 0.8],
  ding:     ['bright positive success ding chime', 1.0],
  buzzer:   ['cartoon error buzzer wrong answer', 1.0],
  stamp:    ['heavy rubber stamp thump on paper', 0.8],
  sparkle:  ['magic sparkle twinkle glissando', 1.5],
  boing:    ['cartoon spring boing', 0.8],
  whoosh:   ['light fast whoosh swish', 0.8],
  bulb:     ['light bulb switching on, bright ping and glow', 1.2],
  typing:   ['smartphone keyboard taps typing quickly', 1.5],
  drop:     ['small paper items dropping into a funnel, soft thuds', 1.5],
  click:    ['marker cap click, tiny', 0.5],
};
import { spawnSync } from 'child_process';
fs.mkdirSync('audio/sfx', { recursive: true });
for (const [name, [text, dur]] of Object.entries(SFX)) {
  const out = `audio/sfx/${name}.mp3`;
  if (fs.existsSync(out) && fs.statSync(out).size > 2000) continue;
  const body = JSON.stringify({ text, duration_seconds: dur, prompt_influence: 0.5 });
  const r = spawnSync('curl', ['-s', '-m', '90', '-X', 'POST', 'https://api.elevenlabs.io/v1/sound-generation',
    '-H', 'Content-Type: application/json', '-d', body, '-o', out, '-w', '%{http_code}']);
  const code = r.stdout.toString();
  if (code !== '200') { console.log(name, 'ERR', code, fs.existsSync(out) ? fs.readFileSync(out, 'utf8').slice(0, 200) : ''); fs.rmSync(out, { force: true }); continue; }
  console.log('ok', name);
}
