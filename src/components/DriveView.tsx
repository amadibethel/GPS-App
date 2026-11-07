import { useEffect, useState } from 'react'
import type {
  LatLng,
  Pothole,
  SensorStatus,
  Settings,
  TripSummary
} from '../types'
import { formatDateTime, timeAgo } from '../lib/format'
import { formatDistance } from '../lib/geo'
import { detectionThreshold } from '../lib/detection'
import { SEVERITY_LABEL } from '../lib/report'
import { Icon } from './Icons'
import { MapView } from './MapView'

interface DriveViewProps {
  position: LatLng | null
  accuracy: number
  heading: number | null
  trail: LatLng[]
  speedKmh: number
  distanceKm: number
  potholes: Pothole[]
  recent: Pothole[]
  tripActive: boolean
  demo: boolean
  sessionStart: number | null
  sessionPotholes: number
  lastTrip: TripSummary | null
  sensor: SensorStatus
  level: number
  gpsError: string | null
  follow: boolean
  settings: Settings
  onFollowChange: (follow: boolean) => void
  onSelectPothole: (id: string) => void
  onStartLive: () => void
  onStartDemo: () => void
  onStop: () => void
  onManual: () => void
  onViewLog: () => void
  onOpenSettings: () => void
}

const SENSOR_TEXT: Record<SensorStatus, { label: string; tone: string }> = {
  idle: { label: 'Idle', tone: 'neutral' },
  waiting: { label: 'Starting…', tone: 'warn' },
  active: { label: 'Motion sensor live', tone: 'good' },
  simulated: { label: 'Simulated signal', tone: 'demo' },
  denied: { label: 'Motion access blocked', tone: 'bad' },
  unsupported: { label: 'No motion sensor', tone: 'bad' },
  'no-signal': { label: 'No motion data', tone: 'warn' }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function DriveView({
  position,
  accuracy,
  heading,
  trail,
  speedKmh,
  distanceKm,
  potholes,
  recent,
  tripActive,
  demo,
  sessionStart,
  sessionPotholes,
  lastTrip,
  sensor,
  level,
  gpsError,
  follow,
  settings,
  onFollowChange,
  onSelectPothole,
  onStartLive,
  onStartDemo,
  onStop,
  onManual,
  onViewLog,
  onOpenSettings
}: DriveViewProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!tripActive || !sessionStart) {
      setElapsed(0)
      return
    }
    const update = () => setElapsed(Date.now() - sessionStart)
    update()
    const timer = window.setInterval(update, 1_000)
    return () => window.clearInterval(timer)
  }, [tripActive, sessionStart])

  const threshold = detectionThreshold(settings)
  const meterMax = threshold * 2.2
  const meterPercent = Math.min(100, (level / meterMax) * 100)
  const sensorInfo = SENSOR_TEXT[sensor]
  const motionWarning =
    sensor === 'denied' || sensor === 'unsupported' || sensor === 'no-signal'

  return (
    <div className="drive-view">
      <div className="map-stage drive-map">
        <MapView
          position={position}
          accuracy={accuracy}
          heading={heading}
          trail={trail}
          potholes={potholes}
          selectedId={null}
          onSelect={onSelectPothole}
          follow={follow}
          onFollowChange={onFollowChange}
          showTrail={settings.showTrail}
          initialFit="auto"
        />
        <div className="map-overlay map-overlay-top">
          <span
            className={`status-badge ${tripActive ? (demo ? 'is-demo' : 'is-live') : ''}`}
          >
            <span className="status-dot" />
            {tripActive ? (demo ? 'DEMO DRIVE' : 'RECORDING') : 'ON STANDBY'}
          </span>
          {position ? (
            <span className="chip">
              <Icon name="locate" size={13} /> ±{Math.round(accuracy)} m
            </span>
          ) : (
            <span className="chip chip-muted">
              <Icon name="locate" size={13} /> GPS idle
            </span>
          )}
        </div>
      </div>

      <div className="drive-panel">
        {demo && (
          <div className="demo-banner">
            <Icon name="sparkles" size={18} />
            <div>
              <strong>Simulated drive · Sandton, Johannesburg</strong>
              <span>These potholes are demo data, not real road reports.</span>
            </div>
          </div>
        )}

        {tripActive ? (
          <section className="live-card">
            <div className="live-card-head">
              <span className="eyebrow">
                <span className={`live-dot ${demo ? 'demo' : ''}`} />
                {demo ? 'Simulation running' : 'Drive in progress'}
              </span>
              <span className="live-timer">
                <Icon name="clock" size={14} />
                {formatClock(elapsed)}
              </span>
            </div>
            <div className="live-metrics">
              <div className="metric metric-speed">
                <strong>{Math.round(speedKmh)}</strong>
                <span>km/h</span>
              </div>
              <div className="metric">
                <strong>{formatDistance(distanceKm)}</strong>
                <span>Distance</span>
              </div>
              <div className="metric">
                <strong>{sessionPotholes}</strong>
                <span>{sessionPotholes === 1 ? 'Pothole' : 'Potholes'}</span>
              </div>
            </div>
          </section>
        ) : lastTrip ? (
          <section className="trip-card">
            <div className="trip-card-head">
              <div className="trip-icon">
                <Icon name={lastTrip.demo ? 'sparkles' : 'flag'} size={18} />
              </div>
              <div className="trip-card-title">
                <strong>{lastTrip.demo ? 'Demo drive complete' : 'Drive complete'}</strong>
                <span>{formatDateTime(lastTrip.endedAt)}</span>
              </div>
              <span className="saved-badge">
                <Icon name="check" size={13} /> Saved
              </span>
            </div>
            <div className="trip-stats">
              <div>
                <strong>{formatDistance(lastTrip.distanceKm)}</strong>
                <span>Distance</span>
              </div>
              <div>
                <strong>{lastTrip.potholes}</strong>
                <span>Potholes</span>
              </div>
              <div>
                <strong>{formatClock(lastTrip.endedAt - lastTrip.startedAt)}</strong>
                <span>Duration</span>
              </div>
            </div>
            {lastTrip.potholes === 0 && (
              <p className="trip-hint">
                Nothing logged this time. On a bumpy road, try the <b>High</b> sensitivity
                profile in Setup.
              </p>
            )}
          </section>
        ) : (
          <section className="intro-card">
            <span className="eyebrow">
              <span className="live-dot" /> Ready to patrol
            </span>
            <h2>Every pothole is a data point.</h2>
            <p>
              Mount your phone, start a drive, and Pothole Patrol SA uses GPS and your
              phone’s motion sensor to log potholes as you hit them. Then report them to
              your municipality in one tap.
            </p>
            <div className="intro-points">
              <span>
                <Icon name="shield" size={15} /> Saved on your phone
              </span>
              <span>
                <Icon name="cloudOff" size={15} /> Works offline
              </span>
              <span>
                <Icon name="flag" size={15} /> SA reporting directory
              </span>
            </div>
          </section>
        )}

        {gpsError && (
          <div className="alert-card">
            <Icon name="alert" size={18} />
            <div>
              <strong>GPS problem</strong>
              <p>{gpsError}</p>
            </div>
          </div>
        )}

        <div className="drive-actions">
          {tripActive ? (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={onStop}>
                <Icon name="stop" size={18} />
                {demo ? 'End demo' : 'End drive'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={onManual}
                disabled={!position}
                title={position ? 'Mark a pothole at your current location' : 'Waiting for GPS'}
              >
                <Icon name="plus" size={19} />
                Mark pothole
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={onStartLive}>
                <Icon name="play" size={18} />
                Start drive
              </button>
              <button type="button" className="btn btn-ghost" onClick={onStartDemo}>
                <Icon name="sparkles" size={18} />
                Try a demo drive
              </button>
            </>
          )}
        </div>

        {tripActive ? (
          <section className="sensor-card">
            <div className="sensor-head">
              <div>
                <span className="card-label">Sensor status</span>
                <div className="sensor-state">
                  <span className={`tone-dot ${sensorInfo.tone}`} />
                  <strong>{sensorInfo.label}</strong>
                </div>
              </div>
              <div className="sensor-threshold">
                <span>Trigger</span>
                <strong>{threshold.toFixed(1)} m/s²</strong>
              </div>
            </div>

            <div className="impact-meter" aria-hidden="true">
              <div className="impact-fill" style={{ width: `${meterPercent}%` }} />
              <span
                className="impact-threshold"
                style={{ left: `${(threshold / meterMax) * 100}%` }}
              />
            </div>
            <div className="impact-labels">
              <span>Road vibration</span>
              <span>Threshold</span>
            </div>

            <div className="sensor-rows">
              <div className="sensor-row">
                <span>
                  <Icon name="locate" size={15} /> GPS
                </span>
                <b className={gpsError ? 'tone-bad' : position ? 'tone-good' : 'tone-warn'}>
                  {gpsError ? 'Error' : position ? `±${Math.round(accuracy)} m` : 'Waiting'}
                </b>
              </div>
              <div className="sensor-row">
                <span>
                  <Icon name="gauge" size={15} /> Speed gate
                </span>
                <b>Above {settings.minSpeedKmh} km/h</b>
              </div>
              <div className="sensor-row">
                <span>
                  <Icon name="car" size={15} /> Profile
                </span>
                <b>
                  {settings.sensitivity[0].toUpperCase() + settings.sensitivity.slice(1)} ·{' '}
                  {settings.vehicle[0].toUpperCase() + settings.vehicle.slice(1)}
                </b>
              </div>
            </div>

            {motionWarning && (
              <div className="sensor-warning">
                <Icon name="alert" size={16} />
                <p>
                  Motion detection is unavailable. You can still record GPS and tap{' '}
                  <b>Mark pothole</b> for each one. Check browser permissions and use a
                  phone with a motion sensor.
                </p>
              </div>
            )}
          </section>
        ) : (
          <button type="button" className="profile-card" onClick={onOpenSettings}>
            <div className="profile-icon">
              <Icon name="sliders" size={18} />
            </div>
            <div>
              <span className="card-label">Detection profile</span>
              <strong>
                {settings.sensitivity[0].toUpperCase() + settings.sensitivity.slice(1)} ·{' '}
                {settings.vehicle[0].toUpperCase() + settings.vehicle.slice(1)}
              </strong>
            </div>
            <span className="profile-speed">Above {settings.minSpeedKmh} km/h</span>
            <Icon name="chevronRight" size={16} />
          </button>
        )}

        {recent.length > 0 && (
          <section className="recent-section">
            <div className="section-head">
              <h3>Recent detections</h3>
              <button type="button" className="text-button" onClick={onViewLog}>
                View all <Icon name="chevronRight" size={14} />
              </button>
            </div>
            <div className="pothole-list compact">
              {recent.map((pothole) => (
                <button
                  key={pothole.id}
                  type="button"
                  className="pothole-card"
                  onClick={() => onSelectPothole(pothole.id)}
                >
                  <span className={`severity-orb ${pothole.severity}`} />
                  <span className="pothole-card-main">
                    <span className="pothole-card-title">
                      {SEVERITY_LABEL[pothole.severity]} pothole
                      {pothole.source === 'demo' && <em className="demo-tag">DEMO</em>}
                      {pothole.status === 'reported' && (
                        <em className="status-tag reported">Reported</em>
                      )}
                      {pothole.status === 'fixed' && (
                        <em className="status-tag fixed">Fixed</em>
                      )}
                    </span>
                    <span className="pothole-card-meta">
                      {pothole.roadName ?? `${pothole.lat.toFixed(4)}, ${pothole.lng.toFixed(4)}`}
                      {' · '}
                      {timeAgo(pothole.createdAt)}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} className="muted-icon" />
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="drive-note">
          <Icon name="info" size={14} />
          Detection is indicative. Keep this screen open while driving — mobile browsers pause
          GPS and motion sensors in the background. Mount your phone and never operate it while
          driving.
        </p>
      </div>
    </div>
  )
}
