import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchProducts, thumbUrl } from './openFoodFacts'

const hit = (name: string) => ({ code: name, product_name: name, nutriments: { 'energy-kcal_100g': 100 } })
const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Open Food Facts – Bilder', () => {
  it('nimmt für die Trefferliste die kleine Vorschau', () => {
    expect(thumbUrl('https://images.openfoodfacts.org/images/products/400/1/front_de.12.200.jpg')).toBe(
      'https://images.openfoodfacts.org/images/products/400/1/front_de.12.100.jpg',
    )
    expect(thumbUrl('https://static.openfoodfacts.org/images/products/400/1/front_de.3.400.jpg')).toMatch(/\.100\.jpg$/)
    // andere Adressen und eigene Bilder bleiben, wie sie sind
    expect(thumbUrl('https://example.org/bild.200.jpg')).toBe('https://example.org/bild.200.jpg')
    expect(thumbUrl(null)).toBeNull()
  })
})

describe('Open Food Facts – Suche', () => {
  it('weicht auf die klassische Suche aus, wenn die neue nicht antwortet', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('https://search.openfoodfacts.org/')) {
        // hängt – bis die Wartezeit abläuft
        return new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('abgebrochen', 'AbortError'))),
        )
      }
      return Promise.resolve(json({ products: [hit('Skyr')] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = searchProducts('Skyr')
    await vi.advanceTimersByTimeAsync(8100)
    expect((await result).map((p) => p.name)).toEqual(['Skyr'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('weicht auch bei einem Fehler der neuen Suche aus', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(url.startsWith('https://search.') ? new Response('', { status: 503 }) : json({ products: [hit('Quark')] })),
      ),
    )
    expect((await searchProducts('Quark')).map((p) => p.name)).toEqual(['Quark'])
  })
  it('bricht ab, wenn eine neue Eingabe die Suche ersetzt', async () => {
    const ctrl = new AbortController()
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new DOMException('abgebrochen', 'AbortError'))),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = searchProducts('Brot', ctrl.signal)
    ctrl.abort()
    await expect(result).rejects.toThrow()
    // keine Ausweich-Suche nach einem Abbruch von außen
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
