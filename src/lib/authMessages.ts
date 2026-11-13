/** Verständliche Meldungen rund um die Anmeldung per E-Mail-Link */

/** Fehlermeldung von Supabase beim Anfordern des Links übersetzen */
export function loginError(msg: string): string {
  // Stundengrenze des eingebauten Mail-Versands (ohne eigenen Mail-Dienst nur wenige Mails pro Stunde)
  if (/email rate limit|over_email_send_rate_limit/i.test(msg)) {
    return 'Im Moment werden keine weiteren Anmelde-Mails verschickt (Grenze pro Stunde erreicht). Bitte in etwa einer Stunde noch einmal versuchen. Die letzte Mail bleibt bis dahin gültig.'
  }
  if (/not authorized|email_address_not_authorized/i.test(msg)) {
    return 'An diese Adresse kann noch keine Mail geschickt werden: Ohne eigenen Mail-Dienst verschickt Supabase nur an die Adresse des Supabase-Kontos.'
  }
  if (/rate limit|security purposes|seconds/i.test(msg)) return 'Bitte warte etwa eine Minute, bevor du einen neuen Link anforderst.'
  if (/invalid.*email|unable to validate email/i.test(msg)) return 'Diese E-Mail-Adresse sieht ungültig aus.'
  if (/signups not allowed/i.test(msg)) return 'Neue Registrierungen sind in Supabase deaktiviert (Authentication → Sign In / Providers).'
  if (/failed to fetch|network/i.test(msg)) return 'Keine Verbindung zum Server. Prüfe deine Internetverbindung und die Supabase-URL.'
  return `Der Link konnte nicht gesendet werden: ${msg}`
}

/**
 * Hat der Link aus der Mail nicht funktioniert, hängt Supabase den Grund an die Adresse an
 * (…#error=access_denied&error_code=otp_expired&error_description=…). Liefert dazu eine Meldung, sonst null.
 */
export function linkProblemFromUrl(href: string): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const params = new URLSearchParams(url.hash.replace(/^#/, ''))
  url.searchParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })
  const code = params.get('error_code') ?? ''
  const description = params.get('error_description') ?? ''
  if (!params.get('error') && !code) return null
  if (/otp_expired|expired|invalid/i.test(`${code} ${description}`)) {
    return 'Dieser Anmeldelink ist abgelaufen oder wurde schon benutzt. Jeder Link gilt nur einmal und nur kurze Zeit – bitte einen neuen anfordern.'
  }
  return `Die Anmeldung über den Link hat nicht geklappt${description ? `: ${description}` : '.'} Bitte einen neuen Link anfordern.`
}

/** Fehler-Angaben wieder aus der Adresszeile nehmen, damit die Meldung nach dem Neuladen nicht erneut erscheint */
export function withoutLinkProblem(href: string): string {
  const url = new URL(href)
  for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key)
  if (/(^|[#&])error(_code|_description)?=/.test(url.hash)) url.hash = ''
  return url.pathname + url.search + url.hash
}
