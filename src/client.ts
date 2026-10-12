import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  getApiKey, getBaseUrl } from './config.js'
import {
  MurielAPIError,
  MurielAuthenticationError,
  MurielValidationError,
  MurielNotFoundError,
  MurielRateLimitError,
  MurielServerError, MurielCreditsError } from './errors.js'

export interface ClientOptions {
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

export class MurielClient {
  readonly apiKey: string
  readonly baseUrl: string
  readonly timeoutMs: number

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? getApiKey()
    if (!this.apiKey) {
      throw new MurielAuthenticationError(
        'API key required. Pass apiKey or set MURIEL_API_KEY env var.'
      )
    }
    this.baseUrl = (options.baseUrl ?? getBaseUrl()).replace(/\/$/, '')
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async request<T = unknown>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: QueryParams,
    body?: unknown,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          url.searchParams.set(key, String(val))
        }
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    let res: Response
    try {
      res = await fetch(url.toString(), {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'muriel-js/0.1.0',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MurielAPIError(`Request timed out after ${this.timeoutMs}ms`)
      }
      throw new MurielAPIError(`Network error: ${String(err)}`)
    } finally {
      clearTimeout(timer)
    }

    let data: unknown
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      data = await res.json()
    } else {
      data = await res.text()
    }

    if (res.ok) return data as T

    // FastAPI puts the reason in `detail`: a string, or for 402 an object
    // with a `message`.
    const raw = typeof data === 'object' && data !== null && 'detail' in data
      ? (data as Record<string, unknown>).detail : undefined
    const detail = typeof raw === 'string' ? raw
      : raw && typeof raw === 'object' && 'message' in raw
        ? String((raw as Record<string, unknown>).message)
        : `HTTP ${res.status}`

    switch (res.status) {
      case 401: throw new MurielAuthenticationError(detail, res.status, data)
      case 400: throw new MurielValidationError(detail, res.status, data)
      case 402: throw new MurielCreditsError(detail, res.status, data)
      case 404: throw new MurielNotFoundError(detail, res.status, data)
      case 429: throw new MurielRateLimitError(detail, res.status, data)
    }
    if (res.status >= 500) throw new MurielServerError(detail, res.status, data)
    throw new MurielAPIError(detail, res.status, data)
  }

  get<T = unknown>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>('GET', endpoint, params)
  }

  post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, undefined, body)
  }
}
