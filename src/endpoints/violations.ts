import { MurielValidationError } from '../errors.js'
import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { Violation, ViolationsResponse } from '../models.js'

export interface GetViolationsOptions extends ClientOptions {
  pwsid?: string
  state?: string
  violationStatus?: 'Open' | 'Resolved'
  dateStart?: string
  dateEnd?: string
  limit?: number
}

function extractViolations(data: unknown): Violation[] {
  if (Array.isArray(data)) return data as Violation[]
  if (typeof data === 'object' && data !== null) {
    const d = data as ViolationsResponse
    return (d.records ?? d.violations ?? []) as Violation[]
  }
  return []
}

export async function getViolations(options: GetViolationsOptions): Promise<Violation[]> {
  const {
    pwsid, state, violationStatus, dateStart, dateEnd,
    limit = 100, apiKey, baseUrl, timeoutMs,
  } = options

  if (!pwsid && !state) throw new MurielValidationError('Give either pwsid or state.')

  const client = new MurielClient({ apiKey, baseUrl, timeoutMs })

  const params: QueryParams = {
    limit,
    ...(violationStatus && { violation_status: violationStatus }),
    ...(dateStart && { date_start: dateStart }),
    ...(dateEnd && { date_end: dateEnd }),
  }

  const endpoint = pwsid
    ? `/api/v1/violations/system/${encodeURIComponent(pwsid)}`
    : `/api/v1/violations/state/${state!.toUpperCase()}`

  const data = await client.get(endpoint, params)
  return extractViolations(data)
}
