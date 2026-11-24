/**
 * Role regression tests: the security fixes must NOT block legitimate work.
 * For each role, the operations its screens actually call must pass the access layer
 * (status is not 401/403 — a 400/404 from synthetic input is fine), and clearly
 * out-of-scope operations must be refused. Isolated synthetic sandbox.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-roles-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER", "GEMINI_API_KEY"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";

const emp = (id: string, dep: string) => ({
  id: `perm-${id}`, userId: id, userName: `موظف ${dep}`, role: "employee", primaryDepartmentId: dep,
  allowedDepartmentIds: [dep], permissions: ["view_department", "create_data", "edit_data"], status: "active", mustChangePassword: false
});
fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار" }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: ["dep-1", "dep-2", "dep-4", "dep-5", "dep-6", "dep-8", "dep-9"].map((id) => ({ id, nameAr: id })),
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" }, { id: "team-b", nameAr: "فريق ب", departmentId: "dep-5", status: "active" }],
  volunteers: [{ id: "vol-a", name: "متطوع", nationalId: "1900000501", teamId: "team-a", status: "active", mustChangePassword: false }],
  beneficiaries: [{ id: "ben-a", name: "مستفيد", nationalId: "1800000501", status: "approved", mustChangePassword: false }],
  employees: [{ id: "emp-x", name: "موظف ميداني", status: "active", departmentId: "dep-5" }],
  storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [emp("emp-fin", "dep-2"), emp("emp-ben", "dep-4"), emp("emp-vol", "dep-5"), emp("emp-media", "dep-6"),
    emp("emp-wh", "dep-8"), emp("emp-hr", "dep-9"),
    { id: "perm-admin", userId: "admin-user", userName: "مدير", role: "admin", primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active" }],
  passwordResetRequests: [], notifications: [], supportTickets: [], initiatives: [], requests: [], attendance: [],
  benefitRequests: [], distributions: [], inventoryItems: [], logs: [], accessAuditLogs: [], activeSessions: []
}), "utf8");

let server: http.Server;
let baseUrl = "";
let core: any;
const T: Record<string, string> = {};

async function call(method: string, p: string, token: string, body?: any) {
  const res = await fetch(baseUrl + p, {
    method, headers: { "content-type": "application/json", "x-session-token": token },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {})
  });
  await res.arrayBuffer();
  return res.status;
}
const passesAccess = (s: number) => s !== 401 && s !== 403;

before(async () => {
  core = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  const s = (user: any, role: string) => core.createServerSession(user, role).token;
  T.admin = s({ id: "admin-user", userId: "admin-user", name: "مدير", role: "admin" }, "admin");
  T.leader = s({ id: "leader-team-a", name: "قائد", role: "leader", teamId: "team-a" }, "leader");
  T.volunteer = s({ id: "vol-a", name: "متطوع", nationalId: "1900000501", role: "volunteer", teamId: "team-a" }, "volunteer");
  T.beneficiary = s({ id: "ben-a", name: "مستفيد", nationalId: "1800000501", role: "beneficiary" }, "beneficiary");
  T.storekeeper = s({ id: "sk-1", name: "أمين مستودع", role: "storekeeper" }, "storekeeper");
  for (const id of ["emp-fin", "emp-ben", "emp-vol", "emp-media", "emp-wh", "emp-hr"]) {
    T[id] = s({ id, userId: id, name: id, role: "employee" }, "employee");
  }
});

after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

const ALLOWED: Array<[string, string, string, any?]> = [
  // team leader (LeaderDashboard / App handlers)
  ["leader", "POST", "/api/db/team-staff/assign", { teamId: "team-a", employeeId: "emp-x", teamRole: "مشرف" }],
  ["leader", "POST", "/api/db/opportunity-requests/add", {}],
  ["leader", "POST", "/api/db/teams/broadcast", { teamId: "team-a" }],
  ["leader", "POST", "/api/db/evaluations/add", {}],
  ["leader", "POST", "/api/db/volunteerApplications/leader-action", {}],
  ["leader", "POST", "/api/db/letters/send", {}],
  ["leader", "POST", "/api/db/team-cards/bulk-issue", { teamId: "team-a" }],
  ["leader", "GET", "/api/db/passwordResetRequests"],
  // volunteer (VolunteerDashboard)
  ["volunteer", "POST", "/api/db/initiatives/apply", {}],
  ["volunteer", "POST", "/api/db/attendance/record", {}],
  ["volunteer", "POST", "/api/db/notifications/mark-read", {}],
  ["volunteer", "GET", "/api/db/card-templates"],
  ["volunteer", "GET", "/api/support/tickets"],
  ["volunteer", "POST", "/api/db/initiatives/rate-by-volunteer", {}],
  ["volunteer", "POST", "/api/db/reissue-card", { volunteerId: "vol-a" }],
  // beneficiary
  ["beneficiary", "POST", "/api/db/benefitRequests/add", { beneficiaryId: "ben-a", type: "سلة" }],
  ["beneficiary", "POST", "/api/db/aid/confirm-receipt", {}],
  ["beneficiary", "POST", "/api/db/beneficiaryRatings/add", {}],
  // storekeeper (InventoryManager)
  ["storekeeper", "GET", "/api/db/inventory"],
  ["storekeeper", "POST", "/api/db/inventory/items/add", {}],
  ["storekeeper", "POST", "/api/db/distributions/workflow-status", {}],
  // department staff
  ["emp-fin", "GET", "/api/db/finance/all"],
  ["emp-ben", "GET", "/api/db/beneficiaries/statistics"],
  ["emp-ben", "POST", "/api/db/distributions/create", {}],
  ["emp-vol", "POST", "/api/db/volunteers/toggle-status", {}],
  ["emp-vol", "GET", "/api/db/teamApplications"],
  ["emp-media", "POST", "/api/db/news/add", {}],
  ["emp-wh", "POST", "/api/db/inventory/storekeepers/add", {}],
  ["emp-hr", "POST", "/api/db/hr/job-titles/save", {}],
  // top management
  ["admin", "GET", "/api/db/finance/all"],
  ["admin", "GET", "/api/db/email-settings"],
  ["admin", "POST", "/api/db/systemSettings", {}],
  ["admin", "GET", "/api/db/inventory"]
];

const REFUSED: Array<[string, string, string, any?]> = [
  ["leader", "POST", "/api/db/team-staff/assign", { teamId: "team-b", employeeId: "emp-x", teamRole: "مشرف" }],
  ["leader", "GET", "/api/db/finance/all"],
  ["volunteer", "POST", "/api/db/notifications/send", {}],
  ["volunteer", "GET", "/api/db/inventory"],
  ["beneficiary", "GET", "/api/db/beneficiaries/statistics"],
  ["storekeeper", "POST", "/api/db/inventory/storekeepers/add", {}],
  ["storekeeper", "GET", "/api/db/finance/all"],
  ["emp-fin", "GET", "/api/db/inventory"],
  ["emp-media", "GET", "/api/db/finance/all"],
  ["emp-hr", "GET", "/api/db/email-settings"]
];

test("every role can still reach the operations its screens use", async () => {
  const blocked: string[] = [];
  for (const [role, m, p, body] of ALLOWED) {
    const s = await call(m, p, T[role], body);
    if (!passesAccess(s)) blocked.push(`${role} ${m} ${p} → ${s}`);
  }
  assert.deepEqual(blocked, [], "legitimate operations were blocked");
});

test("out-of-scope operations are refused for each role", async () => {
  const leaked: string[] = [];
  for (const [role, m, p, body] of REFUSED) {
    const s = await call(m, p, T[role], body);
    if (passesAccess(s)) leaked.push(`${role} ${m} ${p} → ${s}`);
  }
  assert.deepEqual(leaked, [], "out-of-scope operations were allowed");
});
