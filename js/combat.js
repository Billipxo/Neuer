'use strict';
/* Arena der Verdammten – Kampf: Räume, Gegner-KI, Bosse, Geschosse, Schaden und Partikel */

/* ---------------- KAMPF ---------------- */
function enemyPool(act,row){ return Object.keys(ENEMIES).filter(k=>{ const d=ENEMIES[k]; return !d.noPool && (!d.minAct||act>=d.minAct) && (!d.minRow||row>=d.minRow||act>1); }); }
function buildWaves(type){
  const act=run.act, row=nodeById(run.posId).row, depth=(act-1)*6+row;
  const pool=enemyPool(act,row), nW = type==='elite'?2:(row<2?2:3), waves=[];
  for(let w=0;w<nW;w++){
    let budget=(5+depth*1.25+w*1.5)*(type==='elite'?0.7:1)*((runMod()||{}).waveMul||1); const list=[];
    while(budget>0){ const k=pick(pool); list.push({kind:k}); budget-=ENEMIES[k].cost; }
    if(type==='elite' || ((runMod()||{}).eliteEvery && w===nW-1) || ((run.ng||0)>0 && w===nW-1 && RNG()<0.25*run.ng)) list.push({kind:pick(pool.filter(k=>k!=='bat')), elite:true});
    waves.push(list);
  }
  return waves;
}

const FLY={bat:1,imp:1,lich:1,dragon:1,whelp:1};
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
  const p=run.p;
  const tut = !save.tutDone && type==='fight' && !run.daily && run.rooms===0 && !customWaves;
  if(tut) customWaves=[[{kind:'slime'},{kind:'slime'}],[{kind:'skeleton'},{kind:'skeleton'},{kind:'archer'}]];
  P=Object.assign(p,{ x:AW/2, y:AH*0.7, r:14, vx:0, vy:0, face:-Math.PI/2, atkT:0.3, skillT:0, inv:0, shieldLeft:p.shield, spin:0, spinTick:0, regenAcc:0, moving:false, anim:0, swingT:0, dashT:0, dashCd:0, dashA:0, dashI:0, msT:0, trailT:0, nextCrit:false, kbx:0, kby:0, hurtT:0 });
  P.shieldLeft = p.shield + (p.manaShield?1:0);
  G={ type, enemies:[], pproj:[], eproj:[], hazards:[], webs:[], allies:[], pzones:[], pstrikes:[], parts:[], texts:[], coins:[], fx:[], spawnQ:[], booms:[],
      stop:0, stopCd:0, waves: customWaves || (type==='boss'?[]:seeded(roomKey('waves'),()=>buildWaves(type))), obs:[], traps:[], waveIdx:-1, waveT:0.8, cleared:false, clearT:0, time:0, shake:0, hurtFlash:0, orbitA:0, boss:null, weather:tut?'clear':seeded(roomKey('weather'),()=>wpick(WEATHER_POOL[visAct()])), hype:0.15, cheerCd:8, flash:0, lastProg:0, combo:0, comboLast:-9, bossHit:false,
      over:false, deathT:0, slowT:0, whiteFlash:0, moved:0, tut:tut?{step:0,t:0}:null };
  Object.assign(G, seeded(roomKey('arena'),()=>genArena(type)));
  if(G.tut){ G.obs=[]; G.traps=[]; }
  if(type==='boss'){
    const bk=bossKind(); G.waveIdx=0; G.waveT=99;
    G.spawnQ.push({x:AW/2,y:AH*0.3,t:1.6,kind:bk,boss:true});
    setTimeout(()=>{ if(G) banner(BOSSES[bk].name, actOf(run.act).name); },50); sfx('boss');
  }
  buildFloor(); initAmbient(); initWeather();
  DECOR.candles=DECOR.candles.filter(c=>!G.obs.some(o=>o.type==='pillar'&&Math.hypot(o.x-c.x,o.y-c.y)<o.r+10));
  input.id=null; input.jx=input.jy=0; $('banner').classList.remove('show');
  ui.classList.add('hidden'); $('hud').classList.remove('hidden');
  const c=CHARS[run.cid]; $('skillIc').textContent=c.skill.icon; $('skillLbl').textContent=c.skill.name;
  $('bossBar').classList.toggle('hidden', type!=='boss');
  $('hudRoom').innerHTML=`Akt ${run.act}<br>${NODE[type].nm} ${WEATHER[G.weather].ic}`;
  if(G.weather!=='clear' && type!=='boss' && !G.tut) setTimeout(()=>{ if(G) banner(WEATHER[G.weather].ic+' '+WEATHER[G.weather].nm); },60);
  state='combat'; last=performance.now();
}

function makeEnemy(kind,x,y,elite){
  const d=ENEMIES[kind], act=run.act, row=nodeById(run.posId).row;
  const ex=act>3?Math.pow(1.25,act-3):1;
  const ng=run.ng||0;
  const hs=(1+0.6*(act-1)+0.07*row)*ex*(1+0.45*ng), ds=(1+0.3*(act-1)+0.03*row)*Math.sqrt(ex)*(1+0.25*ng);
  const e={ kind, x,y, r:d.r, hp:d.hp*hs, dmg:d.dmg*ds, speed:d.speed*rand(0.9,1.1), ai:d.ai, t:rand(0,3), seed:rand(0,TAU), flash:0, slow:0, freeze:0, kx:0, ky:0,
    elite:!!elite, gold:d.gold, soul:1, st:0, timer:rand(1,2.5), dir:Math.random()<0.5?1:-1, face:0, orbCd:0, squish:0, fire:d.fire||2 };
  if(elite){ e.hp*=3.2; e.r*=1.35; e.dmg*=1.3; e.gold*=4; e.soul=5;
    const n=(act>=2||run.ng)?2:1; e.affix=shuffle(Object.keys(AFFIXES).filter(k=>!(k==='split'&&kind==='slime'))).slice(0,n);
    if(e.affix.includes('fast')) e.speed*=1.6; if(e.affix.includes('summon')) e.sumT=4; }
  if(kind==='mimic') e.soul=6;
  if(kind==='worm'){ e.under=true; e.timer=rand(1.5,2.5); }
  if(kind==='spiderling'){ e.soul=0; }
  e.speed*=((runMod()||{}).enemySpeed||1)*(1+0.04*Math.min(5,run.ng||0)); e.spawnT=0.45;
  e.maxHp=e.hp; return e;
}
function makeBoss(kind,x,y){
  const b=BOSSES[kind], s=(1+0.08*metaLvl('m_dmg'))*(run.act>3?1+0.8*(run.act-3):1)*(1+0.5*(run.ng||0));
  const e={ kind, boss:true, x,y, r:b.r, hp:b.hp*s, maxHp:b.hp*s, dmg:b.dmg, speed:b.speed, ai:kind, t:0, flash:0, slow:0, freeze:0, kx:0, ky:0, soul:0, gold:0,
    st:0, timer:2, cast:null, castT:0, face:Math.PI/2, alpha:1, seed:0, orbCd:0, phase2:false, spiral:0 };
  if(kind==='lavaworm'){ e.st=0; e.wt=1.5; e.under=true; }
  if(run.ng) e.dmg*=1+0.25*run.ng;
  G.boss=e; $('bossName').textContent=(run.ng?'NG+'+run.ng+' · ':'')+b.name; return e;
}

