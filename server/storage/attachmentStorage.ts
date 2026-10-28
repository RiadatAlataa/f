/**
 * Permanent Attachments Storage Service (Cloudflare R2 / S3-Compatible & Local Sandbox)
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Features:
 * 1. Cloudflare R2 integration via @aws-sdk/client-s3 with zero-silent-fallback protection.
 * 2. Strict anti-silent fallback: Blocks writing to ephemeral disk when R2 is required or configured.
 * 3. Cryptographic unique key generation avoiding user-supplied file names.
 * 4. MIME type whitelisting and strict payload size limits (Images, Logos, Cards, PDF, Docs).
 * 5. Path-traversal attack prevention (anti-ZipSlip, null byte, directory escape).
 * 6. Private attachment access authorization with streaming proxy (volunteers, beneficiaries, financial).
 * 7. Custom domain / Public CDN support for public assets (logos, announcements, public templates).
 * 8. Audit scanner for orphaned files and missing database attachments without premature deletion.
 * 9. Non-destructive connection health check and diagnostics.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  HeadBucketCommand
} from "@aws-sdk/client-s3";

export type EntityType = 
  | 'volunteers' 
  | 'beneficiaries' 
  | 'licenses' 
  | 'cards' 
  | 'logos' 
  | 'slider' 
  | 'initiatives' 
  | 'partners' 
  | 'deliveries' 
  | 'financial' 
  | 'letters' 
  | 'news' 
  | 'general';

export interface AttachmentUploadOptions {
  originalFilename: string;
  mimeType: string;
  entityType: EntityType;
  entityId: string;
  fieldName?: string;
  isPrivate?: boolean;
  accessRole?: string;
  uploadedBy?: string;
}

export interface AttachmentRecord {
  id: string;
  fileKey: string;
  originalName: string;
  sanitizedName: string;
  mimeType: string;
  fileSize: number;
  storageProvider: 'r2' | 'local';
  entityType: string;
  entityId: string;
  fieldName?: string;
  isPrivate: boolean;
  accessRole: string;
  checksumSha256: string;
  uploadedBy?: string;
  uploadedAt: string;
  url: string;
  status: 'active' | 'archived' | 'orphan';
}

export interface AttachmentAuditReport {
  timestamp: string;
  totalFilesInStorage: number;
  totalRecordsInDb: number;
  matchedFilesCount: number;
  orphanFiles: Array<{ key: string; size: number; modifiedAt: string }>;
  missingAttachments: Array<{ recordId: string; fileKey: string; entityType: string; entityId: string }>;
}

export interface StorageStatusReport {
  provider: 'r2' | 'local';
  isR2Configured: boolean;
  strictR2Mode: boolean;
  bucketName: string;
  accountIdMasked?: string;
  customDomainConfigured: boolean;
  customDomain?: string;
  localBaseDir: string;
  allowedMimesCount: number;
  maxSizeBytes: number;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Megabytes

export class AttachmentStorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private customDomain: string | null = null;
  private localBaseDir: string;
  private strictR2Mode: boolean = false;
  private attachmentRegistry: Map<string, AttachmentRecord> = new Map();

  constructor(customLocalDir?: string) {
    this.bucketName = process.env.R2_BUCKET_NAME || "riadataleata-attachments";
    this.customDomain = process.env.R2_CUSTOM_DOMAIN || process.env.R2_PUBLIC_URL || null;
    this.localBaseDir = customLocalDir || path.join(process.cwd(), "public", "uploads");

    // Strict Mode: When REQUIRE_R2_STORAGE is true or STORAGE_PROVIDER is r2,
    // prevent silent fallback to ephemeral local disk to protect files from loss.
    const envRequireR2 = process.env.REQUIRE_R2_STORAGE === "true" || 
                         process.env.STORAGE_PROVIDER === "r2" ||
                         (process.env.NODE_ENV === "production" && Boolean(process.env.R2_BUCKET_NAME));
    this.strictR2Mode = Boolean(envRequireR2);

    this.initR2Client();
    this.ensureLocalDirectories();
  }

  public initR2Client(configOverride?: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
    customDomain?: string;
  }): void {
    const accountId = configOverride?.accountId || process.env.R2_ACCOUNT_ID;
    const accessKeyId = configOverride?.accessKeyId || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = configOverride?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
    if (configOverride?.bucketName) {
      this.bucketName = configOverride.bucketName;
    }
    if (configOverride?.customDomain) {
      this.customDomain = configOverride.customDomain;
    }

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });
    } else {
      this.s3Client = null;
    }
  }

  public setStrictR2Mode(strict: boolean): void {
    this.strictR2Mode = strict;
  }

  public getStrictR2Mode(): boolean {
    return this.strictR2Mode;
  }

  private ensureLocalDirectories(): void {
    const subdirs = [
      'volunteers', 'beneficiaries', 'licenses', 'cards', 
      'logos', 'slider', 'initiatives', 'partners', 
      'deliveries', 'financial', 'letters', 'news', 'general'
    ];
    for (const sub of subdirs) {
      const full = path.join(this.localBaseDir, sub);
      if (!fs.existsSync(full)) {
        try {
          fs.mkdirSync(full, { recursive: true });
        } catch {
          // May be read-only in some execution runtimes
        }
      }
    }
  }

  public isR2Configured(): boolean {
    return this.s3Client !== null;
  }

  public getStatus(): StorageStatusReport {
    const accountId = process.env.R2_ACCOUNT_ID || "";
    const maskedAccount = accountId.length > 8 
      ? `${accountId.substring(0, 4)}...${accountId.substring(accountId.length - 4)}` 
      : (accountId ? "****" : undefined);

    return {
      provider: this.s3Client ? 'r2' : 'local',
      isR2Configured: this.s3Client !== null,
      strictR2Mode: this.strictR2Mode,
      bucketName: this.bucketName,
      accountIdMasked: maskedAccount,
      customDomainConfigured: Boolean(this.customDomain),
      customDomain: this.customDomain || undefined,
      localBaseDir: this.localBaseDir,
      allowedMimesCount: ALLOWED_MIME_TYPES.size,
      maxSizeBytes: MAX_FILE_SIZE_BYTES
    };
  }

  /**
   * Performs an isolated, non-destructive connection probe against Cloudflare R2
   */
  public async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    if (!this.s3Client) {
      return {
        success: false,
        message: "عميل Cloudflare R2 غير مهيأ (متغيرات R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ناقصة)."
      };
    }

    const start = Date.now();
    try {
      // ListObjects with max 1 key to verify authenticated connection safely without altering data
      await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1
      }));
      const latency = Date.now() - start;
      return {
        success: true,
        message: `تم التحقق بنجاح من اتصال Cloudflare R2 بالحاوية [${this.bucketName}] (${latency}ms).`,
        latencyMs: latency
      };
    } catch (err: any) {
      return {
        success: false,
        message: `فشل فحص اتصال Cloudflare R2: ${err.message || 'خطأ غير معروف'}`
      };
    }
  }

  /**
   * Sanitizes filename and prevents directory traversal
   */
  public sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
      return `file_${Date.now()}`;
    }
    return cleaned;
  }

  /**
   * Generates secure randomized file key
   */
  public generateSecureKey(entityType: string, filename: string): string {
    const safeBase = this.sanitizeFilename(filename);
    const ext = path.extname(safeBase).toLowerCase() || '.bin';
    const datePrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
    const randomUuid = crypto.randomUUID();
    return `${entityType}/${datePrefix}/${randomUuid}${ext}`;
  }

  /**
   * Uploads an attachment either to Cloudflare R2 or local storage
   * Enforces zero silent fallback when strict mode is active.
   */
  public async uploadAttachment(
    fileBuffer: Buffer,
    options: AttachmentUploadOptions
  ): Promise<AttachmentRecord> {
    // 1. Validate payload size
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("ملف فارغ أو غير موجود.");
    }
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`حجم الملف يتجاوز الحد الأقصى المسموح به (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`);
    }

    // 2. Validate MIME type
    const mimeLower = (options.mimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mimeLower)) {
      throw new Error(`نوع الملف غير مدعوم (${options.mimeType}). الأنواع المسموحة تشمل الصور (JPG, PNG, WebP, SVG, GIF) والمستندات الرسمية (PDF, Word, Excel).`);
    }

    // 3. Compute SHA-256 Checksum for integrity validation
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // 4. Generate secure collision-resistant file key
    const fileKey = this.generateSecureKey(options.entityType, options.originalFilename);

    // 5. Strict Mode Guard: Prevent silent fallback to ephemeral disk
    if (this.strictR2Mode && !this.s3Client) {
      throw new Error(
        "خطأ أمان التخزين: تم تفعيل وضع التخزين الدائم الإلزامي (Strict R2 Mode)، ولكن بيانات اتصال Cloudflare R2 " +
        "(R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) غير مكتملة. " +
        "تم رفض الرجوع التلقائي للتخزين المحلي المؤقت منعاً لفقدان الملفات عند إعادة تشغيل الخادم."
      );
    }

    // 6. Upload to target destination
    let provider: 'r2' | 'local' = 'local';
    let publicUrl = '';

    if (this.s3Client) {
      try {
        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: mimeLower,
          Metadata: {
            "entity-type": options.entityType,
            "entity-id": options.entityId,
            "checksum-sha256": checksum,
            "original-name": encodeURIComponent(options.originalFilename)
          }
        }));
        provider = 'r2';

        // URL Strategy:
        // - Private files (volunteers, beneficiaries, financial) MUST ALWAYS route via authenticated API proxy
        // - Public files (logos, templates, news) use custom domain CDN if configured, or stream via download endpoint
        const isFilePrivate = this.isPrivateKey(fileKey, { isPrivate: options.isPrivate } as any);
        if (isFilePrivate) {
          publicUrl = `/api/attachments/download/${encodeURIComponent(fileKey)}`;
        } else if (this.customDomain) {
          const cleanDomain = this.customDomain.replace(/\/+$/, '');
          publicUrl = `${cleanDomain}/${fileKey}`;
        } else {
          // Without custom domain, serve via API endpoint to avoid S3 SigV4 403 error on browser direct access
          publicUrl = `/api/attachments/download/${encodeURIComponent(fileKey)}`;
        }
      } catch (err: any) {
        // NEVER fall back to local disk if R2 was attempted and failed!
        throw new Error(`فشل رفع المرفق إلى Cloudflare R2: ${err.message}`);
      }
    } else {
      // Local Sandboxed File System Fallback (Only allowed in local development without strict mode)
      const destPath = path.join(this.localBaseDir, fileKey);
      const destDir = path.dirname(destPath);
      
      // Strict Path Traversal Verification
      const resolved = path.resolve(destPath);
      if (!resolved.startsWith(path.resolve(this.localBaseDir))) {
        throw new Error("محاولة اجتياز مسار غير مشروعة (Path Traversal Detected).");
      }

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.writeFileSync(destPath, fileBuffer);
      provider = 'local';

      const isFilePrivate = this.isPrivateKey(fileKey, { isPrivate: options.isPrivate } as any);
      publicUrl = isFilePrivate
        ? `/api/attachments/download/${encodeURIComponent(fileKey)}`
        : `/uploads/${fileKey}`;
    }

    // 7. Register Metadata in Memory Index
    const isFilePrivate = this.isPrivateKey(fileKey, { isPrivate: options.isPrivate } as any);
    const record: AttachmentRecord = {
      id: "att-" + crypto.randomUUID(),
      fileKey,
      originalName: options.originalFilename,
      sanitizedName: path.basename(fileKey),
      mimeType: mimeLower,
      fileSize: fileBuffer.length,
      storageProvider: provider,
      entityType: options.entityType,
      entityId: options.entityId,
      fieldName: options.fieldName,
      isPrivate: isFilePrivate,
      accessRole: options.accessRole || (isFilePrivate ? 'admin' : 'public'),
      checksumSha256: checksum,
      uploadedBy: options.uploadedBy,
      uploadedAt: new Date().toISOString(),
      url: publicUrl,
      status: 'active'
    };

    this.attachmentRegistry.set(fileKey, record);
    return record;
  }

  /**
   * Evaluates whether a fileKey represents a private attachment
   * Implements strict default-deny classification:
   * Only explicit public folders (logos, cards, slider, public, license) are public.
   * All beneficiary, volunteer, financial, delivery, identity, letter, and report files are PRIVATE.
   */
  public isPrivateKey(fileKey: string, record?: AttachmentRecord): boolean {
    if (record && typeof record.isPrivate === 'boolean') {
      return record.isPrivate;
    }
    const clean = fileKey.replace(/^[\\/]+/, '').toLowerCase();
    const top = clean.split(/[\\/]/)[0];

    // Explicit Public Whitelist
    const publicCategories = new Set([
      'license',
      'licenses',
      'card_templates',
      'cards',
      'logos',
      'slider',
      'initiatives',
      'partners',
      'news',
      'public',
      'branding'
    ]);

    if (publicCategories.has(top) || clean.startsWith('license_official')) {
      return false;
    }

    // Explicit Private Categories
    const privateCategories = new Set([
      'volunteers',
      'beneficiaries',
      'financial',
      'deliveries',
      'letters',
      'reports',
      'identities',
      'confidential'
    ]);

    if (privateCategories.has(top)) {
      return true;
    }

    // Default-deny: Any unrecognized category is treated as PRIVATE
    return true;
  }

  /**
   * Retrieves an attachment with authorization check
   */
  public async getAttachmentBuffer(
    fileKey: string,
    userContext?: { role?: string; id?: string }
  ): Promise<{ buffer: Buffer; record?: AttachmentRecord; mimeType: string }> {
    // Prevent traversal
    if (!fileKey || typeof fileKey !== 'string' || fileKey.includes('..') || path.isAbsolute(fileKey) || fileKey.includes('\0') || fileKey.includes('\\')) {
      throw new Error("مسار ملف غير صالح أو محاولة اجتياز مسار.");
    }

    const record = this.attachmentRegistry.get(fileKey);
    const isPrivate = this.isPrivateKey(fileKey, record);

    if (isPrivate) {
      const role = userContext?.role || 'guest';
      const isAuthorized = role === 'admin' || role === 'operations_manager' || 
        (record && record.uploadedBy && record.uploadedBy === userContext?.id) ||
        (record && record.entityId && record.entityId === userContext?.id) ||
        (Boolean(userContext?.id) && userContext?.id !== 'guest' && userContext?.id !== 'public' && fileKey.includes(String(userContext?.id)));
      if (!isAuthorized) {
        throw new Error("غير مصرح لك بالوصول إلى هذا المرفق الخاص.");
      }
    }

    if (this.s3Client) {
      try {
        const response = await this.s3Client.send(new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey
        }));
        const byteArray = await response.Body?.transformToByteArray();
        if (!byteArray) throw new Error("تعذر استرجاع محتوى الملف من Cloudflare R2.");
        return {
          buffer: Buffer.from(byteArray),
          record,
          mimeType: response.ContentType || record?.mimeType || 'application/octet-stream'
        };
      } catch (err: any) {
        throw new Error(`تعذر قراءة الملف من Cloudflare R2: ${err.message}`);
      }
    } else {
      const localPath = path.join(this.localBaseDir, fileKey);
      const resolved = path.resolve(localPath);
      const baseResolved = path.resolve(this.localBaseDir);
      if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
        throw new Error("محاولة اجتياز مسار غير مشروعة (Path Traversal Detected).");
      }
      if (!fs.existsSync(resolved)) {
        throw new Error(`الملف المطلوب غير موجود في التخزين المحلي (${fileKey}).`);
      }
      const buffer = fs.readFileSync(resolved);
      return {
        buffer,
        record,
        mimeType: record?.mimeType || 'application/octet-stream'
      };
    }
  }

  /**
   * Safe deletion from Cloudflare R2 or local storage
   */
  public async deleteAttachment(fileKey: string): Promise<boolean> {
    if (this.s3Client) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey
        }));
      } catch (err: any) {
        console.error(`[R2 Delete Error]: ${err.message}`);
        return false;
      }
    } else {
      const localPath = path.join(this.localBaseDir, fileKey);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch {
          return false;
        }
      }
    }

    this.attachmentRegistry.delete(fileKey);
    return true;
  }

  /**
   * Audits storage for orphaned files and missing attachments
   */
  public async scanOrphanAndMissingAttachments(
    referencedKeysInDb: string[]
  ): Promise<AttachmentAuditReport> {
    const dbSet = new Set(referencedKeysInDb.map(k => k.trim()));
    const physicalKeys: Array<{ key: string; size: number; modifiedAt: string }> = [];

    if (this.s3Client) {
      try {
        const res = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucketName
        }));
        for (const item of res.Contents || []) {
          if (item.Key) {
            physicalKeys.push({
              key: item.Key,
              size: item.Size || 0,
              modifiedAt: item.LastModified?.toISOString() || new Date().toISOString()
            });
          }
        }
      } catch (err: any) {
        console.error("[R2 List Error]:", err.message);
      }
    } else {
      // Local scan
      const scanDirRecursive = (dir: string, base: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDirRecursive(full, base);
          } else if (entry.isFile()) {
            const relKey = path.relative(base, full).replace(/\\/g, '/');
            const stat = fs.statSync(full);
            physicalKeys.push({
              key: relKey,
              size: stat.size,
              modifiedAt: stat.mtime.toISOString()
            });
          }
        }
      };
      scanDirRecursive(this.localBaseDir, this.localBaseDir);
    }

    const physicalKeySet = new Set(physicalKeys.map(p => p.key));

    // 1. Orphan files: Files on storage but not referenced anywhere in database
    const orphanFiles = physicalKeys.filter(p => !dbSet.has(p.key) && !p.key.includes('license_official'));

    // 2. Missing attachments: References in DB that have no corresponding file in storage
    const missingAttachments: Array<{ recordId: string; fileKey: string; entityType: string; entityId: string }> = [];
    for (const key of referencedKeysInDb) {
      if (!physicalKeySet.has(key)) {
        missingAttachments.push({
          recordId: "ref-" + crypto.createHash("md5").update(key).digest("hex").substring(0, 8),
          fileKey: key,
          entityType: key.split('/')[0] || 'unknown',
          entityId: 'unlinked'
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalFilesInStorage: physicalKeys.length,
      totalRecordsInDb: referencedKeysInDb.length,
      matchedFilesCount: physicalKeys.length - orphanFiles.length,
      orphanFiles,
      missingAttachments
    };
  }

  public getRegistry(): Map<string, AttachmentRecord> {
    return this.attachmentRegistry;
  }
}

export const attachmentStorage = new AttachmentStorageService();
