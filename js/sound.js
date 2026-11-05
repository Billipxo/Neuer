'use strict';
/* Arena der Verdammten – Soundeffekte
   Alle Klänge werden einmal im Hintergrund „gebacken“ (OfflineAudioContext): mehrere Schichten aus Rauschen,
   Filtern, Glocken- und Metall-Teiltönen, Stimmformanten und Verzerrung, je Klang mehrere Varianten.
   Beim Abspielen kommen Tonhöhen-Streuung, Stereo nach Bildschirmposition, Entfernung und Hall je Akt dazu.
   So klingt nichts zweimal gleich, und das Abspielen selbst kostet fast nichts.
   Aufruf im Spiel: sfx(name, {x, y, vol, rate, delay}) – Namen siehe SDEF. */

const SR_BAKE=32000;                         // Abtastrate der gebackenen Klänge (spart Speicher, reicht bis 16 kHz)
const SB={ buf:{}, last:{}, voices:[], busy:false, ready:false, bytes:0 };
const SND={ bus:null, revIn:null, rev:null, act:-1 };
let SN=null;                                  // Rauschpuffer: weiß, rosa, braun
const ROAR={golem:0.75,spider:1.6,lich:1.2,vampire:1.35,dragon:0.65,lavaworm:0.55,fallen:1.8};

