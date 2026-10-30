'use strict';
// Oberfläche: Hauptmenü, HUD, Seitenleiste, Auswahl und Eingabe.
(function () {
  const UI = (G.UI = { tab: 'bauen', selected: null, placing: null, casting: null, pickTarget: false, pointerDownPanel: false, menuTab: 'frei', mission: 0 });
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => Math.floor(n).toLocaleString('de-DE');
  const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, '0')} min` : `${s} s`; };
  const costHtml = (c) => `<span class="c-g">${fmt(c.g)}</span> <span class="c-w">${fmt(c.w)}</span>`;
  const me = () => G.S.players[0];
  const esc = (s) => String(s).replace(/"/g, '&quot;');
  const Prof = () => G.Profile;

  // -------------------------------------------------------------------------
  // Hauptmenü
  UI.cfg = { race: 'menschen', hero: null, mode: '1v1', difficulty: 'mittel', map: 'heimat', duration: 30 };

  UI.showMenu = function () {
    $('#menu').classList.remove('hidden');
    $('#game').classList.add('hidden');
    $('#end').classList.add('hidden');
    if (G.Audio) G.Audio.setTheme(null);
    renderMenu();
  };

  const opt = (act, cur, list) => list.map(([v, n, d, dis]) => `<button class="opt ${cur === v ? 'sel' : ''}" data-act="${act}" data-v="${v}" ${dis ? 'disabled' : ''}>${n}${d ? `<small>${d}</small>` : ''}</button>`).join('');

  function raceCards(c) {
    return G.RACE_KEYS.map((k) => {
      const r = G.RACES[k], lvl = Prof().raceLevel(k);
      return `<button class="card race ${c.race === k ? 'sel' : ''}" data-act="m-race" data-v="${k}" style="--rc:${r.color};--rd:${r.dark}">
        <div class="crest" style="background:${r.color}"><span>${r.name[0]}</span></div><span class="lvlbadge">Stufe ${lvl} · ${G.titleFor(lvl)}</span>
        <h3>${r.name}</h3><p>${r.desc}</p>
        <div class="kv"><b>Passiv:</b> ${r.passive.name} – ${r.passive.desc}</div>
        <div class="kv"><b>Volksfähigkeiten:</b> ${r.abilities.map((a) => a.name).join(' · ')}</div>
        <div class="kv"><b>Heimat:</b> ${r.map.name}</div></button>`;
    }).join('') + `<button class="card race ${c.race === 'zufall' ? 'sel' : ''}" data-act="m-race" data-v="zufall" style="--rc:#888;--rd:#333">
        <div class="crest" style="background:linear-gradient(135deg,#d6c39a,#9fd18c,#a9b5ac,#7aa04a,#c99a6a,#c0484a)"><span>?</span></div>
        <h3>Zufall</h3><p>Das Schicksal entscheidet über dein Volk und deinen Helden.</p></button>`;
  }
  function heroCards(c) {
    if (c.race === 'zufall') return '<p class="note">Bei zufälligem Volk wird auch der Held zufällig bestimmt.</p>';
    const rd = G.RACES[c.race];
    if (c.hero !== 'zufall' && !rd.heroes.find((h) => h.id === c.hero)) c.hero = rd.heroes[0].id;
    if (c.hero !== 'zufall' && !Prof().heroUnlocked(c.race, rd.heroes.find((h) => h.id === c.hero))) c.hero = rd.heroes[0].id;
    return rd.heroes.map((h) => { const ok = Prof().heroUnlocked(c.race, h); return `<button class="card hero ${c.hero === h.id ? 'sel' : ''} ${ok ? '' : 'locked'}" data-act="m-hero" data-v="${h.id}" ${ok ? '' : `disabled title="Freischaltung ab Volksstufe ${G.UNLOCK_HERO_LVL}"`} style="--rc:${rd.color};--rd:${rd.dark}">${ok ? '' : `<span class="lvlbadge">🔒 ab Volksstufe ${G.UNLOCK_HERO_LVL}</span>`}
        <div class="crest small" style="background:${rd.color}"><span>${h.name.split(' ').pop()[0]}</span></div>
        <h3>${h.name}</h3><div class="sub">${h.title} · ${h.ranged ? 'Fernkampf' : 'Nahkampf'}</div>
        <div class="kv"><b>Commander-Bonus:</b> ${h.bonusDesc}</div>
        <div class="kv"><b>Fähigkeiten:</b> ${h.abilities.map((a) => a.name).join(', ')}</div></button>`; }).join('')
      + `<button class="card hero ${c.hero === 'zufall' ? 'sel' : ''}" data-act="m-hero" data-v="zufall" style="--rc:#888;--rd:#333"><div class="crest small" style="background:#777"><span>?</span></div><h3>Zufälliger Held</h3></button>`;
  }
  function skinRow(c) {
    if (c.race === 'zufall') return '';
    const cur = Prof().data.skin[c.race] || 'standard';
    return `<div class="skins"><b>Skin:</b> ${G.SKINS.map((s) => {
      const ok = Prof().skinUnlocked(c.race, s.id);
      return `<button class="chip ${cur === s.id ? 'sel' : ''}" data-act="m-skin" data-v="${s.id}" ${ok ? '' : `disabled title="Freischaltung ab Volksstufe ${s.lvl}"`}>${ok ? '' : '🔒 '}${s.name}</button>`;
    }).join('')} <b>Banner:</b> ${G.BANNERS.map((bn) => {
      const ok = Prof().bannerUnlocked(c.race, bn.id), curB = Prof().data.banner[c.race] || 'standard';
      return `<button class="chip ${curB === bn.id ? 'sel' : ''}" data-act="m-banner" data-v="${bn.id}" ${ok ? '' : `disabled title="Freischaltung ab Volksstufe ${bn.lvl}"`}>${ok ? '' : '🔒 '}${bn.name}</button>`;
    }).join('')}</div>`;
  }

  function renderMenu() {
    const c = UI.cfg;
    const tabs = [['frei', 'Freies Spiel'], ['kampagne', 'Kampagne'], ['voelker', 'Völker & Skins'], ['hilfe', 'Anleitung'], ['optionen', 'Einstellungen']];
    let body = `<nav class="menutabs">${tabs.map(([k, n]) => `<button class="${UI.menuTab === k ? 'sel' : ''}" data-act="m-tab" data-v="${k}">${n}</button>`).join('')}</nav>`;
    if (UI.menuTab === 'frei') {
      const maps = [['heimat', 'Heimatkarte', 'Karte deines Volkes'], ['zufall', 'Zufall', '']].concat(Object.keys(G.THEMES).map((k) => [k, G.THEMES[k].name, '']));
      body += `
      <section><h2>1. Wähle dein Volk</h2><div class="grid races">${raceCards(c)}</div>${skinRow(c)}</section>
      <section><h2>2. Wähle deinen Helden</h2><div class="grid heroes">${heroCards(c)}</div></section>
      <section class="row3">
        <div><h2>3. Spielmodus</h2>${opt('m-mode', c.mode, [['1v1', '1 gegen 1', 'Du gegen einen Computer'], ['2v2', '2 gegen 2', 'Du + KI-Verbündeter gegen 2 KI'], ['ffa', '1 vs 1 vs 1 vs 1', 'Jeder gegen jeden']])}</div>
        <div><h2>4. Schwierigkeit</h2>${opt('m-diff', c.difficulty, [['einfach', 'Einfach', 'Langsame KI, weniger Einkommen'], ['mittel', 'Mittel', 'Ausgeglichen'], ['schwer', 'Schwer', 'Schnelle KI, Bonus-Einkommen, fokussiert Heiler']])}</div>
        <div><h2>5. Karte</h2><div class="maps">${opt('m-map', c.map, maps)}</div></div>
        <div><h2>6. Spieldauer</h2>${opt('m-dur', String(c.duration), G.DURATIONS.map(([v, n]) => [String(v), n, v ? 'Danach entscheidet die Punktzahl' : 'Bis ein Team besiegt ist']))}</div>
      </section>
      <div class="start-row"><button class="big" data-act="m-start">⚔ Schlacht beginnen</button></div>`;
    } else if (UI.menuTab === 'kampagne') {
      if (c.race === 'zufall') c.race = 'menschen';
      const camp = G.CAMPAIGNS[c.race], ms = camp.missions;
      if (UI.mission >= ms.length) UI.mission = 0;
      const sel = ms[UI.mission];
      const done = ms.filter((m, i) => Prof().missionDone(c.race, i)).length;
      body += `<section><h2>Wähle die Kampagne deines Volkes</h2><div class="chips campraces">${G.RACE_KEYS.map((k) => {
          const n = G.CAMPAIGNS[k].missions.filter((m, i) => Prof().missionDone(k, i)).length;
          return `<button class="chip ${c.race === k ? 'sel' : ''}" data-act="m-craces" data-v="${k}" style="border-color:${G.RACES[k].color}">${G.RACES[k].name} <small>${n}/5</small></button>`;
        }).join('')}</div></section>
        <section><h2>${G.RACES[c.race].name}: ${camp.title} <small>(${done}/5)</small></h2><p class="story">${camp.intro}</p><div class="campaign">
        <div class="mlist">${ms.map((m, i) => {
          const ok = Prof().missionUnlocked(c.race, i), dn = Prof().missionDone(c.race, i);
          return `<button class="mission ${UI.mission === i ? 'sel' : ''}" data-act="m-mission" data-v="${i}" ${ok ? '' : 'disabled'}><span>${dn ? '✔' : ok ? '⚔' : '🔒'}</span> ${i + 1}. ${m.title}</button>`;
        }).join('')}</div>
        <div class="brief"><h3>${UI.mission + 1}. ${sel.title}</h3><p class="story">${sel.story}</p><p><b>Ziel:</b> ${sel.goal}</p>
          <p class="note">Modus: ${G.LAYOUTS[sel.cfg.mode].name} · Schwierigkeit: ${G.DIFFICULTY[sel.cfg.difficulty].name} · ${sel.cfg.duration} Minuten · Karte: ${G.THEMES[sel.cfg.map].name}</p>
          <button class="big" data-act="m-campaign" ${Prof().missionUnlocked(c.race, UI.mission) ? '' : 'disabled'}>⚔ Mission starten</button></div></div>${skinRow(c)}</section>
        <section><h2>Dein Held</h2><div class="grid heroes">${heroCards(c)}</div></section>`;
    } else if (UI.menuTab === 'voelker') {
      body += `<section><h2>Volks-Erfahrung</h2><p class="note">Jede Partie bringt deinem gespielten Volk Erfahrung (mehr bei Siegen, höherer Schwierigkeit und in der Kampagne). Mit steigender Volksstufe schaltest du Skins, Banner, Titel und einen vierten Helden frei.</p>
        <div class="grid races">${G.RACE_KEYS.map((k) => {
          const r = G.RACES[k], xp = Prof().data.xp[k] || 0, l = Prof().raceLevel(k), a = Prof().xpFor(l), b = Prof().xpFor(l + 1);
          return `<div class="card race" style="--rc:${r.color}"><div class="crest" style="background:${r.color}"><span>${r.name[0]}</span></div>
            <h3>${r.name} – Stufe ${l}</h3><div class="xpbar"><div style="width:${Math.floor(100 * (xp - a) / (b - a))}%"></div></div><small>${fmt(xp)} / ${fmt(b)} XP</small>
            <div class="kv">Titel: <b>${G.titleFor(l)}</b></div>
            <div class="skinlist">${G.SKINS.map((s) => `<div class="skin ${l >= s.lvl ? 'ok' : ''}"><span class="sw" style="${swatch(k, s.id)}"></span>${s.name}<small>${l >= s.lvl ? (s.desc || 'Standardaussehen') : 'ab Stufe ' + s.lvl}</small></div>`).join('')}</div>
            <div class="rewards">${G.REWARDS.map((rw) => `<div class="rw ${l >= rw.lvl ? 'ok' : ''}"><span>${l >= rw.lvl ? '✔' : rw.lvl}</span>${rw.kind === 'hero' ? 'Held: ' + r.heroes.find((h) => h.unlock).name : rw.text}</div>`).join('')}</div></div>`;
        }).join('')}</div><p class="note">Partien gesamt: ${Prof().data.games} · Siege: ${Prof().data.wins}</p></section>`;
    } else if (UI.menuTab === 'hilfe') {
      body += `<section class="help"><h2>Anleitung</h2>
        <div class="hgrid">
        <div><h3>Ziel</h3><p>Zerstöre das Haupthaus aller gegnerischen Völker. Fällt dein eigenes, ist die Partie verloren. In der Endphase (letzte 5 Minuten) greifen alle an, danach entscheidet die Punktzahl.</p></div>
        <div><h3>Basisbau</h3><p>Baue innerhalb des gestrichelten Rings. Das Haupthaus bestimmt, wie viele Gebäude du bauen und wie hoch du sie ausbauen kannst. Baumeister begrenzen, wie viel gleichzeitig entsteht. Die Mauer kaufst du im Bauen-Tab; sie umschließt die ganze Basis.</p></div>
        <div><h3>Wirtschaft</h3><p>Arbeiter entstehen automatisch und sammeln Gold und Holz. Minen und Sägewerke erhöhen das Einkommen. Außenposten auf Goldadern bringen viel Gold, stehen aber ungeschützt auf der Karte.</p></div>
        <div><h3>Armee</h3><p>Truppengebäude bilden automatisch Einheiten nach der gewählten Armee-Vorlage aus; über die Einheitenkarten im Armee-Tab rekrutierst du zusätzlich gezielt. Höhere Gebäudestufen schalten Rollen frei (Tank, Magier, Support …). Im Armee-Tab wählst du: Sammeln &amp; Angreifen, Wellen oder Nur verteidigen. Losgeschickte Einheiten kämpfen bis zum Tod.</p></div>
        <div><h3>Held</h3><p>Dein Held gibt der ganzen Armee einen Commander-Bonus, steigt bis Stufe 10 auf und bringt pro Stufe einen Talentpunkt. Im Heldenfenster wählst du sein Verhalten (Armee folgen, Basis verteidigen, Monster jagen oder manuell), nutzt Fähigkeiten, Tränke und den Rückzug.</p></div>
        <div><h3>Volk</h3><p>Jedes Volk hat ein Passiv und drei Volksfähigkeiten (ab Haupthaus-Stufe 1, 3 und 5). Im Tab „Volk“ verteilst du Talente in Krieg, Bollwerk und Wohlstand.</p></div>
        <div><h3>Neutrale Monster</h3><p>Lager auf der Karte geben Gold, Holz, Erfahrung und Beute. Trolle schließen sich dir als Söldner an, Golems und Drachen stärken die ganze Armee.</p></div>
        <div><h3>Steuerung</h3><p><b>PC:</b> WASD/Ziehen = Kamera, Mausrad = Zoom, Linksklick = auswählen/bauen, Held auswählen und Linksklick aufs Ziel (oder Rechtsklick) = Held steuern, Q/E = Heldenfähigkeit, 1–3 = Volksfähigkeit, H = Held manuell/automatisch.<br><b>Handy:</b> Wischen = Kamera, zwei Finger = Zoom, Tippen = auswählen/bauen, Held (Wappen im Heldenfenster) antippen und dann Ziel antippen = Held steuern, ☰ = Menü, rote Knöpfe = Volksfähigkeiten.</p></div>
        </div></section>`;
    } else {
      const s = Prof().data.settings;
      body += `<section class="settings"><h2>Einstellungen</h2>
        <label>Musik <input type="range" min="0" max="100" value="${Math.round(s.music * 100)}" data-slider="music"></label>
        <label>Geräusche <input type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}" data-slider="sfxvol"></label>
        <label class="tgl"><input type="checkbox" data-act="m-set" data-key="muted" ${s.muted ? 'checked' : ''}><span></span>Ton aus</label>
        <label class="tgl"><input type="checkbox" data-act="m-set" data-key="blood" ${s.blood ? 'checked' : ''}><span></span>Blut und Gefallene anzeigen</label>
        <button data-act="m-testsound">Klangprobe</button>
        <button data-act="m-tutorial" ${Prof().data.tutorialDone ? '' : 'disabled'}>${Prof().data.tutorialDone ? 'Einführung im nächsten Spiel erneut zeigen' : 'Einführung wird im nächsten Spiel gezeigt'}</button>
        <p class="note">Profil und Fortschritt werden in diesem Browser gespeichert.</p>
        <button data-act="m-reset">Fortschritt zurücksetzen</button></section>`;
    }
    $('#menu-body').innerHTML = body;
  }
  function swatch(race, skin) {
    const fake = { race, rd: G.RACES[race], skin };
    const p = G.R.palOf(fake);
    return `background:linear-gradient(135deg, ${p.body} 0 33%, ${p.roof} 33% 66%, ${p.trim} 66%);${p.glow ? 'box-shadow:0 0 8px ' + p.glow : ''}`;
  }

  // -------------------------------------------------------------------------
  // Einführung (geführte Tipps im ersten Spiel)
  const TUT = [
    { text: (p) => `Willkommen, Herrscher der ${p.rd.name}! Dein Ziel: Zerstöre das gegnerische Haupthaus, bevor es dein ${G.bname(p.race, 'haupthaus')} trifft. Zuerst bauen wir deine Wirtschaft auf.`, manual: 'Los geht\'s' },
    { text: (p) => `Baue eine <b>${G.bname(p.race, 'goldmine')}</b>: Tab „Bauen“${G.R.touch ? ' (☰ oben rechts)' : ''} → ${G.bname(p.race, 'goldmine')} → freien Platz in deiner Basis ${G.R.touch ? 'antippen' : 'anklicken'}.`, check: (p) => G.countOf(p, 'goldmine') >= 1 },
    { text: (p) => `Baue ein Truppengebäude: <b>${G.bname(p.race, 'kaserne')}</b>. Es bildet automatisch Nahkämpfer aus.`, check: (p) => G.countOf(p, 'kaserne') >= 1 },
    { text: (p) => `Baue eine <b>${G.bname(p.race, 'unterkunft')}</b>. Mehr Versorgung (⚑ oben) bedeutet eine größere Armee.`, check: (p) => G.countOf(p, 'unterkunft') >= 1 },
    { text: (p) => `Baue einen <b>${G.bname(p.race, 'turm')}</b> zur Verteidigung deiner Basis.`, check: (p) => G.countOf(p, 'turm') >= 1 },
    { text: (p) => `Werte dein <b>${G.bname(p.race, 'haupthaus')}</b> auf Stufe 2 auf: ${G.R.touch ? 'antippen' : 'anklicken'} → „Ausbau“. Das schaltet neue Gebäude, Stufen und die Mauer frei.`, check: (p) => p.th.level >= 2 || !!p.th.upgrading },
    { text: () => 'Deine Truppen kämpfen von selbst. Öffne den Tab <b>„Armee“</b>: „Sammeln“ greift geschlossen an, „Wellen“ schickt regelmäßig Truppen los.', check: () => UI.tab === 'armee' },
    { text: (p) => `Volksfähigkeiten sind deine Trumpfkarten (${G.R.touch ? 'rote Knöpfe unten rechts' : 'Tasten 1–3'}). Setze <b>${p.rd.abilities[0].name}</b> ein, sobald gekämpft wird.`, check: (p) => (p.raceCasts || 0) > 0 },
    { text: () => 'Sehr gut! Dein Held steigt durch Kämpfe auf und bringt Talentpunkte (Tab „Volk“). Beim Händler kauft er Ausrüstung. Tipp: Der Bau-Autopilot kann dir den Basisbau abnehmen. Viel Erfolg!', manual: 'Fertig' },
  ];
  function tutorialTick() {
    const t = UI.tut; if (!t || !G.S) return;
    const p = me(), st = TUT[t.step];
    if (!st) return endTutorial(true);
    if (st.check && st.check(p)) { t.step++; G.sfx('fertig', 0, 0, 0.6, true); renderTutorial(); }
  }
  function renderTutorial() {
    const box = $('#tutorial'), t = UI.tut;
    const on = !!(t && TUT[t.step]);
    document.body.classList.toggle('tut-on', on);
    if (!on) { box.classList.add('hidden'); return; }
    const st = TUT[t.step];
    box.classList.remove('hidden');
    box.innerHTML = `<div class="tut-head">Einführung ${t.step + 1}/${TUT.length}</div><div class="tut-text">${st.text(me())}</div>
      <div class="tut-btns">${st.manual ? `<button data-act="tut-next">${st.manual}</button>` : '<span class="tut-wait">…</span>'}<button class="mini" data-act="tut-skip">Überspringen</button></div>`;
  }
  function endTutorial(done) {
    UI.tut = null; $('#tutorial').classList.add('hidden'); document.body.classList.remove('tut-on');
    Prof().data.tutorialDone = true; Prof().save();
    if (done) G.msg('Einführung abgeschlossen.', 'good');
  }

  // -------------------------------------------------------------------------
  // Spielstart
  UI.startGame = function (extra) {
    const cfg = { ...UI.cfg, ...(extra || {}) };
    if (cfg.race === 'zufall') cfg.hero = 'zufall';
    cfg.skin = cfg.race === 'zufall' ? 'standard' : (Prof().data.skin[cfg.race] || 'standard');
    cfg.banner = cfg.race === 'zufall' ? 'standard' : (Prof().data.banner[cfg.race] || 'standard');
    UI.lastCfg = cfg;
    const S = G.newGame(cfg);
    if (cfg.race === 'zufall') { const r = S.players[0].race; S.players[0].skin = Prof().data.skin[r] || 'standard'; S.players[0].banner = Prof().data.banner[r] || 'standard'; }
    G.R.buildGround(S);
    $('#menu').classList.add('hidden');
    $('#end').classList.add('hidden');
    $('#game').classList.remove('hidden');
    G.R.cam.z = 1;
    if (G.Audio) { G.Audio.init(); G.Audio.setTheme(S.theme); }
    requestAnimationFrame(() => {
      G.R.init($('#view'));
      const mm = $('#minimap');
      const W = 210; mm.width = W; mm.height = Math.round(W * S.h / S.w);
      G.R.centerOn(me().base.x + me().dir.x * 150, me().base.y);
    });
    UI.selected = null; UI.placing = null; UI.casting = null; UI.pickTarget = false;
    UI.tab = 'bauen'; UI.awarded = null; UI.follow = false;
    UI.tut = Prof().data.tutorialDone ? null : { step: 0 };
    renderTutorial();
    document.body.classList.remove('panel-open');
    if (G.R.touch) { G.R.cam.z = 0.8; G.msg('Wischen: Karte bewegen · Zwei Finger: Zoom · Tippen: Auswählen · ☰: Menü · Held antippen, dann Ziel antippen: Held steuern', ''); }
    if (cfg.mission) G.msg(`Mission: ${Prof().findMission(cfg.mission).m.goal}`, 'gold');
    renderPanel(true);
  };

  // -------------------------------------------------------------------------
  // HUD oben
  function renderTop() {
    const S = G.S, p = me();
    const busy = G.buildersBusy(p), bmax = G.builders(p);
    $('#top-res').innerHTML = `
      <span class="res gold" title="Gold">● ${fmt(p.gold)} <small>+${p.incomeG.toFixed(1)}/s</small></span>
      <span class="res wood" title="Holz">▮ ${fmt(p.wood)} <small>+${p.incomeW.toFixed(1)}/s</small></span>
      <span class="res sup" title="Versorgung">⚑ ${p.supplyUsed}/${p.supplyCap}</span>
      <span class="res" title="Arbeiter">⚒ ${p.workers}/${p.workerCap || 0}</span>
      <span class="res" title="Baumeister">🔨 ${busy}/${bmax}</span>
      <span class="res" title="Haupthaus-Stufe">♜ Stufe ${p.th.level}</span>
      ${p.talentPoints ? `<span class="res tp" title="Talentpunkte im Tab „Volk“ verteilen">★ ${p.talentPoints} Talent${p.talentPoints > 1 ? 'e' : ''}</span>` : ''}
      <span class="res time ${S.endphase ? 'endphase' : ''}" title="${S.limit ? 'Verbleibende Spielzeit' : 'Spielzeit'}">⏱ ${S.limit ? 'noch ' + fmtTime(G.timeLeft()) + (S.endphase ? ' · ENDPHASE' : '') : fmtTime(S.time)}</span>`;
    document.querySelectorAll('[data-act="speed"]').forEach((b) => b.classList.toggle('sel', !S.paused && +b.dataset.v === S.speed));
    $('[data-act="pause"]').classList.toggle('sel', S.paused);
    $('[data-act="mute"]').textContent = G.Audio && G.Audio.muted ? '🔇' : '🔊';
  }

  // -------------------------------------------------------------------------
  // Seitenleiste
  function toggle(key, label, on, title) {
    return `<label class="tgl" title="${esc(title || '')}"><input type="checkbox" data-act="toggle" data-key="${key}" ${on ? 'checked' : ''}><span></span>${label}</label>`;
  }
  function btn(act, label, why, extra) {
    return `<button data-act="${act}" ${extra || ''} ${why ? `disabled title="${esc(why)}"` : ''}>${label}</button>`;
  }
  function wallBox(p) {
    const next = G.WALLS[p.wallLevel], why = G.wallCheck(p);
    const cur = p.wallLevel ? G.WALLS[p.wallLevel - 1].name : 'keine';
    let h = `<div class="box"><div class="lbl">Befestigung: <b>${cur}</b>${p.wallLevel ? ` (${p.wallAlive} Segmente)` : ''}</div>`;
    if (p.wallUp) h += `<div class="hint">Baut ${G.WALLS[p.wallUp.to - 1].name}: ${Math.floor(100 * p.wallUp.t / p.wallUp.total)}%</div>`;
    else if (next) h += `<div class="brow">${next.name} (${next.hp} LP je Segment) – ${costHtml(next.cost)} · ${fmtTime(next.time / G.PACE)} ${btn('wall', 'Errichten', why)}</div>${why ? `<div class="why">${why}</div>` : ''}`;
    else h += '<div class="good">Höchste Befestigung errichtet</div>';
    return h + '<div class="hint">Die Mauer umschließt automatisch die ganze Basis. Eigene Truppen gehen hindurch, Gegner müssen sie einreißen. Ein Ausbau repariert alle Segmente.</div></div>';
  }

  function tabBauen(p) {
    const types = Object.keys(G.BUILDINGS).filter((t) => t !== 'haupthaus');
    let h = `<div class="box">${toggle('auto.build', 'Bau-Autopilot', p.auto.build, 'Der Computer baut, erforscht und befestigt für dich nach einer optimierten Reihenfolge.')}
      <div class="hint">Baumeister: ${G.buildersBusy(p)}/${G.builders(p)} · ${G.bname(p.race, 'haupthaus')} Stufe ${p.th.level} bestimmt Limits und Höchststufen.</div></div>`;
    h += wallBox(p);
    h += '<div class="blist">';
    for (const t of types) {
      const d = G.BUILDINGS[t], n = G.countOf(p, t), max = G.maxCount(p, t);
      const why = G.buildingCheck(p, t);
      h += `<div class="bitem ${UI.placing === t ? 'sel' : ''}">
        <div class="bname"><b>${G.bname(p.race, t)}</b> <span class="cnt">${n}/${max}</span></div>
        <div class="bdesc">${d.desc}</div>
        <div class="brow">${costHtml(G.costOf(t, 1))} · ${fmtTime(G.timeOf(t, 1))}
        ${btn('build', UI.placing === t ? 'Abbrechen' : 'Bauen', UI.placing === t ? null : why, `data-type="${t}"`)}</div></div>`;
    }
    h += '</div><h4>Deine Gebäude</h4><div class="mylist">';
    const order = ['haupthaus', ...types];
    for (const b of p.blds.slice().sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))) {
      const why = G.upgradeCheck(p, b);
      const st = b.upgrading ? `${Math.floor(100 * b.upgrading.t / b.upgrading.total)}%` : '';
      const c = G.costOf(b.type, Math.min(5, b.level + 1));
      h += `<div class="mrow"><a data-act="selbld" data-id="${b.id}">${b.name}</a> <span>St. ${b.level}${st ? ' ⚒ ' + st : ''}</span>
        ${b.level < 5 && !b.upgrading ? btn('upgradeid', '▲', why, `data-id="${b.id}" title="${esc(why || `Ausbau: ${c.g} Gold, ${c.w} Holz`)}"`) : ''}</div>`;
    }
    return h + '</div>';
  }

  function tabArmee(p) {
    const S = G.S;
    const styles = [['sammeln', 'Sammeln & Angreifen', 'Die Armee sammelt sich und greift geschlossen an, sobald sie groß genug ist.'],
      ['wellen', 'Wellen losschicken', 'In festen Abständen zieht alles los, was gerade bereitsteht.'],
      ['verteidigen', 'Nur verteidigen', 'Niemand verlässt die Basis – außer du drückst „Jetzt angreifen!“.']];
    const stateName = { sammeln: 'sammelt sich', verteidigen: 'verteidigt die Basis', camps: 'jagt neutrale Monster' };
    let h = `<div class="box"><div class="lbl">Armee-Stil</div><div class="chips">${styles.map(([m, n, d]) => `<button class="chip ${p.armyStyle === m ? 'sel' : ''}" data-act="armystyle" data-v="${m}" title="${esc(d)}">${n}</button>`).join('')}</div>
      <div class="hint">${styles.find((s) => s[0] === p.armyStyle)[2]} Losgeschickte Einheiten kämpfen, bis sie fallen.</div>
      <div class="stats"><span>Im Kampf: <b>${p.committedCount}</b> Einheiten</span><span>Bereit: <b>${p.poolSupply}</b> Versorgung (${stateName[p.armyState] || p.armyState}${p.campTarget ? ': ' + p.campTarget.name : ''})</span></div>
      ${btn('launch', '⚔ Jetzt angreifen!', p.poolSupply ? null : 'Keine bereiten Truppen')}`;
    if (p.armyStyle === 'sammeln') h += `<div class="lbl">Angriff ab <b>${Math.round(p.attackFrac * 100)}%</b> der Versorgung (${Math.round(Math.max(8, p.supplyCap * p.attackFrac))})</div>
      <input type="range" min="15" max="100" step="5" value="${Math.round(p.attackFrac * 100)}" data-slider="attackFrac">
      ${toggle('campsAllowed', 'Zwischendurch neutrale Monster jagen', p.campsAllowed)}`;
    if (p.armyStyle === 'wellen') h += `<div class="lbl">Welle alle <b>${p.waveInterval}</b> s – nächste in ${Math.max(0, Math.ceil(p.waveT))} s</div>
      <input type="range" min="15" max="120" step="5" value="${p.waveInterval}" data-slider="waveInterval">`;
    const foes = S.players.filter((o) => o.alive && o.team !== p.team);
    h += `<div class="lbl">Angriffsziel</div><div class="chips"><button class="chip ${p.targetMode === 'auto' && !p.manualPoint ? 'sel' : ''}" data-act="target" data-v="auto">Automatisch</button>
      ${foes.map((o) => `<button class="chip ${p.targetMode === o.id && !p.manualPoint ? 'sel' : ''}" data-act="target" data-v="${o.id}" style="border-color:${o.color}">${o.name}</button>`).join('')}
      <button class="chip ${UI.pickTarget || p.manualPoint ? 'sel' : ''}" data-act="pickpoint">Punkt auf Karte…</button></div></div>`;
    const counts = {}; G.ROLES.forEach((r) => (counts[r] = 0));
    let summons = 0;
    for (const e of S.ents) if (!e.dead && e.owner === p.id && e.kind === 'unit') { if (counts[e.role] !== undefined) counts[e.role]++; else summons++; }
    const training = p.blds.filter((b) => b.prod);
    const queued = p.blds.reduce((n, b) => n + b.queue.length, 0);
    h += `<div class="box"><div class="lbl">Produktion ${toggle('auto.produce', 'automatisch', p.auto.produce, 'Gebäude bilden laufend Einheiten nach der gewählten Vorlage aus.')}</div>
      <div class="chips">${G.ARMY_PRESETS.map((pr) => `<button class="chip ${p.preset === pr.id ? 'sel' : ''}" data-act="preset" data-v="${pr.id}" title="${esc(pr.desc)}">${pr.name}</button>`).join('')}${p.preset === 'eigene' ? '<button class="chip sel" disabled>Eigene</button>' : ''}</div>
      <div class="hint">${(G.ARMY_PRESETS.find((x) => x.id === p.preset) || { desc: 'Eigene Gewichtung aus der Feineinstellung.' }).desc}</div>
      <div class="training">${training.length ? training.map((b) => `<div class="tr" title="${esc(b.name)}"><span>${p.rd.units[b.prod.role].name}</span><div class="hc-bar"><div style="width:${Math.floor(100 * b.prod.t / b.prod.total)}%"></div></div></div>`).join('') : '<div class="hint">Gerade wird niemand ausgebildet.</div>'}
      ${queued ? `<div class="hint">In der Warteschlange: ${queued}</div>` : ''}</div>
      <div class="lbl">Rekrutieren <small>(zusätzlich zur Automatik, kostet beim Start der Ausbildung)</small></div>
      <div class="recruit">${G.ROLES.map((r) => { const why = G.recruitCheck(p, r), c = G.unitCost(p, r);
        return `<button class="rcard" data-act="recruit" data-v="${r}" ${why ? `disabled title="${esc(why)}"` : `title="${esc(G.ROLE_NAMES[r] + ' ausbilden')}"`}><b>${p.rd.units[r].name}</b><small>${G.ROLE_NAMES[r]} · ${counts[r]}×</small><small>${why ? why : costHtml(c)}</small></button>`; }).join('')}</div>
      <button class="mini" data-act="finetune">${UI.fineOpen ? '▾ Feineinstellung ausblenden' : '▸ Feineinstellung (Gewichtung je Rolle)'}</button>`;
    if (UI.fineOpen) {
      for (const r of G.ROLES) {
        h += `<div class="comp"><span class="rn">${G.ROLE_NAMES[r]} <small>${p.rd.units[r].name}</small></span>
          <input type="range" min="0" max="6" step="1" value="${p.comp[r]}" data-slider="comp" data-role="${r}"><span class="cv">${p.comp[r]}</span><span class="cc">${counts[r]}×</span></div>`;
      }
    }
    return h + `<div class="hint">Beschwörungen/Söldner: ${summons}. Rollen werden je Gebäudestufe freigeschaltet (Kaserne St. 2 = Tank, Sanktum St. 2 = Magier, St. 3 = Support).</div></div>`;
  }

  function abilityDesc(a) {
    switch (a.type) {
      case 'nuke': return `Einzelziel: ${a.dmg} Schaden${a.stun ? `, ${a.stun} s Betäubung` : ''}`;
      case 'drain': return `Entzieht ${a.dmg} LP und heilt den Helden`;
      case 'aoe': return `${a.dmg} Flächenschaden (Radius ${a.radius})${a.self ? ' um den Helden' : ''}`;
      case 'stun': return `${a.dmg} Flächenschaden + ${a.stun} s Betäubung${a.self ? ' um den Helden' : ''}`;
      case 'heal': return `Heilt Verbündete um ${a.amount} LP`;
      case 'buff': return `Verbündete: ${a.stat === 'dmg' ? '+' + a.value * 100 + '% Schaden' : a.stat === 'armor' ? '+' + a.value + ' Rüstung' : a.stat === 'atkspd' ? '+' + a.value * 100 + '% Angriffstempo' : '+' + a.value * 100 + '% Tempo'} für ${a.duration} s`;
      case 'summon': return `Beschwört ${a.count}× ${a.unit.name} (${a.duration} s)`;
    }
    return '';
  }

  function tabHeld(p) {
    const h = p.hero, d = p.heroDef;
    let s = `<div class="box hero-box"><div class="hname">${d.name}</div><div class="sub">${d.title} · ${p.rd.name}</div>`;
    if (h.dead) s += `<div class="warn">Gefallen – Wiederbelebung in ${Math.ceil(p.heroRespawn)} s</div>`;
    const need = G.heroXpNeeded(h.level), prev = h.level > 1 ? G.heroXpNeeded(h.level - 1) : 0;
    s += `<div class="stats"><span>Stufe <b>${h.level}</b>/10</span><span>LP <b>${fmt(h.hp)}/${fmt(h.maxHp)}</b></span><span>Schaden <b>${Math.round(h.dmg)}</b></span><span>Rüstung <b>${h.armor}</b></span></div>
      <div class="xpbar"><div style="width:${h.level >= 10 ? 100 : Math.floor(100 * (h.xp - prev) / (need - prev))}%"></div></div>
      <div class="kv"><b>Commander-Bonus:</b> ${d.bonusDesc}</div>
      <div class="lbl">Verhalten</div><div class="chips">${G.HERO_MODES.map((m) => `<button class="chip ${(h.manual ? 'manuell' : (h.mode || 'armee')) === m.id ? 'sel' : ''}" data-act="heromode" data-v="${m.id}">${m.name}</button>`).join('')}</div>
      <div class="hint">${G.HERO_MODES.find((m) => m.id === (h.manual ? 'manuell' : (h.mode || 'armee'))).desc} ${h.manual ? (G.R.touch ? 'Fähigkeit antippen, dann Ziel antippen.' : 'Q / E wirken auf den Mauszeiger, Rechtsklick bewegt immer.') : 'Wirkt Fähigkeiten selbst und kauft beim Händler ein.'}</div></div>`;
    s += '<div class="box"><div class="lbl">Fähigkeiten</div>';
    h.abilities.forEach((a, i) => {
      s += `<div class="abil"><button data-act="cast" data-idx="${i}" ${a.t > 0 || h.dead ? 'disabled' : ''}>${i === 0 ? 'Q' : 'E'}: ${a.name}${a.t > 0 ? ` (${Math.ceil(a.t)} s)` : ''}</button><small>${abilityDesc(a)} · ${a.cd} s</small></div>`;
    });
    s += `</div><div class="box"><div class="lbl">Inventar (${h.items.length}/6)</div><div class="inv">`;
    for (let i = 0; i < 6; i++) {
      const id = h.items[i];
      s += id ? `<div class="slot ${G.ITEMS[id].rare ? 'rare' : ''}" title="${esc(G.ITEMS[id].desc)}"><b>${G.ITEMS[id].name}</b><small>${G.ITEMS[id].desc}</small><button class="mini" data-act="sell" data-idx="${i}">verkaufen</button></div>` : '<div class="slot empty">leer</div>';
    }
    return s + '</div></div>';
  }

  function tabVolk(p) {
    const rd = p.rd;
    let s = `<div class="box"><div class="lbl">Talentbaum – <b>${p.talentPoints}</b> Punkt(e) frei <small>(1 pro Heldenstufe)</small></div>
      ${toggle('auto.talents', 'Talente automatisch verteilen', p.auto.talents)}<div class="tree">`;
    G.TALENTS.forEach((br, bi) => {
      s += `<div class="branch" style="--bc:${br.color}"><div class="bh">${br.name}</div>`;
      br.talents.forEach((t, ti) => {
        const has = p.talents[t.id], why = G.talentCheck(p, bi, ti);
        s += `<button class="talent ${has ? 'has' : ''}" data-act="talent" data-b="${bi}" data-t="${ti}" ${has || why ? 'disabled' : ''} title="${esc(why && !has ? why : t.desc)}"><b>${t.name}</b><small>${t.desc}</small></button>`;
      });
      s += '</div>';
    });
    s += `</div></div><div class="box"><div class="lbl">Volk: ${rd.name}</div><div class="kv"><b>Passiv:</b> ${rd.passive.name} – ${rd.passive.desc}</div>
      ${rd.abilities.map((a, i) => `<div class="kv"><b>${i + 1}${i === 0 ? '/R' : ''}: ${a.name}</b> (ab ${G.bname(p.race, 'haupthaus')} St. ${a.th}, ${a.cd} s) – ${a.desc}</div>`).join('')}
      ${toggle('auto.ability', 'Volksfähigkeiten automatisch einsetzen', p.auto.ability)}</div>`;
    return s;
  }

  function tabHaendler(p) {
    const h = p.hero;
    const near = h && !h.dead && G.S.shops.some((s) => G.dist(s, h) < 230);
    let s = `<div class="box"><div class="hint">${near ? '<b class="good">Dein Held steht beim Händler.</b>' : 'Der Held muss beim Händler (Zelt auf der Karte) stehen, um einzukaufen.'}</div>
      ${btn('gotoshop', 'Held zum Händler schicken', h.dead ? 'Held ist tot' : null)}</div><div class="shop">`;
    for (const id of G.SHOP_LIST) {
      const it = G.ITEMS[id], why = G.buyCheck(p, id);
      s += `<div class="sitem"><div><b>${it.name}</b><small>${it.desc}</small></div>${btn('buy', `<span class="c-g">${it.price}</span>`, why, `data-item="${id}"`)}</div>`;
    }
    return s + '</div><div class="hint">Seltene Gegenstände (Drachenzahn, Krone der Könige, Phönixfeder) gibt es nur als Beute bei neutralen Monstern.</div>';
  }

  function tabWirtschaft(p) {
    let s = `<div class="box"><div class="lbl">Arbeiter: ${p.workers}/${p.workerCap} (werden automatisch ausgebildet, 40 Gold)</div>
      ${toggle('autoRatio', 'Arbeiter automatisch verteilen', p.autoRatio, 'Verteilt die Arbeiter je nach Bedarf auf Gold und Holz.')}
      <div class="lbl">Gold <b>${Math.round(p.goldRatio * 100)}%</b> · Holz <b>${Math.round((1 - p.goldRatio) * 100)}%</b></div>
      <input type="range" min="0" max="100" step="5" value="${Math.round(p.goldRatio * 100)}" data-slider="goldRatio" ${p.autoRatio ? 'disabled' : ''}>
      <div class="hint">Einkommen: <span class="c-g">${p.incomeG.toFixed(1)}</span>/s Gold, <span class="c-w">${p.incomeW.toFixed(1)}</span>/s Holz${p.reserve.g || p.reserve.w ? ` · Autopilot spart auf ${costHtml(p.reserve)}` : ''}
      · Außenposten auf Goldadern: ${p.blds.filter((b) => b.type === 'aussenposten').length}</div></div>`;
    s += '<div class="box"><div class="lbl">Schmiede-Forschung</div>';
    for (const l of Object.keys(G.RESEARCH)) {
      const r = G.RESEARCH[l], lvl = p.research[l], why = G.researchCheck(p, l);
      const run = p.researching && p.researching.line === l;
      s += `<div class="sitem"><div><b>${r.name} ${lvl}/5</b><small>${r.desc}</small>${run ? `<small>Läuft: ${Math.floor(100 * p.researching.t / p.researching.total)}%</small>` : ''}</div>
        ${lvl < 5 ? btn('research', costHtml(G.researchCost(lvl + 1)), why, `data-line="${l}"`) : '<span class="good">max</span>'}</div>`;
    }
    return s + '</div>';
  }

  function renderPanel(force) {
    const S = G.S; if (!S) return;
    if (!force && UI.pointerDownPanel) return;
    const p = me();
    $('#race-ab').innerHTML = p.rd.abilities.map((ab, i) => {
      const why = G.raceAbilityCheck(p, i);
      return `<button class="race-btn" data-act="race" data-idx="${i}" ${why ? 'disabled' : ''} title="${esc(ab.desc)}"><b>${i + 1}${i === 0 ? '/R' : ''}: ${ab.name}</b><small>${why || 'Bereit!'}</small></button>`;
    }).join('');
    renderQuick(p);
    const tabs = [['bauen', 'Bauen'], ['armee', 'Armee'], ['held', 'Held'], ['volk', 'Volk' + (p.talentPoints ? ' ★' : '')], ['haendler', 'Händler'], ['wirtschaft', 'Wirtsch.']];
    $('#tabs').innerHTML = tabs.map(([k, n]) => `<button class="${UI.tab === k ? 'sel' : ''}" data-act="tab" data-v="${k}">${n}</button>`).join('');
    const fn = { bauen: tabBauen, armee: tabArmee, held: tabHeld, volk: tabVolk, haendler: tabHaendler, wirtschaft: tabWirtschaft }[UI.tab];
    const body = $('#tab-body');
    const st = body.scrollTop;
    body.innerHTML = fn(p);
    body.scrollTop = st;
    renderSelection();
  }
  UI.renderPanel = renderPanel;

  // Heldenfenster: immer sichtbar, mit Fähigkeiten, Trank, Rückzug, Kamera und Verhalten
  const MODE_SHORT = { armee: 'Armee', basis: 'Basis', jagen: 'Jagd', manuell: 'Manuell' };
  function renderHeroCard() {
    const p = me(), h = p.hero, d = p.heroDef, card = $('#herocard');
    if (UI.pointerDownPanel) return;
    card.style.bottom = ($('#mmwrap').offsetHeight + 16) + 'px';
    const mode = h.manual ? 'manuell' : (h.mode || 'armee');
    const need = G.heroXpNeeded(h.level), prev = h.level > 1 ? G.heroXpNeeded(h.level - 1) : 0;
    const xpPct = h.level >= 10 ? 100 : Math.floor(100 * (h.xp - prev) / (need - prev));
    const potions = h.items.filter((i) => i === 'trank').length;
    const sel = UI.selected === h;
    card.className = sel ? 'sel' : '';
    card.innerHTML = `<div class="hc-top"><button class="hc-crest" data-act="herosel" title="Held auswählen und Kamera hinbewegen" style="background:${p.rd.color}">${d.name.split(' ').pop()[0]}</button>
      <div class="hc-info"><div class="hc-name"><b>${d.name.split(' ').pop()}</b> St. ${h.level}${p.talentPoints ? ' <span class="tp">★</span>' : ''}</div>
      ${h.dead ? `<div class="hc-dead">Wiederbelebung in ${Math.ceil(p.heroRespawn)} s</div>` : `<div class="hc-bar hp"><div style="width:${Math.max(0, 100 * h.hp / h.maxHp)}%"></div></div>`}
      <div class="hc-bar xp"><div style="width:${xpPct}%"></div></div></div></div>
      <div class="hc-btns">${h.abilities.map((a, i) => `<button data-act="cast" data-idx="${i}" ${a.t > 0 || h.dead ? 'disabled' : ''} title="${esc(a.name + ' – ' + abilityDesc(a))}">${G.R.touch ? '' : (i ? 'E ' : 'Q ')}${a.name.split(/[ -]/)[0].slice(0, 8)}<small>${a.t > 0 ? Math.ceil(a.t) + ' s' : 'bereit'}</small></button>`).join('')}
        <button data-act="potion" ${potions && !h.dead ? '' : 'disabled'} title="Heiltrank trinken">🧪<small>${potions}×</small></button>
        <button data-act="retreat" ${h.dead ? 'disabled' : ''} title="Rückzug zur Basis">↩<small>Rückzug</small></button>
        <button data-act="follow" class="${UI.follow ? 'sel' : ''}" title="Kamera folgt dem Helden">🎥<small>${UI.follow ? 'folgt' : 'Kamera'}</small></button></div>
      <div class="hc-modes">${G.HERO_MODES.map((m) => `<button class="chip ${mode === m.id ? 'sel' : ''}" data-act="heromode" data-v="${m.id}" title="${esc(m.desc)}">${MODE_SHORT[m.id]}</button>`).join('')}</div>
      ${mode === 'manuell' ? `<div class="hc-hint">${sel ? (G.R.touch ? 'Ziel antippen: laufen / angreifen' : 'Linksklick aufs Ziel: laufen / angreifen') : 'Held antippen, dann Ziel antippen'}</div>` : ''}`;
  }
  const isMobile = () => window.matchMedia('(max-width: 900px), (max-height: 560px)').matches;
  function renderQuick(p) {
    const h = p.hero;
    let q = p.rd.abilities.map((ab, i) => {
      const why = G.raceAbilityCheck(p, i);
      const short = ab.name.split(/[ -]/)[0].slice(0, 9);
      return `<button class="qr" data-act="race" data-idx="${i}" ${why ? 'disabled' : ''} title="${esc(ab.name + ': ' + ab.desc)}">${short}<small>${why ? (p.th.level < ab.th ? '🔒' : Math.ceil(p.abCd[i]) + ' s') : 'bereit'}</small></button>`;
    }).join('');
    q += `<button class="qa" data-act="launch" ${p.poolSupply ? '' : 'disabled'}>⚔ Angriff<small>${p.poolSupply} Vers.</small></button>`;
    $('#quick').innerHTML = q;
  }

  // -------------------------------------------------------------------------
  // Auswahl-Fenster
  function renderSelection() {
    const box = $('#selection');
    const e = UI.selected;
    if (!e || e.dead) { if (e && e.dead && e.kind !== 'hero') UI.selected = null; box.classList.add('hidden'); return; }
    if (e.kind === 'hero' && e.owner === 0) { box.classList.add('hidden'); return; } // eigener Held: Heldenfenster genügt
    box.classList.remove('hidden');
    const S = G.S, p = me();
    const owner = e.owner >= 0 ? S.players[e.owner] : null;
    const mine = e.owner === 0;
    let h = `<button class="x" data-act="deselect">×</button>`;
    const ownerTxt = owner ? `<span style="color:${owner.color}">${owner.name}</span>` : '<span class="neutral">Neutral</span>';
    if (e.kind === 'building') {
      h += `<div class="sel-head"><b>${e.name}</b> · Stufe ${e.level}${e.level === 0 ? ' (im Bau)' : ''} · ${ownerTxt}</div>
        <div class="hp">LP ${fmt(e.hp)}/${fmt(e.maxHp)} · Rüstung ${e.armor}</div><div class="desc">${e.def.desc}</div>`;
      if (mine && e.type !== 'mauer') {
        if (e.upgrading) h += `<div class="prog">${e.level === 0 ? 'Bau' : 'Ausbau auf Stufe ' + e.upgrading.to}: ${Math.floor(100 * e.upgrading.t / e.upgrading.total)}%</div>`;
        else if (e.level < 5) {
          const why = G.upgradeCheck(p, e);
          h += `<div class="row">${btn('upgrade', `Ausbau auf Stufe ${e.level + 1}: ${costHtml(G.costOf(e.type, e.level + 1))} · ${fmtTime(G.timeOf(e.type, e.level + 1))}`, why)}${why ? `<span class="why">${why}</span>` : ''}</div>`;
        } else h += '<div class="good">Maximale Stufe erreicht</div>';
        if (e.type === 'haupthaus') h += wallBox(p);
        const prod = G.PRODUCTION[e.type];
        if (prod) {
          const unl = G.unlockedRoles(e);
          h += `<div class="prog">${e.prod ? `Bildet aus: ${p.rd.units[e.prod.role].name} ${Math.floor(100 * e.prod.t / e.prod.total)}%` : e.upgrading ? 'Produktion pausiert (Ausbau)' : 'Wartet…'} · Tempo +${(e.level - 1) * 15}% · Startstufe ${1 + Math.floor((e.level - 1) / 2)}</div>
            <div class="lbl">Fokus</div><div class="chips"><button class="chip ${e.focus === 'auto' ? 'sel' : ''}" data-act="focus" data-v="auto">Auto</button>
            ${Object.keys(prod).map((r) => `<button class="chip ${e.focus === r ? 'sel' : ''}" data-act="focus" data-v="${r}" ${unl.includes(r) ? '' : `disabled title="ab Stufe ${prod[r]}"`}>${G.ROLE_NAMES[r]}</button>`).join('')}
            ${toggle('prodOn', 'Produktion an', e.prodOn)}</div>
            <div class="lbl">Manuell rekrutieren (Warteschlange ${e.queue.length}/5)</div><div class="chips">
            ${Object.keys(prod).map((r) => `<button class="chip" data-act="queue" data-v="${r}" ${unl.includes(r) ? '' : `disabled title="ab Stufe ${prod[r]}"`}>${p.rd.units[r].name} ${costHtml(G.unitCost(p, r))}</button>`).join('')}</div>
            ${e.queue.length ? `<div class="hint">Warteschlange: ${e.queue.map((r) => p.rd.units[r].name).join(', ')}</div>` : ''}`;
        }
        if (e.type === 'schmiede') {
          h += '<div class="chips">' + Object.keys(G.RESEARCH).map((l) => btn('research', `${G.RESEARCH[l].name} ${p.research[l] + 1}: ${costHtml(G.researchCost(p.research[l] + 1))}`, G.researchCheck(p, l), `data-line="${l}"`)).join('') + '</div>';
          if (p.researching) h += `<div class="prog">Forschung: ${G.RESEARCH[p.researching.line].name} ${Math.floor(100 * p.researching.t / p.researching.total)}%</div>`;
        }
      }
    } else {
      const role = e.kind === 'hero' ? 'Held' : e.kind === 'creep' ? 'Neutrales Monster' : e.role === 'summon' ? (e.merc ? 'Söldner' : 'Beschwörung') : G.ROLE_NAMES[e.role];
      h += `<div class="sel-head"><b>${e.name}</b> · ${role} · Stufe ${e.level} · ${ownerTxt}${e.committed ? ' · <span class="bad">im Angriff</span>' : ''}</div>
        <div class="hp">LP ${fmt(e.hp)}/${fmt(e.maxHp)} · Schaden ${Math.round(e.dmg * (1 + e.m.dmg))} · Rüstung ${Math.round((e.armor || 0) + e.m.armor)} · Reichweite ${Math.round(e.range)}</div>`;
      if (e.aura) h += `<div class="desc">Aura: ${e.aura.desc}</div>`;
      if (e.summon) h += `<div class="desc">Beschwört im Kampf: ${e.summon.name}</div>`;
      if (e.heal) h += `<div class="desc">Heilt Verbündete um ${Math.round(e.heal)} LP</div>`;
      if (e.kind === 'unit' && e.level < 5 && !e.summoned) h += `<div class="desc">Erfahrung: ${Math.floor(e.xp)}/${G.UNIT_XP[e.level]}</div>`;
      if (e.life) h += `<div class="desc">Verschwindet in ${Math.ceil(e.life)} s</div>`;
      if (e.kind === 'creep') { const c = e.camp.def; h += `<div class="desc">${e.camp.name}: Belohnung ${c.gold} Gold, ${c.wood} Holz${c.item ? `, ${Math.round(c.item * 100)}% Beute-Chance` : ''}${c.extraDesc ? ', ' + c.extraDesc : ''}</div>`; }
    }
    box.innerHTML = h;
  }

  // -------------------------------------------------------------------------
  // Nachrichten & Spielende
  let lastMsgKey = '';
  function renderMsgs() {
    const S = G.S;
    const key = S.msgs.length + ':' + Math.floor(S.time / 2);
    if (key === lastMsgKey) return;
    lastMsgKey = key;
    $('#msgs').innerHTML = S.msgs.slice(-7).filter((m) => S.time - m.t < 25).map((m) => `<div class="msg ${m.cls}">${m.text}</div>`).join('');
  }

  function showEnd() {
    const S = G.S, p = me(), o = S.over;
    if (!UI.awarded) UI.awarded = Prof().award(S);
    const a = UI.awarded;
    const fm = S.cfg.mission ? Prof().findMission(S.cfg.mission) : null;
    const hasNext = fm && fm.index + 1 < 5;
    $('#end').classList.remove('hidden');
    $('#end-body').innerHTML = `<h1 class="${o.win ? 'win' : 'lose'}">${o.win ? 'Sieg!' : 'Niederlage'}</h1>
      <p>${o.reason || (o.byTime ? (o.win ? 'Die Zeit ist abgelaufen – dein Team liegt nach Punkten vorn.' : 'Die Zeit ist abgelaufen – der Gegner liegt nach Punkten vorn.') : o.win ? 'Alle gegnerischen Völker wurden bezwungen.' : 'Dein Haupthaus ist gefallen.')}</p>
      ${o.scores ? `<div class="stats">${o.scores.map((x) => `<span style="color:${x.color}">${x.name} <b>${x.score}</b></span>`).join('')}</div>` : ''}
      <div class="stats"><span>Spielzeit <b>${fmtTime(o.time)}</b></span><span>Besiegte Gegner <b>${p.stats.kills}</b></span><span>Verlorene Einheiten <b>${p.stats.lost}</b></span><span>Heldenstufe <b>${p.hero.level}</b></span></div>
      <div class="xpgain">+${a.xp} Volks-XP für ${G.RACES[a.race].name}${a.after > a.before ? ` – <b>Stufe ${a.after} erreicht!</b>` : ` (Stufe ${a.after})`}
      ${a.unlocked.map((rw) => `<div class="good">Freigeschaltet: ${rw.kind === 'hero' ? 'Held ' + G.RACES[a.race].heroes.find((h) => h.unlock).name : rw.text}</div>`).join('')}
      ${a.missionNew ? `<div class="good">Mission abgeschlossen!${hasNext ? ' Nächste Mission freigeschaltet.' : ` Kampagne „${G.CAMPAIGNS[fm.race].title}“ gemeistert!`}</div>` : ''}</div>
      <button class="big" data-act="menu">Zum Hauptmenü</button> <button class="big" data-act="again">${S.cfg.mission ? 'Mission wiederholen' : 'Revanche (neue Gegner)'}</button>
      ${o.win && hasNext ? '<button class="big" data-act="nextmission">Nächste Mission</button>' : ''}`;
  }

  // -------------------------------------------------------------------------
  // Aktionen
  function findEnt(id) { return G.S.ents.find((e) => e.id === +id); }
  function startMission(race, i) {
    const m = G.CAMPAIGNS[race].missions[i];
    UI.mission = i; UI.cfg.race = race;
    UI.startGame({ ...m.cfg, race, map: m.cfg.map || 'heimat', mission: m.id });
  }
  function act(el) {
    const a = el.dataset.act, v = el.dataset.v;
    const S = G.S, p = S && S.players[0];
    switch (a) {
      case 'm-tab': UI.menuTab = v; renderMenu(); return;
      case 'm-race': UI.cfg.race = v; UI.cfg.hero = null; renderMenu(); return;
      case 'm-hero': UI.cfg.hero = v; renderMenu(); return;
      case 'm-skin': Prof().data.skin[UI.cfg.race] = v; Prof().save(); renderMenu(); return;
      case 'm-mode': UI.cfg.mode = v; renderMenu(); return;
      case 'm-diff': UI.cfg.difficulty = v; renderMenu(); return;
      case 'm-map': UI.cfg.map = v; renderMenu(); return;
      case 'm-dur': UI.cfg.duration = +v; renderMenu(); return;
      case 'm-mission': UI.mission = +v; renderMenu(); return;
      case 'm-start': UI.startGame(); return;
      case 'm-campaign': startMission(UI.cfg.race, UI.mission); return;
      case 'm-craces': UI.cfg.race = v; UI.cfg.hero = null; UI.mission = 0; renderMenu(); return;
      case 'm-banner': Prof().data.banner[UI.cfg.race] = v; Prof().save(); renderMenu(); return;
      case 'm-set': Prof().data.settings[el.dataset.key] = el.checked; Prof().save(); Prof().applySettings(); return;
      case 'm-testsound': G.Audio.init(); G.Audio.apply(); setTimeout(() => { G.sfx('schwert', 0, 0, 1, true); setTimeout(() => G.sfx('tod', 0, 0, 1, true), 250); setTimeout(() => G.sfx('horn', 0, 0, 1, true), 700); }, 100); return;
      case 'm-reset': if (armed(el, 'Wirklich alles löschen? Nochmal tippen')) { Prof().reset(); renderMenu(); } return;
      case 'again': if (UI.lastCfg.mission) { const f = Prof().findMission(UI.lastCfg.mission); startMission(f.race, f.index); } else UI.startGame(); return;
      case 'nextmission': { const f = Prof().findMission(UI.lastCfg.mission); startMission(f.race, f.index + 1); return; }
      case 'menu': G.S = null; UI.showMenu(); return;
      case 'tab': UI.tab = v; break;
      case 'panel': document.body.classList.toggle('panel-open'); return;
      case 'tut-next': UI.tut.step++; if (!TUT[UI.tut.step]) endTutorial(true); else renderTutorial(); return;
      case 'tut-skip': endTutorial(false); return;
      case 'm-tutorial': Prof().data.tutorialDone = false; Prof().save(); renderMenu(); return;
      case 'build': UI.placing = UI.placing === el.dataset.type ? null : el.dataset.type; UI.casting = null;
        if (UI.placing && isMobile()) { document.body.classList.remove('panel-open'); G.msg('Tippe auf einen freien Platz in deiner Basis.', ''); G.R.centerOn(p.base.x, p.base.y); }
        if (UI.placing && G.BUILDINGS[UI.placing].outpost) G.msg('Klicke auf eine freie Goldader (gelb markiert) außerhalb deiner Basis.', '');
        break;
      case 'wall': G.upgradeWall(p); break;
      case 'toggle': {
        const k = el.dataset.key, on = el.checked;
        if (k === 'heroManual') { G.heroMode(p, on ? 'manuell' : (p.hero.mode || 'armee')); if (on) UI.selected = p.hero; }
        else if (k === 'prodOn') { if (UI.selected) UI.selected.prodOn = on; }
        else if (k.startsWith('auto.')) p.auto[k.slice(5)] = on;
        else p[k] = on;
        break;
      }
      case 'armystyle': p.armyStyle = v; p.waveT = Math.min(p.waveT, p.waveInterval); p.armyT = 0; break;
      case 'launch': G.launchNow(p); break;
      case 'target': p.targetMode = v === 'auto' ? 'auto' : +v; p.manualPoint = null; p.armyT = 0; break;
      case 'pickpoint': UI.pickTarget = true; document.body.classList.remove('panel-open'); G.msg('Tippe/klicke auf die Karte: Angriffsziel festlegen.', ''); break;
      case 'upgrade': if (UI.selected) G.upgradeBuilding(p, UI.selected); break;
      case 'upgradeid': { const b = findEnt(el.dataset.id); if (b) G.upgradeBuilding(p, b); break; }
      case 'selbld': { const b = findEnt(el.dataset.id); if (b) { UI.selected = b; G.R.centerOn(b.x, b.y); } break; }
      case 'focus': if (UI.selected) UI.selected.focus = v; break;
      case 'queue': if (UI.selected) G.queueUnit(p, UI.selected, v); break;
      case 'research': G.startResearch(p, el.dataset.line); break;
      case 'talent': G.learnTalent(p, +el.dataset.b, +el.dataset.t); break;
      case 'buy': G.buyItem(p, el.dataset.item); break;
      case 'sell': G.sellItem(p, +el.dataset.idx); break;
      case 'gotoshop': {
        const h = p.hero; if (h.dead) break;
        const s = S.shops.reduce((a2, b) => (G.dist(b, h) < G.dist(a2, h) ? b : a2));
        if (h.manual) h.order = { type: 'move', x: s.x, y: s.y + 60 };
        else h.shopping = s;
        break;
      }
      case 'cast': castBtn(+el.dataset.idx); break;
      case 'potion': G.heroPotion(p); break;
      case 'retreat': G.heroRetreat(p); break;
      case 'follow': UI.follow = !UI.follow; if (UI.follow && !p.hero.dead) G.R.centerOn(p.hero.x, p.hero.y); break;
      case 'heromode': G.heroMode(p, v); if (v === 'manuell') { UI.selected = p.hero; G.msg(G.R.touch ? 'Manuell: Ziel antippen, um den Helden zu bewegen oder angreifen zu lassen.' : 'Manuell: Linksklick aufs Ziel (Held ausgewählt) oder Rechtsklick.', ''); } break;
      case 'herosel': if (!p.hero.dead) { UI.selected = p.hero; G.R.centerOn(p.hero.x, p.hero.y); } break;
      case 'preset': { const pr = G.ARMY_PRESETS.find((x) => x.id === v); p.comp = { ...pr.comp }; p.preset = v; G.msg(`Armee-Vorlage: ${pr.name}`, ''); break; }
      case 'recruit': G.recruit(p, v); break;
      case 'finetune': UI.fineOpen = !UI.fineOpen; break;
      case 'race': G.castRaceAbility(p, +el.dataset.idx || 0); break;
      case 'speed': S.speed = +v; S.paused = false; break;
      case 'pause': S.paused = !S.paused; break;
      case 'mute': Prof().data.settings.muted = !Prof().data.settings.muted; Prof().save(); Prof().applySettings(); break;
      case 'deselect': UI.selected = null; break;
      case 'centerhero': if (!p.hero.dead) G.R.centerOn(p.hero.x, p.hero.y); break;
      case 'centerbase': G.R.centerOn(p.base.x, p.base.y); break;
      case 'zoom': G.R.cam.z = G.clamp(G.R.cam.z * (+v), 0.35, 2.2); G.R.clampCam(); break;
      case 'quit': if (armed(el, 'Beenden?')) { G.S = null; UI.showMenu(); } return;
    }
    renderPanel(true);
    if (S) renderTop();
  }
  // Bestätigung durch zweites Antippen (Browser-Dialoge sind nicht überall erlaubt)
  function armed(el, text) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1';
    const old = el.innerHTML;
    el.innerHTML = text; el.classList.add('armed');
    setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = old; el.classList.remove('armed'); } }, 3000);
    return false;
  }
  function castBtn(i) {
    const p = me(), h = p.hero, ab = h.abilities[i];
    if (!ab || h.dead) return;
    if (ab.type === 'heal' || ab.type === 'buff' || ab.type === 'summon' || ab.self) G.heroCastManual(p, i, h.x, h.y);
    else { UI.casting = i; UI.placing = null; document.body.classList.remove('panel-open'); G.msg(`${ab.name}: Ziel antippen bzw. mit Linksklick wählen.`, ''); }
  }

  document.addEventListener('click', (ev) => {
    if (G.Audio) G.Audio.init();
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT') return; // Checkboxen über "change"
    act(el);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.matches('input[type=checkbox][data-act]')) act(el);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target; if (!el.dataset.slider) return;
    const v = +el.value, k = el.dataset.slider;
    if (k === 'music' || k === 'sfxvol') {
      Prof().data.settings[k === 'music' ? 'music' : 'sfx'] = v / 100; Prof().save(); Prof().applySettings(); return;
    }
    if (!G.S) return;
    const p = me();
    if (k === 'attackFrac') p.attackFrac = v / 100;
    if (k === 'waveInterval') { p.waveInterval = v; p.waveT = Math.min(p.waveT, v); }
    if (k === 'goldRatio') p.goldRatio = v / 100;
    if (k === 'comp') { p.comp[el.dataset.role] = v; p.preset = 'eigene'; }
    const lab = el.previousElementSibling && el.previousElementSibling.querySelector('b');
    if (lab && (k === 'attackFrac' || k === 'waveInterval')) lab.textContent = k === 'attackFrac' ? v + '%' : v;
    if (el.nextElementSibling && el.nextElementSibling.classList.contains('cv')) el.nextElementSibling.textContent = v;
  });
  document.addEventListener('pointerdown', (ev) => { if (ev.target.closest('#panel, #selection, #herocard, #quick')) UI.pointerDownPanel = true; });
  document.addEventListener('pointerup', () => { UI.pointerDownPanel = false; });

  // -------------------------------------------------------------------------
  // Eingabe auf der Karte
  const keys = {};
  let drag = null;
  function pickAt(wx, wy) {
    let best = null, bd = Infinity;
    for (const e of G.S.ents) {
      if (e.dead) continue;
      if (e.kind === 'building') {
        const hs = e.size * G.TILE / 2;
        if (Math.abs(e.x - wx) < hs && Math.abs(e.y - wy) < hs + 10) { const d = e.type === 'mauer' ? 40 : 30; if (d < bd) { bd = d; best = e; } }
      } else {
        const d = Math.hypot(e.x - wx, e.y - wy);
        if (d < e.r + 6 && d < bd) { bd = d; best = e; }
      }
    }
    return best;
  }
  UI.bindInput = function () {
    const cv = $('#view');
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    const touches = new Map();
    let pinch = null, longT = null;
    const setMouse = (ev) => {
      const r = cv.getBoundingClientRect();
      G.R.mouse.x = ev.clientX - r.left; G.R.mouse.y = ev.clientY - r.top;
      const w = G.R.toWorld(G.R.mouse.x, G.R.mouse.y); G.R.mouse.wx = w.x; G.R.mouse.wy = w.y;
    };
    const pinchState = () => { const [a, b] = [...touches.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    cv.addEventListener('pointermove', (ev) => {
      setMouse(ev);
      G.R.mouse.inside = ev.pointerType === 'mouse';
      if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && touches.size === 2) {
        const st = pinchState(), R = G.R, r = cv.getBoundingClientRect();
        const z1 = G.clamp(pinch.z * st.d / pinch.d, 0.35, 2.2);
        const sx = st.mx - r.left, sy = st.my - r.top;
        R.cam.z = z1; R.cam.x = pinch.wx - sx / z1; R.cam.y = pinch.wy - sy / z1; R.clampCam();
        return;
      }
      if (drag) {
        const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > (ev.pointerType === 'mouse' ? 6 : 12)) { drag.moved = true; clearTimeout(longT); }
        if (drag.moved) { UI.follow = false; G.R.cam.x = drag.cx - dx / G.R.cam.z; G.R.cam.y = drag.cy - dy / G.R.cam.z; G.R.clampCam(); }
      }
    });
    cv.addEventListener('pointerleave', () => { G.R.mouse.inside = false; });
    cv.addEventListener('pointerdown', (ev) => {
      if (!G.S) return;
      setMouse(ev);
      if (ev.pointerType !== 'mouse') {
        touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (touches.size === 2) { // Zwei Finger: Zoom statt Ziehen
          clearTimeout(longT); drag = null;
          const st = pinchState(), r = cv.getBoundingClientRect();
          const w = G.R.toWorld(st.mx - r.left, st.my - r.top);
          pinch = { d: st.d || 1, z: G.R.cam.z, wx: w.x, wy: w.y };
          return;
        }
      }
      if (ev.button === 0 || ev.button === 1) {
        drag = { sx: ev.clientX, sy: ev.clientY, cx: G.R.cam.x, cy: G.R.cam.y, moved: false, button: ev.button, shift: ev.shiftKey, long: false };
        try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ }
        if (ev.pointerType !== 'mouse') {
          clearTimeout(longT);
          longT = setTimeout(() => { if (drag && !drag.moved) { drag.long = true; rightClick(); if (navigator.vibrate) navigator.vibrate(30); } }, 480);
        }
      }
      if (ev.button === 2) rightClick();
    });
    const endPointer = (ev) => {
      touches.delete(ev.pointerId);
      if (pinch) { if (touches.size < 2) pinch = null; drag = null; return; }
      clearTimeout(longT);
      if (!drag) return;
      const d = drag; drag = null;
      if (d.moved || d.long || d.button !== 0) return;
      leftClick(d.shift);
    };
    cv.addEventListener('pointerup', endPointer);
    cv.addEventListener('pointercancel', (ev) => { touches.delete(ev.pointerId); pinch = null; drag = null; clearTimeout(longT); });
    cv.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const R = G.R, z0 = R.cam.z;
      const z1 = G.clamp(z0 * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), 0.35, 2.2);
      const w = R.toWorld(R.mouse.x, R.mouse.y);
      R.cam.z = z1;
      R.cam.x = w.x - R.mouse.x / z1; R.cam.y = w.y - R.mouse.y / z1; R.clampCam();
    }, { passive: false });
    const mm = $('#minimap');
    const mmPos = (ev) => { const r = mm.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * G.S.w, y: (ev.clientY - r.top) / r.height * G.S.h }; };
    let mmDrag = false;
    mm.addEventListener('contextmenu', (e) => e.preventDefault());
    mm.addEventListener('pointerdown', (ev) => {
      const w = mmPos(ev);
      if (ev.button === 2) { const p = me(); if (p.hero.manual) G.heroCommand(p, w.x, w.y); return; }
      if (UI.pickTarget) { setManualPoint(w.x, w.y); return; }
      mmDrag = true; mm.setPointerCapture(ev.pointerId); G.R.centerOn(w.x, w.y);
    });
    mm.addEventListener('pointermove', (ev) => { if (mmDrag) { const w = mmPos(ev); G.R.centerOn(w.x, w.y); } });
    mm.addEventListener('pointerup', () => { mmDrag = false; });

    window.addEventListener('keydown', (ev) => {
      if (!G.S || $('#game').classList.contains('hidden')) return;
      if (ev.target.tagName === 'INPUT' && ev.target.type !== 'range' && ev.target.type !== 'checkbox') return;
      const k = ev.key.toLowerCase();
      keys[k] = true;
      const p = me();
      if (k === 'escape') { UI.placing = null; UI.casting = null; UI.pickTarget = false; UI.selected = null; renderPanel(true); }
      if (k === 'q' || k === 'e') { const i = k === 'q' ? 0 : 1; const ab = p.hero.abilities[i]; if (ab && (ab.type === 'heal' || ab.type === 'buff' || ab.type === 'summon' || ab.self)) G.heroCastManual(p, i, p.hero.x, p.hero.y); else G.heroCastManual(p, i, G.R.mouse.wx, G.R.mouse.wy); }
      if (k === 'r' || k === '1') G.castRaceAbility(p, 0);
      if (k === '2') G.castRaceAbility(p, 1);
      if (k === '3') G.castRaceAbility(p, 2);
      if (k === 'h') { G.heroMode(p, p.hero.manual ? (p.hero.mode || 'armee') : 'manuell'); if (p.hero.manual) UI.selected = p.hero; G.msg(`Held: ${p.hero.manual ? 'manuelle Steuerung' : 'automatisch'}`, ''); renderPanel(true); }
      if (k === ' ') { ev.preventDefault(); if (!p.hero.dead) G.R.centerOn(p.hero.x, p.hero.y); }
      if (k === 'p') G.S.paused = !G.S.paused;
      if (k === 'b') { UI.tab = 'bauen'; renderPanel(true); }
      if (k === '+' || k === '-') { G.R.cam.z = G.clamp(G.R.cam.z * (k === '+' ? 1.15 : 1 / 1.15), 0.35, 2.2); G.R.clampCam(); }
    });
    window.addEventListener('keyup', (ev) => { keys[ev.key.toLowerCase()] = false; });
  };
  function setManualPoint(x, y) {
    const p = me();
    p.manualPoint = { x, y }; UI.pickTarget = false; p.armyT = 0;
    G.S.fx.push({ type: 'ring', x, y, r: 30, color: '#ff4040', t: 0, dur: 0.8 });
    G.msg('Angreifende Truppen ziehen zum markierten Punkt.', 'gold');
    renderPanel(true);
  }
  function leftClick(shift) {
    const p = me(), wx = G.R.mouse.wx, wy = G.R.mouse.wy;
    if (UI.placing) {
      const b = G.placeBuilding(p, UI.placing, wx, wy);
      if (b) { if (!shift) UI.placing = null; UI.selected = b; }
      else G.msg(G.buildingCheck(p, UI.placing) || (G.BUILDINGS[UI.placing].outpost ? 'Außenposten nur auf freien Goldadern (ohne Gegner in der Nähe).' : 'Hier kann nicht gebaut werden (nur innerhalb deines Basisrings, nicht überlappend).'), 'bad');
      renderPanel(true); return;
    }
    if (UI.casting !== null) { G.heroCastManual(p, UI.casting, wx, wy); UI.casting = null; renderPanel(true); return; }
    if (UI.pickTarget) { setManualPoint(wx, wy); return; }
    const hit = pickAt(wx, wy), h = p.hero;
    if (UI.selected === h && !h.dead && hit !== h && (!hit || hit.team !== p.team)) {
      if (!h.manual) { G.heroMode(p, 'manuell'); G.msg('Held: manuelle Steuerung (zurück über „Armee“ im Heldenfenster).', ''); }
      G.heroCommand(p, wx, wy);
      renderPanel(true); return;
    }
    UI.selected = hit;
    if (isMobile()) document.body.classList.remove('panel-open');
    renderPanel(true);
  }
  function rightClick() {
    const p = me();
    if (UI.placing || UI.casting !== null || UI.pickTarget) { UI.placing = null; UI.casting = null; UI.pickTarget = false; renderPanel(true); return; }
    if (p.hero.manual && !p.hero.dead) G.heroCommand(p, G.R.mouse.wx, G.R.mouse.wy);
    else if (!p.hero.dead) G.msg(G.R.touch ? 'Im Held-Tab „Manuelle Steuerung“ einschalten, dann lange drücken zum Bewegen.' : 'Taste H: manuelle Heldensteuerung aktivieren, dann Rechtsklick zum Bewegen.', '');
  }

  UI.updateCamera = function (dt) {
    const R = G.R, sp = 900 * dt / R.cam.z;
    if (UI.follow && G.S) {
      const h = me().hero;
      if (!h.dead) { const tx = h.x - R.viewW() / 2, ty = h.y - R.viewH() / 2; R.cam.x += (tx - R.cam.x) * Math.min(1, dt * 4); R.cam.y += (ty - R.cam.y) * Math.min(1, dt * 4); R.clampCam(); }
      if (keys['a'] || keys['d'] || keys['w'] || keys['s'] || keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown']) UI.follow = false;
      else return;
    }
    if (keys['a'] || keys['arrowleft']) R.cam.x -= sp;
    if (keys['d'] || keys['arrowright']) R.cam.x += sp;
    if (keys['w'] || keys['arrowup']) R.cam.y -= sp;
    if (keys['s'] || keys['arrowdown']) R.cam.y += sp;
    const m = R.mouse, cv = $('#view');
    if (m.inside && !drag && document.hasFocus()) {
      const edge = 10;
      if (m.x < edge) R.cam.x -= sp; if (m.x > cv.clientWidth - edge) R.cam.x += sp;
      if (m.y < edge) R.cam.y -= sp; if (m.y > cv.clientHeight - edge) R.cam.y += sp;
    }
    R.clampCam();
  };

  // Kampfintensität im Bild steuert die Musik
  function updateIntensity() {
    const S = G.S, R = G.R;
    const vw = R.viewW(), vh = R.viewH();
    let n = 0;
    for (const e of S.ents) if (e.kind !== 'building' && e.target && !e.target.dead && e.x > R.cam.x && e.x < R.cam.x + vw && e.y > R.cam.y && e.y < R.cam.y + vh) n++;
    const target = Math.min(1, n / 25 + (S.endphase ? 0.35 : 0));
    G.Audio.intensity += (target - G.Audio.intensity) * 0.1;
  }

  let tTop = 0, tPanel = 0, tMini = 0, endShown = false;
  UI.tick = function (dt) {
    const S = G.S; if (!S) return;
    tTop -= dt; tPanel -= dt; tMini -= dt;
    if (tTop <= 0) { tTop = 0.2; renderTop(); renderMsgs(); renderHeroCard(); if (G.Audio) updateIntensity(); }
    if (tPanel <= 0) { tPanel = 0.5; renderPanel(false); tutorialTick(); }
    if (tMini <= 0) { tMini = 0.15; G.R.drawMinimap($('#minimap')); }
    if (S.over && !endShown) { endShown = true; showEnd(); }
    if (!S.over) endShown = false;
    $('#view').style.cursor = UI.placing || UI.casting !== null || UI.pickTarget ? 'crosshair' : 'default';
  };
})();
