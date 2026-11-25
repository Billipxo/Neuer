'use strict';
// Reichsfeuer: Festungen – Spieldaten: Kosten, Bauzeiten, Lager, Truppenplätze, Ruhm, Feldzug und der Generator
// für gegnerische Siedlungen. Alles ohne Seitenaufbau, damit es auch in Tests (Node) läuft.
(function () {
  const F = (G.F = G.F || {});
  const T = G.TILE;
  F.HOME_TILES = 30; F.HOME_MARGIN = 6; // eigenes Grundstück 30×30 Felder, ringsum 6 Felder Land
  F.RAID_TILES = 26; F.RAID_MARGIN = 9; // gegnerische Siedlung 26×26, ringsum 9 Felder zum Absetzen
  F.MAX_TH = 5;
  F.RAID_TIME = 180; // Sekunden Kampfzeit ab dem ersten Absetzen

  // Gebäude der Festung (Mauern gesondert) – Anzahl je Haupthaus-Stufe 1..5
  F.LIMITS = {
    haupthaus: [1, 1, 1, 1, 1], goldmine: [1, 2, 3, 3, 4], saegewerk: [1, 2, 2, 3, 4], schatzkammer: [1, 1, 2, 2, 3], holzlager: [1, 1, 2, 2, 3],
    unterkunft: [1, 2, 2, 3, 3], kaserne: [1, 1, 1, 2, 2], schiessstand: [0, 1, 1, 1, 2], sanktum: [0, 0, 1, 1, 1], beschwoerung: [0, 0, 0, 1, 1],
    horst: [0, 0, 1, 1, 1], schmiede: [0, 1, 1, 1, 1], turm: [2, 3, 4, 5, 6], kanone: [0, 1, 2, 2, 3], mauer: [25, 50, 75, 100, 125],
    alchemie: [0, 0, 1, 1, 1], taverne: [0, 1, 1, 1, 1],
    sprengfalle: [0, 2, 3, 4, 5], speergrube: [0, 0, 1, 2, 3], frostrune: [0, 0, 1, 1, 2], luftmine: [0, 0, 0, 2, 3],
  };
  F.CATS = [
    { id: 'wirtschaft', name: 'Wirtschaft', types: ['goldmine', 'saegewerk', 'schatzkammer', 'holzlager'] },
    { id: 'armee', name: 'Armee', types: ['unterkunft', 'kaserne', 'schiessstand', 'sanktum', 'beschwoerung', 'horst', 'schmiede', 'alchemie', 'taverne'] },
    { id: 'verteidigung', name: 'Verteidigung', types: ['turm', 'kanone', 'mauer'] },
    { id: 'fallen', name: 'Fallen (für Angreifer unsichtbar)', types: ['sprengfalle', 'speergrube', 'frostrune', 'luftmine'] },
  ];
  F.ICONS = { haupthaus: '🏰', goldmine: '⛏️', saegewerk: '🪓', schatzkammer: '💰', holzlager: '🪵', unterkunft: '⛺', kaserne: '⚔️', schiessstand: '🏹',
    sanktum: '✨', beschwoerung: '🔮', horst: '🦅', schmiede: '⚒️', turm: '🗼', kanone: '💣', mauer: '🧱', alchemie: '⚗️', taverne: '🍺',
    sprengfalle: '💥', speergrube: '🗡️', frostrune: '❄️', luftmine: '🎈' };
  F.DESC = {
    haupthaus: 'Herz der Festung: bestimmt die Höchststufe aller Gebäude, wie viele du bauen darfst, und lagert etwas Gold und Holz.',
    goldmine: 'Fördert ständig Gold – auch wenn du nicht spielst. Tippe sie an, um einzusammeln.',
    saegewerk: 'Schlägt ständig Holz – auch wenn du nicht spielst. Tippe es an, um einzusammeln.',
    schatzkammer: 'Lagert Gold. Bei einem Überfall erbeutet der Angreifer einen Teil davon.',
    holzlager: 'Lagert Holz. Bei einem Überfall erbeutet der Angreifer einen Teil davon.',
    unterkunft: 'Truppenplätze für deine Armee. Jede Stufe beherbergt mehr Krieger.',
    kaserne: 'Bildet Nahkämpfer und ab Stufe 2 Tanks aus. Höhere Stufen bilden stärkere Krieger aus.',
    schiessstand: 'Bildet Fernkämpfer aus.', sanktum: 'Bildet Heiler, ab Stufe 2 Magier und ab Stufe 3 Unterstützer aus.',
    beschwoerung: 'Bildet Beschwörer aus.', horst: 'Bildet Flieger aus. Flieger überfliegen Mauern – Nahkämpfer erreichen sie nicht.',
    schmiede: 'Erforscht Waffen, Rüstung und Ausbildung für alle Truppen.',
    turm: 'Schneller Verteidigungsturm, trifft auch Flieger.', kanone: 'Langsamer Turm mit Flächenschaden.',
    mauer: 'Ein Mauerstück. Feinde müssen es durchbrechen, Flieger fliegen darüber hinweg.',
    alchemie: 'Braut Tränke für Raubzüge: Heilung, Blitze, Kampfrausch, Frost und Mauerbrecher.',
    taverne: 'Heuere Söldner aus den Wildlanden an: Banditen, Trolle, Golems und Drachen.',
  };
  // Förderung je Minute (Stufe 1..5); eine Mine speichert die Förderung von höchstens 4 Stunden
  F.RATE = { goldmine: [20, 32, 46, 62, 80], saegewerk: [16, 26, 38, 52, 68] };
  F.BUFFER_MIN = 240;
  F.STORE_TH = [2500, 4000, 6500, 10000, 15000]; // Haupthaus: je Rohstoff
  F.STORE = [2000, 4500, 9000, 16000, 26000]; // Schatzkammer (Gold) bzw. Holzlager (Holz)
  F.HOUSE_TH = 10; F.HOUSE = [20, 22, 25, 27, 30]; // Truppenplätze
  F.BLD_HP = 1.3; F.TOWER_DMG = 1.35; // Festungs-Kämpfe: Gebäude zäher, Türme schlagen härter zu
  F.TIME = [10, 45, 150, 420, 900]; // Bauzeit in Sekunden für Stufe 1..5
  F.TIME_TH = [0, 120, 360, 900, 1800];
  F.TH_COST = [null, { g: 1200, w: 800 }, { g: 4000, w: 2500 }, { g: 10000, w: 6000 }, { g: 24000, w: 14000 }];
  F.MUL = [1, 3, 8, 18, 36];
  F.WALL_COST = [{ g: 30, w: 20 }, { g: 150, w: 75 }, { g: 450, w: 220 }]; // je Mauerstück für Stufe 1..3
  F.WALL_MAX = [1, 1, 2, 3, 3]; // höchste Mauerstufe je Haupthaus-Stufe
  F.RESEARCH_TIME = [60, 180, 420, 900, 1500];
  F.HERO_REST = 60; // Sekunden Erholung je Heldenstufe, wenn er im Kampf fällt
  F.RANKS = [[0, 'Knappe'], [100, 'Waffenträger'], [250, 'Ritter'], [450, 'Hauptmann'], [700, 'Burgherr'], [1000, 'Feldherr'], [1400, 'Kriegsfürst'], [2000, 'Legende']];
  F.BANNERS = [
    { id: 'bresche', short: 'Bresche', name: 'Banner der Bresche', desc: 'Mindestens die Hälfte der Gebäude zerstört' },
    { id: 'thron', short: 'Thron', name: 'Banner des Throns', desc: 'Das Haupthaus ist gefallen' },
    { id: 'stille', short: 'Stille', name: 'Banner der Stille', desc: 'Alle Türme und Kanonen zerstört' },
  ];

  const round5 = (v) => Math.round(v / 5) * 5;
  F.round5 = round5;
  F.size = (type) => (type === 'mauer' || F.TRAPS[type] ? 1 : G.BUILDINGS[type].size);
  F.cost = function (type, lvl) {
    if (type === 'mauer') return F.WALL_COST[lvl - 1];
    if (F.TRAPS[type]) return F.TRAPS[type].cost[lvl - 1];
    if (type === 'haupthaus') return F.TH_COST[lvl - 1];
    const c = G.BUILDINGS[type].cost, m = F.MUL[lvl - 1] * 1.4;
    return { g: round5(c.g * m), w: round5(c.w * m) };
  };
  F.time = (type, lvl) => (type === 'mauer' || F.TRAPS[type] ? 0 : type === 'haupthaus' ? F.TIME_TH[lvl - 1] : F.TIME[lvl - 1]);
  F.rate = (type, lvl) => (F.RATE[type] && lvl > 0 ? F.RATE[type][lvl - 1] : 0);
  F.buffer = (type, lvl) => F.rate(type, lvl) * F.BUFFER_MIN;
  F.builders = (th) => 2 + (th >= 3 ? 1 : 0) + (th >= 5 ? 1 : 0);
  F.researchCost = (L) => ({ g: 600 * L, w: 400 * L });
  F.researchTime = (L) => F.RESEARCH_TIME[L - 1];
  F.trainTime = (ub) => ub.time; // Sekunden je Krieger
  // Sofort fertig: Gold je verbleibender Zeit (kurze Zeiten fast umsonst, lange teuer)
  F.speedCost = (sec) => (sec <= 0 ? 0 : round5(10 + sec * 1.2 + (sec * sec) / 1200));
  F.rankOf = (ruhm) => { let r = F.RANKS[0]; for (const x of F.RANKS) if (ruhm >= x[0]) r = x; return r[1]; };
  F.nextRank = (ruhm) => F.RANKS.find((x) => x[0] > ruhm) || null;
  // erbeutbare Rohstoffe einer Siedlung je Haupthaus-Stufe (bei voller Zerstörung)
  F.raidLoot = (th) => ({ g: round5(1000 * Math.pow(th, 1.8)), w: round5(760 * Math.pow(th, 1.8)) });
  F.searchCost = (th) => 15 + 15 * th;

  // Welche Rollen an welchen Gebäuden ausgebildet werden (inkl. Flieger und Spezialeinheit des Volkes)
  F.PRODUCERS = ['kaserne', 'schiessstand', 'sanktum', 'beschwoerung', 'horst', 'schmiede'];
  F.ROLE_ORDER = ['nahkampf', 'tank', 'fernkampf', 'heiler', 'magier', 'support', 'beschwoerer', 'flieger', 'elite'];
  F.roleSource = function (rd, role) { // [Gebäude, Mindeststufe]
    if (role === 'elite') return rd.units.elite.at;
    for (const t of F.PRODUCERS) { const pr = G.PRODUCTION[t]; if (pr && pr[role] !== undefined) return [t, pr[role]]; }
    return null;
  };

  // -------------------------------------------------------------------------
  // Zufall mit Startwert (gleiche Siedlung bei gleichem Startwert)
  F.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  // Während fn läuft, liefert Math.random die Zahlen aus F.rng(seed) – so stehen Bäume und Tiere jedes Mal gleich
  F.withSeed = function (seed, fn) {
    const old = Math.random; Math.random = F.rng(seed);
    try { return fn(); } finally { Math.random = old; }
  };

  // Namen für Siedlungen
  F.NAMES = {
    menschen: [['Burg', 'Feste', 'Gut', 'Wacht', 'Hof'], ['Falkenstein', 'Rabenfels', 'Eichenau', 'Lindenhag', 'Brunnwald', 'Hohenmark', 'Grauweiler']],
    elfen: [['Hain', 'Laube', 'Wacht', 'Mondfeste'], ['Ilvanor', 'Silberblatt', 'Taunacht', 'Sternquell', 'Elarion', 'Nebelgrün']],
    untote: [['Gruft', 'Friedhof', 'Knochenwall', 'Totenhof'], ['Morgrath', 'Nebelsfurt', 'Schattenmoor', 'Aschgrau', 'Krähenruh', 'Bleichfeld']],
    orks: [['Lager', 'Hort', 'Pfahlburg', 'Raubposten'], ['Grolschädel', 'Blutfang', 'Dornbach', 'Knochenbrecher', 'Steinfaust', 'Rotsand']],
    zwerge: [['Bergfeste', 'Zollfeste', 'Halle', 'Stollenwacht'], ['Kupferpass', 'Eisenhall', 'Tiefenglut', 'Ambossgrat', 'Graubart', 'Goldader']],
    daemonen: [['Schlund', 'Horst', 'Brutstätte', 'Aschefeste'], ["Vor'Kesh", 'Schwefelgrund', 'Glutmaul', 'Höllenrand', 'Kar-Moth', 'Feuerkluft']],
  };
  F.nameFor = function (race, R) {
    const n = F.NAMES[race], r = R || Math.random;
    return `${n[0][Math.floor(r() * n[0].length)]} ${n[1][Math.floor(r() * n[1].length)]}`;
  };

  // -------------------------------------------------------------------------
  // Fallen: für Angreifer unsichtbar, lösen einmal je Kampf aus und sind danach von selbst wieder scharf
  F.TRAPS = {
    sprengfalle: { name: 'Sprengfalle', trigger: 38, radius: 75, fuse: 0.5, dmg: 170, ground: true, color: '#ff9a3a',
      desc: 'Explodiert, sobald Feinde darüberlaufen: Flächenschaden an Bodentruppen.', cost: [{ g: 150, w: 80 }, { g: 600, w: 300 }, { g: 1500, w: 700 }] },
    speergrube: { name: 'Speergrube', trigger: 26, radius: 30, fuse: 0.1, dmg: 650, single: true, ground: true, color: '#e8e0d0',
      desc: 'Verborgene Grube voller Speere: gewaltiger Schaden an einem einzelnen Krieger.', cost: [{ g: 250, w: 150 }, { g: 900, w: 450 }, { g: 2200, w: 1000 }] },
    frostrune: { name: 'Frostrune', trigger: 50, radius: 120, fuse: 0.2, dmg: 50, slow: 6, ground: true, air: true, color: '#9ad8ff',
      desc: 'Lässt Feinde im weiten Umkreis erstarren: 6 s lang −45 % Tempo und −30 % Angriffstempo.', cost: [{ g: 300, w: 250 }, { g: 1000, w: 700 }, { g: 2500, w: 1500 }] },
    luftmine: { name: 'Luftmine', trigger: 75, radius: 65, fuse: 0.3, dmg: 420, air: true, color: '#ff6a6a',
      desc: 'Schwebende Mine gegen Flieger: hoher Schaden an Fliegern in der Nähe.', cost: [{ g: 400, w: 200 }, { g: 1200, w: 600 }, { g: 2800, w: 1300 }] },
  };
  F.TRAP_MAX = [1, 1, 2, 3, 3]; // höchste Fallenstufe je Haupthaus-Stufe
  F.trapMul = (L) => 1 + 0.5 * (L - 1);
  // Tränke aus dem Alchemistenturm: einmal einsetzbar, wirken an der angetippten Stelle
  F.POTIONS = {
    heiltrank: { name: 'Heiltrank-Wolke', short: 'Heilt deine Truppen', icon: '💚', lvl: 1, time: 60, cost: { g: 250, w: 150 }, radius: 130, heal: 0.35, color: '#7aff9a',
      desc: 'Heilt eigene Truppen im Umkreis sofort um 35 % und lässt sie 6 s lang schnell regenerieren.' },
    blitztrank: { name: 'Gewitterflasche', short: 'Drei Blitze auf Gebäude', icon: '⚡', lvl: 1, time: 75, cost: { g: 300, w: 180 }, radius: 70, dmg: 240, bolts: 3, color: '#bfe8ff',
      desc: 'Drei Blitze schlagen ein: Schaden an Gebäuden und Verteidigern.' },
    wuttrank: { name: 'Kampfrausch', short: 'Mehr Schaden und Tempo', icon: '🔥', lvl: 2, time: 90, cost: { g: 350, w: 200 }, radius: 130, dur: 10, mods: { dmg: 0.4, speed: 0.25, atkspd: 0.25 }, color: '#ff8a3a',
      desc: 'Eigene Truppen im Umkreis: 10 s lang +40 % Schaden, +25 % Tempo und Angriffstempo.' },
    frosttrank: { name: 'Frosthauch', short: 'Türme erstarren', icon: '🧊', lvl: 3, time: 120, cost: { g: 450, w: 300 }, radius: 115, dur: 4.5, color: '#9ad8ff',
      desc: 'Türme und Verteidiger im Umkreis erstarren 4,5 s lang.' },
    brechtrank: { name: 'Mauerbrecher', short: 'Sprengt Mauern', icon: '🧨', lvl: 4, time: 100, cost: { g: 400, w: 250 }, radius: 95, dmg: 1400, color: '#ffb040',
      desc: 'Sprengt Mauern im Umkreis (hoher Schaden nur an Mauern).' },
  };
  F.POTION_SLOTS = [2, 3, 4, 5, 6]; // Plätze je Stufe des Alchemistenturms
  F.potMul = (L) => 1 + 0.12 * (Math.max(1, L) - 1);
  // Söldner aus der Taverne: sofort einsatzbereit, kosten nur Gold und belegen Truppenplätze
  F.MERCS = {
    bandit: { creep: 'bandit', name: 'Bandit', lvl: 1, supply: 2, gold: 110, icon: '🗡️', desc: 'Billige Klinge, schnell angeheuert.' },
    schuetze: { creep: 'schuetze', name: 'Wegelagerer', lvl: 1, supply: 2, gold: 110, icon: '🏹', desc: 'Schießt aus sicherer Entfernung.' },
    troll: { creep: 'troll', name: 'Bergtroll', lvl: 2, supply: 4, gold: 280, icon: '👹', desc: 'Zäher Schläger mit Keule.' },
    hexer: { creep: 'hexer', name: 'Trollhexer', lvl: 3, supply: 4, gold: 320, icon: '🔮', desc: 'Wirft Blitzkugeln mit Flächenschaden.' },
    golem: { creep: 'golem', name: 'Steingolem', lvl: 4, supply: 8, gold: 650, icon: '🗿', desc: 'Wandelnder Fels: hält enorm viel aus.' },
    drache: { creep: 'drache', name: 'Jungdrache', lvl: 5, supply: 18, gold: 1800, scale: 0.42, icon: '🐉', desc: 'Speit Feuer mit großem Flächenschaden.' },
  };
  F.mercMul = (tavernL, m) => 1 + 0.08 * Math.max(0, tavernL - m.lvl);
  // Erfolge (je drei Stufen) und Tagesaufträge
  F.ACH = [
    { id: 'pluenderer', name: 'Plünderer', stat: 'lootG', goals: [5000, 50000, 250000], txt: 'Gold erbeutet' },
    { id: 'eroberer', name: 'Eroberer', stat: 'wins', goals: [5, 25, 100], txt: 'Kämpfe gewonnen' },
    { id: 'bollwerk', name: 'Bollwerk', stat: 'held', goals: [1, 10, 30], txt: 'Überfälle abgewehrt' },
    { id: 'baumeister', name: 'Baumeister', stat: 'built', goals: [10, 50, 150], txt: 'Bauaufträge abgeschlossen' },
    { id: 'zerstoerer', name: 'Zerstörer', stat: 'destroyed', goals: [50, 300, 1500], txt: 'Gebäude zerstört' },
    { id: 'feldherr', name: 'Feldherr', stat: '$banners', goals: [6, 24, 54], txt: 'Feldzug-Banner' },
    { id: 'sagen', name: 'Held der Sagen', stat: '$hero', goals: [3, 6, 10], txt: 'Heldenstufe' },
    { id: 'ruhmreich', name: 'Ruhmreich', stat: '$ruhm', goals: [250, 700, 1400], txt: 'Ruhm' },
    { id: 'sammler', name: 'Sammler', stat: 'collected', goals: [5000, 50000, 300000], txt: 'Rohstoffe eingesammelt' },
    { id: 'alchemist', name: 'Alchemist', stat: 'potions', goals: [5, 30, 100], txt: 'Tränke eingesetzt' },
    { id: 'fallensteller', name: 'Fallensteller', stat: 'traps', goals: [5, 30, 100], txt: 'Fallen ausgelöst' },
    { id: 'soeldnerfuehrer', name: 'Söldnerführer', stat: 'mercs', goals: [5, 25, 100], txt: 'Söldner angeheuert' },
    { id: 'drachentoeter', name: 'Bezwinger der Wächter', stat: 'bosses', goals: [1, 3, 6], txt: 'Wächter-Bosse besiegt' },
    { id: 'schatzsucher', name: 'Schatzsucher', stat: 'finds', goals: [3, 20, 60], txt: 'Fundstücke geborgen' },
  ];
  F.ACH_REWARD = [{ g: 300, w: 200 }, { g: 1500, w: 1000 }, { g: 5000, w: 3000 }];
  F.DAILY = [
    { id: 'siege', stat: 'wins', n: 2, txt: 'Gewinne 2 Kämpfe (Plündern oder Feldzug)' },
    { id: 'raubzug', stat: 'raids', n: 3, txt: 'Ziehe 3-mal in den Kampf' },
    { id: 'sammeln', stat: 'collected', n: 2000, txt: 'Sammle 2.000 Rohstoffe aus Minen und Sägewerken' },
    { id: 'ausbilden', stat: 'trained', n: 20, txt: 'Bilde 20 Krieger aus' },
    { id: 'zerstoeren', stat: 'destroyed', n: 30, txt: 'Zerstöre 30 Gebäude' },
    { id: 'bauen', stat: 'built', n: 2, txt: 'Schließe 2 Bauaufträge ab' },
    { id: 'traenke', stat: 'potions', n: 2, txt: 'Setze 2 Tränke ein', need: 'alchemie' },
    { id: 'beute', stat: 'lootG', n: 3000, txt: 'Erbeute 3.000 Gold' },
    { id: 'probe', stat: 'probes', n: 1, txt: 'Teste deine Festung mit einem Probeangriff' },
    { id: 'faehigkeit', stat: 'abilities', n: 2, txt: 'Setze 2 Volksfähigkeiten ein' },
    { id: 'soeldner', stat: 'mercs', n: 3, txt: 'Heuere 3 Söldner an', need: 'taverne' },
    { id: 'fund', stat: 'finds', n: 1, txt: 'Birg ein Fundstück auf deinem Grundstück' },
  ];
  F.dailyReward = (th) => ({ g: F.round5(300 + 250 * th), w: F.round5(200 + 180 * th) });
  // Fundstücke tauchen von Zeit zu Zeit auf dem Grundstück auf
  F.FINDS = {
    truhe: { name: 'Schatztruhe', reward: (th) => ({ g: 250 + 200 * th, w: 0 }) },
    erz: { name: 'Erzbrocken', reward: (th) => ({ g: 150 + 120 * th, w: 60 * th }) },
    baum: { name: 'Umgestürzter Baum', reward: (th) => ({ g: 0, w: 200 + 160 * th }) },
    kristall: { name: 'Magischer Kristall', reward: (th) => ({ g: 100 * th, w: 100 * th }), potion: true },
  };
  F.FIND_EVERY = [2 * 3600e3, 5 * 3600e3];
  F.FIND_MAX = 3;
  F.CHAPTERS = [{ from: 0, name: 'Kapitel I – Der Zug der sechs Reiche' }, { from: 12, name: 'Kapitel II – Die Wächter des Feuers' }];

  // -------------------------------------------------------------------------
  // Feldzug: zwölf Festungen quer durch die sechs Reiche – einmalige Beute, Banner bleiben gespeichert
  F.CAMPAIGN = [
    { name: 'Raubposten am Dornbach', race: 'orks', th: 1, seed: 101, loot: 1.6, story: 'Ein Orktrupp plündert die Grenzdörfer. Zeig ihnen, dass dieses Land nicht wehrlos ist.' },
    { name: 'Friedhof von Nebelsfurt', race: 'untote', th: 1, seed: 202, loot: 1.6, story: 'Auf dem alten Friedhof regen sich die Toten. Brenne die Gruften nieder, bevor sie ausschwärmen.' },
    { name: 'Söldnerlager des Grafen Ulrich', race: 'menschen', th: 2, seed: 303, loot: 1.5, story: 'Graf Ulrich hat sein Schwert an den Meistbietenden verkauft. Sein Lager hortet das Gold dafür.' },
    { name: 'Wachthain im Silberwald', race: 'elfen', th: 2, seed: 404, loot: 1.5, hero: 3, guard: 2, story: 'Die Elfen sperren den Silberwald für jeden Fremden. Ihre Bogenschützinnen warten in den Bäumen.' },
    { name: 'Zollfeste am Kupferpass', race: 'zwerge', th: 2, seed: 505, loot: 1.5, hero: 3, guard: 2, story: 'Die Zwerge verlangen Wegzoll in Gold aufgewogen. Ihre Zollfeste ist klein – aber zäh.' },
    { name: 'Schwefelhorst am Aschefeld', race: 'daemonen', th: 3, seed: 606, loot: 1.4, hero: 4, guard: 3, story: 'Aus dem Aschefeld steigt Schwefelrauch. Ein Vorposten der Höllenbrut hat sich hier eingenistet.' },
    { name: 'Kriegslager des Häuptlings Grol', race: 'orks', th: 3, seed: 707, loot: 1.4, hero: 5, guard: 3, story: 'Häuptling Grol sammelt die Stämme. Zerschlage sein Lager, ehe aus Trupps ein Heer wird.' },
    { name: 'Knochenwall von Morgrath', race: 'untote', th: 3, seed: 808, loot: 1.4, hero: 5, guard: 4, story: 'Hinter einem Wall aus Knochen wacht der Nekromant von Morgrath über seine Gräber.' },
    { name: 'Mondfeste Ilvanor', race: 'elfen', th: 4, seed: 909, loot: 1.3, hero: 6, guard: 4, story: 'Die älteste Feste der Elfen schimmert im Mondlicht. Ihre Mauern sind so alt wie der Wald.' },
    { name: 'Bergfeste Eisenhall', race: 'zwerge', th: 4, seed: 1010, loot: 1.3, hero: 7, guard: 5, story: 'Eisenhall wurde nie erobert, sagen die Zwerge. Jede Mauer ist doppelt so dick wie nötig.' },
    { name: 'Königsburg Hohenwacht', race: 'menschen', th: 5, seed: 1111, loot: 1.25, hero: 8, guard: 5, story: 'Der König selbst sitzt in Hohenwacht. Wer diese Burg nimmt, dem gehört das Reich.' },
    { name: "Höllenschlund Vor'Kesh", race: 'daemonen', th: 5, seed: 1212, loot: 1.25, hero: 10, guard: 6, story: "Am Grund des Schlunds brennt das Reichsfeuer selbst. Lösche Vor'Keshs Glut – oder verbrenne darin." },
    // Kapitel II: Wächter-Bosse bewachen die Festungen
    { name: 'Ogergrube des Königs Gruumsh', race: 'orks', th: 3, seed: 1313, loot: 1.5, hero: 5, guard: 3, boss: { creep: 'ogerkoenig', scale: 0.5 },
      story: 'Seit Vor\'Kesh fiel, sammeln sich die Wächter des Feuers. Der Ogerkönig Gruumsh hat sich in einer Orkgrube eingenistet und frisst ihre Vorräte.' },
    { name: 'Steinbruch des Kolosses', race: 'zwerge', th: 4, seed: 1414, loot: 1.45, hero: 6, guard: 4, boss: { creep: 'koloss', scale: 0.45 },
      story: 'Die Zwerge haben einen uralten Koloss geweckt, um ihren Steinbruch zu schützen. Er unterscheidet nicht mehr zwischen Freund und Feind.' },
    { name: 'Lindwurmhort im Nebelmoor', race: 'untote', th: 4, seed: 1515, loot: 1.45, hero: 7, guard: 4, boss: { creep: 'lindwurm', scale: 0.45 },
      story: 'Im Nebelmoor hält der Nekromant einen Lindwurm an Ketten. Wer den Hort plündern will, muss an seinen Zähnen vorbei.' },
    { name: 'Glutberg der Feuerschwingen', race: 'daemonen', th: 5, seed: 1616, loot: 1.35, hero: 8, guard: 5, boss: { creep: 'drache', scale: 0.38 },
      story: 'Auf dem Glutberg brüten die Dämonen Drachen aus. Der Älteste von ihnen wacht über die Brutstätte.' },
    { name: 'Sternenwacht von Elarion', race: 'elfen', th: 5, seed: 1717, loot: 1.35, hero: 9, guard: 6, boss: { creep: 'golem', scale: 1.5 },
      story: 'Die Elfen haben einen Sternengolem erschaffen, der ihre letzte Feste hütet. Seine Haut ist härter als Mondstahl.' },
    { name: 'Thron des Reichsfeuers', race: 'menschen', th: 5, seed: 1818, loot: 1.3, hero: 10, guard: 7, boss: { creep: 'drache', scale: 0.5 },
      story: 'Ein Thronräuber hat sich zum Herrn des Reichsfeuers erklärt – und den letzten Feuerdrachen an seinen Thron gebunden. Das Ende des Feldzugs.' },
  ];

  // -------------------------------------------------------------------------
  // Siedlungs-Generator: Haupthaus in der Mitte, Lager und Türme hinter einem Mauerring, Minen und Kasernen außen.
  // o: { th, seed, race, lootMul, hero (Stufe des Verteidiger-Helden), guard (Wachtrupp) }
  F.genSettlement = function (o) {
    const R = F.rng(o.seed || 1), th = Math.max(1, Math.min(5, o.th)), N = F.RAID_TILES, c = N / 2;
    const race = o.race || G.RACE_KEYS[Math.floor(R() * G.RACE_KEYS.length)];
    const occ = new Uint8Array(N * N); // 0 frei, 1 Gebäude, 2 Mauer
    const blds = [], walls = [];
    const at = (x, y) => occ[y * N + x];
    const free = (tx, ty, s) => {
      for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) { const x = tx + i, y = ty + j; if (x < 1 || y < 1 || x > N - 2 || y > N - 2 || at(x, y)) return false; }
      return true;
    };
    const mark = (tx, ty, s, v) => { for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) occ[(ty + j) * N + tx + i] = v; };
    // Mauerringe als Quadrate [lo, hi] (Felder des Rings)
    const ringA = [null, [7, 18], [6, 19], [6, 19], [5, 20]][th - 1], ringB = th >= 4 ? [9, 15] : null;
    const onRing = (r, x, y) => r && x >= r[0] && x <= r[1] && y >= r[0] && y <= r[1] && (x === r[0] || x === r[1] || y === r[0] || y === r[1]);
    const inRing = (r, x, y) => r && x > r[0] && x < r[1] && y > r[0] && y < r[1];
    const zoneOf = (x, y) => {
      if (onRing(ringA, x, y) || onRing(ringB, x, y)) return 'wall';
      if (ringB && inRing(ringB, x, y)) return 'core';
      if (ringA) return inRing(ringA, x, y) ? 'inner' : 'outer';
      return Math.max(Math.abs(x + 0.5 - c), Math.abs(y + 0.5 - c)) <= 6.5 ? 'inner' : 'outer';
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (zoneOf(x, y) === 'wall') occ[y * N + x] = 2;
    const thT = Math.floor(c - 1.5);
    mark(thT, thT, 3, 1);
    blds.push({ type: 'haupthaus', level: th, tx: thT, ty: thT });
    const lvl = (type) => Math.max(1, Math.min(th, th - (R() < 0.35 ? 1 : 0) - (type !== 'turm' && type !== 'kanone' && R() < 0.15 ? 1 : 0)));
    const place = (type, zones, pref) => {
      const s = F.size(type);
      let best = null, bs = Infinity;
      for (let ty = 1; ty <= N - 1 - s; ty++) for (let tx = 1; tx <= N - 1 - s; tx++) {
        if (!free(tx, ty, s)) continue;
        let ok = true;
        for (let i = 0; i < s && ok; i++) for (let j = 0; j < s && ok; j++) if (!zones.includes(zoneOf(tx + i, ty + j))) ok = false;
        if (!ok) continue;
        const sc = pref(tx + s / 2, ty + s / 2) + R() * 3;
        if (sc < bs) { bs = sc; best = { tx, ty }; }
      }
      if (!best) return false;
      mark(best.tx, best.ty, s, 1);
      blds.push({ type, level: lvl(type), tx: best.tx, ty: best.ty });
      return true;
    };
    const dC = (x, y) => Math.max(Math.abs(x - c), Math.abs(y - c));
    const spread = (types) => (x, y) => { let m = 99; for (const b of blds) if (types.includes(b.type)) m = Math.min(m, Math.hypot(b.tx + F.size(b.type) / 2 - x, b.ty + F.size(b.type) / 2 - y)); return -Math.min(m, 7) * 1.2; };
    const n = (type) => F.LIMITS[type][th - 1];
    const some = (type) => { const m = n(type); return m <= 1 ? m : m - (R() < 0.4 ? 1 : 0); };
    const DEF = ['turm', 'kanone'];
    // Verteidigung: Kanonen innen, Türme verteilt (bei großen Festungen ein Teil vor der Mauer)
    for (let i = 0; i < n('kanone'); i++) place('kanone', ringB ? ['core', 'inner'] : ['inner'], (x, y) => spread(DEF)(x, y) + dC(x, y) * 0.3) || place('kanone', ['outer'], spread(DEF));
    const towers = n('turm'), outside = th >= 3 ? Math.floor(towers / 3) : 0;
    for (let i = 0; i < towers - outside; i++) place('turm', ringB ? ['core', 'inner'] : ['inner'], (x, y) => spread(DEF)(x, y) - dC(x, y) * 0.4) || place('turm', ['outer'], spread(DEF));
    // Lager hinter der Mauer
    for (const t of ['schatzkammer', 'holzlager']) for (let i = 0; i < some(t); i++) place(t, ['inner'], (x, y) => spread(['schatzkammer', 'holzlager'])(x, y) + dC(x, y) * 0.5) || place(t, ['outer'], (x, y) => dC(x, y));
    for (let i = 0; i < outside; i++) place('turm', ['outer'], (x, y) => spread(DEF)(x, y) + Math.abs(dC(x, y) - (ringA ? ringA[1] - c + 2.5 : 8)) * 1.5);
    // Außen: Wirtschaft und Armee
    const outer = ['goldmine', 'saegewerk', 'unterkunft', 'kaserne', 'schiessstand', 'sanktum', 'beschwoerung', 'horst', 'schmiede', 'alchemie', 'taverne'];
    for (const t of outer) for (let i = 0; i < some(t); i++) place(t, ['outer', 'inner'], (x, y) => spread(outer)(x, y) * 0.6 - dC(x, y) * 0.25 + (zoneOf(Math.floor(x), Math.floor(y)) === 'inner' ? 6 : 0));
    // Fallen: versteckt zwischen Lagern und Türmen bzw. vor der Mauer
    const traps = [], tMax = F.TRAP_MAX[th - 1];
    for (const tt of Object.keys(F.TRAPS)) for (let i = 0; i < F.LIMITS[tt][th - 1] - (th <= 2 ? 1 : 0); i++) {
      if (R() < 0.25) continue;
      for (let guard = 0; guard < 60; guard++) {
        const tx = 2 + Math.floor(R() * (N - 4)), ty = 2 + Math.floor(R() * (N - 4)), z = zoneOf(tx, ty);
        if (at(tx, ty) || z === 'wall' || (tt === 'luftmine' ? z === 'outer' : z === 'outer' && R() < 0.6)) continue;
        occ[ty * N + tx] = 3; traps.push({ tx, ty, type: tt, level: Math.max(1, tMax - (R() < 0.3 ? 1 : 0)) });
        break;
      }
    }
    // Mauern
    const wMax = F.WALL_MAX[th - 1];
    const wl = th >= 2 ? Math.max(1, wMax - (R() < 0.3 ? 1 : 0)) : 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (at(x, y) === 2) walls.push({ tx: x, ty: y, level: onRing(ringB, x, y) ? wMax : wl });
    // Beute verteilen: Lager 55 %, Haupthaus 15 %, Minen und Sägewerke 30 %
    const L = F.raidLoot(th), mul = o.lootMul || 1;
    const total = { g: round5(L.g * mul), w: round5(L.w * mul) };
    const share = (res, store, prod) => {
      const st = blds.filter((b) => b.type === store), pr = blds.filter((b) => b.type === prod), thB = blds[0];
      let toTh = 0.15;
      const give = (list, frac) => { if (!list.length) { toTh += frac; return; } for (const b of list) { b.loot = b.loot || { g: 0, w: 0 }; b.loot[res] += Math.round(total[res] * frac / list.length); } };
      give(st, 0.55); give(pr, 0.3);
      thB.loot = thB.loot || { g: 0, w: 0 }; thB.loot[res] += Math.round(total[res] * toTh);
    };
    share('g', 'schatzkammer', 'goldmine'); share('w', 'holzlager', 'saegewerk');
    const out = { race, th, seed: o.seed, name: o.name || F.nameFor(race, R), blds, walls, traps, loot: { g: 0, w: 0 }, hero: o.hero || 0, guard: o.guard || 0, boss: o.boss || null };
    for (const b of blds) if (b.loot) { out.loot.g += b.loot.g; out.loot.w += b.loot.w; }
    const rd = G.RACES[race];
    out.heroId = rd.heroes[Math.floor(R() * rd.heroes.length)].id;
    return out;
  };
})();
