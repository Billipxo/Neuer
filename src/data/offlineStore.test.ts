import { describe, expect, it } from 'vitest'
import { createOfflineStore, isNetworkError, type KeyValueStorage } from './offlineStore'
import { applyOrder, matches, type DataStore, type ListQuery, type TableName } from './store'
import type { Profile } from '../types'

type Row = Record<string, unknown> & { id: string }

/** Einfacher Server-Ersatz, der sich „offline“ schalten lässt */
function fakeServer() {
  const tables: Record<string, Row[]> = {}
  let profile: Profile | null = null
  const net = { offline: false }
  const guard = () => {
    if (net.offline) throw new Error('TypeError: Failed to fetch')
  }
  const store: DataStore = {
    kind: 'supabase',
    async list<T>(t: TableName, q: ListQuery = {}) {
      guard()
      return applyOrder((tables[t] ?? []).filter((r) => matches(r, q)), q.order) as T[]
    },
    async insert<T>(t: TableName, rows: object[]) {
      guard()
      const list = (tables[t] ??= [])
      for (const r of rows as Row[]) {
        if (list.some((x) => x.id === r.id)) throw new Error('duplicate key value violates unique constraint')
        list.push({ ...r })
      }
      return rows as T[]
    },
    async update<T>(t: TableName, id: string, patch: object) {
      guard()
      const r = tables[t].find((x) => x.id === id)!
      Object.assign(r, patch)
      return r as T
    },
    async remove(t: TableName, ids: string[]) {
      guard()
      tables[t] = (tables[t] ?? []).filter((r) => !ids.includes(r.id))
    },
    async removeWhere(t: TableName, eq) {
      guard()
      tables[t] = (tables[t] ?? []).filter((r) => !matches(r, { eq }))
    },
    async getProfile() {
      guard()
      return profile
    },
    async saveProfile(p) {
      guard()
      profile = { ...p, id: 'u1' }
      return profile
    },
    async deleteAccount() {
      guard()
    },
  }
  return { store, tables, net }
}

function memStorage(): KeyValueStorage {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}

function setup() {
  const server = fakeServer()
  let n = 0
  const store = createOfflineStore(server.store, {
    userId: 'u1',
    storage: memStorage(),
    isOnline: () => !server.net.offline,
    newId: () => `id-${++n}`,
    now: () => '2026-11-09T10:00:00Z',
  })
  return { server, store }
}

describe('Offline-Speicher', () => {
  it('erkennt Netzwerkfehler', () => {
    expect(isNetworkError(new Error('TypeError: Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('Load failed'))).toBe(true)
    expect(isNetworkError(new Error('new row violates row-level security policy'))).toBe(false)
  })

  it('schreibt online direkt und vergibt Client-IDs', async () => {
    const { server, store } = setup()
    const [row] = await store.insert<Row>('log_entries', [{ date: '2026-11-09', kcal: 100 }])
    expect(row.id).toBe('id-1')
    expect(server.tables.log_entries).toHaveLength(1)
    expect(store.getSyncState().pending).toBe(0)
  })

  it('speichert offline in der Warteschlange und zeigt Einträge sofort an', async () => {
    const { server, store } = setup()
    await store.insert('log_entries', [{ date: '2026-11-09', kcal: 100 }])
    await store.list('log_entries', { eq: { date: '2026-11-09' } }) // Spiegel füllen
    server.net.offline = true
    await store.insert('log_entries', [{ date: '2026-11-09', kcal: 200 }])
    await store.update('log_entries', 'id-1', { kcal: 150 })
    const rows = await store.list<Row>('log_entries', { eq: { date: '2026-11-09' }, order: [{ column: 'kcal' }] })
    expect(rows.map((r) => r.kcal)).toEqual([150, 200])
    expect(store.getSyncState().pending).toBe(2)
    expect(server.tables.log_entries).toHaveLength(1)
  })

  it('überträgt die Warteschlange in Reihenfolge, sobald wieder online', async () => {
    const { server, store } = setup()
    server.net.offline = true
    const [a] = await store.insert<Row>('log_entries', [{ date: '2026-11-09', kcal: 100 }])
    await store.update('log_entries', a.id, { kcal: 120 })
    await store.insert('water_logs', [{ date: '2026-11-09', ml: 250 }])
    await store.remove('water_logs', ['id-2'])
    server.net.offline = false
    expect(await store.flush()).toBe(true)
    expect(server.tables.log_entries).toEqual([{ id: 'id-1', created_at: '2026-11-09T10:00:00Z', date: '2026-11-09', kcal: 120 }])
    expect(server.tables.water_logs).toEqual([])
    expect(store.getSyncState().pending).toBe(0)
  })

  it('verarbeitet doppelte Inserts nach Abbrüchen ohne Hänger', async () => {
    const { server, store } = setup()
    server.net.offline = true
    await store.insert('log_entries', [{ kcal: 1 }])
    server.net.offline = false
    server.tables.log_entries = [{ id: 'id-1', kcal: 1 }] // bereits angekommen
    expect(await store.flush()).toBe(true)
    expect(store.getSyncState()).toMatchObject({ pending: 0, lastError: null })
  })

  it('überlagert Server-Ergebnisse mit noch offenen Änderungen', async () => {
    const { server, store } = setup()
    server.net.offline = true
    await store.insert('shopping_items', [{ name: 'Milch' }])
    // Server wieder erreichbar, aber die Warteschlange wurde noch nicht übertragen
    server.net.offline = false
    const rows = await store.list<Row>('shopping_items')
    expect(rows.map((r) => r.name)).toEqual(['Milch'])
  })

  it('merkt sich das Profil offline', async () => {
    const { server, store } = setup()
    await store.saveProfile({ name: 'A' } as Omit<Profile, 'id'>)
    server.net.offline = true
    expect((await store.getProfile())?.name).toBe('A')
    await store.saveProfile({ name: 'B' } as Omit<Profile, 'id'>)
    expect((await store.getProfile())?.name).toBe('B')
    server.net.offline = false
    await store.flush()
    expect((await server.store.getProfile())?.name).toBe('B')
  })

  it('verlangt zum Löschen des Kontos eine Verbindung', async () => {
    const { server, store } = setup()
    server.net.offline = true
    await expect(store.deleteAccount()).rejects.toThrow(/Internetverbindung/)
  })
})
