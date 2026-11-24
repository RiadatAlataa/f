/**
 * Security regression tests — Phase 1
 *
 * Every test runs against an ISOLATED, SYNTHETIC JSON database created in the OS temp directory.
 * No production data, no real credentials and no network services are used. All passwords and
 * reset codes are random values generated at runtime and are never printed.
 *
 * Run:  node --import tsx --test --test-force-exit test/security/phase1.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Isolated sandbox (must be configured BEFORE the server module is imported)
// ---------------------------------------------------------------------------
const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-p1-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");

for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";

const rnd = (n = 12) => crypto.randomBytes(n).toString("hex");
const strongPassword = () => `Aa1!${rnd(8)}`;

const PW = {
  admin: strongPassword(),
  volA: strongPassword(),
  employee: strongPassword()
};
const LEGACY_PLAIN_RESET_CODE = `RST-${rnd(10).toUpperCase()}`;
const LEGACY_PLAIN_PASSWORD = strongPassword();
const NOTIFICATION_SECRET_CODE = `RST-${rnd(10).toUpperCase()}`;

const syntheticDb = {
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false },
  homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [
    { id: "dep-1", nameAr: "الإدارة التنفيذية" },
    { id: "dep-4", nameAr: "إدارة المستفيدين" },
    { id: "dep-5", nameAr: "إدارة التطوع" }
  ],
  teams: [
    { id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" },
    { id: "team-b", nameAr: "فريق ب", departmentId: "dep-5", status: "active" }
  ],
  volunteers: [
    { id: "vol-a", name: "متطوع أ", nationalId: "1900000001", phone: "0500000001", teamId: "team-a", status: "active",
      passwordHash: bcrypt.hashSync(PW.volA, 4), mustChangePassword: false },
    { id: "vol-b", name: "متطوع ب", nationalId: "1900000002", phone: "0500000002", teamId: "team-b", status: "active",
      passwordHash: bcrypt.hashSync(strongPassword(), 4), mustChangePassword: false,
      // Legacy plain-text reset code (as stored before the fix)
      passwordResetToken: LEGACY_PLAIN_RESET_CODE, passwordResetExpiresAt: Date.now() + 3600_000 },
    { id: "vol-nopwd", name: "متطوع بلا كلمة مرور", nationalId: "1900000003", teamId: "team-a", status: "active", mustChangePassword: false },
    // Account still on the published shared default (stored as bcrypt hash)
    { id: "vol-default", name: "متطوع افتراضي", nationalId: "1900000004", teamId: "team-a", status: "active",
      passwordHash: bcrypt.hashSync("A123b456", 4), mustChangePassword: true },
    // Legacy plain-text credential (user-chosen, not a published default)
    { id: "vol-legacy", name: "متطوع قديم", nationalId: "1900000005", teamId: "team-a", status: "active",
      password: LEGACY_PLAIN_PASSWORD, mustChangePassword: false }
  ],
  beneficiaries: [
    { id: "ben-a", name: "مستفيد أ", nationalId: "1800000001", status: "approved", passwordHash: bcrypt.hashSync(strongPassword(), 4) },
    { id: "ben-b", name: "مستفيد ب", nationalId: "1800000002", status: "approved", passwordHash: bcrypt.hashSync(strongPassword(), 4) }
  ],
  employees: [],
  storekeepers: [],
  supportManagers: [],
  supportAgents: [],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", username: "admin", userName: "مدير اختبار", nationalId: "1700000001", role: "admin",
      primaryDepartmentId: "dep-1", permissions: ["super_admin", "all_permissions"], status: "active",
      passwordHash: bcrypt.hashSync(PW.admin, 4), mustChangePassword: false },
    { id: "perm-emp4", userId: "emp-4", username: "emp4", userName: "موظف مستفيدين", nationalId: "1700000004", role: "employee",
      primaryDepartmentId: "dep-4", allowedDepartmentIds: ["dep-4"], permissions: ["beneficiaries_view_list"], status: "active",
      passwordHash: bcrypt.hashSync(PW.employee, 4), mustChangePassword: false }
  ],
  passwordResetRequests: [
    { id: "prr-a", volunteerId: "vol-a", volunteerName: "متطوع أ", teamId: "team-a", status: "new", reason: "نسي كلمة المرور" },
    { id: "prr-b", volunteerId: "vol-b", volunteerName: "متطوع ب", teamId: "team-b", status: "reset_link_sent",
      resetToken: LEGACY_PLAIN_RESET_CODE, resetTokenExpiresAt: Date.now() + 3600_000 }
  ],
  notifications: [
    { id: "not-secret", userId: "vol-b", type: "password_reset_token", token: NOTIFICATION_SECRET_CODE,
      bodyAr: `كود: ${NOTIFICATION_SECRET_CODE}`, targetUserId: "all" }
  ],
  supportTickets: [
    { id: "t-a", category: "team_volunteer", volunteerId: "vol-a", requesterId: "vol-a", teamId: "team-a", ticketNumber: "TA" },
    { id: "t-b", category: "team_volunteer", volunteerId: "vol-b", requesterId: "vol-b", teamId: "team-b", ticketNumber: "TB" }
  ],
  initiatives: [], requests: [], logs: [], accessAuditLogs: [], activeSessions: []
};
fs.writeFileSync(dbPath, JSON.stringify(syntheticDb), "utf8");

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------
let server: http.Server;
let baseUrl = "";
let core: any;
const tokens: Record<string, string> = {};

const SECRET_FIELD_RX = /"(password|passwordHash|tempPassword|resetToken|passwordResetToken|passwordResetTokenHash|resetTokenHash|pinHash|deviceSecretHash|codeHash)"\s*:/;

async function call(method: string, urlPath: string, opts: { token?: string; body?: any; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", ...(opts.headers || {}) };
  if (opts.token) headers["x-session-token"] = opts.token;
  const res = await fetch(baseUrl + urlPath, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function assertNoSecrets(text: string, label: string) {
  assert.ok(!SECRET_FIELD_RX.test(text), `${label}: response contains a secret field name`);
  assert.ok(!text.includes(LEGACY_PLAIN_RESET_CODE), `${label}: response leaks a reset code`);
}

before(async () => {
  core = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;

  tokens.admin = core.createServerSession({ id: "admin-user", userId: "admin-user", name: "مدير اختبار", nationalId: "1700000001", role: "admin" }, "admin").token;
  tokens.emp4 = core.createServerSession({ id: "emp-4", userId: "emp-4", name: "موظف", nationalId: "1700000004", role: "employee", primaryDepartmentId: "dep-4" }, "employee").token;
  tokens.leaderA = core.createServerSession({ id: "leader-team-a", name: "قائد أ", role: "leader", teamId: "team-a" }, "leader").token;
  tokens.volA = core.createServerSession({ id: "vol-a", name: "متطوع أ", nationalId: "1900000001", role: "volunteer", teamId: "team-a" }, "volunteer").token;
  tokens.benA = core.createServerSession({ id: "ben-a", name: "مستفيد أ", nationalId: "1800000001", role: "beneficiary" }, "beneficiary").token;
});

after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

// ---------------------------------------------------------------------------
// 1-2. Password-reset requests: no public access, no codes via the API
// ---------------------------------------------------------------------------
test("anonymous visitor cannot list password-reset requests", async () => {
  const r = await call("GET", "/api/db/passwordResetRequests");
  assert.equal(r.status, 401);
  assert.ok(!r.text.includes(LEGACY_PLAIN_RESET_CODE));
});

test("forged admin headers without a session do not unlock password-reset requests", async () => {
  const r = await call("GET", "/api/db/passwordResetRequests", {
    headers: { "x-user-role": "admin", "x-user-id": "admin-user", "x-department-id": "dep-1" }
  });
  assert.equal(r.status, 401);
});

test("volunteer cannot list password-reset requests", async () => {
  const r = await call("GET", "/api/db/passwordResetRequests", { token: tokens.volA });
  assert.equal(r.status, 403);
});

test("leader sees only own-team requests and never a reset code", async () => {
  const r = await call("GET", "/api/db/passwordResetRequests?teamId=team-b", { token: tokens.leaderA });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.json));
  assert.ok(r.json.every((x: any) => x.teamId === "team-a"), "leader received another team's request");
  assertNoSecrets(r.text, "leader list");
});

test("admin list never contains reset codes", async () => {
  const r = await call("GET", "/api/db/passwordResetRequests", { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.equal(r.json.length, 2);
  assertNoSecrets(r.text, "admin list");
});

test("anonymous visitor cannot submit password-reset requests", async () => {
  const r = await call("POST", "/api/db/passwordResetRequests/submit", { body: { volunteerId: "vol-a", reason: "x" } });
  assert.equal(r.status, 401);
});

test("leader cannot submit a reset request for another team's volunteer", async () => {
  const r = await call("POST", "/api/db/passwordResetRequests/submit", { token: tokens.leaderA, body: { volunteerId: "vol-b", reason: "x" } });
  assert.equal(r.status, 403);
});

// ---------------------------------------------------------------------------
// 3-4. Role / identity spoofing via headers
// ---------------------------------------------------------------------------
test("x-user-role cannot escalate a volunteer to admin", async () => {
  const r = await call("GET", "/api/db", { token: tokens.volA, headers: { "x-user-role": "admin", "x-department-id": "dep-1" } });
  assert.equal(r.status, 200);
  assert.equal(r.json.currentUserContext?.role, "volunteer");
  assert.equal(r.json.currentUserContext?.isSuperAdmin, false);
  assert.deepEqual(r.json.beneficiaries, []);
});

test("x-user-role / x-user-id without a session grant nothing", async () => {
  const r = await call("GET", "/api/db", { headers: { "x-user-role": "admin", "x-user-id": "admin-user" } });
  assert.equal(r.status, 200);
  assert.equal(r.json.currentUserContext?.isAuthenticated, false);
  assert.deepEqual(r.json.volunteers, []);
  assert.deepEqual(r.json.beneficiaries, []);
});

test("x-user-id / query parameters cannot read another volunteer's tickets", async () => {
  const r = await call("GET", "/api/support/team-tickets?volunteerId=vol-b&requesterId=vol-b&userRole=admin", {
    token: tokens.volA,
    headers: { "x-user-id": "vol-b", "x-user-role": "admin" }
  });
  assert.equal(r.status, 200);
  const ids = r.json.map((t: any) => t.id);
  assert.deepEqual(ids, ["t-a"]);
});

test("forged role in body cannot perform a volunteer transfer", async () => {
  const r = await call("POST", "/api/db/requests/action", {
    body: { requestId: "none", action: "transfer", userRole: "admin" },
    headers: { "x-user-role": "admin" }
  });
  assert.equal(r.status, 401);
});

test("team card template cannot be changed for another team via forged body fields", async () => {
  const r = await call("POST", "/api/db/team-card-template/save", {
    token: tokens.leaderA,
    body: { teamId: "team-b", template: { name: "x" }, userRole: "admin", leaderTeamId: "team-b" }
  });
  assert.equal(r.status, 403);
});

// ---------------------------------------------------------------------------
// 5-8. Data isolation
// ---------------------------------------------------------------------------
test("volunteer cannot read another volunteer's private data", async () => {
  const r = await call("GET", "/api/db", { token: tokens.volA });
  const other = (r.json.volunteers || []).find((v: any) => v.id === "vol-b");
  if (other) {
    assert.equal(other.phone, undefined);
    assert.equal(other.nationalId, undefined);
  }
  assertNoSecrets(r.text, "volunteer /api/db");
});

test("beneficiary only receives their own beneficiary record", async () => {
  const r = await call("GET", "/api/db", { token: tokens.benA });
  const ids = (r.json.beneficiaries || []).map((b: any) => b.id);
  assert.deepEqual(ids, ["ben-a"]);
});

test("employee of another department cannot act on password-reset requests", async () => {
  const r = await call("POST", "/api/db/passwordResetRequests/action", {
    token: tokens.emp4,
    body: { requestId: "prr-a", action: "send_reset_link" }
  });
  assert.ok(r.status === 401 || r.status === 403, `expected 401/403, got ${r.status}`);
});

test("non-admin cannot download the database backup", async () => {
  const r = await call("GET", "/api/db/backup", { token: tokens.volA });
  assert.ok(r.status === 401 || r.status === 403, `expected 401/403, got ${r.status}`);
});

// ---------------------------------------------------------------------------
// 9. Credentials: no empty / missing / default / master passwords
// ---------------------------------------------------------------------------
test("verifyPasswordAgainstHash rejects a missing stored credential", () => {
  assert.equal(core.verifyPasswordAgainstHash("anything", undefined), false);
  assert.equal(core.verifyPasswordAgainstHash("anything", ""), false);
  assert.equal(core.verifyPasswordAgainstHash("", "$2b$04$abcdefghijklmnopqrstuu"), false);
});

test("account without a stored password cannot log in", async () => {
  const r = await call("POST", "/api/db/auth/login", { body: { identifier: "1900000003", password: "A123b456" } });
  assert.notEqual(r.json?.status, "success");
  assert.ok(!r.json?.sessionToken);
});

test("hard-coded supervisor account no longer logs in without a password", async () => {
  const r = await call("POST", "/api/db/auth/login", { body: { identifier: "supervisor", password: rnd(6) } });
  assert.equal(r.status, 401);
  assert.ok(!r.json?.sessionToken);
});

test("former master/default credentials are rejected", async () => {
  for (const [identifier, password] of [["mosa", "mosa11"], ["operations", "123"], ["admin", "123"]]) {
    const r = await call("POST", "/api/db/auth/login", { body: { identifier, password } });
    assert.notEqual(r.json?.status, "success", `${identifier} logged in with a default credential`);
    assert.ok(!r.json?.sessionToken);
  }
});

test("valid credentials still work (no regression)", async () => {
  const r = await call("POST", "/api/db/auth/login", { body: { identifier: "1900000001", password: PW.volA } });
  assert.equal(r.json?.status, "success");
  assert.ok(typeof r.json?.sessionToken === "string" && r.json.sessionToken.length > 20);
  assertNoSecrets(r.text, "login response");
});

// ---------------------------------------------------------------------------
// 10. No plain-text password storage
// ---------------------------------------------------------------------------
test("creating a volunteer stores only a bcrypt hash", async () => {
  const chosen = strongPassword();
  const r = await call("POST", "/api/db/volunteers/add", {
    token: tokens.admin,
    body: { name: "متطوع جديد", nationalId: "1900000099", teamId: "team-a", password: chosen }
  });
  assert.ok(r.status === 200, `create volunteer failed with ${r.status}`);
  assertNoSecrets(r.text, "volunteer create response");
  const stored = core.readDb().volunteers.find((v: any) => v.nationalId === "1900000099");
  assert.ok(stored, "volunteer not stored");
  assert.equal(stored.password, undefined);
  assert.ok(String(stored.passwordHash).startsWith("$2"));
  assert.ok(!JSON.stringify(stored).includes(chosen));
});

// ---------------------------------------------------------------------------
// 11. No raw database in responses
// ---------------------------------------------------------------------------
test("endpoints that used to return the whole database now return a filtered view", async () => {
  const r = await call("POST", "/api/db/passwordResetRequests/submit", {
    token: tokens.leaderA, body: { volunteerId: "vol-a", reason: "اختبار" }
  });
  assert.equal(r.status, 200);
  assert.ok(r.json.db?.currentUserContext, "db payload is not the filtered view");
  assert.equal(r.json.db.currentUserContext.role, "leader");
  assert.deepEqual(r.json.db.beneficiaries, []);
  assertNoSecrets(r.text, "submit response");
  assert.ok(!r.text.includes(NOTIFICATION_SECRET_CODE), "another user's reset code leaked via notifications");
});

test("admin /api/db view does not leak reset codes of other users", async () => {
  const r = await call("GET", "/api/db", { token: tokens.admin });
  assert.equal(r.status, 200);
  assertNoSecrets(r.text, "admin /api/db");
  assert.ok(!r.text.includes(NOTIFICATION_SECRET_CODE));
});

// ---------------------------------------------------------------------------
// 14. Reset codes are hashed, single-use, and the new password is hashed
// ---------------------------------------------------------------------------
test("reset flow: code is stored hashed, works once, and the new password is hashed", async () => {
  const issue = await call("POST", "/api/db/passwordResetRequests/action", {
    token: tokens.admin, body: { requestId: "prr-a", action: "send_reset_link" }
  });
  assert.equal(issue.status, 200);
  assertNoSecrets(issue.text, "issue response");

  const dbNow = core.readDb();
  const volA = dbNow.volunteers.find((v: any) => v.id === "vol-a");
  assert.equal(volA.passwordResetToken, undefined, "plain-text code stored on the account");
  assert.ok(typeof volA.passwordResetTokenHash === "string" && volA.passwordResetTokenHash.length === 64);
  // The owner receives the code in their private notification.
  const note = dbNow.notifications.find((n: any) => n.userId === "vol-a" && n.type === "password_reset_token");
  assert.ok(note?.token, "owner did not receive a code");
  const code = note.token;
  assert.ok(!issue.text.includes(code), "issue response leaked the code");

  const newPassword = strongPassword();
  const ok = await call("POST", "/api/auth/reset-password-with-token", { body: { token: code, newPassword } });
  assert.equal(ok.status, 200);
  const after = core.readDb().volunteers.find((v: any) => v.id === "vol-a");
  assert.equal(after.password, undefined);
  assert.ok(core.verifyPasswordAgainstHash(newPassword, after.passwordHash));
  assert.equal(after.passwordResetTokenHash, undefined);

  const reuse = await call("POST", "/api/auth/reset-password-with-token", { body: { token: code, newPassword: strongPassword() } });
  assert.equal(reuse.status, 400, "reset code was accepted twice");
});

test("legacy plain-text reset code works once and is then wiped", async () => {
  const pw = strongPassword();
  const first = await call("POST", "/api/auth/reset-password-with-token", { body: { token: LEGACY_PLAIN_RESET_CODE, newPassword: pw } });
  assert.equal(first.status, 200);
  const volB = core.readDb().volunteers.find((v: any) => v.id === "vol-b");
  assert.equal(volB.passwordResetToken, undefined);
  assert.equal(volB.password, undefined);
  const again = await call("POST", "/api/auth/reset-password-with-token", { body: { token: LEGACY_PLAIN_RESET_CODE, newPassword: strongPassword() } });
  assert.equal(again.status, 400);
});

test("wrong reset codes are rejected", async () => {
  const r = await call("POST", "/api/auth/reset-password-with-token", { body: { token: `RST-${rnd(8)}`, newPassword: strongPassword() } });
  assert.equal(r.status, 400);
});

// ---------------------------------------------------------------------------
// 15. Logout really invalidates the session
// ---------------------------------------------------------------------------
test("logout invalidates the session server-side", async () => {
  const t = core.createServerSession({ id: "vol-a", name: "متطوع أ", nationalId: "1900000001", role: "volunteer", teamId: "team-a" }, "volunteer").token;
  const before = await call("GET", "/api/db", { token: t });
  assert.equal(before.json.currentUserContext?.isAuthenticated, true);
  await call("POST", "/api/db/auth/logout", { token: t });
  const afterLogout = await call("GET", "/api/db", { token: t });
  assert.equal(afterLogout.json.currentUserContext?.isAuthenticated, false);
});

// ---------------------------------------------------------------------------
// Completion of phase 1: authentication flows and password policy
// ---------------------------------------------------------------------------
test("change-password is no longer callable anonymously (was: set ANY account's password)", async () => {
  const r = await call("POST", "/api/db/auth/change-password", { body: { userId: "admin-user", newPassword: strongPassword() } });
  assert.equal(r.status, 401);
  // and the admin's password is unchanged
  const admin = core.readDb().userDepartmentAccess.find((u: any) => u.userId === "admin-user");
  assert.ok(core.verifyPasswordAgainstHash(PW.admin, admin.passwordHash));
});

test("change-password cannot target another account or bypass the current password", async () => {
  const r1 = await call("POST", "/api/db/auth/change-password", { token: tokens.volA, body: { userId: "admin-user", newPassword: strongPassword() } });
  assert.equal(r1.status, 403);
  const r2 = await call("POST", "/api/db/auth/change-password", { token: tokens.volA, body: { newPassword: strongPassword() } });
  assert.equal(r2.status, 403, "a normal session must use self-change-password with the current password");
});

test("Google simulated test tokens are refused without an explicit dev opt-in", async () => {
  const fake = "dev_test_token:" + Buffer.from(JSON.stringify({ email: "someone@example.org" })).toString("base64");
  const r = await call("POST", "/api/db/auth/google", { body: { credential: fake } });
  assert.equal(r.status, 401);
  assert.ok(!r.json?.sessionToken);
});

test("an account still on the published shared default gets no session and must reset", async () => {
  const r = await call("POST", "/api/db/auth/login", { body: { identifier: "1900000004", password: "A123b456" } });
  assert.equal(r.status, 403);
  assert.equal(r.json?.code, "PASSWORD_RESET_REQUIRED");
  assert.ok(!r.json?.sessionToken);
});

test("an account without any stored password is sent to verified setup", async () => {
  const r = await call("POST", "/api/db/auth/login", { body: { identifier: "1900000003", password: strongPassword() } });
  assert.equal(r.status, 403);
  assert.equal(r.json?.code, "PASSWORD_SETUP_REQUIRED");
});

test("a legacy plain-text password works once and forces an immediate change", async () => {
  const login = await call("POST", "/api/db/auth/login", { body: { identifier: "1900000005", password: LEGACY_PLAIN_PASSWORD } });
  assert.equal(login.json?.status, "success");
  assert.equal(login.json?.mustChangePassword, true);
  const t = login.json.sessionToken;

  const blocked = await call("POST", "/api/db/notifications/mark-read", { token: t, body: { notificationId: "x" } });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json?.code, "MUST_CHANGE_PASSWORD");

  const newPassword = strongPassword();
  const changed = await call("POST", "/api/db/auth/change-password", { token: t, body: { newPassword } });
  assert.equal(changed.status, 200);
  const rec = core.readDb().volunteers.find((v: any) => v.id === "vol-legacy");
  assert.equal(rec.password, undefined, "plain text kept after the change");
  assert.ok(core.verifyPasswordAgainstHash(newPassword, rec.passwordHash));

  const after = await call("POST", "/api/db/notifications/mark-read", { token: t, body: { notificationId: "x" } });
  assert.notEqual(after.json?.code, "MUST_CHANGE_PASSWORD");
});

test("published defaults are rejected as new passwords", () => {
  for (const p of ["A123b456", "mosa11", "123"]) {
    assert.equal(core.validatePasswordStrength(p).isValid, false, `${p.length}-char default accepted`);
  }
});

test("staff-created volunteers get a unique temporary password, never the shared default", async () => {
  const mk = async (nid: string) => call("POST", "/api/db/volunteers/add", {
    token: tokens.admin, body: { name: "متطوع " + nid, nationalId: nid, teamId: "team-a" }
  });
  const a = await mk("1900000201");
  const b = await mk("1900000202");
  assert.equal(a.status, 200);
  assert.ok(typeof a.json.temporaryPassword === "string" && a.json.temporaryPassword.length >= 12);
  assert.notEqual(a.json.temporaryPassword, b.json.temporaryPassword);
  const rec = core.readDb().volunteers.find((v: any) => v.nationalId === "1900000201");
  assert.equal(core.verifyPasswordAgainstHash("A123b456", rec.passwordHash), false);
  assert.equal(rec.mustChangePassword, true);
});

test("a volunteer record cannot be given a password hash or role through the edit payload", async () => {
  const r = await call("POST", "/api/db/volunteers/add", {
    token: tokens.admin,
    body: { id: "vol-a", name: "متطوع أ", passwordHash: "$2b$04$attackerattackerattackerattackerattackerattackerat", role: "admin" }
  });
  assert.equal(r.status, 200);
  const rec = core.readDb().volunteers.find((v: any) => v.id === "vol-a");
  assert.notEqual(rec.role, "admin");
  assert.ok(!String(rec.passwordHash).includes("attacker"));
});

test("legacy unauthenticated volunteer endpoints now refuse anonymous callers", async () => {
  const create = await call("POST", "/api/volunteers", { body: { name: "x", role: "admin" } });
  assert.equal(create.status, 401);
  const overwrite = await call("POST", "/api/volunteers", { body: { id: "vol-a", passwordHash: "x" } });
  assert.equal(overwrite.status, 401);
  const card = await call("POST", "/api/db/reissue-card", { body: { volunteerId: "vol-a" } });
  assert.equal(card.status, 401);
  const card2 = await call("POST", "/api/volunteers/vol-a/reissue-card", { body: {} });
  assert.equal(card2.status, 401);
});

test("a volunteer cannot reissue another volunteer's card", async () => {
  const r = await call("POST", "/api/db/reissue-card", { token: tokens.volA, body: { volunteerId: "vol-b" } });
  assert.equal(r.status, 403);
});

test("finance, HR, inventory and messaging settings refuse anonymous callers and volunteers", async () => {
  for (const [m, p] of [["GET", "/api/db/finance/all"], ["POST", "/api/db/finance/payroll/save"], ["POST", "/api/db/hr/employees/save"],
    ["GET", "/api/db/inventory"], ["GET", "/api/db/email-settings"], ["GET", "/api/whatsapp/settings"], ["GET", "/api/db/letters"]]) {
    const anon = await call(m, p, { body: m === "GET" ? undefined : {} });
    assert.equal(anon.status, 401, `${m} ${p} anonymous`);
    const vol = await call(m, p, { token: tokens.volA, body: m === "GET" ? undefined : {} });
    assert.equal(vol.status, 403, `${m} ${p} volunteer`);
  }
});
