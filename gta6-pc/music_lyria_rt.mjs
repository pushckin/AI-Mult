// Фоновая музыка через Gemini Lyria RealTime (WebSocket, модель lyria-realtime-exp). usage: node music_lyria_rt.mjs [секунд]
import fs from 'fs'; import WebSocket from 'ws'; import { HttpsProxyAgent } from 'https-proxy-agent'; import { spawnSync } from 'child_process';
const KEY = process.env.GEMINI_API_KEY; const SECS = +(process.argv[2] || 150);
const url = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic';
const agent = process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY, { ca: fs.readFileSync('/root/.ccr/ca-bundle.crt') }) : undefined;
const ws = new WebSocket(url, { agent, headers: { 'x-goog-api-key': KEY }, ca: fs.readFileSync('/root/.ccr/ca-bundle.crt') });
const chunks = []; let bytes = 0; const need = SECS * 48000 * 2 * 2;
ws.on('open', () => ws.send(JSON.stringify({ setup: { model: 'models/lyria-realtime-exp' } })));
ws.on('message', m => {
  const d = JSON.parse(m.toString());
  if (d.setupComplete) {
    ws.send(JSON.stringify({ clientContent: { weightedPrompts: [
      { text: 'playful mischievous pizzicato strings, sneaky comedic explainer background music', weight: 1.0 },
      { text: 'light funky bass, soft brushed drums, subtle retro 80s Miami synth, chill, unobtrusive, instrumental', weight: 0.7 }] } }));
    ws.send(JSON.stringify({ musicGenerationConfig: { bpm: 100, temperature: 1.0, density: 0.45, brightness: 0.55, guidance: 4.0 } }));
    ws.send(JSON.stringify({ playbackControl: 'PLAY' })); console.log('playing');
  }
  for (const c of d.serverContent?.audioChunks || []) { const b = Buffer.from(c.data, 'base64'); chunks.push(b); bytes += b.length; }
  if (d.filteredPrompt || d.warning) console.log(JSON.stringify(d).slice(0, 300));
  if (bytes >= need) { ws.close(); }
});
ws.on('error', e => { console.log('ERR', e.message); process.exit(1); });
ws.on('unexpected-response', (q, res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => { console.log('HTTP', res.statusCode, s.slice(0, 400)); process.exit(1); }); });
ws.on('close', (c, r) => {
  console.log('closed', c, r.toString(), (bytes / 192000).toFixed(1), 's');
  if (!bytes) process.exit(1);
  fs.mkdirSync('audio/music', { recursive: true }); fs.writeFileSync('audio/music/raw.pcm', Buffer.concat(chunks));
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'audio/music/raw.pcm', '-af', 'afade=t=in:d=2,loudnorm=I=-18:TP=-2', '-ar', '44100', '-b:a', '192k', 'audio/music/bg.mp3'], { stdio: 'inherit' });
  fs.rmSync('audio/music/raw.pcm'); console.log('bg.mp3 ok');
});
setTimeout(() => { console.log('timeout'); ws.close(); }, 400000);
