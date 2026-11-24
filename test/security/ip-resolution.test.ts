/**
 * Client-IP resolution — CHARACTERISATION tests (they document the CURRENT behaviour of
 * resolveTrustedClientIp in server-core.ts; they do not prove anything about production proxies).
 *
 * The real number of proxies in front of the production server is NOT known (not documented by the
 * host). These tests show what each assumption produces, including the shared-IP outcome.
 * Tests marked `todo` describe the behaviour the proposed fix must achieve; they are reported, not failed.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "reyadat-sec-ip-"));
process.env.APP_DB_PATH = path.join(sandboxDir, "db.json");
fs.writeFileSync(process.env.APP_DB_PATH, JSON.stringify({ volunteers: [], departments: [], userDepartmentAccess: [], activeSessions: [] }));
for (const k of ["DATABASE_URL", "STORAGE_BACKEND", "TRUSTED_PROXY_HOPS"]) delete process.env[k];
process.env.NODE_ENV = "test";

let resolve: (req: any) => string;
before(async () => {
  const core: any = await import("../../server-core");
  resolve = core.resolveTrustedClientIp;
});

const req = (xff: string | undefined, socket = "10.0.0.1") => ({ headers: xff ? { "x-forwarded-for": xff } : {}, socket: { remoteAddress: socket } });
const withHops = (hops: string | undefined, fn: () => void) => {
  const saved = process.env.TRUSTED_PROXY_HOPS;
  if (hops === undefined) delete process.env.TRUSTED_PROXY_HOPS; else process.env.TRUSTED_PROXY_HOPS = hops;
  try { fn(); } finally { if (saved === undefined) delete process.env.TRUSTED_PROXY_HOPS; else process.env.TRUSTED_PROXY_HOPS = saved; }
};

// Topology A: exactly ONE trusted proxy appends the client address.
//   client 198.51.100.7 → proxy(10.0.0.1)  ⇒  XFF "198.51.100.7", socket 10.0.0.1
test("hops=1 (default) with ONE appending proxy → real client; forged left entries ignored", () => {
  withHops(undefined, () => {
    assert.equal(resolve(req("198.51.100.7")), "198.51.100.7");
    assert.equal(resolve(req("6.6.6.6, 198.51.100.7")), "198.51.100.7");
  });
});

// Topology B: THREE proxies, each appending the previous hop (as one community report suggests).
//   client 198.51.100.7 → P1(172.16.0.1) → P2(172.16.0.2) → P3(10.0.0.1)
//   ⇒ XFF "198.51.100.7, 172.16.0.1, 172.16.0.2", socket 10.0.0.1
test("CURRENT RISK: hops=1 with THREE proxies → every client resolves to the same internal proxy IP", () => {
  withHops(undefined, () => {
    const a = resolve(req("198.51.100.7, 172.16.0.1, 172.16.0.2"));
    const b = resolve(req("203.0.113.9, 172.16.0.1, 172.16.0.2"));
    assert.equal(a, "172.16.0.2");
    assert.equal(a, b, "different visitors collapse to one IP under this topology");
  });
});

test("hops=3 with THREE proxies → real client; forged left entries ignored", () => {
  withHops("3", () => {
    assert.equal(resolve(req("198.51.100.7, 172.16.0.1, 172.16.0.2")), "198.51.100.7");
    assert.equal(resolve(req("6.6.6.6, 198.51.100.7, 172.16.0.1, 172.16.0.2")), "198.51.100.7");
  });
});

test("RISK OF OVER-TRUST: hops=3 with only ONE real proxy → client-controlled entries are trusted (spoofable)", () => {
  withHops("3", () => {
    // attacker sends XFF "1.1.1.1, 2.2.2.2"; the single real proxy appends the attacker's real IP
    const forged = resolve(req("1.1.1.1, 2.2.2.2, 198.51.100.66"));
    assert.equal(forged, "1.1.1.1", "the attacker chose the resolved IP");
  });
});

test("via Vercel rewrite: Vercel overwrites XFF, so the hop counted next to the client is a Vercel egress IP", () => {
  // client → Vercel (XFF := client) → host proxy appends Vercel egress 76.76.21.21
  withHops(undefined, () => {
    assert.equal(resolve(req("198.51.100.7, 76.76.21.21")), "76.76.21.21");
  });
});

test("invalid / non-IP values fall back to the socket address", () => {
  withHops(undefined, () => {
    assert.equal(resolve(req("not-an-ip")), "10.0.0.1");
  });
});

// The shared-address risk above is handled by the two-tier limits (trusted address → flood ceiling only;
// per-visitor key → fairness; per-account budgets → the real defence). Server-level proof, including the
// three previously-pending cases, is in ip-limits.test.ts.
