'use strict';
/* Arena der Verdammten – Steuerung (Touch, Maus und Tastatur, Controller) und Spielzustand */

/* ---------------- EINGABE ---------------- */
const input={ id:null, ox:0, oy:0, cx:0, cy:0, jx:0, jy:0, keys:{}, mx:0, my:0, mOn:false };
const JR=56;
function joyBase(){ return { x: save.settings.lefty ? W-110 : 110, y: H-150 }; }
// Eingabeart: 'touch' (Handy, Tablet), 'pc' (Maus und Tastatur) oder 'pad' (Controller) – folgt der zuletzt benutzten Eingabe
let INPUT_MODE=(()=>{ try{ return matchMedia('(pointer:fine)').matches && !matchMedia('(pointer:coarse)').matches ? 'pc' : 'touch'; }catch(e){ return 'touch'; } })();
function setInputMode(m){ if(m===INPUT_MODE) return; INPUT_MODE=m; applyInputMode(); }
function applyInputMode(){ const b=document.body; b.classList.toggle('pc',INPUT_MODE==='pc'); b.classList.toggle('pad',INPUT_MODE==='pad');
  const pc=INPUT_MODE==='pc', pad=INPUT_MODE==='pad', dk=$('dashKey'), sk=$('skillKey');
  if(dk) dk.textContent=pad?'A':pc?'Leertaste':''; if(sk) sk.textContent=pad?'X':pc?'Q · Klick':''; }
// Mauszeiger in Spielwelt-Koordinaten (Kamera aus draw: CAM.cx/CAM.cy, VIEW_S)
function mouseWorld(){ return { x:(CAM.cx||0)+input.mx/VIEW_S, y:(CAM.cy||0)+input.my/VIEW_S }; }
function mouseAim(){ if(!P||!input.mOn||!AIM_SKILLS[P.cid]) return undefined; const w=mouseWorld(), dx=w.x-P.x, dy=w.y-P.y, R=AIM_RANGE[P.cid];
  return { a:Math.atan2(dy,dx), k:R?clamp((Math.hypot(dx,dy)-R[0])/(R[1]-R[0]),0,1):1 }; }
function skillReady(){ return P && ((P.maxCharges||1)>1 ? (P.charges??1)>0 : P.skillT<=0); }
cvs.addEventListener('pointerdown',e=>{
  audio(); if(state!=='combat') return; skipCine();
  if(e.pointerType==='mouse'){   // Maus: links = Fähigkeit (zielt auf den Zeiger), rechts = Ausweichen
    setInputMode('pc'); input.mx=e.clientX; input.my=e.clientY; input.mOn=true; e.preventDefault();
    if(e.button===2) useDash(); else if(e.button===0) useSkill(mouseAim()); return; }
  setInputMode('touch');
  if(input.id===null){
    if(save.settings.joyFixed){ const b=joyBase(); if(Math.hypot(e.clientX-b.x,e.clientY-b.y)>150) return; input.ox=b.x; input.oy=b.y; }
    else { input.ox=e.clientX; input.oy=e.clientY; }
    input.id=e.pointerId; input.cx=e.clientX; input.cy=e.clientY; input.jx=input.jy=0; joyCalc(); try{cvs.setPointerCapture(e.pointerId);}catch(_){} }
  e.preventDefault();
});
cvs.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'){ input.mx=e.clientX; input.my=e.clientY; input.mOn=true; if(INPUT_MODE==='pad' && Math.abs(e.movementX||0)+Math.abs(e.movementY||0)>3) setInputMode('pc'); }
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
cvs.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse') input.mOn=false; });
cvs.addEventListener('contextmenu',e=>e.preventDefault());
// Tastatur: WASD/Pfeile bewegen, Leertaste/Umschalt ausweichen, Q/E Fähigkeit (zielt auf den Mauszeiger), Esc/P Pause, F Vollbild
// In Menüs: Pfeile/WASD wählen aus, Enter bestätigt, 1–9 wählt Karten und Wege, Esc geht zurück
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase(); audio();
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  input.keys[k]=true; if(e.ctrlKey||e.metaKey||e.altKey) return;   // Tastenkürzel des Browsers (Strg+F, Strg+R …) nicht abfangen
  if(!['shift','control','alt','meta'].includes(k) && INPUT_MODE==='touch') setInputMode('pc');
  if(k==='f' && !e.repeat){ toggleFullscreen(); return; }
  if(state==='combat'){ skipCine(); const ae=document.activeElement; if(ae && ae!==document.body && ae.blur) ae.blur(); if(e.repeat) return;
    if(k===' '||k==='shift'||k==='k'){ useDash(); e.preventDefault(); }
    else if(k==='q'||k==='e'||k==='j'){ useSkill(INPUT_MODE==='pc'?mouseAim():undefined); }
    else if(k==='escape'||k==='p') pauseGame();
    if(k.startsWith('arrow')) e.preventDefault(); return; }
  if(state==='paused' && (k==='escape'||k==='p') && !e.repeat && actions.resume){ actions.resume(); return; }
  menuKey(e,k);
});
addEventListener('keyup',e=>{ input.keys[e.key.toLowerCase()]=false; });
addEventListener('blur',()=>{ for(const k in input.keys) input.keys[k]=false; if(state==='combat' && INPUT_MODE!=='touch') pauseGame(); });
function readMove(){
  let x=input.jx+PAD.ax, y=input.jy+PAD.ay; const k=input.keys;
  if(k['a']||k['arrowleft'])x-=1; if(k['d']||k['arrowright'])x+=1; if(k['w']||k['arrowup'])y-=1; if(k['s']||k['arrowdown'])y+=1;
  const l=Math.hypot(x,y); if(l>1){x/=l;y/=l;} return [x,y];
}
// Fähigkeit: Tippen = automatisch, vom Knopf wegziehen = zielen (Richtung und Weite), Loslassen löst aus
let skillPtr=null;
$('skillBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); audio();
  if(!P || !AIM_SKILLS[P.cid] || state!=='combat'){ useSkill(); return; }
  skillPtr={id:e.pointerId,x:e.clientX,y:e.clientY,aim:false}; try{ $('skillBtn').setPointerCapture(e.pointerId); }catch(_){} });
