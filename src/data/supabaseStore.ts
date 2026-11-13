import type { SupabaseClient } from '@supabase/supabase-js'
import type { Household, JoinStatus, Profile } from '../types'
import { HouseholdUnavailableError, type DataStore, type HouseholdApi, type ListQuery, type Primitive, type TableName } from './store'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/**
 * PostgREST liefert pro Anfrage höchstens so viele Zeilen (Supabase-Voreinstellung: 1000). Größere Ergebnisse –
 * etwa das Protokoll eines ganzen Jahres – werden deshalb seitenweise geholt, sonst fehlten stillschweigend Einträge.
 */
export const PAGE_SIZE = 1000
/** IDs je Lösch-Anfrage, damit die Adresse der Anfrage nicht zu lang wird */
const REMOVE_CHUNK = 100

/** Tabellen, deren Änderungen im Haushalt live gemeldet werden */
const WATCHED = ['plan_items', 'shopping_items', 'household_members', 'households'] as const

function createHouseholdApi(sb: SupabaseClient, userId: string): HouseholdApi {
  /** Funktion in der Datenbank aufrufen; nicht gesetzte Angaben werden weggelassen (dann gilt die Vorgabe) */
  async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const given = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined))
    const res = await sb.rpc(fn, given)
    if (res.error) {
      // Kennt die Datenbank die Funktion nicht, fehlt die Migration für den gemeinsamen Haushalt
      if (res.error.code === 'PGRST202' || /could not find the function/i.test(res.error.message)) throw new HouseholdUnavailableError()
      throw new Error(res.error.message)
    }
    return res.data as T
  }
  return {
    async get() {
      return (await call<Household | null>('my_household')) ?? null
    },
    create: ({ name, displayName, bring }) => call<Household>('create_household', { p_name: name, p_display_name: displayName, p_bring: bring }),
    join: ({ code, displayName, bring }) =>
      call<{ status: JoinStatus; household?: Household }>('join_household', { p_code: code, p_display_name: displayName, p_bring: bring }),
    async leave(takeCopy) {
      await call('leave_household', { p_take_copy: takeCopy })
    },
    async removeMember(memberId) {
      await call('remove_household_member', { p_user_id: memberId })
    },
    update: (patch) =>
      call<Household>('update_household', { p_name: patch.name, p_display_name: patch.displayName, p_eaters: patch.eaters, p_new_code: patch.newCode }),
    watch(onChange) {
      let channel = sb.channel(`haushalt-${userId}`)
      for (const table of WATCHED) {
        channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table))
      }
      channel.subscribe()
      return () => {
        void sb.removeChannel(channel)
      }
    },
  }
}

export function createSupabaseStore(sb: SupabaseClient, userId: string): DataStore {
  return {
    kind: 'supabase',
    household: createHouseholdApi(sb, userId),
    async list<T>(table: TableName, q: ListQuery = {}) {
      const page = async (from: number, size: number, withCount: boolean) => {
        let query = sb.from(table).select('*', withCount ? { count: 'exact' } : undefined)
        for (const [k, v] of Object.entries(q.eq ?? {})) query = v === null ? query.is(k, null) : query.eq(k, v)
        for (const [k, v] of Object.entries(q.gte ?? {})) query = query.gte(k, v)
        for (const [k, v] of Object.entries(q.lte ?? {})) query = query.lte(k, v)
        if (q.in) query = query.in(q.in.column, q.in.values)
        const order = q.order ?? []
        for (const o of order) query = query.order(o.column, { ascending: o.ascending !== false, nullsFirst: false })
        // Eindeutige Reihenfolge (Anlage-Zeitpunkt, dann ID): Gleichstände fallen wie im lokalen Speicher aus,
        // und beim seitenweisen Laden kommt keine Zeile doppelt oder fehlt
        if (!order.some((o) => o.column === 'created_at')) query = query.order('created_at', { ascending: true })
        if (!order.some((o) => o.column === 'id')) query = query.order('id', { ascending: true })
        const res = await query.range(from, from + size - 1)
        return { rows: check(res) as T[], count: res.count }
      }
      const limit = q.limit ?? Infinity
      const out: T[] = []
      // Gesamtzahl aus der ersten Antwort; fehlt sie, gilt eine nicht volle Seite als Ende
      let total: number | null | undefined
      do {
        const size = Math.min(PAGE_SIZE, limit - out.length)
        const { rows, count } = await page(out.length, size, total === undefined)
        if (total === undefined) total = typeof count === 'number' ? count : null
        out.push(...rows)
        if (!rows.length || (total === null && rows.length < size)) break
      } while (out.length < Math.min(limit, total ?? Infinity))
      return out
    },
    async insert<T>(table: TableName, rows: object[]) {
      if (!rows.length) return []
      const withUser = rows.map((r) => ({ ...r, user_id: userId }))
      // Fehlt in einer Zeile ein Feld, gilt die Vorgabe der Spalte (nicht NULL) – wichtig beim Einspielen von Sicherungen
      return check(await sb.from(table).insert(withUser, { defaultToNull: false }).select('*')) as T[]
    },
    async update<T>(table: TableName, id: string, patch: object) {
      return check(await sb.from(table).update(patch).eq('id', id).select('*').single()) as T
    },
    async remove(table: TableName, ids: string[]) {
      for (let i = 0; i < ids.length; i += REMOVE_CHUNK) {
        check(await sb.from(table).delete().in('id', ids.slice(i, i + REMOVE_CHUNK)))
      }
    },
    async removeWhere(table: TableName, eq: Record<string, Primitive>) {
      let query = sb.from(table).delete()
      // Im gemeinsamen Haushalt gehören die Zeilen allen Mitgliedern – sonst nur die eigenen (zusätzlich zu den Regeln der Datenbank)
      if (!eq.household_id) query = query.eq('user_id', userId)
      for (const [k, v] of Object.entries(eq)) query = v === null ? query.is(k, null) : query.eq(k, v)
      check(await query)
    },
    async getProfile() {
      const res = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
      return check(res) as Profile | null
    },
    async saveProfile(p) {
      return check(await sb.from('profiles').upsert({ ...p, id: userId }).select('*').single()) as Profile
    },
    async deleteAccount() {
      check(await sb.rpc('delete_my_account'))
      await sb.auth.signOut()
    },
  }
}
