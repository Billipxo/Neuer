'use strict';
/* Arena der Verdammten – Karte, Erfolge, Menüs, Händler, Lagerfeuer, Ereignisse und Upgrades */

/* ---------------- KARTE ---------------- */
function genMap(act){
  const R=6, rows=[];
  for(let r=0;r<R;r++){
    const n = r===0 ? randi(2,3) : r===R-1 ? randi(2,3) : randi(2,4), row=[];
    for(let i=0;i<n;i++) row.push({ id:act+'_'+r+'_'+i, row:r, x:(i+1)/(n+1)+rand(-0.035,0.035), type:'fight', next:[] });
    rows.push(row);
  }
  for(let r=1;r<R;r++) for(const nd of rows[r]){
    nd.type = r===R-1 ? wpick([['rest',55],['shop',45]]) :
      wpick([['fight',38],['elite',r>=2?17:0],['shop',r>=2?10:5],['rest',r>=2?9:0],['treasure',r>=1?7:0],['event',r>=1?14:0]]);
  }
  if(!rows.slice(1,R-1).some(rw=>rw.some(n=>n.type==='shop'))) pick(rows[3]).type='shop';
  if(!rows.slice(2,R-1).some(rw=>rw.some(n=>n.type==='elite'))) pick(rows[2]).type='elite';
  for(let r=0;r<R-1;r++){
    const a=rows[r], b=rows[r+1];
    a.forEach((nd,i)=>{
      const j = a.length===1 ? 0 : Math.round(i*(b.length-1)/(a.length-1));
      nd.next.push(b[j].id);
      if(RNG()<0.45){ const j2=clamp(j+(RNG()<0.5?-1:1),0,b.length-1); if(!nd.next.includes(b[j2].id)) nd.next.push(b[j2].id); }
    });
    b.forEach((nb,j)=>{ if(!a.some(n=>n.next.includes(nb.id))){ let best=a[0]; for(const n of a) if(Math.abs(n.x-nb.x)<Math.abs(best.x-nb.x)) best=n; best.next.push(nb.id); } });
  }
  for(const rw of rows) for(const nd of rw) if(nd.type==='fight' && nd.row>0) nd.rw=wpick([['up',58],['rare',16],['gold',14],['heal',12]]);
  const boss={ id:act+'_boss', row:R, x:0.5, type:'boss', next:[] };
  rows[R-1].forEach(n=>n.next.push(boss.id));
  return { rows, boss, R, bossKind:pick(actOf(act).bosses) };
}
function allNodes(){ return [...run.map.rows.flat(), run.map.boss]; }
function nodeById(id){ return allNodes().find(n=>n.id===id); }
function availNodes(){ if(!run.posId) return run.map.rows[0].map(n=>n.id); return nodeById(run.posId).next; }

/* ---------------- ERFOLGE & SKINS ---------------- */
const SKINS={
  krieger:{ base:{nm:'Standard',cape:'#3f6fc4',body:'#9aa6b8',trim:'#c9d2de',hat:'#b8c2d0',hat2:'#8a94a4',plume:'#c8423a',belt:'#6b4a2a'},
    gold:{nm:'Goldene Rüstung',ach:'first_win',cape:'#7a1a1a',body:'#d9a840',trim:'#ffe08a',hat:'#e6b450',hat2:'#b8862a',plume:'#ffffff'},
    black:{nm:'Schwarzer Ritter',ach:'no_hit',cape:'#1a1a22',body:'#3a3a46',trim:'#6a6a7a',hat:'#2a2a34',hat2:'#1a1a22',plume:'#8a1020'} },
  magier:{ base:{nm:'Standard',cape:'#7d48c9',body:'#5a3290',trim:'#e6b450',hat:'#4a2680',hat2:'#e6b450',collar:'#e8e0f0'},
    arch:{nm:'Erzmagierin',ach:'all_syn',cape:'#e6e0f0',body:'#2a3a8a',trim:'#e6b450',hat:'#1a2a6a',hat2:'#ffe08a'},
    frost:{nm:'Frostmagierin',ach:'all_bosses',cape:'#9fd8ff',body:'#3a6a9a',trim:'#e0f4ff',hat:'#2a5a8a',hat2:'#ffffff'} },
  jaegerin:{ base:{nm:'Standard',cape:'#3b8f55',body:'#6b4a2a',trim:'#2f6b40',hat:'#2f6b40',hat2:'#8a6a3a'},
    shadow:{nm:'Schattenjägerin',ach:'kills',cape:'#2a2030',body:'#1a1418',trim:'#5a3a6a',hat:'#2a2030',hat2:'#3a2a3a'},
    autumn:{nm:'Herbstläuferin',ach:'elites',cape:'#c8602a',body:'#6b3a1a',trim:'#e0a030',hat:'#a84a1a',hat2:'#8a5a2a'} },
  nekro:{ base:{nm:'Standard',cape:'#2a7d6c',body:'#1c2a28',trim:'#5affd0',hat:'#14201e',skin:'#d9dcd6',eye:'#5affd0'},
    lich:{nm:'Lichgestalt',ach:'endless',cape:'#3a2a5a',body:'#1a1428',trim:'#c49cf0',hat:'#2a1a40',skin:'#b8c8d0',eye:'#c49cf0'},
    bone:{nm:'Knochenkönigin',ach:'daily',cape:'#d8d0b8',body:'#3a3428',trim:'#ffe08a',hat:'#e8e2d0',skin:'#e8e2d0',eye:'#ff4a3a'} },
  paladin:{ base:{nm:'Standard',cape:'#f0e8d8',body:'#d9a840',trim:'#fff0b0',hat:'#e6b450',hat2:'#b8862a',belt:'#6b4a2a',hair:'#e8c860'},
    dark:{nm:'Dunkler Kreuzritter',ach:'no_hit',cape:'#2a1a22',body:'#5a4a5a',trim:'#c84a4a',hat:'#4a3a4a',hat2:'#2a1a22',hair:'#2a1a14'},
    sun:{nm:'Sonnenwächter',ach:'first_win',cape:'#ff9a3a',body:'#f4f0e0',trim:'#ffd04a',hat:'#ffffff',hat2:'#ffd04a',hair:'#c8642a'} },
  alchi:{ base:{nm:'Standard',cape:'#4a7a2a',body:'#6b8a3a',trim:'#e6c870',hat:'#8a5a2a',apron:'#c8b088',hair:'#9a4ac8'},
    toxic:{nm:'Giftmischerin',ach:'kills',cape:'#2a2a3a',body:'#3a5a2a',trim:'#8dff6a',hat:'#1a1a22',apron:'#5a5a4a',hair:'#8dff6a'},
    royal:{nm:'Hofalchemistin',ach:'all_syn',cape:'#7a1a3a',body:'#a03a5a',trim:'#ffd04a',hat:'#5a1a2a',apron:'#f0e0c0',hair:'#f4e0b0'} },
  berserk:{ base:{nm:'Standard',cape:'#7a5a3a',body:'#8a2a22',trim:'#d8c8a8',hat:'#9aa0aa',hat2:'#e8e0c8',hair:'#c8402a',paint:'#3a6ac8'},
    frost:{nm:'Frostbringerin',ach:'all_bosses',cape:'#e8f0f8',body:'#3a6a9a',trim:'#ffffff',hat:'#c8d8e8',hat2:'#ffffff',hair:'#f0f4f8',paint:'#2a4a8a'},
    ash:{nm:'Aschekriegerin',ach:'elites',cape:'#2a2220',body:'#3a2a26',trim:'#ff7a2a',hat:'#4a4040',hat2:'#2a2020',hair:'#1a1414',paint:'#ff5a1a'} },
};
const SKIN_PRICE=400;
function skinOwned(cid,k){ const sk=SKINS[cid][k]; return k==='base' || !!save.ach[sk.ach] || !!(save.skinBought||{})[cid+':'+k]; }
function skinOf(cid){ const S=SKINS[cid]; return Object.assign({skin:'#f1c9a0',eye:'#2a1a14'},S.base,S[(save.skin||{})[cid]]||{}); }
const ST=()=>save.stats;
const ACH=[
  { id:'first_win', ic:'🐉', nm:'Bezwinger', ds:'Gewinne einen Lauf', souls:100, ok:()=>ST().anyWin },
  { id:'no_hit', ic:'🛡️', nm:'Unberührbar', ds:'Besiege einen Boss, ohne getroffen zu werden', souls:80, ok:()=>ST().noHitBoss },
  { id:'all_syn', ic:'💠', nm:'Alchemist', ds:'Entdecke 5 Synergien', souls:80, prog:()=>[ST().syns.length,5] },
  { id:'all_bosses', ic:'👑', nm:'Bossjäger', ds:'Besiege alle 7 Bosse', souls:120, prog:()=>[ST().bosses.length,Object.keys(BOSSES).length] },
  { id:'kills', ic:'⚔️', nm:'Schlächter', ds:'Besiege insgesamt 1.000 Gegner', souls:60, prog:()=>[ST().kills,1000] },
  { id:'elites', ic:'💀', nm:'Elitejäger', ds:'Besiege insgesamt 40 Elitegegner', souls:60, prog:()=>[ST().elites,40] },
  { id:'endless', ic:'♾️', nm:'Unendlich', ds:'Erreiche Akt 6 im Endlosmodus', souls:150, prog:()=>[Math.min(6,ST().maxEndless),6] },
  { id:'daily', ic:'📅', nm:'Tagwerk', ds:'Gewinne eine Tägliche Herausforderung', souls:100, ok:()=>ST().dailyWin },
  { id:'all_heroes', ic:'🎖️', nm:'Meister aller Klassen', ds:'Gewinne mit jedem Helden', souls:200, prog:()=>[Object.keys(ST().wins).length,Object.keys(CHARS).length] },
  { id:'crowd', ic:'📣', nm:'Liebling der Massen', ds:'Bring die Menge 10-mal zum Toben', souls:50, prog:()=>[ST().cheers,10] },
  { id:'events', ic:'❓', nm:'Neugierig', ds:'Erlebe alle 8 Ereignisse', souls:50, prog:()=>[ST().events.length,8] },
  { id:'rich', ic:'💰', nm:'Goldrausch', ds:'Sammle 600 Gold in einem Lauf', souls:50, prog:()=>[Math.min(600,ST().maxGold),600] },
  { id:'combo', ic:'🔥', nm:'Kettenreaktion', ds:'Erreiche eine 30er-Kombo', souls:50, prog:()=>[Math.min(30,ST().maxCombo),30] },
  { id:'ng3', ic:'⚔️', nm:'Unbezwingbar', ds:'Gewinne einen Lauf auf NG+3', souls:150, prog:()=>[Math.min(4,save.ngMax||0),4] },
  { id:'bestiary', ic:'📖', nm:'Forscher', ds:'Vervollständige das Bestiarium', souls:120, prog:()=>[Object.keys(BEAST).filter(k=>save.stats.beast[k]).length,Object.keys(BEAST).length] },
  { id:'tier5', ic:'🔥', nm:'Tief in der Verdammnis', ds:'Gewinne mit einem Helden auf Verdammnis-Stufe 5', souls:150, prog:()=>[Math.max(0,...Object.values(save.tierWon||{0:0})),5] },
  { id:'tier10', ic:'☠️', nm:'Herr der Verdammnis', ds:'Gewinne auf Verdammnis-Stufe 10', souls:400, prog:()=>[Math.max(0,...Object.values(save.tierWon||{0:0})),10] },
  { id:'chal5', ic:'🏁', nm:'Prüfling', ds:'Bestehe 5 Herausforderungen', souls:120, prog:()=>[CHALLENGES.filter(c=>(save.chal||{})[c.id]).length,5] },
  { id:'streak7', ic:'📆', nm:'Treue Seele', ds:'Spiele 7 Tage in Folge die Tagesprüfung', souls:120, prog:()=>[Math.min(7,(save.streak||{}).best||0),7] },
  { id:'perfect', ic:'💨', nm:'Tänzer', ds:'Weiche 50-mal perfekt aus', souls:80, prog:()=>[Math.min(50,ST().perfect||0),50] },
  { id:'forge', ic:'⚒️', nm:'Meisterschmied', ds:'Bringe alle Schmiede-Upgrades auf die höchste Stufe', souls:0, prog:()=>[META.filter(m=>metaLvl(m.id)>=m.max).length,META.length] },
];
function achDone(a){ if(a.ok) return !!a.ok(); const [v,m]=a.prog(); return v>=m; }
function skinFor(id){ for(const cid in SKINS) for(const k in SKINS[cid]) if(SKINS[cid][k].ach===id) return {cid,k,nm:SKINS[cid][k].nm}; return null; }
function checkAch(){
  let any=false;
  for(const a of ACH){ if(save.ach[a.id] || !achDone(a)) continue;
    save.ach[a.id]=Date.now(); save.souls+=a.souls; any=true; const sk=skinFor(a.id);
    toast(`<span style="font-size:26px">${a.ic}</span><div><div class="eyebrow" style="color:var(--gold)">Erfolg freigeschaltet</div><b>${a.nm}</b><div class="sub" style="font-size:13px">${a.souls?'+'+a.souls+' 👻 ':''}${sk?'· Skin „'+sk.nm+'“ für '+CHARS[sk.cid].name:''}</div></div>`); }
  if(any){ persist(); sfx('pick'); }
}
const toastQ=[]; let toastBusy=false;
// Gegner-Hinweise, die nach dem Raum noch in der Schlange stehen, sind nicht mehr wichtig
function dropFoeToasts(){ for(let i=toastQ.length-1;i>=0;i--) if(toastQ[i].includes('data-foe')) toastQ.splice(i,1); }
function toast(html){ toastQ.push(html); if(!toastBusy) nextToast(); }
function nextToast(){ const t=$('toast'); if(!toastQ.length){ toastBusy=false; return; } toastBusy=true; t.innerHTML=toastQ.shift(); t.classList.add('show'); setTimeout(()=>{ t.classList.remove('show'); setTimeout(nextToast,400); },3200); }
function showAch(){
  const done=ACH.filter(a=>save.ach[a.id]).length; save.achSeen=Object.keys(save.ach).length; persist();
  render(`<div class="wrap"><div class="eyebrow">${done} von ${ACH.length} freigeschaltet</div><h2>Erfolge</h2>
    <div class="cards">${ACH.map(a=>{ const d=!!save.ach[a.id], sk=skinFor(a.id), pr=a.prog?a.prog():null;
      return `<div class="card ${d?'epic':''}" style="${d?'':'opacity:.75'}"><div class="ic">${d?a.ic:'🔒'}</div><div class="body"><div class="nm">${a.nm}</div><div class="ds">${a.ds}</div>
        ${pr&&!d?`<div class="lvl" style="margin-top:6px"><div style="flex:1;height:6px;background:#0008;border:1px solid var(--iron);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(100,pr[0]/pr[1]*100)}%;background:var(--soul)"></div></div></div><div class="ds" style="font-size:12px">${Math.min(pr[0],pr[1])} / ${pr[1]}</div>`:''}
        <div class="ds" style="color:var(--gold);font-size:13px">Belohnung: ${a.souls?a.souls+' 👻':''}${a.souls&&sk?' + ':''}${sk?'Skin „'+sk.nm+'“ ('+CHARS[sk.cid].name+')':''}${!a.souls&&!sk?'Ruhm und Ehre':''}</div></div></div>`; }).join('')}</div>
    <button class="btn" data-a="back">Zurück</button></div>`,{ back:showMenu });
}

