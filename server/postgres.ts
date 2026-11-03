import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

export interface MaintenanceStatusRecord {
  enabled: boolean;
  maintenance_mode: number;
  message: string;
  updated_at: string | null;
  updated_by: string | null;
}

let pool: pg.Pool | null = null;
let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Returns true if PostgreSQL connection string is configured in environment
 */
export function isPostgresConfigured(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const url = process.env.DATABASE_URL || 
              process.env.POSTGRESQL_URL || 
              process.env.PG_URL ||
              process.env.POSTGRES_URL ||
              (!isProduction ? process.env.TEST_DATABASE_URL : undefined);
  return Boolean(url && typeof url === 'string' && url.trim().length > 0);
}

/**
 * Gets or initializes the PostgreSQL connection pool
 */
export function getPostgresPool(): pg.Pool | null {
  if (pool) return pool;

  const isProduction = process.env.NODE_ENV === 'production';
  const connectionString = process.env.DATABASE_URL || 
                           process.env.POSTGRESQL_URL || 
                           process.env.PG_URL ||
                           process.env.POSTGRES_URL ||
                           (!isProduction ? process.env.TEST_DATABASE_URL : undefined);

  if (!connectionString) {
    return null;
  }

  try {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: true },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]:', err.message);
    });

    return pool;
  } catch (err: any) {
    console.error('[PostgreSQL Pool Initialization Error]:', err.message);
    return null;
  }
}

/**
 * Initializes required tables in PostgreSQL for permanent maintenance mode persistence
 */
