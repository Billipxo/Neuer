'use strict';
// Spieldaten: Völker, Einheiten, Helden, Gebäude, Gegenstände, neutrale Monster.
window.G = window.G || {};

G.TILE = 40;
// Spieltempo: Faktor für Einkommen und Bau-/Forschungszeiten. 2.6 ≈ Basis in knapp 30 min auf Maximalstufe.
G.PACE = 2.6;
// Spieldauer (Minuten). In den letzten 5 Minuten läuft die Endphase, danach entscheidet die Punktzahl.
G.DURATIONS = [[20, '20 Minuten'], [30, '30 Minuten'], [45, '45 Minuten'], [0, 'Unbegrenzt']];
G.ENDPHASE = 5 * 60;
G.BASE_RADIUS = 380;
G.MAX_LEVEL = 5;

G.ROLES = ['tank', 'nahkampf', 'fernkampf', 'magier', 'heiler', 'support', 'beschwoerer'];
G.ROLE_NAMES = {
  tank: 'Tank', nahkampf: 'Nahkampf', fernkampf: 'Fernkampf', magier: 'Magier',
  heiler: 'Heiler', support: 'Support', beschwoerer: 'Beschwörer',
};

// Grundwerte je Rolle. Volks-Einheiten verändern diese über "mods".
G.UNIT_BASE = {
  tank:        { hp: 560, dmg: 16, range: 26,  cd: 1.3,  speed: 52, armor: 6, gold: 95,  wood: 25, time: 14, supply: 3, r: 13 },
  nahkampf:    { hp: 330, dmg: 27, range: 24,  cd: 1.0,  speed: 68, armor: 3, gold: 70,  wood: 10, time: 10, supply: 2, r: 11 },
  fernkampf:   { hp: 210, dmg: 21, range: 175, cd: 1.15, speed: 62, armor: 1, gold: 65,  wood: 30, time: 10, supply: 2, r: 10, proj: 'pfeil' },
  magier:      { hp: 180, dmg: 30, range: 165, cd: 1.9,  speed: 58, armor: 0, gold: 95,  wood: 40, time: 13, supply: 2, r: 10, proj: 'kugel', splash: 55 },
  heiler:      { hp: 190, dmg: 8,  range: 150, cd: 1.6,  speed: 60, armor: 0, gold: 85,  wood: 35, time: 12, supply: 2, r: 10, proj: 'kugel', heal: 28 },
  support:     { hp: 240, dmg: 12, range: 140, cd: 1.4,  speed: 62, armor: 1, gold: 85,  wood: 45, time: 12, supply: 2, r: 11, proj: 'kugel' },
  beschwoerer: { hp: 200, dmg: 12, range: 150, cd: 1.5,  speed: 58, armor: 0, gold: 110, wood: 45, time: 14, supply: 3, r: 11, proj: 'kugel', summonCd: 14, summonMax: 2 },
};

// Welches Gebäude produziert welche Rolle ab welcher Gebäudestufe.
G.PRODUCTION = {
  kaserne: { nahkampf: 1, tank: 2 },
  schiessstand: { fernkampf: 1 },
  sanktum: { heiler: 1, magier: 2, support: 3 },
  beschwoerung: { beschwoerer: 1 },
};

