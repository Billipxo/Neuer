import { useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { fmtDate } from '../../lib/dates'

/**
 * Datumsfeld, das immer deutsch anzeigt (TT.MM.JJJJ) – unabhängig von der Sprache des Browsers, die sonst z. B.
 * 11/20/2026 zeigen würde. Darüber liegt unsichtbar das native Datumsfeld: Antippen öffnet wie gewohnt den Kalender
 * des Geräts, Tastatur und Vorlesefunktion bedienen das echte Feld.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  className = '',
  hideLabel,
}: {
  label: string
  /** yyyy-MM-dd */
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  className?: string
  hideLabel?: boolean
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}>
        {label}
      </label>
      <div className="group relative">
        <div
          aria-hidden
          className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-surface-2 px-4 text-base text-ink ring-1 ring-transparent transition group-focus-within:ring-brand"
        >
          <span className={`tabular ${value ? '' : 'text-muted/80'}`}>{value ? fmtDate(value) : 'TT.MM.JJJJ'}</span>
          <CalendarDays className="size-5 text-muted" />
        </div>
        <input
          id={id}
          type="date"
          lang="de"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            // Am Computer öffnet ein Klick sonst nur die Eingabe – lieber gleich den Kalender zeigen
            try {
              e.currentTarget.showPicker?.()
            } catch {
              // ältere Browser: die normale Eingabe genügt
            }
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}
