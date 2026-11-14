import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refsDir = path.join(__dirname, 'assets', 'refs');
const outDir = path.join(__dirname, 'assets', 'nano_s1');
fs.mkdirSync(outDir, { recursive: true });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: 'v1beta',
  httpOptions: { apiVersion: 'v1beta' },
});

function loadRef(name) {
  const b64 = fs.readFileSync(path.join(refsDir, name)).toString('base64');
  return { type: 'image', mime_type: 'image/png', data: b64 };
}

const TASKS = [
  {
    name: 'bg_s1_office.png',
    aspect_ratio: '9:16',
    refs: ['ref_trench_zone.png', 'ref_briefing.png'],
    prompt:
      'Create a clean 2D flat vector cartoon background illustration in the EXACT art style, line weight, and warm golden-ochre color palette of the reference images (thick dark brown outlines #231A12, flat cel-shaded colors, warm mustard/amber morning sky with a big soft pale-yellow sun, soft vignette). The scene shows a city street in the morning with the facade of a multi-story office building in the center featuring large rectangular glass windows, green cartoon trees, a streetlamp, a sidewalk curb, and an asphalt road in the lower third. Do NOT include any characters, people, vehicles, or UI text overlays.',
  },
  {
    name: 'bg_s1_street_chase.png',
    aspect_ratio: '16:9',
    refs: ['ref_field_walk.png', 'ref_trench_zone.png'],
    prompt:
      'Create a wide 2D flat vector cartoon side-scrolling street background illustration in the EXACT art style, line weight, and warm golden-sunset color palette of the reference images (thick dark brown outlines #231A12, warm amber-orange sunset sky with glowing low sun, stylized 2D city apartment buildings and shopfronts in the background, green trees and streetlamps along a flat horizontal sidewalk and asphalt road across the bottom third). Do NOT include any characters, people, vehicles, or text overlays.',
  },
  {
    name: 'bg_s1_crossroads.png',
    aspect_ratio: '9:16',
    refs: ['ref_briefing.png', 'ref_trench_zone.png'],
    prompt:
      'Create a 2D flat vector cartoon background illustration in the EXACT art style, line weight, and warm golden-ochre color palette of the reference images (thick dark brown outlines #231A12, flat cel-shading). The scene shows a city crossroads in front of a large electronics store building. The store has a bold yellow sign at the top reading "ЭЛЕКТРОНИКА", large glass display windows glowing warmly with game console boxes and "GTA VI" posters inside, wide open dark entrance doors in the center, and a flat asphalt street intersection across the lower third. Do NOT include any people, characters, or vehicles.',
  },
  {
    name: 'bg_s1_fire_street.png',
    aspect_ratio: '9:16',
    refs: ['ref_trench_zone.png', 'ref_explosion.png'],
    prompt:
      'Create a 2D flat vector cartoon background illustration in the EXACT art style, line weight, and warm ochre color palette of the reference images (thick dark brown outlines #231A12, flat cel-shading). On the left side of the street is a two-story kindergarten building with a sign "ДЕТСАД" that is on fire, with stylized 2D cartoon orange/yellow flames and dark smoke clouds rising from the windows and roof. On the right side is a residential apartment building entrance with a sign "ПОДЪЕЗД" and a wide open dark doorway over a flat sidewalk and asphalt road in the lower third. Do NOT include any people, characters, or vehicles.',
  },
  {
    name: 'spr_van.png',
    aspect_ratio: '16:9',
    refs: ['ref_helicopter.png', 'ref_field_walk.png'],
    prompt:
      'Create an isolated 2D flat vector cartoon side-view illustration of an olive-green armored cash transport van facing right, in the EXACT art style and thick dark-brown outline (#231A12) of the reference images. The van has a yellow horizontal stripe on the side with black text "ИНКАССАЦИЯ", tinted blue-cyan front windshield, heavy armored doors, and dark cartoon wheels. Place the van centered on a completely flat, solid, uniform bright green chroma-key background (#00FF00) with NO ground shadow, NO road, and NO background objects.',
  },
  {
    name: 'spr_firetruck.png',
    aspect_ratio: '16:9',
    refs: ['ref_helicopter.png', 'ref_field_walk.png'],
    prompt:
      'Create an isolated 2D flat vector cartoon side-view illustration of a red fire truck facing right, in the EXACT art style and thick dark-brown outline (#231A12) of the reference images. The fire truck has a white stripe with bold text "ПОЖАРНАЯ 01", a beige ladder on the roof, red and blue emergency lights on the cab roof, and dark cartoon wheels. Place the fire truck centered on a completely flat, solid, uniform bright green chroma-key background (#00FF00) with NO ground shadow, NO road, and NO background objects.',
  },
];

const only = process.argv.slice(2);
const todo = TASKS.filter(t => (only.length ? only.includes(t.name) : true));

async function generateOne(task) {
  const models = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];
  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Generating ${task.name} with ${model} (attempt ${attempt})...`);
        const input = [
          { type: 'text', text: task.prompt },
          ...task.refs.map(loadRef),
        ];
        const interaction = await ai.interactions.create({
          model,
          input,
          response_format: {
            type: 'image',
            aspect_ratio: task.aspect_ratio,
          },
        });
        const img = interaction.output_image;
        if (!img || !img.data) {
          throw new Error('No output_image in response');
        }
        const buf = Buffer.from(img.data, 'base64');
        const outPath = path.join(outDir, task.name);
        fs.writeFileSync(outPath, buf);
        console.log('SAVED', task.name, buf.length, 'bytes via', model);
        return true;
      } catch (err) {
        console.error('ERR', task.name, model, attempt, err.message);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  return false;
}

for (const task of todo) {
  const outPath = path.join(outDir, task.name);
  if (fs.existsSync(outPath) && !only.length) {
    console.log('SKIP existing', task.name);
    continue;
  }
  await generateOne(task);
}
