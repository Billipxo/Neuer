import { useEffect, useState } from 'react'
import { NumberField } from './Field'
import { fmt1, parseDecimal } from '../../lib/format'

interface Props {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  suffix?: string
  hint?: React.ReactNode
  placeholder?: string
  className?: string
  min?: number
  max?: number
  hideLabel?: boolean
  id?: string
}

function toText(v: number | null) {
  return v === null || Number.isNaN(v) ? '' : fmt1(v).replace(/\./g, '')
}

/** Zahleneingabe mit deutschem Dezimalkomma */
export function NumberInput({ value, onChange, min, max, ...rest }: Props) {
  const [text, setText] = useState(toText(value))

  // Externe Änderungen übernehmen, ohne die laufende Eingabe zu stören
  useEffect(() => {
    if (parseDecimal(text) !== value) setText(toText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <NumberField
      {...rest}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,-]/g, '')
        setText(t)
        let n = parseDecimal(t)
        if (n !== null && min !== undefined && n < min) n = min
        if (n !== null && max !== undefined && n > max) n = max
        onChange(n)
      }}
    />
  )
}
