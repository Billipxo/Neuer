import { useId, type ReactNode } from 'react'

/** Ein/Aus-Schalter mit Beschriftung (role="switch") */
export function Switch({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string
  description?: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  icon?: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block font-medium">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          aria-hidden
          className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-7' : 'left-1'}`}
        />
      </button>
    </div>
  )
}
