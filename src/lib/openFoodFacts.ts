import type { Food } from '../types'

/** Produkt aus Open Food Facts, auf unser Format reduziert (Nährwerte pro 100 g). */
export type OffProduct = Pick<
  Food,
  'name' | 'brand' | 'barcode' | 'kcal_100' | 'protein_100' | 'carbs_100' | 'fat_100' | 'serving_g' | 'image_url'
>

const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'generic_name_de',
  'brands',
  'nutriments',
  'serving_quantity',
  'image_front_small_url',
  'image_small_url',
].join(',')

interface RawProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  generic_name_de?: string
  brands?: string | string[]
  nutriments?: Record<string, number | string | undefined>
  serving_quantity?: number | string
  image_front_small_url?: string
  image_small_url?: string
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

/** Rohdaten in unser Format überführen. Produkte ohne Namen oder Energieangabe werden verworfen. */
export function normalizeOffProduct(p: RawProduct): OffProduct | null {
  const name = (p.product_name_de || p.product_name || p.generic_name_de || '').trim()
  const n = p.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
    if (kj !== null) kcal = kj / 4.184
  }
  if (!name || kcal === null) return null
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0]
  const serving = num(p.serving_quantity)
  return {
    name,
    brand: brand?.trim() || null,
    barcode: p.code ?? null,
    kcal_100: Math.round(kcal),
    protein_100: round1(num(n['proteins_100g']) ?? 0),
    carbs_100: round1(num(n['carbohydrates_100g']) ?? 0),
    fat_100: round1(num(n['fat_100g']) ?? 0),
    serving_g: serving && serving > 0 ? serving : null,
    image_url: p.image_front_small_url || p.image_small_url || null,
  }
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Open Food Facts antwortet mit ${res.status}`)
  return res.json()
}

/** Suche nach Name. Nutzt die neue Such-API und fällt bei Fehlern auf die klassische Suche zurück. */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const q = query.trim()
  if (q.length < 2) return []
  let raw: RawProduct[] = []
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=de&page_size=25&fields=${FIELDS}`
    const data = (await getJson(url, signal)) as { hits?: RawProduct[] }
    raw = data.hits ?? []
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
      `&search_simple=1&action=process&json=1&lc=de&page_size=25&fields=${FIELDS}`
    const data = (await getJson(url, signal)) as { products?: RawProduct[] }
    raw = data.products ?? []
  }
  const seen = new Set<string>()
  const out: OffProduct[] = []
  for (const r of raw) {
    const p = normalizeOffProduct(r)
    if (!p) continue
    const key = p.barcode ?? `${p.name}|${p.brand}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

/** Produkt per Barcode laden. null, wenn nicht gefunden. */
export async function getProductByBarcode(barcode: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const code = barcode.replace(/\D/g, '')
  if (!code) return null
  const data = (await getJson(
    `https://world.openfoodfacts.org/api/v2/product/${code}?fields=${FIELDS}`,
    signal,
  )) as { status?: number; product?: RawProduct }
  if (data.status !== 1 || !data.product) return null
  return normalizeOffProduct({ ...data.product, code: data.product.code ?? code })
}
