// Gemini image (Nano Banana) пайплайн ассетов сцены 1. Запуск:
//   set -a; . /home/user/AI-Mult/.env; set +a; node gen_assets.mjs [имя ...]
// Порядок: greg_ref -> части Грега (с greg_ref как референсом) -> фон (4 слоя) -> реквизит.
// Все с зелёным #00FF00 фоном -> keyGreen -> PNG RGBA в video/public/img + manifest.json (source:"gemini").
// Если квоты нет (429) - ассет пропускается, остаётся SVG-версия из make_svg_assets.mjs.
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { generate, keyGreen, paperTexture, STYLE, GREEN, RAW, IMG, STYLE_REF, upsertManifest } from './lib.mjs';
import { META } from './assets_meta.mjs';

const GREG =
  'Greg: 40-year-old nervous office worker, balding (bald top, thin brown hair at the sides), left eye twitching (squinted), a deep red stitched scar across the cheek, crumpled beige short-sleeve shirt, crooked red tie, brown trousers, black shoes, a paper coffee cup in the right hand. South Park style: huge round head, tiny dot pupils, no nose.';
const PART = (what, extra = '') =>
  `Using the attached Greg reference for exact design and colors, draw ONLY this one body part of the paper-doll puppet, front view, isolated, rigid (not bent), large and centered: ${what}. ${extra} ${STYLE} ${GREEN}`;
const BG = (what, extra = '') =>
  `Wide 16:9 background LAYER for a night street (Hollywood Boulevard style, "Vinewood"), South Park flat paper-cutout style: ${what}. No characters, no cars, no text overlays except neon signs. ${extra} ${STYLE}`;

const REF = path.join(RAW, 'greg_ref.png');
const T = [
  { name: 'greg_ref', aspect: '3:4', refs: [STYLE_REF], key: true, raw: true,
    prompt: `Full-body front-view character sheet pose of ${GREG} Standing straight, arms at sides. ${STYLE} ${GREEN}` },
  { name: 'greg_head_closed', aspect: '1:1', refs: [REF], key: true, prompt: PART('the head with neck stub, mouth closed in a flat line, eye twitch, scar on cheek, balding') },
  { name: 'greg_head_open', aspect: '1:1', refs: [REF], key: true, prompt: PART('the same head with neck stub but mouth wide open mid-speech (dark mouth, upper teeth, one tooth missing)') },
  { name: 'greg_torso', aspect: '1:1', refs: [REF], key: true, prompt: PART('the torso only: beige short-sleeve shirt with pocket, crooked red tie, belt, no head, no arms, no legs (only short sleeve stubs)') },
  { name: 'greg_arm_left', aspect: '3:4', refs: [REF], key: true, prompt: PART('one arm hanging straight down: short beige sleeve at the top, bare forearm, mitten hand, empty hand') },
  { name: 'greg_arm_right_coffee', aspect: '3:4', refs: [REF], key: true, prompt: PART('one arm hanging straight down: short beige sleeve, forearm, hand gripping a white paper coffee cup with brown sleeve and black lid') },
  { name: 'greg_leg_left', aspect: '3:4', refs: [REF], key: true, prompt: PART('one leg only: brown trouser leg hanging straight, black shoe pointing to the left') },
  { name: 'greg_leg_right', aspect: '3:4', refs: [REF], key: true, prompt: PART('one leg only: brown trouser leg hanging straight, black shoe pointing to the right') },
  { name: 'prop_supercar', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: `Side view facing right, flat paper-cutout chrome supercar (silver/light-blue flat reflection bands, dark windows, black wheels with silver rims, low wedge body). ${STYLE} ${GREEN}` },
  { name: 'prop_alien_driver', aspect: '1:1', refs: [STYLE_REF], key: true, prompt: `Single sprite of a seated driver figure: smooth flesh-colored South Park style body silhouette without any anatomical details, arms stretched forward holding a steering wheel, wearing a grey big-eyed alien mask. Family-friendly. ${STYLE} ${GREEN}` },
  { name: 'prop_oppressor', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: `Side view facing right, flying hover-bike Oppressor Mk II: dark body, big rear jet nozzle with orange flame, swept red wings, missile pod under it. ${STYLE} ${GREEN}` },
  { name: 'prop_rocket', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: `Side view facing right, one cartoon rocket missile, white body, red nose cone, red fins, orange flame trail. ${STYLE} ${GREEN}` },
  { name: 'prop_billboard', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: `Giant electronic billboard on two steel posts, EMPTY black screen inside a thick grey frame with small lamps (no digits, no text). ${STYLE} ${GREEN}` },
  { name: 'prop_dust', aspect: '1:1', refs: [STYLE_REF], key: true, prompt: `A single puff of dust, flat cartoon cloud of beige-grey overlapping round blobs. ${STYLE} ${GREEN}` },
  // фон: слои по отдельности; sky без кеинга
  { name: 'bg_sky', aspect: '16:9', refs: [STYLE_REF], key: false, prompt: BG('ONLY the sky: flat banded dark purple-blue gradient-free night sky, stars, crescent moon, flat pink and cyan neon searchlight beams. Nothing on the ground, no buildings') },
  { name: 'bg_far', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: BG('ONLY distant city skyline buildings (dark blue-violet silhouettes with small lit windows and neon strips) standing at the bottom of the image', GREEN + ' Everything above the skyline is solid green.') },
  { name: 'bg_mid', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: BG('ONLY the mid-ground row of street shop fronts (liquor, pizza, motel, a vegan coffee shop with cup sign) with lit windows, awnings, neon signs, palm trees and a street lamp, standing at the bottom third', GREEN + ' The sky and the ground are solid green.') },
  { name: 'bg_fore', aspect: '16:9', refs: [STYLE_REF], key: true, prompt: BG('ONLY the ground strip: grey concrete sidewalk with paving lines and a puddle, light curb, dark asphalt road with yellow dashes, side view, occupying the bottom 35% of the image', GREEN + ' Everything above the sidewalk is solid green.') },
];

const only = process.argv.slice(2);
for (const t of T.filter((t) => !only.length || only.includes(t.name))) {
  try {
    const rawFile = path.join(RAW, t.name + '.png');
    if (t.name !== 'greg_ref' && !t.refs.every((r) => fs.existsSync(r)) && t.refs.includes(REF)) throw new Error('нет greg_ref (сначала сгенерируйте greg_ref и проверьте глазами)');
    await generate({ prompt: t.prompt, refs: t.refs, aspect: t.aspect, out: rawFile });
    const out = path.join(IMG, t.name + '.png');
    const size = t.key ? await keyGreen(rawFile, out, { trim: !t.name.startsWith('bg_') }) : (await sharp(rawFile).png().toFile(out), await sharp(out).metadata());
    await paperTexture(out, t.name.startsWith('bg_') ? 0.07 : 0.03);
    const m = META[t.name];
    upsertManifest(t.name, { file: t.name + '.png', width: size.width, height: size.height, pivot: m.pivot, group: m.group, note: m.note, source: 'gemini' });
    console.log('OK', t.name, size.width + 'x' + size.height);
  } catch (e) {
    console.error('SKIP', t.name, '-', e.message.slice(0, 160));
  }
}