function nextWave(){
  G.waveIdx++; const list=G.waves[G.waveIdx];
  list.forEach((s,i)=>{
    let x,y,tries=0; do{ x=rand(40,AW-40); y=rand(40,AH-40); tries++; }while((Math.hypot(x-P.x,y-P.y)<220 || solidHit(x,y,24) || G.traps.some(t=>t.type==='lava'&&Math.hypot(t.x-x,t.y-y)<t.r+20)) && tries<40);
    G.spawnQ.push({x,y,t:0.9+i*0.12,kind:s.kind,elite:s.elite});
  });
}

function update(dt){
  if(G.slowT>0){ G.slowT-=dt; dt*=0.35; }
  if(G.over){ G.deathT+=dt; dt*=0.3; }
  if(G.whiteFlash>0) G.whiteFlash-=dt;
  G.time+=dt; if(G.tut) updTut(dt);
  // spawns
  for(const s of G.spawnQ){ s.t-=dt; if(s.t<=0){ G.enemies.push(s.boss?makeBoss(s.kind,s.x,s.y):makeEnemy(s.kind,s.x,s.y,s.elite)); if(s.boss){ roar(s.kind); G.shake+=10; } burst(s.x,s.y,s.boss?40:10,'#b69cff',s.boss?220:120); } }
  G.spawnQ=G.spawnQ.filter(s=>s.t>0);
  if(!G.cleared && G.type!=='boss' && G.enemies.length===0 && G.spawnQ.length===0){
    if(G.waveIdx < G.waves.length-1){ if(!G.tut || G.tut.step>=(G.waveIdx<0?1:4)) G.waveT-=dt; if(G.waveT<=0){ nextWave(); G.waveT=1.0; if(G.waveIdx>0) banner('Welle '+(G.waveIdx+1)); } }
    else clearRoom();
  }
  if(!G.over) updPlayer(dt);
  for(const e of G.enemies) updEnemy(e,dt);
  separate();
  updAllies(dt);
  updProjectiles(dt);
  updHazards(dt);
  for(const z of G.pzones){ z.life-=dt; z.tick-=dt;
    if(z.tick<=0){ z.tick=0.3; for(const e of G.enemies){ if(!e.dead && Math.hypot(e.x-z.x,e.y-z.y)<z.r+e.r) dealDamage(e,z.dps*0.3,{noChain:true,noCrit:true,color:'#c9a0ff'}); } }
    if(Math.random()<dt*3) part(z.x+rand(-10,10),z.y,0,-40,0.5,4,'#9a5aff',true); }
  G.pzones=G.pzones.filter(z=>z.life>0);
  for(const s of G.pstrikes){ s.t+=dt; if(s.t>=s.delay){ s.done=true; explosion(s.x,s.y,s.r,s.dmg,'#8ec8ff'); G.shake+=4; } }
  G.pstrikes=G.pstrikes.filter(s=>!s.done);
  // pending explosions (Explosive Seelen)
  const bl=G.booms; G.booms=[]; for(const b of bl){ explosion(b.x,b.y,b.r,b.dmg,b.barrel?'#ffb03a':'#ff8a3a',true);
    if(b.barrel){ G.shake+=6; for(let i=0;i<10;i++) part(b.x,b.y,rand(-160,160),rand(-160,160),0.6,rand(2,4),'#6b4a2a'); if(Math.hypot(P.x-b.x,P.y-b.y)<b.r+P.r*0.5) hurtPlayer(10+3*run.act,null); } }
  G.obs=G.obs.filter(o=>!o.dead);
  updTraps(dt);
  updAmbient(dt); updWeather(dt); updCrowd(dt);
  unstick();
  G.enemies=G.enemies.filter(e=>!e.dead);
  updCoins(dt);
  for(const p of G.parts){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=1-p.drag*dt; p.vy*=1-p.drag*dt; p.vy+=p.grav*dt; }
  G.parts=G.parts.filter(p=>p.life>0); if(G.parts.length>450) G.parts.splice(0,G.parts.length-450);
  for(const t of G.texts){ t.t+=dt; t.y-=32*dt; } G.texts=G.texts.filter(t=>t.t<0.8);
  for(const f of G.fx) f.t+=dt; G.fx=G.fx.filter(f=>f.t<f.life);
  G.shake=Math.max(0,G.shake-dt*30); G.hurtFlash=Math.max(0,G.hurtFlash-dt);
  if(G.cleared){ G.clearT+=dt; if((G.clearT>1.5 && G.coins.length===0) || G.clearT>3.5) finishCombat(); }
}

