/**
 * ROLLBACK COMPATIBILITY — runs the PREVIOUS server version (the PR base, i.e. current main) against
 * data shaped exactly as the NEW version writes it. Proves (or disproves) what survives a rollback.
 *
 * CI checks out the base commit into ./base and sets ROLLBACK_SERVER_PATH to its server-core.ts.
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

const SERVER_PATH = process.env.ROLLBACK_SERVER_PATH;
const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-rollback-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER", "GEMINI_API_KEY"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";

const rnd = (n = 8) => crypto.randomBytes(n).toString("hex");
const PW = { admin: `Aa1!${rnd()}`, vol: `Aa1!${rnd()}`, agent: `Aa1!${rnd()}`, keeper: `Aa1!${rnd()}` };
const NEW_SESSION_TOKEN = `sess_${Date.now()}_${rnd(32)}`;
const NEW_RESET_CODE = `RST-${rnd(12).toUpperCase()}`;
const hashResetCode = (c: string) => crypto.createHash("sha256").update("reyadat_reset_code_v1:" + c).digest("hex");

// Every field / record shape the NEW version can write during normal use.
fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }, { id: "dep-5", nameAr: "تطوع" }],
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" }],
  volunteers: [
    // password changed under the NEW version: bcrypt hash only, plain text removed, reset code stored hashed
    { id: "vol-new", name: "متطوع", nationalId: "1900000701", teamId: "team-a", status: "active", points: 0,
      passwordHash: bcrypt.hashSync(PW.vol, 4), mustChangePassword: false, temporaryPasswordActive: false,
      passwordResetTokenHash: hashResetCode(NEW_RESET_CODE), passwordResetExpiresAt: Date.now() + 3600_000, passwordResetAttempts: 0 }
  ],
  beneficiaries: [], employees: [],
  storekeepers: [{ id: "sk-new", name: "أمين", status: "active", passwordHash: bcrypt.hashSync(PW.keeper, 4) }],
  supportManagers: [],
  supportAgents: [{ id: "sa-new", name: "دعم", username: "agent_new", status: "active", passwordHash: bcrypt.hashSync(PW.agent, 4) }],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", username: "admin", userName: "مدير", userEmail: "owner@example.org", role: "admin",
      primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active", mustChangePassword: false,
      passwordHash: bcrypt.hashSync(PW.admin, 4),
      googleSignInApproved: true, googleSignInApprovedBy: "admin-user", googleSignInApprovedAt: new Date().toISOString(), googleSub: "google-sub-1" }
  ],
  passwordResetRequests: [{ id: "prr-1", volunteerId: "vol-new", teamId: "team-a", status: "superseded" },
    { id: "prr-2", volunteerId: "vol-new", teamId: "team-a", status: "reset_link_sent", resetTokenExpiresAt: Date.now() + 3600_000 }],
  passwordResetOtps: [{ id: "otp-1", email: "member@example.org", userId: "vol-new", codeHash: rnd(32), resetToken: `rtok_${rnd(24)}`,
    requestIdHash: rnd(32), expiresAt: Date.now() + 900_000, attempts: 0, maxAttempts: 5, used: false, verified: false }],
  notifications: [{ id: "n1", userId: "vol-new", type: "password_reset_token", token: NEW_RESET_CODE, read: false }],
  chatConversations: [{ id: "c1", type: "group", participantIds: ["vol-new", "admin-user"], name: "x" }],
  supportTickets: [{ id: "t1", requesterId: "guest-abc123", requesterRole: "guest", status: "new" }],
  activeSessions: [{ token: NEW_SESSION_TOKEN, userId: "vol-new", role: "volunteer", user: { id: "vol-new", name: "متطوع" },
    authMethod: "password", createdAt: Date.now(), lastActive: Date.now(), expiresAt: Date.now() + 86400_000, forcePasswordChange: true }],
  initiatives: [], requests: [], attendance: [], logs: [], accessAuditLogs: [{ id: "a1", action: "approve_google_signin", status: "allowed" }]
}), "utf8");

let server: http.Server;
let baseUrl = "";
let oldCore: any;

async function call(method: string, p: string, body?: any, headers: Record<string, string> = {}) {
  const res = await fetch(baseUrl + p, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}

before(async () => {
  assert.ok(SERVER_PATH && fs.existsSync(SERVER_PATH), "ROLLBACK_SERVER_PATH must point to the previous version's server-core.ts");
  oldCore = await import(SERVER_PATH!);
  oldCore.reloadDbFromDisk();
  server = http.createServer(oldCore.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

const report: string[] = [];
const note = (s: string) => { report.push(s); console.log(`ROLLBACK\t${s}`); };

test("previous version loads data written by the new version without errors", async () => {
  const r = await call("GET", "/api/db");
  assert.equal(r.status, 200);
  note("DB with new fields loads: OK");
});

test("bcrypt-only passwords written by the new version still work on the previous version", async () => {
  const vol = await call("POST", "/api/db/auth/login", { identifier: "1900000701", password: PW.vol });
  assert.equal(vol.json?.status, "success");
  const admin = await call("POST", "/api/db/auth/login", { identifier: "admin", password: PW.admin });
  assert.equal(admin.json?.status, "success");
  const keeper = await call("POST", "/api/db/auth/login", { identifier: "sk-new", password: PW.keeper });
  note(`volunteer=OK admin=OK storekeeper(hash-only)=${keeper.json?.status === "success" ? "OK" : "FAILS (" + keeper.status + ")"}`);
});

test("FINDING: support staff whose plain text was replaced by a hash cannot sign in on the previous version", async () => {
  const agent = await call("POST", "/api/db/auth/login", { identifier: "agent_new", password: PW.agent });
  note(`support agent (hash-only) on previous version: ${agent.json?.status === "success" ? "OK" : "LOCKED OUT (" + agent.status + ")"}`);
  // Documented effect (not a pass/fail of the new code): the old handler only reads `password`.
  assert.notEqual(agent.json?.status, "success");
  // and it must NOT open the account to an arbitrary password
  const wrong = await call("POST", "/api/db/auth/login", { identifier: "agent_new", password: `wrong-${rnd()}` });
  assert.notEqual(wrong.json?.status, "success", "previous version accepted ANY password for a hash-only support account");
});

test("sessions issued by the new version remain valid after rollback (forced-change flag is ignored)", async () => {
  const r = await call("GET", "/api/db", undefined, { "x-session-token": NEW_SESSION_TOKEN });
  assert.equal(r.json?.currentUserContext?.isAuthenticated, true);
  note("sessions survive rollback; forcePasswordChange is ignored by the previous version");
});

test("reset codes issued by the new version (stored hashed) are NOT usable on the previous version", async () => {
  const r = await call("POST", "/api/auth/reset-password-with-token", { token: NEW_RESET_CODE, newPassword: `Aa1!${rnd()}` });
  assert.notEqual(r.status, 200);
  note(`reset codes issued after deploy stop working after rollback (status ${r.status}) — must be re-issued`);
});

test("summary", () => {
  console.log("ROLLBACK-SUMMARY\t" + report.join(" | "));
});
