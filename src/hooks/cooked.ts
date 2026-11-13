import { useMemo } from 'react'
import { useLogRange } from './data'
import { shiftISO, todayISO } from '../lib/dates'
import { cookedStats } from '../lib/recipes'

/** Gekocht-Statistik der letzten 365 Tage (teilt sich den Cache mit den Erfolgen) */
export function useCookedStats() {
  const today = todayISO()
  const { data: log } = useLogRange(shiftISO(today, -365), today)
  return useMemo(() => cookedStats(log ?? []), [log])
}
