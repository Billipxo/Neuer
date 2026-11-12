import type { AmountUnit } from '../types'
import { fmt1 } from './format'

export const UNIT_LABELS: Record<AmountUnit, { one: string; many: string }> = {
  g: { one: 'g', many: 'g' },
  piece: { one: 'Stück', many: 'Stück' },
  serving: { one: 'Portion', many: 'Portionen' },
  tbsp: { one: 'EL', many: 'EL' },
  tsp: { one: 'TL', many: 'TL' },
}

export function fmtAmount(amount: number, unit: AmountUnit): string {
  const l = UNIT_LABELS[unit]
  return `${fmt1(amount)} ${amount === 1 ? l.one : l.many}`
}