function updPlayer(dt){
  const p=P; const [mx,my]=readMove();
  if(p.chill>0){ p.chill-=dt; if(Math.random()<dt*10) part(p.x+rand(-10,10),p.y-8,0,-20,0.5,2.5,'#bfe6ff',true); }
  const sp=p.speed*p.spdMul*(p.spin>0?1.25:1)*(p.chill>0?0.6:1)*(G.webs.some(w=>Math.hypot(p.x-w.x,p.y-w.y)<w.r)?0.45:1);
  if(p.dashCd>0) p.dashCd-=dt; if(p.dashI>0) p.dashI-=dt;
  if(p.dashT>0){ p.dashT-=dt; const ds=680;
    p.x=clamp(p.x+Math.cos(p.dashA)*ds*dt,p.r,AW-p.r); p.y=clamp(p.y+Math.sin(p.dashA)*ds*dt,p.r,AH-p.r);
    G.fx.push({type:'ghost',x:p.x,y:p.y,t:0,life:0.28,color:CHARS[p.cid].color}); onDashMove(dt); }
  else { p.x=clamp(p.x+mx*sp*dt,p.r,AW-p.r); p.y=clamp(p.y+my*sp*dt,p.r,AH-p.r); }
  p.vx=p.dashT>0?0:mx*sp; p.vy=p.dashT>0?0:my*sp;
  pushOut(p);
  p.moving=Math.hypot(mx,my)>0.1; if(p.moving){ p.anim+=dt*11; G.moved+=Math.hypot(mx,my)*sp*dt;
    if(p.dashT<=0){ p.stepT=(p.stepT||0)-dt; if(p.stepT<=0){ p.stepT=0.17; part(p.x+rand(-5,5),p.y+13,rand(-15,15),rand(-18,-4),0.45,2.5,actOf(run.act).dust); } } }
  if(p.hurtT>0)p.hurtT-=dt;
  if(p.kbx||p.kby){ p.x=clamp(p.x+p.kbx*dt,p.r,AW-p.r); p.y=clamp(p.y+p.kby*dt,p.r,AH-p.r); const kd=Math.min(1,dt*9); p.kbx-=p.kbx*kd; p.kby-=p.kby*kd; if(Math.abs(p.kbx)+Math.abs(p.kby)<3) p.kbx=p.kby=0; }
  if(p.inv>0)p.inv-=dt; if(p.swingT>0)p.swingT-=dt; if(p.skillT>0)p.skillT-=dt;
  if(p.regen>0 && p.hp<p.maxHp){ p.hp=Math.min(p.maxHp,p.hp+p.regen*dt); }
  if(p.drain && !G.cleared && p.hp>1) p.hp=Math.max(1,p.hp-p.drain*dt);
  if(p.manaShield && p.shieldLeft<=0){ p.msT+=dt; if(p.msT>=10){ p.msT=0; p.shieldLeft=1; G.fx.push({type:'ring',x:p.x,y:p.y,r:34,t:0,life:0.4,color:'#7fb4ff'}); } }
  const c=CHARS[p.cid];
  const reach = c.attack==='melee' ? p.range*p.area+26 : p.range*(c.attack==='bolt'?1:1)*Math.sqrt(p.area);
  const tgt=nearestEnemy(p, reach, null, c.attack!=='melee');
  if(tgt) p.face=angTo(p,tgt); else if(p.moving) p.face=Math.atan2(my,mx);
  p.atkT-=dt;
  if(p.atkT<=0 && tgt && p.spin<=0){ attack(tgt); p.atkT=p.rate/p.atkSpd/(p.rage&&p.hp<p.maxHp*0.5?1.4:1); }
  // Wirbelwind
  if(p.spin>0){ p.spin-=dt; p.spinTick-=dt; p.face+=dt*18;
    if(p.spinTick<=0){ p.spinTick=0.16; const R=95*p.area; sfx('swing');
      for(const e of G.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<R+e.r) dealDamage(e,p.dmg*0.65,{kb:140,from:p}); }
      G.fx.push({type:'ring',x:p.x,y:p.y,r:R,t:0,life:0.2,color:'#cfe3ff'}); } }
  // Feuerkugeln
  if(p.orbit>0){ G.orbitA+=dt*3.2; const R=62*Math.sqrt(p.area);
    for(let i=0;i<p.orbit;i++){ const a=G.orbitA+i*TAU/p.orbit, ox=p.x+Math.cos(a)*R, oy=p.y+Math.sin(a)*R;
      if(Math.random()<0.5) part(ox,oy,rand(-20,20),rand(-20,20),0.3,3,'#ff9a3a',true);
      for(const e of G.enemies){ if(e.orbCd<=0 && Math.hypot(e.x-ox,e.y-oy)<e.r+11){ e.orbCd=0.45; dealDamage(e,p.dmg*0.55,{kb:60,from:{x:ox,y:oy}}); if(hasSyn('inferno')) G.booms.push({x:ox,y:oy,r:44,dmg:p.dmg*0.45}); } } } }
}
function nearestEnemy(from,maxD,exclude,needLos){
  let best=null,bd=maxD;
  for(const e of G.enemies){ if(e.dead||e===exclude||(e.alpha!==undefined&&e.alpha<0.3)||e.under) continue; if(needLos && !los(from,e)) continue; const d=Math.hypot(e.x-from.x,e.y-from.y)-e.r; if(d<bd){bd=d;best=e;} }
  return best;
}

function attack(tgt){
  const p=P, c=CHARS[p.cid], a=angTo(p,tgt);
  p.atkCount++;
  if(c.attack==='melee'){
    const R=p.range*p.area+12, arc=2.2; p.swingT=0.18; sfx('swing');
    for(let i=0;i<p.count;i++){
      const ang=a+i*TAU/p.count;
      let hitAny=false;
      for(const e of G.enemies){ const d=Math.hypot(e.x-p.x,e.y-p.y); if(d<R+e.r && !e.under && Math.abs(angDiff(Math.atan2(e.y-p.y,e.x-p.x),ang))<arc/2+0.2){ dealDamage(e,p.dmg,{kb:170,from:p}); hitAny=true; } }
      if(hitAny && p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+1);
      for(const o of G.obs){ if(o.type==='barrel' && Math.hypot(o.x-p.x,o.y-p.y)<R+o.r && Math.abs(angDiff(Math.atan2(o.y-p.y,o.x-p.x),ang))<arc/2+0.2) blowBarrel(o); }
      G.fx.push({type:'slash',x:p.x,y:p.y,a:ang,r:R,t:0,life:0.2,arc});
      if(p.wave>0) G.pproj.push({type:'wave',x:p.x+Math.cos(ang)*20,y:p.y+Math.sin(ang)*20,vx:Math.cos(ang)*430,vy:Math.sin(ang)*430,r:16*p.area,dmg:p.dmg*(0.3+0.15*p.wave),life:0.5,pierce:99,hit:new Set()});
    }
  } else if(c.attack==='bolt'){
    sfx('zap');
    for(let i=0;i<p.count;i++){ const ang=a+(i-(p.count-1)/2)*0.32;
      G.pproj.push({type:'bolt',x:p.x+Math.cos(ang)*14,y:p.y+Math.sin(ang)*14-6,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,sp:360,r:7,dmg:p.dmg,life:1.6,target:tgt,aoe:34*p.area,pierce:0,split:p.split,hit:new Set()}); }
    if(p.meteor && p.atkCount%6===0) G.pstrikes.push({x:tgt.x,y:tgt.y,t:0,delay:0.55,r:80*p.area,dmg:p.dmg*3});
  } else if(c.attack==='skull'){
    sfx('skullthrow');
    for(let i=0;i<p.count;i++){ const ang=a+(i-(p.count-1)/2)*0.3;
      G.pproj.push({type:'skull',x:p.x+Math.cos(ang)*12,y:p.y-6,vx:Math.cos(ang)*300,vy:Math.sin(ang)*300,sp:300,r:8,dmg:p.dmg,life:1.5,target:tgt,pierce:0,hit:new Set()}); }
  } else {
    sfx('twang');
    for(let i=0;i<p.count;i++){ const ang=a+(i-(p.count-1)/2)*0.14;
      G.pproj.push({type:'arrow',x:p.x,y:p.y-4,vx:Math.cos(ang)*640,vy:Math.sin(ang)*640,r:5,dmg:p.dmg,life:0.75*Math.sqrt(p.area)+0.25*p.bounce,pierce:p.pierce,bounce:p.bounce,poison:p.poison,hit:new Set()}); }
    if(p.volley && p.atkCount%4===0) for(let i=-2;i<=2;i++){ const ang=a+i*0.22; G.pproj.push({type:'arrow',x:p.x,y:p.y-4,vx:Math.cos(ang)*600,vy:Math.sin(ang)*600,r:5,dmg:p.dmg*0.8,life:0.7,pierce:p.pierce,bounce:p.bounce,poison:p.poison,hit:new Set(),gold:true}); }
  }
}

