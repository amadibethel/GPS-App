import type { Authority, Pothole } from '../types'
import { formatDateTime } from './format'
import { googleMapsUrl } from './geo'

export const SEVERITY_LABEL: Record<Pothole['severity'], string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe'
}

export const STATUS_LABEL: Record<Pothole['status'], string> = {
  open: 'Open',
  reported: 'Reported',
  fixed: 'Fixed'
}

export function buildReportText(pothole: Pothole, authority: Authority): string {
  const location = [pothole.roadName, pothole.suburb].filter(Boolean).join(', ')
  const demo = pothole.source === 'demo' ? '[DEMO DATA — NOT A REAL REPORT]\n\n' : ''
  const impact =
    pothole.source === 'manual'
      ? 'marked manually by the driver'
      : `estimated peak impact ${pothole.peakG.toFixed(1)} g at ${pothole.speedKmh} km/h`

  return `${demo}POTHOLE REPORT

Location: ${location || 'Pinned GPS location'}
Coordinates: ${pothole.lat.toFixed(5)}, ${pothole.lng.toFixed(5)} (±${Math.round(
    pothole.accuracy
  )} m)
Map: ${googleMapsUrl(pothole.lat, pothole.lng)}
Road authority: ${authority.name}
Severity: ${SEVERITY_LABEL[pothole.severity]} (${impact})
Detected: ${formatDateTime(pothole.createdAt)}
${pothole.notes ? `Notes: ${pothole.notes}\n` : ''}
Please inspect and repair this pothole.

Report generated with Pothole Patrol SA.`
}

export function reportSubject(pothole: Pothole): string {
  const location = pothole.roadName ?? `${pothole.lat.toFixed(4)}, ${pothole.lng.toFixed(4)}`
  return `Pothole report — ${SEVERITY_LABEL[pothole.severity]} — ${location}`
}

export function mailtoUrl(
  pothole: Pothole,
  authority: Authority,
  body: string
): string {
  const subject = encodeURIComponent(reportSubject(pothole))
  const encodedBody = encodeURIComponent(body)
  return `mailto:${authority.email ?? ''}?subject=${subject}&body=${encodedBody}`
}

export function whatsappUrl(body: string): string {
  return `https://wa.me/?text=${encodeURIComponent(body)}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
