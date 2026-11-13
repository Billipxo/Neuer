/** Kleines Symbol für die Heißluftfritteuse (Korb mit Luftstrom) */
export function AirfryerIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="4" />
      <path d="M4 10h16" />
      <path d="M9 14c1-1 2 1 3 0s2 1 3 0" />
      <path d="M10 6.5h4" />
    </svg>
  )
}
