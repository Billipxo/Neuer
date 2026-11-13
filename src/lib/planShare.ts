import type { MealType, PlanItem, Recipe } from '../types'
import { MEAL_TYPES } from '../types'
import { MEAL_LABELS } from './meals'
import { fmtDayLong, shiftISO, weekStartISO } from './dates'
import { fmt1 } from './format'
import { recipePlanItem, type NewPlanItem } from './planner'

/** Wochenplan als gut lesbarer Text – zum Verschicken per Messenger oder E-Mail */
export function weekPlanText(items: PlanItem[], days: string[]): string {
  const lines = ['🍽️ Wochenplan']
  for (const day of days) {
    const dayItems = items
      .filter((i) => i.date === day)
      .sort((a, b) => MEAL_TYPES.indexOf(a.meal) - MEAL_TYPES.indexOf(b.meal))
    if (!dayItems.length) continue
    lines.push('', `${fmtDayLong(day)}:`)
    for (const i of dayItems) {
      const servings = Number(i.servings)
      const amount = servings !== 1 ? ` (${fmt1(servings)} Portionen)` : ''
      lines.push(`• ${MEAL_LABELS[i.meal]}: ${i.title}${amount}`)
    }
  }
  return lines.join('\n')
}

// --- Plan als Link: Wer die App nutzt, übernimmt ihn mit einem Tipp in den eigenen Plan -----------------------

export interface SharedPlanItem {
  /** Wochentag: 0 (Montag) bis 6 (Sonntag) */
  day: number
  meal: MealType
  servings: number
  /** Rezept aus dem Kochbuch – Titel und Nährwerte kommen beim Übernehmen aus dem Kochbuch */
  recipeId?: string
  /** Alles andere (eigene Rezepte, Gerichte, Freitext) reist als Titel mit Nährwerten für die angegebenen Portionen */
  title?: string
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface SharedPlan {
  /** Montag der Woche, aus der der Plan stammt */
  weekStart: string
  items: SharedPlanItem[]
}

const MAX_ITEMS = 80
const MAX_TITLE = 120

function toBase64Url(text: string): string {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Plan einer Woche kompakt verpacken (für die Adresszeile). Rezepte aus dem Kochbuch reisen nur mit ihrer Kennung,
 * alles andere mit Titel und Nährwerten – eigene Rezepte und Gerichte kennt das andere Konto ja nicht.
 */
export function encodePlan(items: PlanItem[], days: string[], isCookbookRecipe: (id: string) => boolean): string {
  const rows: (string | number)[][] = []
  for (const i of items) {
    const day = days.indexOf(i.date)
    if (day < 0 || rows.length >= MAX_ITEMS) continue
    const head = [day, MEAL_TYPES.indexOf(i.meal), round2(Number(i.servings))]
    if (i.kind === 'recipe' && i.recipe_id && isCookbookRecipe(i.recipe_id)) rows.push([...head, i.recipe_id])
    else rows.push([...head, i.title.slice(0, MAX_TITLE), Math.round(i.kcal), Math.round(i.protein), Math.round(i.carbs), Math.round(i.fat)])
  }
  return toBase64Url(JSON.stringify({ v: 1, w: days[0], i: rows }))
}

const isCount = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max

/** Link-Inhalt lesen und prüfen. Liefert null, wenn es kein gültiger Plan ist. */
export function decodePlan(token: string): SharedPlan | null {
  let data: unknown
  try {
    data = JSON.parse(fromBase64Url(token))
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { v, w, i } = data as { v?: unknown; w?: unknown; i?: unknown }
  if (v !== 1 || typeof w !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(w) || !Array.isArray(i) || i.length > MAX_ITEMS) return null
  const items: SharedPlanItem[] = []
  for (const row of i) {
    if (!Array.isArray(row)) return null
    const [day, meal, servings, ref, kcal, protein, carbs, fat] = row as unknown[]
    if (!Number.isInteger(day) || !isCount(day, 6) || !Number.isInteger(meal) || !isCount(meal, MEAL_TYPES.length - 1)) return null
    if (!isCount(servings, 50) || servings <= 0 || typeof ref !== 'string' || !ref || ref.length > MAX_TITLE) return null
    const base = { day, meal: MEAL_TYPES[meal], servings }
    if (row.length === 4) {
      items.push({ ...base, recipeId: ref })
    } else {
      if (!isCount(kcal, 20000) || !isCount(protein, 2000) || !isCount(carbs, 4000) || !isCount(fat, 2000)) return null
      items.push({ ...base, title: ref, kcal, protein, carbs, fat })
    }
  }
  return { weekStart: weekStartISO(w), items }
}

export function planLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/planer?plan=${token}`
}

/** In welche Woche ein geteilter Plan eingefügt wird: in seine eigene – liegt die schon zurück, in die laufende */
export function targetWeek(plan: SharedPlan, today: string): string {
  const current = weekStartISO(today)
  return plan.weekStart >= current ? plan.weekStart : current
}

/** Geteilten Plan in Plan-Einträge für die Zielwoche umsetzen; unbekannte Rezepte werden ausgelassen */
export function planItemsFromShared(
  plan: SharedPlan,
  weekStart: string,
  getRecipe: (id: string) => Recipe | undefined,
): { items: NewPlanItem[]; skipped: number } {
  const items: NewPlanItem[] = []
  let skipped = 0
  for (const s of plan.items) {
    const date = shiftISO(weekStart, s.day)
    if (s.recipeId) {
      const recipe = getRecipe(s.recipeId)
      if (recipe) items.push(recipePlanItem(recipe, date, s.meal, s.servings))
      else skipped++
    } else {
      items.push({
        date,
        meal: s.meal,
        kind: 'text',
        recipe_id: null,
        dish_id: null,
        title: s.title ?? '',
        servings: s.servings,
        kcal: s.kcal ?? 0,
        protein: s.protein ?? 0,
        carbs: s.carbs ?? 0,
        fat: s.fat ?? 0,
      })
    }
  }
  return { items, skipped }
}

/** Text zum Verschicken: lesbarer Plan plus Link zum Übernehmen in der App */
export function weekPlanShareText(items: PlanItem[], days: string[], link: string): string {
  return `${weekPlanText(items, days)}\n\nIn Teller übernehmen:\n${link}`
}
