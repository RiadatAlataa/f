/**
 * FINAL REVIEW (evidence): what the CURRENTLY DEPLOYED code (PR base = main) exposes about support staff,
 * reproduced on synthetic data in an isolated child process. No production system is contacted.
 * Prints "DEPLOYED" lines (no secrets).
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, ChildProcess } from "node:child_process";

const PREVIOUS = process.env.ROLLBACK_SERVER_PATH || "";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-deployed-"));
const dbPath = path.join(dir, "db.json");
const SECRET = `Agent${crypto.randomBytes(6).toString("hex")}!9`;
fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "اختبار" }, homeSettings: {}, departments: [{ id: "dep-1", nameAr: "تنفيذي" }], teams: [], volunteers: [], beneficiaries: [],
  employees: [], storekeepers: [], userDepartmentAccess: [], logs: [], accessAuditLogs: [], activeSessions: [], notifications: [],
  supportManagers: [{ id: "sm-1", name: "مدير دعم", username: "manager_x", status: "active", password: SECRET + "m" }],
  supportAgents: [{ id: "sa-1", name: "دعم", username: "agent_x", status: "active", password: SECRET }]
}));
let child: ChildProcess | null = null;
after(() => { try { child?.kill("SIGKILL"); } catch {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });

async function start(): Promise<string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(DATABASE_URL|STORAGE_BACKEND|REQUIRE_|VERCEL|RENDER|GOOGLE|NODE_ENV)/.test(k)) env[k] = v;
  env.APP_DB_PATH = dbPath; env.NODE_ENV = "production";
  child = spawn(process.execPath, ["--import", "tsx", path.resolve("test/rollback/serve-version.ts"), PREVIOUS], { env, stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("no start")), 90000);
    child!.stdout!.on("data", (d) => { buf += d; const m = /LISTENING (\d+)/.exec(buf); if (m) { clearTimeout(t); resolve(`http://127.0.0.1:${m[1]}`); } });
    child!.stderr!.on("data", () => {});
  });
}

test("deployed version: support-staff exposure to an anonymous visitor", async () => {
  assert.ok(PREVIOUS && fs.existsSync(PREVIOUS));
  const base = await start();
  const j = async (method: string, p: string, body?: any) => {
    const r = await fetch(base + p, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, text, json };
  };
  const list = await j("GET", "/api/support/agents");
  const listLeaks = list.text.includes(SECRET);
  const mgr = await j("GET", "/api/db");
  const dbLeaks = mgr.text.includes(SECRET);
  const added = await j("POST", "/api/support/agents/add", { name: "دخيل", username: "intruder_x" });
  const intruderLogin = await j("POST", "/api/db/auth/login", { identifier: "intruder_x", password: "123" });
  const knownLogin = await j("POST", "/api/db/auth/login", { identifier: "agent_x", password: SECRET });
  console.log(`DEPLOYED\tanonymous GET /api/support/agents\tstatus=${list.status}\tplainPasswordsReturned=${listLeaks}`);
  console.log(`DEPLOYED\tanonymous GET /api/db\tstatus=${mgr.status}\tsupportPasswordsReturned=${dbLeaks}`);
  console.log(`DEPLOYED\tanonymous POST /api/support/agents/add\tstatus=${added.status}\tthen sign-in with default "123" → ${intruderLogin.json?.status === "success" ? "SESSION(" + intruderLogin.json.role + ")" : intruderLogin.status}`);
  console.log(`DEPLOYED\tsign-in with a password read from the list\t${knownLogin.json?.status === "success" ? "SESSION(" + knownLogin.json.role + ")" : knownLogin.status}`);
});
