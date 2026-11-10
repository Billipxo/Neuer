import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, ChefHat, Home, ShoppingBasket, LineChart } from 'lucide-react'
import { Suspense, type ComponentType } from 'react'
import { Spinner } from '../ui/EmptyState'
import { SyncBanner } from './SyncBanner'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Heute', icon: Home },
  { to: '/rezepte', label: 'Kochbuch', icon: ChefHat },
  { to: '/planer', label: 'Planer', icon: CalendarDays },
  { to: '/einkauf', label: 'Einkauf', icon: ShoppingBasket },
  { to: '/verlauf', label: 'Verlauf', icon: LineChart },
]

export function AppShell({ items = NAV_ITEMS }: { items?: NavItem[] }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:p-3">
        Zum Inhalt springen
      </a>
      <main id="main" className="safe-top px-4 pb-32">
        <SyncBanner />
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <nav
        aria-label="Hauptnavigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 backdrop-blur-lg"
      >
        <ul className="mx-auto flex max-w-lg">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                    isActive ? 'text-brand' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`rounded-full px-4 py-1 transition ${isActive ? 'bg-brand-soft' : ''}`}>
                      <Icon className="size-[22px]" aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
