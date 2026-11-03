'use strict';
/* Arena der Verdammten – Daten: Akte, Helden, Gegner, Bosse, Upgrades, Ereignis-Modifikatoren */

/* ---------------- DATEN ---------------- */
const ACTS = [
  { name:'Die Verliese',    floorA:'#3b3e4a', floorB:'#343744', grout:'#22242c', wall:'#17181e', moss:'#4f6b3a', accent:'#9fb3d9', boss:'golem', bosses:['golem','spider'], pillar:'#5d6170', pillarTop:'#767b8b', dark:'rgba(4,6,14,0.7)', fire:'#ff8a2a', fireCore:'#ffe09a', dust:'#8a8f9a', mote:'#d8d0b8' },
  { name:'Die Krypta',      floorA:'#3c3346', floorB:'#352d3f', grout:'#211b28', wall:'#140f19', moss:'#6a3f8a', accent:'#c49cf0', boss:'lich', bosses:['lich','vampire'], pillar:'#4f4559', pillarTop:'#685b75', dark:'rgba(8,4,18,0.76)', fire:'#5affb0', fireCore:'#e0fff4', dust:'#7a6a8a', mote:'#b89aff' },
  { name:'Der Drachenhort', floorA:'#46302d', floorB:'#3d2a27', grout:'#201211', wall:'#140a09', moss:'#d2551f', accent:'#ff9a4a', boss:'dragon', bosses:['dragon','lavaworm'], pillar:'#5b3b35', pillarTop:'#77504a', dark:'rgba(16,4,2,0.62)', fire:'#ff5a1a', fireCore:'#ffe09a', dust:'#6a4a40', mote:'#ff9a3a' },
  { name:'Der Himmelsturm', floorA:'#2c3150', floorB:'#262a46', grout:'#141628', wall:'#0c0d1c', moss:'#5a6ad8', accent:'#a8c0ff', boss:'fallen', bosses:['fallen'], pillar:'#4a5276', pillarTop:'#6a74a0', dark:'rgba(4,6,22,0.68)', fire:'#7ab8ff', fireCore:'#e8f4ff', dust:'#8a92c0', mote:'#c8d8ff' },
];

const ACT_N = ACTS.length;   // 4 Akte, danach Endlosmodus
const actOf = n => ACTS[(n-1)%ACT_N];
const bossKind = () => (run.map&&run.map.bossKind)||actOf(run.act).boss;
const visAct = () => ((run.act-1)%ACT_N)+1;
const CHARS = {
  krieger:{ name:'Krieger',  icon:'🛡️', cost:0,   color:'#3f6fc4', hp:155, speed:152, dmg:25, rate:0.7, range:72,  attack:'melee', armor:2,
    desc:'Robuster Nahkämpfer mit Rüstung. Schwingt sein Schwert in weitem Bogen.',
    passive:'Kampfeslust: Jeder Schwerthieb, der trifft, heilt 1 LP. Im Wirbelwind halbierter Schaden.',
    skill:{ name:'Wirbelwind', icon:'🌀', cd:8, desc:'Wirbelt 1,5 Sek. und trifft alles ringsum.' } },
  magier: { name:'Magierin', icon:'🔮', cost:120, color:'#7d48c9', hp:100,  speed:142, dmg:15, rate:0.62, range:300, attack:'bolt',  armor:0,
    desc:'Zielsuchende Arkangeschosse, die beim Aufprall explodieren.',
    skill:{ name:'Frostnova', icon:'❄️', cd:9, desc:'Eisexplosion, die nahe Gegner einfriert.' } },
  jaegerin:{ name:'Jägerin', icon:'🏹', cost:250, color:'#3b8f55', hp:110, speed:172, dmg:13, rate:0.36, range:340, attack:'arrow', armor:0,
    desc:'Schnell und präzise. Ihre Pfeile durchbohren Gegner.',
    skill:{ name:'Pfeilhagel', icon:'🎯', cd:7, desc:'Ein Ring aus Pfeilen in alle Richtungen.' } },
  nekro:  { name:'Nekromantin', icon:'🦴', cost:400, color:'#2a7d6c', hp:100, speed:145, dmg:13, rate:0.72, range:290, attack:'skull', armor:0,
    desc:'Wirft Seelenschädel. Besiegte Gegner erheben sich manchmal als Skelettdiener.',
    skill:{ name:'Totenheer', icon:'⚰️', cd:12, desc:'Beschwört 4 Skelettkrieger für 10 Sek.' } },
  paladin:{ name:'Paladin', icon:'🔨', cost:550, color:'#d9a840', hp:135, speed:146, dmg:17, rate:0.85, range:240, attack:'hammer', armor:1,
    desc:'Wirft seinen Kriegshammer, der zu ihm zurückkehrt und auf beiden Wegen trifft.',
    passive:'Geweihter Boden: Wer stillsteht, weiht den Boden. Der Kreis heilt dich und verbrennt Gegner.',
    skill:{ name:'Bannkreis', icon:'🔆', cd:12, desc:'3 Sek. lang werden feindliche Geschosse zurückgeworfen. Heilt 10 % LP.' } },
  alchi:{ name:'Alchemistin', icon:'⚗️', cost:700, color:'#8ac23a', hp:95, speed:150, dmg:12, rate:0.8, range:270, attack:'flask', armor:0,
    desc:'Wirft Flaschen im Bogen über Hindernisse. Sie hinterlassen abwechselnd Säure- und Feuerpfützen.',
    passive:'Experimente: Jede 5. Flasche ist zufällig eine Frost-, Spreng- oder Heilflasche.',
    skill:{ name:'Großes Gebräu', icon:'🌀', cd:11, desc:'Ein Kessel erzeugt einen Strudel, der Gegner anzieht und dann explodiert.' } },
  berserk:{ name:'Berserkerin', icon:'🪓', cost:900, color:'#b8322a', hp:160, speed:158, dmg:28, rate:0.95, range:66, attack:'axe', armor:1,
    desc:'Schwere Axthiebe, die Gegner bluten lassen.',
    passive:'Raserei: Jeder Treffer gibt eine Stufe (max. 10): +6 % Angriffs- und +3 % Lauftempo je Stufe. Ohne Treffer verfliegt sie. Jeder Sieg über einen Gegner heilt 3 % LP.',
    skill:{ name:'Blutsprung', icon:'🩸', cd:6, desc:'Kostet 5 % LP. Springt auf den nächsten Gegner, betäubt alles im Umkreis und füllt die Raserei.' } },
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
  shroom:  { name:'Giftpilz',  hp:40, speed:38,  dmg:8,  r:15, cost:2,   ai:'shroom',  gold:2, minRow:1 },
  urchin:  { name:'Stachelkugel', hp:30, speed:125, dmg:9, r:12, cost:2, ai:'urchin', gold:2, minRow:2 },
  shaman:  { name:'Goblin-Schamane', hp:34, speed:60, dmg:8, r:13, cost:2.5, ai:'shaman', gold:3, minRow:3 },
  totem:   { name:'Kriegstotem', hp:45, speed:0,   dmg:0,  r:13, cost:99,  ai:'totem',   gold:1, noPool:true },
  hound:   { name:'Schattenhund', hp:26, speed:150, dmg:9, r:12, cost:1.2, ai:'pack',   gold:1, minAct:2 },
  wraith:  { name:'Gespenst',  hp:48, speed:70,  dmg:13, r:13, cost:2.5, ai:'wraith',  gold:2, minAct:2 },
  gargoyle:{ name:'Wasserspeier', hp:70, speed:70, dmg:16, r:16, cost:3, ai:'garg',   gold:3, minAct:3 },
  seraph:  { name:'Himmelswächter', hp:60, speed:80, dmg:15, r:14, cost:3, ai:'seraph', gold:3, minAct:4 },
  mimic:   { name:'Mimic',     hp:170,speed:80,  dmg:18, r:20, cost:99,  ai:'charger', gold:25, noPool:true },
};