G.BUILDINGS = {
  haupthaus:    { name: 'Haupthaus', size: 3, hp: 5000, cost: { g: 250, w: 150 }, time: 40, attack: { dmg: 30, range: 260, cd: 1.1 },
                  desc: 'Herz der Basis. Bestimmt die maximale Stufe aller Gebäude, liefert Gold, Arbeiter und Versorgung. Fällt es, ist das Volk besiegt.' },
  goldmine:     { name: 'Goldmine', size: 2, hp: 800, cost: { g: 120, w: 40 }, time: 15, desc: '+1,8 Gold/s pro Stufe.' },
  saegewerk:    { name: 'Sägewerk', size: 2, hp: 800, cost: { g: 100, w: 20 }, time: 15, desc: '+1,5 Holz/s pro Stufe.' },
  unterkunft:   { name: 'Unterkunft', size: 2, hp: 700, cost: { g: 80, w: 60 }, time: 12, desc: '+8 Versorgung pro Stufe.' },
  kaserne:      { name: 'Kaserne', size: 2, hp: 1200, cost: { g: 160, w: 80 }, time: 20, desc: 'Bildet Nahkämpfer (St. 1) und Tanks (St. 2) aus.' },
  schiessstand: { name: 'Schießstand', size: 2, hp: 1000, cost: { g: 150, w: 110 }, time: 20, desc: 'Bildet Fernkämpfer aus.' },
  sanktum:      { name: 'Sanktum', size: 2, hp: 1000, cost: { g: 180, w: 130 }, time: 24, desc: 'Heiler (St. 1), Magier (St. 2), Support (St. 3).' },
  beschwoerung: { name: 'Beschwörungskreis', size: 2, hp: 1000, cost: { g: 220, w: 160 }, time: 28, desc: 'Bildet Beschwörer aus.' },
  schmiede:     { name: 'Schmiede', size: 2, hp: 1000, cost: { g: 180, w: 120 }, time: 25, desc: 'Erforscht Waffen, Rüstung und Ausbildung für alle Einheiten.' },
  turm:         { name: 'Wachturm', size: 1, hp: 950, cost: { g: 110, w: 60 }, time: 15, attack: { dmg: 28, range: 240, cd: 1.0 }, desc: 'Schneller Einzelziel-Verteidigungsturm.' },
  kanone:       { name: 'Kanonenturm', size: 1, hp: 1200, cost: { g: 200, w: 120 }, time: 22, attack: { dmg: 50, range: 220, cd: 2.2, splash: 65 }, desc: 'Langsamer Flächenschaden.' },
};
// Maximale Anzahl je Haupthaus-Stufe 1..5
G.LIMITS = {
  haupthaus: [1, 1, 1, 1, 1], goldmine: [1, 2, 2, 3, 3], saegewerk: [1, 1, 2, 2, 3], unterkunft: [1, 2, 3, 4, 5],
  kaserne: [1, 1, 2, 2, 3], schiessstand: [0, 1, 1, 2, 2], sanktum: [0, 1, 1, 1, 2], beschwoerung: [0, 0, 1, 1, 1],
  schmiede: [0, 1, 1, 1, 1], turm: [1, 2, 3, 4, 5], kanone: [0, 0, 1, 2, 3],
};
G.BUILD_ORDER = ['goldmine', 'kaserne', 'saegewerk', 'unterkunft', 'turm', 'schiessstand', 'sanktum', 'schmiede', 'beschwoerung', 'kanone'];

G.RESEARCH = {
  waffen:     { name: 'Geschärfte Waffen', desc: '+8% Schaden je Stufe' },
  ruestung:   { name: 'Gehärtete Rüstung', desc: '+1 Rüstung je Stufe' },
  ausbildung: { name: 'Harte Ausbildung', desc: '+6% Lebenspunkte je Stufe (neue Einheiten)' },
};

