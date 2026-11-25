/**
 * FINAL REVIEW (evidence) — password storage per ACCOUNT TYPE, through the real HTTP API, synthetic data.
 * For every type that can sign in:
 *   1. a legacy plain-text password signs in once and forces a change;
 *   2. the forced change (UI route /api/db/auth/change-password) makes the NEW password work and the OLD fail;
 *   3. stored credential fields are bcrypt only; no plain text anywhere in the data file;
 *   4. the self-service change (/api/db/auth/self-change-password) behaves the same;
 *   5. published defaults ("123", "mosa11", "A123b456") never yield a session, stored as plain text or hashed.
 * Also: the two creation paths found in review (team-application approval, public beneficiary registration).
 * Prints "PWTYPE" lines (no secrets). Credentials are random per run and never printed.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-final-pw-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "GEMINI_API_KEY", "RESEND_API_KEY", "SMTP_HOST", "TRUSTED_PROXY_HOPS", "ALLOW_DEV_GOOGLE_TEST_TOKENS"]) delete process.env[k];
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";
const rnd = (n = 6) => crypto.randomBytes(n).toString("hex");
const strong = (tag: string) => `Pw${tag}9!${rnd()}`;

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }, { id: "dep-2", nameAr: "مالية" }, { id: "dep-5", nameAr: "تطوع" },
    { id: "dep-9", nameAr: "موارد", directorName: "مدير الموارد للاختبار", nationalId: "1700000102", status: "active" },
    { id: "dep-8", nameAr: "مستودعات", directorName: "مدير المستودعات للاختبار", status: "active", passwordHash: bcrypt.hashSync("DirectorPw9!" + "x", 4) }],
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" },
    { id: "team-pwt", nameAr: "فريق اختبار", name: "pwtteam", leaderName: "pwt_leader", departmentId: "dep-5", status: "active" }],
  volunteers: [{ id: "pwt-vol", name: "متطوع اختبار", nationalId: "1700000104", teamId: "team-a", status: "active" }],
  beneficiaries: [{ id: "pwt-ben", name: "مستفيد اختبار", nationalId: "1700000105", status: "approved" }],
  employees: [{ id: "pwt-emp", name: "موظف ميداني اختبار", nationalId: "1700000101", status: "active", departmentId: "dep-5" },
    { id: "esc-emp", name: "موظف تصعيد", nationalId: "1700000201", status: "active", departmentId: "dep-2" }],
  storekeepers: [{ id: "pwt-sk", name: "حارس اختبار", nationalId: "1700000103", status: "active" },
    { id: "esc-sk", name: "حارس تصعيد", nationalId: "1700000203", status: "active" }],
  supportManagers: [{ id: "pwt-sm", name: "مدير دعم", username: "pwt_sm", role: "support_manager", status: "active" }],
  supportAgents: [{ id: "pwt-sa", name: "دعم", username: "pwt_sa", role: "support_agent", status: "active", managerId: "pwt-sm" }],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", username: "admin", userName: "مدير", role: "admin", primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active" },
    { id: "perm-ops", userId: "ops-manager", username: "ops", userName: "مدير العمليات", role: "operations_manager", primaryDepartmentId: "dep-1", permissions: ["operations_manager"], status: "active" },
    { id: "perm-pwt-uda", userId: "pwt-uda", username: "pwt_uda", userName: "موظف نظام", role: "employee", primaryDepartmentId: "dep-2",
      allowedDepartmentIds: ["dep-2"], permissions: ["view_department"], status: "active" }
  ],
  teamApplications: [{ id: "tapp-1", teamName: "فريق جديد", leaderName: "قائد جديد", leaderPhone: "0551234567",
    leaderNationalId: "1700000199", leaderEmail: "new.leader@example.org", status: "pending", targetDepartment: "dep-5" }],
  passwordResetRequests: [], passwordResetOtps: [], notifications: [], supportTickets: [], initiatives: [], requests: [],
  attendance: [], logs: [], accessAuditLogs: [], activeSessions: [], volunteerApplications: []
}), "utf8");

let server: http.Server;
let baseUrl = "";
let core: any;
let ipSeq = 1;
async function call(method: string, p: string, body?: any, headers: Record<string, string> = {}) {
  const res = await fetch(baseUrl + p, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.${(ipSeq >> 8) & 255}.${ipSeq++ & 255}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const login = (identifier: string, password: string) => call("POST", "/api/db/auth/login", { identifier, password });
const ok = (r: any) => r.json?.status === "success";
const isBcrypt = (v: any) => typeof v === "string" && /^\$2[aby]\$\d{2}\$/.test(v);
const CRED_FIELDS = ["password", "passwordHash"];

type T = { type: string; coll: string; find: (r: any) => boolean; identifier: string };
const TYPES: T[] = [
  { type: "admin", coll: "userDepartmentAccess", find: (r) => r.userId === "admin-user", identifier: "admin" },
  { type: "operations_manager", coll: "userDepartmentAccess", find: (r) => r.userId === "ops-manager", identifier: "ops" },
  { type: "system_employee(userDepartmentAccess)", coll: "userDepartmentAccess", find: (r) => r.userId === "pwt-uda", identifier: "pwt_uda" },
  { type: "department_director", coll: "departments", find: (r) => r.id === "dep-9", identifier: "dep-9" },
  { type: "employee", coll: "employees", find: (r) => r.id === "pwt-emp", identifier: "1700000101" },
  { type: "storekeeper", coll: "storekeepers", find: (r) => r.id === "pwt-sk", identifier: "1700000103" },
  { type: "volunteer", coll: "volunteers", find: (r) => r.id === "pwt-vol", identifier: "1700000104" },
  { type: "team_leader", coll: "teams", find: (r) => r.id === "team-pwt", identifier: "pwt_leader" },
  { type: "beneficiary", coll: "beneficiaries", find: (r) => r.id === "pwt-ben", identifier: "1700000105" },
  { type: "support_manager", coll: "supportManagers", find: (r) => r.id === "pwt-sm", identifier: "pwt_sm" },
  { type: "support_agent", coll: "supportAgents", find: (r) => r.id === "pwt-sa", identifier: "pwt_sa" }
];

function record(t: T) { return (core.readDb()[t.coll] || []).find(t.find); }
function setCred(t: T, fields: Record<string, string | undefined>) {
  const db = core.readDb();
  const rec = (db[t.coll] || []).find(t.find);
  for (const f of CRED_FIELDS) delete rec[f];
  delete rec.mustChangePassword;
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) rec[k] = v;
  core.writeDb(db);
}
const dbText = () => fs.readFileSync(dbPath, "utf8");

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

for (const t of TYPES) {
  test(`password lifecycle: ${t.type}`, async () => {
    const r: Record<string, string> = {};
    const L = strong("L"), N = strong("N"), N2 = strong("S");
    // 1. legacy plain text → one sign-in + forced change
    setCred(t, { password: L });
    const first = await login(t.identifier, L);
    r.legacySignIn = ok(first) ? "ok" : `fail(${first.status})`;
    r.forced = ok(first) && first.json.mustChangePassword === true ? "yes" : "no";
    // 2. forced change via the UI route
    if (ok(first)) {
      const ch = await call("POST", "/api/db/auth/change-password", { newPassword: N }, { "x-session-token": first.json.sessionToken });
      r.forcedChange = String(ch.status);
    }
    const newWorks = ok(await login(t.identifier, N));
    const oldWorks = ok(await login(t.identifier, L));
    r.newWorks = newWorks ? "yes" : "NO"; r.oldRefused = oldWorks ? "NO" : "yes";
    // 3. storage
    const rec = record(t);
    const present = CRED_FIELDS.filter((f) => rec[f] !== undefined);
    r.storedHashed = present.length > 0 && present.every((f) => isBcrypt(rec[f])) ? "yes" : `NO(${present.map((f) => f + ":" + (isBcrypt(rec[f]) ? "bcrypt" : "plain")).join("|")})`;
    const text = dbText();
    r.plainInFile = text.includes(L) || text.includes(N) ? "YES" : "no";
    // 4. self-service change (from a known bcrypt state)
    const P = strong("P");
    setCred(t, { passwordHash: bcrypt.hashSync(P, 4), password: t.coll === "teams" || t.coll.startsWith("support") ? bcrypt.hashSync(P, 4) : undefined });
    const s = await login(t.identifier, P);
    if (ok(s)) {
      const sc = await call("POST", "/api/db/auth/self-change-password", { currentPassword: P, newPassword: N2, confirmPassword: N2 }, { "x-session-token": s.json.sessionToken });
      r.selfChange = String(sc.status);
      r.selfNewWorks = ok(await login(t.identifier, N2)) ? "yes" : "NO";
      r.selfOldRefused = ok(await login(t.identifier, P)) ? "NO" : "yes";
      r.selfPlainInFile = dbText().includes(N2) ? "YES" : "no";
    } else r.selfChange = `n/a(signin ${s.status})`;
    // 5. published defaults never yield a session
    const leaks: string[] = [];
    for (const d of ["123", "mosa11", "A123b456"]) {
      setCred(t, { password: d });
      if (ok(await login(t.identifier, d))) leaks.push(`plain:${d}`);
      setCred(t, { passwordHash: bcrypt.hashSync(d, 4), password: t.coll === "teams" || t.coll.startsWith("support") ? bcrypt.hashSync(d, 4) : undefined });
      if (ok(await login(t.identifier, d))) leaks.push(`hash:${d}`);
    }
    r.defaultsRefused = leaks.length ? `NO(${leaks.join(",")})` : "yes";
    console.log(`PWTYPE\t${t.type}\t${Object.entries(r).map(([k, v]) => `${k}=${v}`).join("\t")}`);

    assert.equal(r.legacySignIn, "ok", "legacy sign-in did not work (fixture or flow)");
    assert.equal(r.forced, "yes");
    assert.equal(r.newWorks, "yes", "new password does not work after the forced change");
    assert.equal(r.oldRefused, "yes", "old password still works after the forced change");
    assert.equal(r.storedHashed, "yes");
    assert.equal(r.plainInFile, "no");
    if (!r.selfChange.startsWith("n/a")) {
      assert.equal(r.selfNewWorks, "yes"); assert.equal(r.selfOldRefused, "yes"); assert.equal(r.selfPlainInFile, "no");
    }
    assert.equal(r.defaultsRefused, "yes");
  });
}

test("FINDING CHECK: team-application approval must not create a leader account whose password is the phone number", async () => {
  const admin = core.createServerSession({ id: "admin-user", userId: "admin-user", name: "مدير", role: "admin" }, "admin").token;
  const acc = await call("POST", "/api/db/teamApplications/accept", { applicationId: "tapp-1", departmentId: "dep-5" }, { "x-session-token": admin });
  const leaderVol = (core.readDb().volunteers || []).find((v: any) => v && v.nationalId === "1700000199");
  const storedPlain = leaderVol && typeof leaderVol.password === "string" && !isBcrypt(leaderVol.password);
  const phoneSignIn = await login("1700000199", "0551234567");
  console.log(`PWTYPE\tteam_application_leader\taccept=${acc.status}\tstoredPlain=${storedPlain ? "YES" : "no"}\tphoneSignIn=${ok(phoneSignIn) ? "SESSION(" + phoneSignIn.json.role + ")" : phoneSignIn.status}`);
  assert.ok(!storedPlain, "leader account stored with a plain-text password");
  assert.ok(!ok(phoneSignIn), "the leader's phone number signs in as the leader");
});

test("FINDING CHECK: public beneficiary registration must not store body credentials or self-approve", async () => {
  const PLAIN = strong("B");
  const r = await call("POST", "/api/db/beneficiaries/add", {
    name: "مستفيد ذاتي", nationalId: "1700000300", phone: "0559876543",
    status: "approved", password: PLAIN, permissions: ["super_admin"], loginDisabled: false, approvedBy: "x"
  });
  const ben = (core.readDb().beneficiaries || []).find((b: any) => b && b.nationalId === "1700000300");
  const res = { status: r.status, created: Boolean(ben), statusStored: ben?.status, plainStored: dbText().includes(PLAIN), permissionsStored: Array.isArray(ben?.permissions) };
  console.log(`PWTYPE\tpublic_beneficiary_registration\t${Object.entries(res).map(([k, v]) => `${k}=${v}`).join("\t")}`);
  assert.ok(ben, "registration did not create a record");
  assert.ok(!res.plainStored, "plain-text password from the request body was stored");
  assert.notEqual(ben.status, "approved", "anonymous registration approved itself");
  assert.ok(!res.permissionsStored, "privilege fields from the request body were stored");
});


test("FINDING CHECK: real storekeeper / employee sessions must not act as their department's director", async () => {
  const rows: string[] = [];
  for (const [label, coll, id, ident, depId] of [["storekeeper", "storekeepers", "esc-sk", "1700000203", "dep-8"], ["employee", "employees", "esc-emp", "1700000201", "dep-2"]] as const) {
    const L = strong("E"), N = strong("F");
    const db = core.readDb();
    const rec = db[coll].find((r: any) => r.id === id); rec.password = L; core.writeDb(db);
    const depBefore = JSON.stringify((core.readDb().departments || []).find((d: any) => d.id === depId));
    const s = await login(ident, L);
    const tok = s.json?.sessionToken;
    // which identity does the server resolve for this real session? (department-admin-only listing as a probe)
    const ctxProbe = await call("GET", "/api/db/permissions/users", undefined, { "x-session-token": tok });
    const ch = await call("POST", "/api/db/auth/change-password", { newPassword: N }, { "x-session-token": tok });
    const depAfter = JSON.stringify((core.readDb().departments || []).find((d: any) => d.id === depId));
    const dirLogin = await login(depId, N);
    const ownLogin = await login(ident, N);
    rows.push(`${label}: signIn=${ok(s) ? s.json.role : s.status} adminListing=${ctxProbe.status} change=${ch.status} directorRecordChanged=${depBefore !== depAfter ? "YES" : "no"} directorSignInWithNewPw=${ok(dirLogin) ? "SESSION(" + dirLogin.json.role + ")" : dirLogin.status} ownSignInWithNewPw=${ok(ownLogin) ? "ok" : ownLogin.status}`);
  }
  for (const r of rows) console.log(`PWTYPE\tescalation\t${r}`);
  assert.ok(rows.every((r) => r.includes("directorRecordChanged=no")), "a forced change wrote to the department director's credentials");
  assert.ok(rows.every((r) => !r.includes("directorSignInWithNewPw=SESSION")), "the account can now sign in as the department director");
});
