import type { Pothole } from '../types'
import { SEVERITY_LABEL, STATUS_LABEL } from './report'

function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return ''
  let text = String(value)
  // Spreadsheet apps can interpret a leading =, +, - or @ as a formula. Road
  // names come from an external geocoder, so neutralise that on export.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function potholesToCsv(potholes: Pothole[]): string {
  const header = [
    'id',
    'latitude',
    'longitude',
    'severity',
    'status',
    'road',
    'suburb',
    'peak_g',
    'speed_kmh',
    'confidence',
    'hits',
    'source',
    'detected_at',
    'reported_at',
    'fixed_at',
    'accuracy_m',
    'notes'
  ]

  const rows = potholes.map((p) =>
    [
      p.id,
      p.lat.toFixed(6),
      p.lng.toFixed(6),
      SEVERITY_LABEL[p.severity],
      STATUS_LABEL[p.status],
      p.roadName,
      p.suburb,
      p.peakG.toFixed(2),
      Math.round(p.speedKmh),
      (p.confidence * 100).toFixed(0),
      p.hits,
      p.source,
      new Date(p.createdAt).toISOString(),
      p.reportedAt ? new Date(p.reportedAt).toISOString() : '',
      p.fixedAt ? new Date(p.fixedAt).toISOString() : '',
      Math.round(p.accuracy),
      p.notes
    ]
      .map(csvCell)
      .join(',')
  )

  return `\ufeff${header.join(',')}\n${rows.join('\n')}\n`
}

export function potholesToGeoJson(potholes: Pothole[]): string {
  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: 'Pothole Patrol SA',
      generator: 'Pothole Patrol SA',
      features: potholes.map((p) => ({
        type: 'Feature',
        id: p.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]
        },
        properties: {
          severity: p.severity,
          status: p.status,
          road: p.roadName ?? null,
          suburb: p.suburb ?? null,
          peakG: Number(p.peakG.toFixed(2)),
          speedKmh: Math.round(p.speedKmh),
          confidence: Number(p.confidence.toFixed(2)),
          hits: p.hits,
          source: p.source,
          detectedAt: new Date(p.createdAt).toISOString(),
          reportedAt: p.reportedAt ? new Date(p.reportedAt).toISOString() : null,
          fixedAt: p.fixedAt ? new Date(p.fixedAt).toISOString() : null,
          accuracyM: Math.round(p.accuracy),
          notes: p.notes ?? null
        }
      }))
    },
    null,
    2
  )
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function exportFilename(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `pothole-patrol-sa-${stamp}.${extension}`
}
