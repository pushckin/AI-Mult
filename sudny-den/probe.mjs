import { GoogleGenAI } from '@google/genai';
const c = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const names = ['gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'];
for (const model of names) {
  try {
    const it = await c.interactions.create({
      model, input: [{ type: 'user_input', content: [{ type: 'text', text: 'Привет!' }] }],
      response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: 'Kore' }] },
    });
    console.log('INTERACTIONS OK', model, !!it.output_audio?.data);
  } catch (e) { console.log('interactions fail', model, String(e.message).slice(0, 120)); }
  try {
    const r = await c.models.generateContent({
      model, contents: 'Скажи: Привет!',
      config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
    });
    console.log('GENCONTENT OK', model, !!r.candidates?.[0]?.content?.parts?.[0]?.inlineData);
  } catch (e) { console.log('gencontent fail', model, String(e.message).slice(0, 120)); }
}
