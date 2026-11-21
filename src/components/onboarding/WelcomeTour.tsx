import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/data'
import { mealForHour } from '../../lib/meals'
import { TOUR_SLIDES, markTourSeen, tourPending, type TourSlide } from '../../lib/welcomeTour'
import { PENDING_INVITE_KEY } from '../../lib/household'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'

/** Inhalt einer Karte */
function SlideBody({ slide, heading }: { slide: TourSlide; heading: string }) {
  return (
    <>
      <div
        aria-hidden
        className="mx-auto mt-2 flex size-24 items-center justify-center rounded-full bg-brand-soft text-5xl [@media(max-height:700px)]:mt-0 [@media(max-height:700px)]:size-16 [@media(max-height:700px)]:text-4xl"
      >
        {slide.emoji}
      </div>
      <h3 className="mt-4 text-xl font-bold">{heading}</h3>
      <p className="mx-auto mt-2 max-w-sm text-muted">{slide.text}</p>
      {slide.where && <p className="mt-3 text-xs font-medium text-brand">Unten in der Leiste: {slide.where}</p>}
    </>
  )
}

/** Kurze Einführung in wenigen Karten – zum Weiterblättern, Wischen oder Überspringen */
export function WelcomeTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const touchX = useRef<number | null>(null)
  if (!open) return null

  const last = index === TOUR_SLIDES.length - 1
  const name = profile?.name.trim()
  const heading = (i: number) => (i === 0 && name ? `Schön, dass du da bist, ${name}!` : TOUR_SLIDES[i].title)
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
          {/* Über der Hauptzeile: So bleibt „Los geht’s“ genau dort, wo eben noch „Weiter“ war – schnelles Durchtippen
              schließt nur die Einführung, statt aus Versehen woanders zu landen */}
          {last && (
            <Button
              variant="ghost"
              block
              onClick={() => {
                close()
                navigate(`/hinzufuegen?meal=${mealForHour(new Date().getHours())}`)
              }}
            >
              Erste Mahlzeit eintragen
            </Button>
          )}
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
        </div>
      }
    >
      <div
        className="pb-2 text-center"
        aria-live="polite"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
        }}
      >
        <div className="grid">
          {/* Alle Karten unsichtbar übereinander: Das Fenster ist so hoch wie die längste Karte und springt beim Blättern nicht */}
          {TOUR_SLIDES.map((s, i) => (
            <div key={s.title} aria-hidden className="invisible col-start-1 row-start-1">
              <SlideBody slide={s} heading={heading(i)} />
            </div>
          ))}
          <div key={index} className="col-start-1 row-start-1 animate-fade-up">
            <SlideBody slide={TOUR_SLIDES[index]} heading={heading(index)} />
          </div>
        </div>
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
          {TOUR_SLIDES.map((s, i) => (
            <span key={s.title} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-brand' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted tabular">
          {index + 1} von {TOUR_SLIDES.length}
        </p>
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