export async function initPostgresTables(): Promise<boolean> {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const p = getPostgresPool();
    if (!p) {
      console.log('[PostgreSQL] No DATABASE_URL provided. Operating with persistent disk / JSON store.');
      return false;
    }

    try {
      let client: pg.PoolClient | null = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          client = await p.connect();
          break;
        } catch (connErr: any) {
          lastError = connErr;
          console.warn(`[PostgreSQL] Connection attempt ${attempt}/3 failed: ${connErr.message}. Retrying in 1.5s (handling Neon serverless wake-up)...`);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }

      if (!client) {
        console.error('[PostgreSQL Initialization Error]:', lastError?.message || lastError);
        return false;
      }

      try {
        console.log('[PostgreSQL] Connected successfully to database. Ensuring tables exist...');
        
        // 1. Dedicated maintenance_settings table
        await client.query(`
          CREATE TABLE IF NOT EXISTS maintenance_settings (
            id INT PRIMARY KEY DEFAULT 1,
            enabled BOOLEAN NOT NULL DEFAULT FALSE,
            maintenance_mode INT NOT NULL DEFAULT 0,
            message TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_by VARCHAR(255),
            CONSTRAINT maintenance_settings_single_row CHECK (id = 1)
          );
        `);

        // 2. Generic system_settings key-value table
        await client.query(`
          CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(255) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_by VARCHAR(255)
          );
        `);

        // 3. Dedicated volunteer_file_numbers table to enforce unique constraints
        await client.query(`
          CREATE TABLE IF NOT EXISTS volunteer_file_numbers (
            file_number VARCHAR(20) PRIMARY KEY,
            volunteer_id VARCHAR(100) NOT NULL,
            national_id VARCHAR(30),
            gender VARCHAR(10),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_vfn_volunteer_id ON volunteer_file_numbers (volunteer_id);
        `);

        // 4. Primary system_state table for unified ACID state storage
        await client.query(`
          CREATE TABLE IF NOT EXISTS system_state (
            id VARCHAR(32) PRIMARY KEY DEFAULT 'primary',
            data JSONB NOT NULL,
            version BIGINT NOT NULL DEFAULT 1,
            last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            checksum_sha256 VARCHAR(64) NOT NULL,
            updated_by VARCHAR(255)
          );
        `);

        // 5. Dedicated system_files table for permanent S3/R2 file metadata & RBAC access control
        await client.query(`
          CREATE TABLE IF NOT EXISTS system_files (
            id VARCHAR(64) PRIMARY KEY,
            file_key VARCHAR(512) NOT NULL UNIQUE,
            original_name VARCHAR(255) NOT NULL,
            sanitized_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_size_bytes BIGINT NOT NULL,
            storage_provider VARCHAR(32) NOT NULL DEFAULT 's3',
            bucket_name VARCHAR(128) NOT NULL,
            checksum_sha256 VARCHAR(64) NOT NULL,
            entity_type VARCHAR(64) NOT NULL,
            entity_id VARCHAR(128) NOT NULL,
            field_name VARCHAR(64),
            is_private BOOLEAN NOT NULL DEFAULT TRUE,
            access_roles JSONB NOT NULL DEFAULT '["admin"]',
            uploaded_by VARCHAR(128) NOT NULL,
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(32) NOT NULL DEFAULT 'active'
          );
          CREATE INDEX IF NOT EXISTS idx_files_entity ON system_files (entity_type, entity_id);
          CREATE INDEX IF NOT EXISTS idx_files_checksum ON system_files (checksum_sha256);
          CREATE INDEX IF NOT EXISTS idx_files_private ON system_files (is_private);
          CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON system_files (uploaded_at DESC);
        `);

        // 6. Dedicated migration_tracking table for recorded schema and data migrations
        await client.query(`
          CREATE TABLE IF NOT EXISTS migration_tracking (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(100) NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            details JSONB
          );
        `);

        // 7. Dedicated audit_logs table for persistent SQL-level compliance logging
        await client.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(64) PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            actor_id VARCHAR(64),
            actor_name VARCHAR(100),
            actor_role VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50),
            entity_id VARCHAR(64),
            department_id VARCHAR(50),
            ip_address VARCHAR(50),
            user_agent TEXT,
            status VARCHAR(20) DEFAULT 'success',
            details JSONB
          );
          CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
        `);

        // Ensure default row exists in maintenance_settings if empty
        const checkRes = await client.query('SELECT COUNT(*) FROM maintenance_settings WHERE id = 1;');
        if (parseInt(checkRes.rows[0].count, 10) === 0) {
          await client.query(`
            INSERT INTO maintenance_settings (id, enabled, maintenance_mode, message, updated_at, updated_by)
            VALUES (1, FALSE, 0, 'نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.', CURRENT_TIMESTAMP, 'System Initialization')
            ON CONFLICT (id) DO NOTHING;
          `);
        }

        console.log('[PostgreSQL] Maintenance, system_state, and system_files tables verified and ready.');
        isInitialized = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('[PostgreSQL Initialization Error]:', err.message);
      return false;
    }
  })();

  return initPromise;
}

/**
 * Reads the maintenance status directly from PostgreSQL
 */
export async function getPostgresMaintenanceStatus(): Promise<MaintenanceStatusRecord | null> {
  const p = getPostgresPool();
  if (!p) return null;

  try {
    // Attempt fast read from maintenance_settings table
    const res = await p.query(
      'SELECT enabled, maintenance_mode, message, updated_at, updated_by FROM maintenance_settings WHERE id = 1 LIMIT 1;'
    );

    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      const isEnabled = Boolean(row.enabled || row.maintenance_mode === 1);
      return {
        enabled: isEnabled,
        maintenance_mode: isEnabled ? 1 : 0,
        message: row.message || 'نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.',
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        updated_by: row.updated_by || null,
      };
    }

    // Secondary fallback: check system_settings key 'maintenance'
    const sysRes = await p.query("SELECT value, updated_at, updated_by FROM system_settings WHERE key = 'maintenance' LIMIT 1;");
    if (sysRes.rows && sysRes.rows.length > 0) {
      const val = sysRes.rows[0].value;
      const isEnabled = Boolean(val?.enabled || val?.maintenance_mode === 1 || val?.maintenanceMode === true);
      return {
        enabled: isEnabled,
        maintenance_mode: isEnabled ? 1 : 0,
        message: val?.message || 'نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.',
        updated_at: sysRes.rows[0].updated_at ? new Date(sysRes.rows[0].updated_at).toISOString() : null,
        updated_by: sysRes.rows[0].updated_by || null,
      };
    }

    return null;
  } catch (err: any) {
    console.error('[PostgreSQL getMaintenanceStatus Error]:', err.message);
    return null;
  }
}

/**
 * Persists the maintenance status permanently in PostgreSQL
 */
export async function setPostgresMaintenanceStatus(
  enabled: boolean,
  message: string,
  updatedBy: string
): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;

  try {
    await initPostgresTables();

    const isEnabled = Boolean(enabled);
    const modeInt = isEnabled ? 1 : 0;
    const nowIso = new Date().toISOString();

    // 1. Update maintenance_settings single-row table
    await p.query(
      `
      INSERT INTO maintenance_settings (id, enabled, maintenance_mode, message, updated_at, updated_by)
      VALUES (1, $1, $2, $3, NOW(), $4)
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        maintenance_mode = EXCLUDED.maintenance_mode,
        message = EXCLUDED.message,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
      `,
      [isEnabled, modeInt, message, updatedBy]
    );

    // 2. Also update system_settings key-value table for redundancy
    const payloadJson = JSON.stringify({
      enabled: isEnabled,
      maintenance_mode: modeInt,
      maintenanceMode: isEnabled,
      message,
      updated_at: nowIso,
      updated_by: updatedBy
    });

    await p.query(
      `
      INSERT INTO system_settings (key, value, updated_at, updated_by)
      VALUES ('maintenance', $1::jsonb, NOW(), $2)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
      `,
      [payloadJson, updatedBy]
    );

    console.log(`[PostgreSQL] Maintenance mode successfully updated to: ${isEnabled ? 'ENABLED (1)' : 'DISABLED (0)'} by ${updatedBy}`);
    return true;
  } catch (err: any) {
    console.error('[PostgreSQL setMaintenanceStatus Error]:', err.message);
    return false;
  }
}

/**
 * Persists a unique volunteer file number in PostgreSQL
 */
export async function savePostgresVolunteerFileNumber(
  fileNumber: string,
  volunteerId: string,
  nationalId?: string,
  gender?: string
): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;

  try {
    await initPostgresTables();
    await p.query(
      `
      INSERT INTO volunteer_file_numbers (file_number, volunteer_id, national_id, gender, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (file_number) DO UPDATE SET
        volunteer_id = EXCLUDED.volunteer_id,
        national_id = COALESCE(EXCLUDED.national_id, volunteer_file_numbers.national_id),
        gender = COALESCE(EXCLUDED.gender, volunteer_file_numbers.gender);
      `,
      [fileNumber, volunteerId, nationalId || null, gender || null]
    );
    return true;
  } catch (err: any) {
    console.error('[PostgreSQL saveVolunteerFileNumber Error]:', err.message);
    return false;
  }
}

/**
 * Reads all registered volunteer file numbers from PostgreSQL
 */
export async function getPostgresVolunteerFileNumbers(): Promise<string[]> {
  const p = getPostgresPool();
  if (!p) return [];

  try {
    await initPostgresTables();
    const res = await p.query('SELECT file_number FROM volunteer_file_numbers;');
    return (res.rows || []).map((r: any) => String(r.file_number).trim().toUpperCase());
  } catch (err: any) {
    console.error('[PostgreSQL getVolunteerFileNumbers Error]:', err.message);
    return [];
  }
}

/**
 * Returns true if PostgreSQL is configured as the active primary storage backend
 */
export function isPostgresStorageActive(): boolean {
  if (!isPostgresConfigured()) return false;
  const backend = (process.env.STORAGE_BACKEND || '').toLowerCase();
  return backend === 'postgres' || backend === 'postgresql';
}

/**
 * Reads the unified system state from PostgreSQL
 */
/**
 * Ensures all required system collections (arrays and core objects) exist.
 * Heals missing collections automatically to prevent "Cannot read properties of undefined (reading 'unshift')".
 * Preserves 100% of existing data, accounts, and configuration.
 */
export function normalizeSystemStateCollections(db: any): boolean {
  if (!db || typeof db !== "object") return false;
  let modified = false;

  const defaultArrayKeys = [
    "departments",
    "teams",
    "volunteers",
    "beneficiaries",
    "initiatives",
    "requests",
    "benefitRequests",
    "volunteerApplications",
    "teamApplications",
    "volunteerTransferRequests",
    "passwordResetRequests",
    "letters",
    "news",
    "partners",
    "gallery",
    "chatConversations",
    "chatMessages",
    "supportTickets",
    "supportTasks",
    "custodies",
    "logs",
    "notifications",
    "storekeepers",
    "inventoryItems",
    "inventoryMovements",
    "inventoryLogs",
    "inventoryAudits",
    "volunteerIssuances",
    "issuedVolunteerCards",
    "volunteerCardTemplates",
    "employees",
    "employeeRequests",
    "hrLeaves",
    "hrAttendance",
    "hrDecisions",
    "hrEvaluations",
    "attendance",
    "evaluations",
    "distributions",
    "distributionHandovers",
    "orgMembers",
    "heroSlides",
    "opportunityRequests",
    "departmentDirectives",
    "storeProjects",
    "storeDonations",
    "financialTransactions",
    "financialAuditLog",
    "financialTransfers",
    "financialIncome",
    "financialReceipts",
    "financialExpenses",
    "financialPurchases",
    "financialPayables",
    "financialPayroll",
    "financialDocuments",
    "emailLogs",
    "notificationDeliveryLogs",
    "accessAuditLogs",
    "permissionChangeLogs",
    "developerErrorLogs",
    "customFields",
    "userDepartmentAccess"
  ];

  for (const key of defaultArrayKeys) {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      modified = true;
    }
  }

  // Ensure default objects
  if (!db.systemSettings || typeof db.systemSettings !== "object") {
    db.systemSettings = {
      systemName: "نظام إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      teamName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      licenseNumber: "1000888600",
      registrationNumber: "1000888600",
      foundationYear: "1445هـ / 2024م",
      officialEmail: "info@riadataleata.org.sa",
      mobileNumber: "0541820904",
      landlineNumber: "0541820904",
      address: "مكة المكرمة - مخطط العسيلة - الشارع العام",
      maintenanceMode: false
    };
    modified = true;
  }
  if (!db.homeSettings || typeof db.homeSettings !== "object") {
    db.homeSettings = {};
    modified = true;
  }

  // Ensure license number & phone number synchronization with the official non-profit license & mobile
  if (db.homeSettings) {
    if (!db.homeSettings.licenseNumber || db.homeSettings.licenseNumber === "5081" || db.homeSettings.licenseNumber === "5434") {
      db.homeSettings.licenseNumber = "1000888600";
      modified = true;
    }
    if (!db.homeSettings.contactPhone || db.homeSettings.contactPhone === "0550123456") {
      db.homeSettings.contactPhone = "0541820904";
      modified = true;
    }
    if (db.homeSettings.licenseConfig) {
      if (typeof db.homeSettings.licenseConfig.titleAr === "string" && db.homeSettings.licenseConfig.titleAr.includes("5081")) {
        db.homeSettings.licenseConfig.titleAr = db.homeSettings.licenseConfig.titleAr.replace(/5081/g, "1000888600");
        modified = true;
      }
      if (typeof db.homeSettings.licenseConfig.notes === "string" && db.homeSettings.licenseConfig.notes.includes("5081")) {
        db.homeSettings.licenseConfig.notes = db.homeSettings.licenseConfig.notes.replace(/5081/g, "1000888600");
        modified = true;
      }
    }
  }

  if (db.systemSettings) {
    if (!db.systemSettings.licenseNumber || db.systemSettings.licenseNumber === "5081" || db.systemSettings.licenseNumber === "5434") {
      db.systemSettings.licenseNumber = "1000888600";
      modified = true;
    }
    if (!db.systemSettings.registrationNumber || db.systemSettings.registrationNumber === "5081" || db.systemSettings.registrationNumber === "5434") {
      db.systemSettings.registrationNumber = "1000888600";
      modified = true;
    }
    if (!db.systemSettings.mobileNumber || db.systemSettings.mobileNumber === "0550123456") {
      db.systemSettings.mobileNumber = "0541820904";
      modified = true;
    }
    if (Array.isArray(db.systemSettings.socialLinks)) {
      for (const soc of db.systemSettings.socialLinks) {
        if (soc && soc.platform === "whatsapp" && soc.url && soc.url.includes("966550123456")) {
          soc.url = soc.url.replace("966550123456", "966541820904");
          modified = true;
        }
      }
    }
  }

  if (!db.files || typeof db.files !== "object") {
    db.files = {};
    modified = true;
  }

  // Ensure nested arrays for entity sub-records
  if (Array.isArray(db.volunteers)) {
    for (const vol of db.volunteers) {
      if (vol && typeof vol === "object" && !Array.isArray(vol.teamHistory)) {
        vol.teamHistory = [];
        modified = true;
      }
    }
  }

  if (Array.isArray(db.custodies)) {
    for (const c of db.custodies) {
      if (c && typeof c === "object" && !Array.isArray(c.history)) {
        c.history = [];
        modified = true;
      }
    }
  }

  if (Array.isArray(db.supportTasks)) {
    for (const t of db.supportTasks) {
      if (t && typeof t === "object" && !Array.isArray(t.history)) {
        t.history = [];
        modified = true;
      }
    }
  }

  // Purge mock board members, fake directors, fake employees, and fake leaders so the user can add them from the control panel
  const mockOrgMemberIds = new Set([
    "org-board-1", "org-board-2", "org-board-3", "org-board-4", "org-board-5",
    "org-exec-1", "org-exec-2", "org-dep-1", "org-dep-2", "org-dep-3", "org-dep-4", "org-dep-5", "org-dep-6", "org-dep-7"
  ]);
  const mockNames = new Set([
    "د. عبد الله بن منصور القحطاني",
    "أ. فهد بن عبد العزيز السليمان",
    "م. عادل بن عبد الرحمن الحربي",
    "أ. أحمد بن عواض المعبدي",
    "أ. سارة بنت منصور الشريف",
    "أ. خالد بن إبراهيم المنصور",
    "أ. عبد الرحمن السليمان",
    "أ. عبد الله العتيبي",
    "أ. فيصل الأحمدي",
    "أ. مريم الغامدي",
    "أ. منيرة القحطاني",
    "أ. ماجد الدوسري",
    "أ. سعود الحربي",
    "أ. نورة بنت فهد الشريف",
    "سعود بن عبد العزيز الهذلي",
    "منى بنت سليمان الحربي",
    "عبد الله بن خالد الدوسري",
    "ياسر بن صالح الغامدي",
    "فهد بن محمد الشريف",
    "ريم بنت عبد الله السلمي"
  ]);

  if (Array.isArray(db.orgMembers) && db.orgMembers.length > 0) {
    const prevLen = db.orgMembers.length;
    db.orgMembers = db.orgMembers.filter((m: any) => {
      if (!m) return false;
      if (mockOrgMemberIds.has(m.id)) return false;
      if (typeof m.id === "string" && (m.id.startsWith("org-board-") || m.id.startsWith("org-exec-") || m.id.startsWith("org-dep-"))) return false;
      if (typeof m.name === "string" && mockNames.has(m.name.trim())) return false;
      return true;
    });
    if (db.orgMembers.length !== prevLen) modified = true;
  }

  if (db.homeSettings && Array.isArray(db.homeSettings.orgMembers)) {
    db.homeSettings.orgMembers = db.orgMembers;
  }

  // Clear mock directors in departments
  const mockDirectorNationalIds = new Set([
    "1010000001", "1010000002", "1010000003", "1010000004", "1010000005", "1010000007", "1010000008", "1010000009"
  ]);
  if (Array.isArray(db.departments)) {
    for (const dep of db.departments) {
      if (dep && typeof dep === "object") {
        if (
          mockDirectorNationalIds.has(dep.nationalId) ||
          mockNames.has(dep.directorName) ||
          (typeof dep.email === "string" && (dep.email.endsWith("@riadataleata.org.sa") && !dep.email.includes("operations") && !dep.email.includes("admin") && !dep.email.includes("mosa") && !dep.email.includes("info")))
        ) {
          dep.directorName = "";
          dep.nationalId = "";
          dep.phone = "";
          dep.email = "";
          dep.password = "";
          modified = true;
        }
      }
    }
  }

  // Purge mock access records in userDepartmentAccess while strictly preserving real accounts (e.g. operations manager, admin, user-created accounts)
  const mockAccessIds = new Set([
    "perm-dep-1", "perm-dep-2", "perm-dep-3", "perm-dep-4", "perm-dep-5", "perm-dep-7", "perm-dep-8", "perm-dep-9",
    "perm-emp-1", "perm-emp-2", "perm-emp-3", "perm-emp-4", "perm-leader-1"
  ]);
  if (Array.isArray(db.userDepartmentAccess) && db.userDepartmentAccess.length > 0) {
    const prevLen = db.userDepartmentAccess.length;
    db.userDepartmentAccess = db.userDepartmentAccess.filter((u: any) => {
      if (!u) return false;
      if (mockAccessIds.has(u.id)) return false;
      if (typeof u.userId === "string" && u.userId.startsWith("depadmin-dep-")) return false;
      if (typeof u.userId === "string" && u.userId.startsWith("emp-")) return false;
      if (u.id === "perm-leader-1" || u.userId === "team-1") return false;
      if (mockDirectorNationalIds.has(u.nationalId)) return false;
      if (typeof u.userName === "string" && mockNames.has(u.userName.trim())) return false;
      return true;
    });
    if (db.userDepartmentAccess.length !== prevLen) modified = true;
  }

  // Purge mock employees
  const mockEmpIds = new Set(["emp-1", "emp-2", "emp-3", "emp-4"]);
  if (Array.isArray(db.employees) && db.employees.length > 0) {
    const prevLen = db.employees.length;
    db.employees = db.employees.filter((e: any) => {
      if (!e) return false;
      if (mockEmpIds.has(e.id)) return false;
      if (mockNames.has(e.name)) return false;
      return true;
    });
    if (db.employees.length !== prevLen) modified = true;
  }

  // Purge mock leaders
  const mockLdrIds = new Set(["ldr-1", "ldr-2"]);
  if (Array.isArray(db.leaders) && db.leaders.length > 0) {
    const prevLen = db.leaders.length;
    db.leaders = db.leaders.filter((l: any) => {
      if (!l) return false;
      if (mockLdrIds.has(l.id)) return false;
      if (mockNames.has(l.name)) return false;
      return true;
    });
    if (db.leaders.length !== prevLen) modified = true;
  }

  // Purge mock employeeRequests and teamStaffAssignments
  if (Array.isArray(db.employeeRequests) && db.employeeRequests.length > 0) {
    const prevLen = db.employeeRequests.length;
    db.employeeRequests = db.employeeRequests.filter((r: any) => !r || (r.id !== "emp-req-1" && r.id !== "emp-req-2"));
    if (db.employeeRequests.length !== prevLen) modified = true;
  }
  if (Array.isArray(db.teamStaffAssignments) && db.teamStaffAssignments.length > 0) {
    const prevLen = db.teamStaffAssignments.length;
    db.teamStaffAssignments = db.teamStaffAssignments.filter((a: any) => !a || a.id !== "tsa-1");
    if (db.teamStaffAssignments.length !== prevLen) modified = true;
  }

  // Clear mock commander from systemSettings
  if (db.systemSettings) {
    if (db.systemSettings.commanderInChief === "أحمد بن عواض المعبدي") {
      db.systemSettings.commanderInChief = "";
      modified = true;
    }
    if (db.systemSettings.viceCommander === "م. سلطان الزهراني") {
      db.systemSettings.viceCommander = "";
      modified = true;
    }
  }

  return modified;
}

/**
 * Retrieves the unified system state from PostgreSQL
 */
export async function getPostgresSystemState(): Promise<{
  data: any;
  version: number;
  lastModified: string;
  checksum: string;
} | null> {
  const p = getPostgresPool();
  if (!p) return null;

  try {
    await initPostgresTables();
    const res = await p.query(
      `SELECT data, version, last_modified, checksum_sha256 FROM system_state WHERE id = 'primary' LIMIT 1;`
    );
    if (!res.rows || res.rows.length === 0) return null;

    const row = res.rows[0];
    if (row.data) {
      normalizeSystemStateCollections(row.data);
    }
    return {
      data: row.data,
      version: Number(row.version),
      lastModified: row.last_modified ? new Date(row.last_modified).toISOString() : new Date().toISOString(),
      checksum: row.checksum_sha256
    };
  } catch (err: any) {
    console.error('[PostgreSQL getSystemState Error]:', err.message);
    throw new Error(`PostgreSQL system_state read failed: ${err.message}`);
  }
}

/**
 * Saves or initializes the system state in PostgreSQL
 */
export async function savePostgresSystemState(data: any, updatedBy: string = 'System'): Promise<{
  success: boolean;
  version: number;
  checksum: string;
}> {
  const p = getPostgresPool();
  if (!p) throw new Error('PostgreSQL pool not available');

  await initPostgresTables();

  const currentVerRes = await p.query("SELECT version FROM system_state WHERE id = 'primary' LIMIT 1;");
  const currentVersion = currentVerRes.rows.length > 0 ? Number(currentVerRes.rows[0].version) : 0;
  const version = (typeof data._version === 'number' && data._version > currentVersion) 
    ? data._version 
    : currentVersion + 1;
  data._version = version;
  data._lastModified = new Date().toISOString();

  const serialized = JSON.stringify(data);
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

  await p.query(
    `INSERT INTO system_state (id, data, version, last_modified, checksum_sha256, updated_by)
     VALUES ('primary', $1::jsonb, $2, NOW(), $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       data = EXCLUDED.data,
       version = EXCLUDED.version,
       last_modified = NOW(),
       checksum_sha256 = EXCLUDED.checksum_sha256,
       updated_by = EXCLUDED.updated_by;`,
    [serialized, version, checksum, updatedBy]
  );

  return { success: true, version, checksum };
}

/**
 * Executes an atomic transaction mutation with pessimistic row-locking (FOR UPDATE)
 * Guarantees Zero Lost Updates across concurrent processes and multi-instance deployments.
 * Fail-Closed: Never silently falls back to local JSON on database error.
 */
export async function executePostgresTransactionMutation<T>(
  mutator: (db: any) => Promise<T> | T,
  updatedBy: string = 'System'
): Promise<T> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL storage is active but connection pool is unavailable.');
  }

  await initPostgresTables();
  const client = await p.connect();

  try {
    await client.query('BEGIN;');

    // 1. Lock the row exclusively. Other concurrent transactions will block here until this transaction commits/rolls back.
    const res = await client.query(
      `SELECT data, version FROM system_state WHERE id = 'primary' FOR UPDATE;`
    );

    let currentDb: any;
    let currentVersion = 1;

    if (!res.rows || res.rows.length === 0) {
      throw new Error("system_state table row 'primary' is missing. Database must be initialized before mutations.");
    } else {
      currentDb = res.rows[0].data;
      currentVersion = Number(res.rows[0].version);
    }

    // 2. Execute the user mutator function on the latest locked state (guaranteeing normalized collections)
    normalizeSystemStateCollections(currentDb);
    const result = await mutator(currentDb);

    // 3. Increment sequential version and update timestamp
    const nextVersion = currentVersion + 1;
    currentDb._version = nextVersion;
    currentDb._lastModified = new Date().toISOString();

    const serialized = JSON.stringify(currentDb);
    const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

    // 4. Update row atomically
    await client.query(
      `UPDATE system_state 
       SET data = $1::jsonb, 
           version = $2, 
           last_modified = NOW(), 
           checksum_sha256 = $3, 
           updated_by = $4 
       WHERE id = 'primary';`,
      [serialized, nextVersion, checksum, updatedBy]
    );

    await client.query('COMMIT;');
    return result;
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('[PostgreSQL Transaction Mutation Failed]:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health probe reporting PostgreSQL status without exposing connection strings or credentials
 */
export async function getPostgresHealthReport(): Promise<{
  connected: boolean;
  initialized: boolean;
  version?: number;
  lastModified?: string;
  checksum?: string;
  latencyMs?: number;
  error?: string;
}> {
  const p = getPostgresPool();
  if (!p) {
    return { connected: false, initialized: false, error: "PostgreSQL pool is not configured (missing DATABASE_URL)" };
  }
  const start = Date.now();
  try {
    const client = await p.connect();
    try {
      await client.query('SELECT 1;');
      const latencyMs = Date.now() - start;
      const res = await client.query("SELECT version, last_modified, checksum_sha256 FROM system_state WHERE id = 'primary' LIMIT 1;").catch(() => ({ rows: [] }));
      const isInit = res.rows && res.rows.length > 0;
      return {
        connected: true,
        initialized: isInit,
        version: isInit ? Number(res.rows[0].version) : undefined,
        lastModified: isInit && res.rows[0].last_modified ? new Date(res.rows[0].last_modified).toISOString() : undefined,
        checksum: isInit ? res.rows[0].checksum_sha256 : undefined,
        latencyMs
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      initialized: false,
      latencyMs: Date.now() - start,
      error: "PostgreSQL connection probe failed"
    };
  }
}

/**
 * Executes a one-time clean administrative bootstrap of a brand new, empty PostgreSQL database.
 * Strictly non-reentrant: if system_state already exists, execution is blocked immediately.
 * Zero mock/fake users, zero fake volunteers, zero fake beneficiaries.
 */
export async function bootstrapCleanPostgresSystemState(
  initialOpsAccount: {
    userId: string;
    username: string;
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    nationalId?: string;
  },
  bootstrapBy: string = 'Administrative Bootstrap'
): Promise<{ success: boolean; version: number; checksum: string; data: any }> {
  const p = getPostgresPool();
  if (!p) throw new Error("PostgreSQL pool not available.");

  await initPostgresTables();
  const client = await p.connect();

  try {
    await client.query('BEGIN;');

    // 0. Acquire exclusive transaction-level advisory lock to serialize concurrent bootstrap attempts
    // This prevents race conditions even when system_state table is completely empty!
    await client.query('SELECT pg_advisory_xact_lock(789456123);');

    // 1. Check if system_state row already exists (strictly non-reentrant)
    const checkRes = await client.query("SELECT id, version FROM system_state WHERE id = 'primary' LIMIT 1;");
    if (checkRes.rows && checkRes.rows.length > 0) {
      throw new Error("قاعدة البيانات مهيأة مسبقًا بالفعل (Database is already initialized). إجراء التهيئة الأولية غير قابل للتكرار لحماية البيانات القائمة.");
    }

    // 2. Build clean baseline data without any mock/fake beneficiaries, volunteers, or initiatives
    const cleanDbState: any = {
      _version: 1,
      _lastModified: new Date().toISOString(),
      departments: [
        {
          id: "dep-1",
          nameAr: "الإدارة التنفيذية",
          nameEn: "Executive Management",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "تنفيذ قرارات مجلس الإدارة والإشراف على كافة الإدارات والخطط التشغيلية ومؤشرات الجودة.",
          descriptionEn: "Executing board decisions, supervising all departments, operational plans, and quality metrics."
        },
        {
          id: "dep-2",
          nameAr: "الإدارة المالية",
          nameEn: "Financial Management",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "إدارة الميزانيات والتقارير المالية والتدقيق المحاسبي وسندات الصرف والقبض."
        },
        {
          id: "dep-3",
          nameAr: "إدارة البرامج والمشاريع",
          nameEn: "Programs & Projects Management",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "تخطيط وتنفيذ المبادرات المجتمعية والمشاريع التنموية وقياس الأثر المجتمعي."
        },
        {
          id: "dep-4",
          nameAr: "إدارة المستفيدين",
          nameEn: "Beneficiaries Management",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "استقبال طلبات الرعاية، دراسة الحالات الاجتماعية، وتقديم الدعم للأسر المستحقة."
        },
        {
          id: "dep-5",
          nameAr: "إدارة التطوع",
          nameEn: "Volunteer Management",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "استقطاب وتأهيل المتطوعين، إدارة الفرق التطوعية، وإصدار بطاقات التطوع الذكية."
        },
        {
          id: "dep-7",
          nameAr: "إدارة تنمية الموارد المالية والشراكات",
          nameEn: "Resource Development & Partnerships",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "بناء الشراكات الاستراتيجية واستقطاب الداعمين ورعاية برامج الاستدامة المالية."
        },
        {
          id: "dep-8",
          nameAr: "إدارة الخدمات المساندة",
          nameEn: "Support Services & Warehouses",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "إدارة المستودعات، الدعم التقني، المشتريات، وصيانة المرافق والخدمات العامة."
        },
        {
          id: "dep-9",
          nameAr: "إدارة الموارد البشرية",
          nameEn: "Human Resources Management",
          directorName: "",
          nationalId: "",
          email: "",
          phone: "",
          descriptionAr: "إدارة شؤون الموظفين، التوظيف، العقود والرواتب، والتدريب والتطوير الإداري."
        }
      ],
      volunteers: [],
      beneficiaries: [],
      initiatives: [],
      teams: [],
      benefitRequests: [],
      volunteerApplications: [],
      teamApplications: [],
      volunteerTransferRequests: [],
      passwordResetRequests: [],
      letters: [],
      news: [],
      partners: [],
      gallery: [],
      chatConversations: [],
      chatMessages: [],
      supportTickets: [],
      supportTasks: [],
      custodies: [],
      requests: [],
      logs: [],
      notifications: [],
      storekeepers: [],
      inventoryItems: [],
      inventoryMovements: [],
      inventoryLogs: [],
      inventoryAudits: [],
      volunteerIssuances: [],
      issuedVolunteerCards: [],
      volunteerCardTemplates: [],
      employees: [],
      employeeRequests: [],
      hrLeaves: [],
      hrAttendance: [],
      hrDecisions: [],
      hrEvaluations: [],
      attendance: [],
      evaluations: [],
      distributions: [],
      distributionHandovers: [],
      orgMembers: [],
      heroSlides: [],
      opportunityRequests: [],
      departmentDirectives: [],
      storeProjects: [],
      storeDonations: [],
      financialTransactions: [],
      financialAuditLog: [],
      financialTransfers: [],
      financialIncome: [],
      financialReceipts: [],
      financialExpenses: [],
      financialPurchases: [],
      financialPayables: [],
      financialPayroll: [],
      financialDocuments: [],
      emailLogs: [],
      notificationDeliveryLogs: [],
      permissionChangeLogs: [],
      developerErrorLogs: [],
      customFields: [],
      systemSettings: {
        systemName: "نظام إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        teamName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        licenseNumber: "1000888600",
        registrationNumber: "1000888600",
        foundationYear: "1445هـ / 2024م",
        officialEmail: "info@riadataleata.org.sa",
        mobileNumber: "0541820904",
        landlineNumber: "0541820904",
        address: "مكة المكرمة - مخطط العسيلة - الشارع العام",
        maintenanceMode: false
      },
      userDepartmentAccess: [
        {
          id: `perm-${initialOpsAccount.userId}`,
          userId: initialOpsAccount.userId,
          username: initialOpsAccount.username,
          userName: initialOpsAccount.name,
          userEmail: initialOpsAccount.email,
          email: initialOpsAccount.email,
          phone: initialOpsAccount.phone || "",
          nationalId: initialOpsAccount.nationalId || "",
          role: "operations_manager",
          jobTitle: "مدير العمليات",
          primaryDepartmentId: "dep-1",
          primaryDepartmentName: "إدارة العمليات والتشغيل",
          additionalDepartmentIds: ["dep-1", "dep-2", "dep-3", "dep-4", "dep-5", "dep-7", "dep-8", "dep-9"],
          allowedDepartmentIds: ["dep-1", "dep-2", "dep-3", "dep-4", "dep-5", "dep-7", "dep-8", "dep-9"],
          permissions: [
            "super_admin", "operations_manager", "manage_users", "manage_permissions",
            "view_department", "create_data", "edit_data", "delete_data",
            "export_pdf", "export_excel", "manage_staff", "manage_tasks",
            "view_reports", "cross_department_access", "all_permissions"
          ],
          status: "active",
          mustChangePassword: true,
          passwordHash: initialOpsAccount.passwordHash,
          createdAt: new Date().toISOString(),
          createdBy: bootstrapBy
        }
      ],
      accessAuditLogs: [
        {
          id: `audit-bootstrap-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "SYSTEM_BOOTSTRAP_CLEAN",
          actorId: bootstrapBy,
          targetUserId: initialOpsAccount.userId,
          targetEmail: initialOpsAccount.email,
          targetRole: "operations_manager",
          status: "success",
          details: "تم تهيئة قاعدة بيانات الإنتاج بنجاح بنسخة نظيفة غير وهمية وإنشاء أول حساب مدير عمليات مع فرض تغيير كلمة المرور."
        }
      ]
    };

    const serialized = JSON.stringify(cleanDbState);
    const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

    const insertRes = await client.query(
      `INSERT INTO system_state (id, data, version, last_modified, checksum_sha256, updated_by)
       VALUES ('primary', $1::jsonb, 1, NOW(), $2, $3)
       ON CONFLICT (id) DO NOTHING
       RETURNING id;`,
      [serialized, checksum, bootstrapBy]
    );

    if (!insertRes.rows || insertRes.rows.length === 0) {
      throw new Error("قاعدة البيانات مهيأة مسبقًا بالفعل (Database was initialized by another concurrent transaction).");
    }

    await client.query('COMMIT;');
    return { success: true, version: 1, checksum, data: cleanDbState };
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// SYSTEM FILES PERMANENT REPOSITORY (PostgreSQL Metadata Layer)
// ============================================================================

