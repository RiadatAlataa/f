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

        // Ensure default row exists in maintenance_settings if empty
        const checkRes = await client.query('SELECT COUNT(*) FROM maintenance_settings WHERE id = 1;');
        if (parseInt(checkRes.rows[0].count, 10) === 0) {
          await client.query(`
            INSERT INTO maintenance_settings (id, enabled, maintenance_mode, message, updated_at, updated_by)
            VALUES (1, FALSE, 0, 'نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.', CURRENT_TIMESTAMP, 'System Initialization')
            ON CONFLICT (id) DO NOTHING;
          `);
        }

        console.log('[PostgreSQL] Maintenance and system_state tables verified and ready.');
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

    // 2. Execute the user mutator function on the latest locked state
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
          directorName: "أ. عبد الرحمن السليمان",
          nationalId: "1010000001",
          email: "exec@riadataleata.org.sa",
          phone: "0551000001",
          descriptionAr: "تنفيذ قرارات مجلس الإدارة والإشراف على كافة الإدارات والخطط التشغيلية ومؤشرات الجودة.",
          descriptionEn: "Executing board decisions, supervising all departments, operational plans, and quality metrics."
        },
        {
          id: "dep-2",
          nameAr: "الإدارة المالية",
          nameEn: "Financial Management",
          directorName: "أ. عبد الله العتيبي",
          nationalId: "1010000002",
          email: "finance@riadataleata.org.sa",
          phone: "0551000002",
          descriptionAr: "إدارة الميزانيات والتقارير المالية والتدقيق المحاسبي وسندات الصرف والقبض."
        },
        {
          id: "dep-3",
          nameAr: "إدارة البرامج والمشاريع",
          nameEn: "Programs & Projects Management",
          directorName: "أ. فيصل الأحمدي",
          nationalId: "1010000003",
          email: "projects@riadataleata.org.sa",
          phone: "0551000003",
          descriptionAr: "تخطيط وتنفيذ المبادرات المجتمعية والمشاريع التنموية وقياس الأثر المجتمعي."
        },
        {
          id: "dep-4",
          nameAr: "إدارة المستفيدين",
          nameEn: "Beneficiaries Management",
          directorName: "أ. مريم الغامدي",
          nationalId: "1010000004",
          email: "beneficiaries@riadataleata.org.sa",
          phone: "0551000004",
          descriptionAr: "استقبال طلبات الرعاية، دراسة الحالات الاجتماعية، وتقديم الدعم للأسر المستحقة."
        },
        {
          id: "dep-5",
          nameAr: "إدارة التطوع",
          nameEn: "Volunteer Management",
          directorName: "أ. منيرة القحطاني",
          nationalId: "1010000005",
          email: "volunteers@riadataleata.org.sa",
          phone: "0551000005",
          descriptionAr: "استقطاب وتأهيل المتطوعين، إدارة الفرق التطوعية، وإصدار بطاقات التطوع الذكية."
        },
        {
          id: "dep-7",
          nameAr: "إدارة تنمية الموارد المالية والشراكات",
          nameEn: "Resource Development & Partnerships",
          directorName: "أ. ماجد الدوسري",
          nationalId: "1010000007",
          email: "partnerships@riadataleata.org.sa",
          phone: "0551000007",
          descriptionAr: "بناء الشراكات الاستراتيجية واستقطاب الداعمين ورعاية برامج الاستدامة المالية."
        },
        {
          id: "dep-8",
          nameAr: "إدارة الخدمات المساندة",
          nameEn: "Support Services & Warehouses",
          directorName: "أ. سعود الحربي",
          nationalId: "1010000008",
          email: "support@riadataleata.org.sa",
          phone: "0551000008",
          descriptionAr: "إدارة المستودعات، الدعم التقني، المشتريات، وصيانة المرافق والخدمات العامة."
        },
        {
          id: "dep-9",
          nameAr: "إدارة الموارد البشرية",
          nameEn: "Human Resources Management",
          directorName: "أ. نورة بنت فهد الشريف",
          nationalId: "1010000009",
          email: "hr@riadataleata.org.sa",
          phone: "0551000009",
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
      storekeepers: [],
      customFields: [],
      systemSettings: {
        systemName: "نظام إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        teamName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        licenseNumber: "5434",
        registrationNumber: "5434",
        foundationYear: "1445هـ / 2024م",
        officialEmail: "info@riadataleata.org.sa",
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

