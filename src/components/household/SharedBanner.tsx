import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../../app/auth'
import { useHousehold } from '../../app/household'
import { sharedHint } from '../../lib/household'

/** Hinweis über Plan und Einkaufsliste, dass hier der gemeinsame Bestand des Haushalts zu sehen ist */
export function SharedBanner({ children }: { children?: ReactNode }) {
  const { household } = useHousehold()
  const { userId } = useAuth()
  if (!household) return null
  return (
    <p role="note" className="mb-3 flex items-start gap-2 rounded-2xl bg-brand-soft px-3 py-2 text-sm">
      <Users className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0">
        <strong>{household.name}</strong> · {sharedHint(household, userId)}
        {children}
      </span>
    </p>
  )
}
