# Pothole Patrol SA

A mobile-first, offline-capable **Progressive Web App** that detects potholes on South African roads using your phone's GPS and motion sensors, maps them, keeps a local evidence log, and helps you send a report to the right road authority.

Built with React, TypeScript, Vite, Leaflet and Workbox. No account, no backend, no data leaves your device unless you choose to share it.

> **Detections are indicative, not a certified road survey.** A phone accelerometer cannot measure pothole depth or geometry. Treat logged locations as a starting point and always confirm the road, severity and authority before submitting a report.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [Screens](#screens)
- [How detection works](#how-detection-works)
- [Reporting workflow](#reporting-workflow)
- [Demo mode](#demo-mode)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [PWA and offline behaviour](#pwa-and-offline-behaviour)
- [Data, storage and privacy](#data-storage-and-privacy)
- [Project structure](#project-structure)
- [Customisation](#customisation)
- [Browser support and limitations](#browser-support-and-limitations)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Licence](#licence)
- [Acknowledgements](#acknowledgements)

---

## Why this exists

South African drivers frequently encounter potholes that go unreported because reporting is fragmented across municipalities, call centres, apps and email addresses. Pothole Patrol SA reduces that friction:

1. **Detect** — the app watches the phone's accelerometer while you drive and logs significant suspension impacts.
2. **Map** — each hit is pinned with GPS coordinates, accuracy, speed and a severity estimate.
3. **Report** — the app picks the nearest city/metro authority (or SANRAL for national roads) and generates a ready-to-send report.

Everything works offline once the app has been loaded and installed. Reporting is always user-initiated: the app never submits anything on your behalf.

---

## Features

### Detection and logging
- Gravity-compensated acceleration from the device motion sensor
- Configurable sensitivity (low / balanced / high) and vehicle profile (car, SUV/bakkie, taxi, bus, truck)
- Minimum-speed gate to avoid logging potholes while walking or parked
- Three-second refractory period to suppress duplicate impacts
- Automatic merging of repeat hits within **25 seconds and 35 metres**
- Severity bands: minor, moderate, severe
- Confidence score derived from impact strength, speed and sample count
- Manual **Mark pothole** fallback when sensors are unavailable or permission is denied
- Optional sound, haptics and screen wake lock during a drive

### Map and history
- Live Leaflet map with dark CARTO tiles and OpenStreetMap attribution
- User position marker with heading and GPS accuracy circle
- Breadcrumb trail (optional)
- Colour-coded pothole markers by severity and status
- Filter by status (open / reported / fixed), severity, and free-text search
- Seven-day detection chart
- Detail view with impact metrics, notes, road lookup, status changes and deletion
- Last-trip summary saved locally

### Reporting
- Nearest supported city/metro authority within **85 km**, otherwise SANRAL national fallback
- Manual authority override from a dropdown
- Offline-generated report text with coordinates, Google Maps link, severity, time and notes
- Copy, native share, WhatsApp, email, phone and official-website actions
- Clear offline warning and “Mark as reported” tracking
- Directory link for municipalities outside the supported list
- Demo detections are clearly prefixed with `DEMO DATA — NOT A REAL REPORT`

### Data and export
- All potholes and settings stored in `localStorage`
- CSV export (UTF-8 with BOM, spreadsheet-formula neutralisation)
- GeoJSON `FeatureCollection` export for QGIS, Google Earth or web maps
- Bulk clear of demo data or all data (with confirmation)

### PWA
- Installable on Android and iOS home screens
- Standalone display, theme colour and maskable icons
- App-shell precaching via Workbox
- Offline map tiles (stale-while-revalidate, up to 3 000 tiles / 30 days)
- Cached reverse-geocoding responses (network-first, up to 300 / 30 days)
- Auto-updating service worker

---

## Screens

| Tab | Purpose |
| --- | --- |
| **Drive** | Start/stop a live or demo drive, see speed, distance, duration, session pothole count, sensor status, live vibration level, recent detections, and the manual mark button. |
| **Map** | Full-screen map of all potholes, your live position, accuracy circle and trail. Toggle follow mode. |
| **Log** | Evidence log with stats, seven-day chart, filters, search, exports and demo-data controls. Tap a card for details and reporting. |
| **Setup** | Detection sensitivity, vehicle profile, minimum speed, alerts, geocoding, trail and wake-lock toggles, hotline directory, install card, data export/clear, and an explanation of how detection works. |

---

## How detection works

### Sensor pipeline

```
DeviceMotionEvent
      │
      ▼
deviationFromMotion()          gravity-compensated magnitude (m/s²)
      │                        uses event.acceleration, falls back to
      │                        |‖accelerationIncludingGravity‖ − 9.80665|
      ▼
PotholeDetector.sample()
      │  threshold gate → candidate window → speed gate → refractory gate
      ▼
DetectionResult
      │  peak m/s², peak g, duration, samples, speed, severity, confidence
      ▼
App.handleDetection()
      │  merge within 25 s / 35 m, otherwise create a new pothole
      ▼
Pothole state → localStorage → map / log / report
```

### Trigger threshold

```
threshold (m/s²) = sensitivity base × vehicle factor
```

| Sensitivity | Base (m/s²) |
| --- | --- |
| Low | 17.0 |
| Balanced | 11.5 |
| High | 7.5 |

| Vehicle | Factor |
| --- | --- |
| Car / hatchback | 1.00 |
| SUV / bakkie | 0.95 |
| Minibus taxi | 1.06 |
| Bus | 1.30 |
| Truck | 1.45 |

The default is **Balanced + Car = 11.5 m/s²**. Heavier vehicles raise the threshold because their suspension transmits less shock to a mounted phone.

### Candidate handling
- A candidate starts when the deviation crosses the threshold.
- Samples more than **180 ms** apart are treated as separate events.
- A candidate is flushed after **550 ms** or when the signal drops for 180 ms.
- Values above **160 m/s²** are discarded as implausible (phone drop or crash-level shock).
- A flushed candidate is rejected below the threshold or below the configured minimum speed.
- At least **3 seconds** must pass between emitted detections.

### Severity

| Severity | Peak acceleration |
| --- | --- |
| Minor | < 14 m/s² |
| Moderate | 14 – 25.9 m/s² |
| Severe | ≥ 26 m/s² |

### Confidence

Confidence combines how far the peak exceeded the trigger threshold, vehicle speed, and the number of samples captured, clamped to **0.30 – 0.98**. Manual entries are stored with confidence `1.0`.

### Speed
Speed comes from the Geolocation API's `coords.speed` when available. If the browser does not report speed, the app estimates it from consecutive GPS fixes, with sanity limits and a 240 km/h cap. GPS accuracy above 70 m is ignored for distance and trail accumulation.

---

## Reporting workflow

1. Open a pothole from **Drive**, **Map** or **Log**.
2. Tap **Report to municipality**.
3. The app suggests the nearest supported authority using the distance from the pothole to each authority's city centre:
   - Within 85 km → nearest **city/metro** authority.
   - Beyond 85 km → **SANRAL** national fallback with a link to the official municipal directory.
4. Review or change the authority in the dropdown.
5. Copy the generated report, share it, open WhatsApp, email it, or call the listed number.
6. Tap **Mark as reported** to update the local status.

### Supported reporting channels

| Authority | Province | Phone | Email |
| --- | --- | --- | --- |
| City of Johannesburg (JRA) | Gauteng | 0860 562 874 | hotline@jra.org.za |
| City of Tshwane | Gauteng | 012 358 9999 / 080 111 1556 | potholes@tshwane.gov.za |
| City of Ekurhuleni | Gauteng | 0860 543 000 | call.centre@ekurhuleni.gov.za |
| City of Cape Town | Western Cape | 0860 103 089 | contact.us@capetown.gov.za |
| eThekwini Municipality | KwaZulu-Natal | 031 311 1111 | sizakala@durban.gov.za |
| Nelson Mandela Bay Municipality | Eastern Cape | 041 506 1911 / 0800 20 5050 | customercare@mandelametro.gov.za |
| Buffalo City Municipality | Eastern Cape | 043 705 2000 / 043 705 9220 | customercare@buffalocity.gov.za |
| Mangaung Metropolitan Municipality | Free State | 051 405 8911 | enquiry@mangaung.co.za |
| Msunduzi Municipality | KwaZulu-Natal | 033 392 2000 / 080 000 1868 | — |
| Polokwane Municipality | Limpopo | 015 290 2000 | — |
| Mbombela Municipality | Mpumalanga | 013 759 2000 / 0861 626 6235 | customercare@mbombela.gov.za |
| Sol Plaatje Municipality | Northern Cape | 053 830 6111 / 080 122 9010 | — |
| Rustenburg Local Municipality | North West | 014 590 3111 | — |
| George Municipality | Western Cape | 044 801 9111 | gmun@george.gov.za |
| SANRAL (national roads) | National | 0800 726 725 / 069 019 1088 | info@sanral.co.za |

Contact details change often. The app links to each authority's official website and asks you to confirm before submitting. Municipal roads outside these areas should be reported via the [official government directory](https://www.gov.za/about-government/contact-directory/provincial-local-government).

### Generated report example

```text
POTHOLE REPORT

Location: Maude Street, Sandown
Coordinates: -26.10675, 28.05400 (±6 m)
Map: https://www.google.com/maps?q=-26.106750,28.054000
Road authority: City of Johannesburg
Severity: Moderate (estimated peak impact 2.1 g at 60 km/h)
Detected: 07 Nov 2026, 03:39

Please inspect and repair this pothole.

Report generated with Pothole Patrol SA.
```

---

## Demo mode

Tap **Try a demo drive** on the Drive screen to run a simulated ~5.8 km loop around Sandton, Johannesburg:

- Simulated speed of roughly 39–57 km/h at 10 Hz
- Ten pothole zones with peaks from 13 to 44 m/s²
- Feed through the same `PotholeDetector` used by live motion events
- Potholes tagged `DEMO` in the list, marked distinctly on the map, and prefixed in reports
- “Clear demo data” removes only demo entries, keeping real logs

Demo mode is the fastest way to evaluate the UI without a phone sensor or GPS.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript 5.9 |
| Build | Vite 8 |
| Maps | Leaflet 1.9.4 (direct, no react-leaflet) |
| PWA | vite-plugin-pwa 2 + Workbox |
| Tiles | CARTO dark basemap / OpenStreetMap data |
| Geocoding | OpenStreetMap Nominatim reverse geocoding (optional) |
| Storage | Browser `localStorage` |
| Styling | Hand-written CSS in `src/index.css` |

No runtime state library, router, UI kit or backend is used. The app is a single-page progressive web app.

---

## Getting started

### Requirements

- **Node.js 20.19+ or 22.12+** (required by Vite 8)
- npm 10+
- A modern Chromium or Safari browser
- For real sensor testing: a phone with GPS and a motion sensor, served over **HTTPS** (or `localhost`)

### Install and run

```bash
npm install
npm run dev
```

Vite prints a local URL (`http://localhost:5173`) and a LAN URL. The dev server binds to all interfaces because `dev` uses `--host`.

To test the production PWA, including the service worker and offline cache:

```bash
npm run build
npm run preview
```

Then open `http://localhost:4173`.

> The service worker is disabled in development (`devOptions.enabled: false`), so offline behaviour must be tested against `preview` or a deployed HTTPS build.

### Testing on a phone

1. Put your phone and computer on the same network.
2. Run `npm run dev` and open the printed LAN URL on the phone.
3. For GPS and motion sensors, browsers usually require a secure context. Use a deployed HTTPS URL or a tunnel such as `ngrok`, Cloudflare Tunnel, or `vite --host` with a local TLS certificate.
4. On iOS, motion access must be requested from a user gesture — tap **Start drive** rather than reloading mid-drive.

---

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Vite on port 5173, bound to all interfaces |
| `npm run build` | Type-check (`tsc -b`) then build the client and PWA |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run typecheck` | Type-check without emitting |
| `npm run icons` | Regenerate PWA icons from `scripts/generate-icons.mjs` |

Build output goes to `dist/`. The PWA plugin emits `manifest.webmanifest`, `sw.js` and Workbox runtime files there.

---

## PWA and offline behaviour

The manifest is configured in `vite.config.ts`:

- Name: **Pothole Patrol SA**, short name **Pothole Patrol**
- `display: standalone`, `orientation: any`, `lang: en-ZA`
- Theme and background: `#0c0a09`
- Icons: 192, 512, and a 512 maskable icon

### Caching strategy

| Request | Strategy | Limits |
| --- | --- | --- |
| App shell (`js`, `css`, `html`, `svg`, `png`, `woff2`) | Precache | 14 entries |
| CARTO map tiles | Stale while revalidate | 3 000 entries / 30 days |
| Nominatim reverse geocoding | Network first, 8 s timeout | 300 entries / 30 days |

`navigateFallback: '/index.html'` keeps deep links working offline. `registerType: 'autoUpdate'` activates new versions automatically on the next load.

### Install

- **Android/Chromium**: the `beforeinstallprompt` event is captured, and an install button appears in the top bar and Setup.
- **iOS Safari**: use **Share → Add to Home Screen**. The app shows guidance in Setup when not running standalone.

---

## Data, storage and privacy

### What is stored

All data stays in your browser:

| Key | Contents |
| --- | --- |
| `pothole-patrol-sa.potholes.v1` | Array of pothole records |
| `pothole-patrol-sa.settings.v1` | Detection and app settings |
| `pothole-patrol-sa.last-trip.v1` | Most recent trip summary |

Pothole records may contain: coordinates, GPS accuracy, severity, peak acceleration, speed, confidence, hit count, source (`motion`, `manual`, `demo`), status, road/suburb names, authority ID, timestamps and user notes.

### Network requests

- **Map tiles** go to CARTO/OpenStreetMap when online.
- **Reverse geocoding** goes to Nominatim only when auto-geocode is enabled and the device is online. Requests are queued at roughly one per 1.1 seconds, cached in memory and in the service worker, and time out after 8 seconds.
- **Reporting links** only open when you tap them. Nothing is posted automatically.
- No analytics, tracking or accounts.

### Clearing data

- **Setup → Your data → Clear demo data** removes only demo entries.
- **Clear all potholes** asks for confirmation and also clears the last-trip summary.
- Clearing browser storage or uninstalling the PWA removes everything.

### Export formats

**CSV** — one row per pothole with columns for ID, latitude, longitude, severity, status, road, suburb, peak g, speed, confidence, hits, source, timestamps, accuracy and notes. A UTF-8 BOM is included for Excel. Values starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with a single quote to prevent spreadsheet formula injection.

**GeoJSON** — a `FeatureCollection` of `Point` geometries with properties mirrored from the CSV. Coordinates are `[longitude, latitude]` per the GeoJSON specification.

---

## Project structure

```text
GPS App/
├── index.html                  # App shell, meta, viewport, theme
├── vite.config.ts              # Vite, PWA manifest, Workbox caching
├── tsconfig*.json
├── package.json
├── scripts/
│   └── generate-icons.mjs      # PWA icon generator
├── public/
│   ├── favicon.svg
│   └── icons/                  # 192, 512, maskable, 1024
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # State, detection wiring, reporting, exports
    ├── index.css               # Full design system and responsive styles
    ├── types.ts                # Shared domain types
    ├── vite-env.d.ts
    ├── components/
    │   ├── DriveView.tsx       # Drive tab and live stats
    │   ├── MapTabView.tsx      # Map tab wrapper
    │   ├── MapView.tsx         # Leaflet map, markers, trail, accuracy
    │   ├── HistoryView.tsx     # Log, filters, chart, exports
    │   ├── SettingsView.tsx    # Settings, hotlines, install, data
    │   ├── PotholeDetail.tsx   # Detail sheet with status and notes
    │   ├── ReportModal.tsx     # Authority selection and report actions
    │   ├── ManualMarkModal.tsx # Manual pothole entry
    │   ├── Modal.tsx           # Accessible dialog shell
    │   ├── Toast.tsx           # Transient notifications
    │   └── Icons.tsx           # Inline SVG icon set
    ├── hooks/
    │   ├── useGeolocation.ts   # GPS watch, speed fallback, trail, distance
    │   ├── useDetection.ts     # Motion listener and demo feed bridge
    │   └── useDemoDrive.ts     # Sandton simulation at 10 Hz
    ├── lib/
    │   ├── detection.ts        # Detector, thresholds, permissions
    │   ├── geocode.ts          # Nominatim queue, cache, timeout
    │   ├── geo.ts              # Haversine, bearing, formatting, URLs
    │   ├── report.ts           # Report text, mailto/WhatsApp, clipboard
    │   ├── export.ts           # CSV and GeoJSON generation
    │   ├── storage.ts          # localStorage load/save and migration guards
    │   ├── feedback.ts         # Web Audio, vibration, wake lock
    │   └── format.ts           # Date and relative-time formatting
    └── data/
        ├── authorities.ts      # SA reporting directory and nearest lookup
        └── demoRoute.ts        # Demo route, impact zones, road noise
```

---

## Customisation

### Detection tuning

Edit `src/lib/detection.ts`:

```ts
export const SENSITIVITY_BASE = { low: 17, balanced: 11.5, high: 7.5 }
export const VEHICLE_FACTORS = { car: 1, suv: 0.95, taxi: 1.06, bus: 1.3, truck: 1.45 }
```

Other constants in the same file:

| Constant | Purpose |
| --- | --- |
| `MAX_PLAUSIBLE_MS2` | Upper bound for believable impacts (160) |
| `REFRACTORY_MS` | Minimum gap between detections (3 000) |
| `CANDIDATE_GAP_MS` | Silence that ends an impact (180) |
| `CANDIDATE_MAX_MS` | Maximum impact length (550) |

Severity bands live in `severityForPeak()` (14 / 26 m/s²). Merge distance and time are in `App.tsx` (`25_000` ms, `35` m).

### Defaults and ranges

Edit `src/lib/storage.ts`:

```ts
export const DEFAULT_SETTINGS = {
  sensitivity: 'balanced',
  vehicle: 'car',
  minSpeedKmh: 15,
  sound: true,
  haptics: true,
  autoGeocode: true,
  showTrail: true,
  keepAwake: true
}
```

The minimum speed is clamped to **5–60 km/h** when loaded.

### Reporting directory

Edit `src/data/authorities.ts` to add an authority, phone number, email, website or note. Each authority needs a `center` used for nearest-authority distance. The 85 km fallback radius is a parameter of `suggestAuthority(lat, lng, maxKm = 85)`.

### Demo route

Edit `src/data/demoRoute.ts`:

- `ROUTE` — the polyline around Sandton
- `NUMERIC_ZONES` — distance in metres and peak acceleration of each simulated pothole
- `ZONE_HALF_WIDTH_M` — how wide each impact zone feels
- `demoDeviationAt()` — road noise shape

### Map tiles

Edit `TILE_URL` and `TILE_ATTRIBUTION` in `src/components/MapView.tsx`. If you change providers, update the Workbox `urlPattern` in `vite.config.ts` so tiles are still cached, and check the provider's attribution and usage terms.

### PWA metadata and icons

Edit the `manifest` block in `vite.config.ts`. Regenerate icons with `npm run icons` after changing the source artwork or palette in `scripts/generate-icons.mjs`.

---

## Browser support and limitations

### Supported

- Chrome / Edge / Samsung Internet on Android
- Safari on iOS 13+ (motion permission prompt on iOS 13+)
- Desktop Chromium and Firefox for demo mode, maps, log and exports

### Known limitations

- **Sensors need HTTPS.** Geolocation and `DeviceMotionEvent` require a secure context outside `localhost`.
- **The screen must stay awake.** Mobile browsers pause GPS and motion events in the background. The optional Screen Wake Lock helps, but does not guarantee background operation.
- **Accuracy varies.** Urban canyons, tunnels and poor GPS reception reduce location and speed accuracy.
- **Motion data varies by phone mount.** A loose mount, phone case or suspension difference changes readings. Tune sensitivity and vehicle profile for your setup.
- **iOS motion permission** must be requested during a user gesture.
- **No background tracking** — closing the tab or locking the phone may end the session.
- **Not all municipalities are listed.** The app covers 14 major city authorities plus SANRAL and links to the national directory for the rest.
- **Contact details can change.** Always confirm on the official website before relying on a number or email.
- **No server sync.** Data is per device and can be lost by clearing site data.
- **Detection is not evidence-grade.** It cannot measure pothole depth, area or exact lane position.

---

## Testing

No automated test suite is committed to this repository. The build is validated with TypeScript, and the app has been exercised with Playwright and axe-core against the development and production builds.

Checks performed during development:

- Production build and PWA asset generation
- Mobile layouts at 320, 360, 375, 390, 412, 768 and 1280 px with no horizontal overflow
- Demo drive reaching first detection, with correct severity and toast
- Live detection with mocked geolocation and synthetic `DeviceMotionEvent`
- Reverse geocoding resolving a Sandton street name
- Manual marking, detail editing, status changes and deletion
- Report modal, authority selection, copy, email/WhatsApp links, mark-as-reported
- CSV and GeoJSON downloads, including formula-injection sanitisation
- Demo-data clearing and confirmed clear-all
- Service worker activation, manifest metadata, map-tile caching and offline reload
- axe-core WCAG 2.0/2.1 A/AA + best-practice scans on every tab and modal with zero violations

### Suggested real-device checklist

1. Install over HTTPS and open in standalone mode.
2. Drive above the minimum speed and confirm a detection toast, sound and vibration.
3. Compare the logged pin with the actual pothole on the map.
4. Tap an entry, record the road name, and generate a report.
5. Turn on airplane mode and confirm the app still opens and the log is intact.
6. Check that a report can still be copied and a phone number can still be dialled offline.
7. Clear demo data and confirm real entries remain.

Run `npm run typecheck` before committing changes.

---

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| “Motion access blocked” | Permission was denied. Allow motion access in browser settings, reload, and start the drive again. On iOS, tap Start drive. |
| Sensor status stays “No signal” | The device has no motion sensor, the page is not in a secure context, or the browser suppresses events. Use manual marking. |
| GPS idle / no position | Location permission is off, location services are disabled, or you are indoors. Move outside and retry. |
| Speed remains 0 | The browser does not expose `coords.speed`; the app falls back to distance/time once it has two good fixes. |
| Map tiles are blank offline | Only tiles viewed while online are cached, subject to the 3 000-tile limit. Browse the area before going offline. |
| Install button does not appear | The browser does not support the install prompt (e.g. iOS Safari) or the app is already installed. Use **Add to Home Screen**. |
| App shows old code after deploy | The service worker updates on reload. Close all tabs and reopen, or unregister the old service worker in DevTools. |
| “Could not copy” | Clipboard access needs HTTPS and user permission. Select the preview text and copy manually. |
| Emails do not open | No mail client is configured on the device. Copy the report instead. |
| Local data disappeared | Site data was cleared, private browsing was used, or the browser evicted storage. Export regularly. |

---

## Roadmap

Ideas that would extend the app without changing its privacy-first design:

- Optional backend or peer sync for shared pothole maps
- Background geolocation on supported platforms
- Photo attachment and richer evidence
- Duplicate clustering across devices
- Municipality-specific report templates and web-form deep links
- Afrikaans, isiZulu and other SA language localisation
- Route-level heatmaps and severity trends
- Import of GeoJSON/CSV for verification or repair tracking
- Automated end-to-end tests in CI

---

## Contributing

1. Fork the repository and create a feature branch.
2. Run `npm install` and `npm run dev`.
3. Keep TypeScript strict and run `npm run typecheck` and `npm run build`.
4. Test mobile layouts and keyboard accessibility for UI changes.
5. Do not add analytics, trackers or automatic report submission.
6. Open a pull request describing the change and how you tested it.

When updating authority contacts, include the official source URL in the pull request so the change can be verified.

---

## Licence

No licence has been specified for this project yet. Add a `LICENSE` file before distributing or accepting contributions. Note that map tiles, map data and geocoding are subject to their providers' terms:

- OpenStreetMap data: ODbL
- CARTO basemaps: CARTO attribution requirements
- Nominatim: OpenStreetMap Foundation usage policy

---

## Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) contributors for map data
- [CARTO](https://carto.com/) for the dark basemap tiles
- [Leaflet](https://leafletjs.com/) for the mapping library
- [Vite](https://vite.dev/), [React](https://react.dev/) and [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- South African municipalities, JRA and SANRAL for publishing public reporting channels

Built for South African roads. Drive safely, mount your phone, and never operate it while driving.
