'use strict';
/* Arena der Verdammten – Zeichnen aller Spielobjekte, Menü-Hintergrund und Spielschleife */

/* ---------------- ZEICHNEN ---------------- */
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const A=actOf(run.act);
  ctx.fillStyle=A.wall; ctx.fillRect(0,0,W,H);
  camUpdate(); const VS=SCALE*CAM.z; VIEW_S=VS;
  const vw=W/VS, vh=H/VS, m=WALL+STAND*0.75;
  let cx = vw>=AW+2*m ? AW/2-vw/2 : clamp(P.x-vw/2,-m,AW+m-vw);
  let cy = vh>=AH+2*m ? AH/2-vh/2 : clamp(P.y-vh/2,-m,AH+m-vh);
  if(CAM.k>0){ cx+=(CAM.x-vw/2-cx)*CAM.k; cy+=(CAM.y-vh/2-cy)*CAM.k; }
  CAM.cx=cx; CAM.cy=cy;
  if(G.shake>0 && save.settings.shake){ const k=0.4*(save.settings.shakeAmt??1); cx+=(Math.random()*2-1)*G.shake*k; cy+=(Math.random()*2-1)*G.shake*k; }
  ctx.save(); ctx.scale(VS,VS); ctx.translate(-cx,-cy);
  if(!floorCanvas) buildFloor();
  ctx.drawImage(floorCanvas,-BORDER,-BORDER,AW+BORDER*2,AH+BORDER*2);
  drawCrowd(cx,cy,vw,vh);
  drawFloorLife();
  for(const t of G.traps) drawTrap(t);
  for(const w of G.webs){ ctx.globalAlpha=Math.min(1,w.life)*0.7; ctx.strokeStyle='#e8e8f0'; ctx.lineWidth=1.2;
    for(let i=0;i<8;i++){ const a=i/8*TAU; ctx.beginPath(); ctx.moveTo(w.x,w.y); ctx.lineTo(w.x+Math.cos(a)*w.r,w.y+Math.sin(a)*w.r*0.8); ctx.stroke(); }
    for(let k=1;k<=3;k++){ ctx.beginPath(); for(let i=0;i<=8;i++){ const a=i/8*TAU, rr=w.r*k/3; i?ctx.lineTo(w.x+Math.cos(a)*rr,w.y+Math.sin(a)*rr*0.8):ctx.moveTo(w.x+Math.cos(a)*rr,w.y+Math.sin(a)*rr*0.8); } ctx.stroke(); }
    ctx.globalAlpha=1; }
  // player zones and strikes
  drawZones();
  for(const s of G.pstrikes){ const k=s.t/s.delay; ctx.strokeStyle='rgba(140,200,255,0.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.stroke(); drawGlow(s.x,s.y-(1-k)*260,30,'#8ec8ff',0.4+0.6*k); }
  // hazards
  for(const h of G.hazards) drawHazard(h);
  // spawn markers
  for(const s of G.spawnQ) drawSpawn(s);
  // coins
  for(const c of G.coins){ const z=c.z||0, bob=(z?0:Math.sin(G.time*6+c.x)*1.5)-z; if(z>1) drawShadow(c.x,c.y+4,4);
    if(c.heart){ ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('❤️',c.x,c.y+bob); continue; }
    drawGlow(c.x,c.y,12,'#ffcc44',0.4); ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.ellipse(c.x,c.y+bob,4.5*Math.abs(Math.cos(G.time*4+c.x))+1.5,4.5,0,0,TAU); ctx.fill(); ctx.fillStyle='#fff3b0'; ctx.fillRect(c.x-1,c.y+bob-2,2,2); }
  // shadows + entities sorted
  // Zielvorschau beim Wischen vom Fähigkeitsknopf
  const hov=!P.aim && INPUT_MODE==='pc' && input.mOn && !G.over && !G.cine && AIM_SKILLS[P.cid] && skillReady() ? mouseAim() : null;
  if((P.aim||hov) && !G.over){ const A=P.aim||hov, ready=skillReady(), col=ready?'rgba(140,220,255,':'rgba(255,140,120,';
    const rng=AIM_RANGE[P.cid];
    ctx.save(); ctx.lineWidth=2.5; ctx.setLineDash([8,6]); if(hov) ctx.globalAlpha=0.5;
    if(rng){ const T=aimPoint(P,A,rng[0],rng[1]), R={alchi:140*Math.sqrt(P.area),berserk:95*Math.sqrt(P.area),magier:136*P.area,nekro:60}[P.cid];
      if(!hov){ ctx.strokeStyle=col+'0.75)'; ctx.beginPath(); ctx.moveTo(P.x,P.y); ctx.lineTo(T.x,T.y); ctx.stroke(); } ctx.setLineDash([]);
      ctx.fillStyle=col+'0.15)'; ctx.beginPath(); ctx.ellipse(T.x,T.y,R,R*0.62,0,0,TAU); ctx.fill(); ctx.strokeStyle=col+'0.9)'; ctx.stroke(); }
    else { ctx.setLineDash([]); ctx.fillStyle=col+'0.15)'; ctx.beginPath(); ctx.moveTo(P.x,P.y); ctx.arc(P.x,P.y,300,A.a-0.55,A.a+0.55); ctx.closePath(); ctx.fill(); ctx.strokeStyle=col+'0.8)'; ctx.stroke(); }
    ctx.restore(); }
  // Zielmarkierung unter dem Gegner, den der Held gerade automatisch angreift
  { const T=P.tgtRef; if(T && !T.dead && !G.over && !T.under){ const rr=T.r*1.25, a=G.time*2.5; ctx.save(); ctx.strokeStyle='rgba(255,224,138,0.75)'; ctx.lineWidth=2; ctx.setLineDash([6,5]); ctx.lineDashOffset=-G.time*20;
      ctx.beginPath(); ctx.ellipse(T.x,T.y+T.r*0.75,rr,rr*0.42,0,0,TAU); ctx.stroke(); ctx.restore(); } }
  if(G.decoy){ const D=G.decoy; ctx.save(); ctx.globalAlpha=0.35+0.2*Math.sin(G.time*14); ctx.translate(D.x,D.y); ctx.scale(1.12,1.12); drawHeroFigure(P.cid,skinOf(P.cid),{face:D.face,moving:false,anim:0,swing:0,t:G.time}); ctx.restore(); ctx.globalAlpha=1; drawGlow(D.x,D.y,30,'#9fd8ff',0.4); }
  const ents=[...G.enemies, ...G.obs, ...G.allies, P]; if(G.pet) ents.push(G.pet); if(G.bossDie && !G.bossDie.blown) ents.push(G.bossDie.e);
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents){ if(e===G.pet) drawPet(e); else if(e===P) drawHero(); else if(e.type==='pillar') drawPillar(e); else if(e.type==='barrel') drawBarrel(e); else if(e.max!==undefined && e.life!==undefined && !e.kind) drawAlly(e); else if(e.boss) drawBoss(e); else drawEnemy(e); }
  drawDebris(); if(G.bossDie) drawBossDieFx(G.bossDie);
  for(const f of G.fog) drawGlow(f.x,f.y,f.r,f.thick?'#9a98a8':'#8a7aa8',f.thick?0.2:0.12);
  ctx.restore();
  if(FX()) renderLights(cx,cy);
  ctx.save(); ctx.scale(VS,VS); ctx.translate(-cx,-cy);
  drawFlames();
  // orbit
  if(P.orbit>0 && !G.over){ const R=62*Math.sqrt(P.area); for(let i=0;i<P.orbit;i++){ const a=G.orbitA+i*TAU/P.orbit, ox=P.x+Math.cos(a)*R, oy=P.y+Math.sin(a)*R; drawGlow(ox,oy,22,'#ff8a2a',0.8); ctx.fillStyle='#ffe0a0'; ctx.beginPath(); ctx.arc(ox,oy,5,0,TAU); ctx.fill(); } }
  // projectiles
  for(const p of G.pproj) drawPProj(p);
  // fx
  for(const f of G.fx) drawFx(f);
  // particles
  ctx.globalCompositeOperation='lighter';
  for(const p of G.parts) if(p.glow) drawGlow(p.x,p.y,p.size*3*(p.life/p.max+0.3),p.color,Math.min(1,p.life/p.max*1.5));
  for(const m of G.amb){ const tw=0.5+0.5*Math.sin(m.ph*3); drawGlow(m.x,m.y,(visAct()===1?3:5)*m.s,actOf(run.act).mote,(visAct()===1?0.35:0.7)*tw); }
  ctx.globalCompositeOperation='source-over';
  for(const p of G.parts) if(!p.glow){ ctx.globalAlpha=Math.min(1,p.life/p.max*1.5); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(0.4+0.6*p.life/p.max),0,TAU); ctx.fill(); }
  ctx.globalAlpha=1;
  // gegnerische Geschosse ganz oben, damit sie im Getümmel nie verdeckt werden
  for(const p of G.eproj) drawEProj(p);
  // texts
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round'; ctx.miterLimit=2;
  for(const t of G.texts){ const s=(t.big?17:13)*(t.t<0.1?1+(0.1-t.t)*4:1); ctx.font=`800 ${s}px "Alegreya Sans", sans-serif`;
    ctx.globalAlpha=Math.min(1,(0.8-t.t)*3); ctx.lineWidth=3.5; ctx.strokeStyle='#000'; ctx.strokeText(t.s,t.x,t.y); ctx.fillStyle=t.c; ctx.fillText(t.s,t.x,t.y); }
  ctx.globalAlpha=1;
  ctx.restore();
  // screen space
  drawWeather(cx,cy);
  if(!G.over) drawIndicators(cx,cy);
  ctx.fillStyle=vignette; ctx.fillRect(0,0,W,H);
  const FL=save.settings.calm?0.3:1;
  if(G.whiteFlash>0){ ctx.fillStyle=`rgba(255,248,220,${G.whiteFlash*FL})`; ctx.fillRect(0,0,W,H); }
  if(G.over){ ctx.fillStyle=`rgba(10,0,0,${Math.min(0.55,G.deathT*0.5)})`; ctx.fillRect(0,0,W,H); }
  if(P && !G.over && P.hp<P.maxHp*0.25){ const pu=0.5+0.5*Math.sin(G.time*7); const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.7); g.addColorStop(0,'rgba(120,0,0,0)'); g.addColorStop(1,`rgba(150,10,10,${(0.25+0.2*pu)*(save.settings.calm?0.5:1)})`); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  if(G.hurtFlash>0){ ctx.fillStyle=`rgba(200,30,30,${G.hurtFlash*0.6*FL})`; ctx.fillRect(0,0,W,H); }
  if(P.hp<P.maxHp*0.25 && !G.over){ ctx.fillStyle=`rgba(160,0,0,${0.12+Math.sin(G.time*6)*0.06})`; ctx.fillRect(0,0,W,H); }
  drawCine();
  // joystick
  if(input.id===null && save.settings.joyFixed && INPUT_MODE==='touch'){ const jb=joyBase(); ctx.globalAlpha=0.28; ctx.strokeStyle='#efe2c4'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(jb.x,jb.y,JR,0,TAU); ctx.stroke(); ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.arc(jb.x,jb.y,20,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  if(input.id!==null){ ctx.globalAlpha=0.5; ctx.strokeStyle='#efe2c4'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(input.ox,input.oy,JR,0,TAU); ctx.stroke();
    ctx.fillStyle='rgba(239,226,196,0.12)'; ctx.fill(); ctx.globalAlpha=0.85; ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.arc(input.ox+input.jx*JR,input.oy+input.jy*JR,24,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  if(G.tut) drawTut();
  if(save.settings.showFps){ ctx.font='700 12px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='bottom'; ctx.fillStyle=PERF.fps<42?'#ff8a80':'#9fe6a0'; ctx.fillText(PERF.fps+' FPS'+(FX()?'':' · niedrig'),12,H-8); }
}

/* Begleiter zeichnen */
function drawPet(pt){
  const t=pt.t, fl=pt.face===Math.PI?-1:1;
  if(pt.kind==='wisp'){ const y=pt.y-22+Math.sin(t*3)*4; drawGlow(pt.x,y,34,'#9fd8ff',0.55+0.15*Math.sin(t*7)); drawGlow(pt.x,y,14,'#ffffff',0.9);
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(pt.x,y,3.2,0,TAU); ctx.fill();
    if(FX() && Math.random()<0.3) part(pt.x+rand(-6,6),y+rand(-6,6),rand(-10,10),rand(-20,-5),0.6,2,'#cfefff',true); return; }
  if(pt.kind==='raven'){ const y=pt.y-26+Math.sin(t*4)*3, w=Math.sin(t*(pt.lunge>0?30:12)); drawShadow(pt.x,pt.y+8,6);
    ctx.save(); ctx.translate(pt.x,y); ctx.scale(fl,1);
    ctx.fillStyle='#1a1a22'; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(-4,-10*w*s-2,-12,-4*w*s); ctx.lineTo(-3,3); ctx.fill(); }
    ctx.fillStyle='#24242e'; ctx.beginPath(); ctx.ellipse(0,0,7,4.5,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(6,-2,3.6,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-11,-1); ctx.lineTo(-11,3); ctx.fill();
    ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.moveTo(9,-2.5); ctx.lineTo(13,-1.5); ctx.lineTo(9,-0.5); ctx.fill(); ctx.fillStyle='#ffd04a'; ctx.fillRect(6.5,-3.5,1.4,1.4); ctx.restore(); return; }
  drawShadow(pt.x,pt.y+8,8);
  const st=pt.mv||pt.lunge>0?Math.sin(t*14):0;
  ctx.save(); ctx.translate(pt.x,pt.y); ctx.scale(fl,1);
  if(pt.kind==='cat'){ ctx.strokeStyle='#d07a2a'; ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-7,0); ctx.quadraticCurveTo(-13,-4,-11,-11+Math.sin(t*3)*2); ctx.stroke();
    ctx.lineWidth=2; for(const [x,o] of [[-4,st],[4,-st]]){ ctx.beginPath(); ctx.moveTo(x,2); ctx.lineTo(x+o*1.5,7); ctx.stroke(); }
    ctx.fillStyle='#e08a3a'; ctx.beginPath(); ctx.ellipse(0,0,8,4.5,0,0,TAU); ctx.fill(); ctx.fillStyle='#c8702a'; ctx.fillRect(-4,-4,1.6,4); ctx.fillRect(-1,-4.3,1.6,4);
    ctx.fillStyle='#e08a3a'; ctx.beginPath(); ctx.arc(7,-4,4.2,0,TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(4.5,-7); ctx.lineTo(5,-11.5); ctx.lineTo(7.5,-7.5); ctx.moveTo(8,-7.5); ctx.lineTo(10,-11); ctx.lineTo(10.5,-6); ctx.fill();
    ctx.fillStyle='#3a8a2a'; ctx.fillRect(7.6,-5.2,1.4,1.4); ctx.fillStyle='#ffb0b0'; ctx.fillRect(10.4,-3.6,1.2,1); ctx.restore(); return; }
  // Wolfswelpe
  ctx.strokeStyle='#8a8a94'; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-8,-1); ctx.quadraticCurveTo(-13,-5,-14,-1+Math.sin(t*6)*2); ctx.stroke();
  ctx.strokeStyle='#6a6a74'; ctx.lineWidth=2.4; for(const [x,o] of [[-5,st],[5,-st]]){ ctx.beginPath(); ctx.moveTo(x,2); ctx.lineTo(x+o*2,8); ctx.stroke(); }
  ctx.fillStyle='#9a9aa4'; ctx.beginPath(); ctx.ellipse(0,0,9,5,0,0,TAU); ctx.fill(); ctx.fillStyle='#d8d8e0'; ctx.beginPath(); ctx.ellipse(1,2,5,2.5,0,0,TAU); ctx.fill();
  ctx.fillStyle='#9a9aa4'; ctx.beginPath(); ctx.arc(8,-4,4.6,0,TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(11,-5); ctx.lineTo(15,-3); ctx.lineTo(11,-1.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5.5,-7.5); ctx.lineTo(6,-12); ctx.lineTo(8.5,-8); ctx.fill(); ctx.fillStyle='#1a1a22'; ctx.fillRect(9,-6,1.5,1.5); ctx.beginPath(); ctx.arc(15,-3,1.1,0,TAU); ctx.fill();
  ctx.restore();
}
function drawAlly(a){
  const fade=Math.min(1,a.life/0.8);
  ctx.globalAlpha=fade; drawGlow(a.x,a.y,22,'#2affb0',0.25); drawShadow(a.x,a.y+11,9);
  ctx.save(); ctx.translate(a.x,a.y); ctx.scale(0.85,0.85);
  ctx.save(); ctx.rotate(a.face); ctx.fillStyle='#9ab0a8'; ctx.beginPath(); ctx.moveTo(10,-1.3); ctx.lineTo(24,-1); ctx.lineTo(26,0); ctx.lineTo(24,1); ctx.lineTo(10,1.3); ctx.fill(); ctx.restore();
  blitSprite('ally',{t:a.t,face:a.face,mv:true,seed:0},false,false);
  ctx.restore(); ctx.globalAlpha=1;
}
function drawPillar(o){
  const A=actOf(run.act), h=50, w=o.r*0.82;
  drawShadow(o.x+6,o.y+4,o.r*1.15);
  ctx.fillStyle=A.pillar; ctx.beginPath(); ctx.ellipse(o.x,o.y,o.r,o.r*0.5,0,0,TAU); ctx.fill();
  ctx.fillRect(o.x-w,o.y-h,w*2,h);
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(o.x+w*0.3,o.y-h,w*0.7,h);
  ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(o.x-w,o.y-h,w*0.35,h);
  ctx.fillStyle=A.pillarTop; ctx.beginPath(); ctx.ellipse(o.x,o.y-h,o.r,o.r*0.5,0,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(o.x,o.y-h,o.r*0.65,o.r*0.32,0,0,TAU); ctx.stroke();
  ctx.globalAlpha=0.35+Math.sin(G.time*2+o.x)*0.15; ctx.fillStyle=A.accent; ctx.fillRect(o.x-2,o.y-h*0.7,4,10); ctx.globalAlpha=1;
}
function drawBarrel(o){
  drawShadow(o.x,o.y+10,13);
  ctx.fillStyle='#7a4a24'; ctx.beginPath(); ctx.ellipse(o.x,o.y+4,12,6,0,0,TAU); ctx.fill(); ctx.fillRect(o.x-12,o.y-14,24,18);
  ctx.fillStyle='#8f5a2c'; ctx.beginPath(); ctx.ellipse(o.x,o.y-14,12,6,0,0,TAU); ctx.fill();
  ctx.fillStyle='#3a3a42'; ctx.fillRect(o.x-12,o.y-10,24,3); ctx.fillRect(o.x-12,o.y-1,24,3);
  ctx.fillStyle='#c8423a'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✸',o.x,o.y-5);
}
function drawTrap(t){
  if(t.type==='spikes'){ const c=t.t%2.8, warn=c>1.6&&c<=2.1, up=c>2.1;
    ctx.fillStyle='#25252b'; ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,TAU); ctx.fill(); ctx.strokeStyle='#4a4a55'; ctx.lineWidth=2; ctx.stroke();
    if(warn) drawGlow(t.x,t.y,t.r*1.5,'#ff8a3a',0.35+0.3*Math.sin(G.time*30));
    for(let i=0;i<7;i++){ const a=i/7*TAU, rr=i?t.r*0.6:0, x=t.x+Math.cos(a)*rr, y=t.y+Math.sin(a)*rr*0.8;
      if(up){ ctx.fillStyle='#d6dae2'; ctx.beginPath(); ctx.moveTo(x-4,y+3); ctx.lineTo(x,y-11); ctx.lineTo(x+4,y+3); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle=warn?'#8a5a3a':'#121216'; ctx.beginPath(); ctx.arc(x,y,2.5,0,TAU); ctx.fill(); } } }
  else { const pl=Math.sin(G.time*2+t.x)*0.06;
    drawGlow(t.x,t.y,t.r*1.6,'#ff6a1a',0.45);
    ctx.fillStyle='#4a1206'; ctx.beginPath(); ctx.ellipse(t.x,t.y,t.r+5,(t.r+5)*0.8,0,0,TAU); ctx.fill();
    ctx.fillStyle='#c8380e'; ctx.beginPath(); ctx.ellipse(t.x,t.y,t.r,t.r*0.78,0,0,TAU); ctx.fill();
    ctx.fillStyle='#ff8a22'; ctx.globalAlpha=0.85; ctx.beginPath(); ctx.ellipse(t.x,t.y,t.r*(0.62+pl),t.r*(0.46+pl),0,0,TAU); ctx.fill();
    ctx.fillStyle='#ffd27a'; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.ellipse(t.x-t.r*0.15,t.y-t.r*0.1,t.r*0.25,t.r*0.15,0,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
}
function drawShadow(x,y,rx){ ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x,y,rx,rx*0.4,0,0,TAU); ctx.fill(); }

function drawHero(){
  const p=P, c=CHARS[p.cid], K=skinOf(p.cid);
  const bob=p.moving?Math.abs(Math.sin(p.anim))*-2.5:Math.sin(G.time*2.5)*0.7;
  if(p.inv>0 && Math.floor(G.time*20)%2) ctx.globalAlpha=0.45;
  drawShadow(p.x,p.y+13,14);
  { const tw=tierWon(p.cid); if(tw>=1 && !G.over){ const col=tierColor(tw), pu=0.5+0.5*Math.sin(G.time*3); ctx.strokeStyle=col; ctx.globalAlpha=(ctx.globalAlpha||1)*(0.35+0.25*pu); ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(p.x,p.y+13,17,6.5,0,0,TAU); ctx.stroke(); ctx.globalAlpha=1; if(tw>=10 && FX() && Math.random()<0.3) part(p.x+rand(-12,12),p.y+12,0,-50,0.6,2.5,'#ff7a2a',true); } }
  if(p.shieldLeft>0){ ctx.strokeStyle='rgba(127,212,255,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y-2,24+Math.sin(G.time*4),0,TAU); ctx.stroke(); }
  const lift=p.leap?Math.sin(Math.min(1,p.leap.t/p.leap.T)*Math.PI)*38:0;
  if(p.hornT>0){ drawGlow(p.x,p.y,30,'#ff5a3a',0.25+0.15*Math.sin(G.time*10)); }
  if(p.fury>0){ drawGlow(p.x,p.y-lift,24+p.fury*2.2,'#ff3a2a',0.12+p.fury*0.045); if(p.fury>=10 && Math.random()<0.4) part(p.x+rand(-10,10),p.y-lift+rand(-10,8),0,-60,0.5,3,'#ff5a2a',true); }
  ctx.save(); ctx.translate(p.x,p.y+bob-lift); ctx.scale(1.12,1.12);
  if(!G.over){ ctx.rotate(clamp((p.vx||0)/420,-0.16,0.16));
    if(p.dashT>0){ const da=p.dashA; ctx.rotate(da); ctx.scale(1.22,0.8); ctx.rotate(-da); }
    else if(!p.moving){ const br=Math.sin(G.time*3)*0.025; ctx.translate(0,12); ctx.scale(1-br*0.6,1+br); ctx.translate(0,-12); }
    if(p.swingT>0){ const k=p.swingT/0.18; ctx.translate(Math.cos(p.face)*4*k,Math.sin(p.face)*3*k); }
    if(p.hurtT>0){ const k=p.hurtT/0.25; ctx.translate(0,12); ctx.scale(1+0.12*k,1-0.12*k); ctx.translate(0,-12); } }
  if(G.over){ const k=Math.min(1,G.deathT*2.5); ctx.translate(0,8*k); ctx.rotate(k*Math.PI/2*(Math.cos(p.face)>0?-1:1)); ctx.globalAlpha=Math.max(0.15,1-G.deathT*0.9); }
  drawHeroFigure(p.cid,K,{ face:p.face, moving:p.moving&&!G.over, anim:p.anim, swing:p.swingT, t:G.time });
  if(p.hurtT>0){ ctx.globalCompositeOperation='lighter'; drawGlow(0,-3,26,'#ff2a2a',p.hurtT*3); ctx.globalCompositeOperation='source-over'; }
  ctx.restore(); ctx.globalAlpha=1;
  if(p.spin>0) drawWhirl(p);
  if(p.ward>0){ const k=Math.min(1,p.ward/0.3), pul=Math.sin(G.time*8)*2; ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(p.x,p.y-2,30,p.x,p.y-2,72+pul); g.addColorStop(0,'rgba(255,224,138,0)'); g.addColorStop(0.85,`rgba(255,224,138,${0.18*k})`); g.addColorStop(1,`rgba(255,250,220,${0.6*k})`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y-2,72+pul,0,TAU); ctx.fill();
    ctx.strokeStyle=`rgba(255,240,180,${0.7*k})`; ctx.lineWidth=1.5; for(let i=0;i<6;i++){ const a=G.time*2+i*TAU/6; ctx.beginPath(); ctx.arc(p.x,p.y-2,66+pul,a,a+0.5); ctx.stroke(); } ctx.restore(); }
  if(P.frost>0){ ctx.strokeStyle='rgba(160,220,255,0.18)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,110+30*P.frost,0,TAU); ctx.stroke(); }
}

/* Detaillierte Heldenfigur am Ursprung (Füße bei y≈13). Wird im Kampf und für Porträts genutzt. */
function hLin(x0,y0,x1,y1,cols){ const g=ctx.createLinearGradient(x0,y0,x1,y1); cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1),c)); return g; }
function hRad(x,y,r,cols){ const g=ctx.createRadialGradient(x-r*0.35,y-r*0.35,r*0.1,x,y,r); cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1),c)); return g; }
function hShade(c,a){ return shade(c,a); }
function drawHeroFigure(cid,K,o){
  const c=CHARS[cid], fx=Math.cos(o.face), fy=Math.sin(o.face), up=fy<-0.35, side=fx;
  const st=o.moving?Math.sin(o.anim):0, sway=o.moving?Math.sin(o.anim*0.5)*1.6:Math.sin(o.t*1.5)*0.5;
  const OL=FX()?()=>{ ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4; }:()=>{}, NO=()=>{ ctx.shadowBlur=0; };   // Umriss per Unschärfe nur bei hoher Grafik
  ctx.lineJoin='round'; ctx.lineCap='round';

  // ---------- Waffe ----------
  const weapon=()=>{ ctx.save(); NO();
    let a=o.face; if(c.attack==='melee'&&o.swing>0) a+=(o.swing/0.18-0.5)*2.4; if(c.attack==='axe'&&o.swing>0) a+=(o.swing/0.22-0.5)*2.0;
    ctx.translate(fx*6,fy*4-1); ctx.rotate(a);
    if(c.attack==='melee'){
      ctx.fillStyle='#3a2416'; ctx.fillRect(2,-1.8,8,3.6); ctx.strokeStyle='#6b4a2a'; ctx.lineWidth=0.8; for(let i=3;i<10;i+=2){ ctx.beginPath(); ctx.moveTo(i,-1.8); ctx.lineTo(i+1,1.8); ctx.stroke(); }
      ctx.fillStyle=hRad(1,0,2.6,['#ffe7a0',K.trim,'#7a5a1a']); ctx.beginPath(); ctx.arc(1,0,2.4,0,TAU); ctx.fill();
      ctx.fillStyle=hLin(10,-7,13,7,['#fff2c0',K.trim,'#8a6a2a']); ctx.beginPath(); ctx.moveTo(10,-7); ctx.lineTo(13,-6); ctx.lineTo(13,6); ctx.lineTo(10,7); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#c8202a'; ctx.beginPath(); ctx.arc(11.5,0,1.3,0,TAU); ctx.fill();
      ctx.fillStyle=hLin(0,-3,0,3,['#ffffff','#cfd6e0','#8a94a4']); ctx.beginPath(); ctx.moveTo(13,-3); ctx.lineTo(37,-2.4); ctx.lineTo(43,0); ctx.lineTo(37,2.4); ctx.lineTo(13,3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(90,100,115,0.8)'; ctx.lineWidth=0.9; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(35,0); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=0.6; ctx.beginPath(); ctx.moveTo(14,-2.4); ctx.lineTo(37,-2); ctx.stroke(); }
    else if(c.attack==='bolt'){
      ctx.fillStyle=hLin(0,-2,0,2,['#a0784a','#6b4a2a','#3a2414']); ctx.fillRect(-2,-1.7,30,3.4);
      ctx.fillStyle=K.trim; for(const x of [6,18,25]) ctx.fillRect(x,-2.2,1.6,4.4);
      ctx.strokeStyle=K.trim; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(27,-3); ctx.quadraticCurveTo(33,-7,35,-1); ctx.moveTo(27,3); ctx.quadraticCurveTo(33,7,35,1); ctx.stroke();
      drawGlow(33,0,16,'#c58cff',0.9);
      ctx.fillStyle=hLin(30,-4,36,4,['#ffffff','#e0c0ff','#9a5ae0']); ctx.beginPath(); ctx.moveTo(33,-4.5); ctx.lineTo(36,0); ctx.lineTo(33,4.5); ctx.lineTo(30,0); ctx.closePath(); ctx.fill(); }
    else if(c.attack==='skull'){
      ctx.fillStyle=hLin(0,-2,0,2,['#4a4a52','#2a2a30','#141418']); ctx.fillRect(-2,-1.6,30,3.2);
      ctx.strokeStyle='#d8d0c0'; ctx.lineWidth=1; for(const x of [8,14]){ ctx.beginPath(); ctx.moveTo(x,-2.5); ctx.lineTo(x+2,2.5); ctx.stroke(); }
      drawGlow(34,0,16,K.eye,0.85);
      ctx.fillStyle=hRad(34,-0.5,5.5,['#ffffff','#e8f0e8','#a8b0a8']); ctx.beginPath(); ctx.arc(34,-0.5,5,0,TAU); ctx.fill(); ctx.fillRect(31.5,2.5,5,3);
      ctx.fillStyle='#0a1a14'; ctx.beginPath(); ctx.arc(32.3,-1,1.3,0,TAU); ctx.arc(35.7,-1,1.3,0,TAU); ctx.fill();
      ctx.fillStyle=K.eye; ctx.beginPath(); ctx.arc(32.3,-1,0.6,0,TAU); ctx.arc(35.7,-1,0.6,0,TAU); ctx.fill(); }
    else if(c.attack==='hammer'){
      ctx.fillStyle=hLin(0,-2,0,2,['#a0784a','#6b4a2a','#3a2414']); ctx.fillRect(0,-1.5,25,3); ctx.fillStyle=K.trim; ctx.fillRect(1,-1.9,3,3.8); ctx.fillRect(20,-1.9,2,3.8);
      ctx.fillStyle=hLin(22,-8,30,8,['#ffffff','#c8ccd4','#5a5e68']); ctx.fillRect(22,-7,9,14); ctx.fillStyle=K.hat; ctx.fillRect(22,-2,9,4);
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(23,-6,1.4,12); drawGlow(26,0,10,'#ffe08a',0.35); }
    else if(c.attack==='flask'){
      ctx.fillStyle=hLin(0,-3,0,3,['#6a4a2a','#3a2414']); ctx.fillRect(-1,-1.6,8,3.2);
      drawGlow(12,0,12,'#8dff6a',0.7); ctx.fillStyle=hRad(12,1,5.5,['#e8ffd0','#8dff6a','#2a8a1a']); ctx.beginPath(); ctx.arc(12,1,5,0,TAU); ctx.fill();
      ctx.fillStyle='#cfe6f0'; ctx.fillRect(10.4,-7,3.2,4.5); ctx.fillStyle='#8a5a2a'; ctx.fillRect(10.2,-8.6,3.6,2);
      ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(10.3,-0.5,1.3,0,TAU); ctx.fill(); }
    else if(c.attack==='axe'){
      ctx.fillStyle=hLin(0,-2,0,2,['#8a6a40','#5a3a1e','#2a1a0c']); ctx.fillRect(-2,-1.7,32,3.4); ctx.fillStyle='#2a1a10'; for(const x of [2,6,10]) ctx.fillRect(x,-2,1.4,4);
      ctx.fillStyle=hLin(24,-12,34,12,['#ffffff','#b8c0c8','#5a606a']);
      for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(24,s*1.6); ctx.quadraticCurveTo(24,s*8,22,s*12.5); ctx.quadraticCurveTo(29,s*10,33.5,s*12); ctx.quadraticCurveTo(31,s*6,30,s*1.6); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=0.7; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(22.5,s*12); ctx.quadraticCurveTo(29,s*10,33,s*11.6); ctx.stroke(); }
      ctx.fillStyle=K.trim; ctx.fillRect(25.5,-2.2,4,4.4); ctx.fillStyle='#8a1a1a'; ctx.fillRect(31,-1,2,2); }
    else {
      const draw=o.swing>0?2:0;
      ctx.strokeStyle=hLin(8,-16,8,16,['#c89a5a','#7a5230','#c89a5a']); ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(6,-15); ctx.quadraticCurveTo(18,-8,13,0); ctx.quadraticCurveTo(18,8,6,15); ctx.stroke();
      ctx.strokeStyle=K.trim; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(13.5,-2); ctx.lineTo(13.5,2); ctx.stroke();
      ctx.strokeStyle='#f4ecd8'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(6,-15); ctx.lineTo(6-draw*2,0); ctx.lineTo(6,15); ctx.stroke();
      ctx.strokeStyle='#d8c4a0'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(4-draw*2,0); ctx.lineTo(20,0); ctx.stroke();
      ctx.fillStyle='#cfd6e0'; ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(19,-1.6); ctx.lineTo(19,1.6); ctx.fill(); }
    ctx.restore(); };

  // ---------- Beine und Stiefel ----------
  const legs=()=>{ OL();
    for(const [s,ph] of [[-1,st],[1,-st]]){ const fx0=s*4.2, fy0=12+ph*2.2;
      ctx.fillStyle=hShade(c.attack==='melee'||cid==='paladin'?'#4a4e5a':cid==='berserk'?'#5a4030':K.body,-30); ctx.beginPath(); ctx.moveTo(fx0-2.4,5); ctx.lineTo(fx0+2.4,5); ctx.lineTo(fx0+2.2,fy0-1); ctx.lineTo(fx0-2.2,fy0-1); ctx.closePath(); ctx.fill();
      ctx.fillStyle=hLin(0,fy0-4,0,fy0+2,['#5a3e2a','#2a1c14']); ctx.beginPath(); ctx.ellipse(fx0+side*0.8,fy0,3.4,2.6,0,0,TAU); ctx.fill(); ctx.fillRect(fx0-2.6,fy0-4,5.2,4);
      ctx.fillStyle='rgba(255,230,190,0.18)'; ctx.fillRect(fx0-2,fy0-3.6,1.2,3); }
    NO(); };

  // ---------- Umhang ----------
  const cape=(front)=>{ OL();
    ctx.fillStyle=hLin(-12,-6,12,14,[hShade(K.cape,30),K.cape,hShade(K.cape,-45)]);
    ctx.beginPath(); ctx.moveTo(-10.5,-7); ctx.quadraticCurveTo(-15+sway,6,-12+sway,15); ctx.lineTo(-6+sway,13.5); ctx.lineTo(-1+sway,15.5); ctx.lineTo(4+sway,13.5); ctx.lineTo(11+sway,15); ctx.quadraticCurveTo(15+sway,6,10.5,-7); ctx.closePath(); ctx.fill(); NO();
    ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=1.1; for(const x of [-6,-1,4]){ ctx.beginPath(); ctx.moveTo(x*0.6,-4); ctx.quadraticCurveTo(x+sway*0.6,6,x+sway,14); ctx.stroke(); }
    if(front){ ctx.strokeStyle=K.trim; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-12+sway,15); ctx.lineTo(-6+sway,13.5); ctx.lineTo(-1+sway,15.5); ctx.lineTo(4+sway,13.5); ctx.lineTo(11+sway,15); ctx.stroke(); } };

  // ---------- Körper ----------
  const body=()=>{ OL();
    if(cid==='krieger'){
      ctx.fillStyle=hLin(-9,-7,9,9,['#f4f7fb',K.body,hShade(K.body,-55)]); ctx.beginPath(); ctx.moveTo(-8.5,-6); ctx.quadraticCurveTo(-10,4,-7,9); ctx.lineTo(7,9); ctx.quadraticCurveTo(10,4,8.5,-6); ctx.quadraticCurveTo(0,-9,-8.5,-6); ctx.fill(); NO();
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(0,6); ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(-6.5,1); ctx.quadraticCurveTo(0,3,6.5,1); ctx.stroke();
      ctx.fillStyle=hLin(-4,0,4,14,[hShade(K.cape,20),K.cape,hShade(K.cape,-40)]); ctx.beginPath(); ctx.moveTo(-4,3); ctx.lineTo(4,3); ctx.lineTo(3.4,13); ctx.lineTo(0,14.5); ctx.lineTo(-3.4,13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=K.trim; ctx.lineWidth=0.8; ctx.stroke(); ctx.fillStyle=K.trim; ctx.fillRect(-0.6,6,1.2,5); ctx.fillRect(-2,7.4,4,1.2);
      ctx.fillStyle=K.belt||'#5a3a22'; ctx.fillRect(-8,3,16,2.6); ctx.fillStyle=hLin(-2,3,2,6,['#fff0b0','#c89a3a']); ctx.fillRect(-2,2.6,4,3.4); ctx.fillStyle='#3a2416'; ctx.fillRect(-1,3.6,2,1.4);
      for(const s of [-1,1]){ OL(); ctx.fillStyle=hRad(s*8.5,-4.5,5,['#ffffff',K.hat,hShade(K.hat,-60)]); ctx.beginPath(); ctx.ellipse(s*8.5,-4.5,4.6,3.8,s*0.3,0,TAU); ctx.fill(); NO();
        ctx.strokeStyle=hShade(K.hat,-70); ctx.lineWidth=0.7; ctx.beginPath(); ctx.ellipse(s*8.5,-3.8,3.8,2.6,s*0.3,0,Math.PI); ctx.stroke();
        ctx.fillStyle='#e6c870'; ctx.beginPath(); ctx.arc(s*10,-5,0.7,0,TAU); ctx.arc(s*7,-6,0.7,0,TAU); ctx.fill();
        ctx.fillStyle=hRad(s*9.5,3,2.6,['#ffffff',K.body,hShade(K.body,-50)]); ctx.beginPath(); ctx.arc(s*9.5,3+(s<0?st:-st)*1.5,2.4,0,TAU); ctx.fill(); } }
    else if(cid==='magier'){
      ctx.fillStyle=hLin(-10,-6,10,14,[hShade(K.body,40),K.body,hShade(K.body,-45)]); ctx.beginPath(); ctx.moveTo(-6.5,-6); ctx.lineTo(-11,13.5); ctx.quadraticCurveTo(0,15.5,11,13.5); ctx.lineTo(6.5,-6); ctx.quadraticCurveTo(0,-8,-6.5,-6); ctx.fill(); NO();
      ctx.strokeStyle=K.trim; ctx.lineWidth=1.3; ctx.beginPath(); ctx.moveTo(-11,13.2); ctx.quadraticCurveTo(0,15.2,11,13.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(0,14.5); ctx.stroke();
      ctx.fillStyle=K.trim; for(const [x,y] of [[-5,9],[4.5,6],[-3,2]]){ ctx.beginPath(); for(let i=0;i<5;i++){ const a=i/5*TAU-Math.PI/2, a2=a+TAU/10; ctx.lineTo(x+Math.cos(a)*1.3,y+Math.sin(a)*1.3); ctx.lineTo(x+Math.cos(a2)*0.5,y+Math.sin(a2)*0.5); } ctx.fill(); }
      ctx.fillStyle=hShade(K.body,-25); ctx.fillRect(-7,1.5,14,2); ctx.fillStyle=K.trim; ctx.beginPath(); ctx.arc(0,2.5,1.5,0,TAU); ctx.fill();
      for(const s of [-1,1]){ OL(); ctx.fillStyle=hLin(s*6,-5,s*13,7,[hShade(K.body,30),hShade(K.body,-30)]); ctx.beginPath(); ctx.moveTo(s*6,-5); ctx.quadraticCurveTo(s*12,0,s*12.5,6); ctx.lineTo(s*7.5,6.5); ctx.quadraticCurveTo(s*7,1,s*5,-1); ctx.closePath(); ctx.fill(); NO();
        ctx.strokeStyle=K.trim; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(s*12.5,6); ctx.lineTo(s*7.5,6.5); ctx.stroke();
        ctx.fillStyle=K.skin; ctx.beginPath(); ctx.arc(s*10,7.6,1.8,0,TAU); ctx.fill(); }
      ctx.fillStyle=K.collar||'#e8e0f0'; ctx.beginPath(); ctx.moveTo(-5,-6.5); ctx.lineTo(0,-2.5); ctx.lineTo(5,-6.5); ctx.lineTo(3,-7.5); ctx.lineTo(0,-5); ctx.lineTo(-3,-7.5); ctx.closePath(); ctx.fill(); }
    else if(cid==='jaegerin'){
      ctx.fillStyle=hLin(-9,-6,9,10,[hShade(K.body,35),K.body,hShade(K.body,-40)]); ctx.beginPath(); ctx.moveTo(-7.5,-6); ctx.quadraticCurveTo(-9.5,3,-7,9.5); ctx.lineTo(7,9.5); ctx.quadraticCurveTo(9.5,3,7.5,-6); ctx.quadraticCurveTo(0,-8.5,-7.5,-6); ctx.fill(); NO();
      ctx.strokeStyle='#e8d8b0'; ctx.lineWidth=0.6; for(let y=-4;y<3;y+=2){ ctx.beginPath(); ctx.moveTo(-1.2,y); ctx.lineTo(1.2,y+1); ctx.moveTo(1.2,y); ctx.lineTo(-1.2,y+1); ctx.stroke(); }
      ctx.fillStyle=K.trim; ctx.beginPath(); ctx.moveTo(-7.5,-6); ctx.lineTo(-4,-2); ctx.lineTo(-4,8); ctx.lineTo(-7.3,9); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(7.5,-6); ctx.lineTo(4,-2); ctx.lineTo(4,8); ctx.lineTo(7.3,9); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#3a2414'; ctx.fillRect(-7.5,4,15,2.2); ctx.fillStyle='#c8a050'; ctx.fillRect(-1.2,3.7,2.4,2.8);
      ctx.fillStyle=hLin(4,5,9,11,['#8a6a3a','#4a3018']); ctx.beginPath(); ctx.ellipse(6,8,2.6,2.2,0,0,TAU); ctx.fill();
      for(const s of [-1,1]){ ctx.fillStyle=K.skin; ctx.beginPath(); ctx.arc(s*9,3+(s<0?st:-st)*1.5,1.9,0,TAU); ctx.fill(); ctx.fillStyle='#5a3a1e'; ctx.fillRect(s*9-1.8,-1+(s<0?st:-st)*1.5,3.6,2.6); } }
    else if(cid==='paladin'){
      ctx.fillStyle=hLin(-9,-7,9,9,['#fff8e0',K.body,hShade(K.body,-55)]); ctx.beginPath(); ctx.moveTo(-8.5,-6); ctx.quadraticCurveTo(-10,4,-7,9); ctx.lineTo(7,9); ctx.quadraticCurveTo(10,4,8.5,-6); ctx.quadraticCurveTo(0,-9,-8.5,-6); ctx.fill(); NO();
      ctx.fillStyle=hLin(-5,-4,5,14,['#ffffff',K.cape,hShade(K.cape,-45)]); ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(5,-5); ctx.lineTo(5.5,13); ctx.lineTo(0,15); ctx.lineTo(-5.5,13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=K.trim; ctx.lineWidth=0.9; ctx.stroke();
      ctx.strokeStyle=K.hat2; ctx.lineWidth=0.9; for(let i=0;i<8;i++){ const a=i/8*TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a)*2.4,1.5+Math.sin(a)*2.4); ctx.lineTo(Math.cos(a)*4.3,1.5+Math.sin(a)*4.3); ctx.stroke(); }
      ctx.fillStyle=hRad(0,1.5,2.4,['#fff8c0',K.hat,K.hat2]); ctx.beginPath(); ctx.arc(0,1.5,2.2,0,TAU); ctx.fill();
      ctx.fillStyle=K.belt||'#5a3a22'; ctx.fillRect(-8,7,16,2.2); ctx.fillStyle=K.hat; ctx.fillRect(-1.6,6.6,3.2,3);
      for(const s of [-1,1]){ OL(); ctx.fillStyle=hRad(s*8.5,-4.5,5.2,['#ffffff',K.hat,hShade(K.hat,-60)]); ctx.beginPath(); ctx.ellipse(s*8.6,-4.4,5,4,s*0.3,0,TAU); ctx.fill(); NO();
        ctx.strokeStyle=K.trim; ctx.lineWidth=0.8; ctx.beginPath(); ctx.ellipse(s*8.6,-3.8,4,2.8,s*0.3,0,Math.PI); ctx.stroke();
        ctx.fillStyle=hRad(s*9.5,3,2.6,['#ffffff',K.body,hShade(K.body,-50)]); ctx.beginPath(); ctx.arc(s*9.5,3+(s<0?st:-st)*1.5,2.5,0,TAU); ctx.fill(); } }
    else if(cid==='alchi'){
      ctx.fillStyle=hLin(-10,-6,10,14,[hShade(K.body,35),K.body,hShade(K.body,-40)]); ctx.beginPath(); ctx.moveTo(-7,-6); ctx.lineTo(-10,12); ctx.quadraticCurveTo(0,14.5,10,12); ctx.lineTo(7,-6); ctx.quadraticCurveTo(0,-8.5,-7,-6); ctx.fill(); NO();
      ctx.fillStyle=hLin(-6,-3,6,13,['#ffffff',K.apron,hShade(K.apron,-40)]); ctx.beginPath(); ctx.moveTo(-5,-3); ctx.lineTo(5,-3); ctx.lineTo(6.5,12.5); ctx.quadraticCurveTo(0,13.8,-6.5,12.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=hShade(K.apron,-50); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-5,-3); ctx.lineTo(-5.5,-7); ctx.moveTo(5,-3); ctx.lineTo(5.5,-7); ctx.stroke();
      ctx.fillStyle='rgba(120,200,60,0.5)'; ctx.beginPath(); ctx.arc(-2,8,1.6,0,TAU); ctx.arc(2.5,4,1.1,0,TAU); ctx.fill(); ctx.fillStyle='rgba(160,60,200,0.45)'; ctx.beginPath(); ctx.arc(1.5,10,1.3,0,TAU); ctx.fill();
      ctx.fillStyle='#3a2414'; ctx.fillRect(-8.5,2.5,17,2.2);
      [['#ff5a5a',-7.2],['#5ab8ff',-5],['#ffd04a',6]].forEach(([col,x])=>{ ctx.fillStyle=col; ctx.fillRect(x-1,3.5,2.2,3.6); ctx.fillStyle='#e8e8e8'; ctx.fillRect(x-0.6,2,1.4,1.6); });
      for(const s of [-1,1]){ ctx.fillStyle=hShade(K.cape,10); ctx.beginPath(); ctx.ellipse(s*8.3,-3.5,3.4,3,0,0,TAU); ctx.fill(); ctx.fillStyle=K.skin; ctx.beginPath(); ctx.arc(s*9.3,3.6+(s<0?st:-st)*1.5,1.8,0,TAU); ctx.fill(); } }
    else if(cid==='berserk'){
      for(const s of [-1,1]){ ctx.fillStyle=hRad(s*9,2,3.5,[hShade(K.skin,20),K.skin,hShade(K.skin,-35)]); ctx.beginPath(); ctx.ellipse(s*9,1+(s<0?st:-st)*1.2,2.8,5.5,0,0,TAU); ctx.fill();
        ctx.strokeStyle=K.paint; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(s*7.8,-1); ctx.lineTo(s*10.2,0); ctx.moveTo(s*7.8,1.5); ctx.lineTo(s*10.2,2.5); ctx.stroke();
        ctx.fillStyle='#3a2416'; ctx.fillRect(s*9-2.8,4+(s<0?st:-st)*1.2,5.6,2.6); }
      OL(); ctx.fillStyle=hLin(-8,-6,8,10,[hShade(K.body,35),K.body,hShade(K.body,-45)]); ctx.beginPath(); ctx.moveTo(-7,-5); ctx.quadraticCurveTo(-8.5,4,-6.5,9.5); ctx.lineTo(6.5,9.5); ctx.quadraticCurveTo(8.5,4,7,-5); ctx.quadraticCurveTo(0,-7,-7,-5); ctx.fill(); NO();
      ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=0.8; for(const y of [-1,2,5]){ ctx.beginPath(); ctx.moveTo(-6,y); ctx.lineTo(6,y); ctx.stroke(); }
      ctx.fillStyle='#d8c8a0'; for(const [x,y] of [[-5,-3],[5,-3],[-5,3],[5,3]]){ ctx.beginPath(); ctx.arc(x,y,0.7,0,TAU); ctx.fill(); }
      ctx.fillStyle='#2a1a10'; ctx.fillRect(-7.5,6,15,2.6); ctx.fillStyle='#e8e2d0'; ctx.beginPath(); ctx.arc(0,7.3,2,0,TAU); ctx.fill(); ctx.fillStyle='#1a0a00'; ctx.fillRect(-1,6.6,0.8,0.8); ctx.fillRect(0.3,6.6,0.8,0.8);
      OL(); for(let i=0;i<7;i++){ const x=-9+i*3; ctx.fillStyle=i%2?hShade(K.cape,25):K.cape; ctx.beginPath(); ctx.arc(x,-6+Math.abs(x)*0.08,3.2,0,TAU); ctx.fill(); } NO(); }
    else {
      ctx.fillStyle=hLin(-10,-6,10,14,[hShade(K.body,35),K.body,hShade(K.body,-35)]); ctx.beginPath(); ctx.moveTo(-6.5,-6); ctx.lineTo(-11,12); ctx.lineTo(-8,14.5); ctx.lineTo(-5,12.5); ctx.lineTo(-2,15); ctx.lineTo(1,12.5); ctx.lineTo(4,15); ctx.lineTo(7,12.5); ctx.lineTo(11,14); ctx.lineTo(6.5,-6); ctx.quadraticCurveTo(0,-8,-6.5,-6); ctx.fill(); NO();
      ctx.strokeStyle='rgba(230,240,230,0.75)'; ctx.lineWidth=0.9; for(let i=0;i<3;i++){ const y=-3+i*2.6; ctx.beginPath(); ctx.moveTo(-4.5+i*0.6,y); ctx.quadraticCurveTo(0,y+1.6,4.5-i*0.6,y); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(0,5); ctx.stroke();
      ctx.fillStyle=K.trim; ctx.fillRect(-7,5.5,14,1.6); ctx.fillStyle='#e8f0e8'; ctx.beginPath(); ctx.arc(0,6.3,1.8,0,TAU); ctx.fill(); ctx.fillStyle='#0a1a14'; ctx.fillRect(-0.9,5.8,0.7,0.7); ctx.fillRect(0.3,5.8,0.7,0.7);
      OL(); ctx.fillStyle=hRad(-7.5,-5,3.4,['#ffffff','#d8dcd0','#8a9088']); ctx.beginPath(); ctx.arc(-7.5,-5,3,0,TAU); ctx.fill(); NO();
      ctx.fillStyle='#1a1a20'; ctx.beginPath(); ctx.arc(-8.4,-5.3,0.8,0,TAU); ctx.arc(-6.6,-5.3,0.8,0,TAU); ctx.fill();
      for(const s of [-1,1]){ ctx.fillStyle=K.skin; ctx.beginPath(); ctx.arc(s*9,4+(s<0?st:-st)*1.5,1.7,0,TAU); ctx.fill(); } }
  };

  // ---------- Kopf ----------
  const head=()=>{
    const hx=side*1.2, hy=-11.5;
    if(cid==='alchi'){ ctx.fillStyle=hShade(K.hair,-15); for(const [x,y,q] of [[-7,-14,4.5],[7,-14,4.5],[-8.5,-8,4],[8.5,-8,4],[-6,-3,3.6],[6,-3,3.6],[0,-19,4.5]]){ ctx.beginPath(); ctx.arc(hx*0.5+x,hy+11.5+y,q,0,TAU); ctx.fill(); } }
    if(cid==='berserk'){ ctx.strokeStyle=K.hair; ctx.lineWidth=3; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(hx*0.5+s*6,hy+2); ctx.quadraticCurveTo(hx*0.5+s*8-sway*0.5,hy+10,hx*0.5+s*6.5-sway,hy+17); ctx.stroke(); ctx.fillStyle='#d8c8a0'; ctx.fillRect(hx*0.5+s*6.5-sway-1.5,hy+15,3,2); } }
    if(cid==='magier' || cid==='jaegerin'){ // Haare hinter dem Kopf
      ctx.fillStyle=cid==='magier'?hLin(0,-18,0,2,['#fbf4e4','#d8c8a8']):hLin(0,-18,0,2,['#c8642a','#7a3214']);
      ctx.beginPath(); ctx.moveTo(-8,-14); ctx.quadraticCurveTo(-10,-2,-6,cid==='magier'?2:-2); ctx.lineTo(6,cid==='magier'?2:-2); ctx.quadraticCurveTo(10,-2,8,-14); ctx.closePath(); ctx.fill();
      if(cid==='jaegerin'){ ctx.strokeStyle='#8a3e18'; ctx.lineWidth=2.6; ctx.beginPath(); ctx.moveTo(-side*6,-5); ctx.quadraticCurveTo(-side*9-sway,2,-side*7-sway,8); ctx.stroke(); } }
    OL(); ctx.fillStyle=up?(cid==='krieger'?K.hat:cid==='nekro'?K.hat:K.hat):hRad(hx,hy,8.2,[hShade(K.skin,25),K.skin,hShade(K.skin,-35)]);
    ctx.beginPath(); ctx.arc(hx*0.5,hy,7.8,0,TAU); ctx.fill(); NO();
    if(!up){
      const ex=hx*1.3, ey=hy+0.5, pup=side*0.5;
      if(cid==='nekro'){ for(const s of [-1,1]){ ctx.fillStyle='#1a1418'; ctx.beginPath(); ctx.ellipse(ex+s*2.8,ey,1.9,1.3,0,0,TAU); ctx.fill(); drawGlow(ex+s*2.8+pup,ey,4,K.eye,0.9); ctx.fillStyle=K.eye; ctx.beginPath(); ctx.arc(ex+s*2.8+pup,ey,0.8,0,TAU); ctx.fill(); }
        ctx.strokeStyle='rgba(60,40,70,0.6)'; ctx.lineWidth=0.6; ctx.beginPath(); ctx.moveTo(ex-1,ey+4); ctx.lineTo(ex+1,ey+4); ctx.stroke(); }
      else if(cid!=='krieger'){
        for(const s of [-1,1]){ ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.ellipse(ex+s*2.8,ey,1.7,1.4,0,0,TAU); ctx.fill();
          ctx.fillStyle=cid==='magier'?'#6a4ac8':'#3a7a3a'; ctx.beginPath(); ctx.arc(ex+s*2.8+pup,ey+0.1,1.05,0,TAU); ctx.fill();
          ctx.fillStyle='#120a08'; ctx.beginPath(); ctx.arc(ex+s*2.8+pup,ey+0.1,0.5,0,TAU); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(ex+s*2.8+pup-0.6,ey-0.7,0.5,0.5);
          ctx.strokeStyle='#2a1810'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(ex+s*2.8-1.7,ey-0.4); ctx.quadraticCurveTo(ex+s*2.8,ey-1.8,ex+s*2.8+1.7,ey-0.4); ctx.stroke();
          ctx.strokeStyle=cid==='magier'?'#c8b898':'#7a3214'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(ex+s*1.4,ey-2.6); ctx.lineTo(ex+s*4.2,ey-2.3-0.4); ctx.stroke(); }
        ctx.fillStyle='rgba(230,120,110,0.32)'; ctx.beginPath(); ctx.ellipse(ex-4,ey+2.6,1.6,1,0,0,TAU); ctx.ellipse(ex+4,ey+2.6,1.6,1,0,0,TAU); ctx.fill();
        ctx.strokeStyle='rgba(150,80,60,0.7)'; ctx.lineWidth=0.6; ctx.beginPath(); ctx.moveTo(ex+side*0.6,ey+1.2); ctx.lineTo(ex+side*1.2,ey+2.4); ctx.stroke();
        ctx.strokeStyle='#8a3a3a'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(ex-1.3,ey+4.1); ctx.quadraticCurveTo(ex,ey+4.8,ex+1.3,ey+4.1); ctx.stroke(); }
    }
    // Kopfbedeckung
    if(cid==='krieger'){ OL();
      ctx.fillStyle=hLin(-8,-21,8,-8,['#ffffff',K.hat,hShade(K.hat,-60)]); ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,8.6,Math.PI*0.98,Math.PI*0.02); ctx.lineTo(hx*0.5+8.8,hy+5.5); ctx.lineTo(hx*0.5+5,hy+7); ctx.lineTo(hx*0.5-5,hy+7); ctx.lineTo(hx*0.5-8.8,hy+5.5); ctx.closePath(); ctx.fill(); NO();
      if(!up){ ctx.fillStyle='#0e0c12'; ctx.beginPath(); ctx.moveTo(hx*1.3-6,hy+0.2); ctx.lineTo(hx*1.3+6,hy+0.2); ctx.lineTo(hx*1.3+5.4,hy+1.8); ctx.lineTo(hx*1.3+1,hy+1.8); ctx.lineTo(hx*1.3+1,hy+6.6); ctx.lineTo(hx*1.3-1,hy+6.6); ctx.lineTo(hx*1.3-1,hy+1.8); ctx.lineTo(hx*1.3-5.4,hy+1.8); ctx.closePath(); ctx.fill();
        for(const s of [-1,1]) drawGlow(hx*1.3+s*3.2,hy+1,2.6,'#9fd8ff',0.55); }
      ctx.strokeStyle=hShade(K.hat2,-20); ctx.lineWidth=1; ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,8.6,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(hx*0.5-3,hy-5,2.2,1.2,-0.5,0,TAU); ctx.fill();
      ctx.fillStyle=K.hat2; ctx.fillRect(hx*0.5-1,hy-11,2,4);
      ctx.fillStyle=hLin(0,-26,-12,-14,[hShade(K.plume,40),K.plume,hShade(K.plume,-40)]); ctx.beginPath(); ctx.moveTo(hx*0.5,hy-10); ctx.quadraticCurveTo(hx*0.5-6,hy-17+sway*0.3,hx*0.5-13-sway,hy-7); ctx.quadraticCurveTo(hx*0.5-8,hy-11,hx*0.5,hy-8); ctx.fill(); }
    else if(cid==='magier'){ OL();
      ctx.fillStyle=hLin(-12,-16,12,-12,[hShade(K.hat,20),K.hat,hShade(K.hat,-40)]); ctx.beginPath(); ctx.ellipse(hx*0.5,hy-3,12.5,3.6,0,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx*0.5-7.5,hy-4); ctx.quadraticCurveTo(hx*0.5-3,hy-14,hx*0.5+2+sway*0.4,hy-21); ctx.quadraticCurveTo(hx*0.5+9+sway,hy-22,hx*0.5+10+sway,hy-17); ctx.quadraticCurveTo(hx*0.5+6,hy-17,hx*0.5+5,hy-14); ctx.quadraticCurveTo(hx*0.5+6,hy-9,hx*0.5+7.5,hy-4); ctx.closePath(); ctx.fill(); NO();
      ctx.fillStyle=K.hat2; ctx.beginPath(); ctx.moveTo(hx*0.5-7.4,hy-5.5); ctx.quadraticCurveTo(hx*0.5,hy-7.6,hx*0.5+7.4,hy-5.5); ctx.lineTo(hx*0.5+7.6,hy-3.8); ctx.quadraticCurveTo(hx*0.5,hy-5.8,hx*0.5-7.6,hy-3.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle=hShade(K.hat2,-30); ctx.fillRect(hx*0.5-1.4,hy-6.6,2.8,2.6); ctx.fillStyle='#fff6c0'; ctx.beginPath(); ctx.arc(hx*0.5+2,hy-12,1.2,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(hx*0.5-3,hy-10,1.5,4,0.3,0,TAU); ctx.fill(); }
    else if(cid==='jaegerin'){ OL();
      ctx.fillStyle=hLin(-10,-20,10,0,[hShade(K.hat,30),K.hat,hShade(K.hat,-45)]);
      ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,9.6,Math.PI*0.93,Math.PI*0.07); ctx.quadraticCurveTo(hx*0.5+10.5,hy+8,hx*0.5+6.5,hy+8.5); ctx.lineTo(hx*0.5+6,hy-1.5); ctx.quadraticCurveTo(hx*0.5,hy-6.5,hx*0.5-6,hy-1.5); ctx.lineTo(hx*0.5-6.5,hy+8.5); ctx.quadraticCurveTo(hx*0.5-10.5,hy+8,hx*0.5-9.6,hy); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx*0.5-3,hy-9); ctx.quadraticCurveTo(hx*0.5-9-sway,hy-15,hx*0.5-15-sway,hy-10); ctx.quadraticCurveTo(hx*0.5-9,hy-9,hx*0.5-5,hy-6); ctx.fill(); NO();
      if(!up){ ctx.fillStyle='#b8541e'; ctx.beginPath(); ctx.moveTo(hx*0.5-5.5,hy-2); ctx.quadraticCurveTo(hx*0.5,hy-5.5,hx*0.5+5.5,hy-2); ctx.lineTo(hx*0.5+4,hy-0.8); ctx.lineTo(hx*0.5+1,hy-2.4); ctx.lineTo(hx*0.5-2,hy-0.6); ctx.lineTo(hx*0.5-4.5,hy-1.2); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,8,Math.PI*1.1,Math.PI*1.9); ctx.stroke(); }
    else if(cid==='paladin'){ OL();
      ctx.fillStyle=hLin(0,-20,0,-4,[hShade(K.hair,35),K.hair,hShade(K.hair,-30)]);
      if(up){ ctx.beginPath(); ctx.arc(hx*0.5,hy,8.2,0,TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,8.4,Math.PI,TAU); ctx.lineTo(hx*0.5+8.4,hy+2); ctx.quadraticCurveTo(hx*0.5+5,hy-4.5,hx*0.5,hy-4); ctx.quadraticCurveTo(hx*0.5-5,hy-4.5,hx*0.5-8.4,hy+2); ctx.closePath(); ctx.fill(); }
      NO(); ctx.strokeStyle=K.hat; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(hx*0.5,hy+1.5,8.2,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
      if(!up){ ctx.fillStyle='#4ac8ff'; ctx.beginPath(); ctx.arc(hx*0.5,hy-6.6,1.3,0,TAU); ctx.fill(); drawGlow(hx*0.5,hy-6.6,4,'#9fe6ff',0.6);
        ctx.fillStyle=K.hair; ctx.beginPath(); ctx.moveTo(hx*1.3-5.5,hy+2.6); ctx.quadraticCurveTo(hx*1.3,hy+11.5,hx*1.3+5.5,hy+2.6); ctx.quadraticCurveTo(hx*1.3,hy+5.6,hx*1.3-5.5,hy+2.6); ctx.fill(); } }
    else if(cid==='alchi'){ OL(); ctx.fillStyle=K.hair;
      if(up){ ctx.beginPath(); ctx.arc(hx*0.5,hy,8.4,0,TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,8.6,Math.PI*1.05,Math.PI*1.95); ctx.quadraticCurveTo(hx*0.5+3,hy-3,hx*0.5-1,hy-4.5); ctx.quadraticCurveTo(hx*0.5-5,hy-2,hx*0.5-8,hy-2); ctx.closePath(); ctx.fill(); }
      NO(); ctx.fillStyle='#3a2a1a'; ctx.fillRect(hx*0.5-8.4,hy-5.6,16.8,2.2);
      if(!up){ for(const s of [-1,1]){ ctx.fillStyle='#c89a3a'; ctx.beginPath(); ctx.arc(hx*1.0+s*3.2,hy-5.3,2.9,0,TAU); ctx.fill(); ctx.fillStyle=hRad(hx*1.0+s*3.2,-5,2.2,['#e8fff8','#5ad8b0','#1a6a5a']); ctx.beginPath(); ctx.arc(hx*1.0+s*3.2,hy-5.3,2.1,0,TAU); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillRect(hx*1.0+s*3.2-1.2,hy-6.6,0.9,0.9); } } }
    else if(cid==='berserk'){ OL();
      ctx.fillStyle=hLin(-9,-22,9,-6,['#ffffff',K.hat,hShade(K.hat,-60)]); ctx.beginPath(); ctx.arc(hx*0.5,hy-0.5,8.6,Math.PI,TAU); ctx.lineTo(hx*0.5+8.8,hy+1); ctx.lineTo(hx*0.5-8.8,hy+1); ctx.closePath(); ctx.fill();
      ctx.fillStyle=hShade(K.hat,-40); ctx.fillRect(hx*0.5-9,hy-1,18,2.2);
      if(!up){ ctx.fillStyle=hShade(K.hat,-30); ctx.fillRect(hx*1.3-1,hy-1,2,6); }
      for(const s of [-1,1]){ ctx.fillStyle=hLin(0,-26,s*14,-12,['#ffffff',K.hat2,hShade(K.hat2,-45)]); ctx.beginPath(); ctx.moveTo(hx*0.5+s*6,hy-5); ctx.quadraticCurveTo(hx*0.5+s*13,hy-6,hx*0.5+s*13.5,hy-15); ctx.quadraticCurveTo(hx*0.5+s*10.5,hy-9.5,hx*0.5+s*5,hy-8.5); ctx.closePath(); ctx.fill(); }
      NO(); if(!up){ const ga=ctx.globalAlpha; ctx.fillStyle=K.paint; ctx.globalAlpha=ga*0.85; ctx.fillRect(hx*1.3-6,hy+2.2,4.2,1.3); ctx.fillRect(hx*1.3+1.8,hy+2.2,4.2,1.3); ctx.globalAlpha=ga; } }
    else { OL();
      ctx.fillStyle=hLin(-11,-22,11,4,[hShade(K.hat,30),K.hat,hShade(K.hat,-25)]);
      ctx.beginPath(); ctx.moveTo(hx*0.5,hy-15); ctx.quadraticCurveTo(hx*0.5+11,hy-10,hx*0.5+10,hy+3); ctx.lineTo(hx*0.5+7.5,hy+9); ctx.lineTo(hx*0.5+5.5,hy+1); ctx.quadraticCurveTo(hx*0.5,hy-6,hx*0.5-5.5,hy+1); ctx.lineTo(hx*0.5-7.5,hy+9); ctx.lineTo(hx*0.5-10,hy+3); ctx.quadraticCurveTo(hx*0.5-11,hy-10,hx*0.5,hy-15); ctx.fill(); NO();
      if(up){ ctx.fill(); }
      ctx.fillStyle='#e8e2d0'; for(const s of [-1,0,1]){ ctx.beginPath(); ctx.moveTo(hx*0.5+s*3-1.2,hy-8.5+Math.abs(s)); ctx.lineTo(hx*0.5+s*3,hy-12+Math.abs(s)*1.5); ctx.lineTo(hx*0.5+s*3+1.2,hy-8.5+Math.abs(s)); ctx.fill(); }
      ctx.strokeStyle=K.trim; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(hx*0.5-4.5,hy-8.2); ctx.quadraticCurveTo(hx*0.5,hy-9.6,hx*0.5+4.5,hy-8.2); ctx.stroke(); }
  };

  // ---------- Reihenfolge ----------
  if(up){ weapon(); legs(); body(); cape(false); head(); }
  else { cape(true); legs(); body(); head(); weapon(); }
  if(cid==='jaegerin' && !up){ ctx.save(); ctx.translate(-6,-4); ctx.rotate(-0.5); ctx.fillStyle=hLin(-2,0,2,0,['#6b3e1e','#3a2010']); ctx.fillRect(-2,-8,4,12);
    ctx.fillStyle='#e8e2d0'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(-1.5+i*1.5,-8); ctx.lineTo(-0.8+i*1.5,-12); ctx.lineTo(0+i*1.5,-8); ctx.fill(); } ctx.restore(); }
  ctx.lineCap='butt';
}

function hpBar(e){ if(e.hp>=e.maxHp) return; const w=e.r*2; ctx.fillStyle='#000a'; ctx.fillRect(e.x-w/2,e.y-e.r-12,w,4); ctx.fillStyle=e.elite?'#e6b450':'#d9483e'; ctx.fillRect(e.x-w/2,e.y-e.r-12,w*Math.max(0,e.hp/e.maxHp),4); }

function drawEnemy(e,corpse){
  const r=e.r, fl=e.flash>0, sp=e.spawnT>0?1-e.spawnT/0.45:1;
  if(sp<1){ ctx.strokeStyle=`rgba(190,150,255,${1-sp})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(e.x,e.y+r*0.7,r*1.7*(0.6+sp*0.4),r*0.7*(0.6+sp*0.4),0,0,TAU); ctx.stroke(); drawGlow(e.x,e.y+r*0.5,r*2.2,'#9a6aff',0.8*(1-sp)); }
  if(!e.under && !corpse) drawShadow(e.x,e.y+r*0.8,r*0.95*Math.min(1,sp+0.3));
  if(e.elite && !corpse){ drawGlow(e.x,e.y,r*2.4,'#e6b450',0.35+Math.sin(G.time*4)*0.1); }
  if(e.champ && !corpse){ ctx.strokeStyle=`rgba(255,215,90,${0.55+0.25*Math.sin(G.time*5)})`; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(e.x,e.y+r*0.75,r*1.35,r*0.55,0,0,TAU); ctx.stroke(); drawGlow(e.x,e.y,r*3,'#ffd04a',0.3); }
  if(e.buffT>0 && !corpse){ drawGlow(e.x,e.y+r*0.6,r*1.8,'#ff4a2a',0.5); }
  if(e.kind==='totem' && !corpse){ ctx.strokeStyle=`rgba(255,90,50,${0.18+0.08*Math.sin(G.time*3)})`; ctx.lineWidth=2; ctx.setLineDash([8,8]); ctx.beginPath(); ctx.ellipse(e.x,e.y+r*0.7,170,170*0.55,0,0,TAU); ctx.stroke(); ctx.setLineDash([]); drawGlow(e.x,e.y-r,r*2,'#ff6a3a',0.35+0.15*Math.sin(G.time*5)); }
  ctx.save(); ctx.translate(e.x,e.y); if(e.alpha!==undefined && e.alpha<1) ctx.globalAlpha=e.alpha;
  if(e.lift) ctx.translate(0,-e.lift*46);
  if(sp<1){ const b=1+2.7*Math.pow(sp-1,3)+1.7*Math.pow(sp-1,2); ctx.translate(0,r*0.8); ctx.scale(b,b); ctx.translate(0,-r*0.8); }
  if(fl && !e.under){ ctx.scale(1.12,0.9); }
  if(e.mv && !FLY[e.kind] && !['slime','worm','mimic','magma','urchin','totem'].includes(e.kind)){ const ph=e.t*11+e.seed; ctx.translate(0,-Math.abs(Math.sin(ph))*2.4); ctx.rotate(Math.sin(ph)*0.07); }
  const fx=Math.cos(e.face);
  const col=c=>fl?'#ffffff':c;
  if(e.freeze>0){ ctx.globalAlpha=0.9; }
  if(SPR_BODY[e.kind]){
    const k=e.kind==='gargoyle'&&e.stone?'gargstone':e.kind, rot=a=>{ ctx.save(); ctx.rotate(a); };
    if(k==='orc' && e.st===1){ rot(e.ca); ctx.fillStyle='rgba(255,80,60,0.18)'; ctx.fillRect(0,-r,280,r*2); ctx.restore(); drawGlow(0,0,r*2.2,'#ff3a2a',0.5); }
    if(k==='healer' && e.st>0) drawGlow(0,-4,34,'#7dff8a',e.st*1.6);
    if(k==='slime'){ const sq=e.squish||0; ctx.scale(1+(0.15-sq*0.12),1-(0.15-sq*0.12)); ctx.translate(0,-sq*6); }
    const back=Math.sin(e.face)<-0.3;
    const weapon=()=>{
      if(k==='skeleton'){ rot(e.face); ctx.translate(8,3); ctx.fillStyle='#4a3a2a'; ctx.fillRect(-3,-1.2,4,2.4); ctx.fillStyle='#8a7a5a'; ctx.fillRect(1,-3.5,1.8,7);
        ctx.fillStyle=fl?'#fff':'#a8a8a0'; ctx.beginPath(); ctx.moveTo(2.8,-1.4); ctx.lineTo(15,-1); ctx.lineTo(17,0); ctx.lineTo(15,1); ctx.lineTo(2.8,1.4); ctx.fill(); ctx.fillStyle='#6a5a48'; ctx.fillRect(9,-1,2,1); ctx.restore(); }
      else if(k==='archer'){ rot(e.face); ctx.strokeStyle='#5a3418'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(6,0,11,-1.2,1.2); ctx.stroke(); ctx.strokeStyle='#a0703a'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(6,0,11,-1.1,1.1); ctx.stroke();
        const pull=e.st===1?4:0; ctx.strokeStyle='#e8e0c8'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(6+Math.cos(-1.2)*11,Math.sin(-1.2)*11); ctx.lineTo(6+2-pull,0); ctx.lineTo(6+Math.cos(1.2)*11,Math.sin(1.2)*11); ctx.stroke(); ctx.restore(); }
      else if(k==='orc'){ rot(e.face); ctx.fillStyle='#4a3020'; ctx.fillRect(r*0.5,-2,r*1.0,4); ctx.fillStyle='#2a1c10'; for(let i=0;i<3;i++) ctx.fillRect(r*0.6+i*4,-2,1.2,4);
        const bl=fl?'#fff':'#b8c0c8'; ctx.fillStyle=bl; ctx.beginPath(); ctx.moveTo(r*1.25,-10); ctx.quadraticCurveTo(r*1.85,0,r*1.25,10); ctx.lineTo(r*1.35,0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r*1.25,-8); ctx.quadraticCurveTo(r*0.85,0,r*1.25,8); ctx.closePath(); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(r*1.5,-5,1.2,10); ctx.restore(); }
      else if(k==='shield'){ rot(e.face); ctx.translate(r*0.6,0); ctx.fillStyle=fl?'#fff':'#6a3e1c'; ctx.beginPath(); ctx.moveTo(0,-r*1.05); ctx.lineTo(8,-r*1.05); ctx.lineTo(10,0); ctx.lineTo(8,r*1.05); ctx.lineTo(0,r*1.05); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#b8c0cc'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.moveTo(5,-6); ctx.lineTo(9,0); ctx.lineTo(5,6); ctx.lineTo(3,0); ctx.fill(); ctx.fillStyle='#c0c8d4'; for(const y of [-r*0.7,r*0.7]){ ctx.beginPath(); ctx.arc(4,y,1.3,0,TAU); ctx.fill(); } ctx.restore(); } };
    if(back) weapon();
    if(k==='urchin'){ if(e.st===0) ctx.rotate(e.t*9*e.dir); else { const q=1+0.1*Math.sin(e.t*45); ctx.scale(q,q); } }
    if(k==='wraith' && e.st===3) drawGlow(0,0,r*2.4,'#b8c8ff',0.6);
    if(k==='gargoyle' && !e.stone) drawGlow(fx<0?-r*0.2:r*0.2,-r*0.5,8,'#ff9a2a',0.6);
    blitSprite(k,e,k==='slime'&&e.elite,fl);
    if(!back) weapon();
    const fx1=SPR_KIND[k].flip?(fx<0?-1:1):1;
    if(k==='cultist'){ drawGlow(fx1*r*0.62,r*0.25,10,'#b06aff',0.5); if(e.st>0) drawGlow(0,-2,26,'#b06aff',e.st*2); }
    if(k==='healer') drawGlow(fx1*r*0.9,-r*1.2,12,'#7dff8a',0.9);
    if(k==='kobold') drawGlow(fx1*11,-5,6,'#ffd04a',0.6+0.4*Math.sin(e.t*20));
    if(k==='imp') drawGlow(0,0,r*2,'#ff6a2a',0.35);
  } else switch(e.kind){
    case 'worm': {
      if(e.under){ const wob=Math.sin(e.t*12)*2; ctx.fillStyle='#4a3424'; ctx.beginPath(); ctx.ellipse(0,4,r*0.9+wob,r*0.5,0,0,TAU); ctx.fill(); ctx.fillStyle='#6b5034'; ctx.beginPath(); ctx.ellipse(0,1,r*0.6,r*0.32,0,0,TAU); ctx.fill(); break; }
      const rise=e.st===2?Math.min(1,(2.8-e.timer)*4):0.3, sw=Math.sin(e.t*5)*3;
      ctx.fillStyle='#4a3424'; ctx.beginPath(); ctx.ellipse(0,6,r*1.1,r*0.5,0,0,TAU); ctx.fill();
      for(let i=0;i<3;i++){ ctx.fillStyle=col(i%2?'#9a4a6a':'#b25a7e'); ctx.beginPath(); ctx.arc(sw*i*0.4,4-i*r*0.6*rise,r*(0.85-i*0.08),0,TAU); ctx.fill(); }
      const hy=4-3*r*0.6*rise; ctx.fillStyle=col('#c86a8e'); ctx.beginPath(); ctx.arc(sw*1.2,hy,r*0.75,0,TAU); ctx.fill();
      ctx.fillStyle='#2a0a14'; ctx.beginPath(); ctx.arc(sw*1.2,hy,r*0.45,0,TAU); ctx.fill();
      ctx.fillStyle='#f4eedc'; for(let i=0;i<8;i++){ const ta=i/8*TAU; ctx.beginPath(); ctx.arc(sw*1.2+Math.cos(ta)*r*0.4,hy+Math.sin(ta)*r*0.4,1.8,0,TAU); ctx.fill(); } break; }
    case 'spiderling': { const w=Math.sin(e.t*24); ctx.strokeStyle=col('#1a1218'); ctx.lineWidth=1.6;
      for(let i=0;i<4;i++) for(const s of [-1,1]){ const o=(i-1.5)*3.5, k=w*(i%2?1:-1); ctx.beginPath(); ctx.moveTo(o,0); ctx.lineTo(o+k*2,s*6); ctx.lineTo(o+k*3+(i-1.5)*2,s*11); ctx.stroke(); }
      ctx.fillStyle=col('#3a2a40'); ctx.beginPath(); ctx.ellipse(0,1,6,5,0,0,TAU); ctx.fill(); ctx.fillStyle='#ff3a4a'; ctx.fillRect(-3,-3,2,2); ctx.fillRect(1,-3,2,2); break; }
    case 'whelp': { const fl=Math.sin(e.t*16)*0.35; ctx.rotate(e.face+Math.PI/2);
      ctx.fillStyle=col('#8a1a14'); for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(s*3,-2); ctx.lineTo(s*r*(1.7+fl),-r*0.6); ctx.lineTo(s*r*(1.3+fl),r*0.3); ctx.lineTo(s*4,r*0.4); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle=col('#a02a1e'); ctx.lineWidth=4; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,r*0.4); ctx.quadraticCurveTo(Math.sin(e.t*5)*6,r*1.1,0,r*1.5); ctx.stroke(); ctx.lineCap='butt';
      ctx.fillStyle=col('#c0302a'); ctx.beginPath(); ctx.ellipse(0,0,r*0.45,r*0.7,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0,-r*0.8,r*0.3,r*0.35,0,0,TAU); ctx.fill();
      ctx.fillStyle='#ffd04a'; ctx.fillRect(-3,-r*0.85,2,2); ctx.fillRect(1,-r*0.85,2,2); if(e.st>0) drawGlow(0,-r*1.1,14,'#ff8a2a',0.9); break; }
    case 'magma': { const pul=0.5+0.5*Math.sin(e.t*4);
      ctx.fillStyle=col('#2e1a16'); ctx.beginPath(); for(let i=0;i<8;i++){ const aa=i/8*TAU, rr=r*(0.9+((i*13)%5)/25); i?ctx.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr*0.95):ctx.moveTo(Math.cos(aa)*rr,Math.sin(aa)*rr*0.95); } ctx.closePath(); ctx.fill();
      for(const s of [-1,1]){ ctx.beginPath(); ctx.ellipse(s*r*0.95,r*0.1,r*0.35,r*0.45,0,0,TAU); ctx.fill(); }
      ctx.strokeStyle=`rgba(255,${110+60*pul|0},30,0.95)`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-r*0.5,-r*0.2); ctx.lineTo(-r*0.1,r*0.15); ctx.lineTo(r*0.25,-r*0.1); ctx.lineTo(r*0.55,r*0.35); ctx.moveTo(-r*0.2,r*0.5); ctx.lineTo(r*0.1,r*0.35); ctx.stroke();
      drawGlow(0,0,r*1.2,'#ff5a1a',0.25+0.2*pul); ctx.fillStyle='#ffd04a'; ctx.fillRect(-r*0.35,-r*0.5,4,3); ctx.fillRect(r*0.2,-r*0.5,4,3); if(e.st>0) drawGlow(0,0,r*2,'#ff8a2a',e.st); break; }
    case 'kobold': { ctx.fillStyle=col('#7a4a22'); ctx.beginPath(); ctx.ellipse(0,5,7,7,0,0,TAU); ctx.fill();
      ctx.fillStyle='#2a2228'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(-7+i*1.5,0+i*3,3,0,TAU); ctx.fill(); }
      ctx.fillStyle=col('#d0782a'); ctx.beginPath(); ctx.ellipse(0,-5,7,6,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(fx*5,-3,4,2.6,0,0,TAU); ctx.fill();
      ctx.fillStyle='#1a0a00'; ctx.fillRect(-3+fx*2,-7,2,2); ctx.fillRect(1.5+fx*2,-7,2,2);
      ctx.fillStyle='#1c1820'; ctx.beginPath(); ctx.arc(9,0,4,0,TAU); ctx.fill(); drawGlow(11,-4,6,'#ffd04a',0.6+0.4*Math.sin(e.t*20)); break; }
    case 'mimic': { const open=e.st===2?1:(Math.sin(e.t*6)*0.5+0.5)*(e.st===1?1:0.4), w=r*1.1;
      ctx.fillStyle=col('#6b3f1c'); ctx.fillRect(-w,-r*0.2,w*2,r*0.95);
      ctx.fillStyle='#e6b450'; ctx.fillRect(-w,-r*0.2,w*2,3); ctx.fillRect(-w,r*0.55,w*2,3); ctx.fillRect(-3,-r*0.2,6,r*0.9);
      ctx.fillStyle='#7a1020'; ctx.fillRect(-w*0.9,-r*0.2-open*r*0.5,w*1.8,open*r*0.5);
      ctx.fillStyle='#f4eedc'; for(let i=0;i<6;i++){ const x=-w*0.85+i*w*0.34; ctx.beginPath(); ctx.moveTo(x,-r*0.2); ctx.lineTo(x+w*0.17,-r*0.2-6); ctx.lineTo(x+w*0.34,-r*0.2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x,-r*0.2-open*r*0.5); ctx.lineTo(x+w*0.17,-r*0.2-open*r*0.5+6); ctx.lineTo(x+w*0.34,-r*0.2-open*r*0.5); ctx.fill(); }
      ctx.fillStyle=col('#7d4a22'); ctx.fillRect(-w,-r*0.2-open*r*0.5-r*0.45,w*2,r*0.45);
      ctx.fillStyle='#e6b450'; ctx.fillRect(-w,-r*0.2-open*r*0.5-r*0.45,w*2,3);
      ctx.fillStyle='#ffe04a'; ctx.fillRect(-w*0.5,-r*0.2-open*r*0.5-r*0.3,4,4); ctx.fillRect(w*0.4,-r*0.2-open*r*0.5-r*0.3,4,4); break; }
    case 'imp': { const fl3=Math.sin(e.t*18)*0.5; ctx.fillStyle=col('#7a1a10');
      for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(0,-2); ctx.lineTo(s*r*1.7,-r*(0.9+fl3)); ctx.lineTo(s*r*1.1,r*0.3); ctx.closePath(); ctx.fill(); }
      drawGlow(0,0,r*2,'#ff6a2a',0.4); ctx.fillStyle=col('#d0402a'); ctx.beginPath(); ctx.arc(0,0,r*0.8,0,TAU); ctx.fill();
      ctx.fillStyle='#2a0a08'; ctx.beginPath(); ctx.moveTo(-6,-6); ctx.lineTo(-9,-15); ctx.lineTo(-3,-8); ctx.moveTo(6,-6); ctx.lineTo(9,-15); ctx.lineTo(3,-8); ctx.fill();
      ctx.fillStyle='#ffe04a'; ctx.fillRect(-4+fx*2,-3,2.5,2.5); ctx.fillRect(1.5+fx*2,-3,2.5,2.5); break; }
  }
  if(e.affix && !corpse){ ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(e.affix.map(a=>AFFIXES[a].ic).join(''),0,-r-(e.kind==='orc'?r*0.2:6)-9); }
  if(e.elite){ ctx.fillStyle='#e6b450'; const y=-r-(e.kind==='orc'?r*0.2:6); ctx.beginPath(); ctx.moveTo(-7,y); ctx.lineTo(-7,y-6); ctx.lineTo(-3.5,y-3); ctx.lineTo(0,y-8); ctx.lineTo(3.5,y-3); ctx.lineTo(7,y-6); ctx.lineTo(7,y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  if(e.stun>0 && !corpse){ for(let i=0;i<3;i++){ const a=G.time*6+i*TAU/3; ctx.fillStyle='#ffe04a'; ctx.font='9px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('★',e.x+Math.cos(a)*r*0.8,e.y-r-8+Math.sin(a)*3); } }
  if(e.freeze>0){ ctx.fillStyle='rgba(160,225,255,0.45)'; ctx.beginPath(); ctx.arc(e.x,e.y,r+3,0,TAU); ctx.fill(); }
  if(!e.under && !corpse && sp>=1) hpBar(e);
}

function drawBoss(e){
  const r=e.r, fl=e.flash>0, col=c=>fl?'#ffe2d8':c;
  ctx.globalAlpha=e.alpha??1;
  drawShadow(e.x,e.y+r*0.75,r);
  if(e.shieldT>0){ const k=Math.min(1,e.shieldT/0.4), pu=Math.sin(G.time*20)*2; ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=`rgba(190,224,255,${0.8*k})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y-6,r*1.5+pu,0,TAU); ctx.stroke();
    ctx.fillStyle=`rgba(160,200,255,${0.12*k})`; ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(e.x+(e.jx||0),e.y+(e.jy||0));
  if(FX()){ ctx.shadowColor='rgba(6,2,10,0.9)'; ctx.shadowBlur=5*DPR*SCALE; }
  if(e.ai==='golem'){
    const pulse=e.cast?0.6+Math.sin(G.time*20)*0.3:0.4;
    // arms
    for(const s of [-1,1]){ ctx.fillStyle=col('#6f747e'); ctx.beginPath(); ctx.ellipse(s*r*1.0,r*0.1+Math.sin(G.time*3+s)*3,r*0.42,r*0.55,s*0.3,0,TAU); ctx.fill(); }
    ctx.fillStyle=col('#8a8f99'); ctx.beginPath();
    for(let i=0;i<9;i++){ const a=i/9*TAU-Math.PI/2, rr=r*(0.92+((i*37)%7)/40); i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); } ctx.closePath(); ctx.fill();
    ctx.fillStyle=col('#a2a8b2'); ctx.beginPath(); ctx.ellipse(-r*0.2,-r*0.35,r*0.45,r*0.3,0,0,TAU); ctx.fill();
    ctx.strokeStyle=`rgba(120,220,255,${pulse})`; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-r*0.5,r*0.1); ctx.lineTo(-r*0.1,r*0.35); ctx.lineTo(r*0.2,r*0.05); ctx.lineTo(r*0.5,r*0.4); ctx.stroke();
    drawGlow(-r*0.3,-r*0.3,16,'#7fd4ff',pulse+0.3); drawGlow(r*0.3,-r*0.3,16,'#7fd4ff',pulse+0.3);
    ctx.fillStyle='#dff6ff'; ctx.fillRect(-r*0.38,-r*0.34,8,5); ctx.fillRect(r*0.22,-r*0.34,8,5);
    if(e.phase2){ ctx.strokeStyle='rgba(255,140,60,0.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(r*0.1,-r*0.8); ctx.lineTo(0,-r*0.5); ctx.lineTo(r*0.2,-r*0.2); ctx.stroke(); }
  } else if(e.ai==='lich'){
    const fy=Math.sin(G.time*2)*4; ctx.translate(0,fy);
    for(let i=0;i<4;i++){ const a=G.time*1.5+i*TAU/4; drawGlow(Math.cos(a)*r*1.5,Math.sin(a)*r*0.8-6,14,'#7dffb0',0.7); }
    ctx.fillStyle=col('#251634'); ctx.beginPath(); ctx.moveTo(0,-r*1.3); ctx.quadraticCurveTo(r*1.3,-r*0.4,r*1.1,r*1.1);
    for(let i=0;i<5;i++) ctx.lineTo(r*1.1-(i+0.5)*r*0.44, r*(1.1+(i%2?0:0.25)+Math.sin(G.time*4+i)*0.06));
    ctx.lineTo(-r*1.1,r*1.1); ctx.quadraticCurveTo(-r*1.3,-r*0.4,0,-r*1.3); ctx.fill();
    ctx.fillStyle=col('#3a2350'); ctx.beginPath(); ctx.ellipse(0,-r*0.45,r*0.6,r*0.62,0,0,TAU); ctx.fill();
    ctx.fillStyle=col('#e8e2d0'); ctx.beginPath(); ctx.arc(0,-r*0.45,r*0.42,0,TAU); ctx.fill(); ctx.fillRect(-r*0.25,-r*0.2,r*0.5,r*0.25);
    ctx.fillStyle='#0a0510'; ctx.beginPath(); ctx.arc(-r*0.17,-r*0.5,r*0.12,0,TAU); ctx.arc(r*0.17,-r*0.5,r*0.12,0,TAU); ctx.fill();
    drawGlow(-r*0.17,-r*0.5,10,'#7dffb0',0.9); drawGlow(r*0.17,-r*0.5,10,'#7dffb0',0.9);
    ctx.fillStyle='#e6b450'; const cy=-r*0.95; ctx.beginPath(); ctx.moveTo(-r*0.4,cy+6); ctx.lineTo(-r*0.45,cy-8); ctx.lineTo(-r*0.2,cy-2); ctx.lineTo(0,cy-12); ctx.lineTo(r*0.2,cy-2); ctx.lineTo(r*0.45,cy-8); ctx.lineTo(r*0.4,cy+6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#6a5a7a'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(r*1.0,-r*0.9); ctx.lineTo(r*0.9,r*1.0); ctx.stroke(); drawGlow(r*1.0,-r*0.95,18,'#7dffb0',e.cast?1:0.6);
  } else if(e.ai==='fallen'){
    const fy=Math.sin(G.time*1.8)*5, rage=e.phase2; ctx.translate(0,fy-10);
    drawGlow(0,0,r*3.2,rage?'#ff9ac8':'#9fc8ff',0.35+0.15*Math.sin(G.time*3));
    for(const s of [-1,1]) for(const [k,ang] of [[1,-0.5],[0.75,0.15]]){ const fl=Math.sin(G.time*2.2+k)*0.12; ctx.save(); ctx.rotate(s*(ang+fl)); ctx.scale(s,1);
      const g=ctx.createLinearGradient(0,0,r*2.3*k,0); g.addColorStop(0,col(rage?'#ffd0e8':'#e8f4ff')); g.addColorStop(1,'rgba(160,190,255,0.05)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(r*0.2,-r*0.2); ctx.quadraticCurveTo(r*1.4*k,-r*1.3*k,r*2.4*k,-r*0.5*k); ctx.quadraticCurveTo(r*1.5*k,-r*0.2,r*2.1*k,r*0.25*k); ctx.quadraticCurveTo(r*1.2*k,r*0.1,r*0.2,r*0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(r*0.3,0); ctx.lineTo(r*(0.6+i*0.5)*k,-r*(0.9-i*0.25)*k); ctx.stroke(); } ctx.restore(); }
    const rg=ctx.createLinearGradient(0,-r,0,r*1.4); rg.addColorStop(0,col('#f4f0ff')); rg.addColorStop(0.5,col(rage?'#c86a9a':'#6a7ac8')); rg.addColorStop(1,'rgba(40,40,90,0.2)');
    ctx.fillStyle=rg; ctx.beginPath(); ctx.moveTo(0,-r*0.9); ctx.quadraticCurveTo(r*0.8,-r*0.3,r*0.7,r*1.2); for(let i=0;i<6;i++) ctx.lineTo(r*0.7-(i+0.5)*r*0.233,r*(1.25+(i%2?0:0.18)+Math.sin(G.time*3+i)*0.06)); ctx.lineTo(-r*0.7,r*1.2); ctx.quadraticCurveTo(-r*0.8,-r*0.3,0,-r*0.9); ctx.fill();
    ctx.strokeStyle='#ffe08a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-r*0.5); ctx.lineTo(0,r*1.1); ctx.stroke();
    ctx.fillStyle=col('#e8e4f4'); ctx.beginPath(); ctx.arc(0,-r*0.85,r*0.36,0,TAU); ctx.fill();
    ctx.fillStyle='#14162a'; ctx.beginPath(); ctx.ellipse(-r*0.13,-r*0.86,r*0.08,r*0.05,0,0,TAU); ctx.ellipse(r*0.13,-r*0.86,r*0.08,r*0.05,0,0,TAU); ctx.fill();
    drawGlow(-r*0.13,-r*0.86,9,rage?'#ff8ac8':'#bfe0ff',1); drawGlow(r*0.13,-r*0.86,9,rage?'#ff8ac8':'#bfe0ff',1);
    for(let i=0;i<7;i++){ const aa=-Math.PI/2+(i-3)*0.35, R2=r*0.55, sx=Math.cos(aa)*R2, sy=-r*0.9+Math.sin(aa)*R2; ctx.fillStyle='#ffe08a'; ctx.beginPath(); for(let k=0;k<5;k++){ const q=k/5*TAU-Math.PI/2, q2=q+TAU/10; ctx.lineTo(sx+Math.cos(q)*4,sy+Math.sin(q)*4); ctx.lineTo(sx+Math.cos(q2)*1.6,sy+Math.sin(q2)*1.6); } ctx.fill(); }
    for(let i=0;i<5;i++){ const q=G.time*1.6+i*TAU/5; drawGlow(Math.cos(q)*r*1.6,Math.sin(q)*r*0.7+r*0.2,10,'#e8f4ff',0.8); }
  } else if(e.ai==='dragon'){
    ctx.rotate(e.face+Math.PI/2);
    const fl4=Math.sin(G.time*(e.cast==='swoop'?14:5))*0.25;
    ctx.fillStyle=col('#7a1a14');
    for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(s*r*0.3,-r*0.1); ctx.lineTo(s*r*(2.0+fl4),-r*0.7); ctx.lineTo(s*r*(1.8+fl4),r*0.1); ctx.lineTo(s*r*(1.3),r*0.0); ctx.lineTo(s*r*1.2,r*0.5); ctx.lineTo(s*r*0.3,r*0.5); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle=col('#a02a1e'); ctx.lineWidth=r*0.3; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,r*0.6); ctx.quadraticCurveTo(Math.sin(G.time*3)*r*0.6,r*1.4,0,r*2); ctx.stroke(); ctx.lineCap='butt';
    ctx.fillStyle=col('#b0281c'); ctx.beginPath(); ctx.ellipse(0,0,r*0.55,r*0.85,0,0,TAU); ctx.fill();
    ctx.fillStyle=col('#e0a040'); for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(-4,-r*0.5+i*r*0.32); ctx.lineTo(0,-r*0.62+i*r*0.32); ctx.lineTo(4,-r*0.5+i*r*0.32); ctx.fill(); }
    ctx.fillStyle=col('#c0301e'); ctx.beginPath(); ctx.ellipse(0,-r*0.95,r*0.32,r*0.42,0,0,TAU); ctx.fill();
    ctx.fillStyle='#2a0a08'; ctx.beginPath(); ctx.moveTo(-r*0.2,-r*1.1); ctx.lineTo(-r*0.35,-r*1.5); ctx.lineTo(-r*0.08,-r*1.2); ctx.moveTo(r*0.2,-r*1.1); ctx.lineTo(r*0.35,-r*1.5); ctx.lineTo(r*0.08,-r*1.2); ctx.fill();
    drawGlow(-r*0.14,-r*1.05,9,'#ffd04a',1); drawGlow(r*0.14,-r*1.05,9,'#ffd04a',1);
    if(e.cast==='breath'&&e.castT<0.9) drawGlow(0,-r*1.35,20+e.castT*30,'#ff8a2a',0.8);
  } else if(e.ai==='spider'){
    if(e.hgt) ctx.translate(0,-e.hgt);
    const w=Math.sin(G.time*14)*(e.cast||e.leap?0.5:0.25);
    ctx.strokeStyle=col('#241628'); ctx.lineWidth=4; ctx.lineCap='round';
    for(let i=0;i<4;i++) for(const s of [-1,1]){ const by=(i-1.5)*r*0.3, sw=(i%2?w:-w)*r*0.5;
      ctx.beginPath(); ctx.moveTo(s*r*0.35,by); ctx.lineTo(s*r*1.1,by-r*0.35+sw); ctx.lineTo(s*r*1.6,by+r*0.25+sw); ctx.stroke(); }
    ctx.lineCap='butt';
    ctx.fillStyle=col('#2e1f36'); ctx.beginPath(); ctx.ellipse(0,r*0.35,r*0.78,r*0.82,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(-r*0.25,r*0.1,r*0.25,r*0.35,0.4,0,TAU); ctx.fill();
    ctx.fillStyle='#d0202a'; ctx.beginPath(); ctx.moveTo(-r*0.18,r*0.15); ctx.lineTo(r*0.18,r*0.15); ctx.lineTo(0,r*0.4); ctx.lineTo(r*0.18,r*0.65); ctx.lineTo(-r*0.18,r*0.65); ctx.lineTo(0,r*0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle=col('#3a2a46'); ctx.beginPath(); ctx.ellipse(0,-r*0.45,r*0.5,r*0.42,0,0,TAU); ctx.fill();
    for(const [ex,ey,er] of [[-0.18,-0.5,0.08],[0.18,-0.5,0.08],[-0.32,-0.38,0.05],[0.32,-0.38,0.05],[-0.08,-0.33,0.05],[0.08,-0.33,0.05]]){ drawGlow(ex*r,ey*r,er*r*4,'#ff2a3a',0.7); ctx.fillStyle='#ff5a5a'; ctx.beginPath(); ctx.arc(ex*r,ey*r,er*r,0,TAU); ctx.fill(); }
    ctx.fillStyle='#e6b450'; const cy=-r*0.85; ctx.beginPath(); ctx.moveTo(-r*0.3,cy+5); ctx.lineTo(-r*0.33,cy-5); ctx.lineTo(-r*0.12,cy); ctx.lineTo(0,cy-8); ctx.lineTo(r*0.12,cy); ctx.lineTo(r*0.33,cy-5); ctx.lineTo(r*0.3,cy+5); ctx.closePath(); ctx.fill();
  } else if(e.ai==='vampire'){
    if(e.mist){ for(let i=0;i<8;i++){ const ang=G.time*7+i*0.8; drawGlow(Math.cos(ang)*r*0.9,Math.sin(ang*1.3)*r*0.6,16,'#6a1020',0.8);
        ctx.fillStyle='#1a0a12'; ctx.beginPath(); ctx.ellipse(Math.cos(ang)*r*0.9,Math.sin(ang*1.3)*r*0.6,5,2.5,Math.sin(ang*5),0,TAU); ctx.fill(); } }
    else { const fl=Math.sin(G.time*3)*0.1;
      ctx.fillStyle=col('#2a0610'); ctx.beginPath(); ctx.moveTo(-r*0.5,-r*0.55); ctx.quadraticCurveTo(-r*1.6,r*0.2,-r*1.25,r*1.15+fl*r); ctx.lineTo(r*1.25,r*1.15-fl*r); ctx.quadraticCurveTo(r*1.6,r*0.2,r*0.5,-r*0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle=col('#8a1020'); ctx.beginPath(); ctx.moveTo(-r*0.4,-r*0.4); ctx.quadraticCurveTo(-r*1.1,r*0.3,-r*0.85,r*1.0); ctx.lineTo(r*0.85,r*1.0); ctx.quadraticCurveTo(r*1.1,r*0.3,r*0.4,-r*0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle=col('#16101a'); ctx.beginPath(); ctx.ellipse(0,r*0.25,r*0.5,r*0.75,0,0,TAU); ctx.fill();
      ctx.fillStyle='#e6b450'; ctx.fillRect(-2,-r*0.1,4,r*0.7);
      ctx.fillStyle=col('#a01828'); ctx.beginPath(); ctx.moveTo(-r*0.55,-r*0.3); ctx.lineTo(-r*0.65,-r*1.15); ctx.lineTo(-r*0.15,-r*0.5); ctx.moveTo(r*0.55,-r*0.3); ctx.lineTo(r*0.65,-r*1.15); ctx.lineTo(r*0.15,-r*0.5); ctx.fill();
      ctx.fillStyle=col('#e8e0ea'); ctx.beginPath(); ctx.arc(0,-r*0.72,r*0.42,0,TAU); ctx.fill();
      ctx.fillStyle='#120a14'; ctx.beginPath(); ctx.arc(0,-r*0.8,r*0.44,Math.PI*1.05,Math.PI*1.95); ctx.lineTo(0,-r*0.6); ctx.closePath(); ctx.fill();
      drawGlow(-r*0.15,-r*0.7,9,'#ff2a3a',0.9); drawGlow(r*0.15,-r*0.7,9,'#ff2a3a',0.9);
      ctx.fillStyle='#ff3a4a'; ctx.fillRect(-r*0.2,-r*0.73,r*0.12,r*0.07); ctx.fillRect(r*0.08,-r*0.73,r*0.12,r*0.07);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.5); ctx.lineTo(-r*0.06,-r*0.4); ctx.lineTo(-r*0.02,-r*0.5); ctx.moveTo(r*0.02,-r*0.5); ctx.lineTo(r*0.06,-r*0.4); ctx.lineTo(r*0.1,-r*0.5); ctx.fill(); }
  } else if(e.ai==='lavaworm'){
    if(e.under){ const wob=Math.sin(G.time*10)*3; drawGlow(0,4,r*1.4,'#ff5a1a',0.55);
      ctx.fillStyle='#2a1612'; ctx.beginPath(); ctx.ellipse(0,6,r*0.95+wob,r*0.5,0,0,TAU); ctx.fill();
      ctx.strokeStyle='#ff7a1a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-r*0.6,6); ctx.lineTo(-r*0.2,0); ctx.lineTo(r*0.1,10); ctx.lineTo(r*0.6,3); ctx.stroke(); }
    else { const rise=Math.min(1,(4.0-e.wt)*3), sw=Math.sin(G.time*4)*4;
      ctx.fillStyle='#2a1612'; ctx.beginPath(); ctx.ellipse(0,10,r*1.2,r*0.55,0,0,TAU); ctx.fill(); drawGlow(0,10,r*1.5,'#ff5a1a',0.5);
      for(let i=0;i<4;i++){ const y=8-i*r*0.5*rise, x=sw*i*0.3, rr=r*(0.82-i*0.07);
        ctx.fillStyle=col(i%2?'#3a2420':'#4a2c24'); ctx.beginPath(); ctx.arc(x,y,rr,0,TAU); ctx.fill();
        ctx.strokeStyle='rgba(255,120,30,0.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,rr*0.75,0.3+i,1.4+i); ctx.stroke(); }
      const hy=8-4*r*0.5*rise, hx=sw*1.3; ctx.fillStyle=col('#5a3028'); ctx.beginPath(); ctx.arc(hx,hy,r*0.7,0,TAU); ctx.fill();
      drawGlow(hx,hy,r*0.9,'#ff7a1a',0.9); ctx.fillStyle='#ffb04a'; ctx.beginPath(); ctx.arc(hx,hy,r*0.4,0,TAU); ctx.fill();
      ctx.fillStyle='#f4e6d0'; for(let i=0;i<10;i++){ const ta=i/10*TAU; ctx.beginPath(); ctx.moveTo(hx+Math.cos(ta)*r*0.42,hy+Math.sin(ta)*r*0.42); ctx.lineTo(hx+Math.cos(ta+0.15)*r*0.58,hy+Math.sin(ta+0.15)*r*0.58); ctx.lineTo(hx+Math.cos(ta+0.3)*r*0.42,hy+Math.sin(ta+0.3)*r*0.42); ctx.fill(); } }
  }

  ctx.restore(); ctx.globalAlpha=1;
  if(e.freeze>0){ ctx.strokeStyle='rgba(160,225,255,0.7)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y,r+5,0,TAU); ctx.stroke(); }
}

function drawHazard(h){
  const k=Math.min(1,h.t/h.delay);
  ctx.save();
  const cb=save.settings.cb;
  if(cb){ ctx.setLineDash([7,5]); }
  if(h.type==='circle'){
    ctx.fillStyle=cb?'rgba(255,212,0,0.18)':'rgba(220,60,40,0.16)'; ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,TAU); ctx.fill();
    ctx.strokeStyle=cb?'#ffffff':'rgba(255,120,80,0.7)'; ctx.lineWidth=cb?3:2; ctx.stroke();
    ctx.fillStyle=cb?'rgba(255,212,0,0.38)':'rgba(255,90,50,0.3)'; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*k,0,TAU); ctx.fill();
    if(h.meteor){ const y=h.y-(1-k)*300; drawGlow(h.x,y,26,'#ff7a2a',k); }
    if(k>0.78){ ctx.setLineDash([]); ctx.strokeStyle=`rgba(255,245,210,${Math.min(1,(k-0.78)*4.5)})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,TAU); ctx.stroke(); }
  } else if(h.type==='cone'){
    ctx.fillStyle=cb?'rgba(255,212,0,'+(0.14+0.2*k)+')':'rgba(255,110,40,'+(0.12+0.2*k)+')'; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.arc(h.x,h.y,h.len,h.a-h.spread,h.a+h.spread); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=cb?'#ffffff':'rgba(255,140,60,0.7)'; ctx.lineWidth=cb?3:2; ctx.stroke();
    if(k>0.78){ ctx.setLineDash([]); ctx.strokeStyle=`rgba(255,245,210,${Math.min(1,(k-0.78)*4.5)})`; ctx.lineWidth=3; ctx.stroke(); }
  } else if(h.type==='line'){
    ctx.translate(h.x,h.y); ctx.rotate(h.a); ctx.fillStyle=cb?'rgba(255,212,0,'+(0.12+0.22*k)+')':'rgba(255,120,60,'+(0.1+0.2*k)+')'; ctx.fillRect(0,-h.w/2,h.len,h.w);
    ctx.fillStyle=cb?'rgba(255,212,0,0.3)':'rgba(255,150,80,0.25)'; ctx.fillRect(0,-h.w/2,h.len*k,h.w);
    ctx.strokeStyle=cb?'#ffffff':'rgba(255,150,80,0.6)'; ctx.setLineDash([10,8]); ctx.lineWidth=cb?3:2; ctx.strokeRect(0,-h.w/2,h.len,h.w);
  }
  ctx.restore();
}

function drawPProj(p){
  if(p.type==='taxe'){ drawShadow(p.x,p.y+14,6); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.spin); ctx.fillStyle='#5a3a1e'; ctx.fillRect(-1.5,-10,3,20);
    ctx.fillStyle='#c8ccd4'; ctx.beginPath(); ctx.moveTo(1.5,-10); ctx.quadraticCurveTo(10,-8,9,0); ctx.lineTo(1.5,-3); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-1.5,-10); ctx.quadraticCurveTo(-10,-8,-9,0); ctx.lineTo(-1.5,-3); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
  if(p.type==='hammer'){ drawShadow(p.x,p.y+14,7); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.spin);
    drawGlow(0,0,20,'#ffe08a',0.45); ctx.fillStyle='#6b4a2a'; ctx.fillRect(-1.6,-2,3.2,16); ctx.fillStyle='#e6b450'; ctx.fillRect(-2,12,4,3);
    ctx.fillStyle=hLin(-8,-8,8,0,['#ffffff','#c8ccd4','#6a6e78']); ctx.fillRect(-8,-8,16,8); ctx.fillStyle='#e6b450'; ctx.fillRect(-8,-5,16,2); ctx.restore(); return; }
  if(p.type==='flask'){ const col=FLASK_COL[p.kind]; drawShadow(p.x,p.y+8,5); const y=p.y-(p.h||0); ctx.save(); ctx.translate(p.x,y); ctx.rotate(p.t*14);
    drawGlow(0,0,12,col,0.6); ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,2,5,0,TAU); ctx.fill(); ctx.fillStyle='#d8e8f0'; ctx.fillRect(-1.8,-6,3.6,5); ctx.fillStyle='#8a5a2a'; ctx.fillRect(-2,-7.5,4,2);
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-1.8,0.5,1.4,0,TAU); ctx.fill(); ctx.restore(); return; }
  if(p.type==='holy'){ for(let i=1;i<=3;i++) drawGlow(p.x-p.vx*0.014*i,p.y-p.vy*0.014*i,12*(1-i*0.2),'#ffe08a',0.5-i*0.12); drawGlow(p.x,p.y,16,'#fff0b0',1); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,TAU); ctx.fill(); return; }
  if(p.type==='wave'){ const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.globalAlpha=Math.min(1,p.life*3);
    ctx.strokeStyle='#dfeaff'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(-p.r*0.6,0,p.r,-1.1,1.1); ctx.stroke();
    ctx.strokeStyle='#7fb4ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-p.r*0.9,0,p.r,-0.9,0.9); ctx.stroke(); ctx.lineCap='butt'; ctx.restore(); ctx.globalAlpha=1; return; }
  if(p.type==='bolt'||p.type==='skull'||p.type==='spark'){ const col={bolt:'#b070ff',skull:'#2affb0',spark:'#e0b0ff'}[p.type];
    for(let i=1;i<=4;i++) drawGlow(p.x-p.vx*0.012*i,p.y-p.vy*0.012*i,(p.type==='spark'?6:12)*(1-i*0.17),col,0.5-i*0.1); }
  if(p.type==='spark'){ drawGlow(p.x,p.y,10,'#e0b0ff',1); return; }
  if(p.type==='skull'){ drawGlow(p.x,p.y,18,'#2affb0',0.8); ctx.fillStyle='#e8f6f0'; ctx.beginPath(); ctx.arc(p.x,p.y-1,5.5,0,TAU); ctx.fill(); ctx.fillRect(p.x-3,p.y+2,6,3);
    ctx.fillStyle='#0a2a20'; ctx.fillRect(p.x-3,p.y-2,2,2); ctx.fillRect(p.x+1,p.y-2,2,2); return; }
  if(p.type==='bolt'){ drawGlow(p.x,p.y,18,'#b070ff',0.9); ctx.fillStyle='#f4e6ff'; ctx.beginPath(); ctx.arc(p.x,p.y,4.5,0,TAU); ctx.fill(); return; }
  const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a);
  { const g=ctx.createLinearGradient(-46,0,-12,0); g.addColorStop(0,'rgba(255,240,200,0)'); g.addColorStop(1,p.gold?'rgba(255,224,138,0.55)':'rgba(255,240,210,0.35)'); ctx.strokeStyle=g; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-46,0); ctx.lineTo(-12,0); ctx.stroke(); }
  ctx.strokeStyle=p.gold?'#ffe08a':'#d9c49a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(4,0); ctx.stroke();
  ctx.fillStyle='#e8eef5'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(2,-3.5); ctx.lineTo(2,3.5); ctx.fill();
  ctx.fillStyle='#c8423a'; ctx.fillRect(-15,-3,4,2); ctx.fillRect(-15,1,4,2); ctx.restore();
}
function drawEProj(p){
  drawEProjTrail(p);
  if(p.kind!=='arrow'&&p.kind!=='spike'&&p.kind!=='web'){ ctx.fillStyle='rgba(20,4,8,0.85)'; ctx.beginPath(); ctx.arc(p.x,p.y,(p.r||6)*0.9+2,0,TAU); ctx.fill(); }
  if(save.settings.cb){ ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,(p.r||6)+3,0,TAU); ctx.stroke(); }
  if(p.kind==='arrow'){ const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.strokeStyle='#8a5a30'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(6,0); ctx.stroke(); ctx.fillStyle='#ff6a4a'; ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(3,-4); ctx.lineTo(3,4); ctx.fill(); ctx.restore(); return; }
  if(p.kind==='spike'){ const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.fillStyle='#3a2414'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-6,-2.5); ctx.lineTo(-6,2.5); ctx.fill(); ctx.fillStyle='#e8d8b0'; ctx.fillRect(4,-0.8,4,1.6); ctx.restore(); return; }
  if(p.kind==='web'){ drawGlow(p.x,p.y,16,'#e8e8f0',0.6); ctx.fillStyle='#f4f4fa'; ctx.beginPath(); ctx.arc(p.x,p.y,6,0,TAU); ctx.fill(); return; }
  const c={orb:'#c06aff',fire:'#ff7a2a',soul:'#5affa0',rock:'#a0a4ac',blood:'#ff2a3a',star:'#a8c0ff'}[p.kind]||'#ffffff';
  if(p.kind==='rock'){ ctx.fillStyle='#6a6e78'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fill(); ctx.fillStyle='#9aa0aa'; ctx.beginPath(); ctx.arc(p.x-2,p.y-2,p.r*0.5,0,TAU); ctx.fill(); return; }
  drawGlow(p.x,p.y,p.r*3,c,0.9); ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.55,0,TAU); ctx.fill();
}
/* Bodeneffekte: Pfützen, Giftwolken, geweihter Boden, Strudel */
function drawZones(){
  for(const z of G.pzones){ const a=Math.min(1,z.life/z.max*1.5);
    if(!z.kind){ drawGlow(z.x,z.y,z.r*1.5,'#6a2aff',a*0.7); continue; }
    const col=ZONE_COL[z.kind]; ctx.globalAlpha=0.35*a; ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.62,0,0,TAU); ctx.fill();
    ctx.globalAlpha=0.6*a; ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke(); drawGlow(z.x,z.y,z.r*1.3,col,0.35*a);
    ctx.fillStyle='rgba(255,255,255,0.5)'; for(let i=0;i<3;i++){ const ph=(G.time*1.3+i*0.37+z.x*0.01)%1; ctx.globalAlpha=a*(1-ph)*0.8; ctx.beginPath(); ctx.arc(z.x+Math.cos(i*2.1+z.y)*z.r*0.5,z.y+Math.sin(i*2.1+z.x)*z.r*0.3,1.5+ph*2.5,0,TAU); ctx.fill(); }
    ctx.globalAlpha=1; }
  for(const z of G.ezones){ const a=Math.min(1,z.life/0.6, (z.max-z.life)/0.3+0.2);
    for(let i=0;i<5;i++){ const ang=i*1.26+G.time*0.4*(i%2?1:-1); drawGlow(z.x+Math.cos(ang)*z.r*0.45,z.y+Math.sin(ang)*z.r*0.3,z.r*0.9,'#7ab83a',0.38*a); }
    ctx.globalAlpha=0.5*a; ctx.strokeStyle='#b8ff6a'; ctx.lineWidth=1.5; ctx.setLineDash([5,6]); ctx.beginPath(); ctx.ellipse(z.x,z.y,z.r,z.r*0.62,0,0,TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1; }
  if(P.holy>0){ const R=(P.sanct?120:85)*Math.sqrt(P.area), a=P.holy; ctx.save(); ctx.translate(P.x,P.y+10); ctx.scale(1,0.6);
    const g=ctx.createRadialGradient(0,0,0,0,0,R); g.addColorStop(0,`rgba(255,230,150,${0.05*a})`); g.addColorStop(0.8,`rgba(255,220,120,${0.16*a})`); g.addColorStop(1,`rgba(255,240,190,${0.45*a})`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill(); ctx.strokeStyle=`rgba(255,236,170,${0.8*a})`; ctx.lineWidth=2; ctx.stroke();
    ctx.rotate(G.time*0.5); ctx.lineWidth=1.5; for(let i=0;i<8;i++){ ctx.rotate(TAU/8); ctx.beginPath(); ctx.moveTo(R*0.75,0); ctx.lineTo(R*0.9,0); ctx.moveTo(R*0.82,-4); ctx.lineTo(R*0.82,4); ctx.stroke(); }
    ctx.restore(); if(Math.random()<0.3*a) part(P.x+rand(-R,R)*0.8,P.y+10+rand(-R,R)*0.45,0,-40,0.8,2,'#ffe08a',true); }
  if(P.vortex){ const V=P.vortex;
    if(V.t<0){ const k=1+V.t/0.45, x=V.x0+(V.x-V.x0)*k, y=V.y0+(V.y-V.y0)*k-Math.sin(k*Math.PI)*90; drawShadow(V.x0+(V.x-V.x0)*k,V.y0+(V.y-V.y0)*k,10);
      ctx.save(); ctx.translate(x,y); ctx.rotate(k*8); ctx.fillStyle='#2a2a30'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI); ctx.fill(); ctx.fillRect(-11,-2,22,3); ctx.fillStyle='#8dff6a'; ctx.beginPath(); ctx.ellipse(0,-1,9,3,0,0,TAU); ctx.fill(); ctx.restore(); }
    else { const k=V.t/V.T; ctx.save(); ctx.translate(V.x,V.y); ctx.scale(1,0.62); ctx.globalCompositeOperation='lighter';
      drawGlow(0,0,V.R*1.1,'#5ad83a',0.35+0.3*k);
      ctx.lineCap='round'; for(let i=0;i<5;i++){ const a0=-G.time*6+i*TAU/5; ctx.strokeStyle=`rgba(170,255,120,${0.55})`; ctx.lineWidth=3; ctx.beginPath();
        for(let j=0;j<=14;j++){ const t=j/14, rr=V.R*(1-t*0.9), aa=a0+t*3.2; j?ctx.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr):ctx.moveTo(Math.cos(aa)*rr,Math.sin(aa)*rr); } ctx.stroke(); }
      ctx.restore(); ctx.lineCap='butt';
      ctx.fillStyle='#2a2a30'; ctx.beginPath(); ctx.ellipse(V.x,V.y+4,14,9,0,0,TAU); ctx.fill(); ctx.fillStyle='#8dff6a'; ctx.beginPath(); ctx.ellipse(V.x,V.y,12,5,0,0,TAU); ctx.fill(); drawGlow(V.x,V.y-4,22,'#b8ff8a',0.8);
      if(Math.random()<0.5) part(V.x+rand(-8,8),V.y-4,rand(-20,20),-70,0.6,3,'#b8ff8a',true); } }
}
function drawFx(f){
  const k=f.t/f.life;
  if(drawSkillFx(f,k)||drawFxExtra(f,k)) return;
  if(f.type==='slash'){ drawSlash(f,k); }
  else if(f.type==='lob'){ const x=f.x+(f.x2-f.x)*k, y=f.y+(f.y2-f.y)*k-Math.sin(k*Math.PI)*110;
    drawShadow(f.x+(f.x2-f.x)*k,f.y+(f.y2-f.y)*k,5); ctx.fillStyle='#1c1820'; ctx.beginPath(); ctx.arc(x,y,5,0,TAU); ctx.fill(); drawGlow(x+3,y-4,7,'#ffd04a',0.9); }
  else if(f.type==='skybolt'){ ctx.globalAlpha=1-k; ctx.strokeStyle=f.color; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); let x=f.x+rand(-30,30), y=f.y-560; ctx.moveTo(x,y);
    for(let i=1;i<=8;i++){ x=i<8?f.x+rand(-24,24):f.x; y=f.y-560+i*70; ctx.lineTo(x,y); } ctx.stroke(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.8; ctx.stroke(); ctx.lineCap='butt'; ctx.globalAlpha=1; drawGlow(f.x,f.y,70,f.color,1-k); }
  else if(f.type==='corpse'){ const e=f.e, by=e.y+e.r*0.8; ctx.save(); GA=Math.max(0,1-k); ctx.globalAlpha=GA; ctx.translate(e.x,by); ctx.scale(1+k*0.45,1-k*0.85); ctx.translate(-e.x,-by); drawEnemy(e,true); ctx.restore(); GA=1; ctx.globalAlpha=1; }
  else if(f.type==='ring'){ ctx.strokeStyle=f.color; ctx.globalAlpha=1-k; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*(0.4+0.6*k),0,TAU); ctx.stroke();
    if(f.fill){ ctx.fillStyle=f.color; ctx.globalAlpha=(1-k)*0.25; ctx.fill(); } ctx.globalAlpha=1; }
  else if(f.type==='beam'){ ctx.strokeStyle=`rgba(125,255,138,${1-k})`; ctx.lineWidth=4*(1-k)+1; ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.x2,f.y2); ctx.stroke(); drawGlow(f.x2,f.y2,18,'#7dff8a',1-k); }
  else if(f.type==='ghost' && f.cid && FX()){ ctx.save(); ctx.globalAlpha=0.3*(1-k); ctx.translate(f.x,f.y); ctx.scale(1.12,1.12); drawHeroFigure(f.cid,skinOf(f.cid),{face:f.face,moving:true,anim:f.anim,swing:0,t:G.time}); ctx.restore(); ctx.globalAlpha=1;
    ctx.globalCompositeOperation='lighter'; drawGlow(f.x,f.y,24,f.color,0.3*(1-k)); ctx.globalCompositeOperation='source-over'; }
  else if(f.type==='ghost'){ ctx.globalAlpha=0.35*(1-k); ctx.fillStyle=f.color; ctx.beginPath(); ctx.ellipse(f.x,f.y+2,11,13,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(f.x,f.y-11,8,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  else if(f.type==='beamfx'){ ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.a); ctx.globalCompositeOperation='lighter'; const g=ctx.createLinearGradient(0,-f.w/2,0,f.w/2); g.addColorStop(0,'rgba(160,200,255,0)'); g.addColorStop(0.5,`rgba(235,245,255,${0.9*(1-k)})`); g.addColorStop(1,'rgba(160,200,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,-f.w/2,f.len,f.w); ctx.restore(); }
  else if(f.type==='bolt'){ ctx.strokeStyle=`rgba(200,230,255,${1-k})`; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(f.x,f.y);
    for(let i=1;i<5;i++){ const t=i/5; ctx.lineTo(f.x+(f.x2-f.x)*t+rand(-8,8),f.y+(f.y2-f.y)*t+rand(-8,8)); } ctx.lineTo(f.x2,f.y2); ctx.stroke(); drawGlow(f.x2,f.y2,20,'#9fd8ff',1-k); }
}

/* ---------- Fähigkeits-Effekte ---------- */
function drawWhirl(p){ const a0=G.time*17, fade=Math.min(1,p.spin/0.25), cx=p.x, cy=p.y+2;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  drawGlow(cx,cy,78,'#9fc4ff',0.35*fade);
  for(let i=0;i<3;i++){ const R=34+i*15, a=a0*(1-i*0.12)+i*2.1, len=1.9-i*0.25;
    const g=ctx.createConicGradient?ctx.createConicGradient(a-len,cx,cy):null;
    if(g){ g.addColorStop(0,'rgba(160,200,255,0)'); g.addColorStop(len/TAU,`rgba(235,245,255,${0.85*fade})`); g.addColorStop(Math.min(1,len/TAU+0.001),'rgba(160,200,255,0)'); g.addColorStop(1,'rgba(160,200,255,0)'); }
    ctx.strokeStyle=g||`rgba(220,235,255,${0.6*fade})`; ctx.lineWidth=7-i*1.6; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(cx,cy,R,a-len,a); ctx.stroke();
    ctx.fillStyle=`rgba(255,255,255,${0.9*fade})`; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*R,cy+Math.sin(a)*R,3.2-i*0.6,0,TAU); ctx.fill(); }
  ctx.strokeStyle=`rgba(200,220,255,${0.25*fade})`; ctx.lineWidth=1.5;
  for(let i=0;i<7;i++){ const a=-a0*0.8+i*0.9, R=24+((i*23)%40); ctx.beginPath(); ctx.arc(cx,cy,R,a,a+0.5); ctx.stroke(); }
  ctx.restore(); ctx.lineCap='butt';
  if(FX() && Math.random()<0.5){ const a=a0+(Math.random()-0.5)*0.6; part(cx+Math.cos(a)*50,cy+Math.sin(a)*50,-Math.sin(a)*160,Math.cos(a)*160,0.3,2,'#e8f0ff',true); }
}
function drawSkillFx(f,k){
  if(f.type==='dashline'){ const L=95, e=1-k; ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.a); ctx.globalCompositeOperation='lighter';
    for(let i=-1;i<=1;i++){ ctx.strokeStyle=`rgba(220,235,255,${0.5*e*(i?0.6:1)})`; ctx.lineWidth=i?1.5:3; ctx.beginPath(); ctx.moveTo(L*k*0.6,i*7); ctx.lineTo(L*(0.3+k*0.9),i*7); ctx.stroke(); }
    ctx.restore(); return true; }
  if(f.type==='shock'){ const R=f.r*(0.3+0.7*Math.sqrt(k)); ctx.strokeStyle=`rgba(230,240,255,${1-k})`; ctx.lineWidth=6*(1-k)+1; ctx.beginPath(); ctx.ellipse(f.x,f.y+10,R,R*0.45,0,0,TAU); ctx.stroke(); return true; }
  if(f.type==='nova'){ const ex=Math.min(1,k/0.35), e2=1-Math.pow(1-ex,3), R=f.r*e2, fade=k<0.35?1:1-(k-0.35)/0.65;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(f.x,f.y,R*0.2,f.x,f.y,Math.max(1,R)); g.addColorStop(0,'rgba(120,200,255,0)'); g.addColorStop(0.75,`rgba(140,215,255,${0.18*fade})`); g.addColorStop(1,`rgba(220,245,255,${0.55*fade*(1-ex*0.5)})`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(f.x,f.y,Math.max(1,R),0,TAU); ctx.fill();
    if(ex<1){ ctx.strokeStyle=`rgba(255,255,255,${1-ex})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(f.x,f.y,R,0,TAU); ctx.stroke(); }
    ctx.restore();
    // Eiskristalle am Rand, die stehen bleiben und schmelzen
    for(let i=0;i<16;i++){ const a=f.seed+i/16*TAU+((i*7)%3)*0.07, rr=R*(0.82+((i*5)%4)*0.06), h=(10+((i*13)%9))*Math.min(1,ex*1.4)*(0.4+0.6*fade);
      const x=f.x+Math.cos(a)*rr, y=f.y+Math.sin(a)*rr; ctx.save(); ctx.translate(x,y); ctx.rotate(a+Math.PI/2); ctx.globalAlpha=0.9*fade;
      ctx.fillStyle='#d8f4ff'; ctx.beginPath(); ctx.moveTo(-3.5,0); ctx.lineTo(0,-h); ctx.lineTo(3.5,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#7cc8f0'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-h); ctx.lineTo(3.5,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffffff'; ctx.fillRect(-0.6,-h*0.85,1.2,h*0.5); ctx.restore(); }
    // Schneeflocken-Muster in der Mitte
    if(fade>0){ ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.seed+k*0.8); ctx.strokeStyle=`rgba(230,248,255,${0.6*fade})`; ctx.lineWidth=2;
      const s=Math.min(1,ex*1.5)*f.r*0.35; for(let i=0;i<6;i++){ ctx.rotate(TAU/6); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(s,0); ctx.moveTo(s*0.55,0); ctx.lineTo(s*0.75,-s*0.15); ctx.moveTo(s*0.55,0); ctx.lineTo(s*0.75,s*0.15); ctx.stroke(); } ctx.restore(); }
    ctx.globalAlpha=1; return true; }
  if(f.type==='volley'){ const e=1-k; ctx.save(); ctx.globalCompositeOperation='lighter';
    drawGlow(f.x,f.y,70*(0.6+k),'#ffe08a',0.8*e);
    ctx.strokeStyle=`rgba(255,236,160,${0.9*e})`; ctx.lineCap='round';
    for(let i=0;i<24;i++){ const a=i/24*TAU+0.13, r0=20+k*f.r*1.2, r1=r0+18*e; ctx.lineWidth=i%2?1.2:2.4; ctx.beginPath(); ctx.moveTo(f.x+Math.cos(a)*r0,f.y+Math.sin(a)*r0); ctx.lineTo(f.x+Math.cos(a)*r1,f.y+Math.sin(a)*r1); ctx.stroke(); }
    ctx.strokeStyle=`rgba(255,250,220,${e})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,f.y,16+k*30,0,TAU); ctx.stroke();
    ctx.restore(); ctx.lineCap='butt'; return true; }
  if(f.type==='summon'){ const ap=Math.min(1,k*5), e=k<0.7?1:1-(k-0.7)/0.3, a=k*1.6, R=f.r;
    ctx.save(); ctx.translate(f.x,f.y+8); ctx.scale(1,0.55); ctx.globalAlpha=ap*e;
    ctx.globalCompositeOperation='lighter'; drawGlow(0,0,R*1.3,'#2affb0',0.5);
    ctx.strokeStyle='#5affd0'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.stroke(); ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0,0,R*0.82,0,TAU); ctx.stroke();
    ctx.rotate(a); ctx.lineWidth=1.8; ctx.beginPath(); for(let i=0;i<=5;i++){ const t=i*2/5*TAU-Math.PI/2; i?ctx.lineTo(Math.cos(t)*R*0.82,Math.sin(t)*R*0.82):ctx.moveTo(Math.cos(t)*R*0.82,Math.sin(t)*R*0.82); } ctx.stroke();
    ctx.fillStyle='#b8ffe8'; for(let i=0;i<8;i++){ const t=i/8*TAU; ctx.save(); ctx.translate(Math.cos(t)*R*0.91,Math.sin(t)*R*0.91); ctx.rotate(t); ctx.fillRect(-1,-3,2,6); ctx.fillRect(-3,-1,6,2); ctx.restore(); }
    ctx.restore(); ctx.globalAlpha=1; return true; }
  if(f.type==='rise'){ const e=1-k, h=60*Math.min(1,k*3); ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createLinearGradient(0,f.y+10,0,f.y+10-h); g.addColorStop(0,`rgba(90,255,208,${0.7*e})`); g.addColorStop(1,'rgba(90,255,208,0)');
    ctx.fillStyle=g; ctx.fillRect(f.x-9*e-2,f.y+10-h,(9*e+2)*2,h);
    ctx.strokeStyle=`rgba(180,255,230,${e})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(f.x,f.y+10,14*(0.5+k),5*(0.5+k),0,0,TAU); ctx.stroke();
    ctx.restore(); if(FX()&&Math.random()<0.4) part(f.x+(Math.random()-0.5)*16,f.y+8,(Math.random()-0.5)*20,-50-Math.random()*40,0.6,2,'#7affd8',true); return true; }
  return false;
}

let hudCache='';
function updHud(){
  const p=P, hp=Math.max(0,Math.ceil(p.hp)), mh=Math.round(p.maxHp);
  const key=hp+'|'+mh+'|'+run.gold+'|'+run.souls;
  if(key!==hudCache){ hudCache=key; $('hpFill').style.width=(hp/mh*100)+'%'; $('hpText').textContent=hp+' / '+mh; $('hGold').textContent=run.gold; $('hSouls').textContent=run.souls; }
  const cd=CHARS[p.cid].skill.cd*p.cdMul, sb=$('skillBtn');
  const mc=p.maxCharges||1, ch=mc>1?(p.charges??mc):0;
  sb.style.setProperty('--p', (mc>1?ch>0:p.skillT<=0)?0:(p.skillT>0?(p.skillT/cd).toFixed(3):0)); sb.classList.toggle('ready',mc>1?ch>0:p.skillT<=0);
  if(mc>1){ let b=sb.querySelector('.chg'); if(!b){ b=document.createElement('span'); b.className='chg'; sb.appendChild(b); } if(b.textContent!==String(ch)) b.textContent=ch; } else { const b=sb.querySelector('.chg'); if(b) b.remove(); }
  const db=$('dashBtn'), fe=hasRelic('r_feather'); db.style.setProperty('--p', (fe?(p.dashChg||0)>0:p.dashCd<=0)?0:(p.dashCd/(1.0*p.dashCdMul)).toFixed(3));
  { let b=db.querySelector('.chg'); if(fe){ if(!b){ b=document.createElement('span'); b.className='chg'; db.appendChild(b); } const n=String(p.dashChg||0); if(b.textContent!==n) b.textContent=n; } else if(b) b.remove(); }
  { const cb=$('combo'), left=2.5-(G.time-G.comboLast), on=G.combo>=3&&left>0; cb.classList.toggle('on',on);
    if(on){ if(cb.dataset.n!=String(G.combo)){ cb.dataset.n=G.combo; cb.innerHTML=`x${G.combo}<small>Kombo</small><div class="bar"></div>`; } cb.querySelector('.bar').style.transform=`scaleX(${Math.max(0,left/2.5)})`; } }
  { const B=G.boss||G.champ; if(B) $('bossFill').style.width=Math.max(0,B.hp/B.maxHp*100)+'%'; }
  { const el=$('rcPill'), rc=G.rc; if(!rc){ if(!el.classList.contains('hidden')) el.classList.add('hidden'); }
    else { el.classList.remove('hidden'); let st=rc.failed?'✗':rc.done?'✓':'…';
      if(rc.id==='speed' && !rc.failed){ const left=Math.max(0,Math.ceil(rc.limit-G.time)); if(!G.cleared && left<=0){ rc.failed=true; } st=G.cleared?'✓':left+' s'; }
      if(rc.id==='combo' && !rc.done && !rc.failed) st=Math.min(15,G.combo||0)+'/15';
      const txt=rc.ic+' '+rc.nm+' '+st; if(el.textContent!==txt){ el.textContent=txt; el.className=rc.failed?'fail':rc.done&&rc.id!=='speed'||G.cleared?'ok':''; } } }
}

/* ---------------- MENÜ-HINTERGRUND ---------------- */
const MB={ embers:[], t:0 };
function drawMenuBg(dt){
  MB.t+=dt; ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#120e16'; ctx.fillRect(0,0,W,H);
  const fx=FX();
  if(fx && MB.embers.length<70 && Math.random()<dt*14) MB.embers.push({x:Math.random()*W,y:H+10,vy:-(20+Math.random()*45),ph:Math.random()*TAU,s:0.6+Math.random()*1.2,c:Math.random()<0.75?'#ff9a3a':'#e6b450'});
  ctx.globalCompositeOperation='lighter';
  drawGlow(W*0.5,H*1.05,Math.max(W,H)*0.6,'#ff5a1a',0.18+0.04*Math.sin(MB.t*1.3));
  for(const e of MB.embers){ e.y+=e.vy*dt; e.ph+=dt*2; e.x+=Math.sin(e.ph)*12*dt; drawGlow(e.x,e.y,4*e.s,e.c,Math.min(1,(e.y/H)*1.4)*0.9); }
  ctx.globalCompositeOperation='source-over';
  MB.embers=MB.embers.filter(e=>e.y>-10);
}

/* ---------------- SCHLEIFE ---------------- */
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const cap=save.settings.fpsCap||60; if(now-last < 1000/cap-2 && now>=last) return;   // Bildrate begrenzen (Akku, 120-Hz-Bildschirme)
  const raw=(now-last)/1000, dt=clamp(raw,0,0.05); last=now;
  pollPad(dt);
  if(state==='combat' && G && raw>0 && raw<0.5 && !document.hidden){ PERF.acc+=raw; PERF.n++;
    if(PERF.acc>=1){ PERF.fps=Math.round(PERF.n/PERF.acc); PERF.acc=0; PERF.n=0;
      PERF.low = PERF.fps<cap*0.7 ? PERF.low+1 : 0;
      if(save.settings.gfx==='auto' && !AUTO_LOW && PERF.low>=4){ AUTO_LOW=true; resize(); buildFloor();
        toast('<span style="font-size:24px">⚙️</span><div><b>Grafik automatisch reduziert</b><div class="sub" style="font-size:13px">Damit das Spiel flüssig bleibt. Ändern unter Einstellungen → Grafik.</div></div>'); } } }
  if(state==='combat' && G){ if(G.stop>0){ G.stop-=dt; } else { const gdt=dt*(save.settings.gameSpeed||1), n=Math.max(1,Math.ceil(gdt/0.034));
      for(let i=0;i<n && G && state==='combat';i++){ if(G.stopCd>0) G.stopCd-=gdt/n; update(gdt/n); } } if(G){ draw(); updHud(); } }
  else if(state==='paused' && G){ draw(); }
  else if(!G) drawMenuBg(dt);
}
applyBodyClasses(); applyInputMode();
resize(); showMenu(); checkLinkImport(); requestAnimationFrame(loop);
try{ if(new URLSearchParams(location.search).get('tag')) setTimeout(showDaily,0); }catch(e){}
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
