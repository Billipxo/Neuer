'use strict';
// Spieldaten: Völker, Einheiten, Helden, Gebäude, Gegenstände, neutrale Monster.
window.G = window.G || {};

G.TILE = 40;
// Versorgung (Einheitenlimit): je Haupthaus-Stufe, je Unterkunft-Stufe und Obergrenze pro Spieler
G.SUPPLY = { perTH: 15, perHouseLevel: 12, max: 300 };
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
  unterkunft:   { name: 'Unterkunft', size: 2, hp: 700, cost: { g: 80, w: 60 }, time: 12, desc: '+12 Versorgung pro Stufe.' },
  kaserne:      { name: 'Kaserne', size: 2, hp: 1200, cost: { g: 160, w: 80 }, time: 20, desc: 'Bildet Nahkämpfer (St. 1) und Tanks (St. 2) aus.' },
  schiessstand: { name: 'Schießstand', size: 2, hp: 1000, cost: { g: 150, w: 110 }, time: 20, desc: 'Bildet Fernkämpfer aus.' },
  sanktum:      { name: 'Sanktum', size: 2, hp: 1000, cost: { g: 180, w: 130 }, time: 24, desc: 'Heiler (St. 1), Magier (St. 2), Support (St. 3).' },
  beschwoerung: { name: 'Beschwörungskreis', size: 2, hp: 1000, cost: { g: 220, w: 160 }, time: 28, desc: 'Bildet Beschwörer aus.' },
  schmiede:     { name: 'Schmiede', size: 2, hp: 1000, cost: { g: 180, w: 120 }, time: 25, desc: 'Erforscht Waffen, Rüstung und Ausbildung für alle Einheiten.' },
  turm:         { name: 'Wachturm', size: 1, hp: 950, cost: { g: 110, w: 60 }, time: 15, attack: { dmg: 28, range: 240, cd: 1.0 }, desc: 'Schneller Einzelziel-Verteidigungsturm.' },
  aussenposten: { name: 'Außenposten', size: 2, hp: 1400, cost: { g: 300, w: 200 }, time: 30, attack: { dmg: 20, range: 220, cd: 1.2 }, outpost: true,
                  desc: 'Nur auf Goldadern außerhalb der Basis. +3 Gold/s und +1 Holz/s pro Stufe, verteidigt sich selbst.' },
  kanone:       { name: 'Kanonenturm', size: 1, hp: 1200, cost: { g: 200, w: 120 }, time: 22, attack: { dmg: 50, range: 220, cd: 2.2, splash: 65 }, desc: 'Langsamer Flächenschaden.' },
};
// Maximale Anzahl je Haupthaus-Stufe 1..5
G.LIMITS = {
  haupthaus: [1, 1, 1, 1, 1], goldmine: [1, 2, 2, 3, 3], saegewerk: [1, 1, 2, 2, 3], unterkunft: [1, 2, 3, 4, 5],
  kaserne: [1, 1, 2, 2, 3], schiessstand: [0, 1, 1, 2, 2], sanktum: [0, 1, 1, 1, 2], beschwoerung: [0, 0, 1, 1, 1],
  schmiede: [0, 1, 1, 1, 1], turm: [1, 2, 3, 4, 5], kanone: [0, 0, 1, 2, 3], aussenposten: [0, 1, 2, 2, 3],
};
G.BUILD_ORDER = ['goldmine', 'kaserne', 'saegewerk', 'unterkunft', 'turm', 'schiessstand', 'sanktum', 'schmiede', 'beschwoerung', 'kanone', 'aussenposten'];

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
    passive: { name: 'Handelsgilden', desc: '+15% Goldeinkommen', eco: { goldPct: 0.15 } },
    map: { name: 'Grüne Auen', theme: 'auen' },
    units: {
      tank: { name: 'Schildwache', mods: { hp: 1.1, armor: 1 } },
      nahkampf: { name: 'Schwertkämpfer', mods: { hp: 1.08 } },
      fernkampf: { name: 'Armbrustschütze', mods: { dmg: 1.12, cd: 1.08 } },
      magier: { name: 'Kampfmagier' },
      heiler: { name: 'Priesterin' },
      support: { name: 'Bannerträger', aura: { side: 'ally', stat: 'dmg', value: 0.15, desc: 'Verbündete in der Nähe +15% Schaden' } },
      beschwoerer: { name: 'Elementarist', summon: { name: 'Wasserelementar', hp: 320, dmg: 20, range: 120, cd: 1.4, speed: 55, armor: 1, proj: 'kugel', life: 40, r: 11 } },
    },
    heroes: [
      { id: 'aldric', name: 'Paladin Aldric', title: 'Hüter des Lichts', ranged: false, stats: { hp: 1050, dmg: 34, armor: 6 },
        bonus: [{ roles: ['tank'], hp: 0.25 }, { roles: ['all'], armor: 2, regen: 2 }], bonusDesc: 'Tanks +25% LP, alle Einheiten +2 Rüstung und +2 LP/s',
        abilities: [
          { name: 'Heiliges Licht', type: 'heal', amount: 300, radius: 260, cd: 14 },
          { name: 'Gottesschild', type: 'buff', stat: 'armor', value: 6, duration: 10, radius: 260, cd: 24 }] },
      { id: 'lyra', name: 'Erzmagierin Lyra', title: 'Stimme des Turms', ranged: true, stats: { hp: 700, dmg: 40, armor: 2 },
        bonus: [{ roles: ['magier', 'heiler'], dmg: 0.20, heal: 0.20 }], bonusDesc: 'Magier & Heiler +20% Schaden/Heilung',
        abilities: [
          { name: 'Feuerball', type: 'nuke', dmg: 320, cd: 9 },
          { name: 'Blizzard', type: 'aoe', dmg: 190, radius: 130, cd: 15 }] },
      { id: 'gareth', name: 'Feldherr Gareth', title: 'Schwert des Königs', ranged: false, stats: { hp: 950, dmg: 42, armor: 4 },
        bonus: [{ roles: ['nahkampf', 'fernkampf'], dmg: 0.18 }, { roles: ['all'], speed: 0.10 }], bonusDesc: 'Nah- & Fernkampf +18% Schaden, alle +10% Tempo',
        abilities: [
          { name: 'Sturmangriff', type: 'stun', dmg: 170, radius: 135, stun: 1.5, cd: 14 },
          { name: 'Schlachtruf', type: 'buff', stat: 'dmg', value: 0.3, duration: 10, radius: 300, cd: 26 }] },
    ],
  },
  elfen: {
    name: 'Elfen', color: '#9fd18c', dark: '#2f5a33',
    palette: { wall: '#d8d0b8', roof: '#3f8a4a', trim: '#e8e2c0' },
    desc: 'Uralte Waldvölker – flink, präzise und eng mit der Natur verbunden.',
    passive: { name: 'Lebenshauch', desc: 'Alle Einheiten regenerieren +3 LP/s', bonus: [{ roles: ['all', 'summon'], regen: 3 }] },
    map: { name: 'Silberwald', theme: 'silberwald' },
    units: {
      tank: { name: 'Baumhüter', mods: { hp: 1.1, speed: 0.9 } },
      nahkampf: { name: 'Klingentänzerin', mods: { cd: 0.85 } },
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
          { name: 'Pfeilhagel', type: 'aoe', dmg: 155, radius: 140, cd: 12 },
          { name: 'Eulenblick', type: 'buff', stat: 'atkspd', value: 0.35, duration: 10, radius: 300, cd: 24 }] },
      { id: 'thalia', name: 'Hohedruidin Thalia', title: 'Herz des Hains', ranged: true, stats: { hp: 760, dmg: 30, armor: 3 },
        bonus: [{ roles: ['heiler'], heal: 0.30 }, { roles: ['all'], regen: 2 }], bonusDesc: 'Heiler +30% Heilung, alle +2 LP/s',
        abilities: [
          { name: 'Verjüngung', type: 'heal', amount: 260, radius: 240, cd: 13 },
          { name: 'Wurzelgriff', type: 'stun', dmg: 130, radius: 150, stun: 2.5, cd: 16 }] },
      { id: 'faelar', name: 'Klingenmeister Faelar', title: 'Tanz der Klingen', ranged: false, stats: { hp: 950, dmg: 50, armor: 3 },
        bonus: [{ roles: ['nahkampf'], dmg: 0.20 }, { roles: ['all'], atkspd: 0.12 }], bonusDesc: 'Nahkampf +20% Schaden, alle +12% Angriffstempo',
        abilities: [
          { name: 'Klingenwirbel', type: 'aoe', self: true, dmg: 255, radius: 130, cd: 11 },
          { name: 'Ahnengeister', type: 'summon', count: 2, duration: 30, cd: 30,
            unit: { name: 'Ahnengeist', hp: 380, dmg: 26, range: 24, cd: 1.0, speed: 75, armor: 2, r: 11 } }] },
    ],
  },
  untote: {
    name: 'Untote', color: '#a9b5ac', dark: '#3b3f4a',
    palette: { wall: '#4a4650', roof: '#5d3a78', trim: '#9ad0a0' },
    desc: 'Eine endlose Flut aus Knochen und dunkler Magie, angeführt von Nekromanten.',
    passive: { name: 'Seelenlos', desc: 'Einheiten kosten 12% weniger Gold', eco: { unitDiscount: 0.12 } },
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
        bonus: [{ roles: ['magier'], dmg: 0.20 }, { roles: ['beschwoerer'], summonExtra: 1 }], bonusDesc: 'Magier +20% Schaden, Beschwörer +1 Beschwörung',
        abilities: [
          { name: 'Frostnova', type: 'stun', dmg: 150, radius: 140, stun: 1.2, cd: 13 },
          { name: 'Todesspirale', type: 'nuke', dmg: 300, cd: 10 }] },
      { id: 'kael', name: 'Todesritter Kael', title: 'Der Gefallene', ranged: false, stats: { hp: 1150, dmg: 46, armor: 6 },
        bonus: [{ roles: ['tank', 'nahkampf'], hp: 0.20 }, { roles: ['all'], lifesteal: 0.10, dmg: 0.05 }], bonusDesc: 'Tanks & Nahkampf +20% LP, alle 10% Lebensraub und +5% Schaden',
        abilities: [
          { name: 'Todesgriff', type: 'drain', dmg: 300, cd: 10 },
          { name: 'Unheilige Raserei', type: 'buff', stat: 'speed', value: 0.3, extra: { atkspd: 0.35 }, duration: 10, radius: 300, cd: 25 }] },
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
    passive: { name: 'Kriegerblut', desc: 'Nahkampf & Tanks +20% LP', bonus: [{ roles: ['nahkampf', 'tank'], hp: 0.20 }] },
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
      { id: 'urgash', name: 'Kriegshäuptling Urgash', title: 'Der Schädelspalter', ranged: false, stats: { hp: 1120, dmg: 46, armor: 4 },
        bonus: [{ roles: ['nahkampf'], dmg: 0.20 }, { roles: ['tank'], hp: 0.15 }, { roles: ['all'], dmg: 0.08 }], bonusDesc: 'Nahkampf +20% Schaden, Tanks +15% LP, alle +8% Schaden',
        abilities: [
          { name: 'Erdbeben', type: 'stun', self: true, dmg: 230, radius: 160, stun: 1.5, cd: 15 },
          { name: 'Kriegsschrei', type: 'buff', stat: 'dmg', value: 0.4, duration: 10, radius: 320, cd: 25 }] },
      { id: 'mogra', name: 'Sturmseherin Mogra', title: 'Ruferin der Blitze', ranged: true, stats: { hp: 740, dmg: 38, armor: 2 },
        bonus: [{ roles: ['magier', 'heiler'], dmg: 0.16, heal: 0.16 }], bonusDesc: 'Magier & Heiler +16% Schaden/Heilung',
        abilities: [
          { name: 'Kettenblitz', type: 'aoe', dmg: 170, radius: 130, cd: 12 },
          { name: 'Geisterwölfe', type: 'summon', count: 3, duration: 30, cd: 26,
            unit: { name: 'Geisterwolf', hp: 300, dmg: 22, range: 24, cd: 0.9, speed: 85, armor: 1, r: 10 } }] },
      { id: 'throk', name: 'Bestienmeister Throk', title: 'Herr der Wildnis', ranged: false, stats: { hp: 1000, dmg: 40, armor: 3 },
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
    passive: { name: 'Steinerne Hallen', desc: 'Gebäude +20% LP, Türme +10% Schaden', bonus: [{ roles: ['buildings'], hp: 0.20 }, { roles: ['defense'], dmg: 0.10 }] },
    map: { name: 'Frostgipfel', theme: 'frost' },
    units: {
      tank: { name: 'Eisenbrecher', mods: { armor: 2 } },
      nahkampf: { name: 'Axtschwinger', mods: { hp: 1.1, speed: 0.9 } },
      fernkampf: { name: 'Musketier', mods: { dmg: 1.15, cd: 1.25 } },
      magier: { name: 'Runenschmied' },
      heiler: { name: 'Runenpriester' },
      support: { name: 'Bannermeister', aura: { side: 'ally', stat: 'armor', value: 3, desc: 'Verbündete in der Nähe +3 Rüstung' } },
      beschwoerer: { name: 'Golemschmied', summon: { name: 'Steingolem', hp: 480, dmg: 22, range: 26, cd: 1.3, speed: 48, armor: 4, life: 45, r: 12 } },
    },
    heroes: [
      { id: 'thorgrim', name: 'Bergkönig Thorgrim', title: 'Der Unbeugsame', ranged: false, stats: { hp: 1180, dmg: 40, armor: 6 },
        bonus: [{ roles: ['tank'], hp: 0.25 }, { roles: ['all'], armor: 2, dmg: 0.08 }], bonusDesc: 'Tanks +25% LP, alle +2 Rüstung und +8% Schaden',
        abilities: [
          { name: 'Sturmhammer', type: 'nuke', dmg: 300, stun: 1.5, cd: 9 },
          { name: 'Donnerknall', type: 'stun', self: true, dmg: 180, radius: 160, stun: 1.2, cd: 15 }] },
      { id: 'hilda', name: 'Runenmeisterin Hilda', title: 'Hüterin der Esse', ranged: true, stats: { hp: 760, dmg: 36, armor: 3 },
        bonus: [{ roles: ['buildings'], hp: 0.20 }, { roles: ['defense'], dmg: 0.15 }, { roles: ['magier'], dmg: 0.10 }], bonusDesc: 'Gebäude +20% LP, Türme +15% Schaden, Magier +10%',
        abilities: [
          { name: 'Runensegen', type: 'buff', stat: 'armor', value: 5, duration: 10, radius: 280, cd: 20 },
          { name: 'Runenexplosion', type: 'aoe', dmg: 195, radius: 130, cd: 13 }] },
      { id: 'brokk', name: 'Kanonier Brokk', title: 'Meister des Pulvers', ranged: true, stats: { hp: 800, dmg: 44, armor: 3 },
        bonus: [{ roles: ['fernkampf'], dmg: 0.15 }], bonusDesc: 'Fernkampf +15% Schaden',
        abilities: [
          { name: 'Sprenggranate', type: 'aoe', dmg: 180, radius: 120, cd: 11 },
          { name: 'Geschützturm', type: 'summon', count: 1, duration: 30, cd: 24,
            unit: { name: 'Geschütz', hp: 600, dmg: 30, range: 200, cd: 0.9, speed: 0, armor: 4, proj: 'kugel', r: 12 } }] },
    ],
  },
  daemonen: {
    name: 'Dämonen', color: '#c0484a', dark: '#4a1418',
    palette: { wall: '#2e2426', roof: '#8a1e1e', trim: '#ff8a3a' },
    desc: 'Brut aus den Höllenschlünden – sie nähren sich vom Leben ihrer Feinde.',
    passive: { name: 'Seelenhunger', desc: 'Alle Einheiten 12% Lebensraub', bonus: [{ roles: ['all', 'summon'], lifesteal: 0.12 }] },
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
      { id: 'azgaroth', name: 'Grubenlord Azgaroth', title: 'Die Flamme des Abgrunds', ranged: false, stats: { hp: 1150, dmg: 44, armor: 5 },
        bonus: [{ roles: ['all'], dmg: 0.14 }], bonusDesc: 'Alle Einheiten +14% Schaden',
        abilities: [
          { name: 'Feuerregen', type: 'aoe', dmg: 195, radius: 150, cd: 13 },
          { name: 'Höllenschlag', type: 'stun', self: true, dmg: 130, radius: 130, stun: 1.5, cd: 16 }] },
      { id: 'lysara', name: 'Königin Lysara', title: 'Die Seelentrinkerin', ranged: true, stats: { hp: 760, dmg: 38, armor: 2 },
        bonus: [{ roles: ['all'], lifesteal: 0.10, dmg: 0.08 }, { roles: ['heiler'], heal: 0.20 }], bonusDesc: 'Alle +10% Lebensraub und +8% Schaden, Heiler +20%',
        abilities: [
          { name: 'Lebensentzug', type: 'drain', dmg: 300, cd: 9 },
          { name: 'Bann', type: 'stun', dmg: 150, radius: 120, stun: 2, cd: 16 }] },
      { id: 'malphas', name: 'Erzbeschwörer Malphas', title: 'Öffner der Tore', ranged: true, stats: { hp: 720, dmg: 36, armor: 2 },
        bonus: [{ roles: ['beschwoerer'], summonExtra: 1 }, { roles: ['summon'], dmg: 0.12, hp: 0.12 }], bonusDesc: 'Beschwörer +1 Beschwörung, Beschwörungen +12%',
        abilities: [
          { name: 'Wichtelschwarm', type: 'summon', count: 3, duration: 30, cd: 24,
            unit: { name: 'Wichtel', hp: 200, dmg: 18, range: 120, cd: 1.0, speed: 75, armor: 0, proj: 'kugel', r: 9 } },
          { name: 'Höllenriss', type: 'aoe', dmg: 190, radius: 130, cd: 14 }] },
    ],
  },
};
G.RACE_KEYS = Object.keys(G.RACES);

