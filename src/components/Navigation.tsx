import { NavLink } from 'react-router-dom';

const EINTRAEGE = [
  { pfad: '/', text: 'Start', icon: '🏠' },
  { pfad: '/lernen', text: 'Lernen', icon: '📚' },
  { pfad: '/pruefung', text: 'Prüfung', icon: '⏱️' },
  { pfad: '/statistik', text: 'Statistik', icon: '📊' },
  { pfad: '/mehr', text: 'Mehr', icon: '☰' },
];

export function Navigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <ul className="mx-auto flex max-w-xl">
        {EINTRAEGE.map((e) => (
          <li key={e.pfad} className="flex-1">
            <NavLink
              to={e.pfad}
              end={e.pfad === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  isActive ? 'text-marke-600 dark:text-marke-400' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <span className="text-xl" aria-hidden>
                {e.icon}
              </span>
              {e.text}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
