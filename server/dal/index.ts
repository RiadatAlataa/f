/**
 * Unified Data Access Layer (DAL) & Storage Abstraction
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Provides:
 * 1. Single Source of Truth architecture (No conflicting split-brain dual writes).
 * 2. Pluggable adapters: JsonDataAccessLayer (current default) & PostgresDataAccessLayer (prepared).
 * 3. Preserves all existing IDs, password hashes (bcrypt), roles, and permissions.
 * 4. ACID transaction coordination and concurrent race protection.
 */

import bcrypt from "bcryptjs";
import { readDb, mutateDb } from "../../server-core";
import { getPostgresPool } from "../postgres";

export interface SystemUserEntity {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  role: string;
  jobTitle?: string;
  primaryDepartmentId?: string;
  allowedDepartmentIds?: string[];
  permissions?: string[];
  passwordHash?: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  mustChangePassword?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDataAccessLayer {
  findUserByIdentifier(identifier: string): Promise<SystemUserEntity | null>;
  createUser(user: SystemUserEntity): Promise<SystemUserEntity>;
  updateUser(id: string, patch: Partial<SystemUserEntity>): Promise<SystemUserEntity | null>;
  
  findVolunteer(idOrNationalId: string): Promise<any | null>;
  createVolunteer(volunteerData: any): Promise<any>;
  updateVolunteer(id: string, patch: any): Promise<any | null>;

  findBeneficiary(idOrNationalId: string): Promise<any | null>;
  createBeneficiary(beneficiaryData: any): Promise<any>;
  
  executeTransaction<T>(work: (context: any) => Promise<T>): Promise<T>;
}

/**
 * JSON Storage Adapter (Current operational baseline)
 */
export class JsonDataAccessLayer implements IDataAccessLayer {
  public async findUserByIdentifier(identifier: string): Promise<SystemUserEntity | null> {
    const db = readDb();
    const idClean = identifier.trim().toLowerCase();
    
    // Check in userDepartmentAccess
    const access = (db.userDepartmentAccess || []).find((u: any) => 
      (u.userId && u.userId.toLowerCase() === idClean) ||
      (u.username && u.username.toLowerCase() === idClean) ||
      (u.userEmail && u.userEmail.toLowerCase() === idClean) ||
      (u.email && u.email.toLowerCase() === idClean) ||
      (u.nationalId && u.nationalId === identifier.trim())
    );

    if (access) {
      return {
        id: access.userId || access.id,
        name: access.userName || access.name,
        username: access.username || access.userId,
        email: access.userEmail || access.email,
        phone: access.phone,
        nationalId: access.nationalId,
        role: access.role || 'employee',
        jobTitle: access.jobTitle,
        primaryDepartmentId: access.primaryDepartmentId,
        allowedDepartmentIds: access.allowedDepartmentIds || [access.primaryDepartmentId],
        permissions: access.permissions || [],
        passwordHash: access.passwordHash || access.password,
        status: access.status || 'active',
        mustChangePassword: !!access.mustChangePassword,
        lastLogin: access.lastLogin
      };
    }

    // Check in dedicated admin accounts
    if (idClean === 'admin' || idClean === 'admin-user' || idClean === 'admin@riadataleata.org.sa') {
      return {
        id: 'admin-user',
        name: 'مجلس الجمعية والمدير التنفيذي',
        email: 'admin@riadataleata.org.sa',
        role: 'admin',
        jobTitle: 'المدير العام والمدير التنفيذي',
        permissions: ['super_admin', 'all'],
        status: 'active'
      };
    }

    return null;
  }

  public async createUser(user: SystemUserEntity): Promise<SystemUserEntity> {
    return await mutateDb(async (db) => {
      if (!db.userDepartmentAccess) db.userDepartmentAccess = [];
      const exists = db.userDepartmentAccess.find((u: any) => 
        (user.nationalId && u.nationalId === user.nationalId) ||
        (user.email && u.userEmail === user.email) ||
        (user.username && u.username === user.username)
      );
      if (exists) {
        throw new Error("المستخدم مسجل مسبقًا برقم الهوية أو البريد أو اسم المستخدم.");
      }

      const entity = {
        id: user.id,
        userId: user.id,
        userName: user.name,
        username: user.username || user.id,
        userEmail: user.email,
        phone: user.phone,
        nationalId: user.nationalId,
        role: user.role,
        jobTitle: user.jobTitle,
        primaryDepartmentId: user.primaryDepartmentId,
        allowedDepartmentIds: user.allowedDepartmentIds || [user.primaryDepartmentId],
        permissions: user.permissions || [],
        passwordHash: user.passwordHash,
        status: user.status,
        mustChangePassword: !!user.mustChangePassword,
        createdAt: new Date().toISOString()
      };

      db.userDepartmentAccess.push(entity);
      return user;
    });
  }

