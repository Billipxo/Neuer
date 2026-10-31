'use strict';
// Spiel-Engine: Zustand, Wirtschaft, Basisbau, Produktion, Kampf, Helden, KI, Atmosphäre.
(function () {
  const T = G.TILE;
  let S = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  G.dist = dist; G.clamp = clamp;
  G.settings = G.settings || { blood: true };
  G.sfx = G.sfx || function () {};

  // -------------------------------------------------------------------------
  // Kartenlayouts je Modus (Anteile von Breite/Höhe)
  G.LAYOUTS = {
    '1v1': {
      name: '1 gegen 1', w: 3400, h: 2200, teams: [0, 1],
      bases: [[0.15, 0.5], [0.85, 0.5]], shops: [[0.5, 0.5]],
      camps: [[0.3, 0.25, 'wolf'], [0.7, 0.75, 'wolf'], [0.3, 0.75, 'banditen'], [0.7, 0.25, 'banditen'],
        [0.38, 0.13, 'troll'], [0.62, 0.87, 'troll'], [0.62, 0.13, 'golem'], [0.38, 0.87, 'golem'],
        [0.5, 0.1, 'drache'], [0.5, 0.9, 'drache']],
      sites: [[0.24, 0.32], [0.76, 0.68], [0.24, 0.68], [0.76, 0.32], [0.42, 0.36], [0.58, 0.64]],
      shrines: [[0.5, 0.3], [0.5, 0.7]],
    },
    '2v2': {
      name: '2 gegen 2', w: 3400, h: 3000, teams: [0, 1, 0, 1],
      bases: [[0.15, 0.25], [0.85, 0.25], [0.15, 0.75], [0.85, 0.75]], shops: [[0.36, 0.5], [0.64, 0.5]],
      camps: [[0.3, 0.06, 'wolf'], [0.7, 0.94, 'wolf'], [0.7, 0.06, 'banditen'], [0.3, 0.94, 'banditen'],
        [0.5, 0.12, 'troll'], [0.5, 0.88, 'troll'], [0.5, 0.33, 'golem'], [0.5, 0.67, 'golem'], [0.5, 0.5, 'drache'],
        [0.06, 0.5, 'wolf'], [0.94, 0.5, 'wolf']],
      sites: [[0.28, 0.4], [0.72, 0.6], [0.28, 0.6], [0.72, 0.4]],
      shrines: [[0.5, 0.22], [0.5, 0.78]],
    },
    'ffa': {
      name: 'Jeder gegen jeden (4)', w: 3400, h: 3400, teams: [0, 1, 2, 3],
      bases: [[0.15, 0.15], [0.85, 0.85], [0.85, 0.15], [0.15, 0.85]], shops: [[0.36, 0.36], [0.64, 0.64], [0.64, 0.36], [0.36, 0.64]],
      camps: [[0.3, 0.06, 'wolf'], [0.7, 0.94, 'wolf'], [0.06, 0.7, 'wolf'], [0.94, 0.3, 'wolf'],
        [0.7, 0.06, 'banditen'], [0.3, 0.94, 'banditen'], [0.06, 0.3, 'banditen'], [0.94, 0.7, 'banditen'],
        [0.3, 0.5, 'troll'], [0.7, 0.5, 'troll'], [0.5, 0.3, 'golem'], [0.5, 0.7, 'golem'], [0.5, 0.5, 'drache']],
      sites: [[0.4, 0.17], [0.83, 0.4], [0.6, 0.83], [0.17, 0.6]],
      shrines: [[0.5, 0.15], [0.85, 0.5], [0.5, 0.85], [0.15, 0.5]],
    },
  };

  // -------------------------------------------------------------------------
  // Kosten und Stufen
  const round5 = (v) => Math.round(v / 5) * 5;
  const styleOf = (p) => (p && p.rd && p.rd.style) || {};
  // Baukosten; mit Spieler gelten dessen Volks-Rabatte (z. B. Zwergen-Türme)
  G.costOf = (type, lvl, p) => {
    const c = G.BUILDINGS[type].cost, cm = styleOf(p).costMul, m = Math.pow(lvl, 1.5) * ((cm && cm[type]) || 1);
    return { g: round5(c.g * m), w: round5(c.w * m) };
  };
  G.timeOf = (type, lvl) => G.BUILDINGS[type].time * Math.pow(lvl, 1.2) / G.PACE;
  G.researchCost = (lvl) => ({ g: 150 * lvl, w: 100 * lvl });
  G.researchTime = (lvl) => 30 * lvl / G.PACE;
  // Grundwerte einer Rolle für ein Volk: Flieger und Spezialeinheit bringen eigene Werte mit
  G.unitBase = (p, role) => {
    const u = p.rd.units[role];
    if (!u || !u.stats) return G.UNIT_BASE[role];
    return u._base || (u._base = { ...G.UNIT_BASE[role], ...u.stats });
  };
  // Welche Gebäude welche Rollen ausbilden – inklusive der Spezialeinheit des Volkes
  G.prodOf = (p, type) => {
    const rd = p.rd, el = rd.units.elite && rd.units.elite.at;
    if (!el || el[0] !== type) return G.PRODUCTION[type] || null;
    const cache = rd._prod || (rd._prod = {});
    return cache[type] || (cache[type] = { ...(G.PRODUCTION[type] || {}), elite: el[1] });
  };
  G.producerType = (p, role) => {
    if (role === 'elite') return p.rd.units.elite.at[0];
    return Object.keys(G.PRODUCTION).find((t) => G.PRODUCTION[t][role] !== undefined);
  };
  G.unitCost = (p, role) => {
    const b = G.unitBase(p, role), ud = styleOf(p).unitDiscount;
    const disc = ((p.rd.passive.eco && p.rd.passive.eco.unitDiscount) || 0) + (p.teco.unitDiscount || 0) + ((ud && ud[G.producerType(p, role)]) || 0);
    return { g: Math.round(b.gold * (1 - disc)), w: Math.round(b.wood * (1 - (p.teco.unitDiscount || 0))) };
  };
  G.builders = (p) => 2 + (p.th.level >= 3 ? 1 : 0) + (p.th.level >= 5 ? 1 : 0) + (p.teco.builder || 0);
  G.buildersBusy = (p) => p.blds.reduce((n, b) => n + (b.upgrading ? 1 : 0), 0) + (p.wallUp ? 1 : 0);
  G.maxCount = (p, type) => {
    const n = G.LIMITS[type][p.th.level - 1], ex = styleOf(p).extraLimit;
    return n > 0 && ex && ex[type] ? n + ex[type] : n;
  };
  G.countOf = (p, type) => p.blds.filter((b) => b.type === type).length;
  G.canAfford = (p, c) => p.gold >= c.g && p.wood >= c.w;
  function canSpend(p, c, ignoreReserve) {
    if (p.gold < c.g || p.wood < c.w) return false;
    if (ignoreReserve) return true;
    return p.gold - c.g >= p.reserve.g && p.wood - c.w >= p.reserve.w;
  }
  function pay(p, c) { p.gold -= c.g; p.wood -= c.w; }

  // Effekte: fx-Liste begrenzen; Kamerawackeln übernimmt die Darstellung (falls vorhanden)
  function fx(o) { if (S.fx.length < 400) { o.t = 0; S.fx.push(o); } }
  G.fx = fx;
  G.shake = (x, y, amp) => { if (G.R && G.R.shake) G.R.shake(x, y, amp); };
  G.msg = function (text, cls) { if (!S) return; S.msgs.push({ text, t: S.time, cls: cls || '' }); if (S.msgs.length > 40) S.msgs.shift(); };
  const human = () => S.players[0];

  // -------------------------------------------------------------------------
  // Neues Spiel
  // cfg: race, hero, mode, difficulty, map, duration, skin, objective, enemies, enemyEco, playerGold, mission
  G.newGame = function (cfg) {
    const race = cfg.race === 'zufall' ? pick(G.RACE_KEYS) : cfg.race;
    const heroes = G.RACES[race].heroes;
    const allowed = heroes.filter((h) => !h.unlock || !G.Profile || G.Profile.heroUnlocked(race, h));
    const heroDef = allowed.find((h) => h.id === cfg.hero) || pick(allowed);
    const layout = G.LAYOUTS[cfg.mode];
    // Völker je Startplatz: Kampagnen-Gegner gehen auf die gegnerischen Plätze, der Rest wird ausgelost
    const fixed = (cfg.enemies || []).filter((r) => r !== race && G.RACES[r]);
    const pool = shuffle(G.RACE_KEYS.filter((r) => r !== race && !fixed.includes(r)));
    const others = layout.bases.slice(1).map((_, k) => (layout.teams[k + 1] !== layout.teams[0] && fixed.length ? fixed.shift() : pool.shift()));
    const themeKey = cfg.map === 'heimat' ? G.RACES[race].map.theme : cfg.map === 'zufall' ? pick(Object.keys(G.THEMES)) : cfg.map;
    S = G.S = {
      time: 0, tick: 0, ents: [], proj: [], fx: [], timers: [], players: [], camps: [], shops: [], decor: [], sites: [],
      critters: [], parts: [], decals: [], corpses: [], terrain: [], roads: [], shrines: [],
      w: layout.w, h: layout.h, theme: themeKey, mode: cfg.mode, layout, over: null, msgs: [],
      speed: 1, paused: false, nextId: 1, grid: new Map(), bonusT: 0, victoryT: 0, cfg,
      limit: (cfg.duration === undefined ? 30 : cfg.duration) * 60, endphase: false, objective: cfg.objective || 'vernichten',
      dragonSlainBy: null, alarmT: 0, gid: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    };
    layout.bases.forEach((b, i) => {
      const isHuman = i === 0;
      const r = isHuman ? race : others[i - 1];
      const hd = isHuman ? heroDef : pick(G.RACES[r].heroes);
      makePlayer(i, r, hd, layout.teams[i], isHuman, cfg, b[0] * layout.w, b[1] * layout.h);
    });
    layout.shops.forEach((s) => S.shops.push({ x: s[0] * layout.w, y: s[1] * layout.h, r: 40 }));
    layout.sites.forEach((s) => { const pos = G.snap('aussenposten', s[0] * layout.w, s[1] * layout.h); S.sites.push({ x: pos.x, y: pos.y, b: null }); });
    layout.camps.forEach((c) => makeCamp(c[2], c[0] * layout.w, c[1] * layout.h));
    if (cfg.events !== false) { // Schreine und Ereignisse (wandernder Boss, Karawane)
      const types = shuffle(Object.keys(G.SHRINES));
      layout.shrines.forEach((s, i) => S.shrines.push({ x: s[0] * layout.w, y: s[1] * layout.h, type: types[i % types.length], owner: -1, cap: 0, capTeam: null }));
      S.events = { bossT: G.EVENTS.bossFirst + rand(0, 120), caravanT: G.EVENTS.caravanFirst + rand(0, 90) };
    }
    genRoads();
    genTerrain();
    genDecor();
    for (const p of S.players) placeResourceSpots(p);
    genCritters();
    updateBonusCaches();
    for (const pl of S.players) { pl.th.maxHp = bldMaxHp(pl, 'haupthaus', 1); pl.th.hp = pl.th.maxHp; }
    fogInit(cfg.fog !== false);
    if (cfg.autopilot) G.setAutopilot(S.players[0], true);
    if (S.objective === 'drache') for (const c of S.camps) if (c.type === 'drache') fogReveal(c.x, c.y, 240); // Missionsziel ist bekannt
    updateFog();
    const p = human();
    G.msg(`Du spielst ${p.rd.name} mit ${p.heroDef.name}. Karte: ${G.THEMES[themeKey].name}.`, 'gold');
    S.players.slice(1).forEach((o) => G.msg(`${o.team === p.team ? 'Verbündeter' : 'Gegner'}: ${o.rd.name} (${o.heroDef.name})`, o.team === p.team ? 'ally' : 'enemy'));
    return S;
  };

  // Armee-Vorlagen: zuerst die des eigenen Volkes (passend zum Spielstil), dann die allgemeinen
  G.presetsFor = function (p) {
    const st = styleOf(p);
    if (!st.comp) return G.ARMY_PRESETS;
    return [{ id: 'volk', name: st.name, desc: `Vorlage des Volkes (${st.tag}): ${st.desc}`, comp: st.comp }, ...G.ARMY_PRESETS];
  };
  // Spielstil des Volkes: Armee-Vorlage für alle; für die KI auch Angriffszeitpunkt, Armeegröße und Wellentakt
  function applyStyle(p, ai) {
    const sai = styleOf(p).ai || {}, pr = G.presetsFor(p)[0];
    p.preset = pr.id;
    p.comp = { ...pr.comp };
    // Menschliche Spieler: Zeitpunkt und Größe des ersten Angriffs wie die KI auf „Mittel“ – vorher jagt die Armee Monster
    const d = ai ? p.diff : G.DIFFICULTY.mittel;
    p.attackFrac = Math.min(0.95, d.attackFrac * (sai.attackFrac || 1));
    p.minAttack = d.minAttack * (sai.minAttack || 1);
    if (!ai) return;
    if (sai.armyStyle && d !== G.DIFFICULTY.einfach) p.armyStyle = sai.armyStyle;
    p.attackFrac = Math.min(0.95, d.attackFrac * (sai.attackFrac || 1));
    p.minAttack = d.minAttack * (sai.minAttack || 1);
    p.waveInterval = Math.round((d.focus ? 35 : 45) * (sai.wave || 1));
  }
  G.applyStyle = applyStyle;
  // Autopilot: der Computer spielt für dich wie die KI – Bau, Ausbildung, Armee, Held, Talente, Volksfähigkeiten.
  // Ausschalten gibt Bau, Talente und Volksfähigkeiten an dich zurück; Truppen und Held handeln weiter selbstständig.
  G.setAutopilot = function (p, on) {
    p.autopilot = !!on;
    if (!on) { p.auto.build = false; p.auto.ability = false; p.auto.talents = false; return; }
    p.auto = { build: true, produce: true, hero: true, ability: true, talents: true };
    p.campsAllowed = true; p.shrinesAllowed = true; p.manualPoint = null; p.targetMode = 'auto';
    const sai = styleOf(p).ai || {};
    if (sai.armyStyle) p.armyStyle = sai.armyStyle; else if (p.armyStyle === 'verteidigen') p.armyStyle = 'sammeln';
    p.waveInterval = Math.round(45 * (sai.wave || 1));
    const d = G.DIFFICULTY.mittel;
    p.attackFrac = Math.min(0.95, d.attackFrac * (sai.attackFrac || 1));
    p.minAttack = Math.min(p.minAttack, d.minAttack * (sai.minAttack || 1));
    if (p.preset === 'eigene') { const pr = G.presetsFor(p)[0]; p.preset = pr.id; p.comp = { ...pr.comp }; }
    const h = p.hero;
    if (h && h.manual) { h.manual = false; h.mode = 'armee'; h.order = null; h.hold = null; }
    if (S && S.players.includes(p)) { autoTalents(p); autoHeroChoices(p); }
  };

  function makePlayer(i, race, heroDef, team, isHuman, cfg, bx, by) {
    const rd = G.RACES[race];
    const diff = G.DIFFICULTY[cfg.difficulty] || G.DIFFICULTY.mittel;
    const thPos = G.snap('haupthaus', bx, by);
    const cx = S.w / 2, cy = S.h / 2;
    const dl = Math.hypot(cx - thPos.x, cy - thPos.y) || 1;
    const dir = { x: (cx - thPos.x) / dl, y: (cy - thPos.y) / dl };
    const aiStyle = diff === G.DIFFICULTY.einfach ? 'sammeln' : pick(['sammeln', 'wellen']);
    const enemyOfHuman = team !== S.layout.teams[0];
    const p = {
      id: i, race, rd, heroDef, team, human: isHuman, diff, color: G.PLAYER_COLORS[i],
      name: isHuman ? 'Du' : `${rd.name} (KI)`,
      skin: isHuman ? (cfg.skin || 'standard') : pick(['standard', 'standard', 'veteran', 'elite', 'legende']),
      banner: isHuman ? (cfg.banner || 'standard') : pick(['standard', 'wimpel', 'standarte']),
      ecoMul: isHuman ? 1 : diff.eco * (cfg.enemyEco && enemyOfHuman ? cfg.enemyEco : 1),
      gold: isHuman && cfg.playerGold ? cfg.playerGold : 400, wood: 250, workers: 5, workerT: 0, goldRatio: 0.65, autoRatio: true,
      incomeG: 0, incomeW: 0,
      base: { x: thPos.x, y: thPos.y }, dir, rally: { x: thPos.x + dir.x * 300, y: thPos.y + dir.y * 300 },
      research: { waffen: 0, ruestung: 0, ausbildung: 0 }, researching: null,
      auto: { build: !isHuman, produce: true, hero: true, ability: !isHuman, talents: !isHuman },
      armyStyle: isHuman ? 'sammeln' : aiStyle, waveInterval: isHuman ? 40 : (diff.focus ? 35 : 45), waveT: 40,
      attackFrac: isHuman ? 0.7 : diff.attackFrac, minAttack: isHuman ? 0 : diff.minAttack,
      targetMode: 'auto', targetPlayer: null, manualPoint: null, campTarget: null, campsAllowed: true, shrinesAllowed: true, campStart: 0,
      armyState: 'sammeln', armyPoint: null, attackPoint: null, armyCentroid: null, poolSupply: 0, committedCount: 0,
      comp: { tank: 2, nahkampf: 3, fernkampf: 3, magier: 2, heiler: 1, support: 1, beschwoerer: 1, flieger: 1, elite: 1 }, preset: 'ausgewogen',
      buffs: [], abCd: [25, 0, 0], alive: true, hero: null, heroRespawn: 0, reserve: { g: 0, w: 0 },
      thinkT: Math.random(), armyT: Math.random(), abilT: Math.random(), blds: [], th: null,
      walls: [], wallLevel: 0, wallUp: null, wallAlive: 0,
      talents: {}, talentPoints: 0, talentPref: Math.floor(Math.random() * 3), teco: {},
      supplyCap: 10, supplyUsed: 0, armySupply: 0, bonus: {}, stats: { kills: 0, lost: 0 }, wv: [],
    };
    p.armyPoint = { ...p.rally };
    applyStyle(p, !isHuman);
    S.players.push(p);
    const th = makeBuilding(p, 'haupthaus', thPos.x, thPos.y, 1);
    p.th = th;
    p.blds.push(th);
    p.hero = makeHero(p);
    return p;
  }

  function makeCamp(type, x, y) {
    const def = G.CAMPS[type];
    const camp = { type, def, name: def.name, x, y, left: 0, respawnT: 0, active: false, activeT: 0, creeps: [] };
    S.camps.push(camp);
    spawnCamp(camp);
  }
  function makeCreep(camp, u, x, y, scale) {
    const cd = G.CREEPS[u], k = scale || 1;
    const e = {
      id: S.nextId++, kind: 'creep', def: cd, ctype: u, name: cd.name, owner: -1, team: -1, camp,
      x, y, home: { x, y }, r: cd.r,
      hp: cd.hp * k, maxHp: cd.hp * k, dmg: cd.dmg * k, range: cd.range, cd: cd.cd, speed: cd.speed, armor: cd.armor,
      splash: cd.splash || 0, proj: cd.proj || null, level: 1, atkT: 0, retargetT: 0, target: null, buffs: [], m: zeroMods(), face: Math.random() * 6, regen: 0, walkT: 0,
    };
    if (cd.boss) e.boss = true;
    if (cd.wagon) e.wagon = true;
    if (camp.event) e.roam = true;
    S.ents.push(e);
    camp.creeps.push(e);
    return e;
  }
  function spawnCamp(camp) {
    camp.creeps = [];
    camp.def.units.forEach((u, i) => {
      const a = (i / camp.def.units.length) * Math.PI * 2;
      makeCreep(camp, u, camp.x + Math.cos(a) * 30, camp.y + Math.sin(a) * 30);
    });
    camp.left = camp.creeps.length;
    camp.active = false;
  }

  // -------------------------------------------------------------------------
  // Karten-Ereignisse: ein wandernder Boss zieht über die Karte, Händlerkarawanen fahren von Händler zu Händler.
  // Beide sind neutral; wer den Boss erschlägt oder den Händlerwagen plündert, erhält die Beute.
  function edgePoint() { // Kartenrand weit weg von allen Basen
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(rand(0, 4));
      const x = side < 2 ? rand(250, S.w - 250) : side === 2 ? 90 : S.w - 90, y = side >= 2 ? rand(250, S.h - 250) : side === 0 ? 90 : S.h - 90;
      if (S.players.every((p) => dist({ x, y }, p.base) > G.BASE_RADIUS + 550) && !inTerrain(x, y, 40, true)) return { x, y };
    }
    return null;
  }
  const where = (x, y) => (y < S.h * 0.33 ? 'im Norden' : y > S.h * 0.67 ? 'im Süden' : x < S.w / 2 ? 'im Westen' : 'im Osten');
  function bossRoute(from) { // durch die Kartenmitte, dann zu Lagern und Schreinen
    const pts = [{ x: S.w / 2 + rand(-200, 200), y: S.h / 2 + rand(-200, 200) }];
    const spots = shuffle([...S.camps.filter((c) => !c.event), ...S.shrines]).slice(0, 4);
    for (const s of spots) pts.push({ x: s.x + rand(-120, 120), y: s.y + rand(-120, 120) });
    return pts.filter((q) => S.players.every((p) => dist(q, p.base) > G.BASE_RADIUS + 250));
  }
  function spawnBoss() {
    if (S.camps.some((c) => c.event === 'boss' && !c.done)) return;
    const at = edgePoint();
    if (!at) return;
    const type = pick(G.BOSS_TYPES), cd = G.CREEPS[type];
    const camp = { type: 'boss', event: 'boss', def: { ...G.CAMPS.boss, name: cd.name }, name: cd.name, x: at.x, y: at.y, left: 1, respawnT: 0, active: true, activeT: 99, creeps: [], route: bossRoute(at), ri: 0, endT: S.time + G.EVENTS.bossLife };
    S.camps.push(camp);
    makeCreep(camp, type, at.x, at.y, 1 + Math.max(0, S.time - 540) / 1500);
    G.msg(`Ein wandernder Boss erscheint ${where(at.x, at.y)}: ${cd.name}! Wer ihn erschlägt, erhält reiche Beute.`, 'gold');
    G.sfx('horn', at.x, at.y, 1, true);
  }
  function spawnCaravan() {
    if (!S.shops.length || S.camps.some((c) => c.event === 'karawane' && !c.done)) return;
    let start, route;
    if (S.shops.length >= 2) { // von Händler zu Händler über die Kartenmitte
      const [a, b] = shuffle(S.shops);
      start = { x: a.x, y: a.y + 50 };
      route = [{ x: S.w / 2 + rand(-80, 80), y: S.h / 2 + rand(-80, 80) }, { x: b.x, y: b.y + 50 }];
    } else { // nur ein Händler: vom Kartenrand über den Händler zum gegenüberliegenden Rand
      const s = S.shops[0], north = Math.random() < 0.5, x = s.x + (Math.random() < 0.5 ? -1 : 1) * rand(260, 380);
      start = { x, y: north ? 70 : S.h - 70 };
      route = [{ x: s.x, y: s.y + 60 }, { x: s.x * 2 - x, y: north ? S.h - 70 : 70 }];
    }
    const camp = { type: 'karawane', event: 'karawane', def: G.CAMPS.karawane, name: G.CAMPS.karawane.name, x: start.x, y: start.y, left: 1, respawnT: 0, active: false, activeT: 0, creeps: [], route, ri: 0 };
    S.camps.push(camp);
    G.CAMPS.karawane.units.forEach((u, i) => makeCreep(camp, u, start.x + (i ? rand(-40, 40) : 0), start.y + (i ? rand(-30, 30) : 0)));
    G.msg(`Eine Händlerkarawane bricht ${where(start.x, start.y)} auf – wer den Wagen plündert, macht reiche Beute.`, '');
  }
  function endEvent(c, text) { // Ereignis endet ohne Sieger: Monster ziehen ab
    c.done = true; c.left = 0; c.active = false;
    for (const o of c.creeps) if (!o.dead) { o.lastOwner = undefined; killEnt(o, null, true); }
    if (text) G.msg(text, '');
  }
  function updateEvents(dt) {
    const E = S.events;
    if (!E) return;
    E.bossT -= dt; E.caravanT -= dt;
    if (E.bossT <= 0) { E.bossT = rand(G.EVENTS.bossEvery[0], G.EVENTS.bossEvery[1]); spawnBoss(); }
    if (E.caravanT <= 0) { E.caravanT = rand(G.EVENTS.caravanEvery[0], G.EVENTS.caravanEvery[1]); spawnCaravan(); }
    for (const c of S.camps) {
      if (!c.event || c.done) continue;
      const lead = c.creeps.find((o) => !o.dead && (o.boss || o.wagon));
      if (!lead) continue;
      if (c.event === 'boss' && S.time > c.endT && !lead.target) endEvent(c, `${c.name} zieht weiter und verlässt das Land.`);
    }
  }
  // Bewegung wandernder Ereignis-Monster; true = Zug ist erledigt
  function roamCreep(e, dt) {
    const c = e.camp;
    if (c.done) return false;
    if (e.wagon) { // der Wagen fährt seine Route und kämpft nie
      const pt = c.route[c.ri];
      c.x = e.x; c.y = e.y;
      if (!pt) { endEvent(c, 'Die Händlerkarawane hat ihr Ziel unbehelligt erreicht.'); return true; }
      e.target = null;
      if (navMove(e, pt.x, pt.y, dt, 24)) c.ri++;
      return true;
    }
    if (e.boss) { c.x = e.x; c.y = e.y; e.home = { x: e.x, y: e.y }; c.active = true; c.activeT = 99; return false; }
    const w = c.creeps.find((o) => o.wagon && !o.dead); // Wachen bleiben beim Wagen
    if (w) e.home = { x: w.x + Math.cos(e.id * 2.4) * 30, y: w.y + Math.sin(e.id * 2.4) * 30 };
    return false;
  }
  function bossGoal(e) {
    const c = e.camp;
    let pt = c.route[c.ri];
    if (!pt) { c.route = bossRoute(e); c.ri = 0; pt = c.route[0] || { x: S.w / 2, y: S.h / 2 }; }
    if (d2(e.x, e.y, pt.x, pt.y) < 70 * 70) c.ri++;
    return pt;
  }

  // -------------------------------------------------------------------------
  // Schreine: allein 8 s besetzen erobert; der Bonus gilt für das ganze Team
  const teamName = (team) => { const ps = S.players.filter((p) => p.team === team); return ps.length ? ps.map((p) => p.name).join(' & ') : 'Jemand'; };
  function updateShrines(dt) {
    for (const sh of S.shrines) {
      const near = {};
      G.query(sh.x, sh.y, G.SHRINE_RADIUS, (o) => { if (!o.dead && o.owner >= 0 && o.kind !== 'building') near[o.team] = (near[o.team] || 0) + 1; });
      const teams = Object.keys(near);
      if (teams.length === 1) {
        const t = +teams[0];
        if (t === sh.owner) { sh.cap = 0; sh.capTeam = null; continue; }
        if (sh.capTeam !== t) { sh.capTeam = t; sh.cap = 0; }
        sh.cap += dt;
        if (sh.cap >= G.SHRINE_CAPTURE) captureShrine(sh, t);
      } else if (!teams.length && sh.cap > 0) { sh.cap = Math.max(0, sh.cap - dt * 0.5); if (!sh.cap) sh.capTeam = null; }
    }
  }
  function captureShrine(sh, team) {
    const prev = sh.owner, def = G.SHRINES[sh.type], me = human();
    sh.owner = team; sh.cap = 0; sh.capTeam = null;
    fx({ type: 'pillar', x: sh.x, y: sh.y, r: 40, color: def.color, dur: 1.4, big: true });
    G.sfx('fertig', sh.x, sh.y, 0.8);
    if (team === me.team) G.msg(`${def.name} erobert: ${def.desc}!`, 'good');
    else if (prev === me.team) G.msg(`${def.name} wurde dir entrissen!`, 'bad');
    else G.msg(`${teamName(team)} erobert den ${def.name}.`, 'enemy');
  }
  function shrineModsByTeam() {
    const out = {};
    for (const sh of S.shrines || []) { const d = G.SHRINES[sh.type]; if (sh.owner >= 0 && d.mods) addBonus(out[sh.owner] || (out[sh.owner] = zeroMods()), d.mods); }
    return out;
  }
  function chooseShrine(p, pool) { // nächster fremder Schrein auf der eigenen Kartenhälfte, wenn die Armee stark genug ist
    const foes = S.players.filter((o) => o.alive && o.team !== p.team), st = strength(pool);
    let best = null, bd = Infinity;
    for (const sh of S.shrines) {
      if (sh.owner === p.team) continue;
      const own = dist(sh, p.base), foe = foes.length ? Math.min(...foes.map((o) => dist(sh, o.base))) : Infinity;
      if (own > foe * 1.15) continue;
      const near = [];
      G.queryFoes(sh.x, sh.y, 450, p.team, (o) => { if (!o.dead && o.kind !== 'building' && o.kind !== 'creep') near.push(o); });
      if (strength(near) * 1.3 > st) continue;
      if (own < bd) { bd = own; best = sh; }
    }
    return best;
  }

  function freeOfStuff(x, y, baseM, campM, shopM) {
    for (const p of S.players) if (d2(x, y, p.base.x, p.base.y) < (G.BASE_RADIUS + baseM) ** 2) return false;
    for (const c of S.camps) if (d2(x, y, c.x, c.y) < campM ** 2) return false;
    for (const s of S.shops) if (d2(x, y, s.x, s.y) < shopM ** 2) return false;
    for (const s of S.sites) if (d2(x, y, s.x, s.y) < shopM ** 2) return false;
    for (const s of S.shrines || []) if (d2(x, y, s.x, s.y) < shopM ** 2) return false;
    return true;
  }
  // -------------------------------------------------------------------------
  // Landschaft: Wege, große Geländemerkmale (Teiche, Lavaseen, Felsen …) und Pflanzen in Hainen.
  // Merkmale mit block sind Hindernisse für alle Truppen; Wegfindung und Kollision weichen ihnen aus.
  const TREES = { eiche: 1, birke: 1, hochbaum: 1, totbaum: 1, akazie: 1, tanne: 1, kohlebaum: 1 };
  const SMALL = { blumen: 1, gras: 1, farn: 1, leuchtpilz: 1, schilf: 1, fliegenpilz: 1, eiskristall: 1, glutpilz: 1 };
  G.FLORA_SMALL = SMALL;
  function genRoads() { // leicht geschwungene Wege: Basen und Händler zur Kartenmitte, gegenüberliegende Basen untereinander
    const hub = { x: S.w / 2, y: S.h / 2 }, pts = S.players.map((p) => p.base), pairs = [];
    for (const p of pts) pairs.push([p, hub]);
    for (const s of S.shops) pairs.push([s, hub]);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].x - pts[j].x) < 10 || Math.abs(pts[i].y - pts[j].y) < 10) pairs.push([pts[i], pts[j]]);
    S.roads = pairs.map(([a, b]) => ({ ax: a.x, ay: a.y, bx: b.x, by: b.y, mx: (a.x + b.x) / 2 + rand(-100, 100), my: (a.y + b.y) / 2 + rand(-100, 100) }));
  }
  function segDist(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? clamp(((x - ax) * dx + (y - ay) * dy) / l, 0, 1) : 0;
    return Math.hypot(x - ax - dx * t, y - ay - dy * t);
  }
  function roadDist(x, y) { // Abstand zum nächsten Weg (Kurve in 12 Stücken angenähert)
    let best = Infinity;
    for (const r of S.roads) {
      let px = r.ax, py = r.ay;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, u = 1 - t;
        const qx = u * u * r.ax + 2 * u * t * r.mx + t * t * r.bx, qy = u * u * r.ay + 2 * u * t * r.my + t * t * r.by;
        best = Math.min(best, segDist(x, y, px, py, qx, qy));
        px = qx; py = qy;
      }
    }
    return best;
  }
  // Liegt ein Punkt (plus Rand m) in einem Geländemerkmal? onlyBlock: nur Hindernisse prüfen
  function inTerrain(x, y, m, onlyBlock) {
    for (const f of S.terrain) {
      if (onlyBlock && !f.block) continue;
      const dx = (x - f.x) / (f.rx + m), dy = (y - f.y) / (f.ry + m);
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  }
  G.inTerrain = (x, y, m) => inTerrain(x, y, m || 0, true);
  // Objekt aus einem Hindernis (Oval plus Radius r) an den Rand schieben
  function pushOutOf(e, f, r) {
    const ax = f.rx + r, ay = f.ry + r, dx = e.x - f.x, dy = e.y - f.y;
    if (dx >= ax || dx <= -ax || dy >= ay || dy <= -ay) return;
    const q = (dx * dx) / (ax * ax) + (dy * dy) / (ay * ay);
    if (q >= 1) return;
    if (q < 1e-6) { e.x = f.x + ax; return; }
    const k = 1 / Math.sqrt(q);
    e.x = f.x + dx * k; e.y = f.y + dy * k;
  }
  // Hindernis-Raster (40-px-Felder) für Wegfindung und Erreichbarkeitsprüfung
  function terrainMask(W, H, list) {
    const m = new Uint8Array(W * H);
    for (const f of list) {
      if (!f.block) continue;
      const ax = f.rx + 4, ay = f.ry + 4;
      const x0 = Math.max(0, Math.floor((f.x - ax) / T)), x1 = Math.min(W - 1, Math.floor((f.x + ax) / T));
      const y0 = Math.max(0, Math.floor((f.y - ay) / T)), y1 = Math.min(H - 1, Math.floor((f.y + ay) / T));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const dx = ((cx + 0.5) * T - f.x) / ax, dy = ((cy + 0.5) * T - f.y) / ay;
        if (dx * dx + dy * dy < 1) m[cy * W + cx] = 1;
      }
    }
    return m;
  }
  // Bleiben alle Basen, Lager, Händler und Goldadern miteinander verbunden?
  function terrainConnected(list) {
    const W = Math.ceil(S.w / T), H = Math.ceil(S.h / T), m = terrainMask(W, H, list);
    const cell = (x, y) => clamp(Math.floor(y / T), 0, H - 1) * W + clamp(Math.floor(x / T), 0, W - 1);
    const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
    let qh = 0, qt = 0;
    const s0 = cell(S.players[0].base.x, S.players[0].base.y);
    seen[s0] = 1; q[qt++] = s0;
    while (qh < qt) {
      const c = q[qh++], cx = c % W, cy = (c / W) | 0;
      for (let i = 0; i < 4; i++) {
        const nx = cx + DX[i], ny = cy + DY[i];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (!seen[n] && !m[n]) { seen[n] = 1; q[qt++] = n; }
      }
    }
    return [...S.players.map((p) => p.base), ...S.camps, ...S.shops, ...S.sites].every((p) => seen[cell(p.x, p.y)]);
  }
  function pickWeighted(list) {
    let sum = 0;
    for (const [, w] of list) sum += w;
    let r = Math.random() * sum;
    for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
    return list[0][0];
  }
  function placeFeature(kind) {
    const F = G.FEATURES[kind];
    const rx = rand(F.r[0], F.r[1]), ry = rx * F.ry;
    const x = rand(rx + 50, S.w - rx - 50), y = rand(ry + 60, S.h - ry - 50);
    if (F.block ? !freeOfStuff(x, y, rx + 110, rx + 160, rx + 120) : !freeOfStuff(x, y, rx + 40, rx + 80, rx + 60)) return false;
    if (roadDist(x, y) < (F.block ? rx + 90 : rx * 0.8 + 30)) return false;
    if (S.terrain.some((o) => Math.hypot(o.x - x, o.y - y) < o.rx + rx + 90)) return false;
    const f = { kind, x, y, rx, ry, block: !!F.block, seed: Math.random() };
    if (f.block && !terrainConnected(S.terrain.concat(f))) return false;
    S.terrain.push(f);
    return true;
  }
  function genTerrain() {
    const L = G.LANDSCAPE[S.theme];
    if (!L) return;
    const want = Math.round((S.w * S.h) / 850000) + 2;
    // jede Art einmal (große zuerst), dann nach Gewicht auffüllen – Häufiges wird dabei seltener gewählt
    for (const [kind] of L.features.slice().sort((a, b) => G.FEATURES[b[0]].r[1] - G.FEATURES[a[0]].r[1])) {
      for (let t = 0; t < 60 && !placeFeature(kind); t++);
    }
    const count = (k) => S.terrain.filter((f) => f.kind === k).length;
    for (let tries = 0; tries < want * 40 && S.terrain.length < want; tries++) {
      placeFeature(pickWeighted(L.features.map(([k, w]) => [k, w / (1 + 1.5 * count(k))])));
    }
  }
  function genDecor() {
    const L = G.LANDSCAPE[S.theme];
    const grid = new Map(), GC = 32;
    const key = (cx, cy) => cx * 4096 + cy;
    const free = (x, y, gap) => {
      const cx = (x / GC) | 0, cy = (y / GC) | 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const a = grid.get(key(cx + i, cy + j));
        if (a) for (const d of a) if (d2(d.x, d.y, x, y) < gap * gap) return false;
      }
      return true;
    };
    const add = (k, x, y, s) => {
      const small = SMALL[k];
      if (x < 20 || y < 20 || x > S.w - 20 || y > S.h - 20) return;
      if (!freeOfStuff(x, y, 90, 150, 130) || inTerrain(x, y, small ? 6 : 36) || roadDist(x, y) < (small ? 22 : 40) || !free(x, y, small ? 14 : 26)) return;
      const d = { x, y, s, v: Math.floor(rand(0, 3)), seed: Math.random(), k };
      S.decor.push(d);
      const gk = key((x / GC) | 0, (y / GC) | 0);
      if (!grid.has(gk)) grid.set(gk, []);
      grid.get(gk).push(d);
    };
    // Haine: dichte Baumgruppen mit Unterholz am Rand, dazwischen bleibt offenes Gelände für Schlachten
    const smallKinds = L.flora.filter(([k]) => SMALL[k]);
    const groves = Math.round((S.w * S.h) / 1000000) + 3;
    for (let g = 0; g < groves; g++) {
      const cx = rand(120, S.w - 120), cy = rand(120, S.h - 120);
      if (!freeOfStuff(cx, cy, 150, 220, 180) || inTerrain(cx, cy, 60)) continue;
      const n = 5 + Math.floor(rand(0, 9)), R = 55 + n * 10;
      for (let i = 0; i < n * 3; i++) {
        const a = rand(0, 6.28), r = R * Math.sqrt(Math.random());
        add(L.grove, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, rand(0.85, 1.4));
      }
      for (let i = 0; i < n && smallKinds.length; i++) {
        const a = rand(0, 6.28), r = R * rand(0.9, 1.3);
        add(pickWeighted(smallKinds), cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, rand(0.8, 1.2));
      }
    }
    // Verstreute Pflanzen, Büsche und Steine
    const n = Math.floor((S.w * S.h) / 22000);
    for (let i = 0; i < n; i++) {
      const k = pickWeighted(L.flora);
      add(k, rand(20, S.w - 20), rand(20, S.h - 20), SMALL[k] ? rand(0.8, 1.25) : rand(0.7, 1.3));
    }
    S.decor.sort((a, b) => a.y - b.y);
  }
  // Ressourcenpunkte für die sichtbaren Arbeiter
  function placeResourceSpots(p) {
    const back = { x: -p.dir.x, y: -p.dir.y };
    const side = { x: -p.dir.y, y: p.dir.x };
    p.goldVein = { x: p.base.x + (back.x * 0.6 + side.x * 0.8) * 250, y: p.base.y + (back.y * 0.6 + side.y * 0.8) * 250 };
    let best = null, bd = Infinity;
    for (const d of S.decor) {
      if (d.k && !TREES[d.k]) continue; // Holz gibt es an Bäumen
      const dd = d2(d.x, d.y, p.base.x, p.base.y);
      if (dd < bd && dd > (G.BASE_RADIUS + 60) ** 2) { bd = dd; best = d; }
    }
    p.woodSpot = best && bd < 900 * 900 ? { x: best.x, y: best.y + 14 } : { x: p.base.x + back.x * 330, y: p.base.y + back.y * 330 };
  }

  // -------------------------------------------------------------------------
  // Atmosphäre: Tiere, die zur Karte passen (keine Ziele)
  const FLYERS = { vogel: 1, eule: 1, kraehe: 1, geier: 1, fledermaus: 1 };
  const GLOW = { gluehwurm: 1, glutkaefer: 1 };
  function genCritters() {
    const types = G.THEMES[S.theme].critters || [];
    const n = Math.floor((S.w * S.h) / 380000);
    for (let i = 0; i < n * 3 && S.critters.length < n; i++) {
      const type = pick(types);
      const x = rand(60, S.w - 60), y = rand(60, S.h - 60);
      if (!FLYERS[type] && (!freeOfStuff(x, y, 120, 200, 100) || inTerrain(x, y, 30, true))) continue;
      if (FLYERS[type]) S.critters.push({ type, fly: true, x, y, ang: rand(0, 6.28), sp: rand(60, 110), t: 0 });
      else if (GLOW[type]) S.critters.push({ type, glow: true, x, y, hx: x, hy: y, t: rand(0, 10), n: 5 + Math.floor(rand(0, 5)) });
      else S.critters.push({ type, x, y, hx: x, hy: y, tx: x, ty: y, wait: rand(0, 3), t: 0, face: rand(0, 6.28), moving: false, flee: 0 });
    }
  }
  function updateCritters(dt) {
    for (const c of S.critters) {
      c.t += dt;
      if (c.fly) {
        c.ang += Math.sin(c.t * 0.7 + c.sp) * 0.15 * dt;
        c.x += Math.cos(c.ang) * c.sp * dt; c.y += Math.sin(c.ang) * c.sp * dt;
        if (c.x < -150 || c.y < -150 || c.x > S.w + 150 || c.y > S.h + 150) {
          const e = Math.floor(rand(0, 4));
          c.x = e === 0 ? -100 : e === 1 ? S.w + 100 : rand(0, S.w);
          c.y = e === 2 ? -100 : e === 3 ? S.h + 100 : rand(0, S.h);
          c.ang = Math.atan2(S.h / 2 - c.y + rand(-600, 600), S.w / 2 - c.x + rand(-600, 600));
        }
        continue;
      }
      if (c.glow) continue;
      let threat = null;
      G.query(c.x, c.y, 100, (o) => { if (!threat && o.kind !== 'building') threat = o; });
      if (threat) {
        const a = Math.atan2(c.y - threat.y, c.x - threat.x);
        c.tx = c.x + Math.cos(a) * 140; c.ty = c.y + Math.sin(a) * 140; c.flee = 1.2;
      }
      if (c.flee > 0) c.flee -= dt;
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d > 3) {
        const sp = (c.flee > 0 ? 150 : 32) * dt;
        c.x += dx / d * Math.min(sp, d); c.y += dy / d * Math.min(sp, d);
        c.face = Math.atan2(dy, dx); c.moving = true;
      } else {
        c.moving = false;
        c.wait -= dt;
        if (c.wait <= 0) {
          c.wait = rand(1.5, 5);
          if (d2(c.x, c.y, c.hx, c.hy) > 300 * 300) { c.hx = c.x; c.hy = c.y; }
          c.tx = c.hx + rand(-110, 110); c.ty = c.hy + rand(-110, 110);
        }
      }
      for (const f of S.terrain) if (f.block) pushOutOf(c, f, 6); // nicht durch Teiche und Felsen
      c.x = clamp(c.x, 10, S.w - 10); c.y = clamp(c.y, 10, S.h - 10);
    }
  }

  // Sichtbare Arbeiter (rein optisch; die Wirtschaft wird abstrakt berechnet)
  function updateWorkersVis(p, dt) {
    while (p.wv.length < p.workers) {
      const a = Math.random() * 6.28;
      p.wv.push({ x: p.base.x + Math.cos(a) * 50, y: p.base.y + Math.sin(a) * 50, state: 'go', t: 0, face: 0, moving: false, idx: p.wv.length, walkT: 0 });
    }
    if (p.wv.length > p.workers) p.wv.length = p.workers;
    const nGold = Math.round(p.workers * p.goldRatio);
    const mines = p.blds.filter((b) => b.type === 'goldmine' && b.level >= 1);
    const saws = p.blds.filter((b) => b.type === 'saegewerk' && b.level >= 1);
    for (const w of p.wv) {
      w.res = w.idx < nGold ? 'gold' : 'holz';
      const src = w.res === 'gold' ? (mines.length ? mines[w.idx % mines.length] : p.goldVein) : p.woodSpot;
      const drop = w.res === 'gold' ? p.th : (saws.length ? saws[w.idx % saws.length] : p.th);
      const tgt = w.state === 'go' ? src : w.state === 'back' ? drop : null;
      if (tgt) {
        const off = (w.idx % 5) * 7 - 14;
        const tx = tgt.x + off, ty = tgt.y + (tgt.size ? tgt.size * T * 0.5 + 4 : 6);
        const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
        if (d < 6) { w.state = w.state === 'go' ? 'work' : 'drop'; w.t = 0; w.moving = false; }
        else { const sp = 52 * dt; w.x += dx / d * Math.min(sp, d); w.y += dy / d * Math.min(sp, d); w.face = Math.atan2(dy, dx); w.moving = true; w.walkT += sp * 0.2; }
      } else {
        w.t += dt;
        if (w.state === 'work' && w.t > 2.5) { w.state = 'back'; w.carry = w.res; }
        if (w.state === 'drop' && w.t > 0.4) { w.state = 'go'; w.carry = null; }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Gebäude
  G.snap = function (type, x, y) {
    const s = G.BUILDINGS[type].size;
    const tx = Math.round(x / T - s / 2), ty = Math.round(y / T - s / 2);
    return { x: (tx + s / 2) * T, y: (ty + s / 2) * T };
  };
  G.freeSiteNear = function (x, y, r) {
    let best = null, bd = (r || 140) ** 2;
    for (const s of S.sites) { if (s.b && !s.b.dead) continue; const dd = d2(s.x, s.y, x, y); if (dd < bd) { bd = dd; best = s; } }
    return best;
  };
  G.canPlace = function (p, type, x, y, gap = 0) {
    if (G.BUILDINGS[type].outpost) {
      const s = G.freeSiteNear(x, y, 140);
      if (!s) return false;
      let blocked = false;
      G.query(s.x, s.y, 120, (o) => { if (o.team !== p.team && o.kind !== 'building' && !o.dead) blocked = true; });
      return !blocked;
    }
    const hs = G.BUILDINGS[type].size * T / 2;
    if (d2(x, y, p.base.x, p.base.y) > (G.BASE_RADIUS - hs) ** 2) return false;
    if (x - hs < 0 || y - hs < 0 || x + hs > S.w || y + hs > S.h) return false;
    for (const b of p.blds) {
      const bs = b.size * T / 2;
      if (Math.abs(b.x - x) < bs + hs + gap && Math.abs(b.y - y) < bs + hs + gap) return false;
    }
    return true;
  };
  function bldMaxHp(p, type, lvl) {
    return G.BUILDINGS[type].hp * (1 + 0.25 * (Math.max(1, lvl) - 1)) * (1 + (p.bonus.buildings ? p.bonus.buildings.hp : 0));
  }
  function makeBuilding(p, type, x, y, level) {
    const def = G.BUILDINGS[type];
    const b = {
      id: S.nextId++, kind: 'building', type, def, name: G.bname(p.race, type), owner: p.id, team: p.team, x, y, size: def.size,
      r: def.size * T / 2, level, upgrading: null, prod: null, queue: [], focus: 'auto', prodOn: true, atkT: 0, armor: 5,
      hp: 1, maxHp: 1, m: zeroMods(), buffs: [],
    };
    b.maxHp = bldMaxHp(p, type, level);
    b.hp = level > 0 ? b.maxHp : b.maxHp * 0.1;
    S.ents.push(b);
    S.navDirty = true;
    return b;
  }
  G.buildingCheck = function (p, type) {
    if (G.countOf(p, type) >= G.maxCount(p, type)) return G.maxCount(p, type) ? 'Limit erreicht (Haupthaus aufwerten)' : 'Benötigt höhere Haupthaus-Stufe';
    if (G.buildersBusy(p) >= G.builders(p)) return 'Alle Baumeister beschäftigt';
    if (!G.canAfford(p, G.costOf(type, 1, p))) return 'Nicht genug Rohstoffe';
    return null;
  };
  G.placeBuilding = function (p, type, x, y, gap = 0) {
    let pos = G.snap(type, x, y);
    let site = null;
    if (G.BUILDINGS[type].outpost) { site = G.freeSiteNear(x, y, 140); if (!site) return false; pos = { x: site.x, y: site.y }; }
    if (G.buildingCheck(p, type)) return false;
    if (!G.canPlace(p, type, pos.x, pos.y, gap)) return false;
    pay(p, G.costOf(type, 1, p));
    const b = makeBuilding(p, type, pos.x, pos.y, 0);
    b.upgrading = { to: 1, t: 0, total: G.timeOf(type, 1) };
    if (site) { site.b = b; b.site = site; }
    p.blds.push(b);
    G.sfx('bau', b.x, b.y);
    return b;
  };
  G.upgradeCheck = function (p, b) {
    if (b.upgrading) return 'Wird bereits ausgebaut';
    if (b.level >= G.MAX_LEVEL) return 'Maximale Stufe';
    if (b.type !== 'haupthaus' && b.level >= p.th.level) return 'Haupthaus-Stufe zu niedrig';
    if (G.buildersBusy(p) >= G.builders(p)) return 'Alle Baumeister beschäftigt';
    if (!G.canAfford(p, G.costOf(b.type, b.level + 1, p))) return 'Nicht genug Rohstoffe';
    return null;
  };
  G.upgradeBuilding = function (p, b) {
    if (G.upgradeCheck(p, b)) return false;
    pay(p, G.costOf(b.type, b.level + 1, p));
    b.upgrading = { to: b.level + 1, t: 0, total: G.timeOf(b.type, b.level + 1) };
    if (b.prod) { const uc = G.unitCost(p, b.prod.role); p.gold += uc.g; p.wood += uc.w; b.prod = null; }
    G.sfx('bau', b.x, b.y);
    return true;
  };
  G.researchCheck = function (p, line) {
    const sm = p.blds.find((b) => b.type === 'schmiede' && b.level >= 1);
    if (!sm) return 'Schmiede benötigt';
    if (p.researching) return 'Forschung läuft bereits';
    const maxL = Math.max(...p.blds.filter((b) => b.type === 'schmiede').map((b) => b.level));
    if (p.research[line] >= maxL) return 'Schmiede-Stufe zu niedrig';
    if (!G.canAfford(p, G.researchCost(p.research[line] + 1))) return 'Nicht genug Rohstoffe';
    return null;
  };
  G.startResearch = function (p, line) {
    if (G.researchCheck(p, line)) return false;
    const L = p.research[line] + 1;
    pay(p, G.researchCost(L));
    p.researching = { line, t: 0, total: G.researchTime(L) };
    return true;
  };

  // Mauer-Upgrade: Ring um die Basis, eigene Truppen gehen hindurch
  G.wallCheck = function (p) {
    if (p.wallLevel >= G.WALLS.length) return 'Maximale Stufe';
    if (p.wallUp) return 'Wird bereits gebaut';
    const w = G.WALLS[p.wallLevel];
    if (p.th.level < w.th) return `Benötigt Haupthaus Stufe ${w.th}`;
    if (G.buildersBusy(p) >= G.builders(p)) return 'Alle Baumeister beschäftigt';
    if (!G.canAfford(p, w.cost)) return 'Nicht genug Rohstoffe';
    return null;
  };
  G.upgradeWall = function (p) {
    if (G.wallCheck(p)) return false;
    const w = G.WALLS[p.wallLevel];
    pay(p, w.cost);
    p.wallUp = { to: p.wallLevel + 1, t: 0, total: w.time / G.PACE };
    G.sfx('bau', p.base.x, p.base.y);
    return true;
  };
  const WALL_DEFS = G.WALLS.map((w) => ({ name: w.name, hp: w.hp, desc: 'Teil der Basismauer. Eigene Truppen können sie passieren.' }));
  function finishWall(p) {
    p.wallLevel = p.wallUp.to; p.wallUp = null;
    const w = G.WALLS[p.wallLevel - 1];
    const hpMul = 1 + (p.bonus.buildings ? p.bonus.buildings.hp : 0);
    for (const s of p.walls) s.dead = true;
    p.walls = [];
    const R = G.WALL_RADIUS, n = Math.round((2 * Math.PI * R) / 34);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = {
        id: S.nextId++, kind: 'building', type: 'mauer', def: WALL_DEFS[p.wallLevel - 1],
        name: w.name, owner: p.id, team: p.team, x: p.base.x + Math.cos(a) * R, y: p.base.y + Math.sin(a) * R, ang: a, size: 1, r: 18,
        level: p.wallLevel, upgrading: null, prod: null, queue: [], armor: w.armor, hp: w.hp * hpMul, maxHp: w.hp * hpMul, m: zeroMods(), buffs: [], atkT: 0,
      };
      if (s.x < 10 || s.y < 10 || s.x > S.w - 10 || s.y > S.h - 10) continue;
      p.walls.push(s); S.ents.push(s);
    }
    S.navDirty = true;
    if (p.human) { G.msg(`${w.name} errichtet!`, 'good'); G.sfx('fertig', p.base.x, p.base.y); }
  }

  function updateBuilding(b, dt) {
    const p = S.players[b.owner];
    if (b.hitT > 0) b.hitT -= dt;
    if (b.upgrading) {
      const u = b.upgrading;
      const sp = 1 + (p.teco.buildSpeed || 0);
      u.t += dt * sp;
      if (b.level === 0) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.9 * dt * sp / u.total);
      if (u.t >= u.total) {
        const old = b.maxHp;
        const wasNew = b.level === 0;
        b.level = u.to;
        b.upgrading = null;
        b.maxHp = bldMaxHp(p, b.type, b.level);
        b.hp = Math.min(b.maxHp, b.hp + (b.maxHp - old));
        if (p.human) {
          G.msg(`${b.name} ${wasNew ? 'fertiggestellt' : 'auf Stufe ' + b.level + ' ausgebaut'}.`, 'good');
          fx({ type: 'dust', x: b.x, y: b.y + b.r * 0.5, r: b.r * 1.2, dur: 0.9, seed: Math.random(), gold: true });
          if (b.type === 'haupthaus') G.msg(`${b.name} Stufe ${b.level}! Neue Gebäude und Stufen${b.level === 3 || b.level === 5 ? ' sowie eine Volksfähigkeit' : ''} freigeschaltet.`, 'gold');
          G.sfx('fertig', b.x, b.y);
        }
      }
    }
    const atk = b.def.attack;
    if (atk && b.level >= 1) {
      b.atkT -= dt;
      if (b.atkT <= 0) {
        let best = null, bd = Infinity;
        G.queryFoes(b.x, b.y, atk.range, b.team, (o) => {
          if (o.team === b.team || o.kind === 'building' || o.dead) return;
          if (o.kind === 'creep' && !o.camp.active) return;
          const dd = d2(o.x, o.y, b.x, b.y);
          if (dd < bd) { bd = dd; best = o; }
        });
        if (best) {
          const def = (p.bonus.defense ? p.bonus.defense.dmg : 0);
          const dmg = atk.dmg * (1 + 0.2 * (b.level - 1)) * (1 + def);
          b.lastAng = Math.atan2(best.y - b.y, best.x - b.x);
          S.proj.push({ x: b.x, y: b.y - b.size * 12, t: best, src: b, dmg, splash: atk.splash || 0, kind: atk.splash ? 'kanone' : 'pfeil', speed: 480, team: b.team, owner: b.owner, tx: best.x, ty: best.y, z1: best.fly ? G.FLY_ALT : 0 });
          G.sfx(atk.splash ? 'kanone' : 'pfeil', b.x, b.y, 0.6);
          b.atkT = atk.cd;
        } else b.atkT = 0.3;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Boni (Commander, Volk, Talente, Forschung, Gegenstände)
  function zeroMods() { return { dmg: 0, atkspd: 0, speed: 0, armor: 0, regen: 0, lifesteal: 0, heal: 0, range: 0, hp: 0, summonExtra: 0 }; }
  const BONUS_KEYS = ['hp', 'dmg', 'armor', 'speed', 'atkspd', 'heal', 'range', 'regen', 'lifesteal', 'summonExtra'];
  function addBonus(target, src) { for (const k of BONUS_KEYS) if (src[k]) target[k] += src[k]; }
  function talentList(p) {
    const out = [];
    for (const br of G.TALENTS) for (const t of br.talents) if (p.talents[t.id]) out.push(t);
    return out;
  }
  G.hasTalentSpecial = (p, sp) => talentList(p).some((t) => t.special === sp);
  function calcBonus(p, key) {
    const out = zeroMods();
    const unitLike = G.ROLES.includes(key) || key === 'summon';
    const entries = [];
    if (key !== 'hero') (p.heroDef.bonus || []).forEach((e) => entries.push(e));
    (p.rd.passive.bonus || []).forEach((e) => entries.push(e));
    (styleOf(p).bonus || []).forEach((e) => entries.push(e));
    for (const t of talentList(p)) if (t.bonus) [].concat(t.bonus).forEach((e) => entries.push(e));
    for (const e of entries) {
      const isAll = e.roles.includes('all') && unitLike;
      if (e.roles.includes(key) || isAll) addBonus(out, e);
    }
    if (unitLike) {
      out.dmg += 0.08 * p.research.waffen;
      out.armor += p.research.ruestung;
      out.hp += 0.06 * p.research.ausbildung;
      if (p.hero) for (const it of p.hero.items) { const d = G.ITEMS[it]; if (d && d.army) addBonus(out, d.army); }
    }
    return out;
  }
  function updateBonusCaches() {
    for (const p of S.players) {
      p.bonus = {};
      for (const k of [...G.ROLES, 'summon', 'hero', 'buildings', 'defense']) p.bonus[k] = calcBonus(p, k);
      const te = {};
      for (const t of talentList(p)) if (t.eco) for (const k in t.eco) te[k] = (te[k] || 0) + t.eco[k];
      p.teco = te;
    }
  }
  G.bonusOf = (p, key) => p.bonus[key] || zeroMods();

  // Talente
  G.talentCheck = function (p, bi, ti) {
    const br = G.TALENTS[bi], t = br && br.talents[ti];
    if (!t) return 'Unbekannt';
    if (p.talents[t.id]) return 'Bereits gelernt';
    const have = br.talents.filter((x) => p.talents[x.id]).length;
    if (have < ti) return `Benötigt ${ti} Punkt(e) im Zweig ${br.name}`;
    if (p.talentPoints <= 0) return 'Keine Talentpunkte (1 pro Heldenstufe)';
    return null;
  };
  G.learnTalent = function (p, bi, ti) {
    if (G.talentCheck(p, bi, ti)) return false;
    const t = G.TALENTS[bi].talents[ti];
    p.talents[t.id] = true; p.talentPoints--;
    updateBonusCaches();
    if (p.hero) recalcHero(p.hero);
    if (p.human) { G.msg(`Talent gelernt: ${t.name}`, 'gold'); G.sfx('level', p.base.x, p.base.y, 1, true); }
    return true;
  };
  function autoTalents(p) {
    let guard = 10;
    while (p.talentPoints > 0 && guard--) {
      const order = [p.talentPref, (p.talentPref + 1) % 3, (p.talentPref + 2) % 3];
      let done = false;
      for (const bi of order) {
        for (let ti = 0; ti < 4; ti++) if (!G.talentCheck(p, bi, ti)) { G.learnTalent(p, bi, ti); done = true; break; }
        if (done) break;
      }
      if (!done) break;
    }
  }

  // -------------------------------------------------------------------------
  // Einheiten
  function makeUnit(p, role, x, y, level) {
    const base = G.unitBase(p, role), rdef = p.rd.units[role], m = rdef.mods || {};
    const b = G.bonusOf(p, role);
    const e = {
      id: S.nextId++, kind: 'unit', role, name: rdef.name, owner: p.id, team: p.team, x, y, r: base.r,
      baseHp: base.hp * (m.hp || 1) * (1 + b.hp), baseDmg: base.dmg * (m.dmg || 1),
      range: base.range * (m.range || 1), cd: base.cd * (m.cd || 1), speed: base.speed * (m.speed || 1), armor: base.armor + (m.armor || 0),
      splash: base.splash || 0, heal: base.heal ? base.heal * (m.heal || 1) : 0, proj: base.proj || null, supply: base.supply,
      level: 1, xp: 0, atkT: Math.random() * 0.5, retargetT: 0, target: null, aura: rdef.aura || null,
      summon: rdef.summon || null, summonT: 3, summons: 0, buffs: [], m: zeroMods(), face: Math.atan2(p.dir.y, p.dir.x), regen: 0, hitT: 0,
      committed: false, walkT: Math.random() * 6,
    };
    if (role === 'flieger') e.fly = true;
    if (G.TRACK) (p.made || (p.made = {}))[role] = (p.made[role] || 0) + 1; // nur für Balance-Tests
    if (rdef.spec) { e.spec = rdef.spec; e.runD = 0; if (e.spec === 'blink') e.blinkT = 2; }
    if (G.hasTalentSpecial(p, 'veteranen')) level = (level || 1) + 1;
    setUnitLevel(e, Math.min(5, level || 1));
    e.hp = e.maxHp;
    fx({ type: 'dust', x, y: y + 6, r: 14, dur: 0.6, seed: Math.random() });
    e.xp = G.UNIT_XP[e.level - 1];
    S.ents.push(e);
    return e;
  }
  G._makeUnit = makeUnit; // für Tests und Vorschauen
  function setUnitLevel(e, lvl) {
    const ratio = e.maxHp ? e.hp / e.maxHp : 1;
    e.level = lvl;
    const mul = 1 + 0.12 * (lvl - 1);
    e.maxHp = e.baseHp * mul;
    e.dmg = e.baseDmg * mul;
    e.hp = e.maxHp * ratio;
  }
  function gainUnitXp(e, xp) {
    if (e.level >= 5) return;
    e.xp += xp;
    while (e.level < 5 && e.xp >= G.UNIT_XP[e.level]) {
      setUnitLevel(e, e.level + 1);
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25);
      S.fx.push({ type: 'text', x: e.x, y: e.y - 20, text: '▲ Stufe ' + e.level, color: '#ffe066', t: 0, dur: 1.2 });
      fx({ type: 'pillar', x: e.x, y: e.y, r: e.r + 6, color: '#ffe066', dur: 0.9 });
    }
  }
  // Beschwörungen & Söldner (keine Versorgung)
  function makeSummon(p, def, x, y, life, scale, summoner, committed) {
    const b = G.bonusOf(p, 'summon');
    const sc = scale || 1;
    const e = {
      id: S.nextId++, kind: 'unit', role: 'summon', name: def.name, owner: p.id, team: p.team, x, y, r: def.r || 10,
      baseHp: def.hp * sc * (1 + b.hp), baseDmg: def.dmg * sc, range: def.range, cd: def.cd, speed: def.speed, armor: def.armor || 0,
      splash: def.splash || 0, heal: 0, proj: def.proj || (def.range > 60 ? 'kugel' : null), supply: 0, summoned: !def.merc,
      level: 1, xp: 0, atkT: 0.3, retargetT: 0, target: null, buffs: [], m: zeroMods(), face: 0, regen: 0, hitT: 0,
      life: life && !def.merc ? life * (1 + (styleOf(p).summonLife || 0)) : life, summoner: summoner || null, merc: !!def.merc, committed: committed === undefined ? !!(summoner && summoner.committed) : committed,
      walkT: 0,
    };
    e.maxHp = e.baseHp; e.hp = e.maxHp; e.dmg = e.baseDmg;
    S.ents.push(e);
    S.fx.push({ type: 'ring', x, y, r: 26, color: p.rd.palette.trim, t: 0, dur: 0.5 });
    return e;
  }

  // -------------------------------------------------------------------------
  // Helden
  function makeHero(p) {
    const d = p.heroDef, hb = G.HERO_BASE;
    const h = {
      id: S.nextId++, kind: 'hero', name: d.name, def: d, owner: p.id, team: p.team,
      x: p.base.x + p.dir.x * 110, y: p.base.y + p.dir.y * 110, r: hb.r, level: 1, xp: 0, items: [],
      range: d.ranged ? hb.rangedRange : hb.range, cd: hb.cd, proj: d.ranged ? 'kugel' : null, splash: 0, heal: 0,
      abilities: d.abilities.map((a) => ({ ...a, t: 4 })), pending: [], manual: false, mode: 'armee', huntCamp: null, order: null, goal: null, hold: null,
      atkT: 0, retargetT: 0, target: null, buffs: [], m: zeroMods(), face: 0, castT: 0, retreat: false, shopping: null, hitT: 0, walkT: 0,
    };
    recalcHero(h);
    h.hp = h.maxHp;
    S.ents.push(h);
    return h;
  }
  function recalcHero(h) {
    const d = h.def, L = h.level, p = S.players[h.owner];
    const it = { hp: 0, dmg: 0, armor: 0, regen: 0, speed: 0, atkspd: 0, cdr: 0 };
    for (const id of h.items) { const x = G.ITEMS[id]; if (!x || x.consumable) continue; for (const k in it) if (x[k]) it[k] += x[k]; }
    const ratio = h.maxHp ? h.hp / h.maxHp : 1;
    const hb = p && p.bonus.hero ? p.bonus.hero : zeroMods();
    h.maxHp = (d.stats.hp * (1 + 0.1 * (L - 1)) + it.hp) * (1 + hb.hp) + (h.avatarHp || 0);
    h.dmg = d.stats.dmg * (1 + 0.09 * (L - 1)) + it.dmg;
    h.armor = d.stats.armor + it.armor + Math.floor(L / 3);
    h.regen = 2 + it.regen + L * 0.3;
    h.speed = G.HERO_BASE.speed * (1 + it.speed);
    h.itemAtkspd = it.atkspd;
    h.cdr = Math.min(0.5, it.cdr);
    h.hp = h.maxHp * ratio;
  }
  G.heroXpNeeded = (lvl) => G.HERO_XP(lvl);
  function gainHeroXp(h, xp) {
    if (h.level >= G.HERO_MAX) return;
    h.xp += xp;
    const p = S.players[h.owner];
    while (h.level < G.HERO_MAX && h.xp >= G.HERO_XP(h.level)) {
      h.level++;
      p.talentPoints++;
      recalcHero(h);
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.3);
      S.fx.push({ type: 'text', x: h.x, y: h.y - 30, text: 'HELD STUFE ' + h.level, color: '#ffd23a', t: 0, dur: 1.8, big: true });
      fx({ type: 'pillar', x: h.x, y: h.y, r: 34, color: '#ffd23a', dur: 1.4, big: true });
      h.pending = h.pending || [];
      if (G.HERO_MASTERY_LVLS.includes(h.level)) h.pending.push('meister');
      if (h.level === G.HERO_ULT_LVL && G.HERO_ULTS[h.def.id] && !h.abilities.some((a) => a.ult)) h.pending.push('ult');
      if (h.level === G.HERO_MAX) { const u = h.abilities.find((a) => a.ult); if (u) { u.rank = (u.rank || 0) + 1; if (p.human) G.msg(`${u.name} ist gemeistert: stärker und schneller wieder bereit.`, 'gold'); } }
      if (p.human) {
        const what = h.level === G.HERO_ULT_LVL ? ' Wähle jetzt die ultimative Fähigkeit!' : G.HERO_MASTERY_LVLS.includes(h.level) ? ' Wähle eine Fähigkeit zum Meistern!' : '';
        G.msg(`${h.name} erreicht Stufe ${h.level}! +1 Talentpunkt.${p.auto.talents ? '' : what}`, 'gold'); G.sfx('level', h.x, h.y, 1, true);
      }
    }
    if (p.auto.talents) { autoTalents(p); autoHeroChoices(p); }
  }
  // Wahl der ultimativen Fähigkeit (Stufe 6) und Meisterung einer Fähigkeit (Stufe 3 und 8)
  G.heroChooseUlt = function (p, i) {
    const h = p.hero, k = h && h.pending ? h.pending.indexOf('ult') : -1, opt = h && (G.HERO_ULTS[h.def.id] || [])[i];
    if (k < 0 || !opt) return false;
    h.pending.splice(k, 1);
    h.abilities.push({ ...opt, ult: true, t: 0 });
    fx({ type: 'pillar', x: h.x, y: h.y, r: 46, color: '#ff9a3a', dur: 1.6, big: true });
    if (p.human) { G.msg(`Ultimative Fähigkeit: ${opt.name} (Taste R)`, 'gold'); G.sfx('level', h.x, h.y, 1, true); }
    return true;
  };
  G.heroMaster = function (p, idx) {
    const h = p.hero, k = h && h.pending ? h.pending.indexOf('meister') : -1, ab = h && h.abilities[idx];
    if (k < 0 || !ab || ab.ult || (ab.rank || 0) >= 2) return false;
    h.pending.splice(k, 1);
    ab.rank = (ab.rank || 0) + 1;
    fx({ type: 'pillar', x: h.x, y: h.y, r: 36, color: '#7ac8ff', dur: 1.2 });
    if (p.human) G.msg(`${ab.name} gemeistert (Rang ${ab.rank}): mehr Wirkung, kürzere Abklingzeit.`, 'gold');
    return true;
  };
  function autoHeroChoices(p) {
    const h = p.hero;
    for (let guard = 4; h && h.pending && h.pending.length && guard--;) {
      if (h.pending[0] === 'ult') G.heroChooseUlt(p, Math.random() < 0.5 ? 0 : 1);
      else {
        const cand = h.abilities.filter((a) => !a.ult && (a.rank || 0) < 2);
        if (!cand.length) { h.pending.shift(); continue; }
        G.heroMaster(p, h.abilities.indexOf(cand[Math.floor(Math.random() * cand.length)]));
      }
    }
  }
  G.autoHeroChoices = autoHeroChoices;
  G.buyCheck = function (p, id) {
    const h = p.hero, it = G.ITEMS[id];
    if (!h || h.dead) return 'Held ist tot';
    if (!S.shops.some((s) => dist(s, h) < 230)) return 'Held muss beim Händler stehen';
    if (h.items.length >= 6) return 'Inventar voll (6 Plätze)';
    if (p.gold < it.price) return 'Nicht genug Gold';
    return null;
  };
  G.buyItem = function (p, id) {
    if (G.buyCheck(p, id)) return false;
    p.gold -= G.ITEMS[id].price;
    p.hero.items.push(id);
    recalcHero(p.hero);
    updateBonusCaches();
    if (p.human) { G.msg(`Gekauft: ${G.ITEMS[id].name}`, 'good'); G.sfx('kauf', p.hero.x, p.hero.y); }
    return true;
  };
  G.sellItem = function (p, idx) {
    const h = p.hero; if (!h || h.dead) return;
    const id = h.items[idx]; if (!id) return;
    if (!S.shops.some((s) => dist(s, h) < 230)) { G.msg('Verkaufen nur beim Händler möglich.', 'bad'); return; }
    h.items.splice(idx, 1);
    p.gold += Math.floor((G.ITEMS[id].price || 300) * 0.5);
    recalcHero(h); updateBonusCaches();
    G.sfx('kauf', h.x, h.y);
  };
  function usePotion(h) {
    const i = h.items.indexOf('trank');
    if (i < 0) return;
    h.items.splice(i, 1);
    h.hp = Math.min(h.maxHp, h.hp + G.ITEMS.trank.heal);
    S.fx.push({ type: 'text', x: h.x, y: h.y - 26, text: '+' + G.ITEMS.trank.heal, color: '#6f6', t: 0, dur: 1 });
    G.sfx('heilung', h.x, h.y);
  }

  function enemiesNear(e, x, y, r, includeBuildings) {
    const out = [];
    G.queryFoes(x, y, r, e.team, (o) => {
      if (o.dead || o.team === e.team) return;
      if (o.kind === 'building' && !includeBuildings) return;
      if (o.kind === 'creep' && e.team !== -1 && !o.camp.active && dist(o, { x, y }) > 120) return;
      out.push(o);
    });
    return out;
  }
  function alliesNear(team, x, y, r) {
    const out = [];
    G.queryTeam(x, y, r, team, (o) => { if (!o.dead && o.kind !== 'building') out.push(o); });
    return out;
  }
  function bestCluster(list, radius) {
    let best = null, bc = 0;
    for (let i = 0; i < Math.min(list.length, 25); i++) {
      const c = list[i];
      let n = 0;
      for (const o of list) if (d2(o.x, o.y, c.x, c.y) <= radius * radius) n += o.kind === 'hero' ? 2 : 1;
      if (n > bc) { bc = n; best = c; }
    }
    return best ? { x: best.x, y: best.y, n: bc } : null;
  }

  function castAbility(h, ab, tx, ty, target) {
    const p = S.players[h.owner];
    const rk = ab.rank || 0, rkMul = 1 + 0.35 * rk; // Meisterung
    const sc = (1 + 0.1 * (h.level - 1)) * rkMul;
    const CAST = 470;
    const scaled = (mods) => { const o = {}; for (const k in mods) o[k] = mods[k] * rkMul; return o; };
    switch (ab.type) {
      case 'meteor': { // verzögerte Einschläge am Zielort
        if (d2(tx, ty, h.x, h.y) > (CAST + 60) ** 2) return false;
        const spread = ab.shells > 1 ? Math.min(110, ab.radius * 1.2) : 0;
        for (let k = 0; k < ab.shells; k++) {
          const x = tx + rand(-spread, spread), y = ty + rand(-spread, spread), delay = ab.meteor ? 1.0 : 0.45 + k * 0.15;
          S.fx.push({ type: 'mark', x, y, r: ab.radius, t: 0, dur: delay, color: ab.color });
          if (ab.meteor) S.fx.push({ type: 'meteor', x, y, t: 0, dur: delay });
          S.timers.push({ t: delay, kind: 'heroStrike', pid: p.id, ab: h.abilities.indexOf(ab), x, y, sc });
        }
        G.sfx('faehigkeit', tx, ty);
        break;
      }
      case 'avatar': { // Verwandlung: mehr LP und Wucht für kurze Zeit
        if (h.avatarT > 0) return false;
        const dur = ab.duration * (1 + 0.15 * rk), mods = scaled(ab.mods), bonus = (mods.hp || 0) * h.maxHp;
        delete mods.hp;
        h.avatarHp = bonus; h.avatarT = dur; h.avatarCol = ab.color || '#ffe066';
        h.maxHp += bonus; h.hp += bonus;
        h.buffs.push({ t: dur, mods });
        fx({ type: 'pillar', x: h.x, y: h.y, r: 44, color: h.avatarCol, dur: 1.2, big: true });
        G.shake(h.x, h.y, 4);
        G.sfx('beschwoerung', h.x, h.y);
        break;
      }
      case 'warcry': { // die ganze Armee des Spielers
        p.buffs.push({ t: ab.duration * (1 + 0.15 * rk), mods: scaled(ab.mods), name: ab.name });
        for (const o of alliesNear(h.team, h.x, h.y, 700)) if (o.owner === p.id && Math.random() < 0.5) S.fx.push({ type: 'spark', x: o.x, y: o.y, t: 0, dur: 0.8, color: '#ffb040' });
        fx({ type: 'rune', x: h.x, y: h.y, r: 150, color: '#ffb040', dur: 1.3 });
        G.sfx('horn', h.x, h.y, 0.8);
        break;
      }
      case 'massheal': {
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) {
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * ab.pct * rkMul);
          if (ab.armor || ab.lifesteal) o.buffs.push({ t: ab.duration || 10, mods: { armor: (ab.armor || 0) * rkMul, lifesteal: (ab.lifesteal || 0) * rkMul } });
          if (Math.random() < 0.6) S.fx.push({ type: 'spark', x: o.x, y: o.y, t: 0, dur: 0.8, color: '#9aff9a' });
        }
        fx({ type: 'heal', x: h.x, y: h.y, r: Math.min(ab.radius, 260), color: '#8aff8a', dur: 1.4, seed: Math.random() });
        fx({ type: 'pillar', x: h.x, y: h.y, r: 40, color: '#c8ffc8', dur: 1.2, big: true });
        G.sfx('heilung', h.x, h.y);
        break;
      }
      case 'drainnova': { // Lebenskraft aller Gegner im Umkreis an den Helden
        const hits = enemiesNear(h, h.x, h.y, ab.radius, false);
        G.query(h.x, h.y, ab.radius, (o) => { if (o.kind === 'creep' && !hits.includes(o)) hits.push(o); });
        let total = 0;
        for (const o of hits) { total += dealDamage(h, o, ab.dmg * sc); S.fx.push({ type: 'spark', x: o.x, y: o.y, t: 0, dur: 0.6, color: '#c060ff' }); }
        h.hp = Math.min(h.maxHp, h.hp + total * 0.5);
        S.fx.push({ type: 'blast', x: h.x, y: h.y, r: ab.radius, color: '#a040ff', t: 0, dur: 0.8 });
        G.sfx('zauber', h.x, h.y);
        break;
      }
      case 'nuke': case 'drain': {
        if (!target || target.dead || dist(h, target) > CAST + target.r) return false;
        S.proj.push({ x: h.x, y: h.y, t: target, src: h, dmg: ab.dmg * sc, stun: ab.stun || 0, drain: ab.type === 'drain', kind: 'zauber', speed: 560, team: h.team, owner: h.owner, color: p.rd.palette.trim, tx: target.x, ty: target.y, z1: target.fly ? G.FLY_ALT : 0 });
        G.sfx('zauber', h.x, h.y);
        break;
      }
      case 'aoe': case 'stun': {
        let x = tx, y = ty;
        if (ab.self) { x = h.x; y = h.y; }
        if (d2(x, y, h.x, h.y) > CAST * CAST) return false;
        const hits = enemiesNear(h, x, y, ab.radius, false);
        G.query(x, y, ab.radius, (o) => { if (o.kind === 'creep' && !hits.includes(o) && o.team !== h.team) hits.push(o); });
        for (const o of hits) { dealDamage(h, o, ab.dmg * sc); if (ab.stun) o.stun = Math.max(o.stun || 0, ab.stun); }
        S.fx.push({ type: 'blast', x, y, r: ab.radius, color: ab.type === 'stun' ? '#9ad8ff' : '#ff9a3a', t: 0, dur: 0.6 });
        G.sfx('explosion', x, y, 0.8);
        break;
      }
      case 'heal': {
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) o.hp = Math.min(o.maxHp, o.hp + ab.amount * sc);
        fx({ type: 'heal', x: h.x, y: h.y, r: ab.radius, color: '#8aff8a', dur: 1.1, seed: Math.random() });
        G.sfx('heilung', h.x, h.y);
        break;
      }
      case 'buff': {
        const mods = { [ab.stat]: ab.value * rkMul, ...(ab.extra || {}) };
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) o.buffs.push({ t: ab.duration, mods });
        fx({ type: 'rune', x: h.x, y: h.y, r: ab.radius * 0.55, color: '#ffe066', dur: 1.2 });
        G.sfx('faehigkeit', h.x, h.y);
        break;
      }
      case 'summon': {
        const far = d2(h.x, h.y, p.base.x, p.base.y) > (G.BASE_RADIUS + 200) ** 2;
        for (let i = 0; i < ab.count + rk; i++) {
          const a = Math.random() * Math.PI * 2;
          makeSummon(p, ab.unit, h.x + Math.cos(a) * 40, h.y + Math.sin(a) * 40, ab.duration, sc, null, far);
        }
        G.sfx('beschwoerung', h.x, h.y);
        fx({ type: 'pillar', x: h.x, y: h.y, r: 44, color: p.rd.palette.trim, dur: 1.0, big: true });
        break;
      }
      default: return false;
    }
    ab.t = ab.cd * (1 - h.cdr) * (1 - 0.15 * rk);
    S.fx.push({ type: 'text', x: h.x, y: h.y - 34, text: ab.name, color: '#fff2b0', t: 0, dur: 1.2 });
    return true;
  }

  function autoCast(h) {
    const p = S.players[h.owner];
    for (const ab of h.abilities) {
      if (ab.t > 0) continue;
      if (!p.human && Math.random() > p.diff.abilityChance) continue;
      const foes = enemiesNear(h, h.x, h.y, 460, false);
      if (ab.type === 'nuke' || ab.type === 'drain') {
        if (!foes.length) continue;
        let t = h.target && !h.target.dead && h.target.kind !== 'building' && dist(h, h.target) < 460 ? h.target : null;
        if (ab.ult) t = foes.reduce((a, b) => (b.kind === 'hero' || b.maxHp > a.maxHp ? b : a)); // Ultimative: auf das dickste Ziel
        else if (!t) t = foes.reduce((a, b) => (b.kind === 'hero' || b.hp < a.hp ? b : a));
        castAbility(h, ab, t.x, t.y, t);
      } else if (ab.type === 'meteor') {
        const c = bestCluster(foes, ab.radius + 30);
        if (c && (c.n >= 4 || (c.n >= 1 && foes.some((o) => o.kind === 'hero' || o.maxHp > 1500)))) castAbility(h, ab, c.x, c.y);
      } else if (ab.type === 'avatar') {
        if (foes.length >= 3 || foes.some((o) => o.kind === 'hero' && dist(o, h) < 320)) castAbility(h, ab);
      } else if (ab.type === 'warcry') {
        if (foes.length >= 4 && alliesNear(h.team, h.x, h.y, 500).length >= 6) castAbility(h, ab);
      } else if (ab.type === 'massheal') {
        let miss = 0;
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) miss += o.maxHp - o.hp;
        if (miss > 1500) castAbility(h, ab);
      } else if (ab.type === 'drainnova') {
        if (foes.filter((o) => dist(o, h) < ab.radius).length >= 3) castAbility(h, ab);
      } else if (ab.type === 'aoe' || ab.type === 'stun') {
        if (ab.self) {
          const n = foes.filter((o) => dist(o, h) < ab.radius).length;
          if (n >= (ab.ult ? 4 : 2) || (n >= 1 && foes.some((o) => o.maxHp > 1000 && dist(o, h) < ab.radius))) castAbility(h, ab, h.x, h.y);
        } else {
          const c = bestCluster(foes, ab.radius);
          if (c && (c.n >= 3 || (c.n >= 1 && foes.some((o) => o.maxHp > 1000)))) castAbility(h, ab, c.x, c.y);
        }
      } else if (ab.type === 'heal') {
        let missing = 0;
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) missing += o.maxHp - o.hp;
        if (missing > ab.amount * 1.2) castAbility(h, ab);
      } else if (ab.type === 'buff') {
        if (foes.length >= 3 && alliesNear(h.team, h.x, h.y, ab.radius).length >= 3) castAbility(h, ab);
      } else if (ab.type === 'summon') {
        if (foes.length >= 1 || enemiesNear(h, h.x, h.y, 300, true).length) castAbility(h, ab);
      }
    }
  }

  // Manuelle Steuerung durch den Spieler
  G.heroCommand = function (p, wx, wy) {
    const h = p.hero; if (!h || h.dead) return;
    let target = null, bd = 30 * 30;
    G.query(wx, wy, 40, (o) => { if (o.dead || o.team === h.team || (p.human && !G.canSee(o))) return; const dd = d2(o.x, o.y, wx, wy) - o.r * o.r; if (dd < bd) { bd = dd; target = o; } });
    if (target) { h.order = { type: 'attack', target }; S.fx.push({ type: 'ring', x: target.x, y: target.y, r: target.r + 6, color: '#ff4040', t: 0, dur: 0.4 }); }
    else { h.order = { type: 'move', x: wx, y: wy }; S.fx.push({ type: 'ring', x: wx, y: wy, r: 12, color: '#60ff60', t: 0, dur: 0.4 }); }
  };
  G.heroCastManual = function (p, idx, wx, wy) {
    const h = p.hero; if (!h || h.dead) return;
    const ab = h.abilities[idx]; if (!ab) return;
    if (ab.t > 0) { G.msg(`${ab.name} lädt noch (${Math.ceil(ab.t)} s)`, 'bad'); return; }
    if (ab.type === 'nuke' || ab.type === 'drain') {
      const foes = enemiesNear(h, wx, wy, 140, true).filter((o) => o.kind !== 'building' && (!p.human || G.canSee(o)));
      G.query(wx, wy, 140, (o) => { if (o.kind === 'creep' && !foes.includes(o) && (!p.human || G.canSee(o))) foes.push(o); });
      const t = foes.sort((a, b) => d2(a.x, a.y, wx, wy) - d2(b.x, b.y, wx, wy))[0];
      const ok = t && castAbility(h, ab, t.x, t.y, t);
      if (!ok) G.msg(t ? 'Ziel zu weit entfernt' : 'Kein Ziel unter dem Mauszeiger', 'bad');
    } else if (!castAbility(h, ab, wx, wy)) G.msg('Zu weit entfernt', 'bad');
  };

  function updateHeroLogic(h, dt) {
    const p = S.players[h.owner];
    for (const ab of h.abilities) if (ab.t > 0) ab.t -= dt;
    if (h.hp < h.maxHp * 0.35) usePotion(h);
    const manual = p.human && h.manual;
    h.castT -= dt;
    if (!manual && h.castT <= 0) { h.castT = 0.4; autoCast(h); }
    if (manual) {
      if (!h.hold) h.hold = { x: h.x, y: h.y };
      if (h.order && h.order.type === 'move') h.hold = { x: h.order.x, y: h.order.y };
      h.goal = h.hold;
      return;
    }
    h.hold = null;
    if (h.hp < h.maxHp * 0.25) h.retreat = true;
    if (h.retreat) {
      if (h.hp > h.maxHp * 0.85) h.retreat = false;
      else { h.order = { type: 'move', x: p.base.x + p.dir.x * 60, y: p.base.y + p.dir.y * 60, auto: true }; return; }
    }
    if (h.order && h.order.auto) h.order = null;
    // Einkaufen beim Händler, wenn gerade Ruhe herrscht
    if (!h.shopping && p.armyState !== 'verteidigen' && !h.target && h.items.length < 6) {
      const want = nextWish(p);
      if (want && p.gold >= G.ITEMS[want].price + (p.human ? 0 : 150)) h.shopping = S.shops.reduce((a, b) => (dist(b, h) < dist(a, h) ? b : a));
    }
    if (h.shopping) {
      if (p.armyState === 'verteidigen') h.shopping = null;
      else if (dist(h, h.shopping) < 150) {
        let w;
        while ((w = nextWish(p)) && !G.buyCheck(p, w)) G.buyItem(p, w);
        if (!h.items.includes('trank') && !G.buyCheck(p, 'trank')) G.buyItem(p, 'trank');
        h.shopping = null;
      } else { h.goal = h.shopping; return; }
    }
    // Verhalten: Armee folgen, Basis verteidigen oder auf eigene Faust Monster jagen
    if (h.mode === 'basis') { h.goal = { x: p.base.x + p.dir.x * 150, y: p.base.y + p.dir.y * 150 }; return; }
    if (h.mode === 'jagen') {
      if (!h.huntCamp || h.huntCamp.left <= 0 || (h.huntCamp.avoidHero || 0) > S.time) h.huntCamp = pickHuntCamp(h);
      if (h.huntCamp) {
        if (h.hp < h.maxHp * 0.4 && h.huntCamp.active) { h.huntCamp.avoidHero = S.time + 60; h.huntCamp = null; h.retreat = true; return; }
        h.goal = { x: h.huntCamp.x, y: h.huntCamp.y }; return;
      }
    }
    const c = p.armyCentroid;
    h.goal = c ? { x: c.x - p.dir.x * 20, y: c.y - p.dir.y * 20 } : p.armyPoint;
  }
  function pickHuntCamp(h) {
    const mine = strength([h]) * (1 + h.level * 0.15);
    let best = null, bd = Infinity;
    for (const c of S.camps) {
      if (c.left <= 0 || (c.avoidHero || 0) > S.time) continue;
      if (strength(c.creeps.filter((e) => !e.dead)) > mine) continue;
      const dd = dist(c, h);
      if (dd < bd) { bd = dd; best = c; }
    }
    return best;
  }
  G.heroRetreat = function (p) {
    const h = p.hero; if (!h || h.dead) return;
    h.target = null; h.shopping = null;
    if (h.manual) h.order = { type: 'move', x: p.base.x + p.dir.x * 60, y: p.base.y + p.dir.y * 60 };
    else h.retreat = true;
    if (p.human) G.msg(`${h.name} zieht sich zur Basis zurück.`, '');
  };
  G.heroPotion = function (p) {
    const h = p.hero; if (!h || h.dead) return;
    if (!h.items.includes('trank')) { G.msg('Kein Heiltrank im Inventar (beim Händler kaufen).', 'bad'); return; }
    usePotion(h);
  };
  G.heroMode = function (p, mode) {
    const h = p.hero;
    h.manual = mode === 'manuell';
    if (!h.manual) h.mode = mode;
    h.order = null; h.hold = null; h.huntCamp = null;
  };
  function nextWish(p) {
    for (const id of G.HERO_WISHLIST) if (!p.hero.items.includes(id)) return id;
    return null;
  }

  // -------------------------------------------------------------------------
  // Raum-Raster für schnelle Nachbarschaftssuche
  const CELL = 120;
  // Ein Raster für alles und zusätzlich eines je Team: Die Zielsuche durchsucht nur gegnerische Teams.
  // Raster sind flache Arrays (Zelle = cx + cy * GW), deren Zellen-Arrays wiederverwendet werden.
  let GW = 0, GH = 0;
  function newGrid() { const g = new Array(GW * GH); for (let i = 0; i < g.length; i++) g[i] = []; return g; }
  function buildGrid() {
    if (!S.gridArr) {
      GW = Math.ceil(S.w / CELL) + 1; GH = Math.ceil(S.h / CELL) + 1;
      S.gridArr = newGrid(); S.teamGrids = new Map();
    }
    for (const a of S.gridArr) a.length = 0;
    for (const g of S.teamGrids.values()) for (const a of g) a.length = 0;
    for (const e of S.ents) {
      if (e.dead) continue;
      const cx = clamp((e.x / CELL) | 0, 0, GW - 1), cy = clamp((e.y / CELL) | 0, 0, GH - 1), k = cx + cy * GW;
      S.gridArr[k].push(e);
      let tg = S.teamGrids.get(e.team); if (!tg) { tg = newGrid(); S.teamGrids.set(e.team, tg); }
      tg[k].push(e);
    }
  }
  function scanGrid(grid, x, y, r, fn) {
    const R = r + 60;
    const x0 = Math.max(0, ((x - R) / CELL) | 0), x1 = Math.min(GW - 1, ((x + R) / CELL) | 0);
    const y0 = Math.max(0, ((y - R) / CELL) | 0), y1 = Math.min(GH - 1, ((y + R) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const a = grid[cx + cy * GW]; if (!a.length) continue;
      for (const e of a) {
        if (e.dead) continue;
        const rr = r + e.r, dx = e.x - x, dy = e.y - y;
        if (dx * dx + dy * dy <= rr * rr) fn(e);
      }
    }
  }
  G.query = (x, y, r, fn) => scanGrid(S.gridArr, x, y, r, fn);
  // nur Einheiten/Gebäude anderer Teams (inkl. neutraler Monster)
  G.queryFoes = function (x, y, r, team, fn) {
    for (const [t, g] of S.teamGrids) if (t !== team) scanGrid(g, x, y, r, fn);
  };
  // nur das eigene Team
  G.queryTeam = function (x, y, r, team, fn) {
    const g = S.teamGrids.get(team);
    if (g) scanGrid(g, x, y, r, fn);
  };

  // -------------------------------------------------------------------------
  // Blut, Leichen, Trümmer
  function bloodOf(e) {
    if (e.kind === 'creep') return G.CREEP_BLOOD[e.ctype] || '#7a0a0a';
    if (e.kind === 'building') return '#6a6460';
    if (e.summoned && /Elementar|Geist|Wichtel|Infernal|Golem|Geschütz/.test(e.name)) return /Wichtel|Infernal/.test(e.name) ? '#ff6a1a' : '#9ab0c8';
    return G.BLOOD[S.players[e.owner].race] || '#8a0a0a';
  }
  function bleed(t, src, amount) {
    if (!G.settings.blood || S.parts.length > 500) return;
    const n = Math.min(6, 1 + Math.floor(amount / 15));
    const col = bloodOf(t);
    const a0 = src ? Math.atan2(t.y - src.y, t.x - src.x) : rand(0, 6.28);
    for (let i = 0; i < n; i++) {
      const a = a0 + rand(-0.8, 0.8), sp = rand(40, 130);
      S.parts.push({ x: t.x, y: t.y, z: rand(4, 12), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(40, 120), col, s: rand(1.2, 2.6) });
    }
  }
  function addDecal(x, y, r, col, kind) {
    if (!G.settings.blood && kind !== 'truemmer') return;
    S.decals.push({ x, y, r, col, kind: kind || 'blut', t: 0, seed: Math.random() * 1000 });
    if (S.decals.length > 260) S.decals.shift();
  }
  function updateGore(dt) {
    for (const q of S.parts) {
      q.vz -= 320 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.z <= 0) { q.dead = true; if (Math.random() < 0.2) addDecal(q.x, q.y, q.s * 1.6, q.col, 'tropfen'); }
    }
    S.parts = S.parts.filter((q) => !q.dead);
    for (const d of S.decals) d.t += dt;
    S.decals = S.decals.filter((d) => d.t < (d.kind === 'truemmer' ? 120 : 60));
    for (const c of S.corpses) c.t += dt;
    S.corpses = S.corpses.filter((c) => c.t < 9);
  }

  // -------------------------------------------------------------------------
  // Kampf
  function dealDamage(src, t, amount, quiet) {
    if (!t || t.dead) return 0;
    const armor = (t.armor || 0) + (t.m ? t.m.armor : 0);
    const mul = armor >= 0 ? 1 - (armor * 0.06) / (1 + armor * 0.06) : 2 - Math.pow(0.94, -armor);
    let dmg = amount * mul;
    if (src && src.spec) {
      if (src.spec === 'siege' && t.kind === 'building') dmg *= 2;
      else if (src.spec === 'flak' && t.fly) dmg *= 1.75;
    }
    if (t.kind !== 'building') t.fightT = S.time;
    if (G.TRACK && src && src.owner >= 0) { const sp = S.players[src.owner], key = src.kind === 'unit' ? src.role : src.kind; (sp.dmgBy || (sp.dmgBy = {}))[key] = (sp.dmgBy[key] || 0) + Math.min(dmg, Math.max(0, t.hp)); } // nur für Balance-Tests
    if (t.kind === 'building') {
      if (S.endphase) dmg *= G.endphaseSiege();
      if (src && src.owner >= 0 && G.hasTalentSpecial(S.players[src.owner], 'siege')) dmg *= 1.3;
    }
    t.hp -= dmg;
    t.hitT = 0.12;
    if (src && t.kind !== 'building') t.hitAng = Math.atan2(t.y - src.y, t.x - src.x);
    if (t.kind !== 'building' && dmg > 2 && !quiet) bleed(t, src, dmg);
    if (src && !src.dead && src.m) {
      const ls = (src.lifesteal || 0) + src.m.lifesteal;
      if (ls > 0) src.hp = Math.min(src.maxHp, src.hp + dmg * ls);
    }
    if (t.kind === 'creep') {
      t.camp.active = true; t.camp.activeT = 8;
      if (src && !src.dead && src.kind !== 'building' && (!t.target || t.target.kind === 'building') && canHit(t, src)) t.target = src;
    }
    if (src && src.owner >= 0) t.lastOwner = src.owner;
    if (t.owner >= 0 && S.players[t.owner].human && t.kind === 'building' && S.time > S.alarmT) {
      S.alarmT = S.time + 20; G.sfx('alarm', t.x, t.y, 1, true); G.msg('Deine Basis wird angegriffen!', 'bad');
    }
    if (t.hp <= 0) killEnt(t, src);
    return dmg;
  }
  G.dealDamage = dealDamage;

  function xpValue(t) {
    if (t.kind === 'creep') return t.def.xp;
    if (t.kind === 'hero') return 80 * t.level;
    if (t.kind === 'building') return t.type === 'mauer' ? 5 : 25 * Math.max(1, t.level);
    return t.summoned ? 8 : 12 + 8 * t.level + (t.supply || 0) * 4;
  }

  function killEnt(t, src, silent) {
    if (t.dead) return;
    t.dead = true;
    if (t.kind === 'building') {
      fx({ type: t.type === 'mauer' ? 'dust' : 'collapse', x: t.x, y: t.y, r: t.r, dur: t.type === 'mauer' ? 0.7 : 1.4, seed: Math.random() });
      if (t.type !== 'mauer') G.shake(t.x, t.y, t.type === 'haupthaus' ? 9 : 4);
      addDecal(t.x, t.y, t.r * 1.2, '#3a3430', 'truemmer');
      G.sfx(t.type === 'mauer' ? 'treffer' : 'einsturz', t.x, t.y);
      if (t.site) t.site.b = null;
      S.navDirty = true;
    } else if (!silent) {
      S.corpses.push({ x: t.x, y: t.y, r: t.r, face: t.face || 0, t: 0, col: t.kind === 'creep' ? t.def.color : S.players[t.owner].rd.color, hero: t.kind === 'hero', kind: t.kind, ctype: t.ctype, owner: t.owner });
      if (S.corpses.length > 90) S.corpses.shift();
      addDecal(t.x, t.y, t.r * 1.5, bloodOf(t), 'lache');
      bleed(t, src, 60);
      G.sfx('tod', t.x, t.y, t.kind === 'hero' || t.r > 16 ? 1 : 0.5);
    } else S.fx.push({ type: 'puff', x: t.x, y: t.y, r: t.r, t: 0, dur: 0.6 });
    const killer = src && src.owner >= 0 ? src.owner : (t.lastOwner !== undefined ? t.lastOwner : -1);
    if (t.kind === 'hero') {
      const p = S.players[t.owner];
      if (t.avatarT > 0) endAvatar(t);
      p.heroRespawn = 12 + 3 * t.level;
      t.order = null; t.target = null; t.shopping = null; t.retreat = false;
      if (p.human) G.msg(`${t.name} ist gefallen! Wiederbelebung in ${Math.round(p.heroRespawn)} s.`, 'bad');
      else if (killer === 0) G.msg(`Gegnerischer Held ${t.name} besiegt!`, 'good');
    }
    if (t.summoner) t.summoner.summons--;
    if (t.kind === 'unit' && t.owner >= 0 && !t.summoned) S.players[t.owner].stats.lost++;
    if (t.kind === 'creep') creepKilled(t, killer);
    if (t.kind === 'building' && t.type !== 'mauer') {
      const p = S.players[t.owner];
      if (t.type === 'haupthaus') eliminate(p);
      else if (p.human) G.msg(`${t.name} wurde zerstört!`, 'bad');
    }
    if (silent || killer < 0) return;
    const kp = S.players[killer];
    if (t.kind !== 'building' && t.owner !== killer) kp.stats.kills++;
    const xp = xpValue(t);
    if (src && !src.dead && src.kind === 'unit' && !src.summoned) gainUnitXp(src, xp);
    const h = kp.hero;
    if (h && !h.dead && dist(h, t) < 800) gainHeroXp(h, xp * (t.kind === 'creep' ? 1 : 0.7));
    const rs = styleOf(kp).raise; // Endlose Horden: Gefallene erheben sich als Skelett
    if (rs && ((t.kind === 'unit' && !t.summoned && !t.fly) || (t.kind === 'creep' && !t.boss && !t.wagon)) && Math.random() < rs.chance) {
      makeSummon(kp, rs.unit, t.x, t.y, rs.life, 1, null, !!(src && src.committed));
      fx({ type: 'pillar', x: t.x, y: t.y, r: 14, color: '#7aff9a', dur: 0.9 });
    }
    if (t.kind === 'creep') {
      kp.gold += t.def.gold;
      S.fx.push({ type: 'text', x: t.x, y: t.y - 14, text: '+' + t.def.gold + ' G', color: '#ffd23a', t: 0, dur: 1 });
    }
  }

  function creepKilled(t, killer) {
    const camp = t.camp;
    if (camp.done) return;
    if (camp.event === 'karawane' && !t.wagon) return; // bei der Karawane zählt nur der Wagen
    camp.left--;
    if (camp.left > 0) return;
    camp.respawnT = G.CAMP_RESPAWN;
    camp.active = false;
    if (camp.event) { // Ereignis entschieden: übrige Wachen fliehen
      camp.done = true;
      for (const o of camp.creeps) if (!o.dead) { o.lastOwner = undefined; killEnt(o, null, true); }
      if (killer >= 0 && !S.players[killer].human) G.msg(`${S.players[killer].name} ${camp.event === 'boss' ? 'hat ' + camp.name + ' erschlagen' : 'hat die Händlerkarawane geplündert'}.`, 'enemy');
    }
    if (killer < 0) return;
    const p = S.players[killer], def = camp.def;
    if (G.TRACK) p.campsCleared = (p.campsCleared || 0) + 1; // nur für Tests
    if (camp.type === 'drache' && S.dragonSlainBy === null) S.dragonSlainBy = p.team;
    p.gold += def.gold; p.wood += def.wood;
    S.fx.push({ type: 'text', x: camp.x, y: camp.y - 30, text: `+${def.gold} Gold  +${def.wood} Holz`, color: '#ffd23a', t: 0, dur: 2, big: true });
    let lootTxt = '';
    if (Math.random() < def.item) {
      const id = def.rareItem || Math.random() < 0.2 ? pick(['drachenzahn', 'krone', 'phoenix']) : pick(G.SHOP_LIST.filter((i) => i !== 'trank'));
      if (p.hero && !p.hero.dead && p.hero.items.length < 6) {
        p.hero.items.push(id); recalcHero(p.hero); updateBonusCaches();
        lootTxt = ` Beute: ${G.ITEMS[id].name}!`;
      } else { p.gold += 200; lootTxt = ' Beute verkauft (+200 Gold).'; }
    }
    if (def.extra === 'soeldner') {
      for (let i = 0; i < 2; i++) makeSummon(p, { name: 'Söldner-Troll', hp: 650, dmg: 30, range: 28, cd: 1.3, speed: 60, armor: 3, r: 14, merc: true }, camp.x + i * 30, camp.y, undefined, 1, null, false);
    } else if (def.extra === 'segen') p.buffs.push({ t: 90, mods: { armor: 3 }, name: 'Steinhaut' });
    else if (def.extra === 'drachenblut') p.buffs.push({ t: 180, mods: { dmg: 0.15 }, name: 'Drachenblut' });
    else if (def.extra === 'siegesbanner') p.buffs.push({ t: 180, mods: { dmg: 0.15, armor: 3 }, name: 'Siegesbanner' });
    const done = camp.event === 'boss' ? `${camp.name} erschlagen!` : camp.event === 'karawane' ? 'Händlerkarawane geplündert!' : `${def.name} gesäubert!`;
    if (p.human) { G.msg(`${done} +${def.gold} Gold, +${def.wood} Holz.${lootTxt}${def.extraDesc ? ' ' + def.extraDesc + '!' : ''}`, 'gold'); G.sfx('kauf', camp.x, camp.y); }
  }

  function eliminate(p) {
    if (!p.alive) return;
    p.alive = false;
    S.navDirty = true;
    for (const e of S.ents) if (e.owner === p.id && !e.dead) { e.dead = true; S.fx.push({ type: e.kind === 'building' ? 'boom' : 'puff', x: e.x, y: e.y, r: e.r, t: 0, dur: 1 }); }
    G.msg(`${p.human ? 'Dein Volk' : p.name} wurde vernichtet!`, p.human ? 'bad' : (S.players[0].team === p.team ? 'bad' : 'good'));
  }

  function endAvatar(h) {
    h.maxHp -= h.avatarHp || 0; h.hp = Math.min(h.hp, h.maxHp);
    h.avatarHp = 0; h.avatarT = 0;
  }
  // Flieger erreichen nur Fernkämpfer, Magier, Türme, Helden und andere Flieger – Nahkämpfer am Boden nicht
  const hitsAir = (e) => e.kind === 'hero' || e.kind === 'building' || !!e.fly || e.range > 60 || !!e.proj;
  const canHit = (e, t) => !t.fly || hitsAir(e);
  G.canHit = canHit; G.hitsAir = hitsAir;
  function validTarget(e, t) {
    if (!t || t.dead) return false;
    if (t.fly && !hitsAir(e)) return false;
    if (e.kind === 'creep') return dist(t, e.home) < 420;
    const leash = e.kind === 'hero' ? 520 : 460;
    return d2(t.x, t.y, e.x, e.y) < leash * leash;
  }
  function findTarget(e) {
    const p = e.owner >= 0 ? S.players[e.owner] : null;
    const er = e.range * (1 + e.m.range);
    let aggro;
    if (e.kind === 'creep') aggro = e.camp.active ? 320 : 170;
    else if (e.kind === 'hero' && p && p.human && e.manual) aggro = er + 80;
    else aggro = Math.max(er + 70, 250);
    const focus = p && !p.human && p.diff.focus, air = hitsAir(e);
    let best = null, bs = Infinity;
    G.queryFoes(e.x, e.y, aggro, e.team, (o) => {
      if (o.team === e.team || o.dead || (o.fly && !air)) return;
      if (e.kind === 'creep') {
        if (o.kind === 'building') return;
        if (dist(o, e.home) > 420) return;
      } else if (o.kind === 'creep') {
        if (!o.camp.active && p.campTarget !== o.camp && !(e.kind === 'hero' && e.huntCamp === o.camp) && d2(o.x, o.y, e.x, e.y) > 90 * 90) return;
      }
      let s = Math.sqrt(d2(o.x, o.y, e.x, e.y)) - o.r;
      if (o.kind === 'building') {
        if (o.type === 'mauer') s += 40;
        else {
          s += 260;
          const op = S.players[o.owner];
          if (op.wallAlive && !o.def.outpost && d2(e.x, e.y, op.base.x, op.base.y) > G.WALL_RADIUS * G.WALL_RADIUS) s += 500;
        }
      }
      if (o.kind === 'hero') s -= 20;
      if (focus && (o.role === 'heiler' || o.role === 'magier')) s -= 70;
      if (s < bs) { bs = s; best = o; }
    });
    return best;
  }
  function findHealTarget(e) {
    let best = null, br = 0.92;
    G.queryTeam(e.x, e.y, e.range + 120, e.team, (o) => {
      if (o.dead || o.kind === 'building' || o === e) return;
      const r = o.hp / o.maxHp;
      if (r < br) { br = r; best = o; }
    });
    return best;
  }

  function moveTo(e, tx, ty, dt, stop) {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d <= (stop || 4) + 0.5) { e.moving = false; return true; }
    const sp = e.speed * Math.max(0.2, 1 + e.m.speed) * dt;
    if (sp <= 0) return false;
    const k = Math.min(sp, d - (stop || 4)) / d;
    e.x += dx * k; e.y += dy * k;
    if (e.spec) e.runD = (e.runD || 0) + k * d; // Anlauf (Sturmangriff)
    e.face = Math.atan2(dy, dx);
    e.moving = true;
    e.walkT = (e.walkT || 0) + sp * 0.18;
    return false;
  }


  // -------------------------------------------------------------------------
  // Wegfindung: Raster (eine Kachel = 40 px) mit zwischengespeicherten Strömungsfeldern.
  // Gebäude und Mauern blockieren nur gegnerische Teams – eigene und verbündete Truppen gehen hindurch.
  // Ist das Ziel unerreichbar (geschlossene Mauer), laufen Einheiten direkt darauf zu und reißen sie ein.
  // Geländehindernisse (Teiche, Lava, Felsen) blockieren alle.
  const NAV = { W: 0, H: 0, bld: null, wall: null, terr: null, cache: new Map() };
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
  function cellAt(x, y) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T);
    return cx < 0 || cy < 0 || cx >= NAV.W || cy >= NAV.H ? -1 : cy * NAV.W + cx;
  }
  const blockedFor = (c, team) => NAV.terr[c] === 1 || (NAV.bld[c] !== -1 && NAV.bld[c] !== team) || (NAV.wall[c] !== -1 && NAV.wall[c] !== team);
  function navRebuild() {
    NAV.W = Math.ceil(S.w / T); NAV.H = Math.ceil(S.h / T);
    const n = NAV.W * NAV.H;
    if (!NAV.bld || NAV.bld.length !== n) { NAV.bld = new Int8Array(n); NAV.wall = new Int8Array(n); }
    NAV.bld.fill(-1); NAV.wall.fill(-1);
    NAV.terr = terrainMask(NAV.W, NAV.H, S.terrain);
    for (const b of S.ents) {
      if (b.dead || b.kind !== 'building') continue;
      if (b.type === 'mauer') { const c = cellAt(b.x, b.y); if (c >= 0) NAV.wall[c] = b.team; continue; }
      for (const c of footprint(b)) NAV.bld[c] = b.team;
    }
    NAV.cache.clear();
    S.navDirty = false;
  }
  function footprint(b) {
    const out = [], x0 = Math.round(b.x / T - b.size / 2), y0 = Math.round(b.y / T - b.size / 2);
    for (let i = 0; i < b.size; i++) for (let j = 0; j < b.size; j++) {
      const cx = x0 + i, cy = y0 + j;
      if (cx >= 0 && cy >= 0 && cx < NAV.W && cy < NAV.H) out.push(cy * NAV.W + cx);
    }
    return out;
  }
  function flowField(team, seeds, key) {
    const k = team + '|' + key;
    let f = NAV.cache.get(k);
    if (f) return f;
    if (NAV.cache.size > 150) NAV.cache.clear();
    const W = NAV.W, H = NAV.H, n = W * H;
    f = new Float32Array(n).fill(Infinity);
    const q = new Int32Array(n);
    let qh = 0, qt = 0;
    for (const c of seeds) if (c >= 0 && f[c] === Infinity) { f[c] = 0; q[qt++] = c; }
    while (qh < qt) {
      const c = q[qh++], cx = c % W, cy = (c / W) | 0, d = f[c];
      for (let i = 0; i < 8; i++) {
        const nx = cx + DX[i], ny = cy + DY[i];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nc = ny * W + nx;
        if (f[nc] !== Infinity || blockedFor(nc, team)) continue;
        if (i >= 4 && (blockedFor(cy * W + nx, team) || blockedFor(ny * W + cx, team))) continue; // keine Ecken schneiden
        f[nc] = d + (i >= 4 ? 1.41 : 1);
        q[qt++] = nc;
      }
    }
    NAV.cache.set(k, f);
    return f;
  }
  function losClear(x0, y0, x1, y1, team) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 18);
    const cEnd = cellAt(x1, y1);
    for (let i = 1; i < n; i++) {
      const t = i / n, c = cellAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      if (c >= 0 && c !== cEnd && blockedFor(c, team)) return false;
    }
    return true;
  }
  function bestNeighbor(c, f, team) {
    const W = NAV.W, cx = c % W, cy = (c / W) | 0;
    let bv = f[c], bc = -1;
    for (let i = 0; i < 8; i++) {
      const nx = cx + DX[i], ny = cy + DY[i];
      if (nx < 0 || ny < 0 || nx >= W || ny >= NAV.H) continue;
      const nc = ny * W + nx;
      if (f[nc] >= bv) continue;
      if (i >= 4 && (blockedFor(cy * W + nx, team) || blockedFor(ny * W + cx, team))) continue;
      bv = f[nc]; bc = nc;
    }
    return bc;
  }
  function navWaypoint(e, tx, ty, tgt) {
    const team = e.team === -1 ? -2 : e.team; // neutrale Monster werden von allen Mauern aufgehalten
    if (d2(e.x, e.y, tx, ty) < 70 * 70 || losClear(e.x, e.y, tx, ty, team)) return null;
    let seeds, key;
    if (tgt && tgt.kind === 'building') { key = 'b' + tgt.id; seeds = footprint(tgt); }
    else { const c = cellAt(tx, ty); key = 'c' + c; seeds = [c]; }
    const f = flowField(team, seeds, key);
    let cur = cellAt(e.x, e.y);
    if (cur < 0) return null;
    let best = null;
    for (let s = 0; s < 5; s++) { // dem Feld folgen und den weitesten noch sichtbaren Punkt nehmen
      const nx = bestNeighbor(cur, f, team);
      if (nx < 0) break;
      cur = nx;
      const px = (cur % NAV.W + 0.5) * T, py = (((cur / NAV.W) | 0) + 0.5) * T;
      if (s === 0 || losClear(e.x, e.y, px, py, team)) best = { x: px, y: py }; else break;
      if (f[cur] === 0) break;
    }
    return best;
  }
  G.navWaypoint = navWaypoint;
  function navMove(e, tx, ty, dt, stop, tgt) {
    if (e.speed <= 0) return false;
    if (e.fly) return moveTo(e, tx, ty, dt, stop); // Flieger: über Gelände und Mauern hinweg
    if (!tgt && S.terrain.length) { // Zielpunkt im Teich, in Lava oder Fels: an den Rand legen
      const g = { x: tx, y: ty };
      for (const f of S.terrain) if (f.block) pushOutOf(g, f, e.r * 0.6 + 3);
      tx = g.x; ty = g.y;
    }
    e.navT = (e.navT || 0) - dt;
    if (e.navT <= 0 || e.navTx === undefined || Math.abs(e.navTx - tx) + Math.abs(e.navTy - ty) > 60) {
      e.navT = 0.25 + Math.random() * 0.1; e.navTx = tx; e.navTy = ty;
      e.navWp = navWaypoint(e, tx, ty, tgt);
    }
    const wp = e.navWp;
    if (!wp) return moveTo(e, tx, ty, dt, stop);
    if (moveTo(e, wp.x, wp.y, dt, 3)) e.navT = 0; // Wegpunkt erreicht: sofort den nächsten bestimmen
    return false;
  }

  const PROJ_SFX = { pfeil: 'pfeil', feuer: 'feuer', kanone: 'kanone', schuss: 'schuss' };
  function shoot(e, t, dmg, p) {
    S.proj.push({ x: e.x, y: e.y, t, src: e, dmg, splash: e.splash || 0, kind: e.proj || 'pfeil', speed: e.proj === 'feuer' ? 380 : e.proj === 'schuss' ? 700 : 440, team: e.team, owner: e.owner,
      color: p ? p.rd.palette.trim : '#ff7a2a', tx: t.x, ty: t.y, z0: e.fly ? G.FLY_ALT : 0, z1: t.fly ? G.FLY_ALT : 0 });
  }
  function attack(e, t) {
    if (e.atkT > 0) return;
    e.atkT = e.cd;
    let dmg = e.dmg * Math.max(0.1, 1 + e.m.dmg);
    e.face = Math.atan2(t.y - e.y, t.x - e.x);
    e.swing = 0.22;
    e.fightT = S.time;
    if (e.spec) {
      if (e.spec === 'charge' && e.runD >= 110 && t.kind !== 'building') { // Sturmangriff nach Anlauf
        dmg *= 2.5; t.stun = Math.max(t.stun || 0, 0.6);
        fx({ type: 'blast', x: t.x, y: t.y, r: 34, color: '#ffe8a0', dur: 0.45 });
        G.shake(t.x, t.y, 2); G.sfx('treffer', t.x, t.y, 0.9);
      }
      if (e.blinkHit) { dmg *= 2.5; e.blinkHit = false; } // Schattensprung: erster Hieb 2,5-fach
      e.runD = 0;
    }
    if (e.proj || e.range > 60) {
      const p = e.owner >= 0 ? S.players[e.owner] : null;
      shoot(e, t, dmg, p);
      if (e.spec === 'multishot') { // Sternenregen: bis zu zwei weitere Ziele
        const rr = e.range * (1 + e.m.range) + 20;
        let n = 0;
        G.queryFoes(t.x, t.y, 170, e.team, (o) => {
          if (n >= 2 || o === t || o.dead || o.kind === 'building' || (o.kind === 'creep' && !o.camp.active) || d2(o.x, o.y, e.x, e.y) > rr * rr) return;
          n++; shoot(e, o, dmg * 0.75, p);
        });
      }
      G.sfx(PROJ_SFX[e.proj || 'pfeil'] || 'zauber', e.x, e.y, e.proj === 'schuss' ? 0.3 : 0.5);
    } else {
      dealDamage(e, t, dmg);
      const fy = e.fly ? G.FLY_ALT * 0.6 : 0;
      fx({ type: 'slash', x: e.x + Math.cos(e.face) * e.r * 0.9, y: e.y + Math.sin(e.face) * e.r * 0.9 - e.r * 0.3 - (t.fly ? G.FLY_ALT : fy), ang: e.face, r: e.r * 1.5 + 6, color: t.kind === 'building' ? '#e8e0d0' : '#ffffff', dur: 0.16 });
      G.sfx(t.kind === 'building' ? 'treffer' : 'schwert', e.x, e.y, 0.55);
    }
  }

  function unitGoal(e) {
    if (e.kind === 'creep') return e.boss ? bossGoal(e) : e.home;
    const p = S.players[e.owner];
    if (e.kind === 'hero') return e.goal || p.armyPoint;
    let ap = (e.committed ? p.attackPoint : p.armyPoint) || p.rally;
    if (e.fly && e.committed && p.attackCentroid) { // Flieger eilen nicht voraus, sie kreisen kurz vor der Spitze des Heeres
      const c = p.attackCentroid, d = Math.hypot(ap.x - c.x, ap.y - c.y);
      if (d > 260) ap = { x: c.x + (ap.x - c.x) * 140 / d, y: c.y + (ap.y - c.y) * 140 / d };
    }
    const slot = e.id % (e.committed ? p.attackSlots || 12 : p.poolSlots || 12);
    const a = slot * 2.399;
    const rr = 14 + 15 * Math.sqrt(slot);
    let x = ap.x + Math.cos(a) * rr, y = ap.y + Math.sin(a) * rr;
    if (!e.committed) {
      if (e.range > 100) { x -= p.dir.x * 55; y -= p.dir.y * 55; }
      if (e.role === 'tank') { x += p.dir.x * 30; y += p.dir.y * 30; }
    }
    const g = { x, y };
    if (!e.fly) for (const f of S.terrain) if (f.block) pushOutOf(g, f, 14); // Formation schmiegt sich um Teiche und Felsen
    return g;
  }

  // Schattensprung: hinter die feindlichen Linien zu Heilern, Magiern und Schützen
  const BACKLINE = { heiler: 1, magier: 1, fernkampf: 1, support: 1, beschwoerer: 1 };
  function blinkStrike(e) {
    e.blinkT = 1;
    if (!e.target || e.target.dead || e.target.kind === 'building') return;
    let best = null, bs = Infinity;
    G.queryFoes(e.x, e.y, 380, e.team, (o) => {
      if (o.dead || o.fly || o.kind === 'building' || (o.kind === 'creep' && !o.camp.active)) return;
      if (!BACKLINE[o.role] && !(o.kind === 'hero' && o.range > 60)) return;
      const sc = o.hp + Math.sqrt(d2(o.x, o.y, e.x, e.y)) * 0.5;
      if (sc < bs) { bs = sc; best = o; }
    });
    if (!best || d2(best.x, best.y, e.x, e.y) < 90 * 90) return;
    const a = Math.atan2(best.y - e.y, best.x - e.x), off = best.r + e.r + 4;
    fx({ type: 'puff', x: e.x, y: e.y, r: 18, dur: 0.6, color: '#7a3aa8' });
    fx({ type: 'blast', x: e.x, y: e.y, r: 26, color: '#9a4ad8', dur: 0.4 });
    e.x = best.x + Math.cos(a) * off; e.y = best.y + Math.sin(a) * off; e.px = e.x; e.py = e.y;
    e.face = a + Math.PI;
    fx({ type: 'blast', x: e.x, y: e.y, r: 30, color: '#9a4ad8', dur: 0.5 });
    e.target = best; e.retargetT = 1.5; e.blinkHit = true; e.blinkT = 8; e.order = null;
    G.sfx('sprung', e.x, e.y, 0.8);
  }

  function updateMobile(e, dt) {
    if (e.life !== undefined && e.life !== null) { e.life -= dt; if (e.life <= 0) { killEnt(e, null, true); return; } }
    if (e.hitT > 0) e.hitT -= dt;
    if (e.avatarT > 0) { e.avatarT -= dt; if (e.avatarT <= 0) endAvatar(e); } // Verwandlung endet
    if (e.swing > 0) e.swing -= dt;
    let regen = (e.regen || 0) + e.m.regen;
    if (e.owner >= 0) {
      const p = S.players[e.owner], rest = styleOf(p).restRegen;
      if (rest && S.time - (e.fightT || 0) > 3) regen += rest; // Elfen: außerhalb des Kampfes schneller heilen
      if (d2(e.x, e.y, p.base.x, p.base.y) < G.BASE_RADIUS * G.BASE_RADIUS) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
    }
    if (regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + regen * dt);
    if (e.spec === 'plague') { // Seuchenwolke: 20 Schaden pro Sekunde an alle Gegner in der Nähe
      e.plagueT = (e.plagueT || 0) - dt;
      if (e.plagueT <= 0) {
        e.plagueT = 0.5;
        G.queryFoes(e.x, e.y, 110, e.team, (o) => { if (!o.dead && o.kind !== 'building' && (o.kind !== 'creep' || o.camp.active)) dealDamage(e, o, 10, true); });
      }
    }
    if (e.stun > 0) { e.stun -= dt; e.moving = false; return; }
    if (e.spec === 'blink' && (e.blinkT -= dt) <= 0) blinkStrike(e);
    e.atkT -= dt * Math.max(0.2, 1 + e.m.atkspd);
    if (e.kind === 'hero') updateHeroLogic(e, dt);

    if (e.summon) {
      const p = S.players[e.owner];
      const max = G.UNIT_BASE.beschwoerer.summonMax + (G.bonusOf(p, 'beschwoerer').summonExtra || 0);
      e.summonT -= dt;
      if (e.summonT <= 0 && e.summons < max && e.target) {
        e.summonT = G.UNIT_BASE.beschwoerer.summonCd;
        e.summons++;
        makeSummon(p, e.summon, e.x + rand(-25, 25), e.y + rand(-25, 25), e.summon.life, 1 + 0.12 * (e.level - 1), e);
        G.sfx('beschwoerung', e.x, e.y, 0.5);
      }
    }

    if (e.scout) { // Späher: läuft seine Route ab und lässt sich auf keinen Kampf ein
      const pt = e.scout.pts[e.scout.i];
      if (!pt) e.scout = null;
      else { e.target = null; if (navMove(e, pt.x, pt.y, dt, 30)) e.scout.i++; return; }
    }

    if (e.kind === 'creep') {
      if (e.roam && roamCreep(e, dt)) return;
      if (e.returning) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15 * dt);
        if (navMove(e, e.home.x, e.home.y, dt, 6)) e.returning = false;
        return;
      }
      if (dist(e, e.home) > 430) { e.returning = true; e.target = null; return; }
      if (!e.target && !e.camp.active) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt);
    }

    if (e.order) {
      if (e.order.type === 'move') {
        e.target = null;
        if (navMove(e, e.order.x, e.order.y, dt, 6)) e.order = null;
        return;
      }
      if (e.order.type === 'attack') {
        if (e.order.target.dead) e.order = null;
        else e.target = e.order.target;
      }
    }
    e.retargetT -= dt;
    if (!e.order && (e.retargetT <= 0 || !validTarget(e, e.target))) {
      e.target = findTarget(e);
      e.retargetT = e.target ? 0.3 + Math.random() * 0.15 : 0.55 + Math.random() * 0.3;
    }

    if (e.heal > 0) {
      e.healT = (e.healT || 0) - dt;
      if (e.healT <= 0 || !e.healTgt || e.healTgt.dead || e.healTgt.hp >= e.healTgt.maxHp) { e.healT = 0.35 + Math.random() * 0.15; e.healTgt = findHealTarget(e); }
      const ht = e.healTgt;
      if (ht) {
        const dd = dist(e, ht) - ht.r - e.r;
        if (dd <= e.range) {
          if (e.atkT <= 0) {
            e.atkT = e.cd; e.swing = 0.22;
            S.proj.push({ x: e.x, y: e.y, t: ht, src: e, heal: e.heal * (1 + 0.12 * (e.level - 1)) * (1 + e.m.heal), kind: 'heilung', speed: 420, team: e.team, owner: e.owner, color: '#7aff7a', tx: ht.x, ty: ht.y, z1: ht.fly ? G.FLY_ALT : 0 });
            gainUnitXp(e, 1.5);
          }
          e.moving = false;
        } else navMove(e, ht.x, ht.y, dt, 0, ht);
        return;
      }
    }

    const t = e.target;
    if (t && t.fly && !hitsAir(e)) e.target = null; // Nahkämpfer erreichen keine Flieger
    else if (t) {
      const range = e.range * (1 + e.m.range);
      const dd = Math.sqrt(d2(e.x, e.y, t.x, t.y)) - t.r - e.r;
      if (dd <= range) { attack(e, t); e.moving = false; }
      else navMove(e, t.x, t.y, dt, 0, t);
    } else {
      const g = unitGoal(e);
      if (g) navMove(e, g.x, g.y, dt, 6);
    }
  }

  function updateProjectiles(dt) {
    for (const pr of S.proj) {
      if (pr.done) continue;
      pr.px = pr.x; pr.py = pr.y;
      if (pr.t && !pr.t.dead) { pr.tx = pr.t.x; pr.ty = pr.t.y; }
      const dx = pr.tx - pr.x, dy = pr.ty - pr.y, d = Math.hypot(dx, dy);
      const step = pr.speed * dt;
      pr.ang = Math.atan2(dy, dx);
      if (pr.d0 === undefined) { pr.d0 = Math.max(1, d); pr.trav = 0; }
      pr.trav += step;
      pr.k = Math.min(1, pr.trav / pr.d0);
      if (d <= step + 4) {
        pr.done = true;
        const tgt = pr.t && !pr.t.dead ? pr.t : null;
        if (pr.heal) {
          if (tgt) { tgt.hp = Math.min(tgt.maxHp, tgt.hp + pr.heal); S.fx.push({ type: 'spark', x: tgt.x, y: tgt.y, t: 0, dur: 0.4, color: '#7aff7a' }); }
          continue;
        }
        if (tgt) {
          dealDamage(pr.src, tgt, pr.dmg);
          fx({ type: 'hit', x: tgt.x, y: tgt.y - tgt.r * 0.4 - (tgt.fly ? G.FLY_ALT : 0), ang: pr.ang, color: pr.kind === 'pfeil' || pr.kind === 'schuss' ? '#fff0c0' : (pr.color || '#ffd080'), dur: 0.25, big: pr.kind === 'zauber' });
          if (pr.stun) tgt.stun = Math.max(tgt.stun || 0, pr.stun);
          if (pr.drain && pr.src && !pr.src.dead) pr.src.hp = Math.min(pr.src.maxHp, pr.src.hp + pr.dmg * 0.6);
        }
        if (pr.splash) {
          G.query(pr.tx, pr.ty, pr.splash, (o) => {
            if (o === tgt || o.dead || o.team === pr.team) return;
            if (o.kind === 'creep' && pr.team !== -1 && !o.camp.active) return;
            dealDamage(pr.src && !pr.src.dead ? pr.src : null, o, pr.dmg * 0.5);
          });
          fx({ type: 'explo', x: pr.tx, y: pr.ty, r: pr.splash, color: pr.kind === 'feuer' ? '#ff6a2a' : '#ffcc66', dur: 0.55, seed: Math.random() });
          G.sfx('explosion', pr.tx, pr.ty, 0.5);
          G.shake(pr.tx, pr.ty, pr.kind === 'kanone' || pr.kind === 'feuer' ? 2.5 : 1.2);
        }
        if (pr.kind === 'zauber') S.fx.push({ type: 'blast', x: pr.tx, y: pr.ty, r: 30, color: pr.color, t: 0, dur: 0.4 });
      } else {
        pr.x += (dx / d) * step; pr.y += (dy / d) * step;
      }
    }
    S.proj = S.proj.filter((p) => !p.done);
  }

  // Kollision: Einheiten untereinander über ein feines Raster (48 px), gegnerische Gebäude über das Team-Raster
  const SEP = 48, MAX_R = 34;
  function separate() {
    const SW = Math.ceil(S.w / SEP) + 1, SH = Math.ceil(S.h / SEP) + 1;
    if (!S.sepGrid) { S.sepGrid = new Array(SW * SH); for (let i = 0; i < S.sepGrid.length; i++) S.sepGrid[i] = []; }
    const sg = S.sepGrid;
    for (const a of sg) a.length = 0;
    const mobs = [], terr = S.terrain.filter((f) => f.block);
    for (const e of S.ents) {
      if (e.dead || e.kind === 'building') continue;
      mobs.push(e);
      sg[clamp((e.x / SEP) | 0, 0, SW - 1) + clamp((e.y / SEP) | 0, 0, SH - 1) * SW].push(e);
    }
    for (const e of mobs) {
      if (e.dead) continue;
      if (!e.fly) for (const f of terr) pushOutOf(e, f, e.r * 0.6); // Teiche, Lava und Felsen umgehen
      // gegnerische Gebäude und Mauern: aus dem Grundriss schieben (eigene sind durchlässig; Flieger ziehen darüber)
      if (!e.fly) G.queryFoes(e.x, e.y, e.r + 26, e.team, (o) => {
        if (o.kind !== 'building') return;
        const hs = o.size * T / 2;
        const dx = e.x - o.x, dy = e.y - o.y;
        const ox = hs + e.r - Math.abs(dx), oy = hs + e.r - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) e.x += (dx >= 0 ? 1 : -1) * ox; else e.y += (dy >= 0 ? 1 : -1) * oy;
        }
      });
      // andere Einheiten: jedes Paar einmal (vom Partner mit der kleineren ID aus)
      const span = Math.ceil((e.r + MAX_R) / SEP);
      const cx0 = (e.x / SEP) | 0, cy0 = (e.y / SEP) | 0;
      for (let cy = Math.max(0, cy0 - span); cy <= Math.min(SH - 1, cy0 + span); cy++) for (let cx = Math.max(0, cx0 - span); cx <= Math.min(SW - 1, cx0 + span); cx++) {
        const a = sg[cx + cy * SW]; if (!a.length) continue;
        for (const o of a) {
          if (o.id <= e.id || o.dead || !o.fly !== !e.fly) continue; // Boden und Luft stören sich nicht
          const dx = o.x - e.x, dy = o.y - e.y;
          const rr = e.r + o.r;
          const dd = dx * dx + dy * dy;
          if (dd >= rr * rr) continue;
          if (dd > 0.0001) {
            const d = Math.sqrt(dd), push = (rr - d) * 0.5;
            const nx = dx / d, ny = dy / d;
            const es = e.speed === 0 ? 0 : 1, os = o.speed === 0 ? 0 : 1;
            e.x -= nx * push * es; e.y -= ny * push * es;
            o.x += nx * push * os; o.y += ny * push * os;
          } else e.x += rand(-1, 1);
        }
      }
      e.x = clamp(e.x, e.r, S.w - e.r); e.y = clamp(e.y, e.r, S.h - e.r);
    }
  }

  // -------------------------------------------------------------------------
  // Modifikatoren pro Tick
  function computeMods() {
    const auraSrc = [], shrine = shrineModsByTeam();
    for (const e of S.ents) {
      if (e.dead || e.kind === 'building') continue;
      const m = e.m;
      for (const k in m) m[k] = 0;
      if (e.owner >= 0) {
        const p = S.players[e.owner];
        const key = e.kind === 'hero' ? 'hero' : e.role === 'summon' ? 'summon' : e.role;
        addBonus(m, p.bonus[key]);
        m.hp = 0;
        for (const b of p.buffs) addBonus(m, b.mods);
        if (shrine[e.team]) addBonus(m, shrine[e.team]);
        if (e.kind === 'hero') m.atkspd += e.itemAtkspd || 0;
        if (e.spec === 'frenzy') { m.atkspd += Math.max(0, 1 - e.hp / e.maxHp); m.lifesteal += 0.1; } // Blutrausch
      }
      for (const b of e.buffs) addBonus(m, b.mods);
      if (e.aura) auraSrc.push(e);
    }
    for (const s of auraSrc) {
      const a = s.aura;
      (a.side === 'ally' ? G.queryTeam : G.queryFoes)(s.x, s.y, 180, s.team, (o) => {
        if (o.dead || o.kind === 'building') return;
        if (o._auraT !== S.tick) { o._auraT = S.tick; o._aura = {}; }
        const key = a.side + a.stat;
        if (o._aura[key] === undefined || Math.abs(a.value) > Math.abs(o._aura[key])) {
          o.m[a.stat] += a.value - (o._aura[key] || 0);
          o._aura[key] = a.value;
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Wirtschaft & Produktion
  function updateEconomy(p, dt) {
    const th = p.th.level;
    const cap = 4 + 2 * th;
    p.workerCap = cap;
    if (p.workers < cap) {
      p.workerT += dt;
      if (p.workerT >= 6 / G.PACE) { if (p.gold >= 40) { p.gold -= 40; p.workers++; } p.workerT = 0; }
    }
    if (p.autoRatio) {
      const ng = Math.max(0, p.reserve.g - p.gold), nw = Math.max(0, p.reserve.w - p.wood);
      let target = 0.65;
      if (ng + nw > 0) target = clamp(ng / (ng + nw * 1.15), 0.3, 0.85);
      else if (p.wood > p.gold * 1.5) target = 0.8;
      else if (p.gold > p.wood * 3) target = 0.45;
      p.goldRatio += (target - p.goldRatio) * Math.min(1, dt * 0.5);
    }
    let mines = 0, saws = 0, posts = 0;
    for (const b of p.blds) {
      if (b.level < 1) continue;
      if (b.type === 'goldmine') mines += b.level;
      if (b.type === 'saegewerk') saws += b.level;
      if (b.type === 'aussenposten') posts += b.level;
    }
    const gw = p.workers * p.goldRatio, ww = p.workers - gw;
    const gp = ((p.rd.passive.eco && p.rd.passive.eco.goldPct) || 0) + (p.teco.goldPct || 0);
    p.incomeG = (th * 1.5 + gw * 1.1 + mines * 1.8 + posts * 3) * (1 + gp) * p.ecoMul * G.PACE;
    p.incomeW = (ww * 1.0 + saws * 1.5 + posts * 1) * (1 + (p.teco.woodPct || 0)) * p.ecoMul * G.PACE;
    for (const sh of S.shrines || []) if (sh.owner === p.team && G.SHRINES[sh.type].gold) p.incomeG += G.SHRINES[sh.type].gold;
    p.gold += p.incomeG * dt;
    p.wood += p.incomeW * dt;

    if (p.researching) {
      const r = p.researching;
      r.t += dt;
      if (r.t >= r.total) {
        p.research[r.line]++;
        p.researching = null;
        updateBonusCaches();
        if (p.human) { G.msg(`Forschung abgeschlossen: ${G.RESEARCH[r.line].name} ${p.research[r.line]}`, 'good'); G.sfx('fertig', p.base.x, p.base.y); }
      }
    }
    if (p.wallUp) { p.wallUp.t += dt * (1 + (p.teco.buildSpeed || 0)); if (p.wallUp.t >= p.wallUp.total) finishWall(p); }
  }

  function unlockedRoles(b) {
    const prod = G.prodOf(S.players[b.owner], b.type);
    if (!prod) return [];
    return Object.keys(prod).filter((r) => b.level >= prod[r]);
  }
  G.unlockedRoles = unlockedRoles;

  // KI: sichtet sie gegnerische Flieger, bildet sie mehr Schützen, Magier und eigene Flieger aus
  const ANTI_AIR = { fernkampf: 1, magier: 0.6, flieger: 1 };
  function chooseRole(p, b, counts, total) {
    const roles = unlockedRoles(b);
    if (!roles.length) return null;
    if (b.queue.length) return b.queue[0];
    if (!b.prodOn) return null;
    if (b.focus !== 'auto') return roles.includes(b.focus) ? b.focus : null;
    if (!p.auto.produce) return null;
    const air = p.human && !p.autopilot ? 0 : Math.min(4, (p.airSeen || 0) / 2);
    const wOf = (r) => (p.comp[r] || 0) + (air && ANTI_AIR[r] ? air * ANTI_AIR[r] : 0);
    let W = 0;
    for (const r of G.ROLES) W += wOf(r);
    if (W <= 0) return null;
    let best = null, bd = -Infinity;
    for (const r of roles) {
      const w = wOf(r);
      if (w <= 0) continue;
      const def = w / W - (total ? counts[r] / total : 0);
      if (def > bd) { bd = def; best = r; }
    }
    return best;
  }

  function updateProduction(p, dt) {
    const counts = {}; let total = 0;
    for (const r of G.ROLES) counts[r] = 0;
    for (const e of S.ents) if (!e.dead && e.owner === p.id && e.kind === 'unit' && counts[e.role] !== undefined) { counts[e.role]++; total++; }
    for (const b of p.blds) if (b.prod) { counts[b.prod.role]++; total++; }
    const minArmy = 6 + 4 * p.th.level, ps = styleOf(p).prodSpeed;
    for (const b of p.blds) {
      if (!G.prodOf(p, b.type) || b.level < 1 || b.upgrading) continue;
      if (b.prod) {
        b.prod.t += dt * (1 + 0.15 * (b.level - 1)) * (1 + (ps ? (ps.all || 0) + (ps[b.type] || 0) : 0));
        if (b.prod.t >= b.prod.total) {
          const ang = Math.atan2(p.rally.y - b.y, p.rally.x - b.x);
          makeUnit(p, b.prod.role, b.x + Math.cos(ang) * (b.r + 14), b.y + Math.sin(ang) * (b.r + 14), 1 + Math.floor((b.level - 1) / 2));
          b.prod = null;
        }
      }
      if (!b.prod) {
        const role = chooseRole(p, b, counts, total);
        if (!role) continue;
        const ub = G.unitBase(p, role), sup = ub.supply;
        if (p.supplyUsed + sup > p.supplyCap) continue;
        const c = G.unitCost(p, role);
        if (!canSpend(p, c, p.armySupply < minArmy || b.queue.length > 0)) continue;
        pay(p, c);
        if (b.queue.length && b.queue[0] === role) b.queue.shift();
        b.prod = { role, t: 0, total: ub.time };
        p.supplyUsed += sup;
        counts[role]++; total++;
      }
    }
  }
  // Einheit rekrutieren: wählt automatisch das passende, am wenigsten beschäftigte Gebäude
  G.recruitCheck = function (p, role) {
    const type = G.producerType(p, role), need = G.prodOf(p, type)[role];
    const list = p.blds.filter((b) => b.type === type);
    if (!list.length) return `Benötigt ${G.bname(p.race, type)}${need > 1 ? ' Stufe ' + need : ''}`;
    const ok = list.filter((b) => b.level >= need);
    if (!ok.length) return `Benötigt ${G.bname(p.race, type)} Stufe ${need}`;
    if (ok.every((b) => b.queue.length >= 5)) return 'Warteschlangen voll';
    return null;
  };
  G.recruit = function (p, role) {
    const why = G.recruitCheck(p, role);
    if (why) { G.msg(why, 'bad'); return false; }
    const type = G.producerType(p, role), need = G.prodOf(p, type)[role];
    const b = p.blds.filter((x) => x.type === type && x.level >= need && x.queue.length < 5)
      .sort((a, c) => (a.queue.length + (a.prod || a.upgrading ? 1 : 0)) - (c.queue.length + (c.prod || c.upgrading ? 1 : 0)))[0];
    b.queue.push(role);
    return true;
  };
  G.queueUnit = function (p, b, role) {
    if (!unlockedRoles(b).includes(role)) return;
    if (b.queue.length >= 5) { G.msg('Warteschlange voll (5)', 'bad'); return; }
    b.queue.push(role);
  };

  function updateSupply(p) {
    let cap = p.th.level * G.SUPPLY.perTH;
    const house = G.SUPPLY.perHouseLevel * (1 + (styleOf(p).houseSupply || 0));
    for (const b of p.blds) if (b.type === 'unterkunft' && b.level >= 1) cap += Math.round(b.level * house);
    p.supplyCap = Math.min(G.SUPPLY.max, cap);
    let used = 0, army = 0;
    for (const e of S.ents) if (!e.dead && e.owner === p.id && e.kind === 'unit') { used += e.supply || 0; army += e.supply || (e.merc ? 2 : 0); }
    for (const b of p.blds) if (b.prod) used += G.unitBase(p, b.prod.role).supply;
    p.supplyUsed = used;
    p.armySupply = army;
  }

  // -------------------------------------------------------------------------
  // KI: Basisbau (auch Autopilot für den Spieler)
  // Bauliste je Volk (Spielstil): je Haupthaus-Stufe die Gebäude in der Reihenfolge des Volkes,
  // 'TH' = Haupthaus ausbauen, 'MAUER' = fällige Mauerstufe
  function buildGoals(order, extra) {
    const g = [];
    for (let t = 1; t <= 5; t++) {
      for (const type of order) {
        if (type === 'TH') { if (t < 5) g.push({ type: 'haupthaus', n: 1, level: t + 1 }); continue; }
        if (type === 'MAUER') { G.WALLS.forEach((w, k) => { if (w.th === t) g.push({ type: 'mauer', level: k + 1 }); }); continue; }
        if (!G.LIMITS[type]) continue;
        const base = G.LIMITS[type][t - 1], lim = base > 0 && extra && extra[type] ? base + extra[type] : base;
        for (let n = 1; n <= lim; n++) g.push({ type, n, level: t });
      }
    }
    return g;
  }
  G.GOALS = buildGoals(G.DEFAULT_ORDER);
  const goalCache = {};
  function goalsFor(p) {
    const st = styleOf(p);
    return goalCache[p.race] || (goalCache[p.race] = buildGoals(st.order || G.DEFAULT_ORDER, st.extraLimit));
  }

  function findSpot(p, type) {
    if (G.BUILDINGS[type].outpost) {
      let best = null, bd = Infinity;
      const foes = S.players.filter((o) => o.alive && o.team !== p.team);
      for (const s of S.sites) {
        if (s.b && !s.b.dead) continue;
        const own = dist(s, p.base);
        const foe = foes.length ? Math.min(...foes.map((o) => dist(s, o.base))) : Infinity;
        if (own > foe * 1.05) continue;
        if (own < bd && G.canPlace(p, type, s.x, s.y)) { bd = own; best = s; }
      }
      return best ? { x: best.x, y: best.y } : null;
    }
    const defense = type === 'turm' || type === 'kanone';
    const R = Math.ceil(G.BASE_RADIUS / T);
    for (const gap of [T * 0.5, 0]) {
      let best = null, bs = Infinity;
      for (let ix = -R; ix <= R; ix++) for (let iy = -R; iy <= R; iy++) {
        const pos = G.snap(type, p.base.x + ix * T, p.base.y + iy * T);
        if (!G.canPlace(p, type, pos.x, pos.y, gap)) continue;
        const dx = pos.x - p.base.x, dy = pos.y - p.base.y;
        const d = Math.hypot(dx, dy);
        const front = (dx * p.dir.x + dy * p.dir.y) / (d || 1);
        const s = defense ? Math.abs(d - (G.BASE_RADIUS - 70)) * 0.6 - front * 160 + Math.random() * 30 : d - front * 25 + Math.random() * 12;
        if (s < bs) { bs = s; best = pos; }
      }
      if (best) return best;
    }
    return null;
  }
  G.findSpot = findSpot;

  function planBuild(p) {
    p.reserve = { g: 0, w: 0 };
    const th = p.th.level;
    if (G.buildersBusy(p) < G.builders(p)) {
      for (const goal of goalsFor(p)) {
        if (goal.type === 'haupthaus') {
          if (th >= goal.level) continue;
          if (p.th.upgrading) continue;
          const c = G.costOf('haupthaus', th + 1, p);
          if (G.canAfford(p, c)) { G.upgradeBuilding(p, p.th); return; }
          p.reserve = c; break;
        }
        if (goal.type === 'mauer') {
          if (p.wallLevel >= goal.level || p.wallUp) continue;
          const w = G.WALLS[goal.level - 1];
          if (th < w.th) break;
          if (G.canAfford(p, w.cost)) { G.upgradeWall(p); return; }
          p.reserve = w.cost; break;
        }
        if (goal.level > th) break;
        const list = p.blds.filter((b) => b.type === goal.type);
        const ok = list.filter((b) => (b.upgrading ? b.upgrading.to : b.level) >= goal.level).length;
        if (ok >= goal.n) continue;
        if (list.length < goal.n) {
          if (list.length >= G.maxCount(p, goal.type)) continue;
          const pos = findSpot(p, goal.type);
          if (!pos) continue;
          const c = G.costOf(goal.type, 1, p);
          if (G.canAfford(p, c)) { G.placeBuilding(p, goal.type, pos.x, pos.y, 0); return; }
          p.reserve = c; break;
        } else {
          const cand = list.filter((b) => !b.upgrading && b.level < goal.level && b.level < th && b.level >= 1).sort((a, b) => a.level - b.level)[0];
          if (!cand) continue;
          const c = G.costOf(goal.type, cand.level + 1, p);
          if (G.canAfford(p, c)) { G.upgradeBuilding(p, cand); return; }
          p.reserve = c; break;
        }
      }
    }
    if (!p.researching) {
      const lines = Object.keys(G.RESEARCH).sort((a, b) => p.research[a] - p.research[b]);
      for (const l of lines) {
        if (G.researchCheck(p, l)) continue;
        if (canSpend(p, G.researchCost(p.research[l] + 1), false)) { G.startResearch(p, l); break; }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Armeeführung: Sammeln & Angreifen / Wellen / Nur verteidigen.
  // Losgeschickte Einheiten ("committed") kämpfen, bis sie fallen oder das Spiel endet.
  function findThreat(p) {
    let sx = 0, sy = 0, n = 0;
    G.queryFoes(p.base.x, p.base.y, G.BASE_RADIUS + 220, p.team, (o) => {
      if (o.dead || o.kind === 'building' || o.kind === 'creep') return;
      sx += o.x; sy += o.y; n++;
    });
    return n ? { x: sx / n, y: sy / n, n } : null;
  }
  function strength(list) {
    let hp = 0, dps = 0;
    for (const e of list) { hp += e.hp; dps += ((e.dmg || 0) / (e.cd || 1)) * (1 + (e.splash || 0) / 35) + (e.heal ? e.heal / e.cd : 0); }
    return hp * dps;
  }
  function chooseTarget(p) {
    const foes = S.players.filter((o) => o.alive && o.team !== p.team);
    if (!foes.length) return null;
    if (p.targetMode !== 'auto') { const t = S.players[p.targetMode]; if (t && t.alive && t.team !== p.team) return t; }
    const ally = S.players.find((o) => o !== p && o.alive && o.team === p.team && o.targetPlayer && o.targetPlayer.alive);
    if (ally && !p.human) return ally.targetPlayer;
    if (!p.human && p.diff.focus) {
      // im Nebel nur, was die Späher berichtet haben: zuletzt gesehene Armeestärke statt Haupthaus-LP
      const fog = S.fog.on, I = fog ? intelOf(p.team) : null;
      const score = (o) => (fog ? ((I.army[o.id] && I.army[o.id].s) || 0) * 40 : o.th.hp + o.armySupply * 40) + dist(o.base, p.base) * 0.3;
      return foes.reduce((a, b) => (score(b) < score(a) ? b : a));
    }
    return foes.reduce((a, b) => (dist(b.base, p.base) < dist(a.base, p.base) ? b : a));
  }
  function attackPoint(p, from) {
    if (p.manualPoint) return p.manualPoint;
    p.targetPlayer = chooseTarget(p);
    const tp = p.targetPlayer;
    if (!tp) return null;
    const I = !p.human && S.fog.on ? intelOf(p.team) : null; // KI im Nebel: nur gesehene Gebäude, sonst die bekannte Startposition
    let best = null, bd = Infinity;
    for (const b of tp.blds) { if (b.dead || (I && !I.blds[b.id])) continue; const dd = d2(b.x, b.y, from.x, from.y); if (dd < bd) { bd = dd; best = b; } }
    return best ? { x: best.x, y: best.y } : { x: tp.base.x, y: tp.base.y };
  }

  // -------------------------------------------------------------------------
  // Aufklärung: Mit Nebel des Krieges kennt die KI nur, was ihr Team gesehen hat (gegnerische Gebäude,
  // zuletzt gesehene Armeestärke), und schickt dafür regelmäßig Späher los. Ohne Nebel sieht sie – wie du – alles.
  const INTEL_R = 330;
  function intelOf(team) { const I = S.intel || (S.intel = {}); return I[team] || (I[team] = { blds: {}, army: {} }); }
  function teamSees(team, x, y) { let seen = false; G.queryTeam(x, y, INTEL_R, team, () => { seen = true; }); return seen; }
  function updateIntel() {
    const me = human(), teams = [...new Set(S.players.filter((p) => p.alive && !p.human).map((p) => p.team))];
    const seen = {};
    for (const e of S.ents) {
      if (e.dead || e.owner < 0) continue;
      if (e.scout && !e.scoutSeen && e.team !== me.team && G.canSee(e)) { e.scoutSeen = true; G.msg(`Ein Späher der ${S.players[e.owner].rd.name} erkundet die Gegend!`, 'enemy'); }
      for (const t of teams) {
        if (t === e.team) continue;
        if (e.kind === 'building') { const I = intelOf(t); if (!I.blds[e.id] && teamSees(t, e.x, e.y)) I.blds[e.id] = 1; }
        else if (e.kind === 'unit' && teamSees(t, e.x, e.y)) { const k = t + ':' + e.owner; seen[k] = (seen[k] || 0) + (e.supply || 1); }
      }
    }
    for (const k in seen) {
      const [t, o] = k.split(':'), I = intelOf(+t), old = I.army[o];
      I.army[o] = { s: Math.max(seen[k], old && S.time - old.t < 60 ? old.s : 0), t: S.time };
    }
  }
  function sendScout(p) {
    const foes = S.players.filter((o) => o.alive && o.team !== p.team).sort((a, b) => dist(a.base, p.base) - dist(b.base, p.base));
    const cand = S.ents.filter((e) => !e.dead && e.owner === p.id && e.kind === 'unit' && !e.committed && !e.scout && !e.summoned && e.speed > 0);
    if (!foes.length || !cand.length) return;
    const u = cand.reduce((a, b) => (b.speed > a.speed ? b : a)); // der Schnellste
    const pts = [], R = G.BASE_RADIUS + 230;
    for (const o of foes) { // vor der gegnerischen Mauer entlang, dann zurück
      const a = Math.atan2(p.base.y - o.base.y, p.base.x - o.base.x);
      for (const da of [-0.7, 0.7]) pts.push({ x: clamp(o.base.x + Math.cos(a + da) * R, 60, S.w - 60), y: clamp(o.base.y + Math.sin(a + da) * R, 60, S.h - 60) });
    }
    pts.push({ x: p.rally.x, y: p.rally.y });
    u.scout = { pts, i: 0 };
  }
  function chooseCamp(p, units, ignorePower) {
    const mine = units.slice();
    if (p.hero && !p.hero.dead) mine.push(p.hero);
    const st = strength(mine);
    let best = null, bd = Infinity;
    for (const c of S.camps) {
      if (c.left <= 0) continue;
      if (!ignorePower && (p.th.level < c.def.minTH || (c.avoid && c.avoid[p.id] > S.time))) continue;
      const cs = strength(c.creeps.filter((e) => !e.dead));
      if (!ignorePower && cs * 2.6 > st) continue;
      const dd = dist(c, p.base);
      if (dd < bd) { bd = dd; best = c; }
    }
    return best;
  }
  function centroid(list) {
    if (!list.length) return null;
    let sx = 0, sy = 0;
    for (const u of list) { sx += u.x; sy += u.y; }
    return { x: sx / list.length, y: sy / list.length };
  }
  G.launchNow = function (p, silent) {
    let n = 0;
    for (const e of S.ents) if (!e.dead && e.kind === 'unit' && e.owner === p.id && !e.committed) { e.committed = true; n++; }
    if (!n) return 0;
    p.campTarget = null;
    p.attackPoint = attackPoint(p, p.poolCentroid || p.rally);
    if (!silent) {
      if (p.human) { G.msg(`${n} Einheiten ziehen in den Kampf${p.targetPlayer && !p.manualPoint ? ' gegen ' + p.targetPlayer.name : ''}!`, 'gold'); G.sfx('horn', p.base.x, p.base.y, 1, true); }
      else if (p.targetPlayer && p.targetPlayer.human) G.msg(`${p.name} schickt ${n} Einheiten gegen dich!`, 'bad');
    }
    return n;
  };
  function armyThink(p) {
    if (!p.human || p.autopilot) { // gegnerische Flieger in Sicht? Dann mehr Luftabwehr ausbilden
      let n = 0;
      for (const o of S.ents) if (o.fly && !o.dead && o.team !== p.team && (!S.fog.on || teamSees(p.team, o.x, o.y))) n++;
      p.airSeen = Math.max(n, (p.airSeen || 0) * 0.97);
    }
    const units = S.ents.filter((e) => !e.dead && e.kind === 'unit' && e.owner === p.id);
    const pool = units.filter((u) => !u.committed), com = units.filter((u) => u.committed);
    p.poolCentroid = centroid(pool);
    p.attackCentroid = centroid(com);
    p.armyCentroid = p.attackCentroid || p.poolCentroid;
    p.committedCount = com.length;
    let poolSup = 0;
    for (const u of pool) poolSup += u.supply || (u.merc ? 2 : 0);
    p.poolSupply = poolSup;
    p.poolSlots = Math.max(12, Math.round(pool.length * 1.3));
    p.attackSlots = Math.max(12, Math.round(com.length * 1.3));
    if (com.length || p.manualPoint) p.attackPoint = attackPoint(p, p.attackCentroid || p.rally);

    const threat = findThreat(p);
    const style = S.endphase ? 'wellen' : p.armyStyle;
    const timeOk = S.time >= p.minAttack || S.endphase;
    if (style === 'sammeln' && !threat && timeOk) {
      const threshold = Math.max(8, p.supplyCap * p.attackFrac);
      if (poolSup >= threshold) G.launchNow(p);
    } else if (style === 'wellen') {
      const iv = S.endphase ? Math.min(10, p.waveInterval) : p.waveInterval;
      p.waveT = Math.min(p.waveT - 1, iv);
      if (p.waveT <= 0) {
        if (!threat && timeOk && pool.length) { G.launchNow(p, pool.length < 3); p.waveT = iv; }
        else p.waveT = 2;
      }
    }
    // Truppen, die noch nicht losgeschickt wurden
    if (threat) { p.armyState = 'verteidigen'; p.armyPoint = threat; p.campTarget = null; return; }
    if (p.armyState === 'camps' && p.campTarget && p.campTarget.left > 0 && !S.endphase) {
      if (poolSup < p.campStart * 0.45) {
        p.campTarget.avoid = p.campTarget.avoid || {};
        p.campTarget.avoid[p.id] = S.time + 120;
        if (p.human) G.msg(`Rückzug vom ${p.campTarget.name} – zu stark!`, 'bad');
      } else { p.armyPoint = { x: p.campTarget.x, y: p.campTarget.y }; return; }
    }
    p.campTarget = null;
    if (S.shrines.length && p.shrinesAllowed !== false && style !== 'verteidigen' && !S.endphase && pool.length >= 4) {
      const sh = chooseShrine(p, pool);
      if (sh) { p.armyState = 'schrein'; p.armyPoint = { x: sh.x, y: sh.y }; return; }
    }
    if (style === 'sammeln' && p.campsAllowed && !S.endphase && pool.length >= 3) {
      const c = chooseCamp(p, pool);
      if (c) { p.armyState = 'camps'; p.campTarget = c; p.campStart = poolSup; p.armyPoint = { x: c.x, y: c.y }; return; }
    }
    p.armyState = 'sammeln'; p.armyPoint = p.rally;
  }

  // -------------------------------------------------------------------------
  // Volksfähigkeiten (3 je Volk)
  function enemyClusterNearArmy(p) {
    const own = S.ents.filter((e) => !e.dead && e.owner === p.id && e.kind !== 'building');
    const foes = new Set();
    for (let i = 0; i < own.length; i += Math.max(1, Math.floor(own.length / 12))) {
      G.query(own[i].x, own[i].y, 450, (o) => { if (!o.dead && o.team !== p.team && o.kind !== 'building' && (o.kind !== 'creep' || o.camp.active)) foes.add(o); });
    }
    G.query(p.base.x, p.base.y, G.BASE_RADIUS + 200, (o) => { if (!o.dead && o.team !== p.team && o.kind !== 'building' && o.kind !== 'creep') foes.add(o); });
    return bestCluster([...foes], 130);
  }
  G.raceAbilityCheck = function (p, i) {
    const ab = p.rd.abilities[i];
    if (!ab) return 'Unbekannt';
    if (!p.alive) return 'Besiegt';
    if (p.th.level < ab.th) return `ab Haupthaus St. ${ab.th}`;
    if (p.abCd[i] > 0) return `Lädt (${Math.ceil(p.abCd[i])} s)`;
    return null;
  };
  G.castRaceAbility = function (p, i) {
    i = i || 0;
    if (G.raceAbilityCheck(p, i)) return false;
    const ab = p.rd.abilities[i];
    const own = S.ents.filter((e) => !e.dead && e.owner === p.id && e.kind !== 'building');
    const front = p.attackCentroid || p.armyCentroid || p.rally;
    const fail = (m) => { if (p.human) G.msg(m, 'bad'); return false; };
    let at = front;
    switch (ab.type) {
      case 'buff':
        p.buffs.push({ t: ab.dur, mods: ab.mods, name: ab.name });
        if (ab.hpCost) for (const e of own) e.hp = Math.max(1, e.hp - e.maxHp * ab.hpCost);
        for (const e of own) if (Math.random() < 0.5) S.fx.push({ type: 'spark', x: e.x, y: e.y, t: 0, dur: 0.8, color: '#ffe066' });
        break;
      case 'heal':
        for (const e of own) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ab.pct); S.fx.push({ type: 'spark', x: e.x, y: e.y, t: 0, dur: 0.8, color: '#c8f0ff' }); }
        break;
      case 'summon': {
        const c = ab.at === 'cluster' ? enemyClusterNearArmy(p) : null;
        at = c || front;
        const commit = !!c || !!p.attackCentroid;
        for (let k = 0; k < ab.count; k++) makeSummon(p, ab.unit, at.x + rand(-50, 50), at.y + rand(-50, 50), ab.life, 1, null, commit);
        S.fx.push({ type: 'blast', x: at.x, y: at.y, r: 90, color: p.rd.palette.trim, t: 0, dur: 0.8 });
        break;
      }
      case 'strike': case 'curse': {
        const c = enemyClusterNearArmy(p);
        if (!c) return fail('Keine Gegner in Reichweite deiner Armee oder Basis.');
        at = c;
        if (ab.type === 'curse') {
          G.query(c.x, c.y, ab.radius, (o) => { if (!o.dead && o.team !== p.team && o.kind !== 'building') { dealDamage(p.th, o, ab.dmg); o.buffs.push({ t: ab.dur, mods: ab.mods }); } });
          S.fx.push({ type: 'blast', x: c.x, y: c.y, r: ab.radius, color: ab.color, t: 0, dur: 1.2 });
          break;
        }
        const spread = ab.shells > 1 ? 85 : 0;
        for (let k = 0; k < ab.shells; k++) {
          const x = c.x + rand(-spread, spread), y = c.y + rand(-spread, spread);
          const delay = ab.meteor ? 1.0 : 0.5 + k * 0.18;
          S.fx.push({ type: 'mark', x, y, r: ab.radius, t: 0, dur: delay, color: ab.color });
          if (ab.meteor) S.fx.push({ type: 'meteor', x, y, t: 0, dur: delay });
          S.timers.push({ t: delay, kind: 'strike', pid: p.id, ab: i, x, y }); // als Daten, damit Spielstände sie enthalten
        }
        break;
      }
      case 'fortify':
        for (const b of p.blds.concat(p.walls)) if (!b.dead) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * ab.heal); S.fx.push({ type: 'spark', x: b.x, y: b.y, t: 0, dur: 0.8, color: '#ffd23a' }); }
        p.buffs.push({ t: ab.dur, mods: ab.mods, name: ab.name });
        at = p.base;
        break;
    }
    p.abCd[i] = ab.cd * (1 - (p.teco.abilityCdr || 0));
    p.raceCasts = (p.raceCasts || 0) + 1;
    G.sfx('faehigkeit', at.x, at.y, 1, p.human);
    if (p.human) G.msg(`${ab.name}!`, 'gold');
    else S.fx.push({ type: 'text', x: at.x, y: at.y - 40, text: ab.name, color: '#ff8080', t: 0, dur: 1.6, big: true });
    return true;
  };
  // Einschlag einer ultimativen Heldenfähigkeit (Meteor, Runensturm …)
  function heroStrike(p, tm) {
    const h = p.hero, ab = h && h.abilities[tm.ab];
    if (!p.alive || !ab) return;
    const x = tm.x, y = tm.y, src = h.dead ? p.th : h, big = !!ab.meteor || ab.radius > 150;
    S.fx.push({ type: big ? 'boom' : 'blast', x, y, r: ab.radius, color: ab.color, t: 0, dur: 0.6 });
    fx({ type: 'explo', x, y, r: ab.radius, color: ab.color, dur: 0.7, seed: Math.random(), big });
    G.sfx('explosion', x, y, ab.shells > 1 ? 0.55 : 1);
    G.shake(x, y, big ? 9 : 3);
    G.query(x, y, ab.radius, (o) => {
      if (o.dead || o.team === p.team) return;
      dealDamage(src, o, ab.dmg * tm.sc);
      if (ab.stun) o.stun = Math.max(o.stun || 0, ab.stun);
      if (ab.debuff && o.kind !== 'building') o.buffs.push({ t: ab.debuffDur || 10, mods: ab.debuff });
    });
  }
  // Einschlag einer verzögerten Volksfähigkeit (Bombardement, Meteor …)
  function strikeHit(p, ab, x, y) {
    if (!p.alive || !ab) return;
    S.fx.push({ type: ab.meteor ? 'boom' : 'blast', x, y, r: ab.radius, color: ab.color, t: 0, dur: 0.6 });
    G.sfx('explosion', x, y, ab.shells > 1 ? 0.6 : 1);
    fx({ type: 'explo', x, y, r: ab.radius, color: ab.color, dur: 0.7, seed: Math.random(), big: !!ab.meteor });
    G.shake(x, y, ab.meteor ? 10 : ab.shells > 1 ? 2.5 : 6);
    G.query(x, y, ab.radius, (o) => { if (!o.dead && o.team !== p.team) { dealDamage(p.th, o, ab.dmg); if (ab.stun) o.stun = Math.max(o.stun || 0, ab.stun); } });
    if (ab.summon) makeSummon(p, ab.summon, x, y, ab.life, 1, null, true);
  }
  function abilityThink(p) {
    const own = S.ents.filter((e) => !e.dead && e.owner === p.id && (e.kind === 'unit' || e.kind === 'hero'));
    const fighting = own.filter((e) => e.target && e.target.kind !== 'building' && !e.target.dead).length;
    p.rd.abilities.forEach((ab, i) => {
      if (G.raceAbilityCheck(p, i)) return;
      if (!p.human && Math.random() > p.diff.abilityChance) return;
      if (ab.type === 'heal') {
        let miss = 0, max = 0;
        for (const e of own) { miss += e.maxHp - e.hp; max += e.maxHp; }
        if (max && miss / max > 0.3 && fighting >= 3) G.castRaceAbility(p, i);
      } else if (ab.type === 'fortify') {
        let miss = 0, max = 0;
        for (const b of p.blds) { miss += b.maxHp - b.hp; max += b.maxHp; }
        if (findThreat(p) || miss / max > 0.25) G.castRaceAbility(p, i);
      } else if (own.length >= 4 && fighting >= Math.min(6, Math.max(3, own.length * 0.4))) G.castRaceAbility(p, i);
    });
  }

  // -------------------------------------------------------------------------
  // Nebel des Krieges: Sicht des Spieler-Teams (inkl. Verbündeter) auf einem 40-px-Raster. Erkundete Felder bleiben
  // abgedunkelt sichtbar, gegnerische Gebäude erscheinen dort so, wie sie zuletzt gesehen wurden. Die KI sieht alles.
  const FOG = 40, VIS_MIN = 80;
  function fogInit(on) {
    const FW = Math.ceil(S.w / FOG), FH = Math.ceil(S.h / FOG), n = FW * FH;
    S.fog = { on, FW, FH, cell: FOG, vis: new Uint8Array(n), exp: new Uint8Array(n), ghosts: new Map(), t: 0, n: 0 };
  }
  function sightOf(e) {
    if (e.kind === 'hero') return 480;
    if (e.kind !== 'building') return e.range > 100 ? 360 : 300;
    if (e.type === 'haupthaus') return 480;
    const atk = e.def.attack;
    return atk ? atk.range + 100 : 200 + e.size * 20;
  }
  const stamps = new Map();
  function stampOf(rad) { // Sichtkreis mit weichem Rand über gut zwei Felder: dx, dy, Wert (0…255) je Feld
    let st = stamps.get(rad);
    if (st) return st;
    const rc = rad / FOG, n = Math.ceil(rc + 1), out = [];
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
      const v = clamp((rc + 1 - Math.hypot(dx, dy)) / 2.4, 0, 1);
      if (v > 0) out.push(dx, dy, Math.round(v * 255));
    }
    st = new Int16Array(out);
    stamps.set(rad, st);
    return st;
  }
  const fogCell = (x, y) => clamp((y / FOG) | 0, 0, S.fog.FH - 1) * S.fog.FW + clamp((x / FOG) | 0, 0, S.fog.FW - 1);
  function fogReveal(x, y, rad) { // Gebiet als erkundet markieren
    const F = S.fog, st = stampOf(rad), c0 = fogCell(x, y), cx = c0 % F.FW, cy = (c0 / F.FW) | 0;
    for (let i = 0; i < st.length; i += 3) {
      const px = cx + st[i], py = cy + st[i + 1];
      if (px >= 0 && py >= 0 && px < F.FW && py < F.FH && st[i + 2] > F.exp[py * F.FW + px]) F.exp[py * F.FW + px] = st[i + 2];
    }
  }
  let fogSeen = null, fogSeenR = null;
  function updateFog() {
    const F = S.fog, W = F.FW, H = F.FH, vis = F.vis, exp = F.exp, team = human().team;
    if (!fogSeen || fogSeen.length !== vis.length) { fogSeen = new Uint32Array(vis.length); fogSeenR = new Uint16Array(vis.length); }
    const stampId = ++F.n;
    vis.fill(0);
    for (const e of S.ents) {
      if (e.dead || e.team !== team || e.type === 'mauer') continue;
      const rad = sightOf(e), c0 = fogCell(e.x, e.y), cx = c0 % W, cy = (c0 / W) | 0;
      if (fogSeen[c0] === stampId && fogSeenR[c0] >= rad) continue; // gleiche Stelle schon mit mindestens dieser Sichtweite
      fogSeen[c0] = stampId; fogSeenR[c0] = rad;
      const st = stampOf(rad);
      for (let i = 0; i < st.length; i += 3) {
        const x = cx + st[i], y = cy + st[i + 1];
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = y * W + x;
        if (st[i + 2] > vis[c]) vis[c] = st[i + 2];
      }
    }
    for (let c = 0; c < vis.length; c++) if (vis[c] > exp[c]) exp[c] = vis[c]; // erkundet = beste je erreichte Sicht
    // Gegnerische Gebäude: zuletzt gesehenen Zustand merken, verschwundene beim nächsten Hinsehen vergessen
    for (const b of S.ents) {
      if (b.dead || b.kind !== 'building' || b.team === team || vis[fogCell(b.x, b.y)] < VIS_MIN) continue;
      let g = F.ghosts.get(b.id);
      if (!g) { g = { ghost: true, id: b.id, kind: 'building', type: b.type, owner: b.owner, team: b.team, x: b.x, y: b.y, size: b.size, r: b.r, ang: b.ang, site: b.site || null }; F.ghosts.set(b.id, g); }
      g.level = b.level; g.hp = b.hp; g.maxHp = b.maxHp; g.lastAng = b.lastAng; g.seen = stampId;
      g.upgrading = b.upgrading ? { t: b.upgrading.t, total: b.upgrading.total, to: b.upgrading.to } : null;
    }
    for (const [id, g] of F.ghosts) if (g.seen !== stampId && vis[fogCell(g.x, g.y)] >= VIS_MIN) F.ghosts.delete(id);
  }
  // Für Darstellung und Eingabe: Ist ein Punkt bzw. ein Objekt für den Spieler gerade sichtbar, ein Feld schon erkundet?
  const fogActive = () => !!(S && S.fog && S.fog.on && !S.over);
  G.fogActive = fogActive;
  G.visibleAt = (x, y) => !fogActive() || S.fog.vis[fogCell(x, y)] >= VIS_MIN;
  G.exploredAt = (x, y) => !fogActive() || S.fog.exp[fogCell(x, y)] >= VIS_MIN;
  G.canSee = (e) => !fogActive() || e.team === human().team || S.fog.vis[fogCell(e.x, e.y)] >= VIS_MIN;

  // -------------------------------------------------------------------------
  // Hauptschleife
  function updatePlayer(p, dt) {
    if (!p.alive) return;
    p.blds = p.blds.filter((b) => !b.dead);
    p.walls = p.walls.filter((b) => !b.dead);
    p.wallAlive = p.walls.length;
    updateSupply(p);
    updateEconomy(p, dt);
    updateProduction(p, dt);
    updateWorkersVis(p, dt);
    for (let i = 0; i < p.abCd.length; i++) if (p.abCd[i] > 0) p.abCd[i] -= dt;
    for (const b of p.buffs) b.t -= dt;
    p.buffs = p.buffs.filter((b) => b.t > 0);
    const h = p.hero;
    if (h && h.dead) {
      p.heroRespawn -= dt;
      if (p.heroRespawn <= 0) {
        h.dead = false; h.hp = h.maxHp; h.stun = 0; h.buffs = [];
        h.x = p.base.x + p.dir.x * 110; h.y = p.base.y + p.dir.y * 110;
        h.order = null; h.target = null; h.hold = null;
        S.ents.push(h);
        if (p.human) G.msg(`${h.name} ist zurück!`, 'good');
      }
    }
    p.thinkT -= dt;
    if (p.thinkT <= 0) {
      p.thinkT = p.human ? 1 : p.diff.think;
      if (p.auto.build) planBuild(p);
      else p.reserve = { g: 0, w: 0 };
      if (p.auto.talents) autoTalents(p);
    }
    // Offene Talentpunkte und Heldenwahl verfallen nicht: nach 60 s ohne eigene Wahl entscheidet der Computer
    if (!p.auto.talents && (p.talentPoints > 0 || (h && h.pending && h.pending.length))) {
      p.choiceT = (p.choiceT || 0) + dt;
      if (p.choiceT > 60) {
        p.choiceT = 0;
        autoTalents(p); autoHeroChoices(p);
        if (p.human) G.msg('Offene Talentpunkte und Heldenwahl wurden automatisch vergeben (selbst wählen im Volk- und Held-Tab).', '');
      }
    } else p.choiceT = 0;
    p.armyT -= dt;
    if (p.armyT <= 0) { p.armyT = 1; armyThink(p); }
    p.abilT -= dt;
    if (p.abilT <= 0) { p.abilT = 0.7; if (p.auto.ability) abilityThink(p); }
    if (!p.human && S.fog.on) { // im Nebel regelmäßig einen Späher losschicken
      p.scoutT = (p.scoutT === undefined ? 75 : p.scoutT) - dt;
      if (p.scoutT <= 0) { p.scoutT = 240; sendScout(p); }
    }
  }

  function step(dt) {
    for (const e of S.ents) if (e.kind !== 'building') { e.px = e.x; e.py = e.y; }
    S.time += dt;
    S.tick++;
    buildGrid();
    if (S.navDirty) navRebuild();
    S.bonusT -= dt;
    if (S.bonusT <= 0) { S.bonusT = 1; updateBonusCaches(); }
    if (S.fog.on) { S.intelT = (S.intelT || 0) - dt; if (S.intelT <= 0) { S.intelT = 1; updateIntel(); } }
    for (const p of S.players) updatePlayer(p, dt);
    computeMods();
    for (const e of S.ents) {
      if (e.dead) continue;
      if (e.kind === 'building') updateBuilding(e, dt);
      else updateMobile(e, dt);
      if (e.buffs && e.buffs.length) { for (const b of e.buffs) b.t -= dt; e.buffs = e.buffs.filter((b) => b.t > 0); }
    }
    updateProjectiles(dt);
    separate();
    updateCritters(dt);
    updateGore(dt);
    for (const tm of S.timers) {
      tm.t -= dt;
      if (tm.t <= 0 && !tm.done) {
        tm.done = true;
        const p = S.players[tm.pid];
        if (tm.kind === 'strike') strikeHit(p, p.rd.abilities[tm.ab], tm.x, tm.y);
        else if (tm.kind === 'heroStrike') heroStrike(p, tm);
      }
    }
    S.timers = S.timers.filter((t) => !t.done);
    if (S.shrines && S.shrines.length) updateShrines(dt);
    updateEvents(dt);
    for (const c of S.camps) {
      if (c.activeT > 0) { c.activeT -= dt; if (c.activeT <= 0) c.active = false; }
      if (c.left <= 0 && !c.event) {
        c.respawnT -= dt;
        if (c.respawnT <= 0) {
          let blocked = false;
          G.query(c.x, c.y, 350, (o) => { if (!o.dead && o.kind !== 'creep') blocked = true; });
          if (!blocked) spawnCamp(c); else c.respawnT = 10;
        }
      }
    }
    for (const f of S.fx) f.t += dt;
    S.fx = S.fx.filter((f) => f.t < f.dur);
    if (S.fog.on) { S.fog.t -= dt; if (S.fog.t <= 0) { S.fog.t = 0.2; updateFog(); } }
    S.ents = S.ents.filter((e) => !e.dead);
    S.victoryT -= dt;
    if (S.victoryT <= 0) { S.victoryT = 1; checkVictory(); }
  }

  // Punktzahl für die Entscheidung nach Zeitablauf
  G.score = function (p) {
    if (!p.alive) return 0;
    let s = 1000 * p.th.hp / p.th.maxHp;
    for (const b of p.blds) s += 40 * Math.max(1, b.level);
    s += 15 * p.armySupply + 40 * p.hero.level + 5 * p.stats.kills + 60 * p.wallLevel;
    s += 30 * (p.research.waffen + p.research.ruestung + p.research.ausbildung);
    return Math.round(s);
  };
  G.timeLeft = () => (S.limit ? Math.max(0, S.limit - S.time) : Infinity);
  // Belagerungsbonus gegen Gebäude in der Endphase: steigt von +25 % auf +150 %
  G.endphaseSiege = () => 1.25 + 1.25 * G.clamp((S.time - (S.limit - G.ENDPHASE)) / G.ENDPHASE, 0, 1);

  function checkVictory() {
    if (S.over) return;
    const me = human();
    if (!me.alive) { S.over = { win: false, time: S.time }; return; }
    const teams = new Set(S.players.filter((p) => p.alive).map((p) => p.team));
    if (teams.size === 1) { S.over = { win: teams.has(me.team), time: S.time }; return; }
    if (S.objective === 'drache' && S.dragonSlainBy !== null) {
      S.over = { win: S.dragonSlainBy === me.team, time: S.time, reason: S.dragonSlainBy === me.team ? 'Der Drache ist gefallen – durch deine Hand.' : 'Ein anderes Volk hat den Drachen zuerst erschlagen.' };
      return;
    }
    if (!S.limit) return;
    if (!S.endphase && S.time >= S.limit - G.ENDPHASE) {
      S.endphase = true;
      G.msg(S.objective === 'ueberleben' ? 'Die letzte Angriffswelle rollt an – halte noch 5 Minuten durch!' : 'Endphase! Alle Armeen greifen an, Gebäude erleiden stark erhöhten Schaden. Noch 5 Minuten.', 'bad');
      G.sfx('horn', me.base.x, me.base.y, 1, true);
    }
    if (S.time >= S.limit) {
      if (S.objective === 'ueberleben') { S.over = { win: true, time: S.time, reason: 'Du hast standgehalten!' }; return; }
      if (S.objective === 'drache') { S.over = { win: false, time: S.time, reason: 'Die Zeit ist abgelaufen – der Drache lebt noch.' }; return; }
      const byTeam = {};
      for (const p of S.players) byTeam[p.team] = (byTeam[p.team] || 0) + G.score(p);
      const best = Object.keys(byTeam).reduce((a, b) => (byTeam[b] > byTeam[a] ? b : a));
      S.over = { win: +best === me.team, time: S.time, byTime: true, scores: S.players.map((p) => ({ name: p.name, team: p.team, color: p.color, score: G.score(p) })) };
    }
  }

  G.update = function (realDt) {
    if (!S || S.paused || S.over) return;
    const t = Math.min(realDt, 0.1) * S.speed;
    const STEP = 1 / 30;
    S.acc = (S.acc || 0) + t;
    let n = 0;
    while (S.acc >= STEP && n < 16) { step(STEP); S.acc -= STEP; n++; }
    if (n >= 16) S.acc = 0;
  };
  G.simulate = function (seconds) { // für Tests
    const STEP = 1 / 30;
    for (let i = 0; i < seconds * 30 && !S.over; i++) step(STEP);
  };

  // -------------------------------------------------------------------------
  // Spielstände: Der ganze Zustand wird zu reinem JSON. Verweise auf Spielobjekte werden zu Kennungen
  // ($e Einheit/Gebäude, $p Spieler, $c Lager, $s Goldader, $sh Händler), feste Spieldaten zu Schlüsseln
  // ($hero, $creep, $bld, $camp). Kurzlebiges (Effekte, Partikel, Raster, Wegpunkte) wird neu aufgebaut.
  G.SAVE_VERSION = 1;
  const SAVE_SKIP = { m: 1, _aura: 1, _auraT: 1, navWp: 1, navT: 1, navTx: 1, navTy: 1, px: 1, py: 1, healTgt: 1, rd: 1, diff: 1, bonus: 1, teco: 1 };
  const SAVE_SKIP_DEAD = { target: 1, order: 1, summoner: 1, goal: 1, hold: 1, shopping: 1, huntCamp: 1 }; // keine Ketten über Gefallene
  const SAVE_SKIP_STATE = { ents: 1, players: 1, camps: 1, sites: 1, shops: 1, fx: 1, parts: 1, layout: 1, grid: 1, gridArr: 1, teamGrids: 1, sepGrid: 1, acc: 1, fog: 1, paused: 1, navDirty: 1 };
  const ENT_KINDS = { unit: 1, hero: 1, creep: 1, building: 1 };
  let dataRefs = null;
  function dataRefMap() {
    if (dataRefs) return dataRefs;
    dataRefs = new Map();
    for (const r of G.RACE_KEYS) for (const h of G.RACES[r].heroes) dataRefs.set(h, { $hero: [r, h.id] });
    for (const k in G.CREEPS) dataRefs.set(G.CREEPS[k], { $creep: k });
    for (const k in G.BUILDINGS) dataRefs.set(G.BUILDINGS[k], { $bld: k });
    for (const k in G.CAMPS) dataRefs.set(G.CAMPS[k], { $camp: k });
    WALL_DEFS.forEach((d, i) => dataRefs.set(d, { $wall: i }));
    return dataRefs;
  }
  // Listen gleichartiger Objekte spaltenweise ablegen: Feldnamen je Form nur einmal (halbiert die Größe)
  const PACKED = ['decor', 'decals', 'corpses', 'critters', 'proj'];
  function pack(list) {
    const shapes = [], bySig = new Map(), rows = [];
    for (const o of list) {
      const keys = Object.keys(o), sig = keys.join(',');
      let si = bySig.get(sig);
      if (si === undefined) { si = shapes.length; shapes.push(keys); bySig.set(sig, si); }
      const row = [si];
      for (const k of keys) row.push(o[k]);
      rows.push(row);
    }
    return { shapes, rows };
  }
  const unpack = (P) => P.rows.map((row) => { const keys = P.shapes[row[0]], o = {}; for (let i = 0; i < keys.length; i++) o[keys[i]] = row[i + 1]; return o; });
  function rle(a) { const out = []; let cur = a[0], n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === cur) n++; else { out.push(cur, n); cur = a[i]; n = 1; } } out.push(cur, n); return out; } // Wert, Anzahl, …
  function unrle(runs, a) { let i = 0; for (let k = 0; k < runs.length; k += 2) { a.fill(runs[k], i, i + runs[k + 1]); i += runs[k + 1]; } return a; }

  G.serializeGame = function (extra) {
    const refs = dataRefMap();
    const idx = (list) => new Map(list.map((o, i) => [o, i]));
    const pIdx = idx(S.players), cIdx = idx(S.camps), sIdx = idx(S.sites), shIdx = idx(S.shops);
    const E = {}, queue = [];
    function enc(v, k) {
      if (typeof v === 'number') return Number.isInteger(v) || k === 'seed' ? v : Number.isFinite(v) ? Math.round(v * 1000) / 1000 : { $num: String(v) };
      if (v === null || typeof v !== 'object') return typeof v === 'function' ? undefined : v;
      if (Array.isArray(v)) return v.map((x) => { const y = enc(x); return y === undefined ? null : y; });
      const r = refs.get(v);
      if (r) return r;
      if (ENT_KINDS[v.kind] && typeof v.id === 'number' && !v.ghost) { if (!(v.id in E)) { E[v.id] = null; queue.push(v); } return { $e: v.id }; }
      if (pIdx.has(v)) return { $p: pIdx.get(v) };
      if (cIdx.has(v)) return { $c: cIdx.get(v) };
      if (sIdx.has(v)) return { $s: sIdx.get(v) };
      if (shIdx.has(v)) return { $sh: shIdx.get(v) };
      if (Object.getPrototypeOf(v) !== Object.prototype) return undefined; // Raster, Typed Arrays u. Ä.
      return fields(v);
    }
    function fields(v, skip) {
      const o = {};
      for (const k in v) {
        if (SAVE_SKIP[k] || (skip && skip[k])) continue;
        const x = enc(v[k], k);
        if (x !== undefined) o[k] = x;
      }
      return o;
    }
    const D = {
      v: G.SAVE_VERSION, S: fields(S, SAVE_SKIP_STATE), ents: S.ents.map((e) => enc(e).$e),
      players: S.players.map((p) => fields(p)), camps: S.camps.map((c) => fields(c)), sites: S.sites.map((s) => fields(s)), shops: S.shops.map((s) => fields(s)),
      fog: { on: S.fog.on, exp: rle(S.fog.exp), ghosts: [...S.fog.ghosts.values()].map((g) => fields(g)) },
      ui: extra || null,
    };
    for (let i = 0; i < queue.length; i++) { const e = queue[i]; E[e.id] = fields(e, e.dead && e.kind !== 'hero' ? SAVE_SKIP_DEAD : null); }
    D.E = pack(Object.values(E));
    for (const k of PACKED) D.S[k] = pack(D.S[k]);
    return D;
  };

  G.loadGame = function (D) {
    if (!D || D.v !== G.SAVE_VERSION || !D.S || !G.LAYOUTS[D.S.mode]) throw new Error('Spielstand passt nicht zu dieser Spielversion');
    const E = new Map(), Elist = unpack(D.E);
    for (const o of Elist) E.set(o.id, {});
    const shells = (list) => list.map(() => ({}));
    const players = shells(D.players), camps = shells(D.camps), sites = shells(D.sites), shops = shells(D.shops);
    function dec(v) {
      if (v === null || typeof v !== 'object') return v;
      if (Array.isArray(v)) return v.map(dec);
      if (v.$e !== undefined) return E.get(v.$e) || null;
      if (v.$p !== undefined) return players[v.$p] || null;
      if (v.$c !== undefined) return camps[v.$c] || null;
      if (v.$s !== undefined) return sites[v.$s] || null;
      if (v.$sh !== undefined) return shops[v.$sh] || null;
      if (v.$hero) { const r = G.RACES[v.$hero[0]], h = r && r.heroes.find((x) => x.id === v.$hero[1]); if (!h) throw new Error('Unbekannter Held'); return h; }
      if (v.$creep) return G.CREEPS[v.$creep];
      if (v.$bld) return G.BUILDINGS[v.$bld];
      if (v.$camp) return G.CAMPS[v.$camp];
      if (v.$wall !== undefined) return WALL_DEFS[v.$wall];
      if (v.$num !== undefined) return Number(v.$num);
      const o = {};
      for (const k in v) o[k] = dec(v[k]);
      return o;
    }
    const fill = (o, src) => { for (const k in src) o[k] = dec(src[k]); return o; };
    for (const o of Elist) fill(E.get(o.id), o);
    players.forEach((p, i) => fill(p, D.players[i]));
    camps.forEach((c, i) => fill(c, D.camps[i]));
    sites.forEach((s, i) => fill(s, D.sites[i]));
    shops.forEach((s, i) => fill(s, D.shops[i]));
    const DS = { ...D.S };
    for (const k of PACKED) if (DS[k] && DS[k].rows) DS[k] = unpack(DS[k]);
    const s = fill({}, DS);
    Object.assign(s, { players, camps, sites, shops, ents: D.ents.map((id) => E.get(id)).filter(Boolean), fx: [], parts: [], grid: new Map(), layout: G.LAYOUTS[s.mode], acc: 0, paused: false, navDirty: true, terrain: s.terrain || [], shrines: s.shrines || [] });
    for (const p of players) {
      if (!G.RACES[p.race]) throw new Error('Unbekanntes Volk');
      p.rd = G.RACES[p.race]; p.diff = G.DIFFICULTY[s.cfg.difficulty] || G.DIFFICULTY.mittel; p.bonus = {}; p.teco = {};
      for (const r of G.ROLES) if (p.comp[r] === undefined) p.comp[r] = 1; // ältere Spielstände: Flieger und Spezialeinheit
      const h = p.hero; // ältere Spielstände: Helden ab Stufe 6 dürfen ihre Ultimative nachträglich wählen
      if (h) { h.pending = h.pending || []; if (h.level >= G.HERO_ULT_LVL && G.HERO_ULTS[h.def.id] && !h.abilities.some((a) => a.ult) && !h.pending.includes('ult')) h.pending.push('ult'); }
    }
    for (const e of E.values()) { e.m = zeroMods(); if (e.kind !== 'building') { e.px = e.x; e.py = e.y; } }
    for (const pr of s.proj) { pr.px = pr.x; pr.py = pr.y; }
    const prev = S;
    try {
      S = G.S = s;
      fogInit(!!(D.fog && D.fog.on));
      if (D.fog) {
        unrle(D.fog.exp, S.fog.exp);
        for (const g of D.fog.ghosts) S.fog.ghosts.set(g.id, dec(g));
      }
      updateBonusCaches();
      buildGrid();
      updateFog();
    } catch (e) { // laufendes Spiel unverändert weiterführen
      S = G.S = prev;
      if (prev) { prev.gridArr = null; prev.navDirty = true; }
      throw e;
    }
    return S;
  };
})();
