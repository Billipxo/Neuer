const intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })
const oneFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

/** Ganze Zahl im deutschen Format, z. B. 2.150 */
export function fmtInt(n: number): string {
  return intFmt.format(Math.round(n))
}

/** Bis zu einer Nachkommastelle, z. B. 12,5 */
export function fmt1(n: number): string {
  return oneFmt.format(n)
}

export function fmtKcal(n: number): string {
  return `${fmtInt(n)} kcal`
}

export function fmtGrams(n: number): string {
  return `${fmt1(n)} g`
}

/** Deutsche Zahleneingabe („1,5“ oder „1.5“) in eine Zahl umwandeln. Leere Eingabe → null. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/\s/g, '')
  if (!s) return null
  // „1.234,5“ → „1234.5“; „1,5“ → „1.5“; „1.5“ bleibt
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}
