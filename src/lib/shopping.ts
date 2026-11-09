import type { ShoppingCategory, ShoppingItem } from '../types'
import { fmt1, parseDecimal } from './format'

export const CATEGORY_ORDER: ShoppingCategory[] = ['obst_gemuese', 'milch', 'fleisch_fisch', 'vorrat', 'sonstiges']

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  obst_gemuese: 'Obst & Gemüse',
  milch: 'Milchprodukte',
  fleisch_fisch: 'Fleisch & Fisch',
  vorrat: 'Vorrat',
  sonstiges: 'Sonstiges',
}

export interface ShoppingInput {
  name: string
  amount: number | null
  unit: string
  category: ShoppingCategory
}

/** kg → g und l → ml, damit gleiche Zutaten zusammengerechnet werden können */
export function normalizeQuantity(amount: number | null, unit: string): { amount: number | null; unit: string } {
  const u = unit.trim()
  const lu = u.toLowerCase()
  if (amount === null) return { amount: null, unit: u }
  if (lu === 'kg') return { amount: amount * 1000, unit: 'g' }
  if (lu === 'l') return { amount: amount * 1000, unit: 'ml' }
  if (lu === 'stk' || lu === 'stk.') return { amount, unit: 'Stück' }
  return { amount, unit: u }
}

export function itemKey(name: string, unit: string | null): string {
  return `${name.trim().toLowerCase()}|${normalizeQuantity(1, unit ?? '').unit.toLowerCase()}`
}

/** Zutaten zusammenführen: gleiche Zutat + Einheit → Mengen addieren. Reihenfolge des ersten Auftretens bleibt. */
export function mergeIngredients(items: ShoppingInput[]): ShoppingInput[] {
  const map = new Map<string, ShoppingInput>()
  for (const raw of items) {
    const q = normalizeQuantity(raw.amount, raw.unit)
    const key = itemKey(raw.name, q.unit)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...raw, name: raw.name.trim(), ...q })
    } else if (q.amount !== null) {
      existing.amount = round2((existing.amount ?? 0) + q.amount)
    }
  }
  return [...map.values()]
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Nach Kategorie gruppieren (feste Reihenfolge), innerhalb alphabetisch */
export function groupByCategory<T extends { category: ShoppingCategory; name: string }>(
  items: T[],
): { category: ShoppingCategory; label: string; items: T[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: items.filter((i) => i.category === category).sort((a, b) => a.name.localeCompare(b.name, 'de')),
  })).filter((g) => g.items.length > 0)
}

export interface MergePlan {
  inserts: ShoppingInput[]
  updates: { id: string; amount: number | null }[]
}

/**
 * Neue Zutaten in eine bestehende Liste einfügen. Offene (nicht abgehakte) Artikel mit gleichem Namen und
 * gleicher Einheit werden erhöht statt doppelt angelegt.
 */
export function planAddToList(existing: ShoppingItem[], additions: ShoppingInput[]): MergePlan {
  const open = new Map(existing.filter((e) => !e.checked).map((e) => [itemKey(e.name, e.unit), e]))
  const plan: MergePlan = { inserts: [], updates: [] }
  for (const add of mergeIngredients(additions)) {
    const hit = open.get(itemKey(add.name, add.unit))
    if (hit) {
      const amount = hit.amount === null && add.amount === null ? null : round2(Number(hit.amount ?? 0) + (add.amount ?? 0))
      plan.updates.push({ id: hit.id, amount })
    } else {
      plan.inserts.push(add)
    }
  }
  return plan
}

export interface RegeneratePlan {
  deleteIds: string[]
  inserts: (ShoppingInput & { checked: boolean; in_stock: boolean })[]
}

/**
 * Liste aus dem Wochenplan neu erzeugen: alte Plan-Artikel werden ersetzt, eigene Artikel bleiben.
 * „Im Vorrat“- und Abhak-Status bleiben für gleiche Zutaten erhalten.
 */
