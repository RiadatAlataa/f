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
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-google-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "ALLOW_DEV_GOOGLE_TEST_TOKENS", "ALLOW_DEV_JWT_FALLBACK", "VITE_GOOGLE_CLIENT_ID"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";
const CLIENT_ID = "test-client-id.apps.googleusercontent.com";
const ADMIN_PW = `Aa1!${crypto.randomBytes(8).toString("hex")}`;

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }],
  teams: [], volunteers: [], beneficiaries: [], employees: [], storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", userName: "مدير", userEmail: "owner@example.org", role: "admin",
      primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active", passwordHash: bcrypt.hashSync(ADMIN_PW, 4) }
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
let core: any;

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
  core = await import("../../server-core");
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

test("an admin record's exact email is NOT enough: Google sign-in for admins needs explicit approval", async () => {
  const r = await google({ credential: googleToken({ email: "owner@example.org" }) });
  assert.equal(r.status, 403);
  assert.equal(r.json?.code, "GOOGLE_ADMIN_APPROVAL_REQUIRED");
  assert.ok(!r.json?.sessionToken);
});

async function approve(body: any, token?: string) {
  const res = await realFetch(baseUrl + "/api/db/auth/google-signin/approval", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-session-token": token } : {}) },
    body: JSON.stringify(body)
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

test("approval requires a signed-in super admin AND their current password", async () => {
  const anon = await approve({ approve: true, currentPassword: ADMIN_PW });
  assert.equal(anon.status, 401);
  const t = core.createServerSession({ id: "admin-user", userId: "admin-user", name: "مدير", role: "admin" }, "admin").token;
  const wrongPw = await approve({ approve: true, currentPassword: "Wrong-123456" }, t);
  assert.equal(wrongPw.status, 403);
});

test("after approval the verified Google account is bound by its immutable id; another Google account with the same email is refused", async () => {
  const t = core.createServerSession({ id: "admin-user", userId: "admin-user", name: "مدير", role: "admin" }, "admin").token;
  const ok = await approve({ approve: true, currentPassword: ADMIN_PW }, t);
  assert.equal(ok.status, 200);

  const first = await google({ credential: googleToken({ email: "owner@example.org", sub: "google-sub-owner" }) });
  assert.ok(isAdmin(first), `expected admin after approval, got ${first.status}`);

  const impostor = await google({ credential: googleToken({ email: "owner@example.org", sub: "google-sub-other" }) });
  assert.equal(impostor.status, 403);
  assert.equal(impostor.json?.code, "GOOGLE_ACCOUNT_MISMATCH");

  const revoke = await approve({ approve: false, currentPassword: ADMIN_PW }, t);
  assert.equal(revoke.status, 200);
  const afterRevoke = await google({ credential: googleToken({ email: "owner@example.org", sub: "google-sub-owner" }) });
  assert.equal(afterRevoke.status, 403);
});

test("the formerly hard-coded administrator addresses no longer grant admin, even with a valid verified token", async () => {
  for (const email of ["admin@riadataleata.org.sa", "riadataleata@gmail.com"]) {
    const r = await google({ credential: googleToken({ email }) });
    assert.ok(!isAdmin(r), `${email} still grants admin`);
    const forged = await google({ credential: "not-a-google-token", email });
    assert.equal(forged.status, 401);
  }
});

// ---------------------------------------------------------------------------
// Simulated test tokens: refused under EVERY production-like configuration.
// (isExplicitDevAuthBypassAllowed reads the environment at call time, so the matrix is real.)
// ---------------------------------------------------------------------------
const DEV_TOKEN = "dev_test_token:" + Buffer.from(JSON.stringify({ email: "owner@example.org" })).toString("base64");
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { await fn(); } finally { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
}

test("dev test tokens are refused for NODE_ENV unset / production / development / test (no opt-in)", async () => {
  for (const env of [undefined, "production", "development", "test", "staging"]) {
    await withEnv({ NODE_ENV: env, ALLOW_DEV_GOOGLE_TEST_TOKENS: undefined }, async () => {
      const r = await google({ credential: DEV_TOKEN });
      assert.equal(r.status, 401, `accepted with NODE_ENV=${env}`);
    });
  }
});

test("dev test tokens are refused on Render / Vercel EVEN WITH the opt-in flag set", async () => {
  for (const marker of ["RENDER", "RENDER_SERVICE_ID", "VERCEL", "VERCEL_ENV"]) {
    await withEnv({ NODE_ENV: "development", ALLOW_DEV_GOOGLE_TEST_TOKENS: "true", [marker]: "1" }, async () => {
      const r = await google({ credential: DEV_TOKEN });
      assert.equal(r.status, 401, `accepted on ${marker} with opt-in`);
    });
  }
});

test("dev test tokens are refused with NODE_ENV=production even with the opt-in flag", async () => {
  await withEnv({ NODE_ENV: "production", ALLOW_DEV_GOOGLE_TEST_TOKENS: "true" }, async () => {
    const r = await google({ credential: DEV_TOKEN });
    assert.equal(r.status, 401);
  });
});

test("control: the ONLY accepted case is local dev/test + explicit opt-in + no hosting marker (and still no admin without approval)", async () => {
  await withEnv({ NODE_ENV: "test", ALLOW_DEV_GOOGLE_TEST_TOKENS: "true", RENDER: undefined, RENDER_SERVICE_ID: undefined, VERCEL: undefined, VERCEL_ENV: undefined }, async () => {
    const plain = "dev_test_token:" + Buffer.from(JSON.stringify({ email: "brand-new@example.org", sub: "s1" })).toString("base64");
    const r = await google({ credential: plain });
    assert.notEqual(r.status, 401, "the explicit local opt-in path should work (proves the gate is the only switch)");
  });
});

test("unsigned JWT fallback is refused even when ALLOW_DEV_JWT_FALLBACK=true on a hosted runtime", async () => {
  const unsigned = "eyJhbGciOiJub25lIn0." + Buffer.from(JSON.stringify({ email: "owner@example.org" })).toString("base64url") + ".";
  await withEnv({ ALLOW_DEV_JWT_FALLBACK: "true", ALLOW_DEV_GOOGLE_TEST_TOKENS: "true", RENDER: "1", NODE_ENV: "development" }, async () => {
    const r = await google({ credential: unsigned });
    assert.equal(r.status, 401);
  });
});
