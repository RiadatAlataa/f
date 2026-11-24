/**
 * Route access matrix — every API route registered on the Express app is called:
 *   1. anonymously (no session, forged identity headers), and
 *   2. with a low-privilege VOLUNTEER session,
 * against an isolated SYNTHETIC database (its own temp dir; nothing real is touched).
 *
 * For each route it records the HTTP status and whether the handler consulted the access-control
 * resolvers at all (via the __accessProbe counter). A route that is not on the explicit PUBLIC list
 * must never answer 2xx to an anonymous caller and must always run an access check.
 *
 * Output lines are prefixed with "MATRIX" (method, path, status, checked) — no data or secrets.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-matrix-"));
const dbPath = path.join(sandboxDir, "synthetic-db.json");
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "REQUIRE_PERMANENT_STORAGE", "REQUIRE_R2_STORAGE", "VERCEL", "RENDER",
  "GEMINI_API_KEY", "RESEND_API_KEY", "SMTP_HOST", "AWS_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID"]) {
  delete process.env[k];
}
process.env.APP_DB_PATH = dbPath;
process.env.NODE_ENV = "test";

fs.writeFileSync(dbPath, JSON.stringify({
  systemSettings: { societyName: "جمعية اختبار" }, homeSettings: {},
  news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
  departments: [{ id: "dep-1", nameAr: "تنفيذي" }, { id: "dep-5", nameAr: "تطوع" }],
  teams: [{ id: "team-a", nameAr: "فريق أ", departmentId: "dep-5", status: "active" }],
  volunteers: [{ id: "vol-a", name: "متطوع أ", nationalId: "1900000001", teamId: "team-a", status: "active" }],
  beneficiaries: [], employees: [], storekeepers: [], supportManagers: [], supportAgents: [],
  userDepartmentAccess: [], passwordResetRequests: [], notifications: [], supportTickets: [],
  initiatives: [], requests: [], logs: [], accessAuditLogs: [], activeSessions: []
}), "utf8");

/**
 * Routes that are intentionally reachable without a session (public website, sign-in / recovery,
 * self-registration, health). Everything else must require a verified session.
 */
const PUBLIC_ROUTES = new Set<string>([
  "GET /robots.txt", "GET /google6b1a5bb23d6c4515.html",
  "GET /api", "GET /api/", "GET /api/health", "GET /api/health/", "GET /health", "GET /health/", "GET /api/ping",
  "GET /api/db", "GET /api/db/scoped", "GET /api/sitemap.xml", "GET /api/health/db", "GET /api/health/db/",
  "GET /api/db/org-members",
  "GET /api/maintenance/status", "GET /api/db/maintenance/status",
  "GET /api/public/verify-card/:code", "GET /api/db/opportunities/by-code/:code",
  "POST /api/admin/system/bootstrap",
  "POST /api/db/auth/login", "POST /api/db/auth/login-remembered", "POST /api/db/auth/google",
  "POST /api/db/auth/google/complete-registration",
  "POST /api/db/auth/forgot-password", "POST /api/db/auth/verify-otp", "POST /api/db/auth/verify-reset-token",
  "POST /api/db/auth/reset-password-with-otp", "POST /api/db/auth/forgot-password/identify",
  "POST /api/db/auth/forgot-password/send-otp", "POST /api/db/auth/forgot-password/verify-otp",
  "POST /api/db/auth/forgot-password/reset", "POST /api/db/auth/remember-status", "POST /api/db/auth/pin/login",
  "POST /api/db/auth/logout", "GET /api/db/auth/session", "POST /api/auth/reset-password-with-token",
  "POST /api/db/auth/validate-password-strength",
  "POST /api/db/volunteerApplications/submit", "POST /api/db/teamApplications/submit",
  "POST /api/db/teamApplications/upload-license", "POST /api/db/beneficiaries/add",
  "POST /api/db/store/donate", "GET /api/db/systemSettings", "POST /api/logs/developer-error",
  // password-recovery link flow (server/passwordResetService.ts) — public by design, token-gated
  "GET /api/db/auth/recovery-config", "POST /api/db/auth/forgot-password/request-link",
  "POST /api/db/auth/reset-password/validate", "GET /api/db/auth/reset-password/validate",
  "POST /api/db/auth/reset-password/confirm",
  // inbound provider webhook
  "POST /api/whatsapp/webhook",
  // public website assistant (reviewed: residual cost-abuse risk, see report)
  "POST /api/ai/chat"
]);

let server: http.Server;
let baseUrl = "";
let core: any;
let volToken = "";

type Row = { key: string; status: number; checked: boolean; volStatus?: number };
const rows: Row[] = [];

