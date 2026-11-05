'use strict';
/* Arena der Verdammten – Speicherstand, Hilfsfunktionen, Soundeffekte und prozedurale Musik */

/* ---------------- SPEICHER ---------------- */
const SAVE_KEY = 'arena_verdammten_v1';
const SAVE_V=2, RUN_V=6;
const reducedMotion = (()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
function defSettings(){ return { shake:!reducedMotion, vibrate:true, music:true, fx:true, joyFixed:false, lefty:false, cb:false, musicVol:0.7, sfxVol:0.8, gfx:'auto', showFps:false, dmgNums:true, dmgOff:false, gameSpeed:1.2, shakeAmt:1, calm:reducedMotion, fpsCap:60, assist:false, bigUi:false, iosTip:false }; }
function defStats(){ return { beast:{}, kills:0, elites:0, cheers:0, events:[], syns:[], bosses:[], wins:{}, anyWin:false, noHitBoss:false, dailyWin:false, maxEndless:0, maxGold:0, maxCombo:0 }; }
function defSave(){ return { v:SAVE_V, tutDone:false, ach:{}, skin:{}, heroXp:{}, stats:defStats(), souls:0, meta:{}, unlocked:{krieger:true}, scores:[], runs:0, lastChar:'krieger', sound:true, run:null, assistN:0, seenFoes:{}, tierWon:{}, tierSel:0, chal:{}, dailyHist:{}, streak:null, lastRun:null, lossStreak:0, settings:defSettings(), name:'Spielstand 1', last:0, ngMax:0, ngSel:0, bkAt:0, bkRuns:0, bkSnooze:0 }; }
function migrate(s){
  const d=defSave(); s=Object.assign(d, s);
  s.settings=Object.assign(defSettings(), s.settings||{}); if(s.settings.fx===false && !s.settings._gfxMig){ s.settings.gfx='low'; } s.settings._gfxMig=true;
  if(!s.meta||typeof s.meta!=='object') s.meta={};
  if(!Array.isArray(s.scores)) s.scores=[];
  s.stats=Object.assign(defStats(), s.stats||{}); if(!Object.keys(s.stats.beast).length) for(const b of s.stats.bosses) s.stats.beast[b]=1; s.ach=s.ach||{}; s.skin=s.skin||{};
  if(s.runs>0 && s.tutDone===undefined) s.tutDone=true;
  if(!s.tierWon||typeof s.tierWon!=='object') s.tierWon={}; for(const cid in (s.stats.wins||{})) if(s.tierWon[cid]===undefined) s.tierWon[cid]=0;
  if(!s.dailyHist||typeof s.dailyHist!=='object') s.dailyHist={}; if(s.daily && s.daily.key && !s.dailyHist[s.daily.key] && s.daily.tries) s.dailyHist[s.daily.key]={best:s.daily.best||0,first:s.daily.best||0,tries:s.daily.tries,won:false,act:0};
  if(!s.seenFoes||typeof s.seenFoes!=='object') s.seenFoes={};
  if(!s.lore||typeof s.lore!=='object') s.lore={}; for(const b of s.stats.bosses||[]) if(!s.lore['b_'+b]) s.lore['b_'+b]=1; for(const cid in (s.stats.wins||{})) if(!s.lore['h_'+cid]) s.lore['h_'+cid]=1; if(s.runs>0 && !s.lore.act1) s.lore.act1=1; for(const k in s.stats.beast) s.seenFoes[k]=1;
  if(s.run && s.run.v!==RUN_V) s.run=null;   // alter Laufstand passt nicht mehr zur Spielversion
  s.v=SAVE_V; return s;
}
/* Mehrere Speicherstände: 3 Plätze, Einstellungen gelten für alle */
const SLOTS=3, SLOT_IDX_KEY='arena_slots', SET_KEY='arena_settings';
const slotKey=i=>'arena_slot_'+i;
function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }
// Speichern: flüchtige Kampfverweise (Ziel, Echo-Ziel …) nie mitschreiben; falls doch einmal ein Kreisverweis entsteht,
// wird er übersprungen statt dass der ganze Spielstand still verloren geht
const TRANSIENT=new Set(['tgtRef','echoTgt','dashHit','aim','owner','target']);
function saveJson(v){ try{ return JSON.stringify(v,(k,x)=>TRANSIENT.has(k)?undefined:x); }
  catch(e){ const seen=new WeakSet(); return JSON.stringify(v,(k,x)=>{ if(TRANSIENT.has(k)) return undefined; if(x&&typeof x==='object'){ if(seen.has(x)) return undefined; seen.add(x); } return x; }); } }