// ---------------------------------------------------------------------------
// Volksspezifische Gebäudenamen
// Reihenfolge: haupthaus, goldmine, saegewerk, unterkunft, kaserne, schiessstand, sanktum, beschwoerung, schmiede, turm, kanone, aussenposten
(function () {
  const keys = ['haupthaus', 'goldmine', 'saegewerk', 'unterkunft', 'kaserne', 'schiessstand', 'sanktum', 'beschwoerung', 'schmiede', 'turm', 'kanone', 'aussenposten'];
  const names = {
    menschen: ['Burgfried', 'Goldmine', 'Sägewerk', 'Bauernhaus', 'Kaserne', 'Schießplatz', 'Kathedrale', 'Elementarzirkel', 'Schmiede', 'Wachturm', 'Kanonenturm', 'Grenzfeste'],
    elfen: ['Mondbaum', 'Kristallader', 'Holzhain', 'Mondlaube', 'Klingenhain', 'Bogenlichtung', 'Mondtempel', 'Hain der Rufer', 'Mondschmiede', 'Wächterbaum', 'Arkanspitze', 'Waldposten'],
    untote: ['Nekropole', 'Verfluchte Mine', 'Knochensäge', 'Gruft', 'Ghulgrube', 'Knochenwerkstatt', 'Tempel der Verdammten', 'Opferaltar', 'Seelenschmiede', 'Geisterturm', 'Seuchenkatapult', 'Totenposten'],
    orks: ['Großhalle', 'Goldgrube', 'Holzfällerlager', 'Orkhöhle', 'Kriegslager', 'Speerhütte', 'Geisterhütte', 'Bestiarium', 'Kriegsschmiede', 'Wachposten', 'Katapultstand', 'Raubposten'],
    zwerge: ['Bergfeste', 'Tiefe Mine', 'Holzwerk', 'Steinhalle', 'Waffenhalle', 'Schützenhalle', 'Runentempel', 'Golemwerkstatt', 'Große Esse', 'Schützenturm', 'Kanonenbastion', 'Grubenposten'],
    daemonen: ['Höllenschlund', 'Seelenmine', 'Ascheforst', 'Brutstätte', 'Höllenkaserne', 'Teufelsbastion', 'Blutaltar', 'Höllenportal', 'Höllenschmiede', 'Teufelsspitze', 'Feuerturm', 'Schwefelposten'],
  };
  for (const r in names) { G.RACES[r].bnames = {}; keys.forEach((k, i) => (G.RACES[r].bnames[k] = names[r][i])); }
})();
G.bname = (race, type) => (G.RACES[race].bnames && G.RACES[race].bnames[type]) || G.BUILDINGS[type].name;

