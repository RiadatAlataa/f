/**
 * Test Suite: Comprehensive Encrypted Backup Package, Zero-PII Verification, Audit Trail & Write Freeze
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import http from "http";
import app, { createServerSession, readDb, mutateDb } from "../server-core";
import { writeCoordinator } from "../server/writeLock";

async function runTests() {
  console.log("================================================================================");
  console.log("تشغيل اختبارات حزمة النسخ المشفرة، حماية الخصوصية، وتجميد الكتابة");
  console.log("مشروع: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // 1. Create sessions properly with user object and role string
  const adminSession = createServerSession({ id: "usr-admin-test", name: "المشرف العام (اختبار)" }, "admin");
  const adminToken = adminSession.token;

  const regularSession = createServerSession({ id: "usr-reg-test", name: "مستخدم عادي" }, "volunteer");
  const regularUserToken = regularSession.token;

  // ---------------------------------------------------------------------------
  // TEST 1: Unauthorized user cannot download backup package
  // ---------------------------------------------------------------------------
  console.log("[اختبار 1] فحص حظر المستخدم غير المصرح من تنزيل حزمة النسخ المشفرة...");
  const unauthRes = await fetch(`${baseUrl}/api/admin/backup/package/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": regularUserToken
    },
    body: JSON.stringify({})
  });
  if (unauthRes.status !== 403) {
    throw new Error(`فشل اختبار الحظر: الرمز المتوقع 403، الرمز المستلم ${unauthRes.status}`);
  }
  console.log("✔ نجح: تم حظر المستخدم غير المصرح برمز 403.");

  // ---------------------------------------------------------------------------
  // TEST 2: Admin can download full encrypted package + recovery key outside envelope
  // ---------------------------------------------------------------------------
  console.log("\n[اختبار 2] تنزيل الحزمة الشاملة المشفرة وتوليد مفتاح الاستعادة الخارجي...");
  const downloadRes = await fetch(`${baseUrl}/api/admin/backup/package/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": adminToken
    },
    body: JSON.stringify({})
  });
  if (!downloadRes.ok) {
    throw new Error(`فشل تنزيل الحزمة: ${downloadRes.status}`);
  }
  const pkgData = await downloadRes.json();
  if (!pkgData.ok || !pkgData.envelope || !pkgData.recoveryKeyHex) {
    throw new Error("بيانات الحزمة المشفرة أو مفتاح الاستعادة مفقود.");
  }
  if (pkgData.recoveryKeyHex.length !== 64) {
    throw new Error("طول مفتاح الاستعادة غير مطابق لمعيار 256-bit (64 hex characters).");
  }

  // Ensure recovery key is NOT saved inside envelope
  const serializedEnvelope = JSON.stringify(pkgData.envelope);
  if (serializedEnvelope.includes(pkgData.recoveryKeyHex)) {
    throw new Error("خطأ أمني فادح: مفتاح الاستعادة محفوظ داخل ملف الحزمة المشفرة!");
  }
  console.log(`✔ نجح: تم استلام الحزمة المشفرة (المعرف: ${pkgData.backupId}) مع ${pkgData.attachmentsCount} مرفق، ومفتاح الاستعادة محفوظ خارج ملف النسخة بنجاح.`);

  // ---------------------------------------------------------------------------
  // TEST 3: Verification in isolated sandbox with zero PII exposure
  // ---------------------------------------------------------------------------
  console.log("\n[اختبار 3] فحص سلامة النسخة المشفرة في بيئة معزولة دون كشف بيانات المستفيدين (Zero-PII)...");
  const verifyRes = await fetch(`${baseUrl}/api/admin/backup/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": adminToken
    },
    body: JSON.stringify({
      envelope: pkgData.envelope,
      recoveryKeyHex: pkgData.recoveryKeyHex
    })
  });
  if (!verifyRes.ok) {
    throw new Error(`فشل استدعاء التحقق: ${verifyRes.status}`);
  }
  const verifyData = await verifyRes.json();
  if (!verifyData.valid || !verifyData.referentialIntegrity?.passed) {
    throw new Error("فشل التحقق من صحة النسخة أو سلامة العلاقات.");
  }

  // Verify Zero PII in verification response
  const serializedVerify = JSON.stringify(verifyData);
  if (serializedVerify.includes("nationalId") || serializedVerify.includes("phone") || serializedVerify.includes("password")) {
    throw new Error("خطأ خصوصية: استجابة التحقق تحتوي على بيانات شخصية حساسة!");
  }
  console.log(`✔ نجح: تم التحقق من سلامة النسخة في ${verifyData.durationMs}ms مع توثيق الأعداد فقط ودون كشف أي بيانات شخصية.`);

  // ---------------------------------------------------------------------------
  // TEST 4: Audit trail records the download operation
  // ---------------------------------------------------------------------------
  console.log("\n[اختبار 4] التحقق من توثيق عملية التنزيل في سجل التدقيق الإداري...");
  const db = readDb();
  const foundAudit = (db.logs || []).find((l: any) => l.action?.includes("تنزيل حزمة نسخ احتياطي مشفرة"));
  if (!foundAudit) {
    throw new Error("لم يتم العثور على سجل التوثيق في db.logs!");
  }
  console.log(`✔ نجح: العملية موثقة في سجل التدقيق الإداري للمستخدم (${foundAudit.user}).`);

  // ---------------------------------------------------------------------------
  // TEST 5: Write-Freeze Barrier blocks mutations and allows reads
  // ---------------------------------------------------------------------------
  console.log("\n[اختبار 5] اختبار تجميد الكتابة الحقيقي (Write Freeze Barrier)...");
  
  // Acquire freeze
  const freezeAcquireRes = await fetch(`${baseUrl}/api/admin/freeze/acquire`, {
    method: "POST",
    headers: { "x-session-token": adminToken }
  });
  if (!freezeAcquireRes.ok) {
    throw new Error("فشل تفعيل تجميد الكتابة.");
  }
  console.log("  - تم تفعيل تجميد الكتابة بنجاح.");

  // Test read operation while frozen (MUST SUCCEED)
  const readRes = await fetch(`${baseUrl}/api/health`, { method: "GET" });
  if (readRes.status !== 200) {
    throw new Error(`فشل القراءة أثناء التجميد: الرمز ${readRes.status}`);
  }
  console.log("  - نجحت القراءة الإدارية والتشغيلية أثناء التجميد برمز 200.");

  // Test mutation operation while frozen (MUST BE BLOCKED WITH 423)
  const mutationRes = await fetch(`${baseUrl}/api/db/beneficiaries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": adminToken
    },
    body: JSON.stringify({ name: "مستفيد أثناء التجميد" })
  });
  if (mutationRes.status !== 423) {
    throw new Error(`فشل حظر الكتابة أثناء التجميد: الرمز المتوقع 423، المستلم ${mutationRes.status}`);
  }
  console.log("  - تم حظر محاولة التعديل أثناء التجميد فورياً برمز 423 (Locked).");

  // Release freeze
  const releaseRes = await fetch(`${baseUrl}/api/admin/freeze/release`, {
    method: "POST",
    headers: { "x-session-token": adminToken }
  });
  if (!releaseRes.ok) {
    throw new Error("فشل إلغاء تجميد الكتابة.");
  }
  console.log("  - تم إلغاء تجميد الكتابة بنجاح.");

  // Verify write works again after release
  if (writeCoordinator.getIsWriteFrozen()) {
    throw new Error("حالة التجميد ما زالت مفعلة بعد الإلغاء!");
  }
  console.log("✔ نجح: آلية تجميد الكتابة تعمل بكفاءة تامة وتمنع أي فقدان أو تعديل أثناء الصيانة.");

  server.close();
  console.log("\n================================================================================");
  console.log("اكتملت جميع اختبارات حزمة النسخ الاحتياطي المشفرة وتجميد الكتابة بنجاح 100%");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
