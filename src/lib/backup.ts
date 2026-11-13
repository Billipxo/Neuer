/**
 * Sicherung (JSON-Export) wieder einspielen.
 *
 * - Alle Zeilen bekommen neue IDs, damit das Einspielen auch in ein anderes Konto funktioniert; Verweise
 *   (Eintrag → Lebensmittel/Gericht/Variante, Favoriten) werden entsprechend umgeschrieben.
 * - Was inhaltlich schon vorhanden ist, wird übersprungen – dieselbe Sicherung lässt sich gefahrlos mehrfach einspielen.
 */
import { ALL_TABLES, type TableName } from '../data/store'

export type Row = Record<string, unknown>

export interface Backup {
  /** Zeitpunkt des Exports (ISO), falls vorhanden */
  exportedAt: string | null
  profile: Row | null
  tables: Partial<Record<TableName, Row[]>>
}

function isRecord(v: unknown): v is Row {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Datei einlesen und prüfen. Wirft eine verständliche Meldung, wenn es keine Teller-Sicherung ist. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (!isRecord(data)) throw new Error('Das ist keine Teller-Sicherung.')
  const tables: Partial<Record<TableName, Row[]>> = {}
  let found = false
  for (const t of ALL_TABLES) {
    const rows = data[t]
    if (rows === undefined || rows === null) continue
    if (!Array.isArray(rows) || !rows.every(isRecord)) throw new Error(`Die Sicherung ist beschädigt (Bereich „${TABLE_LABELS[t]}“).`)
    tables[t] = rows
    found = true
  }
  const profile = isRecord(data.profil) ? data.profil : null
  if (!found && !profile) throw new Error('Das ist keine Teller-Sicherung.')
  return { exportedAt: typeof data.exportiert_am === 'string' ? data.exportiert_am : null, profile, tables }
}

export const TABLE_LABELS: Record<TableName, string> = {
  foods: 'Lebensmittel',
  dishes: 'Gerichte',
  recipe_variants: 'Eigene Rezepte & Varianten',
  log_entries: 'Protokoll-Einträge',
  water_logs: 'Wasser-Einträge',
  weight_logs: 'Gewichtseinträge',
  plan_items: 'Planeinträge',
  shopping_items: 'Einkaufsartikel',
  achievements: 'Abzeichen',
}

/** Reihenfolge beim Einfügen: erst das, worauf andere Zeilen verweisen */
export const IMPORT_ORDER: TableName[] = [
  'foods',
  'dishes',
  'recipe_variants',
  'log_entries',
  'water_logs',
  'weight_logs',
  'plan_items',
  'shopping_items',
  'achievements',
]

const num = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(Math.round(Number(v) * 100) / 100))
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim().toLowerCase())
const len = (v: unknown) => (Array.isArray(v) ? v.length : 0)

/** Inhaltlicher Fingerabdruck einer Zeile – gleiche Fingerabdrücke gelten als „schon vorhanden“ */
const SIGNATURE: Record<TableName, (r: Row) => string> = {
  foods: (r) => [str(r.name), str(r.brand), str(r.barcode), num(r.kcal_100)].join('|'),
  dishes: (r) => [str(r.name), num(r.servings), len(r.ingredients)].join('|'),
  recipe_variants: (r) => [str(r.title), str(r.base_recipe_id), num(r.servings), len(r.ingredients)].join('|'),
  log_entries: (r) => [str(r.date), str(r.meal), str(r.name), num(r.amount), str(r.unit), num(r.kcal)].join('|'),
  water_logs: (r) => [str(r.date), num(r.ml)].join('|'),
  weight_logs: (r) => str(r.date),
  plan_items: (r) => [str(r.date), str(r.meal), str(r.kind), str(r.title), num(r.servings)].join('|'),
  shopping_items: (r) => [str(r.name), str(r.unit), num(r.amount), str(r.source)].join('|'),
  achievements: (r) => str(r.key),
}

/** Tabellen, auf die andere Zeilen verweisen: hier wird die alte ID auf die neue (oder vorhandene) abgebildet */
const REFERENCED: TableName[] = ['foods', 'dishes', 'recipe_variants']
/** Tabellen, in denen es jeden Schlüssel nur einmal geben darf (ein Gewicht pro Tag, jedes Abzeichen einmal) */
const UNIQUE: TableName[] = ['weight_logs', 'achievements']

export interface ImportPlan {
  inserts: { table: TableName; rows: Row[] }[]
  counts: Record<TableName, { added: number; skipped: number }>
  /** Profil aus der Sicherung (ohne ID), Favoriten zeigen auf die neuen Varianten */
  profile: Row | null
  /** Anzahl neuer Zeilen insgesamt */
  total: number
}

