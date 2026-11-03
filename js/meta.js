'use strict';
/* Arena der Verdammten – Langzeitmotivation: Verdammnis-Stufen, Herausforderungen, Kopfgelder,
   Tages- und Wochenprüfung mit Serie und Teilen, Arenameister, Meisterschaft im Bestiarium */

/* ---------------- VERDAMMNIS-STUFEN ---------------- */
const tierWon = cid => { const t=(save.tierWon||{})[cid]; return t===undefined?-1:t; };
const tierOpen = cid => Math.min(TIER_MAX, tierWon(cid)+1);
function tierRow(cid){
  const w=tierWon(cid); let h='';
  for(let t=0;t<=TIER_MAX;t++) h+=`<span class="tdot ${t<=w?'won':t===w+1?'open':''}" style="${t<=w?'background:'+tierColor(t):''}" title="${TIERS[t].nm}">${t<=w?'✓':t}</span>`;
  return `<div class="trow">${h}</div>`;
}
function showTiers(back){
  const heroes=Object.keys(CHARS);
  render(`<div class="wrap"><div class="eyebrow">Verdammnis-Stufen</div><h2>Der Pfad der Verdammnis</h2>
    <p class="sub" style="font-size:14px">Gewinnst du mit einem Helden, schaltet sich für ihn die nächste Stufe frei. Jede Stufe fügt eine Regel hinzu und bringt +15 % Seelen und Punkte. Deine höchste Stufe zeigt sich als Aura um deinen Helden.</p>
    <div class="cards">${heroes.map(id=>`<div class="card" style="border-color:${tierColor(tierWon(id))}"><div class="ic">${CHARS[id].icon}</div><div class="body"><div class="nm">${CHARS[id].name}</div><div class="ds">${tierWon(id)<0?'Noch kein Sieg':'Höchste Stufe: '+tierWon(id)+' · '+TIERS[tierWon(id)].nm}</div>${tierRow(id)}</div></div>`).join('')}</div>
    <div class="eyebrow" style="margin-top:6px">Die Regeln (sie addieren sich)</div>
    <div class="cards">${TIERS.slice(1).map((t,i)=>`<div class="card"><div class="ic">${t.ic}</div><div class="body"><div class="rar" style="color:${tierColor(i+1)}">Stufe ${i+1}</div><div class="nm">${t.nm}</div><div class="ds">${t.ds}</div></div></div>`).join('')}</div>
    <button class="btn" data-a="back">Zurück</button></div>`,{ back });
}

/* ---------------- HERAUSFORDERUNGEN ---------------- */
const chalDone = id => !!(save.chal||{})[id];
const chalOpen = i => i<4 || chalDone(CHALLENGES[i-1].id) || chalDone(CHALLENGES[i].id);
function showChallenges(){
  const heroes=Object.keys(CHARS).filter(id=>save.unlocked[id]);
  const sel=save.chalHero&&save.unlocked[save.chalHero]?save.chalHero:save.lastChar;
  const done=CHALLENGES.filter(c=>chalDone(c.id)).length;
  render(`<div class="wrap"><div class="eyebrow">${done} von ${CHALLENGES.length} bestanden</div><h2>Herausforderungen</h2>
    <p class="sub" style="font-size:14px">Läufe mit festen Sonderregeln. Gewinne sie mit einem beliebigen Helden. Jede bestandene Herausforderung schaltet die nächste frei.</p>
    <div class="eyebrow">Held</div><div class="skinrow">${heroes.map(id=>`<button class="skin ${id===sel?'sel':''}" data-a="hero" data-v="${id}">${CHARS[id].icon} ${CHARS[id].name}</button>`).join('')}</div>
    <div class="cards">${CHALLENGES.map((c,i)=>{ const open=chalOpen(i), ok=chalDone(c.id), ms=c.mods.map(m=>MOD_LIST.find(x=>x.id===m));
      return `<button class="card ${ok?'rare':open?'epic':''}" data-a="${open?'go':'x'}" data-v="${c.id}" ${open?'':'disabled'}><div class="ic">${open?c.ic:'🔒'}</div><div class="body"><div class="rar">${ok?'✓ Bestanden':open?'Offen':'Gesperrt'}</div><div class="nm">${c.nm}</div>
        <div class="ds">${ms.map(m=>`${m.ic} ${m.ds}`).join('<br>')}</div></div><span class="pill s price">${ok?'✓':'+'+c.souls+' 👻'}</span></button>`; }).join('')}</div>
    <button class="btn" data-a="back">Zurück</button></div>`,
  { back:showMenu, hero:id=>{ save.chalHero=id; persist(); showChallenges(); }, x:()=>{},
    go:id=>{ const go=()=>startRun(sel,{challenge:id}); save.introSeen?go():showIntro(go); } });
}

