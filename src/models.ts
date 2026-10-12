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
  distance_miles?: number
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

export interface WaterSystem {
  pwsid: string
  system_name: string
  state: string
  system_type?: string
  population_served?: number
  activity_status?: string
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
  results: WaterQualityRecord[]
  count: number
  summary: string
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
  [key: string]: unknown
}

export interface RequirementsResponse {
  records?: SamplingRequirement[]
  requirements?: SamplingRequirement[]
  count?: number
  [key: string]: unknown
}
