// Параметризованный билдер звука сцен 2-5.  set -a; . ../../.env; set +a; node scene_build.mjs <N>
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url'; import {execFileSync} from 'node:child_process';
import {ensureVoices,CLIPS} from './scene_voices.mjs';
import * as X from './scene_sfx.mjs';
const SR=X.SR, N_=+process.argv[2]; if(![2,3,4,5].includes(N_)) throw new Error('scene 2..5');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw=path.join(root,`audio/scene${N_}/raw`), work=path.join(root,`audio/scene${N_}/work`), pub=path.join(root,`video/public/audio/scene${N_}`), linesDir=path.join(pub,'lines');
for(const d of [work,linesDir,path.join(root,`video/src/scene${N_}`)]) fs.mkdirSync(d,{recursive:true});
await ensureVoices(N_);
let TEMPO={}; const tf=path.join(root,`audio/scene${N_}_tempo.json`); if(fs.existsSync(tf)) TEMPO=JSON.parse(fs.readFileSync(tf,'utf8'));
const DEF_T={2:{k1:1.0,a1:1.2,a2:1.15,a3:1.2,a4:1.0},3:{a1:1.25,w1:1.1,a2:1.25,w2:1.05,a3:1.0},4:{a1:1.0,a2:1.1},5:{k1:1.1,a1:1.1,k2:1.2,a2:1.15}};
const dec=(c)=>{const t=TEMPO[c.id]??DEF_T[N_][c.id]??1;
  const af=[`silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05,areverse,silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-38dB:stop_silence=0.2`,t!==1?`atempo=${t}`:null,c.fx||null].filter(Boolean).join(',');
  const b=execFileSync('ffmpeg',['-v','error','-i',path.join(raw,c.id+'.wav'),'-af',af,'-ar',String(SR),'-ac','1','-f','f32le','-'],{maxBuffer:1<<28});
  const x=Float32Array.from(new Float32Array(b.buffer,b.byteOffset,b.length/4)); let e=0;for(const v of x)e+=v*v; const rms=Math.sqrt(e/x.length)||1e-6; const g=Math.pow(10,c.rms/20)/rms;
  for(let i=0;i<x.length;i++)x[i]*=g; return x;};
