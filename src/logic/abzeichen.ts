import { THEMEN, type Fortschritt, type Frage, type Profil, type SimulationErgebnis, type ThemaId } from '../types';
import { laengsteSerie } from './motivation';
import { statusVerteilung, type Verteilung } from './sitzung';

export interface AbzeichenKontext {
  themen: { id: ThemaId; v: Verteilung }[];
  gesamt: Verteilung;
  karten: Verteilung;
  /** längste Lernserie in Tagen */
  lernserie: number;
  /** beste Serie richtiger Antworten */
  antwortSerie: number;
  /** Anzahl Tage mit erreichtem Tagesziel */
  zielTage: number;
  simulationenBestanden: number;
}

export interface Abzeichen {
  id: string;
  titel: string;
  text: string;
  icon: string;
  gruppe: 'thema' | 'fleiss' | 'meister';
  erreicht: (k: AbzeichenKontext) => boolean;
}

/** Ein Thema braucht mindestens so viele Fragen, damit es ein Abzeichen gibt. */
export const MIN_FRAGEN_THEMA = 5;

const STUFEN = [
  { id: 'bronze', name: 'Bronze', icon: '🥉', ab: 0.5 },
  { id: 'silber', name: 'Silber', icon: '🥈', ab: 0.75 },
  { id: 'gold', name: 'Gold', icon: '🥇', ab: 0.9 },
] as const;

const anteilGelernt = (v: Verteilung) => (v.gesamt ? v.gelernt / v.gesamt : 0);

const THEMA_ABZEICHEN: Abzeichen[] = THEMEN.flatMap((t) =>
  STUFEN.map(
    (s): Abzeichen => ({
      id: `thema-${t.id}-${s.id}`,
      titel: `${t.titel} – ${s.name}`,
      text: `${Math.round(s.ab * 100)} % der Fragen in „${t.titel}“ gelernt`,
      icon: s.icon,
      gruppe: 'thema',
      erreicht: (k) => {
        const v = k.themen.find((x) => x.id === t.id)?.v;
        return !!v && v.gesamt >= MIN_FRAGEN_THEMA && anteilGelernt(v) >= s.ab;
      },
    }),
  ),
);

const WEITERE: Abzeichen[] = [
  { id: 'serie-3', titel: 'Drangeblieben', text: '3 Tage am Stück gelernt', icon: '🔥', gruppe: 'fleiss', erreicht: (k) => k.lernserie >= 3 },
  { id: 'serie-7', titel: 'Eine Woche dran', text: '7 Tage am Stück gelernt', icon: '🔥', gruppe: 'fleiss', erreicht: (k) => k.lernserie >= 7 },
  { id: 'serie-14', titel: 'Zwei Wochen dran', text: '14 Tage am Stück gelernt', icon: '🔥', gruppe: 'fleiss', erreicht: (k) => k.lernserie >= 14 },
  { id: 'serie-30', titel: 'Ein Monat dran', text: '30 Tage am Stück gelernt', icon: '🔥', gruppe: 'fleiss', erreicht: (k) => k.lernserie >= 30 },
  { id: 'ziel-1', titel: 'Tagesziel geschafft', text: 'Zum ersten Mal das Tagesziel erreicht', icon: '🎯', gruppe: 'fleiss', erreicht: (k) => k.zielTage >= 1 },
  { id: 'ziel-10', titel: 'Zielsicher', text: '10-mal das Tagesziel erreicht', icon: '🎯', gruppe: 'fleiss', erreicht: (k) => k.zielTage >= 10 },
  { id: 'antworten-10', titel: 'Läuft', text: '10 richtige Antworten in Folge', icon: '⚡', gruppe: 'fleiss', erreicht: (k) => k.antwortSerie >= 10 },
  { id: 'antworten-25', titel: 'Kurzschlussfest', text: '25 richtige Antworten in Folge', icon: '⚡', gruppe: 'fleiss', erreicht: (k) => k.antwortSerie >= 25 },
  {
    id: 'fachgespraech',
    titel: 'Fachgespräch-fit',
    text: '90 % der Karteikarten gelernt',
    icon: '🗣️',
    gruppe: 'meister',
    erreicht: (k) => k.karten.gesamt >= MIN_FRAGEN_THEMA && anteilGelernt(k.karten) >= 0.9,
  },
  {
    id: 'halbzeit',
    titel: 'Halbzeit',
    text: 'Die Hälfte aller Fragen gelernt',
    icon: '🌓',
    gruppe: 'meister',
    erreicht: (k) => k.gesamt.gesamt >= 20 && anteilGelernt(k.gesamt) >= 0.5,
  },
  {
    id: 'alles',
    titel: 'Alles im Kasten',
    text: 'Alle Fragen gelernt',
    icon: '🏆',
    gruppe: 'meister',
    erreicht: (k) => k.gesamt.gesamt >= 20 && k.gesamt.gelernt === k.gesamt.gesamt,
  },
  { id: 'simulation-1', titel: 'Probe bestanden', text: 'Erste Prüfungssimulation bestanden', icon: '📝', gruppe: 'meister', erreicht: (k) => k.simulationenBestanden >= 1 },
  { id: 'simulation-5', titel: 'Prüfungsroutine', text: '5 Prüfungssimulationen bestanden', icon: '📝', gruppe: 'meister', erreicht: (k) => k.simulationenBestanden >= 5 },
];

export const ALLE_ABZEICHEN: readonly Abzeichen[] = [...THEMA_ABZEICHEN, ...WEITERE];

export function abzeichenNachId(id: string): Abzeichen | undefined {
  return ALLE_ABZEICHEN.find((a) => a.id === id);
}

export function baueAbzeichenKontext(
  fragen: readonly Frage[],
  fortschritte: ReadonlyMap<string, Fortschritt>,
  profil: Profil,
  simulationen: readonly SimulationErgebnis[],
): AbzeichenKontext {
  return {
    themen: THEMEN.map((t) => ({
      id: t.id,
      v: statusVerteilung(
        fragen.filter((f) => f.thema === t.id),
        fortschritte,
      ),
    })),
    gesamt: statusVerteilung(fragen, fortschritte),
    karten: statusVerteilung(
      fragen.filter((f) => f.typ === 'karte'),
      fortschritte,
    ),
    lernserie: laengsteSerie(profil.lernTage),
    antwortSerie: profil.bestSerie,
    zielTage: profil.zielErreichtTage.length,
    simulationenBestanden: simulationen.filter((s) => s.bestanden).length,
  };
}

/** Neu erreichte Abzeichen (einmal verdient, bleiben sie erhalten). */
export function neueAbzeichen(k: AbzeichenKontext, vorhanden: readonly string[]): Abzeichen[] {
  return ALLE_ABZEICHEN.filter((a) => !vorhanden.includes(a.id) && a.erreicht(k));
}
