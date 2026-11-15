// Проверка озвучки: транскрипция всех реплик через Gemini. Запуск: node check_voice.mjs
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES } from './lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1beta', httpOptions: { apiVersion: 'v1beta' } });
const parts = [{ type: 'text', text: 'Для каждого аудио по порядку: дословно транскрибируй русскую речь, оцени длительность пауз внутри (есть ли длинные паузы > 0.5 с), язык и есть ли индийский акцент. Формат: id | транскрипт | паузы | акцент.' }];
for (const l of LINES.filter((x) => x.who)) {
  const p = path.join(__dirname, 'audio', 'tmp', `${l.id}.wav`);
  parts.push({ type: 'text', text: `id=${l.id}` });
  parts.push({ type: 'audio', mime_type: 'audio/wav', data: fs.readFileSync(p).toString('base64') });
}
const it = await client.interactions.create({ model: 'gemini-4-hydrogen', input: [{ type: 'user_input', content: parts }] });
console.log(it.output_text);
