/**
 * Permanent Attachments & Object Storage Service (AWS S3-Compatible / Cloudflare R2 / Local Sandbox)
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Features:
 * 1. Universal S3-compatible integration supporting AWS S3 (including Riyadh region me-central-1) and Cloudflare R2.
 * 2. Strict anti-silent fallback: Blocks writing to ephemeral disk when cloud storage is required or configured.
 * 3. PostgreSQL metadata layer integration: Persists file records into the `system_files` table with SHA-256 and RBAC tags.
 * 4. Cryptographic unique key generation avoiding user-supplied file names and preventing collisions.
 * 5. MIME type whitelisting and strict payload size limits (Images, Logos, Cards, PDF, Docs, Inventory).
 * 6. Path-traversal attack prevention (anti-ZipSlip, null byte, directory escape).
 * 7. Default-deny private attachment authorization with streaming proxy (volunteers, beneficiaries, financial).
 * 8. Custom domain / Public CDN support for public assets (logos, announcements, public templates).
 * 9. Audit scanner for orphaned files and missing database attachments without premature deletion.
 * 10. Non-destructive connection health check and diagnostics.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import {
  insertSystemFile,
  getSystemFileByKey,
  deleteSystemFile,
  isPostgresConfigured,
  SystemFileRecord
} from "../postgres";

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
  | 'inventory'
  | 'certificates'
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
  storageProvider: 's3' | 'r2' | 'local';
  bucketName: string;
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
  provider: 's3' | 'r2' | 'local';
  isConfigured: boolean;
  isR2Configured: boolean;
  strictStorageMode: boolean;
  strictR2Mode: boolean;
  bucketName: string;
  region: string;
  endpoint?: string;
  endpointConfigured: boolean;
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
  private region: string;
  private endpoint: string | undefined;
  private customDomain: string | null = null;
  private localBaseDir: string;
  private strictStorageMode: boolean = false;
  private storageProviderType: 's3' | 'r2' | 'local' = 'local';
  private attachmentRegistry: Map<string, AttachmentRecord> = new Map();

  constructor(customLocalDir?: string) {
    this.localBaseDir = customLocalDir || path.join(process.cwd(), "public", "uploads");

    // Discover S3 & R2 Configuration from Environment
    this.bucketName = 
      process.env.STORAGE_BUCKET_NAME || 
      process.env.S3_BUCKET_NAME || 
      process.env.AWS_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      process.env.R2_BUCKET_NAME || 
      "riadataleata-attachments";

    // Detect Cloudflare R2 presence from environment
    const hasR2Account = Boolean(process.env.R2_ACCOUNT_ID);
    const hasR2Endpoint = 
      (process.env.STORAGE_ENDPOINT || '').includes('r2.cloudflarestorage.com') ||
      (process.env.S3_ENDPOINT || '').includes('r2.cloudflarestorage.com') ||
      (process.env.AWS_ENDPOINT || '').includes('r2.cloudflarestorage.com') ||
      (process.env.AWS_ENDPOINT_URL || '').includes('r2.cloudflarestorage.com') ||
      (process.env.R2_ENDPOINT || '').includes('r2.cloudflarestorage.com');
    const isR2Environment = hasR2Account || hasR2Endpoint || process.env.STORAGE_PROVIDER === 'r2';

    // R2 requires region: 'auto' for AWS SDK SigV4 signing; AWS S3 defaults to me-central-1 (Riyadh) for Saudi compliance
    this.region = 
      process.env.STORAGE_REGION || 
      process.env.S3_REGION || 
      (isR2Environment ? "auto" : (process.env.AWS_REGION || "me-central-1"));

    this.customDomain = 
      process.env.STORAGE_PUBLIC_URL || 
      process.env.S3_PUBLIC_URL || 
      process.env.R2_CUSTOM_DOMAIN || 
      process.env.R2_PUBLIC_URL || 
      null;

    // Strict Mode: When true, prevents silent fallback to ephemeral disk on Render
    const envStrict = 
      process.env.REQUIRE_STORAGE === "true" ||
      process.env.REQUIRE_S3_STORAGE === "true" ||
      process.env.REQUIRE_R2_STORAGE === "true" ||
      process.env.REQUIRE_PERMANENT_STORAGE === "true" ||
      process.env.STRICT_STORAGE_MODE === "true" ||
      process.env.STORAGE_PROVIDER === "s3" ||
      process.env.STORAGE_PROVIDER === "r2" ||
      (process.env.NODE_ENV === "production" && (
        Boolean(process.env.S3_BUCKET_NAME) || 
        Boolean(process.env.AWS_BUCKET_NAME) || 
        Boolean(process.env.R2_BUCKET_NAME) || 
        Boolean(process.env.STORAGE_BUCKET_NAME)
      ));

    this.strictStorageMode = Boolean(envStrict);

    this.initStorageClient();
    this.ensureLocalDirectories();
  }

  /**
   * Initializes AWS S3 / Cloudflare R2 / S3-compatible client
   */
  public initStorageClient(configOverride?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
    region?: string;
    endpoint?: string;
    customDomain?: string;
    accountId?: string;
    forcePathStyle?: boolean;
  }): void {
    const accessKeyId = 
      configOverride?.accessKeyId || 
      process.env.STORAGE_ACCESS_KEY_ID || 
      process.env.S3_ACCESS_KEY_ID || 
      process.env.AWS_ACCESS_KEY_ID || 
      process.env.R2_ACCESS_KEY_ID;

    const secretAccessKey = 
      configOverride?.secretAccessKey || 
      process.env.STORAGE_SECRET_ACCESS_KEY || 
      process.env.S3_SECRET_ACCESS_KEY || 
      process.env.AWS_SECRET_ACCESS_KEY || 
      process.env.R2_SECRET_ACCESS_KEY;

    if (configOverride?.bucketName) this.bucketName = configOverride.bucketName;
    if (configOverride?.customDomain) this.customDomain = configOverride.customDomain;

    const accountId = configOverride?.accountId || process.env.R2_ACCOUNT_ID;

    // Resolve Endpoint:
    let resolvedEndpoint = 
      configOverride?.endpoint || 
      process.env.STORAGE_ENDPOINT || 
      process.env.S3_ENDPOINT || 
      process.env.AWS_ENDPOINT_URL ||
      process.env.AWS_ENDPOINT ||
      process.env.R2_ENDPOINT;

    if (!resolvedEndpoint && accountId) {
      resolvedEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    }

    // Determine Provider Type and Enforce Cloudflare R2 Region Rule (region: 'auto')
    const isR2 = Boolean(
      (resolvedEndpoint && resolvedEndpoint.includes('r2.cloudflarestorage.com')) || 
      accountId || 
      process.env.STORAGE_PROVIDER === 'r2'
    );

    if (isR2) {
      this.storageProviderType = 'r2';
      // Cloudflare R2 strictly requires 'auto' signing region with AWS SDK S3Client
      this.region = configOverride?.region || "auto";
    } else {
      this.storageProviderType = 's3';
      if (!resolvedEndpoint && accessKeyId) {
        resolvedEndpoint = `https://s3.${this.region}.amazonaws.com`;
      }
      if (configOverride?.region) {
        this.region = configOverride.region;
      }
    }

    this.endpoint = resolvedEndpoint;

    const forcePathStyle = 
      configOverride?.forcePathStyle !== undefined
        ? configOverride.forcePathStyle
        : (process.env.STORAGE_FORCE_PATH_STYLE === "true" || process.env.S3_FORCE_PATH_STYLE === "true" || process.env.AWS_FORCE_PATH_STYLE === "true");

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });
    } else {
      this.s3Client = null;
      this.storageProviderType = 'local';
    }
  }

  // Alias for backward compatibility
  public initR2Client(configOverride?: any): void {
    this.initStorageClient(configOverride);
  }

  public setStrictStorageMode(strict: boolean): void {
    this.strictStorageMode = strict;
  }

  public setStrictR2Mode(strict: boolean): void {
    this.strictStorageMode = strict;
  }

  public getStrictStorageMode(): boolean {
    return this.strictStorageMode;
  }

  public getStrictR2Mode(): boolean {
    return this.strictStorageMode;
  }

  private ensureLocalDirectories(): void {
    const subdirs = [
      'volunteers', 'beneficiaries', 'licenses', 'cards', 
      'logos', 'slider', 'initiatives', 'partners', 
      'deliveries', 'financial', 'letters', 'news', 'inventory', 'certificates', 'general'
    ];
    for (const sub of subdirs) {
      const full = path.join(this.localBaseDir, sub);
      if (!fs.existsSync(full)) {
        try {
          fs.mkdirSync(full, { recursive: true });
        } catch {
          // In some serverless/read-only runtimes
        }
      }
    }
  }

  public isStorageConfigured(): boolean {
    return this.s3Client !== null;
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
      provider: this.s3Client ? this.storageProviderType : 'local',
      storageProvider: this.s3Client ? this.storageProviderType : 'local',
      isConfigured: this.s3Client !== null,
      isR2Configured: this.s3Client !== null,
      strictStorageMode: this.strictStorageMode,
      strictR2Mode: this.strictStorageMode,
      bucketName: this.bucketName,
      region: this.region,
      endpoint: this.endpoint,
      endpointConfigured: Boolean(this.endpoint),
      accountIdMasked: maskedAccount,
      customDomainConfigured: Boolean(this.customDomain),
      customDomain: this.customDomain || undefined,
      localBaseDir: this.localBaseDir,
      allowedMimesCount: ALLOWED_MIME_TYPES.size,
      maxSizeBytes: MAX_FILE_SIZE_BYTES
    };
  }

  /**
   * Performs an isolated, non-destructive connection probe against AWS S3 / Cloudflare R2
   */
  public async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number; region?: string }> {
    if (!this.s3Client) {
      return {
        success: false,
        message: "عميل التخزين السحابي غير مهيأ (متغيرات S3/R2 Access Key و Secret Key ناقصة)."
      };
    }

    const start = Date.now();
    try {
      await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1
      }));
      const latency = Date.now() - start;
      return {
        success: true,
        message: `تم التحقق بنجاح من اتصال التخزين السحابي بالحاوية [${this.bucketName}] في المنطقة [${this.region}] (${latency}ms).`,
        latencyMs: latency,
        region: this.region
      };
    } catch (err: any) {
      return {
        success: false,
        message: `فشل فحص اتصال التخزين السحابي: ${err.message || 'خطأ غير معروف'}`
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
   * Uploads an attachment either to AWS S3 / Cloudflare R2 or local storage
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
    if (this.strictStorageMode && !this.s3Client) {
      throw new Error(
        "خطأ أمان التخزين: تم تفعيل وضع التخزين الدائم الإلزامي (Strict Storage Mode)، ولكن بيانات اتصال S3/R2 " +
        "(STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET_NAME) غير مكتملة. " +
        "تم رفض الرجوع التلقائي للتخزين المحلي المؤقت منعاً لفقدان الملفات عند إعادة تشغيل الخادم."
      );
    }

    // 6. Upload to target destination
    let provider: 's3' | 'r2' | 'local' = 'local';
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
        provider = this.storageProviderType === 'r2' ? 'r2' : 's3';

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
          publicUrl = `/api/attachments/download/${encodeURIComponent(fileKey)}`;
        }
      } catch (err: any) {
        // NEVER fall back to local disk if S3/R2 was attempted and failed!
        throw new Error(`فشل رفع المرفق إلى التخزين السحابي (${this.bucketName}): ${err.message}`);
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

    // 7. Register Metadata
    const isFilePrivate = this.isPrivateKey(fileKey, { isPrivate: options.isPrivate } as any);
    const fileId = "att-" + crypto.randomUUID();
    const record: AttachmentRecord = {
      id: fileId,
      fileKey,
      originalName: options.originalFilename,
      sanitizedName: path.basename(fileKey),
      mimeType: mimeLower,
      fileSize: fileBuffer.length,
      storageProvider: provider,
      bucketName: this.bucketName,
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

    // 8. Persist into PostgreSQL system_files table if PostgreSQL is configured
    if (isPostgresConfigured()) {
      try {
        await insertSystemFile({
          id: record.id,
          fileKey: record.fileKey,
          originalName: record.originalName,
          sanitizedName: record.sanitizedName,
          mimeType: record.mimeType,
          fileSizeBytes: record.fileSize,
          storageProvider: record.storageProvider,
          bucketName: record.bucketName,
          checksumSha256: record.checksumSha256,
          entityType: record.entityType,
          entityId: record.entityId,
          fieldName: record.fieldName,
          isPrivate: record.isPrivate,
          accessRoles: [record.accessRole || 'admin'],
          uploadedBy: record.uploadedBy || 'system',
          uploadedAt: record.uploadedAt,
          status: 'active'
        });
      } catch (dbErr: any) {
        console.warn(`[SystemFiles DB Warning]: Failed to record file metadata in PostgreSQL: ${dbErr.message}`);
      }
    }

    return record;
  }

  /**
   * Evaluates whether a fileKey represents a private attachment
   * Implements strict default-deny classification:
   * Only explicit public folders (logos, cards, slider, public, license) are public.
   * All beneficiary, volunteer, financial, delivery, identity, letter, and report files are PRIVATE.
   */
  public isPrivateKey(fileKey: string, record?: AttachmentRecord | SystemFileRecord): boolean {
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
      'inventory',
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

    let record = this.attachmentRegistry.get(fileKey);

    // If not in memory registry, check PostgreSQL system_files table
    if (!record && isPostgresConfigured()) {
      try {
        const dbFile = await getSystemFileByKey(fileKey);
        if (dbFile) {
          record = {
            id: dbFile.id,
            fileKey: dbFile.fileKey,
            originalName: dbFile.originalName,
            sanitizedName: dbFile.sanitizedName,
            mimeType: dbFile.mimeType,
            fileSize: dbFile.fileSizeBytes,
            storageProvider: (dbFile.storageProvider === 'r2' ? 'r2' : dbFile.storageProvider === 's3' ? 's3' : 'local'),
            bucketName: dbFile.bucketName,
            entityType: dbFile.entityType,
            entityId: dbFile.entityId,
            fieldName: dbFile.fieldName,
            isPrivate: dbFile.isPrivate,
            accessRole: dbFile.accessRoles[0] || 'admin',
            checksumSha256: dbFile.checksumSha256,
            uploadedBy: dbFile.uploadedBy,
            uploadedAt: dbFile.uploadedAt,
            url: `/api/attachments/download/${encodeURIComponent(dbFile.fileKey)}`,
            status: dbFile.status
          };
          this.attachmentRegistry.set(fileKey, record);
        }
      } catch (err: any) {
        console.warn(`[SystemFiles DB Lookup Warning]: ${err.message}`);
      }
    }

    const isPrivate = this.isPrivateKey(fileKey, record);

    if (isPrivate) {
      const role = userContext?.role || 'guest';
      const isAuthorized = 
        role === 'admin' || 
        role === 'operations_manager' || 
        role === 'super_admin' ||
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
        if (!byteArray) throw new Error("تعذر استرجاع محتوى الملف من التخزين السحابي.");
        return {
          buffer: Buffer.from(byteArray),
          record,
          mimeType: response.ContentType || record?.mimeType || 'application/octet-stream'
        };
      } catch (err: any) {
        throw new Error(`تعذر قراءة الملف من التخزين السحابي (${this.bucketName}): ${err.message}`);
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
   * Safe deletion from AWS S3 / Cloudflare R2 or local storage
   */
  public async deleteAttachment(fileKey: string): Promise<boolean> {
    if (this.s3Client) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey
        }));
      } catch (err: any) {
        console.error(`[Storage Delete Error]: ${err.message}`);
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

    if (isPostgresConfigured()) {
      try {
        await deleteSystemFile(fileKey);
      } catch (err: any) {
        console.warn(`[SystemFiles DB Delete Warning]: ${err.message}`);
      }
    }

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
        console.error("[Storage List Error]:", err.message);
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