  public async updateUser(id: string, patch: Partial<SystemUserEntity>): Promise<SystemUserEntity | null> {
    return await mutateDb(async (db) => {
      const idx = (db.userDepartmentAccess || []).findIndex((u: any) => u.userId === id || u.id === id);
      if (idx === -1) return null;
      
      const current = db.userDepartmentAccess[idx];
      db.userDepartmentAccess[idx] = {
        ...current,
        ...(patch.name ? { userName: patch.name } : {}),
        ...(patch.email ? { userEmail: patch.email } : {}),
        ...(patch.phone ? { phone: patch.phone } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.passwordHash ? { passwordHash: patch.passwordHash } : {}),
        updatedAt: new Date().toISOString()
      };

      return {
        id,
        name: db.userDepartmentAccess[idx].userName,
        role: db.userDepartmentAccess[idx].role,
        status: db.userDepartmentAccess[idx].status
      };
    });
  }

  public async findVolunteer(idOrNationalId: string): Promise<any | null> {
    const db = readDb();
    const idTrim = idOrNationalId.trim();
    return (db.volunteers || []).find((v: any) => v.id === idTrim || v.nationalId === idTrim || v.fileNumber === idTrim) || null;
  }

  public async createVolunteer(volunteerData: any): Promise<any> {
    return await mutateDb(async (db) => {
      if (!db.volunteers) db.volunteers = [];
      const dup = db.volunteers.find((v: any) => 
        (volunteerData.nationalId && v.nationalId === volunteerData.nationalId) ||
        (volunteerData.fileNumber && v.fileNumber === volunteerData.fileNumber)
      );
      if (dup) {
        throw new Error("رقم الهوية الوطنية أو رقم الملف مسجل بالفعل لمتطوع آخر.");
      }
      db.volunteers.push(volunteerData);
      return volunteerData;
    });
  }

  public async updateVolunteer(id: string, patch: any): Promise<any | null> {
    return await mutateDb(async (db) => {
      const vol = (db.volunteers || []).find((v: any) => v.id === id);
      if (!vol) return null;
      Object.assign(vol, patch, { updatedAt: new Date().toISOString() });
      return vol;
    });
  }

  public async findBeneficiary(idOrNationalId: string): Promise<any | null> {
    const db = readDb();
    const idTrim = idOrNationalId.trim();
    return (db.beneficiaries || []).find((b: any) => b.id === idTrim || b.nationalId === idTrim) || null;
  }

  public async createBeneficiary(beneficiaryData: any): Promise<any> {
    return await mutateDb(async (db) => {
      if (!db.beneficiaries) db.beneficiaries = [];
      const dup = db.beneficiaries.find((b: any) => 
        (beneficiaryData.nationalId && b.nationalId === beneficiaryData.nationalId)
      );
      if (dup) {
        throw new Error("رقم الهوية الوطنية مسجل بالفعل لمستفيد آخر.");
      }
      db.beneficiaries.push(beneficiaryData);
      return beneficiaryData;
    });
  }

  public async executeTransaction<T>(work: (context: any) => Promise<T>): Promise<T> {
    return await mutateDb(async (db) => {
      return await work(db);
    });
  }
}

/**
 * PostgreSQL Storage Adapter (Permanent storage adapter)
 */
export class PostgresDataAccessLayer implements IDataAccessLayer {
  public async findUserByIdentifier(identifier: string): Promise<SystemUserEntity | null> {
    const pool = getPostgresPool();
    if (!pool) throw new Error("PostgreSQL pool not available.");

    const res = await pool.query(
      `SELECT id, name, username, email, phone, national_id, role, job_title, 
              primary_department_id, allowed_departments, allowed_pages, permissions,
              password_hash, status, must_change_password, last_login, created_at, updated_at
       FROM system_users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) OR national_id = $1 OR id = $1
       LIMIT 1;`,
      [identifier.trim()]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      username: r.username,
      email: r.email,
      phone: r.phone,
      nationalId: r.national_id,
      role: r.role,
      jobTitle: r.job_title,
      primaryDepartmentId: r.primary_department_id,
      allowedDepartmentIds: r.allowed_departments,
      permissions: r.permissions,
      passwordHash: r.password_hash,
      status: r.status,
      mustChangePassword: r.must_change_password,
      lastLogin: r.last_login
    };
  }

