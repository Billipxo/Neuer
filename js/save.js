'use strict';
// Spielstände im Browser: drei freie Plätze und ein automatischer Platz (jede Minute und beim Verlassen).
// Daten und Kurzinfo liegen getrennt, damit die Liste ohne das Einlesen der großen Spielstände auskommt.
(function () {
  const KEY = 'reichsfeuer.save.', META = 'reichsfeuer.savemeta.';
  const Saves = (G.Saves = { SLOTS: ['auto', '1', '2', '3'] });
  const store = () => { try { return window.localStorage; } catch (e) { return null; } };

  Saves.slotName = (slot) => (slot === 'auto' ? 'Automatisch' : 'Platz ' + slot);
  Saves.meta = function (slot) {
    try { const s = store(), m = s && s.getItem(META + slot); return m ? JSON.parse(m) : null; } catch (e) { return null; }
  };
  Saves.list = () => Saves.SLOTS.map((slot) => ({ slot, meta: Saves.meta(slot) }));
  Saves.latest = () => Saves.list().filter((x) => x.meta && x.meta.v === G.SAVE_VERSION).sort((a, b) => b.meta.date - a.meta.date)[0] || null;

  // Gibt null zurück, wenn es geklappt hat, sonst den Grund
  Saves.save = function (slot, ui) {
    const S = G.S;
    if (!S || S.over) return 'Kein laufendes Spiel';
    const s = store();
    if (!s) return 'Der Browser erlaubt hier keinen Speicher';
    let data;
    try { data = JSON.stringify(G.serializeGame(ui)); } catch (e) { console.error(e); return 'Spielstand konnte nicht erstellt werden'; }
    const p = S.players[0], fm = S.cfg.mission && G.Profile ? G.Profile.findMission(S.cfg.mission) : null;
    const meta = {
      v: G.SAVE_VERSION, gid: S.gid, date: Date.now(), race: p.race, raceName: p.rd.name, hero: p.heroDef.name, heroLvl: p.hero.level, th: p.th.level,
      mode: S.layout.name, diff: (G.DIFFICULTY[S.cfg.difficulty] || G.DIFFICULTY.mittel).name, map: G.THEMES[S.theme].name,
      time: S.time, limit: S.limit, mission: fm ? fm.m.title : null, size: data.length,
    };
    try { s.setItem(KEY + slot, data); s.setItem(META + slot, JSON.stringify(meta)); } // alter Stand bleibt bei Fehler erhalten
    catch (e) { return 'Browserspeicher voll – lösche einen älteren Spielstand'; }
    return null;
  };
  Saves.load = function (slot) {
    const s = store(), data = s && s.getItem(KEY + slot);
    if (!data) throw new Error('Spielstand nicht gefunden');
    const D = JSON.parse(data);
    return { S: G.loadGame(D), ui: D.ui || {} };
  };
  Saves.remove = function (slot) {
    const s = store();
    if (s) try { s.removeItem(KEY + slot); s.removeItem(META + slot); } catch (e) { /* egal */ }
  };
})();
