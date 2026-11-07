import { useMemo, useState } from 'react'
import type { Pothole, Settings, VehicleType } from '../types'
import { AUTHORITIES, MUNICIPALITY_DIRECTORY_URL, telHref } from '../data/authorities'
import { detectionThreshold } from '../lib/detection'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface SettingsViewProps {
  settings: Settings
  potholes: Pothole[]
  onUpdate: (patch: Partial<Settings>) => void
  onExportCsv: () => void
  onExportGeoJson: () => void
  onClearAll: () => void
  onClearDemo: () => void
  canInstall: boolean
  onInstall: () => void
  standalone: boolean
  online: boolean
}

const SENSITIVITY_OPTIONS: {
  value: Settings['sensitivity']
  label: string
  hint: string
}[] = [
  { value: 'low', label: 'Low', hint: 'Fewer false alarms on rough gravel or corrugated roads.' },
  { value: 'balanced', label: 'Balanced', hint: 'Recommended for most sedans, hatchbacks and SUVs.' },
  { value: 'high', label: 'High', hint: 'Catches shallow potholes, but may log big speed bumps.' }
]

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Car / hatchback' },
  { value: 'suv', label: 'SUV / bakkie' },
  { value: 'taxi', label: 'Minibus taxi' },
  { value: 'bus', label: 'Bus' },
  { value: 'truck', label: 'Truck' }
]

