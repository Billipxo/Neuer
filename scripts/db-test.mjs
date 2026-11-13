// Prüft die Datenbank in einer echten PostgreSQL: Alle Migrationen werden der Reihe nach in eine leere Datenbank
// eingespielt, danach laufen die Tests aus supabase/tests/*.test.sql mit den Rechten der App (Row Level Security).
//
// Voraussetzung: `psql` und ein erreichbarer PostgreSQL-Server (Zugang über die üblichen Variablen PGHOST, PGPORT,
// PGUSER, PGPASSWORD). Die Testdatenbank (Vorgabe: teller_test) wird bei jedem Lauf gelöscht und neu angelegt.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bundle } from './bundle-sql.mjs'

const DB = process.env.TELLER_TEST_DB ?? 'teller_test'
const MIGRATIONS = 'supabase/migrations'
const TESTS = 'supabase/tests'

function psql(db, args) {
  try {
    return execFileSync('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-d', db, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    const detail = [e.stdout, e.stderr].filter(Boolean).join('\n').trim()
    throw new Error(detail || e.message)
  }
}

/** Leere Datenbank mit Supabase-Nachbau und allen Migrationen */
export function prepareDatabase(db = DB) {
  if (!/^[a-z_][a-z0-9_]*$/.test(db)) throw new Error(`Ungültiger Datenbankname: ${db}`)
  psql('postgres', ['-c', `drop database if exists ${db} with (force)`, '-c', `create database ${db}`])
  psql(db, ['-f', join(TESTS, 'supabase_stub.sql')])
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
  for (const f of files) psql(db, ['-f', join(MIGRATIONS, f)])
  return files
}

function main() {
  try {
    psql('postgres', ['-c', 'select 1'])
  } catch (e) {
    console.error('Keine PostgreSQL erreichbar (psql, PGHOST/PGUSER/PGPASSWORD):\n' + e.message)
    process.exit(1)
  }

  if (readFileSync('supabase/setup.sql', 'utf8') !== bundle()) {
    console.error('supabase/setup.sql ist nicht aktuell – bitte „npm run db:bundle“ ausführen.')
    process.exit(1)
  }

  // Vorlage einmal aufbauen; jede Testdatei bekommt davon eine frische Kopie und läuft so unabhängig von den anderen
  const template = `${DB}_vorlage`
  const files = prepareDatabase(template)
  console.log(`${files.length} Migrationen eingespielt`)
  psql(template, ['-f', join(TESTS, 'helpers.sql')])

  let failed = false
  let total = 0
  for (const f of readdirSync(TESTS).filter((f) => f.endsWith('.test.sql')).sort()) {
    psql('postgres', ['-c', `drop database if exists ${DB} with (force)`, '-c', `create database ${DB} template ${template}`])
    try {
      const out = psql(DB, ['-f', join(TESTS, f)])
      const lines = out.split('\n').filter((l) => l.startsWith('ok – '))
      total += lines.length
      console.log(`✓ ${f}: ${lines.length} Prüfungen`)
      if (process.argv.includes('--verbose')) console.log(lines.map((l) => '    ' + l).join('\n'))
    } catch (e) {
      failed = true
      const lines = e.message.split('\n')
      const ok = lines.filter((l) => l.startsWith('ok – ')).length
      console.error(`✗ ${f} (nach ${ok} bestandenen Prüfungen)\n${lines.filter((l) => /ERROR|FEHLGESCHLAGEN|DETAIL|HINT|psql:/.test(l)).join('\n')}`)
    }
  }
  if (!process.argv.includes('--keep')) {
    psql('postgres', ['-c', `drop database if exists ${DB} with (force)`, '-c', `drop database if exists ${template} with (force)`])
  }
  if (failed) process.exit(1)
  console.log(`Datenbank-Tests bestanden: ${total} Prüfungen`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
