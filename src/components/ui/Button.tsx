import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:brightness-110 active:brightness-95 shadow-sm',
  secondary: 'bg-surface-2 text-ink hover:bg-line/60 active:bg-line',
  ghost: 'bg-transparent text-ink hover:bg-surface-2 active:bg-line/60',
  danger: 'bg-danger text-white hover:brightness-110',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'min-h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'min-h-13 px-5 text-base rounded-2xl gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', block, icon, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-surface-2 active:scale-95 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
