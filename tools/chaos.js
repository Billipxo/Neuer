/* Chaos-Test: Der Bot spielt komplette Läufe (Gottmodus), zeichnet dabei, drückt in Menüs zufällige Knöpfe,
   pausiert, ändert Einstellungen, nutzt Fähigkeiten mit Zielen – und meldet jeden Laufzeitfehler mit Stelle.
   Aufruf: node tools/chaos.js [Läufe] [Sekunden-Limit]     z. B. node tools/chaos.js 6 600 */
const {chromium,devices}=require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{
  const RUNS=+process.argv[2]||4, LIMIT=(+process.argv[3]||400)*1000, t0=Date.now();
  const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' | '+(e.stack||'').split('\n').slice(1,3).join(' ')));
  await p.goto('file://'+path.resolve(__dirname,'..','index.html')); await p.waitForTimeout(300);
  const src=fs.readFileSync(path.resolve(__dirname,'..','tests','run-all.js'),'utf8'); await p.evaluate(src.match(/window\.__bot = function[\s\S]*?\n  \};/)[0]);
  const log=[];
  for(let n=0;n<RUNS && Date.now()-t0<LIMIT;n++){
    const r=await p.evaluate(n=>{
      const heroes=Object.keys(CHARS), cid=heroes[n%heroes.length], BAD=['reset','del','quit','yes','imp','copy','exp','slots','load','new','ren','share'];
      for(const id in CHARS) save.unlocked[id]=true; save.tutDone=true; save.souls=5000; save.pets={raven:1,cat:1,wisp:1,wolf:1}; save.pet=PETS[n%4].id; save.tierWon=save.tierWon||{};
      const opts=n%5===3?{challenge:CHALLENGES[n%CHALLENGES.length].id}:n%5===4?{daily:n%2?todayKey():weekKey()}:{tier:n%3};
      startRun(cid,opts); let steps=0, rooms=0, menus=0;
      const pressRandom=()=>{ const bs=[...ui.querySelectorAll('[data-a]:not([disabled])')].filter(x=>!BAD.includes(x.dataset.a));
        if(!bs.length) return false; const prefer=bs.filter(x=>['go','pick','relic','evo','opt','next','leave','heal','train','purge','rm','endless','ngp','claim','again','upg','brel','buy','potion','skip','banm','ban','reroll','idol','back'].includes(x.dataset.a));
        const list=prefer.length&&Math.random()<0.85?prefer:bs; const el=list[Math.floor(Math.random()*list.length)]; el.click(); menus++; return true; };
      while(steps++<400 && run && !run.ended){
        if(state==='combat'||state==='paused'){ if(state==='paused'){ actions.resume&&actions.resume(); }
          let f=0; while(state==='combat' && G && !G.over && f<30*200){ const nn=nearestEnemy(P,9999);
            if(nn){ const a=angTo(P,nn), d=dist(P,nn), s=d<120?-1:1; input.jx=Math.cos(a+0.6)*s; input.jy=Math.sin(a+0.6)*s; } else { input.jx=input.jy=0; }
            if(Math.random()<0.02) useSkill(Math.random()<0.5?{a:Math.random()*6.28,k:Math.random()}:undefined);
            if(Math.random()<0.03) useDash();
            if(Math.random()<0.002){ pauseGame(); draw(); actions.resume(); }
            P.hp=P.maxHp; G.stop=0; update(1/30); if(G && state==='combat'){ if(f%6===0) draw(); updHud(); } f++; }
          if(state==='combat'){ return {cid, stuck:G&&G.type, act:run.act, rooms, en:G.enemies.map(e=>e.kind+(e.champ?'*':'')+':'+Math.round(e.hp)+':'+Math.round(e.x)+','+Math.round(e.y)+':st'+e.st+(e.alpha!==undefined?':a'+(+e.alpha).toFixed(2):'')+(e.under?':U':'')+(e.stone?':S':'')+(los(P,e)?'':':noLOS')).join(' '), q:G.spawnQ.length, w:G.waveIdx+'/'+G.waves.length, P:[Math.round(P.x),Math.round(P.y)]}; } rooms++; continue; }
        if(Math.random()<0.03){ showSettings(); const tg=[...ui.querySelectorAll('[data-a=tg],[data-a=speed],[data-a=dmg],[data-a=shake],[data-a=fps]')]; if(tg.length) tg[Math.floor(Math.random()*tg.length)].click(); actions.back(); }
        if(!pressRandom()) break;
        if(state==='menu'){ if(save.run && Math.random()<0.95){ run=save.run; resumeRun(); } else break; }
        if(run && run.won && run.act>=ACT_N+1) { if(actions.claim) actions.claim(); break; }
      }
      return {cid, opts:JSON.stringify(opts), act:run&&run.act, won:!!(run&&run.won), rooms, menus, state};
    },n).catch(e=>({evalError:e.message.split('\n').slice(0,4).join(' / ')}));
    log.push(r); console.log(JSON.stringify(r)); if(errs.length) break;
  }
  console.log(errs.length?'\nFEHLER:\n'+[...new Set(errs)].join('\n'):'\nKeine Laufzeitfehler.');
  await b.close(); process.exit(errs.length?1:0);
})();
