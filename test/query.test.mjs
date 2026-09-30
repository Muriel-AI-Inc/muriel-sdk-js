// query() / Agent.query options. No network: fetch is stubbed.
//   npm run build && node test/query.test.mjs
// (or point MURIEL_SDK_DIST at any directory holding a compiled index.js)
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const dist = process.env.MURIEL_SDK_DIST || new URL('../dist/', import.meta.url).pathname
const { Agent, query, MurielValidationError, MurielAPIError } =
  await import(pathToFileURL(path.join(dist, 'index.js')).href)

const EVENT = { event_type: 'new_results', num_events: 1, pwsid: 'IL0316000',
  insight: 'Lead and copper results from 12 sites were posted today.', extra: 'x' }
let sent, sentHeaders, body = { results: [EVENT], count: 1, summary: 's', execution_log: [] }
globalThis.fetch = async (url, init) => {
  sent = JSON.parse(init.body); sentHeaders = init.headers
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

let n = 0
async function t(name, fn) { await fn(); n++; console.log('ok ', name) }

await t('plain query unchanged', async () => {
  const r = await new Agent({ apiKey: 'k' }).query('Get the latest events for Chicago Water')
  assert.equal(r.count, 1); assert.equal(r.summary, 's')
  assert.deepEqual(Object.keys(sent).sort(), ['max_records', 'prompt'])
})

await t('landing page call', async () => {
  const r = await query('Get the latest events for Chicago Water', {
    apiKey: 'YOUR_MURIEL_API_KEY', since: '2026-09-29',
    schema: ['event_type', 'num_events', 'pwsid', 'insight'],
  })
  assert.deepEqual(Object.keys(r), ['event_type', 'num_events', 'pwsid', 'insight'])
  assert.equal(sent.since, '2026-09-29')
  assert.deepEqual(sent.schema.required, ['event_type', 'num_events', 'pwsid', 'insight'])
  assert.equal(JSON.stringify(sentHeaders).includes('YOUR_MURIEL_API_KEY'), true)
})

await t('since accepts a Date, rejects junk', async () => {
  await query('x', { apiKey: 'k', since: new Date('2026-09-29T13:05:00Z') })
  assert.equal(sent.since, '2026-09-29')
  await assert.rejects(query('x', { apiKey: 'k', since: 'last tuesday' }), MurielValidationError)
})

await t('pwsid normalised and validated', async () => {
  await query('x', { apiKey: 'k', pwsid: ' il0316000 ' })
  assert.equal(sent.pwsid, 'IL0316000')
  await assert.rejects(query('x', { apiKey: 'k', pwsid: 'Chicago' }), MurielValidationError)
})

await t('schema forms and errors', async () => {
  const raw = await query('x', { apiKey: 'k', schema: { type: 'object' } })
  assert.equal(raw.extra, 'x')
  await assert.rejects(query('x', { apiKey: 'k', schema: [] }), MurielValidationError)
  await assert.rejects(query('x', { apiKey: 'k', schema: ['a', 'a'] }), MurielValidationError)
  body = { results: [{ event_type: 'new_results' }], count: 1, summary: '' }
  await assert.rejects(query('x', { apiKey: 'k', schema: ['event_type', 'insight'] }), MurielAPIError)
})

await t('empty prompt rejected', async () => {
  await assert.rejects(query('  ', { apiKey: 'k' }), MurielValidationError)
})

console.log(`${n} passed`)
