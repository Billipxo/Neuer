import { describe, expect, it } from 'vitest'
import { scopeToHousehold } from './householdScope'
import type { DataStore, ListQuery, Primitive, TableName } from './store'

/** Speicher, der nur mitschreibt, was bei ihm ankommt */
function recorder() {
  const calls: unknown[][] = []
  const store = {
    kind: 'supabase',
    list: async (table: TableName, q?: ListQuery) => {
      calls.push(['list', table, q])
      return []
    },
    insert: async (table: TableName, rows: object[]) => {
      calls.push(['insert', table, rows])
      return rows
    },
    update: async (table: TableName, id: string, patch: object) => {
      calls.push(['update', table, id, patch])
      return patch
    },
    remove: async (table: TableName, ids: string[]) => {
      calls.push(['remove', table, ids])
    },
    removeWhere: async (table: TableName, eq: Record<string, Primitive>) => {
      calls.push(['removeWhere', table, eq])
    },
    getProfile: async () => null,
    saveProfile: async (p: object) => p,
    deleteAccount: async () => {},
    flush: async () => true,
  } as unknown as DataStore & { flush(): Promise<boolean> }
  return { store, calls }
}

describe('Haushalts-Sicht auf den Speicher', () => {
  it('liest und schreibt Wochenplan und Einkaufsliste im gemeinsamen Bestand', async () => {
    const { store, calls } = recorder()
    const scoped = scopeToHousehold(store, 'h1')
    await scoped.list('plan_items', { gte: { date: '2026-11-16' }, eq: { meal: 'dinner' } })
    await scoped.list('shopping_items')
    await scoped.insert('shopping_items', [{ name: 'Kaffee' }, { name: 'Tee', household_id: 'alt' }])
    await scoped.removeWhere('shopping_items', { checked: true })
    expect(calls).toEqual([
      ['list', 'plan_items', { gte: { date: '2026-11-16' }, eq: { meal: 'dinner', household_id: 'h1' } }],
      ['list', 'shopping_items', { eq: { household_id: 'h1' } }],
      ['insert', 'shopping_items', [{ name: 'Kaffee', household_id: 'h1' }, { name: 'Tee', household_id: 'h1' }]],
      ['removeWhere', 'shopping_items', { checked: true, household_id: 'h1' }],
    ])
  })

  it('lässt alles Private unverändert', async () => {
    const { store, calls } = recorder()
    const scoped = scopeToHousehold(store, 'h1')
    await scoped.list('log_entries', { eq: { date: '2026-11-13' } })
    await scoped.insert('log_entries', [{ name: 'Apfel' }])
    await scoped.removeWhere('water_logs', { date: '2026-11-13' })
    await scoped.update('plan_items', 'p1', { servings: 2 })
    await scoped.remove('shopping_items', ['s1'])
    expect(calls).toEqual([
      ['list', 'log_entries', { eq: { date: '2026-11-13' } }],
      ['insert', 'log_entries', [{ name: 'Apfel' }]],
      ['removeWhere', 'water_logs', { date: '2026-11-13' }],
      ['update', 'plan_items', 'p1', { servings: 2 }],
      ['remove', 'shopping_items', ['s1']],
    ])
  })

  it('behält die übrigen Fähigkeiten des Speichers (z. B. die Offline-Warteschlange)', () => {
    const { store } = recorder()
    const scoped = scopeToHousehold(store, 'h1')
    expect(scoped.kind).toBe('supabase')
    expect(typeof scoped.flush).toBe('function')
  })
})
