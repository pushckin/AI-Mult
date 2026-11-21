// SFX сцен 3 и 4 через ElevenLabs sound-generation.
// Запуск: set -a; . ../.env; set +a; NODE_USE_ENV_PROXY=1 node tools/sfx_s34.mjs [id ...]  (существующие пропускаются, FORCE=1 — перезаписать)
// Звезда розыска (wanted_star) и музыка синтезируются в tools/synth_s34.py.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'video', 'public', 'audio');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('нет ELEVENLABS_API_KEY'); process.exit(1); }
export const SFX = [
  // сцена 3
  { id: 's3_pickup_arrive', dur: 4, text: 'Rusty old pickup truck speeds in and brakes hard with a long loud tire screech and squeaking worn brakes, skidding to a stop, engine rumbling' },
  { id: 's3_door_slam', dur: 1.5, text: 'Two loud heavy rusty metal car doors creaking open and slamming shut with a metallic bang' },
  { id: 's3_crowbar_palm', dur: 2, text: 'Heavy iron crowbar tapping repeatedly against a palm, dull menacing metallic thuds, slow rhythm' },
  { id: 's3_cig_sizzle', dur: 1.5, text: 'Loud sizzle and hiss of a burning cigarette stubbed out against wet paper cardboard, smoldering burn' },
  { id: 's3_crowbar_plastic', dur: 1, text: 'Sharp metallic clank of a crowbar striking a hard plastic megaphone, hollow plastic crack' },
  { id: 's3_tension_sting', dur: 2.5, text: 'Short ominous tense musical sting, dissonant low brass and strings chord, sudden suspense hit' },
  { id: 's3_brawl_vending', dur: 7, text: 'Chaotic scuffle brawl, two men grappling and shoving, grunts, then a hoarse heavy bang against a metal vending machine, cans clattering' },
  { id: 's3_megaphone_feedback', dur: 2, text: 'Loud ear-piercing megaphone microphone feedback squeal and screech with distorted crackle' },
  { id: 's3_shutup_cut', dur: 3, text: 'Chaotic noise of crowd shouting abruptly cut by a loud single bang, then dead silence with a faint echoing reverb tail' },
  // сцена 4
  { id: 's4_patrol_idle', dur: 5, text: 'Police patrol car engine idling quietly, low rumble of a big V8 engine, car rolling slowly and stopping, light brake squeak' },
  { id: 's4_suspension_creak', dur: 1.5, text: 'Creak of a heavy car suspension as a heavy man climbs out of a police car, metal door opening, springs groaning' },
  { id: 's4_heavy_breath', dur: 4, text: 'Heavy labored irregular breathing of a nervous paranoid man, wheezing, trembling gasps close to microphone' },
  { id: 's4_shotgun_safety', dur: 1, text: 'Click of a shotgun safety being switched off, single sharp metallic click' },
  { id: 's4_heartbeat', dur: 5, text: 'Deep heartbeat thumping, accelerating and growing louder, tense suspense, bass thump' },
  { id: 's4_sneeze', dur: 1, text: 'Quiet small cute sneeze of a young woman, soft achoo' },
  { id: 's4_fender_tap', dur: 0.6, text: 'Very quiet tiny metallic tap of an elbow touching a car fender, soft knock' },
  { id: 's4_psycho_violin', dur: 2.5, text: 'Screeching high-pitched horror violin stab, shrieking string glissando like Psycho shower scene' },
  { id: 's4_shotgun_pump', dur: 4, text: 'Shotgun pump action racking clack-clack, then one extremely loud booming shotgun blast at close range, echo' },
  { id: 's4_bin_lid_clang', dur: 1.5, text: 'Loud metallic clang of a heavy garbage dumpster lid slamming shut, rattling' },
  { id: 's4_glass_break', dur: 1.5, text: 'Loud crash and shatter of a car windshield breaking, shards of glass falling' },
  { id: 's4_sirens_ram', dur: 7, text: 'Several police sirens wailing rapidly approaching, tires screeching, then violent crash of cars ramming and crumpling a wooden pickup truck, metal scraping, gunfire' },
  { id: 's4_grenade_blast', dur: 5, text: 'Grenade metal ping clink then a huge powerful explosion of a car blowing up, debris, rumbling fireball' },
  { id: 's4_coffee_spit', dur: 3, text: 'A man takes one sip of coffee, a gulp, then a disgusting spit of liquid, wet splat' },
  { id: 's4_chaos_muffled', dur: 8, text: 'Muffled distant noise of a massive chaotic battle, gunfire, explosions, screams, fire crackling, heard through a wall' },
];
const only = process.argv.slice(2);
let fail = 0;
for (const s of SFX) {
  if (only.length && !only.some(o => s.id.startsWith(o))) continue;
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
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); console.log('OK', s.id);
}
process.exit(fail ? 1 : 0);
