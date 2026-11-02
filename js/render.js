'use strict';
/* Arena der Verdammten – Zeichnen aller Spielobjekte, Menü-Hintergrund und Spielschleife */

/* ---------------- ZEICHNEN ---------------- */
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const A=actOf(run.act);
  ctx.fillStyle=A.wall; ctx.fillRect(0,0,W,H);
  const vw=W/SCALE, vh=H/SCALE, m=WALL+STAND*0.75;
  let cx = vw>=AW+2*m ? AW/2-vw/2 : clamp(P.x-vw/2,-m,AW+m-vw);
  let cy = vh>=AH+2*m ? AH/2-vh/2 : clamp(P.y-vh/2,-m,AH+m-vh);
  if(G.shake>0 && save.settings.shake){ cx+=rand(-G.shake,G.shake)*0.4; cy+=rand(-G.shake,G.shake)*0.4; }
  ctx.save(); ctx.scale(SCALE,SCALE); ctx.translate(-cx,-cy);
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
  for(const z of G.pzones) drawGlow(z.x,z.y,z.r*1.5,'#6a2aff',Math.min(1,z.life/z.max*1.5)*0.7);
  for(const s of G.pstrikes){ const k=s.t/s.delay; ctx.strokeStyle='rgba(140,200,255,0.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.stroke(); drawGlow(s.x,s.y-(1-k)*260,30,'#8ec8ff',0.4+0.6*k); }
  // hazards
  for(const h of G.hazards) drawHazard(h);
  // spawn markers
  for(const s of G.spawnQ){ const k=1-s.t/(s.boss?1.6:0.9); ctx.strokeStyle='rgba(190,150,255,'+(0.3+0.5*k)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,(s.boss?50:16)*(1.4-k*0.4),0,TAU); ctx.stroke(); drawGlow(s.x,s.y,(s.boss?60:22),'#9a6aff',0.4*k); }
  // coins
  for(const c of G.coins){ const bob=Math.sin(G.time*6+c.x)*1.5;
    if(c.heart){ ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('❤️',c.x,c.y+bob); continue; }
    drawGlow(c.x,c.y,12,'#ffcc44',0.4); ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.ellipse(c.x,c.y+bob,4.5*Math.abs(Math.cos(G.time*4+c.x))+1.5,4.5,0,0,TAU); ctx.fill(); ctx.fillStyle='#fff3b0'; ctx.fillRect(c.x-1,c.y+bob-2,2,2); }
  // shadows + entities sorted
  const ents=[...G.enemies, ...G.obs, ...G.allies, P];
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents){ if(e===P) drawHero(); else if(e.type==='pillar') drawPillar(e); else if(e.type==='barrel') drawBarrel(e); else if(e.max!==undefined && e.life!==undefined && !e.kind) drawAlly(e); else if(e.boss) drawBoss(e); else drawEnemy(e); }
  for(const f of G.fog) drawGlow(f.x,f.y,f.r,f.thick?'#9a98a8':'#8a7aa8',f.thick?0.2:0.12);
  ctx.restore();
  if(FX()) renderLights(cx,cy);
  ctx.save(); ctx.scale(SCALE,SCALE); ctx.translate(-cx,-cy);
  drawFlames();
  // orbit
  if(P.orbit>0 && !G.over){ const R=62*Math.sqrt(P.area); for(let i=0;i<P.orbit;i++){ const a=G.orbitA+i*TAU/P.orbit, ox=P.x+Math.cos(a)*R, oy=P.y+Math.sin(a)*R; drawGlow(ox,oy,22,'#ff8a2a',0.8); ctx.fillStyle='#ffe0a0'; ctx.beginPath(); ctx.arc(ox,oy,5,0,TAU); ctx.fill(); } }
  // projectiles
  for(const p of G.pproj) drawPProj(p);
  for(const p of G.eproj) drawEProj(p);
  // fx
  for(const f of G.fx) drawFx(f);
  // particles
  ctx.globalCompositeOperation='lighter';
  for(const p of G.parts) if(p.glow) drawGlow(p.x,p.y,p.size*3*(p.life/p.max+0.3),p.color,Math.min(1,p.life/p.max*1.5));
  for(const m of G.amb){ const tw=0.5+0.5*Math.sin(m.ph*3); drawGlow(m.x,m.y,(visAct()===1?3:5)*m.s,actOf(run.act).mote,(visAct()===1?0.35:0.7)*tw); }
  ctx.globalCompositeOperation='source-over';
  for(const p of G.parts) if(!p.glow){ ctx.globalAlpha=Math.min(1,p.life/p.max*1.5); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(0.4+0.6*p.life/p.max),0,TAU); ctx.fill(); }
  ctx.globalAlpha=1;
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
  if(G.whiteFlash>0){ ctx.fillStyle=`rgba(255,248,220,${G.whiteFlash})`; ctx.fillRect(0,0,W,H); }
  if(G.over){ ctx.fillStyle=`rgba(10,0,0,${Math.min(0.55,G.deathT*0.5)})`; ctx.fillRect(0,0,W,H); }
  if(G.hurtFlash>0){ ctx.fillStyle=`rgba(200,30,30,${G.hurtFlash*0.6})`; ctx.fillRect(0,0,W,H); }
  if(P.hp<P.maxHp*0.25 && !G.over){ ctx.fillStyle=`rgba(160,0,0,${0.12+Math.sin(G.time*6)*0.06})`; ctx.fillRect(0,0,W,H); }
  // joystick
  if(input.id===null && save.settings.joyFixed){ const jb=joyBase(); ctx.globalAlpha=0.28; ctx.strokeStyle='#efe2c4'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(jb.x,jb.y,JR,0,TAU); ctx.stroke(); ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.arc(jb.x,jb.y,20,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  if(input.id!==null){ ctx.globalAlpha=0.5; ctx.strokeStyle='#efe2c4'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(input.ox,input.oy,JR,0,TAU); ctx.stroke();
    ctx.fillStyle='rgba(239,226,196,0.12)'; ctx.fill(); ctx.globalAlpha=0.85; ctx.fillStyle='#e6b450'; ctx.beginPath(); ctx.arc(input.ox+input.jx*JR,input.oy+input.jy*JR,24,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  if(G.tut) drawTut();
  if(save.settings.showFps){ ctx.font='700 12px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='bottom'; ctx.fillStyle=PERF.fps<42?'#ff8a80':'#9fe6a0'; ctx.fillText(PERF.fps+' FPS'+(FX()?'':' · niedrig'),12,H-8); }
}

function drawAlly(a){
  const fade=Math.min(1,a.life/0.8), w=Math.sin(a.t*10)*2;
  ctx.globalAlpha=fade; drawGlow(a.x,a.y,22,'#2affb0',0.25); drawShadow(a.x,a.y+11,9);
  ctx.save(); ctx.translate(a.x,a.y); ctx.scale(0.85,0.85);
  ctx.fillStyle='#cfe8de'; ctx.fillRect(-5,2,10,10); ctx.strokeStyle='#cfe8de'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-3,12); ctx.lineTo(-4+w,18); ctx.moveTo(3,12); ctx.lineTo(4-w,18); ctx.stroke();
  ctx.fillStyle='#e8f6f0'; ctx.beginPath(); ctx.arc(0,-6,9,0,TAU); ctx.fill(); ctx.fillRect(-5,0,10,4);
  ctx.fillStyle='#0a2a20'; ctx.beginPath(); ctx.arc(-3.3,-6,2.6,0,TAU); ctx.arc(3.3,-6,2.6,0,TAU); ctx.fill();
  ctx.fillStyle='#5affd0'; ctx.fillRect(-4,-7,2,2); ctx.fillRect(2.5,-7,2,2);
  ctx.strokeStyle='#9ab0a8'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(8,4); ctx.lineTo(8+Math.cos(a.face)*14,4+Math.sin(a.face)*14); ctx.stroke();
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
  if(p.shieldLeft>0){ ctx.strokeStyle='rgba(127,212,255,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y-2,24+Math.sin(G.time*4),0,TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(p.x,p.y+bob); ctx.scale(1.12,1.12);
  if(G.over){ const k=Math.min(1,G.deathT*2.5); ctx.translate(0,8*k); ctx.rotate(k*Math.PI/2*(Math.cos(p.face)>0?-1:1)); ctx.globalAlpha=Math.max(0.15,1-G.deathT*0.9); }
  const fx=Math.cos(p.face), fy=Math.sin(p.face), up=fy<-0.3;
  const drawWeapon=()=>{ ctx.save(); ctx.shadowBlur=0;
    let a=p.face; if(c.attack==='melee'&&p.swingT>0) a+= (p.swingT/0.18-0.5)*2.4;
    ctx.translate(fx*6,fy*4-2); ctx.rotate(a);
    if(c.attack==='melee'){ ctx.fillStyle='#4a3020'; ctx.fillRect(3,-2,8,4); ctx.fillStyle=K.trim; ctx.fillRect(10,-6,3,12);
      ctx.fillStyle='#dfe6ef'; ctx.beginPath(); ctx.moveTo(13,-3); ctx.lineTo(36,-2.2); ctx.lineTo(41,0); ctx.lineTo(36,2.2); ctx.lineTo(13,3); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffffffaa'; ctx.fillRect(14,-1.2,22,1); ctx.fillStyle='#8a94a4'; ctx.fillRect(14,1,22,1); }
    else if(c.attack==='skull'){ ctx.fillStyle='#2a2a30'; ctx.fillRect(0,-1.8,30,3.6); drawGlow(33,0,14,K.eye,0.8); ctx.fillStyle='#e8f6f0'; ctx.beginPath(); ctx.arc(33,0,5,0,TAU); ctx.fill(); ctx.fillStyle='#0a2a20'; ctx.fillRect(31,-2,1.6,1.6); ctx.fillRect(34,-2,1.6,1.6); }
    else if(c.attack==='bolt'){ ctx.fillStyle='#5a3a22'; ctx.fillRect(0,-1.8,30,3.6); ctx.fillStyle=K.trim; ctx.fillRect(26,-3,3,6); drawGlow(32,0,15,'#c58cff',0.9); ctx.fillStyle='#f0d8ff'; ctx.beginPath(); ctx.arc(32,0,4.5,0,TAU); ctx.fill(); }
    else { ctx.strokeStyle='#7a5230'; ctx.lineWidth=3.2; ctx.beginPath(); ctx.arc(8,0,15,-1.2,1.2); ctx.stroke(); ctx.strokeStyle=K.trim; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(8,0,15,-0.25,0.25); ctx.stroke();
      ctx.strokeStyle='#f0e8d0'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(8+Math.cos(-1.2)*15,Math.sin(-1.2)*15); ctx.lineTo(8+Math.cos(1.2)*15,Math.sin(1.2)*15); ctx.stroke(); }
    ctx.restore(); };
  if(up) drawWeapon();
  ctx.shadowColor='rgba(0,0,0,0.75)'; ctx.shadowBlur=4;
  { const st=p.moving&&!G.over?Math.sin(p.anim):0; ctx.fillStyle='#231c22'; ctx.beginPath(); ctx.ellipse(-5,12+st*2.2,3.6,2.6,0,0,TAU); ctx.ellipse(5,12-st*2.2,3.6,2.6,0,0,TAU); ctx.fill(); }
  // Umhang
  const sway=p.moving?Math.sin(p.anim*0.5)*1.5:0;
  ctx.fillStyle=K.cape; ctx.beginPath(); ctx.moveTo(-11,-6); ctx.quadraticCurveTo(-15+sway,12,-10+sway,14); ctx.lineTo(10+sway,14); ctx.quadraticCurveTo(15+sway,12,11,-6); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.moveTo(3,-4); ctx.quadraticCurveTo(9+sway,6,8+sway,14); ctx.lineTo(10+sway,14); ctx.quadraticCurveTo(15+sway,12,11,-6); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=4;
  // Körper
  if(p.cid==='krieger'){ ctx.fillStyle=K.body; ctx.beginPath(); ctx.ellipse(0,3,9.5,10,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=K.trim; ctx.fillRect(-7,-2,14,3); ctx.fillStyle=K.belt||'#6b4a2a'; ctx.fillRect(-9,6,18,3); ctx.fillStyle='#e6b450'; ctx.fillRect(-1.5,6,3,3);
    ctx.fillStyle=K.hat; ctx.beginPath(); ctx.arc(-9,-3,4,0,TAU); ctx.arc(9,-3,4,0,TAU); ctx.fill(); }
  else if(p.cid==='magier'){ ctx.fillStyle=K.body; ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(-12,13); ctx.lineTo(12,13); ctx.lineTo(9,-4); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=K.trim; ctx.fillRect(-1,-3,2,15); ctx.fillRect(-12,11,24,2); }
  else if(p.cid==='nekro'){ ctx.fillStyle=K.body; ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(-12,13); ctx.lineTo(12,13); ctx.lineTo(9,-4); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=K.trim; ctx.fillRect(-6,4,12,2); ctx.fillStyle='#e8f6f0'; ctx.beginPath(); ctx.arc(0,0,2.5,0,TAU); ctx.fill(); }
  else { ctx.fillStyle=K.body; ctx.beginPath(); ctx.ellipse(0,3,9,10,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=K.trim; ctx.fillRect(-9,0,18,4); ctx.fillStyle=K.hat2; ctx.fillRect(4,-6,4,14); ctx.fillStyle='#e8d8b0'; ctx.fillRect(5,-9,1.2,4); ctx.fillRect(6.6,-10,1.2,5); }
  ctx.fillStyle='rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.ellipse(-4.5,1,2.6,6,0.25,0,TAU); ctx.fill();
  // Kopf
  ctx.shadowBlur=4; ctx.fillStyle=K.skin; ctx.beginPath(); ctx.arc(0,-11,8,0,TAU); ctx.fill(); ctx.shadowBlur=0;
  if(!up && p.cid!=='nekro'){ ctx.fillStyle=K.eye; ctx.fillRect(-3.5+fx*2.5,-12,2,2.5); ctx.fillRect(1.5+fx*2.5,-12,2,2.5); ctx.fillStyle='rgba(220,120,110,0.35)'; ctx.fillRect(-5+fx*2.5,-9,2,1.5); ctx.fillRect(3+fx*2.5,-9,2,1.5); }
  if(p.cid==='krieger'){ ctx.fillStyle=K.hat; ctx.beginPath(); ctx.arc(0,-12,8.6,Math.PI,0); ctx.lineTo(8.6,-10); ctx.lineTo(-8.6,-10); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-2,-15,3,Math.PI,Math.PI*1.7); ctx.lineTo(-2,-15); ctx.fill();
    ctx.fillStyle=K.hat2; ctx.fillRect(-1,-21,2,10);
    ctx.fillStyle=K.plume; ctx.beginPath(); ctx.moveTo(0,-21); ctx.quadraticCurveTo(-10,-26,-12,-16); ctx.quadraticCurveTo(-6,-20,0,-19); ctx.fill(); }
  else if(p.cid==='magier'){ ctx.fillStyle=K.hat; ctx.beginPath(); ctx.ellipse(0,-14,12,3.5,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8,-15); ctx.quadraticCurveTo(-2,-26,6,-34); ctx.quadraticCurveTo(4,-24,8,-15); ctx.closePath(); ctx.fill();
    ctx.fillStyle=K.hat2; ctx.fillRect(-8,-16,16,2); ctx.beginPath(); ctx.arc(1,-21,1.6,0,TAU); ctx.fill(); ctx.fillStyle=K.collar||'#e8e0f0'; ctx.fillRect(-4,-5,8,4); }
  else if(p.cid==='nekro'){ ctx.fillStyle=K.hat; ctx.beginPath(); ctx.arc(0,-12,10,Math.PI*0.9,Math.PI*0.1); ctx.lineTo(8,-2); ctx.lineTo(6,-12); ctx.lineTo(-6,-12); ctx.lineTo(-8,-2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7,-18); ctx.lineTo(0,-26); ctx.lineTo(7,-18); ctx.fill(); if(!up){ ctx.fillStyle=K.eye; ctx.fillRect(-3.5+fx*2.5,-12,2,2.5); ctx.fillRect(1.5+fx*2.5,-12,2,2.5); } }
  else { ctx.fillStyle=K.hat; ctx.beginPath(); ctx.arc(0,-12,9.5,Math.PI*0.95,Math.PI*0.05); ctx.quadraticCurveTo(10,-2,6,-4); ctx.lineTo(6,-12); ctx.lineTo(-6,-12); ctx.lineTo(-6,-4); ctx.quadraticCurveTo(-10,-2,-9.5,-12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2,-21); ctx.quadraticCurveTo(-8,-26,-14,-22); ctx.quadraticCurveTo(-8,-20,-4,-18); ctx.fill(); }
  if(!up) drawWeapon();
  if(p.hurtT>0){ ctx.globalCompositeOperation='lighter'; drawGlow(0,-3,26,'#ff2a2a',p.hurtT*3); ctx.globalCompositeOperation='source-over'; }
  ctx.restore(); ctx.globalAlpha=1;
  if(p.spin>0){ ctx.strokeStyle='rgba(220,235,255,0.6)'; ctx.lineWidth=4; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(p.x,p.y,40+i*14,p.face+i*2,p.face+i*2+1.6); ctx.stroke(); } }
  if(P.frost>0){ ctx.strokeStyle='rgba(160,220,255,0.18)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,110+30*P.frost,0,TAU); ctx.stroke(); }
}

function hpBar(e){ if(e.hp>=e.maxHp) return; const w=e.r*2; ctx.fillStyle='#000a'; ctx.fillRect(e.x-w/2,e.y-e.r-12,w,4); ctx.fillStyle=e.elite?'#e6b450':'#d9483e'; ctx.fillRect(e.x-w/2,e.y-e.r-12,w*Math.max(0,e.hp/e.maxHp),4); }

function drawEnemy(e,corpse){
  const r=e.r, fl=e.flash>0, sp=e.spawnT>0?1-e.spawnT/0.45:1;
  if(sp<1){ ctx.strokeStyle=`rgba(190,150,255,${1-sp})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(e.x,e.y+r*0.7,r*1.7*(0.6+sp*0.4),r*0.7*(0.6+sp*0.4),0,0,TAU); ctx.stroke(); drawGlow(e.x,e.y+r*0.5,r*2.2,'#9a6aff',0.8*(1-sp)); }
  if(!e.under && !corpse) drawShadow(e.x,e.y+r*0.8,r*0.95*Math.min(1,sp+0.3));
  if(e.elite && !corpse){ drawGlow(e.x,e.y,r*2.4,'#e6b450',0.35+Math.sin(G.time*4)*0.1); }
  ctx.save(); ctx.translate(e.x,e.y);
  if(sp<1){ const b=1+2.7*Math.pow(sp-1,3)+1.7*Math.pow(sp-1,2); ctx.translate(0,r*0.8); ctx.scale(b,b); ctx.translate(0,-r*0.8); }
  if(fl && !e.under){ ctx.scale(1.12,0.9); }
  const fx=Math.cos(e.face);
  const col=c=>fl?'#ffffff':c;
  if(e.freeze>0){ ctx.globalAlpha=0.9; }
  switch(e.kind){
    case 'slime': { const sq=e.squish||0; ctx.scale(1+(0.15-sq*0.12),1-(0.15-sq*0.12)); ctx.translate(0,-sq*6);
      ctx.fillStyle=col(e.elite?'#d6c040':'#5fc35a'); ctx.beginPath(); ctx.moveTo(-r,r*0.6); ctx.quadraticCurveTo(-r,-r,0,-r); ctx.quadraticCurveTo(r,-r,r,r*0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffffff55'; ctx.beginPath(); ctx.ellipse(-r*0.4,-r*0.45,r*0.25,r*0.15,-0.5,0,TAU); ctx.fill();
      ctx.fillStyle='#14301a'; ctx.beginPath(); ctx.arc(-r*0.3+fx*2,-r*0.1,r*0.13,0,TAU); ctx.arc(r*0.3+fx*2,-r*0.1,r*0.13,0,TAU); ctx.fill(); break; }
    case 'bat': { const fl2=Math.sin(e.t*22)*0.6; ctx.fillStyle=col('#4a3260');
      for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(s*r*1.4,-r*(0.8+fl2),s*r*2.1,-r*0.2*fl2); ctx.quadraticCurveTo(s*r*1.3,r*0.2,s*r*0.9,r*0.4); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle=col('#6b4a8a'); ctx.beginPath(); ctx.arc(0,0,r*0.75,0,TAU); ctx.fill();
      ctx.fillStyle='#ff4a4a'; ctx.fillRect(-4,-2,2.5,2.5); ctx.fillRect(1.5,-2,2.5,2.5); break; }
    case 'skeleton': { const w=Math.sin(e.t*10)*2;
      ctx.fillStyle=col('#d8d2c0'); ctx.fillRect(-5,2,10,10); ctx.strokeStyle=col('#d8d2c0'); ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-3,12); ctx.lineTo(-4+w,18); ctx.moveTo(3,12); ctx.lineTo(4-w,18); ctx.stroke();
      ctx.fillStyle='#00000055'; ctx.fillRect(-5,5,10,1.5); ctx.fillRect(-5,8,10,1.5);
      ctx.fillStyle=col('#efe9d8'); ctx.beginPath(); ctx.arc(0,-6,9,0,TAU); ctx.fill(); ctx.fillRect(-5,0,10,4);
      ctx.fillStyle='#1a1416'; ctx.beginPath(); ctx.arc(-3.3+fx*1.5,-6,2.6,0,TAU); ctx.arc(3.3+fx*1.5,-6,2.6,0,TAU); ctx.fill();
      ctx.fillStyle='#ff6a4a'; ctx.fillRect(-3.8+fx*1.5,-6.5,1,1); ctx.fillRect(2.8+fx*1.5,-6.5,1,1);
      ctx.strokeStyle='#8a8070'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(8,4); ctx.lineTo(18*Math.cos(e.face)+8,18*Math.sin(e.face)+4); ctx.stroke(); break; }
    case 'archer': { ctx.fillStyle=col('#5a4026'); ctx.beginPath(); ctx.ellipse(0,5,8,8,0,0,TAU); ctx.fill();
      ctx.fillStyle=col('#7ab04f'); ctx.beginPath(); ctx.arc(0,-6,8,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7,-8); ctx.lineTo(-16,-12); ctx.lineTo(-7,-3); ctx.moveTo(7,-8); ctx.lineTo(16,-12); ctx.lineTo(7,-3); ctx.fill();
      ctx.fillStyle='#ffe04a'; ctx.fillRect(-4+fx*2,-8,2.5,2.5); ctx.fillRect(1.5+fx*2,-8,2.5,2.5);
      ctx.save(); ctx.rotate(e.face); ctx.strokeStyle='#8a5a30'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(6,0,11,-1.2,1.2); ctx.stroke(); ctx.restore(); break; }
    case 'orc': { const tele=e.st===1;
      if(tele){ ctx.save(); ctx.rotate(e.ca); ctx.fillStyle='rgba(255,80,60,0.18)'; ctx.fillRect(0,-r,280,r*2); ctx.restore(); }
      ctx.fillStyle=col(tele?'#a05a3a':'#5a7a3a'); ctx.beginPath(); ctx.ellipse(0,2,r,r*0.95,0,0,TAU); ctx.fill();
      ctx.fillStyle=col('#3a2a1a'); ctx.fillRect(-r,2,r*2,5);
      ctx.fillStyle=col('#6f8f4a'); ctx.beginPath(); ctx.arc(0,-r*0.55,r*0.6,0,TAU); ctx.fill();
      ctx.fillStyle='#f0e8d0'; ctx.beginPath(); ctx.moveTo(-6,-r*0.35); ctx.lineTo(-4,-r*0.65); ctx.lineTo(-2,-r*0.35); ctx.moveTo(6,-r*0.35); ctx.lineTo(4,-r*0.65); ctx.lineTo(2,-r*0.35); ctx.fill();
      ctx.fillStyle='#ff3a2a'; ctx.fillRect(-5+fx*2,-r*0.75,3,2.5); ctx.fillRect(2+fx*2,-r*0.75,3,2.5);
      ctx.save(); ctx.rotate(e.face); ctx.fillStyle='#5a4030'; ctx.fillRect(r*0.6,-2,r*0.9,4); ctx.fillStyle='#b8c0c8'; ctx.beginPath(); ctx.moveTo(r*1.3,-9); ctx.quadraticCurveTo(r*1.8,0,r*1.3,9); ctx.closePath(); ctx.fill(); ctx.restore(); break; }
    case 'cultist': { ctx.fillStyle=col('#3a2050'); ctx.beginPath(); ctx.moveTo(0,-r*1.2); ctx.quadraticCurveTo(r*1.1,-r*0.2,r*0.9,r); ctx.lineTo(-r*0.9,r); ctx.quadraticCurveTo(-r*1.1,-r*0.2,0,-r*1.2); ctx.fill();
      ctx.fillStyle='#120818'; ctx.beginPath(); ctx.ellipse(fx*2,-r*0.35,r*0.45,r*0.4,0,0,TAU); ctx.fill();
      ctx.fillStyle='#d07aff'; ctx.fillRect(-4+fx*2,-r*0.45,2.5,2); ctx.fillRect(1.5+fx*2,-r*0.45,2.5,2);
      if(e.st>0) drawGlow(0,-2,26,'#b06aff',e.st*2); break; }
    case 'shield': {
      ctx.fillStyle=col('#555a68'); ctx.beginPath(); ctx.ellipse(0,3,r*0.85,r*0.9,0,0,TAU); ctx.fill();
      ctx.fillStyle=col('#8a90a0'); ctx.beginPath(); ctx.arc(0,-r*0.55,r*0.5,0,TAU); ctx.fill();
      ctx.fillStyle='#16161c'; ctx.fillRect(-r*0.35+Math.cos(e.face)*3,-r*0.6,r*0.7,3);
      ctx.save(); ctx.rotate(e.face); ctx.fillStyle=col('#7a4a24'); ctx.fillRect(r*0.55,-r*1.05,8,r*2.1);
      ctx.fillStyle='#b8c0cc'; ctx.fillRect(r*0.55,-r*1.05,8,3); ctx.fillRect(r*0.55,r*1.05-3,8,3); ctx.fillStyle='#e6b450'; ctx.fillRect(r*0.6,-4,6,8); ctx.restore(); break; }
    case 'healer': {
      if(e.st>0) drawGlow(0,-4,34,'#7dff8a',e.st*1.6);
      ctx.strokeStyle='rgba(157,255,176,0.6)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(0,-r*1.25,r*0.5,r*0.16,0,0,TAU); ctx.stroke();
      ctx.fillStyle=col('#d8d0b8'); ctx.beginPath(); ctx.moveTo(0,-r*1.0); ctx.quadraticCurveTo(r,-r*0.2,r*0.85,r); ctx.lineTo(-r*0.85,r); ctx.quadraticCurveTo(-r,-r*0.2,0,-r*1.0); ctx.fill();
      ctx.fillStyle='#3a3424'; ctx.beginPath(); ctx.ellipse(fx*2,-r*0.35,r*0.42,r*0.38,0,0,TAU); ctx.fill();
      ctx.fillStyle='#7dff8a'; ctx.fillRect(-4+fx*2,-r*0.45,2.5,2); ctx.fillRect(1.5+fx*2,-r*0.45,2.5,2);
      ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(r*0.9,r); ctx.lineTo(r*0.9,-r*1.1); ctx.stroke(); drawGlow(r*0.9,-r*1.15,12,'#7dff8a',0.9); break; }
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
  if(e.freeze>0){ ctx.fillStyle='rgba(160,225,255,0.45)'; ctx.beginPath(); ctx.arc(e.x,e.y,r+3,0,TAU); ctx.fill(); }
  if(!e.under && !corpse && sp>=1) hpBar(e);
}

function drawBoss(e){
  const r=e.r, fl=e.flash>0, col=c=>fl?'#ffe2d8':c;
  ctx.globalAlpha=e.alpha??1;
  drawShadow(e.x,e.y+r*0.75,r);
  ctx.save(); ctx.translate(e.x,e.y);
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
  } else if(h.type==='cone'){
    ctx.fillStyle=cb?'rgba(255,212,0,'+(0.14+0.2*k)+')':'rgba(255,110,40,'+(0.12+0.2*k)+')'; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.arc(h.x,h.y,h.len,h.a-h.spread,h.a+h.spread); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=cb?'#ffffff':'rgba(255,140,60,0.7)'; ctx.lineWidth=cb?3:2; ctx.stroke();
  } else if(h.type==='line'){
    ctx.translate(h.x,h.y); ctx.rotate(h.a); ctx.fillStyle='rgba(255,120,60,'+(0.1+0.2*k)+')'; ctx.fillRect(0,-h.w/2,h.len,h.w);
    ctx.strokeStyle='rgba(255,150,80,0.6)'; ctx.setLineDash([10,8]); ctx.lineWidth=2; ctx.strokeRect(0,-h.w/2,h.len,h.w);
  }
  ctx.restore();
}

function drawPProj(p){
  if(p.type==='wave'){ const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.globalAlpha=Math.min(1,p.life*3);
    ctx.strokeStyle='#dfeaff'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(-p.r*0.6,0,p.r,-1.1,1.1); ctx.stroke();
    ctx.strokeStyle='#7fb4ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-p.r*0.9,0,p.r,-0.9,0.9); ctx.stroke(); ctx.lineCap='butt'; ctx.restore(); ctx.globalAlpha=1; return; }
  if(p.type==='spark'){ drawGlow(p.x,p.y,10,'#e0b0ff',1); return; }
  if(p.type==='skull'){ drawGlow(p.x,p.y,18,'#2affb0',0.8); ctx.fillStyle='#e8f6f0'; ctx.beginPath(); ctx.arc(p.x,p.y-1,5.5,0,TAU); ctx.fill(); ctx.fillRect(p.x-3,p.y+2,6,3);
    ctx.fillStyle='#0a2a20'; ctx.fillRect(p.x-3,p.y-2,2,2); ctx.fillRect(p.x+1,p.y-2,2,2); return; }
  if(p.type==='bolt'){ drawGlow(p.x,p.y,18,'#b070ff',0.9); ctx.fillStyle='#f4e6ff'; ctx.beginPath(); ctx.arc(p.x,p.y,4.5,0,TAU); ctx.fill(); return; }
  const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a);
  ctx.strokeStyle=p.gold?'#ffe08a':'#d9c49a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(4,0); ctx.stroke();
  ctx.fillStyle='#e8eef5'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(2,-3.5); ctx.lineTo(2,3.5); ctx.fill();
  ctx.fillStyle='#c8423a'; ctx.fillRect(-15,-3,4,2); ctx.fillRect(-15,1,4,2); ctx.restore();
}
function drawEProj(p){
  if(save.settings.cb){ ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,(p.r||6)+3,0,TAU); ctx.stroke(); }
  if(p.kind==='arrow'){ const a=Math.atan2(p.vy,p.vx); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.strokeStyle='#8a5a30'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(6,0); ctx.stroke(); ctx.fillStyle='#ff6a4a'; ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(3,-4); ctx.lineTo(3,4); ctx.fill(); ctx.restore(); return; }
  if(p.kind==='web'){ drawGlow(p.x,p.y,16,'#e8e8f0',0.6); ctx.fillStyle='#f4f4fa'; ctx.beginPath(); ctx.arc(p.x,p.y,6,0,TAU); ctx.fill(); return; }
  const c={orb:'#c06aff',fire:'#ff7a2a',soul:'#5affa0',rock:'#a0a4ac',blood:'#ff2a3a'}[p.kind]||'#fff';
  if(p.kind==='rock'){ ctx.fillStyle='#6a6e78'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fill(); ctx.fillStyle='#9aa0aa'; ctx.beginPath(); ctx.arc(p.x-2,p.y-2,p.r*0.5,0,TAU); ctx.fill(); return; }
  drawGlow(p.x,p.y,p.r*3,c,0.9); ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.55,0,TAU); ctx.fill();
}
function drawFx(f){
  const k=f.t/f.life;
  if(f.type==='slash'){ const R=f.r*(0.82+0.18*k), a0=f.a-f.arc/2, a1=a0+f.arc*Math.min(1,k*3+0.35);
    ctx.fillStyle=`rgba(225,238,255,${0.5*(1-k)})`; ctx.beginPath(); ctx.arc(f.x,f.y,R,a0,a1); ctx.arc(f.x,f.y,R*0.6,a1,a0,true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=`rgba(255,255,255,${1-k})`; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(f.x,f.y,R,a0,a1); ctx.stroke();
    ctx.strokeStyle=`rgba(230,180,80,${(1-k)*0.7})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(f.x,f.y,R*0.8,a0+0.2,a1-0.1); ctx.stroke(); ctx.lineCap='butt'; }
  else if(f.type==='lob'){ const x=f.x+(f.x2-f.x)*k, y=f.y+(f.y2-f.y)*k-Math.sin(k*Math.PI)*110;
    drawShadow(f.x+(f.x2-f.x)*k,f.y+(f.y2-f.y)*k,5); ctx.fillStyle='#1c1820'; ctx.beginPath(); ctx.arc(x,y,5,0,TAU); ctx.fill(); drawGlow(x+3,y-4,7,'#ffd04a',0.9); }
  else if(f.type==='skybolt'){ ctx.globalAlpha=1-k; ctx.strokeStyle=f.color; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); let x=f.x+rand(-30,30), y=f.y-560; ctx.moveTo(x,y);
    for(let i=1;i<=8;i++){ x=i<8?f.x+rand(-24,24):f.x; y=f.y-560+i*70; ctx.lineTo(x,y); } ctx.stroke(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.8; ctx.stroke(); ctx.lineCap='butt'; ctx.globalAlpha=1; drawGlow(f.x,f.y,70,f.color,1-k); }
  else if(f.type==='corpse'){ const e=f.e, by=e.y+e.r*0.8; ctx.save(); GA=Math.max(0,1-k); ctx.globalAlpha=GA; ctx.translate(e.x,by); ctx.scale(1+k*0.45,1-k*0.85); ctx.translate(-e.x,-by); drawEnemy(e,true); ctx.restore(); GA=1; ctx.globalAlpha=1; }
  else if(f.type==='ring'){ ctx.strokeStyle=f.color; ctx.globalAlpha=1-k; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*(0.4+0.6*k),0,TAU); ctx.stroke();
    if(f.fill){ ctx.fillStyle=f.color; ctx.globalAlpha=(1-k)*0.25; ctx.fill(); } ctx.globalAlpha=1; }
  else if(f.type==='beam'){ ctx.strokeStyle=`rgba(125,255,138,${1-k})`; ctx.lineWidth=4*(1-k)+1; ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.x2,f.y2); ctx.stroke(); drawGlow(f.x2,f.y2,18,'#7dff8a',1-k); }
  else if(f.type==='ghost'){ ctx.globalAlpha=0.35*(1-k); ctx.fillStyle=f.color; ctx.beginPath(); ctx.ellipse(f.x,f.y+2,11,13,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(f.x,f.y-11,8,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
  else if(f.type==='bolt'){ ctx.strokeStyle=`rgba(200,230,255,${1-k})`; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(f.x,f.y);
    for(let i=1;i<5;i++){ const t=i/5; ctx.lineTo(f.x+(f.x2-f.x)*t+rand(-8,8),f.y+(f.y2-f.y)*t+rand(-8,8)); } ctx.lineTo(f.x2,f.y2); ctx.stroke(); drawGlow(f.x2,f.y2,20,'#9fd8ff',1-k); }
}

let hudCache='';
function updHud(){
  const p=P, hp=Math.max(0,Math.ceil(p.hp)), mh=Math.round(p.maxHp);
  const key=hp+'|'+mh+'|'+run.gold+'|'+run.souls;
  if(key!==hudCache){ hudCache=key; $('hpFill').style.width=(hp/mh*100)+'%'; $('hpText').textContent=hp+' / '+mh; $('hGold').textContent=run.gold; $('hSouls').textContent=run.souls; }
  const cd=CHARS[p.cid].skill.cd*p.cdMul, sb=$('skillBtn');
  sb.style.setProperty('--p', p.skillT>0?(p.skillT/cd).toFixed(3):0); sb.classList.toggle('ready',p.skillT<=0);
  const db=$('dashBtn'); db.style.setProperty('--p', p.dashCd>0?(p.dashCd/(1.3*p.dashCdMul)).toFixed(3):0);
  { const cb=$('combo'), left=2.5-(G.time-G.comboLast), on=G.combo>=3&&left>0; cb.classList.toggle('on',on);
    if(on){ if(cb.dataset.n!=String(G.combo)){ cb.dataset.n=G.combo; cb.innerHTML=`x${G.combo}<small>Kombo</small><div class="bar"></div>`; } cb.querySelector('.bar').style.transform=`scaleX(${Math.max(0,left/2.5)})`; } }
  if(G.boss) $('bossFill').style.width=Math.max(0,G.boss.hp/G.boss.maxHp*100)+'%';
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
  const raw=(now-last)/1000, dt=clamp(raw,0,0.05); last=now;
  if(state==='combat' && G && raw>0 && raw<0.5 && !document.hidden){ PERF.acc+=raw; PERF.n++;
    if(PERF.acc>=1){ PERF.fps=Math.round(PERF.n/PERF.acc); PERF.acc=0; PERF.n=0;
      PERF.low = PERF.fps<42 ? PERF.low+1 : 0;
      if(save.settings.gfx==='auto' && !AUTO_LOW && PERF.low>=4){ AUTO_LOW=true; resize(); buildFloor();
        toast('<span style="font-size:24px">⚙️</span><div><b>Grafik automatisch reduziert</b><div class="sub" style="font-size:13px">Damit das Spiel flüssig bleibt. Ändern unter Einstellungen → Grafik.</div></div>'); } } }
  if(state==='combat' && G){ if(G.stop>0){ G.stop-=dt; } else { if(G.stopCd>0) G.stopCd-=dt; update(dt); } if(G){ draw(); updHud(); } }
  else if(state==='paused' && G){ draw(); }
  else if(!G) drawMenuBg(dt);
}
document.body.classList.toggle('lefty',!!save.settings.lefty);
resize(); showMenu(); requestAnimationFrame(loop);
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
