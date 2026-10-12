import { MurielValidationError } from '../errors.js'
import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { SamplingRequirement, RequirementsResponse } from '../models.js'

export interface GetRequirementsOptions extends ClientOptions {
  pwsid?: string
  state?: string
  limit?: number
}

function extractRequirements(data: unknown): SamplingRequirement[] {
  if (Array.isArray(data)) return data as SamplingRequirement[]
  if (typeof data === 'object' && data !== null) {
    const d = data as RequirementsResponse
    return (d.records ?? d.requirements ?? []) as SamplingRequirement[]
  }
  return []
}

export async function getRequirements(options: GetRequirementsOptions): Promise<SamplingRequirement[]> {
  const { pwsid, state, limit = 100, apiKey, baseUrl, timeoutMs } = options

  if (!pwsid && !state) throw new MurielValidationError('Give either pwsid or state.')

  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })

  const params: QueryParams = { limit }

  const endpoint = pwsid
    ? `/api/v1/requirements/system/${encodeURIComponent(pwsid)}`
    : `/api/v1/requirements/state/${state!.toUpperCase()}`

  const data = await client.get(endpoint, params)
  return extractRequirements(data)
}