// ---------------------------------------------------------------------------
// Völker
// Bonus-Einträge: { roles:[...|'all'|'summon'|'buildings'|'defense'], hp, dmg, armor, speed, atkspd, heal, range, regen, lifesteal, summonExtra }
G.RACES = {
  menschen: {
    name: 'Menschen', color: '#d6c39a', dark: '#6b5a3e',
    palette: { wall: '#9a9286', roof: '#3f63a8', trim: '#d9c27a' },
    desc: 'Disziplinierte Königreiche mit starker Wirtschaft und vielseitigen Truppen.',
    passive: { name: 'Handelsgilden', desc: '+10% Goldeinkommen', eco: { goldPct: 0.10 } },
    ability: { id: 'banner', name: 'Heiliges Banner', cd: 90, desc: 'Alle Einheiten erhalten 15 s lang +25% Schaden und +3 Rüstung.' },
    map: { name: 'Grüne Auen', theme: 'auen' },
    units: {
      tank: { name: 'Schildwache' },
      nahkampf: { name: 'Schwertkämpfer' },
      fernkampf: { name: 'Armbrustschütze', mods: { dmg: 1.12, cd: 1.08 } },
      magier: { name: 'Kampfmagier' },
      heiler: { name: 'Priesterin' },
      support: { name: 'Bannerträger', aura: { side: 'ally', stat: 'dmg', value: 0.15, desc: 'Verbündete in der Nähe +15% Schaden' } },
      beschwoerer: { name: 'Elementarist', summon: { name: 'Wasserelementar', hp: 320, dmg: 20, range: 120, cd: 1.4, speed: 55, armor: 1, proj: 'kugel', life: 40, r: 11 } },
    },
    heroes: [
      { id: 'aldric', name: 'Paladin Aldric', title: 'Hüter des Lichts', ranged: false, stats: { hp: 950, dmg: 34, armor: 6 },
        bonus: [{ roles: ['tank'], hp: 0.25 }, { roles: ['all'], armor: 2 }], bonusDesc: 'Tanks +25% LP, alle Einheiten +2 Rüstung',
        abilities: [
          { name: 'Heiliges Licht', type: 'heal', amount: 240, radius: 230, cd: 14 },
          { name: 'Gottesschild', type: 'buff', stat: 'armor', value: 6, duration: 8, radius: 260, cd: 24 }] },
      { id: 'lyra', name: 'Erzmagierin Lyra', title: 'Stimme des Turms', ranged: true, stats: { hp: 700, dmg: 40, armor: 2 },
        bonus: [{ roles: ['magier', 'heiler'], dmg: 0.25, heal: 0.25 }], bonusDesc: 'Magier & Heiler +25% Schaden/Heilung',
        abilities: [
          { name: 'Feuerball', type: 'nuke', dmg: 260, cd: 9 },
          { name: 'Blizzard', type: 'aoe', dmg: 190, radius: 130, cd: 18 }] },
      { id: 'gareth', name: 'Feldherr Gareth', title: 'Schwert des Königs', ranged: false, stats: { hp: 850, dmg: 42, armor: 4 },
        bonus: [{ roles: ['nahkampf', 'fernkampf'], dmg: 0.15 }, { roles: ['all'], speed: 0.10 }], bonusDesc: 'Nah- & Fernkampf +15% Schaden, alle +10% Tempo',
        abilities: [
          { name: 'Sturmangriff', type: 'stun', dmg: 120, radius: 120, stun: 1.5, cd: 14 },
          { name: 'Schlachtruf', type: 'buff', stat: 'dmg', value: 0.3, duration: 10, radius: 300, cd: 26 }] },
    ],
  },
  elfen: {
    name: 'Elfen', color: '#9fd18c', dark: '#2f5a33',
    palette: { wall: '#d8d0b8', roof: '#3f8a4a', trim: '#e8e2c0' },
    desc: 'Uralte Waldvölker – flink, präzise und eng mit der Natur verbunden.',
    passive: { name: 'Lebenshauch', desc: 'Alle Einheiten regenerieren +2 LP/s', bonus: [{ roles: ['all', 'summon'], regen: 2 }] },
    ability: { id: 'mondsegen', name: 'Mondsegen', cd: 80, desc: 'Heilt alle eigenen Einheiten sofort um 50% ihrer maximalen LP.' },
    map: { name: 'Silberwald', theme: 'silberwald' },
    units: {
      tank: { name: 'Baumhüter', mods: { hp: 1.1, speed: 0.9 } },
      nahkampf: { name: 'Klingentänzerin', mods: { cd: 0.85, hp: 0.9 } },
      fernkampf: { name: 'Waldläuferin', mods: { range: 1.15 } },
      magier: { name: 'Sternenruferin' },
      heiler: { name: 'Druidin', mods: { heal: 1.15 } },
      support: { name: 'Windsängerin', aura: { side: 'ally', stat: 'atkspd', value: 0.15, desc: 'Verbündete in der Nähe +15% Angriffstempo' } },
      beschwoerer: { name: 'Wildruferin', summon: { name: 'Waldwolf', hp: 260, dmg: 18, range: 24, cd: 0.9, speed: 85, armor: 1, life: 40, r: 10 } },
    },
    heroes: [
      { id: 'ilyria', name: 'Schattenpfeil Ilyria', title: 'Jägerin der Nacht', ranged: true, stats: { hp: 720, dmg: 44, armor: 2 },
        bonus: [{ roles: ['fernkampf'], dmg: 0.20, range: 0.15 }], bonusDesc: 'Fernkampf +20% Schaden, +15% Reichweite',
        abilities: [
          { name: 'Pfeilhagel', type: 'aoe', dmg: 170, radius: 140, cd: 12 },
          { name: 'Eulenblick', type: 'buff', stat: 'atkspd', value: 0.35, duration: 10, radius: 300, cd: 24 }] },
      { id: 'thalia', name: 'Hohedruidin Thalia', title: 'Herz des Hains', ranged: true, stats: { hp: 760, dmg: 30, armor: 3 },
        bonus: [{ roles: ['heiler'], heal: 0.30 }, { roles: ['all'], regen: 2 }], bonusDesc: 'Heiler +30% Heilung, alle +2 LP/s',
        abilities: [
          { name: 'Verjüngung', type: 'heal', amount: 260, radius: 240, cd: 13 },
          { name: 'Wurzelgriff', type: 'stun', dmg: 60, radius: 150, stun: 2.5, cd: 20 }] },
      { id: 'faelar', name: 'Klingenmeister Faelar', title: 'Tanz der Klingen', ranged: false, stats: { hp: 820, dmg: 46, armor: 3 },
        bonus: [{ roles: ['nahkampf'], dmg: 0.20, atkspd: 0.15 }], bonusDesc: 'Nahkampf +20% Schaden, +15% Angriffstempo',
        abilities: [
          { name: 'Klingenwirbel', type: 'aoe', self: true, dmg: 210, radius: 130, cd: 11 },
          { name: 'Ahnengeister', type: 'summon', count: 2, duration: 30, cd: 30,
            unit: { name: 'Ahnengeist', hp: 380, dmg: 26, range: 24, cd: 1.0, speed: 75, armor: 2, r: 11 } }] },
    ],
  },
  untote: {
    name: 'Untote', color: '#a9b5ac', dark: '#3b3f4a',
    palette: { wall: '#4a4650', roof: '#5d3a78', trim: '#9ad0a0' },
    desc: 'Eine endlose Flut aus Knochen und dunkler Magie, angeführt von Nekromanten.',
    passive: { name: 'Seelenlos', desc: 'Einheiten kosten 12% weniger Gold', eco: { unitDiscount: 0.12 } },
    ability: { id: 'erweckung', name: 'Totenerweckung', cd: 90, desc: 'Erweckt 6 Skelettkrieger an der Spitze deiner Armee (45 s).' },
    map: { name: 'Verfluchte Sümpfe', theme: 'suempfe' },
    units: {
      tank: { name: 'Knochenkoloss', mods: { hp: 1.15, speed: 0.85 } },
      nahkampf: { name: 'Ghul', mods: { cd: 0.8, dmg: 0.9, speed: 1.1 } },
      fernkampf: { name: 'Knochenschütze' },
      magier: { name: 'Nekromagier' },
      heiler: { name: 'Blutpriester' },
      support: { name: 'Banshee', aura: { side: 'enemy', stat: 'armor', value: -3, desc: 'Gegner in der Nähe −3 Rüstung' } },
      beschwoerer: { name: 'Totenbeschwörer', summon: { name: 'Skelett', hp: 200, dmg: 15, range: 24, cd: 1.0, speed: 65, armor: 1, life: 40, r: 10 } },
    },
    heroes: [
      { id: 'morvath', name: 'Lich Morvath', title: 'Der Frostgebundene', ranged: true, stats: { hp: 700, dmg: 42, armor: 2 },
        bonus: [{ roles: ['magier'], dmg: 0.25 }, { roles: ['beschwoerer'], summonExtra: 1 }], bonusDesc: 'Magier +25% Schaden, Beschwörer +1 Beschwörung',
        abilities: [
          { name: 'Frostnova', type: 'stun', dmg: 170, radius: 140, stun: 1.2, cd: 13 },
          { name: 'Todesspirale', type: 'nuke', dmg: 300, cd: 10 }] },
      { id: 'kael', name: 'Todesritter Kael', title: 'Der Gefallene', ranged: false, stats: { hp: 1000, dmg: 40, armor: 5 },
        bonus: [{ roles: ['tank', 'nahkampf'], hp: 0.20, lifesteal: 0.10 }], bonusDesc: 'Tanks & Nahkampf +20% LP, 10% Lebensraub',
        abilities: [
          { name: 'Todesgriff', type: 'drain', dmg: 220, cd: 10 },
          { name: 'Unheilige Raserei', type: 'buff', stat: 'speed', value: 0.3, extra: { atkspd: 0.25 }, duration: 10, radius: 300, cd: 25 }] },
      { id: 'nyra', name: 'Seuchenfürstin Nyra', title: 'Mutter der Fäulnis', ranged: true, stats: { hp: 740, dmg: 36, armor: 2 },
        bonus: [{ roles: ['beschwoerer', 'support'], dmg: 0.25, hp: 0.15 }, { roles: ['summon'], hp: 0.25, dmg: 0.25 }], bonusDesc: 'Beschwörer & Support +25% Schaden, Beschwörungen +25%',
        abilities: [
          { name: 'Seuchenwolke', type: 'aoe', dmg: 180, radius: 150, cd: 12 },
          { name: 'Skelettarmee', type: 'summon', count: 4, duration: 30, cd: 28,
            unit: { name: 'Skelett', hp: 220, dmg: 16, range: 24, cd: 1.0, speed: 65, armor: 1, r: 10 } }] },
    ],
  },
  orks: {
    name: 'Orks', color: '#7aa04a', dark: '#3b4a22',
    palette: { wall: '#7a5838', roof: '#9a3a2a', trim: '#c8b080' },
    desc: 'Wilde Kriegerclans der Steppe – rohe Kraft und unbändiger Kampfgeist.',
    passive: { name: 'Kriegerblut', desc: 'Nahkampf & Tanks +15% LP', bonus: [{ roles: ['nahkampf', 'tank'], hp: 0.15 }] },
    ability: { id: 'blutrausch', name: 'Blutrausch', cd: 90, desc: 'Alle Einheiten erhalten 12 s lang +40% Angriffstempo und +20% Tempo.' },
    map: { name: 'Rote Steppe', theme: 'steppe' },
    units: {
      tank: { name: 'Orkbrecher' },
      nahkampf: { name: 'Grunzer', mods: { dmg: 1.12, hp: 1.05, speed: 0.95 } },
      fernkampf: { name: 'Speerwerfer', mods: { dmg: 1.15, range: 0.9 } },
      magier: { name: 'Blitzschamane' },
      heiler: { name: 'Geistheiler' },
      support: { name: 'Kriegstrommler', aura: { side: 'ally', stat: 'atkspd', value: 0.2, desc: 'Verbündete in der Nähe +20% Angriffstempo' } },
      beschwoerer: { name: 'Geisterrufer', summon: { name: 'Geisterwolf', hp: 280, dmg: 20, range: 24, cd: 0.9, speed: 85, armor: 1, life: 40, r: 10 } },
    },
    heroes: [
      { id: 'urgash', name: 'Kriegshäuptling Urgash', title: 'Der Schädelspalter', ranged: false, stats: { hp: 1000, dmg: 46, armor: 4 },
        bonus: [{ roles: ['nahkampf'], dmg: 0.20 }, { roles: ['tank'], hp: 0.15 }], bonusDesc: 'Nahkampf +20% Schaden, Tanks +15% LP',
        abilities: [
          { name: 'Erdbeben', type: 'stun', self: true, dmg: 140, radius: 150, stun: 1.5, cd: 15 },
          { name: 'Kriegsschrei', type: 'buff', stat: 'dmg', value: 0.3, duration: 10, radius: 320, cd: 25 }] },
      { id: 'mogra', name: 'Sturmseherin Mogra', title: 'Ruferin der Blitze', ranged: true, stats: { hp: 740, dmg: 38, armor: 2 },
        bonus: [{ roles: ['magier', 'heiler'], dmg: 0.20, heal: 0.20 }], bonusDesc: 'Magier & Heiler +20% Schaden/Heilung',
        abilities: [
          { name: 'Kettenblitz', type: 'aoe', dmg: 200, radius: 130, cd: 11 },
          { name: 'Geisterwölfe', type: 'summon', count: 3, duration: 30, cd: 26,
            unit: { name: 'Geisterwolf', hp: 300, dmg: 22, range: 24, cd: 0.9, speed: 85, armor: 1, r: 10 } }] },
      { id: 'throk', name: 'Bestienmeister Throk', title: 'Herr der Wildnis', ranged: false, stats: { hp: 900, dmg: 40, armor: 3 },
        bonus: [{ roles: ['summon'], hp: 0.30, dmg: 0.30 }, { roles: ['all'], speed: 0.10 }], bonusDesc: 'Beschwörungen +30% LP/Schaden, alle +10% Tempo',
        abilities: [
          { name: 'Bärengeist', type: 'summon', count: 1, duration: 35, cd: 28,
            unit: { name: 'Kriegsbär', hp: 1100, dmg: 45, range: 28, cd: 1.2, speed: 65, armor: 5, r: 16 } },
          { name: 'Wilder Ruf', type: 'buff', stat: 'atkspd', value: 0.3, duration: 10, radius: 320, cd: 22 }] },
    ],
  },
  zwerge: {
    name: 'Zwerge', color: '#c99a6a', dark: '#5a3a22',
    palette: { wall: '#8a8a8e', roof: '#a8742a', trim: '#e0c070' },
    desc: 'Sture Bergvölker – Meister der Schmiedekunst, Runen und Schießpulver.',
    passive: { name: 'Steinerne Hallen', desc: 'Gebäude +25% LP, Türme +15% Schaden', bonus: [{ roles: ['buildings'], hp: 0.25 }, { roles: ['defense'], dmg: 0.15 }] },
    ability: { id: 'moerser', name: 'Mörsersalve', cd: 80, desc: '8 Mörsergranaten schlagen in der größten Gegnergruppe nahe deiner Armee ein.' },
    map: { name: 'Frostgipfel', theme: 'frost' },
    units: {
      tank: { name: 'Eisenbrecher', mods: { armor: 2 } },
      nahkampf: { name: 'Axtschwinger', mods: { hp: 1.1, speed: 0.9 } },
      fernkampf: { name: 'Musketier', mods: { dmg: 1.3, cd: 1.25 } },
      magier: { name: 'Runenschmied' },
      heiler: { name: 'Runenpriester' },
      support: { name: 'Bannermeister', aura: { side: 'ally', stat: 'armor', value: 3, desc: 'Verbündete in der Nähe +3 Rüstung' } },
      beschwoerer: { name: 'Golemschmied', summon: { name: 'Steingolem', hp: 480, dmg: 22, range: 26, cd: 1.3, speed: 48, armor: 4, life: 45, r: 12 } },
    },
    heroes: [
      { id: 'thorgrim', name: 'Bergkönig Thorgrim', title: 'Der Unbeugsame', ranged: false, stats: { hp: 1050, dmg: 40, armor: 6 },
        bonus: [{ roles: ['tank'], hp: 0.25 }, { roles: ['all'], armor: 1 }], bonusDesc: 'Tanks +25% LP, alle +1 Rüstung',
        abilities: [
          { name: 'Sturmhammer', type: 'nuke', dmg: 220, stun: 1.5, cd: 10 },
          { name: 'Donnerknall', type: 'stun', self: true, dmg: 120, radius: 150, stun: 1.2, cd: 15 }] },
      { id: 'hilda', name: 'Runenmeisterin Hilda', title: 'Hüterin der Esse', ranged: true, stats: { hp: 760, dmg: 36, armor: 3 },
        bonus: [{ roles: ['buildings'], hp: 0.30 }, { roles: ['defense'], dmg: 0.25 }, { roles: ['magier'], dmg: 0.15 }], bonusDesc: 'Gebäude +30% LP, Türme +25% Schaden, Magier +15%',
        abilities: [
          { name: 'Runensegen', type: 'buff', stat: 'armor', value: 5, duration: 10, radius: 280, cd: 20 },
          { name: 'Runenexplosion', type: 'aoe', dmg: 220, radius: 130, cd: 13 }] },
      { id: 'brokk', name: 'Kanonier Brokk', title: 'Meister des Pulvers', ranged: true, stats: { hp: 800, dmg: 44, armor: 3 },
        bonus: [{ roles: ['fernkampf'], dmg: 0.25 }], bonusDesc: 'Fernkampf +25% Schaden',
        abilities: [
          { name: 'Sprenggranate', type: 'aoe', dmg: 200, radius: 120, cd: 10 },
          { name: 'Geschützturm', type: 'summon', count: 1, duration: 30, cd: 24,
            unit: { name: 'Geschütz', hp: 600, dmg: 30, range: 200, cd: 0.9, speed: 0, armor: 4, proj: 'kugel', r: 12 } }] },
    ],
  },
  daemonen: {
    name: 'Dämonen', color: '#c0484a', dark: '#4a1418',
    palette: { wall: '#2e2426', roof: '#8a1e1e', trim: '#ff8a3a' },
    desc: 'Brut aus den Höllenschlünden – sie nähren sich vom Leben ihrer Feinde.',
    passive: { name: 'Seelenhunger', desc: 'Alle Einheiten 10% Lebensraub', bonus: [{ roles: ['all', 'summon'], lifesteal: 0.10 }] },
    ability: { id: 'hoellenfeuer', name: 'Höllenfeuer', cd: 100, desc: 'Ein Meteor schlägt in der größten Gegnergruppe ein und ruft ein Infernal herbei.' },
    map: { name: 'Aschenlande', theme: 'asche' },
    units: {
      tank: { name: 'Höllenwächter' },
      nahkampf: { name: 'Dämonenklinge', mods: { dmg: 1.1, hp: 0.95 } },
      fernkampf: { name: 'Teufelsschütze' },
      magier: { name: 'Hexenmeister', mods: { dmg: 1.1 } },
      heiler: { name: 'Blutsukkubus' },
      support: { name: 'Schreckensbote', aura: { side: 'enemy', stat: 'dmg', value: -0.15, desc: 'Gegner in der Nähe −15% Schaden' } },
      beschwoerer: { name: 'Portalmeister', summon: { name: 'Wichtel', hp: 180, dmg: 16, range: 120, cd: 1.0, speed: 75, armor: 0, proj: 'kugel', life: 40, r: 9 } },
    },
    heroes: [
      { id: 'azgaroth', name: 'Grubenlord Azgaroth', title: 'Die Flamme des Abgrunds', ranged: false, stats: { hp: 1050, dmg: 44, armor: 5 },
        bonus: [{ roles: ['all'], dmg: 0.12 }], bonusDesc: 'Alle Einheiten +12% Schaden',
        abilities: [
          { name: 'Feuerregen', type: 'aoe', dmg: 210, radius: 150, cd: 13 },
          { name: 'Höllenschlag', type: 'stun', self: true, dmg: 130, radius: 130, stun: 1.5, cd: 16 }] },
      { id: 'lysara', name: 'Königin Lysara', title: 'Die Seelentrinkerin', ranged: true, stats: { hp: 760, dmg: 38, armor: 2 },
        bonus: [{ roles: ['all'], lifesteal: 0.10 }, { roles: ['heiler'], heal: 0.20 }], bonusDesc: '+10% Lebensraub, Heiler +20%',
        abilities: [
          { name: 'Lebensentzug', type: 'drain', dmg: 240, cd: 9 },
          { name: 'Bann', type: 'nuke', dmg: 80, stun: 3, cd: 18 }] },
      { id: 'malphas', name: 'Erzbeschwörer Malphas', title: 'Öffner der Tore', ranged: true, stats: { hp: 720, dmg: 36, armor: 2 },
        bonus: [{ roles: ['beschwoerer'], summonExtra: 1 }, { roles: ['summon'], dmg: 0.2, hp: 0.2 }], bonusDesc: 'Beschwörer +1 Beschwörung, Beschwörungen +20%',
        abilities: [
          { name: 'Wichtelschwarm', type: 'summon', count: 4, duration: 30, cd: 24,
            unit: { name: 'Wichtel', hp: 200, dmg: 18, range: 120, cd: 1.0, speed: 75, armor: 0, proj: 'kugel', r: 9 } },
          { name: 'Höllenriss', type: 'aoe', dmg: 220, radius: 130, cd: 14 }] },
    ],
  },
};
G.RACE_KEYS = Object.keys(G.RACES);