// ---------------------------------------------------------------------------
// Volksfähigkeiten: 3 je Volk, freigeschaltet über die Haupthaus-Stufe (Tasten 1/R, 2, 3)
// Typen: buff, heal, summon, strike, curse, fortify
G.RACES.menschen.abilities = [
  { id: 'banner', name: 'Heiliges Banner', th: 1, cd: 90, type: 'buff', mods: { dmg: 0.25, armor: 3 }, dur: 15, desc: 'Alle Einheiten erhalten 15 s lang +25% Schaden und +3 Rüstung.' },
  { id: 'miliz', name: 'Ruf zu den Waffen', th: 3, cd: 100, type: 'summon', at: 'army', count: 5, life: 45, unit: { name: 'Milizsoldat', hp: 320, dmg: 20, range: 24, cd: 1.0, speed: 65, armor: 3, r: 11 }, desc: '5 Milizsoldaten eilen deiner Armee zu Hilfe (45 s).' },
  { id: 'zorn', name: 'Himmlischer Zorn', th: 5, cd: 120, type: 'strike', shells: 6, dmg: 200, radius: 85, stun: 0.6, color: '#fff2a0', desc: '6 Lichtstrahlen schlagen in die größte Gegnergruppe ein.' },
];
G.RACES.elfen.abilities = [
  { id: 'mondsegen', name: 'Mondsegen', th: 1, cd: 80, type: 'heal', pct: 0.5, desc: 'Heilt alle eigenen Einheiten sofort um 50% ihrer maximalen LP.' },
  { id: 'wurzeln', name: 'Zorn der Natur', th: 3, cd: 90, type: 'strike', shells: 1, dmg: 140, radius: 170, stun: 3, color: '#7aff7a', desc: 'Wurzeln brechen hervor: Schaden und 3 s Betäubung in großem Radius.' },
  { id: 'sternenregen', name: 'Sternenregen', th: 5, cd: 120, type: 'strike', shells: 12, dmg: 120, radius: 70, color: '#c8f0ff', desc: '12 Sterne regnen auf die Gegner nieder.' },
];
G.RACES.untote.abilities = [
  { id: 'erweckung', name: 'Totenerweckung', th: 1, cd: 90, type: 'summon', at: 'cluster', count: 6, life: 45, unit: { name: 'Skelettkrieger', hp: 230, dmg: 17, range: 24, cd: 1.0, speed: 65, armor: 1, r: 10 }, desc: 'Erweckt 6 Skelettkrieger an der Front (45 s).' },
  { id: 'seuche', name: 'Seuchenhauch', th: 3, cd: 90, type: 'curse', radius: 200, dmg: 80, mods: { armor: -4, speed: -0.3, dmg: -0.15 }, dur: 12, color: '#9aff7a', desc: 'Verseucht Gegner: −4 Rüstung, −30% Tempo, −15% Schaden für 12 s.' },
  { id: 'knochendrache', name: 'Knochendrache', th: 5, cd: 140, type: 'summon', at: 'cluster', count: 1, life: 45, unit: { name: 'Knochendrache', hp: 2600, dmg: 70, range: 140, cd: 1.6, speed: 60, armor: 5, r: 24, proj: 'feuer', splash: 70 }, desc: 'Erhebt einen Knochendrachen (45 s).' },
];
G.RACES.orks.abilities = [
  { id: 'blutrausch', name: 'Blutrausch', th: 1, cd: 90, type: 'buff', mods: { atkspd: 0.4, speed: 0.2 }, dur: 12, desc: 'Alle Einheiten erhalten 12 s lang +40% Angriffstempo und +20% Tempo.' },
  { id: 'wolfsreiter', name: 'Wolfsreiter-Ansturm', th: 3, cd: 100, type: 'summon', at: 'army', count: 4, life: 45, unit: { name: 'Wolfsreiter', hp: 480, dmg: 28, range: 24, cd: 1.0, speed: 95, armor: 3, r: 13 }, desc: '4 Wolfsreiter stürmen herbei (45 s).' },
  { id: 'erdspalter', name: 'Erdspalter', th: 5, cd: 120, type: 'strike', shells: 1, dmg: 300, radius: 190, stun: 2.5, color: '#c87a3a', desc: 'Die Erde bricht auf: hoher Schaden und 2,5 s Betäubung.' },
];
G.RACES.zwerge.abilities = [
  { id: 'moerser', name: 'Mörsersalve', th: 1, cd: 80, type: 'strike', shells: 7, dmg: 90, radius: 70, color: '#ffb040', desc: '7 Mörsergranaten schlagen in der größten Gegnergruppe ein.' },
  { id: 'festung', name: 'Festungsbefehl', th: 3, cd: 100, type: 'fortify', heal: 0.35, mods: { armor: 6 }, dur: 20, desc: 'Alle Gebäude werden um 35% repariert, Einheiten erhalten 20 s lang +6 Rüstung.' },
  { id: 'luftschiff', name: 'Luftschiff-Bombardement', th: 5, cd: 130, type: 'strike', shells: 12, dmg: 120, radius: 75, color: '#ff8a3a', desc: 'Ein Luftschiff wirft 12 Bomben ab.' },
];
G.RACES.daemonen.abilities = [
  { id: 'hoellenfeuer', name: 'Höllenfeuer', th: 1, cd: 100, type: 'strike', shells: 1, meteor: true, dmg: 260, radius: 130, stun: 1.2, color: '#ff5020',
    summon: { name: 'Infernal', hp: 1600, dmg: 50, range: 30, cd: 1.3, speed: 55, armor: 6, r: 18 }, life: 35, desc: 'Ein Meteor schlägt ein und ruft ein Infernal herbei.' },
  { id: 'blutopfer', name: 'Blutopfer', th: 3, cd: 90, type: 'buff', mods: { dmg: 0.25, lifesteal: 0.25 }, dur: 15, hpCost: 0.1, desc: 'Opfert 10% LP aller Einheiten: 15 s lang +25% Schaden und +25% Lebensraub.' },
  { id: 'hoellentor', name: 'Höllentor', th: 5, cd: 140, type: 'summon', at: 'cluster', count: 4, life: 45, unit: { name: 'Teufelswache', hp: 700, dmg: 38, range: 26, cd: 1.1, speed: 70, armor: 5, r: 14 }, desc: 'Ein Höllentor entlässt 4 Teufelswachen (45 s).' },
];

