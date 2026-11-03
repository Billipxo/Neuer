// Automatische Tests für „Arena der Verdammten“.
// Startet das Spiel in einem Headless-Chromium und prüft Kernabläufe per simuliertem Spiel.
// Aufruf: npm test   (oder: node tests/run-all.js [name …] für einzelne Tests)
const path = require('path');
const { chromium, devices } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

// Bot-Hilfen, die im Browser laufen
const BOT = `
  window.__bot = function(god, maxSec){
    let f=0; const melee=CHARS[P.cid].range<100;
    while(state==='combat' && G && !G.over && f<30*maxSec){
      const n=nearestEnemy(P,9999);
      if(n){ const a=angTo(P,n), d=dist(P,n), s=d<(melee?50:200)?-1:1; input.jx=Math.cos(a+0.6)*s; input.jy=Math.sin(a+0.6)*s; } else { input.jx=input.jy=0; }
      if(P.skillT<=0) useSkill();
      if(G.eproj.some(p=>Math.hypot(p.x-P.x,p.y-P.y)<45) || G.hazards.some(h=>h.t>h.delay*0.7 && Math.hypot(h.x-P.x,h.y-P.y)<(h.r||200))) useDash();
      if(god) P.hp=P.maxHp; G.stop=0; update(1/30); f++;
    }
    return {frames:f, over:!!(G&&G.over), state};
  };`;

