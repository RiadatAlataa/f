/**
 * FINAL REVIEW (evidence) — credential-leak probe over EVERY registered /api route, synthetic data only.
 *
 * Every secret field of every account type holds a unique CANARY value (plain text and bcrypt hashes),
 * plus OTP / reset / device / session secrets and integration keys. Then:
 *   A. every GET route is called as every role (anonymous … admin), with ids substituted;
 *   B. every non-GET route is called as every role with a body full of target ids and a canary NEW password;
 *      the data is restored after each call so destructive routes do not hide later results;
 * and each response (JSON, text, CSV, any body), the server's console output, and the stored data are
 * scanned for: canary secrets, any bcrypt hash, the submitted new password in plain text, and secrets copied
 * into log-like collections. Output: "LEAK" lines (route, role, category — never the secret itself).
 * The admin-only raw backup (/api/db/backup) is reported separately (it contains everything by design).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-final-leaks-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "GEMINI_API_KEY", "RESEND_API_KEY", "SMTP_HOST", "AWS_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID", "TRUSTED_PROXY_HOPS"]) delete process.env[k];
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";

// ---- capture server console output (scanned later; never printed)
const consoleBuf: string[] = [];
for (const m of ["log", "info", "warn", "error", "debug"] as const) {
  const orig = (console as any)[m].bind(console);
  (console as any)[m] = (...args: any[]) => {
    try { consoleBuf.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")); } catch {}
    if (consoleBuf.length > 200000) consoleBuf.splice(0, 100000);
    if (typeof args[0] === "string" && /^(LEAK|PROBE)/.test(args[0])) orig(...args);
  };
}
const out = (s: string) => process.stdout.write(s + "\n");

const rnd = (n = 6) => crypto.randomBytes(n).toString("hex");
const CANARIES: string[] = [];
const C = (tag: string) => { const v = `CNRY${tag}${rnd()}`; CANARIES.push(v); return v; };
const OWN_PW: Record<string, string> = {};
const BCRYPT_RX = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/;

function secrets(id: string, opts: { supportStyle?: boolean } = {}) {
  const pw = C(`PW${id}`);
  OWN_PW[id] = pw;
  const h = bcrypt.hashSync(pw, 4);
  CANARIES.push(h);
  return {
    password: opts.supportStyle ? pw : pw, passwordHash: h,
    pinHash: C("PIN"), tempPassword: C("TMP"), resetToken: C("RTK"), passwordResetToken: C("PRT"),
    passwordResetTokenHash: C("PRTH"), resetTokenHash: C("RTH"), deviceSecretHash: C("DSH"), codeHash: C("CH"),
    googleSub: C("GS"), requestIdHash: C("RIH"), bootstrapSecret: C("BS")
  };
}

const ACC: Record<string, any> = {};
const fixture: any = {
  systemSettings: {
    societyName: "جمعية اختبار", maintenanceMode: false,
    emailSettings: { smtpPassword: C("SMTP"), resendApiKey: C("RESEND"), apiKey: C("EAPI") },
    whatsappSettings: { accessToken: C("WATOK"), apiKey: C("WAKEY"), token: C("WAT") }
  },
  emailSettings: { smtpPassword: C("SMTP2"), resendApiKey: C("RESEND2") },
  whatsappSettings: { accessToken: C("WATOK2") },
  homeSettings: {}, news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: ["dep-1", "dep-2", "dep-4", "dep-5", "dep-6", "dep-8", "dep-9"].map((id) => ({ id, nameAr: id, ...(id === "dep-5" ? { directorName: "مدير التطوع", ...secrets("dep5") } : {}) })),
  teams: [{ id: "team-a", nameAr: "فريق أ", leaderName: "قائد أ", departmentId: "dep-5", status: "active", ...secrets("leader") }],
  volunteers: [{ id: "vol-a", name: "متطوع أ", nationalId: "1900000601", teamId: "team-a", status: "active", email: "vol.a@example.org", ...secrets("vol") }],
  beneficiaries: [{ id: "ben-a", name: "مستفيد أ", nationalId: "1800000601", status: "approved", ...secrets("ben") }],
  employees: [{ id: "emp-x", name: "موظف ميداني", nationalId: "1700000601", status: "active", departmentId: "dep-5", ...secrets("emp") }],
  storekeepers: [{ id: "sk-1", name: "أمين مستودع", nationalId: "1600000601", status: "active", ...secrets("sk") }],
  supportManagers: [{ id: "sm-1", name: "مدير دعم", username: "sm_one", role: "support_manager", status: "active", ...secrets("sm", { supportStyle: true }) }],
  supportAgents: [{ id: "sa-1", name: "موظف دعم", username: "sa_one", role: "support_agent", status: "active", managerId: "sm-1", ...secrets("sa", { supportStyle: true }) }],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", username: "admin", userName: "مدير", userEmail: "owner@example.org", role: "admin", primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active", ...secrets("admin") },
    { id: "perm-ops", userId: "ops-manager", username: "ops", userName: "مدير العمليات", role: "operations_manager", primaryDepartmentId: "dep-1", permissions: ["operations_manager"], status: "active", ...secrets("ops") },
    { id: "perm-emp-vol", userId: "emp-vol", username: "emp_vol", userName: "موظف التطوع", role: "employee", primaryDepartmentId: "dep-5", allowedDepartmentIds: ["dep-5"], permissions: ["view_department", "create_data", "edit_data"], status: "active", ...secrets("empvol") },
    { id: "perm-emp-fin", userId: "emp-fin", username: "emp_fin", userName: "موظف المالية", role: "employee", primaryDepartmentId: "dep-2", allowedDepartmentIds: ["dep-2"], permissions: ["view_department", "create_data", "edit_data"], status: "active", ...secrets("empfin") }
  ],
  trustedDevices: [{ id: "td-1", userId: "vol-a", deviceSecretHash: C("TDS"), pinHash: C("TDP"), createdAt: new Date().toISOString() }],
  passwordResetOtps: [{ id: "otp-1", userId: "vol-a", codeHash: C("OTPH"), requestIdHash: C("OTPR"), expiresAt: Date.now() + 600000, attempts: 0, maxAttempts: 5 }],
  passwordResetRequests: [{ id: "prr-1", userId: "vol-a", teamId: "team-a", status: "approved", resetToken: C("PRRT"), resetTokenHash: C("PRRH"), resetTokenExpiresAt: Date.now() + 600000 }],
  passwordResetTokens: [{ id: "prt-1", userId: "vol-a", tokenHash: C("LNKH"), expiresAt: Date.now() + 600000 }],
  rememberedHandles: [{ rememberId: C("REM"), userId: "vol-a", createdAt: new Date().toISOString() }],
  notifications: [{ id: "n-1", userId: "vol-b-owner", type: "password_reset_token", token: C("NTOK"), titleAr: "كود" }],
  supportTickets: [], supportTasks: [], chatConversations: [], initiatives: [], requests: [], attendance: [],
  benefitRequests: [], distributions: [], inventoryItems: [], financialTransactions: [], logs: [], accessAuditLogs: [],
  teamApplications: [], volunteerApplications: [], activeSessions: []
};
fs.writeFileSync(dbPath, JSON.stringify(fixture), "utf8");

// collections whose records legitimately hold credentials (a canary there is not a "copy")
const CREDENTIAL_HOMES = new Set(["departments", "teams", "volunteers", "beneficiaries", "employees", "storekeepers", "supportManagers",
  "supportAgents", "userDepartmentAccess", "trustedDevices", "passwordResetOtps", "passwordResetRequests", "passwordResetTokens",
  "rememberedHandles", "notifications", "activeSessions", "systemSettings", "emailSettings", "whatsappSettings", "deletedEntities", "recycleBin"]);

let server: http.Server;
let baseUrl = "";
let core: any;
const ROLE_TOKENS: Record<string, string> = {};
const ROLE_SELF: Record<string, string> = {};
let snapshot = "";

function listRoutes(app: any) {
  const outR: { method: string; path: string }[] = [];
  const seen = new Set<string>();
  const walk = (stack: any[]) => {
    for (const layer of stack || []) {
      if (layer?.route) {
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const p of paths) {
          if (typeof p !== "string") continue;
          for (const m of Object.keys(layer.route.methods || {})) {
            if (m === "_all") continue;
            const key = `${m.toUpperCase()} ${p}`;
            if (!seen.has(key)) { seen.add(key); outR.push({ method: m.toUpperCase(), path: p }); }
          }
        }
      } else if (layer?.handle?.stack) walk(layer.handle.stack);
    }
  };
  walk(app?._router?.stack || []);
  return outR.filter((r) => r.path.startsWith("/api"));
}

const findings: string[] = [];
const report = (cat: string, route: string, role: string, detail = "") => {
  const line = `LEAK\t${cat}\t${route}\t${role}${detail ? "\t" + detail : ""}`;
  if (!findings.includes(line)) { findings.push(line); out(line); }
};

function scanText(text: string, ownToken: string, newPw?: string): string[] {
  const hits: string[] = [];
  for (const c of CANARIES) if (text.includes(c)) { hits.push("canary-secret"); break; }
  if (BCRYPT_RX.test(text)) hits.push("bcrypt-hash");
  for (const [role, tok] of Object.entries(ROLE_TOKENS)) if (tok && tok !== ownToken && text.includes(tok)) { hits.push(`other-session-token(${role})`); break; }
  if (newPw && text.includes(newPw)) hits.push("submitted-password-echoed");
  return hits;
}

function canaryPaths(obj: any): Set<string> {
  const s = new Set<string>();
  const walk = (v: any, p: string, depth: number) => {
    if (depth > 8 || v == null) return;
    if (typeof v === "string") { for (const c of CANARIES) if (v.includes(c)) s.add(`${p.split(".")[0]}|${c}`); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}.${i}`, depth + 1)); return; }
    if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k, depth + 1);
  };
  walk(obj, "", 0);
  return s;
}

const ID_FIELDS = ["id", "userId", "targetUserId", "volunteerId", "beneficiaryId", "agentId", "managerId", "employeeId", "storekeeperId", "memberId", "accountId"];
function bodyFor(target: string, role: string, newPw: string) {
  const b: any = {};
  for (const f of ID_FIELDS) b[f] = target;
  Object.assign(b, {
    teamId: "team-a", newPassword: newPw, password: newPw, confirmPassword: newPw,
    currentPassword: OWN_PW[ROLE_SELF[role]] || "x", oldPassword: OWN_PW[ROLE_SELF[role]] || "x",
    pin: "739164", name: "تحقق آلي", username: `probe_${rnd(3)}`, nationalId: `19${Math.floor(10000000 + Math.random() * 89999999)}`,
    phone: "0551112222", email: `probe.${rnd(3)}@example.org`, status: "active", approve: true, identifier: "1900000601"
  });
  return b;
}
const concrete = (p: string, id: string) => p.replace(/:[A-Za-z_]+/g, id).replace(/\*/g, "x");

