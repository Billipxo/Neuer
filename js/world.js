'use strict';
/* Arena der Verdammten – Canvas, Arena-Boden, Tribünen, Zuschauer, Wetter, Licht und Ambiente */

/* ---------------- CANVAS ---------------- */
const cvs=$('game'); let ctx=cvs.getContext('2d');
let W=0,H=0,DPR=1,SCALE=1,vignette=null;
const AW=760, AH=1000, WALL=44;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,FX()?2:1.25); W=innerWidth; H=innerHeight;
  cvs.width=Math.round(W*DPR); cvs.height=Math.round(H*DPR);
  // Hochformat (Handy): ~440 Einheiten quer; Querformat klein (Handy quer): eng; Querformat groß (PC, Tablet): ~820 Einheiten hoch für mehr Überblick
  SCALE = W>H ? (H<560 ? Math.max(0.6,Math.min(H/360,W/720)) : Math.max(0.6,Math.min(H/820,W/1100))) : Math.max(0.6, Math.min(W, H*0.78)/440);
  vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75);
  vignette.addColorStop(0,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,0,0,0.6)');
  if(!G) floorCanvas=null;   // im Kampf (Fenstergröße, Vollbild) bleibt der Boden samt Spuren erhalten; der nächste Raum baut ihn neu
}
addEventListener('resize',resize);

const glowCache={};
function glow(color){ if(color.length===4) color='#'+color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
  if(glowCache[color]) return glowCache[color];
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,color); gr.addColorStop(0.35,color+'88'); gr.addColorStop(1,color+'00');
  g.fillStyle=gr; g.fillRect(0,0,64,64); return glowCache[color]=c;
}
let GA=1;
function drawGlow(x,y,r,color,a=1){ const sb=ctx.shadowBlur; if(sb) ctx.shadowBlur=0; ctx.globalAlpha=a*GA; ctx.drawImage(glow(color),x-r,y-r,r*2,r*2); ctx.globalAlpha=GA; if(sb) ctx.shadowBlur=sb; }

