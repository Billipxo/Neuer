import type { Profile } from '../types'
import { applyOrder, matches, type DataStore, type ListQuery, type Primitive, type TableName } from './store'

/**
 * Offline-Schicht über dem Supabase-Speicher.
 *
 * - Jede erfolgreiche Antwort wird in einem lokalen Spiegel abgelegt.
 * - Ohne Verbindung werden Lesezugriffe aus dem Spiegel beantwortet und Schreibzugriffe in einer
 *   Warteschlange („Outbox“) gespeichert und sofort im Spiegel sichtbar gemacht.
 * - Sobald wieder eine Verbindung besteht, wird die Warteschlange der Reihe nach übertragen.
 *
 * IDs werden deshalb im Client erzeugt (UUID), damit offline angelegte Einträge sofort bearbeitet werden können.
 */

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type Row = Record<string, unknown> & { id: string }

export type OutboxOp =
  | { kind: 'insert'; table: TableName; rows: Row[] }
  | { kind: 'update'; table: TableName; id: string; patch: object }
  | { kind: 'remove'; table: TableName; ids: string[] }
  | { kind: 'removeWhere'; table: TableName; eq: Record<string, Primitive> }
  | { kind: 'saveProfile'; profile: Omit<Profile, 'id'> }

interface Mirror {
  tables: Partial<Record<TableName, Record<string, Row>>>
  profile: Profile | null
}

export interface SyncState {
  pending: number
  syncing: boolean
  lastError: string | null
}

export interface OfflineDataStore extends DataStore {
  getSyncState(): SyncState
  subscribe(listener: (s: SyncState) => void): () => void
  /** Warteschlange übertragen. Gibt true zurück, wenn sie danach leer ist. */
  flush(): Promise<boolean>
}

export interface OfflineOptions {
  userId: string
  storage: KeyValueStorage
  isOnline?: () => boolean
  newId?: () => string
  now?: () => string
}

export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|offline/i.test(msg)
}

function isDuplicate(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /duplicate key|23505|already exists/i.test(msg)
}

