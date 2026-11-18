// Общий клиент Gemini. Ключ берётся из GEMINI_API_KEY; если его нет — запрос уходит с заглушкой,
// и ключ подставляет сетевой прокси среды (Network secrets для generativelanguage.googleapis.com).
import { GoogleGenAI } from '@google/genai';
export const API_KEY = process.env.GEMINI_API_KEY || 'injected-by-proxy';
export const client = new GoogleGenAI({ apiKey: API_KEY, apiVersion: 'v1beta', httpOptions: { apiVersion: 'v1beta' } });
export async function rest(model, body) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}
export function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
