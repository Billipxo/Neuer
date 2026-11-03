'use strict';
/* Arena der Verdammten – Kampf: Räume, Gegner-KI, Bosse, Geschosse, Schaden und Partikel */

/* ---------------- KAMPF ---------------- */
function enemyPool(act,row){ return Object.keys(ENEMIES).filter(k=>{ const d=ENEMIES[k]; return !d.noPool && (!d.minAct||act>=d.minAct) && (!d.minRow||row>=d.minRow||act>1); }); }
function buildWaves(type){
  const act=run.act, row=nodeById(run.posId).row, depth=(act-1)*6+row;
  let pool=enemyPool(act,row); const nW = type==='elite'?2:(row<2?2:3), waves=[];
  let theme=null;
  if(type==='fight' && row>=1 && !run.daily && RNG()<0.3){ const va=visAct(), opts=THEMES.filter(t=>t.acts.includes(va) && t.kinds.every(k=>!ENEMIES[k].minAct||act>=ENEMIES[k].minAct));
    if(opts.length){ theme=pick(opts); pool=theme.kinds; } }
  for(let w=0;w<nW;w++){
    let budget=(5+depth*1.25+w*1.5)*(type==='elite'?0.7:1)*((runMod()||{}).waveMul||1); const list=[];
    while(budget>0){ const k=pick(pool); list.push({kind:k}); budget-=ENEMIES[k].cost; if(k==='hound'){ list.push({kind:k},{kind:k}); budget-=2*ENEMIES[k].cost; } }
    if(type==='elite' || ((runMod()||{}).eliteEvery && w===nW-1) || ((run.ng||0)>0 && w===nW-1 && RNG()<0.25*run.ng)) list.push({kind:pick(pool.filter(k=>k!=='bat')), elite:true});
    if(tierHas(2) && type!=='elite' && w===nW-1 && RNG()<0.5) list.push({kind:pick(pool.filter(k=>k!=='bat')), elite:true});
    if(type==='elite' && w===nW-1){ const el=list.find(s=>s.elite); if(el) el.champ=true; }
    waves.push(list);
  }
  waves.theme=theme;
  return waves;
}

const FLY={bat:1,imp:1,lich:1,dragon:1,whelp:1,wraith:1,gargoyle:1};
function genArena(type){
  const obs=[], traps=[], start={x:AW/2,y:AH*0.7}, act=visAct();
  const free=(x,y,r)=> Math.hypot(x-start.x,y-start.y)>r+80 && x>r+24 && x<AW-r-24 && y>r+24 && y<AH-r-24
    && obs.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r+34) && traps.every(t=>Math.hypot(t.x-x,t.y-y)>t.r+r+24);
  let pts=[];
  if(type==='boss') pts=[[150,210],[610,210],[150,800],[610,800]];
  else {
    const L=pick(['open','four','ring','corridor','scatter','cross','scatter','four']);
    if(L==='four') pts=[[200,290],[560,290],[200,640],[560,640]];
    if(L==='ring'){ for(let i=0;i<6;i++){ const a=i/6*TAU+0.5; pts.push([AW/2+Math.cos(a)*230,AH*0.45+Math.sin(a)*230]); } }
    if(L==='corridor') pts=[[130,420],[250,420],[510,580],[630,580]];
    if(L==='cross') pts=[[AW/2,250],[AW/2,520],[190,AH/2],[570,AH/2]];
    if(L==='scatter') for(let i=0;i<6;i++) pts.push([rand(90,AW-90),rand(90,AH-90)]);
  }
  for(const [x,y] of pts){ const r=type==='boss'?30:pick([24,28,32]); if(free(x,y,r)) obs.push({type:'pillar',x,y,r}); }
  if(type==='boss'){ if(act===3) for(const x of [120,640]) traps.push({type:'lava',x,y:AH/2,r:48,tick:0}); }
  else {
    if(act===3) for(let i=randi(2,3),k=0;i>0&&k<40;k++){ const r=rand(40,62),x=rand(80,AW-80),y=rand(80,AH-80); if(free(x,y,r)){ traps.push({type:'lava',x,y,r,tick:0}); i--; } }
    else for(let i=randi(1,3),k=0;i>0&&k<40;k++){ const x=rand(80,AW-80),y=rand(80,AH-80); if(free(x,y,30)){ traps.push({type:'spikes',x,y,r:30,t:rand(0,2.8)}); i--; } }
    for(let i=randi(2,4),k=0;i>0&&k<40;k++){ const x=rand(60,AW-60),y=rand(60,AH-60); if(free(x,y,14)){ obs.push({type:'barrel',x,y,r:14}); i--; } }
  }
  traps.forEach((t,i)=>t.id=i);
  return {obs,traps};
}
function solidHit(x,y,r){ for(const o of G.obs) if(!o.dead && Math.hypot(o.x-x,o.y-y)<o.r+r) return o; return null; }
function pushOut(ent, slide=0){
  let hit=false;
  for(const o of G.obs){ if(o.dead) continue; const dx=ent.x-o.x, dy=ent.y-o.y, d=Math.hypot(dx,dy)||0.01, m=ent.r+o.r;
    if(d<m){ ent.x=o.x+dx/d*m; ent.y=o.y+dy/d*m; if(slide){ ent.x+=-dy/d*slide; ent.y+=dx/d*slide; } hit=true; } }
  ent.x=clamp(ent.x,ent.r,AW-ent.r); ent.y=clamp(ent.y,ent.r,AH-ent.r);
  return hit;
}
function los(a,b){
  for(const o of G.obs){ if(o.dead||o.type!=='pillar') continue;
    const dx=b.x-a.x, dy=b.y-a.y, L=dx*dx+dy*dy||1, t=clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/L,0,1);
    if(Math.hypot(a.x+dx*t-o.x,a.y+dy*t-o.y)<o.r-3) return false; }
  return true;
}
function blowBarrel(o){
  if(o.dead) return; o.dead=true;
  G.booms.push({x:o.x,y:o.y,r:80,dmg:Math.max(40*(1+0.5*(run.act-1)),P.dmg*2),barrel:true});
}
function startCombat(type, customWaves){
  const p=run.p; if(!customWaves) run.room=type; run.pend=null;
  const tut = !save.tutDone && type==='fight' && !run.daily && run.rooms===0 && !customWaves;
  if(tut) customWaves=[[{kind:'slime'},{kind:'slime'}],[{kind:'skeleton'},{kind:'skeleton'},{kind:'archer'}]];
  P=Object.assign(p,{ x:AW/2, y:AH*0.7, r:14, vx:0, vy:0, face:-Math.PI/2, atkT:0.3, skillT:0, inv:0, shieldLeft:p.shield, spin:0, spinTick:0, regenAcc:0, moving:false, anim:0, swingT:0, dashT:0, dashCd:0, dashA:0, dashI:0, dashChg:hasRelic('r_feather')?2:1, hornT:hasRelic('r_horn')?6:0, charges:p.maxCharges||1, echoT:0, echoTgt:null, leap:null, vortex:null, ward:0, fury:0, furyT:0, stillT:0, holy:0, msT:0, trailT:0, nextCrit:false, kbx:0, kby:0, hurtT:0 });
  P.shieldLeft = p.shield + (p.manaShield?1:0);
  G={ type, enemies:[], pproj:[], eproj:[], hazards:[], webs:[], allies:[], pzones:[], ezones:[], pstrikes:[], parts:[], texts:[], coins:[], fx:[], spawnQ:[], booms:[],
      stop:0, stopCd:0, waves: customWaves || (type==='boss'?[]:seeded(roomKey('waves'),()=>buildWaves(type))), obs:[], traps:[], waveIdx:-1, waveT:0.35, cleared:false, clearT:0, time:0, shake:0, hurtFlash:0, orbitA:0, boss:null, weather:tut?'clear':seeded(roomKey('weather'),()=>wpick(WEATHER_POOL[visAct()])), hype:0.15, cheerCd:8, flash:0, lastProg:0, combo:0, comboLast:-9, bossHit:false,
      over:false, deathT:0, slowT:0, whiteFlash:0, moved:0, tut:tut?{step:0,t:0}:null };
  Object.assign(G, seeded(roomKey('arena'),()=>genArena(type)));
  if(G.tut){ G.obs=[]; G.traps=[]; }
  G.rc=null;
  if(type==='fight' && !G.tut && !customWaves && nodeById(run.posId) && nodeById(run.posId).row>=1){ const pickC=seeded(roomKey('rchal'),()=>RNG()<0.35?pick(ROOM_CHAL):null);
    if(pickC){ G.rc={...pickC, failed:false, done:pickC.id!=='combo', limit:pickC.id==='speed'?Math.round(22+G.waves.length*9+G.waves.flat().length*1.2):0};
      const rc=G.rc; setTimeout(()=>{ if(G) banner(rc.ic+' '+rc.nm, rc.ds+' Belohnung: '+RC_REW[rc.rew], 2600); },G.weather!=='clear'?1700:300); } }
  G.theme=(G.waves&&G.waves.theme)||null; if(G.theme){ const th=G.theme; setTimeout(()=>{ if(G) banner(th.ic+' '+th.nm,'Eine besondere Gegnergruppe',1800); },1500); }
  if(type==='boss'){
    const bk=bossKind(); G.waveIdx=0; G.waveT=99;
    G.spawnQ.push({x:AW/2,y:AH*0.3,t:1.1,kind:bk,boss:true});
    const again=save.lastRun && save.lastRun.killer===bk && BOSS_AGAIN[bk];
    setTimeout(()=>{ if(G) banner(BOSSES[bk].name, again||BOSS_LINES[bk]||actOf(run.act).name, 3200); },50); sfx('boss');
  }
  buildFloor(); initAmbient(); initWeather();
  DECOR.candles=DECOR.candles.filter(c=>!G.obs.some(o=>o.type==='pillar'&&Math.hypot(o.x-c.x,o.y-c.y)<o.r+10));
  input.id=null; input.jx=input.jy=0; $('banner').classList.remove('show');
  ui.classList.add('hidden'); $('hud').classList.remove('hidden'); fadeIn();
  const c=CHARS[run.cid]; $('skillIc').textContent=c.skill.icon; $('skillLbl').textContent=c.skill.name;
  $('bossBar').classList.toggle('hidden', type!=='boss');
  $('hudRoom').innerHTML=`Akt ${run.act}<br>${NODE[type].nm} ${WEATHER[G.weather].ic}`;
  if(G.weather!=='clear' && type!=='boss' && !G.tut) setTimeout(()=>{ if(G) banner(WEATHER[G.weather].ic+' '+WEATHER[G.weather].nm); },60);
  { const M=runMod()||{}; $('dashBtn').style.display=M.noDash?'none':''; $('skillBtn').style.display=M.noSkill?'none':''; }
  state='combat'; last=performance.now(); wakeLock(true);
}

function makeEnemy(kind,x,y,elite){
  const d=ENEMIES[kind], act=run.act, row=nodeById(run.posId).row;
  const ex=act>3?Math.pow(1.25,act-3):1;
  const ng=run.ng||0;
  const hs=(1+0.6*(act-1)+0.07*row)*ex*(1+0.45*ng)*(tierHas(1)?1.2:1), ds=(1+0.3*(act-1)+0.03*row)*Math.sqrt(ex)*(1+0.25*ng)*(tierHas(6)?1.2:1);
  const e={ kind, x,y, r:d.r, hp:d.hp*hs, dmg:d.dmg*ds, speed:d.speed*rand(0.9,1.1), ai:d.ai, t:rand(0,3), seed:rand(0,TAU), flash:0, slow:0, freeze:0, kx:0, ky:0,
    elite:!!elite, gold:d.gold, soul:1, st:0, timer:rand(1,2.5), dir:Math.random()<0.5?1:-1, face:0, orbCd:0, squish:0, fire:d.fire||2 };
  if(elite){ e.hp*=3.2; e.r*=1.35; e.dmg*=1.3; e.gold*=4; e.soul=5;
    const n=((act>=2||run.ng)?2:1)+(tierHas(8)?1:0); e.affix=shuffle(Object.keys(AFFIXES).filter(k=>!(k==='split'&&kind==='slime'))).slice(0,n);
    if(e.affix.includes('fast')) e.speed*=1.6; if(e.affix.includes('summon')) e.sumT=4; }
  if(kind==='mimic') e.soul=6;
  if(kind==='worm'){ e.under=true; e.timer=rand(1.5,2.5); }
  if(kind==='spiderling'){ e.soul=0; }
  if(kind==='wraith'||kind==='gargoyle') e.alpha=1;
  if(kind==='totem'){ e.soul=0; e.spawnT=0.3; }
  e.speed*=((runMod()||{}).enemySpeed||1)*(1+0.04*Math.min(5,run.ng||0))*(tierHas(5)?1.1:1); e.spawnT=0.45;
  if(hasRelic('r_bell')) e.hp*=0.85; if(hasRelic('r_idol')) e.dmg*=1.15;
  e.maxHp=e.hp; return e;
}
function champify(e){
  e.champ=true; e.name=CHAMP_NAMES[e.kind]||'Der Champion'; e.hp*=1.8; e.r*=1.15; e.dmg*=1.15; e.gold*=2; e.soul*=3;
  const extra=Object.keys(AFFIXES).filter(k=>!(e.affix||[]).includes(k)&&!(k==='split'&&e.kind==='slime')); if(extra.length){ e.affix=(e.affix||[]).concat([pick(extra)]); if(e.affix.includes('fast')&&e.speed) e.speed*=1; if(e.affix.includes('summon')&&e.sumT===undefined) e.sumT=4; }
  e.maxHp=e.hp; G.champ=e; $('bossName').textContent='⭐ '+e.name; $('bossBar').classList.remove('hidden');
  setTimeout(()=>{ if(G) banner(e.name,'Ein Champion betritt die Arena!',2200); },200); sfx('boss'); G.shake+=6; hype(0.3);
}
function makeBoss(kind,x,y){
  const b=BOSSES[kind], s=(1+0.08*metaLvl('m_dmg'))*(run.act>3?1+0.8*(run.act-3):1)*(1+0.5*(run.ng||0))*(tierHas(3)?1.25:1);
  const e={ kind, boss:true, x,y, r:b.r, hp:b.hp*s, maxHp:b.hp*s, dmg:b.dmg, speed:b.speed, ai:kind, t:0, flash:0, slow:0, freeze:0, kx:0, ky:0, soul:0, gold:0,
    st:0, timer:2, cast:null, castT:0, face:Math.PI/2, alpha:1, seed:0, orbCd:0, phase2:false, spiral:0 };
  if(kind==='lavaworm'){ e.st=0; e.wt=1.5; e.under=true; }
  if(run.ng) e.dmg*=1+0.25*run.ng; if(hasRelic('r_idol')) e.dmg*=1.15;
  G.boss=e; $('bossName').textContent=(run.ng?'NG+'+run.ng+' · ':'')+b.name; return e;
}

function nextWave(){
  G.waveIdx++; const list=G.waves[G.waveIdx];
  list.forEach((s,i)=>{
    let x,y,tries=0; do{ x=rand(40,AW-40); y=rand(40,AH-40); tries++; }while((Math.hypot(x-P.x,y-P.y)<220 || solidHit(x,y,24) || G.traps.some(t=>t.type==='lava'&&Math.hypot(t.x-x,t.y-y)<t.r+20)) && tries<40);
    G.spawnQ.push({x,y,t:0.6+i*0.06,kind:s.kind,elite:s.elite,champ:s.champ});
  });
}

