'use strict';
/* Arena der Verdammten – Kampfeffekte: Bodenspuren, Trümmer, Trefferblitze, Todeseffekte, Lichtblitze,
   Beschwörungsportale, schönere Hiebe und die Inszenierung von Boss-Auftritt und Boss-Tod (Kamera, Kinobalken).
   Rein optisch: nutzt Math.random statt RNG, damit Tages-/Wochenprüfungen deterministisch bleiben. */

const mr=(a,b)=>a+Math.random()*(b-a);
const smooth=x=>x*x*(3-2*x);
let VIEW_S=1;                                  // aktuelle Bildschirm-Skalierung inkl. Kamera-Zoom (von draw gesetzt)
const CAM={z:1,k:0,x:0,y:0,cine:false};

/* ---------- Bodenspuren: direkt ins Bodenbild des Raums gemalt, kosten danach nichts mehr ---------- */
function floorCtx(){ if(!floorCanvas||!G) return null; const k=floorCanvas.k||1, g=floorCanvas.getContext('2d'); g.setTransform(k,0,0,k,BORDER*k,BORDER*k); return g; }
function blobPath(g,x,y,r,sq=0.72,n=8){ const pts=[]; for(let i=0;i<n;i++){ const a=i/n*TAU, rr=r*mr(0.72,1.15); pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*sq]); }
  const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2]; const s=mid(pts[n-1],pts[0]); g.beginPath(); g.moveTo(s[0],s[1]);
  for(let i=0;i<n;i++){ const p=pts[i], q=mid(p,pts[(i+1)%n]); g.quadraticCurveTo(p[0],p[1],q[0],q[1]); } g.closePath(); }