/* ---------------- KOPFGELDER ---------------- */
// Drei wechselnde Aufträge pro Tag, für alle Spielstände gleich gewürfelt
function bountyList(key){
  const heroes=Object.keys(CHARS).filter(id=>save.unlocked[id]), bosses=Object.keys(BOSSES);
  return seeded('bounty|'+key+'|'+heroes.join(','),()=>{ const out=[], kinds=shuffle(['win','boss','act','elites','kills','syn']);
    for(const k of kinds.slice(0,3)){ const h=pick(heroes);
      if(k==='win') out.push({k, cid:h, tier:Math.min(tierOpen(h),Math.max(0,tierWon(h))), souls:90, txt:`Gewinne einen Lauf mit ${CHARS[h].icon} ${CHARS[h].name}`});
      else if(k==='boss'){ const b=pick(bosses); out.push({k, boss:b, souls:60, txt:`Besiege ${BOSSES[b].name}`}); }
      else if(k==='act') out.push({k, cid:h, act:2, souls:50, txt:`Erreiche Akt 2 mit ${CHARS[h].icon} ${CHARS[h].name}`});
      else if(k==='elites') out.push({k, n:4, souls:50, txt:'Besiege 4 Elitegegner in einem Lauf'});
      else if(k==='kills') out.push({k, n:150, souls:50, txt:'Besiege 150 Gegner in einem Lauf'});
      else out.push({k, souls:60, txt:'Löse in einem Lauf zwei Synergien aus'}); }
    return out; });
}
function bountyState(){ const key=todayKey(); if(!save.bounty||save.bounty.key!==key) save.bounty={key,done:[]}; return save.bounty; }
// Nach jedem Lauf prüfen, welche Aufträge erfüllt sind
function checkBounties(r,won){
  const st=bountyState(), list=bountyList(st.key), got=[];
  list.forEach((b,i)=>{ if(st.done.includes(i) || r.daily) return; let ok=false;
    if(b.k==='win') ok=won && r.cid===b.cid; else if(b.k==='boss') ok=(r.bossKills||[]).includes(b.boss); else if(b.k==='act') ok=r.cid===b.cid && (r.act>=b.act||won);
    else if(b.k==='elites') ok=(r.elites||0)>=b.n; else if(b.k==='kills') ok=r.kills>=b.n; else if(b.k==='syn') ok=(r.syn||[]).length>=2;
    if(ok){ st.done.push(i); save.souls+=b.souls; got.push(b); } });
  return got;
}
function bountyHtml(){
  const st=bountyState(), list=bountyList(st.key);
  return `<div class="bounties"><div class="eyebrow">📜 Kopfgelder des Tages</div>${list.map((b,i)=>`<div class="bty ${st.done.includes(i)?'done':''}"><span>${st.done.includes(i)?'✓':'•'} ${b.txt}</span><b>${st.done.includes(i)?'erledigt':'+'+b.souls+' 👻'}</b></div>`).join('')}</div>`;
}

