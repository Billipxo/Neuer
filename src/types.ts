// Zentrales Datenmodell des TREI-Trainers.

export const THEMEN = [
  { id: 'recht', titel: 'Recht', kurz: 'EnWG, NAV, Installateurverzeichnis, Verantwortung' },
  { id: 'tab', titel: 'TAB & VDE-AR-N 4100', kurz: 'Netzanschluss, Hauptstromversorgung, Anmeldung, Inbetriebsetzung' },
  { id: 'hausanschluss', titel: 'Hausanschluss & Erdung', kurz: 'DIN 18012, HAK, Fundamenterder, Potentialausgleich' },
  { id: 'zaehlerplatz', titel: 'Zählerplatz & Messung', kurz: 'Zählerschrank, Messkonzepte, mME, Smart-Meter-Gateway' },
  { id: 'schutz', titel: 'Netzsysteme & Schutz', kurz: 'TN/TT, Abschaltbedingungen, RCD, Selektivität, SPD' },
  { id: 'erzeugung', titel: 'Erzeugung & Speicher', kurz: 'PV, Speicher, VDE-AR-N 4105, Marktstammdatenregister' },
  { id: 'verbraucher14a', titel: 'Wallbox, WP & § 14a', kurz: 'Ladeeinrichtungen, Wärmepumpen, steuerbare Verbraucher' },
  { id: 'pruefung', titel: 'Prüfung & Inbetriebnahme', kurz: 'DIN VDE 0100-600, Messungen, Protokoll' },
  { id: 'sicherheit', titel: 'Arbeitssicherheit', kurz: '5 Sicherheitsregeln, Arbeiten unter Spannung, PSA' },
  { id: 'rechnen', titel: 'Rechenaufgaben', kurz: 'Leistung, Strom, Spannungsfall, Querschnitt, Schleifenimpedanz' },
] as const;

export type ThemaId = (typeof THEMEN)[number]['id'];
export const THEMA_IDS: readonly ThemaId[] = THEMEN.map((t) => t.id);

export type FrageTyp = 'einfach' | 'mehrfach' | 'rechnen' | 'karte';
export const FRAGE_TYPEN: readonly FrageTyp[] = ['einfach', 'mehrfach', 'rechnen', 'karte'];

export interface RechenLoesung {
  wert: number;
  einheit: string;
  /** Erlaubte Abweichung: absolut in der Einheit oder relativ in Prozent. */
  toleranz: number;
  toleranzArt: 'abs' | 'rel';
}

/**
 * Eine Frage, wie sie in den JSON-Dateien unter src/data/fragen/ steht.
 * richtig:
 *  - einfach/mehrfach: Indizes der richtigen Antworten (0-basiert)
 *  - rechnen: RechenLoesung
 *  - karte: Musterantwort als Text
 */
export interface Frage {
  id: string;
  thema: ThemaId;
  typ: FrageTyp;
  frage: string;
  antworten: string[];
  richtig: number[] | RechenLoesung | string;
  erklaerung: string;
  quelle: string;
  schwierigkeit: 1 | 2 | 3;
  bild: string | null;
  geprueft: boolean;
  stand: string;
  unterthema?: string;
}

/** Frage in der lokalen Datenbank, mit Herkunft. */
export interface GespeicherteFrage extends Frage {
  herkunft: 'mitgeliefert' | 'eigen';
  /** true, sobald die Frage in der App geändert wurde – wird dann nicht mehr aus den Dateien überschrieben. */
  bearbeitet: boolean;
}

export type LernStatus = 'neu' | 'falsch' | 'einmal' | 'gelernt';
export type KartenBewertung = 'gewusst' | 'teilweise' | 'nicht';

export interface Fortschritt {
  id: string;
  status: LernStatus;
  /** Leitner-Box 0 (neu) bis 5 */
  box: number;
  richtigInFolge: number;
  versuche: number;
  richtigGesamt: number;
  zuletzt: number | null;
  /** Zeitstempel (ms), ab dem die Frage wieder fällig ist */
  faelligAb: number;
  markiert: boolean;
  notiz: string;
  fehlerMeldung: string;
  kartenBewertung: KartenBewertung | null;
}

export interface SimulationsEinstellungen {
  anzahl: number;
  minuten: number;
  bestehensgrenze: number; // Prozent
}

export interface Profil {
  id: 'profil';
  xp: number;
  serieAktuell: number;
  bestSerie: number;
  tagesziel: number;
  /** Datum (YYYY-MM-DD) → Anzahl beantworteter Fragen */
  lernTage: Record<string, number>;
  abzeichen: string[];
  pruefungsDatum: string; // YYYY-MM-DD
  simulation: SimulationsEinstellungen;
  theme: 'system' | 'hell' | 'dunkel';
  /** Fragen pro Lernsitzung */
  sitzungsLaenge: number;
  /** Antwortreihenfolge bei jeder Anzeige mischen */
  antwortenMischen: boolean;
  /** Beim Lernen nur als geprüft markierte Fragen verwenden */
  nurGeprueft: boolean;
}

export interface SimulationErgebnis {
  id?: number;
  datum: number;
  einstellungen: SimulationsEinstellungen;
  dauerSek: number;
  anzahl: number;
  richtig: number;
  prozent: number;
  bestanden: boolean;
  jeThema: Partial<Record<ThemaId, { richtig: number; gesamt: number }>>;
  falscheIds: string[];
}

export const STANDARD_PROFIL: Profil = {
  id: 'profil',
  xp: 0,
  serieAktuell: 0,
  bestSerie: 0,
  tagesziel: 20,
  lernTage: {},
  abzeichen: [],
  pruefungsDatum: '2027-01-30',
  simulation: { anzahl: 30, minuten: 60, bestehensgrenze: 70 },
  theme: 'system',
  sitzungsLaenge: 20,
  antwortenMischen: true,
  nurGeprueft: false,
};

export function neuerFortschritt(id: string): Fortschritt {
  return {
    id,
    status: 'neu',
    box: 0,
    richtigInFolge: 0,
    versuche: 0,
    richtigGesamt: 0,
    zuletzt: null,
    faelligAb: 0,
    markiert: false,
    notiz: '',
    fehlerMeldung: '',
    kartenBewertung: null,
  };
}