function sRng(seed){ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
function sHash(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function sndNoise(ctx){
  if(SN) return SN; const sr=ctx.sampleRate, n=Math.floor(sr*1.6), mk=()=>ctx.createBuffer(1,n,sr), w=mk(), p=mk(), b=mk();
  const W=w.getChannelData(0), Pk=p.getChannelData(0), B=b.getChannelData(0), r=sRng(90210); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,br=0;
  for(let i=0;i<n;i++){ const x=r()*2-1; W[i]=x;
    b0=0.99886*b0+x*0.0555179; b1=0.99332*b1+x*0.0750759; b2=0.969*b2+x*0.153852; b3=0.8665*b3+x*0.3104856; b4=0.55*b4+x*0.5329522; b5=-0.7616*b5-x*0.016898;
    Pk[i]=(b0+b1+b2+b3+b4+b5+b6+x*0.5362)*0.11; b6=x*0.115926; br=(br+0.02*x)/1.02; B[i]=br*3.5; }
  return SN={white:w,pink:p,brown:b};
}

/* ---------- Baukasten für einen Klang im OfflineAudioContext ---------- */
function sndKit(c,out,R){
  const K={c,out,R};
  K.gain=(v=1)=>{ const g=c.createGain(); g.gain.value=v; return g; };
  K.filt=(type,f,Q)=>{ const b=c.createBiquadFilter(); b.type=type; b.frequency.value=f; if(Q!==undefined) b.Q.value=Q; return b; };
  K.env=(p,t,a,peak,d)=>{ a=Math.max(0.0008,a); d=Math.max(0.005,d); p.setValueAtTime(0.0001,t); p.exponentialRampToValueAtTime(Math.max(0.0002,peak),t+a); p.exponentialRampToValueAtTime(0.0001,t+a+d); };
  K.ramp=(p,t,v0,v1,dur)=>{ p.setValueAtTime(v0,t); p.exponentialRampToValueAtTime(Math.max(1,v1),t+Math.max(0.005,dur)); };
  K.lfo=(target,rate,depth,t0,t1)=>{ const l=c.createOscillator(), g=K.gain(depth); l.frequency.value=rate; l.connect(g); g.connect(target); l.start(t0); l.stop(t1); };
  // gefiltertes Rauschen mit Hüllkurve (optional Filterfahrt f → f2)
  K.noise=(t,dur,o={})=>{ const s=c.createBufferSource(); s.buffer=SN[o.col||'white']; s.loop=true;
    const f=K.filt(o.type||'bandpass',o.f||1000,o.Q??0.9); if(o.f2) K.ramp(f.frequency,t,o.f||1000,o.f2,o.sweep||dur);
    const g=K.gain(0), a=o.a??0.003; K.env(g.gain,t,a,o.vol??0.5,dur); s.connect(f); f.connect(g); g.connect(o.to||out);
    s.start(t,R()*1.2); s.stop(t+a+dur+0.03); return g; };
  // Ton mit Tonhöhenverlauf und optionalem Vibrato
  K.tone=(t,dur,o={})=>{ const osc=c.createOscillator(); osc.type=o.type||'sine';
    if(o.f2) K.ramp(osc.frequency,t,o.f,o.f2,o.sweep||dur); else osc.frequency.value=o.f; if(o.det) osc.detune.value=o.det;
    const a=o.a??0.002; if(o.vib) K.lfo(osc.frequency,o.vib[0],o.vib[1],t,t+a+dur+0.05);
    const g=K.gain(0); K.env(g.gain,t,a,o.vol??0.3,dur); osc.connect(g); g.connect(o.to||out); osc.start(t); osc.stop(t+a+dur+0.03); return g; };
  // Glocke, Metall, Glas: Teiltöne mit eigenen Abklingzeiten
  K.bell=(t,base,ratios,o={})=>{ ratios.forEach((r,i)=>K.tone(t,(o.dec||0.5)*Math.pow(o.decK||0.75,i),{f:base*r*(1+(R()-0.5)*(o.spread||0.006)),vol:(o.vol||0.2)*Math.pow(o.volK||0.7,i),a:o.a||0.001,to:o.to})); };
  K.click=(t,o={})=>K.noise(t,o.dur||0.012,{type:'highpass',f:o.f||2500,Q:0.7,vol:o.vol||0.5,a:0.0005,to:o.to});
  // Stimme (Grunzen, Brüllen, Chor): Sägezahn durch Formantfilter
  K.voice=(t,dur,o={})=>{ const osc=c.createOscillator(); osc.type='sawtooth'; const f=o.f||140; osc.frequency.setValueAtTime(f,t);
    if(o.peak) osc.frequency.linearRampToValueAtTime(f*o.peak,t+Math.min(0.25,dur*0.3));
    if(o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2,t+dur*(o.sweepK||0.95)); if(o.det) osc.detune.value=o.det;
    if(o.vib) K.lfo(osc.frequency,o.vib[0],o.vib[1],t,t+dur+0.1);
    const g=K.gain(0); K.env(g.gain,t,o.a??0.02,o.vol??0.3,dur);
    for(const [ff,amp] of (o.formants||[[650,1],[1100,0.6],[2500,0.25]])){ const b=K.filt('bandpass',ff,o.Q||7), bg=K.gain(amp*(o.Q||7)*0.4); osc.connect(b); b.connect(bg); bg.connect(g); }
    g.connect(o.to||out); osc.start(t); osc.stop(t+dur+0.08); return g; };
  K.drive=(amt,to)=>{ const ws=c.createWaveShaper(), n=1024, cv=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; cv[i]=Math.tanh(x*amt)/Math.tanh(amt); } ws.curve=cv; ws.connect(to||out); return ws; };
  K.body=(t,f,vol=0.55)=>{ K.tone(t,0.08,{f,f2:f*0.4,vol,a:0.0008}); K.click(t,{f:1500,vol:vol*0.9,dur:0.012}); };
  return K;
}

/* ---------- Klangkatalog: dur (s), n Varianten, vol Grundlautstärke, gap Mindestabstand, pv Tonhöhenstreuung, rev Hall, pri wichtig ---------- */
const SDEF={
  // Menü und Rückmeldungen
  ui:{dur:0.07,n:3,vol:0.32,gap:0.03,rev:0,f:(K,v,R)=>{ K.noise(0,0.012,{type:'bandpass',f:2100+R()*900,Q:2.5,vol:0.8,a:0.0006}); K.tone(0,0.03,{f:1000+R()*200,f2:800,vol:0.2,a:0.001}); }},
  // Treffer
  hit:{dur:0.16,n:4,vol:0.38,gap:0.035,rev:0.06,f:(K,v,R)=>{ const b=150+R()*50; K.click(0,{f:1600+R()*800,vol:0.9,dur:0.014}); K.tone(0,0.09,{f:b,f2:b*0.38,vol:1,a:0.0008});
    K.noise(0.002,0.06,{type:'bandpass',f:800+R()*700,Q:1.3,vol:0.55,a:0.001}); K.noise(0.004,0.035,{type:'highpass',f:3500,vol:0.12,a:0.001}); }},
  hitheavy:{dur:0.26,n:3,vol:0.5,gap:0.05,rev:0.12,f:(K,v,R)=>{ const b=105+R()*25; K.click(0,{f:1200,vol:0.8,dur:0.018}); K.tone(0,0.16,{f:b,f2:b*0.36,vol:1,a:0.001});
    K.noise(0.003,0.12,{type:'lowpass',f:900+R()*300,Q:0.8,vol:0.6,col:'brown'}); K.noise(0.003,0.05,{type:'bandpass',f:600,Q:1,vol:0.4}); }},
  crit:{dur:0.42,n:3,vol:0.48,gap:0.05,pri:1,rev:0.2,f:(K,v,R)=>{ const b=170+R()*40; K.click(0,{f:2500,vol:1,dur:0.012}); K.tone(0,0.11,{f:b,f2:b*0.35,vol:1,a:0.0008});
    K.noise(0.002,0.07,{type:'bandpass',f:1200+R()*600,Q:1.2,vol:0.6}); K.bell(0.004,2200+R()*500,[1,1.52,2.27,3.13],{vol:0.24,dec:0.34,decK:0.7}); }},
  block:{dur:0.5,n:3,vol:0.38,gap:0.06,rev:0.15,f:(K,v,R)=>{ K.click(0,{f:3000,vol:0.9,dur:0.01}); K.bell(0,560+R()*120,[1,2.32,3.18,4.55,5.93],{vol:0.35,dec:0.42,decK:0.72,volK:0.75}); K.noise(0,0.05,{type:'bandpass',f:2500,Q:2,vol:0.25}); }},
  immune:{dur:0.62,n:2,vol:0.32,gap:0.25,rev:0.35,f:(K,v,R)=>{ K.bell(0,1480+R()*100,[1,1.5,2.25,3.01],{vol:0.25,dec:0.5}); K.noise(0,0.25,{type:'highpass',f:6500,vol:0.06,a:0.02}); }},
  // Waffen der Helden
  swing:{dur:0.24,n:4,vol:0.3,gap:0.05,rev:0.05,f:(K,v,R)=>{ const f0=450+R()*150; K.noise(0,0.13,{type:'bandpass',f:f0,f2:f0*5,sweep:0.11,Q:1.5,vol:0.8,a:0.025});
    K.noise(0.02,0.07,{type:'highpass',f:4200,vol:0.18,a:0.01}); K.bell(0.03,2700+R()*500,[1,1.47,2.09,2.71],{vol:0.05,dec:0.13}); }},
  axe:{dur:0.3,n:3,vol:0.26,gap:0.06,rev:0.05,f:(K,v,R)=>{ const f0=260+R()*80; K.noise(0,0.18,{type:'bandpass',f:f0,f2:f0*4.2,sweep:0.15,Q:1.2,vol:0.85,a:0.035}); K.noise(0,0.16,{type:'lowpass',f:500,vol:0.35,a:0.04,col:'brown'}); }},
  spin:{dur:0.16,n:3,vol:0.2,gap:0.09,rev:0.04,f:(K,v,R)=>{ const f0=700+R()*200; K.noise(0,0.09,{type:'bandpass',f:f0,f2:f0*3.2,sweep:0.08,Q:1.4,vol:0.8,a:0.02}); K.noise(0.01,0.05,{type:'highpass',f:5000,vol:0.15}); }},
  hammer:{dur:0.42,n:3,vol:0.2,gap:0.08,rev:0.06,f:(K,v,R)=>{ const g=K.gain(1); g.connect(K.out); K.lfo(g.gain,13+R()*4,0.5,0,0.42);
    K.noise(0,0.34,{type:'bandpass',f:380,f2:1300,sweep:0.3,Q:1.6,vol:0.8,a:0.03,to:g}); K.tone(0,0.3,{f:110,vol:0.12,a:0.02}); K.bell(0.02,1900,[1,2.4],{vol:0.04,dec:0.2}); }},
  zap:{dur:0.2,n:4,vol:0.24,gap:0.05,rev:0.1,f:(K,v,R)=>{ const c=K.c, fc=780+R()*160, car=c.createOscillator(), mod=c.createOscillator(), mg=K.gain(0), g=K.gain(0);
    K.ramp(car.frequency,0,fc,fc*2.1,0.12); K.ramp(mod.frequency,0,fc*2.01,fc*4.2,0.12); mg.gain.setValueAtTime(fc*0.9,0); mg.gain.exponentialRampToValueAtTime(30,0.14);
    mod.connect(mg); mg.connect(car.frequency); K.env(g.gain,0,0.003,0.7,0.15); car.connect(g); g.connect(K.out); car.start(0); mod.start(0); car.stop(0.2); mod.stop(0.2);
    K.noise(0.008,0.05,{type:'highpass',f:5200,vol:0.25}); K.tone(0,0.07,{type:'triangle',f:330,f2:170,vol:0.3}); }},
  twang:{dur:0.26,n:4,vol:0.28,gap:0.05,rev:0.05,f:(K,v,R)=>{ const f0=185+R()*40, lp=K.filt('lowpass',3200,5); K.ramp(lp.frequency,0,3400,700,0.16); lp.connect(K.out);
    K.tone(0,0.2,{type:'sawtooth',f:f0,f2:f0*0.985,vol:0.6,a:0.001,to:lp}); K.tone(0,0.06,{f:150,f2:70,vol:0.5}); K.noise(0.02,0.12,{type:'highpass',f:2600,vol:0.12,a:0.02}); }},
  skull:{dur:0.34,n:3,vol:0.16,gap:0.06,rev:0.2,f:(K,v,R)=>{ K.noise(0,0.26,{type:'bandpass',f:330,f2:950,sweep:0.22,Q:2.2,vol:0.8,a:0.05});
    K.tone(0,0.26,{f:300+R()*30,vol:0.16,a:0.04,vib:[7,9]}); K.tone(0,0.26,{f:308+R()*30,vol:0.12,a:0.04}); [0.03,0.08,0.12].forEach(t=>K.noise(t,0.012,{type:'bandpass',f:2400+R()*800,Q:5,vol:0.3})); }},
  flask:{dur:0.22,n:3,vol:0.22,gap:0.06,rev:0.08,f:(K,v,R)=>{ K.bell(0,2300+R()*300,[1,1.5,2.21],{vol:0.25,dec:0.12}); K.noise(0,0.1,{type:'bandpass',f:1100,f2:2600,Q:1.3,vol:0.4,a:0.02}); }},
  splash:{dur:0.4,n:4,vol:0.34,gap:0.05,rev:0.12,f:(K,v,R)=>{ for(let i=0;i<7;i++) K.noise(R()*0.07,0.006+R()*0.012,{type:'highpass',f:3500+R()*5000,vol:0.6*(1-i/9),a:0.0004});
    for(let i=0;i<3;i++) K.bell(R()*0.05,2800+R()*3500,[1,1.37],{vol:0.07,dec:0.07}); K.noise(0.01,0.24,{type:'lowpass',f:1100,f2:300,Q:1.5,vol:0.55,a:0.005});
    for(let i=0;i<3;i++) K.tone(0.06+R()*0.2,0.03,{f:280+R()*200,f2:650+R()*300,vol:0.2,a:0.002}); }},
  // Tode der Gegner
  die_bone:{dur:0.42,n:4,vol:0.34,gap:0.05,rev:0.12,f:(K,v,R)=>{ const n=5+Math.floor(R()*3); let t=0;
    for(let i=0;i<n;i++){ const a=1-i/(n+1); K.noise(t,0.01+R()*0.012,{type:'bandpass',f:1700+R()*1700,Q:5+R()*4,vol:0.9*a,a:0.0005}); if(R()<0.5) K.tone(t,0.03,{type:'triangle',f:620+R()*450,vol:0.25*a,a:0.0008}); t+=0.025+R()*0.05*(1+i*0.25); }
    K.tone(0,0.05,{f:220,f2:110,vol:0.3}); }},
  die_goo:{dur:0.36,n:4,vol:0.38,gap:0.05,rev:0.08,f:(K,v,R)=>{ const lp=K.filt('lowpass',1400,9); K.ramp(lp.frequency,0,1300+R()*400,170,0.17); lp.connect(K.out);
    K.noise(0,0.2,{type:'lowpass',f:4000,vol:0.9,a:0.004,to:lp}); K.tone(0,0.09,{f:130,f2:60,vol:0.45}); for(let i=0;i<3;i++) K.tone(0.04+R()*0.2,0.035,{f:220+R()*180,f2:600+R()*300,vol:0.22,a:0.002}); }},
  die_bat:{dur:0.24,n:3,vol:0.28,gap:0.05,rev:0.1,f:(K,v,R)=>{ const f0=2300+R()*500; K.tone(0,0.05,{f:f0,f2:f0*1.35,vol:0.35,a:0.002}); K.tone(0.055,0.06,{f:f0*1.3,f2:f0*0.95,vol:0.28,a:0.002});
    [0,0.045,0.09].forEach((t,i)=>K.noise(t,0.025,{type:'bandpass',f:700,Q:0.9,vol:0.45*(1-i*0.25)})); }},
  die_orc:{dur:0.44,n:3,vol:0.4,gap:0.06,rev:0.1,f:(K,v,R)=>{ const f=95+R()*20; K.voice(0,0.32,{f,f2:f*0.62,vol:0.9,a:0.012,formants:[[520,1],[880,0.7],[2300,0.2]],Q:6,vib:[9,4]}); K.body(0,110); }},
  die_gob:{dur:0.32,n:4,vol:0.34,gap:0.06,rev:0.1,f:(K,v,R)=>{ const f=205+R()*40; K.voice(0,0.22,{f,f2:f*0.58,vol:0.9,a:0.01,formants:[[760,1],[1450,0.75],[2700,0.3]],Q:6,vib:[11,8]}); K.body(0,160); }},
  die_man:{dur:0.4,n:3,vol:0.36,gap:0.06,rev:0.14,f:(K,v,R)=>{ const f=150+R()*25; K.voice(0,0.3,{f,f2:f*0.6,vol:0.9,a:0.015,formants:[[600,1],[1050,0.6],[2450,0.25]],Q:6}); K.noise(0,0.25,{type:'bandpass',f:1600,Q:2,vol:0.1,a:0.03}); K.body(0,130); }},
  die_fire:{dur:0.5,n:3,vol:0.28,gap:0.06,rev:0.12,f:(K,v,R)=>{ K.noise(0,0.36,{type:'bandpass',f:240,f2:1500,sweep:0.2,Q:0.8,vol:0.9,a:0.03}); for(let i=0;i<12;i++) K.noise(R()*0.42,0.003+R()*0.004,{type:'highpass',f:2800,vol:0.5*R(),a:0.0003}); K.tone(0,0.12,{f:90,f2:45,vol:0.5}); }},
  die_stone:{dur:0.5,n:3,vol:0.28,gap:0.06,rev:0.14,f:(K,v,R)=>{ K.tone(0,0.16,{f:85,f2:38,vol:0.8}); for(let i=0;i<4;i++) K.noise(i*0.06+R()*0.03,0.08,{type:'lowpass',f:700+R()*400,vol:0.7*(1-i*0.2),col:'brown',a:0.002});
    for(let i=0;i<6;i++) K.noise(R()*0.35,0.015,{type:'bandpass',f:1100+R()*1200,Q:4,vol:0.45*R(),a:0.0005}); }},
  die_wood:{dur:0.45,n:3,vol:0.38,gap:0.06,rev:0.12,f:(K,v,R)=>{ K.noise(0,0.025,{type:'bandpass',f:950,Q:3,vol:1,a:0.0005}); K.voice(0.01,0.14,{f:150,f2:105,vol:0.35,a:0.005,formants:[[620,1],[1250,0.5]],Q:8});
    for(let i=0;i<6;i++) K.noise(0.02+R()*0.3,0.01,{type:'bandpass',f:1500+R()*1500,Q:5,vol:0.4*R()}); K.tone(0,0.1,{f:120,f2:60,vol:0.4}); }},
  die_spirit:{dur:0.85,n:3,vol:0.2,gap:0.08,rev:0.45,f:(K,v,R)=>{ const f=520+R()*80; K.tone(0,0.7,{f,f2:f*0.5,sweep:0.7,vol:0.4,a:0.05,vib:[6,f*0.03]}); K.tone(0,0.6,{f:f*1.5,f2:f*0.7,sweep:0.6,vol:0.15,a:0.06});
    K.noise(0,0.65,{type:'bandpass',f:1100,f2:380,Q:4,vol:0.45,a:0.06}); }},
  die_holy:{dur:1.3,n:2,vol:0.22,gap:0.1,rev:0.5,f:(K,v,R)=>{ const base=1046.5*(R()<0.5?1:1.122); [1,1.26,1.5,2].forEach((r,i)=>K.bell(i*0.03,base*r,[1,2.01,3.0],{vol:0.18,dec:1.0,decK:0.6})); K.noise(0,0.45,{type:'highpass',f:6000,vol:0.08,a:0.03}); }},
  // Held
  hurt:{dur:0.34,n:3,vol:0.5,gap:0.12,pri:1,rev:0.08,f:(K,v,R)=>{ K.click(0,{f:1300,vol:1,dur:0.016}); K.tone(0,0.14,{f:125,f2:42,vol:1}); K.noise(0.002,0.09,{type:'bandpass',f:650,Q:1,vol:0.6,col:'pink'});
    K.voice(0.015,0.17,{f:175+R()*20,f2:120,vol:0.5,a:0.008,formants:[[600,1],[1000,0.6]],Q:6}); }},
  dash:{dur:0.26,n:3,vol:0.3,gap:0.08,rev:0.05,f:(K,v,R)=>{ K.noise(0,0.17,{type:'bandpass',f:320,f2:2800,sweep:0.15,Q:1.3,vol:0.9,a:0.02}); K.noise(0.03,0.1,{type:'highpass',f:4500,vol:0.18,a:0.02}); }},
  perfect:{dur:0.75,n:2,vol:0.32,gap:0.2,pri:1,rev:0.35,f:(K,v,R)=>{ K.noise(0,0.06,{type:'highpass',f:3000,vol:0.5,a:0.14}); [880,1108.7,1318.5,1760].forEach((f,i)=>K.bell(0.12+i*0.045,f,[1,2.0,3.01],{vol:0.2,dec:0.4})); }},
  // Belohnungen
  coin:{dur:0.32,n:2,vol:0.2,gap:0.025,pv:0.01,rev:0.1,f:(K,v,R)=>{ const f=1975; K.tone(0,0.26,{f,vol:0.5,a:0.0008}); K.tone(0,0.14,{f:f*1.5,vol:0.3,a:0.0008}); K.tone(0.035,0.2,{f:f*2,vol:0.16,a:0.0008}); K.click(0,{f:6000,vol:0.2,dur:0.004}); }},
  heal:{dur:0.6,n:2,vol:0.2,gap:0.1,rev:0.25,f:(K,v,R)=>{ [523.3,659.3,784,1046.5].forEach((f,i)=>K.tone(i*0.035,0.4,{f,vol:0.3,a:0.006})); K.noise(0.05,0.25,{type:'highpass',f:5500,vol:0.08,a:0.03}); }},
  pick:{dur:0.75,n:2,vol:0.22,gap:0.08,rev:0.25,f:(K,v,R)=>{ [659.3,830.6,987.8,1318.5].forEach((f,i)=>{ K.tone(i*0.055,0.32,{type:'triangle',f,vol:0.35,a:0.004}); K.tone(i*0.055,0.4,{f:f*2,vol:0.12,a:0.004}); }); K.noise(0.2,0.3,{type:'highpass',f:6000,vol:0.07,a:0.04}); }},
  buy:{dur:0.45,n:3,vol:0.28,gap:0.08,rev:0.12,f:(K,v,R)=>{ K.noise(0,0.07,{type:'lowpass',f:500,vol:0.5,col:'brown'}); for(let i=0;i<4;i++){ const t=0.02+i*0.04+R()*0.03, f=1800+R()*900; K.tone(t,0.18,{f,vol:0.35,a:0.0008}); K.tone(t,0.1,{f:f*1.5,vol:0.18,a:0.0008}); } }},
  relic:{dur:1.4,n:2,vol:0.22,gap:0.2,rev:0.45,f:(K,v,R)=>{ [220,329.6,440,554.4].forEach((f,i)=>K.tone(i*0.04,1.0,{type:'triangle',f,vol:0.22,a:0.06})); K.bell(0.05,1760,[1,1.5,2.0],{vol:0.12,dec:0.9}); K.noise(0,0.8,{type:'highpass',f:5000,vol:0.06,a:0.2}); }},
  chime:{dur:0.5,n:1,vol:0.3,gap:0,pv:0,rev:0.25,f:(K,v,R)=>{ K.bell(0,523.25,[1,2.0,3.0,4.16],{vol:0.35,dec:0.45,decK:0.6}); }},
  clear:{dur:0.9,n:1,vol:0.22,gap:0.5,pv:0,rev:0.3,f:(K,v,R)=>{ [523.3,659.3,784,1046.5].forEach((f,i)=>K.tone(i*0.07,0.5,{type:'triangle',f,vol:0.3,a:0.005})); K.bell(0.28,2093,[1,2.0],{vol:0.12,dec:0.5}); }},
  banish:{dur:0.6,n:1,vol:0.26,gap:0.2,rev:0.3,f:(K,v,R)=>{ K.noise(0,0.05,{type:'bandpass',f:400,f2:180,sweep:0.32,Q:2,vol:0.9,a:0.3}); K.tone(0.3,0.25,{f:160,f2:50,vol:0.7}); }},
  // Explosionen und Einschläge
  boom:{dur:1.1,n:3,vol:0.5,gap:0.06,pri:1,rev:0.3,f:(K,v,R)=>{ K.tone(0,0.5,{f:85+R()*20,f2:26,vol:1,a:0.002}); K.noise(0,0.65,{type:'lowpass',f:2600,f2:170,sweep:0.55,Q:0.7,vol:0.95,a:0.002,col:'pink'});
    K.noise(0,0.9,{type:'lowpass',f:320,vol:0.5,a:0.01,col:'brown'}); for(let i=0;i<14;i++) K.noise(0.03+R()*0.6,0.004+R()*0.008,{type:'highpass',f:2400+R()*2000,vol:0.35*R()*(1-i/16),a:0.0004}); K.click(0,{f:800,vol:0.6,dur:0.02}); }},
  bigboom:{dur:2.3,n:1,vol:0.72,gap:0.5,pri:1,rev:0.45,f:(K,v,R)=>{ K.tone(0,1.1,{f:70,f2:20,vol:1,a:0.002}); K.noise(0,1.4,{type:'lowpass',f:3000,f2:120,sweep:1.2,vol:1,a:0.002,col:'pink'}); K.noise(0,2.0,{type:'lowpass',f:220,vol:0.6,a:0.02,col:'brown'});
    for(let i=0;i<30;i++) K.noise(0.05+R()*1.4,0.005+R()*0.01,{type:'highpass',f:2000+R()*3000,vol:0.3*R(),a:0.0004}); K.click(0,{f:600,vol:0.8,dur:0.03}); }},
  slam:{dur:0.75,n:3,vol:0.56,gap:0.08,pri:1,rev:0.25,f:(K,v,R)=>{ K.tone(0,0.32,{f:68+R()*10,f2:28,vol:1,a:0.002}); K.noise(0,0.38,{type:'lowpass',f:950,f2:220,Q:0.8,vol:0.85,a:0.002,col:'brown'}); K.click(0,{f:900,vol:0.7,dur:0.02});
    for(let i=0;i<6;i++) K.noise(0.02+R()*0.35,0.014,{type:'bandpass',f:1000+R()*1300,Q:4,vol:0.45*R()}); }},
  pop:{dur:0.3,n:3,vol:0.42,gap:0.05,rev:0.2,f:(K,v,R)=>{ K.tone(0,0.15,{f:140,f2:45,vol:1}); K.noise(0,0.18,{type:'lowpass',f:1800,f2:300,vol:0.8,col:'pink'}); K.click(0,{f:1500,vol:0.6}); }},
  beam:{dur:0.6,n:2,vol:0.36,gap:0.1,rev:0.25,f:(K,v,R)=>{ const car=K.c.createOscillator(), lp=K.filt('lowpass',2500,3), g=K.gain(0); car.type='sawtooth'; K.ramp(car.frequency,0,1400,180,0.4); K.env(g.gain,0,0.005,0.5,0.45);
    car.connect(lp); lp.connect(g); g.connect(K.out); car.start(0); car.stop(0.55); K.noise(0,0.45,{type:'bandpass',f:3000,f2:600,Q:2,vol:0.5,a:0.005}); K.tone(0,0.2,{f:90,f2:40,vol:0.6}); }},
  // Gegner greifen an
  eshot:{dur:0.2,n:3,vol:0.2,gap:0.09,rev:0.08,f:(K,v,R)=>{ const f0=230+R()*40, lp=K.filt('lowpass',2400,4); K.ramp(lp.frequency,0,2600,600,0.12); lp.connect(K.out); K.tone(0,0.14,{type:'sawtooth',f:f0,vol:0.5,a:0.001,to:lp}); K.noise(0.015,0.08,{type:'highpass',f:2800,vol:0.15}); }},
  emagic:{dur:0.26,n:3,vol:0.15,gap:0.09,rev:0.15,f:(K,v,R)=>{ const f=480+R()*120; K.tone(0,0.18,{f,f2:f*1.6,vol:0.5,a:0.006,vib:[22,f*0.05]}); K.noise(0,0.12,{type:'bandpass',f:2500,Q:2,vol:0.18,a:0.01}); }},
  efire:{dur:0.3,n:3,vol:0.2,gap:0.1,rev:0.1,f:(K,v,R)=>{ K.noise(0,0.2,{type:'bandpass',f:300,f2:1300,sweep:0.15,Q:0.9,vol:0.9,a:0.02}); for(let i=0;i<5;i++) K.noise(R()*0.2,0.004,{type:'highpass',f:3000,vol:0.4*R()}); }},
  erock:{dur:0.3,n:2,vol:0.2,gap:0.12,rev:0.1,f:(K,v,R)=>{ K.noise(0,0.18,{type:'bandpass',f:260,f2:700,Q:1.2,vol:0.8,a:0.02,col:'pink'}); K.tone(0,0.08,{f:100,f2:60,vol:0.4}); }},
  ewet:{dur:0.25,n:2,vol:0.15,gap:0.1,rev:0.08,f:(K,v,R)=>{ const lp=K.filt('lowpass',900,7); K.ramp(lp.frequency,0,1200,300,0.15); lp.connect(K.out); K.noise(0,0.15,{type:'lowpass',f:3000,vol:0.9,to:lp}); }},
  growl:{dur:0.5,n:2,vol:0.38,gap:0.4,rev:0.12,f:(K,v,R)=>{ const f=85+R()*15; K.voice(0,0.42,{f:f*0.9,f2:f*1.15,sweepK:0.6,vol:0.9,a:0.05,formants:[[480,1],[820,0.7],[2200,0.2]],Q:5,vib:[30,10]}); }},
  spawn:{dur:0.6,n:3,vol:0.18,gap:0.25,rev:0.3,f:(K,v,R)=>{ K.noise(0,0.04,{type:'bandpass',f:280,f2:1100,sweep:0.42,Q:3,vol:0.8,a:0.42}); K.tone(0,0.06,{f:55,f2:110,sweep:0.42,vol:0.35,a:0.4}); K.noise(0.43,0.12,{type:'highpass',f:5000,vol:0.15}); }},
  // Bosse, Warnungen, Arena
  boss:{dur:3.0,n:1,vol:0.52,gap:0.5,pri:1,rev:0.5,f:(K,v,R)=>{ K.bell(0,72,[1,1.48,2.06,2.78,3.6,4.92],{vol:0.6,dec:2.4,decK:0.8,volK:0.8}); K.click(0,{f:400,vol:0.5,dur:0.03});
    const lp=K.filt('lowpass',380,1); lp.connect(K.out); K.tone(0.05,1.6,{type:'sawtooth',f:55,vol:0.35,a:0.35,to:lp}); K.tone(0.05,1.6,{type:'sawtooth',f:82.4,vol:0.25,a:0.4,to:lp}); }},
  warn:{dur:0.32,n:1,vol:0.36,gap:0.3,pri:1,pv:0,rev:0.15,f:(K,v,R)=>{ K.bell(0,1320,[1,2.76],{vol:0.4,dec:0.1}); K.bell(0.12,1320,[1,2.76],{vol:0.35,dec:0.12}); }},
  heart:{dur:0.4,n:1,vol:0.46,gap:0.5,pv:0,rev:0,pri:1,f:(K,v,R)=>{ const lp=K.filt('lowpass',180,0.7); lp.connect(K.out); K.tone(0,0.12,{f:62,f2:40,vol:1,a:0.004,to:lp}); K.tone(0.17,0.1,{f:55,f2:38,vol:0.7,a:0.004,to:lp}); }},
  thunder:{dur:3.2,n:2,vol:0.55,gap:1,pri:1,rev:0.2,f:(K,v,R)=>{ K.noise(0,0.12,{type:'highpass',f:500,vol:0.8,a:0.002}); K.noise(0.02,0.35,{type:'lowpass',f:2500,f2:400,vol:0.7,a:0.005,col:'pink'});
    const g=K.gain(1); g.connect(K.out); K.lfo(g.gain,2.5+R()*2,0.45,0,3.2); K.noise(0.05,2.8,{type:'lowpass',f:240,vol:1,a:0.08,col:'brown',to:g}); }},
  cheer:{dur:2.2,n:2,vol:0.3,gap:0.8,rev:0.3,f:(K,v,R)=>{ for(let i=0;i<14;i++){ const g=K.gain(1); g.connect(K.out); K.lfo(g.gain,3+R()*7,0.5,0,2.2);
      K.noise(R()*0.4,1.2+R()*0.5,{type:'bandpass',f:500+R()*1900,Q:3+R()*3,vol:0.35,a:0.25+R()*0.2,col:'pink',to:g}); }
    for(let i=0;i<2;i++){ const f=1700+R()*500; K.tone(0.2+R()*0.6,0.35,{f,f2:f*1.35,sweep:0.25,vol:0.12,a:0.03,vib:[6,25]}); } }},
  // Fähigkeiten der Helden
  skill_krieger:{dur:0.8,n:1,vol:0.42,gap:0.3,pri:1,rev:0.2,f:(K,v,R)=>{ K.bell(0,1650,[1,1.47,2.09,2.71,3.4],{vol:0.25,dec:0.6}); K.noise(0,0.42,{type:'bandpass',f:380,f2:2600,sweep:0.35,Q:1.2,vol:0.9,a:0.06}); K.noise(0,0.5,{type:'lowpass',f:400,vol:0.5,a:0.1,col:'brown'}); }},
  skill_magier:{dur:1.2,n:1,vol:0.38,gap:0.3,pri:1,rev:0.4,f:(K,v,R)=>{ K.tone(0,0.45,{f:110,f2:34,vol:0.9,a:0.003}); K.noise(0,0.7,{type:'bandpass',f:2400,f2:500,sweep:0.6,Q:1,vol:0.5,a:0.01});
    for(let i=0;i<26;i++) K.noise(R()*0.6,0.004+R()*0.006,{type:'highpass',f:4000+R()*5000,vol:0.6*R(),a:0.0004}); for(let i=0;i<7;i++) K.bell(R()*0.3,2000+R()*3500,[1,1.41],{vol:0.12,dec:0.3+R()*0.4}); }},
  skill_jaegerin:{dur:0.75,n:1,vol:0.4,gap:0.3,pri:1,rev:0.15,f:(K,v,R)=>{ for(let i=0;i<7;i++){ const t=i*0.03+R()*0.015, lp=K.filt('lowpass',3000,4); K.ramp(lp.frequency,t,3200,700,0.14); lp.connect(K.out); K.tone(t,0.16,{type:'sawtooth',f:170+R()*70,vol:0.35,a:0.001,to:lp}); }
    K.noise(0.05,0.4,{type:'bandpass',f:600,f2:3200,sweep:0.35,Q:1,vol:0.6,a:0.08}); }},
  skill_nekro:{dur:1.4,n:1,vol:0.42,gap:0.3,pri:1,rev:0.5,f:(K,v,R)=>{ [110,130.8,164.8].forEach((f,i)=>{ K.voice(0.02*i,1.1,{f,vol:0.5,a:0.28,formants:[[480,1],[880,0.5],[2400,0.15]],Q:6,det:i*6}); K.voice(0.02*i,1.1,{f:f*1.004,vol:0.35,a:0.3,formants:[[480,1],[880,0.5]],Q:6}); });
    K.noise(0,1.0,{type:'lowpass',f:140,vol:0.7,a:0.2,col:'brown'}); for(let i=0;i<4;i++) K.noise(0.3+R()*0.6,0.012,{type:'bandpass',f:2000+R()*1200,Q:6,vol:0.35}); }},
  skill_paladin:{dur:1.6,n:1,vol:0.42,gap:0.3,pri:1,rev:0.5,f:(K,v,R)=>{ [523.3,659.3,784,1046.5].forEach((f,i)=>K.bell(i*0.02,f,[1,2.0,3.01,4.1],{vol:0.25,dec:1.2,decK:0.55}));
    [261.6,329.6,392].forEach(f=>K.voice(0.05,1.1,{f,vol:0.22,a:0.15,formants:[[750,1],[1150,0.6],[2800,0.2]],Q:7})); K.noise(0,0.9,{type:'highpass',f:5500,vol:0.1,a:0.15}); }},
  skill_alchi:{dur:1.1,n:1,vol:0.5,gap:0.3,pri:1,rev:0.25,f:(K,v,R)=>{ for(let i=0;i<16;i++) K.tone(R()*0.9,0.04+R()*0.03,{f:200+R()*350,f2:550+R()*700,vol:0.35,a:0.003});
    K.bell(0,2400,[1,1.5],{vol:0.2,dec:0.15}); const g=K.gain(1); g.connect(K.out); K.lfo(g.gain,6,0.5,0,1.1); K.noise(0,0.9,{type:'bandpass',f:300,f2:900,sweep:0.5,Q:2,vol:0.6,a:0.15,to:g}); }},
  skill_berserk:{dur:0.6,n:1,vol:0.44,gap:0.3,pri:1,rev:0.15,f:(K,v,R)=>{ const dr=K.drive(4); K.voice(0,0.4,{f:150,peak:1.25,f2:120,vol:0.9,a:0.02,formants:[[700,1],[1150,0.8],[2600,0.3]],Q:5,vib:[28,12],to:dr});
    K.noise(0.05,0.3,{type:'bandpass',f:300,f2:2000,sweep:0.28,Q:1.2,vol:0.6,a:0.05}); }},
};
// Brüllen je Boss (Tonhöhe aus ROAR): verzerrte Stimme mit Knurren, Atem und Unterton
for(const [k,p] of Object.entries(ROAR)) SDEF['roar_'+k]={dur:2.0,n:1,vol:0.42,gap:0.5,pri:1,pv:0.02,rev:0.4,f:(K,v,R)=>{ const f=92*p, sq=Math.sqrt(p), lp=K.filt('lowpass',2800,0.8); lp.connect(K.out); const dr=K.drive(3,lp);
  K.voice(0,1.6,{f:f*0.8,peak:1.35,f2:f*0.55,vol:1,a:0.14,formants:[[480*sq,1],[950*sq,0.8],[2400,0.3]],Q:4,vib:[26,f*0.12],to:dr});
  K.tone(0,1.5,{type:'square',f:f*0.5,f2:f*0.3,vol:0.25,a:0.12,to:dr}); K.noise(0,1.5,{type:'bandpass',f:900*sq,Q:0.9,vol:0.5,a:0.1,col:'pink',to:lp}); }};

/* ---------- Backen: Klänge der Reihe nach rendern, normalisieren, zwischendurch Luft lassen ---------- */
function sndRender(oc){ return new Promise((res,rej)=>{ oc.oncomplete=e=>res(e.renderedBuffer); try{ const p=oc.startRendering(); if(p&&p.then) p.then(res,rej); }catch(e){ rej(e); } }); }
async function sndBake(){
  if(SB.busy||SB.ready) return; const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext; if(!OAC) return; SB.busy=true;
  try{ sndNoise(new OAC(1,64,SR_BAKE)); }catch(e){ SB.busy=false; return; }
  for(const [name,D] of Object.entries(SDEF)){ const L=SB.buf[name]=SB.buf[name]||[];
    for(let v=L.length; v<(D.n||3); v++){
      try{ const oc=new OAC(1,Math.ceil(D.dur*SR_BAKE),SR_BAKE), out=oc.createGain(), R=sRng(sHash(name)+v*7919+13); out.connect(oc.destination);
        D.f(sndKit(oc,out,R),v,R); const b=await sndRender(oc), d=b.getChannelData(0); let pk=0; for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(a>pk) pk=a; }
        if(pk>0 && isFinite(pk)){ const k=0.9/pk; for(let i=0;i<d.length;i++) d[i]*=k; const fade=Math.min(d.length,Math.floor(SR_BAKE*0.01)); for(let i=0;i<fade;i++) d[d.length-1-i]*=i/fade; L.push(b); SB.bytes+=d.length*4; } }
      catch(e){}
      await new Promise(r=>setTimeout(r,0)); } }
  SB.ready=true; SB.busy=false;
}