/* ---------------- TAGES- UND WOCHENPRÜFUNG ---------------- */
function dayDiff(a,b){ return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000); }
function dailyRecord(key,score,won,act){
  const H=save.dailyHist=save.dailyHist||{}; const first=!H[key];
  const e=H[key]||{best:0,first:0,tries:0,won:false,act:0}; e.tries++; if(first) e.first=score; e.best=Math.max(e.best,score); e.won=e.won||won; e.act=Math.max(e.act,act); H[key]=e;
  if(first){ const s=save.streak||{n:0,last:null}; s.n=(s.last && dayDiff(s.last,key)===1)?s.n+1:(s.last===key?s.n:1); s.last=key; s.best=Math.max(s.best||0,s.n); save.streak=s; }
  const keys=Object.keys(H).sort(); if(keys.length>60) for(const k of keys.slice(0,keys.length-60)) delete H[k];
  return {first, e};
}
function streakNow(){ const s=save.streak; if(!s||!s.last) return 0; const d=dayDiff(s.last,todayKey()); return d<=1?s.n:0; }
function calendarHtml(){
  const H=save.dailyHist||{}, out=[]; const d=new Date();
  for(let i=13;i>=0;i--){ const t=new Date(d); t.setDate(d.getDate()-i); const k=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); const e=H[k];
    out.push(`<span class="cal ${e?(e.won?'won':'played'):''} ${i===0?'today':''}" title="${k}">${t.getDate()}</span>`); }
  return `<div class="calrow">${out.join('')}</div>`;
}
function shareText(key, e, label){
  const acts=[1,2,3].map(a=>e.won||e.act>a?'🟩':e.act===a?'🟥':'⬛').join('');
  const url=(location.protocol.startsWith('http')?location.origin+location.pathname:'')+'?tag='+encodeURIComponent(key);
  return `Arena der Verdammten · ${label}\n${acts} ${e.won?'👑 Sieg':'Akt '+e.act} · ${e.best} Punkte\nErster Versuch: ${e.first} · Serie: ${streakNow()} 🔥${url.startsWith('http')?'\n'+url:''}`;
}
function shareResult(text){
  if(navigator.share){ navigator.share({text}).catch(()=>{}); return; }
  try{ navigator.clipboard.writeText(text).then(()=>toast('<b>In die Zwischenablage kopiert</b>'),()=>toast('<b>Kopieren nicht möglich</b>')); }catch(e){ toast('<b>Kopieren nicht möglich</b>'); }
}
function showDaily(){
  const key=todayKey(), info=dailyInfo(key), c=CHARS[info.cid], m=info.mod, H=save.dailyHist||{}, e=H[key];
  const wk=weekKey(), wi=weeklyInfo(wk), wc=CHARS[wi.cid], we=H[wk], wms=wi.mods.map(id=>MOD_LIST.find(x=>x.id===id));
  const date=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
  const portrait=(cid,col)=>`<div class="ic port" style="background:radial-gradient(circle at 50% 40%,${col}88,#0008 75%)"><canvas data-port="hero:${cid}" data-size="46"></canvas></div>`;
  render(`<div class="wrap"><div class="eyebrow">Tägliche Herausforderung · ${date}</div><h2>Die Prüfung des Tages</h2>
    <p class="sub">Heute spielen alle dieselben Karten, Räume und Belohnungen. Schmiede-Upgrades gelten hier nicht. Gezählt wird dein erster Versuch und dein bester.</p>
    <div class="row" style="gap:6px"><span class="pill g">🔥 Serie: ${streakNow()} ${streakNow()===1?'Tag':'Tage'}</span><span class="pill">Rekord-Serie: ${(save.streak||{}).best||0}</span></div>
    ${calendarHtml()}
    <div class="cards">
      <div class="card" style="border-color:${c.color}">${portrait(info.cid,c.color)}<div class="body"><div class="rar">Held des Tages</div><div class="nm">${c.name}</div><div class="ds">${c.desc}</div></div></div>
      <div class="card epic"><div class="ic">${m.ic}</div><div class="body"><div class="rar">Modifikator</div><div class="nm">${m.nm}</div><div class="ds">${m.ds}</div></div></div>
    </div>
    <div class="row" style="gap:6px"><span class="pill g">🏆 Bester: ${e?e.best:0}</span><span class="pill">Erster Versuch: ${e?e.first:'–'}</span><span class="pill">Versuche: ${e?e.tries:0}</span></div>
    <button class="btn primary" data-a="go">Prüfung des Tages starten</button>
    ${e?`<button class="btn" data-a="share">📤 Ergebnis teilen</button>`:''}
    <div class="eyebrow" style="margin-top:10px">Wochenprüfung · ${wk.replace('W','Woche ').replace('-',' / ')}</div>
    <div class="cards">
      <div class="card" style="border-color:${wc.color}">${portrait(wi.cid,wc.color)}<div class="body"><div class="rar">Held der Woche</div><div class="nm">${wc.name}</div>
        <div class="ds">${wms.map(x=>x.ic+' '+x.ds).join('<br>')}</div></div></div></div>
    <div class="row" style="gap:6px"><span class="pill g">🏆 Bester: ${we?we.best:0}</span><span class="pill">Versuche: ${we?we.tries:0}</span></div>
    <button class="btn" data-a="week">Wochenprüfung starten</button>
    <button class="btn" data-a="back">Zurück</button></div>`,
  { go:()=>startRun(info.cid,{daily:key}), week:()=>startRun(wi.cid,{daily:wk}), back:showMenu, share:()=>shareResult(shareText(key,e,'Prüfung vom '+key)) });
}

