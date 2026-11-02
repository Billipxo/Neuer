'use strict';
/* Arena der Verdammten – Daten: Akte, Helden, Gegner, Bosse, Upgrades, Ereignis-Modifikatoren */

/* ---------------- DATEN ---------------- */
const ACTS = [
  { name:'Die Verliese',    floorA:'#3b3e4a', floorB:'#343744', grout:'#22242c', wall:'#17181e', moss:'#4f6b3a', accent:'#9fb3d9', boss:'golem', bosses:['golem','spider'], pillar:'#5d6170', pillarTop:'#767b8b', dark:'rgba(4,6,14,0.7)', fire:'#ff8a2a', fireCore:'#ffe09a', dust:'#8a8f9a', mote:'#d8d0b8' },
  { name:'Die Krypta',      floorA:'#3c3346', floorB:'#352d3f', grout:'#211b28', wall:'#140f19', moss:'#6a3f8a', accent:'#c49cf0', boss:'lich', bosses:['lich','vampire'], pillar:'#4f4559', pillarTop:'#685b75', dark:'rgba(8,4,18,0.76)', fire:'#5affb0', fireCore:'#e0fff4', dust:'#7a6a8a', mote:'#b89aff' },
  { name:'Der Drachenhort', floorA:'#46302d', floorB:'#3d2a27', grout:'#201211', wall:'#140a09', moss:'#d2551f', accent:'#ff9a4a', boss:'dragon', bosses:['dragon','lavaworm'], pillar:'#5b3b35', pillarTop:'#77504a', dark:'rgba(16,4,2,0.62)', fire:'#ff5a1a', fireCore:'#ffe09a', dust:'#6a4a40', mote:'#ff9a3a' },
];

const actOf = n => ACTS[(n-1)%3];
const bossKind = () => (run.map&&run.map.bossKind)||actOf(run.act).boss;
const visAct = () => ((run.act-1)%3)+1;
const CHARS = {
  krieger:{ name:'Krieger',  icon:'🛡️', cost:0,   color:'#3f6fc4', hp:150, speed:152, dmg:24, rate:0.7, range:72,  attack:'melee', armor:2,
    desc:'Robuster Nahkämpfer mit Rüstung. Schwingt sein Schwert in weitem Bogen.',
    passive:'Kampfeslust: Jeder Schwerthieb, der trifft, heilt 1 LP. Im Wirbelwind halbierter Schaden.',
    skill:{ name:'Wirbelwind', icon:'🌀', cd:8, desc:'Wirbelt 1,5 Sek. und trifft alles ringsum.' } },
  magier: { name:'Magierin', icon:'🔮', cost:120, color:'#7d48c9', hp:85,  speed:142, dmg:14, rate:0.62, range:300, attack:'bolt',  armor:0,
    desc:'Zielsuchende Arkangeschosse, die beim Aufprall explodieren.',
    skill:{ name:'Frostnova', icon:'❄️', cd:9, desc:'Eisexplosion, die nahe Gegner einfriert.' } },
  jaegerin:{ name:'Jägerin', icon:'🏹', cost:250, color:'#3b8f55', hp:100, speed:172, dmg:12, rate:0.38, range:340, attack:'arrow', armor:0,
    desc:'Schnell und präzise. Ihre Pfeile durchbohren Gegner.',
    skill:{ name:'Pfeilhagel', icon:'🎯', cd:7, desc:'Ein Ring aus Pfeilen in alle Richtungen.' } },
  nekro:  { name:'Nekromantin', icon:'🦴', cost:400, color:'#2a7d6c', hp:90, speed:145, dmg:13, rate:0.72, range:290, attack:'skull', armor:0,
    desc:'Wirft Seelenschädel. Besiegte Gegner erheben sich manchmal als Skelettdiener.',
    skill:{ name:'Totenheer', icon:'⚰️', cd:12, desc:'Beschwört 4 Skelettkrieger für 10 Sek.' } },
};

