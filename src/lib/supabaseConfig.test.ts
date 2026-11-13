import { describe, expect, it } from 'vitest'
import { checkSupabaseConfig } from './supabaseConfig'

const URL_OK = 'https://abcdefghijklmnopqrst.supabase.co'
const KEY_OK = 'sb_publishable_0t30abcDEF_test'
const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signatur`

describe('Zugangswerte für Supabase', () => {
  it('nimmt richtige Werte unverändert', () => {
    expect(checkSupabaseConfig(URL_OK, KEY_OK)).toEqual({ status: 'ok', url: URL_OK, key: KEY_OK })
    expect(checkSupabaseConfig(URL_OK, jwt('anon'))).toMatchObject({ status: 'ok' })
    expect(checkSupabaseConfig('http://127.0.0.1:54321', 'e2e-anon-key')).toEqual({ status: 'ok', url: 'http://127.0.0.1:54321', key: 'e2e-anon-key' })
  })

  it('gilt ohne Werte als nicht eingerichtet (Demo-Modus)', () => {
    expect(checkSupabaseConfig(undefined, undefined)).toEqual({ status: 'missing' })
    expect(checkSupabaseConfig('', '  ')).toEqual({ status: 'missing' })
    expect(checkSupabaseConfig('https://dein-projekt.supabase.co', 'dein-anon-key')).toEqual({ status: 'missing' })
  })

  it('bereinigt übliche Tippfehler beim Eintragen von Hand', () => {
    const ok = { status: 'ok', url: URL_OK, key: KEY_OK }
    // Name mitsamt Gleichheitszeichen mitkopiert – so zeigt Supabase die Werte an
    expect(checkSupabaseConfig(`NEXT_PUBLIC_SUPABASE_URL=${URL_OK}`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${KEY_OK}`)).toEqual(ok)
    expect(checkSupabaseConfig(` ${URL_OK}/ \n`, `"${KEY_OK}"`)).toEqual(ok)
    // vertauscht eingetragen
    expect(checkSupabaseConfig(KEY_OK, URL_OK)).toEqual(ok)
    // nur die Projekt-Kennung oder die Adresse ohne https://
    expect(checkSupabaseConfig('abcdefghijklmnopqrst', KEY_OK)).toEqual(ok)
    expect(checkSupabaseConfig('abcdefghijklmnopqrst.supabase.co', KEY_OK)).toEqual(ok)
  })

  it('erklärt, was falsch ist, statt die App abstürzen zu lassen', () => {
    const problem = (url: string | undefined, key: string | undefined) => {
      const check = checkSupabaseConfig(url, key)
      return check.status === 'invalid' ? check.problem : check.status
    }
    expect(problem(URL_OK, '')).toMatch(/VITE_SUPABASE_ANON_KEY fehlt/)
    expect(problem('', KEY_OK)).toMatch(/VITE_SUPABASE_URL fehlt/)
    expect(problem(KEY_OK, KEY_OK)).toMatch(/In VITE_SUPABASE_URL steht ein Schlüssel/)
    expect(problem('ganz was anderes', KEY_OK)).toMatch(/keine gültige Adresse/)
    expect(problem(URL_OK, URL_OK)).toMatch(/In VITE_SUPABASE_ANON_KEY steht eine Adresse/)
  })

  it('weist geheime Schlüssel zurück – sie wären im Browser für alle sichtbar', () => {
    for (const secret of ['sb_secret_abc123', jwt('service_role')]) {
      const check = checkSupabaseConfig(URL_OK, secret)
      expect(check.status).toBe('invalid')
      expect(check.status === 'invalid' && check.problem).toMatch(/geheimer Schlüssel/)
    }
  })
})
