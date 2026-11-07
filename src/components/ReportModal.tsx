import { useEffect, useMemo, useState } from 'react'
import type { Pothole } from '../types'
import { AUTHORITIES, findAuthority, MUNICIPALITY_DIRECTORY_URL, suggestAuthority, telHref } from '../data/authorities'
import { formatDateTime } from '../lib/format'
import { buildReportText, copyText, mailtoUrl, reportSubject, whatsappUrl } from '../lib/report'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface ReportModalProps {
  pothole: Pothole
  online: boolean
  onClose: () => void
  onMarkReported: (authorityId: string) => void
  onToast: (title: string, message?: string, tone?: 'default' | 'success' | 'warning' | 'danger') => void
}

export function ReportModal({
  pothole,
  online,
  onClose,
  onMarkReported,
  onToast
}: ReportModalProps) {
  const suggestion = useMemo(
    () => suggestAuthority(pothole.lat, pothole.lng),
    [pothole.lat, pothole.lng]
  )
  const [authorityId, setAuthorityId] = useState(
    pothole.authorityId ?? suggestion.authority.id
  )

  useEffect(() => {
    setAuthorityId(pothole.authorityId ?? suggestion.authority.id)
  }, [pothole.id, pothole.authorityId, suggestion.authority.id])

  const authority = findAuthority(authorityId) ?? suggestion.authority
  const text = useMemo(() => buildReportText(pothole, authority), [pothole, authority])
  const subject = reportSubject(pothole)

  const handleCopy = async () => {
    const ok = await copyText(text)
    onToast(
      ok ? 'Report copied' : 'Could not copy',
      ok ? 'Paste it into an email, WhatsApp or your municipality’s web form.' : 'Select the report text and copy it manually.',
      ok ? 'success' : 'warning'
    )
  }

  const handleShare = async () => {
    if (!navigator.share) {
      await handleCopy()
      return
    }
    try {
      await navigator.share({ title: subject, text })
    } catch {
      // User cancelled the share sheet.
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Report this pothole"
      subtitle={`${authority.shortName} · ${authority.province}`}
      size="wide"
    >
      {pothole.source === 'demo' && (
        <div className="inline-warning warn-strong">
          <Icon name="sparkles" size={16} />
          Demo detection. The report text is prefixed with DEMO DATA — don’t submit it as a
          real complaint.
        </div>
      )}

      <div className="authority-card">
        <div className="authority-head">
          <div>
            <span className="card-label">Road authority</span>
            <strong>{authority.name}</strong>
          </div>
          <span className="distance-pill">
            {suggestion.fallback
              ? 'National fallback'
              : `${suggestion.distanceKm.toFixed(1)} km away`}
          </span>
        </div>
        <select
          className="text-input"
          value={authorityId}
          onChange={(event) => setAuthorityId(event.target.value)}
          aria-label="Choose road authority"
        >
          {AUTHORITIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.province}
            </option>
          ))}
        </select>
        {suggestion.fallback && authority.id === 'sanral' ? (
          <p className="authority-note">
            No metro is within 85 km of this pin. SANRAL only handles national roads — for a
            municipal street, find your local municipality in the{' '}
            <a
              className="inline-link"
              href={MUNICIPALITY_DIRECTORY_URL}
              target="_blank"
              rel="noreferrer"
            >
              official government directory
            </a>{' '}
            and call its switchboard.
          </p>
        ) : (
          <p className="authority-note">
            {authority.note ?? 'Confirm the correct department before logging the report.'}
          </p>
        )}
        <div className="authority-links">
          {authority.phones.map((phone) => (
            <a key={phone} className="btn btn-small btn-secondary" href={telHref(phone)}>
              <Icon name="phone" size={14} /> {phone}
            </a>
          ))}
          <a
            className="btn btn-small btn-ghost"
            href={authority.website}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" size={14} /> Official website
          </a>
        </div>
      </div>

      <div className="report-preview-head">
        <span className="card-label">Report preview</span>
        <span className="report-time">
          <Icon name="clock" size={13} /> {formatDateTime(pothole.createdAt)}
        </span>
      </div>
      <pre className="report-preview" tabIndex={0}>
        {text}
      </pre>

      <div className="report-actions">
        <button type="button" className="btn btn-primary" onClick={handleCopy}>
          <Icon name="copy" size={16} /> Copy report
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button type="button" className="btn btn-secondary" onClick={handleShare}>
            <Icon name="share" size={16} /> Share
          </button>
        )}
        <a
          className="btn btn-secondary"
          href={whatsappUrl(text)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="phone" size={16} /> WhatsApp
        </a>
        {authority.email && (
          <a className="btn btn-secondary" href={mailtoUrl(pothole, authority, text)}>
            <Icon name="mail" size={16} /> Email
          </a>
        )}
        {authority.phones[0] && (
          <a className="btn btn-secondary" href={telHref(authority.phones[0])}>
            <Icon name="phone" size={16} /> Call
          </a>
        )}
        <a
          className="btn btn-secondary"
          href={authority.website}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="external" size={16} /> Open site
        </a>
      </div>

      {!online && (
        <div className="inline-warning">
          <Icon name="cloudOff" size={16} />
          You are offline. You can still copy the report or call — website, email and WhatsApp
          links need a connection.
        </div>
      )}

      <div className="report-footer">
        <p>
          Reports are never sent automatically. You control what leaves your phone. Confirm the
          location and authority before submitting.
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-track"
          onClick={() => onMarkReported(authority.id)}
        >
          <Icon name="check" size={16} /> Mark as reported
        </button>
      </div>
    </Modal>
  )
}
