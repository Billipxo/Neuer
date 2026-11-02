'use strict';
/* Arena der Verdammten – Speicherstand, Hilfsfunktionen, Soundeffekte und prozedurale Musik */

/* ---------------- SPEICHER ---------------- */
const SAVE_KEY = 'arena_verdammten_v1';
const SAVE_V=2, RUN_V=6;
const reducedMotion = (()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
function defSettings(){ return { shake:!reducedMotion, vibrate:true, music:true, fx:true, joyFixed:false, lefty:false, cb:false, musicVol:0.7 }; }
function defStats(){ return { kills:0, elites:0, cheers:0, events:[], syns:[], bosses:[], wins:{}, anyWin:false, noHitBoss:false, dailyWin:false, maxEndless:0, maxGold:0, maxCombo:0 }; }
function defSave(){ return { v:SAVE_V, tutDone:false, ach:{}, skin:{}, stats:defStats(), souls:0, meta:{}, unlocked:{krieger:true}, scores:[], runs:0, lastChar:'krieger', sound:true, run:null, settings:defSettings(), name:'Spielstand 1', last:0, ngMax:0, ngSel:0 }; }
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
/* Mehrere Speicherstände: 3 Plätze, Einstellungen gelten für alle */
const SLOTS=3, SLOT_IDX_KEY='arena_slots', SET_KEY='arena_settings';
const slotKey=i=>'arena_slot_'+i;
function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function readSlot(i){ const s=lsGet(slotKey(i)); return s&&typeof s==='object'?migrate(s):null; }
let slotIdx=(lsGet(SLOT_IDX_KEY)||{}).active||0;
function loadSave(){
  // Alter Einzel-Speicherstand wird einmalig in Platz 1 übernommen
  if(!lsGet(slotKey(0))){ const old=lsGet(SAVE_KEY); if(old&&typeof old==='object'){ old.name=old.name||'Spielstand 1'; lsSet(slotKey(0),old); } }
  let s=readSlot(slotIdx); if(!s){ s=defSave(); s.name='Spielstand '+(slotIdx+1); }
  const g=lsGet(SET_KEY); if(g){ s.settings=Object.assign(defSettings(),g.settings||{}); if(g.sound!==undefined) s.sound=g.sound; }
  return s;
}
let save = loadSave();
function persist(){ save.last=Date.now(); lsSet(slotKey(slotIdx),save); lsSet(SET_KEY,{settings:save.settings,sound:save.sound}); lsSet(SLOT_IDX_KEY,{active:slotIdx}); }
function switchSlot(i){ persist(); slotIdx=i; save=loadSave(); persist(); document.body.classList.toggle('lefty',!!save.settings.lefty); }
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
/* ---------------- MUSIK ----------------
   Komponierte Stücke, live mit Web Audio gespielt: Titelthema, ruhige Kartenmusik und Kampfthema je Akt,
   Bossthema, dazu Fanfaren für Sieg und Niederlage. Melodien in Tonleiterstufen, je Achtel ein Zeichen:
   Zahl = Stufe (7 = Oktave höher), "-" = Ton halten, "." = Pause. */
const MUS={ next:0, step:0, gain:null, bus:null, filt:null, noise:null, song:null, duck:0 };
const mtof=m=>440*Math.pow(2,(m-69)/12);
const SC={ min:[0,2,3,5,7,8,10], hmin:[0,2,3,5,7,8,11], phry:[0,1,3,5,7,8,10], maj:[0,2,4,5,7,9,11] };
const MEL={
  menu:  '4 - 3 2 3 - 0 - 2 - 1 0 1 - - . 4 - 5 6 7 - 6 4 5 - 4 3 4 - - .',
  calm:  '0 - 2 - 4 - 2 - 1 - 3 - 5 - - - 4 - 2 - 4 - 7 - 6 - 5 - 4 - - -',
  calm2: '7 - - 6 5 - - . 4 - 3 - 1 - - . 7 - - 8 7 - 5 . 6 - 5 - 4 - - .',
  f1:    '0 . 0 2 3 . 2 0 6 . 6 0 2 . 0 6 5 . 5 6 7 . 6 5 4 - 3 - 2 - 1 -',
  f2:    '7 . 6 . 5 . 4 . 3 - 4 - 1 - - . 7 . 8 . 7 . 5 . 6 - 5 - 4 - - .',
  f3:    '0 0 3 0 4 0 5 4 6 - 5 - 4 3 4 . 0 0 3 0 4 0 7 6 5 - 4 - 6 - 7 -',
  boss:  '7 - 6 - 4 - 3 4 5 - 4 - 3 - 1 - 7 - 8 - 9 - 7 - 6 - 5 - 6 - 7 -',
};
const SONGS2={
  menu:  { bpm:72,  root:50, sc:'min',  prog:[0,6,5,4], mel:'menu',  lead:'flute', arp:'pluck', pad:true, vol:1 },
  calm1: { bpm:78,  root:50, sc:'min',  prog:[0,5,3,4], mel:'calm',  lead:'pluck', arp:null,    pad:true, vol:0.9 },
  calm2: { bpm:66,  root:45, sc:'phry', prog:[0,1,5,0], mel:'calm2', lead:'bell',  arp:null,    pad:true, vol:0.9 },
  calm3: { bpm:78,  root:52, sc:'hmin', prog:[0,5,3,4], mel:'calm',  lead:'pluck', arp:null,    pad:true, vol:0.9 },
  fight1:{ bpm:106, root:50, sc:'min',  prog:[0,6,5,4], mel:'f1',    lead:'lead',  arp:'pluck', drums:'k...s...k.k.s...', hats:'h.h.h.h.h.h.h.h.', vol:1 },
  fight2:{ bpm:94,  root:45, sc:'phry', prog:[0,1,5,4], mel:'f2',    lead:'bell',  arp:'pluck', pad:true, drums:'k.......s.....k.', hats:'....h.......h...', vol:1 },
  fight3:{ bpm:116, root:52, sc:'hmin', prog:[0,5,3,4], mel:'f3',    lead:'lead',  arp:'pluck', drums:'k.k.s.k.k.k.s.kk', hats:'h.h.h.h.h.h.h.hh', vol:1 },
  boss:  { bpm:132, root:50, sc:'hmin', prog:[0,5,6,4], mel:'boss',  lead:'lead',  arp:'pluck', choir:true, drums:'k..ks..kk.k.s.kk', hats:'hhhhhhhhhhhhhhhh', timp:true, vol:1.05 },
};
const MELP={}; for(const k in MEL) MELP[k]=MEL[k].trim().split(/\s+/);
function musicInit(){
  MUS.gain=AC.createGain(); MUS.gain.gain.value=0; MUS.gain.connect(AC.destination);
  MUS.bus=AC.createGain(); MUS.bus.connect(MUS.gain);
  // Hall: Impulsantwort aus abklingendem Rauschen
  try{ const len=Math.floor(AC.sampleRate*2.2), ir=AC.createBuffer(2,len,AC.sampleRate);
    for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
    const conv=AC.createConvolver(); conv.buffer=ir; const wet=AC.createGain(); wet.gain.value=0.32; MUS.bus.connect(conv); conv.connect(wet); wet.connect(MUS.gain); }catch(e){}
  MUS.filt=AC.createBiquadFilter(); MUS.filt.type='lowpass'; MUS.filt.frequency.value=520; MUS.filt.connect(MUS.bus);
  const len=AC.sampleRate*0.2, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1; MUS.noise=buf;
  MUS.next=AC.currentTime+0.1; setInterval(musicTick,60);
}
function env(g,t,vol,att,dur){ g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); }
function tone(type,f,t,dur,vol,dest,att=0.01){ const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.value=f;
  env(g,t,vol,att,dur); o.connect(g); g.connect(dest||MUS.bus); o.start(t); o.stop(t+dur+0.05); }