const V={}; for(const c of CLIPS[N_])V[c.id]=dec(c);
const d=(id)=>V[id].length/SR;
const cat=(...a)=>{const n=a.reduce((s,x)=>s+x.length,0);const o=new Float32Array(n);let p=0;for(const x of a){o.set(x,p);p+=x.length;}return o;};
const T={}, cues={}; let DUR=0; const plan=[]; // plan: [fn(add), ...] выполняются после вычисления DUR
const duckList=[]; // [s,e,level]
const sfx=(fn)=>plan.push(fn);
let music=null; // [fn(sec), gain, fadeOutSec]
X.reseed(1000+N_);
// ---------------- раскладка ----------------
if(N_===2){
  let t=0.8; T.k1=t; t+=d('k1')+0.3; T.a1=t; t+=d('a1');
  const slap=t+0.7, door=slap+1.7, water=door+0.45; T.a2=door+1.4; t=T.a2+d('a2')+1.3; T.a3=t; t+=d('a3');
  const pasta=t+0.6, fire=pasta+1.1; T.a4=fire+0.15; const wine=fire+1.9, smoke=wine+3.6; DUR=smoke+4.5;
  Object.assign(cues,{slap,doorSlam:door,waterOn:water,pastaDump:pasta,fireWhoosh:fire,wineSplash:wine,smokeFull:smoke});
  music=[(s)=>X.panicMusic(s),0.55]; duckList.push([slap-0.03,slap+1.1,0.05]);
  sfx((a)=>{ a(X.slap(),slap,1.0,0); a(X.doorSlam(),door,1.0,0.1); a(X.water(DUR-water),water,0.16,0.4); a(X.sobs(DUR-door-0.9),door+0.9,0.5,0.3);
    a(X.pastaDump(),pasta,0.9,0); a(X.fireWhoosh(),fire,0.9,0); a(X.fireCrackle(DUR-fire),fire+0.5,0.35,0);
    a(X.wineSplash(),wine,0.9,0.1); a(X.steamHiss(2.8),wine+0.1,0.5,0); a(X.roomTone(DUR,1),0,0.2,0); });
}
if(N_===3){
  let t=0.9; T.a1=t; t+=d('a1'); const open=t+0.45; T.w1=open+1.9; t=T.w1+d('w1')+0.55; T.a2=t; t+=d('a2'); const err=t+0.55; T.w2=err+1.0; t=T.w2+d('w2');
  const th=t+0.35, sm=th+0.5; T.a3=th+0.05; DUR=sm+4.2;
  Object.assign(cues,{wolfOpen:open,wolfReply:T.w1,error502:err,phoneThrow:th,phoneSmash:sm});
  music=null;
  sfx((a)=>{ a(X.roomTone(DUR,1.6),0,0.25,0); a(X.fireCrackle(DUR),0,0.1,0.3); a(X.cartCreak(1.4),open-0.2,0.7,0); a(X.jingle8(2.4),open+0.35,0.5,0);
    a(X.error502(),err,0.85,0); a(X.whoosh(0.4),th,0.9,0.2); a(X.phoneSmash(),sm,1.0,0.3);
    a(X.roomTone(4.2,2),sm,0.25,0); });
}
if(N_===4){
  let t=4.5; T.a1=t; t+=d('a1'); const fid=t+2.4, t1=fid+2.2, t2=t1+2.3, t0=t2+2.3, unlock=t0+1.1; T.a2=unlock+0.35; const open=T.a2+d('a2')+1.0; DUR=open+4.6;
  Object.assign(cues,{faceIdFail:fid,try1:t1,try2:t2,try0000:t0,unlock,appOpen:open});
  music=[(s)=>X.stealthMusic(s),0.7]; duckList.push([open-0.02,DUR,0.0]);
  sfx((a)=>{ a(X.roomTone(DUR,1.6),0,0.2,0); a(X.faceScan(),fid-1.5,0.7,0.3); a(X.failBuzz(),fid,0.9,0.3);
    for(const [tt,seq] of [[t1,[0,6,1,4]],[t2,[1,4,1,2]],[t0,[0,0,0,0]]]){ seq.forEach((k,i)=>a(X.digitBeep(700+k*90),tt+i*0.28,0.9,0.3)); }
    a(X.wrongTone(),t1+1.35,0.8,0.3); a(X.wrongTone(),t2+1.35,0.8,0.3);
    a(X.unlockDing(),unlock,0.9,0.3); a(X.appOpen(),open,0.8,0.3); a(X.dreadSting(3.6),open+0.05,0.8,0);
    a(X.chair(),1.0,0.12,-0.5); });
}
if(N_===5){
  const reveal=0.8, latch=reveal+3.0; const mum=latch+2.4; T.mk=mum; T.ma=mum+0.25; T.k1=mum+2.6+0.9; let t=T.k1+d('k1')+0.6; T.a1=t; t+=d('a1')+0.7; T.k2=t; t+=d('k2')+0.5; const sit=t; t+=1.3; T.a2=t; t+=d('a2'); const gl=t+0.5; const tick=gl+1.6; DUR=tick+9.5;
  const black=DUR-3.0;
  V.mk=X.mumble(215); V.ma=X.mumble(112,2.2);
  Object.assign(cues,{reveal,latchClick:latch,tickStart:tick,finalBlack:black});
  music=null;
  sfx((a)=>{ a(X.roomTone(DUR,1.6),0,0.25,0); a(X.dreadSting(3.0),reveal,0.5,0); a(X.latchClick(),latch,0.95,0.2); a(X.doorCreak(1.3),latch+0.35,0.35,0.2);
    a(X.chair(),sit-0.1,0.5,0.3); a(X.chair(),sit+1.2,0.5,-0.3); a(X.glug(),gl,0.5,-0.3); a(X.bottleSet(),gl+1.1,0.6,-0.3);
    a(X.clockTick(DUR-tick),tick,0.9,0); a(X.fireCrackle(tick),0,0.07,0.3); });
}
// ---------------- микс ----------------
const N=Math.round(DUR*SR); const L=new Float32Array(N), R=new Float32Array(N);
let BUS=1; // общий множитель шины: музыка/SFX тише голоса
const add=(x,at,g=1,pan=0)=>{if(!x||!g)return;const n0=Math.round(at*SR);const gl=g*BUS*Math.cos((pan+1)*Math.PI/4)*1.414,gr=g*BUS*Math.sin((pan+1)*Math.PI/4)*1.414;for(let i=0;i<x.length&&n0+i<N;i++){if(n0+i<0)continue;L[n0+i]+=x[i]*gl;R[n0+i]+=x[i]*gr;}};
const voiceIds=Object.keys(T).filter(k=>V[k]);
BUS=0.32;
if(music){ const m=music[0](DUR); const env=new Float32Array(N).fill(1);
  const duck=(s,e,lv)=>{for(let i=Math.max(0,Math.round(s*SR));i<Math.min(N,Math.round(e*SR));i++)env[i]=Math.min(env[i],lv);};
  for(const id of voiceIds)duck(T[id]-0.05,T[id]+d(id)+0.05,0.18); for(const [s,e,lv] of duckList)duck(s,e,lv);
  let y=1;for(let i=0;i<N;i++){y+=(env[i]<y?0.002:0.0004)*(env[i]-y);env[i]=y;}
  const fo=Math.round(1.5*SR); for(let i=0;i<m.length;i++){m[i]*=env[i]*music[1]*(i>m.length-fo?(m.length-i)/fo:1);}
  add(m,0,1,-0.1); add(cat(new Float32Array(Math.round(0.012*SR)),m),0,0.6,0.3); }
