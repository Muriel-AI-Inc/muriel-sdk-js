import { MurielClient, type ClientOptions, type QueryParams } from '../client.js'
import type { WaterQualityRecord, RecordsResponse } from '../models.js'

/** Options for the national contaminant feeds (getLead, getPfas, ...). */
export interface FeedOptions extends ClientOptions {
  /** Records to return (default 100, max 1,000). */
  limit?: number
  /** 'recent' (newest first, the default) or 'oldest'. */
  sort?: 'recent' | 'oldest'
  /** Only results above zero and not reported as non-detects. */
  detectionsOnly?: boolean
  /** Only results at or above this concentration, in mg/L. */
  minConcentration?: number
  /** Only results reported as an exact value, not "less than". */
  excludeCensored?: boolean
  /** Only results with a known location. */
  geocodedOnly?: boolean
  /** One analyte by name, e.g. 'PERFLUOROOCTANOIC ACID (PFOA)'. */
  analyte?: string
  /** Coliform: 'P' present or 'A' absent. */
  presenceIndicator?: 'P' | 'A'
  /** 'recent' (default: the window states currently publish) or 'all' (with the archive). */
  era?: 'recent' | 'all'
}

function feed(path: string) {
  return async function (options: FeedOptions = {}): Promise<WaterQualityRecord[]> {
    const {
      limit = 100, sort, detectionsOnly, minConcentration, excludeCensored,
      geocodedOnly, analyte, presenceIndicator, era, apiKey, baseUrl, timeoutMs,
    } = options
    const client = new MurielClient({ apiKey, baseUrl, timeoutMs })
    const params: QueryParams = {
      limit,
      ...(sort && { sort }),
      ...(detectionsOnly && { detections_only: true }),
      ...(minConcentration !== undefined && { min_concentration: minConcentration }),
      ...(excludeCensored && { exclude_censored: true }),
      ...(geocodedOnly && { geocoded_only: true }),
      ...(analyte && { result_analyte_name: analyte }),
      ...(presenceIndicator && { presence_indicator: presenceIndicator }),
      ...(era && { era }),
    }
    const data = await client.get<RecordsResponse>(`/api/v1/records/${path}`, params)
    return (data.records ?? []) as WaterQualityRecord[]
  }
}

/** The most recent results nationwide, any contaminant. */
export const getLatest = feed('latest')
/** Lead results nationwide. */
export const getLead = feed('lead')
/** PFAS results nationwide (PFOA, PFOS and the rest). */
export const getPfas = feed('pfas')
/** Total coliform and E. coli results nationwide. */
export const getColiform = feed('coliform')
/** Nitrate and nitrite results nationwide. */
export const getNitrate = feed('nitrate')
/** Disinfection byproduct results nationwide (TTHM, HAA5 and their parts). */
export const getDbps = feed('dbps')
/** Arsenic results nationwide. */
export const getArsenic = feed('arsenic')
/** Manganese results nationwide. */
export const getManganese = feed('manganese')
/** Volatile organic compound results nationwide. */
export const getVocs = feed('vocs')
