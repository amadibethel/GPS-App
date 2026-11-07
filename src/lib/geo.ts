import type { LatLng } from '../types'

const EARTH_RADIUS_M = 6_371_008.8

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRad
  const dLng = (b.lng - a.lng) * toRad
  const lat1 = a.lat * toRad
  const lat2 = b.lat * toRad

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const toRad = Math.PI / 180
  const lat1 = a.lat * toRad
  const lat2 = b.lat * toRad
  const dLng = (b.lng - a.lng) * toRad
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180) / Math.PI
}

export function moveTowards(a: LatLng, b: LatLng, distanceM: number): LatLng {
  const total = haversineMeters(a, b)
  if (total <= distanceM || total === 0) return { ...b }
  const t = distanceM / total
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t
  }
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return '0 km'
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function formatAccuracy(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—'
  return `±${Math.round(meters)} m`
}

export function formatCoord(value: number): string {
  return value.toFixed(5)
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
}

export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ]
}
