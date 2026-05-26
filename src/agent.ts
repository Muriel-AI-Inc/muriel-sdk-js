import { MurielClient } from './client.js'
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

interface AgentQueryPayload {
  prompt: string
  max_records?: number
  schema?: Record<string, unknown>
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
   * @param prompt  Natural-language query, e.g. "PFAS detections in Illinois since 2020"
   * @returns AgentQueryResponse with results, summary, and execution log
   *
   * @example
   * const agent = new Agent()
   * const response = await agent.query('Lead levels above 15 ppb in Chicago')
   * console.log(response.summary)
   * console.log(response.results)
   */
  async query(prompt: string): Promise<AgentQueryResponse> {
    const payload: AgentQueryPayload = {
      prompt,
      max_records: this.maxRecords,
    }

    const data = await this.client.post<AgentQueryRawResponse>(
      '/api/v1/agent/query',
      payload,
    )

    return {
      results: data.results as AgentQueryResponse['results'],
      count: data.count,
      summary: data.summary,
      executionLog: data.execution_log ?? [],
      warning: data.warning,
    }
  }
}