  public async createUser(user: SystemUserEntity): Promise<SystemUserEntity> {
    const pool = getPostgresPool();
    if (!pool) throw new Error("PostgreSQL pool not available.");

    await pool.query(
      `INSERT INTO system_users (
         id, username, email, phone, national_id, password_hash, name, role,
         job_title, primary_department_id, allowed_departments, permissions, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13);`,
      [
        user.id,
        user.username || user.id,
        user.email,
        user.phone,
        user.nationalId,
        user.passwordHash || '',
        user.name,
        user.role,
        user.jobTitle,
        user.primaryDepartmentId,
        JSON.stringify(user.allowedDepartmentIds || []),
        JSON.stringify(user.permissions || []),
        user.status
      ]
    );

    return user;
  }

  public async updateUser(id: string, patch: Partial<SystemUserEntity>): Promise<SystemUserEntity | null> {
    const pool = getPostgresPool();
    if (!pool) throw new Error("PostgreSQL pool not available.");

    const res = await pool.query(
      `UPDATE system_users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           status = COALESCE($4, status),
           password_hash = COALESCE($5, password_hash),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, role, status;`,
      [patch.name, patch.email, patch.phone, patch.status, patch.passwordHash, id]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  public async findVolunteer(idOrNationalId: string): Promise<any | null> {
    const pool = getPostgresPool();
    if (!pool) return null;
    const res = await pool.query(
      `SELECT * FROM volunteers WHERE id = $1 OR national_id = $1 OR file_number = $1 LIMIT 1;`,
      [idOrNationalId.trim()]
    );
    return res.rows[0] || null;
  }

  public async createVolunteer(vol: any): Promise<any> {
    const pool = getPostgresPool();
    if (!pool) throw new Error("PostgreSQL pool not available.");

    await pool.query(
      `INSERT INTO volunteers (
         id, file_number, name, national_id, phone, email, gender, birth_date, city,
         qualification, occupation, skills, interests, status, role, primary_department_id,
         team_id, password_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16, $17, $18);`,
      [
        vol.id, vol.fileNumber, vol.name, vol.nationalId, vol.phone, vol.email, vol.gender,
        vol.birthDate, vol.city, vol.qualification, vol.occupation,
        JSON.stringify(vol.skills || []), JSON.stringify(vol.interests || []),
        vol.status || 'pending', vol.role || 'volunteer', vol.primaryDepartmentId, vol.teamId,
        vol.passwordHash
      ]
    );
    return vol;
  }

  public async updateVolunteer(id: string, patch: any): Promise<any | null> {
    const pool = getPostgresPool();
    if (!pool) return null;
    const res = await pool.query(
      `UPDATE volunteers 
       SET phone = COALESCE($1, phone),
           email = COALESCE($2, email),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *;`,
      [patch.phone, patch.email, patch.status, id]
    );
    return res.rows[0] || null;
  }

  public async findBeneficiary(idOrNationalId: string): Promise<any | null> {
    const pool = getPostgresPool();
    if (!pool) return null;
    const res = await pool.query(
      `SELECT * FROM beneficiaries WHERE id = $1 OR national_id = $1 LIMIT 1;`,
      [idOrNationalId.trim()]
    );
    return res.rows[0] || null;
  }

  public async createBeneficiary(ben: any): Promise<any> {
    const pool = getPostgresPool();
    if (!pool) throw new Error("PostgreSQL pool not available.");

    await pool.query(
      `INSERT INTO beneficiaries (
         id, name, national_id, phone, email, gender, city, district, income, category, status, password_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
      [
        ben.id, ben.name, ben.nationalId, ben.phone, ben.email, ben.gender,
        ben.city, ben.district, ben.income || 0, ben.category || 'عام',
        ben.status || 'active', ben.passwordHash
      ]
    );
    return ben;
  }

  public async executeTransaction<T>(work: (client: any) => Promise<T>): Promise<T> {
    const pool = getPostgresPool();
    if (!pool) throw new Error("PostgreSQL pool not available.");
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * Storage Factory: Returns the active data access layer based on configuration.
 * Prevents split-brain state and guarantees single source of truth.
 */
let dalInstance: IDataAccessLayer | null = null;

export function getDataAccessLayer(): IDataAccessLayer {
  if (dalInstance) return dalInstance;
  
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase();
  if (backend === 'postgres' && process.env.DATABASE_URL) {
    dalInstance = new PostgresDataAccessLayer();
  } else {
    dalInstance = new JsonDataAccessLayer();
  }
  return dalInstance;
}
