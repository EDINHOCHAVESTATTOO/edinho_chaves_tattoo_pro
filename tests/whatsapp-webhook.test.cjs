// Synthetic webhook tests. No Meta credentials or real Supabase connection required.
// Run: node --test tests/whatsapp-webhook.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createHmac, timingSafeEqual } = require("node:crypto");
const ts = require("typescript");

const source = fs.readFileSync("src/app/api/whatsapp/route.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
}}).outputText;
const userId = "00000000-0000-4000-8000-000000000001";
const stored = new Map();
const conversations = new Map();
let accountFound = true;
let databaseFailure = false;

function query(table) {
  const state = { filter: {}, payload: null, options: {} };
  const chain = {
    select() { return chain; },
    eq(k, v) { state.filter[k] = v; return chain; },
    upsert(value, options = {}) { state.payload = value; state.options = options; return chain; },
    update(value) { state.payload = value; return chain; },
    async maybeSingle() {
      if (databaseFailure) return { error: new Error("synthetic database error") };
      return { data: accountFound ? { user_id: userId } : null, error: null };
    },
    async single() {
      if (databaseFailure) return { data: null, error: new Error("synthetic database error") };
      const k = state.payload.user_id + ":" + state.payload.phone;
      if (!conversations.has(k)) conversations.set(k, { id: "synthetic-conversation" });
      return { data: conversations.get(k), error: null };
    },
    then(resolve, reject) {
      if (databaseFailure) return Promise.resolve({ error: new Error("synthetic database error") }).then(resolve, reject);
      if (table === "whatsapp_messages" && state.payload?.whatsapp_message_id) {
        const id = state.payload.whatsapp_message_id;
        if (!stored.has(id)) stored.set(id, state.payload);
      }
      return Promise.resolve({ error: null }).then(resolve, reject);
    },
  };
  return chain;
}
const moduleObj = { exports: {} };
const context = {
  module: moduleObj, exports: moduleObj.exports, Buffer, console, process,
  Response, Date, JSON, Error,
  require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, init) =>
      Response.json(body, init) } };
    if (name === "node:crypto") return { createHmac, timingSafeEqual };
    if (name === "@supabase/supabase-js") return { createClient: () => ({ from: query }) };
    throw Error("Unexpected import: " + name);
  },
};
vm.runInNewContext(js, context, { filename: "route.ts" });
const { GET, POST } = moduleObj.exports;
process.env.WHATSAPP_VERIFY_TOKEN = "synthetic-verify-token";
process.env.WHATSAPP_APP_SECRET = "synthetic-app-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-only";

function request(payload, { signature = "valid", raw } = {}) {
  const body = raw ?? JSON.stringify(payload);
  const valid = "sha256=" + createHmac("sha256", process.env.WHATSAPP_APP_SECRET).update(body).digest("hex");
  return new Request("https://example.invalid/api/whatsapp", {
    method: "POST", headers: { "x-hub-signature-256": signature === "valid" ? valid : signature },
    body,
  });
}
const payload = {
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "synthetic-phone-id" },
    contacts: [{ wa_id: "5551999999999", profile: { name: "Synthetic Client" } }],
    messages: [{ id: "synthetic-message-1", from: "5551999999999",
      type: "text", text: { body: "Synthetic test only" } }],
  }}] }],
};

test("GET accepts matching verification token", async () => {
  const url = "https://example.invalid/api/whatsapp?hub.mode=subscribe&hub.verify_token=synthetic-verify-token&hub.challenge=12345";
  const response = await GET({ nextUrl: new URL(url) });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "12345");
});
test("GET rejects incorrect verification token", async () => {
  const url = "https://example.invalid/api/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345";
  assert.equal((await GET({ nextUrl: new URL(url) })).status, 403);
});
test("POST rejects invalid HMAC", async () => {
  assert.equal((await POST(request(payload, { signature: "sha256=invalid" }))).status, 401);
});
test("POST rejects malformed JSON with valid HMAC", async () => {
  assert.equal((await POST(request(null, { raw: "{invalid" }))).status, 400);
});
test("POST rejects unrecognized object", async () => {
  assert.equal((await POST(request({ object: "not_whatsapp", entry: [] }))).status, 400);
});
test("POST stores synthetic message and ignores duplicate retry", async () => {
  stored.clear(); conversations.clear(); accountFound = true; databaseFailure = false;
  assert.equal((await POST(request(payload))).status, 200);
  assert.equal((await POST(request(payload))).status, 200);
  assert.equal(stored.size, 1);
  assert.equal(conversations.size, 1);
  assert.equal(stored.get("synthetic-message-1").message_text, "Synthetic test only");
});
test("POST returns retryable 503 for unknown account", async () => {
  accountFound = false;
  assert.equal((await POST(request(payload))).status, 503);
  accountFound = true;
});
test("POST returns 500 on synthetic database failure", async () => {
  databaseFailure = true;
  assert.equal((await POST(request(payload))).status, 500);
  databaseFailure = false;
});
test("POST accepts status-only events", async () => {
  const p = structuredClone(payload);
  delete p.entry[0].changes[0].value.messages;
  p.entry[0].changes[0].value.statuses = [{ id: "synthetic-outgoing", status: "delivered" }];
  assert.equal((await POST(request(p))).status, 200);
});
