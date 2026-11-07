import { useEffect, useRef, useState } from 'react'
import type { LatLng } from '../types'
import { haversineMeters } from '../lib/geo'

export interface GeolocationState {
  position: LatLng | null
  accuracy: number
  speedKmh: number
  heading: number | null
  trail: LatLng[]
  distanceKm: number
  error: string | null
  watching: boolean
  supported: boolean
}

const initialState: GeolocationState = {
  position: null,
  accuracy: 0,
  speedKmh: 0,
  heading: null,
  trail: [],
  distanceKm: 0,
  error: null,
  watching: false,
  supported: typeof navigator !== 'undefined' && 'geolocation' in navigator
}

function errorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission was denied. Allow location access in your browser settings to record a drive.'
    case error.POSITION_UNAVAILABLE:
      return 'GPS position unavailable. Move into the open and check that location services are on.'
    case error.TIMEOUT:
      return 'GPS is taking too long to respond. Check that location services are on and try again.'
    default:
      return error.message || 'Could not read your location.'
  }
}

export function useGeolocation(enabled: boolean): GeolocationState {
  const [state, setState] = useState<GeolocationState>(initialState)
  const lastFixRef = useRef<{ lat: number; lng: number; time: number } | null>(null)

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, watching: false }))
      return
    }

    if (!('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        supported: false,
        error: 'This browser does not support GPS. Try Chrome or Safari on a phone.'
      }))
      return
    }

    let cancelled = false
    lastFixRef.current = null
    setState((prev) => ({
      ...prev,
      trail: [],
      distanceKm: 0,
      speedKmh: 0,
      error: null,
      watching: true
    }))

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return
        const coords = position.coords
        const now = position.timestamp || Date.now()
        const point: LatLng = { lat: coords.latitude, lng: coords.longitude }
        const lastFix = lastFixRef.current
        const accuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : 0

        let speedKmh: number | null = null
        if (coords.speed !== null && Number.isFinite(coords.speed) && coords.speed >= 0) {
          speedKmh = coords.speed * 3.6
        } else if (lastFix && accuracy <= 60) {
          const seconds = (now - lastFix.time) / 1000
          if (seconds > 0.4 && seconds < 15) {
            speedKmh = (haversineMeters(lastFix, point) / seconds) * 3.6
          }
        }
        if (speedKmh !== null) speedKmh = Math.max(0, Math.min(240, speedKmh))

        let distanceM = 0
        if (lastFix && accuracy <= 70) {
          const moved = haversineMeters(lastFix, point)
          const seconds = (now - lastFix.time) / 1000
          if (moved > 0.8 && moved < 250 && seconds < 20) distanceM = moved
        }
        lastFixRef.current = { lat: point.lat, lng: point.lng, time: now }

        setState((prev) => {
          let trail = prev.trail
          if (accuracy > 0 && accuracy <= 80) {
            const lastTrailPoint = trail[trail.length - 1]
            if (!lastTrailPoint || haversineMeters(lastTrailPoint, point) >= 3) {
              trail = [...trail, point].slice(-2_500)
            }
          }
          return {
            ...prev,
            position: point,
            accuracy,
            speedKmh: speedKmh ?? prev.speedKmh,
            heading:
              coords.heading !== null &&
              Number.isFinite(coords.heading) &&
              coords.heading >= 0
                ? coords.heading
                : prev.heading,
            trail,
            distanceKm: prev.distanceKm + distanceM / 1000,
            error: null,
            watching: true
          }
        })
      },
      (error) => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          error: errorMessage(error),
          watching: error.code !== error.PERMISSION_DENIED
        }))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1_000,
        timeout: 20_000
      }
    )

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enabled])

  return state
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}


