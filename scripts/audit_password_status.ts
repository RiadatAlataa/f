/**
 * READ-ONLY password-status audit — prints COUNTS ONLY (no names, ids, emails, phones or secrets).
 *
 * Purpose: tell the association how many accounts will need a verified password reset before/after
 * the security fixes are deployed, without exposing anyone's data.
 *
 * Usage (run by an authorised person on a trusted machine):
 *   npx tsx scripts/audit_password_status.ts --file ./export.json     # a JSON export of the system state
 *   DATABASE_URL=... npx tsx scripts/audit_password_status.ts --postgres
 *
 * Safety:
 *   - The Postgres mode opens a READ ONLY transaction and only runs one SELECT; it never creates,
 *     migrates or writes anything, and it always ends with ROLLBACK.
 *   - Nothing is written to disk. Output is aggregate counts per collection.
 */
import fs from "node:fs";
import bcrypt from "bcryptjs";

const KNOWN_PUBLIC_DEFAULTS = ["123", "mosa11", "A123b456"];
const COLLECTIONS = ["userDepartmentAccess", "employees", "departments", "teams", "volunteers", "beneficiaries",
  "storekeepers", "supportManagers", "supportAgents"];

type Counts = { total: number; noCredential: number; legacyPlaintext: number; publicDefault: number; mustChange: number };

const isHash = (s: string) => /^(\$2[aby]\$|pbkdf2\$|sha256\$)/.test(s);

function classify(record: any): { none: boolean; plain: boolean; publicDefault: boolean } {
  const hash = typeof record?.passwordHash === "string" && record.passwordHash.trim() ? record.passwordHash : "";
  const pwd = typeof record?.password === "string" && record.password.trim() ? record.password : "";
  const stored = hash || pwd;
  if (!stored) return { none: true, plain: false, publicDefault: false };
  if (!isHash(stored)) {
    return { none: false, plain: true, publicDefault: KNOWN_PUBLIC_DEFAULTS.includes(stored.trim()) };
  }
  let publicDefault = false;
  if (stored.startsWith("$2")) {
    for (const d of KNOWN_PUBLIC_DEFAULTS) {
      try { if (bcrypt.compareSync(d, stored)) { publicDefault = true; break; } } catch {}
    }
  }
  return { none: false, plain: false, publicDefault };
}

async function loadState(): Promise<any> {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    return JSON.parse(fs.readFileSync(args[fileIdx + 1], "utf8"));
  }
  if (args.includes("--postgres")) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const r = await client.query("SELECT data FROM system_state WHERE id = 'primary' LIMIT 1");
      return r.rows?.[0]?.data || {};
    } finally {
      try { await client.query("ROLLBACK"); } catch {}
      await client.end();
    }
  }
  throw new Error("Pass --file <export.json> or --postgres");
}

async function main() {
  const db = await loadState();
  const out: Record<string, Counts> = {};
  const totals: Counts = { total: 0, noCredential: 0, legacyPlaintext: 0, publicDefault: 0, mustChange: 0 };
  for (const name of COLLECTIONS) {
    const list = Array.isArray(db?.[name]) ? db[name] : [];
    const c: Counts = { total: 0, noCredential: 0, legacyPlaintext: 0, publicDefault: 0, mustChange: 0 };
    for (const rec of list) {
      if (!rec || typeof rec !== "object") continue;
      if (rec.isArchived === true || rec.status === "archived" || rec.loginDisabled === true || rec.hasLoginAccount === false) continue;
      c.total++;
      const k = classify(rec);
      if (k.none) c.noCredential++;
      if (k.plain && !k.publicDefault) c.legacyPlaintext++; // user-chosen plain text (not a published default)
      if (k.publicDefault) c.publicDefault++;
      if (rec.mustChangePassword === true) c.mustChange++;
    }
    out[name] = c;
    for (const key of Object.keys(totals) as (keyof Counts)[]) totals[key] += c[key];
  }
  console.log("Password status (active login-capable records; counts only):");
  console.table(out);
  console.log("TOTAL", totals);
  console.log("needsVerifiedReset (no credential + published default):", totals.noCredential + totals.publicDefault);
  console.log("forcedChangeOnNextLogin (legacy plain text, not a published default):", totals.legacyPlaintext);
}

main().catch((e) => {
  console.error("audit failed:", e?.message || e);
  process.exit(1);
});
