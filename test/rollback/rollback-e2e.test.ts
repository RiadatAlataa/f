/**
 * END-TO-END ROLLBACK SCENARIO on ONE synthetic data file, each version in its own process:
 *
 *   A. NEW version   — support staff change passwords / are created (real API calls).
 *   B. PREVIOUS ver. — the same data: changed passwords must verify, old ones must not.
 *   C. PREVIOUS ver. with normal settings — documents the dangerous Google admin path it still has.
 *   D. PREVIOUS ver. with the EMERGENCY settings — that path (and every Google sign-in) is closed,
 *      while password sign-in keeps operations running.
 *   E. NEW version with the emergency settings (the moment before / after the switch).
 *   F. NEW version again (roll-forward) on the data the previous version used.
 *
 * CI sets ROLLBACK_SERVER_PATH to the PR base (= current production code) checked out in ./base.
 * Synthetic data only; credentials are random per run and never printed. No network: Google's
 * tokeninfo answer is simulated inside each child process (see serve-version.ts).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, ChildProcess } from "node:child_process";
import bcrypt from "bcryptjs";

const PREVIOUS = process.env.ROLLBACK_SERVER_PATH || "";
const NEW = path.resolve("server-core.ts");
const HELPER = path.resolve("test/rollback/serve-version.ts");

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-rollback-e2e-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
const rnd = (n = 8) => crypto.randomBytes(n).toString("hex");
const PW = {
  admin: `Aa1!${rnd()}`,
  agentLegacy: `Aa1!${rnd()}`,      // plain text, as some production records still are before deploy
  agentNew: `Bb2!${rnd()}`,         // chosen on the NEW version
  managerLegacy: `Aa1!${rnd()}`,
  managerNew: `Cc3!${rnd()}`,
  agentCreated: `Dd4!${rnd()}`      // agent created on the NEW version
};
const CLIENT_ID = "rollback-test-client.apps.googleusercontent.com";
const EMERGENCY_GOOGLE_CLIENT_ID = "google-sign-in-disabled-for-rollback"; // not a Google client id: no token can carry it

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار", maintenanceMode: false }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }, { id: "dep-5", nameAr: "تطوع" }],
  teams: [], volunteers: [], beneficiaries: [], employees: [], storekeepers: [],
  supportManagers: [{ id: "sm-legacy", name: "مدير دعم", username: "manager_legacy", role: "support_manager", status: "active", password: PW.managerLegacy }],
  supportAgents: [{ id: "sa-legacy", name: "دعم", username: "agent_legacy", role: "support_agent", status: "active", password: PW.agentLegacy, managerId: "sm-legacy" }],
  userDepartmentAccess: [
    { id: "perm-admin", userId: "admin-user", username: "admin", userName: "مدير", userEmail: "owner@example.org", role: "admin",
      primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active", mustChangePassword: false,
      passwordHash: bcrypt.hashSync(PW.admin, 4) }
  ],
  passwordResetRequests: [], passwordResetOtps: [], notifications: [], chatConversations: [], supportTickets: [], supportTasks: [],
  activeSessions: [], initiatives: [], requests: [], attendance: [], logs: [], accessAuditLogs: []
}), "utf8");

// --------------------------------------------------------------------------------------------
let child: ChildProcess | null = null;
let baseUrl = "";
let childLog: string[] = [];

async function startVersion(serverPath: string, env: Record<string, string | undefined>) {
  await stopVersion();
  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    if (/^(DATABASE_URL|POSTGRES|PG_|STORAGE_BACKEND|REQUIRE_|VERCEL|RENDER|GEMINI|RESEND|SMTP|GOOGLE_|VITE_GOOGLE|ALLOW_DEV|TRUSTED_PROXY|NODE_ENV)/.test(k)) continue;
    childEnv[k] = v;
  }
  for (const [k, v] of Object.entries(env)) if (v !== undefined) childEnv[k] = v;
  childEnv.APP_DB_PATH = dbPath;
  childLog = [];
  const c = spawn(process.execPath, ["--import", "tsx", HELPER, serverPath], { env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  child = c;
  baseUrl = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start:\n" + childLog.slice(-30).join("\n"))), 90_000);
    let buf = "";
    c.stdout!.on("data", (d) => {
      buf += d.toString();
      const lines = buf.split("\n"); buf = lines.pop() || "";
      for (const l of lines) {
        childLog.push(l); if (childLog.length > 200) childLog.shift();
        const m = /^LISTENING (\d+)$/.exec(l.trim());
        if (m) { clearTimeout(timer); resolve(`http://127.0.0.1:${m[1]}`); }
      }
    });
    c.stderr!.on("data", (d) => { childLog.push(String(d)); if (childLog.length > 200) childLog.shift(); });
    c.on("exit", (code) => { clearTimeout(timer); reject(new Error(`server exited (${code}):\n` + childLog.slice(-30).join("\n"))); });
  });
}
async function stopVersion() {
  const c = child; child = null;
  if (!c || c.exitCode !== null) return;
  await new Promise<void>((resolve) => { c.once("exit", () => resolve()); c.kill("SIGTERM"); setTimeout(() => { try { c.kill("SIGKILL"); } catch {} }, 5000); });
}

async function call(method: string, p: string, body?: any, headers: Record<string, string> = {}) {
  const res = await fetch(baseUrl + p, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const login = (identifier: string, password: string) => call("POST", "/api/db/auth/login", { identifier, password });
const signedGoogle = (claims: Record<string, any>) => "signed:" + Buffer.from(JSON.stringify({
  aud: CLIENT_ID, email_verified: "true", exp: String(Math.floor(Date.now() / 1000) + 600), sub: "sub-" + rnd(), name: "زائر", ...claims
})).toString("base64url");
const devToken = (email: string) => "dev_test_token:" + Buffer.from(JSON.stringify({ email })).toString("base64");
const ok = (r: any) => r.json?.status === "success";

const report: string[] = [];
const note = (s: string) => { report.push(s); console.log(`ROLLBACK-E2E\t${s}`); };

before(() => {
  assert.ok(PREVIOUS && fs.existsSync(PREVIOUS), "ROLLBACK_SERVER_PATH must point to the previous version's server-core.ts");
});
after(async () => {
  await stopVersion();
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

// ---------------------------------------------------------------- A. NEW version
test("A. new version: support staff change their passwords; a new agent is created", async () => {
  await startVersion(NEW, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });

  // legacy plain-text credential → one sign-in with a mandatory change
  const first = await login("agent_legacy", PW.agentLegacy);
  assert.ok(ok(first), `legacy agent sign-in failed (${first.status})`);
  assert.equal(first.json.mustChangePassword, true);
  const changed = await call("POST", "/api/db/auth/change-password", { newPassword: PW.agentNew }, { "x-session-token": first.json.sessionToken });
  assert.equal(changed.status, 200, `change-password failed: ${changed.status}`);

  const mFirst = await login("manager_legacy", PW.managerLegacy);
  assert.ok(ok(mFirst));
  const mChanged = await call("POST", "/api/db/auth/change-password", { newPassword: PW.managerNew }, { "x-session-token": mFirst.json.sessionToken });
  assert.equal(mChanged.status, 200);

  const admin = await login("admin", PW.admin);
  assert.ok(ok(admin));
  const created = await call("POST", "/api/support/agents/add",
    { name: "موظف جديد", username: "agent_created", password: PW.agentCreated, managerId: "sm-legacy" },
    { "x-session-token": admin.json.sessionToken });
  assert.equal(created.status, 200);
  assert.equal(created.json.agent.password, undefined, "credential returned to the client");
  assert.equal(created.json.agent.passwordHash, undefined, "credential returned to the client");
  assert.ok(created.json.agents.every((a: any) => a.password === undefined && a.passwordHash === undefined));
  const list = await call("GET", "/api/support/agents", undefined, { "x-session-token": admin.json.sessionToken });
  assert.ok(Array.isArray(list.json) && list.json.every((a: any) => a.password === undefined && a.passwordHash === undefined));

  // the new version itself: new passwords work, old ones do not
  assert.ok(ok(await login("agent_legacy", PW.agentNew)));
  assert.ok(!ok(await login("agent_legacy", PW.agentLegacy)), "old password still accepted on the new version");
  assert.ok(ok(await login("manager_legacy", PW.managerNew)));
  assert.ok(!ok(await login("manager_legacy", PW.managerLegacy)));
  assert.ok(ok(await login("agent_created", PW.agentCreated)));
  await stopVersion();

  // stored form: bcrypt hash in BOTH fields, identical; no plain text anywhere in the file
  const raw = fs.readFileSync(dbPath, "utf8");
  const db = JSON.parse(raw);
  for (const rec of [db.supportAgents.find((a: any) => a.id === "sa-legacy"), db.supportManagers.find((m: any) => m.id === "sm-legacy"),
    db.supportAgents.find((a: any) => a.username === "agent_created")]) {
    assert.match(rec.password, /^\$2[aby]\$/);
    assert.equal(rec.password, rec.passwordHash);
  }
  for (const secret of [PW.agentNew, PW.agentLegacy, PW.managerNew, PW.managerLegacy, PW.agentCreated, PW.admin]) {
    assert.ok(!raw.includes(secret), "a plain-text password is stored in the data file");
  }
  note("new version: changed/created support passwords stored as bcrypt in password+passwordHash (identical), no plain text");
});

// ---------------------------------------------------------------- B. PREVIOUS version, same data
test("B. previous version on the same data: changed passwords verify, old passwords are refused", async () => {
  await startVersion(PREVIOUS, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });
  assert.ok(ok(await login("agent_legacy", PW.agentNew)), "previous version cannot verify a password changed after deploy");
  assert.ok(!ok(await login("agent_legacy", PW.agentLegacy)), "previous version accepts the password that was replaced");
  assert.ok(!ok(await login("agent_legacy", `Zz9!${rnd()}`)), "previous version accepts an arbitrary password");
  assert.ok(ok(await login("manager_legacy", PW.managerNew)));
  assert.ok(!ok(await login("manager_legacy", PW.managerLegacy)));
  assert.ok(ok(await login("agent_created", PW.agentCreated)), "agent created after deploy cannot sign in on the previous version");
  assert.ok(!ok(await login("agent_created", `Zz9!${rnd()}`)));
  assert.ok(ok(await login("admin", PW.admin)));
  note("previous version: support agent/manager changed after deploy = OK; replaced password = refused; created agent = OK; admin = OK");
});

// ---------------------------------------------------------------- C. PREVIOUS version, normal settings
test("C. FINDING (previous version, normal settings): Google sign-in grants admin to ANY verified email containing 'admin'", async () => {
  // Same process as B (previous version, GOOGLE_CLIENT_ID = the real client id).
  const stranger = await call("POST", "/api/db/auth/google", { credential: signedGoogle({ email: `someone.admin.${rnd(3)}@example.net` }) });
  const grantedAdmin = ok(stranger) && stranger.json.role === "admin";
  note(`previous version, normal settings: unrelated Google account containing 'admin' → ${grantedAdmin ? "ADMIN SESSION (dangerous path present)" : "refused (" + stranger.status + ")"}`);
  assert.ok(grantedAdmin, "expected to reproduce the known dangerous path of the previous version");
  await stopVersion();
});

// ---------------------------------------------------------------- D. PREVIOUS version, EMERGENCY settings
test("D. previous version with the emergency settings: every Google path is closed, password sign-in keeps working", async () => {
  await startVersion(PREVIOUS, { NODE_ENV: "production", GOOGLE_CLIENT_ID: EMERGENCY_GOOGLE_CLIENT_ID });
  const cases: Array<[string, string]> = [
    ["unrelated account containing 'admin'", signedGoogle({ email: `someone.admin.${rnd(3)}@example.net` })],
    ["the administrator's own Google account", signedGoogle({ email: "owner@example.org" })],
    ["an ordinary member", signedGoogle({ email: `member.${rnd(3)}@example.net` })],
    ["simulated test token (dev_test_token)", devToken(`x.admin.${rnd(3)}@example.net`)]
  ];
  for (const [label, credential] of cases) {
    const r = await call("POST", "/api/db/auth/google", { credential });
    assert.ok(!ok(r), `emergency settings did not block: ${label}`);
    assert.equal(r.status, 401, `${label}: expected 401, got ${r.status}`);
  }
  assert.ok(ok(await login("admin", PW.admin)), "administrators must still sign in with their password");
  assert.ok(ok(await login("agent_legacy", PW.agentNew)), "support staff must still sign in with their password");
  note("previous version + emergency settings: all Google sign-ins refused (401) incl. 'admin' heuristic and test tokens; password sign-in works");
  await stopVersion();
});

test("D2. previous version: the emergency switch needs BOTH settings (test tokens depend on NODE_ENV)", async () => {
  await startVersion(PREVIOUS, { NODE_ENV: "test", GOOGLE_CLIENT_ID: EMERGENCY_GOOGLE_CLIENT_ID });
  const signed = await call("POST", "/api/db/auth/google", { credential: signedGoogle({ email: `someone.admin.${rnd(3)}@example.net` }) });
  const dev = await call("POST", "/api/db/auth/google", { credential: devToken(`x.admin.${rnd(3)}@example.net`) });
  note(`previous version, only GOOGLE_CLIENT_ID switched: signed token → ${signed.status}; test token → ${ok(dev) ? "ACCEPTED (" + dev.json.role + ")" : dev.status}`);
  assert.ok(!ok(signed));
  // Documented dependency: without NODE_ENV=production the previous version accepts test tokens.
  assert.ok(ok(dev), "expected the previous version to accept test tokens outside production");
  await stopVersion();
});

// ---------------------------------------------------------------- E. NEW version, emergency settings
test("E. new version with the emergency settings: Google refused, passwords work (safe to switch before rolling back)", async () => {
  await startVersion(NEW, { NODE_ENV: "production", GOOGLE_CLIENT_ID: EMERGENCY_GOOGLE_CLIENT_ID });
  const r = await call("POST", "/api/db/auth/google", { credential: signedGoogle({ email: "owner@example.org" }) });
  assert.ok(!ok(r));
  const dev = await call("POST", "/api/db/auth/google", { credential: devToken("owner@example.org") });
  assert.ok(!ok(dev));
  assert.ok(ok(await login("admin", PW.admin)));
  assert.ok(ok(await login("agent_legacy", PW.agentNew)));
  note("new version + emergency settings: Google refused, password sign-in works");
  await stopVersion();
});

// ---------------------------------------------------------------- F. roll-forward
test("F. roll-forward: the new version still verifies everything after the previous version ran on the data", async () => {
  await startVersion(NEW, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });
  assert.ok(ok(await login("agent_legacy", PW.agentNew)));
  assert.ok(!ok(await login("agent_legacy", PW.agentLegacy)));
  assert.ok(ok(await login("manager_legacy", PW.managerNew)));
  assert.ok(ok(await login("agent_created", PW.agentCreated)));
  assert.ok(ok(await login("admin", PW.admin)));
  // and the dangerous path does not exist on the new version
  const stranger = await call("POST", "/api/db/auth/google", { credential: signedGoogle({ email: `someone.admin.${rnd(3)}@example.net` }) });
  assert.ok(!(ok(stranger) && stranger.json.role === "admin"));
  note("roll-forward: all credentials verify; 'admin' heuristic absent");
  await stopVersion();
});

test("summary", () => {
  console.log("ROLLBACK-E2E-SUMMARY\t" + report.join(" | "));
});

// ================= FINAL REVIEW (evidence branch only): Google approvals across versions =================
async function adminToken() {
  const a = await login("admin", PW.admin);
  assert.ok(ok(a), "admin sign-in failed");
  return a.json.sessionToken as string;
}
const g = (sub: string) => call("POST", "/api/db/auth/google", { credential: signedGoogle({ email: "owner@example.org", sub }) });

test("G. new version: admin approves own Google sign-in; first sign-in binds the Google account; another account is refused", async () => {
  await startVersion(NEW, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });
  const tok = await adminToken();
  const ap = await call("POST", "/api/db/auth/google-signin/approval", { approve: true, currentPassword: PW.admin }, { "x-session-token": tok });
  assert.equal(ap.status, 200);
  const a = await g("sub-owner-A");
  assert.ok(ok(a) && a.json.role === "admin", `approved Google sign-in failed (${a.status})`);
  const b = await g("sub-other-B");
  assert.ok(!ok(b), "a different Google account was accepted after binding");
  note(`new: approval + binding OK; other Google account → ${b.status}`);
  await stopVersion();
});

test("H. previous version on the same data: approval/binding fields are kept but IGNORED (binding not enforced)", async () => {
  await startVersion(PREVIOUS, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });
  const b = await g("sub-other-B");
  note(`previous: other Google account with the admin's email → ${ok(b) ? "ADMIN SESSION (binding ignored)" : b.status}`);
  await stopVersion();
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const adm = db.userDepartmentAccess.find((u: any) => u.userId === "admin-user");
  assert.equal(adm.googleSignInApproved, true, "previous version dropped the approval flag");
  assert.ok(adm.googleSub, "previous version dropped the binding");
  note("previous: approval + binding fields preserved in data");
});

test("I. roll-forward: binding still enforced; revocation works on the new version", async () => {
  await startVersion(NEW, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });
  assert.ok(ok(await g("sub-owner-A")));
  assert.ok(!ok(await g("sub-other-B")));
  const tok = await adminToken();
  const rv = await call("POST", "/api/db/auth/google-signin/approval", { approve: false, currentPassword: PW.admin }, { "x-session-token": tok });
  assert.equal(rv.status, 200);
  const after = await g("sub-owner-A");
  assert.ok(!ok(after), "revoked Google sign-in still works on the new version");
  note(`roll-forward: binding enforced; after revocation → ${after.status}`);
  await stopVersion();
});

test("J. previous version after a revocation made on the new version: revocation is IGNORED", async () => {
  await startVersion(PREVIOUS, { NODE_ENV: "test", GOOGLE_CLIENT_ID: CLIENT_ID });
  const r = await g("sub-owner-A");
  note(`previous: revoked admin Google sign-in → ${ok(r) ? "ADMIN SESSION (revocation ignored)" : r.status}`);
  await stopVersion();
  await startVersion(PREVIOUS, { NODE_ENV: "production", GOOGLE_CLIENT_ID: EMERGENCY_GOOGLE_CLIENT_ID });
  const r2 = await g("sub-owner-A");
  note(`previous + emergency settings: revoked admin Google sign-in → ${ok(r2) ? "SESSION" : r2.status}`);
  assert.ok(!ok(r2));
  await stopVersion();
});

test("summary-2", () => { console.log("ROLLBACK-E2E-SUMMARY-2\t" + report.join(" | ")); });
