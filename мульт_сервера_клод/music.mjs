// Фоновая музыка через Gemini Lyria (Interactions API). Запуск: node music.mjs
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'audio', 'music');
fs.mkdirSync(outDir, { recursive: true });

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta', httpOptions: { apiVersion: 'v1beta' } });

const TRACKS = [
  {
    id: 'bg_main',
    prompt:
      'Instrumental only, no vocals. Quiet, understated background music for a dark comedy animated short. ' +
      'Starts as glossy, optimistic corporate tech-ad synth (soft pads, light plucks, 100 BPM), ' +
      'then gradually turns into a tense, slightly absurd Indian-flavoured groove with soft tabla, sitar drone and low strings. ' +
      'Low dynamics, sits under dialogue, no big drops, minimal percussion, 50 seconds.',
  },
];

for (const tr of TRACKS) {
  for (const model of ['lyria-3.5', 'lyria-3-clip-preview']) {
    try {
      const it = await client.interactions.create({ model, input: tr.prompt });
      const a = it.output_audio;
      if (!a?.data) throw new Error('нет аудио в ответе');
      const ext = (a.mime_type || '').includes('wav') ? 'wav' : 'mp3';
      const p = path.join(outDir, `${tr.id}.${ext}`);
      fs.writeFileSync(p, Buffer.from(a.data, 'base64'));
      console.log('OK', tr.id, model, a.mime_type, p);
      break;
    } catch (e) {
      console.error('ERR', tr.id, model, e.message);
    }
  }
}
