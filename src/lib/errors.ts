/** Technische Fehlermeldungen in verständliches Deutsch übersetzen */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  if (/failed to fetch|network|load failed|offline/i.test(msg)) return 'Keine Verbindung – bitte später noch einmal versuchen.'
  if (/jwt|token|not authenticated|nicht angemeldet|401/i.test(msg)) return 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.'
  if (/row-level security|permission denied|42501/i.test(msg)) return 'Keine Berechtigung – sind die Datenbank-Migrationen ausgeführt?'
  if (/relation .* does not exist|could not find the table|schema cache|PGRST20/i.test(msg))
    return 'Die Datenbank ist noch nicht eingerichtet. Bitte die SQL-Datei in Supabase ausführen.'
  if (/rate limit|too many/i.test(msg)) return 'Zu viele Anfragen – bitte kurz warten.'
  return msg ? `Speichern fehlgeschlagen: ${msg}` : 'Etwas ist schiefgelaufen. Bitte noch einmal versuchen.'
}
