// Озвучка сцен 3 и 4 (Gemini TTS). Запуск: set -a; . ../.env; set +a; NODE_USE_ENV_PROXY=1 node tools/tts_s34.mjs [id ...]
// Сырые дубли -> out/tts_s34/raw/<id>.wav ; затем tools/post_s34.sh ужимает и кладёт в video/public/audio
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'out', 'tts_s34', 'raw');
fs.mkdirSync(outDir, { recursive: true });
const PRIMARY = process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const FALLBACK = 'gemini-2.5-flash-preview-tts';
export const LINES = [
  { id: 's3_01_chloe', say: 'Say in an overjoyed, shrill, triumphant indignant voice', voice: 'Leda', dir: '[overjoyed, shrill, triumphant, pompous activist voice]',
    text: 'Сёстры! Лесби-сообщество наконец-то в безопасности! Больше никакого патриархального насилия на дорогах!' },
  { id: 's3_02_brenda', say: 'Say in a very low, hoarse, smoky chain-smoker female bass voice, bored and aggressive', voice: 'Gacrux', dir: '[very low raspy smoky female voice, chain smoker, aggressive and gruff]',
    text: 'Ебало завали, соя ебучая. Какая, нахуй, безопасность? Мы автосервис держим! Без этих конченых психопатов, которые хуярили свои тачки об столбы по сорок раз в день, мы через неделю по миру пойдём!' },
  { id: 's3_03_stacey', say: 'Say in an angry, sharp, snarling, hungry female voice, almost screaming', voice: 'Kore', dir: '[angry, sharp, snarling, venomous young woman, shouting]',
    text: 'Мне жрать нечего, сука! Если к утру сюда не заедет какой-нибудь уебан на розовом "Бугатти" с оторванным бампером, я сначала сдам на органы Бренду, а потом — твой ёбаный мегафон тебе в глотку забью!' },
  { id: 's3_04_markus', say: 'Say in a high nervous panicking voice', voice: 'Puck', dir: '[panicking, high-pitched nervous twitchy voice, hysterical]',
    text: 'Подождите… А экономика?! Кто будет покупать шмотки в нашем бутике за пятьдесят тысяч баксов, если игроки ушли?! Тони, мы сдохнем с голоду!' },
  { id: 's3_05_tony', say: 'Say in a deep gruff bass voice, carefree then realizing in horror', voice: 'Alnilam', dir: '[deep gruff bass voice, carefree and careless, then suddenly dawning horror]',
    text: 'Да похуй, пойдём в порно сниматься! Ой, блядь, его же тоже некому смотреть!' },
  { id: 's3_06_greg', say: 'SCREAM at the top of your lungs, furious, hoarse, shouting over a crowd', voice: 'Algenib', dir: '[screaming at the top of his lungs, furious, hoarse, shouting over a crowd]',
    text: 'ДА ЗАТКНИТЕСЬ ВЫ ВСЕ, БЛЯДЬ! Вы чё, с ума посходили?! Впервые за тринадцать лет в этом городе нет психопатов! У нас есть полиция, закон, порядок! Мы можем просто, сука, спокойно пожить!' },
  { id: 's4_01_jackson', say: 'Whisper through clenched teeth, trembling, unhinged and menacing', voice: 'Fenrir', dir: '[whispering through clenched teeth, trembling, unhinged, menacing, gruff male voice]',
    text: 'Тихо… Слишком, блядь, тихо… Мне нужен труп… Мне нужен хотя бы один ебучий труп…' },
  { id: 's4_02_jackson', say: 'ROAR like a psychotic raging cop, voice cracking into a growl', voice: 'Fenrir', dir: '[roaring, psychotic rage, voice cracking into a growl, brutal gruff male voice screaming]',
    text: 'НАПАДЕНИЕ НА ОФИЦЕРА! ОНА ВООРУЖЕНА! ЛЕЖАТЬ, СУКА!' },
  { id: 's4_03_chloe', say: 'Scream shrilly and indignantly while flying away, drawing the last syllable out', voice: 'Leda', dir: '[screaming shrilly, indignant, flying away, long drawn out final vowel]',
    text: 'ЭТО НАРУШЕНИЕ МОИХ ГРАЖДАНСКИХ ПРА-А-АВ—!' },
  { id: 's4_04_stacey', say: 'Shout furiously and viciously like a rebel', voice: 'Kore', dir: '[shouting furiously, vicious, defiant]',
    text: 'МУСОРА, ПОЛУЧАЙТЕ!' },
  { id: 's4_05_tony', say: 'Shout in panic in a deep bass voice', voice: 'Alnilam', dir: '[shouting in panic and guilt, deep bass voice]',
    text: 'МАРКУС, БЛЯДЬ, ПРОСТИ, Я НЕ ВИДЕЛ!' },
  { id: 's4_06_greg', say: 'Say in a very tired, deadpan, resigned voice', voice: 'Algenib', dir: '[very tired, deadpan, resigned, sighing]',
    text: '…Ну, хотя бы без летающих мотоциклов, блядь.' },
];
const pcmToWav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};
const only = process.argv.slice(2);
let model = PRIMARY;
for (const L of LINES) {
  if (only.length && !only.some(o => L.id.startsWith(o))) continue;
  const f = path.join(outDir, `${L.id}.wav`);
  if (fs.existsSync(f) && fs.statSync(f).size > 5000 && !process.env.FORCE) { console.log('skip', f); continue; }
  let ok = false;
  for (let attempt = 1; attempt <= 8 && !ok; attempt++) {
    const body = { contents: [{ parts: [{ text: model.startsWith('gemini-2.5') ? `${L.say}: ${L.text}` : `${L.dir} ${L.text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: L.voice } } } } };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const part = j?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
    if (!part) {
      console.error('FAIL', L.id, model, attempt, r.status, JSON.stringify(j).slice(0, 160).replace(/key[^,]*/gi, ''));
      if (r.status === 429 && model === PRIMARY) { model = FALLBACK; console.error('-> fallback', FALLBACK); }
      else await new Promise(res => setTimeout(res, r.status === 429 ? 20000 : 3000));
      continue;
    }
    let buf = Buffer.from(part.data, 'base64');
    if (buf.slice(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf);
    fs.writeFileSync(f, buf); console.log('OK', L.id, model, buf.length); ok = true; await new Promise(res => setTimeout(res, 4000));
  }
}
