import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkSupabaseConfig } from './supabaseConfig'

// Öffentlicher Schlüssel für den Browser. Supabase nennt ihn inzwischen „Publishable key“ – beide Namen gelten.
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY) as string | undefined

const config = checkSupabaseConfig(import.meta.env.VITE_SUPABASE_URL as string | undefined, rawKey)

let client: SupabaseClient | null = null
let problem: string | null = config.status === 'invalid' ? config.problem : null
if (config.status === 'ok') {
  try {
    client = createClient(config.url, config.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  } catch (e) {
    // Falsche Zugangswerte dürfen die App nicht mit einer leeren Seite stehen lassen
    problem = `Die Verbindung zu Supabase ließ sich nicht aufbauen: ${(e as Error).message}`
  }
}

export const supabase: SupabaseClient | null = client
export const isSupabaseConfigured = client !== null
/** Zugangswerte sind eingetragen, aber falsch – Text für die Anmeldeseite (sonst null) */
export const supabaseConfigProblem: string | null = problem
