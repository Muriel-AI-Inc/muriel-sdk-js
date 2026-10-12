import {
  DEFAULT_TIMEOUT_MS,
  checkedBaseUrl, getApiKey, getBaseUrl } from './config.js'
import { VERSION } from './version.js'
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
    this.baseUrl = checkedBaseUrl(options.baseUrl ?? getBaseUrl())
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
          'User-Agent': `muriel-js/${VERSION}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        // Never follow a redirect: fetch drops Authorization on a cross-origin
        // redirect but forwards a custom X-API-Key header, so following one
        // would hand the key to whatever host it names.
        redirect: 'manual',
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MurielAPIError(`Request timed out after ${this.timeoutMs}ms`)
      }
      throw new MurielAPIError(`Network error: ${String(err)}`)
    } finally {
      clearTimeout(timer)
    }

    if ((res.status >= 300 && res.status < 400) || res.type === 'opaqueredirect') {
      throw new MurielAPIError(
        `Unexpected redirect (${res.status || 'opaque'}) to ${res.headers.get('location') ?? '?'}; ` +
        'not followed, so your API key was not sent there. Check MURIEL_BASE_URL.',
        res.status || undefined)
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
      : Array.isArray(raw)   // a 422: FastAPI's list of field errors
        ? raw.map((e) => (e && typeof e === 'object' && 'msg' in e) ? String((e as Record<string, unknown>).msg) : String(e)).join('; ')
        : raw && typeof raw === 'object' && 'message' in raw
          ? String((raw as Record<string, unknown>).message)
          : ''
    const msg = detail || `HTTP ${res.status}`

    switch (res.status) {
      case 401: throw new MurielAuthenticationError(msg, res.status, data)
      case 400: case 422: throw new MurielValidationError(msg, res.status, data)
      case 402: throw new MurielCreditsError(detail || undefined, res.status, data)
      case 404: throw new MurielNotFoundError(msg, res.status, data)
      case 429: throw new MurielRateLimitError(msg, res.status, data)
    }
    if (res.status >= 500) throw new MurielServerError(msg, res.status, data)
    throw new MurielAPIError(msg, res.status, data)
  }

  get<T = unknown>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>('GET', endpoint, params)
  }

  post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, undefined, body)
  }
}