// ---------------------------------------------------------------------------
// Talentbaum: 3 Zweige × 4 Stufen. 1 Punkt pro Heldenstufe. Stufe n benötigt n−1 Punkte im Zweig.
G.TALENTS = [
  { id: 'krieg', name: 'Krieg', color: '#e0503a', talents: [
    { id: 'klingen', name: 'Scharfe Klingen', desc: 'Alle Einheiten +8% Schaden', bonus: { roles: ['all', 'summon'], dmg: 0.08 } },
    { id: 'rausch', name: 'Kampfrausch', desc: 'Alle Einheiten +10% Angriffstempo', bonus: { roles: ['all', 'summon'], atkspd: 0.10 } },
    { id: 'veteranen', name: 'Veteranen', desc: 'Neue Einheiten starten eine Stufe höher', special: 'veteranen' },
    { id: 'vernichter', name: 'Vernichter', desc: '+30% Schaden gegen Gebäude', special: 'siege' },
  ] },
  { id: 'bollwerk', name: 'Bollwerk', color: '#4a8ae0', talents: [
    { id: 'haut', name: 'Dicke Haut', desc: 'Alle Einheiten +10% LP', bonus: { roles: ['all', 'summon'], hp: 0.10 } },
    { id: 'sanitaeter', name: 'Feldsanitäter', desc: '+2 LP/s Regeneration, Heiler +15%', bonus: { roles: ['all', 'summon'], regen: 2, heal: 0.15 } },
    { id: 'festung', name: 'Befestigte Basis', desc: 'Gebäude +25% LP, Türme +20% Schaden', bonus: [{ roles: ['buildings'], hp: 0.25 }, { roles: ['defense'], dmg: 0.2 }] },
    { id: 'unbeugsam', name: 'Unbeugsam', desc: 'Alle Einheiten +2 Rüstung, Held +15% LP', bonus: [{ roles: ['all', 'summon'], armor: 2 }, { roles: ['hero'], hp: 0.15 }] },
  ] },
  { id: 'wohlstand', name: 'Wohlstand', color: '#e0b030', talents: [
    { id: 'arbeiter', name: 'Fleißige Arbeiter', desc: '+10% Goldeinkommen', eco: { goldPct: 0.10 } },
    { id: 'holzrecht', name: 'Holzrecht', desc: '+15% Holzeinkommen', eco: { woodPct: 0.15 } },
    { id: 'gilde', name: 'Baumeistergilde', desc: '+1 Baumeister, Bauen 20% schneller', eco: { builder: 1, buildSpeed: 0.2 } },
    { id: 'kasse', name: 'Kriegskasse', desc: 'Einheiten 10% billiger, Volksfähigkeiten laden 20% schneller', eco: { unitDiscount: 0.10, abilityCdr: 0.2 } },
  ] },
];

// ---------------------------------------------------------------------------
// Mauer-Upgrades (nicht frei platzierbar: Ring um die Basis, über das Haupthaus erwerbbar)
G.WALLS = [
  { name: 'Holzpalisade', th: 2, hp: 450, armor: 2, cost: { g: 200, w: 250 }, time: 30 },
  { name: 'Steinmauer', th: 3, hp: 1000, armor: 5, cost: { g: 500, w: 400 }, time: 45 },
  { name: 'Festungsmauer', th: 4, hp: 1800, armor: 8, cost: { g: 900, w: 700 }, time: 60 },
];
G.WALL_RADIUS = G.BASE_RADIUS + 36;