/* ---------- Abspielen: Ausgang mit Lautstärkeregler und Hall je Akt ---------- */
function sndInit(){
  if(!AC||SND.bus) return;
  SND.bus=AC.createGain(); SND.bus.gain.value=save.settings.sfxVol??0.8; SND.bus.connect(sfxOut());
  try{ SND.revIn=AC.createGain(); SND.rev=AC.createConvolver(); const wet=AC.createGain(); wet.gain.value=0.8; SND.revIn.connect(SND.rev); SND.rev.connect(wet); wet.connect(SND.bus); SND.act=-1; sndAct(typeof visAct==='function'&&run?visAct():1); }
  catch(e){ SND.revIn=null; }
  if(!SB.ready && !SB.busy) setTimeout(sndBake,0);
}
// Hall je Akt: Verliese eng und steinig, Krypta lang, Drachenhort warm, Himmelsturm weit und luftig
function sndAct(a){ if(!AC||!SND.rev||SND.act===a) return; SND.act=a;
  const T=[1.6,1.3,2.4,1.7,2.8][a]||1.6, sr=AC.sampleRate, len=Math.floor(sr*T), ir=AC.createBuffer(2,len,sr), r=sRng(a*101+7);
  for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); let lp=0;
    for(let i=0;i<len;i++){ const t=i/sr, cut=0.12+0.85*Math.exp(-t*(a===3?4:2.5)); lp+=cut*((r()*2-1)-lp); d[i]=lp*Math.exp(-t*6.9/T)*0.5*(t<0.012?t/0.012:1); }
    for(let k=0;k<7;k++){ const i=Math.floor(sr*(0.008+r()*0.06)); if(i<len) d[i]+=(r()<0.5?-1:1)*(0.45-k*0.05); } }
  SND.rev.buffer=ir; }
