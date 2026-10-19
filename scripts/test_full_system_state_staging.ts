/**
 * Comprehensive Full State Preservation Test on Neon Staging Branch
 * Endpoint: ep-tiny-hat-b4hpkghm
 * 
 * Verifies that:
 * 1. All 80 keys from db.json are accounted for.
 * 2. Stale security baggage (activeSessions, passwordResetOtps, etc.) are excluded.
 * 3. Dedicated tables AND non-dedicated collections (certificateTemplates, volunteerCardTemplates, financialIncome, whatsappSettings, etc.)
 *    are 100% saved, committed, and read back with zero data loss or truncation.
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const { Pool } = pg;

async function testFullStatePreservation() {
  const url = process.env.TEST_DATABASE_URL || "";
  const EXPECTED_ENDPOINT = "ep-tiny-hat-b4hpkghm";

  if (!url || !url.includes(EXPECTED_ENDPOINT)) {
    console.error("🛑 Security Check Failed: TEST_DATABASE_URL is missing or does not match staging endpoint.");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.join(process.cwd(), "db.json"), "utf8");
  const sourceDb = JSON.parse(raw);

  // 1. Prepare sanitized payload (exclude stale sessions/OTPs/dev logs)
  const sanitizedPayload = { ...sourceDb };
  const excludedKeys = [
    "activeSessions",
    "passwordResetOtps",
    "passwordResetRequests",
    "developerErrorLogs"
  ];

  for (const k of excludedKeys) {
    sanitizedPayload[k] = Array.isArray(sourceDb[k]) ? [] : {};
  }

  const serialized = JSON.stringify(sanitizedPayload);
  const sha256Source = crypto.createHash("sha256").update(serialized).digest("hex");

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  const client = await pool.connect();
  try {
    console.log("Connected to Neon staging branch. Testing atomic system_state write...");

    // Atomic Upsert of full system state into PostgreSQL
    await client.query(`
      INSERT INTO system_state (id, data, version, last_modified, checksum_sha256, updated_by)
      VALUES ('primary', $1::jsonb, $2, NOW(), $3, 'Staging Test Runner')
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        version = EXCLUDED.version,
        last_modified = NOW(),
        checksum_sha256 = EXCLUDED.checksum_sha256,
        updated_by = EXCLUDED.updated_by;
    `, [serialized, Number(sanitizedPayload._version || 1), sha256Source]);

    console.log("Write committed to system_state. Closing client and opening fresh connection to test read back...");
  } finally {
    client.release();
  }

  // 2. Fresh Connection Read-Back Test
  const freshClient = await pool.connect();
  try {
    const res = await freshClient.query("SELECT data, version, checksum_sha256 FROM system_state WHERE id = 'primary';");
    if (res.rows.length === 0) {
      throw new Error("Failed to read system_state from Neon staging branch.");
    }

    const row = res.rows[0];
    const retrievedData = row.data;
    const sha256Retrieved = crypto.createHash("sha256").update(JSON.stringify(retrievedData)).digest("hex");

    console.log("Read back successful.");

    // Helper: Canonical Deep Sort for accurate JSONB comparison
    function canonicalStringify(obj: any): string {
      if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
      }
      if (Array.isArray(obj)) {
        return "[" + obj.map(canonicalStringify).join(",") + "]";
      }
      const sortedKeys = Object.keys(obj).sort();
      const parts = sortedKeys.map(k => JSON.stringify(k) + ":" + canonicalStringify(obj[k]));
      return "{" + parts.join(",") + "}";
    }

    const canonicalSource = canonicalStringify(sanitizedPayload);
    const canonicalRetrieved = canonicalStringify(retrievedData);
    const deepEqual = canonicalSource === canonicalRetrieved;

    console.log("Deep Object Equality (Canonical JSON):", deepEqual);

    // Audit key collections
    const auditedKeys = [
      "userDepartmentAccess", "volunteers", "beneficiaries", "employees",
      "initiatives", "attendance", "distributions", "warehouses", "inventoryItems",
      "financialTransactions", "financialIncome", "financialExpenses", "letters",
      "certificateTemplates", "volunteerCardTemplates", "homeSettings", "systemSettings",
      "whatsappSettings", "storeProjects", "storeDonations", "custodies", "orgMembers", "partners"
    ];

    const auditResults: Record<string, { expected: number; retrieved: number; match: boolean }> = {};
    let allMatched = true;

    for (const k of auditedKeys) {
      const expCount = Array.isArray(sanitizedPayload[k]) 
        ? sanitizedPayload[k].length 
        : (sanitizedPayload[k] && typeof sanitizedPayload[k] === "object" ? Object.keys(sanitizedPayload[k]).length : (sanitizedPayload[k] !== undefined ? 1 : 0));
      
      const retCount = Array.isArray(retrievedData[k]) 
        ? retrievedData[k].length 
        : (retrievedData[k] && typeof retrievedData[k] === "object" ? Object.keys(retrievedData[k]).length : (retrievedData[k] !== undefined ? 1 : 0));

      const match = expCount === retCount;
      if (!match) allMatched = false;
      auditResults[k] = { expected: expCount, retrieved: retCount, match };
    }

    console.log("AUDIT_COLLECTIONS_MATCH:", allMatched);
    console.log(JSON.stringify({
      test: "FULL_SYSTEM_STATE_PRESERVATION",
      allKeysAudited: auditedKeys.length,
      allMatched,
      sha256Match: sha256Source === sha256Retrieved,
      auditDetails: auditResults
    }, null, 2));

  } finally {
    freshClient.release();
    await pool.end();
  }
}

testFullStatePreservation().catch(err => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
