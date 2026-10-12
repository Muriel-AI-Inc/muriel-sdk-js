import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterSystem, SystemsResponse } from '../models.js'

export interface GetSystemsOptions extends ClientOptions {
  /** Two-letter state code. */
  state: string
  /** How many systems to return (default 1,000, max 20,000). */
  limit?: number
}

function extractSystems(data: unknown): WaterSystem[] {
  if (Array.isArray(data)) return data as WaterSystem[]
  if (typeof data === 'object' && data !== null) {
    const d = data as SystemsResponse
    return (d.records ?? d.systems ?? []) as WaterSystem[]
  }
  return []
}

export async function getSystems(options: GetSystemsOptions): Promise<WaterSystem[]> {
  const { state, limit = 1000, apiKey, baseUrl, timeoutMs } = options

  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })

  const params: QueryParams = { limit }

  const data = await client.get(`/api/v1/systems/${encodeURIComponent(state.trim().toUpperCase())}`, params)
  return extractSystems(data)
}
