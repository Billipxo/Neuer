import type { Fortschritt, Frage, GespeicherteFrage, LaufendeSimulation, Profil, SimulationErgebnis } from '../types';
import { gleicherInhalt } from './abgleich';
import { pruefeFrage } from './validierung';

// ---------- Fragen exportieren ----------

/** Nur die Schemafelder (ohne Herkunft/Bearbeitet), in fester Reihenfolge wie in den Projektdateien. */
export function fuerExport(f: Frage): Frage {
  return {
    id: f.id,
    thema: f.thema,
    ...(f.unterthema ? { unterthema: f.unterthema } : {}),
    typ: f.typ,
    frage: f.frage,
    antworten: f.antworten,
    richtig: f.richtig,
    erklaerung: f.erklaerung,
    quelle: f.quelle,
    schwierigkeit: f.schwierigkeit,
    bild: f.bild,
    geprueft: f.geprueft,
    stand: f.stand,
  };
}

export function fragenAlsJson(fragen: readonly Frage[]): string {
  return JSON.stringify(fragen.map(fuerExport), null, 2) + '\n';
}

// ---------- Fragen importieren ----------

export interface ImportPlan {
  neu: Frage[];
  /** vorhandene ID mit anderem Inhalt */
  geaendert: Frage[];
  /** vorhandene ID mit gleichem Inhalt (nichts zu tun) */
  gleich: number;
  fehlerhaft: { nr: number; id: string; fehler: string[] }[];
}

/**
 * Liest eine Import-Datei: eine Liste von Fragen, ein Objekt mit „fragen“ (z. B. Sicherung)
 * oder eine einzelne Frage. Doppelte IDs in der Datei werden gemeldet.
 */
export function planeImport(roh: unknown, vorhanden: ReadonlyMap<string, Frage>): ImportPlan {
  const liste: unknown[] = Array.isArray(roh)
    ? roh
    : roh && typeof roh === 'object' && Array.isArray((roh as { fragen?: unknown }).fragen)
      ? (roh as { fragen: unknown[] }).fragen
      : roh && typeof roh === 'object'
        ? [roh]
        : [];
  const plan: ImportPlan = { neu: [], geaendert: [], gleich: 0, fehlerhaft: [] };
  const inDatei = new Set<string>();
  liste.forEach((eintrag, i) => {
    // Felder aus der App-Datenbank (Sicherung) vor der Prüfung entfernen
    const sauber =
      eintrag && typeof eintrag === 'object'
        ? Object.fromEntries(Object.entries(eintrag).filter(([k]) => k !== 'herkunft' && k !== 'bearbeitet'))
        : eintrag;
    const id = sauber && typeof sauber === 'object' && typeof (sauber as Frage).id === 'string' ? (sauber as Frage).id : `#${i + 1}`;
    const fehler = pruefeFrage(sauber);
    if (inDatei.has(id)) fehler.push('ID kommt in der Datei mehrfach vor');
    inDatei.add(id);
    if (fehler.length) {
      plan.fehlerhaft.push({ nr: i + 1, id, fehler });
      return;
    }
    const frage = fuerExport(sauber as Frage);
    const alt = vorhanden.get(frage.id);
    if (!alt) plan.neu.push(frage);
    else if (gleicherInhalt(alt, frage)) plan.gleich++;
    else plan.geaendert.push(frage);
  });
  if (liste.length === 0) plan.fehlerhaft.push({ nr: 0, id: '-', fehler: ['Keine Fragen in der Datei gefunden'] });
  return plan;
}

// ---------- Lernstand sichern ----------

export const SICHERUNG_APP = 'trei-trainer';
export const SICHERUNG_VERSION = 1;

export interface Sicherung {
  app: typeof SICHERUNG_APP;
  version: number;
  erstellt: string;
  profil: Profil;
  fortschritte: Fortschritt[];
  simulationen: SimulationErgebnis[];
  /** selbst angelegte und in der App bearbeitete Fragen */
  fragen: GespeicherteFrage[];
  /** gelöschte mitgelieferte Fragen */
  geloescht: string[];
  laufendeSimulation: LaufendeSimulation | null;
}

export function pruefeSicherung(roh: unknown): { sicherung: Sicherung | null; fehler: string | null } {
  if (!roh || typeof roh !== 'object') return { sicherung: null, fehler: 'Keine gültige Sicherungsdatei' };
  const s = roh as Partial<Sicherung>;
  if (s.app !== SICHERUNG_APP) return { sicherung: null, fehler: 'Das ist keine Sicherung des TREI-Trainers' };
  if (typeof s.version !== 'number' || s.version > SICHERUNG_VERSION) {
    return { sicherung: null, fehler: 'Die Sicherung stammt aus einer neueren App-Version' };
  }
  if (!s.profil || typeof s.profil !== 'object' || !Array.isArray(s.fortschritte) || !Array.isArray(s.simulationen) || !Array.isArray(s.fragen)) {
    return { sicherung: null, fehler: 'Die Sicherungsdatei ist unvollständig' };
  }
  const kaputt = s.fragen.find((f) => !f || typeof f !== 'object' || pruefeFrage(fuerExport(f as Frage)).length > 0);
  if (kaputt !== undefined) {
    return { sicherung: null, fehler: `Fehlerhafte Frage in der Sicherung: ${(kaputt as Frage | null)?.id ?? '?'}` };
  }
  return {
    sicherung: {
      app: SICHERUNG_APP,
      version: s.version,
      erstellt: typeof s.erstellt === 'string' ? s.erstellt : '',
      profil: s.profil as Profil,
      fortschritte: s.fortschritte as Fortschritt[],
      simulationen: s.simulationen as SimulationErgebnis[],
      fragen: s.fragen as GespeicherteFrage[],
      geloescht: Array.isArray(s.geloescht) ? s.geloescht.filter((x): x is string => typeof x === 'string') : [],
      laufendeSimulation: s.laufendeSimulation ?? null,
    },
    fehler: null,
  };
}

/** „trei-lernstand-2026-10-11.json“ */
export function dateinameMitDatum(praefix: string, jetzt = Date.now()): string {
  const d = new Date(jetzt);
  const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${praefix}-${tag}.json`;
}
