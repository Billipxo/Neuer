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

  // -------------------------------------------------------------------------
  // Export/Import zum Übertragen zwischen Geräten: als Datei (JSON mit Kurzinfo) oder als kompakter Text-Code
  Saves.fileName = function (slot) {
    const m = Saves.meta(slot) || {}, d = new Date(m.date || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    return `reichsfeuer-${m.race || 'spiel'}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  };
  Saves.exportText = function (slot) {
    const s = store(), data = s && s.getItem(KEY + slot);
    if (!data) return null;
    return JSON.stringify({ app: 'reichsfeuer', v: G.SAVE_VERSION, meta: Saves.meta(slot), data: JSON.parse(data) });
  };
  const toB64 = (bytes) => { let out = ''; for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(out); };
  const fromB64 = (b64) => { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; };
  Saves.exportCode = async function (slot) { // gepackt (gzip + Base64), wenn der Browser das kann
    const text = Saves.exportText(slot);
    if (!text || typeof CompressionStream === 'undefined') return text;
    const buf = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    return 'RF1:' + toB64(new Uint8Array(buf));
  };
  // Kurzinfo aus dem Spielstand selbst (falls die Datei keine mitbringt)
  function metaFrom(D) {
    const p = D.players[0], race = p.race, rd = G.RACES[race];
    const hero = Array.isArray(p.heroDef && p.heroDef.$hero) ? (rd.heroes.find((h) => h.id === p.heroDef.$hero[1]) || {}).name : '';
    const cfg = D.S.cfg || {};
    return { v: G.SAVE_VERSION, date: Date.now(), race, raceName: rd.name, hero: hero || rd.name, heroLvl: 1, th: 1, mode: (G.LAYOUTS[D.S.mode] || {}).name || D.S.mode,
      diff: (G.DIFFICULTY[cfg.difficulty] || G.DIFFICULTY.mittel).name, map: (G.THEMES[D.S.theme] || {}).name || '', time: D.S.time || 0, limit: D.S.limit || 0, mission: null, gid: D.S.gid };
  }
  // Gibt null zurück, wenn es geklappt hat, sonst den Grund
  Saves.importText = async function (text, slot) {
    text = String(text || '').trim();
    try {
      if (text.startsWith('RF1:')) {
        if (typeof DecompressionStream === 'undefined') return 'Dieser Browser kann gepackte Codes nicht lesen – nutze den Datei-Export';
        text = await new Response(new Blob([fromB64(text.slice(4))]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      }
    } catch (e) { return 'Der Code ist unvollständig oder beschädigt'; }
    let o;
    try { o = JSON.parse(text); } catch (e) { return 'Das ist kein Reichsfeuer-Spielstand'; }
    const D = o && o.app === 'reichsfeuer' ? o.data : o;
    if (!D || !D.S || !Array.isArray(D.players) || !D.E || !G.RACES[(D.players[0] || {}).race]) return 'Das ist kein Reichsfeuer-Spielstand';
    if (D.v !== G.SAVE_VERSION) return 'Der Spielstand stammt aus einer anderen Spielversion';
    const meta = o.meta && o.meta.v === G.SAVE_VERSION ? o.meta : metaFrom(D);
    const s = store();
    if (!s) return 'Der Browser erlaubt hier keinen Speicher';
    try { s.setItem(KEY + slot, JSON.stringify(D)); s.setItem(META + slot, JSON.stringify(meta)); }
    catch (e) { return 'Browserspeicher voll – lösche einen älteren Spielstand'; }
    return null;
  };
})();