function setSfxVol(v){ save.settings.sfxVol=v; if(SND.bus) SND.bus.gain.setTargetAtTime(v,AC.currentTime,0.02); }

// sfx(name, {x, y, vol, rate, delay, pan}) – x/y in Spielwelt-Koordinaten: Stereo und Abschwächung außerhalb des Bildes
function sfx(name,o={}){
  if(!save.sound||!AC) return; if(!SND.bus) sndInit();
  const L=SB.buf[name], D=SDEF[name]; if(!D||!L||!L.length) return;
  const t0=AC.currentTime, at=t0+(o.delay||0);
  if(!o.delay){ if(t0-(SB.last[name]??-9)<(D.gap??0.04)) return; SB.last[name]=t0; }
  SB.voices=SB.voices.filter(e=>e>t0); if(SB.voices.length>=(FX()?26:14) && !D.pri) return;
  let vol=(D.vol??0.4)*(o.vol??1), pan=o.pan??0;
  if(o.x!==undefined && typeof CAM!=='undefined' && G){ const sx=(o.x-(CAM.cx||0))*VIEW_S, sy=(o.y-(CAM.cy||0))*VIEW_S;
    pan=Math.max(-1,Math.min(1,(sx/W)*2-1))*0.7; const off=Math.max(0,Math.abs(sx-W/2)-W/2,Math.abs(sy-H/2)-H/2); vol*=Math.max(0.35,1-off/(Math.max(W,H)*0.7)); }
  const s=AC.createBufferSource(); s.buffer=L[Math.floor(Math.random()*L.length)];
  const pr=(o.rate||1)*(1+(Math.random()*2-1)*(D.pv??0.05)); s.playbackRate.value=pr;
  const g=AC.createGain(); g.gain.value=vol; s.connect(g);
  if(pan && AC.createStereoPanner){ const p=AC.createStereoPanner(); p.pan.value=pan; g.connect(p); p.connect(SND.bus); } else g.connect(SND.bus);
  const rv=(D.rev??0.12)*(o.rev??1); if(rv>0.01 && SND.revIn && FX()){ const rg=AC.createGain(); rg.gain.value=rv*vol; s.connect(rg); rg.connect(SND.revIn); }
  s.start(at); SB.voices.push(at+s.buffer.duration/pr);
}

