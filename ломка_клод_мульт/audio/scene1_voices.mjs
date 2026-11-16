// Генерация реплик сцены 1 (кэш: audio/scene1/raw/*.wav). Ключ — из env.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {tts} from './tts_lib.mjs';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'scene1','raw'); fs.mkdirSync(dir,{recursive:true});
export const VOICE={artyom:'Fenrir',katya:'Aoede'};
export const CLIPS=[
 {id:'a1',who:'artyom',style:'Style: velvety, warm, deeply sincere, theatrical romantic-melodrama hero voice, smooth and confident. Pace: natural, slightly measured.',text:'Катюш, понимаешь… наши отношения — это не просто быт. Это, блядь, симфония двух несовершенных душ, где каждая твоя истерика — лишь крещендо нашей общей любви…'},
 {id:'k1',who:'katya',style:'Style: touched to tears, sniffling, voice trembling with tenderness, then a naive curious question at the end. Pace: natural.',text:'Господи, Тём… Ты такой глубокий. Ни один парень мне такого не говорил. А что ты думаешь насчет моей мамы, которая хочет переехать к нам на месяц?'},
 {id:'a2',who:'artyom',style:'Style: dumb forced smile in the voice, nervous, hesitant. Pace: natural.',text:'Секунду, любимая, дай мне… э-э… пропустить эту мысль через призму сердца.'},
 {id:'a3',who:'artyom',style:'Style: feverish panicked WHISPER, hushed, breathy, hurried, almost no voice, dictating secretly to a phone. Pace: fast.',text:'Клод, блядь, срочно придумай вежливую отмазку, почему её жирная токсичная мамаша не должна переступать порог моей хаты, иначе я выйду в окно.'},
 {id:'k2',who:'katya',style:'Style: surprised and confused, slightly worried. Pace: natural.',text:'Тём? Ты чего завис? Так что насчёт мамы?'},
 {id:'a4a',who:'artyom',style:'Style: tense, dry-throat, strained quiet voice right after swallowing a lump. Pace: slow.',text:'Кать…'},
 {id:'a4b',who:'artyom',style:'Style: hoarse, raw, primal, voice breaking into a furious unfiltered scream, getting louder and angrier. Pace: fast.',text:'Да пошла она нахуй, твоя мама! Она жрёт как комбайн, воняет корвалолом и в прошлый раз смыла в мой унитаз кошачий наполнитель!'},
];
export async function ensureVoices(){
  for(const c of CLIPS){ const out=path.join(dir,c.id+'.wav'); if(fs.existsSync(out)&&fs.statSync(out).size>5000) continue;
    const r=await tts({text:`### DIRECTOR'S NOTES\n${c.style}\nLanguage: Russian.\n\n### TRANSCRIPT\n${c.text}`,voice:VOICE[c.who],out}); await new Promise(r=>setTimeout(r,1500)); console.log('TTS',c.id,r.model,(r.bytes/48000).toFixed(2)+'s'); }
  return dir;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) await ensureVoices();
