'use strict';
// Spielerprofil (im Browser gespeichert): Volks-XP, Skins, Kampagnenfortschritt, Einstellungen.
(function () {
  const KEY = 'reichsfeuer.profil.v1';
  const P = (G.Profile = {});

  function fresh() {
    const xp = {}, skin = {};
    for (const r of G.RACE_KEYS) { xp[r] = 0; skin[r] = 'standard'; }
    return { xp, skin, campaign: { done: {} }, settings: { music: 0.5, sfx: 0.7, blood: true, muted: false }, games: 0, wins: 0 };
  }
  P.data = fresh();
  P.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw), f = fresh();
        P.data = { ...f, ...d, xp: { ...f.xp, ...d.xp }, skin: { ...f.skin, ...d.skin }, settings: { ...f.settings, ...d.settings }, campaign: { done: {}, ...(d.campaign || {}) } };
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
    const unlocked = G.SKINS.filter((s) => s.lvl > before && s.lvl <= after);
    let missionNew = false;
    if (S.cfg.mission && o.win && !P.data.campaign.done[S.cfg.mission]) { P.data.campaign.done[S.cfg.mission] = true; missionNew = true; }
    P.save();
    return { xp, race: p.race, before, after, unlocked, missionNew };
  };

  // -------------------------------------------------------------------------
  // Kampagne „Die Funkenkriege“ – du wählst dein Volk, die Missionen bauen aufeinander auf.
  G.CAMPAIGN = [
    { id: 'm1', title: 'Erste Funken', story: 'Ein fremdes Heer hat sich an der Grenze deines Reiches niedergelassen. Baue deine Festung auf und vertreibe die Eindringlinge.',
      goal: 'Zerstöre das gegnerische Haupthaus.', cfg: { mode: '1v1', difficulty: 'einfach', duration: 30, objective: 'vernichten', enemies: ['orks'], playerGold: 600 } },
    { id: 'm2', title: 'Sturm aus der Steppe', story: 'Die Kriegsclans rächen sich mit voller Wucht. Ihre Horden sind stärker als deine – doch deine Mauern können halten.',
      goal: 'Überlebe 15 Minuten.', cfg: { mode: '1v1', difficulty: 'mittel', duration: 15, objective: 'ueberleben', enemies: ['orks'], enemyEco: 1.4 } },
    { id: 'm3', title: 'Der Drachenhort', story: 'Gerüchte sprechen von einem uralten Drachen und seinem Schatz. Die Untoten wollen sein Herz für ihre Rituale. Komm ihnen zuvor!',
      goal: 'Erschlage einen Drachen vor dem Gegner (25 Minuten).', cfg: { mode: '1v1', difficulty: 'mittel', duration: 25, objective: 'drache', enemies: ['untote'] } },
    { id: 'm4', title: 'Bündnis im Silberwald', story: 'Ein Verbündeter bittet um Hilfe: Elfen und Zwerge marschieren gemeinsam. Nur zusammen habt ihr eine Chance.',
      goal: 'Besiege beide gegnerischen Völker.', cfg: { mode: '2v2', difficulty: 'mittel', duration: 30, objective: 'vernichten', enemies: ['elfen', 'zwerge'], map: 'silberwald' } },
    { id: 'm5', title: 'Die Aschenlande', story: 'Hinter den Lavafeldern öffnet sich ein Höllenschlund. Die Dämonen dürfen nicht weiter wachsen.',
      goal: 'Zerstöre das Haupthaus der Dämonen.', cfg: { mode: '1v1', difficulty: 'mittel', duration: 30, objective: 'vernichten', enemies: ['daemonen'], map: 'asche', enemyEco: 1.15 } },
    { id: 'm6', title: 'Belagerung im Frost', story: 'Drei Völker haben sich gegen dich verschworen. Halte deine Stellung im ewigen Eis, bis der Winter sie zermürbt.',
      goal: 'Überlebe 18 Minuten gegen drei Gegner.', cfg: { mode: 'ffa', difficulty: 'mittel', duration: 18, objective: 'ueberleben', map: 'frost' } },
    { id: 'm7', title: 'Krieg der Kronen', story: 'Jedes Volk greift nach der Vorherrschaft. Nur eine Krone wird übrig bleiben.',
      goal: 'Sei das letzte Volk – oder führe nach Punkten.', cfg: { mode: 'ffa', difficulty: 'mittel', duration: 30, objective: 'vernichten' } },
    { id: 'm8', title: 'Der letzte Funke', story: 'Der mächtigste Feind wartet am Ende des Weges. Er kennt jede deiner Listen.',
      goal: 'Besiege einen starken Gegner auf „Schwer“.', cfg: { mode: '1v1', difficulty: 'schwer', duration: 30, objective: 'vernichten', enemyEco: 1.1 } },
  ];
  P.missionUnlocked = (i) => i === 0 || !!P.data.campaign.done[G.CAMPAIGN[i - 1].id];
})();
