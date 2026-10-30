import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  alleFortschritte, alleFragen, alleSimulationen, erstelleSicherung, holeFortschritt, holeLaufendeSimulation,
  holeProfil, loescheFrage, loescheLaufendeSimulation, oeffneDb, setzeLernstandZurueck, speichereFortschritt,
  speichereFrage, speichereLaufendeSimulation, speichereProfil, speichereSimulation, stelleOriginalWiederHer,
  stelleSicherungWiederHer, synchronisiereFragen,
} from './db';
import { pruefeSicherung } from '../logic/austausch';
import type { Frage } from '../types';

let zaehler = 0;
const neueDb = () => oeffneDb(`test-${++zaehler}`);
const f = (id: string, frage = 'Text'): Frage => ({
  id, thema: 'recht', typ: 'einfach', frage, antworten: ['A', 'B'], richtig: [0],
  erklaerung: 'E', quelle: 'Q', schwierigkeit: 1, bild: null, geprueft: false, stand: '2026-10',
});

describe('Datenbank', () => {
  it('synchronisiert mitgelieferte Fragen nur einmal', async () => {
    const db = await neueDb();
    expect(await synchronisiereFragen(db, [f('a'), f('b')])).toBe(2);
    expect(await synchronisiereFragen(db, [f('a'), f('b')])).toBe(0);
    expect(await alleFragen(db)).toHaveLength(2);
  });

  it('behält Bearbeitungen und merkt sich gelöschte Fragen', async () => {
    const db = await neueDb();
    await synchronisiereFragen(db, [f('a'), f('b')]);
    await speichereFrage(db, { ...f('a', 'Geändert'), geprueft: true });
    await loescheFrage(db, 'b');
    await synchronisiereFragen(db, [f('a', 'Datei neu'), f('b')]);
    const fragen = await alleFragen(db);
    expect(fragen.map((x) => x.id)).toEqual(['a']);
    expect(fragen[0]).toMatchObject({ frage: 'Geändert', geprueft: true, bearbeitet: true, herkunft: 'mitgeliefert' });
  });

  it('kennzeichnet in der App angelegte Fragen als eigen', async () => {
    const db = await neueDb();
    const neu = await speichereFrage(db, f('eigen-1'));
    expect(neu.herkunft).toBe('eigen');
  });

  it('liefert Standard-Fortschritt und Standard-Profil', async () => {
    const db = await neueDb();
    expect(await holeFortschritt(db, 'x')).toMatchObject({ status: 'neu', box: 0 });
    const p = await holeProfil(db);
    expect(p).toMatchObject({ xp: 0, tagesziel: 20, pruefungsDatum: '2027-01-30' });
    expect(p.simulation).toEqual({ anzahl: 30, minuten: 60, bestehensgrenze: 70 });
    await speichereProfil(db, { ...p, xp: 50 });
    expect((await holeProfil(db)).xp).toBe(50);
    await speichereFortschritt(db, { ...(await holeFortschritt(db, 'x')), markiert: true });
    expect((await holeFortschritt(db, 'x')).markiert).toBe(true);
  });

  it('ergänzt neue Einstellungen in einem alten Profil mit dem Standard (Töne an)', async () => {
    const db = await neueDb();
    const { toene: _t, ...altesProfil } = await holeProfil(db);
    await db.put('profil', { ...altesProfil, xp: 7 } as never);
    expect(await holeProfil(db)).toMatchObject({ xp: 7, toene: true });
  });

  it('löscht beim Entfernen einer Frage auch den Fortschritt', async () => {
    const db = await neueDb();
    await synchronisiereFragen(db, [f('a')]);
    await speichereFortschritt(db, { ...(await holeFortschritt(db, 'a')), versuche: 3 });
    await loescheFrage(db, 'a');
    expect((await holeFortschritt(db, 'a')).versuche).toBe(0);
  });

  it('speichert Simulationen, neueste zuerst', async () => {
    const db = await neueDb();
    const s = { einstellungen: { anzahl: 1, minuten: 1, bestehensgrenze: 70 }, dauerSek: 1, anzahl: 1, richtig: 1, prozent: 100, bestanden: true, unbeantwortet: 0, jeThema: {}, falscheIds: [], details: [] };
    await speichereSimulation(db, { ...s, datum: 1 });
    await speichereSimulation(db, { ...s, datum: 2 });
    expect((await alleSimulationen(db)).map((x) => x.datum)).toEqual([2, 1]);
  });

  it('merkt sich eine laufende Simulation bis zum Löschen', async () => {
    const db = await neueDb();
    expect(await holeLaufendeSimulation(db)).toBeNull();
    const laufend = { start: 5, einstellungen: { anzahl: 2, minuten: 10, bestehensgrenze: 70 }, fragen: [{ id: 'a', reihenfolge: [1, 0] }], antworten: { a: [1] }, gemerkt: ['a'], pos: 0 };
    await speichereLaufendeSimulation(db, laufend);
    expect(await holeLaufendeSimulation(db)).toEqual(laufend);
    await loescheLaufendeSimulation(db);
    expect(await holeLaufendeSimulation(db)).toBeNull();
  });

  it('Sicherung → neue Datenbank → gleicher Lernstand', async () => {
    const quelle = await neueDb();
    const mitgeliefert = [f('a'), f('b'), f('c')];
    await synchronisiereFragen(quelle, mitgeliefert);
    await speichereFrage(quelle, { ...f('a', 'meine Fassung'), geprueft: true });
    await speichereFrage(quelle, f('eigen-1'));
    await loescheFrage(quelle, 'c');
    await speichereFortschritt(quelle, { ...(await holeFortschritt(quelle, 'b')), status: 'gelernt', box: 3, notiz: 'merken' });
    await speichereProfil(quelle, { ...(await holeProfil(quelle)), xp: 1234, tagesziel: 30 });
    const sim = { datum: 5, einstellungen: { anzahl: 1, minuten: 1, bestehensgrenze: 70 }, dauerSek: 1, anzahl: 1, richtig: 1, prozent: 100, bestanden: true, unbeantwortet: 0, jeThema: {}, falscheIds: [], details: [] };
    await speichereSimulation(quelle, sim);

    // über JSON wie beim echten Speichern als Datei
    const datei = JSON.parse(JSON.stringify(await erstelleSicherung(quelle)));
    expect(datei.fragen.map((x: { id: string }) => x.id).sort()).toEqual(['a', 'eigen-1']);
    const { sicherung } = pruefeSicherung(datei);

    const ziel = await neueDb();
    await synchronisiereFragen(ziel, mitgeliefert);
    await speichereProfil(ziel, { ...(await holeProfil(ziel)), xp: 1 });
    await stelleSicherungWiederHer(ziel, sicherung!, mitgeliefert);

    const fragen = await alleFragen(ziel);
    expect(fragen.map((x) => x.id).sort()).toEqual(['a', 'b', 'eigen-1']); // c bleibt gelöscht
    expect(fragen.find((x) => x.id === 'a')).toMatchObject({ frage: 'meine Fassung', geprueft: true, bearbeitet: true });
    expect(await holeProfil(ziel)).toMatchObject({ xp: 1234, tagesziel: 30 });
    expect((await holeFortschritt(ziel, 'b'))).toMatchObject({ status: 'gelernt', box: 3, notiz: 'merken' });
    expect((await alleSimulationen(ziel)).map((x) => x.prozent)).toEqual([100]);
  });

  it('Lernstand zurücksetzen behält Fragen, Einstellungen, Notizen und Markierungen', async () => {
    const db = await neueDb();
    await synchronisiereFragen(db, [f('a'), f('b')]);
    await speichereFrage(db, f('eigen-1'));
    await speichereFortschritt(db, { ...(await holeFortschritt(db, 'a')), status: 'gelernt', box: 4, versuche: 5, markiert: true, notiz: 'n' });
    await speichereFortschritt(db, { ...(await holeFortschritt(db, 'b')), status: 'falsch', box: 1, versuche: 2 });
    await speichereProfil(db, { ...(await holeProfil(db)), xp: 999, abzeichen: ['ziel-1'], lernTage: { '2027-01-01': 4 }, tagesziel: 35 });
    await speichereLaufendeSimulation(db, { start: 1, einstellungen: { anzahl: 1, minuten: 1, bestehensgrenze: 70 }, fragen: [], antworten: {}, gemerkt: [], pos: 0 });

    await setzeLernstandZurueck(db);

    const fp = await alleFortschritte(db);
    expect([...fp.keys()]).toEqual(['a']);
    expect(fp.get('a')).toMatchObject({ status: 'neu', box: 0, versuche: 0, markiert: true, notiz: 'n' });
    expect(await holeProfil(db)).toMatchObject({ xp: 0, abzeichen: [], lernTage: {}, tagesziel: 35 });
    expect(await holeLaufendeSimulation(db)).toBeNull();
    expect((await alleFragen(db)).map((x) => x.id).sort()).toEqual(['a', 'b', 'eigen-1']);
  });

  it('stellt die mitgelieferte Fassung wieder her', async () => {
    const db = await neueDb();
    await synchronisiereFragen(db, [f('a', 'Original')]);
    await speichereFrage(db, f('a', 'Bearbeitet'));
    await stelleOriginalWiederHer(db, f('a', 'Original'));
    expect((await alleFragen(db))[0]).toMatchObject({ frage: 'Original', bearbeitet: false, herkunft: 'mitgeliefert' });
    // danach kommen Änderungen aus den Dateien wieder an
    await synchronisiereFragen(db, [f('a', 'Neue Dateifassung')]);
    expect((await alleFragen(db))[0].frage).toBe('Neue Dateifassung');
  });
});
