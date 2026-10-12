export { MurielClient } from './client.js'
export type { ClientOptions } from './client.js'
export { Agent, query } from './agent.js'
export type { AgentOptions, QueryOptions, QueryCallOptions } from './agent.js'

export { getResults } from './endpoints/results.js'
export {
  getLatest, getLead, getPfas, getColiform, getNitrate,
  getDbps, getArsenic, getManganese, getVocs,
} from './endpoints/contaminants.js'
export { getSystems } from './endpoints/systems.js'
export {
  getStateFacilities, getStateSamplingPoints,
  getFacilityGeocoding, getSamplingPointGeocoding,
} from './endpoints/locations.js'
export { getViolations } from './endpoints/violations.js'
export { getRequirements } from './endpoints/requirements.js'

export type { GetResultsOptions } from './endpoints/results.js'
export type { FeedOptions } from './endpoints/contaminants.js'
export type { GetSystemsOptions } from './endpoints/systems.js'
export type {
  Geocoding, Facility, SamplingPoint, StateListOptions,
  FacilityOptions, SamplingPointOptions,
} from './endpoints/locations.js'
export type { GetViolationsOptions } from './endpoints/violations.js'
export type { GetRequirementsOptions } from './endpoints/requirements.js'

export type {
  WaterQualityRecord,
  Violation,
  WaterSystem,
  SamplingRequirement,
  AgentQueryResponse,
} from './models.js'

export {
  MurielAPIError,
  MurielAuthenticationError,
  MurielValidationError,
  MurielNotFoundError,
  MurielRateLimitError,
  MurielServerError,
  MurielCreditsError,
} from './errors.js'

export { ANALYTE_GROUPS } from './config.js'
export type { AnalyteGroup } from './config.js'

export { VERSION } from './version.js'
