import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterSystem, SystemsResponse } from '../models.js'

export interface GetSystemsOptions extends ClientOptions {
  state: string
  systemType?: 'CWS' | 'NTNCWS' | 'TNCWS'
  status?: 'A' | 'I'
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
  const { state, systemType, status, limit = 100, apiKey, baseUrl, timeoutMs } = options

  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })

  const params: QueryParams = {
    limit,
    ...(systemType && { system_princ: systemType }),
    ...(status && { system_statu: status }),
  }

  const data = await client.get(`/api/v1/systems/${state.toUpperCase()}`, params)
  return extractSystems(data)
}
