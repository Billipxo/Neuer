import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { MITGELIEFERTE_FRAGEN } from '../data/fragen';
import { baueAbzeichenKontext, neueAbzeichen, type Abzeichen } from '../logic/abzeichen';
import { naechsterFortschritt, type Ergebnis } from '../logic/leitner';
import {
  verarbeiteAntwort,
  verbucheLektion,
  verbucheSimulation,
  type AntwortEreignis,
  type LektionsEreignis,
  type Level,
  type SimulationsEreignis,
} from '../logic/motivation';
import { endeZeitpunkt, werteSimulationAus } from '../logic/simulation';
import type { Sicherung } from '../logic/austausch';
import type {
  Fortschritt,
  Frage,
  GespeicherteFrage,
  KartenBewertung,
  LaufendeSimulation,
  Profil,
  SimulationErgebnis,
} from '../types';
import {
  alleFortschritte,
  alleFragen,
  alleSimulationen,
  holeFortschritt,
  holeProfil,
  loescheFrage,
  loescheLaufendeSimulation,
  oeffneDb,
  setzeLernstandZurueck,
  speichereFortschritt,
  speichereFrage,
  speichereProfil,
  speichereSimulation,
  stelleOriginalWiederHer,
  stelleSicherungWiederHer,
  synchronisiereFragen,
  type Db,
} from './db';

interface Zustand {
  db: Db;
  fragen: GespeicherteFrage[];
  fortschritte: Map<string, Fortschritt>;
  profil: Profil;
  simulationen: SimulationErgebnis[];
}

export interface Hinweis {
  id: number;
  icon: string;
  text: string;
}

export interface AntwortRueckmeldung {
  fortschritt: Fortschritt;
  ereignis: AntwortEreignis;
  abzeichen: Abzeichen[];
}

export interface SimulationsRueckmeldung {
  ergebnis: SimulationErgebnis;
  ereignis: SimulationsEreignis;
  abzeichen: Abzeichen[];
}

interface Daten extends Zustand {
  /** Lädt Fragen, Fortschritt, Profil und Simulationen neu aus der Datenbank. */
  neuLaden: () => Promise<void>;
  /** Speichert eine Antwort: Lernstand der Frage, XP, Serie, Tagesziel, Abzeichen. */
  antwortSpeichern: (id: string, ergebnis: Ergebnis, karte?: KartenBewertung) => Promise<AntwortRueckmeldung>;
  /** Wertet eine Simulation aus und speichert Ergebnis, Lernstand, XP und Abzeichen. */
  simulationSpeichern: (laufend: LaufendeSimulation) => Promise<SimulationsRueckmeldung>;
  /** Bucht eine abgeschlossene Lektion des Erklärmodus: Ergebnis, XP, Lerntag und Abzeichen. */
  lektionAbschliessen: (bereichId: string, richtig: number, gesamt: number) => Promise<LektionsEreignis>;
  /** Legt eine Frage an oder speichert Änderungen (gilt danach als „in der App bearbeitet“). */
  frageSpeichern: (frage: Frage) => Promise<void>;
  frageLoeschen: (id: string) => Promise<void>;
  /** Setzt eine mitgelieferte Frage auf die Fassung aus den Projektdateien zurück. */
  originalWiederherstellen: (id: string) => Promise<void>;
  fragenImportieren: (fragen: Frage[]) => Promise<void>;
  sicherungWiederherstellen: (s: Sicherung) => Promise<void>;
  lernstandZuruecksetzen: () => Promise<void>;
  /** Ändert Markierung, Notiz, Fehlermeldung o. Ä. einer Frage. */
  aendereFortschritt: (id: string, aenderung: Partial<Omit<Fortschritt, 'id'>>) => Promise<void>;
  aendereProfil: (aenderung: Partial<Omit<Profil, 'id'>>) => Promise<void>;
  /** Kurzer Hinweis oben im Bild (verschwindet von selbst) */
  zeigeHinweis: (icon: string, text: string) => void;
  hinweise: Hinweis[];
  /** Level, zu dem gerade aufgestiegen wurde (für die kurze Animation) */
  aufstieg: Level | null;
  schliesseAufstieg: () => void;
}

const DatenContext = createContext<Daten | null>(null);

const HINWEIS_DAUER_MS = 2800;

