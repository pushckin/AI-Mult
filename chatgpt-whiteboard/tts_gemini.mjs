// Озвучка диктора через Gemini TTS. Ключ: переменная GEMINI_API_KEY (в файлы не пишется).
// usage: GEMINI_API_KEY=... node tts_gemini.mjs [номер_сцены ...]
import fs from 'fs'; import { spawnSync } from 'child_process';
const KEY = process.env.GEMINI_API_KEY; if (!KEY) { console.error('Нужен GEMINI_API_KEY'); process.exit(1); }
const VOICE = process.env.GEMINI_VOICE || 'Algenib'; // хрипловатый, «gravelly»
const texts = JSON.parse(fs.readFileSync('script/voice_text.json', 'utf8'));
const curl = (args, input) => spawnSync('curl', ['-s', '-m', '300', ...args], { input, maxBuffer: 1 << 28 });
let MODEL = process.env.GEMINI_TTS_MODEL;
if (!MODEL) { // берём самую свежую flash-tts модель из списка доступных
  const r = JSON.parse(curl(['-H', `x-goog-api-key: ${KEY}`, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200']).stdout.toString());
  const names = (r.models || []).map(m => m.name.replace('models/', '')).filter(n => /tts/.test(n)).sort();
  console.log('TTS-модели:', names.join(', '));
  MODEL = names.reverse().find(n => /flash/.test(n)) || names[0];
}
console.log('модель', MODEL, 'голос', VOICE);
const want = new Set(process.argv.slice(2).map(Number));
for (let i = 0; i < texts.length; i++) {
  if (want.size && !want.has(i + 1)) continue;
  const out = `audio/voice/s${i + 1}.wav`; let ok = false;
  for (let a = 0; a < 6 && !ok; a++) {
    const body = JSON.stringify({ contents: [{ parts: [{ text: texts[i] }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } });
    const r = curl(['-X', 'POST', '-H', `x-goog-api-key: ${KEY}`, '-H', 'Content-Type: application/json', '-d', '@-', `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`], body);
    let d; try { d = JSON.parse(r.stdout.toString()); } catch { d = null; }
    const part = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part) { console.log(`сцена ${i + 1}: попытка ${a + 1} неудачна`, JSON.stringify(d).slice(0, 200)); spawnSync('sleep', ['20']); continue; }
    const raw = `audio/voice/.raw${i + 1}`; fs.writeFileSync(raw, Buffer.from(part.data, 'base64'));
    const isPcm = /L16|pcm/i.test(part.mimeType || '') && !/^RIFF/.test(fs.readFileSync(raw).subarray(0, 4).toString());
    const inArgs = isPcm ? ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw] : ['-i', raw];
    // срезаем тишину по краям, нормализуем громкость
    spawnSync('ffmpeg', ['-y', '-v', 'error', ...inArgs, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000', '-ac', '1', out]);
    fs.rmSync(raw); ok = true; console.log(`сцена ${i + 1}: готово`);
  }
}
