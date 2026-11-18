// Озвучка через Gemini TTS. Запуск: node tts.mjs [id ...]  (без аргументов — только отсутствующие)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, rest, pcmToWav } from './gemini.mjs';
import { voicedLines } from './lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const voiceDir = path.join(__dirname, 'audio', 'voice');
fs.mkdirSync(voiceDir, { recursive: true });
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];
const only = process.argv.slice(2);
const todo = voicedLines().filter((l) => (only.length ? only.some((o) => l.id.startsWith(o)) : !fs.existsSync(path.join(voiceDir, `${l.id}.wav`))));

async function viaInteractions(model, l) {
  const it = await client.interactions.create({
    model,
    input: [{ type: 'user_input', content: [{ type: 'text', text: l.text, annotations: [{ type: 'speech_metadata', style: l.style + '. Говорит по-русски, мужской голос.' }] }] }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: l.voice }] },
  });
  if (!it.output_audio?.data) throw new Error('нет аудио');
  return Buffer.from(it.output_audio.data, 'base64');
}
async function viaRest(model, l) {
  const j = await rest(model, {
    contents: [{ parts: [{ text: `Произнеси по-русски (${l.style}): ${l.text}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: l.voice } } } },
  });
  const d = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!d) throw new Error('нет аудио');
  return Buffer.from(d, 'base64');
}
async function gen(l) {
  for (const model of MODELS) for (const fn of [viaInteractions, viaRest]) {
    try {
      let buf = await fn(model, l);
      if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf, 24000);
      fs.writeFileSync(path.join(voiceDir, `${l.id}.wav`), buf);
      console.log('OK', l.id, model, fn.name, (buf.length / 48000).toFixed(2) + 's');
      return;
    } catch (e) { console.error('ERR', l.id, model, fn.name, e.message.slice(0, 160)); }
  }
}
for (let i = 0; i < todo.length; i += 4) await Promise.all(todo.slice(i, i + 4).map(gen));
console.log('done', todo.length);
