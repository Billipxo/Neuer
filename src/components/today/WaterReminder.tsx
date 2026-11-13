import { Droplets, Plus } from 'lucide-react'
import { useAddWater } from '../../hooks/data'
import { hydrationHint } from '../../lib/water'
import { fmtInt } from '../../lib/format'
import { todayISO } from '../../lib/dates'
import { useToast } from '../ui/Toast'

/** Kleiner Hinweis, genug zu trinken – mit Fortschritt und Schnell-Button */
export function WaterReminder({ date, ml, target, onOpen }: { date: string; ml: number; target: number; onOpen: () => void }) {
  const add = useAddWater()
  const toast = useToast()
  const pct = target > 0 ? Math.min(100, (ml / target) * 100) : 0
  const done = target > 0 && ml >= target
  const hint = date === todayISO() ? hydrationHint(ml, target, new Date().getHours()) : 'Getrunken an diesem Tag'

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-water/10 p-3 ring-1 ring-water/20">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`${hint} ${fmtInt(ml)} von ${fmtInt(target)} Milliliter. Wasser öffnen`}
      >
        <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-water text-white ${done ? 'animate-pop' : ''}`}>
          <Droplets className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug">{hint}</span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden>
              <span className="block h-full rounded-full bg-water transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="shrink-0 text-xs text-muted tabular">
              {fmtInt(ml)} / {fmtInt(target)} ml
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={async () => {
          await add.mutateAsync({ date, ml: 250 })
          toast('+250 ml Wasser', '💧')
        }}
        disabled={add.isPending}
        aria-label="Ein Glas Wasser (250 Milliliter) hinzufügen"
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-surface px-3 text-sm font-semibold text-water ring-1 ring-water/30 active:scale-95"
      >
        <Plus className="size-4" aria-hidden />
        250
      </button>
    </div>
  )
}
