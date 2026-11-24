/**
 * Phase-1 closure tests: account enumeration in recovery, rate limiting that cannot be bypassed by
 * forging X-Forwarded-For, Google registration bound to a verified email, AI assistant abuse limits.
 * Isolated synthetic sandbox; random credentials generated at runtime and never printed.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-closure-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "GEMINI_API_KEY", "RESEND_API_KEY", "SMTP_HOST", "TRUSTED_PROXY_HOPS", "ALLOW_DEV_GOOGLE_TEST_TOKENS"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";
const CLIENT_ID = "test-client-id.apps.googleusercontent.com";
const rnd = (n = 8) => crypto.randomBytes(n).toString("hex");
const VOL_PW = `Aa1!${rnd()}`;

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }, { id: "dep-5", nameAr: "تطوع" }],
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" }],
  volunteers: [
    { id: "vol-mail", name: "متطوع ببريد", nationalId: "1900000301", email: "member@example.org", teamId: "team-a",
      status: "active", passwordHash: bcrypt.hashSync(VOL_PW, 4), mustChangePassword: false, points: 1 },
    { id: "vol-z", name: "متطوع آخر", nationalId: "1900000302", teamId: "team-a", status: "active", points: 9,
      passwordHash: bcrypt.hashSync(`Aa1!${rnd()}`, 4) }
  ],
  beneficiaries: [], employees: [], storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [], passwordResetRequests: [], passwordResetOtps: [], passwordResetTokens: [],
  notifications: [], supportTickets: [], initiatives: [], requests: [], attendance: [], logs: [], accessAuditLogs: [], activeSessions: []
}), "utf8");

// Google tokeninfo stub (this process only) — see google-auth.test.ts
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input?.url || String(input);
  if (url.startsWith("https://oauth2.googleapis.com/tokeninfo")) {
    const tok = new URL(url).searchParams.get("id_token") || "";
    if (!tok.startsWith("signed:")) return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400 });
    return new Response(Buffer.from(tok.slice(7), "base64url").toString("utf8"), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
}) as any;
const googleToken = (claims: Record<string, any>) => "signed:" + Buffer.from(JSON.stringify({
  aud: CLIENT_ID, email_verified: "true", exp: String(Math.floor(Date.now() / 1000) + 600), sub: "sub-" + rnd(), ...claims
})).toString("base64url");

let server: http.Server;
let baseUrl = "";
let core: any;

async function call(method: string, p: string, body?: any, headers: Record<string, string> = {}) {
  const res = await realFetch(baseUrl + p, {
    method, headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

// ---------------------------------------------------------------------------
// 1. Recovery does not reveal whether an account / email exists
// ---------------------------------------------------------------------------
const strip = (j: any) => { const { requestId, ...rest } = j || {}; return rest; };

test("forgot-password: identical answer for a registered and an unknown identifier, never the email", async () => {
  const known = await call("POST", "/api/db/auth/forgot-password", { identifier: "1900000301" }, { "x-forwarded-for": "198.51.100.1" });
  const unknown = await call("POST", "/api/db/auth/forgot-password", { identifier: "1999999999" }, { "x-forwarded-for": "198.51.100.2" });
  assert.equal(known.status, unknown.status);
  assert.deepEqual(strip(known.json), strip(unknown.json));
  assert.ok(typeof known.json.requestId === "string" && typeof unknown.json.requestId === "string");
  assert.ok(!known.text.includes("member@example.org") && !known.text.includes("•••"), "email (or a mask) leaked");
});

test("identify: identical answer for registered / unknown identifiers (no masked contact data)", async () => {
  const a = await call("POST", "/api/db/auth/forgot-password/identify", { identifier: "1900000301" });
  const b = await call("POST", "/api/db/auth/forgot-password/identify", { identifier: "1999999999" });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, b.json);
  assert.ok(!a.text.includes("member@") && !a.text.includes("@example.org"));
});

test("send-otp: identical answer for registered / unknown identifiers", async () => {
  const a = await call("POST", "/api/db/auth/forgot-password/send-otp", { identifier: "1900000301", channel: "email" }, { "x-forwarded-for": "198.51.100.3" });
  const b = await call("POST", "/api/db/auth/forgot-password/send-otp", { identifier: "1999999999", channel: "email" }, { "x-forwarded-for": "198.51.100.4" });
  assert.equal(a.status, b.status);
  assert.deepEqual(a.json, b.json);
});

test("request-link: identical answer for a registered and an unknown email", async () => {
  const a = await call("POST", "/api/db/auth/forgot-password/request-link", { email: "member@example.org" }, { "x-forwarded-for": "198.51.100.5" });
  const b = await call("POST", "/api/db/auth/forgot-password/request-link", { email: "nobody@example.org" }, { "x-forwarded-for": "198.51.100.6" });
  assert.equal(a.status, b.status);
  assert.deepEqual(a.json, b.json);
});

test("verify-otp: unknown account, no request and wrong code all give the same message", async () => {
  await sleep(200); // let background OTP issuance from the previous tests finish
  const unknown = await call("POST", "/api/db/auth/forgot-password/verify-otp", { identifier: "1999999999", otpCode: "123456" });
  const wrong = await call("POST", "/api/db/auth/forgot-password/verify-otp", { identifier: "1900000301", otpCode: "000000" });
  assert.equal(unknown.status, wrong.status);
  assert.equal(unknown.json?.error, wrong.json?.error);
  assert.equal(unknown.json?.remainingAttempts, undefined);
  const legacyUnknown = await call("POST", "/api/db/auth/verify-otp", { email: "nobody@example.org", otpCode: "123456" });
  const legacyWrong = await call("POST", "/api/db/auth/verify-otp", { requestId: "rq_" + rnd(), otpCode: "123456" });
  assert.equal(legacyUnknown.json?.error, legacyWrong.json?.error);
});

// ---------------------------------------------------------------------------
// 4. Rate limits cannot be bypassed by forging X-Forwarded-For
// ---------------------------------------------------------------------------
test("forged left-most X-Forwarded-For entries do not change the client identity used for limits", () => {
  const ipA = core.resolveTrustedClientIp({ headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.9" }, socket: { remoteAddress: "10.0.0.2" } });
  const ipB = core.resolveTrustedClientIp({ headers: { "x-forwarded-for": "8.8.8.8, 9.9.9.9, 203.0.113.9" }, socket: { remoteAddress: "10.0.0.2" } });
  assert.equal(ipA, "203.0.113.9");
  assert.equal(ipB, "203.0.113.9");
});

test("login attempts are limited per account even when every request forges a new IP", async () => {
  let limited = false;
  for (let i = 0; i < 40; i++) {
    const r = await call("POST", "/api/db/auth/login", { identifier: "1900000302", password: `wrong-${i}` },
      { "x-forwarded-for": `${10 + (i % 200)}.${i}.${i}.${i}` });
    if (r.status === 429) { limited = true; break; }
  }
  assert.ok(limited, "per-account limit never triggered under IP rotation");
});

test("the correct password is still accepted for a different, non-throttled account", async () => {
  const r = await call("POST", "/api/db/auth/login", { identifier: "1900000301", password: VOL_PW });
  assert.equal(r.json?.status, "success");
});

// ---------------------------------------------------------------------------
// 3. Google registration is bound to the email Google verified
// ---------------------------------------------------------------------------
test("Google registration without a server-issued ticket is refused (body email is not trusted)", async () => {
  const r = await call("POST", "/api/db/auth/google/complete-registration", {
    accountType: "volunteer", googleEmail: "someone-else@example.org", name: "اسم تجريبي", nationalId: "1900000399",
    phone: "0500000399", agreedToTerms: true
  });
  assert.equal(r.status, 401);
  assert.equal(r.json?.code, "GOOGLE_VERIFICATION_REQUIRED");
});

test("Google registration uses ONLY the verified email from the ticket, and the ticket is single-use", async () => {
  const g = await call("POST", "/api/db/auth/google", { credential: googleToken({ email: "newcomer@example.org" }) });
  assert.equal(g.json?.status, "new_google_user");
  const ticket = g.json.registrationTicket;
  assert.ok(typeof ticket === "string" && ticket.length > 20);
  const reg = await call("POST", "/api/db/auth/google/complete-registration", {
    accountType: "volunteer", registrationTicket: ticket, googleEmail: "victim@example.org",
    name: "منضم جديد", nationalId: "1900000398", phone: "0500000398", agreedToTerms: true
  });
  assert.equal(reg.status, 200);
  const created = core.readDb().volunteers.find((v: any) => v.nationalId === "1900000398");
  assert.equal(created.email, "newcomer@example.org", "registration used the body email instead of the verified one");
  assert.equal(created.status, "pending");
  const again = await call("POST", "/api/db/auth/google/complete-registration", {
    accountType: "volunteer", registrationTicket: ticket, name: "مرة ثانية", nationalId: "1900000397", phone: "0500000397", agreedToTerms: true
  });
  assert.equal(again.status, 401, "ticket reused");
});

// ---------------------------------------------------------------------------
// 5. Website assistant: size and rate limits, identity from the session
// ---------------------------------------------------------------------------
test("AI assistant rejects oversized prompts", async () => {
  const r = await call("POST", "/api/ai/chat", { prompt: "x".repeat(5000) }, { "x-forwarded-for": "192.0.2.50" });
  assert.equal(r.status, 413);
});

test("AI assistant rate-limits a guest even when the client forges new left-most IPs", async () => {
  let limited = false;
  for (let i = 0; i < 15; i++) {
    const r = await call("POST", "/api/ai/chat", { prompt: "مرحبا" }, { "x-forwarded-for": `${i}.1.1.1, 192.0.2.77` });
    if (r.status === 429) { limited = true; break; }
  }
  assert.ok(limited, "guest rate limit never triggered");
});
