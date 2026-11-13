import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth, useStore } from '../app/auth'
import type { RecipeVariant } from '../types'

/**
 * Nur die Liste der Varianten – bewusst ohne Kochbuch-Daten.
 * Die Erfolge brauchen beim App-Start lediglich die Anzahl; alles, was Rezepte berechnet, steht in `hooks/variants.ts`
 * und wird erst mit dem Kochbuch geladen.
 */
export const VARIANTS_KEY = ['recipe_variants'] as const

/** Im gemeinsamen Haushalt liefert die Datenbank auch die Rezepte der anderen (nur lesbar) – hier nach Besitz getrennt */
function useVariantRows(mine: boolean) {
  const store = useStore()
  const { userId } = useAuth()
  const select = useCallback((rows: RecipeVariant[]) => rows.filter((v) => (!v.user_id || v.user_id === userId) === mine), [userId, mine])
  return useQuery({
    queryKey: VARIANTS_KEY,
    queryFn: () => store.list<RecipeVariant>('recipe_variants', { order: [{ column: 'updated_at', ascending: false }] }),
    select,
  })
}

/** Eigene Varianten und Rezepte, zuletzt geänderte zuerst */
export function useVariants() {
  return useVariantRows(true)
}

/** Varianten und Rezepte der anderen Haushalts-Mitglieder */
export function useSharedVariants() {
  return useVariantRows(false)
}
