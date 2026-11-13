import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Wächter für die Startzeit: Was `src/main.tsx` statisch importiert, landet im ersten Paket, das beim Öffnen der App
 * geladen und ausgeführt wird. Das Kochbuch (rund 600 kB), das Kochwissen und die großen Bibliotheken für Diagramme
 * und Barcode-Scan dürfen dort nicht hineinrutschen – sie werden erst geladen, wenn die jeweilige Seite geöffnet wird.
 */
const SRC = path.dirname(fileURLToPath(import.meta.url))

function resolveLocal(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null
  const base = path.resolve(path.dirname(from), spec)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Statische Importe einer Datei (ohne `import type` und ohne dynamisches `import()`) */
function staticImports(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false)
  const out: string[] = []
  for (const st of source.statements) {
    if (ts.isImportDeclaration(st) && !st.importClause?.isTypeOnly && ts.isStringLiteral(st.moduleSpecifier)) out.push(st.moduleSpecifier.text)
    if (ts.isExportDeclaration(st) && !st.isTypeOnly && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) out.push(st.moduleSpecifier.text)
  }
  return out
}

/** Alle Module und Pakete, die vom Einstieg aus ohne dynamischen Import erreichbar sind */
function startGraph() {
  const entry = path.join(SRC, 'main.tsx')
  const parent = new Map<string, string | null>([[entry, null]])
  const packages = new Map<string, string>()
  const queue = [entry]
  while (queue.length) {
    const file = queue.shift()!
    if (!/\.tsx?$/.test(file)) continue
    for (const spec of staticImports(file)) {
      const local = resolveLocal(file, spec)
      if (local) {
        if (!parent.has(local)) {
          parent.set(local, file)
          queue.push(local)
        }
      } else if (!spec.startsWith('.') && !packages.has(spec)) packages.set(spec, file)
    }
  }
  const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/')
  const chain = (f: string) => {
    const steps: string[] = []
    for (let c: string | null | undefined = f; c; c = parent.get(c)) steps.push(rel(c))
    return steps.reverse().join(' → ')
  }
  return { modules: new Map([...parent.keys()].map((f) => [rel(f), chain(f)])), packages: new Map([...packages].map(([p, f]) => [p, chain(f)])) }
}

describe('Start-Paket', () => {
  const graph = startGraph()

  it('findet den Einstieg und die Startseite', () => {
    expect(graph.modules.has('App.tsx')).toBe(true)
    expect(graph.modules.has('pages/TodayPage.tsx')).toBe(true)
    // Seiten hinter lazy() gehören nicht dazu
    expect(graph.modules.has('pages/RecipesPage.tsx')).toBe(false)
  })

  it.each(['data/recipes.json', 'lib/recipes.ts', 'data/guides.ts', 'data/ingredients.ts'])('lädt %s nicht schon beim Start', (file) => {
    // Bei einem Fehler zeigt die Meldung die Import-Kette, über die die Datei hineingeraten ist
    expect(graph.modules.get(file) ?? 'nicht im Start-Paket').toBe('nicht im Start-Paket')
  })

  it.each(['recharts', 'html5-qrcode'])('lädt die Bibliothek %s nicht schon beim Start', (pkg) => {
    const hit = [...graph.packages].find(([name]) => name === pkg || name.startsWith(`${pkg}/`))
    expect(hit?.[1] ?? 'nicht im Start-Paket').toBe('nicht im Start-Paket')
  })
})
