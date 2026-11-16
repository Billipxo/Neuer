import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth, useStore } from '../app/auth'
import { ALL_TABLES, OPTIONAL_TABLES, isMissingTableError, listTolerant, type DataStore, type TableName } from '../data/store'
import { isMissingDetailsColumn, sanitizeDetails } from '../lib/trainingLog'
import { defaultId, isDuplicate } from '../data/offlineStore'
import { chunk, planImport, type Backup, type ImportPlan, type Row } from '../lib/backup'
import { defaultDraft } from '../components/profile/types'
import type { Profile } from '../types'

export interface ImportPreview {
  plan: ImportPlan
  /** Noch keine Mahlzeiten protokolliert – dann ist es vermutlich eine Wiederherstellung auf einem neuen Konto */
  accountEmpty: boolean
}

/** Mit Konto braucht das Einspielen Netz: Die Vorschau vergleicht mit dem Stand in der Datenbank */
function requireOnline(store: DataStore) {
  if (store.kind === 'supabase' && typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Zum Einspielen einer Sicherung wird eine Internetverbindung benötigt.')
  }
}

/** Im gemeinsamen Haushalt sind auch Rezepte und Gerichte der anderen lesbar – verglichen wird nur mit den eigenen */
const OWNED: TableName[] = ['dishes', 'recipe_variants']

/** Vorschau: Was würde eingespielt, was ist schon vorhanden? Ändert nichts. */
export async function previewImport(store: DataStore, backup: Backup, userId: string | null): Promise<ImportPreview> {
  requireOnline(store)
  const existing: Partial<Record<TableName, Row[]>> = {}
  for (const t of ALL_TABLES) {
    const rows = await listTolerant<Row>(store, t)
    existing[t] = OWNED.includes(t) ? rows.filter((r) => !r.user_id || r.user_id === userId) : rows
  }
  return { plan: planImport(backup, existing, defaultId), accountEmpty: (existing.log_entries?.length ?? 0) === 0 }
}

/** Sicherung einspielen: neue Zeilen anlegen, Vorhandenes überspringen, auf Wunsch das Profil übernehmen */
export function useImportBackup() {
  const store = useStore()
  const { userId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ backup, withProfile }: { backup: Backup; withProfile: boolean }): Promise<ImportPlan> => {
      // Frisch planen – seit der Vorschau kann sich etwas geändert haben
      const { plan } = await previewImport(store, backup, userId)
      for (const { table, rows } of plan.inserts) {
        if (table === 'achievements') {
          // Abzeichen kann die App inzwischen selbst vergeben haben – ein doppeltes ist kein Fehler
          for (const row of rows) {
            try {
              await store.insert(table, [row])
            } catch (e) {
              if (!isDuplicate(e)) throw e
            }
          }
          continue
        }
        // Übungen aus dem Trainingstagebuch nur in sauberer Form einspielen
        const clean = table === 'activity_logs' ? rows.map((r) => ('details' in r ? { ...r, details: sanitizeDetails(r.details) } : r)) : rows
        try {
          for (const part of chunk(clean)) {
            try {
              await store.insert(table, part)
            } catch (e) {
              // Die Sicherung enthält Übungen, aber hier fehlt das Datenbank-Update dafür noch: ohne sie einspielen
              if (table !== 'activity_logs' || !isMissingDetailsColumn(e)) throw e
              await store.insert(table, part.map(({ details: _details, ...r }) => r))
            }
          }
        } catch (e) {
          // Tabelle aus einem Datenbank-Update, das hier noch fehlt (z. B. Sport): den Rest trotzdem einspielen
          if (!(OPTIONAL_TABLES.includes(table) && isMissingTableError(e))) throw e
        }
      }
      if (withProfile && plan.profile) {
        const current = defaultDraft(await store.getProfile())
        // Nur Felder übernehmen, die diese Version kennt
        const known = Object.keys(defaultDraft(null))
        const imported = Object.fromEntries(Object.entries(plan.profile).filter(([k, v]) => known.includes(k) && v !== undefined))
        await store.saveProfile({ ...current, ...imported, onboarded: true } as Omit<Profile, 'id'>)
      }
      return plan
    },
    // Auch nach einem Abbruch neu laden: Ein Teil kann schon übernommen sein
    onSettled: () => qc.invalidateQueries(),
  })
}