function update(dt){
  if(G.slowT>0){ G.slowT-=dt; dt*=0.35; }
  if(G.over){ G.deathT+=dt; dt*=0.3; }
  if(G.whiteFlash>0) G.whiteFlash-=dt;
  G.time+=dt; if(G.tut) updTut(dt);
  if(!G.over){ run.actTime=run.actTime||{}; run.actTime[run.act]=(run.actTime[run.act]||0)+dt; }
  // spawns
  for(const s of G.spawnQ){ s.t-=dt; if(s.t<=0){ if(!s.boss) newFoeHint(s.kind); { const en=s.boss?makeBoss(s.kind,s.x,s.y):makeEnemy(s.kind,s.x,s.y,s.elite); if(s.champ) champify(en); G.enemies.push(en); } if(s.boss){ roar(s.kind); G.shake+=10; } burst(s.x,s.y,s.boss?40:10,'#b69cff',s.boss?220:120); } }
  G.spawnQ=G.spawnQ.filter(s=>s.t>0);
  if(!G.cleared && G.type!=='boss' && G.enemies.length===0 && G.spawnQ.length===0){
    if(G.waveIdx < G.waves.length-1){ if(!G.tut || G.tut.step>=(G.waveIdx<0?1:4)) G.waveT-=dt; if(G.waveT<=0){ nextWave(); G.waveT=0.45; if(G.waveIdx>0) banner('Welle '+(G.waveIdx+1)); } }
    else clearRoom();
  }
  if(!G.over) updPlayer(dt);
  for(const e of G.enemies) updEnemy(e,dt);
  separate();
  updAllies(dt);
  updProjectiles(dt);
  updHazards(dt);
  for(const z of G.pzones){ z.life-=dt; z.tick-=dt; const zc=ZONE_COL[z.kind]||'#9a5aff';
    if(z.tick<=0){ z.tick=0.3; for(const e of G.enemies){ if(!e.dead && Math.hypot(e.x-z.x,e.y-z.y)<z.r+e.r){ dealDamage(e,z.dps*0.3,{src:z.src||(z.kind?'atk':'shadow'),noChain:true,noCrit:true,color:z.kind?zc:'#c9a0ff'}); if(z.kind==='acid') e.slow=Math.max(e.slow,0.4);
      if(e.dead && P.chainR && z.kind) G.booms.push({x:e.x,y:e.y,r:55,dmg:P.dmg*0.9}); } } }
    if(Math.random()<dt*(z.kind?6:3)) part(z.x+rand(-0.7,0.7)*z.r,z.y+rand(-0.4,0.4)*z.r,0,-40,0.5,z.kind?3:4,zc,true); }
  for(const z of G.ezones){ z.life-=dt; if(!G.over && z.life<z.max-0.3 && Math.hypot(P.x-z.x,P.y-z.y)<z.r+P.r*0.3) hurtPlayer(z.dmg,null);
    if(Math.random()<dt*5) part(z.x+rand(-0.7,0.7)*z.r,z.y+rand(-0.5,0.5)*z.r,rand(-10,10),-20,0.8,4,'#9ad84a'); }
  G.ezones=G.ezones.filter(z=>z.life>0);
  G.pzones=G.pzones.filter(z=>z.life>0);
  for(const s of G.pstrikes){ s.t+=dt; if(s.t>=s.delay){ s.done=true; explosion(s.x,s.y,s.r,s.dmg,'#8ec8ff',false,'meteor'); G.shake+=4; if(hasSyn('comet')) for(const e of G.enemies) if(!e.dead && Math.hypot(e.x-s.x,e.y-s.y)<s.r+e.r) e.freeze=Math.max(e.freeze,e.boss?0.4:1.5); } }
  G.pstrikes=G.pstrikes.filter(s=>!s.done);
  // pending explosions (Explosive Seelen)
  const bl=G.booms; G.booms=[]; for(const b of bl){ explosion(b.x,b.y,b.r,b.dmg,b.barrel?'#ffb03a':'#ff8a3a',true,b.barrel?'barrel':(b.src||'boom'));
    if(b.barrel){ G.shake+=6; for(let i=0;i<10;i++) part(b.x,b.y,rand(-160,160),rand(-160,160),0.6,rand(2,4),'#6b4a2a'); if(Math.hypot(P.x-b.x,P.y-b.y)<b.r+P.r*0.5) hurtPlayer(10+3*run.act,null); } }
  G.obs=G.obs.filter(o=>!o.dead);
  updTraps(dt);
  updAmbient(dt); updWeather(dt); updCrowd(dt);
  unstick();
  G.enemies=G.enemies.filter(e=>!e.dead);
  updCoins(dt);
  for(const p of G.parts){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=1-p.drag*dt; p.vy*=1-p.drag*dt; p.vy+=p.grav*dt; }
  G.parts=G.parts.filter(p=>p.life>0); if(G.parts.length>450) G.parts.splice(0,G.parts.length-450);
  for(const t of G.texts){ if(t.vy===undefined){ t.vy=-125; t.vx=rand(-35,35); } t.t+=dt; t.x+=t.vx*dt; t.y+=t.vy*dt; t.vy+=260*dt; } G.texts=G.texts.filter(t=>t.t<0.8);
  for(const f of G.fx) f.t+=dt; G.fx=G.fx.filter(f=>f.t<f.life);
  G.shake=Math.max(0,G.shake-dt*30); G.hurtFlash=Math.max(0,G.hurtFlash-dt);
  if(G.cleared){ G.clearT+=dt; if((G.clearT>0.7 && G.coins.length===0) || G.clearT>2.2) finishCombat(); }
}

function updPlayer(dt){
  const p=P; const [mx,my]=readMove();
  if(p.chill>0){ p.chill-=dt; if(Math.random()<dt*10) part(p.x+rand(-10,10),p.y-8,0,-20,0.5,2.5,'#bfe6ff',true); }
  const sp=p.speed*p.spdMul*(1+0.03*(p.fury||0))*(p.spin>0?1.25:1)*(p.chill>0?0.6:1)*(G.webs.some(w=>Math.hypot(p.x-w.x,p.y-w.y)<w.r)?0.45:1);
  if(p.hornT>0) p.hornT-=dt;
  if(p.dashCd>0){ p.dashCd-=dt; if(p.dashCd<=0 && hasRelic('r_feather')){ p.dashChg=Math.min(2,(p.dashChg||0)+1); if(p.dashChg<2) p.dashCd=1.0*p.dashCdMul; } }
  if(p.dashI>0) p.dashI-=dt;
  if(p.dashBuf>0){ p.dashBuf-=dt; if(p.dashT<=0 && (hasRelic('r_feather')?(p.dashChg||0)>0:p.dashCd<=0)){ p.dashBuf=0; useDash(); } }
  if(p.skillBuf>0){ p.skillBuf-=dt; if(p.skillT<=0 || ((p.maxCharges||1)>1 && p.charges>0)){ p.skillBuf=0; useSkill(); } }
  if(p.dashT>0){ p.dashT-=dt; const ds=720;
    p.x=clamp(p.x+Math.cos(p.dashA)*ds*dt,p.r,AW-p.r); p.y=clamp(p.y+Math.sin(p.dashA)*ds*dt,p.r,AH-p.r);
    G.fx.push({type:'ghost',x:p.x,y:p.y,t:0,life:0.22,color:CHARS[p.cid].color}); onDashMove(dt); }
  else { p.x=clamp(p.x+mx*sp*dt,p.r,AW-p.r); p.y=clamp(p.y+my*sp*dt,p.r,AH-p.r); }
  p.vx=p.dashT>0?0:mx*sp; p.vy=p.dashT>0?0:my*sp;
  pushOut(p);
  p.moving=Math.hypot(mx,my)>0.1; if(p.moving){ p.anim+=dt*11; G.moved+=Math.hypot(mx,my)*sp*dt;
    if(p.dashT<=0){ p.stepT=(p.stepT||0)-dt; if(p.stepT<=0){ p.stepT=0.17; part(p.x+rand(-5,5),p.y+13,rand(-15,15),rand(-18,-4),0.45,2.5,actOf(run.act).dust); } } }
  if(p.hurtT>0)p.hurtT-=dt;
  if(p.kbx||p.kby){ p.x=clamp(p.x+p.kbx*dt,p.r,AW-p.r); p.y=clamp(p.y+p.kby*dt,p.r,AH-p.r); const kd=Math.min(1,dt*9); p.kbx-=p.kbx*kd; p.kby-=p.kby*kd; if(Math.abs(p.kbx)+Math.abs(p.kby)<3) p.kbx=p.kby=0; }
  if(p.inv>0)p.inv-=dt; if(p.swingT>0)p.swingT-=dt;
  if(p.skillT>0){ p.skillT-=dt*(p.adren&&p.hp<p.maxHp*0.35?3:1);
    if(p.skillT<=0 && (p.maxCharges||1)>1){ p.charges=Math.min(p.maxCharges,(p.charges||0)+1); if(p.charges<p.maxCharges) p.skillT=CHARS[p.cid].skill.cd*p.cdMul; } }
  if(p.echoT>0){ p.echoT-=dt; if(p.echoT<=0 && p.echoTgt && !p.echoTgt.dead && !G.over){ const t=p.echoTgt; p.echoTgt=null; p.atkCount++; attack(t); p.atkCount--; } }
  if(hasSyn('bulwark') && p.shieldLeft<(p.shield+(p.manaShield?1:0)) && G.time-(p.lastHurt||0)>8 && G.time-(p.lastBul||0)>8){ p.shieldLeft++; p.lastBul=G.time; G.fx.push({type:'ring',x:p.x,y:p.y,r:34,t:0,life:0.4,color:'#9fd8ff'}); G.texts.push({x:p.x,y:p.y-30,s:'Schutzrune',c:'#9fd8ff',t:0}); }
  if(G.decoy){ G.decoy.t-=dt; if(G.decoy.t<=0) G.decoy=null; }
  if(p.regen>0 && p.hp<p.maxHp){ p.hp=Math.min(p.maxHp,p.hp+p.regen*dt); }
  if(p.drain && !G.cleared && p.hp>1) p.hp=Math.max(1,p.hp-p.drain*dt);
  if(p.manaShield && p.shieldLeft<=0){ p.msT+=dt; if(p.msT>=10){ p.msT=0; p.shieldLeft=1; G.fx.push({type:'ring',x:p.x,y:p.y,r:34,t:0,life:0.4,color:'#7fb4ff'}); } }
  const c=CHARS[p.cid];
  heroPassives(p,dt);
  if(p.hp<p.maxHp*0.25 && !G.cleared){ p.hbT=(p.hbT||0)-dt; if(p.hbT<=0){ p.hbT=0.9; heartbeat(); } }
  const reach = (c.attack==='melee'||c.attack==='axe') ? p.range*p.area+26 : p.range*(c.attack==='bolt'?1:1)*Math.sqrt(p.area);
  const tgt=pickTarget(p, reach, c.attack!=='melee'&&c.attack!=='axe'&&c.attack!=='flask');
  p.tgtRef=tgt||null;
  if(tgt) p.face=angTo(p,tgt); else if(p.moving) p.face=Math.atan2(my,mx);
  p.atkT-=dt;
  if(p.atkT<=0 && tgt && p.spin<=0 && !p.leap){ attack(tgt);
    let sp=p.atkSpd*(p.rage&&p.hp<p.maxHp*0.5?1.4:1)*(1+0.06*(p.fury||0))*(hasSyn('gale')&&p.moving?1.2:1);
    if(p.hornT>0) sp*=1.3; if(hasEvo('j_snipe')) sp*=0.65; if(hasEvo('j_rapid')) sp*=1.6; if(hasEvo('a_big')) sp*=0.8;
    p.atkT=p.rate/sp; }
  // Wirbelwind
  if(p.spin>0){ p.spin-=dt; p.spinTick-=dt; p.face+=dt*18;
    if(p.spinTick<=0){ p.spinTick=0.16; const R=95*p.area; sfx('swing');
      for(const e of G.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<R+e.r) dealDamage(e,p.dmg*0.65,{src:'skill',kb:140,from:p}); }
      G.fx.push({type:'ring',x:p.x,y:p.y,r:R,t:0,life:0.2,color:'#cfe3ff'}); } }
  // Feuerkugeln
  if(p.orbit>0){ G.orbitA+=dt*3.2; const R=62*Math.sqrt(p.area);
    for(let i=0;i<p.orbit;i++){ const a=G.orbitA+i*TAU/p.orbit, ox=p.x+Math.cos(a)*R, oy=p.y+Math.sin(a)*R;
      if(Math.random()<0.5) part(ox,oy,rand(-20,20),rand(-20,20),0.3,3,'#ff9a3a',true);
      for(const e of G.enemies){ if(e.orbCd<=0 && Math.hypot(e.x-ox,e.y-oy)<e.r+11){ e.orbCd=0.45; dealDamage(e,p.dmg*0.55,{src:'orbit',kb:60,from:{x:ox,y:oy}}); if(hasSyn('frostfire')) e.freeze=Math.max(e.freeze,e.boss?0.2:0.6); if(hasSyn('inferno')) G.booms.push({x:ox,y:oy,r:44,dmg:p.dmg*0.45}); } } } }
}
const ZONE_COL={acid:'#8dff6a',fire:'#ff8a2a'};
const FLASK_COL={acid:'#8dff6a',fire:'#ff8a2a',frost:'#9fe6ff',boom:'#ffb03a',heal:'#ff7ab0'};
function heroPassives(p,dt){
  if(p.cid==='paladin'){ // Geweihter Boden
    if(!p.moving && p.dashT<=0) p.stillT=(p.stillT||0)+dt; else p.stillT=0;
    p.holy=p.stillT>(p.sanct?0.05:0.8)?Math.min(1,(p.holy||0)+dt*4):Math.max(0,(p.holy||0)-dt*3);
    if(p.holy>0.5){ p.holyTick=(p.holyTick||0)-dt; if(p.holyTick<=0){ p.holyTick=0.25; const R=(p.sanct?120:85)*Math.sqrt(p.area);
      p.hp=Math.min(p.maxHp,p.hp+(p.sanct?1:0.5));
      for(const e of G.enemies) if(!e.dead && !e.under && Math.hypot(e.x-p.x,e.y-p.y)<R+e.r) dealDamage(e,p.dmg*0.12,{src:'passive',noChain:true,noCrit:true,quiet:true}); } }
    if(p.ward>0){ p.ward-=dt;
      for(const pr of G.eproj){ if(pr.life>0 && Math.hypot(pr.x-p.x,pr.y-p.y)<72){ pr.life=0; const a=Math.atan2(pr.y-p.y,pr.x-p.x);
        G.pproj.push({type:'holy',src:'skill',x:pr.x,y:pr.y,vx:Math.cos(a)*480,vy:Math.sin(a)*480,r:7,dmg:p.dmg*1.5,life:0.8,pierce:1,hit:new Set()}); burst(pr.x,pr.y,6,'#ffe08a',120); } } } }
  else if(p.cid==='berserk'){
    if(p.furyT>0) p.furyT-=dt; else if(p.fury>0) p.fury=Math.max(0,p.fury-dt*4);
    if(p.leap){ const L=p.leap; L.t+=dt; const k=Math.min(1,L.t/L.T); p.x=L.x0+(L.x1-L.x0)*k; p.y=L.y0+(L.y1-L.y0)*k; p.inv=Math.max(p.inv,0.12); p.vx=p.vy=0;
      if(k>=1){ p.leap=null; const R=95*Math.sqrt(p.area); let hit=0;
        for(const e of G.enemies){ if(!e.dead && !e.under && Math.hypot(e.x-p.x,e.y-p.y)<R+e.r){ dealDamage(e,p.dmg*2,{src:'skill',kb:220,from:p,bleed:p.bleed}); e.stun=e.boss?0.3:1.1; hit++; } }
        if(hit){ p.fury=p.furyMax||10; p.furyT=p.frenzyLong?4:2; }
        G.fx.push({type:'shock',x:p.x,y:p.y,r:R*1.1,t:0,life:0.4,color:'#ff8a6a'}); G.fx.push({type:'ring',x:p.x,y:p.y,r:R,t:0,life:0.3,color:'#c8402a',fill:true});
        burst(p.x,p.y+8,22,'#8a7a6a',260); G.shake+=8; sfx('boom'); hitstop(0.05); } } }
  else if(p.cid==='alchi' && p.vortex){ const V=p.vortex; V.t+=dt;
    if(V.t>0){ V.tick-=dt;
      for(const e of G.enemies){ if(e.dead||e.boss||e.under) continue; const d=Math.hypot(V.x-e.x,V.y-e.y); if(d<V.R+e.r && d>6){ const pull=Math.min(d,170*dt); e.x+=(V.x-e.x)/d*pull; e.y+=(V.y-e.y)/d*pull; } }
      if(V.tick<=0){ V.tick=0.3; for(const e of G.enemies) if(!e.dead && Math.hypot(V.x-e.x,V.y-e.y)<V.R+e.r) dealDamage(e,p.dmg*0.3,{src:'skill',noChain:true,noCrit:true,quiet:true}); }
      if(V.t>=V.T){ explosion(V.x,V.y,V.R*0.8,p.dmg*3,'#8dff6a',false,'skill'); G.shake+=6; burst(V.x,V.y,30,'#c8ff8a',300); p.vortex=null; } } }
}
function flaskLand(pr){
  const p=P, k=pr.kind, A=Math.sqrt(p.area), B=1+0.3*(p.brew||0), x=pr.x2, y=pr.y2;
  sfx('hit'); burst(x,y,10,FLASK_COL[k],160); for(let i=0;i<5;i++) part(x,y,rand(-90,90),rand(-140,-40),0.5,2,'#e8f4f8',false,300);
  for(const e of G.enemies) if(!e.dead && !e.under && Math.hypot(e.x-x,e.y-y)<38*A+e.r) dealDamage(e,pr.dmg,{src:'atk',kb:60,from:{x,y}});
  const big=hasEvo('a_big')?2:1;
  if(hasEvo('a_volatile')) explosion(x,y,52*A,pr.dmg*0.6,'#ffb03a',false,'atk');
  if(k==='acid'||k==='fire'){ const L=3+(p.brew||0); G.pzones.push({x,y,r:44*A*B*big,life:L,max:L,dps:p.dmg*(k==='fire'?0.5:0.33),tick:0,kind:k});
    if(hasEvo('a_cluster')) for(let i=0;i<3;i++){ const ang=i/3*TAU+rand(0,1); G.pzones.push({x:clamp(x+Math.cos(ang)*60*A,20,AW-20),y:clamp(y+Math.sin(ang)*60*A,20,AH-20),r:24*A*B*big,life:L*0.8,max:L*0.8,dps:p.dmg*(k==='fire'?0.45:0.3),tick:0,kind:k}); } }
  else if(hasSyn('genius')) p.skillT=Math.max(0,p.skillT-1.5);
  else { G.texts.push({x,y:y-20,s:{frost:'Frost!',boom:'Bumm!',heal:'Heilung!'}[k],c:FLASK_COL[k],t:0});
    if(k==='frost'){ for(const e of G.enemies) if(!e.dead && Math.hypot(e.x-x,e.y-y)<85*A+e.r) e.freeze=e.boss?0.5:1.6; G.fx.push({type:'ring',x,y,r:85*A,t:0,life:0.4,color:'#9fe6ff',fill:true}); }
    else if(k==='boom'){ explosion(x,y,85*A,pr.dmg*1.6,'#ffb03a',false,'atk'); G.shake+=4; }
    else { const h=Math.round(p.maxHp*0.08); p.hp=Math.min(p.maxHp,p.hp+h); G.texts.push({x:p.x,y:p.y-30,s:'+'+h,c:'#7dff8a',t:0}); G.fx.push({type:'ring',x,y,r:60,t:0,life:0.4,color:'#ff7ab0',fill:true}); } }
}
// Zielwahl: nächster Gegner, aber Heiler und Totems werden bevorzugt, Schildträger von vorne gemieden
function pickTarget(p,maxD,needLos){
  let best=null,bs=1e9;
  for(const e of G.enemies){ if(e.dead||(e.alpha!==undefined&&e.alpha<0.3)||e.under) continue; const d=Math.hypot(e.x-p.x,e.y-p.y)-e.r; if(d>maxD) continue; if(needLos && !los(p,e)) continue;
    let s=d; if(e.ai==='healer'||e.kind==='totem'||e.kind==='shaman') s-=90; if(e.kind==='shield' && Math.abs(angDiff(Math.atan2(p.y-e.y,p.x-e.x),e.face))<1.1) s+=140; if(e.stone) s+=160;
    if(s<bs){ bs=s; best=e; } }
  return best;
}
function nearestEnemy(from,maxD,exclude,needLos){
  let best=null,bd=maxD;
  for(const e of G.enemies){ if(e.dead||e===exclude||(e.alpha!==undefined&&e.alpha<0.3)||e.under) continue; if(needLos && !los(from,e)) continue; const d=Math.hypot(e.x-from.x,e.y-from.y)-e.r; if(d<bd){bd=d;best=e;} }
  return best;
}

