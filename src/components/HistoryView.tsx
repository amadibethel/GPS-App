import { useMemo, useState } from 'react'
import type { Pothole, PotholeStatus, Severity } from '../types'
import { formatDay, startOfDay, timeAgo } from '../lib/format'
import { SEVERITY_LABEL, STATUS_LABEL } from '../lib/report'
import { Icon } from './Icons'

interface HistoryViewProps {
  potholes: Pothole[]
  onSelect: (id: string) => void
  onExportCsv: () => void
  onExportGeoJson: () => void
  onClearDemo: () => void
  onStartDrive: () => void
}

type StatusFilter = 'all' | PotholeStatus
type SeverityFilter = 'all' | Severity

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'reported', label: 'Reported' },
  { value: 'fixed', label: 'Fixed' }
]

const SEVERITY_FILTERS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'Any severity' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' }
]

export function HistoryView({
  potholes,
  onSelect,
  onExportCsv,
  onExportGeoJson,
  onClearDemo,
  onStartDrive
}: HistoryViewProps) {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [query, setQuery] = useState('')

  const demoCount = potholes.filter((p) => p.source === 'demo').length

  const stats = useMemo(() => {
    return {
      total: potholes.length,
      open: potholes.filter((p) => p.status === 'open').length,
      reported: potholes.filter((p) => p.status === 'reported').length,
      severe: potholes.filter((p) => p.severity === 'severe').length
    }
  }, [potholes])

  const weekly = useMemo(() => {
    const today = startOfDay(Date.now())
    const days = Array.from({ length: 7 }, (_, index) => {
      const dayStart = today - (6 - index) * 86_400_000
      return {
        timestamp: dayStart,
        count: potholes.filter(
          (p) => p.createdAt >= dayStart && p.createdAt < dayStart + 86_400_000
        ).length
      }
    })
    const max = Math.max(1, ...days.map((d) => d.count))
    return { days, max }
  }, [potholes])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return potholes.filter((pothole) => {
      if (status !== 'all' && pothole.status !== status) return false
      if (severity !== 'all' && pothole.severity !== severity) return false
      if (needle) {
        const haystack = [pothole.roadName, pothole.suburb, pothole.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [potholes, status, severity, query])

  if (potholes.length === 0) {
    return (
      <div className="tab-page history-page">
        <header className="page-head">
          <div>
            <span className="page-eyebrow">Your evidence log</span>
            <h1>Pothole log</h1>
          </div>
        </header>
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="mapPin" size={30} />
          </div>
          <h2>No potholes logged yet</h2>
          <p>
            Start a drive and keep your phone mounted. Every detected pothole is saved here
            with its location, severity and time.
          </p>
          <button type="button" className="btn btn-primary" onClick={onStartDrive}>
            <Icon name="play" size={17} />
            Start your first drive
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-page history-page">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">Your evidence log</span>
          <h1>Pothole log</h1>
        </div>
        <span className="page-count">{stats.total}</span>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <span>Open</span>
          <strong>{stats.open}</strong>
        </div>
        <div className="stat-card">
          <span>Reported</span>
          <strong>{stats.reported}</strong>
        </div>
        <div className="stat-card stat-severe">
          <span>Severe</span>
          <strong>{stats.severe}</strong>
        </div>
        <div className="stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
      </div>

      <section className="chart-card">
        <div className="section-head">
          <h2>Last 7 days</h2>
          <span className="chart-total">
            {weekly.days.reduce((sum, day) => sum + day.count, 0)} detections
          </span>
        </div>
        <div className="bar-chart">
          {weekly.days.map((day, index) => (
            <div className="bar-column" key={day.timestamp}>
              <div className="bar-track">
                <div
                  className={`bar-fill ${index === 6 ? 'is-today' : ''}`}
                  style={{
                    height: `${Math.max(day.count === 0 ? 3 : 12, (day.count / weekly.max) * 100)}%`
                  }}
                >
                  {day.count > 0 && <span>{day.count}</span>}
                </div>
              </div>
              <span className={index === 6 ? 'is-today' : ''}>
                {index === 6 ? 'Today' : formatDay(day.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {demoCount > 0 && (
        <div className="demo-data-banner">
          <Icon name="sparkles" size={17} />
          <p>
            <b>{demoCount}</b> demo {demoCount === 1 ? 'pothole' : 'potholes'} in this log.
            They are labelled <b>DEMO</b> and are not real reports.
          </p>
          <button type="button" className="text-button" onClick={onClearDemo}>
            Clear demo data
          </button>
        </div>
      )}

      <div className="filter-block">
        <div className="chip-row">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`filter-chip ${status === filter.value ? 'is-active' : ''}`}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <div className="search-field">
            <Icon name="target" size={16} />
            <input
              type="search"
              placeholder="Search road or suburb"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search potholes"
            />
          </div>
          <select
            className="filter-select"
            value={severity}
            onChange={(event) => setSeverity(event.target.value as SeverityFilter)}
            aria-label="Filter by severity"
          >
            {SEVERITY_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="export-row">
        <button type="button" className="btn btn-small btn-secondary" onClick={onExportCsv}>
          <Icon name="download" size={15} /> CSV
        </button>
        <button type="button" className="btn btn-small btn-secondary" onClick={onExportGeoJson}>
          <Icon name="download" size={15} /> GeoJSON
        </button>
        <span className="export-note">
          {filtered.length} of {potholes.length} shown
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-filter">
          <Icon name="target" size={22} />
          <p>No potholes match these filters.</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setStatus('all')
              setSeverity('all')
              setQuery('')
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="pothole-list">
          {filtered.map((pothole) => (
            <button
              key={pothole.id}
              type="button"
              className="pothole-card"
              onClick={() => onSelect(pothole.id)}
            >
              <span className={`severity-orb ${pothole.severity}`} />
              <span className="pothole-card-main">
                <span className="pothole-card-title">
                  {SEVERITY_LABEL[pothole.severity]} pothole
                  {pothole.hits > 1 && <em className="hits-tag">×{pothole.hits}</em>}
                  {pothole.source === 'demo' && <em className="demo-tag">DEMO</em>}
                  <em className={`status-tag ${pothole.status}`}>
                    {STATUS_LABEL[pothole.status]}
                  </em>
                </span>
                <span className="pothole-card-meta">
                  {pothole.roadName ?? `${pothole.lat.toFixed(4)}, ${pothole.lng.toFixed(4)}`}
                  {pothole.suburb ? `, ${pothole.suburb}` : ''}
                </span>
                <span className="pothole-card-sub">
                  {timeAgo(pothole.createdAt)}
                  {pothole.source === 'manual' ? ' · Marked manually' : ''}
                  {pothole.source === 'motion' ? ` · ${pothole.peakG.toFixed(1)} g impact` : ''}
                </span>
              </span>
              <Icon name="chevronRight" size={16} className="muted-icon" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
