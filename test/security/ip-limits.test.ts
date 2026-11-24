/**
 * Two-tier client limits (fix for the shared-address risk). Runs against the real server in an isolated
 * sandbox. Production topology is NOT assumed: a "shared egress" is modelled exactly as it reaches the
 * app through a rewrite/proxy — X-Forwarded-For "<visitor>, <egress>" with the default TRUSTED_PROXY_HOPS=1 —
 * and forged entries are added on the left, where a client can write them.
 *
 * Proves: (1) hundreds of visitors behind ONE egress are not blocked by a site-wide cap; (2) forging
 * X-Forwarded-For never yields more password guesses or more recovery codes per account; (3) the flood
 * ceiling on the unforgeable address still bounds a forger; (4) the topology report exposes counts only.
 * Synthetic data only; random credentials generated at runtime and never printed.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-iplimits-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "GEMINI_API_KEY", "RESEND_API_KEY", "SMTP_HOST", "TRUSTED_PROXY_HOPS", "ALLOW_DEV_GOOGLE_TEST_TOKENS", "AI_CHAT_DAILY_CAP"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";
const rnd = (n = 8) => crypto.randomBytes(n).toString("hex");
const VICTIM_PW = `Aa1!${rnd()}`;
const VICTIM2_PW = `Aa1!${rnd()}`;

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }, { id: "dep-5", nameAr: "تطوع" }],
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" }],
  volunteers: [
    { id: "vol-mail", name: "متطوع ببريد", nationalId: "1900000501", email: "member@example.org", teamId: "team-a", status: "active",
      passwordHash: bcrypt.hashSync(`Aa1!${rnd()}`, 4) },
    { id: "vol-target", name: "هدف", nationalId: "1900000502", teamId: "team-a", status: "active", passwordHash: bcrypt.hashSync(`Aa1!${rnd()}`, 4) },
    { id: "vol-victim", name: "مستخدم", nationalId: "1900000503", teamId: "team-a", status: "active", passwordHash: bcrypt.hashSync(VICTIM_PW, 4) },
    { id: "vol-victim2", name: "مستخدم ٢", nationalId: "1900000504", teamId: "team-a", status: "active", passwordHash: bcrypt.hashSync(VICTIM2_PW, 4) }
  ],
  beneficiaries: [], employees: [], storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [{ id: "perm-admin", userId: "admin-user", userName: "مدير", role: "admin", primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active" }],
  passwordResetRequests: [], passwordResetOtps: [], notifications: [], supportTickets: [],
  initiatives: [], requests: [], attendance: [], logs: [], accessAuditLogs: [], activeSessions: [], volunteerApplications: []
}), "utf8");

let server: http.Server;
let baseUrl = "";
let core: any;

async function call(method: string, p: string, body?: any, headers: Record<string, string> = {}) {
  const res = await fetch(baseUrl + p, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
// A visitor behind a shared egress, as the app receives it (hops = 1).
const via = (visitor: string, egress: string) => ({ "x-forwarded-for": `${visitor}, ${egress}` });
const visitorIp = (i: number) => `198.18.${(i >> 8) & 255}.${i & 255}`;

before(async () => {
  core = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

// ---------------------------------------------------------------------------------------------
test("identity: forged left entries never change the trusted address; they only select a visitor bucket", () => {
  const r = (xff: string) => core.resolveClientNetwork({ headers: { "x-forwarded-for": xff }, socket: { remoteAddress: "10.0.0.1" } });
  const a = r("198.51.100.7");
  const b = r("6.6.6.6, 198.51.100.7");
  assert.equal(a.trustedIp, "198.51.100.7");
  assert.equal(b.trustedIp, "198.51.100.7", "a forged entry changed the trusted address");
  assert.notEqual(a.visitorKey, b.visitorKey);
  assert.equal(r("not-an-ip, 198.51.100.7").claimedIp, null);
});

test("300 distinct visitors behind ONE shared egress can each use sign-in, recovery, registration and the assistant", async () => {
  const EGRESS = "76.76.21.21";
  const blocked: Record<string, number> = {};
  const hit = (k: string, s: number) => { if (s === 429) blocked[k] = (blocked[k] || 0) + 1; };
  for (let i = 0; i < 300; i++) {
    const h = via(visitorIp(i), EGRESS);
    hit("login", (await call("POST", "/api/db/auth/login", { identifier: `no-such-user-${i}`, password: `x-${i}` }, h)).status);
    hit("forgot-password", (await call("POST", "/api/db/auth/forgot-password", { identifier: `1999${String(i).padStart(6, "0")}` }, h)).status);
    hit("identify", (await call("POST", "/api/db/auth/forgot-password/identify", { identifier: `1999${String(i).padStart(6, "0")}` }, h)).status);
    hit("send-otp", (await call("POST", "/api/db/auth/forgot-password/send-otp", { identifier: `1999${String(i).padStart(6, "0")}` }, h)).status);
    hit("request-link", (await call("POST", "/api/db/auth/forgot-password/request-link", { email: `nobody${i}@example.org` }, h)).status);
    hit("volunteer-application", (await call("POST", "/api/db/volunteerApplications/submit", {}, h)).status);
    hit("assistant", (await call("POST", "/api/ai/chat", { prompt: "مرحبا" }, h)).status);
  }
  assert.deepEqual(blocked, {}, `legitimate visitors were blocked by a shared cap: ${JSON.stringify(blocked)}`);
});

test("forging X-Forwarded-For gives no extra password guesses: per-account budget holds behind an egress and when sent directly", async () => {
  // (a) behind one egress, a new forged visitor address on every request
  let wrong = 0, limited = false;
  for (let i = 0; i < 60 && !limited; i++) {
    const r = await call("POST", "/api/db/auth/login", { identifier: "1900000502", password: `guess-${i}` }, via(`${10 + (i % 200)}.${i}.1.1`, "76.76.21.30"));
    if (r.status === 429) limited = true; else wrong++;
  }
  assert.ok(limited, "per-account limit never triggered");
  assert.ok(wrong <= 30, `${wrong} guesses accepted for evaluation (ceiling 30)`);
  // (b) sent directly with a different single forged entry each time (each looks like a new client)
  let more = 0;
  for (let i = 0; i < 20; i++) {
    const r = await call("POST", "/api/db/auth/login", { identifier: "1900000502", password: `guess2-${i}` }, { "x-forwarded-for": `${20 + i}.${i}.2.2` });
    if (r.status !== 429) more++;
  }
  assert.equal(more, 0, "rotating the trusted address itself bought more guesses");
});

test("the real user is not locked out by an attacker who does not know their visitor address", async () => {
  const EGRESS = "76.76.21.31";
  const me = via("203.0.113.5", EGRESS);
  assert.equal((await call("POST", "/api/db/auth/login", { identifier: "1900000503", password: VICTIM_PW }, me)).json?.status, "success");
  for (let i = 0; i < 45; i++) {
    await call("POST", "/api/db/auth/login", { identifier: "1900000503", password: `guess-${i}` }, via(`100.${i}.3.3`, EGRESS));
  }
  const stranger = await call("POST", "/api/db/auth/login", { identifier: "1900000503", password: VICTIM_PW }, via("100.250.3.3", EGRESS));
  assert.equal(stranger.status, 429, "unknown sources must stay throttled during the attack");
  const legit = await call("POST", "/api/db/auth/login", { identifier: "1900000503", password: VICTIM_PW }, me);
  assert.equal(legit.json?.status, "success", "the real user was locked out");
});

test("even forging the real user's own visitor address, guesses stay bounded (2 × 30 per window)", async () => {
  const EGRESS = "76.76.21.32";
  const me = via("203.0.113.6", EGRESS);
  assert.equal((await call("POST", "/api/db/auth/login", { identifier: "1900000504", password: VICTIM2_PW }, me)).json?.status, "success");
  let evaluated = 0;
  for (let i = 0; i < 150; i++) {
    // alternate: the victim's exact header (forged), a fresh forged visitor, and a fresh direct address
    const h = i % 3 === 0 ? me : i % 3 === 1 ? via(`101.${i}.4.4`, EGRESS) : { "x-forwarded-for": `102.${i}.4.4` };
    const r = await call("POST", "/api/db/auth/login", { identifier: "1900000504", password: `guess-${i}` }, h);
    if (r.status !== 429) evaluated++;
  }
  assert.ok(evaluated <= 60, `${evaluated} guesses evaluated (bound is 60)`);
});

test("forging addresses cannot mint more than 5 recovery codes per account per hour", async () => {
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const r = await call("POST", "/api/db/auth/forgot-password", { identifier: "1900000501" }, via(`172.30.${i}.1`, "76.76.21.33"));
    assert.equal(r.status, 200);
    await new Promise((res) => setTimeout(res, 20));
    for (const o of core.readDb().passwordResetOtps || []) if (o && o.userId === "vol-mail") seen.add(o.id);
  }
  assert.ok(seen.size >= 1 && seen.size <= 5, `${seen.size} codes issued for one account`);
});

test("the flood ceiling on the unforgeable address bounds a forger rotating visitor addresses", async () => {
  const EGRESS = "76.76.21.34";
  const ceiling = core.NETWORK_LIMITS.forgotPassword.flood;
  let allowed = 0, limited = false;
  for (let i = 0; i < ceiling + 5 && !limited; i++) {
    const r = await call("POST", "/api/db/auth/forgot-password", { identifier: `1998${String(i).padStart(6, "0")}` }, via(visitorIp(i), EGRESS));
    if (r.status === 429) limited = true; else allowed++;
  }
  assert.ok(limited, "flood ceiling never triggered");
  assert.ok(allowed <= ceiling, `${allowed} requests passed (ceiling ${ceiling})`);
  // another egress is unaffected
  const other = await call("POST", "/api/db/auth/forgot-password", { identifier: "1998999999" }, via("198.19.0.1", "76.76.21.35"));
  assert.equal(other.status, 200);
});

test("assistant: per visitor limit, per-egress ceiling for forgers", async () => {
  const one = via("203.0.113.77", "76.76.21.36");
  let firstLimitedAt = -1;
  for (let i = 0; i < 15 && firstLimitedAt < 0; i++) {
    if ((await call("POST", "/api/ai/chat", { prompt: "مرحبا" }, one)).status === 429) firstLimitedAt = i;
  }
  assert.equal(firstLimitedAt, core.NETWORK_LIMITS.aiGuest.visitor, "per-visitor assistant limit not applied");
  const EGRESS = "76.76.21.37";
  const ceiling = core.NETWORK_LIMITS.aiGuest.flood;
  let allowed = 0, limited = false;
  for (let i = 0; i < ceiling + 5 && !limited; i++) {
    const r = await call("POST", "/api/ai/chat", { prompt: "مرحبا" }, via(visitorIp(i), EGRESS));
    if (r.status === 429) limited = true; else allowed++;
  }
  assert.ok(limited && allowed <= ceiling, `forger passed ${allowed} messages (ceiling ${ceiling})`);
});

test("topology report: admin only, counts only (no address in the response)", async () => {
  assert.equal((await call("GET", "/api/admin/security/network-topology")).status, 401);
  const vol = core.createServerSession({ id: "vol-mail", name: "متطوع", role: "volunteer", nationalId: "1900000501", teamId: "team-a" }, "volunteer").token;
  assert.equal((await call("GET", "/api/admin/security/network-topology", undefined, { "x-session-token": vol })).status, 403);
  const admin = core.createServerSession({ id: "admin-user", userId: "admin-user", name: "مدير", role: "admin" }, "admin").token;
  const r = await call("GET", "/api/admin/security/network-topology", undefined, { "x-session-token": admin });
  assert.equal(r.status, 200);
  assert.ok(r.json.forwardedForEntriesHistogram["2"] > 0, "requests through an egress were not counted");
  assert.ok(r.json.currentHour.maxDistinctVisitorsBehindOneTrustedAddress >= 300);
  assert.ok(!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(r.text), "an IP address appears in the report");
});
