// Фоновая музыка через Gemini Lyria (Interactions API). Запуск: node music.mjs [p1|p2] [--force]
// Пишет audio/music/p1_music.(wav|mp3) и p2_music.*; mix.mjs берёт их вместо *_fallback.wav.
// Если ключа/доступа нет — просто печатает ошибку (процедурные заглушки делает music_fallback.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { client } from './gemini.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'audio', 'music');
fs.mkdirSync(outDir, { recursive: true });

const COMMON = 'Instrumental only, no vocals, no choir words, no spoken voice. Background score for a comedic adult cartoon (paper-cutout style), ' +
  'it will sit under dialogue: medium-low dynamics, no long silences, no fade-out at the end, steady energy so it can loop. About 70 seconds.';
const TRACKS = [
  {
    id: 'p1_music',
    prompt:
      'Mock-epic military war-movie underscore, deliberately over-the-top and slightly absurd. D minor, 96 BPM. ' +
      'Low taiko and timpani drums in a driving 3+3+2 pattern, staccato low-string ostinato, sustained dark string pads, ' +
      'heroic brass stabs, a military snare, and a pompous comedic tuba/kazoo-like march melody in the middle section. ' +
      'Feels like a blockbuster invasion trailer played with a wink. ' + COMMON,
  },
  {
    id: 'p2_music',
    prompt:
      'Driving tense electronic countdown music with comedic chaos. E minor, about 123 BPM. ' +
      'Pulsing sidechained saw bass in 16th notes, ticking clock percussion, four-on-the-floor kick, tight hi-hats, ' +
      'arpeggiated synth with dotted-eighth delay, rising noise risers and building tension, ' +
      'occasional silly pitch-falling synth notes and a slide whistle for comedy. Like a heist countdown before everything explodes. ' + COMMON,
  },
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

for (const tr of TRACKS) {
  if (only.length && !only.some((o) => tr.id.startsWith(o))) continue;
  const existing = ['wav', 'mp3'].map((e) => path.join(outDir, `${tr.id}.${e}`)).find((p) => fs.existsSync(p));
  if (existing && !force) { console.log('SKIP (уже есть)', existing); continue; }
  let ok = false;
  for (const model of ['lyria-3.5', 'lyria-3-clip-preview']) {
    try {
      const it = await client.interactions.create({ model, input: tr.prompt });
      const a = it.output_audio ?? it.outputs?.find?.((o) => o?.type === 'audio' || o?.data);
      if (!a?.data) throw new Error('нет аудио в ответе: ' + JSON.stringify(it).slice(0, 200));
      const mime = a.mime_type || a.mimeType || '';
      const ext = mime.includes('wav') ? 'wav' : 'mp3';
      const p = path.join(outDir, `${tr.id}.${ext}`);
      for (const e of ['wav', 'mp3']) { const q = path.join(outDir, `${tr.id}.${e}`); if (q !== p && fs.existsSync(q)) fs.unlinkSync(q); }
      fs.writeFileSync(p, Buffer.from(a.data, 'base64'));
      console.log('OK', tr.id, model, mime, p);
      ok = true;
      break;
    } catch (e) {
      console.error('ERR', tr.id, model, e.message?.slice(0, 300));
    }
  }
  if (!ok) { console.error('FAIL', tr.id, '— остаётся audio/music/' + tr.id.replace('_music', '_fallback.wav')); process.exitCode = 1; }
}