const hasEvo=id=>!!(run && run.evo && run.evo.includes(id));
function meleeSwing(p,a,R,arc,dmg,o){ let hitAny=false;
  for(const e of G.enemies){ const d=Math.hypot(e.x-p.x,e.y-p.y); if(d<R+e.r && !e.under && (arc>=TAU-0.01 || Math.abs(angDiff(Math.atan2(e.y-p.y,e.x-p.x),a))<arc/2+0.2)){ dealDamage(e,dmg,Object.assign({from:p,src:'atk'},o)); if(o.stun) e.stun=e.boss?0.25:o.stun; hitAny=true; } }
  for(const ob of G.obs){ if(ob.type==='barrel' && Math.hypot(ob.x-p.x,ob.y-p.y)<R+ob.r && (arc>=TAU-0.01 || Math.abs(angDiff(Math.atan2(ob.y-p.y,ob.x-p.x),a))<arc/2+0.2)) blowBarrel(ob); }
  return hitAny; }
function attack(tgt){
  const p=P, c=CHARS[p.cid], a=angTo(p,tgt);
  p.atkCount++;
  if(p.echo && p.atkCount%5===0){ p.echoT=0.14; p.echoTgt=tgt; }
  if(c.attack==='melee'){
    let R=p.range*p.area+12, arc=2.2, dm=p.dmg; p.swingT=0.18; sfx('swing');
    if(hasEvo('k_cleave')){ arc=TAU; dm*=0.85; } if(hasEvo('k_lunge')){ R*=1.6; arc=1.4; dm*=1.1; }
    const stun=hasEvo('k_stun') && p.atkCount%3===0 ? 0.8 : 0;
    for(let i=0;i<p.count;i++){
      const ang=a+i*TAU/p.count;
      const hitAny=meleeSwing(p,ang,R,arc,dm,{kb:170,stun});
      if(hitAny && p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+(hasSyn('kblood')&&p.hp<p.maxHp*0.5?3:1));
      G.fx.push({type:'slash',x:p.x,y:p.y,a:ang,r:R,t:0,life:0.2,arc:Math.min(arc,TAU)});
      if(stun) G.fx.push({type:'shock',x:p.x,y:p.y,r:R,t:0,life:0.25,color:'#ffe08a'});
      if(p.wave>0) G.pproj.push({type:'wave',x:p.x+Math.cos(ang)*20,y:p.y+Math.sin(ang)*20,vx:Math.cos(ang)*430,vy:Math.sin(ang)*430,r:16*p.area,dmg:p.dmg*(0.3+0.15*p.wave),life:0.5,pierce:99,hit:new Set()});
    }
  } else if(c.attack==='bolt'){
    sfx('zap');
    const tri=hasEvo('m_triple'), per=tri?3:1, frz=hasEvo('m_frost')&&p.atkCount%4===0;
    for(let i=0;i<p.count;i++) for(let j=0;j<per;j++){ const ang=a+(i-(p.count-1)/2)*0.32+(per>1?(j-1)*0.3:0);
      G.pproj.push({type:'bolt',x:p.x+Math.cos(ang)*14,y:p.y+Math.sin(ang)*14-6,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,sp:360,r:7,dmg:p.dmg*(tri?0.55:1),life:1.6,target:tgt,aoe:34*p.area*(hasEvo('m_nova')?2:1),pierce:0,split:p.split,hit:new Set(),frost:hasEvo('m_frost'),frz}); }
    if(p.meteor && p.atkCount%6===0) G.pstrikes.push({x:tgt.x,y:tgt.y,t:0,delay:0.55,r:80*p.area,dmg:p.dmg*3});
  } else if(c.attack==='skull'){
    sfx('skullthrow');
    const sw=hasEvo('n_swarm');
    for(let i=0;i<p.count;i++) for(let j=0;j<(sw?2:1);j++){ const ang=a+(i-(p.count-1)/2)*0.3+(sw?(j?0.25:-0.25):0);
      G.pproj.push({type:'skull',x:p.x+Math.cos(ang)*12,y:p.y-6,vx:Math.cos(ang)*300,vy:Math.sin(ang)*300,sp:300,r:sw?6:8,dmg:p.dmg*(sw?0.65:1),life:1.5,target:tgt,pierce:0,hit:new Set(),drain:hasEvo('n_drain')}); }
  } else if(c.attack==='hammer'){
    sfx('swing');
    const n=p.count+(hasEvo('p_twin')?1:0);
    for(let i=0;i<n;i++){ const ang=a+(i?(i%2?1:-1)*Math.ceil(i/2)*0.32:0), sp=440;   // erster Hammer immer genau aufs Ziel
      G.pproj.push({type:'hammer',x:p.x,y:p.y-4,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,sp,r:11,dmg:p.dmg*(p.hamDmg||1),life:4,pierce:999,hit:new Set(),out:p.range*Math.sqrt(p.area)/sp,back:false,spin:0}); }
  } else if(c.attack==='flask'){
    sfx('skullthrow');
    for(let i=0;i<p.count;i++){ p.flaskN=(p.flaskN||0)+1;
      const exp=p.flaskN%(p.expEvery||5)===0, kind=exp?pick(['frost','boom','heal']):(p.flaskN%2?'acid':'fire');
      const tx=clamp(tgt.x+(i?rand(-45,45):0),20,AW-20), ty=clamp(tgt.y+(i?rand(-45,45):0),20,AH-20), T=clamp(Math.hypot(tx-p.x,ty-p.y)/520,0.25,0.55);
      G.pproj.push({type:'flask',x:p.x,y:p.y-8,x0:p.x,y0:p.y-8,x2:tx,y2:ty,t:0,T,kind,r:0,dmg:p.dmg,life:T+0.05,pierce:0,hit:new Set(),vx:0,vy:0}); }
  } else if(c.attack==='axe'){
    const R=p.range*p.area+14, arc=hasEvo('b_whirl')?TAU:1.8; p.swingT=0.22; sfx('swing');
    for(let i=0;i<p.count;i++){ const ang=a+i*TAU/p.count;
      const hit=meleeSwing(p,ang,R,arc,p.dmg,{kb:130,bleed:p.bleed});
      if(hit){ p.fury=Math.min(p.furyMax||10,(p.fury||0)+1); p.furyT=p.frenzyLong?4:2; G.shake+=1.5; }
      G.fx.push({type:'slash',x:p.x,y:p.y,a:ang,r:R,t:0,life:0.24,arc:Math.min(arc,TAU),red:true}); }
    if(hasEvo('b_throw') && p.atkCount%3===0){ const t2=pickTarget(p,260,true); if(t2){ const aa=angTo(p,t2);
      G.pproj.push({type:'taxe',x:p.x,y:p.y-4,vx:Math.cos(aa)*520,vy:Math.sin(aa)*520,r:10,dmg:p.dmg*1.2,life:0.7,pierce:2,hit:new Set(),spin:0,bleed:p.bleed}); } }
  } else {
    sfx('twang');
    let dm=p.dmg, pr=p.pierce; const sc=hasEvo('j_scatter');
    if(hasEvo('j_snipe')){ dm*=1.8; pr=99; } if(hasEvo('j_rapid')) dm*=0.7; if(sc) dm*=0.6;
    for(let i=0;i<p.count;i++) for(let j=0;j<(sc?3:1);j++){ const ang=a+(i?(i%2?1:-1)*Math.ceil(i/2)*0.12:0)+(sc?(j-1)*0.2:0);
      G.pproj.push({type:'arrow',x:p.x,y:p.y-4,vx:Math.cos(ang)*640,vy:Math.sin(ang)*640,r:5,dmg:dm,life:0.75*Math.sqrt(p.area)+0.25*p.bounce,pierce:pr,bounce:p.bounce,poison:p.poison,hit:new Set(),gold:hasEvo('j_snipe')}); }
    if(p.volley && p.atkCount%4===0){ const k=hasSyn('arrowstorm')?4:2; for(let i=-k;i<=k;i++){ const ang=a+i*(k>2?0.14:0.22); G.pproj.push({type:'arrow',x:p.x,y:p.y-4,vx:Math.cos(ang)*600,vy:Math.sin(ang)*600,r:5,dmg:p.dmg*0.8,life:0.7,pierce:p.pierce,bounce:p.bounce,poison:p.poison,hit:new Set(),gold:true}); } }
  }
}

// Perfektes Ausweichen: wer im letzten Moment durch einen Angriff hechtet, wird belohnt (Zeitlupe, Ausweichen sofort wieder bereit)
function perfectDodge(){ const p=P; p.dashCd=0; if(hasRelic('r_feather')) p.dashChg=2; if(hasSyn('blooddance')){ p.hp=Math.min(p.maxHp,p.hp+8); G.texts.push({x:p.x,y:p.y-50,s:'+8',c:'#7dff8a',t:0}); } G.slowT=Math.max(G.slowT,0.22); p.perfT=0.6; G.stats_perf=(G.stats_perf||0)+1; run.perf=(run.perf||0)+1; save.stats.perfect=(save.stats.perfect||0)+1;
  G.texts.push({x:p.x,y:p.y-34,s:'Perfekt!',c:'#9fe6ff',big:true,t:0}); G.fx.push({type:'shock',x:p.x,y:p.y,r:70,t:0,life:0.35,color:'#9fe6ff'}); sfx('pick'); buzz(15); hype(0.05); }
function useDash(){
  if((runMod()||{}).noDash) return;
  if(state!=='combat'||!P||!G||G.over) return;
  const fe=hasRelic('r_feather');
  if(P.dashT>0 || (fe ? (P.dashChg||0)<=0 : P.dashCd>0)){ if(P.dashCd<0.25||P.dashT>0) P.dashBuf=0.25; return; }   // kurz vor Ablauf gedrückt: wird nachgeholt
  P.dashBuf=0; if(fe){ P.dashChg--; }
  if(G.rc && G.rc.id==='nodash' && !G.rc.failed){ G.rc.failed=true; rcFail(); }
  const [mx,my]=readMove();
  P.dashA = Math.hypot(mx,my)>0.2 ? Math.atan2(my,mx) : P.face;
  G.tutDash=true; if(P.mirror) G.decoy={x:P.x,y:P.y,t:2,face:P.face}; P.dashT=0.13; P.dashI=0.24; if(!fe || P.dashCd<=0) P.dashCd=1.0*P.dashCdMul; P.dashHit=[]; P.perfUsed=false;
  if(hasSyn('phantom')) P.nextCrit=true;
  sfx('dash'); burst(P.x,P.y+8,8,'#cfe3ff',90); G.fx.push({type:'dashline',x:P.x,y:P.y,a:P.dashA,t:0,life:0.3,color:CHARS[P.cid].color});
}
function onDashMove(dt){
  const p=P;
  if(p.dashDmg>0) for(const e of G.enemies){ if(!e.dead && !p.dashHit.includes(e) && Math.hypot(e.x-p.x,e.y-p.y)<p.r+e.r+8){ p.dashHit.push(e); dealDamage(e,p.dmg*p.dashDmg,{src:'dash',kb:340,from:p}); G.shake+=2; } }
  if(p.shadow>0){ p.trailT-=dt; if(p.trailT<=0){ p.trailT=0.05; G.pzones.push({x:p.x,y:p.y,r:24,life:1.4+0.5*p.shadow,max:1.4+0.5*p.shadow,dps:p.dmg*(0.5+0.3*p.shadow),tick:0}); } }
}
function raiseAlly(x,y,life){
  if(hasEvo('n_grave')) life*=2;
  G.allies.push({x,y,r:11,life,max:life,atkT:0.4,face:0,seed:rand(0,TAU),t:0}); G.fx.push({type:'rise',x,y,t:0,life:0.6});
  burst(x,y,14,'#5affd0',140);
}
function updAllies(dt){
  for(const a of G.allies){
    a.life-=dt; a.t+=dt; a.atkT-=dt;
    let best=null,bd=1e9; for(const e of G.enemies){ if(e.dead||e.under) continue; const d=Math.hypot(e.x-a.x,e.y-a.y)-e.r; if(d<bd){bd=d;best=e;} }
    if(best){ const ang=Math.atan2(best.y-a.y,best.x-a.x); a.face=ang;
      if(bd>a.r+4){ a.x+=Math.cos(ang)*125*dt; a.y+=Math.sin(ang)*125*dt; }
      else if(a.atkT<=0){ a.atkT=0.7; dealDamage(best,P.dmg*0.5*P.minionDmg,{src:'minion',noChain:true,kb:60,from:a}); } }
    else { const d=Math.hypot(P.x-a.x,P.y-a.y); if(d>60){ const ang=Math.atan2(P.y-a.y,P.x-a.x); a.x+=Math.cos(ang)*125*dt; a.y+=Math.sin(ang)*125*dt; } }
    pushOut(a);
  }
  for(const a of G.allies) if(a.life<=0) burst(a.x,a.y,10,'#e8e2d0',100);
  G.allies=G.allies.filter(a=>a.life>0);
}
const TUT_MSG=['Ziehe irgendwo auf dem Bildschirm, um dich zu bewegen.','Dein Held greift automatisch an. Besiege die Schleime!',
  'Tippe 💨 Ausweichen: ein schneller Hechtsprung, bei dem du kurz unverwundbar bist.','Tippe jetzt deine Fähigkeit unten rechts für einen Spezialangriff.','Sehr gut! Besiege die restlichen Gegner.'];
