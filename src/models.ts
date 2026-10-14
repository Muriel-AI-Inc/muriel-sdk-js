import type { AnalyteGroup } from './config.js'

export interface WaterQualityRecord {
  result_uuid: string
  state: string
  pwsid: string
  system_name: string
  result_analyte_name?: string
  analyte_group?: AnalyteGroup
  result_value?: string
  result_unit?: string
  concentration_value?: number
  concentration_units?: string
  result_non_detect?: boolean
  sample_collection_date?: string
  result_laboratory?: string
  result_sample_point?: string
  result_sample_location?: string
  result_facility_id?: string
  result_latitude?: number
  result_longitude?: number
  result_address?: string
  /** 'recent' (the window states currently publish) or 'historical'. */
  era?: string
  /** Address searches: miles from the address (0 for the system serving it). */
  distance_miles?: number
  /** Address searches: 'sample' (its own coordinates) or 'service_area'. */
  location_basis?: 'sample' | 'service_area'
  [key: string]: unknown
}

export interface Violation {
  pwsid: string
  system_name: string
  state: string
  violation_id?: string
  violation_code?: string
  violation_category?: string
  contaminant_code?: string
  analyte_name?: string
  begin_date?: string
  end_date?: string
  resolution_date?: string
  violation_status?: 'Open' | 'Resolved'
  [key: string]: unknown
}

/** A water system with results on file, from getSystems(). */
export interface WaterSystem {
  pwsid: string
  pws_name: string
  state_code: string
  population_served_count?: number | null
  service_connections_count?: number | null
  /** EPA size category. */
  size_band?: string | null
  /** How many sample results Muriel holds for the system. */
  results_held: number
  /** Date of the newest result, 'YYYY-MM-DD'. */
  latest_sample?: string | null
  [key: string]: unknown
}

export interface SamplingRequirement {
  pwsid: string
  system_name?: string
  state?: string
  analyte_name?: string
  analyte_group?: string
  frequency?: string
  [key: string]: unknown
}

export interface AgentQueryResponse {
  /**
   * The records the answer rests on. Sample results use the WaterQualityRecord
   * fields; other rows (events, rankings, systems) carry their own.
   */
  results: Array<WaterQualityRecord | Record<string, unknown>>
  count: number
  /** The agent's answer, as plain text. */
  summary: string
  /** The same answer with its Markdown formatting, as the web app shows it. */
  summaryMarkdown?: string
  /** Each tool the agent ran, with its input. */
  executionLog: Array<{ tool: string; input?: Record<string, unknown> }>
  /** Present when a CSV or PDF was produced. */
  documents?: Array<{ filename: string; url: string; rows?: number }>
  /** What the question cost and the balance afterwards. */
  credits?: { charged: number; balance: number }
  warning?: string
}

// Endpoint response envelopes
export interface RecordsResponse {
  records?: WaterQualityRecord[]
  results?: WaterQualityRecord[]
  count?: number
  total?: number
  [key: string]: unknown
}

export interface ViolationsResponse {
  records?: Violation[]
  violations?: Violation[]
  count?: number
  [key: string]: unknown
}

export interface SystemsResponse {
  records?: WaterSystem[]
  systems?: WaterSystem[]
  count?: number
  /** Systems in this page. */
  system_count?: number
  /** Systems the state has in all. */
  total_systems?: number
  offset?: number
  /** Whether another page follows. */
  has_more?: boolean
  [key: string]: unknown
}

export interface RequirementsResponse {
  records?: SamplingRequirement[]
  requirements?: SamplingRequirement[]
  count?: number
  [key: string]: unknown
}