// sfx — приглушаем под голосом слегка не нужно (короткие); общий список
BUS=0.4;
for(const f of plan) f(add);
BUS=1;
const PAN={artyom:-0.15,katya:0.2,wolf:0.05};
const whoOf=Object.fromEntries(CLIPS[N_].map(c=>[c.id,c.who])); whoOf.mk='katya'; whoOf.ma='artyom';
// выравниваем громкость каждой реплики (активный RMS ≈ -17 dBFS), чтобы голос всегда был слышен поверх музыки и SFX
const normVoice=(x)=>{let e=0,c=0;for(let i=0;i<x.length;i++){if(Math.abs(x[i])>0.02){e+=x[i]*x[i];c++;}}const rms=Math.sqrt(e/(c||1))||1;const g=Math.min(6,0.14/rms);return Float32Array.from(x,v=>v*g);};
for(const id of voiceIds)V[id]=normVoice(V[id]);
for(const id of voiceIds){ const gain=(id==='mk'||id==='ma')?0.75:1; add(V[id],T[id],gain,PAN[whoOf[id]]); }
// мягкий лимитер
for(let i=0;i<N;i++){for(const A of [L,R]){const v=A[i];A[i]=Math.abs(v)>0.6?Math.sign(v)*(0.6+0.4*Math.tanh((Math.abs(v)-0.6)/0.4)):v;}}
let pk=0;for(let i=0;i<N;i++)pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i]));
const gain=Math.pow(10,-1.5/20)/pk; // нормализация пика к -1.5 dBFS
const il=new Float32Array(N*2);for(let i=0;i<N;i++){il[2*i]=L[i]*gain;il[2*i+1]=R[i]*gain;}
const rawF=path.join(work,'master.f32'); fs.writeFileSync(rawF,Buffer.from(il.buffer));
execFileSync('ffmpeg',['-y','-v','error','-f','f32le','-ar',String(SR),'-ac','2','-i',rawF,'-c:a','pcm_s16le',path.join(pub,`scene${N_}_master.wav`)]);
const wr=(x,f)=>{const g=gain;const y=Float32Array.from(x,v=>v*g);fs.writeFileSync(rawF+'.t',Buffer.from(y.buffer));execFileSync('ffmpeg',['-y','-v','error','-f','f32le','-ar',String(SR),'-ac','1','-i',rawF+'.t','-c:a','pcm_s16le',f]);};
for(const id of voiceIds)wr(V[id],path.join(linesDir,id+'.wav')); fs.rmSync(rawF+'.t',{force:true});
function mouth(x){const w=SR/24,n=Math.ceil(x.length/w);let m=[];
  for(let k=0;k<n;k++){let e=0,c=0;for(let i=Math.floor(k*w);i<Math.min(x.length,Math.floor((k+1)*w));i++){e+=x[i]*x[i];c++;}m.push(Math.sqrt(e/(c||1)));}
  const sm=m.map((v,i)=>(0.25*(m[i-1]??v)+0.5*v+0.25*(m[i+1]??v)));const mx=Math.max(...sm)||1;return sm.map(v=>{let q=Math.pow(v/mx,0.7);return q<0.06?0:+Math.min(1,q).toFixed(3);});}
const txt=Object.fromEntries(CLIPS[N_].map(c=>[c.id,c.text])); txt.mk='м-м-э… м-м-э…'; txt.ma='м-м-э… м-м-э…';
const r2=(v)=>+v.toFixed(3);
const timing={fps:24,durationSec:r2(DUR),master:`audio/scene${N_}/scene${N_}_master.wav`,
 lines:voiceIds.sort((a,b)=>T[a]-T[b]).map(id=>({id,who:whoOf[id],text:txt[id],startSec:r2(T[id]),endSec:r2(T[id]+d(id)),mouth:mouth(V[id])})),
 cues:Object.entries(cues).map(([id,sec])=>({id,sec:r2(sec)}))};
fs.writeFileSync(path.join(root,`video/src/scene${N_}/timing.json`),JSON.stringify(timing,null,1));
console.log(JSON.stringify({scene:N_,dur:timing.durationSec,lines:timing.lines.map(l=>[l.id,l.startSec,l.endSec]),cues:timing.cues.map(c=>c.id+'='+c.sec).join(' ')}));
