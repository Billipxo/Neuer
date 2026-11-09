import type { Profile } from '../types'
import { ALL_TABLES, applyOrder, matches, type DataStore, type ListQuery, type Primitive, type TableName } from './store'

const KEY = 'teller-local-db-v1'

type Row = Record<string, unknown> & { id: string }
interface LocalDb {
  profile: Profile | null
  tables: Record<TableName, Row[]>
}

function emptyDb(): LocalDb {
  return { profile: null, tables: Object.fromEntries(ALL_TABLES.map((t) => [t, []])) as unknown as LocalDb['tables'] }
}

function load(): LocalDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDb()
    const db = JSON.parse(raw) as LocalDb
    for (const t of ALL_TABLES) db.tables[t] ??= []
    return db
  } catch {
    return emptyDb()
  }
}

function save(db: LocalDb) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/** Speichert alles im Browser (Demo-Modus ohne Supabase). */
export function createLocalStore(): DataStore {
  return {
    kind: 'local',
    async list<T>(table: TableName, q: ListQuery = {}) {
      const rows = load().tables[table].filter((r) => matches(r, q))
      const ordered = applyOrder(rows, q.order)
      return (q.limit ? ordered.slice(0, q.limit) : ordered) as T[]
    },
    async insert<T>(table: TableName, rows: object[]) {
      const db = load()
      const now = new Date().toISOString()
      const created = rows.map((r) => ({ id: uuid(), created_at: now, user_id: 'local', ...r }) as Row)
      db.tables[table].push(...created)
      save(db)
      return created as T[]
    },
    async update<T>(table: TableName, id: string, patch: object) {
      const db = load()
      const row = db.tables[table].find((r) => r.id === id)
      if (!row) throw new Error('Eintrag nicht gefunden')
      Object.assign(row, patch)
      save(db)
      return row as T
    },
    async remove(table: TableName, ids: string[]) {
      const db = load()
      db.tables[table] = db.tables[table].filter((r) => !ids.includes(r.id))
      save(db)
    },
    async removeWhere(table: TableName, eq: Record<string, Primitive>) {
      const db = load()
      db.tables[table] = db.tables[table].filter((r) => !matches(r, { eq }))
      save(db)
    },
    async getProfile() {
      return load().profile
    },
    async saveProfile(p) {
      const db = load()
      db.profile = { ...p, id: 'local', created_at: db.profile?.created_at ?? new Date().toISOString() }
      save(db)
      return db.profile
    },
    async deleteAccount() {
      localStorage.removeItem(KEY)
    },
  }
}