function useDash(){
  if(state!=='combat'||!P||!G||P.dashCd>0||P.dashT>0||G.over) return;
  const [mx,my]=readMove();
  P.dashA = Math.hypot(mx,my)>0.2 ? Math.atan2(my,mx) : P.face;
  G.tutDash=true; P.dashT=0.2; P.dashI=0.32; P.dashCd=1.3*P.dashCdMul; P.dashHit=[];
  if(hasSyn('phantom')) P.nextCrit=true;
  sfx('dash'); burst(P.x,P.y+8,8,'#cfe3ff',90);
}
function onDashMove(dt){
  const p=P;
  if(p.dashDmg>0) for(const e of G.enemies){ if(!e.dead && !p.dashHit.includes(e) && Math.hypot(e.x-p.x,e.y-p.y)<p.r+e.r+8){ p.dashHit.push(e); dealDamage(e,p.dmg*p.dashDmg,{kb:340,from:p}); G.shake+=2; } }
  if(p.shadow>0){ p.trailT-=dt; if(p.trailT<=0){ p.trailT=0.05; G.pzones.push({x:p.x,y:p.y,r:24,life:1.4+0.5*p.shadow,max:1.4+0.5*p.shadow,dps:p.dmg*(0.5+0.3*p.shadow),tick:0}); } }
}
function raiseAlly(x,y,life){
  G.allies.push({x,y,r:11,life,max:life,atkT:0.4,face:0,seed:rand(0,TAU),t:0});
  burst(x,y,14,'#5affd0',140);
}
function updAllies(dt){
  for(const a of G.allies){
    a.life-=dt; a.t+=dt; a.atkT-=dt;
    let best=null,bd=1e9; for(const e of G.enemies){ if(e.dead||e.under) continue; const d=Math.hypot(e.x-a.x,e.y-a.y)-e.r; if(d<bd){bd=d;best=e;} }
    if(best){ const ang=Math.atan2(best.y-a.y,best.x-a.x); a.face=ang;
      if(bd>a.r+4){ a.x+=Math.cos(ang)*125*dt; a.y+=Math.sin(ang)*125*dt; }
      else if(a.atkT<=0){ a.atkT=0.7; dealDamage(best,P.dmg*0.5*P.minionDmg,{noChain:true,kb:60,from:a}); } }
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
  if(state!=='combat'||!P||P.skillT>0||G.over) return;
  const p=P, c=CHARS[p.cid]; p.skillT=c.skill.cd*p.cdMul; sfx('skill'); buzz(20); G.tutSkill=true;
  if(p.cid==='krieger'){ p.spin=1.5; p.spinTick=0; }
  else if(p.cid==='nekro'){ for(let i=0;i<4;i++){ const a=i/4*TAU; raiseAlly(p.x+Math.cos(a)*34,p.y+Math.sin(a)*34,10); } G.fx.push({type:'ring',x:p.x,y:p.y,r:70,t:0,life:0.4,color:'#5affd0',fill:true}); }
  else if(p.cid==='magier'){ const R=170*p.area;
    for(const e of G.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<R+e.r){ dealDamage(e,p.dmg*2.2,{from:p,kb:120}); e.freeze=e.boss?0.7:2.4; } }
    G.fx.push({type:'ring',x:p.x,y:p.y,r:R,t:0,life:0.45,color:'#9fe6ff',fill:true}); burst(p.x,p.y,40,'#bdf2ff',320); G.shake+=5;
  } else { const n=24;
    for(let i=0;i<n;i++){ const a=i/n*TAU; G.pproj.push({type:'arrow',x:p.x,y:p.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:5,dmg:p.dmg*1.6,life:0.9,pierce:3,bounce:p.bounce,poison:p.poison,hit:new Set(),gold:true}); }
    G.fx.push({type:'ring',x:p.x,y:p.y,r:60,t:0,life:0.25,color:'#e6ffb0'});
  }
}