function lsSet(k,v){ try{ localStorage.setItem(k,saveJson(v)); }catch(e){ try{ console.warn('Speichern fehlgeschlagen',e); }catch(_){} } }
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
function switchSlot(i){ persist(); slotIdx=i; save=loadSave(); persist(); applyBodyClasses(); }
const metaLvl = id => save.meta[id] || 0;
/* Heldenstufen: Erfahrung über alle Läufe, Stufe L braucht insgesamt 120·L·(L+1)/2 EP */
const HERO_MAX=10, xpFor=L=>60*L*(L+1);
function heroLvl(cid){ const xp=(save.heroXp||{})[cid]||0; let L=0; while(L<HERO_MAX && xp>=xpFor(L+1)) L++; return L; }
/* Grafikstufe: "auto" misst die Bildrate und schaltet bei Ruckeln selbst herunter */
let AUTO_LOW=false;
const FX=()=>save.settings.gfx==='high' || (save.settings.gfx!=='low' && !AUTO_LOW);
const PERF={acc:0,n:0,fps:60,low:0};

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
let AC=null, lastSfx={}, SFXOUT=null, persistAsked=false;
function audio(){
  if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)();
    // Soundeffekte laufen über einen Kompressor, damit viele gleichzeitige Treffer nicht übersteuern
    try{ const comp=AC.createDynamicsCompressor(); comp.threshold.value=-18; comp.knee.value=12; comp.ratio.value=4; comp.attack.value=0.003; comp.release.value=0.2;
      SFXOUT=AC.createGain(); SFXOUT.gain.value=1; SFXOUT.connect(comp); comp.connect(AC.destination); }catch(e){ SFXOUT=AC.destination; }
    musicInit(); sndInit(); }catch(e){} }
  if(AC && AC.state!=='running' && AC.state!=='closed'){ try{ AC.resume(); }catch(e){} }
  if(!persistAsked){ persistAsked=true; try{ navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(()=>{}); }catch(e){} }
}
const sfxOut=()=>SFXOUT||AC.destination;
/* iOS kann den Ton nach dem Hintergrund stumm lassen: dann wird die Audio-Engine beim nächsten Tippen neu aufgebaut */
function audioRevive(){
  if(!AC || document.hidden) return; try{ AC.resume(); }catch(e){}
  setTimeout(()=>{ if(AC && AC.state!=='running' && !document.hidden){ try{ AC.close(); }catch(e){} AC=null; SFXOUT=null; SND.bus=null; SND.revIn=null; SND.rev=null; MUS.gain=null; MUS.song=null; if(MUS.timer){ clearInterval(MUS.timer); MUS.timer=0; } } },600);
}
/* ---------------- MUSIK ----------------
   Komponierte Stücke, live mit Web Audio gespielt: Titelthema, ruhige Kartenmusik und Kampfthema je Akt,
   Bossthema, dazu Fanfaren für Sieg und Niederlage. Melodien in Tonleiterstufen, je Achtel ein Zeichen:
   Zahl = Stufe (7 = Oktave höher), "-" = Ton halten, "." = Pause. */