function updTut(dt){
  const T=G.tut; T.t+=dt;
  if(T.step===0 && G.moved>140){ T.step=1; T.t=0; }
  else if(T.step===1 && G.waveIdx>=0 && G.enemies.length===0 && G.spawnQ.length===0){ T.step=2; T.t=0; }
  else if(T.step===2 && G.tutDash){ T.step=3; T.t=0; }
  else if(T.step===3 && G.tutSkill){ T.step=4; T.t=0; }
  $('dashBtn').classList.toggle('hint',T.step===2); $('skillBtn').classList.toggle('hint',T.step===3);
}
function wrapLines(text,maxW){ const words=text.split(' '), lines=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(ctx.measureText(t).width>maxW && cur){ lines.push(cur); cur=w; } else cur=t; } if(cur) lines.push(cur); return lines; }
function drawTut(){
  const T=G.tut; if(!T||(T.step===4&&T.t>3.5)) return;
  ctx.font='700 16px "Alegreya Sans", sans-serif'; const maxW=Math.min(W-48,380), lines=wrapLines(TUT_MSG[T.step],maxW-28);
  const h=lines.length*22+22, y=96, a=Math.min(1,T.t*3);
  ctx.globalAlpha=a; ctx.fillStyle='rgba(18,14,22,0.88)'; ctx.strokeStyle='#e6b450'; ctx.lineWidth=2;
  ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(W/2-maxW/2,y,maxW,h,10); else ctx.rect(W/2-maxW/2,y,maxW,h); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#efe2c4'; ctx.textAlign='center'; ctx.textBaseline='middle'; lines.forEach((l,i)=>ctx.fillText(l,W/2,y+22+i*22)); ctx.globalAlpha=1;
}
/* Schutz gegen hängende Räume: Gegner, die lange unerreichbar sind, werden in die Nähe geholt */
function unstick(){
  for(const e of G.enemies) if(!isFinite(e.x)||!isFinite(e.y)){ e.x=AW/2; e.y=AH/2; e.kx=e.ky=0; }
  if(G.cleared||!G.enemies.length||G.time-G.lastProg<12) return;
  G.lastProg=G.time;
  for(const e of G.enemies){ if(e.boss||e.dead) continue;
    if(Math.hypot(e.x-P.x,e.y-P.y)>260 || !los(P,e)){
      let x,y,k=0; do{ const a=rand(0,TAU),d=rand(180,240); x=clamp(P.x+Math.cos(a)*d,40,AW-40); y=clamp(P.y+Math.sin(a)*d,40,AH-40); k++; }while((solidHit(x,y,e.r+4)||!los(P,{x,y}))&&k<20);
      burst(e.x,e.y,10,'#9a6aff',120); e.x=x; e.y=y; e.kx=e.ky=0; e.spawnT=0.45; if(e.kind==='worm'){ e.st=2; e.under=false; e.timer=3; } } }
}
function drawIndicators(cx,cy){
  const list=G.enemies.filter(e=>!e.dead).map(e=>({e,sx:(e.x-cx)*SCALE,sy:(e.y-cy)*SCALE})).filter(o=>o.sx<-10||o.sx>W+10||o.sy<-10||o.sy>H+10);
  if(!list.length) return;
  const few=G.enemies.length<=4, top=110, bot=H-150, mx=W/2, my=(top+bot)/2;
  list.sort((a,b)=>Math.hypot(a.sx-mx,a.sy-my)-Math.hypot(b.sx-mx,b.sy-my));
  for(const o of list.slice(0,8)){
    const a=Math.atan2(o.sy-my,o.sx-mx), dx=Math.cos(a), dy=Math.sin(a);
    const tx=dx?((dx>0?W-22:22)-mx)/dx:1e9, ty=dy?((dy>0?bot:top)-my)/dy:1e9, t=Math.min(tx,ty);
    const x=mx+dx*t, y=my+dy*t, col=o.e.boss||o.e.elite?'#e6b450':'#e0544a', pul=few?0.85+0.15*Math.sin(G.time*8):0.6;
    ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.globalAlpha=pul;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(0,0,13,0,TAU); ctx.fill();
    ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-5,-7); ctx.lineTo(-2,0); ctx.lineTo(-5,7); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.globalAlpha=1;
  }
}
function hitstop(t){ if(!G) return; G.stop=Math.max(G.stop,t); }
function useSkill(){
  if(state!=='combat'||!P||G.over||(runMod()||{}).noSkill) return;
  const p=P, c=CHARS[p.cid], mc=p.maxCharges||1;
  if(mc>1){ if(p.charges===undefined) p.charges=mc; if(p.charges<=0){ if(p.skillT<0.25) p.skillBuf=0.25; return; } p.charges--; if(p.skillT<=0) p.skillT=c.skill.cd*p.cdMul; }
  else { if(p.skillT>0){ if(p.skillT<0.25) p.skillBuf=0.25; return; } p.skillT=c.skill.cd*p.cdMul; }
  p.skillBuf=0;
  sfx('skill'); buzz(20); G.tutSkill=true;
  if(G.rc && G.rc.id==='noskill' && !G.rc.failed){ G.rc.failed=true; rcFail(); }
  if(p.cid==='krieger'){ p.spin=1.5; p.spinTick=0; G.fx.push({type:'shock',x:p.x,y:p.y,r:90,t:0,life:0.35,color:'#dbe8ff'}); burst(p.x,p.y+6,16,'#e8f0ff',220); }
  else if(p.cid==='nekro'){ for(let i=0;i<4;i++){ const a=i/4*TAU; raiseAlly(p.x+Math.cos(a)*34,p.y+Math.sin(a)*34,10); } G.fx.push({type:'summon',x:p.x,y:p.y,r:62,t:0,life:1.0}); G.fx.push({type:'ring',x:p.x,y:p.y,r:70,t:0,life:0.4,color:'#5affd0',fill:true}); }
  else if(p.cid==='paladin'){ p.ward=3; const h=Math.round(p.maxHp*0.10); p.hp=Math.min(p.maxHp,p.hp+h); G.texts.push({x:p.x,y:p.y-30,s:'+'+h,c:'#ffe08a',big:true,t:0});
    G.fx.push({type:'shock',x:p.x,y:p.y,r:110,t:0,life:0.4,color:'#ffe08a'}); burst(p.x,p.y,24,'#ffe08a',240); }
  else if(p.cid==='alchi'){ const t=nearestEnemy(p,420), tx=t?t.x:clamp(p.x+Math.cos(p.face)*160,40,AW-40), ty=t?t.y:clamp(p.y+Math.sin(p.face)*160,40,AH-40);
    p.vortex={x:tx,y:ty,x0:p.x,y0:p.y,t:-0.45,T:2.4,R:140*Math.sqrt(p.area),tick:0}; }
  else if(p.cid==='berserk'){ if(!p.frenzyLong) p.hp=Math.max(1,p.hp-p.maxHp*0.05);
    const t=nearestEnemy(p,380), tx=t?t.x:p.x+Math.cos(p.face)*150, ty=t?t.y:p.y+Math.sin(p.face)*150;
    p.leap={x0:p.x,y0:p.y,x1:clamp(tx,p.r,AW-p.r),y1:clamp(ty,p.r,AH-p.r),t:0,T:0.38}; burst(p.x,p.y+10,10,'#8a7a6a',140); }
  else if(p.cid==='magier'){ const R=170*p.area;
    for(const e of G.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<R+e.r){ dealDamage(e,p.dmg*2.2,{src:'skill',from:p,kb:120}); e.freeze=e.boss?0.7:2.4; } }
    G.fx.push({type:'nova',x:p.x,y:p.y,r:R,t:0,life:1.1,seed:Math.random()*TAU}); G.fx.push({type:'ring',x:p.x,y:p.y,r:R,t:0,life:0.45,color:'#9fe6ff',fill:true}); burst(p.x,p.y,40,'#bdf2ff',320); G.shake+=5;
  } else { const n=24;
    for(let i=0;i<n;i++){ const a=i/n*TAU; G.pproj.push({type:'arrow',src:'skill',x:p.x,y:p.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:5,dmg:p.dmg*1.6,life:0.9,pierce:3,bounce:p.bounce,poison:p.poison,hit:new Set(),gold:true}); }
    G.fx.push({type:'volley',x:p.x,y:p.y,r:90,t:0,life:0.45}); G.fx.push({type:'ring',x:p.x,y:p.y,r:60,t:0,life:0.25,color:'#e6ffb0'});
  }
}

function dealDamage(e,amount,o={}){
  if(e.dead||e.under||(e.alpha!==undefined&&e.alpha<0.3)) return;
  G.lastProg=G.time;
  let blocked=false;
  if(e.affix&&e.affix.includes('armor')) amount*=0.6;
  if(e.stone){ amount*=0.15; blocked=true; }
  if(e.kind==='shield' && o.from){ const ba=Math.atan2(o.from.y-e.y,o.from.x-e.x); if(Math.abs(angDiff(ba,e.face))<1.1){ amount*=0.25; blocked=true; } }
  let crit=!o.noCrit && (P.nextCrit || Math.random()<P.crit); if(crit && P.nextCrit) P.nextCrit=false;
  if(P.rage && P.hp<P.maxHp*0.5) amount*=1.25;
  if(P.momentum) amount*=1+Math.min(0.4,0.02*(G.combo||0));
  if(P.focus && !P.moving) amount*=1+P.focus;
  if(P.hornT>0) amount*=1.3;
  amount*=masteryMul(e.kind);
  let d=amount*(crit?P.critMul:1)*rand(0.9,1.1);
  if(crit && hasSyn('execute') && !e.boss && !e.elite && e.hp-d<e.maxHp*0.25 && e.hp-d>0){ d=e.hp+1; G.texts.push({x:e.x,y:e.y-e.r-16,s:'Hingerichtet!',c:'#ff6a5a',t:0}); }
  if(o.bleed){ e.bleedT=3; e.bleedDps=Math.max(e.bleedDps||0, amount*o.bleed/3); }
  if(o.poison){ e.poisonT=3; e.poisonDps=Math.max(e.poisonDps||0, amount*o.poison/3); }
  if(crit && hasSyn('bladestorm')) P.atkT-=P.rate/P.atkSpd*0.25;
  { const dealt=Math.max(0,Math.min(d,e.hp)), s=o.src||'atk'; run.dmgBy=run.dmgBy||{}; run.dmgBy[s]=(run.dmgBy[s]||0)+dealt; }
  e.hp-=d; e.flash=e.boss?0.04:0.09; sfx('hit');
  if(o.kb && !e.boss && o.from){ const a=Math.atan2(e.y-o.from.y,e.x-o.from.x), k=o.kb*(e.elite?0.4:1); e.kx+=Math.cos(a)*k; e.ky+=Math.sin(a)*k; }
  if(o.from && !o.noCrit && FX()){ const ha=Math.atan2(e.y-o.from.y,e.x-o.from.x);
    for(let i=0;i<(crit?6:3);i++){ const a2=ha+rand(-0.7,0.7), sp=rand(140,280); part(e.x-Math.cos(ha)*e.r*0.5,e.y-Math.sin(ha)*e.r*0.5,Math.cos(a2)*sp,Math.sin(a2)*sp,0.22,crit?2.6:2,crit?'#ffd34d':'#fff6e0',true); } }
  if(!o.quiet && !(save.settings.dmgOff&&!blocked) && (save.settings.dmgNums||blocked||crit)) G.texts.push({x:e.x+rand(-6,6),y:e.y-e.r-4,s:blocked?'Block':String(Math.round(d)),c:blocked?'#9fb3d9':(o.color||(crit?'#ffd34d':'#ffffff')),big:crit&&!blocked,t:0});
  if(blocked){ burst(e.x+Math.cos(e.face)*e.r,e.y+Math.sin(e.face)*e.r,3,'#ffe08a',90); }
  if(crit){ critSound(); if(G.stopCd<=0){ hitstop(0.03); G.stopCd=0.25; } }
  if(!o.noChain && P.chain>0 && Math.random()<0.12+0.06*P.chain) chainLightning(e, amount*0.7, 2+P.chain+(hasSyn('storm')?2:0));
  if(e.hp<=0){ const over=-e.hp; killEnemy(e);
    if(P.overkill && !o.noOver && over>2){ let best=null,bd=170; for(const o2 of G.enemies){ if(o2.dead||o2===e||o2.under) continue; const dd=Math.hypot(o2.x-e.x,o2.y-e.y); if(dd<bd){bd=dd;best=o2;} }
      if(best){ G.fx.push({type:'bolt',x:e.x,y:e.y,x2:best.x,y2:best.y,t:0,life:0.18}); dealDamage(best,over*0.8,{src:'overkill',noOver:true,noChain:true,noCrit:true,color:'#ffb0ff'}); } } }
}
function chainLightning(src,dmg,n){
  let cur=src; const hit=new Set([src]);
  for(let i=0;i<n;i++){
    let best=null,bd=170; for(const e of G.enemies){ if(e.dead||hit.has(e)) continue; const d=Math.hypot(e.x-cur.x,e.y-cur.y); if(d<bd){bd=d;best=e;} }
    if(!best) break; G.fx.push({type:'bolt',x:cur.x,y:cur.y,x2:best.x,y2:best.y,t:0,life:0.18}); hit.add(best);
    const nx=best.x, ny=best.y, cold=best.freeze>0||best.slow>0||(P.frost>0&&Math.hypot(P.x-nx,P.y-ny)<110+30*P.frost);
    dealDamage(best,dmg*(cold&&hasSyn('shatter')?2:1),{src:'chain',noChain:true,color:'#bfe6ff'}); cur={x:nx,y:ny};
  }
}
function explosion(x,y,r,dmg,color,fromBoom,src){
  G.fx.push({type:'ring',x,y,r,t:0,life:0.3,color,fill:true}); burst(x,y,16,color,200); sfx('boom'); G.shake+=2;
  for(const e of G.enemies){ if(!e.dead && Math.hypot(e.x-x,e.y-y)<r+e.r) dealDamage(e,dmg,{src:src||'boom',noChain:true,kb:120,from:{x,y}}); }
  for(const o of G.obs){ if(o.type==='barrel' && !o.dead && Math.hypot(o.x-x,o.y-y)<r+o.r) blowBarrel(o); }
}
// Hinweis beim ersten Auftauchen einer Gegnerart (Einstieg: Mechaniken erklären, wenn sie gebraucht werden)
function newFoeHint(k){ if(G.tut || !BEAST[k] || (save.seenFoes||{})[k]) return; save.seenFoes=save.seenFoes||{}; save.seenFoes[k]=1;
  toast(`<span style="font-size:26px">${BEAST[k].ic}</span><div><div class="eyebrow" style="color:var(--gold)">Neuer Gegner</div><b>${esc(ENEMIES[k].name)}</b><div class="sub" style="font-size:13px">${BEAST[k].ds}</div></div>`); }
function killEnemy(e){
  e.dead=true; if(!e.boss && !e.elite && G.stopCd<=0){ hitstop(0.018); G.stopCd=0.12; } if(e.boss) sfx('kill'); else deathSound(e.kind); if(e.elite) hitstop(0.09); if(e.boss) hitstop(0.35);
  burst(e.x,e.y,e.boss?80:12,enemyColor(e),e.boss?300:160);
  save.stats.beast[e.kind]=(save.stats.beast[e.kind]||0)+1;
  if(P && P.cid==='berserk' && !G.over){ P.hp=Math.min(P.maxHp,P.hp+P.maxHp*0.03); }
  if(e.kind==='shroom') G.ezones.push({x:e.x,y:e.y,r:80,life:4,max:4,dmg:e.dmg*0.6});
  if(e.boss){ hype(1); crowdSound(1.4); musicSting('win'); if(!save.stats.bosses.includes(e.kind)) save.stats.bosses.push(e.kind); if(!G.bossHit) save.stats.noHitBoss=true; G.shake=20; buzz(200); G.slowT=1.4; G.whiteFlash=0.5; for(let i=0;i<60;i++){ const a=rand(0,TAU),s=rand(100,420); part(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s,rand(0.8,1.6),rand(3,6),Math.random()<0.5?'#ffd34d':'#fff3b0',true,120); } for(let i=0;i<40;i++) dropCoin(e.x+rand(-40,40),e.y+rand(-40,40),2); run.souls+=25*run.act; run.bosses++;
    for(const o of G.enemies) if(!o.dead&&!o.boss){ o.dead=true; burst(o.x,o.y,8,enemyColor(o),120); }
    G.eproj=[]; G.hazards=[]; clearRoom(); return; }
  run.kills++; run.souls+=e.soul; save.stats.kills++; if(e.elite){ save.stats.elites++; run.elites=(run.elites||0)+1; }
  if(e.boss){ run.bossKills=(run.bossKills||[]); run.bossKills.push(e.kind); }
  if(e.champ){ G.champ=null; G.champKilled=true; if(!G.boss) $('bossBar').classList.add('hidden'); banner('Champion besiegt!',e.name,1600); hype(0.6); crowdSound(1); save.stats.champs=(save.stats.champs||0)+1; }
  if(e.elite && hasRelic('r_skull')){ P.maxHp+=3; P.hp+=3; G.texts.push({x:P.x,y:P.y-40,s:'+3 max. LP',c:'#e8e2d0',t:0}); }
  if(tierHas(10) && !e.boss && Math.random()<0.25) G.hazards.push({type:'circle',x:e.x,y:e.y,r:46,delay:0.9,t:0,dmg:e.dmg*0.8,color:'#b06aff'});
  if(G.time-G.comboLast<2.5) G.combo++; else G.combo=1;
  if(G.rc && G.rc.id==='combo' && !G.rc.done && G.combo>=15){ G.rc.done=true; G.texts.push({x:P.x,y:P.y-60,s:'Herausforderung geschafft!',c:'#9fe6a0',big:true,t:0}); sfx('pick'); } G.comboLast=G.time; save.stats.maxCombo=Math.max(save.stats.maxCombo,G.combo);
  if(G.combo>=10 && G.combo%10===0){ const bonus=G.combo; run.gold+=bonus; run.goldTotal+=bonus; hype(0.2); comboSound(G.combo); G.texts.push({x:P.x,y:P.y-44,s:G.combo+'er Kombo! +'+bonus+' Gold',c:'#ffd34d',big:true,t:0}); }
  hype(e.elite?0.35:0.035); if(e.elite){ crowdSound(0.6); crowdThrow(3,false); }
  G.fx.push({type:'corpse',e:Object.assign({},e,{flash:0,hp:e.maxHp,spawnT:0,freeze:0,poisonT:0}),t:0,life:0.42});
  part(e.x,e.y-e.r,rand(-10,10),-55,1,4,'#cfe6ff',true,-15);
  const g=Math.max(1,Math.round(e.gold*rand(0.8,1.3)*(e.elite&&hasRelic('r_crown')?3:1)));
  if(!(runMod()||{}).noGold) for(let i=0;i<Math.min(6,g);i++) dropCoin(e.x,e.y,Math.ceil(g/Math.min(6,g)));
  if(Math.random()<0.035) G.coins.push({x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-60,-20),v:0,heart:true,t:0});
  if(P.lifeOnKill) P.hp=Math.min(P.maxHp,P.hp+P.lifeOnKill);
  if(P.minions && !e.small && e.kind!=='mimic' && G.allies.length<P.minions && Math.random()<P.raise) raiseAlly(e.x,e.y,14);
  if(P.explode>0){ const py=hasSyn('pyre'); G.booms.push({x:e.x,y:e.y,r:(48+12*P.explode)*(py?1.4:1),dmg:P.dmg*(0.4+0.3*P.explode)}); if(py) G.pzones.push({x:e.x,y:e.y,r:42,life:2,max:2,dps:P.dmg*0.4,tick:0,kind:'fire',src:'boom'}); }
  if(hasSyn('fountain') && e.bleedT>0){ for(const o of G.enemies) if(!o.dead && o!==e && Math.hypot(o.x-e.x,o.y-e.y)<90){ o.bleedT=3; o.bleedDps=Math.max(o.bleedDps||0,e.bleedDps||0); } burst(e.x,e.y,14,'#c81a2a',180); }
  if(e.kind==='magma') G.traps.push({type:'lava',x:e.x,y:e.y,r:34,tick:0,id:800+Math.floor(rand(0,99999)),life:5});
  if(e.affix){
    if(e.affix.includes('boom')) G.hazards.push({type:'circle',x:e.x,y:e.y,r:75,delay:0.8,t:0,dmg:e.dmg*1.1,color:'#ff7a2a'});
    if(e.affix.includes('split')) for(let i=0;i<2;i++){ const s=makeEnemy(e.kind,e.x+rand(-10,10),e.y+rand(-10,10),false); s.spawnT=0; s.hp=s.maxHp=e.maxHp*0.35; s.r=e.r*0.75; s.gold=0; s.soul=1; s.kx=rand(-140,140); s.ky=rand(-140,140); if(s.kind==='worm'){ s.under=false; s.st=2; s.timer=2; } G.enemies.push(s); } }
  if(e.kind==='slime' && !e.small){
    for(let i=0;i<2;i++){ const s=makeEnemy('slime',e.x+rand(-8,8),e.y+rand(-8,8),false); s.small=true; s.spawnT=0; s.r=e.elite?13:9; s.hp=s.maxHp=e.maxHp*0.3; s.dmg*=0.7; s.speed*=1.2; s.gold=0; s.soul=0; s.kx=rand(-120,120); s.ky=rand(-120,120); G.enemies.push(s); }
  }
}
function dropCoin(x,y,v){ G.coins.push({x,y,vx:rand(-120,120),vy:rand(-120,120),v,t:0,z:0,vz:rand(150,240)}); }
function updCoins(dt){
  for(const c of G.coins){
    c.t+=dt; const d=Math.hypot(P.x-c.x,P.y-c.y);
    if((d<(P.magnet?280:90) || G.cleared) && c.t>0.35){ const a=Math.atan2(P.y-c.y,P.x-c.x), s=G.cleared?950:420; c.vx+=(Math.cos(a)*s-c.vx)*dt*8; c.vy+=(Math.sin(a)*s-c.vy)*dt*8; }
    else { c.vx*=1-dt*4; c.vy*=1-dt*4; }
    if(c.vz){ c.z+=c.vz*dt; c.vz-=800*dt; if(c.z<=0){ c.z=0; c.vz=Math.abs(c.vz)>60?-c.vz*0.45:0; } }
    c.x+=c.vx*dt; c.y+=c.vy*dt; c.x=clamp(c.x,6,AW-6); c.y=clamp(c.y,6,AH-6);
    if(d<P.r+10 && c.t>0.25){ c.done=true;
      if(c.heart){ const hh=tierHas(9)?8:15; P.hp=Math.min(P.maxHp,P.hp+hh); G.texts.push({x:P.x,y:P.y-24,s:'+'+hh,c:'#7dff8a',t:0}); sfx('pick'); }
      else { const v=Math.max(1,Math.round(c.v*P.goldMul)); run.gold+=v; run.goldTotal+=v; coinSound(); if(hasSyn('goldheart')) P.hp=Math.min(P.maxHp,P.hp+1); if(FX()) burst(c.x,c.y,3,'#ffe08a',70); } }
  }
  G.coins=G.coins.filter(c=>!c.done);
}

