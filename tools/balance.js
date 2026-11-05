/* Balance-Simulation: Der Test-Bot spielt komplette Läufe mit jedem Helden (zufällige Wege und Upgrades,
   ohne Gottmodus) und gibt Siegquote, Todesursachen und Spielzeit aus.
   Aufruf: node tools/balance.js [Läufe pro Held] [Held …]   z. B.  node tools/balance.js 8 magier krieger */
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{
  const N=+process.argv[2]||6, only=process.argv.slice(3);
  const b=await chromium.launch(); const p=await b.newPage();
  await p.goto('file://'+path.resolve(__dirname,'..','index.html')); await p.waitForTimeout(300);
  const src=fs.readFileSync(path.resolve(__dirname,'..','tests','run-all.js'),'utf8'); await p.evaluate(src.match(/window\.__bot = function[\s\S]*?\n  \};/)[0]);
  const res=await p.evaluate(({N,only})=>{ const out={};
    for(const ch of Object.keys(CHARS).filter(c=>!only.length||only.includes(c))){ const o=out[ch]={wins:0,deaths:{},stuck:0,time:0};
      for(let n=0;n<N;n++){ for(const id in CHARS) save.unlocked[id]=true; save.tutDone=true; startRun(ch); let guard=0;
        while(run && guard++<250){
          if(state==='combat'){ const r=__bot(false,240); o.time+=r.frames/30;
            if(G&&G.over){ const k='Akt '+run.act+': '+(G.boss?BOSSES[G.boss.kind].name:(run.killer&&ENEMIES[run.killer]?ENEMIES[run.killer].name:'Kampf')); o.deaths[k]=(o.deaths[k]||0)+1; G.deathT=99; endRun(false); break; }
            if(state==='combat'){ o.stuck++; endRun(false); break; } continue; }
          if(run.won){ o.wins++; break; }
          const a=Object.keys(actions), q=s=>[...ui.querySelectorAll('[data-a='+s+']:not([disabled])')];
          if(a.includes('go') && ui.querySelector('.mapbox')){ const av=availNodes(); enterNode(av[Math.floor(Math.random()*av.length)]); }
          else if(a.includes('pick')){ const bs=q('pick'); actions.pick(bs[Math.floor(Math.random()*bs.length)].dataset.v); }
          else if(a.includes('evo')) actions.evo(q('evo')[0].dataset.v);
          else if(a.includes('relic')) actions.relic(q('relic')[0].dataset.v);
          else if(a.includes('opt')) actions.opt(q('opt')[0].dataset.v);
          else if(a.includes('heal')) actions.heal(); else if(a.includes('next')) actions.next(); else if(a.includes('leave')) actions.leave();
          else if(a.includes('claim')){ o.wins++; break; } else break; } } }
    return out; },{N,only});
  for(const [k,v] of Object.entries(res)) console.log(`${k.padEnd(9)} Siege ${v.wins}/${N}  Hänger ${v.stuck}  Ø ${Math.round(v.time/N)} s  Tode: ${Object.entries(v.deaths).sort((a,b)=>b[1]-a[1]).map(([d,n])=>d+' ×'+n).join(', ')}`);
  await b.close();
})();
