'use strict';
// Spiel-Engine: Zustand, Wirtschaft, Basisbau, Produktion, Kampf, Helden, KI.
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

  // -------------------------------------------------------------------------
  // Kartenlayouts je Modus (Anteile von Breite/Höhe)
  G.LAYOUTS = {
    '1v1': {
      name: '1 gegen 1', w: 3400, h: 2200, teams: [0, 1],
      bases: [[0.15, 0.5], [0.85, 0.5]], shops: [[0.5, 0.5]],
      camps: [[0.3, 0.25, 'wolf'], [0.7, 0.75, 'wolf'], [0.3, 0.75, 'banditen'], [0.7, 0.25, 'banditen'],
        [0.38, 0.13, 'troll'], [0.62, 0.87, 'troll'], [0.62, 0.13, 'golem'], [0.38, 0.87, 'golem'],
        [0.5, 0.1, 'drache'], [0.5, 0.9, 'drache']],
    },
    '2v2': {
      name: '2 gegen 2', w: 3400, h: 3000, teams: [0, 1, 0, 1],
      bases: [[0.15, 0.25], [0.85, 0.25], [0.15, 0.75], [0.85, 0.75]], shops: [[0.36, 0.5], [0.64, 0.5]],
      camps: [[0.3, 0.06, 'wolf'], [0.7, 0.94, 'wolf'], [0.7, 0.06, 'banditen'], [0.3, 0.94, 'banditen'],
        [0.5, 0.12, 'troll'], [0.5, 0.88, 'troll'], [0.5, 0.33, 'golem'], [0.5, 0.67, 'golem'], [0.5, 0.5, 'drache'],
        [0.06, 0.5, 'wolf'], [0.94, 0.5, 'wolf']],
    },
    'ffa': {
      name: 'Jeder gegen jeden (4)', w: 3400, h: 3400, teams: [0, 1, 2, 3],
      bases: [[0.15, 0.15], [0.85, 0.85], [0.85, 0.15], [0.15, 0.85]], shops: [[0.36, 0.36], [0.64, 0.64], [0.64, 0.36], [0.36, 0.64]],
      camps: [[0.3, 0.06, 'wolf'], [0.7, 0.94, 'wolf'], [0.06, 0.7, 'wolf'], [0.94, 0.3, 'wolf'],
        [0.7, 0.06, 'banditen'], [0.3, 0.94, 'banditen'], [0.06, 0.3, 'banditen'], [0.94, 0.7, 'banditen'],
        [0.3, 0.5, 'troll'], [0.7, 0.5, 'troll'], [0.5, 0.3, 'golem'], [0.5, 0.7, 'golem'], [0.5, 0.5, 'drache']],
    },
  };

  // -------------------------------------------------------------------------
  // Hilfen für Kosten und Stufen
  const round5 = (v) => Math.round(v / 5) * 5;
  G.costOf = (type, lvl) => { const c = G.BUILDINGS[type].cost, m = Math.pow(lvl, 1.5); return { g: round5(c.g * m), w: round5(c.w * m) }; };
  G.timeOf = (type, lvl) => G.BUILDINGS[type].time * Math.pow(lvl, 1.2);
  G.researchCost = (lvl) => ({ g: 150 * lvl, w: 100 * lvl });
  G.researchTime = (lvl) => 30 * lvl;
  G.unitCost = (p, role) => { const b = G.UNIT_BASE[role], disc = (p.rd.passive.eco && p.rd.passive.eco.unitDiscount) || 0; return { g: Math.round(b.gold * (1 - disc)), w: b.wood }; };
  G.builders = (p) => 2 + (p.th.level >= 3 ? 1 : 0) + (p.th.level >= 5 ? 1 : 0);
  G.buildersBusy = (p) => p.blds.reduce((n, b) => n + (b.upgrading ? 1 : 0), 0);
  G.maxCount = (p, type) => G.LIMITS[type][p.th.level - 1];
  G.countOf = (p, type) => p.blds.filter((b) => b.type === type).length;
  G.canAfford = (p, c) => p.gold >= c.g && p.wood >= c.w;
  function canSpend(p, c, ignoreReserve) {
    if (p.gold < c.g || p.wood < c.w) return false;
    if (ignoreReserve) return true;
    return p.gold - c.g >= p.reserve.g && p.wood - c.w >= p.reserve.w;
  }
  function pay(p, c) { p.gold -= c.g; p.wood -= c.w; }

  G.msg = function (text, cls) { if (!S) return; S.msgs.push({ text, t: S.time, cls: cls || '' }); if (S.msgs.length > 40) S.msgs.shift(); };
  const human = () => S.players[0];
  const isHumanP = (p) => p && p.human;

  // -------------------------------------------------------------------------
  // Neues Spiel
  G.newGame = function (cfg) {
    const race = cfg.race === 'zufall' ? pick(G.RACE_KEYS) : cfg.race;
    const heroes = G.RACES[race].heroes;
    const heroDef = heroes.find((h) => h.id === cfg.hero) || pick(heroes);
    const layout = G.LAYOUTS[cfg.mode];
    const others = shuffle(G.RACE_KEYS.filter((r) => r !== race));
    const themeKey = cfg.map === 'heimat' ? G.RACES[race].map.theme : cfg.map === 'zufall' ? pick(Object.keys(G.THEMES)) : cfg.map;
    S = G.S = {
      time: 0, ents: [], proj: [], fx: [], timers: [], players: [], camps: [], shops: [], decor: [],
      w: layout.w, h: layout.h, theme: themeKey, mode: cfg.mode, layout, over: null, msgs: [],
      speed: 1, paused: false, nextId: 1, grid: new Map(), bonusT: 0, victoryT: 0, cfg,
    };
    layout.bases.forEach((b, i) => {
      const isHuman = i === 0;
      const r = isHuman ? race : others[i - 1];
      const hd = isHuman ? heroDef : pick(G.RACES[r].heroes);
      makePlayer(i, r, hd, layout.teams[i], isHuman, cfg.difficulty, b[0] * layout.w, b[1] * layout.h);
    });
    layout.shops.forEach((s) => S.shops.push({ x: s[0] * layout.w, y: s[1] * layout.h, r: 40 }));
    layout.camps.forEach((c) => makeCamp(c[2], c[0] * layout.w, c[1] * layout.h));
    genDecor();
    updateBonusCaches();
    for (const pl of S.players) { pl.th.maxHp = bldMaxHp(pl, 'haupthaus', 1); pl.th.hp = pl.th.maxHp; }
    const p = human();
    G.msg(`Du spielst ${p.rd.name} mit ${p.heroDef.name}. Karte: ${G.THEMES[themeKey].name}.`, 'gold');
    S.players.slice(1).forEach((o) => G.msg(`${o.team === p.team ? 'Verbündeter' : 'Gegner'}: ${o.rd.name} (${o.heroDef.name})`, o.team === p.team ? 'ally' : 'enemy'));
    return S;
  };

  function makePlayer(i, race, heroDef, team, isHuman, difficulty, bx, by) {
    const rd = G.RACES[race];
    const diff = G.DIFFICULTY[difficulty] || G.DIFFICULTY.mittel;
    const thPos = G.snap('haupthaus', bx, by);
    const cx = S.w / 2, cy = S.h / 2;
    const dl = Math.hypot(cx - thPos.x, cy - thPos.y) || 1;
    const dir = { x: (cx - thPos.x) / dl, y: (cy - thPos.y) / dl };
    const p = {
      id: i, race, rd, heroDef, team, human: isHuman, diff, color: G.PLAYER_COLORS[i],
      name: isHuman ? 'Du' : `${rd.name} (KI)`,
      ecoMul: isHuman ? 1 : diff.eco, gold: 400, wood: 250, workers: 5, workerT: 0, goldRatio: 0.65, autoRatio: true,
      incomeG: 0, incomeW: 0,
      base: { x: thPos.x, y: thPos.y }, dir, rally: { x: thPos.x + dir.x * 300, y: thPos.y + dir.y * 300 },
      research: { waffen: 0, ruestung: 0, ausbildung: 0 }, researching: null,
      auto: { build: !isHuman, produce: true, army: true, hero: true, ability: !isHuman },
      armyMode: 'auto', armyState: 'sammeln', armyPoint: null, attackFrac: isHuman ? 0.7 : diff.attackFrac,
      minAttack: isHuman ? 420 : diff.minAttack, attackStart: 0, targetPlayer: null, manualPoint: null, campTarget: null, campsAllowed: true,
      comp: { tank: 2, nahkampf: 3, fernkampf: 3, magier: 2, heiler: 1, support: 1, beschwoerer: 1 },
      buffs: [], abilityT: 30, alive: true, hero: null, heroRespawn: 0, reserve: { g: 0, w: 0 },
      thinkT: Math.random(), armyT: Math.random(), abilT: Math.random(), blds: [], th: null,
      supplyCap: 10, supplyUsed: 0, armySupply: 0, bonus: {}, stats: { kills: 0, lost: 0 },
    };
    p.armyPoint = { ...p.rally };
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
  function spawnCamp(camp) {
    camp.creeps = [];
    camp.def.units.forEach((u, i) => {
      const cd = G.CREEPS[u];
      const a = (i / camp.def.units.length) * Math.PI * 2;
      const e = {
        id: S.nextId++, kind: 'creep', def: cd, name: cd.name, owner: -1, team: -1, camp,
        x: camp.x + Math.cos(a) * 30, y: camp.y + Math.sin(a) * 30, home: null, r: cd.r,
        hp: cd.hp, maxHp: cd.hp, dmg: cd.dmg, range: cd.range, cd: cd.cd, speed: cd.speed, armor: cd.armor,
        splash: cd.splash || 0, proj: cd.proj || null, level: 1, atkT: 0, retargetT: 0, target: null, buffs: [], m: zeroMods(), face: 0, regen: 0,
      };
      e.home = { x: e.x, y: e.y };
      S.ents.push(e);
      camp.creeps.push(e);
    });
    camp.left = camp.creeps.length;
    camp.active = false;
  }

  function genDecor() {
    const n = Math.floor((S.w * S.h) / 26000);
    for (let i = 0; i < n; i++) {
      const x = rand(20, S.w - 20), y = rand(20, S.h - 20);
      let ok = true;
      for (const p of S.players) if (d2(x, y, p.base.x, p.base.y) < (G.BASE_RADIUS + 90) ** 2) ok = false;
      for (const c of S.camps) if (d2(x, y, c.x, c.y) < 150 ** 2) ok = false;
      for (const s of S.shops) if (d2(x, y, s.x, s.y) < 130 ** 2) ok = false;
      if (!ok) continue;
      S.decor.push({ x, y, s: rand(0.7, 1.35), v: Math.floor(rand(0, 3)), seed: Math.random() });
    }
    S.decor.sort((a, b) => a.y - b.y);
  }

  // -------------------------------------------------------------------------
  // Gebäude
  G.snap = function (type, x, y) {
    const s = G.BUILDINGS[type].size;
    const tx = Math.round(x / T - s / 2), ty = Math.round(y / T - s / 2);
    return { x: (tx + s / 2) * T, y: (ty + s / 2) * T };
  };
  G.canPlace = function (p, type, x, y, gap = 0) {
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
      id: S.nextId++, kind: 'building', type, def, name: def.name, owner: p.id, team: p.team, x, y, size: def.size,
      r: def.size * T / 2, level, upgrading: null, prod: null, queue: [], focus: 'auto', prodOn: true, atkT: 0, armor: 5,
      hp: 1, maxHp: 1, m: zeroMods(), buffs: [],
    };
    b.maxHp = bldMaxHp(p, type, level);
    b.hp = level > 0 ? b.maxHp : b.maxHp * 0.1;
    S.ents.push(b);
    return b;
  }
  G.buildingCheck = function (p, type) {
    if (G.countOf(p, type) >= G.maxCount(p, type)) return 'Limit erreicht (Haupthaus aufwerten)';
    if (G.buildersBusy(p) >= G.builders(p)) return 'Alle Baumeister beschäftigt';
    if (!G.canAfford(p, G.costOf(type, 1))) return 'Nicht genug Rohstoffe';
    return null;
  };
  G.placeBuilding = function (p, type, x, y, gap = 0) {
    const pos = G.snap(type, x, y);
    if (G.buildingCheck(p, type)) return false;
    if (!G.canPlace(p, type, pos.x, pos.y, gap)) return false;
    const c = G.costOf(type, 1);
    pay(p, c);
    const b = makeBuilding(p, type, pos.x, pos.y, 0);
    b.upgrading = { to: 1, t: 0, total: G.timeOf(type, 1) };
    p.blds.push(b);
    return b;
  };
  G.upgradeCheck = function (p, b) {
    if (b.upgrading) return 'Wird bereits ausgebaut';
    if (b.level >= G.MAX_LEVEL) return 'Maximale Stufe';
    if (b.type !== 'haupthaus' && b.level >= p.th.level) return 'Haupthaus-Stufe zu niedrig';
    if (G.buildersBusy(p) >= G.builders(p)) return 'Alle Baumeister beschäftigt';
    if (!G.canAfford(p, G.costOf(b.type, b.level + 1))) return 'Nicht genug Rohstoffe';
    return null;
  };
  G.upgradeBuilding = function (p, b) {
    if (G.upgradeCheck(p, b)) return false;
    const c = G.costOf(b.type, b.level + 1);
    pay(p, c);
    b.upgrading = { to: b.level + 1, t: 0, total: G.timeOf(b.type, b.level + 1) };
    if (b.prod) { // laufende Produktion wird erstattet
      const uc = G.unitCost(p, b.prod.role); p.gold += uc.g; p.wood += uc.w; b.prod = null;
    }
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

  function updateBuilding(b, dt) {
    const p = S.players[b.owner];
    if (b.upgrading) {
      const u = b.upgrading;
      u.t += dt;
      if (b.level === 0) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.9 * dt / u.total);
      if (u.t >= u.total) {
        const old = b.maxHp;
        b.level = u.to;
        b.upgrading = null;
        b.maxHp = bldMaxHp(p, b.type, b.level);
        b.hp = Math.min(b.maxHp, b.hp + (b.maxHp - old));
        if (p.human) G.msg(`${b.name} ${b.level === 1 && old < b.maxHp * 0.95 && b.type !== 'haupthaus' ? 'fertiggestellt' : 'auf Stufe ' + b.level + ' ausgebaut'}.`, 'good');
        if (b.type === 'haupthaus' && p.human) G.msg(`Haupthaus Stufe ${b.level}! Neue Gebäude und Stufen freigeschaltet.`, 'gold');
      }
    }
    const atk = b.def.attack;
    if (atk && b.level >= 1) {
      b.atkT -= dt;
      if (b.atkT <= 0) {
        let best = null, bd = Infinity;
        G.query(b.x, b.y, atk.range, (o) => {
          if (o.team === b.team || o.kind === 'building' || o.dead) return;
          const dd = d2(o.x, o.y, b.x, b.y);
          if (dd < bd) { bd = dd; best = o; }
        });
        if (best) {
          const def = (p.bonus.defense ? p.bonus.defense.dmg : 0);
          const dmg = atk.dmg * (1 + 0.2 * (b.level - 1)) * (1 + def);
          b.lastAng = Math.atan2(best.y - b.y, best.x - b.x);
          S.proj.push({ x: b.x, y: b.y - b.size * 12, t: best, src: b, dmg, splash: atk.splash || 0, kind: atk.splash ? 'kanone' : 'pfeil', speed: 480, team: b.team, owner: b.owner, tx: best.x, ty: best.y });
          b.atkT = atk.cd;
        } else b.atkT = 0.3;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Boni (Commander, Volk, Forschung, Gegenstände)
  function zeroMods() { return { dmg: 0, atkspd: 0, speed: 0, armor: 0, regen: 0, lifesteal: 0, heal: 0, range: 0, hp: 0, summonExtra: 0 }; }
  const BONUS_KEYS = ['hp', 'dmg', 'armor', 'speed', 'atkspd', 'heal', 'range', 'regen', 'lifesteal', 'summonExtra'];
  function addBonus(target, src) { for (const k of BONUS_KEYS) if (src[k]) target[k] += src[k]; }
  function calcBonus(p, key) {
    const out = zeroMods();
    const unitLike = G.ROLES.includes(key) || key === 'summon';
    const entries = [];
    if (key !== 'hero') (p.heroDef.bonus || []).forEach((e) => entries.push(e));
    (p.rd.passive.bonus || []).forEach((e) => entries.push(e));
    for (const e of entries) {
      if (e.roles.includes(key) || (e.roles.includes('all') && (unitLike || key === 'hero'))) addBonus(out, e);
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
    }
  }
  G.bonusOf = (p, key) => p.bonus[key] || zeroMods();

  // -------------------------------------------------------------------------
  // Einheiten
  function makeUnit(p, role, x, y, level) {
    const base = G.UNIT_BASE[role], rdef = p.rd.units[role], m = rdef.mods || {};
    const b = G.bonusOf(p, role);
    const e = {
      id: S.nextId++, kind: 'unit', role, name: rdef.name, owner: p.id, team: p.team, x, y, r: base.r,
      baseHp: base.hp * (m.hp || 1) * (1 + b.hp), baseDmg: base.dmg * (m.dmg || 1),
      range: base.range * (m.range || 1), cd: base.cd * (m.cd || 1), speed: base.speed * (m.speed || 1), armor: base.armor + (m.armor || 0),
      splash: base.splash || 0, heal: base.heal ? base.heal * (m.heal || 1) : 0, proj: base.proj || null, supply: base.supply,
      level: 1, xp: 0, atkT: Math.random() * 0.5, retargetT: 0, target: null, aura: rdef.aura || null,
      summon: rdef.summon || null, summonT: 3, summons: 0, buffs: [], m: zeroMods(), face: 0, regen: 0, hitT: 0,
    };
    setUnitLevel(e, Math.min(5, level || 1));
    e.hp = e.maxHp;
    e.xp = G.UNIT_XP[e.level - 1];
    S.ents.push(e);
    return e;
  }
  function setUnitLevel(e, lvl) {
    const ratio = e.maxHp ? e.hp / e.maxHp : 1;
    e.level = lvl;
    const mul = 1 + 0.12 * (lvl - 1);
    e.maxHp = e.baseHp * mul;
    e.dmg = e.baseDmg * mul;
    e.hp = e.maxHp * ratio;
  }
  function gainUnitXp(e, xp) {
    if (e.level >= 5 || !G.UNIT_XP) return;
    e.xp += xp;
    while (e.level < 5 && e.xp >= G.UNIT_XP[e.level]) {
      setUnitLevel(e, e.level + 1);
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25);
      S.fx.push({ type: 'text', x: e.x, y: e.y - 20, text: '▲ Stufe ' + e.level, color: '#ffe066', t: 0, dur: 1.2 });
    }
  }
  // Beschwörungen & Söldner (keine Versorgung)
  function makeSummon(p, def, x, y, life, scale, summoner) {
    const b = G.bonusOf(p, 'summon');
    const sc = scale || 1;
    const e = {
      id: S.nextId++, kind: 'unit', role: 'summon', name: def.name, owner: p.id, team: p.team, x, y, r: def.r || 10,
      baseHp: def.hp * sc * (1 + b.hp), baseDmg: def.dmg * sc, range: def.range, cd: def.cd, speed: def.speed, armor: def.armor || 0,
      splash: def.splash || 0, heal: 0, proj: def.proj || (def.range > 60 ? 'kugel' : null), supply: 0, summoned: true,
      level: 1, xp: 0, atkT: 0.3, retargetT: 0, target: null, buffs: [], m: zeroMods(), face: 0, regen: 0, hitT: 0,
      life: life, summoner: summoner || null, merc: !!def.merc,
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
      abilities: d.abilities.map((a) => ({ ...a, t: 4 })), manual: false, order: null, goal: null, hold: null,
      atkT: 0, retargetT: 0, target: null, buffs: [], m: zeroMods(), face: 0, castT: 0, retreat: false, shopping: null, hitT: 0,
    };
    recalcHero(h);
    h.hp = h.maxHp;
    S.ents.push(h);
    return h;
  }
  function recalcHero(h) {
    const d = h.def, L = h.level;
    const it = { hp: 0, dmg: 0, armor: 0, regen: 0, speed: 0, atkspd: 0, cdr: 0 };
    for (const id of h.items) { const x = G.ITEMS[id]; if (!x || x.consumable) continue; for (const k in it) if (x[k]) it[k] += x[k]; }
    const ratio = h.maxHp ? h.hp / h.maxHp : 1;
    h.maxHp = d.stats.hp * (1 + 0.1 * (L - 1)) + it.hp;
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
    while (h.level < G.HERO_MAX && h.xp >= G.HERO_XP(h.level)) {
      h.level++;
      recalcHero(h);
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.3);
      S.fx.push({ type: 'text', x: h.x, y: h.y - 30, text: 'HELD STUFE ' + h.level, color: '#ffd23a', t: 0, dur: 1.8, big: true });
      if (S.players[h.owner].human) G.msg(`${h.name} erreicht Stufe ${h.level}!`, 'gold');
    }
  }
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
    if (p.human) G.msg(`Gekauft: ${G.ITEMS[id].name}`, 'good');
    return true;
  };
  G.sellItem = function (p, idx) {
    const h = p.hero; if (!h || h.dead) return;
    const id = h.items[idx]; if (!id) return;
    if (!S.shops.some((s) => dist(s, h) < 230)) { G.msg('Verkaufen nur beim Händler möglich.', 'bad'); return; }
    h.items.splice(idx, 1);
    p.gold += Math.floor((G.ITEMS[id].price || 300) * 0.5);
    recalcHero(h); updateBonusCaches();
  };
  function usePotion(h) {
    const i = h.items.indexOf('trank');
    if (i < 0) return;
    h.items.splice(i, 1);
    h.hp = Math.min(h.maxHp, h.hp + G.ITEMS.trank.heal);
    S.fx.push({ type: 'text', x: h.x, y: h.y - 26, text: '+' + G.ITEMS.trank.heal, color: '#6f6', t: 0, dur: 1 });
  }

  function enemiesNear(e, x, y, r, includeBuildings) {
    const out = [];
    G.query(x, y, r, (o) => {
      if (o.dead || o.team === e.team) return;
      if (o.kind === 'building' && !includeBuildings) return;
      if (o.kind === 'creep' && e.team !== -1 && !o.camp.active && dist(o, { x, y }) > 120) return;
      out.push(o);
    });
    return out;
  }
  function alliesNear(team, x, y, r) {
    const out = [];
    G.query(x, y, r, (o) => { if (!o.dead && o.team === team && o.kind !== 'building') out.push(o); });
    return out;
  }
  function bestCluster(e, list, radius) {
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
    const sc = 1 + 0.1 * (h.level - 1);
    const CAST = 470;
    switch (ab.type) {
      case 'nuke': case 'drain': {
        if (!target || target.dead || dist(h, target) > CAST + target.r) return false;
        S.proj.push({ x: h.x, y: h.y, t: target, src: h, dmg: ab.dmg * sc, stun: ab.stun || 0, drain: ab.type === 'drain', kind: 'zauber', speed: 560, team: h.team, owner: h.owner, color: p.rd.palette.trim, tx: target.x, ty: target.y });
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
        break;
      }
      case 'heal': {
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) {
          const a = ab.amount * sc;
          o.hp = Math.min(o.maxHp, o.hp + a);
        }
        S.fx.push({ type: 'blast', x: h.x, y: h.y, r: ab.radius, color: '#8aff8a', t: 0, dur: 0.7 });
        break;
      }
      case 'buff': {
        const mods = { [ab.stat]: ab.value, ...(ab.extra || {}) };
        for (const o of alliesNear(h.team, h.x, h.y, ab.radius)) o.buffs.push({ t: ab.duration, mods });
        S.fx.push({ type: 'blast', x: h.x, y: h.y, r: ab.radius, color: '#ffe066', t: 0, dur: 0.7 });
        break;
      }
      case 'summon': {
        for (let i = 0; i < ab.count; i++) {
          const a = Math.random() * Math.PI * 2;
          makeSummon(p, ab.unit, h.x + Math.cos(a) * 40, h.y + Math.sin(a) * 40, ab.duration, sc);
        }
        break;
      }
      default: return false;
    }
    ab.t = ab.cd * (1 - h.cdr);
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
        if (!t) t = foes.reduce((a, b) => (b.kind === 'hero' || b.hp < a.hp ? b : a));
        castAbility(h, ab, t.x, t.y, t);
      } else if (ab.type === 'aoe' || ab.type === 'stun') {
        if (ab.self) {
          const n = foes.filter((o) => dist(o, h) < ab.radius).length;
          if (n >= 2 || (n >= 1 && foes.some((o) => o.maxHp > 1000 && dist(o, h) < ab.radius))) castAbility(h, ab, h.x, h.y);
        } else {
          const c = bestCluster(h, foes, ab.radius);
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
    G.query(wx, wy, 40, (o) => { if (o.dead || o.team === h.team) return; const dd = d2(o.x, o.y, wx, wy) - o.r * o.r; if (dd < bd) { bd = dd; target = o; } });
    if (target) { h.order = { type: 'attack', target }; S.fx.push({ type: 'ring', x: target.x, y: target.y, r: target.r + 6, color: '#ff4040', t: 0, dur: 0.4 }); }
    else { h.order = { type: 'move', x: wx, y: wy }; S.fx.push({ type: 'ring', x: wx, y: wy, r: 12, color: '#60ff60', t: 0, dur: 0.4 }); }
  };
  G.heroCastManual = function (p, idx, wx, wy) {
    const h = p.hero; if (!h || h.dead) return;
    const ab = h.abilities[idx]; if (!ab) return;
    if (ab.t > 0) { G.msg(`${ab.name} lädt noch (${Math.ceil(ab.t)} s)`, 'bad'); return; }
    let ok;
    if (ab.type === 'nuke' || ab.type === 'drain') {
      const foes = enemiesNear(h, wx, wy, 140, true).filter((o) => o.kind !== 'building');
      G.query(wx, wy, 140, (o) => { if (o.kind === 'creep' && !foes.includes(o)) foes.push(o); });
      const t = foes.sort((a, b) => d2(a.x, a.y, wx, wy) - d2(b.x, b.y, wx, wy))[0];
      ok = t && castAbility(h, ab, t.x, t.y, t);
      if (!ok) G.msg(t ? 'Ziel zu weit entfernt' : 'Kein Ziel unter dem Mauszeiger', 'bad');
    } else {
      ok = castAbility(h, ab, wx, wy);
      if (!ok) G.msg('Zu weit entfernt', 'bad');
    }
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
    // Rückzug bei niedrigen LP
    if (h.hp < h.maxHp * 0.25) h.retreat = true;
    if (h.retreat) {
      if (h.hp > h.maxHp * 0.85) h.retreat = false;
      else { h.order = { type: 'move', x: p.base.x + p.dir.x * 60, y: p.base.y + p.dir.y * 60, auto: true }; return; }
    }
    if (h.order && h.order.auto) h.order = null;
    // Einkaufen beim Händler
    if (!h.shopping && p.armyState !== 'angriff' && p.armyState !== 'verteidigen' && h.items.length < 6) {
      const want = nextWish(p);
      if (want && p.gold >= G.ITEMS[want].price + (p.human ? 0 : 150)) {
        h.shopping = S.shops.reduce((a, b) => (dist(b, h) < dist(a, h) ? b : a));
      }
    }
    if (h.shopping) {
      if (p.armyState === 'verteidigen') h.shopping = null;
      else if (dist(h, h.shopping) < 150) {
        let w;
        while ((w = nextWish(p)) && !G.buyCheck(p, w)) G.buyItem(p, w);
        if (h.items.filter((i) => i === 'trank').length < 1 && !G.buyCheck(p, 'trank') && h.items.length < 6) G.buyItem(p, 'trank');
        h.shopping = null;
      } else { h.goal = h.shopping; return; }
    }
    // Der Armee folgen
    const c = p.armyCentroid;
    h.goal = c ? { x: c.x - p.dir.x * 20, y: c.y - p.dir.y * 20 } : p.armyPoint;
  }
  function nextWish(p) {
    const h = p.hero;
    for (const id of G.HERO_WISHLIST) if (!h.items.includes(id)) return id;
    return null;
  }

  // -------------------------------------------------------------------------
  // Raum-Raster für schnelle Nachbarschaftssuche
  const CELL = 120;
  function buildGrid() {
    const g = S.grid; g.clear();
    for (const e of S.ents) {
      if (e.dead) continue;
      const k = ((e.x / CELL) | 0) + ((e.y / CELL) | 0) * 1000;
      let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(e);
    }
  }
  G.query = function (x, y, r, fn) {
    const R = r + 60;
    const x0 = Math.max(0, ((x - R) / CELL) | 0), x1 = ((x + R) / CELL) | 0;
    const y0 = Math.max(0, ((y - R) / CELL) | 0), y1 = ((y + R) / CELL) | 0;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const a = S.grid.get(cx + cy * 1000); if (!a) continue;
      for (const e of a) { if (e.dead) continue; const rr = r + e.r; if (d2(e.x, e.y, x, y) <= rr * rr) fn(e); }
    }
  };

  // -------------------------------------------------------------------------
  // Kampf
  function dealDamage(src, t, amount) {
    if (!t || t.dead) return 0;
    const armor = (t.armor || 0) + (t.m ? t.m.armor : 0);
    const mul = armor >= 0 ? 1 - (armor * 0.06) / (1 + armor * 0.06) : 2 - Math.pow(0.94, -armor);
    const dmg = amount * mul;
    t.hp -= dmg;
    t.hitT = 0.12;
    if (src && !src.dead && src.m) {
      const ls = (src.lifesteal || 0) + src.m.lifesteal;
      if (ls > 0) src.hp = Math.min(src.maxHp, src.hp + dmg * ls);
    }
    if (t.kind === 'creep') {
      t.camp.active = true; t.camp.activeT = 8;
      if (src && !src.dead && src.kind !== 'building' && (!t.target || t.target.kind === 'building')) t.target = src;
    }
    if (src && src.owner >= 0) t.lastOwner = src.owner;
    if (t.hp <= 0) killEnt(t, src);
    return dmg;
  }
  G.dealDamage = dealDamage;

  function xpValue(t) {
    if (t.kind === 'creep') return t.def.xp;
    if (t.kind === 'hero') return 80 * t.level;
    if (t.kind === 'building') return 25 * Math.max(1, t.level);
    return t.summoned ? 8 : 12 + 8 * t.level + (t.supply || 0) * 4;
  }

  function killEnt(t, src, silent) {
    if (t.dead) return;
    t.dead = true;
    S.fx.push({ type: t.kind === 'building' ? 'boom' : 'puff', x: t.x, y: t.y, r: t.r, t: 0, dur: t.kind === 'building' ? 1.0 : 0.6, color: '#555' });
    const killer = src && src.owner >= 0 ? src.owner : (t.lastOwner !== undefined ? t.lastOwner : -1);
    if (t.kind === 'hero') {
      const p = S.players[t.owner];
      p.heroRespawn = 12 + 3 * t.level;
      t.order = null; t.target = null; t.shopping = null; t.retreat = false;
      if (p.human) G.msg(`${t.name} ist gefallen! Wiederbelebung in ${Math.round(p.heroRespawn)} s.`, 'bad');
      else if (killer === 0) G.msg(`Gegnerischer Held ${t.name} besiegt!`, 'good');
    }
    if (t.summoner) t.summoner.summons--;
    if (t.kind === 'unit' && t.owner >= 0 && !t.summoned) S.players[t.owner].stats.lost++;
    if (t.kind === 'creep') creepKilled(t, killer);
    if (t.kind === 'building') {
      const p = S.players[t.owner];
      if (t.type === 'haupthaus') eliminate(p, killer);
      else if (p.human) G.msg(`${t.name} wurde zerstört!`, 'bad');
    }
    if (silent || killer < 0) return;
    const kp = S.players[killer];
    if (t.kind !== 'building' && t.owner !== killer) kp.stats.kills++;
    const xp = xpValue(t);
    if (src && !src.dead && src.kind === 'unit' && !src.summoned) gainUnitXp(src, xp);
    const h = kp.hero;
    if (h && !h.dead && dist(h, t) < 800) gainHeroXp(h, xp * (t.kind === 'creep' ? 1 : 0.7));
    if (t.kind === 'creep') {
      kp.gold += t.def.gold;
      S.fx.push({ type: 'text', x: t.x, y: t.y - 14, text: '+' + t.def.gold + ' G', color: '#ffd23a', t: 0, dur: 1 });
    }
  }

  function creepKilled(t, killer) {
    const camp = t.camp;
    camp.left--;
    if (camp.left > 0) return;
    camp.respawnT = G.CAMP_RESPAWN;
    camp.active = false;
    if (killer < 0) return;
    const p = S.players[killer], def = camp.def;
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
      for (let i = 0; i < 2; i++) makeSummon(p, { name: 'Söldner-Troll', hp: 650, dmg: 30, range: 28, cd: 1.3, speed: 60, armor: 3, r: 14, merc: true }, camp.x + i * 30, camp.y);
    } else if (def.extra === 'segen') {
      p.buffs.push({ t: 90, mods: { armor: 3 }, name: 'Steinhaut' });
    } else if (def.extra === 'drachenblut') {
      p.buffs.push({ t: 180, mods: { dmg: 0.15 }, name: 'Drachenblut' });
    }
    if (p.human) G.msg(`${def.name} gesäubert! +${def.gold} Gold, +${def.wood} Holz.${lootTxt}${def.extraDesc ? ' ' + def.extraDesc + '!' : ''}`, 'gold');
  }

  function eliminate(p, killer) {
    if (!p.alive) return;
    p.alive = false;
    for (const e of S.ents) if (e.owner === p.id && !e.dead) { e.dead = true; S.fx.push({ type: e.kind === 'building' ? 'boom' : 'puff', x: e.x, y: e.y, r: e.r, t: 0, dur: 1, color: '#555' }); }
    G.msg(`${p.human ? 'Dein Volk' : p.name} wurde vernichtet!`, p.human ? 'bad' : (S.players[0].team === p.team ? 'bad' : 'good'));
  }

  function validTarget(e, t) {
    if (!t || t.dead) return false;
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
    const focus = p && !p.human && p.diff.focus;
    let best = null, bs = Infinity;
    G.query(e.x, e.y, aggro, (o) => {
      if (o.team === e.team || o.dead) return;
      if (e.kind === 'creep') {
        if (o.kind === 'building') return;
        if (dist(o, e.home) > 420) return;
      } else if (o.kind === 'creep') {
        if (!o.camp.active && p.campTarget !== o.camp && d2(o.x, o.y, e.x, e.y) > 90 * 90) return;
      }
      let s = Math.sqrt(d2(o.x, o.y, e.x, e.y)) - o.r;
      if (o.kind === 'building') s += 260;
      if (o.kind === 'hero') s -= 20;
      if (focus && (o.role === 'heiler' || o.role === 'magier')) s -= 70;
      if (s < bs) { bs = s; best = o; }
    });
    return best;
  }
  function findHealTarget(e) {
    let best = null, br = 0.92;
    G.query(e.x, e.y, e.range + 120, (o) => {
      if (o.team !== e.team || o.dead || o.kind === 'building' || o === e) return;
      const r = o.hp / o.maxHp;
      if (r < br) { br = r; best = o; }
    });
    return best;
  }

  function moveTo(e, tx, ty, dt, stop) {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d <= (stop || 4)) { e.moving = false; return true; }
    const sp = e.speed * Math.max(0.2, 1 + e.m.speed) * dt;
    if (sp <= 0) return false;
    const k = Math.min(sp, d - (stop || 4)) / d;
    e.x += dx * k; e.y += dy * k;
    e.face = Math.atan2(dy, dx);
    e.moving = true;
    return false;
  }

  function attack(e, t) {
    if (e.atkT > 0) return;
    e.atkT = e.cd;
    const dmg = e.dmg * Math.max(0.1, 1 + e.m.dmg);
    e.face = Math.atan2(t.y - e.y, t.x - e.x);
    e.swing = 0.18;
    if (e.proj || e.range > 60) {
      const p = e.owner >= 0 ? S.players[e.owner] : null;
      S.proj.push({ x: e.x, y: e.y, t, src: e, dmg, splash: e.splash || 0, kind: e.proj || 'pfeil', speed: e.proj === 'feuer' ? 380 : 440, team: e.team, owner: e.owner, color: p ? p.rd.palette.trim : '#ff7a2a', tx: t.x, ty: t.y });
    } else {
      dealDamage(e, t, dmg);
    }
  }

  function unitGoal(e) {
    if (e.kind === 'creep') return e.home;
    const p = S.players[e.owner];
    if (e.kind === 'hero') return e.goal || p.armyPoint;
    const ap = p.armyPoint || p.rally;
    const a = e.id * 2.399;
    const rr = 22 + (e.id % 6) * 16;
    let x = ap.x + Math.cos(a) * rr, y = ap.y + Math.sin(a) * rr;
    if (e.range > 100) { x -= p.dir.x * 55; y -= p.dir.y * 55; }
    if (e.role === 'tank') { x += p.dir.x * 30; y += p.dir.y * 30; }
    return { x, y };
  }

  function updateMobile(e, dt) {
    if (e.life !== undefined && e.life !== null) { e.life -= dt; if (e.life <= 0) { killEnt(e, null, true); return; } }
    if (e.hitT > 0) e.hitT -= dt;
    if (e.swing > 0) e.swing -= dt;
    const regen = (e.regen || 0) + e.m.regen;
    if (regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + regen * dt);
    if (e.owner >= 0) {
      const p = S.players[e.owner];
      if (d2(e.x, e.y, p.base.x, p.base.y) < G.BASE_RADIUS * G.BASE_RADIUS) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
    }
    if (e.stun > 0) { e.stun -= dt; return; }
    e.atkT -= dt * Math.max(0.2, 1 + e.m.atkspd);
    if (e.kind === 'hero') updateHeroLogic(e, dt);

    // Beschwörer rufen im Kampf Helfer herbei
    if (e.summon) {
      const p = S.players[e.owner];
      const max = G.UNIT_BASE.beschwoerer.summonMax + (G.bonusOf(p, 'beschwoerer').summonExtra || 0);
      e.summonT -= dt;
      if (e.summonT <= 0 && e.summons < max && e.target) {
        e.summonT = G.UNIT_BASE.beschwoerer.summonCd;
        e.summons++;
        makeSummon(p, e.summon, e.x + rand(-25, 25), e.y + rand(-25, 25), e.summon.life, 1 + 0.12 * (e.level - 1), e);
      }
    }

    // Kreaturen kehren zurück, wenn sie zu weit weggelockt wurden
    if (e.kind === 'creep') {
      if (e.returning) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15 * dt);
        if (moveTo(e, e.home.x, e.home.y, dt, 6)) e.returning = false;
        return;
      }
      if (dist(e, e.home) > 430) { e.returning = true; e.target = null; return; }
      if (!e.target && !e.camp.active) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt);
    }

    // Manuelle Befehle des Helden
    if (e.order) {
      if (e.order.type === 'move') {
        e.target = null;
        if (moveTo(e, e.order.x, e.order.y, dt, 6)) e.order = null;
        return;
      }
      if (e.order.type === 'attack') {
        if (e.order.target.dead) e.order = null;
        else e.target = e.order.target;
      }
    }
    e.retargetT -= dt;
    if (!e.order && (e.retargetT <= 0 || !validTarget(e, e.target))) {
      e.retargetT = 0.3 + Math.random() * 0.15;
      e.target = findTarget(e);
    }

    // Heiler
    if (e.heal > 0) {
      const ht = findHealTarget(e);
      if (ht) {
        const dd = dist(e, ht) - ht.r - e.r;
        if (dd <= e.range) {
          if (e.atkT <= 0) {
            const p = S.players[e.owner];
            e.atkT = e.cd;
            S.proj.push({ x: e.x, y: e.y, t: ht, src: e, heal: e.heal * (1 + 0.12 * (e.level - 1)) * (1 + e.m.heal), kind: 'heilung', speed: 420, team: e.team, owner: e.owner, color: '#7aff7a', tx: ht.x, ty: ht.y });
            if (p) gainUnitXp(e, 1.5);
          }
        } else moveTo(e, ht.x, ht.y, dt, 0);
        return;
      }
    }

    const t = e.target;
    if (t) {
      const range = e.range * (1 + e.m.range);
      const dd = Math.sqrt(d2(e.x, e.y, t.x, t.y)) - t.r - e.r;
      if (dd <= range) attack(e, t);
      else moveTo(e, t.x, t.y, dt, 0);
    } else {
      const g = unitGoal(e);
      if (g) moveTo(e, g.x, g.y, dt, 6);
    }
  }

  function updateProjectiles(dt) {
    for (const pr of S.proj) {
      if (pr.done) continue;
      if (pr.t && !pr.t.dead) { pr.tx = pr.t.x; pr.ty = pr.t.y; }
      const dx = pr.tx - pr.x, dy = pr.ty - pr.y, d = Math.hypot(dx, dy);
      const step = pr.speed * dt;
      pr.ang = Math.atan2(dy, dx);
      if (d <= step + 4) {
        pr.done = true;
        const tgt = pr.t && !pr.t.dead ? pr.t : null;
        if (pr.heal) {
          if (tgt) { tgt.hp = Math.min(tgt.maxHp, tgt.hp + pr.heal); S.fx.push({ type: 'spark', x: tgt.x, y: tgt.y, t: 0, dur: 0.4, color: '#7aff7a' }); }
          continue;
        }
        if (tgt) {
          dealDamage(pr.src, tgt, pr.dmg);
          if (pr.stun) tgt.stun = Math.max(tgt.stun || 0, pr.stun);
          if (pr.drain && pr.src && !pr.src.dead) pr.src.hp = Math.min(pr.src.maxHp, pr.src.hp + pr.dmg * 0.6);
        }
        if (pr.splash) {
          G.query(pr.tx, pr.ty, pr.splash, (o) => {
            if (o === tgt || o.dead || o.team === pr.team) return;
            if (o.kind === 'creep' && pr.team !== -1 && !o.camp.active) return;
            dealDamage(pr.src && !pr.src.dead ? pr.src : null, o, pr.dmg * 0.5);
          });
          S.fx.push({ type: 'blast', x: pr.tx, y: pr.ty, r: pr.splash, color: pr.kind === 'feuer' ? '#ff6a2a' : '#ffcc66', t: 0, dur: 0.35 });
        }
        if (pr.kind === 'zauber') S.fx.push({ type: 'blast', x: pr.tx, y: pr.ty, r: 30, color: pr.color, t: 0, dur: 0.4 });
      } else {
        pr.x += (dx / d) * step; pr.y += (dy / d) * step;
      }
    }
    S.proj = S.proj.filter((p) => !p.done);
  }

  function separate() {
    for (const e of S.ents) {
      if (e.dead || e.kind === 'building') continue;
      G.query(e.x, e.y, e.r + 70, (o) => {
        if (o === e) return;
        if (o.kind === 'building') {
          const hs = o.size * T / 2;
          const dx = e.x - o.x, dy = e.y - o.y;
          const ox = hs + e.r - Math.abs(dx), oy = hs + e.r - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (ox < oy) e.x += (dx >= 0 ? 1 : -1) * ox; else e.y += (dy >= 0 ? 1 : -1) * oy;
          }
          return;
        }
        if (o.id < e.id) return;
        const dx = o.x - e.x, dy = o.y - e.y;
        const rr = e.r + o.r;
        const dd = dx * dx + dy * dy;
        if (dd < rr * rr && dd > 0.0001) {
          const d = Math.sqrt(dd), push = (rr - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          const es = e.speed === 0 ? 0 : 1, os = o.speed === 0 ? 0 : 1;
          e.x -= nx * push * es; e.y -= ny * push * es;
          o.x += nx * push * os; o.y += ny * push * os;
        } else if (dd <= 0.0001) { e.x += rand(-1, 1); }
      });
      e.x = clamp(e.x, e.r, S.w - e.r); e.y = clamp(e.y, e.r, S.h - e.r);
    }
  }

  // -------------------------------------------------------------------------
  // Modifikatoren pro Tick (Commander, Volksfähigkeit, Buffs, Auren)
  function computeMods() {
    const auraSrc = [];
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
        if (e.kind === 'hero') m.atkspd += e.itemAtkspd || 0;
      }
      for (const b of e.buffs) addBonus(m, b.mods);
      if (e.aura) auraSrc.push(e);
    }
    for (const s of auraSrc) {
      const a = s.aura;
      G.query(s.x, s.y, 180, (o) => {
        if (o.dead || o.kind === 'building') return;
        if (a.side === 'ally' ? o.team !== s.team : (o.team === s.team)) return;
        if (o._auraT !== S.tick) { o._auraT = S.tick; o._aura = {}; }
        const key = a.side + a.stat;
        const v = a.value;
        if (o._aura[key] === undefined || Math.abs(v) > Math.abs(o._aura[key])) {
          o.m[a.stat] += v - (o._aura[key] || 0);
          o._aura[key] = v;
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
      if (p.workerT >= 6) { if (p.gold >= 40) { p.gold -= 40; p.workers++; } p.workerT = 0; }
    }
    if (p.autoRatio) {
      const ng = Math.max(0, p.reserve.g - p.gold), nw = Math.max(0, p.reserve.w - p.wood);
      let target = 0.65;
      if (ng + nw > 0) target = clamp(ng / (ng + nw * 1.15), 0.3, 0.85);
      else if (p.wood > p.gold * 1.5) target = 0.8;
      else if (p.gold > p.wood * 3) target = 0.45;
      p.goldRatio += (target - p.goldRatio) * Math.min(1, dt * 0.5);
    }
    let mines = 0, saws = 0;
    for (const b of p.blds) {
      if (b.level < 1) continue;
      if (b.type === 'goldmine') mines += b.level;
      if (b.type === 'saegewerk') saws += b.level;
    }
    const gw = p.workers * p.goldRatio, ww = p.workers - gw;
    const gp = (p.rd.passive.eco && p.rd.passive.eco.goldPct) || 0;
    p.incomeG = (th * 1.5 + gw * 1.1 + mines * 1.8) * (1 + gp) * p.ecoMul;
    p.incomeW = (ww * 1.0 + saws * 1.5) * p.ecoMul;
    p.gold += p.incomeG * dt;
    p.wood += p.incomeW * dt;

    if (p.researching) {
      const r = p.researching;
      r.t += dt;
      if (r.t >= r.total) {
        p.research[r.line]++;
        p.researching = null;
        updateBonusCaches();
        if (p.human) G.msg(`Forschung abgeschlossen: ${G.RESEARCH[r.line].name} ${p.research[r.line]}`, 'good');
      }
    }
  }

  function unlockedRoles(b) {
    const prod = G.PRODUCTION[b.type];
    if (!prod) return [];
    return Object.keys(prod).filter((r) => b.level >= prod[r]);
  }
  G.unlockedRoles = unlockedRoles;

  function chooseRole(p, b, counts, total) {
    const roles = unlockedRoles(b);
    if (!roles.length) return null;
    if (b.queue.length) return b.queue[0];
    if (!b.prodOn) return null;
    if (b.focus !== 'auto') return roles.includes(b.focus) ? b.focus : null;
    if (!p.auto.produce) return null;
    let W = 0;
    for (const r of G.ROLES) W += p.comp[r] || 0;
    if (W <= 0) return null;
    let best = null, bd = -Infinity;
    for (const r of roles) {
      const w = p.comp[r] || 0;
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
    const minArmy = 6 + 4 * p.th.level;
    for (const b of p.blds) {
      if (!G.PRODUCTION[b.type] || b.level < 1 || b.upgrading) continue;
      if (b.prod) {
        b.prod.t += dt * (1 + 0.15 * (b.level - 1));
        if (b.prod.t >= b.prod.total) {
          const ang = Math.atan2(p.rally.y - b.y, p.rally.x - b.x);
          makeUnit(p, b.prod.role, b.x + Math.cos(ang) * (b.r + 14), b.y + Math.sin(ang) * (b.r + 14), 1 + Math.floor((b.level - 1) / 2));
          b.prod = null;
        }
      }
      if (!b.prod) {
        const role = chooseRole(p, b, counts, total);
        if (!role) continue;
        const sup = G.UNIT_BASE[role].supply;
        if (p.supplyUsed + sup > p.supplyCap) continue;
        const c = G.unitCost(p, role);
        if (!canSpend(p, c, p.armySupply < minArmy || b.queue.length > 0)) continue;
        pay(p, c);
        if (b.queue.length && b.queue[0] === role) b.queue.shift();
        b.prod = { role, t: 0, total: G.UNIT_BASE[role].time };
        p.supplyUsed += sup;
        counts[role]++; total++;
      }
    }
  }
  G.queueUnit = function (p, b, role) {
    if (!unlockedRoles(b).includes(role)) return;
    if (b.queue.length >= 5) { G.msg('Warteschlange voll (5)', 'bad'); return; }
    b.queue.push(role);
  };

  function updateSupply(p) {
    let cap = p.th.level * 10;
    for (const b of p.blds) if (b.type === 'unterkunft' && b.level >= 1) cap += b.level * 8;
    p.supplyCap = Math.min(200, cap);
    let used = 0, army = 0;
    for (const e of S.ents) if (!e.dead && e.owner === p.id && e.kind === 'unit') { used += e.supply || 0; army += e.supply || (e.merc ? 2 : 0); }
    for (const b of p.blds) if (b.prod) used += G.UNIT_BASE[b.prod.role].supply;
    p.supplyUsed = used;
    p.armySupply = army;
  }

  // -------------------------------------------------------------------------
  // KI: Basisbau (auch Autopilot für den Spieler)
  G.GOALS = (function () {
    const g = [];
    // Je Haupthaus-Stufe: erst Wirtschaft & Kaserne, dann Haupthaus aufwerten, dann den Rest nachziehen.
    for (let t = 1; t <= 5; t++) {
      G.BUILD_ORDER.forEach((type, i) => {
        const lim = G.LIMITS[type][t - 1];
        for (let n = 1; n <= lim; n++) g.push({ type, n, level: t });
        if (i === 3 && t < 5) g.push({ type: 'haupthaus', n: 1, level: t + 1 });
      });
    }
    return g;
  })();

  function findSpot(p, type) {
    const def = G.BUILDINGS[type];
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
        let s;
        if (defense) s = Math.abs(d - (G.BASE_RADIUS - 70)) * 0.6 - front * 160 + Math.random() * 30;
        else s = d - front * 25 + Math.random() * 12 + (def.size === 1 ? 0 : 0);
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
      for (const goal of G.GOALS) {
        if (goal.type === 'haupthaus') {
          if (th >= goal.level) continue;
          if (p.th.upgrading) continue;
          const c = G.costOf('haupthaus', th + 1);
          if (G.canAfford(p, c)) { G.upgradeBuilding(p, p.th); return; }
          p.reserve = c; break;
        }
        if (goal.level > th) break;
        const list = p.blds.filter((b) => b.type === goal.type);
        const ok = list.filter((b) => (b.upgrading ? b.upgrading.to : b.level) >= goal.level).length;
        if (ok >= goal.n) continue;
        if (list.length < goal.n) {
          if (list.length >= G.maxCount(p, goal.type)) continue;
          const c = G.costOf(goal.type, 1);
          if (G.canAfford(p, c)) {
            const pos = findSpot(p, goal.type);
            if (!pos) continue;
            G.placeBuilding(p, goal.type, pos.x, pos.y, 0);
            return;
          }
          p.reserve = c; break;
        } else {
          const cand = list.filter((b) => !b.upgrading && b.level < goal.level && b.level < th && b.level >= 1).sort((a, b) => a.level - b.level)[0];
          if (!cand) continue;
          const c = G.costOf(goal.type, cand.level + 1);
          if (G.canAfford(p, c)) { G.upgradeBuilding(p, cand); return; }
          p.reserve = c; break;
        }
      }
    }
    // Forschung
    if (!p.researching) {
      const lines = Object.keys(G.RESEARCH).sort((a, b) => p.research[a] - p.research[b]);
      for (const l of lines) {
        if (G.researchCheck(p, l)) continue;
        if (canSpend(p, G.researchCost(p.research[l] + 1), false)) { G.startResearch(p, l); break; }
      }
    }
  }

  // -------------------------------------------------------------------------
  // KI: Armeeführung
  function findThreat(p) {
    let sx = 0, sy = 0, n = 0;
    G.query(p.base.x, p.base.y, G.BASE_RADIUS + 220, (o) => {
      if (o.dead || o.team === p.team || o.kind === 'building' || o.kind === 'creep') return;
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
    // Mit Verbündeten koordinieren
    const ally = S.players.find((o) => o !== p && o.alive && o.team === p.team && o.armyState === 'angriff' && o.targetPlayer && o.targetPlayer.alive);
    if (ally) return ally.targetPlayer;
    if (!p.human && p.diff.focus) {
      return foes.reduce((a, b) => (b.th.hp + b.armySupply * 40 + dist(b.base, p.base) * 0.3 < a.th.hp + a.armySupply * 40 + dist(a.base, p.base) * 0.3 ? b : a));
    }
    return foes.reduce((a, b) => (dist(b.base, p.base) < dist(a.base, p.base) ? b : a));
  }
  function attackPoint(p, units) {
    if (!p.targetPlayer || !p.targetPlayer.alive) p.targetPlayer = chooseTarget(p);
    const tp = p.targetPlayer;
    if (!tp) return null;
    const c = p.armyCentroid || p.rally;
    let best = null, bd = Infinity;
    for (const b of tp.blds) { if (b.dead) continue; const dd = d2(b.x, b.y, c.x, c.y); if (dd < bd) { bd = dd; best = b; } }
    return best ? { x: best.x, y: best.y } : { x: tp.base.x, y: tp.base.y };
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
  function armyThink(p) {
    const units = S.ents.filter((e) => !e.dead && e.kind === 'unit' && e.owner === p.id);
    if (units.length) {
      let sx = 0, sy = 0;
      for (const u of units) { sx += u.x; sy += u.y; }
      p.armyCentroid = { x: sx / units.length, y: sy / units.length };
    } else p.armyCentroid = null;
    const sup = p.armySupply;
    const threat = findThreat(p);
    const mode = p.human ? p.armyMode : 'auto';
    if (mode === 'auto') {
      if (threat) { p.armyState = 'verteidigen'; p.armyPoint = threat; p.campTarget = null; return; }
      if (p.armyState === 'verteidigen') p.armyState = 'sammeln';
      const threshold = Math.max(10, p.supplyCap * p.attackFrac);
      const canAttack = sup >= threshold && S.time >= p.minAttack;
      if (p.armyState === 'angriff') {
        if (sup < p.attackStart * 0.35) { p.armyState = 'sammeln'; if (p.human) G.msg('Armee zieht sich zum Sammelpunkt zurück.', ''); }
        else { p.armyPoint = attackPoint(p, units); if (p.armyPoint) return; p.armyState = 'sammeln'; }
      }
      if (canAttack) {
        p.armyState = 'angriff'; p.attackStart = sup; p.campTarget = null;
        p.targetPlayer = chooseTarget(p);
        p.armyPoint = attackPoint(p, units);
        if (p.human) G.msg(`Deine Armee greift ${p.targetPlayer ? p.targetPlayer.name : ''} an!`, 'gold');
        else if (p.targetPlayer && p.targetPlayer.human) G.msg(`${p.name} greift dich an!`, 'bad');
        return;
      }
      if (p.armyState === 'camps' && p.campTarget && p.campTarget.left > 0) {
        if (sup < p.campStart * 0.45) { // Rückzug, das Lager ist zu stark
          p.campTarget.avoid = p.campTarget.avoid || {};
          p.campTarget.avoid[p.id] = S.time + 120;
          if (p.human) G.msg(`Rückzug vom ${p.campTarget.name} – zu stark!`, 'bad');
        } else { p.armyPoint = { x: p.campTarget.x, y: p.campTarget.y }; return; }
      }
      p.campTarget = null;
      if (p.campsAllowed && units.length >= 3) {
        const c = chooseCamp(p, units);
        if (c) { p.armyState = 'camps'; p.campTarget = c; p.campStart = sup; p.armyPoint = { x: c.x, y: c.y }; return; }
      }
      p.armyState = 'sammeln'; p.armyPoint = p.rally;
      return;
    }
    // Manuelle Modi des Spielers
    p.armyState = mode;
    if (mode === 'sammeln') { p.armyPoint = p.rally; p.campTarget = null; }
    else if (mode === 'verteidigen') { p.armyPoint = threat || p.rally; p.campTarget = null; }
    else if (mode === 'angriff') {
      p.campTarget = null;
      if (p.manualPoint) p.armyPoint = p.manualPoint;
      else { p.armyPoint = attackPoint(p, units) || p.rally; }
    } else if (mode === 'camps') {
      if (!p.campTarget || p.campTarget.left <= 0) p.campTarget = chooseCamp(p, units, false) || chooseCamp(p, units, true);
      p.armyPoint = p.campTarget ? { x: p.campTarget.x, y: p.campTarget.y } : p.rally;
    }
  }

  // -------------------------------------------------------------------------
  // Volksfähigkeiten
  function enemyClusterNearArmy(p) {
    const own = S.ents.filter((e) => !e.dead && e.owner === p.id && e.kind !== 'building');
    const foes = new Set();
    for (let i = 0; i < own.length; i += Math.max(1, Math.floor(own.length / 12))) {
      G.query(own[i].x, own[i].y, 450, (o) => { if (!o.dead && o.team !== p.team && o.kind !== 'building' && (o.kind !== 'creep' || o.camp.active)) foes.add(o); });
    }
    G.query(p.base.x, p.base.y, G.BASE_RADIUS + 200, (o) => { if (!o.dead && o.team !== p.team && o.kind !== 'building' && o.kind !== 'creep') foes.add(o); });
    return bestCluster(null, [...foes], 130);
  }
  G.raceAbilityCheck = function (p) {
    if (!p.alive) return 'Besiegt';
    if (p.abilityT > 0) return `Lädt (${Math.ceil(p.abilityT)} s)`;
    return null;
  };
  G.castRaceAbility = function (p) {
    if (G.raceAbilityCheck(p)) return false;
    const ab = p.rd.ability;
    const own = S.ents.filter((e) => !e.dead && e.owner === p.id && e.kind !== 'building');
    switch (ab.id) {
      case 'banner': p.buffs.push({ t: 15, mods: { dmg: 0.25, armor: 3 }, name: ab.name }); break;
      case 'blutrausch': p.buffs.push({ t: 12, mods: { atkspd: 0.4, speed: 0.2 }, name: ab.name }); break;
      case 'mondsegen':
        for (const e of own) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5); S.fx.push({ type: 'spark', x: e.x, y: e.y, t: 0, dur: 0.8, color: '#c8f0ff' }); }
        break;
      case 'erweckung': {
        const c = enemyClusterNearArmy(p);
        const at = c || p.armyCentroid || p.rally;
        for (let i = 0; i < 6; i++) makeSummon(p, { name: 'Skelettkrieger', hp: 230, dmg: 17, range: 24, cd: 1.0, speed: 65, armor: 1, r: 10 }, at.x + rand(-50, 50), at.y + rand(-50, 50), 45);
        break;
      }
      case 'moerser': {
        const c = enemyClusterNearArmy(p);
        if (!c) { if (p.human) G.msg('Keine Gegner in Reichweite deiner Armee.', 'bad'); return false; }
        for (let i = 0; i < 8; i++) {
          const x = c.x + rand(-70, 70), y = c.y + rand(-70, 70);
          S.timers.push({ t: 0.5 + i * 0.22, fn: () => {
            S.fx.push({ type: 'blast', x, y, r: 70, color: '#ffb040', t: 0, dur: 0.5 });
            G.query(x, y, 70, (o) => { if (!o.dead && o.team !== p.team) dealDamage(p.th, o, 110); });
          } });
          S.fx.push({ type: 'mark', x, y, r: 60, t: 0, dur: 0.5 + i * 0.22, color: '#ff5030' });
        }
        break;
      }
      case 'hoellenfeuer': {
        const c = enemyClusterNearArmy(p);
        if (!c) { if (p.human) G.msg('Keine Gegner in Reichweite deiner Armee.', 'bad'); return false; }
        S.fx.push({ type: 'mark', x: c.x, y: c.y, r: 130, t: 0, dur: 1.0, color: '#ff3010' });
        S.fx.push({ type: 'meteor', x: c.x, y: c.y, t: 0, dur: 1.0 });
        S.timers.push({ t: 1.0, fn: () => {
          S.fx.push({ type: 'boom', x: c.x, y: c.y, r: 130, t: 0, dur: 1.0 });
          G.query(c.x, c.y, 130, (o) => { if (!o.dead && o.team !== p.team) { dealDamage(p.th, o, 260); o.stun = Math.max(o.stun || 0, 1.2); } });
          makeSummon(p, { name: 'Infernal', hp: 1600, dmg: 50, range: 30, cd: 1.3, speed: 55, armor: 6, r: 18 }, c.x, c.y, 35);
        } });
        break;
      }
    }
    p.abilityT = ab.cd;
    if (p.human) G.msg(`${ab.name}!`, 'gold');
    else S.fx.push({ type: 'text', x: (p.armyCentroid || p.base).x, y: (p.armyCentroid || p.base).y - 40, text: ab.name, color: '#ff8080', t: 0, dur: 1.6, big: true });
    return true;
  };
  function abilityThink(p) {
    if (p.abilityT > 0) return;
    if (!p.human && Math.random() > p.diff.abilityChance) return;
    const own = S.ents.filter((e) => !e.dead && e.owner === p.id && (e.kind === 'unit' || e.kind === 'hero'));
    if (own.length < 4) return;
    const fighting = own.filter((e) => e.target && e.target.kind !== 'building' && !e.target.dead).length;
    if (p.rd.ability.id === 'mondsegen') {
      let miss = 0, max = 0;
      for (const e of own) { miss += e.maxHp - e.hp; max += e.maxHp; }
      if (miss / max > 0.3 && fighting >= 3) G.castRaceAbility(p);
      return;
    }
    if (fighting >= Math.min(6, Math.max(3, own.length * 0.4))) G.castRaceAbility(p);
  }

  // -------------------------------------------------------------------------
  // Hauptschleife
  function updatePlayer(p, dt) {
    if (!p.alive) return;
    p.blds = p.blds.filter((b) => !b.dead);
    updateSupply(p);
    updateEconomy(p, dt);
    updateProduction(p, dt);
    if (p.abilityT > 0) p.abilityT -= dt;
    for (const b of p.buffs) b.t -= dt;
    p.buffs = p.buffs.filter((b) => b.t > 0);
    // Wiederbelebung des Helden
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
    }
    p.armyT -= dt;
    if (p.armyT <= 0) { p.armyT = 1; armyThink(p); }
    p.abilT -= dt;
    if (p.abilT <= 0) { p.abilT = 0.7; if (p.auto.ability) abilityThink(p); }
  }

  function step(dt) {
    S.time += dt;
    S.tick = (S.tick || 0) + 1;
    buildGrid();
    S.bonusT -= dt;
    if (S.bonusT <= 0) { S.bonusT = 1; updateBonusCaches(); }
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
    for (const tm of S.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
    S.timers = S.timers.filter((t) => !t.done);
    for (const c of S.camps) {
      if (c.activeT > 0) { c.activeT -= dt; if (c.activeT <= 0) c.active = false; }
      if (c.left <= 0) {
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
    S.ents = S.ents.filter((e) => !e.dead);
    S.victoryT -= dt;
    if (S.victoryT <= 0) { S.victoryT = 1; checkVictory(); }
  }

  function checkVictory() {
    if (S.over) return;
    const me = human();
    if (!me.alive) { S.over = { win: false, time: S.time }; return; }
    const teams = new Set(S.players.filter((p) => p.alive).map((p) => p.team));
    if (teams.size === 1) S.over = { win: teams.has(me.team), time: S.time };
  }

  G.update = function (realDt) {
    if (!S || S.paused || S.over) return;
    let t = Math.min(realDt, 0.1) * S.speed;
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
})();
