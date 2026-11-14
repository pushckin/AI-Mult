// Генерация озвучки всех 16 реплик через ElevenLabs API. Запуск: node tts_elevenlabs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LINES } from './lines.mjs';

const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
if (!apiKey) throw new Error('ELEVENLABS_API_KEY не задан');

fs.mkdirSync('audio/voice', { recursive: true });
fs.mkdirSync('audio/tmp_el', { recursive: true });

const VOICE_MAP = {
  boss: { id: 'JBFqnCBsd6RMkjVDRZzb', settings: { stability: 0.28, similarity_boost: 0.75, style: 0.65, use_speaker_boost: true } },
  worker: { id: 'SOYHLrjzK2X1ezoPC6cr', settings: { stability: 0.30, similarity_boost: 0.80, style: 0.70, use_speaker_boost: true } },
  petya: { id: 'TX3LPaxmHKxFdv7VOQHJ', settings: { stability: 0.25, similarity_boost: 0.75, style: 0.70, use_speaker_boost: true } },
  ivanych: { id: 'N2lVS1w4EtoT3dr4eOWO', settings: { stability: 0.55, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true } },
  surgeon: { id: 'pNInz6obpgDQGcFmaJgB', settings: { stability: 0.32, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true } },
  anest: { id: 'onwK4e9ZLuTAKqWW03F9', settings: { stability: 0.60, similarity_boost: 0.80, style: 0.25, use_speaker_boost: true } },
  oleg: { id: 'IKne3meq5aSn9XLyUdCD', settings: { stability: 0.28, similarity_boost: 0.80, style: 0.68, use_speaker_boost: true } },
};

const LINE_OVERRIDES = {
  s2_ivan3: { stability: 0.32, similarity_boost: 0.85, style: 0.60, use_speaker_boost: true },
  s4_oleg1: { stability: 0.28, similarity_boost: 0.80, style: 0.68, use_speaker_boost: true },
  s4_oleg2: { stability: 0.65, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true },
};

function cleanForElevenLabs(raw) {
  return raw
    .replace(/<sob>/gi, '... ')
    .replace(/<short pause>/gi, '... — ')
    .replace(/<long pause>/gi, '... ')
    .replace(/^\.\.\.\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function synthesize(line, attempt = 1) {
  const vc = VOICE_MAP[line.who];
  const voiceSettings = LINE_OVERRIDES[line.id] || vc.settings;
  const text = cleanForElevenLabs(line.text);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vc.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('quota_exceeded')) {
      throw new Error(`QUOTA_EXCEEDED on ${line.id}: ${errText}`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return synthesize(line, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} on ${line.id}: ${errText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

for (const line of LINES) {
  const mp3Path = path.resolve(`audio/tmp_el/${line.id}.mp3`);
  const outWav = path.resolve(`audio/voice/${line.id}.wav`);
  const buf = await synthesize(line);
  fs.writeFileSync(mp3Path, buf);

  const args = ['-y', '-i', mp3Path];
  if (line.id === 's4_oleg2') {
    args.push('-af', 'adelay=900:all=1');
  }
  args.push('-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', outWav);
  execFileSync('ffmpeg', args, { stdio: 'pipe' });

  const stat = fs.statSync(outWav);
  const dur = ((stat.size - 44) / (44100 * 2)).toFixed(2);
  console.log(`EL OK ${line.id} (${line.who}) -> ${dur}s`);
}

fs.rmSync('audio/tmp_el', { recursive: true, force: true });
console.log('ALL 16 ELEVENLABS VOICE LINES GENERATED');
