import { GoogleGenAI } from '@google/genai';
const c = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: 'v1beta' } });
const pager = await c.models.list({ config: { pageSize: 200 } });
let n = 0;
for await (const m of pager) {
  n++;
  if (m.name.includes('tts') || m.name.includes('audio') || m.name.includes('live') || m.name.includes('3.8') || m.name.includes('4-')) {
    console.log(m.name, (m.supportedActions || []).join(','));
  }
}
console.log('total v1beta:', n);
