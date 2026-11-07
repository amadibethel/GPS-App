import type { DetectionResult, Severity, Settings } from '../types'

export const SENSITIVITY_BASE: Record<Settings['sensitivity'], number> = {
  low: 17,
  balanced: 11.5,
  high: 7.5
}

export const VEHICLE_FACTORS: Record<Settings['vehicle'], number> = {
  car: 1,
  suv: 0.95,
  taxi: 1.06,
  bus: 1.3,
  truck: 1.45
}

const MAX_PLAUSIBLE_MS2 = 160
const REFRACTORY_MS = 3_000
const CANDIDATE_GAP_MS = 180
const CANDIDATE_MAX_MS = 550

export function detectionThreshold(settings: Settings): number {
  return SENSITIVITY_BASE[settings.sensitivity] * VEHICLE_FACTORS[settings.vehicle]
}

export function severityForPeak(peakMs2: number): Severity {
  if (peakMs2 >= 26) return 'severe'
  if (peakMs2 >= 14) return 'moderate'
  return 'minor'
}

function confidenceFor(
  peakMs2: number,
  threshold: number,
  speedKmh: number,
  samples: number
): number {
  const strength = Math.min(1, Math.max(0, (peakMs2 / threshold - 1) / 2.2))
  const speed = Math.min(1, Math.max(0, speedKmh / 70))
  const sampling = Math.min(1, samples / 3)
  return Math.min(0.98, Math.max(0.3, 0.38 + strength * 0.3 + speed * 0.18 + sampling * 0.14))
}

interface Candidate {
  start: number
  last: number
  peak: number
  samples: number
  speedKmh: number
}

/**
 * Peak detector tuned for vehicle suspension impacts.
 *
 * It watches the gravity-corrected acceleration magnitude. A pothole produces a
 * short, high-amplitude spike; normal road vibration stays below the threshold.
 * A candidate only becomes a detection when the phone was moving above the
 * configured minimum speed, which filters out potholes while walking or parked.
 */
export class PotholeDetector {
  private settings: Settings
  private candidate: Candidate | null = null
  private lastEmitAt = 0

  constructor(settings: Settings) {
    this.settings = settings
  }

  updateSettings(settings: Settings) {
    this.settings = settings
  }

  reset() {
    this.candidate = null
    this.lastEmitAt = 0
  }

  sample(deviationMs2: number, speedKmh: number, now = performance.now()): DetectionResult[] {
    const results: DetectionResult[] = []
    const threshold = detectionThreshold(this.settings)

    if (now - this.lastEmitAt < REFRACTORY_MS) {
      // Still let an in-flight candidate finish so it can be merged by the app.
      if (this.candidate) this.candidate.speedKmh = speedKmh
      return results
    }

    if (deviationMs2 >= threshold && deviationMs2 <= MAX_PLAUSIBLE_MS2) {
      if (this.candidate && now - this.candidate.last > CANDIDATE_GAP_MS) {
        this.flush(results, now)
      }
      if (!this.candidate) {
        this.candidate = {
          start: now,
          last: now,
          peak: deviationMs2,
          samples: 1,
          speedKmh
        }
      } else {
        this.candidate.last = now
        this.candidate.peak = Math.max(this.candidate.peak, deviationMs2)
        this.candidate.samples += 1
        this.candidate.speedKmh = speedKmh
      }
      if (now - this.candidate.start > CANDIDATE_MAX_MS) {
        this.flush(results, now)
      }
    } else if (this.candidate && now - this.candidate.last > CANDIDATE_GAP_MS) {
      this.flush(results, now)
    }

    return results
  }

  tick(now = performance.now()): DetectionResult[] {
    const results: DetectionResult[] = []
    if (this.candidate && now - this.candidate.last > CANDIDATE_GAP_MS + 40) {
      this.flush(results, now)
    }
    return results
  }

  private flush(results: DetectionResult[], now: number) {
    const candidate = this.candidate
    this.candidate = null
    if (!candidate) return

    const threshold = detectionThreshold(this.settings)
    if (candidate.peak < threshold) return
    if (candidate.peak > MAX_PLAUSIBLE_MS2) return
    if (candidate.speedKmh < this.settings.minSpeedKmh) return
    if (now - this.lastEmitAt < REFRACTORY_MS) return

    this.lastEmitAt = now
    results.push({
      peakMs2: Number(candidate.peak.toFixed(1)),
      peakG: Number((candidate.peak / 9.80665).toFixed(2)),
      durationMs: Math.round(Math.min(candidate.last - candidate.start, CANDIDATE_MAX_MS)),
      samples: candidate.samples,
      speedKmh: Math.round(candidate.speedKmh),
      timestamp: Date.now(),
      severity: severityForPeak(candidate.peak),
      confidence: confidenceFor(
        candidate.peak,
        threshold,
        candidate.speedKmh,
        candidate.samples
      )
    })
  }
}

/** Extract a gravity-compensated acceleration magnitude from a device motion event. */
export function deviationFromMotion(event: DeviceMotionEvent): number | null {
  const linear = event.acceleration
  if (
    linear &&
    linear.x !== null &&
    linear.y !== null &&
    linear.z !== null &&
    Number.isFinite(linear.x) &&
    Number.isFinite(linear.y) &&
    Number.isFinite(linear.z)
  ) {
    const magnitude = Math.hypot(linear.x, linear.y, linear.z)
    // Some browsers report a zeroed linear vector even while the device is
    // moving. Only trust it when it carries a real signal, otherwise fall back
    // to removing gravity from the raw accelerometer magnitude.
    if (magnitude > 0.25) return magnitude
  }

  const gravity = event.accelerationIncludingGravity
  if (
    gravity &&
    gravity.x !== null &&
    gravity.y !== null &&
    gravity.z !== null &&
    Number.isFinite(gravity.x) &&
    Number.isFinite(gravity.y) &&
    Number.isFinite(gravity.z)
  ) {
    return Math.abs(Math.hypot(gravity.x, gravity.y, gravity.z) - 9.80665)
  }

  return null
}

export type MotionPermissionResult = 'granted' | 'denied' | 'unsupported'

export async function requestMotionPermission(): Promise<MotionPermissionResult> {
  if (typeof DeviceMotionEvent === 'undefined') return 'unsupported'

  const requestPermission = (
    DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }
  ).requestPermission

  if (typeof requestPermission !== 'function') return 'granted'

  try {
    return await requestPermission.call(DeviceMotionEvent)
  } catch {
    return 'denied'
  }
}
