import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BeforeInstallPromptEvent,
  DetectionContext,
  DetectionResult,
  LatLng,
  Pothole,
  Settings,
  Tab,
  TripSummary
} from './types'
import { DriveView } from './components/DriveView'
import { HistoryView } from './components/HistoryView'
import { Icon, type IconName } from './components/Icons'
import { ManualMarkModal } from './components/ManualMarkModal'
import { MapTabView } from './components/MapTabView'
import { PotholeDetail } from './components/PotholeDetail'
import { ReportModal } from './components/ReportModal'
import { SettingsView } from './components/SettingsView'
import { Toast, type ToastData } from './components/Toast'
import { useDemoDrive } from './hooks/useDemoDrive'
import { useOnlineStatus, useGeolocation } from './hooks/useGeolocation'
import { useDetection } from './hooks/useDetection'
import {
  acquireWakeLock,
  playDetectionSound,
  primeAudio,
  releaseWakeLock,
  vibrateDetection
} from './lib/feedback'
import { downloadFile, exportFilename, potholesToCsv, potholesToGeoJson } from './lib/export'
import { formatDistance, haversineMeters } from './lib/geo'
import { SEVERITY_LABEL } from './lib/report'
import { requestMotionPermission, type MotionPermissionResult } from './lib/detection'
import { reverseGeocode } from './lib/geocode'
import {
  createId,
  loadLastTrip,
  loadPotholes,
  loadSettings,
  saveLastTrip,
  savePotholes,
  saveSettings
} from './lib/storage'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'drive', label: 'Drive', icon: 'car' },
  { id: 'map', label: 'Map', icon: 'mapPin' },
  { id: 'log', label: 'Log', icon: 'clipboard' },
  { id: 'settings', label: 'Setup', icon: 'sliders' }
]

type MotionPermissionState = 'unknown' | MotionPermissionResult

const SEVERITY_RANK: Record<Pothole['severity'], number> = {
  minor: 0,
  moderate: 1,
  severe: 2
}

