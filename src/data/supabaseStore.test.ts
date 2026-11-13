import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseStore, PAGE_SIZE } from './supabaseStore'

type Row = Record<string, unknown>

interface Call {
  op: 'select' | 'insert' | 'delete'
  table: string
  range?: [number, number]
  count?: boolean
  orders: string[]
  ids?: unknown[]
  options?: unknown
}

/** Kleiner Nachbau des Abfrage-Bausteins von supabase-js: filtert, sortiert und deckelt wie PostgREST */
function fakeClient(data: Record<string, Row[]>, opts: { maxRows?: number; noCount?: boolean } = {}) {
  const calls: Call[] = []
  const maxRows = opts.maxRows ?? 1000
  const from = (table: string) => {
    const call: Call = { op: 'select', table, orders: [] }
    const filters: ((r: Row) => boolean)[] = []
    const sorts: { column: string; ascending: boolean }[] = []
    let inserted: Row[] = []
    const builder = {
      select(_columns: string, o?: { count?: string }) {
        if (call.op === 'select') call.count = o?.count === 'exact'
        return builder
      },
      eq(k: string, v: unknown) {
        filters.push((r) => r[k] === v)
        return builder
      },
      is(k: string, v: unknown) {
        filters.push((r) => (r[k] ?? null) === v)
        return builder
      },
      gte(k: string, v: string | number) {
        filters.push((r) => (r[k] as string | number) >= v)
        return builder
      },
      lte(k: string, v: string | number) {
        filters.push((r) => (r[k] as string | number) <= v)
        return builder
      },
      in(k: string, values: unknown[]) {
        if (call.op === 'delete') call.ids = values
        filters.push((r) => values.includes(r[k]))
        return builder
      },
      order(column: string, o: { ascending?: boolean }) {
        sorts.push({ column, ascending: o.ascending !== false })
        call.orders.push(`${column}.${o.ascending !== false ? 'asc' : 'desc'}`)
        return builder
      },
      range(a: number, b: number) {
        call.range = [a, b]
        return builder
      },
      insert(rows: Row[], options?: unknown) {
        call.op = 'insert'
        call.options = options
        inserted = rows
        return builder
      },
      delete() {
        call.op = 'delete'
        return builder
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        calls.push(call)
        const rows = (data[table] ??= [])
        let result: { data: Row[] | null; error: null; count: number | null }
        if (call.op === 'insert') {
          rows.push(...inserted)
          result = { data: inserted, error: null, count: null }
        } else if (call.op === 'delete') {
          data[table] = rows.filter((r) => !filters.every((f) => f(r)))
          result = { data: null, error: null, count: null }
        } else {
          const hit = rows.filter((r) => filters.every((f) => f(r)))
          hit.sort((x, y) => {
            for (const s of sorts) {
              const a = x[s.column] as string | number
              const b = y[s.column] as string | number
              if (a !== b) return (a < b ? -1 : 1) * (s.ascending ? 1 : -1)
            }
            return 0
          })
          const [a, b] = call.range ?? [0, Infinity]
          const page = hit.slice(a, Math.min(b + 1, a + maxRows))
          result = { data: page, error: null, count: call.count && !opts.noCount ? hit.length : null }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return builder
  }
  return { client: { from } as unknown as SupabaseClient, calls }
}

const pad = (n: number) => String(n).padStart(5, '0')
/** n Protokoll-Zeilen in gemischter Reihenfolge, jeweils 10 pro Tag */
function logRows(n: number): Row[] {
  const rows = Array.from({ length: n }, (_, i) => ({
    id: `id-${pad(i)}`,
    created_at: `2026-01-01T00:00:${pad(i)}`,
    date: `d${pad(Math.floor(i / 10))}`,
    user_id: 'u1',
  }))
  return rows.sort((a, b) => (a.id.slice(-1) < b.id.slice(-1) ? -1 : 1))
}

describe('Supabase-Speicher', () => {
  it('holt große Ergebnisse seitenweise – vollständig, ohne Doppelte, in fester Reihenfolge', async () => {
    const { client, calls } = fakeClient({ log_entries: logRows(2500) })
    const store = createSupabaseStore(client, 'u1')
    const rows = await store.list<Row>('log_entries', { order: [{ column: 'date' }] })
    expect(rows).toHaveLength(2500)
    expect(new Set(rows.map((r) => r.id)).size).toBe(2500)
    expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 2500 }, (_, i) => `id-${pad(i)}`))
    expect(calls.map((c) => c.range)).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, 2 * PAGE_SIZE - 1],
      [2 * PAGE_SIZE, 3 * PAGE_SIZE - 1],
    ])
    // Gezählt wird nur mit der ersten Anfrage; Gleichstände löst immer Anlage-Zeitpunkt, dann ID
    expect(calls.map((c) => c.count)).toEqual([true, false, false])
    expect(calls[0].orders).toEqual(['date.asc', 'created_at.asc', 'id.asc'])
  })

  it('kommt mit einer Anfrage aus, wenn alles auf eine Seite passt', async () => {
    const { client, calls } = fakeClient({ log_entries: logRows(40) })
    const store = createSupabaseStore(client, 'u1')
    expect(await store.list<Row>('log_entries', { eq: { date: 'd00001' } })).toHaveLength(10)
    expect(await store.list<Row>('water_logs')).toEqual([])
    expect(calls).toHaveLength(2)
  })

  it('beachtet ein Limit und fragt nicht mehr an als nötig', async () => {
    const { client, calls } = fakeClient({ log_entries: logRows(2500) })
    const store = createSupabaseStore(client, 'u1')
    const one = await store.list<Row>('log_entries', { order: [{ column: 'created_at', ascending: false }], limit: 1 })
    expect(one.map((r) => r.id)).toEqual(['id-02499'])
    expect(calls).toHaveLength(1)
    expect(calls[0].range).toEqual([0, 0])
    expect(calls[0].orders).toEqual(['created_at.desc', 'id.asc'])
    const many = await store.list<Row>('log_entries', { limit: 1200 })
    expect(many).toHaveLength(1200)
    expect(calls.slice(1).map((c) => c.range)).toEqual([
      [0, 999],
      [1000, 1199],
    ])
  })

  it('lädt auch dann alles, wenn der Server kleinere Seiten liefert als angefragt', async () => {
    const { client, calls } = fakeClient({ log_entries: logRows(700) }, { maxRows: 300 })
    const store = createSupabaseStore(client, 'u1')
    expect(await store.list<Row>('log_entries')).toHaveLength(700)
    expect(calls.map((c) => c.range?.[0])).toEqual([0, 300, 600])
  })

  it('hört ohne Gesamtzahl bei der ersten nicht vollen Seite auf', async () => {
    const { client, calls } = fakeClient({ log_entries: logRows(1300) }, { noCount: true })
    const store = createSupabaseStore(client, 'u1')
    expect(await store.list<Row>('log_entries')).toHaveLength(1300)
    expect(calls).toHaveLength(2)
  })

  it('setzt beim Einfügen das Konto und lässt fehlende Felder auf die Spaltenvorgabe fallen', async () => {
    const { client, calls } = fakeClient({})
    const store = createSupabaseStore(client, 'u1')
    const created = await store.insert<Row>('shopping_items', [{ name: 'Kaffee' }, { name: 'Tee', checked: true }])
    expect(created).toEqual([
      { name: 'Kaffee', user_id: 'u1' },
      { name: 'Tee', checked: true, user_id: 'u1' },
    ])
    expect(calls[0].options).toEqual({ defaultToNull: false })
    expect(await store.insert('shopping_items', [])).toEqual([])
    expect(calls).toHaveLength(1)
  })

  it('löscht viele Zeilen in Päckchen', async () => {
    const rows = logRows(250)
    const { client, calls } = fakeClient({ log_entries: rows })
    const store = createSupabaseStore(client, 'u1')
    await store.remove(
      'log_entries',
      rows.map((r) => r.id as string),
    )
    expect(calls.map((c) => c.ids?.length)).toEqual([100, 100, 50])
    expect(await store.list('log_entries')).toEqual([])
    await store.remove('log_entries', [])
    expect(calls).toHaveLength(4)
  })
})
