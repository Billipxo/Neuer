/**
 * Gemerkte Wahl bei „Mehreres auf einmal“: Hat man „Käse“ einmal auf Gouda getauscht, nimmt die App beim nächsten
 * „Käse“ gleich Gouda. Liegt nur auf diesem Gerät (localStorage) und wird beim Abmelden gelöscht.
 */
export const MEAL_MEMORY_KEY = 'teller-erkennung'
/** Höchstens so viele Zuordnungen – die ältesten fallen zuerst weg */
const MAX = 300

export function loadMealMemory(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MEAL_MEMORY_KEY)
    const value: unknown = raw ? JSON.parse(raw) : {}
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string'))
  } catch {
    return {}
  }
}

/** Zuordnungen ergänzen; Neues kommt ans Ende, damit beim Kürzen das Älteste wegfällt */
export function rememberChoices(current: Readonly<Record<string, string>>, learned: Readonly<Record<string, string>>): Record<string, string> {
  const next: Record<string, string> = { ...current }
  for (const [key, name] of Object.entries(learned)) {
    delete next[key]
    next[key] = name
  }
  const entries = Object.entries(next)
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - MAX)))
}

export function saveMealMemory(map: Readonly<Record<string, string>>) {
  try {
    localStorage.setItem(MEAL_MEMORY_KEY, JSON.stringify(map))
  } catch {
    // Ohne Speicher gilt die Wahl nur, solange die Seite offen ist
  }
}