/* ---------------- ARENAMEISTER ---------------- */
// Ein Ansager, der auf vergangene Läufe reagiert (wiederkehrende Erzählung über viele Läufe)
const AM_LINES = {
  first:['Frisches Blut! Das Publikum liebt Neulinge – meistens nur ziemlich kurz.','Willkommen in meiner Arena. Kämpfe gut, stirb spektakulär.'],
  win:['{held} hat den Himmelsturm bezwungen! Die Barden schreiben schon. Aber hast du Mut für die nächste Verdammnis-Stufe?','Ein Sieg! Die Menge tobt noch immer. Ich kann das Gold förmlich klingeln hören.'],
  boss:{ golem:['Der Golem hat dich zerquetscht wie eine Weintraube. Tipp: Seine Steinkreise sieht man kommen.','Stein schlägt Fleisch – so war es zuletzt. Weiche den Kreisen aus und schlag zu, wenn er Felsen wirft.'],
    spider:['Die Spinnenkönigin hat dich eingewickelt. Ihre Netze verlangsamen – bleib aus ihnen heraus!','Spinnweben im Haar, Gift im Blut. Die Königin war zuletzt schneller.'],
    lich:['Der Lichkönig hat deine Seele beinahe behalten. Seine Spiralen haben Lücken – such sie!','Untot und unbeeindruckt. Der Lich lacht noch über deinen letzten Versuch.'],
    vampire:['Graf Morvath hat sich an dir sattgetrunken. Wenn er zu Nebel wird, lauf!','Der Vampir lässt grüßen. Er sagt, dein Blut war … mittelmäßig.'],
    dragon:['Ignaroth hat dich geröstet. Unter seinen Flügeln ist es übrigens am sichersten.','Fast! Der Drache hat geschwitzt. Na gut, Drachen schwitzen nicht. Aber fast!'],
    lavaworm:['Der Lavawurm hat dich verschluckt. Achte auf das Beben, bevor er auftaucht.','Heiße Sache, dein letzter Lauf. Leider vor allem für dich.'] },
  enemy:['{gegner} hat dich zuletzt erwischt. Peinlich! Das Publikum spricht von nichts anderem.','Ausgerechnet {gegner}! Das hätte ich nicht gedacht. Na los, Revanche!'],
  early:['Akt 1, schon vorbei? Die Zuschauer hatten kaum ihr Bier geöffnet.','Kurzer Auftritt. Versuch es mal mit einem anderen Weg auf der Karte.'],
  streak:['Dreimal in Folge gefallen … Brauchst du eine Pause? Im Menü gibt es einen Hilfemodus, ich verrate es niemandem.','Die Schmiede nimmt Seelen an. Vielleicht wäre jetzt ein guter Moment.'],
  random:['Heute ist ein guter Tag zum Sterben. Für dich, meine ich.','Die Tribünen sind voll. Enttäusche sie nicht!','Hast du schon die Tagesprüfung versucht? Jeder spielt dieselbe Karte.','Synergien sind wie Freundschaften: Zwei Upgrades, die sich gut verstehen.'],
};
function amPick(list,seed){ return list[hashStr(seed)%list.length]; }
function arenaMasterLine(){
  const L=save.lastRun, seed=todayKey()+'|'+save.runs;
  let t;
  if(!save.runs) t=amPick(AM_LINES.first,seed);
  else if(!L) t=amPick(AM_LINES.random,seed);
  else if(L.won) t=amPick(AM_LINES.win,seed);
  else if((save.lossStreak||0)>=3) t=amPick(AM_LINES.streak,seed);
  else if(L.killer && AM_LINES.boss[L.killer]) t=amPick(AM_LINES.boss[L.killer],seed);
  else if(L.act===1 && L.rooms<3) t=amPick(AM_LINES.early,seed);
  else if(L.killer && ENEMIES[L.killer]) t=amPick(AM_LINES.enemy,seed).replace('{gegner}',ENEMIES[L.killer].name);
  else t=amPick(AM_LINES.random,seed);
  return t.replace('{held}',L&&CHARS[L.cid]?CHARS[L.cid].name:'Ein Held');
}
function arenaMasterHtml(){ return `<div class="am"><div class="amface">🎭</div><div><div class="eyebrow" style="color:var(--gold)">Der Arenameister</div><div class="amtxt">„${esc(arenaMasterLine())}“</div></div></div>`; }

