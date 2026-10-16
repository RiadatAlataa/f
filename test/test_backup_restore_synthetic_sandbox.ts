/**
 * Dedicated Synthetic Backup & Restore Sandbox Verification Test
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Tests:
 * 1. Creating a synthetic full database bundle (80 collections) + synthetic attachments.
 * 2. Authenticated AES-256-GCM encryption with SHA-256 payload digests.
 * 3. Restoring into a 100% isolated sandbox folder.
 * 4. Verifying byte-for-byte attachment restoration and record count integrity.
 * 5. Verifying system_state compatibility and zero field loss.
 * 6. Guaranteeing Zero-Pollution of root db.json.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { backupEngine } from "../server/backupEngine";
import { migrationEngine } from "../server/migration/migrationEngine";

async function runSyntheticBackupRestoreTest() {
  console.log("================================================================================");
  console.log("اختبار التحقق من النسخ الاحتياطي والاستعادة المعزولة (Synthetic Sandbox)");
  console.log("مشروع: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const testDir = path.join(process.cwd(), "test-synthetic-backup-sandbox");
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // 1. Generate Synthetic Database (covering all functional entities)
  const syntheticDb: any = {
    _version: 10,
    _lastModified: new Date().toISOString(),
    departments: [
      { id: "dep-synth-01", nameAr: "إدارة التطوع والمبادرات", status: "active" },
      { id: "dep-synth-02", nameAr: "إدارة الرعاية والخدمات الاجتماعية", status: "active" }
    ],
    teams: [
      { id: "team-synth-01", departmentId: "dep-synth-01", name: "فريق الميدان", status: "active" }
    ],
    volunteers: [
      { id: "vol-synth-01", primaryDepartmentId: "dep-synth-01", teamId: "team-synth-01", name: "متطوع اصطناعي 1", nationalId: "1098765432", fileNumber: "VFN-999" }
    ],
    beneficiaries: [
      { id: "ben-synth-01", name: "مستفيد اصطناعي 1", nationalId: "1012345678", category: "أسر أيتام", status: "active" }
    ],
    benefitRequests: [
      { id: "req-synth-01", beneficiaryId: "ben-synth-01", type: "سلة غذائية", status: "approved" }
    ],
    initiatives: [
      { id: "init-synth-01", departmentId: "dep-synth-01", teamId: "team-synth-01", title: "مبادرة كسوة الشتاء الاصطناعية" }
    ],
    attendance: [
      { id: "att-synth-01", initiativeId: "init-synth-01", volunteerId: "vol-synth-01", hours: 4, date: "2026-10-15" }
    ],
    warehouses: [
      { id: "wh-synth-01", name: "المستودع الرئيسي الاصطناعي", code: "WH-SYNTH", capacity: 1000 }
    ],
    inventoryItems: [
      { id: "item-synth-01", warehouseId: "wh-synth-01", name: "سلة تموينية", sku: "SKU-SYNTH-01", quantity: 150 }
    ],
    financialAccounts: [
      { id: "acc-synth-01", accountNumber: "SA0000000000000000000001", accountName: "حساب التبرعات العام", balance: 50000 }
    ],
    employees: [
      { id: "emp-synth-01", name: "موظف اصطناعي", nationalId: "1055555555", departmentId: "dep-synth-01", role: "coordinator" }
    ],
    systemSettings: {
      associationName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      licenseNumber: "5441",
      maintenanceMode: false
    }
  };

  // Add all other keys to simulate complete 80-collection structure
  const allCoreKeys = [
    "requests", "evaluations", "logs", "notifications", "homeSettings", "news", "partners", "gallery",
    "volunteerApplications", "teamApplications", "chatConversations", "chatMessages", "supportTickets",
    "opportunityRequests", "departmentDirectives", "storeProjects", "storeDonations", "financialTransactions",
    "storekeepers", "inventoryLogs", "certificateTemplates", "issuedCertificates", "initiativeRatings",
    "inventoryVendors", "inventoryMovements", "inventoryAudits", "volunteerCardTemplates", "issuedVolunteerCards",
    "letters", "distributions", "distributionHandovers", "financialSettings", "financialTransfers",
    "financialBudgets", "financialSuppliers", "financialDonors", "financialIncome", "financialExpenses",
    "financialPurchases", "financialPayables", "financialPayroll", "financialReceipts", "financialDocuments",
    "financialAuditLog", "custodies", "supportManagers", "supportAgents", "supportTasks", "employeeRequests",
    "teamStaffAssignments", "emailSettings", "emailLogs", "userDepartmentAccess", "permissionChangeLogs",
    "accessAuditLogs", "beneficiaryRatings", "orgMembers", "heroSlides", "developerErrorLogs", "activeSessions",
    "passwordResetOtps", "maintenance_mode", "volunteerTransferRequests", "passwordResetRequests",
    "_deletedRecordIds", "_deletedTombstones"
  ];

  for (const k of allCoreKeys) {
    if (!syntheticDb[k]) {
      syntheticDb[k] = [];
    }
  }

  console.log(`[1] تم تجهيز قاعدة بيانات اصطناعية تحوي ${Object.keys(syntheticDb).length} مصفوفة وحقل.`);

  // 2. Test Migration Engine with System State Compatibility
  console.log("\n[2] اختبار فحص التوافق مع محرك الترحيل (Migration Engine) ونظام system_state...");
  const migrationReport = await migrationEngine.executeMigration(syntheticDb, { dryRun: true });

  console.log(`- نتيجة الترحيل التجريبي: ${migrationReport.success ? "ناجح" : "فشل"}`);
  console.log(`- التوافق مع system_state: ${migrationReport.systemStateCompatibility}`);
  console.log(`- بصمة SHA-256 للمحتوى: ${migrationReport.sha256PayloadChecksum}`);
  console.log(`- عدد المجموعات المفحوصة: ${migrationReport.totalSourceCollections}`);
  console.log(`- إجمالي السجلات المصدرية: ${migrationReport.totalSourceRecords}`);
  console.log(`- إجمالي السجلات الصالحة: ${migrationReport.totalMigratedRecords}`);
  console.log(`- السجلات المتخطاة: ${migrationReport.totalSkippedRecords}`);
  console.log(`- الأخطاء: ${migrationReport.totalErrors}`);

  if (migrationReport.systemStateCompatibility !== "VERIFIED_100%" || !migrationReport.success) {
    throw new Error("فشل اختبار التوافق مع system_state في محرك الترحيل!");
  }

  // 3. Test Synthetic Backup Bundle Capture with Attachments
  console.log("\n[3] اختبار تجميع حزمة النسخ الاحتياطي مع مرفقات اصطناعية وتشفير AES-256-GCM...");
  
  // Create synthetic attachment files in testDir
  const mockUploadsDir = path.join(testDir, "mock_uploads");
  fs.mkdirSync(path.join(mockUploadsDir, "license"), { recursive: true });
  fs.mkdirSync(path.join(mockUploadsDir, "volunteers"), { recursive: true });

  const licenseContent = Buffer.from("SYNTHETIC_OFFICIAL_LICENSE_IMAGE_DATA_PNG");
  const charterContent = Buffer.from("SYNTHETIC_VOLUNTEER_CHARTER_PDF_DOCUMENT");

  fs.writeFileSync(path.join(mockUploadsDir, "license", "official_license.png"), licenseContent);
  fs.writeFileSync(path.join(mockUploadsDir, "volunteers", "charter_vol_01.pdf"), charterContent);

  const customKey = crypto.randomBytes(32).toString("hex");

  // Mock bundle capture
  const { bundle, metadata } = await backupEngine.captureConsistentBundle(() => syntheticDb);
  
  // Inject mock synthetic attachments into bundle
  bundle.attachments.push({
    relativePath: "public/uploads/license/official_license.png",
    contentBase64: licenseContent.toString("base64"),
    sha256: crypto.createHash("sha256").update(licenseContent).digest("hex")
  });
  bundle.attachments.push({
    relativePath: "public/uploads/volunteers/charter_vol_01.pdf",
    contentBase64: charterContent.toString("base64"),
    sha256: crypto.createHash("sha256").update(charterContent).digest("hex")
  });
  metadata.attachmentsCount = bundle.attachments.length;
  // Recalculate plain payload hash for the modified bundle
  metadata.sha256Plain = crypto.createHash("sha256").update(JSON.stringify(bundle)).digest("hex");

  const envelope = backupEngine.encryptBundle(bundle, metadata, customKey);

  console.log(`- تم إنشاء الحزمة المشفرة: معرف النسخة (${envelope.backupId})`);
  console.log(`- خوارزمية التشفير: ${envelope.algorithm}`);
  console.log(`- عدد السجلات الموثقة في الميتاداتا: ${Object.keys(envelope.metadata.recordCounts).length} مجموعة`);
  console.log(`- عدد المرفقات المضمنة في الحزمة: ${envelope.metadata.attachmentsCount}`);

  // 4. Test Restore in Isolated Sandbox
  console.log("\n[4] اختبار الاستعادة والتحقق في بيئة معزولة تماماً (Isolated Sandbox)...");
  const restoreVerification = await backupEngine.testIsolatedRestore(envelope, customKey);

  console.log(`- نتيجة فحص الاستعادة: ${restoreVerification.valid ? "صحيحة ومطابقة 100%" : "غير صالحة"}`);
  console.log(`- المرفقات المستخرجة بنجاح: ${restoreVerification.attachmentsExtracted}`);
  console.log(`- سلامة العلاقات الترابطية (Referential Integrity): ${restoreVerification.referentialIntegrity.passed ? "سليمة" : "تالفة"}`);
  console.log(`- زمن فك التشفير والاستعادة: ${restoreVerification.durationMs}ms`);

  if (!restoreVerification.valid || !restoreVerification.referentialIntegrity.passed) {
    throw new Error("فشل اختبار الاستعادة والتحقق في البيئة المعزولة!");
  }

  // 5. Verify Zero Pollution of Production db.json
  const rootDbPath = path.join(process.cwd(), "db.json");
  const rootContent = fs.readFileSync(rootDbPath, "utf8");
  const isPolluted = rootContent.includes("dep-synth-01") || rootContent.includes("SYNTHETIC_");
  
  console.log(`\n[5] فحص عدم تلوث قاعدة بيانات المشروع الأصلية (Zero Pollution Check)...`);
  console.log(`- حالة النزاهة: ${!isPolluted ? "سليمة 100% (Zero-Pollution Verified)" : "تنبيه: حدث تلوث"}`);

  if (isPolluted) {
    throw new Error("تلوث في ملف db.json الأصلي!");
  }

  // Cleanup testDir
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log("\n================================================================================");
  console.log("اكتمل اختبار النسخ الاحتياطي والاستعادة المعزولة بنجاح تام (100% PASS)");
  console.log("================================================================================");
}

runSyntheticBackupRestoreTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