/* ---------------- UI ---------------- */
const ui=$('ui'); let actions={};
ui.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; audio(); uiClick();
  const fn=actions[b.dataset.a]; if(fn) fn(b.dataset.v);
});
function render(html, acts, dim=false){
  actions=acts||{}; ui.innerHTML=html; if(html.includes('data-port')) fillPortraits(ui); ui.classList.remove('hidden'); ui.classList.toggle('dim',dim); ui.scrollTop=0;
  $('hud').classList.add('hidden'); navDecorate(); navAfterRender();
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CREST=`<svg class="crest" viewBox="0 0 120 120" aria-hidden="true">
 <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4cf7a"/><stop offset="1" stop-color="#9a6b22"/></linearGradient></defs>
 <path d="M60 8 L102 22 L98 66 C94 90 78 104 60 112 C42 104 26 90 22 66 L18 22 Z" fill="#2b2230" stroke="url(#cg)" stroke-width="5"/>
 <g stroke="#d9dee8" stroke-width="5" stroke-linecap="round"><line x1="38" y1="36" x2="84" y2="88"/><line x1="82" y1="36" x2="36" y2="88"/></g>
 <g stroke="url(#cg)" stroke-width="6" stroke-linecap="round"><line x1="30" y1="44" x2="46" y2="28"/><line x1="90" y1="44" x2="74" y2="28"/></g>
 <circle cx="60" cy="62" r="9" fill="#c8423a" stroke="url(#cg)" stroke-width="3"/></svg>`;

const badge=(on,txt)=>on?`<span class="badge">${txt}</span>`:'';
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const STANDALONE=(()=>{ try{ return matchMedia('(display-mode: standalone)').matches || navigator.standalone===true; }catch(e){ return false; } })();
function showMenu(){
  state='menu'; run=null; G=null;
  const hasRun=!!save.run;
  const newAch=Math.max(0,Object.keys(save.ach).length-(save.achSeen||0));
  const newBeast=Math.max(0,Object.keys(save.stats.beast).length-(save.beastSeen||0));
  const forgeAff=META.some(m=>metaLvl(m.id)<m.max && save.souls>=m.cost(metaLvl(m.id)));
  const heroBuyable=Object.entries(CHARS).some(([id,c])=>!save.unlocked[id]&&save.souls>=c.cost);
  const dailyOpen=!((save.dailyHist||{})[todayKey()]);
  const veteran=save.runs>0, chalNew=CHALLENGES.some((c,i)=>chalOpen(i)&&!chalDone(c.id))&&!save.chalSeen;
  render(`<div class="wrap">
    <div class="title-block">${CREST}
      <div class="eyebrow">Ein Roguelike in vier Akten</div>
      <h1>Arena der<br>Verdammten</h1>
      <p class="sub">Kämpfe dich durch Verliese, Krypta, Drachenhort und Himmelsturm. Jeder Lauf ist anders.</p>
      <span class="pill s">👻 ${save.souls} Seelen</span>
    </div>
    ${IOS && !STANDALONE && !save.settings.iosTip?`<div class="tip">📱 <div><b>Tipp fürs iPhone:</b> Tippe in Safari auf „Teilen“ und dann „Zum Home-Bildschirm“. Dann läuft das Spiel im Vollbild wie eine App, und deine Spielstände bleiben sicher gespeichert. <button class="linkbtn" data-a="tipok">Verstanden</button></div></div>`:''}
    ${veteran && backupDue() && !(IOS && !STANDALONE && !save.settings.iosTip)?`<div class="tip">💾 <div><b>Sichere deinen Fortschritt.</b> ${save.bkAt?'Deine letzte Sicherung ist '+Math.floor((Date.now()-save.bkAt)/864e5)+' Tage her.':'Du hast deinen Spielstand noch nie gesichert.'} Er liegt nur in diesem Browser${IOS&&!STANDALONE?', und Safari löscht Daten von Webseiten, die 7 Tage nicht geöffnet werden':''}. Als Link oder Datei nimmst du ihn auch auf ein anderes Gerät mit.
      <div class="row" style="margin-top:8px;gap:6px"><button class="btn small primary" data-a="backup">Jetzt sichern</button><button class="btn small" data-a="bklater">Später</button></div></div></div>`:''}
    ${arenaMasterHtml()}
    <div class="menu-btns">
      ${hasRun?`<button class="btn primary stack" data-a="cont">▶ Lauf fortsetzen<span class="sub" style="font-size:13px;color:#f0dcb0">${CHARS[save.run.cid].icon} Akt ${save.run.act}</span></button>`:''}
      <button class="btn ${hasRun?'':'primary'}" data-a="play">⚔️ Neues Abenteuer${badge(heroBuyable,'Held')}</button>
      ${veteran?`<button class="btn" data-a="daily">📅 Tages- und Wochenprüfung${badge(dailyOpen,'Heute')}</button>
      <button class="btn" data-a="chal">🏁 Herausforderungen${badge(chalNew,'Neu')}</button>`:''}
      ${veteran?`<div class="tiles">`:'<div class="tiles" style="display:none">'}
        <button class="btn tile" data-a="forge"><span class="ti">⚒️</span>Schmiede${badge(forgeAff,'!')}</button>
        <button class="btn tile" data-a="ach"><span class="ti">🏅</span>Erfolge${badge(newAch,newAch)}</button>
        <button class="btn tile" data-a="beast"><span class="ti">📖</span>Bestiarium${badge(newBeast,newBeast)}</button>
        <button class="btn tile" data-a="scores"><span class="ti">🏆</span>Ruhmeshalle</button>
        <button class="btn tile" data-a="codex"><span class="ti">📚</span>Kodex</button>
        <button class="btn tile" data-a="tiers"><span class="ti">🔥</span>Verdammnis</button>
      </div>
      ${veteran?bountyHtml():`<p class="sub center" style="font-size:14px">Nach deinem ersten Lauf öffnen sich Schmiede, Prüfungen, Herausforderungen und mehr.</p>`}
    </div>
    <div class="foot">
      <button class="linkbtn" data-a="help">Anleitung</button>
      <button class="linkbtn" data-a="settings">Einstellungen</button>
      <button class="linkbtn" data-a="slots">💾 ${esc(save.name||'Spielstand')}</button>
      ${INSTALL_EV?'<button class="linkbtn" data-a="install">📲 Als App installieren</button>':''}
      <span>Läufe: ${save.runs}</span>
    </div></div>`,
  { play:showChars, daily:showDaily, forge:showForge, scores:showScores, ach:showAch, beast:showBeast, help:showHelp, codex:()=>showCodex(showMenu), tiers:()=>showTiers(showMenu), chal:()=>{ save.chalSeen=true; persist(); showChallenges(); },
    cont:()=>{ run=save.run; resumeRun(); },
    settings:showSettings, slots:showSlots, tipok:()=>{ save.settings.iosTip=true; persist(); showMenu(); },
    backup:()=>showBackup(showMenu), bklater:()=>{ save.bkSnooze=Date.now(); persist(); showMenu(); },
    install:()=>{ const ev=INSTALL_EV; if(!ev) return; try{ ev.prompt(); (ev.userChoice||Promise.resolve()).then(()=>{ INSTALL_EV=null; if(state==='menu') showMenu(); }); }catch(e){ INSTALL_EV=null; showMenu(); } } });
}

function showSettings(){
  const st=save.settings;
  const tg=(key,label,on,desc)=>`<button class="toggle ${on?'on':''}" data-a="tg" data-v="${key}" aria-pressed="${on}"><span><b>${label}</b><br><span class="sub" style="font-size:13px">${desc}</span></span><span class="sw"></span></button>`;
  const cy=(act,label,val,desc)=>`<button class="toggle on" data-a="${act}"><span><b>${label}: ${val}</b><br><span class="sub" style="font-size:13px">${desc}</span></span><span class="pill">Ändern</span></button>`;
  const shakeTxt=!st.shake?'Aus':(st.shakeAmt??1)<1?'Schwach':'Normal';
  const dmgTxt=st.dmgOff?'Aus':st.dmgNums?'Alle':'Nur kritische';
  const asPct=Math.round((1-assistMul())*100);
  render(`<div class="wrap"><div class="eyebrow">Optionen</div><h2>Einstellungen</h2>
    <div class="eyebrow" style="margin-top:4px">Ton</div>
    <div class="cards">
      ${tg('sound','Soundeffekte',save.sound,'Treffer, Waffen, Gegner, Explosionen – mit Hall und Raumklang')}
      <label class="toggle" for="sfxVol" style="cursor:default"><span><b>Effektlautstärke</b></span><input type="range" id="sfxVol" min="0" max="1" step="0.05" value="${st.sfxVol??0.8}" style="flex:1;max-width:180px;accent-color:#e6b450"></label>
      ${tg('music','Musik',st.music,'Titelthema, Kartenmusik und Kampfthemen je Akt, Bossmusik')}
      <label class="toggle" for="musicVol" style="cursor:default"><span><b>Musiklautstärke</b></span><input type="range" id="musicVol" min="0" max="1" step="0.05" value="${st.musicVol??0.7}" style="flex:1;max-width:180px;accent-color:#e6b450"></label>
    </div>
    <div class="eyebrow" style="margin-top:8px">Spiel</div>
    <div class="cards">
      ${cy('speed','Spieltempo',{0.8:'Gemütlich (0,8×)',1:'Normal (1×)',1.2:'Schnell (1,2×)',1.5:'Turbo (1,5×)'}[st.gameSpeed||1]||'Normal','Wie schnell Kämpfe ablaufen. Musik und Menüs bleiben gleich.')}
      ${tg('assist','Hilfemodus',st.assist,st.assist?`Du nimmst ${asPct} % weniger Schaden. Jede Niederlage gibt 2 % mehr (höchstens 80 %). Läufe werden in der Ruhmeshalle mit 🕊️ markiert.`:'Weniger Schaden für alle, die die Geschichte erleben wollen. Wird mit jeder Niederlage etwas stärker.')}
      ${cy('dmg','Schadenszahlen',dmgTxt,'Zahlen über getroffenen Gegnern')}
    </div>
    <div class="eyebrow" style="margin-top:8px">Grafik und Akku</div>
    <div class="cards">
      <button class="toggle on" data-a="gfx"><span><b>Grafik: ${{auto:'Automatisch',high:'Hoch',low:'Niedrig'}[st.gfx||'auto']}</b><br><span class="sub" style="font-size:13px">${{auto:'Volle Grafik, schaltet bei Ruckeln selbst herunter'+(AUTO_LOW?' (gerade reduziert)':''),high:'Licht, Nebel, Funken, Kleintiere und alle Zuschauer – immer',low:'Ohne Licht und Partikel, weniger Zuschauer, geringere Auflösung'}[st.gfx||'auto']}</span></span><span class="pill">Ändern</span></button>
      ${cy('fps','Bildrate',(st.fpsCap||60)===30?'30 (Akku sparen)':'60 (flüssig)','30 Bilder pro Sekunde schonen den Akku deutlich, 60 laufen flüssiger.')}
      ${tg('showFps','Bildrate anzeigen',st.showFps,'Zeigt die Bilder pro Sekunde im Kampf an')}
      ${cy('fs','Vollbild',isFullscreen()?'An':'Aus','Das Spiel füllt den ganzen Bildschirm. Am PC auch mit der Taste F.')}
    </div>
    <div class="eyebrow" style="margin-top:8px">Steuerung</div>
    <div class="cards">
      ${tg('joyFixed','Fester Joystick',st.joyFixed,'Joystick an fester Stelle unten statt überall auf dem Bildschirm')}
      ${tg('lefty','Linkshänder-Modus',st.lefty,'Fähigkeit und Ausweichen links, Joystick rechts')}
      ${tg('vibrate','Vibration',st.vibrate,IOS?'Auf dem iPhone unterstützt der Browser leider keine Vibration':'Kurzes Vibrieren bei Treffern')}
      <button class="toggle on" data-a="keys"><span><b>🎮 Tasten und Controller</b><br><span class="sub" style="font-size:13px">Steuerung mit Maus und Tastatur, Controller oder Touch</span></span><span class="pill">Ansehen</span></button>
    </div>
    <div class="eyebrow" style="margin-top:8px">Barrierefreiheit</div>
    <div class="cards">
      ${cy('shake','Bildschirmwackeln',shakeTxt,'Bei Treffern und Explosionen')}
      ${tg('calm','Blitze abschwächen',st.calm,'Rote Treffer-Blitze, Gewitter und helle Effekte gedämpft')}
      ${tg('bigUi','Große Schrift und Knöpfe',st.bigUi,'Menüs, Texte und die Knöpfe im Kampf werden größer')}
      ${tg('plainFont','Schlichte Schrift',st.plainFont,'Klare, schnörkellose Buchstaben statt der altdeutschen Schrift')}
      ${tg('cb','Farbenblind-Modus',st.cb,'Warnkreise gelb-weiß gestrichelt, gegnerische Geschosse mit weißem Rand')}
    </div>
    <button class="btn" data-a="back">Zurück</button>
    <button class="btn danger" data-a="reset">Diesen Spielstand zurücksetzen</button></div>`,
  { back:()=>{ if(state==='paused'&&G){ showPause(); } else if(settingsBack) { const f=settingsBack; settingsBack=null; f(); } else showMenu(); },
    speed:()=>{ st.gameSpeed={0.8:1,1:1.2,1.2:1.5,1.5:0.8}[st.gameSpeed||1]||1; persist(); showSettings(); },
    dmg:()=>{ if(st.dmgOff){ st.dmgOff=false; st.dmgNums=true; } else if(st.dmgNums){ st.dmgNums=false; } else { st.dmgOff=true; } persist(); showSettings(); },
    shake:()=>{ if(!st.shake){ st.shake=true; st.shakeAmt=0.5; } else if((st.shakeAmt??1)<1){ st.shakeAmt=1; } else { st.shake=false; } persist(); showSettings(); },
    fps:()=>{ st.fpsCap=(st.fpsCap||60)===60?30:60; PERF.low=0; persist(); showSettings(); },
    fs:()=>{ toggleFullscreen(); setTimeout(()=>{ if(!ui.classList.contains('hidden') && ui.querySelector('[data-a=fs]')) showSettings(); },400); },
    keys:()=>showControls(showSettings),
    gfx:()=>{ st.gfx={auto:'high',high:'low',low:'auto'}[st.gfx||'auto']; AUTO_LOW=false; PERF.low=0; persist(); resize(); showSettings(); },
    tg:k=>{ if(k==='sound') save.sound=!save.sound; else st[k]=!st[k]; if(k==='assist'&&st.assist&&run) run.assist=true; persist(); applyBodyClasses(); if(typeof musicUpdate==='function') musicUpdate(); showSettings(); },
    reset:()=>render(`<div class="wrap" style="justify-content:center"><h2 class="center">Spielstand wirklich löschen?</h2>
      <p class="sub center">Seelen, Schmiede-Stufen, freigeschaltete Helden und die Ruhmeshalle werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
      <button class="btn danger" data-a="yes">Endgültig löschen</button><button class="btn" data-a="no">Abbrechen</button></div>`,
      { yes:()=>{ const keep=save.settings, snd=save.sound, nm=save.name; save=defSave(); save.settings=keep; save.sound=snd; save.name=nm; persist(); showMenu(); }, no:showSettings }) });
  const mv=$('musicVol'); if(mv) mv.addEventListener('input',e=>{ st.musicVol=+e.target.value; persist(); musicUpdate(); });
  const sv=$('sfxVol'); if(sv){ sv.addEventListener('input',e=>{ audio(); setSfxVol(+e.target.value); }); sv.addEventListener('change',()=>{ persist(); sfx('hit',{pan:0}); }); }
}
let settingsBack=null;
function applyBodyClasses(){ const st=save.settings; document.body.classList.toggle('lefty',!!st.lefty); document.body.classList.toggle('bigui',!!st.bigUi); document.body.classList.toggle('plainfont',!!st.plainFont); }
// Schrift für Zahlen und Texte auf der Spielfläche (folgt der Einstellung „Schlichte Schrift“)
const numFont=()=>save&&save.settings&&save.settings.plainFont?'"Alegreya Sans", sans-serif':'"Grenze", "Alegreya Sans", sans-serif';
/* Sicherungscode: der komplette Spielstand als Text zum Kopieren und Wiedereinfügen */
const SAVE_PREFIX='ARENA1:';
// Spielstand ohne Einstellungen (die gelten pro Gerät) und ohne flüchtige Kampfdaten
function saveJsonForExport(){ const d=JSON.parse(saveJson(save)); delete d.settings; return JSON.stringify(d); }
function exportCode(){ const json=saveJsonForExport();
  const b=btoa(unescape(encodeURIComponent(json))); return SAVE_PREFIX+b+':'+(hashStr(json)%100000); }
// findet den Code auch mitten in einem Text (Sicherungsdatei, weitergeleitete Nachricht)
function parseCode(txt){
  const t=String(txt||'').replace(/\s+/g,''), m=t.match(/ARENA1:([A-Za-z0-9+/=_-]+):(\d+)/);
  if(!m) throw new Error('Das ist kein Sicherungscode von Arena der Verdammten.');
  let b=m[1].replace(/-/g,'+').replace(/_/g,'/'); while(b.length%4) b+='='; const chk=m[2]; let json;
  try{ json=decodeURIComponent(escape(atob(b))); }catch(e){ throw new Error('Der Code ist unvollständig oder beschädigt. Kopiere ihn bitte noch einmal komplett.'); }
  if(String(hashStr(json)%100000)!==chk) throw new Error('Die Prüfsumme stimmt nicht. Der Code wurde beim Kopieren vermutlich abgeschnitten.');
  const d=JSON.parse(json); if(!d||typeof d!=='object'||typeof d.souls!=='number') throw new Error('Der Code enthält keinen gültigen Spielstand.');
  return migrate(d);
}

/* Spielstand als Link (gepackt, etwa 2 KB) und als Datei – zum Sichern und zum Mitnehmen auf ein anderes Gerät */
const PUBLIC_URL='https://billipxo.github.io/Neuer/';   // feste Adresse über GitHub Pages (.github/workflows/pages.yml)
function gameUrl(){ try{ const h=location.hostname; if(/^https?:$/.test(location.protocol) && (h.endsWith('github.io')||h==='localhost'||h==='127.0.0.1')) return location.origin+location.pathname.replace(/index\.html$/,''); }catch(e){} return PUBLIC_URL; }
const B64U={ enc:bytes=>{ const B=new Uint8Array(bytes); let s=''; for(let i=0;i<B.length;i+=0x8000) s+=String.fromCharCode.apply(null,B.subarray(i,i+0x8000)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  dec:str=>{ let s=str.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; const bin=atob(s), B=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) B[i]=bin.charCodeAt(i); return B; } };
async function exportLink(){
  const json=saveJsonForExport(), chk=hashStr(json)%100000; let pay;
  try{ if(typeof CompressionStream==='undefined') throw 0; const buf=await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(); pay='Z.'+B64U.enc(buf); }
  catch(e){ pay='B.'+B64U.enc(new TextEncoder().encode(json)); }
  return gameUrl()+'#spielstand='+pay+'.'+chk;
}
async function parseLink(txt){
  let t=String(txt||'').replace(/\s+/g,''); try{ t=decodeURIComponent(t); }catch(e){}
  const m=t.match(/spielstand=([ZB])\.([A-Za-z0-9_-]+)\.(\d+)/); if(!m) throw new Error('Das ist kein Spielstand-Link von Arena der Verdammten.');
  let bytes, json; try{ bytes=B64U.dec(m[2]); }catch(e){ throw new Error('Der Link ist unvollständig. Kopiere ihn bitte noch einmal komplett.'); }
  if(m[1]==='Z'){ if(typeof DecompressionStream==='undefined') throw new Error('Dieser Browser kann den Link nicht öffnen. Nimm bitte die Sicherungsdatei oder den Sicherungscode.');
    try{ json=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); }catch(e){ throw new Error('Der Link ist beschädigt. Kopiere ihn bitte noch einmal komplett.'); } }
  else json=new TextDecoder().decode(bytes);
  if(String(hashStr(json)%100000)!==m[3]) throw new Error('Die Prüfsumme stimmt nicht. Der Link wurde vermutlich abgeschnitten.');
  let d; try{ d=JSON.parse(json); }catch(e){ throw new Error('Der Link enthält keinen gültigen Spielstand.'); }
  if(!d||typeof d!=='object'||typeof d.souls!=='number') throw new Error('Der Link enthält keinen gültigen Spielstand.');
  return migrate(d);
}
// Code, Link oder Dateiinhalt – alles wird erkannt
async function parseAny(txt){ return /spielstand=/.test(String(txt||'')) ? parseLink(txt) : parseCode(txt); }
function markBackup(){ save.bkAt=Date.now(); save.bkRuns=save.runs; persist(); }
function backupDue(){ return save.runs-(save.bkRuns||0)>=3 && Date.now()-Math.max(save.bkAt||0,save.bkSnooze||0)>3*864e5; }
function backupFileText(){ return 'Arena der Verdammten – Spielstand „'+save.name+'“ vom '+new Date().toLocaleDateString('de-DE')+'\n'
  +'Laden: im Spiel unter „Spielstand sichern“ → „Sicherung laden“ → „Sicherungsdatei wählen“.\n\n'+exportCode()+'\n'; }
// In der Claude-Vorschau speichert nur die Downloads-Schnittstelle des Betrachters Dateien (der Browser-Download wird dort blockiert).
// ART_DL: undefined = normaler Browser, null = Vorschau ohne Speichern, sonst die Schnittstelle
let ART_DL;
try{ if(window.claude && typeof window.claude.use==='function'){ ART_DL=null; window.claude.use('downloads').then(d=>{ ART_DL=d||null; },()=>{ ART_DL=null; }); } }catch(e){}
async function downloadBackup(){
  const nm=String(save.name||'spielstand').toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-|-$/g,'')||'spielstand', file='arena-'+nm+'-'+new Date().toISOString().slice(0,10)+'.txt';
  if(ART_DL){ try{ await ART_DL.save({filename:file,data:backupFileText()}); markBackup(); return true; }catch(e){ return e&&e.code==='declined'?'declined':false; } }
  if(ART_DL===null) return false;
  try{ const url=URL.createObjectURL(new Blob([backupFileText()],{type:'text/plain;charset=utf-8'})), a=document.createElement('a');
    a.href=url; a.download=file; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1500);
    markBackup(); return true; }catch(e){ return false; }
}
async function shareLink(msg,copyOnly){
  const say=(t,ok)=>{ if(msg){ msg.textContent=t; msg.style.color=ok?'var(--gold)':'#ff8a80'; } };
  let url; try{ url=await exportLink(); }catch(e){ say('Der Link konnte nicht erstellt werden. Nimm bitte die Datei oder den Code.'); return; }
  if(!copyOnly && navigator.share){ try{ await navigator.share({title:'Arena der Verdammten – Spielstand',text:'Mein Spielstand „'+save.name+'“ – öffne den Link auf dem anderen Gerät:',url}); markBackup(); say('Link geteilt. Öffne ihn auf dem anderen Gerät.',true); return; }
    catch(e){ if(e&&e.name==='AbortError') return; } }
  const shown=()=>showLinkText(url);
  try{ navigator.clipboard.writeText(url).then(()=>{ markBackup(); say('Link kopiert. Schick ihn dir selbst, zum Beispiel per Nachricht oder E-Mail, und öffne ihn auf dem anderen Gerät.',true); },shown); }catch(e){ shown(); }
}
function showLinkText(url){ const back=actions.back;
  render(`<div class="wrap"><div class="eyebrow">Spielstand-Link</div><h2>Link kopieren</h2>
    <p class="sub">Kopieren klappt hier nicht automatisch. Markiere den Link und kopiere ihn von Hand.</p>
    <textarea id="lnk" readonly rows="6" style="width:100%;font:12px/1.4 ui-monospace,monospace;padding:10px;border-radius:8px;border:2px solid var(--iron);background:#0008;color:var(--parch);word-break:break-all">${esc(url)}</textarea>
    <button class="btn primary" data-a="ok">Erledigt</button></div>`,{ ok:()=>{ markBackup(); (back||showMenu)(); } },true);
  const ta=$('lnk'); try{ ta.focus(); ta.select(); }catch(e){} }
