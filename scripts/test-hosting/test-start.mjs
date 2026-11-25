// TEST HOSTING ENTRYPOINT — synthetic data only, never production.
// 1. Refuses to start if ANY production database or secret variable is present.
// 2. Forces file storage (JSON) on the container's own ephemeral disk.
// 3. Creates synthetic data on first boot; the test admin password comes from TEST_ADMIN_PASSWORD
//    (set by the operator in the hosting dashboard; never stored in the repository or printed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { buildSyntheticDb } from "./synthetic-data.mjs";

const require = createRequire(import.meta.url);

const FORBIDDEN = [
  "DATABASE_URL", "POSTGRES_URL", "POSTGRESQL_URL", "PG_URL", "TEST_DATABASE_URL", "PGHOST", "PGPASSWORD", "PGUSER",
  "RESEND_API_KEY", "SMTP_PASS", "SMTP_USER", "R2_SECRET_ACCESS_KEY", "R2_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
  "AWS_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "STORAGE_SECRET_ACCESS_KEY",
  "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_TOKEN", "GEMINI_API_KEY", "BACKUP_ENCRYPTION_KEY_HEX", "GOOGLE_CLIENT_ID", "VITE_GOOGLE_CLIENT_ID"
];
const present = FORBIDDEN.filter((k) => (process.env[k] || "").trim() !== "");
if (present.length) {
  console.error(`[TEST HOSTING] Refusing to start: production-type variables are set (${present.join(", ")}). ` +
    "This copy runs on synthetic data only. Remove them from the hosting dashboard.");
  process.exit(1);
}
if (/^postgres/i.test(process.env.STORAGE_BACKEND || "")) {
  console.error("[TEST HOSTING] Refusing to start: STORAGE_BACKEND must not be postgres in the test copy.");
  process.exit(1);
}

process.env.NODE_ENV = "production";          // makes the server honour PORT and listen on 0.0.0.0
process.env.STORAGE_BACKEND = "json";
const dbPath = process.env.APP_DB_PATH || path.resolve(".test-data/db.json");
process.env.APP_DB_PATH = dbPath;

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const pw = process.env.TEST_ADMIN_PASSWORD || "";
  let adminPasswordHash;
  if (pw.length >= 12) {
    adminPasswordHash = require("bcryptjs").hashSync(pw, 10);
  } else {
    console.warn("[TEST HOSTING] TEST_ADMIN_PASSWORD not set (min 12 chars): the test admin account is disabled.");
  }
  const scale = Math.max(1, Math.min(200, Number(process.env.TEST_DATA_SCALE || 1) || 1));
  const imageKb = Math.max(0, Math.min(500, Number(process.env.TEST_DATA_IMAGE_KB || 0) || 0));
  const db = buildSyntheticDb({ scale, imageKb, adminPasswordHash });
  fs.writeFileSync(dbPath, JSON.stringify(db));
  console.log(`[TEST HOSTING] Synthetic data created (scale=${scale}, imageKb=${imageKb}, ${(fs.statSync(dbPath).size / 1048576).toFixed(1)} MB).`);
}

// The server inserts built-in sample content at start-up (sample initiatives, letters, requests, custodies
// that carry the association's name and official domain). The test copy must hold synthetic data only, so
// those records are removed from the in-memory state and the data file BEFORE the server starts listening,
// on every boot.
import http from "node:http";
const SYNTHETIC_ID = /^(init|vol|ben|team|item|dist|log|n|att|dep|wh|perm)-/;
const REAL_MARKERS = /riadataleata|ريادة العطاء|العسيلة/i;
function removeBuiltInSamples(db) {
  const removed = {};
  for (const [key, val] of Object.entries(db)) {
    if (!Array.isArray(val)) continue;
    const keep = val.filter((rec) => {
      if (key === "initiatives") return rec && SYNTHETIC_ID.test(String(rec.id || ""));
      try { return !REAL_MARKERS.test(JSON.stringify(rec)); } catch { return true; }
    });
    if (keep.length !== val.length) { removed[key] = val.length - keep.length; db[key] = keep; }
  }
  if (db.homeSettings && Array.isArray(db.homeSettings.orgMembers)) {
    db.homeSettings.orgMembers = db.homeSettings.orgMembers.filter((m) => !REAL_MARKERS.test(JSON.stringify(m)));
  }
  return removed;
}
const originalListen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  http.Server.prototype.listen = originalListen;
  try {
    const core = require(path.resolve("dist/server.cjs"));
    const db = core.readDb();
    const removed = removeBuiltInSamples(db);
    core.writeDb(db);
    console.log(`[TEST HOSTING] Built-in sample records removed: ${JSON.stringify(removed)}`);
  } catch (err) {
    console.error("[TEST HOSTING] Could not clean built-in samples; refusing to start.", err && err.message);
    process.exit(1);
  }
  return originalListen.apply(this, args);
};

require(path.resolve("dist/server.cjs"));