function dealDamage(e,amount,o={}){
  if(e.dead||e.under||(e.boss&&e.alpha<0.3)) return;
  G.lastProg=G.time;
  let blocked=false;
  if(e.affix&&e.affix.includes('armor')) amount*=0.6;
  if(e.kind==='shield' && o.from){ const ba=Math.atan2(o.from.y-e.y,o.from.x-e.x); if(Math.abs(angDiff(ba,e.face))<1.1){ amount*=0.25; blocked=true; } }
  let crit=!o.noCrit && (P.nextCrit || Math.random()<P.crit); if(crit && P.nextCrit) P.nextCrit=false;
  if(P.rage && P.hp<P.maxHp*0.5) amount*=1.25;
  const d=amount*(crit?P.critMul:1)*rand(0.9,1.1);
  if(o.poison){ e.poisonT=3; e.poisonDps=Math.max(e.poisonDps||0, amount*o.poison/3); }
  if(crit && hasSyn('bladestorm')) P.atkT-=P.rate/P.atkSpd*0.25;
  e.hp-=d; e.flash=e.boss?0.04:0.09; sfx('hit');
  if(o.kb && !e.boss && o.from){ const a=Math.atan2(e.y-o.from.y,e.x-o.from.x), k=o.kb*(e.elite?0.4:1); e.kx+=Math.cos(a)*k; e.ky+=Math.sin(a)*k; }
  G.texts.push({x:e.x+rand(-6,6),y:e.y-e.r-4,s:blocked?'Block':String(Math.round(d)),c:blocked?'#9fb3d9':(o.color||(crit?'#ffd34d':'#ffffff')),big:crit&&!blocked,t:0});
  if(blocked){ burst(e.x+Math.cos(e.face)*e.r,e.y+Math.sin(e.face)*e.r,3,'#ffe08a',90); }
  if(crit && G.stopCd<=0){ hitstop(0.03); G.stopCd=0.25; }
  if(!o.noChain && P.chain>0 && Math.random()<0.12+0.06*P.chain) chainLightning(e, amount*0.7, 2+P.chain);
  if(e.hp<=0) killEnemy(e);
}
function chainLightning(src,dmg,n){
  let cur=src; const hit=new Set([src]);
  for(let i=0;i<n;i++){
    let best=null,bd=170; for(const e of G.enemies){ if(e.dead||hit.has(e)) continue; const d=Math.hypot(e.x-cur.x,e.y-cur.y); if(d<bd){bd=d;best=e;} }
    if(!best) break; G.fx.push({type:'bolt',x:cur.x,y:cur.y,x2:best.x,y2:best.y,t:0,life:0.18}); hit.add(best);
    const nx=best.x, ny=best.y, cold=best.freeze>0||best.slow>0||(P.frost>0&&Math.hypot(P.x-nx,P.y-ny)<110+30*P.frost);
    dealDamage(best,dmg*(cold&&hasSyn('shatter')?2:1),{noChain:true,color:'#bfe6ff'}); cur={x:nx,y:ny};
  }
}
function explosion(x,y,r,dmg,color,fromBoom){
  G.fx.push({type:'ring',x,y,r,t:0,life:0.3,color,fill:true}); burst(x,y,16,color,200); sfx('boom'); G.shake+=2;
  for(const e of G.enemies){ if(!e.dead && Math.hypot(e.x-x,e.y-y)<r+e.r) dealDamage(e,dmg,{noChain:true,kb:120,from:{x,y}}); }
  for(const o of G.obs){ if(o.type==='barrel' && !o.dead && Math.hypot(o.x-x,o.y-y)<r+o.r) blowBarrel(o); }
}
function killEnemy(e){
  e.dead=true; if(e.boss) sfx('kill'); else deathSound(e.kind); if(e.elite) hitstop(0.09); if(e.boss) hitstop(0.35);
  burst(e.x,e.y,e.boss?80:12,enemyColor(e),e.boss?300:160);
  if(e.boss){ hype(1); crowdSound(1.4); musicSting('win'); if(!save.stats.bosses.includes(e.kind)) save.stats.bosses.push(e.kind); if(!G.bossHit) save.stats.noHitBoss=true; G.shake=20; buzz(200); G.slowT=1.4; G.whiteFlash=0.5; for(let i=0;i<60;i++){ const a=rand(0,TAU),s=rand(100,420); part(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s,rand(0.8,1.6),rand(3,6),Math.random()<0.5?'#ffd34d':'#fff3b0',true,120); } for(let i=0;i<40;i++) dropCoin(e.x+rand(-40,40),e.y+rand(-40,40),2); run.souls+=25*run.act; run.bosses++;
    for(const o of G.enemies) if(!o.dead&&!o.boss){ o.dead=true; burst(o.x,o.y,8,enemyColor(o),120); }
    G.eproj=[]; G.hazards=[]; clearRoom(); return; }
  run.kills++; run.souls+=e.soul; save.stats.kills++; if(e.elite) save.stats.elites++;
  if(G.time-G.comboLast<2.5) G.combo++; else G.combo=1; G.comboLast=G.time; save.stats.maxCombo=Math.max(save.stats.maxCombo,G.combo);
  if(G.combo>=10 && G.combo%10===0){ const bonus=G.combo; run.gold+=bonus; run.goldTotal+=bonus; hype(0.2); sfx('pick'); G.texts.push({x:P.x,y:P.y-44,s:G.combo+'er Kombo! +'+bonus+' Gold',c:'#ffd34d',big:true,t:0}); }
  hype(e.elite?0.35:0.035); if(e.elite){ crowdSound(0.6); crowdThrow(3,false); }
  G.fx.push({type:'corpse',e:Object.assign({},e,{flash:0,hp:e.maxHp,spawnT:0,freeze:0,poisonT:0}),t:0,life:0.42});
  part(e.x,e.y-e.r,rand(-10,10),-55,1,4,'#cfe6ff',true,-15);
  const g=Math.max(1,Math.round(e.gold*rand(0.8,1.3)));
  if(!(runMod()||{}).noGold) for(let i=0;i<Math.min(6,g);i++) dropCoin(e.x,e.y,Math.ceil(g/Math.min(6,g)));
  if(Math.random()<0.035) G.coins.push({x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-60,-20),v:0,heart:true,t:0});
  if(P.lifeOnKill) P.hp=Math.min(P.maxHp,P.hp+P.lifeOnKill);
  if(P.minions && !e.small && e.kind!=='mimic' && G.allies.length<P.minions && Math.random()<P.raise) raiseAlly(e.x,e.y,14);
  if(P.explode>0) G.booms.push({x:e.x,y:e.y,r:48+12*P.explode,dmg:P.dmg*(0.4+0.3*P.explode)});
  if(e.kind==='magma') G.traps.push({type:'lava',x:e.x,y:e.y,r:34,tick:0,id:800+Math.floor(rand(0,99999)),life:5});
  if(e.affix){
    if(e.affix.includes('boom')) G.hazards.push({type:'circle',x:e.x,y:e.y,r:75,delay:0.8,t:0,dmg:e.dmg*1.1,color:'#ff7a2a'});
    if(e.affix.includes('split')) for(let i=0;i<2;i++){ const s=makeEnemy(e.kind,e.x+rand(-10,10),e.y+rand(-10,10),false); s.spawnT=0; s.hp=s.maxHp=e.maxHp*0.35; s.r=e.r*0.75; s.gold=0; s.soul=1; s.kx=rand(-140,140); s.ky=rand(-140,140); if(s.kind==='worm'){ s.under=false; s.st=2; s.timer=2; } G.enemies.push(s); } }
  if(e.kind==='slime' && !e.small){
    for(let i=0;i<2;i++){ const s=makeEnemy('slime',e.x+rand(-8,8),e.y+rand(-8,8),false); s.small=true; s.spawnT=0; s.r=e.elite?13:9; s.hp=s.maxHp=e.maxHp*0.3; s.dmg*=0.7; s.speed*=1.2; s.gold=0; s.soul=0; s.kx=rand(-120,120); s.ky=rand(-120,120); G.enemies.push(s); }
  }
}
function dropCoin(x,y,v){ G.coins.push({x,y,vx:rand(-120,120),vy:rand(-120,120),v,t:0}); }
function updCoins(dt){
  for(const c of G.coins){
    c.t+=dt; const d=Math.hypot(P.x-c.x,P.y-c.y);
    if((d<90 || G.cleared) && c.t>0.35){ const a=Math.atan2(P.y-c.y,P.x-c.x), s=G.cleared?520:380; c.vx+=(Math.cos(a)*s-c.vx)*dt*8; c.vy+=(Math.sin(a)*s-c.vy)*dt*8; }
    else { c.vx*=1-dt*4; c.vy*=1-dt*4; }
    c.x+=c.vx*dt; c.y+=c.vy*dt; c.x=clamp(c.x,6,AW-6); c.y=clamp(c.y,6,AH-6);
    if(d<P.r+10 && c.t>0.25){ c.done=true;
      if(c.heart){ P.hp=Math.min(P.maxHp,P.hp+15); G.texts.push({x:P.x,y:P.y-24,s:'+15',c:'#7dff8a',t:0}); sfx('pick'); }
      else { const v=Math.max(1,Math.round(c.v*P.goldMul)); run.gold+=v; run.goldTotal+=v; coinSound(); } }
  }
  G.coins=G.coins.filter(c=>!c.done);
}

