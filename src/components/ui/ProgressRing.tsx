import { fmtInt } from '../../lib/format'

interface Props {
  consumed: number
  target: number
  size?: number
}

/** Großer Fortschrittsring für die Tageskalorien */
export function ProgressRing({ consumed, target, size = 220 }: Props) {
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = target > 0 ? consumed / target : 0
  const shown = Math.min(ratio, 1)
  const over = ratio > 1.1
  const remaining = target - consumed
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--c-over)' : 'var(--c-brand)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        role="img"
        aria-label={`${fmtInt(consumed)} von ${fmtInt(target)} kcal gegessen, ${
          remaining >= 0 ? `${fmtInt(remaining)} kcal übrig` : `${fmtInt(-remaining)} kcal über dem Ziel`
        }`}
      >
        <span className="text-4xl font-bold tabular">{fmtInt(Math.abs(remaining))}</span>
        <span className="text-sm text-muted">{remaining >= 0 ? 'kcal übrig' : 'kcal über Ziel'}</span>
        <span className="mt-2 text-xs text-muted tabular">
          {fmtInt(consumed)} / {fmtInt(target)} kcal
        </span>
      </div>
    </div>
  )
}
