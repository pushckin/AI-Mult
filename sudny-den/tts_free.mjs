// Генерация озвучки бесплатным нейросетевым TTS (Google Translate TTS + ffmpeg обработка тембра)
// Запуск: node tts_free.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LINES } from './lines.mjs';

fs.mkdirSync('audio/voice', { recursive: true });
fs.mkdirSync('audio/tmp', { recursive: true });

const FILTERS = {
  boss: 'aresample=24000,asetrate=24000*1.12,aresample=44100,atempo=0.95,vibrato=f=6:d=0.25',
  worker: 'aresample=24000,asetrate=24000*1.03,aresample=44100,atempo=1.22,volume=1.3',
  petya: 'aresample=24000,asetrate=24000*1.16,aresample=44100,atempo=1.28,volume=1.25',
  ivanych: 'aresample=24000,asetrate=24000*0.80,aresample=44100,atempo=1.12,bass=g=6',
  surgeon: 'aresample=24000,asetrate=24000*0.95,aresample=44100,atempo=1.18',
  anest: 'aresample=24000,asetrate=24000*0.86,aresample=44100,atempo=1.10,bass=g=4',
  s4_oleg1: 'aresample=24000,asetrate=24000*1.04,aresample=44100,atempo=1.22',
  s4_oleg2: 'aresample=24000,adelay=900:all=1,asetrate=24000*0.88,aresample=44100,atempo=0.98,volume=0.9',
};

function cleanText(raw) {
  return raw
    .replace(/<sob>/gi, 'Хнык... ')
    .replace(/<short pause>/gi, '... ')
    .replace(/<long pause>/gi, '... ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitChunks(text, maxLen = 150) {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const chunks = [];
  for (const s of sentences) {
    if (s.length <= maxLen) {
      if (chunks.length && chunks[chunks.length - 1].length + 1 + s.length <= maxLen) {
        chunks[chunks.length - 1] += ' ' + s;
      } else {
        chunks.push(s);
      }
    } else {
      let cur = '';
      for (const word of s.split(/\s+/)) {
        if (cur && cur.length + 1 + word.length > maxLen) {
          chunks.push(cur);
          cur = word;
        } else {
          cur = cur ? cur + ' ' + word : word;
        }
      }
      if (cur) chunks.push(cur);
    }
  }
  return chunks.map(c => c.replace(/^[.\s…]+/, '').trim() || c).filter(Boolean);
}

async function fetchTTS(chunk, attempt = 1) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ru&client=tw-ob&q=${encodeURIComponent(chunk)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 256) throw new Error(`empty audio (${buf.length} bytes)`);
    return buf;
  } catch (err) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1200 * attempt));
      return fetchTTS(chunk, attempt + 1);
    }
    throw err;
  }
}

for (const line of LINES) {
  const cleaned = cleanText(line.text);
  const chunks = splitChunks(cleaned, 150);
  const partFiles = [];

  for (let i = 0; i < chunks.length; i++) {
    const mp3Path = path.resolve(`audio/tmp/${line.id}_p${i}.mp3`);
    const buf = await fetchTTS(chunks[i]);
    fs.writeFileSync(mp3Path, buf);
    partFiles.push(mp3Path);
    await new Promise(r => setTimeout(r, 150));
  }

  const outWav = path.resolve(`audio/voice/${line.id}.wav`);
  const filter = FILTERS[line.id] || FILTERS[line.who];

  let inputPath;
  if (partFiles.length === 1) {
    inputPath = partFiles[0];
  } else {
    const listFile = path.resolve(`audio/tmp/${line.id}_list.txt`);
    fs.writeFileSync(listFile, partFiles.map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
    const rawWav = path.resolve(`audio/tmp/${line.id}_raw.wav`);
    execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-ar', '24000', '-ac', '1', rawWav], { stdio: 'pipe' });
    inputPath = rawWav;
  }

  execFileSync(
    'ffmpeg',
    ['-y', '-i', inputPath, '-af', filter, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', outWav],
    { stdio: 'pipe' }
  );

  const stat = fs.statSync(outWav);
  const dur = ((stat.size - 44) / (44100 * 2)).toFixed(2);
  console.log(`OK ${line.id} (${chunks.length} ch) -> ${dur}s (${stat.size} bytes)`);
}

fs.rmSync('audio/tmp', { recursive: true, force: true });
console.log('ALL 16 VOICE LINES GENERATED');
