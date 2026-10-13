/**
 * Comprehensive Attachment Security & Access Control Verification Test
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 *
 * Verifies:
 * 1. Blocking unauthenticated access to private attachments (401 Unauthorized).
 * 2. Allowing authorized users (Admin, Operations Manager, File Owner) to access files (200 OK).
 * 3. Blocking unauthorized users from accessing other users' files (403 Forbidden).
 * 4. Strict Path Traversal protection (403 Forbidden).
 * 5. Ensuring public assets (license, public templates) remain accessible without login.
 */

import http from "http";
import path from "path";
import fs from "fs";
import { app, createServerSession } from "../server-core";
import { attachmentStorage } from "../server/storage/attachmentStorage";

interface TestReportItem {
  id: number;
  description: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes: string;
}

async function makeRequest(
  serverPort: number,
  urlPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: serverPort,
      path: urlPath,
      method: "GET",
      headers
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          body: data,
          headers: res.headers
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function runAttachmentSecurityTests() {
  console.log("================================================================================");
  console.log("بدء اختبارات حماية المرفقات الخاصة والصلاحيات والمسارات العامة");
  console.log("مشروع: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address() as any;
  const port = address.port;

  const testReports: TestReportItem[] = [];

  // Setup sample test attachments
  const uploadsBase = path.join(process.cwd(), "public", "uploads");
  const testVolKey = "volunteers/2026-10/test-identity-private-doc.pdf";
  const testVolPath = path.join(uploadsBase, testVolKey);
  const testVolDir = path.dirname(testVolPath);
  if (!fs.existsSync(testVolDir)) fs.mkdirSync(testVolDir, { recursive: true });
  fs.writeFileSync(testVolPath, "%PDF-1.4 Private Volunteer Identity Document Sample");

  const testBeneficiaryKey = "beneficiaries/2026-10/test-medical-report.pdf";
  const testBeneficiaryPath = path.join(uploadsBase, testBeneficiaryKey);
  const testBeneficiaryDir = path.dirname(testBeneficiaryPath);
  if (!fs.existsSync(testBeneficiaryDir)) fs.mkdirSync(testBeneficiaryDir, { recursive: true });
  fs.writeFileSync(testBeneficiaryPath, "%PDF-1.4 Private Beneficiary Social Security Report");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated request to private volunteer attachment via /uploads
    // -------------------------------------------------------------------------
    const res1 = await makeRequest(port, `/${encodeURI(`uploads/${testVolKey}`)}`);
    testReports.push({
      id: 1,
      description: "منع المستخدم غير المسجل من الوصول المباشر إلى مرفق خاص عبر /uploads",
      expectedStatus: 401,
      actualStatus: res1.status,
      passed: res1.status === 401,
      notes: res1.status === 401 ? "تم حظر الوصول المباشر بنجاح برمز 401" : `فشل الحظر: استجاب برمز ${res1.status}`
    });

    // -------------------------------------------------------------------------
    // TEST 2: Unauthenticated request to private attachment via /api/attachments/download
    // -------------------------------------------------------------------------
    const res2 = await makeRequest(port, `/api/attachments/download/${encodeURIComponent(testVolKey)}`);
    testReports.push({
      id: 2,
      description: "منع المستخدم غير المسجل من تنزيل مرفق خاص عبر /api/attachments/download",
      expectedStatus: 401,
      actualStatus: res2.status,
      passed: res2.status === 401,
      notes: res2.status === 401 ? "تم حظر التنزيل غير المصرح بنجاح برمز 401" : `فشل الحظر: استجاب برمز ${res2.status}`
    });

    // -------------------------------------------------------------------------
    // TEST 3: Authenticated Admin access to private attachment
    // -------------------------------------------------------------------------
    const adminSession = createServerSession({ id: "mosa", role: "admin", name: "موسى" }, "admin");
    const adminHeaders = {
      "x-session-token": adminSession.token
    };

    const res3 = await makeRequest(port, `/api/attachments/download/${encodeURIComponent(testVolKey)}`, adminHeaders);
    const contentValid = res3.body.includes("Private Volunteer Identity Document Sample");
    testReports.push({
      id: 3,
      description: "سماح النظام للمسؤول الإداري العام (Admin) بالوصول للمرفق الخاص",
      expectedStatus: 200,
      actualStatus: res3.status,
      passed: res3.status === 200 && contentValid,
      notes: res3.status === 200 && contentValid 
        ? "نجح استرجاع الملف بالكامل للمسؤول المعتمد مع ترويسات الأمان" 
        : `فشل التحقق: رمز ${res3.status}`
    });

    // -------------------------------------------------------------------------
    // TEST 4: Authenticated Volunteer accessing their OWN file
    // -------------------------------------------------------------------------
    const ownVolKey = `volunteers/2026-10/vol-123-national-id.pdf`;
    const ownVolPath = path.join(uploadsBase, ownVolKey);
    fs.writeFileSync(ownVolPath, "%PDF-1.4 Personal Volunteer Card for vol-123");

    const volSession = createServerSession({ id: "vol-123", role: "volunteer", name: "أحمد المتطوع" }, "volunteer");
    const volOwnerHeaders = {
      "x-session-token": volSession.token
    };
    const res4 = await makeRequest(port, `/uploads/${ownVolKey}`, volOwnerHeaders);
    testReports.push({
      id: 4,
      description: "سماح النظام للمتطوع بالوصول إلى مستنده الخاص المرتبط بهويته",
      expectedStatus: 200,
      actualStatus: res4.status,
      passed: res4.status === 200,
      notes: res4.status === 200 ? "تم السماح لصاحب الملف بالوصول بنجاح" : `فشل: رمز ${res4.status} - تفاصيل: ${res4.body}`
    });

    // -------------------------------------------------------------------------
    // TEST 5: Unauthorized Volunteer attempting to access another beneficiary file
    // -------------------------------------------------------------------------
    const otherVolSession = createServerSession({ id: "vol-999", role: "volunteer", name: "سعيد المتطوع" }, "volunteer");
    const otherUserHeaders = {
      "x-session-token": otherVolSession.token
    };
    const res5 = await makeRequest(port, `/uploads/${testBeneficiaryKey}`, otherUserHeaders);
    testReports.push({
      id: 5,
      description: "حظر مستخدم مسجل عادي من الوصول إلى مرفق خاص بمستفيد آخر",
      expectedStatus: 403,
      actualStatus: res5.status,
      passed: res5.status === 403,
      notes: res5.status === 403 ? "تم حظر المستخدم غير المخول برمز 403" : `فشل الحظر: رمز ${res5.status}`
    });

    // -------------------------------------------------------------------------
    // TEST 6: Path Traversal prevention on /uploads
    // -------------------------------------------------------------------------
    const res6 = await makeRequest(port, `/uploads/..%2f..%2fdb.json`);
    testReports.push({
      id: 6,
      description: "حظر محاولة اجتياز المسار (Path Traversal) على مسار /uploads",
      expectedStatus: 403,
      actualStatus: res6.status,
      passed: res6.status === 403,
      notes: res6.status === 403 ? "تم رفض محاولة اجتياز المسار بنجاح برمز 403" : `فشل الحظر: رمز ${res6.status}`
    });

    // -------------------------------------------------------------------------
    // TEST 7: Path Traversal prevention on /api/attachments/download
    // -------------------------------------------------------------------------
    const res7 = await makeRequest(port, `/api/attachments/download/..%2f..%2fdb.json`);
    testReports.push({
      id: 7,
      description: "حظر محاولة اجتياز المسار (Path Traversal) على مسار /api/attachments/download",
      expectedStatus: 403,
      actualStatus: res7.status,
      passed: res7.status === 403,
      notes: res7.status === 403 ? "تم رفض اجتياز المسار بنجاح برمز 403" : `فشل الحظر: رمز ${res7.status}`
    });

    // -------------------------------------------------------------------------
    // TEST 8: Public license image remains accessible without authentication
    // -------------------------------------------------------------------------
    const licenseFileName = "license_official_1790788997771.png";
    const res8 = await makeRequest(port, `/uploads/license/${licenseFileName}`);
    testReports.push({
      id: 8,
      description: "استمرار ظهور وثيقة الترخيص الرسمية العامة للزوار دون طلب تسجيل دخول",
      expectedStatus: 200,
      actualStatus: res8.status,
      passed: res8.status === 200,
      notes: res8.status === 200 
        ? "الصورة العامة للترخيص تظهر بشكل طبيعي لعموم الزوار دون عوائق" 
        : `فشل استرجاع الترخيص العام: رمز ${res8.status}`
    });

  } finally {
    // Reset test flag
    (app as any).request.isInternalTest = false;

    // Cleanup temporary test files
    if (fs.existsSync(testVolPath)) fs.unlinkSync(testVolPath);
    if (fs.existsSync(testBeneficiaryPath)) fs.unlinkSync(testBeneficiaryPath);
    const ownVolPath = path.join(uploadsBase, `volunteers/2026-10/vol-123-national-id.pdf`);
    if (fs.existsSync(ownVolPath)) fs.unlinkSync(ownVolPath);

    server.close();
  }

  // Print results
  let allPassed = true;
  for (const item of testReports) {
    const statusIcon = item.passed ? "✔ [نجح]" : "✖ [فشل]";
    console.log(`[اختبار ${item.id}] ${statusIcon} - ${item.description}`);
    console.log(`    └─ الرمز المتوقع: ${item.expectedStatus} | الرمز الفعلي: ${item.actualStatus} | ${item.notes}`);
    if (!item.passed) allPassed = false;
  }

  console.log("\n--------------------------------------------------------------------------------");
  const passedCount = testReports.filter(r => r.passed).length;
  console.log(`النتيجة الإجمالية لاختبارات أمان المرفقات: ${passedCount}/${testReports.length} (${allPassed ? "100% نجاح تام" : "يوجد إخفاق"})`);
  console.log("--------------------------------------------------------------------------------\n");

  if (!allPassed) {
    process.exit(1);
  }
}

runAttachmentSecurityTests().catch((err) => {
  console.error("FATAL ERROR in test execution:", err);
  process.exit(1);
});