// ---------------------------------------------------------------------------
// Skins (über Volks-XP freischaltbar)
G.SKINS = [
  { id: 'standard', name: 'Standard', lvl: 1 },
  { id: 'veteran', name: 'Veteran', lvl: 2, desc: 'Dunkler Stahl und silberne Beschläge' },
  { id: 'elite', name: 'Elite', lvl: 4, desc: 'Marmor, Gold und edle Banner' },
  { id: 'legende', name: 'Legendär', lvl: 7, desc: 'Leuchtende Aura um alle Einheiten' },
];
G.LEGEND_COLORS = { menschen: '#fff4c0', elfen: '#7af0ff', untote: '#5aff8a', orks: '#ff5a1a', zwerge: '#ffd23a', daemonen: '#c060ff' };


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
  // wandernde Bosse und Händlerkarawanen (Karten-Ereignisse)
  ogerkoenig: { name: 'Ogerkönig Gruumsh', hp: 5200, dmg: 85, range: 34, cd: 1.5, speed: 52, armor: 7, r: 24, xp: 700, gold: 0, splash: 55, color: '#8a6a4a', boss: true },
  koloss:     { name: 'Uralter Koloss', hp: 7000, dmg: 95, range: 36, cd: 1.9, speed: 42, armor: 10, r: 28, xp: 800, gold: 0, splash: 70, color: '#7a7468', boss: true },
  lindwurm:   { name: 'Lindwurm Vermithrax', hp: 6000, dmg: 90, range: 120, cd: 1.7, speed: 50, armor: 6, r: 28, xp: 800, gold: 0, proj: 'feuer', splash: 80, color: '#3a7a4a', boss: true },
  wagen:      { name: 'Händlerwagen', hp: 1600, dmg: 0, range: 0, cd: 99, speed: 40, armor: 5, r: 17, xp: 120, gold: 0, color: '#8a6a3a', wagon: true },
  wache:      { name: 'Karawanenwache', hp: 440, dmg: 24, range: 24, cd: 1.0, speed: 60, armor: 4, r: 11, xp: 50, gold: 10, color: '#6a5a4a' },
  armbrust:   { name: 'Karawanenschütze', hp: 260, dmg: 22, range: 160, cd: 1.2, speed: 60, armor: 1, r: 10, xp: 45, gold: 10, proj: 'pfeil', color: '#5a4a3a' },
};
// reward: gold/wood beim Säubern, item = Chance auf Beute, extra = Zusatzbelohnung
G.CAMPS = {
  wolf:     { name: 'Wolfsrudel', units: ['wolf', 'wolf', 'wolf'], minTH: 1, gold: 120, wood: 40, item: 0.0, extra: null },
  banditen: { name: 'Banditenlager', units: ['bandit', 'bandit', 'schuetze'], minTH: 1, gold: 220, wood: 90, item: 0.35, extra: null },
  troll:    { name: 'Trollhöhle', units: ['troll', 'troll', 'hexer'], minTH: 2, gold: 320, wood: 150, item: 0.5, extra: 'soeldner', extraDesc: '2 Trolle schließen sich dir als Söldner an' },
  golem:    { name: 'Golem-Steinbruch', units: ['golem', 'golem'], minTH: 2, gold: 420, wood: 260, item: 0.7, extra: 'segen', extraDesc: 'Steinhaut: 90 s lang +3 Rüstung für die Armee' },
  drache:   { name: 'Drachenhort', units: ['drache'], minTH: 3, gold: 1000, wood: 450, item: 1.0, rareItem: true, extra: 'drachenblut', extraDesc: 'Drachenblut: 180 s lang +15% Schaden für die Armee' },
  // Ereignisse: ziehen über die Karte und kehren nicht wieder
  boss:     { name: 'Wandernder Boss', units: [], minTH: 3, gold: 900, wood: 400, item: 1.0, rareItem: true, extra: 'siegesbanner', extraDesc: 'Siegesbanner: 180 s lang +15% Schaden und +3 Rüstung für die Armee' },
  karawane: { name: 'Händlerkarawane', units: ['wagen', 'wache', 'wache', 'armbrust'], minTH: 1, gold: 450, wood: 150, item: 0.5, extra: null },
};
G.CAMP_RESPAWN = 150;
G.BOSS_TYPES = ['ogerkoenig', 'koloss', 'lindwurm'];
// Karten-Ereignisse (abschaltbar im Freien Spiel): erster Boss nach ~9 min, dann alle 10–13 min; Karawanen alle 7–9 min
G.EVENTS = { bossFirst: 540, bossEvery: [600, 780], bossLife: 420, caravanFirst: 330, caravanEvery: [420, 540] };
// Schreine: wer einen Schrein 8 s lang allein besetzt, erobert ihn – der Bonus gilt für das ganze Team
G.SHRINES = {
  krieg:     { name: 'Schrein des Krieges', short: 'Krieg', desc: 'Alle Einheiten +10% Schaden', mods: { dmg: 0.10 }, color: '#ff6a4a' },
  leben:     { name: 'Schrein des Lebens', short: 'Leben', desc: 'Alle Einheiten +3 LP/s Regeneration', mods: { regen: 3 }, color: '#7aff8a' },
  wohlstand: { name: 'Schrein des Wohlstands', short: 'Wohlstand', desc: '+4 Gold pro Sekunde', gold: 4, color: '#ffd23a' },
  eile:      { name: 'Schrein der Eile', short: 'Eile', desc: 'Alle Einheiten +10% Tempo und +8% Angriffstempo', mods: { speed: 0.10, atkspd: 0.08 }, color: '#7ac8ff' },
};
G.SHRINE_CAPTURE = 8;
G.SHRINE_RADIUS = 130;

// Kartenthemen (Heimatkarten der Völker)
G.THEMES = {
  auen:       { name: 'Grüne Auen',        ground: ['#6f8f45', '#7d9b4e', '#627f3c', '#86a35a'], road: '#a8946a', decor: 'eiche', decorCols: ['#3f6a2a', '#4f7d33', '#2f5520'], accent: '#e8d36a', critters: ['hase', 'reh', 'vogel'],
                music: { scale: [0, 2, 4, 7, 9], root: 57, tempo: 92, lead: 'laute', pad: 'warm', drums: 'leicht' } },
  silberwald: { name: 'Silberwald',        ground: ['#3f6b48', '#46784f', '#365e40', '#517f58'], road: '#8a9a7a', decor: 'hochbaum', decorCols: ['#2a5a3a', '#3a7048', '#a8d8c0'], accent: '#c8f0ff', critters: ['reh', 'gluehwurm', 'eule'],
                music: { scale: [0, 2, 4, 6, 7, 9, 11], root: 62, tempo: 76, lead: 'harfe', pad: 'glas', drums: 'keine' } },
  suempfe:    { name: 'Verfluchte Sümpfe', ground: ['#4a5044', '#40463c', '#525a48', '#3a4038'], road: '#5a5448', decor: 'totbaum', decorCols: ['#2a2a26', '#3a3430', '#7a5a9a'], accent: '#9ad0a0', critters: ['kraehe', 'kroete', 'ratte'],
                music: { scale: [0, 1, 3, 5, 6, 8, 10], root: 50, tempo: 64, lead: 'glocke', pad: 'dunkel', drums: 'leicht' } },
  steppe:     { name: 'Rote Steppe',       ground: ['#a8784a', '#b08250', '#9a6c42', '#b88c5a'], road: '#c8a070', decor: 'fels', decorCols: ['#6a4a32', '#7a5a3a', '#e8e0d0'], accent: '#d84a2a', critters: ['geier', 'echse', 'hase'],
                music: { scale: [0, 2, 3, 5, 7, 9, 10], root: 45, tempo: 104, lead: 'horn', pad: 'dunkel', drums: 'kriegstrommel' } },
  frost:      { name: 'Frostgipfel',       ground: ['#c4ced6', '#b8c4cc', '#d0d8de', '#aebcc6'], road: '#9aa4aa', decor: 'tanne', decorCols: ['#2a4a3a', '#36584a', '#ffffff'], accent: '#7ac0f0', critters: ['schneehase', 'fuchs', 'vogel'],
                music: { scale: [0, 2, 3, 5, 7, 8, 10], root: 64, tempo: 70, lead: 'glocke', pad: 'glas', drums: 'keine' } },
  asche:      { name: 'Aschenlande',       ground: ['#3a2c28', '#42322c', '#332622', '#4a3830'], road: '#5a4238', decor: 'lava', decorCols: ['#1a1210', '#2a1a16', '#ff6a1a'], accent: '#ff8a3a', critters: ['salamander', 'fledermaus', 'glutkaefer'],
                music: { scale: [0, 1, 4, 5, 7, 8, 10], root: 43, tempo: 96, lead: 'horn', pad: 'dunkel', drums: 'schwer' } },
};

