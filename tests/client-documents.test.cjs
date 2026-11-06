const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, imports = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => imports[name], Blob, TextDecoder, Uint8Array, Date, JSON, Error, ...globals });
  return module.exports;
}
const helpers = load('src/lib/client-documents.ts');
test('documents: validates content and rejects renamed executable, SVG and empty/oversized files', async () => {
  assert.equal(await helpers.validateDocument(new Blob(['%PDF-1.4\nsynthetic'], { type: 'application/pdf' })), 'pdf');
  await assert.rejects(helpers.validateDocument(new Blob(['not a PDF'], { type: 'application/pdf' })));
  await assert.rejects(helpers.validateDocument(new Blob(['<svg/>'], { type: 'image/svg+xml' })));
  await assert.rejects(helpers.validateDocument(new Blob([], { type: 'application/pdf' })));
  await assert.rejects(helpers.validateDocument(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'application/pdf' })));
});
test('guardian: validates exact birthday, future and invalid dates in Brasilia', () => {
  const now = new Date('2026-11-06T15:00:00Z');
  assert.equal(helpers.minorAge('2008-11-07', now), 17);
  assert.throws(() => helpers.minorAge('2008-11-06', now));
  assert.throws(() => helpers.minorAge('2026-11-07', now));
  assert.throws(() => helpers.minorAge('2010-02-30', now));
});
test('guardian: captures immutable identity/procedure data and rejects incomplete data', () => {
  const data = { clientName: 'Cliente de teste', birthDate: '2010-01-02', clientDocument: 'DOC-MENOR-TESTE', guardianName: 'Responsável de teste', guardianDocument: 'DOC-RESP-TESTE', relationship: 'Mãe', guardianPhone: '+55 51 99999-9999', procedure: 'Piercing de teste', location: 'Local de teste', professional: 'Profissional de teste' };
  const text = helpers.guardianAuthorization(data, new Date('2026-11-06T15:00:00Z'));
  for (const value of ['Cliente de teste', '02/01/2010', 'DOC-MENOR-TESTE', 'DOC-RESP-TESTE', 'Piercing de teste', 'Local de teste']) assert.ok(text.includes(value));
  assert.throws(() => helpers.guardianAuthorization({ ...data, guardianDocument: '' }));
});
test('recipient: normalizes Brazilian and explicit international destinations; rejects letters', () => {
  assert.equal(helpers.normalizeRecipient('(51) 99999-9999'), '5551999999999');
  assert.equal(helpers.normalizeRecipient('+39 333 1234567'), '393331234567');
  assert.throws(() => helpers.normalizeRecipient('not-a-phone'));
});

