// SFX и музыка сцен 2-5 (Float32, 48 кГц, моно, детерминированно)
export const SR=48000;
let seed=4242; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
export const reseed=(s=4242)=>{seed=s;};
const buf=(s)=>new Float32Array(Math.max(1,Math.round(s*SR)));
const mtof=(m)=>440*Math.pow(2,(m-69)/12);
const lp=(x,a)=>{let y=0;for(let i=0;i<x.length;i++){y+=a*(x[i]-y);x[i]=y;}return x;};
const hp=(x,a)=>{let y=0;for(let i=0;i<x.length;i++){y+=a*(x[i]-y);x[i]=x[i]-y;}return x;};
// биквад-полоса
function bp(x,f,Q=4){const w=2*Math.PI*f/SR,al=Math.sin(w)/(2*Q),b0=al,a0=1+al,a1=-2*Math.cos(w),a2=1-al;
 let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=(b0*x[i]-b0*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x[i];y2=y1;y1=v;x[i]=v;}return x;}
const noise=(s)=>{const o=buf(s);for(let i=0;i<o.length;i++)o[i]=rnd();return o;};
const mixInto=(o,x,at,g=1)=>{const n0=Math.round(at*SR);for(let i=0;i<x.length&&n0+i<o.length;i++)if(n0+i>=0)o[n0+i]+=x[i]*g;};
export {mixInto};

// ---------- сцена 2 ----------
export function panicMusic(sec){
  const o=buf(sec); let beat=0,bt=0; const notes=[33,34,36,33,34,39,33,32]; let ni=0; let ph1=0,ph2=0,ph3=0;
  for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec;
    ph1+=2*Math.PI*55/SR;ph2+=2*Math.PI*58.3/SR;ph3+=2*Math.PI*(300*Math.pow(6,u))/SR;
    const dr=(Math.sin(ph1)+0.5*Math.sin(2*ph1)+Math.sin(ph2)+0.4*Math.sin(2*ph2))*0.07*(0.6+0.8*u);
    const ris=Math.sin(ph3)*0.05*u*u*(0.6+0.4*Math.sin(t*(6+8*u)*2*Math.PI));
    o[i]+=dr+ris;}
  // пульс: темп растёт
  let t=0; while(t<sec){const u=t/sec,bpm=100+80*u*u; const n0=Math.round(t*SR);const m=notes[ni++%notes.length]+(u>0.5?12:0);const f=mtof(m);
    for(let i=0;i<Math.round(0.22*SR)&&n0+i<o.length;i++){const k=i/SR;const e=Math.exp(-k*16);o[n0+i]+=(Math.sin(2*Math.PI*f*k)+0.5*Math.sign(Math.sin(2*Math.PI*f*k)))*0.18*e;}
    // тик
    for(let i=0;i<Math.round(0.02*SR)&&n0+i<o.length;i++)o[n0+i]+=rnd()*Math.exp(-i/SR*350)*0.1*(0.4+u);
    t+=60/bpm/2;}
  // диссонантные высокие «скрипки» в конце
  const hi=buf(sec); let a=0,b=0;for(let i=0;i<hi.length;i++){const tt=i/SR,u=tt/sec;a+=2*Math.PI*(1480+40*Math.sin(tt*5))/SR;b+=2*Math.PI*1568/SR;hi[i]=(Math.sin(a)+Math.sin(b))*0.04*Math.max(0,u-0.35)*1.5;}
  for(let i=0;i<o.length;i++)o[i]+=hi[i];
  return o;
}
export function slap(){const o=buf(0.5);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=rnd()*Math.exp(-t*60)*0.9+Math.sin(2*Math.PI*(180-100*t)*t)*Math.exp(-t*30)*0.7;}bp(o,2500,0.5);const l=buf(0.5);for(let i=0;i<l.length;i++){const t=i/SR;l[i]=Math.sin(2*Math.PI*(150*Math.exp(-t*8))*t)*Math.exp(-t*25);}for(let i=0;i<o.length;i++)o[i]=o[i]*1.4+l[i]*0.6;return o;}
export function doorSlam(){const o=buf(1.6);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=Math.sin(2*Math.PI*(75*Math.exp(-t*3)+35)*t)*Math.exp(-t*7)*1.0+rnd()*Math.exp(-t*40)*0.8;}
  const r=buf(1.6);for(let k=0;k<5;k++){const n0=Math.round((0.06+k*0.07)*SR);for(let i=0;i<4000&&n0+i<r.length;i++)r[n0+i]+=Math.sin(2*Math.PI*(900+k*170)*i/SR)*Math.exp(-i/SR*60)*0.12;}
  for(let i=0;i<o.length;i++)o[i]+=r[i];
  // щеколда после хлопка
  const n=Math.round(0.5*SR);for(let i=0;i<2500;i++){o[n+i]+=Math.sin(2*Math.PI*3200*i/SR)*Math.exp(-i/SR*200)*0.35+rnd()*Math.exp(-i/SR*500)*0.3;}return o;}