function enemyShoot(e,ang,speed,dmg,kind,r=6){ G.eproj.push({x:e.x+Math.cos(ang)*e.r,y:e.y+Math.sin(ang)*e.r,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,dmg,kind,r,life:4,src:e}); }

function updEnemy(e,dt){
  if(e.spawnT>0){ e.spawnT-=dt; e.t+=dt; return; }
  if(e.sumT!==undefined && !G.cleared){ e.sumT-=dt; if(e.sumT<=0){ e.sumT=7; for(let i=0;i<2;i++) G.spawnQ.push({x:clamp(e.x+rand(-60,60),30,AW-30),y:clamp(e.y+rand(-60,60),30,AH-30),t:0.5,kind:'bat'}); G.fx.push({type:'ring',x:e.x,y:e.y,r:40,t:0,life:0.4,color:'#9a5ab0'}); } }
  e.t+=dt; if(e.flash>0)e.flash-=dt; if(e.orbCd>0)e.orbCd-=dt;
  if(e.poisonT>0){ e.poisonT-=dt; e.poisonAcc=(e.poisonAcc||0)+e.poisonDps*dt;
    if(e.poisonAcc>=5||e.poisonT<=0){ const pa=e.poisonAcc; e.poisonAcc=0; if(e.poisonT<=0) e.poisonDps=0; dealDamage(e,pa,{noChain:true,noCrit:true,color:'#8dff6a'}); if(e.dead) return; }
    if(Math.random()<dt*6) part(e.x+rand(-0.6,0.6)*e.r,e.y-e.r*0.3,0,-30,0.5,3,'#8dff6a',true); }
  let sm=1; if(e.freeze>0){ e.freeze-=dt; sm=0; } else if(e.slow>0){ e.slow-=dt; sm=0.5; }
  const d=Math.hypot(P.x-e.x,P.y-e.y), a=Math.atan2(P.y-e.y,P.x-e.x);
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
        for(const o of G.enemies){ if(o.dead||o.boss||o.hp>=o.maxHp||Math.hypot(o.x-e.x,o.y-e.y)>230) continue;
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
    case 'charger':
      if(e.st===0){ mx=Math.cos(a); my=Math.sin(a); e.timer-=dt*sm; if(e.timer<=0 && d<320){ e.st=1; e.stT=0.65; e.ca=a; } }
      else if(e.st===1){ e.stT-=dt*sm; e.face=e.ca; if(e.stT<=0){ e.st=2; e.stT=0.5; } }
      else { e.face=e.ca; mx=Math.cos(e.ca)*7.5; my=Math.sin(e.ca)*7.5; e.stT-=dt; if(Math.random()<0.6) part(e.x,e.y+e.r*0.6,rand(-20,20),rand(-20,20),0.4,4,'#8a7a6a');
        if(e.stT<=0||e.x<=e.r||e.x>=AW-e.r||e.y<=e.r||e.y>=AH-e.r){ e.st=0; e.timer=rand(2.8,4.2); } }
      break;
  }
  e.x+=(mx*e.speed*sm+e.kx)*dt; e.y+=(my*e.speed*sm+e.ky)*dt;
  const kd=Math.min(1,dt*9);   e.kx-=e.kx*kd; e.ky-=e.ky*kd;
  e.x=clamp(e.x,e.r,AW-e.r); e.y=clamp(e.y,e.r,AH-e.r);
  if(!FLY[e.kind] && !e.under) pushOut(e,(e.seed>Math.PI?1:-1)*e.speed*sm*dt*0.8);
  if(d<e.r+P.r-2 && sm>0 && !e.under) hurtPlayer(e.dmg,e);
}

function updBoss(e,dt,sm,d,a){
  e.phase2 = e.hp<e.maxHp*(0.5+Math.min(0.2,0.05*(run.ng||0)));
  if(e.phase2 && !e.enraged){ e.enraged=true; hype(0.4); crowdSound(0.8); banner('Der Boss wird wütend!'); hitstop(0.2); G.shake+=10; sfx('boss'); }
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
    pr.life-=dt;
    if(pr.type==='bolt'||pr.type==='skull'){
      if(pr.target && !pr.target.dead && !pr.target.under){ const want=Math.atan2(pr.target.y-pr.y,pr.target.x-pr.x), cur=Math.atan2(pr.vy,pr.vx), na=cur+clamp(angDiff(want,cur),-(pr.type==='bolt'?7:4)*dt,(pr.type==='bolt'?7:4)*dt); pr.vx=Math.cos(na)*pr.sp; pr.vy=Math.sin(na)*pr.sp; }
      else pr.target=nearestEnemy(pr,250);
      if(Math.random()<0.7) part(pr.x,pr.y,rand(-15,15),rand(-15,15),0.3,3,pr.type==='bolt'?'#c58cff':'#5affd0',true);
    }
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt;
    if(pr.x<0||pr.y<0||pr.x>AW||pr.y>AH){
      if(pr.bounce>0){ pr.bounce--; if(pr.x<0||pr.x>AW) pr.vx=-pr.vx; if(pr.y<0||pr.y>AH) pr.vy=-pr.vy; pr.x=clamp(pr.x,0,AW); pr.y=clamp(pr.y,0,AH); pr.hit.clear(); pr.life=Math.max(pr.life,0.35); burst(pr.x,pr.y,4,'#ffe08a',80); }
      else pr.life=0; }
    if(pr.life<=0) continue;
    { const o=solidHit(pr.x,pr.y,pr.r); if(o){ if(o.type==='barrel') blowBarrel(o);
        if(pr.type!=='wave'){ pr.life=0; burst(pr.x,pr.y,5,pr.type==='bolt'?'#c58cff':'#b8b0a0',90); continue; } } }
    for(const e of G.enemies){
      if(e.dead||e.under||pr.hit.has(e)||(e.alpha!==undefined&&e.alpha<0.3)) continue;
      if(Math.hypot(e.x-pr.x,e.y-pr.y)<e.r+pr.r){
        if(pr.type==='bolt'){ pr.life=0; G.fx.push({type:'ring',x:pr.x,y:pr.y,r:pr.aoe,t:0,life:0.22,color:'#c58cff',fill:true}); burst(pr.x,pr.y,8,'#d9b3ff',140);
          for(const o of G.enemies){ if(!o.dead && Math.hypot(o.x-pr.x,o.y-pr.y)<pr.aoe+o.r) dealDamage(o, o===e?pr.dmg:pr.dmg*0.4,{kb:80,from:pr}); }
          if(pr.split){ const n=2+pr.split, o0=rand(0,TAU); for(let i=0;i<n;i++){ const sa=o0+i/n*TAU; G.pproj.push({type:'spark',x:pr.x,y:pr.y,vx:Math.cos(sa)*380,vy:Math.sin(sa)*380,r:4,dmg:pr.dmg*0.35,life:0.4,pierce:0,hit:new Set([e])}); } }
          break; }
        pr.hit.add(e); dealDamage(e,pr.dmg,{kb:pr.type==='wave'?120:70,from:{x:pr.x-pr.vx,y:pr.y-pr.vy},poison:pr.poison}); pr.pierce--; if(pr.pierce<0){ pr.life=0; break; }
      }
    }
  }
  G.pproj=G.pproj.filter(p=>p.life>0);
  for(const pr of G.eproj){
    pr.life-=dt; pr.x+=pr.vx*dt; pr.y+=pr.vy*dt;
    if(pr.kind==='fire' && Math.random()<0.6) part(pr.x,pr.y,rand(-20,20),rand(-20,20),0.35,4,'#ff8a2a',true);
    if(pr.kind==='soul' && Math.random()<0.3) part(pr.x,pr.y,0,0,0.3,3,'#7dffb0',true);
    if(pr.x<-10||pr.y<-10||pr.x>AW+10||pr.y>AH+10) pr.life=0;
    { const o=solidHit(pr.x,pr.y,pr.r*0.6); if(o){ if(o.type==='barrel') blowBarrel(o); pr.life=0; burst(pr.x,pr.y,4,'#b8b0a0',70); continue; } }
    if(Math.hypot(P.x-pr.x,P.y-pr.y)<P.r+pr.r-2 && !G.over){ pr.life=0; hurtPlayer(pr.dmg,null,pr.src); burst(pr.x,pr.y,6,'#ffffff',90); }
  }
  for(const p of G.eproj) if(p.life<=0&&p.kind==='web') G.webs.push({x:p.x,y:p.y,r:48,life:7});
  G.eproj=G.eproj.filter(p=>p.life>0);
  for(const w of G.webs) w.life-=dt; G.webs=G.webs.filter(w=>w.life>0);
}

