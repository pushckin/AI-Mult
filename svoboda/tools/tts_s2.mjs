// Озвучка сцены 2 (Gemini TTS). Запуск: set -a; . ../.env; set +a; NODE_USE_ENV_PROXY=1 node tools/tts_s2.mjs [id ...]
// Каждая реплика — 2 дубля в out/tts_s2/, затем node tools/tts_s2_pick.mjs выбирает лучший и пишет voice_s2_NN_*.wav
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'out', 'tts_s2');
fs.mkdirSync(outDir, { recursive: true });
const MODEL = process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview';
export const LINES = [
  { id: '01_tony', say: 'Say in a deep gruff bass voice, choking with tears', voice: 'Alnilam', dir: '[sobbing, deep gruff bass voice, voice breaking into tears]',
    text: 'Маркус… Прошло сорок секунд. Нас никто не сбил, не поджёг из огнемёта, и ни один двенадцатилетний пиздюк в голосовом чате не назвал нас пидорами.' },
  { id: '02_markus', say: 'Say in a high nervous voice, sniffling and crying', voice: 'Puck', dir: '[sniffling, high-pitched nervous twitchy voice, crying]',
    text: 'Тони, я даже не помню, каково это — просто идти по улице и не ждать, что тебе в жопу прилетит истребитель…' },
  { id: '03_chloe_mega', say: 'Shout shrilly and pompously like an activist with a megaphone', voice: 'Leda', dir: '[shouting, shrill, pompous, screeching activist voice]',
    text: 'МЫ ПОБЕДИЛИ! НАШИ ПЕТИЦИИ СРАБОТАЛИ! Системный геноцид цифрового пролетариата окончен! Мы отменили токсичных игроков!' },
  { id: '04_greg', say: 'Say in a tired irritated voice', voice: 'Algenib', dir: '[tired, irritated, annoyed]',
    text: 'Слышь, блядь, светофор… Ты реально ебанутая? Какие петиции? Шестая часть вышла. Эти дегенераты просто в Вайс-Сити переехали.' },
  { id: '05_chloe', say: 'Say in an offended, indignant, whiny shrill voice', voice: 'Leda', dir: '[offended, indignant, whiny, shrill]',
    text: 'Не обесценивай мой активизм, белый цисгендерный скрипт! Я три года стояла у этой кофейни с плакатом! Я защищала вас всех — и тебя, офисный раб, и вот этих прекрасных, уязвимых квир-мужчин!' },
  { id: '06_tony', say: 'Say in a threatening angry deep bass growl', voice: 'Alnilam', dir: '[threatening, angry, deep bass growl]',
    text: 'Слышь, «уязвимый» у тебя в трусах, чучело зелёное! Я тринадцать лет выживал под ковровыми бомбардировками! Меня дважды расстреливали из минигана прямо на свидании, а ты, сука, даже из спавна не выходила! Отъебись от нас со своей защитой!' },
];
const pcmToWav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};
const only = process.argv.slice(2);
for (const L of LINES) {
  if (only.length && !only.includes(L.id) && !only.includes(L.id.slice(0, 2))) continue;
  for (let take = 1; take <= 2; take++) {
    const f = path.join(outDir, `${L.id}_t${take}.wav`);
    if (fs.existsSync(f) && fs.statSync(f).size > 5000 && !process.env.FORCE) { console.log('skip', f); continue; }
    const body = { contents: [{ parts: [{ text: MODEL.startsWith('gemini-2.5') ? `${L.say}: ${L.text}` : `${L.dir} ${L.text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: L.voice } } } } };
    let ok = false;
    for (let attempt = 1; attempt <= 6 && !ok; attempt++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      const part = j?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      if (!part) { console.error('FAIL', L.id, take, attempt, r.status, JSON.stringify(j).slice(0, 200)); await new Promise(res => setTimeout(res, r.status === 429 ? 25000 : 3000)); continue; }
      let buf = Buffer.from(part.data, 'base64');
      if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf);
      fs.writeFileSync(f, buf); console.log('OK', f, buf.length); ok = true; await new Promise(res => setTimeout(res, 6000));
    }
  }
}
