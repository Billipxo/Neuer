import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { TableName } from '../data/store'
import { useToast } from '../components/ui/Toast'
import { withoutIdentity } from '../lib/undo'

/** Abfragen, die nach dem Wiederherstellen neu geladen werden */
const QUERY_KEYS: Partial<Record<TableName, string>> = {
  log_entries: 'log',
  plan_items: 'plan',
  shopping_items: 'shopping',
}

/**
 * Hinweis nach dem Löschen mit „Rückgängig“. Die gelöschten Zeilen werden mit gleichem Inhalt neu angelegt.
 * Arbeitet direkt mit Speicher und Abfrage-Cache, damit es auch funktioniert, wenn die auslösende Ansicht
 * inzwischen geschlossen wurde.
 */
export function useUndoToast() {
  const store = useStore()
  const qc = useQueryClient()
  const toast = useToast()
  return useCallback(
    (text: string, table: TableName, rows: object[], emoji = '🗑️') => {
      toast(text, emoji, {
        label: 'Rückgängig',
        onClick: async () => {
          try {
            await store.insert(table, rows.map(withoutIdentity))
            await qc.invalidateQueries({ queryKey: [QUERY_KEYS[table] ?? table] })
            toast('Wiederhergestellt', '↩️')
          } catch {
            toast('Wiederherstellen nicht möglich', '⚠️')
          }
        },
      })
    },
    [store, qc, toast],
  )
}
