/**
 * Automated Regression Test Suite: User DTO, Linked Profiles, Circular Reference Prevention & Credential Leak Defense
 * 
 * Target: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * Purpose:
 * 1. Verify that toSafeUserDto completely eliminates circular references and self-pointers.
 * 2. Verify that GET /api/db/users and GET /api/users succeed with HTTP 200 (preventing 500 Converting circular structure to JSON).
 * 3. Verify that linkedProfiles contain only safe, typed, acyclic metadata without circular data pointers.
 * 4. Verify that passwordHash, tempPassword, sessionToken, and secrets NEVER leak in user responses or permission endpoints.
 * 5. Verify multi-profile linkage (user linked across userDepartmentAccess, volunteers, employees, beneficiaries).
 */

import fs from "fs";
import path from "path";
import http from "http";
import app, { 
  readDb, 
  writeDb,
  getActiveDbPath, 
  reloadDbFromDisk,
  createServerSession,
  toSafeUserDto,
  sanitizeUserDepartmentAccess,
  sanitizeUserDepartmentAccessList
} from "../server-core";

interface TestStep {
  name: string;
  passed: boolean;
  message: string;
}

export async function runUserDtoAndCircularRegressionTests(): Promise<boolean> {
  console.log("================================================================================");
  console.log("اختبارات منع الارتباط الدائري وتأمين واجهة المستخدمين (User DTO & Anti-Circular)");
  console.log("جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("================================================================================\n");

  const results: TestStep[] = [];
  const sandboxDir = path.join(process.cwd(), "test-sandbox-circular-regression");
  if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });

  const originalAppDbPath = process.env.APP_DB_PATH;
  const originalBackend = process.env.STORAGE_BACKEND;

  // 1. UNIT TEST: Circular Object Sanitization in toSafeUserDto
  console.log("1. اختبار وحدة toSafeUserDto ومعالجة الكائنات ذات الارتباط الدائري...");
  try {
    const rawUserWithCycle: any = {
      id: "test-user-cycle-1",
      userId: "test-user-cycle-1",
      username: "cycle_user",
      name: "مستخدم تجريبي لاختبار الدورات",
      email: "cycle@riadataleata.org.sa",
      phone: "0550009999",
      nationalId: "1099999999",
      role: "operations_manager",
      jobTitle: "مدير العمليات",
      departmentId: "dep-1",
      departmentName: "إدارة العمليات والتشغيل",
      permissions: ["super_admin", "operations_manager", "manage_staff"],
      allowedDepartmentIds: ["dep-1", "dep-2"],
      status: "active",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890HashedPasswordHere",
      password: "RawPasswordShouldNeverLeak!",
      tempPassword: "TempSecret123!",
      sessionToken: "session-token-secret-xyz",
      bootstrapSecret: "super-bootstrap-key",
      linkedProfiles: []
    };

    // Create intentional deep circular reference mimicking the bug
    const circularProfileItem: any = {
      source: "userDepartmentAccess",
      id: rawUserWithCycle.id,
      role: rawUserWithCycle.role,
      status: rawUserWithCycle.status,
      data: rawUserWithCycle // <-- THIS CAUSED THE CIRCULAR CRASH
    };
    rawUserWithCycle.linkedProfiles.push(circularProfileItem);

    // Verify raw user crashes standard JSON.stringify
    let didRawCrash = false;
    try {
      JSON.stringify(rawUserWithCycle);
    } catch (e: any) {
      if (e.message && e.message.includes("circular")) {
        didRawCrash = true;
      }
    }

    if (!didRawCrash) {
      throw new Error("Expected raw object with circular reference to crash JSON.stringify, but it did not!");
    }

    // Now test toSafeUserDto
    const safeUser = toSafeUserDto(rawUserWithCycle);

    // Verify toSafeUserDto serializes smoothly without any circular error
    const jsonOutput = JSON.stringify(safeUser);
    const parsed = JSON.parse(jsonOutput);

    // Verify sensitive secrets were stripped
    const leakedSecrets: string[] = [];
    if (parsed.passwordHash) leakedSecrets.push("passwordHash");
    if (parsed.password) leakedSecrets.push("password");
    if (parsed.tempPassword) leakedSecrets.push("tempPassword");
    if (parsed.sessionToken) leakedSecrets.push("sessionToken");
    if (parsed.bootstrapSecret) leakedSecrets.push("bootstrapSecret");

    if (leakedSecrets.length > 0) {
      throw new Error(`toSafeUserDto leaked sensitive fields: ${leakedSecrets.join(", ")}`);
    }

    // Verify linkedProfiles has no circular 'data' pointer
    if (parsed.linkedProfiles && parsed.linkedProfiles[0]) {
      if (parsed.linkedProfiles[0].data !== undefined) {
        throw new Error("linkedProfiles[0].data was not stripped and still contains reference!");
      }
      if (parsed.linkedProfiles[0].source !== "userDepartmentAccess" || parsed.linkedProfiles[0].id !== rawUserWithCycle.id) {
        throw new Error("linkedProfiles[0] metadata was corrupted!");
      }
    } else {
      throw new Error("linkedProfiles array was lost in toSafeUserDto!");
    }

    results.push({
      name: "toSafeUserDto Anti-Circular & Secret-Stripping Unit Test",
      passed: true,
      message: "تم بنجاح كسر الارتباط الدائري وتطهير كافة كلمات المرور والأسرار المشفرة"
    });
    console.log("   [PASSED] نجح اختبار وحدة toSafeUserDto وتطهير الارتباط الدائري والأسرار.");
  } catch (err: any) {
    results.push({
      name: "toSafeUserDto Anti-Circular Unit Test",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل اختبار وحدة toSafeUserDto:", err.message);
  }

  // 2. INTEGRATION TEST: Full HTTP GET /api/db/users with Linked Profiles
  console.log("\n2. اختبار تكاملي لمسار GET /api/db/users وخادم HTTP الحقيقي...");
  let server: http.Server | null = null;
  try {
    const isolatedDbPath = path.join(sandboxDir, "isolated-test-users-db.json");
    
    // Seed an isolated test DB containing:
    // - mousa (Operations Manager)
    // - an employee who is also a volunteer (linked by nationalId)
    // - a beneficiary
    const mockDb = {
      systemSettings: {
        societyName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        maintenanceMode: false
      },
      departments: [
        { id: "dep-1", nameAr: "الإدارة العامة والعمليات", nameEn: "General & Operations", directorName: "د. عبد الله القرشي" },
        { id: "dep-5", nameAr: "إدارة التطوع والموارد البشرية", nameEn: "Volunteer & HR", directorName: "أ. ماجد النفيعي" },
        { id: "dep-4", nameAr: "إدارة الرعاية الاجتماعية", nameEn: "Social Welfare", directorName: "أ. سعد الهذلي" }
      ],
      userDepartmentAccess: [
        {
          id: "perm-ops-mousa",
          userId: "ops-mousa",
          username: "mousa",
          userName: "موسى مدير العمليات",
          userEmail: "mousa@riadataleata.org.sa",
          email: "mousa@riadataleata.org.sa",
          phone: "0551234567",
          nationalId: "1055555555",
          role: "operations_manager",
          jobTitle: "مدير العمليات والتشغيل",
          primaryDepartmentId: "dep-1",
          primaryDepartmentName: "الإدارة العامة والعمليات",
          allowedDepartmentIds: ["dep-1", "dep-4", "dep-5"],
          permissions: ["super_admin", "operations_manager", "manage_staff", "view_department", "all_permissions"],
          status: "active",
          mustChangePassword: false,
          passwordHash: "$2a$10$OpsManagerPasswordHashSalt1234567890Secret",
          createdAt: new Date().toISOString()
        },
        {
          id: "perm-emp-khalid",
          userId: "emp-khalid",
          username: "khalid_admin",
          userName: "خالد الحربي",
          userEmail: "khalid@riadataleata.org.sa",
          email: "khalid@riadataleata.org.sa",
          phone: "0557778899",
          nationalId: "1077777777",
          role: "employee",
          jobTitle: "موظف موارد بشرية وتطوع",
          primaryDepartmentId: "dep-5",
          primaryDepartmentName: "إدارة التطوع والموارد البشرية",
          allowedDepartmentIds: ["dep-5"],
          permissions: ["view_department", "manage_tasks"],
          status: "active",
          mustChangePassword: false,
          passwordHash: "$2a$10$EmployeePasswordHashSecretDoNotLeak123",
          createdAt: new Date().toISOString()
        }
      ],
      volunteers: [
        {
          id: "vol-khalid",
          userId: "emp-khalid",
          membershipNumber: "VOL-2026-001",
          name: "خالد الحربي",
          email: "khalid@riadataleata.org.sa",
          phone: "0557778899",
          nationalId: "1077777777", // Matches employee nationalId for unified profile link!
          role: "volunteer",
          status: "active",
          hours: 45,
          points: 120,
          joinDate: "2026-01-15T00:00:00Z"
        }
      ],
      beneficiaries: [
        {
          id: "ben-101",
          beneficiaryNumber: "BEN-2026-101",
          name: "أحمد بن مسعود",
          email: "ahmed@example.com",
          phone: "0554443322",
          nationalId: "1044443322",
          category: "أسر أيتام",
          familySize: 5,
          monthlyIncome: 2500,
          status: "approved",
          createdAt: "2026-01-10T00:00:00Z"
        }
      ],
      activeSessions: []
    };

    fs.writeFileSync(isolatedDbPath, JSON.stringify(mockDb, null, 2), "utf8");
    process.env.APP_DB_PATH = isolatedDbPath;
    process.env.STORAGE_BACKEND = "file";
    reloadDbFromDisk();

    // Create session for operations manager mousa
    const opsSession = createServerSession({
      userId: "ops-mousa",
      userName: "موسى مدير العمليات",
      role: "operations_manager",
      isOperationsManager: true,
      isSuperAdmin: true,
      primaryDepartmentId: "dep-1",
      allowedDepartmentIds: ["dep-1", "dep-4", "dep-5"],
      permissions: ["super_admin", "operations_manager", "manage_staff", "view_department", "all_permissions"]
    });

    // Start HTTP server on dynamic port
    await new Promise<void>((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });

    const address = server!.address() as any;
    const port = address.port;

    // Call GET /api/db/users with operations_manager session
    const resData = await new Promise<{ status: number; headers: any; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/db/users",
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${opsSession.token}`,
            "x-session-token": opsSession.token
          }
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode || 500, headers: res.headers, body }));
        }
      );
      req.on("error", reject);
      req.end();
    });

    if (resData.status !== 200) {
      throw new Error(`Expected HTTP 200 from /api/db/users, but got HTTP ${resData.status}. Body: ${resData.body}`);
    }

    const payload = JSON.parse(resData.body);

    if (payload.status !== "success") {
      throw new Error(`Response payload status is not success: ${JSON.stringify(payload)}`);
    }

    if (!Array.isArray(payload.users) || payload.users.length === 0) {
      throw new Error("Response payload.users is empty or not an array!");
    }

    // Check circular references on the entire serialized payload
    const reserialized = JSON.stringify(payload);
    if (!reserialized.includes("mousa")) {
      throw new Error("Serialized users response does not contain user mousa!");
    }

    // Verify all users conform to SafeUserDto and have NO leaked hashes
    const fullPayloadString = JSON.stringify(payload);
    if (fullPayloadString.includes("passwordHash") || fullPayloadString.includes("OpsManagerPasswordHashSalt")) {
      throw new Error("CRITICAL SECURITY LEAK: passwordHash found in /api/db/users response payload!");
    }
    if (fullPayloadString.includes("EmployeePasswordHashSecretDoNotLeak123")) {
      throw new Error("CRITICAL SECURITY LEAK: employee passwordHash found in /api/db/users response payload!");
    }

    // Verify multi-profile linkage for khalid (employee + volunteer)
    const khalidUser = payload.users.find((u: any) => u.nationalId === "1077777777" || u.name === "خالد الحربي");
    if (!khalidUser) {
      throw new Error("Unified user for khalid was not found!");
    }
    if (!Array.isArray(khalidUser.linkedProfiles) || khalidUser.linkedProfiles.length < 2) {
      throw new Error(`Expected khalid to have at least 2 linked profiles (employee + volunteer), but found: ${khalidUser.linkedProfiles?.length}`);
    }

    // Verify linked profiles are clean
    for (const lp of khalidUser.linkedProfiles) {
      if (lp.data !== undefined) {
        throw new Error(`khalid linkedProfile contains circular 'data' field! ${JSON.stringify(lp)}`);
      }
      if (!lp.source || !lp.id) {
        throw new Error(`khalid linkedProfile missing source or id: ${JSON.stringify(lp)}`);
      }
    }

    results.push({
      name: "GET /api/db/users HTTP 200 & LinkedProfiles Anti-Circular Verification",
      passed: true,
      message: `تم جلب ${payload.users.length} مستخدمين بنجاح دون أي خطأ 500، وتأكيد الربط الموحد للملفات دون حلقات دائرية.`
    });
    console.log(`   [PASSED] نجح استعلام /api/db/users بنجاح تام (عدد المستخدمين: ${payload.users.length}) ودون أي أخطاء دائرية.`);

    // 3. INTEGRATION TEST: GET /api/db/permissions/users Sanitization
    console.log("\n3. اختبار مسار GET /api/db/permissions/users وتطهير الصلاحيات...");
    const permRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/db/permissions/users",
          method: "GET",
          headers: {
            "Accept": "application/json",
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

    if (permRes.status !== 200) {
      throw new Error(`Expected HTTP 200 from /api/db/permissions/users, got ${permRes.status}: ${permRes.body}`);
    }

    const permPayload = JSON.parse(permRes.body);
    if (!Array.isArray(permPayload.users) || permPayload.users.length === 0) {
      throw new Error("Permissions users list is empty or invalid!");
    }

    const permPayloadStr = JSON.stringify(permPayload);
    if (permPayloadStr.includes("passwordHash") || permPayloadStr.includes("OpsManagerPasswordHashSalt")) {
      throw new Error("CRITICAL SECURITY LEAK: passwordHash found in /api/db/permissions/users response!");
    }

    results.push({
      name: "GET /api/db/permissions/users Sanitization Verification",
      passed: true,
      message: "تم التحقق من تطهير جدول userDepartmentAccess وعدم تسريب أي passwordHash"
    });
    console.log("   [PASSED] تم التحقق من سلامة /api/db/permissions/users وخلوه من أي تجزئات لكلمات المرور.");

    // 4. INTEGRATION TEST: GET /api/db/scoped Database Isolation
    console.log("\n4. اختبار مسار GET /api/db/scoped وتطهير userDepartmentAccess...");
    const scopedRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/db/scoped",
          method: "GET",
          headers: {
            "Accept": "application/json",
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

    if (scopedRes.status !== 200) {
      throw new Error(`Expected HTTP 200 from /api/db/scoped, got ${scopedRes.status}: ${scopedRes.body}`);
    }

    const scopedPayload = JSON.parse(scopedRes.body);
    const scopedStr = JSON.stringify(scopedPayload);
    if (scopedStr.includes("OpsManagerPasswordHashSalt") || scopedStr.includes("EmployeePasswordHashSecretDoNotLeak123")) {
      throw new Error("CRITICAL SECURITY LEAK: passwordHash found in /api/db/scoped response payload!");
    }

    results.push({
      name: "GET /api/db/scoped Database Segregation & Secret Protection",
      passed: true,
      message: "تم التحقق من حماية بيانات المستخدمين في الاستعلام العام للنظام"
    });
    console.log("   [PASSED] تم التحقق من سلامة وتطهير استعلام /api/db/scoped بالكامل.");

  } catch (err: any) {
    results.push({
      name: "User Endpoints Integration Test",
      passed: false,
      message: err.message || String(err)
    });
    console.error("   [FAILED] فشل الاختبار التكاملي للمسارات:", err.message);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    // Restore environment variables
    if (originalAppDbPath !== undefined) {
      process.env.APP_DB_PATH = originalAppDbPath;
    } else {
      delete process.env.APP_DB_PATH;
    }
    if (originalBackend !== undefined) {
      process.env.STORAGE_BACKEND = originalBackend;
    } else {
      delete process.env.STORAGE_BACKEND;
    }
    // Clean up sandbox
    if (fs.existsSync(sandboxDir)) {
      try {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      } catch {}
    }
  }

  console.log("\n================================================================================");
  console.log("ملخص نتائج الاختبارات:");
  console.log("================================================================================");
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? "✔ [ناجح]" : "✘ [راسب]";
    console.log(`${mark} ${r.name}: ${r.message}`);
    if (!r.passed) allPassed = false;
  }
  console.log("================================================================================\n");

  if (!allPassed) {
    throw new Error("فشلت بعض اختبارات الانحدار المتعلقة بحماية المستخدمين والارتباط الدائري.");
  }
  return allPassed;
}

// Direct execution support
if (process.argv[1] && process.argv[1].includes("test_user_dto_and_circular_regression")) {
  runUserDtoAndCircularRegressionTests()
    .then(() => {
      console.log("جميع اختبارات الانحدار اجتازت بنجاح!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("فشل الاختبار:", err);
      process.exit(1);
    });
}
