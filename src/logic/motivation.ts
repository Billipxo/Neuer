import type { Fortschritt, Profil } from '../types';
import { tagSchluessel, tagVerschieben } from './datum';
import type { Ergebnis } from './leitner';

// ---------- XP ----------

/** XP je Schwierigkeitsstern bei richtiger Antwort (★ 10, ★★ 20, ★★★ 30) */
export const XP_PRO_STERN = 10;
/** XP, wenn dieselbe Frage heute schon richtig beantwortet wurde */
export const XP_WIEDERHOLUNG_HEUTE = 2;
/** Bonus beim Erreichen des Tagesziels */
export const XP_TAGESZIEL = 50;
export const SERIE_BONUS_SCHRITT = 3;
export const SERIE_BONUS_XP = 5;
export const SERIE_BONUS_MAX = 15;

/** Serienbonus: +5 ab 3 richtigen in Folge, +10 ab 6, höchstens +15 (ab 9) */
export function serienBonus(serie: number): number {
  return Math.min(Math.floor(serie / SERIE_BONUS_SCHRITT) * SERIE_BONUS_XP, SERIE_BONUS_MAX);
}

export interface XpErgebnis {
  basis: number;
  serienBonus: number;
  gesamt: number;
  /** true, wenn wegen Wiederholung am selben Tag nur wenige XP vergeben wurden */
  gedrosselt: boolean;
}

export function xpFuerAntwort(e: {
  schwierigkeit: 1 | 2 | 3;
  ergebnis: Ergebnis;
  /** richtige Antworten in Folge inklusive dieser */
  serie: number;
  heuteSchonRichtig: boolean;
}): XpErgebnis {
  if (e.ergebnis === 'falsch') return { basis: 0, serienBonus: 0, gesamt: 0, gedrosselt: false };
  if (e.heuteSchonRichtig) {
    return { basis: XP_WIEDERHOLUNG_HEUTE, serienBonus: 0, gesamt: XP_WIEDERHOLUNG_HEUTE, gedrosselt: true };
  }
  const voll = XP_PRO_STERN * e.schwierigkeit;
  const basis = e.ergebnis === 'richtig' ? voll : voll / 2; // Karteikarte „teilweise“
  const bonus = e.ergebnis === 'richtig' ? serienBonus(e.serie) : 0;
  return { basis, serienBonus: bonus, gesamt: basis + bonus, gedrosselt: false };
}

// ---------- Level ----------

export interface Level {
  nr: number;
  titel: string;
  icon: string;
  abXp: number;
}

export const LEVELS: readonly Level[] = [
  { nr: 1, titel: 'Azubi', icon: '🔧', abXp: 0 },
  { nr: 2, titel: 'Geselle', icon: '🪛', abXp: 300 },
  { nr: 3, titel: 'Vorarbeiter', icon: '👷', abXp: 1200 },
  { nr: 4, titel: 'Bauleiter', icon: '📋', abXp: 3000 },
  { nr: 5, titel: 'Zählerplatz-Profi', icon: '🔌', abXp: 6000 },
  { nr: 6, titel: 'Netzanschluss-Experte', icon: '⚡', abXp: 10000 },
  { nr: 7, titel: 'Eingetragen ins Installateurverzeichnis', icon: '📜', abXp: 15000 },
];

export function levelFuerXp(xp: number): Level {
  let level = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.abXp) level = l;
  return level;
}

export interface LevelStand {
  level: Level;
  naechstes: Level | null;
  /** XP seit Beginn des aktuellen Levels */
  imLevel: number;
  /** XP bis zum nächsten Level (0 im letzten Level) */
  fehlen: number;
  /** Fortschritt im aktuellen Level, 0–1 (1 im letzten Level) */
  anteil: number;
}

export function levelStand(xp: number): LevelStand {
  const level = levelFuerXp(xp);
  const naechstes = LEVELS.find((l) => l.nr === level.nr + 1) ?? null;
  if (!naechstes) return { level, naechstes, imLevel: xp - level.abXp, fehlen: 0, anteil: 1 };
  const spanne = naechstes.abXp - level.abXp;
  return { level, naechstes, imLevel: xp - level.abXp, fehlen: naechstes.abXp - xp, anteil: (xp - level.abXp) / spanne };
}

