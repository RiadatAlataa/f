/**
 * Comprehensive Storage, Concurrency, Deletion & Disaster Recovery Test Suite
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Strict Constraint: Uses 100% synthetic mock records. No real PII or production data.
 * Tests ACTUAL functions and real Express server from server-core.ts, writeLock.ts, reconcile.ts, and backupEngine.ts!
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import app, { 
  readDb, 
  writeDb, 
  mutateDb, 
  reconcileDbSnapshots, 
  reconcileRecord,
  recordDeletedEntity,
  checkRateLimit,
  createServerSession
} from "../server-core";
import { writeCoordinator } from "../server/writeLock";
import { backupEngine } from "../server/backupEngine";

async function runRealCodeTestSuite() {
  console.log("================================================================================");
  console.log("تشغيل حزمة اختبارات الأمان والتزامن المعمقة على الكود الحقيقي للمشروع");
  console.log("مشروع: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const results: Array<{ id: number; title: string; passed: boolean; details: string; isRealCode: boolean }> = [];

  // ---------------------------------------------------------------------------
  // TEST 1: Two concurrent requests mutating DIFFERENT fields in the SAME record
  // ---------------------------------------------------------------------------
  try {
    await mutateDb((db) => {
      const existing = db.volunteers.find((v: any) => v.id === "vol-test-conc-1");
      if (!existing) {
        db.volunteers.push({
          id: "vol-test-conc-1",
          fileNumber: "VFN-CONC-1",
          name: "متطوع تجريبي للتزامن",
          phone: "0500000001",
          email: "conc1@synth.org.sa",
          status: "pending",
          primaryDepartmentId: "dep-5"
        });
      }
    });

    const p1 = mutateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 15));
      const vol = db.volunteers.find((v: any) => v.id === "vol-test-conc-1");
      if (vol) vol.phone = "0599999999";
    });

    const p2 = mutateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 10));
      const vol = db.volunteers.find((v: any) => v.id === "vol-test-conc-1");
      if (vol) {
        vol.email = "updated_conc1@synth.org.sa";
        vol.status = "active";
      }
    });

    await Promise.all([p1, p2]);

    const finalDb = readDb();
    const finalVol = finalDb.volunteers.find((v: any) => v.id === "vol-test-conc-1");
    const passed = !!(
      finalVol &&
      finalVol.phone === "0599999999" &&
      finalVol.email === "updated_conc1@synth.org.sa" &&
      finalVol.status === "active"
    );

    results.push({
      id: 1,
      title: "تزامن حقيقي: طلبان يعدلان حقلين مختلفين في نفس السجل مع حفظ التعديلين معًا",
      passed,
      details: passed ? `تم حفظ التعديلين معًا بدقة (الهاتف: ${finalVol?.phone}، البريد: ${finalVol?.email}، الحالة: ${finalVol?.status})` : "فشل: ضاع أحد الحقول في التنافس",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 1, title: "طلبين يعدلان حقلين مختلفين", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Two concurrent requests mutating the SAME field (Deterministic Resolution)
  // ---------------------------------------------------------------------------
  try {
    const pA = mutateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 10));
      const vol = db.volunteers.find((v: any) => v.id === "vol-test-conc-1");
      if (vol) vol.status = "suspended";
    });

    const pB = mutateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 5));
      const vol = db.volunteers.find((v: any) => v.id === "vol-test-conc-1");
      if (vol) vol.status = "archived";
    });

    await Promise.all([pA, pB]);

    const finalDb = readDb();
    const finalVol = finalDb.volunteers.find((v: any) => v.id === "vol-test-conc-1");
    const passed = finalVol && (finalVol.status === "suspended" || finalVol.status === "archived");

    results.push({
      id: 2,
      title: "تزامن حقيقي: طلبان يعدلان الحقل نفسه مع حسم تسلسلي مقصود دون تلف السجل",
      passed: !!passed,
      details: passed ? `تم الحسم التسلسلي للحالة إلى: "${finalVol?.status}"` : "فشل حسم التعارض",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 2, title: "طلبين يعدلان نفس الحقل", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Deletion concurrent with mutation (Zero Zombie Records / No Resurrection)
  // ---------------------------------------------------------------------------
  try {
    await mutateDb((db) => {
      db.volunteers.push({
        id: "vol-del-conc-99",
        name: "متطوع الحذف التجريبي",
        status: "pending"
      });
    });

    const pDelete = mutateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 5));
      db.volunteers = db.volunteers.filter((v: any) => v.id !== "vol-del-conc-99");
      recordDeletedEntity(db, "vol-del-conc-99", "volunteers");
    });

    const pUpdate = mutateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 10));
      const target = db.volunteers.find((v: any) => v.id === "vol-del-conc-99");
      if (target) {
        target.notes = "محاولة تعديل متزامنة بعد الحذف";
      }
    });

    await Promise.all([pDelete, pUpdate]);

    const verifyDb = readDb();
    const stillExists = verifyDb.volunteers.some((v: any) => v.id === "vol-del-conc-99");
    const passed = !stillExists;

    results.push({
      id: 3,
      title: "تزامن وحذف: حذف سجل بالتزامن مع تعديله ومنع عودته أو انبعاثه كـ Zombie Record",
      passed,
      details: passed ? "تم الحذف بنجاح ولم يعد السجل للحياة إطلاقاً" : "فشل أمني: السجل المحذوف انبعث مجددًا!",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 3, title: "حذف متزامن ومنع عودة السجل", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Multiple concurrent additions without losing any record (15 additions)
  // ---------------------------------------------------------------------------
  try {
    const concurrentAdditions = 15;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < concurrentAdditions; i++) {
      promises.push(
        mutateDb(async (db) => {
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10)));
          db.initiatives.push({
            id: `init-test-conc-${i}`,
            title: `مبادرة تجريبية متزامنة ${i}`,
            departmentId: "dep-5"
          });
        })
      );
    }

    await Promise.all(promises);

    const checkDb = readDb();
    const foundCount = checkDb.initiatives.filter((init: any) => init.id && init.id.startsWith("init-test-conc-")).length;
    const passed = foundCount === concurrentAdditions;

    results.push({
      id: 4,
      title: "تزامن وإضافة: إضافة 15 سجل متزامن في نفس الوقت والتحقق من بقائها بالكامل",
      passed,
      details: passed ? `تم حفظ كافة السجلات الـ 15 بنجاح (${foundCount}/${concurrentAdditions}) دون فقد أي سجل` : "حدث فقدان في السجلات",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 4, title: "إضافة سجلات متزامنة متعددة", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Write arriving during backup freeze: Holds and NEVER prematurely unfreezes
  // ---------------------------------------------------------------------------
  try {
    const releaseFreeze = await writeCoordinator.acquireWriteFreeze(5000);
    let writeExecuted = false;

    // Launch mutation while frozen
    const pendingMutation = mutateDb((db) => {
      writeExecuted = true;
      db.logs.push({
        id: "log-freeze-test",
        action: "تم التنفيذ بعد رفع التجميد الحقيقي",
        timestamp: new Date().toISOString()
      });
    });

    // Check after delay: Write MUST still be blocked (no unilateral 8s unfreeze!)
    await new Promise((r) => setTimeout(r, 60));
    const heldWhileFrozen = !writeExecuted;

    // Release freeze explicitly
    releaseFreeze();

    // Now await mutation
    await pendingMutation;
    const completedAfterRelease = writeExecuted;

    const passed = heldWhileFrozen && completedAfterRelease && !writeCoordinator.getIsWriteFrozen();

    results.push({
      id: 5,
      title: "تجميد النسخ الاحتياطي: تعليق الكتابات بشكل صارم ومنع فك التجميد الأحادي أثناء استمرار النسخ",
      passed,
      details: passed ? "تم حجز الكتابة طوال فترة التجميد واكتملت بنجاح فور تحرير القفل النظامي" : "فشل تعليق الكتابة أثناء التجميد",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 5, title: "فحص تعليق الكتابة أثناء التجميد", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Snapshot timeout & Abort: Timeout aborts snapshot and NEVER reports false success
  // ---------------------------------------------------------------------------
  try {
    let abortedWithError = false;
    let partialBackupProduced = false;

    try {
      // Pass a slow async read function (60ms) with a 15ms timeout limit to test the timeout race
      const slowReadDb = async () => {
        await new Promise((r) => setTimeout(r, 60));
        return readDb();
      };
      await backupEngine.captureConsistentBundle(slowReadDb, 15);
      partialBackupProduced = true; // Should not reach here!
    } catch (err: any) {
      if (err.message.includes("exceeded maximum duration limit") || err.message.includes("aborted")) {
        abortedWithError = true;
      }
    }

    // Verify write coordinator is NOT frozen after aborted snapshot
    const freezeReleasedAfterAbort = !writeCoordinator.getIsWriteFrozen();
    const passed = abortedWithError && !partialBackupProduced && freezeReleasedAfterAbort;

    results.push({
      id: 6,
      title: "إلغاء النسخ عند انتهاء المهلة: إجهاض النسخ المتعثر فورًا ومنع إعلان نجاح كاذب لحزمة ناقصة",
      passed,
      details: passed ? "تم إجهاض عملية النسخ المتأخرة بأمان، ورفض إنتاج أي حزمة غير متسقة، وتأكيد تحرير الموارد" : "ثغرة: تم إنتاج حزمة ناقصة أو بقي الخادم معلقًا!",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 6, title: "فحص إلغاء النسخ عند انتهاء المهلة", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Attachment operation coordinator guard (Upload/Modification blocked during freeze)
  // ---------------------------------------------------------------------------
  try {
    const releaseFreeze = await writeCoordinator.acquireWriteFreeze(5000);
    let attachmentWriteCompleted = false;

    // Launch attachment operation through guard
    const pendingAttachmentWrite = writeCoordinator.guardAttachmentOperation(async () => {
      attachmentWriteCompleted = true;
      return "attachment_saved";
    });

    await new Promise((r) => setTimeout(r, 40));
    const attachmentBlockedDuringFreeze = !attachmentWriteCompleted;

    releaseFreeze();
    await pendingAttachmentWrite;
    const attachmentCompletedAfterRelease = attachmentWriteCompleted;

    const passed = attachmentBlockedDuringFreeze && attachmentCompletedAfterRelease;

    results.push({
      id: 7,
      title: "أمان المرفقات الفيزيائية: حظر رفع وتعديل المرفقات أثناء التجميد لضمان التطابق التام",
      passed,
      details: passed ? "تم تعليق عمليات المرفقات أثناء التجميد واكتمالها بعد فك القفل دون تباين زمني" : "فشل حظر عمليات المرفقات أثناء التجميد",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 7, title: "فحص أمان المرفقات الفيزيائية", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Real HTTP Deletion Endpoint & Anti-Zombie Protection (Real Express API)
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const testDeptId = "dep-test-real-http-del";

    // 1. Create test department in live DB
    await mutateDb((db) => {
      db.departments.push({
        id: testDeptId,
        nameAr: "إدارة تجريبية للحذف الواقعي",
        category: "admin"
      });
    });

    // 2. Perform Real HTTP DELETE request to Express endpoint
    const deleteRes = await fetch(`http://localhost:${port}/api/departments/${testDeptId}`, {
      method: "DELETE"
    });
    const deleteJson = await deleteRes.json();

    // Verify deletion succeeded via real HTTP API
    const liveDbAfterDelete = readDb();
    const isDeletedFromLive = !liveDbAfterDelete.departments.some((d: any) => d.id === testDeptId);
    const tombstoneRecorded = liveDbAfterDelete._deletedRecordIds?.includes(testDeptId);

    // 3. Attempt to reconcile an older snapshot that still contains this deleted department
    const olderSnapshot = {
      departments: [
        {
          id: testDeptId,
          nameAr: "إدارة تجريبية للحذف الواقعي",
          category: "admin"
        }
      ]
    };

    const reconcileResult = reconcileDbSnapshots(readDb(), olderSnapshot);
    const zombieResurrected = reconcileResult.reconciledDb.departments.some((d: any) => d.id === testDeptId);

    await new Promise<void>((resolve) => server.close(() => resolve()));

    const passed = deleteRes.status === 200 && isDeletedFromLive && tombstoneRecorded && !zombieResurrected && reconcileResult.deletedPreventedCount > 0;

    results.push({
      id: 8,
      title: "تكامل HTTP الحقيقي للحذف: حذف سجل عبر مسار Express فعلي ومنع عودته عند دمج نسخة قديمة",
      passed: !!passed,
      details: passed ? `تم الحذف عبر HTTP بنجاح وحظر عودة السجل (محاولات الحظر: ${reconcileResult.deletedPreventedCount})` : "فشل: انبعث السجل المحذوف!",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 8, title: "فحص مسار الحذف الواقعي عبر HTTP", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Administrative Correction of Sensitive Field (nationalId / fileNumber)
  // ---------------------------------------------------------------------------
  try {
    const existingVol = {
      id: "vol-sensitive-test",
      name: "متطوع التصحيح الإداري",
      nationalId: "1000000001",
      fileNumber: "VFN-1001",
      updatedAt: "2026-10-12T10:00:00.000Z"
    };

    const correctionPatch = {
      nationalId: "1000000002", // Typo corrected
      fileNumber: "VFN-1002",
      updatedAt: "2026-10-12T11:00:00.000Z"
    };

    // Case A: Unauthorized user attempt (should be BLOCKED)
    const unauthorizedResult = reconcileRecord(existingVol, correctionPatch, {
      allowAdministrativeCorrections: false,
      userRole: "volunteer"
    });
    const unauthorizedBlocked = unauthorizedResult.merged.nationalId === "1000000001";

    // Case B: Authorized Admin attempt (should be ALLOWED)
    const authorizedResult = reconcileRecord(existingVol, correctionPatch, {
      allowAdministrativeCorrections: true,
      userRole: "admin"
    });
    const authorizedAllowed = authorizedResult.merged.nationalId === "1000000002" && authorizedResult.merged.fileNumber === "VFN-1002";

    const passed = unauthorizedBlocked && authorizedAllowed;

    results.push({
      id: 9,
      title: "تصحيح الحقول الحساسة: السماح للمسؤول المخول بتصحيح رقم الهوية والملف وحظره على غير المخول",
      passed,
      details: passed ? "تم حظر التعديل غير المصرح بنجاح، وسُمح للمسؤول الإداري بتصحيح الهوية والملف بدقة" : "فشل تطبيق سياسة الصلاحيات على الحقول الحساسة",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 9, title: "فحص تصحيح الحقول الحساسة", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 10: Intentional Clearing of Optional Fields vs Mandatory Schema Protection
  // ---------------------------------------------------------------------------
  try {
    const existingRecord = {
      id: "vol-clear-test",
      name: "اسم إلزامي للمتطوع",
      notes: "ملاحظات اختيارية سابقة",
      bio: "نبذة سابقة"
    };

    const clearPatch = {
      name: "",     // Attempt to clear mandatory field -> MUST BE BLOCKED
      notes: "",    // Intentional clearing of optional field -> MUST BE ALLOWED
      bio: null     // Intentional clearing of optional field -> MUST BE ALLOWED
    };

    const res = reconcileRecord(existingRecord, clearPatch, {
      allowClearingOptionalFields: true,
      forceOverwrite: true
    });

    const mandatoryProtected = res.merged.name === "اسم إلزامي للمتطوع";
    const optionalClearedNotes = res.merged.notes === "";
    const optionalClearedBio = res.merged.bio === null;

    const passed = mandatoryProtected && optionalClearedNotes && optionalClearedBio;

    results.push({
      id: 10,
      title: "تصفير الحقول الاختيارية: السماح بمسح الملاحظات اختياريًا مع حظر مسح الحقول الإلزامية",
      passed,
      details: passed ? "تم مسح الحقول الاختيارية عمدًا مع حماية الحقول الإلزامية (الاسم) من التفريغ" : "فشل في التمييز بين الحقول الإلزامية والاختيارية",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 10, title: "فحص تصفير الحقول الاختيارية", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 11: Granular Field Merging: Untimestamped or older snapshots do not overwrite live data
  // ---------------------------------------------------------------------------
  try {
    const liveTargetDb = JSON.parse(JSON.stringify(readDb()));
    const targetVolunteer = {
      id: "vol-reconcile-test-1",
      name: "متطوع الدمج الذكي",
      phone: "0599999999", // Freshly updated phone in live DB
      email: "fresh@synth.org.sa",
      updatedAt: "2026-10-12T12:00:00.000Z"
    };
    liveTargetDb.volunteers.push(targetVolunteer);

    // Stale snapshot with NO timestamp or older timestamp attempting to overwrite phone
    const staleIncomingDb = {
      departments: [],
      volunteers: [
        {
          id: "vol-reconcile-test-1",
          name: "متطوع الدمج الذكي",
          phone: "0500000000", // Stale old phone!
          email: "fresh@synth.org.sa"
          // Missing updatedAt!
        }
      ]
    };

    const reconcileRes = reconcileDbSnapshots(liveTargetDb, staleIncomingDb);
    const resolvedVol = reconcileRes.reconciledDb.volunteers.find((v: any) => v.id === "vol-reconcile-test-1");

    // Live phone MUST be protected
    const preservedPhone = resolvedVol && resolvedVol.phone === "0599999999";

    results.push({
      id: 11,
      title: "حماية البيانات الحية: منع النسخ الواردة فاقدة الطوابع الزمنية من التغلب على البيانات الحية",
      passed: !!preservedPhone,
      details: preservedPhone ? "تم الحفاظ على الهاتف الأحدث (0599999999) ومنع استبداله بقيمة قديمة فاقدة للتاريخ" : "فشل حماية البيانات الحية",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 11, title: "فحص حماية البيانات الحية", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 12: Storage failure: Invalid data payload is refused without false success
  // ---------------------------------------------------------------------------
  try {
    const invalidPayload1 = null;
    const invalidPayload2 = { invalidObject: true };

    const res1 = writeDb(invalidPayload1);
    const res2 = writeDb(invalidPayload2);

    const passed = res1 === false && res2 === false;

    results.push({
      id: 12,
      title: "فشل التخزين: رفض الحمولات غير الصالحة وإرجاع false دون تزييف حالة الحفظ",
      passed,
      details: passed ? "تم حظر الحمولات التالفة بنجاح وإرجاع false دون مساس بقاعدة البيانات" : "تم الإبلاغ الخاطئ عن نجاح كتابة غير صالحة",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 12, title: "فحص رفض الحمولات غير الصالحة", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 13: Security: Path Traversal / Zip-Slip strict rejection in backupEngine
  // ---------------------------------------------------------------------------
  try {
    const testKey = crypto.randomBytes(32).toString("hex");
    const maliciousBundle = {
      formatVersion: "2.0",
      backupId: "malicious_check",
      timestamp: new Date().toISOString(),
      association: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      database: readDb(),
      postgresSnapshot: {},
      postgresMode: "not_configured",
      attachments: [
        {
          relativePath: "../../server.ts",
          contentBase64: Buffer.from("MALICIOUS").toString("base64"),
          sha256: crypto.createHash("sha256").update(Buffer.from("MALICIOUS")).digest("hex")
        }
      ]
    };

    const metadata = {
      backupId: "malicious_check",
      schemaVersion: "2.0",
      timestamp: new Date().toISOString(),
      association: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
      watermark: "2026-10-12T00:00:00Z",
      recordCounts: { volunteers: 1 },
      attachmentsCount: 1,
      sha256Plain: crypto.createHash("sha256").update(JSON.stringify(maliciousBundle)).digest("hex")
    };

    const envelope = backupEngine.encryptBundle(maliciousBundle, metadata, testKey);

    let blocked = false;
    try {
      await backupEngine.testIsolatedRestore(envelope, testKey);
    } catch (err: any) {
      if (err.message.includes("Security validation failed")) {
        blocked = true;
      }
    }

    results.push({
      id: 13,
      title: "أمان المرفقات: حظر استخراج المسارات الخبيثة (../../server.ts) ورفض الهروب من المجلد",
      passed: blocked,
      details: blocked ? "تم اكتشاف المسار الخبيث وحظره بأمان دون إنشاء أي ملفات خارج الـ Sandbox" : "ثغرة أمنية: لم يتم حظر المسار الخبيث!",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 13, title: "فحص حظر مسارات المرفقات الخبيثة", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 14: HTTP Integration: Protected admin backup endpoints require authorization (401)
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res1 = await fetch(`http://localhost:${port}/api/admin/backup/r2/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const res2 = await fetch(`http://localhost:${port}/api/admin/backup/r2/dry-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const passed = res1.status === 401 && res2.status === 401;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 14,
      title: "تكامل HTTP الحقيقي: مسارات النسخ والاستعادة ترفض الطلبات غير المصرح بها برمز 401",
      passed,
      details: passed ? `تم التحقق عبر خادم HTTP حقيقي: مسار trigger أعاد (${res1.status}) ومسار dry-run أعاد (${res2.status})` : "فشل حظر المسارات المحمية",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 14, title: "فحص حماية مسارات HTTP الحقيقية", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 15: Header Spoofing Rejection: Client header x-user-role cannot bypass auth (401)
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    // Attacker tries sending x-user-role: admin without a valid server session token
    const resSpoof = await fetch(`http://localhost:${port}/api/db/volunteers/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
        "x-user-id": "attacker-spoofed-admin"
      },
      body: JSON.stringify({ name: "متطوع غير مصرح به", nationalId: "1111111111" })
    });

    const passed = resSpoof.status === 401;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 15,
      title: "منع تزييف الصلاحيات: رفض تزييف x-user-role أو x-user-id دون جلسة برمز 401",
      passed,
      details: passed 
        ? `تم حظر محاولة التزييف بنجاح برمز (${resSpoof.status}) ومنع ترقية الصلاحيات دون جلسة خادمة صالحة`
        : `ثغرة أمنية: تم قبول الرأس المزيف برمز (${resSpoof.status})!`,
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 15, title: "فحص حظر تزييف الصلاحيات", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 16: Input Validation: Rejection of invalid national IDs and short names
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    // 1. Invalid national ID (not 10 digits)
    const resBadId = await fetch(`http://localhost:${port}/api/db/volunteerApplications/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "محمد أحمد علي التجريبي",
        nationalId: "12345", // Only 5 digits
        phone: "0555555555"
      })
    });

    // 2. Short name (less than 3 chars)
    const resShortName = await fetch(`http://localhost:${port}/api/db/beneficiaries/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "أ",
        nationalId: "1098765432",
        phone: "0555555555"
      })
    });

    const passed = resBadId.status === 400 && resShortName.status === 400;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 16,
      title: "التحقق من صحة المدخلات: رفض الهويات غير الصالحة والأسماء الناقصة خادمياً",
      passed,
      details: passed
        ? "تم رفض الهوية غير المكتملة (400) والاسم القصير (400) بنجاح على الخادم"
        : "فشل التحقق من صحة المدخلات",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 16, title: "فحص التحقق من صحة المدخلات", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 17: Concurrent Registration Duplicate Prevention (Atomic mutateDb)
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const payload = {
      fullName: "متطوع متزامن تجريبي",
      nationalId: "1999999991",
      phone: "0591112233",
      email: "conc_reg_test_unique@synth.org.sa",
      opportunityId: "init-conc-dup-test"
    };

    // First setup the initiative
    await mutateDb((db) => {
      db.initiatives = db.initiatives || [];
      if (!db.initiatives.find((i: any) => i.id === "init-conc-dup-test")) {
        db.initiatives.push({
          id: "init-conc-dup-test",
          name: "مبادرة فحص التسجيل المتزامن",
          neededCount: 5,
          acceptedVolunteerIds: []
        });
      }
    });

    // Launch two identical concurrent application submissions
    const [req1, req2] = await Promise.all([
      fetch(`http://localhost:${port}/api/db/volunteerApplications/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }),
      fetch(`http://localhost:${port}/api/db/volunteerApplications/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    ]);

    const statuses = [req1.status, req2.status];
    // Exactly one should succeed (200), and the duplicate should be rejected (400)
    const oneSuccessOneDuplicate = statuses.includes(200) && statuses.includes(400);

    // Verify database only has 1 record
    const db = readDb();
    const appCount = (db.volunteerApplications || []).filter((a: any) => a.nationalId === "1999999991").length;

    const passed = oneSuccessOneDuplicate && appCount === 1;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 17,
      title: "منع التكرار المتزامن: حظر إنشاء حسابات مكررة تحت الطلبات المتزامنة الذرية",
      passed,
      details: passed
        ? `نجح طلب واحد برمز (${200}) ورُفض الطلب المتزامن المكرر برمز (${400}) وسجلت قاعدة البيانات نسخة واحدة فقط`
        : `فشل الحظر: استجابات (${statuses.join(", ")}) وعدد السجلات (${appCount})`,
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 17, title: "فحص منع التكرار المتزامن", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 18: Role Escalation Prevention on Registration: Reject admin/staff self-creation
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    // Attacker tries to create an 'admin' or 'operations_manager' account via registration
    const resEscalate = await fetch(`http://localhost:${port}/api/db/auth/google/complete-registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: "admin", // FORBIDDEN! Only volunteer or beneficiary
        googleEmail: "escalation_attempt@synth.org.sa",
        name: "مهاجم ترقية الصلاحيات",
        nationalId: "1999999992",
        phone: "0590001122",
        agreedToTerms: true
      })
    });

    const passed = resEscalate.status === 403;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 18,
      title: "منع التلاعب بالصلاحيات: رفض إنشاء حسابات إدارية ذاتياً وحظر الترقية برمز 403",
      passed,
      details: passed
        ? "تم حظر محاولة إنشاء حساب إداري برمز (403) وحصر التسجيل الذاتي بالمتطوع والمستفيد فقط"
        : `ثغرة: استجابة الخادم كانت (${resEscalate.status})!`,
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 18, title: "فحص منع التلاعب بالصلاحيات", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 19: User Enumeration Defense on Forgot Password
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    // Query for a non-existent email
    const resGhost = await fetch(`http://localhost:${port}/api/db/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "non_existent_ghost_99999@synth.org.sa" })
    });

    const ghostJson = await resGhost.json();
    // Must return 200 with generic success message, NOT 404 or revealing error
    const passed = resGhost.status === 200 && ghostJson.status === "success" && ghostJson.message.includes("إذا كان المعرّف المدخل مسجلاً");
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 19,
      title: "حماية الخصوصية ومنع حصر الحسابات: عدم كشف وجود البريد الإلكتروني في استعادة المرور",
      passed,
      details: passed
        ? "أعاد الخادم استجابة عامة موحدة ومحايدة (200 success) تمنع المخترقين من التحقق من وجود الحسابات"
        : "فشل: تم تسريب حالة وجود الحساب في النظام!",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 19, title: "فحص منع حصر الحسابات", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 20: Rate Limiting: Protection against Brute Force Attacks (HTTP 429)
  // ---------------------------------------------------------------------------
  try {
    // Test Rate Limiter unit functionality directly
    const testKey = "192.168.1.99:rate-test-brute";
    let wasLimited = false;
    let retrySec = 0;

    for (let i = 0; i < 15; i++) {
      const check = checkRateLimit('login', testKey, 5, 60000); // 5 max requests
      if (!check.allowed) {
        wasLimited = true;
        retrySec = check.retryAfterSec || 0;
        break;
      }
    }

    const passed = wasLimited && retrySec > 0;
    results.push({
      id: 20,
      title: "تحديد معدل الطلبات (Rate Limiting): حظر التخمين الآلي والهجمات المتكررة برمز 429",
      passed,
      details: passed
        ? `تم حظر المحاولات المتكررة بنجاح بعد استنفاد الحد وتحديد مهلة إعادة المحاولة (${retrySec} ثانية)`
        : "فشل تحديد معدل الطلبات",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 20, title: "فحص تحديد معدل الطلبات", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 21: Google ID Token Rejection: Reject invalid / forged tokens
  // ---------------------------------------------------------------------------
  try {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const resForged = await fetch(`http://localhost:${port}/api/db/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "forged.invalid.token.payload" })
    });

    const passed = resForged.status === 401;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    results.push({
      id: 21,
      title: "أمان تسجيل دخول Google: رفض الرموز المزورة وغير الموثقة برمز 401",
      passed,
      details: passed
        ? "تم رفض الرمز المزور بنجاح برمز (401) ومنع الدخول دون توثيق رسمي من خوادم Google"
        : `فشل: تم قبول الرمز برمز (${resForged.status})`,
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 21, title: "فحص أمان رموز Google", passed: false, details: err.message, isRealCode: true });
  }

  // ---------------------------------------------------------------------------
  // TEST 22: Clean rollback: Restore baseline memory state to keep tests non-polluting
  // ---------------------------------------------------------------------------
  try {
    await mutateDb((db) => {
      db.volunteers = db.volunteers.filter((v: any) => !v.id || (!v.id.includes("test-conc") && !v.id.includes("reconcile-test") && !v.id.includes("clear-test") && !v.id.includes("sensitive-test") && !v.id.includes("conc-dup")));
      db.volunteerApplications = (db.volunteerApplications || []).filter((a: any) => a.nationalId !== "1999999991");
      db.beneficiaries = (db.beneficiaries || []).filter((b: any) => b.nationalId !== "1999999991" && b.nationalId !== "1999999992");
      db.initiatives = db.initiatives.filter((init: any) => !init.id || (!init.id.startsWith("init-test-conc-") && init.id !== "init-conc-dup-test"));
      db.departments = db.departments.filter((d: any) => !d.id || !d.id.includes("real-http-del"));
      db.logs = db.logs.filter((l: any) => l.id !== "log-freeze-test" && !l.user?.includes("متزامن"));
      if (Array.isArray(db._deletedRecordIds)) {
        db._deletedRecordIds = db._deletedRecordIds.filter((id: string) => !id.includes("real-http-del") && !id.includes("del-conc"));
      }
      if (db._deletedTombstones) {
        delete db._deletedTombstones["dep-test-real-http-del"];
        delete db._deletedTombstones["vol-del-conc-99"];
      }
    });

    const passed = true;
    results.push({
      id: 22,
      title: "نظافة البيئة: تنظيف السجلات التجريبية وإعادة الحالة الأصلية دون تلويث الذاكرة",
      passed,
      details: "تم تنظيف كافة السجلات التجريبية وإعادة قاعدة البيانات لحالتها المعتمدة بنجاح",
      isRealCode: true
    });
  } catch (err: any) {
    results.push({ id: 22, title: "تنظيف البيئة التجريبية", passed: false, details: err.message, isRealCode: true });
  }

  console.log("================================================================================");
  console.log("النتائج الفعلية لتشغيل حزمة الاختبارات على الكود الحقيقي:");
  console.log("================================================================================");
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? "PASSED [نجح]" : "FAILED [فشل]";
    const codeType = r.isRealCode ? "[تنفيذ حقيقي]" : "[محاكاة]";
    console.log(`[الاختبار ${r.id.toString().padStart(2, " ")}] ${mark} ${codeType} - ${r.title}`);
    console.log(`    └─ التفاصيل: ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log("================================================================================");
  console.log(`النتيجة الإجمالية: ${allPassed ? "نجحت جميع الاختبارات بنسبة 100% (" + results.length + "/" + results.length + ")" : "توجد اختبارات لم تنجح"}`);
  console.log("================================================================================\n");

  if (!allPassed) process.exit(1);
}

runRealCodeTestSuite().catch((err) => {
  console.error("Critical test runner failure:", err);
  process.exit(1);
});
