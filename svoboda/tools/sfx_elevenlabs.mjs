// SFX сцены 1 через ElevenLabs sound-generation.
// Запуск: set -a; . ../.env; set +a; node tools/sfx_elevenlabs.mjs [id ...]   (без id — все; существующие файлы пропускаются, FORCE=1 — перезаписать)
// Ключ — только из env ELEVENLABS_API_KEY.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'video', 'public', 'audio');
fs.mkdirSync(outDir, { recursive: true });
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('нет ELEVENLABS_API_KEY'); process.exit(1); }

// id, длительность (сек, 0.5..30), prompt_influence, кадр сцены 1, описание
export const SFX = [
  { id: 'sirens',        dur: 12,  frame: '01-02', text: 'Distant police and ambulance sirens wailing in a big city at night, overlapping, with faint chaos and echo between buildings' },
  { id: 'rockets',       dur: 4,   frame: '01',    text: 'Multiple rockets whooshing and hissing through the air overhead, fast fly-by with doppler effect' },
  { id: 'supercar',      dur: 6,   frame: '01-02', text: 'Powerful supercar engine roaring at full throttle racing past, aggressive V8 growl with tire screech, doppler fly-by' },
  { id: 'explosions',    dur: 8,   frame: '01',    text: 'Distant explosions rumbling across a city at night, several muffled booms with low rumble and debris' },
  { id: 'hit_crunch',    dur: 2,   frame: '02',    text: 'Juicy heavy crunch of a car bumper smashing into a body, bone-crunching impact, cartoonish and meaty' },
  { id: 'bass_drop',     dur: 3,   frame: '02',    text: 'Deep cinematic sub-bass drop impact with long reverb tail, then everything goes muffled' },
  { id: 'slowmo_hum',    dur: 5,   frame: '02',    text: 'Muffled underwater-like low drone and hum, slow-motion time-slowdown atmosphere, deep warbling' },
  { id: 'body_thud',     dur: 1.5, frame: '03',    text: 'Dull heavy thud of a body flopping flat onto asphalt pavement, single hit' },
  { id: 'billboard_click', dur: 2, frame: '04',    text: 'Loud sharp digital click and bright chime of a giant electronic billboard flipping its clock digits' },
  { id: 'unplug_glitch', dur: 2.5, frame: '05',    text: 'Sound of a plug being yanked out of a wall socket, electric zap, followed by a digital glitch and data-corruption burst, then abrupt silence' },
  { id: 'crickets',      dur: 12,  frame: '05-06', text: 'Quiet night ambience with crickets chirping in a deserted empty street, very calm and eerie' },
  { id: 'water_drip',    dur: 8,   frame: '05-06', text: 'Slow water dripping from a pipe or gutter in a quiet empty alley, echoing single drops' },
  { id: 'shoulder_pop',  dur: 1.5, frame: '06',    text: 'Loud sickening bone crack and pop of a dislocated shoulder being snapped back into place' },
  { id: 'spit',          dur: 1,   frame: '06',    text: 'Short wet spit sound, a person spitting something out onto pavement, then a tiny tooth clink' },
  { id: 'tooth_clink',   dur: 1,   frame: '06',    text: 'Tiny hard tooth falling and clinking on asphalt, small ping and bounce' },
];

const only = process.argv.slice(2);
let fail = 0;
for (const s of SFX) {
  if (only.length && !only.includes(s.id)) continue;
  const f = path.join(outDir, `sfx_${s.id}.mp3`);
  if (fs.existsSync(f) && fs.statSync(f).size > 1000 && !process.env.FORCE) { console.log('skip', s.id); continue; }
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: s.text, duration_seconds: s.dur, prompt_influence: 0.5 }) });
  if (!r.ok) {
    console.error('ERR', s.id, r.status, (await r.text()).slice(0, 200));
    if (r.status === 401) { console.error('ключ не принят — останов'); process.exit(2); }
    fail++; continue;
  }
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); console.log('OK', f);
}
process.exit(fail ? 1 : 0);