// ---------- Antwort verbuchen ----------

export interface AntwortEreignis {
  xp: XpErgebnis;
  /** inkl. Tagesziel-Bonus */
  xpGesamt: number;
  /** richtige Antworten in Folge nach dieser Antwort */
  serie: number;
  /** heute beantwortete Fragen inkl. dieser */
  heute: number;
  /** Tagesziel wurde mit dieser Antwort erreicht */
  tageszielErreicht: boolean;
  levelVorher: Level;
  levelNachher: Level;
  aufstieg: boolean;
}

/** Bucht XP, Antwortserie, Lerntag und Tagesziel für eine Antwort ins Profil. */
export function verarbeiteAntwort(e: {
  profil: Profil;
  schwierigkeit: 1 | 2 | 3;
  /** Lernstand der Frage vor dieser Antwort */
  vorher: Fortschritt;
  ergebnis: Ergebnis;
  jetzt: number;
}): { profil: Profil; ereignis: AntwortEreignis } {
  const { profil, ergebnis, jetzt } = e;
  const heuteKey = tagSchluessel(jetzt);
  const serie = ergebnis === 'richtig' ? profil.serieAktuell + 1 : 0;
  const heuteSchonRichtig =
    e.vorher.zuletzt !== null && tagSchluessel(e.vorher.zuletzt) === heuteKey && e.vorher.richtigInFolge > 0;
  const xp = xpFuerAntwort({ schwierigkeit: e.schwierigkeit, ergebnis, serie, heuteSchonRichtig });
  const tag = bucheLerntag(profil, 1, jetzt);
  const { heute, tageszielErreicht } = tag;
  const xpGesamt = xp.gesamt + (tageszielErreicht ? XP_TAGESZIEL : 0);

  const neu: Profil = {
    ...tag.profil,
    xp: profil.xp + xpGesamt,
    serieAktuell: serie,
    bestSerie: Math.max(profil.bestSerie, serie),
  };
  const levelVorher = levelFuerXp(profil.xp);
  const levelNachher = levelFuerXp(neu.xp);
  return {
    profil: neu,
    ereignis: {
      xp,
      xpGesamt,
      serie,
      heute,
      tageszielErreicht,
      levelVorher,
      levelNachher,
      aufstieg: levelNachher.nr > levelVorher.nr,
    },
  };
}

/** Zählt `anzahl` beantwortete Fragen zum heutigen Lerntag und prüft das Tagesziel. */
export function bucheLerntag(
  profil: Profil,
  anzahl: number,
  jetzt: number,
): { profil: Profil; heute: number; tageszielErreicht: boolean } {
  const heuteKey = tagSchluessel(jetzt);
  const heute = (profil.lernTage[heuteKey] ?? 0) + anzahl;
  const tageszielErreicht = anzahl > 0 && heute >= profil.tagesziel && !profil.zielErreichtTage.includes(heuteKey);
  return {
    heute,
    tageszielErreicht,
    profil: {
      ...profil,
      lernTage: anzahl > 0 ? { ...profil.lernTage, [heuteKey]: heute } : profil.lernTage,
      zielErreichtTage: tageszielErreicht ? [...profil.zielErreichtTage, heuteKey] : profil.zielErreichtTage,
    },
  };
}

// ---------- Prüfungssimulation ----------

export const XP_SIMULATION_ABGESCHLOSSEN = 25;
export const XP_SIMULATION_BESTANDEN = 100;

export interface SimulationsEreignis {
  xpAbgeschlossen: number;
  xpBestanden: number;
  xpTagesziel: number;
  xpGesamt: number;
  tageszielErreicht: boolean;
  levelVorher: Level;
  levelNachher: Level;
  aufstieg: boolean;
}

/**
 * Bucht eine abgeschlossene Simulation: XP gibt es für die Simulation als Ganzes
 * (+25 abgeschlossen, +100 bestanden), nicht je Antwort. Beantwortete Fragen zählen zum Tagesziel.
 */
