'use strict';
// Reichsfeuer: Festungen – Spielstand, Echtzeit-Wirtschaft (läuft weiter, auch wenn niemand spielt), Bauen, Truppen,
// Schmiede, Held, Raubzüge, Feldzug und Überfälle auf die eigene Festung. Ohne Seitenaufbau: die Oberfläche steckt
// in festung-ui.js, damit sich alles hier auch ohne Browser testen lässt.
(function () {
  const F = G.F, T = G.TILE;
  const KEY = 'reichsfeuer.festung.v1';
  F.now = () => Date.now();
  const store = () => { try { return window.localStorage; } catch (e) { return null; } };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const bname = (race, type) => (type === 'mauer' ? 'Mauer' : G.bname(race, type));
  F.bname = bname;

  // -------------------------------------------------------------------------
  // Spielstand
  F.st = null;
  F.newState = function (race, hero, name) {
    const now = F.now();
    const st = {
      v: 1, race, hero, name: name || F.nameFor(race), created: now, seen: now, seed: (Math.random() * 1e9) | 0,
      gold: 1000, wood: 800, blds: [], walls: [], nextId: 1, army: { nahkampf: 4 }, queue: [], trainStart: 0,
      research: { waffen: 0, ruestung: 0, ausbildung: 0 }, researching: null,
      heroSt: { level: 1, xp: 0, ult: -1, ranks: [], talents: {}, talentPoints: 0, restUntil: 0, pref: Math.random() < 0.5 ? 0 : 1 },
      ruhm: 0, bestRuhm: 0, camp: {}, reports: [], shieldUntil: 0,
      stats: { raids: 0, wins: 0, defenses: 0, held: 0, lootG: 0, lootW: 0, built: 0 },
      settings: { music: 0.5, sfx: 0.7, muted: false }, tips: {},
    };
    const add = (type, tx, ty) => st.blds.push({ id: st.nextId++, type, level: 1, tx, ty, up: null, acc: 0, accT: now });
    add('haupthaus', 13, 13); add('goldmine', 8, 9); add('saegewerk', 20, 9); add('unterkunft', 8, 19); add('kaserne', 20, 19); add('turm', 17, 14);
    return st;
  };
  F.load = function () {
    try {
      const s = store(), d = s && s.getItem(KEY);
      if (!d) return null;
      const st = JSON.parse(d);
      return st && st.v === 1 && st.blds ? st : null;
    } catch (e) { return null; }
  };
  F.save = function (st) {
    st = st || F.st; if (!st) return false;
    st.seen = F.now();
    try { store().setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; }
  };
  F.wipe = function () { try { store().removeItem(KEY); } catch (e) { /* egal */ } F.st = null; };
  F.exportText = (st) => JSON.stringify(st || F.st);
  F.importText = function (txt) {
    const st = JSON.parse(txt);
    if (!st || st.v !== 1 || !Array.isArray(st.blds) || !G.RACES[st.race]) throw new Error('Kein Spielstand von Reichsfeuer: Festungen');
    return st;
  };

  // -------------------------------------------------------------------------
  // Abgeleitete Werte
  F.thB = (st) => st.blds.find((b) => b.type === 'haupthaus');
  F.th = (st) => Math.max(1, F.thB(st).level);
  F.count = (st, type) => (type === 'mauer' ? st.walls.length : st.blds.filter((b) => b.type === type).length);
  F.limit = (st, type) => F.LIMITS[type][F.th(st) - 1];
  F.cap = function (st) {
    const th = F.th(st);
    let g = F.STORE_TH[th - 1], w = F.STORE_TH[th - 1];
    for (const b of st.blds) if (b.level > 0) { if (b.type === 'schatzkammer') g += F.STORE[b.level - 1]; else if (b.type === 'holzlager') w += F.STORE[b.level - 1]; }
    return { g, w };
  };
  F.housing = (st) => st.blds.reduce((n, b) => n + (b.type === 'unterkunft' && b.level > 0 ? F.HOUSE[b.level - 1] : 0), F.HOUSE_TH);
  // ein Spieler-Ersatz für die Rechenhilfen der Engine (Einheitenwerte, Kosten)
  const pseudoCache = {};
  F.pseudo = (race) => pseudoCache[race] || (pseudoCache[race] = { race, rd: G.RACES[race], teco: {}, th: { level: 1 }, talents: {} });
  F.ub = (st, role) => G.unitBase(F.pseudo(st.race), role);
  F.supplyOf = (st, role) => F.ub(st, role).supply;
  F.armyUsed = (st) => {
    let n = 0;
    for (const r in st.army) n += st.army[r] * F.supplyOf(st, r);
    for (const r of st.queue) n += F.supplyOf(st, r);
    return n;
  };
  F.armyCount = (st) => Object.values(st.army).reduce((a, b) => a + b, 0);
  F.unitCost = (st, role) => G.unitCost(F.pseudo(st.race), role);
  F.busy = (st) => st.blds.filter((b) => b.up).length;
  F.buildersTotal = (st) => F.builders(F.th(st)) + (st.heroSt.talents.gilde ? 1 : 0);
  F.buildersFree = (st) => F.buildersTotal(st) - F.busy(st);
  F.afford = (st, c) => st.gold >= c.g && st.wood >= c.w;
  const pay = (st, c) => { st.gold -= c.g; st.wood -= c.w; };
  F.gain = function (st, g, w) { // nur so viel, wie in die Lager passt
    const cap = F.cap(st), ag = Math.max(0, Math.min(g, cap.g - st.gold)), aw = Math.max(0, Math.min(w, cap.w - st.wood));
    st.gold += ag; st.wood += aw;
    return { g: Math.round(ag), w: Math.round(aw) };
  };
  // Freischaltung einer Truppenrolle und ihre Stufe (je höher das ausbildende Gebäude, desto stärker die Krieger)
  F.roleInfo = function (st, role) {
    const rd = G.RACES[st.race], src = F.roleSource(rd, role);
    if (!src) return { ok: false, why: 'Unbekannt' };
    const best = Math.max(0, ...st.blds.filter((b) => b.type === src[0]).map((b) => b.level));
    if (!best) return { ok: false, why: `Benötigt ${bname(st.race, src[0])}`, src };
    if (best < src[1]) return { ok: false, why: `Benötigt ${bname(st.race, src[0])} Stufe ${src[1]}`, src };
    return { ok: true, level: Math.min(5, 1 + best - src[1]), src };
  };
  F.roles = (st) => F.ROLE_ORDER.filter((r) => G.RACES[st.race].units[r]);
  F.heroDef = (st) => { const rd = G.RACES[st.race]; return rd.heroes.find((h) => h.id === st.hero) || rd.heroes[0]; };
  F.heroReady = (st) => F.now() >= (st.heroSt.restUntil || 0);
  F.heroRestLeft = (st) => Math.max(0, ((st.heroSt.restUntil || 0) - F.now()) / 1000);
  F.heroXpFrac = (h) => { const a = h.level > 1 ? G.HERO_XP(h.level - 1) : 0, b = G.HERO_XP(h.level); return h.level >= G.HERO_MAX ? 1 : clamp((h.xp - a) / (b - a), 0, 1); };

  // -------------------------------------------------------------------------
  // Zeit: Bauarbeiten, Förderung, Ausbildung und Forschung laufen in echter Zeit (auch ohne geöffnete Seite)
  // Förderung je Minute inkl. Volksbonus (z. B. Handelsgilden der Menschen) und Talenten des Helden
  F.mineRate = function (st, b) {
    const eco = (G.RACES[st.race].passive.eco) || {}, t = st.heroSt.talents || {};
    const pct = b.type === 'goldmine' ? (eco.goldPct || 0) + (t.arbeiter ? 0.1 : 0) : (eco.woodPct || 0) + (t.holzrecht ? 0.15 : 0);
    return F.rate(b.type, b.level) * (1 + pct);
  };
  F.mineBuffer = (st, b) => F.buffer(b.type, b.level) * (F.mineRate(st, b) / Math.max(1, F.rate(b.type, b.level)) || 1);
  function mineAcc(b, now) {
    if (b.accT && now < b.accT) return; // keine Zeitreise rückwärts
    const r = curSt ? F.mineRate(curSt, b) : F.rate(b.type, b.level);
    if (r) b.acc = Math.min(curSt ? F.mineBuffer(curSt, b) : F.buffer(b.type, b.level), (b.acc || 0) + (r * Math.max(0, now - (b.accT || now))) / 60000);
    b.accT = now;
  }
  let curSt = null;
  F.tick = function (st, now) {
    now = now || F.now();
    curSt = st;
    const ev = [];
    for (const b of st.blds) if (b.up && now >= b.up.end) {
      mineAcc(b, b.up.end);
      const isNew = b.level === 0;
      b.level = b.up.to; b.up = null; st.stats.built++;
      ev.push({ kind: 'bau', b, isNew });
    }
    for (const b of st.blds) mineAcc(b, now);
    let trained = 0;
    while (st.queue.length) {
      const role = st.queue[0], dur = F.trainTime(F.ub(st, role)) * 1000;
      if (!st.trainStart) st.trainStart = now;
      if (now - st.trainStart < dur) break;
      st.queue.shift();
      st.army[role] = (st.army[role] || 0) + 1;
      st.trainStart += dur; trained++;
    }
    if (!st.queue.length) st.trainStart = 0;
    if (trained) ev.push({ kind: 'truppen', n: trained });
    if (st.researching && now >= st.researching.end) {
      const line = st.researching.line;
      st.research[line]++; st.researching = null;
      ev.push({ kind: 'forschung', line });
    }
    return ev;
  };

  // -------------------------------------------------------------------------
  // Bauen, Ausbauen, Versetzen, Einsammeln
  F.fits = function (st, type, tx, ty, ignore) {
    const s = F.size(type), N = F.HOME_TILES;
    if (tx < 0 || ty < 0 || tx + s > N || ty + s > N) return false;
    for (const b of st.blds) {
      if (b === ignore) continue;
      const z = F.size(b.type);
      if (tx < b.tx + z && tx + s > b.tx && ty < b.ty + z && ty + s > b.ty) return false;
    }
    for (const w of st.walls) if (w !== ignore && w.tx >= tx && w.tx < tx + s && w.ty >= ty && w.ty < ty + s) return false;
    return true;
  };
  F.firstTH = (type) => F.LIMITS[type].findIndex((x) => x > 0) + 1;
  F.buildCheck = function (st, type) {
    if (type === 'haupthaus') return 'Es gibt nur ein Haupthaus';
    const max = F.limit(st, type), have = F.count(st, type);
    if (!max) return `Ab Haupthaus Stufe ${F.firstTH(type)}`;
    if (have >= max) return `Limit erreicht (${have}/${max}) – Haupthaus ausbauen`;
    if (type !== 'mauer' && F.buildersFree(st) <= 0) return 'Alle Baumeister sind beschäftigt';
    if (!F.afford(st, F.cost(type, 1))) return 'Nicht genug Rohstoffe';
    return null;
  };
  F.build = function (st, type, tx, ty) {
    const why = F.buildCheck(st, type);
    if (why) return { err: why };
    if (!F.fits(st, type, tx, ty)) return { err: 'Hier ist kein Platz' };
    pay(st, F.cost(type, 1));
    const now = F.now();
    if (type === 'mauer') { const w = { tx, ty, level: 1 }; st.walls.push(w); return { w }; }
    const b = { id: st.nextId++, type, level: 0, tx, ty, up: { to: 1, start: now, end: now + F.time(type, 1) * 1000 }, acc: 0, accT: now };
    st.blds.push(b);
    return { b };
  };
  F.maxLevel = (st, b) => (b.type === 'haupthaus' ? F.MAX_TH : Math.min(F.MAX_TH, F.th(st)));
  F.upgradeCheck = function (st, b) {
    if (b.up) return b.level ? 'Wird gerade ausgebaut' : 'Wird gerade gebaut';
    if (b.level >= F.MAX_TH) return 'Höchste Stufe erreicht';
    if (b.level >= F.maxLevel(st, b)) return `Benötigt ${bname(st.race, 'haupthaus')} Stufe ${b.level + 1}`;
    if (F.buildersFree(st) <= 0) return 'Alle Baumeister sind beschäftigt';
    if (!F.afford(st, F.cost(b.type, b.level + 1))) return 'Nicht genug Rohstoffe';
    return null;
  };
  F.upgrade = function (st, b) {
    const why = F.upgradeCheck(st, b);
    if (why) return why;
    const now = F.now(), L = b.level + 1;
    pay(st, F.cost(b.type, L));
    curSt = st; mineAcc(b, now);
    b.up = { to: L, start: now, end: now + F.time(b.type, L) * 1000 };
    return null;
  };
  // Abbrechen: die Hälfte der Kosten kommt zurück; ein neues Gebäude verschwindet wieder
  F.cancel = function (st, b) {
    if (!b.up) return 'Hier wird nicht gebaut';
    const c = F.cost(b.type, b.up.to);
    F.gain(st, Math.round(c.g / 2), Math.round(c.w / 2));
    if (b.level === 0) st.blds.splice(st.blds.indexOf(b), 1);
    else b.up = null;
    return null;
  };
  F.speedLeft = (b) => (b.up ? Math.max(0, (b.up.end - F.now()) / 1000) : 0);
  F.speedPrice = (b) => F.speedCost(F.speedLeft(b));
  F.speedup = function (st, b) {
    if (!b.up) return 'Hier wird nicht gebaut';
    const c = F.speedPrice(b);
    if (st.gold < c) return 'Nicht genug Gold';
    st.gold -= c; b.up.end = F.now();
    return null;
  };
  F.move = function (st, obj, type, tx, ty) {
    if (!F.fits(st, type, tx, ty, obj)) return 'Hier ist kein Platz';
    obj.tx = tx; obj.ty = ty;
    return null;
  };
  F.collect = function (st, b, now) {
    if (!F.RATE[b.type]) return 0;
    curSt = st;
    mineAcc(b, now || F.now());
    const res = b.type === 'goldmine' ? 'g' : 'w', got = F.gain(st, res === 'g' ? Math.floor(b.acc) : 0, res === 'w' ? Math.floor(b.acc) : 0);
    b.acc -= got[res];
    return got[res];
  };
  F.collectAll = function (st) {
    const sum = { g: 0, w: 0 };
    for (const b of st.blds) if (F.RATE[b.type]) sum[b.type === 'goldmine' ? 'g' : 'w'] += F.collect(st, b);
    return sum;
  };
  // Mauern: sofort fertig, ohne Baumeister
  F.wallMax = (st) => F.WALL_MAX[F.th(st) - 1];
  F.wallCheck = function (st, w) {
    if (w.level >= 3) return 'Höchste Stufe erreicht';
    if (w.level >= F.wallMax(st)) return `Benötigt ${bname(st.race, 'haupthaus')} Stufe ${F.WALL_MAX.indexOf(w.level + 1) + 1}`;
    if (!F.afford(st, F.WALL_COST[w.level])) return 'Nicht genug Rohstoffe';
    return null;
  };
  F.upgradeWall = function (st, w) { const why = F.wallCheck(st, w); if (why) return why; pay(st, F.WALL_COST[w.level]); w.level++; return null; };
  F.upgradeWalls = function (st, level) { // alle Mauern einer Stufe, so weit das Geld reicht
    let n = 0;
    for (const w of st.walls) if (w.level === level && !F.wallCheck(st, w)) { F.upgradeWall(st, w); n++; }
    return n;
  };
  F.removeWall = function (st, w) { const i = st.walls.indexOf(w); if (i >= 0) st.walls.splice(i, 1); };

  // -------------------------------------------------------------------------
  // Truppen ausbilden
  F.trainCheck = function (st, role) {
    const ri = F.roleInfo(st, role);
    if (!ri.ok) return ri.why;
    if (F.armyUsed(st) + F.supplyOf(st, role) > F.housing(st)) return 'Keine Truppenplätze frei – Unterkunft bauen oder ausbauen';
    if (!F.afford(st, F.unitCost(st, role))) return 'Nicht genug Rohstoffe';
    return null;
  };
  F.train = function (st, role) {
    const why = F.trainCheck(st, role);
    if (why) return why;
    pay(st, F.unitCost(st, role));
    if (!st.queue.length) st.trainStart = F.now();
    st.queue.push(role);
    return null;
  };
  F.untrain = function (st, idx) {
    const role = st.queue[idx];
    if (!role) return;
    const c = F.unitCost(st, role);
    st.queue.splice(idx, 1);
    F.gain(st, c.g, c.w);
    if (idx === 0) st.trainStart = st.queue.length ? F.now() : 0;
  };
  F.queueLeft = function (st) { // Sekunden bis die ganze Ausbildung fertig ist
    let s = 0;
    st.queue.forEach((r, i) => { const d = F.trainTime(F.ub(st, r)); s += i === 0 ? Math.max(0, d - (F.now() - st.trainStart) / 1000) : d; });
    return s;
  };
  F.trainSpeedPrice = (st) => F.speedCost(F.queueLeft(st));
  F.trainSpeedup = function (st) {
    const c = F.trainSpeedPrice(st);
    if (!st.queue.length) return 'Keine Ausbildung';
    if (st.gold < c) return 'Nicht genug Gold';
    st.gold -= c;
    for (const r of st.queue) st.army[r] = (st.army[r] || 0) + 1;
    st.queue = []; st.trainStart = 0;
    return null;
  };
  F.dismiss = function (st, role) { if (st.army[role] > 0) st.army[role]--; };

  // -------------------------------------------------------------------------
  // Schmiede
  F.smithLevel = (st) => Math.max(0, ...st.blds.filter((b) => b.type === 'schmiede').map((b) => b.level));
  F.researchCheck = function (st, line) {
    const sl = F.smithLevel(st), L = st.research[line] + 1;
    if (!sl) return `Benötigt ${bname(st.race, 'schmiede')}`;
    if (st.researching) return 'Es läuft bereits eine Forschung';
    if (L > 5) return 'Höchste Stufe erreicht';
    if (L > sl) return `Benötigt ${bname(st.race, 'schmiede')} Stufe ${L}`;
    if (!F.afford(st, F.researchCost(L))) return 'Nicht genug Rohstoffe';
    return null;
  };
  F.research = function (st, line) {
    const why = F.researchCheck(st, line);
    if (why) return why;
    const L = st.research[line] + 1, now = F.now();
    pay(st, F.researchCost(L));
    st.researching = { line, start: now, end: now + F.researchTime(L) * 1000 };
    return null;
  };
  F.researchLeft = (st) => (st.researching ? Math.max(0, (st.researching.end - F.now()) / 1000) : 0);
  F.researchSpeedup = function (st) {
    if (!st.researching) return 'Keine Forschung';
    const c = F.speedCost(F.researchLeft(st));
    if (st.gold < c) return 'Nicht genug Gold';
    st.gold -= c; st.researching.end = F.now();
    return null;
  };
  F.heroSpeedup = function (st) {
    const c = F.speedCost(F.heroRestLeft(st));
    if (!c) return 'Der Held ist bereit';
    if (st.gold < c) return 'Nicht genug Gold';
    st.gold -= c; st.heroSt.restUntil = 0;
    return null;
  };

  // -------------------------------------------------------------------------
  // Szenen
  const plotRect = (tiles, margin) => ({ x: margin * T, y: margin * T, w: tiles * T, h: tiles * T });
  F.tileCenter = (P, type, tx, ty) => { const s = F.size(type); return { x: P.x + (tx + s / 2) * T, y: P.y + (ty + s / 2) * T }; };
  F.themeOf = (race) => G.RACES[race].map.theme;
  // Ausrichtung eines Mauerstücks nach seinen Nachbarn (waagrecht oder senkrecht)
  F.wallAng = function (set, w) {
    const has = (x, y) => set.has(x + ',' + y);
    const hz = has(w.tx - 1, w.ty) || has(w.tx + 1, w.ty), vt = has(w.tx, w.ty - 1) || has(w.tx, w.ty + 1);
    return vt && !hz ? 0 : -Math.PI / 2;
  };
  const heroState = (st) => ({ level: st.heroSt.level, xp: st.heroSt.xp, ult: st.heroSt.ult, ranks: st.heroSt.ranks });
  function wallDefs(walls, P, owner) {
    const set = new Set(walls.map((w) => w.tx + ',' + w.ty));
    return walls.map((w) => { const c = F.tileCenter(P, 'mauer', w.tx, w.ty); return { owner, type: 'mauer', level: w.level, x: c.x, y: c.y, ang: F.wallAng(set, w), fid: 'w' + w.tx + ',' + w.ty }; });
  }

  // Die eigene Festung (ruhend: nur Tiere, Effekte und die Bauanzeigen bewegen sich)
  F.homeScene = function (st) {
    const N = F.HOME_TILES, M = F.HOME_MARGIN, P = plotRect(N, M), W = (N + 2 * M) * T;
    const tb = F.thB(st), thC = F.tileCenter(P, 'haupthaus', tb.tx, tb.ty);
    const S = F.withSeed(st.seed, () => G.newScene({
      w: W, h: W, bldHp: F.BLD_HP, towerDmg: F.TOWER_DMG, theme: F.themeOf(st.race), plot: P,
      players: [{ race: st.race, hero: st.hero, team: 0, human: true, base: { x: thC.x, y: thC.y + 2.5 * T }, withHero: true, heroInField: true,
        heroState: heroState(st), research: st.research, thLevel: F.th(st), talents: st.heroSt.talents, talentPoints: st.heroSt.talentPoints }],
      blds: [],
    }));
    S.festung = 'home'; S.home = { P, W };
    F.syncHome(st, S, true);
    return S;
  };
  // Gebäude und Mauern der Szene an den Spielstand angleichen (ohne die Landschaft neu zu würfeln)
  F.syncHome = function (st, S, armyToo) {
    const p = S.players[0], P = S.home.P, now = F.now();
    const want = new Map();
    for (const b of st.blds) want.set(b.id, b);
    const keep = [];
    for (const e of S.ents) {
      if (e.kind !== 'building') { keep.push(e); continue; }
      if (e.type === 'mauer') continue; // Mauern werden unten neu gesetzt
      const b = want.get(e.fid);
      if (!b || b.type !== e.type) continue;
      want.delete(e.fid);
      syncB(e, b);
      keep.push(e);
    }
    S.ents = keep;
    p.blds = keep.filter((e) => e.kind === 'building');
    for (const b of want.values()) { const c = F.tileCenter(P, b.type, b.tx, b.ty); const e = G._makeBuilding(p, b.type, c.x, c.y, b.level); e.fid = b.id; syncB(e, b); }
    for (const d of wallDefs(st.walls, P, 0)) { const e = G._makeWall(p, d.x, d.y, d.level, d.ang); e.fid = d.fid; e.rec = st.walls.find((w) => 'w' + w.tx + ',' + w.ty === d.fid); }
    const th = p.blds.find((e) => e.type === 'haupthaus');
    if (th) p.th = th;
    function syncB(e, b) {
      const c = F.tileCenter(P, b.type, b.tx, b.ty);
      e.x = c.x; e.y = c.y; e.rec = b;
      if (e.level !== b.level) { e.level = b.level; e.maxHp = G._bldMaxHp(p, b.type, Math.max(1, b.level)); }
      e.hp = e.maxHp;
      e.upgrading = b.up ? { to: b.up.to, t: Math.max(0, (now - b.up.start) / 1000), total: Math.max(1, (b.up.end - b.up.start) / 1000) } : null;
    }
    if (armyToo) F.placeArmy(st, S);
  };
  // Truppen stehen am Lagerplatz neben der Unterkunft, der Held vor dem Haupthaus
  F.placeArmy = function (st, S) {
    const p = S.players[0];
    S.ents = S.ents.filter((e) => e.kind !== 'unit');
    const camp = S.ents.find((e) => e.kind === 'building' && e.type === 'unterkunft' && e.level > 0) || p.th;
    const roles = [];
    for (const r of F.roles(st)) for (let i = 0; i < Math.min(st.army[r] || 0, 6); i++) roles.push(r);
    roles.slice(0, 24).forEach((r, i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const x = camp.x - 2 * T + col * 0.8 * T + (row % 2) * 0.4 * T, y = camp.y + camp.r + 0.7 * T + row * 0.7 * T;
      const e = G._makeUnit(p, r, x, y, 1); e.face = 1.35; e.home = { x, y };
    });
    S.fx = S.fx.filter((f) => f.type !== 'dust');
    const h = p.hero;
    if (h) {
      const ready = F.heroReady(st);
      if (ready && !S.ents.includes(h)) S.ents.push(h);
      if (!ready) S.ents = S.ents.filter((e) => e !== h);
      h.dead = !ready; h.x = p.th.x + 2.3 * T; h.y = p.th.y + 1.3 * T; h.face = 2.4; h.hp = h.maxHp;
    }
  };

  // -------------------------------------------------------------------------
  // Raubzug: Zielwahl
  F.researchFor = (th) => ({ waffen: Math.max(0, th - 1), ruestung: Math.max(0, th - 2), ausbildung: Math.max(0, th - 1) });
  F.findTarget = function (st, free) {
    const th = F.th(st);
    if (!free) {
      const c = F.searchCost(th);
      if (st.gold < c) return { err: 'Nicht genug Gold für die Suche' };
      st.gold -= c;
    }
    const tth = clamp(th + pick(th >= 2 ? [-1, 0, 0, 0, st.ruhm > 300 ? 1 : 0] : [0]), 1, 5);
    const seed = (Math.random() * 1e9) | 0;
    const tgt = F.genSettlement({ th: tth, seed, lootMul: rnd(0.6, 1.3), hero: tth >= 2 && Math.random() < 0.5 ? clamp(tth * 2 - 1 + Math.round(rnd(-1, 1)), 1, 10) : 0,
      guard: tth >= 3 && Math.random() < 0.4 ? tth - 1 : 0 });
    tgt.ruhm = Math.max(0, Math.round(st.ruhm + rnd(-60, 60)));
    tgt.kind = 'pluendern';
    return { tgt };
  };
  F.campUnlocked = (st, i) => i === 0 || (st.camp[i - 1] || 0) >= 1;
  F.campaignTarget = function (st, i) {
    const c = F.CAMPAIGN[i], first = !(st.camp[i] >= 1);
    const tgt = F.genSettlement({ th: c.th, seed: c.seed, race: c.race, lootMul: first ? c.loot : 0.25, hero: c.hero || 0, guard: c.guard || 0, name: c.name });
    tgt.kind = 'feldzug'; tgt.stage = i; tgt.ruhm = st.ruhm;
    return tgt;
  };

  // Raubzug-Szene: gegnerische Siedlung in der Mitte, rundherum Land zum Absetzen der Truppen
  F.raidScene = function (st, tgt) {
    const N = F.RAID_TILES, M = F.RAID_MARGIN, P = plotRect(N, M), W = (N + 2 * M) * T;
    const tb = tgt.blds[0], thC = F.tileCenter(P, 'haupthaus', tb.tx, tb.ty);
    const blds = tgt.blds.map((b, i) => { const c = F.tileCenter(P, b.type, b.tx, b.ty); return { owner: 1, type: b.type, level: b.level, x: c.x, y: c.y, fid: i, loot: b.loot || null }; })
      .concat(wallDefs(tgt.walls, P, 1));
    const S = F.withSeed(tgt.seed || 7, () => G.newScene({
      w: W, h: W, bldHp: F.BLD_HP, towerDmg: F.TOWER_DMG, theme: F.themeOf(tgt.race), plot: P, raid: { kind: tgt.kind },
      players: [
        { race: st.race, hero: st.hero, team: 0, human: true, base: { x: W / 2, y: W - T }, withHero: true, heroInField: false,
          heroState: heroState(st), research: st.research, thLevel: F.th(st), talents: st.heroSt.talents, talentPoints: st.heroSt.talentPoints },
        { race: tgt.race, hero: tgt.heroId, team: 1, human: false, base: { x: thC.x, y: thC.y + 2.5 * T }, withHero: tgt.hero > 0, heroInField: true, heroMode: 'basis',
          heroState: { level: tgt.hero || 1 }, research: F.researchFor(tgt.th), thLevel: tgt.th },
      ],
      blds,
    }));
    S.festung = 'raid';
    const me = S.players[0], foe = S.players[1];
    me.talentPref = st.heroSt.pref || 0;
    foe.dir = { x: 0, y: 0 };
    addGuard(foe, tgt.guard, thC);
    const R = startRaid(S, { kind: tgt.kind, tgt, atk: me, def: foe, P, W });
    R.troops = { ...st.army };
    R.heroAvail = F.heroReady(st) && !!me.hero;
    R.unitLvl = {};
    for (const r of F.roles(st)) { const ri = F.roleInfo(st, r); R.unitLvl[r] = ri.ok ? ri.level : 1; }
    R.myTh = F.th(st);
    return R;
  };
  function addGuard(p, n, at) {
    const comp = p.rd.style.comp, roles = ['tank', 'nahkampf', 'fernkampf'].filter((r) => comp[r] > 0);
    for (let i = 0; i < (n || 0); i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2, x = at.x + Math.cos(a) * 2.2 * T, y = at.y + Math.sin(a) * 2.2 * T;
      const e = G._makeUnit(p, roles[i % roles.length], x, y, clamp(Math.ceil(n / 2), 1, 5));
      e.home = { x, y };
    }
  }

  // Verteidigung: die eigene Festung gegen ein KI-Heer (Überfall während der Abwesenheit oder Probeangriff)
  F.defenseScene = function (st, atk, kind) {
    const N = F.HOME_TILES, M = F.HOME_MARGIN, P = plotRect(N, M), W = (N + 2 * M) * T;
    const tb = F.thB(st), thC = F.tileCenter(P, 'haupthaus', tb.tx, tb.ty);
    const loot = stealable(st, kind === 'abwehr');
    const blds = st.blds.map((b) => { const c = F.tileCenter(P, b.type, b.tx, b.ty); return { owner: 0, type: b.type, level: b.level, x: c.x, y: c.y, fid: b.id, loot: loot.get(b.id) || null }; })
      .concat(wallDefs(st.walls, P, 0));
    const ready = F.heroReady(st);
    const S = F.withSeed(st.seed, () => G.newScene({
      w: W, h: W, bldHp: F.BLD_HP, towerDmg: F.TOWER_DMG, theme: F.themeOf(st.race), plot: P, raid: { kind },
      players: [
        { race: st.race, hero: st.hero, team: 0, human: true, base: { x: thC.x, y: thC.y + 2.5 * T }, withHero: ready, heroInField: ready, heroMode: 'basis',
          heroState: heroState(st), research: st.research, thLevel: F.th(st), talents: st.heroSt.talents, talentPoints: st.heroSt.talentPoints },
        { race: atk.race, hero: atk.heroId, team: 1, human: false, base: { x: W / 2, y: T }, withHero: true, heroInField: false, heroState: { level: atk.heroLvl },
          research: F.researchFor(atk.th), thLevel: atk.th, autoAbility: true },
      ],
      blds,
    }));
    S.festung = 'defense';
    const me = S.players[0], foe = S.players[1];
    me.dir = { x: 0, y: 0 };
    if (me.hero && ready) { me.hero.x = thC.x; me.hero.y = thC.y + 2.6 * T; }
    const R = startRaid(S, { kind, tgt: atk, atk: foe, def: me, P, W });
    R.plan = aiPlan(atk, P, W);
    R.troops = {};
    R.heroAvail = true;
    R.ai = true; R.aiT = 0;
    return R;
  };
  // Was ein Angreifer erbeuten kann: 20 % der Lager, 10 % im Haupthaus, die Hälfte der ungesammelten Förderung
  function stealable(st, real) {
    const out = new Map(), cap = F.cap(st), th = F.th(st);
    const part = (res, store, frac) => {
      const total = res === 'g' ? st.gold : st.wood, all = res === 'g' ? cap.g : cap.w;
      const thShare = F.STORE_TH[th - 1] / all;
      const add = (id, v) => { const o = out.get(id) || { g: 0, w: 0 }; o[res] += Math.floor(v); out.set(id, o); };
      add(F.thB(st).id, total * thShare * frac * 0.5);
      for (const b of st.blds) if (b.type === store && b.level > 0) add(b.id, (total * F.STORE[b.level - 1] / all) * frac);
    };
    part('g', 'schatzkammer', 0.2); part('w', 'holzlager', 0.2);
    for (const b of st.blds) if (F.RATE[b.type]) { const o = out.get(b.id) || { g: 0, w: 0 }; o[b.type === 'goldmine' ? 'g' : 'w'] += Math.floor((b.acc || 0) * 0.5); out.set(b.id, o); }
    if (!real) for (const o of out.values()) { o.g = Math.round(o.g); o.w = Math.round(o.w); }
    return out;
  }
  // Angreifer für Überfälle und Probeangriffe: ein Heer, wie es ein Gegner dieser Haupthaus-Stufe ausbilden kann
  F.aiAttacker = function (th, race) {
    race = race || pick(G.RACE_KEYS);
    const rd = G.RACES[race], comp = rd.style.comp, cap = F.HOUSE_TH + F.LIMITS.unterkunft[th - 1] * F.HOUSE[th - 1];
    let budget = cap * rnd(0.62, 0.9);
    const roles = [], avail = F.ROLE_ORDER.filter((r) => {
      if (!rd.units[r] || !comp[r]) return false;
      const src = F.roleSource(rd, r);
      return src && F.LIMITS[src[0]][th - 1] > 0 && src[1] <= th;
    });
    const wsum = avail.reduce((a, r) => a + comp[r], 0);
    for (let guard = 0; budget > 1 && guard < 400; guard++) {
      let x = Math.random() * wsum, role = avail[0];
      for (const r of avail) { x -= comp[r]; if (x <= 0) { role = r; break; } }
      const s = G.unitBase(F.pseudo(race), role).supply;
      if (s > budget) { if (budget < 2) break; continue; }
      budget -= s; roles.push(role);
    }
    const lvl = {};
    for (const r of avail) { const src = F.roleSource(rd, r); lvl[r] = clamp(1 + Math.floor((th - src[1]) / 1.5), 1, 5); }
    return { race, th, roles, lvl, heroId: pick(rd.heroes).id, heroLvl: clamp(th * 2 - 1, 1, 10), name: `${F.nameFor(race)} (${rd.name})`, ruhm: 0 };
  };
  // Aufmarsch der KI: von ein bis zwei Seiten, zuerst Tanks, dann Nahkampf, dann Fernkampf und Flieger
  function aiPlan(atk, P, W) {
    const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, atk.roles.length > 26 ? 2 : 1);
    const phase = { tank: 0, elite: 0.5, nahkampf: 2, fernkampf: 4.5, magier: 5, heiler: 5.5, support: 5.5, beschwoerer: 5, flieger: 6.5 };
    const off = sides.map(() => rnd(-0.25, 0.25) * P.w);
    const at = (side, along) => {
      const m = 70;
      if (side === 0) return { x: P.x + P.w / 2 + along, y: P.y - m };
      if (side === 1) return { x: P.x + P.w + m, y: P.y + P.h / 2 + along };
      if (side === 2) return { x: P.x + P.w / 2 + along, y: P.y + P.h + m };
      return { x: P.x - m, y: P.y + P.h / 2 + along };
    };
    const plan = atk.roles.map((role, i) => {
      const k = i % sides.length, pos = at(sides[k], off[k] + rnd(-180, 180));
      return { t: 1 + (phase[role] || 3) + Math.random() * 2.5, role, x: clamp(pos.x, 20, W - 20), y: clamp(pos.y, 20, W - 20) };
    });
    const hp = at(sides[0], off[0]);
    plan.push({ t: 3.5, role: 'held', x: hp.x, y: hp.y });
    return plan.sort((a, b) => a.t - b.t);
  }

  // -------------------------------------------------------------------------
  // Ablauf eines Kampfes (Raubzug, Feldzug, Überfall, Probeangriff)
  F.raid = null;
  function startRaid(S, o) {
    const blds = S.ents.filter((e) => e.kind === 'building' && e.type !== 'mauer' && e.team === o.def.team);
    const R = {
      ...o, S, started: false, startT: 0, limit: F.RAID_TIME, over: false, result: null, deployed: {}, heroOut: false, used: [false, false, false],
      total: blds.length, destroyed: 0, thDown: false, defTotal: blds.filter((b) => b.type === 'turm' || b.type === 'kanone').length, defDown: 0,
      loot: { g: 0, w: 0 }, lootMax: { g: 0, w: 0 }, lootBy: [], emptyT: 0,
    };
    for (const b of blds) if (b.loot) { R.lootMax.g += b.loot.g; R.lootMax.w += b.loot.w; }
    F.raid = R;
    return R;
  }
  G.onKill = function (t) {
    const R = F.raid;
    if (!R || R.S !== G.S || R.over || t.kind !== 'building' || t.type === 'mauer' || t.team !== R.def.team) return;
    R.destroyed++;
    if (t.type === 'haupthaus') R.thDown = true;
    if (t.type === 'turm' || t.type === 'kanone') R.defDown++;
    if (t.loot && (t.loot.g || t.loot.w)) {
      R.loot.g += t.loot.g; R.loot.w += t.loot.w;
      R.lootBy.push({ fid: t.fid, g: t.loot.g, w: t.loot.w });
      const txt = [t.loot.g ? `+${t.loot.g} Gold` : '', t.loot.w ? `+${t.loot.w} Holz` : ''].filter(Boolean).join('  ');
      G.S.fx.push({ type: 'text', x: t.x, y: t.y - 30, text: txt, color: R.ai ? '#ff8a6a' : '#ffe066', t: 0, dur: 2.2, big: true });
    }
  };
  G.onSceneCheck = function (S, dt) {
    const R = F.raid;
    if (!R || R.S !== S || R.over) return;
    dt = dt || 1 / 30;
    if (R.ai) aiStep(R, dt);
    if (!R.started && S.time > 60) { R.started = true; R.startT = S.time; } // spätestens nach einer Minute läuft die Uhr
    if (R.destroyed >= R.total) return F.endRaid(R, 'alles');
    if (R.started && S.time - R.startT >= R.limit) return F.endRaid(R, 'zeit');
    if (R.started) {
      const alive = S.ents.some((e) => !e.dead && e.team === R.atk.team && (e.kind === 'unit' || e.kind === 'hero'));
      const left = Object.values(R.troops).some((n) => n > 0) || (R.heroAvail && !R.heroOut) || (R.plan && R.plan.length);
      R.emptyT = alive || left ? 0 : R.emptyT + dt;
      if (R.emptyT > 1.5) return F.endRaid(R, 'aufgerieben');
    }
  };
  F.timeLeft = (R) => (R.started ? Math.max(0, R.limit - (R.S.time - R.startT)) : R.limit);
  F.pct = (R) => (R.total ? Math.floor((100 * R.destroyed) / R.total) : 0);
  F.bannersOf = (R) => [F.pct(R) >= 50, R.thDown, R.defTotal > 0 && R.defDown >= R.defTotal];
  // Truppen absetzen: nur außerhalb des Festungsgrunds
  F.canDeploy = (R, x, y) => {
    const P = R.P, m = 6;
    return x > 8 && y > 8 && x < R.W - 8 && y < R.W - 8 && !(x > P.x - m && x < P.x + P.w + m && y > P.y - m && y < P.y + P.h + m);
  };
  F.deploy = function (R, role, x, y) {
    if (R.over) return 'Der Kampf ist vorbei';
    if (!F.canDeploy(R, x, y)) return 'Nur außerhalb des Festungsgrunds absetzen';
    const p = R.atk, S = R.S;
    if (role === 'held') {
      if (!R.heroAvail || R.heroOut || !p.hero) return 'Der Held ist nicht verfügbar';
      const h = p.hero;
      h.dead = false; h.x = x; h.y = y; h.px = x; h.py = y; h.hp = h.maxHp; h.target = null; h.goal = null;
      S.ents.push(h); R.heroOut = true;
      S.fx.push({ type: 'pillar', x, y, r: 30, color: '#ffd23a', t: 0, dur: 1.0 });
    } else {
      if (!(R.troops[role] > 0)) return 'Keine Truppen dieser Art mehr';
      R.troops[role]--;
      const e = G._makeUnit(p, role, x, y, R.unitLvl[role] || 1);
      e.committed = true; e.px = x; e.py = y;
      e.face = Math.atan2(R.P.y + R.P.h / 2 - y, R.P.x + R.P.w / 2 - x);
    }
    R.deployed[role] = (R.deployed[role] || 0) + 1;
    if (!R.started) { R.started = true; R.startT = S.time; }
    G.sfx('bau', x, y, 0.5);
    return null;
  };
  // Volksfähigkeiten: einmal je Kampf, an einer frei gewählten Stelle
  F.abilityCheck = function (R, i) {
    const ab = R.atk.rd.abilities[i];
    if (!ab) return 'Unbekannt';
    if (R.atk.th.level < ab.th) return `ab ${bname(R.atk.race, 'haupthaus')} Stufe ${ab.th}`;
    if (R.used[i]) return 'In diesem Kampf schon eingesetzt';
    if (R.over) return 'Der Kampf ist vorbei';
    if (ab.type !== 'strike' && ab.type !== 'curse' && !R.S.ents.some((e) => !e.dead && e.team === R.atk.team && e.kind !== 'building')) return 'Erst Truppen absetzen';
    return null;
  };
  F.castAt = function (R, i, x, y) {
    const why = F.abilityCheck(R, i);
    if (why) return why;
    const p = R.atk, ab = p.rd.abilities[i], S = R.S;
    if (ab.type === 'strike') {
      const spread = ab.shells > 1 ? 85 : 0;
      for (let k = 0; k < ab.shells; k++) {
        const sx = x + rnd(-spread, spread), sy = y + rnd(-spread, spread), delay = ab.meteor ? 1.0 : 0.5 + k * 0.18;
        S.fx.push({ type: 'mark', x: sx, y: sy, r: ab.radius, t: 0, dur: delay, color: ab.color });
        if (ab.meteor) S.fx.push({ type: 'meteor', x: sx, y: sy, t: 0, dur: delay });
        S.timers.push({ t: delay, kind: 'strike', pid: p.id, ab: i, x: sx, y: sy });
      }
      G.sfx('faehigkeit', x, y, 1, true);
    } else if (ab.type === 'curse') {
      G.query(x, y, ab.radius, (o) => { if (!o.dead && o.team !== p.team) { G.dealDamage(p.th, o, ab.dmg); if (o.kind !== 'building') o.buffs.push({ t: ab.dur, mods: ab.mods }); } });
      S.fx.push({ type: 'blast', x, y, r: ab.radius, color: ab.color, t: 0, dur: 1.2 });
      G.sfx('faehigkeit', x, y, 1, true);
    } else {
      const keep = p.attackCentroid;
      p.attackCentroid = { x, y }; p.abCd[i] = 0;
      const ok = G.castRaceAbility(p, i);
      p.attackCentroid = keep;
      if (!ok) return 'Gerade nicht möglich';
    }
    p.abCd[i] = 1e9; R.used[i] = true;
    if (!R.started) { R.started = true; R.startT = S.time; }
    S.fx.push({ type: 'text', x, y: y - 40, text: ab.name, color: R.ai ? '#ff8080' : '#ffe9a8', t: 0, dur: 1.6, big: true });
    return null;
  };
  // KI des Angreifers: setzt nach Plan ab und wirkt ihre Volksfähigkeiten, wenn es sich lohnt
  function aiStep(R, dt) {
    const S = R.S, p = R.atk;
    while (R.plan.length && R.plan[0].t <= S.time) {
      const d = R.plan.shift();
      if (d.role === 'held') {
        if (!p.hero) continue;
        const h = p.hero; h.dead = false; h.x = d.x; h.y = d.y; h.px = d.x; h.py = d.y; h.hp = h.maxHp; S.ents.push(h); R.heroOut = true;
      } else {
        const e = G._makeUnit(p, d.role, d.x, d.y, R.tgt.lvl[d.role] || 1);
        e.committed = true; e.px = d.x; e.py = d.y;
        R.deployed[d.role] = (R.deployed[d.role] || 0) + 1;
      }
      if (!R.started) { R.started = true; R.startT = S.time; }
    }
    if (!R.started || S.time < R.startT + 8) return;
    R.aiT -= dt;
    if (R.aiT > 0) return;
    R.aiT = 2;
    const own = S.ents.filter((e) => !e.dead && e.team === p.team && (e.kind === 'unit' || e.kind === 'hero'));
    if (!own.length) return;
    const fighting = own.filter((e) => e.target && !e.target.dead).length / own.length;
    let cx = 0, cy = 0, hp = 0, max = 0;
    for (const e of own) { cx += e.x; cy += e.y; hp += e.hp; max += e.maxHp; }
    cx /= own.length; cy /= own.length;
    p.rd.abilities.forEach((ab, i) => {
      if (F.abilityCheck(R, i) || Math.random() < 0.35) return;
      let go = null;
      if (ab.type === 'strike' || ab.type === 'curse') {
        let best = null, bd = 520 * 520;
        for (const b of S.ents) {
          if (b.dead || b.kind !== 'building' || b.team === p.team || b.type === 'mauer') continue;
          const d = (b.x - cx) ** 2 + (b.y - cy) ** 2 * 1 - (b.def.attack ? 160 * 160 : 0);
          if (d < bd) { bd = d; best = b; }
        }
        if (best) go = best;
      } else if (ab.type === 'heal') { if (hp / max < 0.6) go = { x: cx, y: cy }; }
      else if (fighting >= 0.4) go = { x: cx, y: cy };
      if (go) F.castAt(R, i, go.x, go.y);
    });
  }

  // Ende des Kampfes: Ergebnis berechnen (das Anwenden auf den Spielstand übernimmt F.applyResult)
  F.endRaid = function (R, why) {
    if (R.over) return R.result;
    R.over = true;
    const S = R.S;
    S.over = { raid: true, why };
    const banners = F.bannersOf(R), stars = banners.filter(Boolean).length;
    const alive = {};
    for (const e of S.ents) if (!e.dead && e.kind === 'unit' && e.team === R.atk.team && !e.summoned && !e.merc && F.ROLE_ORDER.includes(e.role)) alive[e.role] = (alive[e.role] || 0) + 1;
    const lost = {};
    for (const r in R.deployed) if (r !== 'held') { const l = R.deployed[r] - (alive[r] || 0); if (l > 0) lost[r] = l; }
    const h = R.atk.hero, dh = R.def.hero;
    R.result = {
      kind: R.kind, why, pct: F.pct(R), banners, stars, loot: { ...R.loot }, lootBy: R.lootBy.slice(), lootMax: { ...R.lootMax }, alive, lost, deployed: { ...R.deployed },
      heroOut: R.heroOut, heroDead: !!(R.heroOut && h && h.dead), hero: h ? heroSnap(R.atk) : null, defHero: dh && !R.ai ? null : dh ? heroSnap(R.def) : null,
      defHeroDead: !!(dh && dh.dead), name: R.tgt.name, race: R.tgt.race, th: R.tgt.th, stage: R.tgt.stage, ruhmOpp: R.tgt.ruhm || 0, time: Math.round(S.time - R.startT),
    };
    return R.result;
  };
  function heroSnap(p) {
    const h = p.hero, ults = G.HERO_ULTS[h.def.id] || [];
    const ua = h.abilities.find((a) => a.ult), ult = ua ? ults.findIndex((u) => u.name === ua.name) : -1;
    return { level: h.level, xp: Math.round(h.xp), ult, ranks: h.abilities.filter((a) => !a.ult).map((a) => a.rank || 0), talents: { ...p.talents }, talentPoints: p.talentPoints };
  }
  F.ruhmBase = (mine, opp) => clamp(Math.round(24 + (opp - mine) / 10), 10, 40);
  // Ergebnis anwenden: Beute, heimkehrende Truppen, Held, Ruhm, Feldzug und Bericht
  F.applyResult = function (st, res) {
    const now = F.now();
    if (res.kind === 'probe') return res;
    if (res.kind === 'abwehr') {
      // aus Lagern und Haupthaus geht der Vorrat verloren, aus Minen die ungesammelte Förderung
      let g = 0, w = 0, mg = 0, mw = 0;
      for (const x of res.lootBy || []) {
        const b = st.blds.find((q) => q.id === x.fid);
        if (b && F.RATE[b.type]) { const v = Math.min(b.acc || 0, x.g + x.w); b.acc = (b.acc || 0) - v; if (b.type === 'goldmine') mg += v; else mw += v; }
        else { g += x.g; w += x.w; }
      }
      g = Math.min(st.gold, g); w = Math.min(st.wood, w);
      st.gold -= g; st.wood -= w; g = Math.round(g + mg); w = Math.round(w + mw);
      const base = F.ruhmBase(st.ruhm, res.ruhmOpp);
      res.ruhm = res.stars ? -Math.round(base * [0, 0.5, 0.8, 1][res.stars]) : Math.round(base * 0.4);
      st.ruhm = Math.max(0, st.ruhm + res.ruhm);
      st.stats.defenses++; if (!res.stars) st.stats.held++;
      if (res.defHero) saveHero(st, res.defHero, res.defHeroDead, now);
      const shieldH = res.pct >= 70 ? 10 : res.pct >= 30 ? 6 : 0;
      if (shieldH) st.shieldUntil = Math.max(st.shieldUntil, (res.at || now) + shieldH * 3600e3);
      res.shieldH = shieldH; res.stolen = { g, w };
      pushReport(st, { kind: 'abwehr', at: res.at || now, name: res.name, race: res.race, pct: res.pct, stars: res.stars, loot: { g: -g, w: -w }, ruhm: res.ruhm, shield: shieldH, held: !res.stars });
      return res;
    }
    // eigener Angriff
    // Wer nicht abgesetzt wurde oder überlebt hat, kehrt heim (inzwischen Ausgebildete bleiben ohnehin)
    for (const r in res.deployed) if (r !== 'held') st.army[r] = Math.max(0, (st.army[r] || 0) - res.deployed[r] + (res.alive[r] || 0));
    for (const r in st.army) if (!st.army[r]) delete st.army[r];
    res.got = F.gain(st, res.loot.g, res.loot.w);
    st.stats.raids++; st.stats.lootG += res.got.g; st.stats.lootW += res.got.w;
    if (res.stars) st.stats.wins++;
    if (res.hero && res.heroOut) saveHero(st, res.hero, res.heroDead, now);
    if (res.kind === 'feldzug') {
      const i = res.stage, before = st.camp[i] || 0;
      st.camp[i] = Math.max(before, res.stars);
      res.campNew = st.camp[i] > before; res.ruhm = 0;
      if (res.stars && !before && i === F.CAMPAIGN.length - 1) res.finale = true;
    } else {
      const base = F.ruhmBase(st.ruhm, res.ruhmOpp);
      res.ruhm = res.stars ? Math.round(base * [0, 0.5, 0.8, 1][res.stars]) : -Math.round(base * 0.5);
      st.ruhm = Math.max(0, st.ruhm + res.ruhm);
      st.bestRuhm = Math.max(st.bestRuhm, st.ruhm);
    }
    pushReport(st, { kind: res.kind, at: now, name: res.name, race: res.race, pct: res.pct, stars: res.stars, loot: { g: res.got.g, w: res.got.w }, ruhm: res.ruhm, lost: res.lost });
    return res;
  };
  function saveHero(st, snap, dead, now) {
    const H = st.heroSt;
    H.level = snap.level; H.xp = snap.xp; H.ult = snap.ult; H.ranks = snap.ranks; H.talents = snap.talents; H.talentPoints = snap.talentPoints;
    if (dead) H.restUntil = now + F.HERO_REST * snap.level * 1000;
  }
  function pushReport(st, r) { st.reports.unshift(r); if (st.reports.length > 25) st.reports.length = 25; }

  // -------------------------------------------------------------------------
  // Überfälle während der Abwesenheit: werden beim Wiederkommen mit der echten Kampfberechnung nachgespielt
  F.simDefense = function (st, atk, kind) {
    const keepS = G.S, keepR = F.raid, sfx = G.sfx, shake = G.shake, msg = G.msg;
    G.sfx = () => {}; G.shake = () => {};
    try {
      const R = F.defenseScene(st, atk, kind || 'abwehr');
      G.msg = () => {};
      for (let i = 0; i < 260 && !R.over; i++) G.simulate(1);
      if (!R.over) F.endRaid(R, 'zeit');
      return R.result;
    } finally { G.S = keepS; F.raid = keepR; G.sfx = sfx; G.shake = shake; G.msg = msg; }
  };
  F.awayCheck = function (st, now) {
    now = now || F.now();
    const out = [];
    const from = Math.max(st.seen || now, st.shieldUntil || 0);
    if (F.th(st) < 2 || now - from < 20 * 60e3) { F.tick(st, now); return out; }
    let t = from + rnd(15, 75) * 60e3;
    while (t < now && out.length < 2) {
      F.tick(st, t);
      if (Math.random() < 0.75) {
        const atk = F.aiAttacker(F.th(st));
        atk.ruhm = Math.max(0, Math.round(st.ruhm + rnd(-50, 50)));
        const res = F.simDefense(st, atk, 'abwehr');
        res.at = t;
        F.applyResult(st, res);
        out.push(res);
        t = Math.max(t, st.shieldUntil) + rnd(40, 150) * 60e3;
      } else t += rnd(60, 180) * 60e3;
    }
    F.tick(st, now);
    return out;
  };
})();
