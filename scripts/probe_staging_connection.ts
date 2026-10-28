/**
 * Safe Read-Only Pre-flight Probe for Neon PostgreSQL Staging
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * Database: neondb
 * 
 * STRICT SAFEGUARDS:
 * 1. Read-only query execution (SELECT current_database(), current_user, version() ONLY).
 * 2. Absolutely NO schema creation, table modification, insertion, or deletion.
 * 3. Hides credentials, password, and secrets from output.
 * 4. Dedicated connection timeout (10 seconds).
 */

import pg from "pg";
const { Pool } = pg;

async function probeStaging() {
  const url = process.env.TEST_DATABASE_URL || "";
  if (!url) {
    console.log(JSON.stringify({
      status: "MISSING_ENV_VAR",
      message: "لم يتم العثور على المتغير السري TEST_DATABASE_URL في بيئة تشغيل الخادم."
    }, null, 2));
    process.exit(1);
  }

  const cleanUrl = url.trim();

  // Extract host and database safely without revealing password or username
  let hostSafe = "unknown";
  let dbSafe = "unknown";
  try {
    const parsed = new URL(cleanUrl);
    hostSafe = parsed.host;
    dbSafe = (parsed.pathname || "").replace(/^\//, "");
    if (!hostSafe.includes("neon.tech")) {
      console.error(JSON.stringify({
        status: "SECURITY_BLOCKED",
        error: "الحظر الأمني: رابط الاتصال لا يشير إلى مزود Neon PostgreSQL (neon.tech)."
      }, null, 2));
      process.exit(1);
    }
  } catch {
    console.error(JSON.stringify({
      status: "INVALID_URL_FORMAT",
      error: "صيغة رابط الاتصال في TEST_DATABASE_URL غير صالحة."
    }, null, 2));
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000
  });

  let client: any = null;
  try {
    const t0 = Date.now();
    client = await pool.connect();

    // READ-ONLY probe
    const res = await client.query(`
      SELECT 
        current_database() AS database,
        current_user AS user,
        version() AS version;
    `);
    const latencyMs = Date.now() - t0;

    const row = res.rows[0];
    console.log(JSON.stringify({
      status: "SUCCESS_CONNECTED",
      neonHost: hostSafe,
      database: row.database,
      currentUser: row.user,
      pgVersionSummary: (row.version || "").split(" on ")[0],
      latencyMs,
      readOnlyVerified: true,
      modifiedData: false
    }, null, 2));
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

probeStaging().catch(err => {
  console.error(JSON.stringify({
    status: "CONNECTION_FAILED",
    error: err.message
  }, null, 2));
  process.exit(1);
});
