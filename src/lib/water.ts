/** Freundlicher Trink-Hinweis je nach Fortschritt und Tageszeit (neutral, ohne Druck) */
export function hydrationHint(ml: number, target: number, hour: number): string {
  if (target <= 0) return 'Denk daran, über den Tag verteilt genug zu trinken.'
  const ratio = ml / target
  if (ratio >= 1) return 'Wasserziel erreicht – super!'
  if (ml === 0) return hour < 11 ? 'Starte mit einem Glas Wasser in den Tag.' : 'Zeit für ein Glas Wasser?'
  // grob erwarteter Stand: Ziel gleichmäßig zwischen 7 und 21 Uhr verteilt
  const expected = Math.min(1, Math.max(0, (hour - 7) / 14))
  if (ratio + 0.15 < expected) return 'Denk ans Trinken – ein Glas zwischendurch tut gut.'
  if (ratio >= 0.75) return 'Fast geschafft – noch ein, zwei Gläser.'
  return 'Gut dabei – trink weiter regelmäßig über den Tag.'
}