async function req(method: string, url: string, token: string, body?: any) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    if (token) headers["x-session-token"] = token;
    const res = await fetch(baseUrl + url, { method, headers, signal: ctrl.signal, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, text: buf.toString("utf8"), type: res.headers.get("content-type") || "" };
  } catch { return { status: -1, text: "", type: "" }; }
  finally { clearTimeout(timer); }
}
const restore = () => core.writeDb(JSON.parse(snapshot));

before(async () => {
  core = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  const s = (id: string, user: any, role: string) => { ROLE_SELF[role] = id; ROLE_TOKENS[role] = core.createServerSession(user, role).token; };
  s("admin", { id: "admin-user", userId: "admin-user", name: "مدير", role: "admin" }, "admin");
  s("ops", { id: "ops-manager", userId: "ops-manager", name: "مدير العمليات", role: "operations_manager" }, "operations_manager");
  s("empvol", { id: "emp-vol", userId: "emp-vol", name: "موظف التطوع", role: "employee" }, "employee_dep5");
  s("empfin", { id: "emp-fin", userId: "emp-fin", name: "موظف المالية", role: "employee" }, "employee_dep2");
  s("sm", { id: "sm-1", name: "مدير دعم", role: "support_manager" }, "support_manager");
  s("sa", { id: "sa-1", name: "موظف دعم", role: "support_agent" }, "support_agent");
  s("sk", { id: "sk-1", name: "أمين مستودع", role: "storekeeper" }, "storekeeper");
  s("leader", { id: "leader-team-a", name: "قائد أ", role: "leader", teamId: "team-a" }, "leader");
  s("vol", { id: "vol-a", name: "متطوع أ", nationalId: "1900000601", role: "volunteer", teamId: "team-a" }, "volunteer");
  s("ben", { id: "ben-a", name: "مستفيد أ", nationalId: "1800000601", role: "beneficiary" }, "beneficiary");
  ROLE_TOKENS.anonymous = ""; ROLE_SELF.anonymous = "";
  for (const t of Object.values(ROLE_TOKENS)) if (t) CANARIES.push(t);
  await new Promise((r) => setTimeout(r, 1500)); // late route registration
  snapshot = JSON.stringify(core.readDb());
});
after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