const ENEMIES = {
  slime:   { name:'Schleim',   hp:22, speed:58,  dmg:8,  r:14, cost:1,   ai:'hop',     gold:1 },
  bat:     { name:'Fledermaus',hp:12, speed:128, dmg:6,  r:10, cost:1,   ai:'bat',     gold:1 },
  skeleton:{ name:'Skelett',   hp:32, speed:74,  dmg:10, r:13, cost:1.5, ai:'chase',   gold:1 },
  archer:  { name:'Goblin',    hp:24, speed:62,  dmg:9,  r:13, cost:2,   ai:'ranged',  gold:2, fire:2.3 },
  orc:     { name:'Ork',       hp:95, speed:48,  dmg:16, r:20, cost:3.5, ai:'charger', gold:3, minRow:2 },
  cultist: { name:'Kultist',   hp:42, speed:55,  dmg:9,  r:14, cost:2.5, ai:'caster',  gold:2, fire:2.6, minAct:2 },
  imp:     { name:'Feuerteufel',hp:34,speed:100, dmg:10, r:12, cost:2.2, ai:'imp',     gold:2, fire:1.8, minAct:3 },
  whelp:   { name:'Drachenwelpe', hp:48, speed:95, dmg:11, r:15, cost:2.5, ai:'whelp', gold:2, minAct:3 },
  magma:   { name:'Magmagolem',  hp:150, speed:38, dmg:18, r:22, cost:4,   ai:'magma', gold:4, minAct:3 },
  kobold:  { name:'Kobold-Bombenleger', hp:28, speed:88, dmg:14, r:11, cost:2.2, ai:'bomber', gold:2, minAct:3 },
  shield:  { name:'Schildträger',hp:70,speed:52,  dmg:13, r:17, cost:3,   ai:'shield',  gold:3, minRow:3 },
  healer:  { name:'Heiler',    hp:38, speed:58,  dmg:7,  r:13, cost:2.5, ai:'healer',  gold:2, minAct:2 },
  worm:    { name:'Grabwurm',  hp:55, speed:140, dmg:14, r:16, cost:3,   ai:'burrow',  gold:3, minAct:2 },
  spiderling:{ name:'Spinnling', hp:12, speed:140, dmg:5, r:8, cost:0.5, ai:'chase', gold:0, noPool:true },
  mimic:   { name:'Mimic',     hp:170,speed:80,  dmg:18, r:20, cost:99,  ai:'charger', gold:25, noPool:true },
};

const BOSSES = {
  golem: { name:'Der Steingolem', hp:620,  speed:42, dmg:15, r:40 },
  lich:  { name:'Der Lichkönig',  hp:1150, speed:60, dmg:18, r:28 },
  dragon:{ name:'Ignaroth, der Drache', hp:1750, speed:58, dmg:24, r:44 },
  spider:{ name:'Die Spinnenkönigin', hp:630, speed:70, dmg:14, r:34 },
  vampire:{ name:'Graf Morvath, der Vampirfürst', hp:1100, speed:80, dmg:18, r:26 },
  lavaworm:{ name:'Der Lavawurm', hp:1450, speed:150, dmg:22, r:38 },
};

