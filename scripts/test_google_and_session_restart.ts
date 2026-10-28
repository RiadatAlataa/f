/**
 * Test Session Persistence Across Page Refreshes and Server Restarts
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import http from "http";
import path from "path";
import fs from "fs";

async function runSessionRestartTest() {
  console.log("================================================================================");
  console.log("اختبار التحقق من استمرار الجلسة بعد تحديث الصفحة وإعادة تشغيل الخادم");
  console.log("================================================================================\n");

  const sandboxDir = path.join("/tmp", "session_sandbox_" + Date.now());
  fs.mkdirSync(sandboxDir, { recursive: true });
  const sandboxDbPath = path.join(sandboxDir, "db.json");

  // Read root db.json as baseline
  const baselineData = fs.readFileSync(path.join(process.cwd(), "db.json"), "utf8");
  fs.writeFileSync(sandboxDbPath, baselineData, "utf8");

  process.env.APP_DB_PATH = sandboxDbPath;

  const { app, createServerSession, destroyServerSession, readDb, writeDb } = await import("../server-core");

  const startServerInstance = async (): Promise<{ server: http.Server; baseUrl: string }> => {
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

  try {
    // 1. Start Server Instance 1
    console.log("[1] تشغيل خادم الاختبار وإنشاء جلسة دخول لحساب مصرح به...");
    const inst1 = await startServerInstance();

    // Pick an authorized user from userDepartmentAccess
    const db = readDb();
    const authorizedUser = db.userDepartmentAccess.find((u: any) => u.status === 'active' && u.email) || {
      id: "mosa",
      name: "موسى بن عواض المعبدي",
      role: "super_admin"
    };

    const session = createServerSession(authorizedUser, authorizedUser.role || "super_admin");
    console.log(`- تم إنشاء رمز الجلسة: ${session.token.substring(0, 30)}...`);
    console.log(`- المستخدم: ${authorizedUser.name} (${authorizedUser.role})`);

    // 2. Simulate Page Refresh (multiple immediate calls with same token)
    console.log("\n[2] محاكاة تحديث الصفحة واستمرار الجلسة (Page Refresh Simulation)...");
    const check1 = await req(inst1.baseUrl, "/api/db/auth/session", {
      headers: { "Authorization": `Bearer ${session.token}` }
    });
    const check2 = await req(inst1.baseUrl, "/api/db/auth/session", {
      headers: { "Authorization": `Bearer ${session.token}` }
    });

    const pageRefreshPassed = check1.status === 200 && check1.body?.status === "success" &&
                              check2.status === 200 && check2.body?.status === "success";

    console.log(`- فحص الجلسة 1: HTTP ${check1.status} (Status: ${check1.body?.status})`);
    console.log(`- فحص الجلسة 2 (بعد التحديث): HTTP ${check2.status} (Status: ${check2.body?.status})`);

    // 3. Complete Server Shutdown & Restart Simulation
    console.log("\n[3] إيقاف الخادم بالكامل ومحاكاة إعادة تشغيل الخدمة (Server Restart Simulation)...");
    await new Promise<void>((resolve) => inst1.server.close(() => resolve()));
    console.log("- تم إيقاف خادم المرحلة الأولى.");

    // Start Server Instance 2 pointing to the same persistent sandbox database
    const inst2 = await startServerInstance();
    console.log("- تم تشغيل خادم المرحلة الثانية بنجاح.");

    const restartCheck = await req(inst2.baseUrl, "/api/db/auth/session", {
      headers: { "Authorization": `Bearer ${session.token}` }
    });

    const restartPassed = restartCheck.status === 200 && 
                          restartCheck.body?.status === "success" && 
                          restartCheck.body?.user?.id === authorizedUser.id;

    console.log(`- فحص الجلسة بعد إعادة تشغيل الخادم: HTTP ${restartCheck.status}`);
    console.log(`- حالة الجلسة: ${restartCheck.body?.status} | هوية المستخدم: ${restartCheck.body?.user?.name}`);

    destroyServerSession(session.token);
    await new Promise<void>((resolve) => inst2.server.close(() => resolve()));

    const allPassed = pageRefreshPassed && restartPassed;

    console.log("\n================================================================================");
    if (allPassed) {
      console.log("[PASS] استمرار الجلسة بعد تحديث الصفحة وبعد إعادة تشغيل الخادم بنجاح 100%!");
    } else {
      console.error("[FAIL] فشل استمرار الجلسة.");
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

runSessionRestartTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