const ROLES = ["anonymous", "beneficiary", "volunteer", "leader", "storekeeper", "support_agent", "support_manager", "employee_dep2", "employee_dep5", "operations_manager", "admin"];
const TARGETS = ["sa-1", "sm-1", "vol-a", "ben-a", "sk-1", "emp-x", "leader-team-a", "depadmin-dep-5", "admin-user", "emp-vol"];
const BACKUP = /^\/api\/(db\/backup|admin\/backup)/;
const stats = { requests: 0, timeouts: 0, binary: new Set<string>(), skippedSlow: new Set<string>() };

test("A. GET routes × all roles: no credential, hash, secret or other session token in any response", async () => {
  const routes = listRoutes(core.default).filter((r) => r.method === "GET");
  out(`PROBE\tGET routes=${routes.length}`);
  for (const r of routes) {
    const ids = r.path.includes(":") ? TARGETS : ["x"];
    for (const role of ROLES) {
      for (const id of ids) {
        if (stats.skippedSlow.has(r.path)) continue;
        const res = await req("GET", concrete(r.path, id), ROLE_TOKENS[role]);
        stats.requests++;
        if (res.status === -1) { stats.timeouts++; stats.skippedSlow.add(r.path); continue; }
        if (res.type && !/json|text|csv|xml|javascript/.test(res.type)) stats.binary.add(`${r.method} ${r.path} (${res.type.split(";")[0]})`);
        const hits = scanText(res.text, ROLE_TOKENS[role]);
        const key = `GET ${r.path}`;
        if (BACKUP.test(r.path)) {
          if (hits.length && !["admin", "operations_manager"].includes(role)) for (const h of hits) report(h, key, role, "BACKUP to non-admin");
          else if (hits.length) report("backup-contains-secrets(by design: admin/ops only)", key, role, hits.join(","));
          continue;
        }
        for (const h of hits) report(h, key, role, `status=${res.status}`);
      }
    }
  }
});