// Landschaft je Karte: Haine aus einer Baumart, verstreute Pflanzen und Steine [Art, Gewicht] und große Geländemerkmale.
G.LANDSCAPE = {
  auen:       { grove: 'eiche', flora: [['eiche', 3], ['birke', 2], ['busch', 3], ['blumen', 5], ['gras', 5], ['stein', 1], ['stumpf', 1]],
                features: [['teich', 3], ['felsen', 2], ['steinkreis', 1], ['wiese', 3]] },
  silberwald: { grove: 'hochbaum', flora: [['hochbaum', 3], ['farn', 5], ['leuchtpilz', 3], ['moosstein', 2]],
                features: [['mondsee', 2], ['urbaum', 2], ['kristalle', 2], ['pilzring', 2]] },
  suempfe:    { grove: 'totbaum', flora: [['totbaum', 3], ['grabstein', 2], ['schilf', 5], ['fliegenpilz', 3], ['wurzel', 2]],
                features: [['moor', 4], ['ruine', 2], ['knochenfeld', 2]] },
  steppe:     { grove: 'akazie', flora: [['fels', 3], ['dornbusch', 3], ['gras', 5], ['knochen', 1], ['schaedel', 1], ['akazie', 1]],
                features: [['tafelberg', 3], ['felsnadeln', 2], ['wasserloch', 2], ['gerippe', 1]] },
  frost:      { grove: 'tanne', flora: [['tanne', 3], ['schneefels', 2], ['eiskristall', 3], ['frostbusch', 2]],
                features: [['eissee', 3], ['eisspitzen', 2], ['schneefelsen', 2], ['schneewehe', 2]] },
  asche:      { grove: 'kohlebaum', flora: [['obsidian', 3], ['glutloch', 2], ['kohlebaum', 1], ['glutpilz', 3], ['knochen', 1]],
                features: [['lavasee', 4], ['schlot', 2], ['obsidianspitzen', 2], ['spalte', 2]] },
};
// Geländemerkmale: Radius-Spanne, Verhältnis Höhe/Breite des Grundrisses; block = Hindernis, um das Truppen herumlaufen
G.FEATURES = {
  teich:           { name: 'Teich', r: [70, 110], ry: 0.62, block: true },
  mondsee:         { name: 'Mondsee', r: [75, 110], ry: 0.62, block: true },
  moor:            { name: 'Moortümpel', r: [60, 100], ry: 0.6, block: true },
  wasserloch:      { name: 'Wasserloch', r: [52, 74], ry: 0.6, block: true },
  eissee:          { name: 'Gefrorener See', r: [80, 120], ry: 0.6, block: true },
  lavasee:         { name: 'Lavasee', r: [60, 100], ry: 0.62, block: true },
  felsen:          { name: 'Felsgruppe', r: [45, 68], ry: 0.7, block: true },
  schneefelsen:    { name: 'Schneefelsen', r: [45, 68], ry: 0.7, block: true },
  tafelberg:       { name: 'Tafelberg', r: [70, 100], ry: 0.62, block: true },
  felsnadeln:      { name: 'Felsnadeln', r: [45, 62], ry: 0.7, block: true },
  eisspitzen:      { name: 'Eisspitzen', r: [38, 54], ry: 0.7, block: true },
  obsidianspitzen: { name: 'Obsidianspitzen', r: [38, 54], ry: 0.7, block: true },
  kristalle:       { name: 'Kristallgruppe', r: [36, 50], ry: 0.7, block: true },
  urbaum:          { name: 'Uralter Baum', r: [44, 52], ry: 0.7, block: true },
  steinkreis:      { name: 'Steinkreis', r: [60, 74], ry: 0.66, block: true },
  ruine:           { name: 'Versunkene Ruine', r: [50, 68], ry: 0.66, block: true },
  schlot:          { name: 'Vulkanschlot', r: [30, 40], ry: 0.72, block: true },
  wiese:           { name: 'Blumenwiese', r: [80, 125], ry: 0.7, block: false },
  pilzring:        { name: 'Feenring', r: [40, 56], ry: 0.7, block: false },
  knochenfeld:     { name: 'Knochenfeld', r: [60, 90], ry: 0.7, block: false },
  gerippe:         { name: 'Bestiengerippe', r: [55, 70], ry: 0.6, block: false },
  schneewehe:      { name: 'Schneewehe', r: [80, 125], ry: 0.55, block: false },
  spalte:          { name: 'Glutspalte', r: [90, 140], ry: 0.3, block: false },
};

G.PLAYER_COLORS = ['#3d7bff', '#e0453a', '#3fbf5a', '#e8b030'];
G.DIFFICULTY = {
  einfach: { name: 'Einfach', eco: 0.8,  think: 2.5, attackFrac: 0.85, minAttack: 480, focus: false, abilityChance: 0.4 },
  mittel:  { name: 'Mittel',  eco: 1.0,  think: 1.2, attackFrac: 0.75, minAttack: 360, focus: false, abilityChance: 0.8 },
  schwer:  { name: 'Schwer',  eco: 1.25, think: 0.5, attackFrac: 0.65, minAttack: 270, focus: true,  abilityChance: 1.0 },
};

// Blutfarben (Treffer, Leichen, Flecken)
G.BLOOD = { menschen: '#8a0a0a', elfen: '#7a0a1a', untote: '#3e5a2a', orks: '#6a0a06', zwerge: '#8a0a0a', daemonen: '#4a0404' };
G.CREEP_BLOOD = { wolf: '#7a0a0a', bandit: '#8a0a0a', schuetze: '#8a0a0a', troll: '#3a6a5a', hexer: '#3a6a5a', golem: '#8a8478', drache: '#6a0a0a' };

// ---------------------------------------------------------------------------
// Freischaltbare 4. Helden (ab Volksstufe 3)
G.UNLOCK_HERO_LVL = 3;
G.RACES.menschen.heroes.push({ id: 'mira', unlock: true, name: 'Hexenjägerin Mira', title: 'Die Silberklinge', ranged: true, stats: { hp: 760, dmg: 42, armor: 3 },
  bonus: [{ roles: ['fernkampf', 'support'], dmg: 0.18 }, { roles: ['all'], atkspd: 0.08 }], bonusDesc: 'Fernkampf & Support +18% Schaden, alle +8% Angriffstempo',
  abilities: [{ name: 'Silberbolzen', type: 'nuke', dmg: 340, stun: 1, cd: 8 }, { name: 'Jagdinstinkt', type: 'buff', stat: 'atkspd', value: 0.4, duration: 10, radius: 340, cd: 22 }] });
G.RACES.elfen.heroes.push({ id: 'aerin', unlock: true, name: 'Wächterin Aerin', title: 'Rinde und Dorn', ranged: false, stats: { hp: 1100, dmg: 36, armor: 6 },
  bonus: [{ roles: ['tank'], hp: 0.2, armor: 2 }, { roles: ['all'], regen: 2, armor: 1 }], bonusDesc: 'Tanks +20% LP und +2 Rüstung, alle +2 LP/s und +1 Rüstung',
  abilities: [{ name: 'Dornenwall', type: 'stun', self: true, dmg: 170, radius: 150, stun: 1.5, cd: 14 }, { name: 'Lebensborke', type: 'heal', amount: 260, radius: 230, cd: 15 }] });
G.RACES.untote.heroes.push({ id: 'varuk', unlock: true, name: 'Knochenfürst Varuk', title: 'Der Unersättliche', ranged: false, stats: { hp: 1100, dmg: 44, armor: 5 },
  bonus: [{ roles: ['nahkampf'], dmg: 0.15 }, { roles: ['all'], lifesteal: 0.08 }], bonusDesc: 'Nahkampf +15% Schaden, alle 8% Lebensraub',
  abilities: [{ name: 'Knochensturm', type: 'aoe', self: true, dmg: 250, radius: 130, cd: 11 }, { name: 'Ghulrudel', type: 'summon', count: 3, duration: 30, cd: 26, unit: { name: 'Ghul', hp: 320, dmg: 24, range: 24, cd: 0.8, speed: 80, armor: 2, r: 11 } }] });
