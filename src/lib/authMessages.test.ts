import { describe, expect, it } from 'vitest'
import { linkProblemFromUrl, loginError, withoutLinkProblem } from './authMessages'

describe('Meldungen beim Anfordern des Anmeldelinks', () => {
  it('erklärt die Stundengrenze des eingebauten Mail-Versands', () => {
    expect(loginError('email rate limit exceeded')).toMatch(/Grenze pro Stunde/)
    // die kurze Sperre zwischen zwei Anfragen ist etwas anderes
    expect(loginError('For security purposes, you can only request this after 37 seconds.')).toMatch(/etwa eine Minute/)
  })

  it('erklärt, warum eine fremde Adresse ohne eigenen Mail-Dienst keine Mail bekommt', () => {
    expect(loginError('Email address "x@example.com" cannot be used as it is not authorized')).toMatch(/Adresse des Supabase-Kontos/)
  })

  it('übersetzt die übrigen bekannten Fälle und zeigt Unbekanntes im Wortlaut', () => {
    expect(loginError('Unable to validate email address: invalid format')).toMatch(/ungültig/)
    expect(loginError('Signups not allowed for otp')).toMatch(/Registrierungen/)
    expect(loginError('Failed to fetch')).toMatch(/Keine Verbindung/)
    expect(loginError('etwas Neues')).toBe('Der Link konnte nicht gesendet werden: etwas Neues')
  })
})

describe('Link aus der Mail hat nicht funktioniert', () => {
  const base = 'https://teller.example/'

  it('erkennt abgelaufene oder schon benutzte Links – im Anhang und in den Parametern der Adresse', () => {
    const expired = 'error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    expect(linkProblemFromUrl(`${base}#${expired}`)).toMatch(/abgelaufen oder wurde schon benutzt/)
    expect(linkProblemFromUrl(`${base}?${expired}`)).toMatch(/abgelaufen oder wurde schon benutzt/)
  })

  it('zeigt bei anderen Gründen den Wortlaut', () => {
    expect(linkProblemFromUrl(`${base}#error=server_error&error_description=Database+error`)).toBe(
      'Die Anmeldung über den Link hat nicht geklappt: Database error Bitte einen neuen Link anfordern.',
    )
  })

  it('meldet nichts bei einer normalen Adresse oder einer gelungenen Anmeldung', () => {
    expect(linkProblemFromUrl(base)).toBeNull()
    expect(linkProblemFromUrl(`${base}planer?woche=2026-11-09`)).toBeNull()
    expect(linkProblemFromUrl(`${base}#access_token=abc&refresh_token=def&type=magiclink`)).toBeNull()
    expect(linkProblemFromUrl('keine adresse')).toBeNull()
  })

  it('räumt die Fehler-Angaben wieder aus der Adresse', () => {
    expect(withoutLinkProblem(`${base}#error=access_denied&error_code=otp_expired`)).toBe('/')
    expect(withoutLinkProblem(`${base}planer?woche=2026-11-09&error=access_denied&error_code=otp_expired`)).toBe('/planer?woche=2026-11-09')
    expect(withoutLinkProblem(`${base}planer#abschnitt`)).toBe('/planer#abschnitt')
  })
})
