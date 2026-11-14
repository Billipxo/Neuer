interface Option<T extends string> {
  value: T
  label: string
}

/** Segment-Auswahl als Radiogruppe (tastatur- und screenreaderfreundlich) */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-1 rounded-2xl bg-surface-2 p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-10 flex-1 rounded-xl px-2 text-sm font-medium transition ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({
  active,
  children,
  onClick,
  label,
  disabled,
}: {
  active?: boolean
  children: React.ReactNode
  onClick?: () => void
  /** Beschriftung für Screenreader, wenn der sichtbare Text nicht ausreicht (z. B. mit Anzahl) */
  label?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40 ${
        active ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-ink hover:bg-line/70'
      }`}
    >
      {children}
    </button>
  )
}
