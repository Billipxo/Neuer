import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '../types'
import type { DataStore, ListQuery, Primitive, TableName } from './store'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export function createSupabaseStore(sb: SupabaseClient, userId: string): DataStore {
  return {
    kind: 'supabase',
    async list<T>(table: TableName, q: ListQuery = {}) {
      let query = sb.from(table).select('*')
      for (const [k, v] of Object.entries(q.eq ?? {})) query = v === null ? query.is(k, null) : query.eq(k, v)
      for (const [k, v] of Object.entries(q.gte ?? {})) query = query.gte(k, v)
      for (const [k, v] of Object.entries(q.lte ?? {})) query = query.lte(k, v)
      if (q.in) query = query.in(q.in.column, q.in.values)
      for (const o of q.order ?? []) query = query.order(o.column, { ascending: o.ascending !== false, nullsFirst: false })
      if (q.limit) query = query.limit(q.limit)
      return check(await query) as T[]
    },
    async insert<T>(table: TableName, rows: object[]) {
      if (!rows.length) return []
      const withUser = rows.map((r) => ({ ...r, user_id: userId }))
      return check(await sb.from(table).insert(withUser).select('*')) as T[]
    },
    async update<T>(table: TableName, id: string, patch: object) {
      return check(await sb.from(table).update(patch).eq('id', id).select('*').single()) as T
    },
    async remove(table: TableName, ids: string[]) {
      if (!ids.length) return
      check(await sb.from(table).delete().in('id', ids))
    },
    async removeWhere(table: TableName, eq: Record<string, Primitive>) {
      let query = sb.from(table).delete().eq('user_id', userId)
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