function updHazards(dt){
  for(const h of G.hazards){
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
          if(Math.hypot(e.x-t.x,e.y-t.y)<t.r+e.r*0.4){ e['sp'+t.id]=cyc; dealDamage(e,30*sc,{noChain:true,noCrit:true,color:'#ffb35a'}); } } } }
    else if(t.type==='lava'){ t.tick-=dt;
      if(Math.random()<dt*4) part(t.x+rand(-t.r,t.r)*0.6,t.y+rand(-t.r,t.r)*0.5,0,-25,0.7,3,'#ffb03a',true);
      if(t.tick<=0){ t.tick=0.5; if(Math.hypot(P.x-t.x,P.y-t.y)<t.r) hurtPlayer(5+2*run.act,null);
        for(const e of G.enemies){ if(!e.boss && !FLY[e.kind] && !e.dead && Math.hypot(e.x-t.x,e.y-t.y)<t.r) dealDamage(e,10*sc,{noChain:true,noCrit:true,color:'#ff8a3a'}); } } }
  }
}
function hurtPlayer(dmg,src,via){
  const p=P; if(p.inv>0||p.dashI>0||G.over||G.cleared) return;
  if(p.shieldLeft>0){ p.shieldLeft--; p.inv=0.7; G.fx.push({type:'ring',x:p.x,y:p.y,r:30,t:0,life:0.35,color:'#7fd4ff'}); G.texts.push({x:p.x,y:p.y-26,s:'Geblockt',c:'#7fd4ff',t:0}); sfx('pick'); return; }
  const d=Math.max(1,Math.round((dmg*(p.dmgTaken||1)-p.armor-(p.boneArmor?G.allies.length:0))*(p.spin>0?0.5:1)));
  hype(-0.06); G.combo=0; if(G.type==='boss') G.bossHit=true; p.hurtT=0.25;
  if(src){ const ka=Math.atan2(p.y-src.y,p.x-src.x); p.kbx=Math.cos(ka)*260; p.kby=Math.sin(ka)*260; }
  { const at=src&&src.affix?src:(via&&via.affix?via:null);
    if(at){ if(at.affix.includes('vamp')&&!at.dead){ at.hp=Math.min(at.maxHp,at.hp+at.maxHp*0.15); G.texts.push({x:at.x,y:at.y-at.r-10,s:'+Blut',c:'#ff4a5a',t:0}); }
      if(at.affix.includes('frost')){ p.chill=2; G.texts.push({x:p.x,y:p.y-40,s:'Verlangsamt',c:'#bfe6ff',t:0}); } } }
  p.hp-=d; p.inv=0.75; G.shake=Math.min(14,G.shake+7); G.hurtFlash=0.3; sfx('hurt'); buzz(40); hitstop(0.06);
  G.texts.push({x:p.x,y:p.y-26,s:'-'+d,c:'#ff5a4a',big:true,t:0});
  if(src && p.thorns>0 && !src.dead){ dealDamage(src,p.thorns,{noChain:true}); if(hasSyn('vampthorn')) p.hp=Math.min(p.maxHp,p.hp+5); }
  if(p.hp<=0){
    if(p.revive>0){ p.revive--; run.upg.phoenix=Math.max(0,(run.upg.phoenix||1)-1); if(!run.upg.phoenix) delete run.upg.phoenix; p.hp=Math.ceil(p.maxHp*0.5); p.inv=2.5; burst(p.x,p.y,50,'#ffb84a',260); banner('Phönixfeder!','Du erhebst dich erneut'); }
    else { p.hp=0; G.over=true; G.deathT=0; banner('Gefallen'); musicSting('lose'); burst(p.x,p.y,40,'#c8423a',200); buzz(300); setTimeout(()=>{ if(G&&G.over) endRun(!!(run&&run.won)); },1600); }
  }
}

function clearRoom(){
  if(G.cleared) return; save.stats.maxGold=Math.max(save.stats.maxGold,run.goldTotal); setTimeout(checkAch,600); G.cleared=true; G.clearT=0; G.eproj=[]; G.hazards=[];
  if(G.tut){ save.tutDone=true; persist(); $('dashBtn').classList.remove('hint'); $('skillBtn').classList.remove('hint'); }
  for(const a of G.allies) a.life=Math.min(a.life,0.8);
  const h=(run.daily?0:metaLvl('m_heal'))*0.04*P.maxHp; if(h>0) P.hp=Math.min(P.maxHp,P.hp+h);
  if(G.type!=='boss') banner('Raum gesäubert!');
  else banner('Sieg!', BOSSES[bossKind()].name+' ist besiegt');
}
function finishCombat(){
  if(state!=='combat') return;
  run.rooms++; const t=G.type; G=null; $('hud').classList.add('hidden');
  if(t==='boss'){
    if(run.act===3 && !run.endless){ run.won=true; save.run=run; persist(); showReward('boss',showVictory); return; }
    showReward('boss',nextAct);
  } else showReward(t==='elite'||(runMod()||{}).eliteEvery?'elite':'normal', showMap);
}

