export { MurielClient } from './client.js'
export { Agent } from './agent.js'
export type { AgentOptions } from './agent.js'

export { getResults } from './endpoints/results.js'
export { getViolations } from './endpoints/violations.js'
export { getSystems } from './endpoints/systems.js'
export { getRequirements } from './endpoints/requirements.js'

export type { GetResultsOptions } from './endpoints/results.js'
export type { GetViolationsOptions } from './endpoints/violations.js'
export type { GetSystemsOptions } from './endpoints/systems.js'
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
} from './errors.js'

export { ANALYTE_GROUPS } from './config.js'
export type { AnalyteGroup } from './config.js'

export const VERSION = '0.1.0'
