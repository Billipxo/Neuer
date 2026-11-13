// Prüft die Datenbank in einer echten PostgreSQL: Alle Migrationen werden der Reihe nach in eine leere Datenbank
// eingespielt, danach laufen die Tests aus supabase/tests/*.test.sql mit den Rechten der App (Row Level Security).
//
// Voraussetzung: `psql` und ein erreichbarer PostgreSQL-Server (Zugang über die üblichen Variablen PGHOST, PGPORT,
// PGUSER, PGPASSWORD). Die Testdatenbank (Vorgabe: teller_test) wird bei jedem Lauf gelöscht und neu angelegt.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bundle, bundleParts, partName, PART_LIMIT } from './bundle-sql.mjs'

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

/** Leere Datenbank mit dem Supabase-Nachbau (Rollen, Anmeldung) – noch ohne Tabellen der App */
export function emptyDatabase(db) {
  if (!/^[a-z_][a-z0-9_]*$/.test(db)) throw new Error(`Ungültiger Datenbankname: ${db}`)
  psql('postgres', ['-c', `drop database if exists ${db} with (force)`, '-c', `create database ${db}`])
  psql(db, ['-f', join(TESTS, 'supabase_stub.sql')])
}

const migrationFiles = () => readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()

/** Leere Datenbank mit Supabase-Nachbau und allen Migrationen */
export function prepareDatabase(db = DB) {
  emptyDatabase(db)
  const files = migrationFiles()
  for (const f of files) psql(db, ['-f', join(MIGRATIONS, f)])
  return files
}

const fingerprint = (db) => psql(db, ['-f', join(TESTS, 'fingerprint.sql')]).trim()
const copyOf = (template, db) => psql('postgres', ['-c', `drop database if exists ${db} with (force)`, '-c', `create database ${db} template ${template}`])
/** Tabellen der App ohne eingeschaltete Schutzregeln – wären über die API für alle lesbar */
const unprotected = (db) =>
  psql(db, ['-c', "select coalesce(string_agg(c.relname, ', '), '') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity"]).trim()

/**
 * Einrichtung prüfen, wie sie von Hand im SQL Editor passiert: Jede Datei lässt sich gefahrlos wiederholen (auch einzeln
 * und nachträglich), die Teile und die große Datei ergeben denselben Stand wie die Migrationen, und kein Teil lässt
 * eine Tabelle ohne Schutzregeln zurück. Der SQL Editor schickt den ganzen Text als eine Anfrage – hier ebenso (-c).
 */
function checkSetup(template) {
  const expected = fingerprint(template)
  const files = migrationFiles()
  let checks = 0
  const same = (db, what) => {
    if (fingerprint(db) !== expected) throw new Error(`${what}: Die Datenbank ist danach anders eingerichtet als nach den Migrationen.`)
    checks++
  }

  copyOf(template, DB)
  for (const f of files) psql(DB, ['-f', join(MIGRATIONS, f)])
  same(DB, 'Alle Migrationen ein zweites Mal')
  for (const f of files) {
    copyOf(template, DB)
    psql(DB, ['-f', join(MIGRATIONS, f)])
    same(DB, `Nur ${f} ein zweites Mal`)
  }

  const parts = bundleParts()
  parts.forEach((text, n) => {
    const file = join('supabase', partName(n + 1))
    if (readFileSync(file, 'utf8') !== text) throw new Error(`${file} ist nicht aktuell – bitte „npm run db:bundle“ ausführen.`)
    if (text.length > PART_LIMIT) throw new Error(`${file} ist mit ${text.length} Zeichen länger als ${PART_LIMIT}.`)
    checks++
  })
  if (readdirSync('supabase').filter((f) => /^setup-teil-\d+\.sql$/.test(f)).length !== parts.length) {
    throw new Error('In supabase/ liegen überzählige setup-teil-Dateien – bitte „npm run db:bundle“ ausführen.')
  }
  emptyDatabase(DB)
  parts.forEach((text, n) => {
    psql(DB, ['-c', text])
    const open = unprotected(DB)
    if (open) throw new Error(`Nach Teil ${n + 1} sind Tabellen ohne Schutzregeln: ${open}`)
    checks++
  })
  same(DB, 'Die Teile nacheinander')
  parts.forEach((text, n) => {
    psql(DB, ['-c', text])
    same(DB, `Teil ${n + 1} ein zweites Mal`)
  })

  emptyDatabase(DB)
  psql(DB, ['-c', bundle()])
  same(DB, 'supabase/setup.sql als eine Anfrage')
  psql(DB, ['-c', bundle()])
  same(DB, 'supabase/setup.sql ein zweites Mal')
  return checks
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
  try {
    const n = checkSetup(template)
    total += n
    console.log(`✓ Einrichtung von Hand (wiederholbar, Teile, eine Anfrage): ${n} Prüfungen`)
  } catch (e) {
    failed = true
    console.error(`✗ Einrichtung von Hand\n${e.message}`)
  }
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
