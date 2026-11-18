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
// Бесплатный тариф: ~3 запроса/мин на основную модель — идём последовательно и ждём при 429,
// чтобы все голоса были из одной модели (качество одинаковое).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gen(l) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      let buf = await viaInteractions(MODELS[0], l);
      if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf, 24000);
      fs.writeFileSync(path.join(voiceDir, `${l.id}.wav`), buf);
      console.log('OK', l.id, MODELS[0], (buf.length / 48000).toFixed(2) + 's');
      return;
    } catch (e) {
      if (/per day/.test(e.message)) return genFallback(l); // дневной лимит основной модели исчерпан
      const m = String(e.message).match(/retry in (\d+)/);
      const wait = m ? (+m[1] + 2) * 1000 : 15000;
      console.error('ERR', l.id, String(e.message).slice(0, 120), '→ жду', wait / 1000, 'с');
      await sleep(wait);
    }
  }
  console.error('FAIL', l.id);
}
async function genFallback(l) {
  for (const model of MODELS.slice(1)) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        let buf = await viaRest(model, l);
        if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf, 24000);
        fs.writeFileSync(path.join(voiceDir, `${l.id}.wav`), buf);
        console.log('OK', l.id, model, (buf.length / 48000).toFixed(2) + 's');
        return;
      } catch (e) {
        console.error('ERR', l.id, model, String(e.message).slice(0, 120));
        if (/per day/.test(e.message)) break;
        const m = String(e.message).match(/retry in (\d+)/);
        await sleep(m ? (+m[1] + 2) * 1000 : 8000);
      }
    }
  }
  console.error('FAIL', l.id);
}
for (const l of todo) await gen(l);
console.log('done', todo.length);