/* ---------- Spielfunktionen, die Klänge auswählen ---------- */
const DIE_SND={ skeleton:'die_bone', slime:'die_goo', shroom:'die_goo', worm:'die_goo', spiderling:'die_goo', bat:'die_bat', orc:'die_orc', shield:'die_orc',
  archer:'die_gob', shaman:'die_gob', kobold:'die_gob', cultist:'die_man', healer:'die_man', imp:'die_fire', whelp:'die_fire', magma:'die_fire',
  gargoyle:'die_stone', urchin:'die_stone', totem:'die_wood', mimic:'die_wood', hound:'die_spirit', wraith:'die_spirit', seraph:'die_holy' };
const ESHOT_SND={ arrow:'eshot', spike:'eshot', orb:'emagic', soul:'emagic', star:'emagic', fire:'efire', rock:'erock', web:'ewet', blood:'ewet' };
function deathSound(kind,x,y){ sfx(DIE_SND[kind]||'die_gob',{x,y}); }
function roar(kind){ if(AC) MUS.soft=AC.currentTime+1.6; sfx(SDEF['roar_'+kind]?'roar_'+kind:'boss'); }
function critSound(x,y){ sfx('crit',{x,y}); }
function coinSound(){ if(!G) return; G.coinN=(G.time-(G.coinLast||-9)<0.35)?Math.min(12,(G.coinN||0)+1):0; G.coinLast=G.time; sfx('coin',{rate:Math.pow(2,G.coinN/12)}); }
function comboSound(n){ const base=n>=50?7:n>=30?5:n>=20?4:0; [0,4,7,12].forEach((s,i)=>sfx('chime',{rate:Math.pow(2,(base+s)/12),delay:i*0.07,vol:0.9})); }
function uiClick(){ sfx('ui'); }
function warnSound(){ sfx('warn'); }
function heartbeat(){ sfx('heart'); }
function crowdSound(v){ sfx('cheer',{vol:v}); }
function thunder(v){ sfx('thunder',{vol:v}); }
