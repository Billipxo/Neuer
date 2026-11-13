import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
// @ts-expect-error – reines JS-Skript ohne Typen
import { bundle, bundleParts, partName, PART_LIMIT } from '../../scripts/bundle-sql.mjs'

describe('supabase/setup.sql', () => {
  it('ist aktuell (sonst: npm run db:bundle)', () => {
    expect(readFileSync('supabase/setup.sql', 'utf8')).toBe(bundle())
  })
  it('aktiviert RLS für alle Tabellen', () => {
    const sql = readFileSync('supabase/setup.sql', 'utf8')
    for (const t of ['profiles', 'shopping_items', 'plan_items', 'achievements', 'recipe_variants']) {
      expect(sql).toContain(`alter table public.${t} enable row level security`)
    }
    expect(sql).toContain("array['foods','dishes','log_entries','water_logs','weight_logs']")
  })
})

describe('Einrichtung in Teilen (supabase/setup-teil-N.sql)', () => {
  const parts: string[] = bundleParts()

  it('ist aktuell (sonst: npm run db:bundle)', () => {
    parts.forEach((text, n) => expect(readFileSync(`supabase/${partName(n + 1)}`, 'utf8')).toBe(text))
    expect(readdirSync('supabase').filter((f) => /^setup-teil-\d+\.sql$/.test(f))).toHaveLength(parts.length)
  })

  it('bleibt je Teil deutlich unter 20.000 Zeichen – so viel fügen manche Geräte höchstens ein', () => {
    expect(PART_LIMIT).toBeLessThanOrEqual(15000)
    for (const text of parts) expect(text.length).toBeLessThanOrEqual(PART_LIMIT)
  })

  it('enthält zusammen jede Zeile der großen Datei, in derselben Reihenfolge', () => {
    const lines = (sql: string) => sql.split('\n').filter((l) => l.trim() && !l.startsWith('-- '))
    expect(parts.flatMap(lines)).toEqual(lines(bundle()))
  })
})
