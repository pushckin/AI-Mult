// Голос Грега, сцена 1. Запуск: set -a; . ../.env; set +a; node tools/tts_greg.mjs [voice ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'out', 'tts_greg');
fs.mkdirSync(outDir, { recursive: true });
const MODEL = process.env.TTS_MODEL || 'gemini-3.8-flash-tts';
const TEXT = 'Ебать… Неужели съебались?';
const DIRECTION = 'Скажи по-русски, очень тихим шёпотом, дрожащим, срывающимся голосом, как усталый, до смерти напуганный офисный мужик сорока лет, который только что пережил кошмар и не верит, что всё кончилось. Пауза после многоточия: ';
const voices = process.argv.slice(2).length ? process.argv.slice(2) : ['Enceladus', 'Algenib', 'Charon'];
const pcmToWav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};
for (const voice of voices) {
  for (let take = 1; take <= 2; take++) {
    const body = { contents: [{ parts: [{ text: DIRECTION + TEXT }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const part = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part) { console.error('FAIL', voice, take, r.status, JSON.stringify(j).slice(0, 300)); continue; }
    let buf = Buffer.from(part.data, 'base64');
    if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf);
    const f = path.join(outDir, `${voice}_${take}.wav`);
    fs.writeFileSync(f, buf); console.log('OK', f, buf.length);
  }
}
