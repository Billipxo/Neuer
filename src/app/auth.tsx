import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createSupabaseStore } from '../data/supabaseStore'
import { createLocalStore } from '../data/localStore'
import type { DataStore } from '../data/store'
import { createOfflineStore, type OfflineDataStore } from '../data/offlineStore'

const LOCAL_FLAG = 'teller-local-mode'

/** Ein Offline-Speicher pro Nutzer (Warteschlange und Abos bleiben über Re-Renders erhalten) */
const offlineStores = new Map<string, OfflineDataStore>()
function offlineStoreFor(userId: string): OfflineDataStore {
  let s = offlineStores.get(userId)
  if (!s) {
    s = createOfflineStore(createSupabaseStore(supabase!, userId), { userId, storage: window.localStorage })
    offlineStores.set(userId, s)
  }
  return s
}

export function isOfflineStore(s: DataStore | null): s is OfflineDataStore {
  return Boolean(s && 'flush' in s)
}

interface AuthState {
  loading: boolean
  /** Angemeldet (Supabase) oder im lokalen Demo-Modus */
  store: DataStore | null
  email: string | null
  userId: string | null
  sendMagicLink: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  startLocalMode: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Sicht auf den Speicher für die Seiten der App – im gemeinsamen Haushalt mit geteiltem Plan und Einkaufsliste */
const StoreScopeContext = createContext<DataStore | null>(null)
export const StoreScopeProvider = StoreScopeContext.Provider

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [localMode, setLocalMode] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_FLAG) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(() => {
    let store: DataStore | null = null
    if (supabase && session) store = offlineStoreFor(session.user.id)
    else if (localMode) store = createLocalStore()
    return {
      loading,
      store,
      email: session?.user.email ?? null,
      userId: session?.user.id ?? (localMode ? 'local' : null),
      async sendMagicLink(email: string) {
        if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw new Error(error.message)
      },
      async verifyCode(email: string, code: string) {
        if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) throw new Error(error.message)
      },
      startLocalMode() {
        localStorage.setItem(LOCAL_FLAG, '1')
        setLocalMode(true)
      },
      async signOut() {
        localStorage.removeItem(LOCAL_FLAG)
        localStorage.removeItem('teller-query-cache')
        // Zwischengespeicherte Kopien der Daten entfernen (noch nicht übertragene Änderungen bleiben erhalten)
        Object.keys(localStorage)
          .filter((k) => k.startsWith('teller-mirror-'))
          .forEach((k) => localStorage.removeItem(k))
        setLocalMode(false)
        if (supabase) await supabase.auth.signOut()
      },
    }
  }, [session, localMode, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth außerhalb des AuthProvider')
  return ctx
}

/**
 * Datenspeicher des angemeldeten Nutzers (nur innerhalb geschützter Seiten verwenden).
 * Im gemeinsamen Haushalt liefert er für Wochenplan und Einkaufsliste den geteilten Bestand (siehe app/household).
 */
export function useStore(): DataStore {
  const { store } = useAuth()
  const scoped = useContext(StoreScopeContext)
  if (!store) throw new Error('Nicht angemeldet')
  return scoped ?? store
}
