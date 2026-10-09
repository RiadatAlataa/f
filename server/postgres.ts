import pg from 'pg';

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
  const url = process.env.DATABASE_URL || 
              process.env.POSTGRESQL_URL || 
              process.env.PG_URL ||
              process.env.POSTGRES_URL;
  return Boolean(url && typeof url === 'string' && url.trim().length > 0);
}

/**
 * Gets or initializes the PostgreSQL connection pool
 */
export function getPostgresPool(): pg.Pool | null {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL || 
                           process.env.POSTGRESQL_URL || 
                           process.env.PG_URL ||
                           process.env.POSTGRES_URL;

  if (!connectionString) {
    return null;
  }

  try {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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
      const client = await p.connect();
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

        // Ensure default row exists in maintenance_settings if empty
        const checkRes = await client.query('SELECT COUNT(*) FROM maintenance_settings WHERE id = 1;');
        if (parseInt(checkRes.rows[0].count, 10) === 0) {
          await client.query(`
            INSERT INTO maintenance_settings (id, enabled, maintenance_mode, message, updated_at, updated_by)
            VALUES (1, FALSE, 0, 'نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.', CURRENT_TIMESTAMP, 'System Initialization')
            ON CONFLICT (id) DO NOTHING;
          `);
        }

        console.log('[PostgreSQL] Maintenance tables verified and ready.');
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