const userId = '00000000-0000-4000-8000-000000000001';
const attachmentId = '00000000-0000-4000-8000-000000000002';
const requestId = '00000000-0000-4000-8000-000000000003';
function harness(options = {}) {
  const rows = new Map(); const calls = [];
  const attachment = { id: attachmentId, client_id: 'client-test', storage_path: `${userId}/client-test/file.pdf`, filename: 'Synthetic.pdf', content_type: options.image ? 'image/png' : 'application/pdf' };
  const file = options.image ? new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: 'image/png' }) : new Blob([options.badFile ? 'bad' : '%PDF-1.4\nsynthetic'], { type: 'application/pdf' });
  function from(table) {
    const q = { filters: {}, data: null, op: '' };
    const chain = {
      select() { return chain; }, eq(k,v) { q.filters[k] = v; return chain; }, gte() { return chain; },
      upsert(data) { q.data = data; return chain; }, insert(data) { q.data = data; q.op = 'insert'; return chain; }, update(data) { q.data = data; q.op = 'update'; return chain; },
      async maybeSingle() {
        if (table === 'studio_attachments') return { data: options.notOwned ? null : attachment, error: null };
        if (table === 'whatsapp_accounts') return { data: options.noAccount ? null : { phone_number_id: '12345' }, error: null };
        return { data: rows.get(q.filters.id) ?? null, error: null };
      },
      async single() { return { data: { id: 'conversation-test' }, error: null }; },
      then(resolve, reject) {
        let result = { error: null, count: options.limit ? 10 : 0 };
        if (q.op === 'insert') {
          if (rows.has(q.data.id)) result = { error: { code: '23505' } };
          else rows.set(q.data.id, { ...q.data });
        }
        if (q.op === 'update') Object.assign(rows.get(q.filters.id), q.data);
        return Promise.resolve(result).then(resolve,reject);
      },
    }; return chain;
  }
  const api = { auth: { getUser: async () => ({ data: { user: options.invalidAuth ? null : { id: userId } }, error: null }) }, from, storage: { from: () => ({ download: async () => ({ data: file, error: null }) }) } };
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public', SUPABASE_SECRET_KEY: 'synthetic-service', WHATSAPP_ACCESS_TOKEN: 'synthetic-meta', WHATSAPP_PHONE_NUMBER_ID: '12345' };
  const route = load('src/app/api/whatsapp/documents/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@supabase/supabase-js': { createClient: () => api }, '@/lib/client-documents': helpers,
  }, { process: { env }, Request, Response, FormData, AbortSignal, console: { error() {} }, fetch: async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/media')) return Response.json(options.mediaRejected ? { error: { code: 190 } } : { id: 'synthetic-media' }, { status: options.mediaRejected ? 400 : 200 });
    if (options.timeout) throw new Error('synthetic timeout');
    return Response.json(options.windowClosed ? { error: { code: 131047 } } : { messages: [{ id: 'wamid.synthetic' }] }, { status: options.windowClosed ? 400 : 200 });
  } });
  const request = (overrides = {}, authenticated = true) => new Request('https://example.invalid/api/whatsapp/documents', { method: 'POST', headers: { ...(authenticated ? { Authorization: 'Bearer synthetic-user' } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify({ attachmentId, recipient: '+5551999999999', requestId, ...overrides }) });
  return { ...route, request, calls, rows };
}
for (const [name, options, body, auth, expected] of [
  ['missing authentication', {}, {}, false, 401], ['expired authentication', { invalidAuth: true }, {}, true, 401],
  ['cross-user attachment', { notOwned: true }, {}, true, 404], ['unlinked WhatsApp account', { noAccount: true }, {}, true, 403],
  ['invalid request ID', {}, { requestId: 'bad' }, true, 400], ['invalid destination', {}, { recipient: 'bad' }, true, 400],
  ['invalid file contents', { badFile: true }, {}, true, 400], ['send rate limit', { limit: true }, {}, true, 429],
]) test(`sending: rejects ${name} without contacting Meta`, async () => {
  const h = harness(options); assert.equal((await h.POST(h.request(body, auth))).status, expected); assert.equal(h.calls.length, 0);
});
test('sending: uploads private PDF by media ID, records acceptance and prevents duplicate retry', async () => {
  const h = harness(); assert.equal((await h.POST(h.request())).status, 200);
  assert.equal(h.calls.length, 2); const payload = JSON.parse(h.calls[1].init.body);
  assert.equal(payload.document.id, 'synthetic-media'); assert.equal(payload.document.link, undefined);
  assert.equal(h.rows.get(requestId).status, 'accepted'); assert.equal(h.rows.get(requestId).whatsapp_message_id, 'wamid.synthetic');
  assert.equal((await h.POST(h.request())).status, 200); assert.equal(h.calls.length, 2);
});
test('sending: transmits PNG as image rather than unsupported document', async () => {
  const h = harness({ image: true }); assert.equal((await h.POST(h.request())).status, 200);
  const payload = JSON.parse(h.calls[1].init.body); assert.equal(payload.type, 'image'); assert.equal(payload.image.id, 'synthetic-media');
});
test('sending: expired window fails clearly and does not mark accepted', async () => {
  const h = harness({ windowClosed: true }); const response = await h.POST(h.request());
  assert.equal(response.status, 502); assert.equal(h.rows.get(requestId).status, 'failed'); assert.equal((await response.json()).retryAllowed, true);
});
test('sending: timeout leaves uncertain status and cannot retransmit on same request ID', async () => {
  const h = harness({ timeout: true }); const response = await h.POST(h.request());
  assert.equal(response.status, 502); assert.equal(h.rows.get(requestId).status, 'unknown'); assert.equal((await response.json()).retryAllowed, false);
  await h.POST(h.request()); assert.equal(h.calls.length, 2);
});
test('sending: media rejection does not attempt to send a message', async () => {
  const h = harness({ mediaRejected: true }); assert.equal((await h.POST(h.request())).status, 502); assert.equal(h.calls.length, 1); assert.equal(h.rows.get(requestId).status, 'failed');
});
