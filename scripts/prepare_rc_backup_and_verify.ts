/**
 * Release Candidate Backup Generation & Isolated Restore Verification
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { backupEngine } from "../server/backupEngine";
import { readDb } from "../server-core";

async function runRcBackupAndVerification() {
  console.log("================================================================================");
  console.log("   تجهيز النسخة الاحتياطية المشفرة لبيانات الإنتاج والتحقق من استعادتها المعزولة   ");
  console.log("   مشروع: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - Release Candidate      ");
  console.log("================================================================================\n");

  const originalDbContent = fs.readFileSync(path.join(process.cwd(), "db.json"), "utf8");
  const originalSha256 = crypto.createHash("sha256").update(originalDbContent).digest("hex");

  // 1. Generate a 256-bit AES Key for Release Candidate Backup
  const rcKeyHex = crypto.randomBytes(32).toString("hex");

  console.log("[1] أخذ حزمة بيانات ذرية متسقة وموثقة من قاعدة البيانات الحالية...");
  const { bundle, metadata } = await backupEngine.captureConsistentBundle(readDb);

  console.log(`- معرف النسخة الاحتياطية: ${metadata.backupId}`);
  console.log(`- إجمالي السجلات المفحوصة في الحزمة: ${JSON.stringify(metadata.recordCounts)}`);
  console.log(`- عدد المرفقات المضمنة: ${metadata.attachmentsCount}`);
  console.log(`- بصمة SHA-256 للمحتوى الأصلي: ${metadata.sha256Plain}`);

  console.log("\n[2] تشفير الحزمة بخوارزمية AES-256-GCM مع المصادقة...");
  const envelope = backupEngine.encryptBundle(bundle, metadata, rcKeyHex);

  console.log(`- خوارزمية التشفير: ${envelope.algorithm}`);
  console.log(`- بصمة SHA-256 للحزمة المشفرة: ${envelope.sha256Ciphertext}`);
  console.log(`- حجم الحزمة المشفرة: ${(envelope.ciphertextBase64.length / 1024).toFixed(2)} KB`);

  // Save the encrypted backup locally in backups/
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const rcBackupPath = path.join(backupsDir, `production_rc_backup_${metadata.backupId}.enc.json`);
  fs.writeFileSync(rcBackupPath, JSON.stringify(envelope, null, 2), "utf8");
  console.log(`- تم حفظ النسخة المشفرة بأمان في: ${rcBackupPath}`);

  console.log("\n[3] اختبار استعادة النسخة الاحتياطية المشفرة في بيئة معزولة تمامًا (Isolated Sandbox)...");
  const restoreResult = await backupEngine.testIsolatedRestore(envelope, rcKeyHex);

  console.log(`- نتيجة سلامة العلاقات الترابطية (Referential Integrity): ${restoreResult.referentialIntegrity.passed ? "PASS" : "FAIL"}`);
  console.log(`- عدد السجلات المستعادة: ${JSON.stringify(restoreResult.recordCounts)}`);
  console.log(`- زمن فك التشفير والاستعادة: ${restoreResult.durationMs}ms`);
  console.log(`- عدد المرفقات المستخرجة والمفحوصة: ${restoreResult.attachmentsExtracted}`);

  const volunteersMatch = restoreResult.recordCounts.volunteers === metadata.recordCounts.volunteers;
  const teamsMatch = restoreResult.recordCounts.teams === metadata.recordCounts.teams;
  const beneficiariesMatch = restoreResult.recordCounts.beneficiaries === metadata.recordCounts.beneficiaries;

  console.log(`- تطابق سجلات المتطوعين: ${volunteersMatch} (${restoreResult.recordCounts.volunteers})`);
  console.log(`- تطابق سجلات الفرق: ${teamsMatch} (${restoreResult.recordCounts.teams})`);
  console.log(`- تطابق سجلات المستفيدين: ${beneficiariesMatch} (${restoreResult.recordCounts.beneficiaries})`);

  console.log("\n[4] التحقق من عدم المساس بقاعدة بيانات الإنتاج الحالية (Zero-Pollution Check)...");
  const currentDbContent = fs.readFileSync(path.join(process.cwd(), "db.json"), "utf8");
  const currentSha256 = crypto.createHash("sha256").update(currentDbContent).digest("hex");
  const unpolluted = currentSha256 === originalSha256;
  console.log(`- سلامة قاعدة البيانات الأصلية وعدم تعديلها: ${unpolluted ? "VERIFIED (100% UNTOUCHED)" : "FAILED"}`);

  const allPassed = restoreResult.referentialIntegrity.passed && volunteersMatch && teamsMatch && beneficiariesMatch && unpolluted;

  console.log("\n================================================================================");
  if (allPassed) {
    console.log("[PASS] تم إنجاز النسخة الاحتياطية المشفرة والتحقق من استعادتها بنجاح تام 100%!");
  } else {
    console.error("[FAIL] فشل أحد فحوصات الاستعادة المعزولة.");
    process.exit(1);
  }
  console.log("================================================================================\n");
}

runRcBackupAndVerification().catch((err) => {
  console.error("Backup script error:", err);
  process.exit(1);
});
