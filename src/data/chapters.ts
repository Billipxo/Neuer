/** Kapitel des Kochbuchs – jedes Rezept gehört zu genau einem Kapitel */

export type ChapterId =
  | 'fruehstueck'
  | 'suppen'
  | 'salate'
  | 'pasta'
  | 'kartoffeln-getreide'
  | 'fleisch'
  | 'fisch'
  | 'vegetarisch'
  | 'ofen'
  | 'snacks'
  | 'suesses'
  | 'grundrezepte'
  | 'getraenke'

export interface Chapter {
  id: ChapterId
  title: string
  emoji: string
  intro: string
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'fruehstueck',
    title: 'Frühstück & Brotzeit',
    emoji: '🥣',
    intro: 'Porridge, Overnight Oats, Eiergerichte, belegte Brote und Pancakes – vom schnellen Wochentags-Frühstück bis zum Sonntags-Brunch.',
  },
  {
    id: 'suppen',
    title: 'Suppen & Eintöpfe',
    emoji: '🍲',
    intro: 'Wärmende Suppen, deftige Eintöpfe und Chilis. Fast alle lassen sich gut vorkochen und einfrieren.',
  },
  {
    id: 'salate',
    title: 'Salate & Bowls',
    emoji: '🥗',
    intro: 'Sättigende Salate und bunte Bowls – ideal für die Mittagspause, viele davon zum Mitnehmen.',
  },
  {
    id: 'pasta',
    title: 'Pasta & Nudeln',
    emoji: '🍝',
    intro: 'Vom schnellen Feierabend-Teller bis zur Lasagne: Nudelgerichte mit viel Gemüse und leichten Saucen.',
  },
  {
    id: 'kartoffeln-getreide',
    title: 'Kartoffeln, Reis & Getreide',
    emoji: '🥔',
    intro: 'Bratkartoffeln, Ofenkartoffeln, Risotto, Bulgur und Co. – Gerichte, bei denen die Sättigungsbeilage die Hauptrolle spielt.',
  },
  {
    id: 'fleisch',
    title: 'Fleisch & Geflügel',
    emoji: '🍗',
    intro: 'Mageres Fleisch, Hähnchen und Pute – von deutschen Klassikern bis zu internationalen Pfannengerichten.',
  },
  {
    id: 'fisch',
    title: 'Fisch & Meeresfrüchte',
    emoji: '🐟',
    intro: 'Lachs, Seelachs, Kabeljau und Garnelen – schnell gegart, aus Pfanne, Ofen oder Heißluftfritteuse.',
  },
  {
    id: 'vegetarisch',
    title: 'Vegetarisch & vegan',
    emoji: '🥦',
    intro: 'Hauptgerichte ohne Fleisch und Fisch: Currys, Pfannen, Bratlinge, Tofu und Hülsenfrüchte.',
  },
  {
    id: 'ofen',
    title: 'Aus dem Ofen & Aufläufe',
    emoji: '🔥',
    intro: 'Blechgerichte, Aufläufe, Gratins und Gefülltes – der Ofen (oder die Heißluftfritteuse) erledigt die Arbeit.',
  },
  {
    id: 'snacks',
    title: 'Snacks & Fingerfood',
    emoji: '🥕',
    intro: 'Herzhafte Kleinigkeiten für zwischendurch, fürs Büro oder den Filmabend.',
  },
  {
    id: 'suesses',
    title: 'Süßes & Backen',
    emoji: '🍰',
    intro: 'Desserts, Kuchen und Gebäck – mit weniger Zucker, viel Obst und Vollkorn.',
  },
  {
    id: 'grundrezepte',
    title: 'Grundrezepte, Saucen & Dips',
    emoji: '🫙',
    intro: 'Dressings, Saucen, Dips, Teige und Gewürzmischungen – die Bausteine, aus denen viele Gerichte entstehen.',
  },
  {
    id: 'getraenke',
    title: 'Smoothies & Getränke',
    emoji: '🥤',
    intro: 'Smoothies, Shakes, Eistee und warme Getränke – frisch gemixt und ohne viel Zucker.',
  },
]

export function getChapter(id: string | null | undefined): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id)
}
