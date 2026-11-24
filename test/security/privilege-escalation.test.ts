/**
 * Privilege-escalation tests: department staff, leaders and volunteers attempt top-management or
 * cross-scope operations. Each attempt must be refused (no 2xx) AND must leave the data unchanged.
 * Isolated synthetic sandbox.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-escalation-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER", "GEMINI_API_KEY"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";

const emp = (id: string, dep: string) => ({
  id: `perm-${id}`, userId: id, userName: `موظف ${dep}`, role: "employee", primaryDepartmentId: dep,
  allowedDepartmentIds: [dep], permissions: ["view_department", "create_data", "edit_data", "delete_data", "manage_staff"],
  status: "active", mustChangePassword: false
});
fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [{ id: "om-1", name: "عضو", isActive: true }], faqs: [],
  departments: ["dep-1", "dep-2", "dep-4", "dep-5", "dep-9"].map((id) => ({ id, nameAr: id })),
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" }, { id: "team-b", nameAr: "فريق ب", departmentId: "dep-5", status: "active" }],
  volunteers: [
    { id: "vol-a", name: "متطوع أ", nationalId: "1900000601", teamId: "team-a", status: "active", phone: "0500000601" },
    { id: "vol-b", name: "متطوع ب", nationalId: "1900000602", teamId: "team-b", status: "active", phone: "0500000602" }
  ],
  beneficiaries: [{ id: "ben-a", name: "مستفيد", nationalId: "1800000601", status: "approved" }],
  employees: [], storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [emp("emp-vol", "dep-5"), emp("emp-fin", "dep-2"), emp("emp-hr", "dep-9"),
    { id: "perm-admin", userId: "admin-user", userName: "مدير", role: "admin", primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active" }],
  passwordResetRequests: [], notifications: [], supportTickets: [], initiatives: [], requests: [], attendance: [], logs: [], accessAuditLogs: [], activeSessions: []
}), "utf8");

let server: http.Server;
let baseUrl = "";
let core: any;
const T: Record<string, string> = {};
let snapshot = "";
let initialPrivileged: string[] = [];

async function call(method: string, p: string, token: string, body?: any) {
  const res = await fetch(baseUrl + p, {
    method, headers: { "content-type": "application/json", "x-session-token": token },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {})
  });
  await res.arrayBuffer();
  return res.status;
}
const ok = (s: number) => s >= 200 && s < 300;
const privilegedHolders = () => (core.readDb().userDepartmentAccess || [])
  .filter((u: any) => u.role === "admin" || u.role === "operations_manager" ||
    (Array.isArray(u.permissions) && (u.permissions.includes("super_admin") || u.permissions.includes("all_permissions"))))
  .map((u: any) => u.userId).sort();

before(async () => {
  core = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  const s = (user: any, role: string) => core.createServerSession(user, role).token;
  for (const id of ["emp-vol", "emp-fin", "emp-hr"]) T[id] = s({ id, userId: id, name: id, role: "employee" }, "employee");
  T.leader = s({ id: "leader-team-a", name: "قائد", role: "leader", teamId: "team-a" }, "leader");
  T.volunteer = s({ id: "vol-a", name: "متطوع أ", nationalId: "1900000601", role: "volunteer", teamId: "team-a" }, "volunteer");
  // (the app's own startup normalisation may add its built-in operations record — captured here, before any attempt)
  initialPrivileged = privilegedHolders();
  snapshot = JSON.stringify({ uda: core.readDb().userDepartmentAccess, deps: core.readDb().departments, sys: core.readDb().systemSettings });
});

after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

const ATTEMPTS: Array<[string, string, string, any?]> = [
  // account & permission management (top management only)
  ["emp-vol", "POST", "/api/db/users/create", { name: "مهاجم", username: "evil", nationalId: "1700000999", role: "admin", permissions: ["super_admin"], primaryDepartmentId: "dep-1", password: "Aa1!evilpass99" }],
  ["emp-vol", "POST", "/api/db/users/update", { userId: "admin-user", role: "employee", status: "suspended" }],
  ["emp-vol", "POST", "/api/db/users/reset-password", { userId: "admin-user", newPassword: "Aa1!takeover99" }],
  ["emp-vol", "POST", "/api/db/users/toggle-status", { userId: "admin-user" }],
  ["emp-vol", "POST", "/api/db/users/delete", { userId: "admin-user" }],
  ["emp-vol", "POST", "/api/db/users/revoke-sessions", { userId: "admin-user" }],
  ["emp-vol", "POST", "/api/db/permissions/update", { userId: "emp-vol", role: "admin", permissions: ["super_admin", "all_permissions"] }],
  ["emp-vol", "POST", "/api/db/departments/permissions/update", { departmentId: "dep-1", userId: "emp-vol", permissions: ["super_admin"] }],
  ["emp-vol", "POST", "/api/db/departments/assign-director", { departmentId: "dep-1", userId: "emp-vol" }],
  ["emp-vol", "POST", "/api/db/departments/add-staff", { departmentId: "dep-2", name: "دخيل", nationalId: "1700000998", role: "department_admin" }],
  ["emp-vol", "POST", "/api/db/departments/save", { id: "dep-1", nameAr: "مختطفة" }],
  ["emp-vol", "POST", "/api/db/departments/delete", { id: "dep-2" }],
  // system-wide operations
  ["emp-vol", "POST", "/api/db/reset", { confirmReset: true }],
  ["emp-vol", "POST", "/api/db/restore", {}],
  ["emp-vol", "GET", "/api/db/backup"],
  ["emp-vol", "POST", "/api/admin/backup/v934/prepare-export", {}],
  ["emp-vol", "POST", "/api/admin/freeze/acquire", {}],
  ["emp-vol", "POST", "/api/db/maintenance/toggle", { enabled: true }],
  ["emp-vol", "POST", "/api/db/org-members/clear-all", {}],
  ["emp-vol", "POST", "/api/db/systemSettings", { societyName: "x" }],
  // cross-department
  ["emp-fin", "POST", "/api/db/beneficiaries/status", { beneficiaryId: "ben-a", status: "rejected" }],
  ["emp-fin", "POST", "/api/db/volunteers/manual-create", { name: "x", teamId: "team-a" }],
  ["emp-fin", "POST", "/api/db/teams/delete", { id: "team-b" }],
  ["emp-hr", "POST", "/api/db/permissions/update", { userId: "emp-hr", permissions: ["super_admin"] }],
  // team scope
  ["leader", "POST", "/api/db/teams/delete", { id: "team-b" }],
  ["leader", "POST", "/api/db/teams/leader-update", { teamId: "team-b", nameAr: "مختطف" }],
  ["leader", "POST", "/api/db/volunteers/archive-or-delete", { id: "vol-b", actionType: "archive", reason: "x" }],
  // self-service scope
  ["volunteer", "POST", "/api/db/volunteers/update-profile", { volunteerId: "vol-b", phone: "0599999999" }],
  ["volunteer", "POST", "/api/db/users/update", { userId: "vol-a", role: "admin" }]
];

test("top-management and cross-scope operations are refused for lower roles", async () => {
  const allowed: string[] = [];
  for (const [who, m, p, body] of ATTEMPTS) {
    const s = await call(m, p, T[who], body);
    if (ok(s)) allowed.push(`${who} ${m} ${p} → ${s}`);
  }
  assert.deepEqual(allowed, [], "escalation attempts succeeded");
});

test("no privilege was gained and protected records are unchanged after the attempts", () => {
  assert.deepEqual(privilegedHolders(), initialPrivileged, "a new privileged account appeared");
  assert.ok(!initialPrivileged.includes("emp-vol") && !initialPrivileged.includes("emp-hr"));
  const db = core.readDb();
  assert.equal(JSON.stringify({ uda: db.userDepartmentAccess, deps: db.departments, sys: db.systemSettings }), snapshot);
  assert.ok(db.teams.some((t: any) => t.id === "team-b" && t.nameAr === "فريق ب"));
  assert.equal(db.volunteers.find((v: any) => v.id === "vol-b").phone, "0500000602");
  assert.equal(db.beneficiaries.find((b: any) => b.id === "ben-a").status, "approved");
  assert.ok((db.orgMembers || []).length === 1);
});
