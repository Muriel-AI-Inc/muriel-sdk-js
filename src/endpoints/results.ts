import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterQualityRecord, RecordsResponse } from '../models.js'
import type { AnalyteGroup } from '../config.js'

export interface GetResultsOptions extends ClientOptions {
  /** Public Water System ID */
  pwsid?: string
  /** Street address for radius search */
  address?: string
  /** Radius in miles for address search (default 10) */
  radiusMiles?: number
  /** Two-letter state code */
  state?: string
  /** Specific analyte name (e.g. 'Lead', 'PFOA') */
  analyte?: string
  /** Analyte category group */
  analyteGroup?: AnalyteGroup
  /** Filter from date (YYYY-MM-DD) */
  startDate?: string
  /** Filter to date (YYYY-MM-DD) */
  endDate?: string
  /** Only return detected results */
  detectionsOnly?: boolean
  /** Minimum concentration value */
  minConcentration?: number
  /** Only records with lat/lng */
  geocodedOnly?: boolean
  /** Microbial: 'P' = present, 'A' = absent */
  presenceIndicator?: 'P' | 'A'
  /** Number of records (default 100, max 100 per page) */
  limit?: number
  /** Pagination offset */
  offset?: number
}

function extractRecords(data: unknown): WaterQualityRecord[] {
  if (Array.isArray(data)) return data as WaterQualityRecord[]
  if (typeof data === 'object' && data !== null) {
    const d = data as RecordsResponse
    return (d.records ?? d.results ?? []) as WaterQualityRecord[]
  }
  return []
}

export async function getResults(options: GetResultsOptions): Promise<WaterQualityRecord[]> {
  const {
    pwsid, address, radiusMiles = 10, state, analyte, analyteGroup,
    startDate, endDate, detectionsOnly, minConcentration,
    geocodedOnly, presenceIndicator, limit = 100, offset = 0,
    apiKey, baseUrl, timeoutMs,
  } = options

  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })

  const params: QueryParams = {
    limit,
    ...(offset && { offset }),
    ...(analyte && { result_analyte_name: analyte }),
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
    ...(detectionsOnly && { detections_only: true }),
    ...(minConcentration !== undefined && { min_concentration: minConcentration }),
    ...(geocodedOnly && { geocoded_only: true }),
    ...(presenceIndicator && { presence_indicator: presenceIndicator }),
  }

  let endpoint: string

  if (address) {
    endpoint = '/api/v1/records/address'
    params['address'] = address
    params['radius_miles'] = radiusMiles
  } else if (analyteGroup && !pwsid && !state) {
    endpoint = `/api/v1/records/group/${analyteGroup}`
  } else if (state && !pwsid) {
    endpoint = `/api/v1/records/state/${state.toUpperCase()}`
    if (analyteGroup) params['analyte_group'] = analyteGroup
  } else if (pwsid) {
    endpoint = `/api/v1/records/system/${pwsid}`
    if (analyteGroup) params['analyte_group'] = analyteGroup
  } else if (analyteGroup) {
    endpoint = `/api/v1/records/group/${analyteGroup}`
  } else {
    throw new Error('Must provide at least one of: pwsid, address, state, or analyteGroup')
  }

  const data = await client.get(endpoint, params)
  return extractRecords(data)
}