G.RACES.orks.heroes.push({ id: 'gruk', unlock: true, name: 'Blutschamane Gruk', title: 'Stimme der Ahnen', ranged: true, stats: { hp: 780, dmg: 38, armor: 3 },
  bonus: [{ roles: ['all'], lifesteal: 0.06 }, { roles: ['heiler'], heal: 0.25 }], bonusDesc: 'Alle 6% Lebensraub, Heiler +25%',
  abilities: [{ name: 'Ahnenruf', type: 'heal', amount: 280, radius: 240, cd: 14 }, { name: 'Blutfluch', type: 'drain', dmg: 300, cd: 10 }] });
G.RACES.zwerge.heroes.push({ id: 'rurik', unlock: true, name: 'Donnerpriester Rurik', title: 'Hammer des Himmels', ranged: true, stats: { hp: 820, dmg: 40, armor: 4 },
  bonus: [{ roles: ['magier'], dmg: 0.15 }, { roles: ['all'], armor: 1 }], bonusDesc: 'Magier +15% Schaden, alle +1 Rüstung',
  abilities: [{ name: 'Donnerschlag', type: 'aoe', dmg: 185, radius: 130, cd: 13 }, { name: 'Runenschild', type: 'buff', stat: 'armor', value: 5, duration: 10, radius: 280, cd: 20 }] });
G.RACES.daemonen.heroes.push({ id: 'vexa', unlock: true, name: 'Schattenklinge Vexa', title: 'Der lautlose Tod', ranged: false, stats: { hp: 1020, dmg: 50, armor: 3 },
  bonus: [{ roles: ['nahkampf'], dmg: 0.15 }, { roles: ['all'], speed: 0.1, dmg: 0.08 }], bonusDesc: 'Nahkampf +15% Schaden, alle +8% Schaden und +10% Tempo',
  abilities: [{ name: 'Schattenstoß', type: 'nuke', dmg: 330, cd: 9 }, { name: 'Klingensturm', type: 'aoe', self: true, dmg: 250, radius: 135, cd: 12 }] });

// ---------------------------------------------------------------------------
// Ultimative Heldenfähigkeiten: ab Heldenstufe 6 wählt man eine von zwei (Taste R).
// Neue Arten: meteor (verzögerte Einschläge am Ziel), avatar (Verwandlung), warcry (ganze Armee),
// massheal (Heilung im großen Umkreis), drainnova (Lebensraub im Umkreis); dazu die bekannten Arten mit mehr Wucht.
G.HERO_ULT_LVL = 6;
G.HERO_ULTS = {
  aldric:   [{ name: 'Göttliche Wiederkunft', type: 'massheal', pct: 0.6, radius: 520, armor: 4, duration: 10, cd: 110 },
             { name: 'Avatar des Lichts', type: 'avatar', duration: 20, mods: { hp: 0.6, dmg: 0.4, armor: 5, regen: 15 }, color: '#ffe88a', cd: 110 }],
  lyra:     [{ name: 'Meteorschauer', type: 'meteor', shells: 6, dmg: 230, radius: 90, stun: 0.8, color: '#ff8a3a', cd: 100 },
             { name: 'Zeitstillstand', type: 'stun', self: true, dmg: 120, radius: 270, stun: 3.2, cd: 105 }],
  gareth:   [{ name: 'Ruhm des Königs', type: 'warcry', duration: 15, mods: { dmg: 0.3, atkspd: 0.25, speed: 0.15 }, cd: 110 },
             { name: 'Königsgarde', type: 'summon', count: 4, duration: 40, cd: 110, unit: { name: 'Königsgardist', hp: 700, dmg: 36, range: 26, cd: 1.0, speed: 70, armor: 6, r: 13 } }],
  mira:     [{ name: 'Silbersturm', type: 'meteor', shells: 8, dmg: 170, radius: 65, color: '#e8f0ff', cd: 95 },
             { name: 'Jagdfieber', type: 'warcry', duration: 15, mods: { atkspd: 0.4, lifesteal: 0.12 }, cd: 105 }],
  ilyria:   [{ name: 'Sternenfall', type: 'meteor', shells: 10, dmg: 140, radius: 70, color: '#c8f0ff', cd: 100 },
             { name: 'Schattengestalt', type: 'avatar', duration: 16, mods: { atkspd: 1.0, dmg: 0.5, speed: 0.3 }, color: '#7a6ad0', cd: 100 }],
  thalia:   [{ name: 'Ruf des Waldes', type: 'summon', count: 1, duration: 45, cd: 120, unit: { name: 'Uralter Baumhirte', hp: 2600, dmg: 62, range: 30, cd: 1.3, speed: 55, armor: 6, r: 22 } },
             { name: 'Blühende Erde', type: 'massheal', pct: 0.7, radius: 560, cd: 110 }],
  faelar:   [{ name: 'Klingentanz', type: 'avatar', duration: 15, mods: { atkspd: 0.7, dmg: 0.4, speed: 0.35 }, color: '#a8ffd0', cd: 100 },
             { name: 'Ahnenheer', type: 'summon', count: 5, duration: 40, cd: 110, unit: { name: 'Ahnenkrieger', hp: 520, dmg: 32, range: 24, cd: 0.9, speed: 80, armor: 3, r: 11 } }],
  aerin:    [{ name: 'Dornenkrone', type: 'stun', self: true, dmg: 170, radius: 280, stun: 2.6, cd: 105 },
             { name: 'Unsterbliche Rinde', type: 'warcry', duration: 15, mods: { armor: 8, regen: 6 }, cd: 110 }],
  morvath:  [{ name: 'Ewiger Winter', type: 'stun', self: true, dmg: 190, radius: 300, stun: 3, cd: 110 },
             { name: 'Seelensturm', type: 'meteor', shells: 8, dmg: 175, radius: 80, color: '#9affd0', cd: 100 }],
  kael:     [{ name: 'Armee der Toten', type: 'summon', count: 8, duration: 40, cd: 115, unit: { name: 'Todesritter-Knecht', hp: 360, dmg: 24, range: 24, cd: 1.0, speed: 70, armor: 3, r: 11 } },
             { name: 'Todesgestalt', type: 'avatar', duration: 20, mods: { hp: 0.8, dmg: 0.5, lifesteal: 0.3 }, color: '#7aff9a', cd: 110 }],
  nyra:     [{ name: 'Große Seuche', type: 'meteor', shells: 1, dmg: 260, radius: 220, color: '#9aff7a', debuff: { armor: -5, speed: -0.4 }, debuffDur: 12, cd: 105 },
             { name: 'Leichenflut', type: 'summon', count: 10, duration: 35, cd: 115, unit: { name: 'Zombie', hp: 300, dmg: 20, range: 24, cd: 1.1, speed: 55, armor: 2, r: 11 } }],
  varuk:    [{ name: 'Knochenkoloss', type: 'summon', count: 1, duration: 45, cd: 120, unit: { name: 'Knochenkoloss', hp: 2800, dmg: 70, range: 30, cd: 1.3, speed: 55, armor: 6, r: 22 } },
             { name: 'Unstillbarer Hunger', type: 'avatar', duration: 20, mods: { dmg: 0.5, lifesteal: 0.5, speed: 0.2 }, color: '#c8f0a0', cd: 105 }],
  urgash:   [{ name: 'Waaagh!', type: 'warcry', duration: 15, mods: { dmg: 0.35, atkspd: 0.2, speed: 0.2 }, cd: 110 },
             { name: 'Berserkerwut', type: 'avatar', duration: 20, mods: { hp: 0.7, dmg: 0.6, atkspd: 0.3 }, color: '#ff5a3a', cd: 105 }],
  mogra:    [{ name: 'Gewittersturm', type: 'meteor', shells: 12, dmg: 130, radius: 70, stun: 0.5, color: '#bfe0ff', cd: 100 },
             { name: 'Sturmgeist', type: 'summon', count: 1, duration: 45, cd: 115, unit: { name: 'Sturmelementar', hp: 1800, dmg: 55, range: 170, cd: 1.2, speed: 60, armor: 3, r: 18, proj: 'kugel', splash: 60 } }],
  throk:    [{ name: 'Stampede', type: 'summon', count: 6, duration: 30, cd: 105, unit: { name: 'Kriegskeiler', hp: 520, dmg: 34, range: 24, cd: 1.0, speed: 95, armor: 3, r: 13 } },
             { name: 'Urbestie', type: 'avatar', duration: 20, mods: { hp: 1.0, dmg: 0.4, armor: 4 }, color: '#c89a5a', cd: 110 }],
  gruk:     [{ name: 'Blutmond', type: 'massheal', pct: 0.55, radius: 540, lifesteal: 0.15, duration: 12, cd: 110 },
             { name: 'Ahnenzorn', type: 'meteor', shells: 6, dmg: 210, radius: 85, color: '#ff6a5a', cd: 100 }],
  thorgrim: [{ name: 'Bergkönig', type: 'avatar', duration: 20, mods: { hp: 0.8, armor: 10, dmg: 0.3 }, color: '#d8b070', cd: 110 },
             { name: 'Erdbeben', type: 'stun', self: true, dmg: 210, radius: 300, stun: 2.5, cd: 110 }],
  hilda:    [{ name: 'Runenwall', type: 'warcry', duration: 15, mods: { armor: 8, dmg: 0.15 }, cd: 105 },
             { name: 'Runensturm', type: 'meteor', shells: 8, dmg: 170, radius: 75, color: '#7ac8ff', cd: 100 }],
  brokk:    [{ name: 'Großkanone', type: 'summon', count: 1, duration: 45, cd: 115, unit: { name: 'Belagerungskanone', hp: 1300, dmg: 70, range: 280, cd: 2.0, speed: 0, armor: 6, r: 16, proj: 'kugel', splash: 90 } },
             { name: 'Pulversalve', type: 'meteor', shells: 10, dmg: 180, radius: 85, color: '#ffb040', cd: 105 }],
  rurik:    [{ name: 'Hammer der Ahnen', type: 'meteor', shells: 1, dmg: 480, radius: 180, stun: 2, color: '#fff0a0', cd: 105 },
             { name: 'Donnersegen', type: 'massheal', pct: 0.5, radius: 520, armor: 5, duration: 12, cd: 110 }],
  azgaroth: [{ name: 'Inferno', type: 'meteor', shells: 1, meteor: true, dmg: 520, radius: 170, stun: 1.5, color: '#ff5020', cd: 110 },
             { name: 'Höllengestalt', type: 'avatar', duration: 20, mods: { hp: 0.8, dmg: 0.5, armor: 3 }, color: '#ff7a1a', cd: 110 }],
  lysara:   [{ name: 'Seelenernte', type: 'drainnova', dmg: 240, radius: 260, cd: 100 },
             { name: 'Dämonenpakt', type: 'warcry', duration: 15, mods: { dmg: 0.25, lifesteal: 0.25 }, cd: 110 }],
  malphas:  [{ name: 'Großes Höllentor', type: 'summon', count: 1, duration: 45, cd: 120, unit: { name: 'Abgrundfürst', hp: 3000, dmg: 78, range: 30, cd: 1.3, speed: 60, armor: 6, r: 22 } },
             { name: 'Wichtelflut', type: 'summon', count: 10, duration: 30, cd: 110, unit: { name: 'Feuerwichtel', hp: 220, dmg: 22, range: 110, cd: 1.1, speed: 75, armor: 1, r: 9, proj: 'feuer' } }],
  vexa:     [{ name: 'Tausend Klingen', type: 'avatar', duration: 15, mods: { atkspd: 0.8, dmg: 0.4, speed: 0.4 }, color: '#c060ff', cd: 100 },
             { name: 'Todesmal', type: 'nuke', dmg: 750, stun: 1.5, cd: 90 }],
};
// Meisterung (Heldenstufe 3 und 8): eine Fähigkeit wird stärker (+35% Wirkung, −15% Abklingzeit je Rang);
// auf Stufe 10 wird die Ultimative automatisch gemeistert.
G.HERO_MASTERY_LVLS = [3, 8];

