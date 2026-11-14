// Генерация озвучки через Google AI Studio (Gemini 3.8 Flash TTS, v1beta). Запуск: node tts.mjs [id ...]
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES, VOICES } from './lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const voiceDir = path.join(__dirname, 'audio', 'voice');
fs.mkdirSync(voiceDir, { recursive: true });

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: 'v1beta',
  httpOptions: { apiVersion: 'v1beta' },
});

const only = process.argv.slice(2);
const todo = LINES.filter(l => {
  if (only.length) return only.includes(l.id);
  const p = path.join(voiceDir, `${l.id}.wav`);
  if (!fs.existsSync(p)) return true;
  const ageMin = (Date.now() - fs.statSync(p).mtimeMs) / 60000;
  return ageMin > 10;
});

async function gen(l, attempt = 1) {
  const model = attempt === 1 ? 'gemini-3.8-flash-lite-tts' : (attempt === 2 ? 'gemini-3.1-flash-tts-preview' : 'gemini-2.5-flash-preview-tts');
  try {
    const it = await client.interactions.create({
      model,
      input: [{
        type: 'user_input',
        content: [{
          type: 'text',
          text: l.text,
          annotations: [{ type: 'speech_metadata', style: l.style + '. Говорит по-русски.' }],
        }],
      }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: VOICES[l.who] }] },
    });
    if (!it.output_audio?.data) throw new Error('нет аудио в ответе');
    let buf = Buffer.from(it.output_audio.data, 'base64');
    if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf, 24000);
    const outPath = path.join(voiceDir, `${l.id}.wav`);
    fs.writeFileSync(outPath, buf);
    console.log('OK', l.id, buf.length, 'bytes', it.output_audio.mime_type || 'audio/wav');
  } catch (e) {
    console.error('ERR', l.id, attempt, e.message);
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 2500 * attempt));
      return gen(l, attempt + 1);
    }
  }
}

function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

for (let i = 0; i < todo.length; i += 4) {
  await Promise.all(todo.slice(i, i + 4).map(l => gen(l)));
}
console.log('done', todo.length);