function showVictory(){
  const nn=(run.ng||0)+1; if(!run.daily){ save.ngMax=Math.max(save.ngMax||0,nn); persist(); checkAch(); }
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
function endRun(won){
  state='ui'; const r=run; G=null; $('hud').classList.add('hidden');
  const bonus=won?100:0;
  let score=r.kills*10+r.rooms*60+r.bosses*800+(won?2500:0)+(r.endless?(r.act-3)*1500:0)+Math.floor(r.goldTotal/2);
  const ngf=1+0.5*(r.ng||0); score=Math.round(score*ngf);
  const souls=Math.round((r.souls+bonus)*ngf);
  save.souls+=souls; save.run=null;
  const entry={score,cid:r.cid,act:r.act,won,ng:r.ng||0,endless:!!r.endless,daily:!!r.daily,date:new Date().toLocaleDateString('de-DE')};
  let dailyBest=false;
  if(r.daily){ if(!save.daily||save.daily.key!==r.daily) save.daily={key:r.daily,best:0,tries:0}; save.daily.tries++; if(score>save.daily.best){ save.daily.best=score; dailyBest=true; } }
  { const S=save.stats; S.maxGold=Math.max(S.maxGold,r.goldTotal); if(won){ S.anyWin=true; S.wins[r.cid]=1; if(r.daily) S.dailyWin=true; } if(r.endless) S.maxEndless=Math.max(S.maxEndless,r.act); }
  save.scores.push(entry); save.scores.sort((a,b)=>b.score-a.score); save.scores=save.scores.slice(0,10);
  const rank=save.scores.indexOf(entry); persist();
  setTimeout(checkAch,500);
  const unlockable=Object.entries(CHARS).find(([id,c])=>!save.unlocked[id]&&save.souls>=c.cost);
  render(`<div class="wrap" style="justify-content:center">
    <div class="center"><div class="eyebrow">${r.daily?'Tägliche Herausforderung · ':''}${r.ng?'NG+'+r.ng+' · ':''}${r.endless?'Endlosmodus · Akt '+r.act+' erreicht':won?'Der Drachenhort ist bezwungen':'Akt '+r.act+' · '+actOf(r.act).name}</div>
    <h1 style="margin-top:8px">${r.endless?'Legende!':won?'Triumph!':'Gefallen'}</h1>
    <p class="sub" style="margin-top:8px">${r.endless?'Dein Name wird in jede Säule dieser Arena geritzt.':won?'Die Arena gehört dir. Die Barden werden davon singen.':'Doch jede Niederlage macht die nächste Seele stärker.'}</p></div>
    <div class="center"><div class="eyebrow">Punkte</div><div class="bigscore">${score}</div>${rank===0?'<span class="pill g">🏆 Neuer Rekord!</span>':rank>0?`<span class="pill">Platz ${rank+1} der Ruhmeshalle</span>`:''}${dailyBest?' <span class="pill g">📅 Neuer Tagesbestwert!</span>':''}</div>
    <div class="endstats"><div><span>Besiegte Gegner</span><b>${r.kills}</b></div><div><span>Räume</span><b>${r.rooms}</b></div>
      <div><span>Bosse</span><b>${r.bosses}</b></div><div><span>Gold gesammelt</span><b>${r.goldTotal}</b></div>
      <div style="grid-column:1/-1;color:var(--soul)"><span>Seelen erhalten${bonus?' (inkl. Siegbonus)':''}</span><b>+${souls} 👻</b></div></div>
    ${unlockable?`<p class="sub center" style="color:var(--soul)">Du hast genug Seelen, um ${unlockable[1].name} freizuschalten.</p>`:''}
    <div class="relics" style="justify-content:center">${Object.entries(r.upg).map(([id,n])=>`<span class="relic">${UPG[id].ic}${n>1?`<sup>${n}</sup>`:''}</span>`).join('')}</div>
    <button class="btn primary" data-a="again">Nochmal kämpfen</button>
    <div class="row"><button class="btn" data-a="forge">⚒️ Schmiede</button><button class="btn" data-a="menu">Hauptmenü</button></div></div>`,
  { again:showChars, forge:showForge, menu:showMenu });
  run=null;
}

function pauseGame(){ if(state!=='combat') return; state='paused'; showPause(); }
function showPause(){
  const p=P;
  ui.classList.remove('hidden'); ui.classList.add('dim');
  actions={ resume:()=>{ ui.classList.add('hidden'); state='combat'; last=performance.now(); }, quit:confirmQuit };
  ui.innerHTML=`<div class="wrap" style="justify-content:center"><h2 class="center">Pause</h2>
    ${statsHtml(p)}${synHtml()}
    <div class="relics" style="justify-content:center">${relicsHtml()}</div>
    <button class="btn primary" data-a="resume">Weiterkämpfen</button><button class="btn" data-a="quit">Lauf aufgeben</button></div>`;
}

let bannerT=null;
function banner(t,sub){ const b=$('banner'); b.innerHTML=esc(t)+(sub?`<small>${esc(sub)}</small>`:''); b.classList.add('show'); clearTimeout(bannerT); bannerT=setTimeout(()=>b.classList.remove('show'),1500); }

/* ---------------- PARTIKEL ---------------- */
function part(x,y,vx,vy,life,size,color,glw=false,grav=0){ G.parts.push({x,y,vx,vy,life,max:life,size,color,glow:glw,grav,drag:2}); }
function burst(x,y,n,color,sp){ for(let i=0;i<n;i++){ const a=rand(0,TAU), s=rand(sp*0.3,sp); part(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(0.3,0.7),rand(2,5),color,Math.random()<0.4); } }
function enemyColor(e){ return {whelp:'#c0302a',magma:'#ff6a1a',kobold:'#d0782a',spiderling:'#3a2a40',spider:'#3a2a46',vampire:'#8a1020',lavaworm:'#ff7a1a',shield:'#8a90a0',healer:'#d8d0b8',worm:'#b25a7e',mimic:'#8a5a2a',slime:'#6fd35a',bat:'#8a5ab0',skeleton:'#e8e2d0',archer:'#6aa84f',orc:'#6f8a4a',cultist:'#9a5ad0',imp:'#ff6a2a',golem:'#9aa0aa',lich:'#7dffb0',dragon:'#d0402a'}[e.kind]||'#fff'; }