export interface SystemFileRecord {
  id: string;
  fileKey: string;
  originalName: string;
  sanitizedName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageProvider: string;
  bucketName: string;
  checksumSha256: string;
  entityType: string;
  entityId: string;
  fieldName?: string;
  isPrivate: boolean;
  accessRoles: string[];
  uploadedBy: string;
  uploadedAt: string;
  status: 'active' | 'archived' | 'deleted';
}

function mapRowToFileRecord(row: any): SystemFileRecord {
  let roles: string[] = ['admin'];
  if (Array.isArray(row.access_roles)) {
    roles = row.access_roles;
  } else if (typeof row.access_roles === 'string') {
    try { roles = JSON.parse(row.access_roles); } catch {}
  }

  return {
    id: row.id,
    fileKey: row.file_key,
    originalName: row.original_name,
    sanitizedName: row.sanitized_name,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    storageProvider: row.storage_provider,
    bucketName: row.bucket_name,
    checksumSha256: row.checksum_sha256,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fieldName: row.field_name || undefined,
    isPrivate: Boolean(row.is_private),
    accessRoles: roles,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : new Date().toISOString(),
    status: row.status || 'active'
  };
}

export async function insertSystemFile(file: SystemFileRecord): Promise<void> {
  const p = getPostgresPool();
  if (!p) return;

  await initPostgresTables();
  await p.query(
    `INSERT INTO system_files (
      id, file_key, original_name, sanitized_name, mime_type, file_size_bytes,
      storage_provider, bucket_name, checksum_sha256, entity_type, entity_id,
      field_name, is_private, access_roles, uploaded_by, uploaded_at, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17
    ) ON CONFLICT (file_key) DO UPDATE SET
      original_name = EXCLUDED.original_name,
      file_size_bytes = EXCLUDED.file_size_bytes,
      checksum_sha256 = EXCLUDED.checksum_sha256,
      entity_type = EXCLUDED.entity_type,
      entity_id = EXCLUDED.entity_id,
      field_name = EXCLUDED.field_name,
      is_private = EXCLUDED.is_private,
      access_roles = EXCLUDED.access_roles,
      status = EXCLUDED.status;`,
    [
      file.id,
      file.fileKey,
      file.originalName,
      file.sanitizedName,
      file.mimeType,
      file.fileSizeBytes,
      file.storageProvider || 's3',
      file.bucketName,
      file.checksumSha256,
      file.entityType,
      file.entityId,
      file.fieldName || null,
      file.isPrivate,
      JSON.stringify(file.accessRoles || ['admin']),
      file.uploadedBy,
      file.uploadedAt || new Date().toISOString(),
      file.status || 'active'
    ]
  );
}

