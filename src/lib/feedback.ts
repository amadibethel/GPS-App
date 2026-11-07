import type { Severity } from '../types'

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

/** Call from a user gesture so mobile browsers allow later detection sounds. */
export function primeAudio() {
  const ctx = getContext()
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume()
  }
}

export function playDetectionSound(severity: Severity) {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  const now = ctx.currentTime
  const frequencies = severity === 'severe' ? [740, 520] : severity === 'moderate' ? [620] : [520]
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19)
  gain.connect(ctx.destination)

  frequencies.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.09)
    oscillator.connect(gain)
    oscillator.start(now + index * 0.09)
    oscillator.stop(now + 0.22 + index * 0.09)
  })
}

export function vibrateDetection(severity: Severity) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (severity === 'severe') {
    navigator.vibrate([70, 45, 70, 45, 110])
  } else if (severity === 'moderate') {
    navigator.vibrate([55, 40, 55])
  } else {
    navigator.vibrate(50)
  }
}

let wakeLock: WakeLockSentinel | null = null

export async function acquireWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return false
  if (wakeLock) return true
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
    return true
  } catch {
    return false
  }
}

export function releaseWakeLock() {
  if (wakeLock) {
    void wakeLock.release().catch(() => undefined)
    wakeLock = null
  }
}
