// Генерация реплик сцены 1 (кэш: audio/scene1/raw/*.wav). Ключ — из env.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {tts} from './tts_lib.mjs';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'scene1','raw'); fs.mkdirSync(dir,{recursive:true});
export const VOICE={artyom:'Fenrir',katya:'Aoede'};
export const CLIPS=[
 {id:'a1',who:'artyom',style:'Скажи по-русски бархатным, проникновенным, поставленным голосом романтического героя мелодрамы, чуть театрально, неспешно',text:'Катюш, понимаешь… наши отношения — это не просто быт. Это, блядь, симфония двух несовершенных душ, где каждая твоя истерика — лишь крещендо нашей общей любви…'},
 {id:'k1',who:'katya',style:'Скажи по-русски растроганно, всхлипывая, дрожащим от умиления голосом, со слезами',text:'Господи, Тём… Ты такой глубокий. Ни один парень мне такого не говорил. А что ты думаешь насчет моей мамы, которая хочет переехать к нам на месяц?'},
 {id:'a2',who:'artyom',style:'Скажи по-русски с глуповатой натянутой улыбкой в голосе, нервно, с запинкой',text:'Секунду, любимая, дай мне… э-э… пропустить эту мысль через призму сердца.'},
 {id:'a3',who:'artyom',style:'Скажи по-русски быстрым лихорадочным шёпотом, паническим, торопливо, почти без голоса, как диктуешь телефону',text:'Клод, блядь, срочно придумай вежливую отмазку, почему её жирная токсичная мамаша не должна переступать порог моей хаты, иначе я выйду в окно.'},
 {id:'k2',who:'katya',style:'Скажи по-русски удивлённо и растерянно, с лёгким беспокойством',text:'Тём? Ты чего завис? Так что насчёт мамы?'},
 {id:'a4a',who:'artyom',style:'Скажи по-русски тихо, пересохшим сдавленным голосом, как будто сглотнул ком в горле, коротко',text:'Кать…'},
 {id:'a4b',who:'artyom',style:'Скажи по-русски хриплым, надорванным, первобытным голосом, срываясь на яростный крик, без фильтров, всё громче и злее',text:'Да пошла она нахуй, твоя мама! Она жрёт как комбайн, воняет корвалолом и в прошлый раз смыла в мой унитаз кошачий наполнитель!'},
];
export async function ensureVoices(){
  for(const c of CLIPS){ const out=path.join(dir,c.id+'.wav'); if(fs.existsSync(out)&&fs.statSync(out).size>5000) continue;
    const r=await tts({text:`${c.style}: ${c.text}`,voice:VOICE[c.who],out}); console.log('TTS',c.id,r.model,(r.bytes/48000).toFixed(2)+'s'); }
  return dir;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) await ensureVoices();
