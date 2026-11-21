import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/data'
import { mealForHour } from '../../lib/meals'
import { TOUR_SLIDES, markTourSeen, tourPending } from '../../lib/welcomeTour'
import { PENDING_INVITE_KEY } from '../../lib/household'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'

/** Kurze Einführung in wenigen Karten – zum Weiterblättern, Wischen oder Überspringen */
export function WelcomeTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const touchX = useRef<number | null>(null)
  if (!open) return null

  const slide = TOUR_SLIDES[index]
  const last = index === TOUR_SLIDES.length - 1
  const name = profile?.name.trim()
  const close = () => {
    markTourSeen()
    setIndex(0)
    onClose()
  }
  const go = (to: number) => setIndex(Math.max(0, Math.min(TOUR_SLIDES.length - 1, to)))

  return (
    <Sheet
      open
      onClose={close}
      title="Kurz erklärt"
      footer={
        <div className="space-y-2">
          <div className="flex gap-3">
            {index === 0 ? (
              <Button variant="ghost" onClick={close}>
                Überspringen
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => go(index - 1)}>
                Zurück
              </Button>
            )}
            <Button className="flex-1" size="lg" onClick={() => (last ? close() : go(index + 1))}>
              {last ? 'Los geht’s' : 'Weiter'}
            </Button>
          </div>
          {last && (
            <Button
              variant="ghost"
              block
              onClick={() => {
                close()
                navigate(`/hinzufuegen?meal=${mealForHour(new Date().getHours())}`)
              }}
            >
              Gleich die erste Mahlzeit eintragen
            </Button>
          )}
        </div>
      }
    >
      <div
        className="pb-2 text-center"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
        }}
      >
        <div key={index} className="animate-fade-up" aria-live="polite">
          <div aria-hidden className="mx-auto mt-2 flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
            {slide.emoji}
          </div>
          <h3 className="mt-4 text-xl font-bold">{index === 0 && name ? `Schön, dass du da bist, ${name}!` : slide.title}</h3>
          <p className="mx-auto mt-2 max-w-sm text-muted">{slide.text}</p>
          {slide.where && <p className="mt-3 text-xs font-medium text-brand">Unten in der Leiste: {slide.where}</p>}
          <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
            {TOUR_SLIDES.map((s, i) => (
              <span key={s.title} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-brand' : 'w-1.5 bg-line'}`} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted tabular">
            {index + 1} von {TOUR_SLIDES.length}
          </p>
        </div>
      </div>
    </Sheet>
  )
}

function invitePending(): boolean {
  try {
    return Boolean(localStorage.getItem(PENDING_INVITE_KEY))
  } catch {
    return false
  }
}

/**
 * Zeigt die Einführung einmal direkt nach der Einrichtung – sobald kein anderes Fenster offen ist. Wer über einen
 * Einladungslink kommt, landet gleich beim Beitritt zum Haushalt (mit eigener Begrüßung); dann entfällt sie, und im
 * Profil lässt sie sich jederzeit öffnen.
 */
export function FirstRunTour() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!tourPending()) return
    if (invitePending()) {
      markTourSeen()
      return
    }
    const t = setInterval(() => {
      if (document.querySelector('[role="dialog"]')) return
      clearInterval(t)
      setOpen(true)
    }, 300)
    return () => clearInterval(t)
  }, [])
  return <WelcomeTour open={open} onClose={() => setOpen(false)} />
}