export function water(sec){const o=noise(sec);bp(o,2400,0.6);const g=buf(sec);for(let i=0;i<g.length;i++){const t=i/SR;g[i]=0.6+0.4*Math.sin(t*9+Math.sin(t*3.1)*3)*Math.sin(t*13.3);o[i]*=g[i]*Math.min(1,t/0.4)*1.4;}
  const lo=noise(sec);lp(lo,0.03);for(let i=0;i<o.length;i++)o[i]+=lo[i]*1.2;return o;}
// формантный синтез: f0(t) — функция, formants [[f,bw,gain]...]
export function formantVoice(sec,f0fn,fm,ampfn,breath=0.05){
  const src=buf(sec);let ph=0;for(let i=0;i<src.length;i++){const t=i/SR;ph+=f0fn(t)/SR;ph%=1;const g=ph<0.5?(ph*2):(2-2*ph*1)*1; src[i]=(ph*2-1)*0.8+rnd()*breath;}
  const out=buf(sec);for(const [f,q,g] of fm){const c=Float32Array.from(src);bp(c,f,q);for(let i=0;i<out.length;i++)out[i]+=c[i]*g;}
  for(let i=0;i<out.length;i++)out[i]*=ampfn(i/SR);return out;}
export function sobs(sec){const o=buf(sec);let t=0.1;let k=0;
  while(t<sec-0.4){const d=0.35+0.2*Math.abs(rnd()),f0s=330+60*rnd();
    // вдох
    const inh=noise(0.28);bp(inh,1800,1.2);for(let i=0;i<inh.length;i++)inh[i]*=Math.sin(Math.PI*i/inh.length)*0.35;mixInto(o,inh,t,1);
    const v=formantVoice(d,(x)=>f0s*(1+0.1*Math.sin(x*45))-60*x/d*1.5+8*Math.sin(x*60),[[750,6,1],[1250,8,0.6],[2800,10,0.2]],(x)=>Math.min(1,x/0.04)*Math.pow(Math.max(0,1-x/d),0.6)*(0.7+0.3*Math.sin(x*40)),0.12);
    mixInto(o,v,t+0.28,0.7);t+=0.28+d+0.25+0.4*Math.abs(rnd());k++;}
  return o;}
export function pastaDump(){const o=buf(1.1);for(let k=0;k<420;k++){const n0=Math.round((0.45*Math.pow(Math.abs(rnd()),0.8)+0.4*(k/420))*SR);const f=2500+3000*Math.abs(rnd());for(let i=0;i<500&&n0+i<o.length;i++)o[n0+i]+=Math.sin(2*Math.PI*f*i/SR)*Math.exp(-i/SR*700)*0.08*(0.5+Math.abs(rnd()));}
  const n=noise(1.1);hp(n,0.5);lp(n,0.5);for(let i=0;i<o.length;i++)o[i]+=n[i]*0.06*Math.sin(Math.PI*i/o.length);return o;}
export function fireWhoosh(){const o=buf(2.6);const n=noise(2.6);bp(n,300,0.5);const m=noise(2.6);bp(m,1500,0.4);
  for(let i=0;i<o.length;i++){const t=i/SR;const e=Math.min(1,t/0.08)*Math.exp(-t*0.9);o[i]=(n[i]*1.6+m[i]*(0.7+0.5*Math.sin(t*20)))*e*0.9+(Math.sin(2*Math.PI*(60+40*Math.min(t,0.4))*t))*Math.exp(-t*4)*0.6;}return o;}
