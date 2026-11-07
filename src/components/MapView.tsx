import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng, Pothole } from '../types'
import { Icon } from './Icons'

interface MapViewProps {
  position: LatLng | null
  accuracy: number
  heading: number | null
  trail: LatLng[]
  potholes: Pothole[]
  selectedId: string | null
  onSelect: (id: string) => void
  follow: boolean
  onFollowChange: (follow: boolean) => void
  showTrail: boolean
  initialFit?: 'auto' | 'potholes'
}

interface PotholeMarkerEntry {
  marker: L.Marker
  severity: Pothole['severity']
  status: Pothole['status']
  selected: boolean
}

function userIcon(heading: number | null): L.DivIcon {
  return L.divIcon({
    className: 'user-marker-host',
    html: `<div class="user-marker ${heading === null ? '' : 'has-heading'}" style="--heading:${
      heading === null ? 0 : heading
    }deg"><span class="user-pulse"></span><span class="user-heading"></span><span class="user-dot"></span></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  })
}

function potholeIcon(pothole: Pick<Pothole, 'severity' | 'status'>, selected: boolean): L.DivIcon {
  const classes = [
    'pothole-marker',
    pothole.severity,
    selected ? 'is-selected' : '',
    pothole.status === 'fixed' ? 'is-fixed' : '',
    pothole.status === 'reported' ? 'is-reported' : ''
  ]
    .filter(Boolean)
    .join(' ')
  return L.divIcon({
    className: 'pothole-marker-host',
    html: `<span class="${classes}"><i></i>${pothole.status === 'fixed' ? '<b>✓</b>' : ''}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  })
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

export function MapView({
  position,
  accuracy,
  heading,
  trail,
  potholes,
  selectedId,
  onSelect,
  follow,
  onFollowChange,
  showTrail,
  initialFit = 'auto'
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const potholeLayerRef = useRef<L.LayerGroup | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const accuracyRef = useRef<L.Circle | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const markerEntriesRef = useRef<Map<string, PotholeMarkerEntry>>(new Map())
  const didInitialFitRef = useRef(false)

  const selectRef = useRef(onSelect)
  const followChangeRef = useRef(onFollowChange)
  selectRef.current = onSelect
  followChangeRef.current = onFollowChange

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      zoomControl: false,
      preferCanvas: true,
      center: [-28.9, 24.9],
      zoom: 5,
      minZoom: 4,
      maxZoom: 19,
      worldCopyJump: true
    })

    L.tileLayer(TILE_URL, {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: TILE_ATTRIBUTION
    }).addTo(map)

    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 90 }).addTo(map)

    potholeLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    map.on('dragstart', () => followChangeRef.current(false))

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)
    window.setTimeout(() => map.invalidateSize(), 60)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      potholeLayerRef.current = null
      trailRef.current = null
      accuracyRef.current = null
      userMarkerRef.current = null
      markerEntriesRef.current.clear()
      didInitialFitRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || didInitialFitRef.current) return
    if (initialFit === 'potholes') {
      if (potholes.length === 0) return
      didInitialFitRef.current = true
      const bounds = L.latLngBounds(potholes.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.25), { maxZoom: 15, animate: false })
      return
    }
    if (position) {
      didInitialFitRef.current = true
      map.setView([position.lat, position.lng], 15, { animate: false })
      return
    }
    if (potholes.length > 0) {
      didInitialFitRef.current = true
      const bounds = L.latLngBounds(potholes.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.25), { maxZoom: 15, animate: false })
    }
  }, [position, potholes, initialFit])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!position) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      if (accuracyRef.current) {
        accuracyRef.current.remove()
        accuracyRef.current = null
      }
      return
    }

    const latlng: L.LatLngExpression = [position.lat, position.lng]

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latlng, {
        icon: userIcon(heading),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000
      }).addTo(map)
    } else {
      userMarkerRef.current.setLatLng(latlng)
      userMarkerRef.current.setIcon(userIcon(heading))
    }

    if (!accuracyRef.current) {
      accuracyRef.current = L.circle(latlng, {
        radius: Math.max(accuracy, 5),
        color: '#f59e0b',
        weight: 1,
        opacity: 0.4,
        fillColor: '#f59e0b',
        fillOpacity: 0.07,
        interactive: false
      }).addTo(map)
    } else {
      accuracyRef.current.setLatLng(latlng)
      accuracyRef.current.setRadius(Math.max(accuracy, 5))
    }

    if (follow) {
      map.setView(latlng, Math.max(map.getZoom(), 15), { animate: false })
    }
  }, [position, accuracy, heading, follow])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!showTrail || trail.length < 2) {
      if (trailRef.current) {
        trailRef.current.remove()
        trailRef.current = null
      }
      return
    }

    const latlngs = trail.map((point) => [point.lat, point.lng] as [number, number])
    if (!trailRef.current) {
      trailRef.current = L.polyline(latlngs, {
        color: '#fbbf24',
        weight: 4,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    } else {
      trailRef.current.setLatLngs(latlngs)
    }
  }, [trail, showTrail])

  useEffect(() => {
    const group = potholeLayerRef.current
    if (!group) return
    const entries = markerEntriesRef.current
    const seen = new Set<string>()

    for (const pothole of potholes) {
      seen.add(pothole.id)
      let entry = entries.get(pothole.id)
      if (!entry) {
        const marker = L.marker([pothole.lat, pothole.lng], {
          icon: potholeIcon(pothole, pothole.id === selectedId),
          riseOnHover: true,
          keyboard: false
        })
        marker.on('click', () => selectRef.current(pothole.id))
        marker.addTo(group)
        entry = {
          marker,
          severity: pothole.severity,
          status: pothole.status,
          selected: pothole.id === selectedId
        }
        entries.set(pothole.id, entry)
      } else {
        entry.marker.setLatLng([pothole.lat, pothole.lng])
      }

      const shouldSelect = pothole.id === selectedId
      if (
        entry.severity !== pothole.severity ||
        entry.status !== pothole.status ||
        entry.selected !== shouldSelect
      ) {
        entry.marker.setIcon(potholeIcon(pothole, shouldSelect))
        entry.marker.setZIndexOffset(shouldSelect ? 600 : 0)
        entry.severity = pothole.severity
        entry.status = pothole.status
        entry.selected = shouldSelect
      }
    }

    for (const [id, entry] of entries) {
      if (!seen.has(id)) {
        group.removeLayer(entry.marker)
        entries.delete(id)
      }
    }
  }, [potholes, selectedId])

  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    if (position) {
      followChangeRef.current(true)
      map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16), { animate: true })
      return
    }
    fitPotholes()
  }

  const fitPotholes = () => {
    const map = mapRef.current
    if (!map || potholes.length === 0) return
    followChangeRef.current(false)
    const bounds = L.latLngBounds(potholes.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds.pad(0.25), { maxZoom: 15, animate: true })
  }

  return (
    <div className="map-root">
      <div ref={containerRef} className="map-canvas" role="application" aria-label="Pothole map" />
      <div className="map-controls">
        <button
          type="button"
          className={`map-control ${follow ? 'is-active' : ''}`}
          onClick={recenter}
          aria-label="Recenter on my location"
          title="Recenter on my location"
        >
          <Icon name="locate" size={20} />
        </button>
        <button
          type="button"
          className="map-control"
          onClick={fitPotholes}
          disabled={potholes.length === 0}
          aria-label="Show all potholes"
          title="Show all potholes"
        >
          <Icon name="maximize" size={20} />
        </button>
        <div className="map-zoom">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Icon name="plus" size={18} />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Icon name="minus" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
