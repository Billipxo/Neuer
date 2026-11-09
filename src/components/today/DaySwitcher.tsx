import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../ui/Button'
import { relativeDayLabel, shiftISO, todayISO } from '../../lib/dates'

export function DaySwitcher({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayISO()
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Vorheriger Tag" onClick={() => onChange(shiftISO(date, -1))}>
        <ChevronLeft className="size-5" />
      </IconButton>
      <button
        type="button"
        onClick={() => onChange(today)}
        className="min-h-11 flex-1 rounded-xl px-2 text-center text-sm font-semibold hover:bg-surface-2"
        aria-label={`${relativeDayLabel(date)} – tippen für heute`}
        aria-live="polite"
      >
        {relativeDayLabel(date)}
      </button>
      <IconButton label="Nächster Tag" onClick={() => onChange(shiftISO(date, 1))}>
        <ChevronRight className="size-5" />
      </IconButton>
    </div>
  )
}
