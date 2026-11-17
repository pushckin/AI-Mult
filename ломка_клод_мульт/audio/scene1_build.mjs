// Сборка звука сцены 1. Запуск: set -a; . ../../.env; set +a; node scene1_build.mjs
// Идемпотентно: сырые TTS-клипы кэшируются в audio/scene1/raw.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url'; import {execFileSync} from 'node:child_process';
import {ensureVoices,CLIPS} from './scene1_voices.mjs';
import * as S from './scene1_synth.mjs';
const SR=S.SR, root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw=path.join(root,'audio/scene1/raw'), work=path.join(root,'audio/scene1/work'), pub=path.join(root,'video/public/audio/scene1'), linesDir=path.join(pub,'lines');
for(const d of [work,linesDir]) fs.mkdirSync(d,{recursive:true});
await ensureVoices();

// ---- декод + обрезка тишины + ускорение (tempo) ----
const TEMPO={a1:1.0,k1:1.0,a2:1.0,a3:1.0,k2:1.0,a4a:1.0,a4b:1.0};
if(fs.existsSync(path.join(root,'audio/scene1_tempo.json'))) Object.assign(TEMPO,JSON.parse(fs.readFileSync(path.join(root,'audio/scene1_tempo.json'),'utf8')));
const TARGET_RMS={a1:-21,k1:-21,a2:-21,a3:-24,k2:-21,a4a:-23,a4b:-17};
function decode(id){
  const t=TEMPO[id]; const af=`silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05,areverse,silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-38dB:stop_silence=0.2`+(t!==1?`,atempo=${t}`:'');
  const b=execFileSync('ffmpeg',['-v','error','-i',path.join(raw,id+'.wav'),'-af',af,'-ar',String(SR),'-ac','1','-f','f32le','-'],{maxBuffer:1<<28});
  const f=new Float32Array(b.buffer,b.byteOffset,b.length/4); const x=Float32Array.from(f);
  let e=0;for(const v of x)e+=v*v; const rms=Math.sqrt(e/x.length)||1e-6; const g=Math.pow(10,TARGET_RMS[id]/20)/rms;
  for(let i=0;i<x.length;i++)x[i]*=g; return x;
}
const V={}; for(const c of CLIPS)V[c.id]=decode(c.id);
const dur=(x)=>x.length/SR;
const cat=(...a)=>{const n=a.reduce((s,x)=>s+(x.length||0),0);const o=new Float32Array(n);let p=0;for(const x of a){o.set(x,p);p+=x.length;}return o;};
const A4=cat(V.a4a,new Float32Array(Math.round(0.45*SR)),V.a4b); V.a4=A4;

// ---- раскладка ----
const GAP=(a)=>a; const T={};
let t=0.9; // немного скрипки перед началом
T.a1=t; t+=dur(V.a1)+0.35;
T.k1=t; t+=dur(V.k1)+0.3;
T.a2=t; t+=dur(V.a2)+0.35;
T.a3=t; t+=dur(V.a3);
const a3End=t, sendTap=a3End+0.25, zapT=sendTap+0.5;
T.k2=zapT+1.6; t=T.k2+dur(V.k2)+0.35;
T.a4=t; const a4End=t+dur(A4);
const waxDrop=a4End+1.3, DUR=a4End+2.5;
// ---- микс ----
const N=Math.round(DUR*SR); const L=new Float32Array(N), R=new Float32Array(N);
let BUS=0.32; // музыка/SFX тише голоса (голоса переключают на 1)
const add=(x,at,g=1,pan=0)=>{const n0=Math.round(at*SR);const gl=g*BUS*Math.cos((pan+1)*Math.PI/4),gr=g*BUS*Math.sin((pan+1)*Math.PI/4);
  for(let i=0;i<x.length&&n0+i<N;i++){if(n0+i<0)continue;L[n0+i]+=x[i]*gl*1.414;R[n0+i]+=x[i]*gr*1.414;}};
// скрипка до zap
const vio=S.violin(zapT); const fade=Math.round(0.03*SR);
for(let i=0;i<fade;i++)vio[vio.length-1-i]*=i/fade;
{ // дуcking: музыка тише под голосом
  const env=new Float32Array(vio.length).fill(1);
  const duck=(s,e)=>{for(let i=Math.round(s*SR);i<Math.round(e*SR)&&i<env.length;i++)env[i]=0.18;};
  for(const id of ['a1','k1','a2','a3'])duck(T[id]-0.05,T[id]+dur(V[id])+0.05);
  let y=1;for(let i=0;i<env.length;i++){y+= (env[i]<y?0.0015:0.00025)*(env[i]-y);env[i]=y;}
  for(let i=0;i<vio.length;i++)vio[i]*=env[i]*0.55;
  const k=Math.round(0.011*SR); add(vio,0,1,-0.15); add(cat(new Float32Array(k),vio),0,0.8,0.25);
}
BUS=0.4;
add(S.screech(0.7),zapT,0.55,0); add(S.zap(0.75),zapT,0.8,0);
// клавиши: щелчки во время a3 (и тап отправки)
{ const ts=[];let c=T.a3+0.1;while(c<a3End){ts.push(c-T.a3);c+=0.07+0.11*Math.abs(Math.sin(c*13.7));} add(S.keyClicks(ts),T.a3,0.28,0.4); add(S.keyClicks([0]),sendTap,0.5,0.4); }
add(S.creak(0.6),T.k1+dur(V.k1)-0.1,0.3,-0.3); add(S.creak(0.5),T.a2-0.15,0.22,0.3);
add(S.glitch(0.5),zapT+0.2,0.35,0); add(S.glitch(0.35),zapT+0.9,0.2,0);
add(S.hiss(1.1),waxDrop-0.02,0.35,-0.2); add(S.plip(),waxDrop-0.05,0.5,-0.2);
{ const tail=a4End+0.1; const rt=S.roomTone(DUR-tail+0.0); add(rt,tail,0.5,0); // room tone в тишине
  const rt2=S.roomTone(zapT); add(rt2,0,0.12,0); }