export function planRegenerate(existing: ShoppingItem[], fromPlan: ShoppingInput[]): RegeneratePlan {
  const oldPlanItems = existing.filter((e) => e.source === 'plan')
  const state = new Map(oldPlanItems.map((e) => [itemKey(e.name, e.unit), e]))
  return {
    deleteIds: oldPlanItems.map((e) => e.id),
    inserts: mergeIngredients(fromPlan).map((i) => {
      const prev = state.get(itemKey(i.name, i.unit))
      return { ...i, checked: prev?.checked ?? false, in_stock: prev?.in_stock ?? false }
    }),
  }
}

/** Lesbare Mengenangabe, z. B. „1,5 kg“, „250 ml“, „2 Stück“ */
export function formatQuantity(amount: number | null, unit: string | null): string {
  if (amount === null || amount === undefined) return unit ?? ''
  const u = unit ?? ''
  if (u === 'g' && amount >= 1000) return `${fmt1(amount / 1000)} kg`
  if (u === 'ml' && amount >= 1000) return `${fmt1(amount / 1000)} l`
  const num = u === 'g' || u === 'ml' ? fmt1(amount) : fmtFraction(amount)
  return `${num}${u ? ` ${u}` : ''}`
}

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]

/** 1,5 → „1½“, 0,25 → „¼“; andere Werte mit einer Nachkommastelle */
export function fmtFraction(n: number): string {
  const whole = Math.floor(n + 1e-9)
  const rest = n - whole
  if (rest < 0.02) return fmt1(whole)
  const hit = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.02)
  if (hit) return whole > 0 ? `${whole}${hit[1]}` : hit[1]
  return fmt1(n)
}

/** Einfache Kategorie-Erkennung für eigene Artikel */
export function guessCategory(name: string): ShoppingCategory {
  const n = name.toLowerCase()
  if (/(apfel|banane|birne|beere|tomate|gurke|salat|paprika|zwiebel|karotte|möhre|kartoffel|zucchini|brokkoli|spinat|lauch|kohl|obst|gemüse|zitrone|avocado|pilz|champignon|kräuter|petersilie|basilikum|knoblauch|ingwer|orange|traube)/.test(n))
    return 'obst_gemuese'
  if (/(milch|joghurt|quark|käse|butter|sahne|skyr|feta|frischkäse|\beier\b|mozzarella)/.test(n)) return 'milch'
  if (/(fleisch|hähnchen|pute|rind|hack|schwein|lachs|fisch|thunfisch|garnele|wurst|schinken|aufschnitt)/.test(n)) return 'fleisch_fisch'
  if (/(nudel|reis|mehl|zucker|öl|essig|dose|linsen|bohnen|haferflocken|brot|gewürz|salz|pfeffer|honig|nuss|nüsse|kaffee|tee|müsli|couscous|bulgur|quinoa)/.test(n)) return 'vorrat'
  return 'sonstiges'
}

/** „2 l Milch“ → { amount: 2, unit: 'l', name: 'Milch' }; „Kaffee“ → { amount: null, unit: '', name: 'Kaffee' } */
export function parseItemText(text: string): { name: string; amount: number | null; unit: string } | null {
  const t = text.trim()
  if (!t) return null
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|stück|stk\.?|pck\.?|packung|dose|dosen|bund|flasche|flaschen|becher|glas|gläser)?\s+(.+)$/i)
  if (!m) return { name: t, amount: null, unit: '' }
  const amount = parseDecimal(m[1])
  const unitRaw = m[2] ?? 'Stück'
  const unit = /^(g|kg|ml|l)$/i.test(unitRaw) ? unitRaw.toLowerCase() : unitRaw[0].toUpperCase() + unitRaw.slice(1).toLowerCase()
  return { name: m[3].trim(), amount, unit }
}

/** Einkaufsliste als Text zum Teilen (z. B. per Messenger) – nur offene Artikel, nach Kategorien */
export function shoppingListText(items: ShoppingItem[]): string {
  const open = items.filter((i) => !i.checked && !i.in_stock)
  const groups = groupByCategory(open)
  const lines = ['🛒 Einkaufsliste']
  for (const g of groups) {
    lines.push('', `${g.label}:`)
    for (const i of g.items) {
      const q = formatQuantity(i.amount === null ? null : Number(i.amount), i.unit)
      lines.push(`• ${i.name}${q ? ` – ${q}` : ''}`)
    }
  }
  return lines.join('\n')
}
