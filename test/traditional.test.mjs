// The traditional functions and the error paths. No network: fetch is stubbed.
//   npm test            (builds, then runs every test/*.test.mjs)
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const dist = process.env.MURIEL_SDK_DIST || new URL('../dist/', import.meta.url).pathname
const sdk = await import(pathToFileURL(path.join(dist, 'index.js')).href)
const {
  Agent, getResults, getLead, getSystems, getStateFacilities, getViolations,
  MurielAPIError, MurielAuthenticationError, MurielValidationError, MurielCreditsError,
  MurielNotFoundError, MurielRateLimitError, MurielServerError, VERSION,
} = sdk

const KEY = 'muriel_live_' + 't'.repeat(32)
let sent = []
let next = () => json(200, { records: [] })
function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json', ...headers } })
}
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), init })
  return next()
}
const last = () => sent[sent.length - 1]

let n = 0
async function t(name, fn) {
  next = () => json(200, { records: [] })
  await fn(); n++; console.log('ok ', name)
}

await t('system results go to the system route', async () => {
  next = () => json(200, { records: [{ pwsid: 'IL0316000', era: 'historical' }] })
  const rows = await getResults({ pwsid: ' il0316000 ', analyte: 'Lead', limit: 10, apiKey: KEY })
  const u = new URL(last().url)
  assert.equal(u.pathname, '/api/v1/records/system/IL0316000')
  assert.equal(u.searchParams.get('result_analyte_name'), 'Lead')
  assert.equal(u.searchParams.get('limit'), '10')
  assert.equal(last().init.headers['X-API-Key'], KEY)
  assert.equal(rows[0].era, 'historical')
})

await t('state + group is filtered on the server', async () => {
  await getResults({ state: 'il', analyteGroup: 'pfas', apiKey: KEY })
  const u = new URL(last().url)
  assert.equal(u.pathname, '/api/v1/records/state/IL')
  assert.equal(u.searchParams.get('analyte_group'), 'pfas')
})

await t('address sends the radius', async () => {
  await getResults({ address: '121 N LaSalle St, Chicago, IL', radiusMiles: 5, apiKey: KEY })
  const u = new URL(last().url)
  assert.equal(u.pathname, '/api/v1/records/address')
  assert.equal(u.searchParams.get('radius_miles'), '5')
})

await t('bad arguments are refused before any request', async () => {
  const before = sent.length
  await assert.rejects(getResults({ apiKey: KEY }), MurielValidationError)
  await assert.rejects(getResults({ pwsid: 'IL0316000', era: 'old', apiKey: KEY }), MurielValidationError)
  await assert.rejects(getResults({ state: 'IL', analyteGroup: 'nope', apiKey: KEY }), MurielValidationError)
  await assert.rejects(getViolations({ apiKey: KEY }), MurielValidationError)
  assert.equal(sent.length, before)
})

await t('contaminant feeds', async () => {
  await getLead({ limit: 5, detectionsOnly: true, era: 'all', apiKey: KEY })
  const u = new URL(last().url)
  assert.equal(u.pathname, '/api/v1/records/lead')
  assert.equal(u.searchParams.get('detections_only'), 'true')
  assert.equal(u.searchParams.get('era'), 'all')
})

await t('systems and facilities', async () => {
  next = () => json(200, { records: [{ pwsid: 'DE0000001', pws_name: 'X', results_held: 3 }] })
  const sys = await getSystems({ state: 'de', apiKey: KEY })
  assert.equal(new URL(last().url).pathname, '/api/v1/systems/DE')
  assert.equal(sys[0].pws_name, 'X')
  next = () => json(200, { state: 'IL', facility_count: 0, facilities: [], note: 'none' })
  const f = await getStateFacilities({ state: 'IL', apiKey: KEY })
  assert.equal(new URL(last().url).pathname, '/api/v1/geocoding/facilities/state/IL')
  assert.equal(f.note, 'none')
})

