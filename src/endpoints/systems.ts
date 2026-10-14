import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterSystem, SystemsResponse } from '../models.js'

export interface GetSystemsOptions extends ClientOptions {
  /** Two-letter state code. */
  state: string
  /**
   * How many systems to return (default 1,000, max 20,000 per call). Pass
   * `null` for every system in the state; the SDK pages through them.
   */
  limit?: number | null
  /** How many systems to skip, for paging by hand. */
  offset?: number
}

/** The most the server returns in one call; `limit: null` pages at this size. */
export const MAX_SYSTEMS_PAGE = 20000

function extractSystems(data: unknown): WaterSystem[] {
  if (Array.isArray(data)) return data as WaterSystem[]
  if (typeof data === 'object' && data !== null) {
    const d = data as SystemsResponse
    return (d.records ?? d.systems ?? []) as WaterSystem[]
  }
  return []
}

export async function getSystems(options: GetSystemsOptions): Promise<WaterSystem[]> {
  const { state, limit = 1000, offset = 0, apiKey, baseUrl, timeoutMs } = options
  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })
  const path = `/api/v1/systems/${encodeURIComponent(state.trim().toUpperCase())}`

  if (limit !== null) {
    const params: QueryParams = { limit, offset }
    return extractSystems(await client.get(path, params))
  }

  // Every system: page until the server says there are no more.
  const all: WaterSystem[] = []
  let at = offset
  for (;;) {
    const data = await client.get(path, { limit: MAX_SYSTEMS_PAGE, offset: at })
    const page = extractSystems(data)
    all.push(...page)
    at += page.length
    const more = (data as SystemsResponse | null)?.has_more
    if (page.length === 0 || !(more ?? page.length >= MAX_SYSTEMS_PAGE)) break
  }
  return all
}
