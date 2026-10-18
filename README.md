# Muriel JavaScript & TypeScript SDK

[Muriel](https://murielai.io) is the AI agent for U.S. drinking water data. It
answers plain-English questions about any public water system from the
monitoring results states publish, checks them against federal limits, and
shows the records behind every answer.

There are three ways to use it, and this README covers them in the order most
people need them:

1. **[In your AI assistant](#1-use-muriel-in-your-ai-assistant-mcp-connector)**:
   add the Muriel connector to Claude, ChatGPT, Cursor, VS Code or any MCP
   client and ask in the chat you already use. No code, no key.
2. **[The agent, from code](#2-ask-the-agent-from-code)**: `query("...")`
   sends a question to the same agent and returns the answer, the records it
   used, and any CSV it produced, shaped the way your program needs.
3. **[The REST API](#3-query-the-rest-api-directly)**: exact, parameter-driven
   queries for one system's history, one contaminant nationwide, or every system
   in a state. Use this package's functions or call it over HTTP from any
   language.

All three draw on the same data and the same Muriel account and credits.

## What Muriel covers

- **92 million+ results** from **33 states** and **63,000+ water systems**
- **Current:** many states update daily, often within days of sampling
- **Deep:** some states go back to the 1970s
- **Every contaminant states test for:** lead and copper, PFAS, nitrate,
  disinfection byproducts, arsenic, coliform, VOCs and more

Every answer is built from the sample results themselves, not from summaries or
annual reports, and says how current each state's data is. A gap is never
passed off as a clean record. See exactly which states, contaminants and years
are covered, live, at [murielai.io/overview](https://murielai.io/overview).

Muriel is built for people who work with drinking water: utilities and the
regulators who oversee them, and the labs, engineering firms and vendors who
serve them.

---

## 1. Use Muriel in your AI assistant (MCP connector)

The quickest way to put Muriel to work. Add one URL to your assistant, sign in
to your Muriel account and click **Allow**. There is no API key to copy and
nothing to install.

**Connector URL:** `https://mcp.murielai.io/mcp`

| Assistant | How to add it |
|---|---|
| **Claude** (claude.ai and desktop) | Settings → Connectors → *Add custom connector* → name it Muriel, paste the URL → *Connect* |
| **Claude Code** | `claude mcp add --transport http --scope user muriel https://mcp.murielai.io/mcp`, then `/mcp` → muriel → *Authenticate* |
| **Cursor** | In `~/.cursor/mcp.json`: `{"mcpServers": {"muriel": {"url": "https://mcp.murielai.io/mcp"}}}` |
| **VS Code** (Copilot agent mode) | In `.vscode/mcp.json`: `{"servers": {"muriel": {"type": "http", "url": "https://mcp.murielai.io/mcp"}}}` |
| **ChatGPT** | Where custom connectors are enabled: Settings → Connectors → create one with the URL and OAuth |
| **Anything else** | Any client that supports remote MCP servers with OAuth takes the URL. For local-only (stdio) clients: `npx -y mcp-remote https://mcp.murielai.io/mcp` |

The first time your assistant uses Muriel it opens a Muriel page: sign in if
you need to, see what it is asking for, and click **Allow**. To disconnect,
use *Connected apps* on your [account page](https://murielai.io/account).

Then just ask, in the chat you already use:

> Anything new with Chicago's water this week?
>
> Which systems in Georgia had a nitrate result above the MCL in the last year?
>
> Where has PFOA or PFOS been detected above 4 ppt in Pennsylvania?

Your assistant calls Muriel whenever a question needs drinking water data and
answers from what Muriel returns. The connector gives it 16 read-only tools,
the same ones Muriel's own agent uses: finding a water system, sample results
and summaries, what changed, trends, compliance math (running annual averages,
90th percentiles, monitoring gaps), and the federal standards and rules. It
can't see your Muriel conversations or documents, change your account or buy
anything. Full reference:
[murielai.io/developers](https://murielai.io/developers#connector).

---

## 2. Ask the agent from code

Install the package and set your key. Create a key on your
[account page](https://murielai.io/account).

```bash
npm install @muriel-ai/sdk
export MURIEL_API_KEY="muriel_live_..."
```

Every function reads `MURIEL_API_KEY`; you can also pass `apiKey` directly.
Works in Node 18+, Deno and Bun, with TypeScript types included. Keep the key
on a server: never ship it in browser code.

```ts
import { query } from '@muriel-ai/sdk'

const answer = await query("Is Chicago's water meeting federal limits for lead and copper?")

console.log(answer.summary)                   // the answer, in plain English
for (const r of answer.results.slice(0, 5)) { // the records it rests on
  console.log(r.sample_collection_date, r.system_name,
              r.result_analyte_name, r.result_value, r.result_unit)
}
```

`query()` asks the same agent that answers at [murielai.io](https://murielai.io).
It works out which systems, contaminants and dates the question is about, pulls
the results, compares them with MCLs, action levels and treatment rules, and
tells you when a state's data is out of date. Each answer carries:

| Field | What it holds |
|---|---|
| `summary` | The answer in plain English, as plain text |
| `summaryMarkdown` | The same answer with its Markdown formatting, as the web app shows it |
| `results`, `count` | The records the answer rests on. Sample results use the same fields as the REST API's records; other rows, such as events or rankings, have their own |
| `documents` | Any CSV or PDF the agent produced, with a download URL |
| `warning` | A caveat, when the data needs one |
| `executionLog` | The steps the agent took |
| `credits` | What the question used, and your balance after it |

### What you can ask

| | |
|---|---|
| **Compliance** | Which systems in Georgia had a nitrate result above the MCL in the last year? |
| **Trends** | Which systems are within 20% of an MCL and trending up? |
| **PFAS** | Where has PFOA or PFOS been detected above 4 ppt in Pennsylvania? |
| **What changed** | What new results were published in California this week? |
| **Market research** | Which Illinois systems serving over 50,000 people have detected PFAS? |

### Scope it

```ts
const answer = await query('Any new detections?', { pwsid: 'IL0316000', since: '2026-01-01' })
```

### Get exactly the fields you need

Pass a list of field names, or a JSON Schema, and the answer comes back in that
shape, ready for a database, a dashboard or another program:

```ts
const latest = await query('What was the most recent lead result for Chicago?', {
  pwsid: 'IL0316000',
  schema: ['sample_date', 'result', 'units', 'above_action_level'],
})
console.log(latest.sample_date, latest.result, latest.units)
```

### From question to CSV

Ask for an export and the file comes back with the answer:

```ts
const answer = await query('Which systems in Oregon have a lead 90th percentile above 10 ppb? ' +
                           'Export it to a CSV, largest systems first.')
for (const doc of answer.documents ?? []) console.log(doc.filename, doc.url)
```

Use `new Agent({ apiKey, baseUrl, timeoutMs })` when you want to set those once
and reuse them; `query()` builds and reuses one for you.

---

## 3. Query the REST API directly

When you know exactly what you want, such as one system's full history or one
contaminant across the country, query the data directly. Same key as above.

```ts
import { getResults, getLead, getSystems } from '@muriel-ai/sdk'

// One water system, history included
const rows = await getResults({ pwsid: 'IL0316000', analyte: 'Lead', limit: 100 })

// A whole state, or one group of contaminants
const pfas = await getResults({ state: 'IL', analyteGroup: 'pfas', limit: 500 })

// The latest lead results nationwide
const lead = await getLead({ limit: 50, detectionsOnly: true })

// Every water system in a state, with size and latest sample
// (limit: null pages through them all)
const systems = await getSystems({ state: 'IL', limit: null })
```

The same calls work from any language over HTTP:

```bash
curl "https://api.murielai.io/api/v1/records/system/IL0316000?result_analyte_name=Lead&limit=12" \
  -H "X-API-Key: $MURIEL_API_KEY"
```

Every record has the same fields whichever state it came from: the system, the
contaminant, the value as published and converted to mg/L, the sample date, the
place where known, and `era`: `"recent"` for the window states currently
publish, `"historical"` for the archive. Pass `era: 'all'` to include history in
the national feeds, or `era: 'recent'` to limit a system or state query to
current results.

| Function | What it returns |
|---|---|
| `getResults()` | Results by system, state, analyte group or address, with filters for dates, detections, concentration and analyte |
| `getLatest()`, `getLead()`, `getPfas()`, `getColiform()`, `getNitrate()`, `getDbps()`, `getArsenic()`, `getManganese()`, `getVocs()` | The latest results for one contaminant, nationwide |
| `getSystems()` | Water systems in a state; `limit: null` for all of them, or page with `offset` |
| `getStateSamplingPoints()`, `getSamplingPointGeocoding()` | Sampling points with a location |
| `getStateFacilities()`, `getFacilityGeocoding()` | Facilities with a location, where states publish them |
| `MurielClient` | `get()` and `post()` on any route, with the key, timeouts and errors handled |

Up to 1,000 records per call; page with `offset`. Monitoring requirements and
violation records (`getRequirements`, `getViolations`) are not available yet;
ask the agent about monitoring gaps and exceedances instead.

Interactive reference for every route and field:
[api.murielai.io/docs](https://api.murielai.io/docs).

---

## Pricing

One balance of credits on your Muriel account covers all three:

- **An agent question**, in the app or from code, is metered on the work it
  takes: typically 1–3 credits, never more than 8.
- **Data calls**, through the connector's tools or the REST API, cost 1 credit
  per 1,000 records returned, added up across calls. A call that returns
  nothing is free.

Every account gets 8 free credits a month, usable on any of them. For more,
email [info@murielai.io](mailto:info@murielai.io).

## Errors

```ts
import { getResults, MurielAPIError, MurielCreditsError } from '@muriel-ai/sdk'

try {
  const rows = await getResults({ pwsid: 'IL0316000' })
} catch (e) {
  if (e instanceof MurielCreditsError) {
    console.log(e.message)  // "Out of Muriel API credits ... To buy more credits, email info@murielai.io ..."
  } else if (e instanceof MurielAPIError) {
    console.log(e.statusCode, e.message)
  } else {
    throw e
  }
}
```

| Error | When |
|---|---|
| `MurielAuthenticationError` | Missing or invalid API key (401) |
| `MurielValidationError` | A bad parameter (400, 422), or one refused before sending |
| `MurielCreditsError` | Out of API credits (402). The call was not run and nothing was charged; the message says how to buy more (email info@murielai.io). `balance` has the balance when known |
| `MurielNotFoundError` | Unknown system or resource (404) |
| `MurielRateLimitError` | Too many requests (429); wait and retry |
| `MurielServerError` | Not available (501), or a server error worth retrying (5xx) |

All of them extend `MurielAPIError`. Keys are only ever sent over HTTPS, and
never forwarded on a redirect.

## Good to know

Muriel is a research and analysis tool, not a compliance determination.
Results are as states published them; coverage varies by state, and the
absence of a result is never evidence of compliance. Only your state primacy
agency can say whether a system is in compliance.

## Documentation

- Guides and SDK reference: [docs.murielai.io](https://docs.murielai.io)
- MCP connector reference: [murielai.io/developers](https://murielai.io/developers#connector)
- REST API reference: [api.murielai.io/docs](https://api.murielai.io/docs)
- Python: `pip install muriel` ([github.com/Muriel-AI-Inc/muriel-sdk-python](https://github.com/Muriel-AI-Inc/muriel-sdk-python))

## Support

- Email: [info@murielai.io](mailto:info@murielai.io)
- Issues: [github.com/Muriel-AI-Inc/muriel-sdk-js/issues](https://github.com/Muriel-AI-Inc/muriel-sdk-js/issues)

## License

MIT. Copyright (c) 2024-2026 Muriel AI, Inc. Use of Muriel is governed by the
terms at [murielai.io/terms](https://murielai.io/terms).
