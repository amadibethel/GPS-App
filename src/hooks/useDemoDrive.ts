import { useEffect, useRef, useState } from 'react'
import type { LatLng } from '../types'
import { DEMO_ROUTE, demoDeviationAt, demoHeadingAt, demoPointAt } from '../data/demoRoute'
import { haversineMeters } from '../lib/geo'

export interface DemoDriveState {
  position: LatLng | null
  heading: number
  speedKmh: number
  distanceKm: number
  trail: LatLng[]
  deviation: number
  tick: number
}

const TICK_MS = 100

export function useDemoDrive(enabled: boolean): DemoDriveState {
  const [state, setState] = useState<DemoDriveState>({
    position: DEMO_ROUTE[0],
    heading: 0,
    speedKmh: 0,
    distanceKm: 0,
    trail: [DEMO_ROUTE[0]],
    deviation: 0,
    tick: 0
  })

  const distanceRef = useRef(0)
  const totalRef = useRef(0)
  const startedAtRef = useRef(0)
  const tickRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    distanceRef.current = 0
    totalRef.current = 0
    startedAtRef.current = Date.now()
    tickRef.current = 0
    setState({
      position: DEMO_ROUTE[0],
      heading: demoHeadingAt(0),
      speedKmh: 0,
      distanceKm: 0,
      trail: [DEMO_ROUTE[0]],
      deviation: 0,
      tick: 0
    })

    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000
      const speedKmh = Math.max(22, 48 + Math.sin(elapsed / 7) * 7 + Math.sin(elapsed / 1.9) * 1.8)
      const meters = (speedKmh / 3.6) * (TICK_MS / 1000)

      distanceRef.current += meters
      totalRef.current += meters
      tickRef.current += 1

      const position = demoPointAt(distanceRef.current)
      const heading = demoHeadingAt(distanceRef.current)
      const deviation = demoDeviationAt(distanceRef.current, elapsed)

      setState((prev) => {
        const last = prev.trail[prev.trail.length - 1]
        const trail =
          !last || haversineMeters(last, position) >= 7
            ? [...prev.trail, position].slice(-800)
            : prev.trail
        return {
          position,
          heading,
          speedKmh,
          distanceKm: totalRef.current / 1000,
          trail,
          deviation,
          tick: tickRef.current
        }
      })
    }, TICK_MS)

    return () => window.clearInterval(timer)
  }, [enabled])

  return state
}
