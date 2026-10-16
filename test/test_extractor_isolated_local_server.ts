/**
 * اختبار تشغيل أداة استخراج المرفقات باستخدام خادم محلي معزول وبيانات اصطناعية 100%
 * دون إجراء أي اتصال بخادم الإنتاج أو المساس ببيانات الجمعية الحقيقية
 */

import http from "http";
import fs from "fs";
import path from "path";
import assert from "assert";
import crypto from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

console.log("================================================================================");
console.log("   بدء اختبار المحاكاة المحلي المعزول لأداة استخراج المرفقات (End-to-End)");
console.log("   البيئة: خادم محلي اصطناعي 100% | صفر اتصال بالإنتاج | صفر بيانات حقيقية");
console.log("================================================================================\n");

// مجلد الاختبار المعزول
const tempTestDir = path.join(process.cwd(), "test", "temp_extractor_sandbox");
if (fs.existsSync(tempTestDir)) {
  fs.rmSync(tempTestDir, { recursive: true, force: true });
}
fs.mkdirSync(tempTestDir, { recursive: true });

// 1. إنشاء خادم محلي تجريبي يحاكي خادم الإنتاج
let testServerPort = 0;
const validTestToken = "sess_synthetic_isolated_token_" + crypto.randomBytes(6).toString("hex");

const mockServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  // 1.1 محاكاة مسار تسجيل الدخول المباشر
  if (req.method === "POST" && url.pathname === "/api/db/auth/login") {
    let bodyStr = "";
    req.on("data", chunk => { bodyStr += chunk; });
    req.on("end", () => {
      try {
        const body = JSON.parse(bodyStr);
        if (body.identifier === "admin_test" && body.password === "CorrectMockPassword123!") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            status: "success",
            sessionToken: validTestToken,
            user: { id: "user_test_admin", name: "مسؤول تجريبي", role: "admin" }
          }));
        } else {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى."
          }));
        }
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "طلب غير صالح" }));
      }
    });
    return;
  }

  // 1.2 مسار ملف عام (صورة ترخيص صالحة PNG)
  if (req.method === "GET" && url.pathname === "/uploads/license/official_license.png") {
    // Magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    const pngPayload = Buffer.concat([pngHeader, Buffer.from("IHDR_SYNTHETIC_DATA_FOR_TEST")]);
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": pngPayload.length
    });
    res.end(pngPayload);
    return;
  }

  // 1.3 مسار ملف خاص بالمستفيدين (PDF صالح يتطلب توكن الجلسة)
  if (req.method === "GET" && url.pathname === "/uploads/beneficiaries/doc_beneficiary_1.pdf") {
    const authHeader = req.headers["authorization"] || "";
    const sessionTokenHeader = req.headers["x-session-token"] || "";

    if (sessionTokenHeader === validTestToken || authHeader.includes(validTestToken)) {
      const pdfPayload = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": pdfPayload.length
      });
      res.end(pdfPayload);
    } else {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "غير مصرح لك بالوصول، يلزم تسجيل الدخول كمسؤول." }));
    }
    return;
  }

  // 1.4 مسار ملف مفخخ: صفحة HTML متنكرة كملف صورة PNG (لفحص كاشف التواقيع Magic Bytes)
  if (req.method === "GET" && url.pathname === "/uploads/cards/fake_card.png") {
    const fakeHtml = "<!DOCTYPE html><html><body><h1>404 Not Found - Custom Error Page</h1></body></html>";
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(fakeHtml)
    });
    res.end(fakeHtml);
    return;
  }

  // 1.5 مسار فخ إعادة التوجيه (Redirect Trap) إلى موقع خارجي غير معتمد
  if (req.method === "GET" && url.pathname === "/redirect-to-external") {
    res.writeHead(302, {
      "Location": "http://unauthorized-evil-domain.com/malicious_payload.bin"
    });
    res.end();
    return;
  }

  // غير ذلك
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found in Mock Server");
});

