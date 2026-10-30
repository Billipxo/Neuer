'use strict';
// Oberfläche: Hauptmenü, HUD, Seitenleiste, Auswahl und Eingabe.
(function () {
  const UI = (G.UI = { tab: 'bauen', selected: null, placing: null, casting: null, pickTarget: false, pointerDownPanel: false });
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => Math.floor(n).toLocaleString('de-DE');
  const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, '0')} min` : `${s} s`; };
  const costHtml = (c) => `<span class="c-g">${fmt(c.g)}</span> <span class="c-w">${fmt(c.w)}</span>`;
  const me = () => G.S.players[0];
  const esc = (s) => String(s).replace(/"/g, '&quot;');

  // -------------------------------------------------------------------------
  // Hauptmenü
  UI.cfg = { race: 'menschen', hero: null, mode: '1v1', difficulty: 'mittel', map: 'heimat', duration: 30 };

  UI.showMenu = function () {
    $('#menu').classList.remove('hidden');
    $('#game').classList.add('hidden');
    $('#end').classList.add('hidden');
    renderMenu();
  };

  function renderMenu() {
    const c = UI.cfg;
    const races = G.RACE_KEYS.map((k) => {
      const r = G.RACES[k];
      return `<button class="card race ${c.race === k ? 'sel' : ''}" data-act="m-race" data-v="${k}" style="--rc:${r.color};--rd:${r.dark}">
        <div class="crest" style="background:${r.color}"><span>${r.name[0]}</span></div>
        <h3>${r.name}</h3><p>${r.desc}</p>
        <div class="kv"><b>Passiv:</b> ${r.passive.name} – ${r.passive.desc}</div>
        <div class="kv"><b>Volksfähigkeit:</b> ${r.ability.name} – ${r.ability.desc}</div>
        <div class="kv"><b>Heimat:</b> ${r.map.name}</div></button>`;
    }).join('') + `<button class="card race ${c.race === 'zufall' ? 'sel' : ''}" data-act="m-race" data-v="zufall" style="--rc:#888;--rd:#333">
        <div class="crest" style="background:linear-gradient(135deg,#d6c39a,#9fd18c,#a9b5ac,#7aa04a,#c99a6a,#c0484a)"><span>?</span></div>
        <h3>Zufall</h3><p>Das Schicksal entscheidet über dein Volk und deinen Helden.</p></button>`;
    let heroes;
    if (c.race === 'zufall') heroes = '<p class="note">Bei zufälligem Volk wird auch der Held zufällig bestimmt.</p>';
    else {
      const rd = G.RACES[c.race];
      if (!rd.heroes.find((h) => h.id === c.hero)) c.hero = rd.heroes[0].id;
      heroes = rd.heroes.map((h) => `<button class="card hero ${c.hero === h.id ? 'sel' : ''}" data-act="m-hero" data-v="${h.id}" style="--rc:${rd.color};--rd:${rd.dark}">
        <div class="crest small" style="background:${rd.color}"><span>${h.name.split(' ').pop()[0]}</span></div>
        <h3>${h.name}</h3><div class="sub">${h.title} · ${h.ranged ? 'Fernkampf' : 'Nahkampf'}</div>
        <div class="kv"><b>Commander-Bonus:</b> ${h.bonusDesc}</div>
        <div class="kv"><b>Fähigkeiten:</b> ${h.abilities.map((a) => a.name).join(', ')}</div></button>`).join('')
        + `<button class="card hero ${c.hero === 'zufall' ? 'sel' : ''}" data-act="m-hero" data-v="zufall" style="--rc:#888;--rd:#333"><div class="crest small" style="background:#777"><span>?</span></div><h3>Zufälliger Held</h3></button>`;
    }
    const opt = (act, cur, list) => list.map(([v, n, d]) => `<button class="opt ${cur === v ? 'sel' : ''}" data-act="${act}" data-v="${v}">${n}${d ? `<small>${d}</small>` : ''}</button>`).join('');
    const maps = [['heimat', 'Heimatkarte', 'Karte deines Volkes'], ['zufall', 'Zufall', '']].concat(Object.keys(G.THEMES).map((k) => [k, G.THEMES[k].name, '']));
    $('#menu-body').innerHTML = `
      <section><h2>1. Wähle dein Volk</h2><div class="grid races">${races}</div></section>
      <section><h2>2. Wähle deinen Helden</h2><div class="grid heroes">${heroes}</div></section>
      <section class="row3">
        <div><h2>3. Spielmodus</h2>${opt('m-mode', c.mode, [['1v1', '1 gegen 1', 'Du gegen einen Computer'], ['2v2', '2 gegen 2', 'Du + KI-Verbündeter gegen 2 KI'], ['ffa', '1 vs 1 vs 1 vs 1', 'Jeder gegen jeden']])}</div>
        <div><h2>4. Schwierigkeit</h2>${opt('m-diff', c.difficulty, [['einfach', 'Einfach', 'Langsame KI, weniger Einkommen'], ['mittel', 'Mittel', 'Ausgeglichen'], ['schwer', 'Schwer', 'Schnelle KI, Bonus-Einkommen, fokussiert Heiler']])}</div>
        <div><h2>5. Karte</h2><div class="maps">${opt('m-map', c.map, maps)}</div></div>
        <div><h2>6. Spieldauer</h2>${opt('m-dur', String(c.duration), G.DURATIONS.map(([v, n]) => [String(v), n, v ? 'Danach entscheidet die Punktzahl' : 'Bis ein Team besiegt ist']))}</div>
      </section>
      <div class="start-row"><button class="big" data-act="m-start">⚔ Schlacht beginnen</button></div>`;
  }

  // -------------------------------------------------------------------------
  // Spielstart
  UI.startGame = function () {
    const cfg = { ...UI.cfg };
    if (cfg.race === 'zufall') cfg.hero = 'zufall';
    const S = G.newGame(cfg);
    G.R.buildGround(S);
    $('#menu').classList.add('hidden');
    $('#end').classList.add('hidden');
    $('#game').classList.remove('hidden');
    G.R.cam.z = 1;
    requestAnimationFrame(() => {
      G.R.init($('#view'));
      const mm = $('#minimap');
      const W = 210; mm.width = W; mm.height = Math.round(W * S.h / S.w);
      G.R.centerOn(me().base.x + me().dir.x * 200, me().base.y);
    });
    UI.selected = null; UI.placing = null; UI.casting = null; UI.pickTarget = false;
    UI.tab = 'bauen';
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
      <span class="res time ${S.endphase ? 'endphase' : ''}" title="${S.limit ? 'Verbleibende Spielzeit' : 'Spielzeit'}">⏱ ${S.limit ? 'noch ' + fmtTime(G.timeLeft()) + (S.endphase ? ' · ENDPHASE' : '') : fmtTime(S.time)}</span>`;
    document.querySelectorAll('[data-act="speed"]').forEach((b) => b.classList.toggle('sel', !S.paused && +b.dataset.v === S.speed));
    $('[data-act="pause"]').classList.toggle('sel', S.paused);
  }

  // -------------------------------------------------------------------------
  // Seitenleiste
  function toggle(key, label, on, title) {
    return `<label class="tgl" title="${esc(title || '')}"><input type="checkbox" data-act="toggle" data-key="${key}" ${on ? 'checked' : ''}><span></span>${label}</label>`;
  }
  function btn(act, label, why, extra) {
    return `<button data-act="${act}" ${extra || ''} ${why ? `disabled title="${esc(why)}"` : ''}>${label}</button>`;
  }

  function tabBauen(p) {
    const types = Object.keys(G.BUILDINGS).filter((t) => t !== 'haupthaus');
    let h = `<div class="box">${toggle('auto.build', 'Bau-Autopilot', p.auto.build, 'Der Computer baut und erforscht für dich nach einer optimierten Reihenfolge.')}
      <div class="hint">Baumeister: ${G.buildersBusy(p)}/${G.builders(p)} · Haupthaus Stufe ${p.th.level} bestimmt Limits und Höchststufen.</div></div>`;
    h += '<div class="blist">';
    for (const t of types) {
      const d = G.BUILDINGS[t], n = G.countOf(p, t), max = G.maxCount(p, t);
      const why = G.buildingCheck(p, t);
      h += `<div class="bitem ${UI.placing === t ? 'sel' : ''}">
        <div class="bname"><b>${d.name}</b> <span class="cnt">${n}/${max}</span></div>
        <div class="bdesc">${d.desc}</div>
        <div class="brow">${costHtml(G.costOf(t, 1))} · ${fmtTime(G.timeOf(t, 1))}
        ${btn('build', UI.placing === t ? 'Abbrechen' : 'Bauen', UI.placing === t ? null : why, `data-type="${t}"`)}</div></div>`;
    }
    h += '</div><h4>Deine Gebäude</h4><div class="mylist">';
    const order = ['haupthaus', ...types];
    for (const b of p.blds.slice().sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))) {
      const why = G.upgradeCheck(p, b);
      const st = b.upgrading ? `${Math.floor(100 * b.upgrading.t / b.upgrading.total)}%` : '';
      h += `<div class="mrow"><a data-act="selbld" data-id="${b.id}">${b.name}</a> <span>St. ${b.level}${st ? ' ⚒ ' + st : ''}</span>
        ${b.level < 5 && !b.upgrading ? btn('upgradeid', '▲', why, `data-id="${b.id}" title="${esc(why || 'Ausbau: ' + G.costOf(b.type, b.level + 1).g + ' Gold, ' + G.costOf(b.type, b.level + 1).w + ' Holz')}"`) : ''}</div>`;
    }
    return h + '</div>';
  }

  function tabArmee(p) {
    const S = G.S;
    const modes = [['auto', 'Auto'], ['sammeln', 'Sammeln'], ['verteidigen', 'Verteidigen'], ['angriff', 'Angreifen'], ['camps', 'Monster jagen']];
    const stateName = { sammeln: 'sammelt sich', verteidigen: 'verteidigt die Basis', angriff: 'greift an', camps: 'jagt neutrale Monster' };
    let h = `<div class="box"><div class="lbl">Armee-Befehl</div><div class="chips">${modes.map(([m, n]) => `<button class="chip ${p.armyMode === m ? 'sel' : ''}" data-act="armymode" data-v="${m}">${n}</button>`).join('')}</div>
      <div class="hint">Status: <b>${stateName[p.armyState] || p.armyState}</b>${p.armyState === 'angriff' && p.targetPlayer && !p.manualPoint ? ' → ' + p.targetPlayer.name : ''}${p.campTarget ? ' → ' + p.campTarget.name : ''} · Armee: ${p.armySupply} Versorgung</div>`;
    if (p.armyMode === 'angriff') {
      const foes = S.players.filter((o) => o.alive && o.team !== p.team);
      h += `<div class="lbl">Angriffsziel</div><div class="chips">${foes.map((o) => `<button class="chip ${p.targetPlayer === o && !p.manualPoint ? 'sel' : ''}" data-act="target" data-v="${o.id}">${o.name}</button>`).join('')}
        <button class="chip ${UI.pickTarget || p.manualPoint ? 'sel' : ''}" data-act="pickpoint">Punkt auf Karte…</button></div>`;
    }
    h += `</div><div class="box"><div class="lbl">Auto-Angriff ab <b>${Math.round(p.attackFrac * 100)}%</b> der Versorgung</div>
      <input type="range" min="20" max="100" step="5" value="${Math.round(p.attackFrac * 100)}" data-slider="attackFrac">
      ${toggle('campsAllowed', 'Im Auto-Modus neutrale Monster jagen', p.campsAllowed)}</div>`;
    const counts = {}; G.ROLES.forEach((r) => (counts[r] = 0));
    let summons = 0;
    for (const e of S.ents) if (!e.dead && e.owner === p.id && e.kind === 'unit') { if (counts[e.role] !== undefined) counts[e.role]++; else summons++; }
    h += `<div class="box">${toggle('auto.produce', 'Automatische Produktion', p.auto.produce, 'Gebäude im Fokus „Auto" bilden Einheiten gemäß Zusammensetzung aus.')}
      <div class="lbl">Armee-Zusammensetzung (Gewichtung)</div>`;
    for (const r of G.ROLES) {
      h += `<div class="comp"><span class="rn" title="${p.rd.units[r].name}">${G.ROLE_NAMES[r]} <small>${p.rd.units[r].name}</small></span>
        <input type="range" min="0" max="6" step="1" value="${p.comp[r]}" data-slider="comp" data-role="${r}"><span class="cv">${p.comp[r]}</span><span class="cc">${counts[r]}×</span></div>`;
    }
    h += `<div class="hint">Beschwörungen/Söldner: ${summons} · Rolle wird je Gebäude freigeschaltet (Kaserne St.2 = Tank, Sanktum St.2 = Magier, St.3 = Support).</div></div>`;
    return h;
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
      ${toggle('heroManual', 'Manuelle Steuerung (H)', h.manual, 'Rechtsklick: bewegen/angreifen, Q/E: Fähigkeiten auf Mausposition')}
      ${h.manual ? '<div class="hint">Rechtsklick = Bewegen / Angreifen · Q / E = Fähigkeit auf Mauszeiger · Leertaste = Kamera auf Held</div>' : '<div class="hint">Der Held folgt der Armee, wirkt Fähigkeiten selbst und kauft automatisch beim Händler ein.</div>'}</div>`;
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
      <div class="hint">Einkommen: <span class="c-g">${p.incomeG.toFixed(1)}</span>/s Gold, <span class="c-w">${p.incomeW.toFixed(1)}</span>/s Holz${p.reserve.g || p.reserve.w ? ` · Autopilot spart auf ${costHtml(p.reserve)}` : ''}</div></div>`;
    s += '<div class="box"><div class="lbl">Schmiede-Forschung</div>';
    for (const l of Object.keys(G.RESEARCH)) {
      const r = G.RESEARCH[l], lvl = p.research[l], why = G.researchCheck(p, l);
      const run = p.researching && p.researching.line === l;
      s += `<div class="sitem"><div><b>${r.name} ${lvl}/5</b><small>${r.desc}</small>${run ? `<small>Läuft: ${Math.floor(100 * p.researching.t / p.researching.total)}%</small>` : ''}</div>
        ${lvl < 5 ? btn('research', costHtml(G.researchCost(lvl + 1)), why, `data-line="${l}"`) : '<span class="good">max</span>'}</div>`;
    }
    s += '</div>';
    const rd = p.rd;
    s += `<div class="box"><div class="lbl">Volk: ${rd.name}</div><div class="kv"><b>Passiv:</b> ${rd.passive.name} – ${rd.passive.desc}</div>
      <div class="kv"><b>Volksfähigkeit:</b> ${rd.ability.name} – ${rd.ability.desc}</div>
      ${toggle('auto.ability', 'Volksfähigkeit automatisch einsetzen', p.auto.ability)}</div>`;
    return s;
  }

  function renderPanel(force) {
    const S = G.S; if (!S) return;
    if (!force && UI.pointerDownPanel) return;
    const p = me();
    const ab = p.rd.ability, why = G.raceAbilityCheck(p);
    $('#race-ab').innerHTML = `<button class="race-btn" data-act="race" ${why ? 'disabled' : ''} title="${esc(ab.desc)}"><b>R: ${ab.name}</b><small>${why || 'Bereit!'}</small></button>`;
    const tabs = [['bauen', 'Bauen'], ['armee', 'Armee'], ['held', 'Held'], ['haendler', 'Händler'], ['wirtschaft', 'Wirtschaft']];
    $('#tabs').innerHTML = tabs.map(([k, n]) => `<button class="${UI.tab === k ? 'sel' : ''}" data-act="tab" data-v="${k}">${n}</button>`).join('');
    const fn = { bauen: tabBauen, armee: tabArmee, held: tabHeld, haendler: tabHaendler, wirtschaft: tabWirtschaft }[UI.tab];
    const body = $('#tab-body');
    const st = body.scrollTop;
    body.innerHTML = fn(p);
    body.scrollTop = st;
    renderSelection();
  }
  UI.renderPanel = renderPanel;

  // -------------------------------------------------------------------------
  // Auswahl-Fenster
  function renderSelection() {
    const box = $('#selection');
    const e = UI.selected;
    if (!e || e.dead) { UI.selected = null; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const S = G.S, p = me();
    const owner = e.owner >= 0 ? S.players[e.owner] : null;
    const mine = e.owner === 0;
    let h = `<button class="x" data-act="deselect">×</button>`;
    const ownerTxt = owner ? `<span style="color:${owner.color}">${owner.name}</span>` : '<span class="neutral">Neutral</span>';
    if (e.kind === 'building') {
      h += `<div class="sel-head"><b>${e.name}</b> · Stufe ${e.level}${e.level === 0 ? ' (im Bau)' : ''} · ${ownerTxt}</div>
        <div class="hp">LP ${fmt(e.hp)}/${fmt(e.maxHp)}</div><div class="desc">${e.def.desc}</div>`;
      if (mine) {
        if (e.upgrading) h += `<div class="prog">${e.level === 0 ? 'Bau' : 'Ausbau auf Stufe ' + e.upgrading.to}: ${Math.floor(100 * e.upgrading.t / e.upgrading.total)}% – noch ${fmtTime(e.upgrading.total - e.upgrading.t)}</div>`;
        else if (e.level < 5) {
          const why = G.upgradeCheck(p, e);
          h += `<div class="row">${btn('upgrade', `Ausbau auf Stufe ${e.level + 1}: ${costHtml(G.costOf(e.type, e.level + 1))} · ${fmtTime(G.timeOf(e.type, e.level + 1))}`, why)}${why ? `<span class="why">${why}</span>` : ''}</div>`;
        } else h += '<div class="good">Maximale Stufe erreicht</div>';
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
      h += `<div class="sel-head"><b>${e.name}</b> · ${role} · Stufe ${e.level} · ${ownerTxt}</div>
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
  // Nachrichten
  let lastMsgCount = -1;
  function renderMsgs() {
    const S = G.S;
    const list = S.msgs.slice(-7);
    const key = S.msgs.length + ':' + Math.floor(S.time / 2);
    if (key === lastMsgCount) return;
    lastMsgCount = key;
    $('#msgs').innerHTML = list.filter((m) => S.time - m.t < 25).map((m) => `<div class="msg ${m.cls}">${m.text}</div>`).join('');
  }

  function showEnd() {
    const S = G.S, p = me();
    const o = S.over;
    $('#end').classList.remove('hidden');
    $('#end-body').innerHTML = `<h1 class="${o.win ? 'win' : 'lose'}">${o.win ? 'Sieg!' : 'Niederlage'}</h1>
      <p>${o.byTime ? (o.win ? 'Die Zeit ist abgelaufen – dein Team liegt nach Punkten vorn.' : 'Die Zeit ist abgelaufen – der Gegner liegt nach Punkten vorn.') : o.win ? 'Alle gegnerischen Völker wurden bezwungen.' : 'Dein Haupthaus ist gefallen.'}</p>
      ${o.scores ? `<div class="stats">${o.scores.map((x) => `<span style="color:${x.color}">${x.name} <b>${x.score}</b></span>`).join('')}</div>` : ''}
      <div class="stats"><span>Spielzeit <b>${fmtTime(o.time)}</b></span><span>Besiegte Gegner <b>${p.stats.kills}</b></span><span>Verlorene Einheiten <b>${p.stats.lost}</b></span><span>Heldenstufe <b>${p.hero.level}</b></span><span>Haupthaus <b>Stufe ${p.th.level}</b></span></div>
      <button class="big" data-act="menu">Zum Hauptmenü</button> <button class="big" data-act="again">Revanche (neue Gegner)</button>`;
  }

  // -------------------------------------------------------------------------
  // Aktionen
  function findEnt(id) { return G.S.ents.find((e) => e.id === +id); }
  function act(el, ev) {
    const a = el.dataset.act, v = el.dataset.v;
    const S = G.S, p = S && S.players[0];
    switch (a) {
      case 'm-race': UI.cfg.race = v; UI.cfg.hero = null; renderMenu(); return;
      case 'm-hero': UI.cfg.hero = v; renderMenu(); return;
      case 'm-mode': UI.cfg.mode = v; renderMenu(); return;
      case 'm-diff': UI.cfg.difficulty = v; renderMenu(); return;
      case 'm-map': UI.cfg.map = v; renderMenu(); return;
      case 'm-dur': UI.cfg.duration = +v; renderMenu(); return;
      case 'm-start': case 'again': UI.startGame(); return;
      case 'menu': G.S = null; UI.showMenu(); return;
      case 'tab': UI.tab = v; break;
      case 'build': UI.placing = UI.placing === el.dataset.type ? null : el.dataset.type; UI.casting = null; break;
      case 'toggle': {
        const k = el.dataset.key, on = el.checked;
        if (k === 'heroManual') { p.hero.manual = on; p.hero.order = null; p.hero.hold = null; if (on) UI.selected = p.hero; }
        else if (k === 'prodOn') { if (UI.selected) UI.selected.prodOn = on; }
        else if (k.startsWith('auto.')) p.auto[k.slice(5)] = on;
        else p[k] = on;
        break;
      }
      case 'armymode': p.armyMode = v; p.manualPoint = null; UI.pickTarget = false; p.armyT = 0; break;
      case 'target': p.targetPlayer = S.players[+v]; p.manualPoint = null; p.armyT = 0; break;
      case 'pickpoint': UI.pickTarget = true; G.msg('Linksklick auf die Karte: Angriffsziel festlegen.', ''); break;
      case 'upgrade': if (UI.selected) G.upgradeBuilding(p, UI.selected); break;
      case 'upgradeid': { const b = findEnt(el.dataset.id); if (b) G.upgradeBuilding(p, b); break; }
      case 'selbld': { const b = findEnt(el.dataset.id); if (b) { UI.selected = b; G.R.centerOn(b.x, b.y); } break; }
      case 'focus': if (UI.selected) UI.selected.focus = v; break;
      case 'queue': if (UI.selected) G.queueUnit(p, UI.selected, v); break;
      case 'research': G.startResearch(p, el.dataset.line); break;
      case 'buy': G.buyItem(p, el.dataset.item); break;
      case 'sell': G.sellItem(p, +el.dataset.idx); break;
      case 'gotoshop': {
        const h = p.hero; if (h.dead) break;
        const s = S.shops.reduce((a, b) => (G.dist(b, h) < G.dist(a, h) ? b : a));
        if (h.manual) h.order = { type: 'move', x: s.x, y: s.y + 60 };
        else h.shopping = s;
        break;
      }
      case 'cast': castBtn(+el.dataset.idx); break;
      case 'race': G.castRaceAbility(p); break;
      case 'speed': S.speed = +v; S.paused = false; break;
      case 'pause': S.paused = !S.paused; break;
      case 'deselect': UI.selected = null; break;
      case 'centerhero': if (!p.hero.dead) G.R.centerOn(p.hero.x, p.hero.y); break;
      case 'centerbase': G.R.centerOn(p.base.x, p.base.y); break;
      case 'quit': if (confirm('Spiel wirklich beenden?')) { G.S = null; UI.showMenu(); } return;
    }
    renderPanel(true);
  }
  function castBtn(i) {
    const p = me(), h = p.hero, ab = h.abilities[i];
    if (!ab || h.dead) return;
    if (ab.type === 'heal' || ab.type === 'buff' || ab.type === 'summon' || ab.self) G.heroCastManual(p, i, h.x, h.y);
    else { UI.casting = i; UI.placing = null; G.msg(`${ab.name}: Ziel mit Linksklick wählen (Rechtsklick bricht ab).`, ''); }
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT') return; // Checkboxen über "change"
    act(el, ev);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.matches('input[type=checkbox][data-act]')) act(el, ev);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target; if (!el.dataset.slider || !G.S) return;
    const p = me(), v = +el.value;
    if (el.dataset.slider === 'attackFrac') p.attackFrac = v / 100;
    if (el.dataset.slider === 'goldRatio') p.goldRatio = v / 100;
    if (el.dataset.slider === 'comp') p.comp[el.dataset.role] = v;
    const lab = el.previousElementSibling && el.previousElementSibling.querySelector('b');
    if (lab && el.dataset.slider === 'attackFrac') lab.textContent = v + '%';
    if (el.nextElementSibling && el.nextElementSibling.classList.contains('cv')) el.nextElementSibling.textContent = v;
  });
  const panel = () => $('#panel');
  document.addEventListener('pointerdown', (ev) => { if (ev.target.closest('#panel, #selection')) UI.pointerDownPanel = true; });
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
        if (Math.abs(e.x - wx) < hs && Math.abs(e.y - wy) < hs + 10) { const d = 30; if (d < bd) { bd = d; best = e; } }
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
    cv.addEventListener('pointermove', (ev) => {
      const r = cv.getBoundingClientRect();
      G.R.mouse.x = ev.clientX - r.left; G.R.mouse.y = ev.clientY - r.top; G.R.mouse.inside = true;
      const w = G.R.toWorld(G.R.mouse.x, G.R.mouse.y); G.R.mouse.wx = w.x; G.R.mouse.wy = w.y;
      if (drag) {
        const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
        if (drag.moved) { G.R.cam.x = drag.cx - dx / G.R.cam.z; G.R.cam.y = drag.cy - dy / G.R.cam.z; G.R.clampCam(); }
      }
    });
    cv.addEventListener('pointerleave', () => { G.R.mouse.inside = false; });
    cv.addEventListener('pointerdown', (ev) => {
      if (!G.S) return;
      if (ev.button === 0 || ev.button === 1) { drag = { sx: ev.clientX, sy: ev.clientY, cx: G.R.cam.x, cy: G.R.cam.y, moved: false, button: ev.button }; cv.setPointerCapture(ev.pointerId); }
      if (ev.button === 2) rightClick();
    });
    cv.addEventListener('pointerup', (ev) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.moved || d.button !== 0) return;
      leftClick();
    });
    cv.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const R = G.R, z0 = R.cam.z;
      const z1 = G.clamp(z0 * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), 0.45, 1.8);
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
      if (k === 'r') G.castRaceAbility(p);
      if (k === 'h') { p.hero.manual = !p.hero.manual; p.hero.order = null; p.hero.hold = null; G.msg(`Held: ${p.hero.manual ? 'manuelle Steuerung' : 'automatisch'}`, ''); renderPanel(true); }
      if (k === ' ') { ev.preventDefault(); if (!p.hero.dead) G.R.centerOn(p.hero.x, p.hero.y); }
      if (k === 'p') { G.S.paused = !G.S.paused; }
      if (k === 'b') { UI.tab = 'bauen'; renderPanel(true); }
    });
    window.addEventListener('keyup', (ev) => { keys[ev.key.toLowerCase()] = false; });
  };
  function setManualPoint(x, y) {
    const p = me();
    p.manualPoint = { x, y }; p.armyMode = 'angriff'; UI.pickTarget = false; p.armyT = 0;
    G.S.fx.push({ type: 'ring', x, y, r: 30, color: '#ff4040', t: 0, dur: 0.8 });
    G.msg('Armee greift den markierten Punkt an.', 'gold');
    renderPanel(true);
  }
  function leftClick() {
    const p = me(), wx = G.R.mouse.wx, wy = G.R.mouse.wy;
    if (UI.placing) {
      const b = G.placeBuilding(p, UI.placing, wx, wy);
      if (b) { if (!window.event || !window.event.shiftKey) UI.placing = null; UI.selected = b; }
      else G.msg(G.buildingCheck(p, UI.placing) || 'Hier kann nicht gebaut werden (nur innerhalb deines Basisrings, nicht überlappend).', 'bad');
      renderPanel(true); return;
    }
    if (UI.casting !== null) { G.heroCastManual(p, UI.casting, wx, wy); UI.casting = null; renderPanel(true); return; }
    if (UI.pickTarget) { setManualPoint(wx, wy); return; }
    UI.selected = pickAt(wx, wy);
    renderPanel(true);
  }
  function rightClick() {
    const p = me();
    if (UI.placing || UI.casting !== null || UI.pickTarget) { UI.placing = null; UI.casting = null; UI.pickTarget = false; renderPanel(true); return; }
    if (p.hero.manual && !p.hero.dead) G.heroCommand(p, G.R.mouse.wx, G.R.mouse.wy);
    else if (!p.hero.dead) G.msg('Taste H: manuelle Heldensteuerung aktivieren, dann Rechtsklick zum Bewegen.', '');
  }

  UI.updateCamera = function (dt) {
    const R = G.R, sp = 900 * dt / R.cam.z;
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

  let tTop = 0, tPanel = 0, tMini = 0, endShown = false;
  UI.tick = function (dt) {
    const S = G.S; if (!S) return;
    tTop -= dt; tPanel -= dt; tMini -= dt;
    if (tTop <= 0) { tTop = 0.2; renderTop(); renderMsgs(); }
    if (tPanel <= 0) { tPanel = 0.5; renderPanel(false); }
    if (tMini <= 0) { tMini = 0.15; G.R.drawMinimap($('#minimap')); }
    if (S.over && !endShown) { endShown = true; showEnd(); }
    if (!S.over) endShown = false;
    $('#view').style.cursor = UI.placing || UI.casting !== null || UI.pickTarget ? 'crosshair' : 'default';
  };
})();
