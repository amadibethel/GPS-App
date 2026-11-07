import { useEffect, useState } from 'react'
import type { Pothole } from '../types'
import { findAuthority } from '../data/authorities'
import { formatDateTime, timeAgo } from '../lib/format'
import { copyText, SEVERITY_LABEL, STATUS_LABEL } from '../lib/report'
import { googleMapsUrl } from '../lib/geo'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface PotholeDetailProps {
  pothole: Pothole
  online: boolean
  onClose: () => void
  onReport: () => void
  onUpdate: (patch: Partial<Pothole>) => void
  onDelete: () => void
  onLookupRoad: () => Promise<void>
}

export function PotholeDetail({
  pothole,
  online,
  onClose,
  onReport,
  onUpdate,
  onDelete,
  onLookupRoad
}: PotholeDetailProps) {
  const [notes, setNotes] = useState(pothole.notes ?? '')
  const [copied, setCopied] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lookupBusy, setLookupBusy] = useState(false)

  useEffect(() => {
    setNotes(pothole.notes ?? '')
    setConfirmDelete(false)
    setCopied(false)
    setNoteSaved(false)
  }, [pothole.id, pothole.notes])

  const reportedAuthority = findAuthority(pothole.authorityId)
  const location = [pothole.roadName, pothole.suburb].filter(Boolean).join(', ')
  const coords = `${pothole.lat.toFixed(5)}, ${pothole.lng.toFixed(5)}`
  const notesDirty = (pothole.notes ?? '') !== notes.trim()

  const handleCopy = async () => {
    const ok = await copyText(coords)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_800)
    }
  }

  const handleSaveNote = () => {
    onUpdate({ notes: notes.trim() || undefined })
    setNoteSaved(true)
    window.setTimeout(() => setNoteSaved(false), 1_800)
  }

  const handleLookup = async () => {
    setLookupBusy(true)
    try {
      await onLookupRoad()
    } finally {
      setLookupBusy(false)
    }
  }

  const handleToggleFixed = () => {
    if (pothole.status === 'fixed') {
      onUpdate({
        status: pothole.reportedAt ? 'reported' : 'open',
        fixedAt: undefined
      })
    } else {
      onUpdate({ status: 'fixed', fixedAt: Date.now() })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${SEVERITY_LABEL[pothole.severity]} pothole`}
      subtitle={location || coords}
      size="wide"
    >
      <div className="detail-badges">
        <span className={`severity-pill ${pothole.severity}`}>
          <span className="severity-orb" />
          {SEVERITY_LABEL[pothole.severity]}
        </span>
        <span className={`status-pill ${pothole.status}`}>{STATUS_LABEL[pothole.status]}</span>
        {pothole.source === 'demo' && <span className="demo-tag">DEMO DATA</span>}
        {pothole.source === 'manual' && <span className="source-tag">Manual mark</span>}
        {pothole.source === 'motion' && <span className="source-tag">Motion sensor</span>}
      </div>

      {pothole.source === 'demo' && (
        <div className="inline-warning">
          <Icon name="sparkles" size={16} />
          This entry was created in demo mode. Do not submit it as a real report.
        </div>
      )}

      <div className="detail-grid">
        <div>
          <span>Detected</span>
          <strong>{formatDateTime(pothole.createdAt)}</strong>
          <small>{timeAgo(pothole.createdAt)}</small>
        </div>
        <div>
          <span>Impact</span>
          <strong>
            {pothole.source === 'manual' ? '—' : `${pothole.peakG.toFixed(1)} g`}
          </strong>
          <small>
            {pothole.source === 'manual'
              ? 'Marked by driver'
              : `${Math.round(pothole.peakMs2)} m/s² peak`}
          </small>
        </div>
        <div>
          <span>Speed</span>
          <strong>{Math.round(pothole.speedKmh)} km/h</strong>
          <small>At detection</small>
        </div>
        <div>
          <span>{pothole.hits > 1 ? 'Confirmations' : 'Confidence'}</span>
          <strong>
            {pothole.hits > 1 ? `${pothole.hits} hits` : `${Math.round(pothole.confidence * 100)}%`}
          </strong>
          <small>{pothole.hits > 1 ? 'Same spot, multiple impacts' : 'Model estimate'}</small>
        </div>
      </div>

      <section className="detail-section">
        <div className="detail-section-head">
          <span className="card-label">Location</span>
          {pothole.accuracy > 0 && (
            <span className="detail-accuracy">±{Math.round(pothole.accuracy)} m GPS</span>
          )}
        </div>
        <div className="location-card">
          <div className="location-icon">
            <Icon name="mapPin" size={19} />
          </div>
          <div className="location-copy">
            <strong>{pothole.roadName ?? 'Road name not found'}</strong>
            <span>{pothole.suburb ?? 'Tap lookup to name the street'}</span>
            <button type="button" className="coord-button" onClick={handleCopy}>
              <code>{coords}</code>
              <span>{copied ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}</span>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="location-actions">
          <a
            className="btn btn-small btn-secondary"
            href={googleMapsUrl(pothole.lat, pothole.lng)}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" size={14} /> Directions
          </a>
          {!pothole.roadName && (
            <button
              type="button"
              className="btn btn-small btn-ghost"
              onClick={handleLookup}
              disabled={lookupBusy || !online}
              title={online ? 'Look up the road name' : 'Requires an internet connection'}
            >
              <Icon name="refresh" size={14} />
              {lookupBusy ? 'Looking up…' : 'Find road name'}
            </button>
          )}
        </div>
      </section>

      {pothole.status === 'reported' && (
        <div className="reported-info">
          <Icon name="check" size={16} />
          <div>
            <strong>Reported {pothole.reportedAt ? timeAgo(pothole.reportedAt) : ''}</strong>
            <span>{reportedAuthority?.name ?? 'Municipal authority'}</span>
          </div>
        </div>
      )}

      <section className="detail-section">
        <div className="detail-section-head">
          <span className="card-label">Notes</span>
          {noteSaved && (
            <span className="saved-note">
              <Icon name="check" size={13} /> Saved
            </span>
          )}
        </div>
        <textarea
          className="text-area"
          rows={3}
          placeholder="Add landmarks or details for the repair team…"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        {notesDirty && (
          <button type="button" className="btn btn-small btn-secondary note-save" onClick={handleSaveNote}>
            Save note
          </button>
        )}
      </section>

      <div className="detail-actions">
        <button type="button" className="btn btn-primary" onClick={onReport}>
          <Icon name="flag" size={16} />
          {pothole.status === 'reported' ? 'Report again' : 'Report to municipality'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleToggleFixed}>
          <Icon name={pothole.status === 'fixed' ? 'refresh' : 'check'} size={16} />
          {pothole.status === 'fixed' ? 'Reopen pothole' : 'Mark as fixed'}
        </button>
      </div>

      <div className="delete-zone">
        {confirmDelete ? (
          <div className="delete-confirm">
            <p>Delete this pothole from your device?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-small btn-danger" onClick={onDelete}>
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-button danger" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={14} /> Delete entry
          </button>
        )}
      </div>
    </Modal>
  )
}
