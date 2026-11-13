import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error – reines JS-Skript ohne Typen
import { bundle } from '../../scripts/bundle-sql.mjs'

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