$('skillBtn').addEventListener('pointermove',e=>{ if(!skillPtr||e.pointerId!==skillPtr.id||!P) return;
  const dx=e.clientX-skillPtr.x, dy=e.clientY-skillPtr.y, l=Math.hypot(dx,dy);
  if(l>16){ skillPtr.aim=true; P.aim={a:Math.atan2(dy,dx),k:Math.min(1,(l-16)/90)}; } else { skillPtr.aim=false; P.aim=null; } });
$('skillBtn').addEventListener('pointerup',e=>{ if(!skillPtr||e.pointerId!==skillPtr.id) return; const aim=skillPtr.aim&&P?P.aim:null; skillPtr=null; if(P) P.aim=null; useSkill(aim||undefined); });
$('skillBtn').addEventListener('pointercancel',()=>{ skillPtr=null; if(P) P.aim=null; });
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

/* ---------------- MENÜS PER TASTATUR UND CONTROLLER ---------------- */
let navEl=null;
const NAV_GROUPS=['pick','evo','relic','opt','go'];
function navButtons(){ return [...ui.querySelectorAll('[data-a]:not([disabled])')].filter(b=>b.dataset.a!=='x' && b.offsetParent!==null); }
function navFocus(b){ if(navEl && navEl!==b) navEl.classList.remove('navf'); navEl=b; if(!b) return; b.classList.add('navf'); try{ b.scrollIntoView({block:'nearest'}); }catch(e){} }
function navStart(){ const bs=navButtons(); return bs.find(b=>b.classList.contains('primary'))||bs.find(b=>NAV_GROUPS.includes(b.dataset.a))||bs[0]; }
// räumliche Auswahl: nächster Knopf in Pfeilrichtung
function navMove(dx,dy){ const bs=navButtons(); if(!bs.length) return;
  if(!navEl || !bs.includes(navEl)){ navFocus(navStart()); return; }
  const r0=navEl.getBoundingClientRect(), x0=r0.left+r0.width/2, y0=r0.top+r0.height/2; let best=null, bs2=1e9;
  for(const b of bs){ if(b===navEl) continue; const r=b.getBoundingClientRect(), vx=r.left+r.width/2-x0, vy=r.top+r.height/2-y0, along=vx*dx+vy*dy;
    if(along<=4) continue; const sc=along+Math.abs(vx*dy-vy*dx)*2.5; if(sc<bs2){ bs2=sc; best=b; } }
  if(best) navFocus(best); }
function navActivate(){ const bs=navButtons(); if(navEl && bs.includes(navEl)){ navEl.click(); return; } const s=navStart(); if(s) navFocus(s); }
function navBack(){ for(const a of ['back','resume','no','close']){ const b=ui.querySelector(`[data-a="${a}"]:not([disabled])`); if(b){ b.click(); return true; } } return false; }
function navAfterRender(){ navEl=null; if(INPUT_MODE==='pad') navFocus(navStart()); }
function menuKey(e,k){
  if(ui.classList.contains('hidden')) return;
  const dir={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]}[k];
  if(dir){ navMove(dir[0],dir[1]); e.preventDefault(); return; }
  if(k==='enter'||k===' '){ if(navEl && navButtons().includes(navEl)){ navEl.click(); e.preventDefault(); return; }
    const pb=ui.querySelector('.btn.primary:not([disabled])'); if(pb){ pb.click(); e.preventDefault(); } return; }
  if(k==='escape'||k==='backspace'){ if(navBack()) e.preventDefault(); return; }
  if(/^[1-9]$/.test(k)){ const n=+k-1;
    for(const g of NAV_GROUPS){ let bs=[...ui.querySelectorAll(`[data-a="${g}"]:not([disabled])`)].filter(b=>b.offsetParent!==null); if(!bs.length) continue;
      if(g==='go' && ui.querySelector('.mapbox')) bs.sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
      if(bs[n]){ bs[n].click(); e.preventDefault(); } return; } }
}
// Kartenwahl-Ziffern als kleine Plaketten anzeigen (nur mit Tastatur/Controller sinnvoll)
function navDecorate(){ if(INPUT_MODE==='touch') return;
  for(const g of NAV_GROUPS){ let bs=[...ui.querySelectorAll(`[data-a="${g}"]:not([disabled])`)].filter(b=>b.offsetParent!==null); if(!bs.length) continue;
    if(g==='go' && ui.querySelector('.mapbox')) bs.sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
    bs.slice(0,9).forEach((b,i)=>b.dataset.key=i+1); return; } }

