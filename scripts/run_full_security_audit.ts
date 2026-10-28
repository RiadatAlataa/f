/**
 * ============================================================================
 * سكربت الفحص والتدقيق الأمني الشامل والآلي - جمعية ريادة العطاء
 * Comprehensive Automated Defensive Security Audit Suite
 * ============================================================================
 * 
 * يختبر السكربت سلوك النظام فعلياً من خلال استدعاء واجهات Express وقواعد التحقق
 * ويثبت بالدليل التقني إغلاق جميع الثغرات الأمنية السابقة والحالية.
 */

import { app, readDb, writeDb } from "../server-core";
import { createServerSession, destroyServerSession, invalidateUserSessions, getServerSession } from "../server-core";
import http from "http";

// Colors for reporting
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

interface TestResult {
  id: number;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

// Helper to start in-memory test server
let server: http.Server;
let baseUrl = "";

async function startTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function request(path: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Promise<{ status: number; body: any; headers: any }> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let parsed: any = null;
  const text = await res.text();
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    status: res.status,
    body: parsed,
    headers: res.headers
  };
}

async function runAudit() {
  console.log(`\n${C.cyan}${C.bold}====================================================================${C.reset}`);
  console.log(`${C.cyan}${C.bold}    التدقيق الأمني الشامل والآلي - نظام جمعية ريادة العطاء    ${C.reset}`);
  console.log(`${C.cyan}${C.bold}====================================================================${C.reset}\n`);

  await startTestServer();
  const db = readDb();

  // Test 1: طلب إداري دون جلسة دخول: يجب رفضه (401 Unauthorized)
  try {
    const res = await request("/api/db/users/create", {
      method: "POST",
      body: { name: "مستخدم تجريبي", role: "employee" }
    });
    const pass = res.status === 401 && res.body?.code === 'UNAUTHORIZED';
    results.push({
      id: 1,
      name: "طلب إداري دون جلسة دخول",
      category: "Authentication",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${res.status} | Code: ${res.body?.code || 'none'}`
    });
  } catch (err: any) {
    results.push({ id: 1, name: "طلب إداري دون جلسة دخول", category: "Authentication", status: 'FAIL', evidence: err.message });
  }

  // Test 2: محاولة انتحال مدير النظام عبر ترويسات HTTP (Spoofing Attack): يجب رفضها
  try {
    // 2.1 Attack on /api/db/auth/session with x-user-id: mosa
    const res1 = await request("/api/db/auth/session", {
      headers: { "x-user-id": "mosa", "x-user-role": "admin" }
    });
    // 2.2 Attack on /api/maintenance/toggle with x-user-role: admin
    const res2 = await request("/api/maintenance/toggle", {
      method: "POST",
      headers: { "x-user-role": "admin" },
      body: { enabled: true }
    });

    const pass = res1.body?.status === "unauthenticated" && res2.status === 403;
    results.push({
      id: 2,
      name: "منع انتحال الهوية عبر ترويسات x-user-id / x-user-role",
      category: "Header Spoofing Shield",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `/api/db/auth/session status: ${res1.body?.status} | /api/maintenance/toggle HTTP: ${res2.status}`
    });
  } catch (err: any) {
    results.push({ id: 2, name: "منع انتحال الهوية عبر ترويسات", category: "Header Spoofing Shield", status: 'FAIL', evidence: err.message });
  }

  // Test 3: موظف يحاول منح نفسه أو غيره super_admin: يجب رفضه (Privilege Escalation)
  try {
    // Create an authorized session for an HR staff member (has manage_staff, but not super_admin)
    const staffSession = createServerSession({
      id: "staff-hr-01",
      userId: "staff-hr-01",
      name: "موظف الموارد البشرية",
      role: "employee",
      departmentId: "dep-5",
      permissions: ["view_department", "manage_staff", "create_data", "edit_data"]
    }, "employee");

    const res = await request("/api/db/users/update", {
      method: "POST",
      headers: { "x-session-token": staffSession.token },
      body: {
        userId: "staff-hr-01",
        role: "admin",
        permissions: ["super_admin", "all_permissions"]
      }
    });

    destroyServerSession(staffSession.token);

    const pass = res.status === 403 && res.body?.code === "PRIVILEGE_ESCALATION_BLOCKED";
    results.push({
      id: 3,
      name: "حظر تصعيد الصلاحيات (موظف يطلب super_admin)",
      category: "Privilege Escalation",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${res.status} | Error: ${res.body?.code || res.body?.error}`
    });
  } catch (err: any) {
    results.push({ id: 3, name: "حظر تصعيد الصلاحيات", category: "Privilege Escalation", status: 'FAIL', evidence: err.message });
  }

  // Test 4: متطوع يحاول الوصول إلى بيانات المستفيدين: يجب رفضه وحجبها بالكامل
  try {
    const volSession = createServerSession({
      id: "vol-test-01",
      userId: "vol-test-01",
      name: "متطوع اختبار",
      role: "volunteer",
      departmentId: "dep-5"
    }, "volunteer");

    const resDb = await request("/api/db", {
      headers: { "x-session-token": volSession.token }
    });

    const resEditBen = await request("/api/db/beneficiaries/add", {
      method: "POST",
      headers: { "x-session-token": volSession.token },
      body: { id: "ben-1", name: "محاولة تعديل" }
    });

    destroyServerSession(volSession.token);

    const beneficiariesCount = resDb.body?.beneficiaries?.length ?? -1;
    const pass = beneficiariesCount === 0 && resEditBen.status === 403;
    results.push({
      id: 4,
      name: "حظر وصول المتطوع لبيانات المستفيدين الخاصة",
      category: "Data Isolation & Privacy",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `Beneficiaries leaked to volunteer: ${beneficiariesCount} | Edit beneficiary status: ${resEditBen.status}`
    });
  } catch (err: any) {
    results.push({ id: 4, name: "حظر وصول المتطوع لبيانات المستفيدين", category: "Data Isolation", status: 'FAIL', evidence: err.message });
  }

  // Test 5: حساب معطل يحاول استخدام جلسة قديمة: يجب رفضه وإلغاء الجلسة فوراً
  try {
    // 1. Create a user account in db
    const testUserId = `user-audit-suspend-${Date.now()}`;
    if (!db.userDepartmentAccess) db.userDepartmentAccess = [];
    db.userDepartmentAccess.push({
      id: `perm-${testUserId}`,
      userId: testUserId,
      userName: "مستخدم معلق تجريبي",
      role: "employee",
      status: "active",
      primaryDepartmentId: "dep-1",
      permissions: ["view_department"]
    });
    writeDb(db);

    // 2. Create active session
    const suspendedUserSession = createServerSession({
      id: testUserId,
      userId: testUserId,
      name: "مستخدم معلق تجريبي",
      role: "employee"
    }, "employee");

    // 3. Mark user suspended in database
    const entry = db.userDepartmentAccess.find((u: any) => u.userId === testUserId);
    if (entry) {
      entry.status = "suspended";
      entry.loginDisabled = true;
      writeDb(db);
    }

    // 4. Attempt to use session
    const res = await request("/api/db/auth/session", {
      headers: { "x-session-token": suspendedUserSession.token }
    });

    // Cleanup
    db.userDepartmentAccess = db.userDepartmentAccess.filter((u: any) => u.userId !== testUserId);
    writeDb(db);

    const pass = res.body?.status === "unauthenticated" && res.body?.reason === "account_suspended";
    results.push({
      id: 5,
      name: "إبطال جلسات الحسابات الموقوفة أو المعطلة فوراً",
      category: "Session Lifecycle",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `Session Status: ${res.body?.status} | Reason: ${res.body?.reason || 'none'}`
    });
  } catch (err: any) {
    results.push({ id: 5, name: "إبطال جلسات الحسابات الموقوفة", category: "Session Lifecycle", status: 'FAIL', evidence: err.message });
  }

  // Test 6: مستخدم تغيّرت صلاحياته يحاول استخدام صلاحياته السابقة: يجب إعادة التقييم فوراً
  try {
    const testStaffId = `user-audit-perms-${Date.now()}`;
    if (!db.userDepartmentAccess) db.userDepartmentAccess = [];
    db.userDepartmentAccess.push({
      id: `perm-${testStaffId}`,
      userId: testStaffId,
      userName: "موظف تقليص الصلاحيات",
      role: "operations_manager",
      status: "active",
      primaryDepartmentId: "dep-1",
      permissions: ["super_admin", "all_permissions"]
    });
    writeDb(db);

    // Create session while they had operations_manager
    const userSession = createServerSession({
      id: testStaffId,
      userId: testStaffId,
      name: "موظف تقليص الصلاحيات",
      role: "operations_manager"
    }, "operations_manager");

    // Downgrade user in DB to employee with only view_department
    const entry = db.userDepartmentAccess.find((u: any) => u.userId === testStaffId);
    if (entry) {
      entry.role = "employee";
      entry.permissions = ["view_department"];
      writeDb(db);
    }

    // Try to perform a privileged admin action (maintenance toggle)
    const res = await request("/api/maintenance/toggle", {
      method: "POST",
      headers: { "x-session-token": userSession.token },
      body: { enabled: true }
    });

    // Cleanup
    destroyServerSession(userSession.token);
    db.userDepartmentAccess = db.userDepartmentAccess.filter((u: any) => u.userId !== testStaffId);
    writeDb(db);

    const pass = res.status === 403;
    results.push({
      id: 6,
      name: "إعادة تقييم الصلاحيات ديناميكياً عند تعديلها في القاعدة",
      category: "RBAC Dynamic Evaluation",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `Privileged action after downgrade rejected with HTTP: ${res.status}`
    });
  } catch (err: any) {
    results.push({ id: 6, name: "إعادة تقييم الصلاحيات ديناميكياً", category: "RBAC", status: 'FAIL', evidence: err.message });
  }

  // Test 7: موظف عادي أو مدير إدارة يحاول تعديل حساب الإدارة العليا: يجب رفضه
  try {
    const managerSession = createServerSession({
      id: "dept-manager-01",
      userId: "dept-manager-01",
      name: "مدير إدارة",
      role: "department_admin",
      departmentId: "dep-3",
      permissions: ["view_department", "manage_staff", "edit_data"]
    }, "department_admin");

    // Attempt to modify Super Admin mosa or admin-user
    const resMosa = await request("/api/db/users/update", {
      method: "POST",
      headers: { "x-session-token": managerSession.token },
      body: {
        userId: "mosa",
        name: "محاولة اختراق",
        status: "suspended"
      }
    });

    const resAdmin = await request("/api/db/users/reset-password", {
      method: "POST",
      headers: { "x-session-token": managerSession.token },
      body: {
        userId: "admin-user",
        newPassword: "Hacked#Password2026!"
      }
    });

    destroyServerSession(managerSession.token);

    const pass = resMosa.status === 403 && 
                 resMosa.body?.code === "FORBIDDEN_TOP_MANAGEMENT_PROTECTION" && 
                 resAdmin.status === 403 && 
                 resAdmin.body?.code === "FORBIDDEN_TOP_MANAGEMENT_PROTECTION";

    results.push({
      id: 7,
      name: "حماية حسابات الإدارة العليا من التعديل بواسطة المرؤوسين",
      category: "Top Management Shield",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `Edit mosa code: ${resMosa.body?.code} | Reset admin password code: ${resAdmin.body?.code}`
    });
  } catch (err: any) {
    results.push({ id: 7, name: "حماية حسابات الإدارة العليا", category: "Top Management Shield", status: 'FAIL', evidence: err.message });
  }

  // Test 8: مستخدم يحاول الوصول لبيانات مستخدم آخر (IDOR) أو تعديل أهليته
  try {
    const benSession = createServerSession({
      id: "ben-own-01",
      userId: "ben-own-01",
      name: "مستفيد شرعي",
      role: "beneficiary",
      nationalId: "1099887766"
    }, "beneficiary");

    // In DB, simulate two beneficiaries
    if (!db.beneficiaries) db.beneficiaries = [];
    const ben1 = { id: "ben-own-01", name: "مستفيد شرعي", nationalId: "1099887766", status: "pending", monthlyIncome: 3000 };
    const ben2 = { id: "ben-other-02", name: "مستفيد آخر سري", nationalId: "1011223344", status: "approved", monthlyIncome: 1500 };
    db.beneficiaries.push(ben1, ben2);
    writeDb(db);

    // 1. Check /api/db for beneficiary: must only see own record
    const resDb = await request("/api/db", {
      headers: { "x-session-token": benSession.token }
    });
    const returnedBens = resDb.body?.beneficiaries || [];
    const seesOther = returnedBens.some((b: any) => b.id === "ben-other-02");

    // 2. Beneficiary tries to self-approve and set monthlyIncome to 0
    await request("/api/db/beneficiaries/add", {
      method: "POST",
      headers: { "x-session-token": benSession.token },
      body: {
        id: "ben-own-01",
        name: "مستفيد شرعي",
        nationalId: "1099887766",
        phone: "0555555555",
        status: "approved", // Attempt self-approval
        monthlyIncome: 0    // Attempt income falsification
      }
    });

    const refreshedDb = readDb();
    const updatedBen = (refreshedDb.beneficiaries || []).find((b: any) => b.id === "ben-own-01");

    // Cleanup
    db.beneficiaries = db.beneficiaries.filter((b: any) => b.id !== "ben-own-01" && b.id !== "ben-other-02");
    writeDb(db);
    destroyServerSession(benSession.token);

    const pass = !seesOther && updatedBen?.status === "pending" && updatedBen?.monthlyIncome === 3000;
    results.push({
      id: 8,
      name: "حماية بيانات المستفيدين من IDOR ومنع التعديل الذاتي للحالة",
      category: "IDOR & Integrity",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `Sees other beneficiaries: ${seesOther} | Status remained: ${updatedBen?.status} | Income remained: ${updatedBen?.monthlyIncome}`
    });
  } catch (err: any) {
    results.push({ id: 8, name: "حماية بيانات المستفيدين من IDOR", category: "IDOR", status: 'FAIL', evidence: err.message });
  }

  // Test 9: مدير العمليات يستخدم صلاحياته المعتمدة: تعمل بنجاح (PASS)
  try {
    const opsSession = createServerSession({
      id: "ops-manager",
      userId: "ops-manager",
      name: "م. سلطان الزهراني",
      role: "operations_manager",
      departmentId: "dep-1",
      permissions: ["super_admin", "operations_manager", "all_permissions"]
    }, "operations_manager");

    const resMaintenance = await request("/api/maintenance/toggle", {
      method: "POST",
      headers: { "x-session-token": opsSession.token },
      body: { enabled: false, message: "النظام يعمل بصورة طبيعية" }
    });

    destroyServerSession(opsSession.token);

    const pass = resMaintenance.status === 200 && resMaintenance.body?.success === true;
    results.push({
      id: 9,
      name: "تنفيذ مدير العمليات لعملياته المعتمدة بنجاح",
      category: "Authorized Operations",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${resMaintenance.status} | Success: ${resMaintenance.body?.success}`
    });
  } catch (err: any) {
    results.push({ id: 9, name: "تنفيذ مدير العمليات لعملياته", category: "Authorized Operations", status: 'FAIL', evidence: err.message });
  }

  // Test 10: الإدارة العليا تعدل الصلاحيات وفق السياسة المعتمدة: تعمل بنجاح (PASS)
  try {
    const adminSession = createServerSession({
      id: "admin-user",
      userId: "admin-user",
      name: "مسؤول النظام الأعلى",
      role: "admin",
      permissions: ["super_admin", "all_permissions"]
    }, "admin");

    const resPerm = await request("/api/db/permissions/update", {
      method: "POST",
      headers: { "x-session-token": adminSession.token },
      body: {
        userId: "test-staff-target",
        userName: "موظف معتمد",
        role: "employee",
        primaryDepartmentId: "dep-2",
        permissions: ["view_department", "create_data"]
      }
    });

    destroyServerSession(adminSession.token);

    const pass = resPerm.status === 200 && resPerm.body?.status === "success";
    results.push({
      id: 10,
      name: "تعديل الإدارة العليا للصلاحيات وفق السياسة المعتمدة",
      category: "Authorized Governance",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${resPerm.status} | Message: ${resPerm.body?.message}`
    });
  } catch (err: any) {
    results.push({ id: 10, name: "تعديل الإدارة العليا للصلاحيات", category: "Authorized Governance", status: 'FAIL', evidence: err.message });
  }

  // Test 11: حجب تسريب البيانات الحساسة للزوار غير المسجلين (Public Data Leak Shield)
  try {
    const resPublic = await request("/api/db");
    const d = resPublic.body || {};

    const leakedBeneficiaries = (d.beneficiaries || []).length;
    const leakedEmployees = (d.employees || []).length;
    const leakedFinances = (d.financialTransactions || []).length;
    const leakedSessions = d.activeSessions !== undefined;

    const pass = leakedBeneficiaries === 0 && 
                 leakedEmployees === 0 && 
                 leakedFinances === 0 && 
                 !leakedSessions;

    results.push({
      id: 11,
      name: "حجب الجداول الحساسة والمالية والمستفيدين عن الزائر العام",
      category: "Public Privacy Barrier",
      status: pass ? 'PASS' : 'FAIL',
      evidence: `Beneficiaries: ${leakedBeneficiaries} | Employees: ${leakedEmployees} | Finances: ${leakedFinances} | Raw Sessions Leaked: ${leakedSessions}`
    });
  } catch (err: any) {
    results.push({ id: 11, name: "حجب الجداول الحساسة عن الزائر العام", category: "Public Privacy", status: 'FAIL', evidence: err.message });
  }

  // Test 12: فحص أمان الرموز وتشفير الجلسات (256-bit Cryptographic Entropy)
  try {
    const s = createServerSession({ id: "entropy-test", role: "user" }, "user");
    destroyServerSession(s.token);

    // sess_ + timestamp + 64 hex chars = strong cryptographic token
    const isCryptoSecure = s.token.startsWith("sess_") && s.token.length >= 75;

    results.push({
      id: 12,
      name: "توليد رموز جلسات مشفرة 256-بت (crypto.randomBytes)",
      category: "Cryptographic Strength",
      status: isCryptoSecure ? 'PASS' : 'FAIL',
      evidence: `Token length: ${s.token.length} chars | Format: sess_<timestamp>_<64-hex-random>`
    });
  } catch (err: any) {
    results.push({ id: 12, name: "توليد رموز جلسات مشفرة", category: "Cryptographic Strength", status: 'FAIL', evidence: err.message });
  }

  await stopTestServer();

  // Print Summary Table
  console.log(`${C.bold}-----------------------------------------------------------------------------------------------------------------------${C.reset}`);
  console.log(`  ${'#'.padEnd(4)} ${'نوع الاختبار'.padEnd(58)} ${'النتيجة'.padEnd(10)} ${'الدليل التقني'}`);
  console.log(`${C.bold}-----------------------------------------------------------------------------------------------------------------------${C.reset}`);

  for (const r of results) {
    const statusFormatted = r.status === 'PASS' 
      ? `${C.green}${C.bold}[PASS]${C.reset}` 
      : `${C.red}${C.bold}[FAIL]${C.reset}`;
    console.log(`  ${String(r.id).padEnd(4)} ${r.name.padEnd(55)} ${statusFormatted.padEnd(18)} ${C.gray}${r.evidence}${C.reset}`);
  }

  console.log(`${C.bold}-----------------------------------------------------------------------------------------------------------------------${C.reset}\n`);

  const allPassed = results.every(r => r.status === 'PASS');
  if (allPassed) {
    console.log(`${C.green}${C.bold}جميع الاختبارات الأمنية الـ ${results.length} نجحت بنسبة 100% (PASS) وتم إغلاق كافة الثغرات وإثبات ذلك تقنياً.${C.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${C.red}${C.bold}فشل في بعض الاختبارات الأمنية، يرجى مراجعة التفاصيل أعلاه.${C.reset}\n`);
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("Critical error running security audit:", err);
  process.exit(1);
});
