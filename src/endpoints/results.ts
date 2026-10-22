import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterQualityRecord, RecordsResponse } from '../models.js'
import { ANALYTE_GROUPS, type AnalyteGroup } from '../config.js'
import { MurielValidationError } from '../errors.js'
import { PAGE_SIZE, extractRecords, fetchPages } from '../paging.js'

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
  return fetchPages(client, endpoint, params, limit, offset)
}
