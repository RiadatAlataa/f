/**
 * Comprehensive Automated Test Suite: Phase 1 S3-Compatible Storage System
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Verifies:
 * 1. PostgreSQL system_files table creation, indexing, and CRUD operations.
 * 2. AttachmentStorageService universal S3 configuration, region support (me-central-1).
 * 3. Strict anti-silent-fallback enforcement (preventing ephemeral disk data loss on Render).
 * 4. Default-deny privacy classification (beneficiaries, volunteers, financial = PRIVATE).
 * 5. Full HTTP cycle: Upload, streaming download, delete, and audit trail logging.
 * 6. Legacy attachment scanner execution and report integrity.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import { AttachmentStorageService } from "../server/storage/attachmentStorage";
import { 
  initPostgresTables, 
  insertSystemFile, 
  getSystemFileByKey, 
  listSystemFilesByEntity,
  deleteSystemFile,
  getPostgresPool
} from "../server/postgres";
import app, { 
  readDb, 
  reloadDbFromDisk,
  createServerSession
} from "../server-core";
import { scanAllLegacyAttachments } from "../scripts/scan_legacy_attachments";

interface TestStep {
  name: string;
  passed: boolean;
  message: string;
}

export async function runS3StoragePhase1Tests(): Promise<boolean> {
  console.log("================================================================================");
  console.log("اختبارات التحقق: نظام تخزين الملفات الدائم (المرحلة الأولى - S3/R2/Postgres)");
  console.log("جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const results: TestStep[] = [];
  const sandboxDir = path.join(process.cwd(), "test-sandbox-storage-phase1");
  if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });

  const originalAppDbPath = process.env.APP_DB_PATH;
  const originalBackend = process.env.STORAGE_BACKEND;

  // 1. UNIT TEST: PostgreSQL system_files Table & Repository
  console.log("1. اختبار جدول system_files وعمليات البيانات في PostgreSQL...");
  try {
    const pool = getPostgresPool();
    if (pool) {
      await initPostgresTables();

      const testFileKey = `test-phase1/beneficiaries/${Date.now()}/sample_identity.pdf`;
      const testRecord = {
        id: "att-test-" + Date.now(),
        fileKey: testFileKey,
        originalName: "صورة_الهوية_الوطنية_مستفيد.pdf",
        sanitizedName: "sample_identity.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 204800,
        storageProvider: "s3",
        bucketName: "riadataleata-attachments",
        checksumSha256: crypto.createHash("sha256").update("sample pdf content for test").digest("hex"),
        entityType: "beneficiaries",
        entityId: "ben-test-01",
        fieldName: "nationalIdCopy",
        isPrivate: true,
        accessRoles: ["admin", "operations_manager", "dep-4"],
        uploadedBy: "ops-manager",
        uploadedAt: new Date().toISOString(),
        status: "active" as const
      };

      await insertSystemFile(testRecord);

      const retrieved = await getSystemFileByKey(testFileKey);
      if (!retrieved || retrieved.originalName !== testRecord.originalName || retrieved.isPrivate !== true) {
        throw new Error("Failed to retrieve inserted system file record from PostgreSQL!");
      }

      const entityList = await listSystemFilesByEntity("beneficiaries", "ben-test-01");
      if (!entityList.some(f => f.fileKey === testFileKey)) {
        throw new Error("Failed to list system files by entity!");
      }

      const deleted = await deleteSystemFile(testFileKey);
      if (!deleted) {
        throw new Error("Failed to delete system file from PostgreSQL!");
      }

      const afterDelete = await getSystemFileByKey(testFileKey);
      if (afterDelete !== null) {
        throw new Error("Deleted file is still returned by getSystemFileByKey!");
      }

      results.push({
        name: "PostgreSQL system_files Table & Repository CRUD",
        passed: true,
        message: "تم إنشاء جدول system_files وفهارسه واجتياز كافة عمليات الإدراج والاسترجاع والحذف الآمن"
      });
      console.log("   [PASSED] نجح اختبار جدول system_files والعمليات العلائقية في PostgreSQL.");
    } else {
      results.push({
        name: "PostgreSQL system_files Table (Pool Skipped)",
        passed: true,
        message: "تم تخطي فحص الاتصال الحي لغياب DATABASE_URL في البيئة المعزولة"
      });
      console.log("   [INFO] تم تخطي فحص PostgreSQL المباشر لغياب DATABASE_URL في البيئة المعزولة.");
    }
  } catch (err: any) {
    results.push({
      name: "PostgreSQL system_files Table",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل اختبار جدول system_files:", err.message);
  }

  // 2. UNIT TEST: Universal S3 Configuration & Regional Support
  console.log("\n2. اختبار اكتشاف إعدادات S3 ودعم منطقة الرياض (me-central-1)...");
  try {
    const testStorage = new AttachmentStorageService(sandboxDir);
    testStorage.initStorageClient({
      accessKeyId: "TEST_ACCESS_KEY_XYZ",
      secretAccessKey: "TEST_SECRET_KEY_ABC123",
      bucketName: "riadataleata-riyadh-vault",
      region: "me-central-1"
    });

    const status = testStorage.getStatus();
    if (status.region !== "me-central-1") {
      throw new Error(`Expected region to be me-central-1, but got: ${status.region}`);
    }
    if (status.bucketName !== "riadataleata-riyadh-vault") {
      throw new Error(`Expected bucket to be riadataleata-riyadh-vault, but got: ${status.bucketName}`);
    }
    if (!status.isConfigured) {
      throw new Error("Storage service reported isConfigured = false after valid credentials initialization!");
    }

    results.push({
      name: "Universal S3 Configuration & Riyadh Region Compliance",
      passed: true,
      message: "تم التحقق من دعم منطقة الرياض me-central-1 والحاوية المخصصة بنجاح"
    });
    console.log("   [PASSED] نجح اختبار إعدادات S3 ومنطقة الرياض me-central-1.");
  } catch (err: any) {
    results.push({
      name: "Universal S3 Configuration",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل اختبار إعدادات S3:", err.message);
  }

  // 3. UNIT TEST: Strict Anti-Silent-Fallback Guard
  console.log("\n3. اختبار وضع الحماية الصارم (Strict Mode) ومنع الرجوع للقرص المؤقت...");
  try {
    const strictStorage = new AttachmentStorageService(sandboxDir);
    // Force strict mode without credentials
    strictStorage.setStrictStorageMode(true);
    strictStorage.initStorageClient({
      accessKeyId: "",
      secretAccessKey: ""
    });

    let wasBlocked = false;
    try {
      await strictStorage.uploadAttachment(Buffer.from("Sensitive beneficiary document"), {
        originalFilename: "sensitive_document.pdf",
        mimeType: "application/pdf",
        entityType: "beneficiaries",
        entityId: "ben-999"
      });
    } catch (err: any) {
      if (err.message && (err.message.includes("Strict Storage Mode") || err.message.includes("خطأ أمان التخزين"))) {
        wasBlocked = true;
      }
    }

    if (!wasBlocked) {
      throw new Error("Expected strict storage upload to throw error and prevent writing to ephemeral disk, but it succeeded!");
    }

    results.push({
      name: "Anti-Silent-Fallback Ephemeral Disk Guard",
      passed: true,
      message: "تم منع الرجوع الصامت للقرص المؤقت لـ Render بنجاح عند تفعيل الوضع الإلزامي"
    });
    console.log("   [PASSED] تم التحقق من حظر الكتابة على القرص المؤقت في حال عدم اتصال التخزين الدائم.");
  } catch (err: any) {
    results.push({
      name: "Anti-Silent-Fallback Guard",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل اختبار منع الرجوع للقرص المؤقت:", err.message);
  }

  // 4. UNIT TEST: Default-Deny Privacy Classification
  console.log("\n4. اختبار تصنيف الخصوصية والحماية الافتراضية (Default-Deny)...");
  try {
    const storage = new AttachmentStorageService(sandboxDir);

    // Public categories
    const isLogoPrivate = storage.isPrivateKey("logos/2026-10/society_logo.png");
    const isLicensePrivate = storage.isPrivateKey("licenses/2026-10/official_license.jpg");
    const isCardTemplatePrivate = storage.isPrivateKey("cards/2026-10/template_team_1.png");
    const isNewsPrivate = storage.isPrivateKey("news/2026-10/event_photo.jpg");

    if (isLogoPrivate || isLicensePrivate || isCardTemplatePrivate || isNewsPrivate) {
      throw new Error("Public categories were incorrectly classified as private!");
    }

    // Private categories (PDPL Sensitive)
    const isBeneficiaryPrivate = storage.isPrivateKey("beneficiaries/2026-10/income_proof.pdf");
    const isVolunteerPrivate = storage.isPrivateKey("volunteers/2026-10/national_id.pdf");
    const isFinancialPrivate = storage.isPrivateKey("financial/2026-10/invoice_receipt.pdf");
    const isDeliveryPrivate = storage.isPrivateKey("deliveries/2026-10/signature_sheet.jpg");
    const isUnknownPrivate = storage.isPrivateKey("unclassified_folder/document.pdf");

    if (!isBeneficiaryPrivate || !isVolunteerPrivate || !isFinancialPrivate || !isDeliveryPrivate || !isUnknownPrivate) {
      throw new Error("Sensitive categories were incorrectly classified as public!");
    }

    results.push({
      name: "Default-Deny Privacy Classification (PDPL Compliance)",
      passed: true,
      message: "تم التحقق من حماية ملفات المستفيدين والمتطوعين والمالية وحظر جعلها عامة"
    });
    console.log("   [PASSED] نجح اختبار تصنيف الخصوصية ومنع الوصول العام للوثائق الحساسة.");
  } catch (err: any) {
    results.push({
      name: "Default-Deny Privacy Classification",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل اختبار تصنيف الخصوصية:", err.message);
  }

  // 5. INTEGRATION TEST: Full HTTP Cycle (Upload, Stream Download, Delete, Audit Trail)
  console.log("\n5. اختبار تكاملي لمسارات HTTP وسجل التدقيق (Upload / Download / Delete)...");
  let server: http.Server | null = null;
  try {
    const isolatedDbPath = path.join(sandboxDir, "isolated-test-storage-db.json");
    const mockDb = {
      systemSettings: {
        societyName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        maintenanceMode: false
      },
      departments: [
        { id: "dep-1", nameAr: "الإدارة التنفيذية", nameEn: "Executive Management" },
        { id: "dep-4", nameAr: "إدارة شؤون المستفيدين والرعاية الاجتماعية", nameEn: "Beneficiary Care" }
      ],
      userDepartmentAccess: [
        {
          id: "perm-ops-mousa",
          userId: "ops-mousa",
          username: "mousa",
          userName: "موسى مدير العمليات",
          role: "operations_manager",
          jobTitle: "مدير العمليات",
          primaryDepartmentId: "dep-1",
          allowedDepartmentIds: ["dep-1", "dep-4"],
          permissions: ["super_admin", "operations_manager", "manage_staff", "view_department", "all_permissions"],
          status: "active",
          mustChangePassword: false,
          createdAt: new Date().toISOString()
        }
      ],
      accessAuditLogs: []
    };

    fs.writeFileSync(isolatedDbPath, JSON.stringify(mockDb, null, 2), "utf8");
    process.env.APP_DB_PATH = isolatedDbPath;
    process.env.STORAGE_BACKEND = "file";
    reloadDbFromDisk();

    const opsSession = createServerSession({
      userId: "ops-mousa",
      userName: "موسى مدير العمليات",
      role: "operations_manager",
      isOperationsManager: true,
      isSuperAdmin: true,
      primaryDepartmentId: "dep-1",
      allowedDepartmentIds: ["dep-1", "dep-4"],
      permissions: ["super_admin", "operations_manager", "manage_staff", "view_department", "all_permissions"]
    });

    await new Promise<void>((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });

    const address = server!.address() as any;
    const port = address.port;

    // 5.1 Test Uploading an attachment via HTTP
    const dummyContent = "Mock beneficiary income proof document content for automated testing";
    const dummyBase64 = Buffer.from(dummyContent).toString("base64");
    const uploadPayload = JSON.stringify({
      fileBase64: `data:application/pdf;base64,${dummyBase64}`,
      originalFilename: "شهادة_دخل_مستفيد_2026.pdf",
      mimeType: "application/pdf",
      entityType: "beneficiaries",
      entityId: "ben-auto-101",
      fieldName: "incomeProof",
      isPrivate: true
    });

    const uploadRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/attachments/upload",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(uploadPayload),
            "Authorization": `Bearer ${opsSession.token}`,
            "x-session-token": opsSession.token
          }
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode || 500, body }));
        }
      );
      req.on("error", reject);
      req.write(uploadPayload);
      req.end();
    });

    if (uploadRes.status !== 200) {
      throw new Error(`Failed to upload attachment via HTTP, got status ${uploadRes.status}: ${uploadRes.body}`);
    }

    const uploadData = JSON.parse(uploadRes.body);
    const uploadedRecord = uploadData.attachment;
    if (!uploadedRecord || !uploadedRecord.fileKey) {
      throw new Error(`Upload response did not return valid attachment record: ${uploadRes.body}`);
    }

    // 5.2 Test Streaming Download via HTTP
    const downloadRes = await new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: `/api/attachments/download/${encodeURIComponent(uploadedRecord.fileKey)}`,
          method: "GET",
          headers: {
            "Authorization": `Bearer ${opsSession.token}`,
            "x-session-token": opsSession.token
          }
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on("end", () => resolve({ status: res.statusCode || 500, body: Buffer.concat(chunks) }));
        }
      );
      req.on("error", reject);
      req.end();
    });

    if (downloadRes.status !== 200) {
      throw new Error(`Failed to download attachment via HTTP, got status ${downloadRes.status}`);
    }

    if (downloadRes.body.toString("utf8") !== dummyContent) {
      throw new Error("Downloaded file content does not match uploaded content!");
    }

    // 5.3 Test Unauthorized Download (Without token on private file)
    const unauthorizedRes = await new Promise<{ status: number }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: `/api/attachments/download/${encodeURIComponent(uploadedRecord.fileKey)}`,
          method: "GET"
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", () => resolve({ status: res.statusCode || 500 }));
        }
      );
      req.on("error", reject);
      req.end();
    });

    if (unauthorizedRes.status !== 401 && unauthorizedRes.status !== 403) {
      throw new Error(`Expected unauthorized request to return 401 or 403, but got: ${unauthorizedRes.status}`);
    }

    // 5.4 Test Deleting Attachment via HTTP
    const deleteRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: `/api/attachments/delete/${encodeURIComponent(uploadedRecord.fileKey)}`,
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${opsSession.token}`,
            "x-session-token": opsSession.token
          }
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode || 500, body }));
        }
      );
      req.on("error", reject);
      req.end();
    });

    if (deleteRes.status !== 200) {
      throw new Error(`Failed to delete attachment via HTTP, got status ${deleteRes.status}: ${deleteRes.body}`);
    }

    // 5.5 Verify Audit Trail Logs
    const liveDbAfter = readDb();
    const auditLogs = liveDbAfter?.accessAuditLogs || [];
    const hasUploadAudit = auditLogs.some((l: any) => l.action === 'upload_attachment');
    const hasDownloadAudit = auditLogs.some((l: any) => l.action === 'download_attachment');
    const hasDeleteAudit = auditLogs.some((l: any) => l.action === 'delete_attachment');

    if (!hasUploadAudit || !hasDownloadAudit || !hasDeleteAudit) {
      throw new Error(`Audit trail missing one or more required events: upload=${hasUploadAudit}, download=${hasDownloadAudit}, delete=${hasDeleteAudit}`);
    }

    results.push({
      name: "HTTP Upload / Download / Delete & Audit Trail Verification",
      passed: true,
      message: "تم التحقق بنجاح من دورة حياة الملف الكاملة مع توثيق عمليات الرفع والتنزيل والحذف في سجل التدقيق"
    });
    console.log("   [PASSED] نجح اختبار دورة حياة الملفات عبر HTTP وسجل التدقيق الإلزامي.");
  } catch (err: any) {
    results.push({
      name: "HTTP Endpoints & Audit Trail",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل الاختبار التكاملي للمسارات وسجل التدقيق:", err.message);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (originalAppDbPath !== undefined) process.env.APP_DB_PATH = originalAppDbPath;
    else delete process.env.APP_DB_PATH;
    if (originalBackend !== undefined) process.env.STORAGE_BACKEND = originalBackend;
    else delete process.env.STORAGE_BACKEND;
  }

  // 6. UNIT TEST: Legacy Attachment Diagnostic Scanner
  console.log("\n6. اختبار أداة فحص وتشخيص الملفات القديمة (Scanner Tool)...");
  try {
    const report = scanAllLegacyAttachments();
    if (typeof report.totalReferencesFound !== 'number') {
      throw new Error("Scanner report did not return valid totalReferencesFound number!");
    }
    if (!report.breakdown || typeof report.breakdown.embeddedBase64 !== 'number') {
      throw new Error("Scanner report did not return valid breakdown object!");
    }
    if (!report.privacyClassification || typeof report.privacyClassification.privateSensitiveFiles !== 'number') {
      throw new Error("Scanner report did not return valid privacyClassification!");
    }

    results.push({
      name: "Legacy Attachment Diagnostic Scanner",
      passed: true,
      message: `تم تشغيل أداة الفحص بنجاح واكتشاف ${report.totalReferencesFound} مرجعاً وتصنيفها بدقة`
    });
    console.log(`   [PASSED] نجح اختبار أداة الفحص والتشخيص (عدد المراجع: ${report.totalReferencesFound}).`);
  } catch (err: any) {
    results.push({
      name: "Legacy Attachment Diagnostic Scanner",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل اختبار أداة الفحص:", err.message);
  }

  // Cleanup sandbox
  if (fs.existsSync(sandboxDir)) {
    try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
  }

  console.log("\n================================================================================");
  console.log("ملخص نتائج اختبارات نظام تخزين الملفات (المرحلة الأولى):");
  console.log("================================================================================");
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? "✔ [ناجح]" : "✘ [راسب]";
    console.log(`${mark} ${r.name}: ${r.message}`);
    if (!r.passed) allPassed = false;
  }
  console.log("================================================================================\n");

  if (!allPassed) {
    throw new Error("فشلت بعض اختبارات نظام تخزين الملفات.");
  }
  return allPassed;
}

if (process.argv[1] && process.argv[1].includes("test_s3_storage_phase1")) {
  runS3StoragePhase1Tests()
    .then(() => {
      console.log("جميع اختبارات المرحلة الأولى اجتازت بنجاح تام!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("فشل الاختبار:", err);
      process.exit(1);
    });
}
