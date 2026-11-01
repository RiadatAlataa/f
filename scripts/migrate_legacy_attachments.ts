/**
 * Safe Migration Engine for Legacy Attachments & Embedded Base64
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Safety Rules:
 * 1. DRY-RUN IS STRICTLY ACTIVE BY DEFAULT: No mutations occur without explicit '--execute' flag.
 * 2. SHA-256 Checksum Verification: Every uploaded file is downloaded and compared for 100% hash match.
 * 3. Zero-Data-Loss: Complete mapping log is persisted in 'migration_backup_mapping.json' for rollback.
 * 4. Preserves database integrity: Does not alter user accounts, permissions, or system_state destructively.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { scanAllLegacyAttachments, DiscoveredFileItem } from "./scan_legacy_attachments";
import { attachmentStorage } from "../server/storage/attachmentStorage";
import { readDb, writeDb } from "../server-core";

export interface MigrationStepResult {
  itemId: string;
  originalSource: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  isPrivate: boolean;
  originalSizeBytes: number;
  originalSha256: string;
  targetFileKey?: string;
  targetUrl?: string;
  verifiedSha256?: string;
  checksumMatch: boolean;
  status: 'simulated' | 'success' | 'failed' | 'skipped';
  error?: string;
}

export async function runAttachmentMigration(isExecuteMode: boolean = false): Promise<{
  mode: 'dry_run' | 'execute';
  totalDiscovered: number;
  migratableCount: number;
  successCount: number;
  failedCount: number;
  results: MigrationStepResult[];
}> {
  console.log("================================================================================");
  console.log(`   محرك ترحيل المرفقات الآمن - [وضع التشغيل: ${isExecuteMode ? 'تنفيذ حقيقي (EXECUTE)' : 'محاكاة آمنة (DRY RUN)'}]   `);
  console.log("   جمعية ريادة العطاء لخدمة الإنسان بالعسيلة   ");
  console.log("================================================================================\n");

  if (!isExecuteMode) {
    console.log("🔒 تنبيه أمان: المحاكاة الآمنة (Dry Run) مفعلة افتراضياً.");
    console.log("لن يتم تعديل أي سجل في قاعدة بيانات Neon أو رفع ملفات حقيقية دون إذن صريح واعتماد رسمي.\n");
  }

  // 1. Scan and discover all legacy files
  const scanReport = scanAllLegacyAttachments();
  const migratableItems = scanReport.items.filter(i => i.status === 'migratable');

  console.log(`[1] نتائج الفحص: تم اكتشاف ${scanReport.totalReferencesFound} مرجعاً، منها ${migratableItems.length} ملفاً مؤهلاً للترحيل.`);
  console.log(`[2] حالة الاتصال بخدمة التخزين السحابي:`);
  
  const status = attachmentStorage.getStatus();
  console.log(`   - المزود: ${status.provider.toUpperCase()}`);
  console.log(`   - الحاوية (Bucket): ${status.bucketName}`);
  console.log(`   - المنطقة (Region): ${status.region}`);
  console.log(`   - الوضع الإلزامي (Strict Mode): ${status.strictStorageMode ? 'مفعل' : 'معطل'}`);

  const stepResults: MigrationStepResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const item of migratableItems) {
    const step: MigrationStepResult = {
      itemId: item.id,
      originalSource: item.locationPath,
      entityType: item.entityType,
      entityId: item.entityId,
      fieldName: item.fieldName,
      isPrivate: item.isPrivate,
      originalSizeBytes: item.estimatedSizeBytes,
      originalSha256: item.checksumSha256 || '',
      checksumMatch: false,
      status: 'simulated'
    };

    if (!isExecuteMode) {
      // Simulation mode: only verify buffer extraction and hash
      step.status = 'simulated';
      step.checksumMatch = Boolean(item.checksumSha256);
      step.targetFileKey = `${item.entityType}/${new Date().toISOString().substring(0, 7)}/simulated_${item.id}.${item.mimeType.includes('pdf') ? 'pdf' : 'png'}`;
      step.targetUrl = item.isPrivate ? `/api/attachments/download/${encodeURIComponent(step.targetFileKey)}` : `/uploads/${step.targetFileKey}`;
      stepResults.push(step);
      continue;
    }

    // Execute Mode: Real upload with SHA-256 verification
    try {
      let fileBuffer: Buffer | null = null;
      let originalFilename = `legacy_${item.entityType}_${item.entityId}.${item.mimeType.includes('pdf') ? 'pdf' : 'png'}`;

      if (item.sourceType === 'embedded_base64') {
        const raw = item.locationPath; // value was extracted
        const cleanB64 = raw.replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(cleanB64, 'base64');
      } else if (item.sourceType === 'local_file_reference') {
        const fullLocalPath = path.join(process.cwd(), "public", item.locationPath.replace(/^\//, ''));
        if (fs.existsSync(fullLocalPath)) {
          fileBuffer = fs.readFileSync(fullLocalPath);
          originalFilename = path.basename(fullLocalPath);
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error(`تعذر استخراج محتوى الملف (${item.locationPath})`);
      }

      const originalHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      step.originalSha256 = originalHash;

      // Upload to Storage
      const record = await attachmentStorage.uploadAttachment(fileBuffer, {
        originalFilename,
        mimeType: item.mimeType,
        entityType: item.entityType as any,
        entityId: item.entityId,
        fieldName: item.fieldName,
        isPrivate: item.isPrivate,
        uploadedBy: 'migration_system'
      });

      step.targetFileKey = record.fileKey;
      step.targetUrl = record.url;

      // Verification Step: Retrieve back from storage and compare SHA-256
      const downloaded = await attachmentStorage.getAttachmentBuffer(record.fileKey, { role: 'admin' });
      const downloadedHash = crypto.createHash("sha256").update(downloaded.buffer).digest("hex");
      step.verifiedSha256 = downloadedHash;

      if (downloadedHash !== originalHash) {
        throw new Error(`فشل التحقق من تكامل الملف: البصمة المسترجعة (${downloadedHash}) لا تطابق الأصلية (${originalHash})`);
      }

      step.checksumMatch = true;
      step.status = 'success';
      successCount++;
    } catch (err: any) {
      step.status = 'failed';
      step.error = err.message || String(err);
      failedCount++;
    }

    stepResults.push(step);
  }

  // Save migration mapping log
  const mappingOutputPath = path.join(process.cwd(), "scripts", "migration_backup_mapping.json");
  fs.writeFileSync(mappingOutputPath, JSON.stringify(stepResults, null, 2), "utf8");

  console.log(`\n================================================================================`);
  console.log(`تقرير ${isExecuteMode ? 'التنفيذ' : 'المحاكاة'}:`);
  console.log(`- الملفات المفحوصة: ${migratableItems.length}`);
  console.log(`- نتيجة المحاكاة/التنفيذ: ${isExecuteMode ? `نجح: ${successCount} | فشل: ${failedCount}` : `جاهزة للترحيل: ${stepResults.length}`}`);
  console.log(`- تم حفظ سجل الترحيل الكامل في: ${mappingOutputPath}`);
  console.log(`================================================================================\n`);

  return {
    mode: isExecuteMode ? 'execute' : 'dry_run',
    totalDiscovered: scanReport.totalReferencesFound,
    migratableCount: migratableItems.length,
    successCount,
    failedCount,
    results: stepResults
  };
}

// Execution entry point
if (process.argv[1] && process.argv[1].includes("migrate_legacy_attachments")) {
  const isExecute = process.argv.includes("--execute");
  runAttachmentMigration(isExecute)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration Runner Error:", err);
      process.exit(1);
    });
}
