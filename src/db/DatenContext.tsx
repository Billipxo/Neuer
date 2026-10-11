import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { MITGELIEFERTE_FRAGEN } from '../data/fragen';
import type { Fortschritt, GespeicherteFrage, Profil } from '../types';
import { alleFortschritte, alleFragen, holeProfil, oeffneDb, synchronisiereFragen, type Db } from './db';

interface Daten {
  db: Db;
  fragen: GespeicherteFrage[];
  fortschritte: Map<string, Fortschritt>;
  profil: Profil;
  /** Lädt Fragen, Fortschritt und Profil neu aus der Datenbank. */
  neuLaden: () => Promise<void>;
}

const DatenContext = createContext<Daten | null>(null);

export function DatenProvider({ children }: { children: ReactNode }) {
  const [daten, setDaten] = useState<Omit<Daten, 'neuLaden'> | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async (db: Db) => {
    const [fragen, fortschritte, profil] = await Promise.all([alleFragen(db), alleFortschritte(db), holeProfil(db)]);
    fragen.sort((a, b) => a.id.localeCompare(b.id, 'de', { numeric: true }));
    setDaten({ db, fragen, fortschritte, profil });
  }, []);

  useEffect(() => {
    (async () => {
      const db = await oeffneDb();
      await synchronisiereFragen(db, MITGELIEFERTE_FRAGEN);
      await laden(db);
    })().catch((e: unknown) => setFehler(String(e)));
  }, [laden]);

  if (fehler) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Datenbank konnte nicht geöffnet werden</h1>
        <p className="mt-2 text-sm">{fehler}</p>
        <p className="mt-2 text-sm">Im privaten Modus mancher Browser ist IndexedDB gesperrt.</p>
      </div>
    );
  }
  if (!daten) return <div className="p-6 text-center text-slate-500">Lade …</div>;

  return (
    <DatenContext.Provider value={{ ...daten, neuLaden: () => laden(daten.db) }}>{children}</DatenContext.Provider>
  );
}

export function useDaten(): Daten {
  const d = useContext(DatenContext);
  if (!d) throw new Error('useDaten außerhalb von DatenProvider');
  return d;
}
