import type { RecipeIngredient } from '../types'
import { ingredientInfo } from './recipeNutrition'

export { fmtCountdown } from './countdown'

export interface StepTimer {
  /** Anzeige, z. B. „8–10 Min.“ */
  label: string
  /** Dauer in Sekunden (bei Spannen der untere Wert – dann lieber einmal mehr nachsehen) */
  seconds: number
}

const UNIT_SECONDS: [RegExp, number, string][] = [
  [/^(sekunden?|sek\.?)$/i, 1, 'Sek.'],
  [/^(minuten?|min\.?)$/i, 60, 'Min.'],
  [/^(stunden?|std\.?)$/i, 3600, 'Std.'],
]

const TIME_RE = /(?:(alle)\s+)?(\d+(?:,\d+)?)(?:\s*[–-]\s*(\d+(?:,\d+)?))?\s*(Sekunden|Sekunde|Sek\.?|Minuten|Minute|Min\.?|Stunden|Stunde|Std\.?)(?![a-zäöü])/gi

const num = (s: string) => Number(s.replace(',', '.'))

/**
 * Zeitangaben in einem Zubereitungsschritt erkennen („10 Minuten“, „8–10 Min.“, „2 Stunden“).
 * Wiederholungen wie „alle 5 Minuten“ werden ignoriert, gleiche Dauern nur einmal geliefert.
 */
export function parseTimers(text: string): StepTimer[] {
  const out: StepTimer[] = []
  for (const m of text.matchAll(TIME_RE)) {
    const [, every, a, b, unitWord] = m
    if (every) continue
    const unit = UNIT_SECONDS.find(([re]) => re.test(unitWord))
    if (!unit) continue
    const [, factor, short] = unit
    const lo = num(a)
    const seconds = Math.round(lo * factor)
    if (seconds <= 0 || seconds > 24 * 3600) continue
    const label = b ? `${a}–${b} ${short}` : `${a} ${short}`
    if (!out.some((t) => t.seconds === seconds)) out.push({ label, seconds })
  }
  return out
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Füllwörter und Eigenschaften, die allein nichts über die Zutat sagen */
const STOP_WORDS = new Set(
  'und oder mit tk in der die das schale rote rot grune weisse frisch frische getrocknet gerauchert natur naturell leicht light mager gemahlen gross klein ungesusst entsteint vorgegart abgetropft geschalt ungesalzen geroestet gerostet passierte griechischer'.split(' '),
)

/** Wortenden zusammengesetzter Zutaten, die in Schritten oft allein vorkommen („Gemüsebrühe“ → „Brühe“) */
const SUFFIXES = ['bruhe', 'mehl', 'saft', 'kase', 'quark', 'joghurt', 'milch', 'nudeln', 'reis', 'kohl', 'salat', 'filet', 'hack', 'fleisch', 'brot', 'schnitzel', 'linsen', 'bohnen', 'erbsen', 'ol', 'sauce', 'tomaten', 'zwiebel']

const stem = (w: string) => (w.length >= 6 ? w.replace(/(en|n|e|s)$/, '') : w)

/** Suchbegriffe für eine Zutat: Name ohne Klammern/Prozent, Oberbegriff, Wortenden – grob auf den Wortstamm gekürzt */
export function ingredientKeywords(name: string): string[] {
  const base = ingredientInfo(name)?.base ?? name
  const words = [name, base]
    .flatMap((s) => s.replace(/\(.*?\)/g, ' ').replace(/[\d,.%]+/g, ' ').split(/[\s-]+/))
    .map((w) => normalize(w.trim()))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
  const keys = new Set<string>()
  for (const w of words) {
    keys.add(stem(w))
    for (const suffix of SUFFIXES) if (w !== suffix && w.endsWith(suffix)) keys.add(stem(suffix))
    if (w === 'eier') keys.add('ei')
  }
  return [...keys]
}

/** Welche Zutaten werden in diesem Schritt erwähnt? Liefert die Indizes in der Zutatenliste. */
export function ingredientsInStep(step: string, ingredients: RecipeIngredient[]): number[] {
  const text = normalize(step)
  const hits: number[] = []
  ingredients.forEach((ing, idx) => {
    const found = ingredientKeywords(ing.name).some((k) =>
      k.length <= 3 ? new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(text) : text.includes(k),
    )
    if (found) hits.push(idx)
  })
  return hits
}
