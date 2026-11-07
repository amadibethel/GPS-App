import type { Authority } from '../types'
import { haversineMeters } from '../lib/geo'

/**
 * South African pothole reporting channels.
 *
 * These are main switchboard numbers and official websites, checked manually.
 * Municipal contact details change often — the app always links to the official
 * website and asks users to confirm before logging a report.
 */
export const AUTHORITIES: Authority[] = [
  {
    id: 'joburg',
    name: 'City of Johannesburg',
    shortName: 'Johannesburg',
    province: 'Gauteng',
    type: 'metro',
    center: { lat: -26.2041, lng: 28.0473 },
    phones: ['0860 562 874'],
    email: 'hotline@jra.org.za',
    website: 'https://www.jra.org.za',
    note: 'Johannesburg Roads Agency (JRA) — report potholes and stormwater defects.'
  },
  {
    id: 'tshwane',
    name: 'City of Tshwane',
    shortName: 'Tshwane / Pretoria',
    province: 'Gauteng',
    type: 'metro',
    center: { lat: -25.7479, lng: 28.2293 },
    phones: ['012 358 9999', '080 111 1556'],
    email: 'potholes@tshwane.gov.za',
    website: 'https://www.tshwane.gov.za',
    note: 'Tshwane customer care — email the dedicated pothole address or call the call centre.'
  },
  {
    id: 'ekurhuleni',
    name: 'City of Ekurhuleni',
    shortName: 'Ekurhuleni',
    province: 'Gauteng',
    type: 'metro',
    center: { lat: -26.151, lng: 28.3125 },
    phones: ['0860 543 000'],
    email: 'call.centre@ekurhuleni.gov.za',
    website: 'https://www.ekurhuleni.gov.za',
    note: 'Ekurhuleni service call centre — log roads and pothole faults.'
  },
  {
    id: 'capetown',
    name: 'City of Cape Town',
    shortName: 'Cape Town',
    province: 'Western Cape',
    type: 'metro',
    center: { lat: -33.9249, lng: 18.4241 },
    phones: ['0860 103 089'],
    email: 'contact.us@capetown.gov.za',
    website: 'https://www.capetown.gov.za',
    note: 'C3 service request — log a pothole or road defect with the City.'
  },
  {
    id: 'ethekwini',
    name: 'eThekwini Municipality',
    shortName: 'eThekwini / Durban',
    province: 'KwaZulu-Natal',
    type: 'metro',
    center: { lat: -29.8587, lng: 31.0218 },
    phones: ['031 311 1111'],
    email: 'sizakala@durban.gov.za',
    website: 'https://www.durban.gov.za',
    note: 'Sizakala customer services — report roads and stormwater faults.'
  },
  {
    id: 'nelsonmandelabay',
    name: 'Nelson Mandela Bay Municipality',
    shortName: 'Nelson Mandela Bay',
    province: 'Eastern Cape',
    type: 'metro',
    center: { lat: -33.9608, lng: 25.6022 },
    phones: ['041 506 1911', '0800 20 5050'],
    email: 'customercare@mandelametro.gov.za',
    website: 'https://www.nelsonmandelabay.gov.za',
    note: 'Gqeberha (Port Elizabeth) customer care — ask for roads and stormwater.'
  },
  {
    id: 'buffalocity',
    name: 'Buffalo City Municipality',
    shortName: 'Buffalo City',
    province: 'Eastern Cape',
    type: 'metro',
    center: { lat: -32.9833, lng: 27.8667 },
    phones: ['043 705 2000', '043 705 9220'],
    email: 'customercare@buffalocity.gov.za',
    website: 'https://www.buffalocity.gov.za',
    note: 'East London / Bhisho / King William’s Town — 043 705 9220 is the roads department.'
  },
  {
    id: 'mangaung',
    name: 'Mangaung Metropolitan Municipality',
    shortName: 'Mangaung / Bloemfontein',
    province: 'Free State',
    type: 'metro',
    center: { lat: -29.12, lng: 26.2167 },
    phones: ['051 405 8911'],
    email: 'enquiry@mangaung.co.za',
    website: 'https://www.mangaung.co.za',
    note: 'Bloemfontein / Botshabelo / Thaba Nchu. WhatsApp text only: 065 586 6261.'
  },
  {
    id: 'msunduzi',
    name: 'Msunduzi Municipality',
    shortName: 'Msunduzi / PMB',
    province: 'KwaZulu-Natal',
    type: 'metro',
    center: { lat: -29.6168, lng: 30.3925 },
    phones: ['033 392 2000', '080 000 1868'],
    website: 'https://www.msunduzi.gov.za',
    note: 'Pietermaritzburg call centre — 080 000 1868 is the toll-free line.'
  },
  {
    id: 'polokwane',
    name: 'Polokwane Municipality',
    shortName: 'Polokwane',
    province: 'Limpopo',
    type: 'metro',
    center: { lat: -23.9045, lng: 29.4689 },
    phones: ['015 290 2000'],
    website: 'https://www.polokwane.gov.za',
    note: 'Polokwane control centre — ask for roads and stormwater, or use the MyPolokwane app.'
  },
  {
    id: 'mbombela',
    name: 'Mbombela Municipality',
    shortName: 'Mbombela / Nelspruit',
    province: 'Mpumalanga',
    type: 'metro',
    center: { lat: -25.4658, lng: 30.9853 },
    phones: ['013 759 2000', '0861 626 6235'],
    email: 'customercare@mbombela.gov.za',
    website: 'https://www.mbombela.gov.za',
    note: 'Mbombela customer care — ask for roads and stormwater.'
  },
  {
    id: 'solplaatje',
    name: 'Sol Plaatje Municipality',
    shortName: 'Sol Plaatje / Kimberley',
    province: 'Northern Cape',
    type: 'metro',
    center: { lat: -28.7282, lng: 24.7499 },
    phones: ['053 830 6111', '080 122 9010'],
    website: 'https://www.solplaatje.org.za',
    note: 'Kimberley infrastructure call centre — 080 122 9010 is toll-free.'
  },
  {
    id: 'rustenburg',
    name: 'Rustenburg Local Municipality',
    shortName: 'Rustenburg',
    province: 'North West',
    type: 'metro',
    center: { lat: -25.667, lng: 27.2424 },
    phones: ['014 590 3111'],
    website: 'https://www.rustenburg.gov.za',
    note: 'Rustenburg customer care — ask for roads and stormwater.'
  },
  {
    id: 'george',
    name: 'George Municipality',
    shortName: 'George',
    province: 'Western Cape',
    type: 'metro',
    center: { lat: -33.9641, lng: 22.45 },
    phones: ['044 801 9111'],
    email: 'gmun@george.gov.za',
    website: 'https://www.george.gov.za',
    note: 'Garden Route roads and stormwater — report potholes to the municipality.'
  },
  {
    id: 'sanral',
    name: 'SANRAL (national roads)',
    shortName: 'SANRAL',
    province: 'National',
    type: 'national',
    center: { lat: -25.7479, lng: 28.2293 },
    phones: ['0800 726 725', '069 019 1088'],
    email: 'info@sanral.co.za',
    website: 'https://www.sanral.co.za',
    note: 'For national roads (N1, N2, N3, N4, etc.). 069 019 1088 is the SANRAL pothole app call/WhatsApp line. Municipal roads fall under your local municipality.'
  }
]

const METROS = AUTHORITIES.filter((a) => a.type === 'metro')
const SANRAL = AUTHORITIES.find((a) => a.id === 'sanral')!

/** Official government directory for municipalities outside the metro areas. */
export const MUNICIPALITY_DIRECTORY_URL =
  'https://www.gov.za/about-government/contact-directory/provincial-local-government'

export interface AuthoritySuggestion {
  authority: Authority
  distanceKm: number
  fallback: boolean
}

export function suggestAuthority(lat: number, lng: number, maxKm = 85): AuthoritySuggestion {
  let nearest = METROS[0]
  let best = Number.POSITIVE_INFINITY
  for (const authority of METROS) {
    const distanceKm = haversineMeters({ lat, lng }, authority.center) / 1000
    if (distanceKm < best) {
      best = distanceKm
      nearest = authority
    }
  }

  if (best <= maxKm) {
    return { authority: nearest, distanceKm: best, fallback: false }
  }

  return { authority: SANRAL, distanceKm: best, fallback: true }
}

export function findAuthority(id: string | undefined): Authority | undefined {
  if (!id) return undefined
  return AUTHORITIES.find((a) => a.id === id)
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
