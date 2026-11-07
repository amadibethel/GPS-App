export interface GeocodeResult {
  roadName?: string
  suburb?: string
  province?: string
}

interface NominatimAddress {
  road?: string
  pedestrian?: string
  footway?: string
  path?: string
  residential?: string
  highway?: string
  suburb?: string
  neighbourhood?: string
  quarter?: string
  city_district?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  state?: string
}

interface NominatimResponse {
  display_name?: string
  address?: NominatimAddress
}

const cache = new Map<string, GeocodeResult | null>()
let queueTail: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function parseResult(data: NominatimResponse): GeocodeResult | null {
  const address = data.address ?? {}
  const roadName =
    address.road ??
    address.pedestrian ??
    address.residential ??
    address.highway ??
    address.footway ??
    address.path ??
    data.display_name?.split(',')[0]?.trim()
  const suburb =
    address.suburb ??
    address.neighbourhood ??
    address.quarter ??
    address.city_district ??
    address.town ??
    address.city ??
    address.village ??
    address.municipality

  if (!roadName && !suburb) return null
  return { roadName, suburb, province: address.state }
}

/**
 * Reverse geocode with a strict 1 request/second queue, as required by the
 * OpenStreetMap Nominatim usage policy. Results are cached in memory and in the
 * service worker cache.
 */
export function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null)

  const task = queueTail.then(async () => {
    const wait = 1_100 - (Date.now() - lastRequestAt)
    if (wait > 0) await delay(wait)
    lastRequestAt = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse')
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lng))
      url.searchParams.set('zoom', '18')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('accept-language', 'en-ZA,en')

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        referrerPolicy: 'strict-origin-when-cross-origin'
      })
      if (!response.ok) return null
      const data = (await response.json()) as NominatimResponse
      const result = parseResult(data)
      cache.set(key, result)
      return result
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  })

  queueTail = task.catch(() => null)
  return task
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
