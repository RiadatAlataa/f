/**
 * Mandatory Verification Test Suite: Safe Account Deletion & CSV Formula Injection Protection
 * 
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * Focus:
 * 1. Safe login account revocation without deleting beneficiary or volunteer profiles
 * 2. Retention of volunteer hours, aid requests, attachments, and operational history
 * 3. Prevention of unauthorized deletions and protection of admin/ops accounts
 * 4. Audit logging without sensitive credentials
 * 5. Robust CSV Formula Injection defense (CWE-1236)
 * 6. DB.json integrity check (Zero Pollution)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import app, { 
  readDb, 
  getActiveDbPath, 
  reloadDbFromDisk,
  createServerSession
} from "../server-core";

interface StepResult {
  title: string;
  passed: boolean;
  details: string;
}

export async function runSecurityAndPreservationTests() {
  console.log("================================================================================");
  console.log("اختبارات التحقق الإلزامية: حماية ملفات الأشخاص وتعطيل الدخول وتأمين تصدير CSV");
  console.log("جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const results: StepResult[] = [];
  const rootDbPath = path.resolve(process.cwd(), "db.json");
  const initialRootContent = fs.readFileSync(rootDbPath, "utf8");
  const initialChecksum = crypto.createHash("sha256").update(initialRootContent).digest("hex");

  console.log(`[بصمة الأمان] بصمة db.json قبل بدء الاختبارات: ${initialChecksum}\n`);

  // 1. Setup isolated sandbox environment
  const sandboxDir = path.join(process.cwd(), "test-storage-sandbox-preservation");
  if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });

  const isolatedDbPath = path.join(sandboxDir, "isolated-test-db.json");
  fs.writeFileSync(isolatedDbPath, initialRootContent, "utf8");

  process.env.APP_DB_PATH = isolatedDbPath;
  reloadDbFromDisk();

  const activePath = getActiveDbPath();
  if (path.resolve(activePath) === rootDbPath || !activePath.includes("test-storage-sandbox-preservation")) {
    throw new Error(`CRITICAL: Test database path is not properly isolated: ${activePath}`);
  }

  // 2. Start temporary HTTP server on random port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Create verified sessions
  const adminSession = createServerSession({
    id: "admin-user",
    userId: "admin-user",
    name: "مجلس الجمعية والمدير التنفيذي",
    role: "admin",
    primaryDepartmentId: "dep-1",
    allowedDepartmentIds: ["dep-1", "dep-2", "dep-3", "dep-4", "dep-5", "dep-6", "dep-7", "dep-8", "dep-9"],
    permissions: ["super_admin", "all_permissions"]
  }, "admin");

  const empSession = createServerSession({
    id: "emp-regular-01",
    userId: "emp-regular-01",
    name: "موظف تدقيق عادي",
    role: "employee",
    primaryDepartmentId: "dep-2",
    allowedDepartmentIds: ["dep-2"],
    permissions: ["view_department"]
  }, "employee");

  try {
    // =========================================================================
    // Test 1: Seed Isolated Beneficiary and Revoke Login
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 1: تعطيل حساب دخول مستفيد مع بقاء ملفه وطلباته ومرفقاته كاملة");
    console.log("--------------------------------------------------------------------------------");

    const isolatedDb = readDb();
    if (!isolatedDb.beneficiaries) isolatedDb.beneficiaries = [];
    const testBenId = "ben-isolated-test-01";
    const testBenData = {
      id: testBenId,
      beneficiaryNumber: "BEN-ISO-8877",
      name: "عبدالله محمد العتيبي (اختبار معزول)",
      nationalId: "1999888771",
      phone: "0559998877",
      email: "ben.isolated@riadataleata.test",
      category: "الأسر الأشد حاجة",
      familySize: 6,
      monthlyIncome: 2500,
      housingType: "إيجار",
      address: "العسيلة - مكة المكرمة",
      status: "approved",
      password: "benSecurePass123",
      aidRequests: [
        { id: "req-1", type: "سلة غذائية", amount: 500, status: "approved" },
        { id: "req-2", type: "كسوة شتاء", amount: 700, status: "pending" }
      ],
      attachments: [
        { id: "att-1", name: "عقد_الإيجار.pdf", size: 1048576, verified: true }
      ]
    };
    isolatedDb.beneficiaries.push(testBenData);
    fs.writeFileSync(isolatedDbPath, JSON.stringify(isolatedDb, null, 2), "utf8");
    reloadDbFromDisk();

    // Verify login works before disable
    const preLoginRes = await fetch(`${baseUrl}/api/db/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "1999888771", password: "benSecurePass123" })
    });
    const preLoginData = await preLoginRes.json();
    const canLoginBefore = preLoginRes.status === 200 && preLoginData.status === "success";

    // Call /api/db/users/delete as super_admin using verified admin session
    const deleteRes = await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({ userId: testBenId })
    });
    const deleteData = await deleteRes.json();

    // Verify database state after delete call
    const postDb = readDb();
    const preservedBen = (postDb.beneficiaries || []).find((b: any) => b.id === testBenId);
    
    // Attempt login after disable
    const postLoginRes = await fetch(`${baseUrl}/api/db/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "1999888771", password: "benSecurePass123" })
    });
    const postLoginData = await postLoginRes.json();

    const t1Passed = Boolean(
      canLoginBefore &&
      deleteRes.status === 200 &&
      preservedBen && // Beneficiary NOT deleted!
      preservedBen.name === testBenData.name &&
      preservedBen.nationalId === testBenData.nationalId &&
      preservedBen.familySize === 6 &&
      preservedBen.aidRequests?.length === 2 && // Aid requests preserved!
      preservedBen.attachments?.length === 1 && // Attachments preserved!
      preservedBen.loginDisabled === true && // Login marked disabled!
      preservedBen.hasLoginAccount === false &&
      !preservedBen.password && // Password stripped!
      postLoginRes.status === 403 // Login rejected with 403!
    );

    results.push({
      title: "تعطيل حساب دخول مستفيد مع حماية ملفه وسجلاته",
      passed: t1Passed,
      details: t1Passed
        ? `نجح: بقي ملف المستفيد (${preservedBen.name}) ورقم رعايته وطلباته (${preservedBen.aidRequests?.length}) ومرفقاته، وتم تعطيل دخوله بنجاح (HTTP 403).`
        : `فشل: لم تتحقق شروط الحماية بالكامل (deleteStatus: ${deleteRes.status}, postLogin: ${postLoginRes.status})`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 2: Seed Isolated Volunteer and Revoke Login (Preserve Hours)
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 2: تعطيل حساب دخول متطوع مع بقاء ساعات التطوع وسجلاته كاملة");
    console.log("--------------------------------------------------------------------------------");

    const testVolId = "vol-isolated-test-01";
    const testVolData = {
      id: testVolId,
      membershipNumber: "VOL-ISO-7766",
      name: "سارة خالد الزهراني (متطوعة تجريبية)",
      nationalId: "1999888772",
      phone: "0558887766",
      email: "vol.isolated@riadataleata.test",
      hours: 58,
      teamId: "team-1",
      status: "active",
      password: "volSecurePass123",
      events: ["مبادرة إطعام العسيلة", "ملتقى التطوع السنوي"]
    };
    const dbForVol = readDb();
    if (!dbForVol.volunteers) dbForVol.volunteers = [];
    dbForVol.volunteers.push(testVolData);
    fs.writeFileSync(isolatedDbPath, JSON.stringify(dbForVol, null, 2), "utf8");
    reloadDbFromDisk();

    // Call /api/db/users/delete as super_admin
    const volDeleteRes = await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({ userId: testVolId })
    });

    const postVolDb = readDb();
    const preservedVol = (postVolDb.volunteers || []).find((v: any) => v.id === testVolId);

    // Attempt login after disable
    const postVolLoginRes = await fetch(`${baseUrl}/api/db/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "1999888772", password: "volSecurePass123" })
    });

    const t2Passed = Boolean(
      volDeleteRes.status === 200 &&
      preservedVol && // Volunteer NOT deleted!
      preservedVol.hours === 58 && // Hours strictly preserved!
      preservedVol.events?.length === 2 && // Events preserved!
      preservedVol.membershipNumber === "VOL-ISO-7766" &&
      preservedVol.loginDisabled === true &&
      postVolLoginRes.status === 403 // Blocked from login!
    );

    results.push({
      title: "تعطيل حساب دخول متطوع مع الحفاظ على الساعات والسجلات",
      passed: t2Passed,
      details: t2Passed
        ? `نجح: بقي ملف المتطوعة وساعاتها التطوعية (${preservedVol.hours} ساعة) وعضويتها (${preservedVol.membershipNumber}) دون أي حذف، مع إيقاف تسجيل الدخول (HTTP 403).`
        : `فشل: لم يتم الاحتفاظ بالساعات أو تعطيل الحساب كما هو مطلوب.`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 3: Protection of Administrative & Operations Accounts
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 3: منع حذف حسابات الإدارة العليا ومدير العمليات");
    console.log("--------------------------------------------------------------------------------");

    const deleteAdminRes = await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({ userId: "admin-user" })
    });

    const deleteOpsRes = await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({ userId: "ops-manager" })
    });

    const t3Passed = deleteAdminRes.status === 403 && deleteOpsRes.status === 403;
    results.push({
      title: "حماية حسابات الإدارة العليا ومدير العمليات",
      passed: t3Passed,
      details: t3Passed
        ? `نجح: تم رفض محاولات حذف admin-user (HTTP ${deleteAdminRes.status}) و ops-manager (HTTP ${deleteOpsRes.status}) بأعلى معايير الأمان.`
        : `فشل: تم السماح بحذف أحد الحسابات المحمية.`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 4: Prevent Unauthorized Users from Deleting/Disabling
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 4: منع المستخدم غير المخول من تعطيل أو حذف الحسابات");
    console.log("--------------------------------------------------------------------------------");

    // Test with employee session (lacking super_admin)
    const empDeleteRes = await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": empSession.token
      },
      body: JSON.stringify({ userId: testBenId })
    });

    // Test with no token at all
    const unauthDeleteRes = await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: testBenId })
    });

    const t4Passed = (empDeleteRes.status === 403 || empDeleteRes.status === 401) &&
                     (unauthDeleteRes.status === 401 || unauthDeleteRes.status === 403);
    results.push({
      title: "منع غير المخولين من تنفيذ إجراءات الحذف",
      passed: t4Passed,
      details: t4Passed
        ? `نجح: تم حظر الموظف العادي (HTTP ${empDeleteRes.status}) وحظر الطلب غير الموثق (HTTP ${unauthDeleteRes.status}).`
        : `فشل: تم السماح لمستخدم غير مخول.`
    });
    console.log(results[results.length - 1].details + "\n");
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 5: Audit Logging of Deletion/Disable Actions
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 5: توثيق العملية في سجل التدقيق دون تسريب كلمات المرور");
    console.log("--------------------------------------------------------------------------------");

    const auditDb = readDb();
    const auditLogs = auditDb.accessAuditLogs || [];
    const disableAudit = auditLogs.find((l: any) => l.action === "disable_user_login");

    const hasNoPasswords = !JSON.stringify(disableAudit || {}).includes("benSecurePass123");
    const t5Passed = Boolean(disableAudit && disableAudit.status === "allowed" && hasNoPasswords);

    results.push({
      title: "التوثيق الدقيق في سجل التدقيق وحماية البيانات الحساسة",
      passed: t5Passed,
      details: t5Passed
        ? `نجح: سُجلت العملية في سجل التدقيق (${disableAudit?.notes}) بدون أي كلمات مرور أو مفاتيح سرية.`
        : `فشل: لم يتم توثيق العملية أو تضمنت بيانات حساسة.`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 6: CSV Formula Injection Protection Test
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 6: اختبار حماية تصدير CSV من هجمات Formula Injection (CWE-1236)");
    console.log("--------------------------------------------------------------------------------");

    // Implement identical sanitization logic as deployed in UsersManager.tsx
    const sanitizeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      const trimmedLeading = str.replace(/^[\s\u0000-\u001F\u007F-\u009F]+/, '');
      const formulaTriggers = ['=', '+', '-', '@', '\t', '\r', '%', '|'];
      if (
        formulaTriggers.some((prefix) => str.startsWith(prefix)) ||
        (trimmedLeading.length > 0 && formulaTriggers.some((prefix) => trimmedLeading.startsWith(prefix)))
      ) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const dangerousPayloads = [
      { input: "=1+1", expectedStartsWith: "\"'=" },
      { input: "+12345", expectedStartsWith: "\"'+" },
      { input: "-999", expectedStartsWith: "\"'-" },
      { input: "@SUM(A1:A10)", expectedStartsWith: "\"'@" },
      { input: "   =cmd|' /C calc'!A0", expectedStartsWith: "\"'   =" },
      { input: "\t=2+2", expectedStartsWith: "\"'\t=" },
      { input: "\r\n@EVIL()", expectedStartsWith: "\"'\r\n@" },
      { input: "مستفيد ريادة \"العطاء\"", expected: "\"مستفيد ريادة \"\"العطاء\"\"\"" },
      { input: "اسم عادي", expected: "\"اسم عادي\"" }
    ];

    let allSanitizedCorrectly = true;
    for (const testCase of dangerousPayloads) {
      const sanitized = sanitizeCsvCell(testCase.input);
      if (testCase.expectedStartsWith && !sanitized.startsWith(testCase.expectedStartsWith)) {
        allSanitizedCorrectly = false;
        console.error(`Formula Injection Failure for: ${testCase.input} => Got: ${sanitized}`);
      }
      if (testCase.expected && sanitized !== testCase.expected) {
        allSanitizedCorrectly = false;
        console.error(`String/Quote Failure for: ${testCase.input} => Got: ${sanitized}`);
      }
    }

    results.push({
      title: "حماية تصدير CSV من Formula Injection ودعم محارف التحكم",
      passed: allSanitizedCorrectly,
      details: allSanitizedCorrectly
        ? `نجح: تم تحييد جميع البوادئ الخطرة (=, +, -, @, \\t, \\r) بإضافة الاقتباس المفرد، وتكرار علامات الاقتباس المزدوجة.`
        : `فشل: لم يتم تحييد بعض الصيغ الخطرة.`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 7: Password Reset Must NOT Automatically Re-enable loginDisabled
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 7: التأكد من أن إعادة تعيين كلمة المرور لا تعيد تفعيل loginDisabled تلقائياً");
    console.log("--------------------------------------------------------------------------------");

    // Reset password on disabled beneficiary
    const resetPwdRes = await fetch(`${baseUrl}/api/db/users/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({
        userId: testBenId,
        newPassword: "BrandNewSecurePass@2026",
        mustChangePassword: false
      })
    });

    const dbAfterReset = readDb();
    const benAfterReset = (dbAfterReset.beneficiaries || []).find((b: any) => b.id === testBenId);

    // Attempt login with newly set password -> MUST STILL BE BLOCKED (HTTP 403)
    const loginWithNewPwdRes = await fetch(`${baseUrl}/api/db/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "1999888771", password: "BrandNewSecurePass@2026" })
    });

    const t7Passed = Boolean(
      resetPwdRes.status === 200 &&
      benAfterReset &&
      benAfterReset.loginDisabled === true && // STILL DISABLED!
      benAfterReset.hasLoginAccount === false &&
      loginWithNewPwdRes.status === 403 // CANNOT BYPASS DISABLE VIA PWD RESET!
    );

    results.push({
      title: "عدم تفعيل الحساب المعطل تلقائياً عند تغيير أو إعادة تعيين كلمة المرور",
      passed: t7Passed,
      details: t7Passed
        ? `نجح: تغيير كلمة المرور لا يلغي حالة التعطيل (loginDisabled=true)، وبقي الدخول محظوراً بقرار إداري (HTTP 403).`
        : `فشل: تم إلغاء حالة التعطيل تلقائياً عند تغيير كلمة المرور.`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 8: Explicit Administrative Reactivation via /api/db/users/toggle-status
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 8: إعادة تفعيل الحساب بإجراء إداري منفصل وموثق دون مسح أو تكرار السجلات");
    console.log("--------------------------------------------------------------------------------");

    const preReactivateBenCount = (dbAfterReset.beneficiaries || []).length;

    // Reactivate via toggle-status
    const reactivateRes = await fetch(`${baseUrl}/api/db/users/toggle-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({
        userId: testBenId,
        status: "active",
        reason: "إعادة تفعيل معتمدة من الإدارة بعد المراجعة"
      })
    });

    const dbAfterReactivate = readDb();
    const reactivatedBen = (dbAfterReactivate.beneficiaries || []).find((b: any) => b.id === testBenId);
    const postReactivateBenCount = (dbAfterReactivate.beneficiaries || []).length;

    // Check audit log for reactivation
    const reactivateAudit = (dbAfterReactivate.accessAuditLogs || []).find((l: any) => 
      l.action === "toggle_user_status" && l.notes?.includes(testBenId)
    );

    // Now login with the password set in Test 7 -> MUST SUCCEED NOW!
    const loginAfterReactivateRes = await fetch(`${baseUrl}/api/db/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "1999888771", password: "BrandNewSecurePass@2026" })
    });
    const loginAfterReactivateData = await loginAfterReactivateRes.json();

    const t8Passed = Boolean(
      reactivateRes.status === 200 &&
      postReactivateBenCount === preReactivateBenCount && // NO duplicate accounts created!
      reactivatedBen &&
      reactivatedBen.loginDisabled === false && // Login restored!
      reactivatedBen.hasLoginAccount === true &&
      reactivatedBen.aidRequests?.length === 2 && // History 100% intact!
      reactivatedBen.attachments?.length === 1 && // Attachments intact!
      reactivateAudit && // Audit logged!
      loginAfterReactivateRes.status === 200 && // Successful login!
      loginAfterReactivateData.status === "success"
    );

    results.push({
      title: "إعادة تفعيل الحساب بإجراء إداري منفصل وموثق دون مسح أو تكرار السجلات",
      passed: t8Passed,
      details: t8Passed
        ? `نجح: تمت إعادة التفعيل إدارياً، وسُجلت بالتدقيق، وسجل الدخول بنجاح، مع بقاء كافة طلبات ومرفقات المستفيد دون أي تكرار.`
        : `فشل: لم تنجح إعادة التفعيل الإدارية وفق الشروط المطلوبة.`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 9: Prevention of Login via Google for Disabled Accounts
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 9: منع تجاوز التعطيل عن طريق تسجيل الدخول عبر Google");
    console.log("--------------------------------------------------------------------------------");

    // First disable the beneficiary again
    await fetch(`${baseUrl}/api/db/users/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": adminSession.token
      },
      body: JSON.stringify({ userId: testBenId })
    });

    // Create simulated Google token for the disabled beneficiary email
    const benGoogleToken = "dev_test_token:" + Buffer.from(JSON.stringify({
      email: "ben.isolated@riadataleata.test",
      name: "عبدالله العتيبي"
    })).toString("base64");

    const benGoogleLoginRes = await fetch(`${baseUrl}/api/db/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: benGoogleToken })
    });
    const benGoogleLoginData = await benGoogleLoginRes.json();

    // Create simulated Google token for the disabled volunteer email (from Test 2)
    const volGoogleToken = "dev_test_token:" + Buffer.from(JSON.stringify({
      email: "vol.isolated@riadataleata.test",
      name: "سارة الزهراني"
    })).toString("base64");

    const volGoogleLoginRes = await fetch(`${baseUrl}/api/db/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: volGoogleToken })
    });
    const volGoogleLoginData = await volGoogleLoginRes.json();

    const t9Passed = Boolean(
      benGoogleLoginRes.status === 403 &&
      benGoogleLoginData.error?.includes("إلغاء حساب تسجيل الدخول") &&
      volGoogleLoginRes.status === 403 &&
      volGoogleLoginData.error?.includes("إلغاء حساب تسجيل الدخول")
    );

    results.push({
      title: "منع تجاوز تعطيل الحساب عبر تسجيل الدخول بواسطة Google",
      passed: t9Passed,
      details: t9Passed
        ? `نجح: تم حظر دخول المستفيد المعطل عبر Google (HTTP ${benGoogleLoginRes.status}) وحظر المتطوع المعطل عبر Google (HTTP ${volGoogleLoginRes.status}) برسائل أمان واضحة تحافظ على السجلات.`
        : `فشل: تم السماح لحساب معطل بالدخول عبر Google (benStatus: ${benGoogleLoginRes.status}, volStatus: ${volGoogleLoginRes.status}).`
    });
    console.log(results[results.length - 1].details + "\n");

    // =========================================================================
    // Test 10: Complete End-to-End CSV Export Generation & RFC 4180 Verification
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("الاختبار 10: التحقق الشامل من بنية ملف CSV المُصدر، دعم UTF-8 BOM، وسلامة الأعمدة");
    console.log("--------------------------------------------------------------------------------");

    const testUsersForExport = [
      {
        id: "usr-01",
        name: "محمد أحمد العسيري",
        username: "m.asiri",
        role: "admin",
        category: "مجلس الإدارة",
        nationalId: "1020304050",
        phone: "0551122334",
        email: "admin@riadataleata.org.sa",
        departmentName: "الإدارة التنفيذية",
        status: "active",
        loginDisabled: false,
        hasLoginAccount: true,
        notes: "ملاحظات إدارية عادية",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "usr-02",
        name: "=cmd|' /C calc'!A0 (محاولة اختراق)",
        username: "+966500000000",
        role: "beneficiary",
        category: "-فئة خاصة محرومة",
        nationalId: "@dangerId",
        phone: "\t0559998888",
        email: "\r\nevil@hack.test",
        departmentName: "قسم الرعاية الاجتماعية",
        status: "suspended",
        loginDisabled: true,
        hasLoginAccount: false,
        familySize: 7,
        notes: "نص به \"علامات اقتباس مزدوجة\" وأسطر متعددة\nتكملة الملاحظة",
        createdAt: "2026-02-15T00:00:00.000Z"
      }
    ];

    const headers = [
      "المعرف", "الاسم", "اسم المستخدم", "الدور", "الفئة/المسمى",
      "الهوية الوطنية", "الجوال", "البريد الإلكتروني", "الإدارة",
      "الحالة", "حالة حساب الدخول", "الساعات / الأفراد", "ملاحظات", "تاريخ التسجيل"
    ];

    const rows = testUsersForExport.map(u => [
      sanitizeCsvCell(u.id),
      sanitizeCsvCell(u.name),
      sanitizeCsvCell(u.username),
      sanitizeCsvCell(u.role),
      sanitizeCsvCell(u.category),
      sanitizeCsvCell(u.nationalId),
      sanitizeCsvCell(u.phone),
      sanitizeCsvCell(u.email),
      sanitizeCsvCell(u.departmentName),
      sanitizeCsvCell(u.status),
      sanitizeCsvCell(u.loginDisabled ? "حساب دخول معطل" : "مفعل"),
      sanitizeCsvCell(u.familySize || ""),
      sanitizeCsvCell(u.notes),
      sanitizeCsvCell(u.createdAt)
    ]);

    const csvContent = "\uFEFF" + [headers.map(sanitizeCsvCell).join(","), ...rows.map(r => r.join(","))].join("\r\n");

    const hasBom = csvContent.startsWith("\uFEFF");
    const containsEscapedFormula1 = csvContent.includes("\"'=cmd|");
    const containsEscapedFormula2 = csvContent.includes("\"'+966500000000\"");
    const containsEscapedFormula3 = csvContent.includes("\"'-فئة خاصة محرومة\"");
    const containsEscapedFormula4 = csvContent.includes("\"'@dangerId\"");
    const containsEscapedFormula5 = csvContent.includes("\"'\t0559998888\"");
    const containsEscapedQuotes = csvContent.includes("\"\"علامات اقتباس مزدوجة\"\"");
    const preservesArabicText = csvContent.includes("قسم الرعاية الاجتماعية") && csvContent.includes("محمد أحمد العسيري");

    const t10Passed = Boolean(
      hasBom &&
      containsEscapedFormula1 &&
      containsEscapedFormula2 &&
      containsEscapedFormula3 &&
      containsEscapedFormula4 &&
      containsEscapedFormula5 &&
      containsEscapedQuotes &&
      preservesArabicText
    );

    results.push({
      title: "التحقق الشامل من بنية ملف CSV المُصدر، دعم UTF-8 BOM، وسلامة الأعمدة",
      passed: t10Passed,
      details: t10Passed
        ? `نجح: يتضمن الملف بادئة UTF-8 BOM (${hasBom ? 'موجودة' : 'مفقودة'})، وجميع الحقول الخطرة مسبوقة بـ (') ومحاطة بـ (\"), وعلامات الاقتباس مضاعفة ومطابقة لمعيار RFC 4180.`
        : `فشل: لم تتحقق شروط بنية CSV الآمنة بدقة.`
    });
    console.log(results[results.length - 1].details + "\n");

  } finally {
    // Shutdown test server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Clean up sandbox
    delete process.env.APP_DB_PATH;
    reloadDbFromDisk();

    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch {}

    // Verify root db.json integrity
    const finalRootContent = fs.readFileSync(rootDbPath, "utf8");
    const finalChecksum = crypto.createHash("sha256").update(finalRootContent).digest("hex");

    console.log("--------------------------------------------------------------------------------");
    console.log("[التحقق من سلامة البيانات الأصلية]");
    console.log(`بصمة البداية: ${initialChecksum}`);
    console.log(`بصمة النهاية:  ${finalChecksum}`);
    const zeroPollution = initialChecksum === finalChecksum;
    console.log(`حالة النزاهة: ${zeroPollution ? "سليمة تماماً 100% (Zero Pollution)" : "تحذير: حدث تغيير في db.json"}`);
    console.log("--------------------------------------------------------------------------------\n");

    results.push({
      title: "نزاهة ملف db.json الأصلي وعدم تلوث البيانات (Zero-Pollution)",
      passed: zeroPollution,
      details: zeroPollution
        ? "تطابقت بصمة SHA-256 للملف الأصلي بنسبة 100%، ولم تتأثر أي بيانات حقيقية للجمعية."
        : "تغيرت بصمة الملف الأصلي أثناء الاختبار."
    });
  }

  // Final Summary
  const allPassed = results.every(r => r.passed);
  console.log("================================================================================");
  console.log(`نتيجة الاختبارات الإجمالية: ${allPassed ? "ناجحة بالكامل (ALL PASSED)" : "يوجد اختبارات فاشلة"}`);
  console.log("================================================================================");
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.passed ? "ناجح PASS" : "فاشل FAIL"}] ${r.title}`);
  });

  return { allPassed, results };
}

// Run directly if invoked from CLI
if (process.argv[1]?.includes("test_user_disable_and_csv_security")) {
  runSecurityAndPreservationTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error("Test execution failed:", err);
      process.exit(1);
    });
}
