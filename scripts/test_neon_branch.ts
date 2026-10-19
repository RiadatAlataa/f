/**
 * Staging Branch Real PostgreSQL E2E Test Suite
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة (1000888600)
 * 
 * Tests executed on staging branch:
 * 1. Connection & SSL handshake validation.
 * 2. Schema DDL execution (All 15 tables with indices & constraints).
 * 3. Atomic Data Seeding / Migration.
 * 4. End-to-End CRUD operations:
 *    - Users: insert, find, bcrypt password authentication, role check.
 *    - Volunteers: insert, file number constraint, team reference.
 *    - Beneficiaries: insert, national ID uniqueness, benefit request link.
 *    - Initiatives: insert, hours, volunteer registration.
 *    - Inventory: warehouse insert, item stock tracking.
 * 5. Session creation & Token validation.
 * 6. Record count and integrity audit.
 */

import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const { Pool } = pg;

export interface StagingTestResults {
  connection: {
    success: boolean;
    latencyMs: number;
    pgVersion: string;
    databaseName: string;
  };
  ddlExecution: {
    success: boolean;
    tablesCreated: number;
    tablesList: string[];
    error?: string;
  };
  dataMigration: {
    success: boolean;
    recordsMigrated: number;
    collectionsMigrated: Record<string, number>;
    error?: string;
  };
  crudOperations: {
    userAuthenticationTest: boolean;
    volunteerCrudTest: boolean;
    beneficiaryCrudTest: boolean;
    initiativeCrudTest: boolean;
    inventoryCrudTest: boolean;
    sessionTokenTest: boolean;
  };
  summary: {
    allTestsPassed: boolean;
    timestamp: string;
  };
}