const MUS={ next:0, step:0, gain:null, bus:null, filt:null, noise:null, song:null, duck:0, soft:0, int:0.5, lp:null };
const mtof=m=>440*Math.pow(2,(m-69)/12);
const SC={ min:[0,2,3,5,7,8,10], hmin:[0,2,3,5,7,8,11], phry:[0,1,3,5,7,8,10], maj:[0,2,4,5,7,9,11], lyd:[0,2,4,6,7,9,11], dor:[0,2,3,5,7,9,10] };
const MEL={
  menu:  '4 - 3 2 3 - 0 - 2 - 1 0 1 - - . 4 - 5 6 7 - 6 4 5 - 4 3 4 - - .',
  calm:  '0 - 2 - 4 - 2 - 1 - 3 - 5 - - - 4 - 2 - 4 - 7 - 6 - 5 - 4 - - -',
  calm2: '7 - - 6 5 - - . 4 - 3 - 1 - - . 7 - - 8 7 - 5 . 6 - 5 - 4 - - .',
  f1:    '0 . 0 2 3 . 2 0 6 . 6 0 2 . 0 6 5 . 5 6 7 . 6 5 4 - 3 - 2 - 1 -',
  f2:    '7 . 6 . 5 . 4 . 3 - 4 - 1 - - . 7 . 8 . 7 . 5 . 6 - 5 - 4 - - .',
  f3:    '0 0 3 0 4 0 5 4 6 - 5 - 4 3 4 . 0 0 3 0 4 0 7 6 5 - 4 - 6 - 7 -',
  boss:  '7 - 6 - 4 - 3 4 5 - 4 - 3 - 1 - 7 - 8 - 9 - 7 - 6 - 5 - 6 - 7 -',
  menuB: '7 - 6 5 4 - 3 - 4 - 5 - 6 - - . 7 - 8 7 6 - 4 - 5 - 3 - 0 - - .',
  calmB: '4 - 5 - 7 - 5 - 4 - 2 - 1 - - - 2 - 4 - 5 - 4 - 2 - 1 - 0 - - -',
  calm2B: '4 - - 5 6 - - . 7 - 6 - 4 - - . 3 - - 4 5 - 4 . 1 - 0 - - - - .',
  f1B: '4 . 4 5 6 . 5 4 3 . 3 4 5 . 4 3 2 . 2 3 4 . 3 2 1 - 0 - 1 - 2 -',
  f2B: '4 . 3 . 1 . 0 . 1 - 3 - 4 - - . 5 . 6 . 7 . 8 . 7 - 6 - 5 - - .',
  f3B: '7 7 6 7 8 7 6 4 5 - 4 - 3 4 5 . 7 7 6 7 8 7 9 8 7 - 6 - 4 - 6 -',
  bossB: '0 0 3 0 4 0 6 5 4 - 3 - 1 - 0 - 0 0 3 0 4 0 7 6 8 - 7 - 6 - 4 -',
  calm4: '7 - - 9 8 - 7 - 4 - - 6 4 - 2 - 0 - - 2 4 - 6 - 7 - - - 8 - - .',
  calm4B:'4 - 6 - 7 - 9 - 11 - - - 9 - 7 - 6 - - 4 6 - 7 - 4 - - - - - - .',
  f4:    '0 . 4 . 7 . 6 7 9 - 7 - 6 4 2 . 0 . 4 . 7 . 9 11 9 - 7 - 6 - 7 -',
  f4B:   '7 . 6 . 4 . 2 4 6 - 4 - 2 . 0 - 4 . 6 . 7 . 9 . 11 - 9 - 7 - 6 -',
};
const SONGS2={
  menu:  { progB:[5,3,6,4], bpm:72,  root:50, sc:'min',  prog:[0,6,5,4], mel:'menu',  lead:'flute', arp:'pluck', pad:true, vol:1 },
  calm1: { progB:[3,4,0,5], bpm:78,  root:50, sc:'min',  prog:[0,5,3,4], mel:'calm',  lead:'pluck', arp:null,    pad:true, vol:0.9 },
  calm2: { progB:[5,1,0,1], bpm:66,  root:45, sc:'phry', prog:[0,1,5,0], mel:'calm2', lead:'bell',  arp:null,    pad:true, vol:0.9 },
  calm3: { progB:[3,4,0,4], bpm:78,  root:52, sc:'hmin', prog:[0,5,3,4], mel:'calm',  lead:'pluck', arp:null,    pad:true, vol:0.9 },
  fight1:{ progB:[3,4,5,6], bpm:106, root:50, sc:'min',  prog:[0,6,5,4], mel:'f1',    lead:'lead',  arp:'pluck', drums:'k...s...k.k.s...', hats:'h.h.h.h.h.h.h.h.', vol:1 },
  fight2:{ progB:[5,4,1,0], bpm:94,  root:45, sc:'phry', prog:[0,1,5,4], mel:'f2',    lead:'bell',  arp:'pluck', pad:true, drums:'k.......s.....k.', hats:'....h.......h...', vol:1 },
  fight3:{ progB:[3,4,5,4], bpm:116, root:52, sc:'hmin', prog:[0,5,3,4], mel:'f3',    lead:'lead',  arp:'pluck', drums:'k.k.s.k.k.k.s.kk', hats:'h.h.h.h.h.h.h.hh', vol:1 },
  calm4: { progB:[1,4,5,0], bpm:70,  root:52, sc:'lyd',  prog:[0,1,4,0], mel:'calm4', lead:'bell',  arp:'pluck', pad:true, vol:0.9 },
  fight4:{ progB:[5,4,1,0], bpm:120, root:50, sc:'dor',  prog:[0,3,6,4], mel:'f4',    lead:'flute', arp:'pluck', pad:true, choir:true, drums:'k...s.k.k.k.s...', hats:'h.hhh.h.h.hhh.h.', vol:1 },
  boss:  { bossMix:true, progB:[3,6,5,4], bpm:132, root:50, sc:'hmin', prog:[0,5,6,4], mel:'boss',  lead:'lead',  arp:'pluck', choir:true, drums:'k..ks..kk.k.s.kk', hats:'hhhhhhhhhhhhhhhh', timp:true, vol:1.05 },
};
const MELP={}; for(const k in MEL) MELP[k]=MEL[k].trim().split(/\s+/);
function musicInit(){
  MUS.gain=AC.createGain(); MUS.gain.gain.value=0;
  MUS.lp=AC.createBiquadFilter(); MUS.lp.type='lowpass'; MUS.lp.frequency.value=18000; MUS.gain.connect(MUS.lp); MUS.lp.connect(AC.destination);
  MUS.bus=AC.createGain(); MUS.bus.connect(MUS.gain);
  // Hall: Impulsantwort aus abklingendem Rauschen
  try{ const len=Math.floor(AC.sampleRate*2.2), ir=AC.createBuffer(2,len,AC.sampleRate);
    for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
    const conv=AC.createConvolver(); conv.buffer=ir; const wet=AC.createGain(); wet.gain.value=0.32; MUS.bus.connect(conv); conv.connect(wet); wet.connect(MUS.gain); }catch(e){}
  MUS.filt=AC.createBiquadFilter(); MUS.filt.type='lowpass'; MUS.filt.frequency.value=520; MUS.filt.connect(MUS.bus);
  const len=AC.sampleRate*0.2, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1; MUS.noise=buf;
  MUS.next=AC.currentTime+0.1; if(MUS.timer) clearInterval(MUS.timer); MUS.timer=setInterval(musicTick,60);
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
  const I=S.drums?MUS.int:1;   // Kampfintensität 0..1 steuert, wie viele Ebenen spielen
  const bMel=S.bossMix&&typeof visAct==='function'&&run?'f'+visAct():S.mel+'B';
  const sec=Math.floor(step/64)%4, useB=sec===2 && MELP[bMel], sc=SC[S.sc], bar=Math.floor(step/16)%4, s=step%16, cd=(useB&&S.progB?S.progB:S.prog)[bar];
  const chord=[0,2,4].map(k=>S.root+degSemi(sc,cd+k));
  if(s===0){ tone('sawtooth',mtof(chord[0]-12),t,sd*16*0.95,0.45,MUS.filt,0.04);
    if(S.pad) padChord(chord.map(m=>mtof(m+12)),t,sd*16,0.035,false);
    if(S.choir) padChord(chord.map(m=>mtof(m+12)).concat([mtof(chord[0]+24)]),t,sd*16,0.04,true);
    if(S.timp) drum(t,'timp'); }
  if(S.timp && s===8 && bar%2===1) drum(t,'timp');
  if(S.arp==='pluck'){ const ev=(S.drums?2:4)/(sec===3?2:1); if(s%ev===0){ const pat=[0,1,2,1,0,2,1,2]; inst('pluck',mtof(chord[pat[(s/ev)%8]]+(S.drums?12:12)),t,sd*3,S.drums?0.07:0.06); } }
  if(I>0.8 && S.drums && s%4===2) inst('pluck',mtof(chord[2]+24),t,sd*2,0.035);   // Höhepunkt: zusätzliche hohe Figur
  if(s%2===0 && (I>0.15||!S.drums)){ const P=MELP[useB?bMel:S.mel], i=(Math.floor(step/2))%P.length, tk=P[i];
    if(tk!=='-'&&tk!=='.'){ let h=1; while(P[(i+h)%P.length]==='-'&&h<8) h++;
      const f=mtof(S.root+12+degSemi(sc,+tk)), dur=h*2*sd, v={lead:0.055,flute:0.09,pluck:0.1,bell:0.07}[S.lead];
      inst(S.lead,f,t,dur,v); } }
  if(S.drums){ const c=S.drums[s]; if(c==='k') drum(t,'kick'); else if(c==='s' && I>0.25) drum(t,'snare'); if(S.hats&&S.hats[s]==='h'&&I>0.45) drum(t,'hat'); if(I>0.92 && s%4===3) drum(t,'hat'); }
}
function songKey(){
  if((state==='combat'||state==='paused')&&G) return G.type==='boss'?'boss':'fight'+visAct();
  if(run) return 'calm'+visAct();
  return 'menu';
}
function musicTick(){
  if(!AC||!MUS.gain) return;
  const on=save.settings.music && !document.hidden, vol=(save.settings.musicVol??0.7);
  const duck=AC.currentTime<MUS.duck, soft=AC.currentTime<MUS.soft;
  // Intensität: Zahl der Gegner, Boss-Wutphase, Wellenpausen
  let want=0.5; if(typeof G!=='undefined' && G && (state==='combat'||state==='paused')){ const n=G.enemies.length+G.spawnQ.length; want=G.type==='boss'?(G.boss&&G.boss.phase2?1:0.85):Math.min(1,0.2+n*0.09); if(G.cleared) want=0.1; }
  MUS.int+=(want-MUS.int)*0.08;
  const lowHp=typeof P!=='undefined' && P && typeof G!=='undefined' && G && !G.over && state==='combat' && P.hp<P.maxHp*0.25;
  if(MUS.lp) MUS.lp.frequency.setTargetAtTime(lowHp?850:18000, AC.currentTime, 0.4);
  MUS.gain.gain.setTargetAtTime(!on?0:(duck?0.15:(state==='paused'?0.35:soft?0.45:1))*0.1*vol*((SONGS2[MUS.song]||{}).vol||1), AC.currentTime, soft?0.08:0.35);
  if(!on){ MUS.next=AC.currentTime+0.1; return; }
  const key=songKey();
  if(key!==MUS.song && MUS.step%16===0 && MUS.song){ MUS.song=key; MUS.step=0; }
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
function buzz(ms){ if(!save.settings.vibrate) return; try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} }