let floorCanvas=null, floorAct=-1, DECOR={puddles:[],cracks:[],candles:[],runes:[]};
function shade(hex,amt){ const n=parseInt(hex.slice(1),16), f=v=>clamp(Math.round(v+amt),0,255); return `rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`; }
/* Boden und Wände werden einmal pro Raum in ein Hintergrundbild gezeichnet */
function buildFloor(){
  const A=actOf(run.act), va=visAct(), k=Math.min(1.6,SCALE*DPR);
  const c=document.createElement('canvas'); c.width=Math.ceil((AW+BORDER*2)*k); c.height=Math.ceil((AH+BORDER*2)*k);
  const g=c.getContext('2d'); g.scale(k,k); g.translate(BORDER,BORDER);
  DECOR={puddles:[],cracks:[],candles:[],runes:[]};
  drawStands(g,A);
  // Wände aus Ziegeln mit Fase
  g.fillStyle=A.wall; g.fillRect(-WALL,-WALL,AW+WALL*2,WALL); g.fillRect(-WALL,AH,AW+WALL*2,WALL); g.fillRect(-WALL,0,WALL,AH); g.fillRect(AW,0,WALL,AH);
  for(let y=-WALL;y<AH+WALL;y+=16) for(let x=-WALL-15;x<AW+WALL;x+=30){
    const bx=x+(Math.floor((y+WALL)/16)%2?15:0);
    if(bx>-2&&bx<AW-26&&y>-2&&y<AH-14) continue;
    g.fillStyle=shade(A.wall,rand(5,20)); g.fillRect(bx+1,y+1,28,14);
    g.fillStyle='rgba(255,255,255,0.06)'; g.fillRect(bx+1,y+1,28,2);
    g.fillStyle='rgba(0,0,0,0.32)'; g.fillRect(bx+1,y+13,28,2);
  }
  const wf=g.createLinearGradient(0,-WALL,0,0); wf.addColorStop(0,'rgba(0,0,0,0.55)'); wf.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=wf; g.fillRect(-WALL,-WALL,AW+WALL*2,WALL);
  // Steinfliesen mit Licht- und Schattenkante
  g.save(); g.beginPath(); g.rect(0,0,AW,AH); g.clip();
  g.fillStyle=A.grout; g.fillRect(0,0,AW,AH);
  const T=48;
  for(let y=0;y<AH;y+=T){ const off=(y/T)%2?T/2:0;
    for(let x=-off;x<AW;x+=T){
      g.fillStyle=shade(RNG()<0.5?A.floorA:A.floorB,rand(-9,9)); g.fillRect(x+2,y+2,T-4,T-4);
      g.fillStyle='rgba(255,255,255,0.07)'; g.fillRect(x+2,y+2,T-4,2); g.fillRect(x+2,y+2,2,T-4);
      g.fillStyle='rgba(0,0,0,0.28)'; g.fillRect(x+2,y+T-4,T-4,2); g.fillRect(x+T-4,y+2,2,T-4);
      const r=RNG();
      if(r<0.08){ g.strokeStyle='rgba(0,0,0,0.45)'; g.lineWidth=1.2; g.beginPath(); let px=x+rand(8,T-8),py=y+4; g.moveTo(px,py);
        for(let j=0;j<4;j++){ px=clamp(px+rand(-8,8),x+3,x+T-3); py=Math.min(py+rand(6,12),y+T-3); g.lineTo(px,py); } g.stroke(); }
      else if(r<0.12){ g.fillStyle='rgba(0,0,0,0.35)'; g.beginPath(); g.moveTo(x+T-3,y+3); g.lineTo(x+T-3-rand(8,16),y+3); g.lineTo(x+T-3,y+3+rand(8,16)); g.fill(); }
      else if(r<0.32){ g.fillStyle='rgba(0,0,0,0.18)'; for(let j=0;j<5;j++) g.fillRect(x+rand(5,T-6),y+rand(5,T-6),2,2); }
    } }
  // Zentrums-Emblem
  g.strokeStyle=A.accent; g.globalAlpha=0.13; g.lineWidth=3;
  g.beginPath(); g.arc(AW/2,AH/2,150,0,TAU); g.stroke(); g.beginPath(); g.arc(AW/2,AH/2,120,0,TAU); g.stroke();
  for(let i=0;i<8;i++){ const a=i/8*TAU; g.beginPath(); g.moveTo(AW/2+Math.cos(a)*120,AH/2+Math.sin(a)*120); g.lineTo(AW/2+Math.cos(a+TAU*3/8)*120,AH/2+Math.sin(a+TAU*3/8)*120); g.stroke(); }
  g.globalAlpha=1;
  // Blutflecken
  for(let i=0;i<5;i++){ const x=rand(60,AW-60),y=rand(60,AH-60); g.fillStyle='rgba(90,10,12,0.3)'; for(let j=0;j<7;j++){ g.beginPath(); g.arc(x+rand(-14,14),y+rand(-10,10),rand(3,10),0,TAU); g.fill(); } }
  if(va===1) decorDungeon(g); else if(va===2) decorCrypt(g); else if(va===3) decorLair(g); else decorTower(g);
  // Schatten entlang der Wände
  const ao=(x0,y0,x1,y1)=>{ const gr=g.createLinearGradient(x0,y0,x1,y1); gr.addColorStop(0,'rgba(0,0,0,0.6)'); gr.addColorStop(1,'rgba(0,0,0,0)'); return gr; };
  g.fillStyle=ao(0,0,0,80); g.fillRect(0,0,AW,80);
  g.fillStyle=ao(0,AH,0,AH-40); g.fillRect(0,AH-40,AW,40);
  g.fillStyle=ao(0,0,44,0); g.fillRect(0,0,44,AH);
  g.fillStyle=ao(AW,0,AW-44,0); g.fillRect(AW-44,0,44,AH);
  g.restore();
  drawWallDecor(g,A,va);
  g.strokeStyle='rgba(0,0,0,0.6)'; g.lineWidth=6; g.strokeRect(-3,-3,AW+6,AH+6);
  g.strokeStyle=A.accent; g.globalAlpha=0.25; g.lineWidth=2; g.strokeRect(-7,-7,AW+14,AH+14); g.globalAlpha=1;
  floorCanvas=c; floorAct=run.act; floorCanvas.k=k;
}
function bone(g,x,y,len,a){
  g.save(); g.translate(x,y); g.rotate(a); g.strokeStyle='rgba(225,215,195,0.75)'; g.lineWidth=3; g.lineCap='round';
  g.beginPath(); g.moveTo(-len/2,0); g.lineTo(len/2,0); g.stroke(); g.fillStyle='rgba(235,225,205,0.8)';
  for(const s of [-1,1]) for(const o of [-2.2,2.2]){ g.beginPath(); g.arc(s*len/2,o,2.6,0,TAU); g.fill(); }
  g.restore();
}
function skull(g,x,y,s){
  g.fillStyle='rgba(230,222,205,0.85)'; g.beginPath(); g.arc(x,y,5*s,0,TAU); g.fill(); g.fillRect(x-3*s,y+2*s,6*s,4*s);
  g.fillStyle='rgba(20,16,18,0.9)'; g.beginPath(); g.arc(x-1.9*s,y,1.3*s,0,TAU); g.arc(x+1.9*s,y,1.3*s,0,TAU); g.fill();
}
function web(g,x,y,sx,sy,size){
  g.strokeStyle='rgba(220,220,235,0.22)'; g.lineWidth=0.8;
  for(let i=0;i<=5;i++){ const a=i/5*Math.PI/2; g.beginPath(); g.moveTo(x,y); g.lineTo(x+sx*Math.cos(a)*size,y+sy*Math.sin(a)*size); g.stroke(); }
  for(let r=size*0.25;r<=size;r+=size*0.22){ g.beginPath(); for(let i=0;i<=5;i++){ const a=i/5*Math.PI/2, px=x+sx*Math.cos(a)*r, py=y+sy*Math.sin(a)*r; i?g.lineTo(px,py):g.moveTo(px,py); } g.stroke(); }
}
function edgeTufts(g,color,n){
  g.fillStyle=color;
  for(let i=0;i<n;i++){ const side=randi(0,3); let x,y;
    if(side===0){ x=rand(0,AW); y=rand(0,10); } else if(side===1){ x=rand(0,AW); y=AH-rand(0,10); } else if(side===2){ x=rand(0,10); y=rand(0,AH); } else { x=AW-rand(0,10); y=rand(0,AH); }
    for(let j=0;j<5;j++){ g.beginPath(); g.arc(x+rand(-8,8),y+rand(-6,6),rand(2,5),0,TAU); g.fill(); } }
}
function decorDungeon(g){
  for(let i=0;i<5;i++){ const x=rand(80,AW-80),y=rand(80,AH-80),rx=rand(22,40),ry=rx*rand(0.45,0.6);
    g.fillStyle='rgba(18,30,46,0.62)'; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,TAU); g.fill();
    g.strokeStyle='rgba(150,180,210,0.2)'; g.lineWidth=1.5; g.beginPath(); g.ellipse(x,y,rx-3,ry-3,0,Math.PI*1.1,Math.PI*1.7); g.stroke();
    DECOR.puddles.push({x,y,rx,ry,t:rand(0,3)}); }
  for(let i=0;i<9;i++) bone(g,rand(30,AW-30),rand(30,AH-30),rand(10,18),rand(0,TAU));
  for(let i=0;i<3;i++) skull(g,rand(40,AW-40),rand(40,AH-40),rand(0.9,1.3));
  for(let i=0;i<5;i++){ const x=rand(40,AW-40),y=rand(40,AH-40); g.strokeStyle='rgba(190,160,80,0.45)'; g.lineWidth=1.2;
    for(let j=0;j<22;j++){ const a=rand(0,TAU),l=rand(4,10),px=x+rand(-16,16),py=y+rand(-10,10); g.beginPath(); g.moveTo(px,py); g.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l); g.stroke(); } }
  for(let i=0;i<30;i++){ const x=rand(10,AW-10),y=rand(10,AH-10),s=rand(2,5); g.fillStyle=`rgba(${110+rand(-15,15)|0},${112+rand(-15,15)|0},120,0.6)`;
    g.beginPath(); g.moveTo(x-s,y); g.lineTo(x,y-s*0.8); g.lineTo(x+s,y-s*0.2); g.lineTo(x+s*0.5,y+s*0.7); g.closePath(); g.fill(); }
  edgeTufts(g,'rgba(80,120,60,0.45)',40);
  web(g,0,0,1,1,46); web(g,AW,0,-1,1,38);
}
function decorCrypt(g){
  for(let i=0;i<4;i++){ const x=rand(60,AW-110),y=rand(60,AH-140),w=46,h=78;
    g.fillStyle='rgba(28,22,36,0.78)'; g.fillRect(x,y,w,h); g.strokeStyle='rgba(180,160,210,0.18)'; g.lineWidth=2; g.strokeRect(x+4,y+4,w-8,h-8);
    g.strokeStyle='rgba(200,180,230,0.25)'; g.beginPath(); g.moveTo(x+w/2,y+14); g.lineTo(x+w/2,y+h-18); g.moveTo(x+w/2-11,y+28); g.lineTo(x+w/2+11,y+28); g.stroke(); }
  for(let i=0;i<3;i++){ const x=rand(90,AW-90),y=rand(90,AH-90),r=rand(26,40);
    g.strokeStyle='rgba(196,156,240,0.22)'; g.lineWidth=1.5; g.beginPath(); g.arc(x,y,r,0,TAU); g.stroke(); g.beginPath(); g.arc(x,y,r*0.72,0,TAU); g.stroke();
    for(let j=0;j<6;j++){ const a=j/6*TAU; g.beginPath(); g.moveTo(x+Math.cos(a)*r*0.72,y+Math.sin(a)*r*0.72); g.lineTo(x+Math.cos(a+2.1)*r*0.72,y+Math.sin(a+2.1)*r*0.72); g.stroke(); }
    DECOR.runes.push({x,y,r}); }
  for(let i=0;i<5;i++){ const x=rand(40,AW-40),y=rand(40,AH-40);
    for(let j=0,n=randi(2,4);j<n;j++){ const cx=x+rand(-12,12), cy=y+rand(-8,8), h=rand(6,14);
      g.fillStyle='rgba(225,215,190,0.9)'; g.beginPath(); g.ellipse(cx,cy,6,3,0,0,TAU); g.fill(); g.fillRect(cx-2.5,cy-h,5,h);
      g.fillStyle='rgba(255,255,255,0.3)'; g.fillRect(cx-2.5,cy-h,1.5,h); DECOR.candles.push({x:cx,y:cy-h}); } }
  for(let i=0;i<4;i++){ const x=rand(40,AW-40),y=rand(40,AH-40); for(let j=0;j<4;j++) skull(g,x+rand(-10,10),y+rand(-6,6),rand(0.8,1.1)); }
  for(let i=0;i<6;i++) bone(g,rand(30,AW-30),rand(30,AH-30),rand(10,16),rand(0,TAU));
  edgeTufts(g,'rgba(110,70,150,0.35)',30);
  web(g,0,0,1,1,70); web(g,AW,0,-1,1,60); web(g,0,AH,1,-1,50); web(g,AW,AH,-1,-1,56);
}
// Himmelsturm: Sternbilder im Boden, leuchtende Risse, Runenkreise
function decorTower(g){
  for(let i=0;i<5;i++){ const x=rand(70,AW-70),y=rand(70,AH-70),n=randi(4,6); let px=x,py=y; const pts=[[px,py]];
    for(let j=0;j<n;j++){ px=clamp(px+rand(-50,50),20,AW-20); py=clamp(py+rand(-50,50),20,AH-20); pts.push([px,py]); }
    g.strokeStyle='rgba(168,192,255,0.28)'; g.lineWidth=1.2; g.beginPath(); pts.forEach(([a,b],j)=>j?g.lineTo(a,b):g.moveTo(a,b)); g.stroke();
    for(const [a,b] of pts){ const gr=g.createRadialGradient(a,b,0,a,b,7); gr.addColorStop(0,'rgba(232,244,255,0.9)'); gr.addColorStop(1,'rgba(168,192,255,0)'); g.fillStyle=gr; g.beginPath(); g.arc(a,b,7,0,TAU); g.fill(); } }
  for(let i=0;i<70;i++){ g.fillStyle=`rgba(220,230,255,${rand(0.15,0.5)})`; g.fillRect(rand(10,AW-10),rand(10,AH-10),1.4,1.4); }
  for(let i=0;i<7;i++){ let x=rand(40,AW-40),y=rand(40,AH-40); const pts=[[x,y]]; for(let j=0;j<6;j++){ x+=rand(-22,22); y+=rand(-22,22); pts.push([x,y]); }
    g.strokeStyle='rgba(10,12,30,0.85)'; g.lineWidth=3.5; g.beginPath(); pts.forEach(([px,py],j)=>j?g.lineTo(px,py):g.moveTo(px,py)); g.stroke();
    g.strokeStyle='rgba(122,184,255,0.55)'; g.lineWidth=1.2; g.stroke(); DECOR.cracks.push({pts,ph:rand(0,TAU)}); }
  for(let i=0;i<2;i++){ const x=rand(120,AW-120),y=rand(120,AH-120),r=rand(40,56); g.strokeStyle='rgba(168,192,255,0.35)'; g.lineWidth=2; g.beginPath(); g.arc(x,y,r,0,TAU); g.stroke(); g.beginPath(); g.arc(x,y,r*0.78,0,TAU); g.stroke();
    for(let k=0;k<8;k++){ const a=k/8*TAU; g.fillStyle='rgba(200,216,255,0.45)'; g.fillRect(x+Math.cos(a)*r*0.89-2,y+Math.sin(a)*r*0.89-2,4,4); } }
  edgeTufts(g,'rgba(90,106,216,0.35)',30);
}
function decorLair(g){
  for(let i=0;i<6;i++){ const x=rand(60,AW-60),y=rand(60,AH-60),r=rand(26,50), gr=g.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,'rgba(0,0,0,0.55)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); }
  for(let i=0;i<10;i++){ let x=rand(30,AW-30),y=rand(30,AH-30); const pts=[[x,y]]; for(let j=0;j<6;j++){ x+=rand(-24,24); y+=rand(-24,24); pts.push([x,y]); }
    g.strokeStyle='rgba(20,6,2,0.85)'; g.lineWidth=3.5; g.beginPath(); pts.forEach(([px,py],j)=>j?g.lineTo(px,py):g.moveTo(px,py)); g.stroke();
    DECOR.cracks.push({pts,ph:rand(0,TAU)}); }
  for(let i=0;i<6;i++){ const x=rand(40,AW-40),y=rand(40,AH-40);
    for(let j=0;j<16;j++){ const cx=x+rand(-16,16),cy=y+rand(-9,9); g.fillStyle=RNG()<0.5?'#c99a3a':'#e6b450'; g.beginPath(); g.ellipse(cx,cy,3.5,2.2,0,0,TAU); g.fill(); g.fillStyle='rgba(255,243,176,0.7)'; g.fillRect(cx-1,cy-1,1.5,1); }
    if(RNG()<0.7){ const gx=x+rand(-10,10),gy=y+rand(-6,6); g.fillStyle=pick(['#e0404a','#4aa0ff','#5ad07a','#c06aff']); g.beginPath(); g.moveTo(gx,gy-4); g.lineTo(gx+3.5,gy); g.lineTo(gx,gy+4); g.lineTo(gx-3.5,gy); g.closePath(); g.fill(); } }
  for(let i=0;i<2;i++){ const x=rand(80,AW-80),y=rand(80,AH-80); g.strokeStyle='rgba(225,215,195,0.6)'; g.lineWidth=3; g.lineCap='round';
    g.beginPath(); g.moveTo(x-26,y); g.lineTo(x+26,y); g.stroke();
    for(let j=-2;j<=2;j++){ g.beginPath(); g.arc(x+j*9,y,11,Math.PI*1.1,Math.PI*1.9); g.stroke(); g.beginPath(); g.arc(x+j*9,y,11,Math.PI*0.1,Math.PI*0.9); g.stroke(); }
    g.lineCap='butt'; skull(g,x+36,y,1.4); }
  for(let i=0;i<5;i++) bone(g,rand(30,AW-30),rand(30,AH-30),rand(12,20),rand(0,TAU));
  edgeTufts(g,'rgba(40,20,14,0.6)',40);
}
function drawWallDecor(g,A,va){
  for(const bx of [95,380,665]){ const w=34,h=58,y=-WALL+4;
    g.fillStyle='rgba(0,0,0,0.35)'; g.fillRect(bx-w/2+3,y+3,w,h);
    g.fillStyle=va===1?'#6a1e22':va===2?'#3a1e5a':'#7a2a10'; g.beginPath(); g.moveTo(bx-w/2,y); g.lineTo(bx+w/2,y); g.lineTo(bx+w/2,y+h); g.lineTo(bx+w/4,y+h-8); g.lineTo(bx,y+h); g.lineTo(bx-w/4,y+h-8); g.lineTo(bx-w/2,y+h); g.closePath(); g.fill();
    g.fillStyle='rgba(0,0,0,0.25)'; g.fillRect(bx+w/2-7,y,7,h-4);
    g.fillStyle='rgba(255,255,255,0.08)'; g.fillRect(bx-w/2,y,5,h-4);
    g.fillStyle='#3a2a1a'; g.fillRect(bx-w/2-4,y-2,w+8,4);
    g.strokeStyle='#e6b450'; g.lineWidth=2; g.beginPath(); g.arc(bx,y+22,8,0,TAU); g.stroke();
    g.beginPath(); g.moveTo(bx-6,y+38); g.lineTo(bx,y+32); g.lineTo(bx+6,y+38); g.stroke(); }
  for(const [cx,cy] of [[-22,330],[-22,680],[AW+22,330],[AW+22,680]]){
    g.strokeStyle='rgba(130,130,140,0.85)'; g.lineWidth=2;
    for(let i=0;i<6;i++){ g.beginPath(); g.ellipse(cx,cy+i*7,2.5,4,0,0,TAU); g.stroke(); }
    g.fillStyle='rgba(120,120,130,0.9)'; g.beginPath(); g.arc(cx,cy+46,5,0,TAU); g.fill(); }
}
const TORCHES=[[0,150],[0,500],[0,850],[AW,150],[AW,500],[AW,850],[190,0],[570,0],[190,AH],[570,AH]];
const BRAZIERS=[[-12,-10],[AW+12,-10],[-12,AH+12],[AW+12,AH+12]];
/* ---- Tribünen und Zuschauer ---- */
const STAND=150, BORDER=WALL+STAND;
let CROWD=[], CROWD_CH=null;
const STAND_LIGHTS=[];
for(const x of [100,380,660]){ STAND_LIGHTS.push([x,-(BORDER-14)]); STAND_LIGHTS.push([x,AH+BORDER-14]); }
for(const y of [180,500,820]){ STAND_LIGHTS.push([-(BORDER-14),y]); STAND_LIGHTS.push([AW+BORDER-14,y]); }
function drawStands(g,A){
  const rows=4, rd=STAND/rows, stone=A.pillar;
  g.fillStyle=shade(A.wall,-8); g.fillRect(-BORDER,-BORDER,AW+2*BORDER,AH+2*BORDER);
  for(let i=rows-1;i>=0;i--){ const o=WALL+(i+1)*rd;
    g.fillStyle=shade(stone,-14-i*5); g.fillRect(-o,-o,AW+2*o,AH+2*o);
    const s=WALL+i*rd+rd*0.55; g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=3; g.strokeRect(-s,-s,AW+2*s,AH+2*s);
    g.strokeStyle='rgba(255,255,255,0.07)'; g.lineWidth=2; g.strokeRect(-o+1,-o+1,AW+2*o-2,AH+2*o-2); }
  // Treppengänge
  g.fillStyle='rgba(0,0,0,0.3)';
  for(const x of [240,520]){ g.fillRect(x-10,-BORDER,20,STAND); g.fillRect(x-10,AH+WALL,20,STAND); }
  for(const y of [340,660]){ g.fillRect(-BORDER,y-10,STAND,20); g.fillRect(AW+WALL,y-10,STAND,20); }
  CROWD=[];
  for(let i=0;i<rows;i++){ const d=WALL+(i+0.62)*rd;
    const add=(x,y,back)=>{ if(RNG()<0.13) return; if([240,520].some(v=>Math.abs(x-v)<14&&(y<0||y>AH))||[340,660].some(v=>Math.abs(y-v)<14&&(x<0||x>AW))) return;
      CROWD.push({x:x+rand(-2,2),y:y+rand(-2,2),back,v:randi(0,7),ph:rand(0,TAU),spd:rand(2,4)}); };
    for(let x=-d+8;x<AW+d-8;x+=rand(14,19)){ add(x,-d+rd*0.35,false); add(x,AH+d+rd*0.35,true); }
    for(let y=-d+20;y<AH+d;y+=rand(15,20)){ add(-d,y,false); add(AW+d,y,false); } }
  CROWD.sort((a,b)=>a.y-b.y); CROWD_CH=null;
}
const CROWD_SPR={};
function crowdLook(va,v){
  const pv=a=>a[v%a.length];
  if(va===1){ const gob=v%4===3; return {body:pv(['#6a3a2a','#3a4a6a','#5a5a3a','#6a2a3a','#4a3a5a','#2e4a3a','#7a5a2a']),head:gob?'#7ab04f':pv(['#e8c4a0','#c89a70','#9a7050']),ears:gob,hood:v%3===1?pv(['#4a3a2a','#2a3a4a']):null,eye:'#1a1010'}; }
  if(va===2){ const k=v%3; return k===0?{body:'#b8b0a0',head:'#e8e2d0',skull:true,eye:'#0a0a10'}:k===1?{ghost:true,body:'#a8d8ff',head:'#c8ecff',eye:'#2a4a6a'}:{body:'#3a2050',head:'#3a2050',hood:'#2a1640',eye:'#d07aff'}; }
  if(va===4){ const k=v%3; return k===0?{body:'#e8e4f4',head:'#f4e8d0',halo:true,eye:'#3a4a8a'}:k===1?{body:'#3a4a8a',head:'#c8d8ff',hood:'#2a3a7a',eye:'#a8c0ff'}:{ghost:true,body:'#c8d8ff',head:'#e8f0ff',eye:'#4a5a9a',halo:true}; }
  const k=v%3; return k===0?{body:'#8a2a1a',head:'#c0402a',horns:true,eye:'#ffe04a'}:k===1?{body:'#6a4a2a',head:'#d0782a',snout:true,eye:'#1a0a00'}:{body:'#3a1010',head:'#3a1010',hood:'#2a0808',eye:'#ff7a2a'};
}
function renderSpectator(L,front,cheer){
  const c=document.createElement('canvas'); c.width=32; c.height=40; const g=c.getContext('2d'); g.scale(2,2);
  g.globalAlpha=L.ghost?0.6:1;
  if(cheer){ g.strokeStyle=L.body; g.lineWidth=2.2; g.lineCap='round'; g.beginPath(); g.moveTo(3.5,13); g.lineTo(1.5,5.5); g.moveTo(12.5,13); g.lineTo(14.5,5.5); g.stroke();
    g.fillStyle=L.head; g.beginPath(); g.arc(1.5,5,1.4,0,TAU); g.arc(14.5,5,1.4,0,TAU); g.fill(); }
  g.fillStyle=L.body; g.beginPath(); g.ellipse(8,17,6.5,5.5,0,Math.PI,0); g.lineTo(14.5,20); g.lineTo(1.5,20); g.closePath(); g.fill();
  g.fillStyle=L.head; g.beginPath(); g.arc(8,8.5,4.2,0,TAU); g.fill();
  if(L.ears){ g.beginPath(); g.moveTo(4.2,8); g.lineTo(0.8,5.8); g.lineTo(4.6,10); g.moveTo(11.8,8); g.lineTo(15.2,5.8); g.lineTo(11.4,10); g.fill(); }
  if(L.horns){ g.fillStyle='#2a0a08'; g.beginPath(); g.moveTo(5,6); g.lineTo(4,1.8); g.lineTo(6.6,5); g.moveTo(11,6); g.lineTo(12,1.8); g.lineTo(9.4,5); g.fill(); }
  if(L.hood){ g.fillStyle=L.hood; g.beginPath(); g.arc(8,8,4.9,Math.PI*0.95,Math.PI*0.05); g.lineTo(12.6,12.5); g.lineTo(3.4,12.5); g.closePath(); g.fill();
    if(front){ g.fillStyle='#0a0608'; g.beginPath(); g.ellipse(8,9.4,2.8,2.6,0,0,TAU); g.fill(); } }
  if(L.halo){ g.strokeStyle='#ffe08a'; g.lineWidth=1.2; g.beginPath(); g.ellipse(8,3,4.6,1.4,0,0,TAU); g.stroke(); }
  if(L.snout && front){ g.fillStyle=L.head; g.beginPath(); g.ellipse(8,10.8,2.6,1.8,0,0,TAU); g.fill(); }
  if(front){ g.fillStyle=L.eye; if(L.skull){ g.beginPath(); g.arc(6.4,8.4,1.2,0,TAU); g.arc(9.6,8.4,1.2,0,TAU); g.fill(); } else { g.fillRect(6,8.2,1.3,1.3); g.fillRect(8.8,8.2,1.3,1.3); } }
  else { g.fillStyle='rgba(0,0,0,0.28)'; g.beginPath(); g.arc(8,8.5,4.2,0,TAU); g.fill(); }
  return c;
}
function crowdSprites(va){
  if(CROWD_SPR[va]) return CROWD_SPR[va];
  const out={front:[],back:[]};
  for(let v=0;v<8;v++){ const L=crowdLook(va,v); out.front.push([renderSpectator(L,true,false),renderSpectator(L,true,true)]); out.back.push([renderSpectator(L,false,false),renderSpectator(L,false,true)]); }
  return CROWD_SPR[va]=out;
}
/* Zuschauer werden in kleine Gruppen von je 6 Nachbarn vorgerendert: statt ~850 Einzelbildern pro Bild
   nur noch ~140 Gruppenbilder. Jede Gruppe hüpft für sich – bei Jubel entsteht so eine La-Ola-Welle. */
function buildCrowdChunks(spr,thin){
  const list=CROWD.filter((s,i)=>!(thin&&i%2)), groups={};
  const keyOf=s=> s.y<0?'t'+Math.round(s.y/6) : s.y>AH?'b'+Math.round(s.y/6) : s.x<0?'l'+Math.round(s.x/6) : 'r'+Math.round(s.x/6);
  for(const s of list){ const k=keyOf(s); (groups[k]=groups[k]||[]).push(s); }
  const out=[], K=2;
  for(const k in groups){ const g=groups[k], horiz=k[0]==='t'||k[0]==='b'; g.sort((a,b)=>horiz?a.x-b.x:a.y-b.y);
    for(let i=0;i<g.length;i+=6){ const m=g.slice(i,i+6).sort((a,b)=>a.y-b.y); let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      for(const s of m){ x0=Math.min(x0,s.x-8); x1=Math.max(x1,s.x+8); y0=Math.min(y0,s.y-20); y1=Math.max(y1,s.y); }
      const w=Math.ceil((x1-x0)*K), h=Math.ceil((y1-y0)*K);
      const cv=[0,1].map(ch=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g2=c.getContext('2d'); g2.scale(K,K);
        for(const s of m) g2.drawImage(spr[s.back?'back':'front'][s.v][ch], s.x-8-x0, s.y-20-y0, 16, 20); return c; });
      out.push({x:x0,y:y0,w:w/K,h:h/K,cv,ph:m[0].ph,spd:m[0].spd,ymax:y1}); } }
  out.sort((a,b)=>a.ymax-b.ymax); return out;
}
function drawCrowd(cx,cy,vw,vh){
  const spr=crowdSprites(visAct()), hype=G.hype||0, t=G.time, thin=!FX(), key=visAct()+'|'+thin;
  if(!CROWD_CH||CROWD_CH.key!==key) CROWD_CH={key,list:buildCrowdChunks(spr,thin)};
  for(const c of CROWD_CH.list){
    if(c.x+c.w<cx-20||c.x>cx+vw+20||c.y+c.h<cy-30||c.y>cy+vh+30) continue;
    const jump=Math.abs(Math.sin(t*c.spd+c.ph))*(0.5+hype*6);
    const cheer=hype>0.3 && Math.sin(t*2.3+c.ph*2)>0.65-hype;
    ctx.drawImage(c.cv[cheer?1:0],c.x,c.y-jump,c.w,c.h);
  }
}
function crowdThrow(n,heart){
  const d=[[P.y,'t'],[AH-P.y,'b'],[P.x,'l'],[AW-P.x,'r']].sort((a,b)=>a[0]-b[0])[0][1];
  for(let i=0;i<n;i++){
    const sx=d==='l'?6:d==='r'?AW-6:clamp(P.x+rand(-80,80),6,AW-6), sy=d==='t'?6:d==='b'?AH-6:clamp(P.y+rand(-80,80),6,AH-6);
    const tx=clamp(P.x+rand(-60,60),10,AW-10), ty=clamp(P.y+rand(-60,60),10,AH-10);
    G.coins.push({x:sx,y:sy,vx:(tx-sx)*3.5,vy:(ty-sy)*3.5,v:2,t:-0.2,heart:heart&&i===0});
  }
}
function hype(add){ if(!G) return; G.hype=clamp((G.hype||0)+add,0,1); }
function noiseSound(dur,type,freq,vol,attack){
  if(!save.sound||!AC||!MUS.noise) return;
  const t=AC.currentTime, s=AC.createBufferSource(), f=AC.createBiquadFilter(), g=AC.createGain();
  s.buffer=MUS.noise; s.loop=true; f.type=type; f.frequency.value=freq; f.Q.value=0.7;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(sfxOut()); s.start(t); s.stop(t+dur+0.05);
}
const crowdSound=v=>{ noiseSound(1.4,'bandpass',900,0.18*v,0.25); noiseSound(1.1,'bandpass',2200,0.07*v,0.2); };
const thunder=v=>noiseSound(2.2,'lowpass',180,0.7*v,0.05);