export default function App() {
  const [potholes, setPotholes] = useState<Pothole[]>(() => loadPotholes())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [lastTrip, setLastTrip] = useState<TripSummary | null>(() => loadLastTrip())
  const [tab, setTab] = useState<Tab>('drive')
  const [tripActive, setTripActive] = useState(false)
  const [demo, setDemo] = useState(false)
  const [sessionStart, setSessionStart] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [follow, setFollow] = useState(true)
  const [motionPermission, setMotionPermission] = useState<MotionPermissionState>('unknown')
  const [toast, setToast] = useState<ToastData | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)

  const online = useOnlineStatus()
  const live = useGeolocation(tripActive && !demo)
  const sim = useDemoDrive(tripActive && demo)

  const position: LatLng | null = demo ? sim.position : live.position
  const accuracy = demo ? 4 : live.accuracy
  const heading = demo ? sim.heading : live.heading
  const trail = demo ? sim.trail : live.trail
  const speedKmh = demo ? sim.speedKmh : live.speedKmh
  const distanceKm = demo ? sim.distanceKm : live.distanceKm
  const gpsError = demo ? null : live.error

  const potholesRef = useRef(potholes)
  const settingsRef = useRef(settings)
  const demoRef = useRef(demo)
  const tripActiveRef = useRef(tripActive)
  const sessionStartRef = useRef(sessionStart)
  const positionRef = useRef(position)
  const accuracyRef = useRef(accuracy)
  const speedRef = useRef(speedKmh)
  const distanceRef = useRef(distanceKm)

  potholesRef.current = potholes
  settingsRef.current = settings
  demoRef.current = demo
  tripActiveRef.current = tripActive
  sessionStartRef.current = sessionStart
  positionRef.current = position
  accuracyRef.current = accuracy
  speedRef.current = speedKmh
  distanceRef.current = distanceKm

  const toastCounterRef = useRef(0)
  const showToast = useCallback(
    (title: string, message?: string, tone: ToastData['tone'] = 'default') => {
      toastCounterRef.current += 1
      setToast({ id: toastCounterRef.current, title, message, tone })
    },
    []
  )
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    savePotholes(potholes)
  }, [potholes])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setStandalone(true)
      setInstallPrompt(null)
      showToast('App installed', 'Pothole Patrol SA is now on your home screen.', 'success')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [showToast])

  useEffect(() => {
    if (tripActive && settings.keepAwake) void acquireWakeLock()
    else releaseWakeLock()
  }, [tripActive, settings.keepAwake])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && tripActive && settings.keepAwake) {
        void acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [tripActive, settings.keepAwake])

  const lookupRoad = useCallback(async (id: string, lat: number, lng: number) => {
    const result = await reverseGeocode(lat, lng)
    if (!result) return
    setPotholes((prev) =>
      prev.map((pothole) =>
        pothole.id === id
          ? {
              ...pothole,
              roadName: result.roadName ?? pothole.roadName,
              suburb: result.suburb ?? pothole.suburb
            }
          : pothole
      )
    )
  }, [])

  const handleDetection = useCallback(
    (result: DetectionResult, context: DetectionContext) => {
      const now = result.timestamp || Date.now()
      const isDemo = demoRef.current
      const existing = potholesRef.current.find(
        (pothole) =>
          now - pothole.createdAt < 25_000 && haversineMeters(pothole, context) < 35
      )

      if (existing) {
        const severity =
          SEVERITY_RANK[result.severity] > SEVERITY_RANK[existing.severity]
            ? result.severity
            : existing.severity
        setPotholes((prev) =>
          prev.map((pothole) =>
            pothole.id === existing.id
              ? {
                  ...pothole,
                  updatedAt: now,
                  hits: pothole.hits + 1,
                  peakMs2: Math.max(pothole.peakMs2, result.peakMs2),
                  peakG: Math.max(pothole.peakG, result.peakG),
                  severity,
                  confidence: Math.max(pothole.confidence, result.confidence)
                }
              : pothole
          )
        )
        showToast(
          'Pothole confirmed',
          `${existing.hits + 1} impacts within 35 m at ${Math.round(result.speedKmh)} km/h.`,
          'success'
        )
      } else {
        const id = createId()
        const pothole: Pothole = {
          id,
          lat: context.lat,
          lng: context.lng,
          accuracy: context.accuracy,
          createdAt: now,
          updatedAt: now,
          severity: result.severity,
          peakMs2: result.peakMs2,
          peakG: result.peakG,
          speedKmh: Math.round(result.speedKmh),
          confidence: result.confidence,
          hits: 1,
          source: isDemo ? 'demo' : 'motion',
          status: 'open'
        }
        setPotholes((prev) => [pothole, ...prev])
        showToast(
          `${SEVERITY_LABEL[result.severity]} pothole detected`,
          `${Math.round(result.speedKmh)} km/h · ${result.peakG.toFixed(1)} g impact`,
          result.severity === 'severe'
            ? 'danger'
            : result.severity === 'moderate'
              ? 'warning'
              : 'default'
        )
        if (settingsRef.current.autoGeocode && navigator.onLine && !isDemo) {
          void lookupRoad(id, context.lat, context.lng)
        }
      }

      if (settingsRef.current.sound) playDetectionSound(result.severity)
      if (settingsRef.current.haptics) vibrateDetection(result.severity)
    },
    [lookupRoad, showToast]
  )

  const getContext = useCallback((): DetectionContext | null => {
    const current = positionRef.current
    if (!current) return null
    return {
      lat: current.lat,
      lng: current.lng,
      accuracy: accuracyRef.current || 8,
      speedKmh: speedRef.current
    }
  }, [])

  const detection = useDetection({
    enabled: tripActive,
    demo,
    motionAllowed: motionPermission !== 'denied' && motionPermission !== 'unsupported',
    settings,
    getContext,
    onDetect: handleDetection
  })

  const { feedSample } = detection
  useEffect(() => {
    if (!tripActive || !demo || sim.tick === 0) return
    feedSample(sim.deviation)
  }, [sim.tick, sim.deviation, tripActive, demo, feedSample])

  const startLive = useCallback(async () => {
    if (tripActiveRef.current) return
    primeAudio()

    if (!('geolocation' in navigator)) {
      showToast(
        'GPS not available',
        'This browser cannot read your location. Try Chrome or Safari on a phone.',
        'danger'
      )
      return
    }

    let permission: MotionPermissionResult = 'unsupported'
    try {
      permission = await requestMotionPermission()
    } catch {
      permission = 'denied'
    }
    setMotionPermission(permission)

    if (permission === 'denied') {
      showToast(
        'Motion access blocked',
        'Automatic detection is off. You can still use Mark pothole during the drive.',
        'warning'
      )
    } else if (permission === 'unsupported') {
      showToast(
        'No motion sensor',
        'Use Mark pothole to log potholes manually.',
        'warning'
      )
    }

    setDemo(false)
    setTripActive(true)
    setSessionStart(Date.now())
    setFollow(true)
    setSelectedId(null)
    setReportId(null)
    setManualOpen(false)
  }, [showToast])

  const startDemo = useCallback(() => {
    if (tripActiveRef.current) return
    primeAudio()
    setMotionPermission('granted')
    setDemo(true)
    setTripActive(true)
    setSessionStart(Date.now())
    setFollow(true)
    setSelectedId(null)
    setReportId(null)
    setManualOpen(false)
    showToast(
      'Demo drive started',
      'Simulated route around Sandton, Johannesburg. These potholes are not real.',
      'default'
    )
  }, [showToast])

  const stopTrip = useCallback(() => {
    const startedAt = sessionStartRef.current ?? Date.now()
    const endedAt = Date.now()
    const summary: TripSummary = {
      startedAt,
      endedAt,
      distanceKm: distanceRef.current,
      potholes: potholesRef.current.filter((pothole) => pothole.createdAt >= startedAt)
        .length,
      demo: demoRef.current
    }
    setLastTrip(summary)
    saveLastTrip(summary)
    setTripActive(false)
    setDemo(false)
    setSessionStart(null)
    releaseWakeLock()
    showToast(
      'Drive saved',
      `${formatDistance(summary.distanceKm)} travelled · ${summary.potholes} ${
        summary.potholes === 1 ? 'pothole' : 'potholes'
      } logged`,
      'success'
    )
  }, [showToast])

  const addManual = useCallback(
    (severity: Pothole['severity'], notes: string) => {
      const current = positionRef.current
      if (!current) {
        showToast('No GPS fix yet', 'Wait for the map to show your location.', 'warning')
        return
      }
      const now = Date.now()
      const isDemo = demoRef.current
      const id = createId()
      const pothole: Pothole = {
        id,
        lat: current.lat,
        lng: current.lng,
        accuracy: accuracyRef.current || 8,
        createdAt: now,
        updatedAt: now,
        severity,
        peakMs2: 0,
        peakG: 0,
        speedKmh: Math.round(speedRef.current),
        confidence: 1,
        hits: 1,
        source: isDemo ? 'demo' : 'manual',
        status: 'open',
        notes: notes || undefined
      }
      setPotholes((prev) => [pothole, ...prev])
      setManualOpen(false)
      showToast(
        'Pothole logged',
        `${SEVERITY_LABEL[severity]} · marked at your current location.`,
        'success'
      )
      if (settingsRef.current.autoGeocode && navigator.onLine && !isDemo) {
        void lookupRoad(id, current.lat, current.lng)
      }
    },
    [lookupRoad, showToast]
  )

  const updatePothole = useCallback((id: string, patch: Partial<Pothole>) => {
    setPotholes((prev) =>
      prev.map((pothole) =>
        pothole.id === id ? { ...pothole, ...patch, updatedAt: Date.now() } : pothole
      )
    )
  }, [])

  const deletePothole = useCallback(
    (id: string) => {
      setPotholes((prev) => prev.filter((pothole) => pothole.id !== id))
      setSelectedId(null)
      setReportId(null)
      showToast('Pothole deleted', 'It has been removed from this device.', 'default')
    },
    [showToast]
  )

  const markReported = useCallback(
    (id: string, authorityId: string) => {
      setPotholes((prev) =>
        prev.map((pothole) =>
          pothole.id === id
            ? {
                ...pothole,
                status: 'reported',
                reportedAt: Date.now(),
                authorityId,
                updatedAt: Date.now()
              }
            : pothole
        )
      )
      setReportId(null)
      showToast(
        'Marked as reported',
        'Your log now tracks this pothole as reported. Remember to actually submit the report.',
        'success'
      )
    },
    [showToast]
  )

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const exportCsv = useCallback(() => {
    if (potholesRef.current.length === 0) {
      showToast('Nothing to export', 'Log at least one pothole first.', 'warning')
      return
    }
    downloadFile(exportFilename('csv'), potholesToCsv(potholesRef.current), 'text/csv;charset=utf-8')
    showToast('CSV exported', 'Check your Downloads folder.', 'success')
  }, [showToast])

  const exportGeoJson = useCallback(() => {
    if (potholesRef.current.length === 0) {
      showToast('Nothing to export', 'Log at least one pothole first.', 'warning')
      return
    }
    downloadFile(
      exportFilename('geojson'),
      potholesToGeoJson(potholesRef.current),
      'application/geo+json'
    )
    showToast('GeoJSON exported', 'Ready for QGIS, Google Earth or a web map.', 'success')
  }, [showToast])

  const clearAll = useCallback(() => {
    setPotholes([])
    setLastTrip(null)
    saveLastTrip(null)
    showToast('All potholes cleared', 'Your log is now empty.', 'default')
  }, [showToast])

  const clearDemo = useCallback(() => {
    setPotholes((prev) => prev.filter((pothole) => pothole.source !== 'demo'))
    if (lastTrip?.demo) {
      setLastTrip(null)
      saveLastTrip(null)
    }
    showToast('Demo data removed', 'Real logged potholes were kept.', 'success')
  }, [lastTrip, showToast])

  const install = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null)
      showToast('Installing app', 'Pothole Patrol SA will appear on your home screen.', 'success')
    }
  }, [installPrompt, showToast])

  const changeTab = useCallback((next: Tab) => {
    setTab(next)
    setSelectedId(null)
    setReportId(null)
    setManualOpen(false)
    setFollow(next === 'drive')
  }, [])

  const sessionPotholes = useMemo(() => {
    if (!sessionStart) return 0
    return potholes.filter((pothole) => pothole.createdAt >= sessionStart).length
  }, [potholes, sessionStart])

  const selectedPothole = selectedId
    ? (potholes.find((pothole) => pothole.id === selectedId) ?? null)
    : null
  const reportPothole = reportId
    ? (potholes.find((pothole) => pothole.id === reportId) ?? null)
    : null

  const startFromAnotherTab = useCallback(() => {
    setTab('drive')
    setFollow(true)
    void startLive()
  }, [startLive])

  return (
    <div className={`app-shell tab-${tab}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="road" size={20} />
          </div>
          <div className="brand-copy">
            <h1>
              Pothole Patrol <span>SA</span>
            </h1>
            <p>South African roads</p>
          </div>
        </div>
        <div className="topbar-actions">
          {!online && (
            <span className="net-pill">
              <Icon name="cloudOff" size={12} /> Offline
            </span>
          )}
          {installPrompt && (
            <button
              type="button"
              className="icon-button"
              onClick={install}
              aria-label="Install app"
              title="Install app"
            >
              <Icon name="download" size={18} />
            </button>
          )}
          <span
            className={`top-status ${tripActive ? (demo ? 'is-demo' : 'is-live') : ''}`}
          >
            <span className="status-dot" />
            {tripActive ? (demo ? 'DEMO' : 'LIVE') : 'READY'}
          </span>
        </div>
      </header>

      <main className={`app-main ${tab === 'map' ? 'is-map' : ''}`}>
        {tab === 'drive' && (
          <DriveView
            position={position}
            accuracy={accuracy}
            heading={heading}
            trail={trail}
            speedKmh={speedKmh}
            distanceKm={distanceKm}
            potholes={potholes}
            recent={potholes.slice(0, 3)}
            tripActive={tripActive}
            demo={demo}
            sessionStart={sessionStart}
            sessionPotholes={sessionPotholes}
            lastTrip={lastTrip}
            sensor={detection.sensor}
            level={detection.level}
            gpsError={gpsError}
            follow={follow}
            settings={settings}
            onFollowChange={setFollow}
            onSelectPothole={(id) => setSelectedId(id)}
            onStartLive={() => void startLive()}
            onStartDemo={startDemo}
            onStop={stopTrip}
            onManual={() => setManualOpen(true)}
            onViewLog={() => changeTab('log')}
            onOpenSettings={() => changeTab('settings')}
          />
        )}

        {tab === 'map' && (
          <MapTabView
            position={position}
            accuracy={accuracy}
            heading={heading}
            trail={trail}
            potholes={potholes}
            follow={follow}
            showTrail={settings.showTrail}
            onFollowChange={setFollow}
            onSelect={(id) => setSelectedId(id)}
            onStartDrive={startFromAnotherTab}
          />
        )}

        {tab === 'log' && (
          <HistoryView
            potholes={potholes}
            onSelect={(id) => setSelectedId(id)}
            onExportCsv={exportCsv}
            onExportGeoJson={exportGeoJson}
            onClearDemo={clearDemo}
            onStartDrive={startFromAnotherTab}
          />
        )}

        {tab === 'settings' && (
          <SettingsView
            settings={settings}
            potholes={potholes}
            onUpdate={updateSettings}
            onExportCsv={exportCsv}
            onExportGeoJson={exportGeoJson}
            onClearAll={clearAll}
            onClearDemo={clearDemo}
            canInstall={Boolean(installPrompt)}
            onInstall={() => void install()}
            standalone={standalone}
            online={online}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Main navigation">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-item ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => changeTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <span className="tab-icon">
              <Icon name={item.icon} size={20} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {selectedPothole && (
        <PotholeDetail
          pothole={selectedPothole}
          online={online}
          onClose={() => setSelectedId(null)}
          onReport={() => setReportId(selectedPothole.id)}
          onUpdate={(patch) => updatePothole(selectedPothole.id, patch)}
          onDelete={() => deletePothole(selectedPothole.id)}
          onLookupRoad={async () => {
            await lookupRoad(selectedPothole.id, selectedPothole.lat, selectedPothole.lng)
          }}
        />
      )}

      {reportPothole && (
        <ReportModal
          pothole={reportPothole}
          online={online}
          onClose={() => setReportId(null)}
          onMarkReported={(authorityId) => markReported(reportPothole.id, authorityId)}
          onToast={showToast}
        />
      )}

      <ManualMarkModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        position={position}
        accuracy={accuracy}
        speedKmh={speedKmh}
        demo={demo}
        onAdd={addManual}
      />

      {toast && <Toast key={toast.id} data={toast} onDismiss={dismissToast} />}
    </div>
  )
}
