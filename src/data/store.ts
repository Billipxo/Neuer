import type { Household, JoinStatus, Profile } from '../types'

export type TableName =
  | 'foods'
  | 'dishes'
  | 'log_entries'
  | 'water_logs'
  | 'weight_logs'
  | 'activity_logs'
  | 'training_plans'
  | 'plan_items'
  | 'shopping_items'
  | 'achievements'
  | 'recipe_variants'

export const ALL_TABLES: TableName[] = [
  'foods',
  'dishes',
  'log_entries',
  'water_logs',
  'weight_logs',
  'activity_logs',
  'training_plans',
  'plan_items',
  'shopping_items',
  'achievements',
  'recipe_variants',
]

/**
 * Tabellen aus späteren Datenbank-Updates: Fehlen sie (Update noch nicht ausgeführt), läuft die App ohne sie weiter,
 * statt mit einem Fehler abzubrechen.
 */
export const OPTIONAL_TABLES: readonly TableName[] = ['activity_logs', 'training_plans']

/** Meldet die Datenbank, dass es eine Tabelle (noch) nicht gibt? (PostgREST: PGRST205, PostgreSQL: 42P01) */
export function isMissingTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return /could not find the table|schema cache|relation .* does not exist|PGRST205|42P01/i.test(msg)
}

/** Liste einer Tabelle – bei einer fehlenden optionalen Tabelle leer statt Fehler (Sicherung, Export) */
export async function listTolerant<T>(store: Pick<DataStore, 'list'>, table: TableName): Promise<T[]> {
  try {
    return await store.list<T>(table)
  } catch (e) {
    if (OPTIONAL_TABLES.includes(table) && isMissingTableError(e)) return []
    throw e
  }
}

export type Primitive = string | number | boolean | null

export interface ListQuery {
  eq?: Record<string, Primitive>
  gte?: Record<string, string | number>
  lte?: Record<string, string | number>
  in?: { column: string; values: Primitive[] }
  order?: { column: string; ascending?: boolean }[]
  limit?: number
}

/** Die Datenbank kennt den gemeinsamen Haushalt noch nicht (Migration fehlt) */
export class HouseholdUnavailableError extends Error {
  constructor() {
    super('Der gemeinsame Haushalt ist in der Datenbank noch nicht eingerichtet.')
    this.name = 'HouseholdUnavailableError'
  }
}

/** Gemeinsamer Haushalt – gibt es nur mit Konto */
export interface HouseholdApi {
  /** Eigener Haushalt oder null. Wirft HouseholdUnavailableError, wenn die Datenbank ihn noch nicht kennt. */
  get(): Promise<Household | null>
  create(input: { name: string; displayName: string; bring: boolean }): Promise<Household>
  join(input: { code: string; displayName: string; bring: boolean }): Promise<{ status: JoinStatus; household?: Household }>
  leave(takeCopy: boolean): Promise<void>
  removeMember(userId: string): Promise<void>
  update(patch: { name?: string; displayName?: string; eaters?: number; newCode?: boolean }): Promise<Household>
  /** Änderungen der anderen live beobachten; liefert eine Funktion zum Beenden */
  watch?(onChange: (table: string) => void): () => void
}

/** Einheitliche Datenschnittstelle – Supabase (Konto) oder lokal (Demo-Modus). */
export interface DataStore {
  readonly kind: 'supabase' | 'local'
  readonly household?: HouseholdApi
  list<T>(table: TableName, q?: ListQuery): Promise<T[]>
  insert<T>(table: TableName, rows: object[]): Promise<T[]>
  update<T>(table: TableName, id: string, patch: object): Promise<T>
  remove(table: TableName, ids: string[]): Promise<void>
  removeWhere(table: TableName, eq: Record<string, Primitive>): Promise<void>
  getProfile(): Promise<Profile | null>
  saveProfile(p: Omit<Profile, 'id'>): Promise<Profile>
  deleteAccount(): Promise<void>
}

/** Prüft eine Zeile gegen eine Abfrage (für den lokalen Speicher und Tests). */
export function matches(row: Record<string, unknown>, q: ListQuery = {}): boolean {
  for (const [k, v] of Object.entries(q.eq ?? {})) if (row[k] !== v) return false
  for (const [k, v] of Object.entries(q.gte ?? {})) if (!((row[k] as string | number) >= v)) return false
  for (const [k, v] of Object.entries(q.lte ?? {})) if (!((row[k] as string | number) <= v)) return false
  if (q.in && !q.in.values.includes(row[q.in.column] as Primitive)) return false
  return true
}

export function applyOrder<T>(rows: T[], order: ListQuery['order']): T[] {
  if (!order?.length) return rows
  return [...rows].sort((a, b) => {
    for (const o of order) {
      const av = (a as Record<string, unknown>)[o.column] as string | number | null
      const bv = (b as Record<string, unknown>)[o.column] as string | number | null
      if (av === bv) continue
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = av < bv ? -1 : 1
      return o.ascending === false ? -cmp : cmp
    }
    return 0
  })
}
