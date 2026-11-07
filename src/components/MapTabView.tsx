import type { LatLng, Pothole } from '../types'
import { Icon } from './Icons'
import { MapView } from './MapView'

interface MapTabViewProps {
  position: LatLng | null
  accuracy: number
  heading: number | null
  trail: LatLng[]
  potholes: Pothole[]
  follow: boolean
  showTrail: boolean
  onFollowChange: (follow: boolean) => void
  onSelect: (id: string) => void
  onStartDrive: () => void
}

export function MapTabView({
  position,
  accuracy,
  heading,
  trail,
  potholes,
  follow,
  showTrail,
  onFollowChange,
  onSelect,
  onStartDrive
}: MapTabViewProps) {
  return (
    <div className="map-screen">
      <div className="map-stage map-stage-full">
        <MapView
          position={position}
          accuracy={accuracy}
          heading={heading}
          trail={trail}
          potholes={potholes}
          selectedId={null}
          onSelect={onSelect}
          follow={follow}
          onFollowChange={onFollowChange}
          showTrail={showTrail}
          initialFit="potholes"
        />

        <div className="map-overlay map-overlay-top">
          <span className="chip chip-strong">
            <Icon name="mapPin" size={14} />
            {potholes.length} {potholes.length === 1 ? 'pothole' : 'potholes'}
          </span>
          {position ? (
            <span className="chip">
              <Icon name="locate" size={13} /> ±{Math.round(accuracy)} m
            </span>
          ) : (
            <span className="chip chip-muted">GPS idle</span>
          )}
        </div>

        {potholes.length > 0 && (
          <div className="map-legend">
            <span>
              <i className="legend-dot minor" /> Minor
            </span>
            <span>
              <i className="legend-dot moderate" /> Moderate
            </span>
            <span>
              <i className="legend-dot severe" /> Severe
            </span>
          </div>
        )}

        {potholes.length === 0 && (
          <div className="map-empty-card">
            <div className="empty-icon">
              <Icon name="mapPin" size={22} />
            </div>
            <div>
              <strong>No potholes pinned yet</strong>
              <p>Start a drive and they will appear here as you go.</p>
            </div>
            <button type="button" className="btn btn-small btn-primary" onClick={onStartDrive}>
              <Icon name="play" size={14} /> Start
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
