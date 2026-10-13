import { MurielAPIError } from './errors.js'

export const DEFAULT_BASE_URL = 'https://api.murielai.io'
export const DEFAULT_TIMEOUT_MS = 30_000
/** An agent question typically takes 10-60 seconds; the server answers within about 100. */
export const AGENT_TIMEOUT_MS = 120_000

export const ANALYTE_GROUPS = [
  'pfas', 'microbial', 'dbps', 'radiological', 'pesticides_herbicides',
  'vocs', 'metals_inorganic', 'physical', 'nutrients', 'pcbs_dioxins',
  'other_organics', 'other_chemicals', 'unknown',
] as const

export type AnalyteGroup = typeof ANALYTE_GROUPS[number]

// `process` exists in Node, Deno and Bun, not in a browser bundle; reading it
// there must not throw.
function env(name: string): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return p?.env?.[name]
}

export function getApiKey(): string {
  return env('MURIEL_API_KEY') ?? ''
}

export function getBaseUrl(): string {
  return env('MURIEL_BASE_URL') ?? DEFAULT_BASE_URL
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * The base URL, refused if it would send the API key in the clear. Every
 * request carries the key in a header, so plain http hands it to anyone on the
 * network path; http is allowed only for a server on this machine.
 */
export function checkedBaseUrl(url: string): string {
  const text = String(url ?? '').trim().replace(/\/+$/, '')
  let u: URL
  try {
    u = new URL(text)
  } catch {
    throw new MurielAPIError(`Refusing base URL '${text}': not a valid URL.`)
  }
  if (u.protocol === 'https:' && u.hostname) return text
  if (u.protocol === 'http:' && LOCAL_HOSTS.has(u.hostname)) return text
  throw new MurielAPIError(
    `Refusing base URL '${text}': use https:// (plain http is allowed only for ` +
    'localhost), so your API key is never sent unencrypted.')
}
