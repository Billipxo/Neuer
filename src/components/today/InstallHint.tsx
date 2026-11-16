import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, X } from 'lucide-react'
import { useInstall } from '../../app/install'
import { useToast } from '../ui/Toast'

const DISMISSED_KEY = 'teller-tipp-installieren'

/** Einmaliger Hinweis auf dem Handy: Teller als App installieren – verschwindet nach „ausblenden“ oder der Installation */
export function InstallHint() {
  const install = useInstall()
  const toast = useToast()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  })
  // Nur auf Geräten mit Touch-Bedienung (Handy, Tablet) – am Rechner stört der Hinweis eher
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
  if (hidden || install.installed || !touch) return null

  function dismiss() {
    setHidden(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ohne Speicher erscheint der Hinweis beim nächsten Öffnen wieder
    }
  }

  return (
    <div role="note" className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-soft px-3 py-2 text-sm animate-fade-up">
      <Smartphone className="size-5 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1">
        Teller als App auf den Startbildschirm?{' '}
        {install.canPrompt ? (
          <button
            type="button"
            className="font-semibold text-brand underline"
            onClick={async () => {
              if (await install.prompt()) {
                toast('Teller wird installiert', '📲')
                dismiss()
              }
            }}
          >
            Installieren
          </button>
        ) : (
          <Link to="/profil#app" className="font-semibold text-brand underline">
            So geht’s
          </Link>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis ausblenden"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