function decal(kind,x,y,o={}){
  const g=floorCtx(); if(!g) return; G.decN=(G.decN||0)+1; if(G.decN>200 && !o.big) return;
  const s=o.s||1, a=o.a??Math.random()*TAU;
  g.save(); g.beginPath(); g.rect(0,0,AW,AH); g.clip(); g.lineCap='round'; g.lineJoin='round';
  if(kind==='splat'){ const col=o.col||'#4a0a10', al=o.al??0.5; g.globalAlpha=al; g.fillStyle=col; g.strokeStyle=col;
    blobPath(g,x,y,8*s); g.fill();
    const n=4+(Math.random()*4|0); for(let i=0;i<n;i++){ const da=a+mr(-0.75,0.75), dd=mr(9,30)*s, rr=mr(1,3.2)*s, px=x+Math.cos(da)*dd, py=y+Math.sin(da)*dd*0.72;
      g.beginPath(); g.ellipse(px,py,rr*1.6,rr,da,0,TAU); g.fill();
      if(Math.random()<0.5){ g.lineWidth=rr*0.7; g.beginPath(); g.moveTo(x+Math.cos(da)*dd*0.4,y+Math.sin(da)*dd*0.29); g.lineTo(px,py); g.stroke(); } }
    if(o.gloss){ g.globalAlpha=al*0.7; g.fillStyle='rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x-2.5*s,y-2*s,3*s,1.3*s,-0.3,0,TAU); g.fill(); } }
  else if(kind==='scorch'){ const R=o.r||40, gr=g.createRadialGradient(x,y,0,x,y,R);
    gr.addColorStop(0,'rgba(6,3,2,0.55)'); gr.addColorStop(0.55,'rgba(16,8,4,0.32)'); gr.addColorStop(1,'rgba(16,8,4,0)');
    g.save(); g.translate(x,y); g.scale(1,0.72); g.fillStyle=gr; g.beginPath(); g.arc(0,0,R,0,TAU); g.fill(); g.restore();
    g.strokeStyle='rgba(0,0,0,0.25)'; for(let i=0;i<8;i++){ const aa=Math.random()*TAU, r0=R*mr(0.25,0.4), r1=R*mr(0.65,1.05); g.lineWidth=mr(1,2.2);
      g.beginPath(); g.moveTo(x+Math.cos(aa)*r0,y+Math.sin(aa)*r0*0.72); g.lineTo(x+Math.cos(aa)*r1,y+Math.sin(aa)*r1*0.72); g.stroke(); }
    if(o.ember){ g.fillStyle='rgba(255,130,50,0.35)'; for(let i=0;i<5;i++){ g.beginPath(); g.arc(x+mr(-0.4,0.4)*R,y+mr(-0.3,0.3)*R,mr(0.8,1.8),0,TAU); g.fill(); } } }
  else if(kind==='crack'){ const R=o.r||50, n=o.n||7;
    g.fillStyle='rgba(0,0,0,0.3)'; blobPath(g,x,y,R*0.2,0.7,7); g.fill();
    for(let i=0;i<n;i++){ let aa=a+i/n*TAU+mr(-0.3,0.3), px=x, py=y; const len=R*mr(0.55,1.1), pts=[[px,py]];
      for(let j=0;j<5;j++){ aa+=mr(-0.6,0.6); px+=Math.cos(aa)*len/5; py+=Math.sin(aa)*len/5*0.72; pts.push([px,py]); }
      g.strokeStyle='rgba(0,0,0,0.5)'; for(let j=1;j<pts.length;j++){ g.lineWidth=Math.max(0.7,2.8*s*(1-j/pts.length)); g.beginPath(); g.moveTo(pts[j-1][0],pts[j-1][1]); g.lineTo(pts[j][0],pts[j][1]); g.stroke(); }
      g.strokeStyle='rgba(255,255,255,0.07)'; g.lineWidth=1; g.beginPath(); g.moveTo(pts[0][0]+1,pts[0][1]+1); for(const q of pts) g.lineTo(q[0]+1,q[1]+1); g.stroke();
      if(o.glow){ g.strokeStyle=o.glow; g.globalAlpha=0.4; g.lineWidth=1.3; g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(const q of pts.slice(1,4)) g.lineTo(q[0],q[1]); g.stroke(); g.globalAlpha=1; } } }
  else if(kind==='smudge'){ const R=o.r||26, gr=g.createRadialGradient(x,y,0,x,y,R); gr.addColorStop(0,o.col||'rgba(30,14,48,0.5)'); gr.addColorStop(1,'rgba(30,14,48,0)');
    g.save(); g.translate(x,y); g.scale(1,0.7); g.fillStyle=gr; g.beginPath(); g.arc(0,0,R,0,TAU); g.fill(); g.restore(); }
  else { g.save(); g.translate(x,y); g.rotate(a); g.globalAlpha=0.85;
    if(kind==='bone'){ g.fillStyle='rgba(226,216,196,0.85)'; g.fillRect(-4*s,-0.9*s,8*s,1.8*s); g.beginPath(); for(const sx of [-4,4]) for(const sy of [-1,1]){ g.moveTo(sx*s+1.3*s,sy*s); g.arc(sx*s,sy*s,1.3*s,0,TAU); } g.fill(); }
    else if(kind==='rock'){ g.fillStyle=o.col||'#5a5e66'; g.beginPath(); g.moveTo(-3*s,-2*s); g.lineTo(2*s,-3*s); g.lineTo(3.5*s,1*s); g.lineTo(-1*s,3*s); g.closePath(); g.fill(); g.fillStyle='rgba(255,255,255,0.16)'; g.fillRect(-2*s,-2*s,2*s,1*s); }
    else if(kind==='wood'){ g.fillStyle=o.col||'#5a3a1e'; g.fillRect(-4.5*s,-1.2*s,9*s,2.4*s); g.fillStyle='rgba(0,0,0,0.3)'; g.fillRect(-4.5*s,0.3*s,9*s,0.9*s); }
    else if(kind==='feather'){ g.fillStyle=o.col||'#f0e6c8'; g.beginPath(); g.ellipse(0,0,4.5*s,1.5*s,0,0,TAU); g.fill(); g.strokeStyle='rgba(180,150,80,0.7)'; g.lineWidth=0.6; g.beginPath(); g.moveTo(-5*s,0); g.lineTo(4.5*s,0); g.stroke(); }
    g.restore(); }
  g.restore();
}

/* ---------- Trümmer: kleine Teile mit Höhe (z), Schwerkraft und Abprallen; liegen gebliebene werden zur Bodenspur ---------- */
const STAMP={bone:1,rock:1,wood:1,gib:1,goo:1,feather:1};
function debris(kind,x,y,n,o={}){
  if(!G) return; const fx=FX(); if(!fx) n=Math.ceil(n*0.5); const L=G.debris||(G.debris=[]), cap=fx?170:60;
  for(let i=0;i<n && L.length<cap;i++){ const a=o.a!==undefined?o.a+mr(-1,1)*(o.spread||1.2):Math.random()*TAU, sp=(o.sp||130)*mr(0.35,1.1), j=o.jit??6;
    L.push({kind, x:x+mr(-1,1)*j, y:y+mr(-1,1)*j*0.6, z:o.z??mr(4,14), vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*0.75, vz:(o.up??170)*mr(0.5,1.25),
      rot:Math.random()*TAU, vr:mr(-16,16), s:(o.s||1)*mr(0.7,1.3), col:o.col, dcol:o.dcol, t:0, life:o.life||mr(1.4,2.2), stamp:o.stamp!==false && !!STAMP[kind], dir:a}); }
}
function stampDebris(d,small){
  if(d.kind==='gib') decal('splat',d.x,d.y,{col:d.dcol||'#4a0a10',s:small?0.28:0.4,a:d.dir,al:0.45});
  else if(d.kind==='goo') decal('splat',d.x,d.y,{col:d.dcol||'#2e6a1e',s:small?0.3:0.42,a:d.dir,al:0.45,gloss:!small});
  else if(!small) decal(d.kind,d.x,d.y,{col:d.col,s:d.s,a:d.rot});
}
function updFxWorld(dt){
  if(G.flashL && G.flashL.length){ for(const l of G.flashL) l.t+=dt; G.flashL=G.flashL.filter(l=>l.t<l.life); }
  const L=G.debris; if(!L||!L.length) return;
  for(const d of L){ d.t+=dt;
    if(d.kind==='smoke'){ d.x+=d.vx*dt; d.y+=d.vy*dt; d.z+=d.vz*dt; d.vx*=1-dt*1.2; d.vy*=1-dt*1.2; continue; }
    if(d.rest) continue;
    const fl=d.kind==='feather'||d.kind==='ember'&&d.slow; d.vz-=(fl?140:950)*dt; if(fl && d.vz<-38) d.vz=-38;
    d.x+=d.vx*dt; d.y+=d.vy*dt; d.z+=d.vz*dt; d.rot+=d.vr*dt*(fl?0.3:1);
    if(fl){ d.vx*=1-dt*1.6; d.vy*=1-dt*1.6; d.x+=Math.sin(d.t*5+d.rot)*22*dt; }
    if(d.x<4||d.x>AW-4){ d.vx*=-0.5; d.x=clamp(d.x,4,AW-4); } if(d.y<4||d.y>AH-4){ d.vy*=-0.5; d.y=clamp(d.y,4,AH-4); }
    if(d.z<=0){ d.z=0;
      if(d.vz<-110 && !fl){ d.vz*=-0.36; d.vx*=0.5; d.vy*=0.5; d.vr*=0.5; if(d.stamp && (d.kind==='gib'||d.kind==='goo')) stampDebris(d,true); }
      else { d.rest=true; d.vz=d.vx=d.vy=0; if(d.stamp){ stampDebris(d); d.t=d.life; } else d.t=Math.max(d.t,d.life-0.5); } } }
  G.debris=L.filter(d=>d.t<d.life);
}
function drawDebris(){
  const L=G.debris; if(!L||!L.length) return;
  for(const d of L){ const fade=Math.min(1,(d.life-d.t)/0.5), y=d.y-d.z, s=d.s; if(fade<=0) continue;
    if(d.kind==='smoke'){ const k=d.t/d.life; drawGlow(d.x,y,s*(10+k*22),d.col||'#2a2428',0.5*(1-k)*Math.min(1,d.t*8)); continue; }
    if(d.kind==='ember'){ ctx.globalCompositeOperation='lighter'; drawGlow(d.x,y,5*s,d.col||'#ff8a2a',fade); ctx.globalCompositeOperation='source-over'; continue; }
    ctx.globalAlpha=fade;
    if(d.z>3){ ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(d.x,d.y,2.6*s,1.1*s,0,0,TAU); ctx.fill(); }
    ctx.save(); ctx.translate(d.x,y); ctx.rotate(d.rot);
    switch(d.kind){
      case 'bone': ctx.fillStyle='#ece4d0'; ctx.fillRect(-4*s,-0.9*s,8*s,1.8*s); ctx.beginPath(); for(const sx of [-4,4]) for(const sy of [-1,1]){ ctx.moveTo(sx*s+1.3*s,sy*s); ctx.arc(sx*s,sy*s,1.3*s,0,TAU); } ctx.fill(); break;
      case 'rock': ctx.fillStyle=d.col||'#7a7e88'; ctx.beginPath(); ctx.moveTo(-3*s,-2*s); ctx.lineTo(2*s,-3*s); ctx.lineTo(3.5*s,1*s); ctx.lineTo(-1*s,3*s); ctx.closePath(); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.fillRect(-2*s,-2*s,2*s,1.2*s); break;
      case 'gib': ctx.fillStyle=d.col||'#7a1018'; ctx.beginPath(); ctx.ellipse(0,0,2.4*s,1.8*s,0,0,TAU); ctx.fill(); break;
      case 'goo': ctx.fillStyle=d.col||'#7fe36a'; ctx.beginPath(); ctx.ellipse(0,0,2.8*s,2*s,0,0,TAU); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(-1*s,-1.2*s,1.2*s,0.9*s); break;
      case 'wood': ctx.fillStyle=d.col||'#7a5230'; ctx.fillRect(-4.5*s,-1.2*s,9*s,2.4*s); ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(-4.5*s,0.4*s,9*s,0.8*s); break;
      case 'feather': ctx.fillStyle=d.col||'#f4ecd0'; ctx.beginPath(); ctx.ellipse(0,0,4.5*s,1.5*s,0,0,TAU); ctx.fill(); ctx.strokeStyle='rgba(200,170,90,0.8)'; ctx.lineWidth=0.6; ctx.beginPath(); ctx.moveTo(-4.5*s,0); ctx.lineTo(4.5*s,0); ctx.stroke(); break;
      case 'shard': ctx.globalCompositeOperation='lighter'; ctx.fillStyle=d.col||'#bfe6ff'; ctx.beginPath(); ctx.moveTo(0,-4*s); ctx.lineTo(1.8*s,2*s); ctx.lineTo(-1.8*s,2*s); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation='source-over'; break;
    }
    ctx.restore(); }
  ctx.globalAlpha=1;
}
function smoke(x,y,n,col,s=1){ if(!G||!FX()) return; const L=G.debris||(G.debris=[]);
  for(let i=0;i<n && L.length<190;i++){ const a=Math.random()*TAU, sp=mr(10,50); L.push({kind:'smoke',x:x+Math.cos(a)*8*s,y:y+Math.sin(a)*5*s,z:mr(0,10),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*0.5,vz:mr(18,40),s:s*mr(0.8,1.3),col,t:0,life:mr(0.8,1.4)}); } }

/* ---------- Lichtblitze: kurze Lichtquellen in der Lichtkarte (Explosionen, kritische Treffer, Bosstod) ---------- */
function flashLight(x,y,r,life,a=1){ if(!G||!FX()) return; const L=G.flashL||(G.flashL=[]); L.push({x,y,r,t:0,life,a}); if(L.length>24) L.shift(); }

/* ---------- Todeseffekte je Gegnerart ---------- */
const DEATH_FX={
  slime:{d:'goo',n:7,col:'#8af07a',dec:'#2e6a1e',gloss:1}, bat:{d:'gib',n:3,dec:'#3a0a14',s:0.6},
  skeleton:{d:'bone',n:6,up:210}, archer:{d:'gib',n:4,dec:'#4a0c10'}, orc:{d:'gib',n:7,dec:'#4a0c10',s:1.3},
  cultist:{d:'gib',n:5,dec:'#4a0c10',ex:'ember',exn:5,excol:'#b06aff'}, imp:{d:'ember',n:12,col:'#ff8a2a',scorch:28},
  whelp:{d:'gib',n:5,dec:'#4a0c10',ex:'ember',exn:6}, magma:{d:'rock',n:9,col:'#3a2420',scorch:44,ex:'ember',exn:10},
  kobold:{d:'wood',n:5,s:0.7,scorch:26}, shield:{d:'wood',n:6,dec:'#4a0c10'}, healer:{d:'gib',n:4,dec:'#4a0c10',ex:'ember',exn:5,excol:'#7dff8a'},
  worm:{d:'goo',n:7,col:'#c86a8e',dec:'#4a1a32'}, spiderling:{d:'goo',n:3,col:'#9aaa4a',dec:'#34420e',s:0.6},
  shroom:{d:'goo',n:6,col:'#c08ad8',dec:'#3a1a4a'}, urchin:{d:'shard',n:8,col:'#d8b080'}, shaman:{d:'wood',n:4,dec:'#4a0c10',ex:'ember',exn:5,excol:'#6ab8a0'},
  totem:{d:'wood',n:10,s:1.3,col:'#8a5a2a'}, hound:{d:'ember',n:10,col:'#8a6aff',smudge:1}, wraith:{d:'ember',n:12,col:'#c8d8ff',slow:1},
  gargoyle:{d:'rock',n:10,col:'#5a6278',crack:40}, seraph:{d:'feather',n:10,col:'#f4ecd0',ex:'ember',exn:6,excol:'#ffe08a'}, mimic:{d:'wood',n:12,s:1.4,col:'#7d4a22'},
};
const BOSS_DEATH={
  golem:{d:'rock',n:40,col:'#7a7e88',s:2,crack:120}, spider:{d:'goo',n:28,col:'#9aaa4a',dec:'#34420e',s:1.8},
  lich:{d:'bone',n:22,s:1.4,ex:'ember',excol:'#7dffb0',exn:24}, vampire:{d:'gib',n:26,dec:'#4a0612',s:1.6,ex:'ember',excol:'#ff2a3a',exn:18},
  dragon:{d:'rock',n:24,col:'#5a1a14',scorch:130,ex:'ember',exn:32}, lavaworm:{d:'rock',n:26,col:'#3a2420',scorch:120,ex:'ember',exn:32},
  fallen:{d:'shard',n:34,col:'#c8d8ff',crack:130,glow:'#a8c0ff',ex:'feather',exn:16,excol:'#e8eeff'},
};
function deathFx(e,big){
  const D=(big?BOSS_DEATH:DEATH_FX)[e.kind]; if(!D||!G) return;
  const ha=P?Math.atan2(e.y-P.y,e.x-P.x):Math.random()*TAU, el=e.elite&&!big?1.4:1, sz=big?1:Math.max(0.7,e.r/14)*(e.small?0.7:1);
  debris(D.d,e.x,e.y-(big?e.r*0.4:4),Math.round(D.n*el*(e.small?0.6:1)),{col:D.col,dcol:D.dec,s:(D.s||1)*(e.small?0.7:1),a:ha,spread:big?3:1.3,sp:big?280:140,up:D.up||(big?320:170),jit:e.r*(big?0.6:0.4)});
  if(D.ex) debris(D.ex,e.x,e.y-6,Math.round(D.exn*el),{col:D.excol,a:ha,spread:2.2,sp:big?240:110,up:big?330:200,stamp:false});
  if(D.slow && G.debris) for(const d of G.debris.slice(-D.n)) if(d.kind==='ember'){ d.slow=1; d.vz=mr(30,80); d.life=mr(0.8,1.3); }
  if(D.dec) decal('splat',e.x,e.y+e.r*0.5,{col:D.dec,s:sz*el*(big?3.2:1),a:ha,gloss:D.gloss,big});
  if(D.scorch) decal('scorch',e.x,e.y+e.r*0.4,{r:D.scorch*el,ember:true,big});
  if(D.crack) decal('crack',e.x,e.y+e.r*0.4,{r:D.crack*el,glow:D.glow,big});
  if(D.smudge) decal('smudge',e.x,e.y+e.r*0.5,{r:e.r*2.2*el});
  if(e.elite && !big){ flashLight(e.x,e.y,160,0.35,0.9); G.fx.push({type:'shock',x:e.x,y:e.y-6,r:e.r*4,t:0,life:0.45,color:'#ffe08a'}); }
}

/* ---------- Treffer, Explosionen, Einschläge ---------- */
function impactFx(e,ha,crit){
  if(!G||G.fx.length>170) return;
  const x=e.x-Math.cos(ha)*e.r*0.55, y=e.y-Math.sin(ha)*e.r*0.55-3;
  G.fx.push({type:'impact',x,y,a:ha+mr(-0.5,0.5),t:0,life:crit?0.17:0.11,big:crit?1:0});
  if(crit) flashLight(x,y,90,0.16,0.8);
}
function explosionFx(x,y,r,color){
  if(!G) return; flashLight(x,y,r*2.6,0.35,1); decal('scorch',x,y+4,{r:r*0.75});
  G.fx.push({type:'flare',x,y,r:r*0.9,t:0,life:0.16,color});
  smoke(x,y,5,'#2a2428',Math.max(0.8,r/60)); debris('ember',x,y,5,{col:color,sp:200,up:230,stamp:false});
}
function hazardFx(h){
  if(h.visual) return; const c=h.color||'';
  if(h.meteor || /^#ff[6-9a]/i.test(c)){ decal('scorch',h.x,h.y,{r:h.r*0.8,ember:true}); flashLight(h.x,h.y,h.r*2.4,0.3,0.9); debris('ember',h.x,h.y,4,{col:c||'#ff8a2a',sp:160,up:200,stamp:false}); }
  else if(c==='#ffb35a'){ decal('crack',h.x,h.y,{r:h.r*0.6,n:6}); debris('rock',h.x,h.y,6,{sp:150,up:220,col:'#6a6e78'}); smoke(h.x,h.y,4,'#4a4440',1.2); }
  else { decal('smudge',h.x,h.y,{r:h.r*0.7,col:'rgba(40,14,50,0.45)'}); flashLight(h.x,h.y,h.r*2,0.25,0.7); }
}

/* ---------- Zeichnen: Hiebe, Trefferstern, Aufblitzen, Portale, Geschossspuren ---------- */
function drawSlash(f,k){
  const R=f.r*(0.84+0.16*k), a0=f.a-f.arc/2, prog=Math.min(1,k*3.2+0.3), a1=a0+f.arc*prog, tail=Math.max(a0,a1-f.arc*(0.95-k*0.45)), e=1-k;
  const span=a1-tail; if(span<=0.01) return;
  const n=16, Wd=R*0.42*(1-k*0.45), base=f.red?'255,110,90':'200,222,255';
  ctx.save(); ctx.globalCompositeOperation='lighter';
  ctx.beginPath();
  for(let i=0;i<=n;i++){ const aa=tail+span*i/n; ctx.lineTo(f.x+Math.cos(aa)*R,f.y+Math.sin(aa)*R); }
  for(let i=n;i>=0;i--){ const u=i/n, aa=tail+span*u, w=Wd*Math.pow(u,0.75); ctx.lineTo(f.x+Math.cos(aa)*(R-w),f.y+Math.sin(aa)*(R-w)); }
  ctx.closePath();
  if(ctx.createConicGradient){ const g=ctx.createConicGradient(tail,f.x,f.y), sp=span/TAU;
    g.addColorStop(0,`rgba(${base},0)`); g.addColorStop(Math.min(0.998,sp*0.8),`rgba(${base},${0.5*e})`); g.addColorStop(Math.min(0.999,sp),`rgba(255,255,255,${0.95*e})`); g.addColorStop(Math.min(1,sp+0.001),`rgba(${base},0)`); g.addColorStop(1,`rgba(${base},0)`);
    ctx.fillStyle=g; } else ctx.fillStyle=`rgba(${base},${0.45*e})`;
  ctx.fill();
  ctx.lineCap='round'; ctx.strokeStyle=`rgba(255,255,255,${0.95*e})`; ctx.lineWidth=2.6*e+0.6; ctx.beginPath(); ctx.arc(f.x,f.y,R,Math.max(tail,a1-f.arc*0.45),a1); ctx.stroke();
  ctx.strokeStyle=f.red?`rgba(255,170,120,${0.6*e})`:`rgba(230,190,90,${0.55*e})`; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(f.x,f.y,R*0.82,Math.max(tail,a1-f.arc*0.6),a1-0.05); ctx.stroke();
  ctx.restore(); ctx.lineCap='butt';
  if(FX() && k<0.45 && state==='combat' && Math.random()<0.55){ const px=f.x+Math.cos(a1)*R, py=f.y+Math.sin(a1)*R; part(px,py,-Math.sin(a1)*130+mr(-30,30),Math.cos(a1)*130+mr(-30,30),0.2,1.6,f.red?'#ffb09a':'#eef4ff',true); }
}
function drawFxExtra(f,k){
  if(f.type==='impact'){ const e=1-k, S=(f.big?22:13)*(0.55+0.6*Math.sqrt(k)); ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.a); ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=f.big?`rgba(255,222,130,${e})`:`rgba(255,250,236,${e*0.95})`;
    ctx.beginPath(); ctx.moveTo(-S*0.32,0); ctx.lineTo(0,-S); ctx.lineTo(S*0.32,0); ctx.lineTo(0,S); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-S*0.7,0); ctx.lineTo(0,-S*0.16); ctx.lineTo(S*0.7,0); ctx.lineTo(0,S*0.16); ctx.closePath(); ctx.fill();
    if(f.big){ ctx.strokeStyle=`rgba(255,240,200,${e*0.85})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,S*0.95*k+4,0,TAU); ctx.stroke(); }
    ctx.restore(); return true; }
  if(f.type==='flare'){ const e=1-k; ctx.save(); ctx.globalCompositeOperation='lighter'; drawGlow(f.x,f.y,f.r*(0.8+0.5*k),'#fff2c8',e); drawGlow(f.x,f.y,f.r*1.6,f.color||'#ff8a3a',0.7*e); ctx.restore(); return true; }
  return false;
}
function drawSpawn(s){
  const T=s.boss?1.1:0.6, k=clamp(1-s.t/T,0,1), R=(s.boss?56:18)*(0.45+0.75*Math.min(1,k*1.8)), oy=s.boss?12:7, col=s.boss?'255,110,70':'180,130,255';
  ctx.save(); ctx.translate(s.x,s.y+oy); ctx.scale(1,0.42);
  const g=ctx.createRadialGradient(0,0,0,0,0,R); g.addColorStop(0,'rgba(6,2,14,0.9)'); g.addColorStop(0.7,'rgba(30,10,52,0.55)'); g.addColorStop(1,'rgba(30,10,52,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill();
  ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  for(let i=0;i<3;i++){ const a=G.time*(4+i)*(i%2?-1:1)+i*2.1; ctx.strokeStyle=`rgba(${col},${0.3+0.45*k})`; ctx.lineWidth=s.boss?4:2.4; ctx.beginPath(); ctx.arc(0,0,R*(0.5+i*0.2),a,a+1.4+k*1.2); ctx.stroke(); }
  ctx.restore(); ctx.lineCap='butt';
  drawGlow(s.x,s.y+oy*0.5,s.boss?80:26,s.boss?'#ff5a3a':'#9a6aff',0.3+0.45*k);
  if(FX() && state==='combat' && Math.random()<(s.boss?0.9:0.35)){ const a=Math.random()*TAU; part(s.x+Math.cos(a)*R*0.6,s.y+oy+Math.sin(a)*R*0.25,0,-mr(40,95),0.5,2,s.boss?'#ff9a7a':'#c8a8ff',true); }
}
const EP_COL={orb:'#c06aff',fire:'#ff7a2a',soul:'#5affa0',blood:'#ff2a3a',star:'#a8c0ff'};
function drawEProjTrail(p){
  const c=EP_COL[p.kind]; if(!c||!FX()) return; const r=p.r||6;
  ctx.globalCompositeOperation='lighter';
  for(let i=1;i<=3;i++) drawGlow(p.x-p.vx*0.018*i,p.y-p.vy*0.018*i,r*(2.3-i*0.45),c,0.45-i*0.11);
  ctx.globalCompositeOperation='source-over';
  if(p.kind==='fire' && state==='combat' && Math.random()<0.25) part(p.x,p.y,mr(-20,20),mr(-30,-5),0.35,2,'#ffb04a',true);
}

/* ---------- Boss-Auftritt: Kinobalken, HUD ausblenden, Kamera fährt zum Boss ---------- */
function bossIntro(){ if(!G) return; G.cine={t:0,life:3.0,x:AW/2,y:AH*0.3}; }
function skipCine(){ if(G && G.cine) G.cine.skip=true; }
function updCine(dt){ const c=G.cine; if(!c) return; c.t+=dt; if(c.t>=c.life || (c.skip && c.t>1.35)) G.cine=null; }
function camUpdate(){
  CAM.z=1; CAM.k=0; if(!G) return; const amp=save.settings.calm?0.5:1;
  const c=G.cine; if(c){ const t=c.t, w=smooth(clamp(t/0.9,0,1))*(1-smooth(clamp((t-(c.life-0.75))/0.75,0,1))); CAM.z=1+0.16*w*amp; CAM.k=w*0.8; CAM.x=c.x; CAM.y=c.y+90; }
  const d=G.bossDie; if(d){ const t=d.t, w=smooth(clamp(t/0.3,0,1))*(1-smooth(clamp((t-(d.life-0.6))/0.6,0,1))); if(w>CAM.k){ CAM.z=1+0.14*w*amp; CAM.k=w*0.85; CAM.x=d.e.x; CAM.y=d.e.y-d.e.r*0.3; } }
}
function drawCine(){
  let k=0; const c=G.cine, d=G.bossDie;
  if(c) k=smooth(clamp(c.t/0.4,0,1))*(1-smooth(clamp((c.t-(c.life-0.45))/0.45,0,1)));
  if(d) k=Math.max(k,0.75*smooth(clamp(d.t/0.3,0,1))*(1-smooth(clamp((d.t-(d.life-0.5))/0.5,0,1))));
  const on=k>0.05; if(on!==CAM.cine){ CAM.cine=on; $('hud').classList.toggle('cine',on); }
  if(k<=0) return; const h=Math.round(Math.min(H*0.1,90)*k); ctx.fillStyle='#000'; ctx.fillRect(0,0,W,h); ctx.fillRect(0,H-h,W,h);
}
function endCineHud(){ if(CAM.cine){ CAM.cine=false; $('hud').classList.remove('cine'); } }

/* ---------- Boss-Tod: Zittern, Lichtrisse, kleine Explosionen, dann die große Detonation ---------- */
function bossDeathStart(e){
  G.bossDie={e:Object.assign({},e,{flash:0,under:false,alpha:1,cast:null,tele:0,shieldT:0,leap:null,dying:true}),t:0,tb:1.3,life:1.85,blown:false,popT:0.12};
  G.whiteFlash=0.3; G.shake=12; G.slowT=Math.max(G.slowT,0.5); buzz(120); flashLight(e.x,e.y,260,0.5,1);
}
function updBossDie(dt){
  const d=G.bossDie, e=d.e; d.t+=dt;
  if(!d.blown){ const k=clamp(d.t/d.tb,0,1); e.jx=mr(-1,1)*(1+3*k); e.jy=mr(-1,1)*(1+2*k); if(e.flash>0) e.flash-=dt;
    d.popT-=dt; if(d.popT<=0){ d.popT=mr(0.09,0.18)*(1-0.45*k); const a=Math.random()*TAU, rr=e.r*mr(0.2,0.95), x=e.x+Math.cos(a)*rr, y=e.y-e.r*0.3+Math.sin(a)*rr*0.7;
      G.fx.push({type:'ring',x,y,r:mr(16,30)*(1+k),t:0,life:0.25,color:'#ffe8b0',fill:true}); burst(x,y,7,enemyColor(e),180); flashLight(x,y,130,0.25,0.9); sfx('hit'); G.shake+=1.5+2*k; e.flash=0.06; }
    if(d.t>=d.tb){ d.blown=true; bossBlast(e); } }
  if(d.t>=d.life){ G.bossDie=null; clearRoom(); }
}
function bossBlast(e){
  G.whiteFlash=0.45; G.shake=24; buzz(220); G.slowT=Math.max(G.slowT,0.45); hitstop(0.12); sfx('kill'); sfx('boom'); musicSting('win'); crowdSound(1.4); hype(1);
  flashLight(e.x,e.y,700,0.9,1);
  G.fx.push({type:'shock',x:e.x,y:e.y,r:e.r*7,t:0,life:0.8,color:'#fff4d0'}); G.fx.push({type:'shock',x:e.x,y:e.y,r:e.r*4.5,t:0,life:0.55,color:'#ffd08a'});
  G.fx.push({type:'ring',x:e.x,y:e.y,r:e.r*3,t:0,life:0.4,color:'#fff0c0',fill:true}); G.fx.push({type:'flare',x:e.x,y:e.y-e.r*0.3,r:e.r*3,t:0,life:0.35,color:'#ffb04a'});
  for(let i=0;i<60;i++){ const a=rand(0,TAU),s=rand(100,420); part(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s,rand(0.8,1.6),rand(3,6),Math.random()<0.5?'#ffd34d':'#fff3b0',true,120); }
  burst(e.x,e.y,50,enemyColor(e),320); smoke(e.x,e.y,10,'#2a2428',2.2); deathFx(e,true);
  for(let i=0;i<40;i++) dropCoin(e.x+rand(-40,40),e.y+rand(-40,40),2);
}
function drawBossDieFx(d){
  if(d.blown) return; const e=d.e, t=d.t, k=clamp(t/d.tb,0,1), n=8, cx=e.x+(e.jx||0), cy=e.y-e.r*0.3;
  ctx.save(); ctx.translate(cx,cy); ctx.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){ const a=i/n*TAU+t*0.7+(i%2)*0.35, L=e.r*(1.3+k*4.2)*(0.7+0.3*Math.sin(i*1.7+t*9)), w=0.045+0.06*k;
    const g=ctx.createLinearGradient(0,0,Math.cos(a)*L,Math.sin(a)*L); g.addColorStop(0,`rgba(255,250,225,${0.85*k+0.1})`); g.addColorStop(1,'rgba(255,215,140,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,L,a-w,a+w); ctx.closePath(); ctx.fill(); }
  ctx.restore(); drawGlow(cx,cy,e.r*(1.4+k*2.2),'#fff0c8',0.35+0.55*k);
}