function enemyShoot(e,ang,speed,dmg,kind,r=6){ G.eproj.push({x:e.x+Math.cos(ang)*e.r,y:e.y+Math.sin(ang)*e.r,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,dmg,kind,r,life:4,src:e}); }

function updEnemy(e,dt){
  if(e.spawnT>0){ e.spawnT-=dt; e.t+=dt; return; }
  if(e.sumT!==undefined && !G.cleared){ e.sumT-=dt; if(e.sumT<=0){ e.sumT=7; for(let i=0;i<2;i++) G.spawnQ.push({x:clamp(e.x+rand(-60,60),30,AW-30),y:clamp(e.y+rand(-60,60),30,AH-30),t:0.5,kind:'bat'}); G.fx.push({type:'ring',x:e.x,y:e.y,r:40,t:0,life:0.4,color:'#9a5ab0'}); } }
  e.t+=dt; if(e.flash>0)e.flash-=dt; if(e.orbCd>0)e.orbCd-=dt;
  if(e.poisonT>0){ e.poisonT-=dt; e.poisonAcc=(e.poisonAcc||0)+e.poisonDps*dt;
    if(e.poisonAcc>=5||e.poisonT<=0){ const pa=e.poisonAcc; e.poisonAcc=0; if(e.poisonT<=0) e.poisonDps=0; dealDamage(e,pa,{src:'poison',noChain:true,noCrit:true,color:'#8dff6a'}); if(e.dead) return; }
    if(Math.random()<dt*6) part(e.x+rand(-0.6,0.6)*e.r,e.y-e.r*0.3,0,-30,0.5,3,'#8dff6a',true); }
  if(e.bleedT>0){ e.bleedT-=dt; e.bleedAcc=(e.bleedAcc||0)+e.bleedDps*dt;
    if(e.bleedAcc>=5||e.bleedT<=0){ const ba=e.bleedAcc; e.bleedAcc=0; if(e.bleedT<=0) e.bleedDps=0; dealDamage(e,ba,{src:'bleed',noChain:true,noCrit:true,color:'#ff5a5a'}); if(e.dead) return; }
    if(Math.random()<dt*8) part(e.x+rand(-0.5,0.5)*e.r,e.y,0,40,0.5,2.5,'#c81a2a'); }
  let sm=1; if(e.freeze>0){ e.freeze-=dt; sm=0; } else if(e.slow>0){ e.slow-=dt; sm=0.5; }
  if(e.stun>0){ e.stun-=dt; sm=0; }
  if(e.buffT>0){ e.buffT-=dt; sm*=1.35; }
  if(G.time<3 && !e.boss && hasRelic('r_hourglass')) sm*=0.4;
  const dp=Math.hypot(P.x-e.x,P.y-e.y), T=(G.decoy && !e.boss && Math.hypot(G.decoy.x-e.x,G.decoy.y-e.y)<420)?G.decoy:P;
  const d=T===P?dp:Math.hypot(T.x-e.x,T.y-e.y), a=Math.atan2(T.y-e.y,T.x-e.x);
  if(P.frost>0 && d<110+30*P.frost) sm*=1-Math.min(0.55,0.3*P.frost);
  if(G.over) sm*=0.3;
  let mx=0,my=0;
  if(e.boss){ updBoss(e,dt,sm,d,a); return; }
  if(e.ai!=='shield') e.face=a;
  switch(e.ai){
    case 'chase': mx=Math.cos(a); my=Math.sin(a); break;
    case 'hop': { const ph=(e.t*1.5+e.seed)%1; const k=ph<0.55?Math.sin(ph/0.55*Math.PI)*2:0; e.squish=k; mx=Math.cos(a)*k; my=Math.sin(a)*k; break; }
    case 'bat': { const w=Math.sin(e.t*4+e.seed)*1.1; mx=Math.cos(a+w); my=Math.sin(a+w); break; }
    case 'ranged': case 'caster': case 'imp': {
      const near=e.ai==='caster'?200:e.ai==='imp'?140:170, far=near+90;
      if(d<near){ mx=-Math.cos(a); my=-Math.sin(a); } else if(d>far){ mx=Math.cos(a); my=Math.sin(a); }
      else { mx=Math.cos(a+Math.PI/2)*e.dir*0.7; my=Math.sin(a+Math.PI/2)*e.dir*0.7; if(Math.random()<dt*0.4) e.dir*=-1; }
      if(e.ai==='imp'){ mx+=Math.cos(e.t*5)*0.4; my+=Math.sin(e.t*6)*0.4; }
      e.timer-=dt*sm;
      if(e.timer<=0 && d<460 && los(e,P)){ e.timer=e.fire*rand(0.85,1.2); e.st=0.3;
        if(e.ai==='ranged') enemyShoot(e,a,210,e.dmg,'arrow',5);
        else if(e.ai==='caster'){ for(let i=-1;i<=1;i++) enemyShoot(e,a+i*0.28,150,e.dmg,'orb',7); if(e.elite) for(let i=-1;i<=1;i+=2) enemyShoot(e,a+i*0.56,150,e.dmg,'orb',7); }
        else enemyShoot(e,a,240,e.dmg,'fire',7);
        if(e.elite && e.ai==='ranged'){ enemyShoot(e,a+0.2,210,e.dmg,'arrow',5); enemyShoot(e,a-0.2,210,e.dmg,'arrow',5); } }
      if(e.st>0) e.st-=dt;
      break; }
    case 'shield': { const tr=1.7*dt*sm; e.face+=clamp(angDiff(a,e.face),-tr,tr); mx=Math.cos(e.face)*0.9; my=Math.sin(e.face)*0.9; break; }
    case 'healer': {
      if(d<200){ mx=-Math.cos(a); my=-Math.sin(a); } else if(d>290){ mx=Math.cos(a); my=Math.sin(a); }
      else { mx=Math.cos(a+Math.PI/2)*e.dir*0.6; my=Math.sin(a+Math.PI/2)*e.dir*0.6; if(Math.random()<dt*0.4) e.dir*=-1; }
      e.timer-=dt*sm; if(e.st>0) e.st-=dt;
      if(e.timer<=0){ e.timer=3.2; e.st=0.5;
        for(const o of G.enemies){ if(o.dead||o.boss||o.hp>=o.maxHp||Math.hypot(o.x-e.x,o.y-e.y)>230||(o.healCd||0)>G.time) continue; o.healCd=G.time+3;
          o.hp=Math.min(o.maxHp,o.hp+o.maxHp*0.2); G.fx.push({type:'beam',x:e.x,y:e.y-10,x2:o.x,y2:o.y,t:0,life:0.4}); G.texts.push({x:o.x,y:o.y-o.r-8,s:'+',c:'#7dff8a',big:true,t:0}); } }
      break; }
    case 'burrow':
      if(e.st===0){ e.under=true; mx=Math.cos(a); my=Math.sin(a); e.timer-=dt*sm;
        if(Math.random()<dt*14) part(e.x+rand(-9,9),e.y+rand(-4,4),rand(-30,30),rand(-50,-10),0.5,3,'#7a5a3a');
        if(e.timer<=0||d<26){ e.st=1; e.timer=0.65; G.hazards.push({type:'circle',x:e.x,y:e.y,r:50,delay:0.65,t:0,dmg:e.dmg*1.2,color:'#a0703a'}); } }
      else if(e.st===1){ e.timer-=dt; if(e.timer<=0){ e.st=2; e.under=false; e.timer=2.8; burst(e.x,e.y,18,'#7a5a3a',190); G.shake+=3; } }
      else { mx=Math.cos(a)*0.3; my=Math.sin(a)*0.3; e.timer-=dt*sm; if(e.timer<=0){ e.st=0; e.under=true; e.timer=rand(2,3); burst(e.x,e.y,12,'#7a5a3a',140); } }
      break;
    case 'whelp': { const want=150, orbit=a+Math.PI/2*e.dir;
      if(d>want+40){ mx=Math.cos(a); my=Math.sin(a); } else if(d<want-40){ mx=-Math.cos(a); my=-Math.sin(a); } else { mx=Math.cos(orbit)*0.8; my=Math.sin(orbit)*0.8; }
      e.timer-=dt*sm; if(e.timer<=0 && d<240){ e.timer=rand(3,3.8); e.st=0.6; e.ca=a;
        G.hazards.push({type:'cone',x:e.x,y:e.y,a:a,spread:0.42,len:150,delay:0.6,t:0,dmg:e.dmg,color:'#ff7a2a',owner:e}); }
      if(e.st>0){ e.st-=dt; mx*=0.2; my*=0.2; e.face=e.ca; if(e.st<0.15) for(let i=0;i<2;i++){ const aa=e.ca+rand(-0.4,0.4),s=rand(180,300); part(e.x,e.y,Math.cos(aa)*s,Math.sin(aa)*s,0.5,rand(3,6),Math.random()<0.5?'#ffb03a':'#ff5a1a',true); } }
      break; }
    case 'magma': mx=Math.cos(a); my=Math.sin(a); e.timer-=dt*sm;
      if(e.timer<=0 && d<170){ e.timer=rand(4,5); e.st=0.8; G.hazards.push({type:'circle',x:e.x,y:e.y,r:85,delay:0.8,t:0,dmg:e.dmg,color:'#ff6a1a',owner:e}); }
      if(e.st>0){ e.st-=dt; mx=my=0; }
      if(Math.random()<dt*3) part(e.x+rand(-e.r,e.r)*0.6,e.y,0,-30,0.6,3,'#ff7a2a',true);
      break;
    case 'bomber':
      if(d<190){ mx=-Math.cos(a); my=-Math.sin(a); } else if(d>280){ mx=Math.cos(a); my=Math.sin(a); }
      else { mx=Math.cos(a+Math.PI/2)*e.dir*0.7; my=Math.sin(a+Math.PI/2)*e.dir*0.7; if(Math.random()<dt*0.5) e.dir*=-1; }
      e.timer-=dt*sm; if(e.timer<=0 && d<420){ e.timer=rand(2.6,3.2); const tx=clamp(P.x+P.vx*0.3,30,AW-30), ty=clamp(P.y+P.vy*0.3,30,AH-30);
        G.hazards.push({type:'circle',x:tx,y:ty,r:55,delay:1.1,t:0,dmg:e.dmg,color:'#ff8a3a'}); G.fx.push({type:'lob',x:e.x,y:e.y-8,x2:tx,y2:ty,t:0,life:1.1}); }
      break;
    case 'shroom': mx=Math.cos(a)*0.8; my=Math.sin(a)*0.8; e.timer-=dt*sm;
      if(e.timer<=0 && d<170){ e.timer=rand(3.5,4.5); e.st=0.5; G.ezones.push({x:e.x,y:e.y,r:56,life:3,max:3,dmg:e.dmg*0.6}); burst(e.x,e.y-6,12,'#9ad84a',120); }
      if(e.st>0){ e.st-=dt; mx=my=0; } break;
    case 'urchin':
      if(e.st===0){ mx=Math.cos(a)*1.2; my=Math.sin(a)*1.2; e.timer-=dt*sm; if(e.timer<=0){ e.st=1; e.stT=0.6; } }
      else { e.stT-=dt*sm; if(e.stT<=0){ const n=e.elite?12:8, o=rand(0,TAU); for(let i=0;i<n;i++) enemyShoot(e,o+i/n*TAU,190,e.dmg,'spike',5); e.st=0; e.timer=rand(1.6,2.4); } }
      break;
    case 'shaman':
      if(d<190){ mx=-Math.cos(a); my=-Math.sin(a); } else if(d>280){ mx=Math.cos(a); my=Math.sin(a); }
      else { mx=Math.cos(a+Math.PI/2)*e.dir*0.6; my=Math.sin(a+Math.PI/2)*e.dir*0.6; if(Math.random()<dt*0.4) e.dir*=-1; }
      e.timer-=dt*sm; if(e.st>0) e.st-=dt;
      if(e.timer<=0){ e.st=0.5;
        if(!G.enemies.some(o=>o.kind==='totem'&&o.owner===e&&!o.dead)){ e.timer=6; const t=makeEnemy('totem',clamp(e.x+rand(-40,40),30,AW-30),clamp(e.y+rand(-40,40),30,AH-30),false); t.owner=e; G.enemies.push(t); G.fx.push({type:'ring',x:t.x,y:t.y,r:50,t:0,life:0.4,color:'#ff7a3a'}); }
        else { e.timer=2.4; if(d<460 && los(e,P)) enemyShoot(e,a,170,e.dmg,'orb',6); } }
      break;
    case 'totem': for(const o of G.enemies) if(o!==e && !o.boss && o.kind!=='totem' && Math.hypot(o.x-e.x,o.y-e.y)<170) o.buffT=0.3; break;
    case 'pack': { const ga=P.face+Math.PI+Math.sin(e.seed*3)*1.3, tx=P.x+Math.cos(ga)*115, ty=P.y+Math.sin(ga)*115, td=Math.hypot(tx-e.x,ty-e.y);
      if(e.st===0){ if(td>8){ mx=(tx-e.x)/td; my=(ty-e.y)/td; } e.timer-=dt*sm; if(e.timer<=0 && d<220){ e.st=1; e.stT=0.35; e.ca=a; } }
      else if(e.st===1){ e.stT-=dt*sm; e.face=e.ca; if(e.stT<=0){ e.st=2; e.stT=0.32; } }
      else { e.face=e.ca; mx=Math.cos(e.ca)*3.4; my=Math.sin(e.ca)*3.4; e.stT-=dt; if(e.stT<=0){ e.st=0; e.timer=rand(2,3.2); } }
      break; }
    case 'wraith':
      if(e.st===0){ mx=Math.cos(a)*0.6; my=Math.sin(a)*0.6; e.alpha=Math.min(1,e.alpha+dt*3); e.timer-=dt*sm; if(e.timer<=0 && d<400){ e.st=1; e.stT=0.5; } }
      else if(e.st===1){ e.stT-=dt; e.alpha=Math.max(0.12,e.stT/0.5); if(e.stT<=0){ e.st=2; e.stT=0.9; } }
      else if(e.st===2){ e.alpha=0.12; e.stT-=dt; if(e.stT<=0){ const ba=P.face+Math.PI; e.x=clamp(P.x+Math.cos(ba)*58,e.r,AW-e.r); e.y=clamp(P.y+Math.sin(ba)*58,e.r,AH-e.r);
          e.st=3; e.stT=0.5; e.ca=Math.atan2(P.y-e.y,P.x-e.x); G.hazards.push({type:'cone',x:e.x,y:e.y,a:e.ca,spread:0.75,len:90,delay:0.5,t:0,dmg:e.dmg*1.3,color:'#b8c8ff'}); } }
      else { e.stT-=dt; e.alpha=Math.min(1,0.35+(0.5-e.stT)*1.4); e.face=e.ca; if(e.stT<=0){ e.st=0; e.timer=rand(2.6,3.6); } }
      if(e.st>0){ mx*=0; my*=0; }
      break;
    case 'garg':
      if(e.st===0){ e.stone=true; e.timer-=dt*sm; if(e.timer<=0 && d<520){ e.st=1; e.stT=0.4; e.stone=false; } }
      else if(e.st===1){ e.stT-=dt; e.lift=1-e.stT/0.4; e.alpha=Math.max(0.15,e.stT/0.4); if(e.stT<=0){ e.st=2; e.stT=0.9; e.tx=clamp(P.x,40,AW-40); e.ty=clamp(P.y,40,AH-40);
          G.hazards.push({type:'circle',x:e.tx,y:e.ty,r:62,delay:0.9,t:0,dmg:e.dmg*1.2,color:'#9aa0b0'}); } }
      else if(e.st===2){ e.stT-=dt; e.alpha=0.15; if(e.stT<=0){ e.x=e.tx; e.y=e.ty; e.st=3; e.stT=2.4; e.alpha=1; e.lift=0; burst(e.x,e.y+8,16,'#8a8f9a',200); } }
      else { mx=Math.cos(a)*0.8; my=Math.sin(a)*0.8; e.stT-=dt*sm; if(e.stT<=0){ e.st=0; e.timer=rand(1.8,2.6); } }
      break;
    case 'charger':
      if(e.st===0){ mx=Math.cos(a); my=Math.sin(a); e.timer-=dt*sm; if(e.timer<=0 && d<320){ e.st=1; e.stT=0.65; e.ca=a; } }
      else if(e.st===1){ e.stT-=dt*sm; e.face=e.ca; if(e.stT<=0){ e.st=2; e.stT=0.5; } }
      else { e.face=e.ca; mx=Math.cos(e.ca)*7.5; my=Math.sin(e.ca)*7.5; e.stT-=dt; if(Math.random()<0.6) part(e.x,e.y+e.r*0.6,rand(-20,20),rand(-20,20),0.4,4,'#8a7a6a');
        if(e.stT<=0||e.x<=e.r||e.x>=AW-e.r||e.y<=e.r||e.y>=AH-e.r){ e.st=0; e.timer=rand(2.8,4.2); } }
      break;
  }
  e.mv=(Math.abs(mx)+Math.abs(my))>0.1&&sm>0;
  e.x+=(mx*e.speed*sm+e.kx)*dt; e.y+=(my*e.speed*sm+e.ky)*dt;
  const kd=Math.min(1,dt*9);   e.kx-=e.kx*kd; e.ky-=e.ky*kd;
  e.x=clamp(e.x,e.r,AW-e.r); e.y=clamp(e.y,e.r,AH-e.r);
  if(!FLY[e.kind] && !e.under) pushOut(e,(e.seed>Math.PI?1:-1)*e.speed*sm*dt*0.8);
  if(dp<e.r+P.r-2 && sm>0 && !e.under && e.ai!=='totem' && !(e.alpha<0.3)) hurtPlayer(e.dmg*(e.buffT>0?1.25:1),e);
}

