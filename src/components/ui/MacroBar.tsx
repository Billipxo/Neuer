import { fmtInt } from '../../lib/format'

interface Props {
  label: string
  value: number
  target: number
  color: string
}

export function MacroBar({ label, value, target, color }: Props) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-1 text-xs">
        <span className="font-medium">{label}</span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(target)}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${fmtInt(value)} von ${fmtInt(target)} Gramm`}
      >
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-1 text-xs text-muted tabular">
        {fmtInt(value)} / {fmtInt(target)} g
      </div>
    </div>
  )
}