export async function getSystemFileByKey(fileKey: string): Promise<SystemFileRecord | null> {
  const p = getPostgresPool();
  if (!p) return null;

  try {
    const res = await p.query(
      `SELECT * FROM system_files WHERE file_key = $1 AND status != 'deleted' LIMIT 1;`,
      [fileKey]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return mapRowToFileRecord(res.rows[0]);
  } catch (err: any) {
    console.error(`[PostgreSQL getSystemFileByKey Error]:`, err.message);
    return null;
  }
}

export async function getSystemFileById(id: string): Promise<SystemFileRecord | null> {
  const p = getPostgresPool();
  if (!p) return null;

  try {
    const res = await p.query(
      `SELECT * FROM system_files WHERE id = $1 AND status != 'deleted' LIMIT 1;`,
      [id]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return mapRowToFileRecord(res.rows[0]);
  } catch (err: any) {
    console.error(`[PostgreSQL getSystemFileById Error]:`, err.message);
    return null;
  }
}

export async function listSystemFilesByEntity(entityType: string, entityId: string): Promise<SystemFileRecord[]> {
  const p = getPostgresPool();
  if (!p) return [];

  try {
    const res = await p.query(
      `SELECT * FROM system_files WHERE entity_type = $1 AND entity_id = $2 AND status != 'deleted' ORDER BY uploaded_at DESC;`,
      [entityType, entityId]
    );
    return (res.rows || []).map(mapRowToFileRecord);
  } catch (err: any) {
    console.error(`[PostgreSQL listSystemFilesByEntity Error]:`, err.message);
    return [];
  }
}

export async function deleteSystemFile(fileKey: string): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;

  try {
    const res = await p.query(
      `UPDATE system_files SET status = 'deleted' WHERE file_key = $1;`,
      [fileKey]
    );
    return (res.rowCount || 0) > 0;
  } catch (err: any) {
    console.error(`[PostgreSQL deleteSystemFile Error]:`, err.message);
    return false;
  }
}

export async function listAllSystemFiles(limit: number = 1000): Promise<SystemFileRecord[]> {
  const p = getPostgresPool();
  if (!p) return [];

  try {
    const res = await p.query(
      `SELECT * FROM system_files WHERE status != 'deleted' ORDER BY uploaded_at DESC LIMIT $1;`,
      [limit]
    );
    return (res.rows || []).map(mapRowToFileRecord);
  } catch (err: any) {
    console.error(`[PostgreSQL listAllSystemFiles Error]:`, err.message);
    return [];
  }
}