/* ---- Wetter ---- */
const WEATHER={
  clear:{ ic:'🌙', nm:'Klare Nacht' },
  rain:{ ic:'🌧️', nm:'Regen', kind:'rain', n:170, dark:0.1 },
  storm:{ ic:'⛈️', nm:'Gewitter', kind:'rain', n:230, dark:0.16, bolts:true, bolt:'#cfe6ff' },
  fog:{ ic:'🌫️', nm:'Dichter Nebel', fog:14, dark:0.08 },
  snow:{ ic:'❄️', nm:'Schneefall', kind:'snow', n:150 },
  ash:{ ic:'🌋', nm:'Ascheregen', kind:'ash', n:140, dark:0.05 },
  firestorm:{ ic:'🔥', nm:'Feuersturm', kind:'ash', n:180, dark:0.1, bolts:true, bolt:'#ffb07a' },
  starfall:{ ic:'🌠', nm:'Sternschnuppen', kind:'stars', n:60 },
};
const WEATHER_POOL={ 1:[['clear',35],['rain',30],['storm',20],['fog',15]], 2:[['clear',30],['snow',30],['fog',25],['storm',15]], 3:[['clear',30],['ash',40],['firestorm',30]] , 4:[['clear',30],['starfall',35],['snow',15],['fog',20]] };
function initWeather(){
  const w=WEATHER[G.weather]; G.wp=[]; G.splash=[]; G.flash=0; G.boltT=rand(4,7); G.skyT=rand(3,8); G.thunderT=0; G.cam=null;
  const n=Math.round((w.n||0)*(FX()?1:0.4));
  for(let i=0;i<n;i++) G.wp.push({x:rand(-20,W+20),y:rand(-20,H+20),s:rand(0.6,1.4),ph:rand(0,TAU),glow:Math.random()<0.2});
  if(w.fog) for(let i=0;i<w.fog;i++) G.fog.push({x:rand(0,AW),y:rand(0,AH),r:rand(150,260),vx:rand(8,18)*(Math.random()<0.5?-1:1),thick:true});
}
function updWeather(dt){
  const w=WEATHER[G.weather];
  for(const p of G.wp){
    if(w.kind==='rain'){ p.y+=900*p.s*dt; p.x+=150*p.s*dt; if(p.y>H+20){ if(G.splash.length<30) G.splash.push({x:rand(0,W),y:rand(0,H),t:0}); p.y=rand(-60,-10); p.x=rand(-150,W); } }
    else if(w.kind==='stars'){ p.y+=170*p.s*dt; p.x+=70*p.s*dt; if(p.y>H+10||p.x>W+10){ p.y=rand(-60,-10); p.x=rand(-60,W); } }
    else if(w.kind==='snow'){ p.ph+=dt; p.y+=45*p.s*dt; p.x+=Math.sin(p.ph*1.3)*28*dt; if(p.y>H+10){ p.y=-10; p.x=rand(-10,W+10); } }
    else if(w.kind==='ash'){ p.ph+=dt; p.y+=(p.glow?55:75)*p.s*dt; p.x+=(Math.sin(p.ph)*22+18)*dt; if(p.y>H+10){ p.y=-10; p.x=rand(-40,W); } }
    if(p.x>W+40) p.x-=W+60; if(p.x<-40) p.x+=W+60;
  }
  for(const s of G.splash) s.t+=dt; G.splash=G.splash.filter(s=>s.t<0.35);
  if(G.flash>0) G.flash=Math.max(0,G.flash-dt*1.6);
  if(G.thunderT>0){ G.thunderT-=dt; if(G.thunderT<=0) thunder(0.6); }
  if(w.bolts && !G.cleared && !G.tut && !G.over){
    G.skyT-=dt; if(G.skyT<=0){ G.skyT=rand(5,11); G.flash=0.35; G.thunderT=rand(0.4,1.2); }
    G.boltT-=dt; if(G.boltT<=0){ G.boltT=rand(6,10);
      let x,y,k=0; do{ x=clamp(P.x+rand(-150,150),40,AW-40); y=clamp(P.y+rand(-150,150),40,AH-40); k++; }while(solidHit(x,y,20)&&k<10);
      G.hazards.push({type:'circle',x,y,r:56,delay:1.15,t:0,dmg:12+4*run.act,color:w.bolt,storm:true}); }
  }
}
function drawWeather(cx,cy){
  const w=WEATHER[G.weather];
  if(G.cam){ const dx=(cx-G.cam[0])*SCALE, dy=(cy-G.cam[1])*SCALE; if(dx||dy) for(const p of G.wp){ p.x-=dx; p.y-=dy; } for(const s of G.splash){ s.x-=dx; s.y-=dy; } }
  G.cam=[cx,cy];
  if(w.kind==='rain'){
    ctx.strokeStyle='rgba(185,205,235,0.38)'; ctx.lineWidth=1.1; ctx.beginPath();
    for(const p of G.wp){ ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-3.5*p.s,p.y-20*p.s); } ctx.stroke();
    ctx.strokeStyle='rgba(185,205,235,0.45)'; for(const s of G.splash){ const k=s.t/0.35; ctx.globalAlpha=1-k; ctx.beginPath(); ctx.ellipse(s.x,s.y,2+k*7,(2+k*7)*0.4,0,0,TAU); ctx.stroke(); } ctx.globalAlpha=1;
  } else if(w.kind==='stars'){
    ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
    for(const p of G.wp){ const g=ctx.createLinearGradient(p.x,p.y,p.x-12*p.s,p.y-28*p.s); g.addColorStop(0,'rgba(240,248,255,0.9)'); g.addColorStop(1,'rgba(168,192,255,0)'); ctx.strokeStyle=g; ctx.lineWidth=1.6*p.s; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-12*p.s,p.y-28*p.s); ctx.stroke(); }
    ctx.globalCompositeOperation='source-over'; ctx.lineCap='butt';
  } else if(w.kind==='snow'){
    ctx.fillStyle='rgba(235,242,255,0.85)'; ctx.beginPath();
    for(const p of G.wp){ ctx.moveTo(p.x+1.6*p.s,p.y); ctx.arc(p.x,p.y,1.6*p.s,0,TAU); } ctx.fill();
  } else if(w.kind==='ash'){
    ctx.fillStyle='rgba(120,110,105,0.7)';
    for(const p of G.wp) if(!p.glow) ctx.fillRect(p.x,p.y,2.2*p.s,1.6*p.s);
    ctx.globalCompositeOperation='lighter';
    for(const p of G.wp) if(p.glow) drawGlow(p.x,p.y,4*p.s,'#ff7a2a',0.8);
    ctx.globalCompositeOperation='source-over';
  }
  if(G.flash>0){ ctx.fillStyle=`rgba(225,235,255,${G.flash*0.45*(save.settings.calm?0.3:1)})`; ctx.fillRect(0,0,W,H); }
}
function stormStrike(h){
  G.flash=0.6; thunder(1); G.shake+=6; hype(0.1);
  G.fx.push({type:'skybolt',x:h.x,y:h.y,t:0,life:0.4,color:h.color});
  for(const e of G.enemies) if(!e.dead && Math.hypot(e.x-h.x,e.y-h.y)<h.r+e.r) dealDamage(e,45*(1+0.5*(run.act-1)),{noChain:true,noCrit:true,color:'#cfe6ff'});
  for(const o of G.obs) if(o.type==='barrel' && Math.hypot(o.x-h.x,o.y-h.y)<h.r+o.r) blowBarrel(o);
}
function updCrowd(dt){
  G.hype=Math.max(0.1,(G.hype||0)-dt*0.06); G.cheerCd-=dt;
  if(G.hype>=0.85 && G.cheerCd<=0 && !G.over && !G.cleared){ G.cheerCd=16; crowdSound(1); save.stats.cheers++;
    G.texts.push({x:P.x,y:P.y-40,s:'Die Menge tobt!',c:'#e6b450',big:true,t:0});
    if(Math.random()<0.4) crowdThrow(1,true); else crowdThrow(5,false); }
}
/* ---- Leben in der Arena: Staub, Nebel, Funken, Kleintiere, Flammen und Licht ---- */
function initAmbient(){
  G.amb=[]; G.critters=[]; G.critT=rand(2,4); G.fog=[];
  if(!FX()) return;
  for(let i=0;i<40;i++) G.amb.push({x:rand(0,AW),y:rand(0,AH),ph:rand(0,TAU),s:rand(0.6,1.4)});
  if(visAct()===2) for(let i=0;i<6;i++) G.fog.push({x:rand(0,AW),y:rand(0,AH),r:rand(140,240),vx:rand(6,14)*(Math.random()<0.5?-1:1)});
}
function spawnCritter(){
  const side=randi(0,3); let x,y,tx,ty;
  if(side===0){ x=rand(40,AW-40); y=8; tx=rand(40,AW-40); ty=AH-8; }
  else if(side===1){ x=rand(40,AW-40); y=AH-8; tx=rand(40,AW-40); ty=8; }
  else if(side===2){ x=8; y=rand(40,AH-40); tx=AW-8; ty=rand(40,AH-40); }
  else { x=AW-8; y=rand(40,AH-40); tx=8; ty=rand(40,AH-40); }
  G.critters.push({x,y,tx,ty,t:0,a:0,r:5,sp:rand(60,95),kind:['rat','spider','lizard','moth'][visAct()-1]});
}
function updAmbient(dt){
  const va=visAct(), A=actOf(run.act);
  for(const m of G.amb){ m.ph+=dt;
    if(va===1){ m.x+=Math.sin(m.ph*0.5)*6*dt; m.y+=Math.cos(m.ph*0.4)*5*dt-2*dt; }
    else if(va===2){ m.x+=Math.sin(m.ph)*10*dt; m.y-=8*m.s*dt; }
    else { m.x+=Math.sin(m.ph*2)*14*dt; m.y-=26*m.s*dt; }
    if(m.y<-10){ m.y=AH+5; m.x=rand(0,AW); } if(m.x<-10) m.x=AW+5; if(m.x>AW+10) m.x=-5; }
  for(const f of G.fog){ f.x+=f.vx*dt; if(f.x<-f.r) f.x=AW+f.r; if(f.x>AW+f.r) f.x=-f.r; }
  for(const p of DECOR.puddles){ p.t-=dt; if(p.t<=0){ p.t=rand(1.5,4); p.rip=0; p.rx0=p.x+rand(-0.5,0.5)*p.rx; p.ry0=p.y+rand(-0.4,0.4)*p.ry; } if(p.rip!==undefined) p.rip+=dt; }
  if(!FX()) return;
  for(const [tx,ty] of TORCHES) if(Math.random()<dt*1.5) part(tx+rand(-2,2),ty-12,rand(-8,8),rand(-50,-25),rand(0.6,1),2,A.fire,true,-10);
  for(const [bx,by] of BRAZIERS) if(Math.random()<dt*4) part(bx+rand(-6,6),by-16,rand(-10,10),rand(-70,-35),rand(0.7,1.2),2.5,A.fire,true,-10);
  G.critT-=dt;
  if(G.critT<=0 && G.critters.length<3 && !G.cleared){ G.critT=rand(3,7); spawnCritter(); }
  for(const c of G.critters){ c.t+=dt;
    let ax=c.tx-c.x, ay=c.ty-c.y; const l=Math.hypot(ax,ay)||1; ax/=l; ay/=l;
    let sp=c.sp; if(Math.hypot(P.x-c.x,P.y-c.y)<110){ const fa=Math.atan2(c.y-P.y,c.x-P.x); ax=Math.cos(fa); ay=Math.sin(fa); sp*=2.2; }
    c.a=Math.atan2(ay,ax)+Math.sin(c.t*8)*0.15;
    c.x+=Math.cos(c.a)*sp*dt; c.y+=Math.sin(c.a)*sp*dt; pushOut(c);
    if(l<10 || c.t>14 || (c.t>1 && (c.x<=6||c.x>=AW-6||c.y<=6||c.y>=AH-6))) c.gone=true; }
  G.critters=G.critters.filter(c=>!c.gone);
}
function drawCritter(c){
  ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.a); const w=Math.sin(c.t*20);
  if(c.kind==='rat'){
    ctx.strokeStyle='#c89a9a'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(-6,0); ctx.quadraticCurveTo(-12,w*4,-17,w*2); ctx.stroke();
    ctx.fillStyle='#5a5560'; ctx.beginPath(); ctx.ellipse(0,0,7,4,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(6,0,3.5,2.6,0,0,TAU); ctx.fill();
    ctx.fillStyle='#d8a0a8'; ctx.beginPath(); ctx.arc(4.5,-2.6,1.5,0,TAU); ctx.arc(4.5,2.6,1.5,0,TAU); ctx.fill();
    ctx.fillStyle='#000'; ctx.fillRect(7,-1.5,1,1); ctx.fillRect(7,0.8,1,1); }
  else if(c.kind==='moth'){ const f=Math.sin(c.t*30); ctx.fillStyle='rgba(200,216,255,0.85)'; for(const s of [-1,1]){ ctx.beginPath(); ctx.ellipse(-1,s*3.5*Math.abs(f)+s,4,2.6*Math.abs(f)+0.6,s*0.4,0,TAU); ctx.fill(); } ctx.fillStyle='#e8f0ff'; ctx.beginPath(); ctx.ellipse(1,0,3,1.4,0,0,TAU); ctx.fill(); }
  else if(c.kind==='spider'){
    ctx.strokeStyle='#1a1418'; ctx.lineWidth=1.2;
    for(let i=0;i<4;i++) for(const s of [-1,1]){ const o=(i-1.5)*3, k=w*(i%2?1:-1); ctx.beginPath(); ctx.moveTo(o,0); ctx.lineTo(o+k*1.5,s*5); ctx.lineTo(o+k*2.5+(i-1.5)*1.5,s*9); ctx.stroke(); }
    ctx.fillStyle='#2a2030'; ctx.beginPath(); ctx.ellipse(-2,0,4.5,3.6,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(3,0,2.4,0,TAU); ctx.fill();
    ctx.fillStyle='#ff4a6a'; ctx.fillRect(4,-1,1,1); ctx.fillRect(4,0.5,1,1); }
  else {
    drawGlow(0,0,14,'#ff6a1a',0.35); ctx.strokeStyle='#d8501a'; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-4,0); ctx.quadraticCurveTo(-10,w*5,-15,0); ctx.stroke(); ctx.lineCap='butt';
    ctx.fillStyle='#e8601e'; ctx.beginPath(); ctx.ellipse(0,0,6,3,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(6,0,3,2.4,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#e8601e'; ctx.lineWidth=1.5; for(const s of [-1,1]) for(const o of [-3,3]){ ctx.beginPath(); ctx.moveTo(o,0); ctx.lineTo(o+w*s*2,s*5); ctx.stroke(); }
    ctx.fillStyle='#ffd27a'; ctx.fillRect(-3,-0.5,6,1); }
  ctx.restore();
}
function drawFloorLife(){
  for(const p of DECOR.puddles){ if(p.rip!==undefined && p.rip<1.2){ const k=p.rip/1.2;
    ctx.strokeStyle=`rgba(170,200,230,${0.5*(1-k)})`; ctx.lineWidth=1.2; ctx.beginPath(); ctx.ellipse(p.rx0,p.ry0,3+k*16,(3+k*16)*0.5,0,0,TAU); ctx.stroke();
    if(k>0.2){ ctx.beginPath(); ctx.ellipse(p.rx0,p.ry0,(k-0.2)*14,(k-0.2)*7,0,0,TAU); ctx.stroke(); } } }
  for(const r of DECOR.runes){ const a=0.12+0.1*Math.sin(G.time*1.5+r.x);
    drawGlow(r.x,r.y,r.r*1.6,'#b89aff',a);
    ctx.save(); ctx.translate(r.x,r.y); ctx.rotate(G.time*0.3); ctx.strokeStyle=`rgba(200,170,255,${a+0.12})`; ctx.setLineDash([4,7]); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,r.r*0.86,0,TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
  if(DECOR.cracks.length){ ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
    for(const c of DECOR.cracks){ const a=0.35+0.25*Math.sin(G.time*1.7+c.ph);
      ctx.beginPath(); c.pts.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.strokeStyle=`rgba(255,120,30,${a*0.25})`; ctx.lineWidth=8; ctx.stroke();
      ctx.strokeStyle=`rgba(255,${90+60*a|0},20,${a})`; ctx.lineWidth=2; ctx.stroke(); }
    ctx.globalCompositeOperation='source-over'; ctx.lineCap='butt'; }
  for(const c of G.critters) drawCritter(c);
}
function flame(x,y,s,col,core){
  const f=0.85+Math.sin(G.time*14+x*3)*0.1+Math.random()*0.08, sw=Math.sin(G.time*9+x)*1.5*s;
  ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(x+sw,y-14*s*f); ctx.quadraticCurveTo(x+6*s,y-3*s,x,y+s); ctx.quadraticCurveTo(x-6*s,y-3*s,x+sw,y-14*s*f); ctx.fill();
  ctx.fillStyle=core; ctx.beginPath(); ctx.moveTo(x+sw*0.5,y-8*s*f); ctx.quadraticCurveTo(x+3*s,y-2*s,x,y); ctx.quadraticCurveTo(x-3*s,y-2*s,x+sw*0.5,y-8*s*f); ctx.fill();
}
function drawFlames(){
  const A=actOf(run.act);
  ctx.globalCompositeOperation='lighter';
  for(const [tx,ty] of TORCHES) drawGlow(tx,ty-6,48,A.fire,0.5);
  for(const [bx,by] of [...BRAZIERS,...STAND_LIGHTS]) drawGlow(bx,by-10,74,A.fire,0.55);
  for(const c of DECOR.candles) drawGlow(c.x,c.y-3,14,A.fire,0.5);
  ctx.globalCompositeOperation='source-over';
  for(const [tx,ty] of TORCHES){ ctx.fillStyle='#2a2018'; ctx.fillRect(tx-4,ty-2,8,9); ctx.fillStyle='#4a3a2a'; ctx.fillRect(tx-5,ty-4,10,3); flame(tx,ty-4,1,A.fire,A.fireCore); }
  for(const [bx,by] of [...BRAZIERS,...STAND_LIGHTS]){
    ctx.fillStyle='#1c1a1e'; ctx.fillRect(bx-2,by,4,13); ctx.fillRect(bx-9,by+11,18,3);
    ctx.fillStyle='#3a363e'; ctx.beginPath(); ctx.ellipse(bx,by-2,15,7,0,0,Math.PI); ctx.fill();
    ctx.fillStyle='#16141a'; ctx.beginPath(); ctx.ellipse(bx,by-2,15,5,0,0,TAU); ctx.fill();
    flame(bx-6,by-3,1.1,A.fire,A.fireCore); flame(bx+6,by-3,1.1,A.fire,A.fireCore); flame(bx,by-4,1.7,A.fire,A.fireCore); }
  for(const c of DECOR.candles) flame(c.x,c.y,0.45,A.fire,A.fireCore);
}
const LIGHT_SPRITE=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.45,'rgba(255,255,255,0.75)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); return c; })();
function collectLights(){
  const L=[], fl=t=>0.9+Math.sin(G.time*11+t)*0.05+Math.random()*0.05;
  L.push({x:P.x,y:P.y-6,r:215,a:1});
  for(const [x,y] of TORCHES) L.push({x,y,r:170*fl(x+y),a:0.9});
  for(const [x,y] of BRAZIERS) L.push({x,y,r:230*fl(x),a:1});
  for(const [x,y] of STAND_LIGHTS) L.push({x,y,r:190*fl(x+y),a:0.95});
  for(const c of DECOR.candles) L.push({x:c.x,y:c.y,r:60*fl(c.x),a:0.7});
  for(const r of DECOR.runes) L.push({x:r.x,y:r.y,r:r.r*2,a:0.35});
  for(const c of DECOR.cracks){ const [x,y]=c.pts[3]; L.push({x,y,r:70,a:0.35+0.2*Math.sin(G.time*1.7+c.ph)}); }
  for(const t of G.traps){ if(t.type==='lava') L.push({x:t.x,y:t.y,r:t.r*3,a:0.95}); else if(t.t%2.8>1.6) L.push({x:t.x,y:t.y,r:70,a:0.6}); }
  for(const h of G.hazards) L.push({x:h.x,y:h.y,r:(h.r||h.len*0.6||80)*1.4,a:0.5+0.4*Math.min(1,h.t/h.delay)});
  for(const p of G.pproj) if(p.type!=='arrow') L.push({x:p.x,y:p.y,r:70,a:0.7});
  for(const p of G.eproj) L.push({x:p.x,y:p.y,r:p.kind==='arrow'?40:70,a:0.7});
  for(const f of G.fx){ if(f.type==='ring'&&f.fill) L.push({x:f.x,y:f.y,r:f.r*2,a:1-f.t/f.life}); else if(f.type==='nova'||f.type==='summon'||f.type==='volley') L.push({x:f.x,y:f.y,r:f.r*1.6,a:0.8*(1-f.t/f.life)}); }
  if(P&&P.spin>0) L.push({x:P.x,y:P.y,r:150,a:0.6});
  if(G.flashL) for(const l of G.flashL) L.push({x:l.x,y:l.y,r:l.r*(0.8+0.2*l.t/l.life),a:l.a*(1-l.t/l.life)});
  if(G.bossDie && !G.bossDie.blown){ const d=G.bossDie; L.push({x:d.e.x,y:d.e.y,r:d.e.r*(4+5*Math.min(1,d.t/d.tb)),a:1}); }
  if(G.pet && G.pet.kind==='wisp') L.push({x:G.pet.x,y:G.pet.y-20,r:170,a:0.75});
  for(const z of G.pzones) L.push({x:z.x,y:z.y,r:50,a:0.4});
  for(const s of G.pstrikes) L.push({x:s.x,y:s.y,r:s.r*1.5,a:0.6});
  for(const s of G.spawnQ) L.push({x:s.x,y:s.y,r:s.boss?120:50,a:0.6});
  for(const e of G.enemies){ if(e.boss) L.push({x:e.x,y:e.y,r:e.r*4,a:0.6}); else if(e.elite) L.push({x:e.x,y:e.y,r:80,a:0.5}); else if(e.kind==='imp') L.push({x:e.x,y:e.y,r:60,a:0.6}); else if(e.spawnT>0) L.push({x:e.x,y:e.y,r:60,a:0.6}); else L.push({x:e.x,y:e.y,r:e.r*2.6,a:0.35}); }
  for(const a of G.allies) L.push({x:a.x,y:a.y,r:45,a:0.5});
  if(P.orbit>0) L.push({x:P.x,y:P.y,r:120,a:0.5});
  for(const c of G.coins) L.push({x:c.x,y:c.y,r:24,a:0.5});
  for(const c of G.critters) if(c.kind==='lizard'||c.kind==='moth') L.push({x:c.x,y:c.y,r:36,a:0.5});
  return L;
}
let lightCv=null, lightCtx=null;
function renderLights(cx,cy){
  const LS=0.5, w=Math.max(1,Math.ceil(W*LS)), h=Math.max(1,Math.ceil(H*LS));
  if(!lightCv){ lightCv=document.createElement('canvas'); lightCtx=lightCv.getContext('2d'); }
  if(lightCv.width!==w||lightCv.height!==h){ lightCv.width=w; lightCv.height=h; }
  const L=lightCtx, s=VIEW_S*LS, A=actOf(run.act);
  L.globalCompositeOperation='source-over'; L.globalAlpha=1; L.clearRect(0,0,w,h); L.fillStyle=A.dark; L.fillRect(0,0,w,h);
  const wd=(WEATHER[G.weather]||{}).dark||0; if(wd){ L.fillStyle=`rgba(0,0,0,${wd})`; L.fillRect(0,0,w,h); }
  if(G.flash>0){ L.globalCompositeOperation='destination-out'; L.globalAlpha=Math.min(0.85,G.flash*1.6); L.fillRect(0,0,w,h); L.globalAlpha=1; }
  L.globalCompositeOperation='destination-out';
  for(const l of collectLights()){ const x=(l.x-cx)*s, y=(l.y-cy)*s, r=l.r*s; if(l.a<=0||x<-r||y<-r||x>w+r||y>h+r) continue; L.globalAlpha=Math.min(1,l.a); L.drawImage(LIGHT_SPRITE,x-r,y-r,r*2,r*2); }
  L.globalAlpha=1; L.globalCompositeOperation='source-over';
  ctx.drawImage(lightCv,0,0,W,H);
}