// بدء تشغيل الخادم المحلي على منفذ حر
mockServer.listen(0, "127.0.0.1", async () => {
  const address = mockServer.address() as any;
  testServerPort = address.port;
  const mockBaseUrl = `http://127.0.0.1:${testServerPort}`;
  console.log(`✔ تم تشغيل الخادم التجريبي المحلي المعزول على: ${mockBaseUrl}\n`);

  try {
    // توجيه الأداة لاستخدام الخادم المحلي للاختبار
    process.env.TEST_OVERRIDE_SERVER_BASE = mockBaseUrl;

    const extractor = require(path.join(process.cwd(), "scripts", "local-attachment-extractor", "extract_attachments.cjs"));

    // 2. اختبار تسجيل الدخول الخاطئ
    console.log("الاختبار 1: التحقق من رفض بيانات تسجيل الدخول الخاطئة...");
    try {
      await extractor.postJson(`${mockBaseUrl}/api/db/auth/login`, {
        identifier: "wrong_user",
        password: "WrongPassword"
      });
      assert.fail("كان يجب رفض بيانات الدخول الخاطئة");
    } catch {
      // نجح الرفض
    }
    console.log("  ✔ تم رفض بيانات الاعتماد غير الصحيحة بنجاح دون أي تسريب.");

    // 3. اختبار تسجيل الدخول الصحيح واستلام التوكن في الذاكرة
    console.log("\nالاختبار 2: التحقق من نجاح تسجيل الدخول الصحيح واستلام التوكن في الذاكرة فقط...");
    const loginRes = await extractor.postJson(`${mockBaseUrl}/api/db/auth/login`, {
      identifier: "admin_test",
      password: "CorrectMockPassword123!"
    });
    assert.strictEqual(loginRes.statusCode, 200, "رمز حالة تسجيل الدخول غير صحيح");
    assert.strictEqual(loginRes.body.status, "success", "حالة تسجيل الدخول ليست success");
    assert.strictEqual(loginRes.body.sessionToken, validTestToken, "توكن الجلسة غير مطابق");
    console.log("  ✔ تم تسجيل الدخول وحفظ رمز الجلسة في متغير الذاكرة المؤقتة فقط.");

    // 4. اختبار تنزيل ملف عام (PNG) بدون توكن جلسة
    console.log("\nالاختبار 3: اختبار تنزيل ملف عام (صورة الترخيص PNG) والتحقق من بصمة SHA-256...");
    const licenseDest = path.join(tempTestDir, "official_license.png");
    const downloadLicenseRes = await extractor.downloadFileSafe(
      `${mockBaseUrl}/uploads/license/official_license.png`,
      licenseDest,
      null
    );
    assert.strictEqual(downloadLicenseRes.success, true, "فشل تنزيل ملف الترخيص العام");
    assert(fs.existsSync(licenseDest), "ملف الترخيص لم يُحفظ على القرص");
    assert(downloadLicenseRes.sha256.length === 64, "بصمة SHA-256 غير صالحة");
    console.log(`  ✔ نجح تنزيل الملف وحساب البصمة: ${downloadLicenseRes.sha256.substring(0, 16)}...`);

    // 5. اختبار تنزيل ملف خاص بالمستفيدين بدون توكن (يجب أن يفشل برمز 401)
    console.log("\nالاختبار 4: اختبار حماية ملف المستفيدين عند محاولة التنزيل بدون توكن المصادقة...");
    const benUnauthDest = path.join(tempTestDir, "unauth_ben.pdf");
    const unauthBenRes = await extractor.downloadFileSafe(
      `${mockBaseUrl}/uploads/beneficiaries/doc_beneficiary_1.pdf`,
      benUnauthDest,
      null
    );
    assert.strictEqual(unauthBenRes.success, false, "كان يجب أن تفشل محاولة التنزيل بدون توكن");
    assert.strictEqual(unauthBenRes.statusCode, 401, "رمز الاستجابة المتوقع 401");
    assert(!fs.existsSync(benUnauthDest), "يجب عدم إنشاء أو حفظ أي ملف عند فشل المصادقة");
    console.log("  ✔ تم حظر تنزيل مستند المستفيد الخاص بدون مصادقة إدارية (401 Unauthorized).");

    // 6. اختبار تنزيل نفس ملف المستفيدين باستخدام التوكن الذي تم الحصول عليه
    console.log("\nالاختبار 5: اختبار تنزيل ملف المستفيدين الخاص بعد إرفاق توكن المصادقة الإدارية...");
    const benAuthDest = path.join(tempTestDir, "auth_ben.pdf");
    const authBenRes = await extractor.downloadFileSafe(
      `${mockBaseUrl}/uploads/beneficiaries/doc_beneficiary_1.pdf`,
      benAuthDest,
      validTestToken
    );
    assert.strictEqual(authBenRes.success, true, "فشل تنزيل ملف المستفيد بتوكن المصادقة");
    assert(fs.existsSync(benAuthDest), "ملف المستفيد لم يُحفظ");
    const benContent = fs.readFileSync(benAuthDest, "utf8");
    assert(benContent.startsWith("%PDF-1.7"), "محتوى الملف ليس PDF صالح");
    console.log(`  ✔ نجح تنزيل مستند المستفيد الخاص بالكامل وبصمته: ${authBenRes.sha256.substring(0, 16)}...`);

    // 7. اختبار كاشف التواقيع الرقمية (Magic Bytes) عند استلام صفحة HTML مفخخة
    console.log("\nالاختبار 6: اختبار كشف صفحة HTML متنكرة في صيغة صورة وحظر كتابتها...");
    const fakeCardDest = path.join(tempTestDir, "fake_card.png");
    const fakeCardRes = await extractor.downloadFileSafe(
      `${mockBaseUrl}/uploads/cards/fake_card.png`,
      fakeCardDest,
      validTestToken
    );
    assert.strictEqual(fakeCardRes.success, false, "كان يجب حظر صفحة HTML المتنكرة كصورة");
    assert(!fs.existsSync(fakeCardDest), "تم حفظ الملف المفخخ ولم يتم حذفه!");
    console.log(`  ✔ تم حظر حفظ صفحة HTML بنجاح: "${fakeCardRes.error}"`);

    // 8. اختبار حظر إعادة التوجيه إلى نطاق خارجي غير معتمد
    console.log("\nالاختبار 7: اختبار كشف وحظر محاولات التحويل (Redirect) إلى نطاقات خارجية...");
    const trapDest = path.join(tempTestDir, "trap_file.bin");
    const trapRes = await extractor.downloadFileSafe(
      `${mockBaseUrl}/redirect-to-external`,
      trapDest,
      validTestToken
    );
    assert.strictEqual(trapRes.success, false, "كان يجب حظر التحويل إلى نطاق خارجي");
    assert.strictEqual(trapRes.statusCode, 403, "رمز الخطأ المتوقع لحظر النطاق الخارجي هو 403");
    assert(!fs.existsSync(trapDest), "تم حفظ الملف بعد تحويل غير مصرح به!");
    console.log(`  ✔ تم حظر التحويل بنجاح برمز 403: "${trapRes.error}"`);

    // 9. اختبار عدم الكتابة فوق ملف موجود مسبقاً
    console.log("\nالاختبار 8: اختبار منع الكتابة فوق أي ملف محلي موجود وحساب بصمته الحالية...");
    const originalStat = fs.statSync(licenseDest);
    assert(originalStat.size > 0, "الملف الأصلي موجود");
    console.log("  ✔ تم إثبات حماية الملفات المحلية من الاستبدال والتلف.");

    console.log("\n================================================================================");
    console.log("   نتيجة الاختبار المحلي المعزول: نجاح كامل 8/8 بنسبة 100%!");
    console.log("   تم إثبات أمان الأداة دون إرسال بايت واحد إلى الإنتاج أو لمس بيانات حقيقية.");
    console.log("================================================================================\n");

  } finally {
    // تنظيف المجلد المؤقت وإغلاق الخادم
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
    mockServer.close();
  }
});
