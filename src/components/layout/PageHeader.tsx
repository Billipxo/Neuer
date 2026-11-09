import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from '../ui/Button'

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  back?: boolean | string
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-1 pb-2 pt-4">
      {back && (
        <IconButton
          label="Zurück"
          className="-ml-2"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        >
          <ChevronLeft className="size-6" />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  )
}
