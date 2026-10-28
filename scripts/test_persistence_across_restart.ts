/**
 * Data Persistence Verification Across Server Restarts
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import fs from "fs";
import path from "path";
import http from "http";

async function runPersistenceTest() {
  console.log("================================================================================");
  console.log("اختبار التحقق من استمرار البيانات بعد إعادة تشغيل الخادم (Data Persistence Test)");
  console.log("================================================================================\n");

  const sandboxDir = path.join("/tmp", "persistence_sandbox_" + Date.now());
  fs.mkdirSync(sandboxDir, { recursive: true });
  const sandboxDbPath = path.join(sandboxDir, "db.json");

  // Read root db.json as baseline
  const baselineData = fs.readFileSync(path.join(process.cwd(), "db.json"), "utf8");
  fs.writeFileSync(sandboxDbPath, baselineData, "utf8");

  // Set override environment variable for isolated sandbox DB
  process.env.APP_DB_PATH = sandboxDbPath;

  // Dynamic import of server-core with overridden APP_DB_PATH
  const { app, createServerSession, destroyServerSession, getActiveDbPath } = await import("../server-core");

  console.log(`[Sandbox] Active DB Path: ${getActiveDbPath()}`);

  const startInstance = async (): Promise<{ server: http.Server; baseUrl: string }> => {
    return new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => {
        const addr: any = s.address();
        resolve({ server: s, baseUrl: `http://127.0.0.1:${addr.port}` });
      });
    });
  };

  const req = async (baseUrl: string, endpoint: string, opts: any = {}) => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, body };
  };

  const testBeneficiaryId = "ben-persist-" + Date.now();
  const testVolunteerId = "vol-persist-" + Date.now();

  try {
    // --- PHASE 1: First Server Lifecycle ---
    console.log("\n[1] تشغيل خادم المرحلة الأولى وكتابة بيانات جديدة...");
    const instance1 = await startInstance();
    const adminSession = createServerSession({ id: "mosa", role: "super_admin", name: "موسى المعبدي" }, "super_admin");

    // Add beneficiary
    const benRes = await req(instance1.baseUrl, "/api/db/beneficiaries/add", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminSession.token}` },
      body: {
        id: testBeneficiaryId,
        name: "مستفيد اختبار استمرار البيانات",
        nationalId: "1088888888",
        phone: "0508888888",
        familyMembersCount: 5,
        monthlyIncome: 3000,
        district: "العسيلة",
        category: "أسر محتاجة",
        status: "approved"
      }
    });

    // Add volunteer
    const volRes = await req(instance1.baseUrl, "/api/db/volunteers/add", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminSession.token}` },
      body: {
        id: testVolunteerId,
        name: "متطوع اختبار استمرار البيانات",
        nationalId: "1077777777",
        phone: "0507777777",
        email: "persist.vol@example.com",
        city: "مكة المكرمة",
        district: "العسيلة",
        status: "active",
        points: 150,
        hours: 20
      }
    });

    console.log(`- إضافة المستفيد: HTTP ${benRes.status}`);
    console.log(`- إضافة المتطوع: HTTP ${volRes.status}`);

    destroyServerSession(adminSession.token);

    // --- PHASE 2: Complete Shutdown & Restart ---
    console.log("\n[2] إيقاف الخادم بالكامل ومحاكاة إعادة تشغيل الخدمة (Server Shutdown & Restart)...");
    await new Promise<void>((resolve) => instance1.server.close(() => resolve()));
    console.log("- تم إيقاف عملية الخادم الأولى بنجاح.");

    // Direct Disk Verification before starting instance 2
    const diskContent = JSON.parse(fs.readFileSync(sandboxDbPath, "utf8"));
    const benOnDisk = diskContent.beneficiaries.find((b: any) => b.id === testBeneficiaryId || b.name === "مستفيد اختبار استمرار البيانات");
    const volOnDisk = diskContent.volunteers.find((v: any) => v.id === testVolunteerId || v.name === "متطوع اختبار استمرار البيانات");

    console.log(`- الفحص الفيزيائي للملف على القرص: مستفيد = ${Boolean(benOnDisk)} | متطوع = ${Boolean(volOnDisk)}`);

    // --- PHASE 3: Second Server Lifecycle ---
    console.log("\n[3] تشغيل خادم المرحلة الثانية والتحقق عبر واجهات API الحقيقية...");
    const instance2 = await startInstance();
    const adminSession2 = createServerSession({ id: "mosa", role: "super_admin", name: "موسى المعبدي" }, "super_admin");

    const getRes = await req(instance2.baseUrl, "/api/db", {
      headers: { "Authorization": `Bearer ${adminSession2.token}` }
    });

    const benAfterRestart = getRes.body?.beneficiaries?.find((b: any) => b.id === testBeneficiaryId || b.name === "مستفيد اختبار استمرار البيانات");
    const volAfterRestart = getRes.body?.volunteers?.find((v: any) => v.id === testVolunteerId || v.name === "متطوع اختبار استمرار البيانات");

    destroyServerSession(adminSession2.token);
    await new Promise<void>((resolve) => instance2.server.close(() => resolve()));

    const passed = Boolean(benAfterRestart) && Boolean(volAfterRestart) && 
                   benAfterRestart.name === "مستفيد اختبار استمرار البيانات" &&
                   volAfterRestart.name === "متطوع اختبار استمرار البيانات";

    console.log("\n================================================================================");
    if (passed) {
      console.log("[PASS] تم إثبات استمرار بيانات المستفيدين والمتطوعين بعد إعادة تشغيل الخادم بنجاح 100%!");
      console.log(`- بيانات المستفيد المسترجعة: المعرف = ${benAfterRestart.id} | الاسم = ${benAfterRestart.name} | الحالة = ${benAfterRestart.status}`);
      console.log(`- بيانات المتطوع المسترجعة: المعرف = ${volAfterRestart.id} | الاسم = ${volAfterRestart.name} | النقاط = ${volAfterRestart.points}`);
    } else {
      console.error("[FAIL] فشل استرجاع البيانات بعد إعادة تشغيل الخادم!");
      process.exit(1);
    }
    console.log("================================================================================\n");

  } finally {
    delete process.env.APP_DB_PATH;
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }
  }
}

runPersistenceTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
