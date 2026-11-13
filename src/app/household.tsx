import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Household, HouseholdMember } from '../types'
import { HouseholdUnavailableError } from '../data/store'
import { scopeToHousehold } from '../data/householdScope'
import { authorLabel, findMember } from '../lib/household'
import { Spinner } from '../components/ui/EmptyState'
import { StoreScopeProvider, useAuth } from './auth'

export const HOUSEHOLD_KEY = ['household'] as const

/** Abfrage-Ergebnis: Kennt die Datenbank den Haushalt überhaupt, und gehört das Konto zu einem? */
export interface HouseholdData {
  available: boolean
  household: Household | null
}

export interface HouseholdState {
  /** Gemeinsamer Haushalt ist möglich: mit Konto (im Demo-Modus nicht) */
  supported: boolean
  /** … und die Datenbank ist dafür eingerichtet */
  available: boolean
  /** Der Stand konnte (noch) nicht geladen werden, z. B. ohne Verbindung beim ersten Start */
  loadFailed: boolean
  household: Household | null
  me: HouseholdMember | null
  isOwner: boolean
  /** „von Anna“ für Einträge anderer Mitglieder, sonst null */
  authorOf(userId: string | null | undefined): string | null
  /** Gehört die Zeile dem angemeldeten Konto? (Im Haushalt sind auch Rezepte und Gerichte der anderen lesbar.) */
  isMine(row: { user_id?: string | null }): boolean
}

const SOLO: HouseholdState = {
  supported: false,
  available: false,
  loadFailed: false,
  household: null,
  me: null,
  isOwner: false,
  authorOf: () => null,
  isMine: () => true,
}

const HouseholdContext = createContext<HouseholdState>(SOLO)

/** Zwischengespeicherte Daten verwerfen, die vom Haushalt abhängen (Plan, Einkaufsliste, Rezepte und Gerichte der anderen) */
export function resetSharedCaches(qc: QueryClient) {
  qc.removeQueries({ queryKey: ['plan'] })
  qc.removeQueries({ queryKey: ['shopping'] })
  void qc.invalidateQueries({ queryKey: ['dishes'] })
  void qc.invalidateQueries({ queryKey: ['recipe_variants'] })
}

/** Welche Abfragen eine Änderung der anderen Mitglieder betrifft */
const AFFECTED: Record<string, readonly string[]> = {
  plan_items: ['plan'],
  shopping_items: ['shopping'],
  household_members: HOUSEHOLD_KEY,
  households: HOUSEHOLD_KEY,
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { store, userId } = useAuth()
  const qc = useQueryClient()
  const api = store?.household

  const query = useQuery<HouseholdData>({
    queryKey: HOUSEHOLD_KEY,
    enabled: Boolean(api),
    queryFn: async () => {
      try {
        return { available: true, household: await api!.get() }
      } catch (e) {
        if (e instanceof HouseholdUnavailableError) return { available: false, household: null }
        throw e
      }
    },
    staleTime: 15_000,
    // Im Haushalt regelmäßig nachsehen, ob jemand dazugekommen oder gegangen ist
    refetchInterval: (q) => (q.state.data?.household ? 60_000 : false),
  })
  const household = query.data?.household ?? null
  const householdId = household?.id ?? null

  // Wechsel des Haushalts (auch von einem anderen Gerät aus): Plan und Einkaufsliste des alten Bestands nicht weiter zeigen
  const lastId = useRef(householdId)
  if (lastId.current !== householdId) {
    lastId.current = householdId
    resetSharedCaches(qc)
  }

  // Änderungen der anderen sofort übernehmen (Live-Verbindung); ohne sie greift das regelmäßige Nachladen
  useEffect(() => {
    if (!householdId || !api?.watch) return
    return api.watch((table) => {
      const key = AFFECTED[table]
      if (key) void qc.invalidateQueries({ queryKey: key })
    })
  }, [householdId, api, qc])

  const scoped = useMemo(() => (store && householdId ? scopeToHousehold(store, householdId) : store), [store, householdId])

  const value = useMemo<HouseholdState>(() => {
    if (!api) return SOLO
    const me = findMember(household, userId) ?? null
    return {
      supported: true,
      available: query.data?.available ?? false,
      loadFailed: !query.data && query.isError,
      household,
      me,
      isOwner: me?.role === 'owner',
      authorOf: (id) => authorLabel(household, id, userId),
      isMine: (row) => !row.user_id || row.user_id === userId,
    }
  }, [api, household, userId, query.data, query.isError])

  // Erst rendern, wenn klar ist, ob das Konto zu einem Haushalt gehört – sonst landeten Einträge kurz im falschen Bestand
  if (api && query.isPending) return <Spinner />

  return (
    <HouseholdContext.Provider value={value}>
      <StoreScopeProvider value={scoped}>{children}</StoreScopeProvider>
    </HouseholdContext.Provider>
  )
}

export function useHousehold(): HouseholdState {
  return useContext(HouseholdContext)
}

/**
 * Im gemeinsamen Haushalt sollen Änderungen der anderen schnell ankommen: häufiger nachladen und beim Zurückkehren
 * in die App sofort aktualisieren. Ohne Haushalt bleiben die sparsamen Vorgaben.
 */
export function useSharedRefresh(): { refetchInterval: number | false; staleTime?: number } {
  const { household } = useHousehold()
  return household ? { refetchInterval: 15_000, staleTime: 3_000 } : { refetchInterval: false }
}
