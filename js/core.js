'use strict';
/* Arena der Verdammten – Speicherstand, Hilfsfunktionen, Soundeffekte und prozedurale Musik */

/* ---------------- SPEICHER ---------------- */
const SAVE_KEY = 'arena_verdammten_v1';
const SAVE_V=2, RUN_V=6;
const reducedMotion = (()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
function defSettings(){ return { shake:!reducedMotion, vibrate:true, music:true, fx:true, joyFixed:false, lefty:false, cb:false }; }
function defStats(){ return { kills:0, elites:0, cheers:0, events:[], syns:[], bosses:[], wins:{}, anyWin:false, noHitBoss:false, dailyWin:false, maxEndless:0, maxGold:0, maxCombo:0 }; }
function defSave(){ return { v:SAVE_V, tutDone:false, ach:{}, skin:{}, stats:defStats(), souls:0, meta:{}, unlocked:{krieger:true}, scores:[], runs:0, lastChar:'krieger', sound:true, run:null, settings:defSettings() }; }
function migrate(s){
  const d=defSave(); s=Object.assign(d, s);
  s.settings=Object.assign(defSettings(), s.settings||{});
  if(!s.meta||typeof s.meta!=='object') s.meta={};
  if(!Array.isArray(s.scores)) s.scores=[];
  s.stats=Object.assign(defStats(), s.stats||{}); s.ach=s.ach||{}; s.skin=s.skin||{};
  if(s.runs>0 && s.tutDone===undefined) s.tutDone=true;
  if(s.run && s.run.v!==RUN_V) s.run=null;   // alter Laufstand passt nicht mehr zur Spielversion
  s.v=SAVE_V; return s;
}
function loadSave(){ try{ const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if(s && typeof s==='object') return migrate(s); }catch(e){} return defSave(); }
let save = loadSave();
function persist(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){} }
const metaLvl = id => save.meta[id] || 0;