export function fireCrackle(sec){const o=buf(sec);const n=noise(sec);lp(n,0.05);for(let i=0;i<o.length;i++)o[i]=n[i]*1.2;
  for(let k=0;k<sec*30;k++){const n0=Math.round(Math.abs(rnd())*sec*SR);for(let i=0;i<300&&n0+i<o.length;i++)o[n0+i]+=rnd()*Math.exp(-i/SR*900)*0.35;}return o;}
export function wineSplash(){const o=buf(0.5);const n=noise(0.5);bp(n,3000,0.5);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=n[i]*Math.exp(-t*12)*0.9;}return o;}
export function steamHiss(sec){const n=noise(sec);hp(n,0.3);bp(n,5000,0.5);for(let i=0;i<n.length;i++){const t=i/SR;n[i]*=Math.min(1,t/0.05)*Math.pow(1-t/sec,1.5)*1.6;}return n;}
export function scream(){return null;}

// ---------- сцена 3 ----------
export function cartCreak(sec=1.2){const o=buf(sec);let ph=0;for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec;const f=260+140*Math.sin(u*14)+170*u+25*rnd();ph+=2*Math.PI*f/SR;
  o[i]=(Math.sign(Math.sin(ph))*0.3+Math.sin(ph*1.5)*0.25+rnd()*0.12)*(0.5+0.5*Math.sin(u*Math.PI*6))*Math.sin(Math.PI*u)*0.6;}bp(o,700,0.7);for(let i=0;i<o.length;i++)o[i]*=2.2;return o;}
export function jingle8(sec=3){const o=buf(sec);const seq=[72,76,79,84,79,76,72,79,84,88,84,79,72,67,72,76];const step=0.14;
  for(let k=0;k*step<sec;k++){const m=seq[k%seq.length]+((k%7===6)?1:0),f=mtof(m);const n0=Math.round(k*step*SR);
    for(let i=0;i<Math.round(step*0.9*SR)&&n0+i<o.length;i++){const t=i/SR;o[n0+i]+=(Math.sin(2*Math.PI*f*t)>0?0.5:-0.5)*0.35*Math.exp(-t*8)+(Math.sin(2*Math.PI*f*1.01*t)>0.3?0.2:-0.1)*0.15;}
    if(k%2===0){const bf=mtof(m-24);for(let i=0;i<Math.round(step*SR)&&n0+i<o.length;i++)o[n0+i]+=((i*bf/SR)%1<0.25?0.3:-0.3)*0.2;}}
  for(let i=0;i<o.length;i++){o[i]=Math.round(o[i]*6)/6;}return o;}
export function error502(){const o=buf(1.3);for(let k=0;k<3;k++){const n0=Math.round(k*0.21*SR),f=[880,740,440][k];for(let i=0;i<Math.round(0.19*SR);i++){const t=i/SR;o[n0+i]+=(Math.sign(Math.sin(2*Math.PI*f*t))*0.4+Math.sign(Math.sin(2*Math.PI*f*1.5*t))*0.15)*Math.exp(-t*5);}}
  let v=0;const n0=Math.round(0.65*SR);for(let i=n0;i<o.length;i++){const t=(i-n0)/SR;if(i%Math.round(SR/(700+1400*Math.abs(Math.sin(t*40))))===0)v=rnd();o[i]+=v*0.4*Math.pow(1-t/0.65,1.2)*(Math.sin(t*70)>-0.3?1:0.1);}return o;}
export function whoosh(sec=0.4,f0=400,f1=3000){const n=noise(sec);const o=buf(sec);let ph=0;for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec;const c=Float32Array.of(0);}
  const outp=buf(sec);const c=Float32Array.from(n);bp(c,(f0+f1)/2,0.6);for(let i=0;i<outp.length;i++){const u=i/outp.length;outp[i]=c[i]*Math.sin(Math.PI*u)*1.8;}return outp;}
export function phoneSmash(){const o=buf(2.0);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=Math.sin(2*Math.PI*(120*Math.exp(-t*10)+45)*t)*Math.exp(-t*12)*1.0+rnd()*Math.exp(-t*70)*0.9;}
  for(let k=0;k<26;k++){const n0=Math.round((0.03+Math.pow(Math.abs(rnd()),1.5)*0.9)*SR),f=2500+4500*Math.abs(rnd());for(let i=0;i<3000&&n0+i<o.length;i++)o[n0+i]+=Math.sin(2*Math.PI*f*i/SR)*Math.exp(-i/SR*(120+200*Math.abs(rnd())))*0.22;}return o;}
