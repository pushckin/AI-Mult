// Реплики сцен 2-5 (кэш: audio/sceneN/raw/*.wav). Ключ — из env GEMINI_API_KEY.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {tts} from './tts_lib.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export const VOICE={artyom:'Fenrir',katya:'Aoede',wolf:'Charon'};
const F='Pace: fast and brisk, minimal pauses.';
// rms — целевой RMS (dBFS), fx — ffmpeg-фильтр "плохого динамика"/робота
const BAD='highpass=f=320,lowpass=f=3300,acrusher=bits=7:mode=lin:aa=0:samples=3,acompressor=threshold=0.1:ratio=8,volume=2';
const ROBOT='highpass=f=300,lowpass=f=3400,acrusher=bits=5:mode=lin:aa=0:samples=6,aecho=1:0.7:14:0.7,volume=2';
export const CLIPS={
2:[
 {id:'k1',who:'katya',rms:-20,text:'Ты… ты сейчас серьезно? А как же «симфония двух душ»?!',style:'Style: trembling with rage, dangerously quiet at first then exploding into an incredulous shout at the end. '+F},
 {id:'a1',who:'artyom',rms:-19,text:'Да это не я писал, блядь! Это Клод! У меня лимит кончился, Кать, я щас вообще не соображаю! Подожди пять часов, он обновится, и я тебе нормально, по-человечески объясню, почему твоя мать — старая гнида!',style:'Style: panicked, babbling, hysterical, voice cracking, getting faster and louder, ending in a blunt idiotic confident statement. '+F},
 {id:'a2',who:'artyom',rms:-17,text:'Сука! Сука-сука-сука! Как извиняться?! Я забыл, как люди извиняются без промпта! Что надо делать?! Цветы? Шоколад? Отрезать себе мизинец?!',style:'Style: full-blown hysterical panic, screaming, voice breaking, running around in circles. '+F},
 {id:'a3',who:'artyom',rms:-18,text:'Надо доварить ей пасту! Женщины любят еду! Блядь, а сколько соли сыпать?! Столовую ложку или пачку?! И воду сливать до того, как макароны кидать, или после?!',style:'Style: manic revelation, then frantic desperate confusion, shrieking questions. '+F},
 {id:'a4',who:'artyom',rms:-16,text:'А-а-а-а-а! Горит! Блядь!',style:'Style: loud terrified scream of a man whose pasta just caught fire. Pace: fast.'},
],
3:[
 {id:'a1',who:'artyom',rms:-23,text:'Братан, выручай. Девушка закрылась в ванной, я назвал ее мать старой гнидой и сжег кухню. Напиши текст, чтобы она меня простила. Срочно!',style:'Style: choking, coughing slightly from smoke, trembling hushed whisper into a phone microphone, desperate. '+F},
 {id:'w1',who:'wolf',rms:-19,fx:BAD,text:'Брат, запомни: лев не извиняется перед овцой за то, что съел ее мать. Скажи ей: «Либо ты выходишь и моешь пол, либо дверью ошиблась, принцесса». Ауф.',style:'Style: rough low-pitched gopnik street-tough guy voice, slow, smug, cocky and macho, speaking like a self-proclaimed alpha wolf. Pace: normal.'},
 {id:'a2',who:'artyom',rms:-16,text:'Ты чё, блядь, несешь?! Я сдохнуть хочу, но не от сковороды по ебалу! Сгенерируй нормальные извинения, кусок говна!',style:'Style: raw horrified outrage, hoarse, screaming, voice cracking. '+F},
 {id:'w2',who:'wolf',rms:-19,fx:ROBOT,text:'Ошибка пятьсот два. Посмотрите рекламу казино, чтобы разблокировать сочувствие.',style:'Style: flat, cold, robotic synthetic voice reading an error message, monotone. Pace: normal.'},
 {id:'a3',who:'artyom',rms:-15,text:'А-а-а-а-а-а-а!',style:'Style: a long animal scream of rage and despair while throwing something. Pace: normal.'},
],
4:[
 {id:'a1',who:'artyom',rms:-23,text:'У нее же свой аккаунт… У нее точно есть лимит… Мне нужен всего один запрос. Один маленький, сука, промпт…',style:'Style: ominous creeping whisper, obsessed, drug-addict gleam, slow and unhinged, hushed with a raspy edge. Pace: normal.'},
 {id:'a2',who:'artyom',rms:-18,text:'Есть! Моя тупая рыбка!',style:'Style: gleeful triumphant whisper-shout, a maniacal giggle in the voice, shaky. Pace: fast.'},
],
5:[
 {id:'k1',who:'katya',rms:-23,text:'У тебя тоже лимит кончился?',style:'Style: quiet, exhausted, doomed, flat, hoarse from crying. Pace: normal.'},
 {id:'a1',who:'artyom',rms:-22,text:'Ага. Через четыре часа пятьдесят пять минут обновится.',style:'Style: dull, hollow, monotone, nodding, beaten down. Pace: normal.'},
 {id:'k2',who:'katya',rms:-22,text:'Ладно. Давай тогда пока молча посидим, а в два ночи нормально поскандалим и расстанемся.',style:'Style: sighing, tired, resigned, deadpan, then calm. Pace: normal.'},
 {id:'a2',who:'artyom',rms:-22,text:'Базару ноль. Как раз к тому времени протрезвею.',style:'Style: deadpan, flat, casual, a bit slurred, hollow. Pace: normal.'},
]};
export async function ensureVoices(n){
  const dir=path.join(here,'scene'+n,'raw'); fs.mkdirSync(dir,{recursive:true});
  for(const c of CLIPS[n]){ const out=path.join(dir,c.id+'.wav'); if(fs.existsSync(out)&&fs.statSync(out).size>5000) continue;
    const r=await tts({text:`### DIRECTOR'S NOTES\n${c.style}\nLanguage: Russian.\n\n### TRANSCRIPT\n${c.text}`,voice:VOICE[c.who],out}); await new Promise(r=>setTimeout(r,1500)); console.log('TTS',n,c.id,r.model,(r.bytes/48000).toFixed(2)+'s'); }
  return dir;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) for(const n of (process.argv[2]?[+process.argv[2]]:[2,3,4,5])) await ensureVoices(n);
