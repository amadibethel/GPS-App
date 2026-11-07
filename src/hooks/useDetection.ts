import { useCallback, useEffect, useRef, useState } from 'react'
import type { DetectionContext, DetectionResult, SensorStatus, Settings } from '../types'
import {
  PotholeDetector,
  deviationFromMotion,
  type MotionPermissionResult
} from '../lib/detection'

interface Options {
  enabled: boolean
  demo: boolean
  motionAllowed: boolean
  settings: Settings
  getContext: () => DetectionContext | null
  onDetect: (result: DetectionResult, context: DetectionContext) => void
}

export interface DetectionEngine {
  sensor: SensorStatus
  level: number
  feedSample: (deviationMs2: number) => void
}

export function useDetection(options: Options): DetectionEngine {
  const [sensor, setSensor] = useState<SensorStatus>('idle')
  const [level, setLevel] = useState(0)
  const detectorRef = useRef<PotholeDetector | null>(null)
  if (!detectorRef.current) detectorRef.current = new PotholeDetector(options.settings)

  const settingsRef = useRef(options.settings)
  const motionAllowedRef = useRef(options.motionAllowed)
  const getContextRef = useRef(options.getContext)
  const onDetectRef = useRef(options.onDetect)
  const lastUiUpdateRef = useRef(0)
  const eventSeenRef = useRef(false)

  settingsRef.current = options.settings
  motionAllowedRef.current = options.motionAllowed
  getContextRef.current = options.getContext
  onDetectRef.current = options.onDetect

  const emit = useCallback((results: DetectionResult[]) => {
    if (results.length === 0) return
    const context = getContextRef.current()
    if (!context) return
    for (const result of results) {
      if (result.speedKmh < settingsRef.current.minSpeedKmh) continue
      onDetectRef.current(result, context)
    }
  }, [])

  const processDeviation = useCallback(
    (deviationMs2: number) => {
      const detector = detectorRef.current
      if (!detector) return
      detector.updateSettings(settingsRef.current)
      const context = getContextRef.current()
      if (!context) return
      emit(detector.sample(deviationMs2, context.speedKmh))

      const now = performance.now()
      if (now - lastUiUpdateRef.current > 90) {
        lastUiUpdateRef.current = now
        setLevel((prev) => prev * 0.7 + deviationMs2 * 0.3)
      }
    },
    [emit]
  )

  useEffect(() => {
    const detector = detectorRef.current
    if (!detector) return
    detector.reset()
    setLevel(0)
    eventSeenRef.current = false

    if (!options.enabled) {
      setSensor('idle')
      return
    }

    if (options.demo) {
      setSensor('simulated')
      const timer = window.setInterval(() => {
        emit(detector.tick())
        setLevel((prev) => (prev > 0.05 ? prev * 0.9 : 0))
      }, 160)
      return () => window.clearInterval(timer)
    }

    if (!motionAllowedRef.current) {
      setSensor('denied')
      return
    }

    if (typeof DeviceMotionEvent === 'undefined') {
      setSensor('unsupported')
      return
    }

    setSensor('waiting')

    const handler = (event: DeviceMotionEvent) => {
      const deviation = deviationFromMotion(event)
      if (deviation === null) return
      if (!eventSeenRef.current) {
        eventSeenRef.current = true
        setSensor('active')
      }
      processDeviation(deviation)
    }

    window.addEventListener('devicemotion', handler, { passive: true })
    const noSignal = window.setTimeout(() => {
      if (!eventSeenRef.current) setSensor('no-signal')
    }, 5_000)

    const flush = window.setInterval(() => {
      emit(detector.tick())
      setLevel((prev) => (prev > 0.05 ? prev * 0.9 : 0))
    }, 160)

    return () => {
      window.removeEventListener('devicemotion', handler)
      window.clearTimeout(noSignal)
      window.clearInterval(flush)
    }
  }, [options.enabled, options.demo, emit, processDeviation])

  return { sensor, level, feedSample: processDeviation }
}

export type { MotionPermissionResult }
