/**
 * Google sign-in hardening tests.
 *
 * Google's tokeninfo endpoint is replaced INSIDE THIS TEST PROCESS ONLY by a stub that behaves like
 * Google (invalid token → 400; otherwise returns the token's claims). This lets us prove what the
 * server does with each kind of token without network access or real accounts. All data is synthetic.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-google-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "ALLOW_DEV_GOOGLE_TEST_TOKENS", "ALLOW_DEV_JWT_FALLBACK", "VITE_GOOGLE_CLIENT_ID"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";
const CLIENT_ID = "test-client-id.apps.googleusercontent.com";

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }],
  teams: [], volunteers: [], beneficiaries: [], employees: [], storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", userName: "مدير", userEmail: "owner@example.org", role: "admin",
      primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active" }
  ],
  passwordResetRequests: [], notifications: [], initiatives: [], requests: [], logs: [], accessAuditLogs: [], activeSessions: []
}), "utf8");

// --- Google tokeninfo stub (this process only) ------------------------------------------------
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input?.url || String(input);
  if (url.startsWith("https://oauth2.googleapis.com/tokeninfo")) {
    const tok = new URL(url).searchParams.get("id_token") || "";
    if (!tok.startsWith("signed:")) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400, headers: { "content-type": "application/json" } });
    }
    return new Response(Buffer.from(tok.slice(7), "base64url").toString("utf8"), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
}) as any;

/** A token Google would accept, carrying the given claims. */
const googleToken = (claims: Record<string, any>) =>
  "signed:" + Buffer.from(JSON.stringify({
    aud: CLIENT_ID, email_verified: "true", exp: String(Math.floor(Date.now() / 1000) + 600), sub: "sub-" + Math.random(), ...claims
  })).toString("base64url");

let server: http.Server;
let baseUrl = "";

async function google(body: any) {
  const res = await realFetch(baseUrl + "/api/db/auth/google", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}
const isAdmin = (r: any) => r.json?.status === "success" && ["admin", "operations_manager"].includes(r.json?.role);

before(async () => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  const core: any = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

test("a token Google rejects never signs in (forged / tampered credential)", async () => {
  const r = await google({ credential: "eyJhbGciOiJub25lIn0." + Buffer.from(JSON.stringify({ email: "owner@example.org" })).toString("base64url") + "." });
  assert.equal(r.status, 401);
  assert.ok(!r.json?.sessionToken);
});

test("simulated dev test tokens are refused (no dev opt-in)", async () => {
  const r = await google({ credential: "dev_test_token:" + Buffer.from(JSON.stringify({ email: "owner@example.org" })).toString("base64") });
  assert.equal(r.status, 401);
});

test("a token issued for another application (audience mismatch) is refused", async () => {
  const r = await google({ credential: googleToken({ email: "owner@example.org", aud: "someone-elses-app.apps.googleusercontent.com" }) });
  assert.equal(r.status, 401);
  assert.ok(!isAdmin(r));
});

test("an email Google has not verified is refused", async () => {
  const r = await google({ credential: googleToken({ email: "owner@example.org", email_verified: "false" }) });
  assert.equal(r.status, 401);
});

test("an expired token is refused", async () => {
  const r = await google({ credential: googleToken({ email: "owner@example.org", exp: String(Math.floor(Date.now() / 1000) - 60) }) });
  assert.equal(r.status, 401);
});

test("an email that merely CONTAINS 'admin' does not become the administrator", async () => {
  const r = await google({ credential: googleToken({ email: "evil.admin@attacker.example" }) });
  assert.ok(!isAdmin(r), "verified non-matching 'admin' email was granted admin");
});

test("an email supplied in the request body is ignored — only the verified token counts", async () => {
  const r = await google({ credential: googleToken({ email: "visitor@attacker.example" }), email: "owner@example.org", googleEmail: "owner@example.org" });
  assert.ok(!isAdmin(r));
});

test("without GOOGLE_CLIENT_ID configured the server refuses every Google sign-in (fail closed)", async () => {
  const saved = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  try {
    const r = await google({ credential: googleToken({ email: "owner@example.org" }) });
    assert.equal(r.status, 401);
  } finally {
    process.env.GOOGLE_CLIENT_ID = saved;
  }
});

test("positive control: the verified owner of the admin record's exact email signs in as admin", async () => {
  const r = await google({ credential: googleToken({ email: "owner@example.org" }) });
  assert.ok(isAdmin(r), `expected admin, got ${r.status} ${r.json?.role}`);
  assert.ok(typeof r.json?.sessionToken === "string");
});

test("the two hard-coded administrator addresses still require a valid, verified Google token", async () => {
  for (const email of ["admin@riadataleata.org.sa", "riadataleata@gmail.com"]) {
    const unverified = await google({ credential: googleToken({ email, email_verified: "false" }) });
    assert.equal(unverified.status, 401, `${email}: unverified token accepted`);
    const wrongAud = await google({ credential: googleToken({ email, aud: "other-app" }) });
    assert.equal(wrongAud.status, 401, `${email}: foreign-audience token accepted`);
    const forged = await google({ credential: "not-a-google-token", email });
    assert.equal(forged.status, 401, `${email}: forged credential accepted`);
  }
});
