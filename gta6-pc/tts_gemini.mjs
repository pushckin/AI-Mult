// Озвучка одним диктором (Gemini TTS, один голос и одна модель на все сцены) + склейка voiceover.mp3 и тайминги сцен.
// Ключ: GEMINI_API_KEY в окружении (или подставляется прокси). usage: node tts_gemini.mjs [номера сцен...]  |  node tts_gemini.mjs --assemble
import fs from 'fs'; import { spawnSync } from 'child_process';
const KEY = process.env.GEMINI_API_KEY || 'proxy-injected';
const VOICE = process.env.GEMINI_VOICE || 'Algenib';
const texts = JSON.parse(fs.readFileSync('script/voice_tts.json', 'utf8'));
const curl = (args, input) => spawnSync('curl', ['-s', '-m', '300', ...args], { input, maxBuffer: 1 << 28 });
const GAP_AFTER = 1.9, LEAD = 0.35; // пауза между сценами под губку-переход
const dur = f => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString().trim();
const argv = process.argv.slice(2);
if (!argv.includes('--assemble')) {
  let MODEL = process.env.GEMINI_TTS_MODEL;
  if (!MODEL) {
    const r = JSON.parse(curl(['-H', `x-goog-api-key: ${KEY}`, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200']).stdout.toString());
    const names = (r.models || []).map(m => m.name.replace('models/', '')).filter(n => /tts/.test(n)).sort();
    console.log('TTS-модели:', names.join(', ') || JSON.stringify(r).slice(0, 300));
    MODEL = names.filter(n => /pro/.test(n)).pop() || names.filter(n => /flash/.test(n)).pop() || names[0];
  }
  console.log('модель', MODEL, 'голос', VOICE);
  const want = new Set(argv.map(Number));
  for (let i = 0; i < texts.length; i++) {
    if (want.size && !want.has(i + 1)) continue;
    const out = `audio/voice/s${i + 1}.wav`; let ok = false;
    for (let a = 0; a < 6 && !ok; a++) {
      const body = JSON.stringify({ contents: [{ parts: [{ text: texts[i] }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } });
      const r = curl(['-X', 'POST', '-H', `x-goog-api-key: ${KEY}`, '-H', 'Content-Type: application/json', '-d', '@-', `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`], body);
      let d; try { d = JSON.parse(r.stdout.toString()); } catch { d = null; }
      const part = d?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      if (!part) { console.log(`сцена ${i + 1}: попытка ${a + 1} неудачна`, JSON.stringify(d).slice(0, 300)); spawnSync('sleep', ['20']); continue; }
      const raw = `audio/voice/s${i + 1}.raw.pcm`; fs.writeFileSync(raw, Buffer.from(part.data, 'base64'));
      const isPcm = !/^RIFF/.test(fs.readFileSync(raw).subarray(0, 4).toString());
      const inArgs = isPcm ? ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw] : ['-i', raw];
      spawnSync('ffmpeg', ['-y', '-v', 'error', ...inArgs, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000', '-ac', '1', out]);
      fs.rmSync(raw); ok = true; console.log(`сцена ${i + 1}: ${dur(out).toFixed(2)} c`);
    }
  }
}
// склейка: LEAD тишины, голос сцены, GAP_AFTER тишины; границы сцен -> video/voice_timings.js
const files = texts.map((_, i) => `audio/voice/s${i + 1}.wav`);
if (files.every(f => fs.existsSync(f))) {
  const starts = [], segs = []; let t = 0;
  const parts = [];
  files.forEach((f, i) => { starts.push(+t.toFixed(3)); const d = dur(f); segs.push({ scene: i + 1, voiceStart: +(t + LEAD).toFixed(3), voiceEnd: +(t + LEAD + d).toFixed(3) }); t += LEAD + d + (i < 6 ? GAP_AFTER : 2.3); parts.push(`[${i}:a]adelay=${Math.round(LEAD * 1000)}:all=1,apad=pad_dur=${i < 6 ? GAP_AFTER : 2.3}[a${i}]`); });
  const end = +t.toFixed(3);
  spawnSync('ffmpeg', ['-y', '-v', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex', parts.join(';') + ';' + files.map((_, i) => `[a${i}]`).join('') + `concat=n=${files.length}:v=0:a=1[a]`, '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '192k', 'voiceover.mp3'], { stdio: 'inherit' });
  fs.writeFileSync('voiceover_timings.json', JSON.stringify({ starts, end, segs }, null, 1));
  fs.writeFileSync('video/voice_timings.js', `window.VOICE_TIMINGS = ${JSON.stringify({ starts, end })};\n`);
  console.log('voiceover.mp3', dur('voiceover.mp3').toFixed(2), 'c; сцены', starts.join(' '), 'конец', end);
}