const BOSSES = {
  golem: { name:'Der Steingolem', hp:620,  speed:42, dmg:15, r:40 },
  lich:  { name:'Der Lichkönig',  hp:1150, speed:60, dmg:18, r:28 },
  dragon:{ name:'Ignaroth, der Drache', hp:1750, speed:58, dmg:24, r:44 },
  spider:{ name:'Die Spinnenkönigin', hp:630, speed:70, dmg:14, r:34 },
  vampire:{ name:'Graf Morvath, der Vampirfürst', hp:1100, speed:80, dmg:18, r:26 },
  lavaworm:{ name:'Der Lavawurm', hp:1450, speed:150, dmg:22, r:38 },
  fallen:{ name:'Vaeloth, der Gefallene Stern', hp:2300, speed:64, dmg:26, r:40 },
};

const BOSS_AGAIN = {
  golem:'„Du … schon wieder. Stein … vergisst nicht.“',
  spider:'„Zurückgekrochen? Meine Kinder haben dich vermisst.“',
  lich:'„Ich erinnere mich an deinen letzten Atemzug. Er war köstlich.“',
  vampire:'„Wie rührend. Du bringst mir dein Blut ein zweites Mal.“',
  dragon:'„Asche kehrt also zurück. Diesmal verbrenne ich auch deinen Namen.“',
  lavaworm:'Die Erde grollt – sie erinnert sich an dich.',
  fallen:'„Deine Seele leuchtet noch in meinem Turm. Ich hole mir den Rest.“',
};
const BOSS_LINES = {
  golem:'„Stein … zermalmt … Fleisch.“',
  spider:'„Wie schön. Frisches Futter für meine Kinder.“',
  lich:'„Dein Tod ist erst der Anfang deines Dienstes.“',
  vampire:'„Welch edles Blut. Es wäre eine Schande, es zu verschwenden.“',
  dragon:'„Ein Sterblicher wagt es, meinen Hort zu betreten?“',
  lavaworm:'Der Boden bebt. Etwas Gewaltiges gräbt sich herauf …',
  fallen:'„Ihr habt mir so viele Seelen geschenkt. Nun gebt mir eure eigene.“',
};
const BEAST = {
  slime:{ic:'🟢',ds:'Hüpft auf dich zu und teilt sich beim Tod in zwei kleine Schleime.'},
  bat:{ic:'🦇',ds:'Schnell und flatterhaft. Einzeln harmlos, im Schwarm lästig.'},
  skeleton:{ic:'💀',ds:'Ein treuer Diener der Verliese. Geht stur auf dich los.'},
  archer:{ic:'🏹',ds:'Goblin-Schütze, der Abstand hält. Säulen sind deine beste Deckung.'},
  orc:{ic:'🪓',ds:'Zäher Ork, der nach kurzem Anlauf quer durch die Arena stürmt.'},
  shield:{ic:'🛡️',ds:'Blockt Angriffe von vorne. Weiche aus und triff ihn von hinten.'},
  cultist:{ic:'🕯️',ds:'Kultist, der Fächer aus Seelenkugeln wirft.'},
  healer:{ic:'✨',ds:'Heilt verletzte Verbündete in der Nähe. Schalte ihn zuerst aus.'},
  worm:{ic:'🪱',ds:'Gräbt sich ein und bricht unter dir hervor. Achte auf den Warnkreis.'},
  imp:{ic:'😈',ds:'Flinker Feuerteufel, der aus der Luft Feuerbälle spuckt.'},
  whelp:{ic:'🐲',ds:'Junger Drache. Umkreist dich und speit kurze Flammenkegel.'},
  magma:{ic:'🌋',ds:'Langsamer Koloss aus Lava. Stampft und hinterlässt glühende Pfützen.'},
  kobold:{ic:'💣',ds:'Hält Abstand und wirft Bomben dorthin, wo du gleich sein wirst.'},
  spiderling:{ic:'🕷️',ds:'Die Brut der Spinnenkönigin. Schnell, schwach und zahlreich.'},
  shroom:{ic:'🍄',ds:'Stößt Giftwolken aus und zerplatzt beim Tod in eine große Sporenwolke. Nicht stehen bleiben!'},
  urchin:{ic:'🦔',ds:'Rollt auf dich zu, rollt sich ein und verschießt Stacheln in alle Richtungen.'},
  shaman:{ic:'🪶',ds:'Hält Abstand und pflanzt Kriegstotems, die Gegner in der Nähe schneller und stärker machen.'},
  totem:{ic:'🗿',ds:'Treibt alle Gegner in seiner Nähe an. Zerstöre es schnell.'},
  hound:{ic:'🐺',ds:'Jagt im Rudel. Die Hunde kreisen dich ein und springen dich abwechselnd von hinten an.'},
  wraith:{ic:'👻',ds:'Wird unsichtbar und unverwundbar, taucht hinter dir auf und schlägt zu. Achte auf das Aufflackern.'},
  gargoyle:{ic:'🦇',ds:'Erstarrt zu Stein und hält dann fast alles aus. Stürzt sich aus der Luft herab – danach ist er verwundbar.'},
  mimic:{ic:'🧰',ds:'Eine Truhe mit Zähnen. Nicht jede Belohnung ist, was sie scheint.'},
  golem:{ic:'🗿',ds:'Wächter der Verliese. Stampft Warnkreise in den Boden und schleudert Felsen.'},
  spider:{ic:'🕸️',ds:'Herrin der Verliese. Springt, spinnt Netze und ruft ihre Brut.'},
  lich:{ic:'☠️',ds:'Untoter König der Krypta. Teleportiert sich und füllt die Arena mit Seelenspiralen.'},
  vampire:{ic:'🧛',ds:'Graf Morvath zerfällt zu Fledermausnebel und saugt seinen Gegnern das Leben aus.'},
  dragon:{ic:'🐉',ds:'Ignaroth, Herr des Horts. Feueratem, Meteorschauer und Sturzflüge.'},
  lavaworm:{ic:'🔥',ds:'Gräbt sich durch glühendes Gestein und spuckt Feuer aus dem Schlund.'},
  seraph:{ic:'🪽',ds:'Wächter des Himmelsturms. Hält Abstand und brennt einen Lichtstrahl über den Boden – geh aus der Linie!'},
  fallen:{ic:'🌠',ds:'Vaeloth, der gefallene Stern. Kreuzende Lichtstrahlen, Sternenregen und Ringe aus Sternenfeuer.'},
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
  // Regelverändernde Upgrades
  { id:'echo',  r:'epic',   ic:'🔁', nm:'Echo',             ds:'Jeder 5. Angriff wird kurz darauf kostenlos wiederholt', ap:p=>p.echo=1, max:1 },
  { id:'charges',r:'epic',  ic:'🔋', nm:'Zweite Luft',      ds:'Deine Fähigkeit hat 2 Ladungen', ap:p=>p.maxCharges=2, max:1 },
  { id:'overkill',r:'rare', ic:'➰', nm:'Überschuss',       ds:'Überschüssiger Schaden beim Besiegen springt auf den nächsten Gegner über', ap:p=>p.overkill=1, max:1 },
  { id:'momentum',r:'rare', ic:'📈', nm:'Schwung',          ds:'Jeder Sieg in Folge (Kombo) gibt +2 % Schaden, bis zu +40 %. Ein Treffer setzt zurück', ap:p=>p.momentum=1, max:1 },
  { id:'vengeance',r:'rare',ic:'💢', nm:'Vergeltung',       ds:'Wirst du getroffen, entlädt sich eine Druckwelle (150 % Schaden)', ap:p=>p.vengeance=(p.vengeance||0)+1.5, max:2 },
  { id:'focus', r:'rare',   ic:'🧘', nm:'Fokus',            ds:'Solange du stillstehst: +30 % Schaden', ap:p=>p.focus=(p.focus||0)+0.3, max:2 },
  { id:'adren', r:'rare',   ic:'💉', nm:'Adrenalin',        ds:'Unter 35 % LP lädt die Fähigkeit dreimal so schnell', ap:p=>p.adren=1, max:1 },
  { id:'mirror',r:'epic',   ic:'🪞', nm:'Spiegelbild',      ds:'Ausweichen hinterlässt ein Trugbild, das Gegner 2 Sek. lang ablenkt', ap:p=>p.mirror=1, max:1 },
  { id:'magnet',r:'common', ic:'🧲', nm:'Magnetamulett',    ds:'Münzen und Herzen fliegen dir aus großer Entfernung zu, +10 % Gold', ap:p=>{p.magnet=1; p.goldMul+=0.1;}, max:1 },
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
  { id:'c_glass', r:'cursed', ic:'💔', nm:'Gläsernes Herz', ds:'+60 % Schaden, aber −35 % max. LP', ap:p=>{p.dmg*=1.6; p.maxHp=Math.max(30,Math.round(p.maxHp*0.65)); p.hp=Math.min(p.hp,p.maxHp);}, un:p=>{p.dmg/=1.6; p.maxHp=Math.round(p.maxHp/0.65);}, max:1 },
  { id:'c_greed', r:'cursed', ic:'🪙', nm:'Fluch der Gier', ds:'Doppeltes Gold von Gegnern, aber Händler verlangen 50 % mehr', ap:p=>{p.goldMul*=2; p.shopMul=(p.shopMul||1)*1.5;}, un:p=>{p.goldMul/=2; p.shopMul/=1.5;}, max:1 },
  { id:'c_blood', r:'cursed', ic:'🍷', nm:'Blutpakt', ds:'+35 % Angriffstempo, aber Lagerfeuer heilen dich nicht mehr', ap:p=>{p.atkSpd*=1.35; p.noRest=1;}, un:p=>{p.atkSpd/=1.35; p.noRest=0;}, max:1 },
  { id:'c_frenzy',r:'cursed', ic:'😵', nm:'Raserei', ds:'+25 % Tempo und Schaden, aber im Kampf verlierst du 1 LP pro Sekunde', ap:p=>{p.spdMul*=1.25; p.dmg*=1.25; p.drain=(p.drain||0)+1;}, un:p=>{p.spdMul/=1.25; p.dmg/=1.25; p.drain=Math.max(0,(p.drain||0)-1);}, max:1 },
  { id:'c_hex',   r:'cursed', ic:'🕯️', nm:'Hexenmal', ds:'Fähigkeit lädt doppelt so schnell, aber Gegner verursachen 20 % mehr Schaden', ap:p=>{p.cdMul*=0.5; p.dmgTaken=(p.dmgTaken||1)*1.2;}, un:p=>{p.cdMul/=0.5; p.dmgTaken/=1.2;}, max:1 },
  { id:'c_bones', r:'cursed', ic:'☠️', nm:'Knochenkrone', ds:'+2 Geschosse bzw. Schwerthiebe, aber Ausweichen lädt doppelt so lang', ap:p=>{p.count+=2; p.dashCdMul*=2;}, un:p=>{p.count=Math.max(1,p.count-2); p.dashCdMul/=2;}, max:1 },
  { id:'judg',  r:'rare',   ic:'⚖️', nm:'Richtspruch',      ds:'Der zurückkehrende Hammer betäubt Gegner kurz', ap:p=>p.judg=1, max:1, only:['paladin'] },
  { id:'sanct', r:'epic',   ic:'🌞', nm:'Heiligtum',        ds:'Geweihter Boden ist größer, heilt doppelt und entsteht sofort', ap:p=>p.sanct=1, max:1, only:['paladin'] },
  { id:'hammer2',r:'rare',  ic:'🔨', nm:'Schwerer Hammer',  ds:'Hammer +30 % Schaden und fliegt weiter', ap:p=>{p.hamDmg=(p.hamDmg||1)*1.3; p.range*=1.15;}, max:2, only:['paladin'] },
  { id:'brew',  r:'rare',   ic:'🧴', nm:'Starkes Gebräu',   ds:'Pfützen +30 % größer und 1 Sek. länger', ap:p=>p.brew=(p.brew||0)+1, max:2, only:['alchi'] },
  { id:'chainr',r:'epic',   ic:'💥', nm:'Kettenreaktion',   ds:'Gegner, die in einer Pfütze sterben, explodieren', ap:p=>p.chainR=1, max:1, only:['alchi'] },
  { id:'expt',  r:'rare',   ic:'🧪', nm:'Versuchsreihe',    ds:'Jede 3. statt jede 5. Flasche ist ein Experiment', ap:p=>p.expEvery=3, max:1, only:['alchi'] },
  { id:'gore',  r:'rare',   ic:'🩸', nm:'Tiefe Wunden',     ds:'Blutung verursacht +50 % Schaden', ap:p=>p.bleed*=1.5, max:2, only:['berserk'] },
  { id:'undying',r:'epic',  ic:'💀', nm:'Unbeugsam',        ds:'Einmal pro Raum überlebst du einen tödlichen Treffer mit 1 LP', ap:p=>p.undying=1, max:1, only:['berserk'] },
  { id:'frenzy',r:'rare',   ic:'🔥', nm:'Kriegsschrei',     ds:'Raserei hält 2 Sek. länger und Blutsprung kostet keine LP mehr', ap:p=>p.frenzyLong=1, max:1, only:['berserk'] },
  { id:'volley',r:'epic',   ic:'🎐', nm:'Pfeilsalve',       ds:'Jeder 4. Angriff feuert zusätzlich einen Fächer aus 5 Pfeilen', ap:p=>p.volley=1, max:1, only:['jaegerin'] },
];
const SYN = [
  { id:'shatter',   ic:'💠', nm:'Zersplittern', req:['frost','chain'],  ds:'Kettenblitze verursachen an verlangsamten oder gefrorenen Gegnern doppelten Schaden.' },
  { id:'inferno',   ic:'🌋', nm:'Inferno',      req:['orbit','boom'],   ds:'Feuerkugeln explodieren bei jedem Kontakt.' },
  { id:'vampthorn', ic:'🥀', nm:'Vampirdornen', req:['leech','thorns'], ds:'Jeder Dornentreffer heilt dich um 5 LP.' },
  { id:'bladestorm',ic:'🌪️', nm:'Klingensturm', req:['crit','multi'],   ds:'Kritische Treffer laden deinen Angriff zu 25 % sofort wieder auf.' },
  { id:'phantom',   ic:'🎭', nm:'Phantom',      req:['shadow','acro'],  ds:'Nach dem Ausweichen trifft dein nächster Angriff garantiert kritisch.' },
  { id:'storm',     ic:'⛈️', nm:'Gewittersturm', req:['chain','area'],  ds:'Kettenblitze springen auf 2 zusätzliche Gegner über.' },
  { id:'frostfire', ic:'🧊', nm:'Frostfeuer',   req:['frost','orbit'],  ds:'Feuerkugeln frieren getroffene Gegner kurz ein.' },
  { id:'goldheart', ic:'💛', nm:'Goldenes Herz', req:['gold','hp'],     ds:'Jede aufgesammelte Münze heilt 1 LP.' },
  { id:'bulwark',   ic:'🏰', nm:'Bollwerk',     req:['armor','shield'], ds:'Die Schutzrune lädt sich nach 8 Sek. ohne Treffer wieder auf.' },
  { id:'blooddance',ic:'💃', nm:'Blutiger Tanz', req:['leech','acro'],  ds:'Perfektes Ausweichen heilt 8 LP.' },
  { id:'execute',   ic:'🪓', nm:'Henker',       req:['crit','berserk'], ds:'Kritische Treffer besiegen normale Gegner unter 25 % LP sofort.' },
  { id:'pyre',      ic:'🔥', nm:'Scheiterhaufen', req:['boom','area'],  ds:'Explosive Seelen sind größer und hinterlassen brennenden Boden.' },
  { id:'gale',      ic:'🌬️', nm:'Sturmläufer',  req:['speed','multi'],  ds:'In Bewegung greifst du 20 % schneller an.' },
  { id:'kblood',    ic:'🍷', nm:'Kriegsblut',   req:['rage','leech'],   ds:'Krieger: Unter 50 % LP heilen Schwerthiebe 3 statt 1 LP.' },
  { id:'comet',     ic:'🌠', nm:'Kometeneis',   req:['meteor','frost'], ds:'Magierin: Meteore frieren alle getroffenen Gegner ein.' },
  { id:'arrowstorm',ic:'🏹', nm:'Pfeilsturm',   req:['volley','pierce'],ds:'Jägerin: Die Pfeilsalve feuert 9 statt 5 Pfeile.' },
  { id:'bonewall',  ic:'🦴', nm:'Knochenwall',  req:['legion','bones'], ds:'Nekromantin: Diener fangen gegnerische Geschosse ab.' },
  { id:'thunder',   ic:'🌩️', nm:'Donnerhammer', req:['judg','hammer2'], ds:'Paladin: Der zurückkehrende Hammer schleudert Kettenblitze.' },
  { id:'genius',    ic:'🤪', nm:'Wahnsinniges Genie', req:['expt','cd'], ds:'Alchemistin: Jedes Experiment lädt die Fähigkeit um 1,5 Sek. auf.' },
  { id:'fountain',  ic:'⛲', nm:'Blutfontäne',  req:['gore','rate'],    ds:'Berserkerin: Blutende Gegner platzen beim Tod und lassen Gegner in der Nähe bluten.' },
];
/* Waffen-Entwicklungen: nach jedem Boss eine von zwei Verwandlungen des Grundangriffs wählen */
const EVOS = {
  krieger:[ { id:'k_cleave', ic:'⭕', nm:'Rundumschlag', ds:'Schwerthiebe treffen im vollen Kreis, dafür −15 % Schaden.' },
            { id:'k_lunge',  ic:'🗡️', nm:'Ausfallschritt', ds:'+60 % Reichweite der Hiebe, schmalerer Bogen, +10 % Schaden.' },
            { id:'k_stun',   ic:'💫', nm:'Schildstoß', ds:'Jeder 3. Hieb betäubt alle getroffenen Gegner für 0,8 Sek.' } ],
  magier: [ { id:'m_triple', ic:'🔱', nm:'Dreifachzauber', ds:'Feuert 3 Geschosse im Fächer, jedes mit 55 % Schaden.' },
            { id:'m_nova',   ic:'💥', nm:'Großer Knall', ds:'Explosionen der Geschosse sind doppelt so groß.' },
            { id:'m_frost',  ic:'❄️', nm:'Frostgeschosse', ds:'Treffer verlangsamen, jeder 4. Angriff friert ein.' } ],
  jaegerin:[{ id:'j_snipe',  ic:'🎯', nm:'Scharfschützin', ds:'Pfeile +80 % Schaden und durchbohren alles, aber −35 % Angriffstempo.' },
            { id:'j_rapid',  ic:'⚡', nm:'Schnellfeuer', ds:'+60 % Angriffstempo, −30 % Schaden.' },
            { id:'j_scatter',ic:'🌾', nm:'Streuschuss', ds:'Jeder Schuss sind 3 Pfeile im Fächer, je 60 % Schaden.' } ],
  nekro:  [ { id:'n_swarm',  ic:'💀', nm:'Schädelschwarm', ds:'Wirft 2 kleinere Schädel (je 65 % Schaden).' },
            { id:'n_drain',  ic:'🩸', nm:'Seelenraub', ds:'Jeder Schädeltreffer heilt dich um 1 LP.' },
            { id:'n_grave',  ic:'⚰️', nm:'Totengräber', ds:'+25 % Erweckung, Diener halten doppelt so lange.' } ],
  paladin:[ { id:'p_twin',   ic:'🔨', nm:'Zwillingshämmer', ds:'Wirft immer einen zusätzlichen Hammer.' },
            { id:'p_hover',  ic:'🌀', nm:'Kreisender Hammer', ds:'Der Hammer kreist 0,8 Sek. am Ziel, bevor er zurückkehrt.' },
            { id:'p_light',  ic:'✨', nm:'Lichthammer', ds:'Jeder Hammertreffer heilt dich um 1 LP.' } ],
  alchi:  [ { id:'a_cluster',ic:'🫧', nm:'Splitterflasche', ds:'Flaschen zerspringen zusätzlich in 3 kleine Pfützen.' },
            { id:'a_big',    ic:'🛢️', nm:'Großflasche', ds:'Pfützen sind doppelt so groß, −20 % Angriffstempo.' },
            { id:'a_volatile',ic:'💣', nm:'Flüchtige Mischung', ds:'Jede Flasche explodiert zusätzlich beim Aufprall.' } ],
  berserk:[ { id:'b_whirl',  ic:'🌪️', nm:'Wirbelaxt', ds:'Axthiebe treffen im vollen Kreis.' },
            { id:'b_throw',  ic:'🪓', nm:'Axtwurf', ds:'Jeder 3. Angriff wirft zusätzlich eine Axt auf den nächsten Gegner in Reichweite 260.' },
            { id:'b_rage',   ic:'😡', nm:'Ungebremst', ds:'Raserei bis zu 15 Stufen statt 10.' } ],
};
/* Begleiter: kleine Gefährten, die dem Helden folgen (mit Seelen freischaltbar, nicht in Tages-/Wochenprüfung) */
const PETS = [
  { id:'raven', ic:'🐦', nm:'Rabe Krah',       ds:'Sammelt Münzen und Herzen aus großer Entfernung ein und hackt alle 2,5 Sek. nach einem nahen Gegner.', cost:150 },
  { id:'cat',   ic:'🐈', nm:'Katze Mira',      ds:'Bringt Glück: +5 % kritische Trefferchance, besiegte Gegner lassen manchmal eine Extra-Münze fallen.', cost:200 },
  { id:'wisp',  ic:'✨', nm:'Irrlicht',        ds:'Heilt dich alle 5 Sek. um 2 LP und erhellt die Arena um dich herum.', cost:250 },
  { id:'wolf',  ic:'🐺', nm:'Wolfswelpe Fang', ds:'Springt nahe Gegner an und beißt jede Sekunde zu (40 % deines Schadens).', cost:350 },
];
/* Chronik: Lore-Einträge, die sich durch Fortschritt freischalten */
const LORE = [
  { id:'act1', ic:'🏚️', nm:'Die Verliese', hint:'Betritt Akt 1', tx:'Unter der alten Königsstadt liegen die Verliese, in denen einst Schuldner und Ketzer verrotteten. Heute sind sie die erste Bühne der Arena. Wer hier fällt, wird von den Zuschauern rasch vergessen.' },
  { id:'act2', ic:'⚰️', nm:'Die Krypta', hint:'Erreiche Akt 2', tx:'Die Krypta ist älter als die Stadt selbst. Kultisten halten hier die Toten wach, damit die Ränge niemals leer bleiben – denn auch Geister zahlen Eintritt, in Seelen.' },
  { id:'act3', ic:'🌋', nm:'Der Drachenhort', hint:'Erreiche Akt 3', tx:'Tief im glühenden Gestein ruht der Schatz eines untergegangenen Reiches. Ignaroth bewacht ihn seit Jahrhunderten und verbrennt jeden, der nach Gold greift – oder nach Ruhm.' },
  { id:'act4', ic:'✨', nm:'Der Himmelsturm', hint:'Erreiche Akt 4', tx:'Über der Arena, verborgen hinter Wolken aus Sternenstaub, erhebt sich der Himmelsturm. Hier begann alles: Ein gefallener Stern versprach den Menschen ewigen Ruhm – und erschuf dafür die Arena.' },
  { id:'b_golem', ic:'🗿', nm:'Der Steingolem', hint:'Besiege den Steingolem', tx:'Aus den Grundmauern der Verliese gemeißelt, erwachte der Golem, als hier der erste Kämpfer starb. Er kennt nur einen Befehl: Niemand verlässt die Tiefe.' },
  { id:'b_spider', ic:'🕸️', nm:'Die Spinnenkönigin', hint:'Besiege die Spinnenkönigin', tx:'Die Königin nistet in vergessenen Schächten. Man sagt, ihre Netze halten die Seelen der Gefallenen fest, bis sie sie verschlingt.' },
  { id:'b_lich', ic:'☠️', nm:'Der Lichkönig', hint:'Besiege den Lichkönig', tx:'Einst war er der Hofmagier des alten Königs. Für ein Leben ohne Ende gab er seine Seele hin – und herrscht nun über eine Krypta ohne Ausgang.' },
  { id:'b_vampire', ic:'🧛', nm:'Graf Morvath', hint:'Besiege Graf Morvath', tx:'Der Graf besitzt seit dreihundert Jahren die besten Plätze der Arena. Wer ihm eine gute Vorstellung liefert, darf gehen. Bisher hat das niemand geschafft.' },
  { id:'b_dragon', ic:'🐉', nm:'Ignaroth', hint:'Besiege Ignaroth', tx:'Ignaroth war der letzte Wächter des alten Reichs. Er hat seinen Eid nicht vergessen – nur das Reich, das er schützen sollte.' },
  { id:'b_lavaworm', ic:'🔥', nm:'Der Lavawurm', hint:'Besiege den Lavawurm', tx:'Ein Wurm, so alt wie der Berg. Er frisst Gestein und spuckt Feuer, und die Zuschauer wetten darauf, wie lange ein Held in seinem Schlund überlebt.' },
  { id:'b_fallen', ic:'🌠', nm:'Vaeloth, der Gefallene Stern', hint:'Besiege den Herrn des Himmelsturms', tx:'Vaeloth war ein Stern, der heller brennen wollte als alle anderen. Gestürzt und voller Zorn, baute er die Arena, um sich an den Seelen der Kämpfer zu nähren. Jede Niederlage macht ihn stärker.' },
  { id:'h_krieger', ic:'🛡️', nm:'Sir Aldric', hint:'Gewinne mit dem Krieger', tx:'Aldric diente der Stadtwache, bis man ihn für ein Verbrechen verurteilte, das er nicht beging. Die Arena ist seine einzige Chance auf Freiheit – und auf die Wahrheit.' },
  { id:'h_magier', ic:'🔮', nm:'Elara', hint:'Gewinne mit der Magierin', tx:'Elara studierte an der Sternenakademie, bis sie ein verbotenes Buch über die Arena fand. Sie kämpft, um herauszufinden, wer die Seelen der Gefallenen sammelt.' },
  { id:'h_jaegerin', ic:'🏹', nm:'Nyra', hint:'Gewinne mit der Jägerin', tx:'Nyra jagte in den Wäldern jenseits der Mauern, bis ihr Bruder in die Arena verschleppt wurde. Jeder Pfeil bringt sie ihm ein Stück näher.' },
  { id:'h_nekro', ic:'🦴', nm:'Morgana', hint:'Gewinne mit der Nekromantin', tx:'Morgana hört die Toten flüstern. Die Seelen der Arena sind gefangen, und nur sie kann ihnen den Weg nach Hause zeigen – mit Hilfe der Toten selbst.' },
  { id:'h_paladin', ic:'🔨', nm:'Bruder Cassian', hint:'Gewinne mit dem Paladin', tx:'Cassian gehört dem Orden der Morgenröte. Sein Schwur verlangt, das Böse an seiner Quelle zu stellen – und alle Spuren führen zur Spitze des Himmelsturms.' },
  { id:'h_alchi', ic:'⚗️', nm:'Isolde Funkelbrand', hint:'Gewinne mit der Alchemistin', tx:'Isolde wurde aus jeder Akademie geworfen. In der Arena testet sie ihre Tränke an Freiwilligen. Und an Unfreiwilligen.' },
  { id:'h_berserk', ic:'🪓', nm:'Hilda Eisenhaar', hint:'Gewinne mit der Berserkerin', tx:'Hilda stammt aus den Nordlanden, wo man Schlachten singt statt erzählt. Sie kam wegen des Ruhms – und bleibt, weil ihr bisher keiner standhielt.' },
];
/* Was die Helden vor Bosskämpfen und beim Sieg sagen */
const HERO_LINES = {
  krieger: { boss:['Für die Gefallenen dieser Arena!','Mein Schild hält. Komm nur her!','Ich habe schon Schlimmeres gesehen – im Gerichtssaal.'], win:'Heute habe ich mir das Recht verdient, die Wahrheit auszusprechen.' },
  magier:  { boss:['Interessant. Lass mich dich … analysieren.','Kapitel sieben: Wie man ein Monster schmilzt.','Meine Bücher haben dich unterschätzt. Ich nicht.'], win:'Jede Seele, die hier gefangen war, ist frei. Das steht in keinem Buch.' },
  jaegerin:{ boss:['Halt still, dann geht es schneller.','Ich habe größere Bestien erlegt. Na ja, fast.','Bruder, ich bin gleich bei dir.'], win:'Ich bringe dich nach Hause, Bruder. Endlich.' },
  nekro:   { boss:['Die Toten flüstern deinen Namen. Sie warten auf dich.','Du wirst einen guten Diener abgeben.','Noch eine Seele, die ich zur Ruhe schicke.'], win:'Geht heim, ihr Seelen. Die Arena hält euch nicht länger fest.' },
  paladin: { boss:['Im Licht gibt es keine Furcht.','Bereue, solange du noch kannst.','Mein Schwur ist stärker als dein Zorn.'], win:'Die Morgenröte bricht an. Mein Schwur ist erfüllt.' },
  alchi:   { boss:['Oh, ein neues Versuchsobjekt!','Mal sehen, wie du auf Säure reagierst.','Bitte stillhalten, das ist Wissenschaft!'], win:'Hypothese bestätigt: Ich bin großartig. Notiz an mich: mehr Explosionen.' },
  berserk: { boss:['Endlich ein würdiger Gegner!','Die Skalden werden von diesem Tag singen!','Komm schon, schlag zu – ich warte!'], win:'Heute Nacht wird im Norden gesungen. Von mir. Laut.' },
};
/* Raum-Herausforderungen: freiwillige Ziele mit Belohnung */
const ROOM_CHAL = [
  { id:'nohit',   ic:'🛡️', nm:'Unberührt',      ds:'Schließe den Raum ab, ohne Schaden zu nehmen.', rew:'gold' },
  { id:'speed',   ic:'⏱️', nm:'Blitzsieg',      ds:'Besiege alle Gegner, bevor die Zeit abläuft.',  rew:'rare' },
  { id:'combo',   ic:'🔥', nm:'Kombo-Meister',  ds:'Erreiche eine 15er-Kombo.',                     rew:'gold' },
  { id:'nodash',  ic:'🦶', nm:'Standhaft',      ds:'Schließe den Raum ohne Ausweichen ab.',          rew:'heal' },
  { id:'noskill', ic:'🤐', nm:'Ohne Hilfsmittel', ds:'Schließe den Raum ohne deine Fähigkeit ab.',   rew:'soul' },
];
const RC_REW = { gold:'+Gold', rare:'seltenere Belohnung', heal:'Heilung', soul:'+5 Seelen' };
/* Themenwellen: manche Kämpfe haben eine feste Gegnergruppe */
const THEMES = [
  { id:'slimepit', ic:'🟢', nm:'Schleimgrube',  kinds:['slime','shroom','slime'],                 acts:[1] },
  { id:'goblins',  ic:'🏹', nm:'Goblin-Lager',  kinds:['archer','shaman','archer','kobold'],      acts:[1,3] },
  { id:'undead',   ic:'💀', nm:'Untotenwelle',  kinds:['skeleton','skeleton','cultist','healer'], acts:[1,2] },
  { id:'spikes',   ic:'🦔', nm:'Stachelnest',   kinds:['urchin','spiderling','spiderling'],       acts:[1,2] },
  { id:'pack',     ic:'🐺', nm:'Rudelnacht',    kinds:['hound','shaman'],                         acts:[2,3] },
  { id:'haunt',    ic:'👻', nm:'Spukhalle',     kinds:['wraith','bat','cultist'],                 acts:[2] },
  { id:'fire',     ic:'🔥', nm:'Feuersturm',    kinds:['imp','magma','whelp'],                    acts:[3,4] },
  { id:'heaven',   ic:'🪽', nm:'Himmlische Wacht', kinds:['seraph','wraith','gargoyle'],         acts:[4] },
  { id:'stone',    ic:'🗿', nm:'Steinwache',    kinds:['gargoyle','shield','orc'],                acts:[3,4] },
];
/* Champions: benannte Mini-Bosse in Elite-Räumen, sie lassen ein Relikt fallen */
const CHAMP_NAMES = { slime:'Glibber, der Ewighungrige', bat:'Nachtschwinge', skeleton:'Knochenbrecher Garm', archer:'Scharfauge Rikk', orc:'Brakk der Schlächter',
  cultist:'Hohepriesterin Vessa', imp:'Funkenfürst Zix', whelp:'Glutschwinge', magma:'Der Glühende Koloss', kobold:'Zündler Krax', shield:'Hauptmann Eisenwall',
  healer:'Bruder Lazarus', worm:'Die Wühlmutter', shroom:'Sporenkönig Mufft', urchin:'Stachelfürst Igor', shaman:'Ahnenrufer Grok', hound:'Grimmzahn, der Rudelführer',
  wraith:'Die Graue Witwe', gargoyle:'Der Wächter vom Turm', spiderling:'Brutmutter Kessa', totem:'Das Uralte Totem', mimic:'Der Gierige Schlund', seraph:'Erzwächter Orin' };