const AFFIXES = {
  fast:  { ic:'💨', nm:'Flink',      ds:'bewegt sich deutlich schneller' },
  armor: { ic:'🛡️', nm:'Gepanzert',  ds:'erleidet 40 % weniger Schaden' },
  boom:  { ic:'💥', nm:'Explosiv',   ds:'explodiert kurz nach dem Tod' },
  split: { ic:'🧬', nm:'Teilend',    ds:'zerfällt beim Tod in zwei kleinere Gegner' },
  vamp:  { ic:'🩸', nm:'Vampirisch', ds:'heilt sich, wenn er dich trifft' },
  frost: { ic:'❄️', nm:'Frostig',    ds:'seine Treffer verlangsamen dich' },
  summon:{ ic:'🦇', nm:'Beschwörer', ds:'ruft regelmäßig Fledermäuse' },
};
const RAR = { common:'Gewöhnlich', rare:'Selten', epic:'Episch', cursed:'Verflucht' };
const UPGRADES = [
  { id:'dmg',   r:'common', ic:'⚔️', nm:'Geschärfte Waffe', ds:'+15 % Schaden',               ap:p=>p.dmg*=1.15 },
  { id:'rate',  r:'common', ic:'🗡️', nm:'Flinke Hände',     ds:'+12 % Angriffstempo',         ap:p=>p.atkSpd*=1.12 },
  { id:'speed', r:'common', ic:'👢', nm:'Windstiefel',      ds:'+10 % Laufgeschwindigkeit',   ap:p=>p.spdMul*=1.10, max:5 },
  { id:'hp',    r:'common', ic:'❤️', nm:'Trollblut',        ds:'+20 max. LP und heilt 20 LP', ap:p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+20);} },
  { id:'armor', r:'common', ic:'🛡️', nm:'Eisenhaut',        ds:'Erlittener Schaden −2',       ap:p=>p.armor+=2, max:5 },
  { id:'regen', r:'common', ic:'🌿', nm:'Heilkräuter',      ds:'Regeneriert 0,6 LP pro Sekunde', ap:p=>p.regen+=0.6 },
  { id:'gold',  r:'common', ic:'💰', nm:'Goldgier',         ds:'+30 % Gold von Gegnern',      ap:p=>p.goldMul+=0.3, max:4 },
  { id:'area',  r:'common', ic:'🎯', nm:'Weite Reichweite', ds:'+15 % Reichweite und Wirkfläche', ap:p=>p.area*=1.15, max:5 },
  { id:'crit',  r:'rare',   ic:'👁️', nm:'Adlerauge',        ds:'+10 % kritische Trefferchance', ap:p=>p.crit+=0.10, max:5 },
  { id:'multi', r:'rare',   ic:'✨', nm:'Mehrfachangriff',  ds:'+1 Geschoss bzw. Schwerthieb', ap:p=>p.count+=1, max:3 },
  { id:'leech', r:'rare',   ic:'🩸', nm:'Blutdurst',        ds:'Heilt 2 LP pro besiegtem Gegner', ap:p=>p.lifeOnKill+=2 },
  { id:'thorns',r:'rare',   ic:'🌵', nm:'Dornenrüstung',    ds:'Wer dich trifft, erleidet 20 Schaden', ap:p=>p.thorns+=20 },
  { id:'cd',    r:'rare',   ic:'🔮', nm:'Arkanes Wissen',   ds:'−20 % Abklingzeit der Fähigkeit', ap:p=>p.cdMul*=0.8, max:3 },
  { id:'pierce',r:'rare',   ic:'➹',  nm:'Durchschlag',      ds:'Pfeile durchbohren +1 Gegner', ap:p=>p.pierce+=1, max:3, only:['jaegerin'] },
  { id:'shield',r:'rare',   ic:'🔰', nm:'Schutzrune',       ds:'Blockt den ersten Treffer in jedem Raum', ap:p=>p.shield+=1, max:3 },
  { id:'orbit', r:'epic',   ic:'🔥', nm:'Feuerkugeln',      ds:'+1 Feuerkugel kreist um dich', ap:p=>p.orbit+=1, max:4 },
  { id:'chain', r:'epic',   ic:'⚡', nm:'Kettenblitz',      ds:'Treffer lösen manchmal Blitze aus, die überspringen', ap:p=>p.chain+=1, max:3 },
  { id:'boom',  r:'epic',   ic:'💥', nm:'Explosive Seelen', ds:'Besiegte Gegner explodieren', ap:p=>p.explode+=1, max:3 },
  { id:'frost', r:'epic',   ic:'❄️', nm:'Frostaura',        ds:'Gegner in deiner Nähe werden verlangsamt', ap:p=>p.frost+=1, max:2 },
  { id:'phoenix',r:'epic',  ic:'🪶', nm:'Phönixfeder',      ds:'Einmal wiederbeleben mit 50 % LP', ap:p=>p.revive+=1, max:1 },
  { id:'berserk',r:'epic',  ic:'😤', nm:'Berserkerwut',     ds:'+40 % Schaden, aber −15 max. LP', ap:p=>{p.dmg*=1.4;p.maxHp=Math.max(30,p.maxHp-15);p.hp=Math.min(p.hp,p.maxHp);}, max:2 },
  { id:'acro',  r:'common', ic:'🤸', nm:'Akrobat',          ds:'−25 % Abklingzeit beim Ausweichen', ap:p=>p.dashCdMul*=0.75, max:2 },
  { id:'shadow',r:'rare',   ic:'🌑', nm:'Schattenschritt',  ds:'Ausweichen hinterlässt eine brennende Schattenspur', ap:p=>p.shadow+=1, max:2 },
  // Krieger
  { id:'wave',  r:'rare',   ic:'🌊', nm:'Klingenwelle',     ds:'Schwerthiebe senden eine durchbohrende Klingenwelle aus', ap:p=>p.wave+=1, max:2, only:['krieger'] },
  { id:'bash',  r:'rare',   ic:'🐗', nm:'Sturmangriff',     ds:'Ausweichen rammt Gegner: 150 % Schaden und starker Rückstoß', ap:p=>p.dashDmg+=1.5, max:2, only:['krieger'] },
  { id:'rage',  r:'epic',   ic:'💢', nm:'Blutrausch',       ds:'Unter 50 % LP: +40 % Angriffstempo und +25 % Schaden', ap:p=>p.rage=1, max:1, only:['krieger'] },
  // Magierin
  { id:'split', r:'rare',   ic:'💫', nm:'Splitterzauber',   ds:'Geschosse zersplittern beim Aufprall in Funken', ap:p=>p.split+=1, max:2, only:['magier'] },
  { id:'mshield',r:'rare',  ic:'🔷', nm:'Manaschild',       ds:'Ein Schild, der sich alle 10 Sek. erneuert und einen Treffer blockt', ap:p=>p.manaShield=1, max:1, only:['magier'] },
  { id:'meteor',r:'epic',   ic:'☄️', nm:'Meteorzauber',     ds:'Jeder 6. Angriff ruft einen Meteor herab (300 % Flächenschaden)', ap:p=>p.meteor=1, max:1, only:['magier'] },
  // Jägerin
  { id:'bounce',r:'rare',   ic:'↩️', nm:'Querschläger',     ds:'Pfeile prallen einmal mehr von Wänden ab', ap:p=>p.bounce+=1, max:2, only:['jaegerin'] },
  { id:'poison',r:'rare',   ic:'🧪', nm:'Giftpfeile',       ds:'Treffer vergiften: weitere 40 % Schaden über 3 Sek.', ap:p=>p.poison+=0.4, max:3, only:['jaegerin'] },
  { id:'legion',r:'rare',   ic:'💀', nm:'Legion',           ds:'+2 max. Diener und +15 % Dienerschaden', ap:p=>{p.minions+=2;p.minionDmg*=1.15;}, max:3, only:['nekro'] },
  { id:'reap',  r:'rare',   ic:'🌾', nm:'Seelenernte',      ds:'+20 % Chance, Gegner als Diener zu erwecken', ap:p=>p.raise+=0.2, max:2, only:['nekro'] },
  { id:'bones', r:'epic',   ic:'🦴', nm:'Knochenpanzer',    ds:'Jeder aktive Diener verringert erlittenen Schaden um 1', ap:p=>p.boneArmor=1, max:1, only:['nekro'] },
  // Verfluchte Relikte: stark, aber mit Nachteil
  { id:'c_glass', r:'cursed', ic:'💔', nm:'Gläsernes Herz', ds:'+60 % Schaden, aber −35 % max. LP', ap:p=>{p.dmg*=1.6; p.maxHp=Math.max(30,Math.round(p.maxHp*0.65)); p.hp=Math.min(p.hp,p.maxHp);}, max:1 },
  { id:'c_greed', r:'cursed', ic:'🪙', nm:'Fluch der Gier', ds:'Doppeltes Gold von Gegnern, aber Händler verlangen 50 % mehr', ap:p=>{p.goldMul*=2; p.shopMul=(p.shopMul||1)*1.5;}, max:1 },
  { id:'c_blood', r:'cursed', ic:'🍷', nm:'Blutpakt', ds:'+35 % Angriffstempo, aber Lagerfeuer heilen dich nicht mehr', ap:p=>{p.atkSpd*=1.35; p.noRest=1;}, max:1 },
  { id:'c_frenzy',r:'cursed', ic:'😵', nm:'Raserei', ds:'+25 % Tempo und Schaden, aber im Kampf verlierst du 1 LP pro Sekunde', ap:p=>{p.spdMul*=1.25; p.dmg*=1.25; p.drain=(p.drain||0)+1;}, max:1 },
  { id:'c_hex',   r:'cursed', ic:'🕯️', nm:'Hexenmal', ds:'Fähigkeit lädt doppelt so schnell, aber Gegner verursachen 20 % mehr Schaden', ap:p=>{p.cdMul*=0.5; p.dmgTaken=(p.dmgTaken||1)*1.2;}, max:1 },
  { id:'c_bones', r:'cursed', ic:'☠️', nm:'Knochenkrone', ds:'+2 Geschosse bzw. Schwerthiebe, aber Ausweichen lädt doppelt so lang', ap:p=>{p.count+=2; p.dashCdMul*=2;}, max:1 },
  { id:'volley',r:'epic',   ic:'🎐', nm:'Pfeilsalve',       ds:'Jeder 4. Angriff feuert zusätzlich einen Fächer aus 5 Pfeilen', ap:p=>p.volley=1, max:1, only:['jaegerin'] },
];
const SYN = [
  { id:'shatter',   ic:'💠', nm:'Zersplittern', req:['frost','chain'],  ds:'Kettenblitze verursachen an verlangsamten oder gefrorenen Gegnern doppelten Schaden.' },
  { id:'inferno',   ic:'🌋', nm:'Inferno',      req:['orbit','boom'],   ds:'Feuerkugeln explodieren bei jedem Kontakt.' },
  { id:'vampthorn', ic:'🥀', nm:'Vampirdornen', req:['leech','thorns'], ds:'Jeder Dornentreffer heilt dich um 5 LP.' },
  { id:'bladestorm',ic:'🌪️', nm:'Klingensturm', req:['crit','multi'],   ds:'Kritische Treffer laden deinen Angriff zu 25 % sofort wieder auf.' },
  { id:'phantom',   ic:'🎭', nm:'Phantom',      req:['shadow','acro'],  ds:'Nach dem Ausweichen trifft dein nächster Angriff garantiert kritisch.' },
];
const hasSyn = id => !!(run && run.syn && run.syn.includes(id));
const UPG = Object.fromEntries(UPGRADES.map(u=>[u.id,u]));

