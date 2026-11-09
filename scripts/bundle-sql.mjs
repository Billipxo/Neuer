// Fügt alle Migrationen zu supabase/setup.sql zusammen (zum Einfügen in den Supabase SQL Editor).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function bundle(dir = 'supabase/migrations') {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const header =
    '-- Teller – komplette Datenbank-Einrichtung\n' +
    '-- Diese Datei wird automatisch aus supabase/migrations/ erzeugt (npm run db:bundle).\n' +
    '-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run.\n\n'
  return header + files.map((f) => `-- ===== ${f} =====\n${readFileSync(join(dir, f), 'utf8').trim()}\n`).join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync('supabase/setup.sql', bundle())
  console.log('supabase/setup.sql geschrieben')
}