// ---------------------------------------------------------------------------
// Belohnungen pro Volksstufe
G.BANNERS = [
  { id: 'standard', name: 'Fahne', lvl: 1 },
  { id: 'wimpel', name: 'Schwalbenwimpel', lvl: 5 },
  { id: 'standarte', name: 'Kriegsstandarte', lvl: 8 },
];
G.TITLES = [
  { lvl: 1, name: 'Rekrut' }, { lvl: 3, name: 'Hauptmann' }, { lvl: 6, name: 'Feldherr' }, { lvl: 9, name: 'Kriegsfürst' }, { lvl: 10, name: 'Legende' },
];
G.titleFor = (lvl) => G.TITLES.filter((t) => t.lvl <= lvl).pop().name;
G.REWARDS = [
  { lvl: 2, kind: 'skin', id: 'veteran', text: 'Skin „Veteran“' },
  { lvl: 3, kind: 'hero', text: 'Vierter Held' },
  { lvl: 3, kind: 'title', text: 'Titel „Hauptmann“' },
  { lvl: 4, kind: 'skin', id: 'elite', text: 'Skin „Elite“' },
  { lvl: 5, kind: 'banner', id: 'wimpel', text: 'Banner „Schwalbenwimpel“' },
  { lvl: 6, kind: 'title', text: 'Titel „Feldherr“' },
  { lvl: 7, kind: 'skin', id: 'legende', text: 'Skin „Legendär“ (leuchtende Aura)' },
  { lvl: 8, kind: 'banner', id: 'standarte', text: 'Banner „Kriegsstandarte“' },
  { lvl: 9, kind: 'title', text: 'Titel „Kriegsfürst“' },
  { lvl: 10, kind: 'title', text: 'Titel „Legende“ + goldener Rahmen' },
];

// Armee-Vorlagen: setzen die Gewichtung der automatischen Produktion mit einem Tipp
G.ARMY_PRESETS = [
  { id: 'ausgewogen', name: 'Ausgewogen', desc: 'Von allem etwas – solide in jeder Lage.', comp: { tank: 2, nahkampf: 3, fernkampf: 3, magier: 2, heiler: 1, support: 1, beschwoerer: 1 } },
  { id: 'schildwall', name: 'Schildwall', desc: 'Viele Tanks und Heiler halten jede Front.', comp: { tank: 5, nahkampf: 2, fernkampf: 2, magier: 0, heiler: 3, support: 1, beschwoerer: 0 } },
  { id: 'sturm', name: 'Sturmangriff', desc: 'Eine Flut aus Nahkämpfern mit Kriegs-Support.', comp: { tank: 1, nahkampf: 6, fernkampf: 1, magier: 0, heiler: 1, support: 2, beschwoerer: 0 } },
  { id: 'fernkampf', name: 'Fernkampf', desc: 'Schützen und Magier hinter wenigen Tanks.', comp: { tank: 2, nahkampf: 0, fernkampf: 6, magier: 2, heiler: 1, support: 1, beschwoerer: 0 } },
  { id: 'magie', name: 'Arkane Macht', desc: 'Magier, Heiler und Beschwörer.', comp: { tank: 2, nahkampf: 1, fernkampf: 0, magier: 5, heiler: 2, support: 1, beschwoerer: 3 } },
];
G.HERO_MODES = [
  { id: 'armee', name: 'Folgt Armee', desc: 'Kämpft an der Seite deiner Truppen.' },
  { id: 'basis', name: 'Verteidigt Basis', desc: 'Bleibt in der Basis und wehrt Angriffe ab.' },
  { id: 'jagen', name: 'Jagt Monster', desc: 'Säubert allein passende Monsterlager für Erfahrung und Beute.' },
  { id: 'manuell', name: 'Manuell', desc: 'Du steuerst: Held antippen, dann Ziel antippen.' },
];
