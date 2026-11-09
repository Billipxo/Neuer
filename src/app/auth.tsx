import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createSupabaseStore } from '../data/supabaseStore'
import { createLocalStore } from '../data/localStore'
import type { DataStore } from '../data/store'

const LOCAL_FLAG = 'teller-local-mode'

interface AuthState {
  loading: boolean
  /** Angemeldet (Supabase) oder im lokalen Demo-Modus */
  store: DataStore | null
  email: string | null
  userId: string | null
  sendMagicLink: (email: string) => Promise<void>
  startLocalMode: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

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
    if (supabase && session) store = createSupabaseStore(supabase, session.user.id)
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
      startLocalMode() {
        localStorage.setItem(LOCAL_FLAG, '1')
        setLocalMode(true)
      },
      async signOut() {
        localStorage.removeItem(LOCAL_FLAG)
        localStorage.removeItem('teller-query-cache')
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

/** Datenspeicher des angemeldeten Nutzers (nur innerhalb geschützter Seiten verwenden). */
export function useStore(): DataStore {
  const { store } = useAuth()
  if (!store) throw new Error('Nicht angemeldet')
  return store
}