function updBoss(e,dt,sm,d,a){
  e.phase2 = e.hp<e.maxHp*(0.5+Math.min(0.2,0.05*(run.ng||0))+(tierHas(3)?0.1:0));
  if(e.phase2 && !e.enraged){ e.enraged=true; hype(0.4); crowdSound(0.8); banner('Der Boss wird wütend!','Neue Angriffe – schneller und gefährlicher',1800); hitstop(0.2); G.shake+=10; sfx('boss'); roar(e.kind); G.whiteFlash=0.35; for(const pr of G.eproj) burst(pr.x,pr.y,3,'#ffd0a0',60); G.eproj=[]; G.fx.push({type:'shock',x:e.x,y:e.y,r:e.r*4,t:0,life:0.6,color:'#ff5a3a'}); }
  const rage=e.phase2?1.35:1;
  e.timer-=dt*sm*rage;
  let mx=0,my=0;
  if(e.ai==='golem'){
    if(!e.cast){ mx=Math.cos(a); my=Math.sin(a); e.face=a;
      if(e.timer<=0){ e.cast=pick(e.phase2?['slam','rocks','slam','summon','quake']:['slam','rocks','slam']); e.castT=0;
        if(e.cast==='slam'){ const n=e.phase2?3:1; for(let i=0;i<n;i++) G.hazards.push({type:'circle',x:P.x+(i?rand(-90,90):0),y:P.y+(i?rand(-90,90):0),r:90,delay:1.1+i*0.25,t:0,dmg:e.dmg,color:'#ffb35a'}); }
        if(e.cast==='quake'){ for(let i=0;i<10;i++) G.hazards.push({type:'circle',x:rand(60,AW-60),y:rand(60,AH-60),r:70,delay:1.2+rand(0,0.6),t:0,dmg:e.dmg,color:'#ffb35a'}); }
        if(e.cast==='summon'){ for(let i=0;i<3;i++) G.spawnQ.push({x:clamp(e.x+rand(-120,120),30,AW-30),y:clamp(e.y+rand(-120,120),30,AH-30),t:0.8,kind:'skeleton'}); }
      } }
    else { e.castT+=dt*sm;
      if(e.cast==='rocks' && e.castT>0.5 && !e.fired){ e.fired=true; const n=e.phase2?16:11, o=rand(0,TAU); for(let i=0;i<n;i++) enemyShoot(e,o+i/n*TAU,180,e.dmg*0.6,'rock',10); G.shake+=6; sfx('boom'); }
      if(e.castT>1.2){ e.cast=null; e.fired=false; e.timer=rand(1.6,2.4); } }
  }
  else if(e.ai==='lich'){
    e.face=a;
    if(e.tele){ e.tele-=dt; e.alpha=Math.abs(e.tele-0.4)/0.4; if(e.tele<0.4 && !e.moved){ e.moved=true; let tries=0; do{ e.x=rand(80,AW-80); e.y=rand(80,AH-80); tries++; }while(Math.hypot(e.x-P.x,e.y-P.y)<260&&tries<20); burst(e.x,e.y,20,'#9effc0',160);} if(e.tele<=0){ e.tele=0; e.alpha=1; } }
    else if(!e.cast){
      if(d>200){ mx=Math.cos(a)*0.5; my=Math.sin(a)*0.5; } else { mx=-Math.cos(a)*0.6; my=-Math.sin(a)*0.6; }
      if(e.timer<=0){ e.cast=pick(e.phase2?['spiral','ring','summon','fan','tele','spiral']:['spiral','ring','fan','tele','summon']); e.castT=0; e.shotT=0;
        if(e.cast==='tele'){ e.tele=0.8; e.moved=false; e.cast=null; e.timer=0.9; }
        if(e.cast==='summon'){ for(let i=0;i<(e.phase2?4:3);i++) G.spawnQ.push({x:clamp(e.x+rand(-140,140),30,AW-30),y:clamp(e.y+rand(-140,140),30,AH-30),t:0.8,kind:Math.random()<0.5?'skeleton':'bat'}); }
      } }
    else { e.castT+=dt*sm; e.shotT-=dt*sm;
      if(e.cast==='spiral'){ if(e.shotT<=0){ e.shotT=e.phase2?0.08:0.11; e.spiral+=0.32; const arms=e.phase2?3:2; for(let i=0;i<arms;i++) enemyShoot(e,e.spiral+i*TAU/arms,150,e.dmg*0.55,'soul',7); } if(e.castT>2.6) endCast(e); }
      else if(e.cast==='ring'){ if(e.shotT<=0 && e.castT<1.4){ e.shotT=0.45; const n=20,o=rand(0,TAU); for(let i=0;i<n;i++) enemyShoot(e,o+i/n*TAU,130,e.dmg*0.6,'soul',8); } if(e.castT>1.6) endCast(e); }
      else if(e.cast==='fan'){ if(e.shotT<=0 && e.castT<1.5){ e.shotT=0.5; for(let i=-3;i<=3;i++) enemyShoot(e,a+i*0.16,230,e.dmg*0.6,'soul',7); } if(e.castT>1.7) endCast(e); }
      else endCast(e);
    }
  }
  else if(e.ai==='dragon'){
    if(!e.cast){ mx=Math.cos(a); my=Math.sin(a); e.face=a;
      if(e.timer<=0){ e.cast=pick(e.phase2?['breath','meteor','swoop','balls','breath']:['breath','balls','swoop','meteor']); e.castT=0; e.shotT=0;
        if(e.cast==='breath'){ e.ca=a; G.hazards.push({type:'cone',x:e.x,y:e.y,a:a,spread:0.55,len:330,delay:0.9,t:0,dmg:e.dmg*1.2,color:'#ff7a2a',owner:e}); }
        if(e.cast==='meteor'){ const n=e.phase2?9:6; for(let i=0;i<n;i++) G.hazards.push({type:'circle',x:clamp(P.x+rand(-160,160),40,AW-40),y:clamp(P.y+rand(-160,160),40,AH-40),r:62,delay:1.0+i*0.12,t:0,dmg:e.dmg,color:'#ff5a2a',meteor:true}); }
        if(e.cast==='swoop'){ e.ca=a; G.hazards.push({type:'line',x:e.x,y:e.y,a:a,len:520,w:e.r*1.6,delay:0.7,t:0,dmg:0,color:'#ff9a4a',visual:true}); }
      } }
    else { e.castT+=dt*sm; e.shotT-=dt*sm;
      if(e.cast==='breath'){ e.face=e.ca; if(e.castT>0.9 && e.castT<1.5){ for(let i=0;i<3;i++){ const aa=e.ca+rand(-0.5,0.5), s=rand(260,420); part(e.x+Math.cos(e.ca)*e.r,e.y+Math.sin(e.ca)*e.r,Math.cos(aa)*s,Math.sin(aa)*s,0.8,rand(5,9),Math.random()<0.5?'#ffb03a':'#ff5a1a',true);} } if(e.castT>1.6) endCast(e); }
      else if(e.cast==='balls'){ if(e.shotT<=0 && e.castT<1.6){ e.shotT=0.4; for(let i=-2;i<=2;i++) enemyShoot(e,a+i*0.22,220,e.dmg*0.6,'fire',9); } if(e.castT>1.8) endCast(e); }
      else if(e.cast==='swoop'){ e.face=e.ca; if(e.castT>0.7 && e.castT<1.25){ mx=Math.cos(e.ca)*9; my=Math.sin(e.ca)*9; if(Math.random()<0.8) part(e.x,e.y,rand(-30,30),rand(-30,30),0.5,6,'#ff8a3a',true); } if(e.castT>1.5) endCast(e); }
      else if(e.castT>1.3) endCast(e);
    }
  }

  else if(e.ai==='spider'){
    if(e.leap){ e.leapT+=dt; const k=Math.min(1,e.leapT/0.55); e.x=e.lx0+(e.lx1-e.lx0)*k; e.y=e.ly0+(e.ly1-e.ly0)*k; e.hgt=Math.sin(k*Math.PI)*60;
      if(k>=1){ e.leap=false; e.hgt=0; G.shake+=8; sfx('boom'); burst(e.x,e.y,22,'#6a5a4a',200); if(Math.hypot(P.x-e.x,P.y-e.y)<75+P.r) hurtPlayer(e.dmg*1.2,e); endCast(e); } }
    else if(!e.cast){ mx=Math.cos(a)*0.8; my=Math.sin(a)*0.8; e.face=a;
      if(e.timer<=0){ e.cast=pick(e.phase2?['leap','web','brood','leap','web']:['leap','web','brood']); e.castT=0; e.fired=0;
        if(e.cast==='leap'){ e.lx1=clamp(P.x,60,AW-60); e.ly1=clamp(P.y,60,AH-60); G.hazards.push({type:'circle',x:e.lx1,y:e.ly1,r:75,delay:0.9,t:0,dmg:0,color:'#c8a0ff',visual:true}); }
        if(e.cast==='brood') for(let i=0;i<(e.phase2?5:3);i++) G.spawnQ.push({x:clamp(e.x+rand(-90,90),30,AW-30),y:clamp(e.y+rand(-90,90),30,AH-30),t:0.5,kind:'spiderling'}); } }
    else { e.castT+=dt*sm;
      if(e.cast==='leap' && e.castT>0.9){ e.leap=true; e.leapT=0; e.lx0=e.x; e.ly0=e.y; }
      else if(e.cast==='web'){ if(e.castT>0.4 && e.fired<3){ e.fired++; const ang=a+(e.fired-2)*0.35; G.eproj.push({x:e.x,y:e.y,vx:Math.cos(ang)*210,vy:Math.sin(ang)*210,dmg:e.dmg*0.5,kind:'web',r:9,life:2.2}); e.castT=0.25; } if(e.fired>=3&&e.castT>0.6) endCast(e); }
      else if(e.cast==='brood' && e.castT>0.8) endCast(e); }
  }
  else if(e.ai==='vampire'){
    e.face=a;
    if(e.mist){ e.mistT-=dt; e.alpha=0.25; e.x=clamp(e.x+Math.cos(e.ma)*260*dt,60,AW-60); e.y=clamp(e.y+Math.sin(e.ma)*260*dt,60,AH-60);
      if(Math.random()<0.7) part(e.x+rand(-14,14),e.y+rand(-14,14),rand(-40,40),rand(-40,40),0.5,3,'#6a1020');
      if(e.mistT<=0){ e.mist=false; e.alpha=1; endCast(e); burst(e.x,e.y,22,'#8a1020',180); } }
    else if(!e.cast){ if(d>170){ mx=Math.cos(a)*0.7; my=Math.sin(a)*0.7; } else { mx=Math.cos(a+1.4)*0.8; my=Math.sin(a+1.4)*0.8; }
      if(e.timer<=0){ e.cast=pick(e.phase2?['mist','nova','lunge','rain','nova']:['mist','nova','lunge']); e.castT=0; e.fired=0;
        if(e.cast==='mist'){ e.mist=true; e.mistT=1.1; e.ma=rand(0,TAU); for(let i=0;i<3;i++) G.spawnQ.push({x:e.x,y:e.y,t:0.3+i*0.15,kind:'bat'}); }
        if(e.cast==='lunge'){ e.ca=a; G.hazards.push({type:'line',x:e.x,y:e.y,a:a,len:420,w:e.r*1.8,delay:0.7,t:0,dmg:0,color:'#ff4a5a',visual:true}); }
        if(e.cast==='rain') for(let i=0;i<7;i++) G.hazards.push({type:'circle',x:clamp(P.x+rand(-170,170),40,AW-40),y:clamp(P.y+rand(-170,170),40,AH-40),r:50,delay:1.0+i*0.1,t:0,dmg:e.dmg*0.8,color:'#c8202a'}); } }
    else { e.castT+=dt*sm;
      if(e.cast==='nova'){ if(e.castT>0.5 && e.fired<2){ e.fired++; e.castT=0.2; const n=16,o=rand(0,TAU); for(let i=0;i<n;i++) enemyShoot(e,o+i/n*TAU,150,e.dmg*0.55,'blood',7); } if(e.fired>=2&&e.castT>0.7) endCast(e); }
      else if(e.cast==='lunge'){ e.face=e.ca;
        if(e.castT>0.7&&e.castT<1.15){ mx=Math.cos(e.ca)*8; my=Math.sin(e.ca)*8; if(Math.random()<0.8) part(e.x,e.y,rand(-30,30),rand(-30,30),0.4,4,'#a01020');
          if(!e.drained && Math.hypot(P.x-e.x,P.y-e.y)<e.r+P.r && P.inv<=0 && P.dashI<=0){ e.drained=true; e.hp=Math.min(e.maxHp,e.hp+e.maxHp*0.04); G.texts.push({x:e.x,y:e.y-e.r-10,s:'+Blut',c:'#ff4a5a',big:true,t:0}); } }
        if(e.castT>1.4){ e.drained=false; endCast(e); } }
      else if(e.castT>1.2) endCast(e); }
  }
  else if(e.ai==='lavaworm'){
    e.wt-=dt*sm*rage;
    if(e.st===0){ e.under=true; mx=Math.cos(a); my=Math.sin(a);
      if(Math.random()<0.8) part(e.x+rand(-14,14),e.y+rand(-6,6),rand(-30,30),rand(-60,-20),0.6,4,Math.random()<0.5?'#ff7a1a':'#4a2a1a',Math.random()<0.5);
      if(e.wt<=0||d<30){ e.st=1; e.wt=1.0; G.hazards.push({type:'circle',x:e.x,y:e.y,r:85,delay:1.0,t:0,dmg:e.dmg*1.3,color:'#ff6a1a'}); } }
    else if(e.st===1){ if(e.wt<=0){ e.st=2; e.under=false; e.wt=4.0; e.fireT=0.6; burst(e.x,e.y,30,'#ff7a1a',240); G.shake+=10; sfx('boom');
        G.traps.push({type:'lava',x:e.x,y:e.y,r:44,tick:0,id:900+Math.floor(rand(0,99999)),life:8});
        if(e.phase2) for(let i=0;i<2;i++) G.spawnQ.push({x:clamp(e.x+rand(-120,120),30,AW-30),y:clamp(e.y+rand(-120,120),30,AH-30),t:0.6,kind:'imp'}); } }
    else { e.face=a; e.fireT-=dt*sm; if(e.fireT<=0){ e.fireT=e.phase2?0.7:0.95; for(let i=-2;i<=2;i++) enemyShoot(e,a+i*0.24,210,e.dmg*0.55,'fire',9); }
      if(e.wt<=0){ e.st=0; e.under=true; e.wt=e.phase2?1.1:1.5; burst(e.x,e.y,18,'#5a3a2a',160); } }
  }
  e.x+=(mx*e.speed*sm)*dt; e.y+=(my*e.speed*sm)*dt;
  e.x=clamp(e.x,e.r,AW-e.r); e.y=clamp(e.y,e.r,AH-e.r);
  if(!FLY[e.kind]&&!e.under&&!e.leap) pushOut(e,e.speed*dt*0.5);
  if(d<e.r+P.r-4 && !e.under && !e.leap && (e.alpha===undefined||e.alpha>0.5)) hurtPlayer(e.dmg,e);
}
function endCast(e){ e.cast=null; e.timer=rand(1.3,2.2); }

