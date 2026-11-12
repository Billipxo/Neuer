import type { LogEntry } from '../types'
import { MEAL_LABELS } from './meals'

/** CSV-Feld escapen (Semikolon als Trenner, wie in deutschem Excel üblich) */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'number' ? String(Math.round(v * 10) / 10).replace('.', ',') : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // BOM, damit Excel Umlaute korrekt erkennt
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

export function logToCsv(entries: LogEntry[]): string {
  const sorted = [...entries].sort((a, b) => (a.date + a.meal).localeCompare(b.date + b.meal))
  return toCsv(
    ['Datum', 'Mahlzeit', 'Name', 'Menge', 'Einheit', 'Gramm', 'kcal', 'Eiweiß (g)', 'Kohlenhydrate (g)', 'Fett (g)'],
    sorted.map((e) => [
      e.date,
      MEAL_LABELS[e.meal],
      e.name,
      Number(e.amount),
      { g: 'g', piece: 'Stück', serving: 'Portion', tbsp: 'EL', tsp: 'TL' }[e.unit],
      e.grams === null ? null : Number(e.grams),
      Number(e.kcal),
      Number(e.protein),
      Number(e.carbs),
      Number(e.fat),
    ]),
  )
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
