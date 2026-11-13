import type { PlanItem } from '../types'
import { MEAL_TYPES } from '../types'
import { MEAL_LABELS } from './meals'
import { fmtDayLong } from './dates'
import { fmt1 } from './format'

/** Wochenplan als gut lesbarer Text – zum Verschicken per Messenger oder E-Mail */
export function weekPlanText(items: PlanItem[], days: string[]): string {
  const lines = ['🍽️ Wochenplan']
  for (const day of days) {
    const dayItems = items
      .filter((i) => i.date === day)
      .sort((a, b) => MEAL_TYPES.indexOf(a.meal) - MEAL_TYPES.indexOf(b.meal))
    if (!dayItems.length) continue
    lines.push('', `${fmtDayLong(day)}:`)
    for (const i of dayItems) {
      const servings = Number(i.servings)
      const amount = servings !== 1 ? ` (${fmt1(servings)} Portionen)` : ''
      lines.push(`• ${MEAL_LABELS[i.meal]}: ${i.title}${amount}`)
    }
  }
  return lines.join('\n')
}
