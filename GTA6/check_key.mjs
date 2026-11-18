// Проверка доступа к Gemini API: node check_key.mjs  (печатает OK и список TTS/картинок/музыки)
import { API_KEY } from './gemini.mjs';
const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=500', { headers: { 'x-goog-api-key': API_KEY } });
const j = await r.json();
if (!r.ok) { console.log('NO', r.status, j.error?.message); process.exit(1); }
console.log('OK', j.models.map((m) => m.name.replace('models/', '')).filter((n) => /tts|image|lyria|banana|imagen/i.test(n)).join(' '));