/* Relikte: einzigartige Gegenstände, die Regeln ändern (Schatzräume, Champions, Händler) */
const RELICS = [
  { id:'r_hourglass', ic:'⏳', nm:'Sanduhr der Zeit',   ds:'In den ersten 3 Sek. jedes Kampfes bewegen sich Gegner in Zeitlupe.' },
  { id:'r_crown',     ic:'👑', nm:'Krone der Gier',     ds:'Elitegegner lassen dreimal so viel Gold fallen. Händler sind 15 % günstiger.' },
  { id:'r_skull',     ic:'💀', nm:'Sammlerschädel',     ds:'Jeder besiegte Elitegegner gibt dir dauerhaft +3 max. LP.' },
  { id:'r_lantern',   ic:'🏮', nm:'Seelenlaterne',      ds:'Am Ende dieses Laufs erhältst du 50 % mehr Seelen.' },
  { id:'r_feather',   ic:'🪶', nm:'Federstiefel',       ds:'Du kannst zweimal hintereinander ausweichen.' },
  { id:'r_mirror',    ic:'🪞', nm:'Splitterspiegel',    ds:'25 % Chance, dass dich treffende Geschosse zurückgeworfen werden, statt dich zu verletzen.' },
  { id:'r_stone',     ic:'🪨', nm:'Steinherz',          ds:'+50 max. LP, aber du bist 10 % langsamer.', on:p=>{ p.maxHp+=50; p.hp+=50; p.spdMul*=0.9; } },
  { id:'r_horn',      ic:'📯', nm:'Kriegshorn',         ds:'Zu Beginn jedes Kampfes 6 Sek. lang +30 % Schaden und Angriffstempo.' },
  { id:'r_coin',      ic:'🪙', nm:'Glücksmünze',        ds:'Jede Upgrade-Auswahl bietet 4 statt 3 Karten.' },
  { id:'r_bell',      ic:'🔔', nm:'Totenglocke',        ds:'Gegner erscheinen mit 15 % weniger Leben.' },
  { id:'r_chalice',   ic:'⚱️', nm:'Blutkelch',          ds:'Nach jedem Boss heilst du 30 % LP, Lagerfeuer heilen 15 % mehr.' },
  { id:'r_idol',      ic:'🗿', nm:'Verfluchtes Götzenbild', ds:'Jede Upgrade-Auswahl kann einmal kostenlos neu gewürfelt werden – aber Gegner verursachen 15 % mehr Schaden.', cursed:true },
];
const REL = Object.fromEntries(RELICS.map(r=>[r.id,r]));
const hasRelic = id => !!(run && run.relics && run.relics.includes(id));
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
// Zusätzliche Regeln für Herausforderungen und die Wochenprüfung
const EXTRA_MODS = [
  { id:'nodash',  ic:'🚫', nm:'Standhaft',       ds:'Ausweichen ist nicht möglich', noDash:true },
  { id:'noskill', ic:'🤐', nm:'Ohne Fähigkeit',  ds:'Keine Fähigkeit, dafür +25 % Schaden', noSkill:true, start:p=>{ p.dmg*=1.25; } },
  { id:'fragile', ic:'🥚', nm:'Zerbrechlich',    ds:'Nur 60 max. LP, dafür +50 % Schaden und 2 Schutzrunen', start:p=>{ p.maxHp=60; p.hp=60; p.dmg*=1.5; p.shield+=2; } },
  { id:'cursed',  ic:'🕯️', nm:'Verfluchter Weg', ds:'Du beginnst mit „Hexenmal“ und „Fluch der Gier“', curses:['c_hex','c_greed'] },
  { id:'noshop',  ic:'🚷', nm:'Kein Händler',    ds:'Alle Händler sind verschwunden – dort warten Ereignisse', mapSwap:{shop:'event'} },
  { id:'norest',  ic:'🌑', nm:'Keine Rast',      ds:'Keine Lagerfeuer, dafür Schätze und +50 % Gold', mapSwap:{rest:'treasure'}, start:p=>{ p.goldMul+=0.5; } },
];
const MOD_LIST = DAILY_MODS.concat(EXTRA_MODS);
// Aktive Regeln des Laufs (mehrere werden zusammengeführt)
function runMod(){
  if(!run) return null; const ids=run.mods||(run.mod?[run.mod]:[]); if(!ids.length) return null;
  const ms=ids.map(id=>MOD_LIST.find(m=>m.id===id)).filter(Boolean); if(!ms.length) return null; if(ms.length===1) return ms[0];
  const o={ id:ids.join('+'), ic:ms.map(m=>m.ic).join(''), nm:ms.map(m=>m.nm).join(' + '), ds:ms.map(m=>m.ds).join(' · ') };
  for(const m of ms) for(const k in m){ if(k==='id'||k==='ic'||k==='nm'||k==='ds') continue; const v=m[k];
    if(k==='start'){ const prev=o.start; o.start=prev?(p=>{ prev(p); v(p); }):v; }
    else if(k==='gold') o.gold=(o.gold||0)+v;
    else if(typeof v==='number') o[k]=(o[k]||1)*v;
    else if(Array.isArray(v)) o[k]=(o[k]||[]).concat(v);
    else if(v && typeof v==='object') o[k]=Object.assign({},o[k]||{},v);
    else o[k]=o[k]||v; }
  return o;
}
/* Verdammnis-Stufen: je Held freischaltbar, jede Stufe fügt eine Regel hinzu (wie Aufstiegsstufen) */
const TIERS = [
  { ic:'⚔️', nm:'Normal',          ds:'Die Arena, wie sie ist.' },
  { ic:'💀', nm:'Härtere Gegner',  ds:'Gegner haben 20 % mehr Leben.' },
  { ic:'👑', nm:'Elite-Plage',     ds:'In jedem Kampf kann ein zusätzlicher Elitegegner lauern.' },
  { ic:'🐲', nm:'Zorn der Bosse',  ds:'Bosse haben 25 % mehr Leben und werden schon bei 60 % wütend.' },
  { ic:'🔥', nm:'Karge Feuer',     ds:'Lagerfeuer heilen nur noch 25 % statt 40 %.' },
  { ic:'💨', nm:'Flinke Gegner',   ds:'Gegner sind 10 % schneller.' },
  { ic:'🗡️', nm:'Scharfe Klingen', ds:'Gegner verursachen 20 % mehr Schaden.' },
  { ic:'💰', nm:'Gierige Händler', ds:'Händler verlangen 30 % mehr.' },
  { ic:'🧬', nm:'Zähe Elite',      ds:'Elitegegner haben eine zusätzliche Eigenschaft.' },
  { ic:'💔', nm:'Gnadenlos',       ds:'Heilherzen, Heilquellen und Heiltränke wirken nur halb.' },
  { ic:'☠️', nm:'Die Verdammten',  ds:'Besiegte Gegner hinterlassen manchmal eine Seelenexplosion.' },
];
const TIER_MAX = TIERS.length-1;
const tierNow = () => (run && run.tier) || 0;
const tierHas = n => tierNow()>=n;
const tierColor = t => t>=10?'#ff5a2a':t>=7?'#ffd04a':t>=4?'#d8e4f4':t>=1?'#d08a4a':'#8d7f86';
/* Herausforderungen: feste Regeln, Freischaltung nacheinander */
const CHALLENGES = [
  { id:'ch_glass',  ic:'🔪', nm:'Glaskanone',           mods:['glass'],              souls:60 },
  { id:'ch_horde',  ic:'🐀', nm:'Die Horde',            mods:['horde'],              souls:60 },
  { id:'ch_elite',  ic:'👑', nm:'Elitekrieg',           mods:['elite'],              souls:80 },
  { id:'ch_nodash', ic:'🚫', nm:'Standhaft',            mods:['nodash'],             souls:100 },
  { id:'ch_noskill',ic:'🤐', nm:'Nur der Grundangriff', mods:['noskill'],            souls:100 },
  { id:'ch_blood',  ic:'🩸', nm:'Blutiger Reichtum',    mods:['rich','blood'],       souls:100 },
  { id:'ch_fragile',ic:'🥚', nm:'Zerbrechlich',         mods:['fragile'],            souls:120 },
  { id:'ch_cursed', ic:'🕯️', nm:'Verfluchter Weg',      mods:['cursed','noshop'],    souls:140 },
  { id:'ch_haste',  ic:'⚡', nm:'Hast der Horde',       mods:['haste','horde'],      souls:140 },
  { id:'ch_norest', ic:'🌑', nm:'Ohne Rast',            mods:['norest','elite'],     souls:160 },
  { id:'ch_final',  ic:'☠️', nm:'Prüfung der Verdammten', mods:['glass','haste','elite'], souls:250 },
];
function todayKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dailyInfo(key){ const ids=Object.keys(CHARS); return { cid:ids[hashStr(key+'|hero')%ids.length], mod:DAILY_MODS[hashStr(key+'|mod')%DAILY_MODS.length] }; }
// Wochenprüfung: ISO-Woche, zwei Regeln, eigener Held
function weekKey(d=new Date()){ const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day); const y=t.getUTCFullYear(); const wk=Math.ceil(((t-Date.UTC(y,0,1))/86400000+1)/7); return 'W'+y+'-'+String(wk).padStart(2,'0'); }
function weeklyInfo(key){ const ids=Object.keys(CHARS), pool=MOD_LIST.filter(m=>!['noshop','norest'].includes(m.id)), a=hashStr(key+'|m1')%pool.length; let b=hashStr(key+'|m2')%pool.length; if(b===a) b=(b+1)%pool.length;
  return { cid:ids[hashStr(key+'|hero')%ids.length], mods:[pool[a].id,pool[b].id] }; }

