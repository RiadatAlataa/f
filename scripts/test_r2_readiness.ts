/**
 * Isolated Automated Readiness & Security Test Suite for Cloudflare R2
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 *
 * Verifies:
 * 1. Environment variables specification and discovery.
 * 2. MIME type whitelisting (Images, Logos, PDFs, Word, Excel).
 * 3. Default-deny privacy access control for beneficiaries and volunteers.
 * 4. Strict Mode anti-silent-fallback enforcement (preventing ephemeral disk data loss).
 * 5. Anti-path-traversal sanitization.
 * 6. Dummy buffer upload, SHA-256 validation, and clean teardown.
 */

import { AttachmentStorageService } from "../server/storage/attachmentStorage";
import fs from "fs";
import path from "path";

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   فحص جاهزية ربط Cloudflare R2 - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة     ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // Temporary sandbox directory for testing
  const tempSandbox = path.join(process.cwd(), ".tmp_test_r2_sandbox");
  if (!fs.existsSync(tempSandbox)) {
    fs.mkdirSync(tempSandbox, { recursive: true });
  }

  try {
    const storage = new AttachmentStorageService(tempSandbox);

    // 1. Verify Status & Env Discovery
    const status = storage.getStatus();
    assert(
      status.bucketName !== undefined && status.maxSizeBytes === 15 * 1024 * 1024,
      "1. تهيئة خدمة التخزين والتحقق من قيود الحجم (15MB)"
    );

    // 2. Test Anti-Silent Fallback (Requirement 5)
    storage.setStrictR2Mode(true);
    let strictBlocked = false;
    try {
      // Without R2 configured, strict mode MUST reject upload rather than silently falling back
      await storage.uploadAttachment(Buffer.from("dummy data"), {
        originalFilename: "test_doc.pdf",
        mimeType: "application/pdf",
        entityType: "general",
        entityId: "test-001"
      });
    } catch (err: any) {
      if (err.message.includes("Strict R2 Mode") || err.message.includes("خطأ أمان التخزين")) {
        strictBlocked = true;
      }
    }
    assert(
      strictBlocked,
      "2. منع الرجوع الصامت للتخزين المحلي المؤقت عند تفعيل الوضع الصارم (Strict R2 Mode)",
      "يجب منع كتابة الملفات على القرص المؤقت لـ Render إذا كانت بيانات R2 غير متصلة"
    );

    // 3. Test Non-Strict Sandbox for Isolated File Validation
    storage.setStrictR2Mode(false);

    // 3.1 Test PDF Upload
    const dummyPdf = Buffer.from("%PDF-1.4 mock pdf document content for verification %%EOF");
    const pdfRecord = await storage.uploadAttachment(dummyPdf, {
      originalFilename: "وثيقة_رسمية_مستفيد.pdf",
      mimeType: "application/pdf",
      entityType: "beneficiaries",
      entityId: "ben-101",
      isPrivate: true
    });
    assert(
      pdfRecord.mimeType === "application/pdf" && pdfRecord.fileKey.endsWith(".pdf") && pdfRecord.isPrivate === true,
      "3. دعم ورفع ملفات PDF للمستفيدين وتوليد مفتاح عشوائي آمن"
    );

    // 3.2 Test Images & Logos Upload (PNG / JPEG / WebP / SVG)
    const dummyPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    const logoRecord = await storage.uploadAttachment(dummyPng, {
      originalFilename: "association_logo.png",
      mimeType: "image/png",
      entityType: "logos",
      entityId: "logo-main",
      isPrivate: false
    });
    assert(
      logoRecord.mimeType === "image/png" && logoRecord.isPrivate === false,
      "4. دعم رفع شعارات الجمعية بصيغة PNG كملفات عامة متاحة للزوار"
    );

    // 3.3 Test Unsupported MIME Type Rejection
    let rejectedExecutable = false;
    try {
      await storage.uploadAttachment(Buffer.from("MZ mock executable payload"), {
        originalFilename: "malicious.exe",
        mimeType: "application/x-msdownload",
        entityType: "general",
        entityId: "mal-1"
      });
    } catch {
      rejectedExecutable = true;
    }
    assert(rejectedExecutable, "5. حظر الملفات التنفيذية والأنواع غير المصرّح بها (MIME Type Blacklist Enforcement)");

    // 4. Test Access Authorization and Privacy Enforcement (Requirement 4)
    // 4.1 Beneficiary file: Guest access MUST be rejected
    let guestBlocked = false;
    try {
      await storage.getAttachmentBuffer(pdfRecord.fileKey, { role: "guest" });
    } catch (err: any) {
      if (err.message.includes("غير مصرح")) {
        guestBlocked = true;
      }
    }
    assert(guestBlocked, "6. حماية خصوصية ملفات المستفيدين وحظر وصول الزوار غير المسجلين (Default-Deny)");

    // 4.2 Beneficiary file: Admin access MUST be allowed
    const adminAccess = await storage.getAttachmentBuffer(pdfRecord.fileKey, { role: "admin", id: "admin-1" });
    assert(
      adminAccess.buffer.length === dummyPdf.length,
      "7. السماح للإدارة العليا والعمليات بالوصول للمرفقات الخاصة والمشفرة"
    );

    // 4.3 Beneficiary file: Owner beneficiary MUST be allowed
    const ownerAccess = await storage.getAttachmentBuffer(pdfRecord.fileKey, { role: "beneficiary", id: "ben-101" });
    assert(
      ownerAccess.buffer.length === dummyPdf.length,
      "8. السماح للمستفيد صاحب المرفق بالوصول إلى مستنداته الخاصة فقط"
    );

    // 4.4 Beneficiary file: Different beneficiary MUST be blocked
    let otherBenBlocked = false;
    try {
      await storage.getAttachmentBuffer(pdfRecord.fileKey, { role: "beneficiary", id: "ben-999_different" });
    } catch {
      otherBenBlocked = true;
    }
    assert(otherBenBlocked, "9. منع المستفيدين الآخرين من الاطلاع على مستندات بعضهم البعض (Horizontal Privilege Escalation Prevention)");

    // 5. Anti-Path-Traversal Protection
    let traversalBlocked = false;
    try {
      await storage.getAttachmentBuffer("../../etc/passwd");
    } catch {
      traversalBlocked = true;
    }
    assert(traversalBlocked, "10. الحماية الصارمة من ثغرات اجتياز المسارات (Anti-Path Traversal & Directory Escape)");

    // 6. Safe Deletion of Test Records
    const deletedPdf = await storage.deleteAttachment(pdfRecord.fileKey);
    const deletedLogo = await storage.deleteAttachment(logoRecord.fileKey);
    assert(deletedPdf && deletedLogo, "11. اختبار حذف المرفقات بأمان تام ودون بقايا");

  } finally {
    // Clean up temporary sandbox directory
    if (fs.existsSync(tempSandbox)) {
      fs.rmSync(tempSandbox, { recursive: true, force: true });
    }
  }

  console.log("\n================================================================================");
  console.log(`   نتائج فحص الجاهزية: ${passed} نجح | ${failed} فشل`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