/* ---------------- MEISTERSCHAFT IM BESTIARIUM ---------------- */
// Wissen ist Macht: wer eine Gegnerart oft besiegt, trifft sie härter (kleiner, dauerhafter Bonus)
const MASTERY=[[25,1.05,'★'],[100,1.1,'★★'],[300,1.15,'★★★']];
function masteryOf(kind){ const n=(save.stats.beast||{})[kind]||0; let r=null; for(const m of MASTERY) if(n>=m[0]) r=m; return r; }
const masteryMul = kind => { const m=masteryOf(kind); return m?m[1]:1; };

/* ---------------- CHRONIK ---------------- */
function unlockLore(id){ const L=LORE.find(l=>l.id===id); if(!L) return; save.lore=save.lore||{}; if(save.lore[id]) return; save.lore[id]=Date.now(); persist();
  setTimeout(()=>toast(`<span style="font-size:26px">📜</span><div><div class="eyebrow" style="color:var(--gold)">Neuer Chronik-Eintrag</div><b>${L.ic} ${L.nm}</b><div class="sub" style="font-size:13px">Nachzulesen im Kodex</div></div>`),900); }
function loreHtml(){ const S=save.lore||{}, n=LORE.filter(l=>S[l.id]).length;
  return `<p class="sub" style="font-size:14px">${n} von ${LORE.length} Einträgen. Neue Einträge schaltest du frei, indem du Akte erreichst, Bosse besiegst und mit Helden gewinnst.</p>
  <div class="cards">${LORE.map(l=>S[l.id]?`<div class="card rare"><div class="ic">${l.ic}</div><div class="body"><div class="nm">${l.nm}</div><div class="ds" style="color:var(--parch)">${l.tx}</div></div></div>`
    :`<div class="card" style="opacity:.7"><div class="ic">🔒</div><div class="body"><div class="nm">???</div><div class="ds">${l.hint}</div></div></div>`).join('')}</div>`; }
function heroLine(cid,kind){ const H=HERO_LINES[cid]; if(!H) return ''; return kind==='win'?H.win:H.boss[hashStr((run&&run.seed||'')+'|'+(run&&run.act))%H.boss.length]; }
