// SFX сцены 2 через ElevenLabs sound-generation.
// Запуск: set -a; . ../.env; set +a; NODE_USE_ENV_PROXY=1 node tools/sfx_s2.mjs [id ...]   (существующие пропускаются, FORCE=1 — перезаписать)
// Ключ — только из env ELEVENLABS_API_KEY.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'video', 'public', 'audio');
fs.mkdirSync(outDir, { recursive: true });
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('нет ELEVENLABS_API_KEY'); process.exit(1); }

// id, длительность (сек), кадр сцены 2, описание
export const SFX = [
  { id: 'fire_crackle',  dur: 8,   frame: '07',    loop: true, text: 'Crackling fire burning in a metal trash can, steady fire crackle and pops, seamless loop, close up' },
  { id: 'bush_rustle',   dur: 1.5, frame: '09',    text: 'Sudden loud rustle of leaves and bushes as a person leaps out of a hedge, branches snapping' },
  { id: 'megaphone_siren', dur: 2, frame: '09',    text: 'Shrill piercing police megaphone siren wail, loud cheap handheld bullhorn siren' },
  { id: 'megaphone_feedback', dur: 1.5, frame: '09', text: 'Loud ear-piercing microphone feedback squeal and high-pitched whistle from a megaphone' },
  { id: 'megaphone_click', dur: 0.8, frame: '11',  text: 'Single plastic click of a handheld megaphone being switched off, button click and short electronic dying pop' },
  { id: 'sobs',          dur: 3,   frame: '08',    text: 'Short quiet sobbing and sniffling of a grown man crying, a few sniffles and whimpers' },
  { id: 'heavy_steps',   dur: 2,   frame: '12',    text: 'Slow heavy footsteps of a huge muscular man walking on concrete pavement, three or four deep thuds, ominous' },
  { id: 'vending_thump', dur: 2,   frame: '12',    text: 'Dull heavy thump against a metal vending machine followed by a clatter of scuffling and shuffling, cans rattling inside' },
  { id: 'city_night_ambience', dur: 12, frame: '10-12', text: 'Quiet eerie night city ambience, very distant low traffic hum, rare crickets chirping, light uneasy tension, empty street' },
  { id: 'hug_rustle',    dur: 1,   frame: '08',    text: 'Soft fabric rustle of clothes as two people hug tightly, cloth shuffling and a gentle pat on the back' },
];

const only = process.argv.slice(2);
let fail = 0;
for (const s of SFX) {
  if (only.length && !only.includes(s.id)) continue;
  const f = path.join(outDir, `sfx_s2_${s.id}.mp3`);
  if (fs.existsSync(f) && fs.statSync(f).size > 1000 && !process.env.FORCE) { console.log('skip', s.id); continue; }
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: s.text, duration_seconds: s.dur, prompt_influence: 0.5, ...(s.loop ? { loop: true } : {}) }) });
  if (!r.ok) {
    console.error('ERR', s.id, r.status, (await r.text()).slice(0, 200));
    if (r.status === 401) { console.error('ключ не принят — останов'); process.exit(2); }
    fail++; continue;
  }
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); console.log('OK', f);
}
process.exit(fail ? 1 : 0);
