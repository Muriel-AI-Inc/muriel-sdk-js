import { MurielClient, type ClientOptions } from '../client.js'

export interface Geocoding {
  latitude: number | null
  longitude: number | null
  address?: string | null
  address_formatted?: string | null
  source?: string | null
  [key: string]: unknown
}

export interface Facility {
  pwsid: string
  system_name?: string
  facility_state_assigned_id: string
  geocoding: Geocoding | null
}

export interface SamplingPoint {
  pwsid: string
  system_name?: string
  sample_point: string
  facility_state_assigned_id?: string | null
  geocoding: Geocoding | null
}

export interface StateListOptions extends ClientOptions {
  /** Two-letter state code. */
  state: string
  /** How many to return (default 100, max 5,000). */
  limit?: number
}

/**
 * Facilities with a known location in a state. Few states publish facility
 * IDs with their results, so this is often empty; the response says so.
 */
export async function getStateFacilities(options: StateListOptions): Promise<{
  state: string; facility_count: number; facilities: Facility[]; note?: string
}> {
  const { state, limit = 100, apiKey, baseUrl, timeoutMs } = options
  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })
  return client.get(`/api/v1/geocoding/facilities/state/${encodeURIComponent(state.toUpperCase())}`, { limit })
}

/** Sampling points with a known location in a state. */
export async function getStateSamplingPoints(options: StateListOptions): Promise<{
  state: string; sampling_point_count: number; sampling_points: SamplingPoint[]
}> {
  const { state, limit = 100, apiKey, baseUrl, timeoutMs } = options
  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })
  return client.get(`/api/v1/geocoding/sampling_points/state/${encodeURIComponent(state.toUpperCase())}`, { limit })
}

export interface FacilityOptions extends ClientOptions {
  pwsid: string
  facilityId: string
}

/** Where one facility is, from its located samples. */
export async function getFacilityGeocoding(options: FacilityOptions): Promise<{
  pwsid: string; facility_state_assigned_id: string; geocoding: Geocoding | null; found: boolean
}> {
  const { pwsid, facilityId, apiKey, baseUrl, timeoutMs } = options
  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })
  return client.get(`/api/v1/geocoding/facility/${encodeURIComponent(pwsid.toUpperCase())}/${encodeURIComponent(facilityId)}`)
}

export interface SamplingPointOptions extends ClientOptions {
  pwsid: string
  samplePoint: string
  facilityId?: string
}

/** Where one sampling point is. */
export async function getSamplingPointGeocoding(options: SamplingPointOptions): Promise<{
  pwsid: string; sample_point: string; geocoding: Geocoding | null; found: boolean
}> {
  const { pwsid, samplePoint, facilityId, apiKey, baseUrl, timeoutMs } = options
  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })
  return client.get(
    `/api/v1/geocoding/sampling_point/${encodeURIComponent(pwsid.toUpperCase())}/${encodeURIComponent(samplePoint)}`,
    facilityId ? { facility_id: facilityId } : undefined)
}
