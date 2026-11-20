// Музыка сцены 1 через Lyria. Запуск: set -a; . ../.env; set +a; node tools/music_lyria.mjs [model]
// ВНИМАНИЕ: на free tier ключа Lyria даёт 429 (limit 0) — нужен платный тариф.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const model = process.argv[2] || 'lyria-3-clip-preview';
const prompt = 'Instrumental only, no vocals. Tense dark 1980s synthwave underscore for a chaotic night-city action scene: pulsing analog bass arpeggio at 130 BPM, urgent driving drums with gated reverb, ominous detuned saw pads, siren-like synth stabs, relentless and anxious. Loopable.';
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO', 'TEXT'] } }) });
const j = await r.json();
const p = j?.candidates?.[0]?.content?.parts?.find(x => x.inlineData);
if (!p) { console.error('FAIL', r.status, JSON.stringify(j).slice(0, 300)); process.exit(1); }
const ext = p.inlineData.mimeType.includes('mpeg') ? 'mp3' : 'wav';
const out = path.join(__dirname, '..', 'video', 'public', 'audio', `music_s1.${ext}`);
fs.writeFileSync(out, Buffer.from(p.inlineData.data, 'base64')); console.log('OK', out);
