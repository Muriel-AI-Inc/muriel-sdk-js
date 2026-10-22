// Fetching more than one page: shared by getResults and the contaminant feeds.
//
// The API returns at most PAGE_SIZE records per request. The nationwide feeds
// (/records/lead and the rest) and /records/group answer with
// pagination.next_cursor, passed back as `cursor` for the next page, with no
// depth limit. System, state and address routes page by `offset`; a state or
// area stops at the API's offset limit, and this says so. A rate-limited page
// (60 requests a minute per key) is retried after a pause instead of losing
// the pages already fetched.
import type { MurielClient, QueryParams } from './client.js'
import type { WaterQualityRecord } from './models.js'
import { MurielRateLimitError } from './errors.js'

export const PAGE_SIZE = 1000
/** Tunable for tests: how long to wait after a 429, and how many tries. */
export const rateLimit = { waitMs: 20_000, tries: 6 }

interface Pagination {
  has_more?: boolean
  next_cursor?: string | null
  offset_limit_reached?: boolean
  max_offset?: number
}

export function extractRecords(data: unknown): WaterQualityRecord[] {
  if (Array.isArray(data)) return data as WaterQualityRecord[]
  if (data && typeof data === 'object') {
    const d = data as { records?: unknown, results?: unknown }
    if (Array.isArray(d.records)) return d.records as WaterQualityRecord[]
    if (Array.isArray(d.results)) return d.results as WaterQualityRecord[]
  }
  return []
}

async function getWithRetry(client: MurielClient, endpoint: string, params: QueryParams): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.get(endpoint, params)
    } catch (err) {
      if (!(err instanceof MurielRateLimitError) || attempt >= rateLimit.tries) throw err
      const wait = err.retryAfter === undefined ? rateLimit.waitMs
        : Math.min(err.retryAfter * 1000, rateLimit.waitMs * 3)
      await new Promise(r => setTimeout(r, wait))
    }
  }
}

/** Up to `limit` records (null: all), PAGE_SIZE at a time. */
export async function fetchPages(
  client: MurielClient, endpoint: string, params: QueryParams,
  limit: number | null, offset = 0,
): Promise<WaterQualityRecord[]> {
  const out: WaterQualityRecord[] = []
  let at = offset
  let cursor: string | null | undefined
  while (limit === null || out.length < limit) {
    const size = limit === null ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - out.length)
    const q: QueryParams = { ...params, limit: size, ...(cursor ? { cursor } : { offset: at }) }
    const data = await getWithRetry(client, endpoint, q)
    const page = extractRecords(data)
    out.push(...page)
    at += page.length
    const pag: Pagination = (data && typeof data === 'object' && !Array.isArray(data)
      ? (data as { pagination?: Pagination | null }).pagination : undefined) ?? {}
    if (pag.offset_limit_reached) {
      console.warn(`Stopped at ${out.length.toLocaleString('en-US')} records: the API pages state, ` +
        `analyte-group and address queries up to an offset of ${(pag.max_offset ?? 10_000).toLocaleString('en-US')}. ` +
        'Narrow the query (startDate/endDate, analyte) or ask for one system with pwsid, ' +
        'which pages through its whole record.')
      break
    }
    if (!page.length || !pag.has_more) break
    cursor = pag.next_cursor
  }
  return limit === null ? out : out.slice(0, limit)
}