export function DatenProvider({ children }: { children: ReactNode }) {
  const [zustand, setZustand] = useState<Zustand | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweise, setHinweise] = useState<Hinweis[]>([]);
  const [aufstieg, setAufstieg] = useState<Level | null>(null);
  // immer der neueste Zustand, auch in asynchronen Abläufen
  const aktuell = useRef<Zustand | null>(null);
  aktuell.current = zustand;
  const hinweisNr = useRef(0);

  const laden = useCallback(async (db: Db) => {
    const [fragen, fortschritte, profil, simulationen] = await Promise.all([
      alleFragen(db),
      alleFortschritte(db),
      holeProfil(db),
      alleSimulationen(db),
    ]);
    fragen.sort((a, b) => a.id.localeCompare(b.id, 'de', { numeric: true }));
    setZustand({ db, fragen, fortschritte, profil, simulationen });
  }, []);

  useEffect(() => {
    (async () => {
      const db = await oeffneDb();
      await synchronisiereFragen(db, MITGELIEFERTE_FRAGEN);
      await laden(db);
    })().catch((e: unknown) => setFehler(String(e)));
  }, [laden]);

  const zeigeHinweis = useCallback((icon: string, text: string) => {
    const id = ++hinweisNr.current;
    setHinweise((h) => [...h, { id, icon, text }]);
    setTimeout(() => setHinweise((h) => h.filter((x) => x.id !== id)), HINWEIS_DAUER_MS);
  }, []);

  if (fehler) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Datenbank konnte nicht geöffnet werden</h1>
        <p className="mt-2 text-sm">{fehler}</p>
        <p className="mt-2 text-sm">
          {location.protocol === 'file:'
            ? 'Dieser Browser erlaubt geöffneten Dateien keinen Speicher. Öffne die Datei bitte mit Chrome, Edge oder Firefox.'
            : 'Im privaten Modus mancher Browser ist IndexedDB gesperrt.'}
        </p>
      </div>
    );
  }
  if (!zustand) return <div className="p-6 text-center text-slate-500">Lade …</div>;

  const { db } = zustand;

  const antwortSpeichern: Daten['antwortSpeichern'] = async (id, ergebnis, karte) => {
    const jetzt = Date.now();
    const vorher = await holeFortschritt(db, id);
    let fortschritt = naechsterFortschritt(vorher, ergebnis, jetzt);
    if (karte) fortschritt = { ...fortschritt, kartenBewertung: karte };
    await speichereFortschritt(db, fortschritt);

    const stand = aktuell.current!;
    const frage = stand.fragen.find((f) => f.id === id);
    const { profil: nachAntwort, ereignis } = verarbeiteAntwort({
      profil: await holeProfil(db),
      schwierigkeit: frage?.schwierigkeit ?? 1,
      vorher,
      ergebnis,
      jetzt,
    });
    const fortschritte = new Map(stand.fortschritte).set(id, fortschritt);
    const abzeichen = neueAbzeichen(
      baueAbzeichenKontext(stand.fragen, fortschritte, nachAntwort, stand.simulationen),
      nachAntwort.abzeichen,
    );
    const profil = { ...nachAntwort, abzeichen: [...nachAntwort.abzeichen, ...abzeichen.map((a) => a.id)] };
    await speichereProfil(db, profil);
    setZustand((z) => z && { ...z, profil, fortschritte: new Map(z.fortschritte).set(id, fortschritt) });

    if (ereignis.tageszielErreicht) zeigeHinweis('🎯', 'Tagesziel erreicht! +50 XP');
    for (const a of abzeichen) zeigeHinweis(a.icon, `Neues Abzeichen: ${a.titel}`);
    if (ereignis.aufstieg) setAufstieg(ereignis.levelNachher);
    return { fortschritt, ereignis, abzeichen };
  };

  const simulationSpeichern: Daten['simulationSpeichern'] = async (laufend) => {
    const jetzt = Date.now();
    const stand = aktuell.current!;
    const nachId = new Map(stand.fragen.map((f) => [f.id, f]));
    // bei abgelaufener Zeit zählt das Ende des Zeitlimits, auch wenn die App zwischendurch zu war
    const ergebnisOhneId = werteSimulationAus(laufend, nachId, Math.min(jetzt, endeZeitpunkt(laufend)));

    // Lernstand: beantwortete Fragen zählen wie im Lernmodus, unbeantwortete bleiben unverändert
    const fortschritte = new Map(stand.fortschritte);
    for (const d of ergebnisOhneId.details) {
      if (d.antwort === null) continue;
      const f = naechsterFortschritt(await holeFortschritt(db, d.id), d.richtig ? 'richtig' : 'falsch', jetzt);
      await speichereFortschritt(db, f);
      fortschritte.set(d.id, f);
    }
    const ergebnis = { ...ergebnisOhneId, id: await speichereSimulation(db, ergebnisOhneId) };
    const simulationen = [ergebnis, ...stand.simulationen];

    const { profil: nachSimulation, ereignis } = verbucheSimulation({
      profil: await holeProfil(db),
      beantwortet: ergebnis.anzahl - ergebnis.unbeantwortet,
      bestanden: ergebnis.bestanden,
      jetzt,
    });
    const abzeichen = neueAbzeichen(
      baueAbzeichenKontext(stand.fragen, fortschritte, nachSimulation, simulationen),
      nachSimulation.abzeichen,
    );
    const profil = { ...nachSimulation, abzeichen: [...nachSimulation.abzeichen, ...abzeichen.map((a) => a.id)] };
    await speichereProfil(db, profil);
    await loescheLaufendeSimulation(db);
    setZustand((z) => z && { ...z, profil, fortschritte, simulationen });

    if (ereignis.tageszielErreicht) zeigeHinweis('🎯', 'Tagesziel erreicht! +50 XP');
    for (const a of abzeichen) zeigeHinweis(a.icon, `Neues Abzeichen: ${a.titel}`);
    if (ereignis.aufstieg) setAufstieg(ereignis.levelNachher);
    return { ergebnis, ereignis, abzeichen };
  };

  const lektionAbschliessen: Daten['lektionAbschliessen'] = async (bereichId, richtig, gesamt) => {
    const stand = aktuell.current!;
    const { profil: nachLektion, ereignis } = verbucheLektion({ profil: await holeProfil(db), bereichId, richtig, gesamt, jetzt: Date.now() });
    const abzeichen = neueAbzeichen(
      baueAbzeichenKontext(stand.fragen, stand.fortschritte, nachLektion, stand.simulationen),
      nachLektion.abzeichen,
    );
    const profil = { ...nachLektion, abzeichen: [...nachLektion.abzeichen, ...abzeichen.map((a) => a.id)] };
    await speichereProfil(db, profil);
    setZustand((z) => z && { ...z, profil });

    if (ereignis.tageszielErreicht) zeigeHinweis('🎯', 'Tagesziel erreicht! +50 XP');
    for (const a of abzeichen) zeigeHinweis(a.icon, `Neues Abzeichen: ${a.titel}`);
    if (ereignis.aufstieg) setAufstieg(ereignis.levelNachher);
    return ereignis;
  };

  const sortiert = (fragen: GespeicherteFrage[]) =>
    [...fragen].sort((a, b) => a.id.localeCompare(b.id, 'de', { numeric: true }));
  const frageErsetzen = (f: GespeicherteFrage) =>
    setZustand((z) => z && { ...z, fragen: sortiert([...z.fragen.filter((x) => x.id !== f.id), f]) });

  const daten: Daten = {
    ...zustand,
    neuLaden: () => laden(db),
    antwortSpeichern,
    simulationSpeichern,
    lektionAbschliessen,
    frageSpeichern: async (frage) => frageErsetzen(await speichereFrage(db, frage)),
    frageLoeschen: async (id) => {
      await loescheFrage(db, id);
      setZustand((z) => {
        if (!z) return z;
        const fortschritte = new Map(z.fortschritte);
        fortschritte.delete(id);
        return { ...z, fragen: z.fragen.filter((f) => f.id !== id), fortschritte };
      });
    },
    originalWiederherstellen: async (id) => {
      const original = MITGELIEFERTE_FRAGEN.find((f) => f.id === id);
      if (original) frageErsetzen(await stelleOriginalWiederHer(db, original));
    },
    fragenImportieren: async (fragen) => {
      for (const f of fragen) await speichereFrage(db, f);
      await laden(db);
    },
    sicherungWiederherstellen: async (s) => {
      await stelleSicherungWiederHer(db, s, MITGELIEFERTE_FRAGEN);
      await laden(db);
    },
    lernstandZuruecksetzen: async () => {
      await setzeLernstandZurueck(db);
      await laden(db);
    },
    aendereFortschritt: async (id, aenderung) => {
      const f = { ...(await holeFortschritt(db, id)), ...aenderung };
      await speichereFortschritt(db, f);
      setZustand((z) => z && { ...z, fortschritte: new Map(z.fortschritte).set(f.id, f) });
    },
    aendereProfil: async (aenderung) => {
      const p = { ...(await holeProfil(db)), ...aenderung };
      await speichereProfil(db, p);
      setZustand((z) => z && { ...z, profil: p });
    },
    zeigeHinweis,
    hinweise,
    aufstieg,
    schliesseAufstieg: () => setAufstieg(null),
  };

  return <DatenContext.Provider value={daten}>{children}</DatenContext.Provider>;
}

export function useDaten(): Daten {
  const d = useContext(DatenContext);
  if (!d) throw new Error('useDaten außerhalb von DatenProvider');
  return d;
}
