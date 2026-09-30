import { MurielClient } from './client.js'
import { MurielAPIError, MurielValidationError } from './errors.js'
import type { AgentQueryResponse } from './models.js'

export interface AgentOptions {
  /** Muriel API key. Defaults to MURIEL_API_KEY env var. */
  apiKey?: string
  /** API base URL. Defaults to https://api.murielai.io */
  baseUrl?: string
  /** Request timeout in milliseconds. Default: 30000 */
  timeoutMs?: number
  /** Max records to return. Default: 1000 */
  maxRecords?: number
}

/** Per-query options. */
export interface QueryOptions {
  /** Limit to one public water system, e.g. 'IL0316000'. */
  pwsid?: string
  /** Only results and events on or after this date: a Date or 'YYYY-MM-DD'. */
  since?: string | Date
  /**
   * Shape of the answer: a list of field names (returns an object with exactly
   * those keys) or a JSON Schema object (returns the object as sent).
   */
  schema?: string[] | Record<string, unknown>
  /** Max records to return. Defaults to the Agent's maxRecords. */
  maxRecords?: number
}

/** Options for the one-call `query()`: QueryOptions plus how to connect. */
export interface QueryCallOptions extends QueryOptions {
  /** Muriel API key. Defaults to the MURIEL_API_KEY env var. */
  apiKey?: string
  /** API base URL. Defaults to https://api.murielai.io */
  baseUrl?: string
}

interface AgentQueryPayload {
  prompt: string
  max_records?: number
  schema?: Record<string, unknown>
  pwsid?: string
  since?: string
}

// Nine characters: a state code (or two digits for EPA-region tribal
// systems), then seven characters, at least one a digit.
const PWSID_RE = /^(?:[A-Z]{2}|\d{2})(?=[A-Z0-9]*\d)[A-Z0-9]{7}$/

function isoDate(since: string | Date): string {
  if (since instanceof Date) {
    if (isNaN(since.getTime())) throw new MurielValidationError('since is an invalid Date.')
    return since.toISOString().slice(0, 10)
  }
  const text = String(since).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || isNaN(Date.parse(text))) {
    throw new MurielValidationError(`since must be a Date or 'YYYY-MM-DD', got '${since}'.`)
  }
  return text
}

function fieldsSchema(fields: string[]): Record<string, unknown> {
  const names = fields.map((f) => String(f).trim())
  if (names.length === 0 || names.some((n) => !n)) {
    throw new MurielValidationError('schema needs at least one non-empty field name.')
  }
  if (new Set(names).size !== names.length) {
    throw new MurielValidationError('schema lists the same field twice.')
  }
  return {
    type: 'object',
    properties: Object.fromEntries(names.map((n) => [n, {}])),
    required: names,
    additionalProperties: false,
  }
}

interface AgentQueryRawResponse {
  results: unknown[]
  count: number
  summary: string
  execution_log: string[]
  warning?: string
}

export class Agent {
  private readonly client: MurielClient
  private readonly maxRecords: number

  constructor(options: AgentOptions = {}) {
    this.client = new MurielClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
    })
    this.maxRecords = options.maxRecords ?? 1000
  }

  /**
   * Run a natural-language query against the Muriel water quality database.
   * The server handles all LLM interactions — only your MURIEL_API_KEY is needed.
   *
   * Without a schema, resolves to an AgentQueryResponse (results, summary,
   * execution log). With a schema, resolves to the shaped answer object.
   *
   * @example
   * const agent = new Agent()
   * const response = await agent.query('Lead levels above 15 ppb in Chicago')
   * console.log(response.summary)
   *
   * const event = await agent.query('Get the latest events for Chicago Water', {
   *   since: '2026-09-29',
   *   schema: ['event_type', 'num_events', 'pwsid', 'insight'],
   * })
   */
  async query(prompt: string): Promise<AgentQueryResponse>
  async query(prompt: string, options: QueryOptions & { schema: string[] | Record<string, unknown> }): Promise<Record<string, unknown>>
  async query(prompt: string, options?: QueryOptions): Promise<AgentQueryResponse | Record<string, unknown>>
  async query(prompt: string, options: QueryOptions = {}): Promise<AgentQueryResponse | Record<string, unknown>> {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new MurielValidationError('prompt must be a non-empty string.')
    }
    const payload: AgentQueryPayload = {
      prompt,
      max_records: options.maxRecords ?? this.maxRecords,
    }
    if (options.pwsid !== undefined) {
      const pwsid = String(options.pwsid).trim().toUpperCase()
      if (!PWSID_RE.test(pwsid)) {
        throw new MurielValidationError(`pwsid should look like 'IL0316000', got '${options.pwsid}'.`)
      }
      payload.pwsid = pwsid
    }
    if (options.since !== undefined) payload.since = isoDate(options.since)

    let fields: string[] | undefined
    if (options.schema !== undefined) {
      if (Array.isArray(options.schema)) {
        payload.schema = fieldsSchema(options.schema)
        fields = payload.schema.required as string[]
      } else if (options.schema && typeof options.schema === 'object') {
        payload.schema = options.schema
      } else {
        throw new MurielValidationError('schema must be a list of field names or a JSON Schema object.')
      }
    }

    const data = await this.client.post<AgentQueryRawResponse>(
      '/api/v1/agent/query',
      payload,
    )

    if (payload.schema) {
      // The API has already shaped the results; take the first shaped object.
      const first = (Array.isArray(data.results) ? data.results[0] : data.results) ?? {}
      const obj = first as Record<string, unknown>
      if (!fields) return { ...obj }
      const missing = fields.filter((f) => !(f in obj))
      if (missing.length) {
        throw new MurielAPIError(`The answer is missing requested field(s): ${missing.join(', ')}.`)
      }
      return Object.fromEntries(fields.map((f) => [f, obj[f]]))
    }

    return {
      results: data.results as AgentQueryResponse['results'],
      count: data.count,
      summary: data.summary,
      executionLog: data.execution_log ?? [],
      warning: data.warning,
    }
  }
}

// One Agent per API key + base URL, so repeated calls reuse it.
const agents = new Map<string, Agent>()

/**
 * One call, no setup: `query()` builds (and reuses) an Agent for you.
 *
 * @example
 * import { query } from 'muriel'
 *
 * const event = await query('Get the latest events for Chicago Water', {
 *   apiKey: 'YOUR_MURIEL_API_KEY',
 *   since: '2026-09-29',
 *   schema: ['event_type', 'num_events', 'pwsid', 'insight'],
 * })
 */
export function query(prompt: string): Promise<AgentQueryResponse>
export function query(prompt: string, options: QueryCallOptions & { schema: string[] | Record<string, unknown> }): Promise<Record<string, unknown>>
export function query(prompt: string, options?: QueryCallOptions): Promise<AgentQueryResponse | Record<string, unknown>>
export function query(prompt: string, options: QueryCallOptions = {}): Promise<AgentQueryResponse | Record<string, unknown>> {
  const { apiKey, baseUrl, ...rest } = options
  const key = `${apiKey ?? ''}\u0000${baseUrl ?? ''}`
  let agent = agents.get(key)
  if (!agent) {
    agent = new Agent({ apiKey, baseUrl })
    agents.set(key, agent)
  }
  return agent.query(prompt, rest)
}
