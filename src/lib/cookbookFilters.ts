import type { MealType } from '../types'
import { MEAL_TYPES } from '../types'
import {
  FEW_INGREDIENTS_MAX,
  KCAL_LABELS,
  MEAT_LABELS,
  SORT_LABELS,
  TAG_LABELS,
  TIME_OPTIONS,
  type KcalFilter,
  type MeatFilter,
  type RecipeFilter,
  type RecipeSort,
} from './recipes'

/** Alles, was im Kochbuch gefiltert und sortiert werden kann – bleibt beim Zurückkehren erhalten */
export interface CookbookFilters {
  keyword: string
  meal: MealType | null
  /** Fertig in höchstens so vielen Minuten (inklusive Warte-, Quell- und Kühlzeit) */
  time: number | null
  meat: MeatFilter | null
  kcal: KcalFilter | null
  /** Nur Rezepte mit wenigen Zutaten */
  few: boolean
  /** Eigenschaften, die alle zutreffen müssen */
  tags: string[]
  onlyFav: boolean
  onlyAirfryer: boolean
  onlyMine: boolean
  sort: RecipeSort
}

export const NO_FILTERS: CookbookFilters = {
  keyword: '',
  meal: null,
  time: null,
  meat: null,
  kcal: null,
  few: false,
  tags: [],
  onlyFav: false,
  onlyAirfryer: false,
  onlyMine: false,
  sort: 'empfohlen',
}

/** Was „Filtern & sortieren“ zurücksetzt – Suche und Schnellfilter bleiben */
export const NO_SHEET_FILTERS: Partial<CookbookFilters> = { time: null, meat: null, kcal: null, few: false, tags: [], sort: 'empfohlen' }

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

/** Gespeicherten Stand lesen – Unbekanntes oder Kaputtes fällt auf „kein Filter“ zurück */
export function parseFilters(raw: string | null): CookbookFilters {
  if (!raw) return NO_FILTERS
  try {
    return toFilters(JSON.parse(raw))
  } catch {
    return NO_FILTERS
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function toFilters(data: unknown): CookbookFilters {
  if (!isRecord(data)) return NO_FILTERS
  const d = data as Record<string, unknown>
  return {
    keyword: typeof d.keyword === 'string' ? d.keyword.slice(0, 100) : '',
    meal: oneOf(d.meal, MEAL_TYPES),
    time: typeof d.time === 'number' && (TIME_OPTIONS as readonly number[]).includes(d.time) ? d.time : null,
    meat: oneOf(d.meat, Object.keys(MEAT_LABELS) as MeatFilter[]),
    kcal: oneOf(d.kcal, Object.keys(KCAL_LABELS) as KcalFilter[]),
    few: d.few === true,
    tags: Array.isArray(d.tags) ? [...new Set(d.tags.filter((t): t is string => typeof t === 'string' && t in TAG_LABELS))] : [],
    onlyFav: d.onlyFav === true,
    onlyAirfryer: d.onlyAirfryer === true,
    onlyMine: d.onlyMine === true,
    sort: oneOf(d.sort, Object.keys(SORT_LABELS) as RecipeSort[]) ?? 'empfohlen',
  }
}

/** In die Filter der Rezeptsuche übersetzen */
export function toRecipeFilter(f: CookbookFilters, chapter: string | null = null): RecipeFilter {
  return {
    chapter,
    meal: f.meal,
    keyword: f.keyword,
    maxTotalTime: f.time,
    meat: f.meat,
    kcal: f.kcal,
    maxIngredients: f.few ? FEW_INGREDIENTS_MAX : null,
    tags: f.tags,
  }
}

/** Gesetzte Einstellungen in „Filtern & sortieren“ – für die Zahl am Knopf */
export function sheetFilterCount(f: CookbookFilters): number {
  return [f.time, f.meat, f.kcal, f.few || null, f.sort !== 'empfohlen' || null].filter(Boolean).length + f.tags.length
}

/** Alle gesetzten Filter (ohne Sortierung) – dann zeigt das Kochbuch „N Treffer“ statt der Startseite */
export function activeFilterCount(f: CookbookFilters): number {
  return (
    [f.keyword.trim() || null, f.meal, f.time, f.meat, f.kcal, f.few || null, f.onlyFav || null, f.onlyAirfryer || null, f.onlyMine || null].filter(Boolean)
      .length + f.tags.length
  )
}

export interface ActiveChip {
  key: string
  label: string
  /** Änderung, die diesen Filter wieder entfernt */
  clear: Partial<CookbookFilters>
}

/** Einstellungen aus „Filtern & sortieren“ als Kurz-Chips, die sich einzeln entfernen lassen */
export function activeChips(f: CookbookFilters): ActiveChip[] {
  const out: ActiveChip[] = []
  if (f.time) out.push({ key: 'time', label: `Fertig in ${f.time} Min.`, clear: { time: null } })
  if (f.meat) out.push({ key: 'meat', label: MEAT_LABELS[f.meat], clear: { meat: null } })
  if (f.kcal) out.push({ key: 'kcal', label: KCAL_LABELS[f.kcal], clear: { kcal: null } })
  if (f.few) out.push({ key: 'few', label: `Bis ${FEW_INGREDIENTS_MAX} Zutaten`, clear: { few: false } })
  for (const t of f.tags) out.push({ key: `tag:${t}`, label: TAG_LABELS[t] ?? t, clear: { tags: f.tags.filter((x) => x !== t) } })
  if (f.sort !== 'empfohlen') out.push({ key: 'sort', label: SORT_LABELS[f.sort], clear: { sort: 'empfohlen' } })
  return out
}

/** Eigenschaft hinzunehmen oder wieder entfernen */
export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
}

// --- Merken je Eintrag im Verlauf ------------------------------------------------------------------------------
// „Zurück“ (etwa aus einem Rezept) stellt die Auswahl wieder her; ein neuer Aufruf des Kochbuchs – zum Beispiel über die
// Navigation – beginnt ohne Filter. Gemerkt wird je Eintrag im Verlauf (Schlüssel aus dem Router), höchstens die letzten.

const KEEP_ENTRIES = 20

/** Auswahl für einen Eintrag im Verlauf lesen */
export function readEntry(raw: string | null, entry: string): CookbookFilters {
  try {
    const all: unknown = raw ? JSON.parse(raw) : null
    return isRecord(all) && entry in all ? toFilters(all[entry]) : NO_FILTERS
  } catch {
    return NO_FILTERS
  }
}

/** Auswahl für einen Eintrag im Verlauf schreiben – liefert den neuen gespeicherten Text */
export function writeEntry(raw: string | null, entry: string, filters: CookbookFilters, keep = KEEP_ENTRIES): string {
  let all: Record<string, unknown> = {}
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (isRecord(parsed)) all = parsed
  } catch {
    /* kaputter Stand wird ersetzt */
  }
  // zuletzt geschrieben = zuletzt in der Reihenfolge
  const { [entry]: _old, ...rest } = all
  const next: Record<string, unknown> = { ...rest, [entry]: filters }
  const keys = Object.keys(next)
  for (const k of keys.slice(0, Math.max(0, keys.length - keep))) delete next[k]
  return JSON.stringify(next)
}