const tests = {
  async start(pg){ // Menü lädt, Lauf startet, erster Raum lässt sich spielen
    return pg.evaluate(()=>{ save.tutDone=true; startRun('krieger'); enterNode(availNodes()[0]); const r=__bot(true,120); return {ok: state==='ui' && !!document.querySelector('.reward-card'), ...r}; });
  },
  async heroes(pg){ // Jeder Held übersteht mit Gott-Modus einen ganzen Akt
    return pg.evaluate(()=>{ const out={};
      for(const ch of Object.keys(CHARS)){ for(const id in CHARS) save.unlocked[id]=true; save.tutDone=true; startRun(ch); let rooms=0, guard=0;
        while(run && run.act===1 && guard++<40){
          if(state==='combat'){ __bot(true,240); if(state==='combat') return {ok:false, hero:ch, stuck:G.type}; continue; }
          const a=Object.keys(actions);
          if(a.includes('go') && ui.querySelector('.mapbox')) { enterNode(availNodes()[0]); rooms++; }
          else if(a.includes('pick')) actions.pick(ui.querySelector('[data-a=pick]').dataset.v);
          else if(a.includes('evo')) actions.evo(ui.querySelector('[data-a=evo]').dataset.v);
          else if(a.includes('relic')) actions.relic(ui.querySelector('[data-a=relic]').dataset.v);
          else if(a.includes('opt')) actions.opt(ui.querySelector('[data-a=opt]:not([disabled])').dataset.v);
          else if(a.includes('next')) actions.next(); else if(a.includes('leave')) actions.leave(); else if(a.includes('heal')) actions.heal();
          else return {ok:false, hero:ch, actions:a}; }
        out[ch]=rooms; }
      return {ok:Object.values(out).every(n=>n>=6), rooms:out}; });
  },
  async upgrades(pg){ // Alle Upgrades und Synergien gleichzeitig für jeden Helden
    return pg.evaluate(()=>{ const syn={};
      for(const ch of Object.keys(CHARS)){ save.tutDone=true; startRun(ch);
        for(const u of UPGRADES){ if(u.only&&!u.only.includes(ch)) continue; for(let i=0;i<(u.max||2);i++) applyUpgrade(u); }
        syn[ch]=[run.syn.length, SYN.filter(s=>s.req.every(r=>!UPG[r].only||UPG[r].only.includes(ch))).length];
        run.evo=EVOS[ch].map(e=>e.id); run.p.furyMax=15; run.posId=run.map.rows[3][0].id; startCombat('elite'); __bot(true,60); useSkill(); __bot(true,30); }
      return {ok:Object.values(syn).every(([a,b])=>a===b), syn}; });
  },
  async events(pg){ // Jede Ereignis-Option lässt sich wählen
    return pg.evaluate(()=>{ let n=0;
      for(const ev of EVENTS){ const cnt=ev.opts({gold:999,p:{hp:100,maxHp:100},souls:0}).length;
        for(let i=0;i<cnt;i++){ startRun('krieger'); run.gold=200; run.posId=run.map.rows[2][0].id; run.seen=EVENTS.filter(e=>e!==ev).map(e=>e.id);
          showEvent(); actions.opt(String(i)); if(state==='combat') __bot(true,90); n++; } }
      return {ok:n>=18, options:n}; });
  },
  async enemies(pg){ // Jede Gegnerart lässt sich besiegen, ohne dass etwas hängen bleibt
    return pg.evaluate(()=>{ const out={};
      for(const k of Object.keys(ENEMIES)){ save.tutDone=true; startRun('krieger'); run.act=3; run.map=genMap(3); run.posId=run.map.rows[3][0].id;
        startCombat('fight',[[{kind:k},{kind:k},{kind:k}]]); const r=__bot(true,120); out[k]=state!=='combat'; if(state==='combat'){ endRun(false); } }
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async bosses(pg){ // Alle Bosse aller vier Akte lassen sich besiegen
    return pg.evaluate(()=>{ const out={};
      for(const [act,kinds] of ACTS.map((A,i)=>[i+1,A.bosses])) for(const k of kinds){
        startRun('magier'); for(const u of UPGRADES) if(!u.only||u.only.includes('magier')) applyUpgrade(u);
        run.act=act; run.map=genMap(act); run.map.bossKind=k; run.posId=run.map.boss.id; startCombat('boss'); const r=__bot(true,240);
        out[k]=state!=='combat'; }
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async daily(pg){ // Tagesherausforderung ist deterministisch
    return pg.evaluate(()=>{ const key=todayKey(), sig=()=>JSON.stringify(run.map.rows.map(r=>r.map(n=>n.type)));
      startRun(dailyInfo(key).cid,{daily:key}); const a=sig(); startRun(dailyInfo(key).cid,{daily:key}); const b=sig();
      return {ok:a===b && !!run.mod}; });
  },
  async saves(pg){ // Spielstände, Sicherungscode, Neues Spiel+
    return pg.evaluate(()=>{ save.souls=1234; persist(); const code=exportCode();
      showSlots(); actions.new('1'); const fresh=save.souls; actions.load('0'); const back=save.souls;
      let bad=false; try{ parseCode(code.slice(0,-12)); }catch(e){ bad=true; }
      const d=parseCode(code);
      startRun('krieger',{ng:2}); run.posId=run.map.rows[0][0].id; startCombat('fight'); __bot(true,3); const e=G.enemies[0]||G.spawnQ[0];
      return {ok: fresh===0 && back===1234 && bad && d.souls===1234 && run.ng===2, slots:[fresh,back]}; });
  },
  async resume(pg){ // Unterbrochene Läufe: Kampfraum startet neu, offene Belohnung bleibt erhalten
    return pg.evaluate(()=>{ save.tutDone=true; startRun('jaegerin'); showMap(); const id=availNodes()[0]; enterNode(id); const hp=P.hp;
      saveNow(); const s1=readSlot(slotIdx).run; run=null; G=null; state='menu';
      run=s1; resumeRun(); const r1=state==='combat' && run.posId===id && G && G.type===run.room;
      __bot(true,240); const pendMode=run&&run.pend&&run.pend.mode; saveNow(); const s2=readSlot(slotIdx).run; run=s2; resumeRun();
      const r2=!!ui.querySelector('[data-a=pick]')||!!ui.querySelector('[data-a=next]');
      (actions.skip||actions.next)(); const r3=!run.pend && !!ui.querySelector('.mapbox');
      return {ok:r1&&!!pendMode&&r2&&r3, r1, pendMode, r2, r3}; });
  },
  async menus(pg){ // Jeder Bildschirm lässt sich fehlerfrei öffnen (auch für ganz neue Spielstände)
    return pg.evaluate(()=>{ const bad=[]; const tryS=(n,f)=>{ try{ f(); if(!ui.innerHTML.length) bad.push(n+': leer'); }catch(e){ bad.push(n+': '+e.message); } };
      const keep=save; save=defSave(); tryS('menu-neu',showMenu); save=keep; save.runs=Math.max(1,save.runs);
      for(const [n,f] of Object.entries({showMenu,showChars,showDaily,showForge,showAch,showBeast,showScores,showSettings,showSlots,showHelp,showChallenges})) tryS(n,f);
      tryS('codex',()=>showCodex(showMenu)); tryS('codex-evo',()=>showCodex(showMenu,'evo')); tryS('tiers',()=>showTiers(showMenu));
      save.tutDone=true; startRun('alchi'); tryS('map',showMap); tryS('runmenu',showRunMenu); tryS('runstats',showRunStats); tryS('rest',showRest); tryS('shop',()=>showShop()); tryS('evo',()=>showEvo(showMap)); tryS('bounty',()=>showBounty('gold',showMap)); tryS('event',showEvent); tryS('treasure',showTreasure); tryS('relicpick',()=>showRelicPick(showMap)); tryS('codex-rel',()=>showCodex(showMenu,'rel')); tryS('codex-lore',()=>showCodex(showMenu,'lore'));
      return {ok:!bad.length, bad}; });
  },
  async meta(pg){ // Verdammnis-Stufen, Herausforderungen, Wochenprüfung, Kopfgelder und Teilen
    return pg.evaluate(()=>{ const out={};
      save.tutDone=true; save.tierWon={krieger:9}; startRun('krieger',{tier:10}); out.tier=run.tier===10;
      run.posId=run.map.rows[2][0].id; const e10=makeEnemy('slime',100,100,false); run.tier=0; const e0=makeEnemy('slime',100,100,false); out.hp=e10.maxHp>e0.maxHp*1.15;
      startRun('jaegerin',{challenge:'ch_cursed'}); out.chal=!!run.upg.c_hex && !!run.upg.c_greed && !run.map.rows.some(r=>r.some(n=>n.type==='shop'));
      out.merge=runMod().nm.includes('+');
      const wk=weekKey(); startRun(weeklyInfo(wk).cid,{daily:wk}); out.week=Array.isArray(run.mods)&&run.mods.length===2&&!!runMod();
      run.posId=run.map.rows[1][0].id; startCombat('fight'); __bot(true,60); run.act=2; endRun(false); out.hist=!!save.dailyHist[wk];
      out.share=shareText(wk,save.dailyHist[wk],'Test').includes('Arena der Verdammten');
      out.bounty=bountyList(todayKey()).length===3; save.lore={}; unlockLore('b_golem'); out.lore=!!save.lore.b_golem && heroLine('paladin','boss').length>3; out.am=arenaMasterLine().length>10;
      startRun('krieger',{challenge:'ch_nodash'}); run.posId=run.map.rows[1][0].id; startCombat('fight'); useDash(); out.nodash=P.dashT<=0 && $('dashBtn').style.display==='none'; endRun(false);
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async relics(pg){ // Alle Relikte gleichzeitig, Schatzraum, Händler, doppeltes Ausweichen
    return pg.evaluate(()=>{ const out={}; save.tutDone=true; startRun('krieger'); for(const r of RELICS) gainRelic(r.id); out.all=run.relics.length===RELICS.length;
      run.posId=run.map.rows[2][0].id; startCombat('elite'); for(let i=0;i<20;i++) update(1/30); useDash(); const c1=P.dashChg; for(let i=0;i<6;i++) update(1/30); useDash(); out.feather=c1===1 && P.dashT>0;
      __bot(true,90); out.combat=state!=='combat';
      startRun('magier'); run.posId=run.map.rows[2][0].id; showTreasure(); out.treasure=!!ui.querySelector('[data-a=relic]'); actions.relic(ui.querySelector('[data-a=relic]').dataset.v); out.got=run.relics.length===1;
      run.gold=999; showShop(); out.shop=!!ui.querySelector('[data-a=brel]'); actions.brel(); out.bought=run.relics.length===2;
      startRun('paladin'); run.posId=run.map.rows[3][0].id; startCombat('elite'); let champ=false; for(let i=0;i<30*90 && state==='combat';i++){ __bot(true,0.2); if(G&&G.champ) champ=true; }
      out.champ=champ; if(ui.querySelector('[data-a=pick]')) actions.pick(ui.querySelector('[data-a=pick]').dataset.v); out.champRelic=!!ui.querySelector('[data-a=relic]');
      const th=seeded('x',()=>{ let n=0; for(let i=0;i<40;i++){ run.act=2; run.posId=run.map.rows[3][0].id; run.seed='t'+i; const w=buildWaves('fight'); if(w.theme) n++; } return n; }); out.themes=th>0;
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async roomchal(pg){ // Raum-Herausforderungen: Scheitern, Erfolg, Belohnung
    return pg.evaluate(()=>{ const out={}; save.tutDone=true; startRun('krieger'); run.posId=run.map.rows[2][0].id;
      startCombat('fight'); G.rc={...ROOM_CHAL[0],failed:false,done:true}; P.inv=0; hurtPlayer(10,null); out.nohitFail=G.rc.failed;
      G.rc={...ROOM_CHAL.find(r=>r.id==='combo'),failed:false,done:false}; for(let i=0;i<16;i++){ const e=makeEnemy('slime',100,100); G.enemies.push(e); killEnemy(e); } out.combo=G.rc.done;
      const g0=run.gold; G.rc={...ROOM_CHAL[0],failed:false,done:true}; const m=rcReward(G.rc,'normal'); out.gold=run.gold>g0 && m==='normal';
      const m2=rcReward({...ROOM_CHAL.find(r=>r.id==='speed'),failed:false,done:true},'normal'); out.rare=m2==='rare';
      let seen=0; for(let i=0;i<30;i++){ run.seed='rc'+i; run.posId=run.map.rows[2][0].id; startCombat('fight'); if(G.rc) seen++; } out.offered=seen>0;
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async pets(pg){ // Jeder Begleiter folgt, hilft und verursacht keine Fehler
    return pg.evaluate(()=>{ const out={}; save.tutDone=true; save.pets={raven:1,cat:1,wisp:1,wolf:1};
      for(const id of ['raven','cat','wisp','wolf']){ save.pet=id; startRun('jaegerin'); run.posId=run.map.rows[2][0].id; startCombat('fight',[[{kind:'slime'}]]);
        for(let i=0;i<40;i++) update(1/30); const e=G.enemies[0]; e.x=P.x+90; e.y=P.y; e.hp=e.maxHp=1e6; P.atkSpd=0.0001; P.atkT=999;
        P.hp=P.maxHp*0.5; const hp0=P.hp;
        for(let i=0;i<30*8 && state==='combat';i++){ e.freeze=9; e.x=P.x+90; e.y=P.y; update(1/30); }
        out[id]=id==='raven'||id==='wolf'?(run.dmgBy||{}).pet>0:id==='wisp'?P.hp>hp0:run.p.crit>0.09; if(state==='combat') endRun(false); }
      save.pet=null; startRun('krieger',{daily:todayKey()}); out.noDaily=!run.pet;
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async aim(pg){ // Fähigkeit per Wischgeste zielen: Ziehen nach links setzt den Kessel links vom Helden ab
    await pg.evaluate(()=>{ save.tutDone=true; startRun('alchi'); run.posId=run.map.rows[1][0].id; startCombat('fight',[[{kind:'slime'}]]); P.skillT=0; for(let i=0;i<5;i++) update(1/30); });
    const b=await pg.locator('#skillBtn').boundingBox(); const cx=b.x+b.width/2, cy=b.y+b.height/2;
    await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx-60,cy,{steps:4}); await pg.mouse.move(cx-110,cy,{steps:4});
    const mid=await pg.evaluate(()=>!!P.aim); await pg.mouse.up();
    return pg.evaluate(mid=>{ const v=P.vortex; return {ok: mid && !!v && v.x<P.x-60 && Math.abs(v.y-P.y)<40 && !P.aim, mid, v:v&&[Math.round(v.x),Math.round(P.x)]}; },mid);
  },
  async act4(pg){ // Vierter Akt: Karte, Himmelswächter, Sieg erst nach Akt 4
    return pg.evaluate(()=>{ const out={}; save.tutDone=true; startRun('krieger'); run.act=3; nextAct(); out.act=run.act===4 && visAct()===4 && actOf(4).name==='Der Himmelsturm';
      out.pool=enemyPool(4,3).includes('seraph') && !enemyPool(3,3).includes('seraph');
      run.posId=run.map.rows[2][0].id; startCombat('fight',[[{kind:'seraph'},{kind:'seraph'}]]); let beam=false; for(let i=0;i<30*12 && state==='combat';i++){ __bot(true,0.1); if(G&&G.hazards.some(h=>h.type==='line')) beam=true; } out.beam=beam;
      out.song=!!SONGS2.fight4 && !!SONGS2.calm4 && !!WEATHER_POOL[4];
      startRun('paladin'); run.act=3; run.map=genMap(3); run.posId=run.map.boss.id; startCombat('boss'); __bot(true,240);
      for(let g=0; g<5 && state!=='combat' && !ui.querySelector('.mapbox'); g++){ const a=Object.keys(actions); if(a.includes('pick')) actions.pick(ui.querySelector('[data-a=pick]').dataset.v); else if(a.includes('evo')) actions.evo(ui.querySelector('[data-a=evo]').dataset.v); else break; }
      out.notWonAfter3=!run.won && run.act===4;
      return {ok:Object.values(out).every(Boolean), out}; });
  },
  async music(pg){ // Musik-Engine spielt alle Stücke inklusive B-Teil fehlerfrei
    await pg.mouse.click(10,10);
    return pg.evaluate(()=>{ audio(); if(!AC) return {ok:true, skipped:'kein Audio'}; let n=0;
      for(const k in SONGS2) for(let st=0;st<256;st++){ playStep(st,AC.currentTime+5+st*0.01,SONGS2[k],0.01); n++; }
      return {ok:n===256*Object.keys(SONGS2).length, steps:n}; });
  },
};

(async()=>{
  const only=process.argv.slice(2), names=Object.keys(tests).filter(n=>!only.length||only.includes(n));
  const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  let failed=0;
  for(const name of names){
    const ctx=await browser.newContext({...devices['iPhone 13']}), pg=await ctx.newPage(), errs=[];
    pg.on('pageerror',e=>errs.push(e.message));
    const t0=Date.now();
    try{
      await pg.goto(URL); await pg.waitForTimeout(300); await pg.evaluate(BOT);
      const res=await tests[name](pg);
      const ok=res&&res.ok&&!errs.length;
      console.log(`${ok?'✔':'✘'} ${name} (${((Date.now()-t0)/1000).toFixed(1)} s)`, (process.env.VERBOSE||!ok)?JSON.stringify(res):'', errs.length?'\n  Fehler: '+errs.slice(0,3).join('\n  '):'');
      if(!ok) failed++;
    }catch(e){ failed++; console.log(`✘ ${name}: ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  await browser.close();
  console.log(failed?`\n${failed} Test(s) fehlgeschlagen`:`\nAlle ${names.length} Tests bestanden`);
  process.exit(failed?1:0);
})();