function separate(){
  const E=G.enemies;
  for(let i=0;i<E.length;i++) for(let j=i+1;j<E.length;j++){
    const a=E[i],b=E[j]; if(a.under||b.under) continue; const dx=b.x-a.x, dy=b.y-a.y, rr=a.r+b.r, d2=dx*dx+dy*dy;
    if(d2<rr*rr && d2>0.01){ const d=Math.sqrt(d2), o=(rr-d)/2, nx=dx/d, ny=dy/d;
      const wa=a.boss?0:1, wb=b.boss?0:1, s=wa+wb||1;
      a.x-=nx*o*2*wa/s; a.y-=ny*o*2*wa/s; b.x+=nx*o*2*wb/s; b.y+=ny*o*2*wb/s; }
  }
}

function updProjectiles(dt){
  for(const pr of G.pproj){
    if(pr.type==='flask'){ pr.t+=dt; const k=Math.min(1,pr.t/pr.T); pr.x=pr.x0+(pr.x2-pr.x0)*k; pr.y=pr.y0+(pr.y2-pr.y0)*k; pr.h=Math.sin(k*Math.PI)*(40+pr.T*90);
      if(k>=1){ pr.life=0; flaskLand(pr); } continue; }
    pr.life-=dt;
    if(pr.type==='taxe') pr.spin+=dt*26;
    if(pr.type==='hammer'){ pr.spin+=dt*22; pr.out-=dt;
      if(!pr.back && pr.out<=0){ if(hasEvo('p_hover') && !pr.hovered){ pr.hovered=true; pr.hoverT=0.8; pr.vx=pr.vy=0; } else if(!pr.hoverT || pr.hoverT<=0){ pr.back=true; pr.hit.clear(); } }
      if(pr.hoverT>0){ pr.hoverT-=dt; pr.vx=pr.vy=0; pr.hcl=(pr.hcl||0)-dt; if(pr.hcl<=0){ pr.hcl=0.25; pr.hit.clear(); } if(pr.hoverT<=0){ pr.back=true; pr.hit.clear(); } }
      if(pr.back){ const ang=Math.atan2(P.y-pr.y,P.x-pr.x), s=pr.sp*1.2; pr.vx=Math.cos(ang)*s; pr.vy=Math.sin(ang)*s; if(Math.hypot(P.x-pr.x,P.y-pr.y)<20){ pr.life=0; continue; } } }
    if(pr.type==='bolt'||pr.type==='skull'){
      if(pr.target && !pr.target.dead && !pr.target.under){ const want=Math.atan2(pr.target.y-pr.y,pr.target.x-pr.x), cur=Math.atan2(pr.vy,pr.vx), na=cur+clamp(angDiff(want,cur),-(pr.type==='bolt'?7:4)*dt,(pr.type==='bolt'?7:4)*dt); pr.vx=Math.cos(na)*pr.sp; pr.vy=Math.sin(na)*pr.sp; }
      else pr.target=nearestEnemy(pr,250);
      if(Math.random()<0.7) part(pr.x,pr.y,rand(-15,15),rand(-15,15),0.3,3,pr.type==='bolt'?'#c58cff':'#5affd0',true);
    }
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt;
    if(pr.x<0||pr.y<0||pr.x>AW||pr.y>AH){
      if(pr.type==='hammer'){ pr.back=true; pr.x=clamp(pr.x,0,AW); pr.y=clamp(pr.y,0,AH); }
      else if(pr.bounce>0){ pr.bounce--; if(pr.x<0||pr.x>AW) pr.vx=-pr.vx; if(pr.y<0||pr.y>AH) pr.vy=-pr.vy; pr.x=clamp(pr.x,0,AW); pr.y=clamp(pr.y,0,AH); pr.hit.clear(); pr.life=Math.max(pr.life,0.35); burst(pr.x,pr.y,4,'#ffe08a',80); }
      else pr.life=0; }
    if(pr.life<=0) continue;
    { const o=solidHit(pr.x,pr.y,Math.min(pr.r,5)); if(o){ if(o.type==='barrel') blowBarrel(o);
        if(pr.type==='hammer'){ if(!pr.back){ pr.back=true; pr.hit.clear(); burst(pr.x,pr.y,4,'#ffe08a',80); } }
        else if(pr.type!=='wave'){ pr.life=0; burst(pr.x,pr.y,5,pr.type==='bolt'?'#c58cff':'#b8b0a0',90); continue; } } }
    for(const e of G.enemies){
      if(e.dead||e.under||pr.hit.has(e)||(e.alpha!==undefined&&e.alpha<0.3)) continue;
      if(Math.hypot(e.x-pr.x,e.y-pr.y)<e.r+pr.r){
        if(pr.type==='bolt'){ pr.life=0; G.fx.push({type:'ring',x:pr.x,y:pr.y,r:pr.aoe,t:0,life:0.22,color:'#c58cff',fill:true}); burst(pr.x,pr.y,8,'#d9b3ff',140);
          for(const o of G.enemies){ if(!o.dead && Math.hypot(o.x-pr.x,o.y-pr.y)<pr.aoe+o.r){ dealDamage(o, o===e?pr.dmg:pr.dmg*0.4,{src:pr.src||'atk',kb:80,from:pr}); if(pr.frost) o.slow=Math.max(o.slow,1.5); if(pr.frz) o.freeze=Math.max(o.freeze,o.boss?0.3:1.2); } }
          if(pr.split){ const n=2+pr.split, o0=rand(0,TAU); for(let i=0;i<n;i++){ const sa=o0+i/n*TAU; G.pproj.push({type:'spark',x:pr.x,y:pr.y,vx:Math.cos(sa)*380,vy:Math.sin(sa)*380,r:4,dmg:pr.dmg*0.35,life:0.4,pierce:0,hit:new Set([e])}); } }
          break; }
        if(pr.type==='hammer' && pr.back && P.judg) e.stun=e.boss?0.2:0.6;
        if(pr.type==='hammer' && pr.back && hasSyn('thunder') && !pr.thundered){ pr.thundered=true; chainLightning(e,pr.dmg*0.6,3); }
        if((pr.type==='hammer'&&hasEvo('p_light')) || (pr.type==='skull'&&pr.drain)) P.hp=Math.min(P.maxHp,P.hp+1);
        pr.hit.add(e); dealDamage(e,pr.dmg,{src:pr.src||({wave:'wave',spark:'split',taxe:'evo',holy:'skill'}[pr.type])||'atk',kb:pr.type==='wave'?120:pr.type==='hammer'?150:70,from:{x:pr.x-(pr.vx||0)*0.05,y:pr.y-(pr.vy||0)*0.05},poison:pr.poison,bleed:pr.bleed}); pr.pierce--; if(pr.pierce<0){ pr.life=0; break; }
      }
    }
  }
  G.pproj=G.pproj.filter(p=>p.life>0);
  const bw=hasSyn('bonewall')&&G.allies.length;
  for(const pr of G.eproj){
    if(pr.life<=0) continue;
    pr.life-=dt;
    if(bw){ let blk=false; for(const a of G.allies) if(Math.hypot(a.x-pr.x,a.y-pr.y)<a.r+pr.r){ blk=true; break; } if(blk){ pr.life=0; burst(pr.x,pr.y,5,'#e8e2d0',90); continue; } } pr.x+=pr.vx*dt; pr.y+=pr.vy*dt;
    if(pr.kind==='fire' && Math.random()<0.6) part(pr.x,pr.y,rand(-20,20),rand(-20,20),0.35,4,'#ff8a2a',true);
    if(pr.kind==='soul' && Math.random()<0.3) part(pr.x,pr.y,0,0,0.3,3,'#7dffb0',true);
    if(pr.x<-10||pr.y<-10||pr.x>AW+10||pr.y>AH+10) pr.life=0;
    { const o=solidHit(pr.x,pr.y,pr.r*0.6); if(o){ if(o.type==='barrel') blowBarrel(o); pr.life=0; burst(pr.x,pr.y,4,'#b8b0a0',70); continue; } }
    if(Math.hypot(P.x-pr.x,P.y-pr.y)<P.r*0.7+pr.r*0.85 && !G.over && hasRelic('r_mirror') && P.dashI<=0 && Math.random()<0.25){ pr.life=0; const a=Math.atan2(-pr.vy,-pr.vx);
      G.pproj.push({type:'holy',x:pr.x,y:pr.y,vx:Math.cos(a)*480,vy:Math.sin(a)*480,r:7,dmg:P.dmg*1.2,life:0.9,pierce:1,hit:new Set(),src:'r_mirror'}); G.texts.push({x:P.x,y:P.y-30,s:'Gespiegelt!',c:'#bfe6ff',t:0}); burst(pr.x,pr.y,6,'#bfe6ff',120); continue; }
    if(Math.hypot(P.x-pr.x,P.y-pr.y)<P.r*0.7+pr.r*0.85 && !G.over){ pr.life=0; hurtPlayer(pr.dmg,null,pr.src); burst(pr.x,pr.y,6,'#ffffff',90); }
  }
  for(const p of G.eproj) if(p.life<=0&&p.kind==='web') G.webs.push({x:p.x,y:p.y,r:48,life:7});
  G.eproj=G.eproj.filter(p=>p.life>0);
  for(const w of G.webs) w.life-=dt; G.webs=G.webs.filter(w=>w.life>0);
}

function updHazards(dt){
  for(const h of G.hazards){
    if(!h.cued){ h.cued=true; if(h.delay>=0.5 && !h.visual && G.type==='boss') warnSound(); }
    h.t+=dt; if(h.owner && h.type==='cone'){ h.x=h.owner.x; h.y=h.owner.y; }
    if(h.t>=h.delay){ h.done=true; if(h.visual) continue;
      if(h.type==='circle'){ if(Math.hypot(P.x-h.x,P.y-h.y)<h.r+P.r*0.6) hurtPlayer(h.dmg,null);
        burst(h.x,h.y,h.meteor?22:16,h.color,220); G.fx.push({type:'ring',x:h.x,y:h.y,r:h.r,t:0,life:0.3,color:h.color,fill:true}); G.shake+=h.meteor?3:5; sfx('boom'); if(h.storm) stormStrike(h); }
      else if(h.type==='cone'){ const d=Math.hypot(P.x-h.x,P.y-h.y), ang=Math.atan2(P.y-h.y,P.x-h.x); if(d<h.len && Math.abs(angDiff(ang,h.a))<h.spread) hurtPlayer(h.dmg,null); }
    }
  }
  G.hazards=G.hazards.filter(h=>!h.done);
}

function updTraps(dt){
  const sc=1+0.4*(run.act-1);
  for(const t of G.traps) if(t.life!==undefined){ t.life-=dt; if(t.life<=0) t.gone=true; }
  G.traps=G.traps.filter(t=>!t.gone);
  for(const t of G.traps){
    if(t.type==='spikes'){ t.t+=dt; const c=t.t%2.8, cyc=Math.floor(t.t/2.8);
      if(c>2.1){ if(Math.hypot(P.x-t.x,P.y-t.y)<t.r+P.r*0.4) hurtPlayer(7+4*run.act,null);
        for(const e of G.enemies){ if(e.boss||FLY[e.kind]||e.dead||e['sp'+t.id]===cyc) continue;
          if(Math.hypot(e.x-t.x,e.y-t.y)<t.r+e.r*0.4){ e['sp'+t.id]=cyc; dealDamage(e,30*sc,{src:'trap',noChain:true,noCrit:true,color:'#ffb35a'}); } } } }
    else if(t.type==='lava'){ t.tick-=dt;
      if(Math.random()<dt*4) part(t.x+rand(-t.r,t.r)*0.6,t.y+rand(-t.r,t.r)*0.5,0,-25,0.7,3,'#ffb03a',true);
      if(t.tick<=0){ t.tick=0.5; if(Math.hypot(P.x-t.x,P.y-t.y)<t.r) hurtPlayer(5+2*run.act,null);
        for(const e of G.enemies){ if(!e.boss && !FLY[e.kind] && !e.dead && Math.hypot(e.x-t.x,e.y-t.y)<t.r) dealDamage(e,10*sc,{src:'trap',noChain:true,noCrit:true,color:'#ff8a3a'}); } } }
  }
}
// Hilfemodus (wie der Gottmodus in Hades): 20 % weniger Schaden, +2 % je Niederlage, höchstens 80 %
const assistMul=()=>save.settings.assist?1-Math.min(0.8,0.2+0.02*(save.assistN||0)):1;
function hurtPlayer(dmg,src,via){
  const p=P; if(p.dashI>0 && !G.over && !G.cleared && !p.perfUsed){ p.perfUsed=true; perfectDodge(); return; }
  if(p.inv>0||p.dashI>0||G.over||G.cleared) return;
  p.lastHurt=G.time;
  if(p.shieldLeft>0){ p.shieldLeft--; p.inv=0.7; G.fx.push({type:'ring',x:p.x,y:p.y,r:30,t:0,life:0.35,color:'#7fd4ff'}); G.texts.push({x:p.x,y:p.y-26,s:'Geblockt',c:'#7fd4ff',t:0}); sfx('pick'); return; }
  const d=Math.max(1,Math.round((dmg*(p.dmgTaken||1)-p.armor-(p.boneArmor?G.allies.length:0))*(p.spin>0?0.5:1)*(p.ward>0?0.5:1)*assistMul()));
  hype(-0.06); G.combo=0; if(G.type==='boss') G.bossHit=true; p.hurtT=0.25;
  if(src){ const ka=Math.atan2(p.y-src.y,p.x-src.x); p.kbx=Math.cos(ka)*260; p.kby=Math.sin(ka)*260; }
  { const at=src&&src.affix?src:(via&&via.affix?via:null);
    if(at){ if(at.affix.includes('vamp')&&!at.dead){ at.hp=Math.min(at.maxHp,at.hp+at.maxHp*0.15); G.texts.push({x:at.x,y:at.y-at.r-10,s:'+Blut',c:'#ff4a5a',t:0}); }
      if(at.affix.includes('frost')){ p.chill=2; G.texts.push({x:p.x,y:p.y-40,s:'Verlangsamt',c:'#bfe6ff',t:0}); } } }
  if(G.rc && G.rc.id==='nohit' && !G.rc.failed){ G.rc.failed=true; rcFail(); }
  if(p.vengeance){ explosion(p.x,p.y,95*Math.sqrt(p.area),p.dmg*p.vengeance,'#ff7a5a',false,'vengeance'); }
  p.hp-=d; p.inv=0.75; G.shake=Math.min(14,G.shake+7); G.hurtFlash=0.3; sfx('hurt'); buzz(40); hitstop(0.06);
  G.texts.push({x:p.x,y:p.y-26,s:'-'+d,c:'#ff5a4a',big:true,t:0});
  if(src && p.thorns>0 && !src.dead){ dealDamage(src,p.thorns,{src:'thorns',noChain:true}); if(hasSyn('vampthorn')) p.hp=Math.min(p.maxHp,p.hp+5); }
  if(p.hp<=0 && p.undying && !G.undyUsed){ G.undyUsed=true; p.hp=1; p.inv=2; G.texts.push({x:p.x,y:p.y-40,s:'Unbeugsam!',c:'#ff5a4a',big:true,t:0}); burst(p.x,p.y,30,'#c8402a',220); }
  if(p.hp<=0){
    if(p.revive>0){ p.revive--; run.upg.phoenix=Math.max(0,(run.upg.phoenix||1)-1); if(!run.upg.phoenix) delete run.upg.phoenix; p.hp=Math.ceil(p.maxHp*0.5); p.inv=2.5; burst(p.x,p.y,50,'#ffb84a',260); banner('Phönixfeder!','Du erhebst dich erneut'); }
    else { p.hp=0; G.over=true; G.deathT=0; run.room=null; save.run=null; run.killer=(src&&src.kind)||(via&&via.kind)||(G.boss&&G.boss.kind)||null; if(save.settings.assist) save.assistN=(save.assistN||0)+1; if(save.settings.assist) run.assist=true; wakeLock(false); banner('Gefallen'); musicSting('lose'); burst(p.x,p.y,40,'#c8423a',200); buzz(300); setTimeout(()=>{ if(G&&G.over) endRun(!!(run&&run.won)); },1600); }
  }
}

