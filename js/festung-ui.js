'use strict';
// Reichsfeuer: Festungen – Oberfläche: Startbildschirm, Leisten, Fenster, Steuerung (Maus, Finger, Tasten) und Spielschleife.
(function () {
  const F = G.F, R = G.R, T = G.TILE;
  const $ = (s) => document.querySelector(s);
  const U = (F.UI = { mode: 'start', sel: null, place: null, sheet: null, deploy: null, raid: null, pick: { race: 'menschen', hero: null, name: '' }, io: null, homeCam: null });
  G.UI = { selected: null, placing: null, casting: null }; // nur für den Renderer (Auswahlrahmen, Reichweite)
  let st = null;

  // -------------------------------------------------------------------------
  // Hilfen
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n) => Math.floor(n).toLocaleString('de-DE');
  const dur = (s) => {
    s = Math.max(0, Math.ceil(s));
    if (s < 60) return s + ' s';
    if (s < 3600) return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' min';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  };
  const clock = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const cost = (c) => [c.g ? `<span class="c-g">${fmt(c.g)}</span>` : '', c.w ? `<span class="c-w">${fmt(c.w)}</span>` : ''].filter(Boolean).join(' ') || 'kostenlos';
  const gold = (n) => `<span class="c-g">${fmt(n)}</span>`;
  const both = (c) => `<span class="c-g">${fmt(c.g)}</span> <span class="c-w">${fmt(c.w)}</span>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rname = (r) => G.RACES[r].name;
  const bn = (type) => F.bname(st.race, type);
  const ago = (t) => { const s = (F.now() - t) / 1000; if (s < 90) return 'gerade eben'; if (s < 3600) return `vor ${Math.round(s / 60)} min`; if (s < 86400) return `vor ${Math.round(s / 3600)} h`; return `vor ${Math.round(s / 86400)} Tagen`; };
  const flags = (n) => `<span class="flags">${[0, 1, 2].map((i) => `<i class="flag ${(Array.isArray(n) ? n[i] : i < n) ? 'on' : ''}"></i>`).join('')}</span>`;
  const signed = (n) => (n > 0 ? '+' : '') + n;
  const cv = () => $('#view');
  const ICON_G = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f0c24a" stroke="#6a4a0a" stroke-width="2"/><circle cx="12" cy="12" r="6.4" fill="none" stroke="#c8961e" stroke-width="1.6"/><path d="M7.6 8a6 6 0 0 1 5.2-2.4" stroke="#fff6c0" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
  const ICON_W = '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="16" height="10" rx="3" fill="#b9824e" stroke="#4a2e16" stroke-width="2"/><path d="M5 10h9M6 14h7" stroke="#8a5a30" stroke-width="1.3"/><ellipse cx="18" cy="12" rx="4" ry="5" fill="#e6b47c" stroke="#4a2e16" stroke-width="2"/><ellipse cx="18" cy="12" rx="1.8" ry="2.4" fill="none" stroke="#a8743a" stroke-width="1.2"/></svg>';

  function toast(text, cls) {
    const box = $('#toasts'), d = document.createElement('div');
    d.className = 'toast ' + (cls || ''); d.innerHTML = text;
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 3600);
  }
  let lastErr = 0, lastErrTxt = '';
  function err(text) { const n = performance.now(); if (n - lastErr < 700 && text === lastErrTxt) return; lastErr = n; lastErrTxt = text; toast(esc(text), 'bad'); }

  // Ton: erst nach der ersten Berührung (Vorgabe der Browser)
  let audioOn = false;
  function applySound() {
    if (!G.Audio || !st) return;
    const s = st.settings;
    G.Audio.music = s.music; G.Audio.sfx = s.sfx; G.Audio.muted = !!s.muted;
    if (G.Audio.apply) G.Audio.apply();
  }
  function ensureAudio() {
    if (audioOn || !G.Audio) return;
    audioOn = true;
    try { G.Audio.init(); applySound(); if (G.S) G.Audio.setTheme(G.S.theme); } catch (e) { /* ohne Ton weiter */ }
  }
  function theme(S) { if (audioOn && G.Audio) G.Audio.setTheme(S.theme); }

  // Vorschaubilder (Einheiten, Helden) in Fenstern zeichnen, sobald sie sichtbar sind
  function drawPreviews(root) {
    requestAnimationFrame(() => {
      for (const c of root.querySelectorAll('canvas[data-prev]')) {
        const race = c.dataset.race || st.race;
        const z = +c.dataset.zoom || 1;
        if (c.dataset.prev === 'hero') R.drawPreview(c, race, 'hero', c.dataset.hero || st.hero, null, z);
        else R.drawPreview(c, race, 'unit', c.dataset.role, null, z);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Tageszeit: Licht und Schatten nach der echten Uhrzeit (Einstellung: echt, immer Tag, immer Nacht)
  const lightFor = (h) => R.lightFor(h, 0.6);
  function updateLight() {
    const mode = (st && st.settings.tod) || 'echt', d = new Date();
    R.light = !st || U.mode === 'start' ? null : lightFor(mode === 'tag' ? 12 : mode === 'nacht' ? 23 : d.getHours() + d.getMinutes() / 60);
  }
  // Wege vom Haupthaus zu allen Gebäuden (werden in den Boden gezeichnet)
  R.groundHook = function (g, S, sc) {
    if (!S.festung) return;
    const th = S.ents.find((e) => e.kind === 'building' && e.type === 'haupthaus' && !e.dead);
    if (!th) return;
    const road = G.THEMES[S.theme].road, list = S.ents.filter((e) => e.kind === 'building' && e.type !== 'mauer' && e !== th && !e.dead);
    const path = (b) => { g.beginPath(); g.moveTo(th.x * sc, th.y * sc); g.lineTo(b.x * sc, th.y * sc); g.lineTo(b.x * sc, b.y * sc); };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalAlpha = 0.5; g.strokeStyle = R.shade(road, -0.38); g.lineWidth = 22 * sc; for (const b of list) { path(b); g.stroke(); }
    g.globalAlpha = 0.92; g.strokeStyle = R.shade(road, 0.04); g.lineWidth = 16 * sc; for (const b of list) { path(b); g.stroke(); }
    g.globalAlpha = 0.5; g.fillStyle = R.shade(road, -0.2);
    const stones = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 11), hor = Math.abs(x1 - x0) > Math.abs(y1 - y0);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, o = i % 2 ? 3.5 : -3.5; g.fillRect((x + (hor ? 0 : o) - 3) * sc, (y + (hor ? o : 0) - 2.5) * sc, 6 * sc, 5 * sc); }
    };
    for (const b of list) { stones(th.x, th.y, b.x, th.y); stones(b.x, th.y, b.x, b.y); }
    g.restore();
  };
  const layoutSig = () => st.blds.map((b) => `${b.id}:${b.tx},${b.ty}`).join('|');
  // Fliegende Münzen und Stämme zur Rohstoffanzeige
  function flyRes(kind, wx, wy, n) {
    const tgt = document.querySelector('#ftop .res.' + kind);
    if (!tgt || !n) return;
    const r = tgt.getBoundingClientRect(), tx = r.left + 16, ty = r.top + r.height / 2 - 6;
    const sx = (wx - R.cam.x) * R.cam.z, sy = (wy - R.cam.y) * R.cam.z;
    for (let i = 0; i < Math.min(12, n); i++) {
      const el = document.createElement('div'), ox = (Math.random() - 0.5) * 56, oy = (Math.random() - 0.5) * 34, delay = i * 45;
      el.className = 'flyc'; el.innerHTML = kind === 'g' ? ICON_G : ICON_W;
      el.style.left = sx + ox + 'px'; el.style.top = sy + oy + 'px';
      document.body.appendChild(el);
      setTimeout(() => { el.style.transform = `translate(${tx - sx - ox}px, ${ty - sy - oy}px) scale(0.55)`; el.style.opacity = '0.35'; }, 40 + delay);
      setTimeout(() => { el.remove(); tgt.classList.add('bump'); setTimeout(() => tgt.classList.remove('bump'), 160); }, 720 + delay);
    }
  }
  // Große Einblendungen: „Zum Angriff!“, eroberte Banner, Konfetti beim Sieg
  function bigCall(text, cls) {
    const el = document.createElement('div'); el.className = 'bigcall ' + (cls || ''); el.textContent = text;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1900);
  }
  function bannerPop(text, bad) {
    const el = document.createElement('div'); el.className = 'bannerpop' + (bad ? ' bad' : '');
    el.innerHTML = `<i class="flag on"></i><span>${esc(text)}</span>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
    G.sfx(bad ? 'alarm' : 'horn', 0, 0, 0.8, true);
  }
  function buzz(ms) { try { if (R.touch && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* egal */ } }
  function confetti(box) {
    const cols = ['#ffd23a', '#ff6a3a', '#7ac8ff', '#7aff9a', '#ff7ad0', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length];
      c.style.animationDelay = Math.random() * 0.8 + 's'; c.style.animationDuration = 2 + Math.random() * 1.6 + 's';
      c.style.setProperty('--dx', (Math.random() - 0.5) * 160 + 'px'); c.style.setProperty('--rot', Math.random() * 900 + 'deg');
      box.appendChild(c);
    }
  }

  // -------------------------------------------------------------------------
  // Szenen wechseln
  function setCam(S, kind, cam) {
    const c = cv();
    if (cam) { R.cam.z = cam.z; R.cam.x = cam.x; R.cam.y = cam.y; R.clampCam(); return; }
    if (kind === 'home') {
      R.cam.z = R.touch ? 0.62 : 0.85;
      const th = S.players[0].th; R.centerOn(th.x, th.y + 30);
    } else {
      // ganze Siedlung zeigen, aber nie über den Kartenrand hinaus (kein schwarzer Rand)
      const P = S.plot, fit = Math.min(c.clientWidth / (P.w + 240), (c.clientHeight - 150) / (P.h + 240)), fill = Math.max(c.clientWidth, c.clientHeight) / S.w;
      R.cam.z = clamp(Math.max(fit, fill), 0.3, 1.2);
      R.centerOn(P.x + P.w / 2, P.y + P.h / 2 + 30 / R.cam.z);
      R.cam.x = clamp(R.cam.x, 0, Math.max(0, S.w - R.viewW())); R.cam.y = clamp(R.cam.y, 0, Math.max(0, S.h - R.viewH()));
    }
  }
  function showHud(on) {
    for (const id of ['#ftop', '#bottom']) $(id).classList.toggle('hidden', !on);
    $('#start').classList.toggle('hidden', on);
  }
  function enterHome(keepCam) {
    U.mode = 'home'; U.raid = null; U.deploy = null; U.place = null; F.raid = null; hold = null;
    const S = F.homeScene(st);
    R.buildGround(S); U.groundSig = layoutSig();
    updateLight();
    document.body.dataset.race = st.race;
    showHud(true);
    setCam(S, 'home', keepCam ? U.homeCam : null);
    theme(S);
    select(null);
    U.bottomMode = null; U.topMode = null;
    renderAll();
  }
  function startRaid(tgt) {
    if (U.mode === 'home') U.homeCam = { ...R.cam };
    if (!F.armyCount(st) && !F.heroReady(st)) { err('Du hast keine Truppen – bilde zuerst welche aus.'); return; }
    closeSheet(); select(null); U.place = null;
    const Rd = F.raidScene(st, tgt);
    U.raid = Rd; U.mode = 'raid'; U.resultShown = false;
    R.buildGround(Rd.S);
    setCam(Rd.S, 'raid');
    theme(Rd.S);
    U.deploy = nextTroop();
    U.bottomMode = null; U.topMode = null;
    renderAll();
    toast(`Setze deine Truppen <b>außerhalb</b> des roten Festungsgrunds ab. ${R.touch ? 'Tippen' : 'Klicken'} setzt einen Krieger ab, gedrückt halten setzt mehrere ab.`, 'gold');
  }
  function startProbe(race) {
    if (U.mode === 'home') U.homeCam = { ...R.cam };
    closeSheet(); select(null); U.place = null;
    const atk = F.aiAttacker(F.th(st), race || null);
    const Rd = F.defenseScene(st, atk, 'probe');
    U.raid = Rd; U.mode = 'watch'; U.resultShown = false; U.deploy = null;
    R.buildGround(Rd.S);
    setCam(Rd.S, 'raid');
    theme(Rd.S);
    U.bottomMode = null; U.topMode = null;
    renderAll();
    toast(`Probeangriff: ${esc(rname(atk.race))} greifen an – ohne Verluste für dich.`, 'gold');
  }
  function nextTroop() {
    const Rd = U.raid;
    const r = F.roles(st).find((x) => Rd.troops[x] > 0);
    if (r) return { kind: 'unit', role: r };
    const m = Object.keys(F.MERCS).find((k) => Rd.mercs && Rd.mercs[k] > 0);
    if (m) return { kind: 'merc', key: m };
    if (Rd.heroAvail && !Rd.heroOut) return { kind: 'unit', role: 'held' };
    return null;
  }

  // -------------------------------------------------------------------------
  // Obere Leiste
  function renderTop() {
    const top = $('#ftop');
    const mode = U.mode === 'home' ? 'home' : U.mode === 'raid' ? 'raid' + (U.raid.started ? '1' : '0') : 'watch';
    if (U.topMode !== mode) {
      U.topMode = mode;
      let ctrl = '';
      if (mode === 'home') ctrl = '<button data-act="sheet" data-v="mehr" title="Mehr: Probeangriff, Ton, Spielstand, Hilfe">☰</button>';
      else if (mode === 'raid0') ctrl = (U.raid.kind === 'pluendern' ? `<button data-act="next" title="Anderen Gegner suchen">Nächster ${gold(F.searchCost(F.th(st)))}</button>` : '') + '<button data-act="back">Zurück</button>';
      else if (mode === 'raid1') ctrl = '<button data-act="speed" title="Tempo">⏩ <b id="spd">1×</b></button><button data-act="end">Beenden</button>';
      top.innerHTML = '<div id="topinfo" style="display:contents"></div><span class="spacer"></span>' + ctrl;
      U.topHtml = '';
    }
    let h;
    if (mode === 'home') {
      const cap = F.cap(st), b = F.buildersTotal(st), used = F.armyUsed(st), house = F.housing(st), now = F.now();
      const res = (k, v, c, label) => `<div class="res ${k} ${v >= c ? 'full' : ''}" title="${label}"><b><i class="ri">${k === 'g' ? ICON_G : ICON_W}</i>${fmt(v)}</b><small>/ ${fmt(c)}</small><span class="bar"><i style="width:${Math.min(100, (100 * v) / c)}%"></i></span></div>`;
      h = res('g', st.gold, cap.g, 'Gold') + res('w', st.wood, cap.w, 'Holz')
        + `<div class="pill" title="Freie Baumeister">🔨 ${b - F.busy(st)}/${b}</div><div class="pill" title="Truppenplätze">⚔ ${used}/${house}</div>`
        + `<div class="pill ruhm" title="Ruhm – steigt mit gewonnenen Raubzügen">🏆 <b>${st.ruhm}</b> ${F.rankOf(st.ruhm)}</div>`
        + (st.blds.filter((b) => F.RATE[b.type] && (b.acc || 0) >= 25).length >= 2 ? '<button class="collectbtn" data-act="collectall" title="Alle Minen und Sägewerke leeren">⛏ Alles einsammeln</button>' : '')
        + (F.th(st) < 2 ? '<div class="pill shield" title="Bis Haupthaus Stufe 2 greift dich niemand an">🛡 Anfängerschutz</div>'
          : st.shieldUntil > now ? `<div class="pill shield" title="Solange der Schild hält, greift dich niemand an">🛡 ${dur((st.shieldUntil - now) / 1000)}</div>` : '');
    } else {
      const Rd = U.raid, left = F.timeLeft(Rd);
      h = `<div class="raidname"><b>${esc(Rd.tgt.name)}</b><small>${U.mode === 'watch' ? 'greift deine Festung an' : `${rname(Rd.tgt.race)} · Haupthaus ${Rd.tgt.th}`}</small></div>`
        + `<div class="pill" title="Beute: erbeutet / verfügbar">${both(Rd.loot)} <small>/ ${both(Rd.lootMax)}</small></div>`
        + `<div class="clock ${Rd.started && left < 30 ? 'low' : ''}" title="${Rd.started ? 'Verbleibende Kampfzeit' : 'Die Uhr läuft ab dem ersten Absetzen'}">${clock(left)}</div>`
        + `<div class="pill" title="Zerstörung und Kriegsbanner">${F.pct(Rd)}&nbsp;% ${flags(F.bannersOf(Rd))}</div>`
        + (U.mode === 'raid' && !Rd.started && Rd.kind === 'pluendern' ? `<div class="pill" title="Dein Gold (die Suche nach einem anderen Gegner kostet Gold)">Dein Gold ${gold(st.gold)}</div>` : '');
    }
    if (h !== U.topHtml) { U.topHtml = h; $('#topinfo').innerHTML = h; }
    const sp = $('#spd'); if (sp && G.S) sp.textContent = G.S.speed + '×';
  }

  // -------------------------------------------------------------------------
  // Untere Leiste: Hauptknöpfe bzw. Truppen, Held und Volksfähigkeiten beim Kampf
  const MAIN = [['bauen', '🏗️', 'Bauen'], ['armee', '⚔️', 'Armee'], ['schmiede', '⚒️', 'Schmiede'], ['angriff', '🗺️', 'Angriff'], ['berichte', '📜', 'Berichte'], ['erfolge', '🏆', 'Erfolge']];
  function renderBottom() {
    const bot = $('#bottom'), mode = U.mode === 'home' ? 'home' : U.mode;
    if (U.bottomMode !== mode) {
      U.bottomMode = mode;
      bot.classList.toggle('raid', mode !== 'home');
      if (mode === 'home') bot.innerHTML = MAIN.map(([k, ic, n]) => `<button class="main" data-act="sheet" data-v="${k}"><span>${ic}</span>${n}<i class="badge hidden" id="badge-${k}"></i></button>`).join('');
      else if (mode === 'raid') {
        const Rd = U.raid, me = Rd.atk;
        let h = '';
        for (const role of F.roles(st)) {
          if (!(Rd.troops[role] > 0)) continue;
          h += `<button class="dcard" data-act="deploy" data-v="${role}" title="${esc(G.RACES[st.race].units[role].name)}"><canvas data-prev="unit" data-role="${role}" data-zoom="1.7"></canvas><span class="n" id="dn-${role}"></span><span class="lv">${'★'.repeat(Rd.unitLvl[role] || 1)}</span>${esc(G.RACES[st.race].units[role].name)}</button>`;
        }
        if (me.hero && Rd.heroAvail) h += `<button class="dcard" data-act="deploy" data-v="held" title="${esc(me.hero.name)}"><canvas data-prev="hero" data-zoom="1.5"></canvas><span class="n" id="dn-held"></span><span class="lv">St. ${me.hero.level}</span>Held</button>`;
        for (const k in F.MERCS) if (Rd.mercs[k] > 0) h += `<button class="dcard ab" data-act="merc" data-v="${k}" id="mc-${k}" title="${esc(F.MERCS[k].desc)}"><span class="abi">${F.MERCS[k].icon}</span><span class="n" id="mn-${k}"></span>${esc(F.MERCS[k].name)}</button>`;
        h += '<span class="dsep"></span>';
        me.rd.abilities.forEach((ab, i) => { h += `<button class="dcard ab" data-act="ability" data-v="${i}" id="ab-${i}" title="${esc(ab.desc)}"><span class="abi">✦</span>${esc(ab.name)}</button>`; });
        const pots = Object.keys(F.POTIONS).filter((k) => Rd.potions[k] > 0);
        if (pots.length) h += '<span class="dsep"></span>' + pots.map((k) => `<button class="dcard ab" data-act="pot" data-v="${k}" id="pt-${k}" title="${esc(F.POTIONS[k].desc)}"><span class="abi">${F.POTIONS[k].icon}</span><span class="n" id="pn-${k}"></span>${esc(F.POTIONS[k].name)}</button>`).join('');
        bot.innerHTML = h;
        drawPreviews(bot);
      } else bot.innerHTML = '<button class="main" data-act="speed"><span>⏩</span>Tempo <b id="spd">1×</b></button><button class="main" data-act="end"><span>🏳️</span>Beenden</button>';
    }
    if (mode === 'home') {
      const badge = (k, txt) => { const b = $('#badge-' + k); if (b) { b.textContent = txt || ''; b.classList.toggle('hidden', !txt); } };
      badge('armee', st.queue.length ? '⏳' + st.queue.length : '');
      badge('schmiede', st.researching ? '⏳' : '');
      badge('berichte', st.unread ? String(st.unread) : '');
      badge('bauen', F.buildersFree(st) > 0 ? String(F.buildersFree(st)) : '');
      { const n = F.claimableCount(st); badge('erfolge', n ? String(n) : ''); }
    } else if (mode === 'raid') {
      const Rd = U.raid;
      for (const el of $('#bottom').querySelectorAll('[data-act="deploy"]')) {
        const role = el.dataset.v, n = role === 'held' ? (Rd.heroOut ? 0 : 1) : Rd.troops[role] || 0;
        const ne = $('#dn-' + role); if (ne) ne.textContent = role === 'held' ? '' : n;
        el.classList.toggle('empty', !n);
        el.classList.toggle('sel', !!(U.deploy && U.deploy.kind === 'unit' && U.deploy.role === role));
      }
      for (const k in F.MERCS) { const el = $('#mc-' + k); if (!el) continue; const n = Rd.mercs[k] || 0; $('#mn-' + k).textContent = n; el.classList.toggle('empty', !n); el.classList.toggle('sel', !!(U.deploy && U.deploy.kind === 'merc' && U.deploy.key === k)); }
      for (const k in F.POTIONS) { const el = $('#pt-' + k); if (!el) continue; const n = Rd.potions[k] || 0; $('#pn-' + k).textContent = n; el.classList.toggle('empty', !n); el.classList.toggle('sel', !!(U.deploy && U.deploy.kind === 'pot' && U.deploy.key === k)); }
      Rd.atk.rd.abilities.forEach((ab, i) => {
        const el = $('#ab-' + i); if (!el) return;
        const why = F.abilityCheck(Rd, i);
        el.classList.toggle('empty', !!why && why !== 'Erst Truppen absetzen');
        el.classList.toggle('sel', !!(U.deploy && U.deploy.kind === 'ab' && U.deploy.i === i));
        el.title = (why ? why + ' – ' : '') + ab.desc;
      });
    }
  }

  // -------------------------------------------------------------------------
  // Ratgeber: ein Tipp für den nächsten sinnvollen Schritt
  function tipOf() {
    if (st.tips.off) return null;
    const th = F.th(st);
    if (st.blds.some((b) => F.RATE[b.type] && b.level > 0 && b.acc >= 150)) return { t: '<b>Tipp:</b> Tippe deine Minen und Sägewerke an, um einzusammeln.', a: 'collectall' };
    if (st.finds.length) return { t: '<b>Tipp:</b> Auf deinem Grundstück liegt ein Fundstück – tippe es an!', a: 'none' };
    if (F.claimableCount(st)) return { t: '<b>Tipp:</b> Unter 🏆 Erfolge wartet eine Belohnung.', a: 'erfolge' };
    if (!F.count(st, 'schatzkammer')) return { t: `<b>Tipp:</b> Ein Goldlager bauen („${esc(bn('schatzkammer'))}“) – dann fasst deine Festung mehr Gold.`, a: 'bauen' };
    if (F.armyCount(st) < 8 && !st.queue.length) return { t: '<b>Tipp:</b> Bilde unter ⚔ Armee Truppen aus.', a: 'armee' };
    if (!(st.camp[0] >= 1)) return { t: `<b>Tipp:</b> Greife unter 🗺 Angriff den „${esc(F.CAMPAIGN[0].name)}“ an!`, a: 'angriff' };
    if (th === 1 && !F.thB(st).up) return { t: `<b>Tipp:</b> Das Haupthaus („${esc(bn('haupthaus'))}“) ausbauen – das schaltet neue Gebäude frei.`, a: 'th' };
    if (th >= 2 && st.walls.length < 16) return { t: `<b>Tipp:</b> Umgib ${esc(bn('haupthaus'))} und Lager mit Mauern – Feinde müssen sie erst durchbrechen.`, a: 'bauen' };
    if (th >= 2 && !st.traps.length) return { t: '<b>Tipp:</b> Lege Fallen (unter 🏗️ Bauen) – Angreifer sehen sie nicht.', a: 'bauen' };
    if (th >= 3 && !F.count(st, 'alchemie')) return { t: `<b>Tipp:</b> Ein ${esc(bn('alchemie'))} braut Tränke für deine Raubzüge.`, a: 'bauen' };
    if (F.buildersFree(st) > 0) return { t: '<b>Tipp:</b> Ein Baumeister ist frei – baue etwas oder baue aus.', a: 'bauen' };
    return null;
  }
  function renderTip() {
    const el = $('#tip'), show = U.mode === 'home' && !U.sel && !U.place && !U.sheet;
    const t = show ? tipOf() : null;
    el.classList.toggle('hidden', !t);
    if (t) { if (el.dataset.t !== t.t) { el.innerHTML = t.t + ' <small>(antippen)</small>'; el.dataset.t = t.t; } el.dataset.a = t.a; }
  }

  // -------------------------------------------------------------------------
  // Gewähltes Gebäude
  function entOf(rec) { return G.S ? G.S.ents.find((e) => e.rec === rec && !e.dead) || null : null; }
  function selectTrap(t) { U.sel = t; U.selWall = false; U.selTrap = true; G.UI.selected = null; renderSel(); renderTip(); }
  function select(e) {
    U.sel = e && e.rec ? e.rec : null;
    U.selWall = !!(e && e.type === 'mauer'); U.selTrap = false;
    G.UI.selected = e || null;
    renderSel(); renderTip();
  }
  function roleList(type) {
    const rd = G.RACES[st.race], out = [];
    for (const r of F.roles(st)) { const src = F.roleSource(rd, r); if (src && src[0] === type) out.push(`${esc(rd.units[r].name)} (St. ${src[1]})`); }
    return out.join(', ');
  }
  // Was der nächste Ausbau bringt
  function nextTxt(b) {
    const L = Math.max(1, b.level), N = L + 1;
    switch (b.type) {
      case 'goldmine': case 'saegewerk': return `▲ ${fmt(F.mineRate(st, { type: b.type, level: L }))} → ${fmt(F.mineRate(st, { type: b.type, level: N }))} je Minute`;
      case 'schatzkammer': case 'holzlager': return `▲ Lager ${fmt(F.STORE[L - 1])} → ${fmt(F.STORE[N - 1])}`;
      case 'unterkunft': return `▲ Plätze ${F.HOUSE[L - 1]} → ${F.HOUSE[N - 1]}`;
      case 'turm': case 'kanone': { const a = G.BUILDINGS[b.type].attack; return `▲ Schaden ${Math.round(a.dmg * (1 + 0.2 * (L - 1)))} → ${Math.round(a.dmg * (1 + 0.2 * (N - 1)))}`; }
      case 'alchemie': return `▲ Trankplätze ${F.POTION_SLOTS[L - 1]} → ${F.POTION_SLOTS[N - 1]}${Object.values(F.POTIONS).some((q) => q.lvl === N) ? ' · neuer Trank' : ''}`;
      case 'taverne': return Object.values(F.MERCS).some((m) => m.lvl === N) ? `▲ neuer Söldner: ${Object.values(F.MERCS).find((m) => m.lvl === N).name}` : '▲ stärkere Söldner';
      case 'schmiede': return `▲ Forschung bis Stufe ${N}`;
      case 'haupthaus': {
        const neu = Object.keys(F.LIMITS).filter((t) => t !== 'haupthaus' && F.LIMITS[t][N - 1] > F.LIMITS[t][L - 1]).map((t) => bn(t));
        return `▲ Lager ${fmt(F.STORE_TH[L - 1])} → ${fmt(F.STORE_TH[N - 1])}${neu.length ? ' · mehr: ' + neu.slice(0, 4).join(', ') + (neu.length > 4 ? ' …' : '') : ''}`;
      }
      default: return roleList(b.type) ? '▲ stärkere Krieger' + (Object.values(G.PRODUCTION[b.type] || {}).includes(N) ? ' und eine neue Truppe' : '') : '';
    }
  }
  function renderSel() {
    const el = $('#sel'), b = U.sel;
    if (!b || U.mode !== 'home' || U.place) { el.classList.add('hidden'); return; }
    const now = F.now();
    let h, btns = '';
    if (U.selTrap) {
      if (!st.traps.includes(b)) { U.sel = null; el.classList.add('hidden'); return; }
      const d = F.TRAPS[b.type], why = F.trapCheck(st, b);
      h = `<div class="head"><span class="ic">${F.ICONS[b.type]}</span><h3>${esc(d.name)}</h3><small>Stufe ${b.level}</small><button class="x" data-act="desel">✕</button></div>
        <div class="info">${esc(d.desc)} · Schaden <b>${Math.round(d.dmg * F.trapMul(b.level))}</b> · Wirkkreis <b>${d.radius}</b> · für Angreifer unsichtbar, nach jedem Kampf wieder scharf</div>`;
      if (b.level < 3) btns += `<button data-act="trapup" ${why ? 'disabled' : ''}>Ausbauen → St. ${b.level + 1}<small>${cost(d.cost[b.level])}${why ? ' · ' + esc(why) : ''}</small></button>`;
      btns += '<button data-act="move">Versetzen</button><button data-act="traprm">Entfernen</button>';
    } else if (U.selWall) {
      if (!st.walls.includes(b)) { U.sel = null; el.classList.add('hidden'); return; }
      const w = G.WALLS[b.level - 1], same = st.walls.filter((x) => x.level === b.level).length, why = F.wallCheck(st, b);
      const allCost = b.level < 3 ? { g: F.WALL_COST[b.level].g * same, w: F.WALL_COST[b.level].w * same } : null;
      h = `<div class="head"><span class="ic">🧱</span><h3>${esc(w.name)}</h3><small>Mauer Stufe ${b.level}</small><button class="x" data-act="desel">✕</button></div>
        <div class="info"><b>${fmt(w.hp)}</b> LP · Rüstung <b>${w.armor}</b> · ${st.walls.length}/${F.limit(st, 'mauer')} Mauerstücke</div>`;
      if (b.level < 3) btns += `<button data-act="wallup" ${why ? 'disabled' : ''}>Ausbauen → St. ${b.level + 1}<small>${cost(F.WALL_COST[b.level])}${why ? ' · ' + esc(why) : ''}</small></button>`;
      if (allCost && same > 1 && !why) btns += `<button data-act="wallall">Alle ${same} Mauern St. ${b.level} ausbauen<small>${cost(allCost)} (so weit es reicht)</small></button>`;
      btns += '<button data-act="move">Versetzen</button><button data-act="wallrm">Abreißen</button>';
    } else {
      if (!st.blds.includes(b)) { U.sel = null; el.classList.add('hidden'); return; }
      const L = b.level, Lx = Math.max(1, L);
      let info = '';
      switch (b.type) {
        case 'haupthaus': info = `Lagert je <b>${fmt(F.STORE_TH[Lx - 1])}</b> Gold und Holz · <b>${F.buildersTotal(st)}</b> Baumeister · Höchststufe aller Gebäude: <b>${Lx}</b>`; break;
        case 'goldmine': case 'saegewerk': info = `Fördert <b>${fmt(F.mineRate(st, { type: b.type, level: Lx }))}</b> ${b.type === 'goldmine' ? 'Gold' : 'Holz'}/min · Vorrat <b>${fmt(b.acc || 0)}</b> / ${fmt(F.mineBuffer(st, { type: b.type, level: Lx }))}`; break;
        case 'schatzkammer': info = `Lagert <b>${fmt(F.STORE[Lx - 1])}</b> Gold`; break;
        case 'holzlager': info = `Lagert <b>${fmt(F.STORE[Lx - 1])}</b> Holz`; break;
        case 'unterkunft': info = `<b>${F.HOUSE[Lx - 1]}</b> Truppenplätze`; break;
        case 'alchemie': info = `<b>${F.POTION_SLOTS[Lx - 1]}</b> Trankplätze · braut: ${Object.values(F.POTIONS).filter((q) => q.lvl <= Lx).map((q) => q.name).join(', ')}`; break;
        case 'taverne': info = `Söldner: ${Object.values(F.MERCS).filter((m) => m.lvl <= Lx).map((m) => m.name).join(', ')}${Lx < 5 ? ' · höhere Stufe = stärkere Söldner' : ''}`; break;
        case 'schmiede': info = `Forschung bis Stufe <b>${Lx}</b> · Waffen ${st.research.waffen}, Rüstung ${st.research.ruestung}, Ausbildung ${st.research.ausbildung}${roleList('schmiede') ? ' · bildet aus: ' + roleList('schmiede') : ''}`; break;
        case 'turm': case 'kanone': { const a = G.BUILDINGS[b.type].attack; info = `Schaden <b>${Math.round(a.dmg * (1 + 0.2 * (Lx - 1)))}</b> alle ${a.cd} s · Reichweite <b>${a.range}</b>${a.splash ? ' · Flächenschaden' : ''} · trifft auch Flieger`; break; }
        default: info = `Bildet aus: ${roleList(b.type) || '–'} · höhere Stufe = stärkere Krieger`;
      }
      info += ` · <b>${fmt(G._bldMaxHp(G.S.players[0], b.type, Lx))}</b> LP`;
      h = `<div class="head"><span class="ic">${F.ICONS[b.type]}</span><h3>${esc(bn(b.type))}</h3><small>${L ? 'Stufe ' + L : 'im Bau'}</small><button class="x" data-act="desel">✕</button></div><div class="info">${info}</div>`;
      if (b.up) {
        h += `<div class="info">${L ? `Ausbau auf Stufe ${b.up.to}` : 'Wird gebaut'}: noch <b data-end="${b.up.end}">${dur((b.up.end - now) / 1000)}</b></div><div class="prog"><i data-pstart="${b.up.start}" data-pend="${b.up.end}"></i></div>`;
        btns += `<button data-act="fast">Sofort fertig<small>${gold(F.speedPrice(b))}</small></button><button data-act="cancel">Abbrechen<small>Hälfte zurück</small></button>`;
      } else if (L < F.MAX_TH) {
        const why = F.upgradeCheck(st, b), c = F.cost(b.type, L + 1);
        btns += `<button data-act="upgrade" ${why ? 'disabled' : ''}>Ausbauen → St. ${L + 1}<small>${cost(c)} · ${dur(F.time(b.type, L + 1))}${why ? ' · ' + esc(why) : ''}</small><small class="nx">${esc(nextTxt(b))}</small></button>`;
      }
      if (F.RATE[b.type]) btns += `<button data-act="collect" ${b.acc >= 1 ? '' : 'disabled'}>Einsammeln<small>${fmt(b.acc || 0)}</small></button>`;
      if (F.PRODUCERS.includes(b.type) && roleList(b.type) || b.type === 'unterkunft') btns += '<button data-act="sheet" data-v="armee">Ausbilden</button>';
      if (b.type === 'schmiede') btns += '<button data-act="sheet" data-v="schmiede">Forschen</button>';
      if (b.type === 'alchemie' && L) btns += '<button data-act="sheet" data-v="alchemie">⚗️ Tränke brauen</button>';
      if (b.type === 'taverne' && L) btns += '<button data-act="sheet" data-v="armee">Söldner anheuern</button>';
      btns += '<button data-act="move">Versetzen</button>';
    }
    el.innerHTML = h + `<div class="btns">${btns}</div>`;
    el.classList.remove('hidden');
    live();
  }

  // -------------------------------------------------------------------------
  // Platzieren und Versetzen
  function freeSpotNear(type, tx0, ty0, ignore) {
    const N = F.HOME_TILES, s = F.size(type);
    for (let r = 0; r < N; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = tx0 + dx, ty = ty0 + dy;
      if (tx >= 0 && ty >= 0 && tx + s <= N && ty + s <= N && F.fits(st, type, tx, ty, ignore)) return { tx, ty };
    }
    return { tx: clamp(tx0, 0, N - s), ty: clamp(ty0, 0, N - s) };
  }
  function tileAt(type, wx, wy) {
    const P = G.S.home.P, s = F.size(type), N = F.HOME_TILES;
    return { tx: clamp(Math.round((wx - P.x) / T - s / 2), 0, N - s), ty: clamp(Math.round((wy - P.y) / T - s / 2), 0, N - s) };
  }
  function startPlace(type) {
    const why = F.buildCheck(st, type);
    if (why) { err(why); return; }
    closeSheet(); select(null);
    const c = cv(), w = R.toWorld(c.clientWidth / 2, c.clientHeight / 2), t = tileAt(type, w.x, w.y);
    U.place = { type, mode: 'neu', ...freeSpotNear(type, t.tx, t.ty) };
    renderAll();
  }
  function startMove() {
    const rec = U.sel; if (!rec) return;
    const type = U.selWall ? 'mauer' : rec.type;
    U.place = { type, mode: 'move', rec, tx: rec.tx, ty: rec.ty };
    G.UI.selected = null;
    renderAll();
  }
  function ghostTo(wx, wy) { if (!U.place) return; const t = tileAt(U.place.type, wx, wy); U.place.tx = t.tx; U.place.ty = t.ty; renderPlacebar(); }
  function placeOk() {
    const p = U.place;
    if (!p) return false;
    if (p.mode === 'neu' && F.buildCheck(st, p.type)) return false;
    return F.fits(st, p.type, p.tx, p.ty, p.rec);
  }
  function confirmPlace() {
    const p = U.place; if (!p) return;
    if (p.mode === 'neu') {
      const r = F.build(st, p.type, p.tx, p.ty);
      if (r.err) { err(r.err); return; }
      G.sfx('bau', 0, 0, 0.7, true);
      if (p.type === 'mauer') {
        // nächstes Feld in derselben Richtung vorschlagen
        const d = p.last ? { x: Math.sign(p.tx - p.last.tx), y: Math.sign(p.ty - p.last.ty) } : { x: 1, y: 0 };
        p.last = { tx: p.tx, ty: p.ty };
        const cand = [[d.x, d.y], [1, 0], [0, 1], [-1, 0], [0, -1]];
        for (const [dx, dy] of cand) if ((dx || dy) && F.fits(st, 'mauer', p.tx + dx, p.ty + dy)) { p.tx += dx; p.ty += dy; break; }
        if (F.buildCheck(st, 'mauer')) U.place = null;
        changed();
        return;
      }
      if (r.t) { U.place = null; changed(); selectTrap(r.t); toast(`${esc(bn(p.type))} gelegt – für Angreifer unsichtbar.`, 'good'); return; }
      U.place = null;
      changed();
      { const en = entOf(r.b); if (en) { en.popT = G.S.time; G.fx({ type: 'dust', x: en.x, y: en.y + en.r * 0.5, r: en.r * 1.3, dur: 0.8, seed: Math.random() }); } }
      buzz(12);
      select(entOf(r.b));
      toast(`${esc(bn(p.type))} wird gebaut (${dur(F.time(p.type, 1))}).`, 'good');
    } else {
      const why = F.move(st, p.rec, p.type, p.tx, p.ty);
      if (why) { err(why); return; }
      U.place = null;
      changed();
      if (F.TRAPS[p.type]) selectTrap(p.rec); else select(entOf(p.rec));
    }
  }
  function renderPlacebar() {
    const el = $('#placebar'), p = U.place;
    if (!p || U.mode !== 'home') { el.classList.add('hidden'); return; }
    const ok = placeOk(), wall = p.type === 'mauer';
    const txt = p.mode === 'neu' ? `<b>${esc(bn(p.type))}</b> ${wall ? 'setzen' : 'bauen'} – ${R.touch ? 'tippe' : 'klicke'} auf einen freien Platz${wall ? ', Feld für Feld' : ''}.` : `<b>${esc(wall ? 'Mauer' : bn(p.type))}</b> versetzen – wähle einen neuen Platz.`;
    const html = `<p>${txt}</p><button data-act="placeok" ${ok ? '' : 'disabled'}>✓ ${p.mode === 'neu' ? (wall ? 'Setzen' : 'Bauen') + ' · ' + cost(F.cost(p.type, 1)) : 'Hierhin'}</button><button data-act="placeno">${wall && p.mode === 'neu' ? 'Fertig' : '✕ Abbrechen'}</button>`;
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
    el.classList.remove('hidden');
  }

  // -------------------------------------------------------------------------
  // Fenster
  function openSheet(id) {
    U.sheet = id;
    if (id === 'berichte') st.unread = 0;
    select(null); U.place = null;
    renderSheet();
    $('#sheet').classList.remove('hidden');
    $('#sheet-body').scrollTop = 0;
    renderAll();
  }
  function closeSheet() { U.sheet = null; U.io = null; $('#sheet').classList.add('hidden'); renderTip(); }
  function renderSheet() {
    if (!U.sheet) return;
    const body = $('#sheet-body'), sc = body.scrollTop;
    const f = { bauen: sheetBauen, armee: sheetArmee, schmiede: sheetSchmiede, angriff: sheetAngriff, berichte: sheetBerichte, mehr: sheetMehr, erfolge: sheetErfolge, alchemie: sheetAlchemie }[U.sheet];
    body.innerHTML = f();
    body.scrollTop = sc;
    drawPreviews(body);
    live();
  }
  const descOf = (t) => F.DESC[t] || (F.TRAPS[t] ? F.TRAPS[t].desc : '');
  const head = (ic, title) => `<h2>${ic} ${title} <button class="x" data-act="close">✕</button></h2>`;
  function sheetBauen() {
    let h = head('🏗️', 'Bauen') + `<p class="note">Freie Baumeister: <b>${F.buildersFree(st)}/${F.buildersTotal(st)}</b>. Wähle ein Gebäude und dann einen freien Platz auf deinem Grundstück. Mauern brauchen keinen Baumeister.</p>`;
    for (const cat of F.CATS) {
      h += `<h3>${cat.name}</h3><div class="cards">`;
      for (const t of cat.types) {
        const max = F.limit(st, t), have = F.count(st, t), why = F.buildCheck(st, t);
        h += `<button class="bcard" data-act="place" data-v="${t}" ${why ? 'disabled' : ''} title="${esc(descOf(t))}"><span class="top"><span class="ic">${F.ICONS[t]}</span><small>${have}/${max}</small></span>`
          + `<b>${esc(bn(t))}</b><span class="cost">${cost(F.cost(t, 1))} · ${t === 'mauer' ? 'sofort' : dur(F.time(t, 1))}</span><small>${esc(descOf(t))}</small>${why ? `<span class="why">${esc(why)}</span>` : ''}</button>`;
      }
      h += '</div>';
    }
    return h;
  }
  function sheetArmee() {
    const used = F.armyUsed(st), house = F.housing(st), now = F.now(), rd = G.RACES[st.race];
    let h = head('⚔️', 'Armee') + `<p>Truppenplätze <b>${used}/${house}</b> – für mehr Plätze ${esc(bn('unterkunft'))} bauen oder ausbauen.</p><div class="prog blue"><i style="width:${Math.min(100, (100 * used) / house)}%"></i></div>`;
    if (st.queue.length) {
      const groups = [];
      st.queue.forEach((r, i) => { const g = groups[groups.length - 1]; if (g && g.r === r) g.n++; else groups.push({ r, n: 1, i }); });
      const d0 = F.trainTime(F.ub(st, st.queue[0])) * 1000;
      h += `<h3>Ausbildung</h3><div class="queue">${groups.map((g, k) => `<button class="${k ? '' : 'q0'}" data-act="untrain" data-v="${g.i}" title="Antippen: einen abbrechen (volle Erstattung)">${g.n}× ${esc(rd.units[g.r].name)} ✕</button>`).join('')}</div>`
        + `<div class="prog blue"><i data-pstart="${st.trainStart}" data-pend="${st.trainStart + d0}"></i></div>`
        + `<p>Alle fertig in <b data-end="${now + F.queueLeft(st) * 1000}"></b> <button data-act="trainfast">Sofort fertig ${gold(F.trainSpeedPrice(st))}</button></p>`;
    }
    h += '<h3>Truppen ausbilden</h3>';
    for (const role of F.roles(st)) {
      const ri = F.roleInfo(st, role), ub = F.ub(st, role), ud = rd.units[role], m = ud.mods || {}, c = F.unitCost(st, role), why = F.trainCheck(st, role);
      const lvl = ri.ok ? ri.level : 1, mul = 1 + 0.12 * (lvl - 1);
      const hp = Math.round(ub.hp * (m.hp || 1) * mul * (1 + 0.06 * st.research.ausbildung)), dmg = Math.round(ub.dmg * (m.dmg || 1) * mul * (1 + 0.08 * st.research.waffen));
      const n = st.army[role] || 0, spec = ud.spec ? ` · ${G.SPECS[ud.spec].name}` : '', fly = role === 'flieger' ? ' · fliegt' : '';
      h += `<div class="unitrow ${ri.ok ? '' : 'locked'}"><canvas data-prev="unit" data-role="${role}" data-zoom="1.6"></canvas><div class="meta"><b>${esc(ud.name)}</b> ${ri.ok ? '<span class="c-g">' + '★'.repeat(lvl) + '</span>' : ''}<br>`
        + `${G.ROLE_NAMES[role]}${fly}${spec} · ${hp} LP · ${dmg} Schaden · ${ub.supply} Plätze<br>`
        + (ri.ok ? `${cost(c)} · ${dur(F.trainTime(ub))}` : `<span class="why">${esc(ri.why)}</span>`) + `<br>Im Heer: <b>${n}</b></div><div class="act">`
        + (ri.ok ? `<button data-act="train" data-v="${role}" ${why ? 'disabled' : ''} title="${esc(why || 'Einen ausbilden')}">+1</button><button data-act="train5" data-v="${role}" ${why ? 'disabled' : ''}>+5</button>` : '')
        + (n ? `<button data-act="dismiss" data-v="${role}" title="Einen entlassen (ohne Erstattung)">−</button>` : '') + '</div></div>';
    }
    // Tränke: kurze Übersicht, gebraut wird im eigenen Fenster
    const AL = F.alchemyLevel(st);
    h += `<h3>⚗️ Tränke</h3>`;
    if (!AL) h += `<p class="note">Baue ab Haupthaus Stufe 3 einen ${esc(bn('alchemie'))} – dort braust du Tränke für deine Raubzüge.</p>`;
    else h += `<div class="potmini">${shelfHtml(true)}<button data-act="sheet" data-v="alchemie">⚗️ Tränke brauen</button></div>`;
    // Söldner
    const TL = F.tavernLevel(st);
    h += `<h3>🍺 Söldner – ${esc(bn('taverne'))}</h3>`;
    if (!TL) h += `<p class="note">Baue ab Haupthaus Stufe 2 eine ${esc(bn('taverne'))}: Söldner sind sofort einsatzbereit, kosten nur Gold und belegen Truppenplätze.</p>`;
    else for (const k in F.MERCS) {
      const m = F.MERCS[k], c = G.CREEPS[m.creep], sc = (m.scale || 1) * F.mercMul(TL, m), why = F.hireCheck(st, k), locked = TL < m.lvl, n = st.mercs[k] || 0;
      h += `<div class="unitrow ${locked ? 'locked' : ''}" style="grid-template-columns:44px 1fr auto"><span style="font-size:30px;text-align:center">${m.icon}</span><div class="meta"><b>${esc(m.name)}</b> · ${Math.round(c.hp * sc)} LP · ${Math.round(c.dmg * sc)} Schaden${c.splash ? ' · Flächenschaden' : ''}${c.range > 60 ? ' · Fernkampf' : ''} · ${m.supply} Plätze<br>${esc(m.desc)}<br>`
        + (locked ? `<span class="why">Benötigt ${esc(bn('taverne'))} Stufe ${m.lvl}</span>` : `${gold(m.gold)} · sofort`) + `<br>Angeheuert: <b>${n}</b></div><div class="act">`
        + (locked ? '' : `<button data-act="hire" data-v="${k}" ${why ? 'disabled' : ''} title="${esc(why || 'Anheuern')}">+1</button>`) + (n ? `<button data-act="dismissmerc" data-v="${k}" title="Einen entlassen (ohne Erstattung)">−</button>` : '') + '</div></div>';
    }
    const hd = F.heroDef(st), H = st.heroSt, ults = G.HERO_ULTS[hd.id] || [];
    const tal = G.TALENTS.flatMap((br) => br.talents).filter((t) => H.talents[t.id]).map((t) => t.name);
    h += `<h3>Held</h3><div class="herobox"><canvas data-prev="hero"></canvas><div><b>${esc(hd.name)}</b> <small>${esc(hd.title)}</small><br>Stufe <b>${H.level}</b>${H.level < G.HERO_MAX ? `<div class="prog"><i style="width:${100 * F.heroXpFrac(H)}%"></i></div>` : ' (Höchststufe)<br>'}`
      + (F.heroReady(st) ? '<span class="good">Bereit – kämpft bei Raubzügen und verteidigt die Festung.</span>' : `Erholt sich noch <b data-end="${H.restUntil}"></b> <button data-act="herofast">Sofort ${gold(F.speedCost(F.heroRestLeft(st)))}</button>`)
      + `<br><small>Fähigkeiten: ${hd.abilities.map((a) => esc(a.name)).join(', ')}${H.ult >= 0 && ults[H.ult] ? ', ' + esc(ults[H.ult].name) : ''} · ${esc(hd.bonusDesc)}</small>`
      + `<br><small>Talente: ${tal.length ? tal.map(esc).join(', ') : 'noch keine (eines je Stufe)'}</small></div></div>`
      + `<p class="note">Der Held sammelt in Kämpfen Erfahrung und wählt Talente und Fähigkeiten selbst. Fällt er, muss er sich erholen (${F.HERO_REST} s je Stufe).</p>`;
    return h;
  }
  function sheetSchmiede() {
    const sl = F.smithLevel(st), now = F.now();
    let h = head('⚒️', 'Schmiede');
    if (!sl) h += `<p class="warn">Baue zuerst eine ${esc(bn('schmiede'))} (ab ${esc(bn('haupthaus'))} Stufe 2).</p>`;
    else h += `<p class="note">${esc(bn('schmiede'))} Stufe ${sl}: Forschung bis Stufe ${sl}. Es läuft immer nur eine Forschung.</p>`;
    if (st.researching) {
      const r = st.researching;
      h += `<p>Forschung: <b>${G.RESEARCH[r.line].name} Stufe ${st.research[r.line] + 1}</b> – noch <b data-end="${r.end}"></b> <button data-act="resfast">Sofort ${gold(F.speedCost(F.researchLeft(st)))}</button></p><div class="prog"><i data-pstart="${r.start}" data-pend="${r.end}"></i></div>`;
    }
    for (const line of ['waffen', 'ruestung', 'ausbildung']) {
      const L = st.research[line], why = F.researchCheck(st, line);
      h += `<div class="unitrow" style="grid-template-columns:1fr auto"><div class="meta"><b>${G.RESEARCH[line].name}</b> – Stufe ${L}/5<br>${G.RESEARCH[line].desc}${L < 5 ? `<br>${cost(F.researchCost(L + 1))} · ${dur(F.researchTime(L + 1))}` : ''}${why && L < 5 ? `<br><span class="why">${esc(why)}</span>` : ''}</div>`
        + `<div class="act">${L < 5 ? `<button data-act="research" data-v="${line}" ${why ? 'disabled' : ''}>Erforschen</button>` : ''}</div></div>`;
    }
    void now;
    return h;
  }
  function sheetAngriff() {
    const n = F.armyCount(st);
    let h = head('🗺️', 'In den Kampf') + `<p>Dein Heer: <b>${n} Krieger</b> (${F.armyUsed(st)} Plätze) · Held ${F.heroReady(st) ? '<span class="good">bereit</span>' : 'erholt sich'}</p>`;
    if (!n) h += '<p class="warn">Bilde zuerst unter ⚔ Armee Truppen aus.</p>';
    h += `<h3>Plündern</h3><p>Suche eine fremde Siedlung in deiner Stärke. Erbeute Gold und Holz und gewinne Ruhm – scheiterst du, verlierst du Ruhm. Wer nicht fällt, kehrt heim.</p>`
      + `<button data-act="search" ${n || F.heroReady(st) ? '' : 'disabled'}>Gegner suchen ${gold(F.searchCost(F.th(st)))}</button>`;
    h += '<h3>Feldzug der sechs Reiche</h3><p class="note">Achtzehn Festungen in zwei Kapiteln, eine stärker als die andere. Die volle Beute gibt es beim ersten Sieg; jeder Sieg (mindestens ein Banner) öffnet die nächste.</p>';
    F.CAMPAIGN.forEach((c, i) => {
      const ch = F.CHAPTERS.find((x) => x.from === i);
      if (ch) h += `<h3>${esc(ch.name)}</h3>`;
      const b = st.camp[i] || 0, open = F.campUnlocked(st, i), L = F.raidLoot(c.th);
      h += `<div class="stage ${open ? '' : 'locked'} ${b ? 'done' : ''}"><div class="row"><b>${i + 1}. ${esc(c.name)}</b>${flags(b)}<button data-act="camp" data-v="${i}" ${open && (n || F.heroReady(st)) ? '' : 'disabled'}>${b ? 'Erneut' : 'Angreifen'}</button></div>`
        + `<p>${rname(c.race)} · Haupthaus ${c.th}${c.hero ? ` · Held St. ${c.hero}` : ''}${c.guard ? ` · Wachtrupp ${c.guard}` : ''}${c.boss ? ` · <b class="bad">Wächter: ${esc(G.CREEPS[c.boss.creep].name)}</b>` : ''}${b ? '' : ` · Beute ${cost({ g: F.round5(L.g * c.loot), w: F.round5(L.w * c.loot) })}`}</p>`
        + `<p>${open ? esc(c.story) : 'Erst die vorige Festung besiegen.'}</p></div>`;
    });
    return h;
  }
  // Trankregal: fertige Flaschen leuchten, die brodelnde zeigt einen Fortschrittsring, freie Plätze sind gestrichelt
  function shelfHtml(mini) {
    const slots = F.potionSlots(st), ready = F.potionList(st), out = [];
    ready.forEach((k) => out.push(`<button class="slot full" ${mini ? 'tabindex="-1"' : `data-act="potslot" data-v="${k}"`} title="${esc(F.POTIONS[k].name)} – bereit${mini ? '' : ' (antippen zum Verwerfen)'}">${F.POTIONS[k].icon}</button>`));
    st.brew.forEach((k, i) => {
      const run = i === 0, d = F.POTIONS[k].time * 1000;
      out.push(`<button class="slot ${run ? 'brewing' : 'waiting'} ${!mini && U.newSlot === i ? 'new' : ''}" ${mini ? 'tabindex="-1"' : `data-act="unbrew" data-v="${i}"`} title="${esc(F.POTIONS[k].name)} – ${run ? 'wird gebraut' : 'wartet'}${mini ? '' : ' (antippen: abbrechen, volle Erstattung)'}"`
        + (run ? ` data-rstart="${st.brewStart}" data-rend="${st.brewStart + d}"` : '') + `><span>${F.POTIONS[k].icon}</span></button>`);
    });
    for (let i = out.length; i < slots; i++) out.push('<span class="slot empty"></span>');
    U.newSlot = null;
    return `<div class="shelf ${mini ? 'mini' : ''}">${out.join('')}</div>`;
  }
  function sheetAlchemie() {
    const AL = F.alchemyLevel(st), now = F.now();
    let h = head('⚗️', esc(bn('alchemie')) + (AL ? ` <small>Stufe ${AL}</small>` : ''));
    if (!AL) return h + `<p class="warn">Baue ab Haupthaus Stufe 3 einen ${esc(bn('alchemie'))}.</p>`;
    const used = F.potionCount(st), slots = F.potionSlots(st);
    h += shelfHtml(false);
    h += `<p class="brewline">${used}/${slots} Plätze belegt`
      + (st.brew.length ? ` · Kessel brodelt: noch <b data-end="${now + F.brewLeft(st) * 1000}"></b> <button data-act="brewfast">Sofort fertig ${gold(F.brewSpeedPrice(st))}</button>` : used >= slots ? ' · <span class="good">Regal voll – bereit für den Kampf!</span>' : '')
      + '</p>';
    h += '<p class="note">Tippe einen Trank an, um ihn zu brauen. Eine Flasche im Regal antippen: brodelnde abbrechen (volle Erstattung), fertige verwerfen.</p><div class="potgrid">';
    for (const k in F.POTIONS) {
      const P = F.POTIONS[k], locked = AL < P.lvl, why = F.brewCheck(st, k);
      h += `<button class="potcard ${locked ? 'locked' : ''}" data-act="brew" data-v="${k}" ${why ? 'disabled' : ''} title="${esc(P.desc)}"><span class="pi">${P.icon}</span><b>${esc(P.name)}</b><small>${esc(P.short || '')}</small>`
        + (locked ? `<span class="why">ab Stufe ${P.lvl}</span>` : `<span class="cost">${cost(P.cost)} · ${dur(P.time)}</span>${why && why !== 'Alle Trankplätze belegt' ? `<span class="why">${esc(why)}</span>` : ''}`) + '</button>';
    }
    h += '</div>';
    h += `<label class="row"><input type="checkbox" data-set="brewAuto" ${st.settings.brewAuto === false ? '' : 'checked'}> Nach Raubzügen automatisch nachbrauen <small>(füllt das Regal wieder so auf, wie du es eingerichtet hast)</small></label>`;
    return h;
  }
  function sheetErfolge() {
    let h = head('🏆', 'Erfolge');
    const r = F.dailyReward(F.th(st)), D = F.dailyEnsure(st);
    h += `<h3>Tagesaufträge</h3><p class="note">Drei neue Aufträge an jedem Tag. Belohnung je Auftrag: ${cost(r)} – alle drei erledigt: zusätzlich ${cost({ g: r.g * 2, w: r.w * 2 })}.</p>`;
    F.dailyInfo(st).forEach((x, i) => {
      h += `<div class="unitrow" style="grid-template-columns:1fr auto"><div class="meta"><b>${esc(x.d.txt)}</b><br>${fmt(x.val)} / ${fmt(x.d.n)}<div class="prog"><i style="width:${(100 * x.val) / x.d.n}%"></i></div></div>`
        + `<div class="act">${x.t.claimed ? '<span class="good">✔</span>' : `<button data-act="claimdaily" data-v="${i}" ${x.done ? '' : 'disabled'}>Abholen</button>`}</div></div>`;
    });
    const all = D.tasks.every((t) => t.claimed);
    h += `<div class="btns"><button data-act="claimbonus" ${all && !D.bonus ? '' : 'disabled'}>${D.bonus ? '✔ Tagestruhe abgeholt' : '🧰 Tagestruhe öffnen'}</button></div>`;
    h += '<h3>Erfolge</h3><p class="note">Jeder Erfolg hat drei Stufen mit steigender Belohnung.</p>';
    for (const a of F.ACH) {
      const x = F.achInfo(st, a);
      h += `<div class="unitrow" style="grid-template-columns:1fr auto"><div class="meta"><b>${esc(a.name)}</b> <span class="c-g">${'★'.repeat(x.tier)}</span><span style="opacity:.35">${'★'.repeat(3 - x.tier)}</span><br>`
        + (x.done ? 'Alle Stufen geschafft!' : `${esc(a.txt)}: ${fmt(Math.min(x.val, x.goal))} / ${fmt(x.goal)} · Belohnung ${cost(x.reward)}<div class="prog"><i style="width:${Math.min(100, (100 * x.val) / x.goal)}%"></i></div>`)
        + `</div><div class="act">${x.done ? '' : `<button data-act="claimach" data-v="${a.id}" ${x.claimable ? '' : 'disabled'}>Abholen</button>`}</div></div>`;
    }
    return h;
  }
  function sheetBerichte() {
    const now = F.now(), s = st.stats;
    let h = head('📜', 'Berichte');
    h += F.th(st) < 2 ? `<p>🛡 <b>Anfängerschutz:</b> Bis ${esc(bn('haupthaus'))} Stufe 2 greift dich niemand an.</p>`
      : st.shieldUntil > now ? `<p>🛡 <b>Schild</b> noch <b data-end="${st.shieldUntil}"></b> – solange greift dich niemand an.</p>`
        : '<p>Kein Schild: Während du fort bist, können Feinde angreifen. Starke Türme und Mauern schützen deine Lager.</p>';
    h += `<div class="kv"><span>Raubzüge</span><span>${s.raids} (${s.wins} gewonnen)</span><span>Verteidigungen</span><span>${s.defenses} (${s.held} gehalten)</span>`
      + `<span>Beute gesamt</span><span>${cost({ g: s.lootG, w: s.lootW })}</span><span>Ruhm</span><span>${st.ruhm} (${F.rankOf(st.ruhm)}) · Bestwert ${st.bestRuhm}</span>`
      + `<span>Feldzug</span><span>${F.CAMPAIGN.filter((c, i) => st.camp[i] >= 1).length}/${F.CAMPAIGN.length} Festungen · ${Object.values(st.camp).reduce((a, b) => a + b, 0)} Banner</span></div>`;
    h += '<h3>Letzte Kämpfe</h3>';
    if (!st.reports.length) h += '<p class="note">Noch keine Kämpfe.</p>';
    for (const r of st.reports) {
      const def = r.kind === 'abwehr', good = def ? r.held : r.stars > 0;
      const title = def ? (r.held ? '🛡 Angriff abgewehrt' : '🔥 Überfall auf deine Festung') : r.kind === 'feldzug' ? '🗺 Feldzug' : '⚔ Raubzug';
      h += `<div class="report ${good ? 'won' : 'lost'}"><b>${title}</b> · ${ago(r.at)}<br>${esc(r.name)} · ${r.pct}&nbsp;% ${flags(r.stars)}`
        + ` · Beute ${r.loot.g || r.loot.w ? (r.loot.g < 0 || r.loot.w < 0 ? '−' + cost({ g: -r.loot.g, w: -r.loot.w }) : '+' + cost(r.loot)) : '–'}${r.ruhm ? ` · Ruhm ${signed(r.ruhm)}` : ''}${r.shield ? ` · Schild ${r.shield} h` : ''}</div>`;
    }
    return h;
  }
  function sheetMehr() {
    const s = st.settings;
    let h = head('☰', 'Mehr');
    h += `<h3>Probeangriff</h3><p>Ein KI-Heer deiner Stufe greift deine Festung an – ganz ohne Verluste. So prüfst du, ob Türme und Mauern richtig stehen.</p><div class="btns">`
      + G.RACE_KEYS.map((r) => `<button data-act="probe" data-v="${r}">${rname(r)}</button>`).join('') + '<button data-act="probe" data-v="">🎲 Zufall</button></div>';
    const tod = s.tod || 'echt';
    h += `<h3>Tageszeit</h3><p class="note">Licht und Schatten folgen der echten Uhrzeit – nachts leuchten Fenster, Feuer und Magie.</p><div class="btns">${[['echt', '🕰 Echte Uhrzeit'], ['tag', '☀️ Immer Tag'], ['nacht', '🌙 Immer Nacht']].map(([k, n]) => `<button data-act="tod" data-v="${k}" class="${tod === k ? 'sel' : ''}">${n}</button>`).join('')}</div>`;
    h += `<h3>Ton</h3><label class="row">Musik <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-set="music"></label>`
      + `<label class="row">Geräusche <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-set="sfx"></label>`
      + `<label class="row"><input type="checkbox" data-set="muted" ${s.muted ? 'checked' : ''}> Ton aus</label>`;
    h += `<h3>Spielstand</h3><p class="note">Deine Festung wird automatisch in diesem Browser gespeichert. Zum Übertragen auf ein anderes Gerät: als Datei oder Code sichern.</p>`
      + '<div class="btns"><button data-act="export">⬇ Als Datei</button><button data-act="code">📋 Code zeigen</button><button data-act="import">⬆ Code laden</button></div>';
    if (U.io === 'code') h += `<textarea class="code" readonly id="iocode">${esc(btoa(unescape(encodeURIComponent(F.exportText(st)))))}</textarea><div class="btns"><button data-act="copy">Kopieren</button></div>`;
    if (U.io === 'import') h += '<textarea class="code" id="iopaste" placeholder="Code hier einfügen"></textarea><div class="btns"><button data-act="importok">Laden (ersetzt diese Festung)</button></div>';
    h += `<h3>So wird gespielt</h3><div class="note" style="font-size:13px"><p>🏰 <b>Festung:</b> Minen und Sägewerke fördern in echter Zeit – auch wenn die Seite zu ist. Bauen und Ausbauen dauert, Baumeister arbeiten gleichzeitig. Höhere Haupthaus-Stufen schalten mehr frei.</p>`
      + '<p>⚔ <b>Raubzug:</b> Setze Truppen außerhalb des Festungsgrunds ab. Nach dem ersten Absetzen läuft die Uhr (3 Minuten). Gebäude mit Vorräten geben Beute, wenn sie fallen. Volksfähigkeiten wirken einmal je Kampf an der Stelle, die du antippst.</p>'
      + '<p>🏴 <b>Kriegsbanner:</b> Bresche (mindestens 50 % zerstört), Thron (Haupthaus gefallen) und Stille (alle Türme und Kanonen zerstört). Ein Banner reicht zum Sieg.</p>'
      + '<p>🪤 <b>Fallen:</b> Sprengfalle, Speergrube, Frostrune und Luftmine sind für Angreifer unsichtbar und nach jedem Kampf wieder scharf.</p>'
      + '<p>⚗️ <b>Tränke</b> aus dem Alchemistenturm und 🍺 <b>Söldner</b> aus der Taverne nimmst du mit in den Kampf. Wer überlebt, kehrt heim.</p>'
      + '<p>🏆 <b>Erfolge und Tagesaufträge</b> bringen Gold und Holz; 🧰 <b>Fundstücke</b> tauchen von selbst auf dem Grundstück auf – antippen!</p>'
      + '<p>🛡 <b>Überfälle:</b> Ab Haupthaus Stufe 2 greifen Feinde an, während du fort bist. Danach schützt dich ein Schild für einige Stunden. Den Bericht findest du unter 📜.</p></div>';
    h += `<h3>Reichsfeuer</h3><div class="btns"><a href="index.html"><button>⚔ Zum Echtzeit-Spiel Reichsfeuer</button></a><button data-act="reset">Neu beginnen…</button></div>`;
    return h;
  }

  // -------------------------------------------------------------------------
  // Ergebnis, Abwesenheit, Begrüßung
  function showOverlay(html) { $('#overlay-body').innerHTML = html; $('#overlay').classList.remove('hidden'); }
  function hideOverlay() { $('#overlay').classList.add('hidden'); }
  const bigFlags = (b) => `<div class="flags big">${b.map((x) => `<i class="flag ${x ? 'on' : ''}"></i>`).join('')}</div><div class="bnames">${F.BANNERS.map((x, i) => `<span class="${b[i] ? 'on' : ''}" title="${esc(x.desc)}">${x.short}</span>`).join('')}</div>`;
  const unitsTxt = (o) => Object.keys(o).filter((r) => o[r] > 0).map((r) => `${o[r]}× ${esc(G.RACES[st.race].units[r].name)}`).join(', ');
  function showResult(Rd) {
    const r = Rd.result;
    let h;
    if (r.kind === 'probe') {
      h = `<h2>${r.stars ? 'Festung gefallen' : 'Festung gehalten!'}</h2><div class="sub">Probeangriff: ${esc(r.name)}</div>${bigFlags(r.banners)}<div class="big">${r.pct}&nbsp;% zerstört</div>`
        + `<p>${r.stars ? `Der Angreifer hätte ${r.stars} Banner erobert` : 'Kein einziges Banner für den Angreifer'} und ${cost(r.loot)} erbeutet.</p><p class="note">Probeangriffe kosten nichts. Stelle Türme so, dass sie sich gegenseitig decken, und umgib Lager mit Mauern.</p>`;
    } else {
      const win = r.stars > 0, lostT = unitsTxt(r.lost);
      h = `<h2>${win ? 'Sieg!' : 'Niederlage'}</h2><div class="sub">${esc(r.name)} · ${rname(r.race)} · Haupthaus ${r.th}</div>${bigFlags(r.banners)}<div class="big">${r.pct}&nbsp;% zerstört</div><div class="list">`
        + `<div>Beute: ${r.got.g || r.got.w ? `+<span class="c-g" data-n="${r.got.g}">0</span> <span class="c-w" data-n="${r.got.w}">0</span>` : 'keine'}${r.got.g < r.loot.g || r.got.w < r.loot.w ? ' <span class="bad">(Lager voll – der Rest blieb liegen)</span>' : ''}</div>`
        + (r.kind === 'feldzug' ? `<div>Feldzug: ${r.campNew ? '<span class="good">neue Bestleistung!</span>' : 'Banner wie bisher'}${win && r.stage < F.CAMPAIGN.length - 1 && st.camp[r.stage + 1] === undefined ? ' – die nächste Festung ist offen.' : ''}</div>` : `<div>Ruhm: ${signed(r.ruhm)} → <b>${st.ruhm}</b> (${F.rankOf(st.ruhm)})</div>`)
        + `<div>Verluste: ${lostT || 'keine'}</div>`
        + (r.heroOut ? `<div>Held: Stufe ${r.hero.level}${r.heroDead ? ` – gefallen, erholt sich ${dur(F.heroRestLeft(st))}` : ''}</div>` : '')
        + (r.boss ? `<div>Wächter ${esc(r.boss)}: ${r.bossDown ? '<span class="good">besiegt – Sonderbeute!</span>' : 'überlebt'}</div>` : '')
        + (Object.keys(r.potUsed || {}).length ? `<div>Tränke: ${Object.keys(r.potUsed).map((k) => `${r.potUsed[k]}× ${F.POTIONS[k].icon} ${esc(F.POTIONS[k].name)}`).join(', ')}</div>` : '')
        + (Object.keys(r.mercDep || {}).length ? `<div>Söldner zurück: ${Object.keys(r.mercDep).map((k) => `${(r.mercAlive || {})[k] || 0}/${r.mercDep[k]} ${esc(F.MERCS[k].name)}`).join(', ')}</div>` : '')
        + '</div>' + (r.finale ? '<p class="good">Der Feldzug der sechs Reiche ist vollendet – das Reichsfeuer brennt unter deinem Banner!</p>' : '');
    }
    showOverlay(h + '<button class="big" data-act="tohome">Zur Festung</button>');
    if (r.kind === 'probe' ? !r.stars : r.stars > 0) confetti($('#overlay-body'));
    const els = [...$('#overlay-body').querySelectorAll('[data-n]')], t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3); for (const el of els) el.textContent = fmt(+el.dataset.n * e); if (k < 1) requestAnimationFrame(step); };
    if (els.length) requestAnimationFrame(step);
  }
  function showAway(reps) {
    st.unread = (st.unread || 0) + reps.length;
    let h = '<h2>Während du fort warst …</h2><div class="list">';
    for (const r of reps) {
      h += `<div><b>${r.stars ? '🔥 Überfall!' : '🛡 Abgewehrt!'}</b> ${esc(r.name)} griff an (${ago(r.at)}): ${r.pct}&nbsp;% zerstört ${flags(r.stars)}<br>`
        + `Verloren: ${r.stolen.g || r.stolen.w ? cost(r.stolen) : 'nichts'} · Ruhm ${signed(r.ruhm)}${r.shieldH ? ` · Schild für ${r.shieldH} h` : ''}${r.defHeroDead ? ' · dein Held fiel bei der Verteidigung' : ''}${r.trapsFired ? ` · ${r.trapsFired} Fallen ausgelöst` : ''}</div>`;
    }
    h += '</div><p class="note">Stelle Türme und Mauern so, dass sie Lager und Haupthaus schützen – und teste es mit einem Probeangriff (☰).</p><button class="big" data-act="closeov">Weiter</button>';
    showOverlay(h);
  }
  function showWelcome() {
    const rd = G.RACES[st.race];
    showOverlay(`<h2>${esc(st.name)}</h2><div class="sub">Eine Festung der ${esc(rd.name)} ist gegründet.</div><div class="list" style="font-size:14px">`
      + '<div>⛏ <b>Minen und Sägewerke</b> fördern ständig – auch wenn du nicht spielst. Tippe sie an, um einzusammeln.</div>'
      + '<div>🔨 <b>Bauen</b> braucht Zeit und Baumeister. Das Haupthaus bestimmt, was du bauen darfst.</div>'
      + '<div>⚔ <b>Armee:</b> Bilde Truppen aus und greife im Feldzug oder beim Plündern an. Wer überlebt, kehrt heim.</div>'
      + '<div>🛡 <b>Verteidigung:</b> Ab Haupthaus Stufe 2 greifen Feinde an, während du fort bist. Türme und Mauern halten sie auf.</div>'
      + '</div><button class="big" data-act="closeov">Los geht’s</button>');
  }

  // -------------------------------------------------------------------------
  // Startbildschirm: Volk, Held und Name wählen
  function showStart() {
    U.mode = 'start';
    showHud(false);
    $('#sel').classList.add('hidden'); $('#placebar').classList.add('hidden'); $('#tip').classList.add('hidden');
    $('#start').classList.remove('hidden');
    if (!U.pick.name) U.pick.name = F.nameFor(U.pick.race);
    renderStart();
  }
  function renderStart() {
    const r = U.pick.race, rd = G.RACES[r];
    document.body.dataset.race = r;
    if (!rd.heroes.some((x) => x.id === U.pick.hero)) U.pick.hero = rd.heroes[0].id;
    const heroes = rd.heroes.slice(0, 3);
    $('#start').innerHTML = '<div class="embers" aria-hidden="true">' + Array.from({ length: 14 }, (_, i) => `<span style="left:${(i * 7.3 + 3) % 100}%;animation-duration:${9 + (i % 5) * 1.6}s;animation-delay:${(i * 1.3) % 8}s"></span>`).join('') + '</div>'
      + `<div class="inner"><h1>Reichsfeuer: Festungen</h1>`
      + '<p class="lead">Gründe eine Festung, die weiterwächst, auch wenn du nicht spielst. Plündere fremde Siedlungen, ziehe in den Feldzug durch die sechs Reiche und halte deine Mauern gegen Überfälle.</p>'
      + `<h3>Wähle dein Volk</h3><div class="races">${G.RACE_KEYS.map((k) => `<button data-act="pickrace" data-v="${k}" class="${k === r ? 'sel' : ''}"><b>${G.RACES[k].name}</b><small>${G.RACES[k].style.tag}</small></button>`).join('')}</div>`
      + `<div class="racedesc framed"><p><b>${rd.name}:</b> ${esc(rd.desc)}</p><p><b>${esc(rd.passive.name)}:</b> ${esc(rd.passive.desc)}</p><p><b>${esc(rd.style.name)}:</b> ${esc(rd.style.desc)}</p>`
      + `<p class="note">Flieger: ${esc(rd.units.flieger.name)} · Spezialeinheit: ${esc(rd.units.elite.name)} · Volksfähigkeiten: ${rd.abilities.map((a) => esc(a.name)).join(', ')}</p></div>`
      + `<h3>Wähle deinen Helden</h3><div class="heroes">${heroes.map((x) => `<button data-act="pickhero" data-v="${x.id}" class="${x.id === U.pick.hero ? 'sel' : ''}"><canvas data-prev="hero" data-race="${r}" data-hero="${x.id}"></canvas><b>${esc(x.name)}</b><small>${esc(x.title)}</small><small>${esc(x.bonusDesc)}</small></button>`).join('')}</div>`
      + `<div class="namebox"><label for="fname">Name deiner Festung</label><input id="fname" maxlength="28" value="${esc(U.pick.name)}"><button data-act="rndname" title="Zufälliger Name">🎲</button></div>`
      + '<div class="go"><button class="big" data-act="found">Festung gründen</button></div>'
      + '<a class="back" href="index.html">← Zum Echtzeit-Spiel Reichsfeuer</a></div>';
    drawPreviews($('#start'));
  }
  function found() {
    const name = ($('#fname').value || '').trim() || F.nameFor(U.pick.race);
    st = F.st = F.newState(U.pick.race, U.pick.hero, name);
    applySound();
    F.save(st);
    $('#start').classList.add('hidden');
    enterHome();
    showWelcome();
  }

  // -------------------------------------------------------------------------
  // Aktionen
  function changed(armyToo) {
    if (U.mode === 'home' && G.S && G.S.festung === 'home') {
      F.syncHome(st, G.S, armyToo);
      const sig = layoutSig();
      if (sig !== U.groundSig) { U.groundSig = sig; R.buildGround(G.S); }
    }
    if (U.sel) G.UI.selected = entOf(U.sel);
    F.save(st);
    renderAll();
  }
  function collectRec(rec) {
    const res = rec.type === 'goldmine' ? 'Gold' : 'Holz', got = F.collect(st, rec);
    const e = entOf(rec);
    if (got > 0) {
      if (e) flyRes(res === 'Gold' ? 'g' : 'w', e.x, e.y - 20, 3 + Math.round(got / 120));
      if (e) G.S.fx.push({ type: 'text', x: e.x, y: e.y - 30, text: `+${fmt(got)} ${res}`, color: res === 'Gold' ? '#ffd23a' : '#e0a060', t: 0, dur: 1.4, big: true });
      G.sfx('kauf', 0, 0, 0.6, true);
    } else if ((rec.acc || 0) >= 1) err(`${res}-Lager ist voll – baue ${res === 'Gold' ? bn('schatzkammer') : bn('holzlager')} aus.`);
    changed();
    return got;
  }
  function openFindUI(f) {
    const d = F.FINDS[f.kind], r = F.openFind(st, f), P0 = G.S.home.P, c = F.tileCenter(P0, 'mauer', f.tx, f.ty);
    if (!r) return;
    const txt = r.potion ? `${F.POTIONS[r.potion].icon} ${F.POTIONS[r.potion].name}` : [r.g ? `+${fmt(r.g)} Gold` : '', r.w ? `+${fmt(r.w)} Holz` : ''].filter(Boolean).join('  ') || 'Lager voll!';
    G.S.fx.push({ type: 'text', x: c.x, y: c.y - 24, text: txt, color: '#ffe066', t: 0, dur: 1.8, big: true });
    G.S.fx.push({ type: 'ring', x: c.x, y: c.y, r: 26, color: '#ffd23a', t: 0, dur: 0.6 });
    if (r.g) flyRes('g', c.x, c.y, 4 + Math.round(r.g / 150)); if (r.w) flyRes('w', c.x, c.y, 4 + Math.round(r.w / 150));
    toast(`${esc(d.name)} geborgen: ${esc(txt)}`, 'gold');
    G.sfx('kauf', 0, 0, 0.7, true);
    changed();
  }
  function armed(el, txt) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1'; const old = el.innerHTML; el.innerHTML = txt;
    setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = old; } }, 3500);
    return false;
  }
  async function offerFile(filename, text) {
    let dl = null;
    try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (dl) { try { await dl.save({ filename, data: text }); return 'ok'; } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return 'declined'; } }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return 'ok';
    } catch (e) { return 'fail'; }
  }
  function act(a, v, el) {
    const sel = U.sel;
    switch (a) {
      case 'sheet': openSheet(v); return;
      case 'close': closeSheet(); return;
      case 'place': startPlace(v); return;
      case 'placeok': confirmPlace(); return;
      case 'placeno': U.place = null; renderAll(); return;
      case 'desel': select(null); return;
      case 'upgrade': { const why = F.upgrade(st, sel); if (why) err(why); else { G.sfx('bau', 0, 0, 0.7, true); toast(`${esc(bn(sel.type))}: Ausbau auf Stufe ${sel.up.to} begonnen.`, 'good'); } changed(); return; }
      case 'cancel': { F.cancel(st, sel); if (!st.blds.includes(sel)) select(null); changed(); return; }
      case 'fast': { const why = F.speedup(st, sel); if (why) err(why); else { homeTick(true); } changed(); return; }
      case 'collect': collectRec(sel); return;
      case 'collectall': {
        const sum = { g: 0, w: 0 };
        for (const b of st.blds) if (F.RATE[b.type] && (b.acc || 0) >= 1) {
          const got = F.collect(st, b), k = b.type === 'goldmine' ? 'g' : 'w', e = entOf(b);
          sum[k] += got;
          if (got && e) { flyRes(k, e.x, e.y - 20, 2 + Math.round(got / 200)); e.popT = G.S.time; }
        }
        if (sum.g || sum.w) { toast('Eingesammelt: +' + cost(sum), 'good'); G.sfx('kauf', 0, 0, 0.6, true); } else err('Die Lager sind voll.');
        changed(); return;
      }
      case 'move': startMove(); return;
      case 'wallup': { const why = F.upgradeWall(st, sel); if (why) err(why); changed(); return; }
      case 'wallall': { const n = F.upgradeWalls(st, sel.level); toast(`${n} Mauerstücke ausgebaut.`, 'good'); changed(); return; }
      case 'wallrm': F.removeWall(st, sel); select(null); changed(); return;
      case 'train': case 'train5': {
        let n = 0, why = null;
        for (let i = 0; i < (a === 'train5' ? 5 : 1); i++) { why = F.train(st, v); if (why) break; n++; }
        if (!n && why) err(why);
        changed(); return;
      }
      case 'untrain': F.untrain(st, +v); changed(); return;
      case 'trainfast': { const why = F.trainSpeedup(st); if (why) err(why); changed(true); return; }
      case 'dismiss': F.dismiss(st, v); changed(true); return;
      case 'herofast': { const why = F.heroSpeedup(st); if (why) err(why); changed(true); return; }
      case 'research': { const why = F.research(st, v); if (why) err(why); changed(); return; }
      case 'resfast': { const why = F.researchSpeedup(st); if (why) err(why); homeTick(true); changed(); return; }
      case 'search': case 'next': {
        const r = F.findTarget(st);
        if (r.err) { err(r.err); return; }
        F.save(st); startRaid(r.tgt); return;
      }
      case 'camp': startRaid(F.campaignTarget(st, +v)); return;
      case 'back': enterHome(true); return;
      case 'end': if (U.raid && !U.raid.over) F.endRaid(U.raid, 'rueckzug'); return;
      case 'speed': { const S = G.S; if (!S) return; const opts = U.mode === 'watch' ? [1, 2, 4] : [1, 2]; S.speed = opts[(opts.indexOf(S.speed) + 1) % opts.length]; renderTop(); return; }
      case 'deploy': U.deploy = { kind: 'unit', role: v }; renderBottom(); return;
      case 'ability': {
        const i = +v, why = F.abilityCheck(U.raid, i);
        if (why && why !== 'Erst Truppen absetzen') { err(why); return; }
        if (why) { err(why); return; }
        U.deploy = { kind: 'ab', i }; renderBottom();
        toast(`${esc(U.raid.atk.rd.abilities[i].name)}: ${R.touch ? 'tippe' : 'klicke'} auf die Stelle, an der sie wirken soll.`, 'gold');
        return;
      }
      case 'merc': U.deploy = { kind: 'merc', key: v }; renderBottom(); return;
      case 'pot': {
        const why = F.potionCheck(U.raid, v);
        if (why) { err(why); return; }
        U.deploy = { kind: 'pot', key: v }; renderBottom();
        toast(`${esc(F.POTIONS[v].name)}: ${R.touch ? 'tippe' : 'klicke'} auf die Stelle, an der der Trank wirken soll.`, 'gold');
        return;
      }
      case 'brew': { const why = F.brew(st, v); if (why) err(why); else { U.newSlot = st.brew.length - 1; G.sfx('blubb', 0, 0, 0.9, true); buzz(8); } changed(); return; }
      case 'potslot': if (!armed(el, '✕')) return; F.discardPotion(st, v); changed(); return;
      case 'unbrew': F.unbrew(st, +v); changed(); return;
      case 'brewfast': { const why = F.brewSpeedup(st); if (why) err(why); changed(); return; }
      case 'hire': { const why = F.hire(st, v); if (why) err(why); else G.sfx('kauf', 0, 0, 0.6, true); changed(true); return; }
      case 'dismissmerc': F.dismissMerc(st, v); changed(true); return;
      case 'trapup': { const why = F.upgradeTrap(st, sel); if (why) err(why); changed(); return; }
      case 'traprm': F.removeTrap(st, sel); U.sel = null; U.selTrap = false; changed(); return;
      case 'claimach': { const g = F.claimAch(st, v); if (g) { toast(`Erfolg abgeholt: +${cost(g)}`, 'gold'); G.sfx('level', 0, 0, 0.7, true); } changed(); return; }
      case 'claimdaily': { const g = F.claimDaily(st, +v); if (g) { toast(`Auftrag erfüllt: +${cost(g)}`, 'gold'); G.sfx('kauf', 0, 0, 0.7, true); } changed(); return; }
      case 'claimbonus': { const g = F.claimDailyBonus(st); if (g) { toast(`Tagestruhe: +${cost(g)}`, 'gold'); G.sfx('level', 0, 0, 0.7, true); } changed(); return; }
      case 'tod': st.settings.tod = v; updateLight(); F.save(st); renderSheet(); return;
      case 'tohome': hideOverlay(); enterHome(true); return;
      case 'closeov': hideOverlay(); renderAll(); return;
      case 'probe': startProbe(v); return;
      case 'export': offerFile(`festung-${st.name.replace(/[^\wäöüÄÖÜß-]+/g, '_')}.json`, F.exportText(st)).then((r) => toast(r === 'ok' ? 'Spielstand als Datei gesichert.' : r === 'declined' ? 'Abgebrochen.' : 'Das ging nicht – nutze „Code zeigen“.', r === 'ok' ? 'good' : 'bad')); return;
      case 'code': U.io = U.io === 'code' ? null : 'code'; renderSheet(); return;
      case 'import': U.io = U.io === 'import' ? null : 'import'; renderSheet(); return;
      case 'copy': { const t = $('#iocode'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Code kopiert.', 'good'), () => { try { document.execCommand('copy'); toast('Code kopiert.', 'good'); } catch (e) { err('Bitte selbst markieren und kopieren.'); } }); return; }
      case 'importok': {
        if (!armed(el, 'Wirklich ersetzen? Erneut tippen')) return;
        try {
          let txt = ($('#iopaste').value || '').trim();
          if (txt[0] !== '{') txt = decodeURIComponent(escape(atob(txt)));
          st = F.st = F.importText(txt);
          F.save(st); closeSheet(); applySound(); enterHome(); toast('Festung geladen.', 'good');
        } catch (e) { err('Der Code ist ungültig.'); }
        return;
      }
      case 'reset': if (!armed(el, 'Alles löschen? Erneut tippen')) return; F.wipe(); st = null; closeSheet(); hideOverlay(); G.S = null; U.pick.name = ''; showStart(); return;
      case 'pickrace': U.pick.race = v; U.pick.name = F.nameFor(v); U.pick.hero = null; renderStart(); return;
      case 'pickhero': U.pick.name = $('#fname').value; U.pick.hero = v; renderStart(); return;
      case 'rndname': U.pick.name = F.nameFor(U.pick.race); $('#fname').value = U.pick.name; return;
      case 'found': found(); return;
      case 'tip': {
        const t = $('#tip').dataset.a;
        if (t === 'collectall') act('collectall');
        else if (t === 'th') { const e = entOf(F.thB(st)); select(e); }
        else if (t === 'none') { /* nur Hinweis */ }
        else openSheet(t);
        return;
      }
    }
  }
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    ensureAudio();
    if (el.tagName === 'BUTTON') G.sfx('klick', 0, 0, 0.7, true);
    act(el.dataset.act, el.dataset.v, el);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target, k = el.dataset && el.dataset.set;
    if (!k || !st) return;
    st.settings[k] = el.type === 'checkbox' ? el.checked : +el.value;
    applySound(); F.save(st);
  });
  $('#sheet').addEventListener('click', (ev) => { if (ev.target.id === 'sheet') closeSheet(); });
  $('#tip').addEventListener('click', () => act('tip'));

  // -------------------------------------------------------------------------
  // Steuerung auf der Karte: ziehen = verschieben, zwei Finger/Mausrad = Zoom, tippen = wählen/bauen/absetzen
  const ptrs = new Map();
  let drag = null, pinch = null, hold = null;
  function mouseTo(ev) {
    const r = cv().getBoundingClientRect();
    R.mouse.x = ev.clientX - r.left; R.mouse.y = ev.clientY - r.top;
    const w = R.toWorld(R.mouse.x, R.mouse.y); R.mouse.wx = w.x; R.mouse.wy = w.y; R.mouse.inside = true;
  }
  function zoomAt(f, mx, my) {
    const w = R.toWorld(mx, my);
    R.cam.z = clamp(R.cam.z * f, minZoom(), 2);
    R.cam.x = w.x - mx / R.cam.z; R.cam.y = w.y - my / R.cam.z; clampView();
  }
  function clampView() {
    R.clampCam();
    const S = G.S; if (!S) return;
    const vw = R.viewW(), vh = R.viewH();
    R.cam.x = vw >= S.w ? (S.w - vw) / 2 : clamp(R.cam.x, 0, S.w - vw);
    R.cam.y = vh >= S.h ? (S.h - vh) / 2 : clamp(R.cam.y, 0, S.h - vh);
  }
  // nie so weit herauszoomen, dass neben der Karte Schwarz zu sehen ist
  function minZoom() { const S = G.S, c = cv(); return S ? Math.max(0.3, c.clientWidth / S.w, c.clientHeight / S.h) : 0.3; }
  function zoomSmooth(f, mx, my) { const base = U.zoomGoal ? U.zoomGoal.z : R.cam.z; U.zoomGoal = { z: clamp(base * f, minZoom(), 2), mx, my }; }
  function camMotion(dt) {
    if (U.zoomGoal) {
      const g = U.zoomGoal, nz = R.cam.z + (g.z - R.cam.z) * (1 - Math.exp(-dt * 14));
      zoomAt(nz / R.cam.z, g.mx, g.my);
      if (Math.abs(g.z - R.cam.z) < 0.002) U.zoomGoal = null;
    }
    if (U.camV && !drag) {
      R.cam.x += U.camV.x * dt; R.cam.y += U.camV.y * dt;
      const f = Math.exp(-dt * 4.5); U.camV.x *= f; U.camV.y *= f;
      clampView();
      if (Math.hypot(U.camV.x, U.camV.y) < 12) U.camV = null;
    }
  }
  // Leben in der Festung: Krieger und Held schlendern um ihren Platz
  function wander(dt) {
    for (const e of G.S.ents) {
      if (e.dead || !e.home || (e.kind !== 'unit' && e.kind !== 'hero')) continue;
      if (e.wWait > 0) { e.wWait -= dt; e.moving = false; continue; }
      if (!e.wTo) { const a = Math.random() * 6.28, r = 10 + Math.random() * (e.kind === 'hero' ? 70 : 42); e.wTo = { x: e.home.x + Math.cos(a) * r, y: e.home.y + Math.sin(a) * r * 0.6 }; }
      const dx = e.wTo.x - e.x, dy = e.wTo.y - e.y, d = Math.hypot(dx, dy);
      if (d < 2) { e.wTo = null; e.wWait = 1.5 + Math.random() * 4; e.moving = false; continue; }
      const v = Math.min(d, (e.kind === 'hero' ? 30 : 22) * dt);
      e.x += (dx / d) * v; e.y += (dy / d) * v; e.moving = true; e.walkT = (e.walkT || 0) + dt * 9; e.face = Math.atan2(dy, dx);
    }
  }
  function cancelHold() { if (hold && hold.timer) clearTimeout(hold.timer); hold = null; }
  function bindInput() {
    const c = cv();
    c.addEventListener('contextmenu', (ev) => ev.preventDefault());
    c.addEventListener('pointerdown', (ev) => {
      ensureAudio(); mouseTo(ev);
      try { c.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ }
      ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: R.cam.z }; drag = null; cancelHold();
        return;
      }
      drag = { sx: ev.clientX, sy: ev.clientY, cx: R.cam.x, cy: R.cam.y, moved: false, type: ev.pointerType, vx: 0, vy: 0, lt: performance.now() };
      U.camV = null; U.zoomGoal = null;
      if (U.mode === 'raid' && U.deploy && ((U.deploy.kind === 'unit' && U.deploy.role !== 'held') || U.deploy.kind === 'merc')) {
        hold = { active: false, t: 0, timer: setTimeout(() => { if (hold && drag && !drag.moved) { hold.active = true; hold.t = 0; } }, 320) };
      }
    });
    c.addEventListener('pointermove', (ev) => {
      mouseTo(ev);
      if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()], r = c.getBoundingClientRect();
        zoomAt((pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)) / R.cam.z, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        return;
      }
      if (drag && !(hold && hold.active)) {
        const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) > 9) { drag.moved = true; cancelHold(); }
        if (drag.moved) {
          const ox = R.cam.x, oy = R.cam.y, now = performance.now(), dtm = Math.max(8, now - drag.lt);
          R.cam.x = drag.cx - dx / R.cam.z; R.cam.y = drag.cy - dy / R.cam.z; clampView();
          drag.vx = drag.vx * 0.4 + (((R.cam.x - ox) / dtm) * 1000) * 0.6; drag.vy = drag.vy * 0.4 + (((R.cam.y - oy) / dtm) * 1000) * 0.6; drag.lt = now;
        }
      }
      if (!drag && U.place && ev.pointerType === 'mouse') ghostTo(R.mouse.wx, R.mouse.wy);
    });
    const up = (ev) => {
      ptrs.delete(ev.pointerId);
      if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; cancelHold(); return; }
      const wasHold = hold && hold.active;
      cancelHold();
      if (drag && !drag.moved && !wasHold && ev.type === 'pointerup') tap(R.mouse.wx, R.mouse.wy, drag.type);
      if (drag && drag.moved && performance.now() - drag.lt < 90 && Math.hypot(drag.vx, drag.vy) > 60) U.camV = { x: drag.vx, y: drag.vy };
      drag = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { R.mouse.inside = false; });
    c.addEventListener('wheel', (ev) => { ev.preventDefault(); mouseTo(ev); zoomSmooth(ev.deltaY < 0 ? 1.18 : 1 / 1.18, R.mouse.x, R.mouse.y); }, { passive: false });
    window.addEventListener('keydown', (ev) => {
      if (/INPUT|TEXTAREA/.test(ev.target.tagName)) return;
      keys.add(ev.key.toLowerCase());
      if (ev.key === 'Escape') { if (U.place) U.place = null; else if (U.sheet) closeSheet(); else if (U.deploy && U.deploy.kind === 'ab') U.deploy = nextTroop(); else select(null); renderAll(); }
      if (ev.key === '+' || ev.key === '=') zoomAt(1.2, cv().clientWidth / 2, cv().clientHeight / 2);
      if (ev.key === '-') zoomAt(1 / 1.2, cv().clientWidth / 2, cv().clientHeight / 2);
    });
    window.addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());
  }
  const keys = new Set();
  function keysCam(dt) {
    if (!keys.size) return;
    const sp = (700 * dt) / R.cam.z;
    if (keys.has('a') || keys.has('arrowleft')) R.cam.x -= sp;
    if (keys.has('d') || keys.has('arrowright')) R.cam.x += sp;
    if (keys.has('w') || keys.has('arrowup')) R.cam.y -= sp;
    if (keys.has('s') || keys.has('arrowdown')) R.cam.y += sp;
    clampView();
  }
  function pickAt(wx, wy) {
    let best = null;
    for (const e of G.S.ents) {
      if (e.dead || e.kind !== 'building' || !e.rec) continue;
      const hs = (e.size * T) / 2 + (e.type === 'mauer' ? 0 : 4);
      if (Math.abs(wx - e.x) <= hs && Math.abs(wy - e.y) <= hs + (e.type === 'mauer' ? 0 : 10) && (!best || best.type === 'mauer')) best = e;
    }
    return best;
  }
  function tap(wx, wy, type) {
    if (U.mode === 'home') {
      if (U.place) { ghostTo(wx, wy); if (type === 'mouse') confirmPlace(); return; }
      const P0 = G.S.home.P, ttx = Math.floor((wx - P0.x) / T), tty = Math.floor((wy - P0.y) / T);
      const fnd = st.finds.find((f) => f.tx === ttx && f.ty === tty);
      if (fnd) { openFindUI(fnd); return; }
      const trp = st.traps.find((t) => t.tx === ttx && t.ty === tty);
      if (trp) { selectTrap(trp); return; }
      const e = pickAt(wx, wy);
      if (e && F.RATE[e.rec.type] && (e.rec.acc || 0) >= 1 && U.sel !== e.rec) collectRec(e.rec);
      if (!e) { const h = G.S.players[0].hero; if (h && !h.dead && G.S.ents.includes(h) && Math.hypot(h.x - wx, h.y - wy) < 28) { openSheet('armee'); return; } G.S.fx.push({ type: 'ring', x: wx, y: wy, r: 14, color: '#ffffff', t: 0, dur: 0.35 }); }
      select(e);
    } else if (U.mode === 'raid') deployAt(wx, wy, false);
  }
  function deployAt(wx, wy, quiet) {
    const Rd = U.raid;
    if (!Rd || Rd.over || !U.deploy) return;
    if (U.deploy.kind === 'ab') {
      const why = F.castAt(Rd, U.deploy.i, wx, wy);
      if (why) err(why); else U.deploy = nextTroop();
      renderBottom();
      return;
    }
    if (U.deploy.kind === 'pot') {
      const why = F.castPotion(Rd, U.deploy.key, wx, wy);
      if (why) err(why); else U.deploy = nextTroop();
      renderBottom(); renderTop();
      return;
    }
    if (U.deploy.kind === 'merc') {
      const k = U.deploy.key, why = F.deployMerc(Rd, k, wx, wy);
      if (why) { if (!quiet || why !== lastErrTxt) err(why); return; }
      if (!(Rd.mercs[k] > 0)) { U.deploy = nextTroop(); cancelHold(); }
      renderBottom(); renderTop();
      return;
    }
    const role = U.deploy.role, why = F.deploy(Rd, role, wx, wy);
    if (why) { if (!quiet || why !== lastErrTxt) err(why); return; }
    buzz(8);
    if (role === 'held' || !(Rd.troops[role] > 0)) { U.deploy = nextTroop(); cancelHold(); }
    renderBottom(); renderTop();
  }

  // -------------------------------------------------------------------------
  // Zusätzliche Kartenebene: Vorrat über Minen, Restzeit über Baustellen, Bauvorschau, Bannkreis beim Raubzug
  // Fallen: Pulverfass, Speergrube, Frostrune, Ballonmine (mit Stufenpunkten)
  function drawTrap(ctx, k, type, x, y, L, S, sel, live) {
    ctx.save();
    if (sel) { ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(x - 19, y - 19, 38, 38); ctx.setLineDash([]); }
    const t = S.time, ink = k.INK;
    switch (type) {
      case 'sprengfalle':
        ctx.fillStyle = 'rgba(70,50,30,0.7)'; ctx.beginPath(); ctx.ellipse(x, y + 5, 14, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.arc(x, y - 1, 9, 0, 7); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(x - 3, y - 4, 3, 0, 7); ctx.fill();
        ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 5, y - 8); ctx.quadraticCurveTo(x + 9, y - 15, x + 13, y - 12); ctx.stroke();
        if (live || Math.sin(t * 7 + x) > 0.3) { ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(x + 13, y - 12, 2.2, 0, 7); ctx.fill(); }
        break;
      case 'speergrube':
        ctx.fillStyle = '#2a1e16'; ctx.fillRect(x - 13, y - 9, 26, 18); ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 13, y - 9, 26, 18);
        ctx.fillStyle = '#e8e0d0'; for (let i = 0; i < 5; i++) { const sx = x - 10 + i * 5; ctx.beginPath(); ctx.moveTo(sx - 2, y + 7); ctx.lineTo(sx, y - 6 - (i % 2) * 3); ctx.lineTo(sx + 2, y + 7); ctx.fill(); }
        break;
      case 'frostrune':
        ctx.save(); ctx.globalAlpha *= 0.55 + 0.3 * Math.sin(t * 2 + x); ctx.shadowColor = '#9ad8ff'; ctx.shadowBlur = 10; ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.stroke();
        for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); ctx.lineTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9); ctx.stroke(); }
        ctx.restore();
        break;
      case 'luftmine': {
        const by = y - 16 + Math.sin(t * 2 + x) * 2;
        ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, by + 7); ctx.stroke();
        ctx.fillStyle = '#5a5e66'; ctx.fillRect(x - 3, y + 3, 6, 4);
        ctx.fillStyle = '#c83a2a'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 7 : 10; ctx.lineTo(x + Math.cos(a) * r, by + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      }
    }
    ctx.fillStyle = '#ffd23a'; for (let i = 0; i < L; i++) { ctx.beginPath(); ctx.arc(x - (L - 1) * 3 + i * 6, y + 15, 1.8, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  // Fundstücke: Truhe, Erzbrocken, umgestürzter Baum, magischer Kristall – mit hüpfendem Hinweis
  function drawFind(ctx, k, kind, x, y, S) {
    ctx.save();
    const t = S.time, ink = k.INK;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 9, 15, 5, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = ink;
    if (kind === 'truhe') {
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 12, y - 4, 24, 13); ctx.strokeRect(x - 12, y - 4, 24, 13);
      ctx.beginPath(); ctx.moveTo(x - 12, y - 4); ctx.quadraticCurveTo(x, y - 14, x + 12, y - 4); ctx.closePath(); ctx.fillStyle = '#a8743a'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(x - 2, y - 6, 4, 7); ctx.strokeRect(x - 2, y - 6, 4, 7);
    } else if (kind === 'erz') {
      ctx.fillStyle = '#7a7470'; ctx.beginPath(); ctx.moveTo(x - 14, y + 8); ctx.lineTo(x - 9, y - 6); ctx.lineTo(x + 2, y - 11); ctx.lineTo(x + 12, y - 3); ctx.lineTo(x + 14, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd23a'; for (const [dx, dy] of [[-5, -2], [3, -5], [6, 3], [-1, 4]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.8, 0, 7); ctx.fill(); }
    } else if (kind === 'baum') {
      ctx.fillStyle = '#8a5a30'; ctx.save(); ctx.translate(x, y + 2); ctx.rotate(-0.25); ctx.fillRect(-15, -4, 30, 8); ctx.strokeRect(-15, -4, 30, 8); ctx.restore();
      ctx.fillStyle = '#4f7d33'; for (const [dx, dy, r] of [[10, -8, 7], [15, -2, 6], [6, -12, 5]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill(); ctx.stroke(); }
    } else {
      ctx.save(); ctx.shadowColor = '#c070ff'; ctx.shadowBlur = 12; ctx.fillStyle = '#b070f0';
      ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 7, y - 3); ctx.lineTo(x + 3, y + 8); ctx.lineTo(x - 4, y + 8); ctx.lineTo(x - 7, y - 3); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.stroke();
    }
    const by = y - 26 + Math.abs(Math.sin(t * 3 + x)) * -5;
    k.label('!', x, by, '#ffe066', 14);
    ctx.restore();
  }
  R.overlay = function (ctx, S, k) {
    if (S.festung === 'home' && !R.touch && R.mouse.inside && !U.place && st && !drag) {
      const he = pickAt(R.mouse.wx, R.mouse.wy);
      if (he && he !== G.UI.selected && he.rec) k.label(he.type === 'mauer' ? G.WALLS[he.level - 1].name : `${bn(he.type)} · St. ${he.level}`, he.x, he.y - (he.type === 'mauer' ? 22 : he.r + 30), '#fff4d8', 12);
    }
    if (S.festung === 'home' && R.light && R.light.dark > 0.25 && S.home) {
      const P = S.home.P, a0 = Math.min(1, (R.light.dark - 0.25) * 3);
      ctx.save(); ctx.fillStyle = '#eaff8a'; ctx.shadowColor = '#d8ff6a'; ctx.shadowBlur = 8;
      for (let i = 0; i < 28; i++) {
        const t = S.time * (0.1 + (i % 5) * 0.025) + i * 1.7;
        const fx2 = P.x - 90 + (Math.sin(t * 1.3 + i) * 0.5 + 0.5) * (P.w + 180), fy2 = P.y - 90 + (Math.cos(t * 0.9 + i * 2.1) * 0.5 + 0.5) * (P.h + 180);
        ctx.globalAlpha = a0 * (0.3 + 0.7 * Math.max(0, Math.sin(S.time * 2.3 + i * 1.9)));
        ctx.beginPath(); ctx.arc(fx2, fy2, 1.9, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    if (S.festung === 'raid' && U.raid && !U.raid.over && !R.touch && R.mouse.inside && U.deploy && (U.deploy.kind === 'unit' || U.deploy.kind === 'merc')) {
      const ok = F.canDeploy(U.raid, R.mouse.wx, R.mouse.wy);
      ctx.save(); ctx.strokeStyle = ok ? 'rgba(150,255,150,0.95)' : 'rgba(255,90,70,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(R.mouse.wx, R.mouse.wy + 6, 15, 6.5, 0, 0, 7); ctx.stroke();
      if (!ok) { ctx.beginPath(); ctx.moveTo(R.mouse.wx - 6, R.mouse.wy); ctx.lineTo(R.mouse.wx + 6, R.mouse.wy + 12); ctx.moveTo(R.mouse.wx + 6, R.mouse.wy); ctx.lineTo(R.mouse.wx - 6, R.mouse.wy + 12); ctx.stroke(); }
      ctx.restore();
    }
    if (S.traps && S.festung !== 'home') for (const tr of S.traps) if (!tr.done && tr.visible) drawTrap(ctx, k, tr.type, tr.x, tr.y, tr.level, S, false, tr.fuse > 0);
    if (S.festung === 'home' && st) {
      const now = F.now();
      for (const e of S.ents) {
        if (e.kind !== 'building' || !e.rec || e.type === 'mauer') continue;
        const b = e.rec;
        if (F.RATE[b.type] && b.level > 0) {
          const acc = Math.floor(b.acc || 0), cap = F.mineBuffer(st, b);
          if (acc >= Math.max(10, cap * 0.03)) {
            const y = e.y - e.r - 26 + Math.sin(S.time * 3 + e.id) * 2.5, full = acc >= cap - 1;
            ctx.save(); k.roundRect(e.x - 26, y - 11, 52, 22, 11);
            ctx.fillStyle = full ? 'rgba(120,30,20,0.9)' : 'rgba(25,18,12,0.88)'; ctx.fill(); ctx.strokeStyle = b.type === 'goldmine' ? '#f0c24a' : '#c89058'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
            k.label((b.type === 'goldmine' ? '● ' : '▮ ') + fmt(acc), e.x, y + 4, b.type === 'goldmine' ? '#ffd86a' : '#e8b080', 11);
          }
        }
        if (b.up) k.label('⏳ ' + clock((b.up.end - now) / 1000), e.x, e.y + e.r + 26, '#ffe9a8', 11);
      }
      for (const t of st.traps) { const c = F.tileCenter(S.home.P, 'mauer', t.tx, t.ty); drawTrap(ctx, k, t.type, c.x, c.y, t.level, S, U.sel === t, false); }
      for (const f of st.finds) { const c = F.tileCenter(S.home.P, 'mauer', f.tx, f.ty); drawFind(ctx, k, f.kind, c.x, c.y, S); }
      if (U.place) {
        const p = U.place, s = F.size(p.type), P = S.home.P, ok = placeOk();
        const x0 = P.x + p.tx * T, y0 = P.y + p.ty * T;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeRect(P.x, P.y, P.w, P.h); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 1; i < F.HOME_TILES; i++) { ctx.moveTo(P.x + i * T, P.y); ctx.lineTo(P.x + i * T, P.y + P.h); ctx.moveTo(P.x, P.y + i * T); ctx.lineTo(P.x + P.w, P.y + i * T); }
        ctx.stroke();
        ctx.fillStyle = ok ? 'rgba(80,255,80,0.32)' : 'rgba(255,60,60,0.35)'; ctx.fillRect(x0, y0, s * T, s * T);
        ctx.strokeStyle = ok ? '#7f7' : '#f66'; ctx.lineWidth = 2.5; ctx.strokeRect(x0, y0, s * T, s * T);
        const atk = (G.BUILDINGS[p.type] && G.BUILDINGS[p.type].attack) || (F.TRAPS[p.type] && { range: F.TRAPS[p.type].radius });
        if (atk) { ctx.strokeStyle = 'rgba(255,220,120,0.6)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x0 + (s * T) / 2, y0 + (s * T) / 2, atk.range, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
        if (p.type === 'mauer') { ctx.fillStyle = '#9a8a70'; ctx.fillRect(x0 + 4, y0 + 12, T - 8, T - 22); ctx.strokeStyle = k.INK; ctx.lineWidth = 2; ctx.strokeRect(x0 + 4, y0 + 12, T - 8, T - 22); }
        else if (F.TRAPS[p.type]) drawTrap(ctx, k, p.type, x0 + T / 2, y0 + T / 2, 1, S, false, true);
        else R.buildingIcon(p.type, x0 + (s * T) / 2, y0 + (s * T) / 2, 1.6, '#fff');
      }
    } else if (S.festung === 'raid' && U.raid) {
      const P = S.plot, Rd = U.raid, m = 6;
      const active = U.deploy && U.deploy.kind === 'unit' && !Rd.over;
      ctx.save();
      ctx.fillStyle = active ? 'rgba(255,50,30,0.13)' : 'rgba(255,50,30,0.05)';
      ctx.fillRect(P.x - m, P.y - m, P.w + 2 * m, P.h + 2 * m);
      ctx.strokeStyle = active ? 'rgba(255,90,60,0.75)' : 'rgba(255,90,60,0.35)'; ctx.setLineDash([12, 8]); ctx.lineWidth = 2.5;
      ctx.strokeRect(P.x - m, P.y - m, P.w + 2 * m, P.h + 2 * m); ctx.setLineDash([]);
      if (U.deploy && (U.deploy.kind === 'ab' || U.deploy.kind === 'pot') && R.mouse.inside) {
        const ab = U.deploy.kind === 'pot' ? { ...F.POTIONS[U.deploy.key], shells: 1 } : Rd.atk.rd.abilities[U.deploy.i], r = ab.radius || 120;
        ctx.fillStyle = 'rgba(255,170,60,0.2)'; ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(R.mouse.wx, R.mouse.wy, ab.type === 'strike' && ab.shells > 1 ? r + 85 : r, 0, 7); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  };

  // -------------------------------------------------------------------------
  // Spielschleife
  function live() {
    const now = F.now();
    for (const el of document.querySelectorAll('[data-end]')) el.textContent = dur((+el.dataset.end - now) / 1000);
    for (const el of document.querySelectorAll('[data-rend]')) { const a = +el.dataset.rstart, b = +el.dataset.rend; el.style.setProperty('--p', clamp((100 * (now - a)) / Math.max(1, b - a), 0, 100).toFixed(1)); }
    for (const el of document.querySelectorAll('[data-pend]')) { const a = +el.dataset.pstart, b = +el.dataset.pend; el.style.width = clamp((100 * (now - a)) / Math.max(1, b - a), 0, 100) + '%'; }
  }
  function renderAll() {
    if (!st || U.mode === 'start') return;
    renderTop(); renderBottom(); renderSel(); renderPlacebar(); renderTip();
    if (U.sheet) renderSheet();
  }
  // Echtzeit: Bauarbeiten, Förderung, Ausbildung, Forschung
  function homeTick(force) {
    const ev = F.tick(st);
    let army = false;
    for (const e of ev) {
      if (e.kind === 'bau') { const en = entOf(e.b); if (en && G.S.festung === 'home') en.popT = G.S.time + 0.15; if (en && G.S.festung === 'home') G.S.fx.push({ type: 'levelup', x: en.x, y: en.y, r: en.r, t: 0, dur: 1.8, seed: Math.random() }); toast(`${esc(bn(e.b.type))} ${e.isNew ? 'fertiggestellt' : 'auf Stufe ' + e.b.level + ' ausgebaut'}.`, 'good'); G.sfx('fertig', 0, 0, 0.7, true); }
      if (e.kind === 'truppen') { army = true; if (!U.sheet) toast(`${e.n} ${e.n === 1 ? 'Krieger ist' : 'Krieger sind'} ausgebildet.`, 'good'); }
      if (e.kind === 'nachbrauen' && U.mode === 'home') toast(`⚗️ ${e.n} ${e.n === 1 ? 'Trank wird' : 'Tränke werden'} nachgebraut.`, 'good');
      if (e.kind === 'traenke') toast(`${e.n} ${e.n === 1 ? 'Trank ist' : 'Tränke sind'} fertig gebraut.`, 'good');
      if (e.kind === 'fund') toast('Ein Fundstück ist auf deinem Grundstück aufgetaucht – tippe es an!', 'gold');
      if (e.kind === 'forschung') toast(`Forschung abgeschlossen: ${G.RESEARCH[e.line].name} Stufe ${st.research[e.line]}.`, 'gold');
    }
    if (U.mode !== 'home') { if (ev.length) F.save(st); return; }
    if (ev.length || force) { changed(army); return; }
    // Fortschritt der Baustellen nachziehen
    const now = F.now();
    for (const e of G.S.ents) if (e.rec && e.rec.up && e.upgrading) e.upgrading.t = Math.max(0, (now - e.rec.up.start) / 1000);
    if (heroWasReady !== F.heroReady(st)) { heroWasReady = F.heroReady(st); F.placeArmy(st, G.S); }
  }
  let heroWasReady = null;
  function raidTick() {
    const Rd = U.raid; if (!Rd) return;
    if (Rd.started && !Rd.called) { Rd.called = true; if (U.mode === 'watch') bigCall('Angriff auf deine Festung!', 'bad'); else bigCall('Zum Angriff!'); G.sfx('horn', 0, 0, 0.8, true); }
    Rd.bShown = Rd.bShown || [false, false, false];
    F.bannersOf(Rd).forEach((on, i) => { if (on && !Rd.bShown[i] && !Rd.over) { Rd.bShown[i] = true; bannerPop((U.mode === 'watch' ? 'Der Feind erobert: ' : '') + F.BANNERS[i].name, U.mode === 'watch'); } });
    for (const m of Rd.S.msgs) if (!m.shown) { m.shown = true; if (U.mode === 'watch' || m.cls === 'gold') toast(esc(m.text), m.cls); }
    if (Rd.over && !U.resultShown) {
      U.resultShown = true;
      const rk0 = F.rankOf(st.ruhm);
      if (Rd.kind !== 'probe') F.applyResult(st, Rd.result);
      const rk1 = F.rankOf(st.ruhm);
      if (rk1 !== rk0 && Rd.result.ruhm > 0) setTimeout(() => bigCall(`Neuer Rang: ${rk1}!`), 2300);
      F.save(st);
      U.deploy = null; cancelHold();
      setTimeout(() => { if (U.raid === Rd) showResult(Rd); }, 1100);
    }
  }
  let last = performance.now(), hudT = 0, tickT = 0, saveT = 10, lightT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    try {
      if (G.S && R.ready() && U.mode !== 'start') {
        if (U.mode === 'home') { G.sceneIdle(dt); wander(dt); }
        else {
          G.update(dt);
          raidTick();
          if (hold && hold.active && U.deploy) { hold.t -= dt; if (hold.t <= 0) { hold.t = 0.14; deployAt(R.mouse.wx, R.mouse.wy, true); } }
        }
        keysCam(dt); camMotion(dt);
        R.draw();
      }
      if (st && U.mode !== 'start') {
        lightT -= dt; if (lightT <= 0) { lightT = 2; updateLight(); }
        tickT -= dt; if (tickT <= 0) { tickT = 0.5; homeTick(false); }
        hudT -= dt; if (hudT <= 0) { hudT = 0.25; renderTop(); renderBottom(); renderTip(); live(); }
        saveT -= dt; if (saveT <= 0) { saveT = 10; F.save(st); }
      }
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  // -------------------------------------------------------------------------
  // Start
  function boot() {
    R.init(cv());
    bindInput();
    st = F.st = F.load();
    if (st) {
      applySound();
      let reps = [];
      try { reps = F.awayCheck(st); } catch (e) { console.error(e); }
      F.save(st);
      enterHome();
      if (reps.length) showAway(reps);
    } else showStart();
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (!st) return;
    if (document.hidden) { F.save(st); return; }
    if (U.mode === 'home') {
      let reps = [];
      try { reps = F.awayCheck(st); } catch (e) { console.error(e); }
      if (reps.length) { F.save(st); U.homeCam = { ...R.cam }; enterHome(true); showAway(reps); }
    }
  });
  window.addEventListener('pagehide', () => { if (st) F.save(st); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
