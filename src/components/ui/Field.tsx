import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const inputCls =
  'w-full min-h-12 rounded-2xl bg-surface-2 px-4 text-base text-ink placeholder:text-muted/80 ring-1 ring-transparent focus:ring-brand focus:outline-none transition'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  suffix?: string
  hideLabel?: boolean
}

export function Field({ label, hint, suffix, hideLabel, className = '', id, ...rest }: FieldProps) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={fid} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}>
        {label}
      </label>
      <div className="relative">
        <input id={fid} {...rest} className={`${inputCls} ${suffix ? 'pr-14' : ''}`} aria-describedby={hint ? `${fid}-hint` : undefined} />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${fid}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

/** Zahlenfeld mit Dezimal-Tastatur und deutschem Komma */
export function NumberField(props: Omit<FieldProps, 'type' | 'inputMode'>) {
  return <Field {...props} type="text" inputMode="decimal" autoComplete="off" />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className = '', id, ...rest }: SelectProps) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <select id={fid} {...rest} className={`${inputCls} appearance-none bg-[length:16px] pr-10`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: ReactNode
  hideLabel?: boolean
}

/** Mehrzeiliges Textfeld im Stil der übrigen Eingabefelder */
export function TextArea({ label, hint, hideLabel, className = '', id, ...rest }: TextAreaProps) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <div className={className}>
      <label htmlFor={fid} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}>
        {label}
      </label>
      <textarea id={fid} {...rest} className={`${inputCls} min-h-20 resize-y py-3 leading-relaxed`} aria-describedby={hint ? `${fid}-hint` : undefined} />
      {hint && (
        <p id={`${fid}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
