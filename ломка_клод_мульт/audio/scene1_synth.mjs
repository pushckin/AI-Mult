// Синтез музыки и SFX (Float32, 48 кГц, моно). Детерминированный (seed-ГСЧ).
export const SR=48000;
let seed=12345; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
export const resetSeed=(s=12345)=>{seed=s;};
const buf=(sec)=>new Float32Array(Math.max(1,Math.round(sec*SR)));
const mtof=(m)=>440*Math.pow(2,(m-69)/12);
const lp=(x,a)=>{let y=0;for(let i=0;i<x.length;i++){y+=a*(x[i]-y);x[i]=y;}return x;};
const hp=(x,a)=>{let y=0;for(let i=0;i<x.length;i++){y+=a*(x[i]-y);x[i]=x[i]-y;}return x;};

// нота скрипки: аддитивный синтез + вибрато + мягкая атака
function violinNote(out,t0,dur,midi,vel=1,vibDepth=0.006){
  const f0=mtof(midi), n0=Math.round(t0*SR), n=Math.round(dur*SR);
  const harm=[1,.62,.5,.34,.25,.16,.11,.07,.05];
  let ph=harm.map(()=>0), vph=0, lpv=0;
  for(let i=0;i<n&&n0+i<out.length;i++){
    const t=i/SR;
    const att=Math.min(1,t/0.14), rel=Math.min(1,(dur-t)/0.25);
    const vibOn=Math.min(1,Math.max(0,(t-0.2)/0.4));
    vph+=2*Math.PI*(5.3+0.3*Math.sin(t*0.9))/SR;
    const f=f0*(1+vibDepth*vibOn*Math.sin(vph));
    let s=0;
    for(let h=0;h<harm.length;h++){ph[h]+=2*Math.PI*f*(h+1)/SR; s+=harm[h]*Math.sin(ph[h])*(1+0.15*Math.sin(t*3+h));}
    lpv+=0.18*(s-lpv); // мягкость
    out[n0+i]+=lpv*0.22*vel*att*rel*(0.9+0.1*Math.sin(t*4.1));
  }
}
// romantic progression: Am - F - C - E (мягко) -> Dm - E7 - Am
export function violin(sec){
  const out=buf(sec+0.5);
  const mel=[ // [beat start (sec), dur, midi]
   [0.0,2.4,69],[2.4,1.2,72],[3.6,2.4,76],
   [6.0,1.2,77],[7.2,1.2,76],[8.4,2.4,72],
   [10.8,1.2,74],[12.0,1.2,72],[13.2,2.4,71],
   [15.6,1.2,68],[16.8,1.2,71],[18.0,3.0,76],
   [21.0,2.4,77],[23.4,1.2,76],[24.6,3.0,72],
   [27.6,2.4,69],[30,3.0,64],[33,3,69],[36,4,69]];
  const bass=[[0,57],[6,53],[12,48],[18,52],[24,50],[27.6,52],[33,57],[36,57]];
  for(const [t,d,m] of mel){ if(t<sec) violinNote(out,t,Math.min(d+0.3,sec+0.4-t),m,1); }
  for(let i=0;i<bass.length;i++){const [t,m]=bass[i];const d=(bass[i+1]?bass[i+1][0]:t+6)-t; if(t<sec){violinNote(out,t,d+0.4,m,0.7,0.004);violinNote(out,t+0.02,d+0.4,m+7,0.35,0.004);violinNote(out,t+0.04,d+0.4,m+12,0.4,0.004);}}
  // мягкий реверб-эхо
  const o=out.slice(); for(const [d,g] of [[0.13,.35],[0.29,.25],[0.47,.18],[0.71,.12]]){const k=Math.round(d*SR);for(let i=k;i<o.length;i++)o[i]+=out[i-k]*g;}
  return o.subarray(0,Math.round(sec*SR));
}
// визг обрыва: глиссандо вверх + шум
export function screech(sec=0.7){
  const o=buf(sec); let ph=0,ph2=0;
  for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec; const f=880*Math.pow(2.8,Math.min(1,u*1.3))*(1+0.02*Math.sin(t*60));
    ph+=2*Math.PI*f/SR; ph2+=2*Math.PI*f*1.51/SR;
    const env=Math.min(1,t/0.01)*Math.pow(1-u,1.6);
    o[i]=(Math.sin(ph)+0.6*Math.sin(2*ph)+0.5*Math.sin(ph2)+0.35*rnd())*0.35*env;}
  return o;
}
export function zap(sec=0.75){ // короткое замыкание: треск + падение частоты
  const o=buf(sec); let ph=0;
  for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec;
    const f=1800*Math.pow(1-u,2.2)+60; ph+=2*Math.PI*f/SR;
    const sq=Math.sign(Math.sin(ph))*0.5+Math.sin(ph*1.5)*0.2;
    const crackle=(Math.random_=rnd())>0.8?rnd()*1.2:rnd()*0.15;
    const gate=(Math.sin(t*180+Math.sin(t*37)*4)>-0.2)?1:0.25;
    const env=Math.min(1,t/0.004)*Math.pow(1-u,0.9);
    o[i]=Math.tanh((sq*gate+crackle)*1.6)*0.5*env;}
  return o;
}
export function keyClicks(times){ // times — секунды в клипе, длина clip=last+0.2
  const len=times[times.length-1]+0.2; const o=buf(len);
  for(const t of times){const n0=Math.round(t*SR);const g=0.5+0.4*Math.abs(rnd());
    for(let i=0;i<Math.round(0.03*SR)&&n0+i<o.length;i++){const u=i/SR;o[n0+i]+=(rnd()*Math.exp(-u*300)+0.6*Math.sin(2*Math.PI*(1800+300*rnd())*u)*Math.exp(-u*450))*g*0.5;}}
  return o;
}
export function glitch(sec=0.5){
  const o=buf(sec); let hold=0,v=0;
  for(let i=0;i<o.length;i++){const t=i/SR;if(i%Math.round(SR/ (900+2000*Math.abs(Math.sin(t*50))))===0)v=rnd();
    o[i]=(v*0.5+rnd()*0.15)*(Math.sin(t*90)>0?1:0.2)*Math.pow(1-t/sec,1.5)*0.7;}
  return o;
}
export function plip(){ // капля воска
  const o=buf(0.35); let ph=0;
  for(let i=0;i<o.length;i++){const t=i/SR;const f=900+1500*Math.exp(-t*35);ph+=2*Math.PI*f/SR;o[i]=Math.sin(ph)*Math.exp(-t*22)*0.55+rnd()*Math.exp(-t*400)*0.2;}
  return o;
}
export function hiss(sec=1.0){ // шипение свечи
  const o=buf(sec); for(let i=0;i<o.length;i++){const t=i/SR;o[i]=rnd()*Math.min(1,t/0.03)*Math.pow(1-t/sec,2.2)*0.25;}
  hp(o,0.2); lp(o,0.6); return o;
}
export function creak(sec=0.6){ // скрип стула
  const o=buf(sec); let ph=0;
  for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec;const f=320+120*Math.sin(u*9)+80*u+30*rnd();ph+=2*Math.PI*f/SR;
    o[i]=(Math.sign(Math.sin(ph))*0.3+Math.sin(ph*2.7)*0.2+rnd()*0.1)*Math.sin(Math.PI*u)*0.3;}
  lp(o,0.35); return o;
}
export function roomTone(sec){
  const o=buf(sec); for(let i=0;i<o.length;i++)o[i]=rnd();
  lp(o,0.02); lp(o,0.08); for(let i=0;i<o.length;i++)o[i]*=0.5+0.03*Math.sin(2*Math.PI*50*i/SR); return o;
}
