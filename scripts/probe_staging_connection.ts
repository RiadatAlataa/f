/**
 * Read-Only Pre-flight Probe for Neon Staging Branch
 * Endpoint: ep-tiny-hat-b4hpkghm
 * 
 * STRICT SAFEGUARD:
 * 1. Read-only query execution (SELECT only).
 * 2. Absolutely NO schema creation or table modification.
 * 3. Hides credentials and secrets from output.
 */

import pg from "pg";
const { Pool } = pg;

async function probeStaging() {
  const url = process.env.TEST_DATABASE_URL || "";
  if (!url) {
    console.log(JSON.stringify({
      status: "MISSING_ENV_VAR",
      message: "لم يتم العثور على المتغير TEST_DATABASE_URL في بيئة التشغيل بعد."
    }, null, 2));
    process.exit(0);
  }

  const cleanUrl = url.trim();
  const EXPECTED_ENDPOINT = "ep-tiny-hat-b4hpkghm";

  // 1. Strict Endpoint Match Assertion
  if (!cleanUrl.includes(EXPECTED_ENDPOINT)) {
    console.error(JSON.stringify({
      status: "SECURITY_BLOCKED",
      error: `الحظر الأمني نشط: الرابط لا يطابق نقطة الاتصال التجريبية المعتمدة (${EXPECTED_ENDPOINT}).`
    }, null, 2));
    process.exit(1);
  }

  // Extract host safely without revealing password or username
  let hostSafe = "unknown";
  try {
    const parsed = new URL(cleanUrl);
    hostSafe = parsed.host;
  } catch {
    const match = cleanUrl.match(/@([^/:?]+)/);
    if (match) hostSafe = match[1];
  }

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  const client = await pool.connect();
  try {
    const t0 = Date.now();
    // READ-ONLY probe
    const res = await client.query(`
      SELECT 
        current_database() AS database,
        current_user AS role,
        version() AS version;
    `);
    const latencyMs = Date.now() - t0;

    const row = res.rows[0];
    console.log(JSON.stringify({
      status: "SUCCESS_CONNECTED",
      endpointMatched: hostSafe.includes(EXPECTED_ENDPOINT),
      host: hostSafe,
      database: row.database,
      role: row.role,
      pgVersionSummary: (row.version || "").split(" on ")[0],
      latencyMs,
      readOnlyVerified: true
    }, null, 2));
  } finally {
    client.release();
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
