// Контроль озвучки: распознаёт каждую реплику через Gemini и сравнивает с текстом.
// node check_voice.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rest } from './gemini.mjs';
import { voicedLines } from './lines.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
for (const l of voicedLines().filter((x) => !only.length || only.some((o) => x.id.startsWith(o)))) {
  const p = path.join(__dirname, 'audio', 'voice', `${l.id}.wav`);
  if (!fs.existsSync(p)) { console.log(l.id, 'НЕТ ФАЙЛА'); continue; }
  for (const model of ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite']) {
    try {
      const j = await rest(model, { contents: [{ parts: [{ text: 'Дословно запиши русскую речь из аудио (без комментариев, только текст). Затем на новой строке после "ТОН:" — 3-5 слов, как звучит голос (эмоция, пол, возраст).' }, { inlineData: { mimeType: 'audio/wav', data: fs.readFileSync(p).toString('base64') } }] }] });
      console.log(`${l.id}\n  ждали: ${l.text}\n  слышно: ${j.candidates?.[0]?.content?.parts?.map((x) => x.text).join(' ').replace(/\n/g, ' | ')}`);
      break;
    } catch (e) { console.error('ERR', l.id, model, e.message.slice(0, 100)); }
  }
}
