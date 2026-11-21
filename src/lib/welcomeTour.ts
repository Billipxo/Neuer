/**
 * Kurze Einführung nach der Einrichtung: Sie erscheint einmal, direkt nachdem jemand die Einrichtung abgeschlossen hat
 * (auf diesem Gerät). Wer schon eingerichtet ist und sich auf einem neuen Gerät anmeldet, sieht sie nicht automatisch –
 * im Profil lässt sie sich jederzeit wieder öffnen.
 */
const KEY = 'teller-einfuehrung'

/** Merkt sich „gesehen“ auch ohne Speicher (z. B. wenn der Browser-Speicher voll ist) – dann nur bis zum Neuladen */
let seenInSession = false

export function markTourPending() {
  seenInSession = false
  try {
    localStorage.setItem(KEY, 'offen')
  } catch {
    // ohne Speicher keine automatische Einführung – im Profil bleibt sie erreichbar
  }
}

export function tourPending(): boolean {
  if (seenInSession) return false
  try {
    return localStorage.getItem(KEY) === 'offen'
  } catch {
    return false
  }
}

export function markTourSeen() {
  seenInSession = true
  try {
    localStorage.setItem(KEY, 'gesehen')
  } catch {
    // Speicher voll: Entfernen geht trotzdem – auch dann erscheint sie nicht noch einmal von selbst
    try {
      localStorage.removeItem(KEY)
    } catch {
      // nicht schlimm
    }
  }
}

export interface TourSlide {
  emoji: string
  title: string
  text: string
  /** Wo es in der App zu finden ist (Leiste unten) */
  where?: string
}

/** Die Karten der Einführung – kurz, ohne Fachbegriffe, ohne Versprechen */
export const TOUR_SLIDES: readonly TourSlide[] = [
  {
    emoji: '👋',
    title: 'Willkommen bei Teller',
    text: 'Teller hilft dir, dein Essen im Blick zu behalten – schnell, ohne Druck und ohne Werbung. Hier in einer halben Minute, was die App kann.',
  },
  {
    emoji: '🍽️',
    title: 'Essen eintragen',
    text: 'Tippe auf „Mahlzeit“ und such zum Beispiel „Brötchen“: Alltägliches findest du sofort, auch ohne Internet. Mehreres geht auf einmal („2 Brötchen, 1 Kaffee“), dazu Barcode-Scan und eigene Lebensmittel.',
    where: 'Heute',
  },
  {
    emoji: '📖',
    title: 'Kochbuch',
    text: 'Über 700 Rezepte mit Nährwerten und einem Kochmodus mit Timern. Jedes Rezept lässt sich abwandeln, und Vorschläge passen zu den Kalorien, die heute noch offen sind.',
    where: 'Kochbuch',
  },
  {
    emoji: '🗓️',
    title: 'Planen und einkaufen',
    text: '„Woche vorschlagen“ füllt deinen Wochenplan mit passenden Gerichten, die Einkaufsliste entsteht daraus mit einem Tipp. Auf Wunsch plant ihr gemeinsam im Haushalt.',
    where: 'Planer und Einkauf',
  },
  {
    emoji: '📈',
    title: 'Verlauf, Sport und Erfolge',
    text: 'Im Verlauf siehst du Tage, Wochen und Monate – ohne Wertung. Sport und Training kannst du eintragen und einplanen, wenn du magst. Deine Daten exportierst oder löschst du jederzeit im Profil.',
    where: 'Verlauf',
  },
]
