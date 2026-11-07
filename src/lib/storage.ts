import type { Pothole, Settings, TripSummary } from '../types'

const POTHOLE_KEY = 'pothole-patrol-sa.potholes.v1'
const SETTINGS_KEY = 'pothole-patrol-sa.settings.v1'
const LAST_TRIP_KEY = 'pothole-patrol-sa.last-trip.v1'

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 'balanced',
  vehicle: 'car',
  minSpeedKmh: 15,
  sound: true,
  haptics: true,
  autoGeocode: true,
  showTrail: true,
  keepAwake: true
}

function safeParse(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function loadSettings(): Settings {
  const raw = safeParse(localStorage.getItem(SETTINGS_KEY))
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS
  const candidate = raw as Partial<Settings>
  return {
    sensitivity: ['low', 'balanced', 'high'].includes(candidate.sensitivity ?? '')
      ? (candidate.sensitivity as Settings['sensitivity'])
      : DEFAULT_SETTINGS.sensitivity,
    vehicle: ['car', 'suv', 'taxi', 'bus', 'truck'].includes(candidate.vehicle ?? '')
      ? (candidate.vehicle as Settings['vehicle'])
      : DEFAULT_SETTINGS.vehicle,
    minSpeedKmh:
      typeof candidate.minSpeedKmh === 'number'
        ? Math.min(60, Math.max(5, Math.round(candidate.minSpeedKmh)))
        : DEFAULT_SETTINGS.minSpeedKmh,
    sound: typeof candidate.sound === 'boolean' ? candidate.sound : DEFAULT_SETTINGS.sound,
    haptics:
      typeof candidate.haptics === 'boolean' ? candidate.haptics : DEFAULT_SETTINGS.haptics,
    autoGeocode:
      typeof candidate.autoGeocode === 'boolean'
        ? candidate.autoGeocode
        : DEFAULT_SETTINGS.autoGeocode,
    showTrail:
      typeof candidate.showTrail === 'boolean' ? candidate.showTrail : DEFAULT_SETTINGS.showTrail,
    keepAwake:
      typeof candidate.keepAwake === 'boolean' ? candidate.keepAwake : DEFAULT_SETTINGS.keepAwake
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable in private mode; the app still works in memory.
  }
}

const SEVERITIES = new Set(['minor', 'moderate', 'severe'])
const SOURCES = new Set(['motion', 'manual', 'demo'])
const STATUSES = new Set(['open', 'reported', 'fixed'])

function normalisePothole(value: unknown): Pothole | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Record<string, unknown>
  if (typeof p.id !== 'string') return null
  if (typeof p.lat !== 'number' || !Number.isFinite(p.lat)) return null
  if (typeof p.lng !== 'number' || !Number.isFinite(p.lng)) return null
  if (typeof p.createdAt !== 'number') return null
  if (typeof p.severity !== 'string' || !SEVERITIES.has(p.severity)) return null

  const severity = p.severity as Pothole['severity']
  const createdAt = p.createdAt
  const peakMs2 = typeof p.peakMs2 === 'number' ? p.peakMs2 : 0

  return {
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    accuracy: typeof p.accuracy === 'number' ? p.accuracy : 0,
    createdAt,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : createdAt,
    severity,
    peakMs2,
    peakG: typeof p.peakG === 'number' ? p.peakG : Number((peakMs2 / 9.80665).toFixed(2)),
    speedKmh: typeof p.speedKmh === 'number' ? p.speedKmh : 0,
    confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
    hits: typeof p.hits === 'number' ? Math.max(1, p.hits) : 1,
    source:
      typeof p.source === 'string' && SOURCES.has(p.source)
        ? (p.source as Pothole['source'])
        : 'motion',
    status:
      typeof p.status === 'string' && STATUSES.has(p.status)
        ? (p.status as Pothole['status'])
        : 'open',
    roadName: typeof p.roadName === 'string' ? p.roadName : undefined,
    suburb: typeof p.suburb === 'string' ? p.suburb : undefined,
    authorityId: typeof p.authorityId === 'string' ? p.authorityId : undefined,
    reportedAt: typeof p.reportedAt === 'number' ? p.reportedAt : undefined,
    fixedAt: typeof p.fixedAt === 'number' ? p.fixedAt : undefined,
    notes: typeof p.notes === 'string' ? p.notes : undefined
  }
}

export function loadPotholes(): Pothole[] {
  const raw = safeParse(localStorage.getItem(POTHOLE_KEY))
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalisePothole)
    .filter((p): p is Pothole => p !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function savePotholes(potholes: Pothole[]) {
  try {
    localStorage.setItem(POTHOLE_KEY, JSON.stringify(potholes))
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadLastTrip(): TripSummary | null {
  const raw = safeParse(localStorage.getItem(LAST_TRIP_KEY))
  if (!raw || typeof raw !== 'object') return null
  const trip = raw as Record<string, unknown>
  if (
    typeof trip.startedAt !== 'number' ||
    typeof trip.endedAt !== 'number' ||
    typeof trip.distanceKm !== 'number' ||
    typeof trip.potholes !== 'number'
  ) {
    return null
  }
  return {
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    distanceKm: trip.distanceKm,
    potholes: trip.potholes,
    demo: trip.demo === true
  }
}

export function saveLastTrip(trip: TripSummary | null) {
  try {
    if (trip === null) localStorage.removeItem(LAST_TRIP_KEY)
    else localStorage.setItem(LAST_TRIP_KEY, JSON.stringify(trip))
  } catch {
    // Ignore storage errors.
  }
}