/* ---------------- CONTROLLER (Gamepad-API, Standardbelegung) ----------------
   Linker Stick/Steuerkreuz bewegen, A/LB/LT ausweichen, X/Y/RB/RT Fähigkeit, rechter Stick zielt, Start Pause.
   In Menüs: Stick/Steuerkreuz wählt aus, A bestätigt, B zurück. */
const PAD={ax:0,ay:0,prev:[],navT:0,held:false,aiming:false,on:false};
addEventListener('gamepadconnected',()=>{ setInputMode('pad'); toast('<span style="font-size:24px">🎮</span><div><b>Controller verbunden</b><div class="sub" style="font-size:13px">Linker Stick bewegen · A ausweichen · X Fähigkeit · rechter Stick zielen · Start Pause</div></div>'); });
addEventListener('gamepaddisconnected',()=>{ PAD.ax=PAD.ay=0; PAD.prev=[]; if(INPUT_MODE==='pad') setInputMode(matchMedia('(pointer:fine)').matches?'pc':'touch'); });
function pollPad(dt){
  let gp=null; try{ const l=navigator.getGamepads?navigator.getGamepads():[]; for(const g of l) if(g&&g.connected){ gp=g; break; } }catch(e){}
  if(!gp){ PAD.ax=PAD.ay=0; return; }
  const bt=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed), dz=v=>Math.abs(v)<0.22?0:v, down=i=>bt(i)&&!PAD.prev[i];
  let ax=dz(gp.axes[0]||0)+(bt(15)?1:0)-(bt(14)?1:0), ay=dz(gp.axes[1]||0)+(bt(13)?1:0)-(bt(12)?1:0); const rx=dz(gp.axes[2]||0), ry=dz(gp.axes[3]||0);
  const l=Math.hypot(ax,ay); if(l>1){ ax/=l; ay/=l; }
  const any=gp.buttons.some(b=>b&&b.pressed)||l>0.3||Math.hypot(rx,ry)>0.3; if(any){ audio(); setInputMode('pad'); }
  if(state==='combat'){
    PAD.ax=ax; PAD.ay=ay; if(any) skipCine();
    if(P && AIM_SKILLS[P.cid] && Math.hypot(rx,ry)>0.35){ P.aim={a:Math.atan2(ry,rx),k:Math.min(1,(Math.hypot(rx,ry)-0.35)/0.6)}; PAD.aiming=true; }
    else if(PAD.aiming){ PAD.aiming=false; if(P) P.aim=null; }
    if(down(0)||down(4)||down(6)) useDash();
    if(down(2)||down(3)||down(5)||down(7)) useSkill(PAD.aiming&&P&&P.aim?{...P.aim}:undefined);
    if(down(9)) pauseGame();
  } else { PAD.ax=PAD.ay=0; if(PAD.aiming){ PAD.aiming=false; if(P) P.aim=null; }
    PAD.navT-=dt;
    if(l>0.5){ if(PAD.navT<=0){ PAD.navT=PAD.held?0.15:0.35; PAD.held=true; if(Math.abs(ax)>Math.abs(ay)) navMove(Math.sign(ax),0); else navMove(0,Math.sign(ay)); } }
    else { PAD.held=false; PAD.navT=0; }
    if(down(0)) navActivate();
    if(down(1)) navBack();
    if(down(9)){ if(state==='paused'&&actions.resume) actions.resume(); else navActivate(); }
  }
  PAD.prev=gp.buttons.map(b=>!!(b&&b.pressed));
}

/* ---------------- VOLLBILD ---------------- */
function isFullscreen(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
function toggleFullscreen(){ const d=document, el=d.documentElement, no=()=>toast('<b>Vollbild ist hier nicht möglich</b><div class="sub" style="font-size:13px">Am PC hilft meist die Taste F11.</div>');
  try{ if(isFullscreen()){ (d.exitFullscreen||d.webkitExitFullscreen).call(d); return; }
    const f=el.requestFullscreen||el.webkitRequestFullscreen; if(!f){ no(); return; } const r=f.call(el); if(r&&r.catch) r.catch(no); }catch(e){ no(); } }
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

