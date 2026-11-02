/* Vorgerenderte Gegner-Sprites: detaillierte Figuren mit dunklem Umriss und Schattierung.
   Jede Figur wird einmal je Animationsbild auf eine kleine Leinwand gezeichnet und danach nur noch kopiert.
   Bewegliche Teile (Waffen, Schilde, Leuchten) zeichnet drawEnemy weiterhin live darüber. */
const SPR={}, SPR_FR=6;
// Kopfbewegung je Gegnerart: Animationsgeschwindigkeit, ob gespiegelt wird
const SPR_KIND={ slime:{sp:0,flip:0}, bat:{sp:22,flip:0}, skeleton:{sp:10,flip:1}, archer:{sp:11,flip:1}, orc:{sp:9,flip:1},
  cultist:{sp:0,flip:1}, shield:{sp:9,flip:1}, healer:{sp:0,flip:1}, spiderling:{sp:24,flip:0}, imp:{sp:18,flip:1}, kobold:{sp:12,flip:1}, ally:{sp:10,flip:1} };

function sGrad(c,x0,y0,x1,y1,cols){ const g=c.createLinearGradient(x0,y0,x1,y1); cols.forEach((k,i)=>g.addColorStop(i/(cols.length-1),k)); return g; }
function sRad(c,x,y,r,cols){ const g=c.createRadialGradient(x-r*0.35,y-r*0.4,r*0.05,x,y,r); cols.forEach((k,i)=>g.addColorStop(i/(cols.length-1),k)); return g; }
function sEll(c,x,y,rx,ry,f){ c.fillStyle=f; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,TAU); c.fill(); }
function sLine(c,col,w,pts){ c.strokeStyle=col; c.lineWidth=w; c.beginPath(); c.moveTo(pts[0],pts[1]); for(let i=2;i<pts.length;i+=2) c.lineTo(pts[i],pts[i+1]); c.stroke(); }
function sEye(c,x,y,s,col){ c.fillStyle=col; c.beginPath(); c.arc(x,y,s,0,TAU); c.fill(); c.fillStyle='rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x-s*0.3,y-s*0.35,s*0.35,0,TAU); c.fill(); }

/* Figuren schauen nach rechts. ph = Animationsphase 0..TAU, el = Elite */
const SPR_BODY={
  slime(c,r,ph,el){ const b=el?['#fff2a0','#d6c040','#7a6a10']:['#c8ffb0','#5fc35a','#1f5a22'];
    c.fillStyle=sRad(c,0,-r*0.1,r*1.15,b); c.beginPath(); c.moveTo(-r,r*0.6); c.quadraticCurveTo(-r*1.05,-r*1.05,0,-r); c.quadraticCurveTo(r*1.05,-r*1.05,r,r*0.6); c.quadraticCurveTo(0,r*0.85,-r,r*0.6); c.fill();
    c.fillStyle='rgba(255,255,255,0.18)'; for(const [x,y,s] of [[-0.35,0.25,0.12],[0.4,0.1,0.09],[0.1,0.4,0.07]]){ c.beginPath(); c.arc(x*r,y*r,s*r,0,TAU); c.fill(); }
    c.fillStyle='rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(-r*0.1,r*0.15,r*0.18,r*0.12,0,0,TAU); c.fill(); // verschluckter Knochen
    c.fillStyle='rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-r*0.42,-r*0.5,r*0.26,r*0.13,-0.55,0,TAU); c.fill();
    sEye(c,-r*0.28,-r*0.15,r*0.15,'#14301a'); sEye(c,r*0.32,-r*0.15,r*0.15,'#14301a');
    sLine(c,'#14301a',1.4,[-r*0.15,r*0.15,0,r*0.24,r*0.15,r*0.15]); },

  bat(c,r,ph){ const f=Math.sin(ph)*0.6;
    for(const s of [-1,1]){ c.fillStyle=sGrad(c,0,-r,s*r*2,r*0.4,['#5a3e78','#33223f']); c.beginPath(); c.moveTo(s*r*0.3,-r*0.2);
      c.quadraticCurveTo(s*r*1.4,-r*(0.9+f),s*r*2.1,-r*0.2*f); c.quadraticCurveTo(s*r*1.8,r*0.15,s*r*1.55,r*0.2); c.quadraticCurveTo(s*r*1.3,r*0.05,s*r*1.15,r*0.4); c.quadraticCurveTo(s*r*0.9,r*0.2,s*r*0.5,r*0.45); c.closePath(); c.fill();
      sLine(c,'rgba(20,10,30,0.7)',1,[s*r*0.4,-r*0.1,s*r*2.05,-r*0.2*f]); sLine(c,'rgba(20,10,30,0.6)',0.8,[s*r*0.5,0,s*r*1.55,r*0.2]); sLine(c,'rgba(20,10,30,0.6)',0.8,[s*r*0.5,r*0.1,s*r*1.15,r*0.38]); }
    for(const s of [-1,1]){ c.fillStyle='#4a3260'; c.beginPath(); c.moveTo(s*r*0.2,-r*0.5); c.lineTo(s*r*0.55,-r*1.15); c.lineTo(s*r*0.6,-r*0.35); c.fill(); c.fillStyle='#b0708a'; c.beginPath(); c.moveTo(s*r*0.3,-r*0.5); c.lineTo(s*r*0.52,-r*0.95); c.lineTo(s*r*0.52,-r*0.45); c.fill(); }
    sEll(c,0,0,r*0.72,r*0.78,sRad(c,0,0,r*0.8,['#9a78b8','#6b4a8a','#3a2450']));
    sEll(c,0,r*0.25,r*0.4,r*0.38,'rgba(200,170,220,0.25)');
    sEye(c,-r*0.28,-r*0.18,r*0.15,'#ff3a3a'); sEye(c,r*0.28,-r*0.18,r*0.15,'#ff3a3a');
    c.fillStyle='#fff'; c.beginPath(); c.moveTo(-r*0.18,r*0.1); c.lineTo(-r*0.1,r*0.35); c.lineTo(-r*0.02,r*0.1); c.moveTo(r*0.18,r*0.1); c.lineTo(r*0.1,r*0.35); c.lineTo(r*0.02,r*0.1); c.fill(); },

  skeleton(c,r,ph,el,teal){ const w=Math.sin(ph)*2.4, B=teal?'#cfe8de':'#e2dccb', D=teal?'#7aa898':'#9a907c', E=teal?'#5affd0':'#ff6a3a';
    c.lineCap='round';
    sLine(c,D,3,[-3,11,-3.5+w,15,-4+w,18.5]); sLine(c,D,3,[3,11,3.5-w,15,4-w,18.5]);
    sLine(c,B,2.2,[-3,11,-3.5+w,15,-4+w,18.5]); sLine(c,B,2.2,[3,11,3.5-w,15,4-w,18.5]);
    sEll(c,-4.5+w,18.8,2.4,1.2,B); sEll(c,4.5-w,18.8,2.4,1.2,B);
    sEll(c,0,10.5,5,2.6,sGrad(c,0,8,0,13,[B,D]));                    // Becken
    sLine(c,D,2.2,[0,0,0,10]);                                          // Wirbelsäule
    for(let i=0;i<3;i++){ c.strokeStyle=i?B:'#f4efe0'; c.lineWidth=1.7; c.beginPath(); c.ellipse(0,2.5+i*2.5,6-i*0.8,1.6,0,0,Math.PI*1.05); c.stroke(); c.beginPath(); c.ellipse(0,2.5+i*2.5,6-i*0.8,1.6,0,Math.PI*1.95,TAU); c.stroke(); }
    sLine(c,D,2.4,[-6,1,-8,6,-7,10]); sLine(c,B,1.6,[-6,1,-8,6,-7,10]);   // hinterer Arm
    // Totenschädel
    c.fillStyle=sRad(c,0,-7,9.5,['#ffffff',B,D]); c.beginPath(); c.arc(0,-7,8.6,Math.PI*0.8,Math.PI*2.2); c.lineTo(5,0); c.lineTo(-5,0); c.closePath(); c.fill();
    c.fillStyle=B; c.fillRect(-4,-1.5,8,3.2); c.fillStyle='#2a221e'; for(let i=-3;i<=3;i+=2) c.fillRect(i-0.4,-1.4,0.9,2.6);
    sLine(c,'rgba(60,50,40,0.6)',0.8,[1,-15,2.5,-12,1.5,-10]);           // Riss
    c.fillStyle='#16100e'; c.beginPath(); c.ellipse(-1.6,-7,2.7,3,0,0,TAU); c.ellipse(4.6,-7,2.5,2.9,0,0,TAU); c.fill();
    c.beginPath(); c.moveTo(1.8,-3.5); c.lineTo(1,-2); c.lineTo(2.6,-2); c.fill();
    c.fillStyle=E; c.beginPath(); c.arc(-1.4,-6.8,1,0,TAU); c.arc(4.6,-6.8,1,0,TAU); c.fill(); },

  ally(c,r,ph){ SPR_BODY.skeleton(c,r,ph,false,true); },

  archer(c,r,ph){ const w=Math.sin(ph)*2.2, G1='#8ac25a', G2='#4a7a2a';
    c.lineCap='round'; sLine(c,'#3a2a1a',3.2,[-2.5,9,-3+w,16]); sLine(c,'#3a2a1a',3.2,[2.5,9,3-w,16]); sEll(c,-3.6+w,16.8,2.6,1.4,'#2a1c10'); sEll(c,3.6-w,16.8,2.6,1.4,'#2a1c10');
    c.fillStyle='#6a4a2a'; c.beginPath(); c.moveTo(-6,-2); c.lineTo(-7,-8); c.lineTo(-3,-3); c.fill();            // Köcher
    sLine(c,'#c8b088',1,[-6.5,-5,-8,-10]); sLine(c,'#c8b088',1,[-5.5,-5,-6,-11]);
    c.fillStyle=sGrad(c,0,-2,0,11,['#8a6440','#5a4026','#3a2814']); c.beginPath(); c.moveTo(-7,0); c.quadraticCurveTo(0,-4,7,0); c.lineTo(8,10); c.lineTo(-8,10); c.closePath(); c.fill();
    c.fillStyle='#2a1c10'; c.fillRect(-7.5,5,15,2); c.fillStyle='#c8a050'; c.fillRect(-1.5,4.8,3,2.4);
    sLine(c,'rgba(0,0,0,0.3)',0.8,[-4,1,-5,9]); sLine(c,'rgba(0,0,0,0.3)',0.8,[4,1,5,9]);
    for(const s of [-1,1]){ c.fillStyle=s<0?G2:G1; c.beginPath(); c.moveTo(s*6,-9); c.quadraticCurveTo(s*13,-14,s*17,-12); c.quadraticCurveTo(s*12,-6,s*6,-3); c.fill(); c.fillStyle='#c87a7a'; c.beginPath(); c.moveTo(s*7,-8); c.quadraticCurveTo(s*12,-11,s*14,-11.5); c.quadraticCurveTo(s*11,-7,s*7,-5); c.fill(); }
    c.fillStyle=sRad(c,0,-6,8.5,['#b8e88a',G1,G2]); c.beginPath(); c.arc(0,-6,7.8,0,TAU); c.fill();
    c.fillStyle=G1; c.beginPath(); c.ellipse(6,-4,3,2,0.3,0,TAU); c.fill();       // Nase
    sLine(c,'#2a3a14',1.4,[-1,-10,3,-9]); sLine(c,'#2a3a14',1.4,[4.5,-9,7,-10.5]);
    sEye(c,1.5,-7.5,1.5,'#ffe04a'); sEye(c,5.5,-7.5,1.4,'#ffe04a'); c.fillStyle='#1a1000'; c.fillRect(1.8,-8.2,0.9,1.6); c.fillRect(5.7,-8.2,0.9,1.6);
    sLine(c,'#1a2a0a',1.2,[1,-2.5,4,-2,6.5,-2.8]); c.fillStyle='#fff'; c.beginPath(); c.moveTo(3,-2.3); c.lineTo(3.6,-0.8); c.lineTo(4.2,-2.2); c.fill(); },

  orc(c,r,ph){ const w=Math.sin(ph)*2.6, S='#6f8f4a';
    c.lineCap='round'; sLine(c,'#2a2016',6,[-6,r*0.6,-6.5+w,r*0.95]); sLine(c,'#2a2016',6,[6,r*0.6,6.5-w,r*0.95]); sEll(c,-7+w,r*1.0,4,2,'#1a140c'); sEll(c,7-w,r*1.0,4,2,'#1a140c');
    c.fillStyle=sRad(c,0,2,r*1.05,['#9abb6a','#5a7a3a','#2e4220']); c.beginPath(); c.ellipse(0,2,r,r*0.92,0,0,TAU); c.fill();
    c.fillStyle='rgba(30,40,20,0.35)'; c.beginPath(); c.ellipse(-r*0.25,r*0.1,r*0.35,r*0.25,0.3,0,TAU); c.ellipse(r*0.25,r*0.1,r*0.35,r*0.25,-0.3,0,TAU); c.fill(); // Brustmuskeln
    c.fillStyle=sGrad(c,0,4,0,10,['#5a3e26','#2a1c10']); c.fillRect(-r,3,r*2,6); c.fillStyle='#b8a070'; c.fillRect(-3,2.5,6,7); c.fillStyle='#5a3e26'; c.fillRect(-1.5,4,3,4);
    c.fillStyle='#4a3a2a'; c.beginPath(); c.moveTo(-r*0.7,9); c.lineTo(r*0.7,9); c.lineTo(r*0.5,r*0.75); c.lineTo(-r*0.5,r*0.75); c.fill(); // Lendenschurz
    c.fillStyle=sRad(c,-r*0.75,-r*0.35,r*0.5,['#c8ccd4','#7a808c','#3a3e48']); c.beginPath(); c.ellipse(-r*0.72,-r*0.3,r*0.48,r*0.36,-0.4,0,TAU); c.fill(); // Schulterpanzer
    c.fillStyle='#e8e0c8'; for(const a of [-0.8,-0.3]){ c.beginPath(); c.moveTo(-r*0.72+Math.cos(a+Math.PI)*r*0.3,-r*0.3-r*0.25); c.lineTo(-r*0.72+Math.cos(a+Math.PI)*r*0.3-1,-r*0.3-r*0.55); c.lineTo(-r*0.72+Math.cos(a+Math.PI)*r*0.3+2.5,-r*0.3-r*0.3); c.fill(); }
    c.fillStyle=sRad(c,r*0.05,-r*0.55,r*0.62,['#a8c878',S,'#3e5a28']); c.beginPath(); c.arc(r*0.05,-r*0.55,r*0.6,0,TAU); c.fill();
    c.fillStyle='#1a1410'; c.beginPath(); c.moveTo(-r*0.1,-r*1.12); c.quadraticCurveTo(-r*0.35,-r*1.45,-r*0.5,-r*1.3); c.quadraticCurveTo(-r*0.3,-r*1.2,-r*0.15,-r*1.05); c.fill(); // Haarknoten
    sLine(c,'#2e4220',2.2,[-r*0.12,-r*0.82,r*0.5,-r*0.72]);           // Stirnwulst
    sEye(c,r*0.12,-r*0.66,1.7,'#ff3a2a'); sEye(c,r*0.42,-r*0.64,1.6,'#ff3a2a');
    c.fillStyle='#2a1a10'; c.beginPath(); c.ellipse(r*0.32,-r*0.35,r*0.2,r*0.08,0,0,TAU); c.fill();
    c.fillStyle='#f4ecd4'; for(const x of [r*0.12,r*0.48]){ c.beginPath(); c.moveTo(x-2,-r*0.32); c.lineTo(x,-r*0.62); c.lineTo(x+2,-r*0.32); c.fill(); }
    sLine(c,'rgba(40,20,10,0.6)',1,[-r*0.3,-r*0.75,-r*0.15,-r*0.4]); },  // Narbe

  cultist(c,r){ c.fillStyle=sGrad(c,-r,0,r,0,['#2a1440','#4a2a66','#2a1440']); c.beginPath(); c.moveTo(0,-r*1.25); c.quadraticCurveTo(r*1.15,-r*0.2,r*0.95,r); c.lineTo(-r*0.95,r); c.quadraticCurveTo(-r*1.15,-r*0.2,0,-r*1.25); c.fill();
    c.strokeStyle='#c8a050'; c.lineWidth=1.3; c.beginPath(); c.moveTo(-r*0.95,r-1.5); c.lineTo(r*0.95,r-1.5); c.stroke(); sLine(c,'#c8a050',1.2,[0,r*0.05,0,r]);
    sLine(c,'rgba(0,0,0,0.35)',1,[-r*0.45,0,-r*0.6,r]); sLine(c,'rgba(0,0,0,0.35)',1,[r*0.45,0,r*0.6,r]);
    c.fillStyle='#8a2a4a'; c.beginPath(); c.moveTo(-r*0.5,-r*0.05); c.lineTo(0,r*0.25); c.lineTo(r*0.5,-r*0.05); c.lineTo(r*0.35,-r*0.2); c.lineTo(0,0); c.lineTo(-r*0.35,-r*0.2); c.fill(); // Schärpe
    c.fillStyle='#120818'; c.beginPath(); c.ellipse(r*0.12,-r*0.4,r*0.45,r*0.42,0,0,TAU); c.fill();
    c.strokeStyle='#5a3a7a'; c.lineWidth=1.4; c.beginPath(); c.ellipse(r*0.12,-r*0.4,r*0.47,r*0.44,0,Math.PI*1.1,Math.PI*1.9); c.stroke();
    c.fillStyle='#d07aff'; c.beginPath(); c.ellipse(r*0.02,-r*0.47,1.6,1.1,0,0,TAU); c.ellipse(r*0.38,-r*0.47,1.5,1.1,0,0,TAU); c.fill();
    c.fillStyle=sGrad(c,r*0.4,r*0.1,r*0.9,r*0.5,['#6a3a1a','#3a1e0a']); c.fillRect(r*0.35,r*0.05,r*0.55,r*0.42);   // Buch
    c.fillStyle='#e8d8b0'; c.fillRect(r*0.4,r*0.1,r*0.45,r*0.32); c.fillStyle='#b06aff'; c.fillRect(r*0.55,r*0.18,r*0.15,r*0.15);
    c.fillStyle='#c8b8d8'; c.beginPath(); c.arc(r*0.38,r*0.42,1.8,0,TAU); c.arc(r*0.88,r*0.42,1.8,0,TAU); c.fill(); },

  shield(c,r,ph){ const w=Math.sin(ph)*2.4;
    c.lineCap='round'; sLine(c,'#2a2c34',5,[-4,r*0.6,-4.5+w,r*1.05]); sLine(c,'#2a2c34',5,[4,r*0.6,4.5-w,r*1.05]); sEll(c,-5+w,r*1.08,3.6,1.8,'#5a5e6a'); sEll(c,5-w,r*1.08,3.6,1.8,'#5a5e6a');
    c.fillStyle=sRad(c,0,3,r*0.95,['#a8aebc','#5a5f6e','#2a2e38']); c.beginPath(); c.ellipse(0,3,r*0.85,r*0.9,0,0,TAU); c.fill();
    sLine(c,'rgba(0,0,0,0.4)',1,[-r*0.7,0,r*0.7,0]); sLine(c,'rgba(0,0,0,0.4)',1,[-r*0.75,r*0.45,r*0.75,r*0.45]);
    c.fillStyle='#e8ecf4'; for(const [x,y] of [[-r*0.5,-r*0.2],[r*0.5,-r*0.2],[-r*0.55,r*0.25],[r*0.55,r*0.25]]){ c.beginPath(); c.arc(x,y,0.9,0,TAU); c.fill(); }
    c.fillStyle='#7a2a2a'; c.fillRect(-r*0.6,r*0.62,r*1.2,r*0.3);                                 // Waffenrock
    c.fillStyle=sRad(c,0,-r*0.55,r*0.55,['#d8dce6','#8a90a0','#3e424e']); c.beginPath(); c.arc(0,-r*0.55,r*0.52,Math.PI,0); c.lineTo(r*0.52,-r*0.2); c.lineTo(-r*0.52,-r*0.2); c.closePath(); c.fill();
    c.fillStyle='#14141a'; c.fillRect(-r*0.1,-r*0.66,r*0.6,2.6); c.fillRect(r*0.12,-r*0.66,2,r*0.4);   // Sehschlitz
    c.fillStyle='#ff6a4a'; c.fillRect(r*0.3,-r*0.64,1.6,1.4);
    sLine(c,'rgba(255,255,255,0.4)',1,[-r*0.3,-r*0.95,-r*0.42,-r*0.4]);
    c.fillStyle=sGrad(c,0,-r*1.2,0,-r*0.7,['#ff6a5a','#9a1a1a']); c.beginPath(); c.moveTo(-r*0.1,-r*1.0); c.quadraticCurveTo(-r*0.6,-r*1.5,-r*0.95,-r*0.95); c.quadraticCurveTo(-r*0.5,-r*1.15,-r*0.05,-r*0.85); c.fill(); }, // Helmbusch

  healer(c,r){ c.strokeStyle='rgba(180,255,190,0.8)'; c.lineWidth=1.4; c.beginPath(); c.ellipse(0,-r*1.25,r*0.5,r*0.16,0,0,TAU); c.stroke();
    c.fillStyle=sGrad(c,-r,0,r,0,['#a8a088','#ece4cc','#a8a088']); c.beginPath(); c.moveTo(0,-r*1.0); c.quadraticCurveTo(r,-r*0.2,r*0.85,r); c.lineTo(-r*0.85,r); c.quadraticCurveTo(-r,-r*0.2,0,-r*1.0); c.fill();
    c.fillStyle='#3a8a4a'; c.fillRect(-r*0.85,r-3,r*1.7,2.2); c.fillRect(-1.2,-r*0.05,2.4,r*1.0);
    c.fillStyle='#e8fff0'; c.fillRect(-r*0.3,r*0.3,r*0.6,2); c.fillRect(-1,r*0.1,2,r*0.45);                   // Kreuz
    sLine(c,'rgba(0,0,0,0.25)',1,[-r*0.45,0,-r*0.6,r]); sLine(c,'rgba(0,0,0,0.25)',1,[r*0.45,0,r*0.6,r]);
    c.fillStyle='#3a3424'; c.beginPath(); c.ellipse(r*0.12,-r*0.38,r*0.42,r*0.38,0,0,TAU); c.fill();
    c.fillStyle='#d8b890'; c.beginPath(); c.ellipse(r*0.18,-r*0.32,r*0.3,r*0.28,0,0,TAU); c.fill();       // Gesicht
    c.fillStyle='#e8e8e8'; c.beginPath(); c.moveTo(-r*0.05,-r*0.2); c.quadraticCurveTo(r*0.2,r*0.25,r*0.45,-r*0.2); c.fill(); // Bart
    sEye(c,r*0.06,-r*0.42,1.2,'#2a8a4a'); sEye(c,r*0.32,-r*0.42,1.2,'#2a8a4a');
    sLine(c,'#5a3a1a',3,[r*0.9,r,r*0.9,-r*1.05]); sLine(c,'#8a6a3a',1.6,[r*0.9,r,r*0.9,-r*1.05]);
    c.strokeStyle='#8a6a3a'; c.lineWidth=1.8; c.beginPath(); c.arc(r*0.9,-r*1.2,3.6,Math.PI*0.6,Math.PI*2.4); c.stroke();
    c.fillStyle=sRad(c,r*0.9,-r*1.2,3,['#ffffff','#7dff8a','#1a8a3a']); c.beginPath(); c.moveTo(r*0.9,-r*1.2-3.5); c.lineTo(r*0.9+2.2,-r*1.2); c.lineTo(r*0.9,-r*1.2+3.5); c.lineTo(r*0.9-2.2,-r*1.2); c.fill();
    c.fillStyle='#d8b890'; c.beginPath(); c.arc(r*0.9,r*0.1,2,0,TAU); c.fill(); },

  spiderling(c,r,ph){ const w=Math.sin(ph); c.lineCap='round';
    for(let i=0;i<4;i++) for(const s of [-1,1]){ const o=(i-1.5)*3.5, k=w*(i%2?1:-1); sLine(c,'#120c10',2,[o,0,o+k*2,s*6,o+k*3+(i-1.5)*2,s*11]); sLine(c,'#4a3a48',0.8,[o,0,o+k*2,s*6]); }
    sEll(c,-2,1,6.5,5.5,sRad(c,-2,1,6.5,['#7a5a80','#3a2a40','#140c18']));
    c.fillStyle='#c02a3a'; c.beginPath(); c.moveTo(-2,-2); c.lineTo(0,1); c.lineTo(-2,4); c.lineTo(-4,1); c.fill();
    sEll(c,4,0,3.4,3,sRad(c,4,0,3.4,['#6a4a70','#2a1a30']));
    c.fillStyle='#ff3a4a'; for(const [x,y] of [[5,-1.6],[5,1.6],[6.6,-0.8],[6.6,0.8]]){ c.beginPath(); c.arc(x,y,0.8,0,TAU); c.fill(); } },

  imp(c,r,ph){ const f=Math.sin(ph)*0.5;
    for(const s of [-1,1]){ c.fillStyle=sGrad(c,0,0,s*r*1.7,-r,['#5a1008','#a02a18']); c.beginPath(); c.moveTo(s*2,-3); c.lineTo(s*r*1.75,-r*(0.95+f)); c.lineTo(s*r*1.5,-r*0.2); c.lineTo(s*r*1.3,r*0.1); c.lineTo(s*r*1.05,r*0.35); c.closePath(); c.fill();
      sLine(c,'rgba(40,0,0,0.7)',0.9,[s*2,-3,s*r*1.5,-r*0.2]); sLine(c,'rgba(40,0,0,0.7)',0.9,[s*2,-3,s*r*1.3,r*0.1]); }
    c.strokeStyle='#8a1a10'; c.lineWidth=2; c.lineCap='round'; c.beginPath(); c.moveTo(-3,r*0.5); c.quadraticCurveTo(-r*1.1,r*1.2,-r*1.3,r*0.5); c.stroke();
    c.fillStyle='#8a1a10'; c.beginPath(); c.moveTo(-r*1.3,r*0.2); c.lineTo(-r*1.55,r*0.55); c.lineTo(-r*1.1,r*0.55); c.fill();
    sEll(c,0,0,r*0.82,r*0.85,sRad(c,0,0,r*0.85,['#ff8a5a','#d0402a','#6a1408']));
    sEll(c,r*0.1,r*0.3,r*0.4,r*0.35,'rgba(255,200,120,0.3)');
    c.fillStyle=sGrad(c,0,-8,0,-16,['#3a1a10','#e8d0a0']); c.beginPath(); c.moveTo(-5,-6); c.quadraticCurveTo(-10,-10,-8,-16); c.lineTo(-2,-8); c.moveTo(6,-6); c.quadraticCurveTo(11,-10,9,-16); c.lineTo(3,-8); c.fill();
    sLine(c,'#5a0a04',1.4,[-1,-5,2.5,-3.5]); sLine(c,'#5a0a04',1.4,[4,-3.5,7,-5]);
    sEye(c,1.5,-2.5,1.5,'#ffe04a'); sEye(c,5.2,-2.5,1.4,'#ffe04a');
    sLine(c,'#3a0400',1.2,[0,2.5,3,4,6,2.5]); c.fillStyle='#fff'; c.beginPath(); c.moveTo(1.5,3); c.lineTo(2,4.6); c.lineTo(2.6,3.4); c.moveTo(4,3.4); c.lineTo(4.6,4.6); c.lineTo(5,3); c.fill(); },

  kobold(c,r,ph){ const w=Math.sin(ph)*2;
    c.lineCap='round'; sLine(c,'#5a3014',2.6,[-2,9,-2.5+w,14]); sLine(c,'#5a3014',2.6,[2,9,2.5-w,14]);
    c.fillStyle=sGrad(c,-10,0,-4,0,['#4a3a2a','#7a5a3a']); c.fillRect(-10,-3,6,11); c.fillStyle='#2a2228';                                   // Rucksack mit Bomben
    for(let i=0;i<3;i++){ c.beginPath(); c.arc(-8+i*1.4,-2+i*3.5,2.8,0,TAU); c.fill(); }
    c.fillStyle='rgba(255,255,255,0.3)'; c.beginPath(); c.arc(-9,-3,0.9,0,TAU); c.fill();
    sEll(c,0,5,7,7,sRad(c,0,5,7,['#b07a42','#7a4a22','#3a200c']));
    c.fillStyle='#3a2a1a'; c.fillRect(-7,6,14,2);
    c.strokeStyle='#d0782a'; c.lineWidth=2; c.beginPath(); c.moveTo(-5,8); c.quadraticCurveTo(-12,13,-13,6); c.stroke();  // Schwanz
    c.fillStyle=sRad(c,1,-5,7,['#f0a050','#d0782a','#7a3a10']); c.beginPath(); c.ellipse(0,-5,6.5,6,0,0,TAU); c.fill(); c.beginPath(); c.ellipse(5.5,-3,4.4,2.8,0.15,0,TAU); c.fill();
    c.fillStyle='#f0d0a0'; c.beginPath(); c.moveTo(-3,-10); c.lineTo(-5,-15); c.lineTo(-1,-10.5); c.moveTo(1,-10.8); c.lineTo(0.5,-15.5); c.lineTo(3,-10.5); c.fill();
    c.fillStyle='#1a0a00'; c.beginPath(); c.arc(8.5,-3.5,0.7,0,TAU); c.fill();
    sEye(c,1.5,-6.5,1.4,'#ffd04a'); c.fillStyle='#1a0a00'; c.fillRect(1.6,-7.4,0.8,1.8);
    c.fillStyle='#e8c070'; c.beginPath(); c.ellipse(-2,-1.5,4,1.6,0,0,TAU); c.fill(); // Halstuch
    c.fillStyle=sRad(c,9,0,4.2,['#6a6070','#1c1820','#000']); c.beginPath(); c.arc(9,0,4,0,TAU); c.fill(); sLine(c,'#c8a060',1,[10,-3.5,11,-5]); },
};

function sprScale(){ return FX()?2.4:1.6; }
function getSprite(kind,el,fr,white){
  const key=kind+(el?'e':'')+fr+(white?'w':''); let s=SPR[key]; if(s) return s;
  if(white){ const b=getSprite(kind,el,fr,false), cv=document.createElement('canvas'); cv.width=b.c.width; cv.height=b.c.height; const c=cv.getContext('2d');
    c.drawImage(b.c,0,0); c.globalCompositeOperation='source-atop'; c.fillStyle='#fff'; c.fillRect(0,0,cv.width,cv.height); return SPR[key]={c:cv,h:b.h,r:b.r}; }
  const r=kind==='ally'?13:ENEMIES[kind].r, h=Math.max(r*2.3,24), k=sprScale(), px=Math.ceil(h*2*k);
  const body=document.createElement('canvas'); body.width=body.height=px; const b=body.getContext('2d');
  b.setTransform(k,0,0,k,px/2,px/2); b.lineJoin='round'; SPR_BODY[kind](b,r,fr/SPR_FR*TAU,el);
  // Schattierung: Licht von oben links, unten dunkler
  b.setTransform(1,0,0,1,0,0); b.globalCompositeOperation='source-atop';
  const g=b.createLinearGradient(0,px*0.25,0,px*0.85); g.addColorStop(0,'rgba(255,240,220,0.08)'); g.addColorStop(1,'rgba(0,0,20,0.32)'); b.fillStyle=g; b.fillRect(0,0,px,px);
  // dunkler Umriss
  const out=document.createElement('canvas'); out.width=out.height=px; const o=out.getContext('2d');
  const sil=document.createElement('canvas'); sil.width=sil.height=px; const si=sil.getContext('2d');
  si.drawImage(body,0,0); si.globalCompositeOperation='source-in'; si.fillStyle='#0c0810'; si.fillRect(0,0,px,px);
  const d=Math.max(1,1.1*k); for(let i=0;i<8;i++){ const a=i/8*TAU; o.drawImage(sil,Math.cos(a)*d,Math.sin(a)*d); }
  o.drawImage(body,0,0);
  return SPR[key]={c:out,h,r};
}
function sprFrame(kind,e){ const sp=SPR_KIND[kind].sp; if(!sp) return 0; if(kind!=='bat'&&kind!=='spiderling'&&kind!=='imp'&&!e.mv) return 0;
  return Math.floor((((e.t*sp+(e.seed||0))%TAU)+TAU)%TAU/TAU*SPR_FR)%SPR_FR; }
// zeichnet das Sprite am aktuellen Ursprung, gespiegelt wenn nach links geschaut wird
function blitSprite(kind,e,el,white){ const s=getSprite(kind,el,sprFrame(kind,e),white);
  ctx.save(); if(SPR_KIND[kind].flip && Math.cos(e.face)<0) ctx.scale(-1,1); const h=s.h*(e.r?e.r/s.r:1); ctx.drawImage(s.c,-h,-h,h*2,h*2); ctx.restore(); }

/* kleines Porträt (Leinwand) eines Gegners für das Bestiarium */
function enemyPortrait(kind,size=44){ const cv=document.createElement('canvas'), d=Math.min(2,window.devicePixelRatio||1); cv.width=cv.height=size*d; cv.style.width=cv.style.height=size+'px';
  const c=cv.getContext('2d');
  if(SPR_BODY[kind]){ const s=getSprite(kind,false,0,false), z=size*d/(s.h*2)*1.05; c.drawImage(s.c,0,0,s.c.width,s.c.height,(size*d-s.h*2*z)/2,(size*d-s.h*2*z)/2,s.h*2*z,s.h*2*z); }
  else { const old=ctx, e=Object.assign({x:0,y:0,face:kind==='whelp'?-Math.PI/2:0,t:0.5,seed:0,hp:1,maxHp:1,flash:0,spawnT:0,st:0,timer:3,r:ENEMIES[kind]?ENEMIES[kind].r:16},ENEMIES[kind]||{},{kind});
    const r=e.r; ctx=c; c.setTransform(size*d/(r*4.4),0,0,size*d/(r*4.4),size*d/2,size*d/2);
    try{ drawEnemy(e,true); }catch(err){} ctx=old; }
  return cv;
}

/* Porträts in Menüs: <canvas data-port="hero:krieger"> oder data-port="foe:slime" */
function heroPortrait(cv,cid,size){ const d=Math.min(2,window.devicePixelRatio||1); cv.width=cv.height=size*d; const c=cv.getContext('2d'), old=ctx;
  c.setTransform(size*d/34,0,0,size*d/34,size*d/2,size*d*0.56); ctx=c;
  try{ drawHeroFigure(cid,skinOf(cid),{face:0.6,moving:false,anim:0,swing:0,t:0.3}); }catch(err){} ctx=old; }
function fillPortraits(root){ (root||document).querySelectorAll('canvas[data-port]').forEach(cv=>{ const [t,k]=cv.dataset.port.split(':'), size=+cv.dataset.size||46;
  cv.style.width=cv.style.height=size+'px';
  if(t==='hero') heroPortrait(cv,k,size);
  else { const p=enemyPortrait(k,size); cv.width=p.width; cv.height=p.height; cv.getContext('2d').drawImage(p,0,0); } }); }