await t('every error status throws its own error, with the server message', async () => {
  const cases = [[400, MurielValidationError], [401, MurielAuthenticationError],
    [404, MurielNotFoundError], [422, MurielValidationError], [429, MurielRateLimitError],
    [500, MurielServerError], [501, MurielServerError], [418, MurielAPIError]]
  for (const [status, Err] of cases) {
    next = () => json(status, { detail: `server says ${status}` })
    const err = await getResults({ pwsid: 'IL0316000', apiKey: KEY }).catch((e) => e)
    assert.equal(err.constructor, Err, `${status}: got ${err.constructor.name}`)
    assert.equal(err.statusCode, status)
    assert.match(err.message, /server says/)
  }
  next = () => json(422, { detail: [{ msg: 'limit too big' }] })
  const e = await getResults({ pwsid: 'IL0316000', apiKey: KEY }).catch((x) => x)
  assert.match(e.message, /limit too big/)
})

await t('out of credits: a plain error that says how to buy more', async () => {
  next = () => json(402, { detail: { error: 'out_of_credits', message: 'You are out of credits.',
                                     balance: 0, contact: 'info@murielai.io' } })
  const err = await new Agent({ apiKey: KEY }).query('x').catch((e) => e)
  assert.ok(err instanceof MurielCreditsError)
  assert.match(err.message, /^Out of Muriel API credits \(balance: 0\)\./)
  assert.match(err.message, /nothing was charged/)
  assert.match(err.message, /info@murielai\.io/)
  assert.equal(err.balance, 0)
  assert.equal(err.serverMessage, 'You are out of credits.')
  assert.ok(err.buyUrl.startsWith('mailto:info@murielai.io'))
  next = () => json(402, { detail: 'Out of credits. Data calls cost 1 credit per 1,000 records returned.' })
  const d = await getResults({ pwsid: 'IL0316000', apiKey: KEY }).catch((e) => e)
  assert.ok(d instanceof MurielCreditsError && d.balance === undefined)
  assert.match(d.serverMessage, /1,000 records/)
})

await t('redirects are not followed', async () => {
  next = () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.example/steal' } })
  const err = await getResults({ pwsid: 'IL0316000', apiKey: KEY }).catch((e) => e)
  assert.ok(err instanceof MurielAPIError)
  assert.match(err.message, /not followed/)
  assert.equal(last().init.redirect, 'manual')
})

await t('plain http is refused except for localhost', async () => {
  await assert.rejects(getResults({ pwsid: 'IL0316000', apiKey: KEY, baseUrl: 'http://api.murielai.io' }),
                       /https/)
  await getResults({ pwsid: 'IL0316000', apiKey: KEY, baseUrl: 'http://127.0.0.1:8080' })
  assert.ok(last().url.startsWith('http://127.0.0.1:8080/'))
})

await t('the environment supplies the key and base URL', async () => {
  const old = { k: process.env.MURIEL_API_KEY, b: process.env.MURIEL_BASE_URL }
  process.env.MURIEL_API_KEY = KEY
  process.env.MURIEL_BASE_URL = 'http://localhost:8000'
  try {
    await getResults({ pwsid: 'DE0000001' })
    assert.ok(last().url.startsWith('http://localhost:8000/api/v1/records/system/'))
    assert.equal(last().init.headers['X-API-Key'], KEY)
  } finally {
    if (old.k === undefined) delete process.env.MURIEL_API_KEY; else process.env.MURIEL_API_KEY = old.k
    if (old.b === undefined) delete process.env.MURIEL_BASE_URL; else process.env.MURIEL_BASE_URL = old.b
  }
  delete process.env.MURIEL_API_KEY
  await assert.rejects(getResults({ pwsid: 'DE0000001' }), MurielAuthenticationError)
})

await t('the User-Agent carries the version', async () => {
  await getResults({ pwsid: 'IL0316000', apiKey: KEY })
  assert.equal(last().init.headers['User-Agent'], `muriel-js/${VERSION}`)
})

await t('VERSION matches package.json', async () => {
  const { readFile } = await import('node:fs/promises')
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(VERSION, pkg.version)
})

await t('the ESM build loads too', async () => {
  if (process.env.MURIEL_SDK_DIST) return            // a tsc test build has no .mjs
  const esm = await import(pathToFileURL(path.join(dist, 'index.mjs')).href)
  assert.equal(typeof esm.query, 'function')
  assert.equal(typeof esm.getResults, 'function')
})

console.log(`${n} passed`)
