import type { DataStore, ListQuery, Primitive, TableName } from './store'

/** Tabellen, die ein Haushalt gemeinsam nutzt */
export const SHARED_TABLES: TableName[] = ['plan_items', 'shopping_items']

/**
 * Sicht eines Haushalts-Mitglieds auf den Speicher: Wochenplan und Einkaufsliste lesen und schreiben den gemeinsamen
 * Bestand des Haushalts. Alles andere (Protokoll, Lebensmittel, Gewicht …) bleibt unverändert privat.
 *
 * Ohne Haushalt wird der Speicher unverändert benutzt – die Anfragen kennen `household_id` dann gar nicht, sodass die
 * App auch mit einer Datenbank ohne die Haushalts-Migration weiter funktioniert.
 */
export function scopeToHousehold<S extends DataStore>(store: S, householdId: string): S {
  const shared = (table: TableName) => SHARED_TABLES.includes(table)
  return {
    ...store,
    list<T>(table: TableName, q: ListQuery = {}) {
      return store.list<T>(table, shared(table) ? { ...q, eq: { ...q.eq, household_id: householdId } } : q)
    },
    insert<T>(table: TableName, rows: object[]) {
      return store.insert<T>(table, shared(table) ? rows.map((r) => ({ ...r, household_id: householdId })) : rows)
    },
    removeWhere(table: TableName, eq: Record<string, Primitive>) {
      return store.removeWhere(table, shared(table) ? { ...eq, household_id: householdId } : eq)
    },
  }
}