S.resetSeed(777);
BUS=1;
const normVoice=(x)=>{let e=0,c=0;for(let i=0;i<x.length;i++){if(Math.abs(x[i])>0.02){e+=x[i]*x[i];c++;}}const rms=Math.sqrt(e/(c||1))||1;const g=Math.min(6,0.14/rms);return Float32Array.from(x,v=>v*g);};
for(const id of Object.keys(V))V[id]=normVoice(V[id]);

if(process.env.CENSOR==='1'){ // цензурная версия: мат заменён пиком 1 кГц
  const CW=(JSON.parse(fs.readFileSync(path.join(root,'audio/censor_windows.json'),'utf8'))[String(1)])||{};
  for(const id of Object.keys(CW)){ const x=V[id]; if(!x)continue; const f=Math.round(0.004*SR);
    for(const [s,e] of CW[id]){ const i0=Math.max(0,Math.round(s*SR)), i1=Math.min(x.length,Math.round(e*SR));
      for(let i=i0;i<i1;i++){ const g=Math.min(1,(i-i0)/f,(i1-1-i)/f); x[i]=0.22*Math.sin(2*Math.PI*1000*i/SR)*Math.max(0,g); } } }
}
const place={a1:T.a1,k1:T.k1,a2:T.a2,a3:T.a3,k2:T.k2,a4:T.a4};
const pans={a1:-0.2,k1:0.2,a2:-0.2,a3:-0.1,k2:0.2,a4:-0.1};
for(const id of Object.keys(place))add(V[id],place[id],1,pans[id]);
// мягкий лимитер до -1.5 dBFS
let pk=0;for(let i=0;i<N;i++)pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i]));
const gain=Math.min(1,Math.pow(10,-1.5/20)/pk);
const il=new Float32Array(N*2);for(let i=0;i<N;i++){il[2*i]=L[i]*gain;il[2*i+1]=R[i]*gain;}
const rawF=path.join(work,'master.f32'); fs.writeFileSync(rawF,Buffer.from(il.buffer));
execFileSync('ffmpeg',['-y','-v','error','-f','f32le','-ar',String(SR),'-ac','2','-i',rawF,'-c:a','pcm_s16le',path.join(pub,'scene1_master.wav')]);
// дорожки реплик
const wr=(x,f)=>{const b=Buffer.from(x.buffer,x.byteOffset,x.byteLength);fs.writeFileSync(rawF+'.t',b);execFileSync('ffmpeg',['-y','-v','error','-f','f32le','-ar',String(SR),'-ac','1','-i',rawF+'.t','-c:a','pcm_s16le',f]);};
for(const id of ['a1','k1','a2','a3','k2','a4'])wr(V[id],path.join(linesDir,id+'.wav'));
fs.rmSync(rawF+'.t',{force:true});
// ---- mouth ----
function mouth(x){const w=SR/24,n=Math.ceil(x.length/w);let m=[];
  for(let k=0;k<n;k++){let e=0,c=0;for(let i=Math.floor(k*w);i<Math.min(x.length,Math.floor((k+1)*w));i++){e+=x[i]*x[i];c++;}m.push(Math.sqrt(e/(c||1)));}
  const sm=m.map((v,i)=>(0.25*(m[i-1]??v)+0.5*v+0.25*(m[i+1]??v)));
  const mx=Math.max(...sm)||1; return sm.map(v=>{let q=Math.pow(v/mx,0.7);return q<0.06?0:+Math.min(1,q).toFixed(3);});}
const meta={a1:'artyom',k1:'katya',a2:'artyom',a3:'artyom',k2:'katya',a4:'artyom'};
const txt=Object.fromEntries(CLIPS.map(c=>[c.id,c.text])); txt.a4=txt.a4a+' '+txt.a4b;
const r2=(v)=>+v.toFixed(3);
const timing={fps:24,durationSec:r2(DUR),master:'audio/scene1/scene1_master.wav',
 lines:Object.keys(place).map(id=>({id,who:meta[id],text:txt[id],startSec:r2(place[id]),endSec:r2(place[id]+dur(V[id])),mouth:mouth(V[id])})),
 cues:[{id:'sendTap',sec:r2(sendTap)},{id:'zap',sec:r2(zapT)},{id:'violinStop',sec:r2(zapT)},{id:'limitAppears',sec:r2(zapT+0.2)},{id:'waxDrop',sec:r2(waxDrop)}]};
fs.writeFileSync(path.join(root,'video/src/scene1/timing.json'),JSON.stringify(timing,null,1));
console.log(JSON.stringify({dur:timing.durationSec,lines:timing.lines.map(l=>[l.id,l.startSec,l.endSec]),cues:timing.cues,peakGain:gain}));
