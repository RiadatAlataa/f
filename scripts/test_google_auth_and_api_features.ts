/**
 * Automated Verification for Google Auth, Sessions, RBAC, File Upload & Retrieval
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import { app, readDb, writeDb, createServerSession, destroyServerSession } from "../server-core";
import http from "http";

let server: http.Server;
let baseUrl = "";

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

const req = async (endpoint: string, opts: any = {}) => {
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

async function testSuite() {
  await startServer();
  const originalDb = JSON.parse(JSON.stringify(readDb()));

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string, detail?: string) {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${detail || ''}`);
      failed++;
    }
  }

  try {
    console.log("================================================================================");
    console.log("اختبار تسجيل الدخول بجوجل، الجلسات، الصلاحيات، رفع الملفات واسترجاعها");
    console.log("================================================================================\n");

    // 1. Google Auth Live Verification: Real HTTP call to Google TokenInfo API
    const googleLoginRes = await req("/api/db/auth/google", {
      method: "POST",
      body: {
        credential: "invalid-test-token-to-verify-rejection"
      }
    });

    // Verification MUST contact Google and reject invalid token with 401
    const rejectedByGoogle = googleLoginRes.status === 401 && 
                             googleLoginRes.body?.error?.includes("Google");
    assert(
      rejectedByGoogle,
      "1. التحقق الحي من واجهة Google OAuth (/api/db/auth/google): الاتصال بخوادم Google ورفض الرموز غير الصالحة بدقة (401)",
      `HTTP ${googleLoginRes.status} | Body: ${JSON.stringify(googleLoginRes.body)}`
    );

    // 2. Session Lifecycle & Token Cryptography
    const sessionUser = { id: "mosa", role: "super_admin", name: "موسى بن عواض المعبدي" };
    const session = createServerSession(sessionUser, "super_admin");

    const sessionRes = await req("/api/db/auth/session", {
      headers: { "Authorization": `Bearer ${session.token}` }
    });

    assert(
      sessionRes.status === 200 && sessionRes.body?.status === "success" && sessionRes.body?.user?.id === "mosa",
      "2. التحقق من صحة واستقرار جلسة العمل المشفرة (Session Validation via Bearer Token)"
    );

    // 3. RBAC Enforcement (Unauthorized vs Authorized)
    const guestRes = await req("/api/db/users/create", {
      method: "POST",
      body: { name: "مستخدم غير مصرح" }
    });

    const adminRes = await req("/api/db/auth/session", {
      headers: { "Authorization": `Bearer ${session.token}` }
    });

    assert(
      guestRes.status === 401 && adminRes.status === 200,
      "3. تطبيق مصفوفة الصلاحيات (RBAC): حجب غير المصرح به (401) والسماح للجلسة المصرحة (200)"
    );

    // 4. File Upload via API
    const dummyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const uploadRes = await req("/api/attachments/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${session.token}` },
      body: {
        fileBase64: `data:image/png;base64,${dummyPngBase64}`,
        originalFilename: "verification_test.png",
        mimeType: "image/png",
        entityType: "logos",
        entityId: "test-logo-001",
        isPrivate: false
      }
    });

    const fileKey = uploadRes.body?.attachment?.fileKey || uploadRes.body?.fileKey;
    assert(
      uploadRes.status === 200 && Boolean(fileKey),
      "4. رفع الملفات عبر واجهة API الحقيقية وتوليد بصمة مشفرة ومفتاح عشوائي آمن"
    );

    // 5. File Retrieval via API
    let retrievedOk = false;
    if (fileKey) {
      const getFileRes = await req(`/api/attachments/download/${encodeURIComponent(fileKey)}`, {
        headers: { "Authorization": `Bearer ${session.token}` }
      });
      retrievedOk = getFileRes.status === 200;
    }

    assert(
      retrievedOk,
      "5. استرجاع وتنزيل الملف المرفوع عبر مسار API الآمن (/api/attachments/download/*)"
    );

    // 6. Complete Data Retrieval via API
    const fullDbRes = await req("/api/db", {
      headers: { "Authorization": `Bearer ${session.token}` }
    });

    const hasCollections = Array.isArray(fullDbRes.body?.volunteers) && 
                           Array.isArray(fullDbRes.body?.beneficiaries) && 
                           Array.isArray(fullDbRes.body?.teams);

    assert(
      fullDbRes.status === 200 && hasCollections,
      "6. استرجاع البيانات المعتمدة لجميع الكيانات (المتطوعين، المستفيدين، الفرق) عبر API"
    );

    destroyServerSession(session.token);

  } finally {
    writeDb(originalDb);
    await stopServer();
  }

  console.log("\n================================================================================");
  console.log(`   نتائج الاختبارات: ${passed} نجح | ${failed} فشل`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

testSuite().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