function listRoutes(app: any): { method: string; path: string }[] {
  const out: { method: string; path: string }[] = [];
  const seen = new Set<string>();
  const walk = (stack: any[]) => {
    for (const layer of stack || []) {
      if (layer?.route) {
        const r = layer.route;
        const paths = Array.isArray(r.path) ? r.path : [r.path];
        for (const p of paths) {
          if (typeof p !== "string") continue;
          for (const m of Object.keys(r.methods || {})) {
            if (m === "_all") continue;
            const key = `${m.toUpperCase()} ${p}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ method: m.toUpperCase(), path: p });
          }
        }
      } else if (layer?.handle?.stack) {
        walk(layer.handle.stack); // mounted sub-routers
      }
    }
  };
  walk(app?._router?.stack || []);
  const stack = app?._router?.stack || [];
  console.log(`MATRIX-DIAG\tstackLayers=${stack.length}\trouteLayers=${stack.filter((l: any) => l.route).length}\troutes=${out.length}\tlast=${out.length ? out[out.length - 1].method + " " + out[out.length - 1].path : "-"}`);
  return out;
}

const concretePath = (p: string) => p.replace(/:[A-Za-z_]+/g, "probe-id").replace(/\*/g, "probe");

async function probe(method: string, p: string, token?: string): Promise<{ status: number; checked: boolean }> {
  const before = core.__accessProbe.calls;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    // forged identity: must be ignored by the server
    "x-user-role": "admin", "x-user-id": "admin-user", "x-department-id": "dep-1"
  };
  if (token) headers["x-session-token"] = token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let status = 0;
  try {
    const res = await fetch(baseUrl + concretePath(p), {
      method, headers, signal: ctrl.signal,
      body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify({ userRole: "admin" })
    });
    status = res.status;
    await res.arrayBuffer();
  } catch {
    status = -1; // timeout / connection reset
  } finally {
    clearTimeout(timer);
  }
  return { status, checked: core.__accessProbe.calls > before };
}

before(async () => {
  core = await import("../../server-core");
  core.reloadDbFromDisk();
  server = http.createServer(core.default);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  volToken = core.createServerSession({ id: "vol-a", name: "متطوع أ", nationalId: "1900000001", role: "volunteer", teamId: "team-a" }, "volunteer").token;
});

after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
});

test("route access matrix: no non-public route is reachable anonymously or without an access check", async () => {
  // Late-registered routes: give any deferred registration a moment before reading the table.
  await new Promise((r) => setTimeout(r, 1500));
  const allRoutes = listRoutes(core.default);
  const routes = allRoutes.filter((r) => r.path.startsWith("/api"));
  assert.ok(routes.length > 200, `expected the full route table, found ${routes.length}`);

  // Full report of EVERY registered route (public ones are probed anonymously too, for the record).
  const report: string[] = ["method,path,class,policy,anonymous_status,access_check_ran,volunteer_status,verdict"];
  const table0: any[] = core.__routePolicyTable || [];
  const policyOf = (method: string, p: string) => {
    const rule = table0.find((r: any) => (r.method === "*" || r.method === method) && r.rx.test(concretePath(p)));
    return rule ? rule.policy : "handler";
  };
  for (const r of allRoutes) {
    const key = `${r.method} ${r.path}`;
    const isPublic = PUBLIC_ROUTES.has(key) || !r.path.startsWith("/api");
    if (isPublic) {
      const anon = await probe(r.method, r.path);
      report.push([r.method, r.path, r.path.startsWith("/api") ? "public" : "public-website", "public", anon.status, anon.checked ? "yes" : "no", "-", "public by design"].join(","));
      continue;
    }
    const anon = await probe(r.method, r.path);
    const vol = await probe(r.method, r.path, volToken);
    rows.push({ key, status: anon.status, checked: anon.checked, volStatus: vol.status });
    const pol = policyOf(r.method, r.path);
    const anonOk = !(anon.status >= 200 && anon.status < 300) && (anon.checked || anon.status === 401 || anon.status === 403);
    const volOk = pol === "handler" || pol === "authenticated" || !(vol.status >= 200 && vol.status < 300);
    report.push([r.method, r.path, "protected", pol, anon.status, anon.checked ? "yes" : "no", vol.status, anonOk && volOk ? "PASS" : "FAIL"].join(","));
  }
  console.log(`MATRIX-TOTAL\tregistered=${allRoutes.length}\tpublic=${allRoutes.length - rows.length}\tprotected=${rows.length}`);
  if (process.env.MATRIX_REPORT_PATH) {
    fs.writeFileSync(process.env.MATRIX_REPORT_PATH, report.join("\n") + "\n", "utf8");
  }

  const open = rows.filter((x) => x.status >= 200 && x.status < 300);
  const unchecked = rows.filter((x) => !x.checked && !(x.status === 401 || x.status === 403));
  for (const x of rows) {
    console.log(`MATRIX\t${x.key}\tanon=${x.status}\tchecked=${x.checked ? "yes" : "NO"}\tvolunteer=${x.volStatus}`);
  }
  console.log(`MATRIX-SUMMARY\troutes=${rows.length}\topenAnon=${open.length}\tnoAccessCheck=${unchecked.length}`);

  // Routes the central policy marks staff / admin / department-only must refuse a volunteer.
  const table: any[] = core.__routePolicyTable || [];
  const staffOnlyServedToVolunteer = rows.filter((x) => {
    const [method, p] = x.key.split(" ");
    const concrete = concretePath(p);
    const rule = table.find((r: any) => (r.method === "*" || r.method === method) && r.rx.test(concrete));
    return rule && rule.policy !== "public" && rule.policy !== "authenticated" &&
      typeof x.volStatus === "number" && x.volStatus >= 200 && x.volStatus < 300;
  });

  assert.deepEqual(open.map((x) => x.key), [], "non-public routes answered 2xx to an anonymous caller");
  assert.deepEqual(unchecked.map((x) => x.key), [], "non-public routes never consulted access control");
  assert.deepEqual(staffOnlyServedToVolunteer.map((x) => x.key), [], "staff/admin/department routes served a volunteer");
});