function strip(row: Row): Row {
  const { id: _id, user_id: _user, ...rest } = row
  return rest
}

/**
 * Plant das Einspielen: welche Zeilen neu sind, welche übersprungen werden und wie Verweise umgeschrieben werden.
 * `existing` sind die aktuellen Daten des Kontos, `newId` erzeugt IDs für Zeilen, auf die verwiesen wird.
 */
export function planImport(backup: Backup, existing: Partial<Record<TableName, Row[]>>, newId: () => string): ImportPlan {
  const counts = Object.fromEntries(ALL_TABLES.map((t) => [t, { added: 0, skipped: 0 }])) as ImportPlan['counts']
  const inserts: ImportPlan['inserts'] = []
  const idMaps: Partial<Record<TableName, Map<string, string>>> = {}
  const mapId = (table: TableName, old: unknown): string | null => (typeof old === 'string' ? (idMaps[table]?.get(old) ?? null) : null)
  /** Rezept-ID: Varianten bekommen neue IDs, Kochbuch-Rezepte behalten ihre */
  const mapRecipe = (old: unknown) => (typeof old === 'string' ? (idMaps.recipe_variants?.get(old) ?? old) : (old ?? null))

  for (const table of IMPORT_ORDER) {
    const rows = backup.tables[table] ?? []
    const sig = SIGNATURE[table]
    const out: Row[] = []

    if (REFERENCED.includes(table)) {
      // Fingerabdruck → ID der vorhandenen bzw. neu geplanten Zeile. Ein Barcode darf je Konto nur einmal vorkommen:
      // Lebensmittel mit Barcode gelten deshalb schon bei gleichem Barcode als vorhanden.
      const keysOf = (r: Row) => (table === 'foods' && str(r.barcode) ? [`barcode:${str(r.barcode)}`, sig(r)] : [sig(r)])
      const known = new Map<string, string>()
      for (const r of existing[table] ?? []) {
        if (typeof r.id !== 'string') continue
        for (const k of keysOf(r)) if (!known.has(k)) known.set(k, r.id)
      }
      const map = new Map<string, string>()
      idMaps[table] = map
      for (const r of rows) {
        const keys = keysOf(r)
        const hit = keys.map((k) => known.get(k)).find(Boolean)
        if (hit) {
          if (typeof r.id === 'string') map.set(r.id, hit)
          counts[table].skipped++
          continue
        }
        const id = newId()
        for (const k of keys) known.set(k, id)
        if (typeof r.id === 'string') map.set(r.id, id)
        const row: Row = { ...strip(r), id }
        if (table === 'dishes' && Array.isArray(row.ingredients)) {
          row.ingredients = row.ingredients.map((i) => (isRecord(i) ? { ...i, food_id: mapId('foods', i.food_id) } : i))
        }
        out.push(row)
        counts[table].added++
      }
    } else {
      // Mehrfach gleiche Zeilen sind erlaubt (zwei Gläser Wasser) – gezählt wird, wie oft es sie schon gibt
      const have = new Map<string, number>()
      for (const r of existing[table] ?? []) have.set(sig(r), (have.get(sig(r)) ?? 0) + 1)
      const unique = UNIQUE.includes(table)
      for (const r of rows) {
        const s = sig(r)
        const n = have.get(s) ?? 0
        if (n > 0) {
          if (!unique) have.set(s, n - 1)
          counts[table].skipped++
          continue
        }
        if (unique) have.set(s, 1)
        const row = strip(r)
        if (table === 'log_entries' || table === 'plan_items') {
          if (table === 'log_entries') row.food_id = mapId('foods', r.food_id)
          row.dish_id = mapId('dishes', r.dish_id)
          row.recipe_id = mapRecipe(r.recipe_id)
        }
        out.push(row)
        counts[table].added++
      }
    }
    if (out.length) inserts.push({ table, rows: out })
  }

  let profile: Row | null = null
  if (backup.profile) {
    const { id: _id, created_at: _created, ...rest } = backup.profile
    profile = { ...rest }
    if (Array.isArray(rest.favorite_recipes)) profile.favorite_recipes = rest.favorite_recipes.map(mapRecipe)
  }
  const total = Object.values(counts).reduce((s, c) => s + c.added, 0)
  return { inserts, counts, profile, total }
}

/** Zeilen in Päckchen aufteilen, damit einzelne Anfragen klein bleiben */
export function chunk<T>(rows: T[], size = 200): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}