const META = [
  { id:'m_hp',     ic:'❤️', nm:'Zähigkeit',  ds:'+8 max. LP zu Beginn',          max:5, cost:l=>25+l*20 },
  { id:'m_dmg',    ic:'⚔️', nm:'Kraft',      ds:'+6 % Grundschaden',             max:5, cost:l=>30+l*25 },
  { id:'m_gold',   ic:'💰', nm:'Erbe',       ds:'+25 Startgold',                 max:4, cost:l=>20+l*20 },
  { id:'m_heal',   ic:'🌙', nm:'Erholung',   ds:'Heilt 4 % LP nach jedem Kampf', max:3, cost:l=>40+l*35 },
  { id:'m_luck',   ic:'🍀', nm:'Glück',      ds:'Seltenere Upgrades erscheinen öfter', max:3, cost:l=>45+l*40 },
  { id:'m_reroll', ic:'🎲', nm:'Schicksal',  ds:'+1 Neuwurf der Upgrade-Auswahl pro Lauf', max:3, cost:l=>35+l*35 },
];

const NODE = {
  fight:   { ic:'⚔️', nm:'Kampf' },
  elite:   { ic:'💀', nm:'Elite' },
  shop:    { ic:'⚖️', nm:'Händler' },
  rest:    { ic:'🔥', nm:'Lagerfeuer' },
  treasure:{ ic:'🎁', nm:'Schatz' },
  event:   { ic:'❓', nm:'Ereignis' },
  boss:    { ic:'👑', nm:'Boss' },
};

