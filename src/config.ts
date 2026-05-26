export const DEFAULT_BASE_URL = 'https://api.murielai.io'
export const DEFAULT_TIMEOUT_MS = 30_000

export const ANALYTE_GROUPS = [
  'pfas', 'microbial', 'dbps', 'radiological', 'pesticides_herbicides',
  'vocs', 'metals_inorganic', 'physical', 'nutrients', 'pcbs_dioxins',
  'other_organics', 'other_chemicals', 'unknown',
] as const

export type AnalyteGroup = typeof ANALYTE_GROUPS[number]

export function getApiKey(): string {
  const key = process.env['MURIEL_API_KEY'] ?? ''
  return key
}

export function getBaseUrl(): string {
  return process.env['MURIEL_BASE_URL'] ?? DEFAULT_BASE_URL
}
