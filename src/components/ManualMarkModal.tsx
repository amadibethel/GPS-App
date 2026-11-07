import { useEffect, useState } from 'react'
import type { LatLng, Severity } from '../types'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface ManualMarkModalProps {
  open: boolean
  onClose: () => void
  position: LatLng | null
  accuracy: number
  speedKmh: number
  demo: boolean
  onAdd: (severity: Severity, notes: string) => void
}

const OPTIONS: { value: Severity; label: string; hint: string }[] = [
  { value: 'minor', label: 'Minor', hint: 'Shallow, cosmetic or easy to steer around.' },
  { value: 'moderate', label: 'Moderate', hint: 'A noticeable jolt or a wheel-sized hole.' },
  { value: 'severe', label: 'Severe', hint: 'Deep, sharp-edged or dangerous to traffic.' }
]

export function ManualMarkModal({
  open,
  onClose,
  position,
  accuracy,
  speedKmh,
  demo,
  onAdd
}: ManualMarkModalProps) {
  const [severity, setSeverity] = useState<Severity>('moderate')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setSeverity('moderate')
      setNotes('')
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark a pothole"
      subtitle="Drop a pin at your current GPS location."
    >
      {position ? (
        <div className="manual-location">
          <div className="location-icon">
            <Icon name="mapPin" size={19} />
          </div>
          <div>
            <strong>
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </strong>
            <span>
              ±{Math.round(accuracy)} m · {Math.round(speedKmh)} km/h
              {demo ? ' · demo location' : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="inline-warning">
          <Icon name="alert" size={16} />
          Waiting for a GPS fix. Start a drive and try again once the map shows your
          location.
        </div>
      )}

      <div className="field">
        <label>How bad is it?</label>
        <div className="severity-options">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`severity-option ${option.value} ${
                severity === option.value ? 'is-active' : ''
              }`}
              onClick={() => setSeverity(option.value)}
            >
              <span className={`severity-orb ${option.value}`} />
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="manual-note">Note (optional)</label>
        <textarea
          id="manual-note"
          className="text-area"
          rows={3}
          placeholder="e.g. Just after the William Nicol off-ramp, left lane"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!position}
          onClick={() => onAdd(severity, notes.trim())}
        >
          <Icon name="plus" size={16} /> Log pothole
        </button>
      </div>
    </Modal>
  )
}
