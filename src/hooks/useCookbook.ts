import { useEffect, useMemo, useState } from 'react'
import { loadCookbook, loadedCookbook, type CookbookEntry } from '../lib/cookbookIndex'
import { useVariants } from './variantList'

/**
 * Kochbuch-Rezepte und eigene Rezepte/Varianten für Suche und Texterkennung. Lädt das Kochbuch erst, wenn `enabled`
 * (z. B. ab drei getippten Zeichen); bis dahin bleibt die Liste leer.
 */
export function useCookbookEntries(enabled: boolean): CookbookEntry[] {
  const { data: variants } = useVariants()
  const [index, setIndex] = useState(loadedCookbook)
  useEffect(() => {
    if (!enabled || index) return
    let alive = true
    loadCookbook()
      .then((i) => alive && setIndex(i))
      .catch(() => {
        // Ohne Netz und ohne Zwischenspeicher fehlt eben das Kochbuch – die übrige Suche läuft weiter
      })
    return () => {
      alive = false
    }
  }, [enabled, index])
  return useMemo(() => {
    if (!index) return []
    const own = (variants ?? []).map(index.fromVariant).filter((e): e is CookbookEntry => !!e)
    return [...own, ...index.entries]
  }, [index, variants])
}
