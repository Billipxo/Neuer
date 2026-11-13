// Fügt alle Migrationen zu supabase/setup.sql zusammen (zum Einfügen in den Supabase SQL Editor) und schreibt
// dieselbe Einrichtung zusätzlich in kleineren Teilen (supabase/setup-teil-N.sql): Manche Geräte schneiden lange
// Texte beim Einfügen ab (beobachtet: nach 20.000 Zeichen) – dann scheitert die große Datei mit „syntax error“.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Höchstlänge eines Teils in Zeichen – mit deutlichem Abstand unter der beobachteten Grenze von 20.000 */
export const PART_LIMIT = 15000

/**
 * Getrennt wird zwischen zwei Migrationen oder innerhalb einer Migration an einer Zeile mit dieser Markierung.
 * Die Markierung steht nur dort, wo ein Teil für sich einen sicheren Stand hinterlässt (keine Tabelle ohne Schutzregeln).
 */
export const PART_MARKER = '-- [Teilgrenze]'

function migrations(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => `-- ===== ${f} =====\n${readFileSync(join(dir, f), 'utf8').trim()}\n`)
}

export function bundle(dir = 'supabase/migrations') {
  const header =
    '-- Teller – komplette Datenbank-Einrichtung\n' +
    '-- Diese Datei wird automatisch aus supabase/migrations/ erzeugt (npm run db:bundle).\n' +
    '-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run.\n' +
    '-- Bricht das Einfügen ab („syntax error“), stattdessen setup-teil-1.sql, -2 und -3 nacheinander ausführen.\n\n'
  return header + migrations(dir).join('\n')
}

/** Dieselbe Einrichtung in Teilen von höchstens PART_LIMIT Zeichen */
export function bundleParts(dir = 'supabase/migrations', limit = PART_LIMIT) {
  // Stücke, zwischen denen getrennt werden darf
  const pieces = migrations(dir).flatMap((text) => {
    const out = ['']
    for (const line of text.split('\n')) {
      if (line.startsWith(PART_MARKER)) out.push('')
      out[out.length - 1] += `${line}\n`
    }
    return out.map((piece) => piece.trimEnd() + '\n')
  })
  const header = (n, of) =>
    `-- Teller – Datenbank-Einrichtung, Teil ${n} von ${of}\n` +
    '-- Erzeugt aus supabase/migrations/ (npm run db:bundle). Die Teile der Reihe nach ausführen:\n' +
    '-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run. Jeder Teil lässt sich gefahrlos wiederholen.\n\n'
  const room = limit - header(9, 9).length
  const bodies = []
  let current = ''
  for (const piece of pieces) {
    if (piece.length > room) throw new Error(`Ein Stück der Einrichtung ist länger als ${room} Zeichen – weitere „${PART_MARKER}“ setzen.`)
    if (current && current.length + 1 + piece.length > room) {
      bodies.push(current)
      current = ''
    }
    current += (current ? '\n' : '') + piece
  }
  if (current.trim()) bodies.push(current)
  return bodies.map((body, n) => header(n + 1, bodies.length) + body)
}

export const partName = (n) => `setup-teil-${n}.sql`

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync('supabase/setup.sql', bundle())
  const parts = bundleParts()
  for (const f of readdirSync('supabase').filter((f) => /^setup-teil-\d+\.sql$/.test(f))) rmSync(join('supabase', f))
  parts.forEach((text, n) => writeFileSync(join('supabase', partName(n + 1)), text))
  console.log(`supabase/setup.sql geschrieben, dazu ${parts.length} Teile (${parts.map((p) => p.length).join(', ')} Zeichen)`)
}
