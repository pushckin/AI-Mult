// Общие утилиты: Gemini image (REST), кеинг зелёного, пути.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const IMG = path.join(ROOT, 'video/public/img');
export const RAW = path.join(ROOT, 'tools/raw'); // сырые генерации (зелёный фон)
export const STYLE_REF = process.env.STYLE_REF || path.join(ROOT, 'tools/style_ref.png');
fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

// ключ читаем из окружения (set -a; . .env; set +a); в логи не пишем
const KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

export function b64(file) {
  return fs.readFileSync(file).toString('base64');
}

export async function generate({ prompt, refs = [], aspect = '16:9', out, tries = 3 }) {
  if (!KEY) throw new Error('GEMINI_API_KEY not set');
  const parts = [{ text: prompt }];
  for (const r of refs) parts.push({ inlineData: { mimeType: 'image/png', data: b64(r) } });
  for (const model of MODELS) {
    for (let a = 1; a <= tries; a++) {
      try {
        console.log(`gen ${path.basename(out)} [${model}] try ${a}`);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(j).slice(0, 300)}`);
        const p = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
        if (!p) throw new Error('no image: ' + JSON.stringify(j).slice(0, 300));
        fs.writeFileSync(out, Buffer.from(p.inlineData.data, 'base64'));
        return out;
      } catch (e) {
        console.error('  ERR', e.message);
        await new Promise((r) => setTimeout(r, 2500 * a));
      }
    }
  }
  throw new Error('failed ' + out);
}

// Кеинг: убираем зелёный (#00FF00) в альфу с мягким краем и despill, автообрезка по альфе.
export async function keyGreen(inFile, outFile, { trim = true, pad = 4, tol = 70 } = {}) {
  const { data, info } = await sharp(inFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const dom = g - Math.max(r, b); // насколько зелёный доминирует
    if (dom > tol) {
      data[o + 3] = 0;
    } else if (dom > tol * 0.35) {
      const k = (dom - tol * 0.35) / (tol * 0.65); // 0..1
      data[o + 3] = Math.round(255 * (1 - k));
      data[o + 1] = Math.min(g, Math.max(r, b)); // despill
    } else if (dom > 15) {
      data[o + 1] = Math.min(g, Math.max(r, b) + 8);
    }
  }
  let img = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  if (trim) {
    const buf = await img.png().toBuffer();
    // trim по альфе: расширяем канвас на прозрачный и обрезаем
    img = sharp(buf).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 });
    const t = await img.png().toBuffer();
    img = sharp(t).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  await img.png().toFile(outFile);
  const m = await sharp(outFile).metadata();
  return { width: m.width, height: m.height };
}

export const GREEN =
  'Background: completely flat, solid, uniform pure bright green chroma-key color #00FF00, no shadow on the background, no gradient, no floor, no other objects. Do NOT use green anywhere on the subject.';

export const STYLE =
  'STYLE (strict, match the reference image): South Park cutout-paper animation look. Flat shapes cut from colored construction paper, bold flat solid colors, thin dark outline (about 2px, near-black), NO gradients, NO soft shading, NO 3D volume, NO glow, slightly rough paper-cutout edges. Simple geometric shapes, minimal detail.';