test("B. non-GET routes × all roles (+ every account type as target for admin): responses, storage and logs", async () => {
  const routes = listRoutes(core.default).filter((r) => r.method !== "GET");
  out(`PROBE\tnon-GET routes=${routes.length}`);
  const base = canaryPaths(JSON.parse(snapshot));
  for (const r of routes) {
    const runs: Array<[string, string]> = [];
    for (const role of ROLES) runs.push([role, ROLE_SELF[role] === "admin" ? "admin-user" : (role === "anonymous" ? "vol-a" : ({ ops: "ops-manager", empvol: "emp-vol", empfin: "emp-fin", sm: "sm-1", sa: "sa-1", sk: "sk-1", leader: "leader-team-a", vol: "vol-a", ben: "ben-a" } as any)[ROLE_SELF[role]])]);
    for (const t of TARGETS) runs.push(["admin", t], ["operations_manager", t]);
    for (const [role, target] of runs) {
      if (stats.skippedSlow.has(r.path)) break;
      restore();
      const newPw = `NewPw9!${rnd()}`;
      const res = await req(r.method, concrete(r.path, target), ROLE_TOKENS[role], bodyFor(target, role, newPw));
      stats.requests++;
      if (res.status === -1) { stats.timeouts++; stats.skippedSlow.add(r.path); continue; }
      const key = `${r.method} ${r.path}`;
      const hits = scanText(res.text, ROLE_TOKENS[role], newPw);
      for (const h of hits) report(h, key, `${role}→${target}`, `status=${res.status}`);
      // storage: submitted password stored in plain text anywhere
      const dbNow = core.readDb();
      const text = JSON.stringify(dbNow);
      if (text.includes(newPw)) report("PLAINTEXT-STORED(submitted password)", key, `${role}→${target}`, `status=${res.status}`);
      // credential fields written with a non-hash value
      for (const [coll, arr] of Object.entries(dbNow)) {
        if (!Array.isArray(arr)) continue;
        for (const rec of arr as any[]) {
          if (!rec || typeof rec !== "object") continue;
          for (const f of ["password", "passwordHash", "pinHash"]) {
            const v = rec[f];
            if (typeof v !== "string" || !v) continue;
            if (CANARIES.some((c) => v === c)) continue; // unchanged seeded value
            if (/^\$2[aby]\$\d{2}\$/.test(v) || /^[a-f0-9]{64}$/i.test(v) || /^(scrypt|pbkdf2|sha256)[:$]/.test(v)) continue;
            report("NON-HASH-CREDENTIAL-WRITTEN", key, `${role}→${target}`, `${coll}.${f}`);
          }
        }
      }
      // secrets copied into log-like / non-credential collections
      for (const p of canaryPaths(dbNow)) {
        if (base.has(p)) continue;
        const coll = p.split("|")[0];
        if (!CREDENTIAL_HOMES.has(coll)) report("SECRET-COPIED", key, `${role}→${target}`, `into ${coll}`);
      }
    }
  }
  restore();
});

test("C. server console output never contains credentials, hashes, session tokens or submitted passwords", () => {
  const all = consoleBuf.join("\n");
  const hits: string[] = [];
  for (const c of CANARIES) if (all.includes(c)) { hits.push("canary/secret/session token"); break; }
  if (BCRYPT_RX.test(all)) hits.push("bcrypt hash");
  if (/NewPw9!/.test(all)) hits.push("submitted password");
  for (const h of hits) report(`CONSOLE:${h}`, "server logs", "-");
  out(`PROBE\tsummary\trequests=${stats.requests}\ttimeouts=${stats.timeouts}\tskippedSlowRoutes=${stats.skippedSlow.size}\tbinaryResponses=${stats.binary.size}\tconsoleLines=${consoleBuf.length}`);
  for (const b of stats.binary) out(`PROBE\tbinary\t${b}`);
  for (const s of stats.skippedSlow) out(`PROBE\tslow-skipped\t${s}`);
  out(`PROBE\tfindings=${findings.length}`);
  const real = findings.filter((f) => !f.includes("by design"));
  assert.deepEqual(real, [], `${real.length} leak finding(s) — see LEAK lines`);
});