export function smokeCough(){return null;}

// ---------- сцена 4 ----------
export function stealthMusic(sec){const o=buf(sec);const bass=[33,33,36,33,31,33,36,38];let t=0,k=0;const step=0.5;
  while(t<sec){const m=bass[k%bass.length];const f=mtof(m);const n0=Math.round(t*SR);for(let i=0;i<Math.round(0.35*SR)&&n0+i<o.length;i++){const q=i/SR;const e=Math.exp(-q*9);o[n0+i]+=(Math.sin(2*Math.PI*f*q)+0.4*Math.sin(4*Math.PI*f*q))*0.3*e;}
    if(k%2===1){const f2=mtof(m+24+(k%4===1?0:3));for(let i=0;i<Math.round(0.2*SR)&&n0+i<o.length;i++){const q=i/SR;o[n0+i]+=Math.sin(2*Math.PI*f2*q)*Math.exp(-q*28)*0.13;}}
    if(k%4===3){for(let i=0;i<1200&&n0+i<o.length;i++)o[n0+i]+=rnd()*Math.exp(-i/SR*250)*0.08;}
    k++;t+=step;}
  let ph=0;for(let i=0;i<o.length;i++){const tt=i/SR,u=tt/sec;ph+=2*Math.PI*(1100+500*u)/SR;o[i]+=Math.sin(ph)*0.015*u*(0.5+0.5*Math.sin(tt*5));}return o;}
export function fnoise(sec){return noise(sec);}
export function faceScan(){const o=buf(1.4);let ph=0;for(let i=0;i<o.length;i++){const t=i/SR;ph+=2*Math.PI*(700+500*Math.abs(Math.sin(t*5)))/SR;o[i]=Math.sin(ph)*0.15*Math.min(1,t/0.05)*Math.min(1,(1.4-t)/0.1);}return o;}
export function failBuzz(){const o=buf(0.75);for(let k=0;k<2;k++){const n0=Math.round(k*0.3*SR);for(let i=0;i<Math.round(0.25*SR);i++){const t=i/SR;o[n0+i]+=(Math.sign(Math.sin(2*Math.PI*150*t))*0.35+Math.sin(2*Math.PI*225*t)*0.15)*Math.min(1,t/0.01)*Math.min(1,(0.25-t)/0.02);}}return o;}
export function digitBeep(f=1000){const o=buf(0.07);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=Math.sin(2*Math.PI*f*t)*Math.exp(-t*40)*0.35+Math.sin(2*Math.PI*f*2*t)*Math.exp(-t*60)*0.1;}return o;}
export function wrongTone(){const o=buf(0.4);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=(Math.sin(2*Math.PI*196*t)+Math.sin(2*Math.PI*185*t))*0.2*Math.min(1,t/0.01)*Math.exp(-t*4);}return o;}
export function unlockDing(){const o=buf(1.6);for(const [f,g] of [[1568,1],[2093,0.7],[3136,0.3],[784,0.5]])for(let i=0;i<o.length;i++){const t=i/SR;o[i]+=Math.sin(2*Math.PI*f*t)*Math.exp(-t*3.2)*g*0.22;}
  const o2=buf(0.8);for(let i=0;i<o2.length;i++){const t=i/SR;o2[i]=Math.sin(2*Math.PI*1318*t)*Math.exp(-t*8)*0.25;}mixInto(o,o2,0,1);return o;}
export function appOpen(){const o=buf(0.5);let ph=0;for(let i=0;i<o.length;i++){const t=i/SR;ph+=2*Math.PI*(500+1500*t/0.3)/SR;o[i]=Math.sin(ph)*0.25*Math.min(1,t/0.01)*Math.exp(-t*7);}return o;}
export function dreadSting(sec=3){const o=buf(sec);let a=0,b=0,c=0;for(let i=0;i<o.length;i++){const t=i/SR;a+=2*Math.PI*(70-8*t)/SR;b+=2*Math.PI*(74-9*t)/SR;c+=2*Math.PI*987/SR;
  const e=Math.min(1,t/0.01)*Math.exp(-t*0.9);o[i]=(Math.sin(a)+Math.sin(b)+0.5*Math.sin(2*a)+0.12*Math.sin(c)*Math.exp(-t*3))*0.33*e;}return o;}

