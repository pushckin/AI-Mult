// Обложки для Shorts/TikTok через Gemini «Nano Banana» (генерация изображений).
// Запуск: node images.mjs  ->  img/cover_p1.png, img/cover_p2.png (по референсу кадров из out/review)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rest } from './gemini.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'];
const STYLE = 'Vertical 9:16 YouTube Shorts cover, crude construction-paper cutout cartoon style (flat colored paper shapes, simple round heads with big white oval eyes, mitten hands, slight paper texture and drop shadows, like a diorama). Original characters only, no existing cartoon characters, no logos. Bold readable Russian title text at the top.';
const COVERS = [
  { id: 'cover_p1', ref: 'video/out/review/cover_ref_p1.png', prompt: `${STYLE} Scene: a giant grey concrete wall along a New Zealand beach, an endless crowd of crazed gamers with game consoles and TVs taped to their backs storming it, a soldier with a megaphone on top. Title text: «ВТОРЖЕНИЕ В НОВУЮ ЗЕЛАНДИЮ». Small badge: «ЧАСТЬ 1».` },
  { id: 'cover_p2', ref: 'video/out/review/cover_ref_p2.png', prompt: `${STYLE} Scene: New Zealand seen from space at night, completely black, with one tiny phone screen glowing, and a huge neon "GTA VI" loading glow fading out; a shocked gamer face lit by a phone in the foreground. Title text: «БЛЭКАУТ». Small badge: «ЧАСТЬ 2».` },
];
for (const c of COVERS) {
  const parts = [{ text: c.prompt }];
  const refPath = path.join(__dirname, c.ref);
  if (fs.existsSync(refPath)) parts.push({ text: 'Use this frame from the cartoon as the style and character reference:' }, { inlineData: { mimeType: 'image/png', data: fs.readFileSync(refPath).toString('base64') } });
  for (const model of MODELS) {
    try {
      const j = await rest(model, { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: '9:16' } } });
      const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!img) throw new Error('нет картинки');
      const out = path.join(__dirname, 'img', `${c.id}.png`);
      fs.writeFileSync(out, Buffer.from(img.data, 'base64'));
      console.log('OK', c.id, model, out);
      break;
    } catch (e) { console.error('ERR', c.id, model, e.message.slice(0, 200)); }
  }
}