/* ---------------- HILFEN ---------------- */
let RNG=Math.random;
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hashStr(s){ let h=1779033703^s.length; for(let i=0;i<s.length;i++){ h=Math.imul(h^s.charCodeAt(i),3432918353); h=h<<13|h>>>19; } h=Math.imul(h^h>>>16,2246822507); h=Math.imul(h^h>>>13,3266489909); return (h^h>>>16)>>>0; }
function seeded(key,fn){ const old=RNG; RNG=mulberry32(hashStr(key)); try{ return fn(); } finally{ RNG=old; } }
const rand=(a,b)=>a+RNG()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(RNG()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const TAU=Math.PI*2;
const angTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angDiff=(a,b)=>{let d=(a-b)%TAU; if(d>Math.PI)d-=TAU; if(d<-Math.PI)d+=TAU; return d;};
const $=id=>document.getElementById(id);
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(RNG()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function wpick(list){ let t=0; for(const [,w] of list) t+=w; let r=RNG()*t; for(const [v,w] of list){ if((r-=w)<=0) return v; } return list[0][0]; }

/* ---------------- AUDIO ---------------- */
let AC=null, lastSfx={};
function audio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); musicInit(); }catch(e){} } if(AC && AC.state==='suspended') AC.resume(); }
/* Prozedurale Musik: Bass, Akkordfläche, Arpeggio und Trommeln, je nach Akt und Lage */
const MUS={ next:0, step:0, gain:null, filt:null, noise:null };
const mtof=m=>440*Math.pow(2,(m-69)/12);
const SONGS={ 1:{root:50, prog:[[0,'m'],[-4,'M'],[-2,'M'],[0,'m']]}, 2:{root:45, prog:[[0,'m'],[1,'M'],[0,'m'],[-2,'M']]}, 3:{root:52, prog:[[0,'m'],[-4,'M'],[-2,'M'],[-5,'M']]} };
function musicInit(){
  MUS.gain=AC.createGain(); MUS.gain.gain.value=0; MUS.gain.connect(AC.destination);
  MUS.filt=AC.createBiquadFilter(); MUS.filt.type='lowpass'; MUS.filt.frequency.value=520; MUS.filt.connect(MUS.gain);
  const len=AC.sampleRate*0.2, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1; MUS.noise=buf;
  MUS.next=AC.currentTime+0.1; setInterval(musicTick,60);
}
function tone(type,f,t,dur,vol,dest,att=0.01){ const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(dest||MUS.gain); o.start(t); o.stop(t+dur+0.05); }
function drum(t,kind){
  if(kind==='kick'){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(40,t+0.16); g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(g); g.connect(MUS.gain); o.start(t); o.stop(t+0.25); }
  else { const s=AC.createBufferSource(), f=AC.createBiquadFilter(), g=AC.createGain(); s.buffer=MUS.noise; f.type='highpass'; f.frequency.value=kind==='hat'?6000:1500;
    g.gain.setValueAtTime(kind==='hat'?0.12:0.35,t); g.gain.exponentialRampToValueAtTime(0.0001,t+(kind==='hat'?0.05:0.14)); s.connect(f); f.connect(g); g.connect(MUS.gain); s.start(t); s.stop(t+0.2); }
}
function playStep(step,t,mode,sd){
  const song=SONGS[run?visAct():1], bar=Math.floor(step/16), s=step%16, [off,q]=song.prog[bar%4], root=song.root+off, third=q==='m'?3:4, tones=[0,third,7,12];
  if(s===0){ tone('sawtooth',mtof(root-12),t,sd*16*0.95,0.5,MUS.filt,0.05);
    if(mode==='calm') for(const iv of [0,third,7]) tone('sine',mtof(root+12+iv),t,sd*16,0.12,null,0.6); }
  if(mode==='calm'){ if(s%4===0) tone('triangle',mtof(root+24+tones[(s/4+bar)%4]),t,sd*6,0.16); return; }
  const every=mode==='boss'?1:2;
  if(s%every===0){ const pat=[0,1,2,3,2,1,0,2]; tone('triangle',mtof(root+12+tones[pat[(s/every)%8]]+(mode==='boss'&&s>=8?12:0)),t,sd*1.8,0.2); }
  if(s===0||s===8||(mode==='boss'&&(s===6||s===14))) drum(t,'kick');
  if(s===4||s===12) drum(t,'snare');
  if(mode==='boss'&&s%2===1) drum(t,'hat');
}
function musicTick(){
  if(!AC||!MUS.gain) return;
  const on=save.settings.music && !document.hidden;
  MUS.gain.gain.setTargetAtTime(!on?0:state==='paused'?0.02:0.055, AC.currentTime, 0.4);
  if(!on){ MUS.next=AC.currentTime+0.1; return; }
  const mode=(state==='combat'||state==='paused')&&G?(G.type==='boss'?'boss':'combat'):'calm';
  const sd=60/({calm:66,combat:100,boss:124}[mode])/4;
  if(MUS.next<AC.currentTime) MUS.next=AC.currentTime+0.05;
  while(MUS.next<AC.currentTime+0.25){ playStep(MUS.step,MUS.next,mode,sd); MUS.next+=sd; MUS.step++; }
}
const musicUpdate=()=>{ if(AC) musicTick(); };
function sfx(type){
  if(!save.sound || !AC) return;
  const now=AC.currentTime; if(lastSfx[type] && now-lastSfx[type]<0.05) return; lastSfx[type]=now;
  const o=AC.createOscillator(), g=AC.createGain(); o.connect(g); g.connect(AC.destination);
  const S={ zap:['sine',700,1500,.05,.09], twang:['triangle',820,330,.06,.07], skullthrow:['sawtooth',260,520,.035,.1], hit:['square',220,90,.05,.06], swing:['triangle',300,120,.06,.08], coin:['sine',900,1500,.05,.07], hurt:['sawtooth',160,50,.1,.22],
    kill:['triangle',180,60,.06,.12], shoot:['sine',600,300,.03,.07], skill:['sawtooth',120,600,.08,.35], boom:['sawtooth',90,30,.12,.3],
    pick:['sine',500,1000,.08,.18], dash:['sine',260,820,.06,.14], boss:['sawtooth',70,40,.12,.8] }[type];
  if(!S) return;
  const pv=0.92+Math.random()*0.16; o.type=S[0]; o.frequency.setValueAtTime(S[1]*pv,now); o.frequency.exponentialRampToValueAtTime(S[2]*pv,now+S[4]);
  g.gain.setValueAtTime(S[3],now); g.gain.exponentialRampToValueAtTime(0.0001,now+S[4]);
  o.start(now); o.stop(now+S[4]+0.02);
}
function blip(type,f0,f1,vol,dur,delay=0){
  if(!save.sound||!AC) return; const t=AC.currentTime+delay, o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+dur+0.02);
}
function deathSound(kind){
  if(!save.sound||!AC) return; const now=AC.currentTime, k='d_'+kind; if(lastSfx[k] && now-lastSfx[k]<0.07) return; lastSfx[k]=now;
  const v=0.9+Math.random()*0.2;
  if(kind==='skeleton'||kind==='spiderling'){ for(let i=0;i<3;i++) blip('square',1300*v-i*150,900,0.03,0.035,i*0.045); }
  else if(kind==='slime'){ blip('sine',420*v,80,0.09,0.16); blip('sine',260*v,60,0.05,0.12,0.05); }
  else if(kind==='bat'){ blip('sine',2100*v,2700,0.04,0.08); blip('sine',2500*v,1800,0.03,0.06,0.06); }
  else if(kind==='orc'||kind==='shield'||kind==='mimic'){ blip('sawtooth',150*v,60,0.08,0.25); }
  else if(kind==='cultist'||kind==='healer'){ blip('triangle',620*v,180,0.06,0.3); }
  else if(kind==='archer'){ blip('square',520*v,220,0.04,0.12); }
  else { blip('triangle',180*v,60,0.06,0.12); }
}
function coinSound(){
  if(!G) return; G.coinN=(G.time-(G.coinLast||-9)<0.35)?Math.min(12,(G.coinN||0)+1):0; G.coinLast=G.time;
  const f=880*Math.pow(2,G.coinN/12); blip('sine',f,f*1.5,0.045,0.08);
}
const ROAR={golem:0.75,spider:1.6,lich:1.2,vampire:1.35,dragon:0.65,lavaworm:0.55};
function roar(kind){
  if(!save.sound||!AC) return; const p=ROAR[kind]||1, t=AC.currentTime;
  const o=AC.createOscillator(), lfo=AC.createOscillator(), lg=AC.createGain(), f=AC.createBiquadFilter(), g=AC.createGain();
  o.type='sawtooth'; o.frequency.setValueAtTime(95*p,t); o.frequency.exponentialRampToValueAtTime(55*p,t+1.5);
  lfo.frequency.value=11; lg.gain.value=18*p; lfo.connect(lg); lg.connect(o.frequency);
  f.type='lowpass'; f.frequency.setValueAtTime(1400,t); f.frequency.exponentialRampToValueAtTime(300,t+1.5);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.28,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+1.6);
  o.connect(f); f.connect(g); g.connect(AC.destination); o.start(t); lfo.start(t); o.stop(t+1.7); lfo.stop(t+1.7);
  noiseSound(1.3,'lowpass',500*p,0.25,0.1);
}
function buzz(ms){ if(!save.settings.vibrate) return; try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} }

