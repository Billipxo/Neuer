import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOUR_SLIDES, markTourPending, markTourSeen, tourPending } from './welcomeTour'

/** Minimaler Ersatz für localStorage (die Tests laufen ohne Browser) */
function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('Kurze Einführung', () => {
  it('erscheint einmal nach der Einrichtung – danach nicht mehr von selbst', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    expect(tourPending()).toBe(false)
    markTourPending()
    expect(tourPending()).toBe(true)
    markTourSeen()
    expect(tourPending()).toBe(false)
  })
  it('kommt ohne Speicher zurecht', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('gesperrt')
      },
      setItem: () => {
        throw new Error('gesperrt')
      },
    })
    expect(() => markTourPending()).not.toThrow()
    expect(tourPending()).toBe(false)
  })
  it('erscheint auch bei vollem Speicher nicht immer wieder', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    markTourPending()
    // ab jetzt ist der Speicher voll: Schreiben schlägt fehl, Entfernen geht
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    markTourSeen()
    expect(tourPending()).toBe(false)
    expect(storage.getItem('teller-einfuehrung')).toBeNull()
  })
  it('gilt in dieser Sitzung als gesehen, selbst wenn der Speicher gar nichts annimmt', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'offen',
      setItem: () => {
        throw new Error('gesperrt')
      },
      removeItem: () => {
        throw new Error('gesperrt')
      },
    })
    markTourPending()
    expect(tourPending()).toBe(true)
    markTourSeen()
    expect(tourPending()).toBe(false)
    // nach einer neuen Einrichtung wieder offen
    markTourPending()
    expect(tourPending()).toBe(true)
  })
  it('bleibt kurz, nennt die Bereiche der App und verspricht nichts', () => {
    expect(TOUR_SLIDES.length).toBeLessThanOrEqual(5)
    const text = TOUR_SLIDES.map((s) => `${s.title} ${s.text}`).join(' ')
    for (const area of ['Essen eintragen', 'Kochbuch', 'Einkaufsliste', 'Verlauf']) expect(text).toContain(area)
    expect(text).not.toMatch(/gesund|abnehm|schlank|garantiert|verbrenn/i)
  })
})
