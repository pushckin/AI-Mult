// Пословная транскрипция реплик через Gemini audio understanding -> out/censor/work/<name>.json
// Запуск: set -a; . ../.env; set +a; NODE_USE_ENV_PROXY=1 node tools/censor_transcribe.mjs [model]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = process.env.AUDIO_DIR || path.join(__dirname, '..', 'video', 'public', 'audio');
const SUFFIX = process.env.SUFFIX || 'gemini'; // для проверки цензурных wav: AUDIO_DIR=out/censor/audio SUFFIX=verify PROMPT=...
const outDir = path.join(__dirname, '..', 'out', 'censor', 'work');
fs.mkdirSync(outDir, { recursive: true });
const MODELS = (process.argv[2] || 'gemini-3.5-flash,gemini-3-flash-preview,gemini-3.7-flash,gemini-3.6-flash,gemini-flash-latest').split(',');
const MODEL = MODELS[0]; // имя файла результата — по ключу 'flash'
const only = process.env.ONLY; const files = fs.readdirSync(audioDir).filter(f => /^voice_.*\.wav$/.test(f) && (!only || f.includes(only))).sort();
const prompt = process.env.PROMPT || 'Это русская речь (мультфильм для взрослых, много нецензурной лексики). Дословно, БЕЗ цензуры и без замен транскрибируй речь, включая все матерные слова в точном виде. ' +
  'Верни JSON-массив объектов {"w": слово, "s": начало в секундах, "e": конец в секундах}: каждое слово отдельно, время от начала записи, с точностью до 0.01 с. Только JSON.';
for (const f of files) {
  const out = path.join(outDir, f.replace('.wav', `.${SUFFIX}.json`));
  if (fs.existsSync(out) && !process.env.FORCE) { console.log('skip', f); continue; }
  // 16 кГц моно: Gemini всё равно ресемплит, а запрос выходит втрое меньше
  const data = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(audioDir, f), '-ac', '1', '-ar', '16000', '-f', 'wav', '-'], { maxBuffer: 1 << 28 }).toString('base64');
  const body = { contents: [{ parts: [{ inlineData: { mimeType: 'audio/wav', data } }, { text: prompt }] }],
    generationConfig: { responseMimeType: process.env.PROMPT ? 'text/plain' : 'application/json', temperature: 0 },
    safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(c => ({ category: c, threshold: 'BLOCK_NONE' })) };
  let ok = false;
  for (let a = 1; a <= 12 && !ok; a++) {
    const model = MODELS[(a - 1) % MODELS.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) }).catch(e => ({ status: 0, json: async () => ({ err: String(e) }) }));
    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
    if (!txt) { console.error('FAIL', f, a, r.status, JSON.stringify(j).slice(0, 200)); await new Promise(res => setTimeout(res, r.status === 429 ? 20000 : 1500)); continue; }
    fs.writeFileSync(out, txt); console.log('OK', f, model, txt.length); ok = true;
  }
}