function inst(kind,f,t,dur,vol){
  if(kind==='pluck'){ const g=AC.createGain(), lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(3000,t); lp.frequency.exponentialRampToValueAtTime(600,t+0.5); lp.connect(g); g.connect(MUS.bus);
    env(g,t,vol,0.005,Math.max(0.5,dur)); for(const [ty,m] of [['triangle',1],['sine',2]]){ const o=AC.createOscillator(); o.type=ty; o.frequency.value=f*m; o.connect(lp); o.start(t); o.stop(t+Math.max(0.5,dur)+0.05); } }
  else if(kind==='bell'){ for(const [m,v,d] of [[1,1,1.6],[2.76,0.35,0.8],[5.4,0.12,0.4]]) tone('sine',f*m,t,d*Math.max(1,dur),vol*v,null,0.005); }
  else if(kind==='flute'){ const o=AC.createOscillator(), g=AC.createGain(), lfo=AC.createOscillator(), lg=AC.createGain(); o.type='sine'; o.frequency.value=f;
    lfo.frequency.value=5; lg.gain.value=f*0.012; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.08); g.gain.setValueAtTime(vol,t+dur*0.8); g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.25);
    o.connect(g); g.connect(MUS.bus); o.start(t); lfo.start(t); o.stop(t+dur+0.3); lfo.stop(t+dur+0.3); tone('triangle',f*2,t,dur*0.6,vol*0.08,null,0.05); }
  else { const o=AC.createOscillator(), g=AC.createGain(), lp=AC.createBiquadFilter(), lfo=AC.createOscillator(), lg=AC.createGain(); o.type='square'; o.frequency.value=f;
    lfo.frequency.value=5.5; lg.gain.value=f*0.008; lfo.connect(lg); lg.connect(o.frequency); lp.type='lowpass'; lp.frequency.value=1700;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.02); g.gain.setValueAtTime(vol*0.8,t+dur*0.85); g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.12);
    o.connect(lp); lp.connect(g); g.connect(MUS.bus); o.start(t); lfo.start(t); o.stop(t+dur+0.15); lfo.stop(t+dur+0.15); }
}
function padChord(fs,t,dur,vol,bright){
  const lp=AC.createBiquadFilter(), g=AC.createGain(); lp.type='lowpass'; lp.frequency.value=bright?1500:850; lp.connect(g); g.connect(MUS.bus);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+Math.min(0.6,dur*0.3)); g.gain.setValueAtTime(vol,t+dur*0.75); g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.4);
  for(const f of fs) for(const det of [-7,7]){ const o=AC.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=det; o.connect(lp); o.start(t); o.stop(t+dur+0.45); }
}
function drum(t,kind){
  if(kind==='kick'){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(40,t+0.16); g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(g); g.connect(MUS.gain); o.start(t); o.stop(t+0.25); }
  else if(kind==='timp'){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(98,t); o.frequency.exponentialRampToValueAtTime(70,t+0.6); env(g,t,0.8,0.005,0.9); o.connect(g); g.connect(MUS.bus); o.start(t); o.stop(t+1); }
  else { const s=AC.createBufferSource(), f=AC.createBiquadFilter(), g=AC.createGain(); s.buffer=MUS.noise; f.type='highpass'; f.frequency.value=kind==='hat'?6500:1500;
    g.gain.setValueAtTime(kind==='hat'?0.09:0.33,t); g.gain.exponentialRampToValueAtTime(0.0001,t+(kind==='hat'?0.045:0.14)); s.connect(f); f.connect(g); g.connect(MUS.gain); s.start(t); s.stop(t+0.2); }
}
function degSemi(sc,deg){ const n=sc.length, o=Math.floor(deg/n), i=((deg%n)+n)%n; return sc[i]+12*o; }
function playStep(step,t,S,sd){
  const sc=SC[S.sc], bar=Math.floor(step/16)%4, s=step%16, cd=S.prog[bar];
  const chord=[0,2,4].map(k=>S.root+degSemi(sc,cd+k));
  if(s===0){ tone('sawtooth',mtof(chord[0]-12),t,sd*16*0.95,0.45,MUS.filt,0.04);
    if(S.pad) padChord(chord.map(m=>mtof(m+12)),t,sd*16,0.035,false);
    if(S.choir) padChord(chord.map(m=>mtof(m+12)).concat([mtof(chord[0]+24)]),t,sd*16,0.04,true);
    if(S.timp) drum(t,'timp'); }
  if(S.timp && s===8 && bar%2===1) drum(t,'timp');
  if(S.arp==='pluck'){ const ev=S.drums?2:4; if(s%ev===0){ const pat=[0,1,2,1,0,2,1,2]; inst('pluck',mtof(chord[pat[(s/ev)%8]]+(S.drums?12:12)),t,sd*3,S.drums?0.07:0.06); } }
  if(s%2===0){ const P=MELP[S.mel], i=(Math.floor(step/2))%P.length, tk=P[i];
    if(tk!=='-'&&tk!=='.'){ let h=1; while(P[(i+h)%P.length]==='-'&&h<8) h++;
      const f=mtof(S.root+12+degSemi(sc,+tk)), dur=h*2*sd, v={lead:0.055,flute:0.09,pluck:0.1,bell:0.07}[S.lead];
      inst(S.lead,f,t,dur,v); } }
  if(S.drums){ const c=S.drums[s]; if(c==='k') drum(t,'kick'); else if(c==='s') drum(t,'snare'); if(S.hats&&S.hats[s]==='h') drum(t,'hat'); }
}
function songKey(){
  if((state==='combat'||state==='paused')&&G) return G.type==='boss'?'boss':'fight'+visAct();
  if(run) return 'calm'+visAct();
  return 'menu';
}
function musicTick(){
  if(!AC||!MUS.gain) return;
  const on=save.settings.music && !document.hidden, vol=(save.settings.musicVol??0.7);
  const duck=AC.currentTime<MUS.duck;
  MUS.gain.gain.setTargetAtTime(!on?0:(duck?0.15:(state==='paused'?0.35:1))*0.1*vol*((SONGS2[MUS.song]||{}).vol||1), AC.currentTime, 0.35);
  if(!on){ MUS.next=AC.currentTime+0.1; return; }
  const key=songKey();
  if(key!==MUS.song && MUS.step%16===0){ MUS.song=key; MUS.step=0; }
  const S=SONGS2[MUS.song||key]; if(!MUS.song) MUS.song=key;
  const sd=60/S.bpm/4;
  if(MUS.next<AC.currentTime) MUS.next=AC.currentTime+0.05;
  while(MUS.next<AC.currentTime+0.25){ if(!duck) playStep(MUS.step,MUS.next,S,sd); MUS.next+=sd; MUS.step++;
    if(MUS.song!==key && MUS.step%16===0){ MUS.song=key; MUS.step=0; break; } }
}
function musicSting(kind){
  if(!AC||!MUS.gain||!save.settings.music) return;
  const t=AC.currentTime+0.05, g=AC.createGain(), vol=(save.settings.musicVol??0.7); g.gain.value=0.1*vol; g.connect(AC.destination);
  const mk=(type,m,start,dur,v)=>{ const o=AC.createOscillator(), e=AC.createGain(); o.type=type; o.frequency.value=mtof(m); env(e,t+start,v,0.02,dur); o.connect(e); e.connect(g); o.start(t+start); o.stop(t+start+dur+0.05); };
  if(kind==='win'){ MUS.duck=t+3.2; [62,66,69,74].forEach((m,i)=>mk('square',m,i*0.13,0.3,0.5)); [62,66,69,74,78].forEach(m=>mk('sawtooth',m,0.55,2.2,0.18)); mk('triangle',50,0.55,2.4,0.6); }
  else { MUS.duck=t+3.6; [69,68,65,62].forEach((m,i)=>mk('triangle',m,i*0.42,0.6,0.6)); [50,53,57].forEach(m=>mk('sawtooth',m,1.6,2.2,0.15)); }
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