export function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback (RFC4122 v4-Format)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function createOfflineStore(inner: DataStore, opts: OfflineOptions): OfflineDataStore {
  const { userId, storage } = opts
  const isOnline = opts.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const newId = opts.newId ?? defaultId
  const now = opts.now ?? (() => new Date().toISOString())
  const MIRROR_KEY = `teller-mirror-${userId}`
  const OUTBOX_KEY = `teller-outbox-${userId}`

  const listeners = new Set<(s: SyncState) => void>()
  let syncing = false
  let lastError: string | null = null
  let flushing: Promise<boolean> | null = null

  // --- Persistenz -----------------------------------------------------------------
  function readMirror(): Mirror {
    try {
      return (JSON.parse(storage.getItem(MIRROR_KEY) ?? 'null') as Mirror) ?? { tables: {}, profile: null }
    } catch {
      return { tables: {}, profile: null }
    }
  }
  function writeMirror(m: Mirror) {
    try {
      storage.setItem(MIRROR_KEY, JSON.stringify(m))
    } catch {
      /* Speicher voll – Spiegel ist nur ein Cache */
    }
  }
  function readOutbox(): OutboxOp[] {
    try {
      return (JSON.parse(storage.getItem(OUTBOX_KEY) ?? '[]') as OutboxOp[]) ?? []
    } catch {
      return []
    }
  }
  function writeOutbox(ops: OutboxOp[]) {
    storage.setItem(OUTBOX_KEY, JSON.stringify(ops))
    emit()
  }

  function state(): SyncState {
    return { pending: readOutbox().length, syncing, lastError }
  }
  function emit() {
    const s = state()
    listeners.forEach((l) => l(s))
  }

  // --- Spiegel aktualisieren --------------------------------------------------------
  function mirrorUpsert(table: TableName, rows: Row[]) {
    const m = readMirror()
    const t = (m.tables[table] ??= {})
    for (const r of rows) t[r.id] = { ...t[r.id], ...r }
    writeMirror(m)
  }
  function mirrorPatch(table: TableName, id: string, patch: object): Row {
    const m = readMirror()
    const t = (m.tables[table] ??= {})
    t[id] = { ...(t[id] ?? { id }), ...patch } as Row
    writeMirror(m)
    return t[id]
  }
  function mirrorDelete(table: TableName, pred: (r: Row) => boolean) {
    const m = readMirror()
    const t = m.tables[table] ?? {}
    for (const [id, r] of Object.entries(t)) if (pred(r)) delete t[id]
    m.tables[table] = t
    writeMirror(m)
  }
  function fromMirror<T>(table: TableName, q: ListQuery = {}): T[] {
    const rows = Object.values(readMirror().tables[table] ?? {}).filter((r) => matches(r, q))
    const ordered = applyOrder(rows, q.order)
    return (q.limit ? ordered.slice(0, q.limit) : ordered) as T[]
  }

  /** Noch nicht übertragene Änderungen auf ein Server-Ergebnis anwenden */
  function overlayPending<T>(table: TableName, rows: Row[], q: ListQuery): T[] {
    const ops = readOutbox()
    if (!ops.length) return rows as T[]
    let out = [...rows]
    for (const op of ops) {
      if (!('table' in op) || op.table !== table) continue
      if (op.kind === 'insert') {
        for (const r of op.rows) if (matches(r, q) && !out.some((x) => x.id === r.id)) out.push(r)
      } else if (op.kind === 'update') {
        out = out.map((r) => (r.id === op.id ? { ...r, ...op.patch } : r))
      } else if (op.kind === 'remove') {
        out = out.filter((r) => !op.ids.includes(r.id))
      } else if (op.kind === 'removeWhere') {
        out = out.filter((r) => !matches(r, { eq: op.eq }))
      }
    }
    const ordered = applyOrder(out, q.order)
    return (q.limit ? ordered.slice(0, q.limit) : ordered) as T[]
  }

  function enqueue(op: OutboxOp) {
    writeOutbox([...readOutbox(), op])
  }

  async function run(op: OutboxOp): Promise<void> {
    switch (op.kind) {
      case 'insert':
        await inner.insert(op.table, op.rows)
        return
      case 'update':
        await inner.update(op.table, op.id, op.patch)
        return
      case 'remove':
        await inner.remove(op.table, op.ids)
        return
      case 'removeWhere':
        await inner.removeWhere(op.table, op.eq)
        return
      case 'saveProfile':
        await inner.saveProfile(op.profile)
        return
    }
  }

  async function doFlush(): Promise<boolean> {
    if (!readOutbox().length) return true
    if (!isOnline()) return false
    syncing = true
    emit()
    try {
      for (;;) {
        const ops = readOutbox()
        if (!ops.length) break
        const [op, ...rest] = ops
        try {
          await run(op)
        } catch (e) {
          if (isNetworkError(e)) return false
          // Doppelt angelegt (z. B. nach Abbruch) gilt als erledigt; andere Fehler werden verworfen,
          // damit die Warteschlange nicht dauerhaft hängt.
          if (!isDuplicate(e)) lastError = e instanceof Error ? e.message : String(e)
        }
        writeOutbox(rest)
      }
      return true
    } finally {
      syncing = false
      emit()
    }
  }

  function flush(): Promise<boolean> {
    flushing ??= doFlush().finally(() => {
      flushing = null
    })
    return flushing
  }

  /**
   * Schreibvorgang: bei Verbindung direkt (nach dem Leeren der Warteschlange), sonst in die Warteschlange.
   * `optimistic` aktualisiert den Spiegel und liefert das Ergebnis für den Aufrufer.
   */
  async function write<R>(op: OutboxOp, online: () => Promise<R>, optimistic: () => R): Promise<R> {
    if (isOnline() && (await flush())) {
      try {
        return await online()
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }
    enqueue(op)
    return optimistic()
  }

  return {
    kind: 'supabase',

    async list<T>(table: TableName, q: ListQuery = {}) {
      if (!isOnline()) return fromMirror<T>(table, q)
      try {
        const rows = (await inner.list<Row>(table, q)) as Row[]
        // Spiegel aktualisieren; bei vollständigen Abfragen serverseitig gelöschte Zeilen entfernen
        if (!q.limit) {
          const ids = new Set(rows.map((r) => r.id))
          const pendingIds = new Set(readOutbox().flatMap((op) => (op.kind === 'insert' ? op.rows.map((r) => r.id) : [])))
          mirrorDelete(table, (r) => matches(r, q) && !ids.has(r.id) && !pendingIds.has(r.id))
        }
        mirrorUpsert(table, rows)
        return overlayPending<T>(table, rows, q)
      } catch (e) {
        if (isNetworkError(e)) return fromMirror<T>(table, q)
        throw e
      }
    },

    async insert<T>(table: TableName, rows: object[]) {
      const withIds = rows.map((r) => ({ id: newId(), created_at: now(), ...r })) as Row[]
      return write<T[]>(
        { kind: 'insert', table, rows: withIds },
        async () => {
          const created = (await inner.insert<Row>(table, withIds)) as Row[]
          mirrorUpsert(table, created)
          return created as T[]
        },
        () => {
          const local = withIds.map((r) => ({ user_id: userId, ...r }))
          mirrorUpsert(table, local)
          return local as T[]
        },
      )
    },

    async update<T>(table: TableName, id: string, patch: object) {
      return write<T>(
        { kind: 'update', table, id, patch },
        async () => {
          const row = (await inner.update<Row>(table, id, patch)) as Row
          mirrorUpsert(table, [row])
          return row as T
        },
        () => mirrorPatch(table, id, patch) as T,
      )
    },

    async remove(table: TableName, ids: string[]) {
      if (!ids.length) return
      await write<void>(
        { kind: 'remove', table, ids },
        async () => {
          await inner.remove(table, ids)
          mirrorDelete(table, (r) => ids.includes(r.id))
        },
        () => mirrorDelete(table, (r) => ids.includes(r.id)),
      )
    },

    async removeWhere(table: TableName, eq: Record<string, Primitive>) {
      await write<void>(
        { kind: 'removeWhere', table, eq },
        async () => {
          await inner.removeWhere(table, eq)
          mirrorDelete(table, (r) => matches(r, { eq }))
        },
        () => mirrorDelete(table, (r) => matches(r, { eq })),
      )
    },

    async getProfile() {
      if (!isOnline()) return readMirror().profile
      try {
        const p = await inner.getProfile()
        const pending = readOutbox().filter((o) => o.kind === 'saveProfile')
        const latest = pending.length ? { ...p, ...pending[pending.length - 1].profile, id: userId } : p
        const m = readMirror()
        m.profile = latest as Profile | null
        writeMirror(m)
        return latest as Profile | null
      } catch (e) {
        if (isNetworkError(e)) return readMirror().profile
        throw e
      }
    },

    async saveProfile(p) {
      return write<Profile>(
        { kind: 'saveProfile', profile: p },
        async () => {
          const saved = await inner.saveProfile(p)
          const m = readMirror()
          m.profile = saved
          writeMirror(m)
          return saved
        },
        () => {
          const m = readMirror()
          m.profile = { ...m.profile, ...p, id: userId } as Profile
          writeMirror(m)
          return m.profile
        },
      )
    },

    async deleteAccount() {
      if (!isOnline()) throw new Error('Zum Löschen des Kontos wird eine Internetverbindung benötigt.')
      await inner.deleteAccount()
      storage.removeItem(MIRROR_KEY)
      storage.removeItem(OUTBOX_KEY)
      emit()
    },

    getSyncState: state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    flush,
  }
}
