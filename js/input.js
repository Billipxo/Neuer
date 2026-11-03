'use strict';
/* Arena der Verdammten – Touch-/Tastatursteuerung und Spielzustand */

/* ---------------- EINGABE ---------------- */
const input={ id:null, ox:0, oy:0, cx:0, cy:0, jx:0, jy:0, keys:{} };
const JR=56;
function joyBase(){ return { x: save.settings.lefty ? W-110 : 110, y: H-150 }; }
cvs.addEventListener('pointerdown',e=>{
  audio(); if(state!=='combat') return;
  if(input.id===null){
    if(save.settings.joyFixed){ const b=joyBase(); if(Math.hypot(e.clientX-b.x,e.clientY-b.y)>150) return; input.ox=b.x; input.oy=b.y; }
    else { input.ox=e.clientX; input.oy=e.clientY; }
    input.id=e.pointerId; input.cx=e.clientX; input.cy=e.clientY; input.jx=input.jy=0; joyCalc(); try{cvs.setPointerCapture(e.pointerId);}catch(_){} }
  e.preventDefault();
});
cvs.addEventListener('pointermove',e=>{
  if(e.pointerId!==input.id) return;
  input.cx=e.clientX; input.cy=e.clientY; joyCalc();
});
function joyCalc(){
  let dx=input.cx-input.ox, dy=input.cy-input.oy; const l=Math.hypot(dx,dy);
  if(l>JR && !save.settings.joyFixed){ input.ox+= dx/l*(l-JR); input.oy+= dy/l*(l-JR); dx=input.cx-input.ox; dy=input.cy-input.oy; }
  const m=Math.min(1,Math.hypot(dx,dy)/JR), ll=Math.hypot(dx,dy)||1;
  input.jx=dx/ll*(m<0.12?0:m); input.jy=dy/ll*(m<0.12?0:m);
}
function endPointer(e){ if(e.pointerId===input.id){ input.id=null; input.jx=input.jy=0; } }
cvs.addEventListener('pointerup',endPointer); cvs.addEventListener('pointercancel',endPointer);
addEventListener('keydown',e=>{
  input.keys[e.key.toLowerCase()]=true; audio();
  if(state==='combat'){ if(e.key===' ') { useSkill(); e.preventDefault(); } if(e.key==='Shift'||e.key==='k') useDash(); if(e.key==='Escape'||e.key==='p') pauseGame(); }
});
addEventListener('keyup',e=>{ input.keys[e.key.toLowerCase()]=false; });
function readMove(){
  let x=input.jx, y=input.jy; const k=input.keys;
  if(k['a']||k['arrowleft'])x-=1; if(k['d']||k['arrowright'])x+=1; if(k['w']||k['arrowup'])y-=1; if(k['s']||k['arrowdown'])y+=1;
  const l=Math.hypot(x,y); if(l>1){x/=l;y/=l;} return [x,y];
}
$('skillBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); audio(); useSkill(); });
$('dashBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); audio(); useDash(); });
$('pauseBtn').addEventListener('click',()=>pauseGame());
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ if(state==='combat') pauseGame(); saveNow(); }
  else { audioRevive(); if(state==='combat'||state==='paused') wakeLock(true); }
});
addEventListener('pagehide',saveNow);
// Beim Verlassen sichern: laufender Raum wird beim Fortsetzen neu gestartet, offene Belohnungen bleiben erhalten
function saveNow(){ try{ if(run && !run.ended && !(G&&G.over)) save.run=run; persist(); }catch(e){} }
// Bildschirm im Kampf wach halten (wo der Browser es erlaubt)
let WL=null;
function wakeLock(on){ try{
  if(on && !WL && navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then(l=>{ WL=l; l.addEventListener('release',()=>{ if(WL===l) WL=null; }); }).catch(()=>{});
  if(!on && WL){ WL.release().catch(()=>{}); WL=null; } }catch(e){} }
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('pointerdown',()=>audio(),{passive:true});
document.addEventListener('keydown',()=>audio());

/* ---------------- ZUSTAND ---------------- */
let state='menu'; // menu | combat | ui | paused
let run=null, G=null, P=null;

function newPlayer(cid, noMeta){
  const ml=id=>noMeta?0:metaLvl(id);
  const hl=noMeta?0:heroLvl(cid), c=CHARS[cid], hp=c.hp+ml('m_hp')*8+hl*3;
  return { cid, maxHp:hp, hp, speed:c.speed, dmg:c.dmg*(1+0.06*ml('m_dmg'))*(1+0.02*hl), rate:c.rate, range:c.range, armor:c.armor,
    count:1, crit:0.05, critMul:2, lifeOnKill:0, regen:0, thorns:0, cdMul:1, goldMul:1, area:1, pierce:c.attack==='arrow'?1:0,
    orbit:0, chain:0, explode:0, frost:0, shield:0, revive:0, atkSpd:1, spdMul:1, dashCdMul:1,
    minions:c.attack==='skull'?3:0, raise:c.attack==='skull'?0.25:0, minionDmg:1, boneArmor:0,
    wave:0, dashDmg:0, rage:0, bleed:c.attack==='axe'?0.6:0, fury:0, furyT:0, expEvery:5, hamDmg:1, split:0, meteor:0, manaShield:0, bounce:0, poison:0, volley:0, shadow:0, atkCount:0 };
}

function startRun(cid, opts={}){
  const daily=opts.daily||null; if(!daily) save.lastChar=cid; save.runs++;
  const seed = daily ? 'daily-'+daily : Math.random().toString(36).slice(2);
  const weekly = !!(daily && daily[0]==='W');
  const mod = daily && !weekly ? dailyInfo(daily).mod : null;
  const ch = opts.challenge ? CHALLENGES.find(c=>c.id===opts.challenge) : null;
  const mods = weekly ? weeklyInfo(daily).mods : ch ? ch.mods.slice() : null;
  run={ v:RUN_V, cid, p:newPlayer(cid,!!daily), act:1, map:null, posId:null, visited:[], gold:daily?10:25*metaLvl('m_gold')+10, goldTotal:0, souls:0, kills:0, rooms:0, bosses:0,
    upg:{}, syn:[], rerolls:daily?1:metaLvl('m_reroll'), won:false, endless:false, seed, daily, mod:mod?mod.id:null, mods, challenge:ch?ch.id:null,
    tier:(daily||ch)?0:Math.max(0,Math.min(opts.tier||0, typeof tierOpen==='function'?tierOpen(cid):0)), ng:daily?0:(opts.ng||0), elites:0, bossKills:[] };
  if(run.ng) run.p.goldMul+=0.2*run.ng;
  run.pet=(!daily && save.pet && (save.pets||{})[save.pet])?save.pet:null; if(run.pet==='cat') run.p.crit+=0.05;
  const M=runMod(); if(M){ if(M.start) M.start(run.p); if(M.gold) run.gold=M.gold; if(M.curses) for(const id of M.curses) if(UPG[id]) applyUpgrade(UPG[id]); }
  run.map=seeded(seed+'|map|1',()=>genMap(1)); applyMapMods(run.map); unlockLore('act1');
  showMap();
}
function nextAct(){
  run.act++; if(run.act<=4) unlockLore('act'+run.act); run.map=seeded(run.seed+'|map|'+run.act,()=>genMap(run.act)); applyMapMods(run.map); run.posId=null; run.visited=[];
  run.p.hp=Math.min(run.p.maxHp,run.p.hp+run.p.maxHp*0.35); showMap();
}
const roomKey = k => run.seed+'|'+k+'|'+run.posId;
// Sonderregeln, die Knoten der Karte austauschen (z. B. keine Händler)
function applyMapMods(map){ const M=runMod(); if(!M||!M.mapSwap) return; for(const rw of map.rows) for(const n of rw) if(M.mapSwap[n.type]) n.type=M.mapSwap[n.type]; }