const DAILY_MODS = [
  { id:'glass', ic:'🔪', nm:'Glaskanone', ds:'+60 % Schaden, aber −40 % max. LP', start:p=>{ p.dmg*=1.6; p.maxHp=Math.round(p.maxHp*0.6); p.hp=p.maxHp; } },
  { id:'horde', ic:'🐀', nm:'Die Horde',  ds:'50 % mehr Gegner, aber auch 50 % mehr Gold', start:p=>{ p.goldMul+=0.5; }, waveMul:1.5 },
  { id:'haste', ic:'⚡', nm:'Hast',       ds:'Du und alle Gegner seid 30 % schneller', start:p=>{ p.spdMul*=1.3; p.atkSpd*=1.15; }, enemySpeed:1.3 },
  { id:'elite', ic:'👑', nm:'Elitekrieg', ds:'In jedem Kampf lauert ein Elitegegner, dafür bessere Belohnungen', eliteEvery:true },
  { id:'blood', ic:'🩸', nm:'Blutmond',   ds:'Jeder Kill heilt 3 LP, aber Lagerfeuer heilen nicht', start:p=>{ p.lifeOnKill+=3; }, noRestHeal:true },
  { id:'rich',  ic:'💎', nm:'Goldrausch', ds:'Start mit 150 Gold, aber Gegner lassen kein Gold fallen', gold:150, noGold:true },
];
const runMod = () => run && run.mod ? DAILY_MODS.find(m=>m.id===run.mod) : null;
function todayKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dailyInfo(key){ const ids=Object.keys(CHARS); return { cid:ids[hashStr(key+'|hero')%ids.length], mod:DAILY_MODS[hashStr(key+'|mod')%DAILY_MODS.length] }; }