export function verbucheSimulation(e: {
  profil: Profil;
  beantwortet: number;
  bestanden: boolean;
  jetzt: number;
}): { profil: Profil; ereignis: SimulationsEreignis } {
  const tag = bucheLerntag(e.profil, e.beantwortet, e.jetzt);
  const xpAbgeschlossen = XP_SIMULATION_ABGESCHLOSSEN;
  const xpBestanden = e.bestanden ? XP_SIMULATION_BESTANDEN : 0;
  const xpTagesziel = tag.tageszielErreicht ? XP_TAGESZIEL : 0;
  const xpGesamt = xpAbgeschlossen + xpBestanden + xpTagesziel;
  const profil = { ...tag.profil, xp: e.profil.xp + xpGesamt };
  const levelVorher = levelFuerXp(e.profil.xp);
  const levelNachher = levelFuerXp(profil.xp);
  return {
    profil,
    ereignis: {
      xpAbgeschlossen,
      xpBestanden,
      xpTagesziel,
      xpGesamt,
      tageszielErreicht: tag.tageszielErreicht,
      levelVorher,
      levelNachher,
      aufstieg: levelNachher.nr > levelVorher.nr,
    },
  };
}

// ---------- Lernserie (Tage) ----------

/**
 * Aktuelle Lernserie in Tagen: aufeinanderfolgende Tage mit mindestens einer beantworteten Frage.
 * Ist heute noch nichts gelernt, zählt die Serie bis gestern (sie reißt erst, wenn der Tag vorbei ist).
 */
export function lernserie(lernTage: Record<string, number>, jetzt: number): { tage: number; heuteGelernt: boolean } {
  const heute = tagSchluessel(jetzt);
  const heuteGelernt = (lernTage[heute] ?? 0) > 0;
  let tag = heuteGelernt ? heute : tagVerschieben(heute, -1);
  let tage = 0;
  while ((lernTage[tag] ?? 0) > 0) {
    tage++;
    tag = tagVerschieben(tag, -1);
  }
  return { tage, heuteGelernt };
}

export function laengsteSerie(lernTage: Record<string, number>): number {
  const tage = Object.keys(lernTage)
    .filter((k) => lernTage[k] > 0)
    .sort();
  let beste = 0;
  let lauf = 0;
  let vorher: string | null = null;
  for (const t of tage) {
    lauf = vorher !== null && tagVerschieben(vorher, 1) === t ? lauf + 1 : 1;
    beste = Math.max(beste, lauf);
    vorher = t;
  }
  return beste;
}

export function heuteBeantwortet(profil: Profil, jetzt: number): number {
  return profil.lernTage[tagSchluessel(jetzt)] ?? 0;
}

// ---------- Lernkalender ----------

/** Farbstufe eines Kalendertags: 0 nichts, 1 etwas, 2 mindestens halbes Tagesziel, 3 Tagesziel erreicht */
export function kalenderStufe(anzahl: number, tagesziel: number): 0 | 1 | 2 | 3 {
  if (anzahl <= 0) return 0;
  if (anzahl >= tagesziel) return 3;
  if (anzahl >= tagesziel / 2) return 2;
  return 1;
}

export interface KalenderTag {
  schluessel: string;
  zukunft: boolean;
}

/** Die letzten `wochen` Kalenderwochen (Mo–So) bis einschließlich der aktuellen Woche. */
export function kalenderWochen(jetzt: number, wochen = 5): KalenderTag[][] {
  const heute = tagSchluessel(jetzt);
  const wochentag = (new Date(jetzt).getDay() + 6) % 7; // Mo = 0 … So = 6
  const start = tagVerschieben(heute, -wochentag - 7 * (wochen - 1));
  return Array.from({ length: wochen }, (_, w) =>
    Array.from({ length: 7 }, (_, t) => {
      const schluessel = tagVerschieben(start, w * 7 + t);
      return { schluessel, zukunft: schluessel > heute };
    }),
  );
}
