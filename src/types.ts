export type Tab = 'drive' | 'map' | 'log' | 'settings'

export interface LatLng {
  lat: number
  lng: number
}

export type Severity = 'minor' | 'moderate' | 'severe'

export type PotholeStatus = 'open' | 'reported' | 'fixed'

export type PotholeSource = 'motion' | 'manual' | 'demo'

export interface Pothole extends LatLng {
  id: string
  accuracy: number
  createdAt: number
  updatedAt: number
  severity: Severity
  peakMs2: number
  peakG: number
  speedKmh: number
  confidence: number
  hits: number
  source: PotholeSource
  status: PotholeStatus
  roadName?: string
  suburb?: string
  authorityId?: string
  reportedAt?: number
  fixedAt?: number
  notes?: string
}

export interface DetectionResult {
  peakMs2: number
  peakG: number
  durationMs: number
  samples: number
  speedKmh: number
  timestamp: number
  severity: Severity
  confidence: number
}

export interface DetectionContext extends LatLng {
  accuracy: number
  speedKmh: number
}

export type Sensitivity = 'low' | 'balanced' | 'high'

export type VehicleType = 'car' | 'suv' | 'taxi' | 'bus' | 'truck'

export interface Settings {
  sensitivity: Sensitivity
  vehicle: VehicleType
  minSpeedKmh: number
  sound: boolean
  haptics: boolean
  autoGeocode: boolean
  showTrail: boolean
  keepAwake: boolean
}

export type SensorStatus =
  | 'idle'
  | 'waiting'
  | 'active'
  | 'simulated'
  | 'denied'
  | 'unsupported'
  | 'no-signal'

export interface TripSummary {
  startedAt: number
  endedAt: number
  distanceKm: number
  potholes: number
  demo: boolean
}

export type AuthorityType = 'metro' | 'national'

export interface Authority {
  id: string
  name: string
  shortName: string
  province: string
  type: AuthorityType
  center: LatLng
  phones: string[]
  email?: string
  website: string
  note?: string
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}
