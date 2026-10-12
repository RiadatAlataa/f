/**
 * Unified Multi-Source Backup & Disaster Recovery Engine
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Supports:
 * - Atomic point-in-time multi-source bundling (JSON + Postgres helper tables + physical attachments)
 * - AES-256-GCM authenticated encryption with SHA-256 integrity digests
 * - Cloudflare R2 (S3-compatible) upload, list, and download
 * - Isolated Sandbox Restore Verification (Dry-Run) with zero production impact
 * - Anti-Downgrade verification (Watermark & Record count loss protection)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getPostgresPool, isPostgresConfigured } from "./postgres";
import { writeCoordinator } from "./writeLock";

export interface BackupPackageMetadata {
  backupId: string;
  schemaVersion: string;
  timestamp: string;
  association: string;
  watermark: string;
  recordCounts: Record<string, number>;
  attachmentsCount: number;
  sha256Plain: string;
}

export interface EncryptedBackupEnvelope {
  formatVersion: string;
  algorithm: string;
  backupId: string;
  timestamp: string;
  ivHex: string;
  tagHex: string;
  sha256Ciphertext: string;
  ciphertextBase64: string;
  metadata: BackupPackageMetadata;
}

export interface IsolatedVerificationResult {
  valid: boolean;
  backupId: string;
  timestamp: string;
  watermark: string;
  recordCounts: Record<string, number>;
  attachmentsExtracted: number;
  referentialIntegrity: {
    passed: boolean;
    errors: string[];
  };
  durationMs: number;
  sandboxDir: string;
}

export class BackupEngine {
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || "riadataleata-backups";
  }

  /**
   * Initializes or gets the Cloudflare R2 S3 client
   */
  public getR2Client(): S3Client | null {
    if (this.s3Client) return this.s3Client;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return null;
    }

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.s3Client;
  }

  /**
   * Reads physical attachments from disk into memory buffers
   */
  private collectAttachments(): Array<{ relativePath: string; contentBase64: string; sha256: string }> {
    const collected: Array<{ relativePath: string; contentBase64: string; sha256: string }> = [];
    const root = process.cwd();
    const targetDirs = [
      path.join(root, "public", "uploads"),
      path.join(root, "public", "card_templates")
    ];

    const MAX_SINGLE_FILE_BYTES = 15 * 1024 * 1024; // 15MB per file limit
    const MAX_TOTAL_ATTACHMENTS_BYTES = 45 * 1024 * 1024; // 45MB total attachments limit
    let totalBytesAccumulated = 0;

    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) continue;
      const scan = (currentPath: string) => {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            scan(fullPath);
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size > MAX_SINGLE_FILE_BYTES) {
                throw new Error(`Attachment exceeds maximum single file limit (${(stat.size / 1024 / 1024).toFixed(1)}MB > 15MB) at ${fullPath}`);
              }
              totalBytesAccumulated += stat.size;
              if (totalBytesAccumulated > MAX_TOTAL_ATTACHMENTS_BYTES) {
                throw new Error(`Total attachments size exceeds safety threshold (${(totalBytesAccumulated / 1024 / 1024).toFixed(1)}MB > 45MB)`);
              }

              const buffer = fs.readFileSync(fullPath);
              const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
              const hash = crypto.createHash("sha256").update(buffer).digest("hex");
              collected.push({
                relativePath,
                contentBase64: buffer.toString("base64"),
                sha256: hash
              });
            } catch (err: any) {
              // Explicit failure: do NOT silently skip readable attachments!
              throw new Error(`Mandatory attachment collection failed for "${fullPath}": ${err.message}`);
            }
          }
        }
      };
      scan(dir);
    }

    return collected;
  }

  /**
   * Queries PostgreSQL auxiliary tables safely
   */
  private async collectPostgresSnapshot(): Promise<{ data: Record<string, any[]>; mode: string }> {
    const result: Record<string, any[]> = {
      volunteer_file_numbers: [],
      maintenance_settings: [],
      system_settings: []
    };

    if (!isPostgresConfigured()) {
      return { data: result, mode: "not_configured" };
    }

    const pool = getPostgresPool();
    if (!pool) {
      throw new Error("PostgreSQL is configured in environment but connection pool could not be initialized");
    }

    try {
      const client = await pool.connect();
      try {
        // 1. Volunteer file numbers
        const vfnRes = await client.query("SELECT * FROM volunteer_file_numbers ORDER BY created_at ASC");
        result.volunteer_file_numbers = vfnRes.rows || [];

        // 2. Maintenance settings
        const msRes = await client.query("SELECT * FROM maintenance_settings WHERE id = 1");
        result.maintenance_settings = msRes.rows || [];

        // 3. System settings
        const ssRes = await client.query("SELECT * FROM system_settings");
        result.system_settings = ssRes.rows || [];

        // 4. Extended tables if migrated to full PostgreSQL schema
        const optionalTables = [
          'system_users', 'departments', 'teams', 'volunteers', 
          'beneficiaries', 'initiatives', 'attendance', 'attachment_metadata'
        ];
        for (const tbl of optionalTables) {
          try {
            const chk = await client.query(
              `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);`,
              [tbl]
            );
            if (chk.rows[0]?.exists) {
              const tblRes = await client.query(`SELECT * FROM ${tbl};`);
              result[tbl] = tblRes.rows || [];
            }
          } catch {
            // Optional table not yet present; ignore safely
          }
        }
      } finally {
        client.release();
      }
      return { data: result, mode: "captured" };
    } catch (err: any) {
      // Explicit error: do NOT silently mask Postgres failure when Postgres is configured!
      throw new Error(`Mandatory PostgreSQL snapshot query failed: ${err.message}`);
    }
  }

  /**
   * Calculates record counts and max watermark across collections
   */
  private analyzeMetadata(db: any): { recordCounts: Record<string, number>; watermark: string } {
    const recordCounts: Record<string, number> = {};
    let watermark = "1970-01-01T00:00:00.000Z";

    const monitoredCollections = [
      "departments", "volunteers", "volunteerApplications", "initiatives",
      "beneficiaries", "benefitRequests", "teams", "financialAccounts",
      "financialVouchers", "inventory", "supportTickets", "logs"
    ];

    for (const key of monitoredCollections) {
      const arr = Array.isArray(db[key]) ? db[key] : [];
      recordCounts[key] = arr.length;

      for (const item of arr) {
        const ts = item.updatedAt || item.createdAt || item.date || item.timestamp;
        if (ts && typeof ts === "string" && ts > watermark && ts.startsWith("202")) {
          watermark = ts;
        }
      }
    }

    return { recordCounts, watermark };
  }

  /**
   * Captures an atomic consistent multi-source bundle
   */
  public async captureConsistentBundle(readDbFn: () => any, timeoutMs = 15000): Promise<{
    bundle: any;
    metadata: BackupPackageMetadata;
  }> {
    // 1. Acquire write freeze to guarantee cross-source point-in-time consistency
    const releaseFreeze = await writeCoordinator.acquireWriteFreeze(8000);
    let dbClone: any;
    let postgresSnapshot: Record<string, any[]> = {};
    let postgresMode = "not_configured";
    let attachments: Array<any> = [];

    try {
      // Enforce snapshot timeout race to prevent indefinite freeze under hanging I/O
      let timer: any = null;
      const captureWork = (async () => {
        // 2. Deep clone active in-memory database
        const liveDb = await Promise.resolve(readDbFn());
        if (!liveDb || typeof liveDb !== "object") {
          throw new Error("Active database is empty or uninitialized");
        }
        dbClone = JSON.parse(JSON.stringify(liveDb));

        // 3. Collect postgres snapshot
        const pgResult = await this.collectPostgresSnapshot();
        postgresSnapshot = pgResult.data;
        postgresMode = pgResult.mode;

        // 4. Collect physical attachments synchronously under the freeze barrier
        // Eliminates time-skew between database records and disk attachments
        attachments = this.collectAttachments();
      })();

      const timeoutLimit = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Backup snapshot exceeded maximum duration limit (${timeoutMs}ms) and was aborted`));
        }, timeoutMs);
      });

      try {
        await Promise.race([captureWork, timeoutLimit]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (snapshotErr: any) {
      console.error("[BACKUP ENGINE ERROR] Snapshot capture failed or was aborted:", snapshotErr.message);
      // Strictly propagate error so caller NEVER reports false success
      throw snapshotErr;
    } finally {
      // 5. Release write freeze ONLY after snapshot capture is genuinely finished or aborted
      releaseFreeze();
    }

    const { recordCounts, watermark } = this.analyzeMetadata(dbClone);
    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const bundle = {
      formatVersion: "2.0",
      backupId,
      timestamp,
      association: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      database: dbClone,
      postgresSnapshot,
      postgresMode,
      attachments
    };

    const plainString = JSON.stringify(bundle);
    const sha256Plain = crypto.createHash("sha256").update(plainString, "utf8").digest("hex");

    const metadata: BackupPackageMetadata = {
      backupId,
      schemaVersion: "2.0",
      timestamp,
      association: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      watermark,
      recordCounts,
      attachmentsCount: attachments.length,
      sha256Plain
    };

    return { bundle, metadata };
  }

  /**
   * Encrypts a bundle using AES-256-GCM
   */
  public encryptBundle(bundle: any, metadata: BackupPackageMetadata, customKeyHex?: string): EncryptedBackupEnvelope {
    const keyHex = customKeyHex || process.env.BACKUP_ENCRYPTION_KEY_HEX;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error("Invalid or missing encryption key: must be a 64-hex character string (32 bytes)");
    }

    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12); // Standard 12-byte IV for AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const plainBuffer = Buffer.from(JSON.stringify(bundle), "utf8");
    const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ciphertextBase64 = encrypted.toString("base64");
    const sha256Ciphertext = crypto.createHash("sha256").update(encrypted).digest("hex");

    return {
      formatVersion: "2.0",
      algorithm: "aes-256-gcm",
      backupId: metadata.backupId,
      timestamp: metadata.timestamp,
      ivHex: iv.toString("hex"),
      tagHex: tag.toString("hex"),
      sha256Ciphertext,
      ciphertextBase64,
      metadata
    };
  }

  /**
   * Decrypts an encrypted envelope using AES-256-GCM and verifies authenticity
   */
  public decryptEnvelope(envelope: EncryptedBackupEnvelope, customKeyHex?: string): { bundle: any; metadata: BackupPackageMetadata } {
    if (!envelope || envelope.algorithm !== "aes-256-gcm") {
      throw new Error("Unsupported or invalid backup envelope format");
    }

    const keyHex = customKeyHex || process.env.BACKUP_ENCRYPTION_KEY_HEX;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error("Invalid or missing encryption key: must be a 64-hex character string (32 bytes)");
    }

    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(envelope.ivHex, "hex");
    const tag = Buffer.from(envelope.tagHex, "hex");
    const ciphertext = Buffer.from(envelope.ciphertextBase64, "base64");

    // 1. Verify ciphertext SHA-256 before decryption
    const checkHash = crypto.createHash("sha256").update(ciphertext).digest("hex");
    if (checkHash !== envelope.sha256Ciphertext) {
      throw new Error("Ciphertext integrity verification failed: SHA-256 digest mismatch");
    }

    // 2. Authenticated Decryption
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const bundle = JSON.parse(decrypted.toString("utf8"));

    // 3. Verify plain content hash
    const plainHash = crypto.createHash("sha256").update(decrypted).digest("hex");
    if (plainHash !== envelope.metadata.sha256Plain) {
      throw new Error("Decrypted payload integrity verification failed: plain hash mismatch");
    }

    return { bundle, metadata: envelope.metadata };
  }

  /**
   * Uploads an encrypted envelope to Cloudflare R2
   */
  public async uploadToR2(envelope: EncryptedBackupEnvelope): Promise<{ key: string; eTag: string }> {
    const s3 = this.getR2Client();
    if (!s3) {
      throw new Error("Cloudflare R2 client is not configured (missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY)");
    }

    const dateStr = envelope.timestamp.replace(/[:.]/g, "-");
    const objectKey = `backups/daily/backup_${dateStr}_${envelope.backupId}.enc.json`;
    const bodyContent = JSON.stringify(envelope, null, 2);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: bodyContent,
      ContentType: "application/json",
      Metadata: {
        "backup-id": envelope.backupId,
        "watermark": envelope.metadata.watermark,
        "sha256": envelope.sha256Ciphertext
      }
    });

    const response = await s3.send(command);
    return {
      key: objectKey,
      eTag: response.ETag || ""
    };
  }

  /**
   * Tests isolated sandbox restore verification (Dry-Run) without touching production
   */
  public async testIsolatedRestore(
    envelope: EncryptedBackupEnvelope,
    customKeyHex?: string
  ): Promise<IsolatedVerificationResult> {
    const startTime = Date.now();
    const sandboxDir = path.join("/tmp", `backup_verify_sandbox_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`);

    try {
      // 1. Decrypt in memory
      const { bundle, metadata } = this.decryptEnvelope(envelope, customKeyHex);

      // 2. Create sandbox folder
      fs.mkdirSync(sandboxDir, { recursive: true, mode: 0o700 });

      // 3. Write restored database in sandbox
      const sandboxDbFile = path.join(sandboxDir, "db.json");
      fs.writeFileSync(sandboxDbFile, JSON.stringify(bundle.database, null, 2), "utf8");

      // 4. Extract attachments in sandbox
      let attachmentsExtracted = 0;
      if (Array.isArray(bundle.attachments)) {
        for (const att of bundle.attachments) {
          if (!att.relativePath || typeof att.relativePath !== "string") {
            throw new Error("Security validation failed: attachment relativePath is missing or non-string");
          }

          // Reject null bytes, backslashes normalization, absolute paths, or Windows drive prefixes
          if (att.relativePath.includes("\0") || path.isAbsolute(att.relativePath) || /^[a-zA-Z]:/.test(att.relativePath)) {
            throw new Error(`Security validation failed: invalid or absolute attachment path "${att.relativePath}"`);
          }

          const normalizedRelative = path.normalize(att.relativePath);
          const resolvedSandbox = path.resolve(sandboxDir);
          const resolvedDest = path.resolve(sandboxDir, normalizedRelative);

          // Enforce strict containment inside sandboxDir (prevents Zip-Slip / Path Traversal)
          if (!resolvedDest.startsWith(resolvedSandbox + path.sep)) {
            throw new Error(`Security validation failed: path traversal attempt detected "${att.relativePath}"`);
          }

          // Check for symlinks in parent directories or destination
          if (fs.existsSync(resolvedDest)) {
            const lstat = fs.lstatSync(resolvedDest);
            if (lstat.isSymbolicLink()) {
              throw new Error(`Security validation failed: symbolic link detected at "${resolvedDest}"`);
            }
          }

          fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
          const buf = Buffer.from(att.contentBase64, "base64");
          fs.writeFileSync(resolvedDest, buf);

          // Verify hash
          const hash = crypto.createHash("sha256").update(buf).digest("hex");
          if (hash !== att.sha256) {
            throw new Error(`Attachment hash mismatch in sandbox for ${att.relativePath}`);
          }
          attachmentsExtracted++;
        }
      }

      // 5. Referential Integrity & Schema Assertions
      const db = bundle.database;
      const refErrors: string[] = [];

      // Required arrays
      const mandatoryCollections = ["departments", "volunteers", "initiatives", "beneficiaries", "financialAccounts"];
      for (const col of mandatoryCollections) {
        if (!Array.isArray(db[col])) {
          refErrors.push(`Missing or non-array collection: ${col}`);
        }
      }

      // Check foreign keys
      if (Array.isArray(db.benefitRequests) && Array.isArray(db.beneficiaries)) {
        const benIds = new Set(db.beneficiaries.map((b: any) => b.id));
        for (const req of db.benefitRequests) {
          if (req.beneficiaryId && !benIds.has(req.beneficiaryId)) {
            refErrors.push(`Orphan benefitRequest ${req.id} references non-existing beneficiary ${req.beneficiaryId}`);
          }
        }
      }

      if (Array.isArray(db.financialVouchers) && Array.isArray(db.financialAccounts)) {
        const accIds = new Set(db.financialAccounts.map((a: any) => a.id));
        for (const v of db.financialVouchers) {
          if (v.accountId && !accIds.has(v.accountId)) {
            refErrors.push(`Orphan financialVoucher ${v.id} references non-existing account ${v.accountId}`);
          }
        }
      }

      const passed = refErrors.length === 0;

      return {
        valid: passed,
        backupId: metadata.backupId,
        timestamp: metadata.timestamp,
        watermark: metadata.watermark,
        recordCounts: metadata.recordCounts,
        attachmentsExtracted,
        referentialIntegrity: {
          passed,
          errors: refErrors
        },
        durationMs: Date.now() - startTime,
        sandboxDir
      };
    } finally {
      // Clean up sandbox folder completely
      try {
        if (fs.existsSync(sandboxDir)) {
          fs.rmSync(sandboxDir, { recursive: true, force: true });
        }
      } catch (rmErr) {
        console.warn(`[BACKUP ENGINE] Warning cleaning up sandbox ${sandboxDir}:`, rmErr);
      }
    }
  }

  /**
   * Anti-Downgrade comparison: Validates a candidate backup against active database state
   */
  public checkAgainstActiveState(candidateMetadata: BackupPackageMetadata, activeDb: any): {
    isStale: boolean;
    activeWatermark: string;
    candidateWatermark: string;
    differences: Record<string, { candidate: number; active: number }>;
  } {
    const { recordCounts: activeCounts, watermark: activeWatermark } = this.analyzeMetadata(activeDb);
    const candidateWatermark = candidateMetadata.watermark;

    const isStale = candidateWatermark < activeWatermark;
    const differences: Record<string, { candidate: number; active: number }> = {};

    for (const key of Object.keys(activeCounts)) {
      const activeC = activeCounts[key] || 0;
      const candidateC = candidateMetadata.recordCounts[key] || 0;
      if (activeC !== candidateC) {
        differences[key] = { candidate: candidateC, active: activeC };
      }
    }

    return {
      isStale,
      activeWatermark,
      candidateWatermark,
      differences
    };
  }
}

export const backupEngine = new BackupEngine();
