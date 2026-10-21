import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterQualityRecord, RecordsResponse } from '../models.js'
import { ANALYTE_GROUPS, type AnalyteGroup } from '../config.js'
import { MurielValidationError } from '../errors.js'

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
  /**
   * Number of records (default 100). `null` returns every matching record, and a
   * limit over 1,000 is fetched in pages of 1,000: the SDK pages for you. One
   * system (pwsid) pages through its whole record; a state, group or address
   * query stops at the API's 10,000-record offset limit with a console warning.
   * Billed like any pull: 1 credit per 1,000 records.
   */
  limit?: number | null
  /** Pagination offset */
  offset?: number
  /** 'all' includes the historical archive; 'recent' is the current window. Default depends on the route. */
  era?: 'all' | 'recent'
}

// The API returns at most this many records per request; larger requests page.
const PAGE_SIZE = 1000

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
    geocodedOnly, presenceIndicator, limit = 100, offset = 0, era,
    apiKey, baseUrl, timeoutMs,
  } = options

  if (analyteGroup && !(ANALYTE_GROUPS as readonly string[]).includes(analyteGroup)) {
    throw new MurielValidationError(`analyteGroup must be one of: ${ANALYTE_GROUPS.join(', ')}.`)
  }
  if (era !== undefined && era !== 'all' && era !== 'recent') {
    throw new MurielValidationError("era must be 'all' or 'recent'.")
  }
  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })

  const params: QueryParams = {
    ...(analyte && { result_analyte_name: analyte }),
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
    ...(detectionsOnly && { detections_only: true }),
    ...(minConcentration !== undefined && { min_concentration: minConcentration }),
    ...(geocodedOnly && { geocoded_only: true }),
    ...(presenceIndicator && { presence_indicator: presenceIndicator }),
    ...(era && { era }),
  }

  let endpoint: string

  if (address) {
    endpoint = '/api/v1/records/address'
    params['address'] = address
    params['radius_miles'] = radiusMiles
  } else if (analyteGroup && !pwsid && !state) {
    endpoint = `/api/v1/records/group/${analyteGroup}`
  } else if (state && !pwsid) {
    endpoint = `/api/v1/records/state/${encodeURIComponent(state.trim().toUpperCase())}`
    if (analyteGroup) params['analyte_group'] = analyteGroup
  } else if (pwsid) {
    endpoint = `/api/v1/records/system/${encodeURIComponent(pwsid.trim().toUpperCase())}`
    if (analyteGroup) params['analyte_group'] = analyteGroup
  } else if (analyteGroup) {
    endpoint = `/api/v1/records/group/${analyteGroup}`
  } else {
    throw new MurielValidationError('Give at least one of: pwsid, address, state, or analyteGroup.')
  }

  if (limit !== null && !(limit >= 1)) {
    throw new MurielValidationError('limit must be at least 1, or null for every record.')
  }
  if (limit !== null && limit <= PAGE_SIZE) {
    const data = await client.get(endpoint, { ...params, limit, ...(offset && { offset }) })
    return extractRecords(data)
  }

  // limit null (everything) or over one page: fetch PAGE_SIZE at a time.
  const out: WaterQualityRecord[] = []
  let at = offset
  while (limit === null || out.length < limit) {
    const size = limit === null ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - out.length)
    const data = await client.get(endpoint, { ...params, limit: size, offset: at })
    const page = extractRecords(data)
    out.push(...page)
    at += page.length
    const pag = (data && typeof data === 'object' && !Array.isArray(data)
      ? (data as { pagination?: { has_more?: boolean, offset_limit_reached?: boolean, max_offset?: number } }).pagination
      : undefined) ?? {}
    if (pag.offset_limit_reached) {
      console.warn(`Stopped at ${out.length.toLocaleString('en-US')} records: the API pages state, ` +
        `analyte-group and address queries up to an offset of ${(pag.max_offset ?? 10_000).toLocaleString('en-US')}. ` +
        'Narrow the query (startDate/endDate, analyte) or ask for one system with pwsid, ' +
        'which pages through its whole record.')
      break
    }
    if (!page.length || !(pag.has_more ?? page.length >= size)) break
  }
  return out
}