export function SettingsView({
  settings,
  potholes,
  onUpdate,
  onExportCsv,
  onExportGeoJson,
  onClearAll,
  onClearDemo,
  canInstall,
  onInstall,
  standalone,
  online
}: SettingsViewProps) {
  const [hotlineQuery, setHotlineQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const threshold = detectionThreshold(settings)
  const demoCount = potholes.filter((p) => p.source === 'demo').length
  const realCount = potholes.length - demoCount

  const hotlines = useMemo(() => {
    const needle = hotlineQuery.trim().toLowerCase()
    const metros = AUTHORITIES.filter((a) => a.type === 'metro')
    const sanral = AUTHORITIES.filter((a) => a.type === 'national')
    const all = [...metros, ...sanral]
    if (!needle) return all
    return all.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.province.toLowerCase().includes(needle) ||
        a.shortName.toLowerCase().includes(needle)
    )
  }, [hotlineQuery])

  return (
    <div className="tab-page settings-page">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">Tune your patrol</span>
          <h1>Setup</h1>
        </div>
      </header>

      {!standalone && (
        <section className={`install-card ${canInstall ? 'can-install' : ''}`}>
          <div className="install-icon">
            <Icon name="download" size={20} />
          </div>
          <div className="install-copy">
            <strong>{canInstall ? 'Install Pothole Patrol SA' : 'Add to your home screen'}</strong>
            <p>
              {canInstall
                ? 'Runs full-screen and keeps your map tiles available offline.'
                : 'Open this page in Safari or Chrome, then use “Add to Home Screen”. It works like an app and even caches map tiles you have viewed.'}
            </p>
          </div>
          {canInstall && (
            <button type="button" className="btn btn-small btn-primary" onClick={onInstall}>
              Install
            </button>
          )}
        </section>
      )}

      <section className="settings-section">
        <div className="section-head">
          <h2>Detection</h2>
          <span className="threshold-pill">{threshold.toFixed(1)} m/s² trigger</span>
        </div>

        <div className="field">
          <div className="field-head">
            <label>Sensitivity</label>
            <span>
              {SENSITIVITY_OPTIONS.find((option) => option.value === settings.sensitivity)?.label}
            </span>
          </div>
          <div className="segmented" role="group" aria-label="Detection sensitivity">
            {SENSITIVITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={settings.sensitivity === option.value ? 'is-active' : ''}
                onClick={() => onUpdate({ sensitivity: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="field-hint">
            {SENSITIVITY_OPTIONS.find((option) => option.value === settings.sensitivity)?.hint}
          </p>
        </div>

        <div className="field">
          <label htmlFor="vehicle-select">Vehicle profile</label>
          <select
            id="vehicle-select"
            className="text-input"
            value={settings.vehicle}
            onChange={(event) => onUpdate({ vehicle: event.target.value as VehicleType })}
          >
            {VEHICLES.map((vehicle) => (
              <option key={vehicle.value} value={vehicle.value}>
                {vehicle.label}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Heavier vehicles get a higher trigger level so suspension travel is not logged as a
            pothole.
          </p>
        </div>

        <div className="field">
          <div className="field-head">
            <label htmlFor="min-speed">Minimum speed</label>
            <span>{settings.minSpeedKmh} km/h</span>
          </div>
          <input
            id="min-speed"
            className="range-input"
            type="range"
            min={5}
            max={50}
            step={5}
            value={settings.minSpeedKmh}
            onChange={(event) => onUpdate({ minSpeedKmh: Number(event.target.value) })}
          />
          <p className="field-hint">
            Detections below this speed are ignored, so potholes while walking or parking are
            not logged.
          </p>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-head">
          <h2>Alerts & data</h2>
        </div>

        <label className="toggle-row">
          <span>
            <b>Detection sound</b>
            <small>Beep when a pothole is logged.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(event) => onUpdate({ sound: event.target.checked })}
          />
          <span className="switch" aria-hidden="true" />
        </label>

        <label className="toggle-row">
          <span>
            <b>Haptic feedback</b>
            <small>Vibrate on detection (phones that support it).</small>
          </span>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(event) => onUpdate({ haptics: event.target.checked })}
          />
          <span className="switch" aria-hidden="true" />
        </label>

        <label className="toggle-row">
          <span>
            <b>Road-name lookup</b>
            <small>
              Sends coordinates to OpenStreetMap to name the road. Turn off for fully offline
              use.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.autoGeocode}
            onChange={(event) => onUpdate({ autoGeocode: event.target.checked })}
          />
          <span className="switch" aria-hidden="true" />
        </label>

        <label className="toggle-row">
          <span>
            <b>Keep screen awake</b>
            <small>Uses the screen wake lock while recording.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.keepAwake}
            onChange={(event) => onUpdate({ keepAwake: event.target.checked })}
          />
          <span className="switch" aria-hidden="true" />
        </label>

        <label className="toggle-row">
          <span>
            <b>Show drive trail</b>
            <small>Draw the route you have covered on the map.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.showTrail}
            onChange={(event) => onUpdate({ showTrail: event.target.checked })}
          />
          <span className="switch" aria-hidden="true" />
        </label>
      </section>

      <section className="settings-section">
        <div className="section-head">
          <h2>Pothole hotlines</h2>
          <span className="section-note">South Africa</span>
        </div>
        <div className="search-field hotline-search">
          <Icon name="target" size={16} />
          <input
            type="search"
            placeholder="Search city or province"
            value={hotlineQuery}
            onChange={(event) => setHotlineQuery(event.target.value)}
            aria-label="Search reporting hotlines"
          />
        </div>

        {!online && (
          <div className="inline-warning">
            <Icon name="cloudOff" size={16} />
            You are offline. Phone numbers still work; website links need a connection.
          </div>
        )}

        <div className="hotline-list">
          {hotlines.map((authority) => (
            <details className="hotline" key={authority.id}>
              <summary>
                <span className="hotline-name">
                  <strong>{authority.name}</strong>
                  <small>{authority.province}</small>
                </span>
                <span className="hotline-phone">
                  {authority.phones[0]}
                  <Icon name="chevronDown" size={15} />
                </span>
              </summary>
              <div className="hotline-body">
                {authority.note && <p>{authority.note}</p>}
                <div className="hotline-actions">
                  {authority.phones.map((phone) => (
                    <a key={phone} className="btn btn-small btn-secondary" href={telHref(phone)}>
                      <Icon name="phone" size={14} /> {phone}
                    </a>
                  ))}
                  {authority.email && (
                    <a
                      className="btn btn-small btn-secondary"
                      href={`mailto:${authority.email}`}
                    >
                      <Icon name="mail" size={14} /> Email
                    </a>
                  )}
                  <a
                    className="btn btn-small btn-ghost"
                    href={authority.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon name="external" size={14} /> Website
                  </a>
                </div>
              </div>
            </details>
          ))}
          {hotlines.length === 0 && (
            <p className="empty-inline">No reporting channels match “{hotlineQuery}”.</p>
          )}
        </div>

        <p className="field-hint">
          Numbers are main switchboards, not dedicated pothole lines. Details can change —
          confirm on the official website before logging a report. For municipal roads, contact
          your local municipality; SANRAL handles national roads. Outside the metros, use the{' '}
          <a
            className="inline-link"
            href={MUNICIPALITY_DIRECTORY_URL}
            target="_blank"
            rel="noreferrer"
          >
            official municipality directory
          </a>
          .
        </p>
      </section>

      <section className="settings-section">
        <div className="section-head">
          <h2>Your data</h2>
          <span className="section-note">{realCount} real · {demoCount} demo</span>
        </div>
        <p className="data-copy">
          Potholes are stored only in this browser on this device. Export a copy before clearing
          browser data or switching phones.
        </p>
        <div className="data-actions">
          <button type="button" className="btn btn-small btn-secondary" onClick={onExportCsv}>
            <Icon name="download" size={15} /> Export CSV
          </button>
          <button type="button" className="btn btn-small btn-secondary" onClick={onExportGeoJson}>
            <Icon name="download" size={15} /> Export GeoJSON
          </button>
          {demoCount > 0 && (
            <button type="button" className="btn btn-small btn-ghost" onClick={onClearDemo}>
              <Icon name="sparkles" size={15} /> Clear demo data
            </button>
          )}
          {potholes.length > 0 && (
            <button
              type="button"
              className="btn btn-small btn-danger-ghost"
              onClick={() => setConfirmClear(true)}
            >
              <Icon name="trash" size={15} /> Clear all
            </button>
          )}
        </div>
      </section>

      <section className="settings-section about-section">
        <div className="section-head">
          <h2>How it works</h2>
        </div>
        <details className="info-block" open>
          <summary>Detection, in plain language</summary>
          <p>
            Your phone’s motion sensor measures acceleration. Pothole Patrol SA removes gravity,
            watches for a sharp suspension impact, then checks that you were travelling above
            your minimum speed. Nearby impacts within 25 seconds are merged as multiple hits on
            the same pothole. Severity is an estimate based on impact strength.
          </p>
        </details>
        <details className="info-block">
          <summary>Privacy</summary>
          <p>
            Potholes, notes and settings stay in this browser. Nothing is uploaded to a server.
            If road-name lookup is on, coordinates are sent to OpenStreetMap’s Nominatim service
            to find the street name. A report only leaves your phone when you tap copy, share,
            email, WhatsApp or call.
          </p>
        </details>
        <details className="info-block">
          <summary>Safety & accuracy</summary>
          <p>
            Detection is indicative, not a certified road survey. Mount your phone securely and
            never use it while driving. Severity depends on your vehicle, suspension and speed.
            Always confirm the exact location before submitting a report.
          </p>
        </details>
        <p className="version-note">Pothole Patrol SA · v1.0 · Built for South African roads</p>
      </section>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all potholes?"
        subtitle="This cannot be undone. Export a copy first if you need the data."
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setConfirmClear(false)
                onClearAll()
              }}
            >
              <Icon name="trash" size={16} /> Delete everything
            </button>
          </div>
        }
      >
        <p className="modal-copy">
          All {potholes.length} logged potholes, including {demoCount} demo{' '}
          {demoCount === 1 ? 'entry' : 'entries'}, will be removed from this device.
        </p>
      </Modal>
    </div>
  )
}