G.HERO_BASE = { hp: 800, dmg: 36, range: 28, rangedRange: 165, cd: 1.2, speed: 80, armor: 4, r: 16 };
G.HERO_XP = (lvl) => 110 * lvl * (lvl + 1) / 2; // XP benötigt, um von lvl auf lvl+1 zu steigen (kumulativ)
G.HERO_MAX = 10;
G.UNIT_XP = [0, 40, 110, 220, 380]; // Schwellen für Stufe 1..5

// ---------------------------------------------------------------------------
// Händler-Gegenstände
G.ITEMS = {
  trank:   { name: 'Heiltrank', price: 60, consumable: true, heal: 450, desc: 'Heilt 450 LP (automatisch unter 35%).' },
  klinge:  { name: 'Klinge der Stärke', price: 260, dmg: 15, desc: '+15 Schaden' },
  schild:  { name: 'Turmschild', price: 220, armor: 4, desc: '+4 Rüstung' },
  ring:    { name: 'Ring der Regeneration', price: 200, regen: 6, desc: '+6 LP/s' },
  stiefel: { name: 'Stiefel der Eile', price: 180, speed: 0.2, desc: '+20% Lauftempo' },
  amulett: { name: 'Amulett der Konzentration', price: 300, cdr: 0.2, desc: '−20% Abklingzeit der Fähigkeiten' },
  herz:    { name: 'Herz des Riesen', price: 420, hp: 450, desc: '+450 LP' },
  klauen:  { name: 'Klauen des Wahnsinns', price: 350, atkspd: 0.25, desc: '+25% Angriffstempo' },
  banner:  { name: 'Kriegsbanner', price: 480, army: { dmg: 0.08 }, desc: 'Commander: alle Einheiten +8% Schaden' },
  horn:    { name: 'Horn der Standhaftigkeit', price: 450, army: { armor: 1, hp: 0.05 }, desc: 'Commander: alle Einheiten +1 Rüstung, +5% LP' },
  // Seltene Beute (nur von neutralen Monstern)
  drachenzahn: { name: 'Drachenzahn', price: 0, rare: true, dmg: 35, hp: 250, desc: 'Selten: +35 Schaden, +250 LP' },
  krone:   { name: 'Krone der Könige', price: 0, rare: true, army: { hp: 0.10, dmg: 0.05 }, desc: 'Selten – Commander: +10% LP, +5% Schaden' },
  phoenix: { name: 'Phönixfeder', price: 0, rare: true, regen: 15, cdr: 0.1, desc: 'Selten: +15 LP/s, −10% Abklingzeit' },
};
G.SHOP_LIST = ['trank', 'klinge', 'schild', 'ring', 'stiefel', 'amulett', 'herz', 'klauen', 'banner', 'horn'];
G.HERO_WISHLIST = ['klinge', 'stiefel', 'schild', 'banner', 'amulett', 'herz'];