function showBackup(back){ back=back||showSlots;
  const ago=save.bkAt?Math.floor((Date.now()-save.bkAt)/864e5):-1, here=gameUrl()!==PUBLIC_URL;
  render(`<div class="wrap"><div class="eyebrow">${esc(save.name)}</div><h2>Spielstand sichern</h2>
    <p class="sub">Dein Fortschritt liegt nur in diesem Browser. Sichere ihn ab und zu – damit kannst du ihn wiederherstellen oder auf einem anderen Gerät weiterspielen, zum Beispiel erst am Handy und dann am PC.</p>
    ${IOS&&!STANDALONE?'<div class="tip">📱 <div><b>iPhone:</b> Safari löscht die Daten von Webseiten, die du 7 Tage lang nicht öffnest. Auf dem Home-Bildschirm passiert das nicht. Sichere deinen Spielstand trotzdem regelmäßig.</div></div>':''}
    <div class="sub" style="font-size:14px">${ago<0?'Noch nie gesichert.':ago===0?'Zuletzt heute gesichert.':'Zuletzt vor '+ago+(ago===1?' Tag':' Tagen')+' gesichert.'}</div>
    <button class="btn primary" data-a="link">🔗 Als Link teilen</button>
    <div class="sub" style="font-size:13px;margin-top:-4px">Schick den Link dir selbst, zum Beispiel per Nachricht oder E-Mail. Öffnest du ihn auf dem anderen Gerät, wird der Spielstand übernommen.</div>
    <button class="btn" data-a="copy">📋 Link kopieren</button>
    ${ART_DL===null?'':'<button class="btn" data-a="file">📄 Als Datei speichern</button>'}
    <button class="btn" data-a="imp">📥 Sicherung laden</button>
    <button class="btn" data-a="code">🔢 Sicherungscode anzeigen</button>
    <div class="sub" id="bkMsg" style="font-size:13px;min-height:18px"></div>
    ${here?'':`<div class="tip">🌐 <div>Das Spiel gibt es auch im Browser unter <b>${esc(PUBLIC_URL.replace(/^https:\/\//,'').replace(/\/$/,''))}</b>. Dort lässt es sich am Handy und am PC als App installieren.</div></div>`}
    <button class="btn" data-a="back">Zurück</button></div>`,
  { back, link:()=>shareLink($('bkMsg')), copy:()=>shareLink($('bkMsg'),true),
    file:()=>downloadBackup().then(ok=>{ const m=$('bkMsg'); if(!m) return; m.textContent=ok===true?'Datei gespeichert. Bewahre sie gut auf, zum Beispiel in deiner Cloud.':ok==='declined'?'Speichern abgebrochen.':'Speichern ist hier nicht möglich. Nimm bitte den Link oder den Code.'; m.style.color=ok===true?'var(--gold)':'#ff8a80'; }),
    code:()=>showExport(()=>showBackup(back)), imp:()=>showImport(null,()=>showBackup(back)) });
}
function showExport(back){ back=back||showSlots;
  const code=exportCode();
  render(`<div class="wrap"><div class="eyebrow">Sicherung · ${esc(save.name)}</div><h2>Sicherungscode</h2>
    <p class="sub">Kopiere diesen Code und bewahre ihn auf, zum Beispiel in einer Notiz oder Nachricht an dich selbst. Damit kannst du den Spielstand wiederherstellen oder auf ein anderes Gerät übertragen.</p>
    <textarea id="saveCode" readonly rows="7" style="width:100%;font:12px/1.4 ui-monospace,monospace;padding:10px;border-radius:8px;border:2px solid var(--iron);background:#0008;color:var(--parch);word-break:break-all">${code}</textarea>
    <div class="sub" style="font-size:13px" id="copyMsg">${(code.length/1024).toFixed(1)} KB · enthält Seelen, Helden, Erfolge, Rekorde und das laufende Abenteuer</div>
    <button class="btn primary" data-a="copy">📋 Code kopieren</button><button class="btn" data-a="back">Zurück</button></div>`,
  { back, copy:()=>{ const ta=$('saveCode'), msg=$('copyMsg');
      const ok=()=>{ markBackup(); msg.textContent='Kopiert! Bewahre den Code gut auf.'; msg.style.color='var(--gold)'; };
      const fb=()=>{ ta.focus(); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){ msg.textContent='Kopieren nicht möglich. Der Code ist markiert, bitte manuell kopieren.'; } };
      try{ navigator.clipboard.writeText(ta.value).then(ok,fb); }catch(e){ fb(); } } },true);
}
function showImport(err,back){ back=back||showSlots;
  render(`<div class="wrap"><div class="eyebrow">Wiederherstellen</div><h2>Sicherung laden</h2>
    <p class="sub">Füge deinen Sicherungscode oder Spielstand-Link ein, oder wähle eine Sicherungsdatei. Danach entscheidest du, auf welchem Platz er landet.</p>
    <form id="impForm" class="cards" style="grid-template-columns:1fr"><textarea id="impCode" rows="6" placeholder="Code (ARENA1:…) oder Link einfügen" style="width:100%;font:12px/1.4 ui-monospace,monospace;padding:10px;border-radius:8px;border:2px solid var(--gold);background:#0008;color:var(--parch);word-break:break-all"></textarea>
    ${err?`<div class="sub" style="color:#ff8a80">${esc(err)}</div>`:''}
    <button class="btn primary" type="submit">Weiter</button></form>
    <button class="btn" data-a="file">📄 Sicherungsdatei wählen</button><input type="file" id="impFile" accept=".txt,text/plain" style="display:none">
    <button class="btn" data-a="back">Abbrechen</button></div>`,{ back, file:()=>$('impFile').click() },true);
  const go=p=>p.then(d=>showImportTarget(d,back)).catch(ex=>showImport(ex.message,back));
  $('impForm').addEventListener('submit',e=>{ e.preventDefault(); go(parseAny($('impCode').value)); });
  $('impFile').addEventListener('change',e=>{ const f=e.target.files&&e.target.files[0]; if(f) go(f.text().then(parseAny)); });
}
// Zielplatz wählen: freie Plätze zuerst empfohlen, belegte werden überschrieben
function showImportTarget(d,back){ back=back||showMenu;
  const wins=s=>Object.keys((s.stats||{}).wins||{}).length, info=s=>`${s.souls} Seelen · ${s.runs} Läufe · ${wins(s)} Siege`;
  const slots=[...Array(SLOTS)].map((_,i)=>{ const s=i===slotIdx?save:readSlot(i); return {i,s,empty:!s||(!s.runs&&!s.souls)}; });
  const rec=(slots.find(x=>x.empty)||slots.find(x=>x.i===slotIdx)).i;
  render(`<div class="wrap"><div class="eyebrow">Sicherung gefunden</div><h2>Spielstand übernehmen?</h2>
    <div class="card"><div class="ic">💾</div><div class="body"><div class="nm">${esc(d.name||'Spielstand')}</div><div class="ds">${info(d)}${d.last?' · gespeichert am '+new Date(d.last).toLocaleDateString('de-DE'):''}</div></div></div>
    <p class="sub">Wähle den Platz. Ein belegter Platz wird dabei überschrieben.</p>
    ${slots.map(x=>`<button class="btn ${x.i===rec?'primary':''}" data-a="to" data-v="${x.i}">Platz ${x.i+1}: ${x.empty?'frei':'ersetzt „'+esc(x.s.name||'Spielstand')+'“ ('+x.s.runs+' Läufe)'}</button>`).join('')}
    <button class="btn" data-a="no">Abbrechen</button></div>`,
  { no:back, to:i=>{ i=+i; persist(); const keep=save.settings, snd=save.sound; slotIdx=i; save=d; save.settings=keep; save.sound=snd; save.bkAt=Date.now(); save.bkRuns=save.runs; persist(); applyBodyClasses();
      sfx('pick'); toast('<span style="font-size:26px">📥</span><div><b>Spielstand übernommen</b><div class="sub" style="font-size:13px">'+esc(save.name)+' · Platz '+(i+1)+' · '+save.souls+' Seelen</div></div>'); showMenu(); } },true);
}
// Spielstand-Link beim Start: #spielstand=… in der Adresse
function checkLinkImport(hash){ hash=hash===undefined?location.hash:hash; if(!/spielstand=/.test(hash||'')) return false;
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  parseLink(hash).then(d=>showImportTarget(d,showMenu)).catch(err=>toast('<span style="font-size:24px">⚠️</span><div><b>Spielstand-Link geht nicht</b><div class="sub" style="font-size:13px">'+esc(err.message)+'</div></div>'));
  return true; }
// „Als App installieren“ (Chrome, Edge, Android): der Browser bietet es an, der Knopf erscheint dann im Menü
let INSTALL_EV=null;
addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); INSTALL_EV=e; if(state==='menu' && ui.querySelector('.foot')) showMenu(); });
addEventListener('appinstalled',()=>{ INSTALL_EV=null; toast('<span style="font-size:24px">📲</span><div><b>Als App installiert</b><div class="sub" style="font-size:13px">Du findest das Spiel jetzt bei deinen Apps.</div></div>'); });
function showBeast(){
  const B=save.stats.beast, all=Object.keys(BEAST), found=all.filter(k=>B[k]).length; save.beastSeen=Object.keys(B).length; persist();
  const entry=k=>{ const isBoss=!!BOSSES[k], d=isBoss?BOSSES[k]:ENEMIES[k], n=B[k]||0;
    const where=isBoss?ACTS.findIndex(a=>a.bosses.includes(k)):(d.minAct||1)-1;
    return n?`<div class="card ${isBoss?'epic':''}"><div class="ic port">${isBoss?BEAST[k].ic:`<canvas data-port="foe:${k}" data-size="46"></canvas>`}</div><div class="body"><div class="rar">${isBoss?'Boss · ':''}${ACTS[Math.max(0,where)].name}</div><div class="nm">${esc(d.name)}</div><div class="ds">${BEAST[k].ds}</div><div class="ds" style="font-size:12px;color:var(--gold)">Besiegt: ${n}× ${(()=>{ const m=masteryOf(k), nx=MASTERY.find(x=>n<x[0]); return (m?`· ${m[2]} +${Math.round((m[1]-1)*100)} % Schaden`:'')+(nx?` · nächster Stern bei ${nx[0]}`:''); })()}</div></div></div>`
      :`<div class="card" style="opacity:.6"><div class="ic">❔</div><div class="body"><div class="rar">${isBoss?'Boss':'Gegner'}</div><div class="nm">???</div><div class="ds">Noch nicht besiegt.</div></div></div>`; };
  render(`<div class="wrap"><div class="eyebrow">${found} von ${all.length} entdeckt</div><h2>Bestiarium</h2>
    <div class="eyebrow">Gegner</div><div class="cards">${Object.keys(ENEMIES).filter(k=>BEAST[k]).map(entry).join('')}</div>
    <div class="eyebrow">Bosse</div><div class="cards">${Object.keys(BOSSES).filter(k=>BEAST[k]).map(entry).join('')}</div>
    <button class="btn" data-a="back">Zurück</button></div>`,{ back:showMenu });
}
function showSlots(){
  const rows=[...Array(SLOTS)].map((_,i)=>{ const s=i===slotIdx?save:readSlot(i), act=i===slotIdx;
    if(!s) return `<div class="card"><div class="ic">➕</div><div class="body"><div class="nm">Platz ${i+1} – leer</div><div class="ds">Starte ein frisches Abenteuer mit eigenem Fortschritt.</div>
      <div class="row" style="margin-top:6px"><button class="btn small primary" data-a="new" data-v="${i}">Neuer Spielstand</button></div></div></div>`;
    const wins=Object.keys(s.stats.wins).length, ach=Object.keys(s.ach).length, best=s.scores[0]?s.scores[0].score:0;
    return `<div class="card ${act?'sel':''}"><div class="ic">${act?'💾':'📁'}</div><div class="body"><div class="nm">${esc(s.name||('Spielstand '+(i+1)))}${act?' <span class="pill g" style="font-size:11px;padding:2px 8px">Aktiv</span>':''}</div>
      <div class="stats" style="grid-template-columns:repeat(4,1fr)"><span>Seelen<b>${s.souls}</b></span><span>Läufe<b>${s.runs}</b></span><span>Siege<b>${wins}</b></span><span>Erfolge<b>${ach}/${ACH.length}</b></span></div>
      <div class="ds" style="font-size:13px">Bestwert ${best}${s.ngMax?' · NG+ '+s.ngMax+' frei':''}${s.run?' · laufendes Abenteuer':''}${s.last?' · zuletzt '+new Date(s.last).toLocaleDateString('de-DE'):''}</div>
      <div class="row slotbtns" style="margin-top:6px;gap:6px">${act?'':`<button class="btn small primary" data-a="load" data-v="${i}">Laden</button>`}<button class="btn small" data-a="ren" data-v="${i}">Umbenennen</button><button class="btn small danger" data-a="del" data-v="${i}">Löschen</button></div></div></div>`; }).join('');
  render(`<div class="wrap"><div class="eyebrow">Drei getrennte Profile</div><h2>Spielstände</h2>
    <p class="sub">Jeder Spielstand hat eigene Seelen, Schmiede, Helden, Erfolge, Ruhmeshalle und ein eigenes laufendes Abenteuer. Einstellungen gelten für alle.</p>
    <div class="cards" style="grid-template-columns:1fr">${rows}</div>
    <div class="row"><button class="btn" data-a="exp">💾 Aktiven Spielstand sichern</button><button class="btn" data-a="imp">📥 Sicherung laden</button></div>
    <button class="btn" data-a="back">Zurück</button></div>`,
  { back:showMenu,
    load:i=>{ switchSlot(+i); sfx('pick'); showSlots(); }, exp:()=>showBackup(showSlots), imp:()=>showImport(null,showSlots),
    new:i=>{ persist(); slotIdx=+i; const keep=save.settings, snd=save.sound; save=defSave(); save.name='Spielstand '+(+i+1); save.settings=keep; save.sound=snd; persist(); sfx('pick'); showSlots(); },
    ren:i=>{ const s=+i===slotIdx?save:readSlot(+i);
      render(`<div class="wrap" style="justify-content:center"><h2 class="center">Spielstand umbenennen</h2>
        <form id="renForm" class="cards"><input id="slotName" maxlength="20" value="${esc(s.name||'')}" style="font:inherit;font-size:18px;padding:12px;border-radius:8px;border:2px solid var(--gold);background:var(--stone);color:var(--parch)">
        <button class="btn primary" type="submit">Speichern</button></form><button class="btn" data-a="no">Abbrechen</button></div>`,{ no:showSlots },true);
      const inp=$('slotName'); inp.focus(); inp.select();
      $('renForm').addEventListener('submit',e=>{ e.preventDefault(); const nm=inp.value.trim().slice(0,20)||('Spielstand '+(+i+1));
        if(+i===slotIdx){ save.name=nm; persist(); } else { s.name=nm; lsSet(slotKey(+i),s); } showSlots(); }); },
    del:i=>render(`<div class="wrap" style="justify-content:center"><h2 class="center">Spielstand wirklich löschen?</h2>
      <p class="sub center">Alle Seelen, Helden, Erfolge und Rekorde dieses Spielstands gehen verloren. Das lässt sich nicht rückgängig machen.</p>
      <button class="btn danger" data-a="yes">Endgültig löschen</button><button class="btn" data-a="no">Abbrechen</button></div>`,
      { yes:()=>{ if(+i===slotIdx){ const keep=save.settings, snd=save.sound; save=defSave(); save.name='Spielstand '+(slotIdx+1); save.settings=keep; save.sound=snd; persist(); } else lsDel(slotKey(+i)); showSlots(); }, no:showSlots },true) });
}

function showHelp(){
  render(`<div class="wrap help"><h2>Anleitung</h2>
  <p><b>Bewegen:</b> Lege den Daumen irgendwo auf den Bildschirm und ziehe (am PC: W A S D oder Pfeiltasten, am Controller: linker Stick). Dein Held greift den nächsten Gegner automatisch an.</p>
  <p><b>Fähigkeit:</b> Der große runde Knopf unten rechts löst die Spezialfähigkeit deines Helden aus. Danach lädt sie sich wieder auf. <b>Zielen:</b> Ziehe den Daumen vom Knopf weg, um Richtung und Weite zu wählen, und lass los (Magierin, Jägerin, Nekromantin, Alchemistin, Berserkerin). Kurz tippen zielt automatisch.</p>
  <p><b>Ausweichen:</b> Der kleine blaue Knopf 💨 lässt dich in Laufrichtung hechten. Währenddessen bist du kurz unverwundbar. Perfekt gegen Boss-Angriffe.</p>
  <p><b>Karte:</b> Jeder Akt ist eine Karte mit Abzweigungen. Wähle deinen Weg: ⚔️ Kampf, 💀 Elite (schwer, bessere Beute), ⚖️ Händler, 🔥 Lagerfeuer, 🎁 Schatz, ❓ Ereignis. Am Ende wartet der 👑 Boss.</p>
  <p><b>Elitegegner</b> 👑 tragen Eigenschaften: 💨 Flink, 🛡️ Gepanzert, 💥 Explosiv, 🧬 Teilend, 🩸 Vampirisch, ❄️ Frostig, 🦇 Beschwörer.</p>
  <p><b>Arena:</b> Säulen blockieren Geschosse, also nutze sie als Deckung. Sprengfässer ✸ explodieren bei Treffern. Locke Gegner in Stachelfallen und Lava.</p>
  <p><b>Upgrades:</b> Nach jedem Kampf wählst du eine von drei Verbesserungen. Sie gelten bis zum Ende des Laufs.</p>
  <p><b>Seelen:</b> Besiegte Gegner hinterlassen Seelen 👻. Die behältst du auch nach dem Tod. Gib sie in der Schmiede aus oder schalte neue Helden frei.</p>
  <p><b>Am PC:</b> W A S D bewegen, Linksklick oder Q für die Fähigkeit (zielt auf den Mauszeiger), Leertaste oder Rechtsklick zum Ausweichen, Esc für Pause, F für Vollbild. Controller werden automatisch erkannt.</p>
  <button class="btn" data-a="keys">🎮 Alle Tasten und Controller</button>
  <button class="btn primary" data-a="back">Verstanden</button></div>`,{ back:showMenu, keys:()=>showControls(showHelp) });
}

/* Übersicht aller Steuerungsarten */
function showControls(back){
  const on=m=>INPUT_MODE===m?' <span class="pill" style="font-size:11px">gerade aktiv</span>':'';
  render(`<div class="wrap help"><div class="eyebrow">Steuerung</div><h2>Tasten und Controller</h2>
  <p class="sub">Das Spiel erkennt selbst, ob du mit dem Finger, mit Maus und Tastatur oder mit einem Controller spielst, und zeigt passende Hinweise.</p>
  <div class="eyebrow" style="margin-top:6px">🖱️ Maus und Tastatur${on('pc')}</div>
  <div class="keys">
    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><span>Bewegen – dein Held greift von selbst an</span>
    <span><kbd>Linksklick</kbd> <kbd>Q</kbd> <kbd>E</kbd></span><span>Fähigkeit – zielt auf den Mauszeiger</span>
    <span><kbd>Leertaste</kbd> <kbd>Umschalt</kbd> <kbd>Rechtsklick</kbd></span><span>Ausweichen – in Laufrichtung, im Stand zum Mauszeiger</span>
    <span><kbd>Esc</kbd> <kbd>P</kbd></span><span>Pause</span>
    <span><kbd>F</kbd></span><span>Vollbild an oder aus</span>
    <span><kbd>1</kbd> … <kbd>9</kbd></span><span>In Menüs: Belohnung, Ereignis oder Weg auf der Karte wählen</span>
    <span><kbd>↑</kbd><kbd>↓</kbd> <kbd>Enter</kbd></span><span>In Menüs: auswählen und bestätigen, <kbd>Esc</kbd> zurück</span>
  </div>
  <div class="eyebrow" style="margin-top:10px">🎮 Controller${on('pad')}</div>
  <div class="keys">
    <span>Linker Stick, Steuerkreuz</span><span>Bewegen</span>
    <span><kbd>A</kbd> <kbd>LB</kbd> <kbd>LT</kbd></span><span>Ausweichen</span>
    <span><kbd>X</kbd> <kbd>Y</kbd> <kbd>RB</kbd> <kbd>RT</kbd></span><span>Fähigkeit</span>
    <span>Rechter Stick</span><span>Fähigkeit zielen (Magierin, Jägerin, Nekromantin, Alchemistin, Berserkerin)</span>
    <span><kbd>Start</kbd></span><span>Pause</span>
    <span>In Menüs</span><span>Stick wählt aus, <kbd>A</kbd> bestätigt, <kbd>B</kbd> zurück</span>
  </div>
  <div class="eyebrow" style="margin-top:10px">📱 Touch${on('touch')}</div>
  <div class="keys">
    <span>Ziehen</span><span>Bewegen, irgendwo auf dem Bildschirm</span>
    <span>Großer Knopf</span><span>Fähigkeit – vom Knopf wegziehen zum Zielen</span>
    <span>💨</span><span>Ausweichen</span>
  </div>
  <button class="btn primary" data-a="back">Zurück</button></div>`,{ back:back||showMenu });
}

function showIntro(next){
  save.introSeen=true; persist();
  render(`<div class="wrap story" style="justify-content:center"><div class="eyebrow center">Prolog</div><h1 class="center" style="margin-top:6px">Die Arena der Verdammten</h1>
    <p>Tief unter der vergessenen Stadt Varnhold liegt eine Arena, die in keiner Chronik steht. Gefangene, Glücksritter und Verfluchte kämpfen dort vor einem Publikum aus Lebenden und Toten.</p>
    <p>Die Regel ist einfach: Wer alle vier Ränge übersteht – die Verliese, die Krypta, den Drachenhort und den Himmelsturm –, erhält seine Freiheit. Wer fällt, dessen Seele bleibt in den Mauern gefangen und nährt die nächste Generation von Kämpfern.</p>
    <p>Bisher hat es niemand geschafft. Die Tore öffnen sich. Die Menge brüllt.</p>
    <button class="btn primary" data-a="next">Betritt die Arena</button></div>`,{ next });
}
function showChars(){
  const anyWon=Object.keys(CHARS).some(id=>tierWon(id)>=0), tmax=Math.max(0,...Object.keys(CHARS).map(tierOpen)), tsel=Math.min(save.tierSel||0,tmax);
  const list=Object.entries(CHARS).map(([id,c])=>{
    const un=save.unlocked[id], can=save.souls>=c.cost, tw=tierWon(id), tlock=un && tsel>tierOpen(id);
    return `<button class="card ${un&&save.lastChar===id?'sel':''}" data-a="${un?(tlock?'x':'go'):'buy'}" data-v="${id}" ${(!un&&!can)||tlock?'disabled':''} style="${tw>=1?'border-color:'+tierColor(tw):''}">
      <div class="ic port" style="background:radial-gradient(circle at 50% 40%,${c.color}88,#0008 75%);${tw>=1?'box-shadow:0 0 0 2px '+tierColor(tw):''}"><canvas data-port="hero:${id}" data-size="46"></canvas></div>
      <div class="body"><div class="nm">${c.name}</div><div class="ds">${c.desc}</div>
        <div class="ds" style="color:var(--parch)">${c.skill.icon} <b>${c.skill.name}:</b> ${c.skill.desc}</div>${c.passive?`<div class="ds" style="color:var(--gold)">${c.passive}</div>`:''}
        ${un?(()=>{ const L=heroLvl(id), xp=(save.heroXp||{})[id]||0, a=xpFor(L), b=xpFor(L+1);
          return `<div class="ds" style="font-size:13px;color:var(--parch)">⭐ Stufe ${L}${L?` · +${L*3} LP, +${L*2} % Schaden`:''}</div>${L<HERO_MAX?`<div style="height:5px;background:#0008;border:1px solid var(--iron);border-radius:3px;overflow:hidden;margin:2px 0 4px"><div style="height:100%;width:${Math.min(100,(xp-a)/(b-a)*100)}%;background:var(--gold)"></div></div>`:''}`; })():''}
        <div class="stats"><span>LP<b>${c.hp}</b></span><span>Schaden<b>${c.dmg}</b></span><span>Tempo<b>${c.speed}</b></span><span>Reichw.<b>${c.range}</b></span></div>
        ${un&&anyWon?`<div class="ds" style="font-size:13px;color:${tierColor(Math.max(0,tw))}">🔥 ${tw<0?'Noch kein Sieg':'Verdammnis '+tw+' geschafft'}${tlock?' – erst Stufe '+(tsel-1)+' gewinnen':''}</div>`:''}
      </div>
      ${un?'':`<span class="pill s price">🔒 ${c.cost} 👻</span>`}
    </button>`;}).join('');
  render(`<div class="wrap"><div class="eyebrow">Neues Abenteuer</div><h2>Wähle deinen Helden</h2>
    <span class="pill s" style="align-self:flex-start">👻 ${save.souls} Seelen</span>
    ${anyWon?`<div class="eyebrow" style="margin-top:4px">Verdammnis-Stufe</div><div class="skinrow">${[...Array(tmax+1)].map((_,t)=>`<button class="skin ${tsel===t?'sel':''}" data-a="tier" data-v="${t}" style="${t?'border-color:'+tierColor(t):''}">${t?TIERS[t].ic+' '+t:'Normal'}</button>`).join('')}<button class="skin" data-a="tiers">ℹ️ Übersicht</button></div>
      ${tsel?`<p class="sub" style="font-size:13px">${TIERS.slice(1,tsel+1).map(t=>t.ic+' '+t.ds).join('<br>')}<br><b style="color:var(--gold)">Seelen und Punkte +${15*tsel} %</b></p>`:''}`:''}
    <div class="cards">${list}</div>
    ${save.runs>0?`<div class="eyebrow" style="margin-top:6px">Aussehen</div>
    ${Object.keys(CHARS).filter(id=>save.unlocked[id]).map(id=>`<div class="skinrow"><b style="min-width:96px">${CHARS[id].icon} ${CHARS[id].name}</b>${Object.entries(SKINS[id]).map(([k,sk])=>{ const own=skinOwned(id,k), sel=(save.skin[id]||'base')===k;
      return `<button class="skin ${sel?'sel':''}" data-a="${own?'skin':'skinbuy'}" data-v="${id}:${k}" ${own||save.souls>=SKIN_PRICE?'':'disabled'} title="${own?'':'Erfolg: '+ACH.find(a=>a.id===sk.ach).nm+' oder '+SKIN_PRICE+' Seelen'}"><i style="background:linear-gradient(135deg,${sk.cape||SKINS[id].base.cape} 50%,${sk.body||SKINS[id].base.body} 50%)"></i>${own?'':'🔒 '}${sk.nm}${own?'':' · '+SKIN_PRICE+' 👻'}</button>`; }).join('')}</div>`).join('')}
    <p class="sub" style="font-size:13px">Gesperrte Aussehen gibt es über Erfolge – oder für ${SKIN_PRICE} Seelen.</p>
    <div class="eyebrow" style="margin-top:6px">Begleiter</div>
    <div class="cards">${PETS.map(pt=>{ const own=(save.pets||{})[pt.id], sel=save.pet===pt.id;
      return `<button class="card ${sel?'sel':''}" data-a="${own?'pet':'petbuy'}" data-v="${pt.id}" ${own||save.souls>=pt.cost?'':'disabled'}><div class="ic">${pt.ic}</div><div class="body"><div class="rar">${sel?'Begleitet dich':own?'Tippen zum Mitnehmen':'Für '+pt.cost+' Seelen'}</div><div class="nm">${pt.nm}</div><div class="ds">${pt.ds}</div></div>${own?'':`<span class="pill s price">🔒 ${pt.cost} 👻</span>`}</button>`; }).join('')}</div>
    <p class="sub" style="font-size:13px">Begleiter helfen in normalen Läufen und Herausforderungen, nicht in der Tages- und Wochenprüfung.</p>`:''}
    <button class="btn" data-a="back">Zurück</button></div>`,
  { back:showMenu, x:()=>{}, tiers:()=>showTiers(showChars), go:id=>{ const go=()=>startRun(id,{tier:Math.min(tsel,tierOpen(id))}); save.introSeen?go():showIntro(go); }, tier:n=>{ save.tierSel=+n; persist(); showChars(); }, skin:v=>{ const [id,k]=v.split(':'); save.skin[id]=k; persist(); showChars(); },
    pet:id=>{ save.pet=save.pet===id?null:id; persist(); showChars(); },
    petbuy:id=>{ const pt=PETS.find(x=>x.id===id); if(save.souls<pt.cost) return; save.souls-=pt.cost; save.pets=save.pets||{}; save.pets[id]=true; save.pet=id; persist(); sfx('buy'); showChars(); },
    skinbuy:v=>{ const [id,k]=v.split(':'); if(save.souls<SKIN_PRICE) return; save.souls-=SKIN_PRICE; save.skinBought=save.skinBought||{}; save.skinBought[v]=true; save.skin[id]=k; persist(); sfx('buy'); showChars(); },
    buy:id=>{ const c=CHARS[id]; if(save.souls>=c.cost){ save.souls-=c.cost; save.unlocked[id]=true; persist(); sfx('buy'); showChars(); } } });
}

function showForge(){
  const list=META.map(m=>{
    const l=metaLvl(m.id), mx=l>=m.max, cost=mx?0:m.cost(l), can=!mx&&save.souls>=cost;
    return `<button class="card" data-a="up" data-v="${m.id}" ${can?'':'disabled'}>
      <div class="ic">${m.ic}</div>
      <div class="body"><div class="nm">${m.nm}</div><div class="ds">${m.ds}</div>
        <div class="lvl">${Array.from({length:m.max},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('')}</div></div>
      <span class="pill s price">${mx?'Max':cost+' 👻'}</span></button>`;}).join('');
  render(`<div class="wrap"><div class="eyebrow">Dauerhafte Verbesserungen</div><h2>Die Schmiede</h2>
    <p class="sub">Seelen aus vergangenen Läufen stärken jeden neuen Helden.</p>
    <span class="pill s" style="align-self:flex-start">👻 ${save.souls} Seelen</span>
    <div class="cards">${list}</div><button class="btn" data-a="back">Zurück</button></div>`,
  { back:showMenu, up:id=>{ const m=META.find(x=>x.id===id), l=metaLvl(id); if(l<m.max && save.souls>=m.cost(l)){ save.souls-=m.cost(l); save.meta[id]=l+1; persist(); sfx('buy'); checkAch(); showForge(); } } });
}

function showScores(){
  const rows=save.scores.length? save.scores.map((s,i)=>`<tr><td>${i+1}.</td><td>${CHARS[s.cid]?.icon||''} ${CHARS[s.cid]?.name||''}</td><td>${s.ng?'NG+'+s.ng+' ':''}${s.endless?'♾️ Akt '+s.act:s.won?'Sieg 👑':'Akt '+s.act}${s.daily?' 📅':''}${s.assist?' 🕊️':''}</td><td>${esc(s.date)}</td><td class="n">${s.score}</td></tr>`).join('')
    : `<tr><td colspan="5" class="center" style="color:var(--parch-dim);padding:24px">Noch keine Einträge. Dein erster Lauf landet hier.</td></tr>`;
  render(`<div class="wrap"><div class="eyebrow">Die besten Läufe</div><h2>Ruhmeshalle</h2>
    <div style="overflow-x:auto"><table class="scores"><thead><tr><th>#</th><th>Held</th><th>Weit</th><th>Datum</th><th style="text-align:right">Punkte</th></tr></thead><tbody>${rows}</tbody></table></div>
    <button class="btn" data-a="back">Zurück</button></div>`,{ back:showMenu });
}

function relicBar(){ const rl=(run&&run.relics)||[]; return rl.length?`<div class="relbar">${rl.map(id=>`<span class="relic big" title="${esc(REL[id].nm)}: ${esc(REL[id].ds)}">${REL[id].ic}</span>`).join('')}</div>`:''; }
function relicCard(r,act='relic'){ return `<button class="card ${r.cursed?'cursed':'epic'} reward-card" data-a="${act}" data-v="${r.id}"><div class="ic">${r.ic}</div><div class="body"><div class="rar">${r.cursed?'Verfluchtes Relikt':'Relikt'}</div><div class="nm">${r.nm}</div><div class="ds">${r.ds}</div></div></button>`; }
function relicsLeft(){ return RELICS.filter(r=>!hasRelic(r.id)); }
function gainRelic(id){ const r=REL[id]; run.relics=run.relics||[]; if(run.relics.includes(id)) return; run.relics.push(id); if(r.on) r.on(run.p);
  save.stats.relics=save.stats.relics||[]; if(!save.stats.relics.includes(id)) save.stats.relics.push(id); sfx('relic'); }
// Relikt-Auswahl: eins von zwei (Schatz, Champion)
function showRelicPick(after, title='Ein Relikt!', sub='Wähle eines – Relikte wirken für den Rest des Laufs.'){
  const left=relicsLeft(); if(!left.length){ after(); return; }
  const offer=seeded(roomKey('relic')+'|'+(run.relics||[]).length,()=>shuffle(left.slice()).slice(0,2));
  render(`<div class="wrap"><div class="eyebrow">Relikt</div><h2>${title}</h2><p class="sub">${sub}</p>
    <div class="cards">${offer.map(r=>relicCard(r)).join('')}</div></div>`,
  { relic:id=>{ gainRelic(id); toast(`<span style="font-size:26px">${REL[id].ic}</span><div><div class="eyebrow" style="color:var(--gold)">Relikt erhalten</div><b>${REL[id].nm}</b></div>`); after(); } },true);
}
// Schatzraum: Relikt-Auswahl, alternativ eine Upgrade-Auswahl
function showTreasure(){
  if(!relicsLeft().length){ showReward('treasure', showMap); return; }
  run.pend={mode:'treasure',after:'map'}; save.run=run; persist();
  const left=relicsLeft(), offer=seeded(roomKey('relic')+'|'+(run.relics||[]).length,()=>shuffle(left.slice()).slice(0,2));
  render(`<div class="wrap"><div class="eyebrow">Wähle eine Belohnung</div><h2>Ein Schatz!</h2><p class="sub">Eine alte Truhe birgt Relikte – mächtige Gegenstände, die für den Rest des Laufs wirken.</p>
    <div class="cards">${offer.map(r=>relicCard(r)).join('')}</div>
    <button class="btn" data-a="upg">Lieber ein Upgrade wählen</button></div>`,
  { relic:id=>{ run.pend=null; gainRelic(id); showMap(); }, upg:()=>showReward('treasure', showMap) },true);
}
function relicsHtml(){
  const e=Object.entries(run.upg); if(!e.length) return '<span class="sub" style="font-size:13px">Noch keine Upgrades</span>';
  return e.map(([id,n])=>`<span class="relic" title="${UPG[id].nm}">${UPG[id].ic}${n>1?`<sup>${n}</sup>`:''}</span>`).join('');
}

function showMap(){
  state='ui'; save.run=run; persist();
  const av=availNodes(), A=actOf(run.act), R=run.map.R;
  const ys=r=> r===R ? 10 : 91 - r*(68/(R-1));
  const nodes=allNodes();
  let lines='';
  for(const n of nodes) for(const id of n.next){ const m=nodeById(id);
    const taken = run.visited.includes(n.id) && run.visited.includes(m.id);
    const open = n.id===run.posId && av.includes(m.id);
    lines+=`<line x1="${n.x*100}" y1="${ys(n.row)}" x2="${m.x*100}" y2="${ys(m.row)}" stroke="${taken||open?'#e6b450':'#8d7f86'}" stroke-opacity="${taken?0.9:open?0.6:0.35}" stroke-width="${taken?3:2}" stroke-dasharray="${taken?'':'4 5'}" vector-effect="non-scaling-stroke"/>`;
  }
  const btns=nodes.map(n=>{
    const cls=['node', n.type==='boss'?'boss':'', av.includes(n.id)?'avail':'', run.visited.includes(n.id)?'done':'', n.id===run.posId?'cur':''].join(' ');
    const rb=n.type==='fight'&&n.rw&&n.rw!=='up'&&!run.visited.includes(n.id)?`<span class="rw">${{rare:'💎',gold:'💰',heal:'❤️'}[n.rw]}</span>`:'';
    return `<button class="${cls}" style="left:${n.x*100}%;top:${ys(n.row)}%" data-a="${av.includes(n.id)?'go':'x'}" data-v="${n.id}" aria-label="${NODE[n.type].nm}">${NODE[n.type].ic}${rb}</button>`;
  }).join('');
  const p=run.p;
  render(`<div class="mapscreen">
    <div class="maphead"><div><div class="eyebrow">${run.tier?'🔥 Verdammnis '+run.tier+' · ':''}${run.challenge?'🏁 ':''}${run.ng?'⚔️ NG+'+run.ng+' · ':''}${run.act>ACT_N?'Endlos · Akt '+run.act:'Akt '+run.act+' von '+ACT_N}${(run.daily||run.challenge)&&runMod()?' · '+(run.daily?'📅 ':'')+runMod().ic+' '+runMod().nm:''}</div><h2>${A.name}</h2><div class="sub" style="font-size:13px">👑 ${BOSSES[bossKind()].name} erwartet dich</div></div>
      <div class="row" style="gap:6px"><button class="btn small" data-a="stats">📜 Werte</button><button class="btn small" data-a="menu">☰ Menü</button></div></div>
    <div class="row" style="gap:6px"><span class="pill h">❤️ ${Math.ceil(p.hp)}/${Math.round(p.maxHp)}</span><span class="pill g">💰 ${run.gold}</span><span class="pill s">👻 ${run.souls}</span><span class="pill">${CHARS[run.cid].icon} ${CHARS[run.cid].name}</span></div>
    <div class="mapbox"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${btns}</div>
    <div class="legend">${Object.values(NODE).map(n=>`<span>${n.ic} ${n.nm}</span>`).join('')}<span>💎 Seltene Belohnung</span><span>💰 Gold statt Upgrade</span><span>❤️ Heilung statt Upgrade</span></div>
    ${relicBar()}<div class="relics">${relicsHtml()}</div>
  </div>`,
  { go:id=>enterNode(id), x:()=>{}, menu:showRunMenu, stats:showRunStats });
}

function showRunStats(){
  const c=CHARS[run.cid], ups=Object.entries(run.upg);
  render(`<div class="wrap"><div class="eyebrow">${c.icon} ${c.name}</div><h2>Werte und Upgrades</h2>
    ${statsHtml(run.p)}${relicBar()}${evoHtml()}${synHtml()}
    <div class="cards">${ups.length?ups.map(([id,n])=>{ const u=UPG[id]; return `<div class="card ${u.r}"><div class="ic">${u.ic}</div><div class="body"><div class="rar">${RAR[u.r]}${n>1?' · Stufe '+n:''}</div><div class="nm">${u.nm}</div><div class="ds">${u.ds}</div></div></div>`; }).join(''):'<p class="sub">Noch keine Upgrades. Besiege Gegner, um welche zu verdienen.</p>'}</div>
    <button class="btn primary" data-a="back">Zurück zur Karte</button></div>`,{ back:showMap },true);
}
/* Kodex: alle Synergien mit Rezept, alle Perks und alle Waffen-Entwicklungen – damit man Builds gezielt planen kann */
function perkCodexHtml(grp){
  const list=UPGRADES.filter(u=>grp==='alle'?!u.only:(u.only&&u.only.includes(grp))), cnt=g=>UPGRADES.filter(u=>g==='alle'?!u.only:(u.only&&u.only.includes(g))).length;
  const chips=['alle',...Object.keys(CHARS)].map(g=>`<button class="skin ${g===grp?'sel':''}" data-a="tab" data-v="perk:${g}">${g==='alle'?'🌐 Allgemein':CHARS[g].icon+' '+CHARS[g].name} · ${cnt(g)}</button>`).join('');
  const lim=u=>u.max===1?' · einmalig':u.max?` · bis ${u.max}×`:'';
  return `<p class="sub" style="font-size:14px">Perks wählst du nach jedem Raum, beim Händler und in Schätzen. Helden-Perks gibt es nur für ihren Helden, dafür erscheinen sie etwas häufiger.</p><div class="skinrow">${chips}</div>
    <div class="cards">${list.map(u=>{ const n=run&&run.upg?run.upg[u.id]||0:0; return `<div class="card ${u.r}"><div class="ic">${u.ic}</div><div class="body"><div class="rar">${RAR[u.r]}${lim(u)}${n?` · im Lauf ${n}×`:''}</div><div class="nm">${u.nm}</div><div class="ds">${u.ds}</div></div></div>`; }).join('')}</div>`;
}
function showCodex(back, tab='syn'){
  if(tab==='perk') tab='perk:'+(run&&run.cid&&!run.ended?run.cid:'alle');
  const found=save.stats.syns||[], evos=save.stats.evos||[];
  const synCard=s=>{ const f=found.includes(s.id), act=hasSyn(s.id), only=s.req.map(r=>UPG[r].only).find(Boolean);
    return `<div class="card ${act?'epic':f?'rare':''}" style="${f||act?'':'opacity:.8'}"><div class="ic">${f?s.ic:'❔'}</div><div class="body"><div class="rar">${act?'Aktiv in diesem Lauf':f?'Entdeckt':'Noch nicht entdeckt'}${only?' · '+CHARS[only[0]].name:''}</div>
      <div class="nm">${f?s.nm:'???'}</div><div class="ds">${s.req.map(r=>`${UPG[r].ic} ${UPG[r].nm}`).join(' + ')}</div>${f?`<div class="ds" style="color:var(--parch)">${s.ds}</div>`:''}</div></div>`; };
  const evoHtml=Object.entries(EVOS).map(([cid,list])=>`<div class="eyebrow" style="margin-top:6px">${CHARS[cid].icon} ${CHARS[cid].name}</div><div class="cards">${list.map(e=>{ const f=evos.includes(e.id), act=hasEvo(e.id);
    return `<div class="card ${act?'epic':f?'rare':''}"><div class="ic">${f?e.ic:'❔'}</div><div class="body"><div class="rar">${act?'Aktiv in diesem Lauf':f?'Entdeckt':'Nach einem Bosskampf wählbar'}</div><div class="nm">${f?e.nm:'???'}</div>${f?`<div class="ds">${e.ds}</div>`:''}</div></div>`; }).join('')}</div>`).join('');
  render(`<div class="wrap"><div class="eyebrow">${found.length} von ${SYN.length} Synergien · ${evos.length} von ${Object.values(EVOS).flat().length} Entwicklungen</div><h2>Kodex</h2>
    <div class="skinrow"><button class="skin ${tab==='syn'?'sel':''}" data-a="tab" data-v="syn">🔗 Synergien</button><button class="skin ${tab.startsWith('perk')?'sel':''}" data-a="tab" data-v="perk">🃏 Perks</button><button class="skin ${tab==='evo'?'sel':''}" data-a="tab" data-v="evo">⚒️ Entwicklungen</button><button class="skin ${tab==='rel'?'sel':''}" data-a="tab" data-v="rel">🏺 Relikte</button><button class="skin ${tab==='lore'?'sel':''}" data-a="tab" data-v="lore">📜 Chronik</button></div>
    ${tab.startsWith('perk:')?perkCodexHtml(tab.slice(5)):tab==='lore'?loreHtml():tab==='rel'?`<p class="sub" style="font-size:14px">Relikte findest du in Schatzräumen, bei Champions in Elite-Räumen und manchmal beim Händler.</p><div class="cards">${RELICS.map(r=>{ const f=(save.stats.relics||[]).includes(r.id), act=hasRelic(r.id); return `<div class="card ${act?'epic':f?(r.cursed?'cursed':'rare'):''}"><div class="ic">${f?r.ic:'❔'}</div><div class="body"><div class="rar">${act?'Im Besitz':f?'Gefunden':'Noch nicht gefunden'}</div><div class="nm">${f?r.nm:'???'}</div>${f?`<div class="ds">${r.ds}</div>`:''}</div></div>`; }).join('')}</div>`:
    tab==='syn'?`<p class="sub" style="font-size:14px">Wähle beide Upgrades eines Rezepts in einem Lauf, um die Synergie auszulösen.</p><div class="cards">${SYN.map(synCard).join('')}</div>`:`<p class="sub" style="font-size:14px">Nach jedem Boss verwandelst du deinen Grundangriff: Du wählst eine von zwei Entwicklungen.</p>${evoHtml}`}
    <button class="btn" data-a="back">Zurück</button></div>`,{ back, tab:t=>showCodex(back,t) });
}
function showRunMenu(){
  render(`<div class="wrap" style="justify-content:center"><h2 class="center">Pause</h2>
    <p class="sub center">Dein Lauf wird automatisch gespeichert, solange du auf der Karte bist.</p>
    <button class="btn primary" data-a="back">Zurück zur Karte</button>
    <button class="btn" data-a="codex">📚 Kodex</button>
    <button class="btn" data-a="opts">⚙️ Einstellungen</button>
    <button class="btn" data-a="main">Hauptmenü</button>
    <button class="btn" data-a="quit">Lauf aufgeben</button></div>`,
  { back:showMap, codex:()=>showCodex(showRunMenu), opts:()=>{ settingsBack=showRunMenu; showSettings(); }, main:()=>{ save.run=run; persist(); showMenu(); }, quit:confirmQuit },true);
}
function confirmQuit(){
  render(`<div class="wrap" style="justify-content:center"><h2 class="center">Lauf wirklich aufgeben?</h2>
    <p class="sub center">Gesammelte Seelen behältst du. Upgrades und Gold verfallen.</p>
    <button class="btn primary" data-a="yes">Aufgeben</button><button class="btn" data-a="no">Weiterkämpfen</button></div>`,
  { yes:()=>endRun(false), no:()=> state==='paused'?showPause():showMap() },true);
}

function enterNode(id){
  const n=nodeById(id); run.posId=id; run.visited.push(id);
  if(n.type==='fight'||n.type==='elite'||n.type==='boss') startCombat(n.type);
  else { run.rooms++; save.run=run; persist();
    if(n.type==='shop') showShop(); else if(n.type==='rest') showRest(); else if(n.type==='event') showEvent(); else showTreasure(); }
}

/* ---- Ereignisse ---- */
const healPct=f=>{ run.p.hp=Math.min(run.p.maxHp, run.p.hp+run.p.maxHp*f); };
function giftUpgrade(mode, rarity){
  let u = rarity ? pick(availUpgrades().filter(x=>x.r===rarity)) : rollUpgrades(1,mode)[0];
  if(!u) u=rollUpgrades(1,mode)[0]; if(!u){ run.gold+=40; return 'Leider nichts Brauchbares. Du erhältst stattdessen 40 Gold.'; }
  const ns=applyUpgrade(u);
  return `Du erhältst ${u.ic} <b>${u.nm}</b>: ${u.ds}.`+(ns.length?`<br><br>Synergie entdeckt: ${ns.map(s=>s.ic+' <b>'+s.nm+'</b>').join(', ')}!`:'');
}
const EVENTS = [
  { id:'well', ic:'🪣', nm:'Der verfluchte Brunnen', tx:'Schwarzes Wasser kräuselt sich, obwohl kein Wind weht. Es flüstert deinen Namen.', opts:r=>[
    { l:'Trinken', d:'+25 % Schaden, aber −15 max. LP', r:'epic', f:()=>{ const p=r.p; p.dmg*=1.25; p.maxHp=Math.max(30,p.maxHp-15); p.hp=Math.min(p.hp,p.maxHp); return 'Das Wasser brennt in deiner Kehle. Deine Hände zittern vor Kraft.'; } },
    { l:'Eine Münze hineinwerfen', d:'10 Gold: heilt 30 % LP', ok:r.gold>=10, f:()=>{ r.gold-=10; healPct(0.3); return 'Ein warmer Schimmer steigt aus der Tiefe und schließt deine Wunden.'; } },
    { l:'Weitergehen', d:'Manche Dinge lässt man besser in Ruhe.', f:()=>'Du gehst weiter. Das Flüstern verstummt hinter dir.' } ] },
  { id:'gamble', ic:'🎲', nm:'Der Goblin-Spieltisch', tx:'Ein Goblin mischt schmierige Karten. „Doppelt oder nichts, Fremder?“', opts:r=>[
    { l:'30 Gold setzen', d:'50 % Chance auf 60 Gold', ok:r.gold>=30, f:()=>{ if(Math.random()<0.5){ r.gold+=30; return 'Der Goblin flucht und schiebt dir 60 Gold hin. Du gewinnst 30 Gold.'; } r.gold-=30; return 'Der Goblin grinst mit spitzen Zähnen. Deine 30 Gold sind weg.'; } },
    { l:`Die Hälfte setzen (${Math.floor(r.gold/2)} Gold)`, d:'45 % Chance, den Einsatz zu verdoppeln', r:'rare', ok:r.gold>=10, f:()=>{ const a=Math.floor(r.gold/2); if(Math.random()<0.45){ r.gold+=a; return `Unglaublich! Du gewinnst ${a} Gold.`; } r.gold-=a; return `Der Goblin lacht, bis er Schluckauf bekommt. ${a} Gold verloren.`; } },
    { l:'Ablehnen', d:'Spiel nie gegen einen Goblin.', f:()=>'„Feigling!“, ruft er dir nach.' } ] },
  { id:'prisoner', ic:'⛓️', nm:'Der gefangene Ritter', tx:'In einer Zelle hängt ein Ritter in rot glühenden Ketten. „Befreie mich, und ich lehre dich mein Geheimnis.“', opts:r=>[
    { l:'Die Ketten sprengen', d:'Kostet 20 % deiner max. LP, dafür ein seltenes oder episches Upgrade', r:'rare', ok:r.p.hp>r.p.maxHp*0.25, f:()=>{ r.p.hp-=r.p.maxHp*0.2; return 'Die Ketten verbrennen dir die Hände, doch sie zerbersten. '+giftUpgrade('treasure'); } },
    { l:'Ihn hängen lassen', d:'Wer weiß, warum er dort hängt.', f:()=>'Seine Rufe hallen dir noch lange nach.' } ] },
  { id:'altar', ic:'🕯️', nm:'Der Seelenaltar', tx:'Kerzen aus Knochen brennen mit blauer Flamme. Auf dem Altar liegt eine Opferschale.', opts:r=>[
    { l:'Blut opfern', d:'−15 LP, dafür +20 Seelen', r:'rare', ok:r.p.hp>20, f:()=>{ r.p.hp-=15; r.souls+=20; return 'Die Flammen lodern auf. 20 Seelen schweben zu dir.'; } },
    { l:'Beten', d:'Heilt 25 % LP', f:()=>{ healPct(0.25); return 'Ein kalter Frieden erfüllt dich. Deine Wunden schließen sich.'; } } ] },
  { id:'smith', ic:'⚒️', nm:'Der Zwergenschmied', tx:'Ein Zwerg hämmert auf einem tragbaren Amboss. „Für ein paar Münzen mach ich dich gefährlicher.“', opts:r=>[
    { l:'Waffe schärfen', d:'40 Gold: +12 % Schaden', ok:r.gold>=40, f:()=>{ r.gold-=40; r.p.dmg*=1.12; return 'Funken fliegen. Deine Waffe glänzt wie neu.'; } },
    { l:'Rüstung flicken', d:'35 Gold: erlittener Schaden −2', ok:r.gold>=35, f:()=>{ r.gold-=35; r.p.armor+=2; return 'Der Zwerg nietet neue Platten an. Sitzt wie angegossen.'; } },
    { l:'Weiterziehen', d:'Du hast es eilig.', f:()=>'„Dann eben nicht!“, brummt der Zwerg.' } ] },
  { id:'chest', ic:'🧰', nm:'Die verdächtige Truhe', tx:'Eine prächtige Truhe mit Goldbeschlägen. Hat sie sich gerade bewegt?', opts:r=>[
    { l:'Öffnen', d:'Wer wagt, gewinnt … meistens.', r:'epic', f:()=>{ if(Math.random()<0.55) return ()=>showReward('treasure',showMap);
        return ()=>{ startCombat('elite',[[{kind:'mimic'},{kind:'bat'},{kind:'bat'}]]); setTimeout(()=>{ if(G) banner('Ein Mimic!','Die Truhe hat Zähne'); },60); }; } },
    { l:'Liegen lassen', d:'Truhen bewegen sich nicht. Normalerweise.', f:()=>'Als du dich umdrehst, hörst du ein enttäuschtes Knurren.' } ] },
  { id:'ghost', ic:'👻', nm:'Der Geisterhändler', tx:'Eine durchscheinende Gestalt hält dir ein leuchtendes Artefakt hin. „Nur ein kleines Stück deines Lebens …“', opts:r=>[
    { l:'Handel annehmen', d:'−20 max. LP für ein episches Upgrade', r:'epic', ok:r.p.maxHp>60, f:()=>{ r.p.maxHp-=20; r.p.hp=Math.min(r.p.hp,r.p.maxHp); return 'Kälte kriecht dir in die Knochen. '+giftUpgrade('boss','epic'); } },
    { l:'Ablehnen', d:'Dein Leben gehört dir.', f:()=>'Der Geist löst sich seufzend in Nebel auf.' } ] },
  { id:'fairy', ic:'🧚', nm:'Die Feenquelle', tx:'Eine Quelle, umschwirrt von winzigen Lichtern. Das Wasser leuchtet sanft.', opts:r=>[
    { l:'Baden', d:'Heilt dich vollständig', f:()=>{ r.p.hp=r.p.maxHp; return 'Du fühlst dich wie neugeboren.'; } },
    { l:'Wasser abfüllen', d:'+2 Neuwürfe für Upgrade-Auswahlen', r:'rare', f:()=>{ r.rerolls+=2; return 'Das Feenwasser lässt das Schicksal tanzen. +2 Neuwürfe.'; } } ] },
];
function showEvent(){
  run.seen=run.seen||[];
  let pool=EVENTS.filter(e=>!run.seen.includes(e.id)); if(!pool.length) pool=EVENTS;
  const ev=seeded(roomKey('event'),()=>pick(pool)); run.seen.push(ev.id); if(!save.stats.events.includes(ev.id)) save.stats.events.push(ev.id); checkAch();
  const opts=ev.opts(run);
  render(`<div class="wrap" style="justify-content:center"><div class="eyebrow center">Ereignis</div>
    <div style="font-size:64px;text-align:center;line-height:1">${ev.ic}</div><h2 class="center">${ev.nm}</h2><p class="sub center">${ev.tx}</p>
    <div class="row" style="gap:6px;justify-content:center"><span class="pill h">❤️ ${Math.ceil(run.p.hp)}/${Math.round(run.p.maxHp)}</span><span class="pill g">💰 ${run.gold}</span><span class="pill s">👻 ${run.souls}</span></div>
    <div class="cards">${opts.map((o,i)=>`<button class="card ${o.r||'common'} reward-card" data-a="opt" data-v="${i}" ${o.ok===false?'disabled':''}><div class="body"><div class="nm">${o.l}</div><div class="ds">${o.d}</div></div></button>`).join('')}</div></div>`,
  { opt:i=>{ const res=opts[+i].f(); if(typeof res==='function') res(); else eventResult(ev,res); } },true);
}
function eventResult(ev,text){
  render(`<div class="wrap" style="justify-content:center"><div style="font-size:48px;text-align:center;line-height:1">${ev.ic}</div><h2 class="center">${ev.nm}</h2>
    <p class="sub center" style="color:var(--parch);font-size:17px">${text}</p>
    <div class="row" style="gap:6px;justify-content:center"><span class="pill h">❤️ ${Math.ceil(run.p.hp)}/${Math.round(run.p.maxHp)}</span><span class="pill g">💰 ${run.gold}</span><span class="pill s">👻 ${run.souls}</span></div>
    <button class="btn primary" data-a="next">Weiter</button></div>`,{ next:showMap },true);
}

/* ---- Upgrades ---- */
function availUpgrades(){ return UPGRADES.filter(u=>(!u.only||u.only.includes(run.cid)) && (!u.max || (run.upg[u.id]||0)<u.max) && !(run.banned||[]).includes(u.id)); }
function rollUpgrades(n, mode, exclude=[]){
  const L=(run&&run.daily?0:metaLvl('m_luck'))*4;
  const w={ normal:[62-L,30,8+L], elite:[30-L,48,22+L], rare:[25-L,50,25+L], treasure:[10,52-L,38+L], boss:[0,45,55] }[mode]||[62,30,8];
  const pool=availUpgrades().filter(u=>!exclude.includes(u.id)&&u.r!=='cursed'), out=[];
  for(let i=0;i<n && pool.length;i++){
    let r=wpick([['common',w[0]],['rare',w[1]],['epic',w[2]]]);
    let opts=pool.filter(u=>u.r===r && !out.includes(u)); if(!opts.length) opts=pool.filter(u=>!out.includes(u)); if(!opts.length) break;
    out.push(wpick(opts.map(u=>[u,u.only?1.8:1])));   // Helden-Perks erscheinen etwas häufiger
  }
  return out;
}
function checkSyn(){ run.syn=run.syn||[]; const out=[]; for(const s of SYN){ if(!run.syn.includes(s.id) && s.req.every(r=>run.upg[r])){ run.syn.push(s.id); out.push(s); if(!save.stats.syns.includes(s.id)) save.stats.syns.push(s.id); } } if(out.length) checkAch(); return out; }
function applyUpgrade(u){ u.ap(run.p); run.upg[u.id]=(run.upg[u.id]||0)+1; sfx('pick'); return checkSyn(); }
function showSynergy(list, after){
  sfx('relic');
  render(`<div class="wrap" style="justify-content:center"><div class="eyebrow center">Zwei Kräfte verbinden sich</div><h2 class="center">Synergie entdeckt!</h2>
    <div class="cards">${list.map(s=>`<div class="card epic reward-card"><div class="ic">${s.ic}</div><div class="body"><div class="rar">Synergie · ${s.req.map(r=>UPG[r].ic).join(' + ')}</div><div class="nm">${s.nm}</div><div class="ds">${s.ds}</div></div></div>`).join('')}</div>
    <button class="btn primary" data-a="next">Weiter</button></div>`,{ next:after },true);
}
function statSheet(p){
  const c=CHARS[p.cid], s={ 'Schaden':Math.round(p.dmg), 'Angriffe/Sek':(p.atkSpd/p.rate).toFixed(2), 'Max. LP':Math.round(p.maxHp), 'Rüstung':p.armor,
    'Tempo':Math.round(p.speed*p.spdMul), 'Krit':Math.round(p.crit*100)+' %', 'Fläche':Math.round(p.area*100)+' %', 'Gold':Math.round(p.goldMul*100)+' %',
    'Geschosse':p.count, 'Fähigkeit':(c.skill.cd*p.cdMul).toFixed(1)+' s', 'Ausweichen':(1.0*p.dashCdMul).toFixed(1)+' s' };
  if(p.minions){ s['Diener']=p.minions; s['Erweckung']=Math.round(p.raise*100)+' %'; }
  if(p.regen) s['Regeneration']=p.regen.toFixed(1)+'/s'; if(p.pierce) s['Durchschlag']=p.pierce; if(p.lifeOnKill) s['LP pro Kill']=p.lifeOnKill; if(p.thorns) s['Dornen']=p.thorns; if(p.dmgTaken&&Math.abs(p.dmgTaken-1)>0.004) s['Erlittener Schaden']=(p.dmgTaken>1?'+':'−')+Math.round(Math.abs(p.dmgTaken-1)*100)+' %'; if(p.critMul&&Math.abs(p.critMul-2)>0.01) s['Krit-Schaden']=Math.round(p.critMul*100)+' %'; if(p.drain) s['LP-Verlust']=p.drain+'/s';
  return s;
}
function previewUpg(u){
  const a=statSheet(run.p), q=JSON.parse(JSON.stringify(run.p)); u.ap(q); const b=statSheet(q);
  return Object.keys(b).filter(k=>a[k]!==b[k]).map(k=>`${k} ${a[k]??0} → ${b[k]}`);
}
const synFor=s=>s.req.every(r=>!UPG[r].only||UPG[r].only.includes(run.cid));
function synHint(u){
  const done=SYN.find(s=>!hasSyn(s.id) && synFor(s) && s.req.includes(u.id) && s.req.every(r=>r===u.id||run.upg[r]));
  if(done) return `<div class="syn">${done.ic} Ergibt Synergie: ${done.nm}</div>`;
  const part=SYN.find(s=>!hasSyn(s.id) && synFor(s) && s.req.includes(u.id) && !run.upg[u.id]);
  if(part){ const other=part.req.filter(r=>r!==u.id).map(r=>UPG[r]); return `<div class="syn part">🔗 Teil von ${part.ic} ${part.nm} · fehlt: ${other.map(o=>o.ic+' '+o.nm).join(', ')}</div>`; }
  return ''; }
function statsHtml(p){ return `<div class="stats statbox">${Object.entries(statSheet(p)).map(([k,v])=>`<span>${k}<b>${v}</b></span>`).join('')}</div>`; }
function evoHtml(){ if(!run||!run.evo||!run.evo.length) return ''; const all=Object.values(EVOS).flat(); return `<div class="cards">${run.evo.map(id=>{ const e=all.find(x=>x.id===id); return e?`<div class="card epic"><div class="ic">${e.ic}</div><div class="body"><div class="rar">Waffen-Entwicklung</div><div class="nm">${e.nm}</div><div class="ds">${e.ds}</div></div></div>`:''; }).join('')}</div>`; }
function synHtml(){ if(!run||!run.syn||!run.syn.length) return ''; return `<div class="cards">${run.syn.map(id=>{ const s=SYN.find(x=>x.id===id); return `<div class="card epic"><div class="ic">${s.ic}</div><div class="body"><div class="rar">Synergie aktiv</div><div class="nm">${s.nm}</div><div class="ds">${s.ds}</div></div></div>`; }).join('')}</div>`; }
function upgCard(u,extra='',act='pick'){
  const n=run.upg[u.id]||0;
  return `<button class="card reward-card ${u.r}" data-a="${act}" data-v="${u.id}">
    <div class="ic">${u.ic}</div><div class="body"><div class="rar">${RAR[u.r]}${u.only?' · '+CHARS[u.only[0]].name:''}${n?` · Stufe ${n+1}`:''}</div><div class="nm">${u.nm}</div><div class="ds">${u.ds}</div>${(()=>{const pv=previewUpg(u); return pv.length?`<div class="pv">${pv.join(' · ')}</div>`:'';})()}${synHint(u)}</div>${extra}</button>`;
}
// Laufstand fortsetzen: unterbrochenen Kampfraum neu starten bzw. offene Belohnung zeigen
function resumeRun(){
  if(run.won && !run.endless && !run.pend){ showVictory(); return; }
  if(run.room && run.p.hp>0){ const t=run.room; toast('<b>Raum wird neu gestartet</b>'); startCombat(t); return; }
  if(run.pend){ const a={map:showMap,relic:()=>showRelicPick(showMap,'Beute des Champions','Der Champion hinterlässt ein Relikt.'),next:()=>showEvo(nextAct),victory:showVictory}[run.pend.after]||showMap; if(run.pend.mode==='evo') showEvo(nextAct); else if(run.pend.mode==='treasure') showTreasure(); else showReward(run.pend.mode,a); return; }
  showMap();
}
function showReward(mode, after, offer, banMode){
  state='ui'; if(!offer) run.idolUsed=false; if(!after.wrapped){ const a0=after; after=()=>{ if(run) run.pend=null; a0(); }; after.wrapped=true; }
  if(mode==='gold'||mode==='heal') return showBounty(mode, after);
  offer = offer || seeded(roomKey('reward')+'|'+run.rooms,()=>{ const o=rollUpgrades(hasRelic('r_coin')?4:3, mode); const cur=availUpgrades().filter(u=>u.r==='cursed');
    if(mode!=='normal' && cur.length && o.length>=3 && RNG()<0.35) o[o.length-1]=pick(cur); return o; });
  const title={ normal:'Sieg!', rare:'Seltene Beute!', elite:'Elite bezwungen!', treasure:'Ein Schatz!', boss:'Der Boss ist gefallen!' }[mode];
  render(`<div class="wrap"><div class="eyebrow">Wähle eine Belohnung</div><h2>${title}</h2>
    <div class="row" style="gap:6px"><span class="pill h">❤️ ${Math.ceil(run.p.hp)}/${Math.round(run.p.maxHp)}</span><span class="pill g">💰 ${run.gold}</span></div>
    ${banMode?`<p class="sub" style="color:#ffb3ad">Tippe ein Upgrade an, um es für diesen Lauf zu verbannen. Es wird ersetzt und taucht nie wieder auf.</p>`:''}
    <div class="cards">${offer.map(u=>upgCard(u,'',banMode?'ban':'pick')).join('')}</div>
    <div class="row">${hasRelic('r_idol')&&!run.idolUsed&&!banMode?`<button class="btn" data-a="idol">🗿 Gratis neu würfeln</button>`:''}${run.rerolls>0&&!banMode?`<button class="btn" data-a="reroll">🎲 Neu würfeln (${run.rerolls})</button>`:''}
      ${(run.bans??1)>0?`<button class="btn ${banMode?'danger':''}" data-a="banm">${banMode?'Abbrechen':'🚫 Verbannen ('+(run.bans??1)+')'}</button>`:''}
      ${banMode?'':`<button class="btn" data-a="skip">Überspringen (+15 💰)</button>`}</div></div>`,
  { pick:id=>{ const ns=applyUpgrade(UPG[id]); ns.length?showSynergy(ns,after):after(); },
    reroll:()=>{ run.rerolls--; showReward(mode, after, rollUpgrades(offer.length,mode,offer.map(u=>u.id))); },
    idol:()=>{ run.idolUsed=true; showReward(mode, after, rollUpgrades(offer.length,mode,offer.map(u=>u.id))); },
    banm:()=>showReward(mode, after, offer, !banMode),
    ban:id=>{ run.banned=run.banned||[]; run.banned.push(id); run.bans=(run.bans??1)-1; const rep=rollUpgrades(1,mode,offer.map(u=>u.id))[0];
      const no=offer.map(u=>u.id===id?rep:u).filter(Boolean); sfx('banish'); showReward(mode, after, no, false); },
    skip:()=>{ run.gold+=15; after(); } },true);
}

// Belohnung statt Upgrade (auf der Karte angekündigt)
function showBounty(mode, after){
  const p=run.p; let txt;
  if(mode==='gold'){ const g=Math.round((70+20*run.act)*(1+0.1*(run.ng||0))); run.gold+=g; run.goldTotal+=g; txt=`Du findest einen prall gefüllten Beutel: <b style="color:var(--gold)">+${g} Gold</b>.`; sfx('buy'); }
  else { const h=Math.round(p.maxHp*(tierHas(9)?0.2:0.4)); p.maxHp+=5; p.hp=Math.min(p.maxHp,p.hp+h+5); txt=`Eine Heilquelle sprudelt in der Arena: <b style="color:#7dff8a">+${h} LP</b> und dauerhaft +5 max. LP.`; sfx('pick'); }
  render(`<div class="wrap" style="justify-content:center"><div class="eyebrow center">Belohnung</div><h2 class="center">${mode==='gold'?'💰 Goldfund':'❤️ Heilquelle'}</h2>
    <p class="sub center" style="font-size:17px;color:var(--parch)">${txt}</p>
    <div class="row" style="gap:6px;justify-content:center"><span class="pill h">❤️ ${Math.ceil(p.hp)}/${Math.round(p.maxHp)}</span><span class="pill g">💰 ${run.gold}</span></div>
    <button class="btn primary" data-a="next">Weiter</button></div>`,{ next:after },true);
}
// Waffen-Entwicklung nach einem Boss: eine von zwei Verwandlungen des Grundangriffs
function showEvo(after){
  const all=EVOS[run.cid]||[], left=all.filter(e=>!(run.evo||[]).includes(e.id));
  if(!left.length){ after(); return; }
  const offer=seeded(roomKey('evo')+'|'+run.act,()=>shuffle(left.slice()).slice(0,2));
  run.pend={mode:'evo',after:'next'}; save.run=run; persist();
  render(`<div class="wrap"><div class="eyebrow">Die Waffenschmiede der Arena</div><h2>Waffe entwickeln</h2>
    <p class="sub">Dein Grundangriff verwandelt sich dauerhaft für diesen Lauf. Wähle weise – es gibt nur eine Wahl pro Boss.</p>
    <div class="cards">${offer.map(e=>`<button class="card epic reward-card" data-a="evo" data-v="${e.id}"><div class="ic">${e.ic}</div><div class="body"><div class="rar">Entwicklung · ${CHARS[run.cid].name}</div><div class="nm">${e.nm}</div><div class="ds">${e.ds}</div></div></button>`).join('')}</div></div>`,
  { evo:id=>{ run.evo=run.evo||[]; run.evo.push(id); const p=run.p;
      if(id==='n_grave') p.raise+=0.25; if(id==='b_rage') p.furyMax=15;
      if(!save.stats.evos) save.stats.evos=[]; if(!save.stats.evos.includes(id)) save.stats.evos.push(id);
      run.pend=null; sfx('relic'); after(); } },true);
}
function showShop(stock){
  if(!stock){
    const tm=(tierHas(7)?1.3:1)*(hasRelic('r_crown')?0.85:1), priceOf=u=>Math.round(({common:45,rare:80,epic:130,cursed:60})[u.r]*(1+0.15*(run.act-1))*(run.p.shopMul||1)*tm);
    stock={ items:seeded(roomKey('shop'),()=>{ const o=rollUpgrades(4,'elite'); const cur=availUpgrades().filter(u=>u.r==='cursed'); if(cur.length && RNG()<0.3) o.push(pick(cur)); return o; }).map(u=>({id:u.id, price:priceOf(u), sold:false})), potion:{price:Math.round((30+run.act*5)*(run.p.shopMul||1)*tm), sold:false} };
    const rl=relicsLeft(); if(rl.length) stock.relic={id:seeded(roomKey('shoprelic'),()=>pick(rl)).id, price:Math.round((140+25*run.act)*(run.p.shopMul||1)*tm), sold:false};
  }
  const p=run.p;
  const potionHeal=Math.round(p.maxHp*(tierHas(9)?0.2:0.4));
  render(`<div class="wrap"><div class="eyebrow">Ein wandernder Händler</div><h2>Der Händler</h2>
    <p class="sub">„Feine Waren für tapfere Seelen. Nur Gold, keine Schuldscheine."</p>
    <div class="row" style="gap:6px"><span class="pill h">❤️ ${Math.ceil(p.hp)}/${Math.round(p.maxHp)}</span><span class="pill g">💰 ${run.gold}</span></div>
    <div class="cards">
      <button class="card common" data-a="potion" ${stock.potion.sold||run.gold<stock.potion.price||p.hp>=p.maxHp?'disabled':''}>
        <div class="ic">🧪</div><div class="body"><div class="rar">Verbrauchsgut</div><div class="nm">Heiltrank</div><div class="ds">Heilt ${potionHeal} LP</div></div>
        <span class="pill g price">${stock.potion.sold?'Verkauft':stock.potion.price+' 💰'}</span></button>
      ${stock.relic?(()=>{ const r=REL[stock.relic.id]; return relicCard(r,'brel').replace('reward-card','')+''; })().replace('</button>',`<span class="pill g price">${stock.relic.sold?'Verkauft':stock.relic.price+' 💰'}</span></button>`).replace('data-a="brel"','data-a="brel"'+(stock.relic.sold||run.gold<stock.relic.price?' disabled':'')):''}
      ${stock.items.map((it,i)=>{ const u=UPG[it.id]; const html=upgCard(u,`<span class="pill g price">${it.sold?'Verkauft':it.price+' 💰'}</span>`,'buy').replace('data-v="'+u.id+'"','data-v="'+i+'"'+(it.sold||run.gold<it.price?' disabled':'')); return html; }).join('')}
    </div>
    <button class="btn primary" data-a="leave">Weiterziehen</button></div>`,
  { potion:()=>{ run.gold-=stock.potion.price; stock.potion.sold=true; p.hp=Math.min(p.maxHp,p.hp+potionHeal); sfx('buy'); showShop(stock); },
    brel:()=>{ const s=stock.relic; if(s.sold||run.gold<s.price) return; run.gold-=s.price; s.sold=true; gainRelic(s.id); showShop(stock); },
    buy:i=>{ const it=stock.items[+i]; if(it.sold||run.gold<it.price) return; run.gold-=it.price; it.sold=true; const ns=applyUpgrade(UPG[it.id]); ns.length?showSynergy(ns,()=>showShop(stock)):showShop(stock); },
    leave:showMap },true);
}

function showRest(){
  const p=run.p, heal=Math.round(p.maxHp*((tierHas(4)?0.25:0.4)+(hasRelic('r_chalice')?0.15:0)));
  render(`<div class="wrap" style="justify-content:center"><div class="eyebrow">Ein ruhiger Ort</div><h2>Das Lagerfeuer</h2>
    <p class="sub">Die Flammen knistern. Du hast Zeit für genau eine Sache.</p>
    <span class="pill h" style="align-self:flex-start">❤️ ${Math.ceil(p.hp)}/${Math.round(p.maxHp)}</span>
    <div class="cards">
      <button class="card common" data-a="heal" ${(runMod()||{}).noRestHeal||p.noRest?'disabled':''}><div class="ic">😴</div><div class="body"><div class="nm">Ausruhen</div><div class="ds">${(runMod()||{}).noRestHeal?'Der Blutmond verhindert jede Heilung.':p.noRest?'Der Blutpakt verweigert dir die Ruhe.':'Heilt '+heal+' LP'}</div></div></button>
      <button class="card rare" data-a="train"><div class="ic">🏋️</div><div class="body"><div class="nm">Trainieren</div><div class="ds">+10 max. LP und +8 % Schaden</div></div></button>
      ${Object.keys(run.upg).some(id=>UPG[id]&&UPG[id].r==='cursed')?`<button class="card cursed" data-a="purge"><div class="ic">🕯️</div><div class="body"><div class="nm">Läutern</div><div class="ds">Entferne einen Fluch samt seinem Vorteil.</div></div></button>`:''}
    </div></div>`,
  { purge:()=>{ const list=Object.keys(run.upg).filter(id=>UPG[id]&&UPG[id].r==='cursed');
      render(`<div class="wrap" style="justify-content:center"><h2>Welchen Fluch läutern?</h2><div class="cards">${list.map(id=>upgCard(UPG[id],'','rm')).join('')}</div><button class="btn" data-a="back">Zurück</button></div>`,
      { rm:id=>{ const up=UPG[id]; if(up.un) up.un(run.p); delete run.upg[id]; run.p.hp=Math.min(run.p.hp,run.p.maxHp); sfx('relic'); toast(`<span style="font-size:24px">🕯️</span><div><b>${up.nm}</b> wurde geläutert.</div>`); showMap(); }, back:showRest },true); },
    heal:()=>{ p.hp=Math.min(p.maxHp,p.hp+heal); sfx('pick'); showMap(); },
    train:()=>{ p.maxHp+=10; p.hp+=10; p.dmg*=1.08; sfx('pick'); showMap(); } },true);
}