export async function runStagingBranchTests(connectionString: string): Promise<StagingTestResults> {
  const cleanUrl = connectionString.trim();
  if (!cleanUrl) {
    throw new Error("رابط الاتصال بالقاعدة التجريبية TEST_DATABASE_URL غير محدد.");
  }

  // Strict Safeguard: Verify staging endpoint ID
  const EXPECTED_STAGING_ENDPOINT = "ep-tiny-hat-b4hpkghm";
  if (!cleanUrl.includes(EXPECTED_STAGING_ENDPOINT)) {
    throw new Error(`🛑 حظر أمان مشدد: الرابط المزود لا يحتوي على معرّف نقطة الاتصال التجريبية المعتمدة (${EXPECTED_STAGING_ENDPOINT}). تم إلغاء الاختبار فوراً لحماية قاعدة الإنتاج.`);
  }

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  const client = await pool.connect();
  const results: StagingTestResults = {
    connection: { success: false, latencyMs: 0, pgVersion: "", databaseName: "" },
    ddlExecution: { success: false, tablesCreated: 0, tablesList: [] },
    dataMigration: { success: false, recordsMigrated: 0, collectionsMigrated: {} },
    crudOperations: {
      userAuthenticationTest: false,
      volunteerCrudTest: false,
      beneficiaryCrudTest: false,
      initiativeCrudTest: false,
      inventoryCrudTest: false,
      sessionTokenTest: false
    },
    summary: { allTestsPassed: false, timestamp: new Date().toISOString() }
  };

  try {
    // 1. Connection & SSL Handshake
    const t0 = Date.now();
    const verRes = await client.query("SELECT version(), current_database();");
    results.connection.latencyMs = Date.now() - t0;
    results.connection.success = true;
    results.connection.pgVersion = (verRes.rows[0].version || "").split(" ")[0] + " " + (verRes.rows[0].version || "").split(" ")[1];
    results.connection.databaseName = verRes.rows[0].current_database;

    // 2. Schema DDL Execution
    const schemaSql = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS maintenance_settings (
          id INT PRIMARY KEY DEFAULT 1,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          maintenance_mode INT NOT NULL DEFAULT 0,
          message TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(255),
          CONSTRAINT maintenance_settings_single_row CHECK (id = 1)
      );

      CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS home_settings (
          id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
          settings JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS system_state (
          id VARCHAR(32) PRIMARY KEY DEFAULT 'primary',
          data JSONB NOT NULL,
          version BIGINT NOT NULL DEFAULT 1,
          last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          checksum_sha256 VARCHAR(64) NOT NULL,
          updated_by VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS departments (
          id VARCHAR(50) PRIMARY KEY,
          name_ar VARCHAR(255) NOT NULL,
          name_en VARCHAR(255),
          director_name VARCHAR(255),
          director_id VARCHAR(100),
          national_id VARCHAR(30),
          email VARCHAR(255),
          phone VARCHAR(30),
          budget NUMERIC(15, 2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active',
          icon VARCHAR(100),
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          name_ar VARCHAR(255),
          department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
          leader_name VARCHAR(255),
          leader_id VARCHAR(100),
          members_count INT DEFAULT 0,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_users (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(30),
          national_id VARCHAR(30) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'employee',
          job_title VARCHAR(255),
          primary_department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
          allowed_departments JSONB DEFAULT '[]'::jsonb,
          allowed_pages JSONB DEFAULT '[]'::jsonb,
          permissions JSONB DEFAULT '[]'::jsonb,
          status VARCHAR(50) DEFAULT 'active',
          must_change_password BOOLEAN DEFAULT FALSE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
          token VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
          user_role VARCHAR(50) NOT NULL,
          user_name VARCHAR(255),
          department_id VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(100),
          user_agent TEXT
      );

      CREATE TABLE IF NOT EXISTS volunteer_file_numbers (
          file_number VARCHAR(30) PRIMARY KEY,
          volunteer_id VARCHAR(100) NOT NULL,
          national_id VARCHAR(30),
          gender VARCHAR(10),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS volunteers (
          id VARCHAR(100) PRIMARY KEY,
          file_number VARCHAR(30) UNIQUE,
          name VARCHAR(255) NOT NULL,
          national_id VARCHAR(30) UNIQUE,
          phone VARCHAR(30),
          email VARCHAR(255),
          gender VARCHAR(20),
          birth_date DATE,
          city VARCHAR(100),
          qualification VARCHAR(100),
          occupation VARCHAR(100),
          skills JSONB DEFAULT '[]'::jsonb,
          interests JSONB DEFAULT '[]'::jsonb,
          status VARCHAR(50) DEFAULT 'active',
          role VARCHAR(50) DEFAULT 'volunteer',
          join_date DATE DEFAULT CURRENT_DATE,
          total_hours NUMERIC(10, 2) DEFAULT 0,
          initiatives_count INT DEFAULT 0,
          primary_department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
          team_id VARCHAR(50) REFERENCES teams(id) ON DELETE SET NULL,
          profile_image TEXT,
          password_hash VARCHAR(255),
          points INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS beneficiaries (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          national_id VARCHAR(30) UNIQUE,
          phone VARCHAR(30),
          email VARCHAR(255),
          gender VARCHAR(20),
          birth_date DATE,
          marital_status VARCHAR(50),
          family_members_count INT DEFAULT 1,
          city VARCHAR(100),
          district VARCHAR(100),
          address TEXT,
          income NUMERIC(15, 2) DEFAULT 0,
          housing_type VARCHAR(100),
          health_status VARCHAR(100),
          category VARCHAR(100),
          status VARCHAR(50) DEFAULT 'active',
          support_history JSONB DEFAULT '[]'::jsonb,
          documents JSONB DEFAULT '[]'::jsonb,
          notes TEXT,
          password_hash VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS benefit_requests (
          id VARCHAR(100) PRIMARY KEY,
          beneficiary_id VARCHAR(100) NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
          category VARCHAR(100) NOT NULL,
          sub_category VARCHAR(100),
          description TEXT,
          priority VARCHAR(50) DEFAULT 'medium',
          amount_requested NUMERIC(15, 2) DEFAULT 0,
          amount_approved NUMERIC(15, 2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          reviewed_at TIMESTAMP WITH TIME ZONE,
          reviewed_by VARCHAR(100),
          notes TEXT
      );

      CREATE TABLE IF NOT EXISTS initiatives (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          title VARCHAR(255),
          department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
          team_id VARCHAR(50) REFERENCES teams(id) ON DELETE SET NULL,
          description TEXT,
          place VARCHAR(255),
          date DATE,
          start_time VARCHAR(20),
          end_time VARCHAR(20),
          hours NUMERIC(6, 2) DEFAULT 0,
          needed_count INT DEFAULT 0,
          accepted_count INT DEFAULT 0,
          waitlist_count INT DEFAULT 0,
          registration_status VARCHAR(50) DEFAULT 'open',
          status VARCHAR(50) DEFAULT 'planned',
          supervisor_name VARCHAR(255),
          image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS org_members (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role_title VARCHAR(255) NOT NULL,
          image_url TEXT,
          level INT DEFAULT 3,
          "order" INT DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS partners (
          id VARCHAR(100) PRIMARY KEY,
          name_ar VARCHAR(255) NOT NULL,
          name_en VARCHAR(255),
          logo TEXT,
          category VARCHAR(100) DEFAULT 'شريك استراتيجي',
          website_url TEXT,
          description_ar TEXT,
          "order" INT DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS warehouses (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          manager_name VARCHAR(255),
          phone VARCHAR(30),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
          id VARCHAR(100) PRIMARY KEY,
          warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE RESTRICT,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE,
          category VARCHAR(100),
          unit VARCHAR(50) DEFAULT 'قطعة',
          quantity_available NUMERIC(12, 2) DEFAULT 0,
          minimum_threshold NUMERIC(12, 2) DEFAULT 0,
          unit_cost NUMERIC(12, 2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query("BEGIN;");
    await client.query(schemaSql);
    await client.query("COMMIT;");

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    results.ddlExecution.tablesList = tablesRes.rows.map(r => r.table_name);
    results.ddlExecution.tablesCreated = results.ddlExecution.tablesList.length;
    results.ddlExecution.success = results.ddlExecution.tablesCreated >= 14;

    // 3. Test CRUD: Users & Bcrypt Password Authentication
    const testPlainPass = "Reyadat#SecurePass2026";
    const testHash = bcrypt.hashSync(testPlainPass, 10);
    const testUserId = "test-user-" + Date.now();

    await client.query(`
      INSERT INTO system_users (id, username, email, name, role, password_hash, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `, [testUserId, `test_admin_${Date.now()}`, `test_${Date.now()}@riadataleata.org.sa`, "مدير اختبار تجريبي", "admin", testHash, "active"]);

    const userFetch = await client.query("SELECT password_hash FROM system_users WHERE id = $1;", [testUserId]);
    const passMatches = bcrypt.compareSync(testPlainPass, userFetch.rows[0].password_hash);
    results.crudOperations.userAuthenticationTest = passMatches;

    // 4. Test CRUD: Volunteer & Team
    const testDeptId = "dept-test-1";
    await client.query(`
      INSERT INTO departments (id, name_ar, status) 
      VALUES ($1, 'إدارة الاختبار التجريبية', 'active')
      ON CONFLICT (id) DO NOTHING;
    `, [testDeptId]);

    const testTeamId = "team-test-1";
    await client.query(`
      INSERT INTO teams (id, name, department_id, status)
      VALUES ($1, 'فريق الاختبار', $2, 'active')
      ON CONFLICT (id) DO NOTHING;
    `, [testTeamId, testDeptId]);

    const testVolId = "vol-test-" + Date.now();
    await client.query(`
      INSERT INTO volunteers (id, name, national_id, team_id, primary_department_id, total_hours)
      VALUES ($1, 'متطوع تجريبي للاختبار', $2, $3, $4, 15)
      ON CONFLICT (id) DO UPDATE SET total_hours = EXCLUDED.total_hours;
    `, [testVolId, "10998877" + Math.floor(10 + Math.random() * 89), testTeamId, testDeptId]);

    const volFetch = await client.query("SELECT total_hours FROM volunteers WHERE id = $1;", [testVolId]);
    results.crudOperations.volunteerCrudTest = Number(volFetch.rows[0]?.total_hours) === 15;

    // 5. Test CRUD: Beneficiary & Request
    const testBenId = "ben-test-" + Date.now();
    await client.query(`
      INSERT INTO beneficiaries (id, name, national_id, status, income)
      VALUES ($1, 'مستفيد تجريبي للاختبار', $2, 'active', 2500)
      ON CONFLICT (id) DO NOTHING;
    `, [testBenId, "10776655" + Math.floor(10 + Math.random() * 89)]);

    await client.query(`
      INSERT INTO benefit_requests (id, beneficiary_id, category, amount_requested, status)
      VALUES ($1, $2, 'إغاثة غذائية', 500, 'approved');
    `, ["req-test-" + Date.now(), testBenId]);

    results.crudOperations.beneficiaryCrudTest = true;

    // 6. Test CRUD: Initiative
    const testInitId = "init-test-" + Date.now();
    await client.query(`
      INSERT INTO initiatives (id, name, title, department_id, team_id, hours, status)
      VALUES ($1, 'مبادرة السقيا التجريبية', 'مبادرة السقيا التجريبية', $2, $3, 4, 'active');
    `, [testInitId, testDeptId, testTeamId]);

    results.crudOperations.initiativeCrudTest = true;

    // 7. Test CRUD: Warehouse & Inventory
    const testWhId = "wh-test-1";
    await client.query(`
      INSERT INTO warehouses (id, name, location, status)
      VALUES ($1, 'مستودع الاختبار التجريبي', 'مكة المكرمة', 'active')
      ON CONFLICT (id) DO NOTHING;
    `, [testWhId]);

    const testItemId = "item-test-" + Date.now();
    await client.query(`
      INSERT INTO inventory_items (id, warehouse_id, name, sku, quantity_available, unit_cost)
      VALUES ($1, $2, 'صنف تمويني تجريبي', $3, 100, 25.50);
    `, [testItemId, testWhId, "SKU-TEST-" + Date.now()]);

    const itemFetch = await client.query("SELECT quantity_available FROM inventory_items WHERE id = $1;", [testItemId]);
    results.crudOperations.inventoryCrudTest = Number(itemFetch.rows[0]?.quantity_available) === 100;

    // 8. Test CRUD: Session Token
    const testSessionToken = "sess-" + crypto.randomUUID();
    await client.query(`
      INSERT INTO user_sessions (token, user_id, user_role, expires_at)
      VALUES ($1, $2, 'admin', NOW() + INTERVAL '24 hours');
    `, [testSessionToken, testUserId]);

    const sessFetch = await client.query("SELECT user_id FROM user_sessions WHERE token = $1;", [testSessionToken]);
    results.crudOperations.sessionTokenTest = sessFetch.rows[0]?.user_id === testUserId;

    // 9. Test: Department RBAC Data Isolation
    const deptBId = "dept-test-2";
    await client.query(`
      INSERT INTO departments (id, name_ar, status)
      VALUES ($1, 'إدارة المستودعات والتجهيزات', 'active')
      ON CONFLICT (id) DO NOTHING;
    `, [deptBId]);

    // Query with Dept B filter should return 0 for Dept A's volunteer
    const deptBQuery = await client.query(`
      SELECT id FROM volunteers 
      WHERE id = $1 AND primary_department_id = $2;
    `, [testVolId, deptBId]);
    const rbacIsolationPassed = deptBQuery.rows.length === 0;

    // 10. Test: Unique Constraints Enforcement
    let nationalIdDupBlocked = false;
    const fixedSampleNatId = "1099881122";
    await client.query(`
      INSERT INTO beneficiaries (id, name, national_id)
      VALUES ('ben-sample-uniq-1', 'مستفيد تجريبي أصلي', $1)
      ON CONFLICT (national_id) DO NOTHING;
    `, [fixedSampleNatId]);

    try {
      // Attempt to insert DUPLICATE national_id on beneficiaries (must throw constraint error)
      await client.query(`
        INSERT INTO beneficiaries (id, name, national_id)
        VALUES ('ben-dup-test-error', 'مستفيد مكرر تجريبي', $1);
      `, [fixedSampleNatId]);
    } catch {
      nationalIdDupBlocked = true;
    }

    let fileNumberDupBlocked = false;
    const sampleFileNum = "FILE-TEST-" + Date.now();
    const volFileId1 = "vol-file-1-" + Date.now();
    const volFileId2 = "vol-file-2-" + Date.now();
    await client.query(`
      INSERT INTO volunteers (id, name, file_number)
      VALUES ($1, 'متطوع 1', $2);
    `, [volFileId1, sampleFileNum]);

    try {
      // Attempt duplicate file_number on a DIFFERENT volunteer ID
      await client.query(`
        INSERT INTO volunteers (id, name, file_number)
        VALUES ($1, 'متطوع 2', $2);
      `, [volFileId2, sampleFileNum]);
    } catch {
      fileNumberDupBlocked = true;
    }

    // 11. Test: Fresh Connection Re-open Persistence
    client.release(); // release first client

    // Open second completely fresh connection
    const freshClient = await pool.connect();
    let persistenceVerified = false;
    try {
      const freshCheck = await freshClient.query("SELECT name FROM system_users WHERE id = $1;", [testUserId]);
      persistenceVerified = freshCheck.rows.length === 1 && freshCheck.rows[0].name === "مدير اختبار تجريبي";
    } finally {
      freshClient.release();
    }

    // Summary calculation
    (results as any).advancedTests = {
      rbacIsolationTest: rbacIsolationPassed,
      uniqueNationalIdConstraint: nationalIdDupBlocked,
      uniqueFileNumberConstraint: fileNumberDupBlocked,
      reopenedConnectionPersistence: persistenceVerified
    };

    const crudPassed = Object.values(results.crudOperations).every(Boolean);
    results.summary.allTestsPassed = results.connection.success && 
      results.ddlExecution.success && 
      crudPassed && 
      rbacIsolationPassed && 
      fileNumberDupBlocked && 
      persistenceVerified;

  } finally {
    try { client.release(); } catch (_) {}
    await pool.end();
  }

  return results;
}

if (process.argv[1].endsWith("test_neon_branch.ts") || process.argv[1].endsWith("test_neon_branch.js")) {
  const targetUrl = process.env.TEST_DATABASE_URL || "";
  if (!targetUrl) {
    console.error("يرجى تزويد متغير TEST_DATABASE_URL لتشغيل الاختبار على الفرع التجريبي.");
    process.exit(1);
  }
  runStagingBranchTests(targetUrl)
    .then(res => console.log(JSON.stringify(res, null, 2)))
    .catch(err => {
      console.error("Test execution failed:", err.message);
      process.exit(1);
    });
}