// ---------------------------------------------------------------------------
// Neutrale Monster
G.CREEPS = {
  wolf:    { name: 'Wolf', hp: 230, dmg: 14, range: 24, cd: 1.0, speed: 80, armor: 1, r: 10, xp: 30, gold: 10, color: '#8a8a8a' },
  bandit:  { name: 'Bandit', hp: 320, dmg: 20, range: 24, cd: 1.1, speed: 65, armor: 2, r: 11, xp: 45, gold: 15, color: '#8a6a4a' },
  schuetze:{ name: 'Wegelagerer', hp: 220, dmg: 18, range: 160, cd: 1.2, speed: 65, armor: 0, r: 10, xp: 45, gold: 15, proj: 'pfeil', color: '#7a5a3a' },
  troll:   { name: 'Bergtroll', hp: 650, dmg: 32, range: 28, cd: 1.3, speed: 60, armor: 3, r: 14, xp: 90, gold: 25, color: '#5a8a8a' },
  hexer:   { name: 'Trollhexer', hp: 380, dmg: 26, range: 160, cd: 1.6, speed: 60, armor: 1, r: 12, xp: 80, gold: 25, proj: 'kugel', splash: 50, color: '#4a7a9a' },
  golem:   { name: 'Steingolem', hp: 1700, dmg: 48, range: 30, cd: 1.6, speed: 45, armor: 7, r: 18, xp: 160, gold: 40, color: '#8a8478' },
  drache:  { name: 'Uralter Drache', hp: 9500, dmg: 120, range: 130, cd: 1.8, speed: 50, armor: 8, r: 34, xp: 900, gold: 150, proj: 'feuer', splash: 100, color: '#a8322a' },
};
// reward: gold/wood beim Säubern, item = Chance auf Beute, extra = Zusatzbelohnung
G.CAMPS = {
  wolf:     { name: 'Wolfsrudel', units: ['wolf', 'wolf', 'wolf'], minTH: 1, gold: 120, wood: 40, item: 0.0, extra: null },
  banditen: { name: 'Banditenlager', units: ['bandit', 'bandit', 'schuetze'], minTH: 1, gold: 220, wood: 90, item: 0.35, extra: null },
  troll:    { name: 'Trollhöhle', units: ['troll', 'troll', 'hexer'], minTH: 2, gold: 320, wood: 150, item: 0.5, extra: 'soeldner', extraDesc: '2 Trolle schließen sich dir als Söldner an' },
  golem:    { name: 'Golem-Steinbruch', units: ['golem', 'golem'], minTH: 2, gold: 420, wood: 260, item: 0.7, extra: 'segen', extraDesc: 'Steinhaut: 90 s lang +3 Rüstung für die Armee' },
  drache:   { name: 'Drachenhort', units: ['drache'], minTH: 3, gold: 1000, wood: 450, item: 1.0, rareItem: true, extra: 'drachenblut', extraDesc: 'Drachenblut: 180 s lang +15% Schaden für die Armee' },
};
G.CAMP_RESPAWN = 150;

