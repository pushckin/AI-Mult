// Gemini TTS helper (ключ только из process.env.GEMINI_API_KEY)
import fs from 'node:fs';
export const MODELS = ['gemini-3.8-flash-tts','gemini-3.8-flash-lite-tts','gemini-3.1-flash-tts-preview','gemini-2.5-flash-preview-tts'];
function pcmFromWav(buf){
  // найти все чанки data в (возможно сдвоенном) RIFF; вернуть чистый PCM
  let p = 0, out = [];
  while (p + 12 <= buf.length && buf.toString('latin1',p,p+4)==='RIFF'){
    let q = p+12;
    while (q+8 <= buf.length){
      const id = buf.toString('latin1',q,q+4); let sz = buf.readUInt32LE(q+4);
      if (id==='data'){ if (q+8+sz>buf.length||sz===0||sz===0xffffffff) sz=buf.length-q-8;
        let d = buf.subarray(q+8,q+8+sz);
        // вложенный RIFF внутри данных
        const i = d.indexOf('RIFF'); 
        if (i>=0 && i%2===0 && d.toString('latin1',i+8,i+12)==='WAVE'){ out.push(d.subarray(0,i)); buf = d.subarray(i); p=0; q=-1; break; }
        out.push(d); return Buffer.concat(out); }
      q += 8+sz+(sz&1);
    }
    if (q===-1) continue; break;
  }
  return Buffer.concat(out);
}
export function wavFromPcm(pcm, rate=24000){
  const h=Buffer.alloc(44);h.write('RIFF',0);h.writeUInt32LE(36+pcm.length,4);h.write('WAVE',8);h.write('fmt ',12);
  h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);
  h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);
}
export async function tts({text, voice, out, modelIdx=0}){
  const key=process.env.GEMINI_API_KEY; if(!key) throw new Error('no key');
  let lastErr;
  for (let attempt=0; attempt<8; attempt++){
    const model = MODELS[Math.min(modelIdx + (attempt>=4?1:0), MODELS.length-1)];
    try{
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
        method:'POST',headers:{'x-goog-api-key':key,'content-type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
      if(!r.ok){ const t=await r.text(); throw new Error(`${r.status} ${t.slice(0,200)}`);}
      const j=await r.json();
      const part=j.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
      if(!part) throw new Error('no audio: '+JSON.stringify(j).slice(0,300));
      let buf=Buffer.from(part.inlineData.data,'base64');
      const pcm = buf.toString('latin1',0,4)==='RIFF'? pcmFromWav(buf) : buf;
      fs.writeFileSync(out, wavFromPcm(pcm,24000));
      return {model, bytes:pcm.length};
    }catch(e){ lastErr=e; console.error('tts retry',attempt,String(e.message).slice(0,150)); await new Promise(r=>setTimeout(r,3000*(attempt+1))); }
  }
  throw lastErr;
}
