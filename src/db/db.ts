import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  STANDARD_PROFIL,
  neuerFortschritt,
  type Fortschritt,
  type Frage,
  type GespeicherteFrage,
  type LaufendeSimulation,
  type Profil,
  type SimulationErgebnis,
} from '../types';
import { abzugleichendeFragen } from '../logic/abgleich';
import { SICHERUNG_APP, SICHERUNG_VERSION, type Sicherung } from '../logic/austausch';
import { hatEigeneAngaben, ohneLernstand } from '../logic/leitner';
import { profilOhneLernstand } from '../logic/motivation';

interface TreiDB extends DBSchema {
  fragen: { key: string; value: GespeicherteFrage; indexes: { thema: string } };
  fortschritt: { key: string; value: Fortschritt };
  profil: { key: string; value: Profil };
  simulationen: { key: number; value: SimulationErgebnis };
  meta: { key: string; value: { key: string; wert: unknown } };
}

export type Db = IDBPDatabase<TreiDB>;

export const DB_NAME = 'trei-trainer';
const DB_VERSION = 1;

export function oeffneDb(name = DB_NAME): Promise<Db> {
  return openDB<TreiDB>(name, DB_VERSION, {
    upgrade(db) {
      const fragen = db.createObjectStore('fragen', { keyPath: 'id' });
      fragen.createIndex('thema', 'thema');
      db.createObjectStore('fortschritt', { keyPath: 'id' });
      db.createObjectStore('profil', { keyPath: 'id' });
      db.createObjectStore('simulationen', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });
}

// ---------- Meta ----------

async function geloeschteIds(db: Db): Promise<Set<string>> {
  const eintrag = await db.get('meta', 'geloescht');
  return new Set((eintrag?.wert as string[] | undefined) ?? []);
}

async function setzeGeloeschteIds(db: Db, ids: Set<string>): Promise<void> {
  await db.put('meta', { key: 'geloescht', wert: [...ids] });
}

// ---------- Fragen ----------

/** Übernimmt neue/geänderte mitgelieferte Fragen in die Datenbank. Liefert die Anzahl geschriebener Fragen. */
export async function synchronisiereFragen(db: Db, dateien: Frage[]): Promise<number> {
  const vorhanden = new Map((await db.getAll('fragen')).map((f) => [f.id, f]));
  const zuSchreiben = abzugleichendeFragen(dateien, vorhanden, await geloeschteIds(db));
  if (zuSchreiben.length) {
    const tx = db.transaction('fragen', 'readwrite');
    await Promise.all([...zuSchreiben.map((f) => tx.store.put(f)), tx.done]);
  }
  return zuSchreiben.length;
}

export function alleFragen(db: Db): Promise<GespeicherteFrage[]> {
  return db.getAll('fragen');
}

/** Speichert eine in der App angelegte oder geänderte Frage. */
export async function speichereFrage(db: Db, frage: Frage): Promise<GespeicherteFrage> {
  const alt = await db.get('fragen', frage.id);
  const neu: GespeicherteFrage = {
    ...frage,
    herkunft: alt?.herkunft ?? 'eigen',
    bearbeitet: true,
  };
  await db.put('fragen', neu);
  const geloescht = await geloeschteIds(db);
  if (geloescht.delete(frage.id)) await setzeGeloeschteIds(db, geloescht);
  return neu;
}

export async function loescheFrage(db: Db, id: string): Promise<void> {
  const alt = await db.get('fragen', id);
  await db.delete('fragen', id);
  await db.delete('fortschritt', id);
  if (alt?.herkunft === 'mitgeliefert') {
    const geloescht = await geloeschteIds(db);
    geloescht.add(id);
    await setzeGeloeschteIds(db, geloescht);
  }
}

// ---------- Fortschritt ----------

export async function holeFortschritt(db: Db, id: string): Promise<Fortschritt> {
  return (await db.get('fortschritt', id)) ?? neuerFortschritt(id);
}

export async function alleFortschritte(db: Db): Promise<Map<string, Fortschritt>> {
  return new Map((await db.getAll('fortschritt')).map((f) => [f.id, f]));
}

export async function speichereFortschritt(db: Db, f: Fortschritt): Promise<void> {
  await db.put('fortschritt', f);
}

// ---------- Profil ----------

export async function holeProfil(db: Db): Promise<Profil> {
  const p = await db.get('profil', 'profil');
  return { ...STANDARD_PROFIL, ...p, simulation: { ...STANDARD_PROFIL.simulation, ...p?.simulation } };
}

export async function speichereProfil(db: Db, p: Profil): Promise<void> {
  await db.put('profil', p);
}

// ---------- Simulationen ----------

export async function speichereSimulation(db: Db, s: SimulationErgebnis): Promise<number> {
  return db.add('simulationen', s);
}

export async function alleSimulationen(db: Db): Promise<SimulationErgebnis[]> {
  return (await db.getAll('simulationen')).sort((a, b) => b.datum - a.datum);
}

// ---------- Laufende Simulation (übersteht das Schließen der App) ----------

export async function holeLaufendeSimulation(db: Db): Promise<LaufendeSimulation | null> {
  return ((await db.get('meta', 'laufendeSimulation'))?.wert as LaufendeSimulation | undefined) ?? null;
}

export async function speichereLaufendeSimulation(db: Db, s: LaufendeSimulation): Promise<void> {
  await db.put('meta', { key: 'laufendeSimulation', wert: s });
}

export async function loescheLaufendeSimulation(db: Db): Promise<void> {
  await db.delete('meta', 'laufendeSimulation');
}

// ---------- Mitgelieferte Fassung wiederherstellen ----------

export async function stelleOriginalWiederHer(db: Db, original: Frage): Promise<GespeicherteFrage> {
  const f: GespeicherteFrage = { ...original, herkunft: 'mitgeliefert', bearbeitet: false };
  await db.put('fragen', f);
  return f;
}

// ---------- Lernstand sichern / wiederherstellen / zurücksetzen ----------

export async function erstelleSicherung(db: Db, jetzt = Date.now()): Promise<Sicherung> {
  const [profil, fortschritte, simulationen, fragen, geloescht, laufendeSimulation] = await Promise.all([
    holeProfil(db),
    db.getAll('fortschritt'),
    db.getAll('simulationen'),
    db.getAll('fragen'),
    geloeschteIds(db),
    holeLaufendeSimulation(db),
  ]);
  return {
    app: SICHERUNG_APP,
    version: SICHERUNG_VERSION,
    erstellt: new Date(jetzt).toISOString(),
    profil,
    fortschritte,
    simulationen,
    fragen: fragen.filter((f) => f.herkunft === 'eigen' || f.bearbeitet),
    geloescht: [...geloescht],
    laufendeSimulation,
  };
}

/** Ersetzt den kompletten Lernstand durch die Sicherung; mitgelieferte Fragen werden danach ergänzt. */
export async function stelleSicherungWiederHer(db: Db, s: Sicherung, mitgeliefert: Frage[]): Promise<void> {
  const tx = db.transaction(['fragen', 'fortschritt', 'profil', 'simulationen', 'meta'], 'readwrite');
  const fragen = tx.objectStore('fragen');
  const fortschritt = tx.objectStore('fortschritt');
  const profil = tx.objectStore('profil');
  const simulationen = tx.objectStore('simulationen');
  const meta = tx.objectStore('meta');
  await Promise.all([fragen.clear(), fortschritt.clear(), profil.clear(), simulationen.clear(), meta.delete('geloescht'), meta.delete('laufendeSimulation')]);
  await Promise.all([
    ...s.fragen.map((f) => fragen.put(f)),
    ...s.fortschritte.map((f) => fortschritt.put(f)),
    profil.put({ ...STANDARD_PROFIL, ...s.profil, id: 'profil' }),
    ...s.simulationen.map((x) => simulationen.put(x)),
    meta.put({ key: 'geloescht', wert: s.geloescht }),
    ...(s.laufendeSimulation ? [meta.put({ key: 'laufendeSimulation', wert: s.laufendeSimulation })] : []),
  ]);
  await tx.done;
  await synchronisiereFragen(db, mitgeliefert);
}

/** Löscht den Lernfortschritt. Fragen, Einstellungen, Notizen, Markierungen und Meldungen bleiben. */
export async function setzeLernstandZurueck(db: Db): Promise<void> {
  const alt = await db.getAll('fortschritt');
  const p = await holeProfil(db);
  const tx = db.transaction(['fortschritt', 'profil', 'simulationen', 'meta'], 'readwrite');
  const fortschritt = tx.objectStore('fortschritt');
  await Promise.all([
    ...alt.map((f) => (hatEigeneAngaben(f) ? fortschritt.put(ohneLernstand(f)) : fortschritt.delete(f.id))),
    tx.objectStore('profil').put(profilOhneLernstand(p)),
    tx.objectStore('simulationen').clear(),
    tx.objectStore('meta').delete('laufendeSimulation'),
  ]);
  await tx.done;
}

export async function holeLetzteSicherung(db: Db): Promise<number | null> {
  return ((await db.get('meta', 'letzteSicherung'))?.wert as number | undefined) ?? null;
}

export async function merkeLetzteSicherung(db: Db, zeit = Date.now()): Promise<void> {
  await db.put('meta', { key: 'letzteSicherung', wert: zeit });
}