// Kartenthemen (Heimatkarten der Völker)
G.THEMES = {
  auen:       { name: 'Grüne Auen',        ground: ['#6f8f45', '#7d9b4e', '#627f3c', '#86a35a'], road: '#a8946a', decor: 'eiche', decorCols: ['#3f6a2a', '#4f7d33', '#2f5520'], accent: '#e8d36a' },
  silberwald: { name: 'Silberwald',        ground: ['#3f6b48', '#46784f', '#365e40', '#517f58'], road: '#8a9a7a', decor: 'hochbaum', decorCols: ['#2a5a3a', '#3a7048', '#a8d8c0'], accent: '#c8f0ff' },
  suempfe:    { name: 'Verfluchte Sümpfe', ground: ['#4a5044', '#40463c', '#525a48', '#3a4038'], road: '#5a5448', decor: 'totbaum', decorCols: ['#2a2a26', '#3a3430', '#7a5a9a'], accent: '#9ad0a0' },
  steppe:     { name: 'Rote Steppe',       ground: ['#a8784a', '#b08250', '#9a6c42', '#b88c5a'], road: '#c8a070', decor: 'fels', decorCols: ['#6a4a32', '#7a5a3a', '#e8e0d0'], accent: '#d84a2a' },
  frost:      { name: 'Frostgipfel',       ground: ['#c4ced6', '#b8c4cc', '#d0d8de', '#aebcc6'], road: '#9aa4aa', decor: 'tanne', decorCols: ['#2a4a3a', '#36584a', '#ffffff'], accent: '#7ac0f0' },
  asche:      { name: 'Aschenlande',       ground: ['#3a2c28', '#42322c', '#332622', '#4a3830'], road: '#5a4238', decor: 'lava', decorCols: ['#1a1210', '#2a1a16', '#ff6a1a'], accent: '#ff8a3a' },
};

G.PLAYER_COLORS = ['#3d7bff', '#e0453a', '#3fbf5a', '#e8b030'];
G.DIFFICULTY = {
  einfach: { name: 'Einfach', eco: 0.8,  think: 2.5, attackFrac: 0.85, minAttack: 480, focus: false, abilityChance: 0.4 },
  mittel:  { name: 'Mittel',  eco: 1.0,  think: 1.2, attackFrac: 0.75, minAttack: 360, focus: false, abilityChance: 0.8 },
  schwer:  { name: 'Schwer',  eco: 1.25, think: 0.5, attackFrac: 0.65, minAttack: 270, focus: true,  abilityChance: 1.0 },
};
