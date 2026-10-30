'use strict';
// Spielerprofil (im Browser gespeichert): Volks-XP, Skins, Kampagnenfortschritt, Einstellungen.
(function () {
  const KEY = 'reichsfeuer.profil.v1';
  const P = (G.Profile = {});

  function fresh() {
    const xp = {}, skin = {};
    const banner = {};
    for (const r of G.RACE_KEYS) { xp[r] = 0; skin[r] = 'standard'; banner[r] = 'standard'; }
    return { xp, skin, banner, campaign: { done: {} }, settings: { music: 0.5, sfx: 0.7, blood: true, muted: false }, tutorialDone: false, games: 0, wins: 0 };
  }
  P.data = fresh();
  P.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw), f = fresh();
        P.data = { ...f, ...d, xp: { ...f.xp, ...d.xp }, skin: { ...f.skin, ...d.skin }, banner: { ...f.banner, ...(d.banner || {}) }, settings: { ...f.settings, ...d.settings }, campaign: { done: {}, ...(d.campaign || {}) } };
      }
    } catch (e) { P.data = fresh(); }
    P.applySettings();
  };
  P.save = function () { try { localStorage.setItem(KEY, JSON.stringify(P.data)); } catch (e) { /* privater Modus */ } };
  P.reset = function () { P.data = fresh(); P.save(); P.applySettings(); };
  P.applySettings = function () {
    const s = P.data.settings;
    G.settings.blood = s.blood;
    if (G.Audio) { G.Audio.music = s.music; G.Audio.sfx = s.sfx; G.Audio.muted = s.muted; G.Audio.apply(); }
  };

  // Volksstufe aus XP: Stufe n benötigt 400·n·(n−1)/2 XP insgesamt
  P.levelOf = function (xp) { let l = 1; while (xp >= 400 * l * (l + 1) / 2 && l < 20) l++; return l; };
  P.xpFor = (l) => 400 * l * (l - 1) / 2;
  P.raceLevel = (r) => P.levelOf(P.data.xp[r] || 0);
  P.skinUnlocked = (r, id) => P.raceLevel(r) >= G.SKINS.find((s) => s.id === id).lvl;
  P.bannerUnlocked = (r, id) => P.raceLevel(r) >= G.BANNERS.find((b) => b.id === id).lvl;
  P.heroUnlocked = (r, h) => !h.unlock || P.raceLevel(r) >= G.UNLOCK_HERO_LVL;
  P.title = (r) => G.titleFor(P.raceLevel(r));

  // XP nach einer Partie
  P.award = function (S) {
    const p = S.players[0], o = S.over;
    const diffMul = { einfach: 0.75, mittel: 1, schwer: 1.5 }[S.cfg.difficulty] || 1;
    let xp = 80 + Math.min(30, S.time / 60) * 6 + Math.min(120, p.stats.kills * 0.5) + p.hero.level * 8 + p.th.level * 10;
    if (o.win) xp += 200;
    xp = Math.round(xp * diffMul * (S.cfg.mission ? 1.25 : 1));
    const before = P.raceLevel(p.race);
    P.data.xp[p.race] = (P.data.xp[p.race] || 0) + xp;
    P.data.games++; if (o.win) P.data.wins++;
    const after = P.raceLevel(p.race);
    const unlocked = G.REWARDS.filter((r) => r.lvl > before && r.lvl <= after);
    let missionNew = false;
    if (S.cfg.mission && o.win && !P.data.campaign.done[S.cfg.mission]) { P.data.campaign.done[S.cfg.mission] = true; missionNew = true; }
    P.save();
    return { xp, race: p.race, before, after, unlocked, missionNew };
  };

  // -------------------------------------------------------------------------
  // Kampagnen: eine eigene Geschichte pro Volk (je 5 Missionen, nacheinander freigeschaltet)
  const M = (title, story, goal, cfg) => ({ title, story, goal, cfg });
  const ver = 'Zerstöre das gegnerische Haupthaus.';
  G.CAMPAIGNS = {
    menschen: { title: 'Die Krone von Valenmark', intro: 'König Aldwin ist tot, und Valenmark steht allein. Von allen Seiten greifen Feinde nach dem herrenlosen Reich.', missions: [
      M('Grenzfeuer', 'Kriegsbanden der Orks brennen die Dörfer an der Ostgrenze nieder. Die Bauern fliehen in deine junge Festung. Zeige ihnen, dass die Krone noch Schutz bietet.', ver,
        { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['orks'], map: 'auen', playerGold: 600 }),
      M('Die Wolfsnacht', 'Der Häuptling der Orks hat Rache geschworen. Seine ganze Horde zieht gegen dich – zu viele, um sie zu schlagen. Doch Verstärkung aus der Hauptstadt ist unterwegs.', 'Überlebe 12 Minuten.',
        { mode: '1v1', difficulty: 'mittel', duration: 12, objective: 'ueberleben', enemies: ['orks'], map: 'auen', enemyEco: 1.4 }),
      M('Der Drache von Kaltenstein', 'Ein Drache wütet in den Bergen, und sein Hort könnte deine Kriegskasse füllen. Doch auch die Zwerge haben ein Auge auf das Gold geworfen.', 'Erschlage einen Drachen vor den Zwergen (25 Minuten).',
        { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['zwerge'], map: 'frost' }),
      M('Bündnis der Kronen', 'Aus den Sümpfen erhebt sich eine unheilige Allianz aus Untoten und Dämonen. Ein fremder Herrscher bietet dir ein Bündnis an.', 'Besiege beide Gegner gemeinsam mit deinem Verbündeten.',
        { mode: '2v2', difficulty: 'mittel', duration: 30, objective: 'vernichten', enemies: ['untote', 'daemonen'], map: 'suempfe' }),
      M('Der König fällt nicht', 'Hinter allem steckt ein Fürst der Hölle, der Aldwins Seele als Pfand hält. Marschiere in die Aschenlande und hole sie zurück.', 'Besiege die Dämonen auf „Schwer“.',
        { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemies: ['daemonen'], map: 'asche' }),
    ] },
    elfen: { title: 'Das Lied des Silberwalds', intro: 'Seit tausend Jahren singt der Silberwald sein Lied. Nun wird es leiser – etwas vergiftet die Wurzeln.', missions: [
      M('Fremde im Hain', 'Menschliche Holzfäller sind in den heiligen Hain eingedrungen. Mit Worten waren sie nicht zu vertreiben.', ver,
        { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['menschen'], map: 'silberwald', playerGold: 600 }),
      M('Die Brandstifter', 'Ork-Brandstifter legen Feuer an den Waldrand. Halte sie auf, bis der Regen der Druidinnen kommt.', 'Überlebe 12 Minuten.',
        { mode: '1v1', difficulty: 'mittel', duration: 12, objective: 'ueberleben', enemies: ['orks'], map: 'silberwald', enemyEco: 1.3 }),
      M('Sternenfall', 'Ein uralter Drache trägt einen Sternensplitter in seiner Brust – den Schlüssel, um den Wald zu heilen. Die Untoten jagen ihn ebenfalls.', 'Erschlage einen Drachen vor den Untoten (25 Minuten).',
        { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['untote'], map: 'auen' }),
      M('Der verdorbene Hain', 'Die Quelle des Gifts liegt in den Sümpfen: Untote und Dämonen nähren sich von den Wurzeln der Welt.', 'Besiege beide Gegner gemeinsam mit deinem Verbündeten.',
        { mode: '2v2', difficulty: 'mittel', duration: 30, objective: 'vernichten', enemies: ['untote', 'daemonen'], map: 'suempfe' }),
      M('Mondfinsternis', 'In der Nacht der Mondfinsternis öffnet sich das Tor der Dämonen. Nur jetzt kann es für immer geschlossen werden.', 'Besiege die Dämonen auf „Schwer“.',
        { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemies: ['daemonen'], map: 'asche' }),
    ] },
    untote: { title: 'Der Ewige Winter der Toten', intro: 'Der Lich-König ist erwacht. Seine Diener sind hungrig, und die Lebenden haben vergessen, sich zu fürchten.', missions: [
      M('Erwachen', 'Ein Dorf der Menschen wurde auf deinen alten Gräbern errichtet. Es ist Zeit, sie daran zu erinnern, wem dieses Land gehört.', ver,
        { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['menschen'], map: 'suempfe', playerGold: 600 }),
      M('Der Zorn der Lebenden', 'Die Menschen haben Paladine gerufen. Ihr heiliges Heer ist zahlreicher als deine Toten – noch.', 'Überlebe 12 Minuten.',
        { mode: '1v1', difficulty: 'mittel', duration: 12, objective: 'ueberleben', enemies: ['menschen'], map: 'suempfe', enemyEco: 1.4 }),
      M('Knochen eines Drachen', 'Die Knochen eines Drachen sind das mächtigste Ritualmaterial der Welt. Die Elfen wollen das verhindern.', 'Erschlage einen Drachen vor den Elfen (25 Minuten).',
        { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['elfen'], map: 'frost' }),
      M('Seuchenmarsch', 'Ein Bündnis aus Menschen und Zwergen stellt sich der Seuche entgegen. Ein zweiter Nekromant bietet seine Hilfe an.', 'Besiege beide Gegner gemeinsam mit deinem Verbündeten.',
        { mode: '2v2', difficulty: 'mittel', duration: 30, objective: 'vernichten', enemies: ['menschen', 'zwerge'], map: 'auen' }),
      M('Die Totenkrone', 'Der letzte Widerstand sitzt im Silberwald. Fällt der Mondbaum, beginnt der Ewige Winter.', 'Besiege die Elfen auf „Schwer“.',
        { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemies: ['elfen'], map: 'silberwald' }),
    ] },
    orks: { title: 'Blut und Steppe', intro: 'Die Clans der Roten Steppe waren immer zerstritten. Ein neuer Häuptling will sie alle unter einem Banner vereinen.', missions: [
      M('Der erste Kriegszug', 'Die Zwerge haben eure heilige Quelle für eine Mine zugeschüttet. Das Blut der Clans kocht.', ver,
        { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['zwerge'], map: 'steppe', playerGold: 600 }),
      M('Die Rache der Zwerge', 'Die Zwerge kommen mit Kanonen und Golems zurück. Halte die Stellung, bis die anderen Clans eintreffen.', 'Überlebe 12 Minuten.',
        { mode: '1v1', difficulty: 'mittel', duration: 12, objective: 'ueberleben', enemies: ['zwerge'], map: 'steppe', enemyEco: 1.4 }),
      M('Drachenjäger', 'Wer einen Drachen erschlägt, dem folgen alle Clans. Doch die Menschen wollen sich ebenfalls Ruhm verdienen.', 'Erschlage einen Drachen vor den Menschen (25 Minuten).',
        { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['menschen'], map: 'steppe' }),
      M('Clan gegen Clan', 'Drei Rivalen weigern sich, sich zu unterwerfen. Die Steppe kennt nur ein Gesetz: Der Stärkere herrscht.', 'Sei der letzte Überlebende – oder führe nach Punkten.',
        { mode: 'ffa', difficulty: 'mittel', duration: 30, objective: 'vernichten', map: 'steppe' }),
      M('Der große Sturm', 'Vereint wie nie zuvor rollt die Horde gegen das reichste Königreich der Menschen.', 'Besiege die Menschen auf „Schwer“.',
        { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemies: ['menschen'], map: 'auen' }),
    ] },
    zwerge: { title: 'Das Erbe der Tiefen', intro: 'Unter dem Frostgipfel liegen die verlorenen Hallen eurer Ahnen. Wer sie zurückerobert, wird Bergkönig.', missions: [
      M('Die versiegelte Mine', 'Beim Graben habt ihr eine Gruft geöffnet. Was darin schlief, ist nicht erfreut.', ver,
        { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['untote'], map: 'frost', playerGold: 600 }),
      M('Belagerung von Eisenheim', 'Ork-Horden umzingeln die Bergfeste. Die Tore müssen halten, bis der Winter die Belagerer vertreibt.', 'Überlebe 14 Minuten.',
        { mode: '1v1', difficulty: 'mittel', duration: 14, objective: 'ueberleben', enemies: ['orks'], map: 'frost', enemyEco: 1.5 }),
      M('Der Drache im Berg', 'In den tiefsten Hallen schläft ein Drache auf dem Gold eurer Ahnen. Auch Dämonen spüren seine Glut.', 'Erschlage einen Drachen vor den Dämonen (25 Minuten).',
        { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['daemonen'], map: 'frost' }),
      M('Bund aus Stein und Wald', 'Ein ungewöhnliches Bündnis: Ein Waldvolk bittet um Hilfe gegen Orks und Untote.', 'Besiege beide Gegner gemeinsam mit deinem Verbündeten.',
        { mode: '2v2', difficulty: 'mittel', duration: 30, objective: 'vernichten', enemies: ['orks', 'untote'], map: 'steppe' }),
      M('Die Schmiede des Untergangs', 'Die Dämonen haben die große Esse eurer Ahnen geraubt und schmieden damit Waffen für die Hölle.', 'Besiege die Dämonen auf „Schwer“.',
        { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemies: ['daemonen'], map: 'asche' }),
    ] },
    daemonen: { title: 'Der Höllenschlund', intro: 'Das Siegel ist gebrochen. Zum ersten Mal seit Äonen steht der Weg in die Welt der Sterblichen offen.', missions: [
      M('Durch das Tor', 'Auf der anderen Seite des Tores wachen Elfen. Ihr Mondlicht brennt – aber nicht lange.', ver,
        { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['elfen'], map: 'asche', playerGold: 600 }),
      M('Das Licht schlägt zurück', 'Die Menschen schicken ein Kreuzzugsheer durch die Aschenlande. Hält dein Brückenkopf, gehört die Welt dir.', 'Überlebe 12 Minuten.',
        { mode: '1v1', difficulty: 'mittel', duration: 12, objective: 'ueberleben', enemies: ['menschen'], map: 'asche', enemyEco: 1.4 }),
      M('Drachenseelen', 'Die Seele eines Drachen würde das Tor für immer offen halten. Die Zwerge wollen den Drachen um jeden Preis schützen.', 'Erschlage einen Drachen vor den Zwergen (25 Minuten).',
        { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['zwerge'], map: 'frost' }),
      M('Ewiger Brand', 'Alle Völker der Welt haben sich gegen dich erhoben – und gegeneinander. Lass sie bluten.', 'Sei der letzte Überlebende – oder führe nach Punkten.',
        { mode: 'ffa', difficulty: 'mittel', duration: 30, objective: 'vernichten', map: 'asche' }),
      M('Der Thron der Welt', 'Valenmark ist das letzte Bollwerk der Sterblichen. Fällt es, ist der Thron der Welt dein.', 'Besiege die Menschen auf „Schwer“.',
        { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemies: ['menschen'], map: 'auen' }),
    ] },
  };
  for (const r in G.CAMPAIGNS) G.CAMPAIGNS[r].missions.forEach((m, i) => (m.id = `${r}-${i + 1}`));
  P.missionUnlocked = (race, i) => i === 0 || !!P.data.campaign.done[G.CAMPAIGNS[race].missions[i - 1].id];
  P.missionDone = (race, i) => !!P.data.campaign.done[G.CAMPAIGNS[race].missions[i].id];
  P.findMission = (id) => { const [r, n] = id.split('-'); return { race: r, index: +n - 1, m: G.CAMPAIGNS[r].missions[+n - 1] }; };
})();
