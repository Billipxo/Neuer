import { useQuery } from '@tanstack/react-query'
import { useStore } from '../app/auth'
import type { RecipeVariant } from '../types'

/**
 * Nur die Liste der eigenen Varianten – bewusst ohne Kochbuch-Daten.
 * Die Erfolge brauchen beim App-Start lediglich die Anzahl; alles, was Rezepte berechnet, steht in `hooks/variants.ts`
 * und wird erst mit dem Kochbuch geladen.
 */
export const VARIANTS_KEY = ['recipe_variants'] as const

/** Eigene Varianten und Rezepte, zuletzt geänderte zuerst */
export function useVariants() {
  const store = useStore()
  return useQuery({
    queryKey: VARIANTS_KEY,
    queryFn: () => store.list<RecipeVariant>('recipe_variants', { order: [{ column: 'updated_at', ascending: false }] }),
  })
}
