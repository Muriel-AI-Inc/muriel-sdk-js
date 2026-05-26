# muriel &nbsp;·&nbsp; JavaScript / TypeScript SDK

Official Node.js SDK for the [Muriel® Water Quality API](https://murielai.io).  
Query 40M+ US drinking water records in plain English — or with typed filters.

## Install

```bash
npm install muriel
```

## Quick start

```ts
import { Agent } from 'muriel'

const agent = new Agent({ apiKey: 'muriel_live_...' })

const response = await agent.query(
  'PFAS detections in Illinois above EPA advisory levels'
)

console.log(response.summary)
console.log(response.count, 'records')
console.log(response.results[0])
```

Set `MURIEL_API_KEY` in your environment instead of passing `apiKey` directly:

```bash
export MURIEL_API_KEY=muriel_live_...
```

## Direct queries (no LLM)

```ts
import { getResults, getViolations, getSystems } from 'muriel'

// Water quality records
const records = await getResults({
  state: 'IL',
  analyteGroup: 'pfas',
  detectionsOnly: true,
  startDate: '2021-01-01',
})

// Violations
const violations = await getViolations({
  state: 'MI',
  violationStatus: 'Open',
})

// System metadata
const systems = await getSystems({ state: 'AZ' })
```

## Agent mode

```ts
import { Agent } from 'muriel'

const agent = new Agent()

const response = await agent.query(
  'Lead violations in Michigan water systems opened after 2022'
)

// response.results      — raw records
// response.summary      — plain-English summary
// response.executionLog — steps the server took
// response.count        — total records
```

The agent runs entirely server-side — no additional API keys required.

## Analyte groups

| Key | Description |
|-----|-------------|
| `pfas` | PFOA, PFOS, GenX, and all PFAS compounds |
| `microbial` | Coliform, E. coli, fecal indicators |
| `dbps` | Disinfection by-products (TTHM, HAA5, chloroform…) |
| `radiological` | Radium, uranium, gross alpha/beta |
| `pesticides_herbicides` | Atrazine, chlordane, glyphosate… |
| `vocs` | Benzene, TCE, vinyl chloride… |
| `metals_inorganic` | Lead, arsenic, copper, chromium… |
| `physical` | pH, turbidity, conductivity… |
| `nutrients` | Nitrate, nitrite, phosphorus… |
| `pcbs_dioxins` | PCBs (Aroclors), 2,3,7,8-TCDD |
| `other_organics` | Perchlorate, cyanide, naphthalene… |
| `other_chemicals` | All remaining monitored compounds |
| `unknown` | Uncategorised analytes |

## Error handling

```ts
import { MurielAuthenticationError, MurielRateLimitError } from 'muriel'

try {
  const records = await getResults({ state: 'CA', analyteGroup: 'pfas' })
} catch (err) {
  if (err instanceof MurielAuthenticationError) console.error('Bad API key')
  if (err instanceof MurielRateLimitError) console.error('Quota exceeded')
}
```

## Requirements

- Node.js ≥ 18 (uses native `fetch`)
