import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import { ALL_TABLES, type DataStore, type TableName } from '../data/store'
import { defaultId } from '../data/offlineStore'
import { chunk, planImport, type Backup, type ImportPlan, type Row } from '../lib/backup'
import { defaultDraft } from '../components/profile/types'
import type { Profile } from '../types'

export interface ImportPreview {
  plan: ImportPlan
  /** Noch keine Mahlzeiten protokolliert – dann ist es vermutlich eine Wiederherstellung auf einem neuen Konto */
  accountEmpty: boolean
}

/** Vorschau: Was würde eingespielt, was ist schon vorhanden? Ändert nichts. */
export async function previewImport(store: DataStore, backup: Backup): Promise<ImportPreview> {
  const existing: Partial<Record<TableName, Row[]>> = {}
  for (const t of ALL_TABLES) existing[t] = await store.list<Row>(t)
  return { plan: planImport(backup, existing, defaultId), accountEmpty: (existing.log_entries?.length ?? 0) === 0 }
}

/** Sicherung einspielen: neue Zeilen anlegen, Vorhandenes überspringen, auf Wunsch das Profil übernehmen */
export function useImportBackup() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ backup, withProfile }: { backup: Backup; withProfile: boolean }): Promise<ImportPlan> => {
      // Frisch planen – seit der Vorschau kann sich etwas geändert haben
      const { plan } = await previewImport(store, backup)
      for (const { table, rows } of plan.inserts) {
        for (const part of chunk(rows)) await store.insert(table, part)
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
    onSuccess: () => qc.invalidateQueries(),
  })
}