function rcFail(){ G.texts.push({x:P.x,y:P.y-60,s:'Herausforderung verfehlt',c:'#ff8a80',t:0}); }
// Belohnung einer bestandenen Raum-Herausforderung (gibt den Belohnungsmodus zurück)
function rcReward(rc,mode){
  if(!rc || rc.failed || !rc.done) return mode;
  let txt=''; save.stats.roomChal=(save.stats.roomChal||0)+1;
  if(rc.rew==='gold'){ const g=40+12*run.act; run.gold+=g; run.goldTotal+=g; txt='+'+g+' Gold'; }
  else if(rc.rew==='heal'){ const h=Math.round(run.p.maxHp*0.2); run.p.hp=Math.min(run.p.maxHp,run.p.hp+h); txt='+'+h+' LP'; }
  else if(rc.rew==='soul'){ run.souls+=5; txt='+5 Seelen'; }
  else { txt='Seltenere Belohnung'; if(mode==='normal') mode='rare'; else if(mode==='rare') mode='elite'; }
  toast(`<span style="font-size:26px">${rc.ic}</span><div><div class="eyebrow" style="color:var(--gold)">Herausforderung geschafft</div><b>${rc.nm}</b><div class="sub" style="font-size:13px">${txt}</div></div>`);
  return mode;
}
function clearRoom(){
  if(G.cleared) return; save.stats.maxGold=Math.max(save.stats.maxGold,run.goldTotal); setTimeout(checkAch,600); G.cleared=true; G.clearT=0; G.eproj=[]; G.hazards=[];
  if(G.tut){ save.tutDone=true; persist(); $('dashBtn').classList.remove('hint'); $('skillBtn').classList.remove('hint'); }
  for(const a of G.allies) a.life=Math.min(a.life,0.8);
  if(G.rc && G.rc.id==='speed' && G.time>G.rc.limit) G.rc.failed=true;
  const h=(run.daily?0:metaLvl('m_heal'))*0.04*P.maxHp; if(h>0) P.hp=Math.min(P.maxHp,P.hp+h);
  if(G.type!=='boss') banner('Raum gesäubert!');
  else banner('Sieg!', BOSSES[bossKind()].name+' ist besiegt');
}
function fadeIn(){ const f=$('fade'); if(!f) return; f.classList.add('on'); requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.remove('on'))); }
function finishCombat(){
  if(state!=='combat') return; fadeIn();
  run.rooms++; const t=G.type, champ=!!G.champKilled, rc=G.rc; G=null; $('hud').classList.add('hidden'); run.room=null; wakeLock(false);
  if(t==='boss' && hasRelic('r_chalice')){ run.p.hp=Math.min(run.p.maxHp,run.p.hp+run.p.maxHp*0.3); }
  if(t==='boss'){
    if(run.act===3 && !run.endless){ run.won=true; run.pend={mode:'boss',after:'victory'}; save.run=run; persist(); showReward('boss',showVictory); return; }
    run.pend={mode:'boss',after:'next'}; save.run=run; persist(); showReward('boss',()=>showEvo(nextAct));
  } else { const nd=nodeById(run.posId), rw=nd&&nd.rw;
    let m=t==='elite'||(runMod()||{}).eliteEvery?'elite':rw==='rare'?'rare':rw==='gold'?'gold':rw==='heal'?'heal':'normal'; m=rcReward(rc,m);
    const rel=champ && relicsLeft().length; run.pend={mode:m,after:rel?'relic':'map'}; save.run=run; persist();
    showReward(m, rel?()=>showRelicPick(showMap,'Beute des Champions','Der Champion hinterlässt ein Relikt. Wähle eines davon.'):showMap); }
}

function showVictory(){
  const nn=(run.ng||0)+1; if(!run.daily){ save.ngMax=Math.max(save.ngMax||0,nn); persist(); checkAch(); }
  if(!run.victoryDone){ run.victoryDone=true; save.stats.wins[run.cid]=1;
    if(!run.daily && !run.challenge){ const t=run.tier||0; save.tierWon=save.tierWon||{}; if(tierWon(run.cid)<t || tierWon(run.cid)<0){ save.tierWon[run.cid]=Math.max(tierWon(run.cid),t);
      if(t<TIER_MAX) setTimeout(()=>toast(`<span style="font-size:26px">🔥</span><div><div class="eyebrow" style="color:var(--gold)">Verdammnis-Stufe ${t+1} freigeschaltet</div><b>${CHARS[run.cid].name}</b><div class="sub" style="font-size:13px">${TIERS[t+1].ic} ${TIERS[t+1].nm}: ${TIERS[t+1].ds}</div></div>`),300); } }
    if(run.challenge && !chalDone(run.challenge)){ const ch=CHALLENGES.find(x=>x.id===run.challenge); save.chal=save.chal||{}; save.chal[ch.id]=true; save.souls+=ch.souls;
      setTimeout(()=>toast(`<span style="font-size:26px">${ch.ic}</span><div><div class="eyebrow" style="color:var(--gold)">Herausforderung bestanden</div><b>${ch.nm}</b><div class="sub" style="font-size:13px">+${ch.souls} Seelen</div></div>`),600); }
    persist(); checkAch(); }
  render(`<div class="wrap" style="justify-content:center"><div class="center"><div class="eyebrow">${run.ng?'NG+'+run.ng+' · ':''}${esc(BOSSES[bossKind()].name)} ist gefallen</div><h1 style="margin-top:8px">Triumph!</h1>
    <p class="sub" style="margin-top:8px">Die Arena gehört dir. Doch aus der Tiefe steigen neue Schrecken empor …</p></div>
    <div class="cards">
      <button class="card epic reward-card" data-a="endless"><div class="ic">♾️</div><div class="body"><div class="nm">Endlosmodus</div><div class="ds">Kämpfe mit all deinen Upgrades weiter. Jeder Akt wird härter und bringt mehr Punkte.</div></div></button>
      ${run.daily?'':`<button class="card epic reward-card" data-a="ngp"><div class="ic">⚔️</div><div class="body"><div class="nm">Neues Spiel+ (NG+${nn})</div><div class="ds">Beginne erneut in Akt 1 – mit all deinen Upgrades und Werten. Gegner +${45*nn} % LP und +${25*nn} % Schaden, mehr Elitegegner. Seelen und Punkte +${50*nn} %.</div></div></button>`}
      <button class="card rare reward-card" data-a="claim"><div class="ic">🏆</div><div class="body"><div class="nm">Ruhm einstreichen</div><div class="ds">Beende den Lauf als Sieger.</div></div></button>
    </div></div>`,
  { endless:()=>{ run.endless=true; nextAct(); }, claim:()=>endRun(true),
    ngp:()=>{ run.ng=nn; run.act=0; run.won=false; run.seed+='|ng'+nn; run.p.goldMul+=0.2; nextAct(); run.p.hp=run.p.maxHp; save.run=run; persist(); } },true);
}
const DMG_SRC={ atk:'⚔️ Grundangriff', orbit:'🔥 Feuerkugeln', chain:'⚡ Kettenblitz', boom:'💥 Explosionen', wave:'🌊 Klingenwelle', split:'💫 Splitterfunken', meteor:'☄️ Meteore',
  shadow:'🌑 Schattenspur', poison:'🧪 Gift', bleed:'🩸 Blutung', minion:'💀 Diener', thorns:'🌵 Dornen', vengeance:'💢 Vergeltung', passive:'🌞 Geweihter Boden', overkill:'➰ Überschuss',
  dash:'🐗 Sturmangriff', barrel:'🛢️ Fässer', evo:'🪓 Axtwurf', r_mirror:'🪞 Splitterspiegel', trap:'⚙️ Fallen', pet:'🐾 Begleiter' };
// Laufzusammenfassung: Schaden nach Quelle, Zeit je Akt, Todesursache
function runSummaryHtml(r,won){
  const by=r.dmgBy||{}, tot=Object.values(by).reduce((a,b)=>a+b,0);
  if(!tot) return '';
  const top=Object.entries(by).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const lab=k=>k==='skill'?CHARS[r.cid].skill.icon+' '+CHARS[r.cid].skill.name:(DMG_SRC[k]||k);
  const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
  const t=r.actTime||{}, times=Object.keys(t).map(a=>`Akt ${a} ${fmt(t[a])}`).join(' · ');
  const kn=r.killer?(BOSSES[r.killer]?BOSSES[r.killer].name:ENEMIES[r.killer]?ENEMIES[r.killer].name:''):'';
  return `<div class="summary"><div class="eyebrow">Laufzusammenfassung · ${Math.round(tot).toLocaleString('de-DE')} Schaden</div>
    ${top.map(([k,v])=>`<div class="dbar"><span>${lab(k)}</span><i><u style="width:${Math.max(2,v/tot*100).toFixed(1)}%"></u></i><b>${Math.round(v/tot*100)} %</b></div>`).join('')}
    <div class="sub" style="font-size:13px;margin-top:4px">⏱️ ${times||'–'}${!won&&kn?` · ☠️ Gefallen durch ${esc(kn)}`:''}${r.perf?` · 💨 ${r.perf}× perfekt ausgewichen`:''}</div></div>`;
}
function endRun(won){
  state='ui'; const r=run; r.ended=true; r.room=null; wakeLock(false); G=null; $('hud').classList.add('hidden');
  const bonus=won?100:0;
  let score=r.kills*10+r.rooms*60+r.bosses*800+(won?2500:0)+(r.endless?(r.act-3)*1500:0)+Math.floor(r.goldTotal/2);
  const ngf=(1+0.5*(r.ng||0))*(1+0.15*(r.tier||0)); score=Math.round(score*ngf);
  const souls=Math.round((r.souls+bonus)*ngf*((r.relics||[]).includes('r_lantern')?1.5:1));
  save.souls+=souls; save.run=null;
  const entry={score,cid:r.cid,act:r.act,won,ng:r.ng||0,tier:r.tier||0,chal:r.challenge||null,endless:!!r.endless,daily:!!r.daily,assist:!!(r.assist||save.settings.assist),date:new Date().toLocaleDateString('de-DE')};
  let dailyBest=false;
  if(r.daily && r.daily[0]!=='W'){ if(!save.daily||save.daily.key!==r.daily) save.daily={key:r.daily,best:0,tries:0}; save.daily.tries++; if(score>save.daily.best){ save.daily.best=score; dailyBest=true; } }
  let dRec=null; if(r.daily){ const was=((save.dailyHist||{})[r.daily]||{}).best||0; dRec=dailyRecord(r.daily,score,won,r.act); if(score>was) dailyBest=true; }
  const bties=checkBounties(r,won);
  save.lastRun={cid:r.cid,act:r.act,won,killer:r.killer||null,rooms:r.rooms,tier:r.tier||0}; save.lossStreak=won?0:(save.lossStreak||0)+1;
  const gainXp=Math.round((r.kills+r.rooms*5+r.bosses*60+(won?150:0))*(1+0.5*(r.ng||0))), lvl0=heroLvl(r.cid);
  save.heroXp=save.heroXp||{}; save.heroXp[r.cid]=(save.heroXp[r.cid]||0)+gainXp; const lvl1=heroLvl(r.cid);
  if(lvl1>lvl0) setTimeout(()=>toast(`<span style="font-size:26px">⭐</span><div><div class="eyebrow" style="color:var(--gold)">Stufenaufstieg</div><b>${CHARS[r.cid].name} erreicht Stufe ${lvl1}</b><div class="sub" style="font-size:13px">Jetzt +${lvl1*3} LP und +${lvl1*2} % Schaden zu Beginn jedes Laufs</div></div>`),300);
  { const S=save.stats; S.maxGold=Math.max(S.maxGold,r.goldTotal); if(won){ S.anyWin=true; S.wins[r.cid]=1; if(r.daily) S.dailyWin=true; } if(r.endless) S.maxEndless=Math.max(S.maxEndless,r.act); }
  save.scores.push(entry); save.scores.sort((a,b)=>b.score-a.score); save.scores=save.scores.slice(0,10);
  const rank=save.scores.indexOf(entry); persist();
  setTimeout(checkAch,500);
  const unlockable=Object.entries(CHARS).find(([id,c])=>!save.unlocked[id]&&save.souls>=c.cost);
  render(`<div class="wrap" style="justify-content:center">
    <div class="center"><div class="eyebrow">${r.daily?(r.daily[0]==='W'?'Wochenprüfung · ':'Tägliche Herausforderung · '):''}${r.challenge?'🏁 '+CHALLENGES.find(x=>x.id===r.challenge).nm+' · ':''}${r.tier?'🔥 Verdammnis '+r.tier+' · ':''}${r.ng?'NG+'+r.ng+' · ':''}${r.endless?'Endlosmodus · Akt '+r.act+' erreicht':won?'Der Drachenhort ist bezwungen':'Akt '+r.act+' · '+actOf(r.act).name}</div>
    <h1 style="margin-top:8px">${r.endless?'Legende!':won?'Triumph!':'Gefallen'}</h1>
    <p class="sub" style="margin-top:8px">${r.endless?'Dein Name wird in jede Säule dieser Arena geritzt.':won?'Die Arena gehört dir. Die Barden werden davon singen.':'Doch jede Niederlage macht die nächste Seele stärker.'}</p></div>
    <div class="center"><div class="eyebrow">Punkte</div><div class="bigscore">${score}</div>${rank===0?'<span class="pill g">🏆 Neuer Rekord!</span>':rank>0?`<span class="pill">Platz ${rank+1} der Ruhmeshalle</span>`:''}${dailyBest?' <span class="pill g">📅 Neuer Tagesbestwert!</span>':''}</div>
    <div class="center"><span class="pill g">⭐ +${gainXp} EP für ${CHARS[r.cid].name} · Stufe ${lvl1}${lvl1>lvl0?' – Aufstieg!':''}</span></div>
    <div class="endstats"><div><span>Besiegte Gegner</span><b>${r.kills}</b></div><div><span>Räume</span><b>${r.rooms}</b></div>
      <div><span>Bosse</span><b>${r.bosses}</b></div><div><span>Gold gesammelt</span><b>${r.goldTotal}</b></div>
      <div style="grid-column:1/-1;color:var(--soul)"><span>Seelen erhalten${bonus?' (inkl. Siegbonus)':''}</span><b>+${souls} 👻</b></div></div>
    ${unlockable?`<p class="sub center" style="color:var(--soul)">Du hast genug Seelen, um ${unlockable[1].name} freizuschalten.</p>`:''}
    ${runSummaryHtml(r,won)}
    ${bties.length?`<div class="cards">${bties.map(b=>`<div class="card rare"><div class="ic">📜</div><div class="body"><div class="rar">Kopfgeld erfüllt</div><div class="nm">${esc(b.txt)}</div><div class="ds" style="color:var(--soul)">+${b.souls} Seelen</div></div></div>`).join('')}</div>`:''}
    <div class="relics" style="justify-content:center">${Object.entries(r.upg).map(([id,n])=>`<span class="relic">${UPG[id].ic}${n>1?`<sup>${n}</sup>`:''}</span>`).join('')}</div>
    ${r.daily?`<button class="btn" data-a="share">📤 Ergebnis teilen</button>`:''}
    <button class="btn primary" data-a="again">Nochmal kämpfen</button>
    <div class="row"><button class="btn" data-a="forge">⚒️ Schmiede</button><button class="btn" data-a="menu">Hauptmenü</button></div></div>`,
  { again:r.challenge?showChallenges:r.daily?showDaily:showChars, forge:showForge, menu:showMenu, share:()=>shareResult(shareText(r.daily,(save.dailyHist||{})[r.daily],r.daily[0]==='W'?'Wochenprüfung '+r.daily.slice(1):'Prüfung vom '+r.daily)) });
  if(won && !r.daily && !save.epilogSeen){ save.epilogSeen=true; persist(); const resHtml=ui.innerHTML, resActs=actions;
    render(`<div class="wrap story" style="justify-content:center"><div class="eyebrow center">Epilog</div><h1 class="center" style="margin-top:6px">Frei?</h1>
      <p>Für einen Herzschlag ist es still. Dann bricht ein Jubel los, der die Mauern von Varnhold erzittern lässt. Du hast geschafft, was niemandem vor dir gelang: Du hast alle drei Ränge der Arena überlebt.</p>
      <p>Das große Tor öffnet sich knirschend. Doch dahinter liegt keine Freiheit, sondern eine Treppe, die noch tiefer hinabführt. Aus der Dunkelheit hörst du ein Lachen. Die Spiele sind noch lange nicht vorbei.</p>
      <p class="sub center">Neues Spiel+ ist freigeschaltet. Wähle es im Heldenmenü oder direkt nach dem nächsten Sieg.</p>
      <button class="btn primary" data-a="next">Weiter</button></div>`,{ next:()=>{ ui.innerHTML=resHtml; actions=resActs; } }); }
  run=null;
}

function pauseGame(){ if(state!=='combat') return; state='paused'; showPause(); }
function showPause(){
  const p=P;
  ui.classList.remove('hidden'); ui.classList.add('dim');
  actions={ resume:()=>{ ui.classList.add('hidden'); $('hud').classList.remove('hidden'); state='combat'; last=performance.now(); }, quit:confirmQuit, opts:showSettings };
  ui.innerHTML=`<div class="wrap" style="justify-content:center"><h2 class="center">Pause</h2>
    ${statsHtml(p)}${evoHtml()}${synHtml()}
    ${relicBar()}<div class="relics" style="justify-content:center">${relicsHtml()}</div>
    <button class="btn primary" data-a="resume">Weiterkämpfen</button><button class="btn" data-a="opts">⚙️ Einstellungen</button><button class="btn" data-a="quit">Lauf aufgeben</button></div>`;
}

let bannerT=null;
function banner(t,sub,ms=1500){ const b=$('banner'); b.innerHTML=esc(t)+(sub?`<small>${esc(sub)}</small>`:''); b.classList.add('show'); clearTimeout(bannerT); bannerT=setTimeout(()=>b.classList.remove('show'),ms); }

/* ---------------- PARTIKEL ---------------- */
function part(x,y,vx,vy,life,size,color,glw=false,grav=0){ G.parts.push({x,y,vx,vy,life,max:life,size,color,glow:glw,grav,drag:2}); }
function burst(x,y,n,color,sp){ for(let i=0;i<n;i++){ const a=rand(0,TAU), s=rand(sp*0.3,sp); part(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(0.3,0.7),rand(2,5),color,Math.random()<0.4); } }
function enemyColor(e){ return {shroom:'#b04ac8',urchin:'#7a4a2a',shaman:'#6ab8a0',totem:'#a06a34',hound:'#4a3a66',wraith:'#b8c8ff',gargoyle:'#6a7a9a',whelp:'#c0302a',magma:'#ff6a1a',kobold:'#d0782a',spiderling:'#3a2a40',spider:'#3a2a46',vampire:'#8a1020',lavaworm:'#ff7a1a',shield:'#8a90a0',healer:'#d8d0b8',worm:'#b25a7e',mimic:'#8a5a2a',slime:'#6fd35a',bat:'#8a5ab0',skeleton:'#e8e2d0',archer:'#6aa84f',orc:'#6f8a4a',cultist:'#9a5ad0',imp:'#ff6a2a',golem:'#9aa0aa',lich:'#7dffb0',dragon:'#d0402a'}[e.kind]||'#fff'; }

