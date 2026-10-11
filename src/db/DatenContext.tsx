import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { MITGELIEFERTE_FRAGEN } from '../data/fragen';
import { naechsterFortschritt, type Ergebnis } from '../logic/leitner';
import type { Fortschritt, GespeicherteFrage, KartenBewertung, Profil } from '../types';
import {
  alleFortschritte,
  alleFragen,
  holeFortschritt,
  holeProfil,
  oeffneDb,
  speichereFortschritt,
  speichereProfil,
  synchronisiereFragen,
  type Db,
} from './db';

interface Zustand {
  db: Db;
  fragen: GespeicherteFrage[];
  fortschritte: Map<string, Fortschritt>;
  profil: Profil;
}

interface Daten extends Zustand {
  /** Lädt Fragen, Fortschritt und Profil neu aus der Datenbank. */
  neuLaden: () => Promise<void>;
  /** Speichert eine Antwort und aktualisiert den Lernstand der Frage. */
  antwortSpeichern: (id: string, ergebnis: Ergebnis, karte?: KartenBewertung) => Promise<Fortschritt>;
  /** Ändert Markierung, Notiz, Fehlermeldung o. Ä. einer Frage. */
  aendereFortschritt: (id: string, aenderung: Partial<Omit<Fortschritt, 'id'>>) => Promise<void>;
  aendereProfil: (aenderung: Partial<Omit<Profil, 'id'>>) => Promise<void>;
}

const DatenContext = createContext<Daten | null>(null);

export function DatenProvider({ children }: { children: ReactNode }) {
  const [zustand, setZustand] = useState<Zustand | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async (db: Db) => {
    const [fragen, fortschritte, profil] = await Promise.all([alleFragen(db), alleFortschritte(db), holeProfil(db)]);
    fragen.sort((a, b) => a.id.localeCompare(b.id, 'de', { numeric: true }));
    setZustand({ db, fragen, fortschritte, profil });
  }, []);

  useEffect(() => {
    (async () => {
      const db = await oeffneDb();
      await synchronisiereFragen(db, MITGELIEFERTE_FRAGEN);
      await laden(db);
    })().catch((e: unknown) => setFehler(String(e)));
  }, [laden]);

  const fortschrittSetzen = useCallback((f: Fortschritt) => {
    setZustand((z) => z && { ...z, fortschritte: new Map(z.fortschritte).set(f.id, f) });
  }, []);

  if (fehler) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Datenbank konnte nicht geöffnet werden</h1>
        <p className="mt-2 text-sm">{fehler}</p>
        <p className="mt-2 text-sm">Im privaten Modus mancher Browser ist IndexedDB gesperrt.</p>
      </div>
    );
  }
  if (!zustand) return <div className="p-6 text-center text-slate-500">Lade …</div>;

  const { db } = zustand;
  const daten: Daten = {
    ...zustand,
    neuLaden: () => laden(db),
    antwortSpeichern: async (id, ergebnis, karte) => {
      let f = naechsterFortschritt(await holeFortschritt(db, id), ergebnis);
      if (karte) f = { ...f, kartenBewertung: karte };
      await speichereFortschritt(db, f);
      fortschrittSetzen(f);
      return f;
    },
    aendereFortschritt: async (id, aenderung) => {
      const f = { ...(await holeFortschritt(db, id)), ...aenderung };
      await speichereFortschritt(db, f);
      fortschrittSetzen(f);
    },
    aendereProfil: async (aenderung) => {
      const p = { ...(await holeProfil(db)), ...aenderung };
      await speichereProfil(db, p);
      setZustand((z) => z && { ...z, profil: p });
    },
  };

  return <DatenContext.Provider value={daten}>{children}</DatenContext.Provider>;
}

export function useDaten(): Daten {
  const d = useContext(DatenContext);
  if (!d) throw new Error('useDaten außerhalb von DatenProvider');
  return d;
}
