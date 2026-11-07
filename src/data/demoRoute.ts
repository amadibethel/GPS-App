import type { LatLng } from '../types'
import { bearingDegrees, haversineMeters } from '../lib/geo'

/** A simulated drive around the Sandton CBD, Johannesburg. */
const ROUTE: LatLng[] = [
  { lat: -26.1072, lng: 28.054 },
  { lat: -26.1048, lng: 28.0562 },
  { lat: -26.102, lng: 28.0586 },
  { lat: -26.099, lng: 28.0606 },
  { lat: -26.0962, lng: 28.0624 },
  { lat: -26.094, lng: 28.0652 },
  { lat: -26.093, lng: 28.0688 },
  { lat: -26.0942, lng: 28.0722 },
  { lat: -26.0968, lng: 28.0744 },
  { lat: -26.0998, lng: 28.0748 },
  { lat: -26.1026, lng: 28.0732 },
  { lat: -26.1052, lng: 28.0706 },
  { lat: -26.107, lng: 28.0676 },
  { lat: -26.1078, lng: 28.064 },
  { lat: -26.1078, lng: 28.06 },
  { lat: -26.1072, lng: 28.054 }
]

interface RoutePoint extends LatLng {
  distance: number
}

function buildTable(step = 4): RoutePoint[] {
  const points: RoutePoint[] = []
  let distance = 0
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const from = ROUTE[i]
    const to = ROUTE[i + 1]
    const length = haversineMeters(from, to)
    const steps = Math.max(1, Math.ceil(length / step))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      points.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
        distance
      })
      distance += length / steps
    }
  }
  points.push({ ...ROUTE[ROUTE.length - 1], distance })
  return points
}

const TABLE = buildTable()
export const DEMO_TOTAL_M = TABLE[TABLE.length - 1].distance

const NUMERIC_ZONES = [
  { at: 180, peak: 22 },
  { at: 480, peak: 38 },
  { at: 820, peak: 14 },
  { at: 1_180, peak: 44 },
  { at: 1_540, peak: 19 },
  { at: 1_900, peak: 28 },
  { at: 2_250, peak: 13 },
  { at: 2_620, peak: 35 },
  { at: 2_980, peak: 24 },
  { at: 3_340, peak: 15 }
]

const ZONE_HALF_WIDTH_M = 11

function wrapDistance(distance: number): number {
  return ((distance % DEMO_TOTAL_M) + DEMO_TOTAL_M) % DEMO_TOTAL_M
}

export function demoPointAt(distance: number): LatLng {
  const target = wrapDistance(distance)
  let low = 0
  let high = TABLE.length - 1
  while (low < high - 1) {
    const mid = (low + high) >> 1
    if (TABLE[mid].distance <= target) low = mid
    else high = mid
  }
  const a = TABLE[low]
  const b = TABLE[Math.min(low + 1, TABLE.length - 1)]
  const span = b.distance - a.distance
  const t = span === 0 ? 0 : (target - a.distance) / span
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t
  }
}

export function demoHeadingAt(distance: number): number {
  return bearingDegrees(demoPointAt(distance), demoPointAt(distance + 15))
}

/** Simulated suspension vibration. Returns a gravity-compensated magnitude (m/s²). */
export function demoDeviationAt(distance: number, elapsedSeconds: number): number {
  const wrapped = wrapDistance(distance)
  let impact = 0
  for (const zone of NUMERIC_ZONES) {
    const raw = Math.abs(wrapped - zone.at)
    const delta = Math.min(raw, DEMO_TOTAL_M - raw)
    if (delta < ZONE_HALF_WIDTH_M) {
      const shape = 1 - delta / ZONE_HALF_WIDTH_M
      impact = Math.max(impact, zone.peak * Math.pow(shape, 0.7))
    }
  }

  const roadNoise =
    0.5 +
    Math.random() * 1.5 +
    Math.abs(Math.sin(elapsedSeconds * 2.1)) * 0.7 +
    Math.abs(Math.sin(elapsedSeconds * 0.37)) * 0.4

  return Math.max(roadNoise, impact)
}

export { ROUTE as DEMO_ROUTE }
