/**
 * Zugangswerte für Supabase prüfen, bevor die Verbindung aufgebaut wird.
 *
 * Die Werte werden von Hand eingetragen (z. B. bei Vercel). Ein falscher Wert darf die App nicht mit einer leeren Seite
 * stehen lassen: Übliche Tippfehler werden bereinigt, alles andere führt zu einer verständlichen Meldung.
 */
export type SupabaseConfigCheck =
  | { status: 'missing' }
  | { status: 'ok'; url: string; key: string }
  | { status: 'invalid'; problem: string }

/** Leerraum, Anführungszeichen und ein mitkopiertes „NAME=“ am Anfang entfernen */
function clean(raw: string | undefined): string {
  let value = (raw ?? '').trim()
  const assigned = /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/s.exec(value)
  if (assigned) value = assigned[1].trim()
  return value.replace(/^["'`]+|["'`]+$/g, '').trim()
}

const looksLikeUrl = (v: string) => /^https?:\/\//i.test(v)
const looksLikeKey = (v: string) => /^(sb_|eyJ)/.test(v)

/** Geheime Schlüssel haben im Browser nichts verloren: sb_secret_… oder ein Schlüssel mit der Rolle service_role */
function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

export function checkSupabaseConfig(rawUrl: string | undefined, rawKey: string | undefined): SupabaseConfigCheck {
  let url = clean(rawUrl)
  let key = clean(rawKey)
  if ((!url && !key) || url.includes('dein-projekt')) return { status: 'missing' }
  // Beide Werte vertauscht eingetragen
  if (looksLikeKey(url) && looksLikeUrl(key)) [url, key] = [key, url]

  const invalid = (problem: string): SupabaseConfigCheck => ({ status: 'invalid', problem })
  if (!url) return invalid('VITE_SUPABASE_URL fehlt. Dort gehört die Project URL hinein (https://….supabase.co).')
  if (!key) return invalid('VITE_SUPABASE_ANON_KEY fehlt. Dort gehört der öffentliche Schlüssel hinein (beginnt mit sb_publishable_ oder eyJ).')
  if (looksLikeKey(url)) {
    return invalid('In VITE_SUPABASE_URL steht ein Schlüssel. Dort gehört die Project URL hinein (https://….supabase.co).')
  }
  // Nur die Projekt-Kennung eingetragen, z. B. „abcdefghijklmnopqrst“
  if (/^[a-z0-9]{15,30}$/.test(url)) url = `https://${url}.supabase.co`
  else if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('Protokoll')
    url = parsed.origin
  } catch {
    return invalid('VITE_SUPABASE_URL ist keine gültige Adresse. Sie beginnt mit https:// und endet auf .supabase.co.')
  }
  if (looksLikeUrl(key)) {
    return invalid('In VITE_SUPABASE_ANON_KEY steht eine Adresse. Dort gehört der öffentliche Schlüssel hinein (beginnt mit sb_publishable_ oder eyJ).')
  }
  if (isSecretKey(key)) {
    return invalid(
      'In VITE_SUPABASE_ANON_KEY steht ein geheimer Schlüssel. Er wäre für alle sichtbar – bitte bei Supabase sofort neu erzeugen und hier den öffentlichen Schlüssel eintragen (sb_publishable_ oder „anon public“).',
    )
  }
  return { status: 'ok', url, key }
}