// ---------- сцена 5 ----------
export function latchClick(){const o=buf(0.6);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=Math.sin(2*Math.PI*2800*t)*Math.exp(-t*160)*0.4+rnd()*Math.exp(-t*600)*0.5+Math.sin(2*Math.PI*300*t)*Math.exp(-t*50)*0.4;}
  const n0=Math.round(0.18*SR);for(let i=0;i<4000;i++){const t=i/SR;o[n0+i]+=Math.sin(2*Math.PI*1900*t)*Math.exp(-t*220)*0.3+rnd()*Math.exp(-t*800)*0.2;}return o;}
export function doorCreak(sec=1.3){const o=buf(sec);let ph=0;for(let i=0;i<o.length;i++){const t=i/SR,u=t/sec;ph+=2*Math.PI*(150+90*u+20*Math.sin(u*20))/SR;o[i]=(Math.sign(Math.sin(ph))*0.2+Math.sin(ph*3.1)*0.1+rnd()*0.05)*Math.sin(Math.PI*u)*0.5;}bp(o,500,0.8);for(let i=0;i<o.length;i++)o[i]*=2;return o;}
export function mumble(f0,sec=2.2){ // два «м-м-э…»
  const o=buf(sec);const seg=(at,d,fm,start)=>{const v=formantVoice(d,(x)=>f0*(1+0.08*Math.sin(x*6))*(1+0.12*(x/d)-0.2*(x/d)*(x/d)*(start?1:2))+3*Math.sin(x*50),fm,(x)=>Math.min(1,x/0.08)*Math.min(1,(d-x)/0.12)*(0.8+0.2*Math.sin(x*30)),0.04);mixInto(o,v,at,1);};
  seg(0.1,0.55,[[250,8,1],[1050,12,0.15],[2200,12,0.05]],true); seg(0.65,0.35,[[520,7,1],[1500,9,0.5],[2500,10,0.15]],true);
  seg(1.25,0.45,[[250,8,1],[1050,12,0.15],[2200,12,0.05]],false); seg(1.7,0.5,[[480,7,1],[1450,9,0.5],[2500,10,0.15]],false);return o;}
export function clockTick(sec){const o=buf(sec);let k=0;for(let t=0;t<sec;t+=1,k++){const n0=Math.round(t*SR);const f=k%2?1500:1900;for(let i=0;i<Math.round(0.08*SR)&&n0+i<o.length;i++){const q=i/SR;o[n0+i]+=(Math.sin(2*Math.PI*f*q)*Math.exp(-q*90)*0.5+rnd()*Math.exp(-q*400)*0.45+Math.sin(2*Math.PI*f/3*q)*Math.exp(-q*50)*0.2);}}return o;}
export function chair(){const o=buf(0.9);const n=noise(0.9);bp(n,350,1.5);let ph=0;for(let i=0;i<o.length;i++){const t=i/SR,u=t/0.9;ph+=2*Math.PI*(200+60*Math.sin(u*7))/SR;o[i]=(n[i]*2+Math.sign(Math.sin(ph))*0.2)*Math.sin(Math.PI*u)*0.4;}return o;}
export function glug(){const o=buf(1.0);let ph=0;for(let k=0;k<4;k++){const n0=Math.round(k*0.22*SR);for(let i=0;i<Math.round(0.18*SR);i++){const t=i/SR;ph=2*Math.PI*(300+700*t/0.18)*t;o[n0+i]+=Math.sin(ph)*Math.sin(Math.PI*t/0.18)*0.3;}}return o;}
export function bottleSet(){const o=buf(0.4);for(let i=0;i<o.length;i++){const t=i/SR;o[i]=Math.sin(2*Math.PI*900*t)*Math.exp(-t*40)*0.3+rnd()*Math.exp(-t*300)*0.3;}return o;}
export function roomTone(sec,g=1){const o=noise(sec);lp(o,0.02);lp(o,0.08);for(let i=0;i<o.length;i++)o[i]*=g*(0.5+0.03*Math.sin(2*Math.PI*50*i/SR));return o;}
